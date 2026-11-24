# Azure- und SharePoint-Bereitstellung

## Zielarchitektur

- Azure App Service führt Vue und das Node.js-Backend gemeinsam aus.
- App Service Authentication übernimmt die Anmeldung mit Microsoft Entra ID.
- Microsoft Graph speichert PNG-, JPG- und PDF-Dateien in einer SharePoint-Dokumentbibliothek.

## Benötigte Microsoft-365-Daten

Ein Administrator benötigt die Mandanten-ID (`AZURE_TENANT_ID`), die ID der App-Registrierung (`AZURE_CLIENT_ID`) und die ID der gewünschten SharePoint-Dokumentbibliothek (`SHAREPOINT_DRIVE_ID`). Das Client Secret wird ausschließlich als geschützte App-Service-Einstellung hinterlegt.

Für die App-Registrierung wird als Microsoft-Graph-Anwendungsberechtigung bevorzugt `Sites.Selected` verwendet. Danach muss die App explizit für die gewünschte SharePoint-Site mit Schreibrecht freigegeben werden. Alternativ funktioniert `Sites.ReadWrite.All`, gibt der App aber wesentlich breiteren Zugriff.

## App Service

1. Linux App Service mit Node.js 22 oder 24 anlegen.
2. Projekt bereitstellen und als Startbefehl `npm start` verwenden.
3. Unter **Konfiguration → Anwendungseinstellungen** setzen:

   - `STORAGE_PROVIDER=sharepoint`
   - `REQUIRE_AUTH=true`
   - `AZURE_TENANT_ID=<Mandanten-ID>`
   - `AZURE_CLIENT_ID=<App-ID>`
   - `AZURE_CLIENT_SECRET=<Secret>`
   - `SHAREPOINT_DRIVE_ID=<Bibliotheks-ID>`
   - `SHAREPOINT_FOLDER=Alumni/Fertige Beitraege`

4. Unter **Authentifizierung** Microsoft als Identitätsanbieter hinzufügen und nicht authentifizierte Anforderungen blockieren.
5. Beim Deployment muss zuerst `npm run build` ausgeführt werden. Der Server liefert danach den Ordner `dist` aus.

## Lokale Entwicklung

Ohne Einstellungen verwendet die Anwendung weiterhin `storage/exports`. Für lokale Tests genügt:

```sh
npm run dev
```

Die Datei `.env.example` enthält nur Feldnamen und darf als Vorlage verwendet werden. Geheimnisse dürfen niemals in `.env.example`, Git oder den Quellcode eingetragen werden.
