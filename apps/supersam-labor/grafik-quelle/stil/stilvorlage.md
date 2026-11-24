# Supersam – Stilvorlage 1: 3D-Diorama

Stand: 24.11.2026. Referenz: `stilvorlage.png` und gewähltes Diorama-Szenenbild. Erstellt mit dem integrierten Imagegen-Werkzeug. Dieses Dokument legt die Sollwerte fest; die Bildpalette ist eine visuelle Annäherung, keine messtechnische Farbkarte.

## Formen und Darstellung
Freundliche, weich gerenderte Spielzeugwelt mit runden Volumen und dezent abgeschrägten Kanten. Matte bis seidenmatte Materialien, weiche Eigenverschattung, wenige große Details. Keine schwarzen Umrisse, keine Pixelstruktur, keine Fingerabdrücke. Die Stiltafel ist ein deckendes Referenzblatt; ihre Front- und Rückansicht und Materialperspektiven sind keine direkt einzubauenden Sprites.

## Sam – verbindliche Identität
Etwa achtjähriger Junge, freundliche große dunkle Augen, kleine Nase, stachelig gewellte blonde Haarbüschel. Petrolfarbener Hoodie mit Kapuze, heller Reißverschluss und Kordeln, graue kurze Hose, türkise Schuhe mit cremefarbenen Sohlen. Kopf samt Haaren ungefähr 40 % der Figurenhöhe. Gameplay ausschließlich Seitenansicht nach rechts, neutraler Stand mit locker herabhängenden Armen. Front und Rücken der Stiltafel dienen der Konsistenz.

| Bereich | Grundfarbe | Lichtfarbe | Schattenfarbe |
|---|---|---|---|
| Haare | #F4C14F | #FFE39A | #BE7D26 |
| Haut | #F3BD8D | #FFDBB1 | #CD8963 |
| Hoodie | #176A73 | #328D94 | #104750 |
| Shorts | #565360 | #77717C | #383641 |
| Schuhe | #29999D | #63BFC0 | #166A72 |
| Sohlen, Kordeln | #FFF1CD | #FFF8E5 | #D9C394 |

Farben beschreiben die unbeleuchtete Grundpalette; Rendering darf sie durch Licht und Schatten verändern.

## Licht und Materialien
Große weiche Lichtquelle links oben, ungefähr 45 Grad, warm-neutral; sanftes kühles Fülllicht. Licht bleibt für alle Frames gleich. Kontakt- und Faltenschatten nur innerhalb des Objekts; kein mitgelieferter Bodenschatten, keine Bodenplatte und kein Lichtschein außerhalb der Silhouette.

- Gras: kräftig grün, üppige runde Halme und Blattbüschel, klare begehbare Oberkante.
- Erde: warmes Braun, sparsame eingelassene Steinchen, grobe gut lesbare Struktur.
- Holz: honigbraun, abgerundete Brettkanten, wenige breite Maserungen, kleine matte Metallköpfe.
- Stein: helles warmes Grau, weiche Abplatzungen, wenige kräftige dunklere Risse.
- Münzen: warmes Gold, breiter Rand, einfacher erhabener Kern; Diamant: helles Cyan mit wenigen klaren Facetten. Noch nicht als Assets geliefert.

## Weltpaletten
Wiese gilt für die erste Testszene. Weitere Welten sind vorläufige Farbvorschläge für Schritt 2 und noch keine ausgearbeiteten Assetvorgaben.

| Welt | Hauptton | Zweitton | Material/Akzent | Ferne/Himmel |
|---|---|---|---|---|
| Wiese | #73B83F | #C3DD72 | #95603F | #BCE3F1 |
| Wald (Vorschlag) | #285F49 | #619757 | #926440 | #CBDDD1 |
| Felsen (Vorschlag) | #8D9396 | #C5C5B6 | #A07554 | #D5E5EA |
| See (Vorschlag) | #329DAE | #86D3DD | #D5C696 | #D8EFF4 |
| Gipfel (Vorschlag) | #DDEAF1 | #93B4CB | #7D8795 | #F4DCAF |
| Bonus (Vorschlag) | #A88DDE | #E9B5D4 | #F6CD58 | #C8E9F5 |

## Maßstab, Kamera und Übergabe
Orthografisch wirkende Seitenansicht, höchstens minimal von oben. Figuren und spielrelevante Gegenstände scharf und kontrastreich. Ferne heller, weniger gesättigt und detailärmer; Tiefenunschärfe nur in Hintergründen, nicht in Einzelgrafiken.

Sam: PNG RGBA, exakt 512 × 512. Zielhöhe der sichtbaren Silhouette ungefähr 461 Pixel (90 %), Fußlinie y=511, Standpunkt x=256. Seitlich mindestens 21 Pixel frei. Kein transparenter Rand unter den Sohlen. Alpha-Kanten weich geglättet, Hintergrund wirklich transparent. Kopfgröße und Fußlinie aller Folgeframes aus `figur/sam_stehen.png` übernehmen.

Spielmaßstab laut Claude: Sam 19 Einheiten hoch, Bodenkachel 16 × 16, sichtbarer Ausschnitt 138 Einheiten hoch. Die Engine skaliert die Grafik entsprechend; die 512 Pixel sind Lieferauflösung. Für Folgeanimationen den tatsächlich gelieferten Standframe als geometrische Referenz verwenden, nicht die größere Darstellung auf der Stiltafel.

Sammelobjekte 256² mittig; Figuren, Gegner, große Pflanzen 512² unten mittig; Kacheln 256²; Hintergrundebenen 2048 × 1024. Technische Detailregeln stehen unverändert in `../GRAFIK_VORGABEN.md`.
