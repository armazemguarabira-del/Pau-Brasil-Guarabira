import { db } from '../firebase';
import { collection, doc, getDocs, setDoc, deleteDoc, query, where, orderBy, onSnapshot } from 'firebase/firestore';

export interface AcaoDesvioItem {
  id: string;
  empresaId?: string;
  data: string; // DD/MM/YYYY
  dataISO: string; // YYYY-MM-DD
  hora: string; // HH:MM
  turno: 'MANHÃ' | 'TARDE' | 'NOITE' | 'ADMINISTRATIVO';
  
  // Identificação do Desvio e Gatilho
  processo: string; // Repack, Picking, Despejo, EFC, EFD, Quebras, FEFO, Ressuprimento, TMR, 5S, Carretas, etc.
  setor: string;
  indicador: string;
  meta: string;
  resultadoObtido: string;
  desvioEncontrado: string;
  tipoGatilho: string; // Estouro de TMR, Limite de Quebra, Atraso de Doca, FEFO Crítico, Divergência de Inventário, Inconformidade 5S, etc.
  severidade: 'Crítica (P1)' | 'Alta (P2)' | 'Média (P3)';
  
  // Contenção Imediata (D0)
  contencaoImediata: string;
  responsavelContencao: string;
  
  // Análise de Causa Raiz
  causaRaiz4M: 'Método' | 'Mão de Obra' | 'Máquina' | 'Material' | 'Meio Ambiente' | 'Medição';
  cincoPorques: {
    pq1: string;
    pq2: string;
    pq3: string;
    pq4: string;
    pq5: string;
  };
  
  // Plano de Ação 5W2H (Contramedida)
  oQueFazer: string; // Contramedida definitiva
  responsavelTratativa: string;
  prazo: string; // YYYY-MM-DD
  ondeLocal: string;
  comoExecutar: string;
  
  // Status e Validação
  status: 'Pendente' | 'Em Andamento' | 'Concluído' | 'Validado / Eficaz' | 'Reaberto';
  eficazValidado?: boolean;
  observacoesValidacao?: string;
  
  // Auditoria
  abertoPor: string;
  criadoEm: string;
  atualizadoEm?: string;
  
  // Detalhes opcionais (produto/lote para FEFO/Quebra)
  produto?: string;
  codigoProduto?: string;
  lote?: string;
  validade?: string;
  impactoFinanceiro?: number;
}

export interface AcaoMelhoriaItem {
  id: string;
  empresaId?: string;
  data: string; // DD/MM/YYYY
  dataISO: string; // YYYY-MM-DD
  hora: string; // HH:MM
  
  // Contexto Ritual / Reunião TOR
  reuniaoTOR: 'Reunião Diária de Operação (RDP)' | 'Reunião Semanal de Indicadores (RPS)' | 'Comitê de Qualidade / DPO' | 'Reunião Mensal de Resultados (RMR)' | 'Workshop Kaizen / Ideia de Melhoria' | 'Auditoria & 5S';
  pilarDPO: 'Armazém' | 'Qualidade' | 'Produtividade' | 'Segurança' | 'Manutenção' | 'Gestão de Estoque' | 'Gente & Gestão';
  processo: string;
  setor: string;
  dataProximoAcompanhamento: string; // YYYY-MM-DD
  
  // Oportunidade e Objetivo
  tituloMelhoria: string;
  oportunidadeIdentificada: string;
  indicadorBeneficiado: string;
  metaMelhoria: string;
  ganhoEsperado: string;
  
  // Plano 5W2H
  oQueSeraFeito: string;
  responsavelPrincipal: string;
  prazoImplantacao: string; // YYYY-MM-DD
  comoSeraFeito: string;
  recursosNecessarios?: string;
  
  // Acompanhamento e Status TOR
  statusTOR: 'Planejada' | 'Em Execução' | 'Em Teste Piloto' | 'Concluída' | 'Padronizada no POP';
  percentualConcluido: number; // 0 a 100
  feedbackGestao?: string;
  
