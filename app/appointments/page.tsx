import { prisma } from '@/lib/prisma'
import AppointmentCalendarWrapper from '@/app/components/AppointmentCalendarWrapper'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AppointmentsPage() {
  let dbError: string | null = null
  let clients: any[] = []
  try {
    clients = await prisma.client.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        licensePlate: true,
      }
    })
  } catch (e: any) {
    const msg = (e?.message || '').toString()
    const isDbDown =
      e?.code === 'P1001' || e?.name === 'PrismaClientInitializationError' || msg.includes("Can't reach database server")
    dbError = isDbDown ? 'No se pudo conectar a la base de datos.' : 'Error al cargar turnos.'
    clients = []
  }

  return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Turnos</h1>
            <p className="text-gray-500 mt-1">Agenda de instalaciones y revisiones</p>
          </div>
        </div>

        {dbError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-900">
            <div className="text-lg font-bold">No se pudo cargar la agenda</div>
            <div className="mt-1 text-sm text-red-800">{dbError}</div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/appointments"
                className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Reintentar
              </Link>
              <Link
                href="/offline"
                className="inline-flex items-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-red-700 border border-red-200 hover:bg-red-50"
              >
                Ir a modo offline
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white p-2 md:p-6 rounded-lg shadow-sm border border-gray-200">
            <AppointmentCalendarWrapper clients={clients} />
          </div>
        )}
    </div>
  )
}
