<script setup>
import { computed, ref, watch } from 'vue'
import { useAuthStore } from '@/store/useAuth'
import { useConnectionsStore } from '@/store/useConnections'
import { useI18n } from '@/i18n'

const props = defineProps({
    modelValue: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const open = computed({
    get: () => props.modelValue,
    set: (v) => emit('update:modelValue', v),
})

const auth = useAuthStore()
const connections = useConnectionsStore()
const { t } = useI18n()

const tab = ref('friends')
const query = ref('')

watch(
    () => open.value,
    async (v) => {
        if (!v) return
        if (auth.isSignedIn) await connections.refresh()
    },
)

watch(
    () => query.value,
    async (q) => {
        if (!open.value) return
        await connections.searchProfiles(q)
    },
)
</script>

<template>
    <v-dialog v-model="open" max-width="820">
        <v-card rounded="lg">
            <v-card-title class="d-flex align-center justify-space-between">
                <span>{{ t('connectionsDialog.title') }}</span>
                <v-btn icon="mdi-close" variant="text" @click="open = false" />
            </v-card-title>

            <v-card-text>
                <v-alert v-if="!auth.isSignedIn" type="info" variant="tonal" class="mb-4">
                    {{ t('connectionsDialog.signInHint') }}
                </v-alert>

                <v-alert v-if="connections.error" type="error" variant="tonal" class="mb-4">
                    {{ String(connections.error?.message ?? connections.error) }}
                </v-alert>

                <template v-if="auth.isSignedIn">
                    <v-tabs v-model="tab" density="compact" class="mb-3">
                        <v-tab value="friends">{{ t('connectionsDialog.friends') }}</v-tab>
                        <v-tab value="requests">{{ t('connectionsDialog.requests') }}</v-tab>
                        <v-tab value="search">{{ t('connectionsDialog.search') }}</v-tab>
                    </v-tabs>

                    <v-window v-model="tab">
                        <v-window-item value="friends">
                            <div class="d-flex align-center justify-space-between mb-2">
                                <div class="text-subtitle-1">{{ t('connectionsDialog.connections') }}</div>
                                <v-btn variant="tonal" @click="connections.refresh">{{ t('connectionsDialog.refresh') }}</v-btn>
                            </div>

                            <v-table density="compact">
                                <thead>
                                    <tr>
                                        <th>{{ t('connectionsDialog.connection') }}</th>
                                        <th>{{ t('connectionsDialog.status') }}</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="row in connections.accepted" :key="row.id">
                                        <td class="text-medium-emphasis">
                                            {{ connections.userLabel(row.requester_id) }} ↔ {{ connections.userLabel(row.addressee_id) }}
                                        </td>
                                        <td>{{ t('connectionsDialog.accepted') }}</td>
                                        <td class="text-right">
                                            <v-btn size="small" variant="tonal"
                                                @click="connections.removeConnection(row.id)">
                                                {{ t('connectionsDialog.remove') }}
                                            </v-btn>
                                        </td>
                                    </tr>
                                    <tr v-if="connections.accepted.length === 0">
                                        <td colspan="3" class="text-medium-emphasis">{{ t('connectionsDialog.noFriends') }}</td>
                                    </tr>
                                </tbody>
                            </v-table>

                            <v-alert type="info" variant="tonal" class="mt-4">
                                {{ t('connectionsDialog.idsNote') }}
                            </v-alert>
                        </v-window-item>

                        <v-window-item value="requests">
                            <div class="text-subtitle-1 mb-2">{{ t('connectionsDialog.incoming') }}</div>
                            <v-table density="compact" class="mb-4">
                                <thead>
                                    <tr>
                                        <th>{{ t('connectionsDialog.from') }}</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="row in connections.incoming" :key="row.id">
                                        <td class="text-medium-emphasis">{{ connections.userLabel(row.requester_id) }}</td>
                                        <td class="text-right">
                                            <v-btn size="small" color="primary"
                                                @click="connections.acceptRequest(row.id)">
                                                {{ t('connectionsDialog.accept') }}
                                            </v-btn>
                                            <v-btn size="small" variant="tonal"
                                                @click="connections.rejectRequest(row.id)">
                                                {{ t('connectionsDialog.reject') }}
                                            </v-btn>
                                        </td>
                                    </tr>
                                    <tr v-if="connections.incoming.length === 0">
                                        <td colspan="2" class="text-medium-emphasis">{{ t('connectionsDialog.noIncoming') }}</td>
                                    </tr>
                                </tbody>
                            </v-table>

                            <div class="text-subtitle-1 mb-2">{{ t('connectionsDialog.outgoing') }}</div>
                            <v-table density="compact">
                                <thead>
                                    <tr>
                                        <th>{{ t('connectionsDialog.to') }}</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="row in connections.outgoing" :key="row.id">
                                        <td class="text-medium-emphasis">{{ connections.userLabel(row.addressee_id) }}</td>
                                        <td class="text-right">
                                            <v-btn size="small" variant="tonal"
                                                @click="connections.removeConnection(row.id)">
                                                {{ t('connectionsDialog.withdraw') }}
                                            </v-btn>
                                        </td>
                                    </tr>
                                    <tr v-if="connections.outgoing.length === 0">
                                        <td colspan="2" class="text-medium-emphasis">{{ t('connectionsDialog.noOutgoing') }}</td>
                                    </tr>
                                </tbody>
                            </v-table>
                        </v-window-item>

                        <v-window-item value="search">
                            <v-text-field v-model="query" :label="t('connectionsDialog.searchName')" density="compact"
                                prepend-inner-icon="mdi-magnify" class="mb-3" />

                            <v-table density="compact">
                                <thead>
                                    <tr>
                                        <th>{{ t('connectionsDialog.name') }}</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="p in connections.searchResults" :key="p.id">
                                        <td>{{ p.display_name || p.id }}</td>
                                        <td class="text-right">
                                            <v-btn size="small" color="primary" @click="connections.sendRequest(p.id)">
                                                {{ t('connectionsDialog.sendRequest') }}
                                            </v-btn>
                                        </td>
                                    </tr>
                                    <tr v-if="connections.searchResults.length === 0">
                                        <td colspan="2" class="text-medium-emphasis">{{ t('connectionsDialog.noResults') }}</td>
                                    </tr>
                                </tbody>
                            </v-table>

                            <v-alert type="info" variant="tonal" class="mt-4">
                                {{ t('connectionsDialog.displayNameTip') }}
                            </v-alert>
                        </v-window-item>
                    </v-window>
                </template>
            </v-card-text>
        </v-card>
    </v-dialog>
</template>
