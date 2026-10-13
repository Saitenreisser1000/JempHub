<template>
  <v-alert v-if="audioLoading || audioError" class="ma-2" density="compact"
    :type="audioError ? 'error' : 'info'" role="status">
    {{ audioLoading ? 'Sounds werden geladen …' : audioError }}
    <v-btn v-if="audioLoading" size="small" variant="text" @click="cancelAudioStart">Abbrechen</v-btn>
  </v-alert>
  <TimelineView :is-playing="isPlaying" :tempo="tempo" :selected-mode="selectedMode" :snap-enabled="snapEnabled"
    :sound-preview-enabled="soundPreviewEnabled" :beat-top="beatTop" :beat-bottom="beatBottom"
    :click-enabled="clickEnabled" :count-in-enabled="countInEnabled"
    :pickup-enabled="pickupEnabled" :pickup-beats="pickupBeats"
    :count-in-visible="countInVisible" :count-in-beat="countInBeat"
    :loop-start-block="loopStartBlock" :loop-end-block="loopEndBlock"
    :sound-duration-scale="soundDurationScale" :active-string="activeString" :active-tool="activeTool"
    :loop-enabled="loopEnabled" :total-duration="totalDuration" :total-blocks="totalBlocks" :playhead="playhead"
    :zoom-px-per-block="zoomPxPerBlock" :current-step="currentStep" :tracks="tracks" :num-strings="numStrings"
    :num-frets="numFrets" :strings-collapsed="stringsCollapsed" :sim-group-mode="simGroupMode"
    :timeline-visible="timelineVisible" :transport-visible="transportVisible"
    :library-panel-visible="libraryPanelVisible"
    :hand-position-visible="handPositionVisible"
    :auto-follow-enabled="autoFollowEnabled" :ghost-notes-enabled="ghostNotesEnabled" :markers="markers"
    :hand-position-notes="handPositionNotes"
    :practice-active="practiceActive" :practice-available="practiceAvailable"
    :practice-target-label="practiceTargetLabel" :practice-detected-label="practiceDetectedLabel"
    :practice-hint-text="practiceHintText" :practice-match-state="practiceMatchState"
    :record-active="recordActive"
    :library-enabled="libraryEnabled" :is-dark-theme="isDarkTheme"
    @update-loop="settings.setLoopEnabled"
    @update-mode="settings.setSelectedMode" @update-zoom="settings.setZoomPxPerBlock"
    @update-snap="settings.setSnapEnabled" @update-sound-preview="settings.setSoundPreviewEnabled"
    @update-sound-duration-scale="settings.setSoundDurationScale" @update-active-string="settings.setActiveString"
    @update-active-tool="settings.setActiveTool" @update-beat-top="handleUpdateBeatTop"
    @update-beat-bottom="handleUpdateBeatBottom" @update-num-strings="instrument.setNumStrings"
    @update-loop-start-block="settings.setLoopStartBlock"
    @update-loop-end-block="settings.setLoopEndBlock"
    @update-pickup-enabled="handleUpdatePickupEnabled"
    @update-pickup-beats="handleUpdatePickupBeats"
    @update-strings-collapsed="settings.setStringsCollapsed" @update-sim-group-mode="settings.setSimGroupMode"
    @update-timeline-visible="(v) => emit('update-timeline-visible', Boolean(v))"
    @update-transport-visible="(v) => emit('update-transport-visible', Boolean(v))"
    @update-library-panel-visible="(v) => emit('update-library-panel-visible', Boolean(v))"
    @update-total-blocks="handleUpdateTotalBlocks"
    @open-library="emit('open-library')"
    @toggle-theme="emit('toggle-theme')"
    @update-frets="(v) => emit('update-frets', v)"
    @update-note-grid-index="handleUpdateNoteGridIndex" @update-note-length="handleUpdateNoteLength"
    @update-note-label="handleUpdateNoteLabel"
    @group-move-notes="handleGroupMoveNotes" @group-resize-notes="handleGroupResizeNotes" @seek-playhead="seekPlayhead"
    @add-hand-position="handleAddHandPosition" @copy-selection="handleCopySelection"
    @paste-at-playhead="handlePasteAtPlayhead" @undo="handleUndo"
    @redo="handleRedo" @add-marker-at-playhead="handleAddMarkerAtPlayhead"
    @loop-to-selection="handleLoopToSelection" @quantize-selection="handleQuantizeSelection"
    @scale-selection-length="handleScaleSelectionLength" @update-ghost-notes="settings.setGhostNotesEnabled"
    :compact="compact" />
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import TimelineView from './TimelineView.vue'
import { useNotesStore } from '@/store/useNotes'
import { useTransportStore } from '@/store/useTransport'
import { useTimelineSettingsStore } from '@/store/useTimelineSettings'
import { useInstrumentStore } from '@/store/useInstrument'
import { usePlaybackVisualsStore } from '@/store/usePlaybackVisuals'
import { useSelectionStore } from '@/store/useSelection'
import { useHandPositionsStore } from '@/store/useHandPositions'
import { SURFACE_MODES, useUiModeStore } from '@/store/useUiMode'
import { useI18n } from '@/i18n'
import { usePlayback } from '@/composables/usePlayback'
import { useGrid } from '@/composables/useGrid'
import { useCountInOverlay } from '@/features/timeline/composables/useCountInOverlay'
import { TIMELINE_SNAP_STEP_BLOCKS } from '@/features/timeline/config/grid'
import { TIMELINE_LAYOUT } from '@/features/timeline/config/timelineLayout'
import { DEFAULT_HAND_POSITION_COLOR } from 'jemp-design-system/design-constants'
import { normalizeNoteValue } from '@/config/noteValues'
import { getTuning } from '@/domain/music/tunings'
import { midiToNoteName } from '@/domain/music/notes'
import { midiForNote } from '@/domain/music/pitch'
import { initAudioEngine, playMetronomeClick, playMidi } from '@/domain/audio/simpleSynth'
import { createAudioRun } from '@/domain/audio/audioSchedule'
import { getSharedAudioContext } from '@/domain/audio/audioContext'
import { createNoteKey } from '@/domain/note'
import {
  gridIndexToStartMs,
  lengthBlocksToDurationMs,
  playheadMsToGridIndex,
  safeTimePerBlockMs,
} from '@/domain/timelineTime'
import {
  buildPastedNotes,
  computePasteRange,
  snapStepBlocksForMode,
} from '@/domain/timelineInteractions'

const props = defineProps({
  compact: { type: Boolean, default: false },
  numFrets: { type: Number, default: 12 },
  timelineVisible: { type: Boolean, default: true },
  transportVisible: { type: Boolean, default: true },
  libraryPanelVisible: { type: Boolean, default: true },
  externalUndoTick: { type: Number, default: 0 },
  externalRedoTick: { type: Number, default: 0 },
  libraryEnabled: { type: Boolean, default: true },
  isDarkTheme: { type: Boolean, default: false },
})

const emit = defineEmits([
  'update-frets',
  'update-timeline-visible',
  'update-transport-visible',
  'update-library-panel-visible',
  'open-library',
  'toggle-theme',
])

const store = useNotesStore()
const transport = useTransportStore()
const settings = useTimelineSettingsStore()
const instrument = useInstrumentStore()
const playbackVisuals = usePlaybackVisualsStore()
const selection = useSelectionStore()
const handPositionsStore = useHandPositionsStore()
const uiMode = useUiModeStore()
const { t } = useI18n()
const PLAYBACK_START_LEAD_IN_MS = 0

const { tempo } = storeToRefs(transport)
const { playheadMs } = storeToRefs(transport)
const { handPositions: handPositionNotes } = storeToRefs(handPositionsStore)
const {
  selectedMode,
  lastRhythmMode,
  snapEnabled,
  soundPreviewEnabled,
  clickEnabled,
  countInEnabled,
  soundDurationScale,
  activeString,
  activeTool,
  stringsCollapsed,
  handPositionVisible,
  simGroupMode,
  loopEnabled,
  shuffleEnabled,
  loopStartBlock,
  loopEndBlock,
  beatTop,
  beatBottom,
  pickupEnabled,
  pickupBeats,
  zoomPxPerBlock,
  autoFollowEnabled,
  ghostNotesEnabled,
  timelineLengthBlocks,
  activeDotGroupColor,
} = storeToRefs(settings)
const { numStrings } = storeToRefs(instrument)
const { surfaceMode, surfacePolicy } = storeToRefs(uiMode)

