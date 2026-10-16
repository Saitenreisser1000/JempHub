<template>
  <nav class="app-menu-bar" :aria-label="t('timelineView.mainMenu')">
    <div class="app-menu-brand">GuitarJemp</div>
    <span class="app-version-label">{{ appVersionLabel }}</span>
    <div class="app-song-title" :title="songTitle">{{ songTitle }}</div>
    <v-btn v-if="mainView === 'dashboard'" variant="tonal" prepend-icon="mdi-arrow-left"
      class="app-menu-btn" @click="emit('toggle-dashboard')">{{ t('ux.backToSong') }}</v-btn>
    <v-btn v-else-if="readOnly" variant="text" prepend-icon="mdi-bookshelf" class="app-menu-btn"
      @click="emit('open-dashboard')">{{ t('libraryDialog.title') }}</v-btn>
    <template v-if="!readOnly">
    <v-menu v-if="isPhoneView" location="bottom start">
      <template #activator="{ props: menuProps }">
        <v-btn v-bind="menuProps" icon="mdi-menu" variant="text" size="small" class="app-menu-btn app-hamburger-btn"
          aria-label="Open menu" />
      </template>
      <v-list density="compact" min-width="260">
        <v-list-subheader>File</v-list-subheader>
        <v-list-item title="New" @click="emit('open-new-song')" />
        <v-list-item title="Save" @click="emit('save-current-song')" />
        <v-list-item title="Save As New" @click="emit('open-save-as-new')" />
        <v-list-item title="Reset" @click="emit('reset-editor')" />
        <v-divider class="my-1" />
        <v-list-item title="Import MusicXML" @click="emit('open-import-files')" />
        <v-divider class="my-1" />
        <v-list-subheader>Edit</v-list-subheader>
        <v-list-item title="Undo" @click="emit('trigger-undo')" />
        <v-list-item title="Redo" @click="emit('trigger-redo')" />
        <v-list-item title="Preferences" @click="emit('open-preferences')" />
        <v-divider class="my-1" />
        <v-list-subheader>Song</v-list-subheader>
        <v-list-item title="Song Settings" @click="emit('open-song-settings')" />
        <v-divider class="my-1" />
        <v-list-subheader>{{ t('app.account') }}</v-list-subheader>
        <v-list-item prepend-icon="mdi-view-dashboard-outline" :title="t('app.dashboard')" @click="emit('open-dashboard')" />
        <v-divider v-if="mainView !== 'dashboard'" class="my-1" />
        <v-list-subheader v-if="mainView !== 'dashboard'">Share</v-list-subheader>
        <v-list-item v-if="mainView !== 'dashboard'" prepend-icon="mdi-account-edit-outline"
          title="Kontakte verwalten" @click="emit('open-share-manager')" />
        <v-list-group v-for="contact in mainView !== 'dashboard' ? shareContactsForMenu : []"
          :key="`phone-share-${contact.id}`" :value="`phone-share-${contact.id}`">
          <template #activator="{ props: groupProps }">
            <v-list-item v-bind="groupProps" :title="contact.name" prepend-icon="mdi-account">
              <template #append>
                <div class="d-inline-flex align-center ga-1">
                  <v-icon v-if="contact.hasEmail" size="16" icon="mdi-email-outline" />
                  <v-icon v-if="contact.hasWhatsApp" size="16" icon="mdi-whatsapp" />
                </div>
              </template>
            </v-list-item>
          </template>
          <v-list-item v-if="contact.hasEmail" title="Per Mail senden" prepend-icon="mdi-email-outline"
            @click="emit('share-contact', contact, 'email')" />
          <v-list-item v-if="contact.hasWhatsApp" title="Per WhatsApp senden" prepend-icon="mdi-whatsapp"
            @click="emit('share-contact', contact, 'whatsapp')" />
          <v-list-item v-if="contact.hasEmail && contact.hasWhatsApp" title="Per Mail + WhatsApp senden"
            prepend-icon="mdi-send-circle-outline" @click="emit('share-contact', contact, 'both')" />
          <v-list-item v-if="!contact.hasEmail && !contact.hasWhatsApp" title="Keine Mail/WhatsApp hinterlegt"
            prepend-icon="mdi-alert-circle-outline" disabled />
        </v-list-group>
        <v-list-item v-if="mainView !== 'dashboard' && shareContactsForMenu.length === 0" title="Keine Kontakte" />
        <v-divider class="my-1" />
        <v-list-subheader>View</v-list-subheader>
        <v-list-item title="Anzeigemodus" prepend-icon="mdi-eye-outline" @click="emit('update:readOnly', true)" />
        <v-list-item title="Bearbeitungsmodus" prepend-icon="mdi-pencil-outline" active @click="emit('update:readOnly', false)" />
        <v-list-item title="Desktop" @click="emit('update:viewMode', 'desktop')" />
        <v-list-item title="Phone" @click="emit('update:viewMode', 'phone')" />
        <v-list-item title="Watch" @click="emit('update:viewMode', 'watch')" />
      </v-list>
    </v-menu>

    <template v-if="!isPhoneView">
      <v-menu location="bottom start">
        <template #activator="{ props: menuProps }">
          <v-btn v-bind="menuProps" variant="text" size="small" class="app-menu-btn">File</v-btn>
        </template>
        <v-list density="compact" min-width="220">
          <v-list-item title="New" @click="emit('open-new-song')" />
          <v-divider class="my-1" />
          <v-list-item title="Save" @click="emit('save-current-song')" />
          <v-list-item title="Save As New" @click="emit('open-save-as-new')" />
          <v-list-item title="Reset" @click="emit('reset-editor')" />
          <v-divider class="my-1" />
          <v-list-item title="Export MusicXML" :disabled="!hasNotes" @click="emit('export-musicxml')" />
          <v-list-item title="Export MIDI" :disabled="!hasNotes" @click="emit('export-midi')" />
          <v-list-item title="Export PDF" :disabled="!hasNotes" @click="emit('export-pdf')" />
          <v-divider class="my-1" />
          <v-list-item title="Import MusicXML" @click="emit('open-import-files')" />
        </v-list>
      </v-menu>

      <v-menu location="bottom start">
        <template #activator="{ props: menuProps }">
          <v-btn v-bind="menuProps" variant="text" size="small" class="app-menu-btn">Edit</v-btn>
        </template>
        <v-list density="compact" min-width="180">
          <v-list-item title="Undo" @click="emit('trigger-undo')" />
          <v-list-item title="Redo" @click="emit('trigger-redo')" />
          <v-divider class="my-1" />
          <v-list-item title="Preferences" @click="emit('open-preferences')" />
        </v-list>
      </v-menu>

      <v-menu location="bottom start">
        <template #activator="{ props: menuProps }">
          <v-btn v-bind="menuProps" variant="text" size="small" class="app-menu-btn">Song</v-btn>
        </template>
        <v-list density="compact" min-width="220">
          <v-list-item title="Song Settings" @click="emit('open-song-settings')" />
        </v-list>
      </v-menu>

      <v-menu location="bottom start" :close-on-content-click="false">
        <template #activator="{ props: menuProps }">
          <v-btn v-bind="menuProps" variant="text" size="small" class="app-menu-btn">View</v-btn>
        </template>
        <v-card class="pa-3 d-flex flex-column ga-2" min-width="280">
          <v-switch label="Anzeigemodus" :model-value="readOnly" hide-details density="compact"
            @update:model-value="(value) => emit('update:readOnly', Boolean(value))" />
          <div class="text-caption">Viewport</div>
          <v-btn-toggle :model-value="viewMode" mandatory divided
            @update:model-value="(v) => emit('update:viewMode', String(v || 'desktop'))">
            <v-btn value="desktop" size="small" variant="tonal">Desktop</v-btn>
            <v-btn value="phone" size="small" variant="tonal">Phone</v-btn>
            <v-btn value="watch" size="small" variant="tonal">Watch</v-btn>
          </v-btn-toggle>
        </v-card>
      </v-menu>
    </template>

    <v-btn v-if="!isCompactView" variant="text" size="small" class="app-menu-btn" :active="sidebarVisible"
      @click="emit('update:sidebarVisible', !sidebarVisible)">
      Toolbar
    </v-btn>

    <v-menu v-if="!isCompactView && mainView !== 'dashboard'" location="bottom start">
      <template #activator="{ props: menuProps }">
        <v-btn v-bind="menuProps" variant="text" size="small" class="app-menu-btn" aria-label="Share">
          <v-icon size="18">mdi-export-variant</v-icon>
        </v-btn>
      </template>
      <v-list density="compact" min-width="220">
        <v-list-item prepend-icon="mdi-account-edit-outline" title="Kontakte verwalten"
          @click="emit('open-share-manager')" />
        <v-divider class="my-1" />
        <v-list-subheader>Kontakte</v-list-subheader>
        <v-list-group v-for="contact in shareContactsForMenu" :key="contact.id" :value="contact.id">
          <template #activator="{ props: groupProps }">
            <v-list-item v-bind="groupProps" :title="contact.name" prepend-icon="mdi-account">
              <template #append>
                <div class="d-inline-flex align-center ga-1">
                  <v-icon v-if="contact.hasEmail" size="16" icon="mdi-email-outline" />
                  <v-icon v-if="contact.hasWhatsApp" size="16" icon="mdi-whatsapp" />
                </div>
              </template>
            </v-list-item>
          </template>
          <v-list-item v-if="contact.hasEmail" title="Per Mail senden" prepend-icon="mdi-email-outline"
            @click="emit('share-contact', contact, 'email')" />
          <v-list-item v-if="contact.hasWhatsApp" title="Per WhatsApp senden" prepend-icon="mdi-whatsapp"
            @click="emit('share-contact', contact, 'whatsapp')" />
          <v-list-item v-if="contact.hasEmail && contact.hasWhatsApp" title="Per Mail + WhatsApp senden"
            prepend-icon="mdi-send-circle-outline" @click="emit('share-contact', contact, 'both')" />
          <v-list-item v-if="!contact.hasEmail && !contact.hasWhatsApp" title="Keine Mail/WhatsApp hinterlegt"
            prepend-icon="mdi-alert-circle-outline" disabled />
        </v-list-group>
        <v-list-item v-if="shareContactsForMenu.length === 0" title="Keine Kontakte" />
      </v-list>
    </v-menu>

    </template>
    <div class="app-menu-right">
      <v-chip v-if="authIsSignedIn && !isPhoneView" size="small" color="success" variant="tonal"
        :prepend-avatar="currentUserAvatarUrl" class="app-user-chip" @click="emit('toggle-dashboard')">
        {{ currentUserDisplayName }}
      </v-chip>
      <v-menu v-if="!readOnly && isCompactView && !isWatchView" location="bottom end" :close-on-content-click="false">
        <template #activator="{ props: menuProps }">
          <v-btn v-bind="menuProps" variant="tonal" size="small" class="app-menu-tools-btn" prepend-icon="mdi-tools">
            Tools
          </v-btn>
        </template>
        <v-card class="app-phone-tools-menu" min-width="260">
          <FretboardContextMenu />
        </v-card>
      </v-menu>
      <v-btn v-else-if="!readOnly && isWatchView" variant="tonal" size="small" class="app-menu-tools-btn" prepend-icon="mdi-tools"
        disabled>
        Tools
      </v-btn>
      <v-menu location="bottom end">
        <template #activator="{ props: menuProps }">
          <v-btn v-bind="menuProps" size="small" variant="tonal" prepend-icon="mdi-account"
            :aria-label="t('app.account')">
            {{ t('app.account') }}
          </v-btn>
        </template>
        <v-list density="compact" min-width="180">
          <v-list-item :prepend-icon="authIsSignedIn ? 'mdi-logout' : 'mdi-login'"
            :title="authIsSignedIn ? t('app.logout') : t('app.login')" @click="emit(authIsSignedIn ? 'sign-out' : 'open-auth')" />
          <v-list-item prepend-icon="mdi-account-multiple" :title="t('app.friends')" :disabled="!authIsSignedIn"
            @click="emit('open-connections')" />
          <v-list-item prepend-icon="mdi-view-dashboard-outline" :title="t('app.dashboard')" @click="emit('open-dashboard')" />
        </v-list>
      </v-menu>
    </div>
    <v-btn-toggle class="app-mode-switch" :model-value="readOnly" mandatory
      density="compact" variant="text" selected-class="app-mode-switch-active"
      :aria-label="t('ux.workspaceMode')" @update:model-value="(value) => emit('update:readOnly', value)">
      <v-btn :value="true" size="small" prepend-icon="mdi-eye-outline" :aria-pressed="readOnly">{{ t('ux.viewMode') }}</v-btn>
      <v-btn :value="false" size="small" prepend-icon="mdi-pencil-outline" :aria-pressed="!readOnly">{{ t('ux.editMode') }}</v-btn>
    </v-btn-toggle>
  </nav>
