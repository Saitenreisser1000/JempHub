<template>
  <div class="timeline-info" :class="{ 'is-mobile': isMobile, 'is-sidebar': isSidebar }">
    <div v-if="isSidebar" class="timeline-sidebar-shell">
      <section class="timeline-sidebar-section" :aria-label="t('timelineView.tools')">
        <div class="timeline-sidebar-head">
          <div class="timeline-sidebar-title">Edit</div>
          <v-menu location="bottom end" :close-on-content-click="false">
            <template #activator="{ props: menuProps }">
              <v-btn v-bind="menuProps" size="x-small" variant="tonal" class="timeline-sidebar-options-btn" title="Options">
                <v-icon icon="mdi-cog-outline" size="16" />
              </v-btn>
            </template>

            <div class="timeline-sidebar-options-menu pa-3 d-flex flex-column ga-3">
              <div class="timeline-sidebar-options-row">
                <span class="timeline-sidebar-options-label">Zoom</span>
                <div class="timeline-sidebar-inline-controls">
                  <v-btn size="x-small" variant="tonal" class="bars-adjust-btn" title="Zoom -" @click="emit('zoom-left')">
                    &lt;
                  </v-btn>
                  <v-btn size="x-small" variant="tonal" class="bars-adjust-btn" title="Zoom +" @click="emit('zoom-right')">
                    &gt;
                  </v-btn>
                </div>
              </div>

              <div class="timeline-sidebar-options-row">
                <span class="timeline-sidebar-options-label">{{ t('modeSelector.beat') }}</span>
                <div class="timeline-sidebar-inline-controls">
                  <v-text-field density="compact" hide-details type="number" min="1" step="1" style="width: 72px"
                    :model-value="beatTop" @update:model-value="updateBeatTopFromOptions" />
                  <v-select density="compact" hide-details style="width: 72px" :items="beatBottomItems"
                    :model-value="beatBottom" @update:model-value="updateBeatBottomFromOptions" />
                </div>
              </div>

              <div class="timeline-sidebar-options-row">
                <span class="timeline-sidebar-options-label">Pickup</span>
                <div class="timeline-sidebar-inline-controls">
                  <v-switch density="compact" hide-details inset
                    :model-value="pickupEnabled" @update:model-value="(v) => emit('update-pickup-enabled', Boolean(v))" />
                  <v-text-field density="compact" hide-details type="number" min="0" :max="pickupMax" step="1"
                    style="width: 72px" :model-value="pickupBeats" @update:model-value="updatePickupBeatsFromOptions" />
                </div>
              </div>

              <div class="timeline-sidebar-options-row">
                <span class="timeline-sidebar-options-label">Bars</span>
                <div class="timeline-sidebar-inline-controls">
                  <v-btn size="x-small" variant="tonal" class="bars-adjust-btn" :title="'Bars -1'"
                    @click="emit('decrement-bars-no-pickup')">
                    -
                  </v-btn>
                  <v-text-field class="bars-count-input" density="compact" hide-details variant="outlined" type="number"
                    min="1" step="1" :model-value="barsNoPickupLocal"
                    @update:model-value="(v) => emit('update-bars-no-pickup', v)" />
                  <v-btn size="x-small" variant="tonal" class="bars-adjust-btn" :title="'Bars +1'"
                    @click="emit('increment-bars-no-pickup')">
                    +
                  </v-btn>
                </div>
              </div>

              <div class="timeline-sidebar-options-row">
                <span class="timeline-sidebar-options-label">Snap</span>
                <button class="timeline-chip timeline-chip-sidebar-toggle" :class="{ 'is-active': snapEnabled }" type="button"
                  :title="'Snap on/off'" @click="emit('update-snap', !snapEnabled)">
                  <span class="timeline-chip-label">Snap</span>
                  <span class="timeline-chip-value">{{ snapEnabled ? 'On' : 'Off' }}</span>
                </button>
              </div>
            </div>
          </v-menu>
        </div>
        <div class="timeline-sidebar-grid timeline-sidebar-grid-tools">
          <label class="timeline-tool timeline-tool-segment" :class="{ 'is-active': String(activeTool) === 'arrow' }"
            :title="t('timelineView.arrow')">
            <input class="timeline-tool-input" type="radio" name="timeline-active-tool-sidebar" value="arrow"
              :checked="String(activeTool) === 'arrow'" @change="emit('update-active-tool', 'arrow')" />
            <span class="timeline-tool-icon" aria-hidden="true">➤</span>
            <span class="timeline-tool-label">Move</span>
          </label>

          <label class="timeline-tool timeline-tool-segment" :class="{ 'is-active': String(activeTool) === 'select' }"
            :title="t('timelineView.selectionRect')">
            <input class="timeline-tool-input" type="radio" name="timeline-active-tool-sidebar" value="select"
              :checked="String(activeTool) === 'select'" @change="emit('update-active-tool', 'select')" />
            <span class="timeline-tool-icon" aria-hidden="true">▭</span>
            <span class="timeline-tool-label">Select</span>
          </label>
        </div>

        <div class="timeline-sidebar-grid timeline-sidebar-grid-actions">
          <button class="timeline-tool timeline-tool-action" type="button" :title="t('timelineView.copy')"
            @click="emit('copy-selection')">
            <span class="timeline-tool-icon" aria-hidden="true">⧉</span>
            <span class="timeline-tool-label">Copy</span>
          </button>

          <TimelinePasteButton button-class="timeline-tool-action" @paste="(options) => emit('paste-at-playhead', options)" />
        </div>
      </section>
    </div>

    <template v-else>
    <button
      v-if="isMobile"
      class="timeline-info-toggle"
      type="button"
      :aria-expanded="String(infoExpanded)"
      @click="infoExpanded = !infoExpanded"
    >
      <div class="timeline-info-toggle-copy">
        <span class="timeline-info-toggle-title">Timeline</span>
        <span class="timeline-info-toggle-summary">
          {{ activeToolLabel }} · Snap {{ snapEnabled ? 'On' : 'Off' }} · Bars {{ barsNoPickupLocal }}
        </span>
      </div>
      <span class="timeline-info-toggle-icon" :class="{ 'is-open': infoExpanded }" aria-hidden="true">▾</span>
    </button>

    <div v-show="!isMobile || infoExpanded" class="timeline-info-shell">
      <section class="timeline-group timeline-group-flat" :aria-label="t('timelineView.tools')">
        <div class="timeline-group-row">
          <label class="timeline-tool timeline-tool-wide" :class="{ 'is-active': String(activeTool) === 'arrow' }"
            :title="t('timelineView.arrow')">
            <input class="timeline-tool-input" type="radio" name="timeline-active-tool" value="arrow"
              :checked="String(activeTool) === 'arrow'" @change="emit('update-active-tool', 'arrow')" />
            <span class="timeline-tool-icon" aria-hidden="true">➤</span>
            <span class="timeline-tool-label">Move</span>
          </label>

          <label class="timeline-tool timeline-tool-wide" :class="{ 'is-active': String(activeTool) === 'select' }"
            :title="t('timelineView.selectionRect')">
            <input class="timeline-tool-input" type="radio" name="timeline-active-tool" value="select"
              :checked="String(activeTool) === 'select'" @change="emit('update-active-tool', 'select')" />
            <span class="timeline-tool-icon" aria-hidden="true">▭</span>
            <span class="timeline-tool-label">Select</span>
          </label>
          <button class="timeline-tool timeline-tool-wide" type="button" :title="t('timelineView.copy')"
            @click="emit('copy-selection')">
            <span class="timeline-tool-icon" aria-hidden="true">⧉</span>
            <span class="timeline-tool-label">Copy</span>
          </button>

          <TimelinePasteButton button-class="timeline-tool-wide" @paste="(options) => emit('paste-at-playhead', options)" />
        </div>
      </section>

      <section class="timeline-group timeline-group-flat timeline-group-params" aria-label="Timeline settings">
        <div class="timeline-group-row timeline-group-row-params">
          <div class="timeline-stepper" :aria-label="'Bars'">
            <span class="timeline-stepper-label">Bars</span>
            <v-btn size="x-small" variant="tonal" class="bars-adjust-btn" :title="'Bars -1'"
              @click="emit('decrement-bars-no-pickup')">
              -
            </v-btn>
            <v-text-field class="bars-count-input" density="compact" hide-details variant="outlined" type="number"
              min="1" step="1" :model-value="barsNoPickupLocal"
              @update:model-value="(v) => emit('update-bars-no-pickup', v)" />
            <v-btn size="x-small" variant="tonal" class="bars-adjust-btn" :title="'Bars +1'"
              @click="emit('increment-bars-no-pickup')">
              +
            </v-btn>
          </div>

          <v-menu location="top end" :close-on-content-click="false">
            <template #activator="{ props: menuProps }">
              <v-btn v-bind="menuProps" size="x-small" variant="tonal" class="timeline-options-inline-btn"
                :title="t('modeSelector.options')">
                <v-icon icon="mdi-cog-outline" size="16" />
              </v-btn>
            </template>

            <div class="timeline-inline-options-menu pa-3 d-flex flex-column ga-3">
              <div class="timeline-sidebar-options-row">
                <span class="timeline-sidebar-options-label">Zoom</span>
                <div class="timeline-sidebar-inline-controls">
                  <v-btn size="x-small" variant="tonal" class="bars-adjust-btn" title="Zoom -"
                    @click="emit('zoom-left')">
                    &lt;
                  </v-btn>
                  <v-btn size="x-small" variant="tonal" class="bars-adjust-btn" title="Zoom +"
                    @click="emit('zoom-right')">
                    &gt;
                  </v-btn>
                </div>
              </div>

              <div class="timeline-sidebar-options-row">
                <span class="timeline-sidebar-options-label">{{ t('modeSelector.beat') }}</span>
                <div class="timeline-sidebar-inline-controls">
                  <v-text-field density="compact" hide-details type="number" min="1" step="1" style="width: 72px"
                    :model-value="beatTop" @update:model-value="updateBeatTopFromOptions" />
                  <v-select density="compact" hide-details style="width: 72px" :items="beatBottomItems"
                    :model-value="beatBottom" @update:model-value="updateBeatBottomFromOptions" />
                </div>
              </div>

              <div class="timeline-sidebar-options-row">
                <span class="timeline-sidebar-options-label">Pickup</span>
                <div class="timeline-sidebar-inline-controls">
                  <v-switch density="compact" hide-details inset
                    :model-value="pickupEnabled" @update:model-value="(v) => emit('update-pickup-enabled', Boolean(v))" />
                  <v-text-field density="compact" hide-details type="number" min="0" :max="pickupMax" step="1"
                    style="width: 72px" :model-value="pickupBeats" @update:model-value="updatePickupBeatsFromOptions" />
                </div>
              </div>

              <div class="timeline-sidebar-options-row">
                <span class="timeline-sidebar-options-label">Snap</span>
                <button class="timeline-chip timeline-chip-sidebar-toggle" :class="{ 'is-active': snapEnabled }" type="button"
                  :title="'Snap on/off'" @click="emit('update-snap', !snapEnabled)">
                  <span class="timeline-chip-label">Snap</span>
                  <span class="timeline-chip-value">{{ snapEnabled ? 'On' : 'Off' }}</span>
                </button>
              </div>
            </div>
          </v-menu>
        </div>
      </section>
    </div>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { TIMELINE_LAYOUT } from '@/features/timeline/config/timelineLayout'
