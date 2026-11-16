# Supersam Labor

Experimentier-Version von Supersam unter **https://supersam.jemphub.com/labor/**.
Hier wird ausprobiert; die Demo unter `apps/supersam` bleibt unverändert, bis
ein Stand aus dem Labor bewusst übernommen wird.

- Gleiche Technik wie `apps/supersam` (eine Datei `index.html`, Tests in `src/`).
- Eigene Speicherschlüssel (`supersam-labor-…`): Spielstand, Debug-Werte und
  Lautstärke sind von der Demo getrennt.
- Veröffentlicht wird automatisch bei jedem Merge nach `main` nach
  `/var/www/supersam/labor` (der Unterordner der Demo; deren Upload lässt ihn stehen).
  Auf dem Server ist nichts einzurichten – die nginx-Konfiguration der Demo liefert
  den Unterordner mit aus.

```bash
npm run dev      # http://localhost:5186
npm test
npm run build    # dist/
```

## Kamera

Die Kamera richtet das Bild auf die Standhöhe aus (Füße bei gut zwei Dritteln der Bildhöhe, darüber Platz
für einen vollen Sprung) und bleibt bei normalen Sprüngen ruhig. Dazu kommt:

- **Klettern:** Steigt Sam höher als ein Sprung und landet die vorausberechnete Flugbahn höher als der
  Absprung (Doppelsprung, Feder, Aufwind, Wandsprung), verengt sich das Ruheband gleitend auf 2,5 Kacheln.
  Die Kamera holt Sam dann Richtung Bildmitte, statt ihn am oberen Rand kleben zu lassen.
- **Sprung über eine Grube:** Kommt Sam auf gleicher Höhe oder tiefer wieder auf, bleibt das Bild auf das
  Gelände unten ausgerichtet (Landestelle und Stacheln bleiben im Bild).
- **Landestelle:** In der Luft wird die Flugbahn vorausberechnet. Die Landestelle soll rechtzeitig unten
  im Bild sein. Bei einem tiefen Sturz wartet die Kamera dort und zoomt bei Bedarf aus (höchstens doppelt so
  weit), bis Sam und Landestelle gemeinsam ins Bild passen.
- **Ruhe:** Das senkrechte Ziel wird vorgeglättet, damit Wechsel zwischen den Grenzen keine Rucke ergeben.

**Messen statt schätzen:** `kamera.mjs` sucht pro Welt mit der echten Spielphysik einen Weg zum Ziel, spielt
ihn mit laufender Kamera ab und misst den Bildausschnitt: Vorlauf in Laufrichtung, Sam am Bildrand,
Landungen ohne Sicht, Gefahren, die zu spät ins Bild kommen, Richtungswechsel, Rucke und Zoomwechsel.

```bash
node kamera.mjs                 # alle Welten (der Weg wird zwischengespeichert)
node kamera.mjs --stellen 3 7   # zusätzlich die schlechtesten Stellen (Spalte,Zeile)
```

Suche und Abspielen teilen sich `pruefung.mjs` mit `erreichbar.mjs`.

## Kapitel und Fähigkeiten

Fähigkeiten gibt es nur von Endgegnern. Jeder Boss schenkt die Fähigkeit, die das nächste Kapitel braucht
(`AB_OF` in `index.html`); Welten selbst geben keine Fähigkeit mehr (im Käfig am Ziel wartet ein Stern).

| Kapitel | Welten | Endgegner | Belohnung |
|---|---|---|---|
| 1 Wiese | 1-1 Blumenwiese, 1-2 Bachtal (ohne Fähigkeit) | Käferkönig | Doppelsprung |
| 2 Wald | 2-1 Wald, 2-2 Wipfelwald | Wespenkönigin | Wandsprung |
| 3 Felsen | 3-1 Felsen, 3-2 Schlucht | Felsgolem | Dash |
| 4 See | 4-1 See, 4-2 Lagune | Igelkönig | Gleiten |
| 5 Gipfel | 5-1 Gipfel, 5-2 Sturmgrat | Sturmgeist | Finale |

- Intern behalten die Welten ihre Nummern (Wald = 1 … Sturmgrat = 8, neu: Blumenwiese = 9, Bachtal = 10,
  Käferkönig = `b4`); die Anzeige-Nummern kommen aus `WNO_TAB`.
- **Käferkönig:** krabbelt heran, stürmt los und liegt nach dem Aufprall an der Wand benommen auf dem Rücken;
  ab dem zweiten Treffer hüpft er und schickt Erdwellen über den Boden. Von oben reicht ein einfacher Sprung.
