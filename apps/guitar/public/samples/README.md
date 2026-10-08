# Samples

Lege hier Sample-Packs für Audio-Presets ab.

Ordnerstruktur (Beispiel):

- `public/samples/guitar-steel-finger/manifest.json`
- `public/samples/guitar-steel-finger/E2.wav`
- `public/samples/guitar-steel-finger/A2.wav`

`manifest.json` Format:

```json
{
  "name": "Steel String Guitar (Fingerstyle)",
  "samples": [
    { "midi": 40, "url": "/samples/guitar-steel-finger/E2.wav" },
    { "midi": 45, "url": "/samples/guitar-steel-finger/A2.wav" }
  ]
}
```

Die Engine wählt automatisch das nächstgelegene Sample und pitcht über `playbackRate`.
Für maximale Browser-Kompatibilität sind `wav` und `mp3` empfohlen (FLAC ist je nach Browser unsicher).
Wenn Manifest/Samples fehlen, fällt das System automatisch auf den Synth-Fallback zurück.
