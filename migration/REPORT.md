# Migrationsprüfung – 8. Oktober 2026

## Ergebnis

Sechs Projekte im gewünschten Verzeichnisbaum, sieben npm-Workspaces einschließlich StemPlayer-Backend. Alle Originaldateien im kopierten Umfang sind per SHA-256 unverändert; Git-Status, Original-HEADs und sämtliche übernommenen Referenzen stimmen weiterhin. Details: `source-snapshot.json`, `history-map.json`, `verification.json`.

Die bestehenden Sicherungen wurden anhand aller neun Einträge in `SHA256SUMS` erfolgreich geprüft. StemPlayer wurde zusätzlich als vollständiges tar.gz mit `.git` und lokalen Änderungen (ohne node_modules) sowie als geprüftes `--all`-Git-Bundle gesichert. Metadaten und Prüfsummen: `../JempHub-Migration-Backup/StemPlayer-manifest.json`.

## Validierung

Umgebung: macOS, Node v26.4.0, npm 11.17.0.

- `npm ci --offline --ignore-scripts --no-audit --no-fund --cache /private/tmp/jemphub-npm-online-cache`: erfolgreich aus dem Root-Lockfile.
- `npm run build`: erfolgreich für alle sieben Workspaces.
- GuitarJemp: ursprünglicher Vite-Produktionsbuild erfolgreich; 4 Testdateien, 15 Tests erfolgreich.
- EarJemp: ursprünglicher Vite-Produktionsbuild erfolgreich; 1 Testdatei, 1 Test erfolgreich.
- NoteJemp: ursprünglicher Vite-Produktionsbuild erfolgreich.
- Hub und StemPlayer: statische Artefakte erstellt, lokale HTML-Verweise geprüft; StemPlayer-JavaScript-Syntax geprüft und vorhandenes Audio mitkopiert.
- Backend: sämtliche JavaScript-Dateien syntaktisch geprüft, alle neun direkten Paketabhängigkeiten erfolgreich importiert.
- Design-System: alle Paketexporte vorhanden; JavaScript-Syntax geprüft. Integration zusätzlich durch GuitarJemp-Build getestet.
- `check-dependency-resolution.py`: keine Abweichung der direkten Paketversionen gegenüber den ursprünglichen Lockfiles.
- `verify-migration.py`: Originaldateien und Git-Zustände unverändert; alle ursprünglichen Hauptstände Vorfahren von main; alle ursprünglichen Referenzen erhalten.

Build- und Testprotokolle: `/private/tmp/jemphub-build-all.log`, `/private/tmp/jemphub-test-guitar.log`, `/private/tmp/jemphub-test-ear.log`, `/private/tmp/jemphub-ci.log`.

Es gibt Vite-Warnungen zu großen Chunks sowie Hinweise auf veraltete bestehende Dependencies. Kein Backend-/Datenbank-Integrationstest, keine DNS-/Subdomain-Erreichbarkeitsprüfung und kein Produktionsdeployment wurden durchgeführt.

## Bewusste Anpassungen

- Root-Workspace-Konfiguration, aus bestehenden Paketbäumen abgeleitetes Root-Lockfile und Build-Prüfskripte.
- GuitarJemp: relativer Design-System-Pfad angepasst; Quellcode unverändert.
- Hub: bestehende Karte für GuitarJemp aktiviert und Beschreibung ergänzt; StemPlayer-Linkbeschriftung aktiviert.
- StemPlayer: Paketdefinition für statischen Workspace ergänzt; Backend mit Build-Prüfung ergänzt; Release-Builder auf App-Unterbaum begrenzt.
- Design-System: Export-/Syntaxprüfung als Build ergänzt.
- Alle sonstigen lokalen Quelländerungen, gelöschten Dateien und unversionierten Projektdateien übernommen. Generierte node_modules, dist, .DS_Store und .eslintcache nicht kopiert.

Das verschachtelte Backend hat seinen Paketbaum im Root-Lockfile unter `node_modules` erhalten, damit npm ci ihn nicht beim Bereinigen des übergeordneten Workspace-Verzeichnisses entfernt. Andere App-Paketbäume behalten ihre getrennten Versionen. Die Original-Lockfiles bleiben erhalten.

## Medien und Veröffentlichung

Keine neuen StemPlayer-Audio-, Upload- oder Release-Dateien werden versioniert; diese liegen lokal und sind ignoriert. Die zur unveränderten Historie gehörenden acht großen StemPlayer-Audio-Blobs und ein EarJemp-Blob wurden vor dem Import geprüft und dokumentiert. Historien wurden nicht umgeschrieben. Große Audiodateien sind daher weiterhin in der historischen Git-Objektdatenbank enthalten.

Es gibt keinen Monorepo-Remote und keine neue Deployment-Automatik. Bestehende Subdomains, Artefaktgrenzen und getrennte Deployments sind dokumentiert; Server und Originalordner wurden nicht geändert. Alte Pfad-Redirect-Konfigurationen bleiben als Bestand unter StemPlayer/deploy erhalten und sollen nicht für das gewünschte Subdomain-Modell verwendet werden.

Offene URL-Bestätigung: Die neue GuitarJemp-Karte verwendet vorläufig `https://guitarjemp.jemphub.com/`; diese URL ist im Originalbestand nicht bestätigt und kann vor einer späteren Veröffentlichung angepasst werden.
