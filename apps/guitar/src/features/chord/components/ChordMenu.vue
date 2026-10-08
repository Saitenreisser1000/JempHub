<template>
  <v-card class="chord-menu-card ui-panel" variant="flat">
    <div class="chord-menu-title">Chord Menu</div>
    <div class="chord-menu-topbar">
      <div class="chord-menu-controls">
        <v-select
          v-model="selectedChord"
          :items="chordOptions"
          item-title="title"
          item-value="value"
          label="Root"
          density="compact"
          hide-details
          variant="outlined"
          class="chord-select"
        />
        <v-select
          v-model="selectedChordType"
          :items="chordTypeOptions"
          label="Chord"
          density="compact"
          hide-details
          variant="outlined"
          class="chord-type-select"
        />
        <v-select
          v-model="selectedPosition"
          :items="positionOptions"
          label="Position"
          density="compact"
          hide-details
          variant="outlined"
          class="position-select"
        />
        <v-switch
          v-model="showChordSelection"
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
  chordRoot: selectedChord,
  chordType: selectedChordType,
  position: selectedPosition,
  showChord: showChordSelection,
} = storeToRefs(harmony)

const chordOptions = [
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
const chordTypeOptions = [
  'major',
  'minor',
  'diminished',
  'augmented',
  'sus2',
  'sus4',
  'dominant 7',
  'major 7',
  'minor 7',
  'half-diminished 7',
  'diminished 7',
  'add9',
  'major 6',
  'minor 6',
]
const positionOptions = [
  'Open',
  '1st Position',
  '2nd Position',
  '3rd Position',
  '4th Position',
  '5th Position',
  '7th Position',
  '9th Position',
  '12th Position',
]
</script>

<style scoped>
.chord-menu-card {
  width: 100%;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--color-surface) 95%, var(--color-surface-2) 5%);
}

.chord-menu-topbar {
  padding: 8px 10px 10px;
  border-top: 1px solid var(--color-border);
}

.chord-menu-controls {
  display: flex;
  gap: 8px;
}

.chord-select {
  max-width: 180px;
}

.chord-type-select {
  max-width: 200px;
}

.position-select {
  max-width: 180px;
}

.show-toggle {
  min-width: 96px;
  padding-top: 2px;
}

.chord-menu-title {
  padding: 10px 12px;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-text-muted);
}
</style>
