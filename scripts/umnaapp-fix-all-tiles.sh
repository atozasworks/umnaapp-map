#!/usr/bin/env bash
# UMNAAPP — one-shot fix for map tiles (renderd + mod_tile + nginx)
# Run on VPS as root:
#   curl -O https://raw.githubusercontent.com/.../umnaapp-fix-all-tiles.sh   # or scp from repo
#   chmod +x umnaapp-fix-all-tiles.sh
#   sudo ./umnaapp-fix-all-tiles.sh
#
# Uses existing setup:
#   PBF:   /opt/osm-data/india-latest.osm.pbf
#   DB:    umnaappdb (planet_osm_* tables)
#   Style: /opt/openstreetmap-carto/style.xml
#   URL:   https://umnaapp.in/tiles/{z}/{x}/{y}.png

set -euo pipefail

DOMAIN="${DOMAIN:-umnaapp.in}"
NGINX_SITE="${NGINX_SITE:-/etc/nginx/sites-enabled/umnaapp.in}"
RENDERD_CONF="${RENDERD_CONF:-/etc/renderd.conf}"
APACHE_TILES_SITE="${APACHE_TILES_SITE:-/etc/apache2/sites-available/tiles.conf}"
TILE_PORT="${TILE_PORT:-8080}"
DB_NAME="${DB_NAME:-umnaappdb}"
STYLE_XML="${STYLE_XML:-/opt/openstreetmap-carto/style.xml}"
PBF_FILE="${PBF_FILE:-/opt/osm-data/india-latest.osm.pbf}"
TILE_DIR="${TILE_DIR:-/var/lib/mod_tile}"
RENDERD_SOCK="${RENDERD_SOCK:-/run/renderd/renderd.sock}"
NGINX_SNIPPET="/etc/nginx/snippets/umnaapp-tiles-proxy.conf"
APACHE_MOD_TILE_CONF="/etc/apache2/conf-available/mod_tile.conf"
BACKUP_DIR="/root/umnaapp-tile-fix-backup-$(date +%Y%m%d-%H%M%S)"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}!${NC} $*"; }
fail() { echo -e "${RED}✗${NC} $*"; exit 1; }
info() { echo -e "${CYAN}→${NC} $*"; }

[[ "$(id -u)" -eq 0 ]] || fail "Run as root: sudo $0"

echo "=============================================="
echo " UMNAAPP tile fix — $(date -Is)"
echo "=============================================="

mkdir -p "$BACKUP_DIR"
ok "Backup dir: $BACKUP_DIR"

backup_file() {
  local f="$1"
  [[ -f "$f" ]] && cp -a "$f" "$BACKUP_DIR/" && ok "Backed up $f"
}

backup_file "$RENDERD_CONF"
backup_file "$APACHE_TILES_SITE"
backup_file "$NGINX_SITE"
backup_file "$NGINX_SNIPPET"
backup_file "$APACHE_MOD_TILE_CONF"
backup_file /etc/apache2/ports.conf

# ─── Preflight ───────────────────────────────────────────────────────────────
info "Preflight checks..."

[[ -f "$STYLE_XML" ]] || fail "Missing style: $STYLE_XML"
[[ -f "$PBF_FILE" ]] || warn "PBF not found ($PBF_FILE) — OK if DB already imported"
[[ -f "$NGINX_SITE" ]] || fail "Missing nginx site: $NGINX_SITE"

if ! sudo -u postgres psql -d "$DB_NAME" -tAc \
  "SELECT 1 FROM information_schema.tables WHERE table_name='planet_osm_polygon' LIMIT 1" \
  | grep -q 1; then
  fail "DB '$DB_NAME' has no planet_osm_polygon — import OSM first:
  sudo -u postgres osm2pgsql --create --database $DB_NAME --username postgres \\
    --host localhost --slim --drop --cache 4096 --number-processes 4 --latlong $PBF_FILE"
fi
ok "Database $DB_NAME has OSM tables"

POLY_COUNT=$(sudo -u postgres psql -d "$DB_NAME" -tAc "SELECT count(*) FROM planet_osm_polygon;" 2>/dev/null || echo 0)
ok "planet_osm_polygon rows: $POLY_COUNT"

# ─── Packages ────────────────────────────────────────────────────────────────
info "Installing packages (if needed)..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq \
  libapache2-mod-tile renderd \
  postgresql postgresql-contrib postgis \
  apache2 nginx \
  fonts-noto fonts-noto-cjk \
  curl socat \
  2>/dev/null || true

# ─── renderd.conf ─────────────────────────────────────────────────────────────
info "Writing $RENDERD_CONF ..."
mkdir -p /run/renderd "$TILE_DIR"
chown -R postgres:postgres /run/renderd "$TILE_DIR" 2>/dev/null || true

cat > "$RENDERD_CONF" <<EOF
[renderd]
socketname=${RENDERD_SOCK}
num_threads=4
tile_dir=${TILE_DIR}
stats_file=/run/renderd/renderd.stats

