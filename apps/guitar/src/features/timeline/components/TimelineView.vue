<template>
  <div class="timeline-main" :style="timelineMainStyle">
    <div v-if="countInVisible" class="count-in-lightbox" aria-live="polite" aria-atomic="true">
      <div class="count-in-value">{{ countInBeat }}</div>
    </div>

    <section class="timeline-body" :aria-label="t('timelineView.mainArea')">
      <div v-if="timelineVisible" class="timeline ui-panel" :class="{ 'is-collapsed': stringsCollapsed }">
        <div class="timeline-workspace" :class="{ 'has-mobile-sidebar': showCompactLandscapeSidebar }">
          <div class="timeline-canvas">
            <div ref="timelineColumnsEl" class="timeline-columns" :style="timelineColumnsStyle">
          <div v-if="!stringsCollapsed" class="timeline-string-names timeline-column-card"
            :style="{ '--timeline-string-header-offset': `${stringHeaderOffsetPx}px` }"
            :aria-label="t('timelineView.strings')">
            <div v-if="handPositionVisible" class="timeline-string-name timeline-string-name-aux">
              <button class="timeline-string-name-btn" type="button" :title="t('timelineView.handPosition')"
                @click="() => emit('add-hand-position')">
                ✋+
              </button>
            </div>

            <button v-for="track in visibleTracks" :key="`string-name-${track.stringIdx}`"
              class="timeline-string-name timeline-string-name-btn"
              :class="{ 'is-active': Number(activeString) === Number(track.stringIdx) }" type="button"
              :title="track.label" @click="() => emit('update-active-string', track.stringIdx)">
              {{ track.label }}
            </button>
          </div>

          <div ref="scrollEl" class="timeline-scroll-viewport timeline-column-card" @wheel="onTimelineWheel"
            @touchstart="onTimelineTouchStart" @touchmove="onTimelineTouchMove"
            @touchend="onTimelineTouchEnd" @touchcancel="onTimelineTouchEnd"
            @pointerdown.capture="onMarqueePointerDown" @pointermove.capture="onMarqueePointerMove"
            @pointerup.capture="onMarqueePointerUp" @pointercancel.capture="onMarqueePointerUp">
            <div v-if="loopEnabled" class="loop-bracket-layer">
              <div class="loop-bracket" :style="loopBracketStyle">
                <button class="loop-handle loop-handle-start" type="button" :title="t('timelineView.dragLoopStart')"
                  @pointerdown="onLoopHandlePointerDown('start', $event)" />
                <div class="loop-bracket-bar" />
                <button class="loop-handle loop-handle-end" type="button" :title="t('timelineView.dragLoopEnd')"
                  @pointerdown="onLoopHandlePointerDown('end', $event)" />
              </div>
            </div>

            <div v-if="markerItems.length" class="marker-layer" :aria-label="t('timelineView.markers')">
              <button v-for="marker in markerItems" :key="marker.id" class="timeline-marker" type="button"
                :style="{ left: `${marker.leftPx}px` }" :title="marker.title"
                @click="() => emit('seek-playhead', marker.timeMs)">
                <span class="timeline-marker-label">{{ marker.label }}</span>
              </button>
            </div>

            <div class="strings-timeline">
              <div class="timeline-playhead-line" :style="{ left: `${playheadLeftPx}px` }"
                :title="t('timelineTrack.dragPosition')" />
              <div v-if="timelineCommentItems.length" class="timeline-comment-layer" :style="timelineCommentLayerStyle">
                <TimelineCommentEvent v-for="item in timelineCommentItems" :key="item.id" :item="item"
                  :total-blocks="effectiveTotalBlocks" :track-width-px="trackMinWidthPx" :current-step="currentStep"
                  :is-editable="isCommentMode && !isPlaying" :is-active-now="item.isActiveNow" />
              </div>
              <TimelineTrack v-if="handPositionVisible" :string="0" :string-label="t('timelineView.handPosition')"
                :active-string="activeString" :notes="handPositionNotes" :total-duration="totalDuration"
                :total-blocks="totalBlocks" :playhead="playhead" :snap-enabled="snapEnabled" :step="currentStep"
                :beat-top="beatTop" :beat-bottom="beatBottom" :pickup-enabled="pickupEnabled"
                :pickup-beats="pickupBeats" :sim-group-mode="simGroupMode" :track-min-width-px="trackMinWidthPx"
                :ghost-notes-enabled="ghostNotesEnabled" :is-aux-track="true" :show-playhead="false"
                :active-tool="activeTool" :compact="compact"
                :show-bar-numbers="showBarNumbersOnAuxTrack" @add-aux-item="() => emit('add-hand-position')"
                @seek-playhead="(t) => emit('seek-playhead', t)" @update-note-grid-index="
                  (key, gridIndex) => emit('update-note-grid-index', key, gridIndex)
                " @update-note-length="
                  (key, lengthBlocks) => emit('update-note-length', key, lengthBlocks)
                " @update-note-label="(key, label) => emit('update-note-label', key, label)" @group-move-notes="
                  (anchorKey, deltaBlocks) => emit('group-move-notes', anchorKey, deltaBlocks)
                " @group-resize-notes="
                  (anchorKey, deltaBlocks) => emit('group-resize-notes', anchorKey, deltaBlocks)
                " />

              <TimelineTrack v-for="track in visibleTracks" :key="track.stringIdx" :string="track.stringIdx"
                :string-label="track.label" :active-string="activeString" :notes="track.notes"
                :total-duration="totalDuration" :total-blocks="totalBlocks" :playhead="playhead"
                :snap-enabled="snapEnabled" :step="currentStep" :beat-top="beatTop" :beat-bottom="beatBottom"
                :pickup-enabled="pickupEnabled" :pickup-beats="pickupBeats" :sim-group-mode="simGroupMode"
                :track-min-width-px="trackMinWidthPx" :ghost-notes-enabled="ghostNotesEnabled" :show-playhead="false"
                :active-tool="activeTool" :compact="compact"
                :show-bar-numbers="!handPositionVisible && isFirstVisibleTrack(track)"
                @update-active-string="(v) => emit('update-active-string', v)"
                @seek-playhead="(t) => emit('seek-playhead', t)" @update-note-grid-index="
                  (key, gridIndex) => emit('update-note-grid-index', key, gridIndex)
                " @update-note-length="
                  (key, lengthBlocks) => emit('update-note-length', key, lengthBlocks)
                " @update-note-label="(key, label) => emit('update-note-label', key, label)" @group-move-notes="
                  (anchorKey, deltaBlocks) => emit('group-move-notes', anchorKey, deltaBlocks)
                " @group-resize-notes="
                  (anchorKey, deltaBlocks) => emit('group-resize-notes', anchorKey, deltaBlocks)
                " />
            </div>

            <div class="timeline-length-handle-wrap" :style="{ left: `${trackEndPx}px` }">
              <div class="timeline-bar-adjust-controls" :aria-label="'Adjust bars'">
                <button class="timeline-bar-adjust-btn is-add" type="button" :title="'Add bar'"
                  @click.stop="incrementBarsNoPickup">
                  +
                </button>
                <button class="timeline-bar-adjust-btn is-remove" type="button" :title="'Remove bar'"
                  :disabled="Number(barsNoPickup.value) <= 1" @click.stop="decrementBarsNoPickup">
                  -
                </button>
              </div>
              <div class="timeline-length-marker" :title="t('timelineView.dragTimelineLength')"
                :aria-label="t('timelineView.dragTimelineLength')" @pointerdown="onLengthHandlePointerDown">
                <span class="timeline-length-marker-thin" />
                <span class="timeline-length-marker-thick" />
              </div>
            </div>

            <div v-if="marqueeActive" class="marquee" :style="marqueeStyle" />
          </div>
            </div>
          </div>
          <aside v-if="showCompactLandscapeSidebar" class="timeline-mobile-sidebar timeline-column-card">
            <TimelineInfoBar :active-tool="activeTool" :bars-no-pickup-local="barsNoPickupLocal"
              :compact="compact"
              :sidebar="true"
              :force-expanded="true"
              :beat-top="beatTop"
              :beat-bottom="beatBottom"
              :pickup-enabled="pickupEnabled"
              :pickup-beats="pickupBeats"
              :snap-enabled="snapEnabled"
              @update-active-tool="(v) => emit('update-active-tool', v)" @copy-selection="emit('copy-selection')"
              @paste-at-playhead="emit('paste-at-playhead')" @loop-to-selection="emit('loop-to-selection')"
              @update-beat-top="(v) => emit('update-beat-top', v)" @update-beat-bottom="(v) => emit('update-beat-bottom', v)"
              @update-pickup-enabled="(v) => emit('update-pickup-enabled', v)"
              @update-pickup-beats="(v) => emit('update-pickup-beats', v)" @zoom-left="incrementZoom"
              @zoom-right="decrementZoom"
              @update-snap="(v) => emit('update-snap', v)"
              @update-bars-no-pickup="(v) => (barsNoPickupLocal = v)" @decrement-bars-no-pickup="decrementBarsNoPickup"
              @increment-bars-no-pickup="incrementBarsNoPickup" />
          </aside>
        </div>
        <TimelineInfoBar v-if="!showCompactLandscapeSidebar" :active-tool="activeTool" :bars-no-pickup-local="barsNoPickupLocal"
          :compact="compact"
          :beat-top="beatTop"
          :beat-bottom="beatBottom"
          :pickup-enabled="pickupEnabled"
          :pickup-beats="pickupBeats"
          :snap-enabled="snapEnabled"
          @update-active-tool="(v) => emit('update-active-tool', v)" @copy-selection="emit('copy-selection')"
          @paste-at-playhead="emit('paste-at-playhead')" @loop-to-selection="emit('loop-to-selection')"
          @update-beat-top="(v) => emit('update-beat-top', v)" @update-beat-bottom="(v) => emit('update-beat-bottom', v)"
          @update-pickup-enabled="(v) => emit('update-pickup-enabled', v)"
          @update-pickup-beats="(v) => emit('update-pickup-beats', v)" @zoom-left="incrementZoom"
          @zoom-right="decrementZoom"
          @update-snap="(v) => emit('update-snap', v)"
          @update-bars-no-pickup="(v) => (barsNoPickupLocal = v)" @decrement-bars-no-pickup="decrementBarsNoPickup"
          @increment-bars-no-pickup="incrementBarsNoPickup" />
      </div>
    </section>

    <aside v-if="libraryEnabled && libraryPanelVisible" class="secondary-menu-rail"
      :class="{ 'is-collapsed': secondaryMenuSize === 's', 'is-wide': secondaryMenuSize === 'l' }"
      :aria-label="t('libraryDialog.title')">
      <div class="secondary-menu-shell ui-panel pa-2">
        <div class="secondary-menu-head">
          <div class="secondary-menu-head-row">
            <div class="secondary-menu-title">{{ t('libraryDialog.title') }}</div>
            <v-btn size="x-small" variant="text" class="secondary-menu-toggle" icon="mdi-arrow-left-right"
              :title="'Sidebar width'" @click="cycleSecondaryMenuSize" />
          </div>
          <div v-if="secondaryMenuSize !== 's'" class="secondary-menu-subtitle">
            {{ libraryEnabled ? t('modeSelector.openLibrary') : t('modeSelector.librarySignIn') }}
          </div>
        </div>
        <div class="secondary-menu">
          <v-btn v-if="secondaryMenuSize !== 's'" block prepend-icon="mdi-book-open-page-variant" size="default"
            variant="tonal" class="secondary-menu-btn secondary-menu-link" :title="t('modeSelector.openLibrary')"
            :disabled="!libraryEnabled" @click="emit('open-library')">
            {{ t('modeSelector.openLibrary') }}
          </v-btn>
          <v-btn v-else icon="mdi-book-open-page-variant" size="small" variant="tonal" class="secondary-menu-btn"
            :title="t('modeSelector.openLibrary')" :disabled="!libraryEnabled" @click="emit('open-library')" />
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup>
import TimelineInfoBar from './TimelineInfoBar.vue'
import TimelineCommentEvent from './TimelineCommentEvent.vue'
import TimelineTrack from './TimelineTrack.vue'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useSelectionStore } from '@/store/useSelection'
import { useFretboardOverlayStore } from '@/store/useFretboardOverlay'
import { SURFACE_MODES, useUiModeStore } from '@/store/useUiMode'
import { TIMELINE_LAYOUT } from '@/features/timeline/config/timelineLayout'
import { TIMELINE_BEHAVIOR } from '@/features/timeline/config/timelineBehavior'
import { TIMELINE_THEME } from 'jemp-design-system/timeline-theme'
import { useI18n } from '@/i18n'

