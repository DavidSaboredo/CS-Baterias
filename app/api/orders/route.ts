import { prisma } from '@/lib/prisma'
import { handleOptions, jsonResponse, requireStockApiKey } from '@/lib/stock-api'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

const ORDER_METHODS = 'POST,OPTIONS'
const MAX_ITEM_QUANTITY = 100

type IncomingOrderItem = {
  productId: number
  quantity: number
}

type IncomingOrderPayload = {
  customer: {
    name: string
    phone: string
    zone?: string
    delivery?: string
    notes?: string
  }
  items: IncomingOrderItem[]
}

type ValidatedOrder = {
  customer: {
    name: string
    phone: string
    zone: string
    delivery: string
    notes: string
  }
  items: IncomingOrderItem[]
}

class HttpError extends Error {
  status: number
  code: string
  details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

function validateOrderPayload(payload: unknown): ValidatedOrder {
  if (!payload || typeof payload !== 'object') {
    throw new HttpError(400, 'INVALID_PAYLOAD', 'El cuerpo del pedido es invalido.')
  }

  const parsed = payload as IncomingOrderPayload
  const name = String(parsed.customer?.name || '').trim()
  const phone = String(parsed.customer?.phone || '').trim()
  const zone = String(parsed.customer?.zone || '').trim()
  const delivery = String(parsed.customer?.delivery || '').trim()
  const notes = String(parsed.customer?.notes || '').trim()

  if (!name || !phone) {
    throw new HttpError(
      400,
      'INVALID_CUSTOMER',
      'El cliente debe incluir nombre y telefono.',
    )
  }

  if (!Array.isArray(parsed.items) || parsed.items.length === 0) {
    throw new HttpError(400, 'EMPTY_ITEMS', 'El pedido debe incluir al menos un item.')
  }

  const items = parsed.items.map((item, index) => {
    const productId = Number(item?.productId)
    const quantity = Number(item?.quantity)

    if (!Number.isInteger(productId) || productId <= 0) {
      throw new HttpError(
        400,
        'INVALID_PRODUCT_ID',
        `El item ${index + 1} tiene un productId invalido.`,
      )
    }

    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > MAX_ITEM_QUANTITY) {
      throw new HttpError(
        400,
        'INVALID_QUANTITY',
        `El item ${index + 1} tiene una cantidad invalida.`,
      )
    }

    return {
      productId,
      quantity,
    }
  })

  const consolidatedByProduct = new Map<number, number>()

  for (const item of items) {
    consolidatedByProduct.set(
      item.productId,
      (consolidatedByProduct.get(item.productId) || 0) + item.quantity,
    )
  }

  return {
    customer: {
      name,
      phone,
      zone,
      delivery,
      notes,
    },
    items: Array.from(consolidatedByProduct.entries()).map(([productId, quantity]) => ({
      productId,
      quantity,
    })),
  }
}

export async function OPTIONS(request: NextRequest) {
  return handleOptions(request, ORDER_METHODS)
}

export async function POST(request: NextRequest) {
  const unauthorizedResponse = requireStockApiKey(request)

  if (unauthorizedResponse) {
    return unauthorizedResponse
  }

  try {
    const payload = validateOrderPayload(await request.json())
    const productIds = payload.items.map((item) => item.productId)

    const result = await prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        select: {
          id: true,
          brand: true,
          model: true,
          stock: true,
          minStock: true,
          price: true,
        },
      })

      const productById = new Map(products.map((product) => [product.id, product]))
      const missingProductIds = productIds.filter((id) => !productById.has(id))

      if (missingProductIds.length > 0) {
        throw new HttpError(404, 'PRODUCT_NOT_FOUND', 'Hay productos inexistentes en el pedido.', {
          missingProductIds,
        })
      }

      const insufficientItems = payload.items
        .map((item) => {
          const product = productById.get(item.productId)

          if (!product || product.stock >= item.quantity) {
            return null
          }

          return {
            productId: item.productId,
            requested: item.quantity,
            available: product.stock,
            displayName: `${product.brand} ${product.model}`.trim(),
          }
        })
        .filter(Boolean)

      if (insufficientItems.length > 0) {
        throw new HttpError(
          409,
          'INSUFFICIENT_STOCK',
          'No hay stock suficiente para uno o mas productos.',
          { items: insufficientItems },
        )
      }

      for (const item of payload.items) {
        const updated = await tx.product.updateMany({
          where: {
            id: item.productId,
            stock: { gte: item.quantity },
          },
          data: {
            stock: { decrement: item.quantity },
          },
        })

        if (updated.count === 0) {
          const currentProduct = await tx.product.findUnique({
            where: { id: item.productId },
            select: {
              id: true,
              brand: true,
              model: true,
              stock: true,
            },
          })

          throw new HttpError(
            409,
            'INSUFFICIENT_STOCK',
            'El stock cambio durante la confirmacion del pedido.',
            {
              items: [
                {
                  productId: item.productId,
                  requested: item.quantity,
                  available: currentProduct?.stock ?? 0,
                  displayName: currentProduct
                    ? `${currentProduct.brand} ${currentProduct.model}`.trim()
                    : `Producto ${item.productId}`,
                },
              ],
            },
          )
        }
      }

      const existingClient = await tx.client.findFirst({
        where: {
          name: { equals: payload.customer.name, mode: 'insensitive' },
          phone: payload.customer.phone,
        },
        select: { id: true },
      })

      const client =
        existingClient ||
        (await tx.client.create({
          data: {
            name: payload.customer.name,
            phone: payload.customer.phone,
            licensePlate: null,
          },
          select: { id: true },
        }))

      const salesData = payload.items.flatMap((item) => {
        const product = productById.get(item.productId)

        if (!product) {
          return []
        }

        return Array.from({ length: item.quantity }, (_, index) => ({
          clientId: client.id,
          productId: item.productId,
          serialNumber: `WEB-${Date.now()}-${item.productId}-${index + 1}`,
          price: product.price,
          originalPrice: product.price,
          discount: 0,
          warrantyDuration: 12,
          status: 'active',
        }))
      })

      if (salesData.length > 0) {
        await tx.sale.createMany({ data: salesData })
      }

      const refreshedProducts = await tx.product.findMany({
        where: { id: { in: productIds } },
        select: {
          id: true,
          brand: true,
          model: true,
          stock: true,
          minStock: true,
        },
      })

      const totalItems = payload.items.reduce((sum, item) => sum + item.quantity, 0)
      const orderId = `WEB-${Date.now()}`

      return {
        orderId,
        totalItems,
        products: refreshedProducts,
      }
    })

    return jsonResponse(
      request,
      {
        ok: true,
        data: {
          orderId: result.orderId,
          totalItems: result.totalItems,
          products: result.products.map((product) => ({
            id: product.id,
            displayName: `${product.brand} ${product.model}`.trim(),
            stock: product.stock,
            lowStock: product.stock <= product.minStock,
          })),
          generatedAt: new Date().toISOString(),
        },
      },
      { status: 201 },
      ORDER_METHODS,
    )
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(
        request,
        {
          ok: false,
          code: error.code,
          message: error.message,
          ...(error.details ? { details: error.details } : {}),
        },
        { status: error.status },
        ORDER_METHODS,
      )
    }

    console.error('Error creating order:', error)

    return jsonResponse(
      request,
      {
        ok: false,
        code: 'INTERNAL_ERROR',
        message: 'No se pudo registrar el pedido.',
      },
      { status: 500 },
      ORDER_METHODS,
    )
  }
}