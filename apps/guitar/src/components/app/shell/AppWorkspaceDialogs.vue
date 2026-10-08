<template>
  <div>
    <v-dialog :model-value="saveAsNewOpen" max-width="520" @update:model-value="(v) => emit('update:save-as-new-open', Boolean(v))">
      <v-card rounded="lg">
        <v-card-title class="d-flex align-center justify-space-between">
          <span>Save As New</span>
          <v-btn icon="mdi-close" variant="text" @click="emit('update:save-as-new-open', false)" />
        </v-card-title>

        <v-card-text>
          <v-text-field :model-value="saveAsNewTitle" label="Title" density="compact" variant="outlined" autofocus
            @update:model-value="(v) => emit('update:save-as-new-title', String(v || ''))" />
          <v-select :model-value="saveAsNewVisibility" :items="saveAsVisibilityItems" label="Visibility"
            density="compact" variant="outlined"
            @update:model-value="(v) => emit('update:save-as-new-visibility', String(v || 'private'))" />
          <v-text-field :model-value="saveAsNewCategory" label="Category" density="compact" variant="outlined"
            @update:model-value="(v) => emit('update:save-as-new-category', String(v || ''))" />
        </v-card-text>

        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="emit('update:save-as-new-open', false)">Cancel</v-btn>
          <v-btn color="primary" variant="flat"
            :disabled="!hasNotes || !String(saveAsNewTitle ?? '').trim() || saveAsNewBusy"
            @click="emit('save-as-new')">
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog :model-value="newSongOpen" max-width="560" @update:model-value="(v) => emit('update:new-song-open', Boolean(v))">
      <v-card rounded="lg">
        <v-card-title class="d-flex align-center justify-space-between">
          <span>{{ songDialogMode === 'new' ? 'New Song' : 'Song Settings' }}</span>
          <v-btn icon="mdi-close" variant="text" @click="emit('update:new-song-open', false)" />
        </v-card-title>
        <v-card-text class="d-flex flex-column ga-3">
          <v-text-field :model-value="newSongTitle" label="Title" density="compact" variant="outlined" autofocus
            @update:model-value="(v) => emit('update:new-song-title', String(v || ''))" />
          <div class="d-flex ga-2">
            <v-text-field :model-value="newSongBeatTop" label="Beat Top" density="compact" variant="outlined"
              type="number" min="1" class="flex-1-1"
              @update:model-value="(v) => emit('update:new-song-beat-top', Number(v || 0))" />
            <v-select :model-value="newSongBeatBottom" :items="[1, 2, 4, 8]" label="Beat Bottom" density="compact"
              variant="outlined" class="flex-1-1"
              @update:model-value="(v) => emit('update:new-song-beat-bottom', Number(v || 0))" />
          </div>
          <div class="d-flex ga-2">
            <v-select :model-value="newSongKey" :items="songKeyOptions" label="Key" density="compact"
              variant="outlined" class="flex-1-1"
              @update:model-value="(v) => emit('update:new-song-key', String(v || 'C'))" />
            <v-text-field :model-value="newSongBars" label="Bars" density="compact" variant="outlined"
              type="number" min="1" class="flex-1-1"
              @update:model-value="(v) => emit('update:new-song-bars', Number(v || 0))" />
          </div>
          <div class="d-flex ga-2 align-center">
            <v-switch :model-value="newSongPickupEnabled" density="compact" hide-details inset label="Pickup"
              @update:model-value="(v) => emit('update:new-song-pickup-enabled', Boolean(v))" />
            <v-text-field :model-value="newSongPickupBeats" label="Pickup Beats" density="compact" variant="outlined"
              type="number" min="0" class="flex-1-1"
              @update:model-value="(v) => emit('update:new-song-pickup-beats', Number(v || 0))" />
          </div>
          <div class="d-flex ga-2 align-center">
            <v-switch :model-value="newSongShuffleEnabled" density="compact" hide-details inset label="Shuffle"
              @update:model-value="(v) => emit('update:new-song-shuffle-enabled', Boolean(v))" />
            <v-text-field :model-value="newSongBpm" label="BPM" density="compact" variant="outlined"
              type="number" min="30" max="260" class="flex-1-1"
              @update:model-value="(v) => emit('update:new-song-bpm', Number(v || 0))" />
          </div>
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="emit('update:new-song-open', false)">Cancel</v-btn>
          <v-btn color="primary" variant="flat" @click="emit('apply-new-song')">
            {{ songDialogMode === 'new' ? 'Create' : 'Apply' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog :model-value="preferencesOpen" max-width="520" @update:model-value="(v) => emit('update:preferences-open', Boolean(v))">
      <v-card rounded="lg">
        <v-card-title class="d-flex align-center justify-space-between">
          <span>Preferences</span>
          <v-btn icon="mdi-close" variant="text" @click="emit('update:preferences-open', false)" />
        </v-card-title>
        <v-card-text class="d-flex flex-column ga-3">
          <v-text-field :model-value="preferenceToneDuration" label="Tone duration" density="compact"
            variant="outlined" type="number" min="0.1" step="0.1"
            @update:model-value="(v) => emit('update:preference-tone-duration', Number(v || 0))" />
          <v-switch :model-value="preferenceSoundPreview" density="compact" hide-details inset label="Sound preview"
            @update:model-value="(v) => emit('update:preference-sound-preview', Boolean(v))" />
          <v-switch :model-value="preferenceDarkMode" density="compact" hide-details inset label="Dark mode"
            @update:model-value="(v) => emit('update:preference-dark-mode', Boolean(v))" />
          <v-switch :model-value="idleDotConnectionsVisible" density="compact" hide-details inset
            label="Idle dot connections"
            @update:model-value="(v) => emit('update:idle-dot-connections-visible', Boolean(v))" />
          <v-slider :model-value="idleDotConnectionsOpacity" min="0" max="1" step="0.01" thumb-label hide-details
            density="compact" :disabled="!idleDotConnectionsVisible" label="Idle dot opacity"
            @update:model-value="(v) => emit('update:idle-dot-connections-opacity', Number(v || 0))" />
          <v-select :model-value="preferenceLanguage" :items="languageItems" label="Language" density="compact"
            variant="outlined" @update:model-value="(v) => emit('update:preference-language', String(v || 'en'))" />
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="emit('update:preferences-open', false)">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
defineProps({
  saveAsNewOpen: { type: Boolean, default: false },
  saveAsNewTitle: { type: String, default: '' },
  saveAsNewVisibility: { type: String, default: 'private' },
  saveAsNewCategory: { type: String, default: '' },
  saveAsNewBusy: { type: Boolean, default: false },
  hasNotes: { type: Boolean, default: false },
  newSongOpen: { type: Boolean, default: false },
  songDialogMode: { type: String, default: 'new' },
  newSongTitle: { type: String, default: '' },
  newSongBeatTop: { type: Number, default: 4 },
  newSongBeatBottom: { type: Number, default: 4 },
  newSongKey: { type: String, default: 'C' },
  newSongBars: { type: Number, default: 2 },
  newSongPickupEnabled: { type: Boolean, default: false },
  newSongPickupBeats: { type: Number, default: 0 },
  newSongShuffleEnabled: { type: Boolean, default: false },
  newSongBpm: { type: Number, default: 120 },
  songKeyOptions: { type: Array, required: true },
  preferencesOpen: { type: Boolean, default: false },
  preferenceToneDuration: { type: Number, default: 1 },
  preferenceSoundPreview: { type: Boolean, default: false },
  preferenceDarkMode: { type: Boolean, default: false },
  idleDotConnectionsVisible: { type: Boolean, default: false },
  idleDotConnectionsOpacity: { type: Number, default: 0 },
  preferenceLanguage: { type: String, default: 'en' },
  languageItems: { type: Array, required: true },
})

const emit = defineEmits([
  'update:save-as-new-open',
  'update:save-as-new-title',
  'update:save-as-new-visibility',
  'update:save-as-new-category',
  'save-as-new',
  'update:new-song-open',
  'update:new-song-title',
  'update:new-song-beat-top',
  'update:new-song-beat-bottom',
  'update:new-song-key',
  'update:new-song-bars',
  'update:new-song-pickup-enabled',
  'update:new-song-pickup-beats',
  'update:new-song-shuffle-enabled',
  'update:new-song-bpm',
  'apply-new-song',
  'update:preferences-open',
  'update:preference-tone-duration',
  'update:preference-sound-preview',
  'update:preference-dark-mode',
  'update:idle-dot-connections-visible',
  'update:idle-dot-connections-opacity',
  'update:preference-language',
])

const saveAsVisibilityItems = [
  { title: 'Private', value: 'private' },
  { title: 'Connections', value: 'connections' },
  { title: 'Public', value: 'public' },
]
</script>

<style scoped>
.flex-1-1 {
  flex: 1 1 0;
}
</style>
