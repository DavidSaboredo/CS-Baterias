import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Internal client search endpoint for authenticated app users.
 * Does NOT require API key, assumes session-based auth via middleware.
 * Used by client search components in internal app flows.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const search = searchParams.get('search')?.trim() || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const skip = (page - 1) * limit

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { licensePlate: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        orderBy: [{ name: 'asc' }, { licensePlate: 'asc' }],
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          phone: true,
          licensePlate: true,
        },
      }),
      prisma.client.count({ where }),
    ])

    return NextResponse.json({
      data: clients.map((client) => ({
        ...client,
        displayName: client.licensePlate
          ? `${client.name} (${client.licensePlate})`
          : client.name,
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
    console.error('Error fetching clients for search:', error)
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Could not fetch clients.',
      },
      { status: 500 }
    )
  }
}