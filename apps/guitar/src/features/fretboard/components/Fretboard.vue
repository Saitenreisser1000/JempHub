<template>
  <div ref="rootEl" class="fretboard-body" :style="fretboardCssVars">
    <div class="fb-core-pad">
      <div ref="coreResizableEl" class="fb-core-resizable" :style="coreResizableStyle">
        <div class="fb-stack">
          <svg ref="overlayEl" class="fb-layer fb-overlay" :viewBox="`0 ${boardY} ${FB_WIDTH} ${boardH}`"
            preserveAspectRatio="none" style="overflow: visible" @mousemove="onMouseMove" @mouseleave="onMouseLeave">
            <defs>
              <linearGradient id="wood" x1="0" y1="0" x2="1" y2="0">
                <stop v-for="(s, idx) in FRETBOARD_THEME.svg.woodStops" :key="`wood-stop-${idx}`" :offset="s.offset"
                  :stop-color="s.color" />
              </linearGradient>

              <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
                <stop v-for="(s, idx) in FRETBOARD_THEME.svg.shadeStops" :key="`shade-stop-${idx}`" :offset="s.offset"
                  :stop-color="s.color" />
              </linearGradient>

              <filter id="grain" x="-10%" y="-10%" width="120%" height="120%">
                <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" />
                <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.18 0" />
                <feComposite operator="in" in2="SourceGraphic" />
              </filter>

              <linearGradient id="metal" x1="0" y1="0" x2="0" y2="1">
                <stop v-for="(s, idx) in FRETBOARD_THEME.svg.metalStops" :key="`metal-stop-${idx}`" :offset="s.offset"
                  :stop-color="s.color" />
              </linearGradient>

              <radialGradient id="inlay" cx="50%" cy="40%" r="60%">
                <stop v-for="(s, idx) in FRETBOARD_THEME.svg.inlayStops" :key="`inlay-stop-${idx}`" :offset="s.offset"
                  :stop-color="s.color" />
              </radialGradient>

              <filter id="fb-dotgroup-card-shadow" x="-8%" y="-12%" width="116%" height="124%">
                <feDropShadow dx="0" dy="6" stdDeviation="7" flood-color="#07111f" flood-opacity="0.28" />
              </filter>

              <clipPath id="fb-core-clip">
                <rect :x="0" :y="0" :width="FB_WIDTH" :height="FB_HEIGHT" />
              </clipPath>
              <clipPath id="fb-card-clip">
                <rect :x="4" :y="boardY" :width="FB_WIDTH - 8" :height="boardH" />
              </clipPath>
            </defs>

            <g class="fb-board-shell" data-part="board-shell">
              <rect :x="0" :y="boardY" :width="FB_WIDTH" :height="boardH" rx="0" fill="url(#wood)" />
              <rect :x="0" :y="boardY" :width="FB_WIDTH" :height="boardH" rx="0" fill="url(#shade)" />
              <rect :x="0" :y="boardY" :width="FB_WIDTH" :height="boardH" rx="0" fill="transparent" filter="url(#grain)"
                opacity="0.9" />
              <rect :x="4" :y="boardY + 4" :width="FB_WIDTH - 8" :height="boardH - 8" rx="0" fill="transparent"
                :stroke="FRETBOARD_THEME.svg.boardBorderStroke" stroke-width="2" />
            </g>

            <g v-if="activeToneDotGroupCards.length" class="fb-active-tone-group-cards" clip-path="url(#fb-card-clip)" style="pointer-events: none">
              <rect
                v-for="card in activeToneDotGroupCards"
                :key="card.key"
                :x="card.x"
                :y="card.y"
                :width="card.width"
                :height="card.height"
                :rx="card.rx"
                :fill="card.color"
                :stroke="card.color"
                :opacity="card.opacity"
                :style="{ strokeOpacity: card.strokeOpacity, strokeWidth: `${card.strokeWidth}px`, filter: 'url(#fb-dotgroup-card-shadow)' }"
              />
            </g>

            <g class="fb-board-core" data-part="board-core" clip-path="url(#fb-core-clip)">
              <g class="fb-inlays" opacity="0.95">
                <template v-for="dot in inlayDots" :key="dot.key">
                  <circle :cx="displayX(dot.x)" :cy="dot.y" :r="dot.r" fill="url(#inlay)" />
                  <circle :cx="displayX(dot.x)" :cy="dot.y" :r="dot.r" fill="transparent" :stroke="FRETBOARD_THEME.svg.inlayOutlineStroke"
                    stroke-width="1" />
                </template>
              </g>
            </g>

            <g class="fb-board-hardware" data-part="board-hardware">
              <rect :x="displayRectX(0, NUT_WIDTH)" :y="boardY" :width="NUT_WIDTH" :height="boardH" :fill="FRETBOARD_THEME.svg.nutFill"
                opacity="0.95" />
              <rect :x="displayRectX(NUT_WIDTH, 3)" :y="boardY" width="3" :height="boardH" :fill="FRETBOARD_THEME.svg.nutDividerFill"
                opacity="0.9" />
              <g class="fb-frets">
                <template v-for="(x, i) in fretLinesPx" :key="`fret-${i}`">
                  <line v-if="i === 0" :x1="displayX(x + NUT_WIDTH)" :y1="boardY" :x2="displayX(x + NUT_WIDTH)" :y2="boardY + boardH"
                    :stroke="FRETBOARD_THEME.svg.fretZeroStroke" stroke-width="2" opacity="0.9" />
                  <line v-else :x1="displayX(x - 0.9)" :y1="boardY" :x2="displayX(x - 0.9)" :y2="boardY + boardH"
                    :stroke="FRETBOARD_THEME.svg.fretGlowStroke" :stroke-width="i === 12 ? 1.6 : 1.3" opacity="0.95" />
                  <line v-if="i !== 0" :x1="displayX(x)" :y1="boardY" :x2="displayX(x)" :y2="boardY + boardH" stroke="url(#metal)"
                    :stroke-width="i === 12 ? 3.2 : 2.6" opacity="0.95" />
                  <line v-if="i !== 0" :x1="displayX(x + 1.1)" :y1="boardY" :x2="displayX(x + 1.1)" :y2="boardY + boardH"
                    :stroke="FRETBOARD_THEME.svg.fretShadowStroke" :stroke-width="i === 12 ? 1.7 : 1.4" opacity="0.95" />
                </template>
              </g>
            </g>

            <g class="fb-board-strings" data-part="board-strings" clip-path="url(#fb-core-clip)">
              <g class="fb-strings" opacity="0.9">
                <line v-for="s in strings" :key="`string-${s.string}`" :x1="-STRING_OVERHANG" :y1="s.y" :x2="FB_WIDTH"
                  :y2="s.y" :stroke="FRETBOARD_THEME.svg.stringStroke" :stroke-width="s.w" stroke-linecap="round" />
                <line v-for="s in strings" :key="`string-shadow-${s.string}`" :x1="-STRING_OVERHANG" :y1="s.y + 0.9"
                  :x2="FB_WIDTH" :y2="s.y + 0.9" :stroke="FRETBOARD_THEME.svg.stringShadowStroke" :stroke-width="Math.max(1, s.w - 0.6)"
                  stroke-linecap="round" />
              </g>
            </g>
            <g class="fb-interaction-layer" data-part="interaction-layer">
              <!-- transparent hit-area incl. fretboard overhang -->
              <rect
                :x="0"
                :y="boardY"
                :width="FB_WIDTH"
                :height="boardH"
                fill="transparent"
                @pointerdown="onBoardPointerDown"
                @pointerup="onBoardPointerUp" />

              <!-- String numbers -->
              <g class="fb-string-labels">
                <text v-for="s in strings" :key="`string-label-${s.string}`" :x="stringLabelX" :y="s.y + 4" :text-anchor="stringLabelAnchor"
                  font-size="12" font-weight="800" :fill="FRETBOARD_THEME.svg.stringLabelFill" :stroke="FRETBOARD_THEME.svg.stringLabelStroke"
                  stroke-width="2" paint-order="stroke">
                  {{ stringLabelFor(s.string) }}
                </text>
              </g>

              <g v-if="suggestedHandPositionOverlayRect" class="fb-hand-position-suggested"
                style="pointer-events: none">
                <rect :x="displayRectX(suggestedHandPositionOverlayRect.x, suggestedHandPositionOverlayRect.width)" :y="suggestedHandPositionOverlayRect.y"
                  :width="suggestedHandPositionOverlayRect.width" :height="suggestedHandPositionOverlayRect.height"
                  :rx="suggestedHandPositionOverlayRect.rx" />
                <text :x="suggestedHandPositionLabelX(suggestedHandPositionOverlayRect)"
                  :y="suggestedHandPositionOverlayRect.labelY" :text-anchor="suggestedHandPositionLabelAnchor">
                  {{
                    t('fretboardShow.suggestedPosition', {
                      from: suggestedHandPositionOverlayRect.fromFret,
                      to: suggestedHandPositionOverlayRect.toFret,
                    })
                  }}
                </text>
              </g>

              <!-- ToneDots -->
              <g class="fb-tone-dots">
                <g v-if="harmonyGuideDots.length" class="fb-harmony-guides" style="pointer-events: none">
                  <ellipse v-for="d in harmonyGuideDots"
                    :key="`guide-${d.string}-${d.fret}-${d.inChord ? 1 : 0}-${d.inScale ? 1 : 0}`" :cx="toneDotX(d)"
                    :cy="toneDotY(d)" :rx="dotRx(harmonyGuideRadius(d))" :ry="harmonyGuideRadius(d)" :fill="harmonyGuideFill(d)"
                    :stroke="harmonyGuideStroke(d)" :stroke-width="harmonyGuideStrokeWidth(d)" />
                </g>
                <g v-if="idleConnectionSegments.length" class="fb-idle-dot-connections" style="pointer-events: none">
                  <line
                    v-for="seg in idleConnectionSegments"
                    :key="`idle-${seg.fromKey}-${seg.toKey}`"
                    :x1="seg.x1"
                    :y1="seg.y1"
                    :x2="seg.x2"
                    :y2="seg.y2"
                    :stroke="seg.color"
                    :style="{ opacity: seg.opacity, strokeWidth: `${seg.strokeWidth}px` }"
                  />
                </g>
                <g v-if="playbackTravelLine" class="fb-playback-travel-line" style="pointer-events: none">
                  <line :x1="playbackTravelLine.x1" :y1="playbackTravelLine.y1" :x2="playbackTravelLine.x2"
                    :y2="playbackTravelLine.y2" :stroke="playbackTravelLine.color" :style="{
                      opacity: playbackTravelLine.opacity,
                      strokeWidth: `${playbackTravelLine.strokeWidth}px`,
                      strokeDasharray: playbackTravelLine.strokeDasharray,
                      filter: playbackTravelLine.filter,
                    }" />
                </g>
                <g
                  v-if="directionPreviewSegments.length"
                  class="fb-direction-preview"
                  style="pointer-events: none"
                >
                  <line
                    v-for="seg in directionPreviewSegments"
                    :key="`dir-preview-${seg.fromKey}-${seg.toKey}`"
                    :x1="seg.x1"
                    :y1="seg.y1"
                    :x2="seg.x2"
                    :y2="seg.y2"
                    :stroke="seg.color"
                    :style="{
                      opacity: seg.opacity,
                      strokeWidth: `${seg.strokeWidth}px`,
                      filter: seg.filter,
                    }"
                  />
                </g>
                <g v-if="nowMarkers.length" class="fb-now-markers" style="pointer-events: none">
                  <g v-for="m in nowMarkers" :key="`now-${m.noteKey}`">
                    <line class="fb-now-string-line" :x1="displayX(NUT_WIDTH)" :y1="m.y" :x2="displayX(FB_WIDTH)" :y2="m.y"
                      :stroke="m.color" :style="{ opacity: m.lineOpacity }" />
                    <line class="fb-now-cross" :x1="m.x - m.crossHalf" :y1="m.y" :x2="m.x + m.crossHalf" :y2="m.y"
                      :stroke="m.color" />
                    <ellipse class="fb-now-ring" :cx="m.x" :cy="m.y" :rx="dotRx(m.ringR)" :ry="m.ringR" :stroke="m.color" />
                  </g>
                </g>
                <g v-if="playbackSelfLoop" class="fb-playback-self-loop" style="pointer-events: none">
                  <circle class="self-loop-base" :cx="playbackSelfLoop.cx" :cy="playbackSelfLoop.cy"
                    :r="playbackSelfLoop.r" fill="none" :stroke="playbackSelfLoop.color" />
                  <line :x1="playbackSelfLoop.x1" :y1="playbackSelfLoop.y1" :x2="playbackSelfLoop.x2"
                    :y2="playbackSelfLoop.y2" :stroke="playbackSelfLoop.color" />
                  <circle class="self-loop-progress" :cx="playbackSelfLoop.cx" :cy="playbackSelfLoop.cy"
                    :r="playbackSelfLoop.r" fill="none" :stroke="playbackSelfLoop.color"
                    :stroke-dasharray="playbackSelfLoop.dasharray" :stroke-dashoffset="playbackSelfLoop.dashoffset" />
                  <circle class="self-loop-head" :cx="playbackSelfLoop.headX" :cy="playbackSelfLoop.headY" :r="2.7"
                    :fill="playbackSelfLoop.color" />
                </g>

                <!-- Hover preview for inactive positions (editor only) -->
                <ellipse v-if="hoveredPreviewToneDot" :cx="toneDotX(hoveredPreviewToneDot)"
                  :cy="toneDotY(hoveredPreviewToneDot)" :rx="dotRx(previewR())" :ry="previewR()" fill="transparent"
                  :stroke="FRETBOARD_THEME.svg.hoverPreviewStroke" stroke-width="3" style="pointer-events: none" />

                <g v-for="d in toneDotsForRender" :key="`tone-dot-${d._noteKey ?? `${d.string}-${d.fret}`}`">
                  <ellipse
                    v-if="isToneDotSelected(d)"
                    class="fb-tone-dot-selection-ring"
                    :cx="toneDotX(d)"
                    :cy="toneDotY(d)"
                    :rx="dotRx(toneDotSelectionRingR(d))"
                    :ry="toneDotSelectionRingR(d)"
                    :stroke="toneDotSelectionRingStroke(d)"
                    :stroke-width="toneDotSelectionRingStrokeWidth(d)"
                    :style="toneDotSelectionRingStyle(d)"
                  />
                  <ellipse class="fb-tone-dot" :cx="toneDotX(d)" :cy="toneDotY(d)" :rx="dotRx(toneDotR(d))" :ry="toneDotR(d)" :fill="toneDotFill(d)"
                    :opacity="toneDotOpacity(d)" :stroke="toneDotStroke(d)" :stroke-width="toneDotStrokeWidth(d)"
                    :style="toneDotStyle(d)"
                    @mouseenter="onToneDotEnter(d, $event)" @mouseleave="onToneDotLeave(d)"
                    @click="onToneDotClick(d, $event)" @contextmenu.prevent.stop="onToneDotContextMenu(d, $event)"
                    @pointerdown="onToneDotPointerDown(d, $event)" @pointermove="onToneDotPointerMove($event)"
                    @pointerup="onToneDotPointerUp($event)" @pointercancel="onToneDotPointerUp($event)" />
                  <image
                    v-if="toneDotIcon(d)"
                    class="fb-tone-dot-symbol-icon"
                    :x="toneDotX(d) - 9"
                    :y="toneDotY(d) - 9"
                    width="18"
                    height="18"
                    :href="toneDotIcon(d)"
                  />
                  <text v-else-if="toneDotSymbol(d)" class="fb-tone-dot-symbol" :x="toneDotX(d)" :y="toneDotY(d)">
                    {{ toneDotSymbol(d) }}
                  </text>
                  <text v-if="showPitchLabel(d)" class="fb-tone-dot-pitch" :x="toneDotX(d)" :y="toneDotY(d) + 11">
                    {{ toneDotPitchLabel(d) }}
                  </text>
                  <g v-if="isToneDotStackFront(d)" class="fb-tone-dot-stack-badge" style="pointer-events: none">
                    <circle :cx="toneDotX(d) + 11" :cy="toneDotY(d) - 11" r="8" />
                    <text :x="toneDotX(d) + 11" :y="toneDotY(d) - 11">{{ d._stackCount }}</text>
                  </g>
                </g>

                <ellipse v-if="leadInPreviewDot" class="fb-next-note-preview" :cx="toneDotX(leadInPreviewDot)"
                  :cy="toneDotY(leadInPreviewDot)" :rx="dotRx(toneDotR(leadInPreviewDot) + 7)" :ry="toneDotR(leadInPreviewDot) + 7" />

                <ellipse v-else-if="nextNotePreviewDot" class="fb-next-note-preview" :cx="toneDotX(nextNotePreviewDot)"
                  :cy="toneDotY(nextNotePreviewDot)" :rx="dotRx(toneDotR(nextNotePreviewDot) + 7)" :ry="toneDotR(nextNotePreviewDot) + 7" />

                <!-- Drag preview (editor only): transparent ghost dot at the current target position -->
                <ellipse v-if="dragPreviewToneDot" :cx="toneDotX(dragPreviewToneDot)" :cy="toneDotY(dragPreviewToneDot)"
                  :rx="dotRx(toneDotR(dragPreviewToneDot))" :ry="toneDotR(dragPreviewToneDot)" fill="transparent" :stroke="FRETBOARD_THEME.svg.dragPreviewStroke" stroke-width="4"
                  style="pointer-events: none" />
              </g>
              <g v-if="fretViewMask" class="fb-view-mask" style="pointer-events: none">
                <rect :x="displayRectX(0, fretViewMask.left)" :y="0" :width="fretViewMask.left" :height="FB_HEIGHT" />
                <rect :x="displayRectX(fretViewMask.right, FB_WIDTH - fretViewMask.right)" :y="0"
                  :width="FB_WIDTH - fretViewMask.right" :height="FB_HEIGHT" />
              </g>
            </g>
          </svg>
          <div class="fb-text-layer">
            <div
              v-for="item in renderedTextItems"
              :key="item.id"
              class="fb-text-item"
              :class="{ 'is-inactive': !item.isActiveNow }"
              :style="{
                left: `${displayPercent(item.xPct)}%`,
                top: `${item.yPct}%`,
                width: `${item.widthPct || 32}%`,
                height: isCommentMode && !isPlaying
                  ? `calc(${item.heightPct || 18}% + ${TEXT_WINDOW_HEADER_PX}px)`
                  : `${item.heightPct || 18}%`,
                '--fb-comment-color': item.color || overlay.DEFAULT_COMMENT_COLOR,
              }"
            >
              <template v-if="isCommentMode && !isPlaying">
                <div class="fb-text-window">
                  <div class="fb-text-window-head" @pointerdown.stop="onTextItemHeaderPointerDown(item.id, $event)">
                    <span class="fb-text-window-title">Comment</span>
                    <div class="fb-text-color-dropdown" @pointerdown.stop @click.stop>
                      <button
                        class="fb-text-color-trigger"
                        type="button"
                        :style="{ '--fb-comment-swatch': item.color || overlay.DEFAULT_COMMENT_COLOR }"
                        @click.stop="toggleTextColorMenu(item.id)"
                      >
                        <span class="fb-text-color-trigger-swatch" />
                      </button>
                      <div v-if="openTextColorMenuId === String(item.id)" class="fb-text-color-menu">
                        <button
                          v-for="color in commentPalette"
                          :key="`${item.id}-${color}`"
                          class="fb-text-color-option"
                          :class="{ 'is-active': String(item.color || '').toLowerCase() === String(color).toLowerCase() }"
                          type="button"
                          :style="{ '--fb-comment-swatch': color }"
                          @click.stop="selectTextColor(item.id, color)"
                        >
                          <span class="fb-text-color-option-swatch" />
                        </button>
                      </div>
                    </div>
                    <button
                      class="fb-text-item-delete"
                      type="button"
                      title="Comment löschen"
                      @pointerdown.stop
                      @click.stop="onTextItemDelete(item.id)"
                    >
                      x
                    </button>
                  </div>
                  <textarea
                    class="fb-text-item-input"
                    :value="item.text"
                    placeholder="Comment"
                    rows="3"
                    @pointerdown.stop
                    @click.stop
                    @input="onTextItemInput(item.id, $event)"
                  />
                  <button
                    class="fb-text-resize-handle"
                    type="button"
                    title="Comment Größe ändern"
                    @pointerdown.stop.prevent="onTextItemResizeStart(item.id, $event, item)"
                  />
                </div>
              </template>
              <div v-else class="fb-text-item-static">
                {{ item.text }}
              </div>
            </div>
          </div>
        </div>
        <div class="fb-fret-numbers" aria-hidden="true">
          <span v-for="l in fretLabels" :key="`fret-label-${l.fret}`" class="fb-fret-number"
            :class="{ 'is-marker-fret': isMarkerFret(l.fret) }" :style="{ left: `${displayPercent(l.xPct)}%` }">
            {{ l.fret }}
          </span>
        </div>
      </div>
    </div>
    <div v-if="props.editable && surfacePolicy.canEditNotes && settings.showChordShapePanel" class="fb-chord-shape-panel">
      <span class="fb-chord-detected">{{ t('fretboardShow.chord') }}: {{ detectedChordLabel }}</span>
      <button class="fb-shape-btn" type="button" :disabled="!canNudgeSelection" @click="() => nudgeSelection(1, 0)">
        {{ t('fretboardShow.plusFret') }}
      </button>
      <button class="fb-shape-btn" type="button" :disabled="!canNudgeSelection" @click="() => nudgeSelection(-1, 0)">
        {{ t('fretboardShow.minusFret') }}
      </button>
      <button class="fb-shape-btn" type="button" :disabled="!canNudgeSelection" @click="() => nudgeSelection(0, -1)">
        {{ t('fretboardShow.stringUp') }}
      </button>
      <button class="fb-shape-btn" type="button" :disabled="!canNudgeSelection" @click="() => nudgeSelection(0, 1)">
        {{ t('fretboardShow.stringDown') }}
      </button>
      <button class="fb-shape-btn" type="button" :disabled="!canSaveCurrentShape" @click="saveCurrentShape">
        {{ t('fretboardShow.saveShape') }}
      </button>
      <select v-model="selectedShapeId" class="fb-shape-select" :disabled="!savedShapes.length">
        <option value="">{{ t('fretboardShow.selectShape') }}</option>
        <option v-for="s in savedShapes" :key="s.id" :value="s.id">
          {{ s.name }}
        </option>
      </select>
      <button class="fb-shape-btn" type="button" :disabled="!selectedShape || !props.editable"
        @click="applySelectedShape">
        {{ t('fretboardShow.loadShape') }}
      </button>
      <button class="fb-shape-btn is-danger" type="button" :disabled="!selectedShape" @click="deleteSelectedShape">
        {{ t('fretboardShow.delete') }}
      </button>
    </div>

    <div v-if="tooltip.visible" class="fb-tooltip" :style="{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }">
      {{ tooltip.text }}
    </div>
    <FretboardToneDotContextMenu :open="toneDotContextMenu.open && noteEditingEnabled" :x="toneDotContextMenu.x" :y="toneDotContextMenu.y"
      :string="toneDotContextMenu.string" :fret="toneDotContextMenu.fret" :items="toneDotContextMenu.items"
      :select-label="t('melodyInput.select')" :delete-label="t('fretboardShow.delete')"
      @select-item="onSelectToneDotContextItem" @delete-item="onDeleteToneDotContextItem" />
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import FretboardToneDotContextMenu from './FretboardToneDotContextMenu.vue'
import { storeToRefs } from 'pinia'
import { useNotesStore } from '@/store/useNotes'
import { useInstrumentStore } from '@/store/useInstrument'
import { useSelectionStore } from '@/store/useSelection'
import { useTimelineSettingsStore } from '@/store/useTimelineSettings'
import { useTransportStore } from '@/store/useTransport'
import { usePlaybackVisualsStore } from '@/store/usePlaybackVisuals'
import { useHandPositionsStore } from '@/store/useHandPositions'
import { useHarmonyMenuStore } from '@/store/useHarmonyMenu'
import { useFretboardOverlayStore } from '@/store/useFretboardOverlay'
import { SURFACE_MODES, useUiModeStore } from '@/store/useUiMode'
import { useSafeMelodyInput } from '@/features/fretboard/composables/useSafeMelodyInput'
import {
  FRETBOARD_SHOW_DOT_PULSE_MS,
  FRETBOARD_SHOW_DOT_PULSE_RADIUS_FACTOR,
} from '@/features/fretboard/config/fretboardVisuals'
import {
  FRETBOARD_DIMENSIONS,
  FRETBOARD_LAYOUT_BREAKPOINTS,
  FRETBOARD_PANE_CONSTRAINTS,
  FRETBOARD_UI_TOKENS,
} from '@/features/fretboard/config/fretboardLayout'
import {
  FRETBOARD_HAND_POSITION,
  FRETBOARD_INLAYS,
  FRETBOARD_INTERACTION,
  FRETBOARD_SHAPES,
  FRETBOARD_TONE_DOTS,
} from '@/features/fretboard/config/fretboardBehavior'
import { FRETBOARD_THEME } from 'jemp-design-system/fretboard-theme'
import { NOTE_VALUE_ITEMS, normalizeNoteValue, noteValueItem } from '@/config/noteValues'
import { getTuning } from '@/domain/music/tunings'
import { midiToNoteName } from '@/domain/music/notes'
import { midiForFretString } from '@/domain/music/pitch'
import { playMidi } from '@/domain/audio/simpleSynth'
import { DEFAULT_TIME_PER_BLOCK_MS } from '@/features/timeline/config/grid'
import { gridIndexToStartMs, lengthBlocksToDurationMs } from '@/domain/timelineTime'
import { useI18n } from '@/i18n'

