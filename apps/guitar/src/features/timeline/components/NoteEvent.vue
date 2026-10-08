<template>
  <div v-if="isVisibleInTimeline || isGhostVisible" class="note-event"
    :class="{ 'is-selected': isSelected, 'is-ghost': isGhostVisible, 'is-dimmed': isDimmed, 'is-disabled': isDisabled }" :data-note-key="note?.key"
    :style="noteStyle" :title="title"
    @pointerdown="onPointerDown" @pointermove="onPointerMove" @pointerup="onPointerUp" @pointercancel="onPointerUp"
    @contextmenu.prevent.stop="onContextMenu">
    <div class="note-label" :class="{ 'is-hand-position-label': isHandPositionNote }">
      <span class="fret-number" :class="{ 'is-editable': isHandPositionNote }" @pointerdown.stop
        @click.stop="onEditLabel" @dblclick.stop="onEditLabel">
        {{ note.fret }}
      </span>
      <span v-if="pitchLabel" class="pitch-label">{{ pitchLabel }}</span>
    </div>
    <div v-if="dragTooltip" class="drag-tooltip">{{ dragTooltip }}</div>
    <div class="resize-handle" @pointerdown.stop="onResizePointerDown" />
  </div>

  <Teleport to="body">
    <div
      v-if="contextMenu.open"
      class="note-context-menu"
      :style="contextMenuStyle"
      @pointerdown.stop
      @contextmenu.prevent
    >
      <button class="note-context-item is-danger" type="button" @click="onDeleteFromContextMenu">
        {{ t('fretboardShow.delete') }}
      </button>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { useSelectionStore } from '@/store/useSelection'
import { useNotesStore } from '@/store/useNotes'
import { useInstrumentStore } from '@/store/useInstrument'
import { useTimelineSettingsStore } from '@/store/useTimelineSettings'
import { useTransportStore } from '@/store/useTransport'
import { useUiModeStore } from '@/store/useUiMode'
import { TIMELINE_SNAP_STEP_BLOCKS } from '@/features/timeline/config/grid'
import { getTuning } from '@/domain/music/tunings'
import { midiToNoteName } from '@/domain/music/notes'
import { midiForNote } from '@/domain/music/pitch'
import { playMidi } from '@/domain/audio/simpleSynth'
import { clampResizeLength, snapStepBlocksForMode } from '@/domain/timelineInteractions'
import { useI18n } from '@/i18n'
const props = defineProps({
  note: { type: Object, required: true },
  totalBlocks: { type: Number, default: 16 },
  timePerBlockMs: { type: Number, default: 0 },
  color: String,
  snapEnabled: Boolean,
  step: Number,
  simGroupMode: { type: String, default: '' },
  ghostOutsideTimeline: { type: Boolean, default: false },
})

const emit = defineEmits(['update-grid-index', 'update-length', 'update-label', 'group-move', 'group-resize'])

const selection = useSelectionStore()
const notesStore = useNotesStore()
const instrument = useInstrumentStore()
const settings = useTimelineSettingsStore()
const transport = useTransportStore()
const uiMode = useUiModeStore()
const { t } = useI18n()
const isSelected = computed(() => selection.isSelected(props.note?.key))
const isGroupSelected = computed(
  () => isSelected.value && (selection.selectedNoteKeys?.length || 0) > 1,
)
const isHandPositionNote = computed(() => String(props.note?.key ?? '').startsWith('hp_'))
const isDisabled = computed(() => !uiMode.surfacePolicy.canEditNotes)
const isDimmed = computed(() => uiMode.surfacePolicy.dimNoteEvents)
const snapStepBlocks = computed(() =>
  snapStepBlocksForMode(props.simGroupMode, TIMELINE_SNAP_STEP_BLOCKS),
)

const safeLengthBlocks = computed(() => {
  const raw = Number(props.note?.lengthBlocks ?? 1)
  return Number.isFinite(raw) && raw > 0 ? raw : 1
})

