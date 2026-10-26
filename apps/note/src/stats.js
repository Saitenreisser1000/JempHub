// Fortschritt und Einstellungen im Browser speichern.
// Schlüssel und Format der Gesamtstatistik sind mit NoteJemp 1 kompatibel.

const PREFIX = 'notejemp:'

export function createStore(storage = globalThis.localStorage) {
  function load(key, fallback) {
    try {
      const raw = storage?.getItem(PREFIX + key)
      const v = raw ? JSON.parse(raw) : null
      return v && typeof v === 'object' ? { ...fallback, ...v } : { ...fallback }
    } catch {
      return { ...fallback }
    }
  }
  function save(key, value) {
    try {
      storage?.setItem(PREFIX + key, JSON.stringify(value))
    } catch {
      /* Speicher nicht verfügbar */
    }
  }

  const totals = load('stats', {}) // pro Übung: answered, correct, rounds, best
  const items = load('items', {}) // pro Aufgabe: n, ok, miss (letzte Antwort falsch)

  function total(ex) {
    if (!totals[ex]) totals[ex] = { answered: 0, correct: 0, rounds: 0, best: 0 }
    return totals[ex]
  }

  return {
    totals,
    items,
    settings(ex, defaults) {
      return load('settings:' + ex, defaults)
    },
    saveSettings(ex, value) {
      save('settings:' + ex, value)
    },
    pref(key, fallback) {
      return load('prefs', { [key]: fallback })[key]
    },
    setPref(key, value) {
      const p = load('prefs', {})
      p[key] = value
      save('prefs', p)
    },
    recordAnswer(ex, itemKey, ok) {
      const t = total(ex)
      t.answered++
      if (ok) t.correct++
      const it = items[itemKey] || (items[itemKey] = { n: 0, ok: 0, miss: false })
      it.n++
      if (ok) it.ok++
      it.miss = !ok
      save('stats', totals)
      save('items', items)
    },
    recordRound(ex, score, total_) {
      const t = total(ex)
      t.rounds++
      // Bestwert bezieht sich wie bisher auf 10 Aufgaben
      t.best = Math.max(t.best, Math.round((score / total_) * 10))
      save('stats', totals)
    },
    accuracy(itemKey) {
      const it = items[itemKey]
      return it && it.n ? it.ok / it.n : null
    },
    // Häufig falsch beantwortete und neue Aufgaben kommen öfter dran.
    weight(itemKey) {
      const it = items[itemKey]
      if (!it || !it.n) return 2
      return 1 + 4 * (1 - it.ok / it.n) + (it.miss ? 3 : 0)
    },
    reset() {
      for (const k of Object.keys(totals)) delete totals[k]
      for (const k of Object.keys(items)) delete items[k]
      save('stats', totals)
      save('items', items)
    },
  }
}
