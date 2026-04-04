'use client'

import { addSale } from '@/app/actions'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ProductSearchCombo, { type Product } from './ProductSearchCombo'
import { getPrimaryButtonClasses } from '@/lib/button-styles'

export default function ClientSaleForm({ clientId }: { clientId: number }) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [price, setPrice] = useState<string>('')
  const [discountInfo, setDiscountInfo] = useState<{ amount: number; percent: number } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

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
    if (isSubmitting || !selectedProduct) return

    setIsSubmitting(true)
    const formData = new FormData(e.currentTarget)

    try {
      const result = await addSale(clientId, formData)

      if (result?.success) {
        e.currentTarget.reset()
        setSelectedProduct(null)
        setPrice('')
        setDiscountInfo(null)
        alert('Venta registrada correctamente')
        router.refresh()
      } else {
        alert('Error al registrar la venta: ' + (result?.error || 'Error desconocido'))
      }
    } catch (error) {
      console.error('Error al registrar venta:', error)
      alert('Error al registrar la venta. Intentalo de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Producto *</label>
        <ProductSearchCombo
          onSelect={handleProductSelect}
          onUnselect={handleProductUnselect}
          selectedProduct={selectedProduct}
          showStock={true}
        />
        <input type="hidden" name="productId" value={selectedProduct?.id || ''} required />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Numero de Serie *</label>
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
            placeholder="0.00"
          />
        </div>

        {discountInfo && (
          <p
            className={`mt-2 text-sm ${
              discountInfo.percent > MAX_DISCOUNT_PERCENT ? 'text-red-700' : 'text-yellow-700'
            }`}
          >
            Descuento: ${discountInfo.amount.toFixed(2)} ({discountInfo.percent.toFixed(1)}%)
            {discountInfo.percent > MAX_DISCOUNT_PERCENT &&
              ` - excede el maximo permitido (${MAX_DISCOUNT_PERCENT}%)`}
          </p>
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

      <button
        type="submit"
        disabled={isSubmitting || !selectedProduct || (discountInfo?.percent || 0) > MAX_DISCOUNT_PERCENT}
        className={getPrimaryButtonClasses({
          color: 'green',
          disabled: isSubmitting || !selectedProduct || (discountInfo?.percent || 0) > MAX_DISCOUNT_PERCENT,
          fullWidth: true,
        })}
      >
        {isSubmitting ? 'Registrando...' : 'Registrar Venta'}
      </button>
    </form>
  )
}
