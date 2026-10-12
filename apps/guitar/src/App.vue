<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppMenuBar from '@/components/app/shell/AppMenuBar.vue'
import AppViewportDebug from '@/components/app/shell/AppViewportDebug.vue'
import AppWorkspaceDialogs from '@/components/app/shell/AppWorkspaceDialogs.vue'
import LayoutManager from '@/components/app/layout/LayoutManager.vue'
import Timeline from '@/features/timeline'
import { TransportBar } from '@/features/transport'
import { AuthDialog, ConnectionsDialog, LibraryPanel } from '@/features/cloud'
import WorkspaceLeftRail from '@/components/app/workspace/WorkspaceLeftRail.vue'
import WorkspacePaneB from '@/components/app/workspace/WorkspacePaneB.vue'
import WorkspaceFretboardPane from '@/components/app/workspace/WorkspaceFretboardPane.vue'
import WorkspaceDashboardView from '@/components/app/workspace/WorkspaceDashboardView.vue'
import { useInstrumentStore } from '@/store/useInstrument'
import { useAuthStore } from '@/store/useAuth'
import { useNotesStore } from '@/store/useNotes'
import { useSelectionStore } from '@/store/useSelection'
import { useHandPositionsStore } from '@/store/useHandPositions'
import { useTransportStore } from '@/store/useTransport'
import { useTimelineSettingsStore } from '@/store/useTimelineSettings'
import { useLibraryStore } from '@/store/useLibrary'
import { useConnectionsStore } from '@/store/useConnections'
import { useShareContactsStore } from '@/store/useShareContacts'
import { useHarmonyMenuStore } from '@/store/useHarmonyMenu'
import { useFretboardOverlayStore } from '@/store/useFretboardOverlay'
import { SURFACE_MODES, useUiModeStore } from '@/store/useUiMode'
import { TIMELINE_LAYOUT } from '@/features/timeline/config/timelineLayout'
import { initAudioEngine, installAudioAutoWarmup } from '@/domain/audio/simpleSynth'
import { useI18n } from '@/i18n'
import { useTheme } from 'vuetify'
import { useViewportMode } from '@/composables/useViewportMode'
import { useAppDotGroups } from '@/composables/useAppDotGroups'
import { useShareActions } from '@/composables/useShareActions'
import { useSongEditorActions } from '@/composables/useSongEditorActions'

const numFrets = ref(12)
const corePadResizePx = ref(0)
const fretboardMainEl = ref(null)
const workspaceTimelineRef = ref(null)
const compactTimelineRef = ref(null)
const importFilesInputEl = ref(null)
const timelineUndoTick = ref(0)
const timelineRedoTick = ref(0)
const transportVisible = ref(true)
const showFretboard = ref(true)
const showTimeline = ref(true)
const showTransportBar = ref(true)
const workspacePanelTab = ref('timeline')
const sidebarVisible = ref(true)
const mainView = ref('workspace')
const dashboardPanel = ref('library')
const phonePane = ref('fretboard')
const authOpen = ref(false)
const connectionsOpen = ref(false)
const preferencesOpen = ref(false)
const profileSaveBusy = ref(false)
const songName = ref('')
const THEME_STORAGE_KEY = 'guitarjemp.ui.theme'
const APP_VERSION_LABEL = 'v.1.2'

