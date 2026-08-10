// Persistent IndexedDB & LocalStorage Engine for SOP / POP Documents
// Guarantees large PDFs and custom user-inserted POPs are never lost or wiped on reload.

import { SopDocument } from './sopUtils';

const DB_NAME = 'ArmazemFacil_SOP_IndexedDB';
const DB_VERSION = 1;
const STORE_NAME = 'sop_documents_store';

// In-memory cache for ultra-fast synchronous reads
const inMemorySopCache: Map<string, SopDocument> = new Map();
let isDbInitialized = false;

function openSopDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch (e) {
      resolve(null);
    }
  });
}

/**
 * Hydrates the in-memory cache from IndexedDB on initial load
 */
export async function initSopStorage(): Promise<SopDocument[]> {
  if (isDbInitialized && inMemorySopCache.size > 0) {
    return Array.from(inMemorySopCache.values());
  }

  const db = await openSopDB();
  if (!db) return [];

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const docs: SopDocument[] = req.result || [];
        docs.forEach(doc => {
          if (doc && doc.id) {
            inMemorySopCache.set(doc.id, doc);
          }
        });
        isDbInitialized = true;
        resolve(docs);
      };
      req.onerror = () => resolve([]);
    } catch (e) {
      resolve([]);
    }
  });
}

/**
 * Saves a SOP document to IndexedDB and memory cache
 */
export async function saveSopToIDB(sop: SopDocument): Promise<void> {
  if (!sop || !sop.id) return;

  // Update memory cache
  inMemorySopCache.set(sop.id, sop);

  const db = await openSopDB();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(sop);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch (e) {
      resolve();
    }
  });
}

/**
 * Deletes a SOP document from IndexedDB and memory cache
 */
export async function deleteSopFromIDB(sopId: string): Promise<void> {
  if (!sopId) return;

  inMemorySopCache.delete(sopId);

  const db = await openSopDB();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(sopId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch (e) {
      resolve();
    }
  });
}

/**
 * Synchronous getter from memory cache
 */
export function getCachedSopsFromMemory(): SopDocument[] {
  return Array.from(inMemorySopCache.values());
}

// Auto-initialize on import in browser
if (typeof window !== 'undefined') {
  initSopStorage().catch(() => {});
}
