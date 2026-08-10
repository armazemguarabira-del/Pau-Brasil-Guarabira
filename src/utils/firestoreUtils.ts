import { serverTimestamp } from 'firebase/firestore';

/**
 * Utilitário de auditoria e carimbo de data/hora (Fase 3):
 * Garante que todos os registros gravados ou atualizados no Firestore
 * possuam 'atualizadoEm' e 'criadoEm' padronizados.
 */
export function withTimestamps<T extends Record<string, any>>(data: T, isUpdate = false): T {
  const now = serverTimestamp();
  if (isUpdate) {
    return {
      ...data,
      atualizadoEm: now,
    };
  }
  return {
    ...data,
    criadoEm: data.criadoEm || now,
    atualizadoEm: now,
  };
}