</template>

<script setup>
import FretboardContextMenu from '@/features/fretboard/components/FretboardContextMenu.vue'
import { useI18n } from '@/i18n'

const { t } = useI18n()

defineProps({
  readOnly: { type: Boolean, default: false },
  isPhoneView: { type: Boolean, default: false },
  isCompactView: { type: Boolean, default: false },
  isWatchView: { type: Boolean, default: false },
  mainView: { type: String, default: 'workspace' },
  sidebarVisible: { type: Boolean, default: true },
  appVersionLabel: { type: String, required: true },
  songTitle: { type: String, default: '' },
  hasNotes: { type: Boolean, default: false },
  authIsSignedIn: { type: Boolean, default: false },
  currentUserDisplayName: { type: String, default: '' },
  currentUserAvatarUrl: { type: String, default: '' },
  shareContactsForMenu: { type: Array, default: () => [] },
  viewMode: { type: String, default: 'desktop' },
})

const emit = defineEmits([
  'update:readOnly',
  'update:viewMode',
  'update:sidebarVisible',
  'open-auth',
  'open-connections',
  'sign-out',
  'open-dashboard',
  'toggle-dashboard',
  'open-share-manager',
  'open-preferences',
  'open-new-song',
  'open-song-settings',
  'save-current-song',
  'open-save-as-new',
  'reset-editor',
  'export-musicxml',
  'export-midi',
  'export-pdf',
  'open-import-files',
  'trigger-undo',
  'trigger-redo',
  'share-contact',
])
</script>

