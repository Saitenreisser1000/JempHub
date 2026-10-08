export function readJson(key) {
  try {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem(String(key))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function writeJson(key, value) {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(String(key), JSON.stringify(value))
  } catch {
    // ignore
  }
}
