#!/usr/bin/env bash
# Deploy OSRM routing on umnaapp.in VPS
#
# Exposes standard OSRM API:
#   https://umnaapp.in/route/v1/driving/{lon},{lat};{lon},{lat}?overview=full&geometries=geojson&steps=true
#
# Also aliases legacy path used by older clients:
#   https://umnaapp.in/map/route/driving/{lon},{lat};{lon},{lat}
#
# Run on VPS as root (script can live anywhere — copy via scp first):
#
#   # From your PC (Windows), copy scripts folder to VPS:
#   scp -r "c:/001- work/myprojects/maptest/scripts" root@umnaapp.in:/root/maptest-scripts
#
#   # On VPS:
#   cd /root/maptest-scripts
#   chmod +x umnaapp-deploy-route.sh
#   sudo ./umnaapp-deploy-route.sh
#
# VPS paths used by this project (not a git clone path):
#   /var/www/umnaapp/          — map page, tiles (APP_DIR)
#   /opt/osm-data/             — India OSM PBF (already on server for tiles)
#   /var/lib/umnaapp/osrm/     — OSRM graph (created by this script)
#   /etc/nginx/sites-enabled/umnaapp.in
#
# First run builds OSRM graph (~15–30 min). Reuses /opt/osm-data/india-latest.osm.pbf if present.

set -euo pipefail

DOMAIN="${DOMAIN:-umnaapp.in}"
NGINX_SITE="${NGINX_SITE:-/etc/nginx/sites-enabled/umnaapp.in}"
OSRM_PORT="${OSRM_PORT:-5000}"
OSRM_DATA_DIR="${OSRM_DATA_DIR:-/var/lib/umnaapp/osrm}"
OSRM_CONTAINER="${OSRM_CONTAINER:-umnaapp-osrm}"
OSRM_IMAGE="${OSRM_IMAGE:-osrm/osrm-backend:latest}"
PBF_URL="${PBF_URL:-https://download.geofabrik.de/asia/india-latest.osm.pbf}"
# Reuse existing India PBF from tile setup (umnaapp-fix-all-tiles.sh)
EXISTING_PBF="${EXISTING_PBF:-/opt/osm-data/india-latest.osm.pbf}"
NGINX_SNIPPET="/etc/nginx/snippets/umnaapp-route-proxy.conf"

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $*"; }
fail() { echo -e "${RED}✗${NC} $*"; exit 1; }
info() { echo -e "${CYAN}→${NC} $*"; }
warn() { echo -e "${YELLOW}!${NC} $*"; }

[[ "$(id -u)" -eq 0 ]] || fail "Run as root: sudo $0"
[[ -f "$NGINX_SITE" ]] || fail "Missing nginx site: $NGINX_SITE"

command -v docker >/dev/null 2>&1 || fail "docker not installed"
command -v curl >/dev/null 2>&1 || apt-get install -y -qq curl

systemctl enable docker 2>/dev/null || true
systemctl start docker 2>/dev/null || true

mkdir -p "$OSRM_DATA_DIR"
cd "$OSRM_DATA_DIR"

# ─── 1. India OSM PBF (reuse VPS copy or download) ───────────────────────────
if [[ ! -f india-latest.osm.pbf ]]; then
  if [[ -f "$EXISTING_PBF" ]]; then
    info "Linking existing PBF from $EXISTING_PBF ..."
    ln -sf "$EXISTING_PBF" india-latest.osm.pbf
    ok "Using existing india-latest.osm.pbf (tiles server data)"
  else
    info "Downloading India OSM extract (this may take several minutes)..."
    curl -fL --retry 3 --retry-delay 5 -o india-latest.osm.pbf "$PBF_URL"
    ok "Downloaded india-latest.osm.pbf"
  fi
else
  ok "india-latest.osm.pbf already present in $OSRM_DATA_DIR"
fi

# ─── 2. Build OSRM graph (car profile) ───────────────────────────────────────
if [[ ! -f india-latest.osrm.mldgr ]]; then
  info "Building OSRM graph (extract → partition → customize) — 15–30 min typical..."
  docker run --rm -t -v "$OSRM_DATA_DIR:/data" "$OSRM_IMAGE" \
    osrm-extract -p /opt/car.lua /data/india-latest.osm.pbf
  docker run --rm -t -v "$OSRM_DATA_DIR:/data" "$OSRM_IMAGE" \
    osrm-partition /data/india-latest.osrm
  docker run --rm -t -v "$OSRM_DATA_DIR:/data" "$OSRM_IMAGE" \
    osrm-customize /data/india-latest.osrm
  ok "OSRM graph ready"
else
  ok "OSRM graph already built (india-latest.osrm.mldgr)"
fi

# ─── 3. Start OSRM container ─────────────────────────────────────────────────
info "Starting OSRM container on 127.0.0.1:${OSRM_PORT} ..."
docker rm -f "$OSRM_CONTAINER" 2>/dev/null || true
docker run -d \
  --name "$OSRM_CONTAINER" \
  --restart unless-stopped \
  -p "127.0.0.1:${OSRM_PORT}:5000" \
  -v "$OSRM_DATA_DIR:/data:ro" \
  "$OSRM_IMAGE" \
  osrm-routed --algorithm mld --ip 0.0.0.0 --port 5000 /data/india-latest.osrm