const tuning = computed(() => getTuning(instrument.tuningId))

const grid = useGrid()

const stepMap = { '1/16': 0.25, '1/8': 0.5, '1/4': 1, '1/2': 2, 1: 4 }
const effectiveMode = computed(() =>
  selectedMode.value === 'sim' ? lastRhythmMode.value : selectedMode.value,
)
const currentStep = computed(() => stepMap[effectiveMode.value] ?? 1)
function isHandPositionKey(noteKey) {
  return String(noteKey || '').startsWith('hp_')
}

function blocksPerBar() {
  const top = Number(beatTop.value) || 4
  const bottom = Number(beatBottom.value) || 4
  const raw = top * (4 / bottom)
  const safe = Number.isFinite(raw) && raw > 0 ? raw : 4
  return Number(safe.toFixed(2))
}

function handleUpdatePickupEnabled(v) {
  settings.setPickupEnabled(v)
  normalizeTimelineLengthToWholeBars()
}

function handleUpdatePickupBeats(v) {
  settings.setPickupBeats(v)
  normalizeTimelineLengthToWholeBars()
}

function barsFromTotalAndBar(total, bar) {
  const safeTotal = Math.max(1, Number(total) || 1)
  const safeBar = Math.max(0.01, Number(bar) || 1)
  return Math.max(1, Math.round(safeTotal / safeBar))
}

function normalizeTimelineLengthToWholeBars() {
  const bar = Math.max(0.01, Number(blocksPerBar()) || 1)
  const bars = barsFromTotalAndBar(totalBlocks.value, bar)
  settings.setTimelineLengthBlocks(Number((bars * bar).toFixed(3)))
}

function ensureTimelineCoversNoteEnd(noteKey, overrides = {}) {
  const key = String(noteKey || '')
  if (!key) return
  const note = store.activeNotes.find((n) => String(n?.key || '') === key)
  if (!note) return

  const gridIndexRaw = overrides?.gridIndex ?? note?.gridIndex
  const lengthBlocksRaw = overrides?.lengthBlocks ?? note?.lengthBlocks
  const gridIndex = Number(gridIndexRaw)
  const lengthBlocks = Number(lengthBlocksRaw)
  if (!Number.isFinite(gridIndex) || !Number.isFinite(lengthBlocks)) return

  const safeGridIndex = gridIndex > 0 ? gridIndex : 1
  const safeLen = lengthBlocks > 0 ? lengthBlocks : 1
  const endBlock = safeGridIndex - 1 + safeLen
  const total = Math.max(1, Number(totalBlocks.value) || 1)
  if (endBlock <= total) return

  const bar = Math.max(0.01, Number(blocksPerBar()) || 1)
  const barsNeeded = Math.max(1, Math.ceil(endBlock / bar))
  settings.setTimelineLengthBlocks(Number((barsNeeded * bar).toFixed(3)))
}

function handleUpdateBeatTop(v) {
  const prevBar = Math.max(0.01, Number(blocksPerBar()) || 1)
  const bars = barsFromTotalAndBar(totalBlocks.value, prevBar)
  settings.setBeatTop(v)
  const nextBar = Math.max(0.01, Number(blocksPerBar()) || 1)
  settings.setTimelineLengthBlocks(Number((bars * nextBar).toFixed(3)))
}

function handleUpdateBeatBottom(v) {
  const prevBar = Math.max(0.01, Number(blocksPerBar()) || 1)
  const bars = barsFromTotalAndBar(totalBlocks.value, prevBar)
  settings.setBeatBottom(v)
  const nextBar = Math.max(0.01, Number(blocksPerBar()) || 1)
  settings.setTimelineLengthBlocks(Number((bars * nextBar).toFixed(3)))
}

function handleUpdateTotalBlocks(nextBlocks) {
  const n = Number(nextBlocks)
  if (!Number.isFinite(n)) return
  const oneBarBlocks = Math.max(1, Number(blocksPerBar()) || 1)
  settings.setTimelineLengthBlocks(Math.max(oneBarBlocks, n))
}

function updateHandPositionNoteGridIndex(noteKey, gridIndex) {
  handPositionsStore.setHandPositionGridIndex(noteKey, gridIndex)
}

function updateHandPositionNoteLength(noteKey, lengthBlocks) {
  handPositionsStore.setHandPositionLength(noteKey, lengthBlocks)
}

function handleAddHandPosition() {
  const len = blocksPerBar()
  const endEdges = handPositionNotes.value.map((n) => {
    const start = Number(n?.gridIndex)
    const l = Number(n?.lengthBlocks)
    const safeStart = Number.isFinite(start) && start > 0 ? start : 1
    const safeLen = Number.isFinite(l) && l > 0 ? l : len
    return safeStart + safeLen
  })
  const nextGrid = endEdges.length ? Math.max(...endEdges) : 1
  handPositionsStore.addHandPosition({
    key: `hp_${createNoteKey()}`,
    fret: '1-4',
    string: 0,
    color: DEFAULT_HAND_POSITION_COLOR,
    gridIndex: Number(nextGrid.toFixed(2)),
    lengthBlocks: len,
  })
}

const notesForRender = computed(() => {
  return store.activeNotes.map((note, idx) => {
    const key = note?.key
    const fret = note?.fret
    const string = note?.string
    const color = note?.color
    const noteValue = typeof note?.noteValue === 'string' ? note.noteValue : ''
    // 1-based raster index stored per note (fallback to insertion order)
    const gridIndex = Number.isFinite(note?.gridIndex) ? note.gridIndex : idx + 1
    const lengthBlocks = Number.isFinite(note?.lengthBlocks) ? note.lengthBlocks : 1
    const subdivision = Number(note?.subdivision) === 3 ? 3 : 2
    return { key, fret, string, color, noteValue, gridIndex, lengthBlocks, subdivision }
  })
})

const filteredPlaybackNotes = computed(() => {
  const activeColor = String(activeDotGroupColor.value || '').trim()
  if (!activeColor) return store.activeNotes
  return store.activeNotes.filter((note) => String(note?.color || '').trim() === activeColor)
})

const effectivePlaybackRangeMs = computed(() => {
  const activeColor = String(activeDotGroupColor.value || '').trim()
  if (!activeColor) {
    const total = Number(totalDuration.value) || 0
    return { start: 0, end: total }
  }
  const timePerBlock = safeTimePerBlockMs(grid.grid.value.timePerBlock)
  const ranges = filteredPlaybackNotes.value
    .map((note) => {
      const startMs = playbackStartMsForNote(note, timePerBlock)
      const lengthBlocks = Number(note?.lengthBlocks)
      const len = Number.isFinite(lengthBlocks) && lengthBlocks > 0 ? lengthBlocks : 1
      const durationMs = lengthBlocksToDurationMs(len, timePerBlock)
      if (!Number.isFinite(startMs)) return null
      return {
        start: startMs,
        end: startMs + durationMs,
      }
    })
    .filter(Boolean)
  if (!ranges.length) {
    const total = Number(totalDuration.value) || 0
    return { start: 0, end: total }
  }
  return {
    start: Math.max(0, Math.min(...ranges.map((item) => Number(item.start) || 0))),
    end: Math.max(0, Math.max(...ranges.map((item) => Number(item.end) || 0))),
  }
})

function notesForString(s) {
  return notesForRender.value.filter((n) => n.string === s)
}

