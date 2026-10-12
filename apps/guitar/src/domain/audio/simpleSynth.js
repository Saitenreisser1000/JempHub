import { canSchedule, trackAudioSource } from './audioSchedule'
import { getDefaultPresetIdForInstrumentType, getPreset } from './presets'
import { playMidiWithSampler } from './sampleSampler'
import { initSamplerEngine } from './sampleSampler'
import { ensureAudioContextRunning, getSharedAudioContext } from './audioContext'

const samplerWarnedKeys = new Set()

function warnSamplerFallbackOnce(reason, meta = {}) {
  const key = `${reason}:${meta?.manifestUrl || ''}`
  if (samplerWarnedKeys.has(key)) return
  samplerWarnedKeys.add(key)
  console.warn(`[audio] Sampler fallback to synth: ${reason}`, meta)
}

export function midiToFrequency(midi) {
  const m = Number(midi)
  const safe = Number.isFinite(m) ? m : 69
  return 440 * Math.pow(2, (safe - 69) / 12)
}

async function playMidiSynth(
  midi,
  { durationMs = 200, type = 'triangle', gain = 0.2, startDelayMs = 0, startAt: requestedStartAt, signal } = {},
) {
  const ctx = getSharedAudioContext()
  if (!ctx) return

  const startAt = Number.isFinite(requestedStartAt)
    ? requestedStartAt : ctx.currentTime + Math.max(0, Number(startDelayMs) || 0) / 1000
  await ensureAudioContextRunning(ctx)
  if (!canSchedule(ctx, { signal, startAt })) return

  const osc = ctx.createOscillator()
  const g = ctx.createGain()

  osc.type = type
  osc.frequency.value = midiToFrequency(midi)

  const dur = Math.max(10, Number(durationMs) || 200) / 1000
  const peak = Math.max(0.0001, Number(gain) || 0.2)

  g.gain.setValueAtTime(0.0001, startAt)
  g.gain.exponentialRampToValueAtTime(peak, startAt + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, startAt + dur)

  osc.connect(g)
  g.connect(ctx.destination)

  trackAudioSource(osc, g, signal)
  osc.start(startAt)
  osc.stop(startAt + dur + 0.02)
}

export async function playMidi(
  midi,
  {
    durationMs = 200,
    type = 'triangle',
    gain = 0.2,
    startDelayMs = 0,
    startAt: requestedStartAt,
    signal,
    instrumentType,
    presetId,
  } = {},
) {
  const ctx = getSharedAudioContext()
  if (!ctx || signal?.aborted) return
  const startAt = Number.isFinite(requestedStartAt)
    ? requestedStartAt : ctx.currentTime + Math.max(0, Number(startDelayMs) || 0) / 1000
  const resolvedPresetId =
    presetId != null && String(presetId).trim()
      ? String(presetId).trim()
      : getDefaultPresetIdForInstrumentType(instrumentType)

  const preset = getPreset(resolvedPresetId)

  const transpose = Number(preset?.transposeSemitones)
  const safeTranspose = Number.isFinite(transpose) ? transpose : 0
  const m = Number(midi)
  const effectiveMidi = Number.isFinite(m) ? m + safeTranspose : midi

  if (preset?.type === 'sampler' && preset?.manifestUrl) {
    try {
      const ok = await playMidiWithSampler(preset.manifestUrl, effectiveMidi, {
        durationMs,
        gain,
        startDelayMs,
        startAt,
        signal,
      })
      if (ok || signal) return
      warnSamplerFallbackOnce('ok=false', {
        presetId: resolvedPresetId,
        instrumentType,
        manifestUrl: preset.manifestUrl,
        midi: effectiveMidi,
      })
    } catch (err) {
      if (signal) return // A transport run never switches sound after its deadline.
      warnSamplerFallbackOnce('exception', {
        presetId: resolvedPresetId,
        instrumentType,
        manifestUrl: preset.manifestUrl,
        midi: effectiveMidi,
        error: err,
      })
    }
  }

  return playMidiSynth(effectiveMidi, { durationMs, type, gain, startDelayMs, startAt, signal })
}

export async function playMetronomeClick({ accent = false, startDelayMs = 0, startAt, signal } = {}) {
  const midi = accent ? 84 : 76
  const type = accent ? 'square' : 'triangle'
  const gain = accent ? 0.16 : 0.11
  const durationMs = accent ? 55 : 42
  return playMidiSynth(midi, { durationMs, type, gain, startDelayMs, startAt, signal })
}

let didWarmup = false
let warmupInstalled = false

export async function initAudioEngine({ instrumentType, presetId, strict = false } = {}) {
  const ctx = getSharedAudioContext()
  if (!ctx) {
    if (strict) throw new Error('Web Audio unavailable')
    return
  }
  await ensureAudioContextRunning(ctx)
  if (strict && ctx.state !== 'running') throw new Error('Audio context is not running')

  if (!didWarmup) {
    didWarmup = true
    void playMidiSynth(69, { durationMs: 8, gain: 0.0001, type: 'sine' })
  }

  const resolvedPresetId =
    presetId != null && String(presetId).trim()
      ? String(presetId).trim()
      : getDefaultPresetIdForInstrumentType(instrumentType)
  const preset = getPreset(resolvedPresetId)
  if (preset?.type === 'sampler' && preset?.manifestUrl) {
    await initSamplerEngine(preset.manifestUrl, { strict })
  }
}

export function installAudioAutoWarmup({ instrumentType, presetId } = {}) {
  if (warmupInstalled) return
  warmupInstalled = true
  const opts = { passive: true, once: true }
  const onFirstInteraction = () => {
    void initAudioEngine({ instrumentType, presetId })
    window.removeEventListener('pointerdown', onFirstInteraction)
    window.removeEventListener('keydown', onFirstInteraction)
    window.removeEventListener('touchstart', onFirstInteraction)
  }
  window.addEventListener('pointerdown', onFirstInteraction, opts)
  window.addEventListener('keydown', onFirstInteraction, opts)
  window.addEventListener('touchstart', onFirstInteraction, opts)
}
