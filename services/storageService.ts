
import { VaultItem } from '../types';
import * as XLSX from 'xlsx';

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
      
      request.onsuccess = () => {
        // We wait for transaction oncomplete for full durability
      };
      request.onerror = () => {
        console.error("Store put error:", request.error);
        reject(request.error || new Error("Failed to put item in store"));
      };
      
      tx.oncomplete = () => resolve();
      tx.onerror = () => {
        console.error("Transaction error:", tx.error);
        reject(tx.error || new Error("Transaction failed"));
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

export const exportToExcel = async () => {
  const items = await getAllItems();
  
  // Flatten items for Excel
  const flattenedData = items.map(item => ({
    ID: item.id,
    Category: item.category,
    Title: item.title,
    SubTitle: item.subTitle,
    Year: item.year,
    Brand: item.brand,
    CardNumber: item.cardNumber,
    Significance: item.significance,
    Condition: item.manualCondition || item.condition,
    Rarity: item.rarity,
    EstimatedValue: item.estimatedValue,
    TrueValue: item.trueValue,
    DateAdded: item.dateAdded,
    LastValued: item.lastValued,
    Facts: item.facts.join('; '),
    InvestmentOutlook: item.investmentOutlook,
    LowValue: item.lowValue,
    HighValue: item.highValue
  }));

  const worksheet = XLSX.utils.json_to_sheet(flattenedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Vault Items");
  
  // Generate buffer and download
  XLSX.writeFile(workbook, `vault-export-${new Date().toISOString().split('T')[0]}.xlsx`);
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

export const getStorageEstimate = async () => {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage || 0,
      quota: estimate.quota || 0,
      percent: estimate.quota ? Math.round((estimate.usage || 0) / estimate.quota * 100) : 0
    };
  }
  return null;
};

export const repairCollection = async (onProgress?: (msg: string) => void) => {
  const items = await getAllItems();
  let repairedCount = 0;
  
  const resizeImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1000;
        let width = img.width;
        let height = img.height;
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.onerror = () => resolve(base64Str);
    });
  };

  const db = await getDB();
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    let changed = false;
    
    if (onProgress) onProgress(`Checking item ${i + 1} of ${items.length}...`);

    // 1. Ensure ID
    if (!item.id) {
      item.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
      changed = true;
    }
    
    // 2. Ensure Category
    if (!item.category) {
      item.category = 'other';
      changed = true;
    }
    
    // 3. Ensure required fields
    if (item.title === undefined) { item.title = 'Untitled'; changed = true; }
    if (item.estimatedValue === undefined) { item.estimatedValue = 0; changed = true; }
    if (!item.facts) { item.facts = []; changed = true; }
    
    // 4. Aggressive Image Resize (if image is huge)
    if (item.image && item.image.length > 400000) {
      if (onProgress) onProgress(`Optimizing image for ${item.title}...`);
      try {
        item.image = await resizeImage(item.image);
        changed = true;
      } catch (e) {
        console.error("Resize failed for", item.title, e);
      }
    }
    
    if (changed) {
      // Save each repaired item in its own transaction to prevent timeouts
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(item);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      repairedCount++;
    }
  }
  
  return repairedCount;
};

export const clearCategory = async (category: string) => {
  const items = await getAllItems();
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  
  const toDelete = items.filter(i => i.category === category);
  for (const item of toDelete) {
    store.delete(item.id);
  }
  
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};
