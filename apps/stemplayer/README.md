# StemPlayer fuer den Unterricht

Dieser Player ist eine statische Web-App. Du kannst ihn lokal testen und spaeter auf OneDrive freigeben.

## Projektstruktur

- index.html
- styles.css
- app.js
- songs.config.json
- generate-playlist.mjs
- playlist.json
- audio/

## Songs hinzufuegen

1. Lege pro Song einen Ordner an, zum Beispiel:

   audio/song-02/

2. Lege dort alle Stem-Dateien ab, zum Beispiel:

   - drums.mp3
   - bass.mp3
   - guitar.mp3
   - vocals.mp3

3. Ergaenze songs.config.json um den Song mit id, title, artist und folder.

4. Generiere die playlist.json automatisch aus den echten Dateien im Ordner:

```bash
cd /Users/stefanleutgeb/Projects/StemPlayer
node generate-playlist.mjs
```

Die Stem-Liste wird dabei aus dem Inhalt des jeweiligen Song-Ordners gebaut.
Es sind z. B. mp3, aif, wav, m4a, aac und ogg erlaubt.
Nicht-MP3-Dateien werden beim Generieren automatisch nach audio/_generated/ als MP3 umgewandelt.

Wichtig: Alle Stems eines Songs muessen gleich lang sein und am gleichen Zeitpunkt starten.

## Lokaler Test

Browsers blockieren oft lokale file:// Zugriffe fuer JSON und Audio. Nutze deshalb einen kleinen HTTP-Server.

Beispiel mit Python 3:

```bash
cd /Users/stefanleutgeb/Projects/StemPlayer
python3 -m http.server 8080
```

Dann im Browser oeffnen:

http://localhost:8080

## Bereitstellung auf OneDrive

1. Lade den kompletten Ordner in OneDrive hoch.
2. Teile den Ordner oder direkten Link auf index.html mit deinen Schuelern.
3. Falls Audio nicht direkt abspielbar ist, pruefe die OneDrive-Freigabe-Einstellungen.

## Hinweise

- Mute schaltet einzelne Stems aus.
- Solo laesst nur den gewaehlten Stem hoerbar.
- Master regelt die Gesamtlautstaerke.
- Sehr grosse Playlists oder viele Stems pro Song koennen Ladezeit erhoehen.

## Backend (ohne Supabase)

Der Player kann mit lokalem JSON laufen, unterstuetzt jetzt aber auch ein eigenes Express-Backend mit Login und Rollen.

- Admin darf Songs und MP3-Stems hochladen.
- Normale Nutzer duerfen alle Songs sehen und abspielen.
- Falls kein gueltiges Login/API verfuegbar ist, faellt das Frontend auf `playlist.json` zurueck.

### Start mit Docker (empfohlen)

Im Projektordner:

```bash
docker compose up --build
```

Services:

- API: `http://localhost:3000`
- Postgres: `localhost:5432`

### Start ohne Docker

1. Postgres bereitstellen.
2. SQL aus `backend/sql/init.sql` ausfuehren.
3. Backend konfigurieren:

```bash
cd /Users/stefanleutgeb/Projects/StemPlayer/backend
cp .env.example .env
npm install
npm run dev
```

### Erstes Admin-Konto anlegen

Nur einmalig (mit dem Wert aus `ADMIN_BOOTSTRAP_TOKEN`):

```bash
curl -X POST http://localhost:3000/api/auth/bootstrap-admin \
   -H "Content-Type: application/json" \
   -d '{"email":"admin@example.com","password":"SicheresPasswort123","token":"change-admin-bootstrap-token"}'
```

Danach ueber Login-Endpoint anmelden:

```bash
curl -X POST http://localhost:3000/api/auth/login \
   -H "Content-Type: application/json" \
   -d '{"email":"admin@example.com","password":"SicheresPasswort123"}'
```

### Wichtige API-Endpunkte

- `POST /api/auth/register` Nutzerkonto erstellen
- `POST /api/auth/login` Token erhalten
- `GET /api/auth/me` Profil pruefen
- `GET /api/songs` Songs fuer eingeloggte Nutzer
- `POST /api/songs` Song anlegen (Admin)
- `POST /api/songs/:songId/stems` MP3-Stems hochladen (Admin)
- `GET /api/media/:stemId` MP3 streamen (eingeloggt)

### Frontend mit Login/Admin-UI

Die Seite enthaelt jetzt zusaetzlich:

- Login-Formular
- Registrierung (lokales Konto)
- Logout
- Admin-Upload-Form (nur sichtbar fuer Rolle `admin`)

Ablauf:

1. Als Admin einloggen.
2. Im Bereich "Admin: Song hochladen" Titel/Artist setzen und MP3-Stems auswaehlen.
3. Upload starten.
4. Die Playlist wird danach automatisch neu geladen.

