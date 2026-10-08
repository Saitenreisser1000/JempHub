# Project Structure

This note defines the intended `src/` folder structure for GuitarJemp.

## Goal

The structure should support three things at the same time:

1. clear separation of business domains
2. clear separation of app-wide shell and layout logic
3. clear separation between reusable logic and UI rendering

## Main folders

### `src/features`

Business-facing areas of the app.

Examples:

- `features/fretboard`
- `features/timeline`
- `features/transport`
- `features/cloud`
- `features/chord`
- `features/scale`
- `features/tones`

Rule:

- If a file clearly belongs to a business domain, it should live under `features/<feature>/...`.
- Feature-local `components`, `config`, and `composables` are allowed here.

### `src/components/app`

App-wide shell and composition layer.

These components are **not domain-specific**. They compose features together or provide the outer app frame.

Subareas:

- `app/shell`
  - global menus, dialog hosts, debug overlays
- `app/layout`
  - pane, window, and layout containers
- `app/workspace`
  - workspace composition, for example Pane A / Pane B / Left Rail / Sidebar

Rule:

- If a component orchestrates multiple features or belongs to app structure rather than a business domain, it should live under `components/app/...`.

### `src/store`

Global or shared application state.

Rule:

- Anything read or written across multiple areas of the app likely belongs in a store.

### `src/composables`

Reusable reactive logic units.

Examples:

- `useViewportMode`
- `useSongEditorActions`
- `useShareActions`

Rule:

- App-wide or cross-feature reactive logic belongs here.

### `src/features/<feature>/composables`

Feature-local composables.

Example:

- `features/timeline/composables/useCountInOverlay.js`

Rule:

- If a composable only makes sense inside one feature, it should stay inside that feature.

### `src/domain`

Core business logic, ideally UI-independent.

Subareas:

- `domain/music`
- `domain/song`
- `domain/exchange`
- `domain/audio`

Rule:

- Pure business rules, models, and transformations belong here.

### `src/infra`

Technical infrastructure.

Subareas:

- `infra/files`
- `infra/storage`
- `infra/supabase`
- `infra/pinia`

Rule:

- External integrations and technical platform logic belong here.

### `src/config`

Constants, fixed options, and configuration.

### `src/styles`

Global or app-wide styles.

### `src/utils`

Technical helper functions without a clear business-domain home.

### `src/i18n`

Internationalization and translations.

## Decision rules

If you are unsure, use this order:

1. Does it clearly belong to a business domain?
   Then place it under `features/...`.

2. Is it app-wide shell, layout, or workspace composition?
   Then place it under `components/app/...`.

3. Is it reusable reactive Vue logic?
   Then place it under `composables/...`.

4. Is it reusable reactive logic, but only inside one feature?
   Then place it under `features/<feature>/composables/...`.

5. Is it pure business logic without UI concerns?
   Then place it under `domain/...`.

6. Is it technical integration or infrastructure?
   Then place it under `infra/...`.

## Short version

- business-specific = `features`
- shell/composition = `components/app`
- global state = `store`
- reusable reactive logic = `composables`
- pure business logic = `domain`
- technical integration = `infra`

## Current notes

- Unused legacy files should either be removed or clearly marked as reserved for later use.
- New app-wide components should be placed directly in `shell`, `layout`, or `workspace`.
- Avoid adding new generic files directly to the root of `src/components/app` if they fit one of its subfolders.
