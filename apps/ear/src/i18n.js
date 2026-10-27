// Texte auf Deutsch und Englisch.

const STR = {
  de: {
    homeTitle: 'Gehörbildung, Klang für Klang',
    intervals: 'Intervalle',
    chords: 'Akkorde',
    inversions: 'Umkehrungen',
    scales: 'Tonleitern',
    updown: 'Auf und ab', dirUpdown: 'auf und ab', tempo: 'Tempo', slow: 'Langsam', mid: 'Mittel', fast: 'Schnell',
    notPracticed: 'Noch nicht geübt', pctCorrect: '{p} % richtig · Bestwert {b}/10',
    progressLink: 'Fortschritt ansehen →', settings: 'Einstellungen', result: 'Ergebnis', back: 'Zur Übersicht',
    level: 'Stufe', custom: 'Eigene Auswahl',
    direction: 'Richtung', up: 'Aufwärts', down: 'Abwärts', harmonic: 'Gleichzeitig',
    playback: 'Wiedergabe', block: 'Zusammen', arp: 'Gebrochen', both: 'Beides',
    roots: 'Grundtöne', natural: 'Stammtöne', all: 'Alle',
    length: 'Aufgaben pro Runde', focus: 'Schwächen gezielt üben',
    auto: 'Automatisch weiter',
    fret: 'Lage auf der Gitarre zeigen',
    start: "Los geht's", replay: 'Nochmal hören', listen: 'Anhören',
    right: 'Richtig: {x}', wrong: 'Das war: {x}', chosen: 'Gewählt: {x}',
    compare: 'Vergleichen', compareHint: 'Spielt erst das richtige, dann das gewählte',
    next: 'Weiter', toResult: 'Zum Ergebnis', loading: 'Klavier wird geladen …',
    resPerfect: 'Perfekt!', resGood: 'Sehr gut!', resOk: 'Gut!', resKeep: 'Dranbleiben!',
    bestStreak: 'Beste Serie', avgTime: 'Ø {s} s pro Antwort', missed: 'Noch üben', again: 'Nochmal',
    progress: 'Fortschritt', confusions: 'Häufig verwechselt', heardAs: '{a} gehört als {b}', times: '{n}×',
    noAnswers: 'Noch keine Antworten.', reset: 'Statistik zurücksetzen', resetConfirm: 'Wirklich alles zurücksetzen?',
    answers: '{n} Antworten', rounds: '{n} Runden', streak: 'Serie',
    piano: 'Klavier', guitar: 'Gitarre', onGuitar: 'Auf der Gitarre',
    keys: 'Tastenkürzel', kSpace: 'Nochmal hören', kDigits: 'Antwort wählen', kC: 'Vergleichen (nach falscher Antwort)', kEnter: 'Starten, weiter', kEsc: 'Zurück zur Übersicht',
    melody: 'Melodiediktat', nNotes: '{n} Töne',
    notesCount: 'Töne pro Melodie', bpm: 'Tempo (BPM)', hint: 'Ersten Ton vorgeben',
    mLevel1: 'c1–g1', mLevel2: 'c1–c2',
    mLevel3: 'c1–c2 ♯♭', mLevel4: 'a–e2 ♯♭',
    undo: 'Zurück', clear: 'Löschen', checkBtn: 'Prüfen', yourEntry: 'Deine Eingabe', solution: 'Lösung',
    melodyRight: 'Richtig, alle {n} Töne', melodyWrong: '{k} von {n} Tönen richtig', kBack: 'Letzten Ton löschen (Melodie)',
    intonation: 'Intonation',
    qIntonation: 'Welche ist sauber?', variant: 'Fassung {n}', clean: 'sauber', playAll: 'Alle anhören',
    intoRight: 'Richtig: Fassung {n} war sauber', intoWrong: 'Sauber war Fassung {n}',
    melodic: 'Nacheinander', cents: 'Abweichung', centsUnit: 'Cent',
    tuning: 'Stimmung', equal: 'gleichstufig', just: 'rein',
    sound: 'Klang', strings: 'Streicher', woodwinds: 'Holzbläser', brass: 'Blechbläser', headerSound: 'Wie oben gewählt',
    loadingOrch: 'Orchesterklang wird geladen …',
    aboutLink: 'Über & Impressum', aboutTitle: 'Über EarJemp',
    aboutP1: 'EarJemp ist eine Software zum Training musikalischer Hörfähigkeiten.',
    aboutP2: 'Die App wird laufend weiterentwickelt.',
    aboutP3: 'Sie läuft am Computer, Tablet und Handy und lässt sich als Web-App auf den Startbildschirm legen.',
    legalTitle: 'Impressum / Offenlegung', legalOwner: 'Medieninhaber', legalContact: 'Kontakt', legalWebsite: 'Website',
    legalDirection: 'Grundlegende Richtung', legalDirectionText: 'Diese Website stellt eine private Software zum Training musikalischer Hörfähigkeiten vor. Die App befindet sich in Entwicklung.',
    creditsTitle: 'Schrift und Klänge', credits: 'Notenschrift Bravura von Steinberg Media Technologies, SIL Open Font License 1.1. Orchesterklänge aus Virtual Playing Orchestra (virtualplaying.com).',
    dirUp: 'aufwärts', dirDown: 'abwärts', dirHarmonic: 'gleichzeitig',
  },
  en: {
    homeTitle: 'Train your ear, one sound at a time',
    intervals: 'Intervals',
    chords: 'Chords',
    inversions: 'Inversions',
    scales: 'Scales',
    updown: 'Up and down', dirUpdown: 'up and down', tempo: 'Tempo', slow: 'Slow', mid: 'Medium', fast: 'Fast',
    notPracticed: 'Not practised yet', pctCorrect: '{p} % correct · best {b}/10',
    progressLink: 'View progress →', settings: 'Settings', result: 'Result', back: 'Back to overview',
    level: 'Level', custom: 'Custom',
    direction: 'Direction', up: 'Up', down: 'Down', harmonic: 'Together',
    playback: 'Playback', block: 'Block', arp: 'Broken', both: 'Both',
    roots: 'Root notes', natural: 'Naturals', all: 'All',
    length: 'Questions per round', focus: 'Practise weak spots',
    auto: 'Auto-advance',
    fret: 'Show on guitar',
    start: 'Start', replay: 'Play again', listen: 'Listen',
    right: 'Right: {x}', wrong: 'It was: {x}', chosen: 'You chose: {x}',
    compare: 'Compare', compareHint: 'Plays the right one, then your choice',
    next: 'Next', toResult: 'See result', loading: 'Loading piano …',
    resPerfect: 'Perfect!', resGood: 'Very good!', resOk: 'Good!', resKeep: 'Keep going!',
    bestStreak: 'Best streak', avgTime: 'avg {s} s per answer', missed: 'Practise these', again: 'Again',
    progress: 'Progress', confusions: 'Often mixed up', heardAs: '{a} heard as {b}', times: '{n}×',
    noAnswers: 'No answers yet.', reset: 'Reset statistics', resetConfirm: 'Really reset everything?',
    answers: '{n} answers', rounds: '{n} rounds', streak: 'Streak',
    piano: 'Piano', guitar: 'Guitar', onGuitar: 'On the guitar',
    keys: 'Keyboard shortcuts', kSpace: 'Play again', kDigits: 'Choose an answer', kC: 'Compare (after a wrong answer)', kEnter: 'Start, next', kEsc: 'Back to overview',
    melody: 'Melodic dictation', nNotes: '{n} notes',
    notesCount: 'Notes per melody', bpm: 'Tempo (BPM)', hint: 'Give the first note',
    mLevel1: 'C4–G4', mLevel2: 'C4–C5',
    mLevel3: 'C4–C5 ♯♭', mLevel4: 'A3–E5 ♯♭',
    undo: 'Undo', clear: 'Clear', checkBtn: 'Check', yourEntry: 'Your answer', solution: 'Solution',
    melodyRight: 'Right, all {n} notes', melodyWrong: '{k} of {n} notes right', kBack: 'Delete last note (melody)',
    intonation: 'Intonation',
    qIntonation: 'Which is in tune?', variant: 'Version {n}', clean: 'in tune', playAll: 'Play all',
    intoRight: 'Right: version {n} was in tune', intoWrong: 'Version {n} was in tune',
    melodic: 'One after another', cents: 'Deviation', centsUnit: 'cents',
    tuning: 'Tuning', equal: 'equal temperament', just: 'just',
    sound: 'Sound', strings: 'Strings', woodwinds: 'Woodwinds', brass: 'Brass', headerSound: 'As selected above',
    loadingOrch: 'Loading orchestra sound …',
    aboutLink: 'About & imprint', aboutTitle: 'About EarJemp',
    aboutP1: 'EarJemp is software for training musical listening skills.',
    aboutP2: 'The app is continuously being developed.',
    aboutP3: 'It runs on computers, tablets and phones and can be added to your home screen as a web app.',
    legalTitle: 'Imprint / Disclosure', legalOwner: 'Media owner', legalContact: 'Contact', legalWebsite: 'Website',
    legalDirection: 'Basic direction', legalDirectionText: 'This website presents private software for training musical listening skills. The app is still in development.',
    creditsTitle: 'Font and sounds', credits: 'Music font Bravura by Steinberg Media Technologies, SIL Open Font License 1.1. Orchestra sounds from Virtual Playing Orchestra (virtualplaying.com).',
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
