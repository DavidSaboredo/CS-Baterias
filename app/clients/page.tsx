import { prisma } from '@/lib/prisma'
import { Client } from '@prisma/client'
import { addClient, search } from '@/app/actions'
import DeleteClientForm from '@/app/components/DeleteClientForm'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  const query = q || ''
  
  const clients = await prisma.client.findMany({
    where: query ? {
      OR: [
        { name: { contains: query } },
        { licensePlate: { contains: query } },
      ],
    } : {},
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div>
      {/* Search Form */}
      <div className="mb-8">
        <form action={search} className="flex gap-2">
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Buscar por nombre o patente..."
            className="flex-1 rounded-md border-gray-300 shadow-sm p-2 border"
          />
          <button type="submit" className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-700">
            Buscar
          </button>
          {query && (
            <Link href="/clients" className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 flex items-center text-sm font-medium no-underline">
              Limpiar
            </Link>
          )}
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulario de Alta */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Nuevo Cliente</h2>
            <form action={addClient} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input type="text" name="name" required className="w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500" placeholder="Nombre completo" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input type="text" name="phone" className="w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500" placeholder="+54 9 ..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Patente / Matrícula</label>
                <input type="text" name="licensePlate" className="w-full rounded-md border-gray-300 shadow-sm p-2 border uppercase focus:ring-blue-500 focus:border-blue-500" placeholder="AA123BB" />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors font-medium shadow-sm">
                Guardar Cliente
              </button>
            </form>
          </div>
        </div>

        {/* Lista de Clientes */}
        <div className="lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              Clientes ({clients.length})
            </h2>
            {query && <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">Filtro: "{query}"</span>}
          </div>
          
          <div className="bg-white shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patente</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {clients.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                        {query ? 'No se encontraron clientes con ese criterio.' : 'No hay clientes registrados aún.'}
                      </td>
                    </tr>
                  ) : (
                    clients.map((client: Client) => (
                      <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link href={`/clients/${client.id}`} className="text-blue-600 hover:text-blue-900 font-medium">
                            {client.name}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 uppercase">{client.licensePlate || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{client.phone || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link href={`/edit/${client.id}`} className="text-indigo-600 hover:text-indigo-900 mr-4">
                            Editar
                          </Link>
                          <DeleteClientForm id={client.id} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