<style scoped>
.app-menu-bar {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  min-height: 42px;
  padding: 6px 10px;
  border-bottom: 1px solid var(--app-border);
  background: var(--app-grad-menu-bar);
  color: var(--app-text);
  box-shadow: 0 1px 0 rgb(255 255 255 / 0.04);
}

.app-menu-brand {
  flex-shrink: 0;
  font-size: 1.1rem;
  font-weight: 900;
  letter-spacing: 0.02em;
  font-family: var(--font-display);
  padding-right: 8px;
  margin-right: 4px;
  border-right: 1px solid var(--app-border);
}

.app-version-label {
  font-size: 12px;
  line-height: 1;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--app-text-dim);
  white-space: nowrap;
  margin-right: 4px;
}

.app-menu-right {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.app-menu-tools-btn {
  text-transform: none;
  font-size: 12px;
  font-weight: 600;
}

.app-user-chip {
  cursor: pointer;
}

.app-phone-tools-menu {
  max-height: min(60vh, 420px);
  overflow: auto;
  padding: 8px;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius-lg);
  background: linear-gradient(180deg, var(--app-bg-panel-2), var(--app-bg-panel));
  box-shadow: var(--app-shadow-lg);
}

.app-menu-btn {
  min-width: auto;
  padding-inline: 8px;
  text-transform: none;
  font-size: 12px;
  font-weight: 600;
  color: var(--app-text-muted);
  border-radius: 10px;
}

