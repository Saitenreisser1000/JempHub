export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'H']

export const rand = (n) => Math.floor(Math.random() * n)
export const pick = (arr) => arr[rand(arr.length)]
export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Deutsche Notennamen: Cis, Des, Es, As, B (= H♭) ...
export function noteName(letterIdx, acc = 0) {
  const l = LETTERS[letterIdx]
  if (acc === 0) return l
  if (acc > 0) return l + 'is'
  if (l === 'H') return 'B'
  if (l === 'E' || l === 'A') return l === 'E' ? 'Es' : 'As'
  return l + 'es'
}

// Position 0 = untere Notenlinie, jede Stufe = halber Linienabstand
export const CLEFS = {
  treble: { label: 'Violinschlüssel', bottomStep: 30, name: 'Violinschlüssel' }, // E4
  bass: { label: 'Bassschlüssel', bottomStep: 18, name: 'Bassschlüssel' }, // G2
}

export const SHARPABLE = [0, 1, 3, 4, 5]
export const FLATTABLE = [1, 2, 4, 5, 6]

// Notenwerte in Sechzehntel-Einheiten
export const BASES = {
  16: { name: 'Ganze', beats: 4 },
  8: { name: 'Halbe', beats: 2 },
  4: { name: 'Viertel', beats: 1 },
  2: { name: 'Achtel', beats: 0.5 },
  1: { name: 'Sechzehntel', beats: 0.25 },
}

export const durOf = (base, dots = 0) => (dots ? base * 1.5 : base)

export function valueLabel(base, dots, kind) {
  const word = kind === 'rest' ? 'Pause' : 'Note'
  const name = BASES[base].name
  const core = base >= 8 ? `${name} ${word}` : `${name}${word.toLowerCase()}`
  return dots ? `Punktierte ${core}` : core
}

export function beatsText(base, dots) {
  const v = BASES[base].beats * (dots ? 1.5 : 1)
  const s = { 0.25: '¼', 0.5: '½', 0.75: '¾', 1.5: '1½', 3: '3' }[v] ?? String(v)
  return `${s} ${v <= 1 ? 'Schlag' : 'Schläge'}`
}
