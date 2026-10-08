<script setup>
import { computed, ref, watch } from 'vue'
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

const props = defineProps({
    modelValue: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const open = computed({
    get: () => props.modelValue,
    set: (v) => emit('update:modelValue', v),
})

const auth = useAuthStore()
const library = useLibraryStore()

const listTab = ref('mine')

const kind = ref('song')
const title = ref('')
const visibility = ref('private')
const category = ref('')

const notes = useNotesStore()
const instrument = useInstrumentStore()
const timelineSettings = useTimelineSettingsStore()
const transport = useTransportStore()
const playbackVisuals = usePlaybackVisualsStore()
const fretboardOverlay = useFretboardOverlayStore()
const { t } = useI18n()
const ownerNamesById = ref({})

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

    // Heuristic: items not owned by you and not public/connections
    // typically come from explicit shares.
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

function makeSnapshot() {
    return {
        version: 1,
        instrument: {
            instrumentType: instrument.instrumentType,
            tuningId: instrument.tuningId,
            numStrings: instrument.numStrings,
        },
        transport: {
            tempo: transport.tempo,
        },
        timelineSettings: {
            selectedMode: timelineSettings.selectedMode,
            lastRhythmMode: timelineSettings.lastRhythmMode,
            snapEnabled: timelineSettings.snapEnabled,
            soundPreviewEnabled: timelineSettings.soundPreviewEnabled,
            clickEnabled: timelineSettings.clickEnabled,
            loopEnabled: timelineSettings.loopEnabled,
            loopStartBlock: timelineSettings.loopStartBlock,
            loopEndBlock: timelineSettings.loopEndBlock,
            beatTop: timelineSettings.beatTop,
            beatBottom: timelineSettings.beatBottom,
            pickupEnabled: timelineSettings.pickupEnabled,
            pickupBeats: timelineSettings.pickupBeats,
            zoomPxPerBlock: timelineSettings.zoomPxPerBlock,
            timelineLengthBlocks: timelineSettings.timelineLengthBlocks,
            selectedColor: timelineSettings.selectedColor,
        },
        notes: notes.activeNotes,
        fretboardOverlay: {
            textItems: fretboardOverlay.textItems,
        },
    }
}

async function onSave() {
    const t = String(title.value ?? '').trim()
    if (!t) return

    await library.createItem({
        kind: kind.value,
        title: t,
        visibility: visibility.value,
        category: category.value,
        content: makeSnapshot(),
    })

    if (!library.error) {
        title.value = ''
        category.value = ''
    }
}

async function onLoad(item) {
    library.setCurrentItem(item)

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

watch(
    () => open.value,
    async (v) => {
        if (!v) return
        await library.refresh()
        await refreshOwnerNames()
    },
)

watch(
    () => library.items,
    async () => {
        if (!open.value) return
        await refreshOwnerNames()
    },
    { deep: true },
)

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
</script>

<template>
    <v-navigation-drawer v-model="open" location="right" temporary width="680" class="library-drawer">
        <div class="d-flex flex-column h-100 library-shell">
            <div class="d-flex align-center justify-space-between px-3 py-2">
                <div class="text-h6">{{ t('libraryDialog.title') }}</div>
                <v-btn icon="mdi-close" variant="text" @click="open = false" />
            </div>

            <v-divider />

            <div class="pa-3 flex-grow-1 library-content">
                <v-alert v-if="!auth.isSignedIn" type="info" variant="tonal" class="mb-2" density="compact">
                    {{ t('libraryDialog.signInHint') }}
                </v-alert>

                <v-alert v-if="library.error" type="error" variant="tonal" class="mb-2" density="compact">
                    {{ String(library.error?.message ?? library.error) }}
                </v-alert>

                <template v-if="auth.isSignedIn">
                    <div class="d-flex flex-wrap ga-2 align-start mb-2">
                        <v-select v-model="kind" :items="[
                            { title: t('libraryDialog.song'), value: 'song' },
                            { title: t('libraryDialog.exercise'), value: 'exercise' },
                        ]" :label="t('libraryDialog.type')" style="min-width: 130px" density="compact" hide-details />

                        <v-text-field v-model="title" :label="t('libraryDialog.titleLabel')" density="compact" style="min-width: 180px" hide-details />

                        <v-select v-model="visibility" :items="[
                            { title: t('libraryDialog.private'), value: 'private' },
                            { title: t('libraryDialog.connections'), value: 'connections' },
                            { title: t('libraryDialog.public'), value: 'public' },
                        ]" :label="t('libraryDialog.visibility')" style="min-width: 150px" density="compact" hide-details />

                        <v-text-field v-model="category" :label="t('libraryDialog.categoryOptional')" density="compact"
                            style="min-width: 150px" hide-details />

                        <v-btn color="primary" size="small" @click="onSave">{{ t('libraryDialog.save') }}</v-btn>
                    </div>

                    <v-divider class="mb-2" />

                    <div class="d-flex align-center justify-space-between mb-1">
                        <v-tabs v-model="listTab" density="compact">
                            <v-tab value="mine" class="px-2">{{ t('libraryDialog.mine') }}</v-tab>
                            <v-tab value="connections" class="px-2">{{ t('libraryDialog.connections') }}</v-tab>
                            <v-tab value="public" class="px-2">{{ t('libraryDialog.public') }}</v-tab>
                            <v-tab value="shared" class="px-2">{{ t('libraryDialog.shared') }}</v-tab>
                        </v-tabs>
                        <v-btn variant="tonal" size="small" @click="library.refresh">{{ t('libraryDialog.refresh') }}</v-btn>
                    </div>

                    <v-table density="compact" class="library-table">
                        <thead>
                            <tr>
                                <th>{{ t('libraryDialog.titleLabel') }}</th>
                                <th>{{ t('libraryDialog.type') }}</th>
                                <th>{{ t('libraryDialog.visibility') }}</th>
                                <th>{{ t('libraryDialog.category') }}</th>
                                <th>{{ t('libraryDialog.owner') }}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr
                                v-for="item in visibleItems"
                                :key="item.id"
                                class="library-row"
                                role="button"
                                tabindex="0"
                                @click="onLoad(item)"
                                @keydown.enter.prevent="onLoad(item)"
                                @keydown.space.prevent="onLoad(item)"
                            >
                                <td class="library-ellipsis">{{ item.title }}</td>
                                <td>{{ item.kind }}</td>
                                <td>{{ item.visibility }}</td>
                                <td class="library-ellipsis">{{ item.category || '—' }}</td>
                                <td class="text-medium-emphasis library-ellipsis">{{ ownerDisplayNameFor(item) }}</td>
                            </tr>
                            <tr v-if="visibleItems.length === 0">
                                <td colspan="5" class="text-medium-emphasis">{{ t('libraryDialog.noItems') }}</td>
                            </tr>
                        </tbody>
                    </v-table>

                    <v-alert type="info" variant="tonal" class="mt-2" density="compact">
                        {{ t('libraryDialog.connectionsNote') }}
                    </v-alert>
                </template>
            </div>
        </div>
    </v-navigation-drawer>
</template>

<style scoped>
.library-shell {
    min-width: 0;
}

.library-content {
    overflow: auto;
}

.library-table {
    table-layout: fixed;
}

.library-table :deep(th),
.library-table :deep(td) {
    padding-top: 6px !important;
    padding-bottom: 6px !important;
}

.library-table :deep(.library-row) {
    cursor: pointer;
}

.library-table :deep(.library-row:hover) {
    background: color-mix(in srgb, var(--color-primary) 9%, transparent);
}

.library-table :deep(.library-row:focus-visible) {
    outline: 2px solid color-mix(in srgb, var(--color-primary) 55%, transparent);
    outline-offset: -2px;
}

.library-ellipsis {
    max-width: 140px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
</style>
