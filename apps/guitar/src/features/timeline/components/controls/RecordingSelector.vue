<template>
    <div class="recording-selector-shell pa-3" tabindex="0" @keydown="onKeyDown">
        <div class="d-flex align-center ga-3 flex-wrap">
            <v-text-field v-model="search" :label="t('recordingSelector.search')" density="compact" variant="outlined"
                clearable hide-details class="flex-grow-1" style="min-width: 260px" :disabled="!canUse" />

            <v-select v-model="visibilityFilter" :items="visibilityItems" :label="t('recordingSelector.visibility')" density="compact"
                variant="outlined" hide-details style="width: 170px" :disabled="!canUse" />

            <v-select v-model="kindFilter" :items="kindItems" :label="t('recordingSelector.type')" density="compact" variant="outlined"
                hide-details style="width: 160px" :disabled="!canUse" />

            <v-btn variant="tonal" :disabled="!canUse || library.loading" @click="library.refresh">
                {{ t('recordingSelector.refresh') }}
            </v-btn>

            <v-btn color="primary" variant="flat" :disabled="!canUse || !highlightedId" @click="loadHighlighted">
                {{ t('recordingSelector.load') }}
            </v-btn>
        </div>

        <div v-if="canUse" class="d-flex align-center justify-space-between mt-3">
            <div class="d-flex align-center ga-2">
                <v-chip size="small" variant="tonal" color="primary">{{ t('recordingSelector.items', { count: filteredCount }) }}</v-chip>
                <v-chip size="small" variant="tonal" color="secondary">
                    {{ t('recordingSelector.page', { current: page + 1, total: Math.max(1, pageCount) }) }}
                </v-chip>
            </div>

            <div class="d-flex align-center ga-1">
                <v-btn icon variant="text" :disabled="!hasPrevPage" :title="t('recordingSelector.prevPage')" @click="goPrevPage">
                    <v-icon icon="mdi-chevron-left" />
                </v-btn>
                <v-btn icon variant="text" :disabled="!hasNextPage" :title="t('recordingSelector.nextPage')" @click="goNextPage">
                    <v-icon icon="mdi-chevron-right" />
                </v-btn>
            </div>
        </div>

        <v-alert v-if="!isSupabaseConfigured" type="warning" variant="tonal" class="mt-3">
            {{ t('recordingSelector.cloudNotConfigured') }}
        </v-alert>

        <v-alert v-else-if="auth.isSignedIn === false" type="info" variant="tonal" class="mt-3">
            {{ t('recordingSelector.signInHint') }}
        </v-alert>

        <v-alert v-else-if="library.error" type="error" variant="tonal" class="mt-3">
            {{ String(library.error?.message ?? library.error) }}
        </v-alert>

        <v-list v-if="canUse" class="mt-3" density="compact" lines="two" border>
            <v-list-item v-for="item in pagedItems" :key="item.id" :active="item.id === highlightedId"
                :title="String(item.title ?? t('recordingSelector.untitled'))" :subtitle="subtitleFor(item)" @click="onClickItem(item)" />

            <v-list-item v-if="pagedItems.length === 0" :title="t('recordingSelector.noItems')"
                :subtitle="t('recordingSelector.adjustFilter')" />
        </v-list>

        <div v-if="canUse" class="text-medium-emphasis mt-2" style="font-size: 12px">
            {{ t('recordingSelector.tip') }}
        </div>
    </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '@/store/useAuth'
import { useLibraryStore } from '@/store/useLibrary'
import { useNotesStore } from '@/store/useNotes'
import { useInstrumentStore } from '@/store/useInstrument'
import { useTimelineSettingsStore } from '@/store/useTimelineSettings'
import { useTransportStore } from '@/store/useTransport'
import { useHandPositionsStore } from '@/store/useHandPositions'
import { isSupabaseConfigured } from '@/infra/supabase/client'
import { TIMELINE_RECORDING_SELECTOR } from '@/features/timeline/config/timelineBehavior'
import { useI18n } from '@/i18n'

