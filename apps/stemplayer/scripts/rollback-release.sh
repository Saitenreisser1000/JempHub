#!/usr/bin/env bash
set -euo pipefail

VERSION="${1:-}"
if [[ -z "$VERSION" ]]; then
  echo "Verwendung: ./scripts/rollback-release.sh <version>" >&2
  echo "Beispiel: ./scripts/rollback-release.sh v0.1.0" >&2
  exit 1
fi

APP_ROOT="${APP_ROOT:-/var/www/stemplayer}"
SERVICE_NAME="${SERVICE_NAME:-stemplayer-api}"
TARGET_DIR="$APP_ROOT/releases/$VERSION"
CURRENT_LINK="$APP_ROOT/current"

if [[ ! -d "$TARGET_DIR" ]]; then
  echo "Release nicht gefunden: $TARGET_DIR" >&2
  exit 1
fi

ln -sfn "$TARGET_DIR" "$CURRENT_LINK"

if command -v systemctl >/dev/null 2>&1; then
  sudo systemctl restart "$SERVICE_NAME"
  sudo systemctl status "$SERVICE_NAME" --no-pager -l | head -n 20
else
  echo "systemctl nicht verfuegbar. Bitte Backend-Prozess manuell neu starten."
fi

echo "Rollback abgeschlossen auf: $VERSION"
