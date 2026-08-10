/**
 * MATRIZ DE CORRELAÇÃO DE BLOCOS / RUAS X CURVA DE VENDAS X DISTÂNCIA DO PICKING
 * ==============================================================================
 * Diretrizes de Layout do Armazém:
 * 
 * 1. BLOCO A (Ruas A1, A2, A3, A4):
 *    - Fica mais próximo da entrada do Picking.
 *    - Destinado prioritariamente a produtos de alta rotatividade (CURVA A).
 *    - Proximidade da entrada do Picking por Rua:
 *      * Rua A1: Mais próxima da entrada do Picking (Score = 1)
 *      * Rua A2: Segunda rua mais próxima (Score = 2)
 *      * Rua A3: Terceira rua mais próxima (Score = 3)
 *      * Rua A4: Mais distante dentro do Bloco A (Score = 4)
 * 
 * 2. BLOCO B (Ruas B1, B2, B3, B4):
 *    - Localizado no CENTRO do armazém.
 *    - Destinado a produtos de médio giro (CURVA B de vendas).
 *    - Ruas B1 (Score = 5) a B4 (Score = 8).
 * 
 * 3. BLOCO CB (Ruas CB1, CB2, CB3, CB4):
 *    - Bloco intermediário / transição entre B e C.
 *    - Ruas CB1 (Score = 9) a CB4 (Score = 12).
 * 
 * 4. BLOCO C (Ruas C1, C2, C3, C4):
 *    - Localizado no FINAL do armazém (mais distante da expedição e do picking).
 *    - Destinado a produtos de menor giro (CURVA C de vendas / baixo volume).
 *    - Ruas C1 (Score = 13) a C4 (Score = 16).
 * 
 * 5. OUTRAS ÁREAS:
 *    - Área Picking (Score = 0): Própria área de separação.
 *    - Marketplace (Score = 20): Área dedicada.
 *    - Contingência (Score = 25): Armazenamento temporário de excedentes.
 *    - PNC (Score = 99): Produto Não Conforme / Bloqueado (Fora da Matriz de Blocos).
 */

export interface RegraBlocoLayout {
  bloco: string;
  ruas: string[];
  curvaIdeal: 'A' | 'B' | 'C';
  descricaoGiro: string;
  posicaoArmazem: string;
}

export const MATRIZ_BLOCOS_CONFIG: Record<string, RegraBlocoLayout> = {
  'A': {
    bloco: 'Bloco A',
    ruas: ['A1', 'A2', 'A3', 'A4'],
    curvaIdeal: 'A',
    descricaoGiro: 'Alta Rotatividade / Curva A',
    posicaoArmazem: 'Mais próximo do Picking (Entrada A1 é a mais próxima, A4 a mais distante do Bloco A)'
  },
  'B': {
    bloco: 'Bloco B',
    ruas: ['B1', 'B2', 'B3', 'B4'],
    curvaIdeal: 'B',
    descricaoGiro: 'Médio Giro / Curva B',
    posicaoArmazem: 'Centro do Armazém'
  },
  'CB': {
    bloco: 'Bloco CB',
    ruas: ['CB1', 'CB2', 'CB3', 'CB4'],
    curvaIdeal: 'B',
    descricaoGiro: 'Intermediário / Transição',
    posicaoArmazem: 'Centro-Fundo do Armazém'
  },
  'C': {
    bloco: 'Bloco C',
    ruas: ['C1', 'C2', 'C3', 'C4'],
    curvaIdeal: 'C',
    descricaoGiro: 'Menor Giro / Curva C',
    posicaoArmazem: 'Final do Armazém (Mais distante do Picking)'
  }
};

/**
 * Retorna a pontuação de distância do Picking para uma determinada rua ou bloco.
 * Menor valor = Mais próximo do Picking.
 */
