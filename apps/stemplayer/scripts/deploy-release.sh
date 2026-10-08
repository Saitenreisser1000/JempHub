#!/usr/bin/env bash
set -euo pipefail

VERSION="${1:-}"
if [[ -z "$VERSION" ]]; then
  echo "Verwendung: ./scripts/deploy-release.sh <version>" >&2
  echo "Beispiel: ./scripts/deploy-release.sh v0.1.0" >&2
  exit 1
fi

APP_ROOT="${APP_ROOT:-/var/www/stemplayer}"
SERVICE_NAME="${SERVICE_NAME:-stemplayer-api}"
ARCHIVE_PATH="${ARCHIVE_PATH:-$APP_ROOT/releases/stemplayer-${VERSION}.tar.gz}"
RELEASES_DIR="$APP_ROOT/releases"
TARGET_DIR="$RELEASES_DIR/$VERSION"
CURRENT_LINK="$APP_ROOT/current"

if [[ ! -f "$ARCHIVE_PATH" ]]; then
  echo "Archiv nicht gefunden: $ARCHIVE_PATH" >&2
  exit 1
fi

mkdir -p "$TARGET_DIR"
tar -xzf "$ARCHIVE_PATH" -C "$TARGET_DIR"

ln -sfn "$TARGET_DIR" "$CURRENT_LINK"

cd "$CURRENT_LINK/backend"
npm install --omit=dev

if command -v systemctl >/dev/null 2>&1; then
  sudo systemctl restart "$SERVICE_NAME"
  sudo systemctl status "$SERVICE_NAME" --no-pager -l | head -n 20
else
  echo "systemctl nicht verfuegbar. Bitte Backend-Prozess manuell neu starten."
fi

echo "Deployment abgeschlossen: $VERSION"
