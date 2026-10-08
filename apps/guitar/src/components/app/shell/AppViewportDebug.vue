<template>
  <div class="app-viewport-debug" :class="{ 'is-open': open }">
    <v-btn size="x-small" variant="tonal" class="app-viewport-debug-toggle" prepend-icon="mdi-cellphone-cog"
      @click="emit('update:open', !open)">
      Viewport
    </v-btn>
    <div v-if="open" class="app-viewport-debug-panel">
      <div class="app-viewport-debug-title">Device Landscape Preset</div>
      <v-select :model-value="preset"
        :items="presets.map((p) => ({ title: p.label, value: p.key }))" density="compact" hide-details
        variant="outlined" @update:model-value="(v) => emit('apply-preset', v)" />
      <div class="app-viewport-debug-info">
        <div>effective width: {{ Math.round(effectiveViewportWidthPx) }}px</div>
        <div>effective: {{ Math.round(effectiveViewportHeightPx) }}px</div>
        <div>live: {{ Math.round(viewportHeightUnitPx * 100) }}px</div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  open: { type: Boolean, default: false },
  preset: { type: String, default: 'off' },
  presets: { type: Array, default: () => [] },
  effectiveViewportWidthPx: { type: Number, default: 0 },
  effectiveViewportHeightPx: { type: Number, default: 0 },
  viewportHeightUnitPx: { type: Number, default: 0 },
})

const emit = defineEmits(['update:open', 'apply-preset'])
</script>

<style scoped>
.app-viewport-debug {
  position: fixed;
  right: 12px;
  bottom: calc(14px + var(--app-safe-bottom));
  z-index: 1400;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.app-viewport-debug-toggle {
  text-transform: none;
}

.app-viewport-debug-panel {
  width: min(280px, 84vw);
  padding: 8px;
  border: 1px solid var(--app-debug-panel-border);
  border-radius: 10px;
  background: var(--app-debug-panel-bg);
  color: var(--app-text);
  backdrop-filter: blur(4px);
}

.app-viewport-debug-title {
  font-size: 12px;
  margin-bottom: 6px;
}

.app-viewport-debug-info {
  margin-top: 6px;
  font-size: 11px;
  opacity: 0.82;
}
</style>
