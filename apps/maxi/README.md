# Maxis Bierkiste

Handyspiel im Hochformat für die Freetown Brewery: Maximilian Weichl steht vor der Brauerei und fängt mit seiner Bierkiste die Flaschen, die die Barbesucher über die Schulter werfen. Gesteuert wird mit dem Finger (auflegen und nach links oder rechts ziehen).

- 20 Flaschen sind eine volle Kiste. Dann blinkt die Abgabe; ein Tipp darauf ruft den Stapler, der die volle Kiste gegen eine leere tauscht. Punkte: 100 × Stufe × Multiplikator pro Kiste, alle zwei Kisten steigt die Stufe. Nach jeder Abgabe wird der Bruch zurückgesetzt.
- Multiplikator: alle 5 gefangenen Flaschen ohne Bruch steigt er um 1 (bis ×5). Jeder Bruch setzt ihn auf ×1 zurück; bei der Abgabe wird er eingelöst und beginnt wieder bei ×1.
- Bei voller Kiste passen noch zwei Flaschen obendrauf (zählen nicht, kein Bruch); danach prallen Flaschen ab.
- Fünf zerbrochene Flaschen beenden das Spiel. Herzen, die ab und zu herabschweben, nehmen einen Bruch zurück (fangen oder antippen).
- Nach und nach kommen neue Elemente dazu, jeweils mit kurzer Einführung: rote Flaschen ab der 10. Flasche (wegschnippen), Bananenschalen ab der 30. (wegkicken, sonst rutscht Maxi aus), der Storch vom Schornstein ab der 36. (seinen Gruß nicht auffangen, sonst ist die Sicht kurz verschmiert; mit dem Finger über ihn rubbeln, dann fliegt er weg). Eine gute Flasche wegzukicken zählt als Bruch.

## Technik

- Eine einzige Datei `index.html`: Canvas-Spiel in reinem JavaScript, alle Figuren werden im Code gezeichnet, Töne entstehen live mit der Web Audio API.
- Der Rekord liegt im `localStorage` des Browsers. Eine gemeinsame Highscore-Liste folgt, sobald Supabase aktiv ist.
- `src/game.test.js`: Rauchtest (Dokument vollständig, Skript übersetzbar, Elemente vorhanden).

## Entwicklung und Veröffentlichung

```bash
npm run dev      # http://localhost:5187
npm test
npm run build    # dist/
```

Veröffentlicht wird automatisch bei jedem Merge nach `main` (siehe `DEPLOY.md` im Wurzelordner) nach `/var/www/maxi`.

Einmalig auf dem Server:

1. DNS-Eintrag `maxi` (Typ A) → `187.124.190.130`
2. `deploy/nginx/maxi.conf` nach `/etc/nginx/sites-available/` kopieren und verlinken:
   `ln -s /etc/nginx/sites-available/maxi.conf /etc/nginx/sites-enabled/`
3. `nginx -t && systemctl reload nginx`
4. `certbot --nginx -d maxi.jemphub.com`
