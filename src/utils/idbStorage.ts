/**
 * IndexedDB storage utility for large media items (layout images, uploaded PDFs, large base64 strings)
 * to prevent browser localStorage 5MB QuotaExceededErrors.
 */

const DB_NAME = 'ArmazemGuarabiraMediaDB';
const DB_VERSION = 1;
const STORE_NAME = 'media_store';

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };

    request.onerror = (event) => {
      console.warn('IndexedDB open failed:', (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });

  return dbPromise;
}

/**
 * Saves a string value or blob into IndexedDB with fallback to localStorage
 */
export async function setMediaItem(key: string, value: string): Promise<boolean> {
  // Always update memory/localStorage first if under size limit
  try {
    if (value.length < 500000) {
      localStorage.setItem(key, value);
    } else {
      // If large image, store a marker in localStorage so getters know it exists in IDB
      localStorage.setItem(`${key}_idb_flag`, 'true');
    }
  } catch (_) {
    // ignore localStorage quota error
  }

  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(value, key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch (e) {
    console.warn('IndexedDB setMediaItem failed:', e);
    return false;
  }
}

/**
 * Retrieves a media item from IndexedDB, falling back to localStorage
 */
export async function getMediaItem(key: string): Promise<string | null> {
  // Try IndexedDB first
  try {
    const db = await getDB();
    const valFromIDB = await new Promise<string | null>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });

    if (valFromIDB) return valFromIDB;
  } catch (_) {
    // fallback
  }

  // Fallback to standard localStorage
  try {
    return localStorage.getItem(key);
  } catch (_) {
    return null;
  }
}

/**
 * Removes a media item from IndexedDB and localStorage
 */
export async function removeMediaItem(key: string): Promise<void> {
  try {
    localStorage.removeItem(key);
    localStorage.removeItem(`${key}_idb_flag`);
  } catch (_) {}

  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(key);
  } catch (_) {}
}
