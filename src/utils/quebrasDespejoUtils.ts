import { QuebraRow, DespejoRow } from '../types';
import { getItemHlInfo } from '../components/WqiTab';

/**
 * Utilitário de análise de Quebras com Possibilidade de Despejo
 * e geração de Tempos Ilustrativos para a Operação de Despejo.
 */

export interface AnáliseQuebraDespejo {
  possivel: boolean;
  motivoDespejo: string;
  categoria: string;
  icone: string;
  nivelRisco: 'alto' | 'medio' | 'baixo';
  volumeHl: number;
  skus: number;
  tempoEstimativalustrativaSec: number;
  tempoEstimativalustrativaStr: string;
}

export interface TemposIlustrativosOperacao {
  tempoTotalSec: number;
  tempoTotalStr: string;
  tempoTriagemStr: string;
  tempoTriagemSec: number;
  tempoDrenagemStr: string;
  tempoDrenagemSec: number;
  tempoSegregacaoStr: string;
  tempoSegregacaoSec: number;
  tempoMedioPorSkuSec: number;
  tempoMedioPorSkuStr: string;
  ritmoSkusPorHora: number;
  vazaoHlPorMinuto: number;
  desvioPadraoStr: string;
  desvioPositivo: boolean;
}

// Configuração de tempos padrão e fatores por embalagem
const EMBALAGENS_FACTOR: Record<string, { factorHl: number; metaUnitSec: number }> = {
  'LATA 250': { factorHl: 0.06, metaUnitSec: 43 },
  'LATA 269': { factorHl: 0.06456, metaUnitSec: 45 },
  'LATA 350': { factorHl: 0.084, metaUnitSec: 50 },
  'LATA 473': { factorHl: 0.11352, metaUnitSec: 55 },
  'LONG NECK': { factorHl: 0.0852, metaUnitSec: 65 },
  'PET 1L': { factorHl: 0.12, metaUnitSec: 55 },
  'PET 2L': { factorHl: 0.12, metaUnitSec: 50 },
  'PET 500': { factorHl: 0.06, metaUnitSec: 45 },
  '300OW': { factorHl: 0.072, metaUnitSec: 75 },
};

/**
 * Analisa uma quebra registrada para verificar se há possibilidade de despejo de líquido.
 */
export function analisarQuebraParaDespejo(q: QuebraRow): AnáliseQuebraDespejo {
  const cod = String(q.codQuebra || '').trim();
  const mot = (q.motivo || '').toUpperCase();
  const area = (q.area || '').toUpperCase();
  const desc = (q.descricao || '').toUpperCase();
  const quantidade = Number(q.quantidade) || 0;

  // Cálculo de volume em Hectolitros (HL/HE)
  const infoHl = getItemHlInfo({
    quantidade,
    descricao: q.descricao,
    codProduto: q.codProduto
  });
  const volumeHl = Math.round(infoHl.totalHl * 100) / 100;

  // Codigos DPO com alta incidência de líquido reaproveitável/despejável
  const codigosAltaPossibilidade = ['522', '523', '525', '526', '527', '531', '532', '533', '534', '537', '539', '544', '545', '547', '548', '549', '552', '553', '554', '555', '557', '562', '563', '565', '566', '567', '571', '572', '573', '574', '575', '577', '578', '579', '583', '584', '585', '589'];

  let possivel = false;
  let motivoDespejo = 'Não elegível para despejo';
  let categoria = 'Perda Seca / Sem Líquido';
  let icone = '🚫';
  let nivelRisco: 'alto' | 'medio' | 'baixo' = 'baixo';

  if (mot.includes('VAZAMENTO') || ['526', '548', '566', '578'].includes(cod)) {
    possivel = true;
    motivoDespejo = 'Vazamento de Líquido em Lote/Embalagem';
    categoria = 'Vazamento Ativo';
    icone = '💧';
    nivelRisco = 'alto';
  } else if (mot.includes('ESTOURAD') || mot.includes('ESTUFAD') || ['522', '523', '544', '545', '562', '563', '575'].includes(cod)) {
    possivel = true;
    motivoDespejo = 'Embalagem Avariada com Presença de Líquido';
    categoria = 'Avaria Pressurizada';
    icone = '💥';
    nivelRisco = 'alto';
  } else if (mot.includes('VENCID') || ['533', '554', '573', '585'].includes(cod)) {
    possivel = true;
    motivoDespejo = 'Produto Vencido para Descarte/Despejo Controlado';
    categoria = 'Vencimento de Estoque';
    icone = '📅';
    nivelRisco = 'medio';
  } else if (
    mot.includes('MAL CHEIO') || mot.includes('SEM GAS') || mot.includes('SEM TAMPA') || mot.includes('IMPUREZA') ||
    ['527', '531', '532', '534', '549', '552', '553', '555', '567', '571', '572', '574', '579', '583', '584'].includes(cod) ||
    (q.wqi && q.wqi.toUpperCase() === 'SIM')
  ) {
    possivel = true;
    motivoDespejo = 'Não Conformidade WQI / Líquido Fora do Padrão';
    categoria = 'Qualidade WQI';
    icone = '🧪';
    nivelRisco = 'medio';
  } else if (
    mot.includes('QUEBRAD') || mot.includes('MOVIMENTAÇÃO') || mot.includes('CHOQUE') || mot.includes('MANUSEIO') ||
    codigosAltaPossibilidade.includes(cod) || area === 'ARMAZEM' || area === 'PUXADA'
  ) {
    // Para quebras físicas com quantidade considerável (>1 unidade)
    if (quantidade >= 1) {
      possivel = true;
      motivoDespejo = 'Quebra Físico-Operacional com Conteúdo Drenável';
      categoria = 'Quebra Operacional';
      icone = '📦';
      nivelRisco = 'baixo';
    }
  }

  // Estimativa ilustrativa de tempo em segundos para despejar essa quebra (40s por SKU)
  const tempoEstimativalustrativaSec = Math.max(120, quantidade * 42);
  const pad = (n: number) => String(n).padStart(2, '0');
  const h = Math.floor(tempoEstimativalustrativaSec / 3600);
  const m = Math.floor((tempoEstimativalustrativaSec % 3600) / 60);
  const s = tempoEstimativalustrativaSec % 60;
  const tempoEstimativalustrativaStr = `${pad(h)}:${pad(m)}:${pad(s)}`;

  return {
    possivel,
    motivoDespejo,
    categoria,
    icone,
    nivelRisco,
    volumeHl,
    skus: quantidade,
    tempoEstimativalustrativaSec,
    tempoEstimativalustrativaStr
  };
}

