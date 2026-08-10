// Requirement 24: Picking Replenishment Simulator Service
import { PRODUCTS } from '../planosData';
import { getContagens, getVendaMediaItens } from './estoqueStorage';

export interface SaidaPrevistaItem {
  codigo: number;
  produto: string;
  quantidadeSaidaDia: number; // Quantidade de saída/expedição prevista no dia
}

export interface SimulacaoRessuprimentoItem {
  codigo: number;
  produto: string;
  familia: string;
  marca: string;
  setor: string;
  vendaMediaDiaria: number;
  estoqueCentral: number;
  estoquePicking: number;
  estoquePrePicking: number;
  saidaPrevistaDia: number;
  
  // Calculated outputs
  necessitaRessuprimentoDia: boolean;
  necessitaPrePickingAntecipado: boolean;
  qtdIdealMovimentar: number; // Em caixas ou paletes
  qtdPaletesIdeal: number;
  prioridadeAbastecimento: 'Urgente' | 'Alta' | 'Média' | 'Baixa' | 'Sem Necessidade';
  horarioSugerido: string;
  riscoRupturaPct: number;
  excessoPicking: number; // Se o estoque no picking for maior que a política
  coberturaAtualDias: number;
  coberturaAposRessuprimentoDias: number;
  recomendacaoInteligente: string;
}

export function executarSimulacaoRessuprimento(
  saidasRelatorio: SaidaPrevistaItem[] = [],
  qtdDiasUteisMes: number = 22
): SimulacaoRessuprimentoItem[] {
  const contagens = getContagens();
  const vendaMedia = getVendaMediaItens();

  const vmMap = new Map<number, typeof vendaMedia[0]>();
  vendaMedia.forEach(v => vmMap.set(v.codigo, v));

  const saidasMap = new Map<number, number>();
  saidasRelatorio.forEach(s => saidasMap.set(s.codigo, s.quantidadeSaidaDia));

  const results: SimulacaoRessuprimentoItem[] = [];

  PRODUCTS.forEach((catalogItem, idx) => {
    const code = catalogItem.codigo;
    const vm = vmMap.get(code);

    const desc = catalogItem.descricao;
    const dailyAvg = vm?.vendaMediaDiaria || (15 + (idx * 11) % 60);
    const familia = vm?.familia || 'Bebidas';
    const marca = vm?.marca || 'AMBEV';
    const setor = vm?.setor || 'Picking 01';

    // Counts by area
    const centralStock = contagens
      .filter(c => c.codigo === code && c.area === 'central')
      .reduce((acc, curr) => acc + (curr.quantidade || 0), 0);

    const pickingStock = contagens
      .filter(c => c.codigo === code && c.area === 'picking')
      .reduce((acc, curr) => acc + (curr.quantidade || 0), 0);

    const prePickingStock = contagens
      .filter(c => c.codigo === code && c.area === 'marketplace') // using marketplace or buffer as pre-picking
      .reduce((acc, curr) => acc + (curr.quantidade || 0), 0);

    // Saida do dia (from report or estimated from daily average)
    const saidaDia = saidasMap.get(code) ?? Math.round(dailyAvg * (1 + ((idx % 5) - 2) * 0.1));

    // Policy target: 6 days total stock, Picking should ideally hold 1 to 2 days
    const idealPickingCap = Math.round(dailyAvg * 1.5);
    const ideal6DaysTotal = Math.round(dailyAvg * 6);

    // Current coverage
    const totalCurrentStock = centralStock + pickingStock + prePickingStock;
    const cobAtual = dailyAvg > 0 ? parseFloat((totalCurrentStock / dailyAvg).toFixed(1)) : 0;

    // Remaining picking stock after predicted daily sales
    const saldoPickingAposSaida = pickingStock - saidaDia;

    let necessitaRessuprimento = false;
    let necessitaPrePicking = false;
    let prioridade: SimulacaoRessuprimentoItem['prioridadeAbastecimento'] = 'Sem Necessidade';
    let horario = '16:00 (Rotina)';
    let riscoRuptura = 0;
    let excesso = 0;

    if (pickingStock > idealPickingCap * 2) {
      excesso = pickingStock - idealPickingCap;
    }

    // Determine replenishment need
    if (saldoPickingAposSaida <= 0) {
      necessitaRessuprimento = true;
      prioridade = 'Urgente';
      horario = '07:00 (Início do Turno)';
      riscoRuptura = 95;
    } else if (saldoPickingAposSaida < dailyAvg * 0.5) {
      necessitaRessuprimento = true;
      prioridade = 'Alta';
      horario = '10:30 (Intermediário)';
      riscoRuptura = 65;
    } else if (pickingStock < idealPickingCap) {
      necessitaRessuprimento = true;
      prioridade = 'Média';
      horario = '14:00 (Vesperino)';
      riscoRuptura = 25;
    }

    // Determine advance Pre-Picking staging need
    if (saidaDia > dailyAvg * 1.4) {
      necessitaPrePicking = true;
    }

    // Ideal Qty to Move (boxes)
    let qtdIdealMove = 0;
    if (necessitaRessuprimento) {
      qtdIdealMove = Math.max(0, idealPickingCap - pickingStock + saidaDia);
    }

    // Pallets estimation (approx 60 boxes per pallet)
    const qtdPaletes = Math.ceil(qtdIdealMove / 60);

    const cobApos = dailyAvg > 0 ? parseFloat(((totalCurrentStock + qtdIdealMove) / dailyAvg).toFixed(1)) : 0;

    // Smart Recommendations
    let recomendacao = 'Estoque no Picking suficiente para as saídas operacionais.';

    if (totalCurrentStock > ideal6DaysTotal && pickingStock >= idealPickingCap) {
      recomendacao = 'Não abastecer este item, estoque total e picking acima da política de 6 dias.';
    } else if (necessitaPrePicking && qtdPaletes > 0) {
      recomendacao = `Mover ${qtdPaletes} pallet(s) (${qtdIdealMove} cx) do Central para o Pré-Picking devido à alta saída prevista.`;
    } else if (prioridade === 'Urgente') {
      recomendacao = 'Reabastecer imediatamente o Picking. Risco iminente de paralisação da expedição.';
    } else if (prioridade === 'Alta') {
      recomendacao = 'Priorizar abastecimento no meio do turno devido ao alto consumo projetado.';
    } else if (prioridade === 'Média') {
      recomendacao = 'Programar reabastecimento de rotina para manter o buffer de 1.5d no Picking.';
    }

    results.push({
      codigo: code,
      produto: desc,
      familia,
      marca,
      setor,
      vendaMediaDiaria: dailyAvg,
      estoqueCentral: centralStock,
      estoquePicking: pickingStock,
      estoquePrePicking: prePickingStock,
      saidaPrevistaDia: saidaDia,
      necessitaRessuprimentoDia: necessitaRessuprimento,
      necessitaPrePickingAntecipado: necessitaPrePicking,
      qtdIdealMovimentar: qtdIdealMove,
      qtdPaletesIdeal: qtdPaletes,
      prioridadeAbastecimento: prioridade,
      horarioSugerido: horario,
      riscoRupturaPct: riscoRuptura,
      excessoPicking: excesso,
      coberturaAtualDias: cobAtual,
      coberturaAposRessuprimentoDias: cobApos,
      recomendacaoInteligente: recomendacao
    });
  });

  return results;
}

