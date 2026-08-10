export type AreaContagem = 'central' | 'picking' | 'marketplace' | 'todas';

export interface ContagemRecord {
  id: string;
  codigo: number;
  produto: string;
  quantidade: number;
  area: 'central' | 'picking' | 'marketplace';
  lote?: string;
  validade?: string;
  importadoEm: string;
  importId: string;
}

export interface ImportLog {
  id: string;
  dataHora: string;
  area: 'central' | 'picking' | 'marketplace';
  nomeArquivo: string;
  totalLinhas: number;
  aceitos: number;
  rejeitados: number;
  usuario: string;
  erros?: string[];
}

export interface ContingenciaItem {
  id: string;
  codigo: number;
  produto: string;
  quantidade: number;
  motivo: string;
  usuario: string;
  data: string;
  hora: string;
  criadoEm: string;
  unidade?: string;
}

export interface ContingenciaMovimentacao {
  id: string;
  itemId: string;
  codigo: number;
  produto: string;
  tipo: 'insercao' | 'edicao' | 'remocao';
  quantidadeAntiga?: number;
  quantidadeNova: number;
  motivo: string;
  usuario: string;
  data: string;
  hora: string;
}

export interface VendaMediaItem {
  codigo: number;
  produto: string;
  vendaMediaDiaria: number;
  precoUnitario: number;
  familia: string;
  marca: string;
  setor: string;
  atualizadoEm: string;
}

export interface ImportVendaMediaLog {
  id: string;
  dataHora: string;
  nomeArquivo: string;
  totalLinhas: number;
  aceitos: number;
  rejeitados: number;
  usuario: string;
  erros?: string[];
}

export type CriticidadeEstoque = '🟢 Adequado' | '🟡 Atenção' | '🟠 Crítico' | '🔴 Ruptura';

export interface EstoqueDisponivel0205Item {
  codigo: number;
  produto: string;
  qtdSkuFechado: number;      // soma do lado esquerdo da "/"
  qtdUnidadeAvulsa: number;   // soma do lado direito da "/"
  qtdTotalCx: number;         // qtdSkuFechado + (qtdUnidadeAvulsa / fator)
  valorTotal: number;         // ver fórmula item 4
  hectoTotal: number;         // qtdTotalCx * fatorHecto
  atualizadoEm: string;
}

export interface ImportEstoqueDisponivelLog {
  id: string;
  dataHora: string;
  nomeArquivo: string;
  totalLinhas: number;
  aceitos: number;
  rejeitados: number;
  usuario: string;
  erros?: string[];
}

export interface PoliticaEstoqueCalculada {
  codigo: number;
  produto: string;
  familia: string;
  marca: string;
  setor: string;
  vendaMediaDiaria: number;
  estoqueCentral: number;
  estoquePicking: number;
  estoqueMarketplace: number;
  estoqueContingencia: number;
  estoqueAtualTotal: number; // Qtd SKU Fechado
  qtdSkuFechado: number;
  qtdUnidadeAvulsa: number;
  valorTotalComAvulso: number;
  estoqueIdeal: number; // vendaMediaDiaria * 6
  coberturaDias: number; // estoqueAtualTotal / vendaMediaDiaria
  status: 'sobre_estoque' | 'abaixo_politica' | 'adequado' | 'atencao' | 'critico' | 'ruptura';
  criticidade: CriticidadeEstoque;
  excessoQtd: number;
  excessoValor: number;
  excessoDias: number;
  faltaQtd: number;
  faltaValor: number;
  faltaDias: number;
  precoUnitario: number;
  hectoTotal?: number;
  grupo?: string;
  curvaABC?: string;
  recomendacao: string;
  acaoRecomendada: 'reabastecer_picking' | 'transferir_central_picking' | 'remanejar' | 'suspender_abastecimento' | 'compras_urgentes' | 'manter';
}

export interface EstoqueInicial021101Record {
  codigo: number;
  produto: string;
  quantidadeInicial: number;
  fixadoEm: string;
  fixadoPor: string;
}

export interface PosicaoPallet021101Item {
  id: string;
  areaId: number; // 1 = Armazém Central, 2 = Picking, 3 = Marketplace, 4 = Contingência, 5 = Pulmão, 6 = PNC
  areaNome: 'Armazém Central' | 'Picking' | 'Marketplace' | 'Contingência' | 'Pulmão' | 'PNC';
  codigo: number; // Coluna C
  produto: string; // Descrição
  qtdFisicaCaixas: number; // Coluna J (quantidade de caixas)
  qtdPallet: number; // Coluna K (pallets fechados)
  qtdLastro: number; // Coluna L / Ç (quantidade de lastro)
  posicoesPalletOcupadas: number; // Posicios de pallet (no picking lastro > 0 ocupa 1 posicao)
  hectolitros: number; // Coluna J * Fator Hectolitro do SKU (0 se sem fator)
  fatorHecto?: number;
  temFatorHecto?: boolean;
  importadoEm: string;
}

export interface ImportPosicaoPalletLog {
  id: string;
  dataHora: string;
  nomeArquivo: string;
  totalLinhas: number;
  aceitos: number;
  rejeitados: number;
  usuario: string;
  totalPalletsCalculado: number;
  totalHectolitrosCalculado: number;
  produtosSemFatorCount?: number;
  erros?: string[];
}

export interface CapacidadeAreaMetrica {
  areaId: number;
  areaNome: 'Armazém Central' | 'Picking' | 'Marketplace' | 'Contingência' | 'Pulmão' | 'PNC' | 'Total Armazém';
  palletsMeta: number;
  palletsReal: number;
  palletsAtingimentoPct: number;
  hectolitrosMeta: number;
  hectolitrosReal: number;
  hectolitrosAtingimentoPct: number;
}

export interface SaidaDiaria020304Record {
  codigo: number;
  produto: string;
  quantidadeSaida: number;
  palletsFechados: number;
  caixasAvulsas: number;
  requerPrePickingPallet: boolean;
  importadoEm: string;
}

