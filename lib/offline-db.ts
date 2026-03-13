import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'cs-baterias-offline';
const STORE_NAME = 'pending-actions';

export interface PendingAction {
  id: string;
  type: 'SALE' | 'STOCK' | 'WORKSHOP' | 'CLIENT';
  data: any;
  timestamp: number;
}

export async function initDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });
}

export async function savePendingAction(action: Omit<PendingAction, 'id' | 'timestamp'>) {
  const db = await initDB();
  const id = crypto.randomUUID();
  const timestamp = Date.now();
  await db.put(STORE_NAME, { ...action, id, timestamp });
  return id;
}

export async function getPendingActions() {
  const db = await initDB();
  return db.getAll(STORE_NAME);
}

export async function deletePendingAction(id: string) {
  const db = await initDB();
  await db.delete(STORE_NAME, id);
}

export async function clearPendingActions() {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  await tx.objectStore(STORE_NAME).clear();
  await tx.done;
}
