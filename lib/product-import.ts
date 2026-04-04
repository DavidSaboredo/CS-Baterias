import * as XLSX from 'xlsx'

function normalizeHeader(header: string): string {
  return header
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/\s+/g, '')
    .trim()
}

const COLUMN_ALIASES: Record<string, string[]> = {
  articulo: [
    'articulo',
    'producto',
    'item',
    'descripcion',
    'detalle',
    'modelodescripcion',
    'codigodescripcion',
  ],
  final: [
    'final',
    'finalprecio',
    'precio',
    'price',
    'precioventa',
    'preciofinal',
    'pfinal',
    'pvta',
    'pventa',
  ],
  existencias: [
    'existencias',
    'existencia',
    'excistencias',
    'stock',
    'stok',
    'cantidad',
    'disponible',
    'saldo',
  ],
}

function getCanonicalHeader(header: string): string | null {
  const key = normalizeHeader(header)

  for (const [target, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (aliases.includes(key)) {
      return target
    }
  }

  return null
}

function isEmptyRow(row: unknown[]): boolean {
  return row.every(value => value === null || value === undefined || String(value).trim() === '')
}

function detectHeaderRow(rows: unknown[][]): { headerIndex: number; headers: string[] } {
  let bestMatch = { headerIndex: 0, headers: [] as string[], score: -1 }

  for (let index = 0; index < Math.min(rows.length, 15); index++) {
    const row = rows[index].map(value => String(value ?? '').trim())
    const score = row.reduce((total, cell) => total + (getCanonicalHeader(cell) ? 1 : 0), 0)

    if (score > bestMatch.score) {
      bestMatch = { headerIndex: index, headers: row, score }
    }

    if (score >= 3) {
      return { headerIndex: index, headers: row }
    }
  }

  return { headerIndex: bestMatch.headerIndex, headers: bestMatch.headers }
}

function mapColumns(row: Record<string, unknown>): Record<string, unknown> {
  const mapped: Record<string, unknown> = {}
  const originalEntries = Object.entries(row)

  for (const [rawHeader, value] of originalEntries) {
    const canonical = getCanonicalHeader(rawHeader) ?? rawHeader
    mapped[canonical] = value
  }

  // Fallback: if the expected keys are still missing, map by column order.
  // Many provider sheets use unexpected headers but keep a stable column order.
  const orderedValues = originalEntries.map(([, value]) => value)
  if (!('articulo' in mapped) && orderedValues.length > 0) {
    mapped.articulo = orderedValues[0]
  }
  if (!('final' in mapped) && orderedValues.length > 1) {
    mapped.final = orderedValues[1]
  }
  if (!('existencias' in mapped) && orderedValues.length > 2) {
    mapped.existencias = orderedValues[2]
  }

  return mapped
}

/**
 * Parse Excel file buffer and return rows
 */
export function parseExcelFile(buffer: Uint8Array): Array<Record<string, any>> {
  try {
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const matrix = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      blankrows: false,
      raw: false,
    }) as unknown[][]

    const nonEmptyRows = matrix.filter(row => !isEmptyRow(row))
    if (nonEmptyRows.length === 0) {
      return []
    }

    const { headerIndex, headers } = detectHeaderRow(nonEmptyRows)
    const dataRows = nonEmptyRows.slice(headerIndex + 1)

    return dataRows
      .map(row => {
        const record: Record<string, unknown> = {}
        headers.forEach((header, index) => {
          if (header) {
            record[header] = row[index] ?? ''
          }
        })
        return mapColumns(record)
      })
      .filter(row => String(row.articulo ?? '').trim() !== '')
  } catch (error) {
    throw new Error('No se pudo parsear el archivo Excel')
  }
}