import { useI18n } from '@/i18n'
import TimelinePasteButton from './TimelinePasteButton.vue'

defineOptions({ name: 'TimelineInfoBar' })

const props = defineProps({
  activeTool: { type: String, default: 'arrow' },
  barsNoPickupLocal: { type: String, default: '1' },
  beatTop: { type: Number, default: 4 },
  beatBottom: { type: Number, default: 4 },
  pickupEnabled: { type: Boolean, default: false },
  pickupBeats: { type: Number, default: 0 },
  snapEnabled: { type: Boolean, default: true },
  compact: { type: Boolean, default: false },
  forceExpanded: { type: Boolean, default: false },
  sidebar: { type: Boolean, default: false },
})

const emit = defineEmits([
  'update-active-tool',
  'update-beat-top',
  'update-beat-bottom',
  'update-pickup-enabled',
  'update-pickup-beats',
  'zoom-left',
  'zoom-right',
  'update-snap',
  'copy-selection',
  'paste-at-playhead',
  'loop-to-selection',
  'update-bars-no-pickup',
  'decrement-bars-no-pickup',
  'increment-bars-no-pickup',
])

const { t } = useI18n()
const infoExpanded = ref(Boolean(props.forceExpanded))
const isMobile = computed(() => Boolean(props.compact))
const isSidebar = computed(() => Boolean(props.sidebar))
const activeToolLabel = computed(() => (String(props.activeTool) === 'select' ? 'Select' : 'Move'))
const beatBottomItems = TIMELINE_LAYOUT.topRow.beatBottomItems
const pickupMax = computed(() => {
  const top = Number.parseInt(String(props.beatTop), 10)
  const maxByBeat = Number.isFinite(top) && top > 1 ? top - 1 : 1
  return Math.max(1, Math.min(9, maxByBeat))
})

