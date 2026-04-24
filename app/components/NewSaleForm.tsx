'use client'

import { addSale } from '@/app/actions'
import { useState } from 'react'
import Link from 'next/link'
import { savePendingAction } from '@/lib/offline-db'
import { useRouter } from 'next/navigation'
import { getPrimaryButtonClasses, getSecondaryButtonClasses } from '@/lib/button-styles'
import ProductSearchCombo, { type Product } from './ProductSearchCombo'
import ClientSearchCombo, { type Client } from './ClientSearchCombo'
import { isValidProductCode, normalizeProductCode } from '@/lib/product-code.js'
 
export default function NewSaleForm() {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [price, setPrice] = useState<string>('')
  const [discountInfo, setDiscountInfo] = useState<{ amount: number, percent: number } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [scanCode, setScanCode] = useState('')
  const [scanError, setScanError] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const router = useRouter()
  
  // Constante de política comercial (ej. 20% máximo)
  const MAX_DISCOUNT_PERCENT = 20

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product)
    setPrice(product.price.toString())
    setDiscountInfo(null)
  }

  const handleProductUnselect = () => {
    setSelectedProduct(null)
    setPrice('')
    setDiscountInfo(null)
  }

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client)
  }

  const handleClientUnselect = () => {
    setSelectedClient(null)
  }

  const handleLookupByCode = async () => {
    const normalized = normalizeProductCode(scanCode)
    setScanCode(normalized)
    setScanError(null)

    if (!isValidProductCode(normalized)) {
      setScanError('Formato inválido. Debe ser A-Z / 0-9 y exactamente 3 caracteres.')
      return
    }

    setIsScanning(true)
    try {
      const res = await fetch(`/api/products/by-code/${encodeURIComponent(normalized)}`)
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setScanError(body?.error || 'No se pudo buscar el producto.')
        return
      }
      const p = body.product as Product
      if (p.stock <= 0) {
        setScanError('Producto encontrado, pero sin stock.')
        return
      }
      setSelectedProduct(p)
      setPrice(p.price.toString())
      setDiscountInfo(null)
    } catch {
      setScanError('Error de conexión.')
    } finally {
      setIsScanning(false)
    }
  }

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPrice = e.target.value
    setPrice(newPrice)
    
    if (selectedProduct && newPrice) {
      const currentPriceVal = parseFloat(newPrice)
      const originalPrice = selectedProduct.price
      
      if (currentPriceVal < originalPrice) {
        const amount = originalPrice - currentPriceVal
        const percent = (amount / originalPrice) * 100
        setDiscountInfo({ amount, percent })
      } else {
        setDiscountInfo(null)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    
    // Check if online
    if (!navigator.onLine) {
      const data = Object.fromEntries(formData.entries())
      await savePendingAction({
        type: 'SALE',
        data
      })
      window.dispatchEvent(new CustomEvent('offline-action-saved'))
      alert('¡Venta guardada localmente! Se sincronizará en cuanto recuperes internet.')
      
      // Limpiar formulario en lugar de redirigir para evitar errores de red
      setSelectedClient(null)
      setSelectedProduct(null)
      setPrice('')
      setDiscountInfo(null)
      e.currentTarget.reset()
      setIsSubmitting(false)
      return
    }

    try {
      const result = await addSale(parseInt(formData.get('clientId') as string), formData)
      
      if (result?.success) {
        if (result.lowStock) {
          alert(`¡Venta realizada! Atención: El stock bajó del mínimo (${result.stock} restantes).`)
        } else {
          alert('¡Venta realizada con éxito!')
        }
        router.push('/sales')
      } else {
        alert('Error al crear la venta: ' + (result?.error || 'Error desconocido'))
      }
    } catch (error) {
      console.error('Error al crear venta:', error)
      alert('Error al crear la venta. Inténtalo de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto bg-white p-4 sm:p-8 rounded-lg shadow">
      
      {/* Paso 1: Cliente */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">1. Seleccionar Cliente</h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="w-full sm:flex-1 min-w-0">
            <ClientSearchCombo
              onSelect={handleClientSelect}
              onUnselect={handleClientUnselect}
              selectedClient={selectedClient}
            />
            <input
              type="hidden"
              name="clientId"
              value={selectedClient?.id || ''}
              required
            />
          </div>
          <Link href="/clients" className={`${getSecondaryButtonClasses()} w-full sm:w-auto whitespace-nowrap`}>
            Agregar nuevo cliente
          </Link>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6"></div>

      {/* Paso 2: Producto */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">2. Seleccionar Producto</h3>
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Buscar por código</label>
          <div className="flex gap-2">
            <input
              value={scanCode}
              onChange={(e) => {
                setScanCode(normalizeProductCode(e.target.value))
                setScanError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleLookupByCode()
                }
              }}
              maxLength={3}
              autoComplete="off"
              placeholder="Ej: A1Z"
              className="flex-1 rounded-md border-gray-300 shadow-sm p-2 border uppercase tracking-widest text-center focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="button"
              onClick={handleLookupByCode}
              disabled={isScanning}
              className="bg-gray-900 text-white px-4 py-2 rounded hover:bg-gray-800 disabled:opacity-50"
            >
              {isScanning ? 'Buscando…' : 'Buscar'}
            </button>
          </div>
          {scanError && <div className="mt-2 text-sm text-red-600">{scanError}</div>}
        </div>
        <ProductSearchCombo
          onSelect={handleProductSelect}
          onUnselect={handleProductUnselect}
          selectedProduct={selectedProduct}
          showStock={true}
        />
        {/* Hidden field for form submission */}
        <input
          type="hidden"
          name="productId"
          value={selectedProduct?.id || ''}
          required
        />
      </div>

      {/* Paso 3: Detalles */}
      {selectedProduct && (
        <div key={selectedProduct.id} className="animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="border-t border-gray-200 pt-6 mt-6"></div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">3. Detalles de la Venta</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Número de Serie *</label>
              <input
                type="text"
                name="serialNumber"
                required
                className="w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
                placeholder="SN..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio Final *</label>
              <div className="relative rounded-md shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  name="price"
                  step="0.01"
                  required
                  value={price}
                  onChange={handlePriceChange}
                  className={`block w-full rounded-md pl-7 p-2 border focus:ring-blue-500 focus:border-blue-500 ${
                    discountInfo && discountInfo.percent > MAX_DISCOUNT_PERCENT 
                      ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-300'
                  }`}
                />
              </div>
              
              {/* Reporte de Descuento / Alerta Visual */}
              {discountInfo && (
                <div className={`mt-3 p-4 rounded-md border ${
                  discountInfo.percent > MAX_DISCOUNT_PERCENT 
                    ? 'bg-red-50 border-red-200' 
                    : 'bg-yellow-50 border-yellow-200'
                }`}>
                  <div className="flex">
                    <div className="flex-shrink-0">
                      {discountInfo.percent > MAX_DISCOUNT_PERCENT ? (
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="ml-3">
                      <h3 className={`text-sm font-medium ${
                        discountInfo.percent > MAX_DISCOUNT_PERCENT ? 'text-red-800' : 'text-yellow-800'
                      }`}>
                        {discountInfo.percent > MAX_DISCOUNT_PERCENT 
                          ? '¡Descuento excede política comercial!' 
                          : 'Se aplicará un descuento'}
                      </h3>
                      <div className={`mt-2 text-sm ${
                        discountInfo.percent > MAX_DISCOUNT_PERCENT ? 'text-red-700' : 'text-yellow-700'
                      }`}>
                        <ul className="list-disc pl-5 space-y-1">
                          <li>Monto descontado: <strong>${discountInfo.amount.toFixed(2)}</strong></li>
                          <li>Porcentaje: <strong>{discountInfo.percent.toFixed(1)}%</strong> {discountInfo.percent > MAX_DISCOUNT_PERCENT && `(Máx: ${MAX_DISCOUNT_PERCENT}%)`}</li>
                          <li>Autorizado por: <strong>salvador</strong></li>
                          <li>Fecha: {new Date().toLocaleString()}</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Garantía (meses)</label>
              <input
                type="number"
                name="warrantyDuration"
                defaultValue={12}
                min={0}
                className="w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-400">Ingresá 0 si el artículo no tiene garantía.</p>
            </div>
          </div>
        </div>
      )}

      <div className="pt-6">
        <button
          type="submit"
          disabled={isSubmitting || !selectedClient || !selectedProduct || (discountInfo?.percent || 0) > MAX_DISCOUNT_PERCENT}
          className={getPrimaryButtonClasses({ color: 'green', disabled: isSubmitting || !selectedClient || !selectedProduct || (discountInfo?.percent || 0) > MAX_DISCOUNT_PERCENT })}
        >
          {isSubmitting ? 'Procesando...' : 'Confirmar Venta'}
        </button>
      </div>
    </form>
  )
}
