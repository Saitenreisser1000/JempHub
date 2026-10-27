// EarJemp: Übersicht, Einstellungen, Übung, Ergebnis und Fortschritt.
import { INTERVAL, INTERVALS, INTERVAL_PRESETS, CHORD, CHORDS, CHORD_PRESETS, INVERSION, INVERSIONS, INVERSION_PRESETS, SCALE, SCALES, SCALE_PRESETS, midiOf, noteLabel, clefFor, staffPos, transpose, chordNotes, invertNotes, inversionDegrees, scaleNotes, degreeLabel, spellMidi } from './theory.js'
import { INTERVAL_DEFAULTS, CHORD_DEFAULTS, INVERSION_DEFAULTS, SCALE_DEFAULTS, SCALE_TEMPO, genInterval, genChord, genInversion, genScale, intervalChoices, chordChoices, inversionChoices, scaleChoices, check, intervalKey, chordKey, inversionKey, scaleKey, MELODY_DEFAULTS, MELODY_LEVELS, genMelody, melodyKey, melodyHits, INTONATION_DEFAULTS, INTONATION_PRESETS, genIntonation, intonationChoices, intonationKey, targetCents } from './quiz.js'
import { keyboardHTML } from './keyboard.js'
import { createStore } from './stats.js'
import { staffSVG } from './staff.js'
import { fretboardSVG } from './fretboard.js'
import { t, setLang, getLang, detectLang } from './i18n.js'
import { createPlayer } from '../vendor/sounds/src/player.js'

const $ = (s) => document.querySelector(s)
const view = $('#view')
const store = createStore()
const player = createPlayer()
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const TONE_COLORS = ['#7cc4f2', '#f2c46d', '#8fd3a9', '#ef98c4']

setLang(detectLang(store.pref('lang', null)))
let instrument = store.pref('inst', 'piano') === 'guitar' ? 'guitar' : 'piano'
let auto = store.pref('auto', false)

// Gesamtzahlen der alten EarJemp-Version übernehmen (einmalig)
try {
  const old = JSON.parse(localStorage.getItem('earjemp-stats'))
  if (old && old.byExercise && !store.totals.intervals && !store.totals.chords) {
    for (const k of ['intervals', 'chords']) {
      const e = old.byExercise[k]
      if (e && e.total) store.totals[k] = { answered: e.total, correct: e.correct || 0, rounds: 0, best: 0 }
    }
  }
} catch { /* kein alter Stand */ }

/* ---------------------------------------------------------------- Übungen */

const nameOf = (item) => item[getLang()]
const MELODY_ITEMS = Object.keys(MELODY_LEVELS).map((l) => ({ id: l, de: [`Stufe ${l}`, ''], en: [`Level ${l}`, ''] }))
const EX = {
  intervals: {
    title: () => t('intervals'),
    defaults: INTERVAL_DEFAULTS, items: INTERVALS, byId: INTERVAL, presets: INTERVAL_PRESETS,
    gen: genInterval, key: intervalKey, choices: intervalChoices,
    thumb: () => staffSVG({ clef: 'treble', columns: [{ notes: [{ pos: -2 }] }, { notes: [{ pos: 2 }] }] }),
  },
  chords: {
    title: () => t('chords'),
    defaults: CHORD_DEFAULTS, items: CHORDS, byId: CHORD, presets: CHORD_PRESETS,
    gen: genChord, key: chordKey, choices: chordChoices,
    thumb: () => staffSVG({ clef: 'treble', columns: [{ notes: [{ pos: -2 }, { pos: 0 }, { pos: 2 }] }, { notes: [{ pos: -1 }, { pos: 1, acc: -1 }, { pos: 3 }] }] }),
  },
  inversions: {
    title: () => t('inversions'),
    defaults: INVERSION_DEFAULTS, items: INVERSIONS, byId: INVERSION, presets: INVERSION_PRESETS,
    gen: genInversion, key: inversionKey, choices: inversionChoices,
    thumb: () => staffSVG({ clef: 'treble', columns: [{ notes: [{ pos: -2 }, { pos: 0 }, { pos: 2 }] }, { notes: [{ pos: 0 }, { pos: 2 }, { pos: 5 }] }, { notes: [{ pos: 2 }, { pos: 5 }, { pos: 7 }] }] }),
  },
  scales: {
    title: () => t('scales'),
    defaults: SCALE_DEFAULTS, items: SCALES, byId: SCALE, presets: SCALE_PRESETS,
    gen: genScale, key: scaleKey, choices: scaleChoices,
    thumb: () => staffSVG({ clef: 'treble', columns: [-2, -1, 0, 1, 2].map((pos) => ({ notes: [{ pos }] })) }),
  },
  melody: {
    kind: 'melody',
    title: () => t('melody'),
    defaults: MELODY_DEFAULTS, items: MELODY_ITEMS, byId: Object.fromEntries(MELODY_ITEMS.map((i) => [i.id, i])),
    gen: genMelody, key: melodyKey,
    thumb: () => staffSVG({ clef: 'treble', columns: [0, 2, 1, 4, 3].map((pos) => ({ notes: [{ pos }] })) }),
  },
  intonation: {
    kind: 'intonation',
    title: () => t('intonation'),
    defaults: INTONATION_DEFAULTS, items: INTERVALS.filter((i) => INTONATION_PRESETS[4].includes(i.id)), byId: INTERVAL, presets: INTONATION_PRESETS,
    gen: genIntonation, key: intonationKey, choices: intonationChoices,
    thumb: () => staffSVG({ clef: 'treble', columns: [{ notes: [{ pos: 0 }, { pos: 4 }] }, { notes: [{ pos: 0 }, { pos: 4, acc: 1 }] }] }),
  },
}
const ORCHESTRA = ['strings', 'woodwinds', 'brass']
const DIRS = { intervals: ['up', 'down', 'harmonic'], scales: ['up', 'down', 'updown'] }
const PRESET_LABELS = {
  intervals: { de: ['1', '2', '3', '4'], en: ['1', '2', '3', '4'] },
  chords: { de: ['Dur/Moll', '+ verm./überm.', '+ sus', 'Septakkorde', 'Alle'], en: ['Major/minor', '+ dim/aug', '+ sus', 'Sevenths', 'All'] },
  inversions: { de: ['Dur', 'Dur/Moll', 'Dom7', 'Alle'], en: ['Major', 'Major/minor', 'Dom7', 'All'] },
  scales: { de: ['Dur/Moll', '+ harm./mel.', 'Modi', '+ lyd./lokr.', 'Alle'], en: ['Major/minor', '+ harm./mel.', 'Modes', '+ Lyd./Locr.', 'All'] },
  intonation: { de: ['8 · 5 · 4', '+ Terzen', '+ Sexten', 'Alle'], en: ['8 · 5 · 4', '+ thirds', '+ sixths', 'All'] },
}
const presetLabels = (ex) => Object.fromEntries(PRESET_LABELS[ex][getLang()].map((l, i) => [i + 1, l]))