function updateBeatTopFromOptions(v) {
  const parsed = Number.parseInt(String(v), 10)
  emit('update-beat-top', Number.isFinite(parsed) && parsed > 0 ? parsed : 1)
}

function updateBeatBottomFromOptions(v) {
  const parsed = Number.parseInt(String(v), 10)
  emit('update-beat-bottom', beatBottomItems.includes(parsed) ? parsed : 4)
}

function updatePickupBeatsFromOptions(v) {
  const parsed = Number.parseInt(String(v), 10)
  if (!Number.isFinite(parsed)) return
  const next = Math.max(0, Math.min(pickupMax.value, parsed))
  emit('update-pickup-beats', next)
}

watch(
  () => props.forceExpanded,
  (forceExpanded) => {
    if (forceExpanded) infoExpanded.value = true
  },
  { immediate: true },
)
</script>

<style scoped>
.timeline-info {
  background: var(--app-layer-3);
  border: 0;
  border-radius: 0;
  box-shadow: none;
  min-height: 40px;
  padding: 4px 6px 0;
}

.timeline-info.is-sidebar {
  min-height: 0;
  padding: 0;
  background: transparent;
}

.timeline-sidebar-shell {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.timeline-sidebar-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.timeline-sidebar-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border: 1px solid color-mix(in srgb, var(--color-border) 86%, transparent);
  background: color-mix(in srgb, var(--color-surface) 95%, var(--color-surface-2) 5%);
  border-radius: 12px;
}

