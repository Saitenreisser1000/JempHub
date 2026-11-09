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

## Hubwelt als Landkarte

Die Hubwelt ist eine Inselkarte von oben: Wald im Westen, Felsen im Norden, See mit Lagune im Süden,
Gipfel im Osten. **Punkt antippen:** Sam läuft selbst über den Weg dorthin (nicht durch geschlossene
Kronentore). Nochmal antippen oder **Los ▶** auf der Infokarte betritt die Welt. Am Rechner gehen auch
◀ ▶ und Springen. Die Karte ist näher herangezoomt (`MAP_ZOOM`) und folgt Sam; mit dem Finger
lässt sie sich verschieben, bis Sam wieder losläuft. Welten sind Punkte
(gold = geschafft, rot = offen, grau mit Schloss = gesperrt), Endgegner Burgen (mit Krone, wenn besiegt),
Kronentore Schranken auf dem Weg. Hinter dem ersten geschlossenen Tor liegt Nebel. Unten zeigt eine
Infokarte Name, Diamanten, Sterne und Bestzeit – oder warum der Punkt gesperrt ist. Ganz links liegt die
Übungswiese, am Gipfel ein Geheimnis, das nur mit Gleiten zu holen ist.

Intern bleibt `hub` das bisherige Level mit Türen, Toren und Diamant (Sperren in `doorBlock`, Reihenfolge
nach der Lage von links nach rechts); `MAP_POS` legt fest, wo die Punkte auf der Karte liegen. Zurück aus
einer Welt steht Sam auf deren Punkt.

## Bonuswelten und Hinweise zum Wiederspielen

**Bonuswelten** (`bonus1` Moosklippen, `bonus2` Glutschlot, `bonus3` Eisspalte): kurze, knifflige Welten ohne
Punkteziel und Zeitlimit. Auf der Karte als Portale neben der Wespenkönigin, dem Felsgolem und dem Igelkönig,
freigeschaltet durch Diamanten (◆ 6 / 14 / 22). Wer eine zum ersten Mal schafft, bekommt ein **Extraleben**.
Jede braucht die jüngste Fähigkeit an dieser Stelle (Doppelsprung, Wandsprung, Dash) – mit `erreichbar.mjs`
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

## Übungswiese: erste Welt, schnelle Schuhe

Die Übungswiese ist die erste Welt: erster Punkt auf der Karte, 1-1 öffnet erst, wenn sie geschafft ist
(oder die Einführung übersprungen wurde). Am Anfang läuft Sam gedrosselt (`SLOW_SHOES`, zwei Drittel des
Tempos – Sprungweite dann rund 72 px, die Gräben sind 48 px). Am Anfang des letzten Drittels liegen die
**schnellen Schuhe**; danach läuft er im vollen Tempo. Im Editor gibt es dafür das Objekt
„Schnelle Schuhe“ (`{"k":"shoes","c":…,"r":…}`) – solange ein Level Schuhe enthält, ist es bis zum
Aufsammeln gedrosselt.

## Leben

Jeder Spielstand hat 3 Leben (♥ oben unter der Punkteanzeige, auch in der Hubwelt). Fällt die Punktzahl in
einer Welt mit Zeitlimit auf 0 – weil die Restzeit abläuft oder Tode Punkte kosten –, ist ein Leben weg und
die Welt beginnt neu (oder zurück zur Hubwelt). Beim letzten Leben gibt es **Game Over**: der Spielstand
beginnt von vorn (Diamanten, Sterne, Fähigkeiten, Bosse, erledigte Welten), nur „Einführung gesehen“ und
die Einstellungen bleiben; danach wieder 3 Leben. Bei den Endgegnern gibt es 300 Punkte fix, jeder Treffer
kostet 100 (rechts oben angezeigt) – bei 0 ist ebenfalls ein Leben weg. Hubwelt, Übungswiese und Probespiele
aus dem Editor kosten keine Leben. Extraleben sind für später geplant.

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

## Grafikstil „Pixel 3D“

Wahlweise statt Klassisch (Standard). Auf dem Startbildschirm und im Pausenmenü unter
**Grafik** umschaltbar (am Rechner auch Taste `G`, als Link `?stil=pixel3d`). Die Wahl
bleibt im Browser gespeichert (`supersam-labor-stil`). Die zusätzliche klassische Deko
erscheint dort nicht.

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
