import { ref } from 'vue'
import enCatalog from './locales/en/index.js'

const LOCALE_STORAGE_KEY = 'guitarjemp.ui.locale'
const FALLBACK_LOCALE = 'en'

const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'it', label: 'Italiano' },
  { code: 'pt', label: 'Português' },
]

const LOCALE_LOADERS = {
  en: async () => ({ default: enCatalog }),
  de: () => import('./locales/de/index.js'),
  es: () => import('./locales/es/index.js'),
  fr: () => import('./locales/fr/index.js'),
  it: () => import('./locales/it/index.js'),
  pt: () => import('./locales/pt/index.js'),
}

function languageExists(code) {
  return SUPPORTED_LANGUAGES.some((l) => l.code === code)
}

function resolvePath(obj, path) {
  const parts = String(path || '').split('.').filter(Boolean)
  let cursor = obj
  for (const p of parts) {
    if (cursor == null || typeof cursor !== 'object' || !(p in cursor)) return ''
    cursor = cursor[p]
  }
  return typeof cursor === 'string' ? cursor : ''
}

function isObject(v) {
  return v != null && typeof v === 'object' && !Array.isArray(v)
}

function deepMerge(base, patch) {
  const out = { ...(base || {}) }
  for (const [key, value] of Object.entries(patch || {})) {
    if (isObject(value) && isObject(out[key])) {
      out[key] = deepMerge(out[key], value)
    } else {
      out[key] = value
    }
  }
  return out
}

function interpolate(template, params) {
  if (!params || typeof template !== 'string') return template
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const value = params[key]
    return value == null ? '' : String(value)
  })
}

function detectInitialLocale() {
  if (typeof window === 'undefined') return FALLBACK_LOCALE

  const stored = String(window.localStorage.getItem(LOCALE_STORAGE_KEY) || '').trim()
  if (languageExists(stored)) return stored

  const raw = String(window.navigator?.language || FALLBACK_LOCALE).toLowerCase()
  const prefix = raw.split('-')[0]
  return languageExists(prefix) ? prefix : FALLBACK_LOCALE
}

const loadedCatalogs = new Map([[FALLBACK_LOCALE, enCatalog]])
const locale = ref(detectInitialLocale())
const catalog = ref(enCatalog)

async function loadCatalog(code) {
  const safeCode = String(code || '').toLowerCase()
  if (!languageExists(safeCode)) return null
  if (loadedCatalogs.has(safeCode)) return loadedCatalogs.get(safeCode)

  const loader = LOCALE_LOADERS[safeCode]
  if (!loader) return null

  const mod = await loader()
  const loaded = mod?.default ?? {}
  loadedCatalogs.set(safeCode, loaded)
  return loaded
}

async function hydrateCatalog(code) {
  const safeCode = languageExists(code) ? code : FALLBACK_LOCALE
  const fallback = (await loadCatalog(FALLBACK_LOCALE)) || {}
  const local = safeCode === FALLBACK_LOCALE ? {} : (await loadCatalog(safeCode)) || {}
  catalog.value = deepMerge(fallback, local)
}

async function setLocale(next) {
  const code = String(next || '').toLowerCase()
  if (!languageExists(code)) return

  locale.value = code
  await hydrateCatalog(code)

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, code)
    document.documentElement.setAttribute('lang', code)
  }
}

function t(path, paramsOrFallback = '', fallbackIfParams = '') {
  const hasParams =
    paramsOrFallback != null &&
    typeof paramsOrFallback === 'object' &&
    !Array.isArray(paramsOrFallback)

  const params = hasParams ? paramsOrFallback : null
  const fallback = hasParams ? fallbackIfParams : paramsOrFallback

  const localized = resolvePath(catalog.value || {}, path)
  if (localized) return interpolate(localized, params)

  const fromFallback = resolvePath(enCatalog || {}, path)
  if (fromFallback) return interpolate(fromFallback, params)

  return String(fallback || path)
}

if (typeof window !== 'undefined') {
  document.documentElement.setAttribute('lang', locale.value)
}

void hydrateCatalog(locale.value)

export function useI18n() {
  return {
    locale,
    languages: SUPPORTED_LANGUAGES,
    setLocale,
    t,
  }
}
