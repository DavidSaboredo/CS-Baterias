import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function toWhatsAppPhone(rawPhone) {
  if (!rawPhone) return null

  const digitsOnly = String(rawPhone).replace(/\D/g, '')
  if (!digitsOnly) return null

  let local = digitsOnly

  if (local.startsWith('54')) {
    local = local.slice(2)
  }

  if (local.startsWith('0')) {
    local = local.slice(1)
  }

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

function normalizePhoneForStorage(rawPhone) {
  const trimmed = String(rawPhone || '').trim()
  if (!trimmed) return null

  const whatsappPhone = toWhatsAppPhone(trimmed)
  if (!whatsappPhone) return trimmed

  return `+${whatsappPhone}`
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run')

  const clients = await prisma.client.findMany({
    select: {
      id: true,
      name: true,
      phone: true,
    },
    orderBy: { id: 'asc' },
  })

  const updates = clients
    .map((client) => {
      const normalized = normalizePhoneForStorage(client.phone)
      if ((client.phone || null) === normalized) return null

      return {
        id: client.id,
        name: client.name,
        before: client.phone,
        after: normalized,
      }
    })
    .filter(Boolean)

  console.log(`Clientes totales: ${clients.length}`)
  console.log(`Cambios detectados: ${updates.length}`)

  if (updates.length === 0) {
    console.log('No hay nada para normalizar.')
    return
  }

  console.table(
    updates.map((item) => ({
      id: item.id,
      name: item.name,
      before: item.before,
      after: item.after,
    }))
  )

  if (isDryRun) {
    console.log('Modo simulacion: no se aplicaron cambios.')
    return
  }

  for (const item of updates) {
    await prisma.client.update({
      where: { id: item.id },
      data: { phone: item.after },
    })
  }

  console.log(`Normalizacion aplicada a ${updates.length} cliente(s).`)
}

main()
  .catch((error) => {
    console.error('Error normalizando telefonos:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
