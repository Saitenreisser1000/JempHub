// ConductJemp: Kamera oder Maus liefern die Handbahn, Schlagpunkte steuern die Musik.
import { createBeatTracker, createTempo, dynamicsFrom, dynamicLabel, figureOk, figurePoints as idealPoints } from './conduct.js'
import { PIECES, notesInBeat } from './score.js'
import { createPlayer } from '../vendor/sounds/src/player.js'

const $ = (s) => document.querySelector(s)
const player = createPlayer()
const canvas = $('#canvas'), ctx = canvas.getContext('2d'), video = $('#video')
const BEAT_COLORS = ['#d8b46a', '#7cc4f2', '#8fd3a9', '#ef98c4']

const store = {
  get(k, d) { try { const v = localStorage.getItem('conductjemp:' + k); return v === null ? d : JSON.parse(v) } catch { return d } },
  set(k, v) { try { localStorage.setItem('conductjemp:' + k, JSON.stringify(v)) } catch { /* privat */ } },
}

const S = {
  pieceId: store.get('piece', 'ex4'),
  left: store.get('left', false), // Linkshänder: Figur gespiegelt
  input: null, // 'camera' | 'pointer'
  stopCam: null,
  tracker: createBeatTracker(),
  tempo: createTempo(),
  state: 'idle', // idle → prep (Auftakt) → play → done
  pos: 0, // nächster Schlag im Stück
  prepT: 0, lastBeatT: 0, vel: 0.6,
  barOne: null,
  trail: [], // { x, y, t } normiert
  marks: [], // Schlagpunkte { x, y, t, k, ok }
  log: [], // { bpm, ok, vel }
  hand: false,
}
let piece = PIECES[S.pieceId] ? PIECES[S.pieceId]() : PIECES.ex4()

/* ---------------------------------------------------------------- Klang */

let soundsReady = false
async function prepareSound() {
  if (!player.ensure() || soundsReady) return
  soundsReady = true
  try { await Promise.all([player.loadSustain('strings'), player.loadSustain('woodwinds')]) } catch { /* Gitarre als Ersatz */ }
}

// Noten des Schlags pos ab dem Schlagzeitpunkt t (Sekunden, performance-Uhr)
function playBeat(pos, t, interval) {
  const aNow = player.now(), pNow = performance.now() / 1000
  for (const n of notesInBeat(piece, pos)) {
    const start = t + (n.at - pos) * interval
    const when = Math.max(aNow + 0.005, aNow + (start - pNow))
    const melody = piece.id === 'ode' && n.vel === 1
    player.note(n.midi, when, Math.max(0.25, n.len * interval * 0.95), {
      instrument: melody ? 'woodwinds' : 'strings',
      vel: Math.min(1, n.vel * S.vel * (melody ? 1.1 : 0.85)),
    })
  }
}

/* ---------------------------------------------------------------- Schläge */

function onBeat(b) {
  S.tempo.beat(b.t)
  const meter = piece.meter
  if (S.state === 'idle' || S.state === 'done') {
    if (S.state === 'done') resetRun()
    S.state = 'prep'
    S.prepT = b.t
    S.lastBeatT = b.t
    S.vel = dynamicsFrom(b.size)
    mark(b, meter - 1, true, true)
    return
  }
  if (S.state === 'prep') {
    const d = b.t - S.prepT
    if (d < 0.25 || d > 2.5) { S.prepT = b.t; S.lastBeatT = b.t; mark(b, meter - 1, true, true); return }
    S.state = 'play'
  }
  const interval = S.tempo.interval || b.t - S.lastBeatT
  const k = S.pos % meter
  if (k === 0) S.barOne = b
  const scale = figureScale()
  const ok = figureOk(meter, k, S.barOne, b, scale, S.left)
  S.vel = 0.5 * S.vel + 0.5 * dynamicsFrom(b.size)
  playBeat(S.pos, b.t, interval)
  S.log.push({ bpm: 60 / interval, ok, vel: S.vel })
  mark(b, k, ok, false)
  S.lastBeatT = b.t
  S.pos++
  if (!piece.endless && S.pos >= piece.beats) {
    S.state = 'done'
    setTimeout(showResult, Math.min(3000, interval * 2.5 * 1000))
  }
  renderStats()
}

