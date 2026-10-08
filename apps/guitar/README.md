# GuitarJemp

This template should help get you started developing with Vue 3 in Vite.

## Dokumentation

- Komponenten/Architektur-Übersicht: [docs/component-diagram.md](docs/component-diagram.md)

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

## Accounts, Passwort-Reset, Cloud Library (Supabase)

GuitarJemp kann optional mit Supabase betrieben werden, um:

- Accounts (Signup/Login)
- Passwort-Reset (Recovery Link)
- Speichern/Abrufen von Songs & Übungen (DB)
- Teilen über "Connections" und/oder explizite Shares
- Rollen (z.B. teacher/student/admin) über Profile

### Setup

1. Supabase Projekt anlegen

2. Schema in Supabase ausführen:

- SQL: [docs/supabase-schema.sql](docs/supabase-schema.sql)

3. Environment Variablen setzen:

- Beispiel: [.env.example](.env.example)
- Du brauchst `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY`

4. Supabase Auth Redirects konfigurieren (wichtig für Passwort-Reset):

- Supabase Dashboard  Authentication  URL Configuration
- `Site URL`: `http://localhost:5173` (oder dein Dev-Host)
- `Redirect URLs` / `Additional Redirect URLs`: `http://localhost:5173`

5. Hinweis zu Signup:

- Wenn Email-Confirmation aktiv ist, musst du die Besttigungs-Mail klicken, bevor Login funktioniert.
- Fr Produktion solltest du SMTP/Email sauber konfigurieren.

4. Dev starten:

```sh
npm run dev
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```