const tracks = computed(() => {
  const n = Number(numStrings.value) || 0
  const openMidi = tuning.value?.openMidi
  const result = []
  for (let stringIdx = 1; stringIdx <= n; stringIdx++) {
    const midi = Array.isArray(openMidi) ? openMidi[stringIdx - 1] : null
    const label = midiToNoteName(midi, { includeOctave: false }) || t('timelineTrack.string', { string: stringIdx })
    result.push({ stringIdx, label, notes: notesForString(stringIdx) })
  }
  return result
})

function handleUpdateNoteGridIndex(noteKey, gridIndex) {
  if (!surfacePolicy.value.canEditNotes) return
  if (isHandPositionKey(noteKey)) {
    updateHandPositionNoteGridIndex(noteKey, gridIndex)
    return
  }
  store.setNoteGridIndex(noteKey, gridIndex)
  ensureTimelineCoversNoteEnd(noteKey, { gridIndex })
  seekToNoteEnd(noteKey, { gridIndex })
}

function handleUpdateNoteLength(noteKey, lengthBlocks) {
  if (!surfacePolicy.value.canEditNotes) return
  if (isHandPositionKey(noteKey)) {
    updateHandPositionNoteLength(noteKey, lengthBlocks)
    return
  }
  store.setNoteLength(noteKey, lengthBlocks)
  ensureTimelineCoversNoteEnd(noteKey, { lengthBlocks })
  seekToNoteEnd(noteKey, { lengthBlocks })
}

function handleUpdateNoteLabel(noteKey, label) {
  if (!surfacePolicy.value.canEditNotes) return
  if (!isHandPositionKey(noteKey)) return
  handPositionsStore.setHandPositionLabel(noteKey, label)
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v))
}

function quantizeBlocks(v) {
  const raw = Number(v) || 0
  if (!snapEnabled.value) return raw
  const snapStep = snapStepBlocksForMode(simGroupMode.value, TIMELINE_SNAP_STEP_BLOCKS)
  return Math.round(raw / snapStep) * snapStep
}

function handleGroupMoveNotes(anchorKey, deltaBlocks) {
  if (!surfacePolicy.value.canEditNotes) return
  if (playback.isPlaying.value) return

  const keys = Array.isArray(selection.selectedNoteKeys) ? selection.selectedNoteKeys : []
  if (keys.length < 2) return

  const delta = Number(quantizeBlocks(deltaBlocks).toFixed(2))
  if (!delta) return

  const total = Math.max(1, Number(totalBlocks.value) || 1)

  for (const k of keys) {
    const note = store.activeNotes.find((n) => n?.key === k)
    if (!note) continue

    const start = Number(note?.gridIndex ?? 1)
    const len = Number(note?.lengthBlocks ?? 1)
    const safeLen = Number.isFinite(len) && len > 0 ? len : 1

    const maxStart = Math.max(1, total - safeLen + 1)
    const next = clamp(start + delta, 1, maxStart)
    store.setNoteGridIndex(k, Number(next.toFixed(2)))
  }

  seekToNoteEnd(anchorKey)
}

function handleGroupResizeNotes(anchorKey, deltaBlocks) {
  if (!surfacePolicy.value.canEditNotes) return
  if (playback.isPlaying.value) return

  const keys = Array.isArray(selection.selectedNoteKeys) ? selection.selectedNoteKeys : []
  if (keys.length < 2) return

  const delta = Number(quantizeBlocks(deltaBlocks).toFixed(2))
  if (!delta) return

  const total = Math.max(1, Number(totalBlocks.value) || 1)
  const snapStep = snapStepBlocksForMode(simGroupMode.value, TIMELINE_SNAP_STEP_BLOCKS)
  const minLen = snapEnabled.value ? snapStep : 0.01

  for (const k of keys) {
    const note = store.activeNotes.find((n) => n?.key === k)
    if (!note) continue

    const start = Number(note?.gridIndex ?? 1)
    const len = Number(note?.lengthBlocks ?? 1)
    const safeStart = Number.isFinite(start) && start > 0 ? start : 1
    const safeLen = Number.isFinite(len) && len > 0 ? len : 1

    const maxLen = Math.max(minLen, total - (safeStart - 1))
    const next = clamp(safeLen + delta, minLen, maxLen)
    store.setNoteLength(k, Number(next.toFixed(2)))
  }

  seekToNoteEnd(anchorKey)
}

function handleCopySelection() {
  if (!surfacePolicy.value.canEditNotes) return
  settings.setActiveTool('arrow')
  const keys = Array.isArray(selection.selectedNoteKeys) ? selection.selectedNoteKeys : []
  if (!keys.length) {
    selection.setClipboardNotes([])
    return
  }

  const keySet = new Set(keys.map(String))
  const picked = store.activeNotes
    .filter((n) => n?.key && keySet.has(String(n.key)))
    .map((n) => {
      const gridIndex = Number(n?.gridIndex)
      const lengthBlocks = Number(n?.lengthBlocks)
      const safeGrid = Number.isFinite(gridIndex) && gridIndex > 0 ? gridIndex : 1
      const safeLen = Number.isFinite(lengthBlocks) && lengthBlocks > 0 ? lengthBlocks : 1
      const subdivision = Number(n?.subdivision) === 3 ? 3 : 2
      const fret = Number(n?.fret)
      const string = Number(n?.string)
      const color = typeof n?.color === 'string' ? n.color : null
      const noteValue = typeof n?.noteValue === 'string' ? n.noteValue : null
      return {
        fret,
        string,
        gridIndex: safeGrid,
        lengthBlocks: safeLen,
        subdivision,
        ...(noteValue ? { noteValue } : {}),
        ...(color ? { color } : {}),
      }
    })
    .filter((n) => Number.isFinite(n.fret) && Number.isFinite(n.string))

  // Keep stable ordering (helps debugging and predictable paste).
  picked.sort((a, b) => a.gridIndex - b.gridIndex)

  selection.setClipboardNotes(picked)
}

function playheadGridIndex() {
  const t = Number(playheadMs.value) || 0
  const timePerBlock = safeTimePerBlockMs(grid.grid.value.timePerBlock)
  const idx = playheadMsToGridIndex(t, timePerBlock)
  return Number.isFinite(idx) && idx > 0 ? idx : 1
}

function handlePasteAtPlayhead() {
  if (!surfacePolicy.value.canEditNotes) return
  if (playback.isPlaying.value) return
  const clip = selection.clipboardNotes
  const items = Array.isArray(clip?.value) ? clip.value : Array.isArray(clip) ? clip : []
  if (!items.length) return

  const { safeMinGrid, endEdge } = computePasteRange(items)

  const base = Math.max(1, playheadGridIndex())

  const notesToInsert = buildPastedNotes(items, {
    baseGridIndex: base,
    safeMinGrid,
    createKey: createNoteKey,
    nowMs: Date.now(),
  })
  store.addNotes(notesToInsert, { tag: 'paste' })

  // Move playhead to the end of the pasted group.
  // Do this after reactive totals update so seekPlayhead doesn't get clamped to the old duration.
  const timePerBlock = safeTimePerBlockMs(grid.grid.value.timePerBlock)
  const endMs = Math.max(
    0,
    gridIndexToStartMs(base, timePerBlock) + lengthBlocksToDurationMs(endEdge, timePerBlock),
  )
  void nextTick().then(() => seekPlayhead(endMs))
}

function selectedTimelineItems() {
  const keys = Array.isArray(selection.selectedNoteKeys) ? selection.selectedNoteKeys : []
  if (!keys.length) return []

  const items = []
  for (const key of keys) {
    const k = String(key || '')
    if (!k) continue
    const hp = handPositionNotes.value.find((n) => String(n?.key) === k)
    if (hp) {
      items.push({ type: 'hp', note: hp })
      continue
    }
    const n = store.activeNotes.find((x) => String(x?.key) === k)
    if (n) items.push({ type: 'note', note: n })
  }
  return items
}

function handleAddMarkerAtPlayhead() {
  const tMs = Math.max(0, Number(playhead.value) || 0)
  const nextIdx = markers.value.length + 1
  markers.value.push({
    id: `m_${Date.now()}_${nextIdx}`,
    timeMs: tMs,
    label: `M${nextIdx}`,
    title: `Marker ${nextIdx} (${Math.round(tMs)}ms)`,
  })
}