const props = defineProps({
  isPlaying: { type: Boolean, required: true },
  tempo: { type: Number, required: true },

  compact: { type: Boolean, default: false },

  loopEnabled: { type: Boolean, default: false },
  loopStartBlock: { type: Number, default: 0 },
  loopEndBlock: { type: Number, default: 0 },

  selectedMode: { type: String, required: true },
  snapEnabled: { type: Boolean, default: true },
  soundPreviewEnabled: { type: Boolean, default: true },
  clickEnabled: { type: Boolean, default: false },
  countInEnabled: { type: Boolean, default: true },
  autoFollowEnabled: { type: Boolean, default: true },
  countInVisible: { type: Boolean, default: false },
  countInBeat: { type: Number, default: 0 },
  soundDurationScale: { type: Number, default: 1 },
  activeString: { type: Number, default: 1 },
  activeTool: { type: String, default: 'arrow' },
  beatTop: { type: Number, default: 4 },
  beatBottom: { type: Number, default: 4 },
  pickupEnabled: { type: Boolean, default: false },
  pickupBeats: { type: Number, default: 1 },

  numStrings: { type: Number, default: 6 },
  numFrets: { type: Number, default: 12 },

  stringsCollapsed: { type: Boolean, default: false },
  handPositionVisible: { type: Boolean, default: false },
  timelineVisible: { type: Boolean, default: true },
  transportVisible: { type: Boolean, default: true },
  libraryPanelVisible: { type: Boolean, default: true },

  zoomPxPerBlock: { type: Number, default: 50 },

  totalDuration: { type: Number, required: true },
  totalBlocks: { type: Number, required: true },
  playhead: { type: Number, required: true },
  currentStep: { type: Number, required: true },
  practiceActive: { type: Boolean, default: false },
  practiceAvailable: { type: Boolean, default: true },
  practiceTargetLabel: { type: String, default: '' },
  practiceDetectedLabel: { type: String, default: '' },
  practiceHintText: { type: String, default: '' },
  practiceMatchState: { type: String, default: '' },
  recordActive: { type: Boolean, default: false },

  tracks: { type: Array, required: true },
  handPositionNotes: { type: Array, default: () => [] },
  markers: { type: Array, default: () => [] },
  ghostNotesEnabled: { type: Boolean, default: false },
  simGroupMode: { type: String, default: '' },
  libraryEnabled: { type: Boolean, default: true },
  isDarkTheme: { type: Boolean, default: false },
})

