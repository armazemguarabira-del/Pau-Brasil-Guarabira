import { Query, DocumentData, getDocsFromCache, getDocsFromServer, QuerySnapshot } from 'firebase/firestore';

/**
 * Busca os documentos de uma query priorizando o cache local do aparelho
 * (IndexedDB, via persistentLocalCache configurado em firebase.ts).
 *
 * - Se os dados dessa query já foram carregados antes nesse aparelho,
 *   retorna do cache SEM consultar o banco (sem custo de leitura).
 * - Se o cache estiver vazio para essa query (primeira vez, aparelho novo,
 *   cache limpo), busca do servidor normalmente e o resultado fica salvo
 *   automaticamente no cache para a próxima vez.
 *
 * Ideal para telas de consulta/histórico (Dashboard, Exportar, relatórios).
 * NÃO usar em telas que precisam de atualização ao vivo (ex: Repack e
 * Despejo continuam com onSnapshot normal).
 */
export async function fetchComCache<T = DocumentData>(
  q: Query<T>
): Promise<QuerySnapshot<T>> {
  try {
    const cacheSnap = await getDocsFromCache(q);
    if (!cacheSnap.empty) {
      return cacheSnap;
    }
  } catch (e) {
    // Cache ainda não tem nada para essa query específica — segue pro servidor
  }
  return getDocsFromServer(q);
}
