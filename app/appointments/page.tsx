import { prisma } from '@/lib/prisma'
import AppointmentCalendarWrapper from '@/app/components/AppointmentCalendarWrapper'

export const dynamic = 'force-dynamic'

export default async function AppointmentsPage() {
  const clients = await prisma.client.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      licensePlate: true,
    }
  })

  return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Turnos</h1>
            <p className="text-gray-500 mt-1">Agenda de instalaciones y revisiones</p>
          </div>
        </div>

        <div className="bg-white p-2 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <AppointmentCalendarWrapper clients={clients} />
      </div>
    </div>
  )
}
