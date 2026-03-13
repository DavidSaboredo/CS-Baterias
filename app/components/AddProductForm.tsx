'use client';

import { addProduct } from '@/app/actions';
import { useRef, useState } from 'react';
import { Package, PlusCircle, CheckCircle2, AlertCircle } from 'lucide-react';
import { savePendingAction } from '@/lib/offline-db';

export default function AddProductForm() {
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
        type: 'STOCK',
        data
      });
      window.dispatchEvent(new CustomEvent('offline-action-saved'));
      setMessage({ type: 'offline', text: '¡Stock guardado localmente! Se sincronizará al recuperar internet.' });
      formRef.current?.reset();
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await addProduct(formData);
      if (result?.success) {
        setMessage({ type: 'success', text: '¡Producto guardado correctamente!' });
        formRef.current?.reset();
      } else {
        setMessage({ type: 'error', text: result?.error || 'Error al guardar el producto' });
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
        <Package className="w-5 h-5 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-800">Nuevo Producto</h2>
      </div>

      <form ref={formRef} action={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Marca *</label>
            <input type="text" name="brand" required className="w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500" placeholder="Ej: Moura" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Modelo *</label>
            <input type="text" name="model" required className="w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500" placeholder="Ej: M20GD" />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amperaje</label>
            <input type="text" name="amperage" className="w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500" placeholder="Ej: 65Ah" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Precio *</label>
            <div className="relative rounded-md shadow-sm">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input type="number" name="price" step="0.01" required className="block w-full rounded-md border-gray-300 pl-7 p-2 border focus:ring-blue-500 focus:border-blue-500" placeholder="0.00" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stock Inicial</label>
            <input type="number" name="stock" defaultValue={0} className="w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stock Mínimo</label>
            <input type="number" name="minStock" defaultValue={5} className="w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500" />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white px-4 py-3 rounded-xl hover:bg-blue-700 transition-all font-bold shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <PlusCircle className="w-5 h-5" />
              Guardar Producto
            </>
          )}
        </button>

        {/* Mensajes de feedback */}
        {message && (
          <div className={`mt-4 p-3 rounded-xl flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-top-2 ${
            message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {message.text}
          </div>
        )}
      </form>
    </div>
  );
}
