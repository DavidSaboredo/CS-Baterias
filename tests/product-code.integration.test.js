import assert from 'node:assert/strict'
import { PrismaClient } from '@prisma/client'
import { createProductWithUniqueCode, findProductByCode } from '../lib/product-code.server.js'

const prisma = new PrismaClient()

async function main() {
  const createdIds = []
  const createdCodes = new Set()

  try {
    for (let i = 0; i < 200; i += 1) {
      const p = await createProductWithUniqueCode(prisma, {
        brand: 'TestBrandCode',
        model: `M${i}`,
        amperage: '100Ah',
        stock: 5,
        minStock: 1,
        price: 123.45,
      })
      createdIds.push(p.id)
      assert.equal(createdCodes.has(p.codigoAleatorio), false)
      createdCodes.add(p.codigoAleatorio)
    }

    assert.equal(createdCodes.size, createdIds.length)

    const anyId = createdIds[0]
    const anyProduct = await prisma.product.findUnique({
      where: { id: anyId },
      select: { id: true, codigoAleatorio: true },
    })
    assert.ok(anyProduct)
    const found = await findProductByCode(prisma, anyProduct.codigoAleatorio.toLowerCase())
    assert.ok(found)
    assert.equal(found.id, anyProduct.id)

    const invalid = await findProductByCode(prisma, 'AB')
    assert.equal(invalid, null)

    console.log('✅ product-code.integration.test.js passed')
  } finally {
    if (createdIds.length) {
      await prisma.product.deleteMany({ where: { id: { in: createdIds } } }).catch(() => {})
    }
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error('❌ product-code.integration.test.js failed:', e)
  process.exit(1)
})