/**
 * Elabora os Tempos Ilustrativos detalhados por fase para a página/tabela de operação despejo (Histórico).
 */
export function elaborarTemposIlustrativosOperacao(
  quantidade: number,
  embalagemName: string,
  tempoTotalStr: string
): TemposIlustrativosOperacao {
  const pad = (n: number) => String(n).padStart(2, '0');
  const toSec = (hms: string) => {
    if (!hms) return 0;
    const parts = String(hms).split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return Number(hms) || 0;
  };
  const toHMS = (sec: number) => {
    sec = Math.max(0, Math.floor(sec));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return [h, m, s].map(pad).join(':');
  };

  const qty = Math.max(1, quantidade || 1);
  const tempoTotalSec = toSec(tempoTotalStr) || Math.max(180, qty * 45);

  // Fases ilustrativas da operação de despejo:
  // Fase 1: Triagem, Conferencia e Checagem de Lote (~15% do tempo)
  // Fase 2: Perfuração, Abertura e Drenagem do Líquido (~65% do tempo)
  // Fase 3: Lavagem, Compactação e Segregação de Vasilhame (~20% do tempo)
  const tempoTriagemSec = Math.max(30, Math.floor(tempoTotalSec * 0.15));
  const tempoSegregacaoSec = Math.max(30, Math.floor(tempoTotalSec * 0.20));
  const tempoDrenagemSec = Math.max(60, tempoTotalSec - tempoTriagemSec - tempoSegregacaoSec);

  const tempoTriagemStr = toHMS(tempoTriagemSec);
  const tempoDrenagemStr = toHMS(tempoDrenagemSec);
  const tempoSegregacaoStr = toHMS(tempoSegregacaoSec);

  // Métrica ilustrativa de ritmo e vazão
  const tempoMedioPorSkuSec = Math.round((tempoTotalSec / qty) * 10) / 10;
  const tempoMedioPorSkuStr = toHMS(tempoMedioPorSkuSec).substring(3); // MM:SS
  const ritmoSkusPorHora = Math.round((qty / (tempoTotalSec / 3600)));

  // Estimativa de Hectolitros despejados
  const embConfig = EMBALAGENS_FACTOR[embalagemName] || { factorHl: 0.08, metaUnitSec: 50 };
  const volumeHlEst = Math.round((qty * embConfig.factorHl) * 100) / 100;
  const vazaoHlPorMinuto = Math.round((volumeHlEst / (tempoTotalSec / 60)) * 100) / 100;

  // Comparativo ilustrativo com a meta padrão
  const tempoMetaPadraoSec = embConfig.metaUnitSec * qty;
  const diffSec = tempoMetaPadraoSec - tempoTotalSec;
  const desvioPositivo = diffSec >= 0;
  const desvioPadraoStr = `${desvioPositivo ? '-' : '+'}${toHMS(Math.abs(diffSec))}`;

  return {
    tempoTotalSec,
    tempoTotalStr: toHMS(tempoTotalSec),
    tempoTriagemStr,
    tempoTriagemSec,
    tempoDrenagemStr,
    tempoDrenagemSec,
    tempoSegregacaoStr,
    tempoSegregacaoSec,
    tempoMedioPorSkuSec,
    tempoMedioPorSkuStr,
    ritmoSkusPorHora,
    vazaoHlPorMinuto,
    desvioPadraoStr,
    desvioPositivo
  };
}