function longName(exId, id) {
  const n = nameOf(EX[exId].byId[id])
  return n[0]
}
function shortName(exId, id) {
  const n = nameOf(EX[exId].byId[id])
  return n[1]
}
const fullName = (exId, id) => (shortName(exId, id) ? `${longName(exId, id)} (${shortName(exId, id)})` : longName(exId, id))

/* ---------------------------------------------------------------- Zustand */

const S = {
  route: 'home', phase: 'settings', settings: null,
  q: null, i: 0, score: 0, streak: 0, bestStreak: 0,
  result: null, answer: null, entry: [], missed: [], times: [], shownAt: 0, advanceT: 0, resetArmed: false,
}

function route() {
  clearTimeout(S.advanceT)
  player.stopAll()
  const h = location.hash.slice(1)
  S.route = EX[h] || h === 'progress' || h === 'about' ? h : 'home'
  if (EX[S.route]) {
    S.settings = store.settings(S.route, EX[S.route].defaults)
    S.phase = 'settings'
  }
  render()
  window.scrollTo(0, 0)
}
const go = (r) => {
  if (location.hash.slice(1) === r || (r === 'home' && !location.hash)) route()
  else location.hash = r === 'home' ? '' : r
}
window.addEventListener('hashchange', route)

function render() {
  renderChrome()
  if (S.route === 'home') return renderHome()
  if (S.route === 'progress') return renderProgress()
  if (S.route === 'about') return renderAbout()
  renderQuiz()
}

/* ---------------------------------------------------------------- Kopfzeile */

