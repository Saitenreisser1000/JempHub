// Stücke: Noten in Schlägen. Jede Note: { at: Schlag (ab 0), len: Schläge, midi, vel: Anteil }.

// D-Dur-Akkorde für die Begleitung: Bass + zwei Mittelstimmen
const CH = {
  D: [50, 54, 57], A: [45, 52, 61], G: [43, 55, 59], E: [40, 56, 59], C: [48, 52, 55],
}

// Melodie aus [midi, Länge in Schlägen] (Pausen: midi = 0); Begleitung je Takt aus Akkordnamen
function melody(list, at0 = 0) {
  const out = []
  let at = at0
  for (const [midi, len] of list) {
    if (midi) out.push({ at, len, midi, vel: 1, mel: true })
    at += len
  }
  return out
}

// Übung: auf jeden Schlag ein kurzer Akkord, die Eins betont; Akkordfolge I–IV–V–I
export function exercise(meter, bars = 64) {
  const prog = ['D', 'G', 'A', 'D']
  const notes = []
  for (let b = 0; b < bars; b++) {
    const ch = CH[prog[b % prog.length]]
    for (let k = 0; k < meter; k++) {
      const at = b * meter + k
      // Eins: voller Akkord mit Bass, sonst nur die Mittelstimmen, leiser
      const tones = k === 0 ? ch : ch.slice(1)
      tones.forEach((midi) => notes.push({ at, len: k === 0 ? 0.9 : 0.6, midi, vel: k === 0 ? 1 : 0.6 }))
    }
  }
  return { id: 'ex' + meter, title: meter + '/4', meter, beats: bars * meter, notes, endless: true }
}

// Beethoven, „Ode an die Freude“ (gemeinfrei), 16 Takte im 4/4, D-Dur, eigener einfacher Satz
const MELODY = [
  [66, 1], [66, 1], [67, 1], [69, 1], [69, 1], [67, 1], [66, 1], [64, 1],
  [62, 1], [62, 1], [64, 1], [66, 1], [66, 1.5], [64, 0.5], [64, 2],
  [66, 1], [66, 1], [67, 1], [69, 1], [69, 1], [67, 1], [66, 1], [64, 1],
  [62, 1], [62, 1], [64, 1], [66, 1], [64, 1.5], [62, 0.5], [62, 2],
  [64, 1], [64, 1], [66, 1], [62, 1], [64, 1], [66, 0.5], [67, 0.5], [66, 1], [62, 1],
  [64, 1], [66, 0.5], [67, 0.5], [66, 1], [64, 1], [62, 1], [64, 1], [57, 2],
  [66, 1], [66, 1], [67, 1], [69, 1], [69, 1], [67, 1], [66, 1], [64, 1],
  [62, 1], [62, 1], [64, 1], [66, 1], [64, 1.5], [62, 0.5], [62, 2],
]
// Harmonie je halbem Takt
const HARM = [
  'D', 'D', 'D', 'A', 'D', 'D', 'D', 'A',
  'D', 'D', 'D', 'A', 'D', 'D', 'A', 'D',
  'A', 'D', 'A', 'D', 'A', 'D', 'D', 'A',
  'D', 'D', 'D', 'A', 'D', 'D', 'A', 'D',
]

export function ode() {
  const notes = []
  let at = 0
  for (const [midi, len] of MELODY) { notes.push({ at, len, midi, vel: 1, mel: true }); at += len }
  HARM.forEach((c, h) => {
    const [bass, a, b] = CH[c]
    notes.push({ at: h * 2, len: 2, midi: bass, vel: 0.75 })
    notes.push({ at: h * 2, len: 1, midi: a, vel: 0.5 }, { at: h * 2, len: 1, midi: b, vel: 0.5 })
    notes.push({ at: h * 2 + 1, len: 1, midi: a, vel: 0.45 }, { at: h * 2 + 1, len: 1, midi: b, vel: 0.45 })
  })
  return { id: 'ode', title: 'Ode an die Freude', label: '4/4', meter: 4, beats: 64, notes, endless: false }
}

