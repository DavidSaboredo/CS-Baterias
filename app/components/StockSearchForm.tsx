'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type StockSearchFormProps = {
  initialQuery: string
}

export default function StockSearchForm({ initialQuery }: StockSearchFormProps) {
  const router = useRouter()
  const [query, setQuery] = useState(initialQuery)
  const lastAppliedQueryRef = useRef(initialQuery.trim())

  useEffect(() => {
    setQuery(initialQuery)
    lastAppliedQueryRef.current = initialQuery.trim()
  }, [initialQuery])

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed === lastAppliedQueryRef.current) {
      return
    }

    const timeout = setTimeout(() => {
      const params = new URLSearchParams()
      if (trimmed) {
        params.set('q', trimmed)
      }

      const href = params.toString() ? `/stock?${params.toString()}` : '/stock'
      lastAppliedQueryRef.current = trimmed
      router.replace(href, { scroll: false })
    }, 350)

    return () => clearTimeout(timeout)
  }, [query, router])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const params = new URLSearchParams()
    const trimmed = query.trim()
    if (trimmed) {
      params.set('q', trimmed)
    }

    const href = params.toString() ? `/stock?${params.toString()}` : '/stock'
    lastAppliedQueryRef.current = trimmed
    router.replace(href, { scroll: false })
  }

  const handleClear = () => {
    setQuery('')
    lastAppliedQueryRef.current = ''
    router.replace('/stock', { scroll: false })
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        name="q"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar por marca, modelo o amperaje..."
        className="flex-1 rounded-md border-gray-300 shadow-sm p-2 border"
      />
      <button type="submit" className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-700">
        Buscar
      </button>
      {query.trim() && (
        <button
          type="button"
          onClick={handleClear}
          className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 flex items-center text-sm font-medium"
        >
          Limpiar
        </button>
      )}
    </form>
  )
}