defineOptions({ name: 'FretboardView' })

const props = defineProps({
  numFrets: { type: Number, required: true },
  editable: { type: Boolean, default: false },
  coreResizePx: { type: Number, default: 0 },
  isPhoneView: { type: Boolean, default: false },
})

const FB_WIDTH = FRETBOARD_DIMENSIONS.width
const FB_HEIGHT = FRETBOARD_DIMENSIONS.height
const NUT_WIDTH = FRETBOARD_DIMENSIONS.nutWidth
const BOARD_OVERHANG = FRETBOARD_DIMENSIONS.boardOverhang
const STRING_OVERHANG = FRETBOARD_DIMENSIONS.stringOverhang
const rootEl = ref(null)
const overlayEl = ref(null)
const coreResizableEl = ref(null)
const viewportWidthPx = ref(Number(globalThis?.innerWidth) || 1440)
const viewportHeightPx = ref(Number(globalThis?.innerHeight) || 900)
const stackMinHeightPx = ref(0)
const stackMaxHeightPx = ref(0)
const coreMinHeightPx = ref(0)
const coreMaxHeightPx = ref(0)
const dotRoundCompX = ref(1)
let coreResizeObserver = null

const store = useNotesStore()
const instrument = useInstrumentStore()
const selection = useSelectionStore()
const settings = useTimelineSettingsStore()
const transport = useTransportStore()
const playbackVisuals = usePlaybackVisualsStore()
const handPositionsStore = useHandPositionsStore()
const harmonyMenu = useHarmonyMenuStore()
const overlay = useFretboardOverlayStore()
const uiMode = useUiModeStore()
const { t } = useI18n()

const { playState, playheadMs } = storeToRefs(transport)
const { handPositions } = storeToRefs(handPositionsStore)
const { scalePitchClasses, patternFretRange, showChord, showScale, scaleRoot, chordRoot, activeChordShape } =
  storeToRefs(harmonyMenu)
const { textItems } = storeToRefs(overlay)
const { surfaceMode, surfacePolicy } = storeToRefs(uiMode)
const isPlaying = computed(() => playState.value === 'playing')
const isCommentMode = computed(() => surfaceMode.value === SURFACE_MODES.COMMENT)
const noteEditingEnabled = computed(() => props.editable && surfacePolicy.value.canEditNotes)
const melodyInput = useSafeMelodyInput({ editable: noteEditingEnabled })
const isLeftHanded = computed(() => Boolean(settings.leftHanded))
const commentPalette = computed(() =>
  Array.isArray(overlay.COMMENT_COLORS) ? overlay.COMMENT_COLORS : ['#f59e0b'],
)
const TEXT_WINDOW_HEADER_PX = 37
const PLAYBACK_START_LEAD_IN_MS = 800
const fretViewMode = ref('full')
const fretViewFrom = ref(0)
const fretViewTo = ref(Math.max(0, Number(props.numFrets) || 12))
const fretViewRange = computed(() => {
  const max = Math.max(0, Number(props.numFrets) || 12)
  if (fretViewMode.value !== 'range') return { from: 0, to: max }
  const from = Math.max(0, Math.min(max, Number(fretViewFrom.value) || 0))
  const to = Math.max(from, Math.min(max, Number(fretViewTo.value) || max))
  return { from, to }
})
const fretViewMask = computed(() => {
  if (fretViewMode.value !== 'range') return null
  const { from, to } = fretViewRange.value
  const lines = fretLinesPx.value
  const left = from <= 1 ? NUT_WIDTH : Number(lines[from - 1] ?? NUT_WIDTH)
  const right = Number(lines[to] ?? FB_WIDTH)
  if (!(right > left)) return null
  return { left, right }
})

function isFretInView(fret) {
  const n = Number(fret)
  if (!Number.isFinite(n)) return false
  const r = fretViewRange.value
  return n >= r.from && n <= r.to
}

watch(
  () => Number(props.numFrets) || 12,
  (maxRaw) => {
    const max = Math.max(0, Number(maxRaw) || 12)
    if (Number(fretViewFrom.value) > max) fretViewFrom.value = max
    if (Number(fretViewTo.value) > max) fretViewTo.value = max
    if (Number(fretViewTo.value) < Number(fretViewFrom.value))
      fretViewTo.value = Number(fretViewFrom.value)
  },
  { immediate: true },
)

const { highlightedNoteKeys, pulseStarts, directionPreview } = storeToRefs(playbackVisuals)
const playedNoteKeys = ref(new Set())

const LONG_PRESS_MS = FRETBOARD_INTERACTION.longPressMs
const CLICK_SUPPRESS_MS = FRETBOARD_INTERACTION.clickSuppressMs

const dragState = ref({
  active: false,
  noteKey: null,
  pointerId: null,
  startAtMs: 0,
  target: null,
})

let longPressTimer = null
let suppressClicksUntilMs = 0
const CHORD_SHAPES_STORAGE_KEY = FRETBOARD_SHAPES.storageKey
const savedShapes = ref([])
const selectedShapeId = ref('')

const highlightedNoteKeySet = computed(() => {
  const keys = Array.isArray(highlightedNoteKeys.value) ? highlightedNoteKeys.value : []
  return new Set(keys.map((k) => String(k)))
})

const selectedNoteKeySet = computed(() => {
  const out = new Set()
  const keys = Array.isArray(selection.selectedNoteKeys) ? selection.selectedNoteKeys : []
  for (const key of keys) {
    const normalized = String(key || '')
    if (normalized) out.add(normalized)
  }
  const primary = String(selection.selectedNoteKey || '')
  if (primary) out.add(primary)
  return out
})

const pulseStartedAtByNoteKey = computed(() => {
  const m = new Map()
  for (const p of pulseStarts.value) {
    const noteKey = p?.key
    const startedAtMs = Number(p?.startedAtMs)
    if (!noteKey || !Number.isFinite(startedAtMs)) continue

    const k = String(noteKey)
    const prev = m.get(k)
    if (prev == null || startedAtMs > prev) m.set(k, startedAtMs)
  }
  return m
})

const animNowMs = ref(0)
const playbackLeadInStartedAtMs = ref(0)
let rafId = null

function startAnim() {
  if (rafId != null) return
  const tick = () => {
    animNowMs.value = performance.now()
    rafId = requestAnimationFrame(tick)
  }
  rafId = requestAnimationFrame(tick)
}

function stopAnim() {
  if (rafId == null) return
  cancelAnimationFrame(rafId)
  rafId = null
}

const tuning = computed(() => getTuning(instrument.tuningId))

const stringLabelByNumber = computed(() => {
  const count = Math.max(1, Number(instrument.numStrings) || 6)
  const labels = new Map()

  const openMidi = tuning.value?.openMidi
  if (Array.isArray(openMidi) && openMidi.length >= count) {
    for (let s = 1; s <= count; s++) {
      const midi = Number(openMidi[s - 1])
      const name = Number.isFinite(midi) ? midiToNoteName(midi, { includeOctave: false }) : ''
      labels.set(s, name || String(s))
    }
    return labels
  }

  for (let s = 1; s <= count; s++) labels.set(s, String(s))
  return labels
})

function stringLabelFor(stringNumber) {
  const s = Number(stringNumber)
  return stringLabelByNumber.value.get(s) ?? String(stringNumber)
}

const notesByPosKey = computed(() => {
  const m = new Map()
  for (const note of store.activeNotes) {
    const string = Number(note?.string)
    const fret = Number(note?.fret)
    const key = String(note?.key ?? '')
    if (!key) continue
    if (!Number.isFinite(string) || !Number.isFinite(fret)) continue
    const posKey = `${string}-${fret}`
    const arr = m.get(posKey) ?? []
    arr.push(note)
    m.set(posKey, arr)
  }
  for (const [posKey, notes] of m.entries()) {
    const items = [...notes]
    items.sort((a, b) => {
      const ta = Number(a?.placedAtMs) || 0
      const tb = Number(b?.placedAtMs) || 0
      if (ta !== tb) return ta - tb
      return String(a?.key ?? '').localeCompare(String(b?.key ?? ''))
    })
    m.set(posKey, items)
  }
  return m
})

// Per string/fret DotQueue of note keys.
// DotQueue front is the centered ToneDot: order[0] is centered,
// order[1] shifts left by one offset, etc.
const dotQueueByPosKey = ref(new Map())

const defaultDotQueueByPosKey = computed(() => {
  const out = new Map()
  for (const [posKey, notes] of notesByPosKey.value.entries()) {
    // Default DotQueue: newest at front (center).
    out.set(
      posKey,
      notes
        .map((n) => String(n?.key ?? ''))
        .filter(Boolean)
        .reverse(),
    )
  }
  return out
})

// Keep DotQueue state in sync with current notes.
watch(
  () => defaultDotQueueByPosKey.value,
  (next) => {
    const prev = dotQueueByPosKey.value
    const merged = new Map()

    for (const [posKey, defaultKeys] of next.entries()) {
      const def = Array.isArray(defaultKeys) ? defaultKeys.map(String) : []
      const defSet = new Set(def)

      const existing = prev.get(posKey) ?? []
      const kept = existing.map(String).filter((k) => defSet.has(k))
      const keptSet = new Set(kept)
      const prepended = def.filter((k) => !keptSet.has(k))

      // New notes should appear at the front/center.
      merged.set(posKey, [...prepended, ...kept])
    }

    dotQueueByPosKey.value = merged
  },
  { immediate: true },
)

// Playback DotQueue behavior:
// - When a ToneDot starts playing, it becomes the queue front (center + top).
// - When it stops being highlighted, it moves to the back.
function toneDotColorKeyForNote(note) {
  return String(note?.color ?? 'white')
}

function rotateColorGroupToFront(order, colorKey) {
  const matching = []
  const rest = []
  for (const rawKey of Array.isArray(order) ? order : []) {
    const key = String(rawKey ?? '')
    if (!key) continue
    const note = noteByKey.value.get(key)
    if (toneDotColorKeyForNote(note) === colorKey) matching.push(key)
    else rest.push(key)
  }
  if (matching.length === 0 || rest.length === 0) return null
  return [...matching, ...rest]
}

function buildColorGroups(order, byKey) {
  const groups = []
  let current = null

  for (const rawKey of Array.isArray(order) ? order : []) {
    const key = String(rawKey ?? '')
    if (!key || !byKey.has(key)) continue

    const note = byKey.get(key)
    const colorKey = toneDotColorKeyForNote(note)
    if (!current || current.colorKey !== colorKey) {
      current = { colorKey, keys: [] }
      groups.push(current)
    }
    current.keys.push(key)
  }

  return groups
}

const lastPulseId = ref('')
watch(
  () => pulseStarts.value,
  (arr) => {
    const p = Array.isArray(arr) ? arr[0] : null
    const k = p?.key != null ? String(p.key) : ''
    const startedAtMs = Number(p?.startedAtMs)
    if (!k || !Number.isFinite(startedAtMs)) return

    const played = new Set(playedNoteKeys.value)
    played.add(k)
    playedNoteKeys.value = played

    const pulseId = `${k}:${startedAtMs}`
    if (pulseId === lastPulseId.value) return
    lastPulseId.value = pulseId

    const note = noteByKey.value.get(k)
    const colorKey = toneDotColorKeyForNote(note)
    const next = new Map(dotQueueByPosKey.value)
    let changed = false
    for (const [posKey, order] of next.entries()) {
      if (!Array.isArray(order) || order.length < 2) continue
      const rotated = rotateColorGroupToFront(order, colorKey)
      if (!rotated) continue
      next.set(posKey, rotated)
      changed = true
    }
    if (!changed) return

    // Bring the active color group to the front across all stacked positions.
    dotQueueByPosKey.value = next
  },
  { deep: true },
)

