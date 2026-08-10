import { PRODUCTS } from '../planosData';
import { getProductMeta } from './productCatalogData';
import { categorizeFamilia } from './estoqueParsers';
import { setMediaItem } from './idbStorage';
import { calculateCurvaAbc } from './curvaAbcUtils';
import {
  ContagemRecord,
  ImportLog,
  ContingenciaItem,
  ContingenciaMovimentacao,
  VendaMediaItem,
  ImportVendaMediaLog,
  PoliticaEstoqueCalculada,
  CriticidadeEstoque,
  EstoqueDisponivel0205Item,
  ImportEstoqueDisponivelLog
} from '../types/estoque';

const STORAGE_KEYS = {
  CONTAGENS: 'af_estoque_contagens',
  CONTAGENS_LOGS: 'af_estoque_contagens_logs',
  CONTINGENCIA_ITENS: 'af_estoque_contingencia_itens',
  CONTINGENCIA_HISTORICO: 'af_estoque_contingencia_historico',
  VENDA_MEDIA: 'af_estoque_venda_media',
  VENDA_MEDIA_LOGS: 'af_estoque_venda_media_logs',
  ESTOQUE_DISPONIVEL_0205: 'af_estoque_disponivel_0205',
  ESTOQUE_DISPONIVEL_0205_LOGS: 'af_estoque_disponivel_0205_logs',
};

// Default initial data generator based on AMBEV products catalog
function generateInitialVendaMedia(): VendaMediaItem[] {
  return PRODUCTS.map((p, index) => {
    // Generate realistic daily sales average and family classification
    const desc = p.descricao.toUpperCase();
    const familia = categorizeFamilia({ codigo: p.codigo, produto: p.descricao });
    let marca = 'Brahma';
    if (desc.includes('SUKITA')) marca = 'Sukita';
    else if (desc.includes('PEPSI')) marca = 'Pepsi';
    else if (desc.includes('SKOL')) marca = 'Skol';
    else if (desc.includes('ANTARCTICA')) marca = 'Antarctica';
    else if (desc.includes('SPATEN')) marca = 'Spaten';
    else if (desc.includes('STELLA')) marca = 'Stella Artois';
    else if (desc.includes('CORONA')) marca = 'Corona';
    else if (desc.includes('BUDWEISER')) marca = 'Budweiser';
    else if (desc.includes('RED BULL')) marca = 'Red Bull';
    else if (desc.includes('BEATS')) marca = 'Skol Beats';

    const sectorMap = ['Central A', 'Central B', 'Picking 01', 'Picking 02', 'Marketplace'];
    const setor = sectorMap[index % sectorMap.length];

    // Base average sales in cases/units per day
    const baseVenda = Math.floor(25 + (index * 13) % 120);
    const estPrice = Math.round((45.0 + (index * 7) % 65) * 100) / 100;

    return {
      codigo: p.codigo,
      produto: p.descricao,
      vendaMediaDiaria: baseVenda,
      precoUnitario: estPrice,
      familia,
      marca,
      setor,
      atualizadoEm: new Date().toISOString()
    };
  });
}

function generateInitialContagens(): ContagemRecord[] {
  const records: ContagemRecord[] = [];
  const now = new Date().toISOString();
  
  PRODUCTS.forEach((p, idx) => {
    // Central counts (usually larger volume)
    const centralQty = Math.floor(100 + (idx * 37) % 600);
    records.push({
      id: `cnt-c-${p.codigo}`,
      codigo: p.codigo,
      produto: p.descricao,
      quantidade: centralQty,
      area: 'central',
      importadoEm: now,
      importId: 'imp-init-central'
    });

    // Picking counts
    const pickingQty = Math.floor(20 + (idx * 19) % 150);
    records.push({
      id: `cnt-p-${p.codigo}`,
      codigo: p.codigo,
      produto: p.descricao,
      quantidade: pickingQty,
      area: 'picking',
      importadoEm: now,
      importId: 'imp-init-picking'
    });

    // Marketplace counts (selective items)
    if (idx % 2 === 0) {
      const mpQty = Math.floor(10 + (idx * 11) % 80);
      records.push({
        id: `cnt-m-${p.codigo}`,
        codigo: p.codigo,
        produto: p.descricao,
        quantidade: mpQty,
        area: 'marketplace',
        importadoEm: now,
        importId: 'imp-init-mp'
      });
    }
  });

  return records;
}

