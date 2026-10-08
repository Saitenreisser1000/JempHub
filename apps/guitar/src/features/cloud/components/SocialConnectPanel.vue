<script setup>
import { computed, ref, watch } from 'vue'
import { useConnectionsStore } from '@/store/useConnections'

const props = defineProps({
  signedIn: { type: Boolean, default: false },
})

const connections = useConnectionsStore()
const query = ref('')
const pendingIds = ref(new Set())

const candidates = computed(() => connections.searchResults || [])

function avatarFor(profile) {
  const name = encodeURIComponent(String(profile?.display_name || profile?.id || 'User'))
  return `https://ui-avatars.com/api/?name=${name}&background=1f2937&color=ffffff&size=128&bold=true`
}

async function refreshCandidates() {
  if (!props.signedIn) return
  await connections.searchProfiles(query.value)
}

async function sendRequest(profileId) {
  const id = String(profileId || '')
  if (!id || pendingIds.value.has(id)) return
  const next = new Set(pendingIds.value)
  next.add(id)
  pendingIds.value = next
  await connections.sendRequest(id)
  await refreshCandidates()
  const done = new Set(pendingIds.value)
  done.delete(id)
  pendingIds.value = done
}

watch(
  () => props.signedIn,
  async (signedIn) => {
    if (!signedIn) return
    await refreshCandidates()
  },
  { immediate: true },
)

watch(
  () => query.value,
  async () => {
    await refreshCandidates()
  },
)
</script>

<template>
  <v-card rounded="lg" variant="tonal" class="social-connect-panel">
    <v-card-title class="d-flex align-center justify-space-between">
      <span>Social</span>
      <v-btn
        size="small"
        variant="text"
        icon="mdi-refresh"
        :disabled="!signedIn || connections.loading"
        @click="refreshCandidates"
      />
    </v-card-title>
    <v-card-text class="social-connect-content">
      <v-alert
        v-if="!signedIn"
        type="info"
        variant="tonal"
        text="Login erforderlich, um Connect-Anfragen zu senden."
      />

      <template v-else>
        <v-text-field
          v-model="query"
          density="compact"
          variant="outlined"
          prepend-inner-icon="mdi-magnify"
          hide-details
          placeholder="Name suchen (ab 2 Zeichen) oder Vorschläge anzeigen"
          class="mb-3"
        />

        <div v-if="connections.error" class="text-error text-caption mb-2">
          {{ String(connections.error?.message ?? connections.error) }}
        </div>

        <div class="social-grid">
          <v-card
            v-for="profile in candidates"
            :key="profile.id"
            variant="flat"
            rounded="lg"
            class="social-user-card"
          >
            <div class="social-user-head">
              <v-avatar size="40">
                <v-img :src="avatarFor(profile)" :alt="String(profile.display_name || profile.id || 'User')" />
              </v-avatar>
              <div class="social-user-meta">
                <div class="social-user-name">{{ profile.display_name || 'Unknown user' }}</div>
              </div>
            </div>
            <v-btn
              color="primary"
              size="small"
              variant="flat"
              block
              :loading="pendingIds.has(String(profile.id || ''))"
              :disabled="pendingIds.has(String(profile.id || ''))"
              @click="sendRequest(profile.id)"
            >
              Connect-Anfrage
            </v-btn>
          </v-card>
        </div>

        <div v-if="!connections.loading && candidates.length === 0" class="text-caption text-medium-emphasis mt-2">
          Keine Vorschläge gefunden.
        </div>
      </template>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.social-connect-panel {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.social-connect-content {
  min-height: 0;
  overflow: auto;
}

.social-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.social-user-card {
  padding: 8px;
  border: 1px solid rgb(0 0 0 / 8%);
}

.social-user-head {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.social-user-meta {
  min-width: 0;
}

.social-user-name {
  font-size: 13px;
  font-weight: 700;
  line-height: 1.2;
}

@media (max-width: 1100px) {
  .social-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