function handleLoopToSelection() {
  if (!surfacePolicy.value.canEditNotes) return
  const items = selectedTimelineItems()
  if (!items.length) return

  let minStart = Infinity
  let maxEnd = -Infinity
  for (const it of items) {
    const startRaw = Number(it?.note?.gridIndex)
    const lenRaw = Number(it?.note?.lengthBlocks)
    const start = Number.isFinite(startRaw) && startRaw > 0 ? startRaw : 1
    const len = Number.isFinite(lenRaw) && lenRaw > 0 ? lenRaw : 1
    minStart = Math.min(minStart, start)
    maxEnd = Math.max(maxEnd, start - 1 + len)
  }
  if (!Number.isFinite(minStart) || !Number.isFinite(maxEnd)) return
  settings.setLoopStartBlock(Math.max(0, Number((minStart - 1).toFixed(4))))
  settings.setLoopEndBlock(Math.max(0, Number(maxEnd.toFixed(4))))
  settings.setLoopEnabled(true)
}

function handleQuantizeSelection() {
  if (!surfacePolicy.value.canEditNotes) return
  const items = selectedTimelineItems()
  if (!items.length) return
  const step = Math.max(0.01, Number(currentStep.value) || 1)
  const noteUpdates = []

  for (const it of items) {
    const key = String(it?.note?.key || '')
    if (!key) continue
    const startRaw = Number(it?.note?.gridIndex)
    const safe = Number.isFinite(startRaw) && startRaw > 0 ? startRaw : 1
    const snapped = Math.max(1, Math.round((safe - 1) / step) * step + 1)
    if (it.type === 'hp') handPositionsStore.setHandPositionGridIndex(key, Number(snapped.toFixed(2)))
    else noteUpdates.push({ key, gridIndex: Number(snapped.toFixed(2)) })
  }
  if (noteUpdates.length) store.setManyGridIndices(noteUpdates)
}

function handleScaleSelectionLength(factor) {
  if (!surfacePolicy.value.canEditNotes) return
  const f = Number(factor)
  if (!Number.isFinite(f) || f <= 0) return
  const items = selectedTimelineItems()
  if (!items.length) return
  const noteUpdates = []
  for (const it of items) {
    const key = String(it?.note?.key || '')
    if (!key) continue
    const lenRaw = Number(it?.note?.lengthBlocks)
    const safe = Number.isFinite(lenRaw) && lenRaw > 0 ? lenRaw : 1
    const next = Math.max(0.01, Number((safe * f).toFixed(2)))
    if (it.type === 'hp') handPositionsStore.setHandPositionLength(key, next)
    else noteUpdates.push({ key, lengthBlocks: next })
  }
  if (noteUpdates.length) store.setManyLengths(noteUpdates)
}

function syncSelectionToExistingNotes() {
  const keys = Array.isArray(selection.selectedNoteKeys) ? selection.selectedNoteKeys : []
  if (!keys.length) return
  const existing = new Set(store.activeNotes.map((n) => String(n?.key)).filter(Boolean))
  selection.setSelectedNotes(keys.filter((k) => existing.has(String(k))))
}

function handleUndo() {
  if (!surfacePolicy.value.canEditNotes) return
  if (playback.isPlaying.value) return
  const ok = store.undo()
  if (ok) syncSelectionToExistingNotes()
}

function handleRedo() {
  if (!surfacePolicy.value.canEditNotes) return
  if (playback.isPlaying.value) return
  const ok = store.redo()
  if (ok) syncSelectionToExistingNotes()
}

watch(
  () => Number(props.externalUndoTick || 0),
  (next, prev) => {
    if (next === prev) return
    handleUndo()
  },
)

watch(
  () => Number(props.externalRedoTick || 0),
  (next, prev) => {
    if (next === prev) return
    handleRedo()
  },
)

watch(
  () => surfaceMode.value,
  (mode) => {
    if (mode === SURFACE_MODES.VIEW) stopPractice(false)
    if (mode !== SURFACE_MODES.COMMENT && mode !== SURFACE_MODES.VIEW) return
    selection.clearGroupTransforms()
    selection.clearSelection()
  },
)

function isEditableTarget(target) {
  const el = target
  const tag = el?.tagName ? String(el.tagName).toLowerCase() : ''
  if (!tag) return false
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
  if (el?.isContentEditable) return true
  return false
}

function onGlobalKeyDown(e) {
  if (!e) return
  if (e.defaultPrevented) return
  if (isEditableTarget(e.target)) return
  if (playback.isPlaying.value) return
  if (!surfacePolicy.value.canEditNotes) return

  const key = String(e.key || '').toLowerCase()
  const mod = Boolean(e.ctrlKey || e.metaKey)
  if (!mod) return

  if (key === 'z' && !e.shiftKey) {
    e.preventDefault()
    handleUndo()
    return
  }

  if (key === 'z' && e.shiftKey) {
    e.preventDefault()
    handleRedo()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onGlobalKeyDown)
})

onBeforeUnmount(() => {
  cancelAudioStart()
  playback.stop()
  clearCountInOverlay()
  stopPractice()
  window.removeEventListener('keydown', onGlobalKeyDown)
})
const audioLoading = ref(false)
const audioError = ref('')
let startRequest = 0
let audioRun = createAudioRun()

function invalidateAudioRun() {
  audioRun.cancel()
  audioRun = createAudioRun()
}

function cancelAudioStart() {
  startRequest += 1
  audioLoading.value = false
  invalidateAudioRun()
}

async function togglePlay() {
  if (audioLoading.value) {
    cancelAudioStart()
    return
  }
  if (practiceActive.value || recordActive.value) stopPractice()
  if (playback.isPlaying.value) {
    clearCountInOverlay()
    playback.pause()
    return
  }

  const request = ++startRequest
  const instrumentType = instrument.instrumentType
  audioLoading.value = true
  audioError.value = ''
  try {
    await initAudioEngine({ instrumentType, strict: true })
  } catch {
    if (request === startRequest) {
      audioLoading.value = false
      audioError.value = 'Sounds konnten nicht geladen werden. Bitte erneut Play drücken.'
    }
    return
  }
  if (request !== startRequest || instrumentType !== instrument.instrumentType) return
  audioLoading.value = false
  invalidateAudioRun()

  // When starting playback, remove any UI markings (selection / drag previews / leftover pulses).
  selection.clearGroupTransforms()
  selection.clearSelection()
  playbackVisuals.clear()

  const playbackStartTargetMs = Math.max(0, Number(effectivePlaybackRangeMs.value.start) || 0)
  const playbackEndTargetMs = Math.max(0, Number(effectivePlaybackRangeMs.value.end) || 0)

  // If we're at/after the end, restart from 0.
  if (Number(playhead.value) >= playbackEndTargetMs) {
    seekPlayhead(playbackStartTargetMs)
    lastAudioTickMs = -Infinity
    lastClickTickMs = -Infinity
    triggeredNoteKeys = new Set()
    playbackVisuals.clear()
  }

  triggeredNoteKeys = new Set()

  // Ensure note events exactly at the current playhead get triggered on the first tick.
  // Example: first note at 0ms when starting from the beginning.
  const ph = Number(playhead.value)
  lastAudioTickMs = (Number.isFinite(ph) ? ph : 0) - 0.0001
  lastClickTickMs = (Number.isFinite(ph) ? ph : 0) - 0.0001

  const tempoValue = Number(transport.tempo) || 120
  const beatsPerBarRaw = Number.parseInt(String(beatTop.value), 10)
  const beatsPerBar = Number.isFinite(beatsPerBarRaw) && beatsPerBarRaw > 0 ? beatsPerBarRaw : 4
  const shouldCountIn = Boolean(countInEnabled.value)
  const countInMs = shouldCountIn
    ? Math.max(0, (60000 / tempoValue) * beatsPerBar)
    : 0
  const startLeadInMs = shouldCountIn ? 0 : PLAYBACK_START_LEAD_IN_MS
  const startAt = getSharedAudioContext().currentTime + 0.04
  if (shouldCountIn) startCountInOverlay(tempoValue, beatsPerBar, { startAt, signal: audioRun.signal })
  else clearCountInOverlay()

  playback.start(totalDuration.value, transport.tempo, { delayMs: countInMs + startLeadInMs, startAt })
}

