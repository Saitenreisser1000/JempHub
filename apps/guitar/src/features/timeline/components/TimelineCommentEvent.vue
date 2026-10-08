<template>
  <div
    class="timeline-comment-event"
    :class="{ 'is-editable': isEditable, 'is-inactive': !isActiveNow, 'is-passive': !isEditable }"
    :style="commentStyle"
    @pointerdown.stop="onBodyPointerDown"
  >
    <div v-if="isEditable" class="timeline-comment-handle is-start" @pointerdown.stop="onResizePointerDown('start', $event)" />
    <div class="timeline-comment-body">{{ label }}</div>
    <div v-if="isEditable" class="timeline-comment-handle is-end" @pointerdown.stop="onResizePointerDown('end', $event)" />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { useFretboardOverlayStore } from '@/store/useFretboardOverlay'

const props = defineProps({
  item: { type: Object, required: true },
  totalBlocks: { type: Number, default: 16 },
  trackWidthPx: { type: Number, default: 0 },
  currentStep: { type: Number, default: 1 },
  isEditable: { type: Boolean, default: false },
  isActiveNow: { type: Boolean, default: false },
})

const overlay = useFretboardOverlayStore()

const dragState = ref({
  active: false,
  mode: '',
  pointerId: null,
  startClientX: 0,
  startGridIndex: 1,
  startLengthBlocks: 1,
})

const safeTotalBlocks = computed(() => Math.max(1, Number(props.totalBlocks) || 1))
const safeGridIndex = computed(() => {
  const n = Number(props.item?.gridIndex)
  return Number.isFinite(n) && n > 0 ? n : 1
})
const safeLengthBlocks = computed(() => {
  const n = Number(props.item?.lengthBlocks)
  return Number.isFinite(n) && n > 0 ? n : 1
})
const safeStep = computed(() => Math.max(0.01, Number(props.currentStep) || 1))
const blockWidthPx = computed(() => {
  const width = Number(props.trackWidthPx) || 0
  return width > 0 ? width / safeTotalBlocks.value : 0
})

const label = computed(() => String(props.item?.text || 'Comment'))
const color = computed(() => String(props.item?.color || '#f59e0b'))

const commentStyle = computed(() => ({
  left: `${((safeGridIndex.value - 1) / safeTotalBlocks.value) * 100}%`,
  width: `${(safeLengthBlocks.value / safeTotalBlocks.value) * 100}%`,
  '--tl-comment-color': color.value,
}))

function stopDrag() {
  if (!dragState.value.active) return
  dragState.value = {
    active: false,
    mode: '',
    pointerId: null,
    startClientX: 0,
    startGridIndex: 1,
    startLengthBlocks: 1,
  }
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerUp)
}

function quantizeDeltaBlocks(clientX) {
  const startX = Number(dragState.value.startClientX) || 0
  const dx = Number(clientX) - startX
  const pxPerBlock = blockWidthPx.value
  if (!(pxPerBlock > 0)) return 0
  const rawBlocks = dx / pxPerBlock
  return Math.round(rawBlocks / safeStep.value) * safeStep.value
}

function onPointerMove(event) {
  const state = dragState.value
  if (!state.active || event.pointerId !== state.pointerId) return

  const deltaBlocks = quantizeDeltaBlocks(event.clientX)
  const startGridIndex = Number(state.startGridIndex) || 1
  const startLengthBlocks = Number(state.startLengthBlocks) || 1
  const total = safeTotalBlocks.value

  if (state.mode === 'move') {
    const maxStart = Math.max(1, total - startLengthBlocks + 1)
    const nextGridIndex = Math.max(1, Math.min(maxStart, startGridIndex + deltaBlocks))
    overlay.updateTextItemTiming(props.item.id, { gridIndex: Number(nextGridIndex.toFixed(3)) })
    return
  }

  if (state.mode === 'resize-end') {
    const maxLength = Math.max(safeStep.value, total - (startGridIndex - 1))
    const nextLength = Math.max(safeStep.value, Math.min(maxLength, startLengthBlocks + deltaBlocks))
    overlay.updateTextItemTiming(props.item.id, { lengthBlocks: Number(nextLength.toFixed(3)) })
    return
  }

  if (state.mode === 'resize-start') {
    const endBlock = startGridIndex - 1 + startLengthBlocks
    const nextGridIndex = Math.max(1, Math.min(endBlock - safeStep.value + 1, startGridIndex + deltaBlocks))
    const nextLength = Math.max(safeStep.value, endBlock - (nextGridIndex - 1))
    overlay.updateTextItemTiming(props.item.id, {
      gridIndex: Number(nextGridIndex.toFixed(3)),
      lengthBlocks: Number(nextLength.toFixed(3)),
    })
  }
}

