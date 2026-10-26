export const SHARP = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']
export const FLAT = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B']

export function useFlats(key) {
  if (!key) return false
  return key.m === 'major' ? [5, 10, 3, 8, 1, 6].includes(key.r) : [2, 7, 0, 5, 10, 3].includes(key.r)
}

export function pcName(pc, flats) {
  return (flats ? FLAT : SHARP)[((pc % 12) + 12) % 12]
}

export function midiOf(d, tuning) {
  return tuning[d.s] + d.f
}

export function noteName(d, tuning, flats, withOctave) {
  const m = midiOf(d, tuning)
  return pcName(m % 12, flats) + (withOctave ? Math.floor(m / 12) - 1 : '')
}

const CHORDS = [
  ['', [0, 4, 7]], ['m', [0, 3, 7]], ['7', [0, 4, 7, 10]], ['m7', [0, 3, 7, 10]], ['maj7', [0, 4, 7, 11]],
  ['5', [0, 7]], ['sus4', [0, 5, 7]], ['sus2', [0, 2, 7]], ['6', [0, 4, 7, 9]], ['m6', [0, 3, 7, 9]], ['dim', [0, 3, 6]],
]
const INTERVALS = {
  0: 'octave', 1: 'minor 2nd', 2: 'major 2nd', 3: 'minor 3rd', 4: 'major 3rd', 5: 'perfect 4th',
  6: 'tritone', 7: 'perfect 5th', 8: 'minor 6th', 9: 'major 6th', 10: 'minor 7th', 11: 'major 7th',
}

// Names a group of simultaneous dots: chord symbol, interval for two notes, or null.
export function harmony(dots, tuning, flats) {
  const mids = dots.map((d) => midiOf(d, tuning)).sort((a, b) => a - b)
  const pcs = [...new Set(mids.map((x) => x % 12))]
  const bass = mids[0] % 12
  if (pcs.length === 1) return { name: pcName(bass, flats), kind: 'octaves' }
  const roots = [bass].concat(pcs.filter((p) => p !== bass))
  for (const r of roots) {
    const rel = pcs.map((p) => (p - r + 12) % 12).sort((a, b) => a - b).join()
    for (const [suf, set] of CHORDS) {
      if (set.join() === rel && (set.length > 2 || suf === '5')) {
        return { name: pcName(r, flats) + suf + (r !== bass ? '/' + pcName(bass, flats) : ''), kind: 'chord' }
      }
    }
  }
  if (mids.length === 2) {
    return { name: pcName(mids[0] % 12, flats) + ' + ' + pcName(mids[1] % 12, flats), kind: INTERVALS[(mids[1] - mids[0]) % 12] }
  }
  return null
}
