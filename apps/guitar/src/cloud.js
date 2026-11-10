// Connection to Supabase. Optional: without a config.js next to index.html the
// app runs entirely in this browser. All tables and functions are prefixed gj_
// (see supabase/001_guitarjemp.sql).

const SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/+esm'

let client = null
let user = null
const listeners = new Set()

const here = () => location.origin + location.pathname

export async function initCloud() {
  let cfg = null
  try {
    cfg = (await import(new URL('../config.js', import.meta.url).href)).default
  } catch {
    return false
  }
  if (!cfg || !/^https:\/\//.test(cfg.supabaseUrl || '') || !cfg.supabaseAnonKey || /^PASTE/.test(cfg.supabaseAnonKey)) return false
  try {
    const { createClient } = await import(SUPABASE_JS)
    client = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  } catch (e) {
    console.warn('GuitarJemp: cloud library unavailable', e)
    client = null
    return false
  }
  client.auth.onAuthStateChange((event, session) => {
    user = session?.user || null
    // Supabase recommends not calling other Supabase methods inside this callback.
    setTimeout(() => listeners.forEach((fn) => fn(event, user)), 0)
  })
  const { data } = await client.auth.getSession()
  user = data.session?.user || null
  return true
}

export const cloudReady = () => !!client
export const currentUser = () => user
export const onAuthChange = (fn) => listeners.add(fn)

// Fehler der Datenbank in verständliche Meldungen übersetzen
function check({ data, error }) {
  if (error) {
    const m = /gj_limit:(\d+)/.exec(error.message || '')
    if (m) throw new Error('Students can keep up to ' + m[1] + ' exercises. Ask an admin for teacher access.')
    if (/gj_not_admin/.test(error.message || '')) throw new Error('Admins only.')
    throw error
  }
  return data
}

export async function signIn(email, password) {
  check(await client.auth.signInWithPassword({ email, password }))
}

export async function signUp(email, password, displayName) {
  const data = check(await client.auth.signUp({ email, password, options: { data: { display_name: displayName }, emailRedirectTo: here() } }))
  return { needsConfirmation: !data.session }
}

export async function sendPasswordReset(email) {
  check(await client.auth.resetPasswordForEmail(email, { redirectTo: here() }))
}

export async function setNewPassword(password) {
  check(await client.auth.updateUser({ password }))
}

export async function signOut() {
  check(await client.auth.signOut())
}

// Profil mit Rolle und Grenzen: { display_name, role, teacher_requested, max_exercises, can_share, exercise_count, pending_requests }
export async function loadProfile() {
  const p = check(await client.from('gj_profiles').select('display_name').eq('id', user.id).maybeSingle())
  const a = check(await client.rpc('gj_my_account'))
  return { display_name: p?.display_name || '', ...(a && a[0] ? a[0] : { role: 'student' }) }
}

// Nur der Anzeigename ist selbst änderbar; die Rolle vergibt ein Admin.
export async function saveDisplayName(name) {
  check(await client.from('gj_profiles').update({ display_name: name }).eq('id', user.id))
}

export async function requestTeacher(on) {
  check(await client.rpc('gj_request_teacher', { p_on: !!on }))
}

// Vernetzung
export async function searchMembers(q) {
  return check(await client.rpc('gj_search_members', { p_q: q })) || []
}
export async function myNetwork() {
  return check(await client.rpc('gj_my_network')) || []
}
// Ergebnis: pending_out | connected | self | no_account
export async function connect(id) {
  return check(await client.rpc('gj_connect', { p_other: id }))
}
export async function disconnect(id) {
  check(await client.rpc('gj_disconnect', { p_other: id }))
}
// Ergebnis: ok | not_owner | not_allowed | not_contact | self
export async function shareWithUser(id, userId) {
  return check(await client.rpc('gj_share_with_user', { p_exercise: id, p_user: userId }))
}

export async function fetchExercises() {
  const rows = check(await client.from('gj_exercises').select('id,owner,title,data,updated_at').order('created_at'))
  const owners = [...new Set(rows.filter((r) => r.owner !== user.id).map((r) => r.owner))]
  const names = {}
  if (owners.length) {
    const profiles = check(await client.from('gj_profiles').select('id,display_name').in('id', owners))
    for (const p of profiles) names[p.id] = p.display_name
  }
  return { rows, names }
}

export async function saveExercise(row) {
  return check(await client.from('gj_exercises').upsert(row).select('updated_at').single())
}

export async function deleteExercise(id) {
  check(await client.from('gj_exercises').delete().eq('id', id))
}

// Returns ok | not_owner | no_account | self | not_allowed
export async function shareExercise(id, email) {
  return check(await client.rpc('gj_share_exercise', { p_exercise: id, p_email: email }))
}

export async function listShares(id) {
  return check(await client.rpc('gj_exercise_shares', { p_exercise: id }))
}

export async function unshare(id, userId) {
  check(await client.from('gj_shares').delete().eq('exercise_id', id).eq('shared_with', userId))
}

export async function leaveShared(id) {
  check(await client.from('gj_shares').delete().eq('exercise_id', id).eq('shared_with', user.id))
}
