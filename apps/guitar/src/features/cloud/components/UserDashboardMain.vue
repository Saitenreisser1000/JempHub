<template>
  <section class="dashboard-main">
    <div class="dashboard-header">
      <div>
        <h1 class="dashboard-title">{{ dashboardTitle }}</h1>
      </div>
      <div class="dashboard-header-actions">
        <v-btn variant="outlined" prepend-icon="mdi-cog" @click="emit('open-preferences')">Preferences</v-btn>
        <v-btn variant="outlined" prepend-icon="mdi-account-multiple" @click="emit('open-connections')">Friends</v-btn>
        <v-btn color="primary" prepend-icon="mdi-arrow-left" @click="emit('close-dashboard')">Zurück zum Editor</v-btn>
      </div>
    </div>

    <v-alert
      v-if="!signedIn"
      type="info"
      variant="tonal"
      class="mb-4"
      text="Du bist nicht eingeloggt. Melde dich an, um Cloud-Library und Verbindungen zu sehen."
    />

    <div class="dashboard-grid">
      <v-card
        rounded="lg"
        variant="tonal"
        class="dashboard-card dashboard-card-clickable"
        :class="{ 'is-active': activePanel === 'profile' }"
        @click="emit('select-panel', 'profile')"
      >
        <v-card-title class="dashboard-card-title">Profil</v-card-title>
        <v-card-text class="d-flex flex-column ga-2">
          <div><strong>Name:</strong> {{ displayName }}</div>
          <div><strong>E-Mail:</strong> {{ emailLabel }}</div>
          <div><strong>Instrument:</strong> {{ instrumentLabel }}</div>
          <v-btn
            v-if="!signedIn"
            color="primary"
            variant="flat"
            prepend-icon="mdi-login"
            @click="emit('open-auth')"
          >
            Login
          </v-btn>
        </v-card-text>
      </v-card>

      <v-card
        rounded="lg"
        variant="tonal"
        class="dashboard-card dashboard-card-clickable"
        :class="{ 'is-active': activePanel === 'library' }"
        @click="emit('select-panel', 'library')"
      >
        <v-card-title class="dashboard-card-title">Library</v-card-title>
        <v-card-text class="d-flex flex-column ga-2">
          <div><strong>Total:</strong> {{ totalItems }}</div>
          <div><strong>Public:</strong> {{ visibilityStats.public }}</div>
          <div><strong>Connections:</strong> {{ visibilityStats.connections }}</div>
          <div><strong>Private:</strong> {{ visibilityStats.private }}</div>
          <div class="text-caption text-medium-emphasis">Zuletzt aktualisiert: {{ lastUpdatedLabel }}</div>
          <div class="text-caption text-medium-emphasis">Library ist rechts dauerhaft eingeblendet.</div>
        </v-card-text>
      </v-card>

      <v-card
        rounded="lg"
        variant="tonal"
        class="dashboard-card dashboard-card-clickable"
        :class="{ 'is-active': activePanel === 'categories' }"
        @click="emit('select-panel', 'categories')"
      >
        <v-card-title class="dashboard-card-title">Kategorien</v-card-title>
        <v-card-text>
          <div v-if="topCategories.length" class="d-flex flex-column ga-1">
            <div v-for="entry in topCategories" :key="entry.label">
              <strong>{{ entry.label }}:</strong> {{ entry.count }}
            </div>
          </div>
          <div v-else class="text-medium-emphasis">Noch keine Kategorien vorhanden.</div>
        </v-card-text>
      </v-card>

      <v-card
        rounded="lg"
        variant="tonal"
        class="dashboard-card dashboard-card-clickable"
        :class="{ 'is-active': activePanel === 'connections' }"
        @click="emit('select-panel', 'connections')"
      >
        <v-card-title class="dashboard-card-title">Connections</v-card-title>
        <v-card-text class="d-flex flex-column ga-2">
          <div><strong>Freunde:</strong> {{ acceptedCount }}</div>
          <div><strong>Anfragen erhalten:</strong> {{ incomingCount }}</div>
          <div><strong>Anfragen gesendet:</strong> {{ outgoingCount }}</div>
          <div><strong>Songname:</strong> {{ songLabel }}</div>
        </v-card-text>
      </v-card>

      <v-card
        rounded="lg"
        variant="tonal"
        class="dashboard-card dashboard-card-clickable"
        :class="{ 'is-active': activePanel === 'share' }"
        @click="emit('select-panel', 'share')"
      >
        <v-card-title class="dashboard-card-title">Share</v-card-title>
        <v-card-text class="d-flex flex-column ga-2">
          <div><strong>Kontakte:</strong> {{ shareCount }}</div>
          <div class="text-caption text-medium-emphasis">Namen, E-Mail und WhatsApp verwalten</div>
        </v-card-text>
      </v-card>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  signedIn: { type: Boolean, default: false },
  user: { type: Object, default: null },
  profile: { type: Object, default: null },
  instrumentType: { type: String, default: 'guitar' },
  libraryItems: { type: Array, default: () => [] },
  acceptedCount: { type: Number, default: 0 },
  incomingCount: { type: Number, default: 0 },
  outgoingCount: { type: Number, default: 0 },
  shareCount: { type: Number, default: 0 },
  songName: { type: String, default: '' },
  activePanel: { type: String, default: 'library' },
})

