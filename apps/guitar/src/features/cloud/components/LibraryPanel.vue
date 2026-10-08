<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '@/store/useAuth'
import { useLibraryStore } from '@/store/useLibrary'
import { useNotesStore } from '@/store/useNotes'
import { useInstrumentStore } from '@/store/useInstrument'
import { useTimelineSettingsStore } from '@/store/useTimelineSettings'
import { useTransportStore } from '@/store/useTransport'
import { usePlaybackVisualsStore } from '@/store/usePlaybackVisuals'
import { useFretboardOverlayStore } from '@/store/useFretboardOverlay'
import { useI18n } from '@/i18n'
import { supabase, isSupabaseConfigured } from '@/infra/supabase/client'

defineOptions({ name: 'LibraryPanel' })
const emit = defineEmits(['update-required-frets'])

const auth = useAuthStore()
const library = useLibraryStore()
const notes = useNotesStore()
const instrument = useInstrumentStore()
const timelineSettings = useTimelineSettingsStore()
const transport = useTransportStore()
const playbackVisuals = usePlaybackVisualsStore()
const fretboardOverlay = useFretboardOverlayStore()
const { t } = useI18n()

const listTab = ref('mine')
const ownerNamesById = ref({})
const search = ref('')
const deletingItemId = ref('')
const selectedCategory = ref('')
let dotGroupLoopTimer = null
const DOT_GROUP_PREVIEW_MS = 2000

const userId = computed(() => auth.user?.id ?? null)

const myItems = computed(() => {
  const uid = userId.value
  if (!uid) return []
  return (library.items ?? []).filter((i) => i?.owner_id === uid)
})

const connectionsItems = computed(() => {
  const uid = userId.value
  if (!uid) return []
  return (library.items ?? []).filter((i) => i?.owner_id !== uid && i?.visibility === 'connections')
})

const publicItems = computed(() => {
  const uid = userId.value
  if (!uid) return []
  return (library.items ?? []).filter((i) => i?.owner_id !== uid && i?.visibility === 'public')
})

const sharedItems = computed(() => {
  const uid = userId.value
  if (!uid) return []
  return (library.items ?? []).filter((i) => i?.owner_id !== uid && i?.visibility === 'private')
})

const visibleItems = computed(() => {
  switch (listTab.value) {
    case 'connections':
      return connectionsItems.value
    case 'public':
      return publicItems.value
    case 'shared':
      return sharedItems.value
    case 'mine':
    default:
      return myItems.value
  }
})

const tabItemsByKey = computed(() => ({
  mine: myItems.value,
  public: publicItems.value,
  connections: connectionsItems.value,
  shared: sharedItems.value,
}))

function firstAvailableTab() {
  const order = ['mine', 'public', 'connections', 'shared']
  for (const key of order) {
    const items = tabItemsByKey.value?.[key]
    if (Array.isArray(items) && items.length) return key
  }
  return 'mine'
}

function ensureUsableTab() {
  if (!auth.isSignedIn) {
    listTab.value = 'mine'
    return
  }
  const currentItems = tabItemsByKey.value?.[listTab.value]
  if (Array.isArray(currentItems) && currentItems.length) return
  listTab.value = firstAvailableTab()
}

const filteredItems = computed(() => {
  const q = String(search.value || '').trim().toLowerCase()
  if (!q) return visibleItems.value
  return visibleItems.value.filter((item) => {
    const title = String(item?.title || '').toLowerCase()
    const kind = String(item?.kind || '').toLowerCase()
    const visibility = String(item?.visibility || '').toLowerCase()
    const category = String(item?.category || '').toLowerCase()
    const owner = String(ownerDisplayNameFor(item) || '').toLowerCase()
    return (
      title.includes(q) ||
      kind.includes(q) ||
      visibility.includes(q) ||
      category.includes(q) ||
      owner.includes(q)
    )
  })
})

const categoryRows = computed(() => {
  const counts = new Map()
  for (const item of filteredItems.value) {
    const key = String(item?.category || 'Uncategorized').trim() || 'Uncategorized'
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1]
      return a[0].localeCompare(b[0])
    })
    .map(([label, count]) => ({ label, count }))
})

