# ConductJemp (Prototyp)

Dirigieren lernen: Die Hand wird über die Kamera (oder Maus/Finger) verfolgt, Schlagpunkte, Tempo und Größe der Figur steuern die Musik.

- **Übungen 2/4, 3/4, 4/4**: Akkord auf jedem Schlag, Eins betont; Schlagfigur als Vorlage, Schlagpunkte grün (richtige Richtung) oder rot.
- **Stücke** (Melodie Holzbläser, Begleitung Streicher; am Ende Tempoverlauf, Schwankung, Figur-Trefferquote):
  - „Hänschen klein“ (gemeinfrei), 2/4
  - Walzer in G (eigene Komposition), 3/4
  - „Ode an die Freude“ (Beethoven, gemeinfrei), 4/4
  - Barcarole in D (eigene Komposition), 6/8 – dirigiert in 2
- Auftakt gibt das Tempo, große Figur = laut, Hand ruhig = Pause (das Stück macht beim nächsten Auftakt weiter).
- Linke oder rechte Schlaghand (L/R): Figur und Prüfung werden gespiegelt; mit Kamera wird bei zwei sichtbaren Händen die Schlaghand gewählt.
- Leertaste: Schlag per Taste.

## Technik

- `src/conduct.js`: Schlagerkennung (Tiefpunkt der Abwärtsbewegung) mit One-Euro-Filter gegen Zittern, Schwellen relativ zur Handgröße im Bild (gleiche Geste nah und fern), Sperrzeit nach dem Tempo gegen Doppelschläge; Tempo, Dynamik, Figurprüfung; ein verpasster letzter Schlag wird an der großen Abwärtsbewegung der Eins erkannt und übersprungen – mit Tests.
- `src/camera.js`: MediaPipe Hand Landmarker (`@mediapipe/tasks-vision@0.10.14` von jsDelivr, Modell von Google), läuft im Browser; das Kamerabild verlässt das Gerät nicht. Kamera braucht HTTPS.
- Klänge aus `packages/sounds` (Orchester aus Virtual Playing Orchestra).

## Entwicklung und Veröffentlichung

```bash
npm run dev      # http://localhost:5184 (Kamera funktioniert auf localhost)
npm test
npm run build    # dist/
VPS_HOST=187.124.190.130 VPS_USER=root ./deploy/publish.sh   # nach /var/www/conductjemp
```

Einmalig auf dem Server: DNS-Eintrag `conductjemp` → VPS, `deploy/nginx/conductjemp.conf` nach `/etc/nginx/sites-available/`, verlinken, `certbot --nginx -d conductjemp.jemphub.com`.