function selectForwardFromHere({ allStrings = false } = {}) {
  const key = props.note?.key
  if (!key) return

  const startGridIndex = Number(props.note?.gridIndex)
  const string = Number(props.note?.string)
  if (!Number.isFinite(startGridIndex) || (!allStrings && !Number.isFinite(string))) {
    selection.selectNote(key)
    return
  }

  const candidates = Array.isArray(notesStore.activeNotes) ? notesStore.activeNotes : []
  const laterOrEqual = candidates
    .filter((n) => (allStrings ? true : Number(n?.string) === string))
    .filter((n) => {
      const gi = Number(n?.gridIndex)
      return Number.isFinite(gi) && gi >= startGridIndex
    })

  laterOrEqual.sort((a, b) => {
    const ga = Number(a?.gridIndex) || 0
    const gb = Number(b?.gridIndex) || 0
    if (ga !== gb) return ga - gb
    const ta = Number(a?.placedAtMs) || 0
    const tb = Number(b?.placedAtMs) || 0
    if (ta !== tb) return ta - tb
    return String(a?.key ?? '').localeCompare(String(b?.key ?? ''))
  })

  const keys = laterOrEqual
    .map((n) => n?.key)
    .filter(Boolean)
    .map((k) => String(k))

  // Make clicked note primary by placing it first.
  const clicked = String(key)
  const next = [clicked, ...keys.filter((k) => k !== clicked)]
  selection.setSelectedNotes(next)
}

const pitchLabel = computed(() => {
  if (isHandPositionNote.value) return ''
  const t = getTuning(instrument.tuningId)
  const midi = midiForNote(props.note, t)
  if (!Number.isFinite(Number(midi))) return ''
  return midiToNoteName(midi, { includeOctave: true })
})

const isDragging = ref(false)
const dragGridIndex = ref(null)
const isResizing = ref(false)
const dragLength = ref(null)
let startClientX = 0
let startGridIndex = 1
let cellWidthPx = 0
let startLength = 1

const visualGridIndex = computed(() => {
  const base = Number(props.note?.gridIndex ?? 1)
  const useGroup = isGroupSelected.value && selection.groupDragActive
  const previewDelta =
    isGroupSelected.value && selection.groupDragActive
      ? Number(selection.groupDragDeltaBlocks || 0)
      : 0
  const preview = base + previewDelta
  return useGroup
    ? preview
    : isDragging.value
      ? Number(dragGridIndex.value ?? base)
      : base
})

const isVisibleInTimeline = computed(() => {
  const total = Math.max(1, Number(props.totalBlocks) || 1)
  const gridIndex = Number(visualGridIndex.value)
  if (!Number.isFinite(gridIndex)) return false
  // Notes right of the current timeline end are hidden instead of being clamped to the edge.
  return gridIndex <= total
})

const isGhostVisible = computed(() => {
  if (!props.ghostOutsideTimeline) return false
  if (isVisibleInTimeline.value) return false
  const total = Math.max(1, Number(props.totalBlocks) || 1)
  const gridIndex = Number(visualGridIndex.value)
  return Number.isFinite(gridIndex) && gridIndex > total
})

const leftPercent = computed(() => {
  const total = Math.max(1, Number(props.totalBlocks) || 1)
  const gridIndex = Number(visualGridIndex.value)
  const clamped = Math.min(total, Math.max(1, gridIndex))
  // left edge of the cell: raster 1 => 0%
  return ((clamped - 1) / total) * 100
})

function parseColorToRgb(input) {
  const raw = String(input ?? '').trim()
  if (!raw) return null

  const hex = raw.replace('#', '')
  if (/^[\da-f]{3}$/i.test(hex)) {
    const r = Number.parseInt(hex[0] + hex[0], 16)
    const g = Number.parseInt(hex[1] + hex[1], 16)
    const b = Number.parseInt(hex[2] + hex[2], 16)
    return { r, g, b }
  }
  if (/^[\da-f]{6}$/i.test(hex)) {
    const r = Number.parseInt(hex.slice(0, 2), 16)
    const g = Number.parseInt(hex.slice(2, 4), 16)
    const b = Number.parseInt(hex.slice(4, 6), 16)
    return { r, g, b }
  }

  const rgb = raw.match(/^rgba?\(([^)]+)\)$/i)
  if (rgb) {
    const parts = rgb[1].split(',').map((v) => Number.parseFloat(v.trim()))
    if (parts.length >= 3 && parts.slice(0, 3).every((v) => Number.isFinite(v))) {
      return {
        r: Math.max(0, Math.min(255, parts[0])),
        g: Math.max(0, Math.min(255, parts[1])),
        b: Math.max(0, Math.min(255, parts[2])),
      }
    }
  }
  return null
}

