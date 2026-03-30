'use client';

import { addClient } from '@/app/actions';
import { useRef, useState } from 'react';
import { UserPlus, CheckCircle2, AlertCircle } from 'lucide-react';
import { savePendingAction } from '@/lib/offline-db';
import { getPrimaryButtonClasses } from '@/lib/button-styles';

export default function AddClientForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'offline', text: string } | null>(null);

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setMessage(null);
    
    // Check if offline
    if (!navigator.onLine) {
      const data = Object.fromEntries(formData.entries());
      await savePendingAction({
        type: 'CLIENT',
        data
      });
      window.dispatchEvent(new CustomEvent('offline-action-saved'));
      setMessage({ type: 'offline', text: '¡Cliente guardado localmente! Se sincronizará al recuperar internet.' });
      formRef.current?.reset();
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await addClient(formData);
      if (result?.success) {
        setMessage({ type: 'success', text: '¡Cliente guardado correctamente!' });
        formRef.current?.reset();
      } else {
        setMessage({ type: 'error', text: result?.error || 'Error al guardar el cliente' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de conexión' });
    } finally {
      setIsSubmitting(false);
      // Ocultar mensaje después de 5 segundos
      setTimeout(() => setMessage(null), 5000);
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center gap-2 mb-6">
        <UserPlus className="w-5 h-5 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-800">Nuevo Cliente</h2>
      </div>

      <form ref={formRef} action={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
          <input 
            type="text" 
            name="name" 
            required 
            className="w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500" 
            placeholder="Nombre completo" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
          <input 
            type="text" 
            name="phone" 
            className="w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500" 
            placeholder="+54 9 ..." 
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Patente / Matrícula</label>
          <input 
            type="text" 
            name="licensePlate" 
            className="w-full rounded-md border-gray-300 shadow-sm p-2 border uppercase focus:ring-blue-500 focus:border-blue-500" 
            placeholder="AA123BB" 
          />
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting}
          className={getPrimaryButtonClasses({ color: 'blue', disabled: isSubmitting })}
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <UserPlus className="w-5 h-5" />
              Guardar Cliente
            </>
          )}
        </button>

        {/* Mensajes de feedback */}
        {message && (
          <div className={`mt-4 p-3 rounded-xl flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-top-2 ${
            message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 
            message.type === 'offline' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
            'bg-red-50 text-red-700 border border-red-100'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : 
             message.type === 'offline' ? <CheckCircle2 className="w-4 h-4" /> :
             <AlertCircle className="w-4 h-4" />}
            {message.text}
          </div>
        )}
      </form>
    </div>
  );
}
