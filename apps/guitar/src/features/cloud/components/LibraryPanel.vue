<script setup>
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
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
import AuthDialog from './AuthDialog.vue'
import LibrarySongRow from './LibrarySongRow.vue'
import { useLibraryDeletion } from '../composables/useLibraryDeletion'

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
const authOpen = ref(false)
const refreshBusy = ref(false)
const refreshFailed = ref(false)
const refreshButton = ref(null)
const deleteHeadingId = useId()
let deleteTrigger = null
const { pendingItem, busy: deleteBusy, failed: deleteFailed, canDelete, request: requestDeletion, cancel: cancelDeletion, confirm: confirmDeletion } = useLibraryDeletion({ library, auth })
const deleteDialogOpen = computed({
  get: () => Boolean(pendingItem.value),
  set: (open) => { if (!open) cancelDeletion() },
})
const isLoading = computed(() => refreshBusy.value || library.loading)

function requestDelete(item, event) {
  deleteTrigger = event?.currentTarget
  requestDeletion(item)
}

function restoreDeleteFocus() {
  const target = deleteTrigger?.isConnected ? deleteTrigger : refreshButton.value?.$el
  target?.focus?.()
  deleteTrigger = null
}
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
  if (isLoading.value || !auth.isSignedIn) return
  refreshBusy.value = true
  refreshFailed.value = false
  try {
    await library.refresh()
    refreshFailed.value = Boolean(library.error)
    await refreshOwnerNames()
    ensureSelectedCategory()
  } catch {
    refreshFailed.value = true
  } finally {
    refreshBusy.value = false
  }
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
      search.value = ''
      library.items = []
      refreshFailed.value = false
      cancelDeletion()
      return
    }
    if (!wasSignedIn || !Array.isArray(library.items) || library.items.length === 0) {
      await handleRefresh()
    }
    ensureSelectedCategory()
  },
)

watch(categoryRows, () => {
  ensureSelectedCategory()
}, { deep: true })
</script>

