#!/usr/bin/env bash
set -euo pipefail

if ! command -v git >/dev/null 2>&1; then
  echo "git ist erforderlich" >&2
  exit 1
fi

VERSION="${1:-}"
if [[ -z "$VERSION" ]]; then
  echo "Verwendung: ./scripts/create-release.sh <version>" >&2
  echo "Beispiel: ./scripts/create-release.sh v0.1.0" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RELEASE_DIR="$ROOT_DIR/releases"
ARCHIVE="$RELEASE_DIR/stemplayer-${VERSION}.tar.gz"

mkdir -p "$RELEASE_DIR"

if git -C "$ROOT_DIR" rev-parse "$VERSION" >/dev/null 2>&1; then
  REF="$VERSION"
else
  REF="HEAD"
fi

echo "Erzeuge Release-Archiv aus Ref: $REF"
# Archive only this app when invoked from the monorepo.
PREFIX="$(git -C "$ROOT_DIR" rev-parse --show-prefix)"
TREE="$REF"
if [[ -n "$PREFIX" ]]; then
  TREE="${REF}:${PREFIX%/}"
fi
git -C "$ROOT_DIR" archive --format=tar.gz --output "$ARCHIVE" "$TREE"

cat <<EOF
Fertig:
  $ARCHIVE

Naechster Schritt:
  1) Archiv auf VPS kopieren
  2) ./scripts/deploy-release.sh auf VPS ausfuehren
EOF
