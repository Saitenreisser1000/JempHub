<template>
  <v-dialog :model-value="modelValue" max-width="760" @update:model-value="(v) => emit('update:modelValue', Boolean(v))">
    <v-card rounded="lg">
      <v-card-title class="d-flex align-center justify-space-between">
        <span>User Dashboard</span>
        <v-btn icon="mdi-close" variant="text" @click="emit('update:modelValue', false)" />
      </v-card-title>

      <v-card-text class="d-flex flex-column ga-3">
        <v-alert
          v-if="!signedIn"
          type="info"
          variant="tonal"
          text="Please sign in to see your personal dashboard."
        />

        <template v-else>
          <div class="d-flex flex-wrap ga-2 align-center">
            <v-chip color="primary" variant="tonal" prepend-icon="mdi-account">
              {{ displayName }}
            </v-chip>
            <v-chip variant="tonal" prepend-icon="mdi-email">{{ emailLabel }}</v-chip>
            <v-chip variant="tonal" prepend-icon="mdi-guitar-acoustic">{{ instrumentLabel }}</v-chip>
          </div>

          <div class="dashboard-grid">
            <v-card variant="tonal" rounded="lg">
              <v-card-title class="text-subtitle-2">Library</v-card-title>
              <v-card-text class="d-flex flex-column ga-1">
                <div>Total Items: {{ totalItems }}</div>
                <div>Public: {{ visibilityStats.public }}</div>
                <div>Connections: {{ visibilityStats.connections }}</div>
                <div>Private: {{ visibilityStats.private }}</div>
              </v-card-text>
            </v-card>

            <v-card variant="tonal" rounded="lg">
              <v-card-title class="text-subtitle-2">Categories</v-card-title>
              <v-card-text class="d-flex flex-column ga-1">
                <div v-for="entry in topCategories" :key="entry.label">
                  {{ entry.label }}: {{ entry.count }}
                </div>
                <div v-if="!topCategories.length">No categories yet.</div>
              </v-card-text>
            </v-card>
          </div>

          <div class="text-caption text-medium-emphasis">
            Last updated item: {{ lastUpdatedLabel }}
          </div>
        </template>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  signedIn: { type: Boolean, default: false },
  user: { type: Object, default: null },
  profile: { type: Object, default: null },
  instrumentType: { type: String, default: 'guitar' },
  libraryItems: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:modelValue'])

const displayName = computed(
  () =>
    String(
      props.profile?.display_name ||
      props.user?.user_metadata?.display_name ||
      props.user?.email ||
      'User',
    ),
)

const emailLabel = computed(() => String(props.user?.email || '-'))
const instrumentLabel = computed(() => String(props.instrumentType || 'guitar'))

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
    const key = String(item?.category || 'Uncategorized').trim() || 'Uncategorized'
    countByCategory.set(key, (countByCategory.get(key) || 0) + 1)
  }
  return [...countByCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
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
  const when = new Date(first?.updated_at || Date.now()).toLocaleString()
  return `${title} (${when})`
})
</script>

<style scoped>
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

@media (max-width: 760px) {
  .dashboard-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