const selectedCategoryItems = computed(() => {
  const categories = categoryRows.value
  if (!categories.length) return []
  const activeCategory = String(selectedCategory.value || categories[0]?.label || '')
  return filteredItems.value.filter((item) => {
    const key = String(item?.category || 'Uncategorized').trim() || 'Uncategorized'
    return key === activeCategory
  })
})

function ensureSelectedCategory() {
  const categories = categoryRows.value
  if (!categories.length) {
    selectedCategory.value = ''
    return
  }
  const active = String(selectedCategory.value || '')
  if (active && categories.some((row) => row.label === active)) return
  selectedCategory.value = String(categories[0]?.label || '')
}

function maxFretFromNotes(notesList) {
  let max = 0
  for (const note of Array.isArray(notesList) ? notesList : []) {
    const fret = Number(note?.fret)
    if (Number.isFinite(fret) && fret > max) max = fret
  }
  return max
}

function stopDotGroupLoop() {
  if (dotGroupLoopTimer != null) {
    window.clearTimeout(dotGroupLoopTimer)
    dotGroupLoopTimer = null
  }
}

function startDotGroupLoop(notesList) {
  stopDotGroupLoop()
  const ordered = Array.isArray(notesList) ? [...notesList] : []
  ordered.sort((a, b) => {
    const ga = Number(a?.gridIndex) || 0
    const gb = Number(b?.gridIndex) || 0
    if (ga !== gb) return ga - gb
    const ta = Number(a?.placedAtMs) || 0
    const tb = Number(b?.placedAtMs) || 0
    if (ta !== tb) return ta - tb
    return String(a?.key ?? '').localeCompare(String(b?.key ?? ''))
  })

  const colors = []
  const seen = new Set()
  for (const note of ordered) {
    const color = String(note?.color || '').trim()
    if (!color || seen.has(color)) continue
    seen.add(color)
    colors.push(color)
  }

  if (!colors.length) {
    timelineSettings.setActiveDotGroupColor('')
    return
  }

  let index = 0
  timelineSettings.setActiveDotGroupColor(colors[index])
  if (colors.length === 1) return

  const step = () => {
    index += 1
    if (index >= colors.length) {
      dotGroupLoopTimer = null
      return
    }
    timelineSettings.setActiveDotGroupColor(colors[index])
    if (index < colors.length - 1) {
      dotGroupLoopTimer = window.setTimeout(step, DOT_GROUP_PREVIEW_MS)
    } else {
      dotGroupLoopTimer = null
    }
  }

  dotGroupLoopTimer = window.setTimeout(step, DOT_GROUP_PREVIEW_MS)
}