  // Auditoria
  registradoPor: string;
  criadoEm: string;
  atualizadoEm?: string;
}

const STORAGE_KEY_DESVIOS = 'af_acoes_desvios_gatilhos_v1';
const STORAGE_KEY_MELHORIAS = 'af_acoes_melhorias_tor_v1';

// Seed Inicial de Desvios (Ocorrências e Gatilhos)
const SEED_DESVIOS: AcaoDesvioItem[] = [
  {
    id: 'desvio-gat-01',
    data: '15/08/2026',
    dataISO: '2026-08-15',
    hora: '14:20',
    turno: 'MANHÃ',
    processo: 'Quebras',
    setor: 'Armazém Central - Rua 04',
    indicador: 'Índice de Quebras Internas',
    meta: '< 0.08% das caixas manipuladas',
    resultadoObtido: '0.22% (Estouro de Gatilho de Alerta)',
    desvioEncontrado: 'Queda de 3 caixas de garrafa 600ml retornável durante manobra de curva da empilhadeira no corredor 4.',
    tipoGatilho: 'Estouro de Teto de Quebra (> 0.15%)',
    severidade: 'Crítica (P1)',
    contencaoImediata: 'Isolamento da rua, limpeza imediata dos cacos de vidro para evitar cortes/avaria de pneus e registro de refugo no sistema.',
    responsavelContencao: 'JOSE RONILDO DA SILVA',
    causaRaiz4M: 'Método',
    cincoPorques: {
      pq1: 'Por que o palete tombou? Porque a amarração de filme stretch estava frouxa nas 2 últimas fiadas.',
      pq2: 'Por que estava frouxa? Porque o operador de embalagem não aplicou a tensão adequada do aplicador.',
      pq3: 'Por que não aplicou? Porque o rolo estava no final e o suporte manual travou.',
      pq4: 'Por que travou? Porque não havia lubrificação preventiva no rolamento do aplicador manual.',
      pq5: 'Por que não foi lubrificado? Falta de checklist de 5S semanal para ferramentas de envolvimento.'
    },
    oQueFazer: 'Revisar e lubrificar todos os aplicadores manuais de filme stretch e incluir no checklist 5S diário.',
    responsavelTratativa: 'MARIVALDO ARTUR ALVES',
    prazo: '2026-08-20',
    ondeLocal: 'Armazém Central - Ponto de Estiramento',
    comoExecutar: 'Treinamento de 10 min com equipe de montagem sobre padrão de amarração de 4 voltas na base e 3 no topo.',
    status: 'Em Andamento',
    abertoPor: 'NIXON HENRIQUE PEREIRA DE ARRUDA (ADMINISTRATIVO)',
    criadoEm: '2026-08-15T14:25:00.000Z',
    produto: 'Skol Pilsen 600ml Retornável',
    codigoProduto: '21004',
    lote: 'L260814B',
    impactoFinanceiro: 168.50
  },
  {
    id: 'desvio-gat-02',
    data: '14/08/2026',
    dataISO: '2026-08-14',
    hora: '19:45',
    turno: 'TARDE',
    processo: 'TMR',
    setor: 'Doca de Descarga 02',
    indicador: 'Tempo Médio de Revenda (Carretas)',
    meta: '< 1h 10min (70 min)',
    resultadoObtido: '1h 55min (115 min)',
    desvioEncontrado: 'Tempo de descarga da carreta de fábrica excedeu o limite máximo em 45 minutos por divergência de lote no manifesto.',
    tipoGatilho: 'Estouro de Gatilho TMR Carretas (> 90 min)',
    severidade: 'Alta (P2)',
    contencaoImediata: 'Liberação provisória do caminhão com conferência em doca pulmão e conferente dedicado.',
    responsavelContencao: 'CICERO MATHEU DE OLIVEIRA SILVA',
    causaRaiz4M: 'Material',
    cincoPorques: {
      pq1: 'Por que atrasou? Porque a nota fiscal veio com 2 lotes diferentes do que estava fisicamente no baú.',
      pq2: 'Por que veio diferente? Porque a expedição da fábrica substituiu o palete no último minuto sem refaturar.',
      pq3: 'Por que o conferente parou a descarga? Procedimento exigia validação antes de descarregar o restante.',
      pq4: 'Por que a validação demorou? Falta de canal direto com o controle de expedição da unidade produtora.',
      pq5: 'Por que não havia canal rápido? Processo de comunicação de divergência era via e-mail formal lento.'
    },
    oQueFazer: 'Instituir protocolo de escalonamento via WhatsApp Business com o supervisor de fábrica para liberação em até 10 minutos.',
    responsavelTratativa: 'DJEANDERSON SOARES DO NASCIMENTO',
    prazo: '2026-08-18',
    ondeLocal: 'Docas de Recebimento',
    comoExecutar: 'Alinhamento com a equipe de suprimentos e envio de ATA de acordo operacional com a fábrica.',
    status: 'Validado / Eficaz',
    eficazValidado: true,
    observacoesValidacao: 'Tempo de liberação de divergências caiu para 7 minutos nos 3 últimos testes.',
    abertoPor: 'ALECYA CRISTINA FLORENCIO FERREIRA',
    criadoEm: '2026-08-14T20:00:00.000Z'
  },
  {
    id: 'desvio-gat-03',
    data: '13/08/2026',
    dataISO: '2026-08-13',
    hora: '09:15',
    turno: 'MANHÃ',
    processo: 'Gestão FEFO',
    setor: 'Pulmão Aéreo - Endereço B-12',
    indicador: 'Lotes em Faixa Amarela / Risco de Vencimento',
    meta: '0 Lotes Críticos (< 30 dias) sem plano de puxada',
    resultadoObtido: '2 Paletes de Corona 330ml com 18 dias para o vencimento identificados em endereço aéreo',
    desvioEncontrado: 'Palete com data mais curta permaneceu no aéreo enquanto picking recebia lotes com 45 dias de validade (Inversão FEFO).',
    tipoGatilho: 'Alerta Crítico FEFO (Semáforo Vermelho)',
    severidade: 'Crítica (P1)',
    contencaoImediata: 'Descentralização imediata dos 2 paletes direto para a frente de picking com etiqueta de prioridade de saída.',
    responsavelContencao: 'PAULO PEREIRA DA SILVA',
    causaRaiz4M: 'Método',
    cincoPorques: {
      pq1: 'Por que o palete não desceu antes? Porque o empilhador reabasteceu com o palete mais próximo do solo.',
      pq2: 'Por que pegou o mais próximo? Porque a identificação visual de semáforo amarelo havia caído.',
      pq3: 'Por que a etiqueta caiu? A fita adesiva perdeu aderência com a umidade do ambiente.',
      pq4: 'Por que o sistema não alertou no coletor? A rotina de sugestão automática de FEFO estava desativada no perfil do operador.',
      pq5: 'Por que estava desativada? Parâmetro de roteirização por proximidade estava sobrepondo o critério FEFO.'
    },
    oQueFazer: 'Reconfigurar parâmetro de ressuprimento do sistema para bloquear ressuprimento fora da ordem estrita de validade.',
    responsavelTratativa: 'KATHYEL ROCHA DA SILVA',
    prazo: '2026-08-17',
    ondeLocal: 'Rua de Picking e Aéreo 02',
    comoExecutar: 'Atualização das regras de alocação no WMS e verificação de 100% dos endereços aéreos com lotes menores de 30 dias.',
    status: 'Em Andamento',
    abertoPor: 'NIXON HENRIQUE PEREIRA DE ARRUDA (ADMINISTRATIVO)',
    criadoEm: '2026-08-13T09:30:00.000Z',
    produto: 'Corona Extra Long Neck 330ml',
    codigoProduto: '18552',
    lote: 'L180726A',
    validade: '31/08/2026'
  }
];

