// Requirement 22: Central Historical & Retroactive Operations Data Manager

export type RetroactiveModule = 
  | 'validades'
  | 'efc_efd'
  | 'tmr_carretas'
  | 'picking'
  | 'despejo_repack'
  | 'quebras'
  | 'temperatura';

export const RETROACTIVE_MODULES_LIST: { id: RetroactiveModule; label: string; iconName: string; desc: string }[] = [
  { id: 'validades', label: 'Validades & FEFO (Ano)', iconName: 'Calendar', desc: 'SKU, Descrição, Lote, Validade, Qtd HL/CX e Localização' },
  { id: 'efc_efd', label: 'EFC & EFD (Empilhador)', iconName: 'Truck', desc: 'Placa, Empilhador, Hora Início e Hora Fim' },
  { id: 'tmr_carretas', label: 'TMR Carretas (Empilhador)', iconName: 'Clock', desc: 'Placa Carreta, Empilhador, Hora Início e Hora Fim' },
  { id: 'picking', label: 'Picking & Separação', iconName: 'Layers', desc: 'Código do Produto, Empilhador, Hora Início e Hora Fim' },
  { id: 'despejo_repack', label: 'Despejo & Repack (Ajudante)', iconName: 'UserCheck', desc: 'Registro de Ajudante: Processo/SKU, Qtd, Valor, Hora Início, Hora Fim, Obs' },
  { id: 'quebras', label: 'Quebras & Avarias', iconName: 'AlertCircle', desc: 'Lançamentos de Avarias e Quebras de Estoque' },
  { id: 'temperatura', label: 'Temperatura Armazém', iconName: 'FileSpreadsheet', desc: 'Registros de Leituras de Temperatura Termômetros' }
];

export interface RetroactiveRecord {
  id: string;
  modulo: RetroactiveModule;
  dataISO: string;
  dataFormatada: string;
  codigoProduto?: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  valorFinanceiro: number;
  operador: string;
  setor: string;
  status: 'Concluído'; // Always Concluído by requirement 22
  observacoes?: string;
  
  // Specialized operational fields for retroactive imports
  lote?: string;
  dataValidade?: string;
  localizacao?: string;
  placa?: string;
  empilhador?: string;
  colaboradorAjudante?: string;
  horaInicio?: string;
  horaFim?: string;
  duracaoMinutos?: number;
  rendimentoHLHora?: number;

  simuladoHistorico: true; // Does not affect live operational data
  criadoEm: string;
}

const STORAGE_KEY_RETROACTIVE = 'af_dados_retroativos_historicos_v3';

