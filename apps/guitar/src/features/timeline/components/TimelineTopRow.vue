<template>
  <div class="timeline-top-row" :class="{ 'is-sidebar': sidebar }">
    <div v-if="sidebar && (transportVisible || timelineVisible)" class="timeline-options-btn-wrap is-sidebar">
      <div class="timeline-options-sidebar" :style="optionsMenuStyle">
        <section class="timeline-sidebar-section">
          <div class="timeline-sidebar-title">Setup</div>

          <div class="timeline-zoom-toolbar">
            <span class="timeline-sidebar-caption">Zoom</span>
            <div class="timeline-top-zoom d-flex align-center ga-1">
              <v-btn size="x-small" variant="tonal" class="zoom-adjust-btn" :title="'Zoom -'" @click="emit('zoom-left')">
                &lt;
              </v-btn>
              <div class="text-caption zoom-value">zoom</div>
              <v-btn size="x-small" variant="tonal" class="zoom-adjust-btn" :title="'Zoom +'" @click="emit('zoom-right')">
                &gt;
              </v-btn>
            </div>
          </div>

          <div class="timeline-meter-chip">
            <span class="timeline-sidebar-caption">{{ t('modeSelector.beat') }}</span>
            <div class="timeline-meter-inputs">
              <v-text-field density="compact" hide-details type="number" min="1" step="1" style="width: 72px"
                :model-value="beatTop" @update:model-value="updateBeatTopFromOptions" />
              <v-select density="compact" hide-details style="width: 72px" :items="beatBottomItems"
                :model-value="beatBottom" @update:model-value="updateBeatBottomFromOptions" />
            </div>
          </div>

          <div class="timeline-toggle-grid">
            <div class="timeline-toggle-chip timeline-toggle-chip-with-controls" :class="{ 'is-active': pickupEnabled }">
              <button class="timeline-toggle-main" type="button" @click="emit('update-pickup-enabled', !pickupEnabled)">
                <span class="timeline-toggle-label">Pickup</span>
                <span class="timeline-toggle-value">{{ pickupEnabled ? 'On' : 'Off' }}</span>
              </button>
              <div class="timeline-pickup-controls">
                <v-text-field density="compact" hide-details type="number" min="0" :max="pickupMax" step="1"
                  style="width: 64px"
                  :model-value="pickupBeats" @update:model-value="updatePickupBeatsFromOptions" />
              </div>
            </div>
          </div>

        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { TIMELINE_LAYOUT } from '@/features/timeline/config/timelineLayout'
import { useI18n } from '@/i18n'

defineOptions({ name: 'TimelineTopRow' })

const props = defineProps({
  timelineVisible: { type: Boolean, default: true },
  transportVisible: { type: Boolean, default: true },
  beatTop: { type: Number, default: 4 },
  beatBottom: { type: Number, default: 4 },
  pickupEnabled: { type: Boolean, default: false },
  pickupBeats: { type: Number, default: 0 },
  snapEnabled: { type: Boolean, default: true },
  stringsCollapsed: { type: Boolean, default: false },
  sidebar: { type: Boolean, default: false },
})

const emit = defineEmits([
  'update-beat-top',
  'update-beat-bottom',
  'update-pickup-enabled',
  'update-pickup-beats',
  'update-snap',
  'update-strings-collapsed',
  'zoom-left',
  'zoom-right',
])

const { t } = useI18n()

const beatBottomItems = TIMELINE_LAYOUT.topRow.beatBottomItems
const optionsMenuStyle = computed(() => ({
  '--timeline-options-menu-min-w': `${TIMELINE_LAYOUT.topRow.optionsMenuMinWidthPx}px`,
}))
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

</script>

<style scoped>
.timeline-options-btn-wrap {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 6px;
}

.timeline-options-btn-wrap.is-sidebar {
  width: 100%;
  margin-left: 0;
  align-items: stretch;
  flex-direction: column;
}

.timeline-top-zoom {
  margin-right: 2px;
}

.timeline-top-row {
  width: 100%;
  min-height: 28px;
  display: flex;
  justify-content: flex-start;
  align-items: center;
}

.timeline-top-row.is-sidebar {
  min-height: 0;
}

.zoom-label {
  color: var(--color-text-muted);
  font-weight: 600;
}

.zoom-value {
  min-width: 28px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.zoom-adjust-btn {
  min-width: 22px;
  height: 22px;
  padding: 0;
}

.timeline-options-sidebar {
  width: 100%;
  min-width: 0;
}

.timeline-sidebar-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  border: 1px solid color-mix(in srgb, var(--color-border) 86%, transparent);
  border-radius: 12px;
  background: color-mix(in srgb, var(--color-surface) 95%, var(--color-surface-2) 5%);
}

.timeline-sidebar-title {
  font-size: 11px;
  line-height: 1;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  font-weight: 800;
}

.timeline-sidebar-caption {
  font-size: 11px;
  line-height: 1;
  color: var(--color-text-muted);
  font-weight: 700;
}

.timeline-zoom-toolbar,
.timeline-pickup-stepper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.timeline-meter-chip {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: color-mix(in srgb, var(--color-surface) 88%, var(--color-surface-2) 12%);
}

.timeline-meter-inputs,
.timeline-pickup-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

.timeline-toggle-grid {
  display: grid;
  gap: 8px;
}

.timeline-toggle-chip {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 38px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: color-mix(in srgb, var(--color-surface) 88%, var(--color-surface-2) 12%);
  color: var(--color-text);
  padding: 0 12px;
  text-align: left;
}

.timeline-toggle-chip-with-controls {
  gap: 8px;
}

.timeline-toggle-main {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border: 0;
  background: transparent;
  color: inherit;
  padding: 0;
  text-align: left;
}

.timeline-toggle-chip.is-active {
  border-color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 10%, var(--color-surface) 90%);
}

.timeline-toggle-label {
  font-size: 12px;
  font-weight: 700;
}

.timeline-toggle-value {
  font-size: 11px;
  color: var(--color-text-muted);
  font-weight: 700;
}

@media (max-width: 860px) {
  .zoom-value {
    min-width: 24px;
  }
}
</style>
