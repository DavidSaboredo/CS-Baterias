'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle, Database } from 'lucide-react';
import { getPendingActions, deletePendingAction } from '@/lib/offline-db';
import { useRouter } from 'next/navigation';
import { addSale, addProduct, addClient } from '@/app/actions';

let pendingCountCache = 0;
const pendingCountListeners = new Set<() => void>();

function getPendingCountSnapshot() {
  return pendingCountCache;
}

function subscribePendingCount(listener: () => void) {
  pendingCountListeners.add(listener);
  return () => {
    pendingCountListeners.delete(listener);
  };
}

async function refreshPendingCount() {
  const actions = await getPendingActions();
  pendingCountCache = actions.length;
  pendingCountListeners.forEach((listener) => listener());
}

export default function OfflineActionsManager() {
  const pendingCount = useSyncExternalStore(
    subscribePendingCount,
    getPendingCountSnapshot,
    getPendingCountSnapshot,
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    void refreshPendingCount();
    // Listen for custom events when an action is saved
    const handleRefresh = () => {
      void refreshPendingCount();
    };
    window.addEventListener('offline-action-saved', handleRefresh);
    // Also check when connection is back
    window.addEventListener('online', handleRefresh);
    
    return () => {
      window.removeEventListener('offline-action-saved', handleRefresh);
      window.removeEventListener('online', handleRefresh);
    };
  }, []);

  const syncActions = async () => {
    if (isSyncing || pendingCount === 0) return;
    
    setIsSyncing(true);
    setError(null);
    
    try {
      const actions = await getPendingActions();
      
      for (const action of actions) {
        try {
          if (action.type === 'SALE') {
            const formData = new FormData();
            Object.entries(action.data).forEach(([key, value]) => {
              formData.append(key, value as string);
            });
            const clientId = parseInt(formData.get('clientId') as string);
            if (clientId) {
              const result = await addSale(clientId, formData);
              if (result?.success) {
                if (result.lowStock) {
                  alert(`¡Atención! El stock del producto bajó del mínimo (${result.stock} restantes)`);
                }
                await deletePendingAction(action.id);
              } else {
                throw new Error(result?.error || 'Error al sincronizar venta');
              }
            }
          } else if (action.type === 'STOCK') {
            const formData = new FormData();
            Object.entries(action.data).forEach(([key, value]) => {
              formData.append(key, value as string);
            });
            const result = await addProduct(formData);
            if (result?.success) {
              await deletePendingAction(action.id);
            } else {
              throw new Error(result?.error || 'Error al sincronizar stock');
            }
          } else if (action.type === 'CLIENT') {
            const formData = new FormData();
            Object.entries(action.data).forEach(([key, value]) => {
              formData.append(key, value as string);
            });
            const result = await addClient(formData);
            if (result?.success) {
              await deletePendingAction(action.id);
            } else {
              throw new Error(result?.error || 'Error al sincronizar cliente');
            }
          }
          // Add other action types here as we implement them
        } catch (e) {
          console.error('Error syncing action:', action.id, e);
          throw new Error('Error al sincronizar algunas acciones');
        }
      }
      
      await refreshPendingCount();
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Error de sincronización');
    } finally {
      setIsSyncing(false);
    }
  };

  if (pendingCount === 0 && !showToast) return null;

  return (
    <>
      <div className="fixed top-20 right-4 z-40">
        {pendingCount > 0 && (
          <button
            onClick={syncActions}
            disabled={isSyncing}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl shadow-lg border transition-all transform active:scale-95 ${
              isSyncing 
                ? 'bg-gray-100 text-gray-400 border-gray-200' 
                : 'bg-white text-red-600 border-red-100 hover:border-red-200'
            }`}
          >
            <Database className={`w-4 h-4 ${isSyncing ? 'animate-pulse' : ''}`} />
            <span className="text-sm font-bold">
              {isSyncing ? 'Sincronizando...' : `${pendingCount} pendiente(s)`}
            </span>
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {/* Sync Success Toast */}
      {showToast && (
        <div className="fixed top-20 right-4 z-40 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500 text-white shadow-lg border border-green-400">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-bold">¡Datos sincronizados!</span>
          </div>
        </div>
      )}

      {/* Sync Error Toast */}
      {error && (
        <div className="fixed top-20 right-4 z-40 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white shadow-lg border border-red-500">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-bold">{error}</span>
          </div>
        </div>
      )}
    </>
  );
}