function applySnapshot(snap) {
  if (!snap) return

  if (snap?.instrument?.instrumentType) instrument.setInstrumentType(snap.instrument.instrumentType)
  if (snap?.instrument?.tuningId) instrument.setTuningId(snap.instrument.tuningId)

  if (snap?.transport?.tempo != null) transport.setTempo(snap.transport.tempo)

  const s = snap?.timelineSettings
  if (s) {
    if (s.selectedMode) timelineSettings.setSelectedMode(s.selectedMode)
    if (s.snapEnabled != null) timelineSettings.setSnapEnabled(s.snapEnabled)
    if (s.soundPreviewEnabled != null) timelineSettings.setSoundPreviewEnabled(s.soundPreviewEnabled)
    if (s.clickEnabled != null) timelineSettings.setClickEnabled(s.clickEnabled)
    if (s.countInEnabled != null) timelineSettings.setCountInEnabled(s.countInEnabled)
    if (s.loopEnabled != null) timelineSettings.setLoopEnabled(s.loopEnabled)
    if (s.loopStartBlock != null) timelineSettings.setLoopStartBlock(s.loopStartBlock)
    if (s.loopEndBlock != null) timelineSettings.setLoopEndBlock(s.loopEndBlock)
    if (s.beatTop != null) timelineSettings.setBeatTop(s.beatTop)
    if (s.beatBottom != null) timelineSettings.setBeatBottom(s.beatBottom)
    if (s.pickupEnabled != null) timelineSettings.setPickupEnabled(s.pickupEnabled)
    if (s.pickupBeats != null) timelineSettings.setPickupBeats(s.pickupBeats)
    if (s.zoomPxPerBlock != null) timelineSettings.setZoomPxPerBlock(s.zoomPxPerBlock)
    if (s.timelineLengthBlocks != null) timelineSettings.setTimelineLengthBlocks(s.timelineLengthBlocks)
    if (s.selectedColor) timelineSettings.setSelectedColor(s.selectedColor)
  }

  if (Array.isArray(snap?.notes)) {
    notes.setNotes(snap.notes)
    const requiredFrets = maxFretFromNotes(snap.notes)
    if (requiredFrets > 0) emit('update-required-frets', requiredFrets)
    startDotGroupLoop(snap.notes)
  } else {
    stopDotGroupLoop()
    timelineSettings.setActiveDotGroupColor('')
  }
  fretboardOverlay.setTextItems(snap?.fretboardOverlay?.textItems)
  if (Array.isArray(snap?.notes) && snap.notes.length > 1) {
    const orderedKeys = [...snap.notes]
      .sort((a, b) => {
        const ga = Number(a?.gridIndex) || 0
        const gb = Number(b?.gridIndex) || 0
        if (ga !== gb) return ga - gb
        const ta = Number(a?.placedAtMs) || 0
        const tb = Number(b?.placedAtMs) || 0
        if (ta !== tb) return ta - tb
        return String(a?.key ?? '').localeCompare(String(b?.key ?? ''))
      })
      .map((n) => String(n?.key ?? ''))
      .filter(Boolean)
    const segCount = Math.max(1, orderedKeys.length - 1)
    const durationMs = Math.min(10000, Math.max(2200, segCount * 360))
    playbackVisuals.triggerDirectionPreview(orderedKeys, { durationMs })
  }
}

function onLoad(item) {
  if (!item) return
  library.setCurrentItem(item)
  applySnapshot(item?.content)
}

function canDeleteItem(item) {
  const ownerId = String(item?.owner_id ?? '').trim()
  const meId = String(auth.user?.id ?? '').trim()
  return Boolean(ownerId && meId && ownerId === meId)
}

async function onDelete(item) {
  const itemId = String(item?.id ?? '').trim()
  if (!itemId || !canDeleteItem(item)) return
  if (deletingItemId.value === itemId) return

  deletingItemId.value = itemId
  try {
    await library.deleteItem(itemId)
  } finally {
    if (deletingItemId.value === itemId) deletingItemId.value = ''
  }
}

async function refreshOwnerNames() {
  ownerNamesById.value = {}
  if (!isSupabaseConfigured || !supabase) return
  const ids = [...new Set((library.items ?? []).map((i) => String(i?.owner_id ?? '')).filter(Boolean))]
  if (!ids.length) return

  const { data, error } = await supabase
    .from('profile_directory')
    .select('id, display_name')
    .in('id', ids)
  if (error) return

  const next = {}
  for (const row of Array.isArray(data) ? data : []) {
    const id = String(row?.id ?? '')
    const name = String(row?.display_name ?? '').trim()
    if (!id || !name) continue
    next[id] = name
  }
  ownerNamesById.value = next
}

async function handleRefresh() {
  await library.refresh()
  await refreshOwnerNames()
  ensureUsableTab()
  ensureSelectedCategory()
}

function ownerDisplayNameFor(item) {
  const ownerId = String(item?.owner_id ?? '')
  if (!ownerId) return '—'
  const fromMap = String(ownerNamesById.value?.[ownerId] ?? '').trim()
  if (fromMap) return fromMap
  const meId = String(auth.user?.id ?? '')
  if (meId && ownerId === meId) {
    const meName = String(auth.profile?.display_name ?? auth.user?.user_metadata?.display_name ?? '').trim()
    if (meName) return meName
  }
  return '—'
}

onMounted(async () => {
  await handleRefresh()
})

onBeforeUnmount(() => {
  stopDotGroupLoop()
})