const emit = defineEmits([
  'toggle-play',
  'seek-start',
  'update-tempo',
  'update-loop',
  'update-loop-start-block',
  'update-loop-end-block',
  'update-mode',
  'update-snap',
  'update-sound-preview',
  'update-click',
  'update-count-in-enabled',
  'update-auto-follow',
  'update-sound-duration-scale',
  'update-active-string',
  'update-active-tool',
  'update-beat-top',
  'update-beat-bottom',
  'update-pickup-enabled',
  'update-pickup-beats',
  'update-num-strings',
  'update-frets',
  'update-strings-collapsed',
  'update-zoom',
  'seek-playhead',
  'update-note-grid-index',
  'update-note-length',
  'update-note-label',
  'group-move-notes',
  'group-resize-notes',
  'add-hand-position',
  'copy-selection',
  'paste-at-playhead',
  'undo',
  'redo',
  'update-sim-group-mode',
  'update-timeline-visible',
  'update-transport-visible',
  'update-library-panel-visible',
  'open-library',
  'toggle-theme',
  'update-total-blocks',
  'add-marker-at-playhead',
  'loop-to-selection',
  'quantize-selection',
  'scale-selection-length',
  'update-ghost-notes',
  'toggle-practice',
  'toggle-record',
])
const { t } = useI18n()
const overlay = useFretboardOverlayStore()
const uiMode = useUiModeStore()
const { textItems } = storeToRefs(overlay)
const { surfaceMode } = storeToRefs(uiMode)

const zoomPx = computed(() =>
  Math.max(TIMELINE_LAYOUT.zoom.wheelMinPxPerBlock, Number(props.zoomPxPerBlock) || 50),
)
const ZOOM_UI_MIN = TIMELINE_LAYOUT.zoom.uiMinPxPerBlock
const ZOOM_UI_MAX = TIMELINE_LAYOUT.zoom.uiMaxPxPerBlock
const ZOOM_UI_STEP = TIMELINE_LAYOUT.zoom.uiStepPxPerBlock
// Must match the visual left inset of `.timeline-track` (see TimelineTrack.vue: margin-left).
const TRACK_START_OFFSET_PX = TIMELINE_LAYOUT.tracks.startOffsetPx

const visibleTracks = computed(() => {
  return Array.isArray(props.tracks) ? props.tracks : []
})
const isCommentMode = computed(() => surfaceMode.value === SURFACE_MODES.COMMENT)

const showBarNumbersOnAuxTrack = computed(() => Boolean(props.handPositionVisible))
const timelineViewportTouchAction = computed(() =>
  String(props.activeTool) === TIMELINE_BEHAVIOR.selection.marqueeTool ? 'none' : 'pan-x',
)

function isFirstVisibleTrack(track) {
  const first = Array.isArray(visibleTracks.value) ? visibleTracks.value[0] : null
  return Number(track?.stringIdx) === Number(first?.stringIdx)
}

const selection = useSelectionStore()

const timelineMainStyle = computed(() => {
  const widths = TIMELINE_LAYOUT.secondaryMenu.sizes
  const secondaryMenuWidthPx = props.libraryPanelVisible
    ? widths[secondaryMenuSize.value] || widths.m
    : 0
  return {
    '--secondary-menu-w': `${secondaryMenuWidthPx}px`,
    '--tl-main-bg': TIMELINE_THEME.main.mainBgMix,
    '--tl-viewport-bg': TIMELINE_THEME.main.viewportBgMix,
    '--tl-viewport-shadow': TIMELINE_THEME.main.viewportShadow,
    '--tl-column-card-bg': TIMELINE_THEME.main.columnCardBgMix,
    '--tl-string-names-bg': TIMELINE_THEME.main.stringNamesBgMix,
    '--tl-aux-divider-color': TIMELINE_THEME.main.auxDividerColor,
    '--tl-marker-color': TIMELINE_THEME.main.markerColor,
    '--tl-loop-bar-color': TIMELINE_THEME.main.loopBarColor,
    '--tl-loop-handle-bg': TIMELINE_THEME.main.loopHandleBg,
    '--tl-resize-line-color': TIMELINE_THEME.main.resizeHandleLineColor,
    '--tl-length-handle-color': TIMELINE_THEME.main.lengthHandleColor,
    '--tl-marquee-bg': TIMELINE_THEME.main.marqueeBg,
    '--tl-playhead-color': TIMELINE_THEME.track.playheadColor,
    '--tl-track-start-offset-px': `${TRACK_START_OFFSET_PX}px`,
    '--tl-main-resize-handle-h': `${TIMELINE_LAYOUT.main.resizeHandleHeightPx}px`,
    '--tl-string-name-col-w': `${TIMELINE_LAYOUT.tracks.stringNameColWidthPx}px`,
    '--tl-row-h-default': `${TIMELINE_LAYOUT.tracks.defaultRowHeightPx}px`,
    '--tl-loop-header-h': `${TIMELINE_LAYOUT.headers.loopHeaderPx}px`,
    '--tl-marker-header-h': `${TIMELINE_LAYOUT.headers.markerHeaderPx}px`,
    '--tl-marker-layer-h': `${TIMELINE_LAYOUT.headers.markerLayerHeightPx}px`,
    '--tl-marker-layer-gap': `${TIMELINE_LAYOUT.headers.markerLayerBottomGapPx}px`,
    '--tl-loop-layer-h': `${TIMELINE_LAYOUT.headers.loopBracketLayerHeightPx}px`,
    '--tl-scroll-touch-action': timelineViewportTouchAction.value,
    height: '100%',
  }
})

const scrollEl = ref(null)
const timelineColumnsEl = ref(null)
const secondaryMenuSize = ref('m')
const viewportWidthPx = ref(Number(globalThis?.innerWidth) || 0)
const viewportHeightPx = ref(Number(globalThis?.innerHeight) || 0)
const marqueeActive = ref(false)
const marqueeStart = ref({ x: 0, y: 0 })
const marqueeEnd = ref({ x: 0, y: 0 })
let marqueeRaf = 0
let marqueePointerId = null
const lengthDrag = ref({
  active: false,
  pointerId: null,
  startClientX: 0,
  startScrollLeft: 0,
  startBlocks: 0,
  previewBlocks: null,
})
const loopDrag = ref({
  active: false,
  kind: '',
  pointerId: null,
})
const pinchZoom = ref({
  active: false,
  startDistance: 0,
  startZoom: 0,
  anchorClientX: 0,
  anchorContentX: 0,
})
const timelineColumnsHeightPx = ref(null)
const timelineColumnsMeasuredHeightPx = ref(0)
let timelineColumnsResizeObserver = null

const timelineColumnsStyle = computed(() => {
  const explicitHeight = Number(timelineColumnsHeightPx.value)
  const measuredHeight = Number(timelineColumnsMeasuredHeightPx.value)
  const hasExplicitHeight = explicitHeight > 0
  const h = hasExplicitHeight ? explicitHeight : measuredHeight
  if (!(h > 0)) return undefined

  const style = { '--timeline-row-h': `${timelineRowHeightPx.value}px` }
  if (hasExplicitHeight) style.height = `${h}px`
  return style
})

const showCompactLandscapeSidebar = computed(() =>
  Boolean(props.compact) && Number(viewportWidthPx.value) > Number(viewportHeightPx.value),
)

