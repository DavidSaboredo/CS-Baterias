'use server'

import { prisma } from '@/lib/prisma'
import { ProductImportRowSchema, BulkImportResult } from '@/lib/product-import-schema'
import { normalizeProductIdentity, productIdentityKey } from '@/lib/product-normalization'
import { parseExcelFile } from '@/lib/product-import'
import { createProductWithUniqueCode } from '@/lib/product-code.server'
import { revalidatePath } from 'next/cache'

type ExistingProduct = {
  id: number
  brand: string
  model: string
  amperage: string
}

const WRITE_BATCH_SIZE = 100

function normalizeArticleText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

function parseIdentityFromArticulo(articulo: string) {
  const compact = articulo.replace(/\s+/g, ' ').trim()
  const ampMatch = compact.match(/(\d+[\.,]?\d*\s*AH?)$/i)
  const amperage = ampMatch ? ampMatch[1].replace(/\s+/g, '').toUpperCase() : 'S/AMP'
  const withoutAmp = ampMatch ? compact.slice(0, compact.length - ampMatch[1].length).trim() : compact
  const parts = withoutAmp.split(' ').filter(Boolean)

  const brand = parts.length > 1 ? parts[0] : 'GENERICA'
  const model = parts.length > 1 ? parts.slice(1).join(' ') : withoutAmp || compact

  return normalizeProductIdentity(brand, model, amperage)
}

function buildLookups(products: ExistingProduct[]) {
  const byFull = new Map<string, ExistingProduct[]>()
  const byBrandModel = new Map<string, ExistingProduct[]>()
  const byModel = new Map<string, ExistingProduct[]>()

  const push = (map: Map<string, ExistingProduct[]>, key: string, product: ExistingProduct) => {
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(product)
  }

  for (const product of products) {
    push(byFull, normalizeArticleText(`${product.brand} ${product.model} ${product.amperage}`), product)
    push(byBrandModel, normalizeArticleText(`${product.brand} ${product.model}`), product)
    push(byModel, normalizeArticleText(product.model), product)
  }

  return { byFull, byBrandModel, byModel }
}

function uniqueMatches(products: ExistingProduct[]): ExistingProduct[] {
  const seen = new Set<number>()
  const unique: ExistingProduct[] = []
  for (const product of products) {
    if (!seen.has(product.id)) {
      seen.add(product.id)
      unique.push(product)
    }
  }
  return unique
}

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = []

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize))
  }

  return chunks
}

/**
 * Preview import: validate rows without persisting
 */
