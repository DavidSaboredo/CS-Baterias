import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
  const now = new Date()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  
  // Get sales for this month
  const salesThisMonth = await prisma.sale.findMany({
    where: {
      date: {
        gte: firstDayOfMonth,
        lt: nextMonth,
      },
    },
    include: {
      product: true,
    },
  })

  const totalRevenue = salesThisMonth.reduce((sum, sale) => sum + sale.price, 0)
  const totalSalesCount = salesThisMonth.length

  // Calculate sales by product
  const salesByProduct = salesThisMonth.reduce((acc, sale) => {
    const key = `${sale.product.brand} ${sale.product.model}`
    if (!acc[key]) {
      acc[key] = { count: 0, revenue: 0, name: key }
    }
    acc[key].count += 1
    acc[key].revenue += sale.price
    return acc
  }, {} as Record<string, { count: number, revenue: number, name: string }>)

  const topProducts = Object.values(salesByProduct).sort((a, b) => b.count - a.count)

  // Get warranties expiring in next 30 days
  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
  
  const activeSales = await prisma.sale.findMany({
    where: { status: 'active' },
    select: {
      id: true,
      date: true,
      warrantyDuration: true,
      client: {
        select: { name: true }
      },
      product: {
        select: { brand: true, model: true }
      }
    }
  })

  const expiringWarranties = activeSales.filter(sale => {
    const saleDate = new Date(sale.date)
    const expirationDate = new Date(saleDate)
    expirationDate.setMonth(expirationDate.getMonth() + sale.warrantyDuration)
    return expirationDate <= thirtyDaysFromNow && expirationDate >= now
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Reportes</h1>
        <div className="text-sm text-gray-500">
          {now.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* Monthly Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-gray-500 text-sm font-medium">Ventas del Mes</h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">${totalRevenue.toFixed(2)}</span>
            <span className="text-sm text-gray-500">({totalSalesCount} ventas)</span>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-gray-500 text-sm font-medium">Garantías por Vencer (30 días)</h3>
          <div className="mt-2">
            <span className="text-3xl font-bold text-orange-600">{expiringWarranties.length}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Products */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Productos Más Vendidos</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                <tr>
                  <th className="px-6 py-3">Producto</th>
                  <th className="px-6 py-3 text-right">Cant.</th>
                  <th className="px-6 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {topProducts.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                      No hay datos este mes.
                    </td>
                  </tr>
                ) : (
                  topProducts.map((product) => (
                    <tr key={product.name} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{product.name}</td>
                      <td className="px-6 py-4 text-right">{product.count}</td>
                      <td className="px-6 py-4 text-right">${product.revenue.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Expiring Warranties List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Próximos Vencimientos</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                <tr>
                  <th className="px-6 py-3">Cliente</th>
                  <th className="px-6 py-3">Producto</th>
                  <th className="px-6 py-3">Vence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {expiringWarranties.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                      No hay vencimientos próximos.
                    </td>
                  </tr>
                ) : (
                  expiringWarranties.map((sale) => {
                    const expirationDate = new Date(sale.date)
                    expirationDate.setMonth(expirationDate.getMonth() + sale.warrantyDuration)
                    return (
                      <tr key={sale.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{sale.client.name}</td>
                        <td className="px-6 py-4 text-gray-500">{sale.product.brand} {sale.product.model}</td>
                        <td className="px-6 py-4 text-orange-600 font-medium">
                          {expirationDate.toLocaleDateString('es-AR')}
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
  )
}