const timelineRowHeightPx = computed(() => {
  const explicitHeight = Number(timelineColumnsHeightPx.value)
  const measuredHeight = Number(timelineColumnsMeasuredHeightPx.value)
  const h = explicitHeight > 0 ? explicitHeight : measuredHeight
  if (!(h > 0)) return TIMELINE_LAYOUT.tracks.defaultRowHeightPx

  const hasLoopHeader = Boolean(props.loopEnabled)
  const hasMarkerHeader = Array.isArray(props.markers) && props.markers.length > 0
  const headerPx =
    (hasLoopHeader ? TIMELINE_LAYOUT.headers.loopHeaderPx : 0) +
    (hasMarkerHeader ? TIMELINE_LAYOUT.headers.markerHeaderPx : 0)
  const rowCount = Math.max(
    1,
    Number(visibleTracks.value.length) + (props.handPositionVisible ? 1 : 0),
  )
  const availableRowsPx = Math.max(TIMELINE_LAYOUT.tracks.minRowsAreaPx, h - headerPx)
  return Math.max(TIMELINE_LAYOUT.tracks.minRowHeightPx, Math.floor(availableRowsPx / rowCount))
})

function measureTimelineColumnsHeight() {
  const h = Number(timelineColumnsEl.value?.clientHeight) || 0
  timelineColumnsMeasuredHeightPx.value = Math.max(0, Math.floor(h))
}

function attachTimelineColumnsResizeObserver() {
  timelineColumnsResizeObserver?.disconnect?.()
  timelineColumnsResizeObserver = null
  const el = timelineColumnsEl.value
  if (!el || typeof ResizeObserver === 'undefined') {
    measureTimelineColumnsHeight()
    return
  }
  timelineColumnsResizeObserver = new ResizeObserver(() => {
    measureTimelineColumnsHeight()
  })
  timelineColumnsResizeObserver.observe(el)
  measureTimelineColumnsHeight()
}

function updateViewportSize() {
  viewportWidthPx.value = Number(globalThis?.innerWidth) || 0
  viewportHeightPx.value = Number(globalThis?.innerHeight) || 0
}

function cycleSecondaryMenuSize() {
  const order = TIMELINE_LAYOUT.secondaryMenu.order
  const current = order.indexOf(String(secondaryMenuSize.value || 'm'))
  secondaryMenuSize.value = order[(current + 1) % order.length]
}

function columnsHeightBounds() {
  const min = TIMELINE_LAYOUT.tracks.minColumnsHeightPx
  const colsRect = timelineColumnsEl.value?.getBoundingClientRect?.()
  if (!colsRect) return { min, max: min }

  // Keep room for info bar + handle at the bottom.
  // Use viewport as the upper bound so resizing remains reversible:
  // shrinking the columns must not reduce future max-height.
  const reservedBottomPx = TIMELINE_LAYOUT.tracks.columnsReservedBottomPx
  const viewportBottom = Number(window?.innerHeight) || 0
  const rawMax = Math.floor(viewportBottom - colsRect.top - reservedBottomPx)
  return { min, max: Math.max(min, rawMax) }
}

function clampColumnsHeight(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return columnsHeightBounds().min
  const { min, max } = columnsHeightBounds()
  return Math.max(min, Math.min(max, Math.round(n)))
}

function toContentCoords(clientX, clientY) {
  const el = scrollEl.value
  if (!el?.getBoundingClientRect) return { x: 0, y: 0 }
  const r = el.getBoundingClientRect()
  return {
    x: clientX - r.left + el.scrollLeft,
    y: clientY - r.top + el.scrollTop,
  }
}

function rectFromPoints(a, b) {
  const left = Math.min(a.x, b.x)
  const top = Math.min(a.y, b.y)
  const right = Math.max(a.x, b.x)
  const bottom = Math.max(a.y, b.y)
  return { left, top, right, bottom, width: right - left, height: bottom - top }
}

const marqueeStyle = computed(() => {
  const r = rectFromPoints(marqueeStart.value, marqueeEnd.value)
  return {
    left: `${r.left}px`,
    top: `${r.top}px`,
    width: `${r.width}px`,
    height: `${r.height}px`,
  }
})

function intersects(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
}

function updateMarqueeSelection() {
  marqueeRaf = 0
  const el = scrollEl.value
  if (!el?.getBoundingClientRect) return
  const scrollRect = el.getBoundingClientRect()
  const selRect = rectFromPoints(marqueeStart.value, marqueeEnd.value)

  const nodes = el.querySelectorAll?.('.note-event[data-note-key]')
  if (!nodes?.length) {
    selection.setSelectedNotes([])
    return
  }

  const keys = []
  for (const node of nodes) {
    const key = node?.getAttribute?.('data-note-key')
    if (!key) continue
    const nr = node.getBoundingClientRect()
    const noteRect = {
      left: nr.left - scrollRect.left + el.scrollLeft,
      right: nr.right - scrollRect.left + el.scrollLeft,
      top: nr.top - scrollRect.top + el.scrollTop,
      bottom: nr.bottom - scrollRect.top + el.scrollTop,
    }
    if (intersects(selRect, noteRect)) keys.push(key)
  }
  selection.setSelectedNotes(keys)
}

function scheduleMarqueeUpdate() {
  if (marqueeRaf) return
  marqueeRaf = requestAnimationFrame(updateMarqueeSelection)
}

function onMarqueePointerDown(e) {
  if (String(props.activeTool) !== TIMELINE_BEHAVIOR.selection.marqueeTool) return
  if (e?.button != null && e.button !== 0) return
  if (e?.target?.closest?.('button, input, label, a')) return
  if (e?.target?.closest?.('.timeline-length-handle-wrap')) return
  if (e?.target?.closest?.('.note-event')) return

  const el = scrollEl.value
  if (!el) return

  marqueePointerId = e.pointerId
  marqueeActive.value = true

  const p = toContentCoords(e.clientX, e.clientY)
  marqueeStart.value = p
  marqueeEnd.value = p
  selection.setSelectedNotes([])

  el.setPointerCapture?.(e.pointerId)
  e.preventDefault()
  e.stopPropagation()
}

function onMarqueePointerMove(e) {
  if (!marqueeActive.value) return
  if (marqueePointerId != null && e.pointerId !== marqueePointerId) return
  const p = toContentCoords(e.clientX, e.clientY)
  marqueeEnd.value = p
  scheduleMarqueeUpdate()
  e.preventDefault()
  e.stopPropagation()
}

function onMarqueePointerUp(e) {
  if (!marqueeActive.value) return
  if (marqueePointerId != null && e.pointerId !== marqueePointerId) return
  marqueeActive.value = false
  marqueePointerId = null
  if (marqueeRaf) {
    cancelAnimationFrame(marqueeRaf)
    marqueeRaf = 0
    updateMarqueeSelection()
  }
  e?.preventDefault?.()
  e?.stopPropagation?.()
}

function onLengthHandlePointerDown(e) {
  if (e?.button != null && e.button !== 0) return
  const target = e?.currentTarget
  const pointerId = e?.pointerId
  if (pointerId == null) return

  lengthDrag.value = {
    active: true,
    pointerId,
    startClientX: Number(e?.clientX) || 0,
    startScrollLeft: Number(scrollEl.value?.scrollLeft) || 0,
    startBlocks: Math.max(1, Number(props.totalBlocks) || 1),
    previewBlocks: Math.max(1, Number(props.totalBlocks) || 1),
  }

  target?.setPointerCapture?.(pointerId)
  target?.addEventListener?.('pointermove', onLengthHandlePointerMove)
  target?.addEventListener?.('pointerup', onLengthHandlePointerUp)
  target?.addEventListener?.('pointercancel', onLengthHandlePointerUp)
  e.preventDefault()
  e.stopPropagation()
}

