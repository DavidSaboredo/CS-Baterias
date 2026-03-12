"use client";

import React from 'react';
import { WifiOff } from 'lucide-react';
import Link from 'next/link';

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4 text-center">
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full border border-gray-100">
        <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <WifiOff className="w-10 h-10 text-red-500" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Estás sin conexión
        </h1>
        
        <p className="text-gray-600 mb-8 leading-relaxed">
          Parece que no tienes acceso a internet en este momento. Algunas funciones pueden no estar disponibles, pero puedes seguir viendo los datos guardados en caché.
        </p>
        
        <div className="space-y-4">
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-sm active:scale-95"
          >
            Reintentar conexión
          </button>
          
          <Link 
            href="/"
            className="block w-full text-red-600 hover:text-red-700 font-medium py-2 transition-colors"
          >
            Volver al Inicio
          </Link>
        </div>
      </div>
      
      <p className="mt-8 text-sm text-gray-400">
        CS Audio Baterías - Modo Offline
      </p>
    </div>
  );
}
