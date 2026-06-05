#!/usr/bin/env bash
# UMNAAPP VPS — check services + restore India map tiles (/tiles/)
# Run on umnaapp.in server as root or sudo user:
#   chmod +x scripts/umnaapp-vps-tiles.sh
#   sudo ./scripts/umnaapp-vps-tiles.sh check
#   sudo ./scripts/umnaapp-vps-tiles.sh fix

set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/umnaapp}"
TILES_DIR="${TILES_DIR:-$APP_DIR/tiles}"
MBTILES="$TILES_DIR/india.mbtiles"
TILESERVER_PORT="${TILESERVER_PORT:-8080}"
TILESERVER_CONTAINER="${TILESERVER_CONTAINER:-umnaapp-tileserver}"
DOMAIN="${DOMAIN:-umnaapp.in}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}!${NC} $*"; }
fail() { echo -e "${RED}✗${NC} $*"; }

# ─── 1. CHECK what is working on umnaapp.in ───────────────────────────────
cmd_check() {
  echo "========== UMNAAPP SERVICE CHECK =========="
  echo "Server: $(hostname)  $(date -Is)"
  echo

  echo "--- Public endpoints (from this VPS) ---"
  for url in \
    "https://$DOMAIN/" \
    "https://$DOMAIN/map" \
    "https://$DOMAIN/search?q=shivpuri" \
    "https://$DOMAIN/tiles/5/23/14.png" \
    "https://$DOMAIN/map/nominatim/search?q=delhi&format=json"
  do
    code=$(curl -sS -o /tmp/umna-check.out -w "%{http_code}" "$url" || echo "000")
    size=$(wc -c < /tmp/umna-check.out | tr -d ' ')
    kind="?"
    head -c 4 /tmp/umna-check.out | grep -q $'\x89PNG' && kind="PNG"
    head -c 15 /tmp/umna-check.out | grep -qi '<!DOCTYPE' && kind="HTML"
    head -c 1 /tmp/umna-check.out | grep -q '[\[{]' && kind="JSON"
    if [ "$code" = "200" ] && [ "$kind" = "PNG" ]; then
      ok "$url → HTTP $code ($size bytes, PNG)"
    elif [ "$code" = "200" ] && [ "$kind" = "JSON" ]; then
      ok "$url → HTTP $code ($size bytes, JSON) WORKING"
    elif [ "$code" = "502" ]; then
      fail "$url → HTTP $code (tile server DOWN)"
    elif [ "$code" = "200" ] && [ "$kind" = "HTML" ]; then
      warn "$url → HTTP $code ($size bytes, HTML — static page, not API/tile)"
    else
      warn "$url → HTTP $code ($size bytes, $kind)"
    fi
  done
  echo

  echo "--- Local processes / ports ---"
  ss -tlnp | grep -E ":80|:443|:8080|:5000|:3000" || warn "No common ports listening"
  echo

  echo "--- Docker ---"
  if command -v docker >/dev/null 2>&1; then
    docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | head -20
  else
    warn "Docker not installed"
  fi
  echo

  echo "--- TileServer local test ---"
  code=$(curl -sS -o /tmp/tile-local.png -w "%{http_code}" \
    "http://127.0.0.1:$TILESERVER_PORT/data/india/5/23/14.png" 2>/dev/null || echo "000")
  if [ "$code" = "200" ] && head -c 4 /tmp/tile-local.png | grep -q $'\x89PNG'; then
    ok "Local TileServer :$TILESERVER_PORT/data/india/ → PNG OK"
  else
    fail "Local TileServer :$TILESERVER_PORT → HTTP $code (not running or no india.mbtiles)"
  fi
  echo

  echo "--- india.mbtiles file ---"
  if [ -f "$MBTILES" ]; then
    ok "Found $MBTILES ($(du -h "$MBTILES" | cut -f1))"
  else
    warn "Missing $MBTILES — searching disk..."
    find /var /home /opt /srv -name 'india.mbtiles' -size +1M 2>/dev/null | head -5 || true
  fi
  echo

  echo "--- Nginx /tiles/ config ---"
  grep -R "location /tiles" -A6 /etc/nginx/ 2>/dev/null || warn "No /tiles/ block in nginx"
  echo
  echo "Expected nginx upstream: http://127.0.0.1:$TILESERVER_PORT/data/india/"
}

# ─── 2. Download India OSM + build MBTiles (first-time or re-create) ───────
cmd_download() {
  echo "========== DOWNLOAD INDIA MAP DATA =========="
  mkdir -p "$TILES_DIR"
  cd "$TILES_DIR"

  if [ -f "$MBTILES" ] && [ "${FORCE:-0}" != "1" ]; then
    ok "Already exists: $MBTILES ($(du -h "$MBTILES" | cut -f1)) — skip (set FORCE=1 to rebuild)"
    return 0
  fi

  echo "Need ~4GB RAM, ~30GB disk, 1–4 hours for full India MBTiles."
  apt-get update -qq
  apt-get install -y -qq wget openjdk-17-jre-headless docker.io docker-compose-plugin 2>/dev/null || true

  PBF="$TILES_DIR/india-latest.osm.pbf"
  if [ ! -f "$PBF" ]; then
    echo "Downloading India OSM extract from Geofabrik (~1.5 GB)..."
    wget -c -O "$PBF" "https://download.geofabrik.de/asia/india-latest.osm.pbf"
  else
    ok "PBF already downloaded"
  fi

  echo "Building MBTiles with Planetiler (Docker)..."
  docker run --rm -v "$TILES_DIR:/data" ghcr.io/onthegomap/planetiler:latest \
    --area=india \
    --osm-path=/data/india-latest.osm.pbf \
    --output=/data/india.mbtiles \
    --force

  ok "Created $MBTILES ($(du -h "$MBTILES" | cut -f1))"
}

