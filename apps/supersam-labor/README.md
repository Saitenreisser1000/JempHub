# Supersam Labor

Experimentier-Version von Supersam unter **https://supersam.jemphub.com/labor/**.
Hier wird ausprobiert; die Demo unter `apps/supersam` bleibt unverändert, bis
ein Stand aus dem Labor bewusst übernommen wird.

- Gleiche Technik wie `apps/supersam` (eine Datei `index.html`, Tests in `src/`).
- Eigene Speicherschlüssel (`supersam-labor-…`): Spielstand, Debug-Werte und
  Lautstärke sind von der Demo getrennt.
- Veröffentlicht wird automatisch bei jedem Merge nach `main` nach
  `/var/www/supersam/labor` (der Unterordner der Demo; deren Upload lässt ihn stehen).
  Auf dem Server ist nichts einzurichten – die nginx-Konfiguration der Demo liefert
  den Unterordner mit aus.

```bash
npm run dev      # http://localhost:5186
npm test
npm run build    # dist/
```
