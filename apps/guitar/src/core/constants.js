// Musical time: 24 ticks per quarter note, so 16ths (6), 8th triplets (8)
// and dotted 16ths (9) are all whole numbers.
export const TPQ = 24
export const S16 = 6
export const E8 = 12
export const Q4 = 24
export const H2 = 48
export const W1 = 96
export const T8 = 8

// Moment colours carry no musical meaning; they are the teacher's choice.
export const COLORS = ['#8fd3a9', '#7cc4f2', '#f2c46d', '#f28b7c', '#b9a3f2', '#5fd6cf', '#ef98c4', '#e8dcc0']
export const [SAGE, SKY, AMBER, CORAL, LILAC, TEAL, ROSE, SAND] = COLORS

// Tunings are listed from the highest-pitched string (index 0) to the lowest, as MIDI numbers.
export const STD = [64, 59, 55, 50, 45, 40]
export const DROPD = [64, 59, 55, 50, 45, 38]
export const BASS4 = [43, 38, 33, 28]

export const DUR_NAMES = {
  6: '16th', 12: '8th', 24: 'quarter', 48: 'half', 96: 'whole',
  9: 'dotted 16th', 18: 'dotted 8th', 36: 'dotted quarter', 72: 'dotted half', 144: 'dotted whole',
  4: '16th triplet', 8: '8th triplet', 16: 'quarter triplet', 32: 'half triplet',
}

export const TECH = { h: 'hammer-on', p: 'pull-off', sl: 'slide', b: 'bend', '~': 'vibrato' }