const emit = defineEmits([
  'open-auth',
  'open-connections',
  'open-preferences',
  'select-panel',
  'close-dashboard',
])

const displayName = computed(
  () =>
    String(
      props.profile?.display_name ||
      props.user?.user_metadata?.display_name ||
      props.user?.email ||
      'Gast',
    ),
)
const nickname = computed(() => String(displayName.value || 'User').split('@')[0].trim() || 'User')
const dashboardTitle = computed(() => `${nickname.value}'s dashboard`)
const emailLabel = computed(() => String(props.user?.email || '-'))
const instrumentLabel = computed(() => String(props.instrumentType || 'guitar'))
const songLabel = computed(() => String(props.songName || '-'))
const totalItems = computed(() => (Array.isArray(props.libraryItems) ? props.libraryItems.length : 0))

const visibilityStats = computed(() => {
  const out = { public: 0, connections: 0, private: 0 }
  for (const item of props.libraryItems || []) {
    const v = String(item?.visibility || 'private')
    if (v === 'public') out.public += 1
    else if (v === 'connections') out.connections += 1
    else out.private += 1
  }
  return out
})

const topCategories = computed(() => {
  const countByCategory = new Map()
  for (const item of props.libraryItems || []) {
    const key = String(item?.category || 'Unkategorisiert').trim() || 'Unkategorisiert'
    countByCategory.set(key, (countByCategory.get(key) || 0) + 1)
  }
  return [...countByCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, count]) => ({ label, count }))
})

const lastUpdatedLabel = computed(() => {
  const items = Array.isArray(props.libraryItems) ? props.libraryItems : []
  if (!items.length) return '-'
  const sorted = [...items].sort((a, b) => {
    const at = new Date(a?.updated_at || 0).getTime()
    const bt = new Date(b?.updated_at || 0).getTime()
    return bt - at
  })
  const first = sorted[0]
  const title = String(first?.title || 'Untitled')
  return title
})
</script>

<style scoped>
.dashboard-main {
  height: 100%;
  overflow: auto;
  padding: clamp(12px, 2vw, 22px);
  background: linear-gradient(180deg, var(--color-surface-2) 0%, var(--color-surface) 100%);
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 14px;
}

.dashboard-title {
  margin: 0;
  font-size: clamp(22px, 2.2vw, 30px);
  line-height: 1.15;
}

.dashboard-header-actions {
  display: inline-flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.dashboard-card {
  min-height: 160px;
}

.dashboard-card-clickable {
  cursor: pointer;
  border: 1px solid rgb(0 0 0 / 10%);
  transition: border-color 120ms ease, box-shadow 120ms ease;
}

.dashboard-card-clickable:hover {
  border-color: rgb(0 0 0 / 24%);
}

.dashboard-card-clickable.is-active {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 1px rgb(25 118 210 / 30%);
}

.dashboard-card-title {
  font-size: 14px;
  font-weight: 700;
}

@media (max-width: 900px) {
  .dashboard-header {
    flex-direction: column;
  }

  .dashboard-header-actions {
    justify-content: flex-start;
  }

  .dashboard-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