- Nach dem letzten Treffer fällt statt der Krone die **Fähigkeit** herab; Sam hebt sie auf, der Jubel zeigt
  ihren Namen. Nur der Sturmgeist (Finale) lässt die Krone fallen.
- Ältere Spielstände: Ein Kronentor ist auch offen, wenn man die Fähigkeit seines Bosses schon hat – wer früher
  den Doppelsprung im Wald bekommen hat, muss den Käferkönig nicht nachholen.
- Die Bonuswelten öffnen jetzt bei ◆ 9 / 17 / 25, weil es mit der Wiese früher mehr Diamanten gibt.

## Karte

Die Karte ist eine Insel von oben: Wiese ganz im Westen, daneben der Wald, Felsen im Norden, See mit Lagune im Süden,
Gipfel im Osten. **Punkt antippen:** Sam läuft selbst über den Weg dorthin (nicht durch geschlossene
Kronentore). Nochmal antippen oder **Los ▶** auf der Infokarte betritt die Welt. Am Rechner gehen auch
◀ ▶ und Springen. Die Karte ist näher herangezoomt (`MAP_ZOOM`) und folgt Sam; mit dem Finger
lässt sie sich verschieben, bis Sam wieder losläuft. Welten sind Punkte
(gold = geschafft, rot = offen, grau mit Schloss = gesperrt), Endgegner Burgen (mit Krone, wenn besiegt),
Kronentore Schranken auf dem Weg. Hinter dem ersten geschlossenen Tor liegt Nebel. Unten zeigt eine
Infokarte Name, Diamanten, Sterne und Bestzeit – oder warum der Punkt gesperrt ist. Erster Punkt ist 1-1 Blumenwiese, am Gipfel ein Geheimnis, das nur mit Gleiten zu holen ist.

Intern bleibt `hub` das bisherige Level mit Türen, Toren und Diamant (Sperren in `doorBlock`, Reihenfolge
nach der Lage von links nach rechts); `MAP_POS` legt fest, wo die Punkte auf der Karte liegen. Zurück aus
einer Welt steht Sam auf deren Punkt.

## Bonuswelten und Hinweise zum Wiederspielen

**Bonuswelten** (`bonus1` Moosklippen, `bonus2` Glutschlot, `bonus3` Eisspalte): kurze, knifflige Welten ohne
Punkteziel und Zeitlimit. Auf der Karte als Portale neben der Wespenkönigin, dem Felsgolem und dem Igelkönig,
freigeschaltet durch Diamanten (◆ 9 / 17 / 25). Wer eine zum ersten Mal schafft, bekommt ein **Extraleben**.
Jede ist um eine Fähigkeit herum gebaut (Doppelsprung, Wandsprung, Dash; `BONUS_AB`) – mit `erreichbar.mjs`
geprüft: mit der Fähigkeit schaffbar, ohne nicht. Auch im Editor bearbeitbar.

**Hinweise auf der Karte:** Über der Infokarte steht pro Welt, was noch fehlt und ab welcher Fähigkeit es
erreichbar ist („3 jetzt erreichbar · 1 mit Dash · 1 mit Gleiten“). Gespielte Welten mit jetzt erreichbaren
Sachen funkeln. Nach einer neuen Fähigkeit meldet die Karte einmal, in welchen Welten dadurch etwas neu
erreichbar ist.

Grundlage ist die Tabelle `REACH` in `index.html`. Sie wird nicht von Hand gepflegt, sondern von
`erreichbar.mjs` berechnet: dieselbe Suche wie **Prüfen** im Editor, mit der echten Spielphysik, je Welt
ohne Fähigkeit, dann mit Doppelsprung, + Wandsprung, + Dash, + Gleiten. Nach Level-Änderungen neu rechnen:

```bash
npm run erreichbar            # alle Welten (dauert pro Welt einige Minuten)
node erreichbar.mjs 1 5       # nur einzelne Welten
node erreichbar.mjs --pruefen bonus1   # nur prüfen, ob das Ziel erreichbar ist
```

Sammelstücke, die die Suche mit keiner Fähigkeit erreicht, gelten als „versteckt“. Wird ein Diamant im
Editor verschoben, fehlt er in der Tabelle, bis neu gerechnet wird; die Karte zählt ihn dann als
„jetzt erreichbar“.

## Medaillen

