# Daumensprung

Jump'n'Run fürs Handy im Querformat, gesteuert mit zwei Daumen: ein Daumen läuft, der zweite springt. Eine Hubwelt verbindet vier Welten (Wald, Felsen, See, Gipfel); jede schenkt eine Fähigkeit (Doppelsprung, Wandsprung, Dash, Gleiten), mit der man woanders weiterkommt. Kristalle hinter späteren Fähigkeiten sorgen für Wiederspielwert, das Schwung-System belohnt flüssiges Spielen.

## Technik

- Eine einzige Datei `index.html`: Canvas-Spiel in reinem JavaScript, Pixel-Sprites im SNES-Stil werden im Code gezeichnet.
- Musik und Effekte entstehen live mit der Web Audio API (keine Audiodateien).
- Fortschritt, Debug-Werte und Lautstärke liegen im `localStorage` des Browsers.
- `src/game.test.js`: Rauchtest, der jede Welt mit Browser-Attrappen anspielt.

## Entwicklung und Veröffentlichung

```bash
npm run dev      # http://localhost:5185
npm test
npm run build    # dist/
```

Veröffentlicht wird automatisch bei jedem Merge nach `main` (siehe `DEPLOY.md` im Wurzelordner) nach `/var/www/daumensprung`.

Einmalig auf dem Server:

1. DNS-Eintrag `daumensprung` (Typ A) → `187.124.190.130`
2. `deploy/nginx/daumensprung.conf` nach `/etc/nginx/sites-available/` kopieren und verlinken:
   `ln -s /etc/nginx/sites-available/daumensprung.conf /etc/nginx/sites-enabled/`
3. `nginx -t && systemctl reload nginx`
4. `certbot --nginx -d daumensprung.jemphub.com`