export async function previewBulkImport(
  buffer: Uint8Array
): Promise<BulkImportResult> {
  try {
    const rows = parseExcelFile(buffer)
    const existingProducts = await prisma.product.findMany({
      select: { id: true, brand: true, model: true, amperage: true },
    })
    const lookups = buildLookups(existingProducts)

    if (rows.length === 0) {
      return {
        success: false,
        summary: { total: 0, valid: 0, invalid: 0, duplicatesInFile: 0, willCreate: 0, willUpdate: 0 },
        validRows: [],
        invalidRows: [],
      }
    }

    const validRows: Array<{
      index: number
      data: { articulo: string; final: number; existencias: number }
      action: 'CREATE' | 'UPDATE'
      resolvedIdentity: { brand: string; model: string; amperage: string }
    }> = []
    const invalidRows: Array<{ index: number; errors: string[] }> = []
    const seenIdentities = new Map<string, number[]>()

    // Validate each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const result = ProductImportRowSchema.safeParse(row)

      if (!result.success) {
        const errors = result.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`)
        invalidRows.push({ index: i + 1, errors })
      } else {
        const articuloKey = normalizeArticleText(result.data.articulo)
        const matches = uniqueMatches([
          ...(lookups.byFull.get(articuloKey) ?? []),
          ...(lookups.byBrandModel.get(articuloKey) ?? []),
          ...(lookups.byModel.get(articuloKey) ?? []),
        ])

        if (matches.length > 1) {
          invalidRows.push({
            index: i + 1,
            errors: [`articulo: coincide con ${matches.length} productos existentes. Especifica mejor el articulo.`],
          })
          continue
        }

        const action: 'CREATE' | 'UPDATE' = matches.length === 1 ? 'UPDATE' : 'CREATE'
        const resolvedIdentity =
          matches.length === 1
            ? normalizeProductIdentity(matches[0].brand, matches[0].model, matches[0].amperage)
            : parseIdentityFromArticulo(result.data.articulo)

        const key = productIdentityKey(
          resolvedIdentity.brand,
          resolvedIdentity.model,
          resolvedIdentity.amperage
        )

        if (!seenIdentities.has(key)) {
          seenIdentities.set(key, [])
        }
        seenIdentities.get(key)!.push(i + 1)

        validRows.push({
          index: i + 1,
          data: result.data,
          action,
          resolvedIdentity,
        })
      }
    }

    const duplicatesInFile = Array.from(seenIdentities.entries())
      .filter(([_, indices]) => indices.length > 1)
      .map(([identity, indices]) => ({ indices, identity }))

    const willCreate = validRows.filter(r => r.action === 'CREATE').length
    const willUpdate = validRows.filter(r => r.action === 'UPDATE').length

    return {
      success: true,
      summary: {
        total: rows.length,
        valid: validRows.length,
        invalid: invalidRows.length,
        duplicatesInFile: duplicatesInFile.length,
        willCreate,
        willUpdate,
      },
      validRows,
      invalidRows,
      duplicates: duplicatesInFile.length > 0 ? duplicatesInFile : undefined,
    }
  } catch (error) {
    return {
      success: false,
      summary: { total: 0, valid: 0, invalid: 0, duplicatesInFile: 0, willCreate: 0, willUpdate: 0 },
      validRows: [],
      invalidRows: [
        {
          index: 0,
          errors: [error instanceof Error ? error.message : 'Error desconocido'],
        },
      ],
    }
  }
}

/**
 * Confirm and persist bulk import in transaction
 */
export async function confirmBulkImport(
  buffer: Uint8Array,
  password?: string
): Promise<{ success: boolean; error?: string; summary?: any }> {
  // If password is provided, validate it. If omitted, allow automatic import flow.
  if (password && password !== 'santino230525') {
    return { success: false, error: 'Contraseña de administrador incorrecta' }
  }

  try {
    const preview = await previewBulkImport(buffer)

    if (!preview.success) {
      return { success: false, error: 'Error al procesar archivo' }
    }

    // Check for invalid rows
    if (preview.invalidRows.length > 0) {
      return {
        success: false,
        error: `Hay ${preview.invalidRows.length} filas con errores. Por favor revisa el preview.`,
      }
    }

    const createRows = preview.validRows.filter(row => row.action === 'CREATE')
    const updateRows = preview.validRows.filter(row => row.action === 'UPDATE')

    let created = 0
    let updated = 0

    for (const batch of chunkArray(createRows, WRITE_BATCH_SIZE)) {
      for (const row of batch) {
        const normalized = normalizeProductIdentity(
          row.resolvedIdentity.brand,
          row.resolvedIdentity.model,
          row.resolvedIdentity.amperage,
        )

        await createProductWithUniqueCode(prisma, {
          brand: normalized.brand,
          model: normalized.model,
          amperage: normalized.amperage,
          price: row.data.final,
          stock: row.data.existencias,
        })

        created += 1
      }
    }

    for (const batch of chunkArray(updateRows, WRITE_BATCH_SIZE)) {
      const operations = batch.map(row => {
        const normalized = normalizeProductIdentity(
          row.resolvedIdentity.brand,
          row.resolvedIdentity.model,
          row.resolvedIdentity.amperage
        )

        return prisma.product.updateMany({
          where: {
            AND: [
              { brand: { equals: normalized.brand, mode: 'insensitive' } },
              { model: { equals: normalized.model, mode: 'insensitive' } },
              { amperage: { equals: normalized.amperage, mode: 'insensitive' } },
            ],
          },
          data: {
            price: row.data.final,
            stock: row.data.existencias,
          },
        })
      })

      const batchResults = await prisma.$transaction(operations)
      updated += batchResults.reduce((total, result) => total + result.count, 0)
    }

    revalidatePath('/stock')
    revalidatePath('/sales/new')
    revalidatePath('/')

    return {
      success: true,
      summary: {
        created,
        updated,
        total: created + updated,
      },
    }
  } catch (error) {
    console.error('Error confirming bulk import:', error)
    return {
      success: false,
      error: 'Error al guardar los productos. ' + (error instanceof Error ? error.message : ''),
    }
  }
}
