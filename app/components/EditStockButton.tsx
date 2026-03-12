'use client'

import { useState } from 'react'
import { Edit2, X, Check, Lock, Package } from 'lucide-react'
import { updateProductStock } from '@/app/actions'

interface EditStockButtonProps {
  productId: number
  productInfo: string
  currentStock: number
}

export default function EditStockButton({ productId, productInfo, currentStock }: EditStockButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [newStock, setNewStock] = useState(currentStock.toString())
  const [password, setPassword] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isUpdating) return
    
    setIsUpdating(true)
    setError(null)

    try {
      const result = await updateProductStock(productId, parseInt(newStock), password)
      if (result.success) {
        setIsOpen(false)
        setPassword('')
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
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1 ml-1">Nuevo Stock</label>
              <input
                type="number"
                required
                min="0"
                value={newStock}
                onChange={(e) => setNewStock(e.target.value)}
                placeholder="Cantidad disponible"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                autoFocus
              />
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
                }}
                className="flex-1 px-4 py-3 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isUpdating || !password || newStock === ''}
                className="flex-1 px-4 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
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
