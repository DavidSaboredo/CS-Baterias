'use client'

import { deleteClient } from '@/app/actions'

export default function DeleteClientForm({ id }: { id: number }) {
  return (
    <form action={deleteClient.bind(null, id)} className="inline">
      <button
        type="submit"
        className="text-red-600 hover:text-red-900"
        onClick={(e) => {
          if (!confirm('¿Estás seguro de eliminar este cliente?')) e.preventDefault()
        }}
      >
        Borrar
      </button>
    </form>
  )
}