watch(
  () => auth.isSignedIn,
  async (signedIn, wasSignedIn) => {
    if (!signedIn) {
      listTab.value = 'mine'
      ownerNamesById.value = {}
      selectedCategory.value = ''
      return
    }
    if (!wasSignedIn || !Array.isArray(library.items) || library.items.length === 0) {
      await library.refresh()
    }
    await refreshOwnerNames()
    ensureUsableTab()
    ensureSelectedCategory()
  },
)

watch(tabItemsByKey, () => {
  ensureUsableTab()
}, { deep: true })

watch(categoryRows, () => {
  ensureSelectedCategory()
}, { deep: true })
</script>

<template>
  <div class="library-panel">
    <v-alert v-if="!auth.isSignedIn" type="info" variant="tonal" class="mb-2" density="compact">
      {{ t('libraryDialog.signInHint') }}
    </v-alert>

    <v-alert v-if="library.error" type="error" variant="tonal" class="mb-2" density="compact">
      {{ String(library.error?.message ?? library.error) }}
    </v-alert>

    <template v-if="auth.isSignedIn">
      <div class="library-header mb-3">
        <v-tabs v-model="listTab" density="compact" class="library-header-tabs">
          <v-tab value="mine" class="px-2">{{ t('libraryDialog.mine') }}</v-tab>
          <v-tab value="connections" class="px-2">{{ t('libraryDialog.connections') }}</v-tab>
          <v-tab value="public" class="px-2">{{ t('libraryDialog.public') }}</v-tab>
          <v-tab value="shared" class="px-2">{{ t('libraryDialog.shared') }}</v-tab>
        </v-tabs>
        <div class="library-header-actions">
          <v-text-field
            v-model="search"
            density="compact"
            variant="outlined"
            hide-details
            class="library-search"
            prepend-inner-icon="mdi-magnify"
            :label="t('recordingSelector.search')"
          />
          <v-btn variant="tonal" size="small" @click="handleRefresh">{{ t('libraryDialog.refresh') }}</v-btn>
        </div>
      </div>

      <div class="library-shell">
        <section class="library-categories">
          <div v-if="categoryRows.length" class="library-list">
            <button
              v-for="row in categoryRows"
              :key="row.label"
              type="button"
              class="library-list-item"
              :class="{ 'is-active': selectedCategory === row.label }"
              @click="selectedCategory = row.label"
            >
              <div class="library-list-top">
                <div class="library-list-title">{{ row.label }}</div>
                <v-chip size="x-small" variant="tonal">{{ row.count }}</v-chip>
              </div>
            </button>
          </div>

          <div v-else class="text-medium-emphasis library-empty-state">
            {{ t('libraryDialog.noItems') }}
          </div>
        </section>

        <section class="library-items">
          <div v-if="selectedCategoryItems.length" class="library-list">
            <button
              v-for="item in selectedCategoryItems"
              :key="item.id"
              type="button"
              class="library-list-item"
              :class="{ 'is-active': String(library.currentItem?.id || '') === String(item.id || '') }"
              @click="onLoad(item)"
            >
              <div class="library-list-row">
                <div class="library-list-title">{{ item.title || 'Untitled' }}</div>
                <span>{{ ownerDisplayNameFor(item) }}</span>
                <span>{{ item.kind }}</span>
                <span
                  v-if="String(library.currentItem?.id || '') === String(item.id || '')"
                  class="library-current-indicator"
                >
                  {{ t('libraryDialog.load') }}
                </span>
                <span class="library-list-meta-spacer" />
                <v-btn
                  icon="mdi-delete-outline"
                  size="x-small"
                  variant="text"
                  color="error"
                  :disabled="!canDeleteItem(item)"
                  :loading="deletingItemId === String(item.id || '')"
                  @click.stop="onDelete(item)"
                />
              </div>
            </button>
          </div>

          <div v-else class="text-medium-emphasis library-empty-state">
            {{ t('libraryDialog.noItems') }}
          </div>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.library-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  padding: 8px;
  gap: 8px;
  background: transparent;
}

.library-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 8px 10px;
  border-bottom: 1px solid rgb(255 255 255 / 0.08);
  border-radius: 0;
  background: var(--app-grad-panel-soft);
  box-shadow: none;
}

