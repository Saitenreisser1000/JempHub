# Supersam – technische Grafikvorgaben (von Claude, für ChatGPT)

Diese Datei legt fest, was ein Bild erfüllen muss, damit Claude es **ohne Nacharbeit** ins Spiel einbauen
kann. Den **künstlerischen** Stil (Farben, Licht, Materialien) legt ChatGPT in einer eigenen Stil-Vorlage
fest – auf Basis des gewählten **Stils 1: 3D-Diorama**.

## Wie das Spiel Bilder zeigt
- Das Spiel rechnet in **Welteinheiten**: eine Bodenkachel = **16 × 16 Einheiten**. Der sichtbare Ausschnitt
  ist **138 Einheiten hoch** (gut 8½ Kacheln) und auf dem Handy quer rund 300–390 px hoch.
- Bilder werden **verkleinert** gezeichnet (weich geglättet). Darum: lieber zu groß als zu klein liefern,
  aber genau im vorgegebenen Format.
- Größen auf dem Bildschirm (ungefähr):

| Objekt | Größe im Spiel (Einheiten) | auf dem Handy | Liefergröße |
|---|---|---|---|
| Sam | 19 hoch (Trefferzone 10 × 14) | ≈ 55 px | **512 × 512** |
| Käfer, Igel, Frosch … | ca. 18–24 breit | ≈ 50–70 px | **512 × 512** |
| Münze, Diamant, Stern | 10–12 | ≈ 30 px | **256 × 256** |
| Feder, Schuhe, Fähigkeiten | 16 | ≈ 45 px | **256 × 256** |
| Bodenkachel | 16 × 16 | ≈ 45 px | **256 × 256** |
| Brett, Steg, Bröckelblock | 16 × 16 (Steg 16 × 6) | ≈ 45 px | **256 × 256** |
| Baum, Busch, große Deko | 20–42 hoch | 60–120 px | **512 × 512** |
| Hintergrund-Ebene | ganze Breite, kachelt seitlich | Bildschirmhöhe | **2048 × 1024** |

## Regeln für jedes Bild
1. **PNG mit echtem Alphakanal** (durchsichtiger Hintergrund). Ausnahmen: Bodenkacheln `*_innen`,
   `*_oben` und die hinterste Hintergrund-Ebene sind ganz gefüllt.
2. **Seitenansicht** (klassisches Jump'n'Run), höchstens leicht von oben. Keine Draufsicht, keine Isometrie.
3. **Blickrichtung:** Sam nach **rechts**, Gegner nach **links** (das Spiel spiegelt selbst).
4. **Anker:** Figuren, Gegner, Pflanzen und Deko stehen mit dem **Fußpunkt genau auf der unteren
   Bildkante, waagrecht mittig**. Sammelobjekte sind **mittig** im Bild.
5. **Rand:** Figur füllt das Bild in der Höhe zu ca. **90 %**; seitlich mindestens 4 % frei.
6. **Gleicher Maßstab** innerhalb einer Figur: alle Bilder von Sam (stehen, laufen, springen …) haben
   denselben Kopf und dieselbe Fußlinie. Am besten jedes neue Bild aus dem ersten ableiten.
7. **Kacheln** müssen nahtlos sein: `*_oben` links/rechts, `*_innen` in alle Richtungen.
   Kanten (`*_kante_links/rechts`) schließen einen Block ab; die offene Seite ist durchsichtig.
8. **Keine Schatten auf dem Boden** außerhalb des Objekts (den setzt das Spiel selbst), kein Glühen
   über den Bildrand hinaus.
9. **Lesbarkeit:** Spielfläche kräftig und kontrastreich, Hintergrund-Ebenen heller und dunstiger.
10. Keine Schrift, kein Wasserzeichen. **Dateinamen genau wie in `AUFGABEN.md`.**

## Übergabe
Fertige Bilder als ZIP (Ordner wie in `AUFGABEN.md`) an Stefan, der sie Claude gibt. Claude prüft
automatisch Format, Transparenz, Anker und Größe, baut sie ins Labor ein (supersam.jemphub.com/labor/)
und trägt den Stand in `AUFGABEN.md` ein. Was nicht passt, steht dort mit Grund.