Hinweis: Ohne gueltigen API-Login laedt der Player weiterhin aus `playlist.json`.

### Microsoft 365 Login spaeter

Das Backend ist so vorbereitet, dass wir als naechsten Schritt OAuth/OpenID Connect mit Microsoft Entra ID ergaenzen koennen.

## Versionierung und Deployment ohne GitHub

Du kannst komplett ohne GitHub sauber versionieren und deployen.

### Prinzip

1. Lokal mit Git arbeiten (Commits + Tags).
2. Pro Version ein Release-Archiv erzeugen.
3. Archiv direkt auf den VPS laden.
4. Release auf dem VPS aktivieren (Symlink `current`).
5. Bei Problemen per Rollback auf alte Version zurueck.

### 1) Release lokal bauen

```bash
cd /Users/stefanleutgeb/Projects/StemPlayer
git tag v0.1.0
./scripts/create-release.sh v0.1.0
```

Archiv liegt dann unter:

- `releases/stemplayer-v0.1.0.tar.gz`

### 2) Archiv auf VPS hochladen

Falls es ein frischer Server ist, zuerst Zielordner anlegen:

```bash
ssh user@dein-vps "mkdir -p /var/www/stemplayer/releases"
```

```bash
scp releases/stemplayer-v0.1.0.tar.gz user@dein-vps:/var/www/stemplayer/releases/
```

### 3) Auf VPS deployen

```bash
ssh user@dein-vps
cd /var/www/stemplayer/current
APP_ROOT=/var/www/stemplayer SERVICE_NAME=stemplayer-api ./scripts/deploy-release.sh v0.1.0
```

Der Deploy-Skript:

1. Entpackt nach `/var/www/stemplayer/releases/v0.1.0`
2. Setzt Symlink `current` auf diese Version
3. Installiert Backend-Dependencies
4. Startet den Service neu

### 4) Rollback

```bash
cd /var/www/stemplayer/current
APP_ROOT=/var/www/stemplayer SERVICE_NAME=stemplayer-api ./scripts/rollback-release.sh v0.0.9
```

### Migrationsablauf

Neue DB-Aenderungen kommen in:

- `backend/sql/migrations/001_initial_schema.sql`
- `backend/sql/migrations/002_*.sql`

Vor einem Deploy:

1. DB-Backup erstellen.
2. Migrationen in Reihenfolge ausfuehren.
3. Erst dann neues Release aktivieren.

## Domain-Umstellung: jemphub + earjemp + stemplayer

Wenn aktuell Redirects unguenstig gesetzt sind, kannst du auf dem VPS temporaer eine Hub-Seite ausliefern und beide Bereiche unter Pfaden auf jemphub.com betreiben.

### Zielbild

1. `jemphub.com/earjemp`: zeigt die temporaere EarJemp-Seite.
2. `jemphub.com/stemplayer`: zeigt die StemPlayer-App.
3. Optional: `earjemp.com` und `stemplayer.jemphub.com` leiten auf diese Pfade um.

### Dateien im Repo

- Hub-Seite: `deploy/hub/index.html`
- Nginx-Config: `deploy/nginx/jemphub-stemplayer.conf`

### DNS (beide Domains)

Setze A/AAAA Records so, dass diese Hostnamen auf deinen VPS zeigen:

1. `jemphub.com`
2. `www.jemphub.com`
3. `earjemp.com`
4. `www.earjemp.com`
5. `stemplayer.jemphub.com` (nur falls Legacy-Weiterleitung gewuenscht)

### VPS-Schritte

1. Hub-Datei deployen:

```bash
mkdir -p /var/www/hub/current /var/www/hub/current/earjemp
cp /var/www/stemplayer/current/deploy/hub/index.html /var/www/hub/current/index.html
cp /var/www/stemplayer/current/deploy/hub/earjemp/index.html /var/www/hub/current/earjemp/index.html
```

2. Nginx-Config aktivieren:

```bash
cp /var/www/stemplayer/current/deploy/nginx/jemphub-stemplayer.conf /etc/nginx/sites-available/jemphub-stemplayer.conf
ln -sfn /etc/nginx/sites-available/jemphub-stemplayer.conf /etc/nginx/sites-enabled/jemphub-stemplayer.conf
nginx -t
systemctl reload nginx
```

3. FRONTEND_ORIGIN fuer API setzen (in backend/.env):

```bash
FRONTEND_ORIGIN=https://jemphub.com
```

4. API-Service neu starten:

```bash
systemctl restart stemplayer-api
systemctl status stemplayer-api --no-pager -l
```

### HTTPS-Zertifikate

Falls noch keine Zertifikate vorhanden sind, mit Certbot fuer alle Hostnamen ausstellen (je nach Setup als nginx-plugin oder certonly). Danach erneut `nginx -t` und `systemctl reload nginx`.