Pro Welt (1-1 bis 5-2) drei Medaillen: **Bronze** fürs Schaffen, **Silber** für alle Diamanten
und Sterne der Welt, **Gold**, wenn die Bestzeit höchstens die Goldzeit ist. Sie stehen auf der Karte unter
jedem Punkt und neben dem Namen auf der Infokarte; der Abschlussbildschirm meldet neue Medaillen. Im Level
zeigt die Uhr darunter, wie viel Zeit bis Gold bleibt.

Goldzeit: im Editor unter den Level-Einstellungen („Goldzeit (s)“), sonst geschätzt aus Länge (≈ 100 px/s),
Höhe (Klettern) und bei 1-1 der gedrosselten Strecke ohne Schuhe – derzeit 60 bis 75 s.

## Bewegte Plattformen und 1-1 ohne Abgründe

- Alle bewegten Plattformen fahren langsamer: eine Runde dauert 1,5-mal so lang wie im Level eingetragen
  (`MOVER_SLOW` in `index.html`). Die „Dauer (s)“ im Editor bleibt der eingetragene Wert.
- 1-1 Blumenwiese hat keine Abgründe mehr: Gräben, Teich und die Senken unter den Bröckelblöcken sind flach
  (1–2 Kacheln tief) – wer hineinfällt, springt wieder heraus.

## Startbild

Beim Laden erscheint knapp 3 Sekunden das Logo **on praehortus studios** (dasselbe wie bei Maxis Bierkiste:
Gartentor mit Keimling, Schrift Barlow Condensed); Antippen überspringt es. Im Editor/Probespiel entfällt es.

## Abschluss-Bildschirm

Nach einer Welt nur das Wesentliche: Name, Punkte (mit Rekord-Hinweis), drei Kacheln für Diamanten, Sterne
und Zeit (blau umrandet, wenn vollständig bzw. neue Bestzeit), die drei Medaillen und ggf. „Neue Medaille“.
Nach einem Boss: Zeit, Zahl der besiegten Endgegner und die neue Fähigkeit.

## Erster Start und schnelle Schuhe

Die frühere Übungswiese ist raus (Level bleibt als „Archiv: Übungswiese“ im Editor). Beim ersten Start geht
es gleich in **1-1 Blumenwiese**; zwei kurze Hinweise mit pulsierenden Hälften zeigen Laufen und Springen
(`startHints`), danach startet das Spiel auf der Weltkarte.

In 1-1 läuft Sam gedrosselt (`SLOW_SHOES`, zwei Drittel des Tempos – Sprungweite dann rund 72 px). Kurz vor
dem Ende liegen die **schnellen Schuhe**; ab da läuft er im vollen Tempo, und sie gehören ihm dauerhaft
(`save.shoes`) – beim Wiederspielen ist 1-1 nicht mehr gedrosselt. Mit der Physik-Suche geprüft: 1-1 ist
auch ganz ohne Schuhe schaffbar. Ältere Spielstände haben die Schuhe schon. Im Editor gibt es dafür das Objekt
„Schnelle Schuhe“ (`{"k":"shoes","c":…,"r":…}`).

## Leben

Jeder Spielstand hat 3 Leben (♥ oben unter der Punkteanzeige, auch auf der Karte). Fällt die Punktzahl in
einer Welt mit Zeitlimit auf 0 – weil die Restzeit abläuft oder Tode Punkte kosten –, ist ein Leben weg und
die Welt beginnt neu (oder zurück zur Karte). Beim letzten Leben gibt es **Game Over**: der Spielstand
beginnt von vorn (Diamanten, Sterne, Fähigkeiten, Bosse, erledigte Welten), nur „Einführung gesehen“ und
die Einstellungen bleiben; danach wieder 3 Leben. Bei den Endgegnern gibt es 300 Punkte fix, jeder Treffer
kostet 100 (rechts oben angezeigt) – bei 0 ist ebenfalls ein Leben weg. Karte und Probespiele
aus dem Editor kosten keine Leben. Extraleben sind für später geplant.

## Sam und Hochformat

- Sam wird 20 % größer gezeichnet (`SAM_SCALE` in `drawPlayer`). Die Trefferzone bleibt gleich, damit alle
  Levels, Sprünge und die Erreichbarkeitstabelle weiter stimmen.
- Im Hochformat (Handy, unter 900 px Breite) bleibt das Spiel als Querformat-Streifen (2:1) sichtbar und ist
  angehalten; darunter steht der Hinweis, das Handy zu drehen. Das Titelbild läuft weiter, HUD und
  Steuerflächen sind ausgeblendet.

## Bildrate

