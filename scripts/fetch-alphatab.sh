#!/usr/bin/env bash
# alphaTab (MPL-2.0, https://alphatab.net) für den Datei-Import von GuitarJemp
# holen und in einen Ordner legen. Läuft in GitHub Actions; die Datei wird mit
# der App auf dem eigenen Server ausgeliefert (kein fremdes CDN zur Laufzeit).
#
#   bash scripts/fetch-alphatab.sh <zielordner>   → gibt den Pfad der JS-Datei aus
set -euo pipefail
DEST="${1:?Zielordner fehlt}"
VER="${ALPHATAB_VERSION:-1}"
TMP="$(mktemp -d)"
(cd "$TMP" && npm pack "@coderline/alphatab@$VER" --silent >/dev/null && tar xzf ./*.tgz)
echo "alphaTab $(node -p "require('$TMP/package/package.json').version")" >&2
ls "$TMP/package/dist" >&2
JS="$(ls "$TMP/package/dist/alphaTab.min.js" "$TMP/package/dist/alphaTab.js" 2>/dev/null | head -1)"
[ -n "$JS" ] || { echo "alphaTab.js nicht gefunden" >&2; exit 1; }
mkdir -p "$DEST"
cp "$JS" "$DEST/alphaTab.min.js"
cp "$TMP"/package/LICENSE* "$DEST/" 2>/dev/null || true
echo "$(cd "$DEST" && pwd)/alphaTab.min.js"
