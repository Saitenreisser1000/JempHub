<script setup>
import { computed, ref, watch } from 'vue'
import SocialConnectPanel from './SocialConnectPanel.vue'
import { useShareContactsStore } from '@/store/useShareContacts'

const props = defineProps({
  panel: { type: String, default: 'library' },
  signedIn: { type: Boolean, default: false },
  user: { type: Object, default: null },
  profile: { type: Object, default: null },
  instrumentType: { type: String, default: 'guitar' },
  libraryItems: { type: Array, default: () => [] },
  accepted: { type: Array, default: () => [] },
  incoming: { type: Array, default: () => [] },
  outgoing: { type: Array, default: () => [] },
  userLabelFn: { type: Function, default: (id) => String(id || '') },
  profileSaving: { type: Boolean, default: false },
})

const emit = defineEmits(['open-auth', 'save-profile'])
const shareContacts = useShareContactsStore()

const profileNameInput = ref('')
const profileAvatarInput = ref('')

const resolvedDisplayName = computed(
  () =>
    String(
      props.profile?.display_name ||
      props.user?.user_metadata?.display_name ||
      props.user?.email ||
      'User',
    ),
)

const resolvedAvatarUrl = computed(() => {
  const url = String(props.user?.user_metadata?.avatar_url || '').trim()
  if (url) return url
  const fallbackName = encodeURIComponent(resolvedDisplayName.value)
  return `https://ui-avatars.com/api/?name=${fallbackName}&background=334155&color=ffffff&size=192&bold=true`
})

const categoryRows = computed(() => {
  const byCategory = new Map()
  for (const item of props.libraryItems || []) {
    const key = String(item?.category || 'Unkategorisiert').trim() || 'Unkategorisiert'
    byCategory.set(key, (byCategory.get(key) || 0) + 1)
  }
  return [...byCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }))
})

function resetProfileForm() {
  profileNameInput.value = resolvedDisplayName.value
  profileAvatarInput.value = String(props.user?.user_metadata?.avatar_url || '').trim()
}

async function submitProfile() {
  if (!props.signedIn) {
    emit('open-auth')
    return
  }
  emit('save-profile', {
    displayName: String(profileNameInput.value || '').trim(),
    avatarUrl: String(profileAvatarInput.value || '').trim(),
  })
}

watch(
  () => [props.panel, props.profile, props.user],
  () => {
    if (props.panel === 'profile') resetProfileForm()
  },
  { immediate: true, deep: true },
)
</script>

