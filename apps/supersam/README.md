# Supersam

Jump'n'Run fürs Handy im Querformat mit Sam, einem kleinen blonden Jungen, gesteuert mit zwei Daumen: ein Daumen läuft, der zweite springt. Eine Hubwelt verbindet vier Welten (Wald, Felsen, See, Gipfel); jede schenkt eine Fähigkeit (Doppelsprung, Wandsprung, Dash, Gleiten), mit der man woanders weiterkommt. Kristalle hinter späteren Fähigkeiten sorgen für Wiederspielwert, das Schwung-System belohnt flüssiges Spielen. Am Ziel sitzt das Fähigkeits-Item in einem Käfig, der erst mit genug Punkten aufgeht (Münze 10, Diamant 100, Stern 200, Gegner +50, Tod −100, Restzeit 2 pro Sekunde; 3 Minuten je Welt). Mit zu wenig Punkten wird der Käfig zur Tür, die die Welt neu startet. Auf dem Arena-Platz der Hubwelt warten hinter Diamanten-Toren (7/10/12) drei Endgegner: Igelkönig (Dash), Felsgolem (Doppel- oder Wandsprung), Sturmgeist (Gleiten).

## Technik

- Eine einzige Datei `index.html`: Canvas-Spiel in reinem JavaScript, Pixel-Sprites im SNES-Stil werden im Code gezeichnet.
- WebGL-Effektschicht: das 2D-Bild läuft als Textur durch Shader (Licht und Schatten, Glühen, Bloom, Farbstimmung, Dunst, Vignette), Werte je Welt in `FXT`. Ohne WebGL bleibt das 2D-Bild sichtbar; im Debug-Menü abschaltbar.
- Musik und Effekte entstehen live mit der Web Audio API (keine Audiodateien).
- Fortschritt, Debug-Werte und Lautstärke liegen im `localStorage` des Browsers.
- `src/game.test.js`: Rauchtest, der jede Welt mit Browser-Attrappen anspielt.

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

Experimente laufen in `apps/supersam-labor` (veröffentlicht unter https://supersam.jemphub.com/labor/, eigener Spielstand). Diese Demo bleibt beim Stand, bis ein Labor-Stand bewusst übernommen wird.