.timeline-sidebar-title {
  font-size: 11px;
  line-height: 1;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  font-weight: 800;
}

.timeline-sidebar-grid {
  display: grid;
  gap: 8px;
}

.timeline-sidebar-grid-tools,
.timeline-sidebar-grid-actions {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.timeline-info.is-sidebar .timeline-sidebar-grid-tools,
.timeline-info.is-sidebar .timeline-sidebar-grid-actions {
  grid-template-columns: minmax(0, 1fr);
}

.timeline-sidebar-options-btn {
  min-width: 28px;
  padding-inline: 0;
}

.timeline-sidebar-options-menu {
  min-width: 188px;
  border: 1px solid color-mix(in srgb, var(--color-border) 86%, transparent);
  border-radius: 12px;
  background: color-mix(in srgb, var(--color-surface) 97%, var(--color-surface-2) 3%);
}

.timeline-inline-options-menu {
  min-width: 188px;
  border: 1px solid color-mix(in srgb, var(--color-border) 86%, transparent);
  border-radius: 12px;
  background: color-mix(in srgb, var(--color-surface) 97%, var(--color-surface-2) 3%);
  box-shadow: 0 16px 32px rgb(8 10 14 / 0.34);
}

.timeline-sidebar-options-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.timeline-sidebar-options-label {
  font-size: 11px;
  line-height: 1;
  color: rgb(230 236 244 / 0.88);
  font-weight: 700;
}

.timeline-sidebar-inline-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

.timeline-sidebar-meta-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
}

.timeline-info-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px;
  border: 1px solid color-mix(in srgb, var(--color-border) 88%, transparent);
  border-radius: 10px;
  background: color-mix(in srgb, var(--color-surface) 94%, var(--color-surface-2) 6%);
  color: var(--color-text);
  text-align: left;
}

.timeline-info-toggle-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.timeline-info-toggle-title {
  font-size: 12px;
  line-height: 1;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.timeline-info-toggle-summary {
  font-size: 12px;
  line-height: 1.2;
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.timeline-info-toggle-icon {
  flex: 0 0 auto;
  font-size: 16px;
  line-height: 1;
  color: var(--color-text-muted);
  transition: transform var(--ui-fast);
}

.timeline-info-toggle-icon.is-open {
  transform: rotate(180deg);
}

.timeline-info-shell {
  display: flex;
  align-items: stretch;
  gap: 6px;
  flex-wrap: wrap;
}

.timeline-group {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  border: 1px solid rgb(255 255 255 / 0.08);
  border-radius: 12px;
  background:
    linear-gradient(180deg, rgb(42 50 63 / 0.92), rgb(31 38 47 / 0.95));
  min-height: 32px;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.03);
}

.timeline-group-tools {
  min-width: 0;
}

.timeline-group-flat {
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.timeline-group-params {
  margin-left: auto;
}

.timeline-group-row {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
}

.timeline-group-row-params {
  justify-content: flex-end;
}

.timeline-group-label {
  font-size: 9px;
  line-height: 1;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  font-weight: 800;
}

.timeline-tool {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 42px;
  height: 24px;
  border-radius: var(--radius-sm);
  border: 1px solid rgb(255 255 255 / 0.08);
  background: var(--app-grad-control);
  cursor: pointer;
  user-select: none;
  padding: 0 8px;
  gap: 5px;
  transition:
    border-color var(--ui-fast),
    box-shadow var(--ui-fast),
    background-color var(--ui-fast),
    transform var(--ui-fast);
}

.timeline-tool-wide {
  min-width: 68px;
}

.timeline-tool-segment,
.timeline-tool-action {
  min-width: 0;
  width: 100%;
  height: 28px;
}

.timeline-tool:hover {
  background: var(--app-grad-control-hover);
}

.timeline-tool.is-active {
  border-color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 16%, var(--color-surface) 84%);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-primary) 68%, transparent);
}

