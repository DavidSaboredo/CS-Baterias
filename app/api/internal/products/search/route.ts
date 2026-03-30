import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Internal product search endpoint for authenticated app users.
 * Does NOT require API key, assumes session-based auth via middleware.
 * Used by product search component in NewSaleForm.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const search = searchParams.get('search')?.trim() || ''
    const availableOnly = searchParams.get('available') === 'true'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))
    const skip = (page - 1) * limit

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
        },
      }),
      prisma.product.count({ where }),
    ])

    return NextResponse.json({
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
        hasMore: skip + limit < total,
      },
    })
  } catch (error) {
    console.error('Error fetching products for search:', error)
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Could not fetch products.',
      },
      { status: 500 }
    )
  }
}
