// Hell/Dunkel-Schalter für alle Jemp-Apps. Als normales <script> im <head> laden
// (vor dem ersten Zeichnen, damit nichts aufblitzt).
// Die Wahl gilt für alle Apps: Cookie auf .jemphub.com (alle Subdomains), lokal localStorage.
// Ohne Wahl folgt die Seite der Geräteeinstellung.
;(function () {
  var KEY = 'jemp-theme'
  var root = document.documentElement
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : { matches: false }
  var BG = { light: '#f4efe4', dark: '#171c1a' }

  function read() {
    var m = document.cookie.match(/(?:^|;\s*)jemp-theme=(light|dark)/)
    if (m) return m[1]
    try { var v = localStorage.getItem(KEY); return v === 'light' || v === 'dark' ? v : null } catch (e) { return null }
  }
  function write(v) {
    var domain = /(^|\.)jemphub\.com$/.test(location.hostname) ? '; domain=.jemphub.com' : ''
    var secure = location.protocol === 'https:' ? '; Secure' : ''
    document.cookie = KEY + '=' + v + '; path=/; max-age=31536000; SameSite=Lax' + domain + secure
    try { localStorage.setItem(KEY, v) } catch (e) {}
  }
  function current() { return root.getAttribute('data-theme') || (mq.matches ? 'dark' : 'light') }
  function sync() {
    var t = current()
    var metas = document.querySelectorAll('meta[name="theme-color"]')
    for (var i = 0; i < metas.length; i++) if (root.hasAttribute('data-theme')) metas[i].setAttribute('content', BG[t])
    var btns = document.querySelectorAll('[data-theme-toggle]')
    for (var j = 0; j < btns.length; j++) btns[j].setAttribute('aria-pressed', t === 'dark' ? 'true' : 'false')
  }
  function apply(v) {
    if (v === 'light' || v === 'dark') root.setAttribute('data-theme', v)
    sync()
  }

  apply(read())
  document.addEventListener('DOMContentLoaded', sync)
  if (mq.addEventListener) mq.addEventListener('change', sync)
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-theme-toggle]')
    if (!b) return
    var next = current() === 'dark' ? 'light' : 'dark'
    apply(next)
    write(next)
  })
  window.jempTheme = { current: current }
})()
