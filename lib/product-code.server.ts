import type { PrismaClient } from '@prisma/client'
import * as impl from './product-code.server.js'

export const generateRandomProductCode: () => string = impl.generateRandomProductCode as any
export const generateUniqueProductCode = impl.generateUniqueProductCode as (
  prisma: PrismaClient,
) => Promise<string>
export const createProductWithUniqueCode = impl.createProductWithUniqueCode as (
  prisma: PrismaClient,
  data: any,
) => Promise<any>
export const findProductByCode = impl.findProductByCode as (
  prisma: PrismaClient,
  inputCode: string,
) => Promise<any>
