'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Sidebar from "@/app/components/Sidebar"
import MobileNav from "@/app/components/MobileNav"
import InstallPrompt from "@/app/components/InstallPrompt"
import ConnectionStatus from "@/app/components/ConnectionStatus"
import OfflineActionsManager from "@/app/components/OfflineActionsManager"

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const isLoginPage = pathname === '/login'

  useEffect(() => {
    // Precargar páginas clave para que funcionen offline
    router.prefetch('/offline')
    router.prefetch('/sales')
    router.prefetch('/sales/new')
    router.prefetch('/stock')
    router.prefetch('/workshop')
    router.prefetch('/clients')
  }, [router])

  if (isLoginPage) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <InstallPrompt />
      <ConnectionStatus />
      <OfflineActionsManager />
      {/* Sidebar */}
      <aside className="w-64 fixed inset-y-0 left-0 z-50 hidden lg:block border-r border-gray-200 bg-white">
         <Sidebar />
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 lg:pl-64 min-h-screen w-full flex flex-col">
        <MobileNav />
        <div className="flex-1 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 w-full">
          {children}
        </div>
        <footer className="py-4 px-6 flex flex-col items-center justify-center text-center border-t border-gray-100 bg-white/50 backdrop-blur-sm mt-auto">
          {/* Logo / Title with Gradient - Minimalist */}
          <h2 className="text-lg font-black bg-gradient-to-r from-red-600 to-gray-800 bg-clip-text text-transparent mb-2 tracking-tight uppercase">
            CS Audio Baterías
          </h2>
          
          {/* Micro Divider */}
          <div className="w-8 h-0.5 bg-gradient-to-r from-red-600 to-gray-300 rounded-full mb-3 opacity-30"></div>
          
          <div className="space-y-0.5 text-gray-500 font-medium">
            <p className="text-[10px] sm:text-xs">
              Copyright © {new Date().getFullYear()} <span className="text-gray-900 font-bold tracking-wide">Laruzo</span>.
            </p>
            <p className="text-[9px] uppercase tracking-[0.3em] opacity-50">
              Todos los derechos reservados.
            </p>
            <p className="text-[10px] pt-2 text-gray-400">
              Diseño y desarrollo por <span className="text-red-600 font-bold hover:text-red-700 transition-colors cursor-default">Laruzo</span>
            </p>
          </div>
        </footer>
      </main>
    </div>
  )
}