function seekStart() {
  // Only reposition the playhead; do not start playback.
  if (!loopEnabled.value) {
    seekPlayhead(0)
    return
  }

  const timePerBlock = safeTimePerBlockMs(grid.grid.value.timePerBlock)
  const loopStartMs = loopRangeBlocks.value.start * timePerBlock
  const loopEndMs = loopRangeBlocks.value.end * timePerBlock
  const currentMs = Number(playhead.value)
  const epsilonMs = 0.5
  const isAtLoopStart = Math.abs(currentMs - loopStartMs) <= epsilonMs
  const isInsideLoop = currentMs >= loopStartMs - epsilonMs && currentMs < loopEndMs - epsilonMs

  if (Number.isFinite(loopStartMs) && Number.isFinite(loopEndMs) && loopEndMs > loopStartMs && isInsideLoop) {
    seekPlayhead(isAtLoopStart ? 0 : loopStartMs)
    return
  }

  seekPlayhead(0)
}

function seekPlayhead(tMs) {
  cancelAudioStart()
  clearCountInOverlay()
  const total = Number(totalDuration.value) || 0
  const t = Math.min(total, Math.max(0, Number(tMs) || 0))

  // Keep audio triggering consistent after scrubbing/auto-seeking.
  lastAudioTickMs = t - 0.0001
  lastClickTickMs = t - 0.0001
  triggeredNoteKeys = new Set()
  playbackVisuals.clear()

  transport.setPlayheadMs(t)

  playback.seek(t, { emitTick: false })
  playhead.value = t
  playbackVisuals.prune(t)
}

function seekToGridIndex(gridIndex) {
  const idx = Number(gridIndex)
  if (!Number.isFinite(idx)) return
  const timePerBlock = safeTimePerBlockMs(grid.grid.value.timePerBlock)
  seekPlayhead(gridIndexToStartMs(idx, timePerBlock))
}

function seekToNoteEnd(noteKey, overrides = {}) {
  // Avoid fighting playback while playing.
  if (playback.isPlaying.value) return

  const key = String(noteKey || '')
  if (!key) return
  const note = store.activeNotes.find((n) => n?.key === key)
  if (!note) return

  const gridIndexRaw = overrides?.gridIndex ?? note?.gridIndex
  const lengthBlocksRaw = overrides?.lengthBlocks ?? note?.lengthBlocks

  const gridIndex = Number(gridIndexRaw)
  const lengthBlocks = Number(lengthBlocksRaw)
  if (!Number.isFinite(gridIndex)) return
  if (!Number.isFinite(lengthBlocks)) return

  const safeGridIndex = gridIndex > 0 ? gridIndex : 1
  const safeLen = lengthBlocks > 0 ? lengthBlocks : 1

  const timePerBlock = safeTimePerBlockMs(grid.grid.value.timePerBlock)
  const endMs =
    gridIndexToStartMs(safeGridIndex, timePerBlock) + lengthBlocksToDurationMs(safeLen, timePerBlock)
  seekPlayhead(endMs)
}

watch(
  () => store.activeNotes.map((n) => n?.key).filter(Boolean),
  (keys, prevKeys) => {
    if (playback.isPlaying.value) return
    if (!Array.isArray(prevKeys)) return
    const delta = keys.length - prevKeys.length
    if (delta <= 0) return

    const prev = new Set(prevKeys)
    const addedKeys = keys.filter((k) => !prev.has(k))
    if (!addedKeys.length) return
    for (const k of addedKeys) ensureTimelineCoversNoteEnd(k)

    // Paste/add-many: extend timeline, but don't auto-seek to a random note.
    if (addedKeys.length !== 1) return
    const [addedKey] = addedKeys

    // In chord mode, keep the playhead fixed but remember the last created note.
    if (selectedMode.value === 'sim') {
      pendingChordExitSeekNoteKey.value = addedKey
      return
    }

    seekToNoteEnd(addedKey)
  },
)

watch(
  () => selectedMode.value,
  (nextMode, prevMode) => {
    if (playback.isPlaying.value) return
    if (prevMode !== 'sim' || nextMode === 'sim') return

    const key = pendingChordExitSeekNoteKey.value
    pendingChordExitSeekNoteKey.value = null
    if (!key) return
    ensureTimelineCoversNoteEnd(key)
    seekToNoteEnd(key)
  },
)

const totalDuration = computed(() => {
  // Timeline duration is derived from number of raster blocks (not from note "time")
  return totalBlocks.value * grid.grid.value.timePerBlock
})

const autoTotalBlocks = computed(() => {
  const oneBarBlocks = blocksPerBar()
  const blocksPerBarCeil = Math.max(1, Math.ceil(oneBarBlocks))

  const maxNotesEnd = Math.max(
    0,
    ...notesForRender.value.map((n) => {
      const start = Number(n.gridIndex) || 0
      const len = Number(n.lengthBlocks) || 1
      return start + Math.max(0, len) - 1
    }),
  )
  const maxHandPosEnd = Math.max(
    0,
    ...handPositionNotes.value.map((n) => {
      const start = Number(n?.gridIndex) || 0
      const len = Number(n?.lengthBlocks) || oneBarBlocks
      return start + Math.max(0, len) - 1
    }),
  )
  const maxEnd = Math.max(maxNotesEnd, maxHandPosEnd)

  // Keep 1 bar of space to the right; minimum timeline is 1 bar.
  const withPadding = Math.ceil(maxEnd + blocksPerBarCeil)
  return Math.max(blocksPerBarCeil, withPadding)
})

const totalBlocks = computed(() => {
  const manual = Number(timelineLengthBlocks.value) || 0
  if (manual > 0) return manual
  const blocksPerBarValue = Math.max(1, Number(blocksPerBar()) || 1)
  const defaultBars = Math.max(1, Number(TIMELINE_LAYOUT.bars.defaultCount) || 2)
  const defaultBlocks = Number((defaultBars * blocksPerBarValue).toFixed(3))
  return Math.max(autoTotalBlocks.value, defaultBlocks)
})

const loopRangeBlocks = computed(() => {
  const activeColor = String(activeDotGroupColor.value || '').trim()
  if (activeColor) {
    const groupNotes = filteredPlaybackNotes.value
      .map((note) => {
        const start = Number(note?.gridIndex)
        const len = Number(note?.lengthBlocks)
        if (!Number.isFinite(start)) return null
        const safeStart = start > 0 ? start - 1 : 0
        const safeLen = Number.isFinite(len) && len > 0 ? len : 1
        return {
          start: safeStart,
          end: safeStart + safeLen,
        }
      })
      .filter(Boolean)
    if (groupNotes.length) {
      const start = Math.max(0, Math.min(...groupNotes.map((note) => Number(note.start) || 0)))
      const total = Math.max(1, Number(totalBlocks.value) || 1)
      const end = Math.min(total, Math.max(start + 0.01, Math.max(...groupNotes.map((note) => Number(note.end) || 0))))
      return { start, end }
    }
  }

  const total = Math.max(1, Number(totalBlocks.value) || 1)
  const step = Math.max(0.01, Number(currentStep.value) || 1)
  const startRaw = Number(loopStartBlock.value)
  const start = Number.isFinite(startRaw) ? Math.min(Math.max(0, startRaw), total - step) : 0
  const endRaw = Number(loopEndBlock.value)
  const defaultEnd = total
  const endCandidate = Number.isFinite(endRaw) && endRaw > 0 ? endRaw : defaultEnd
  const end = Math.min(total, Math.max(start + step, endCandidate))
  return { start, end }
})

