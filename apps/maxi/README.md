# Maxis Bierkiste

Handyspiel im Hochformat für die Freetown Brewery: Maximilian Weichl steht vor der Brauerei und fängt mit seiner Bierkiste die Flaschen, die die Barbesucher über die Schulter werfen. Gesteuert wird mit dem Finger (auflegen und nach links oder rechts ziehen).

- 20 Flaschen sind eine volle Kiste. Dann blinkt die Abgabe; ein Tipp darauf ruft den Stapler, der die volle Kiste gegen eine leere tauscht. Punkte: 100 × Stufe × Multiplikator pro Kiste, alle zwei Kisten steigt die Stufe. Nach jeder Abgabe wird der Bruch zurückgesetzt.
- Multiplikator: alle 5 gefangenen Flaschen ohne Bruch steigt er um 1 (bis ×5). Jeder Bruch setzt ihn auf ×1 zurück; bei der Abgabe wird er eingelöst und beginnt wieder bei ×1.
- Bei voller Kiste passen noch zwei Flaschen obendrauf (zählen nicht, kein Bruch); danach prallen Flaschen ab.
- Fünf zerbrochene Flaschen beenden das Spiel. Herzen, die ab und zu herabschweben, nehmen einen Bruch zurück (fangen oder antippen).
- Nach und nach kommen neue Elemente dazu, jeweils mit kurzer Einführung: rote Flaschen ab der 10. Flasche (wegschnippen), Bananenschalen ab der 30. (wegkicken, sonst rutscht Maxi aus), der Storch vom Schornstein ab der 36. (seinen Gruß nicht auffangen, sonst ist die Sicht kurz verschmiert; mit dem Finger über ihn rubbeln, dann fliegt er weg). Eine gute Flasche wegzukicken zählt als Bruch. Jede Einführung erscheint nur beim allerersten Mal; das Gerät merkt sich im `localStorage`, welche schon gezeigt wurden.

## Beförderungen

Maxi beginnt als **Brauereilakai**. Erreicht eine Runde 1500 Punkte, wird er **Mitarbeiter** (Förderband frei, Angebot für den alten Sudkessel), bei 12 000 Punkten **Produktionsmitarbeiter**, bei 25 000 **Vorarbeiter**; jede Stufe erhöht den Lohn. Die Stufe merkt sich das Gerät (`localStorage`), Maxi trägt pro Beförderung einen goldenen Stern auf der Jacke. Braumeister wird er über sein eigenes Sudhaus (siehe Spielbogen).

## Förderband (Abfüllhalle)

In der Brauerei kommen Flaschen von der Verschließmaschine aufs Hauptband. Maxi stellt am Hebel die Weiche (Tipp unten auf ◀ ▼ ▶ oder Pfeiltasten): Freetown nach links, Krone nach unten, ab der 10. sortierten Flasche auch Radler nach rechts. Jede Kiste am Bandende fasst 10 Flaschen und füllt sich sichtbar; eine volle Kiste blinkt und wird per Tipp gegen eine leere getauscht (50 × Multiplikator Bonus), eine Flasche in eine volle Kiste ist ein Fehler. Ab der 25. sortierten Flasche kommen kaputte Flaschen mit Sprung im Glas, die man antippt, damit sie im Ausschuss landen. Ab der 40. liegen lose Kronkorken auf dem Band, die man wegschnippt; erreicht einer die Weiche, verklemmt sie kurz. Falsches Band, kaputte Flasche in der Kiste, volle Kiste oder verklemmte Weiche zählen als Fehler, fünf Fehler beenden das Spiel. Punkte: 20 × Tempostufe × Multiplikator pro richtig sortierter Flasche, das Band wird stetig schneller. Eigener lokaler Rekord; die Bestenliste führt alle Spielorte.

## Sudhaus

Maxis eigenes Sudhaus, nach dem Kauf des alten Sudkessels. Jeder Sud ist eine Biersorte mit eigenem Rezept; anfangs nur Märzen, mit Läuterbottich Pils und Zwickl, mit Gärkeller Festbier und Dunkles. Über der Tafel steht im eigenen Sudhaus das Lager: Malz, Hopfen und Fässer (mit dem Zuwachs der Runde), darunter je Sorte, wie viele Sude der Bestand noch hergibt. Die Karte zeigt das auch beim Sudhaus. Die Tafel zeigt oben die Sorte mit der höchstmöglichen Qualität und den Sud, darunter alle Schritte mit dem aktuellen hervorgehoben und dann, was der Sudkessel im aktuellen Schritt braucht (Einmaischen: Wasser und Malz, Würzekochen: Hopfen, Anstellen: Hefe). Ab dem 2. Sud folgt nach dem Einmaischen die Maischrast: Finger auf dem Bildschirm halten heizt, loslassen kühlt; die Temperatur muss im grünen Bereich bleiben, bis die Rastzeit voll ist (zu heiß ist ein Fehler). Ein Tipp auf die Zutat unten (oder Taste 1–5) lässt Maxi sie in den Kessel werfen. Falsche oder zu viele Zutaten und abgelaufene Zeit zählen als Fehler, fünf Fehler beenden das Spiel. Jeder fertige Sud bringt einen Bonus, die Mengen steigen und die Zeit wird knapper. Ab dem 3. Sud kann der Kessel beim Würzekochen überkochen (schnell zweimal mit dem Finger im Kreis um den Kessel rühren), für Dunkles braucht es Karamellmalz. Eigener lokaler Rekord.

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

## Spielbogen

