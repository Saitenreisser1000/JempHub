<template>
  <div ref="rootEl" class="window-manager">
    <section :id="paneAId" class="wm-pane wm-pane-a" :style="presentation ? { flexBasis: '100%' } : paneAStyle">
      <slot name="pane-a" />
    </section>
    <button
      v-if="!presentation"
      class="wm-divider"
      type="button"
      role="separator"
      aria-orientation="horizontal"
      :aria-label="t('layout.resizePanes')"
      :aria-controls="paneAId"
      :aria-valuemin="20"
      :aria-valuemax="80"
      :aria-valuenow="Math.round(splitRatio * 100)"
      :title="t('layout.resizeHint')"
      @keydown="onDividerKeyDown"
      @dblclick="resetSplit"
      @pointerdown="onDividerPointerDown"
    />
    <section v-show="!presentation" :inert="presentation" class="wm-pane wm-pane-b" :style="paneBStyle">
      <slot name="pane-b" />
    </section>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, useId } from 'vue'
import { usePaneSplit } from '@/composables/usePaneSplit'
import { useI18n } from '@/i18n'

defineProps({ presentation: { type: Boolean, default: false } })

const rootEl = ref(null)
const { t } = useI18n()
const paneAId = useId()
const { splitRatio, clampRatio, onDividerKeyDown, resetSplit } = usePaneSplit()
let activePointerId = null
let snappedToMax = false
let snapAnchorRatio = null

const SNAP_RELEASE_RATIO_DELTA = 0.05
const SNAP_HEIGHT_EPSILON_PX = 1.5

const paneAStyle = computed(() => ({
  flexBasis: `${Math.round(splitRatio.value * 10000) / 100}%`,
}))

const paneBStyle = computed(() => ({
  flexBasis: `${Math.round((1 - splitRatio.value) * 10000) / 100}%`,
}))

function readFretboardSvgMaxState() {
  const root = rootEl.value
  if (!(root instanceof HTMLElement)) return { atMax: false }

  const fretboardBodyEl = root.querySelector('.wm-pane-a .fretboard-body')
  const fretboardSvgEl = root.querySelector('.wm-pane-a .fb-overlay')
  if (!(fretboardBodyEl instanceof HTMLElement) || !(fretboardSvgEl instanceof HTMLElement)) {
    return { atMax: false }
  }

  const rawMaxHeight = window.getComputedStyle(fretboardBodyEl).getPropertyValue('--fb-stack-max-height-px')
  const maxHeightPx = Number.parseFloat(String(rawMaxHeight || '').trim())
  if (!(Number.isFinite(maxHeightPx) && maxHeightPx > 0)) return { atMax: false }

  const currentHeightPx = Number(fretboardSvgEl.getBoundingClientRect().height) || 0
  if (!(currentHeightPx > 0)) return { atMax: false }

  return { atMax: currentHeightPx >= maxHeightPx - SNAP_HEIGHT_EPSILON_PX }
}

function updateSplitFromClientY(clientY) {
  const root = rootEl.value
  if (!root) return
  const rect = root.getBoundingClientRect()
  if (!(rect.height > 0)) return
  const y = Number(clientY) - rect.top
  const nextRatio = clampRatio(y / rect.height)
  const movingDown = nextRatio > splitRatio.value
  const svgAtMax = readFretboardSvgMaxState().atMax

  // Lock divider to the first point where the fretboard SVG has truly reached max height.
  if (snappedToMax) {
    if (Number.isFinite(snapAnchorRatio)) {
      if (nextRatio >= snapAnchorRatio - SNAP_RELEASE_RATIO_DELTA) {
        splitRatio.value = snapAnchorRatio
        return
      }
    }
    snappedToMax = false
    snapAnchorRatio = null
  }

  if (movingDown && svgAtMax) {
    snappedToMax = true
    snapAnchorRatio = nextRatio
    if (Number.isFinite(snapAnchorRatio)) {
      splitRatio.value = snapAnchorRatio
      return
    }
  }

  splitRatio.value = nextRatio
}

function stopPointerTracking() {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerUp)
  activePointerId = null
  snappedToMax = false
  snapAnchorRatio = null
}

function onPointerMove(event) {
  if (activePointerId == null || event.pointerId !== activePointerId) return
  event.preventDefault()
  updateSplitFromClientY(event.clientY)
}

function onPointerUp(event) {
  if (activePointerId == null || event.pointerId !== activePointerId) return
  stopPointerTracking()
}

function onDividerPointerDown(event) {
  if (event.button !== 0) return
  activePointerId = event.pointerId
  updateSplitFromClientY(event.clientY)
  window.addEventListener('pointermove', onPointerMove, { passive: false })
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)
}

onBeforeUnmount(() => {
  stopPointerTracking()
})
</script>

<style scoped>
.window-manager {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  border: 1px solid var(--app-border, rgb(255 255 255 / 0.09));
  border-radius: 0;
  box-sizing: border-box;
  background: linear-gradient(180deg, var(--app-bg-panel), var(--app-bg-elevated));
  overflow: hidden;
  box-shadow: 0 12px 30px rgb(0 0 0 / 0.22);
}

.wm-pane {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  background: linear-gradient(180deg, color-mix(in srgb, var(--app-layer-1) 94%, transparent), color-mix(in srgb, var(--app-layer-0) 96%, transparent));
}

.wm-divider {
  display: block;
  width: 100%;
  flex: 0 0 12px;
  border: 0;
  padding: 0;
  background: linear-gradient(180deg, color-mix(in srgb, var(--app-text) 4%, transparent), color-mix(in srgb, var(--app-layer-0) 18%, transparent));
  cursor: ns-resize;
  touch-action: none;
}
.wm-divider:hover,
.wm-divider:focus-visible {
  background: var(--color-primary);
}

.wm-divider:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: -2px;
}
</style>