.library-header-tabs {
  min-width: 0;
}

.library-header-tabs :deep(.v-slide-group__content) {
  gap: 6px;
}

.library-header-tabs :deep(.v-tab) {
  min-height: 32px;
  border: 1px solid rgb(255 255 255 / 0.05);
  border-radius: 10px 10px 0 0;
  background: var(--app-glass-1);
  color: var(--app-text-dim);
  font-weight: 700;
  text-transform: none;
}

.library-header-tabs :deep(.v-tab--selected) {
  background: var(--app-glass-2);
  color: var(--app-text);
  border-color: rgb(255 255 255 / 0.1);
}

.library-header-tabs :deep(.v-tabs-slider) {
  display: none;
}

.library-header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1 1 320px;
  justify-content: flex-end;
}

.library-search {
  flex: 1 1 260px;
  max-width: 420px;
}

.library-shell {
  display: grid;
  grid-template-columns: minmax(220px, 0.8fr) minmax(320px, 1.2fr);
  flex: 1 1 auto;
  gap: 14px;
  min-height: 0;
  overflow: hidden;
  background: var(--app-grad-section-soft);
}

.library-categories,
.library-items {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  padding: 10px 8px;
  border: 0;
  border-radius: 0;
  background: var(--app-grad-section-soft);
  box-shadow: none;
}

.library-items {
  border-left: 1px solid rgb(255 255 255 / 0.08);
}

.library-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding-right: 4px;
}

.library-list-item {
  display: flex;
  align-items: center;
  width: 100%;
  border: 1px solid rgb(255 255 255 / 0.06);
  border-radius: 12px;
  background: color-mix(in srgb, var(--app-text) 4%, transparent);
  min-height: 38px;
  padding: 5px 10px;
  text-align: left;
  cursor: pointer;
  transition: border-color 120ms ease, transform 120ms ease, box-shadow 120ms ease;
  box-shadow: none;
}

.library-list-item:hover {
  border-color: rgb(208 138 67 / 0.32);
  transform: translateY(-1px);
  box-shadow: 0 6px 14px rgb(0 0 0 / 0.12);
}

.library-list-item:focus-visible {
  outline: 2px solid rgb(208 138 67 / 0.45);
  outline-offset: 2px;
}

.library-list-item.is-active {
  border-color: rgb(208 138 67 / 0.5);
  box-shadow: 0 8px 18px rgb(0 0 0 / 0.14);
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
}

.library-list-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 10px;
}

.library-list-title {
  font-weight: 700;
  color: var(--app-text);
  line-height: 1.2;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.library-list-row span {
  color: rgb(157 170 189 / 0.82);
  font-size: 11px;
  line-height: 1.1;
  white-space: nowrap;
}

.library-list-row > :first-child {
  flex: 1 1 auto;
  min-width: 0;
}

.library-current-indicator {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-warning);
}

.library-empty-state {
  border: 1px dashed rgb(255 255 255 / 0.12);
  border-radius: 14px;
  padding: 18px;
  flex: 1 1 auto;
  overflow: auto;
  color: rgb(157 170 189 / 0.82);
  background: transparent;
}

@media (max-width: 980px) {
  .library-header {
    align-items: stretch;
  }

  .library-header-actions {
    flex: 1 1 100%;
    justify-content: stretch;
  }

  .library-search {
    max-width: none;
  }

  .library-shell {
    grid-template-columns: minmax(96px, 116px) minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr);
    gap: 10px;
  }

  .library-categories {
    padding: 0;
  }

  .library-categories .library-list {
    flex-direction: column;
    gap: 8px;
    overflow-x: hidden;
    overflow-y: auto;
    padding-right: 2px;
    padding-bottom: 0;
  }

  .library-categories .library-list-item {
    min-width: 0;
    padding: 6px 8px;
  }

  .library-items {
    border-left: 1px solid rgb(255 255 255 / 0.06);
    border-top: 0;
    padding-left: 10px;
    padding-top: 0;
  }

  .library-categories .library-list-top {
    gap: 6px;
  }

  .library-categories .library-list-title {
    font-size: 11px;
  }
}
</style>
