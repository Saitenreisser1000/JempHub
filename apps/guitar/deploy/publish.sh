#!/usr/bin/env bash
# GuitarJemp bauen und auf den VPS hochladen.
#
#   VPS_HOST=1.2.3.4 ./apps/guitar/deploy/publish.sh
#
# Optional: VPS_USER (Standard root), REMOTE_ROOT (Standard /var/www/guitarjemp),
#           WEB_USER (Standard www-data)
#
# Eine vorhandene config.js im Web-Verzeichnis (Supabase-Zugang) bleibt erhalten.
# Benötigt nur bash, ssh und tar (macOS, Linux, Windows mit Git Bash oder WSL).
set -euo pipefail

VPS_HOST="${VPS_HOST:-}"
VPS_USER="${VPS_USER:-root}"
REMOTE_ROOT="${REMOTE_ROOT:-/var/www/guitarjemp}"
WEB_USER="${WEB_USER:-www-data}"
TMP_DIR="/tmp/guitarjemp-upload"

if [[ -z "$VPS_HOST" ]]; then
  echo "Fehler: VPS_HOST ist nicht gesetzt."
  echo "Beispiel: VPS_HOST=187.124.190.130 ./apps/guitar/deploy/publish.sh"
  exit 1
fi

APP_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="${VPS_USER}@${VPS_HOST}"
CONTROL_PATH="/tmp/guitarjemp-ssh-%r@%h:%p"
SSH_OPTS=(-o ControlMaster=auto -o ControlPersist=300 -o ControlPath="$CONTROL_PATH")

echo "Baue GuitarJemp (inklusive Tests)..."
(cd "$APP_DIR" && npm run build)
[[ -f "$APP_DIR/dist/index.html" ]] || { echo "Fehler: dist/index.html fehlt."; exit 1; }

cleanup() { ssh -O exit "${SSH_OPTS[@]}" "$TARGET" >/dev/null 2>&1 || true; }
trap cleanup EXIT

echo "Verbinde mit $TARGET (eventuell wird einmal nach dem Passwort gefragt)..."
ssh "${SSH_OPTS[@]}" -MNf "$TARGET"

echo "Lade Dateien hoch..."
ssh "${SSH_OPTS[@]}" "$TARGET" "rm -rf '$TMP_DIR' && mkdir -p '$TMP_DIR'"
tar -C "$APP_DIR/dist" -czf - . | ssh "${SSH_OPTS[@]}" "$TARGET" "tar -xzf - -C '$TMP_DIR'"

echo "Veröffentliche nach $REMOTE_ROOT..."
ssh -tt "${SSH_OPTS[@]}" "$TARGET" "\
  sudo mkdir -p '$REMOTE_ROOT' && \
  sudo find '$REMOTE_ROOT' -mindepth 1 -maxdepth 1 ! -name config.js -exec rm -rf {} + && \
  sudo cp -a '$TMP_DIR/.' '$REMOTE_ROOT/' && \
  sudo chown -R '$WEB_USER:$WEB_USER' '$REMOTE_ROOT' && \
  rm -rf '$TMP_DIR' && \
  sudo nginx -t && \
  sudo systemctl reload nginx\
"

echo "Fertig: https://guitarjemp.jemphub.com"