# ─── 3. Start TileServer GL + nginx fix ────────────────────────────────────
cmd_fix() {
  echo "========== FIX TILE SERVER =========="
  mkdir -p "$TILES_DIR"

  if [ ! -f "$MBTILES" ]; then
    fail "Missing $MBTILES — run: $0 download"
    exit 1
  fi

  apt-get update -qq
  apt-get install -y -qq docker.io docker-compose-plugin nginx 2>/dev/null || true
  systemctl enable docker 2>/dev/null || true
  systemctl start docker 2>/dev/null || true

  # Write tileserver config
  cat > "$TILES_DIR/config.json" <<'JSON'
{
  "options": {
    "paths": { "root": "/data" },
    "domains": ["*"],
    "maxzoom": 19,
    "format": "png",
    "bounds": [68.0, 6.0, 97.0, 37.0],
    "center": [78.5, 20.5, 5]
  },
  "data": {
    "india": { "mbtiles": "/data/india.mbtiles" }
  }
}
JSON

  docker rm -f "$TILESERVER_CONTAINER" 2>/dev/null || true
  docker run -d \
    --name "$TILESERVER_CONTAINER" \
    --restart unless-stopped \
    -p "127.0.0.1:$TILESERVER_PORT:8080" \
    -v "$TILES_DIR:/data:ro" \
    maptiler/tileserver-gl:latest \
    --config /data/config.json

  sleep 3
  code=$(curl -sS -o /tmp/fix-tile.png -w "%{http_code}" \
    "http://127.0.0.1:$TILESERVER_PORT/data/india/5/23/14.png")
  if ! head -c 4 /tmp/fix-tile.png | grep -q $'\x89PNG'; then
    fail "TileServer still not serving PNG (HTTP $code). Check: docker logs $TILESERVER_CONTAINER"
    exit 1
  fi
  ok "TileServer GL running on 127.0.0.1:$TILESERVER_PORT"

  # Patch nginx — add /tiles/ → tileserver if missing
  NGINX_SNIPPET="/etc/nginx/snippets/umnaapp-tiles.conf"
  cat > "$NGINX_SNIPPET" <<NGINX
# UMNAAPP India raster tiles (TileServer GL)
location /tiles/ {
    proxy_pass http://127.0.0.1:$TILESERVER_PORT/data/india/;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    add_header Cache-Control "public, max-age=604800";
    add_header Access-Control-Allow-Origin "*";
}
NGINX

  SITE=$(grep -rl "server_name.*$DOMAIN" /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ 2>/dev/null | head -1 || true)
  if [ -z "$SITE" ]; then
    warn "Could not find nginx site for $DOMAIN — add manually:"
    cat "$NGINX_SNIPPET"
  elif ! grep -q "umnaapp-tiles.conf" "$SITE" 2>/dev/null; then
    # Insert include inside server block
    sed -i "/server_name.*$DOMAIN/a\\    include $NGINX_SNIPPET;" "$SITE" 2>/dev/null || \
      warn "Add manually inside server { }: include $NGINX_SNIPPET;"
  fi

  nginx -t && systemctl reload nginx
  ok "Nginx reloaded"

  echo
  echo "--- Final public test ---"
  code=$(curl -sS -o /tmp/pub-tile.png -w "%{http_code}" "https://$DOMAIN/tiles/5/23/14.png")
  if head -c 4 /tmp/pub-tile.png | grep -q $'\x89PNG'; then
    ok "https://$DOMAIN/tiles/ → PNG OK — map should work!"
    ok "Open https://$DOMAIN/map to verify"
  else
    fail "Public /tiles/ still broken (HTTP $code). Check nginx site config includes $NGINX_SNIPPET"
  fi
}

usage() {
  echo "Usage: sudo $0 {check|download|fix|all}"
  echo "  check    — show what works / broken on this VPS"
  echo "  download — download India OSM + build india.mbtiles (long, ~30GB disk)"
  echo "  fix      — start TileServer GL + nginx /tiles/ proxy (needs india.mbtiles)"
  echo "  all      — download + fix"
  echo
  echo "Env: APP_DIR TILES_DIR TILESERVER_PORT DOMAIN FORCE=1"
}

case "${1:-check}" in
  check)    cmd_check ;;
  download) cmd_download ;;
  fix)      cmd_fix ;;
  all)      cmd_download; cmd_fix ;;
  *)        usage; exit 1 ;;
esac
