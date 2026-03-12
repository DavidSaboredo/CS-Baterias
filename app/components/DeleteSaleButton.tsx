'use client'

import { useState } from 'react'
import { Trash2, X, Check, Lock } from 'lucide-react'
import { deleteSale } from '@/app/actions'

interface DeleteSaleButtonProps {
  saleId: number
  saleInfo: string
}

export default function DeleteSaleButton({ saleId, saleInfo }: DeleteSaleButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isDeleting) return
    
    setIsDeleting(true)
    setError(null)

    try {
      const result = await deleteSale(saleId, password)
      if (result.success) {
        setIsOpen(false)
        setPassword('')
      } else {
        setError(result.error || 'Error al eliminar')
      }
    } catch (err) {
      setError('Error de conexión')
    } finally {
      setIsDeleting(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="p-3 text-red-500 hover:text-red-700 transition-all rounded-xl bg-red-50 hover:bg-red-100 border border-red-100 shadow-sm active:scale-90"
        title="Eliminar venta"
      >
        <Trash2 className="w-5 h-5" />
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in duration-200">
        <div className="p-6">
          <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
            <Lock className="w-6 h-6 text-red-600" />
          </div>
          
          <h3 className="text-lg font-bold text-gray-900 text-center mb-2">
            Confirmar eliminación
          </h3>
          
          <p className="text-sm text-gray-500 text-center mb-6">
            Para eliminar la venta de <span className="font-semibold text-gray-700">{saleInfo}</span> y devolver el stock, ingresa la contraseña de administrador.
          </p>

          <form onSubmit={handleDelete} className="space-y-4">
            <div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña de admin"
                className={`w-full px-4 py-3 rounded-xl border focus:ring-2 outline-none transition-all ${
                  error ? 'border-red-500 focus:ring-red-200' : 'border-gray-200 focus:ring-red-100'
                }`}
                autoFocus
              />
              {error && (
                <p className="text-xs text-red-600 mt-2 ml-1 flex items-center gap-1">
                  <X className="w-3 h-3" /> {error}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false)
                  setError(null)
                  setPassword('')
                }}
                className="flex-1 px-4 py-3 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isDeleting || !password}
                className="flex-1 px-4 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-red-900/20"
              >
                {isDeleting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Confirmar
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
