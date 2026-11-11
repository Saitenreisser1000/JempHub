# Maxis Bierkiste

Handyspiel im Hochformat für die Freetown Brewery: Maximilian Weichl steht vor der Brauerei und fängt mit seiner Bierkiste die Flaschen, die die Barbesucher über die Schulter werfen. Gesteuert wird mit dem Finger (auflegen und nach links oder rechts ziehen).

- 20 Flaschen sind eine volle Kiste. Dann blinkt die Abgabe; ein Tipp darauf ruft den Stapler, der die volle Kiste gegen eine leere tauscht. Punkte: 100 × Stufe × Multiplikator pro Kiste, alle zwei Kisten steigt die Stufe. Nach jeder Abgabe wird der Bruch zurückgesetzt.
- Multiplikator: alle 5 gefangenen Flaschen ohne Bruch steigt er um 1 (bis ×5). Jeder Bruch setzt ihn auf ×1 zurück; bei der Abgabe wird er eingelöst und beginnt wieder bei ×1.
- Bei voller Kiste passen noch zwei Flaschen obendrauf (zählen nicht, kein Bruch); danach prallen Flaschen ab.
- Fünf zerbrochene Flaschen beenden das Spiel. Herzen, die ab und zu herabschweben, nehmen einen Bruch zurück (fangen oder antippen).
- Nach und nach kommen neue Elemente dazu, jeweils mit kurzer Einführung: rote Flaschen ab der 10. Flasche (wegschnippen), Bananenschalen ab der 30. (wegkicken, sonst rutscht Maxi aus), der Storch vom Schornstein ab der 36. (seinen Gruß nicht auffangen, sonst ist die Sicht kurz verschmiert; mit dem Finger über ihn rubbeln, dann fliegt er weg). Eine gute Flasche wegzukicken zählt als Bruch. Jede Einführung erscheint nur beim allerersten Mal; das Gerät merkt sich im `localStorage`, welche schon gezeigt wurden.

## Beförderungen

Maxi beginnt als **Brauereilakai**. Erreicht eine Runde 3000 Punkte, wird er **Mitarbeiter**: Das Spiel hält an, Level 2 wird freigeschaltet, und man spielt vor der Brauerei weiter oder geht mit den bisherigen Punkten in die Brauerei. Bei 12 000 Punkten wird er **Produktionsmitarbeiter** (Level 3 freigeschaltet), bei 25 000 **Brauer** (jeweils mit Wahl, wo es weitergeht). Die erreichte Stufe merkt sich das Gerät (`localStorage`); sie steht auf dem Titelbild, und Maxi trägt pro Beförderung einen goldenen Stern auf der Jacke. Level 2 ist im Menü erst ab Mitarbeiter wählbar.

## Level 2: Am Fließband

In der Brauerei kommen Flaschen von der Verschließmaschine aufs Hauptband. Maxi stellt am Hebel die Weiche (Tipp unten auf ◀ ▼ ▶ oder Pfeiltasten): Freetown nach links, Krone nach unten, ab der 10. sortierten Flasche auch Radler nach rechts. Ab der 20. liegen lose Kronkorken auf dem Band, die man wegschnippt; erreicht einer die Weiche, verklemmt sie kurz. Falsches Band oder verklemmte Weiche zählen als Fehler, fünf Fehler beenden das Spiel. Punkte: 20 × Tempostufe × Multiplikator pro richtig sortierter Flasche, das Band wird stetig schneller. Eigener lokaler Rekord; die Bestenliste gilt bisher nur für Level 1.

## Level 3: Im Sudhaus

Freigeschaltet ab Produktionsmitarbeiter. Maxi hilft beim Brauen: Die Tafel zeigt, was der Sudkessel im aktuellen Schritt braucht (Einmaischen: Wasser und Malz, Würzekochen: Hopfen, Anstellen: Hefe). Ein Tipp auf die Zutat unten (oder Taste 1–5) lässt Maxi sie in den Kessel werfen. Falsche oder zu viele Zutaten und abgelaufene Zeit zählen als Fehler, fünf Fehler beenden das Spiel. Jeder fertige Sud bringt einen Bonus, die Mengen steigen und die Zeit wird knapper. Ab dem 3. Sud kann der Kessel beim Würzekochen überkochen (schnell viermal auf den Kessel tippen), ab dem 5. Sud braucht es manchmal Karamellmalz. Eigener lokaler Rekord.

## Technik

- Eine einzige Datei `index.html`: Canvas-Spiel in reinem JavaScript, alle Figuren werden im Code gezeichnet, Töne entstehen live mit der Web Audio API.
- Impressum und Datenschutzhinweis sind im Spiel selbst (Titelbild und Spielende); bei geänderten Diensten (z. B. Highscore über Supabase) den Datenschutztext anpassen.
- Der persönliche Rekord liegt im `localStorage` des Browsers.
- Bestenliste (Top 10) über Supabase: Tabelle und Eintragsfunktion in `supabase/highscore.sql`. Den Zugang liest das Spiel aus `config.json` neben `index.html` (Vorlage `config.example.json`, nur der öffentliche Anon-/Publishable-Key). Die Datei liegt nur auf dem Server und wird beim Deploy nicht überschrieben; fehlt sie, ist die Bestenliste ausgeblendet.

## Bestenliste einrichten (einmalig)

1. Im Supabase-Studio unter **SQL Editor** den Inhalt von `supabase/highscore.sql` ausführen.
2. Auf dem Server die öffentliche Adresse und den öffentlichen Schlüssel nachsehen:
   `grep -E "^(SUPABASE_PUBLIC_URL|API_EXTERNAL_URL|ANON_KEY|SUPABASE_PUBLISHABLE_KEY)=" /docker/supabase/supabase-project/.env`
3. `/var/www/maxi/config.json` nach `config.example.json` anlegen (niemals den Service-Role- oder Secret-Key verwenden).
- Vorschaubild zum Teilen (`og.jpg`, 1200 × 630) und App-Symbole mit Maxis Kopf (`apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `favicon-32.png`); sie werden aus den Spielfiguren gerendert.
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
