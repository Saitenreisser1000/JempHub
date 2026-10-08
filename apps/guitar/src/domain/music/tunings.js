// Convention in this app: stringNumber 1 is the highest string (top row in the UI).
// Tunings list open-string MIDI notes from string 1..N.

export const TUNINGS = {
  'guitar-standard-e': {
    id: 'guitar-standard-e',
    label: 'Guitar Standard (EADGBE)',
    instrumentType: 'guitar',
    // E4, B3, G3, D3, A2, E2
    openMidi: [64, 59, 55, 50, 45, 40]
  },
  'bass-standard-e': {
    id: 'bass-standard-e',
    label: 'Bass Standard (EADG)',
    instrumentType: 'bass',
    // G2, D2, A1, E1
    openMidi: [43, 38, 33, 28]
  },
  'ukulele-standard-g': {
    id: 'ukulele-standard-g',
    label: 'Ukulele Standard (GCEA)',
    instrumentType: 'ukulele',
    // A4, E4, C4, G4 (re-entrant)
    openMidi: [69, 64, 60, 67]
  }
}

export function defaultTuningIdForInstrument(instrumentType) {
  switch (instrumentType) {
    case 'bass':
      return 'bass-standard-e'
    case 'ukulele':
      return 'ukulele-standard-g'
    case 'guitar':
    default:
      return 'guitar-standard-e'
  }
}

export function getTuning(tuningId) {
  return TUNINGS[tuningId] ?? null
}