<template>
  <div class="library-panel">
    <AuthDialog v-model="authOpen" />
    <v-alert v-if="!auth.isSignedIn" type="info" variant="tonal" class="mb-2" density="compact">
      {{ t('libraryDialog.signInHint') }}
      <div class="mt-3"><v-btn variant="flat" color="primary" @click="authOpen = true">{{ t('app.login') }}</v-btn></div>
    </v-alert>

    <v-alert v-if="auth.isSignedIn && refreshFailed" type="error" variant="tonal" class="mb-2" density="compact">
      {{ t('ux.refreshFailed') }}
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
            clearable
          />
          <v-btn ref="refreshButton" variant="tonal" size="small" prepend-icon="mdi-refresh"
            :loading="isLoading" :disabled="isLoading" @click="handleRefresh">{{ t('libraryDialog.refresh') }}</v-btn>
        </div>
      </div>

      <div class="library-result-status" role="status">
        {{ isLoading ? t('ux.loading') : t('recordingSelector.items', { count: filteredItems.length }) }}
      </div>
      <div v-if="!filteredItems.length" class="library-empty-state">
        <v-icon :icon="search?.trim() ? 'mdi-magnify' : 'mdi-bookshelf'" size="32" aria-hidden="true" />
        <h3>{{ isLoading ? t('ux.loading') : search?.trim() ? t('ux.noSearchResults') : t('libraryDialog.noItems') }}</h3>
        <p v-if="!isLoading">{{ search?.trim() ? t('recordingSelector.adjustFilter') : t('ux.emptyLibraryHint') }}</p>
        <v-btn v-if="search?.trim() && !isLoading" variant="tonal" @click="search = ''">{{ t('ux.clearSearch') }}</v-btn>
      </div>
      <div v-else class="library-shell" :aria-busy="isLoading">
        <section class="library-categories" :aria-label="t('libraryDialog.category')">
          <div v-if="categoryRows.length" class="library-list">
            <button
              v-for="row in categoryRows"
              :key="row.label"
              type="button"
              class="library-list-item"
              :class="{ 'is-active': selectedCategory === row.label }"
              :aria-pressed="selectedCategory === row.label"
              @click="selectedCategory = row.label"
            >
              <div class="library-list-top">
                <div class="library-list-title">{{ row.label }}</div>
                <v-chip size="x-small" variant="tonal">{{ row.count }}</v-chip>
              </div>
            </button>
          </div>

        </section>

        <section class="library-items" :aria-label="t('libraryDialog.title')">
          <div v-if="selectedCategoryItems.length" class="library-list">
            <LibrarySongRow v-for="item in selectedCategoryItems" :key="item.id" :item="item"
              :owner="ownerDisplayNameFor(item)" :can-delete="canDelete(item)" :busy="deleteBusy"
              :selected="String(library.currentItem?.id || '') === String(item.id || '')"
              @load="onLoad" @delete="requestDelete" />
          </div>

        </section>
      </div>
    </template>
    <v-dialog v-model="deleteDialogOpen" max-width="440" :persistent="deleteBusy"
      :aria-labelledby="deleteHeadingId" @after-leave="restoreDeleteFocus">
      <v-card>
        <v-card-title :id="deleteHeadingId">{{ t('ux.confirmDelete') }}</v-card-title>
        <v-card-text>
          <p>{{ t('ux.deleteWarning', { title: pendingItem?.title || t('recordingSelector.untitled') }) }}</p>
          <v-alert v-if="deleteFailed" type="error" variant="tonal" class="mt-3">{{ t('ux.deleteFailed') }}</v-alert>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" :disabled="deleteBusy" @click="cancelDeletion">{{ t('app.cancel') }}</v-btn>
          <v-btn color="error" variant="flat" :loading="deleteBusy" :disabled="deleteBusy" @click="confirmDeletion">{{ t('libraryDialog.delete') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
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
  grid-template-columns: minmax(140px, 0.5fr) minmax(0, 1.5fr);
  flex: 1 1 auto;
  gap: 14px;
  min-height: 0;
  overflow: hidden;
  background: var(--app-grad-section-soft);
}

.library-categories,
.library-items {
  min-width: 0;
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
  flex-shrink: 0;
  display: flex;
  align-items: center;
  width: 100%;
  border: 1px solid rgb(255 255 255 / 0.06);
  border-radius: 12px;
  background: color-mix(in srgb, var(--app-text) 4%, transparent);
  min-height: 44px;
  padding: 5px 10px;
  text-align: left;
  cursor: pointer;
  transition: border-color 120ms ease;
  box-shadow: none;
}

.library-list-item:hover {
  border-color: rgb(208 138 67 / 0.32);
  box-shadow: 0 6px 14px rgb(0 0 0 / 0.12);
}

.library-list-item:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: -2px;
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
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: safe center;
  text-align: center;
  gap: 12px;
  border: 1px dashed rgb(255 255 255 / 0.12);
  border-radius: 14px;
  padding: 18px;
  flex: 1 1 auto;
  overflow: auto;
  color: var(--color-text-muted);
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

.library-result-status {
  flex: 0 0 auto;
  font-size: 12px;
  color: var(--color-text-muted);
  padding-inline: 10px;
}

.library-list-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
}

.library-panel :deep(.v-btn) { min-height: 44px; text-transform: none; }
.library-panel :deep(.v-tab) { min-height: 44px; }
.library-panel :deep(.v-btn:focus-visible) { outline: 2px solid var(--color-primary); outline-offset: -2px; }

@media (max-width: 600px) {
  .library-header { padding: 4px 0; }
  .library-header-actions { flex-wrap: wrap; }
  .library-search { min-width: 0; flex-basis: 160px; }
  .library-shell { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr); }
  .library-categories .library-list { flex-direction: row; overflow-x: auto; padding-bottom: 6px; }
  .library-categories .library-list-item { width: auto; max-width: 220px; }
  .library-items { border-left: 0; padding: 0; }
}

@media (max-height: 500px) and (min-width: 601px) {
  .library-header {
    flex-wrap: nowrap;
    padding-block: 4px;
  }
  .library-header-tabs {
    flex: 0 1 auto;
    overflow: hidden;
  }
  .library-header-actions {
    flex: 1 1 auto;
    min-width: 260px;
  }
  .library-search {
    min-width: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .library-list-item { transition: none; }
}
</style>
