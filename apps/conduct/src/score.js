// Stücke: Noten in Schlägen. Jede Note: { at: Schlag (ab 0), len: Schläge, midi, vel: Anteil }.

// D-Dur-Akkorde für die Begleitung: Bass + zwei Mittelstimmen
const CH = {
  D: [50, 54, 57], A: [45, 52, 61], G: [43, 55, 59], E: [40, 56, 59],
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
  return { id: 'ex' + meter, meter, beats: bars * meter, notes, endless: true }
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
  for (const [midi, len] of MELODY) { notes.push({ at, len, midi, vel: 1 }); at += len }
  HARM.forEach((c, h) => {
    const [bass, a, b] = CH[c]
    notes.push({ at: h * 2, len: 2, midi: bass, vel: 0.75 })
    notes.push({ at: h * 2, len: 1, midi: a, vel: 0.5 }, { at: h * 2, len: 1, midi: b, vel: 0.5 })
    notes.push({ at: h * 2 + 1, len: 1, midi: a, vel: 0.45 }, { at: h * 2 + 1, len: 1, midi: b, vel: 0.45 })
  })
  return { id: 'ode', meter: 4, beats: 64, notes, endless: false }
}

export const PIECES = { ex2: () => exercise(2), ex3: () => exercise(3), ex4: () => exercise(4), ode }

// Noten, die im Schlag beat beginnen (beat ≤ at < beat + 1)
export function notesInBeat(piece, beat) {
  return piece.notes.filter((n) => n.at >= beat && n.at < beat + 1)
}