function generateInitialLogs(): ImportLog[] {
  const now = new Date();
  const dStr = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', { hour12: false });
  return [
    {
      id: 'imp-init-central',
      dataHora: dStr,
      area: 'central',
      nomeArquivo: 'contagem_central_oficial.csv',
      totalLinhas: 18,
      aceitos: 18,
      rejeitados: 0,
      usuario: 'Sistema'
    },
    {
      id: 'imp-init-picking',
      dataHora: dStr,
      area: 'picking',
      nomeArquivo: 'contagem_picking_turno1.csv',
      totalLinhas: 18,
      aceitos: 18,
      rejeitados: 0,
      usuario: 'Sistema'
    },
    {
      id: 'imp-init-mp',
      dataHora: dStr,
      area: 'marketplace',
      nomeArquivo: 'contagem_marketplace_fechamento.csv',
      totalLinhas: 9,
      aceitos: 9,
      rejeitados: 0,
      usuario: 'Sistema'
    }
  ];
}

// ── GETTERS & SETTERS FROM LOCAL STORAGE ──

export function getContagens(): ContagemRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONTAGENS);
    if (!raw) {
      const init = generateInitialContagens();
      localStorage.setItem(STORAGE_KEYS.CONTAGENS, JSON.stringify(init));
      return init;
    }
    return JSON.parse(raw);
  } catch (e) {
    return generateInitialContagens();
  }
}

export function saveContagens(records: ContagemRecord[]): void {
  localStorage.setItem(STORAGE_KEYS.CONTAGENS, JSON.stringify(records));
}

export function getContagensLogs(): ImportLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONTAGENS_LOGS);
    if (!raw) {
      const init = generateInitialLogs();
      localStorage.setItem(STORAGE_KEYS.CONTAGENS_LOGS, JSON.stringify(init));
      return init;
    }
    return JSON.parse(raw);
  } catch (e) {
    return generateInitialLogs();
  }
}

export function saveContagensLogs(logs: ImportLog[]): void {
  localStorage.setItem(STORAGE_KEYS.CONTAGENS_LOGS, JSON.stringify(logs));
}

// ── CONTINGENCY AREA ──

export function getContingenciaItens(): ContingenciaItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONTINGENCIA_ITENS);
    if (!raw) {
      // By default rule 14: if empty, returns empty array!
      return [];
    }
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function saveContingenciaItens(itens: ContingenciaItem[]): void {
  localStorage.setItem(STORAGE_KEYS.CONTINGENCIA_ITENS, JSON.stringify(itens));
}

export function getContingenciaHistorico(): ContingenciaMovimentacao[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONTINGENCIA_HISTORICO);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function saveContingenciaHistorico(list: ContingenciaMovimentacao[]): void {
  localStorage.setItem(STORAGE_KEYS.CONTINGENCIA_HISTORICO, JSON.stringify(list));
}

// ── VENDA MÉDIA ──

export function getVendaMediaItens(): VendaMediaItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.VENDA_MEDIA);
    if (!raw) {
      const init = generateInitialVendaMedia();
      localStorage.setItem(STORAGE_KEYS.VENDA_MEDIA, JSON.stringify(init));
      return init;
    }
    return JSON.parse(raw);
  } catch (e) {
    return generateInitialVendaMedia();
  }
}

export function saveVendaMediaItens(itens: VendaMediaItem[]): void {
  const jsonStr = JSON.stringify(itens);
  try {
    localStorage.setItem(STORAGE_KEYS.VENDA_MEDIA, jsonStr);
  } catch (_) {}
  setMediaItem(STORAGE_KEYS.VENDA_MEDIA, jsonStr);
}

