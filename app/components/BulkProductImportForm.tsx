'use client'

import { useRef, useState } from 'react'
import { Upload, AlertCircle, CheckCircle2, AlertTriangle, Download } from 'lucide-react'
import { previewBulkImport, confirmBulkImport } from '@/app/actions/importProducts'
import { BulkImportResult } from '@/lib/product-import-schema'
import { getPrimaryButtonClasses } from '@/lib/button-styles'
import * as XLSX from 'xlsx'

export default function BulkProductImportForm() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<BulkImportResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv')) {
      setMessage({ type: 'error', text: 'Solo se aceptan archivos Excel (.xlsx, .xls) o CSV' })
      return
    }

    setSelectedFile(file)
    setMessage(null)

    // Generate preview
    setIsLoading(true)
    try {
      const buffer = await file.arrayBuffer()
      const result = await previewBulkImport(new Uint8Array(buffer))
      setPreview(result)

      if (!result.success) {
        setMessage({ type: 'error', text: 'Error al procesar el archivo' })
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error desconocido',
      })
      setPreview(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!selectedFile || !preview?.success) return
    if (!password.trim()) {
      setMessage({ type: 'error', text: 'Ingresá la contraseña de administrador' })
      return
    }

    setIsConfirming(true)
    try {
      const buffer = await selectedFile.arrayBuffer()
      const result = await confirmBulkImport(new Uint8Array(buffer), password)

      if (result.success) {
        setMessage({
          type: 'success',
          text: `✓ Importación completada: ${result.summary.created} productos creados, ${result.summary.updated} actualizados.`,
        })
        setSelectedFile(null)
        setPreview(null)
        setPassword('')
        if (fileInputRef.current) fileInputRef.current.value = ''
      } else {
        setMessage({ type: 'error', text: result.error || 'Error al guardar' })
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error desconocido',
      })
    } finally {
      setIsConfirming(false)
    }
  }

  const handleCancel = () => {
    setSelectedFile(null)
    setPreview(null)
    setPassword('')
    setMessage(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const downloadTemplate = () => {
    const template = [
      { brand: 'Moura', model: 'M20GD', amperage: '65Ah', price: 45000, minStock: 5 },
      { brand: 'Impact', model: 'ISM50', amperage: '50Ah', price: 38000, minStock: 3 },
      { brand: 'Willard', model: 'UB500', amperage: '50Ah', price: 35000, minStock: 5 },
    ]

    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Productos')
    XLSX.writeFile(wb, 'plantilla-productos.xlsx')
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center gap-2 mb-6">
        <Upload className="w-5 h-5 text-green-600" />
        <h2 className="text-xl font-semibold text-gray-800">Importar Productos desde Excel</h2>
      </div>

      {!preview ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cargar archivo Excel
            </label>
            <div
              className="w-full px-4 py-6 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-green-50 hover:border-green-400 cursor-pointer flex flex-col items-center justify-center transition-all"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-sm font-medium text-gray-700">
                Haz clic o arrastra un archivo Excel aquí
              </span>
              <span className="text-xs text-gray-500 mt-1">
                Formatos: .xlsx, .xls, .csv
              </span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          <button
            type="button"
            onClick={downloadTemplate}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            <Download className="w-4 h-4" />
            Descargar plantilla de ejemplo
          </button>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
            <p className="font-medium mb-1">📋 Formato esperado:</p>
            <ul className="list-disc pl-5 space-y-0.5">
              <li>Columnas: brand, model, amperage, price, minStock (opcional)</li>
              <li>Ejemplos: Moura, M20GD, 65Ah, 45000, 5</li>
              <li>Solo se actualizan precios. Stock no se modifica en esta versión.</li>
            </ul>
          </div>

          {message && (
            <div
              className={`p-3 rounded-lg flex items-center gap-2 text-sm font-medium ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-100'
                  : 'bg-red-50 text-red-700 border border-red-100'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              {message.text}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-xs text-gray-600">Filas totales</p>
              <p className="text-xl font-bold text-blue-700">{preview.summary.total}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-xs text-gray-600">Válidas</p>
              <p className="text-xl font-bold text-green-700">{preview.summary.valid}</p>
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
              <p className="text-xs text-gray-600">Con error</p>
              <p className="text-xl font-bold text-red-700">{preview.summary.invalid}</p>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg">
              <p className="text-xs text-gray-600">Duplicados</p>
              <p className="text-xl font-bold text-yellow-700">{preview.summary.duplicatesInFile}</p>
            </div>
          </div>

          {/* Actions breakdown */}
          {preview.summary.valid > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <p className="text-sm font-semibold text-gray-900">Acciones a realizar:</p>
              <div className="flex gap-4 text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                  {preview.summary.willCreate} producto(s) nuevo(s)
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                  {preview.summary.willUpdate} producto(s) a actualizar precio
                </span>
              </div>
            </div>
          )}

          {/* Invalid rows */}
          {preview.invalidRows.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <p className="font-semibold text-red-900">
                  {preview.invalidRows.length} fila(s) con error
                </p>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {preview.invalidRows.map(row => (
                  <div key={row.index} className="text-xs text-red-800 bg-white p-2 rounded">
                    <p className="font-medium">Fila {row.index}:</p>
                    {row.errors.map((error, i) => (
                      <p key={i} className="text-red-700">
                        • {error}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Duplicates in file */}
          {preview.duplicates && preview.duplicates.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Duplicados dentro del archivo
              </p>
              <div className="space-y-1 text-xs text-yellow-800">
                {preview.duplicates.map((dup, i) => (
                  <p key={i}>
                    • Filas {dup.indices.join(', ')}: {dup.identity}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Password and action buttons */}
          {preview.summary.invalid === 0 && preview.summary.valid > 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contraseña de administrador
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Confirmar identidad"
                  className="w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isConfirming}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isConfirming || !password}
                  className={getPrimaryButtonClasses({
                    color: 'green',
                    disabled: isConfirming || !password,
                    fullWidth: true,
                  })}
                >
                  {isConfirming ? 'Guardando...' : 'Confirmar Importación'}
                </button>
              </div>
            </div>
          )}

          {/* Error state */}
          {!preview.success && (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancelar
              </button>
            </div>
          )}

          {message && (
            <div
              className={`p-3 rounded-lg flex items-center gap-2 text-sm font-medium ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-100'
                  : 'bg-red-50 text-red-700 border border-red-100'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              {message.text}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