// Seed Inicial de Ações de Melhoria (TOR e Reuniões de Rotina)
const SEED_MELHORIAS: AcaoMelhoriaItem[] = [
  {
    id: 'melhoria-tor-01',
    data: '12/08/2026',
    dataISO: '2026-08-12',
    hora: '08:30',
    reuniaoTOR: 'Reunião Diária de Operação (RDP)',
    pilarDPO: 'Produtividade',
    processo: 'Picking',
    setor: 'Corredor Central de Picking',
    dataProximoAcompanhamento: '2026-08-19',
    tituloMelhoria: 'Otimização do Layout de Picking por Curva ABC (Giro Rápido no Ponto Zero)',
    oportunidadeIdentificada: 'Operadores de picking percorrem em média 420 metros a mais por rota por terem produtos de alto giro (Brahma 350ml e Skol 350ml) no final da rua.',
    indicadorBeneficiado: 'Caixas Separadas por Homem/Hora (Picking Rate)',
    metaMelhoria: 'Elevar produtividade de 145 para 175 caixas/homem-hora (+20%)',
    ganhoEsperado: 'Redução de 35 minutos no tempo de montagem de rotas e menor desgaste físico dos ajudantes.',
    oQueSeraFeito: 'Relocar os 6 SKUs de maior giro para os primeiros módulos da rua de picking (posições 01 a 06).',
    responsavelPrincipal: 'MATEUS HENRIQUE DE SOUZA',
    prazoImplantacao: '2026-08-22',
    comoSeraFeito: 'Mapeamento volumétrico no sábado com empilhadores para movimentação física dos paletes e atualização do mapa no sistema.',
    recursosNecessarios: '1 Turno extra de empilhador e 2 operadores de conferência no final de semana.',
    statusTOR: 'Em Execução',
    percentualConcluido: 65,
    feedbackGestao: 'Pauta acompanhada na RDP. 4 dos 6 produtos já foram remanejados com ganho preliminar de 12% em velocidade.',
    registradoPor: 'NIXON HENRIQUE PEREIRA DE ARRUDA (ADMINISTRATIVO)',
    criadoEm: '2026-08-12T09:00:00.000Z'
  },
  {
    id: 'melhoria-tor-02',
    data: '10/08/2026',
    dataISO: '2026-08-10',
    hora: '10:00',
    reuniaoTOR: 'Reunião Semanal de Indicadores (RPS)',
    pilarDPO: 'Qualidade',
    processo: 'Repack',
    setor: 'Bancada 01 e 02 de Reembalagem',
    dataProximoAcompanhamento: '2026-08-17',
    tituloMelhoria: 'Padronização da Bancada Ergonômica de Repack com Suporte Pneumático de Fita',
    oportunidadeIdentificada: 'Operadores de repack relatam fadiga nos punhos e perda de tempo na montagem manual de caixas colmeia.',
    indicadorBeneficiado: 'Volume Repaciado / Custo por Caixa Salva',
    metaMelhoria: 'Aumentar recuperação de latas amassadas/molhadas de 72% para 90% sem perdas por manuseio.',
    ganhoEsperado: 'Redução do refugo de líquidos e recuperação de 250 caixas adicionais por mês.',
    oQueSeraFeito: 'Instalação de suporte giratório ergonômico de caixas e dispensador semi-automático de fita gomada.',
    responsavelPrincipal: 'ADMILTON HERMINIO DOS SANTOS MARCELINO',
    prazoImplantacao: '2026-08-25',
    comoSeraFeito: 'Fabricação do gabarito em oficina de manutenção interna e fixação na bancada com esteira de roletes.',
    recursosNecessarios: 'Perfil metálico e 1 dispensador de fita (Custo aproximado R$ 320,00).',
    statusTOR: 'Em Teste Piloto',
    percentualConcluido: 80,
    feedbackGestao: 'Protótipo testado na Bancada 1 com aprovação unânime dos ajudantes do turno da noite.',
    registradoPor: 'JOSE GONCALVES DE SOUZA',
    criadoEm: '2026-08-10T10:30:00.000Z'
  },
  {
    id: 'melhoria-tor-03',
    data: '05/08/2026',
    dataISO: '2026-08-05',
    hora: '15:00',
    reuniaoTOR: 'Comitê de Qualidade / DPO',
    pilarDPO: 'Armazém',
    processo: 'Auditoria & 5S',
    setor: 'Todas as Ruas e Doca de Carga',
    dataProximoAcompanhamento: '2026-08-26',
    tituloMelhoria: 'Implementação do Padrão Visual DPO de Sinalização de Solo e Demarcação de Vias de Pedestres',
    oportunidadeIdentificada: 'Falta de contraste na pintura das faixas de pedestres e demarcações de paletes vazios gerando risco de cruzamento com empilhadeiras.',
    indicadorBeneficiado: 'Nota de Auditoria DPO - Pilar Armazém / Segurança',
    metaMelhoria: 'Alcançar 100% de conformidade nos requisitos de sinalização DPO Nível 3.',
    ganhoEsperado: 'Zero acidentes/quase acidentes entre empilhadeiras e conferentes e nota máxima no checklist de auditoria.',
    oQueSeraFeito: 'Pintura com tinta epóxi amarela de alta resistência em todas as faixas e instalação de placas aéreas de limite de velocidade.',
    responsavelPrincipal: 'GILSON ROSA DA SILVA',
    prazoImplantacao: '2026-08-30',
    comoSeraFeito: 'Trabalho em turnos alternados aos domingos sem circulação de caminhões.',
    recursosNecessarios: 'Tinta epóxi viária e moldes de pintura.',
    statusTOR: 'Padronizada no POP',
    percentualConcluido: 100,
    feedbackGestao: 'Ação 100% concluída e validada na última auditoria com nota 98.4%.',
    registradoPor: 'NIXON HENRIQUE PEREIRA DE ARRUDA (ADMINISTRATIVO)',
    criadoEm: '2026-08-05T15:30:00.000Z'
  }
];