export interface RessuprimentoHistoricoEntry {
  id: string;
  data: string; // YYYY-MM-DD or DD/MM/YYYY
  palletsRessupridos: number;
  palletsReabastecidos: number;
  totalPallets: number;
  pctRessuprimento: number;
  pctReabastecimento: number;
  hlRessupridos: number;
  totalMovimentacoes: number;
  tempoMedioMin: number;
  skusRessupridos: number;
  metaRessuprimentoPct: number;
  metaReabastecimentoPct: number;
  statusMeta: 'NO_PRAZO' | 'FORA_DA_META';
  observacao?: string;
  isSimulated?: boolean;
}

export function gerarHistoricoYTDResuprimento(empresaId: string, metaMaxRessuprimento: number = 25): RessuprimentoHistoricoEntry[] {
  const key = `ressuprimento_ytd_records_${empresaId || 'demo'}`;
  const saved = localStorage.getItem(key);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (e) {
      console.error('Erro ao ler histórico YTD ressuprimento:', e);
    }
  }

  // Generate simulated historical YTD data from 01/01/2026 up to today
  const entries: RessuprimentoHistoricoEntry[] = [];
  const startDate = new Date(2026, 0, 1);
  const today = new Date();

  let curr = new Date(startDate);
  let dayCount = 0;

  while (curr <= today) {
    dayCount++;
    const year = curr.getFullYear();
    const month = String(curr.getMonth() + 1).padStart(2, '0');
    const day = String(curr.getDate()).padStart(2, '0');
    const isoDate = `${year}-${month}-${day}`;

    // Realistic variation: ~88% of days within meta (e.g., 16-23%), ~12% with small breach (e.g., 26-30%)
    const isBreachDay = (dayCount % 8 === 0);
    const pctRes = isBreachDay ? 26 + (dayCount % 5) : 17 + (dayCount % 7);
    const pctReab = 100 - pctRes;

    const totalPallets = 110 + (dayCount % 35);
    const palletsRessupridos = Math.round((totalPallets * pctRes) / 100);
    const palletsReabastecidos = totalPallets - palletsRessupridos;
    const hlRessupridos = Math.round(palletsRessupridos * 8.4 * 10) / 10;
    const totalMovimentacoes = palletsRessupridos + palletsReabastecidos + Math.round(dayCount % 12);
    const tempoMedioMin = 14 + (dayCount % 7);
    const skusRessupridos = 12 + (dayCount % 15);

    const isExceeded = pctRes > metaMaxRessuprimento;

    entries.push({
      id: `ytd_${isoDate}_${dayCount}`,
      data: isoDate,
      palletsRessupridos,
      palletsReabastecidos,
      totalPallets,
      pctRessuprimento: pctRes,
      pctReabastecimento: pctReab,
      hlRessupridos,
      totalMovimentacoes,
      tempoMedioMin,
      skusRessupridos,
      metaRessuprimentoPct: metaMaxRessuprimento,
      metaReabastecimentoPct: 100 - metaMaxRessuprimento,
      statusMeta: isExceeded ? 'FORA_DA_META' : 'NO_PRAZO',
      observacao: isExceeded ? `Estouro de meta no Ressuprimento (${pctRes}% > ${metaMaxRessuprimento}%). Ação Corretiva Gerada.` : 'Operação dentro da meta estabelecida.',
      isSimulated: true
    });

    curr.setDate(curr.getDate() + 1);
  }

  localStorage.setItem(key, JSON.stringify(entries));
  return entries;
}

export function salvarHistoricoYTDResuprimento(empresaId: string, entries: RessuprimentoHistoricoEntry[]) {
  const key = `ressuprimento_ytd_records_${empresaId || 'demo'}`;
  localStorage.setItem(key, JSON.stringify(entries));
}

