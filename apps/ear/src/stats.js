// Fortschritt, Verwechslungen und Einstellungen im Browser speichern.

const PREFIX = 'earjemp:'

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
  const confusions = load('confusions', {}) // 'richtig>gewählt': Anzahl

  function total(ex) {
    if (!totals[ex]) totals[ex] = { answered: 0, correct: 0, rounds: 0, best: 0 }
    return totals[ex]
  }

  return {
    totals,
    items,
    confusions,
    settings(ex, defaults) {
      return load('settings:' + ex, defaults)
    },
    // Gespeicherte Einstellungen ohne Standardwerte (null, wenn nie gespeichert)
    savedSettings(ex) {
      try {
        const raw = storage?.getItem(PREFIX + 'settings:' + ex)
        const v = raw ? JSON.parse(raw) : null
        return v && typeof v === 'object' ? v : null
      } catch {
        return null
      }
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
    recordConfusion(actualKey, chosenKey) {
      const k = actualKey + '>' + chosenKey
      confusions[k] = (confusions[k] || 0) + 1
      save('confusions', confusions)
    },
    // Häufigste Verwechslungen, z. B. [{ actual: 'i:M6', chosen: 'i:P5', n: 3 }]
    topConfusions(prefix, limit = 5) {
      return Object.entries(confusions)
        .filter(([k]) => k.startsWith(prefix))
        .map(([k, n]) => { const [actual, chosen] = k.split('>'); return { actual, chosen, n } })
        .sort((a, b) => b.n - a.n)
        .slice(0, limit)
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
      for (const k of Object.keys(confusions)) delete confusions[k]
      save('stats', totals)
      save('items', items)
      save('confusions', confusions)
    },
  }
}