const toneDotsForRender = computed(() => {
  const out = []
  const activeColorKey = String(activeStackColorKey.value || '')

  // Render order per position is driven by a DotQueue (see dotQueueByPosKey).
  // Same-color notes form a dot group. When a group becomes active it moves to
  // the front, and only that front group gets the full filled rendering.
  for (const [posKey, notes] of notesByPosKey.value.entries()) {
    const items = Array.isArray(notes) ? [...notes] : []
    const byKey = new Map(items.map((n) => [String(n?.key ?? ''), n]).filter(([k]) => k))
    const baseOrder = dotQueueByPosKey.value.get(posKey) ?? []
    const order = activeColorKey
      ? (rotateColorGroupToFront(baseOrder, activeColorKey) ?? baseOrder)
      : baseOrder
    const groups = buildColorGroups(order, byKey)

    const [stringRaw, fretRaw] = String(posKey).split('-')
    const string = Number(stringRaw)
    const fret = Number(fretRaw)
    if (!isFretInView(fret)) continue

    const flattened = []
    const totalCount = groups.reduce((sum, group) => sum + group.keys.length, 0)
    for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
      const group = groups[groupIndex]
      const isActiveGroup = activeColorKey
        ? group.colorKey === activeColorKey
        : groupIndex === 0
      for (const rawKey of group.keys) {
        const key = String(rawKey ?? '')
        const note = byKey.get(key)
        if (!note) continue
        flattened.push({
          string,
          fret,
          color: note?.color,
          _noteKey: note?.key,
          _placedAtMs: Number(note?.placedAtMs) || 0,
          _stackCount: totalCount,
          _groupIndex: groupIndex,
          _groupCount: groups.length,
          _groupSize: group.keys.length,
          _groupItemIndex: group.keys.indexOf(key),
          _groupColorKey: group.colorKey,
          _groupActive: isActiveGroup,
          _kind: 'note',
        })
      }
    }

    const count = flattened.length
    for (let i = count - 1; i >= 0; i -= 1) {
      out.push({
        ...flattened[i],
        _stackIndex: i,
      })
    }
  }

  return out
})

const activeToneDotGroupCards = computed(() => {
  const activeDots = toneDotsForRender.value.filter((dot) => isToneDotGroupActive(dot))
  if (!activeDots.length) return []

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let baseColor = '#ffffff'

  for (const dot of activeDots) {
    const r = toneDotR(dot)
    const rx = dotRx(r)
    const x = toneDotX(dot)
    const y = toneDotY(dot)
    minX = Math.min(minX, x - rx)
    maxX = Math.max(maxX, x + rx)
    minY = Math.min(minY, y - r)
    maxY = Math.max(maxY, y + r)
    if (baseColor === '#ffffff' && dot?.color) baseColor = String(dot.color)
  }

  const padX = 10
  const padY = 6
  const innerLeft = 4
  const innerTop = Number(boardY.value)
  const innerRight = Number(FB_WIDTH) - 4
  const innerBottom = Number(boardY.value) + Number(boardH.value)
  const x = Math.max(innerLeft, minX - padX)
  const y = Math.max(innerTop, minY - padY)
  const right = Math.min(innerRight, maxX + padX)
  const bottom = Math.min(innerBottom, maxY + padY)
  const width = Math.max(26, right - x)
  const height = Math.max(22, bottom - y)

  return [{
    key: 'active-tone-group-card',
    x,
    y,
    width,
    height,
    rx: Math.min(12, height / 2),
    color: baseColor,
    opacity: 0.5,
    strokeOpacity: 0.42,
    strokeWidth: 1.2,
  }]
})

const activeGroupPlayOrderByNoteKey = computed(() => {
  const map = new Map()
  const scope = String(settings.playOrderScope || 'song')
  const activeColor = String(settings.activeDotGroupColor || '').trim()
  const sourceEntries =
    scope === 'dotgroup' && activeColor
      ? timelineNoteEntries.value.filter(
        (entry) => String(entry?.note?.color || '').trim() === activeColor,
      )
      : timelineNoteEntries.value
  let order = 0
  let lastStartMs = NaN
  for (const entry of sourceEntries) {
    const key = String(entry?.key || '')
    const startMs = Number(entry?.startMs)
    if (!key || !Number.isFinite(startMs)) continue
    if (!Number.isFinite(lastStartMs) || Math.abs(startMs - lastStartMs) > 1e-6) {
      order += 1
      lastStartMs = startMs
    }
    map.set(key, order)
  }
  return map
})

const activeGroupFingeringByNoteKey = computed(() => {
  const entries = toneDotsForRender.value
    .filter((dot) => isToneDotGroupActive(dot) && dot?._noteKey != null)
    .map((dot) => ({
      key: String(dot._noteKey),
      fret: Number(dot?.fret) || 0,
    }))

  const fretted = [...new Set(entries.map((item) => item.fret).filter((fret) => fret > 0))].sort((a, b) => a - b)
  const minFret = fretted[0] ?? 0
  const map = new Map()

  for (const item of entries) {
    if (item.fret <= 0) {
      map.set(item.key, '0')
      continue
    }
    const finger = Math.max(1, Math.min(4, (item.fret - minFret) + 1))
    map.set(item.key, String(finger))
  }

  return map
})

const noteByKey = computed(() => {
  const m = new Map()
  for (const n of store.activeNotes) {
    const k = String(n?.key ?? '')
    if (!k) continue
    m.set(k, n)
  }
  return m
})

const notesAtPlayhead = computed(() => {
  const t = Number(playheadMs.value)
  if (!Number.isFinite(t)) return []
  const entries = timelineNoteEntries.value
  if (!entries.length) return []

  // Binary-search first event that starts after current playhead, then scan around it.
  let lo = 0
  let hi = entries.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (entries[mid].startMs <= t) lo = mid + 1
    else hi = mid
  }
  const out = []
  for (let i = Math.max(0, lo - 8); i < Math.min(entries.length, lo + 8); i += 1) {
    const entry = entries[i]
    if (t >= entry.startMs && t < entry.endMs) out.push(entry.note)
  }
  return out
})

const currentChordSourceNotes = computed(() => {
  const selected = Array.isArray(selection.selectedNoteKeys) ? selection.selectedNoteKeys : []
  if (selected.length >= 2) {
    return selected.map((k) => noteByKey.value.get(String(k))).filter(Boolean)
  }
  return notesAtPlayhead.value
})

function normalizePitchClassName(pc) {
  const names = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
  return names[((pc % 12) + 12) % 12]
}

function detectChordNameFromPitchClasses(pitchClasses) {
  if (!(pitchClasses instanceof Set) || pitchClasses.size < 2) return ''
  const pcs = Array.from(pitchClasses).map((n) => ((Number(n) % 12) + 12) % 12)
  const pcSet = new Set(pcs)
  const patterns = [
    { suffix: '', intervals: [0, 4, 7] },
    { suffix: 'm', intervals: [0, 3, 7] },
    { suffix: 'dim', intervals: [0, 3, 6] },
    { suffix: 'aug', intervals: [0, 4, 8] },
    { suffix: 'sus2', intervals: [0, 2, 7] },
    { suffix: 'sus4', intervals: [0, 5, 7] },
    { suffix: '7', intervals: [0, 4, 7, 10] },
    { suffix: 'maj7', intervals: [0, 4, 7, 11] },
    { suffix: 'm7', intervals: [0, 3, 7, 10] },
  ]

  for (const root of pcs) {
    for (const p of patterns) {
      if (p.intervals.length > pcSet.size) continue
      const ok = p.intervals.every((iv) => pcSet.has((root + iv) % 12))
      if (!ok) continue
      return `${normalizePitchClassName(root)}${p.suffix}`
    }
  }

  return pcs.map(normalizePitchClassName).join('-')
}

const detectedChordLabel = computed(() => {
  const notes = currentChordSourceNotes.value
  if (!Array.isArray(notes) || notes.length < 2) return '—'
  const pcs = new Set()
  for (const n of notes) {
    const midi = midiForFretString(
      { fret: Number(n?.fret), string: Number(n?.string) },
      tuning.value,
    )
    if (!Number.isFinite(Number(midi))) continue
    pcs.add(Number(midi) % 12)
  }
  const name = detectChordNameFromPitchClasses(pcs)
  return name || '—'
})

