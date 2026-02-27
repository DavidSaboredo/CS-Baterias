'use client'

import { deleteProduct } from '@/app/actions'

export default function DeleteProductForm({ id }: { id: number }) {
  return (
    <form action={deleteProduct.bind(null, id)} className="inline">
      <button
        type="submit"
        className="text-red-600 hover:text-red-900"
        onClick={(e) => {
          if (!confirm('¿Estás seguro de eliminar este producto?')) e.preventDefault()
        }}
      >
        Borrar
      </button>
    </form>
  )
}
