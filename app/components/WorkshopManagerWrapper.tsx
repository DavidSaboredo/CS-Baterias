'use client'

import dynamic from 'next/dynamic'

const WorkshopManager = dynamic(() => import('./WorkshopManager'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-64 text-gray-500">Cargando gestión de taller...</div>
})

export default WorkshopManager
