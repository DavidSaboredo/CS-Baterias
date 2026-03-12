'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Sidebar from "@/app/components/Sidebar"
import MobileNav from "@/app/components/MobileNav"
import InstallPrompt from "@/app/components/InstallPrompt"

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const isLoginPage = pathname === '/login'

  useEffect(() => {
    // Prefetch offline page to ensure it's in the cache
    router.prefetch('/offline')
  }, [router])

  if (isLoginPage) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <InstallPrompt />
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
        <footer className="py-6 text-center text-gray-500 text-sm font-medium">
          <p>© {new Date().getFullYear()} Laruzo. Todos los derechos reservados.</p>
        </footer>
      </main>
    </div>
  )
}
