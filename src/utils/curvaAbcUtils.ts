import { VendaMediaItem } from '../types/estoque';
import { getVendaMediaItens, saveVendaMediaItens } from './estoqueStorage';

export interface CurvaAbcItem {
  codigo: number;
  produto: string;
  familia: string;
  marca: string;
  setor: string;
  vendaMediaDiaria: number; // cx/dia or hl/dia
  venda3MesesTotal: number; // Volume total nos 3 meses faturados (vendaMediaDiaria * diasUteis3Meses)
  precoUnitario: number;
  faturamentoDiario: number; // R$/dia
  faturamento3Meses: number; // R$ total 3 meses
  rank: number;
  volumeAcumulado: number;
  percentualVolume: number;
  percentualAcumulado: number;
  classeABC: 'A' | 'B' | 'C';
  
  // Sugestões de Alocação de Picking e Layout
  posicaoPickingSugerida: string;
  zonaLayoutSugerida: string;
  capacidadePickingPaletes: number;
  prioridadeRessuprimento: 'Alta (Imediata)' | 'Média (Padrão)' | 'Baixa (Sob Demanda)';
  distanciaDocaMetros: string;
  posicaoAtualPicking?: string;
  adesaoLayout: 'Alinhado' | 'Desvio de Layout' | 'Crítico';
}

export interface CurvaAbcResumo {
  totalSkus: number;
  vendaTotal3Meses: number;
  faturamentoTotal3Meses: number;
  countA: number;
  pctSkusA: number;
  volA: number;
  pctVolA: number;
  valA: number;
  pctValA: number;
  
  countB: number;
  pctSkusB: number;
  volB: number;
  pctVolB: number;
  valB: number;
  pctValB: number;
  
  countC: number;
  pctSkusC: number;
  volC: number;
  pctVolC: number;
  valC: number;
  pctValC: number;

  percentualAdesaoLayout: number;
}

const STORAGE_KEY_ABC_OVERRIDES = 'af_curva_abc_overrides_v1';
const STORAGE_KEY_ABC_PARAMS = 'af_curva_abc_params_v1';

export interface AbcParams {
  diasUteis3Meses: number; // Default 66 days
  criterioCalculo: 'volume' | 'faturamento';
  cortePctA: number; // Default 80
  cortePctB: number; // Default 15 (accumulated 95)
  cortePctC: number; // Default 5 (accumulated 100)
}

export function getAbcParams(): AbcParams {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ABC_PARAMS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Erro ao ler parametros ABC:', e);
  }
  return {
    diasUteis3Meses: 66,
    criterioCalculo: 'volume',
    cortePctA: 80,
    cortePctB: 15,
    cortePctC: 5
  };
}

export function saveAbcParams(params: AbcParams): void {
  try {
    localStorage.setItem(STORAGE_KEY_ABC_PARAMS, JSON.stringify(params));
  } catch (e) {
    console.error('Erro ao salvar parametros ABC:', e);
  }
}

export function getAbcOverrides(): Record<number, 'A' | 'B' | 'C'> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ABC_OVERRIDES);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Erro ao ler overrides ABC:', e);
  }
  return {};
}

export function setAbcOverride(codigo: number, classe: 'A' | 'B' | 'C' | null): void {
  const current = getAbcOverrides();
  if (classe === null) {
    delete current[codigo];
  } else {
    current[codigo] = classe;
  }
  try {
    localStorage.setItem(STORAGE_KEY_ABC_OVERRIDES, JSON.stringify(current));
  } catch (e) {
    console.error('Erro ao salvar override ABC:', e);
  }
}

