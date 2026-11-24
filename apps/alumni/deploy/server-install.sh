#!/usr/bin/env bash
# Alumni Editor – Installation auf dem VPS (läuft als root, aufgerufen vom
# Deploy-Workflow). Idempotent: bei jedem Deploy erneut ausführbar.
#
#   bash server-install.sh <release-ordner>
#
# Ablauf: sichern → neue Version aktivieren → Node-Dienst starten → lokal
# testen → erst dann nginx auf den Dienst umstellen. Schlägt ein Schritt
# fehl, bleibt bzw. wird der vorherige Stand aktiv.

set -euo pipefail

RELEASE="${1:?Release-Ordner fehlt}"
BASE=/opt/alumni-editor
DATA=/var/lib/alumni-editor
STORAGE="$DATA/exports"
PORT=3110
SERVICE=alumni-editor
UNIT="/etc/systemd/system/$SERVICE.service"
DOMAIN=alumni.jemphub.com
NGINX_CONF=/etc/nginx/sites-available/alumni.conf
NGINX_LINK=/etc/nginx/sites-enabled/alumni.conf
OLD_STATIC=/var/www/alumni
BACKUPS=/root/backups/alumni
NODE="$BASE/runtime/node"
STAMP=$(date +%Y%m%d-%H%M%S)

say() { echo "▶ $*"; }
fail() { echo "::error::$*"; exit 1; }

[ "$(uname -m)" = "x86_64" ] || fail "Unerwartete Server-Architektur $(uname -m)"
[ -x "$NODE" ] || fail "Node-Laufzeit fehlt unter $NODE"
"$NODE" -e 'process.exit(+process.versions.node.split(".")[0] >= 22 ? 0 : 1)' || fail "Node.js 22 oder neuer benötigt"
[ -f "$RELEASE/server/index.mjs" ] && [ -f "$RELEASE/dist/index.html" ] || fail "Release unvollständig: $RELEASE"

# 1. Sicherung: alte statische Version, bisherige Releases, Archivdateien, Konfiguration
say "Sicherung nach $BACKUPS/alumni-$STAMP.tar.gz"
mkdir -p "$BACKUPS" && chmod 700 "$BACKUPS"
PATHS=()
for p in "$OLD_STATIC" "$BASE/current" "$DATA" "$NGINX_CONF" "$UNIT"; do
  [ -e "$p" ] && PATHS+=("${p#/}")
done
if [ "${#PATHS[@]}" -gt 0 ]; then
  # -h: den Symlink "current" auflösen und den tatsächlichen Stand sichern
  tar -czhf "$BACKUPS/alumni-$STAMP.tar.gz" -C / "${PATHS[@]}"
  ls -1t "$BACKUPS"/alumni-*.tar.gz | tail -n +16 | xargs -r rm -f   # 15 Sicherungen behalten
fi
[ -f "$NGINX_CONF" ] && cp -a "$NGINX_CONF" "$BACKUPS/alumni.conf.$STAMP"

# 2. Datenordner für das Dateiarchiv (liegt außerhalb der Releases)
mkdir -p "$STORAGE"
chown -R www-data:www-data "$DATA"
chmod 750 "$DATA"

# 3. Neue Version aktivieren (Symlink), vorherige merken für den Rückfall
PREVIOUS=$(readlink -f "$BASE/current" 2>/dev/null || true)
chown -R root:root "$RELEASE"
chmod -R u=rwX,go=rX "$RELEASE"
ln -sfn "$RELEASE" "$BASE/current.new" && mv -Tf "$BASE/current.new" "$BASE/current"

# 4. systemd-Dienst
cat > "$UNIT.new" <<UNIT
[Unit]
Description=Alumni Editor ($DOMAIN)
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=$BASE/current
Environment=NODE_ENV=production
Environment=HOST=127.0.0.1
Environment=PORT=$PORT
Environment=STORAGE_PROVIDER=local
Environment=STORAGE_DIR=$STORAGE
Environment=REQUIRE_AUTH=false
ExecStart=$NODE server/index.mjs
Restart=always
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$DATA

[Install]
WantedBy=multi-user.target
UNIT
mv -f "$UNIT.new" "$UNIT"

if ! systemctl is-active --quiet "$SERVICE" && ss -ltn "sport = :$PORT" | grep -q LISTEN; then
  fail "Port $PORT ist bereits von einem anderen Dienst belegt"
fi

systemctl daemon-reload
systemctl enable --quiet "$SERVICE"
systemctl restart "$SERVICE"