defineOptions({ name: 'RecordingSelector' })

const auth = useAuthStore()
const library = useLibraryStore()

const notes = useNotesStore()
const instrument = useInstrumentStore()
const timelineSettings = useTimelineSettingsStore()
const transport = useTransportStore()
const handPositions = useHandPositionsStore()
const { t } = useI18n()

const search = ref('')
const kindFilter = ref(TIMELINE_RECORDING_SELECTOR.defaultKindFilter)
const visibilityFilter = ref(TIMELINE_RECORDING_SELECTOR.defaultVisibilityFilter)

const page = ref(0)
const PAGE_SIZE = TIMELINE_RECORDING_SELECTOR.pageSize

const highlightedId = ref(null)

const kindItems = computed(() => [
    { title: t('recordingSelector.all'), value: 'all' },
    { title: t('recordingSelector.song'), value: 'song' },
    { title: t('recordingSelector.exercise'), value: 'exercise' },
])

const visibilityItems = computed(() => [
    { title: t('recordingSelector.public'), value: 'public' },
    { title: t('recordingSelector.all'), value: 'all' },
])

const canUse = computed(() => Boolean(isSupabaseConfigured) && Boolean(auth.isSignedIn))

const scopedItems = computed(() => {
    const items = Array.isArray(library.items) ? library.items : []
    if (visibilityFilter.value === 'public') {
        return items.filter((i) => String(i?.visibility) === 'public')
    }
    return items
})

const filteredItems = computed(() => {
    const items = scopedItems.value

    const byKind =
        kindFilter.value === 'all'
            ? items
            : items.filter((i) => String(i?.kind) === String(kindFilter.value))

    const q = String(search.value ?? '')
        .trim()
        .toLowerCase()
    if (!q) return byKind

    return byKind.filter((i) => {
        const title = String(i?.title ?? '').toLowerCase()
        const category = String(i?.category ?? '').toLowerCase()
        return title.includes(q) || category.includes(q)
    })
})

const filteredCount = computed(() => filteredItems.value.length)

const pageCount = computed(() => {
    const total = filteredItems.value.length
    return Math.ceil(total / PAGE_SIZE)
})

const hasPrevPage = computed(() => page.value > 0)
const hasNextPage = computed(() => page.value + 1 < pageCount.value)

const pagedItems = computed(() => {
    const start = page.value * PAGE_SIZE
    const end = start + PAGE_SIZE
    return filteredItems.value.slice(start, end)
})

function clampPage() {
    const last = Math.max(0, pageCount.value - 1)
    page.value = Math.min(last, Math.max(0, page.value))
}

function goNextPage() {
    if (!hasNextPage.value) return
    page.value += 1
    clampPage()
}

function goPrevPage() {
    if (!hasPrevPage.value) return
    page.value -= 1
    clampPage()
}

function formatDate(ts) {
    if (!ts) return ''
    const d = new Date(ts)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleString()
}

function subtitleFor(item) {
    const kind = String(item?.kind ?? '')
    const cat = String(item?.category ?? '').trim()
    const vis = String(item?.visibility ?? '')
    const updated = formatDate(item?.updated_at)

    const parts = []
    if (kind) parts.push(kind)
    if (vis) parts.push(vis)
    if (cat) parts.push(cat)
    if (updated) parts.push(t('recordingSelector.updatedAt', { updated }))
    return parts.join(' · ')
}

function applySnapshot(item) {
    const snap = item?.content
    if (!snap) return

    if (snap?.instrument?.instrumentType) instrument.setInstrumentType(snap.instrument.instrumentType)
    if (snap?.instrument?.tuningId) instrument.setTuningId(snap.instrument.tuningId)

    if (snap?.transport?.tempo != null) transport.setTempo(snap.transport.tempo)

    const s = snap?.timelineSettings
    if (s) {
        if (s.selectedMode) timelineSettings.setSelectedMode(s.selectedMode)
        if (s.snapEnabled != null) timelineSettings.setSnapEnabled(s.snapEnabled)
        if (s.soundPreviewEnabled != null)
            timelineSettings.setSoundPreviewEnabled(s.soundPreviewEnabled)
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
        if (s.timelineLengthBlocks != null)
            timelineSettings.setTimelineLengthBlocks(s.timelineLengthBlocks)
        if (s.selectedColor) timelineSettings.setSelectedColor(s.selectedColor)
    }

    if (Array.isArray(snap?.notes)) notes.setNotes(snap.notes)
    else notes.setNotes([])

    if (Array.isArray(snap?.handPositions)) handPositions.setHandPositions(snap.handPositions)
    else handPositions.setHandPositions([])
}