**Einstieg der Reihe nach:** „Start“ führt bis zum Angebot immer zum nächsten Schritt: Braustüberl → bei der Beförderung zum Mitarbeiter direkt ans Förderband → nach 20 sortierten Flaschen ruft der Braumeister (Bilderszene) → Schnuppertag im schönen Sudhaus des Braumeisters (2 Sude, kein Fehlerlimit, keine Wirtschaft) → Bilderszene im alten Sudhaus mit dem Angebot für den alten Sudkessel → erst dann ist die Karte offen (`ftb-eco` → `story` 0 bis 3). Wer schon weiter war, startet direkt mit der Karte.

1. **Brauereilakai (Braustüberl):** Maxi fängt Flaschen und bekommt Lohn je voller Kiste (6 Taler, +2 je Stufe).
2. **Mitarbeiter (ab 1.500 Punkten, Förderband):** Lohn je voller Kiste am Band (8 Taler, +2 je weiterer Stufe). Der Braumeister bietet Maxi den alten Sudkessel für 250 Taler an; Maxi spart seinen Lohn.
3. **Eigenes Sudhaus:** Gekauft wird direkt am alten Sudhaus auf der Karte (verbretterte Fenster, „Zu verkaufen“). Danach braut Maxi selbst: Malz und Hopfen im Brauerei-Laden kaufen, brauen, im Braustüberl ausschenken: Jede volle Kiste dort braucht ⅕ Fass und bringt je nach Sorte und Qualität mehr als der Lohn (mindestens Lohn + 4 Taler, +2 je Stammtisch). Ohne eigenes Bier im Keller gibt es dort Lohn.
4. **Anfangs schlecht:** Der alte Kessel ist undicht, Bier hat höchstens 2 Sterne, nur Märzen. Die Einnahmen reichen anfangs nicht, Maxi arbeitet weiter im Braustüberl und am Band.
5. **Reparieren und erweitern** (Regal „Sudhaus“ im Brauerei-Laden): Kessel abdichten (bis 3 Sterne), Neues Thermometer (Rast leichter, bis 4 Sterne, Premium-Zutaten lohnen sich), Kupfer aufpolieren (bis 5 Sterne, Kuppel glänzt), Läuterbottich (Pils, Zwickl), Gärkeller (Festbier, Dunkles mit Karamellmalz), Größerer Sudkessel, Routinierter Brauer.
6. **Braumeister:** Sind Abdichtung, Thermometer, Kupfer, Läuterbottich und Gärkeller fertig, wird Maxi Braumeister.

Die Stufen Produktionsmitarbeiter (12.000) und Vorarbeiter (25.000) erhöhen den Lohn. Schichten, Spieltage und Abrechnung gibt es nicht mehr; die Rohstoffpreise ändern sich nach jeder Runde. Das Sudhaus bucht die Zutaten am Anfang jedes Suds ab; reichen sie nicht, endet die Runde („Zutaten aufgebraucht!“). Wer vor dieser Version schon im Sudhaus gespielt hat, besitzt es bereits.

## Brauerei-Laden und Ausbauten

Gekauft wird nur im Brauerei-Laden auf der Karte. Der Laden hat zwei begehbare Räume, vorne die Ausrüstung und hinten die Zutatenkammer (Durchgang an der Seite, erst mit eigenem Sudhaus): Maxi kommt zur Tür herein, ein Tipp auf eine Ware schickt ihn hin, unten erscheinen Name, Wirkung und Preis. Jede Ware ist gezeichnet und hat einen Ein-Wort-Namen (Malz, Hopfen, Edelmalz, Aromahopfen, Dichtung, Thermometer, Politur, Kessel, Läuterbottich, Gärtank, Sanduhr, Großkiste, Stammtisch, Bandbremse, Prämie, Ersatzbier, Training). Zutaten und Sudhaus-Teile stehen erst im Regal, wenn Maxi das Sudhaus besitzt, die Halle-Waren ab Mitarbeiter. Fehlen Zutaten, schickt der Sudhaus-Knopf Maxi direkt zum Laden. Allgemein: Ersatzbier (ein Fehler mehr), Eingespielt (höherer Startmultiplikator). Im Braustüberl: Breite Kiste, Stammgäste (+2 Taler Lohn je Kiste). Am Förderband: Ruhiges Band, Akkordprämie (+2 Taler Lohn je Kiste). Alles wird lokal gespeichert (`ftb-taler`, `ftb-upg`, `ftb-eco`).

## Eilaufträge (Sudhaus)

Ab dem 4. Sud einer Runde bietet der Wirt manchmal einen Eilauftrag an, etwa „2 × Märzen in 45 Sekunden“. Annehmen bringt Bonuspunkte, verpasst kostet es einen Fehler.

## Menü und Karte

„Start“ führt Neulinge direkt ins Braustüberl; danach zeigt „Maxis Laufbahn“ oben die Stufe mit Fortschrittsbalken (antippen klappt alle Stufen und Rekorde auf), die Taler bzw. das Sparziel und darunter die Karte des Brauereigeländes. Maxi geht zu einem Gebäude, unten erscheinen Infos und Knöpfe. In der Pause beendet „Runde beenden“ die Runde mit Bilanz.

Zu Beginn jeder Runde zeigt eine Karte das aktuelle Ziel (bis zum Produktionsmitarbeiter bzw. am Band bis zum Schnuppertag), und unter den Punkten steht es dauerhaft, z. B. „Ziel 1.500“ oder „Ziel 12 / 20 sortiert“.
