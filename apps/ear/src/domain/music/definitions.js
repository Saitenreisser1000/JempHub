const deepClone = (value) => JSON.parse(JSON.stringify(value))

const INTERVAL_OPTIONS = [
    {text: 'b2', labelKey: 'intervals.flat2', value: 1 , lineDist:1},
    {text: '2',  labelKey: 'intervals.major2', value: 2 , lineDist:1},
    {text: 'b3', labelKey: 'intervals.flat3', value: 3 , lineDist:2},
    {text: '3',  labelKey: 'intervals.major3', value: 4 , lineDist:2},
    {text: '4',  labelKey: 'intervals.perfect4', value: 5 , lineDist:3},
    {text: '#4', labelKey: 'intervals.tritone', value: 6 , lineDist:3},
    {text: '5',  labelKey: 'intervals.perfect5', value: 7 , lineDist:4},
    {text: 'b6', labelKey: 'intervals.flat6', value: 8 , lineDist:5},
    {text: '6',  labelKey: 'intervals.major6', value: 9 , lineDist:5},
    {text: 'b7', labelKey: 'intervals.flat7', value: 10, lineDist:6},
    {text: '7',  labelKey: 'intervals.major7', value: 11, lineDist:6},
    {text: '8',  labelKey: 'intervals.octave', value: 12, lineDist:7},
    {text: 'b9', labelKey: 'intervals.flat9', value: 13, lineDist:8},
    {text: '9',  labelKey: 'intervals.major9', value: 14, lineDist:8}
]

const DEFAULT_INTERVAL_VALUES = [2, 3, 4, 5, 7, 9, 11, 12]

const CHORD_OPTIONS = [
    {text: 'major', labelKey: 'chords.major', value: 1 , toneSteps:[4,3], lineDist:[2,2], maxRange: 7},
    {text: 'minor', labelKey: 'chords.minor', value: 0 , toneSteps:[3,4], lineDist:[2,2], maxRange: 7},
    {text: 'diminished', labelKey: 'chords.diminished', value: 2 , toneSteps:[3,3], lineDist:[2,2], maxRange: 6},
    {text: 'augmented', labelKey: 'chords.augmented', value: 3 , toneSteps:[4,4], lineDist:[2,2], maxRange: 8},
    {text: 'sus2', value: 4 , toneSteps:[2,5], lineDist:[1,3], maxRange: 7},
    {text: 'sus4', value: 5 , toneSteps:[5,2], lineDist:[3,1], maxRange: 7},
    {text: 'm7', value: 6 , toneSteps:[3,4,3], lineDist:[2,2,2], maxRange: 10},
    {text: 'm'+ String.fromCharCode(9651)+'7', value: 7 , toneSteps:[3,4,4], lineDist:[2,2,2], maxRange: 11},
    {text: '7', value: 8 , toneSteps:[4,3,3], lineDist:[2,2,2], maxRange: 10},
    {text: String.fromCharCode(9651)+'7', value: 9 , toneSteps:[4,3,4], lineDist:[2,2,2], maxRange: 11},
    {text: 'halfDim7', value: 10, toneSteps:[3,3,4], lineDist:[2,2,2], maxRange: 10},
    {text: 'dim7', value: 11, toneSteps:[3,3,3], lineDist:[2,2,2], maxRange: 9},
    {text: 'aug7', value: 12, toneSteps:[4,4,2], lineDist:[2,2,2], maxRange: 11},
]

const DEFAULT_CHORD_VALUES = [0, 1, 2, 3]

const SCALE_OPTIONS = [
    {text: 'major/ionian', labelKey: 'scales.ionian', value: 1 , scale: [2,2,1,2,2,2,1], maxRange: 7},
    {text: 'dorian', labelKey: 'scales.dorian', value: 2 , scale: [2,1,2,2,2,1,2], maxRange: 7},
    {text: 'phrygian', labelKey: 'scales.phrygian', value: 3 , scale: [1,2,2,2,1,2,2], maxRange: 7},
    {text: 'lydian', labelKey: 'scales.lydian', value: 4 , scale: [2,2,2,1,2,2,1], maxRange: 7},
    {text: 'mixolydian', labelKey: 'scales.mixolydian', value: 5 , scale: [2,2,1,2,2,1,2], maxRange: 7},
    {text: 'natural-minor', labelKey: 'scales.aeolian', value: 6 , scale: [2,1,2,2,1,2,2], maxRange: 7},
    {text: 'locrian', labelKey: 'scales.locrian', value: 7 , scale: [1,2,2,1,2,2,2], maxRange: 7},
    {text: 'melodic-minor', labelKey: 'scales.melodicMinor', value: 9 , scale: [2,1,2,2,2,2,1], maxRange: 7},
    {text: 'harmonic-minor', labelKey: 'scales.harmonicMinor', value:10 , scale: [2,1,2,2,1,3,1], maxRange: 7},
    {text: 'pentatonic major', labelKey: 'scales.pentatonicMajor', value:11 , scale: [2,2,3,2,3], maxRange: 7},
    {text: 'pentatonic minor', labelKey: 'scales.pentatonicMinor', value:12 , scale: [3,2,2,3,2], maxRange: 7},
]

const DEFAULT_SCALE_VALUES = [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12]

export const MELODY_LENGTH_OPTIONS = [
    { label: '4 Notes', value: 4 },
    { label: '5 Notes', value: 5 },
    { label: '6 Notes', value: 6 },
    { label: '8 Notes', value: 8 },
    { label: '10 Notes', value: 10 },
    { label: '12 Notes', value: 12 }
]

export const BPM_OPTIONS = [
    { label: '60', value: 60 },
    { label: '80', value: 80 },
    { label: '100', value: 100 },
    { label: '120', value: 120 },
    { label: '140', value: 140 },
    { label: '160', value: 160 }
]

export const DIFFICULTY_OPTIONS = ['easy', 'advanced', 'expert']

export const createIntervalOptions = () => deepClone(INTERVAL_OPTIONS)
export const createDefaultSelectedIntervals = () => INTERVAL_OPTIONS
    .filter((i) => DEFAULT_INTERVAL_VALUES.includes(i.value))
    .map((i) => deepClone(i))

export const createChordOptions = () => deepClone(CHORD_OPTIONS)
export const createDefaultSelectedChords = () => CHORD_OPTIONS
    .filter((c) => DEFAULT_CHORD_VALUES.includes(c.value))
    .map((c) => deepClone(c))

export const createScaleOptions = () => deepClone(SCALE_OPTIONS)
export const createDefaultSelectedScales = () => SCALE_OPTIONS
    .filter((s) => DEFAULT_SCALE_VALUES.includes(s.value))
    .map((s) => deepClone(s))
