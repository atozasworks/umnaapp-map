#!/usr/bin/env bash
# Deploy polished /map page to umnaapp.in VPS
# Run on VPS as root (keeps existing leaflet.css / leaflet.js):
#   chmod +x umnaapp-deploy-map.sh
#   sudo ./umnaapp-deploy-map.sh

set -euo pipefail

MAP_DIR="${MAP_DIR:-/var/www/umnaapp/map}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE="${SCRIPT_DIR}/umnaapp-map/index.html"
DOMAIN="${DOMAIN:-umnaapp.in}"

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $*"; }
fail() { echo -e "${RED}✗${NC} $*"; exit 1; }
info() { echo -e "${CYAN}→${NC} $*"; }

[[ "$(id -u)" -eq 0 ]] || fail "Run as root: sudo $0"
[[ -f "$SOURCE" ]] || fail "Missing $SOURCE — copy scripts/umnaapp-map/ to the VPS"

info "Deploying map page to $MAP_DIR ..."
mkdir -p "$MAP_DIR"

if [[ -f "$MAP_DIR/index.html" ]]; then
  cp -a "$MAP_DIR/index.html" "$MAP_DIR/index.html.bak.$(date +%Y%m%d-%H%M%S)"
  ok "Backed up existing index.html"
fi

cp "$SOURCE" "$MAP_DIR/index.html"
chmod 644 "$MAP_DIR/index.html"
ok "Installed $MAP_DIR/index.html"

if [[ ! -f "$MAP_DIR/leaflet.css" || ! -f "$MAP_DIR/leaflet.js" ]]; then
  echo "Warning: leaflet.css / leaflet.js not found in $MAP_DIR — map needs them beside index.html"
fi

code=$(curl -sS -o /tmp/umna-map-check.html -w "%{http_code}" "https://${DOMAIN}/map" || echo "000")
if [[ "$code" == "200" ]]; then
  ok "https://${DOMAIN}/map → HTTP $code"
else
  echo "Warning: public /map returned HTTP $code"
fi

echo ""
ok "Done — open https://${DOMAIN}/map"
