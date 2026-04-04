import { z } from 'zod'

function parseSpreadsheetNumber(value: unknown): unknown {
  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'string') {
    const cleaned = value
      .trim()
      .replace(/\$/g, '')
      .replace(/\s+/g, '')
      .replace(/\.(?=\d{3}(\D|$))/g, '')
      .replace(',', '.')

    if (cleaned.length === 0) {
      return value
    }

    const parsed = Number(cleaned)
    return Number.isNaN(parsed) ? value : parsed
  }

  return value
}

function normalizeStockNumber(value: unknown): unknown {
  const parsed = parseSpreadsheetNumber(value)

  if (typeof parsed === 'number' && Number.isFinite(parsed)) {
    return Math.trunc(parsed)
  }

  return parsed
}

export const ProductImportRowSchema = z.object({
  articulo: z.string().min(1, 'Articulo es requerido').trim(),
  final: z.preprocess(
    parseSpreadsheetNumber,
    z.number().min(0, 'Final (precio) no puede ser negativo')
  ),
  existencias: z.preprocess(
    normalizeStockNumber,
    z.number().int('Existencias debe ser un numero entero')
  ),
})

export type ProductImportRow = z.infer<typeof ProductImportRowSchema>

export const ProductResolvedIdentitySchema = z.object({
  brand: z.string().min(1).trim(),
  model: z.string().min(1).trim(),
  amperage: z.string().min(1).trim(),
})

export const BulkImportResultSchema = z.object({
  success: z.boolean(),
  summary: z.object({
    total: z.number(),
    valid: z.number(),
    invalid: z.number(),
    duplicatesInFile: z.number(),
    willCreate: z.number(),
    willUpdate: z.number(),
  }),
  validRows: z.array(
    z.object({
      index: z.number(),
      data: ProductImportRowSchema,
      action: z.enum(['CREATE', 'UPDATE']),
      resolvedIdentity: ProductResolvedIdentitySchema,
    })
  ),
  invalidRows: z.array(
    z.object({
      index: z.number(),
      errors: z.array(z.string()),
    })
  ),
  duplicates: z.array(
    z.object({
      indices: z.array(z.number()),
      identity: z.string(),
    })
  ).optional(),
})

export type BulkImportResult = z.infer<typeof BulkImportResultSchema>
