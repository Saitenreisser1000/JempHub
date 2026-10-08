export function intervalStartMinIndex(max, difficulty) {
    if (difficulty === 'easy') return Math.floor(max * 0.35)
    if (difficulty === 'advanced') return Math.floor(max * 0.18)
    return 0
}

export function intervalValuesForDifficulty(difficulty) {
    if (difficulty === 'easy') return [2, 4, 5, 7, 9, 11, 12]
    if (difficulty === 'advanced') return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
}

export function intervalPlayOrderForDifficulty(difficulty) {
    if (difficulty === 'easy') return ['increase']
    if (difficulty === 'advanced') return ['increase', 'decrease']
    return ['increase', 'decrease', 'simultaneous']
}

export function scaleValuesForDifficulty(difficulty) {
    if (difficulty === 'scale1') return [1, 6]
    if (difficulty === 'scale2') return [1, 6, 9, 10]
    if (difficulty === 'scale3') return [1, 2, 3, 5, 6, 11, 12]
    if (difficulty === 'scale4') return [1, 2, 3, 4, 5, 6, 7, 11, 12]
    if (difficulty === 'scale5') return [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12]
    if (difficulty === 'easy') return [1, 2, 3, 5, 6, 11, 12]
    if (difficulty === 'advanced') return [1, 2, 3, 4, 5, 6, 7, 11, 12]
    return [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12]
}

export function chordValuesForDifficulty(difficulty) {
    if (difficulty === 'easy') return [0, 1, 2, 3]
    if (difficulty === 'advanced') return [0, 1, 2, 3, 6, 8, 9]
    return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
}

const DIATONIC_NOTE_RX = /^[A-G]\d$/

export function isDiatonicToneName(name = '') {
    return DIATONIC_NOTE_RX.test(name)
}

export function tonePoolConfig(difficulty) {
    if (difficulty === 'easy') {
        return { minToneId: 20, maxToneId: 27, diatonicOnly: true } // C3..G3 (5-note space)
    }
    if (difficulty === 'advanced') {
        return { minToneId: 20, maxToneId: 32, diatonicOnly: true } // C3..C4 (one octave, diatonic)
    }
    return { minToneId: 0, maxToneId: 44, diatonicOnly: false } // full available range incl. chromatic
}

export function matchesTonePool(tone, difficulty) {
    if (!tone) return false
    const cfg = tonePoolConfig(difficulty)
    if (tone.toneID < cfg.minToneId || tone.toneID > cfg.maxToneId) return false
    if (cfg.diatonicOnly && !isDiatonicToneName(tone.name)) return false
    return true
}

export function chordStartMinIndex(max, difficulty) {
    if (difficulty === 'easy') return 15
    if (difficulty === 'advanced') return 10
    return 4
}

export function scaleRootRange(difficulty) {
    if (difficulty === 'easy' || difficulty === 'scale1' || difficulty === 'scale3') return {min: 10, max: 20}
    if (difficulty === 'advanced' || difficulty === 'scale2' || difficulty === 'scale4') return {min: 7, max: 23}
    return {min: 5, max: 25}
}

export function melodyPitchPattern(difficulty) {
    if (difficulty === 'easy') return /^[A-G][34]$/
    if (difficulty === 'advanced') return /^[A-G][2-4]$/
    return /^[A-G][1-5]$/
}
