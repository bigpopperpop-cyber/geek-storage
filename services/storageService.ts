
import { VaultItem } from '../types';

const DB_NAME = 'VaultAIDB';
const STORE_NAME = 'vaultItems';

const getDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, 2);
      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.error("IndexedDB error:", request.error);
        reject(request.error || new Error("Unknown IndexedDB error"));
      };
      request.onblocked = () => {
        console.warn("IndexedDB blocked. Please close other tabs of this app.");
        reject(new Error("Database blocked. Please close other tabs and try again."));
      };
    } catch (err) {
      console.error("Failed to open IndexedDB:", err);
      reject(err);
    }
  });
};

export const saveItem = async (item: VaultItem) => {
  if (!item.id) {
    throw new Error("Cannot save item: Missing ID");
  }
  const db = await getDB();
  return new Promise<void>((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(item);
      
      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.error("Store put error:", request.error);
        reject(request.error);
      };
      
      tx.oncomplete = () => resolve();
      tx.onerror = () => {
        console.error("Transaction error:", tx.error);
        reject(tx.error);
      };
    } catch (err) {
      console.error("Failed to start transaction:", err);
      reject(err);
    }
  });
};

export const getAllItems = async (): Promise<VaultItem[]> => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const deleteItem = async (id: string) => {
  const db = await getDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const exportCollection = async () => {
  const items = await getAllItems();
  const data = JSON.stringify(items, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `vault-backup-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

export const importCollection = async (file: File): Promise<VaultItem[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const items = JSON.parse(e.target?.result as string) as VaultItem[];
        const db = await getDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        
        for (const item of items) {
          store.put(item);
        }
        
        tx.oncomplete = () => resolve(items);
        tx.onerror = () => reject(tx.error);
      } catch (err) {
        reject(new Error('Invalid backup file format.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsText(file);
  });
};
