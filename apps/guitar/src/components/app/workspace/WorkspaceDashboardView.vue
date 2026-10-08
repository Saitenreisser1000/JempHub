<template>
  <div class="app-dashboard-main">
    <UserDashboardMain :signed-in="signedIn" :user="user" :profile="profile" :instrument-type="instrumentType"
      :library-items="libraryItems" :accepted-count="acceptedCount" :incoming-count="incomingCount"
      :outgoing-count="outgoingCount" :share-count="shareCount" :song-name="songName" :active-panel="activePanel"
      @open-auth="emit('open-auth')" @open-connections="emit('open-connections')"
      @open-preferences="emit('open-preferences')" @select-panel="(panel) => emit('select-panel', panel)"
      @close-dashboard="emit('close-dashboard')" />
    <div class="app-dashboard-right">
      <LibraryPanel v-if="activePanel === 'library'"
        @update-required-frets="(value) => emit('update-required-frets', value)" />
      <DashboardDetailPanel v-else :panel="activePanel" :signed-in="signedIn" :user="user" :profile="profile"
        :instrument-type="instrumentType" :library-items="libraryItems" :accepted="accepted" :incoming="incoming"
        :outgoing="outgoing" :user-label-fn="userLabelFn" :profile-saving="profileSaving"
        @open-auth="emit('open-auth')" @save-profile="(payload) => emit('save-profile', payload)" />
    </div>
  </div>
</template>

<script setup>
import { LibraryPanel, DashboardDetailPanel, UserDashboardMain } from '@/features/cloud'

defineProps({
  signedIn: { type: Boolean, default: false },
  user: { type: Object, default: null },
  profile: { type: Object, default: null },
  instrumentType: { type: String, default: '' },
  libraryItems: { type: Array, default: () => [] },
  acceptedCount: { type: Number, default: 0 },
  incomingCount: { type: Number, default: 0 },
  outgoingCount: { type: Number, default: 0 },
  shareCount: { type: Number, default: 0 },
  songName: { type: String, default: '' },
  activePanel: { type: String, default: 'library' },
  accepted: { type: Array, default: () => [] },
  incoming: { type: Array, default: () => [] },
  outgoing: { type: Array, default: () => [] },
  userLabelFn: { type: Function, required: true },
  profileSaving: { type: Boolean, default: false },
})

const emit = defineEmits([
  'open-auth',
  'open-connections',
  'open-preferences',
  'select-panel',
  'close-dashboard',
  'save-profile',
  'update-required-frets',
])
</script>

<style scoped>
.app-dashboard-main {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  flex: 1 1 auto;
  min-height: 0;
}

.app-dashboard-right {
  min-width: 0;
  min-height: 0;
  border-left: 1px solid var(--app-border);
  overflow: hidden;
}

@media (max-width: 900px) {
  .app-dashboard-main {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
  }

  .app-dashboard-right {
    border-left: 0;
    border-top: 1px solid #d6d6d6;
  }
}
</style>
