# NoteJemp – Noten üben

Webapp zum Üben von Noten, Notenwerten und Takten, im Erscheinungsbild von
GuitarJemp. Notation wird als SVG mit der Schrift Bravura (SIL OFL) gezeichnet.
Fortschritt und Einstellungen liegen im `localStorage` des Browsers.

## Übungen

- **Noten bestimmen:** Violin- und Bassschlüssel, Hilfslinien, Vorzeichen,
  Oktavlage in deutscher Schreibweise (c, c1, c2 …, standardmäßig an). Optional zeigt
  ein Griffbrett nach der Antwort, wo die Note auf der Gitarre bzw. dem E-Bass liegt.
- **Notenwerte & Pausen:** Ganze bis Sechzehntel, auch punktiert.
- **Takte vervollständigen:** 2/4, 3/4, 4/4, 6/8, 3/8 oder gemischt.

Für alle Übungen: Schwächen gezielt üben (oft falsch Beantwortetes kommt öfter
dran), Ton nach der Antwort (Note bzw. ganzer Takt), Rundenlänge 10/20/30,
„Automatisch weiter“, Tastatursteuerung, Ergebnis mit den Fehlern der Runde und
eine Fortschrittsansicht mit Notenkarte.

## Befehle

```sh
npm run dev --workspace notejemp      # http://127.0.0.1:5182
npm run build --workspace notejemp    # Tests + statischer Build nach apps/note/dist
npm run test --workspace notejemp
```

Keine Paketabhängigkeiten: reines JavaScript (ES-Module). Veröffentlichen mit
`deploy/publish.sh` (unverändert, lädt `dist/` nach `/var/www/notejemp`).

## Aufbau

| Datei | Inhalt |
| --- | --- |
| `src/music.js` | Notennamen, Schlüssel, Tonhöhen, Notenwerte, Griffbrett-Lagen |
| `src/quiz.js` | Aufgaben der drei Übungen, gewichtet nach Schwächen |
| `src/stats.js` | Statistik und Einstellungen (kompatibel mit NoteJemp 1) |
| `src/staff.js` | Notensystem als SVG |
| `src/fretboard.js` | Kleines Griffbrett für die Lage einer Note |
| `src/audio.js` | Klang (aus GuitarJemp übernommen) |
| `src/app.js` | Oberfläche |
