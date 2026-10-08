<template>
  <v-card class="scale-menu-card ui-panel" variant="flat">
    <div class="scale-menu-title">Scale Menu</div>
    <div class="scale-menu-bar">
      <div class="scale-menu-controls">
        <v-select
          v-model="selectedScaleRoot"
          :items="scaleRootOptions"
          item-title="title"
          item-value="value"
          label="Root"
          density="compact"
          hide-details
          variant="outlined"
          class="scale-root-select"
        />
        <v-select
          v-model="selectedScaleType"
          :items="scaleOptions"
          label="Scales"
          density="compact"
          hide-details
          variant="outlined"
          class="scale-type-select"
        />
        <v-select
          v-model="selectedPattern"
          :items="patternOptions"
          label="Pattern"
          density="compact"
          hide-details
          variant="outlined"
          class="scale-pattern-select"
        />
        <v-switch
          v-model="showScaleSelection"
          label="Show"
          density="compact"
          hide-details
          inset
          color="primary"
          class="show-toggle"
        />
      </div>
    </div>
  </v-card>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { useHarmonyMenuStore } from '@/store/useHarmonyMenu'

const harmony = useHarmonyMenuStore()
const {
  scaleRoot: selectedScaleRoot,
  scaleType: selectedScaleType,
  pattern: selectedPattern,
  showScale: showScaleSelection,
} = storeToRefs(harmony)

const scaleRootOptions = [
  { title: 'C', value: 'C' },
  { title: 'C# / Db', value: 'C#' },
  { title: 'D', value: 'D' },
  { title: 'D# / Eb', value: 'D#' },
  { title: 'E', value: 'E' },
  { title: 'F', value: 'F' },
  { title: 'F# / Gb', value: 'F#' },
  { title: 'G', value: 'G' },
  { title: 'G# / Ab', value: 'G#' },
  { title: 'A', value: 'A' },
  { title: 'A# / Bb', value: 'A#' },
  { title: 'B', value: 'B' },
]

const scaleOptions = [
  'major (ionian)',
  'natural minor (aeolian)',
  'harmonic minor',
  'melodic minor',
  'dorian',
  'phrygian',
  'lydian',
  'mixolydian',
  'locrian',
  'major pentatonic',
  'minor pentatonic',
  'blues',
  'chromatic',
  'whole tone',
  'diminished (whole-half)',
]

const patternOptions = [
  'CAGED 1',
  'CAGED 2',
  'CAGED 3',
  'CAGED 4',
  'CAGED 5',
  '3 Notes Per String',
  'Box Pattern 1',
  'Box Pattern 2',
  'Box Pattern 3',
]
</script>

<style scoped>
.scale-menu-card {
  width: 100%;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--color-surface) 95%, var(--color-surface-2) 5%);
}

.scale-menu-title {
  padding: 10px 12px;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--color-text-muted);
}

.scale-menu-bar {
  padding: 0 10px 10px;
  border-top: 1px solid var(--color-border);
}

.scale-menu-controls {
  display: flex;
  gap: 8px;
}

.scale-root-select {
  max-width: 180px;
}

.scale-type-select {
  max-width: 220px;
}

.scale-pattern-select {
  max-width: 190px;
}

.show-toggle {
  min-width: 96px;
  padding-top: 2px;
}
</style>