function loadHighlighted() {
    const id = highlightedId.value
    if (!id) return
    const item = (Array.isArray(library.items) ? library.items : []).find((i) => i?.id === id)
    if (!item) return
    library.setCurrentItem(item)
    applySnapshot(item)
}

function onClickItem(item) {
    highlightedId.value = item?.id ?? null
    loadHighlighted()
}

function setHighlightedIndex(nextIndex) {
    const items = filteredItems.value
    if (!items.length) {
        highlightedId.value = null
        return
    }

    const clamped = Math.min(items.length - 1, Math.max(0, nextIndex))
    const nextItem = items[clamped]
    highlightedId.value = nextItem?.id ?? null
    page.value = Math.floor(clamped / PAGE_SIZE)
    clampPage()
}

function moveHighlight(delta) {
    const items = filteredItems.value
    if (!items.length) return

    const currentId = highlightedId.value
    const currentIndex = currentId ? items.findIndex((i) => i?.id === currentId) : -1
    const base = currentIndex >= 0 ? currentIndex : page.value * PAGE_SIZE
    setHighlightedIndex(base + delta)
}

function onKeyDown(e) {
    if (!canUse.value) return
    if (!e?.key) return

    if (e.key === 'ArrowDown') {
        e.preventDefault()
        moveHighlight(+1)
        return
    }
    if (e.key === 'ArrowUp') {
        e.preventDefault()
        moveHighlight(-1)
        return
    }
    if (e.key === 'ArrowRight') {
        e.preventDefault()
        const items = filteredItems.value
        if (!items.length) return
        const currentId = highlightedId.value
        const currentIndex = currentId
            ? items.findIndex((i) => i?.id === currentId)
            : page.value * PAGE_SIZE
        const offset = Math.max(0, currentIndex - page.value * PAGE_SIZE)
        if (!hasNextPage.value) return
        page.value += 1
        clampPage()
        setHighlightedIndex(page.value * PAGE_SIZE + offset)
        return
    }
    if (e.key === 'ArrowLeft') {
        e.preventDefault()
        const items = filteredItems.value
        if (!items.length) return
        const currentId = highlightedId.value
        const currentIndex = currentId
            ? items.findIndex((i) => i?.id === currentId)
            : page.value * PAGE_SIZE
        const offset = Math.max(0, currentIndex - page.value * PAGE_SIZE)
        if (!hasPrevPage.value) return
        page.value -= 1
        clampPage()
        setHighlightedIndex(page.value * PAGE_SIZE + offset)
        return
    }
    if (e.key === 'Enter') {
        e.preventDefault()
        loadHighlighted()
    }
}

watch(
    () => auth.isSignedIn,
    async (signedIn) => {
        if (!signedIn) return
        await library.refresh()
    },
)

watch([search, kindFilter, visibilityFilter], () => {
    page.value = 0
    clampPage()

    const items = filteredItems.value
    if (!items.length) {
        highlightedId.value = null
        return
    }

    const currentId = highlightedId.value
    if (currentId && items.some((i) => i?.id === currentId)) return
    highlightedId.value = items[0]?.id ?? null
})

watch(
    () => filteredItems.value.length,
    () => {
        clampPage()
    },
)

onMounted(async () => {
    if (!canUse.value) return
    await library.refresh()
})
</script>

<style scoped>
.recording-selector-shell {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: color-mix(in srgb, var(--color-surface) 96%, var(--color-surface-2) 4%);
}
</style>
