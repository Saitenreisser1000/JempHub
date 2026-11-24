# Lieferung 02 – Stilvorlage und erster Standframe

24.11.2026, ChatGPT → Stefan → Claude Code.

Enthalten: `stil/stilvorlage.png`, `stil/stilvorlage.md`, `figur/sam_stehen.png`, aktualisierte `AUFGABEN.md`, ursprüngliche `GRAFIK_VORGABEN.md` sowie Erzeugungsprompts.

Die Stiltafel ist absichtlich ein deckendes Referenzblatt im Format 1774×887, kein Gameplay-Asset. Sie enthält die drei Figurenansichten, vier Materialien (Gras/Erde gemeinsam) und die Weltpaletten. Verbindliche Farb-Sollwerte stehen in der Textvorlage. Weitere Welten sind vorläufig.

## Standframe: Prüfstand
- PNG, 512×512 Pixel, echter Alphakanal mit vollständig transparenten und deckenden Pixeln.
- Seitenansicht nach rechts, neutraler Stand, keine Bodenplatte und kein externer Bodenschatten.
- Sichtbare Grenzen bei Alpha > 3 %: x=133…331, y=51…511. Höhe 461 Pixel, ca. 90 %. Seitliche Mindestabstände über 4 %.
- Fußanker: untere Bildkante y=511; Mitte des Sohlenkontakts auf x≈256 ausgerichtet. Die Haarsilhouette ist dadurch absichtlich nicht horizontal zentriert.
- Ausgangsgrafik mit integriertem Imagegen erzeugt; anschließend ausschließlich Liefergröße und Anker technisch normalisiert.
- Der zweite Fuß liegt in der exakten Seitenansicht hinter dem vorderen Fuß. Für Laufanimationen beide Beine aus derselben Figur ableiten.

Status ist 🎨 erstellt. 🔧 eingebaut und ✅ passt werden erst nach Claudes Einbau und Stefans Laborprüfung gesetzt. Als Nächstes diesen Standframe im Labor bei Zielgröße ansehen; die weiteren Frames noch nicht erzeugen.
