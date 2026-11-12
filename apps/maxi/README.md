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

In der Brauerei kommen Flaschen von der Verschließmaschine aufs Hauptband. Maxi stellt am Hebel die Weiche (Tipp unten auf ◀ ▼ ▶ oder Pfeiltasten): Freetown nach links, Krone nach unten, ab der 10. sortierten Flasche auch Radler nach rechts. Jede Kiste am Bandende fasst 10 Flaschen und füllt sich sichtbar; eine volle Kiste blinkt und wird per Tipp gegen eine leere getauscht (50 × Multiplikator Bonus), eine Flasche in eine volle Kiste ist ein Fehler. Ab der 18. sortierten Flasche kommen kaputte Flaschen mit Sprung im Glas, die man antippt, damit sie im Ausschuss landen. Ab der 28. liegen lose Kronkorken auf dem Band, die man wegschnippt; erreicht einer die Weiche, verklemmt sie kurz. Falsches Band, kaputte Flasche in der Kiste, volle Kiste oder verklemmte Weiche zählen als Fehler, fünf Fehler beenden das Spiel. Punkte: 20 × Tempostufe × Multiplikator pro richtig sortierter Flasche, das Band wird stetig schneller. Eigener lokaler Rekord; die Bestenliste gilt bisher nur für Level 1.

## Level 3: Im Sudhaus

Freigeschaltet ab Produktionsmitarbeiter. Maxi hilft beim Brauen: Jeder Sud ist eine Biersorte mit eigenem Rezept (Märzen, Pils, Zwickl, Festbier, Dunkles, danach zufällig und mit mehr Malz). Die Tafel zeigt, was der Sudkessel im aktuellen Schritt braucht (Einmaischen: Wasser und Malz, Würzekochen: Hopfen, Anstellen: Hefe). Ab dem 2. Sud folgt nach dem Einmaischen die Maischrast: Finger auf dem Bildschirm halten heizt, loslassen kühlt; die Temperatur muss im grünen Bereich bleiben, bis die Rastzeit voll ist (zu heiß ist ein Fehler). Ein Tipp auf die Zutat unten (oder Taste 1–5) lässt Maxi sie in den Kessel werfen. Falsche oder zu viele Zutaten und abgelaufene Zeit zählen als Fehler, fünf Fehler beenden das Spiel. Jeder fertige Sud bringt einen Bonus, die Mengen steigen und die Zeit wird knapper. Ab dem 3. Sud kann der Kessel beim Würzekochen überkochen (schnell zweimal mit dem Finger im Kreis um den Kessel rühren), ab dem 5. Sud (Dunkles) braucht es Karamellmalz. Eigener lokaler Rekord.

## Technik

- Eine einzige Datei `index.html`: Canvas-Spiel in reinem JavaScript, alle Figuren werden im Code gezeichnet, Töne entstehen live mit der Web Audio API.
- Impressum und Datenschutzhinweis sind im Spiel selbst (Titelbild und Spielende); bei geänderten Diensten (z. B. Highscore über Supabase) den Datenschutztext anpassen.
- Der persönliche Rekord liegt im `localStorage` des Browsers.
- Bestenliste (Top 10) über Supabase, für Runden aus allen Levels; gespeichert werden auch das Level, in dem die Runde endete, und Maxis Stufe (in der Liste unter dem Namen angezeigt).
- Technik der Bestenliste: Tabelle und Eintragsfunktion in `supabase/highscore.sql`. Den Zugang liest das Spiel aus `config.json` neben `index.html` (Vorlage `config.example.json`, nur der öffentliche Anon-/Publishable-Key). Die Datei liegt nur auf dem Server und wird beim Deploy nicht überschrieben; fehlt sie, ist die Bestenliste ausgeblendet.

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

## Brauerei-Shop