.app-menu-btn:hover {
  background: var(--app-glass-3);
  color: var(--app-text);
}

.app-hamburger-btn {
  margin-left: 2px;
}

.app-song-title {
  flex: 0 1 180px;
  min-width: 64px;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-right: 8px;
}

.app-mode-switch {
  flex: 0 0 auto;
  height: auto;
  margin-left: auto;
  padding: 3px;
  border: 1px solid var(--app-border);
  border-radius: 11px;
  background: color-mix(in srgb, var(--app-layer-0) 70%, transparent);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.04);
}

.app-mode-switch :deep(.v-btn) {
  min-height: 32px;
  min-width: 0;
  padding-inline: 10px;
  border-radius: 8px !important;
  color: var(--app-text-muted);
  font-size: 12px;
  font-weight: 650;
}

.app-mode-switch :deep(.app-mode-switch-active) {
  background: color-mix(in srgb, var(--color-primary) 18%, var(--app-layer-2));
  color: var(--app-text);
  box-shadow: 0 1px 5px rgb(0 0 0 / 0.2), inset 0 0 0 1px color-mix(in srgb, var(--color-primary) 42%, transparent);
}

.app-menu-bar :deep(.v-btn) {
  min-height: 40px;
  text-transform: none;
  letter-spacing: 0;
}

.app-menu-bar :deep(.v-btn:focus-visible) {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

@media (max-width: 600px) {
  .app-song-title { flex: 1 1 100px; }
  .app-menu-bar { gap: 6px; padding: 6px 8px; }
  .app-menu-bar :deep(.v-btn) { min-height: 44px; }
  .app-mode-switch { width: 100%; margin-left: 0; }
  .app-mode-switch :deep(.v-btn) { flex: 1 1 50%; }
}
</style>