function srgbToLinear(v) {
  const c = v / 255
  if (c <= 0.04045) return c / 12.92
  return ((c + 0.055) / 1.055) ** 2.4
}

function relativeLuminance({ r, g, b }) {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b)
}

const noteTextColor = computed(() => {
  const rgb = parseColorToRgb(props.color)
  if (!rgb) return '#F5F7FA'
  return relativeLuminance(rgb) > 0.5 ? '#15212D' : '#F5F7FA'
})

const noteStyle = computed(() => {
  const base = String(props.color || '#4f6f8f')
  const ghost = isGhostVisible.value
  const total = Math.max(1, Number(props.totalBlocks) || 1)
  const safeLen = safeLengthBlocks.value
  const visibleLen = ghost ? Math.min(safeLen, 0.25) : safeLen
  return {
    left: `${ghost ? ((total - 0.25) / total) * 100 : leftPercent.value}%`,
    width: `${(visibleLen / total) * 100}%`,
    backgroundColor: base,
    color: noteTextColor.value,
    '--note-base-color': base,
  }
})

const dragTooltip = computed(() => {
  if (!isDragging.value && !isResizing.value) return ''
  const gi = Number(visualGridIndex.value)
  const len = isResizing.value ? Number(dragLength.value ?? safeLengthBlocks.value) : safeLengthBlocks.value
  if (!Number.isFinite(gi) || !Number.isFinite(len)) return ''
  return t('noteEvent.dragTooltip', {
    grid: gi.toFixed(2),
    length: Math.max(0.01, len).toFixed(2),
  })
})

const contextMenu = ref({
  open: false,
  x: 0,
  y: 0,
})

const contextMenuStyle = computed(() => ({
  left: `${Number(contextMenu.value.x) || 0}px`,
  top: `${Number(contextMenu.value.y) || 0}px`,
}))

function closeContextMenu() {
  if (!contextMenu.value.open) return
  contextMenu.value = { open: false, x: 0, y: 0 }
  window.removeEventListener('pointerdown', onGlobalPointerDown, true)
  window.removeEventListener('keydown', onGlobalKeyDown, true)
  window.removeEventListener('resize', closeContextMenu, true)
  window.removeEventListener('scroll', closeContextMenu, true)
}

function onGlobalPointerDown(event) {
  const target = event?.target
  if (target?.closest?.('.note-context-menu')) return
  closeContextMenu()
}

function onGlobalKeyDown(event) {
  if (event?.key === 'Escape') closeContextMenu()
}

function onContextMenu(event) {
  if (isDisabled.value) return
  const key = props.note?.key
  if (key && !selection.isSelected(key)) selection.selectNote(key)

  const margin = 8
  const menuWidth = 160
  const menuHeight = 40
  const vw = Number(globalThis?.innerWidth) || 0
  const vh = Number(globalThis?.innerHeight) || 0
  const xRaw = Number(event?.clientX) || 0
  const yRaw = Number(event?.clientY) || 0
  const maxX = Math.max(margin, vw - menuWidth - margin)
  const maxY = Math.max(margin, vh - menuHeight - margin)
  const x = Math.max(margin, Math.min(maxX, xRaw))
  const y = Math.max(margin, Math.min(maxY, yRaw))

  contextMenu.value = { open: true, x, y }
  window.addEventListener('pointerdown', onGlobalPointerDown, true)
  window.addEventListener('keydown', onGlobalKeyDown, true)
  window.addEventListener('resize', closeContextMenu, true)
  window.addEventListener('scroll', closeContextMenu, true)
}

