import { prisma } from '@/lib/prisma'
import WorkshopManagerWrapper from '@/app/components/WorkshopManagerWrapper'

export const dynamic = 'force-dynamic'

export default async function WorkshopPage() {
  let dbError: string | null = null
  let clients: any[] = []
  try {
    clients = await prisma.client.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        phone: true,
        licensePlate: true,
      }
    })
  } catch (e: any) {
    dbError = e?.code === 'P1001' ? 'No se pudo conectar a la base de datos.' : 'Error al cargar datos.'
    clients = []
  }
  return (
    <div className="space-y-6">
      {dbError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {dbError}
        </div>
      )}
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
