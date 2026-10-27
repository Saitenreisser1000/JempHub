# @jemphub/fonts

Die drei Jemp-Schriften zum Ausliefern vom eigenen Server, damit Besucher keine Anfragen an Google Fonts schicken (Datenschutz).

| Datei | Schrift |
| --- | --- |
| `figtree.woff` | Figtree, Gewicht 300–900 |
| `bricolage-grotesque.woff` | Bricolage Grotesque, Gewicht 200–800, optische Größe 12–96, Breite 100 |
| `jetbrains-mono.woff` | JetBrains Mono, Gewicht 100–800 |

Erzeugt aus den variablen TTF-Dateien im Repository google/fonts mit fontTools: lateinische Zeichen samt Satzzeichen, Pfeilen und ♯ ♭ ♮, als WOFF. Alle drei unter der SIL Open Font License 1.1 (siehe `OFL-*.txt`).

`node scripts/sync-shared.mjs <app> fonts` kopiert das Paket nach `apps/<app>/vendor/fonts/`; die Apps binden `vendor/fonts/fonts.css` ein.
