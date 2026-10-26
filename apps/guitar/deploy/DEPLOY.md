# GuitarJemp auf dem VPS veröffentlichen

GuitarJemp ist eine statische App: Nginx liefert nur Dateien aus, es läuft kein
eigener Server-Prozess. Ziel ist `https://guitarjemp.jemphub.com`, die Adresse,
auf die der JempHub-Startseitenlink bereits zeigt.

Die Schritte 1–3 sind einmalig. Für spätere Updates reicht Schritt 4.

## 1. DNS-Eintrag

Beim Domain-Anbieter einen Eintrag anlegen (falls noch nicht vorhanden):

- `guitarjemp` → `A` → IP-Adresse des VPS

Prüfen, ob er greift (kann einige Minuten dauern):

```sh
ping guitarjemp.jemphub.com
```

## 2. Nginx-Seite einrichten

Datei auf den VPS kopieren (vom Repository-Ordner aus):

```sh
scp apps/guitar/deploy/nginx/guitarjemp.conf root@VPS_IP:/tmp/
```

Auf dem VPS:

```sh
sudo cp /tmp/guitarjemp.conf /etc/nginx/sites-available/guitarjemp.conf
sudo ln -s /etc/nginx/sites-available/guitarjemp.conf /etc/nginx/sites-enabled/guitarjemp.conf
sudo mkdir -p /var/www/guitarjemp
sudo nginx -t && sudo systemctl reload nginx
```

Die bestehende `jemphub.conf` bleibt unverändert.

## 3. HTTPS-Zertifikat

Auf dem VPS (Certbot ist für die anderen Jemp-Seiten bereits installiert):

```sh
sudo certbot --nginx -d guitarjemp.jemphub.com
```

Certbot ergänzt die HTTPS-Einstellungen in `guitarjemp.conf` selbst und
erneuert das Zertifikat automatisch.

## 4. App hochladen (auch für jedes Update)

Auf dem eigenen Rechner im Repository-Ordner (benötigt Node.js 22 oder neuer,
ssh und tar; unter Windows Git Bash oder WSL):

```sh
git pull
VPS_HOST=VPS_IP ./apps/guitar/deploy/publish.sh
```

Das Skript führt die Tests aus, baut die App, lädt sie nach
`/var/www/guitarjemp` und lädt Nginx neu. Optionale Angaben:
`VPS_USER` (Standard `root`), `REMOTE_ROOT` (Standard `/var/www/guitarjemp`),
`WEB_USER` (Standard `www-data`).

Eine `config.js` im Web-Verzeichnis (Supabase-Zugang, siehe
`apps/guitar/supabase/EINRICHTUNG.md`) wird beim Hochladen nicht überschrieben.

## Prüfen

- `https://guitarjemp.jemphub.com` öffnen: Das Griffbrett mit der Übung
  „C Major Scale“ erscheint.
- Nach einem Update zeigt ein normales Neuladen den neuen Stand; Nginx weist
  den Browser an, bei jedem Laden kurz nach Änderungen zu fragen.
