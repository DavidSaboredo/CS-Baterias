import { PrismaClient } from '@prisma/client'
import fs from 'node:fs/promises'
import path from 'node:path'
import { PRODUCT_CODE_REGEX, normalizeProductCode } from '../lib/product-code.js'
import { generateRandomProductCode } from '../lib/product-code.server.js'

const prisma = new PrismaClient()

function parseArgs() {
  const args = process.argv.slice(2)
  const out = { dir: '', wipe: false, batch: 1000 }
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i]
    if (a === '--dir') out.dir = args[i + 1] || ''
    if (a === '--wipe') out.wipe = true
    if (a === '--batch') out.batch = Number(args[i + 1] || '') || 1000
  }
  return out
}

async function readJson(filePath) {
  const txt = await fs.readFile(filePath, 'utf8')
  return JSON.parse(txt)
}

function toDate(v) {
  if (v == null) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function normalizeLicensePlate(value) {
  const v = (value || '').toString().trim().toUpperCase()
  return v ? v : null
}

function makeUniqueClients(rawClients) {
  const usedPlates = new Set()
  const sorted = [...rawClients].sort((a, b) => (a.id || 0) - (b.id || 0))
  return sorted.map((c) => {
    const plate = normalizeLicensePlate(c.licensePlate)
    if (plate && usedPlates.has(plate)) {
      return { ...c, licensePlate: null }
    }
    if (plate) usedPlates.add(plate)
    return { ...c, licensePlate: plate }
  })
}

function makeUniqueProducts(rawProducts) {
  const usedCodes = new Set()
  const sorted = [...rawProducts].sort((a, b) => (a.id || 0) - (b.id || 0))
  return sorted.map((p) => {
    let code = normalizeProductCode(p.codigoAleatorio)
    if (!PRODUCT_CODE_REGEX.test(code) || usedCodes.has(code)) {
      let tries = 0
      do {
        code = generateRandomProductCode()
        tries += 1
      } while (usedCodes.has(code) && tries < 1000)
    }
    usedCodes.add(code)
    return { ...p, codigoAleatorio: code }
  })
}

async function setSeq(table, column) {
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"${table}"','${column}'), COALESCE((SELECT MAX("${column}") FROM "${table}"), 1), true);`,
  )
}

async function main() {
  const { dir, wipe, batch } = parseArgs()
  if (!dir) {
    console.error(
      'Uso: node scripts/restore-db-json.js --dir backup/backup-YYYY... [--wipe] [--batch 1000]',
    )
    process.exit(1)
  }

  const base = path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir)
  const rawClients = await readJson(path.join(base, 'clients.json'))
  const rawProducts = await readJson(path.join(base, 'products.json'))
  const rawAppointments = await readJson(path.join(base, 'appointments.json'))
  const rawSales = await readJson(path.join(base, 'sales.json'))

  const clients = makeUniqueClients(rawClients)
  const products = makeUniqueProducts(rawProducts)
  const appointments = rawAppointments
  const sales = rawSales

  if (wipe) {
    await prisma.sale.deleteMany({})
    await prisma.appointment.deleteMany({})
    await prisma.product.deleteMany({})
    await prisma.client.deleteMany({})
  }

  for (const part of chunk(clients, batch)) {
    await prisma.client.createMany({
      data: part.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        licensePlate: c.licensePlate,
        createdAt: toDate(c.createdAt) || undefined,
        updatedAt: toDate(c.updatedAt) || undefined,
      })),
      skipDuplicates: true,
    })
  }

  for (const part of chunk(products, batch)) {
    await prisma.product.createMany({
      data: part.map((p) => ({
        id: p.id,
        brand: p.brand,
        model: p.model,
        amperage: p.amperage,
        codigoAleatorio: p.codigoAleatorio,
        stock: p.stock,
        minStock: p.minStock,
        price: p.price,
        createdAt: toDate(p.createdAt) || undefined,
        updatedAt: toDate(p.updatedAt) || undefined,
      })),
      skipDuplicates: true,
    })
  }

  for (const part of chunk(appointments, batch)) {
    await prisma.appointment.createMany({
      data: part.map((a) => ({
        id: a.id,
        startTime: toDate(a.startTime),
        endTime: toDate(a.endTime),
        clientId: a.clientId,
        reason: a.reason,
        description: a.description,
        createdAt: toDate(a.createdAt) || undefined,
        updatedAt: toDate(a.updatedAt) || undefined,
      })),
      skipDuplicates: true,
    })
  }

  for (const part of chunk(sales, batch)) {
    await prisma.sale.createMany({
      data: part.map((s) => ({
        id: s.id,
        date: toDate(s.date) || undefined,
        clientId: s.clientId,
        productId: s.productId,
        serialNumber: s.serialNumber,
        price: s.price,
        originalPrice: s.originalPrice,
        discount: s.discount,
        warrantyDuration: s.warrantyDuration,
        status: s.status || 'active',
      })),
      skipDuplicates: true,
    })
  }

  await setSeq('Client', 'id')
  await setSeq('Product', 'id')
  await setSeq('Appointment', 'id')
  await setSeq('Sale', 'id')

  console.log('Restore OK')
}

main()
  .catch((e) => {
    console.error('Restore failed:', e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {})
  })