const instrument = useInstrumentStore()
const auth = useAuthStore()
const notes = useNotesStore()
const selection = useSelectionStore()
const handPositions = useHandPositionsStore()
const transport = useTransportStore()
const timelineSettings = useTimelineSettingsStore()
const library = useLibraryStore()
const connections = useConnectionsStore()
const shareContacts = useShareContactsStore()
const harmony = useHarmonyMenuStore()
const fretboardOverlay = useFretboardOverlayStore()
const uiMode = useUiModeStore()
const theme = useTheme()
const { locale, languages, setLocale, t } = useI18n()
const SONG_KEY_OPTIONS = [
  { title: 'C', value: 'C' },
  { title: 'C#/Db', value: 'C#' },
  { title: 'D', value: 'D' },
  { title: 'D#/Eb', value: 'D#' },
  { title: 'E', value: 'E' },
  { title: 'F', value: 'F' },
  { title: 'F#/Gb', value: 'F#' },
  { title: 'G', value: 'G' },
  { title: 'G#/Ab', value: 'G#' },
  { title: 'A', value: 'A' },
  { title: 'A#/Bb', value: 'A#' },
  { title: 'B', value: 'B' },
]
const DOT_LABEL_MODE_OPTIONS = [
  { title: 'Rhythm', value: 'rhythm' },
  { title: 'Intervals', value: 'intervals' },
  { title: 'Play Order', value: 'play-order' },
  { title: 'Fingering', value: 'fingering' },
]
const PLAY_ORDER_SCOPE_OPTIONS = [
  { title: 'Per Song', value: 'song' },
  { title: 'Per Dotgroup', value: 'dotgroup' },
]
const isDarkTheme = computed(() => Boolean(theme.global.current.value.dark))
const preferenceToneDuration = computed({
  get: () => Number(timelineSettings.soundDurationScale) || 1,
  set: (v) => timelineSettings.setSoundDurationScale(Number(v)),
})
const preferenceSoundPreview = computed({
  get: () => Boolean(timelineSettings.soundPreviewEnabled),
  set: (v) => timelineSettings.setSoundPreviewEnabled(Boolean(v)),
})
const preferenceDarkMode = computed({
  get: () => isDarkTheme.value,
  set: (v) => applyTheme(v ? 'guitarjempDark' : 'guitarjemp'),
})
const preferenceIntervalsOnDots = computed({
  get: () => Boolean(timelineSettings.showIntervalsOnDots),
  set: (v) => timelineSettings.setShowIntervalsOnDots(Boolean(v)),
})
const fretboardDotLabelMode = computed({
  get: () => String(timelineSettings.dotLabelMode || 'rhythm'),
  set: (v) => timelineSettings.setDotLabelMode(String(v || 'rhythm')),
})
const fretboardPlayOrderScope = computed({
  get: () => String(timelineSettings.playOrderScope || 'song'),
  set: (v) => timelineSettings.setPlayOrderScope(String(v || 'song')),
})
const preferenceLeftHanded = computed({
  get: () => Boolean(timelineSettings.leftHanded),
  set: (v) => timelineSettings.setLeftHanded(Boolean(v)),
})
const languageItems = computed(() => languages.map((l) => ({ title: l.label, value: l.code })))
const preferenceLanguage = computed({
  get: () => String(locale.value || 'en'),
  set: (v) => {
    void setLocale(String(v || 'en'))
  },
})
const {
  PHONE_VIEW_BREAKPOINT_PX,
  VIEWPORT_DEBUG_PRESETS,
  viewMode,
  isPortraitViewport,
  viewportHeightUnitPx,
  debugViewportOpen,
  debugViewportPreset,
  debugViewportWidthPx,
  debugViewportHeightPx,
  debugViewportFrameActive,
  effectiveViewportHeightPx,
  effectiveViewportWidthPx,
  isPhoneView,
  isWatchView,
  isCompactView,
  effectiveIsPortrait,
  isDevMode,
  appLayoutStyle,
  updateViewportOrientationFlag,
  updateViewportHeightUnit,
  applyViewportDebugPreset,
  shouldDefaultToPhoneView,
} = useViewportMode()
const isReadOnly = computed(() => uiMode.surfaceMode === SURFACE_MODES.VIEW)
const timelineRef = computed(() =>
  isCompactView.value && !isReadOnly.value && phonePane.value === 'timeline'
    ? compactTimelineRef.value
    : workspaceTimelineRef.value,
)
const showPhoneRotateOverlay = computed(() => isPhoneView.value && isReadOnly.value && effectiveIsPortrait.value)

