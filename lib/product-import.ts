import * as XLSX from 'xlsx'

/**
 * Parse Excel file buffer and return rows
 */
export function parseExcelFile(buffer: Uint8Array): Array<Record<string, any>> {
  try {
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(sheet) as Array<Record<string, any>>
    return rows
  } catch (error) {
    throw new Error('No se pudo parsear el archivo Excel')
  }
}
