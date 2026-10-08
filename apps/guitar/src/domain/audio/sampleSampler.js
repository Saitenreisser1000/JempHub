import { ensureAudioContextRunning, getSharedAudioContext } from './audioContext'

function safeJsonClone(v) {
  if (v == null) return null
  try {
    return JSON.parse(JSON.stringify(v))
  } catch {
    return null
  }
}

function midiToPlaybackRate(targetMidi, rootMidi) {
  const t = Number(targetMidi)
  const r = Number(rootMidi)
  if (!Number.isFinite(t) || !Number.isFinite(r)) return 1
  return Math.pow(2, (t - r) / 12)
}

function resolveAppUrl(url) {
  const raw = String(url || '').trim()
  if (!raw) return ''
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.startsWith('//')) return raw

  const base = String(import.meta?.env?.BASE_URL || '/')
  if (raw.startsWith('/')) {
    const normalizedBase = base.replace(/\/+$/, '')
    const normalizedRaw = raw.replace(/^\/+/, '')
    return `${normalizedBase}/${normalizedRaw}`
  }
  return raw
}

function toAbsoluteUrl(url, baseUrl) {
  const raw = String(url || '').trim()
  if (!raw) return ''
  try {
    return new URL(raw, baseUrl).toString()
  } catch {
    return raw
  }
}

function pickNearestSample(samples, targetMidi) {
  const t = Number(targetMidi)
  if (!Number.isFinite(t) || !Array.isArray(samples) || samples.length === 0) return null

  let best = null
  let bestDist = Infinity
  for (const s of samples) {
    const m = Number(s?.midi)
    if (!Number.isFinite(m)) continue
    const d = Math.abs(m - t)
    if (d < bestDist) {
      bestDist = d
      best = s
    }
  }
  return best
}

async function fetchJson(url) {
  return fetchWithRetry(url, async (res) => res.json(), 'Manifest')
}

async function fetchArrayBuffer(url) {
  return fetchWithRetry(url, async (res) => res.arrayBuffer(), 'Sample')
}

async function fetchWithRetry(url, readBody, label, retries = 2) {
  const cache = import.meta?.env?.DEV ? 'no-store' : 'default'
  let lastError = null
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const res = await fetch(url, { cache })
      if (!res.ok) throw new Error(`${label} not found (${res.status}): ${url}`)
      return await readBody(res)
    } catch (err) {
      lastError = err
      if (attempt >= retries) break
      await new Promise((resolve) => {
        setTimeout(resolve, 120 * (attempt + 1))
      })
    }
  }
  throw lastError || new Error(`${label} failed: ${url}`)
}

const presetCache = new Map()

async function loadPresetInternal(manifestUrl) {
  const ctx = getSharedAudioContext()
  if (!ctx) throw new Error('WebAudio not available')

  const manifestPath = resolveAppUrl(manifestUrl)
  const appBaseUrl = toAbsoluteUrl(String(import.meta?.env?.BASE_URL || '/'), window.location.href)
  const resolvedManifestUrl = toAbsoluteUrl(manifestPath, appBaseUrl)
  const rawManifest = await fetchJson(resolvedManifestUrl)
  const manifest = safeJsonClone(rawManifest) || {}
  const samples = Array.isArray(manifest?.samples) ? manifest.samples : []

  const decodeJobs = []
  for (const s of samples) {
    const midi = Number(s?.midi)
    const url = String(s?.url || '')
    if (!Number.isFinite(midi) || !url) continue
    decodeJobs.push((async () => {
      const resolvedSamplePath = resolveAppUrl(url)
      const resolvedSampleUrl = toAbsoluteUrl(resolvedSamplePath, resolvedManifestUrl)
      const ab = await fetchArrayBuffer(resolvedSampleUrl)
      const buffer = await ctx.decodeAudioData(ab)
      return { midi, url: resolvedSampleUrl, buffer }
    })())
  }

  const results = await Promise.allSettled(decodeJobs)
  const decoded = results
    .filter((result) => result.status === 'fulfilled')
    .map((result) => result.value)

  if (import.meta?.env?.DEV) {
    for (const result of results) {
      if (result.status === 'rejected') {
        console.warn('[audio] Failed to load one sample, continuing with remaining files', result.reason)
      }
    }
  }

  if (decoded.length === 0) throw new Error('No samples in manifest')
  return { manifestUrl: resolvedManifestUrl, samples: decoded }
}