Brauereitaler verdient man durch Verkäufe in der Bar (siehe Wirtschaft). Im Shop auf dem Titelbild kauft man damit dauerhafte Verbesserungen, jeweils in zwei Stufen: Ersatzbier (ein Fehler mehr erlaubt), Eingespielt (Start mit höherem Multiplikator, nach Fehlern fällt er nur bis dorthin), Breite Kiste (Level 1), Ruhiges Band (Level 2, 10 % langsamer), Routinierter Brauer (Level 3, 15 % mehr Zeit pro Schritt). Taler und Käufe speichert das Gerät (`localStorage`: `ftb-taler`, `ftb-upg`).

## Eilaufträge (Level 3)

Ab dem 4. Sud bietet der Wirt manchmal einen Eilauftrag an, etwa „2 × Pils in 45 Sekunden“. Während der Entscheidung steht die Zeit. Annehmen: Die nächsten Sude sind diese Sorte, eine Uhr läuft; geschafft gibt es 250 + 60 × Sude Punkte mal Multiplikator, verpasst kostet es einen Fehler. Ablehnen: weiter wie bisher.

## Menü und Karte

Das Hauptmenü zeigt nur Start und Bestenliste. Start öffnet „Maxis Laufbahn“: oben die Beförderungsstufen mit dem nächsten Ziel und den Rekorden, darunter eine Karte des Brauereigeländes. Tippt man auf ein Gebäude (Bar = Level 1, Abfüllhalle = Level 2, Sudhaus = Level 3, Brauerei-Laden = Shop), geht Maxi über die Wege dorthin; dann startet man das Level über den Knopf oder durch erneutes Tippen. Gesperrte Gebäude sind grau mit Schloss und nennen die nötige Stufe.

## Wirtschaft: Lager, Warenfluss und Spieltage

Die drei Level hängen als Warenkette zusammen. Das Sudhaus (Level 3) verbraucht je fertigem Sud Malz und Hopfen nach Rezept und legt 1 Fass ins Lager. Die Abfüllhalle (Level 2) füllt bei jedem Kistentausch eine Kiste aus dem Fass (4 Kisten je Fass). In der Bar (Level 1) verkauft jede gelieferte Kiste eine Kiste aus dem Lager für 12 Brauereitaler. Fehlt Ware, kann man trotzdem spielen und Punkte sammeln, verdient aber nichts (in der Bar nur 1 Taler Trinkgeld). Brauereitaler gibt es nur noch aus Verkäufen.

Malz und Hopfen kauft man unter „Lager & Einkauf“ im Laufbahn-Screen; die Preise ändern sich jeden Tag. Jede gespielte Runde ist eine Schicht, drei Schichten sind ein Tag. Danach zeigt die Abrechnung Verkäufe, Produktion, Einnahmen, Einkauf, 10 Taler Strom und Miete und den Gewinn mit Verlauf der letzten 7 Tage. Gespeichert lokal unter `ftb-eco`.

## Bierpreis und Ausbauten

An der Bar stellt man den Bierpreis ein (8 bis 18 Taler je Kiste, Start 12). Billiges Bier bringt mehr Andrang: In Level 1 fliegen deutlich mehr Flaschen, dafür bringt jede Kiste weniger. Teures Bier macht die Bar ruhiger.

Ausbauten kauft man direkt an den Gebäuden auf der Karte (Knopf „Ausbauen“), je zwei mit drei Stufen: Bar (Breite Kiste, Mehr Tische: +2 Taler je Kiste), Abfüllhalle (Ruhiges Band, Besserer Füller: +1 Kiste je Fass), Sudhaus (Routinierter Brauer, Größerer Sudkessel: +½ Fass je Sud). Der Brauerei-Laden führt die allgemeinen Verbesserungen (Ersatzbier, Eingespielt). Ausbauten sieht man auf der Karte: Sterne am Namensschild, zusätzliche Tische, Kupfer- und Edelstahltanks.

Während einer Runde zeigt die Anzeige oben den Ertrag der Schicht (Bar: Taler, Abfüllhalle: Kisten, Sudhaus: Fässer). In der Pause beendet „Schicht beenden“ die Runde mit Bilanz und Talerstand; von der Spielende-Karte führt „Zur Brauerei“ direkt zurück auf die Karte.
