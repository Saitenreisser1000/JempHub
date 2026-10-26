# EarJemp

Gehörbildung im Jemp-Design: Intervalle und Akkorde hören, wahlweise mit Klavier- oder Gitarrenklang, auf Deutsch oder Englisch. Statische Web-App ohne Abhängigkeiten.

## Übungen

- **Intervalle**: kleine Sekunde bis große None, aufwärts, abwärts oder gleichzeitig; Stufen 1–4 oder eigene Auswahl.
- **Akkorde**: Dur/Moll bis Septakkorde, zusammen, gebrochen oder beides.
- Nach der Antwort: Notenbild, Tonnamen, Vergleichen (richtig ↔ gewählt) und optional die Lage auf der Gitarre mit Stufen.
- Schwächen gezielt üben: oft Verwechseltes kommt öfter dran. Der Fortschritt zeigt Trefferquoten und häufige Verwechslungen.
- Tastatur: Leertaste (nochmal hören), 1–9/0 (Antwort), C (vergleichen), Enter (weiter), Esc (Übersicht).

- **Umkehrungen**: Dur, Moll und Dominantseptakkord in allen Lagen (Sext-, Quartsext-, Quintsextakkord …).
- **Tonleitern**: Dur, Moll, harmonisch/melodisch Moll, Kirchentonarten, Pentatonik; aufwärts, abwärts oder auf und ab, drei Tempi.

Geplant: Intonation (Samples in `public/audio/vpo`), Melodiediktat.

## Klänge

Die Klänge kommen aus dem gemeinsamen Paket [`packages/sounds`](../../packages/sounds). `npm run dev` und `npm run build` kopieren es nach `vendor/sounds` (nicht im Git).

## Entwicklung

```bash
npm run dev      # http://localhost:5181
npm test
npm run build    # Ergebnis in dist/
```

Fortschritt und Einstellungen liegen im Browser (`localStorage`, Präfix `earjemp:`).