function shapePositionsFromNotes(notes) {
  const seen = new Set()
  const out = []
  for (const n of notes) {
    const string = Number(n?.string)
    const fret = Number(n?.fret)
    if (!Number.isFinite(string) || !Number.isFinite(fret)) continue
    const key = `${string}-${fret}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ string, fret })
  }
  out.sort((a, b) => a.string - b.string)
  return out
}

const currentShapePositions = computed(() => shapePositionsFromNotes(currentChordSourceNotes.value))
const canSaveCurrentShape = computed(() => currentShapePositions.value.length >= 2)
const selectedShape = computed(
  () => savedShapes.value.find((s) => String(s?.id) === String(selectedShapeId.value)) ?? null,
)

function persistChordShapes() {
  try {
    localStorage.setItem(CHORD_SHAPES_STORAGE_KEY, JSON.stringify(savedShapes.value))
  } catch {
    // ignore persistence errors
  }
}

function loadChordShapes() {
  try {
    const raw = localStorage.getItem(CHORD_SHAPES_STORAGE_KEY)
    const parsed = JSON.parse(String(raw || '[]'))
    savedShapes.value = Array.isArray(parsed) ? parsed : []
  } catch {
    savedShapes.value = []
  }
}

function saveCurrentShape() {
  if (!canSaveCurrentShape.value) return
  const chord =
    detectedChordLabel.value && detectedChordLabel.value !== '—'
      ? detectedChordLabel.value
      : t('fretboardShow.shape')
  const stamp = new Date().toISOString().slice(11, 19)
  const id = `shape_${Date.now()}`
  const name = `${chord} ${stamp}`
  const shape = {
    id,
    name,
    chord,
    positions: currentShapePositions.value,
    createdAt: Date.now(),
  }
  savedShapes.value = [shape, ...savedShapes.value].slice(0, FRETBOARD_SHAPES.maxSavedShapes)
  selectedShapeId.value = id
  persistChordShapes()
}

function applySelectedShape() {
  if (!props.editable) return
  const shape = selectedShape.value
  if (!shape?.positions?.length) return
  let firstKey = null
  for (const pos of shape.positions) {
    const added = store.addNote(`${Number(pos.fret)}-${Number(pos.string)}`)
    if (!firstKey && added?.key) firstKey = String(added.key)
  }
  if (firstKey) selection.selectNote(firstKey)
}

function deleteSelectedShape() {
  const id = String(selectedShapeId.value || '')
  if (!id) return
  savedShapes.value = savedShapes.value.filter((s) => String(s?.id) !== id)
  selectedShapeId.value = savedShapes.value[0]?.id ? String(savedShapes.value[0].id) : ''
  persistChordShapes()
}

function selectedMovableNotes({ includeKey = '' } = {}) {
  const keysRaw = Array.isArray(selection.selectedNoteKeys) ? selection.selectedNoteKeys : []
  const keys = keysRaw.map((k) => String(k)).filter(Boolean)
  const include = String(includeKey || '')
  const hasInclude = include ? keys.includes(include) : false
  const baseKeys = hasInclude ? keys : include ? [include] : keys
  const out = []
  const seen = new Set()
  for (const key of baseKeys) {
    if (seen.has(key)) continue
    seen.add(key)
    const n = noteByKey.value.get(key)
    if (n) out.push({ key, note: n })
  }
  return out
}

const canNudgeSelection = computed(() => props.editable && selectedMovableNotes().length > 0)

function nudgeSelection(deltaFret, deltaString) {
  if (!props.editable) return
  const items = selectedMovableNotes()
  if (!items.length) return
  const maxFret = Math.max(0, Number(props.numFrets) || 12)
  const maxString = Math.max(1, Number(instrument.numStrings) || 6)
  const updates = items.map(({ key, note }) => {
    const fret = clamp((Number(note?.fret) || 0) + Number(deltaFret || 0), 0, maxFret)
    const string = clamp((Number(note?.string) || 1) + Number(deltaString || 0), 1, maxString)
    return { key, fret, string }
  })
  store.setManyPositions(updates)
}

function clamp01(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(1, n))
}

function almostInteger(v, eps = 1e-6) {
  const n = Number(v)
  if (!Number.isFinite(n)) return false
  return Math.abs(n - Math.round(n)) <= eps
}

function inferredAccentFromGrid(note) {
  const gi = Number(note?.gridIndex)
  if (!Number.isFinite(gi) || gi <= 0) return 0.6

  const beatBottom = Number(settings.beatBottom) || 4
  const beatTop = Number(settings.beatTop) || 4
  const blocksPerBeat = 4 / ([1, 2, 4, 8].includes(beatBottom) ? beatBottom : 4)
  const blocksPerBar = Math.max(1, beatTop * blocksPerBeat)
  const block0 = gi - 1
  const withinBar = ((block0 % blocksPerBar) + blocksPerBar) % blocksPerBar

  if (almostInteger(withinBar)) {
    if (Math.round(withinBar) === 0) return 1
    if (almostInteger(withinBar / blocksPerBeat)) return 0.78
  }
  return 0.58
}

const dynamicByNoteKey = computed(() => {
  const out = new Map()
  for (const note of store.activeNotes) {
    const key = String(note?.key ?? '')
    if (!key) continue

    const rawVelocity = Number(note?.velocity)
    let dyn = 0
    if (Number.isFinite(rawVelocity)) {
      // Accept either MIDI velocity 1..127 or normalized 0..1.
      dyn = rawVelocity > 1 ? rawVelocity / 127 : rawVelocity
      dyn = clamp01(dyn)
    } else {
      // Fallback if no explicit velocity exists: derive simple accent from bar/beat position.
      dyn = inferredAccentFromGrid(note)
    }

    out.set(key, dyn)
  }
  return out
})

const renderedToneDotByNoteKey = computed(() => {
  const m = new Map()
  for (const d of toneDotsForRender.value) {
    const k = noteKeyForToneDot(d)
    if (!k) continue
    if (!m.has(k)) m.set(k, d)
  }
  return m
})

function pulseAmountForNoteKey(noteKey) {
  const key = String(noteKey || '')
  if (!key) return 0
  const startedAt = Number(pulseStartedAtByNoteKey.value.get(key))
  if (!Number.isFinite(startedAt)) return 0
  const dt = animNowMs.value - startedAt
  const PULSE_MS = FRETBOARD_SHOW_DOT_PULSE_MS
  if (!(dt >= 0 && dt <= PULSE_MS)) return 0
  const p = dt / PULSE_MS
  return Math.sin(Math.PI * p)
}

const nowMarkers = computed(() => {
  const keys = Array.from(highlightedNoteKeySet.value || [])
  if (!keys.length) return []

  const byString = new Map()
  for (const key of keys) {
    const dot = renderedToneDotByNoteKey.value.get(String(key))
    if (!dot) continue
    const s = Number(dot?.string)
    if (!Number.isFinite(s)) continue
    const prev = byString.get(s)
    const idx = Number(dot?._stackIndex)
    const prevIdx = Number(prev?.dot?._stackIndex)
    if (!prev || (Number.isFinite(idx) && Number.isFinite(prevIdx) && idx < prevIdx)) {
      byString.set(s, { key: String(key), dot })
    }
  }

  const out = []
  for (const { key, dot } of byString.values()) {
    const pulse = pulseAmountForNoteKey(key)
    const x = toneDotX(dot)
    const y = toneDotY(dot)
    const color = toneDotFill(dot)
    out.push({
      noteKey: key,
      x,
      y,
      color,
      crossHalf: 17 + pulse * 4,
      ringR: toneDotR(dot) + 6 + pulse * 3,
      lineOpacity: 0.2 + pulse * 0.22,
    })
  }
  return out
})

const sortedNotesByStart = computed(() => {
  const items = Array.isArray(store.activeNotes) ? [...store.activeNotes] : []
  items.sort((a, b) => {
    const ga = Number(a?.gridIndex) || 0
    const gb = Number(b?.gridIndex) || 0
    if (ga !== gb) return ga - gb
    const ta = Number(a?.placedAtMs) || 0
    const tb = Number(b?.placedAtMs) || 0
    if (ta !== tb) return ta - tb
    return String(a?.key ?? '').localeCompare(String(b?.key ?? ''))
  })
  return items
})

function playbackStartMsForNote(note) {
  const gridIndex = Number(note?.gridIndex)
  if (!Number.isFinite(gridIndex)) return NaN

  const baseStartMs = gridIndexToStartMs(gridIndex, DEFAULT_TIME_PER_BLOCK_MS)
  if (!settings.shuffleEnabled) return baseStartMs
  if (normalizeNoteValue(note?.noteValue) !== '1/8') return baseStartMs
  if (Number(note?.subdivision) === 3) return baseStartMs

  const beatBottomRaw = Number.parseInt(String(settings.beatBottom), 10)
  const beatBottomSafe = [1, 2, 4, 8].includes(beatBottomRaw) ? beatBottomRaw : 4
  const blocksPerBeat = 4 / beatBottomSafe
  if (!(blocksPerBeat > 0)) return baseStartMs

  const blockStart = gridIndex - 1
  const withinBeat = ((blockStart % blocksPerBeat) + blocksPerBeat) % blocksPerBeat
  const offbeatPos = blocksPerBeat * 0.5
  if (Math.abs(withinBeat - offbeatPos) > 1e-3) return baseStartMs

  const msPerBeat = DEFAULT_TIME_PER_BLOCK_MS * blocksPerBeat
  return baseStartMs + msPerBeat / 6
}

const noteStartMsByKey = computed(() => {
  const m = new Map()
  for (const n of sortedNotesByStart.value) {
    const key = String(n?.key ?? '')
    if (!key) continue
    const startMs = playbackStartMsForNote(n)
    if (!Number.isFinite(startMs)) continue
    m.set(key, startMs)
  }
  return m
})

const nextNoteKeyByKey = computed(() => {
  const notes = sortedNotesByStart.value
  const out = new Map()
  for (let i = 0; i < notes.length; i++) {
    const current = notes[i]
    const currentKey = String(current?.key ?? '')
    if (!currentKey) continue
    const currentStart = noteStartMsByKey.value.get(currentKey)
    if (!Number.isFinite(currentStart)) continue

    let nextKey = null
    for (let j = i + 1; j < notes.length; j++) {
      const candidateKey = String(notes[j]?.key ?? '')
      if (!candidateKey) continue
      const candidateStart = noteStartMsByKey.value.get(candidateKey)
      if (!Number.isFinite(candidateStart)) continue
      if (candidateStart > currentStart) {
        nextKey = candidateKey
        break
      }
    }
    if (nextKey) out.set(currentKey, nextKey)
  }
  return out
})

const playbackTravelLine = computed(() => {
  if (!isPlaying.value) return null

  const idx = playbackTimelineIndex.value
  const fromKey = idx >= 0 ? String(timelineNoteEntries.value[idx]?.key || '') : ''
  if (!fromKey) {
    const nowMs = Number(playheadMs.value)
    const nextEntry = timelineNoteEntries.value.find((entry) => Number(entry?.startMs) >= nowMs)
    const toKey = String(nextEntry?.key || '')
    if (!toKey) return null

    const toDot = renderedToneDotByNoteKey.value.get(toKey)
    const toNote = noteByKey.value.get(toKey)
    if (!toDot || !toNote) return null

    const leadInStartedAtMs = Number(playbackLeadInStartedAtMs.value)
    if (!(leadInStartedAtMs > 0)) return null
    const progress = Math.min(
      1,
      Math.max(0, (animNowMs.value - leadInStartedAtMs) / PLAYBACK_START_LEAD_IN_MS),
    )
    const xTarget = toneDotX(toDot)
    const yTarget = toneDotY(toDot)

    const targetFret = Math.max(0, Number(toNote?.fret) || 0)
    const lines = fretLinesPx.value
    const fretFieldWidth =
      targetFret <= 0
        ? Math.max(18, Number(lines[1] ?? lines[0] ?? FB_WIDTH) - NUT_WIDTH)
        : Number(lines[targetFret] ?? FB_WIDTH) -
          Number(targetFret === 1 ? NUT_WIDTH : (lines[targetFret - 1] ?? NUT_WIDTH))
    const segmentLength = Math.max(16, fretFieldWidth * 0.95)
    const leadDistance = Math.max(segmentLength * 1.35, fretFieldWidth * 1.6)
    const xStart = xTarget + (isLeftHanded.value ? -leadDistance : leadDistance)
    const yStart = yTarget
    const dx = xTarget - xStart
    const dy = yTarget - yStart
    const distance = Math.hypot(dx, dy)
    if (!(distance > 0)) return null

    const clampedSegmentLength = Math.min(distance, segmentLength)
    const ux = dx / distance
    const uy = dy / distance
    const headTravel = Math.max(0, distance - clampedSegmentLength)
    const headX = xStart + ux * (clampedSegmentLength + headTravel * progress)
    const headY = yStart + uy * (clampedSegmentLength + headTravel * progress)
    const x1 = headX - ux * clampedSegmentLength
    const y1 = headY - uy * clampedSegmentLength
    const x2 = headX
    const y2 = headY
    const absJump = Math.abs(Number(toNote?.fret) || 0)
    const color = toneDotFill(toDot)
    const strokeWidth = Math.min(7.5, 2.6 + absJump * 0.55)
    const filter =
      absJump >= 4
        ? FRETBOARD_THEME.playbackTravel.highJumpFilter
        : FRETBOARD_THEME.playbackTravel.normalFilter
    const opacity = 0.6 + progress * 0.4
    const strokeDasharray = 'none'

    return { x1, y1, x2, y2, color, strokeWidth, filter, opacity, strokeDasharray }
  }

  const toKey = nextNoteKeyByKey.value.get(fromKey)
  if (!toKey) return null

  const fromDot = renderedToneDotByNoteKey.value.get(fromKey)
  const toDot = renderedToneDotByNoteKey.value.get(toKey)
  if (!fromDot || !toDot) return null

  const fromNote = noteByKey.value.get(fromKey)
  const toNote = noteByKey.value.get(toKey)
  const sameString = Number(fromNote?.string) === Number(toNote?.string)
  const sameFret = Number(fromNote?.fret) === Number(toNote?.fret)
  if (sameString && sameFret) return null

  const startMs = Number(noteStartMsByKey.value.get(fromKey))
  const endMs = Number(noteStartMsByKey.value.get(toKey))
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null

  const spanMs = endMs - startMs
  if (!(spanMs > 0)) return null

  const nowMs = Number(playheadMs.value)
  const p = Number.isFinite(nowMs) ? (nowMs - startMs) / spanMs : 0
  const progress = Math.min(1, Math.max(0, p))

  const x1 = toneDotX(fromDot)
  const y1 = toneDotY(fromDot)
  const xTarget = toneDotX(toDot)
  const yTarget = toneDotY(toDot)
  const x2 = x1 + (xTarget - x1) * progress
  const y2 = y1 + (yTarget - y1) * progress
  const deltaFret = Number(toNote?.fret || 0) - Number(fromNote?.fret || 0)
  const deltaString = Number(toNote?.string || 0) - Number(fromNote?.string || 0)
  const absJump = Math.abs(deltaFret) + Math.abs(deltaString)
  const color = toneDotFill(toDot)
  const strokeWidth = Math.min(7.5, 2.6 + absJump * 0.55)
  const filter =
    absJump >= 4
      ? FRETBOARD_THEME.playbackTravel.highJumpFilter
      : FRETBOARD_THEME.playbackTravel.normalFilter

  return { x1, y1, x2, y2, color, strokeWidth, filter, opacity: 1, strokeDasharray: 'none' }
})

const directionPreviewSegments = computed(() => {
  if (isPlaying.value) return []
  const preview = directionPreview.value
  const keys = Array.isArray(preview?.noteKeys) ? preview.noteKeys : []
  if (keys.length < 2) return []
  const startedAt = Number(preview?.startedAtMs)
  const durationMs = Number(preview?.durationMs)
  if (!Number.isFinite(startedAt) || !Number.isFinite(durationMs) || durationMs <= 0) return []

  const dt = animNowMs.value - startedAt
  if (!(dt >= 0 && dt <= durationMs)) return []
  const fade = 1 - dt / durationMs
  const fadeOpacity = Math.max(0, Math.min(1, 0.85 * fade))
  const segmentCount = keys.length - 1
  const segmentDurationMs = durationMs / segmentCount
  const activeSegmentIndex = Math.min(segmentCount - 1, Math.floor(dt / segmentDurationMs))
  const activeSegmentElapsedMs = dt - activeSegmentIndex * segmentDurationMs
  const activeProgress = Math.max(0, Math.min(1, activeSegmentElapsedMs / segmentDurationMs))

  const out = []
  for (let i = 0; i < segmentCount; i += 1) {
    const fromKey = String(keys[i] || '')
    const toKey = String(keys[i + 1] || '')
    if (!fromKey || !toKey) continue
    const fromDot = renderedToneDotByNoteKey.value.get(fromKey)
    const toDot = renderedToneDotByNoteKey.value.get(toKey)
    const fromNote = noteByKey.value.get(fromKey)
    const toNote = noteByKey.value.get(toKey)
    if (!fromDot || !toDot || !fromNote || !toNote) continue

    const sameString = Number(fromNote?.string) === Number(toNote?.string)
    const sameFret = Number(fromNote?.fret) === Number(toNote?.fret)
    if (sameString && sameFret) continue

    const deltaFret = Number(toNote?.fret || 0) - Number(fromNote?.fret || 0)
    const deltaString = Number(toNote?.string || 0) - Number(fromNote?.string || 0)
    const absJump = Math.abs(deltaFret) + Math.abs(deltaString)
    const color = toneDotFill(toDot)

    const xStart = toneDotX(fromDot)
    const yStart = toneDotY(fromDot)
    const xEnd = toneDotX(toDot)
    const yEnd = toneDotY(toDot)

    const isCompleted = i < activeSegmentIndex
    const isActive = i === activeSegmentIndex
    if (!isCompleted && !isActive) continue

    const x2 = isActive ? xStart + (xEnd - xStart) * activeProgress : xEnd
    const y2 = isActive ? yStart + (yEnd - yStart) * activeProgress : yEnd

    out.push({
      fromKey,
      toKey,
      x1: xStart,
      y1: yStart,
      x2,
      y2,
      color,
      opacity: isActive ? Math.max(0.55, fadeOpacity) : Math.max(0.18, fadeOpacity * 0.45),
      strokeWidth: Math.min(6.5, (isActive ? 2.6 : 1.8) + absJump * 0.45),
      filter:
        absJump >= 4
          ? FRETBOARD_THEME.playbackTravel.highJumpFilter
          : FRETBOARD_THEME.playbackTravel.normalFilter,
    })
  }

  return out
})

const idleConnectionSegments = computed(() => {
  if (isPlaying.value) return []
  if (!settings.idleDotConnectionsVisible) return []
  const opacity = Math.min(1, Math.max(0, Number(settings.idleDotConnectionsOpacity) || 0))
  if (opacity <= 0) return []

  const entries = timelineNoteEntries.value
  if (entries.length < 2) return []

  const out = []
  for (let i = 1; i < entries.length; i += 1) {
    const prev = entries[i - 1]
    const curr = entries[i]
    const fromKey = String(prev?.key || '')
    const toKey = String(curr?.key || '')
    if (!fromKey || !toKey) continue
    if (fromKey === toKey) continue

    const fromDot = renderedToneDotByNoteKey.value.get(fromKey)
    const toDot = renderedToneDotByNoteKey.value.get(toKey)
    const fromNote = noteByKey.value.get(fromKey)
    const toNote = noteByKey.value.get(toKey)
    if (!fromDot || !toDot || !fromNote || !toNote) continue

    const sameString = Number(fromNote?.string) === Number(toNote?.string)
    const sameFret = Number(fromNote?.fret) === Number(toNote?.fret)
    if (sameString && sameFret) continue

    const deltaFret = Number(toNote?.fret || 0) - Number(fromNote?.fret || 0)
    const deltaString = Number(toNote?.string || 0) - Number(fromNote?.string || 0)
    const absJump = Math.abs(deltaFret) + Math.abs(deltaString)

    out.push({
      fromKey,
      toKey,
      x1: toneDotX(fromDot),
      y1: toneDotY(fromDot),
      x2: toneDotX(toDot),
      y2: toneDotY(toDot),
      color: '#ffffff',
      opacity,
      strokeWidth: Math.min(3.2, 1 + absJump * 0.2),
    })
  }
  return out
})

const playbackSelfLoop = computed(() => {
  if (!isPlaying.value) return null

  const idx = playbackTimelineIndex.value
  const fromKey = idx >= 0 ? String(timelineNoteEntries.value[idx]?.key || '') : ''
  if (!fromKey) return null

  const toKey = nextNoteKeyByKey.value.get(fromKey)
  if (!toKey) return null

  const fromDot = renderedToneDotByNoteKey.value.get(fromKey)
  const toDot = renderedToneDotByNoteKey.value.get(toKey)
  if (!fromDot || !toDot) return null

  const fromNote = noteByKey.value.get(fromKey)
  const toNote = noteByKey.value.get(toKey)
  const sameString = Number(fromNote?.string) === Number(toNote?.string)
  const sameFret = Number(fromNote?.fret) === Number(toNote?.fret)
  if (!(sameString && sameFret)) return null

  const startMs = Number(noteStartMsByKey.value.get(fromKey))
  const endMs = Number(noteStartMsByKey.value.get(toKey))
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null
  const spanMs = endMs - startMs
  if (!(spanMs > 0)) return null

  const nowMs = Number(playheadMs.value)
  const p = Number.isFinite(nowMs) ? (nowMs - startMs) / spanMs : 0
  const progress = Math.min(1, Math.max(0, p))

  const x = toneDotX(fromDot)
  const y = toneDotY(fromDot)
  const r = 8
  const cx = x + 14
  const cy = y - 16
  const color = toneDotFill(toDot)
  const circumference = 2 * Math.PI * r
  const dasharray = `${Math.max(0.001, circumference * progress)} ${circumference}`
  const dashoffset = `${circumference * 0.25}`
  const angle = -Math.PI / 2 + progress * 2 * Math.PI
  const headX = cx + Math.cos(angle) * r
  const headY = cy + Math.sin(angle) * r

  // Short connector from loop towards the original tone position.
  const x1 = cx - r * 0.25
  const y1 = cy + r * 0.95
  const x2 = x1 + (x + 1 - x1) * progress
  const y2 = y1 + (y - 2 - y1) * progress

  return { cx, cy, r, x1, y1, x2, y2, color, dasharray, dashoffset, headX, headY }
})

const nextNotePreviewDot = computed(() => {
  if (!isPlaying.value) return null
  const latestPulse = Array.isArray(pulseStarts.value) ? pulseStarts.value[0] : null
  if (!String(latestPulse?.key || '')) return null
  const idx = playbackTimelineIndex.value
  const fromKey = idx >= 0 ? String(timelineNoteEntries.value[idx]?.key || '') : ''
  if (!fromKey) return null
  const toKey = nextNoteKeyByKey.value.get(fromKey)
  if (!toKey) return null
  return renderedToneDotByNoteKey.value.get(toKey) ?? null
})

const leadInPreviewDot = computed(() => {
  if (!isPlaying.value) return null
  const latestPulse = Array.isArray(pulseStarts.value) ? pulseStarts.value[0] : null
  const hasPulse = Boolean(String(latestPulse?.key || ''))
  if (hasPulse) return null

  const nowMs = Number(playheadMs.value)
  const nextEntry =
    timelineNoteEntries.value.find((entry) => Number(entry?.startMs) >= nowMs) ??
    timelineNoteEntries.value[0]
  const toKey = String(nextEntry?.key || '')
  if (!toKey) return null
  return renderedToneDotByNoteKey.value.get(toKey) ?? null
})

const currentTimelineNoteKey = computed(() => {
  const idx = playbackTimelineIndex.value
  if (idx < 0) return ''
  return String(timelineNoteEntries.value[idx]?.key || '')
})

const firstTimelineNoteKey = computed(() => String(timelineNoteEntries.value[0]?.key || ''))

const activePlaybackColorKey = computed(() => {
  let noteKey = ''

  if (isPlaying.value) {
    const latestPulse = Array.isArray(pulseStarts.value) ? pulseStarts.value[0] : null
    noteKey = latestPulse?.key ? String(latestPulse.key) : ''
    if (!noteKey) noteKey = String(currentTimelineNoteKey.value || '')
    if (!noteKey) noteKey = String(firstTimelineNoteKey.value || '')
  } else if (Number(playheadMs.value) > 0) {
    noteKey = String(currentTimelineNoteKey.value || '')
  }

  if (!noteKey) return ''
  return toneDotColorKeyForNote(noteByKey.value.get(noteKey))
})

const activePreviewColorKey = computed(() => {
  if (isPlaying.value) return ''
  const preview = directionPreview.value
  const keys = Array.isArray(preview?.noteKeys) ? preview.noteKeys.map((k) => String(k || '')).filter(Boolean) : []
  if (keys.length < 2) return ''

  const startedAt = Number(preview?.startedAtMs)
  const durationMs = Number(preview?.durationMs)
  if (!Number.isFinite(startedAt) || !Number.isFinite(durationMs) || durationMs <= 0) return ''

  const dt = animNowMs.value - startedAt
  if (!(dt >= 0 && dt <= durationMs)) return ''

  const segmentCount = keys.length - 1
  const segmentDurationMs = durationMs / segmentCount
  const activeSegmentIndex = Math.min(segmentCount - 1, Math.floor(dt / segmentDurationMs))
  const toKey = String(keys[activeSegmentIndex + 1] || '')
  if (!toKey) return ''
  return toneDotColorKeyForNote(noteByKey.value.get(toKey))
})

const activeStackColorKey = computed(() => {
  if (isPlaying.value) return String(activePlaybackColorKey.value || '')
  if (String(settings.activeDotGroupColor || '').trim()) return String(settings.activeDotGroupColor || '')
  if (Number(playheadMs.value) > 0) return String(activePlaybackColorKey.value || '')
  return String(activePreviewColorKey.value || '')
})

const toneDotByPosKey = computed(() => {
  const m = new Map()
  for (const d of toneDotsForRender.value) {
    const key = `${Number(d.string)}-${Number(d.fret)}`
    // Pick DotQueue front (center) for show-mode selection.
    const prev = m.get(key)
    const i = Number(d?._stackIndex)
    const pi = Number(prev?._stackIndex)
    if (!prev || (Number.isFinite(i) && Number.isFinite(pi) && i < pi)) m.set(key, d)
  }
  return m
})

const hoveredFret = ref(null)
const hoveredPosKey = ref(null)
const hoveredToneDotKey = ref(null)

const hoveredPreviewToneDot = computed(() => {
  if (!props.editable) return null
  if (dragState.value?.active) return null
  const key = hoveredPosKey.value
  if (!key) return null
  if (toneDotByPosKey.value.get(key)) return null
  const [stringRaw, fretRaw] = String(key).split('-')
  const string = Number(stringRaw)
  const fret = Number(fretRaw)
  if (!Number.isFinite(string) || !Number.isFinite(fret)) return null
  return { string, fret }
})

const dragPreviewToneDot = computed(() => {
  if (!props.editable) return null
  const s = dragState.value
  if (!s?.active) return null
  const t = s?.target
  const string = Number(t?.string)
  const fret = Number(t?.fret)
  if (!Number.isFinite(string) || !Number.isFinite(fret)) return null
  const noteKey = s?.noteKey != null ? String(s.noteKey) : null
  if (!noteKey) return null
  return { string, fret, _noteKey: noteKey, _stackCount: 1, _stackIndex: 0 }
})

const tooltip = ref({ visible: false, x: 0, y: 0, text: '' })
const toneDotContextMenu = ref({
  open: false,
  x: 0,
  y: 0,
  posKey: '',
  string: 0,
  fret: 0,
  items: [],
})
const textDragState = ref({
  active: false,
  pointerId: null,
  itemId: '',
})
const textResizeState = ref({
  active: false,
  pointerId: null,
  itemId: '',
  startClientX: 0,
  startClientY: 0,
  startWidthPct: 32,
  startHeightPct: 18,
})
const openTextColorMenuId = ref('')

function clampPercent(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, n))
}

function overlayClientToPercent(clientX, clientY) {
  const rect = overlayEl.value?.getBoundingClientRect?.()
  if (!rect) return null
  if (!(rect.width > 0) || !(rect.height > 0)) return null
  const rawXPct = clampPercent(((Number(clientX) - rect.left) / rect.width) * 100)
  const xPct = displayPercent(rawXPct)
  const yPct = clampPercent(((Number(clientY) - rect.top) / rect.height) * 100)
  return { xPct, yPct }
}

const blocksPerBar = computed(() => {
  const top = Number.parseInt(String(settings.beatTop), 10)
  const bottom = Number.parseInt(String(settings.beatBottom), 10)
  const safeTop = Number.isFinite(top) && top > 0 ? top : 4
  const safeBottom = [1, 2, 4, 8].includes(bottom) ? bottom : 4
  return Math.max(1, safeTop * (4 / safeBottom))
})

const currentPlayheadGridIndex = computed(() => {
  const t = Number(playheadMs.value)
  if (!Number.isFinite(t) || t < 0) return 1
  return t / DEFAULT_TIME_PER_BLOCK_MS + 1
})

const renderedTextItems = computed(() => {
  const currentGrid = Number(currentPlayheadGridIndex.value) || 1
  return (Array.isArray(textItems.value) ? textItems.value : [])
    .map((item) => {
      const start = Number(item?.gridIndex) || 1
      const len = Math.max(1, Number(item?.lengthBlocks) || Number(blocksPerBar.value) || 1)
      const isActiveNow = currentGrid >= start && currentGrid < start + len
      return { ...item, isActiveNow }
    })
    .filter((item) => (isCommentMode.value && !isPlaying.value) || item.isActiveNow)
})

function onTextItemInput(id, event) {
  const text = String(event?.target?.value ?? '')
  overlay.updateTextItemText(id, text)
}

function onTextItemDelete(id) {
  overlay.removeTextItem(id)
  if (openTextColorMenuId.value === String(id || '')) openTextColorMenuId.value = ''
}

function stopTextDrag() {
  if (!textDragState.value.active) return
  textDragState.value = { active: false, pointerId: null, itemId: '' }
  window.removeEventListener('pointermove', onTextItemDragMove)
  window.removeEventListener('pointerup', onTextItemDragEnd)
  window.removeEventListener('pointercancel', onTextItemDragEnd)
}

function stopTextResize() {
  if (!textResizeState.value.active) return
  textResizeState.value = {
    active: false,
    pointerId: null,
    itemId: '',
    startClientX: 0,
    startClientY: 0,
    startWidthPct: 32,
    startHeightPct: 18,
  }
  window.removeEventListener('pointermove', onTextItemResizeMove)
  window.removeEventListener('pointerup', onTextItemResizeEnd)
  window.removeEventListener('pointercancel', onTextItemResizeEnd)
}

function onTextItemDragMove(event) {
  const state = textDragState.value
  if (!state.active || event.pointerId !== state.pointerId) return
  const p = overlayClientToPercent(event.clientX, event.clientY)
  if (!p) return
  overlay.updateTextItemPosition(state.itemId, p)
}

function onTextItemDragEnd(event) {
  const state = textDragState.value
  if (!state.active || event.pointerId !== state.pointerId) return
  stopTextDrag()
}

function onTextItemResizeMove(event) {
  const state = textResizeState.value
  if (!state.active || event.pointerId !== state.pointerId) return
  const rect = overlayEl.value?.getBoundingClientRect?.()
  if (!rect || !(rect.width > 0) || !(rect.height > 0)) return
  const dxPct = ((Number(event.clientX) - state.startClientX) / rect.width) * 100
  const dyPct = ((Number(event.clientY) - state.startClientY) / rect.height) * 100
  overlay.updateTextItemSize(state.itemId, {
    widthPct: state.startWidthPct + dxPct,
    heightPct: state.startHeightPct + dyPct,
  })
}

function onTextItemResizeEnd(event) {
  const state = textResizeState.value
  if (!state.active || event.pointerId !== state.pointerId) return
  stopTextResize()
}

function onTextItemDragStart(id, event) {
  if (event.button !== 0) return
  textDragState.value = {
    active: true,
    pointerId: event.pointerId,
    itemId: String(id || ''),
  }
  window.addEventListener('pointermove', onTextItemDragMove)
  window.addEventListener('pointerup', onTextItemDragEnd)
  window.addEventListener('pointercancel', onTextItemDragEnd)
}

function onTextItemResizeStart(id, event, item) {
  if (event.button !== 0) return
  textResizeState.value = {
    active: true,
    pointerId: event.pointerId,
    itemId: String(id || ''),
    startClientX: Number(event.clientX) || 0,
    startClientY: Number(event.clientY) || 0,
    startWidthPct: Number(item?.widthPct) || 32,
    startHeightPct: Number(item?.heightPct) || 18,
  }
  window.addEventListener('pointermove', onTextItemResizeMove)
  window.addEventListener('pointerup', onTextItemResizeEnd)
  window.addEventListener('pointercancel', onTextItemResizeEnd)
}

function onTextItemHeaderPointerDown(id, event) {
  const target = event?.target
  if (target?.closest?.('.fb-text-color-dropdown')) return
  if (target?.closest?.('.fb-text-item-delete')) return
  onTextItemDragStart(id, event)
}

function toggleTextColorMenu(id) {
  const key = String(id || '')
  openTextColorMenuId.value = openTextColorMenuId.value === key ? '' : key
}

function selectTextColor(id, color) {
  overlay.updateTextItemColor(id, color)
  openTextColorMenuId.value = ''
}

function onWindowPointerDownForTextColorMenu(event) {
  const target = event?.target
  if (target?.closest?.('.fb-text-color-dropdown')) return
  openTextColorMenuId.value = ''
}

function removeSelectionKey(noteKey) {
  const key = String(noteKey || '')
  if (!key) return
  if (!selection.isSelected(key)) return
  const keys = Array.isArray(selection.selectedNoteKeys) ? selection.selectedNoteKeys : []
  const next = keys.map((k) => String(k)).filter((k) => k && k !== key)
  if (next.length) selection.setSelectedNotes(next)
  else selection.clearSelection()
}

function promoteToneDotKey(posKey, noteKey) {
  const position = String(posKey || '')
  const key = String(noteKey || '')
  if (!position || !key) return
  const order = dotQueueByPosKey.value.get(position)
  if (!Array.isArray(order) || !order.includes(key) || order[0] === key) return
  const next = new Map(dotQueueByPosKey.value)
  next.set(position, [key, ...order.filter((item) => String(item) !== key)])
  dotQueueByPosKey.value = next
}

function buildToneDotContextItems(posKey) {
  const notes = notesByPosKey.value.get(String(posKey || ''))
  if (!Array.isArray(notes) || !notes.length) return []
  const sorted = [...notes]
  sorted.sort((a, b) => {
    const ta = Number(a?.placedAtMs) || 0
    const tb = Number(b?.placedAtMs) || 0
    if (ta !== tb) return tb - ta
    return String(a?.key ?? '').localeCompare(String(b?.key ?? ''))
  })
  return sorted
    .map((n) => {
      const noteKey = String(n?.key ?? '')
      if (!noteKey) return null
      const grid = Number(n?.gridIndex)
      const length = Number(n?.lengthBlocks)
      const safeLength = Number.isFinite(length) && length > 0 ? length : 1
      const label = Number.isFinite(grid)
        ? t('noteEvent.dragTooltip', {
          grid: grid.toFixed(2),
          length: Math.max(0.01, safeLength).toFixed(2),
        })
        : noteKey
      return { noteKey, label }
    })
    .filter(Boolean)
}

function closeToneDotContextMenu() {
  if (!toneDotContextMenu.value.open) return
  toneDotContextMenu.value = {
    open: false,
    x: 0,
    y: 0,
    posKey: '',
    string: 0,
    fret: 0,
    items: [],
  }
  window.removeEventListener('pointerdown', onGlobalToneDotContextPointerDown, true)
  window.removeEventListener('keydown', onGlobalToneDotContextKeyDown, true)
  window.removeEventListener('resize', closeToneDotContextMenu, true)
  window.removeEventListener('scroll', closeToneDotContextMenu, true)
}

function onGlobalToneDotContextPointerDown(event) {
  const target = event?.target
  if (target?.closest?.('.fb-tone-dot-context-menu')) return
  closeToneDotContextMenu()
}

function onGlobalToneDotContextKeyDown(event) {
  if (event?.key === 'Escape') closeToneDotContextMenu()
}

function onToneDotContextMenu(d, event) {
  if (!noteEditingEnabled.value) return
  const posKey = posKeyForToneDot(d)
  const items = buildToneDotContextItems(posKey)
  if (!items.length) return

  const [stringRaw, fretRaw] = String(posKey || '').split('-')
  const string = Number(stringRaw)
  const fret = Number(fretRaw)
  const margin = 8
  const menuWidth = 290
  const rowHeight = 44
  const menuHeight = 40 + items.length * rowHeight
  const vw = Number(globalThis?.innerWidth) || 0
  const vh = Number(globalThis?.innerHeight) || 0
  const xRaw = Number(event?.clientX) || 0
  const yRaw = Number(event?.clientY) || 0
  const maxX = Math.max(margin, vw - menuWidth - margin)
  const maxY = Math.max(margin, vh - menuHeight - margin)
  const x = Math.max(margin, Math.min(maxX, xRaw))
  const y = Math.max(margin, Math.min(maxY, yRaw))

  toneDotContextMenu.value = {
    open: true,
    x,
    y,
    posKey: String(posKey || ''),
    string: Number.isFinite(string) ? string : 0,
    fret: Number.isFinite(fret) ? fret : 0,
    items,
  }
  window.addEventListener('pointerdown', onGlobalToneDotContextPointerDown, true)
  window.addEventListener('keydown', onGlobalToneDotContextKeyDown, true)
  window.addEventListener('resize', closeToneDotContextMenu, true)
  window.addEventListener('scroll', closeToneDotContextMenu, true)
}

function onSelectToneDotContextItem(noteKey) {
  const selected = melodyInput.selectExistingNote(noteKey)
  if (!selected?.key) return
  promoteToneDotKey(`${Number(selected.string)}-${Number(selected.fret)}`, selected.key)
  closeToneDotContextMenu()
}

function onDeleteToneDotContextItem(noteKey) {
  if (!noteEditingEnabled.value) return
  const key = String(noteKey || '')
  if (!key) return
  store.removeNote(key)
  removeSelectionKey(key)
  hideTooltip()

  const posKey = String(toneDotContextMenu.value.posKey || '')
  if (!posKey) {
    closeToneDotContextMenu()
    return
  }
  const nextItems = buildToneDotContextItems(posKey)
  if (!nextItems.length) {
    closeToneDotContextMenu()
    return
  }
  toneDotContextMenu.value = {
    ...toneDotContextMenu.value,
    items: nextItems,
  }
}

function setTooltipFromEvent(event, text) {
  const rect = rootEl.value?.getBoundingClientRect?.()
  if (!rect) return

  const clientX = Number(event?.clientX)
  const clientY = Number(event?.clientY)
  if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return

  tooltip.value = {
    visible: true,
    x: Math.round(clientX - rect.left + 10),
    y: Math.round(clientY - rect.top - 28),
    text,
  }
}

function hideTooltip() {
  if (!tooltip.value.visible) return
  tooltip.value = { ...tooltip.value, visible: false }
}

function generateFretsPercent({ fretCount, scaleFrets }) {
  const n = Math.max(1, Number(fretCount) || 1)
  const fretRatio = Math.pow(2, 1 / 12)
  const frets = [0]
  for (let i = 1; i <= n; i++) {
    let x = (100 / n) * i
    if (scaleFrets) x = 100 - 100 / Math.pow(fretRatio, i)
    frets.push(x)
  }
  const last = frets[frets.length - 1] || 100
  return frets.map((x) => (x / last) * 100)
}

const fretsPct = computed(() =>
  generateFretsPercent({ fretCount: props.numFrets, scaleFrets: true }),
)
const fretLinesPx = computed(() => fretsPct.value.map((p) => (p / 100) * FB_WIDTH))
const STRING_WIDTH_PROFILES = {
  4: [1.2, 1.6, 2.2, 3.2],
  6: [1.1, 1.25, 1.45, 1.8, 2.05, 3.35],
}

const strings = computed(() => {
  const count = Math.max(2, Number(instrument.numStrings) || 6)
  const profile = STRING_WIDTH_PROFILES[count] || null

  const res = []
  for (let i = 0; i < count; i++) {
    // Visual convention: top string thin, bottom string thick.
    // Use a steeper progression so the lowest string reads clearly as the thickest one.
    // Keep center positions stable (do not shift y based on stroke width).
    const t = i / Math.max(1, count - 1) // 0..1
    const w = profile?.[i] ?? (1.1 + (t ** 1.7) * 1.85)

    const y = (FB_HEIGHT / (count - 1)) * i

    // Our domain model uses 1-based string numbers.
    res.push({ string: i + 1, y, w })
  }
  return res
})

const boardY = computed(() => -BOARD_OVERHANG)
const boardH = computed(() => FB_HEIGHT + BOARD_OVERHANG * 2)
const coreResizableStyle = computed(() => ({ transform: 'none' }))
const STRING_LABEL_SAFE_LEFT_PAD_PX = 28
const RAW_MIN_HEIGHT_PER_WIDTH = Number(FRETBOARD_PANE_CONSTRAINTS.minHeightPerWidth) || (1 / 6)
const RAW_MAX_HEIGHT_PER_WIDTH = Number(FRETBOARD_PANE_CONSTRAINTS.maxHeightPerWidth) || (1 / 3)
const MIN_HEIGHT_PER_WIDTH = Math.min(RAW_MIN_HEIGHT_PER_WIDTH, RAW_MAX_HEIGHT_PER_WIDTH)
const MAX_HEIGHT_PER_WIDTH = Math.max(RAW_MIN_HEIGHT_PER_WIDTH, RAW_MAX_HEIGHT_PER_WIDTH)
const DESKTOP_LAYOUT_PRESET = { uiScale: 1, sidePadLeft: 40, sidePadRight: 10 }
const TABLET_LAYOUT_PRESET = { uiScale: 0.94, sidePadLeft: 28, sidePadRight: 10 }
const MOBILE_LAYOUT_PRESET = { uiScale: 0.86, sidePadLeft: 16, sidePadRight: 8 }

const fretboardLayoutPreset = computed(() => {
  const vw = Number(viewportWidthPx.value) || 0
  if (props.isPhoneView) return MOBILE_LAYOUT_PRESET
  if (vw <= FRETBOARD_LAYOUT_BREAKPOINTS.mobileMax) return MOBILE_LAYOUT_PRESET
  if (vw <= FRETBOARD_LAYOUT_BREAKPOINTS.tabletMax) return TABLET_LAYOUT_PRESET
  return DESKTOP_LAYOUT_PRESET
})

const fretboardCssVars = computed(() => {
  const preset = fretboardLayoutPreset.value
  const sidePadLeft = Math.max(
    STRING_LABEL_SAFE_LEFT_PAD_PX,
    Number(preset?.sidePadLeft ?? 40),
  )
  return {
    '--fb-ui-scale': String(preset?.uiScale ?? 1),
    '--fb-side-pad-left': `${sidePadLeft}px`,
    '--fb-side-pad-right': `${Number(preset?.sidePadRight ?? 10)}px`,
    '--fb-width-clamp': '100%',
    '--fb-gap-px': `${Number(FRETBOARD_UI_TOKENS.gapPx)}px`,
    '--fb-control-h-px': `${Number(FRETBOARD_UI_TOKENS.controlHeightPx)}px`,
    '--fb-font-sm-px': `${Number(FRETBOARD_UI_TOKENS.fontSmallPx)}px`,
    '--fb-top-pad': `${Number(FRETBOARD_UI_TOKENS.topPadPx)}px`,
    '--fb-bottom-pad': `${Number(FRETBOARD_UI_TOKENS.bottomPadPx)}px`,
    '--fb-numbers-height-px': `${Number(FRETBOARD_UI_TOKENS.numbersHeightPx)}px`,
    '--fb-numbers-pad-top-px': `${Number(FRETBOARD_UI_TOKENS.numbersPadTopPx)}px`,
    '--fb-numbers-margin-top': `${Number(FRETBOARD_UI_TOKENS.numbersMarginTopPx)}px`,
    '--fb-numbers-margin-bottom': `${Number(FRETBOARD_UI_TOKENS.numbersMarginBottomPx)}px`,
    '--fb-fret-numbers-block-px': `${
      Number(FRETBOARD_UI_TOKENS.numbersHeightPx || 0) +
      Number(FRETBOARD_UI_TOKENS.numbersPadTopPx || 0) +
      Number(FRETBOARD_UI_TOKENS.numbersMarginTopPx || 0) +
      Number(FRETBOARD_UI_TOKENS.numbersMarginBottomPx || 0)
    }px`,
    '--fb-actions-margin-top': `${Number(FRETBOARD_UI_TOKENS.actionsMarginTopPx)}px`,
    '--fb-actions-margin-bottom': `${Number(FRETBOARD_UI_TOKENS.actionsMarginBottomPx)}px`,
    '--fb-rail-top-pad-px': `${Number(FRETBOARD_UI_TOKENS.railTopPadPx)}px`,
    '--fb-min-height-per-width': String(MIN_HEIGHT_PER_WIDTH),
    '--fb-max-height-per-width': String(MAX_HEIGHT_PER_WIDTH),
    '--fb-stack-min-height-px': `${Math.max(0, Number(stackMinHeightPx.value) || 0)}px`,
    '--fb-stack-max-height-px': `${Math.max(0, Number(stackMaxHeightPx.value) || 0)}px`,
    '--fb-core-min-height-px': `${Math.max(0, Number(coreMinHeightPx.value) || 0)}px`,
    '--fb-core-max-height-px': `${Math.max(0, Number(coreMaxHeightPx.value) || 0)}px`,
    '--fb-playback-travel-line-shadow': FRETBOARD_THEME.css.playbackTravelLineShadow,
    '--fb-now-cross-shadow': FRETBOARD_THEME.css.nowCrossShadow,
    '--fb-now-ring-shadow': FRETBOARD_THEME.css.nowRingShadow,
    '--fb-self-loop-shadow': FRETBOARD_THEME.css.selfLoopShadow,
    '--fb-self-loop-head-shadow': FRETBOARD_THEME.css.selfLoopHeadShadow,
    '--fb-tone-dot-symbol-fill': FRETBOARD_THEME.css.toneDotSymbolFill,
    '--fb-tone-dot-symbol-stroke': FRETBOARD_THEME.css.toneDotSymbolStroke,
    '--fb-tone-dot-pitch-fill': FRETBOARD_THEME.css.toneDotPitchFill,
    '--fb-tone-dot-pitch-stroke': FRETBOARD_THEME.css.toneDotPitchStroke,
    '--fb-next-note-preview-stroke': FRETBOARD_THEME.css.nextNotePreviewStroke,
    '--fb-next-note-preview-shadow': FRETBOARD_THEME.css.nextNotePreviewShadow,
    '--fb-fret-number-color': FRETBOARD_THEME.css.fretNumberColor,
    '--fb-fret-number-shadow': FRETBOARD_THEME.css.fretNumberShadow,
    '--fb-fret-number-marker-color': FRETBOARD_THEME.css.fretNumberMarkerColor,
    '--fb-fret-number-marker-shadow': FRETBOARD_THEME.css.fretNumberMarkerShadow,
    '--fb-tooltip-bg': FRETBOARD_THEME.css.tooltipBg,
    '--fb-tooltip-text': FRETBOARD_THEME.css.tooltipText,
    '--fb-hand-overlay-fill': FRETBOARD_THEME.css.handOverlayFill,
    '--fb-hand-overlay-stroke': FRETBOARD_THEME.css.handOverlayStroke,
    '--fb-hand-overlay-shadow': FRETBOARD_THEME.css.handOverlayShadow,
    '--fb-hand-suggested-fill': FRETBOARD_THEME.css.handSuggestedFill,
    '--fb-hand-suggested-stroke': FRETBOARD_THEME.css.handSuggestedStroke,
    '--fb-hand-suggested-text-fill': FRETBOARD_THEME.css.handSuggestedTextFill,
    '--fb-hand-suggested-text-stroke': FRETBOARD_THEME.css.handSuggestedTextStroke,
    '--fb-hand-info-text': FRETBOARD_THEME.css.handInfoText,
    '--fb-hand-info-warning-text': FRETBOARD_THEME.css.handInfoWarningText,
    '--fb-chord-detected-text': FRETBOARD_THEME.css.chordDetectedText,
    '--fb-chord-detected-bg': FRETBOARD_THEME.css.chordDetectedBg,
    '--fb-chord-detected-border': FRETBOARD_THEME.css.chordDetectedBorder,
    '--fb-chord-detected-shadow': FRETBOARD_THEME.css.chordDetectedShadow,
    '--fb-shape-control-border': FRETBOARD_THEME.css.shapeControlBorder,
    '--fb-shape-control-bg': FRETBOARD_THEME.css.shapeControlBg,
    '--fb-shape-control-text': FRETBOARD_THEME.css.shapeControlText,
    '--fb-shape-danger-border': FRETBOARD_THEME.css.shapeDangerBorder,
    '--fb-shape-danger-text': FRETBOARD_THEME.css.shapeDangerText,
    '--fb-shape-active-border': FRETBOARD_THEME.css.shapeActiveBorder,
    '--fb-shape-active-bg': FRETBOARD_THEME.css.shapeActiveBg,
    '--fb-shape-active-text': FRETBOARD_THEME.css.shapeActiveText,
    '--fb-color-swatch-border': FRETBOARD_THEME.css.colorSwatchBorder,
  }
})

function onViewportResize() {
  viewportWidthPx.value = Number(globalThis?.innerWidth) || 1440
  viewportHeightPx.value = Number(globalThis?.innerHeight) || 900
}

function updateStackMinHeightPx() {
  const w = Number(coreResizableEl.value?.getBoundingClientRect?.().width) || 0
  if (!(w > 0)) return
  const minStackHeight = w * MIN_HEIGHT_PER_WIDTH
  const maxStackHeight = w * MAX_HEIGHT_PER_WIDTH
  const fretNumbersBlockHeight =
    Number(FRETBOARD_UI_TOKENS.numbersHeightPx || 0) +
    Number(FRETBOARD_UI_TOKENS.numbersPadTopPx || 0) +
    Number(FRETBOARD_UI_TOKENS.numbersMarginTopPx || 0) +
    Number(FRETBOARD_UI_TOKENS.numbersMarginBottomPx || 0)
  stackMinHeightPx.value = minStackHeight
  stackMaxHeightPx.value = maxStackHeight
  coreMinHeightPx.value = minStackHeight + fretNumbersBlockHeight
  coreMaxHeightPx.value = maxStackHeight + fretNumbersBlockHeight
}

function updateDotRoundCompensation() {
  const rect = overlayEl.value?.getBoundingClientRect?.()
  const w = Number(rect?.width) || 0
  const h = Number(rect?.height) || 0
  if (!(w > 0) || !(h > 0)) return
  const virtualRatio = Number(FB_WIDTH) / Math.max(1, Number(boardH.value) || 1)
  const actualRatio = w / h
  const compensation = virtualRatio / Math.max(0.0001, actualRatio)
  dotRoundCompX.value = Math.max(0.25, Math.min(4, compensation))
}

function dotRx(radius) {
  return Math.max(0, Number(radius) || 0) * (Number(dotRoundCompX.value) || 1)
}

function dotMidXForFret(fret) {
  const f = Math.max(0, Math.min(Number(fret) || 0, fretsPct.value.length - 1))
  if (f === 0) return 0
  const a = fretsPct.value[f - 1] ?? 0
  const b = fretsPct.value[f] ?? 0
  const mid = b - (b - a) / 2
  return (mid / 100) * FB_WIDTH
}

const inlayDots = computed(() => {
  const inlays = FRETBOARD_INLAYS.frets
  const maxF = Math.max(0, Number(props.numFrets) || 0)
  const inside = inlays.filter((f) => f <= maxF)

  const out = []
  const midY = FB_HEIGHT / 2
  for (const f of inside) {
    const x = dotMidXForFret(f)
    const isDouble = FRETBOARD_INLAYS.doubleFrets.includes(f)
    const r = FRETBOARD_INLAYS.radiusPx
    if (isDouble) {
      out.push({ key: `inlay-${f}-a`, x, y: midY - FRETBOARD_INLAYS.doubleOffsetYPx, r })
      out.push({ key: `inlay-${f}-b`, x, y: midY + FRETBOARD_INLAYS.doubleOffsetYPx, r })
    } else {
      out.push({ key: `inlay-${f}`, x, y: midY, r })
    }
  }
  return out
})

const harmonyGuideDots = computed(() => {
  const useChord = Boolean(showChord.value)
  const useScale = Boolean(showScale.value)
  if (!useChord && !useScale) return []

  const scaleSet =
    useScale && scalePitchClasses.value instanceof Set ? scalePitchClasses.value : new Set()
  const shapePositions = useChord && Array.isArray(activeChordShape.value?.positions)
    ? activeChordShape.value.positions
    : []
  if (!shapePositions.length && !scaleSet.size) return []

  const byKey = new Map()

  for (const pos of shapePositions) {
    const string = Number(pos?.string)
    const fret = Number(pos?.fret)
    if (!Number.isFinite(string) || !Number.isFinite(fret)) continue
    byKey.set(`${string}-${fret}`, {
      string,
      fret,
      inChord: true,
      inScale: false,
      pc: null,
      isRoot: Boolean(pos?.isRoot),
    })
  }

  const fromFret = Math.max(
    0,
    Number(patternFretRange.value?.fromFret) || 0,
    fretViewRange.value.from,
  )
  const toFretRaw = Number(patternFretRange.value?.toFret)
  const toFretByPattern = Number.isFinite(toFretRaw) ? Math.max(fromFret, toFretRaw) : Infinity
  const toFret = Math.min(toFretByPattern, fretViewRange.value.to)

  const maxFret = Math.max(0, Number(props.numFrets) || 12)
  for (const s of strings.value) {
    const string = Number(s?.string)
    if (!Number.isFinite(string)) continue

    for (let fret = 0; fret <= maxFret; fret += 1) {
      if (fret < fromFret || fret > toFret) continue
      const midi = midiForFretString({ fret, string }, tuning.value)
      if (!Number.isFinite(Number(midi))) continue
      const pc = ((Number(midi) % 12) + 12) % 12
      const inScale = useScale && scaleSet.has(pc)
      if (!inScale) continue
      const key = `${string}-${fret}`
      const existing = byKey.get(key)
      if (existing) {
        existing.inScale = true
        if (existing.pc == null) existing.pc = pc
        continue
      }
      byKey.set(key, { string, fret, inChord: false, inScale: true, pc, isRoot: false })
    }
  }
  return [...byKey.values()]
})

const activeHandPosition = computed(() => {
  const t = Number(playheadMs.value)
  if (!Number.isFinite(t)) return null

  const items = Array.isArray(handPositions.value) ? handPositions.value : []
  let best = null
  let bestStart = -Infinity
  for (const hp of items) {
    const gridIndex = Number(hp?.gridIndex)
    const lengthBlocks = Number(hp?.lengthBlocks)
    if (!Number.isFinite(gridIndex) || !Number.isFinite(lengthBlocks)) continue
    if (!(gridIndex > 0) || !(lengthBlocks > 0)) continue

    const startMs = gridIndexToStartMs(gridIndex, DEFAULT_TIME_PER_BLOCK_MS)
    const endMs = startMs + lengthBlocksToDurationMs(lengthBlocks, DEFAULT_TIME_PER_BLOCK_MS)
    if (!(t >= startMs && t < endMs)) continue

    if (startMs >= bestStart) {
      bestStart = startMs
      best = hp
    }
  }
  return best
})

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v))
}

function displayX(x) {
  const n = Number(x)
  if (!Number.isFinite(n)) return 0
  return isLeftHanded.value ? FB_WIDTH - n : n
}

function displayRectX(x, width = 0) {
  const base = Number(x)
  const span = Number(width)
  if (!Number.isFinite(base)) return 0
  if (!isLeftHanded.value) return base
  return FB_WIDTH - base - (Number.isFinite(span) ? span : 0)
}

function displayPercent(xPct) {
  const n = clampPercent(xPct)
  return isLeftHanded.value ? 100 - n : n
}

const stringLabelX = computed(() => (isLeftHanded.value ? FB_WIDTH + 10 : -10))
const stringLabelAnchor = computed(() => (isLeftHanded.value ? 'start' : 'end'))
const suggestedHandPositionLabelAnchor = computed(() => (isLeftHanded.value ? 'end' : 'start'))

function suggestedHandPositionLabelX(rect) {
  const left = displayRectX(rect?.x, rect?.width)
  const width = Number(rect?.width) || 0
  const offset = Number(FRETBOARD_HAND_POSITION.suggestedLabelOffsetXPx) || 0
  return isLeftHanded.value ? left + width - offset : left + offset
}

const timelineNoteEntries = computed(() => {
  const out = []
  for (const n of sortedNotesByStart.value) {
    const key = String(n?.key ?? '')
    if (!key) continue
    const startMs = Number(noteStartMsByKey.value.get(key))
    if (!Number.isFinite(startMs)) continue
    const lenRaw = Number(n?.lengthBlocks)
    const len = Number.isFinite(lenRaw) && lenRaw > 0 ? lenRaw : 1
    const endMs = startMs + lengthBlocksToDurationMs(len, DEFAULT_TIME_PER_BLOCK_MS)
    out.push({ key, note: n, startMs, endMs })
  }
  return out
})

const playbackTimelineIndex = computed(() => {
  const t = Number(playheadMs.value)
  if (!Number.isFinite(t)) return -1
  const entries = timelineNoteEntries.value
  if (!entries.length) return -1
  let idx = -1
  for (let i = 0; i < entries.length; i += 1) {
    if (t >= entries[i].startMs) idx = i
    else break
  }
  return idx
})

const focusNoteForHandMode = computed(() => {
  const selected = String(selection.selectedNoteKey || '')
  if (selected) {
    const n = noteByKey.value.get(selected)
    if (n) return n
  }

  const highlighted = Array.isArray(highlightedNoteKeys.value) ? highlightedNoteKeys.value : []
  for (const k of highlighted) {
    const n = noteByKey.value.get(String(k))
    if (n) return n
  }

  const idx = playbackTimelineIndex.value
  if (idx >= 0) return timelineNoteEntries.value[idx]?.note ?? null
  return null
})

const suggestedHandPositionRange = computed(() => {
  if (!settings.showSuggestedPosition) return null
  if (activeHandPosition.value) return null
  const note = focusNoteForHandMode.value
  const fretRaw = Number(note?.fret)
  if (!Number.isFinite(fretRaw)) return null

  const maxFret = Math.max(1, Number(props.numFrets) || 12)
  const toSpan = FRETBOARD_HAND_POSITION.suggestedSpanFrets
  const startMax = Math.max(1, maxFret - toSpan)
  const fromFret = clamp(Math.round(fretRaw) - 1, 1, startMax)
  const toFret = clamp(fromFret + toSpan, fromFret, maxFret)
  return { fromFret, toFret }
})

const suggestedHandPositionOverlayRect = computed(() => {
  const range = suggestedHandPositionRange.value
  if (!range) return null
  const { fromFret, toFret } = range

  const topY = Number(strings.value[0]?.y)
  const bottomY = Number(strings.value[strings.value.length - 1]?.y)
  if (!Number.isFinite(topY) || !Number.isFinite(bottomY)) return null

  const lines = fretLinesPx.value
  const xLeft = fromFret <= 1 ? NUT_WIDTH : Number(lines[fromFret - 1] ?? NUT_WIDTH)
  const xRight = Number(lines[toFret] ?? FB_WIDTH)
  if (!(xRight > xLeft)) return null

  const padY = FRETBOARD_HAND_POSITION.suggestedPadYPx
  const y = topY - padY
  const height = bottomY - topY + padY * 2
  return {
    x: xLeft,
    y,
    width: xRight - xLeft,
    height,
    rx: 9,
    fromFret,
    toFret,
    labelX: xLeft + FRETBOARD_HAND_POSITION.suggestedLabelOffsetXPx,
    labelY: y + FRETBOARD_HAND_POSITION.suggestedLabelOffsetYPx,
  }
})

const fretLabels = computed(() => {
  const max = Math.max(0, Number(props.numFrets) || 0)
  const lines = fretLinesPx.value
  const out = []
  const view = fretViewRange.value

  // Labels should be centered under the fret fields (1..n).
  // Fret 1 is between nut and the first fret line.
  for (let fret = Math.max(1, view.from); fret <= Math.min(max, view.to); fret++) {
    const left = fret === 1 ? NUT_WIDTH : Number(lines[fret - 1] ?? 0)
    const right = Number(lines[fret] ?? FB_WIDTH)
    const x = (left + right) / 2
    out.push({ fret, xPct: (x / FB_WIDTH) * 100 })
  }

  return out
})

function xToFret(x) {
  const v = Number(x)
  if (!Number.isFinite(v)) return 0
  if (v <= NUT_WIDTH) return 0
  const lines = fretLinesPx.value
  const max = Number(props.numFrets) || 12
  // Map x to fret-field: between nut and fret-1-line => fret 1, between fret (n-1) and fret n => fret n.
  for (let i = 1; i <= max; i++) {
    const xi = Number(lines[i] ?? Infinity)
    if (v < xi) return i
  }
  return max
}

function yToString(y) {
  const v = Number(y)
  if (!Number.isFinite(v)) return 1
  let best = strings.value[0]?.string ?? 1
  let bestDist = Infinity
  for (const s of strings.value) {
    const d = Math.abs(v - Number(s.y))
    if (d < bestDist) {
      bestDist = d
      best = s.string
    }
  }
  return best
}

function clientToSvgPoint(event) {
  const el = overlayEl.value
  if (!el?.getBoundingClientRect) return null
  const rect = el.getBoundingClientRect()
  const clientX = Number(event?.clientX)
  const clientY = Number(event?.clientY)
  if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return null

  const rawX = ((clientX - rect.left) / rect.width) * FB_WIDTH
  const x = isLeftHanded.value ? FB_WIDTH - rawX : rawX
  const yRaw = boardY.value + ((clientY - rect.top) / rect.height) * boardH.value
  const y = clamp(yRaw, 0, FB_HEIGHT)
  return { x, y }
}

function hoveredPosFromEvent(event) {
  const p = clientToSvgPoint(event)
  if (!p) return null
  const fret = xToFret(p.x)
  if (!isFretInView(fret)) return null
  const string = yToString(p.y)
  return { fret, string }
}

async function debugLogToneDotPlacement(source, note, meta = {}) {
  const noteKey = String(note?.key || '')
  if (!noteKey) {
    console.debug('[FretboardDebug]', source, 'missing-note-key', meta)
    return
  }

  await nextTick()

  const storedNote = noteByKey.value.get(noteKey) ?? null
  const renderedDot = renderedToneDotByNoteKey.value.get(noteKey) ?? null
  const samePosDots = toneDotsForRender.value.filter(
    (d) => Number(d?.fret) === Number(note?.fret) && Number(d?.string) === Number(note?.string),
  )

  console.debug('[FretboardDebug]', source, {
    meta,
    noteKey,
    note,
    storedNote,
    activeNotesCount: Array.isArray(store.activeNotes) ? store.activeNotes.length : -1,
    toneDotsForRenderCount: Array.isArray(toneDotsForRender.value) ? toneDotsForRender.value.length : -1,
    rendered: Boolean(renderedDot),
    renderedDot,
    renderedFill: renderedDot ? toneDotFill(renderedDot) : null,
    renderedOpacity: renderedDot ? toneDotOpacity(renderedDot) : null,
    renderedStroke: renderedDot ? toneDotStroke(renderedDot) : null,
    activeDotGroupColor: String(settings.activeDotGroupColor || ''),
    selectedColor: String(settings.selectedColor || ''),
    samePosDots: samePosDots.map((d) => ({
      noteKey: String(d?._noteKey || ''),
      color: String(d?.color || ''),
      groupColorKey: String(d?._groupColorKey || ''),
      groupActive: Boolean(d?._groupActive),
      stackIndex: Number(d?._stackIndex),
      fill: toneDotFill(d),
      opacity: toneDotOpacity(d),
    })),
  })
}

function onBoardPointerUp(event) {
  if (Date.now() < suppressClicksUntilMs) return
  if (isCommentMode.value) {
    const p = overlayClientToPercent(event?.clientX, event?.clientY)
    if (p && !isPlaying.value) {
      const blocks = Number(blocksPerBar.value) || 1
      const currentGrid = Number(currentPlayheadGridIndex.value) || 1
      const startBar = Math.max(1, Math.floor((currentGrid - 1) / blocks) + 1)
      overlay.addTextItem({
        ...p,
        text: '',
        gridIndex: (startBar - 1) * blocks + 1,
        lengthBlocks: blocks,
      })
      return
    }
  }
  const pos = hoveredPosFromEvent(event)
  if (!pos) return
  const { fret, string } = pos

  if (noteEditingEnabled.value) {
    return
  }

  // Show-mode: only allow selecting/previewing existing notes.
  const d = toneDotByPosKey.value.get(`${string}-${fret}`)
  if (!d?._noteKey) return

  selection.selectNote(d._noteKey)
  if (!settings.soundPreviewEnabled) return
  const t = tuning.value
  const midi = midiForFretString({ fret, string }, t)
  if (Number.isFinite(Number(midi))) {
    const note = store.activeNotes.find((n) => n?.key === d._noteKey)
    const durationPlayheadMs = store.getNoteDurationMs(note)

    const tempoValue = Number(transport.tempo) || 120
    const tempoScale = 120 / tempoValue
    const durScale = Number(settings.soundDurationScale)
    const safeScale = Number.isFinite(durScale) && durScale > 0 ? durScale : 1
    const durationAudioMs = Math.max(30, durationPlayheadMs * tempoScale * safeScale)

    void playMidi(midi, { durationMs: durationAudioMs, instrumentType: instrument.instrumentType })
  }
}

function onBoardPointerDown(event) {
  if (event?.button != null && event.button !== 0) return
  if (Date.now() < suppressClicksUntilMs) return
  if (isCommentMode.value) return
  if (!noteEditingEnabled.value) return
  if (isPlaying.value) return

  const pos = hoveredPosFromEvent(event)
  if (!pos) return
  const { fret, string } = pos

  if (noteEditingEnabled.value) {
    if (settings.eraseMode) {
      const existing = toneDotByPosKey.value.get(`${string}-${fret}`)
      const noteKey = String(existing?._noteKey || '')
      if (noteKey) {
        store.removeNote(noteKey)
        const keys = Array.isArray(selection.selectedNoteKeys) ? selection.selectedNoteKeys : []
        const next = keys.filter((k) => String(k) !== noteKey)
        if (next.length) selection.setSelectedNotes(next)
        else if (selection.selectedNoteKey === noteKey) selection.clearSelection()
      }
      return
    }
    const result = melodyInput.addOrSelectAtPosition(fret, string)
    const note = result?.note
    if (!note) return
    if (result.kind === 'selected') {
      promoteToneDotKey(`${string}-${fret}`, note.key)
    } else {
      void debugLogToneDotPlacement('board-pointerdown-add', note, { fret, string })
    }

    if (!settings.soundPreviewEnabled) return
    const t = tuning.value
    const midi = midiForFretString({ fret, string }, t)
    if (Number.isFinite(Number(midi))) {
      const durationPlayheadMs = store.getNoteDurationMs(note)

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
    return
  }
}

function onMouseMove(event) {
  if (isCommentMode.value) {
    hoveredFret.value = null
    hoveredPosKey.value = null
    hoveredToneDotKey.value = null
    hideTooltip()
    return
  }

  // If the pointer is currently inside a dot, keep hover stable.
  if (hoveredToneDotKey.value) {
    if (tooltip.value.visible) setTooltipFromEvent(event, tooltip.value.text)
    return
  }

  const pos = hoveredPosFromEvent(event)
  if (!pos) return
  const { fret, string } = pos
  const nextKey = `${string}-${fret}`
  const samePos = hoveredPosKey.value === nextKey

  hoveredFret.value = fret
  hoveredPosKey.value = nextKey

  const t = tuning.value
  const midi = midiForFretString({ fret, string }, t)
  const text = Number.isFinite(Number(midi)) ? midiToNoteName(midi, { includeOctave: true }) : ''
  if (!text) {
    hideTooltip()
    return
  }

  // In Show: Tooltip only where a note exists. In Edit: always show hovered pitch.
  if (!props.editable) {
    const d = toneDotByPosKey.value.get(nextKey)
    if (!d) {
      hideTooltip()
      return
    }
  }

  const nextText = !samePos || tooltip.value.text !== text ? text : tooltip.value.text
  setTooltipFromEvent(event, nextText)
}

function onMouseLeave() {
  if (hoveredFret.value === null) return
  hoveredFret.value = null
  hoveredPosKey.value = null
  hoveredToneDotKey.value = null
  hideTooltip()
}

const DOT_BASE_R = FRETBOARD_TONE_DOTS.baseRadiusPx
const DOT_HOVER_R_FACTOR = FRETBOARD_TONE_DOTS.hoverRadiusFactor

function posKeyForToneDot(d) {
  return `${Number(d?.string)}-${Number(d?.fret)}`
}

function noteKeyForToneDot(d) {
  return d?._noteKey ? String(d._noteKey) : null
}

function hoverKeyForToneDot(d) {
  return noteKeyForToneDot(d) ?? posKeyForToneDot(d)
}

function isToneDotHovered(d) {
  const key = hoverKeyForToneDot(d)
  return hoveredToneDotKey.value === key
}

function onToneDotEnter(d, event) {
  if (isCommentMode.value) return
  const key = hoverKeyForToneDot(d)
  hoveredToneDotKey.value = key
  hoveredPosKey.value = posKeyForToneDot(d)
  hoveredFret.value = Number(d?.fret)

  const t = tuning.value
  const fret = Number(d?.fret)
  const string = Number(d?.string)
  const midi = midiForFretString({ fret, string }, t)
  const text = Number.isFinite(Number(midi)) ? midiToNoteName(midi, { includeOctave: true }) : ''
  if (text) setTooltipFromEvent(event, text)
}

function onToneDotLeave(d) {
  const key = hoverKeyForToneDot(d)
  if (hoveredToneDotKey.value === key) hoveredToneDotKey.value = null
  // leave hoveredPosKey to mousemove (field hover) or mouseleave
  hideTooltip()
}

function onToneDotClick(d, event) {
  if (isCommentMode.value) {
    event?.stopPropagation?.()
    return
  }
  if (event?.button != null && event.button !== 0) return
  if (Date.now() < suppressClicksUntilMs) return
  const noteKey = noteKeyForToneDot(d)
  if (!noteKey) return
  if (settings.eraseMode && noteEditingEnabled.value) {
    event?.stopPropagation?.()
    store.removeNote(noteKey)
    const keys = Array.isArray(selection.selectedNoteKeys) ? selection.selectedNoteKeys : []
    const next = keys.filter((k) => String(k) !== String(noteKey))
    if (next.length) selection.setSelectedNotes(next)
    else selection.clearSelection()
    return
  }

  const isShift = Boolean(event?.shiftKey)
  event?.stopPropagation?.()
  const selected = melodyInput.selectExistingNote(noteKey, {
    shiftKey: isShift,
    cycleStack: props.editable && !isShift,
  })
  if (!selected) return
  if (!isShift) promoteToneDotKey(posKeyForToneDot(d), selected.key)

  const groupColor = String(selected?.color || d?._groupColorKey || d?.color || '').trim()
  if (groupColor) settings.setActiveDotGroupColor(groupColor)

  // Preview sound only on normal click (matching existing behavior).
  if (isShift || !settings.soundPreviewEnabled) return

  const fret = Number(selected?.fret)
  const string = Number(selected?.string)
  const t = tuning.value
  const midi = midiForFretString({ fret, string }, t)
  if (!Number.isFinite(Number(midi))) return

  const durationPlayheadMs = store.getNoteDurationMs(selected)

  const tempoValue = Number(transport.tempo) || 120
  const tempoScale = 120 / tempoValue
  const durScale = Number(settings.soundDurationScale)
  const safeScale = Number.isFinite(durScale) && durScale > 0 ? durScale : 1
  const durationAudioMs = Math.max(30, durationPlayheadMs * tempoScale * safeScale)

  void playMidi(midi, { durationMs: durationAudioMs, instrumentType: instrument.instrumentType })
}

function clearLongPressTimer() {
  if (longPressTimer == null) return
  clearTimeout(longPressTimer)
  longPressTimer = null
}

function onToneDotPointerDown(d, event) {
  if (event?.button != null && event.button !== 0) return
  if (!noteEditingEnabled.value) return
  if (isPlaying.value) return

  const noteKey = noteKeyForToneDot(d)
  if (!noteKey) return

  const pointerId = event?.pointerId
  if (pointerId == null) return

  clearLongPressTimer()
  dragState.value = {
    active: false,
    noteKey: String(noteKey),
    pointerId,
    startAtMs: Date.now(),
    target: hoveredPosFromEvent(event),
  }

  // Activate drag only after a long press.
  longPressTimer = setTimeout(() => {
    const s = dragState.value
    if (!s?.noteKey) return
    if (s.pointerId !== pointerId) return
    dragState.value = { ...s, active: true }
  }, LONG_PRESS_MS)

  event?.currentTarget?.setPointerCapture?.(pointerId)
}

function onToneDotPointerMove(event) {
  const s = dragState.value
  if (!s?.noteKey) return
  if (event?.pointerId !== s.pointerId) return

  if (!s.active) return

  const pos = hoveredPosFromEvent(event)
  if (!pos) return

  dragState.value = { ...s, target: pos }

  const t = tuning.value
  const midi = midiForFretString({ fret: pos.fret, string: pos.string }, t)
  const text = Number.isFinite(Number(midi)) ? midiToNoteName(midi, { includeOctave: true }) : ''
  if (text) setTooltipFromEvent(event, text)
}

function onToneDotPointerUp(event) {
  if (!noteEditingEnabled.value) {
    clearLongPressTimer()
    return
  }
  const s = dragState.value
  if (!s?.noteKey) return
  if (event?.pointerId !== s.pointerId) return

  clearLongPressTimer()

  if (s.active) {
    const target = s.target ?? hoveredPosFromEvent(event)
    if (target) {
      const src = noteByKey.value.get(String(s.noteKey))
      const srcFret = Number(src?.fret)
      const srcString = Number(src?.string)
      const moved =
        Number.isFinite(srcFret) &&
        Number.isFinite(srcString) &&
        (Number(target.fret) !== srcFret || Number(target.string) !== srcString)
      const maxFret = Math.max(0, Number(props.numFrets) || 12)
      const maxString = Math.max(1, Number(instrument.numStrings) || 6)

      const selectedItems = selectedMovableNotes({ includeKey: s.noteKey })
      const useGroup =
        selectedItems.length > 1 &&
        selectedItems.some((x) => String(x.key) === String(s.noteKey)) &&
        Number.isFinite(srcFret) &&
        Number.isFinite(srcString)

      if (useGroup) {
        const deltaFret = Number(target.fret) - srcFret
        const deltaString = Number(target.string) - srcString
        const updates = selectedItems.map(({ key, note }) => ({
          key,
          fret: clamp((Number(note?.fret) || 0) + deltaFret, 0, maxFret),
          string: clamp((Number(note?.string) || 1) + deltaString, 1, maxString),
        }))
        store.setManyPositions(updates)
      } else {
        store.setNotePosition(s.noteKey, { fret: target.fret, string: target.string })
      }
      selection.selectNote(s.noteKey)

      if (moved && settings.soundPreviewEnabled) {
        const midi = midiForFretString(
          { fret: Number(target.fret), string: Number(target.string) },
          tuning.value,
        )
        if (Number.isFinite(Number(midi))) {
          const durationPlayheadMs = store.getNoteDurationMs(src)
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
    }

    // Prevent the subsequent click (which would otherwise add a note in edit mode).
    suppressClicksUntilMs = Date.now() + CLICK_SUPPRESS_MS
    event?.preventDefault?.()
    event?.stopPropagation?.()
  }

  dragState.value = { active: false, noteKey: null, pointerId: null, startAtMs: 0, target: null }
  hideTooltip()
}

function toneDotX(d) {
  const fret = Math.max(0, Number(d?.fret) || 0)
  const lines = fretLinesPx.value
  const max = Math.min(fret, Number(props.numFrets) || 12)

  // Open-string ToneDot: on the nut.
  if (max === 0) return displayX(NUT_WIDTH / 2) + toneDotOffset(d).dx

  // Fret n ToneDot belongs to the field between (n-1) and n.
  const left = max === 1 ? NUT_WIDTH : Number(lines[max - 1] ?? 0)
  const right = Number(lines[max] ?? FB_WIDTH)
  return displayX((left + right) / 2) + toneDotOffset(d).dx
}

function toneDotY(d) {
  const string = Number(d?.string)
  const s = strings.value.find((x) => Number(x.string) === string)
  return Number(s?.y) || 0
}

function isToneDotStackFront(d) {
  return Number(d?._stackCount) > 1 && Number(d?._stackIndex) === 0
}

function harmonyGuideFill(d) {
  if (d?.inChord && d?.inScale) return FRETBOARD_THEME.harmonyGuides.fillBoth
  if (d?.inChord) return FRETBOARD_THEME.harmonyGuides.fillChord
  return 'transparent'
}

function harmonyGuideStroke(d) {
  if (d?.inChord && d?.inScale) return FRETBOARD_THEME.harmonyGuides.strokeBoth
  if (d?.inChord) return FRETBOARD_THEME.harmonyGuides.strokeChord
  return FRETBOARD_THEME.harmonyGuides.strokeScale
}

function harmonyGuideStrokeWidth(d) {
  if (d?.inChord && d?.inScale) return 2.3
  if (d?.inChord) return 1.9
  return 1.5
}

function harmonyGuideRadius(d) {
  if (d?.inChord && d?.inScale) return 9.2
  if (d?.inChord) return 8
  return 6
}

function toneDotOffset() {
  return { dx: 0, dy: 0 }
}

function isToneDotGroupActive(d) {
  return Boolean(d?._groupActive)
}

function isToneDotSelected(d) {
  const nk = noteKeyForToneDot(d)
  return Boolean(nk && selectedNoteKeySet.value.has(String(nk)))
}

function toneDotFill(d) {
  const base = String(d?.color || 'white')
  if (isToneDotSelected(d)) {
    return `color-mix(in srgb, ${base} 72%, white 28%)`
  }
  if (!isToneDotGroupActive(d)) return 'transparent'
  return base
}

function deriveNoteValueFromLength(note) {
  const len = Number(note?.lengthBlocks)
  if (!Number.isFinite(len) || len <= 0) return '1/4'

  const subdivision = Number(note?.subdivision) === 3 ? 3 : 2
  const candidates = []
  for (const item of NOTE_VALUE_ITEMS) {
    const base = Number(item?.baseBlocks)
    if (!Number.isFinite(base) || base <= 0) continue
    candidates.push({ value: item.value, length: base })
    if (base > 0.25) candidates.push({ value: item.value, length: base * 1.5 })
    if (subdivision === 3) candidates.push({ value: item.value, length: base * (2 / 3) })
  }

  let best = { value: '1/4', delta: Infinity }
  for (const c of candidates) {
    const delta = Math.abs(len - c.length)
    if (delta < best.delta) best = { value: c.value, delta }
  }
  return best.value
}

function noteValueForToneDot(d) {
  const nk = noteKeyForToneDot(d)
  if (!nk) return ''

  const note = noteByKey.value.get(nk)
  const direct = normalizeNoteValue(note?.noteValue)
  if (direct) return direct
  return deriveNoteValueFromLength(note)
}

const NOTE_TO_PC = {
  C: 0,
  'C#': 1,
  DB: 1,
  D: 2,
  'D#': 3,
  EB: 3,
  E: 4,
  F: 5,
  'F#': 6,
  GB: 6,
  G: 7,
  'G#': 8,
  AB: 8,
  A: 9,
  'A#': 10,
  BB: 10,
  B: 11,
}

const INTERVAL_LABELS = ['1', 'b2', '2', 'b3', '3', '4', '#4', '5', 'b6', '6', 'b7', '7']

function rootPitchClassForIntervals() {
  const raw = String(scaleRoot.value || chordRoot.value || 'C').trim().toUpperCase()
  return NOTE_TO_PC[raw] ?? 0
}

function intervalLabelForToneDot(d) {
  const fret = Number(d?.fret)
  const string = Number(d?.string)
  const midi = midiForFretString({ fret, string }, tuning.value)
  if (!Number.isFinite(Number(midi))) return ''
  const pc = ((Number(midi) % 12) + 12) % 12
  const rootPc = rootPitchClassForIntervals()
  const intervalPc = (pc - rootPc + 12) % 12
  return INTERVAL_LABELS[intervalPc] || ''
}

function toneDotSymbol(d) {
  if (!isToneDotGroupActive(d)) return ''
  const mode = String(settings.dotLabelMode || (settings.showIntervalsOnDots ? 'intervals' : 'rhythm'))
  if (mode === 'intervals') {
    return intervalLabelForToneDot(d)
  }
  if (mode === 'play-order') {
    const nk = noteKeyForToneDot(d)
    return nk ? String(activeGroupPlayOrderByNoteKey.value.get(nk) || '') : ''
  }
  if (mode === 'fingering') {
    const nk = noteKeyForToneDot(d)
    return nk ? String(activeGroupFingeringByNoteKey.value.get(nk) || '') : ''
  }
  const value = noteValueForToneDot(d)
  if (!value) return ''
  const item = noteValueItem(value)
  return item?.dotSymbol || item?.label || value
}

function toneDotIcon(d) {
  if (!isToneDotGroupActive(d)) return ''
  const mode = String(settings.dotLabelMode || (settings.showIntervalsOnDots ? 'intervals' : 'rhythm'))
  if (mode !== 'rhythm') return ''
  const value = noteValueForToneDot(d)
  if (!value) return ''
  const item = noteValueItem(value)
  return String(item?.icon || '')
}

function toneDotPitchLabel(d) {
  const fret = Number(d?.fret)
  const string = Number(d?.string)
  const midi = midiForFretString({ fret, string }, tuning.value)
  if (!Number.isFinite(Number(midi))) return ''
  return midiToNoteName(midi, { includeOctave: false })
}

function showPitchLabel(d) {
  if (!isToneDotGroupActive(d)) return false
  const nk = noteKeyForToneDot(d)
  return Boolean(nk && (highlightedNoteKeySet.value.has(nk) || isToneDotHovered(d)))
}

function isMarkerFret(fret) {
  const f = Number(fret)
  if (!Number.isFinite(f) || f <= 0) return false
  return f % 12 === 0 || [3, 5, 7, 9].includes(f % 12)
}

function toneDotOpacity(d) {
  const colorKey = toneDotColorKeyForNote(d)
  const activeColorKey = String(activePlaybackColorKey.value || '')
  const activeGroup = isToneDotGroupActive(d)

  if (isToneDotSelected(d)) return 1
  if (!isPlaying.value) {
    return activeGroup ? 1 : 0.58
  }
  if (!activeColorKey) return 1
  if (colorKey === activeColorKey) return 1
  return 0.52
}

function toneDotStroke(d) {
  if (isToneDotSelected(d)) return 'rgba(17, 21, 28, 0.96)'
  if (!isToneDotGroupActive(d)) {
    const nk = noteKeyForToneDot(d)
    if (nk && String(selection.selectedNoteKey || '') === nk) return FRETBOARD_THEME.toneDots.strokeHover
    return String(d?.color || FRETBOARD_THEME.toneDots.strokeDefault)
  }

  const hk = hoverKeyForToneDot(d)
  const hoverStroke =
    hoveredToneDotKey.value === hk
      ? FRETBOARD_THEME.toneDots.strokeHover
      : FRETBOARD_THEME.toneDots.strokeDefault

  const nk = noteKeyForToneDot(d)
  if (nk && String(selection.selectedNoteKey || '') === nk) return FRETBOARD_THEME.toneDots.strokeHover

  return hoverStroke
}

function toneDotStrokeWidth(d) {
  if (isToneDotSelected(d)) {
    let w = 2.25
    if (isToneDotHovered(d)) w = Math.max(w, 2.45)
    return w
  }
  if (!isToneDotGroupActive(d)) {
    const nk = noteKeyForToneDot(d)
    let w = 1.7
    if (isToneDotHovered(d)) w = Math.max(w, 2)
    if (nk && String(selection.selectedNoteKey || '') === nk) w = Math.max(w, 2.1)
    return w
  }

  const hk = hoverKeyForToneDot(d)
  let w = hoveredToneDotKey.value === hk ? 1.8 : 1.2

  if (isToneDotHovered(d)) w = Math.max(w, 1.8)

  const nk = noteKeyForToneDot(d)
  if (nk && String(selection.selectedNoteKey || '') === nk) w = Math.max(w, 1.8)
  const dyn = nk ? Number(dynamicByNoteKey.value.get(nk)) : NaN
  if (Number.isFinite(dyn)) w += dyn * 0.35
  return w
}

function toneDotR(d) {
  const hk = hoverKeyForToneDot(d)
  const nk = noteKeyForToneDot(d)
  const isActive =
    Boolean(nk) &&
    (String(selection.selectedNoteKey || '') === String(nk) ||
      highlightedNoteKeySet.value.has(String(nk)))
  const dyn = nk ? Number(dynamicByNoteKey.value.get(nk)) : NaN
  const dynScale = Number.isFinite(dyn) ? 0.82 + dyn * 0.42 : 1
  const baseR = DOT_BASE_R * dynScale * (hoveredToneDotKey.value === hk ? DOT_HOVER_R_FACTOR : 1)
  const startedAt = nk ? pulseStartedAtByNoteKey.value.get(nk) : null
  if (!Number.isFinite(startedAt)) {
    if (isActive) return baseR * 1.12
    return baseR
  }

  const dt = animNowMs.value - startedAt
  const PULSE_MS = FRETBOARD_SHOW_DOT_PULSE_MS
  if (!(dt >= 0 && dt <= PULSE_MS)) {
    if (isActive) return baseR * 1.12
    return baseR
  }
  const p = dt / PULSE_MS
  const bump = Math.sin(Math.PI * p)
  const pulseR = baseR * (1 + FRETBOARD_SHOW_DOT_PULSE_RADIUS_FACTOR * bump)
  if (isActive) return pulseR * 1.12
  return pulseR
}

function toneDotSelectionRingR(d) {
  return toneDotR(d) + 3.8
}

function toneDotSelectionRingStroke() {
  return 'rgba(248, 242, 229, 0.98)'
}

function toneDotSelectionRingStrokeWidth(d) {
  return isToneDotHovered(d) ? 2.8 : 2.35
}

function toneDotSelectionRingStyle(d) {
  const color = String(d?.color || '#ffffff')
  return {
    filter: `drop-shadow(0 0 7px color-mix(in srgb, ${color} 46%, white 54%)) drop-shadow(0 1px 3px rgba(0, 0, 0, 0.42))`,
  }
}

function toneDotStyle(d) {
  const nk = noteKeyForToneDot(d)
  if (!nk) return null
  const selected = selectedNoteKeySet.value.has(String(nk))
  const highlighted = highlightedNoteKeySet.value.has(nk)
  if (!selected && !highlighted) return null
  return {
    filter: selected
      ? 'drop-shadow(0 0 8px rgba(255, 239, 189, 0.98)) drop-shadow(0 1px 3px rgba(0, 0, 0, 0.48))'
      : 'drop-shadow(0 0 4px rgba(255, 220, 120, 0.86)) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.42))',
  }
}

function previewR() {
  // Keep preview a touch smaller than a fully hovered active ToneDot.
  return DOT_BASE_R * FRETBOARD_TONE_DOTS.previewRadiusFactor
}

onMounted(() => {
  animNowMs.value = performance.now()
  loadChordShapes()
  window.addEventListener('resize', onViewportResize)
  updateStackMinHeightPx()
  updateDotRoundCompensation()
  if (coreResizableEl.value && typeof ResizeObserver !== 'undefined') {
    coreResizeObserver = new ResizeObserver(() => {
      updateStackMinHeightPx()
      updateDotRoundCompensation()
    })
    coreResizeObserver.observe(coreResizableEl.value)
  }
  window.addEventListener('pointerdown', onWindowPointerDownForTextColorMenu, true)
})

onBeforeUnmount(() => {
  closeToneDotContextMenu()
  stopTextDrag()
  stopTextResize()
  stopAnim()
  window.removeEventListener('resize', onViewportResize)
  window.removeEventListener('pointerdown', onWindowPointerDownForTextColorMenu, true)
  coreResizeObserver?.disconnect?.()
  coreResizeObserver = null
})

watch(
  () => isPlaying.value,
  (playing) => {
    if (playing) {
      playedNoteKeys.value = new Set()
      playbackLeadInStartedAtMs.value = performance.now()
      // Clear hover/tooltip markings when playback starts.
      hoveredFret.value = null
      hoveredPosKey.value = null
      hoveredToneDotKey.value = null
      hideTooltip()
      startAnim()
      return
    } else {
      playedNoteKeys.value = new Set()
      playbackLeadInStartedAtMs.value = 0
      stopAnim()
      animNowMs.value = performance.now()
    }
  },
  { immediate: true },
)

watch(
  () => Number(directionPreview.value?.startedAtMs) || 0,
  (startedAtMs) => {
    if (!(startedAtMs > 0)) return
    startAnim()
  },
)
</script>

<style scoped>
.fretboard-body {
  --fb-ui-scale: 1;
  --fb-gap-px: 8px;
  --fb-control-h-px: 26px;
  --fb-font-sm-px: 12px;
  --fb-gap: calc(var(--fb-gap-px) * var(--fb-ui-scale));
  --fb-control-h: calc(var(--fb-control-h-px) * var(--fb-ui-scale));
  --fb-font-sm: calc(var(--fb-font-sm-px) * var(--fb-ui-scale));
  --fb-side-pad-left: 40px;
  --fb-side-pad-right: 10px;
  --fb-top-pad: 10px;
  --fb-bottom-pad: 10px;
  --fb-numbers-height-px: 28px;
  --fb-numbers-pad-top-px: 6px;
  --fb-numbers-margin-top: 10px;
  --fb-numbers-margin-bottom: 10px;
  --fb-actions-margin-top: -2px;
  --fb-actions-margin-bottom: 8px;
  --fb-rail-top-pad-px: 30px;
  width: var(--fb-width-clamp, clamp(760px, 92vw, 1460px));
  max-width: 100%;
  margin-inline: auto;
  padding: 4px 0 var(--fb-bottom-pad);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--panel-side-gap, 6px);
  position: relative;
  overflow: visible;
  min-width: 0;
  height: 100%;
  min-height: 0;
  border-radius: 14px;
}

.fb-view-mask rect {
  fill: var(--color-surface);
}

.fb-core-pad {
  width: 100%;
  height: 100%;
  min-height: 0;
  padding-left: calc(var(--fb-side-pad-left) + 6px);
  padding-right: calc(var(--fb-side-pad-right) + 6px);
  padding-top: calc(var(--fb-top-pad) + 2px);
  padding-bottom: 0;
  margin-bottom: 0;
  box-sizing: border-box;
  overflow: visible;
  display: flex;
  flex-direction: column;
}

.fb-core-resizable {
  width: 100%;
  flex: 1 1 auto;
  min-height: var(--fb-core-min-height-px, 0px);
  max-height: var(--fb-core-max-height-px, none);
  padding-bottom: var(--fb-core-resize-pad-bottom, 0px);
  margin-bottom: var(--fb-core-resize-margin-bottom, 0px);
  transform-origin: top left;
  overflow: visible;
}

.fb-stack {
  width: 100%;
  height: max(0px, calc(100% - var(--fb-fret-numbers-block-px, 0px)));
  min-height: var(--fb-stack-min-height-px, 0px);
  max-height: var(--fb-stack-max-height-px, none);
  position: relative;
  overflow: visible;
  border-radius: 14px;
}

.fb-layer {
  position: absolute;
  inset: 0;
}

.fb-overlay {
  z-index: 1;
  width: 100%;
  height: 100%;
  display: block;
  cursor: pointer;
  overflow: visible;
}

.fb-text-layer {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
}

.fb-text-item {
  position: absolute;
  display: block;
  transform: translate(-50%, -50%);
  pointer-events: auto;
  min-width: 140px;
}

.fb-text-item.is-inactive {
  opacity: 0.58;
}

.fb-text-window {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 100%;
  height: 100%;
  border: 1px solid color-mix(in srgb, var(--fb-comment-color, #f59e0b) 48%, rgb(154 163 173) 52%);
  border-radius: 10px;
  background: color-mix(in srgb, var(--fb-comment-color, var(--color-warning)) 8%, var(--color-surface) 92%);
  box-shadow: 0 10px 28px rgb(0 0 0 / 18%);
  overflow: hidden;
}

.fb-text-window-head {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 28px;
  padding: 4px 6px;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--fb-comment-color, #f59e0b) 14%, white 86%),
    color-mix(in srgb, var(--fb-comment-color, #f59e0b) 8%, #e8edf2 92%)
  );
  border-bottom: 1px solid color-mix(in srgb, var(--fb-comment-color, #f59e0b) 28%, rgb(154 163 173) 72%);
  cursor: move;
}

.fb-text-window-title {
  flex: 1 1 auto;
  min-width: 0;
  color: var(--color-text);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.fb-text-color-dropdown {
  position: relative;
  flex: 0 0 auto;
}

.fb-text-color-trigger {
  width: 28px;
  height: 22px;
  padding: 0;
  border: 1px solid color-mix(in srgb, var(--fb-comment-color, #f59e0b) 32%, rgb(154 163 173) 68%);
  border-radius: 5px;
  background: var(--color-surface);
  cursor: pointer;
}

.fb-text-color-trigger-swatch,
.fb-text-color-option-swatch {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  background: var(--fb-comment-swatch);
}

.fb-text-color-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  min-width: 102px;
  padding: 8px;
  border: 1px solid rgb(154 163 173 / 0.55);
  border-radius: 8px;
  background: color-mix(in srgb, var(--color-surface) 96%, transparent);
  box-shadow: 0 10px 24px rgb(0 0 0 / 18%);
  z-index: 8;
}

.fb-text-color-option {
  width: 24px;
  height: 24px;
  padding: 0;
  border: 1px solid rgb(255 255 255 / 0.85);
  border-radius: 6px;
  background: transparent;
  box-shadow: 0 0 0 1px rgb(0 0 0 / 0.12);
  cursor: pointer;
}

.fb-text-color-option.is-active {
  box-shadow:
    0 0 0 1px rgb(255 255 255 / 0.92),
    0 0 0 3px color-mix(in srgb, var(--fb-comment-swatch) 55%, transparent);
}

.fb-text-item-input {
  width: 100%;
  min-height: 0;
  flex: 1 1 auto;
  padding: 8px 10px 24px;
  border: 0;
  border-radius: 0;
  background: color-mix(in srgb, var(--fb-comment-color, var(--color-warning)) 4%, var(--color-surface) 96%);
  color: var(--color-text);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
  resize: none;
  outline: none;
}

.fb-text-resize-handle {
  position: absolute;
  right: 4px;
  bottom: 4px;
  width: 16px;
  height: 16px;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background:
    linear-gradient(135deg, transparent 0 34%, color-mix(in srgb, var(--fb-comment-color, #f59e0b) 45%, #6b7280 55%) 34% 46%, transparent 46% 100%);
  cursor: nwse-resize;
}

.fb-text-item-delete {
  width: 20px;
  height: 20px;
  border: 1px solid var(--color-error-soft-border);
  border-radius: 4px;
  background: var(--color-error-soft-bg);
  color: var(--color-error-soft-text);
  font-size: 11px;
  font-weight: 800;
  line-height: 1;
  cursor: pointer;
}

@media (max-width: 860px) {
  .fb-text-window-head {
    gap: 6px;
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .fb-text-window-title {
    width: 100%;
  }

  .fb-text-color-trigger {
    width: 30px;
    height: 24px;
  }

  .fb-text-item-delete {
    width: 24px;
    height: 24px;
  }
}

.fb-text-item-static {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  min-width: 48px;
  padding: 4px 8px;
  border: 1px solid color-mix(in srgb, var(--fb-comment-color, #f59e0b) 36%, rgb(154 163 173) 64%);
  border-radius: 6px;
  background: color-mix(in srgb, var(--fb-comment-color, var(--color-warning)) 12%, var(--color-surface) 88%);
  color: var(--color-text);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.25;
  white-space: pre-wrap;
  overflow: auto;
}

.fb-string-labels {
  pointer-events: none;
}

.fb-playback-travel-line line {
  stroke-linecap: round;
  filter: var(--fb-playback-travel-line-shadow);
}

.fb-now-string-line {
  stroke-width: 2.2;
  stroke-linecap: round;
}

.fb-now-cross {
  stroke-width: 4.2;
  stroke-linecap: round;
  filter: var(--fb-now-cross-shadow);
}

.fb-now-ring {
  fill: none;
  stroke-width: 2.8;
  opacity: 0.95;
  filter: var(--fb-now-ring-shadow);
}

.fb-playback-self-loop circle,
.fb-playback-self-loop line {
  stroke-width: 3.1;
  stroke-linecap: round;
  filter: var(--fb-self-loop-shadow);
}

.fb-playback-self-loop .self-loop-base {
  opacity: 0.35;
}

.fb-playback-self-loop .self-loop-progress {
  opacity: 1;
}

.fb-playback-self-loop .self-loop-head {
  filter: var(--fb-self-loop-head-shadow);
}

.fb-harmony-guides circle {
  opacity: 0.95;
  transition:
    opacity 160ms cubic-bezier(0.22, 1, 0.36, 1),
    stroke 160ms cubic-bezier(0.22, 1, 0.36, 1),
    fill 160ms cubic-bezier(0.22, 1, 0.36, 1);
}

.fb-tone-dot {
  transition:
    cx 140ms cubic-bezier(0.22, 1, 0.36, 1),
    cy 140ms cubic-bezier(0.22, 1, 0.36, 1),
    rx 180ms cubic-bezier(0.22, 1, 0.36, 1),
    ry 180ms cubic-bezier(0.22, 1, 0.36, 1),
    fill 160ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 140ms cubic-bezier(0.22, 1, 0.36, 1),
    stroke 160ms cubic-bezier(0.22, 1, 0.36, 1),
    stroke-width 160ms cubic-bezier(0.22, 1, 0.36, 1),
    filter 180ms cubic-bezier(0.22, 1, 0.36, 1);
}

.fb-tone-dot-selection-ring {
  fill: none;
  pointer-events: none;
  transition:
    cx 140ms cubic-bezier(0.22, 1, 0.36, 1),
    cy 140ms cubic-bezier(0.22, 1, 0.36, 1),
    rx 180ms cubic-bezier(0.22, 1, 0.36, 1),
    ry 180ms cubic-bezier(0.22, 1, 0.36, 1),
    stroke 160ms cubic-bezier(0.22, 1, 0.36, 1),
    stroke-width 160ms cubic-bezier(0.22, 1, 0.36, 1),
    filter 180ms cubic-bezier(0.22, 1, 0.36, 1);
}

.fb-tone-dot-symbol {
  fill: var(--fb-tone-dot-symbol-fill);
  stroke: var(--fb-tone-dot-symbol-stroke);
  stroke-width: 1.4;
  paint-order: stroke;
  pointer-events: none;
  text-anchor: middle;
  dominant-baseline: middle;
  font-size: 14px;
  font-weight: 800;
  user-select: none;
  transition:
    opacity 140ms cubic-bezier(0.22, 1, 0.36, 1),
    fill 160ms cubic-bezier(0.22, 1, 0.36, 1),
    stroke 160ms cubic-bezier(0.22, 1, 0.36, 1);
}

.fb-tone-dot-symbol-icon {
  pointer-events: none;
  user-select: none;
  transition:
    opacity 140ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
}

.fb-tone-dot-pitch {
  fill: var(--fb-tone-dot-pitch-fill);
  stroke: var(--fb-tone-dot-pitch-stroke);
  stroke-width: 1.1;
  paint-order: stroke;
  pointer-events: none;
  text-anchor: middle;
  dominant-baseline: hanging;
  font-size: 9px;
  font-weight: 700;
  user-select: none;
  transition:
    opacity 140ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
}

.fb-tone-dot-stack-badge circle {
  fill: color-mix(in srgb, var(--app-layer-overlay) 88%, black 12%);
  stroke: rgb(255 255 255 / 0.82);
  stroke-width: 1.2;
}

.fb-tone-dot-stack-badge text {
  fill: white;
  text-anchor: middle;
  dominant-baseline: central;
  font-size: 8px;
  font-weight: 900;
}

.fb-next-note-preview {
  fill: none;
  stroke: var(--fb-next-note-preview-stroke);
  stroke-width: 2.4;
  stroke-dasharray: 5 3;
  filter: var(--fb-next-note-preview-shadow);
  pointer-events: none;
  animation: fb-next-note-pulse 1100ms ease-in-out infinite;
}

@keyframes fb-next-note-pulse {
  0%, 100% {
    opacity: 0.58;
  }

  50% {
    opacity: 1;
  }
}

.fb-hand-position-overlay rect {
  fill: var(--fb-hand-overlay-fill);
  stroke: var(--fb-hand-overlay-stroke);
  stroke-width: 2.2;
  filter: var(--fb-hand-overlay-shadow);
}

.fb-hand-position-suggested rect {
  fill: var(--fb-hand-suggested-fill);
  stroke: var(--fb-hand-suggested-stroke);
  stroke-width: 1.8;
  stroke-dasharray: 6 4;
}

.fb-hand-position-suggested text {
  fill: var(--fb-hand-suggested-text-fill);
  stroke: var(--fb-hand-suggested-text-stroke);
  stroke-width: 1;
  paint-order: stroke;
  font-size: 10px;
  font-weight: 700;
}

.fb-tooltip {
  position: absolute;
  pointer-events: none;
  z-index: 5;

  padding: 4px 8px;
  border-radius: 6px;

  background: var(--fb-tooltip-bg);
  color: var(--fb-tooltip-text);
  font-size: 12px;
  font-weight: 800;
  line-height: 1;
  white-space: nowrap;

  transform: translateY(-2px);
}

.fb-fret-numbers {
  position: relative;
  width: 100%;
  z-index: 6;
  height: var(--fb-numbers-height-px);
  margin-top: var(--fb-numbers-margin-top);
  margin-bottom: var(--fb-numbers-margin-bottom);
  padding-top: var(--fb-numbers-pad-top-px);
  background: transparent;
  border-radius: 10px;
  overflow: visible;
}

.fb-fret-number {
  position: absolute;
  top: 6px;
  transform: translateX(-50%);

  font-size: calc(13px * var(--fb-ui-scale));
  font-weight: 800;
  line-height: 1;

  color: var(--fb-fret-number-color);
  text-shadow: var(--fb-fret-number-shadow);
  user-select: none;
}

.fb-fret-number.is-marker-fret {
  color: var(--fb-fret-number-marker-color);
  text-shadow: var(--fb-fret-number-marker-shadow);
  font-size: calc(14px * var(--fb-ui-scale));
}

.fb-hand-mode-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: -2px;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 700;
  color: var(--fb-hand-info-text);
}

.fb-hand-mode-info .is-warning {
  color: var(--fb-hand-info-warning-text);
}

.fb-chord-shape-panel {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 2px 0 10px;
  flex-wrap: wrap;
}

.fb-chord-detected {
  min-width: 86px;
  font-size: 12px;
  font-weight: 800;
  color: var(--fb-chord-detected-text);
  background: var(--fb-chord-detected-bg);
  border: 1px solid var(--fb-chord-detected-border);
  border-radius: 6px;
  padding: 3px 8px;
  text-shadow: var(--fb-chord-detected-shadow);
}

.fb-shape-btn,
.fb-shape-select {
  height: var(--fb-control-h);
  border-radius: 6px;
  border: 1px solid var(--fb-shape-control-border);
  background: var(--fb-shape-control-bg);
  color: var(--fb-shape-control-text);
  font-size: var(--fb-font-sm);
  font-weight: 700;
}

.fb-shape-btn {
  padding: 0 10px;
  cursor: pointer;
}

.fb-shape-btn:disabled,
.fb-shape-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.fb-shape-btn.is-danger {
  border-color: var(--fb-shape-danger-border);
  color: var(--fb-shape-danger-text);
}

.fb-shape-btn.is-active {
  border-color: var(--fb-shape-active-border);
  background: var(--fb-shape-active-bg);
  color: var(--fb-shape-active-text);
}

.fb-shape-select {
  min-width: 170px;
  padding: 0 8px;
}
</style>
