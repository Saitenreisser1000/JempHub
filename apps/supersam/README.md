# Supersam

Jump'n'Run fürs Handy im Querformat mit Sam, einem kleinen blonden Jungen, gesteuert mit zwei Daumen: ein Daumen läuft, der zweite springt. Eine Weltkarte verbindet die Übungswiese, acht Welten, drei Bonuswelten und die Endgegner; die Welten schenken Fähigkeiten (Doppelsprung, Wandsprung, Dash, Gleiten), mit denen man woanders weiterkommt.

## Stand

Die Hauptseite zeigt den Stand des Labors vom 11. November 2026 (Weltkarte als Hub, Übungswiese, Leben,
Bonuswelten, Medaillen, überarbeitete Kamera, klassische Grafik, Hochformat-Hinweis). Die Beschreibung der
einzelnen Teile steht in `apps/supersam-labor/README.md`.

- Eine Datei `index.html`, dazu die Level-Dateien in `levels/`, die beim Bauen eingebaut werden (`levels.mjs`).
- Spielstand und Einstellungen liegen im `localStorage` unter `supersam-…` – getrennt vom Labor
  (`supersam-labor-…`) und vom früheren Demo-Spielstand (`daumensprung-…`, wird nicht mehr gelesen).
- `src/game.test.js`: dieselben Tests wie im Labor.
- Kein Leveleditor auf der Hauptseite; der bleibt unter `/labor/editor/`.

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
