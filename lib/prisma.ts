import { PrismaClient } from '@prisma/client'

// Vercel Postgres may expose POSTGRES_PRISMA_URL / POSTGRES_URL instead of DATABASE_URL.
// Prisma expects DATABASE_URL, so normalize it before creating the client.
const resolvedDatabaseUrl =
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL

if (resolvedDatabaseUrl && process.env.DATABASE_URL !== resolvedDatabaseUrl) {
  process.env.DATABASE_URL = resolvedDatabaseUrl
}

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
