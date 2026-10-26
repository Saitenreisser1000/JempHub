# JempHub Monorepo

Lokale Zusammenführung der bestehenden Projekte. Originalordner unter `../` bleiben unverändert. Es wurde nichts veröffentlicht, kein Remote für das Monorepo eingerichtet und kein Server verändert.

| Workspace | Quelle | Build | Separates Deployment |
| --- | --- | --- | --- |
| `apps/hub` | Jemphub | `npm run build:hub` | jemphub.com / www.jemphub.com |
| `apps/guitar` | GuitarJemp | `npm run build:guitar` | GuitarJemp; URL noch zu bestätigen |
| `apps/ear` | earjemp-master | `npm run build:ear` | earjemp.jemphub.com |
| `apps/note` | NoteJemp | `npm run build:note` | notejemp.jemphub.com |
| `apps/stemplayer` | StemPlayer | `npm run build:stemplayer` | stemplayer.jemphub.com, Backend separat |
| `packages/design-system` | jemp-design-system | `npm run build:design-system` | Quellpaket, kein eigener Dienst |

## Lokal installieren und bauen

Node >=22.12 (geprüfte Version siehe Migrationsbericht), npm:

```sh
npm ci
npm run build
npm run dev
```

Der lokale Einstieg ist **http://127.0.0.1:4173**. Der Root-Dev-Befehl startet JempHub sowie GuitarJemp, EarJemp, NoteJemp und StemPlayer auf getrennten lokalen Ports; die Projektkarten im Hub öffnen die jeweiligen lokalen Dev-Server. Mit `Ctrl+C` werden alle gestarteten Server beendet. Das StemPlayer-Backend wird nicht automatisch gestartet, da es eine lokale Datenbank-Konfiguration benötigt.

Apps können bei Bedarf weiterhin einzeln gestartet werden:

```sh
npm run dev --workspace guitarjemp
npm run dev --workspace earjemp
npm run dev --workspace notejemp
npm run dev --workspace stemplayer-backend
```

Die Frontend-Artefakte liegen jeweils unter `apps/<app>/dist`. Hub, GuitarJemp und StemPlayer verwenden einen statischen Kopier-Build mit Prüfung der lokalen HTML-Verweise; die Vue-Apps behalten ihre Vite-Builds. Backend und Design-System sind ungebündelte JavaScript-Quellen: deren Build prüft Syntax, Paketabhängigkeiten bzw. Exporte. Backend-Integration mit PostgreSQL wird dadurch nicht geprüft.

Das Root-Lockfile ist für `npm ci` im Monorepo maßgeblich. Die übernommenen App-Lockfiles bleiben als Originalbestand und für eigenständige Deployment-Kontexte erhalten.

GuitarJemp (ab Version 2) ist eine statische App mit nativen ES-Modulen ohne Paketabhängigkeiten. Ihr Build führt die Tests aus und kopiert die Dateien nach `apps/guitar/dist`; der Dev-Server läuft auf Port 5180. Die frühere Vue/Vuetify-Version ist im Git-Tag `guitarjemp-legacy` erhalten.

## Historien und lokale Änderungen

`history/guitar`, `history/ear`, `history/note` und `history/stemplayer` zeigen auf die unveränderten Original-HEADs. Alle ursprünglichen Referenzen sind zusätzlich unter `refs/archive/<app>/...` erhalten. Merge-Commits verbinden die ursprünglichen Hauptstände mit `main`; neue Projektdateien liegen im gewünschten Unterordner. Alte Commits behalten ihre damaligen Pfade und Hashes. `migration/history-map.json` dokumentiert die Zuordnung. Hub besitzt kein Git-Repository; das Design-System hatte noch keine Commits.

`migration/source-snapshot.json` enthält die ursprünglichen lokalen Git-Zustände und SHA-256-Werte aller übernommenen Dateien. Lokale Änderungen wurden mitkopiert, einschließlich gelöschter Dateien und unversionierter Deployment-Dateien. Lokale `.env`-Dateien bleiben ignoriert.

## Audio und Sicherungen

Sicherungen: `../JempHub-Migration-Backup`. Die vorhandenen SHA-256-Prüfsummen wurden überprüft. StemPlayer wurde als vollständiges Archiv inklusive `.git` (ohne reproduzierbare `node_modules`) und als geprüftes Git-Bundle ergänzt.

StemPlayer-Audio, Uploads und Release-Archive sind im Arbeitsordner erhalten, aber in neuen Commits ausgeschlossen. Ein frischer Clone muss diese Medien separat erhalten; der statische StemPlayer-Build kopiert vorhandenes Audio in sein ignoriertes `dist`. Er generiert oder konvertiert keine Audioquellen.

Historisch bereits versionierte große Objekte wurden vor dem Import geprüft und in `migration/large-historical-objects.json` erfasst. Sie bleiben zur Erhaltung unveränderter Git-Historien in der Objekt-Datenbank. Darunter liegen acht große StemPlayer-Audiodateien und ein EarJemp-Audio-Asset. Vor einer späteren Veröffentlichung muss deshalb auch die gesamte Historie berücksichtigt werden. Bestehende kleine Guitar-/Ear-Audio-Assets bleiben für die Apps erhalten.

## Deployment beibehalten

Es gibt keine Root-Deployment-Automatik. Übernommene GitHub-Workflows unter den App-Unterordnern sind Bestand und werden von GitHub dort nicht als Root-Workflows ausgeführt. Ein künftiges Deployment muss bewusst pro App eingerichtet werden, mit dem jeweiligen Workspace-Build und ausschließlich dessen Artefakt.

Die vorhandenen Deploy-Skripte bleiben bei ihrer jeweiligen App. Hub `deploy/publish.sh` arbeitet weiter relativ zu `apps/hub`; NoteJemp behält seine Deploy-Dateien. StemPlayers Release-Builder archiviert jetzt ausschließlich `apps/stemplayer`, nicht das ganze Monorepo. Audio wird für neue Releases separat bereitgestellt. Das Backend behält Dockerfile, SQL, eigene Paketdateien und seine Server-Konfiguration.

Ältere StemPlayer-Dateien unter `deploy/` beschreiben eine Umleitung auf `/stemplayer` und `/earjemp`. Diese sind archivierter Bestand und entsprechen nicht dem hier gewünschten Subdomain-Modell: nicht als neue Serverkonfiguration einsetzen. Es wurden keine DNS-, Nginx-, Service- oder Produktionsänderungen vorgenommen.

Die GuitarJemp-Karte verwendet vorläufig `https://guitarjemp.jemphub.com/`, da der Bestand keine bestätigte öffentliche URL enthält. Bei abweichender bestehender URL nur diesen Link ändern; keine neue Subdomain wird durch die Migration angelegt.
