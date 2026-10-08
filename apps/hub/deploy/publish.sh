#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"

VPS_USER="${VPS_USER:-root}"
VPS_HOST="${VPS_HOST:-}"
REMOTE_ROOT="${REMOTE_ROOT:-/var/www/jemphub}"
WEB_USER="${WEB_USER:-www-data}"
TMP_ROOT="/tmp/jemphub"

if [[ -z "$VPS_HOST" ]]; then
  echo "Error: VPS_HOST is not set."
  echo "Example: VPS_HOST=187.124.190.130 ./deploy/publish.sh"
  exit 1
fi

TARGET="${VPS_USER}@${VPS_HOST}"
CONTROL_PATH="/tmp/jemphub-ssh-%r@%h:%p"
SSH_OPTS=(
  -o ControlMaster=auto
  -o ControlPersist=300
  -o ControlPath="$CONTROL_PATH"
)
SCP_OPTS=(
  -o ControlPath="$CONTROL_PATH"
)

required_files=(
  "$PROJECT_DIR/index.html"
  "$PROJECT_DIR/styles.css"
  "$PROJECT_DIR/design-system/styles.css"
  "$PROJECT_DIR/design-system/tokens.css"
)

for file in "${required_files[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "Error: Missing required file: $file"
    exit 1
  fi
done

cleanup() {
  ssh -O exit "${SSH_OPTS[@]}" "$TARGET" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "Opening SSH connection to $TARGET (you may be asked for your password once)..."
ssh "${SSH_OPTS[@]}" -MNf "$TARGET"

echo "Creating temporary upload directory on VPS..."
ssh "${SSH_OPTS[@]}" "$TARGET" "mkdir -p '$TMP_ROOT/design-system'"

echo "Uploading files..."
scp "${SCP_OPTS[@]}" "$PROJECT_DIR/index.html" "$PROJECT_DIR/styles.css" "$TARGET:$TMP_ROOT/"
scp "${SCP_OPTS[@]}" "$PROJECT_DIR/design-system/styles.css" "$PROJECT_DIR/design-system/tokens.css" "$TARGET:$TMP_ROOT/design-system/"

echo "Publishing files to $REMOTE_ROOT..."
ssh -tt "${SSH_OPTS[@]}" "$TARGET" "\
  sudo mkdir -p '$REMOTE_ROOT/design-system' && \
  sudo cp '$TMP_ROOT/index.html' '$REMOTE_ROOT/' && \
  sudo cp '$TMP_ROOT/styles.css' '$REMOTE_ROOT/' && \
  sudo cp '$TMP_ROOT/design-system/styles.css' '$REMOTE_ROOT/design-system/' && \
  sudo cp '$TMP_ROOT/design-system/tokens.css' '$REMOTE_ROOT/design-system/' && \
  sudo chown -R '$WEB_USER:$WEB_USER' '$REMOTE_ROOT' && \
  sudo nginx -t && \
  sudo systemctl reload nginx\
"

echo "Done. Deployment finished successfully."
