import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const ROOT = process.cwd()
const LOCALES_DIR = path.join(ROOT, 'src', 'i18n', 'locales')
const BASE_LOCALE = 'en'

function flattenMessages(obj, prefix = '', out = new Map()) {
  if (obj == null || typeof obj !== 'object' || Array.isArray(obj)) return out

  for (const [key, value] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${key}` : key
    if (value != null && typeof value === 'object' && !Array.isArray(value)) {
      flattenMessages(value, next, out)
      continue
    }
    out.set(next, value)
  }
  return out
}

async function loadLocaleCatalog(localeCode) {
  const filePath = path.join(LOCALES_DIR, localeCode, 'index.js')
  const mod = await import(pathToFileURL(filePath).href)
  return mod?.default ?? {}
}

function formatKeyList(keys) {
  return keys.map((k) => `  - ${k}`).join('\n')
}

async function main() {
  const entries = await readdir(LOCALES_DIR, { withFileTypes: true })
  const locales = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()

  if (!locales.includes(BASE_LOCALE)) {
    console.error(`Base locale "${BASE_LOCALE}" not found in ${LOCALES_DIR}`)
    process.exit(1)
  }

  const baseCatalog = await loadLocaleCatalog(BASE_LOCALE)
  const baseKeys = flattenMessages(baseCatalog)
  const baseKeySet = new Set(baseKeys.keys())

  let hasErrors = false

  for (const locale of locales) {
    if (locale === BASE_LOCALE) continue

    const catalog = await loadLocaleCatalog(locale)
    const keys = flattenMessages(catalog)
    const keySet = new Set(keys.keys())

    const missing = [...baseKeySet].filter((k) => !keySet.has(k)).sort()
    const extra = [...keySet].filter((k) => !baseKeySet.has(k)).sort()
    const typeMismatch = [...baseKeySet]
      .filter((k) => keySet.has(k))
      .filter((k) => typeof keys.get(k) !== typeof baseKeys.get(k))
      .sort()

    if (missing.length || typeMismatch.length) {
      hasErrors = true
      console.error(`\n[${locale}]`)
      if (missing.length) {
        console.error(`Missing keys (${missing.length}):\n${formatKeyList(missing)}`)
      }
      if (typeMismatch.length) {
        console.error(`Type mismatches (${typeMismatch.length}):\n${formatKeyList(typeMismatch)}`)
      }
    }

    if (extra.length) {
      console.warn(`\n[${locale}] Extra keys (${extra.length}):\n${formatKeyList(extra)}`)
    }
  }

  if (hasErrors) {
    console.error('\ni18n check failed: missing keys or type mismatches found.')
    process.exit(1)
  }

  console.log(`i18n check passed. Locales checked: ${locales.join(', ')}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
