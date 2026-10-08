import { reactive, watch } from 'vue'

const PREFIX = 'notejemp:'

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback
  } catch {
    return fallback
  }
}

function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    /* Speicher nicht verfügbar */
  }
}

export function useSettings(key, defaults) {
  const state = reactive(load('settings:' + key, { ...defaults }))
  watch(state, () => save('settings:' + key, state), { deep: true })
  return state
}

export const stats = reactive(load('stats', {}))

function entry(key) {
  if (!stats[key]) stats[key] = { answered: 0, correct: 0, rounds: 0, best: 0 }
  return stats[key]
}

export function recordAnswer(key, ok) {
  const e = entry(key)
  e.answered++
  if (ok) e.correct++
  save('stats', stats)
}

export function recordRound(key, score) {
  const e = entry(key)
  e.rounds++
  e.best = Math.max(e.best, score)
  save('stats', stats)
}

export function resetStats() {
  for (const k of Object.keys(stats)) delete stats[k]
  save('stats', stats)
}
