import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

let testCodeCounter = 0
function nextTestCode() {
  testCodeCounter += 1
  return testCodeCounter.toString(36).toUpperCase().padStart(3, '0').slice(-3)
}

async function main() {
  console.log('Starting discount test...')
  
  let client
  let product

  try {
    // Setup
    client = await prisma.client.create({
      data: { name: 'Test Client Discount', phone: '123456789' }
    })
    
    const originalPrice = 1000
    product = await prisma.product.create({
      data: {
        brand: 'TestBrand', model: 'TestModel', amperage: '100Ah',
        codigoAleatorio: nextTestCode(),
        stock: 10, minStock: 2, price: originalPrice
      }
    })

    // Test Case 1: Valid Discount (20%)
    console.log('Test 1: Valid Discount (20%)')
    const validPrice = 800
    await simulateSale(client.id, product.id, validPrice, originalPrice, false)
    console.log('✅ Valid discount passed')

    // Test Case 2: Excessive Discount (30%)
    console.log('Test 2: Excessive Discount (30%)')
    const invalidPrice = 700
    try {
        await simulateSale(client.id, product.id, invalidPrice, originalPrice, true)
        throw new Error('❌ Should have failed but succeeded')
    } catch (e) {
        if (e.message.includes('excede el límite')) {
            console.log('✅ Excessive discount correctly rejected')
        } else {
            throw e
        }
    }

  } catch (error) {
    console.error('Test failed:', error)
    process.exit(1)
  } finally {
    // Cleanup
    if (product) await prisma.product.delete({ where: { id: product.id } }).catch(() => {})
    if (client) await prisma.client.delete({ where: { id: client.id } }).catch(() => {})
    await prisma.$disconnect()
  }
}

async function simulateSale(clientId, productId, price, originalPrice, expectFail) {
    // Logic mirroring server action
    let discount = 0
    if (price < originalPrice) {
        discount = originalPrice - price
        const percent = (discount / originalPrice) * 100
        if (percent > 20) {
            throw new Error('El descuento excede el límite permitido del 20%')
        }
    }

    if (expectFail) return // Don't actually create if we expect failure in logic above

    const sale = await prisma.sale.create({
        data: {
            clientId, productId, serialNumber: 'TEST',
            price, originalPrice, discount,
            warrantyDuration: 12, status: 'active'
        }
    })
    
    // Verify
    const saved = await prisma.sale.findUnique({ where: { id: sale.id } })
    if (saved.discount !== discount) throw new Error('Discount mismatch')
    
    await prisma.sale.delete({ where: { id: sale.id } })
}

main()
