import {
  collection,
  query,
  where,
  getDocsFromCache,
  getDocsFromServer,
  getDocs,
  onSnapshot,
  Timestamp,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { db } from '../firebase';

export interface SyncIncrementalOptions {
  collectionName: string;
  empresaId: string;
  onData: (data: any[]) => void;
  onError?: (err: any) => void;
}

/**
 * Utilitário de Sincronização Incremental (Fase 3):
 * 1. Carrega do Cache local do IndexedDB (0 leituras no servidor).
 * 2. Busca no servidor apenas o delta de documentos alterados após 'lastSync' (via campo 'atualizadoEm').
 * 3. Atualiza o cache local e salva o novo timestamp de sincronização no localStorage.
 * 4. Ativa um listener 'onSnapshot' escopado para capturar novos registros em tempo real sem baixar a coleção inteira.
 */
export function syncIncremental({
  collectionName,
  empresaId,
  onData,
  onError
}: SyncIncrementalOptions): () => void {
  if (!db || !empresaId) {
    onData([]);
    return () => {};
  }

  let isUnsubscribed = false;
  let activeUnsub: (() => void) | null = null;
  const docsMap = new Map<string, any>();

  const syncKey = `sync:${empresaId}:${collectionName}`;
  const lastSyncStr = localStorage.getItem(syncKey);

  const notify = () => {
    if (!isUnsubscribed) {
      onData(Array.from(docsMap.values()));
    }
  };

  const runSync = async () => {
    const colRef = collection(db, collectionName);
    const baseQuery = query(colRef, where('empresaId', '==', empresaId));

    // 1. Tenta carregar do cache local IndexedDB primeiro (0 leituras no servidor)
    try {
      const cacheSnap = await getDocsFromCache(baseQuery);
      if (!cacheSnap.empty) {
        cacheSnap.docs.forEach((doc: QueryDocumentSnapshot) => {
          docsMap.set(doc.id, { _docId: doc.id, id: doc.id, ...doc.data() });
        });
        notify();
      }
    } catch (err) {
      // Ignora erro se cache local ainda estiver vazio para esta query
    }

    if (isUnsubscribed) return;

    // 2. Busca do servidor apenas os documentos alterados desde a última sincronização (delta)
    const startTime = new Date();
    try {
      let serverQuery = baseQuery;
      let isDeltaQuery = false;

      if (lastSyncStr) {
        const lastSyncDate = new Date(lastSyncStr);
        if (!isNaN(lastSyncDate.getTime())) {
          serverQuery = query(
            colRef,
            where('empresaId', '==', empresaId),
            where('atualizadoEm', '>', Timestamp.fromDate(lastSyncDate))
          );
          isDeltaQuery = true;
        }
      }

      let serverSnap;
      try {
        serverSnap = await getDocsFromServer(serverQuery);
      } catch (serverErr) {
        // Fallback: se a busca por atualizadoEm falhar (ex.: campo ausente nos docs antigos), busca base Query
        if (isDeltaQuery) {
          serverSnap = await getDocsFromServer(baseQuery);
        } else {
          throw serverErr;
        }
      }

      if (serverSnap && !serverSnap.empty) {
        serverSnap.docs.forEach((doc: QueryDocumentSnapshot) => {
          docsMap.set(doc.id, { _docId: doc.id, id: doc.id, ...doc.data() });
        });
        notify();
      }

      // Salva no localStorage o timestamp desta sincronização
      localStorage.setItem(syncKey, startTime.toISOString());
    } catch (err) {
      console.warn(`[syncIncremental] Aviso ao sincronizar '${collectionName}':`, err);
      // Fallback offline
      try {
        const fallbackSnap = await getDocs(baseQuery);
        fallbackSnap.docs.forEach((doc: QueryDocumentSnapshot) => {
          docsMap.set(doc.id, { _docId: doc.id, id: doc.id, ...doc.data() });
        });
        notify();
      } catch (fErr) {
        if (onError) onError(fErr);
      }
    }

    if (isUnsubscribed) return;

    // 3. Listener em tempo real escopado para a empresa
    try {
      activeUnsub = onSnapshot(
        baseQuery,
        (snap) => {
          let changed = false;
          snap.docChanges().forEach((change) => {
            if (change.type === 'removed') {
              docsMap.delete(change.doc.id);
              changed = true;
            } else {
              docsMap.set(change.doc.id, { _docId: change.doc.id, id: change.doc.id, ...change.doc.data() });
              changed = true;
            }
          });
          if (changed) {
            localStorage.setItem(syncKey, new Date().toISOString());
            notify();
          }
        },
        (err) => {
          if (onError) onError(err);
        }
      );
    } catch (err) {
      console.warn(`[syncIncremental] Erro ao iniciar listener em tempo real para '${collectionName}':`, err);
    }
  };

  runSync();

  return () => {
    isUnsubscribed = true;
    if (activeUnsub) {
      activeUnsub();
    }
  };
}