export function getVendaMediaLogs(): ImportVendaMediaLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.VENDA_MEDIA_LOGS);
    if (!raw) {
      const now = new Date();
      const dStr = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', { hour12: false });
      const init: ImportVendaMediaLog[] = [
        {
          id: 'vm-init-log',
          dataHora: dStr,
          nomeArquivo: 'venda_media_30dias_ambev.csv',
          totalLinhas: PRODUCTS.length,
          aceitos: PRODUCTS.length,
          rejeitados: 0,
          usuario: 'Sistema AMBEV'
        }
      ];
      localStorage.setItem(STORAGE_KEYS.VENDA_MEDIA_LOGS, JSON.stringify(init));
      return init;
    }
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function saveVendaMediaLogs(logs: ImportVendaMediaLog[]): void {
  const jsonStr = JSON.stringify(logs);
  try {
    localStorage.setItem(STORAGE_KEYS.VENDA_MEDIA_LOGS, jsonStr);
  } catch (_) {}
  setMediaItem(STORAGE_KEYS.VENDA_MEDIA_LOGS, jsonStr);
}

// ── ESTOQUE DISPONÍVEL 02.05.02 ──

export function getEstoqueDisponivel0205Itens(): EstoqueDisponivel0205Item[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ESTOQUE_DISPONIVEL_0205);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function saveEstoqueDisponivel0205Itens(itens: EstoqueDisponivel0205Item[]): void {
  const jsonStr = JSON.stringify(itens);
  try {
    localStorage.setItem(STORAGE_KEYS.ESTOQUE_DISPONIVEL_0205, jsonStr);
  } catch (_) {}
  setMediaItem(STORAGE_KEYS.ESTOQUE_DISPONIVEL_0205, jsonStr);
}

export function getEstoqueDisponivel0205Logs(): ImportEstoqueDisponivelLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ESTOQUE_DISPONIVEL_0205_LOGS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function saveEstoqueDisponivel0205Logs(logs: ImportEstoqueDisponivelLog[]): void {
  localStorage.setItem(STORAGE_KEYS.ESTOQUE_DISPONIVEL_0205_LOGS, JSON.stringify(logs));
}

// ── CALCULATION ENGINE: POLÍTICA DE ESTOQUE (REQUIREMENT 16, 17, 18, 19) ──