export function getDistanciaPickingScore(blocoRua: string): number {
  if (!blocoRua) return 50;
  const clean = blocoRua.trim().toUpperCase();

  if (clean.includes('PICKING')) return 0;

  // Ruas Bloco A (mais próximo)
  if (clean === 'A1') return 1; // Mais próxima da entrada do Picking
  if (clean === 'A2') return 2;
  if (clean === 'A3') return 3;
  if (clean === 'A4') return 4;
  if (clean === 'A') return 2.5;

  // Ruas Bloco B (centro)
  if (clean === 'B1') return 5;
  if (clean === 'B2') return 6;
  if (clean === 'B3') return 7;
  if (clean === 'B4') return 8;
  if (clean === 'B') return 6.5;

  // Ruas Bloco CB (transição)
  if (clean === 'CB1') return 9;
  if (clean === 'CB2') return 10;
  if (clean === 'CB3') return 11;
  if (clean === 'CB4') return 12;
  if (clean === 'CB') return 10.5;

  // Ruas Bloco C (final do armazém)
  if (clean === 'C1') return 13;
  if (clean === 'C2') return 14;
  if (clean === 'C3') return 15;
  if (clean === 'C4') return 16;
  if (clean === 'C') return 14.5;

  if (clean.includes('MARKETPLACE')) return 20;
  if (clean.includes('CONTINGÊNCIA') || clean.includes('CONTINGENCIA')) return 25;
  if (clean.includes('PNC')) return 99; // Bloqueado

  return 30;
}

/**
 * Retorna as informações do bloco e rua ideal com base na curva de vendas (A, B ou C).
 */
export function getBlocoIdealParaCurva(curva: string): {
  blocoIdeal: string;
  ruasRecomendadas: string[];
  descricao: string;
  distanciaIdealDesc: string;
} {
  const c = (curva || 'A').trim().toUpperCase();

  if (c === 'A') {
    return {
      blocoIdeal: 'Bloco A',
      ruasRecomendadas: ['A1', 'A2', 'A3', 'A4'],
      descricao: 'Produtos de Curva A (Alta Rotatividade) devem ficar no Bloco A, preferencialmente na Rua A1 (mais próxima do Picking).',
      distanciaIdealDesc: 'Próximo do Picking (A1 a A4)'
    };
  } else if (c === 'B') {
    return {
      blocoIdeal: 'Bloco B',
      ruasRecomendadas: ['B1', 'B2', 'B3', 'B4'],
      descricao: 'Produtos de Curva B (Médio Giro) devem ser posicionados no Bloco B, no centro do armazém.',
      distanciaIdealDesc: 'Centro do Armazém (B1 a B4)'
    };
  } else {
    return {
      blocoIdeal: 'Bloco C',
      ruasRecomendadas: ['C1', 'C2', 'C3', 'C4'],
      descricao: 'Produtos de Curva C (Menor Giro) devem ser estocados no Bloco C, no final do armazém.',
      distanciaIdealDesc: 'Final do Armazém (C1 a C4)'
    };
  }
}

export interface ResultadoValidacaoLayout {
  conforme: boolean;
  nivelRisco: 'OK' | 'ALERTA' | 'INCONFORME';
  distanciaScore: number;
  mensagem: string;
  sugestaoReagrupamento: string;
}

export interface QuebraFefoEstoqueXEstoque {
  codigo: string;
  descricao: string;
  ruaProxima: string;
  validadeRuaProxima: string;
  ruaDistante: string;
  validadeRuaDistante: string;
  diasInversao: number;
  caixasRuaProxima: number;
  caixasRuaDistante: number;
  nivel: 'INCONFORME' | 'ALERTA';
  mensagem: string;
  sugestaoAcao: string;
}

export interface QuebraFefoEstoqueXPicking {
  codigo: string;
  descricao: string;
  validadePicking: string;
  ruaEstoque: string;
  validadeEstoque: string;
  diasInversao: number;
  caixasPicking: number;
  caixasEstoque: number;
  nivel: 'INCONFORME' | 'ALERTA';
  mensagem: string;
  sugestaoAcao: string;
}

/**
 * Avalia a ordenação de FEFO entre a Área de Picking e o Estoque Central (Tolerância ZERO).
 * Se o produto no Picking tiver validade mais distante do vencimento (mais nova) do que no Estoque -> Quebra imediata!
 */
