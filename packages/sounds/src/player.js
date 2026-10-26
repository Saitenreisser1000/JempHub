// Gemeinsamer Klang für alle Jemp-Apps: Klavier (Sample-Sprite) und Gitarre
// (gezupfter Saitenklang, Karplus–Strong), dazu Metronom-Klick.
// Wird beim Bauen nach apps/<app>/vendor/sounds/ kopiert (scripts/sync-shared.mjs).

const NAMES = ['C', 'Cs', 'D', 'Ds', 'E', 'F', 'Fs', 'G', 'Gs', 'A', 'As', 'B']

// 'Cs4' -> 61, 'A1' -> 33
export function midiFromName(name) {
  const m = /^([A-G]s?)(-?\d)$/.exec(name)
  if (!m) return null
  return 12 * (Number(m[2]) + 1) + NAMES.indexOf(m[1])
}

// Nächstgelegenes vorhandenes Sample; Abstand wird per Tonhöhenverschiebung ausgeglichen.
export function nearestSample(midi, available) {
  let best = null
  for (const a of available) if (best === null || Math.abs(a - midi) < Math.abs(best - midi) || (Math.abs(a - midi) === Math.abs(best - midi) && a < best)) best = a
  return best
}

export function createPlayer({ base = new URL('../', import.meta.url).href } = {}) {
  let ctx = null
  let master = null
  let piano = null
  let pianoLoading = null
  const guitarBuffers = {}
  const live = []

  function ensure() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)()
        const comp = ctx.createDynamicsCompressor()
        master = ctx.createGain()
        master.gain.value = 0.8
        master.connect(comp)
        comp.connect(ctx.destination)
      } catch {
        ctx = null
      }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume()
    return !!ctx
  }

  const now = () => (ctx ? ctx.currentTime : 0)

  async function loadPiano() {
    if (piano) return piano
    if (pianoLoading) return pianoLoading
    if (!ensure()) return null
    pianoLoading = (async () => {
      const [spriteRes, audioRes] = await Promise.all([fetch(base + 'piano/piano.json'), fetch(base + 'piano/piano.mp3')])
      if (!spriteRes.ok || !audioRes.ok) throw new Error('Klavierklang konnte nicht geladen werden')
      const sprite = (await spriteRes.json()).sprite
      const buffer = await ctx.decodeAudioData(await audioRes.arrayBuffer())
      const map = {}
      for (const [name, [start, dur]] of Object.entries(sprite)) {
        const m = midiFromName(name)
        if (m !== null) map[m] = { start: start / 1000, dur: dur / 1000 }
      }
      piano = { buffer, map, keys: Object.keys(map).map(Number) }
      return piano
    })().catch((e) => {
      pianoLoading = null
      throw e
    })
    return pianoLoading
  }

  function track(src, gn) {
    const item = { src, gn }
    live.push(item)
    src.onended = () => {
      const k = live.indexOf(item)
      if (k >= 0) live.splice(k, 1)
    }
  }

  function playPiano(midi, when, dur, vel) {
    if (!piano) return false
    const key = nearestSample(midi, piano.keys)
    const seg = piano.map[key]
    const src = ctx.createBufferSource()
    src.buffer = piano.buffer
    src.playbackRate.value = Math.pow(2, (midi - key) / 12)
    const gn = ctx.createGain()
    const len = Math.min(Math.max(dur, 0.2), seg.dur / src.playbackRate.value)
    gn.gain.setValueAtTime(vel, when)
    gn.gain.setTargetAtTime(0, when + len - 0.08, 0.05)
    src.connect(gn)
    gn.connect(master)
    src.start(when, seg.start, seg.dur)
    src.stop(when + len + 0.3)
    track(src, gn)
    return true
  }

  function guitarBuffer(midi) {
    if (guitarBuffers[midi]) return guitarBuffers[midi]
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
    return (guitarBuffers[midi] = b)
  }

  function playGuitar(midi, when, dur, vel) {
    const src = ctx.createBufferSource()
    src.buffer = guitarBuffer(midi)
    const gn = ctx.createGain()
    gn.gain.setValueAtTime(0, when)
    gn.gain.linearRampToValueAtTime(vel * 0.4, when + 0.004)
    gn.gain.setTargetAtTime(0, when + Math.max(dur, 0.15), 0.1)
    src.connect(gn)
    gn.connect(master)
    src.start(when)
    src.stop(when + dur + 1)
    track(src, gn)
  }

  return {
    ensure,
    now,
    loadPiano,
    pianoReady: () => !!piano,
    // instrument: 'piano' | 'guitar'. Fällt auf Gitarre zurück, solange das Klavier lädt.
    note(midi, when, dur = 1.2, { instrument = 'piano', vel = 0.85 } = {}) {
      if (!ensure()) return
      const t = Math.max(when ?? now(), now())
      if (instrument === 'piano' && playPiano(midi, t, dur, vel)) return
      playGuitar(midi, t, dur, vel)
    },
    click(when, accent = false) {
      if (!ensure()) return
      const o = ctx.createOscillator()
      const gn = ctx.createGain()
      o.frequency.value = accent ? 1760 : 1180
      gn.gain.setValueAtTime(0, when)
      gn.gain.linearRampToValueAtTime(accent ? 0.3 : 0.18, when + 0.002)
      gn.gain.exponentialRampToValueAtTime(0.0001, when + 0.05)
      o.connect(gn)
      gn.connect(master)
      o.start(when)
      o.stop(when + 0.06)
    },
    stopAll() {
      if (!ctx) return
      const t = ctx.currentTime
      for (const { src, gn } of live) {
        try {
          gn.gain.cancelScheduledValues(t)
          gn.gain.setTargetAtTime(0, t, 0.02)
          src.stop(t + 0.12)
        } catch {
          /* schon beendet */
        }
      }
      live.length = 0
    },
  }
}
