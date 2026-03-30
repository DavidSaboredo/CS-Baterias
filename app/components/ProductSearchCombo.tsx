'use client'

import { useState, useCallback, useRef } from 'react'
import { Search, X } from 'lucide-react'

export type Product = {
  id: number
  brand: string
  model: string
  amperage: string
  price: number
  stock: number
  minStock: number
  available: boolean
  displayName: string
}

interface ProductSearchComboProps {
  onSelect: (product: Product) => void
  selectedProduct: Product | null
  onUnselect?: () => void
  showStock?: boolean
}

export default function ProductSearchCombo({
  onSelect,
  selectedProduct,
  onUnselect,
  showStock = true,
}: ProductSearchComboProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const performSearch = useCallback(
    async (term: string, pageNum: number = 1) => {
      if (!term.trim()) {
        setProducts([])
        setPage(1)
        setTotalPages(0)
        setError(null)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          search: term,
          page: pageNum.toString(),
          limit: '50',
          available: 'true',
        })

        const response = await fetch(`/api/internal/products/search?${params}`)
        if (!response.ok) {
          throw new Error('Error al buscar productos')
        }

        const result = await response.json()
        setProducts(result.data || [])
        setPage(result.meta.page)
        setTotalPages(result.meta.totalPages)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido')
        setProducts([])
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const term = e.target.value
      setSearchTerm(term)
      setPage(1)
      performSearch(term, 1)
    },
    [performSearch]
  )

  const handleSelectProduct = useCallback(
    (product: Product) => {
      onSelect(product)
      setSearchTerm('')
      setProducts([])
      setError(null)
    },
    [onSelect]
  )

  const handleUnselect = useCallback(() => {
    onUnselect?.()
    setSearchTerm('')
    setProducts([])
    setError(null)
    inputRef.current?.focus()
  }, [onUnselect])

  const handleClearSearch = useCallback(() => {
    setSearchTerm('')
    setProducts([])
    setError(null)
    setPage(1)
    setTotalPages(0)
    inputRef.current?.focus()
  }, [])

  const isDropdownVisible = searchTerm.trim() && (products.length > 0 || isLoading || error)

  return (
    <div className="relative">
      {!selectedProduct ? (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Buscar por marca, modelo o amperaje..."
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
              value={searchTerm}
              onChange={handleSearchChange}
              autoComplete="off"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {isDropdownVisible && (
            <div
              ref={dropdownRef}
              className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-64 overflow-y-auto"
            >
              {isLoading && (
                <div className="p-4 text-center text-gray-500 text-sm">
                  Buscando productos...
                </div>
              )}

              {error && (
                <div className="p-4 text-center text-red-600 text-sm">
                  {error}
                </div>
              )}

              {products.length > 0 && (
                <>
                  {products.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => handleSelectProduct(product)}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center justify-between border-b border-gray-50 last:border-0 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">
                          {product.displayName}
                        </p>
                        <p className="text-xs text-gray-500">
                          Amperaje: {product.amperage} • ${product.price}
                        </p>
                      </div>
                      {showStock && (
                        <span
                          className={`flex-shrink-0 ml-2 px-2 py-1 text-xs font-semibold rounded ${
                            product.stock > product.minStock
                              ? 'bg-green-100 text-green-800'
                              : product.stock > 0
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {product.stock}
                        </span>
                      )}
                    </button>
                  ))}

                  {totalPages > 1 && (
                    <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-600">
                      <span>
                        Página {page} de {totalPages}
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={page === 1}
                          onClick={() => performSearch(searchTerm, page - 1)}
                          className="px-2 py-1 bg-white border border-gray-300 rounded disabled:opacity-50 hover:bg-gray-50"
                        >
                          Anterior
                        </button>
                        <button
                          type="button"
                          disabled={page === totalPages}
                          onClick={() => performSearch(searchTerm, page + 1)}
                          className="px-2 py-1 bg-white border border-gray-300 rounded disabled:opacity-50 hover:bg-gray-50"
                        >
                          Siguiente
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {!isLoading && !error && products.length === 0 && searchTerm.trim() && (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No se encontraron productos.
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900">{selectedProduct.displayName}</p>
            <p className="text-sm text-gray-600">
              Amperaje: {selectedProduct.amperage} • Precio: ${selectedProduct.price}
              {showStock && (
                <>
                  {' • Stock: '}
                  <span
                    className={`font-semibold ${
                      selectedProduct.stock > selectedProduct.minStock
                        ? 'text-green-700'
                        : selectedProduct.stock > 0
                        ? 'text-yellow-700'
                        : 'text-red-700'
                    }`}
                  >
                    {selectedProduct.stock}
                  </span>
                </>
              )}
            </p>
          </div>
          {onUnselect && (
            <button
              type="button"
              onClick={handleUnselect}
              className="ml-2 px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
            >
              Cambiar
            </button>
          )}
        </div>
      )}
    </div>
  )
}
