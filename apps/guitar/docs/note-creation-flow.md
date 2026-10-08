# Note erstellen im Fretboard-Editor (Diagramm)

![Ablaufdiagramm: Note erstellen](./note-creation-flow.svg)

Kurzfassung:

- Click auf `FretPosition` → `toggle`
- `StringTrack` baut den UI-Key `"fret-string"` und emittiert `toggle-note`
- `FretboardEdit.toggleNote` ruft `useNotesStore.addNote(key)` auf
- `useNotesStore.createNoteFromKey` baut das Note-Objekt und pusht in `activeNotes`
- Reaktivität → Dot wird sichtbar