export function calcularPoliticaEstoque(): PoliticaEstoqueCalculada[] {
  const vmItens = getVendaMediaItens();
  const contagens = getContagens();
  const contingenciaItens = getContingenciaItens();
  const est0205Itens = getEstoqueDisponivel0205Itens();

  // Calculate dynamic ABC Curves from 03.05.19 data (Cobertura ABC Engine)
  const abcResult = calculateCurvaAbc(vmItens);
  const abcMap = new Map<number, 'A' | 'B' | 'C'>();
  abcResult.items.forEach(item => abcMap.set(Number(item.codigo), item.classeABC));
  const vmMap = new Map<number, VendaMediaItem>();
  vmItens.forEach(item => vmMap.set(Number(item.codigo), item));

  const est0205Map = new Map<number, EstoqueDisponivel0205Item>();
  est0205Itens.forEach(item => est0205Map.set(Number(item.codigo), item));

  // Also include products from catalog, vm, contagens or 02.05.02 if missing
  const allProductCodes = new Set<number>();
  PRODUCTS.forEach(p => {
    const num = Number(p.codigo);
    if (!isNaN(num) && num > 0) allProductCodes.add(num);
  });
  vmItens.forEach(v => {
    const num = Number(v.codigo);
    if (!isNaN(num) && num > 0) allProductCodes.add(num);
  });
  contagens.forEach(c => {
    const num = Number(c.codigo);
    if (!isNaN(num) && num > 0) allProductCodes.add(num);
  });
  est0205Itens.forEach(e => {
    const num = Number(e.codigo);
    if (!isNaN(num) && num > 0) allProductCodes.add(num);
  });

  const result: PoliticaEstoqueCalculada[] = [];

  allProductCodes.forEach(code => {
    const catalogItem = PRODUCTS.find(p => Number(p.codigo) === code);
    const meta = getProductMeta(code);
    const vm = vmMap.get(code);
    const est0205 = est0205Map.get(code);

    const desc = catalogItem?.descricao || vm?.produto || est0205?.produto || `Produto ${code}`;
    const dailyAvg = vm?.vendaMediaDiaria || 0; // fallback if undefined
    const unitPrice = meta.preco;
    const familia = meta.grupo || vm?.familia || 'CERVEJA';
    const marca = vm?.marca || 'AMBEV';
    const setor = vm?.setor || 'Armazém Central';

    // Stock sums by area from manual counting
    const centralSum = contagens
      .filter(c => Number(c.codigo) === code && c.area === 'central')
      .reduce((acc, curr) => acc + (curr.quantidade || 0), 0);

    const pickingSum = contagens
      .filter(c => Number(c.codigo) === code && c.area === 'picking')
      .reduce((acc, curr) => acc + (curr.quantidade || 0), 0);

    const mpSum = contagens
      .filter(c => Number(c.codigo) === code && c.area === 'marketplace')
      .reduce((acc, curr) => acc + (curr.quantidade || 0), 0);

    const contingenciaSum = contingenciaItens
      .filter(c => Number(c.codigo) === code)
      .reduce((acc, curr) => acc + (curr.quantidade || 0), 0);

    // Item 6: Se existir registro importado do 02.05.02 para o código, usar total do 02.05.02 (SKU fechado + frações de avulso) como estoqueAtualTotal
    const manualStock = centralSum + pickingSum + mpSum + contingenciaSum;
    const closedStock = est0205 ? est0205.qtdSkuFechado : manualStock;
    const looseUnits = est0205 ? est0205.qtdUnidadeAvulsa : 0;
    const totalStock = est0205 ? (est0205.qtdTotalCx > 0 ? est0205.qtdTotalCx : est0205.qtdSkuFechado) : manualStock;
    const effectiveCentral = est0205 ? est0205.qtdSkuFechado : centralSum;

    const valorTotalComAvulso = est0205 && est0205.valorTotal > 0
      ? est0205.valorTotal
      : Math.round((closedStock * unitPrice + looseUnits * (unitPrice / (meta.fator || 12))) * 100) / 100;

    const hectoTotal = est0205 && est0205.hectoTotal > 0
      ? est0205.hectoTotal
      : Math.round((totalStock * meta.fatorHecto) * 1000) / 1000;

    // Rule 16: Ideal Stock = Daily Average Sales × 6 days
    const idealStock = Math.round(dailyAvg * 6);

    // Rule 17: Coverage in days
    const coverageDays = dailyAvg > 0 ? parseFloat((totalStock / dailyAvg).toFixed(1)) : (totalStock > 0 ? 99 : 0);

    let status: PoliticaEstoqueCalculada['status'] = 'adequado';
    let criticidade: CriticidadeEstoque = '🟢 Adequado';

    if (totalStock === 0) {
      status = 'ruptura';
      criticidade = '🔴 Ruptura';
    } else if (coverageDays < 3.0) {
      status = 'critico';
      criticidade = '🟠 Crítico';
    } else if (coverageDays < 5.5) {
      status = 'atencao';
      criticidade = '🟡 Atenção';
    } else if (totalStock > idealStock) {
      status = 'sobre_estoque';
      criticidade = '🟢 Adequado';
    } else {
      status = 'adequado';
      criticidade = '🟢 Adequado';
    }

    // Overstock metrics
    const excessQtd = Math.max(0, totalStock - idealStock);
    const excessValor = Math.round(excessQtd * unitPrice * 100) / 100;
    const excessDias = totalStock > idealStock ? parseFloat((coverageDays - 6).toFixed(1)) : 0;

    // Out of stock metrics
    const faltaQtd = Math.max(0, idealStock - totalStock);
    const faltaValor = Math.round(faltaQtd * unitPrice * 100) / 100;
    const faltaDias = coverageDays < 6 ? parseFloat((6 - coverageDays).toFixed(1)) : 0;

    // Smart Recommendations (Requirement 19)
    let recomendacao = 'Estoque alinhado com a política de 6 dias.';
    let acaoRecomendada: PoliticaEstoqueCalculada['acaoRecomendada'] = 'manter';

    if (status === 'ruptura') {
      recomendacao = 'Ruptura total de estoque! Priorizar pedido de compra urgente e transferência imediata.';
      acaoRecomendada = 'compras_urgentes';
    } else if (pickingSum === 0 && centralSum > 0) {
      recomendacao = 'Picking zerado com estoque disponível na Central. Reabastecer o Picking imediatamente.';
      acaoRecomendada = 'reabastecer_picking';
    } else if (pickingSum < dailyAvg * 2 && centralSum > dailyAvg * 3) {
      recomendacao = 'Picking em nível baixo. Transferir paletes da Central para o Picking.';
      acaoRecomendada = 'transferir_central_picking';
    } else if (status === 'sobre_estoque' && excessDias > 4) {
      recomendacao = `Excesso de ${excessDias}d acima da política de 6d. Suspender novos abastecimentos até equalizar.`;
      acaoRecomendada = 'suspender_abastecimento';
    } else if (status === 'critico' || status === 'atencao') {
      recomendacao = `Cobertura baixa (${coverageDays}d). Priorizar remanejamento entre setores ou compra.`;
      acaoRecomendada = 'remanejar';
    }

    result.push({
      codigo: code,
      produto: desc,
      familia,
      marca,
      setor,
      vendaMediaDiaria: dailyAvg,
      estoqueCentral: effectiveCentral,
      estoquePicking: pickingSum,
      estoqueMarketplace: mpSum,
      estoqueContingencia: contingenciaSum,
      estoqueAtualTotal: totalStock,
      qtdSkuFechado: closedStock,
      qtdUnidadeAvulsa: looseUnits,
      valorTotalComAvulso,
      estoqueIdeal: idealStock,
      coberturaDias: coverageDays,
      status,
      criticidade,
      excessoQtd: excessQtd,
      excessoValor: excessValor,
      excessoDias: excessDias,
      faltaQtd: faltaQtd,
      faltaValor: faltaValor,
      faltaDias: faltaDias,
      precoUnitario: unitPrice,
      hectoTotal,
      grupo: meta.grupo,
      curvaABC: abcMap.get(code) || meta.curva,
      recomendacao,
      acaoRecomendada
    });
  });

  return result.sort((a, b) => a.codigo - b.codigo);
}

