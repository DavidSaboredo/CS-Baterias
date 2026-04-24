import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import DeleteSaleButton from '@/app/components/DeleteSaleButton'

export const dynamic = 'force-dynamic'

export default async function SalesPage() {
  let dbError: string | null = null
  let sales: any[] = []
  try {
    sales = await prisma.sale.findMany({
      include: {
        client: true,
        product: true,
      },
      orderBy: {
        date: 'desc',
      },
    })
  } catch (e: any) {
    dbError = e?.code === 'P1001' ? 'No se pudo conectar a la base de datos.' : 'Error al cargar ventas.'
    sales = []
  }

  return (
    <div>
      {dbError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {dbError}
        </div>
      )}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Ventas</h1>
        <Link
          href="/sales/new"
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors font-medium shadow-sm flex items-center gap-2"
        >
          + Nueva Venta
        </Link>
      </div>

      <div className="bg-white shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Serie</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Garantía</th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    No hay ventas registradas aún.
                  </td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(sale.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                      <Link href={`/clients/${sale.clientId}`}>
                        {sale.client.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sale.product.brand} {sale.product.model}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {sale.serialNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                      ${sale.price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                      {sale.warrantyDuration === 0 ? 'Sin garantía' : `${sale.warrantyDuration} meses`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        sale.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {sale.status === 'active' ? 'Activa' : 'Vencida'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center w-20">
                      <DeleteSaleButton 
                        saleId={sale.id} 
                        saleInfo={`${sale.product.brand} - SN: ${sale.serialNumber}`} 
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
