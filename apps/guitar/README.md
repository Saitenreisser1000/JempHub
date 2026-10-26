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
| `src/core/sanitize.js` | Prüft Übungsdaten aus Cloud und Browser-Speicher |
| `src/core/library.js` | Bibliothek: Beispiele, eigene und geteilte Übungen, Abgleich mit der Cloud |
| `src/cloud.js` | Supabase: Login, Speichern, Teilen |
| `src/audio/synth.js` | Gezupfter Saitenklang (Karplus–Strong) und Metronom |
| `src/app.js` | Griffbrett, Zeitleiste, Editor, Wiedergabe, Practice-Modus |
| `src/styles.css` | Oberfläche |

## Speicherung und Konten

Ohne Anmeldung werden Übungen im Browser gespeichert. Mit einer `config.js`
neben `index.html` verbindet sich die App mit Supabase: Konten, Speicherung im
Konto, Teilen per E-Mail-Adresse (geteilte Übungen sind schreibgeschützt und
lassen sich in die eigene Bibliothek kopieren). Beim ersten Anmelden werden
lokal erstellte Übungen ins Konto übernommen.

Einrichtung: [`supabase/EINRICHTUNG.md`](supabase/EINRICHTUNG.md).
Die Supabase-Bibliothek wird zur Laufzeit von jsDelivr geladen (fest auf
Version 2.49.4).

Die frühere Vue/Vuetify-Version bleibt in der Git-Historie erhalten (letzter Stand: Commit `a574cd7`).