Im Pausenmenü **Bildrate anzeigen** einschalten (bleibt im Browser gespeichert, `supersam-labor-fps`).
Oben links erscheinen die Bilder pro Sekunde (grün ab 55, gelb ab 40, sonst rot), darunter die mittlere
Bildzeit, das längste Bild der letzten halben Sekunde, die Zeit fürs Zeichnen, die Bildgröße in Pixeln und
ob die Lichteffekte laufen.

Daneben im Pausenmenü: **Auflösung** Hoch/Mittel/Niedrig (bis 2 / 1,5 / 1 Bildpunkt je CSS-Pixel,
`supersam-labor-aufloesung`) und **Licht** An/Aus (Lichteffekte über WebGL; dieselbe Einstellung wie im
Debug-Menü). Die Lichteffekte kopieren jedes Bild von der Zeichenfläche auf die Grafikkarte – das ist auf
iPhones der teuerste Schritt.

## Abschlusskacheln (klassisch)

Wo der Boden an Luft grenzt, bekommt jede Kachel einen Abschluss (`drawEdges`, je Welt und in drei
Varianten einmal gezeichnet): Seitenkanten mit Licht links und Schatten rechts, Grasnarbe (Sand, Schnee)
läuft um die obere Ecke und hängt etwas über, Unterkanten bei schwebenden Blöcken mit kleinen Erdzapfen.
Gilt für Boden und Geheimgänge, nicht für Schrägen, Holz und Stege.

## Deko (klassisch)

Zusätzlich zu Bäumen, Tannen, Blumen und Grasbüscheln verteilt `addMoreDecor` beim Laden
jedes Levels weitere Deko aus der Kachelkarte (nur Darstellung, funktioniert auch mit
Editor-Levels, im Editor als Vorschau sichtbar; nicht neben Start, Federn, Fahnen, Türen, Ziel und Fahrplattformen):

- Größere Stücke im Hintergrund: Wiese Apfelbaum, Birke, Heuhaufen, Findling, Zaun ·
  Wald Eiche, Riesenpilz, kahler Baum, Farn · Felsen Felsbrocken, Gerippe, Wagenrad,
  Tonkrüge · See Palme, Sandburg, Sonnenschirm, Boot auf dem Wasser · Gipfel Iglu,
  Schneemann, Eisblöcke, Schlitten.
- Kleine Pixelbilder am Boden (`DK_ART`, je Welt in `DK_SET` gewichtet): Baumstümpfe,
  bemooste Steine, Beerensträucher, Sonnenblumen, Pusteblumen, Pilze, Baumstämme, Farne,
  Kakteen, Schädel, Steinmännchen, Rohrkolben, Seesterne, Krebse, Treibholz, Eiskristalle …
- Unter Überhängen Ranken (mit Blüten), Wurzeln (Felsen) oder Eiszapfen (Gipfel);
  Seerosen auf dem Wasser.
- Einschlüsse im Boden (Kiesel, Wurzeln, Knochen, Fossilien, Muscheln, Risse, Moos, Eis).
- Schmetterlinge auf der Wiese, Glühwürmchen im Wald.

## Grafikstil „Pixel 3D“ (ruht)

Die Grafik ist fest **Klassisch**; im Menü gibt es keine Auswahl mehr, Taste `G` und `?stil=` sind entfernt.
Der Pixel-3D-Code bleibt erhalten (ein Test zeichnet damit weiterhin jede Welt), ist aber nicht erreichbar.

- Figuren, Gelände und Hintergrund entstehen aus kleinen 3D-Körpern (Kugeln, Kapseln,
  Kästen, Höhenfelder). Je Pixel wird die Oberflächennormale beleuchtet (Licht von links
  oben, Schlagschatten, Glanzlichter) und auf handgewählte Farbrampen gelegt. Das Raster
  ist 2 Pixel pro Welteinheit, also doppelt so fein wie klassisch.
- Gelände: jede Kachel wird aus Weltkoordinaten berechnet, es wiederholt sich nichts.
  Abgerundete Kanten mit Volumen, Kiesel, Findlinge, Lehmschichten, Wurzeln, Grasnarbe
  mit Halmen und Überhang, nach innen dunkler.
- Mehr Abwechslung: Büsche, Steine, Pilze, Farne, Gras und Blumen werden auf freien
  Grasflächen verteilt (nur Darstellung, nicht neben Federn, Fahnen und Türen).
- Wiese: neuer Hintergrund in vier Ebenen (Berge mit Schnee, Wald, Hügel mit Bäumen,
  Wiese), Wolken als beleuchtete Körper.
