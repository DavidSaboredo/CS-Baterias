'use client'

import { useCallback, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { getSecondaryButtonClasses } from '@/lib/button-styles'

export type Client = {
  id: number
  name: string
  phone: string | null
  licensePlate: string | null
  displayName: string
}

interface ClientSearchComboProps {
  onSelect: (client: Client) => void
  selectedClient: Client | null
  onUnselect?: () => void
}

export default function ClientSearchCombo({
  onSelect,
  selectedClient,
  onUnselect,
}: ClientSearchComboProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const performSearch = useCallback(async (term: string, pageNum: number = 1) => {
    if (!term.trim()) {
      setClients([])
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
        limit: '20',
      })

      const response = await fetch(`/api/internal/clients/search?${params}`)
      if (!response.ok) {
        throw new Error('Error al buscar clientes')
      }

      const result = await response.json()
      setClients(result.data || [])
      setPage(result.meta.page)
      setTotalPages(result.meta.totalPages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setClients([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const term = event.target.value
      setSearchTerm(term)
      setPage(1)
      performSearch(term, 1)
    },
    [performSearch]
  )

  const handleSelectClient = useCallback(
    (client: Client) => {
      onSelect(client)
      setSearchTerm('')
      setClients([])
      setError(null)
    },
    [onSelect]
  )

  const handleUnselect = useCallback(() => {
    onUnselect?.()
    setSearchTerm('')
    setClients([])
    setError(null)
    inputRef.current?.focus()
  }, [onUnselect])

  const handleClearSearch = useCallback(() => {
    setSearchTerm('')
    setClients([])
    setError(null)
    setPage(1)
    setTotalPages(0)
    inputRef.current?.focus()
  }, [])

  const isDropdownVisible = searchTerm.trim() && (clients.length > 0 || isLoading || error)

  return (
    <div className="relative">
      {!selectedClient ? (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Buscar por nombre, patente o teléfono..."
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
              value={searchTerm}
              onChange={handleSearchChange}
              autoComplete="off"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {isDropdownVisible && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-64 overflow-y-auto">
              {isLoading && (
                <div className="p-4 text-center text-gray-500 text-sm">
                  Buscando clientes...
                </div>
              )}

              {error && (
                <div className="p-4 text-center text-red-600 text-sm">
                  {error}
                </div>
              )}

              {clients.length > 0 && (
                <>
                  {clients.map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => handleSelectClient(client)}
                      className="w-full appearance-none bg-white text-left px-4 py-3 hover:bg-blue-50 flex items-center justify-between border-b border-gray-100 last:border-0 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">{client.displayName}</p>
                        <p className="text-xs text-gray-500">
                          {client.phone || 'Sin teléfono'}
                        </p>
                      </div>
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
                          className="appearance-none rounded-md border border-gray-300 bg-white px-2 py-1 font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Anterior
                        </button>
                        <button
                          type="button"
                          disabled={page === totalPages}
                          onClick={() => performSearch(searchTerm, page + 1)}
                          className="appearance-none rounded-md border border-gray-300 bg-white px-2 py-1 font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Siguiente
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {!isLoading && !error && clients.length === 0 && searchTerm.trim() && (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No se encontraron clientes.
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200 gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900">{selectedClient.name}</p>
            <p className="text-sm text-gray-600">
              {selectedClient.licensePlate || 'Sin patente'}
              {' • '}
              {selectedClient.phone || 'Sin teléfono'}
            </p>
          </div>
          {onUnselect && (
            <button
              type="button"
              onClick={handleUnselect}
              className={`${getSecondaryButtonClasses()} ml-2 bg-red-100 text-red-700 border-red-200 hover:bg-red-200 hover:text-red-800`}
            >
              Cambiar
            </button>
          )}
        </div>
      )}
    </div>
  )
}