function onPointerUp(event) {
  const state = dragState.value
  if (!state.active || event.pointerId !== state.pointerId) return
  stopDrag()
}

function beginDrag(mode, event) {
  if (!props.isEditable) return
  const pointerId = event?.pointerId
  if (pointerId == null) return
  dragState.value = {
    active: true,
    mode,
    pointerId,
    startClientX: Number(event?.clientX) || 0,
    startGridIndex: safeGridIndex.value,
    startLengthBlocks: safeLengthBlocks.value,
  }
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)
  event.preventDefault()
}

function onBodyPointerDown(event) {
  if (!props.isEditable) return
  beginDrag('move', event)
}

function onResizePointerDown(kind, event) {
  beginDrag(kind === 'start' ? 'resize-start' : 'resize-end', event)
}

onBeforeUnmount(() => {
  stopDrag()
})
</script>

<style scoped>
.timeline-comment-event {
  position: absolute;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: stretch;
  min-width: 12px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--tl-comment-color, #f59e0b) 58%, #fff 42%);
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--tl-comment-color, #f59e0b) 14%, white 86%),
      color-mix(in srgb, var(--tl-comment-color, #f59e0b) 24%, white 76%)
    ),
    repeating-linear-gradient(
      135deg,
      color-mix(in srgb, var(--tl-comment-color, #f59e0b) 18%, transparent) 0px,
      color-mix(in srgb, var(--tl-comment-color, #f59e0b) 18%, transparent) 10px,
      transparent 10px,
      transparent 20px
    );
  box-shadow: 0 6px 18px rgb(0 0 0 / 14%);
  overflow: hidden;
  z-index: 11;
}

.timeline-comment-event.is-inactive {
  opacity: 0.55;
}

.timeline-comment-event.is-passive {
  opacity: 0.35;
  box-shadow: none;
}

.timeline-comment-event.is-editable {
  cursor: move;
  border-color: color-mix(in srgb, var(--tl-comment-color, #f59e0b) 72%, #fff 28%);
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--tl-comment-color, #f59e0b) 18%, white 82%),
      color-mix(in srgb, var(--tl-comment-color, #f59e0b) 30%, white 70%)
    ),
    repeating-linear-gradient(
      135deg,
      color-mix(in srgb, var(--tl-comment-color, #f59e0b) 24%, transparent) 0px,
      color-mix(in srgb, var(--tl-comment-color, #f59e0b) 24%, transparent) 10px,
      transparent 10px,
      transparent 20px
    );
}

.timeline-comment-body {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  padding: 0 10px;
  color: color-mix(in srgb, var(--tl-comment-color, #f59e0b) 58%, #2b1c0d 42%);
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
}

.timeline-comment-handle {
  flex: 0 0 10px;
  background: color-mix(in srgb, var(--tl-comment-color, var(--color-warning)) 24%, transparent);
  border-left: 1px solid color-mix(in srgb, var(--tl-comment-color, var(--color-warning)) 24%, transparent);
  border-right: 1px solid color-mix(in srgb, var(--tl-comment-color, var(--color-warning)) 24%, transparent);
  cursor: ew-resize;
}

.timeline-comment-handle.is-start {
  border-left: 0;
}

.timeline-comment-handle.is-end {
  border-right: 0;
}
</style>
