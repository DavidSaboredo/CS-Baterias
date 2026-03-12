import { prisma } from '@/lib/prisma'
import { ArrowUpRight, AlertTriangle, CheckCircle, Package, Users, ShoppingCart } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function Dashboard() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [salesToday, activeWarranties, products, recentSales] = await Promise.all([
    prisma.sale.count({
      where: {
        date: {
          gte: today,
        },
      },
    }),
    prisma.sale.count({
      where: {
        status: 'active',
      },
    }),
    prisma.product.findMany({
      select: {
        stock: true,
        minStock: true,
      },
    }),
    prisma.sale.findMany({
      take: 5,
      orderBy: {
        date: 'desc',
      },
      include: {
        client: true,
        product: true,
      },
    }),
  ])

  const lowStockProducts = products.filter(p => p.stock <= p.minStock).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="text-sm text-gray-500 capitalize">
          {new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Ventas Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Ventas Hoy</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-2">{salesToday}</h3>
            </div>
            <div className="p-2 bg-green-50 rounded-lg">
              <ArrowUpRight className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-green-600">
            <span>Registradas hoy</span>
          </div>
        </div>

        {/* Garantías Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Garantías Activas</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-2">{activeWarranties}</h3>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-500">
            <span>Total registradas</span>
          </div>
        </div>

        {/* Alertas Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Alertas Stock</p>
              <h3 className={`text-3xl font-bold mt-2 ${lowStockProducts > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {lowStockProducts}
              </h3>
            </div>
            <div className="p-2 bg-red-50 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-red-600">
            <span>Productos bajo mínimo</span>
          </div>
        </div>
      </div>

      {/* Recent Sales & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Sales Table */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Ventas Recientes</h2>
            <Link href="/sales" className="text-sm text-red-600 hover:text-red-700 font-medium">
              Ver todas
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                <tr>
                  <th className="px-6 py-3">Cliente</th>
                  <th className="px-6 py-3">Producto</th>
                  <th className="px-6 py-3">Fecha</th>
                  <th className="px-6 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentSales.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                      No hay ventas registradas aún.
                    </td>
                  </tr>
                ) : (
                  recentSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        <Link href={`/clients/${sale.clientId}`} className="hover:underline">
                          {sale.client.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {sale.product.brand} {sale.product.model}
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {new Date(sale.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          sale.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
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

        {/* Quick Action: New Sale */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Acciones Rápidas</h2>
          <div className="space-y-4">
            <Link 
              href="/sales/new" 
              className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
            >
              <div className="p-3 bg-white rounded-lg shadow-sm group-hover:shadow-md transition-shadow">
                <ShoppingCart className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="font-medium text-gray-900">Nueva Venta</p>
                <p className="text-sm text-gray-500">Registrar una venta y garantía</p>
              </div>
            </Link>

            <Link 
              href="/clients" 
              className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
            >
              <div className="p-3 bg-white rounded-lg shadow-sm group-hover:shadow-md transition-shadow">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="font-medium text-gray-900">Nuevo Cliente</p>
                <p className="text-sm text-gray-500">Dar de alta un nuevo cliente</p>
              </div>
            </Link>

            <Link 
              href="/stock" 
              className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
            >
              <div className="p-3 bg-white rounded-lg shadow-sm group-hover:shadow-md transition-shadow">
                <Package className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="font-medium text-gray-900">Gestionar Stock</p>
                <p className="text-sm text-gray-500">Actualizar inventario</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
