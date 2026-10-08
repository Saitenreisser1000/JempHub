import { reactive } from 'vue'

const STORAGE_KEY = 'earjemp-locale'

export const LOCALES = [
    { value: 'en', label: 'English' },
    { value: 'de', label: 'Deutsch' }
]

export const messages = {
    en: {
        app: {
            menu: 'Menu',
            language: 'Language',
            level: 'Level',
            orientationTitle: 'Please rotate to portrait',
            orientationText: 'earJEMP is optimized for portrait mode.',
            soundLoad: 'sound load',
            soundLoading: 'loading sounds...',
            soundPreparing: 'preparing sounds...',
            soundReady: 'sounds ready',
            soundSlow: 'sound load slow, retrying...',
            soundFailed: 'sound load failed, tap play to retry',
            statistics: 'Statistics'
        },
        nav: {
            home: 'Home',
            intervals: 'Intervals',
            chords: 'Chords',
            inversions: 'Inversions',
            scales: 'Scales',
            intonation: 'Intonation',
            melody: 'Melody (beta)',
            about: 'About',
            legal: 'Imprint'
        },
        common: {
            easy: 'easy',
            advanced: 'advanced',
            expert: 'expert',
            options: 'options',
            autoplay: 'autoplay',
            resultDisplay: 'result display',
            difficulty: 'Difficulty',
            direction: 'Direction',
            firstToneOffset: '1st Tone Offset',
            up: 'up',
            down: 'down',
            start: 'Start',
            next: 'next',
            check: 'check',
            undo: 'undo',
            clear: 'clear',
            showFirstNote: 'show 1st note',
            selectMelodyLength: 'Select Melody Length',
            selectIntervals: 'Select Intervals',
            selectChords: 'Select Chords',
            selectInversions: 'Select Inversions',
            selectScales: 'Select Scales'
        },
        stats: {
            title: 'Statistics',
            total: 'Total',
            correct: 'Correct',
            accuracy: 'Accuracy',
            noResults: 'No results yet',
            reset: 'reset',
            attempts: 'attempts'
        },
        intro: {
            intervals: 'Train your musical ear by listening to intervals and choosing what you hear.',
            chords: 'Train your musical ear by listening to chords and choosing their quality.',
            inversions: 'Train your musical ear by listening to major and minor triad inversions.',
            scales: 'Train your musical ear by listening to scales and choosing the scale type.',
            intonation: 'Train your musical ear by choosing which interval is tuned correctly.',
            melody: 'Train your musical ear by listening to short melodies and entering the notes you hear.'
        },
        landing: {
            kicker: 'Ear training for musicians',
            copy: 'Practice intervals, chords, scales, and intonation in short focused sessions.',
            start: 'Start training',
            trainTitle: 'Choose an exercise',
            trainCopy: 'Jump straight into the listening task you want to sharpen today.'
        },
        about: {
            title: 'about',
            p1: 'This software was designed to train musical listening skills.',
            p2: 'The app is still in development.',
            p3: 'earJEMP is optimized for mobile devices in portrait mode.'
        },
        legal: {
            title: 'Imprint / Disclosure',
            ownerLabel: 'Media owner',
            owner: 'Stefan Leutgeb',
            contactLabel: 'Contact',
            websiteLabel: 'Website',
            directionLabel: 'Basic direction',
            direction: 'This website presents private software for training musical listening skills. The app is still in development.'
        },
        feedback: {
            chooseInversion: 'choose at least one inversion',
            chooseScale: 'choose at least one scale',
            chooseChord: 'choose at least one chord'
        },
        intervals: {
            flat2: 'b2',
            major2: '2',
            flat3: 'b3',
            major3: '3',
            perfect4: '4',
            tritone: '#4',
            perfect5: '5',
            flat6: 'b6',
            major6: '6',
            flat7: 'b7',
            major7: '7',
            octave: '8',
            flat9: 'b9',
            major9: '9'
        },
        inversions: {
            majorRoot: 'major root',
            majorFirst: 'major 1st inv.',
            majorSecond: 'major 2nd inv.',
            minorRoot: 'minor root',
            minorFirst: 'minor 1st inv.',
            minorSecond: 'minor 2nd inv.'
        },
        chords: {
            minor: 'minor',
            major: 'major',
            diminished: 'diminished',
            augmented: 'augmented'
        },
        scales: {
            major: 'major',
            minor: 'minor',
            ionian: 'major/ionian',
            dorian: 'dorian',
            phrygian: 'phrygian',
            lydian: 'lydian',
            mixolydian: 'mixolydian',
            aeolian: 'natural-minor',
            locrian: 'locrian',
            melodicMinor: 'melodic-minor',
            harmonicMinor: 'harmonic-minor',
            pentatonicMajor: 'pentatonic major',
            pentatonicMinor: 'pentatonic minor'
        },
        intonation: {
            tuning: 'Tuning',
            interval: 'Interval',
            equal: 'Equal temperament',
            just: 'Just intonation',
            sound: 'Sound',
            soundPiano: 'Piano',
            soundBrass: 'Brass',
            soundWoodwinds: 'Woodwinds',
            soundStrings: 'Strings',
            chooseCorrect: 'Choose the correct tuning',
            currentInterval: 'Played interval',
            tooHigh: 'too high',
            tooLow: 'too low',
            inTune: 'in tune',
            random: 'random',
            variant: 'Variant',
            minorThird: 'minor 3rd',
            majorThird: 'major 3rd',
            fourth: 'perfect 4th',
            fifth: 'perfect 5th',
            minorSixth: 'minor 6th',
            majorSixth: 'major 6th'
        }
    },
    de: {
        app: {
            menu: 'Menü',
            language: 'Sprache',
            level: 'Level',
            orientationTitle: 'Bitte auf Hochformat drehen',
            orientationText: 'earJEMP ist im Portrait-Modus optimiert.',
            soundLoad: 'Sounds laden',
            soundLoading: 'Sounds werden geladen...',
            soundPreparing: 'Sounds werden vorbereitet...',
            soundReady: 'Sounds bereit',
            soundSlow: 'Sound-Laden langsam, erneuter Versuch...',
            soundFailed: 'Sounds konnten nicht geladen werden, tippe auf Play',
            statistics: 'Statistik'
        },
        nav: {
            home: 'Home',
            intervals: 'Intervalle',
            chords: 'Akkorde',
            inversions: 'Umkehrungen',
            scales: 'Tonleitern',
            intonation: 'Intonation',
            melody: 'Melodie (Beta)',
            about: 'Über',
            legal: 'Impressum'
        },
        common: {
            easy: 'leicht',
            advanced: 'mittel',
            expert: 'schwer',
            options: 'Optionen',
            autoplay: 'Autoplay',
            resultDisplay: 'Anzeige Ergebnis',
            difficulty: 'Schwierigkeit',
            direction: 'Richtung',
            firstToneOffset: '1. Ton absetzen',
            up: 'auf',
            down: 'ab',
            start: 'Start',
            next: 'weiter',
            check: 'prüfen',
            undo: 'zurück',
            clear: 'löschen',
            showFirstNote: '1. Note anzeigen',
            selectMelodyLength: 'Melodielänge wählen',
            selectIntervals: 'Intervalle wählen',
            selectChords: 'Akkorde wählen',
            selectInversions: 'Umkehrungen wählen',
            selectScales: 'Tonleitern wählen'
        },
        stats: {
            title: 'Statistik',
            total: 'Gesamt',
            correct: 'Richtig',
            accuracy: 'Quote',
            noResults: 'Noch keine Ergebnisse',
            reset: 'zurücksetzen',
            attempts: 'Versuche'
        },
        intro: {
            intervals: 'Trainiere dein musikalisches Gehör, indem du Intervalle hörst und erkennst.',
            chords: 'Trainiere dein musikalisches Gehör, indem du Akkorde hörst und ihre Qualität erkennst.',
            inversions: 'Trainiere dein musikalisches Gehör mit Dur- und Moll-Dreiklängen in ihren Umkehrungen.',
            scales: 'Trainiere dein musikalisches Gehör, indem du Tonleitern hörst und ihren Typ erkennst.',
            intonation: 'Trainiere dein musikalisches Gehör, indem du die korrekt gestimmte Variante auswählst.',
            melody: 'Trainiere dein musikalisches Gehör, indem du kurze Melodien hörst und die Töne eingibst.'
        },
        landing: {
            kicker: 'Gehörtraining für Musiker:innen',
            copy: 'Übe Intervalle, Akkorde, Tonleitern und Intonation in kurzen fokussierten Einheiten.',
            start: 'Training starten',
            trainTitle: 'Übung wählen',
            trainCopy: 'Spring direkt zu der Hörübung, die du heute schärfen möchtest.'
        },
        about: {
            title: 'über',
            p1: 'Diese Software wurde zum Training musikalischer Hörfähigkeiten konzipiert.',
            p2: 'Die App befindet sich noch in Entwicklung.',
            p3: 'earJEMP ist für mobile Geräte im Portraitmodus optimiert.'
        },
        legal: {
            title: 'Impressum / Offenlegung',
            ownerLabel: 'Medieninhaber',
            owner: 'Stefan Leutgeb',
            contactLabel: 'Kontakt',
            websiteLabel: 'Website',
            directionLabel: 'Grundlegende Richtung',
            direction: 'Diese Website stellt eine private Software zum Training musikalischer Hörfähigkeiten vor. Die App befindet sich in Entwicklung.'
        },
        feedback: {
            chooseInversion: 'wähle mindestens eine Umkehrung',
            chooseScale: 'wähle mindestens eine Tonleiter',
            chooseChord: 'wähle mindestens einen Akkord'
        },
        intervals: {
            flat2: 'kl.2',
            major2: 'gr.2',
            flat3: 'kl.3',
            major3: 'gr.3',
            perfect4: '4',
            tritone: 'Trit.',
            perfect5: '5',
            flat6: 'kl.6',
            major6: 'gr.6',
            flat7: 'kl.7',
            major7: 'gr.7',
            octave: '8',
            flat9: 'kl.9',
            major9: 'gr.9'
        },
        inversions: {
            majorRoot: 'Dur Grundstellung',
            majorFirst: 'Dur 6',
            majorSecond: 'Dur 4 6',
            minorRoot: 'Moll Grundstellung',
            minorFirst: 'Moll 6',
            minorSecond: 'Moll 4 6'
        },
        chords: {
            minor: 'Moll',
            major: 'Dur',
            diminished: 'Vermindert',
            augmented: 'Übermäßig'
        },
        scales: {
            major: 'Dur',
            minor: 'Moll',
            ionian: 'Ionisch/Dur',
            dorian: 'Dorisch',
            phrygian: 'Phrygisch',
            lydian: 'Lydisch',
            mixolydian: 'Mixolydisch',
            aeolian: 'Aeolisch/Moll',
            locrian: 'Lokrisch',
            melodicMinor: 'Melodisch-Moll',
            harmonicMinor: 'Harmonisch-Moll',
            pentatonicMajor: 'Pentatonik Dur',
            pentatonicMinor: 'Pentatonik Moll'
        },
        intonation: {
            tuning: 'Stimmung',
            interval: 'Intervall',
            equal: 'Gleichstufig',
            just: 'Rein',
            sound: 'Klang',
            soundPiano: 'Klavier',
            soundBrass: 'Blechbläser',
            soundWoodwinds: 'Holzbläser',
            soundStrings: 'Streicher',
            chooseCorrect: 'Wähle die richtige Stimmung',
            currentInterval: 'Gespieltes Intervall',
            tooHigh: 'zu hoch',
            tooLow: 'zu tief',
            inTune: 'passt',
            random: 'random',
            variant: 'Variante',
            minorThird: 'kleine Terz',
            majorThird: 'große Terz',
            fourth: 'reine Quart',
            fifth: 'reine Quint',
            minorSixth: 'kleine Sext',
            majorSixth: 'große Sext'
        }
    }
}

function detectSystemLocale() {
    if (typeof navigator === 'undefined') return 'en'
    const languages = navigator.languages && navigator.languages.length
        ? navigator.languages
        : [navigator.language]

    return languages.some((language) => String(language).toLowerCase().startsWith('de'))
        ? 'de'
        : 'en'
}

function initialLocale() {
    const storedLocale = localStorage.getItem(STORAGE_KEY)
    if (messages[storedLocale]) return storedLocale
    return detectSystemLocale()
}

export const i18nState = reactive({
    locale: initialLocale()
})

function resolveMessage(locale, key) {
    return key.split('.').reduce((current, part) => current && current[part], messages[locale])
}

export function setLocale(locale) {
    if (!messages[locale]) return
    i18nState.locale = locale
    localStorage.setItem(STORAGE_KEY, locale)
}

export function translate(key) {
    return resolveMessage(i18nState.locale, key) || resolveMessage('en', key) || key
}

export function installI18n(app) {
    app.config.globalProperties.$t = translate
}
