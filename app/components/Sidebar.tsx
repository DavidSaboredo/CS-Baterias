'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, ShoppingCart, Package, FileText, LogOut, Wrench, Calendar } from 'lucide-react'
import { logout } from '@/app/actions'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Turnos', href: '/appointments', icon: Calendar },
  { name: 'Clientes', href: '/clients', icon: Users },
  { name: 'Ventas', href: '/sales', icon: ShoppingCart },
  { name: 'Stock', href: '/stock', icon: Package },
  { name: 'Servicios', href: '/workshop', icon: Wrench },
  { name: 'Reportes', href: '/reports', icon: FileText },
]

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex-1 flex justify-center">
          <img src="/logo.png" alt="CS Audio Logo" className="h-16 w-auto object-contain" />
        </div>
        {onNavigate && (
          <button 
            onClick={onNavigate}
            className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-md"
          >
            <span className="sr-only">Cerrar menú</span>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? 'bg-gray-100 text-gray-900 border-l-4 border-red-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon className={`w-5 h-5 mr-3 ${isActive ? 'text-red-600' : 'text-gray-400'}`} />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
              <Users className="w-4 h-4 text-gray-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Salvador</p>
              <p className="text-xs text-gray-500">Propietario</p>
            </div>
          </div>
          <form action={logout}>
            <button 
              type="submit"
              className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-full hover:bg-gray-100"
              title="Cerrar Sesión"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>

      <div className="p-4 pt-0">
        <img src="/Banner.png" alt="Publicidad" className="w-full h-auto rounded-xl object-cover" />
      </div>
    </div>
  )
}