function setReadOnly(value) {
  closeDotGroupMenu()
  if (value) {
    mainView.value = 'workspace'
    phonePane.value = 'fretboard'
    workspacePanelTab.value = 'timeline'
  }
  uiMode.setSurfaceMode(value ? SURFACE_MODES.VIEW : SURFACE_MODES.COMPOSE)
}

watch(isPhoneView, (phone) => {
  if (phone) setReadOnly(true)
})

const isCommentMode = computed(() => uiMode.surfaceMode === SURFACE_MODES.COMMENT)

const {
  currentUserDisplayName,
  currentUserAvatarUrl,
  shareContactsForMenu,
  shareContact,
} = useShareActions({ auth, shareContacts })

const {
  hasNotes,
  newSongOpen,
  songDialogMode,
  newSongTitle,
  newSongBeatTop,
  newSongBeatBottom,
  newSongKey,
  newSongBars,
  newSongPickupEnabled,
  newSongPickupBeats,
  newSongShuffleEnabled,
  newSongBpm,
  saveAsNewOpen,
  saveAsNewTitle,
  saveAsNewVisibility,
  saveAsNewCategory,
  saveAsNewBusy,
  saveBusy,
  saveCurrentSong,
  exportMusicXml,
  exportMidi,
  exportPdf,
  openImportFiles,
  onImportFilesChange,
  saveAsNewToCloud,
  openSaveAsNew,
  openNewSongDialog,
  openSongSettingsDialog,
  applyNewSong,
  applyConfiguredDefaultTimelineLength,
  resetEditorToDefaultLength,
} = useSongEditorActions({
  instrument,
  auth,
  notes,
  selection,
  handPositions,
  transport,
  timelineSettings,
  library,
  harmony,
  fretboardOverlay,
  numFrets,
  songName,
  importFilesInputEl,
  t,
})

const {
  dotGroupMenu,
  usedDotGroups,
  allDotGroupsSelected,
  hasDotGroups,
  openDotGroupMenu,
  closeDotGroupMenu,
  renameDotGroup,
  deleteDotGroup,
  onWindowPointerDown,
  activateAllDotGroups,
  activateDotGroup,
} = useAppDotGroups({ notes, selection, timelineSettings, timelineRef })

function applyTheme(name) {
  const next = name === 'guitarjempDark' ? 'guitarjempDark' : 'guitarjemp'
  theme.global.name.value = next
  localStorage.setItem(THEME_STORAGE_KEY, next)
}

const fretboardStyleVars = computed(() => ({
  '--fb-core-resize-pad-bottom': '0px',
  '--fb-core-resize-margin-bottom': '0px',
}))

const timelineIsPlaying = computed(() => Boolean(timelineRef.value?.isPlaying))
const timelinePlayhead = computed(() => Number(timelineRef.value?.playhead) || 0)
const timelineTotalDuration = computed(() => Number(timelineRef.value?.totalDuration) || 0)
const timelinePracticeActive = computed(() => Boolean(timelineRef.value?.practiceActive))
const timelinePracticeAvailable = computed(() => Boolean(timelineRef.value?.practiceAvailable))
const timelinePracticeTargetLabel = computed(() => String(timelineRef.value?.practiceTargetLabel || ''))
const timelinePracticeDetectedLabel = computed(() => String(timelineRef.value?.practiceDetectedLabel || ''))
const timelinePracticeHintText = computed(() => String(timelineRef.value?.practiceHintText || ''))
const timelinePracticeMatchState = computed(() => String(timelineRef.value?.practiceMatchState || ''))
const timelineRecordActive = computed(() => Boolean(timelineRef.value?.recordActive))

function timelineTogglePlay() {
  timelineRef.value?.togglePlay?.()
}

function timelineSeekStart() {
  timelineRef.value?.seekStart?.()
}

function timelineSeekPlayhead(v) {
  timelineRef.value?.seekPlayhead?.(v)
}

function timelineTogglePractice() {
  timelineRef.value?.togglePractice?.()
}

function timelineToggleRecord() {
  if (isReadOnly.value) return
  timelineRef.value?.toggleRecord?.()
}

