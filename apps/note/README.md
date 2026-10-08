# NoteJemp – Noten üben

Mobile-first Vue-3-Webapp (Vite) zum Üben von Noten und Notenwerten. Notation wird als SVG mit der Schrift Bravura (SIL OFL) gerendert, Fortschritt liegt im `localStorage`.

Übungen: Noten bestimmen (Violin-/Bassschlüssel, Hilfslinien, Vorzeichen), Notenwerte & Pausen (auch punktiert), Takte vervollständigen (2/4, 3/4, 4/4, 6/8, 3/8).

```
npm install
npm run dev      # Entwicklung (im LAN erreichbar)
npm run build    # statisches Build nach dist/
```

## Ähnliche Open-Source-Projekte
- [BHSPitMonkey/Prelude](https://github.com/BHSPitMonkey/Prelude) – Web-App (TypeScript, PWA) für Blattspiel/Noten lesen
- [SeeLook/nootka](https://github.com/SeeLook/nootka) – Desktop/Mobile-App (C++) zum Üben von Noten und Gehörbildung
- [macdonaldr93/ledger-app](https://github.com/macdonaldr93/ledger-app) – Sight-Reading-Karteikarten (TypeScript)
- [lipd/muse-training](https://github.com/lipd/muse-training) – Notenlesen & Gehörbildung (TypeScript, Web MIDI)
- [wojciechmalota/hackthepiano](https://github.com/wojciechmalota/hackthepiano) – Noten schnell lesen lernen (JavaScript, MIDI)

Keines davon deckt Notenwerte/Pausen und das Vervollständigen von Takten ab, daher die Eigenentwicklung.
