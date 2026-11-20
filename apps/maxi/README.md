# Maxis Bierkiste

Handyspiel im Hochformat für die Freetown Brewery: Maximilian Weichl steht vor der Brauerei und fängt mit seiner Bierkiste die Flaschen, die die Barbesucher über die Schulter werfen. Gesteuert wird mit dem Finger (auflegen und nach links oder rechts ziehen).

- 20 Flaschen sind eine volle Kiste. Dann blinkt die Abgabe; ein Tipp darauf ruft den Stapler, der die volle Kiste gegen eine leere tauscht. Punkte: 100 × Stufe × Multiplikator pro Kiste, alle zwei Kisten steigt die Stufe. Nach jeder Abgabe wird der Bruch zurückgesetzt.
- Multiplikator (in allen Spielen gleich): Alle 15 Sekunden ohne verlorenes Leben steigt er um 1, bis ×8; das Abzeichen neben den Punkten füllt sich bis zur nächsten Stufe. Jeder Fehler setzt ihn auf den Startwert zurück (×1, mit „Training“ höher). Bei der Abgabe im Braustüberl wird er eingelöst und bleibt danach erhalten.
- Bei voller Kiste passen noch zwei Flaschen obendrauf (zählen nicht, kein Bruch); danach prallen Flaschen ab.
- Fünf zerbrochene Flaschen beenden das Spiel. Herzen, die ab und zu herabschweben, nehmen einen Bruch zurück (fangen oder antippen).
- Nach und nach kommen neue Elemente dazu, jeweils mit kurzer Einführung: rote Flaschen ab der 10. Flasche (wegschnippen), Bananenschalen ab der 30. (wegkicken, sonst rutscht Maxi aus), der Storch vom Schornstein ab der 36. (seinen Gruß nicht auffangen, sonst ist die Sicht kurz verschmiert; mit dem Finger über ihn rubbeln, dann fliegt er weg). Eine gute Flasche wegzukicken zählt als Bruch. Jede Einführung erscheint nur beim allerersten Mal; das Gerät merkt sich im `localStorage`, welche schon gezeigt wurden.

## Progression (ab v2.0.0)

Übersicht mit Grafik: [docs/progression.md](docs/progression.md).

**Einführung in 3 Kapiteln:** Kapitel 1 beginnt ohne Animation auf der Karte: Alles außer dem Braustüberl ist gesperrt („später“, „Das ist erst der Anfang …“). Nach 3 vollen Kisten lobt der Braumeister Maxi (Bilderszene) und holt ihn ans Förderband (Kapitel 2, Teaser: 20 Flaschen sortieren). Danach folgt der Schnuppertag im Sudhaus (Kapitel 3, Teaser: 2 Probesude) und das Angebot für den alten Kessel; dann ist die Karte offen (`ftb-eco` → `story` 0 bis 3).

**Zwei Systeme:** Errungenschaften (nur Leistung, bringen kein Geld) führen zur nächsten Berufsstufe; Taler (Lohn, Bierverkauf, Preisgeld) kaufen alles im Laden. Eine Stufe macht Dinge kaufbar, bezahlt wird mit Talern. Erfahrungspunkte, Rundenziele in jeder Runde, die Chronik mit 13 Kapiteln und die Sterne an Gebäuden gibt es nicht mehr.

| Stufe | Errungenschaften für die nächste Stufe | danach kaufbar | Gewand |
|---|---|---|---|
| Brauereilakai | 10 Kisten im Braustüberl · 1500 Punkte im Braustüberl · Multiplikator ×4 im Braustüberl | Abfüllhalle, altes Sudhaus, eigener Bierpreis | Leiberl und Kapperl |
| Mitarbeiter | Sudhaus gekauft · erstes Fass · 20 Gläser gezapft · 2000 Punkte am Förderband · Dichtung | Bauernhof, Hopfengarten, Läuterbottich, Gärtank, Thermometer, Politur, größerer Kessel, Sämaschine, Mähdrescher | Arbeitsjacke und Handschuhe |
| Brauer | Medaille in allen 5 Sorten · alle 5 Sudhaus-Ausbauten (Dichtung, Thermometer, Politur, Läuterbottich, Gärtank) | – | Brauerschürze und Gummistiefel |
| Braumeister | – | – | Braumeisterkappe und Gilet |

