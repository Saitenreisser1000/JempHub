# Editor-Levels

Hier liegen Level-Dateien aus dem Leveleditor (`supersam-level-<welt>.json`).
Jede Datei ersetzt beim Bauen den Code-Aufbau der gleichnamigen Welt im Labor.

- Meist legt der Editor sie selbst hier ab (**⇪ Veröffentlichen**, Commit auf `main`).
- Von Hand: Datei im Editor mit **Export** sichern und hier ablegen (`id` in der Datei zählt, jede Welt nur einmal).
- `npm run build` baut sie ein und die Tests spielen sie an.
- Datei löschen = Welt kehrt zum Code-Aufbau zurück.
