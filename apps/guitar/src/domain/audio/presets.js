// Audio preset registry.
// Extend by adding new entries + (optionally) sample manifests in /public/samples/<presetId>/manifest.json

export const AUDIO_PRESET_IDS = {
  SYNTH: 'synth',
  GUITAR_STEEL_FINGER: 'guitar-steel-finger',
}

// Presets that are sample-based (sampler). If the manifest is missing, we fall back to synth.
export const AUDIO_PRESETS = {
  [AUDIO_PRESET_IDS.SYNTH]: { type: 'synth' },

  [AUDIO_PRESET_IDS.GUITAR_STEEL_FINGER]: {
    type: 'sampler',
    manifestUrl: '/samples/guitar-steel-finger/manifest.json',
    // Compensate octave mismatch by transposing down.
    transposeSemitones: -12,
  },
}

export function getDefaultPresetIdForInstrumentType(instrumentType) {
  switch (instrumentType) {
    case 'guitar':
    default:
      return AUDIO_PRESET_IDS.GUITAR_STEEL_FINGER
  }
}

export function getPreset(presetId) {
  const id = String(presetId || '').trim()
  return AUDIO_PRESETS[id] ?? AUDIO_PRESETS[AUDIO_PRESET_IDS.SYNTH]
}
