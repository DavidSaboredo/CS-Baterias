import { PrismaClient } from '@prisma/client'

const env = process.env
if (env.NODE_ENV !== 'production' && env.BaseCSBaterias_DATABASE_URL) {
  env.DATABASE_URL = env.BaseCSBaterias_DATABASE_URL
}
if (!env.DATABASE_URL) {
  env.DATABASE_URL =
    env.BaseCSBaterias_DATABASE_URL ||
    env.BaseCSBaterias_PRISMA_DATABASE_URL ||
    env.PRISMA_DATABASE_URL ||
    env.POSTGRES_PRISMA_URL ||
    env.POSTGRES_URL ||
    env.POSTGRES_URL_NON_POOLING ||
    ''
}

if (!env.POSTGRES_URL_NON_POOLING) {
  env.POSTGRES_URL_NON_POOLING =
    env.BaseCSBaterias_POSTGRES_URL || env.BaseCSBaterias_DATABASE_URL || env.DATABASE_URL || ''
}

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
