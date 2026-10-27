#!/usr/bin/env bash
# Baut den Hub und lädt dist/ nach /var/www/jemphub (ohne andere Dateien dort zu löschen).
# Usage: VPS_HOST=1.2.3.4 [VPS_USER=root] [VPS_PATH=/var/www/jemphub] ./deploy/publish.sh
set -euo pipefail

: "${VPS_HOST:?VPS_HOST is required}"
VPS_USER="${VPS_USER:-root}"
VPS_PATH="${VPS_PATH:-/var/www/jemphub}"

cd "$(dirname "$0")/.."
npm run build

ssh "$VPS_USER@$VPS_HOST" "mkdir -p '$VPS_PATH'"
rsync -avz dist/ "$VPS_USER@$VPS_HOST:$VPS_PATH/"
echo "Published to $VPS_USER@$VPS_HOST:$VPS_PATH"
