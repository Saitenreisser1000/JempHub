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

## Dateiarchiv

Fertige Beiträge (PNG, JPG, PDF) lassen sich im Dateiarchiv speichern, anzeigen
und wieder laden. Dafür läuft ein kleines Node-Backend (`server/`, nur
Node-Bordmittel, keine npm-Pakete nötig). Es liefert auch die Oberfläche aus
`dist/` aus.

- API: `GET/POST /api/files`, `GET /api/files/<id>/download`,
  `DELETE /api/files/<id>`, `GET /api/health`
- Ablage lokal (`STORAGE_DIR`) oder SharePoint (siehe `AZURE-DEPLOYMENT.md`,
  `.env.example`)
- **Kein Zugriffsschutz** auf alumni.jemphub.com (bewusste Entscheidung):
  jeder mit dem Link kann archivierte Dateien sehen, laden und löschen.

## Technik

Vue 3, Vite und TypeScript mit eigener `package-lock.json`. In GitHub Actions
wird die App in einen eigenen Ordner außerhalb des Monorepos kopiert, dort mit
`npm ci` installiert und gebaut.

## Entwicklung

```bash
cd apps/alumni
npm install          # Abhängigkeiten (im Wurzelordner des Monorepos)
npm run dev          # Oberfläche http://localhost:5173, Backend 127.0.0.1:3001
npm run build        # Typcheck + dist/
```

## Server (alumni.jemphub.com)

Veröffentlicht wird automatisch bei jedem Merge nach `main` (siehe `DEPLOY.md`
im Wurzelordner). Der Workflow lädt `dist/`, `server/` und die Node-Laufzeit
hoch und führt `deploy/server-install.sh` aus:

1. Sicherung nach `/root/backups/alumni/alumni-<Zeit>.tar.gz` (alte statische
   Version `/var/www/alumni`, bisherige Releases, Archivdateien, nginx- und
   Dienst-Konfiguration; 15 Sicherungen werden behalten)
2. Neue Version unter `/opt/alumni-editor/releases/…`, aktiv über den Symlink
   `/opt/alumni-editor/current`
3. systemd-Dienst `alumni-editor` (Benutzer `www-data`, nur `127.0.0.1:3110`)
4. Lokaler Test (`/api/health` und Startseite); schlägt er fehl, bleibt die
   vorherige Version aktiv
5. Erst dann nginx: `alumni.jemphub.com` → `127.0.0.1:3110` (Zertifikat von
   certbot bleibt), bei fehlerhafter Konfiguration automatischer Rückfall

Archivdateien liegen in `/var/lib/alumni-editor/exports` und werden von
Deploys nie überschrieben.

Nützlich auf dem Server:

```sh
systemctl status alumni-editor
journalctl -u alumni-editor -n 50
ls -lh /root/backups/alumni/
```
