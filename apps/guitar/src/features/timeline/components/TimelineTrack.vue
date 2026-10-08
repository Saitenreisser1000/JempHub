<template>
  <div class="string-line" :class="{ 'is-aux-track': props.isAuxTrack }">
    <div ref="trackEl" class="timeline-track" :style="trackStyle" @pointerdown="onScrubPointerDown"
      @pointermove="onScrubPointerMove" @pointerup="onScrubPointerUp" @pointercancel="onScrubPointerUp">
      <div class="grid-background" :style="gridBackgroundStyle"></div>
      <div class="bar-lines" aria-hidden="true">
        <span class="bar-line is-start" :style="{ left: '0%' }">
          <span v-if="showBarNumbers" class="bar-line-label">{{ firstBarLabel }}</span>
        </span>
        <span
          v-for="item in barLineItems"
          :key="`bar-line-${item.idx}`"
          class="bar-line"
          :style="{ left: `${item.leftPct}%` }"
        >
          <span v-if="showBarNumbers" class="bar-line-label">{{ item.label }}</span>
        </span>
      </div>
      <div v-if="showPlayhead" class="playhead-indicator" :style="{ left: playheadPercent + '%' }"
        :title="t('timelineTrack.dragPosition')" />
      <NoteEvent v-for="(note, idx) in notes" :key="note.key ?? `note-${note.fret}-${note.gridIndex}-${idx}`"
        :note="note" :total-blocks="totalBlocks" :color="note.color ?? getNoteColor(note.fret)"
        :time-per-block-ms="timePerBlockMs" :snapEnabled="props.snapEnabled" :step="props.step"
        :sim-group-mode="props.simGroupMode" :ghost-outside-timeline="props.ghostNotesEnabled"
        @update-grid-index="(key, gridIndex) => emit('update-note-grid-index', key, gridIndex)"
        @update-length="(key, lengthBlocks) => emit('update-note-length', key, lengthBlocks)"
        @update-label="(key, label) => emit('update-note-label', key, label)"
        @group-move="(anchorKey, deltaBlocks) => emit('group-move-notes', anchorKey, deltaBlocks)" @group-resize="
          (anchorKey, deltaBlocks) => emit('group-resize-notes', anchorKey, deltaBlocks)
        " />
    </div>
  </div>
</template>

<script setup>
import NoteEvent from './NoteEvent.vue'
import { computed, ref } from 'vue'
import { useSelectionStore } from '@/store/useSelection'
import { TIMELINE_SNAP_STEP_BLOCKS } from '@/features/timeline/config/grid'
import { TIMELINE_LAYOUT } from '@/features/timeline/config/timelineLayout'
import { TIMELINE_THEME } from 'jemp-design-system/timeline-theme'
import { snapStepBlocksForMode } from '@/domain/timelineInteractions'
import { useI18n } from '@/i18n'

const props = defineProps({
  string: Number,
  stringLabel: { type: String, default: '' },
  activeString: { type: Number, default: 1 },
  notes: Array,
  totalDuration: Number,
  totalBlocks: { type: Number, default: 16 },
  playhead: Number,
  snapEnabled: Boolean,
  step: Number,
  beatTop: { type: Number, default: 4 },
  beatBottom: { type: Number, default: 4 },
  pickupEnabled: { type: Boolean, default: false },
  pickupBeats: { type: Number, default: 1 },
  trackMinWidthPx: { type: Number, default: 0 },
  simGroupMode: { type: String, default: '' },
  ghostNotesEnabled: { type: Boolean, default: false },
  isAuxTrack: { type: Boolean, default: false },
  showBarNumbers: { type: Boolean, default: false },
  showPlayhead: { type: Boolean, default: true },
  activeTool: { type: String, default: 'arrow' },
  compact: { type: Boolean, default: false },
})

const emit = defineEmits([
  'update-active-string',
  'add-aux-item',
  'update-note-grid-index',
  'update-note-length',
  'update-note-label',
  'group-move-notes',
  'group-resize-notes',
  'seek-playhead',
])
const { t } = useI18n()
const selection = useSelectionStore()

const trackEl = ref(null)
const isScrubbing = ref(false)
const touchScrollEnabled = computed(() =>
  Boolean(props.compact) && String(props.activeTool) === 'arrow',
)

