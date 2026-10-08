import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { supabase, isSupabaseConfigured } from '@/infra/supabase/client'

function isMissingTableError(err) {
  const code = err?.code
  const msg = String(err?.message ?? '')
  return code === '42P01' || msg.includes('does not exist')
}

function isAbortError(err) {
  const name = String(err?.name ?? '')
  const code = String(err?.code ?? '')
  const msg = String(err?.message ?? '')
  return name === 'AbortError' || code === 'AbortError' || msg.includes('The operation was aborted')
}

export const useAuthStore = defineStore('auth', () => {
  const session = ref(null)
  const profile = ref(null)
  const initializing = ref(true)
  const recoveryMode = ref(false)
  const error = ref(null)

  const user = computed(() => session.value?.user ?? null)
  const isSignedIn = computed(() => Boolean(user.value))

  let unsubscribe = null

  async function fetchProfile() {
    profile.value = null
    if (!supabase || !user.value) return

    const { data, error: err } = await supabase
      .from('profiles')
      .select('id, display_name, role, created_at')
      .eq('id', user.value.id)
      .maybeSingle()

    if (err) {
      if (isAbortError(err)) return
      // Allow the app to run even before the DB schema exists.
      if (isMissingTableError(err)) return
      error.value = err
      return
    }

    profile.value = data ?? null

    // Backfill display_name from auth metadata when profile row exists but is missing a name.
    const metaName = String(user.value?.user_metadata?.display_name ?? '').trim()
    if (profile.value && !String(profile.value.display_name ?? '').trim() && metaName) {
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ display_name: metaName })
        .eq('id', user.value.id)

      if (isAbortError(updateErr)) return
      if (updateErr && !isMissingTableError(updateErr)) {
        error.value = updateErr
        return
      }
      profile.value = { ...profile.value, display_name: metaName }
    }
  }

  async function init() {
    initializing.value = true
    error.value = null

    if (!isSupabaseConfigured || !supabase) {
      session.value = null
      profile.value = null
      initializing.value = false
      return
    }

    const { data, error: err } = await supabase.auth.getSession()
    if (err && !isAbortError(err)) error.value = err
    session.value = data?.session ?? null
    await fetchProfile()

    if (!unsubscribe) {
      const { data: listener } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
        session.value = nextSession ?? null

        if (event === 'PASSWORD_RECOVERY') {
          recoveryMode.value = true
        }
        if (event === 'SIGNED_OUT') {
          profile.value = null
          recoveryMode.value = false
        }

        // Best-effort: refresh profile when auth changes.
        await fetchProfile()
      })
      unsubscribe = listener?.subscription?.unsubscribe ?? null
    }

    initializing.value = false
  }

  async function signIn(email, password) {
    error.value = null
    if (!supabase) {
      error.value = new Error('Supabase is not configured.')
      return
    }

    const { data, error: err } = await supabase.auth.signInWithPassword({
      email: String(email ?? ''),
      password: String(password ?? ''),
    })

    if (err) {
      if (isAbortError(err)) return
      error.value = err
      return
    }

    session.value = data?.session ?? null
    await fetchProfile()
  }

  async function signUp({ email, password, displayName } = {}) {
    error.value = null
    if (!supabase) {
      error.value = new Error('Supabase is not configured.')
      return
    }

    const nickname = String(displayName ?? '').trim()
    if (!nickname) {
      error.value = new Error('Nickname is required.')
      return
    }

    const { data, error: err } = await supabase.auth.signUp({
      email: String(email ?? ''),
      password: String(password ?? ''),
      options: {
        data: { display_name: nickname },
      },
    })

    if (err) {
      if (isAbortError(err)) return
      error.value = err
      return
    }

    session.value = data?.session ?? null

    // Profile is created server-side by trigger.
    // We set displayName only when a session already exists (without confirmation flow).
    if (session.value) {
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ display_name: nickname })
        .eq('id', session.value.user.id)

      if (isAbortError(updateErr)) return
      if (updateErr && !isMissingTableError(updateErr)) {
        error.value = updateErr
      }
    }

    await fetchProfile()
  }

  async function signOut() {
    error.value = null
    if (!supabase) return
    const { error: err } = await supabase.auth.signOut()
    if (err && !isAbortError(err)) error.value = err
    session.value = null
    profile.value = null
    recoveryMode.value = false
  }

  async function requestPasswordReset(email) {
    error.value = null
    if (!supabase) {
      error.value = new Error('Supabase is not configured.')
      return
    }

    const redirectTo = window.location.origin
    const { error: err } = await supabase.auth.resetPasswordForEmail(String(email ?? ''), {
      redirectTo,
    })
    if (err && !isAbortError(err)) error.value = err
  }

  async function updatePassword(newPassword) {
    error.value = null
    if (!supabase) {
      error.value = new Error('Supabase is not configured.')
      return
    }

    const { error: err } = await supabase.auth.updateUser({
      password: String(newPassword ?? ''),
    })

    if (err) {
      if (isAbortError(err)) return
      error.value = err
      return
    }

    recoveryMode.value = false
  }

  async function updateProfile({ displayName, avatarUrl } = {}) {
    error.value = null
    if (!supabase || !user.value) {
      error.value = new Error('Not signed in.')
      return false
    }

    const nextDisplayName = String(displayName ?? '').trim()
    const nextAvatarUrl = String(avatarUrl ?? '').trim()

    const { data, error: authErr } = await supabase.auth.updateUser({
      data: {
        display_name: nextDisplayName || null,
        avatar_url: nextAvatarUrl || null,
      },
    })

    if (authErr) {
      if (isAbortError(authErr)) return false
      error.value = authErr
      return false
    }

    if (data?.user && session.value) {
      session.value = { ...session.value, user: data.user }
    }

    if (nextDisplayName) {
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ display_name: nextDisplayName })
        .eq('id', user.value.id)

      if (isAbortError(profileErr)) return true
      if (profileErr && !isMissingTableError(profileErr)) {
        error.value = profileErr
        return false
      }
    }

    await fetchProfile()
    return true
  }

  return {
    session,
    user,
    profile,
    initializing,
    recoveryMode,
    error,
    isSignedIn,
    init,
    signIn,
    signUp,
    signOut,
    requestPasswordReset,
    updatePassword,
    updateProfile,
  }
})