function onLengthHandlePointerMove(e) {
  const drag = lengthDrag.value
  if (!drag.active) return
  if (e?.pointerId !== drag.pointerId) return

  const currentScroll = Number(scrollEl.value?.scrollLeft) || 0
  const scrollDx = currentScroll - (Number(drag.startScrollLeft) || 0)
  const pointerDx = (Number(e?.clientX) || 0) - drag.startClientX
  const dx = pointerDx + scrollDx
  const zoom = Math.max(8, Number(zoomPx.value) || 50)
  const deltaBlocks = dx / zoom
  const rawNext = Math.max(1, drag.startBlocks + deltaBlocks)
  // Keep drag lightweight: local preview while moving, commit on pointerup.
  lengthDrag.value = { ...drag, previewBlocks: rawNext }

  // Keep the length handle in view while dragging, especially when extending to the right.
  const el = scrollEl.value
  if (el) {
    const handleX = TRACK_START_OFFSET_PX + rawNext * zoom
    const margin = TIMELINE_LAYOUT.marquee.autoScrollMarginPx
    const viewLeft = Number(el.scrollLeft) || 0
    const viewRight = viewLeft + (Number(el.clientWidth) || 0)

    let nextScrollLeft = viewLeft
    if (handleX > viewRight - margin) {
      nextScrollLeft = handleX - (Number(el.clientWidth) || 0) + margin
    } else if (handleX < viewLeft + margin) {
      nextScrollLeft = handleX - margin
    }

    if (nextScrollLeft !== viewLeft) {
      const maxScroll = Math.max(0, (Number(el.scrollWidth) || 0) - (Number(el.clientWidth) || 0))
      el.scrollLeft = Math.max(0, Math.min(maxScroll, nextScrollLeft))
    }
  }

  e.preventDefault()
  e.stopPropagation()
}

function onLengthHandlePointerUp(e) {
  const drag = lengthDrag.value
  if (!drag.active) return
  if (e?.pointerId !== drag.pointerId) return

  const rawNext = Math.max(1, Number(drag.previewBlocks) || drag.startBlocks || 1)
  const raster = Math.max(0.01, Number(props.currentStep) || 1)
  const snapped = Math.round(rawNext / raster) * raster
  emit('update-total-blocks', Number(snapped.toFixed(3)))

  const target = e?.currentTarget
  target?.removeEventListener?.('pointermove', onLengthHandlePointerMove)
  target?.removeEventListener?.('pointerup', onLengthHandlePointerUp)
  target?.removeEventListener?.('pointercancel', onLengthHandlePointerUp)

  lengthDrag.value = {
    active: false,
    pointerId: null,
    startClientX: 0,
    startScrollLeft: 0,
    startBlocks: 0,
    previewBlocks: null,
  }
  e?.preventDefault?.()
  e?.stopPropagation?.()
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v))
}

const loopRange = computed(() => {
  const total = Math.max(1, Number(props.totalBlocks) || 1)
  const step = Math.max(0.01, Number(props.currentStep) || 1)
  const startRaw = Number(props.loopStartBlock)
  const start = Number.isFinite(startRaw) ? clamp(startRaw, 0, total - step) : 0
  const endRaw = Number(props.loopEndBlock)
  const endCandidate = Number.isFinite(endRaw) && endRaw > 0 ? endRaw : total
  const end = clamp(endCandidate, start + step, total)
  return { start, end, total, step }
})

const loopBracketStyle = computed(() => {
  const zoom = Math.max(8, Number(zoomPx.value) || 50)
  const startPx = TRACK_START_OFFSET_PX + loopRange.value.start * zoom
  const endPx = TRACK_START_OFFSET_PX + loopRange.value.end * zoom
  return {
    left: `${startPx}px`,
    width: `${Math.max(6, endPx - startPx)}px`,
  }
})

function blockFromPointerEvent(e) {
  const el = scrollEl.value
  if (!el?.getBoundingClientRect) return 0
  const rect = el.getBoundingClientRect()
  const x = Number(e?.clientX) - rect.left + el.scrollLeft
  const zoom = Math.max(8, Number(zoomPx.value) || 50)
  const raw = (x - TRACK_START_OFFSET_PX) / zoom
  const step = Math.max(0.01, Number(props.currentStep) || 1)
  return Math.round(raw / step) * step
}

function onLoopHandlePointerDown(kind, e) {
  if (!props.loopEnabled) return
  const pointerId = e?.pointerId
  if (pointerId == null) return
  const target = e?.currentTarget
  loopDrag.value = { active: true, kind: String(kind), pointerId }
  target?.setPointerCapture?.(pointerId)
  target?.addEventListener?.('pointermove', onLoopHandlePointerMove)
  target?.addEventListener?.('pointerup', onLoopHandlePointerUp)
  target?.addEventListener?.('pointercancel', onLoopHandlePointerUp)
  e.preventDefault()
  e.stopPropagation()
}

function onLoopHandlePointerMove(e) {
  const drag = loopDrag.value
  if (!drag.active) return
  if (e?.pointerId !== drag.pointerId) return

  const total = loopRange.value.total
  const step = loopRange.value.step
  const block = clamp(blockFromPointerEvent(e), 0, total)

  if (drag.kind === 'start') {
    const nextStart = clamp(block, 0, loopRange.value.end - step)
    emit('update-loop-start-block', Number(nextStart.toFixed(4)))
  } else if (drag.kind === 'end') {
    const nextEnd = clamp(block, loopRange.value.start + step, total)
    emit('update-loop-end-block', Number(nextEnd.toFixed(4)))
  }
  e.preventDefault()
  e.stopPropagation()
}

function onLoopHandlePointerUp(e) {
  const drag = loopDrag.value
  if (!drag.active) return
  if (e?.pointerId !== drag.pointerId) return
  const target = e?.currentTarget
  target?.removeEventListener?.('pointermove', onLoopHandlePointerMove)
  target?.removeEventListener?.('pointerup', onLoopHandlePointerUp)
  target?.removeEventListener?.('pointercancel', onLoopHandlePointerUp)
  loopDrag.value = { active: false, kind: '', pointerId: null }
  e?.preventDefault?.()
  e?.stopPropagation?.()
}

onBeforeUnmount(() => {
  if (marqueeRaf) cancelAnimationFrame(marqueeRaf)
  timelineColumnsResizeObserver?.disconnect?.()
  timelineColumnsResizeObserver = null
  window.removeEventListener('resize', onWindowResizeColumns)
  window.removeEventListener('resize', updateViewportSize)
  window.removeEventListener('orientationchange', updateViewportSize)
})

function onWindowResizeColumns() {
  if (!(Number(timelineColumnsHeightPx.value) > 0)) return
  timelineColumnsHeightPx.value = clampColumnsHeight(timelineColumnsHeightPx.value)
  measureTimelineColumnsHeight()
}

onMounted(() => {
  updateViewportSize()
  window.addEventListener('resize', onWindowResizeColumns)
  window.addEventListener('resize', updateViewportSize)
  window.addEventListener('orientationchange', updateViewportSize)
  attachTimelineColumnsResizeObserver()
})

watch(timelineColumnsEl, () => {
  attachTimelineColumnsResizeObserver()
})

watch(
  () => props.timelineVisible,
  () => {
    requestAnimationFrame(() => {
      attachTimelineColumnsResizeObserver()
    })
  },
)

const effectiveTotalBlocks = computed(() => {
  if (lengthDrag.value.active) {
    const preview = Number(lengthDrag.value.previewBlocks)
    if (Number.isFinite(preview) && preview > 0) return preview
  }
  return Math.max(1, Number(props.totalBlocks) || 1)
})