const playhead = ref(0)
const markers = ref([])
let lastAudioTickMs = -Infinity
let lastClickTickMs = -Infinity
let triggeredNoteKeys = new Set()
const pendingChordExitSeekNoteKey = ref(null)
const practiceActive = ref(false)
const recordActive = ref(false)
const practiceTargetIndex = ref(-1)
const practiceDetectedLabel = ref('')
const practiceHintText = ref('')
const practiceMatchState = ref('')
const practiceConsecutiveHits = ref(0)
const recordConsecutiveHits = ref(0)
const recordLastCaptured = ref({ midi: null, gridIndex: -1, at: 0 })
let practiceRafId = 0
let practiceStream = null
let practiceAudioCtx = null
let practiceAnalyser = null
let practiceData = null
let practiceCooldownUntil = 0
let recordCooldownUntil = 0
const PRACTICE_MIN_RMS = 0.008
const PRACTICE_TUNE_CENTS = 35
const PRACTICE_OK_CENTS = 15
const PRACTICE_HITS_REQUIRED = 4
const RECORD_TUNE_CENTS = 30
const RECORD_HITS_REQUIRED = 3
const RECORD_MIN_GAP_MS = 180
const RECORD_SAME_NOTE_GRID_EPS = 0.15
const {
  countInVisible,
  countInBeat,
  clearCountInOverlay,
  startCountInOverlay,
} = useCountInOverlay({
  pickupEnabled,
  pickupBeats,
  clickEnabled,
  playMetronomeClick,
})

const PLAYBACK_LOOKAHEAD_MS = 140

const practiceTargets = computed(() => {
  const t = tuning.value
  return store.activeNotes
    .map((n) => {
      const midi = Number(midiForNote(n, t))
      const gridIndex = Number(n?.gridIndex)
      if (!Number.isFinite(midi) || !Number.isFinite(gridIndex)) return null
      const startMs = gridIndexToStartMs(gridIndex, safeTimePerBlockMs(grid.grid.value.timePerBlock))
      return {
        key: String(n?.key || ''),
        midi,
        startMs,
        label: midiToNoteName(midi, { includeOctave: true }) || `MIDI ${midi}`,
      }
    })
    .filter(Boolean)
    .sort((a, b) => (a.startMs - b.startMs) || (a.midi - b.midi))
})

const practiceAvailable = computed(() => practiceTargets.value.length > 0)
const practiceCurrentTarget = computed(() => {
  const idx = Number(practiceTargetIndex.value)
  if (!Number.isFinite(idx) || idx < 0) return null
  return practiceTargets.value[idx] ?? null
})
const practiceTargetLabel = computed(() => practiceCurrentTarget.value?.label ?? '')

function freqToMidi(freqHz) {
  const f = Number(freqHz)
  if (!(f > 0)) return null
  return 69 + 12 * Math.log2(f / 440)
}

function midiToFreq(midi) {
  const m = Number(midi)
  if (!Number.isFinite(m)) return 0
  return 440 * (2 ** ((m - 69) / 12))
}

function bestFretStringForMidi(midi) {
  const openMidi = Array.isArray(tuning.value?.openMidi) ? tuning.value.openMidi : []
  const maxStrings = Math.max(0, Number(numStrings.value) || 0)
  const maxFret = Math.max(0, Number(props.numFrets) || 0)
  const targetMidi = Number(midi)
  if (!Number.isFinite(targetMidi)) return null

  const candidates = []
  for (let s = 1; s <= maxStrings; s += 1) {
    const open = Number(openMidi[s - 1])
    if (!Number.isFinite(open)) continue
    const fret = targetMidi - open
    if (!Number.isFinite(fret)) continue
    if (fret < 0 || fret > maxFret) continue
    candidates.push({ string: s, fret })
  }
  if (!candidates.length) return null
  candidates.sort((a, b) => (a.fret - b.fret) || (a.string - b.string))
  // TODO: Replace lowest-fret heuristic with AI-based positional disambiguation.
  return candidates[0]
}

function detectPitchHzAutoCorrelation(data, sampleRate) {
  const size = data?.length || 0
  if (size < 2) return null
  let rms = 0
  for (let i = 0; i < size; i += 1) rms += data[i] * data[i]
  rms = Math.sqrt(rms / size)
  if (rms < PRACTICE_MIN_RMS) return null

  const maxLag = Math.floor(size / 2)
  let bestLag = -1
  let bestCorr = 0

  for (let lag = 8; lag < maxLag; lag += 1) {
    let corr = 0
    for (let i = 0; i < maxLag; i += 1) corr += data[i] * data[i + lag]
    if (corr > bestCorr) {
      bestCorr = corr
      bestLag = lag
    }
  }
  if (bestLag <= 0 || !(bestCorr > 0)) return null
  return sampleRate / bestLag
}

function stopPracticeAudio() {
  if (practiceRafId) {
    cancelAnimationFrame(practiceRafId)
    practiceRafId = 0
  }
  if (practiceStream) {
    for (const track of practiceStream.getTracks?.() || []) track.stop?.()
    practiceStream = null
  }
  if (practiceAudioCtx) {
    practiceAudioCtx.close?.()
    practiceAudioCtx = null
  }
  practiceAnalyser = null
  practiceData = null
}

function stopPractice(resetUi = true) {
  practiceActive.value = false
  recordActive.value = false
  stopPracticeAudio()
  if (resetUi) {
    practiceMatchState.value = ''
    practiceDetectedLabel.value = ''
    practiceHintText.value = ''
  }
  practiceConsecutiveHits.value = 0
  recordConsecutiveHits.value = 0
  recordLastCaptured.value = { midi: null, gridIndex: -1, at: 0 }
}

function advancePracticeTarget() {
  practiceConsecutiveHits.value = 0
  practiceDetectedLabel.value = ''
  practiceHintText.value = ''
  practiceMatchState.value = ''
  practiceCooldownUntil = performance.now() + 220
  const next = Number(practiceTargetIndex.value) + 1
  if (next >= practiceTargets.value.length) {
    stopPractice(false)
    practiceHintText.value = t('playback.complete')
    return
  }
  practiceTargetIndex.value = next
  const target = practiceTargets.value[next]
  if (target) seekPlayhead(target.startMs)
}

