#!/usr/bin/env bash
# Build and upload dist/ to the VPS.
# Usage: VPS_HOST=1.2.3.4 VPS_USER=root [VPS_PATH=/var/www/earjemp] ./deploy/publish.sh
set -euo pipefail

: "${VPS_HOST:?VPS_HOST is required}"
: "${VPS_USER:?VPS_USER is required}"
VPS_PATH="${VPS_PATH:-/var/www/earjemp}"

cd "$(dirname "$0")/.."
npm run build

ssh "$VPS_USER@$VPS_HOST" "mkdir -p '$VPS_PATH'"
rsync -avz --delete dist/ "$VPS_USER@$VPS_HOST:$VPS_PATH/"
echo "Published to $VPS_USER@$VPS_HOST:$VPS_PATH"