- Vordergrund mit Parallaxe (Wiese): dunkle Halme ziehen schneller als das Spielfeld
  vorbei (1,3-fach), davor schwebt Blütenstaub. Steigt die Kamera, rutscht der
  Vordergrund nach unten weg.

Nur die Darstellung wechselt; Raster, Trefferzonen, Levels und Editor bleiben gleich.
Igel, Skorpion, Frosch, Fisch, Geist, die Bosse, der Titelbildschirm und die Hintergründe
der anderen Welten nutzen noch die klassische Grafik.

## Leveleditor

**https://supersam.jemphub.com/labor/editor/** – für den Desktop (Maus/Trackpad, Tastenkürzel).

- Welt wählen, Kacheln malen (Stift, Rechteck, Radierer, Rechtsklick löscht), Ebenen (Rückwand, Aufwind),
  Objekte und Gegner setzen; mit **Auswahl** Bereiche verschieben, kopieren (⌘C/⌘X/⌘V), Objekte anklicken
  und ihre Eigenschaften ändern (Gegner-Reichweite, Fahrplattform-Weg/Dauer). Spalten und Zeilen einfügen/löschen.
- **Deko** (Abschnitt in der linken Leiste, nach Welten sortiert): Apfelbaum, Palme, Iglu, Sonnenblume,
  Kakteen, Ranken, Seerosen, Schmetterlinge … von Hand setzen wie Objekte (Feld über dem Boden; hängende
  Stücke unter die Decke, Seerosen und Boote ins Wasser). Bei Ranken, Wurzeln und Eiszapfen ist die Länge
  einstellbar. **🌿** (Taste D) blendet die automatisch verteilte Deko ein oder aus (halb durchsichtig,
  damit die von Hand gesetzte heraussticht). In den Level-Einstellungen schaltet **Automatische Deko**
  sie für das Level ganz ab; dann erscheint nur die von Hand gesetzte. Im Level steht Deko als
  `{"k":"deco","n":"apple","c":…,"r":…}` (optional `"len"`), das Abschalten als `"noDeco": true`.
- **Probespielen** (P ab Mauszeiger, ⇧P ab Start) öffnet den Entwurf im echten Spiel, Esc führt zurück.
  Probespiele speichern keinen Spielstand.
- **Prüfen** testet mit der echten Spielphysik und den gewählten Fähigkeiten, ob Ziel, Diamanten und Sterne
  erreichbar sind; Unerreichbares wird rot umkreist. **⌒** zeigt die Sprungbögen am Mauszeiger.
- Entwürfe speichert der Browser automatisch (pro Welt). **Export** sichert das Level als Datei,
  **Import** lädt eine Datei, **Original** verwirft den Entwurf.
- **Ablauf mit Claude:** Im Editor ändern und 💬 Notizen (N) setzen → **⇪ An Claude übergeben** schickt
  Entwurf, Notizen und eine Nachricht in einem Commit nach `notizen/` (`supersam-entwurf-<welt>.json`,
  `supersam-notizen-<welt>.json`) – **nicht live**. Claude baut es in `levels/` ein, löscht den Entwurf,
  setzt `status`/`antwort` der Notizen und merged; danach lädt der Editor die neue Fassung beim Öffnen selbst.
- **Statuszeile** neben der Weltauswahl: 🟡 Entwurf/Notizen nicht übergeben · 🔵 bei Claude (offene Notizen) ·
  🟢 im Labor, aktuell. Hat sich eine Welt im Labor geändert, während ein nicht übergebener Entwurf existiert,
  fragt ein Hinweis: „Labor-Stand laden“ oder „Meinen Entwurf behalten“.
- **⋯ → Direkt ins Labor stellen** legt das Level ohne Claude als `levels/supersam-level-<welt>.json` auf `main`
  (Deploy ca. 2 Minuten). Der GitHub-Schlüssel (fine-grained, nur JempHub, *Contents: Read and write*,
  *Actions: Read-only*) bleibt im Browser. Dort auch: Entwurf verwerfen, Export, Import.
- **📋 Als Text kopieren** liefert die Notizen für den Chat.
- Alternativ: exportierte Datei von Hand in `levels/` legen (siehe dort) – der Build baut sie ein.
- Eine fehlerhafte Level-Datei (kein Start/Ziel, falsche Größe, kaputtes JSON, Welt doppelt) stoppt Build und Deploy.
  Die übrigen Spieltests laufen gegen die Welten aus dem Code, damit geänderte Levels sie nicht brechen.
