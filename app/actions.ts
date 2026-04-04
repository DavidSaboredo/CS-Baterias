'use server'

import { prisma } from '@/lib/prisma'
import { normalizePhoneForStorage } from '@/lib/phone-utils'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export async function login(formData: FormData) {
  const username = (formData.get('username') as string || '').trim().toLowerCase()
  const password = (formData.get('password') as string || '').trim()

  const validUsername = (process.env.AUTH_USERNAME || 'salvador').trim().toLowerCase()
  const validPassword = (process.env.AUTH_PASSWORD || 'santino230525').trim()

  if (username === validUsername && password === validPassword) {
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
  const name = (formData.get('name') as string || '').trim()
  const phone = normalizePhoneForStorage(formData.get('phone') as string)
  const licensePlate = (formData.get('licensePlate') as string || '').trim()

  if (!name) return { success: false, error: 'Nombre es requerido' }

  try {
    await prisma.client.create({
      data: {
        name,
        phone,
        licensePlate: licensePlate ? licensePlate.toUpperCase() : null,
      },
    })
    revalidatePath('/clients')
    revalidatePath('/sales/new')
    return { success: true }
  } catch (error: any) {
    console.error('Error creating client:', error)
    if (error.code === 'P2002') {
      return { success: false, error: 'Ya existe un cliente con esa patente' }
    }
    return { success: false, error: 'Error al guardar el cliente' }
  }
}

export async function updateClient(id: number, formData: FormData) {
  const name = (formData.get('name') as string || '').trim()
  const phone = normalizePhoneForStorage(formData.get('phone') as string)
  const licensePlate = (formData.get('licensePlate') as string || '').trim()

  try {
    await prisma.client.update({
      where: { id },
      data: {
        name,
        phone,
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

    const [sale, updatedProduct] = await prisma.$transaction([
      prisma.sale.create({
        data: {
          clientId,
          productId,
          serialNumber,
          price,
          originalPrice,
          discount,
          warrantyDuration: Number.isNaN(warrantyDuration) ? 12 : warrantyDuration,
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
    
    return { 
      success: true, 
      lowStock: updatedProduct.stock <= updatedProduct.minStock,
      stock: updatedProduct.stock
    }
  } catch (error: any) {
    console.error('Error creating sale:', error)
    return { success: false, error: error.message }
  }
}

export async function createSale(formData: FormData) {
  const clientId = parseInt(formData.get('clientId') as string)
  if (!clientId) return

  await addSale(clientId, formData)
  redirect('/sales')
}

export async function addProduct(formData: FormData) {
  const brand = (formData.get('brand') as string || '').trim()
  const model = (formData.get('model') as string || '').trim()
  const amperage = (formData.get('amperage') as string || '').trim()
  const imageUrl = (formData.get('imageUrl') as string || '').trim()
  const stockToAdd = parseInt(formData.get('stock') as string) || 0
  const minStock = parseInt(formData.get('minStock') as string) || 5
  const price = parseFloat(formData.get('price') as string) || 0

  if (!brand || !model || price <= 0) return { success: false, error: 'Datos incompletos' }

  try {
    // Buscar si ya existe un producto con la misma marca, modelo y amperaje
    const existingProduct = await prisma.product.findFirst({
      where: {
        brand: { equals: brand, mode: 'insensitive' },
        model: { equals: model, mode: 'insensitive' },
        amperage: { equals: amperage, mode: 'insensitive' },
      }
    })

    if (existingProduct) {
      // SI EXISTE: Actualizar stock sumando el nuevo y actualizar el precio
      await prisma.product.update({
        where: { id: existingProduct.id },
        data: {
          stock: { increment: stockToAdd },
          price: price, // Actualizamos al precio más reciente
          minStock: minStock,
          ...(imageUrl ? { imageUrl } : {}),
        }
      })
    } else {
      // NO EXISTE: Crear nuevo
      await prisma.product.create({
        data: {
          brand,
          model,
          amperage,
          imageUrl: imageUrl || null,
          stock: stockToAdd,
          minStock: minStock,
          price,
        },
      })
    }
    
    revalidatePath('/stock')
    revalidatePath('/sales/new')
    revalidatePath('/')
    return { success: true }
  } catch (error) {
    console.error('Error in addProduct (Smart Sum):', error)
    return { success: false, error: 'Error al procesar producto' }
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

export async function deleteSale(saleId: number, password?: string) {
  // Verificación de contraseña de administrador
  if (password !== 'santino230525') {
    return { success: false, error: 'Contraseña de administrador incorrecta' }
  }

  try {
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: { product: true }
    })

    if (!sale) {
      return { success: false, error: 'La venta no existe' }
    }

    // Usar transacción para borrar la venta y DEVOLVER el stock al producto
    await prisma.$transaction([
      prisma.sale.delete({
        where: { id: saleId }
      }),
      prisma.product.update({
        where: { id: sale.productId },
        data: { stock: { increment: 1 } }
      })
    ])

    revalidatePath('/sales')
    revalidatePath('/stock')
    revalidatePath('/')
    
    return { success: true }
  } catch (error: any) {
    console.error('Error al borrar la venta:', error)
    return { success: false, error: 'Error interno del servidor' }
  }
}

export async function updateProductStock(
  productId: number,
  newStock: number,
  newPrice: number,
  password?: string,
  newImageUrl?: string | null,
  removeImage?: boolean,
) {
  // Verificación de contraseña de administrador
  if (password !== 'santino230525') {
    return { success: false, error: 'Contraseña de administrador incorrecta' }
  }

  try {
    const normalizedImageUrl = (newImageUrl || '').trim()

    await prisma.product.update({
      where: { id: productId },
      data: { 
        stock: newStock,
        price: newPrice,
        ...(removeImage
          ? { imageUrl: null }
          : normalizedImageUrl
            ? { imageUrl: normalizedImageUrl }
            : {}),
      }
    })

    revalidatePath('/stock')
    revalidatePath('/sales/new')
    revalidatePath('/')
    
    return { success: true }
  } catch (error: any) {
    console.error('Error al actualizar producto:', error)
    return { success: false, error: 'Error interno del servidor' }
  }
}

export async function updateAllProductPricesByPercentage(percentage: number, password?: string) {
  if (password !== 'santino230525') {
    return { success: false, error: 'Contraseña de administrador incorrecta' }
  }

  if (!Number.isFinite(percentage) || percentage === 0) {
    return { success: false, error: 'Ingresá un porcentaje válido distinto de 0' }
  }

  const multiplier = 1 + percentage / 100

  if (multiplier <= 0) {
    return { success: false, error: 'La baja no puede dejar precios en 0 o negativo' }
  }

  try {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        price: true,
      },
    })

    if (products.length === 0) {
      return { success: false, error: 'No hay productos para actualizar' }
    }

    await prisma.$transaction(
      products.map((product) =>
        prisma.product.update({
          where: { id: product.id },
          data: {
            price: Number((product.price * multiplier).toFixed(2)),
          },
        }),
      ),
    )

    revalidatePath('/stock')
    revalidatePath('/sales/new')
    revalidatePath('/')

    return {
      success: true,
      updatedCount: products.length,
      percentage,
    }
  } catch (error: any) {
    console.error('Error al actualizar precios globalmente:', error)
    return { success: false, error: 'Error interno del servidor' }
  }
}

