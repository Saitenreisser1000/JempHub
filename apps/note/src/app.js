// NoteJemp: Übersicht, Einstellungen, Übung, Ergebnis und Fortschritt.
import { LETTERS, BASES, CLEFS, VALUE_OF_DUR, OCTAVE_NAMES, OCTAVE_SHORT, midiOf, noteName, germanName, valueLabel } from './music.js'
import {
  NOTE_DEFAULTS, VALUE_DEFAULTS, MEASURE_DEFAULTS, NOTE_RANGES, VALUE_LEVELS,
  genNote, checkNote, noteKey, noteOctaves, genValue, checkValue, valueKey, genMeasure, checkMeasure, measureKey, measureLabel,
} from './quiz.js'
import { createStore } from './stats.js'
import { staffSVG } from './staff.js'
import { fretboardSVG } from './fretboard.js'
import { ensureAudio, clock, pluck, click } from './audio.js'

const $ = (s) => document.querySelector(s)
const view = $('#view')
const store = createStore()
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

const LENGTHS = [['10', 10], ['20', 20], ['30', 30]]
const EX = {
  notes: {
    title: 'Noten bestimmen',
    text: 'Violin- und Bassschlüssel, Hilfslinien, Vorzeichen',
    defaults: NOTE_DEFAULTS,
    options: [
      ['clef', 'Notenschlüssel', [['Violin', 'treble'], ['Bass', 'bass'], ['Beide', 'both']]],
      ['range', 'Tonraum', [['Im System', 0], ['+ Hilfslinien', 1], ['Weit', 2]]],
      ['accidentals', 'Vorzeichen ♯ ♭', [['Aus', false], ['An', true]]],
      ['octaves', 'Oktavlage (c, c1, c2 …)', [['Aus', false], ['An', true]]],
      ['fretboard', 'Lage auf der Gitarre zeigen', [['Aus', false], ['An', true]]],
    ],
    thumb: () => staffSVG({ clef: 'treble', items: [{ type: 'note', pos: 3, base: 4 }], minWidth: 11 }),
  },
  values: {
    title: 'Notenwerte & Pausen',
    text: 'Ganze bis Sechzehntel, auch punktiert',
    defaults: VALUE_DEFAULTS,
    options: [
      ['kind', 'Was üben?', [['Noten', 'note'], ['Pausen', 'rest'], ['Beides', 'both']]],
      ['level', 'Notenwerte', [['Ganze – Viertel', 0], ['+ Achtel', 1], ['+ Sechzehntel', 2]]],
      ['dotted', 'Punktierte Werte', [['Aus', false], ['An', true]]],
    ],
    thumb: () => staffSVG({ items: [{ type: 'note', pos: 4, base: 2 }, { type: 'rest', base: 4 }, { type: 'note', pos: 5, base: 8, dots: 1 }], minWidth: 11, top: 2, height: 12 }),
  },
  measures: {
    title: 'Takte vervollständigen',
    text: 'Welche Note oder Pause fehlt im Takt?',
    defaults: MEASURE_DEFAULTS,
    options: [
      ['meter', 'Taktart', [['2/4', '2/4'], ['3/4', '3/4'], ['4/4', '4/4'], ['6/8', '6/8'], ['3/8', '3/8'], ['Gemischt', 'mix']]],
      ['level', 'Notenwerte', [['Ganze – Viertel', 0], ['+ Achtel', 1], ['+ Punktierte, 16tel', 2]]],
      ['missing', 'Gesucht ist', [['Note', 'note'], ['Pause', 'rest'], ['Beides', 'both']]],
    ],
    thumb: () => staffSVG({ timeSig: [3, 4], items: [{ type: 'note', pos: 4, base: 4 }, { type: 'gap', dur: 4 }, { type: 'note', pos: 3, base: 4 }], bar: true }),
  },
}