export function calcularQuebrasFefoEstoqueXPicking(rows: any[]): QuebraFefoEstoqueXPicking[] {
  const quebras: QuebraFefoEstoqueXPicking[] = [];

  const pickingPorCodigo: Record<string, any[]> = {};
  const estoquePorCodigo: Record<string, any[]> = {};

  (rows || []).forEach(row => {
    const loc = (row.localizacao || '').toLowerCase();
    const rua = (row.bloco || row.rua || '').trim();
    const isPicking = loc === 'picking' || rua.toLowerCase().includes('picking');
    const isPnc = loc === 'pnc' || rua.toLowerCase().includes('pnc');

    if (isPnc) return;

    const cod = String(row.codigo || '000').trim();

    if (isPicking) {
      if (!pickingPorCodigo[cod]) pickingPorCodigo[cod] = [];
      pickingPorCodigo[cod].push(row);
    } else {
      if (!estoquePorCodigo[cod]) estoquePorCodigo[cod] = [];
      estoquePorCodigo[cod].push(row);
    }
  });

  Object.entries(pickingPorCodigo).forEach(([cod, lotesPicking]) => {
    const lotesEstoque = estoquePorCodigo[cod];
    if (!lotesEstoque || lotesEstoque.length === 0) return;

    lotesPicking.forEach(loteP => {
      const dateP = new Date(loteP.validade);
      if (isNaN(dateP.getTime())) return;

      lotesEstoque.forEach(loteE => {
        const dateE = new Date(loteE.validade);
        if (isNaN(dateE.getTime())) return;

        // Inversão: Vencimento no Picking é MAIOR/POSTERIOR do que no Estoque (ou seja, produto mais velho está no Estoque e produto mais novo está no Picking).
        // Tolerância zero: qualquer diasInversao > 0!
        const diffMs = dateP.getTime() - dateE.getTime();
        const diasInversao = Math.round(diffMs / (1000 * 60 * 60 * 24));

        if (diasInversao > 0) {
          const ruaE = (loteE.bloco || loteE.rua || 'Estoque Central').trim().toUpperCase();
          quebras.push({
            codigo: cod,
            descricao: loteP.descricao || loteE.descricao || `Produto SKU ${cod}`,
            validadePicking: loteP.validade,
            ruaEstoque: ruaE,
            validadeEstoque: loteE.validade,
            diasInversao,
            caixasPicking: Number(loteP.caixa || loteP.quantidade || 1),
            caixasEstoque: Number(loteE.caixa || loteE.quantidade || 1),
            nivel: 'INCONFORME',
            mensagem: `🚨 Quebra de FEFO Estoque x Picking: Produto na Área Picking (validade ${loteP.validade}) é ${diasInversao} dia(s) MAIS NOVO que o produto na rua ${ruaE} do Estoque (validade ${loteE.validade}). Tolerância ZERO!`,
            sugestaoAcao: `Abastecer/repor prioritariamente a Área de Picking com o lote da rua ${ruaE} (vencimento em ${loteE.validade}).`
          });
        }
      });
    });
  });

  return quebras.sort((a, b) => b.diasInversao - a.diasInversao);
}

/**
 * Avalia todas as combinações de lotes do mesmo SKU estocados em ruas/blocos diferentes no Estoque Central.
 * Aplica a regra de FEFO Estoque x Estoque com tolerância de 7 dias (1 semana).
 * - Rua mais próxima do Picking (menor score, ex: A1) deveria vencer primeiro (data mais antiga).
 * - Se a rua mais distante (maior score, ex: A4) tiver data de vencimento menor (vence antes) do que a mais próxima:
 *   E a diferença for MAIOR QUE 7 DIAS -> Quebra de FEFO Estoque x Estoque!
 */
