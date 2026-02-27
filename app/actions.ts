'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export async function login(formData: FormData) {
  const username = formData.get('username') as string
  const password = formData.get('password') as string

  if (username === 'salvador' && password === 'santino230525') {
    (await cookies()).set('auth_session', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    })
    redirect('/')
  } else {
    redirect('/login?error=true')
  }
}

export async function logout() {
  (await cookies()).delete('auth_session')
  redirect('/login')
}

export async function addClient(formData: FormData) {
  const name = formData.get('name') as string
  const phone = formData.get('phone') as string
  const licensePlate = formData.get('licensePlate') as string

  if (!name) return

  try {
    await prisma.client.create({
      data: {
        name,
        phone: phone || null,
        licensePlate: licensePlate ? licensePlate.toUpperCase() : null,
      },
    })
    revalidatePath('/clients')
    revalidatePath('/sales/new')
  } catch (error) {
    console.error('Error creating client:', error)
  }
}

export async function updateClient(id: number, formData: FormData) {
  const name = formData.get('name') as string
  const phone = formData.get('phone') as string
  const licensePlate = formData.get('licensePlate') as string

  try {
    await prisma.client.update({
      where: { id },
      data: {
        name,
        phone: phone || null,
        licensePlate: licensePlate ? licensePlate.toUpperCase() : null,
      },
    })
    revalidatePath('/clients')
    revalidatePath('/sales/new')
  } catch (error) {
    console.error('Error updating client:', error)
  }
  redirect('/clients')
}

export async function deleteClient(id: number) {
  try {
    await prisma.client.delete({
      where: { id },
    })
    revalidatePath('/clients')
    revalidatePath('/sales/new')
  } catch (error) {
    console.error('Error deleting client:', error)
  }
}

export async function search(formData: FormData) {
  const q = formData.get('q')
  redirect(`/clients?q=${q}`)
}

export async function addSale(clientId: number, formData: FormData) {
  const productId = parseInt(formData.get('productId') as string)
  const serialNumber = formData.get('serialNumber') as string
  const price = parseFloat(formData.get('price') as string)
  const warrantyDuration = parseInt(formData.get('warrantyDuration') as string)

  if (!productId || !serialNumber || !price) return

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId }
    })

    let originalPrice = price
    let discount = 0

    if (product) {
      originalPrice = product.price
      if (price < originalPrice) {
        discount = originalPrice - price
        const percent = (discount / originalPrice) * 100
        if (percent > 20) {
          throw new Error('El descuento excede el límite permitido del 20%')
        }
      }
    }

    await prisma.$transaction([
      prisma.sale.create({
        data: {
          clientId,
          productId,
          serialNumber,
          price,
          originalPrice,
          discount,
          warrantyDuration: warrantyDuration || 12,
          status: 'active'
        },
      }),
      prisma.product.update({
        where: { id: productId },
        data: { stock: { decrement: 1 } },
      })
    ])
    revalidatePath(`/clients/${clientId}`)
    revalidatePath('/stock')
    revalidatePath('/sales')
    revalidatePath('/')
    revalidatePath('/sales/new')
  } catch (error) {
    console.error('Error creating sale:', error)
  }
}

export async function createSale(formData: FormData) {
  const clientId = parseInt(formData.get('clientId') as string)
  if (!clientId) return

  await addSale(clientId, formData)
  redirect('/sales')
}

export async function addProduct(formData: FormData) {
  const brand = formData.get('brand') as string
  const model = formData.get('model') as string
  const amperage = formData.get('amperage') as string
  const stock = parseInt(formData.get('stock') as string)
  const minStock = parseInt(formData.get('minStock') as string)
  const price = parseFloat(formData.get('price') as string)

  if (!brand || !model || !price) return

  try {
    await prisma.product.create({
      data: {
        brand,
        model,
        amperage,
        stock: stock || 0,
        minStock: minStock || 5,
        price,
      },
    })
    revalidatePath('/stock')
    revalidatePath('/sales/new')
    revalidatePath('/')
  } catch (error) {
    console.error('Error creating product:', error)
  }
}

export async function deleteProduct(id: number) {
  try {
    await prisma.product.delete({
      where: { id },
    })
    revalidatePath('/stock')
    revalidatePath('/sales/new')
    revalidatePath('/')
  } catch (error) {
    console.error('Error deleting product:', error)
  }
}

