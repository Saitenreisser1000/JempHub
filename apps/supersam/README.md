# Supersam

Jump'n'Run fürs Handy im Querformat mit Sam, einem kleinen blonden Jungen, gesteuert mit zwei Daumen: ein Daumen läuft, der zweite springt. Eine Karte verbindet zehn Welten in fünf Kapiteln, drei Bonuswelten und fünf Endgegner; jeder Endgegner schenkt eine Fähigkeit (Doppelsprung, Wandsprung, Dash, Gleiten) für das nächste Kapitel.

## Stand

Die Hauptseite zeigt den Stand des Labors vom 18. November 2026 (15 % mehr Sicht, kompaktes HUD mit Pixel-Haus als Menü-Knopf, Karte mit fünf Kapiteln, neues Kapitel Wiese
mit Käferkönig, Fähigkeiten von den Endgegnern, schnelle Schuhe in 1-1 statt Übungswiese, Bröckelblöcke von
unten durchspringbar, langsamere Fahrplattformen, knapper Abschluss-Bildschirm, Leben, Bonuswelten, Medaillen). Die Beschreibung der
einzelnen Teile steht in `apps/supersam-labor/README.md`.

- Eine Datei `index.html`, dazu die Level-Dateien in `levels/`, die beim Bauen eingebaut werden (`levels.mjs`).
- Spielstand und Einstellungen liegen im `localStorage` unter `supersam-…` – getrennt vom Labor
  (`supersam-labor-…`) und vom früheren Demo-Spielstand (`daumensprung-…`, wird nicht mehr gelesen).
- `src/game.test.js`: dieselben Tests wie im Labor.
- Kein Leveleditor auf der Hauptseite; der bleibt unter `/labor/editor/`.

## Startbild

Beim Laden erscheint knapp 3 Sekunden das Logo **on praehortus studios** (dasselbe wie bei Maxis Bierkiste:
Gartentor mit Keimling, Schrift Barlow Condensed); Antippen überspringt es. Im Editor/Probespiel entfällt es.

## Entwicklung und Veröffentlichung

```bash
npm run dev      # http://localhost:5185
npm test
npm run build    # dist/
```

Veröffentlicht wird automatisch bei jedem Merge nach `main` (siehe `DEPLOY.md` im Wurzelordner) nach `/var/www/supersam`.

Einmalig auf dem Server:

1. DNS-Eintrag `supersam` (Typ A) → `187.124.190.130`
2. `deploy/nginx/supersam.conf` nach `/etc/nginx/sites-available/` kopieren und verlinken:
   `ln -s /etc/nginx/sites-available/supersam.conf /etc/nginx/sites-enabled/`
3. `nginx -t && systemctl reload nginx`
4. `certbot --nginx -d supersam.jemphub.com`

Experimente laufen in `apps/supersam-labor` (veröffentlicht unter https://supersam.jemphub.com/labor/, eigener Spielstand). Die Hauptseite bleibt beim übernommenen Stand, bis ein neuer Labor-Stand bewusst übernommen wird: `index.html`, `src/game.test.js`, `levels.mjs` und `levels/` aus dem Labor kopieren, `supersam-labor-` durch `supersam-` ersetzen, Titel „Supersam“.
