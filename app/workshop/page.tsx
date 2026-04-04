import { prisma } from '@/lib/prisma'
import WorkshopManagerWrapper from '@/app/components/WorkshopManagerWrapper'

export const dynamic = 'force-dynamic'

export default async function WorkshopPage() {
  const clients = await prisma.client.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      phone: true,
      licensePlate: true,
      // Exclude dates to avoid serialization issues with Client Components
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Servicios</h1>
          <p className="text-gray-500 mt-1">Generar presupuestos, órdenes de servicio y recibos</p>
        </div>
      </div>

      <WorkshopManagerWrapper clients={clients} />
    </div>
  )
}
