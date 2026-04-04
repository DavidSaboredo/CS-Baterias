import { prisma } from '@/lib/prisma'
import { ArrowUpRight, AlertTriangle, CheckCircle, Package, Users, ShoppingCart, CalendarClock, TrendingDown } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const ARGENTINA_TIMEZONE = 'America/Argentina/Buenos_Aires'
const ARGENTINA_OFFSET = '-03:00'

function getArgentinaTodayRange() {
  const now = new Date()
  const dateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ARGENTINA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)

  const year = dateParts.find((part) => part.type === 'year')?.value
  const month = dateParts.find((part) => part.type === 'month')?.value
  const day = dateParts.find((part) => part.type === 'day')?.value

  if (!year || !month || !day) {
    const fallbackStart = new Date()
    fallbackStart.setHours(0, 0, 0, 0)
    const fallbackEnd = new Date(fallbackStart)
    fallbackEnd.setDate(fallbackEnd.getDate() + 1)
    return { start: fallbackStart, end: fallbackEnd }
  }

  const start = new Date(`${year}-${month}-${day}T00:00:00${ARGENTINA_OFFSET}`)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 1)

  return { start, end }
}

export default async function Dashboard() {
  const { start: todayStart, end: todayEnd } = getArgentinaTodayRange()

  const [salesToday, activeWarranties, products, recentSales, appointmentsToday] = await Promise.all([
    prisma.sale.count({
      where: {
        date: {
          gte: todayStart,
          lt: todayEnd,
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
        id: true,
        brand: true,
        model: true,
        stock: true,
        minStock: true,
      },
      orderBy: [
        { stock: 'asc' },
        { brand: 'asc' },
      ],
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
    prisma.appointment.findMany({
      where: {
        startTime: {
          gte: todayStart,
          lt: todayEnd,
        },
      },
      include: {
        client: true,
      },
      orderBy: {
        startTime: 'asc',
      },
    }),
  ])

  const lowStockProducts = products.filter((p) => p.stock <= p.minStock)
  const lowStockCount = lowStockProducts.length
  const alertPreview = lowStockProducts.slice(0, 4)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="text-sm text-gray-500 capitalize">
          {new Date().toLocaleDateString('es-AR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: ARGENTINA_TIMEZONE,
          })}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Ventas Card */}
        <div className="bg-gradient-to-br from-green-50 to-white p-6 rounded-2xl shadow-sm border border-green-100 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Ventas Hoy</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-2">{salesToday}</h3>
            </div>
            <div className="p-2.5 bg-white rounded-xl border border-green-100 shadow-sm">
              <ArrowUpRight className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <div className="mt-4 inline-flex items-center text-xs font-medium text-green-700 bg-green-100/70 px-2.5 py-1 rounded-full">
            Registradas hoy
          </div>
        </div>

        {/* Garantías Card */}
        <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-2xl shadow-sm border border-blue-100 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Garantías Activas</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-2">{activeWarranties}</h3>
            </div>
            <div className="p-2.5 bg-white rounded-xl border border-blue-100 shadow-sm">
              <CheckCircle className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 inline-flex items-center text-xs font-medium text-blue-700 bg-blue-100/70 px-2.5 py-1 rounded-full">
            Total registradas
          </div>
        </div>

        {/* Alertas Card */}
        <div className={`p-6 rounded-2xl shadow-sm border hover:shadow-md transition-shadow ${
          lowStockCount > 0
            ? 'bg-gradient-to-br from-red-50 to-white border-red-100'
            : 'bg-gradient-to-br from-gray-50 to-white border-gray-200'
        }`}>
          <div className="flex justify-between items-start gap-3">
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wide ${lowStockCount > 0 ? 'text-red-700' : 'text-gray-600'}`}>
                Alertas Stock
              </p>
              <h3 className={`text-3xl font-bold mt-2 ${lowStockCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {lowStockCount}
              </h3>
            </div>
            <div className={`p-2.5 bg-white rounded-xl border shadow-sm ${lowStockCount > 0 ? 'border-red-100' : 'border-gray-200'}`}>
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
          </div>
          <div className={`mt-4 inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ${
            lowStockCount > 0
              ? 'text-red-700 bg-red-100/80'
              : 'text-gray-600 bg-gray-100'
          }`}>
            {lowStockCount > 0 ? 'Productos bajo mínimo' : 'Sin alertas de stock'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-blue-50/70 to-white">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Turnos de Hoy</h2>
            </div>
            <Link href="/appointments" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Ver agenda
            </Link>
          </div>
          <div className="p-6 space-y-3">
            {appointmentsToday.length === 0 ? (
              <p className="text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                No hay turnos cargados para hoy.
              </p>
            ) : (
              appointmentsToday.map((appointment) => (
                <div key={appointment.id} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 hover:bg-blue-50/40 transition-colors">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-gray-900">{appointment.client.name}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(appointment.startTime).toLocaleTimeString('es-AR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: ARGENTINA_TIMEZONE,
                      })}
                      {' - '}
                      {new Date(appointment.endTime).toLocaleTimeString('es-AR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: ARGENTINA_TIMEZONE,
                      })}
                    </p>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{appointment.reason}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-red-50/70 to-white">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h2 className="text-lg font-semibold text-gray-900">Alerta de Stock Bajo</h2>
            </div>
            <Link href="/stock" className="text-sm text-red-600 hover:text-red-700 font-medium">
              Gestionar stock
            </Link>
          </div>
          <div className="p-6 space-y-3">
            {lowStockCount === 0 ? (
              <p className="text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                No hay productos bajo mínimo.
              </p>
            ) : (
              <>
                <p className="text-sm text-red-700 font-medium">{lowStockCount} alertas:</p>
                {alertPreview.map((product) => (
                  <div key={product.id} className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 hover:bg-red-100/60 transition-colors">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-red-900">
                        {product.brand} {product.model}
                      </p>
                      <p className="text-sm font-semibold text-red-700">
                        {product.stock}/{product.minStock}
                      </p>
                    </div>
                  </div>
                ))}
                {lowStockCount > alertPreview.length && (
                  <p className="text-xs text-gray-500">
                    Mostrando {alertPreview.length} de {lowStockCount} alertas.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Recent Sales & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Sales Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white">
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
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Acciones Rápidas</h2>
          <div className="space-y-4">
            <Link 
              href="/sales/new" 
              className="flex items-center p-4 bg-gray-50 rounded-xl border border-gray-100 hover:bg-green-50 hover:border-green-100 transition-colors group"
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
              className="flex items-center p-4 bg-gray-50 rounded-xl border border-gray-100 hover:bg-blue-50 hover:border-blue-100 transition-colors group"
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
              className="flex items-center p-4 bg-gray-50 rounded-xl border border-gray-100 hover:bg-amber-50 hover:border-amber-100 transition-colors group"
            >
              <div className="p-3 bg-white rounded-lg shadow-sm group-hover:shadow-md transition-shadow">
                <Package className="w-6 h-6 text-amber-600" />
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
      {/* Widget de Alertas de Precios - Solo visible si hay variación >15% */}
      <div className="bg-white rounded-2xl shadow-sm border border-orange-100 bg-gradient-to-r from-orange-50/70 to-white overflow-hidden">
        <div className="p-6 border-b border-orange-100 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-orange-600" />
            <h2 className="text-lg font-semibold text-gray-900">Monitor de Precios</h2>
          </div>
          <Link href="/admin/price-monitor" className="text-sm text-orange-600 hover:text-orange-700 font-medium">
            Ver detalles
          </Link>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            Sistema de monitoreo de precios con competencia. Analiza variaciones mayores al 15% de nuestros precios.
          </p>
          <div className="flex items-center gap-3 rounded-lg bg-blue-50 border border-blue-100 px-4 py-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">Sistema activo y listo</p>
              <p className="text-xs text-blue-700 mt-1">Agrega fuentes en el Monitor de Precios para comenzar</p>
            </div>
            <Link 
              href="/admin/price-monitor" 
              className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors whitespace-nowrap"
            >
              Configurar →
            </Link>
          </div>
        </div>
      </div>
}