// Engine calculating Pareto 80/20 ABC Curve from 3 Months Faturado Venda Média
export function calculateCurvaAbc(
  itemsInput?: VendaMediaItem[],
  customParams?: Partial<AbcParams>
): { items: CurvaAbcItem[]; resumo: CurvaAbcResumo } {
  const itemsVm = itemsInput || getVendaMediaItens();
  const params = { ...getAbcParams(), ...customParams };
  const overrides = getAbcOverrides();

  const diasUteis = params.diasUteis3Meses || 66;

  // 1. Calculate individual totals for 3 months
  const processed = itemsVm.map(item => {
    const venda3MesesTotal = (item.vendaMediaDiaria || 0) * diasUteis;
    const faturamentoDiario = (item.vendaMediaDiaria || 0) * (item.precoUnitario || 50);
    const faturamento3Meses = venda3MesesTotal * (item.precoUnitario || 50);

    return {
      codigo: item.codigo,
      produto: item.produto,
      familia: item.familia || 'Bebidas',
      marca: item.marca || 'AMBEV',
      setor: item.setor || 'Armazém Central',
      vendaMediaDiaria: item.vendaMediaDiaria || 0,
      venda3MesesTotal,
      precoUnitario: item.precoUnitario || 50,
      faturamentoDiario,
      faturamento3Meses,
      posicaoAtualPicking: item.setor || 'N/A'
    };
  });

  // 2. Sort descending based on criterion (Volume or Faturamento)
  if (params.criterioCalculo === 'faturamento') {
    processed.sort((a, b) => b.faturamento3Meses - a.faturamento3Meses);
  } else {
    processed.sort((a, b) => b.venda3MesesTotal - a.venda3MesesTotal);
  }

  // 3. Totals sum
  const vendaTotal3Meses = processed.reduce((sum, i) => sum + i.venda3MesesTotal, 0) || 1;
  const faturamentoTotal3Meses = processed.reduce((sum, i) => sum + i.faturamento3Meses, 0) || 1;

  let volumeAcumulado = 0;
  let countA = 0, volA = 0, valA = 0;
  let countB = 0, volB = 0, valB = 0;
  let countC = 0, volC = 0, valC = 0;

  const totalSkus = processed.length || 1;

  let skusAlinhadosCount = 0;

  // 4. Pareto 80/20 cumulative calculation
  const items: CurvaAbcItem[] = processed.map((p, idx) => {
    const rank = idx + 1;
    const baseValue = params.criterioCalculo === 'faturamento' ? p.faturamento3Meses : p.venda3MesesTotal;
    const grandTotal = params.criterioCalculo === 'faturamento' ? faturamentoTotal3Meses : vendaTotal3Meses;

    volumeAcumulado += baseValue;
    const percentualVolume = (baseValue / grandTotal) * 100;
    const percentualAcumulado = (volumeAcumulado / grandTotal) * 100;

    // Automatic classification threshold
    let classeABC: 'A' | 'B' | 'C' = 'C';
    if (percentualAcumulado <= params.cortePctA) {
      classeABC = 'A';
    } else if (percentualAcumulado <= (params.cortePctA + params.cortePctB)) {
      classeABC = 'B';
    } else {
      classeABC = 'C';
    }

    // Apply manual override if specified
    if (overrides[p.codigo]) {
      classeABC = overrides[p.codigo];
    }

    // Accumulate metrics per class
    if (classeABC === 'A') {
      countA++;
      volA += p.venda3MesesTotal;
      valA += p.faturamento3Meses;
    } else if (classeABC === 'B') {
      countB++;
      volB += p.venda3MesesTotal;
      valB += p.faturamento3Meses;
    } else {
      countC++;
      volC += p.venda3MesesTotal;
      valC += p.faturamento3Meses;
    }

    // Generate Picking & Layout Suggestions according to ABC Class
    let posicaoPickingSugerida = '';
    let zonaLayoutSugerida = '';
    let capacidadePickingPaletes = 1;
    let prioridadeRessuprimento: 'Alta (Imediata)' | 'Média (Padrão)' | 'Baixa (Sob Demanda)' = 'Baixa (Sob Demanda)';
    let distanciaDocaMetros = '> 60m';

    if (classeABC === 'A') {
      posicaoPickingSugerida = `Rua A / Doca 01-04 (Baia ${(idx % 6) + 1} - Nível 1 - Solo)`;
      zonaLayoutSugerida = 'ZONA FRONTAL - ALTO GIRO (Acesso Rápido Doca)';
      capacidadePickingPaletes = Math.min(8, Math.max(4, Math.round(p.vendaMediaDiaria / 25)));
      prioridadeRessuprimento = 'Alta (Imediata)';
      distanciaDocaMetros = '10 - 25m';
    } else if (classeABC === 'B') {
      posicaoPickingSugerida = `Rua C / Baia ${(idx % 8) + 1} - Nível 1 ou 2`;
      zonaLayoutSugerida = 'ZONA INTERMEDIÁRIA - MÉDIO GIRO';
      capacidadePickingPaletes = Math.min(4, Math.max(2, Math.round(p.vendaMediaDiaria / 35)));
      prioridadeRessuprimento = 'Média (Padrão)';
      distanciaDocaMetros = '25 - 50m';
    } else {
      posicaoPickingSugerida = `Rua E / Baia ${(idx % 10) + 1} - Nível 2 ou 3 (Aéreo/Fundo)`;
      zonaLayoutSugerida = 'ZONA DE FUNDO / PULMÃO SUPERIOR - BAIXO GIRO';
      capacidadePickingPaletes = 1;
      prioridadeRessuprimento = 'Baixa (Sob Demanda)';
      distanciaDocaMetros = '50 - 85m';
    }

    // Check layout alignment
    let adesaoLayout: 'Alinhado' | 'Desvio de Layout' | 'Crítico' = 'Alinhado';
    const posUpper = (p.posicaoAtualPicking || '').toUpperCase();
    if (classeABC === 'A' && (posUpper.includes('RUA E') || posUpper.includes('RUA F') || posUpper.includes('MARKETPLACE'))) {
      adesaoLayout = 'Crítico';
    } else if (classeABC === 'A' && !posUpper.includes('RUA A') && !posUpper.includes('RUA B') && !posUpper.includes('DOCA')) {
      adesaoLayout = 'Desvio de Layout';
    } else if (classeABC === 'C' && (posUpper.includes('DOCA') || posUpper.includes('RUA A'))) {
      adesaoLayout = 'Desvio de Layout';
    }

    if (adesaoLayout === 'Alinhado') {
      skusAlinhadosCount++;
    }

    return {
      ...p,
      rank,
      volumeAcumulado,
      percentualVolume,
      percentualAcumulado,
      classeABC,
      posicaoPickingSugerida,
      zonaLayoutSugerida,
      capacidadePickingPaletes,
      prioridadeRessuprimento,
      distanciaDocaMetros,
      adesaoLayout
    };
  });

  // Calculate Summary
  const resumo: CurvaAbcResumo = {
    totalSkus,
    vendaTotal3Meses,
    faturamentoTotal3Meses,
    countA,
    pctSkusA: (countA / totalSkus) * 100,
    volA,
    pctVolA: (volA / vendaTotal3Meses) * 100,
    valA,
    pctValA: (valA / faturamentoTotal3Meses) * 100,

    countB,
    pctSkusB: (countB / totalSkus) * 100,
    volB,
    pctVolB: (volB / vendaTotal3Meses) * 100,
    valB,
    pctValB: (valB / faturamentoTotal3Meses) * 100,

    countC,
    pctSkusC: (countC / totalSkus) * 100,
    volC,
    pctVolC: (volC / vendaTotal3Meses) * 100,
    valC,
    pctValC: (valC / faturamentoTotal3Meses) * 100,

    percentualAdesaoLayout: (skusAlinhadosCount / totalSkus) * 100
  };

  return { items, resumo };
}

// Quick map getter for other panels (e.g., PickingDashboard, Layout, Fefo, StockPolicy)
export function getAbcMap(): Map<number, 'A' | 'B' | 'C'> {
  const { items } = calculateCurvaAbc();
  const map = new Map<number, 'A' | 'B' | 'C'>();
  items.forEach(i => map.set(i.codigo, i.classeABC));
  return map;
}

// Sync calculated ABC classes back into VendaMediaItens storage for persistence
export function syncAbcClassesToStorage(): void {
  const { items } = calculateCurvaAbc();
  const currentVm = getVendaMediaItens();
  const abcMap = new Map<number, 'A' | 'B' | 'C'>();
  items.forEach(i => abcMap.set(i.codigo, i.classeABC));

  const updated = currentVm.map(v => ({
    ...v,
    classeABC: abcMap.get(v.codigo) || 'C'
  }));

  saveVendaMediaItens(updated);
}
