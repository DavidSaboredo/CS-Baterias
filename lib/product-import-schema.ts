import { z } from 'zod'

export const ProductImportRowSchema = z.object({
  brand: z.string().min(1, 'Marca es requerida').trim(),
  model: z.string().min(1, 'Modelo es requerido').trim(),
  amperage: z.string().min(1, 'Amperaje es requerido').trim(),
  price: z.coerce.number().positive('Precio debe ser mayor a 0'),
  minStock: z.coerce.number().int().nonnegative('Stock mínimo no puede ser negativo').optional().default(5),
})

export type ProductImportRow = z.infer<typeof ProductImportRowSchema>

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
