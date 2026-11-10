// JempHub Admin: Benutzer, Rollen, Verbindungen, Freigaben, Einstellungen.
// Alle Rechte prüft die Datenbank (Funktionen gj_admin_*); diese Seite zeigt nur an.
// Braucht config.js neben dieser Datei (nur öffentlicher anon-Key, nicht im Git).

const SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/+esm'
const $ = (s) => document.querySelector(s)
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const ROLE = { admin: 'Admin', teacher: 'Lehrer', student: 'Schüler' }
const date = (d) => (d ? new Date(d).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '–')

let sb = null
let me = null
let tab = 'users'
let filter = 'all'
let q = ''
let data = { users: [], links: [], shares: [], settings: null }
const armed = new Map()

function toast(msg, bad) {
  const t = $('#toast')
  t.textContent = msg
  t.classList.toggle('bad', !!bad)
  t.hidden = false
  clearTimeout(toast.t)
  toast.t = setTimeout(() => (t.hidden = true), 3200)
}

async function rpc(fn, args) {
  const { data: d, error } = await sb.rpc(fn, args)
  if (error) throw new Error(/gj_not_admin/.test(error.message) ? 'Kein Admin-Zugang.' : error.message)
  return d
}

async function init() {
  let cfg
  try {
    cfg = (await import('./config.js')).default
  } catch {
    $('#main').innerHTML = '<section class="card narrow"><h1>Noch nicht eingerichtet</h1><p class="muted">Auf dem Server fehlt <code>admin/config.js</code>. Anleitung: <code>apps/guitar/supabase/EINRICHTUNG.md</code>.</p></section>'
    return
  }
  const { createClient } = await import(SUPABASE_JS)
  sb = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'jemphub-admin' } })
  sb.auth.onAuthStateChange((ev) => {
    if (ev === 'SIGNED_OUT') setTimeout(start, 0)
  })
  $('#signOut').addEventListener('click', () => sb.auth.signOut())
  start()
}

async function start() {
  const { data: s } = await sb.auth.getSession()
  me = s.session?.user || null
  $('#signOut').hidden = !me
  $('#who').textContent = me ? me.email : ''
  if (!me) return renderLogin()
  try {
    await loadAll()
    render()
  } catch (e) {
    $('#main').innerHTML = '<section class="card narrow"><h1>Kein Zugriff</h1><p class="muted">' + esc(e.message) + ' Dieses Konto ist kein Admin.</p></section>'
  }
}

function renderLogin(msg) {
  $('#main').innerHTML = `<section class="card narrow"><h1>Anmelden</h1>
    <form id="login" class="form"><label>E-Mail<input id="lEmail" type="email" required autocomplete="email"></label>
    <label>Passwort<input id="lPw" type="password" required autocomplete="current-password"></label>
    <button class="btn primary" type="submit">Anmelden</button>${msg ? '<p class="err">' + esc(msg) + '</p>' : ''}</form></section>`
  $('#login').addEventListener('submit', async (e) => {
    e.preventDefault()
    const email = $('#lEmail').value.trim()
    const { error } = await sb.auth.signInWithPassword({ email, password: $('#lPw').value })
    if (error) {
      renderLogin(error.message === 'Invalid login credentials' ? 'E-Mail oder Passwort falsch.' : error.message)
      $('#lEmail').value = email
      return
    }
    start()
  })
}

async function loadAll() {
  const [users, links, shares, settings] = await Promise.all([
    rpc('gj_admin_users'),
    rpc('gj_admin_connections'),
    rpc('gj_admin_shares'),
    rpc('gj_admin_settings'),
  ])
  data = { users: users || [], links: links || [], shares: shares || [], settings: (settings || [])[0] || null }
}

const nameOf = (u) => u.display_name || u.email
function render() {
  const req = data.users.filter((u) => u.teacher_requested).length
  const tabs = [['users', 'Benutzer', data.users.length], ['links', 'Verbindungen', data.links.length], ['shares', 'Freigaben', data.shares.length], ['settings', 'Einstellungen']]
  $('#main').innerHTML =
    '<nav class="tabs" role="tablist">' +
    tabs.map(([k, l, n]) => `<button role="tab" aria-selected="${tab === k}" data-tab="${k}">${l}${n != null ? '<span class="n">' + n + '</span>' : ''}${k === 'users' && req ? '<span class="n alert" title="Lehrer-Anträge">' + req + '</span>' : ''}</button>`).join('') +
    '</nav><section id="pane"></section>'
  ;({ users: renderUsers, links: renderLinks, shares: renderShares, settings: renderSettings })[tab]()
}

