'use server'

import { prisma } from '@/lib/prisma'
import { ProductImportRowSchema, BulkImportResult } from '@/lib/product-import-schema'
import { normalizeProductIdentity, productIdentityKey } from '@/lib/product-normalization'
import { parseExcelFile } from '@/lib/product-import'
import { revalidatePath } from 'next/cache'

/**
 * Preview import: validate rows without persisting
 */
export async function previewBulkImport(
  buffer: Uint8Array
): Promise<BulkImportResult> {
  try {
    const rows = parseExcelFile(buffer)

    if (rows.length === 0) {
      return {
        success: false,
        summary: { total: 0, valid: 0, invalid: 0, duplicatesInFile: 0, willCreate: 0, willUpdate: 0 },
        validRows: [],
        invalidRows: [],
      }
    }

    const validRows: Array<{ index: number; data: any; action: 'CREATE' | 'UPDATE' }> = []
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
        const normalized = normalizeProductIdentity(
          result.data.brand,
          result.data.model,
          result.data.amperage
        )
        const key = productIdentityKey(normalized.brand, normalized.model, normalized.amperage)

        if (!seenIdentities.has(key)) {
          seenIdentities.set(key, [])
        }
        seenIdentities.get(key)!.push(i + 1)

        validRows.push({
          index: i + 1,
          data: result.data,
          action: 'CREATE', // Will be updated to UPDATE after DB check
        })
      }
    }

    // Check for existing products in DB and determine action
    const existingProducts = await prisma.product.findMany({
      where: {
        OR: validRows.map(row => {
          const normalized = normalizeProductIdentity(row.data.brand, row.data.model, row.data.amperage)
          return {
            AND: [
              { brand: { equals: normalized.brand, mode: 'insensitive' } },
              { model: { equals: normalized.model, mode: 'insensitive' } },
              { amperage: { equals: normalized.amperage, mode: 'insensitive' } },
            ],
          }
        }),
      },
      select: { id: true, brand: true, model: true, amperage: true },
    })

    const existingKeys = new Set(
      existingProducts.map(p => productIdentityKey(p.brand, p.model, p.amperage))
    )

    // Update actions
    validRows.forEach(row => {
      const key = productIdentityKey(row.data.brand, row.data.model, row.data.amperage)
      row.action = existingKeys.has(key) ? 'UPDATE' : 'CREATE'
    })

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
  // Verify admin password
  if (password !== 'santino230525') {
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

    // Persist in transaction
    const result = await prisma.$transaction(async (tx) => {
      let created = 0
      let updated = 0

      for (const row of preview.validRows) {
        const normalized = normalizeProductIdentity(row.data.brand, row.data.model, row.data.amperage)

        if (row.action === 'CREATE') {
          await tx.product.create({
            data: {
              brand: normalized.brand,
              model: normalized.model,
              amperage: normalized.amperage,
              price: row.data.price,
              minStock: row.data.minStock,
              stock: 0, // Don't import stock in this phase
            },
          })
          created++
        } else {
          // UPDATE: only price and minStock
          await tx.product.updateMany({
            where: {
              AND: [
                { brand: { equals: normalized.brand, mode: 'insensitive' } },
                { model: { equals: normalized.model, mode: 'insensitive' } },
                { amperage: { equals: normalized.amperage, mode: 'insensitive' } },
              ],
            },
            data: {
              price: row.data.price,
              minStock: row.data.minStock,
            },
          })
          updated++
        }
      }

      return { created, updated }
    })

    revalidatePath('/stock')
    revalidatePath('/sales/new')
    revalidatePath('/')

    return {
      success: true,
      summary: {
        created: result.created,
        updated: result.updated,
        total: result.created + result.updated,
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
