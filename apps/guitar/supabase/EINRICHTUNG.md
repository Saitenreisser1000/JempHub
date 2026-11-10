# GuitarJemp mit Supabase verbinden

Einmalige Einrichtung für die selbst gehostete Supabase-Instanz unter
`https://supabase.jemphub.com`. Alle Objekte heißen `gj_…`; bestehende Tabellen
anderer Apps werden nicht verändert.

## 1. Datenbank anlegen

1. Supabase Studio öffnen → **SQL Editor** → **New query**.
2. Den Inhalt von [`001_guitarjemp.sql`](001_guitarjemp.sql) einfügen und **Run** klicken.
3. Erwartet: „Success. No rows returned“. Unter **Table Editor** erscheinen
   `gj_profiles`, `gj_exercises` und `gj_shares`.

Das Skript darf mehrfach ausgeführt werden; vorhandene Daten bleiben erhalten.

## 2. Adressen für Login-Links eintragen

In der `.env` des Supabase-Docker-Setups (Ordner `supabase/docker` auf dem VPS):

```sh
SITE_URL=https://guitarjemp.jemphub.com
ADDITIONAL_REDIRECT_URLS=https://guitarjemp.jemphub.com/**
```

Falls dort schon Adressen anderer Apps stehen, die neue mit Komma anhängen.
Danach die Container neu starten:

```sh
docker compose down && docker compose up -d
```

## 3. E-Mail-Versand (für Bestätigung und Passwort-Reset)

Ist SMTP in der `.env` eingerichtet (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`,
`SMTP_ADMIN_EMAIL`), funktioniert alles wie vorgesehen.

Ohne SMTP: `ENABLE_EMAIL_AUTOCONFIRM=true` setzen, dann ist ein neues Konto
sofort aktiv. „Passwort vergessen“ funktioniert in diesem Fall nicht.

## 4. Zugang für die App

1. Studio → **Project Settings** → **API**: den **anon public** Key kopieren
   (beim Docker-Setup ist das `ANON_KEY` aus der `.env`).
2. `apps/guitar/config.example.js` als `config.js` neben die `index.html` im
   Web-Verzeichnis der App auf dem Server legen und den Key eintragen.

`config.js` gehört nicht ins Git-Repository (ist in `.gitignore`).
Niemals den `service_role`-Key verwenden: er umgeht alle Zugriffsregeln.

## Was die Zugriffsregeln garantieren

- Jede Person sieht nur ihre eigenen Übungen und die, die mit ihr geteilt wurden.
- Geteilte Übungen kann nur die Besitzerin bzw. der Besitzer ändern.
- Teilen geht nur mit bestehenden Konten (Suche per E-Mail-Adresse). Wer
  angemeldet ist, kann dabei erfahren, ob zu einer Adresse ein Konto existiert.
- Nicht angemeldete Besucher haben keinen Zugriff auf die Tabellen.

## 5. Rollen, Vernetzung und Admin (002_roles_network.sql)

Vom Repository-Ordner auf dem Mac aus:

```sh
ssh root@VPS_IP 'docker exec -i supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1' < apps/guitar/supabase/002_roles_network.sql
```

Rollen:

| Rolle | Darf |
| --- | --- |
| Admin | alles: Benutzer, Rollen, Sperren, Löschen, Verbindungen, Freigaben, Einstellungen |
| Lehrer | beliebig viele eigene Übungen, teilen, Mitglieder suchen und vernetzen |
| Schüler | vernetzen; eigene Übungen bis zur Grenze, teilen nur wenn in den Einstellungen erlaubt |

Neue Konten sind Schüler. „I teach guitar“ im Konto stellt einen Antrag, den ein Admin bestätigt.

Ersten Admin festlegen (E-Mail-Adresse anpassen; das Konto muss schon existieren):

```sh
ssh root@VPS_IP "docker exec supabase-db psql -U postgres -d postgres -c \"update public.gj_profiles set role = 'admin' where id = (select id from auth.users where email = 'ADRESSE');\""
```

## 6. Admin-Seite (jemphub.com/admin)

Die Seite kommt mit dem Hub (`apps/hub/deploy/publish.sh`). Sie braucht dieselbe
`config.js` wie GuitarJemp, abgelegt in `/var/www/jemphub/admin/config.js`:

```sh
ssh root@VPS_IP 'cp /var/www/guitarjemp/config.js /var/www/jemphub/admin/config.js && chown www-data:www-data /var/www/jemphub/admin/config.js'
```

Anmelden mit dem eigenen Konto. Konten ohne Admin-Rolle sehen nur „Kein Zugriff“;
alle Rechte prüft die Datenbank, nicht die Seite.