Oben auf der Karte gibt es nur **einen Balken**: in der Einführung das Kapitel, danach „Weg zum …“ mit der nächsten offenen Errungenschaft und erledigt / gesamt. Ein Tipp öffnet die Liste mit dem Bierwettbewerb. Punkte-Errungenschaften stehen im Spiel oben als Ziel (🏅 1500 Punkte); frisch erledigte Errungenschaften erscheinen sofort im Spiel. Sind alle erledigt, wird Maxi beim nächsten Blick auf die Karte befördert: Vorhang zu, das neue Gewand fliegt herein, Vorhang auf, Fanfare. Das Gewand trägt er danach in allen Spielen. Gespeichert in `ftb-rank` und `ftb-eco` (`stats`, `achSeen`); alte Spielstände (`ftb-prog` fehlt) werden einmal umgestellt: Produktionsmitarbeiter und Vorarbeiter werden Mitarbeiter, schon Erreichtes zählt still.

## Förderband (Abfüllhalle)

In der Brauerei kommen Flaschen von der Verschließmaschine aufs Hauptband. Maxi stellt am Hebel die Weiche (Tipp unten auf ◀ ▼ ▶ oder Pfeiltasten): Freetown nach links, Krone nach unten, ab der 10. sortierten Flasche auch Radler nach rechts. Jede Kiste am Bandende fasst 10 Flaschen und füllt sich sichtbar; eine volle Kiste blinkt und wird per Tipp gegen eine leere getauscht (50 × Multiplikator Bonus), eine Flasche in eine volle Kiste ist ein Fehler. Ab der 25. sortierten Flasche kommen kaputte Flaschen mit Sprung im Glas, die man antippt, damit sie im Ausschuss landen. Ab der 40. liegen lose Kronkorken auf dem Band, die man wegschnippt; erreicht einer die Weiche, verklemmt sie kurz. Falsches Band, kaputte Flasche in der Kiste, volle Kiste oder verklemmte Weiche zählen als Fehler, fünf Fehler beenden das Spiel. Punkte: 20 × Tempostufe × Multiplikator pro richtig sortierter Flasche, das Band wird stetig schneller. Eigener lokaler Rekord; die Bestenliste führt alle Spielorte.

## Sudhaus

Maxis eigenes Sudhaus, nach dem Kauf des alten Sudkessels. Jeder Sud ist eine Biersorte mit eigenem Rezept; anfangs nur Märzen, mit Läuterbottich Pils und Zwickl, mit Gärkeller Festbier und Dunkles. Über der Tafel steht im eigenen Sudhaus das Lager: Malz, Hopfen und Fässer (mit dem Zuwachs der Runde), darunter je Sorte, wie viele Sude der Bestand noch hergibt. Die Karte zeigt das auch beim Sudhaus. Die Tafel zeigt oben die Sorte mit der höchstmöglichen Qualität und den Sud, darunter alle Schritte mit dem aktuellen hervorgehoben und dann, was der Sudkessel im aktuellen Schritt braucht (Einmaischen: Wasser und Malz, Würzekochen: Hopfen, Anstellen: Hefe). Ab dem 2. Sud folgt nach dem Einmaischen die Maischrast: Finger auf dem Bildschirm halten heizt, loslassen kühlt; die Temperatur muss im grünen Bereich bleiben, bis die Rastzeit voll ist (zu heiß ist ein Fehler). Ein Tipp auf die Zutat unten (oder Taste 1–5) lässt Maxi sie in den Kessel werfen. Falsche oder zu viele Zutaten und abgelaufene Zeit zählen als Fehler, fünf Fehler beenden das Spiel. Jeder fertige Sud bringt einen Bonus, die Mengen steigen und die Zeit wird knapper. Ab dem 3. Sud kann der Kessel beim Würzekochen überkochen (schnell zweimal mit dem Finger im Kreis um den Kessel rühren), für Dunkles braucht es Karamellmalz. Eigener lokaler Rekord.

## Bierwettbewerb

