<script setup>
import { computed, ref, watch } from 'vue'
import { useAuthStore } from '@/store/useAuth'
import { isSupabaseConfigured } from '@/infra/supabase/client'
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
const { t } = useI18n()

const tab = ref('signin')
const email = ref('')
const password = ref('')
const displayName = ref('')
const newPassword = ref('')
const info = ref('')
const busy = ref(false)

watch(
    () => auth.recoveryMode,
    (v) => {
        if (v) tab.value = 'update'
    },
)

async function onSignIn() {
    if (busy.value) return
    info.value = ''
    busy.value = true
    try {
        await auth.signIn(email.value, password.value)
        if (!auth.error) open.value = false
    } finally {
        busy.value = false
    }
}

async function onSignUp() {
    if (busy.value) return
    info.value = ''
    busy.value = true
    try {
        await auth.signUp({
            email: email.value,
            password: password.value,
            displayName: displayName.value,
        })
        if (!auth.error) {
            // Supabase kann je nach Projekt-Konfiguration eine Email-Confirmation verlangen.
            info.value = t('authDialog.info.accountCreated')
        }
    } finally {
        busy.value = false
    }
}

async function onReset() {
    if (busy.value) return
    info.value = ''
    busy.value = true
    try {
        await auth.requestPasswordReset(email.value)
        if (!auth.error) {
            info.value = t('authDialog.info.resetEmail')
        }
    } finally {
        busy.value = false
    }
}

async function onUpdatePassword() {
    if (busy.value) return
    info.value = ''
    busy.value = true
    try {
        await auth.updatePassword(newPassword.value)
        if (!auth.error) {
            info.value = t('authDialog.info.passwordUpdated')
            open.value = false
        }
    } finally {
        busy.value = false
    }
}
</script>

<template>
    <v-dialog v-model="open" max-width="520">
        <v-card rounded="lg">
            <v-card-title class="d-flex align-center justify-space-between">
                <span>{{ t('authDialog.title') }}</span>
                <v-btn icon="mdi-close" variant="text" @click="open = false" />
            </v-card-title>

            <v-card-text>
                <v-alert v-if="!isSupabaseConfigured" type="warning" variant="tonal" class="mb-4">
                    {{ t('authDialog.supabaseNotConfigured') }}
                </v-alert>

                <v-alert v-if="auth.error" type="error" variant="tonal" class="mb-4">
                    {{ String(auth.error?.message ?? auth.error) }}
                </v-alert>

                <v-alert v-if="info" type="info" variant="tonal" class="mb-4">{{ info }}</v-alert>

                <template v-if="auth.isSignedIn">
                    <div class="d-flex align-center justify-space-between ga-3">
                        <div>
                            <div class="text-subtitle-1">{{ t('authDialog.signedIn') }}</div>
                            <div v-if="auth.profile" class="text-body-2 text-medium-emphasis">
                                {{ auth.profile.display_name || '—' }} · {{ auth.profile.role || 'student' }}
                            </div>
                            <div v-else class="text-body-2 text-medium-emphasis">
                                {{ auth.user?.user_metadata?.display_name || '—' }}
                            </div>
                        </div>
                        <v-btn color="primary" variant="tonal" @click="auth.signOut()">{{ t('authDialog.logout') }}</v-btn>
                    </div>
                </template>

                <template v-else>
                    <v-tabs v-model="tab" density="compact" class="mb-3">
                        <v-tab value="signin">{{ t('authDialog.login') }}</v-tab>
                        <v-tab value="signup">{{ t('authDialog.register') }}</v-tab>
                        <v-tab value="reset">{{ t('authDialog.reset') }}</v-tab>
                        <v-tab v-if="auth.recoveryMode" value="update">{{ t('authDialog.newPassword') }}</v-tab>
                    </v-tabs>

                    <v-window v-model="tab">
                        <v-window-item value="signin">
                            <v-text-field v-model="email" :label="t('authDialog.email')" type="email" autocomplete="email" />
                            <v-text-field v-model="password" :label="t('authDialog.password')" type="password"
                                autocomplete="current-password" />
                            <v-btn block color="primary" :loading="busy" :disabled="busy" @click="onSignIn">{{ t('authDialog.login') }}</v-btn>
                        </v-window-item>

                        <v-window-item value="signup">
                            <v-text-field v-model="displayName" :label="t('authDialog.name')" autocomplete="nickname" />
                            <v-text-field v-model="email" :label="t('authDialog.email')" type="email" autocomplete="email" />
                            <v-text-field v-model="password" :label="t('authDialog.password')" type="password"
                                autocomplete="new-password" />
                            <v-btn block color="primary" :loading="busy" :disabled="busy || !String(displayName ?? '').trim()" @click="onSignUp">{{ t('authDialog.createAccount') }}</v-btn>
                        </v-window-item>

                        <v-window-item value="reset">
                            <v-text-field v-model="email" :label="t('authDialog.email')" type="email" autocomplete="email" />
                            <v-btn block color="primary" variant="tonal" :loading="busy" :disabled="busy" @click="onReset">{{ t('authDialog.sendResetEmail') }}</v-btn>
                        </v-window-item>

                        <v-window-item value="update">
                            <v-alert type="info" variant="tonal" class="mb-3">
                                {{ t('authDialog.recoveryModeInfo') }}
                            </v-alert>
                            <v-text-field v-model="newPassword" :label="t('authDialog.newPassword')" type="password"
                                autocomplete="new-password" />
                            <v-btn block color="primary" :loading="busy" :disabled="busy" @click="onUpdatePassword">{{ t('authDialog.setPassword') }}</v-btn>
                        </v-window-item>
                    </v-window>
                </template>
            </v-card-text>
        </v-card>
    </v-dialog>
</template>
