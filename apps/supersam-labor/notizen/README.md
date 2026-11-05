# Notizen aus dem Leveleditor

Hier legt der Editor („💬 Notiz“ → **⇪ An Claude senden**) pro Welt eine Datei
`supersam-notizen-<welt>.json` ab: Bereiche im Level (Spalten `c0–c1`, Reihen `r0–r1`)
mit einem Text, was geändert werden soll.

- `status`: `offen` oder `erledigt` – setzt Claude nach der Umsetzung, dazu kurz `antwort`.
- Der Editor zeigt erledigte Notizen grün mit der Antwort an.
- Die Notizen haben keinen Einfluss auf das Spiel.
