'use client'

import { useEffect } from 'react'
import { getPrimaryButtonClasses } from '@/lib/button-styles'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <div className="flex h-[50vh] w-full flex-col items-center justify-center space-y-4">
      <div className="rounded-full bg-red-100 p-3">
        <svg
          className="h-6 w-6 text-red-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-gray-900">Algo salió mal</h2>
      <p className="text-gray-500 max-w-md text-center">
        Ha ocurrido un error inesperado al cargar la página. Por favor, intente nuevamente.
      </p>
      {process.env.NODE_ENV !== 'production' && (
        <div className="w-full max-w-2xl rounded-md border border-gray-200 bg-gray-50 p-4 text-left text-xs text-gray-700">
          <div className="font-semibold">Detalle (dev)</div>
          <div className="mt-2 font-mono whitespace-pre-wrap break-words">
            {error.message}
            {error.digest ? `\nDigest: ${error.digest}` : ''}
          </div>
        </div>
      )}
      <button
        onClick={
          // Attempt to recover by trying to re-render the segment
          () => reset()
        }
        className={getPrimaryButtonClasses({ color: 'blue', fullWidth: false, size: 'sm' })}
      >
        Intentar de nuevo
      </button>
    </div>
  )
}