const trackMinWidthPx = computed(() => {
  const blocks = Math.max(1, Number(effectiveTotalBlocks.value) || 1)
  return blocks * zoomPx.value
})

const trackEndPx = computed(() => {
  return trackMinWidthPx.value + TRACK_START_OFFSET_PX
})

const playheadLeftPx = computed(() => {
  const totalDurationMs = Number(props.totalDuration) || 0
  if (!(totalDurationMs > 0)) return TRACK_START_OFFSET_PX
  const clampedPlayheadMs = Math.max(0, Math.min(totalDurationMs, Number(props.playhead) || 0))
  const ratio = clampedPlayheadMs / totalDurationMs
  return TRACK_START_OFFSET_PX + ratio * trackMinWidthPx.value
})

const currentGridIndex = computed(() => {
  const totalDurationMs = Number(props.totalDuration) || 0
  const totalBlocksSafe = Math.max(1, Number(effectiveTotalBlocks.value) || 1)
  if (!(totalDurationMs > 0)) return 1
  const timePerBlock = totalDurationMs / totalBlocksSafe
  if (!(timePerBlock > 0)) return 1
  return Math.max(1, (Number(props.playhead) || 0) / timePerBlock + 1)
})

const timelineCommentItems = computed(() => {
  const currentGrid = Number(currentGridIndex.value) || 1
  return (Array.isArray(textItems.value) ? textItems.value : []).map((item) => {
    const start = Number(item?.gridIndex) || 1
    const len = Math.max(0.01, Number(item?.lengthBlocks) || 1)
    return {
      ...item,
      isActiveNow: currentGrid >= start && currentGrid < start + len,
    }
  })
})

const timelineCommentLayerStyle = computed(() => {
  const rowHeight = Number(timelineRowHeightPx.value) || TIMELINE_LAYOUT.tracks.defaultRowHeightPx
  const visibleRowCount = Math.max(1, Number(visibleTracks.value.length) || 1)
  const top = props.handPositionVisible ? rowHeight + 4 : 0
  return {
    left: `${TRACK_START_OFFSET_PX}px`,
    width: `${trackMinWidthPx.value}px`,
    top: `${top}px`,
    height: `${rowHeight * visibleRowCount}px`,
    pointerEvents: isCommentMode.value && !props.isPlaying ? 'auto' : 'none',
  }
})

const markerItems = computed(() => {
  const totalDurationMs = Number(props.totalDuration) || 0
  if (!(totalDurationMs > 0)) return []
  const zoom = zoomPx.value
  return (Array.isArray(props.markers) ? props.markers : [])
    .map((m, idx) => {
      const tMs = Number(m?.timeMs)
      if (!Number.isFinite(tMs) || tMs < 0) return null
      const blocks = (tMs / totalDurationMs) * Math.max(1, Number(props.totalBlocks) || 1)
      return {
        id: String(m?.id ?? `m_${idx}`),
        label: String(m?.label ?? `M${idx + 1}`),
        title: String(m?.title ?? t('timelineView.markerN', { index: idx + 1 })),
        timeMs: tMs,
        leftPx: TRACK_START_OFFSET_PX + blocks * zoom,
      }
    })
    .filter(Boolean)
})

const stringHeaderOffsetPx = computed(() => {
  let px = 0
  if (props.loopEnabled) px += TIMELINE_LAYOUT.headers.loopHeaderPx
  if (markerItems.value.length) px += TIMELINE_LAYOUT.headers.markerHeaderPx
  return px
})

function onTimelineWheel(e) {
  if (!e?.ctrlKey) return
  const el = scrollEl.value
  if (!el?.getBoundingClientRect) return
  e.preventDefault()
  const current = zoomPx.value
  const next = Math.max(
    TIMELINE_LAYOUT.zoom.wheelMinPxPerBlock,
    Math.min(
      TIMELINE_LAYOUT.zoom.wheelMaxPxPerBlock,
      current +
        (Number(e.deltaY) < 0
          ? TIMELINE_LAYOUT.zoom.wheelStepPxPerBlock
          : -TIMELINE_LAYOUT.zoom.wheelStepPxPerBlock),
    ),
  )
  if (next === current) return
  setZoomAnchored(next, Number(e.clientX))
}

function decrementZoom() {
  const current = Number(props.zoomPxPerBlock) || 50
  const next = Math.max(ZOOM_UI_MIN, current - ZOOM_UI_STEP)
  emit('update-zoom', next)
}

function incrementZoom() {
  const current = Number(props.zoomPxPerBlock) || 50
  const next = Math.min(ZOOM_UI_MAX, current + ZOOM_UI_STEP)
  emit('update-zoom', next)
}

function pinchDistance(touchA, touchB) {
  const dx = (Number(touchA?.clientX) || 0) - (Number(touchB?.clientX) || 0)
  const dy = (Number(touchA?.clientY) || 0) - (Number(touchB?.clientY) || 0)
  return Math.hypot(dx, dy)
}

function pinchMidpointX(touchA, touchB) {
  return ((Number(touchA?.clientX) || 0) + (Number(touchB?.clientX) || 0)) / 2
}

function setZoomAnchored(nextZoom, clientX, options = {}) {
  const el = scrollEl.value
  if (!el?.getBoundingClientRect) return
  const currentZoom = Math.max(TIMELINE_LAYOUT.zoom.wheelMinPxPerBlock, Number(options.currentZoom ?? zoomPx.value) || 50)
  const next = Math.max(
    TIMELINE_LAYOUT.zoom.wheelMinPxPerBlock,
    Math.min(TIMELINE_LAYOUT.zoom.wheelMaxPxPerBlock, Number(nextZoom) || currentZoom),
  )
  if (next === currentZoom) return

  const rect = el.getBoundingClientRect()
  const x = Number(clientX) - rect.left
  const anchorContentX = Number.isFinite(options.anchorContentX)
    ? Number(options.anchorContentX)
    : el.scrollLeft + x

  emit('update-zoom', next)
  requestAnimationFrame(() => {
    const ratio = next / currentZoom
    el.scrollLeft = Math.max(0, anchorContentX * ratio - x)
  })
}

function onTimelineTouchStart(e) {
  if (e?.touches?.length !== 2) return
  const [touchA, touchB] = e.touches
  const distance = pinchDistance(touchA, touchB)
  if (!(distance > 0)) return
  const clientX = pinchMidpointX(touchA, touchB)
  const el = scrollEl.value
  const rect = el?.getBoundingClientRect?.()
  const anchorX = rect ? clientX - rect.left : 0
  pinchZoom.value = {
    active: true,
    startDistance: distance,
    startZoom: zoomPx.value,
    anchorClientX: clientX,
    anchorContentX: (Number(el?.scrollLeft) || 0) + anchorX,
  }
}

function onTimelineTouchMove(e) {
  if (!pinchZoom.value.active) return
  if (e?.touches?.length !== 2) {
    pinchZoom.value = { active: false, startDistance: 0, startZoom: 0, anchorClientX: 0, anchorContentX: 0 }
    return
  }
  const [touchA, touchB] = e.touches
  const distance = pinchDistance(touchA, touchB)
  if (!(distance > 0) || !(pinchZoom.value.startDistance > 0)) return
  e.preventDefault()
  const scale = distance / pinchZoom.value.startDistance
  const nextZoom = pinchZoom.value.startZoom * scale
  const clientX = pinchMidpointX(touchA, touchB)
  setZoomAnchored(nextZoom, clientX, {
    currentZoom: pinchZoom.value.startZoom,
    anchorContentX: pinchZoom.value.anchorContentX,
  })
}

