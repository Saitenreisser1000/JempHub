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
- Vordergrund mit Parallaxe (Wiese): eine Halm-Ebene und eine nahe Ebene mit großen
  Gras- und Farnbüscheln, breiten Blättern und überhängenden Zweigen ziehen schneller
  als das Spielfeld vorbei (1,3- und 1,75-fach), dazwischen schwebt Blütenstaub. Steigt
  die Kamera, rutscht der Vordergrund nach unten weg. Rund um Sam wird die nahe Ebene
  durchsichtig, damit er nie verdeckt ist.

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
