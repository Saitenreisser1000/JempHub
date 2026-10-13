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

  try {
    const stored = String(window.localStorage.getItem(LOCALE_STORAGE_KEY) || '').trim()
    if (languageExists(stored)) return stored
  } catch {
    // Browser privacy settings may block storage; language selection still works.
  }

  const raw = String(window.navigator?.language || FALLBACK_LOCALE).toLowerCase()
  const prefix = raw.split('-')[0]
  return languageExists(prefix) ? prefix : FALLBACK_LOCALE
}

const initialLocale = detectInitialLocale()
const loadedCatalogs = new Map([[FALLBACK_LOCALE, enCatalog]])
const pendingCatalogs = new Map()
const locale = ref(FALLBACK_LOCALE)
const catalog = ref(enCatalog)
const localeLoading = ref(false)
const localeError = ref(false)
let localeRequest = 0

async function loadCatalog(code) {
  if (loadedCatalogs.has(code)) return loadedCatalogs.get(code)
  if (!pendingCatalogs.has(code)) {
    const pending = LOCALE_LOADERS[code]().then((mod) => {
      const loaded = mod?.default ?? {}
      loadedCatalogs.set(code, loaded)
      return loaded
    }).finally(() => pendingCatalogs.delete(code))
    pendingCatalogs.set(code, pending)
  }
  return pendingCatalogs.get(code)
}

async function setLocale(next, { persist = true } = {}) {
  const code = String(next || '').toLowerCase()
  if (!languageExists(code)) return false
  const request = ++localeRequest
  localeLoading.value = true
  localeError.value = false
  try {
    const local = await loadCatalog(code)
    if (request !== localeRequest) return false
    // Commit language, catalog and document metadata together, only after loading.
    catalog.value = deepMerge(enCatalog, local)
    locale.value = code
    if (typeof document !== 'undefined') document.documentElement.setAttribute('lang', code)
    if (persist && typeof window !== 'undefined') {
      try { window.localStorage.setItem(LOCALE_STORAGE_KEY, code) } catch { /* optional persistence */ }
    }
    return true
  } catch {
    if (request === localeRequest) localeError.value = true
    return false
  } finally {
    if (request === localeRequest) localeLoading.value = false
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

void setLocale(initialLocale, { persist: false })

export function useI18n() {
  return {
    locale,
    languages: SUPPORTED_LANGUAGES,
    setLocale,
    localeLoading,
    localeError,
    t,
  }
}
