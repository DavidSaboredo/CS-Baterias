'use client';

import { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export default function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(() => (typeof window === 'undefined' ? true : navigator.onLine));
  const [show, setShow] = useState(() => (typeof window === 'undefined' ? false : !navigator.onLine));

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const handleOnline = () => {
      setIsOnline(true);
      // Show for 3 seconds then hide
      setShow(true);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setShow(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShow(true);
      if (timer) clearTimeout(timer);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!show && isOnline) return null;

  return (
    <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 transform ${show ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
      <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl shadow-2xl border ${
        isOnline 
          ? 'bg-green-500 text-white border-green-400' 
          : 'bg-red-600 text-white border-red-500'
      }`}>
        {isOnline ? (
          <>
            <Wifi className="w-5 h-5 animate-pulse" />
            <span className="font-bold text-sm">¡Conexión recuperada!</span>
          </>
        ) : (
          <>
            <WifiOff className="w-5 h-5" />
            <span className="font-bold text-sm">Sin internet - Modo Offline</span>
          </>
        )}
      </div>
    </div>
  );
}
