'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <div className="lg:hidden p-2 bg-white border-b border-gray-200 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
           <img src="/logo.png" alt="CS Audio Logo" className="h-10 w-auto object-contain" />
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Drawer */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white transform transition-transform duration-300 ease-in-out lg:hidden ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar onNavigate={() => setIsOpen(false)} />
      </div>
    </>
  )
}