const trackStyle = computed(() => {
  const w = Number(props.trackMinWidthPx) || 0
  // Use a fixed width so zoom-in AND zoom-out are visible.
  const base = {
    '--timeline-track-start-offset-px': `${TIMELINE_LAYOUT.tracks.startOffsetPx}px`,
    '--timeline-track-base-bg': TIMELINE_THEME.track.baseBg,
    '--timeline-track-center-line': TIMELINE_THEME.track.centerLine,
    '--timeline-track-bar-line': TIMELINE_THEME.track.barLine,
    '--timeline-track-bar-line-start': TIMELINE_THEME.track.barLineStart,
    '--timeline-track-bar-label': TIMELINE_THEME.track.barLineLabel,
    '--timeline-track-bar-label-shadow': TIMELINE_THEME.track.barLineLabelShadow,
    '--timeline-track-playhead': TIMELINE_THEME.track.playheadColor,
    '--timeline-track-grid-sub': TIMELINE_THEME.track.gridSubLine,
    '--timeline-track-grid-beat': TIMELINE_THEME.track.gridBeatLine,
    '--timeline-track-aux-divider': TIMELINE_THEME.main.auxDividerColor,
    '--timeline-row-h-default': `${TIMELINE_LAYOUT.tracks.defaultRowHeightPx}px`,
    '--timeline-track-touch-action': touchScrollEnabled.value ? 'pan-x' : 'none',
  }
  return w > 0 ? { ...base, width: `${w}px`, minWidth: `${w}px` } : base
})

const snapStepBlocks = computed(() =>
  snapStepBlocksForMode(props.simGroupMode, TIMELINE_SNAP_STEP_BLOCKS),
)

const playheadPercent = computed(() => {
  const total = Number(props.totalDuration) || 0
  if (!(total > 0)) return 0
  return (Number(props.playhead || 0) / total) * 100
})

function timeFromPointerEvent(e) {
  const el = trackEl.value
  if (!el?.getBoundingClientRect) return null
  const rect = el.getBoundingClientRect()
  const total = Number(props.totalDuration) || 0
  if (!(rect.width > 0) || !(total > 0)) return 0

  const x = Math.min(rect.width, Math.max(0, Number(e?.clientX) - rect.left))
  const rawTime = (x / rect.width) * total

  if (!props.snapEnabled) return rawTime

  const totalBlocks = Math.max(1, Number(props.totalBlocks) || 1)
  const timePerBlock = total / totalBlocks
  if (!(timePerBlock > 0)) return rawTime

  const stepBlocks = snapStepBlocks.value

  const rawBlocks = rawTime / timePerBlock
  const snappedBlocks = Math.round(rawBlocks / stepBlocks) * stepBlocks
  const snappedTime = snappedBlocks * timePerBlock

  return Math.min(total, Math.max(0, snappedTime))
}

function onScrubPointerDown(e) {
  // Don't hijack note dragging/resizing.
  if (e?.target?.closest?.('.note-event')) return
  if (e?.button != null && e.button !== 0) return
  if (touchScrollEnabled.value && e?.pointerType === 'touch') return
  selection.clearSelection()
  if (!props.isAuxTrack) emit('update-active-string', Number(props.string))

  const t = timeFromPointerEvent(e)
  if (t == null) return
  emit('seek-playhead', t)

  isScrubbing.value = true
  trackEl.value?.setPointerCapture?.(e.pointerId)
  e.preventDefault()
}

function onScrubPointerMove(e) {
  if (!isScrubbing.value) return
  const t = timeFromPointerEvent(e)
  if (t == null) return
  emit('seek-playhead', t)
}

function onScrubPointerUp() {
  if (!isScrubbing.value) return
  isScrubbing.value = false
}

const beatsPerBar = computed(() => {
  const v = Number.parseInt(String(props.beatTop), 10)
  return Number.isFinite(v) && v > 0 ? v : 1
})

const beatBottomValue = computed(() => {
  const v = Number.parseInt(String(props.beatBottom), 10)
  return [1, 2, 4, 8].includes(v) ? v : 4
})

// Blocks are quarter-notes (1 block = 1/4). A beat is 4/beatBottom blocks.
const blocksPerBeat = computed(() => {
  const bb = Number(beatBottomValue.value) || 4
  const v = 4 / bb
  return Number.isFinite(v) && v > 0 ? v : 1
})

const blocksPerBar = computed(() => {
  const v = beatsPerBar.value * blocksPerBeat.value
  return Number.isFinite(v) && v > 0 ? v : 1
})

const pickupBeatsClamped = computed(() => {
  const raw = Number.parseInt(String(props.pickupBeats), 10)
  const maxByBeat = Math.max(1, beatsPerBar.value - 1)
  const max = Math.max(1, Math.min(9, maxByBeat))
  if (!Number.isFinite(raw)) return 1
  return Math.max(1, Math.min(max, raw))
})

const barLinePositionsPct = computed(() => {
  const total = Math.max(1, Number(props.totalBlocks) || 1)
  const bar = Math.max(0.0001, Number(blocksPerBar.value) || 1)
  const out = []
  const pushPct = (blockPos) => {
    if (!(blockPos > 0) || !(blockPos < total)) return
    out.push((blockPos / total) * 100)
  }

  if (props.pickupEnabled) {
    const pickupBlocks = pickupBeatsClamped.value * blocksPerBeat.value
    let pos = pickupBlocks
    pushPct(pos)
    while (pos < total) {
      pos += bar
      pushPct(pos)
    }
    return out
  }

  for (let pos = bar; pos < total; pos += bar) pushPct(pos)
  return out
})