[mapnik]
plugins_dir=/usr/lib/mapnik/3.1/input
font_dir=/usr/share/fonts
font_dir_recurse=true

[default]
URI=/tiles/
TILEDIR=${TILE_DIR}
XML=${STYLE_XML}
HOST=*
TILESIZE=256
MAXZOOM=19
EOF
ok "renderd.conf updated (HOST=*)"

# ─── Apache mod_tile ─────────────────────────────────────────────────────────
info "Configuring Apache mod_tile on port ${TILE_PORT}..."

a2enmod tile headers 2>/dev/null || true
a2dissite 000-default.conf 2>/dev/null || true
a2dissite default-ssl.conf 2>/dev/null || true

# Apache Listen: 8080 only (nginx owns :80)
if grep -q '^Listen 80' /etc/apache2/ports.conf 2>/dev/null; then
  sed -i 's/^Listen 80/#Listen 80/' /etc/apache2/ports.conf
fi
grep -q "^Listen ${TILE_PORT}" /etc/apache2/ports.conf 2>/dev/null || \
  echo "Listen ${TILE_PORT}" >> /etc/apache2/ports.conf

cat > "$APACHE_MOD_TILE_CONF" <<EOF
<IfModule mod_tile.c>
    LoadTileConfigFile ${RENDERD_CONF}
    ModTileRenderdSocketName ${RENDERD_SOCK}
    ModTileTileDir ${TILE_DIR}
    ModTileRequestTimeout 0
    ModTileMissingRequestTimeout 600
    ModTileMaxLoadMissing 50
    ModTileEnableStats On
</IfModule>
EOF
a2enconf mod_tile 2>/dev/null || ln -sf "$APACHE_MOD_TILE_CONF" /etc/apache2/conf-enabled/mod_tile.conf

cat > "$APACHE_TILES_SITE" <<EOF
<VirtualHost *:${TILE_PORT}>
    ServerName localhost
    DocumentRoot /var/www/html

    <Directory /var/www/html>
        Require all granted
    </Directory>

    LoadTileConfigFile ${RENDERD_CONF}
    ModTileRenderdSocketName ${RENDERD_SOCK}
    ModTileTileDir ${TILE_DIR}
    ModTileRequestTimeout 0
    ModTileMissingRequestTimeout 600
    ModTileMaxLoadMissing 50
    ModTileEnableStats On

    ErrorLog \${APACHE_LOG_DIR}/tiles-error.log
    CustomLog \${APACHE_LOG_DIR}/tiles-access.log combined
</VirtualHost>
EOF

a2ensite tiles.conf 2>/dev/null || true
apache2ctl configtest || fail "Apache configtest failed"
ok "Apache tiles vhost :${TILE_PORT}"

# ─── Nginx snippet (proxy to Apache — NOT renderd socket) ─────────────────────
info "Writing nginx tile proxy snippet..."
mkdir -p /etc/nginx/snippets

cat > "$NGINX_SNIPPET" <<EOF
# UMNAAPP tiles — Apache mod_tile on 127.0.0.1:${TILE_PORT}
# DO NOT proxy to renderd unix socket (HTTP breaks renderd protocol)
location /tiles/ {
    proxy_pass http://127.0.0.1:${TILE_PORT}/tiles/;
    proxy_http_version 1.1;
    proxy_set_header Host localhost;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_read_timeout 120s;
    proxy_connect_timeout 30s;
    add_header Access-Control-Allow-Origin "*";
    add_header Cache-Control "public, max-age=604800";
}
EOF
ok "Nginx snippet: $NGINX_SNIPPET"

# Patch umnaapp.in — remove old /tiles/ blocks, add include once
info "Patching $NGINX_SITE ..."

python3 <<PY
import re, pathlib

domain = "${DOMAIN}".replace(".", r"\\.")
site = pathlib.Path("${NGINX_SITE}")
text = site.read_text()
snippet_include = "    include /etc/nginx/snippets/umnaapp-tiles-proxy.conf;"

text = re.sub(
    r"\n[ \t]*location[ \t]+(?:~[ \t]+)?[^{]*tiles[^}]*\{.*?\n[ \t]*\}\n",
    "\n",
    text,
    flags=re.DOTALL,
)

def split_server_blocks(text):
    parts = []
    i = 0
    while i < len(text):
        m = re.search(r"server\s*\{", text[i:])
        if not m:
            parts.append(("text", text[i:]))
            break
        start = i + m.start()
        parts.append(("text", text[i:start]))
        depth = 0
        j = start
        while j < len(text):
            ch = text[j]
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    parts.append(("server", text[start : j + 1]))
                    i = j + 1
                    break
            j += 1
        else:
            raise SystemExit("Unbalanced server block in nginx site")
    return parts