function renderUsers() {
  const rq = q.toLowerCase()
  let list = data.users.filter((u) => !rq || (u.email + ' ' + (u.display_name || '')).toLowerCase().includes(rq))
  if (filter === 'requests') list = list.filter((u) => u.teacher_requested)
  if (filter === 'teachers') list = list.filter((u) => u.role !== 'student')
  if (filter === 'banned') list = list.filter((u) => u.banned)
  const chips = [['all', 'Alle'], ['requests', 'Lehrer-Anträge'], ['teachers', 'Lehrer & Admins'], ['banned', 'Gesperrt']]
  $('#pane').innerHTML =
    `<div class="bar"><input id="q" type="search" placeholder="Name oder E-Mail suchen" value="${esc(q)}">
     <div class="chips">${chips.map(([k, l]) => `<button class="chip" aria-pressed="${filter === k}" data-filter="${k}">${l}</button>`).join('')}</div></div>
     <div class="list">${list.map(userRow).join('') || '<p class="muted pad">Keine Treffer.</p>'}</div>`
  const inp = $('#q')
  inp.addEventListener('input', () => {
    q = inp.value
    const pos = inp.selectionStart
    renderUsers()
    $('#q').focus()
    $('#q').setSelectionRange(pos, pos)
  })
}

function userRow(u) {
  const self = u.id === me.id
  const del = armed.get('del:' + u.id)
  return `<article class="row${u.banned ? ' banned' : ''}">
    <div class="who"><b>${esc(u.display_name || '–')}</b><span>${esc(u.email)}</span>
      <span class="meta">seit ${date(u.created_at)} · zuletzt ${date(u.last_sign_in_at)}</span></div>
    <div class="stats"><span title="Übungen"><b>${u.exercises}</b> Übungen</span><span title="Geteilte Übungen"><b>${u.shared_out}</b> geteilt</span><span title="Kontakte"><b>${u.contacts}</b> Kontakte</span></div>
    <div class="ctl">
      ${u.teacher_requested ? `<button class="btn ok" data-role="teacher" data-id="${u.id}">Lehrer bestätigen</button>` : ''}
      <select data-setrole="${u.id}" ${self ? 'disabled title="Die eigene Rolle kann man nicht ändern"' : ''} aria-label="Rolle">
        ${['student', 'teacher', 'admin'].map((r) => `<option value="${r}"${u.role === r ? ' selected' : ''}>${ROLE[r]}</option>`).join('')}
      </select>
      ${self ? '<span class="tag">Du</span>' : `<button class="btn ghost" data-ban="${u.id}" data-on="${u.banned ? 0 : 1}">${u.banned ? 'Entsperren' : 'Sperren'}</button>
      <button class="btn ${del ? 'danger' : 'ghost'}" data-del="${u.id}">${del ? 'Wirklich löschen?' : 'Löschen'}</button>`}
    </div></article>`
}

function renderLinks() {
  const opts = data.users.map((u) => `<option value="${u.id}">${esc(nameOf(u))} (${ROLE[u.role]})</option>`).join('')
  $('#pane').innerHTML =
    `<form class="bar linkform" id="linkForm"><select id="la" aria-label="Erste Person">${opts}</select><span class="muted">↔</span>
     <select id="lb" aria-label="Zweite Person">${opts}</select><button class="btn primary" type="submit">Verbinden</button></form>
     <div class="list">${data.links.map((l) => `<article class="row slim"><div class="who"><b>${esc(l.a_name || '–')}</b><span>${ROLE[l.a_role] || ''}</span></div>
       <div class="mid">${l.status === 'accepted' ? '↔' : '→ angefragt'}</div>
       <div class="who"><b>${esc(l.b_name || '–')}</b><span>${ROLE[l.b_role] || ''}</span></div>
       <div class="ctl"><span class="meta">${date(l.created_at)}</span><button class="btn ghost" data-unlink="${l.a}|${l.b}">Trennen</button></div></article>`).join('') || '<p class="muted pad">Noch keine Verbindungen.</p>'}</div>`
  if (data.users[1]) $('#lb').value = data.users[1].id
  $('#linkForm').addEventListener('submit', async (e) => {
    e.preventDefault()
    await act(() => rpc('gj_admin_link', { p_a: $('#la').value, p_b: $('#lb').value, p_on: true }), 'Verbunden')
  })
}

