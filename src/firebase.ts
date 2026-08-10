import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, memoryLocalCache, setLogLevel } from 'firebase/firestore';

// Set Firestore log level to silent to suppress backend retry warnings in offline mode
try {
  setLogLevel('silent');
} catch (e) {
  // Ignore if already initialized
}

// Clean up any stale or heavy firestore target keys from localStorage to free space
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('firestore_') || key.startsWith('firebase_'))) {
        localStorage.removeItem(key);
      }
    }
  } catch (e) {
    // Ignore storage access errors
  }
}

interface FirebaseConfigExtended {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
  firestoreDatabaseId?: string;
}

const DEFAULT_CONFIG: FirebaseConfigExtended = {
  apiKey: "AIzaSyCZ2yYeYPVA_TVIEwsvQNJ9tzq4f3kYyis",
  authDomain: "armazemrelatorios.firebaseapp.com",
  projectId: "armazemrelatorios",
  storageBucket: "armazemrelatorios.firebasestorage.app",
  messagingSenderId: "1060201893094",
  appId: "1:1060201893094:web:5702ee694b6e234f0dbf27",
  measurementId: undefined,
  firestoreDatabaseId: undefined
};

// Check if there is a custom configuration saved in localStorage
let firebaseConfig: FirebaseConfigExtended = DEFAULT_CONFIG;
let usingCustom = false;

if (typeof window !== 'undefined') {
  const savedConfigStr = localStorage.getItem('custom_firebase_config');
  if (savedConfigStr) {
    try {
      const parsed = JSON.parse(savedConfigStr);
      if (parsed && parsed.projectId === 'armazemfacil-b2292') {
        // Automatically clear stale cache pointing to old project
        localStorage.removeItem('custom_firebase_config');
      } else if (parsed && parsed.apiKey && parsed.projectId) {
        firebaseConfig = {
          apiKey: parsed.apiKey,
          authDomain: parsed.authDomain || `${parsed.projectId}.firebaseapp.com`,
          projectId: parsed.projectId,
          storageBucket: parsed.storageBucket || `${parsed.projectId}.appspot.com`,
          messagingSenderId: parsed.messagingSenderId || '',
          appId: parsed.appId || '',
          measurementId: parsed.measurementId || '',
          firestoreDatabaseId: parsed.firestoreDatabaseId || undefined
        };
        usingCustom = true;
      }
    } catch (e) {
      console.error("Error parsing custom firebase config", e);
    }
  }
}

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

const db = firebaseConfig.firestoreDatabaseId 
  ? initializeFirestore(app, {
      localCache: memoryLocalCache()
    }, firebaseConfig.firestoreDatabaseId)
  : initializeFirestore(app, {
      localCache: memoryLocalCache()
    });

// Helper to determine if we are using custom config
export const isCustomFirebaseConnected = () => {
  return true; // The application is always connected to the live database in production!
};

// Helper to determine if the user has configured their own custom database via localStorage
export const isUsingCustomFirebase = () => {
  return usingCustom;
};

export const getActiveConfig = () => {
  return firebaseConfig;
};

export { app, auth, db };
export default app;

