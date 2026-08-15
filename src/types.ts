export interface Empresa {
  id: string;
  nome: string;
  razaoSocial?: string;
  cidade: string;
  estado: string;
  plano?: string;
  modulos: string[];
  modulosAtivos?: Record<string, boolean>;
  criadoEm?: any;
  ativo: boolean;
  backupConfig?: {
    semanalAutomatico: boolean;
    ultimoBackup?: string;
  };
}

export interface Usuario {
  uid: string;
  nome: string;
  email: string;
  empresaId: string;
  papel: 'admin' | 'supervisor' | 'operador' | string;
  cargo?: string;
  matricula?: string;
  modulosPermitidos?: string[];
  status: 'ativo' | 'inativo';
  criadoEm?: any;
  mfaHabilitado?: boolean;
  mfaSegredo?: string;
  isControle?: boolean;
}

export interface RepackRow {
  _docId?: string;
  id?: string;
  empresaId?: string;
  data: string;
  dataISO: string;
  hora?: string;
  embalagem: string;
  metaEmbalagem?: number;
  caixasReembaladas?: number;
  caixas?: number;
  quantidade: number;
  inicio: string;
  fim: string;
  duracao: string;
  meta: string;
  resultado: string;
  operador?: string;
  motivoNaoBaterMeta?: string;
  _criadoEm?: string;
  tratativaGestor?: string;
  tratativaData?: string;
  tratativaResponsavel?: string;
}

export interface RepackValidadeRow {
  _docId?: string;
  empresaId?: string;
  id: number;
  codigo: string;
  descricao: string;
  quantidade: number;
  validade: string;
  localizacao: string; // 'repack' or manually typed value
  nomeManual?: string;
  cadastradoEm?: string;
  operador?: string;
}

export interface DespejoRow {
  _docId?: string;
  id?: string;
  empresaId?: string;
  data: string;
  dataISO: string;
  embalagem: string;
  metaEmbalagem?: number;
  quantidade: number;
  inicio: string;
  fim: string;
  tempo: string;
  duracao?: number | string;
  meta: string;
  resultado: string;
  status?: string;
  motivo?: string;
  aproveitado?: number | boolean;
  operador?: string;
  _criadoEm?: string;
  tratativaGestor?: string;
  tratativaData?: string;
  tratativaResponsavel?: string;
}

export interface ArmazemRow {
  _docId?: string;
  empresaId?: string;
  operacao: string;
  data: string;
  dataISO: string;
  inicio: string;
  fim: string;
  status: string;
  empilhador: string;
  turno: string;
  placa: string;
  tipo: string;
  palhete: number;
  ocupado?: boolean;
  pernoite?: '' | 'D0' | 'D1' | 'D2' | 'D3' | 'D4';
  obs?: string;
  _criadoEm?: string;
}

export interface QuebraRow {
  _docId?: string;
  id?: string;
  empresaId?: string;
  data: string;
  dataISO: string;
  mes?: string;
  codProduto: string;
  descricao: string;
  quantidade: number;
  caixas?: number;
  fatorHl?: number;
  hlPerdido?: number;
  tipoMarca?: string;
  embalagem?: string;
  area: string;
  turno: string;
  codQuebra: string;
  motivo: string;
  valor?: number;
  valorUnitario?: number;
  valorTotal?: number;
  colaboradorQuebrou?: string;
  responsavel?: string;
  funcao?: string;
  fiscal?: string;
  wqi?: string;
  _criadoEm?: string;
}

export interface ValidadeRow {
  _docId?: string;
  id?: number | string;
  empresaId?: string;
  codigo: string;
  descricao: string;
  palhete: number;
  lastro: number;
  caixa: number;
  quantidade?: number;
  validade: string;
  diasParaVencer?: number;
  localizacao: 'central' | 'pnc' | 'repack' | 'picking' | 'marketplace' | string;
  bloco?: string;
  lote?: string;
  responsavel?: string;
  dataColeta?: string;
  dataTransferenciaPnc?: string;
  totalUnities?: number;
  totalUnitiesRaw?: number;
  valorTotal?: number;
  hlTotal?: number;
  cadastradoEm?: string;
  _criadoEm?: string;
}

export interface BlitzRefugoRow {
  _docId?: string;
  empresaId?: string;
  placa: string;
  ajudante: string;
  data: string;
  dataISO: string;
  mapa?: string;
  rota?: string;
  obs?: string;
  fiscal?: string;
  totalGeralAmostrado?: number;
  totalGeralRefugado?: number;
  emb: {
    [key: string]: {
      caixas: number;
      aferido: number;
      fator: number;
      [defeito: string]: number;
    }
  };
  totalCaixas: number;
  totalAferido: number;
  totalDef: number;
  pctRefugo: number;
  _criadoEm?: string;
}

export interface Tarefa {
  _docId?: string;
  empresaId?: string;
  id: number;
  codigo: number;
  descricao: string;
  quantidade: number;
  quantidadePaletes?: number;
  caixas?: number;
  conferente: string;
  operador: string;
  operadoresAtribuidos?: string[];
  status: 'pending' | 'in_progress' | 'done';
  criadoEm: string;
  iniciadoEm: string | null;
  finalizadoEm: string | null;
  duracaoMin: number | null;
  tempoExecucao?: number;
  tipoOperacao?: string;
  locData?: {
    distanciaM: number;
    totalIdleSec: number;
    segmentosParado: number;
    mapsLink?: string;
    totalLeituras: number;
  } | null;
}

