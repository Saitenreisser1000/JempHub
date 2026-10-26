# GuitarJemp

Gitarren-Lernumgebung, deren Sprache das Griffbrett ist. Übungen bestehen aus
**Moments** (ein musikalisches Ereignis in der Zeit) mit **Dots** (Saite + Bund).
Ein Moment ohne Dot ist eine Pause, mit mehreren Dots ein Akkord bzw. eine
Tongruppe.

## Befehle

```sh
npm run dev --workspace guitarjemp      # http://127.0.0.1:5180
npm run build --workspace guitarjemp    # Ausgabe in apps/guitar/dist
npm run test --workspace guitarjemp
```

Keine Framework-Abhängigkeit: reines JavaScript (ES-Module) mit Vite als
Build-Werkzeug. Schriften kommen von Google Fonts.

## Aufbau

| Datei | Inhalt |
| --- | --- |
| `src/core/constants.js` | Zeitraster (24 Ticks pro Viertel), Farben, Stimmungen |
| `src/core/model.js` | Dot/Moment, Onsets, Notenwerte, Takt-/Schlagangaben, Sequenzhilfen |
| `src/core/music.js` | Notennamen, Akkord- und Intervallerkennung |
| `src/core/exercises.js` | Beispielübungen |
| `src/audio/synth.js` | Gezupfter Saitenklang (Karplus–Strong) und Metronom |
| `src/app.js` | Griffbrett, Zeitleiste, Editor, Wiedergabe, Practice-Modus |
| `src/styles.css` | Oberfläche |

Übungen werden derzeit im Browser (`localStorage`) gespeichert. Die Anbindung an
Supabase folgt in einem eigenen Schritt.

Die frühere Vue/Vuetify-Version ist im Git-Tag `guitarjemp-legacy` erhalten.
