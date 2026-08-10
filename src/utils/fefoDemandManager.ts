import { FefoRelocationDemand } from '../types';
import { calcularQuebrasFefoEstoqueXEstoque, calcularQuebrasFefoEstoqueXPicking } from './matrizBlocos';

const FEFO_STORAGE_PREFIX = 'fefo_demands_';

export function getStoredFefoDemands(companyId: string = 'demo'): FefoRelocationDemand[] {
  try {
    const saved = localStorage.getItem(`${FEFO_STORAGE_PREFIX}${companyId}`);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Error loading FEFO demands:', e);
  }
  return [];
}

export function saveFefoDemands(companyId: string = 'demo', demands: FefoRelocationDemand[]) {
  try {
    localStorage.setItem(`${FEFO_STORAGE_PREFIX}${companyId}`, JSON.stringify(demands));
    window.dispatchEvent(new Event('fefo_demands_updated'));
    window.dispatchEvent(new Event('app_data_updated'));
    window.dispatchEvent(new Event('local_data_changed'));
  } catch (e) {
    console.error('Error saving FEFO demands:', e);
  }
}

/**
 * Automatically calculates FEFO breaks and syncs them with stored demands.
 * If a break is newly detected, it creates a relocation demand with status='pending'.
 * If a demand already exists (e.g. pending, in_progress, done), its status and execution metrics are preserved.
 */
export function syncFefoDemandsFromValidades(companyId: string = 'demo', validadesList: any[]): FefoRelocationDemand[] {
  const currentDemands = getStoredFefoDemands(companyId);

  const pickingBreaks = calcularQuebrasFefoEstoqueXPicking(validadesList);
  const estoqueBreaks = calcularQuebrasFefoEstoqueXEstoque(validadesList);

  let updated = [...currentDemands];
  let hasChanges = false;

  // Process Picking breaks (Tolerância ZERO)
  pickingBreaks.forEach(q => {
    const cod = String(q.codigo).trim();
    const ruaEsta = q.ruaEstoque.trim();
    const ruaPrecisa = 'Área Picking';

    // Check if demand already exists
    const existing = updated.find(d => 
      String(d.codigo).trim() === cod &&
      d.ruaOndeEsta.toLowerCase() === ruaEsta.toLowerCase() &&
      d.ruaOndePrecisaEstar.toLowerCase() === ruaPrecisa.toLowerCase() &&
      d.validadeLoteInconforme === q.validadeEstoque
    );

    if (!existing) {
      const newDemand: FefoRelocationDemand = {
        id: `fefo_exp_${cod}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        empresaId: companyId,
        tipoQuebra: 'estoque_x_picking',
        codigo: cod,
        descricao: q.descricao,
        ruaOndeEsta: ruaEsta,
        ruaOndePrecisaEstar: ruaPrecisa,
        validadeLoteInconforme: q.validadeEstoque,
        validadeLoteComparado: q.validadePicking,
        diasInversao: q.diasInversao,
        mensagem: q.mensagem,
        sugestaoAcao: q.sugestaoAcao,
        status: 'pending',
        operadorDesignado: 'TODOS',
        criadoEm: new Date().toISOString()
      };
      updated.unshift(newDemand);
      hasChanges = true;
    }
  });

  // Process Estoque x Estoque breaks (Tolerância 7 Dias)
  estoqueBreaks.forEach(q => {
    const cod = String(q.codigo).trim();
    const ruaEsta = q.ruaDistante.trim();
    const ruaPrecisa = q.ruaProxima.trim();

    const existing = updated.find(d => 
      String(d.codigo).trim() === cod &&
      d.ruaOndeEsta.toLowerCase() === ruaEsta.toLowerCase() &&
      d.ruaOndePrecisaEstar.toLowerCase() === ruaPrecisa.toLowerCase() &&
      d.validadeLoteInconforme === q.validadeRuaDistante
    );

    if (!existing) {
      const newDemand: FefoRelocationDemand = {
        id: `fefo_exe_${cod}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        empresaId: companyId,
        tipoQuebra: 'estoque_x_estoque',
        codigo: cod,
        descricao: q.descricao,
        ruaOndeEsta: ruaEsta,
        ruaOndePrecisaEstar: ruaPrecisa,
        validadeLoteInconforme: q.validadeRuaDistante,
        validadeLoteComparado: q.validadeRuaProxima,
        diasInversao: q.diasInversao,
        mensagem: q.mensagem,
        sugestaoAcao: q.sugestaoAcao,
        status: 'pending',
        operadorDesignado: 'TODOS',
        criadoEm: new Date().toISOString()
      };
      updated.unshift(newDemand);
      hasChanges = true;
    }
  });

  if (hasChanges) {
    saveFefoDemands(companyId, updated);
  }

  return updated;
}

export function requestFefoDemand(
  companyId: string = 'demo',
  id: string,
  requestedBy: string
) {
  const current = getStoredFefoDemands(companyId);
  const nowISO = new Date().toISOString();

  const updated = current.map(item => {
    if (item.id === id) {
      return {
        ...item,
        solicitadoPorConferente: true,
        solicitadoPor: requestedBy,
        solicitadoEm: nowISO,
        status: 'pending' as const,
        operadorDesignado: 'TODOS'
      };
    }
    return item;
  });

  saveFefoDemands(companyId, updated);
}

export function requestAllFefoDemands(
  companyId: string = 'demo',
  requestedBy: string
) {
  const current = getStoredFefoDemands(companyId);
  const nowISO = new Date().toISOString();

  const updated = current.map(item => {
    if (item.status !== 'done') {
      return {
        ...item,
        solicitadoPorConferente: true,
        solicitadoPor: requestedBy,
        solicitadoEm: nowISO,
        status: item.status === 'in_progress' ? item.status : ('pending' as const),
        operadorDesignado: 'TODOS'
      };
    }
    return item;
  });

  saveFefoDemands(companyId, updated);
}

export function cancelFefoDemandRequest(
  companyId: string = 'demo',
  id: string
) {
  const current = getStoredFefoDemands(companyId);

  const updated = current.map(item => {
    if (item.id === id && item.status === 'pending') {
      return {
        ...item,
        solicitadoPorConferente: false,
        solicitadoPor: undefined,
        solicitadoEm: undefined
      };
    }
    return item;
  });

  saveFefoDemands(companyId, updated);
}

export function updateFefoDemandStatus(
  companyId: string = 'demo',
  id: string,
  status: 'in_progress' | 'done',
  userExecutor: string
) {
  const current = getStoredFefoDemands(companyId);
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

  saveFefoDemands(companyId, updated);
}
