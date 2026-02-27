import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Listando productos en la base de datos...')
  const products = await prisma.product.findMany({
    orderBy: { brand: 'asc' },
  })
  
  if (products.length === 0) {
    console.log('No se encontraron productos.')
  } else {
    console.log(`Se encontraron ${products.length} productos:`)
    products.forEach(p => {
      console.log(`- ID: ${p.id}, Marca: ${p.brand}, Modelo: ${p.model}, Stock: ${p.stock}, Precio: ${p.price}`)
    })
  }
}

main()
  .catch(e => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