function mark(b, k, ok, prep) {
  S.marks.push({ x: b.x, y: b.y, t: b.t, k, ok, prep })
  if (S.marks.length > 12) S.marks.shift()
  const el = $('#beatNum')
  el.textContent = prep ? '·' : String(k + 1)
  el.classList.toggle('muted', prep)
  el.classList.add('on')
  clearTimeout(mark.tm)
  mark.tm = setTimeout(() => el.classList.remove('on'), 120)
}

// Größe der Figur aus den letzten Schlagpunkten (für die Toleranz der Prüfung)
function figureScale() {
  const pts = S.marks.slice(-piece.meter * 2)
  if (pts.length < 2) return 0.2
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y)
  return Math.max(0.08, Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys))
}

function pushPoint(x, y, t) {
  if (x === null) { S.hand = false; return }
  S.hand = true
  S.trail.push({ x, y, t })
  while (S.trail.length && t - S.trail[0].t > 1.6) S.trail.shift()
  const b = S.tracker.push(x, y, t)
  if (b) onBeat(b)
}

// Pause, wenn keine Schläge mehr kommen
function watchdog(now) {
  if (S.state !== 'play' && S.state !== 'prep') return
  const iv = S.tempo.interval || 0.8
  if (now - S.lastBeatT > Math.max(1.6, iv * 2.2)) {
    S.state = 'idle'
    S.tracker.reset()
    S.tempo.reset()
    renderStats()
  }
}

function resetRun() {
  S.state = 'idle'
  S.pos = 0
  S.log = []
  S.marks = []
  S.barOne = null
  S.tracker.reset()
  S.tempo.reset()
  $('#result').hidden = true
  renderStats()
}

/* ---------------------------------------------------------------- Zeichnen */

function resize() {
  const r = canvas.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1)
  canvas.width = Math.round(r.width * dpr)
  canvas.height = Math.round(r.height * dpr)
}
window.addEventListener('resize', resize)

// normierte Kamerakoordinaten → Bühne (Video wird mit object-fit: cover gezeigt)
function toStage(x, y) {
  const W = canvas.width, H = canvas.height
  if (S.input === 'camera' && video.videoWidth) {
    const s = Math.max(W / video.videoWidth, H / video.videoHeight)
    const w = video.videoWidth * s, h = video.videoHeight * s
    return [x * w + (W - w) / 2, y * h + (H - h) / 2]
  }
  return [x * W, y * H]
}

// Idealfigur: Schlagpunkte mit Bögen dazwischen, mittig auf der Bühne
function figurePoints() {
  return idealPoints(piece.meter, S.left).map(([x, y]) => [0.5 + (x - 0.5) * 0.7, 0.18 + y * 0.7])
}