// ==========================================
// FUNÇÕES DE ACESSO: AÇÕES DE DESVIOS / GATILHOS
// ==========================================

export function getAcoesDesviosLocal(): AcaoDesvioItem[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_DESVIOS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {}
  // Salva o seed se estiver vazio
  try {
    localStorage.setItem(STORAGE_KEY_DESVIOS, JSON.stringify(SEED_DESVIOS));
  } catch (e) {}
  return SEED_DESVIOS;
}

export function saveAcoesDesviosLocal(items: AcaoDesvioItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_DESVIOS, JSON.stringify(items));
  } catch (e) {}
}

export async function fetchAcoesDesvios(empresaId: string = 'demo'): Promise<AcaoDesvioItem[]> {
  if (db) {
    try {
      const colRef = collection(db, 'acoes_desvios_gatilhos');
      const q = query(colRef);
      const snap = await getDocs(q);
      if (!snap.empty) {
        const list: AcaoDesvioItem[] = [];
        snap.forEach(d => {
          list.push({ id: d.id, ...(d.data() as any) });
        });
        saveAcoesDesviosLocal(list);
        return list;
      }
    } catch (err) {
      console.warn("Firestore fetch acoes_desvios falhou, usando cache local:", err);
    }
  }
  return getAcoesDesviosLocal();
}