<template>
  <section class="dashboard-detail">
    <v-card v-if="panel === 'library'" rounded="lg" variant="tonal" class="detail-card">
      <v-card-title>Library</v-card-title>
      <v-card-text class="text-medium-emphasis">
        Deine Library wird hier angezeigt.
      </v-card-text>
    </v-card>

    <v-card v-else-if="panel === 'profile'" rounded="lg" variant="tonal" class="detail-card">
      <v-card-title>Profil bearbeiten</v-card-title>
      <v-card-text class="d-flex flex-column ga-3">
        <div class="profile-preview">
          <v-avatar size="72">
            <v-img :src="profileAvatarInput || resolvedAvatarUrl" alt="Profile Avatar" />
          </v-avatar>
          <div>
            <div class="text-subtitle-1">{{ resolvedDisplayName }}</div>
            <div class="text-caption text-medium-emphasis">{{ user?.email || '-' }}</div>
            <div class="text-caption text-medium-emphasis">Instrument: {{ instrumentType }}</div>
          </div>
        </div>
        <v-text-field v-model="profileNameInput" label="Nickname" density="compact" variant="outlined" />
        <v-text-field v-model="profileAvatarInput" label="Profilbild URL" density="compact" variant="outlined"
          placeholder="https://..." hint="Leer lassen für generiertes Avatar-Bild" persistent-hint />
        <div class="d-flex justify-end">
          <v-btn color="primary" variant="flat" :loading="profileSaving" :disabled="profileSaving"
            @click="submitProfile">
            Profil speichern
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <v-card v-else-if="panel === 'categories'" rounded="lg" variant="tonal" class="detail-card">
      <v-card-title>Kategorien</v-card-title>
      <v-card-text>
        <v-table density="compact">
          <thead>
            <tr>
              <th>Kategorie</th>
              <th class="text-right">Einträge</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in categoryRows" :key="row.label">
              <td>{{ row.label }}</td>
              <td class="text-right">{{ row.count }}</td>
            </tr>
            <tr v-if="categoryRows.length === 0">
              <td colspan="2" class="text-medium-emphasis">Keine Kategorien vorhanden.</td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>
    </v-card>

    <div v-else-if="panel === 'connections'" class="detail-connections">
      <v-card rounded="lg" variant="tonal" class="detail-card">
        <v-card-title>Freundschaften & Anfragen</v-card-title>
        <v-card-text class="d-flex flex-column ga-4">
          <v-alert v-if="!signedIn" type="info" variant="tonal"
            text="Login erforderlich, um Freundschaften zu verwalten." />
          <template v-else>
            <div>
              <div class="text-subtitle-2 mb-1">Eingehend</div>
              <div v-if="incoming.length === 0" class="text-caption text-medium-emphasis">Keine offenen Anfragen.</div>
              <div v-for="row in incoming" :key="`in-${row.id}`" class="text-body-2">
                {{ userLabelFn(row.requester_id) }}
              </div>
            </div>
            <div>
              <div class="text-subtitle-2 mb-1">Ausgehend</div>
              <div v-if="outgoing.length === 0" class="text-caption text-medium-emphasis">Keine gesendeten Anfragen.
              </div>
              <div v-for="row in outgoing" :key="`out-${row.id}`" class="text-body-2">
                {{ userLabelFn(row.addressee_id) }}
              </div>
            </div>
            <div>
              <div class="text-subtitle-2 mb-1">Freunde</div>
              <div v-if="accepted.length === 0" class="text-caption text-medium-emphasis">Noch keine Freunde.</div>
              <div v-for="row in accepted" :key="`acc-${row.id}`" class="text-body-2">
                {{ userLabelFn(row.requester_id) }} / {{ userLabelFn(row.addressee_id) }}
              </div>
            </div>
          </template>
        </v-card-text>
      </v-card>
      <SocialConnectPanel :signed-in="signedIn" />
    </div>

    <v-card v-else-if="panel === 'share'" rounded="lg" variant="tonal" class="detail-card">
      <v-card-title class="d-flex align-center justify-space-between">
        <span>Share Kontakte</span>
        <v-btn size="small" variant="tonal" color="primary" icon aria-label="Kontakt hinzufügen"
          @click="shareContacts.addContact()">
          <v-icon>mdi-plus</v-icon>
        </v-btn>
      </v-card-title>
      <v-card-text>
        <v-table density="compact">
          <thead>
            <tr>
              <th>Name</th>
              <th>E-Mail</th>
              <th>WhatsApp</th>
              <th class="text-right">Aktion</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="contact in shareContacts.contacts" :key="contact.id">
              <td>
                <v-text-field :model-value="contact.name" density="compact" variant="outlined" hide-details
                  placeholder="Name"
                  @update:model-value="(v) => shareContacts.updateContactField(contact.id, 'name', v)" />
              </td>
              <td>
                <v-text-field :model-value="contact.email" density="compact" variant="outlined" hide-details
                  placeholder="name@mail.com"
                  @update:model-value="(v) => shareContacts.updateContactField(contact.id, 'email', v)" />
              </td>
              <td>
                <v-text-field :model-value="contact.whatsapp" density="compact" variant="outlined" hide-details
                  placeholder="+43..."
                  @update:model-value="(v) => shareContacts.updateContactField(contact.id, 'whatsapp', v)" />
              </td>
              <td class="text-right">
                <v-btn size="small" variant="tonal" color="error" icon="mdi-delete-outline"
                  @click="shareContacts.removeContact(contact.id)" />
              </td>
            </tr>
            <tr v-if="shareContacts.contacts.length === 0">
              <td colspan="4" class="text-medium-emphasis">Keine Kontakte vorhanden.</td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>
    </v-card>
  </section>
</template>

<style scoped>
.dashboard-detail {
  height: 100%;
  min-height: 0;
}

.detail-card {
  height: 100%;
  min-height: 0;
}

.profile-preview {
  display: flex;
  align-items: center;
  gap: 12px;
}

.detail-connections {
  display: grid;
  grid-template-rows: minmax(190px, 0.75fr) minmax(0, 1fr);
  gap: 10px;
  height: 100%;
  min-height: 0;
}

@media (max-width: 1000px) {
  .detail-connections {
    grid-template-rows: minmax(220px, 0.8fr) minmax(0, 1fr);
  }
}
</style>
