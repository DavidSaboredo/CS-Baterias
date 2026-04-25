'use client'

import { updateAllProductPricesByPercentage } from '@/app/actions'
import { useState } from 'react'
import { ArrowDown, ArrowUp, BadgePercent, CheckCircle2, Lock, RefreshCw, AlertCircle } from 'lucide-react'
import { getPrimaryButtonClasses } from '@/lib/button-styles'

export default function BulkPriceUpdateForm() {
  const [percentage, setPercentage] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const numericPercentage = Number(percentage || '0')
  const isDecrease = numericPercentage < 0
  const previewMultiplier = Number.isFinite(numericPercentage)
    ? 1 + numericPercentage / 100
    : 1
  const examplePrice = previewMultiplier > 0
    ? (100000 * previewMultiplier).toFixed(2)
    : null

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isSubmitting) {
      return
    }

    setIsSubmitting(true)
    setMessage(null)

    try {
      const result = await updateAllProductPricesByPercentage(numericPercentage, password)

      if (result.success) {
        setMessage({
          type: 'success',
          text: `Se actualizaron ${result.updatedCount} productos con un ajuste de ${result.percentage}%.`,
        })
        setPercentage('')
        setPassword('')
      } else {
        setMessage({
          type: 'error',
          text: result.error || 'No se pudieron actualizar los precios',
        })
      }
    } catch {
      setMessage({
        type: 'error',
        text: 'Error de conexión',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center gap-2 mb-6">
        <BadgePercent className="w-5 h-5 text-amber-600" />
        <h2 className="text-xl font-semibold text-gray-800">Ajuste Global de Precios</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Porcentaje</label>
            <div className="relative">
              {isDecrease ? (
                <ArrowDown className="absolute left-3 top-3.5 w-4 h-4 text-red-500" />
              ) : (
                <ArrowUp className="absolute left-3 top-3.5 w-4 h-4 text-green-500" />
              )}
              <input
                type="number"
                step="0.01"
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                placeholder="Ej: 5 o -10"
                className="w-full rounded-md border-gray-300 shadow-sm pl-10 p-2 border focus:ring-amber-500 focus:border-amber-500"
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Usá valores positivos para subir y negativos para bajar.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña admin</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Confirmar identidad"
                className="w-full rounded-md border-gray-300 shadow-sm pl-10 p-2 border focus:ring-amber-500 focus:border-amber-500"
                required
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span className="font-semibold">Vista previa:</span>{' '}
          {examplePrice
            ? `un precio de $100000.00 pasaría a $${examplePrice}.`
            : 'ingresá un porcentaje válido para ver el ejemplo.'}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !percentage || !password}
          className={getPrimaryButtonClasses({ color: 'amber', disabled: isSubmitting || !percentage || !password, fullWidth: true })}
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <RefreshCw className="w-5 h-5" />
              Aplicar ajuste global
            </>
          )}
        </button>

        {message && (
          <div className={`mt-4 p-3 rounded-xl flex items-center gap-2 text-sm font-medium ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-100'
              : 'bg-red-50 text-red-700 border border-red-100'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            {message.text}
          </div>
        )}
      </form>
    </div>
  )
}