function renderChrome() {
  document.documentElement.lang = getLang()
  document.querySelectorAll('#langSeg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === getLang())))
  document.querySelectorAll('#instSeg button').forEach((b) => {
    b.textContent = t(b.dataset.inst)
    b.setAttribute('aria-pressed', String(b.dataset.inst === instrument))
  })
  $('#helpBtn').setAttribute('aria-label', t('keys'))
  $('#help').innerHTML = `<h3>${t('keys')}</h3><dl>
    <dt>Space</dt><dd>${t('kSpace')}</dd><dt>1 – 9, 0</dt><dd>${t('kDigits')}</dd>
    <dt>C</dt><dd>${t('kC')}</dd><dt>⌫</dt><dd>${t('kBack')}</dd><dt>Enter</dt><dd>${t('kEnter')}</dd><dt>Esc</dt><dd>${t('kEsc')}</dd></dl>`
}

/* ---------------------------------------------------------------- Übersicht */

function statLine(ex) {
  const s = store.totals[ex]
  if (!s || !s.answered) return `<span class="ex-stat">${t('notPracticed')}</span>`
  const p = Math.round((s.correct / s.answered) * 100)
  return `<span class="ex-stat"><i class="meter"><i style="width:${p}%"></i></i>${t('pctCorrect', { p, b: s.best })}</span>`
}

function renderHome() {
  view.innerHTML = `<section class="home">
    <div class="hero"><h1>${t('homeTitle')}</h1></div>
    <div class="ex-list">${Object.entries(EX).map(([id, ex]) => `<button class="ex-card" data-go="${id}">
      <span class="ex-thumb">${ex.thumb()}</span>
      <span class="ex-body"><b>${ex.title()}</b>${statLine(id)}</span></button>`).join('')}</div>
    <div class="home-foot"><button class="gbtn" data-go="progress">${t('progressLink')}</button><button class="gbtn" data-go="about">${t('aboutLink')}</button></div>
  </section>`
}

/* ---------------------------------------------------------------- Abspielen */

let playT = 0
function markPlaying(seconds) {
  const b = $('.playbtn')
  if (b) b.classList.add('playing')
  clearTimeout(playT)
  playT = setTimeout(() => { const x = $('.playbtn'); if (x) x.classList.remove('playing') }, seconds * 1000)
}

// Klang der aktuellen Übung: Intonation kann Orchesterklänge nutzen
const soundFor = () => (S.route === 'intonation' && ORCHESTRA.includes(S.settings?.sound) ? S.settings.sound : instrument)

async function prepareSound() {
  if (!player.ensure()) return
  const snd = soundFor()
  if (ORCHESTRA.includes(snd) && !player.sustainReady(snd)) {
    const l = $('#loading')
    if (l) l.textContent = t('loadingOrch')
    try { await player.loadSustain(snd) } catch { /* fällt auf Gitarre zurück */ }
    const l2 = $('#loading')
    if (l2) l2.textContent = ''
    return
  }
  if (snd === 'piano' && !player.pianoReady()) {
    const l = $('#loading')
    if (l) l.textContent = t('loading')
    try { await player.loadPiano() } catch { /* fällt auf Gitarre zurück */ }
    const l2 = $('#loading')
    if (l2) l2.textContent = ''
  }
}

// Spielt Töne; Rückgabe: Dauer in Sekunden
function playNotes(q, notes, offset = 0) {
  const t0 = player.now() + 0.05 + offset
  const opts = { instrument: soundFor() }
  if (q.type === 'intonation') return playVariants(q, notes, t0)
  if (q.type === 'interval') {
    const [a, b] = notes.map(midiOf)
    if (q.dir === 'harmonic') { player.note(a, t0, 1.6, opts); player.note(b, t0, 1.6, opts); return 1.7 }
    player.note(a, t0, 0.9, opts)
    player.note(b, t0 + 0.85, 1.3, opts)
    return 2.2
  }
  if (q.type === 'melody') {
    const beat = 60 / (Number(S.settings.bpm) || 80)
    notes.forEach((n, k) => player.note(midiOf(n), t0 + k * beat, Math.max(0.35, beat * 0.92), opts))
    return notes.length * beat + 0.8
  }
  if (q.type === 'scale') {
    const d = SCALE_TEMPO[S.settings.tempo] || SCALE_TEMPO.mid
    notes.forEach((n, k) => player.note(midiOf(n), t0 + k * d, k === notes.length - 1 ? 1.4 : d * 1.6, opts))
    return notes.length * d + 1.2
  }
  const ms = notes.map(midiOf)
  const mode = S.settings.play || 'block'
  let tt = t0
  if (mode === 'arp' || mode === 'both') {
    ms.forEach((m, k) => player.note(m, tt + k * 0.38, 1.3, opts))
    tt += ms.length * 0.38 + (mode === 'both' ? 0.35 : 0)
  }
  if (mode === 'block' || mode === 'both') ms.forEach((m) => player.note(m, tt, 1.6, opts))
  return tt - t0 + 1.7
}

// Intonation: notes = Liste der Fassungen (Indizes 0–2)
let variantT = []
function playVariants(q, which, t0) {
  const opts = { instrument: soundFor() }
  const a = midiOf(q.root), b = midiOf(q.other)
  const base = targetCents(q.id, S.settings.tuning) - (b - a) * 100
  const harmonic = S.settings.play === 'harmonic'
  const span = harmonic ? 2.1 : 2.5
  variantT.forEach(clearTimeout)
  variantT = []
  which.forEach((k, n) => {
    const tt = t0 + n * span
    if (harmonic) {
      player.note(a, tt, 1.6, opts)
      player.note(b, tt, 1.6, { ...opts, cents: base + q.offsets[k] })
    } else {
      player.note(a, tt, 0.95, opts)
      player.note(b, tt + 0.95, 1.2, { ...opts, cents: base + q.offsets[k] })
    }
    const delay = (tt - player.now()) * 1000
    variantT.push(setTimeout(() => markVariant(k, true), delay))
    variantT.push(setTimeout(() => markVariant(k, false), delay + span * 900))
  })
  return which.length * span
}
function markVariant(k, on) {
  const el = document.querySelector(`[data-variant="${k}"]`)
  if (el) el.classList.toggle('sounding', on)
}

async function playVariant(k) {
  await prepareSound()
  player.stopAll()
  markPlaying(playVariants(S.q, [k], player.now() + 0.05))
}

async function playQuestion() {
  await prepareSound()
  player.stopAll()
  markPlaying(playNotes(S.q, playOrder(S.q, S.q)))
}

// Töne in Abspielreihenfolge, für die Aufgabe selbst oder eine andere Antwort id
function playOrder(q, alt) {
  if (alt === q) return q.type === 'scale' ? q.seq : q.type === 'intonation' ? [0, 1, 2] : q.notes
  if (Array.isArray(alt)) return alt.map(spellMidi)
  const id = alt
  if (q.type === 'interval') {
    const iv = INTERVAL[id]
    return [q.root, transpose(q.root, iv.semis, iv.steps, q.dir === 'down' ? -1 : 1)]
  }
  if (q.type === 'inversion') {
    const item = INVERSION[id]
    // gleicher Basston wie in der Aufgabe, damit der Vergleich fair ist
    const notes = invertNotes(chordNotes(q.root, CHORD[item.chord]), item.inv)
    const shift = midiOf(q.notes[0]) - midiOf(notes[0])
    const oct = Math.round(shift / 12)
    return oct ? notes.map((n) => ({ ...n, o: n.o + oct })) : notes
  }
  if (q.type === 'scale') {
    const notes = scaleNotes(q.root, SCALE[id])
    return q.dir === 'down' ? [...notes].reverse() : q.dir === 'updown' ? notes.concat(notes.slice(0, -1).reverse()) : notes
  }
  return chordNotes(q.root, CHORD[id])
}

async function compare() {
  if (S.result !== 'bad') return
  await prepareSound()
  player.stopAll()
  const first = playNotes(S.q, playOrder(S.q, S.q))
  const second = playNotes(S.q, playOrder(S.q, S.answer), first + 0.4)
  markPlaying(first + 0.4 + second)
}

/* ---------------------------------------------------------------- Ablauf */

const ex = () => EX[S.route]
const roundLength = () => Number(S.settings.length) || 10
const weightFn = () => (S.settings.focus ? (k) => store.weight(k) : undefined)

function start() {
  clearTimeout(S.advanceT)
  Object.assign(S, { phase: 'playing', i: 0, score: 0, streak: 0, bestStreak: 0, missed: [], times: [], q: null })
  nextQuestion()
}

function nextQuestion() {
  S.q = ex().gen(S.settings, S.q, weightFn())
  S.result = null
  S.answer = null
  S.entry = S.q.type === 'melody' && S.settings.hint ? [S.q.midis[0]] : []
  render()
  S.shownAt = performance.now()
  playQuestion()
}

function submit(id) {
  if (S.result || S.phase !== 'playing') return
  const q = S.q
  const ok = check(q, id)
  S.answer = id
  S.result = ok ? 'ok' : 'bad'
  S.times.push(performance.now() - S.shownAt)
  if (ok) {
    S.score++
    S.streak++
    S.bestStreak = Math.max(S.bestStreak, S.streak)
  } else {
    S.streak = 0
    S.missed.push(q)
    if (q.type !== 'intonation') store.recordConfusion(ex().key(q.id), ex().key(id))
    navigator.vibrate?.(80)
  }
  store.recordAnswer(S.route, ex().key(q.id), ok)
  render()
  if (ok && auto) S.advanceT = setTimeout(advance, 1300)
}

function submitMelody() {
  const q = S.q
  if (S.result || S.phase !== 'playing' || S.entry.length < q.midis.length) return
  const ok = melodyHits(q, S.entry).every(Boolean)
  S.answer = [...S.entry]
  S.result = ok ? 'ok' : 'bad'
  S.times.push(performance.now() - S.shownAt)
  if (ok) {
    S.score++
    S.streak++
    S.bestStreak = Math.max(S.bestStreak, S.streak)
  } else {
    S.streak = 0
    S.missed.push(q)
    navigator.vibrate?.(80)
  }
  store.recordAnswer(S.route, melodyKey(q.id), ok)
  render()
  if (ok && auto) S.advanceT = setTimeout(advance, 1600)
}

const hintCount = () => (S.q && S.q.type === 'melody' && S.settings.hint ? 1 : 0)

async function pressKey(midi) {
  await prepareSound()
  player.note(midi, player.now() + 0.01, 0.7, { instrument })
  if (S.result || !S.q || S.entry.length >= S.q.midis.length) return
  S.entry.push(midi)
  render()
}

function undoKey(all = false) {
  if (S.result) return
  const keep = hintCount()
  if (S.entry.length <= keep) return
  S.entry = all ? S.entry.slice(0, keep) : S.entry.slice(0, -1)
  render()
}

function advance() {
  clearTimeout(S.advanceT)
  if (!S.result) return
  if (S.i + 1 >= roundLength()) {
    store.recordRound(S.route, S.score, roundLength())
    S.phase = 'result'
    player.stopAll()
    render()
    return
  }
  S.i++
  nextQuestion()
}

/* ---------------------------------------------------------------- Übungsansicht */

const BACK_ICON = '<svg width="18" height="18" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
const PLAY_ICON = '<svg width="30" height="30" viewBox="0 0 24 24"><path d="M8 5.2v13.6L19 12z" fill="currentColor"/></svg>'
const REPLAY_ICON = '<svg width="30" height="30" viewBox="0 0 24 24"><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4v3.7h3.7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'

function headHTML() {
  const playing = S.phase === 'playing'
  const sub = S.phase === 'settings' ? t('settings') : S.phase === 'result' ? t('result') : ''
  return `<div class="qhead">
    <button class="gbtn icon-only" data-go="home" aria-label="${t('back')}">${BACK_ICON}</button>
    <div><h2>${ex().title()}</h2>${sub ? `<span class="qsub">${sub}</span>` : ''}</div>
    ${playing ? `<div class="qstats"><span><b>${S.i + 1}</b>/${roundLength()}</span><span>✓ <b>${S.score}</b></span><span>${t('streak')} <b>${S.streak}</b></span></div>` : ''}
  </div>${playing ? `<div class="progress"><i style="width:${((S.i + (S.result ? 1 : 0)) / roundLength()) * 100}%"></i></div>` : ''}`
}

function segHTML(key, opts, value) {
  return `<div class="seg" data-set="${key}">${opts.map(([l, v]) => `<button data-v='${JSON.stringify(v)}' aria-pressed="${v === value}">${l}</button>`).join('')}</div>`
}

function renderMelodySettings() {
  const st = S.settings
  const lv = Number(st.level) || 1
  let rows = `<div class="vrow col"><span>${t('level')}</span>${segHTML('level', Object.keys(MELODY_LEVELS).map((l) => [t('mLevel' + l), Number(l)]), lv)}</div>`
  rows += `<div class="vrow"><span>${t('notesCount')}</span>${segHTML('notes', [4, 5, 6, 8, 10, 12].map((n) => [String(n), n]), Number(st.notes) || 5)}</div>`
  rows += `<div class="vrow"><span>${t('bpm')}</span>${segHTML('bpm', [60, 80, 100, 120, 140].map((n) => [String(n), n]), Number(st.bpm) || 80)}</div>`
  rows += `<div class="vrow"><span>${t('length')}</span>${segHTML('length', [['5', 5], ['10', 10], ['20', 20]], Number(st.length) || 10)}</div>`
  rows += `<div class="vrow"><span>${t('hint')}</span><button class="switch" data-toggle="hint" aria-pressed="${!!st.hint}" aria-label="${t('hint')}"></button></div>`
  rows += `<div class="vrow"><span>${t('auto')}</span><button class="switch" data-toggle="auto" aria-pressed="${auto}" aria-label="${t('auto')}"></button></div>`
  return `<div class="panel">${rows}</div>
    <div style="margin-top:14px"><button class="pbtn big" data-act="start">${t('start')}<span class="kbd">⏎</span></button></div>`
}

function renderSettings() {
  if (ex().kind === 'melody') return renderMelodySettings()
  const st = S.settings, id = S.route, e = ex()
  const labels = presetLabels(id)
  const presetOpts = Object.keys(e.presets).map((k) => [labels[k], Number(k)])
  presetOpts.push([t('custom'), 'custom'])
  const sel = new Set(e.choices(st))
  let rows = `<div class="vrow col"><span>${t('level')}</span>${segHTML('preset', presetOpts, st.preset)}
      <div class="pick" data-pick>${e.items.map((it) => `<button data-item="${it.id}" aria-pressed="${sel.has(it.id)}">${nameOf(it)[0]}${nameOf(it)[1] ? `<small>${nameOf(it)[1]}</small>` : ''}</button>`).join('')}</div></div>`
  if (id === 'intonation') {
    rows += `<div class="vrow"><span>${t('playback')}</span>${segHTML('play', [[t('melodic'), 'melodic'], [t('harmonic'), 'harmonic']], st.play)}</div>`
    rows += `<div class="vrow"><span>${t('cents')}</span>${segHTML('cents', [30, 20, 15, 10, 5].map((c) => [`±${c}`, c]), Number(st.cents) || 20)}</div>`
    rows += `<div class="vrow"><span>${t('tuning')}</span>${segHTML('tuning', [[t('equal'), 'equal'], [t('just'), 'just']], st.tuning)}</div>`
    rows += `<div class="vrow col"><span>${t('sound')}</span>${segHTML('sound', [[t('strings'), 'strings'], [t('woodwinds'), 'woodwinds'], [t('brass'), 'brass'], [t('headerSound'), 'header']], st.sound)}</div>`
  } else if (DIRS[id]) {
    const dirs = new Set(st.dirs || ['up'])
    rows += `<div class="vrow"><span>${t('direction')}</span><div class="pick" data-dirs style="padding:0">${DIRS[id].map((d) => `<button data-dir="${d}" aria-pressed="${dirs.has(d)}">${t(d)}</button>`).join('')}</div></div>`
    if (id === 'scales') rows += `<div class="vrow"><span>${t('tempo')}</span>${segHTML('tempo', [[t('slow'), 'slow'], [t('mid'), 'mid'], [t('fast'), 'fast']], st.tempo || 'mid')}</div>`
  } else {
    rows += `<div class="vrow"><span>${t('playback')}</span>${segHTML('play', [[t('block'), 'block'], [t('arp'), 'arp'], [t('both'), 'both']], st.play)}</div>`
  }
  rows += `<div class="vrow"><span>${t('roots')}</span>${segHTML('roots', [[t('natural'), 'natural'], [t('all'), 'all']], st.roots)}</div>`
  rows += `<div class="vrow"><span>${t('length')}</span>${segHTML('length', [['10', 10], ['20', 20], ['30', 30]], Number(st.length) || 10)}</div>`
  rows += `<div class="vrow"><span>${t('focus')}</span><button class="switch" data-toggle="focus" aria-pressed="${!!st.focus}" aria-label="${t('focus')}"></button></div>`
  rows += `<div class="vrow"><span>${t('auto')}</span><button class="switch" data-toggle="auto" aria-pressed="${auto}" aria-label="${t('auto')}"></button></div>`
  if (id !== 'intonation') rows += `<div class="vrow"><span>${t('fret')}</span><button class="switch" data-toggle="fretboard" aria-pressed="${!!st.fretboard}" aria-label="${t('fret')}"></button></div>`
  return `<div class="panel">${rows}</div>
    <div style="margin-top:14px"><button class="pbtn big" data-act="start">${t('start')}<span class="kbd">⏎</span></button></div>`
}

function staffFor(q) {
  const shown = S.result ? 'ok' : null
  const clef = clefFor(q.notes)
  const n = (note, state) => ({ pos: staffPos(note, clef), acc: note.a || undefined, state })
  let columns
  if (q.type === 'interval') {
    if (q.dir === 'harmonic') columns = S.result ? [{ notes: q.notes.map((x) => n(x, shown)) }] : [{ gap: true }]
    else columns = S.result ? q.notes.map((x) => ({ notes: [n(x, shown)] })) : [{ notes: [n(q.notes[0])] }, { gap: true }]
  } else if (q.type === 'scale') {
    const line = q.dir === 'down' ? [...q.notes].reverse() : q.notes
    columns = S.result ? line.map((x) => ({ notes: [n(x, shown)] })) : [{ notes: [n(line[0])] }, { gap: true }]
  } else {
    columns = S.result ? [{ notes: q.notes.map((x) => n(x, shown)) }] : [{ gap: true }]
  }
  return staffSVG({ clef, columns, label: ex().title(), colW: q.type === 'scale' && S.result ? 5.2 : 7.2 })
}

function fretTones(q) {
  if (q.type === 'interval') {
    return [{ midi: midiOf(q.root), label: '1', color: TONE_COLORS[0] }, { midi: midiOf(q.other), label: shortName('intervals', q.id), color: TONE_COLORS[1] }]
  }
  if (q.type === 'scale') {
    return q.notes.slice(0, -1).map((note, k) => ({ midi: midiOf(note), label: degreeLabel(q.root, note), color: k ? TONE_COLORS[1] : TONE_COLORS[0] }))
  }
  const degrees = q.type === 'inversion' ? inversionDegrees(INVERSION[q.id]) : CHORD[q.id].tones.map((x) => x[2])
  return q.notes.map((note, k) => ({ midi: midiOf(note), label: degrees[k], color: TONE_COLORS[k % TONE_COLORS.length] }))
}

function renderMelodyPlay() {
  const q = S.q, lang = getLang()
  const L = MELODY_LEVELS[q.id]
  const n = q.midis.length
  const many = n > 5
  const col = (m, state) => { const s = spellMidi(m); return { notes: [{ pos: staffPos(s, 'treble'), acc: s.a || undefined, state }] } }
  let staff
  if (!S.result) {
    const cols = S.entry.map((m, k) => col(m, k < hintCount() ? 'hint' : null))
    if (S.entry.length < n) cols.push({ gap: true })
    staff = staffSVG({ clef: 'treble', columns: cols, label: t('yourEntry'), colW: many ? 5.4 : 7.2 })
  } else {
    const hits = melodyHits(q, S.answer)
    staff = staffSVG({ clef: 'treble', columns: S.answer.map((m, k) => col(m, hits[k] ? 'ok' : 'bad')), label: t('yourEntry'), colW: many ? 5.4 : 7.2 })
    if (S.result === 'bad') staff += `<div class="lbl sol">${t('solution')}</div>` + staffSVG({ clef: 'treble', columns: q.midis.map((m) => col(m, 'ok')), label: t('solution'), colW: many ? 5.4 : 7.2 })
  }
  let html = `<div class="stagebox melody">
    <div><button class="playbtn" data-act="play" aria-label="${t('replay')}">${REPLAY_ICON}</button><span class="playlbl"><span class="kbd">␣</span></span></div>
    <div>${staff}</div>
  </div>
  <div class="qmeta">${Number(S.settings.bpm) || 80} BPM · ${t('nNotes', { n })}</div><div class="loading" id="loading"></div>`
  const names = q.notes.map((x) => noteLabel(x, lang)).join(' – ')
  if (!S.result) html += `<div class="feedback"><b class="count">${S.entry.length}/${n}</b></div>`
  else if (S.result === 'ok') html += `<div class="feedback ok"><span class="ic" aria-hidden="true">✓</span>${t('melodyRight', { n })}<small>${esc(names)}</small></div>`
  else html += `<div class="feedback bad"><span class="ic" aria-hidden="true">✕</span>${t('melodyWrong', { k: melodyHits(q, S.answer).filter(Boolean).length, n })}<small>${t('solution')}: ${esc(names)}</small></div>`
  const marks = {}
  if (S.result) q.midis.forEach((m) => { marks[m] = 'sol' })
  html += keyboardHTML({ low: L.low, high: L.high, lang, enabled: (m) => L.chromatic || spellMidi(m).a === 0, marks })
  if (!S.result) {
    const full = S.entry.length >= n
    html += `<div class="actions"><button class="sbtn" data-act="undo" ${S.entry.length > hintCount() ? '' : 'disabled'}>${t('undo')}<span class="kbd">⌫</span></button><button class="sbtn" data-act="clear" ${S.entry.length > hintCount() ? '' : 'disabled'}>${t('clear')}</button><button class="pbtn" data-act="check" ${full ? '' : 'disabled'}>${t('checkBtn')}<span class="kbd">⏎</span></button></div>`
  } else {
    const last = S.i + 1 >= roundLength()
    html += `<div class="actions">${S.result === 'bad' ? `<button class="sbtn" data-act="compare" title="${t('compareHint')}">${t('compare')}<span class="kbd">C</span></button>` : ''}<button class="pbtn" data-act="next">${last ? t('toResult') : t('next')}<span class="kbd">⏎</span></button></div>`
  }
  return html
}

function renderIntonationPlay() {
  const q = S.q, lang = getLang()
  const clef = clefFor(q.notes)
  const n = (note) => ({ pos: staffPos(note, clef), acc: note.a || undefined })
  const staff = staffSVG({ clef, columns: S.settings.play === 'harmonic' ? [{ notes: q.notes.map(n) }] : q.notes.map((x) => ({ notes: [n(x)] })), label: t('intonation') })
  const c = Number(S.settings.cents) || 20
  const meta = `${longName('intonation', q.id)} · ${t(S.settings.tuning === 'just' ? 'just' : 'equal')} · ±${c} ${t('centsUnit')}`
  let html = `<div class="stagebox">
    <div><button class="playbtn" data-act="play" aria-label="${t('replay')}">${REPLAY_ICON}</button><span class="playlbl"><span class="kbd">␣</span></span></div>
    <div>${staff}</div>
  </div>
  <div class="qmeta">${esc(meta)} · ${q.notes.map((x) => noteLabel(x, lang)).join(' – ')}</div><div class="loading" id="loading"></div>`
  if (!S.result) html += `<div class="feedback">${t('qIntonation')}</div>`
  else if (S.result === 'ok') html += `<div class="feedback ok"><span class="ic" aria-hidden="true">✓</span>${t('intoRight', { n: q.correct })}</div>`
  else html += `<div class="feedback bad"><span class="ic" aria-hidden="true">✕</span>${t('intoWrong', { n: q.correct })}</div>`
  const fmt = (o) => (o === 0 ? t('clean') : `${o > 0 ? '+' : '−'}${Math.abs(o)} ${t('centsUnit')}`)
  html += `<div class="answers variants">${q.offsets.map((o, k) => {
    const id = String(k + 1)
    let cl = ''
    if (S.result) cl = id === q.correct ? ' ok' : id === S.answer ? ' bad' : ' dim'
    return `<div class="variant${cl}" data-variant="${k}"><button class="abtn${cl}" data-ans="${id}" ${S.result ? 'disabled' : ''}><span class="long">${t('variant', { n: id })}</span>${S.result ? `<span class="short">${fmt(o)}</span>` : ''}<span class="k">${id}</span></button><button class="vplay" data-vplay="${k}" aria-label="${t('variant', { n: id })} ${t('listen')}">${PLAY_ICON}</button></div>`
  }).join('')}</div>`
  if (S.result) {
    const last = S.i + 1 >= roundLength()
    html += `<div class="actions"><button class="pbtn" data-act="next">${last ? t('toResult') : t('next')}<span class="kbd">⏎</span></button></div>`
  }
  return html
}

function renderPlay() {
  if (S.q.type === 'melody') return renderMelodyPlay()
  if (S.q.type === 'intonation') return renderIntonationPlay()
  const q = S.q, id = S.route
  const lang = getLang()
  const choices = ex().choices(S.settings)
  const ordered = ex().items.filter((it) => choices.includes(it.id))
  const meta = q.dir ? t('dir' + q.dir[0].toUpperCase() + q.dir.slice(1)) : t(S.settings.play || 'block')
  const noteNames = q.notes.map((x) => noteLabel(x, lang)).join(' – ')
  let html = `<div class="stagebox">
    <div><button class="playbtn" data-act="play" aria-label="${t('replay')}">${S.result || S.i > 0 || S.q ? REPLAY_ICON : PLAY_ICON}</button><span class="playlbl"><span class="kbd">␣</span></span></div>
    <div>${staffFor(q)}</div>
  </div>
  <div class="qmeta">${esc(meta)}</div><div class="loading" id="loading"></div>`
  if (!S.result) html += '<div class="feedback"></div>'
  else if (S.result === 'ok') html += `<div class="feedback ok"><span class="ic" aria-hidden="true">✓</span>${t('right', { x: esc(fullName(id, q.id)) })}<small>${esc(noteNames)}</small></div>`
  else html += `<div class="feedback bad"><span class="ic" aria-hidden="true">✕</span>${t('wrong', { x: esc(fullName(id, q.id)) })}<small>${t('chosen', { x: esc(fullName(id, S.answer)) })} · ${esc(noteNames)}</small></div>`
  html += `<div class="answers ivs">${ordered.map((it, k) => {
    let c = ''
    if (S.result) c = it.id === q.id ? ' ok' : it.id === S.answer ? ' bad' : ' dim'
    const n = nameOf(it)
    return `<button class="abtn${c}" data-ans="${it.id}" ${S.result ? 'disabled' : ''}><span class="long">${n[0]}</span>${n[1] ? `<span class="short">${n[1]}</span>` : ''}${k < 10 ? `<span class="k">${(k + 1) % 10}</span>` : ''}</button>`
  }).join('')}</div>`
  if (S.result) {
    const fret = S.settings.fretboard ? `<div class="where"><div class="lbl">${t('onGuitar')}</div>${fretboardSVG(fretTones(q), t('onGuitar'))}</div>` : ''
    const last = S.i + 1 >= roundLength()
    html += `<div class="reveal">${fret}<div class="actions">${S.result === 'bad' ? `<button class="sbtn" data-act="compare" title="${t('compareHint')}">${t('compare')}<span class="kbd">C</span></button>` : ''}<button class="pbtn" data-act="next">${last ? t('toResult') : t('next')}<span class="kbd">⏎</span></button></div></div>`
  }
  return html
}

function renderResult() {
  const len = roundLength(), r = S.score / len
  const msg = r === 1 ? t('resPerfect') : r >= 0.8 ? t('resGood') : r >= 0.5 ? t('resOk') : t('resKeep')
  const avg = S.times.length ? (S.times.reduce((a, b) => a + b, 0) / S.times.length / 1000).toFixed(1) : '–'
  const seen = new Set()
  const missed = S.missed.filter((q) => (seen.has(q.id) ? false : seen.add(q.id))).slice(0, 8)
  return `<div class="result">
    <div class="big">${S.score}<small> / ${len}</small></div>
    <p class="rmsg">${msg}</p>
    <div class="rstats"><span>${t('bestStreak')} <b>${S.bestStreak}</b></span><span>${t('avgTime', { s: getLang() === 'de' ? avg.replace('.', ',') : avg })}</span></div>
    ${missed.length ? `<div class="panel" style="text-align:left;padding:12px 16px"><div class="lbl">${t('missed')}</div><div class="chips">${missed.map((q) => `<span class="chip weak">${esc(fullName(S.route, q.id))}</span>`).join('')}</div></div>` : ''}
    <div class="ractions"><button class="pbtn" data-act="start">${t('again')}<span class="kbd">⏎</span></button><button class="gbtn" data-act="settings">${t('settings')}</button><button class="gbtn" data-go="home">${t('back')}</button></div>
  </div>`
}

function renderQuiz() {
  const body = S.phase === 'settings' ? renderSettings() : S.phase === 'result' ? renderResult() : renderPlay()
  view.innerHTML = `<section class="quiz">${headHTML()}${body}</section>`
}

/* ---------------------------------------------------------------- Fortschritt */

function accClass(a) {
  if (a === null) return ''
  return a >= 0.85 ? 'good' : a < 0.6 ? 'weak' : ''
}

function renderProgress() {
  const rows = Object.entries(EX).map(([id, e]) => {
    const s = store.totals[id]
    const p = s && s.answered ? Math.round((s.correct / s.answered) * 100) : null
    return `<div class="row"><span>${e.title()}</span><span class="ex-stat" style="margin:0">${p === null ? t('notPracticed') : `<i class="meter"><i style="width:${p}%"></i></i>${p} % · ${t('answers', { n: s.answered })} · ${t('rounds', { n: s.rounds })}`}</span></div>`
  }).join('')
  const sections = Object.entries(EX).map(([id, e]) => {
    const chips = e.items.map((it) => {
      const a = store.accuracy(e.key(it.id))
      return a === null ? '' : `<span class="chip ${accClass(a)}">${esc(fullName(id, it.id))} · ${Math.round(a * 100)} %</span>`
    }).filter(Boolean)
    const conf = store.topConfusions(e.key(''), 5).map((c) => {
      const a = c.actual.slice(2), b = c.chosen.slice(2)
      return e.byId[a] && e.byId[b] ? `<div class="row"><span>${t('heardAs', { a: esc(fullName(id, a)), b: esc(fullName(id, b)) })}</span><span class="ex-stat" style="margin:0">${t('times', { n: c.n })}</span></div>` : ''
    }).join('')
    return `<section><div class="panel"><b>${e.title()}</b>${chips.length ? `<div class="chips">${chips.join('')}</div>` : `<p class="muted">${t('noAnswers')}</p>`}
      ${conf ? `<div class="lbl" style="margin-top:14px">${t('confusions')}</div>${conf}` : ''}</div></section>`
  }).join('')
  view.innerHTML = `<section class="prog">
    <div class="qhead"><button class="gbtn icon-only" data-go="home" aria-label="${t('back')}">${BACK_ICON}</button><h2>${t('progress')}</h2></div>
    <div class="panel">${rows}</div>${sections}
    <div class="home-foot"><span></span><button class="gbtn" data-act="reset">${S.resetArmed ? t('resetConfirm') : t('reset')}</button></div>
  </section>`
}

/* ---------------------------------------------------------------- Über und Impressum */

function renderAbout() {
  view.innerHTML = `<section class="prog about">
    <div class="qhead"><button class="gbtn icon-only" data-go="home" aria-label="${t('back')}">${BACK_ICON}</button><h2>${t('aboutTitle')}</h2></div>
    <div class="panel"><p>${t('aboutP1')}</p><p>${t('aboutP2')}</p><p>${t('aboutP3')}</p></div>
    <section><div class="panel"><b>${t('legalTitle')}</b>
      <div class="row"><span class="muted">${t('legalOwner')}</span><span>Stefan Leutgeb</span></div>
      <div class="row"><span class="muted">${t('legalContact')}</span><a href="mailto:office@jemphub.com">office@jemphub.com</a></div>
      <div class="row"><span class="muted">${t('legalWebsite')}</span><span>earjemp.jemphub.com</span></div>
      <div class="row col"><span class="muted">${t('legalDirection')}</span><span>${t('legalDirectionText')}</span></div>
    </div></section>
    <section><div class="panel"><b>${t('creditsTitle')}</b><p class="muted">${t('credits')}</p></div></section>
    <p class="muted copy">JEMPCompany © ${new Date().getFullYear()} · office@jemphub.com</p>
  </section>`
}

/* ---------------------------------------------------------------- Ereignisse */

function saveSettings() { store.saveSettings(S.route, S.settings) }

view.addEventListener('click', (e) => {
  const b = e.target.closest('button')
  if (!b) return
  if (b.dataset.go) return go(b.dataset.go)
  const act = b.dataset.act
  if (act === 'start') { player.ensure(); return start() }
  if (act === 'next') return advance()
  if (act === 'play') return playQuestion()
  if (act === 'compare') return compare()
  if (act === 'settings') { S.phase = 'settings'; return render() }
  if (act === 'reset') {
    if (!S.resetArmed) { S.resetArmed = true; render(); setTimeout(() => { S.resetArmed = false; if (S.route === 'progress') render() }, 3000); return }
    S.resetArmed = false; store.reset(); return render()
  }
  if (b.dataset.ans) return submit(b.dataset.ans)
  if (b.dataset.key) return pressKey(Number(b.dataset.key))
  if (b.dataset.vplay) return playVariant(Number(b.dataset.vplay))
  if (act === 'undo') return undoKey()
  if (act === 'clear') return undoKey(true)
  if (act === 'check') return submitMelody()
  const seg = b.closest('[data-set]')
  if (seg) {
    const v = JSON.parse(b.dataset.v)
    S.settings[seg.dataset.set] = v
    if (seg.dataset.set === 'preset' && v !== 'custom') S.settings.selected = [...ex().presets[v]]
    saveSettings()
    return render()
  }
  if (b.dataset.item) {
    const cur = new Set(ex().choices(S.settings))
    if (cur.has(b.dataset.item)) { if (cur.size > 2) cur.delete(b.dataset.item) } else cur.add(b.dataset.item)
    S.settings.selected = ex().items.map((it) => it.id).filter((id) => cur.has(id))
    S.settings.preset = 'custom'
    saveSettings()
    return render()
  }
  if (b.dataset.dir) {
    const dirs = new Set(S.settings.dirs || ['up'])
    if (dirs.has(b.dataset.dir)) { if (dirs.size > 1) dirs.delete(b.dataset.dir) } else dirs.add(b.dataset.dir)
    S.settings.dirs = DIRS[S.route].filter((d) => dirs.has(d))
    saveSettings()
    return render()
  }
  if (b.dataset.toggle === 'auto') { auto = !auto; store.setPref('auto', auto); return render() }
  if (b.dataset.toggle) { S.settings[b.dataset.toggle] = !S.settings[b.dataset.toggle]; saveSettings(); return render() }
})

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return
  const k = e.key
  if (k === 'Escape') { $('#help').hidden = true; if (S.route !== 'home') go('home'); return }
  if (!EX[S.route]) return
  if (k === 'Enter') {
    e.preventDefault()
    if (S.phase !== 'playing') { player.ensure(); start() } else if (S.result) advance()
    else if (S.q && S.q.type === 'melody') submitMelody()
    return
  }
  if (S.phase !== 'playing') return
  if (k === ' ') { e.preventDefault(); return playQuestion() }
  if (k.toLowerCase() === 'c' && S.result === 'bad') return compare()
  if (S.result) return
  if (S.q && S.q.type === 'melody') {
    if (k === 'Backspace') { e.preventDefault(); undoKey() }
    return
  }
  if (S.q && S.q.type === 'intonation') {
    if (['1', '2', '3'].includes(k)) submit(k)
    return
  }
  if (/^[0-9]$/.test(k)) {
    const ordered = ex().items.filter((it) => ex().choices(S.settings).includes(it.id))
    const idx = k === '0' ? 9 : Number(k) - 1
    if (ordered[idx]) submit(ordered[idx].id)
  }
})

$('#langSeg').addEventListener('click', (e) => {
  const b = e.target.closest('button')
  if (!b) return
  setLang(b.dataset.lang)
  store.setPref('lang', getLang())
  render()
})
$('#instSeg').addEventListener('click', (e) => {
  const b = e.target.closest('button')
  if (!b) return
  instrument = b.dataset.inst === 'guitar' ? 'guitar' : 'piano'
  store.setPref('inst', instrument)
  renderChrome()
  if (S.phase === 'playing' && S.q) playQuestion()
})
$('#helpBtn').addEventListener('click', (e) => { e.stopPropagation(); const h = $('#help'); h.hidden = !h.hidden; $('#helpBtn').setAttribute('aria-expanded', String(!h.hidden)) })
document.addEventListener('click', (e) => { if (!e.target.closest('#help') && !e.target.closest('#helpBtn')) { $('#help').hidden = true; $('#helpBtn').setAttribute('aria-expanded', 'false') } })

route()
