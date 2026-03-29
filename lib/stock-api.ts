import { NextRequest, NextResponse } from 'next/server'

const DEFAULT_MAX_LIMIT = 250
const DEFAULT_PAGE_SIZE = 100

function getAllowedOrigins() {
  const rawOrigins = process.env.STOCK_API_ALLOWED_ORIGINS

  if (!rawOrigins) {
    return ['*']
  }

  return rawOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

export function getCorsHeaders(
  request: NextRequest,
  allowedMethods: string = 'GET,OPTIONS',
) {
  const requestOrigin = request.headers.get('origin')
  const allowedOrigins = getAllowedOrigins()
  const allowAnyOrigin = allowedOrigins.includes('*')
  const allowedOrigin = allowAnyOrigin
    ? '*'
    : requestOrigin && allowedOrigins.includes(requestOrigin)
      ? requestOrigin
      : allowedOrigins[0] || '*'

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': allowedMethods,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
    'Access-Control-Max-Age': '86400',
    'Cache-Control': 'no-store',
    Vary: 'Origin',
  }
}

export function jsonResponse(
  request: NextRequest,
  body: unknown,
  init?: ResponseInit,
  allowedMethods: string = 'GET,OPTIONS',
) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...getCorsHeaders(request, allowedMethods),
      ...(init?.headers || {}),
    },
  })
}

export function handleOptions(
  request: NextRequest,
  allowedMethods: string = 'GET,OPTIONS',
) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request, allowedMethods),
  })
}

export function requireStockApiKey(request: NextRequest) {
  const configuredApiKey = process.env.STOCK_API_KEY

  if (!configuredApiKey) {
    return null
  }

  const authHeader = request.headers.get('authorization')
  const bearerToken = authHeader?.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : null
  const apiKey = request.headers.get('x-api-key') || bearerToken

  if (apiKey === configuredApiKey) {
    return null
  }

  return jsonResponse(
    request,
    {
      error: 'Unauthorized',
      message: 'Missing or invalid API key.',
    },
    { status: 401 },
  )
}

export function parsePagination(searchParams: URLSearchParams) {
  const rawPage = Number(searchParams.get('page') || '1')
  const rawLimit = Number(searchParams.get('limit') || String(DEFAULT_PAGE_SIZE))

  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1
  const limit = Number.isFinite(rawLimit) && rawLimit > 0
    ? Math.min(Math.floor(rawLimit), DEFAULT_MAX_LIMIT)
    : DEFAULT_PAGE_SIZE

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  }
}