.timeline-tool-input {
  position: absolute;
  opacity: 0;
  width: 1px;
  height: 1px;
}

.timeline-tool-icon {
  font-size: 12px;
  line-height: 1;
  opacity: 0.92;
  color: rgb(224 231 240 / 0.72);
}

.timeline-tool-label {
  font-size: 10px;
  line-height: 1;
  font-weight: 700;
  color: rgb(224 231 240 / 0.72);
}

.timeline-tool.is-active .timeline-tool-icon {
  opacity: 1;
  color: var(--color-text);
}

.timeline-tool.is-active .timeline-tool-label {
  color: var(--color-text);
}

.timeline-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 84px;
  height: 24px;
  border: 1px solid rgb(255 255 255 / 0.08);
  border-radius: 999px;
  background: var(--app-grad-control);
  padding: 0 10px;
  color: var(--color-text);
}

.timeline-chip-label {
  font-size: 10px;
  font-weight: 700;
  color: rgb(230 236 244 / 0.88);
}

.timeline-chip-value {
  font-size: 10px;
  font-weight: 800;
}

.timeline-chip.is-active {
  border-color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 14%, var(--color-surface) 86%);
}

.timeline-chip-wide {
  width: 100%;
  justify-content: space-between;
}

.timeline-chip-sidebar-toggle {
  min-width: 92px;
  justify-content: space-between;
}

.timeline-stepper {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding-left: 0;
  border-left: 0;
}

.timeline-stepper-sidebar {
  width: 100%;
  justify-content: space-between;
  padding-left: 0;
  border-left: 0;
}

.timeline-stepper-label {
  font-size: 10px;
  font-weight: 700;
  color: rgb(230 236 244 / 0.88);
}

.timeline-options-inline-btn {
  min-width: 24px;
  width: 24px;
  height: 24px;
  padding: 0;
}

.bars-count-input {
  width: 62px;
  min-width: 62px;
}

.bars-adjust-btn {
  min-width: 22px;
  height: 22px;
  padding: 0;
}

.timeline-info :deep(.v-field) {
  --v-input-control-height: 22px;
  min-height: 22px;
}

.timeline-info :deep(.v-field__input) {
  min-height: 22px;
  padding-top: 0;
  padding-bottom: 0;
}

.bars-adjust-btn :deep(.v-btn__content),
.timeline-options-inline-btn :deep(.v-btn__content),
.bars-count-input :deep(.v-field__input),
.bars-count-input :deep(input[type='number']) {
  color: rgb(230 236 244 / 0.88);
}

.bars-count-input :deep(input[type='number']) {
  -moz-appearance: textfield;
}

.bars-count-input :deep(input[type='number']::-webkit-outer-spin-button),
.bars-count-input :deep(input[type='number']::-webkit-inner-spin-button) {
  -webkit-appearance: none;
  margin: 0;
}

@media (max-width: 860px) {
  .timeline-info.is-mobile {
    min-height: 0;
  }

  .timeline-info.is-mobile .timeline-info-shell {
    margin-top: 8px;
    flex-direction: column;
    gap: 6px;
  }

  .timeline-info.is-mobile .timeline-group-params {
    margin-left: 0;
  }

  .timeline-info.is-mobile .timeline-group {
    width: 100%;
    min-height: 0;
    justify-content: flex-start;
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
  }

  .timeline-info.is-mobile .timeline-group-label {
    min-width: 46px;
  }

  .timeline-info.is-mobile .timeline-group-row,
  .timeline-info.is-mobile .timeline-group-row-params {
    width: 100%;
    justify-content: flex-start;
  }

  .timeline-info.is-mobile .timeline-stepper {
    padding-left: 0;
    border-left: 0;
  }
}
</style>