Beim Bierwettbewerb (in der Liste der Errungenschaften) reicht Maxi ein volles Fass einer Sorte ein; die Jury bewertet die Qualität im Keller: ★★★ Bronze (30 🪙), ★★★★ Silber (60 🪙), ab 4,6 Sternen Gold (120 🪙); eine bessere Medaille zahlt die Differenz. Die Medaillen hängen in der Schank an der Wand und an der Fassade des Braustüberls.

Die Brauerei wächst sichtbar: Biergarten-Tische vor dem Braustüberl je Stammtisch-Ausbau, Läuterbottich und Gärkeller am Sudhaus auf der Karte und neben dem Kessel im Sudhaus, Thermometer am Kessel, „MAXIS KESSEL“ nach dem Kauf.

## Schank (Braustüberl, eigenes Bier)

Hat Maxi Bier im Keller, bietet die Karte beim Braustüberl „Zapfen“ (und „Flaschen“ für das Lohnspiel). An der Theke wünschen sich bis zu drei Gäste je eine Sorte aus dem Keller, mit Geduldsbalken. Finger auf den Zapfhahn der Sorte halten füllt das Glas; am gestrichelten Eichstrich loslassen. Jede Sorte schäumt nach dem Loslassen etwas nach (Pils am meisten). Übergelaufen, zu wenig, eine Sorte, die keiner will, oder ein Gast, der geht, sind Fehler. Ab dem dritten Gast kommen Sonderwünsche: der Stammgast mit Trachtenhut will viel Schaum (Strich knapp unter dem Rand, +2 Trinkgeld), der Tourist im Blumenhemd nur einen Pfiff (halbes Glas, halber Preis), der Bürgermeister mit Zylinder zahlt doppelt, verlangt aber genaues Zapfen und ist ungeduldiger, der Bauarbeiter hat Durst und kaum Geduld (+1). Der Eichstrich am Glas zeigt jeweils den Wunsch des nächsten Gasts für diese Sorte. Jedes Glas verbraucht 1/50 Fass der Sorte; der Preis je Glas richtet sich nach Sorte (Grundwert 2,6 bis 3,6 🪙) und vor allem nach der Qualität im Keller: ★★ ×0,7, ★★★ ×1, ★★★★ ×1,4, ★★★★★ ×2 (Märzen 2/3/4/5 🪙, Festbier bis 7 🪙); die Sterne stehen unter jedem Glas. Die Qualität heben Dichtung (bis ★★★), Thermometer (bis ★★★★) und Politur (bis ★★★★★), über ★★★ nur mit Premium-Zutaten; perfekt gezapft gibt es Trinkgeld (+1, +1 je Stammtisch). Ist der Keller leer, endet die Runde. Eigener Rekord (`ftb-best4`).

## Karte

Die Karte hat drei Seiten, verbunden über Wege mit Wegweisern am Rand: in der Mitte die **Brauerei** (hinten Sudhaus und Laden, vorne das Braustüberl; gepflasterte Wege mit Blumen und Laternen), links die **Abfüllung** (Abfüllhalle mit Laderampe), rechts die **Landwirtschaft** (Bauernhof, Hopfengarten). Tippt man einen Wegweiser an, geht Maxi hin und die Karte gleitet zur nächsten Seite; ein Ziel auf einer anderen Seite erreicht Maxi über den Wegweiser von selbst. Das Infofeld erscheint als Sprechblase am Gebäude.

**Sichtbare Ausbauten:** Breite Kiste (Kistenstapel am Braustüberl), Stammgäste (Tische im Biergarten), Ruhiges Band (Förderband vor der Halle), Akkordprämie (Tanks neben der Halle, mehr Lkw an der Rampe), Kessel abdichten (das Leck unter dem Sudhaus verschwindet, neue Leitung), Thermometer (Zifferblatt über der Tür), Kupfer (glänzende Kuppel), Läuterbottich, Gärkeller, größerer Kessel (Kupfertanks), Ersatzbier (Kisten vor dem Laden), Sämaschine und Mähdrescher (parken am Bauernhof).

## Bauernhof (Echtzeit)