function onDeleteFromContextMenu() {
  const key = String(props.note?.key ?? '')
  if (!key) {
    closeContextMenu()
    return
  }

  notesStore.removeNote(key)

  if (selection.isSelected(key)) {
    const current = Array.isArray(selection.selectedNoteKeys) ? selection.selectedNoteKeys : []
    const next = current.filter((k) => String(k) !== key)
    if (next.length) selection.setSelectedNotes(next)
    else selection.clearSelection()
  }

  closeContextMenu()
}

const title = computed(() => {
  const len = safeLengthBlocks.value
  const p = pitchLabel.value
  return t('noteEvent.title', {
    fret: props.note?.fret,
    string: props.note?.string,
    pitch: p ? ` (${p})` : '',
    grid: props.note?.gridIndex,
    length: len,
  })
})

function onPointerDown(e) {
  if (isDisabled.value) {
    e?.preventDefault?.()
    return
  }
  if (isResizing.value) return
  if (e?.button != null && e.button !== 0) return
  const key = props.note?.key
  if (settings.eraseMode) {
    if (key) {
      notesStore.removeNote(String(key))
      const current = Array.isArray(selection.selectedNoteKeys) ? selection.selectedNoteKeys : []
      const next = current.filter((k) => String(k) !== String(key))
      if (next.length) selection.setSelectedNotes(next)
      else selection.clearSelection()
    }
    e?.preventDefault?.()
    return
  }

  // Allow double-click label editing on HandPosition events without starting drag.
  if (isHandPositionNote.value && e?.target?.closest?.('.fret-number.is-editable')) {
    if (key && !selection.isSelected(key)) selection.selectNote(key)
    return
  }

  // Selection behavior:
  // - Cmd+Option+Shift+click: select this and all following notes (all strings)
  // - Shift+Option+click: select this and all following notes (same string)
  // - Shift+click: toggle add/remove (multi-select)
  // - Normal click: select single note (unless already selected)
  if (key) {
    if (e?.shiftKey && e?.altKey && e?.metaKey) selectForwardFromHere({ allStrings: true })
    else if (e?.shiftKey && e?.altKey) selectForwardFromHere({ allStrings: false })
    else if (e?.shiftKey) selection.toggleNoteInSelection(key)
    else if (!selection.isSelected(key)) selection.selectNote(key)
  }

  if (settings.soundPreviewEnabled) {
    const t = getTuning(instrument.tuningId)
    const midi = midiForNote(props.note, t)
    if (Number.isFinite(Number(midi))) {
      const timePerBlock = Number(props.timePerBlockMs)
      const timePerBlockMs = Number.isFinite(timePerBlock) && timePerBlock > 0 ? timePerBlock : 0

      const lengthBlocksRaw = Number(props.note?.lengthBlocks)
      const lengthBlocks =
        Number.isFinite(lengthBlocksRaw) && lengthBlocksRaw > 0 ? lengthBlocksRaw : 1

      const durationPlayheadMs = timePerBlockMs > 0 ? lengthBlocks * timePerBlockMs : 200

      const tempoValue = Number(transport.tempo) || 120
      const tempoScale = 120 / tempoValue
      const durScale = Number(settings.soundDurationScale)
      const safeScale = Number.isFinite(durScale) && durScale > 0 ? durScale : 1
      const durationAudioMs = Math.max(30, durationPlayheadMs * tempoScale * safeScale)

      void playMidi(midi, {
        durationMs: durationAudioMs,
        instrumentType: instrument.instrumentType,
      })
    }
  }

  const el = e.currentTarget
  const track = el.closest('.timeline-track')
  if (!track) return

  const rect = track.getBoundingClientRect()
  const total = Math.max(1, Number(props.totalBlocks) || 1)
  cellWidthPx = rect.width / total

  startClientX = e.clientX
  startGridIndex = Number(props.note?.gridIndex ?? 1)
  dragGridIndex.value = startGridIndex
  isDragging.value = true

  if (isGroupSelected.value) selection.setGroupDrag(true, 0)

  el.setPointerCapture?.(e.pointerId)
  e.preventDefault()
}

