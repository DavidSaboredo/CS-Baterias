import { prisma } from '@/lib/prisma'
import { updateClient } from '@/app/actions'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const client = await prisma.client.findUnique({
    where: { id: parseInt(id) },
  })

  if (!client) {
    redirect('/clients')
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">Editar Cliente</h2>
        <Link href="/clients" className="text-gray-600 hover:text-gray-900">
          &larr; Volver
        </Link>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 max-w-lg mx-auto">
        <form action={updateClient.bind(null, client.id)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
            <input
              type="text"
              name="name"
              defaultValue={client.name}
              required
              className="w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
            <input
              type="text"
              name="phone"
              defaultValue={client.phone || ''}
              className="w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Patente / Matrícula</label>
            <input
              type="text"
              name="licensePlate"
              defaultValue={client.licensePlate || ''}
              className="w-full rounded-md border-gray-300 shadow-sm p-2 border uppercase focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex gap-4 mt-6">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors font-medium shadow-sm"
            >
              Guardar Cambios
            </button>
            <Link
              href="/clients"
              className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200 transition-colors font-medium text-center"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