Mit eigenem Sudhaus öffnet sich der Bauernhof auf der Karte. Gesät und geerntet wird von Hand: Mit dem Finger über das Feld streichen streut die Saat (6 🪙 je Feld, jedes der 24 Kästchen trägt), nach 4 Stunden mäht man die reifen Ähren mit der Sichel (je 3 Büschel 1 Gerste, volles Feld = 8 Gerste). Lücken kann man im ersten Fünftel der Wachstumszeit nachsäen. Mit Sämaschine (150 🪙) und Mähdrescher (300 🪙) aus dem Laden geht beides auf einen Tipp. Die Mälzerei macht aus Gerste in 2 Stunden Malz (bis 12 auf einmal), das ins Sudhaus-Lager kommt. Mit dem Thermometer aus dem Laden kann sie stattdessen Edelmalz darren: aus jeder Gerste ein Edelmalz, aber 4 Stunden (Auswahl Malz / Edelmalz unten im Fenster der Mälzerei). Ein zweites und drittes Feld kosten 80 und 200 🪙. Felder und Mälzerei laufen in echter Zeit weiter, auch wenn das Spiel geschlossen ist; auf der Karte zeigt der Bauernhof „🌾 fertig!“.

**Hopfengarten** (eigener Ort auf der Karte, ab der Stufe Brauer): einmal für 150 🪙 anlegen, danach wächst der Hopfen in echter Zeit in 6 Stunden nach jeder Ernte von selbst nach. Geerntet wird im Wisch-Spiel: 30 Dolden fliegen hoch, man wischt durch sie hindurch, Bienen stechen (−3 Dolden). Je 4 Dolden geben 1 Hopfen, ein 3er-Schnitt bringt eine Dolde extra, goldene Dolden sind Aromahopfen. Wer mitten in der Ernte geht, behält das bisher Geerntete.

Die Zeit kommt aus dem `Date`-Kopf der Serverantwort (HEAD-Anfrage auf die eigene Seite), sonst von der Handyuhr. Sie läuft nie rückwärts (`ftb-clk`), und vorgestellte Handyzeit wird beim nächsten Abgleich mit dem Server korrigiert.

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

**Einstieg der Reihe nach:** siehe „Progression“: Kapitel 1 Braustüberl → Lob → Kapitel 2 Förderband → Schnuppertag → Kapitel 3 Sudhaus → Angebot → Karte offen.

1. **Brauereilakai (Braustüberl):** Maxi fängt Flaschen und bekommt Lohn je voller Kiste (6 Taler, +2 je Stufe).
2. **Mitarbeiter (über Errungenschaften, Förderband):** Lohn je voller Kiste am Band (8 Taler, +2 je weiterer Stufe). Jetzt darf Maxi den alten Sudkessel kaufen; er spart seinen Lohn.
3. **Eigenes Sudhaus:** Gekauft wird direkt am alten Sudhaus auf der Karte (verbretterte Fenster, „Zu verkaufen“). Danach braut Maxi selbst: Malz und Hopfen im Brauerei-Laden kaufen, brauen, im Braustüberl selbst zapfen (siehe „Schank“). Der Keller führt jede Sorte mit Menge und Qualität. Ohne eigenes Bier fängt Maxi im Braustüberl Flaschen für Lohn.
4. **Anfangs schlecht:** Der alte Kessel ist undicht, Bier hat höchstens 2 Sterne, nur Märzen. Die Einnahmen reichen anfangs nicht, Maxi arbeitet weiter im Braustüberl und am Band.
5. **Reparieren und erweitern** (Regal „Sudhaus“ im Brauerei-Laden): Kessel abdichten (bis 3 Sterne), Neues Thermometer (Rast leichter, bis 4 Sterne, Premium-Zutaten lohnen sich), Kupfer aufpolieren (bis 5 Sterne, Kuppel glänzt), Läuterbottich (Pils, Zwickl), Gärkeller (Festbier, Dunkles mit Karamellmalz), Größerer Sudkessel, Routinierter Brauer.
6. **Braumeister:** Mit allen fünf Sudhaus-Ausbauten und einer Medaille in jeder Sorte wird der Brauer zum Braumeister.

Schichten, Spieltage und Abrechnung gibt es nicht mehr; die Rohstoffpreise ändern sich nach jeder Runde. Das Sudhaus bucht die Zutaten am Anfang jedes Suds ab; reichen sie nicht, endet die Runde („Zutaten aufgebraucht!“). Wer vor dieser Version schon im Sudhaus gespielt hat, besitzt es bereits.

