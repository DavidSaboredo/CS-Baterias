import { PrismaClient } from '@prisma/client'
import fs from 'node:fs/promises'
import path from 'node:path'

const prisma = new PrismaClient()

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true })
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8')
}

async function fetchAllById(model, select) {
  const out = []
  let cursor = null
  while (true) {
    const chunk = await model.findMany({
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: 2000,
      orderBy: { id: 'asc' },
      ...(select ? { select } : {}),
    })
    out.push(...chunk)
    if (chunk.length < 2000) break
    cursor = chunk[chunk.length - 1].id
  }
  return out
}

async function main() {
  const outDir = path.join(process.cwd(), 'backup', `backup-${nowStamp()}`)
  await ensureDir(outDir)

  const clients = await fetchAllById(prisma.client, null)
  const products = await fetchAllById(prisma.product, null)
  const appointments = await fetchAllById(prisma.appointment, null)
  const sales = await fetchAllById(prisma.sale, null)

  await writeJson(path.join(outDir, 'clients.json'), clients)
  await writeJson(path.join(outDir, 'products.json'), products)
  await writeJson(path.join(outDir, 'appointments.json'), appointments)
  await writeJson(path.join(outDir, 'sales.json'), sales)

  await writeJson(path.join(outDir, 'meta.json'), {
    exportedAt: new Date().toISOString(),
    counts: {
      clients: clients.length,
      products: products.length,
      appointments: appointments.length,
      sales: sales.length,
    },
  })

  console.log(`Backup OK: ${outDir}`)
}

main()
  .catch((e) => {
    console.error('Backup failed:', e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {})
  })

