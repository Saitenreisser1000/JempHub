// Gemeinsamer Klang für alle Jemp-Apps: Klavier (Sample-Sprite), Gitarre
// (gezupfter Saitenklang, Karplus–Strong), gehaltene Orchesterklänge
// (Streicher, Holz, Blech aus Virtual Playing Orchestra) und Metronom-Klick.
// Wird beim Bauen nach apps/<app>/vendor/sounds/ kopiert (scripts/sync-shared.mjs).

const NAMES = ['C', 'Cs', 'D', 'Ds', 'E', 'F', 'Fs', 'G', 'Gs', 'A', 'As', 'B']

// 'Cs4' -> 61, 'A1' -> 33
export function midiFromName(name) {
  const m = /^([A-G]s?)(-?\d)$/.exec(name)
  if (!m) return null
  return 12 * (Number(m[2]) + 1) + NAMES.indexOf(m[1])
}

export const SUSTAIN = ['strings', 'woodwinds', 'brass']

// Passender Bereich aus dem VPO-Manifest, sonst der nächstgelegene
export function sustainRegion(regions, midi) {
  const hit = regions.find((r) => midi >= r.lokeyMidi && midi <= r.hikeyMidi)
  if (hit) return hit
  let best = null
  for (const r of regions) if (!best || Math.abs(r.pitchKeycenterMidi - midi) < Math.abs(best.pitchKeycenterMidi - midi)) best = r
  return best
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
  let vpoManifest = null
  const sustain = {}
  const sustainLoading = {}
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

  // Lädt alle Samples einer Orchestergruppe (etwa 2–4 MB)
  async function loadSustain(group) {
    if (sustain[group]) return sustain[group]
    if (sustainLoading[group]) return sustainLoading[group]
    if (!ensure()) return null
    sustainLoading[group] = (async () => {
      if (!vpoManifest) {
        const res = await fetch(base + 'vpo/manifest.json')
        if (!res.ok) throw new Error('Orchesterklang konnte nicht geladen werden')
        vpoManifest = await res.json()
      }
      const regions = vpoManifest.instruments[group].regions
      const urls = [...new Set(regions.map((r) => r.url))]
      const buffers = {}
      await Promise.all(urls.map(async (u) => {
        const res = await fetch(base + 'vpo/' + u)
        if (!res.ok) throw new Error('Orchesterklang konnte nicht geladen werden')
        buffers[u] = await ctx.decodeAudioData(await res.arrayBuffer())
      }))
      sustain[group] = { regions, buffers }
      return sustain[group]
    })().catch((e) => {
      sustainLoading[group] = null
      throw e
    })
    return sustainLoading[group]
  }

  function playSustain(group, midi, when, dur, vel, cents) {
    const set = sustain[group]
    if (!set) return false
    const r = sustainRegion(set.regions, midi)
    const buffer = set.buffers[r.url]
    const src = ctx.createBufferSource()
    src.buffer = buffer
    const rate = Math.pow(2, ((midi - r.pitchKeycenterMidi) * 100 - (r.tuneCents || 0) + cents) / 1200)
    src.playbackRate.value = rate
    const len = Math.min(Math.max(dur, 0.3), buffer.duration / rate - 0.15)
    const peak = vel * 0.7 * Math.pow(10, (r.gainDb || 0) / 20)
    const gn = ctx.createGain()
    gn.gain.setValueAtTime(0, when)
    gn.gain.linearRampToValueAtTime(peak, when + 0.04)
    gn.gain.setValueAtTime(peak, when + len - 0.12)
    gn.gain.linearRampToValueAtTime(0, when + len)
    src.connect(gn)
    gn.connect(master)
    src.start(when)
    src.stop(when + len + 0.05)
    track(src, gn)
    return true
  }

  function track(src, gn) {
    const item = { src, gn }
    live.push(item)
    src.onended = () => {
      const k = live.indexOf(item)
      if (k >= 0) live.splice(k, 1)
    }
  }

  function playPiano(midi, when, dur, vel, cents = 0) {
    if (!piano) return false
    const key = nearestSample(midi, piano.keys)
    const seg = piano.map[key]
    const src = ctx.createBufferSource()
    src.buffer = piano.buffer
    src.playbackRate.value = Math.pow(2, (midi - key) / 12 + cents / 1200)
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

  function playGuitar(midi, when, dur, vel, cents = 0) {
    const src = ctx.createBufferSource()
    src.buffer = guitarBuffer(midi)
    if (cents) src.playbackRate.value = Math.pow(2, cents / 1200)
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
    loadSustain,
    sustainReady: (group) => !!sustain[group],
    // instrument: 'piano' | 'guitar' | 'strings' | 'woodwinds' | 'brass'; cents: Verstimmung.
    // Fällt auf Gitarre zurück, solange ein Sample-Klang noch lädt.
    note(midi, when, dur = 1.2, { instrument = 'piano', vel = 0.85, cents = 0 } = {}) {
      if (!ensure()) return
      const t = Math.max(when ?? now(), now())
      if (instrument === 'piano' && playPiano(midi, t, dur, vel, cents)) return
      if (SUSTAIN.includes(instrument) && playSustain(instrument, midi, t, dur, vel, cents)) return
      playGuitar(midi, t, dur, vel, cents)
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