function draw(now) {
  const W = canvas.width, H = canvas.height, u = Math.min(W, H) / 400
  ctx.clearRect(0, 0, W, H)
  // Idealfigur
  const fp = figurePoints().map(([x, y]) => toStage(x, y))
  ctx.save()
  ctx.setLineDash([3 * u, 6 * u])
  ctx.strokeStyle = 'rgba(230,235,228,.22)'
  ctx.lineWidth = 2 * u
  ctx.beginPath()
  fp.forEach((p, i) => {
    const q = fp[(i + 1) % fp.length]
    const lift = Math.hypot(q[0] - p[0], q[1] - p[1]) * 0.18 + 18 * u
    if (i === 0) ctx.moveTo(p[0], p[1])
    ctx.quadraticCurveTo((p[0] + q[0]) / 2, Math.min(p[1], q[1]) - lift, q[0], q[1])
  })
  ctx.stroke()
  ctx.restore()
  const cur = S.state === 'play' ? S.pos % piece.meter : 0
  fp.forEach(([x, y], i) => {
    const next = i === cur && S.state !== 'done'
    ctx.beginPath()
    ctx.arc(x, y, (next ? 15 : 12) * u, 0, Math.PI * 2)
    ctx.fillStyle = next ? 'rgba(216,180,106,.22)' : 'rgba(230,235,228,.06)'
    ctx.fill()
    ctx.strokeStyle = next ? '#d8b46a' : 'rgba(230,235,228,.25)'
    ctx.lineWidth = 1.5 * u
    ctx.stroke()
    ctx.fillStyle = next ? '#d8b46a' : 'rgba(230,235,228,.45)'
    ctx.font = `600 ${13 * u}px JetBrains Mono, monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(i + 1), x, y)
  })
  // Spur der Hand
  const tr = S.trail
  for (let i = 1; i < tr.length; i++) {
    const a = toStage(tr[i - 1].x, tr[i - 1].y), b = toStage(tr[i].x, tr[i].y)
    const age = (now - tr[i].t) / 1.6
    ctx.strokeStyle = `rgba(124,196,242,${Math.max(0, 0.9 - age)})`
    ctx.lineWidth = (5 - age * 3) * u
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(a[0], a[1])
    ctx.lineTo(b[0], b[1])
    ctx.stroke()
  }
  // Schlagpunkte
  for (const m of S.marks) {
    const age = now - m.t
    if (age > 4) continue
    const [x, y] = toStage(m.x, m.y)
    const alpha = Math.max(0, 1 - age / 4)
    const r = (9 + Math.max(0, 0.25 - age) * 60) * u
    ctx.globalAlpha = alpha
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = m.prep ? '#8d9991' : m.ok ? BEAT_COLORS[m.k % 4] : '#f28b7c'
    ctx.fill()
    ctx.fillStyle = '#0f1311'
    ctx.font = `700 ${11 * u}px JetBrains Mono, monospace`
    ctx.fillText(m.prep ? '·' : String(m.k + 1), x, y + 0.5)
    ctx.globalAlpha = 1
  }
  // Hand
  if (tr.length && S.hand && now - tr[tr.length - 1].t < 0.3) {
    const [x, y] = toStage(tr[tr.length - 1].x, tr[tr.length - 1].y)
    ctx.beginPath()
    ctx.arc(x, y, 7 * u, 0, Math.PI * 2)
    ctx.fillStyle = '#e6ebe4'
    ctx.fill()
  }
}

function frame() {
  const now = performance.now() / 1000
  watchdog(now)
  draw(now)
  requestAnimationFrame(frame)
}

/* ---------------------------------------------------------------- Anzeige */

function renderStats() {
  const bpm = S.state === 'play' && S.tempo.bpm ? Math.round(S.tempo.bpm) : null
  $('#stBpm').textContent = bpm ?? '–'
  $('#stDyn').textContent = S.log.length ? dynamicLabel(S.vel) : '–'
  const bars = Math.ceil(piece.beats / piece.meter)
  const bar = Math.floor(Math.max(0, S.pos - 1) / piece.meter) + 1
  $('#stBar').textContent = S.log.length ? (piece.endless ? String(bar) : `${bar}/${bars}`) : '–'
  const recent = S.log.slice(-8)
  const fig = $('#stFig')
  if (recent.length) {
    const p = Math.round((recent.filter((l) => l.ok).length / recent.length) * 100)
    fig.textContent = p + '%'
    fig.className = p >= 75 ? 'ok' : p < 50 ? 'bad' : ''
  } else { fig.textContent = '–'; fig.className = '' }
  document.querySelectorAll('#handSeg button').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.hand === 'left') === S.left)))
  document.querySelectorAll('#pieceSeg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.piece === S.pieceId)))
  document.querySelectorAll('#inputSeg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.input === S.input)))
}

function showResult() {
  if (S.state !== 'done') return
  const log = S.log
  const bpms = log.map((l) => l.bpm)
  const avg = bpms.reduce((a, b) => a + b, 0) / bpms.length
  const sd = Math.sqrt(bpms.reduce((a, b) => a + (b - avg) ** 2, 0) / bpms.length)
  const fig = Math.round((log.filter((l) => l.ok).length / log.length) * 100)
  const lo = Math.min(...bpms) - 5, hi = Math.max(...bpms) + 5
  const X = (i) => (i / Math.max(1, log.length - 1)) * 100
  const Y = (v) => 100 - ((v - lo) / (hi - lo)) * 100
  const pts = bpms.map((v, i) => `${X(i).toFixed(2)},${Y(v).toFixed(2)}`).join(' ')
  const bad = log.map((l, i) => (l.ok ? '' : `<circle class="dot-bad" cx="${X(i)}" cy="${Y(l.bpm)}" r="1.4"/>`)).join('')
  $('#result').innerHTML = `<div class="rhead"><h2>Ode an die Freude</h2>
    <div class="nums"><span>Ø <b>${Math.round(avg)}</b> BPM</span><span>± <b>${Math.round((sd / avg) * 100)}</b> %</span><span>Figur <b>${fig}</b> %</span></div></div>
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Tempoverlauf"><line class="grid" x1="0" x2="100" y1="${Y(avg)}" y2="${Y(avg)}"/><polyline class="curve" points="${pts}"/>${bad}</svg>
    <div class="actions"><button class="pbtn" id="again">Nochmal</button></div>`
  $('#result').hidden = false
  $('#again').addEventListener('click', resetRun)
}

/* ---------------------------------------------------------------- Eingabe */

async function useCamera() {
  stopInput()
  S.input = 'camera'
  renderStats()
  $('#err').hidden = true
  const btn = $('#startCam')
  btn.disabled = true
  prepareSound()
  try {
    video.classList.add('on')
    S.stopCam = await startCameraLazy()
    $('#startBox').hidden = true
  } catch (e) {
    video.classList.remove('on')
    S.input = null
    $('#err').textContent = e && e.name === 'NotAllowedError' ? 'Kamera nicht freigegeben.' : 'Kamera nicht verfügbar.'
    $('#err').hidden = false
    renderStats()
  } finally { btn.disabled = false }
}

async function startCameraLazy() {
  const { startCamera } = await import('./camera.js')
  return startCamera(video, pushPoint, () => S.left)
}

function usePointer() {
  stopInput()
  S.input = 'pointer'
  prepareSound()
  $('#startBox').hidden = true
  renderStats()
}

function stopInput() {
  if (S.stopCam) { S.stopCam(); S.stopCam = null }
  video.classList.remove('on')
  S.trail = []
}

const stage = $('#stage')
stage.addEventListener('pointermove', (e) => {
  if (S.input !== 'pointer') return
  if (e.pointerType !== 'mouse' && !e.buttons) return
  const r = stage.getBoundingClientRect()
  const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e]
  for (const ev of evs.length ? evs : [e]) pushPoint((ev.clientX - r.left) / r.width, (ev.clientY - r.top) / r.height, ev.timeStamp / 1000)
})
stage.addEventListener('pointerdown', (e) => {
  if (S.input === 'pointer') { player.ensure(); stage.setPointerCapture?.(e.pointerId) }
})

$('#startCam').addEventListener('click', useCamera)
$('#startPointer').addEventListener('click', usePointer)
$('#inputSeg').addEventListener('click', (e) => {
  const b = e.target.closest('button')
  if (!b) return
  if (b.dataset.input === 'camera') useCamera()
  else usePointer()
})
$('#handSeg').addEventListener('click', (e) => {
  const b = e.target.closest('button')
  if (!b) return
  S.left = b.dataset.hand === 'left'
  store.set('left', S.left)
  resetRun()
})
$('#pieceSeg').addEventListener('click', (e) => {
  const b = e.target.closest('button')
  if (!b) return
  S.pieceId = b.dataset.piece
  store.set('piece', S.pieceId)
  piece = PIECES[S.pieceId]()
  resetRun()
})

// Leertaste: ein Schlag an der Stelle der Idealfigur (zum Ausprobieren ohne Kamera)
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { $('#help').hidden = true; return }
  if (e.key !== ' ' || e.repeat) return
  e.preventDefault()
  prepareSound()
  const k = S.state === 'play' ? S.pos % piece.meter : piece.meter - 1
  const [x, y] = figurePoints()[S.state === 'idle' || S.state === 'done' ? piece.meter - 1 : k]
  onBeat({ t: performance.now() / 1000, x, y, size: 0.25 })
})

$('#helpBtn').addEventListener('click', (e) => { e.stopPropagation(); const h = $('#help'); h.hidden = !h.hidden; $('#helpBtn').setAttribute('aria-expanded', String(!h.hidden)) })
document.addEventListener('click', (e) => { if (!e.target.closest('#help') && !e.target.closest('#helpBtn')) $('#help').hidden = true })

// zum Testen im Browser
window.__conduct = { S, onBeat, pushPoint }

resize()
renderStats()
requestAnimationFrame(frame)
