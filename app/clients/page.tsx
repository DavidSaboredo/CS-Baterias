import { prisma } from '@/lib/prisma'
import { Client } from '@prisma/client'
import { addClient, search } from '@/app/actions'
import DeleteClientForm from '@/app/components/DeleteClientForm'
import AddClientForm from '@/app/components/AddClientForm'
import Link from 'next/link'
import { getWhatsAppLink } from '@/lib/phone-utils'
import { redirect } from 'next/navigation'
import { getPrimaryButtonClasses, getSecondaryButtonClasses } from '@/lib/button-styles'

export const dynamic = 'force-dynamic'

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  const query = q || ''
  
  let dbError: string | null = null
  let clients: Client[] = []
  try {
    clients = await prisma.client.findMany({
      where: query ? {
        OR: [
          { name: { contains: query } },
          { licensePlate: { contains: query } },
        ],
      } : {},
      orderBy: { createdAt: 'desc' },
    })
  } catch (e: any) {
    const msg = (e?.message || '').toString()
    const isDbDown =
      e?.code === 'P1001' || e?.name === 'PrismaClientInitializationError' || msg.includes("Can't reach database server")
    const isMissingTables =
      e?.code === 'P2021' ||
      msg.toLowerCase().includes('relation') && msg.toLowerCase().includes('does not exist') ||
      msg.toLowerCase().includes('table') && msg.toLowerCase().includes('does not exist')
    console.error('[ClientsPage] prisma error', { code: e?.code, name: e?.name, message: msg })
    dbError = isDbDown
      ? 'No se pudo conectar a la base de datos.'
      : isMissingTables
        ? 'La base de datos no tiene las tablas/migraciones aplicadas.'
        : 'Error al cargar clientes.'
    clients = []
  }

  return (
    <div>
      {dbError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {dbError}
        </div>
      )}
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
          <button type="submit" className={getPrimaryButtonClasses({ color: 'gray', fullWidth: false, size: 'sm' })}>
            Buscar
          </button>
          {query && (
            <Link href="/clients" className={`${getSecondaryButtonClasses({ fullWidth: false, size: 'sm' })} no-underline`}>
              Limpiar
            </Link>
          )}
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulario de Alta */}
        <div className="lg:col-span-1">
          <AddClientForm />
        </div>

        {/* Lista de Clientes */}
        <div className="lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              Clientes ({clients.length})
            </h2>
            {query && (
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {`Filtro: "${query}"`}
              </span>
            )}
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
                    clients.map((client: Client) => {
                      const whatsappLink = getWhatsAppLink(client.phone)

                      return (
                      <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link href={`/clients/${client.id}`} className="text-blue-600 hover:text-blue-900 font-medium">
                            {client.name}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 uppercase">{client.licensePlate || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {whatsappLink ? (
                            <a
                              href={whatsappLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-700 hover:text-green-800 hover:underline"
                            >
                              {client.phone}
                            </a>
                          ) : (
                            client.phone || '-'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link href={`/edit/${client.id}`} className="text-indigo-600 hover:text-indigo-900 mr-4">
                            Editar
                          </Link>
                          <DeleteClientForm id={client.id} />
                        </td>
                      </tr>
                      )
                    })
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