function normalizeDashboardPanel(panel) {
  const allowed = new Set(['library', 'profile', 'categories', 'connections', 'share'])
  const next = String(panel || 'library')
  return allowed.has(next) ? next : 'library'
}

async function openDashboard(initialPanel = 'library') {
  dashboardPanel.value = normalizeDashboardPanel(initialPanel)
  mainView.value = 'dashboard'

  // Load cloud data in background so dashboard opens instantly.
  if (!auth.isSignedIn) return
  try {
    await Promise.all([library.refresh(), connections.refresh()])
  } catch (err) {
    console.warn('Dashboard background refresh failed:', err)
  }
}

function closeDashboard() {
  mainView.value = 'workspace'
}

function selectDashboardPanel(panel) {
  dashboardPanel.value = normalizeDashboardPanel(panel)
}

function openShareManager() {
  void openDashboard('share')
}

async function saveDashboardProfile(payload) {
  if (profileSaveBusy.value) return
  profileSaveBusy.value = true
  const ok = await auth.updateProfile(payload || {})
  profileSaveBusy.value = false
  if (!ok) {
    const msg = String(auth.error?.message ?? auth.error ?? 'Profile save failed')
    window.alert(msg)
    return
  }
  if (auth.isSignedIn) {
    await Promise.all([library.refresh(), connections.refresh()])
  }
}

function triggerUndo() {
  if (isReadOnly.value) return
  timelineUndoTick.value += 1
}

function triggerRedo() {
  if (isReadOnly.value) return
  timelineRedoTick.value += 1
}

function clearFretboardFromLeftRail() {
  if (isReadOnly.value) return
  const noteCount = Array.isArray(notes.activeNotes) ? notes.activeNotes.length : 0
  if (noteCount > 15) {
    const confirmed = window.confirm(`${noteCount} Elemente löschen?`)
    if (!confirmed) return
  }
  notes.clearNotes()
  selection.clearSelection()
  const top = Number(timelineSettings.beatTop) || 4
  const bottom = Number(timelineSettings.beatBottom) || 4
  const blocksPerBar = Math.max(1, Number((top * (4 / bottom)).toFixed(3)))
  const bars = Math.max(1, Number(TIMELINE_LAYOUT.bars.defaultCount) || 2)
  timelineSettings.setTimelineLengthBlocks(Number((blocksPerBar * bars).toFixed(3)))
}

async function handleSaveAsNewToCloud() {
  if (!auth.isSignedIn) {
    authOpen.value = true
    return
  }
  await saveAsNewToCloud()
}

function updateNumFrets(value) {
  numFrets.value = Math.max(1, Math.floor(Number(value) || 12))
}

onMounted(async () => {
  if (viewMode.value === 'desktop' && shouldDefaultToPhoneView()) {
    viewMode.value = 'phone'
  }
  updateViewportHeightUnit()
  updateViewportOrientationFlag()
  window.visualViewport?.addEventListener?.('resize', updateViewportHeightUnit)
  window.visualViewport?.addEventListener?.('scroll', updateViewportHeightUnit)
  window.addEventListener('resize', updateViewportHeightUnit)
  window.addEventListener('orientationchange', updateViewportHeightUnit)
  window.addEventListener('resize', updateViewportOrientationFlag)
  window.addEventListener('orientationchange', updateViewportOrientationFlag)
  installAudioAutoWarmup({ instrumentType: instrument.instrumentType })
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY)
  if (storedTheme === 'guitarjemp' || storedTheme === 'guitarjempDark') {
    applyTheme(storedTheme)
  }
  applyConfiguredDefaultTimelineLength()
  corePadResizePx.value = 0
  window.addEventListener('pointerdown', onWindowPointerDown, true)
})

watch(
  () => instrument.instrumentType,
  (next) => {
    void initAudioEngine({ instrumentType: next })
  },
)

watch(isCompactView, (compact) => {
  if (compact) corePadResizePx.value = 0
})