function onResizePointerDown(e) {
  if (isDisabled.value) {
    e?.preventDefault?.()
    return
  }
  if (isDragging.value) return
  if (e?.button != null && e.button !== 0) return
  const key = props.note?.key
  if (key) {
    if (e?.shiftKey && e?.altKey && e?.metaKey) selectForwardFromHere({ allStrings: true })
    else if (e?.shiftKey && e?.altKey) selectForwardFromHere({ allStrings: false })
    else if (e?.shiftKey) selection.toggleNoteInSelection(key)
    else if (!selection.isSelected(key)) selection.selectNote(key)
  }
  const handleEl = e.currentTarget
  const noteEl = handleEl?.closest?.('.note-event')
  const track = handleEl.closest('.timeline-track')
  if (!track) return

  const rect = track.getBoundingClientRect()
  const total = Math.max(1, Number(props.totalBlocks) || 1)
  cellWidthPx = rect.width / total

  startClientX = e.clientX
  startGridIndex = Number(props.note?.gridIndex ?? 1)
  startLength = safeLengthBlocks.value
  dragLength.value = startLength
  isResizing.value = true

  if (isGroupSelected.value) selection.setGroupResize(true, 0)

  // capture on this note element
  noteEl?.setPointerCapture?.(e.pointerId)
  e.preventDefault()
}

function onPointerMove(e) {
  if (!isDragging.value && !isResizing.value) return
  if (!cellWidthPx) return

  const deltaPx = e.clientX - startClientX
  const total = Math.max(1, Number(props.totalBlocks) || 1)

  if (isDragging.value) {
    const deltaBlocks = deltaPx / cellWidthPx
    const deltaQuantized = props.snapEnabled
      ? Math.round(deltaBlocks / snapStepBlocks.value) * snapStepBlocks.value
      : deltaBlocks

    if (isGroupSelected.value) {
      selection.setGroupDrag(true, deltaQuantized)
      return
    }

    const next = startGridIndex + deltaQuantized
    // clamp within visible block range
    dragGridIndex.value = Math.min(total, Math.max(1, next))
    return
  }

  if (isResizing.value) {
    const deltaBlocks = deltaPx / cellWidthPx
    const deltaQuantized = props.snapEnabled
      ? Math.round(deltaBlocks / snapStepBlocks.value) * snapStepBlocks.value
      : deltaBlocks

    if (isGroupSelected.value) {
      selection.setGroupResize(true, deltaQuantized)
      return
    }
    dragLength.value = clampResizeLength({
      startLength,
      deltaBlocks: deltaQuantized,
      startGridIndex,
      totalBlocks: total,
      snapEnabled: props.snapEnabled,
      snapStepBlocks: snapStepBlocks.value,
    })
  }
}

function onPointerUp() {
  if (isDragging.value) {
    isDragging.value = false
    if (isGroupSelected.value) {
      const delta = Number((selection.groupDragDeltaBlocks || 0).toFixed(2))
      selection.setGroupDrag(false, 0)
      dragGridIndex.value = null
      if (props.note?.key && delta) emit('group-move', props.note.key, delta)
    } else {
      const next = Number((dragGridIndex.value ?? startGridIndex).toFixed(2))
      dragGridIndex.value = null
      if (props.note?.key) emit('update-grid-index', props.note.key, next)
    }
  }

  if (isResizing.value) {
    isResizing.value = false
    if (isGroupSelected.value) {
      const delta = Number((selection.groupResizeDeltaBlocks || 0).toFixed(2))
      selection.setGroupResize(false, 0)
      dragLength.value = null
      if (props.note?.key && delta) emit('group-resize', props.note.key, delta)
    } else {
      const nextLen = Number((dragLength.value ?? startLength).toFixed(2))
      dragLength.value = null
      if (props.note?.key) emit('update-length', props.note.key, nextLen)
    }
  }
}

