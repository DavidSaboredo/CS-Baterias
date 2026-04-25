'use client'

import { useRef, useState } from 'react'
import { Edit2, X, Check, Lock, Package, Upload } from 'lucide-react'
import { updateProductStock } from '@/app/actions'
import { getPrimaryButtonClasses, getSecondaryButtonClasses } from '@/lib/button-styles'

interface EditStockButtonProps {
  productId: number
  productInfo: string
  currentStock: number
  currentPrice: number
  currentImageUrl?: string | null
}

export default function EditStockButton({
  productId,
  productInfo,
  currentStock,
  currentPrice,
  currentImageUrl,
}: EditStockButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [newStock, setNewStock] = useState(currentStock.toString())
  const [newPrice, setNewPrice] = useState(currentPrice.toString())
  const [newImageUrl, setNewImageUrl] = useState('')
  const [newImageFromFile, setNewImageFromFile] = useState('')
  const [removeImage, setRemoveImage] = useState(false)
  const [selectedFileName, setSelectedFileName] = useState('')
  const [password, setPassword] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resolvedImageUrl = (newImageFromFile || newImageUrl).trim()

  const handleImageFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      setNewImageFromFile('')
      setSelectedFileName('')
      return
    }

    if (!file.type.startsWith('image/')) {
      setError('El archivo debe ser una imagen válida')
      event.target.value = ''
      setNewImageFromFile('')
      setSelectedFileName('')
      return
    }

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ''))
        reader.onerror = () => reject(new Error('No se pudo leer la imagen'))
        reader.readAsDataURL(file)
      })

      setNewImageFromFile(dataUrl)
      setSelectedFileName(file.name)
      setRemoveImage(false)
      setError(null)
    } catch {
      setError('No se pudo procesar la imagen')
      setSelectedFileName('')
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isUpdating) return
    
    setIsUpdating(true)
    setError(null)

    try {
      const result = await updateProductStock(
        productId, 
        parseInt(newStock), 
        parseFloat(newPrice), 
        password,
        resolvedImageUrl || null,
        removeImage,
      )
      if (result.success) {
        setIsOpen(false)
        setPassword('')
        setNewImageUrl('')
        setNewImageFromFile('')
        setSelectedFileName('')
        setRemoveImage(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      } else {
        setError(result.error || 'Error al actualizar')
      }
    } catch (err) {
      setError('Error de conexión')
    } finally {
      setIsUpdating(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 text-blue-500 hover:text-blue-700 transition-all rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-100 shadow-sm active:scale-90"
        title="Editar stock"
      >
        <Edit2 className="w-4 h-4" />
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in duration-200">
        <div className="p-6">
          <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mx-auto mb-4">
            <Package className="w-6 h-6 text-blue-600" />
          </div>
          
          <h3 className="text-lg font-bold text-gray-900 text-center mb-2">
            Actualizar Inventario
          </h3>
          
          <p className="text-sm text-gray-500 text-center mb-6">
            Modificando stock de <span className="font-semibold text-gray-700">{productInfo}</span>.
          </p>

          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1 ml-1">Stock</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={newStock}
                  onChange={(e) => setNewStock(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1 ml-1">Precio ($)</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1 ml-1">Imagen de producto (opcional)</label>
              {currentImageUrl && !removeImage && !resolvedImageUrl && (
                <p className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                  Este producto ya tiene imagen cargada.
                </p>
              )}
              <input
                type="url"
                value={newImageUrl}
                onChange={(e) => {
                  setNewImageUrl(e.target.value)
                  if (e.target.value) setRemoveImage(false)
                }}
                placeholder="https://..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              />
              <div
                className="w-full px-4 py-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 hover:bg-blue-50 hover:border-blue-400 cursor-pointer flex items-center gap-3 transition-all"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <span className={`text-sm truncate ${selectedFileName ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
                  {selectedFileName || 'Subir foto o imagen desde archivo...'}
                </span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageFileChange}
                className="hidden"
              />

              {resolvedImageUrl && (
                <p className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                  Imagen nueva lista para guardar.
                </p>
              )}

              <label className="inline-flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={removeImage}
                  onChange={(e) => {
                    setRemoveImage(e.target.checked)
                    if (e.target.checked) {
                      setNewImageUrl('')
                      setNewImageFromFile('')
                      setSelectedFileName('')
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }
                  }}
                  className="rounded border-gray-300"
                />
                Quitar imagen actual
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1 ml-1">Confirmar Identidad</label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Contraseña de admin"
                  className={`w-full pl-11 pr-4 py-3 rounded-xl border focus:ring-2 outline-none transition-all ${
                    error ? 'border-red-500 focus:ring-red-200' : 'border-gray-200 focus:ring-blue-100'
                  }`}
                />
              </div>
              {error && (
                <p className="text-xs text-red-600 mt-2 ml-1 flex items-center gap-1">
                  <X className="w-3 h-3" /> {error}
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false)
                  setError(null)
                  setPassword('')
                  setNewStock(currentStock.toString())
                  setNewPrice(currentPrice.toString())
                  setNewImageUrl('')
                  setNewImageFromFile('')
                  setSelectedFileName('')
                  setRemoveImage(false)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
                className={`${getSecondaryButtonClasses({ fullWidth: false })} flex-1`}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isUpdating || !password || newStock === ''}
                className={`${getPrimaryButtonClasses({ color: 'blue', disabled: isUpdating, fullWidth: false })} flex-1`}
              >
                {isUpdating ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Actualizar
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