onBeforeUnmount(() => {
  window.visualViewport?.removeEventListener?.('resize', updateViewportHeightUnit)
  window.visualViewport?.removeEventListener?.('scroll', updateViewportHeightUnit)
  window.removeEventListener('resize', updateViewportHeightUnit)
  window.removeEventListener('orientationchange', updateViewportHeightUnit)
  window.removeEventListener('resize', updateViewportOrientationFlag)
  window.removeEventListener('orientationchange', updateViewportOrientationFlag)
  window.removeEventListener('pointerdown', onWindowPointerDown, true)
})
</script>

<template>
  <div class="app-layout" :style="appLayoutStyle" :class="{
    'is-read-only': isReadOnly,
    'is-phone-view': isPhoneView,
    'is-watch-view': isWatchView,
    'is-compact-view': isCompactView,
    'is-comment-mode': isCommentMode,
    'is-sidebar-hidden': !sidebarVisible,
    'is-debug-viewport': debugViewportFrameActive,
  }">
    <AuthDialog v-model="authOpen" />
    <ConnectionsDialog v-model="connectionsOpen" />
    <input ref="importFilesInputEl" type="file"
      accept=".musicxml,.xml,application/vnd.recordare.musicxml+xml,text/xml,application/xml" multiple hidden
      @change="onImportFilesChange" />

    <AppMenuBar
      :read-only="isReadOnly"
      @update:read-only="setReadOnly"
      :is-phone-view="isPhoneView"
      :is-compact-view="isCompactView"
      :is-watch-view="isWatchView"
      :main-view="mainView"
      :sidebar-visible="sidebarVisible"
      :app-version-label="APP_VERSION_LABEL"
      :has-notes="hasNotes"
      :auth-is-signed-in="auth.isSignedIn"
      :current-user-display-name="currentUserDisplayName"
      :current-user-avatar-url="currentUserAvatarUrl"
      :share-contacts-for-menu="shareContactsForMenu"
      :view-mode="viewMode"
      @update:view-mode="(v) => (viewMode = String(v || 'desktop'))"
      @update:sidebar-visible="(v) => (sidebarVisible = Boolean(v))"
      @open-auth="authOpen = true"
      @open-connections="connectionsOpen = true"
      @sign-out="auth.signOut()"
      @open-dashboard="openDashboard"
      @toggle-dashboard="mainView === 'dashboard' ? closeDashboard() : openDashboard()"
      @open-share-manager="openShareManager"
      @open-preferences="preferencesOpen = true"
      @open-new-song="openNewSongDialog"
      @open-song-settings="openSongSettingsDialog"
      @save-current-song="saveCurrentSong"
      @open-save-as-new="openSaveAsNew"
      @reset-editor="resetEditorToDefaultLength"
      @export-musicxml="exportMusicXml"
      @export-midi="exportMidi"
      @export-pdf="exportPdf"
      @open-import-files="openImportFiles"
      @trigger-undo="triggerUndo"
      @trigger-redo="triggerRedo"
      @share-contact="shareContact"
    />

    <div v-if="dotGroupMenu.open && !isReadOnly" class="dot-group-context-menu"
      :style="{ left: `${dotGroupMenu.x}px`, top: `${dotGroupMenu.y}px` }">
      <button type="button" class="dot-group-context-item" @click="renameDotGroup">
        Umbenennen
      </button>
      <button type="button" class="dot-group-context-item" @click="deleteDotGroup()">
        Löschen
      </button>
    </div>

    <main v-show="!showPhoneRotateOverlay || mainView === 'dashboard'" class="app-content">
      <WorkspaceLeftRail v-if="mainView !== 'dashboard' && !isCompactView && !isReadOnly" @clear="clearFretboardFromLeftRail" />
      <WorkspaceDashboardView
        v-if="mainView === 'dashboard'"
        :signed-in="auth.isSignedIn"
        :user="auth.user"
        :profile="auth.profile"
        :instrument-type="instrument.instrumentType"
        :library-items="library.items"
        :accepted-count="connections.accepted.length"
        :incoming-count="connections.incoming.length"
        :outgoing-count="connections.outgoing.length"
        :share-count="shareContacts.contacts.length"
        :song-name="songName"
        :active-panel="dashboardPanel"
        :accepted="connections.accepted"
        :incoming="connections.incoming"
        :outgoing="connections.outgoing"
        :user-label-fn="connections.userLabel"
        :profile-saving="profileSaveBusy"
        @open-auth="authOpen = true"
        @open-connections="connectionsOpen = true"
        @open-preferences="preferencesOpen = true"
        @select-panel="selectDashboardPanel"
        @close-dashboard="closeDashboard"
        @save-profile="saveDashboardProfile"
        @update-required-frets="(value) => { if (Number(value) > Number(numFrets) || 0) updateNumFrets(value) }"
      />
      <LayoutManager v-else class="app-window-manager" :presentation="isReadOnly">
        <template #pane-a>
          <WorkspaceFretboardPane
            v-if="isReadOnly || (!isCompactView && showFretboard)"
            ref="fretboardMainEl"
            :num-frets="numFrets"
            :editable="!isReadOnly"
            :core-resize-px="corePadResizePx"
            :is-phone-view="isPhoneView"
            :fretboard-style-vars="fretboardStyleVars"
            :has-dot-groups="hasDotGroups"
            :all-dot-groups-selected="allDotGroupsSelected"
            :used-dot-groups="usedDotGroups"
            :dot-label-mode="fretboardDotLabelMode"
            :play-order-scope="fretboardPlayOrderScope"
            :dot-label-mode-options="DOT_LABEL_MODE_OPTIONS"
            :play-order-scope-options="PLAY_ORDER_SCOPE_OPTIONS"
            @update-num-frets="updateNumFrets"
            @update:dot-label-mode="(v) => (fretboardDotLabelMode = String(v || 'rhythm'))"
            @update:play-order-scope="(v) => (fretboardPlayOrderScope = String(v || 'song'))"
            @open-dot-group-menu="({ event, group }) => openDotGroupMenu(event, group)"
            @activate-all-dot-groups="activateAllDotGroups"
            @activate-dot-group="activateDotGroup"
            @delete-dot-group="deleteDotGroup"
          />
          <WorkspaceFretboardPane
            v-else-if="isCompactView && phonePane === 'fretboard' && showFretboard"
            ref="fretboardMainEl"
            :num-frets="numFrets"
            :editable="!isWatchView"
            :core-resize-px="corePadResizePx"
            :is-phone-view="isPhoneView"
            :fretboard-style-vars="fretboardStyleVars"
            :has-dot-groups="hasDotGroups"
            :all-dot-groups-selected="allDotGroupsSelected"
            :used-dot-groups="usedDotGroups"
            :dot-label-mode="fretboardDotLabelMode"
            :play-order-scope="fretboardPlayOrderScope"
            :dot-label-mode-options="DOT_LABEL_MODE_OPTIONS"
            :play-order-scope-options="PLAY_ORDER_SCOPE_OPTIONS"
            @update-num-frets="updateNumFrets"
            @update:dot-label-mode="(v) => (fretboardDotLabelMode = String(v || 'rhythm'))"
            @update:play-order-scope="(v) => (fretboardPlayOrderScope = String(v || 'song'))"
            @open-dot-group-menu="({ event, group }) => openDotGroupMenu(event, group)"
            @activate-all-dot-groups="activateAllDotGroups"
            @activate-dot-group="activateDotGroup"
            @delete-dot-group="deleteDotGroup"
          />
          <Timeline v-else-if="!isReadOnly && isCompactView && phonePane === 'timeline' && showTimeline" ref="compactTimelineRef"
            :num-frets="numFrets" :compact="isCompactView" :library-panel-visible="false"
            :transport-visible="transportVisible" :external-undo-tick="timelineUndoTick"
            :external-redo-tick="timelineRedoTick" @update-transport-visible="(v) => (transportVisible = Boolean(v))" />
          <LibraryPanel v-else-if="isCompactView && phonePane === 'library'"
            @update-required-frets="(value) => { if (Number(value) > Number(numFrets) || 0) updateNumFrets(value) }" />
        </template>
        <template #pane-b>
          <WorkspacePaneB
            ref="workspaceTimelineRef"
            :show-timeline="showTimeline"
            :num-frets="numFrets"
            :compact="isCompactView"
            :transport-visible="transportVisible"
            :external-undo-tick="timelineUndoTick"
            :external-redo-tick="timelineRedoTick"
            :workspace-panel-tab="workspacePanelTab"
            @update:workspace-panel-tab="(v) => (workspacePanelTab = String(v || 'timeline'))"
            @update:transport-visible="(v) => (transportVisible = Boolean(v))"
            @update-required-frets="(value) => { if (Number(value) > Number(numFrets) || 0) updateNumFrets(value) }"
          />
        </template>
      </LayoutManager>
    </main>
    <main v-if="showPhoneRotateOverlay && mainView !== 'dashboard'" class="app-content app-phone-rotate-lock" aria-live="polite">
      <div class="app-phone-rotate-card">
        <div class="app-phone-rotate-title">Querformat</div>
        <div class="app-phone-rotate-text">Bitte Gerät drehen, um Griffbrett, Tonegroups und Player im Querformat anzuzeigen.</div>
      </div>
    </main>
    <div v-if="(isReadOnly || showTransportBar) && mainView !== 'dashboard' && !showPhoneRotateOverlay" class="app-transport-wrap">
      <TransportBar :read-only="isReadOnly" :visible="isReadOnly || transportVisible" :is-playing="timelineIsPlaying" :tempo="transport.tempo"
        :click-enabled="timelineSettings.clickEnabled" :count-in-enabled="timelineSettings.countInEnabled"
        :auto-follow-enabled="timelineSettings.autoFollowEnabled" :loop-enabled="timelineSettings.loopEnabled"
        :shuffle-enabled="timelineSettings.shuffleEnabled" :instrument-type="instrument.instrumentType"
        :is-phone-view="isCompactView" :phone-pane="phonePane" :playhead="timelinePlayhead"
        :total-duration="timelineTotalDuration" :practice-active="timelinePracticeActive"
        :practice-available="timelinePracticeAvailable" :practice-target-label="timelinePracticeTargetLabel"
        :practice-detected-label="timelinePracticeDetectedLabel" :practice-hint-text="timelinePracticeHintText"
        :practice-match-state="timelinePracticeMatchState" :record-active="timelineRecordActive"
        @toggle-play="timelineTogglePlay" @seek-start="timelineSeekStart" @seek-playhead="timelineSeekPlayhead"
        @update-tempo="transport.setTempo" @update-click="timelineSettings.setClickEnabled"
        @update-count-in-enabled="timelineSettings.setCountInEnabled"
        @update-auto-follow="timelineSettings.setAutoFollowEnabled" @update-loop="timelineSettings.setLoopEnabled"
        @update-shuffle="timelineSettings.setShuffleEnabled"
        @update-phone-pane="(v) => (phonePane = String(v || 'fretboard'))" @toggle-practice="timelineTogglePractice"
        @toggle-record="timelineToggleRecord" />
    </div>

    <AppWorkspaceDialogs
      :save-as-new-open="saveAsNewOpen"
      :save-as-new-title="saveAsNewTitle"
      :save-as-new-visibility="saveAsNewVisibility"
      :save-as-new-category="saveAsNewCategory"
      :save-as-new-busy="saveAsNewBusy"
      :has-notes="hasNotes"
      :new-song-open="newSongOpen"
      :song-dialog-mode="songDialogMode"
      :new-song-title="newSongTitle"
      :new-song-beat-top="newSongBeatTop"
      :new-song-beat-bottom="newSongBeatBottom"
      :new-song-key="newSongKey"
      :new-song-bars="newSongBars"
      :new-song-pickup-enabled="newSongPickupEnabled"
      :new-song-pickup-beats="newSongPickupBeats"
      :new-song-shuffle-enabled="newSongShuffleEnabled"
      :new-song-bpm="newSongBpm"
      :song-key-options="SONG_KEY_OPTIONS"
      :preferences-open="preferencesOpen"
      :preference-tone-duration="preferenceToneDuration"
      :preference-sound-preview="preferenceSoundPreview"
      :preference-dark-mode="preferenceDarkMode"
      :idle-dot-connections-visible="timelineSettings.idleDotConnectionsVisible"
      :idle-dot-connections-opacity="timelineSettings.idleDotConnectionsOpacity"
      :preference-language="preferenceLanguage"
      :language-items="languageItems"
      @update:save-as-new-open="(v) => (saveAsNewOpen = Boolean(v))"
      @update:save-as-new-title="(v) => (saveAsNewTitle = String(v || ''))"
      @update:save-as-new-visibility="(v) => (saveAsNewVisibility = String(v || 'private'))"
      @update:save-as-new-category="(v) => (saveAsNewCategory = String(v || ''))"
      @save-as-new="handleSaveAsNewToCloud"
      @update:new-song-open="(v) => (newSongOpen = Boolean(v))"
      @update:new-song-title="(v) => (newSongTitle = String(v || ''))"
      @update:new-song-beat-top="(v) => (newSongBeatTop = Number(v || 0))"
      @update:new-song-beat-bottom="(v) => (newSongBeatBottom = Number(v || 0))"
      @update:new-song-key="(v) => (newSongKey = String(v || 'C'))"
      @update:new-song-bars="(v) => (newSongBars = Number(v || 0))"
      @update:new-song-pickup-enabled="(v) => (newSongPickupEnabled = Boolean(v))"
      @update:new-song-pickup-beats="(v) => (newSongPickupBeats = Number(v || 0))"
      @update:new-song-shuffle-enabled="(v) => (newSongShuffleEnabled = Boolean(v))"
      @update:new-song-bpm="(v) => (newSongBpm = Number(v || 0))"
      @apply-new-song="applyNewSong"
      @update:preferences-open="(v) => (preferencesOpen = Boolean(v))"
      @update:preference-tone-duration="(v) => (preferenceToneDuration = Number(v || 0))"
      @update:preference-sound-preview="(v) => (preferenceSoundPreview = Boolean(v))"
      @update:preference-dark-mode="(v) => (preferenceDarkMode = Boolean(v))"
      @update:idle-dot-connections-visible="(v) => timelineSettings.setIdleDotConnectionsVisible(Boolean(v))"
      @update:idle-dot-connections-opacity="(v) => timelineSettings.setIdleDotConnectionsOpacity(Number(v || 0))"
      @update:preference-language="(v) => (preferenceLanguage = String(v || 'en'))"
    />

    <footer v-if="!isReadOnly" class="app-footer">
      <span>GuitarJemp ©</span>
    </footer>

    <AppViewportDebug
      v-if="isDevMode && !isReadOnly"
      :open="debugViewportOpen"
      :preset="debugViewportPreset"
      :presets="VIEWPORT_DEBUG_PRESETS"
      :effective-viewport-width-px="effectiveViewportWidthPx"
      :effective-viewport-height-px="effectiveViewportHeightPx"
      :viewport-height-unit-px="viewportHeightUnitPx"
      @update:open="(v) => (debugViewportOpen = Boolean(v))"
      @apply-preset="applyViewportDebugPreset"
    />
  </div>
</template>

<style scoped src="jemp-design-system/app-shell.css"></style>

<style scoped>
.app-layout.is-read-only {
  --app-left-rail-w: 0px;
  grid-template-rows: auto minmax(0, 1fr) auto;
  height: 100dvh;
  min-height: 0;
  padding-left: env(safe-area-inset-left, 0px);
  padding-right: env(safe-area-inset-right, 0px);
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
</style>
