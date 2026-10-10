# AGENTS.md – Git-Arbeitsweise für JempHub

Diese Regeln gelten im gesamten JempHub-Repository für OpenClaw, Codex und
andere Coding-Agents. Explizite Einschränkungen des aktuellen Auftrags
(z. B. „noch nicht committen oder pushen“) sind einzuhalten.

## Branches und Aufgabenbeginn

1. `main` ist der stabile Hauptbranch. Entwickle niemals direkt auf `main`.
2. Vor Beginn einer neuen Entwicklungsaufgabe:
   - Prüfe mit `git status`, ob der Arbeitsbaum einschließlich des Index sauber
     ist und keine unversionierten Dateien vorliegen. Bei vorhandenen Änderungen
     halte an und kläre das weitere Vorgehen; lösche, überschreibe, committe oder
     stashe sie nicht eigenmächtig.
   - Wechsle mit `git switch main` auf `main`.
   - Aktualisiere ihn mit `git pull --ff-only`. Schlägt dies fehl, prüfe die
     Ursache und kläre das Vorgehen, statt einen Merge, Reset oder Rebase zu
     erzwingen.
   - Erstelle anschließend mit `git switch -c <branchname>` einen neuen Branch
     für die Aufgabe. Überschreibe keinen bereits vorhandenen Branch.
3. Verwende verständliche, aufgabenbezogene Branchnamen, beispielsweise:
   - `feature/guitar-tempo-control`
   - `fix/ear-audio-loading`
   - `refactor/shared-components`
4. Eine zusammenhängende Entwicklungsaufgabe bleibt während ihrer gesamten
   Bearbeitung auf demselben Branch. Folgeaufträge, Rückfragen und Korrekturen
   innerhalb dieser Aufgabe erfordern keinen neuen Branch pro Chatnachricht.
   Prüfe beim Fortsetzen den aktuellen Branch und Arbeitsbaum; wiederhole den
   Ablauf für eine neue Aufgabe nicht mitten in einer laufenden Aufgabe.

## Umfang und Schutz vorhandener Arbeit

5. Bearbeite ausschließlich Dateien, die für den Auftrag notwendig sind.
   Verändere keine anderen Apps oder Bereiche ohne auftragsbezogenen Grund.
6. Lösche oder überschreibe keine fremden oder noch nicht eingecheckten
   Änderungen. Verwende keine destruktiven Befehle, um einen sauberen
   Arbeitsbaum zu erzwingen.
7. Wenn gleichzeitig Änderungen auf GitHub oder durch andere Entwickler oder
   Coding-Agents erfolgt sind, prüfe zuerst den aktuellen Stand: Arbeitsbaum,
   Branch, Historie und nach `git fetch origin` die relevanten Remote-Branches.
   Löse Konflikte niemals durch blindes Überschreiben. Kläre unvereinbare oder
   unklare Änderungen vor der weiteren Umsetzung.
8. Wenn eine Aufgabe unklar ist oder eine Änderung größere Auswirkungen auf
   andere JempHub-Apps oder die gemeinsame Architektur hätte, frage den
   Auftraggeber vor der Umsetzung.

## Prüfung und Commits

9. Prüfe vor jedem Commit immer `git status`, `git diff` und
   `git diff --cached`. Prüfe auch den Inhalt neuer, noch unversionierter
   Dateien; diese erscheinen nicht im normalen `git diff`.
10. Führe vorhandene relevante Tests, Linting und/oder Builds aus, bevor du
    eine Aufgabe als abgeschlossen bezeichnest. Wähle die Prüfungen passend
    zu den betroffenen Apps und Packages. Dokumentiere ausgeführte Prüfungen
    und Ergebnisse; benenne fehlende oder nicht ausführbare Prüfungen offen.
    Bei reinen Dokumentationsänderungen prüfe Inhalt und Diff auf Konsistenz
    und Formatierungsfehler; führe vorhandene passende Dokumentationschecks aus.
11. Committe nur funktionierende, zusammengehörige Änderungen mit einer
    aussagekräftigen Commit-Message. Stage gezielt nur die zum Auftrag
    gehörenden Dateien und prüfe den tatsächlichen Commit-Inhalt.
12. Committe niemals Passwörter, API-Keys, Tokens, `.env`-Dateien oder andere
    Secrets. Prüfe neue Dateien und den gestagten Diff vor dem Commit darauf.

## Push und Integration

13. Pushe Entwicklungsbranches zu `origin`, sofern der aktuelle Auftrag dies
    nicht ausdrücklich zurückstellt. Pushe niemals Änderungen direkt auf
    `main`. Prüfe vor dem Push den Zielbranch und den aktuellen Remote-Stand;
    umgehe einen abgelehnten Push nicht durch erzwungenes Überschreiben.
14. Führe niemals selbstständig einen Merge nach `main` durch. Ein Merge nach
    `main` erfolgt erst nach ausdrücklicher Freigabe des Auftraggebers. Diese
    Freigabe erlaubt keinen direkten Push auf `main`; verwende den vereinbarten
    Review-/Pull-Request-Prozess.
15. Verwende niemals `git push --force` auf `main`. Auch `--force-with-lease`,
    erzwungene Ref-Spezifikationen oder andere Formen des erzwungenen
    Überschreibens von `main` sind verboten.
