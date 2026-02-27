'use client'

import dynamic from 'next/dynamic'

const AppointmentCalendar = dynamic(() => import('./AppointmentCalendar'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-64 text-gray-500">Cargando calendario...</div>
})

export default AppointmentCalendar
