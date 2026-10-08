<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fb-tone-dot-context-menu"
      :style="{ left: `${x}px`, top: `${y}px` }"
      @pointerdown.stop
      @contextmenu.prevent
    >
      <div class="fb-tone-dot-context-title">
        S{{ string }} F{{ fret }}
      </div>
      <button
        v-for="item in items"
        :key="`tone-dot-context-${item.noteKey}`"
        class="fb-tone-dot-context-item"
        type="button"
        @click="emit('delete-item', item.noteKey)"
      >
        <span class="item-label">{{ item.label }}</span>
        <span class="item-action">{{ deleteLabel }}</span>
      </button>
    </div>
  </Teleport>
</template>

<script setup>
defineOptions({ name: 'FretboardToneDotContextMenu' })

defineProps({
  open: { type: Boolean, default: false },
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  string: { type: Number, default: 0 },
  fret: { type: Number, default: 0 },
  items: { type: Array, default: () => [] },
  deleteLabel: { type: String, default: 'Delete' },
})

const emit = defineEmits(['delete-item'])
</script>

<style scoped>
.fb-tone-dot-context-menu {
  position: fixed;
  z-index: 1300;
  min-width: 240px;
  max-width: min(340px, calc(100vw - 16px));
  max-height: min(50vh, 360px);
  overflow: auto;
  background: linear-gradient(180deg, color-mix(in srgb, var(--app-layer-1) 96%, transparent), color-mix(in srgb, var(--app-layer-0) 96%, transparent));
  border: 1px solid rgba(220, 233, 248, 0.2);
  border-radius: 10px;
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.35);
  padding: 6px;
}

.fb-tone-dot-context-title {
  font-size: 11px;
  font-weight: 800;
  color: rgba(210, 225, 242, 0.9);
  padding: 4px 6px 6px;
}

.fb-tone-dot-context-item {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  border: 0;
  border-radius: 7px;
  padding: 7px 8px;
  background: transparent;
  color: rgba(236, 243, 250, 0.96);
  text-align: left;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.fb-tone-dot-context-item:hover {
  background: var(--app-glass-4);
}

.fb-tone-dot-context-item .item-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fb-tone-dot-context-item .item-action {
  color: rgba(255, 176, 176, 0.98);
  font-weight: 700;
  flex-shrink: 0;
}
</style>
