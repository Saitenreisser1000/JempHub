# Alumni Editor

Editor für Social-Media-Beiträge über Alumni des Sternstein Gymnasiums. Name,
Matura-Jahrgang, Beruf, Werdegang, Zitat und Porträt eingeben, Format wählen
und den fertigen Beitrag exportieren.

- Formate: Hochformat (1080 × 1350), Quadrat (1080 × 1080), Story (1080 × 1920)
- Bis zu 5 Seiten mit eigenen Textblöcken (Hochformat und Quadrat)
- Story: Schalter „Verdeckte Bereiche“ zeigt, was Instagram/TikTok mit
  Profilzeile und Antwortfeld überdecken (nur Vorschau, nicht im Export)
- Export als PNG, JPEG, mehrseitiges PDF oder JSON; Import mehrerer Alumni aus
  Excel, CSV oder JSON; Entwurf im Browser speichern

## Technik

Vue 3, Vite und TypeScript. Anders als die übrigen Apps hat der Alumni Editor
eigene npm-Abhängigkeiten (`vue`, `html-to-image`, `jspdf`, `xlsx`) mit eigener
`package-lock.json`. In GitHub Actions wird die App deshalb in einen eigenen
Ordner außerhalb des Monorepos kopiert, dort mit `npm ci` installiert und
gebaut.

## Entwicklung und Veröffentlichung

```bash
npm install          # im Wurzelordner: installiert auch die Abhängigkeiten des Alumni Editors
cd apps/alumni
npm run dev          # http://localhost:5173
npm run build        # Typcheck + dist/
```

Veröffentlicht wird automatisch bei jedem Merge nach `main` (siehe `DEPLOY.md`
im Wurzelordner) nach `/var/www/alumni`.

Einmalig auf dem Server:

1. DNS-Eintrag `alumni` (Typ A) → `187.124.190.130`
2. `deploy/nginx/alumni.conf` nach `/etc/nginx/sites-available/` kopieren und verlinken:
   `ln -s /etc/nginx/sites-available/alumni.conf /etc/nginx/sites-enabled/`
3. `nginx -t && systemctl reload nginx`
4. `certbot --nginx -d alumni.jemphub.com`
