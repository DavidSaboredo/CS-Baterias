import { prisma } from '@/lib/prisma'
import { addSale } from '@/app/actions'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const clientId = parseInt(id)

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      sales: {
        include: { product: true },
        orderBy: { date: 'desc' },
      },
    },
  })

  const products = await prisma.product.findMany({
    orderBy: { brand: 'asc' },
  })

  if (!client) {
    redirect('/')
  }

  const totalSales = client.sales.reduce((sum, sale) => sum + sale.price, 0)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">Detalle del Cliente</h2>
        <Link href="/" className="text-gray-600 hover:text-gray-900">
          &larr; Volver
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Info del Cliente y Nueva Venta */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Información</h3>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-500 block">Nombre</span>
                <span className="font-medium">{client.name}</span>
              </div>
              <div>
                <span className="text-sm text-gray-500 block">Teléfono</span>
                <span className="font-medium">{client.phone || '-'}</span>
              </div>
              <div>
                <span className="text-sm text-gray-500 block">Patente</span>
                <span className="font-medium uppercase">{client.licensePlate || '-'}</span>
              </div>
              <div className="pt-2 border-t mt-2">
                 <span className="text-sm text-gray-500 block">Total Compras</span>
                 <span className="font-bold text-green-600 text-lg">${totalSales.toFixed(2)}</span>
              </div>
            </div>
             <div className="mt-4 pt-4 border-t">
                <Link 
                  href={`/edit/${client.id}`}
                  className="block w-full text-center bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200 transition-colors"
                >
                  Editar Cliente
                </Link>
             </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Registrar Venta</h3>
            <form 
              action={async (formData: FormData) => {
                'use server'
                await addSale(client.id, formData)
                redirect('/sales')
              }} 
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Producto *</label>
                <select 
                  name="productId" 
                  required 
                  className="w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Seleccionar batería...</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.brand} {product.model} - {product.amperage}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número de Serie *</label>
                <input
                  type="text"
                  name="serialNumber"
                  required
                  className="w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
                  placeholder="SN..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio *</label>
                <div className="relative rounded-md shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    name="price"
                    step="0.01"
                    required
                    className="block w-full rounded-md border-gray-300 pl-7 p-2 border focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Garantía (meses)</label>
                <input
                  type="number"
                  name="warrantyDuration"
                  defaultValue={12}
                  className="w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors font-medium shadow-sm"
              >
                Registrar Venta
              </button>
            </form>
          </div>
        </div>

        {/* Historial de Compras */}
        <div className="lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Historial de Compras</h3>
          <div className="bg-white shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Serie</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {client.sales.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      Este cliente no tiene compras registradas.
                    </td>
                  </tr>
                ) : (
                  client.sales.map((sale) => (
                    <tr key={sale.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(sale.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {sale.product.brand} {sale.product.model}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {sale.serialNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        ${sale.price.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          sale.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {sale.status === 'active' ? 'Activa' : 'Vencida'}
                        </span>
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
  )
}