# 5. Lokal testen, bevor nginx umgestellt wird
say "Teste den Dienst auf 127.0.0.1:$PORT"
ok=""
for _ in $(seq 1 20); do
  if curl -fsS "http://127.0.0.1:$PORT/api/health" | grep -q '"ok":true' \
     && curl -fsS "http://127.0.0.1:$PORT/" | grep -q 'id="app"'; then ok=1; break; fi
  sleep 1
done
if [ -z "$ok" ]; then
  journalctl -u "$SERVICE" -n 40 --no-pager || true
  if [ -n "$PREVIOUS" ] && [ -d "$PREVIOUS" ] && [ "$PREVIOUS" != "$(readlink -f "$RELEASE")" ]; then
    ln -sfn "$PREVIOUS" "$BASE/current.new" && mv -Tf "$BASE/current.new" "$BASE/current"
    systemctl restart "$SERVICE" || true
    fail "Neue Version startet nicht – vorherige Version wieder aktiv"
  fi
  systemctl stop "$SERVICE" || true
  fail "Dienst startet nicht – nginx bleibt unverändert (alte Version weiter online)"
fi

# 6. nginx: alumni.jemphub.com an den Node-Dienst weiterleiten
CERT="/etc/letsencrypt/live/$DOMAIN"
PROXY_BLOCK="
    client_max_body_size 40m;

    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    # Diese Azure-Anmeldekopfzeile darf nie vom Browser kommen
    proxy_set_header X-MS-CLIENT-PRINCIPAL \"\";
    proxy_read_timeout 120s;

    location /assets/ {
        proxy_pass http://127.0.0.1:$PORT;
        add_header Cache-Control \"public, max-age=31536000, immutable\" always;
        add_header X-Content-Type-Options \"nosniff\" always;
        add_header Referrer-Policy \"strict-origin-when-cross-origin\" always;
        access_log off;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:$PORT;
        add_header X-Content-Type-Options \"nosniff\" always;
        add_header Referrer-Policy \"strict-origin-when-cross-origin\" always;
    }

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        add_header Cache-Control \"no-cache\" always;
        add_header X-Content-Type-Options \"nosniff\" always;
        add_header Referrer-Policy \"strict-origin-when-cross-origin\" always;
    }
"

{
  echo "# Alumni Editor – $DOMAIN → Node-Dienst $SERVICE (127.0.0.1:$PORT)"
  echo "# Wird vom Deploy-Workflow geschrieben (apps/alumni/deploy/server-install.sh)."
  if [ -f "$CERT/fullchain.pem" ]; then
    cat <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name $DOMAIN;

    ssl_certificate $CERT/fullchain.pem;
    ssl_certificate_key $CERT/privkey.pem;
NGINX
    [ -f /etc/letsencrypt/options-ssl-nginx.conf ] && echo "    include /etc/letsencrypt/options-ssl-nginx.conf;"
    [ -f /etc/letsencrypt/ssl-dhparams.pem ] && echo "    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;"
  else
    cat <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;
NGINX
  fi
  echo "$PROXY_BLOCK"
  echo "}"
} > "$NGINX_CONF.new"

if [ -f "$NGINX_CONF" ] && cmp -s "$NGINX_CONF.new" "$NGINX_CONF"; then
  rm -f "$NGINX_CONF.new"
  say "nginx-Konfiguration unverändert"
else
  say "nginx auf den Node-Dienst umstellen"
  mv -f "$NGINX_CONF.new" "$NGINX_CONF"
  ln -sfn "$NGINX_CONF" "$NGINX_LINK"
  if ! nginx -t 2>&1; then
    if [ -f "$BACKUPS/alumni.conf.$STAMP" ]; then cp -a "$BACKUPS/alumni.conf.$STAMP" "$NGINX_CONF"; fi
    nginx -t && systemctl reload nginx || true
    fail "nginx-Test fehlgeschlagen – alte Konfiguration wiederhergestellt"
  fi
  systemctl reload nginx
fi

# 7. Alte Releases aufräumen (5 behalten, die aktive nie)
CURRENT=$(readlink -f "$BASE/current")
ls -1dt "$BASE"/releases/*/ 2>/dev/null | sed 's:/$::' | tail -n +6 | while read -r old; do
  [ "$old" != "$CURRENT" ] && rm -rf "$old"
done

say "Fertig: $(readlink -f "$BASE/current") läuft als $SERVICE auf Port $PORT"
"$NODE" --version
