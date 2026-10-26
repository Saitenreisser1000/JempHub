# @jemphub/sounds

Gemeinsame Klänge der Jemp-Apps.

| Datei | Inhalt |
| --- | --- |
| `piano/piano.mp3`, `piano/piano.json` | Klavier: 54 Töne als Sprite (je 1,6 s), aus EarJemp übernommen. Lückenlos von C1 bis Cis5, dazu A5–H5; D5–Gis5 werden aus Nachbartönen erzeugt |
| `vpo/` | Gehaltene Orchesterklänge (Streicher, Holzbläser, Blechbläser, Fis2–C5) aus Virtual Playing Orchestra, mit `manifest.json`; aus EarJemp übernommen, erzeugt mit `scripts/prepare-vpo.mjs` |
| `src/player.js` | Web-Audio-Player: Klavier, Gitarre (Karplus–Strong-Synthese), Orchester, Metronom-Klick; Verstimmung in Cent |

Fehlende Töne werden aus dem nächstgelegenen Sample per Tonhöhenverschiebung erzeugt.

## Verwendung in einer App

`node scripts/sync-shared.mjs <app>` kopiert das Paket nach `apps/<app>/vendor/sounds/`
(nicht im Git). Die Dev- und Build-Befehle der Apps rufen das automatisch auf.

```js
import { createPlayer } from '../vendor/sounds/src/player.js'
const player = createPlayer()
player.ensure()                 // nach einer Nutzeraktion
await player.loadPiano()
player.note(60, player.now(), 1.2, { instrument: 'piano' })
await player.loadSustain('strings')   // oder 'woodwinds', 'brass'
player.note(67, player.now(), 1.6, { instrument: 'strings', cents: -15 })
```

## Lizenzen

Noch zu klären: Herkunft und Lizenz des Klavier-Samples sowie die Lizenzbedingungen
der Virtual-Playing-Orchestra-Samples (Quelle: https://virtualplaying.com/virtual-playing-orchestra/).
Bis dahin keine Weitergabe außerhalb der Jemp-Apps.
