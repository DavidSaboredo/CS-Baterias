"use client";

import React from 'react';
import { WifiOff } from 'lucide-react';
import Link from 'next/link';

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#121212] px-6 text-center">
      <div className="max-w-sm w-full">
        {/* Logo con resplandor suave */}
        <div className="relative mb-10">
          <div className="absolute inset-0 bg-red-600 blur-3xl opacity-10 rounded-full"></div>
          <img 
            src="/logo.png" 
            alt="CS Audio" 
            className="w-32 h-32 mx-auto relative z-10 drop-shadow-2xl"
          />
        </div>
        
        <div className="space-y-3 mb-10">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Sin conexión
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Parece que perdiste la señal. No te preocupes, puedes seguir navegando por las secciones que ya visitaste.
          </p>
        </div>
        
        <div className="space-y-4">
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-200 shadow-lg shadow-red-900/20 active:scale-95 flex items-center justify-center gap-3"
          >
            <WifiOff className="w-5 h-5" />
            Reintentar ahora
          </button>
          
          <Link 
            href="/"
            className="block w-full bg-white/5 hover:bg-white/10 text-gray-300 font-medium py-4 px-8 rounded-2xl transition-all border border-white/10"
          >
            Ir al Inicio
          </Link>
        </div>
      </div>
      
      <div className="absolute bottom-8 text-gray-600 text-xs font-medium tracking-widest uppercase">
        Modo Offline Activo
      </div>
    </div>
  );
}
