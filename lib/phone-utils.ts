export function normalizePhoneForStorage(rawPhone: string | null | undefined): string | null {
  const trimmed = (rawPhone || '').trim()
  if (!trimmed) return null

  const whatsappPhone = toWhatsAppPhone(trimmed)
  if (!whatsappPhone) return trimmed

  return `+${whatsappPhone}`
}

export function toWhatsAppPhone(rawPhone: string | null | undefined): string | null {
  if (!rawPhone) return null

  const digitsOnly = rawPhone.replace(/\D/g, '')
  if (!digitsOnly) return null

  let local = digitsOnly

  if (local.startsWith('54')) {
    local = local.slice(2)
  }

  if (local.startsWith('0')) {
    local = local.slice(1)
  }

  // Handle common Argentina mobile numbers with extra '15' prefix.
  const idx15 = local.indexOf('15')
  if (idx15 >= 2 && idx15 <= 4) {
    const candidate = local.slice(0, idx15) + local.slice(idx15 + 2)
    if (candidate.length >= 10 && candidate.length <= 11) {
      local = candidate
    }
  }

  if (local.length < 10) {
    return null
  }

  return `54${local}`
}

export function getWhatsAppLink(rawPhone: string | null | undefined, text?: string): string | null {
  const whatsappPhone = toWhatsAppPhone(rawPhone)
  if (!whatsappPhone) return null

  if (!text) {
    return `https://api.whatsapp.com/send?phone=${whatsappPhone}`
  }

  return `https://api.whatsapp.com/send?phone=${whatsappPhone}&text=${encodeURIComponent(text)}`
}