export async function salvarAcaoDesvio(item: AcaoDesvioItem, empresaId: string = 'demo'): Promise<AcaoDesvioItem> {
  const current = getAcoesDesviosLocal();
  const idx = current.findIndex(a => a.id === item.id);
  let updatedList: AcaoDesvioItem[];

  const itemToSave: AcaoDesvioItem = {
    ...item,
    empresaId,
    atualizadoEm: new Date().toISOString()
  };

  if (idx >= 0) {
    updatedList = [...current];
    updatedList[idx] = itemToSave;
  } else {
    updatedList = [itemToSave, ...current];
  }

  saveAcoesDesviosLocal(updatedList);

  if (db) {
    try {
      await setDoc(doc(db, 'acoes_desvios_gatilhos', itemToSave.id), itemToSave, { merge: true });
    } catch (e) {
      console.warn("Falha ao salvar no Firestore acoes_desvios (salvo localmente):", e);
    }
  }

  return itemToSave;
}

export async function excluirAcaoDesvio(id: string): Promise<void> {
  const current = getAcoesDesviosLocal();
  const filtered = current.filter(a => a.id !== id);
  saveAcoesDesviosLocal(filtered);

  if (db) {
    try {
      await deleteDoc(doc(db, 'acoes_desvios_gatilhos', id));
    } catch (e) {}
  }
}

