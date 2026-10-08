import { computed } from 'vue'

export function useShareActions({ auth, shareContacts }) {
  const currentUserDisplayName = computed(
    () =>
      String(
        auth.profile?.display_name ||
        auth.user?.user_metadata?.display_name ||
        auth.user?.email ||
        'User',
      ),
  )

  const currentUserAvatarUrl = computed(() => {
    const direct = String(auth.user?.user_metadata?.avatar_url || '').trim()
    if (direct) return direct
    const name = encodeURIComponent(currentUserDisplayName.value)
    return `https://ui-avatars.com/api/?name=${name}&background=1f2937&color=ffffff&size=64&bold=true`
  })

  const shareContactsForMenu = computed(() =>
    (shareContacts.contacts || []).map((c) => {
      const name = String(c?.name || '').trim()
      const email = String(c?.email || '').trim()
      const whatsapp = String(c?.whatsapp || '').trim()
      return {
        id: String(c?.id || `${name}-${email}-${whatsapp}`),
        name: name || 'Unbenannter Kontakt',
        email,
        whatsapp,
        hasEmail: Boolean(email),
        hasWhatsApp: Boolean(whatsapp),
      }
    }),
  )

  function getShareUrl() {
    const fallback = 'https://saitenreisser1000.github.io/GuitarJemp/'
    if (typeof window === 'undefined') return fallback
    const href = String(window.location.href || '').trim()
    const host = String(window.location.hostname || '').toLowerCase()
    if (!href) return fallback
    if (host === 'localhost' || host === '127.0.0.1') return fallback
    return href
  }

  function normalizeWhatsappNumber(raw) {
    const source = String(raw || '').trim()
    if (!source) return ''
    const normalized = source.replace(/[\s\-().]/g, '')
    let digits = normalized

    if (digits.startsWith('+')) digits = digits.slice(1)
    else if (digits.startsWith('00')) digits = digits.slice(2)

    digits = digits.replace(/[^\d]/g, '')
    if (!digits) return ''
    if (digits.startsWith('0')) return ''
    if (digits.length < 7) return ''
    return digits
  }

  function buildShareMessage(name) {
    const safeName = String(name || 'there').trim() || 'there'
    return `Hi ${safeName}, check this GuitarJemp page: ${getShareUrl()}`
  }

  function shareByMail(contact) {
    const email = String(contact?.email || '').trim()
    if (!email) return false
    const subject = encodeURIComponent('GuitarJemp')
    const body = encodeURIComponent(buildShareMessage(contact?.name))
    window.location.href = `mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}`
    return true
  }

  function shareByWhatsApp(contact) {
    const number = normalizeWhatsappNumber(contact?.whatsapp)
    if (!number) return false
    const text = encodeURIComponent(buildShareMessage(contact?.name))
    window.open(`https://wa.me/${number}?text=${text}`, '_blank', 'noopener,noreferrer')
    return true
  }

  function shareContact(contact, mode) {
    const nextMode = String(mode || 'email')
    if (nextMode === 'both') {
      const emailOk = shareByMail(contact)
      const whatsappOk = shareByWhatsApp(contact)
      return emailOk || whatsappOk
    }
    if (nextMode === 'whatsapp') return shareByWhatsApp(contact)
    return shareByMail(contact)
  }

  return {
    currentUserDisplayName,
    currentUserAvatarUrl,
    shareContactsForMenu,
    shareContact,
  }
}
