'use client'

import dynamic from 'next/dynamic'

type AppointmentCalendarProps = {
  clients: Array<{ id: number; name: string; licensePlate: string | null }>
}

const AppointmentCalendar = dynamic<AppointmentCalendarProps>(() => import('./AppointmentCalendar'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-64 text-gray-500">Cargando calendario...</div>
})

export default function AppointmentCalendarWrapper(props: AppointmentCalendarProps) {
  return <AppointmentCalendar {...props} />
}