export function preloadSamplerPreset(manifestUrl) {
  const key = String(manifestUrl || '').trim()
  if (!key) return Promise.reject(new Error('No manifest specified'))
  if (presetCache.has(key)) return presetCache.get(key)

  const p = loadPresetInternal(key).catch((err) => {
    // Do not cache a permanently rejected promise; allow retry after fixing files.
    presetCache.delete(key)
    throw err
  })
  presetCache.set(key, p)
  return p
}

export async function playMidiWithSampler(
  manifestUrl,
  midi,
  { durationMs = 250, gain = 0.25, startDelayMs = 0 } = {},
) {
  const ctx = getSharedAudioContext()
  if (!ctx) return false
  await ensureAudioContextRunning(ctx)

  const preset = await preloadSamplerPreset(manifestUrl)
  const sample = pickNearestSample(preset.samples, midi)
  if (!sample?.buffer) return false

  const src = ctx.createBufferSource()
  const g = ctx.createGain()

  src.buffer = sample.buffer
  const playbackRate = midiToPlaybackRate(midi, sample.midi)
  src.playbackRate.value = playbackRate

  const now = ctx.currentTime
  const startDelaySec = Math.max(0, Number(startDelayMs) || 0) / 1000
  const startAt = now + startDelaySec
  const requestedDur = Math.max(0.09, (Number(durationMs) || 250) / 1000)
  const sampleSeconds = Number(sample.buffer?.duration) || 0
  const playableSeconds = playbackRate > 0 ? sampleSeconds / playbackRate : sampleSeconds
  const releaseTailSec = 0.22
  const totalDur = playableSeconds > 0
    ? Math.max(0.04, Math.min(playableSeconds, requestedDur + releaseTailSec))
    : requestedDur + releaseTailSec
  const sustainUntil = Math.max(startAt + 0.03, startAt + totalDur - releaseTailSec)
  const peak = Math.max(0.0001, Number(gain) || 0.25)

  if (import.meta?.env?.DEV) {
    const rate = Number(src.playbackRate.value) || 1
    const sampleSeconds = Number(sample.buffer?.duration) || 0
    const playableSeconds = rate > 0 ? sampleSeconds / rate : sampleSeconds
    if (sampleSeconds > 0 && requestedDur > playableSeconds + 0.02) {
      console.warn('[audio] Note longer than sample (no sustain/loop implemented)', {
        midi,
        rootMidi: sample.midi,
        url: sample.url,
        requestedSeconds: requestedDur,
        playableSeconds,
        sampleSeconds,
        playbackRate: rate,
      })
    }
  }

  // Keep body of the note alive, then fade with a short release tail.
  g.gain.setValueAtTime(0.0001, startAt)
  g.gain.exponentialRampToValueAtTime(peak, startAt + 0.008)
  g.gain.setValueAtTime(peak, sustainUntil)
  g.gain.exponentialRampToValueAtTime(0.0001, startAt + totalDur)

  src.connect(g)
  g.connect(ctx.destination)

  src.start(startAt)
  src.stop(startAt + totalDur + 0.02)
  return true
}

export async function initSamplerEngine(manifestUrl) {
  const ctx = getSharedAudioContext()
  if (!ctx) return
  await ensureAudioContextRunning(ctx)
  const url = String(manifestUrl || '').trim()
  if (!url) return
  try {
    await preloadSamplerPreset(url)
  } catch {
    // keep runtime fallback behavior
  }
}
