const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B']

export function parseToneName(name = '') {
    const match = /^([A-G])([^0-9]*)(\d+)$/.exec(name)
    if (!match) return null
    return {
        letter: match[1],
        accidental: match[2] || '',
        octave: Number(match[3])
    }
}

export function shiftLetter(letter, steps) {
    const start = LETTERS.indexOf(letter)
    if (start < 0) return letter
    return LETTERS[((start + steps) % LETTERS.length + LETTERS.length) % LETTERS.length]
}

export function accidentalComplexity(accidental = '') {
    let weight = 0
    for (const c of accidental) {
        if (c === 'x') weight += 2
        else if (c === '#' || c === 'b') weight += 1
    }
    return weight
}

export function chooseBestSpelling(candidates, expectedLetter = '') {
    if (!Array.isArray(candidates) || !candidates.length) return null

    const scored = candidates.map((tone) => {
        const parsed = parseToneName(tone.name)
        const letterPenalty = expectedLetter && parsed && parsed.letter !== expectedLetter ? 10 : 0
        const complexity = parsed ? accidentalComplexity(parsed.accidental) : 99
        return { tone, score: letterPenalty + complexity }
    })

    scored.sort((a, b) => a.score - b.score)
    return scored[0].tone
}