function generateInitialRetroactiveData(): RetroactiveRecord[] {
  const today = new Date().toISOString().split('T')[0];
  const dFmt = new Date().toLocaleDateString('pt-BR');

  return [
    // Validades sample
    {
      id: 'retro-val-1',
      modulo: 'validades',
      dataISO: '2026-01-15',
      dataFormatada: '15/01/2026',
      codigoProduto: '0001010',
      descricao: 'SKOL 600ML RETORNAVEL',
      quantidade: 450,
      unidade: 'CX',
      valorFinanceiro: 18000,
      operador: 'Carlos Silva (Analista FEFO)',
      setor: 'Rua B - Posição 04-12',
      lote: 'LOTE-2026-004',
      dataValidade: '2026-04-15',
      localizacao: 'RUA B / BL 04 / N2',
      status: 'Concluído',
      simuladoHistorico: true,
      criadoEm: new Date().toISOString()
    },
    // EFC / EFD sample
    {
      id: 'retro-efc-1',
      modulo: 'efc_efd',
      dataISO: '2026-02-01',
      dataFormatada: '01/02/2026',
      codigoProduto: 'SKU-EFC-504',
      descricao: 'Carregamento EFC - Carreta Bitrem',
      quantidade: 120,
      unidade: 'PALLETS',
      valorFinanceiro: 32000,
      operador: 'Marcos Empilhador',
      empilhador: 'Marcos Empilhador',
      placa: 'RLT5J54',
      horaInicio: '08:15',
      horaFim: '09:45',
      duracaoMinutos: 90,
      rendimentoHLHora: 80,
      setor: 'Doca 02',
      status: 'Concluído',
      simuladoHistorico: true,
      criadoEm: new Date().toISOString()
    },
    // TMR Carretas sample
    {
      id: 'retro-tmr-1',
      modulo: 'tmr_carretas',
      dataISO: '2026-02-10',
      dataFormatada: '10/02/2026',
      codigoProduto: 'TMR-00192',
      descricao: 'Atendimento TMR Permanência de Carreta',
      quantidade: 1,
      unidade: 'VIAGEM',
      valorFinanceiro: 45000,
      operador: 'Roberto Empilhador',
      empilhador: 'Roberto Empilhador',
      placa: 'QFG1259',
      horaInicio: '10:00',
      horaFim: '11:15',
      duracaoMinutos: 75,
      setor: 'Pátio Central',
      status: 'Concluído',
      simuladoHistorico: true,
      criadoEm: new Date().toISOString()
    },
    // Picking sample
    {
      id: 'retro-pic-1',
      modulo: 'picking',
      dataISO: '2026-02-18',
      dataFormatada: '18/02/2026',
      codigoProduto: '0009068',
      descricao: 'Separação e Abastecimento de Picking SKOL LATA 350ML',
      quantidade: 320,
      unidade: 'CX',
      valorFinanceiro: 12800,
      operador: 'Lucas Santos (Empilhador/Separador)',
      empilhador: 'Lucas Santos',
      horaInicio: '13:00',
      horaFim: '15:20',
      duracaoMinutos: 140,
      rendimentoHLHora: 137.1,
      setor: 'Pulmão Picking A',
      status: 'Concluído',
      simuladoHistorico: true,
      criadoEm: new Date().toISOString()
    },
    // Despejo & Repack (Ajudante) sample
    {
      id: 'retro-des-1',
      modulo: 'despejo_repack',
      dataISO: '2026-02-25',
      dataFormatada: '25/02/2026',
      codigoProduto: 'SKU-18836',
      descricao: 'Montagem de Repack - CORONA EXTRA 330ML',
      quantidade: 85,
      unidade: 'CX',
      valorFinanceiro: 4250,
      operador: 'João Pedro (Ajudante de Armazém)',
      colaboradorAjudante: 'João Pedro (Ajudante)',
      horaInicio: '08:00',
      horaFim: '10:30',
      duracaoMinutos: 150,
      setor: 'Bancada Repack 01',
      observacoes: 'Montagem conforme padrão operacional POP-04',
      status: 'Concluído',
      simuladoHistorico: true,
      criadoEm: new Date().toISOString()
    }
  ];
}

export function getRetroactiveRecords(moduleFilter?: RetroactiveModule | 'todos'): RetroactiveRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RETROACTIVE);
    let all: RetroactiveRecord[] = [];
    if (!raw) {
      all = generateInitialRetroactiveData();
      localStorage.setItem(STORAGE_KEY_RETROACTIVE, JSON.stringify(all));
    } else {
      all = JSON.parse(raw);
    }

    if (moduleFilter && moduleFilter !== 'todos') {
      return all.filter(r => r.modulo === moduleFilter);
    }
    return all;
  } catch (e) {
    return generateInitialRetroactiveData();
  }
}

export function saveRetroactiveRecords(records: RetroactiveRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_RETROACTIVE, JSON.stringify(records));
  } catch (e) {
    console.error('Erro ao salvar dados retroativos:', e);
  }
}

export function upsertRetroactiveRecord(record: RetroactiveRecord): void {
  const all = getRetroactiveRecords('todos');
  const idx = all.findIndex(r => r.id === record.id);
  if (idx >= 0) {
    all[idx] = record;
  } else {
    all.unshift(record);
  }
  saveRetroactiveRecords(all);
}

export function deleteRetroactiveRecord(id: string): void {
  const all = getRetroactiveRecords('todos');
  const updated = all.filter(r => r.id !== id);
  saveRetroactiveRecords(updated);
}

export function clearRetroactiveModule(moduleKey: RetroactiveModule): void {
  const all = getRetroactiveRecords('todos');
  const filtered = all.filter(r => r.modulo !== moduleKey);
  saveRetroactiveRecords(filtered);
}