// ==========================================
// REPORT 02.11.01 POSIÇÃO PALLET STORAGE
// ==========================================
const POSICAO_PALLET_021101_ITEMS_KEY = 'af_posicao_pallet_021101_items_v1';
const POSICAO_PALLET_021101_LOGS_KEY = 'af_posicao_pallet_021101_logs_v1';
const CAPACITY_METAS_KEY = 'af_capacity_area_metas_v1';

export function getPosicaoPallet021101Itens(): import('../types/estoque').PosicaoPallet021101Item[] {
  try {
    const data = localStorage.getItem(POSICAO_PALLET_021101_ITEMS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error reading Posicao Pallet 02.11.01 items:', e);
    return [];
  }
}

export function savePosicaoPallet021101Itens(itens: import('../types/estoque').PosicaoPallet021101Item[]) {
  try {
    localStorage.setItem(POSICAO_PALLET_021101_ITEMS_KEY, JSON.stringify(itens));
  } catch (e) {
    console.error('Error saving Posicao Pallet 02.11.01 items:', e);
  }
}

export function getPosicaoPallet021101Logs(): import('../types/estoque').ImportPosicaoPalletLog[] {
  try {
    const data = localStorage.getItem(POSICAO_PALLET_021101_LOGS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error reading Posicao Pallet 02.11.01 logs:', e);
    return [];
  }
}

export function savePosicaoPallet021101Logs(logs: import('../types/estoque').ImportPosicaoPalletLog[]) {
  try {
    localStorage.setItem(POSICAO_PALLET_021101_LOGS_KEY, JSON.stringify(logs));
  } catch (e) {
    console.error('Error saving Posicao Pallet 02.11.01 logs:', e);
  }
}

export interface AreaMetasConfig {
  1: { palletsMeta: number; hectolitrosMeta: number }; // Armazém Central
  2: { palletsMeta: number; hectolitrosMeta: number }; // Picking
  3: { palletsMeta: number; hectolitrosMeta: number }; // Marketplace
  4: { palletsMeta: number; hectolitrosMeta: number }; // Contingência
  5: { palletsMeta: number; hectolitrosMeta: number }; // Pulmão
  6: { palletsMeta: number; hectolitrosMeta: number }; // PNC
}

export const DEFAULT_AREA_FACTORS: Record<number, number> = {
  1: 8.5, // Central: ~8.5 HL/pallet
  2: 5.8, // Picking: ~5.8 HL/pallet
  3: 2.5, // Marketplace: ~2.5 HL/pallet
  4: 7.5, // Contingência: ~7.5 HL/pallet
  5: 8.5, // Pulmão: ~8.5 HL/pallet
  6: 6.0  // PNC: ~6.0 HL/pallet
};

export const HECTO_PER_PALLET_FACTOR = 8.5;

export const DEFAULT_AREA_METAS: AreaMetasConfig = {
  1: { palletsMeta: 615, hectolitrosMeta: Math.round(615 * 8.5 * 10) / 10 },
  2: { palletsMeta: 160, hectolitrosMeta: Math.round(160 * 5.8 * 10) / 10 },
  3: { palletsMeta: 84, hectolitrosMeta: Math.round(84 * 2.5 * 10) / 10 },
  4: { palletsMeta: 108, hectolitrosMeta: Math.round(108 * 7.5 * 10) / 10 },
  5: { palletsMeta: 140, hectolitrosMeta: Math.round(140 * 8.5 * 10) / 10 },
  6: { palletsMeta: 9, hectolitrosMeta: Math.round(9 * 6.0 * 10) / 10 }
};

export function getCapacityAreaMetas(): AreaMetasConfig {
  try {
    const data = localStorage.getItem(CAPACITY_METAS_KEY);
    const parsed = data ? JSON.parse(data) : null;
    const metas: AreaMetasConfig = parsed ? { ...DEFAULT_AREA_METAS, ...parsed } : { ...DEFAULT_AREA_METAS };

    // Auto-fix outdated Meta HL if using the old 1.076 factor (ratio < 2.5 for Central/Picking)
    (Object.keys(metas) as unknown as (1 | 2 | 3 | 4 | 5 | 6)[]).forEach((areaId) => {
      const id = Number(areaId) as 1 | 2 | 3 | 4 | 5 | 6;
      const m = metas[id];
      if (m && m.palletsMeta > 0) {
        const ratio = m.hectolitrosMeta / m.palletsMeta;
        if (ratio < 2.0) {
          const factor = DEFAULT_AREA_FACTORS[id] || 7.5;
          m.hectolitrosMeta = Math.round(m.palletsMeta * factor * 10) / 10;
        }
      }
    });

    return metas;
  } catch (e) {
    return DEFAULT_AREA_METAS;
  }
}

export function saveCapacityAreaMetas(metas: AreaMetasConfig) {
  try {
    localStorage.setItem(CAPACITY_METAS_KEY, JSON.stringify(metas));
  } catch (e) {
    console.error('Error saving capacity metas:', e);
  }
}

