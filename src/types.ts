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
  status: 'ativo' | 'inativo';
  criadoEm?: any;
  mfaHabilitado?: boolean;
  mfaSegredo?: string;
  isControle?: boolean;
}

export interface RepackRow {
  _docId?: string;
  empresaId?: string;
  data: string;
  dataISO: string;
  embalagem: string;
  quantidade: number;
  inicio: string;
  fim: string;
  duracao: string;
  meta: string;
  resultado: string;
  operador?: string;
  _criadoEm?: string;
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
  empresaId?: string;
  data: string;
  dataISO: string;
  embalagem: string;
  quantidade: number;
  inicio: string;
  fim: string;
  tempo: string;
  meta: string;
  resultado: string;
  operador?: string;
  _criadoEm?: string;
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
  obs?: string;
  _criadoEm?: string;
}

export interface QuebraRow {
  _docId?: string;
  empresaId?: string;
  data: string;
  dataISO: string;
  codProduto: string;
  descricao: string;
  quantidade: number;
  area: string;
  turno: string;
  codQuebra: string;
  motivo: string;
  _criadoEm?: string;
}

export interface ValidadeRow {
  _docId?: string;
  empresaId?: string;
  id: number;
  codigo: string;
  descricao: string;
  palhete: number;
  lastro: number;
  caixa: number;
  validade: string;
  localizacao: 'picking' | 'central';
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
  conferente: string;
  operador: string;
  status: 'pending' | 'in_progress' | 'done';
  criadoEm: string;
  iniciadoEm: string | null;
  finalizadoEm: string | null;
  duracaoMin: number | null;
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