export interface ActivityLog {
  _docId?: string;
  titulo: string;
  descricao: string;
  uid: string;
  nome: string;
  ts: any; // ts is Firestore Timestamp
}

export interface RepackActionPlan {
  _docId?: string;
  empresaId?: string;
  dataCriacao?: string;
  dataCriacaoISO?: string;
  descricao: string;
  causaRaiz4M: 'Método' | 'Mão de Obra' | 'Máquina' | 'Material';
  responsavel: string;
  prazo: string;
  status: 'Pendente' | 'Em Andamento' | 'Concluído';
  _criadoEm?: string;
}

export interface RepackA3Board {
  _docId?: string;
  empresaId: string;
  dashboard?: string; // e.g. 'repack', 'despejo', 'logistica', 'quebras', 'fefo', 'blitz'
  titulo: string;
  dataCriacaoISO: string;
  
  // Step 1: Detalhes do Problema
  problemaDesc: string;
  problemaImpacto: string;
  problemaCausa: string;
  problemaEvidencias: string;
  
  // Step 2: Plano de Ação
  actions: {
    acao: string;
    responsavel: string;
    prazo: string;
    status: 'Pendente' | 'Em Andamento' | 'Bloqueado' | 'Concluído';
    pct: number;
  }[];
  recursos: string;
  comentarios: string;
  
  // Step 4: Conclusão
  concluidas: string;
  aprendizados: string;
  padronizacao: string;
  
  // Step 5: Resultados
  resultadosDesc: string;
  indicadores: {
    indicador: string;
    antes: string;
    depois: string;
    variacao: string;
  }[];
  impactoNegocio: string;
  
  proximosPassos: string;
  dataRevisao: string;
  _criadoEm?: string;
}

export interface ProdutoMaster {
  _docId?: string;
  empresaId?: string;
  codigo: string;
  descricao: string;
  fator: number;
  valor: number;
  preco?: number;
  vendaMedia?: number;
  fatorHecto: number;
  grupo: string;
  curva: 'A' | 'B' | 'C' | string;
  idade?: number;
  fatorPallet?: number;
  embalagem?: string;
  _criadoEm?: string;
}

export interface ColaboradorMaster {
  _docId?: string;
  empresaId?: string;
  matricula: string;
  nome: string;
  cpf?: string;
  cargo: string;
  turno?: string;
  senha?: string;
  ativo?: boolean;
  modulosPermitidos?: string[];
  primeiroAcesso?: boolean;
  _criadoEm?: string;
}

export interface AcessoColaborador {
  _docId?: string;
  empresaId?: string;
  matricula: string;
  nomeColaborador?: string;
  modulosPermitidos: string[];
  _criadoEm?: string;
}

export interface TmrDemand {
  _docId?: string;
  id: string;
  empresaId: string;
  carreta: string; // Placa da carreta/caminhão
  revendaNome: string; // Revenda de destino
  tipoCarga: 'TMR Revenda' | 'Carreta Transbordo' | 'Recarga' | 'Terceiros' | string;
  tipoDemanda?: string;
  tipoPlaca?: 'casa' | 'terceiros';
  isTerceiros?: boolean;
  instrucoes?: string;
  
  // Quantidades de pallets/ativos por tipo
  palletsLitrinho: number;
  palletsLitrao: number;
  pallets600Verde: number;
  pallets600Ambar: number;
  palletsBarrilChopp?: number;
  palletsPbr1?: number;
  palletsPbr2?: number;
  palletsPbr: number;
  totalPallets: number;
  
  conferente: string;
  operadorDesignado?: string;
  operadoresAtribuidos?: string[];
  operadorExecutor?: string; // Nome do usuário logado que realizou
  
  status: 'pending' | 'in_progress' | 'done';
  criadoEm: string;
  dataHoraCriacao?: string;
  iniciadoEm?: string | null;
  dataHoraInicio?: string | null;
  finalizadoEm?: string | null;
  dataHoraFim?: string | null;
  duracaoMin?: number | null;
  tempoTotalMinutos?: number | null;
}

export interface FefoRelocationDemand {
  _docId?: string;
  id: string;
  empresaId: string;
  tipoQuebra: 'estoque_x_picking' | 'estoque_x_estoque';
  codigo: string;
  descricao: string;
  ruaOndeEsta: string;
  ruaOndePrecisaEstar: string;
  validadeLoteInconforme: string;
  validadeLoteComparado?: string;
  diasInversao: number;
  mensagem: string;
  sugestaoAcao: string;
  status: 'pending' | 'in_progress' | 'done';
  solicitadoPorConferente?: boolean;
  solicitadoPor?: string;
  solicitadoEm?: string;
  operadorDesignado?: string;
  operadoresAtribuidos?: string[];
  operadorExecutor?: string;
  criadoEm: string;
  iniciadoEm?: string | null;
  finalizadoEm?: string | null;
  duracaoMin?: number | null;
}

export interface ArmazemTemperaturaLog {
  id: string;
  dataISO: string;
  dataFormatted: string;
  mesAno: string;
  hora: string;
  temperatura: number;
  umidade: number;
  setor: string;
  conferenteNome: string;
  observacao?: string;
  alertaCritico: boolean;
  registradoPor?: string;
  cargoUsuario?: string;
}



