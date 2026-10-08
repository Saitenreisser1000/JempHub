<script setup>
defineProps({ label: String, options: Array, modelValue: null })
defineEmits(['update:modelValue'])
</script>

<template>
  <div class="group">
    <div class="label">{{ label }}</div>
    <div class="chips" role="radiogroup">
      <button
        v-for="o in options"
        :key="String(o.value)"
        type="button"
        role="radio"
        :aria-checked="o.value === modelValue"
        :class="['chip', { on: o.value === modelValue }]"
        @click="$emit('update:modelValue', o.value)"
      >
        {{ o.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.group { margin-bottom: 18px; }
.label { font-size: .85rem; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); margin-bottom: 8px; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip { border: 2px solid var(--line); background: var(--card); border-radius: 999px; padding: 10px 16px; min-height: 44px; }
.chip.on { border-color: var(--primary); background: color-mix(in srgb, var(--primary) 16%, var(--card)); font-weight: 700; }
</style>
