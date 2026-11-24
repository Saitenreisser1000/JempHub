# Supersam – Grafik-Aufgaben und Status

Ablauf: **ChatGPT** erstellt → **Stefan** übergibt → **Claude** baut ein → **Stefan** prüft im Labor.
Status: ⬜ offen · 🎨 erstellt · 🔧 eingebaut · ✅ passt · ↩️ neu machen (Grund in „Hinweis“)

## Schritt 0 – Stil-Vorlage (ChatGPT)
| Datei | Inhalt | Status | Hinweis |
|---|---|---|---|
| `stil/stilvorlage.png` | Übersichtsblatt Stil 1 „3D-Diorama“: Farbpalette je Welt, Materialien (Gras, Erde, Holz, Stein), Lichtrichtung, Sam in 3 Ansichten | 🎨 | 24.11.2026 erstellt; weitere Weltpaletten vorläufig |
| `stil/stilvorlage.md` | dieselben Festlegungen als Text (Farbwerte, Licht, Maßstab) | 🎨 | 24.11.2026 erstellt; weitere Weltpaletten vorläufig |

## Schritt 1 – Testszene 1-1 Blumenwiese
| Datei | Inhalt | Größe | Status | Hinweis |
|---|---|---|---|---|
| `figur/sam_stehen.png` | Sam steht, Blick rechts | 512² | 🔧 | 24.11.2026: RGBA 512×512; sichtbare Höhe 461 px; Fußlinie y=511, Sohlenmitte x≈256; kein Bodenschatten. 🔧 24.11.: als `grafik/sam_stehen.webp` eingebaut, 19 Einheiten hoch (≈55 px am Handy). Wird vorerst auch fürs Laufen (Wippen) und Springen (Neigen) verwendet, bis die eigenen Bilder da sind. Bitte Stefan im Labor prüfen |
| `figur/sam_laufen_1.png` | Laufen, linkes Bein vorne | 512² | ⬜ | |
| `figur/sam_laufen_2.png` | Laufen, Beine beisammen | 512² | ⬜ | |
| `figur/sam_laufen_3.png` | Laufen, rechtes Bein vorne | 512² | ⬜ | |
| `figur/sam_springen.png` | Sprung, Knie angezogen | 512² | ⬜ | |
| `gegner/kaefer_1.png` | Käfer, Blick links, Beine Stellung 1 | 512² | ⬜ | |
| `gegner/kaefer_2.png` | Käfer, Beine Stellung 2 | 512² | ⬜ | |
| `gegner/wespe_1.png` | Wespe, Blick links, Flügel oben | 512² | ⬜ | |
| `gegner/wespe_2.png` | Wespe, Flügel unten | 512² | ⬜ | |
| `objekte/muenze.png` | goldene Münze, von vorne | 256² | ⬜ | |
| `objekte/diamant.png` | hellblauer Kristall | 256² | ⬜ | |
| `objekte/stern.png` | goldener Stern | 256² | ⬜ | |
| `objekte/feder.png` | Sprungfeder mit rotem Deckel | 256² | ⬜ | |
| `objekte/schuhe.png` | schnelle Schuhe mit kleinen Flügeln | 256² | ⬜ | |
| `boden/wiese_oben.png` | Erde mit Grasdecke, links/rechts nahtlos | 256² | ⬜ | gefüllt |
| `boden/wiese_innen.png` | Erde, rundum nahtlos | 256² | ⬜ | gefüllt |
| `boden/wiese_kante_links.png` | linkes Blockende mit runder Grasecke | 256² | ⬜ | |
| `boden/wiese_kante_rechts.png` | rechtes Blockende | 256² | ⬜ | |
| `boden/brett.png` | Holzbrett, links/rechts kachelbar | 256² | ⬜ | |
| `boden/broeckelblock.png` | heller, rissiger Steinblock | 256² | ⬜ | |
| `deko/baum.png` | runder Laubbaum | 512² | ⬜ | |
| `deko/busch.png` | Blumenbusch | 512² | ⬜ | |
| `deko/blumen.png` | Gruppe Wiesenblumen | 256² | ⬜ | |
| `hintergrund/wiese_fern.png` | Himmel, Wolken, Berge (ganz gefüllt) | 2048×1024 | ⬜ | seitlich nahtlos |
| `hintergrund/wiese_mitte.png` | sanfte Hügel mit Nadelwald, oben durchsichtig | 2048×1024 | ⬜ | seitlich nahtlos |
| `hintergrund/wiese_nah.png` | Büsche/Bäume nah hinter der Spielfläche, oben durchsichtig | 2048×1024 | ⬜ | seitlich nahtlos |

## Schritt 2 – weitere Welten (kommt nach der Testszene)
Wald, Felsen, See, Gipfel, Bonuswelten, alle Gegner, Bosse, Karte – Liste folgt, wenn Schritt 1 passt.

## Protokoll
| Datum | Wer | Was |
|---|---|---|
| 24.11.2026 | Claude | Vorgaben und Aufgabenliste angelegt; Stil 1 „3D-Diorama“ gewählt |
| 24.11.2026 | ChatGPT | Schritt 0 geliefert: Stiltafel mit drei Sam-Ansichten, Materialien, Licht und Weltpaletten sowie schriftliche Sollwerte; spätere Welten als Vorschläge markiert |
| 24.11.2026 | ChatGPT | Standframe aus Stiltafel abgeleitet; auf 512×512 formatiert und am Fuß zentriert. Transparenz und sichtbare Grenzen geprüft. Keine weiteren Spielgrafiken erstellt; Freigabe im Labor ausstehend |
| 24.11.2026 | Claude | `sam_stehen` geprüft (Format, Alpha, Anker passen) und ins Labor eingebaut; Bild-Lader mit Rückfall auf Pixel-Grafik. Nächste Bilder (`sam_laufen_1–3`, `sam_springen`) werden automatisch erkannt, sobald sie da sind |
