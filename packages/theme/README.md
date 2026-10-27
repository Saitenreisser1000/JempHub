# Farbschema (theme)

`theme.css` ist die einzige Stelle für Farben, Schriften, Rundungen und Schatten aller Jemp-Apps.

- Hell („Papier“) ist Standard, dunkel („Abend“) gilt, wenn das Gerät auf Dunkelmodus steht.
- Elemente mit der Klasse `on-stage` (Griffbrett, Zeitleiste, Dirigierbühne) sind immer dunkel.
- `npm run build` bzw. `npm run dev` einer App kopiert die Datei nach `apps/<app>/vendor/theme/`.
  Jede App bindet sie als `vendor/theme/theme.css` vor ihren eigenen Styles ein.

Eine Farbe ändern: hier anpassen, `?v=` im Link der Apps erhöhen, Apps neu hochladen.
