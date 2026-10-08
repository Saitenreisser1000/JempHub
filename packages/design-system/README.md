# jemp-design-system

Shared design tokens, global styles, and Vuetify theme helpers for Jemp-based apps.

## Usage

```js
import 'jemp-design-system'
import { createJempVuetifyTheme } from 'jemp-design-system'
```

The package provides the default GuitarJemp theme names:

- `guitarjemp`
- `guitarjempDark`

## Heading Color Tokens

The design tokens include dedicated heading colors:

- `--color-heading`
- `--color-heading-muted`
- `--color-heading-inverse`

Global heading elements (`h1` to `h6`) are styled in `src/styles.css` to use `--color-heading` and `--font-display` by default.

If an app needs different Vuetify theme names, `createJempVuetifyTheme()` accepts overrides.