function runPracticeFrame() {
  if ((!practiceActive.value && !recordActive.value) || !practiceAnalyser || !practiceData || !practiceAudioCtx) return
  practiceAnalyser.getFloatTimeDomainData(practiceData)
  const freq = detectPitchHzAutoCorrelation(practiceData, practiceAudioCtx.sampleRate)
  const now = performance.now()
  if (!(freq > 0)) {
    practiceConsecutiveHits.value = 0
    recordConsecutiveHits.value = 0
    practiceDetectedLabel.value = ''
    practiceHintText.value = t('playback.listening')
    practiceMatchState.value = ''
    practiceRafId = requestAnimationFrame(runPracticeFrame)
    return
  }

  const detectedMidiFloat = freqToMidi(freq)
  const detectedMidi = Number.isFinite(detectedMidiFloat) ? Math.round(detectedMidiFloat) : null
  practiceDetectedLabel.value = Number.isFinite(detectedMidi)
    ? (midiToNoteName(detectedMidi, { includeOctave: true }) || '')
    : ''

  if (recordActive.value) {
    if (!surfacePolicy.value.canEditNotes) {
      stopPractice(false)
      return
    }
    if (!Number.isFinite(detectedMidi)) {
      recordConsecutiveHits.value = 0
    } else {
      const expectedFreq = midiToFreq(detectedMidi)
      const centsToRounded = expectedFreq > 0 ? 1200 * Math.log2(freq / expectedFreq) : 999
      const absCentsRounded = Math.abs(centsToRounded)
      if (absCentsRounded <= RECORD_TUNE_CENTS) {
        recordConsecutiveHits.value += 1
      } else {
        recordConsecutiveHits.value = 0
      }

      if (now >= recordCooldownUntil && recordConsecutiveHits.value >= RECORD_HITS_REQUIRED) {
        const pos = bestFretStringForMidi(detectedMidi)
        if (pos) {
          const gridIndex = playheadGridIndex()
          const last = recordLastCaptured.value
          const sameAsLast = Number(last.midi) === Number(detectedMidi)
            && Math.abs((Number(last.gridIndex) || 0) - gridIndex) <= RECORD_SAME_NOTE_GRID_EPS
            && (now - (Number(last.at) || 0)) < RECORD_MIN_GAP_MS
          if (!sameAsLast) {
            const note = store.addNote(`${pos.fret}-${pos.string}`)
            if (note?.key) handleUpdateNoteGridIndex(note.key, gridIndex)
            recordLastCaptured.value = { midi: detectedMidi, gridIndex, at: now }
            recordCooldownUntil = now + RECORD_MIN_GAP_MS
            recordConsecutiveHits.value = 0
            practiceMatchState.value = 'ok'
            practiceHintText.value = t('playback.noteRecorded', { note: practiceDetectedLabel.value || detectedMidi })
          }
        }
      }
    }
    practiceRafId = requestAnimationFrame(runPracticeFrame)
    return
  }

  const target = practiceCurrentTarget.value
  if (!target) {
    stopPractice()
    return
  }

  const targetFreq = midiToFreq(target.midi)
  if (!(targetFreq > 0)) {
    practiceRafId = requestAnimationFrame(runPracticeFrame)
    return
  }

  const cents = 1200 * Math.log2(freq / targetFreq)
  const absCents = Math.abs(cents)
  const sign = cents > 0 ? '+' : ''
  practiceHintText.value = `${sign}${Math.round(cents)}c`
  practiceMatchState.value = absCents <= PRACTICE_OK_CENTS
    ? 'ok'
    : absCents <= PRACTICE_TUNE_CENTS
      ? 'tune'
      : ''

  if (now >= practiceCooldownUntil && absCents <= PRACTICE_TUNE_CENTS) {
    practiceConsecutiveHits.value += 1
    if (practiceConsecutiveHits.value >= PRACTICE_HITS_REQUIRED) advancePracticeTarget()
  } else if (absCents > PRACTICE_TUNE_CENTS) {
    practiceConsecutiveHits.value = 0
  }

  practiceRafId = requestAnimationFrame(runPracticeFrame)
}

async function startPractice() {
  cancelAudioStart()
  if (!globalThis.navigator?.mediaDevices?.getUserMedia) {
    practiceMatchState.value = 'error'
    practiceHintText.value = t('playback.micUnavailable')
    return
  }
  if (!practiceAvailable.value) {
    practiceMatchState.value = 'error'
    practiceHintText.value = t('playback.noPracticeNotes')
    return
  }
  if (playback.isPlaying.value) playback.pause()
  clearCountInOverlay()

  const current = Number(playhead.value) || 0
  const idx = practiceTargets.value.findIndex((n) => Number(n.startMs) >= current - 1)
  practiceTargetIndex.value = idx >= 0 ? idx : 0
  practiceDetectedLabel.value = ''
  practiceHintText.value = ''
  practiceMatchState.value = ''
  practiceConsecutiveHits.value = 0
  practiceCooldownUntil = 0
  const target = practiceTargets.value[practiceTargetIndex.value]
  if (target) seekPlayhead(target.startMs)
  practiceHintText.value = t('playback.listening')
  practiceMatchState.value = ''

  try {
    practiceStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    })
    const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext
    if (!Ctx) throw new Error('AudioContext not supported')
    practiceAudioCtx = new Ctx()
    await practiceAudioCtx.resume?.()
    const source = practiceAudioCtx.createMediaStreamSource(practiceStream)
    practiceAnalyser = practiceAudioCtx.createAnalyser()
    practiceAnalyser.fftSize = 2048
    practiceData = new Float32Array(practiceAnalyser.fftSize)
    source.connect(practiceAnalyser)
    practiceActive.value = true
    recordActive.value = false
    runPracticeFrame()
  } catch {
    stopPractice(false)
    practiceMatchState.value = 'error'
    practiceHintText.value = t('playback.micDenied')
  }
}

function togglePractice() {
  if (practiceActive.value) {
    stopPractice(false)
    practiceHintText.value = ''
    practiceMatchState.value = ''
    return
  }
  void startPractice()
}

async function startRecord() {
  if (!surfacePolicy.value.canEditNotes) return
  cancelAudioStart()
  if (!globalThis.navigator?.mediaDevices?.getUserMedia) {
    practiceMatchState.value = 'error'
    practiceHintText.value = t('playback.micUnavailable')
    return
  }
  clearCountInOverlay()
  if (playback.isPlaying.value) playback.pause()
  practiceDetectedLabel.value = ''
  practiceHintText.value = t('playback.listening')
  practiceMatchState.value = ''
  recordConsecutiveHits.value = 0
  recordCooldownUntil = 0

  try {
    practiceStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    })
    const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext
    if (!Ctx) throw new Error('AudioContext not supported')
    practiceAudioCtx = new Ctx()
    await practiceAudioCtx.resume?.()
    const source = practiceAudioCtx.createMediaStreamSource(practiceStream)
    practiceAnalyser = practiceAudioCtx.createAnalyser()
    practiceAnalyser.fftSize = 2048
    practiceData = new Float32Array(practiceAnalyser.fftSize)
    source.connect(practiceAnalyser)
    if (!surfacePolicy.value.canEditNotes) {
      stopPractice(false)
      return
    }
    recordActive.value = true
    practiceActive.value = false
    runPracticeFrame()
  } catch {
    stopPractice(false)
    practiceMatchState.value = 'error'
    practiceHintText.value = t('playback.micDenied')
  }
}

function toggleRecord() {
  if (!surfacePolicy.value.canEditNotes) return
  if (recordActive.value) {
    stopPractice(false)
    practiceHintText.value = ''
    practiceMatchState.value = ''
    return
  }
  stopPractice(false)
  void startRecord()
}

function isBarStartBeat(beatIndex) {
  const beatsPerBarRaw = Number.parseInt(String(beatTop.value), 10)
  const beatsPerBar = Number.isFinite(beatsPerBarRaw) && beatsPerBarRaw > 0 ? beatsPerBarRaw : 4
  if (!pickupEnabled.value) return beatIndex % beatsPerBar === 0

  const rawPickup = Number.parseInt(String(pickupBeats.value), 10)
  const pickup = Number.isFinite(rawPickup)
    ? Math.max(1, Math.min(Math.max(1, beatsPerBar - 1), Math.min(9, rawPickup)))
    : 1

  if (beatIndex < pickup) return false
  return (beatIndex - pickup) % beatsPerBar === 0
}

function playbackAudioEndMs() {
  return loopEnabled.value
    ? loopRangeBlocks.value.end * safeTimePerBlockMs(grid.grid.value.timePerBlock)
    : effectivePlaybackRangeMs.value.end
}

function maybePlayClickAt(tMs) {
  if (!clickEnabled.value) return

  const t0Raw = lastClickTickMs
  const nowPlayheadMs = Number(tMs) || 0
  const t1Raw = Math.min(playbackAudioEndMs(), nowPlayheadMs + PLAYBACK_LOOKAHEAD_MS * ((Number(tempo.value) || 120) / 120))
  lastClickTickMs = t1Raw

  const t0 = Number.isFinite(t0Raw) ? t0Raw : -0.0001
  const t1 = Number.isFinite(t1Raw) ? t1Raw : 0

  const beatBottomRaw = Number.parseInt(String(beatBottom.value), 10)
  const bb = [1, 2, 4, 8].includes(beatBottomRaw) ? beatBottomRaw : 4
  const blocksPerBeat = 4 / bb
  const timePerBlock = safeTimePerBlockMs(grid.grid.value.timePerBlock)
  const msPerBeat = timePerBlock * blocksPerBeat
  if (!(msPerBeat > 0)) return

  const firstBeat = Math.floor(t0 / msPerBeat) + 1
  const lastBeat = Math.floor(t1 / msPerBeat)
  if (lastBeat < firstBeat) return

  for (let b = firstBeat; b <= lastBeat; b += 1) {
    if (b < 0) continue
    const beatTimeMs = b * msPerBeat
    if (beatTimeMs >= playbackAudioEndMs()) continue
    void playMetronomeClick({
      accent: isBarStartBeat(b), startAt: playback.audioTimeFor(beatTimeMs), signal: audioRun.signal,
    })
  }
}

