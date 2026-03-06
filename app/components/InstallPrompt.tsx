'use client'

import { useState, useEffect } from 'react'
import { X, Download, Share, PlusSquare } from 'lucide-react'

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)

  useEffect(() => {
    // If the event fires after we showed instructions, switch back to button
    if (deferredPrompt) {
      setShowInstructions(false)
    }
  }, [deferredPrompt])

  useEffect(() => {
    // Detect Mobile
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isMobileDevice = /iphone|ipad|ipod|android|blackberry|mini|windows\sce|palm/i.test(userAgent)
    setIsMobile(isMobileDevice)

    // Detect iOS
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent)
    setIsIOS(isIosDevice)

    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true
    if (isStandalone) {
      return
    }

    // Always show prompt on mobile if not installed (fallback if event missed)
    if (isMobileDevice && !isStandalone) {
      // Small delay to allow browser to fire event first if possible
      setTimeout(() => setShowPrompt(true), 2000)
    }

    // Register service worker for PWA installability
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => console.log('SW registered: ', registration))
        .catch((error) => console.log('SW registration failed: ', error))
    }

    const handler = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault()
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e)
      // Update UI notify the user they can install the PWA
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Show the install prompt
      deferredPrompt.prompt()
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice
      // Optionally, send analytics event with outcome of user choice
      if (outcome === 'accepted') {
        setDeferredPrompt(null)
        setShowPrompt(false)
      }
    } else {
      // Fallback if no deferred prompt (e.g. manual trigger or event missed)
      setShowInstructions(true)
    }
  }

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white p-4 rounded-xl shadow-lg border border-gray-200 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="flex items-start gap-4">
        <div className="bg-red-100 p-2 rounded-lg text-red-600">
          <Download className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">Instalar App</h3>
          <p className="text-sm text-gray-500 mt-1">
            Instala la aplicación para un acceso más rápido y mejor experiencia.
          </p>
          
          {isIOS || showInstructions ? (
            <div className="mt-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
              {isIOS ? (
                <>
                  <p className="flex items-center gap-2 mb-2">
                    1. Toca el botón compartir <Share className="w-4 h-4 inline" />
                  </p>
                  <p className="flex items-center gap-2">
                    2. Selecciona "Agregar al inicio" <PlusSquare className="w-4 h-4 inline" />
                  </p>
                </>
              ) : (
                <>
                  <p className="mb-2 font-medium text-gray-900">Instalación manual:</p>
                  <p className="flex items-center gap-2 mb-2">
                    1. Toca el menú del navegador (⋮)
                  </p>
                  <p className="flex items-center gap-2">
                    2. Selecciona "Instalar aplicación" o "Agregar a la pantalla principal"
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="flex gap-3 mt-3">
              <button
                onClick={handleInstallClick}
                className="flex-1 bg-red-600 text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
              >
                Instalar
              </button>
              <button
                onClick={() => setShowPrompt(false)}
                className="flex-1 bg-gray-100 text-gray-700 text-sm font-medium py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Ahora no
              </button>
            </div>
          )}
        </div>
        <button 
          onClick={() => setShowPrompt(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
