// Texte auf Deutsch und Englisch.

const STR = {
  de: {
    homeTitle: 'Gehörbildung, Klang für Klang',
    homeText: 'Wähle eine Übung. Was du oft verwechselst, kommt öfter dran, bis du es sicher hörst.',
    intervals: 'Intervalle', intervalsText: 'Sekunde bis None, aufwärts, abwärts oder gleichzeitig',
    chords: 'Akkorde', chordsText: 'Dreiklänge und Septakkorde, zusammen oder gebrochen',
    inversions: 'Umkehrungen', inversionsText: 'Grundstellung, Sext- und Quartsextakkord, Septakkord-Umkehrungen',
    scales: 'Tonleitern', scalesText: 'Dur, Moll, Kirchentonarten und Pentatonik',
    qInversion: 'Welche Umkehrung hörst du?', qScale: 'Welche Tonleiter hörst du?',
    updown: 'Auf und ab', dirUpdown: 'auf und ab', tempo: 'Tempo', slow: 'Langsam', mid: 'Mittel', fast: 'Schnell',
    soon: 'Als Nächstes: Intonation und Melodie',
    notPracticed: 'Noch nicht geübt', pctCorrect: '{p} % richtig · Bestwert {b}/10',
    progressLink: 'Fortschritt ansehen →', settings: 'Einstellungen', result: 'Ergebnis', back: 'Zur Übersicht',
    level: 'Stufe', custom: 'Eigene Auswahl', selectHint: 'Antippen zum Hinzufügen oder Entfernen, mindestens zwei.',
    direction: 'Richtung', up: 'Aufwärts', down: 'Abwärts', harmonic: 'Gleichzeitig',
    playback: 'Wiedergabe', block: 'Zusammen', arp: 'Gebrochen', both: 'Beides',
    roots: 'Grundtöne', natural: 'Stammtöne', all: 'Alle',
    length: 'Aufgaben pro Runde', focus: 'Schwächen gezielt üben', focusHint: 'Oft Verwechseltes kommt öfter dran',
    auto: 'Automatisch weiter', autoHint: 'Nach einer richtigen Antwort ohne Tippen weiter',
    fret: 'Lage auf der Gitarre zeigen', fretHint: 'Nach der Antwort, mit Stufen (1, 3, 5 …)',
    start: "Los geht's", replay: 'Nochmal hören', listen: 'Anhören',
    qInterval: 'Welches Intervall hörst du?', qChord: 'Welchen Akkord hörst du?',
    right: 'Richtig: {x}', wrong: 'Das war: {x}', chosen: 'Gewählt: {x}',
    compare: 'Vergleichen', compareHint: 'Spielt erst das richtige, dann das gewählte',
    next: 'Weiter', toResult: 'Zum Ergebnis', loading: 'Klavier wird geladen …',
    resPerfect: 'Perfekt, alles richtig.', resGood: 'Sehr gut, fast alles sitzt.', resOk: 'Gut gemacht. Mit ein paar Runden mehr sitzt der Rest auch.', resKeep: 'Dranbleiben: Die Verwechslungen kommen jetzt öfter, bis du sie hörst.',
    bestStreak: 'Beste Serie', avgTime: 'Ø {s} s pro Antwort', missed: 'Noch üben', again: 'Nochmal',
    progress: 'Fortschritt', confusions: 'Häufig verwechselt', heardAs: '{a} gehört als {b}', times: '{n}×',
    noAnswers: 'Noch keine Antworten.', reset: 'Statistik zurücksetzen', resetConfirm: 'Wirklich alles zurücksetzen?',
    answers: '{n} Antworten', rounds: '{n} Runden', streak: 'Serie',
    piano: 'Klavier', guitar: 'Gitarre', onGuitar: 'Auf der Gitarre',
    keys: 'Tastenkürzel', kSpace: 'Nochmal hören', kDigits: 'Antwort wählen', kC: 'Vergleichen (nach falscher Antwort)', kEnter: 'Starten, weiter', kEsc: 'Zurück zur Übersicht',
    dirUp: 'aufwärts', dirDown: 'abwärts', dirHarmonic: 'gleichzeitig',
  },
  en: {
    homeTitle: 'Train your ear, one sound at a time',
    homeText: 'Pick an exercise. Whatever you often mix up comes back more often, until you hear it clearly.',
    intervals: 'Intervals', intervalsText: 'Seconds to ninths, up, down or together',
    chords: 'Chords', chordsText: 'Triads and seventh chords, block or broken',
    inversions: 'Inversions', inversionsText: 'Root position, first and second inversion, seventh-chord inversions',
    scales: 'Scales', scalesText: 'Major, minor, modes and pentatonics',
    qInversion: 'Which inversion do you hear?', qScale: 'Which scale do you hear?',
    updown: 'Up and down', dirUpdown: 'up and down', tempo: 'Tempo', slow: 'Slow', mid: 'Medium', fast: 'Fast',
    soon: 'Coming next: intonation and melody',
    notPracticed: 'Not practised yet', pctCorrect: '{p} % correct · best {b}/10',
    progressLink: 'View progress →', settings: 'Settings', result: 'Result', back: 'Back to overview',
    level: 'Level', custom: 'Custom', selectHint: 'Tap to add or remove, at least two.',
    direction: 'Direction', up: 'Up', down: 'Down', harmonic: 'Together',
    playback: 'Playback', block: 'Block', arp: 'Broken', both: 'Both',
    roots: 'Root notes', natural: 'Naturals', all: 'All',
    length: 'Questions per round', focus: 'Practise weak spots', focusHint: 'What you often mix up comes up more often',
    auto: 'Auto-advance', autoHint: 'Go on after a correct answer without tapping',
    fret: 'Show on guitar', fretHint: 'After answering, with degrees (1, 3, 5 …)',
    start: 'Start', replay: 'Play again', listen: 'Listen',
    qInterval: 'Which interval do you hear?', qChord: 'Which chord do you hear?',
    right: 'Right: {x}', wrong: 'It was: {x}', chosen: 'You chose: {x}',
    compare: 'Compare', compareHint: 'Plays the right one, then your choice',
    next: 'Next', toResult: 'See result', loading: 'Loading piano …',
    resPerfect: 'Perfect, all correct.', resGood: 'Very good, nearly everything is there.', resOk: 'Well done. A few more rounds and the rest will follow.', resKeep: 'Keep going: the mix-ups now come up more often until you hear them.',
    bestStreak: 'Best streak', avgTime: 'avg {s} s per answer', missed: 'Practise these', again: 'Again',
    progress: 'Progress', confusions: 'Often mixed up', heardAs: '{a} heard as {b}', times: '{n}×',
    noAnswers: 'No answers yet.', reset: 'Reset statistics', resetConfirm: 'Really reset everything?',
    answers: '{n} answers', rounds: '{n} rounds', streak: 'Streak',
    piano: 'Piano', guitar: 'Guitar', onGuitar: 'On the guitar',
    keys: 'Keyboard shortcuts', kSpace: 'Play again', kDigits: 'Choose an answer', kC: 'Compare (after a wrong answer)', kEnter: 'Start, next', kEsc: 'Back to overview',
    dirUp: 'up', dirDown: 'down', dirHarmonic: 'together',
  },
}

let lang = 'de'

export function detectLang(saved) {
  if (saved === 'de' || saved === 'en') return saved
  const nav = (globalThis.navigator?.language || 'de').toLowerCase()
  return nav.startsWith('de') ? 'de' : 'en'
}
export const setLang = (l) => { lang = l === 'en' ? 'en' : 'de' }
export const getLang = () => lang

export function t(key, vars) {
  let s = STR[lang][key] ?? STR.de[key] ?? key
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace('{' + k + '}', v)
  return s
}

export const KEYS = Object.keys(STR.de)
export const hasAllKeys = (l) => KEYS.every((k) => k in STR[l])
