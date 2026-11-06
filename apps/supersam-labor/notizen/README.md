# Übergaben aus dem Leveleditor

„⇪ An Claude übergeben“ legt hier pro Welt ab (ein Commit, **nicht live**):

- `supersam-notizen-<welt>.json` – Übergabe: Zeitpunkt, optionale `nachricht`, Verweis auf den Entwurf und die
  Notizen (Bereich in Spalten `c0–c1`, Reihen `r0–r1`, Text). `status` (`offen`/`erledigt`) und `antwort` setzt Claude.
- `supersam-entwurf-<welt>.json` – der Level-Stand aus dem Editor (gleiches Format wie `levels/`).

Claude baut den Entwurf (plus Notizen) in `levels/supersam-level-<welt>.json` ein, **löscht danach den Entwurf**
und markiert die Notizen. Der Editor erkennt die neue Labor-Fassung und lädt sie beim Öffnen.
Diese Dateien haben keinen Einfluss auf das Spiel.
