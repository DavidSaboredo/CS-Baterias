import { prisma } from '@/lib/prisma'
import {
  handleOptions,
  jsonResponse,
  requireStockApiKey,
} from '@/lib/stock-api'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function OPTIONS(request: NextRequest) {
  return handleOptions(request)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorizedResponse = requireStockApiKey(request)

  if (unauthorizedResponse) {
    return unauthorizedResponse
  }

  const { id } = await params
  const productId = Number(id)

  if (!Number.isInteger(productId) || productId <= 0) {
    return jsonResponse(
      request,
      {
        error: 'Bad Request',
        message: 'Product id must be a positive integer.',
      },
      { status: 400 },
    )
  }

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        brand: true,
        model: true,
        amperage: true,
        imageUrl: true,
        stock: true,
        minStock: true,
        price: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!product) {
      return jsonResponse(
        request,
        {
          error: 'Not Found',
          message: 'Product not found.',
        },
        { status: 404 },
      )
    }

    return jsonResponse(request, {
      data: {
        ...product,
        available: product.stock > 0,
        displayName: `${product.brand} ${product.model}`.trim(),
      },
    })
  } catch (error) {
    console.error('Error fetching public product:', error)
    return jsonResponse(
      request,
      {
        error: 'Internal Server Error',
        message: 'Could not fetch product.',
      },
      { status: 500 },
    )
  }
}