function renderShares() {
  $('#pane').innerHTML = `<div class="list">${data.shares.map((s) => `<article class="row slim"><div class="who"><b>${esc(s.title)}</b><span>von ${esc(s.owner_name || '–')}</span></div>
    <div class="mid">→</div><div class="who"><b>${esc(s.recipient_name || '–')}</b><span>${date(s.created_at)}</span></div>
    <div class="ctl"><button class="btn ghost" data-unshare="${s.exercise_id}|${s.shared_with}">Freigabe entfernen</button></div></article>`).join('') || '<p class="muted pad">Noch keine Freigaben.</p>'}</div>`
}

function renderSettings() {
  const s = data.settings || { student_max_exercises: 10, student_can_share: false }
  $('#pane').innerHTML = `<form class="card form" id="setForm"><h2>Schüler</h2>
    <label>Maximale Anzahl eigener Übungen<input id="sMax" type="number" min="0" max="10000" value="${s.student_max_exercises}"></label>
    <label class="check"><input id="sShare" type="checkbox"${s.student_can_share ? ' checked' : ''}> Schüler dürfen Übungen teilen</label>
    <p class="muted">Lehrer und Admins haben keine Grenze und dürfen immer teilen. 0 heißt: Schüler können nur geteilte Übungen üben.</p>
    <button class="btn primary" type="submit">Speichern</button></form>`
  $('#setForm').addEventListener('submit', async (e) => {
    e.preventDefault()
    await act(() => rpc('gj_admin_save_settings', { p_max: parseInt($('#sMax').value, 10) || 0, p_can_share: $('#sShare').checked }), 'Gespeichert')
  })
}

// Aktion ausführen, Daten neu laden, Meldung zeigen
async function act(fn, ok) {
  try {
    const r = await fn()
    if (typeof r === 'string' && r !== 'ok') {
      toast({ self: 'Beim eigenen Konto nicht möglich.', bad_role: 'Unbekannte Rolle.' }[r] || r, true)
    } else toast(ok)
  } catch (e) {
    toast(e.message, true)
  }
  await loadAll()
  render()
}

document.addEventListener('click', async (e) => {
  const b = e.target.closest('button')
  if (!b || !me) return
  if (b.dataset.tab) { tab = b.dataset.tab; return render() }
  if (b.dataset.filter) { filter = b.dataset.filter; return renderUsers() }
  if (b.dataset.role) return act(() => rpc('gj_admin_set_role', { p_user: b.dataset.id, p_role: b.dataset.role }), 'Rolle geändert')
  if (b.dataset.ban) return act(() => rpc('gj_admin_set_banned', { p_user: b.dataset.ban, p_banned: b.dataset.on === '1' }), b.dataset.on === '1' ? 'Gesperrt' : 'Entsperrt')
  if (b.dataset.del) {
    const k = 'del:' + b.dataset.del
    if (!armed.get(k)) {
      armed.set(k, true)
      renderUsers()
      setTimeout(() => { armed.delete(k); if (tab === 'users') renderUsers() }, 4000)
      return
    }
    armed.delete(k)
    return act(() => rpc('gj_admin_delete_user', { p_user: b.dataset.del }), 'Konto gelöscht')
  }
  if (b.dataset.unlink) { const [a, c] = b.dataset.unlink.split('|'); return act(() => rpc('gj_admin_link', { p_a: a, p_b: c, p_on: false }), 'Getrennt') }
  if (b.dataset.unshare) { const [x, u] = b.dataset.unshare.split('|'); return act(() => rpc('gj_admin_unshare', { p_exercise: x, p_user: u }), 'Freigabe entfernt') }
})
document.addEventListener('change', (e) => {
  const s = e.target.closest('[data-setrole]')
  if (s) act(() => rpc('gj_admin_set_role', { p_user: s.dataset.setrole, p_role: s.value }), 'Rolle geändert')
})

init()