function maybePlayNotesAt(tMs) {
  if (!soundPreviewEnabled.value) return

  const t0 = lastAudioTickMs
  const nowPlayheadMs = Number(tMs) || 0
  const t1 = Math.min(playbackAudioEndMs(), nowPlayheadMs + PLAYBACK_LOOKAHEAD_MS * ((Number(tempo.value) || 120) / 120))
  lastAudioTickMs = t1

  const t = tuning.value
  if (!t) return

  const tempoValue = Number(tempo.value) || 120
  const tempoScale = 120 / tempoValue
  const timePerBlock = safeTimePerBlockMs(grid.grid.value.timePerBlock)

  for (const note of filteredPlaybackNotes.value) {
    const key = note?.key
    if (!key || triggeredNoteKeys.has(key)) continue

    const gridIndex = Number(note?.gridIndex)
    if (!Number.isFinite(gridIndex)) continue

    const startMs = playbackStartMsForNote(note, timePerBlock)
    if (!(startMs > t0 && startMs <= t1) || startMs >= playbackAudioEndMs()) continue

    const midi = midiForNote(note, t)
    if (!Number.isFinite(Number(midi))) continue

    const lengthBlocks = Number(note?.lengthBlocks)
    const len = Number.isFinite(lengthBlocks) && lengthBlocks > 0 ? lengthBlocks : 1
    const durationPlayheadMs = lengthBlocksToDurationMs(len, timePerBlock)
    const durScale = Number(soundDurationScale.value)
    const safeScale = Number.isFinite(durScale) && durScale > 0 ? durScale : 1
    const durationAudioMs = Math.max(30, durationPlayheadMs * tempoScale * safeScale)
    const startAt = playback.audioTimeFor(startMs)
    if (startAt < getSharedAudioContext().currentTime - 0.025) continue

    triggeredNoteKeys.add(key)
    // Keep the dot "active" for the exact timeline duration (playhead time)
    playbackVisuals.highlight(key, startMs + durationPlayheadMs)
    // But let the audio duration respect tempo (real time)
    void playMidi(midi, {
      durationMs: durationAudioMs,
      startAt,
      signal: audioRun.signal,
      instrumentType: instrument.instrumentType,
    })
  }
}

function playbackStartMsForNote(note, timePerBlock) {
  const gridIndex = Number(note?.gridIndex)
  if (!Number.isFinite(gridIndex)) return NaN

  const baseStartMs = gridIndexToStartMs(gridIndex, timePerBlock)
  if (!shuffleEnabled.value) return baseStartMs
  if (normalizeNoteValue(note?.noteValue) !== '1/8') return baseStartMs
  if (Number(note?.subdivision) === 3) return baseStartMs

  const beatBottomRaw = Number.parseInt(String(beatBottom.value), 10)
  const beatBottomSafe = [1, 2, 4, 8].includes(beatBottomRaw) ? beatBottomRaw : 4
  const blocksPerBeat = 4 / beatBottomSafe
  if (!(blocksPerBeat > 0)) return baseStartMs

  const blockStart = gridIndex - 1
  const withinBeat = ((blockStart % blocksPerBeat) + blocksPerBeat) % blocksPerBeat
  const offbeatPos = blocksPerBeat * 0.5
  const isOffbeatEighth = Math.abs(withinBeat - offbeatPos) <= 1e-3
  if (!isOffbeatEighth) return baseStartMs

  const msPerBeat = timePerBlock * blocksPerBeat
  const swingDelayMs = msPerBeat / 6 // 66/33: offbeat shifts from 1/2 to 2/3 beat
  return baseStartMs + swingDelayMs
}

const playback = usePlayback({
  onInvalidate: invalidateAudioRun,
  onInterrupted: () => {
    clearCountInOverlay()
    audioError.value = 'Wiedergabe unterbrochen. Bitte erneut Play drücken.'
  },
  onTick: (t) => {
    // Loop wrap (or any backwards jump) should reset triggering state.
    if (t < playhead.value) {
      lastAudioTickMs = -Infinity
      lastClickTickMs = -Infinity
      triggeredNoteKeys = new Set()
      playbackVisuals.clear()
    }

    if (loopEnabled.value) {
      const timePerBlock = safeTimePerBlockMs(grid.grid.value.timePerBlock)
      const loopStartMs = loopRangeBlocks.value.start * timePerBlock
      const loopEndMs = loopRangeBlocks.value.end * timePerBlock
      if (Number.isFinite(loopStartMs) && Number.isFinite(loopEndMs) && loopEndMs > loopStartMs) {
        if (t >= loopEndMs) {
          lastAudioTickMs = loopStartMs - 0.0001
          lastClickTickMs = loopStartMs - 0.0001
          triggeredNoteKeys = new Set()
          playbackVisuals.clear()
          const loopStartAt = playback.audioTimeFor(loopEndMs)
          playback.seek(loopStartMs, { startAt: loopStartAt })
          return
        }
      }
    }

    if (!loopEnabled.value) {
      const effectiveEndMs = Math.max(0, Number(effectivePlaybackRangeMs.value.end) || 0)
      if (effectiveEndMs > 0 && t >= effectiveEndMs) {
        playhead.value = effectiveEndMs
        transport.setPlayheadMs(effectiveEndMs)
        playback.pause()
        return
      }
    }

    playhead.value = t
    transport.setPlayheadMs(t)
    playbackVisuals.prune(t)
    if (playback.isPlaying.value) maybePlayClickAt(t)
    if (playback.isPlaying.value) maybePlayNotesAt(t)
  },
})
const isPlaying = computed(() => playback.isPlaying.value)

watch(() => [instrument.instrumentType, tempo.value, loopEnabled.value, clickEnabled.value, soundPreviewEnabled.value, shuffleEnabled.value, loopStartBlock.value, loopEndBlock.value], () => {
  cancelAudioStart()
  clearCountInOverlay()
  if (playback.isPlaying.value) playback.pause()
}, { flush: 'sync' })

// Keep local timeline state in sync with the transport store.
// This allows external UI actions (e.g. clearing notes) to reset the playhead.
watch(
  () => playheadMs.value,
  (tMs) => {
    if (playback.isPlaying.value) return

    const t = Math.max(0, Number(tMs) || 0)
    if (t === playhead.value) return

    lastAudioTickMs = t
    lastClickTickMs = t
    triggeredNoteKeys = new Set()
    playbackVisuals.clear()

    playback.seek(t, { emitTick: false })
    playhead.value = t
    playbackVisuals.prune(t)
  },
  { immediate: true },
)

watch(
  () => loopEnabled.value,
  (v) => playback.setLoop(v),
  { immediate: true },
)

watch(
  () => playback.isPlaying.value,
  (playing) => {
    transport.setPlayState(playing ? 'playing' : 'stopped')
    if (!playing) playbackVisuals.clear()
  },
  { immediate: true },
)

watch(
  () => practiceTargets.value.length,
  (len) => {
    if (!practiceActive.value) return
    if (len <= 0) stopPractice()
    if (practiceTargetIndex.value >= len) practiceTargetIndex.value = Math.max(0, len - 1)
  },
)

defineExpose({
  isPlaying,
  playhead,
  totalDuration,
  practiceActive,
  practiceAvailable,
  practiceTargetLabel,
  practiceDetectedLabel,
  practiceHintText,
  practiceMatchState,
  recordActive,
  togglePlay,
  seekStart,
  seekPlayhead,
  seekToGridIndex,
  togglePractice,
  toggleRecord,
})
</script>