const barLineItems = computed(() => {
  const lefts = Array.isArray(barLinePositionsPct.value) ? barLinePositionsPct.value : []
  const out = []
  const pickupOn = Boolean(props.pickupEnabled)
  for (let i = 0; i < lefts.length; i += 1) {
    const label = pickupOn ? i + 1 : i + 2
    out.push({ idx: i, leftPct: lefts[i], label })
  }
  return out
})

const showBarNumbers = computed(() => Boolean(props.showBarNumbers))
const firstBarLabel = computed(() => (props.pickupEnabled ? 0 : 1))

const gridBackgroundStyle = computed(() => {
  const snapStep = snapStepBlocks.value
  const subdivisionsPerBlock = Math.max(1, Math.round(1 / snapStep))
  const total = Math.max(1, Number(props.totalBlocks) || 1)
  const pxPerBlock = (Number(props.trackMinWidthPx) || 0) / total
  const grid = TIMELINE_LAYOUT.tracks.gridVisibility
  const subOpacity =
    pxPerBlock >= grid.subStrongMinPxPerBlock
      ? grid.subStrongOpacity
      : pxPerBlock >= grid.subWeakMinPxPerBlock
        ? grid.subWeakOpacity
        : 0
  const beatOpacity = pxPerBlock >= grid.beatMinPxPerBlock ? 1 : grid.beatWeakOpacity
  return {
    '--total-blocks': String(props.totalBlocks),
    '--blocks-per-beat': String(blocksPerBeat.value),
    '--subdiv-per-block': String(subdivisionsPerBlock),
    '--sub-opacity': String(subOpacity),
    '--beat-opacity': String(beatOpacity),
  }
})

const timePerBlockMs = computed(() => {
  const total = Number(props.totalDuration) || 0
  const blocks = Math.max(1, Number(props.totalBlocks) || 1)
  const v = total / blocks
  return Number.isFinite(v) && v > 0 ? v : 0
})

function getNoteColor(fret) {
  const colors = TIMELINE_THEME.track.defaultNoteColors
  return colors[fret % colors.length]
}
</script>

<style scoped>
.string-line {
  display: flex;
  border-bottom: 0;
}

.string-line.is-aux-track {
  border-bottom: 4px solid var(--timeline-track-aux-divider);
  margin-bottom: 4px;
}

.timeline-track {
  position: relative;
  flex: 0 0 auto;
  height: var(--timeline-row-h, var(--timeline-row-h-default));
  margin-left: var(--timeline-track-start-offset-px, 6px);
  background: var(--timeline-track-base-bg);
  border-radius: 10px;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.03);
}

.timeline-track::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 1px;
  background: var(--timeline-track-center-line);
  transform: translateY(-0.5px);
  pointer-events: none;
  z-index: 4;
}

.string-line.is-aux-track .timeline-track::after {
  content: none;
}

.timeline-track {
  touch-action: var(--timeline-track-touch-action, none);
}

.grid-background {
  position: absolute;
  width: 100%;
  height: 100%;
  pointer-events: none;
  --cell: calc(100% / var(--total-blocks));
  --sub: calc(var(--cell) / var(--subdiv-per-block));
  --beat: calc(var(--cell) * var(--blocks-per-beat));
  background-image:
    repeating-linear-gradient(to right,
      var(--timeline-track-grid-sub) 0px,
      var(--timeline-track-grid-sub) 1px,
      transparent 1px,
      transparent var(--sub)),
    repeating-linear-gradient(to right,
      var(--timeline-track-grid-beat) 0px,
      var(--timeline-track-grid-beat) 2px,
      transparent 2px,
      transparent var(--beat));
}

.bar-lines {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
}

.bar-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 3px;
  transform: translateX(-50%);
  background: var(--timeline-track-bar-line);
  opacity: 0.9;
}

.bar-line.is-start {
  transform: translateX(0);
  background: var(--timeline-track-bar-line-start);
}

.bar-line-label {
  position: absolute;
  top: 1px;
  left: 5px;
  font-size: 9px;
  line-height: 1;
  font-weight: 700;
  color: var(--timeline-track-bar-label);
  text-shadow: var(--timeline-track-bar-label-shadow);
  pointer-events: none;
  user-select: none;
}

.playhead-indicator {
  position: absolute;
  width: 4px;
  height: 100%;
  background: var(--timeline-track-playhead);
  transform: translateX(-50%);
  z-index: 5;
  cursor: ew-resize;
  box-shadow:
    0 0 0 1px rgb(255 244 226 / 0.68),
    0 0 14px color-mix(in srgb, var(--timeline-track-playhead) 70%, white 30%);
}
</style>