// Kinderlied „Hänschen klein“ (gemeinfrei), 16 Takte im 2/4, C-Dur
const HAENSCHEN = [
  [67, 0.5], [64, 0.5], [64, 1], [65, 0.5], [62, 0.5], [62, 1], [60, 0.5], [62, 0.5], [64, 0.5], [65, 0.5], [67, 0.5], [67, 0.5], [67, 1],
  [67, 0.5], [64, 0.5], [64, 1], [65, 0.5], [62, 0.5], [62, 1], [60, 0.5], [64, 0.5], [67, 0.5], [67, 0.5], [60, 2],
  [62, 0.5], [62, 0.5], [62, 0.5], [62, 0.5], [62, 0.5], [64, 0.5], [65, 1], [64, 0.5], [64, 0.5], [64, 0.5], [64, 0.5], [64, 0.5], [65, 0.5], [67, 1],
  [67, 0.5], [64, 0.5], [64, 1], [65, 0.5], [62, 0.5], [62, 1], [60, 0.5], [64, 0.5], [67, 0.5], [67, 0.5], [60, 2],
]
const HAENSCHEN_HARM = ['C', 'G', 'C', 'C', 'C', 'G', 'C', 'C', 'G', 'G', 'C', 'C', 'C', 'G', 'C', 'C']

export function haenschen() {
  const notes = melody(HAENSCHEN)
  // Marsch-Begleitung: Bass auf 1, Akkord auf 2
  HAENSCHEN_HARM.forEach((c, b) => {
    const [bass, x, y] = CH[c]
    notes.push({ at: b * 2, len: 0.9, midi: bass, vel: 0.8 })
    notes.push({ at: b * 2 + 1, len: 0.6, midi: x, vel: 0.5 }, { at: b * 2 + 1, len: 0.6, midi: y, vel: 0.5 })
  })
  return { id: 'haenschen', title: 'Hänschen klein', label: '2/4', meter: 2, beats: 32, notes, endless: false }
}

// Eigener Walzer in G-Dur, 16 Takte im 3/4: Bass auf 1, Akkord auf 2 und 3
const WALZER = [
  [67, 2], [71, 1], [74, 3], [72, 2], [69, 1], [66, 3],
  [69, 2], [72, 1], [69, 1], [67, 1], [66, 1], [67, 2], [71, 1], [67, 3],
  [71, 2], [74, 1], [72, 3], [71, 2], [67, 1], [69, 3],
  [71, 1], [69, 1], [67, 1], [66, 2], [69, 1], [69, 2], [66, 1], [67, 3],
]
const WALZER_HARM = ['G', 'G', 'D', 'D', 'D', 'D', 'G', 'G', 'G', 'C', 'G', 'D', 'G', 'D', 'D', 'G']

export function walzer() {
  const notes = melody(WALZER)
  WALZER_HARM.forEach((c, b) => {
    const [bass, x, y] = CH[c]
    notes.push({ at: b * 3, len: 0.9, midi: bass, vel: 0.85 })
    for (const k of [1, 2]) notes.push({ at: b * 3 + k, len: 0.5, midi: x, vel: 0.45 }, { at: b * 3 + k, len: 0.5, midi: y, vel: 0.45 })
  })
  return { id: 'walzer', title: 'Walzer in G', label: '3/4', meter: 3, beats: 48, notes, endless: false }
}

// Eigene Barcarole in D-Dur im 6/8, dirigiert in 2 (ein Schlag = punktierte Viertel).
// Längen in Achteln: 3 Achtel = 1 Schlag.
const BARCAROLE = [
  [66, 2], [64, 1], [66, 3], [69, 2], [67, 1], [64, 3],
  [66, 2], [69, 1], [74, 3], [73, 2], [71, 1], [69, 3],
  [71, 2], [69, 1], [67, 2], [71, 1], [69, 2], [66, 1], [62, 3],
  [64, 2], [66, 1], [67, 2], [64, 1], [62, 6],
]
const BARCAROLE_HARM = ['D', 'A', 'D', 'A', 'G', 'D', 'A', 'D']

export function barcarole() {
  const notes = melody(BARCAROLE.map(([m, e]) => [m, e / 3]))
  // wiegende Begleitung: Bass auf dem Schlag, Akkord auf den Achteln 2 und 3
  BARCAROLE_HARM.forEach((c, b) => {
    const [bass, x, y] = CH[c]
    for (const beat of [0, 1]) {
      const at = b * 2 + beat
      notes.push({ at, len: 0.95, midi: bass, vel: beat ? 0.6 : 0.8 })
      for (const e of [1, 2]) notes.push({ at: at + e / 3, len: 0.3, midi: x, vel: 0.4 }, { at: at + e / 3, len: 0.3, midi: y, vel: 0.4 })
    }
  })
  return { id: 'barcarole', title: 'Barcarole in D', label: '6/8', meter: 2, beats: 16, notes, endless: false }
}

export const PIECES = { ex2: () => exercise(2), ex3: () => exercise(3), ex4: () => exercise(4), haenschen, walzer, ode, barcarole }

// Noten, die im Schlag beat beginnen (beat ≤ at < beat + 1)
export function notesInBeat(piece, beat) {
  return piece.notes.filter((n) => n.at >= beat && n.at < beat + 1)
}