patched = []
blocks_patched = 0
for kind, chunk in split_server_blocks(text):
    if kind != "server":
        patched.append(chunk)
        continue
    if not re.search(rf"server_name[^;]*{domain}", chunk, flags=re.IGNORECASE):
        patched.append(chunk)
        continue
    if "umnaapp-tiles-proxy.conf" in chunk:
        patched.append(chunk)
        continue
    sn = re.search(rf"(server_name[^;]*{domain}[^;]*;)", chunk, flags=re.IGNORECASE)
    if sn:
        insert_at = sn.end()
        chunk = chunk[:insert_at] + "\n" + snippet_include + chunk[insert_at:]
        blocks_patched += 1
    patched.append(chunk)

text = "".join(patched)
if blocks_patched == 0 and "umnaapp-tiles-proxy.conf" not in text:
    m2 = re.search(r"server\s*\{", text)
    if not m2:
        raise SystemExit("No server block found in nginx site")
    insert_at = m2.end()
    text = text[:insert_at] + "\n" + snippet_include + text[insert_at:]
    blocks_patched = 1

site.write_text(text)
print(f"Patched nginx site OK ({blocks_patched} server block(s))")
PY

# Remove broken renderd_backend upstream from nginx.conf if it causes misuse
if grep -q 'upstream renderd_backend' /etc/nginx/nginx.conf 2>/dev/null; then
  warn "Found 'upstream renderd_backend' in nginx.conf — do NOT use it for umnaapp.in (HTTP ≠ renderd protocol)"
fi

nginx -t || fail "nginx -t failed"
ok "Nginx config OK"

# ─── Start services (order matters) ──────────────────────────────────────────
info "Restarting services: postgresql → renderd → apache2 → nginx ..."

systemctl enable postgresql renderd apache2 nginx 2>/dev/null || true
systemctl start postgresql 2>/dev/null || true
systemctl restart renderd
sleep 3
[[ -S "$RENDERD_SOCK" ]] || fail "renderd socket missing: $RENDERD_SOCK"
ok "renderd socket: $RENDERD_SOCK"

systemctl restart apache2
sleep 2
ss -tlnp | grep -q ":${TILE_PORT}" || fail "Apache not listening on :${TILE_PORT}"
ok "Apache listening on :${TILE_PORT}"

if ! apache2ctl -M 2>&1 | grep -qi tile; then
  fail "Apache mod_tile not loaded — run: a2enmod tile && systemctl restart apache2"
fi
ok "Apache mod_tile module loaded"

systemctl reload nginx
ok "nginx reloaded"

# ─── Tests ───────────────────────────────────────────────────────────────────
info "Testing tiles (first request may take 30–90 seconds)..."

TEST_Z=5 TEST_X=23 TEST_Y=14
LOCAL_URL="http://127.0.0.1:${TILE_PORT}/tiles/${TEST_Z}/${TEST_X}/${TEST_Y}.png"
PUBLIC_URL="https://${DOMAIN}/tiles/${TEST_Z}/${TEST_X}/${TEST_Y}.png"

is_png() {
  local f="$1"
  [[ -f "$f" ]] && head -c 4 "$f" | grep -q $'\x89PNG'
}

echo ""
info "Local Apache test: $LOCAL_URL"
curl -sf --max-time 120 "$LOCAL_URL" -o /tmp/umnaapp-tile-local.png || true
if is_png /tmp/umnaapp-tile-local.png; then
  ok "Local tile OK ($(du -h /tmp/umnaapp-tile-local.png | cut -f1) PNG)"
else
  warn "Local tile failed — checking logs..."
  tail -15 /var/log/apache2/tiles-error.log 2>/dev/null || true
  tail -15 /var/log/apache2/error.log 2>/dev/null || true
  journalctl -u renderd -n 15 --no-pager || true
  fail "Local tile not PNG — see logs above. Backup: $BACKUP_DIR"
fi

echo ""
info "Public test: $PUBLIC_URL"
curl -sf --max-time 120 "$PUBLIC_URL" -o /tmp/umnaapp-tile-public.png || true
if is_png /tmp/umnaapp-tile-public.png; then
  ok "Public tile OK — map should work at https://${DOMAIN}/map"
else
  warn "Public tile failed (local worked) — check nginx site includes snippet"
  grep -n "umnaapp-tiles-proxy" "$NGINX_SITE" || true
  fail "Public tile not PNG"
fi

echo ""
echo "=============================================="
echo -e "${GREEN}SUCCESS${NC} — All tile fixes applied."
echo "  Map:  https://${DOMAIN}/map"
echo "  Test: https://${DOMAIN}/tiles/${TEST_Z}/${TEST_X}/${TEST_Y}.png"
echo "  Backup configs: $BACKUP_DIR"
echo "=============================================="

MAP_PAGE_SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/umnaapp-map/index.html"
MAP_DIR="${MAP_DIR:-/var/www/umnaapp/map}"
if [[ -f "$MAP_PAGE_SRC" ]]; then
  info "Deploying polished /map page..."
  mkdir -p "$MAP_DIR"
  cp -a "$MAP_DIR/index.html" "$BACKUP_DIR/map-index.html" 2>/dev/null || true
  cp "$MAP_PAGE_SRC" "$MAP_DIR/index.html"
  ok "Map page updated: $MAP_DIR/index.html"
fi
