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
  { durationMs = 200, type = 'triangle', gain = 0.2, startDelayMs = 0 } = {},
) {
  const ctx = getSharedAudioContext()
  if (!ctx) return

  await ensureAudioContextRunning(ctx)

  const osc = ctx.createOscillator()
  const g = ctx.createGain()

  osc.type = type
  osc.frequency.value = midiToFrequency(midi)

  const now = ctx.currentTime
  const startDelaySec = Math.max(0, Number(startDelayMs) || 0) / 1000
  const startAt = now + startDelaySec
  const dur = Math.max(10, Number(durationMs) || 200) / 1000
  const peak = Math.max(0.0001, Number(gain) || 0.2)

  g.gain.setValueAtTime(0.0001, startAt)
  g.gain.exponentialRampToValueAtTime(peak, startAt + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, startAt + dur)

  osc.connect(g)
  g.connect(ctx.destination)

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
    instrumentType,
    presetId,
  } = {},
) {
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
      })
      if (ok) return
      warnSamplerFallbackOnce('ok=false', {
        presetId: resolvedPresetId,
        instrumentType,
        manifestUrl: preset.manifestUrl,
        midi: effectiveMidi,
      })
    } catch (err) {
      warnSamplerFallbackOnce('exception', {
        presetId: resolvedPresetId,
        instrumentType,
        manifestUrl: preset.manifestUrl,
        midi: effectiveMidi,
        error: err,
      })
    }
  }

  return playMidiSynth(effectiveMidi, { durationMs, type, gain, startDelayMs })
}

export async function playMetronomeClick({ accent = false, startDelayMs = 0 } = {}) {
  const midi = accent ? 84 : 76
  const type = accent ? 'square' : 'triangle'
  const gain = accent ? 0.16 : 0.11
  const durationMs = accent ? 55 : 42
  return playMidiSynth(midi, { durationMs, type, gain, startDelayMs })
}

let didWarmup = false
let warmupInstalled = false

export async function initAudioEngine({ instrumentType, presetId } = {}) {
  const ctx = getSharedAudioContext()
  if (!ctx) return
  await ensureAudioContextRunning(ctx)

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
    await initSamplerEngine(preset.manifestUrl)
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
