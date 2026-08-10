export interface Demand5Porques {
  id: string;
  data: string; // DD/MM/YYYY
  dataISO: string; // YYYY-MM-DD
  hora: string; // HH:MM
  colaborador: string;
  processo: string; // e.g. 'EFC', 'EFD', 'Picking', 'Ressuprimento', 'TMR'
  indicador: string;
  meta: string;
  resultadoObtido: string;
  desvioEncontrado: string;
  porque1: string;
  porque2: string;
  porque3: string;
  porque4: string;
  porque5: string;
  status: 'Pendente' | 'Analisado / Acao Atribuida' | 'Concluido';
  acaoCorretivaId?: string;
  criadoEm: string;
}

const STORAGE_PREFIX = 'af_5porques_demandas_';

export function getStored5PorquesDemandas(companyId: string = 'demo'): Demand5Porques[] {
  try {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}${companyId}`);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Error loading 5 Porques demands:', e);
  }
  return [];
}

export function save5PorquesDemandas(companyId: string = 'demo', demands: Demand5Porques[]): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${companyId}`, JSON.stringify(demands));
    window.dispatchEvent(new Event('5porques_demands_updated'));
    window.dispatchEvent(new Event('local_data_changed'));
    window.dispatchEvent(new Event('storage'));
  } catch (e) {
    console.error('Error saving 5 Porques demands:', e);
  }
}

export function add5PorquesDemand(companyId: string = 'demo', demand: Omit<Demand5Porques, 'id' | 'criadoEm'>): Demand5Porques {
  const existing = getStored5PorquesDemandas(companyId);
  const now = new Date();
  const newDemand: Demand5Porques = {
    ...demand,
    id: `pq5-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    criadoEm: now.toISOString()
  };
  const updated = [newDemand, ...existing];
  save5PorquesDemandas(companyId, updated);
  return newDemand;
}

export function update5PorquesDemandStatus(companyId: string = 'demo', id: string, status: Demand5Porques['status'], acaoCorretivaId?: string): void {
  const existing = getStored5PorquesDemandas(companyId);
  const updated = existing.map(d => {
    if (d.id === id) {
      return {
        ...d,
        status,
        ...(acaoCorretivaId ? { acaoCorretivaId } : {})
      };
    }
    return d;
  });
  save5PorquesDemandas(companyId, updated);
}
