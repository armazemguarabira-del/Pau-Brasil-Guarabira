import { TmrDemand } from '../types';

const TMR_STORAGE_PREFIX = 'tmr_demands_';

export function getStoredTmrDemands(companyId: string = 'demo'): TmrDemand[] {
  try {
    const saved = localStorage.getItem(`${TMR_STORAGE_PREFIX}${companyId}`);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Error loading TMR demands:', e);
  }
  return [];
}

export function saveTmrDemands(companyId: string = 'demo', demands: TmrDemand[]) {
  try {
    localStorage.setItem(`${TMR_STORAGE_PREFIX}${companyId}`, JSON.stringify(demands));
    window.dispatchEvent(new Event('tmr_demands_updated'));
  } catch (e) {
    console.error('Error saving TMR demands:', e);
  }
}

export function addTmrDemand(
  companyId: string = 'demo', 
  payload: Omit<TmrDemand, 'id' | 'empresaId' | 'status' | 'criadoEm'>
): TmrDemand {
  const current = getStoredTmrDemands(companyId);
  const totalPallets = (payload.palletsLitrinho || 0) + 
                       (payload.palletsLitrao || 0) + 
                       (payload.pallets600Verde || 0) + 
                       (payload.pallets600Ambar || 0) + 
                       (payload.palletsBarrilChopp || 0) + 
                       (payload.palletsPbr1 || 0) + 
                       (payload.palletsPbr2 || 0) + 
                       (payload.palletsPbr || 0);

  const newDemand: TmrDemand = {
    ...payload,
    id: `tmr_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    empresaId: companyId,
    totalPallets,
    status: 'pending',
    criadoEm: new Date().toISOString()
  };

  const updated = [newDemand, ...current];
  saveTmrDemands(companyId, updated);
  return newDemand;
}

export function updateTmrDemandStatus(
  companyId: string = 'demo',
  id: string,
  status: 'in_progress' | 'done',
  userExecutor: string
) {
  const current = getStoredTmrDemands(companyId);
  const nowISO = new Date().toISOString();

  const updated = current.map(item => {
    if (item.id === id) {
      if (status === 'in_progress') {
        return {
          ...item,
          status: 'in_progress' as const,
          iniciadoEm: item.iniciadoEm || nowISO,
          operadorExecutor: userExecutor
        };
      } else if (status === 'done') {
        const startTs = item.iniciadoEm ? new Date(item.iniciadoEm).getTime() : new Date().getTime();
        const durationMin = Math.max(1, Math.round((new Date(nowISO).getTime() - startTs) / 60000));
        return {
          ...item,
          status: 'done' as const,
          finalizadoEm: nowISO,
          duracaoMin: durationMin,
          operadorExecutor: userExecutor
        };
      }
    }
    return item;
  });

  saveTmrDemands(companyId, updated);
}

export function deleteTmrDemand(companyId: string = 'demo', id: string) {
  const current = getStoredTmrDemands(companyId);
  const updated = current.filter(t => t.id !== id);
  saveTmrDemands(companyId, updated);
}

export function updateTmrDemandOperators(
  companyId: string = 'demo',
  id: string,
  opName: string,
  opArray?: string[]
) {
  const current = getStoredTmrDemands(companyId);
  const updated = current.map(item => {
    if (item.id === id) {
      return {
        ...item,
        operadorDesignado: opName || 'TODOS',
        operadoresAtribuidos: opArray && opArray.length > 0 ? opArray : undefined
      };
    }
    return item;
  });
  saveTmrDemands(companyId, updated);
}

export function updateTmrDemand(
  companyId: string = 'demo',
  id: string,
  updates: Partial<TmrDemand>
) {
  const current = getStoredTmrDemands(companyId);
  const updated = current.map(item => {
    if (item.id === id) {
      const merged = { ...item, ...updates };
      const totalPallets = (merged.palletsLitrinho || 0) + 
                           (merged.palletsLitrao || 0) + 
                           (merged.pallets600Verde || 0) + 
                           (merged.pallets600Ambar || 0) + 
                           (merged.palletsBarrilChopp || 0) + 
                           (merged.palletsPbr1 || 0) + 
                           (merged.palletsPbr2 || 0) + 
                           (merged.palletsPbr || 0);
      return { ...merged, totalPallets };
    }
    return item;
  });
  saveTmrDemands(companyId, updated);
}