export function calcularQuebrasFefoEstoqueXEstoque(rows: any[]): QuebraFefoEstoqueXEstoque[] {
  const quebras: QuebraFefoEstoqueXEstoque[] = [];

  // Agrupar por SKU/código
  const porCodigo: Record<string, any[]> = {};

  (rows || []).forEach(row => {
    const loc = (row.localizacao || 'central').toLowerCase();
    const rua = (row.bloco || row.rua || '').trim();
    if (loc === 'pnc' || loc === 'picking' || !rua || rua.toUpperCase().includes('PNC')) {
      return; // PNC e Picking têm regras/paineis próprios
    }

    const cod = String(row.codigo || '000').trim();
    if (!porCodigo[cod]) porCodigo[cod] = [];
    porCodigo[cod].push(row);
  });

  // Para cada SKU com 2 ou mais lotes em ruas diferentes no estoque central:
  Object.entries(porCodigo).forEach(([cod, lotes]) => {
    if (lotes.length < 2) return;

    for (let i = 0; i < lotes.length; i++) {
      for (let j = i + 1; j < lotes.length; j++) {
        const loteA = lotes[i];
        const loteB = lotes[j];

        const ruaA = (loteA.bloco || loteA.rua || '').trim();
        const ruaB = (loteB.bloco || loteB.rua || '').trim();

        if (!ruaA || !ruaB || ruaA.toUpperCase() === ruaB.toUpperCase()) continue;

        const scoreA = getDistanciaPickingScore(ruaA);
        const scoreB = getDistanciaPickingScore(ruaB);

        if (scoreA === scoreB) continue;

        // Identificar qual rua é mais próxima do Picking (menor score) e qual é mais distante (maior score)
        const loteProximo = scoreA < scoreB ? loteA : loteB;
        const loteDistante = scoreA < scoreB ? loteB : loteA;

        const ruaProxima = (loteProximo.bloco || loteProximo.rua || '').trim().toUpperCase();
        const ruaDistante = (loteDistante.bloco || loteDistante.rua || '').trim().toUpperCase();

        const dateProximo = new Date(loteProximo.validade);
        const dateDistante = new Date(loteDistante.validade);

        if (isNaN(dateProximo.getTime()) || isNaN(dateDistante.getTime())) continue;

        // Inversão: Lote mais distante tem vencimento anterior (vence antes) do que a rua mais próxima
        // Ex: ruaProxima=A1 (validade=2026-10-30), ruaDistante=A4 (validade=2026-10-15)
        // dateProximo.getTime() - dateDistante.getTime() > 0
        const diffMs = dateProximo.getTime() - dateDistante.getTime();
        const diasInversao = Math.round(diffMs / (1000 * 60 * 60 * 24));

        // Regra de Tolerância de 7 Dias (1 semana):
        // Só marcar como quebra se a diferença for MAIOR que 7 dias!
        if (diasInversao > 7) {
          quebras.push({
            codigo: cod,
            descricao: loteProximo.descricao || loteDistante.descricao || `Produto SKU ${cod}`,
            ruaProxima,
            validadeRuaProxima: loteProximo.validade,
            ruaDistante,
            validadeRuaDistante: loteDistante.validade,
            diasInversao,
            caixasRuaProxima: Number(loteProximo.caixa || loteProximo.quantidade || 1),
            caixasRuaDistante: Number(loteDistante.caixa || loteDistante.quantidade || 1),
            nivel: diasInversao > 30 ? 'INCONFORME' : 'ALERTA',
            mensagem: `🚨 Quebra de FEFO Estoque x Estoque: Lote na rua ${ruaDistante} (mais distante do Picking) vence ${diasInversao} dias ANTES da rua ${ruaProxima} (mais próxima). Excede a tolerância de 7 dias!`,
            sugestaoAcao: `Girar/transferir prioritariamente o lote da rua ${ruaDistante} para o Picking ou inverter com a rua ${ruaProxima}.`
          });
        }
      }
    }
  });

  return quebras.sort((a, b) => b.diasInversao - a.diasInversao);
}

/**
 * Valida se a alocação do produto na rua/bloco respeita a Matriz de Correlação Bloco x Curva.
 */
