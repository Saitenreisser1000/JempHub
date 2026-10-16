<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fb-tone-dot-context-menu"
      role="menu"
      :aria-label="title"
      :style="{ left: `${x}px`, top: `${y}px` }"
      @pointerdown.stop
      @contextmenu.prevent
    >
      <div class="fb-tone-dot-context-title">
        {{ title }}
      </div>
      <div
        v-for="item in items"
        :key="`tone-dot-context-${item.noteKey}`"
        class="fb-tone-dot-context-item"
      >
        <button class="item-select" type="button" role="menuitem" @click="emit('select-item', item.noteKey)">
          <span class="item-copy">
            <span class="item-label">{{ item.label }}</span>
            <span class="item-timing">{{ item.timing }}</span>
          </span>
          <span class="item-action">{{ selectLabel }}</span>
        </button>
        <button class="item-delete" type="button" role="menuitem" :aria-label="`${deleteLabel}: ${item.label}`"
          :title="deleteLabel" @click="emit('delete-item', item.noteKey)">
          ×
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
defineOptions({ name: 'FretboardToneDotContextMenu' })

defineProps({
  open: { type: Boolean, default: false },
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  title: { type: String, default: '' },
  items: { type: Array, default: () => [] },
  selectLabel: { type: String, default: 'Select' },
  deleteLabel: { type: String, default: 'Delete' },
})

const emit = defineEmits(['select-item', 'delete-item'])
</script>

<style scoped>
.fb-tone-dot-context-menu {
  position: fixed;
  z-index: 1300;
  min-width: 240px;
  max-width: min(340px, calc(100vw - 16px));
  max-height: min(50vh, 360px);
  overflow: auto;
  background: linear-gradient(
    180deg,
    var(--app-layer-1, #2a313b),
    color-mix(in srgb, var(--app-layer-0, #1e242c) 90%, black 10%)
  );
  border: 1px solid rgba(220, 233, 248, 0.2);
  border-radius: 10px;
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.35);
  padding: 6px;
}

.fb-tone-dot-context-title {
  font-size: 12px;
  font-weight: 800;
  color: rgba(210, 225, 242, 0.9);
  padding: 4px 6px 6px;
}

.fb-tone-dot-context-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 4px;
  border-radius: 7px;
  background: transparent;
  color: rgba(236, 243, 250, 0.96);
}

.fb-tone-dot-context-item:hover {
  background: var(--app-glass-4);
}

.item-select,
.item-delete {
  min-height: 44px;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.item-select {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 7px 8px;
  text-align: left;
}

.item-delete {
  flex: 0 0 44px;
  width: 44px;
  color: rgba(255, 176, 176, 0.98);
  font-size: 19px;
  font-weight: 800;
}

.fb-tone-dot-context-item .item-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.item-timing {
  overflow: hidden;
  color: var(--app-text-dim);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fb-tone-dot-context-item .item-action {
  color: var(--color-primary);
  font-weight: 700;
  flex-shrink: 0;
}
</style>