function onTimelineTouchEnd(e) {
  if (!pinchZoom.value.active) return
  if (e?.touches?.length === 2) {
    const [touchA, touchB] = e.touches
    const distance = pinchDistance(touchA, touchB)
    pinchZoom.value = {
      active: true,
      startDistance: distance,
      startZoom: zoomPx.value,
      anchorClientX: pinchMidpointX(touchA, touchB),
      anchorContentX: pinchZoom.value.anchorContentX,
    }
    return
  }
  pinchZoom.value = { active: false, startDistance: 0, startZoom: 0, anchorClientX: 0, anchorContentX: 0 }
}

watch(
  () => [props.playhead, props.isPlaying, props.totalDuration, props.totalBlocks, zoomPx.value],
  () => {
    if (!props.isPlaying || !props.autoFollowEnabled) return
    const el = scrollEl.value
    if (!el) return

    const totalDurationMs = Number(props.totalDuration) || 0
    const totalBlocksSafe = Math.max(1, Number(props.totalBlocks) || 1)
    if (!(totalDurationMs > 0)) return

    const timePerBlock = totalDurationMs / totalBlocksSafe
    if (!(timePerBlock > 0)) return

    const playheadBlocks = Math.max(0, Number(props.playhead) || 0) / timePerBlock
    const playheadPx = TRACK_START_OFFSET_PX + playheadBlocks * zoomPx.value

    const viewportWidth = Math.max(1, el.clientWidth || 0)
    const midpointX = el.scrollLeft + viewportWidth / 2
    if (playheadPx < midpointX) return

    const maxScrollLeft = Math.max(0, el.scrollWidth - viewportWidth)
    const targetScrollLeft = Math.min(maxScrollLeft, Math.max(0, playheadPx - viewportWidth / 2))
    if (targetScrollLeft <= el.scrollLeft + 0.5) return
    // Soft follow instead of hard snapping.
    const eased = el.scrollLeft + (targetScrollLeft - el.scrollLeft) * 0.3
    el.scrollLeft = Math.min(maxScrollLeft, Math.max(0, eased))
  },
  { flush: 'post' },
)

const beatsPerBarSafe = computed(() => {
  const v = Number.parseInt(String(props.beatTop), 10)
  return Number.isFinite(v) && v > 0 ? v : 1
})

const beatBottomSafe = computed(() => {
  const v = Number.parseInt(String(props.beatBottom), 10)
  return [1, 2, 4, 8].includes(v) ? v : 4
})

const blocksPerBeatSafe = computed(() => 4 / beatBottomSafe.value)
const blocksPerBarSafe = computed(() => beatsPerBarSafe.value * blocksPerBeatSafe.value)

const barsNoPickup = computed({
  get: () => {
    const blocksPerBar = Number(blocksPerBarSafe.value)
    if (!(blocksPerBar > 0)) return 1
    const total = Math.max(0, Number(props.totalBlocks) || 0)
    return Math.max(1, Math.floor(total / blocksPerBar))
  },
  set: (v) => {
    const n = Number.parseInt(String(v), 10)
    if (!Number.isFinite(n)) return
    const nextBars = Math.max(1, Math.min(TIMELINE_LAYOUT.bars.maxCount, n))
    const total = nextBars * Number(blocksPerBarSafe.value || 1)
    emit('update-total-blocks', Number(total.toFixed(3)))
  },
})

const barsNoPickupLocal = computed({
  get: () => String(barsNoPickup.value),
  set: (v) => {
    const n = Number.parseInt(String(v), 10)
    if (!Number.isFinite(n)) return
    barsNoPickup.value = n
  },
})

function decrementBarsNoPickup() {
  barsNoPickup.value = Math.max(1, Number(barsNoPickup.value) - 1)
}

function scrollToLastBar(nextBars) {
  const el = scrollEl.value
  const barBlocks = Number(blocksPerBarSafe.value || 1)
  const zoom = Number(zoomPx.value || 0)
  if (!el || !(barBlocks > 0) || !(zoom > 0)) return

  const nextTotalBlocks = nextBars * barBlocks
  const targetRightEdge = TRACK_START_OFFSET_PX + nextTotalBlocks * zoom
  const nextScrollLeft = Math.max(
    0,
    targetRightEdge - (Number(el.clientWidth) || 0) + TIMELINE_LAYOUT.marquee.autoScrollMarginPx,
  )

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const maxScrollLeft = Math.max(0, (Number(el.scrollWidth) || 0) - (Number(el.clientWidth) || 0))
      el.scrollLeft = Math.min(maxScrollLeft, nextScrollLeft)
    })
  })
}

function incrementBarsNoPickup() {
  const nextBars = Math.min(TIMELINE_LAYOUT.bars.maxCount, Number(barsNoPickup.value) + 1)
  barsNoPickup.value = nextBars
  scrollToLastBar(nextBars)
}

</script>

<style scoped>
.timeline-main {
  --secondary-menu-w: 224px;
  --tl-ui-scale: 1;
  --main-grow-right: 0px;
  --main-menu-v-pad: var(--space-3);
  --app-menubar-h: 30px;
  --top-bars-h: calc(var(--v-layout-top, 0px) + var(--app-menubar-h));
  display: flex;
  width: 100%;
  max-width: 100%;
  height: 100%;
  position: relative;
  flex-direction: column;
  gap: var(--space-4);
  padding-bottom: var(--space-1);
  margin-right: 0;
  background: var(--app-layer-3);
}

.count-in-lightbox {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--app-overlay-scrim);
  backdrop-filter: blur(2px);
  pointer-events: none;
}

.count-in-value {
  min-width: 132px;
  height: 132px;
  border-radius: 50%;
  border: 2px solid color-mix(in srgb, var(--color-primary) 75%, #fff 25%);
  background: color-mix(in srgb, var(--color-surface) 86%, var(--color-surface-2) 14%);
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: 4rem;
  font-weight: 800;
  line-height: 132px;
  text-align: center;
  box-shadow: 0 14px 40px rgb(0 0 0 / 30%);
}

.secondary-menu-rail {
  position: fixed;
  right: 0;
  top: var(--top-bars-h);
  bottom: 0;
  width: var(--secondary-menu-w);
  z-index: 25;
  padding: var(--main-menu-v-pad) var(--space-2);
}

.secondary-menu-shell {
  height: calc(100vh - var(--top-bars-h) - (2 * var(--main-menu-v-pad)));
}

.secondary-menu {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.secondary-menu-head {
  margin-bottom: 8px;
}

.secondary-menu-head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.secondary-menu-title {
  font-size: 0.86rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-align: left;
  color: var(--color-text);
}

.secondary-menu-subtitle {
  margin-top: 3px;
  font-size: 0.74rem;
  line-height: 1.3;
  color: var(--color-text-muted);
}

.secondary-menu-toggle {
  flex: 0 0 auto;
}

.secondary-menu-btn {
  width: 100%;
}

.secondary-menu-link {
  justify-content: flex-start;
  text-transform: none;
}

.secondary-menu-rail.is-collapsed .secondary-menu-head {
  margin-bottom: 6px;
}

.secondary-menu-rail.is-collapsed .secondary-menu-title {
  display: none;
}

.secondary-menu-rail.is-collapsed .secondary-menu {
  align-items: center;
}

.timeline-body {
  position: relative;
  min-width: 0;
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  gap: 0;
  padding: var(--space-2) var(--space-2) 0;
  padding-right: calc(var(--secondary-menu-w) + var(--space-4));
  overflow: visible;
}

.timeline {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  border-radius: 0;
  border: 0;
  background: var(--app-layer-3);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.04),
    inset 0 -1px 0 rgb(0 0 0 / 0.2),
    0 14px 30px rgb(0 0 0 / 0.18);
  overflow: hidden;
  padding: 10px;
}

.timeline-workspace {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
}

.timeline-canvas {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
}

.timeline-mobile-sidebar {
  display: flex;
  flex-direction: column;
  flex: 0 0 148px;
  min-width: 148px;
  min-height: 0;
  max-height: 100%;
  overflow: auto;
  margin-left: 6px;
  gap: 8px;
  padding: 6px;
  align-self: stretch;
  border-radius: 0;
  border-left: 1px solid rgb(255 255 255 / 0.08);
  background: var(--app-grad-panel-soft);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.03),
    0 10px 20px rgb(0 0 0 / 0.12);
}