function onEditLabel() {
  if (!isHandPositionNote.value) return
  const current = String(props.note?.fret ?? '1-4')
  const next = globalThis?.prompt?.('Hand position (z.B. 1-4)', current)
  if (next == null) return
  const value = String(next).trim()
  if (!value) return
  if (props.note?.key) emit('update-label', props.note.key, value)
}

onBeforeUnmount(() => {
  closeContextMenu()
})
</script>

<style scoped>
.note-event {
  position: absolute;
  height: 100%;
  top: 0;
  z-index: 4;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--note-base-color) 74%, rgb(16 20 26) 26%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--app-text);
  font-weight: 700;
  cursor: grab;
  user-select: none;
  touch-action: none;
  box-shadow:
    0 8px 18px rgb(0 0 0 / 0.18),
    inset 0 1px 0 rgb(255 255 255 / 0.18),
    inset 0 -1px 0 rgb(0 0 0 / 0.16);
  transition: box-shadow var(--ui-fast), border-color var(--ui-fast), transform var(--ui-fast), filter var(--ui-fast);
}

.note-event:hover {
  filter: brightness(1.06);
  transform: translateY(-1px) scale(1.01);
}

.note-label {
  display: flex;
  align-items: center;
  gap: 6px;
  pointer-events: none;
}

.note-label.is-hand-position-label {
  pointer-events: auto;
}

.fret-number.is-editable {
  pointer-events: auto;
  cursor: text;
  text-decoration: underline dotted color-mix(in srgb, currentColor 80%, transparent);
}

.note-event.is-selected {
  border-color: color-mix(in srgb, var(--color-primary) 76%, rgb(17 21 27) 24%);
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--color-primary) 68%, transparent),
    0 0 0 2px color-mix(in srgb, var(--color-primary) 42%, transparent),
    0 12px 22px rgb(0 0 0 / 24%);
  z-index: 6;
}

.note-event.is-ghost {
  opacity: 0.45;
  border-style: dashed;
  pointer-events: none;
}

.note-event.is-dimmed {
  opacity: 0.5;
  filter: saturate(0.7);
}

.note-event.is-disabled {
  pointer-events: none;
  cursor: default;
}

.note-event:active {
  cursor: grabbing;
}

.drag-tooltip {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 2px);
  transform: translateX(-50%);
  padding: 1px 4px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--app-layer-0) 90%, transparent);
  color: var(--color-surface-2);
  font-size: 10px;
  line-height: 1.2;
  white-space: nowrap;
  pointer-events: none;
  border: 1px solid rgb(255 255 255 / 0.08);
  box-shadow: 0 8px 18px rgb(0 0 0 / 0.24);
}

.pitch-label {
  font-size: 11px;
  opacity: 0.92;
  font-variant-numeric: tabular-nums;
}

.resize-handle {
  position: absolute;
  right: 0;
  top: 0;
  width: 10px;
  height: 100%;
  cursor: ew-resize;
  background: linear-gradient(to left, color-mix(in srgb, var(--app-text) 26%, transparent), color-mix(in srgb, var(--app-text) 4%, transparent));
  border-top-right-radius: 8px;
  border-bottom-right-radius: 8px;
}

.note-context-menu {
  position: fixed;
  z-index: 1400;
  min-width: 136px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--app-layer-2) 98%, transparent), color-mix(in srgb, var(--app-layer-1) 98%, transparent));
  border: 1px solid rgb(255 255 255 / 0.09);
  border-radius: 10px;
  box-shadow: 0 14px 26px rgb(0 0 0 / 28%);
  padding: 6px;
}

.note-context-item {
  width: 100%;
  border: 0;
  background: transparent;
  color: var(--app-text);
  border-radius: 6px;
  padding: 6px 8px;
  text-align: left;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
}

.note-context-item:hover {
  background: var(--app-glass-3);
}

.note-context-item.is-danger {
  color: var(--color-error);
}

@media (max-width: 860px) {
  .pitch-label {
    display: none;
  }
}
</style>