const S = {
  route: 'home', phase: 'settings', settings: null,
  q: null, i: 0, score: 0, streak: 0, bestStreak: 0,
  result: null, answer: null, acc: 0, oct: null, needOct: false, dotted: false,
  missed: [], times: [], shownAt: 0, advanceT: 0, resetArmed: false,
}
let sound = store.pref('sound', true)
let auto = store.pref('auto', false)

/* ---------------------------------------------------------------- routing */

function route() {
  clearTimeout(S.advanceT)
  const h = location.hash.slice(1)
  S.route = EX[h] || h === 'progress' ? h : 'home'
  if (EX[S.route]) {
    S.settings = store.settings(S.route, EX[S.route].defaults)
    // Einstellungen von vor der Griffbrett-Option: Oktavlage auf den neuen Standard (an) setzen.
    const saved = store.savedSettings(S.route)
    if (S.route === 'notes' && saved && saved.fretboard === undefined) {
      S.settings.octaves = true
      S.settings.fretboard = false
      store.saveSettings(S.route, S.settings)
    }
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
  if (S.route === 'home') return renderHome()
  if (S.route === 'progress') return renderProgress()
  renderQuiz()
}

/* ---------------------------------------------------------------- home */

function statLine(ex) {
  const t = store.totals[ex]
  if (!t || !t.answered) return '<span class="ex-stat">Noch nicht geübt</span>'
  const pct = Math.round((t.correct / t.answered) * 100)
  return `<span class="ex-stat"><i class="meter"><i style="width:${pct}%"></i></i>${pct} % richtig · Bestwert ${t.best}/10</span>`
}

function renderHome() {
  view.innerHTML = `<section class="home">
    <div class="hero"><h1>Noten lesen, Schritt für Schritt</h1>
      <p>Wähle eine Übung. Was du oft falsch beantwortest, kommt öfter dran, bis es sitzt.</p></div>
    <div class="ex-list">${Object.entries(EX).map(([id, ex]) => `<button class="ex-card" data-go="${id}">
      <span class="ex-thumb">${ex.thumb()}</span>
      <span class="ex-body"><b>${ex.title}</b><span>${ex.text}</span>${statLine(id)}</span></button>`).join('')}</div>
    <div class="home-foot"><button class="gbtn" data-go="progress">Fortschritt ansehen →</button></div>
  </section>`
}

/* ---------------------------------------------------------------- quiz */

const ex = () => EX[S.route]
const roundLength = () => Number(S.settings.length) || 10

function start() {
  clearTimeout(S.advanceT)
  Object.assign(S, { phase: 'playing', i: 0, score: 0, streak: 0, bestStreak: 0, missed: [], times: [], q: null })
  nextQuestion()
}

function weightFn() {
  return S.settings.focus ? (k) => store.weight(k) : undefined
}

function nextQuestion() {
  const prev = S.q
  if (S.route === 'notes') S.q = genNote(S.settings, prev, weightFn())
  else if (S.route === 'values') S.q = genValue(S.settings, prev, weightFn())
  else S.q = genMeasure(S.settings, prev, weightFn())
  S.result = null
  S.answer = null
  S.acc = 0
  S.oct = null
  S.needOct = false
  S.dotted = false
  S.shownAt = performance.now()
  render()
}

function itemKey(q) {
  return S.route === 'notes' ? noteKey(q) : S.route === 'values' ? valueKey(q) : measureKey(q)
}

function submit(answer) {
  if (S.result || S.phase !== 'playing') return
  const q = S.q
  const ok = S.route === 'notes' ? checkNote(q, answer) : S.route === 'values' ? checkValue(q, answer) : checkMeasure(q, answer)
  S.answer = answer
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
  store.recordAnswer(S.route, itemKey(q), ok)
  render()
  playReveal(q)
  if (ok && auto) S.advanceT = setTimeout(advance, 900)
}

function advance() {
  clearTimeout(S.advanceT)
  if (!S.result) return
  if (S.i + 1 >= roundLength()) {
    store.recordRound(S.route, S.score, roundLength())
    S.phase = 'result'
    render()
    return
  }
  S.i++
  nextQuestion()
}

function playReveal(q) {
  if (!sound || !ensureAudio()) return
  const t0 = clock() + 0.03
  if (q.type === 'note') pluck(q.midi, t0, 1.2, 0.9)
  else if (q.type === 'value') {
    if (q.kind === 'note') pluck(midiOf('treble', q.pos), t0, (q.base * (q.dots ? 1.5 : 1) * 0.75) / 4, 0.85)
  } else {
    // Ganzer Takt mit der fehlenden Stelle, 90 Schläge pro Minute
    const six = 60 / 90 / 4
    const beat = q.meter.endsWith('/8') ? 2 : 4
    const list = q.elements.slice()
    const v = VALUE_OF_DUR[q.missing]
    list.splice(q.at, 0, { type: q.kind, ...v, pos: q.pos, dur: q.missing })
    let t = 0
    for (const e of list) {
      if (e.type === 'note') pluck(midiOf('treble', e.pos), t0 + t * six, e.dur * six * 0.95, 0.85)
      t += e.dur
    }
    for (let b = 0; b < q.bar; b += beat) click(t0 + b * six, b === 0)
  }
}

function headHTML() {
  const playing = S.phase === 'playing'
  const sub = S.phase === 'settings' ? 'Einstellungen' : S.phase === 'result' ? 'Ergebnis' : ''
  return `<div class="qhead">
    <button class="gbtn icon-only" data-go="home" aria-label="Zur Übersicht"><svg width="18" height="18" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    <div><h2>${ex().title}</h2>${sub ? `<span class="qsub">${sub}</span>` : ''}</div>
    ${playing ? `<div class="qstats"><span><b>${S.i + 1}</b>/${roundLength()}</span><span>✓ <b>${S.score}</b></span><span>Serie <b>${S.streak}</b></span></div>` : ''}
  </div>${playing ? `<div class="progress"><i style="width:${((S.i + (S.result ? 1 : 0)) / roundLength()) * 100}%"></i></div>` : ''}`
}

function segHTML(key, opts, value) {
  return `<div class="seg" data-set="${key}">${opts.map(([l, v]) => `<button data-v='${JSON.stringify(v)}' aria-pressed="${v === value}">${l}</button>`).join('')}</div>`
}

function renderSettings() {
  const st = S.settings
  return `<div class="panel">
    ${ex().options.map(([key, label, opts]) => `<div class="vrow"><span>${label}</span>${segHTML(key, opts, st[key])}</div>`).join('')}
    <div class="vrow"><span>Aufgaben pro Runde</span>${segHTML('length', LENGTHS.map(([l, v]) => [l, v]), Number(st.length) || 10)}</div>
    <div class="vrow"><span>Schwächen gezielt üben<small>Oft falsch Beantwortetes kommt öfter dran</small></span><button class="switch" data-toggle="focus" aria-pressed="${!!st.focus}" aria-label="Schwächen gezielt üben"></button></div>
    <div class="vrow"><span>Automatisch weiter<small>Nach einer richtigen Antwort ohne Tippen weiter</small></span><button class="switch" data-toggle="auto" aria-pressed="${auto}" aria-label="Automatisch weiter"></button></div>
  </div>
  <div style="margin-top:14px"><button class="pbtn big" data-act="start">Los geht's<span class="kbd">⏎</span></button></div>
  <p class="hintline">Am Computer geht alles auch mit der Tastatur, siehe <b>?</b> oben rechts.</p>`
}

function feedbackHTML(prompt, right, wrong, extra = '') {
  if (!S.result) return `<div class="feedback">${prompt}</div>`
  return S.result === 'ok'
    ? `<div class="feedback ok"><span class="ic" aria-hidden="true">✓</span>Richtig: ${right}${extra ? `<small>${extra}</small>` : ''}</div>`
    : `<div class="feedback bad"><span class="ic" aria-hidden="true">✕</span>Das war: ${wrong}${extra ? `<small>${extra}</small>` : ''}</div>`
}

const nextBtn = () => (S.result ? `<button class="pbtn big" data-act="next">${S.i + 1 >= roundLength() ? 'Zum Ergebnis' : 'Weiter'}<span class="kbd">⏎</span></button>` : '')

function cls(isRight, isChosen) {
  if (!S.result) return ''
  if (isRight) return ' ok'
  if (isChosen && S.result === 'bad') return ' bad'
  return ' dim'
}

function renderNotes() {
  const q = S.q
  const state = S.result || undefined
  const octs = !!S.settings.octaves
  const accs = !!S.settings.accidentals
  const name = octs ? q.fullName : q.name
  const instrument = q.clef === 'treble' ? 'guitar' : 'bass'
  const dis = S.result ? 'disabled' : ''
  let html = `<div class="stage">${staffSVG({ clef: q.clef, items: [{ type: 'note', pos: q.pos, base: 4, acc: q.acc || undefined, state }], minWidth: 17, label: 'Note im ' + CLEFS[q.clef].label })}</div>`
  if (S.needOct && !S.result) html += '<div class="feedback hint">Wähle zuerst die Oktave.</div>'
  else html += feedbackHTML(octs ? 'Welche Note ist das, mit Oktavlage?' : 'Welche Note ist das?', name, name, `${octs ? '' : q.fullName + ' · '}${OCTAVE_NAMES[q.octave]} · ${CLEFS[q.clef].label}`)
  if (accs || octs) {
    html += '<div class="accs">'
    if (accs) html += `<div class="seg">${[[0, '♮'], [1, '♯'], [-1, '♭']].map(([v, t]) => `<button data-acc="${v}" aria-pressed="${S.acc === v}" ${dis} aria-label="${v === 0 ? 'ohne Vorzeichen' : v > 0 ? 'Kreuz' : 'Be'}">${t}</button>`).join('')}</div>`
    if (octs) html += `<div class="seg" aria-label="Oktave">${noteOctaves(S.settings, q.clef).map((o, k) => `<button data-oct="${o}" aria-pressed="${S.oct === o}" ${dis} title="${OCTAVE_NAMES[o]}">${OCTAVE_SHORT[o]}<span class="kbd">${k + 1}</span></button>`).join('')}</div>`
    html += '</div>'
  }
  const accSel = accs ? S.acc : 0
  html += `<div class="answers letters">${LETTERS.map((l, i) => {
    const chosen = S.answer && S.answer.letter === i
    const nameFor = (acc, oct) => (octs && oct !== null && oct !== undefined ? germanName(i, acc, oct) : acc ? noteName(i, acc) : l)
    let label = nameFor(accSel, S.oct)
    let c = ''
    if (S.result) {
      // Gewählte falsche Antwort rot mit dem gewählten Namen, richtige Antwort grün mit dem vollen Namen.
      if (S.result === 'bad' && chosen) { c = ' bad'; label = nameFor(S.answer.acc ?? 0, S.answer.oct) }
      else if (i === q.letter) { c = ' ok'; label = octs ? q.fullName : q.name }
      else c = ' dim'
    }
    return `<button class="abtn${c}" data-letter="${i}" ${dis}>${label}<span class="k">${l.toLowerCase()}</span></button>`
  }).join('')}</div>`
  if (S.result) {
    const where = S.settings.fretboard ? `<div class="where"><div class="lbl">So liegt ${esc(q.fullName)} auf ${instrument === 'guitar' ? 'der Gitarre' : 'dem E-Bass'}</div>${fretboardSVG(q.midi, instrument, S.result === 'ok' ? '#8fd3a9' : '#d8b46a')}</div>` : ''
    html += `<div class="reveal">${where}${nextBtn()}</div>`
  }
  return html
}

function answerNote(letter) {
  if (S.settings.octaves && S.oct === null) {
    S.needOct = true
    return render()
  }
  submit({ letter, acc: S.settings.accidentals ? S.acc : 0, oct: S.settings.octaves ? S.oct : undefined })
}

function renderValues() {
  const q = S.q
  const state = S.result || undefined
  const item = q.kind === 'rest' ? { type: 'rest', base: q.base, dots: q.dots, state } : { type: 'note', pos: q.pos, base: q.base, dots: q.dots, state }
  const bases = VALUE_LEVELS[S.settings.level] ?? VALUE_LEVELS[1]
  let html = `<div class="stage">${staffSVG({ items: [item], minWidth: 12, top: 2, height: 12, label: q.kind === 'rest' ? 'Pause' : 'Note' })}</div>`
  html += feedbackHTML(q.kind === 'rest' ? 'Welche Pause ist das?' : 'Welcher Notenwert ist das?', q.label, q.label, q.beats)
  if (S.settings.dotted) html += `<div class="accs"><div class="seg"><button data-dot aria-pressed="${S.dotted}" ${S.result ? 'disabled' : ''}>${S.dotted ? '● Punktiert' : '○ Punktiert'}<span class="kbd">.</span></button></div></div>`
  html += `<div class="answers two">${bases.map((b, k) => {
    const chosen = S.answer && S.answer.base === b
    return `<button class="abtn txt${cls(b === q.base, chosen)}" data-base="${b}" ${S.result ? 'disabled' : ''}>${BASES[b].name}<span class="k">${k + 1}</span></button>`
  }).join('')}</div>`
  if (S.result) html += `<div class="reveal">${nextBtn()}</div>`
  return html
}

function renderMeasures() {
  const q = S.q
  const items = q.elements.map((e) => ({ ...e }))
  const v = VALUE_OF_DUR[q.missing]
  items.splice(q.at, 0, S.result ? { type: q.kind, ...v, pos: q.pos, state: 'ok' } : { type: 'gap', dur: q.missing })
  let html = `<div class="stage wide">${staffSVG({ clef: 'treble', timeSig: q.meter.split('/').map(Number), items, bar: true, minWidth: 30, label: q.meter + '-Takt mit Lücke' })}</div>`
  const right = measureLabel(q, q.missing)
  html += feedbackHTML(`Welche ${q.kind === 'rest' ? 'Pause' : 'Note'} fehlt im ${q.meter}-Takt?`, right, right)
  html += `<div class="answers two">${q.options.map((d, k) => {
    const vv = VALUE_OF_DUR[d]
    const it = q.kind === 'rest' ? { type: 'rest', ...vv } : { type: 'note', ...vv, pos: 5 }
    const chosen = S.answer && S.answer.dur === d
    return `<button class="abtn${cls(d === q.missing, chosen)}" data-dur="${d}" aria-label="${esc(measureLabel(q, d))}" ${S.result ? 'disabled' : ''}>${staffSVG({ items: [it], lines: false, minWidth: 7, top: 4, height: 9, label: measureLabel(q, d) })}<span class="k">${k + 1}</span></button>`
  }).join('')}</div>`
  if (S.result) html += `<div class="reveal">${nextBtn()}</div>`
  return html
}

function missedHTML(q) {
  if (q.type === 'note') return `<div class="miss">${staffSVG({ clef: q.clef, items: [{ type: 'note', pos: q.pos, base: 4, acc: q.acc || undefined }], minWidth: 13 })}<span>${q.fullName}</span></div>`
  if (q.type === 'value') {
    const it = q.kind === 'rest' ? { type: 'rest', base: q.base, dots: q.dots } : { type: 'note', pos: q.pos, base: q.base, dots: q.dots }
    return `<div class="miss">${staffSVG({ items: [it], minWidth: 9, top: 2, height: 12 })}<span>${q.label}</span></div>`
  }
  const vv = VALUE_OF_DUR[q.missing]
  const it = q.kind === 'rest' ? { type: 'rest', ...vv } : { type: 'note', ...vv, pos: 5 }
  return `<div class="miss">${staffSVG({ items: [it], lines: false, minWidth: 7, top: 4, height: 9 })}<span>${q.meter}: ${measureLabel(q, q.missing)}</span></div>`
}

function renderResult() {
  const len = roundLength()
  const r = S.score / len
  const msg = r === 1 ? 'Perfekt, alles richtig.' : r >= 0.8 ? 'Sehr gut. Fast alles sitzt.' : r >= 0.5 ? 'Gut gemacht. Mit ein paar Runden mehr sitzt der Rest auch.' : 'Dranbleiben: Die schwierigen Aufgaben kommen jetzt öfter, bis sie sitzen.'
  const avg = S.times.length ? (S.times.reduce((a, b) => a + b, 0) / S.times.length / 1000).toFixed(1).replace('.', ',') : '–'
  const seen = new Set()
  const missed = S.missed.filter((q) => { const k = itemKey(q); if (seen.has(k)) return false; seen.add(k); return true }).slice(0, 8)
  return `<div class="result">
    <div class="big">${S.score}<small> / ${len}</small></div>
    <p class="rmsg">${msg}</p>
    <div class="rstats"><span>Beste Serie <b>${S.bestStreak}</b></span><span>Ø <b>${avg} s</b> pro Antwort</span></div>
    ${missed.length ? `<div class="panel" style="text-align:left"><div class="lbl" style="padding-top:10px">Noch üben</div><div class="missed">${missed.map(missedHTML).join('')}</div></div>` : ''}
    <div class="ractions"><button class="pbtn" data-act="start">Nochmal<span class="kbd">⏎</span></button><button class="gbtn" data-act="settings">Einstellungen</button><button class="gbtn" data-go="home">Zur Übersicht</button></div>
  </div>`
}

function renderQuiz() {
  let body
  if (S.phase === 'settings') body = renderSettings()
  else if (S.phase === 'result') body = renderResult()
  else body = S.route === 'notes' ? renderNotes() : S.route === 'values' ? renderValues() : renderMeasures()
  view.innerHTML = `<section class="quiz">${headHTML()}${body}</section>`
}

/* ---------------------------------------------------------------- progress */

function accClass(a) {
  if (a === null) return 'none'
  return a >= 0.85 ? 'good' : a >= 0.6 ? 'mid' : 'weak'
}

function renderProgress() {
  const rows = Object.entries(EX).map(([id, e]) => {
    const t = store.totals[id]
    const pct = t && t.answered ? Math.round((t.correct / t.answered) * 100) : null
    return `<div class="row"><span>${e.title}</span><span class="ex-stat" style="margin:0">${pct === null ? 'noch nicht geübt' : `<i class="meter"><i style="width:${pct}%"></i></i>${pct} % · ${t.answered} ${t.answered === 1 ? 'Antwort' : 'Antworten'} · ${t.rounds} ${t.rounds === 1 ? 'Runde' : 'Runden'}`}</span></div>`
  }).join('')

  const [lo, hi] = NOTE_RANGES[2]
  const noteMap = (clef) => {
    const items = []
    const weak = []
    for (let pos = lo; pos <= hi; pos++) {
      const a = store.accuracy(`n:${clef}:${pos}:0`)
      items.push({ type: 'note', pos, base: 16, state: accClass(a) })
      const it = store.items[`n:${clef}:${pos}:0`]
      if (a !== null && a < 0.85) weak.push({ name: germanName(midiLetter(clef, pos), 0, Number(octaveLabel(clef, pos))), a, n: it.n })
    }
    weak.sort((x, y) => x.a - y.a)
    return `<div class="lbl" style="margin-top:6px">${CLEFS[clef].label}</div>
      <div class="scroll">${staffSVG({ clef, items, minWidth: 60, top: -3, height: 20, label: 'Treffsicherheit pro Note im ' + CLEFS[clef].label })}</div>
      ${weak.length ? `<div class="chips">${weak.slice(0, 8).map((w) => `<span class="chip weak">${w.name} · ${Math.round(w.a * 100)} %</span>`).join('')}</div>` : ''}`
  }

  const valueChips = []
  for (const kind of ['note', 'rest'])
    for (const base of [16, 8, 4, 2, 1])
      for (const dots of [0, 1]) {
        const a = store.accuracy(`v:${kind}:${base}:${dots}`)
        if (a !== null) valueChips.push(`<span class="chip ${accClass(a) === 'weak' ? 'weak' : accClass(a) === 'good' ? 'good' : ''}">${valueLabel(base, dots, kind)} · ${Math.round(a * 100)} %</span>`)
      }
  const measureChips = Object.keys(store.items).filter((k) => k.startsWith('m:')).map((k) => {
    const [, meter, d] = k.split(':')
    const a = store.accuracy(k)
    const v = VALUE_OF_DUR[d]
    return v ? `<span class="chip ${accClass(a) === 'weak' ? 'weak' : accClass(a) === 'good' ? 'good' : ''}">${meter}: ${BASES[v.base].name}${v.dots ? ', punktiert' : ''} · ${Math.round(a * 100)} %</span>` : ''
  })

  view.innerHTML = `<section class="prog">
    <div class="qhead"><button class="gbtn icon-only" data-go="home" aria-label="Zur Übersicht"><svg width="18" height="18" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button><h2>Fortschritt</h2></div>
    <div class="panel">${rows}</div>
    <section><div class="panel">
      <b>Notenkarte</b><p class="muted" style="margin:4px 0 0">Wie sicher du jede Note ohne Vorzeichen erkennst.</p>
      <div class="legend"><span><i style="background:var(--ok)"></i>sicher (ab 85 %)</span><span><i style="background:var(--mid)"></i>fast (60–84 %)</span><span><i style="background:var(--bad)"></i>üben (unter 60 %)</span><span><i style="background:var(--faint)"></i>noch nicht gefragt</span></div>
      ${noteMap('treble')}${noteMap('bass')}
    </div></section>
    <section><div class="panel"><b>Notenwerte & Pausen</b>${valueChips.length ? `<div class="chips">${valueChips.join('')}</div>` : '<p class="muted">Noch keine Antworten.</p>'}</div></section>
    <section><div class="panel"><b>Takte</b>${measureChips.length ? `<div class="chips">${measureChips.join('')}</div>` : '<p class="muted">Noch keine Antworten.</p>'}</div></section>
    <div class="home-foot"><span></span><button class="gbtn" data-act="reset">${S.resetArmed ? 'Wirklich alles zurücksetzen?' : 'Statistik zurücksetzen'}</button></div>
  </section>`
}

function midiLetter(clef, pos) {
  return (((CLEFS[clef].bottomStep + pos) % 7) + 7) % 7
}
function octaveLabel(clef, pos) {
  return String(Math.floor((CLEFS[clef].bottomStep + pos) / 7))
}

/* ---------------------------------------------------------------- events */

view.addEventListener('click', (e) => {
  const t = e.target.closest('button')
  if (!t) return
  if (t.dataset.go) return go(t.dataset.go)
  if (t.dataset.act === 'start') return start()
  if (t.dataset.act === 'next') return advance()
  if (t.dataset.act === 'settings') { S.phase = 'settings'; return render() }
  if (t.dataset.act === 'reset') {
    if (!S.resetArmed) { S.resetArmed = true; render(); setTimeout(() => { S.resetArmed = false; if (S.route === 'progress') render() }, 3000); return }
    S.resetArmed = false; store.reset(); return render()
  }
  const seg = t.closest('[data-set]')
  if (seg) {
    S.settings[seg.dataset.set] = JSON.parse(t.dataset.v)
    store.saveSettings(S.route, S.settings)
    return render()
  }
  if (t.dataset.toggle === 'focus') { S.settings.focus = !S.settings.focus; store.saveSettings(S.route, S.settings); return render() }
  if (t.dataset.toggle === 'auto') { auto = !auto; store.setPref('auto', auto); return render() }
  if (t.dataset.acc !== undefined) { S.acc = Number(t.dataset.acc); return render() }
  if (t.dataset.dot !== undefined) { S.dotted = !S.dotted; return render() }
  if (t.dataset.oct !== undefined) { S.oct = Number(t.dataset.oct); S.needOct = false; return render() }
  if (t.dataset.letter !== undefined) return answerNote(Number(t.dataset.letter))
  if (t.dataset.base !== undefined) return submit({ base: Number(t.dataset.base), dots: S.settings.dotted && S.dotted ? 1 : 0 })
  if (t.dataset.dur !== undefined) return submit({ dur: Number(t.dataset.dur) })
})

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return
  const k = e.key
  if (k === 'Escape') { $('#help').hidden = true; if (S.route !== 'home') go('home'); return }
  if (!EX[S.route]) return
  if (k === 'Enter' || (k === ' ' && S.phase !== 'playing')) {
    if (e.target.tagName === 'BUTTON' && k === ' ') return
    e.preventDefault()
    if (S.phase === 'settings' || S.phase === 'result') start()
    else if (S.result) advance()
    return
  }
  if (S.phase !== 'playing' || S.result) return
  const lower = k.toLowerCase()
  if (S.route === 'notes') {
    const i = LETTERS.findIndex((l) => l.toLowerCase() === lower)
    if (i >= 0) { e.preventDefault(); return answerNote(i) }
    if (S.settings.octaves) {
      const octs = noteOctaves(S.settings, S.q.clef), n = Number(k)
      if (n >= 1 && n <= octs.length) { S.oct = octs[n - 1]; S.needOct = false; return render() }
    }
    if (S.settings.accidentals && ['#', '+'].includes(k)) { S.acc = 1; return render() }
    if (S.settings.accidentals && k === '-') { S.acc = -1; return render() }
    if (S.settings.accidentals && (lower === 'n' || k === '0')) { S.acc = 0; return render() }
  }
  if (S.route === 'values') {
    if (k === '.' && S.settings.dotted) { S.dotted = !S.dotted; return render() }
    const bases = VALUE_LEVELS[S.settings.level] ?? VALUE_LEVELS[1]
    const n = Number(k)
    if (n >= 1 && n <= bases.length) return submit({ base: bases[n - 1], dots: S.settings.dotted && S.dotted ? 1 : 0 })
  }
  if (S.route === 'measures') {
    const n = Number(k)
    if (n >= 1 && n <= S.q.options.length) return submit({ dur: S.q.options[n - 1] })
  }
})

const soundBtn = $('#soundBtn')
function renderSound() {
  soundBtn.setAttribute('aria-pressed', String(sound))
  soundBtn.querySelector('.wave').style.opacity = sound ? 1 : 0.2
  soundBtn.title = sound ? 'Ton nach der Antwort: an' : 'Ton nach der Antwort: aus'
}
soundBtn.addEventListener('click', () => { sound = !sound; store.setPref('sound', sound); if (sound) ensureAudio(); renderSound() })
$('#helpBtn').addEventListener('click', (e) => { e.stopPropagation(); const h = $('#help'); h.hidden = !h.hidden; $('#helpBtn').setAttribute('aria-expanded', String(!h.hidden)) })
document.addEventListener('click', (e) => { if (!e.target.closest('#help') && !e.target.closest('#helpBtn')) { $('#help').hidden = true; $('#helpBtn').setAttribute('aria-expanded', 'false') } })

renderSound()
route()