## Brauerei-Laden und Ausbauten

Gekauft wird nur im Brauerei-Laden auf der Karte. Der Laden hat zwei begehbare Räume, vorne die Ausrüstung und hinten die Zutatenkammer (Durchgang an der Seite, erst mit eigenem Sudhaus): Maxi kommt zur Tür herein, ein Tipp auf eine Ware schickt ihn hin, unten erscheinen Name, Wirkung und Preis. Jede Ware ist gezeichnet und hat einen Ein-Wort-Namen (Malz, Hopfen, Edelmalz, Aromahopfen, Dichtung, Thermometer, Politur, Kessel, Läuterbottich, Gärtank, Sanduhr, Großkiste, Stammtisch, Bandbremse, Prämie, Ersatzbier, Training). Zutaten und Sudhaus-Teile stehen erst im Regal, wenn Maxi das Sudhaus besitzt, die Halle-Waren ab Mitarbeiter. Fehlen Zutaten, schickt der Sudhaus-Knopf Maxi direkt zum Laden. Allgemein: Ersatzbier (ein Fehler mehr), Eingespielt (höherer Startmultiplikator). Im Braustüberl: Breite Kiste, Stammgäste (+2 Taler Lohn je Kiste). Am Förderband: Ruhiges Band, Akkordprämie (+2 Taler Lohn je Kiste). Alles wird lokal gespeichert (`ftb-taler`, `ftb-upg`, `ftb-eco`).

## Eilaufträge (Sudhaus)

Ab dem 4. Sud einer Runde bietet der Wirt manchmal einen Eilauftrag an, etwa „2 × Märzen in 45 Sekunden“. Annehmen bringt Bonuspunkte, verpasst kostet es einen Fehler.

## Menü und Karte

Unter dem Startmenü löscht „Spielstand zurücksetzen“ (zweimal tippen) den ganzen Spielstand samt Rekorden, nur der Name für die Bestenliste bleibt. „Start“ führt Neulinge zuerst auf die Karte von Kapitel 1; danach zeigt „Maxis Laufbahn“ oben die Stufe (antippen klappt alle Stufen und Rekorde auf) und den einen Balken mit den Errungenschaften, die Taler bzw. das Sparziel und darunter die Karte des Brauereigeländes. Maxi geht zu einem Gebäude, unten erscheinen Infos und Knöpfe. In der Pause beendet „Runde beenden“ die Runde mit Bilanz.

Zu Beginn jeder Runde zeigt eine Karte das aktuelle Ziel (bis zum Produktionsmitarbeiter bzw. am Band bis zum Schnuppertag), und unter den Punkten steht es dauerhaft, z. B. „Ziel 1.500“ oder „Ziel 12 / 20 sortiert“.

## Version

Die Versionsnummer steht im Startmenü unten neben „Spielstand zurücksetzen“ (`VERSION` in `index.html`). Schema: Hauptversion.Neue Funktionen.Korrekturen; bei jeder Veröffentlichung erhöhen.

- **2.4.1** – Hauptseite: Sudhaus und Laden hinten, Braustüberl vorne; Wege gepflastert mit Rand, Blumen und Laternen
- **2.4.0** – Karte in drei Seiten: Brauerei (Sudhaus, Braustüberl, Laden), links Abfüllung (Abfüllhalle), rechts Landwirtschaft (Bauernhof, Hopfengarten); Wechsel über Wegweiser am Rand. Ausbauten sind an den Gebäuden zu sehen
- **2.3.0** – Karte füllt den Bildschirm, das Infofeld schwebt als Sprechblase am Gebäude
- **2.2.1** – Kapitel 1 endet nach 3 Kisten, Lakai braucht 10 Kisten statt 20
- **2.2.0** – Hopfengarten mit Ernte im Wisch-Spiel
- **2.1.0** – Edelmalz aus der eigenen Mälzerei (mit Thermometer)
- **2.0.0** – Progression neu: Einführung in 3 Kapiteln, Berufsstufen über Errungenschaften mit Gewand-Animation, ein Balken, Bauernhof, Qualitätspreis
