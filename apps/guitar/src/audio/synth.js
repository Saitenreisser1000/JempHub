// Simple plucked-string synth (Karplus–Strong) and metronome click.
// Real guitar samples can replace pluck() later without touching the rest of the app.

let ctx = null
let master = null
const buffers = {}
const live = []

export function ensureAudio() {
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)()
      const comp = ctx.createDynamicsCompressor()
      master = ctx.createGain()
      master.gain.value = 0.7
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 5200
      master.connect(lp)
      lp.connect(comp)
      comp.connect(ctx.destination)
    } catch {
      ctx = null
    }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume()
  return !!ctx
}

export const clock = () => (ctx ? ctx.currentTime : performance.now() / 1000)

function pluckBuffer(midi) {
  if (buffers[midi]) return buffers[midi]
  const sr = ctx.sampleRate
  const f = 440 * Math.pow(2, (midi - 69) / 12)
  const N = Math.max(2, Math.round(sr / f))
  const len = Math.floor(sr * 2.4)
  const b = ctx.createBuffer(1, len, sr)
  const d = b.getChannelData(0)
  const ring = new Float32Array(N)
  let prev = 0
  for (let i = 0; i < N; i++) {
    prev = prev * 0.45 + (Math.random() * 2 - 1) * 0.55
    ring[i] = prev
  }
  const decay = Math.pow(0.5, 1 / (f * (midi < 48 ? 1.6 : 1.1)))
  let idx = 0
  let max = 0
  for (let i = 0; i < len; i++) {
    const nx = idx + 1 === N ? 0 : idx + 1
    const v = ring[idx]
    ring[idx] = decay * 0.5 * (v + ring[nx])
    d[i] = v
    if (Math.abs(v) > max) max = Math.abs(v)
    idx = nx
  }
  for (let i = 0; i < len; i++) d[i] /= max || 1
  return (buffers[midi] = b)
}

export function pluck(midi, when, dur, vel) {
  if (!ctx) return
  const src = ctx.createBufferSource()
  src.buffer = pluckBuffer(midi)
  const gn = ctx.createGain()
  gn.gain.setValueAtTime(0, when)
  gn.gain.linearRampToValueAtTime(vel * 0.32, when + 0.004)
  gn.gain.setTargetAtTime(0, when + Math.max(dur, 0.12), 0.09)
  src.connect(gn)
  gn.connect(master)
  src.start(when)
  src.stop(when + dur + 0.9)
  const item = { src, gn }
  live.push(item)
  src.onended = () => {
    const k = live.indexOf(item)
    if (k >= 0) live.splice(k, 1)
  }
}

export function click(when, accent) {
  if (!ctx) return
  const o = ctx.createOscillator()
  const gn = ctx.createGain()
  o.frequency.value = accent ? 1760 : 1180
  gn.gain.setValueAtTime(0, when)
  gn.gain.linearRampToValueAtTime(accent ? 0.32 : 0.2, when + 0.002)
  gn.gain.exponentialRampToValueAtTime(0.0001, when + 0.05)
  o.connect(gn)
  gn.connect(master)
  o.start(when)
  o.stop(when + 0.06)
}

export function silence() {
  if (!ctx) return
  const t = ctx.currentTime
  live.forEach(({ src, gn }) => {
    try {
      gn.gain.cancelScheduledValues(t)
      gn.gain.setTargetAtTime(0, t, 0.02)
      src.stop(t + 0.15)
    } catch {
      /* already stopped */
    }
  })
  live.length = 0
}
