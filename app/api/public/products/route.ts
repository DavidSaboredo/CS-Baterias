import { prisma } from '@/lib/prisma'
import {
  handleOptions,
  jsonResponse,
  parsePagination,
  requireStockApiKey,
} from '@/lib/stock-api'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function OPTIONS(request: NextRequest) {
  return handleOptions(request)
}

export async function GET(request: NextRequest) {
  const unauthorizedResponse = requireStockApiKey(request)

  if (unauthorizedResponse) {
    return unauthorizedResponse
  }

  const { searchParams } = request.nextUrl
  const search = searchParams.get('search')?.trim() || ''
  const availableOnly = searchParams.get('available') === 'true'
  const { page, limit, skip } = parsePagination(searchParams)

  const where = {
    ...(availableOnly ? { stock: { gt: 0 } } : {}),
    ...(search
      ? {
          OR: [
            { brand: { contains: search, mode: 'insensitive' as const } },
            { model: { contains: search, mode: 'insensitive' as const } },
            { amperage: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  }

  try {
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: [
          { brand: 'asc' },
          { model: 'asc' },
        ],
        skip,
        take: limit,
        select: {
          id: true,
          brand: true,
          model: true,
          amperage: true,
          imageUrl: true,
          stock: true,
          minStock: true,
          price: true,
          updatedAt: true,
        },
      }),
      prisma.product.count({ where }),
    ])

    return jsonResponse(request, {
      data: products.map((product) => ({
        ...product,
        available: product.stock > 0,
        displayName: `${product.brand} ${product.model}`.trim(),
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        filters: {
          search,
          availableOnly,
        },
        generatedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Error fetching public products:', error)
    return jsonResponse(
      request,
      {
        error: 'Internal Server Error',
        message: 'Could not fetch products.',
      },
      { status: 500 },
    )
  }
}