// ==========================================
// FUNÇÕES DE ACESSO: AÇÕES DE MELHORIA / TOR
// ==========================================

export function getAcoesMelhoriasLocal(): AcaoMelhoriaItem[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_MELHORIAS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {}
  try {
    localStorage.setItem(STORAGE_KEY_MELHORIAS, JSON.stringify(SEED_MELHORIAS));
  } catch (e) {}
  return SEED_MELHORIAS;
}

export function saveAcoesMelhoriasLocal(items: AcaoMelhoriaItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_MELHORIAS, JSON.stringify(items));
  } catch (e) {}
}

export async function fetchAcoesMelhorias(empresaId: string = 'demo'): Promise<AcaoMelhoriaItem[]> {
  if (db) {
    try {
      const colRef = collection(db, 'acoes_melhoria_tor');
      const q = query(colRef);
      const snap = await getDocs(q);
      if (!snap.empty) {
        const list: AcaoMelhoriaItem[] = [];
        snap.forEach(d => {
          list.push({ id: d.id, ...(d.data() as any) });
        });
        saveAcoesMelhoriasLocal(list);
        return list;
      }
    } catch (err) {
      console.warn("Firestore fetch acoes_melhoria_tor falhou, usando cache local:", err);
    }
  }
  return getAcoesMelhoriasLocal();
}

export async function salvarAcaoMelhoria(item: AcaoMelhoriaItem, empresaId: string = 'demo'): Promise<AcaoMelhoriaItem> {
  const current = getAcoesMelhoriasLocal();
  const idx = current.findIndex(a => a.id === item.id);
  let updatedList: AcaoMelhoriaItem[];

  const itemToSave: AcaoMelhoriaItem = {
    ...item,
    empresaId,
    atualizadoEm: new Date().toISOString()
  };

  if (idx >= 0) {
    updatedList = [...current];
    updatedList[idx] = itemToSave;
  } else {
    updatedList = [itemToSave, ...current];
  }

  saveAcoesMelhoriasLocal(updatedList);

  if (db) {
    try {
      await setDoc(doc(db, 'acoes_melhoria_tor', itemToSave.id), itemToSave, { merge: true });
    } catch (e) {
      console.warn("Falha ao salvar no Firestore acoes_melhoria_tor (salvo localmente):", e);
    }
  }

  return itemToSave;
}

export async function excluirAcaoMelhoria(id: string): Promise<void> {
  const current = getAcoesMelhoriasLocal();
  const filtered = current.filter(a => a.id !== id);
  saveAcoesMelhoriasLocal(filtered);

  if (db) {
    try {
      await deleteDoc(doc(db, 'acoes_melhoria_tor', id));
    } catch (e) {}
  }
}