export function validarPosicionamentoLayout(curvaProduto: string, blocoRuaAtual: string): ResultadoValidacaoLayout {
  const curva = (curvaProduto || 'A').trim().toUpperCase();
  const rua = (blocoRuaAtual || '').trim().toUpperCase();
  const score = getDistanciaPickingScore(rua);

  if (!rua || rua === 'NENHUM' || rua === 'N/A') {
    return {
      conforme: false,
      nivelRisco: 'ALERTA',
      distanciaScore: score,
      mensagem: 'Rua / Bloco não informado no cadastro de validade.',
      sugestaoReagrupamento: `Definir rua conforme Curva ${curva}.`
    };
  }

  // PNC é produto não conforme
  if (rua.includes('PNC')) {
    return {
      conforme: true,
      nivelRisco: 'OK',
      distanciaScore: 99,
      mensagem: 'Produto isolado na área de PNC (Bloqueado/Não Conforme).',
      sugestaoReagrupamento: 'Manter em PNC até tratativa de avaria/laudo.'
    };
  }

  // Curva A
  if (curva === 'A') {
    if (rua.startsWith('A') || rua.includes('PICKING')) {
      const detalheA1 = rua === 'A1' ? ' (Excelente: alocado na Rua A1, de acesso mais rápido!)' : '';
      return {
        conforme: true,
        nivelRisco: 'OK',
        distanciaScore: score,
        mensagem: `Correto: Produto Curva A no Bloco A (${rua})${detalheA1}.`,
        sugestaoReagrupamento: rua === 'A1' ? 'Manter posicionamento ideal.' : 'Priorizar reabastecimento via A1 se possível.'
      };
    } else if (rua.startsWith('B')) {
      return {
        conforme: false,
        nivelRisco: 'ALERTA',
        distanciaScore: score,
        mensagem: `Alerta de Layout: Produto Curva A (alta demanda) estocado no Bloco B (${rua}). Aumenta tempo de percurso até o Picking.`,
        sugestaoReagrupamento: 'Mover para Bloco A (Rua A1 ou A2) no próximo remanejamento.'
      };
    } else {
      return {
        conforme: false,
        nivelRisco: 'INCONFORME',
        distanciaScore: score,
        mensagem: `Inconformidade de Layout: Produto Curva A estocado no Fundo do Armazém (${rua}). Alto impacto na produtividade de separação!`,
        sugestaoReagrupamento: 'Mover URGENTE para o Bloco A (A1/A2).'
      };
    }
  }

  // Curva B
  if (curva === 'B') {
    if (rua.startsWith('B') || rua.startsWith('CB')) {
      return {
        conforme: true,
        nivelRisco: 'OK',
        distanciaScore: score,
        mensagem: `Correto: Produto Curva B alocado no Centro do Armazém (${rua}).`,
        sugestaoReagrupamento: 'Manter posicionamento.'
      };
    } else if (rua.startsWith('A')) {
      return {
        conforme: true,
        nivelRisco: 'OK',
        distanciaScore: score,
        mensagem: `Aceitável: Produto Curva B no Bloco A (${rua}).`,
        sugestaoReagrupamento: 'Liberar espaço para Curva A se houver saturação no Bloco A.'
      };
    } else {
      return {
        conforme: false,
        nivelRisco: 'ALERTA',
        distanciaScore: score,
        mensagem: `Aviso: Produto Curva B estocado no Fundo do Armazém (${rua}).`,
        sugestaoReagrupamento: 'Remanejar para o Bloco B quando conveniente.'
      };
    }
  }

  // Curva C (Menor Giro)
  if (curva === 'C') {
    if (rua.startsWith('C') || rua.startsWith('CB') || rua.includes('MARKETPLACE') || rua.includes('CONTINGÊNCIA')) {
      return {
        conforme: true,
        nivelRisco: 'OK',
        distanciaScore: score,
        mensagem: `Correto: Produto Curva C (baixo giro) estocado no Fundo do Armazém (${rua}).`,
        sugestaoReagrupamento: 'Manter no Bloco C para preservar as ruas A/B para itens de maior giro.'
      };
    } else if (rua.startsWith('A')) {
      return {
        conforme: false,
        nivelRisco: 'ALERTA',
        distanciaScore: score,
        mensagem: `Inconformidade de Espaço: Produto Curva C (menor giro) está ocupando o Bloco A (${rua}), área nobre do Picking!`,
        sugestaoReagrupamento: 'Remover do Bloco A e transferir para o Bloco C (ruas C1 a C4).'
      };
    } else {
      return {
        conforme: true,
        nivelRisco: 'OK',
        distanciaScore: score,
        mensagem: `Aceitável: Produto Curva C no Bloco B (${rua}).`,
        sugestaoReagrupamento: 'Transferir para Bloco C se necessitar liberar espaço no Bloco B.'
      };
    }
  }

  return {
    conforme: true,
    nivelRisco: 'OK',
    distanciaScore: score,
    mensagem: `Posicionamento registrado no local ${rua}.`,
    sugestaoReagrupamento: 'Monitorar giro.'
  };
}

/**
 * Compara dois blocos/ruas para determinar qual fica mais próximo do Picking.
 * Retorna número negativo se bloco1 é mais próximo, positivo se bloco2 é mais próximo, ou 0 se iguais.
 */
export function compararProximidadePicking(bloco1: string, bloco2: string): number {
  const score1 = getDistanciaPickingScore(bloco1);
  const score2 = getDistanciaPickingScore(bloco2);
  return score1 - score2;
}