.timeline.is-collapsed :deep(.timeline-track) {
  /* Collapse height to one third of the row height. */
  height: calc(var(--timeline-row-h, 44px) / 3);
}

.timeline.is-collapsed :deep(.note-label) {
  display: none;
}

.timeline-scroll-viewport {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  width: 100%;
  height: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  background: var(--tl-viewport-bg);
  box-shadow: none;
  border-radius: 0;
  border: 0;
  touch-action: var(--tl-scroll-touch-action, pan-x);
  overscroll-behavior: contain;
}

.timeline-scroll-viewport::after {
  content: none;
}

.timeline-columns {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  column-gap: var(--panel-side-gap, 6px);
  align-items: stretch;
}

.timeline-column-card {
  border: 1px solid rgb(255 255 255 / 0.06);
  border-radius: 0;
  background: var(--tl-column-card-bg);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.025),
    inset 0 -1px 0 rgb(0 0 0 / 0.16);
}

.timeline-scroll-viewport.timeline-column-card {
  border-radius: 0;
  border: 0;
  box-shadow: none;
}

.timeline-string-names {
  flex: 0 0 var(--tl-string-name-col-w, 17px);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding: 4px 2px;
  padding-top: var(--timeline-string-header-offset, 0px);
  border: 0;
  background: var(--tl-string-names-bg);
  border-right: 1px solid rgb(255 255 255 / 0.08);
}

.timeline-string-name {
  height: var(--timeline-row-h, var(--tl-row-h-default));
  display: flex;
  align-items: center;
  justify-content: center;
}

.timeline :deep(.timeline-track) {
  height: var(--timeline-row-h, var(--tl-row-h-default));
}

.timeline-string-name-aux {
  border-bottom: 4px solid var(--tl-aux-divider-color);
  margin-bottom: 4px;
}

.timeline-string-name-btn {
  width: 100%;
  height: 100%;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--color-text-muted);
  font-size: calc(9px * var(--tl-ui-scale));
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  padding: 0;
}

.timeline-string-name-btn.is-active {
  color: var(--color-text);
  background: var(--app-glass-3);
}

.timeline-options {
  flex: 0 0 var(--panel-side-col-w, 36px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 4px;
  border: 0;
}

.marker-layer {
  position: relative;
  height: var(--tl-marker-layer-h);
  margin-bottom: var(--tl-marker-layer-gap);
}

.timeline-marker {
  position: absolute;
  top: 0;
  width: 3px;
  height: var(--tl-marker-layer-h);
  transform: translateX(-50%);
  border: 0;
  padding: 0;
  background: var(--tl-marker-color);
  cursor: pointer;
  border-radius: 999px;
  box-shadow: 0 0 10px rgb(208 138 67 / 0.22);
}

.timeline-marker-label {
  position: absolute;
  top: 0;
  left: 4px;
  font-size: calc(9px * var(--tl-ui-scale));
  font-weight: 700;
  color: rgb(174 186 203 / 0.88);
  white-space: nowrap;
}

.loop-bracket-layer {
  position: relative;
  height: var(--tl-loop-layer-h);
  margin-bottom: var(--tl-marker-layer-gap);
}

.loop-bracket {
  position: absolute;
  top: 2px;
  height: 12px;
  display: flex;
  align-items: center;
  z-index: 16;
  filter: drop-shadow(0 2px 8px rgb(0 0 0 / 0.18));
}

.loop-bracket-bar {
  flex: 1;
  height: 4px;
  border-radius: 999px;
  background: var(--tl-loop-bar-color);
}

.loop-handle {
  width: 8px;
  height: 12px;
  border: 1px solid rgb(255 255 255 / 0.1);
  border-radius: 3px;
  background: var(--tl-loop-handle-bg);
  cursor: ew-resize;
  padding: 0;
}

.loop-handle-start {
  margin-right: 2px;
}

.loop-handle-end {
  margin-left: 2px;
}

.strings-timeline {
  position: relative;
}

.timeline-comment-layer {
  position: absolute;
  z-index: 3;
}

.timeline-playhead-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--tl-playhead-color, var(--color-primary));
  transform: translateX(-50%);
  z-index: 14;
  pointer-events: none;
  box-shadow:
    0 0 0 1px rgb(255 244 226 / 0.72),
    0 0 18px color-mix(in srgb, var(--tl-playhead-color, var(--color-primary)) 72%, white 28%);
}

.timeline-length-handle-wrap {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 0;
  display: flex;
  pointer-events: auto;
  z-index: 15;
}

.timeline-bar-adjust-controls {
  position: absolute;
  left: 10px;
  top: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  z-index: 4;
}

.timeline-bar-adjust-btn {
  width: 26px;
  height: 26px;
  border: 1px solid rgb(255 255 255 / 0.08);
  border-radius: 999px;
  background: var(--app-grad-control);
  color: rgb(235 242 247 / 0.94);
  font-size: 18px;
  font-weight: 700;
  line-height: 1;
  padding: 0;
  cursor: pointer;
  box-shadow: 0 6px 14px rgb(0 0 0 / 0.18);
}

.timeline-bar-adjust-btn:disabled {
  opacity: 0.42;
  cursor: default;
}

.timeline-length-marker {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: calc(6px * var(--tl-ui-scale));
  display: flex;
  align-items: stretch;
  gap: 2px;
  opacity: 0.95;
  z-index: 3;
  pointer-events: auto;
  cursor: ew-resize;
}

.timeline-length-marker-thin {
  width: 1px;
  background: var(--tl-length-handle-color);
}

.timeline-length-marker-thick {
  width: 3px;
  background: var(--tl-length-handle-color);
}

.status-chip {
  width: 133px;
  justify-content: center;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.marquee {
  position: absolute;
  border: 2px dashed #d08a43;
  background: var(--tl-marquee-bg);
  border-radius: 6px;
  pointer-events: none;
  z-index: 20;
}

@media (max-width: 1200px) {
  .timeline-main {
    --tl-ui-scale: 0.96;
    width: 100%;
  }
}

@media (max-width: 860px) {
  .timeline-main {
    --tl-ui-scale: 0.92;
    width: 100%;
    margin-right: 0;
  }

  .secondary-menu-rail {
    position: static;
    width: auto;
    height: auto;
    padding: 0;
    margin-top: var(--space-2);
  }

  .secondary-menu-shell {
    height: auto;
  }

  .timeline-body {
    min-width: 0;
    padding-right: 0;
  }

  .timeline-workspace.has-mobile-sidebar {
    gap: 6px;
  }

  .timeline-workspace.has-mobile-sidebar .timeline-mobile-sidebar {
    flex-basis: 148px;
    min-width: 148px;
    margin-left: 0;
  }

  .timeline-workspace.has-mobile-sidebar .timeline-mobile-sidebar :deep(.timeline-info) {
    min-height: 0;
  }

  .status-chip {
    width: auto;
    min-width: 132px;
  }
}
</style>
