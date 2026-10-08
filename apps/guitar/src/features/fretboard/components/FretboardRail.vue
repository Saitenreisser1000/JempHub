<script setup>
const props = defineProps({
  title: { type: String, default: '' },
  railClass: { type: [String, Array, Object], default: '' },
  hostId: { type: String, required: true },
  hostClass: { type: [String, Array, Object], required: true },
})
</script>

<template>
  <div class="fretboard-card-rail" :class="props.railClass">
    <div class="fretboard-rail-title">{{ props.title }}</div>
    <div :id="props.hostId" :class="props.hostClass" />
  </div>
</template>

<style scoped>
.fretboard-card-rail {
  display: flex;
  flex-direction: column;
  background: color-mix(in srgb, var(--color-surface-2) 74%, transparent);
  border-left: 1px solid color-mix(in srgb, var(--color-border) 70%, transparent);
  border-right: 1px solid color-mix(in srgb, var(--color-border) 70%, transparent);
}

.fretboard-rail-title {
  padding: 8px 8px 6px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  text-align: center;
}

.fretboard-left-rail-host,
.fretboard-right-rail-host {
  width: 100%;
  height: 100%;
  flex: 1 1 auto;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}
</style>