sleep 3
local_code=$(curl -sS -o /tmp/umna-osrm-local.json -w "%{http_code}" \
  "http://127.0.0.1:${OSRM_PORT}/route/v1/driving/75.5,13.0;75.51,13.01?overview=false" || echo "000")
if [[ "$local_code" != "200" ]]; then
  docker logs "$OSRM_CONTAINER" --tail 30 2>&1 || true
  fail "Local OSRM health check failed (HTTP $local_code)"
fi
ok "Local OSRM → HTTP $local_code"

# ─── 4. Nginx proxy: /route/ + legacy /map/route/ ────────────────────────────
info "Writing nginx route proxy snippet..."
mkdir -p /etc/nginx/snippets

cat > "$NGINX_SNIPPET" <<EOF
# UMNAAPP OSRM routing — Docker on 127.0.0.1:${OSRM_PORT}
# Standard:  /route/v1/{profile}/{coords}
# Legacy:     /map/route/{profile}/{coords}  (same backend)

location /route/ {
    proxy_pass http://127.0.0.1:${OSRM_PORT}/route/;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_read_timeout 60s;
    proxy_connect_timeout 15s;
    add_header Access-Control-Allow-Origin "*";
    add_header Access-Control-Allow-Methods "GET, OPTIONS";
    add_header Access-Control-Allow-Headers "Content-Type";
}

# Legacy alias — bus profile maps to driving (no bus roads in OSRM car graph)
location ~ ^/map/route/(?<profile>driving|walking|cycling|bus)/(?<coords>[^?]+)\$ {
    set \$osrm_profile \$profile;
    if (\$profile = bus) { set \$osrm_profile driving; }
    proxy_pass http://127.0.0.1:${OSRM_PORT}/route/v1/\$osrm_profile/\$coords\$is_args\$args;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_read_timeout 60s;
    add_header Access-Control-Allow-Origin "*";
}
EOF
ok "Nginx snippet: $NGINX_SNIPPET"

info "Patching $NGINX_SITE ..."
python3 <<PY
import re, pathlib

domain = "${DOMAIN}".replace(".", r"\\.")
site = pathlib.Path("${NGINX_SITE}")
text = site.read_text()
snippet_include = "    include /etc/nginx/snippets/umnaapp-route-proxy.conf;"

text = re.sub(
    r"\n[ \t]*location[ \t]+(?:~[ \t]+)?[^{]*(?:/route/|/map/route)[^}]*\{.*?\n[ \t]*\}\n",
    "\n",
    text,
    flags=re.DOTALL,
)
text = re.sub(r"\n[ \t]*include /etc/nginx/snippets/umnaapp-route-proxy\.conf;\n", "\n", text)

def patch_server_blocks(text):
    out = []
    i = 0
    patched = 0
    while i < len(text):
        m = re.search(r"server\s*\{", text[i:])
        if not m:
            out.append(text[i:])
            break
        start = i + m.start()
        out.append(text[i:start])
        depth = 0
        j = start
        while j < len(text):
            if text[j] == "{":
                depth += 1
            elif text[j] == "}":
                depth -= 1
                if depth == 0:
                    block = text[start : j + 1]
                    if "server_name" in block and re.search(rf"server_name[^;]*{domain}", block):
                        if snippet_include.strip() not in block:
                            block = block[:-1] + "\n" + snippet_include + "\n}\n"
                            patched += 1
                    out.append(block)
                    i = j + 1
                    break
            j += 1
        else:
            raise SystemExit("Unbalanced server block in nginx site")
    return "".join(out), patched

text, n = patch_server_blocks(text)
if n == 0:
    raise SystemExit("No server block patched — check server_name for ${DOMAIN}")
site.write_text(text)
print(f"Patched nginx site OK ({n} server block(s))")
PY

nginx -t || fail "nginx -t failed"
systemctl reload nginx
ok "nginx reloaded"

# ─── 5. Public health check ──────────────────────────────────────────────────
public_code=$(curl -sS -o /tmp/umna-osrm-public.json -w "%{http_code}" \
  "https://${DOMAIN}/route/v1/driving/75.5,13.0;75.51,13.01?overview=full&geometries=geojson" || echo "000")
ct=$(curl -sSI "https://${DOMAIN}/route/v1/driving/75.5,13.0;75.51,13.01" 2>/dev/null | grep -i content-type | head -1 || true)

if [[ "$public_code" == "200" ]]; then
  ok "https://${DOMAIN}/route/v1/driving/... → HTTP $public_code"
else
  warn "Public route returned HTTP $public_code — local OSRM works; check nginx/SSL"
fi

echo ""
ok "Routing deployed"
echo ""
echo "  Standard API:"
echo "    https://${DOMAIN}/route/v1/driving/{lon},{lat};{lon},{lat}"
echo "    ?overview=full&geometries=geojson&steps=true"
echo ""
echo "  Legacy alias (maptest backend):"
echo "    https://${DOMAIN}/map/route/driving/{lon},{lat};{lon},{lat}"
echo ""
echo "  maptest backend .env:"
echo "    ROUTE_SERVICE_URL=https://${DOMAIN}"
echo ""
warn "Car/driving profile only on this graph. walking/cycling need extra OSRM extracts."
