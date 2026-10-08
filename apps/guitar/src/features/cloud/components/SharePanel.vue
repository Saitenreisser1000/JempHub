<script setup>
defineOptions({ name: 'SharePanel' })

const props = defineProps({
  hasNotes: { type: Boolean, default: false },
  modelValue: { type: String, default: '' },
})

const emit = defineEmits([
  'update:modelValue',
  'export-musicxml',
  'export-midi',
  'export-pdf',
  'submit',
])
</script>

<template>
  <div class="pa-4">
    <div class="text-h6 mb-2">Share</div>
    <div class="text-body-2 mb-3">Export and share your current project.</div>
    <div class="d-flex flex-wrap ga-2">
      <v-btn prepend-icon="mdi-file-music-outline" variant="tonal" :disabled="!props.hasNotes" @click="emit('export-musicxml')">
        MusicXML
      </v-btn>
      <v-btn prepend-icon="mdi-file-music" variant="tonal" :disabled="!props.hasNotes" @click="emit('export-midi')">
        MIDI
      </v-btn>
      <v-btn prepend-icon="mdi-file-pdf-box" variant="tonal" :disabled="!props.hasNotes" @click="emit('export-pdf')">
        PDF
      </v-btn>
    </div>
    <v-text-field
      :model-value="props.modelValue"
      class="mt-4"
      label="E-Mail"
      type="email"
      density="compact"
      variant="outlined"
      placeholder="name@example.com"
      hide-details
      @update:model-value="(v) => emit('update:modelValue', String(v ?? ''))"
    />
    <div class="d-flex justify-end mt-3">
      <v-btn color="primary" variant="flat" @click="emit('submit')">
        Submit
      </v-btn>
    </div>
  </div>
</template>
