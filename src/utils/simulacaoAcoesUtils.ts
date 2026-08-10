// Requirement 26, 27, 28, 31 & 32: Auto Action Generator, Simulated Action Database (280+ items), FEFO/Loss Specific Actions, and Multi-Database Isolation.

export interface AuditTrailEntry {
  dataHora: string;
  usuario: string;
  alteracao: string;
}

export interface CincoPorques {
  porque1: string;
  porque2: string;
  porque3: string;
  porque4: string;
  porque5: string;
}

export interface AcaoCorretiva {
  id: string;
  data: string; // DD/MM/YYYY
  dataISO: string; // YYYY-MM-DD
  hora: string; // HH:MM
  processo: 
    | 'Repack'
    | 'Despejo'
    | 'EFC'
    | 'EFD'
    | 'Picking'
    | 'Gestão de Capacidade'
    | 'Gestão de Quebras'
    | 'Gestão FEFO'
    | 'Estoque x Estoque'
    | 'Estoque x Picking'
    | 'Ressuprimento'
    | 'Recebimento'
    | 'Carregamento'
    | 'Marketplace';
  setor: string;
  colaboradorResponsavel: string;
  indicador: string;
  meta: string;
  resultadoObtido: string;
  desvioEncontrado: string;
  causaRaiz: 'Método' | 'Mão de Obra' | 'Máquina' | 'Material';
  causaRaizDetalhe?: string;
  status: 'Pendente' | 'Em Andamento' | 'Concluído' | 'Atrasado' | 'Reaberto';
  responsavelTratativa: string; // Supervisor/Gestor
  prazo: string; // YYYY-MM-DD
  evidencias?: string;
  comentarioOperador: string;
  historicoAlteracoes: AuditTrailEntry[];
  simulado: boolean;
  criadoEm: string;

  // Requirement 33, 34 & 35: Governance & Standardization
  tipoAcao: 'Corretiva' | 'Melhoria';
  prioridade: 'Alta' | 'Média' | 'Baixa';
  cincoPorques?: CincoPorques;
  contramedida?: string;
  aprovacaoGestor?: 'Pendente' | 'Aprovado' | 'Rejeitado';
  aceiteColaborador?: boolean; // "Li e estou de acordo"
  impactoEsperado?: string;
  situacaoMeta?: 'Atingida' | 'Em Risco' | 'Perdida' | 'Tendência de Queda';
  
  // Requirement 38: RLP Actions
  isRlp?: boolean;
  areaRlp?: 'Logística' | 'Comercial' | 'Planejamento' | 'Operação';
  tendenciaProjecao?: string;

  // Requirement 28: Specific fields for FEFO and Quebras (Loss & Expiration)
  isFefoOuQuebra?: boolean;
  produto?: string;
  codigoProduto?: string;
  lote?: string;
  validade?: string;
  quantidade?: number;
  localizacao?: string;
  supervisor?: string;
  motivoOcorrencia?: string;
  impactoFinanceiro?: number;
  hlPerdido?: number;
  planoAcao?: string;

  // New fields for Delay Justification, Rescheduling & Execution Tracking
  justificativaAtraso?: string;
  prazoOriginal?: string;
  dataReagendada?: string;
  reagendadoCount?: number;
  dataInicioExecucao?: string;
  concluidoNoPrazo?: boolean;

  // Audit of opening and closing users
  abertoPor?: string; // Nome e cargo do usuário que criou/abriu a ação
  dataAbertura?: string; // Data e hora de abertura
  fechadoPor?: string; // Nome e cargo do usuário que concluiu/fechou a ação
  dataFechamento?: string; // Data e hora do fechamento
}

export type DatabaseMode = 'simulado' | 'operacional' | 'historico';

const STORAGE_KEY_SIMULADO = 'af_banco_simulado_acoes_2026';
const STORAGE_KEY_OPERACIONAL = 'af_banco_operacional_acoes';
const STORAGE_KEY_HISTORICO = 'af_banco_historico_acoes';
const STORAGE_KEY_ACTIVE_MODE = 'af_banco_ativo_modo';

export const MODULES_LIST: AcaoCorretiva['processo'][] = [
  'Repack',
  'Despejo',
  'EFC',
  'EFD',
  'Picking',
  'Gestão de Capacidade',
  'Gestão de Quebras',
  'Gestão FEFO',
  'Estoque x Estoque',
  'Estoque x Picking',
  'Ressuprimento',
  'Recebimento',
  'Carregamento',
  'Marketplace'
];

const COLABORADORES = [
  'Carlos Silva (Operador)',
  'Fernanda Lima (Ajudante)',
  'Roberto Souza (Conferente)',
  'Aline Mendes (Empilhador)',
  'Marcos Oliveira (Operador)',
  'Juliana Costa (Conferente)',
  'Paulo Santos (Ajudante)',
  'Gilson Ferreira (Empilhador)',
  'Matheus Barbosa (Líder)',
  'Ronildo Paiva (Operador)',
  'Ozenildo Silva (Técnico)'
];

const SUPERVISORES = [
  'João Paulo (Supervisor Pátio)',
  'Mariana Alves (Coordenadora Logística)',
  'Luciano Santos (Gestor de Processos)',
  'Eduardo Rocha (Supervisor Qualidade)',
  'Beatriz Souza (Supervisora VPO)'
];

const SETORES = [
  'Armazém 01', 'Armazém 02', 'Doca de Recebimento', 'Doca de Expedição',
  'Pátio Central', 'Corredor de Picking', 'Área de Devolução', 'Linha 1 Repack',
  'Área de Despejo', 'Estoque Aéreo', 'Setor de Blister', 'Área de Contingência'
];

const CAUSAS: AcaoCorretiva['causaRaiz'][] = ['Método', 'Mão de Obra', 'Máquina', 'Material'];

const COMMENT_EXAMPLES: Record<string, string[]> = {
  Repack: [
    "Faltou caixa de papelão nova para repaciar lata trincada.",
    "Bancada 2 estava desorganizada no início do turno.",
    "Empilhadeira demorou para trazer o lote avariado.",
    "Fita adesiva acabou durante o processo e demorou para repor."
  ],
  Despejo: [
    "Canaleta de drenagem de líquidos entupiu no meio da operação.",
    "Mesa de apoio ergonômica estava ocupada por outro palete.",
    "Caixa de garrafas de 600ml caiu ao manipular garra manual.",
    "Atraso no escoamento de resíduos por acúmulo no container."
  ],
  EFC: [
    "Atraso no fechamento do faturamento na cabine central.",
    "Impressora de etiquetas de conferência travou.",
    "Palete não estava identificado no endereço de expedição.",
    "Rádio do conferente estava sem bateria."
  ],
  EFD: [
    "Caminhão de transferência chegou com 40min de atraso.",
    "Divergência entre o manifesto impresso e o coletor.",
    "Falta de ajudante para descarregar caixas soltas.",
    "Avaria de 2 fardos no baú do caminhão."
  ],
  Picking: [
    "Falta de palete de Brahma 350ml na frente terrestre.",
    "Corredor de picking bloqueado por paleteira quebrada.",
    "Conferente identificou erro de contagem na caixa 14.",
    "Etiqueta de posição ilegível na gôndola B3."
  ],
  'Gestão de Capacidade': [
    "Excesso de ocupação no Armazém 1 atingiu 96% de limite.",
    "Falta de espaço para alocar caminhão de fábrica D0.",
    "Corredor 4 congestionado impedindo manobra da empilhadeira.",
    "Demora na liberação de paletes vazios para a fábrica."
  ],
  'Gestão de Quebras': [
    "Queda de caixa de garrafa retornável durante a curva.",
    "Choque de garra da empilhadeira no canto do palete.",
    "Lata perfurada por prego saliente no palete de madeira.",
    "Avaria por empilhamento excessivo no piso 3."
  ],
  'Gestão FEFO': [
    "Palete com lote de vencimento próximo (15 dias) não foi puxado.",
    "Falta de etiqueta de semáforo amarelo no palete A-04.",
    "Operador pegou lote mais novo por facilidade de acesso.",
    "Divergência entre a data sistêmica e a data impressa na caixa."
  ],
  'Estoque x Estoque': [
    "Contagem física divergente em 8 caixas no endereço E-12.",
    "Palete movimentado sem registrar baixa no sistema.",
    "Código de barras lido incorretamente no inventário rotativo.",
    "Troca inadvertida de SKU no mesmo nicho de armazenagem."
  ],
  'Estoque x Picking': [
    "Falta de produto no picking enquanto constava 50 CX no saldo.",
    "Reabastecimento efetuado com SKU incorreto no Picking 2.",
    "Divergência entre saldo aéreo e posição terrestre.",
    "Caixa avariada não foi deduzida do saldo ativo de picking."
  ],
  Ressuprimento: [
    "Tempo de atendimento de reabastecimento excedeu 15 minutos.",
    "Empilhador priorizou descarga de fábrica em vez do picking.",
    "Solicitação de ressuprimento feita em cima da hora pelo conferente.",
    "Endereço aéreo estava bloqueado por palete de terceiro."
  ],
  Recebimento: [
    "Carreta da fábrica chegou com lacre rompido sem ressalva.",
    "Demora de 1h30 na liberação do laudo de qualidade pela fábrica.",
    "Avarias de transporte encontradas no fundo do baú.",
    "Falta de paleteiro disponível para descarregar."
  ],
  Carregamento: [
    "Atraso na montagem da rota por falta de produto no picking.",
    "Motorista de rota ausente no horário de início da doca.",
    "Lona do caminhão rasgada impedindo carregamento seguro.",
    "Conferência final indicou 1 caixa a mais do que o mapa."
  ],
  Marketplace: [
    "Pedido de e-commerce não localizado no escaninho.",
    "Caixa de e-commerce amassada durante a embalagem final.",
    "Atraso na coleta da transportadora parceira.",
    "Etiqueta de postagem com código de barras borrado."
  ]
};

// Requirement 32: Get current Database Mode
export function getActiveDatabaseMode(): DatabaseMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_MODE) as DatabaseMode;
    if (saved === 'simulado' || saved === 'operacional' || saved === 'historico') {
      return saved;
    }
  } catch (e) {}
  return 'simulado'; // Default to simulated for demo environment
}

export function setActiveDatabaseMode(mode: DatabaseMode): void {
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE_MODE, mode);
  } catch (e) {
    console.error('Error setting database mode:', e);
  }
}

// Requirement 27 & 32: Generate simulated database containing 20+ records per module from Jan 1, 2026 to current date
export function generateFullSimulatedDatabase2026(): AcaoCorretiva[] {
  const records: AcaoCorretiva[] = [];
  const startDate = new Date(2026, 0, 1); // 2026-01-01
  const endDate = new Date(2026, 6, 29); // 2026-07-29
  const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  let globalCounter = 1;

  MODULES_LIST.forEach((modulo) => {
    // Generate 20 records per module
    for (let i = 0; i < 20; i++) {
      const dayOffset = Math.floor((i / 20) * totalDays) + Math.floor(Math.random() * 3);
      const currDate = new Date(startDate.getTime() + Math.min(dayOffset, totalDays) * 24 * 60 * 60 * 1000);

      const dStr = currDate.toLocaleDateString('pt-BR');
      const dISO = currDate.toISOString().split('T')[0];
      const hStr = `${String(8 + (i % 10)).padStart(2, '0')}:${String((i * 12) % 60).padStart(2, '0')}`;

      const colab = COLABORADORES[i % COLABORADORES.length];
      const superv = SUPERVISORES[i % SUPERVISORES.length];
      const setor = SETORES[i % SETORES.length];
      const causa = CAUSAS[i % CAUSAS.length];
      
      const comments = COMMENT_EXAMPLES[modulo] || COMMENT_EXAMPLES['Repack'];
      const comment = comments[i % comments.length];

      const isFefoQuebraModule = (
        modulo === 'Gestão FEFO' || 
        modulo === 'Gestão de Quebras' || 
        modulo === 'Estoque x Estoque' || 
        modulo === 'Estoque x Picking' || 
        modulo === 'Despejo'
      );

      const statusOptions: AcaoCorretiva['status'][] = ['Concluído', 'Em Andamento', 'Pendente', 'Atrasado', 'Concluído'];
      const status = statusOptions[i % statusOptions.length];

      const deadlineDate = new Date(currDate.getTime() + (3 + (i % 5)) * 24 * 60 * 60 * 1000);
      const deadlineISO = deadlineDate.toISOString().split('T')[0];

      const skuCodes = ['0001010', '0001015', '0002030', '0003045', '0004010', '0005020'];
      const skuNames = ['Brahma Chopp 350ml', 'Skol Pilsen 600ml', 'Antarctica Boa 300ml', 'Stella Artois 330ml', 'Guaraná Antarctica 2L', 'Budweiser 473ml'];
      const skuIndex = i % skuCodes.length;

      const isMelhoria = i % 4 === 3; // 25% Ações de Melhoria preventivas, 75% Ações Corretivas por desvio
      const prioridade: AcaoCorretiva['prioridade'] = i % 3 === 0 ? 'Alta' : i % 3 === 1 ? 'Média' : 'Baixa';

      const record: AcaoCorretiva = {
        id: `acao-2026-${String(globalCounter).padStart(4, '0')}`,
        data: dStr,
        dataISO: dISO,
        hora: hStr,
        processo: modulo,
        setor,
        colaboradorResponsavel: colab,
        indicador: `Indicador de Conformidade Operacional (${modulo})`,
        meta: modulo.includes('Quebras') ? '0.50% max' : modulo.includes('FEFO') ? '100% FEFO' : 'Meta Diária 100%',
        resultadoObtido: modulo.includes('Quebras') ? '1.85%' : modulo.includes('FEFO') ? '78.5%' : '82.0%',
        desvioEncontrado: isMelhoria 
          ? `Alerta Preventivo: Tendência de queda de performance nas últimas 3 semanas em ${modulo}` 
          : `Desvio identificado no processo de ${modulo}: ${comment}`,
        causaRaiz: causa,
        causaRaizDetalhe: `Falha técnica/operacional no fator ${causa}.`,
        status,
        responsavelTratativa: superv,
        prazo: deadlineISO,
        evidencias: `Evidência registrada via aplicativo em ${dStr} - Foto e Registro #${globalCounter}`,
        comentarioOperador: comment,
        simulado: true,
        criadoEm: currDate.toISOString(),

        // Requirements 33, 34 & 35: Governance & 5 Whys Flow
        tipoAcao: isMelhoria ? 'Melhoria' : 'Corretiva',
        prioridade,
        cincoPorques: {
          porque1: `Por que o indicador de ${modulo} desviou? Devido a gargalos operacionais no setor ${setor}.`,
          porque2: `Por que houve gargalo no setor? O tempo de ciclo aumentou durante o turno.`,
          porque3: `Por que o tempo de ciclo aumentou? Falta de insumos e alocação inadequada de equipe.`,
          porque4: `Por que faltou insumo/equipe? Atraso no reabastecimento preventivo e ausência de operador.`,
          porque5: `Por que não houve reabastecimento preventivo? Falha no checklist inicial e na ordenação da fila.`
        },
        contramedida: isMelhoria 
          ? `Implantar rotina de reabastecimento antecipado e reforço de treinamento no turno.` 
          : `Ajuste imediato de fluxo, isolamento de lote e alocação de conferente dedicado.`,
        aprovacaoGestor: status === 'Concluído' ? 'Aprovado' : 'Pendente',
        aceiteColaborador: status === 'Concluído',
        impactoEsperado: isMelhoria ? 'Evitar perda da meta mensal (+3.5% de recuperação)' : 'Eliminar desvio e atingir 100% da meta diária',
        situacaoMeta: isMelhoria ? 'Tendência de Queda' : status === 'Concluído' ? 'Atingida' : 'Perdida',
        
        ...(i % 5 === 0 ? {
          isRlp: true,
          areaRlp: (['Logística', 'Comercial', 'Planejamento', 'Operação'] as const)[i % 4],
          tendenciaProjecao: `Projeção quinzenal indicava perda de meta se a intervenção não fosse realizada.`
        } : {}),

        historicoAlteracoes: [
          {
            dataHora: `${dStr} ${hStr}`,
            usuario: 'Sistema de Governança Integrada',
            alteracao: isMelhoria 
              ? 'Ação de Melhoria Preventiva gerada por análise automática de tendência.' 
              : 'Ação Corretiva gerada automaticamente por desvio com formulário de 5 Porquês.'
          },
          ...(status === 'Concluído' ? [{
            dataHora: `${deadlineDate.toLocaleDateString('pt-BR')} 16:30`,
            usuario: superv,
            alteracao: 'Ação validada pelo gestor, evidência anexada e termo "Li e estou de acordo" assinado pelo operador.'
          }] : [])
        ],

        // Specific fields for Req 28
        ...(isFefoQuebraModule ? {
          isFefoOuQuebra: true,
          produto: skuNames[skuIndex],
          codigoProduto: skuCodes[skuIndex],
          lote: `LOTE-2026-${100 + i}`,
          validade: new Date(2026, 8, 15 + i).toLocaleDateString('pt-BR'),
          quantidade: 10 + (i * 3),
          localizacao: `Posição ${String.fromCharCode(65 + (i % 6))}-${10 + i}`,
          supervisor: superv,
          motivoOcorrencia: comment,
          impactoFinanceiro: (10 + (i * 3)) * 48.5,
          hlPerdido: Math.round(((10 + (i * 3)) * 0.084) * 100) / 100,
          planoAcao: `Executar isolamento do lote, reciclagem da equipe e ajuste no coletor WMS.`
        } : {})
      };

      records.push(record);
      globalCounter++;
    }
  });

  return records;
}

// Get all actions according to current active database mode
export function getAcoesAll(specificMode?: DatabaseMode): AcaoCorretiva[] {
  const mode = specificMode || getActiveDatabaseMode();
  let storageKey = STORAGE_KEY_SIMULADO;

  if (mode === 'operacional') storageKey = STORAGE_KEY_OPERACIONAL;
  else if (mode === 'historico') storageKey = STORAGE_KEY_HISTORICO;

  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const uniqueMap = new Map<string, AcaoCorretiva>();
        parsed.forEach((item: AcaoCorretiva) => {
          if (item && item.id) {
            if (!uniqueMap.has(item.id)) {
              uniqueMap.set(item.id, item);
            }
          }
        });
        return Array.from(uniqueMap.values());
      }
    }
  } catch (e) {
    console.error('Error loading actions:', e);
  }

  // If simulated mode and empty, auto-generate default 280+ items
  if (mode === 'simulado') {
    const defaultSeed = generateFullSimulatedDatabase2026();
    saveAcoes(defaultSeed, 'simulado');
    return defaultSeed;
  }

  return [];
}

export function saveAcoes(list: AcaoCorretiva[], specificMode?: DatabaseMode): void {
  const mode = specificMode || getActiveDatabaseMode();
  let storageKey = STORAGE_KEY_SIMULADO;

  if (mode === 'operacional') storageKey = STORAGE_KEY_OPERACIONAL;
  else if (mode === 'historico') storageKey = STORAGE_KEY_HISTORICO;

  const uniqueMap = new Map<string, AcaoCorretiva>();
  list.forEach(item => {
    if (item && item.id) {
      if (!uniqueMap.has(item.id)) {
        uniqueMap.set(item.id, item);
      }
    }
  });
  const cleanList = Array.from(uniqueMap.values());

  try {
    localStorage.setItem(storageKey, JSON.stringify(cleanList));
  } catch (e) {
    console.error('Error saving actions:', e);
  }
}

// Requirement 26: Automatic trigger function to register a corrective action
export function triggerAutoAcaoCorretiva(trigger: {
  processo: AcaoCorretiva['processo'];
  setor?: string;
  colaboradorResponsavel?: string;
  indicador: string;
  meta: string;
  resultadoObtido: string;
  desvioEncontrado: string;
  causaRaiz?: AcaoCorretiva['causaRaiz'];
  comentarioOperador?: string;
  responsavelTratativa?: string;
  
  // Optional FEFO/Quebra details (Req 28)
  produto?: string;
  codigoProduto?: string;
  lote?: string;
  validade?: string;
  quantidade?: number;
  localizacao?: string;
  impactoFinanceiro?: number;
  hlPerdido?: number;
}): AcaoCorretiva {
  const currentList = getAcoesAll();

  const now = new Date();
  const dStr = now.toLocaleDateString('pt-BR');
  const dISO = now.toISOString().split('T')[0];
  const hStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const deadlineDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const deadlineISO = deadlineDate.toISOString().split('T')[0];

  const newAction: AcaoCorretiva = {
    id: `acao-auto-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    data: dStr,
    dataISO: dISO,
    hora: hStr,
    processo: trigger.processo,
    setor: trigger.setor || 'Pátio Central / Armazém',
    colaboradorResponsavel: trigger.colaboradorResponsavel || 'Operador Responsável',
    indicador: trigger.indicador,
    meta: trigger.meta,
    resultadoObtido: trigger.resultadoObtido,
    desvioEncontrado: trigger.desvioEncontrado,
    causaRaiz: trigger.causaRaiz || 'Método',
    causaRaizDetalhe: 'Identificado via gatilho de desvio automático do sistema.',
    status: 'Pendente',
    responsavelTratativa: trigger.responsavelTratativa || 'Supervisor de Processos',
    prazo: deadlineISO,
    evidencias: `Gatilho automático gerado em ${dStr} às ${hStr}`,
    comentarioOperador: trigger.comentarioOperador || trigger.desvioEncontrado,
    simulado: getActiveDatabaseMode() === 'simulado',
    criadoEm: now.toISOString(),

    // Requirement 33 & 35: Governance & 5 Whys Flow
    tipoAcao: 'Corretiva',
    prioridade: 'Alta',
    cincoPorques: {
      porque1: `Desvio no indicador ${trigger.indicador}: ${trigger.resultadoObtido} x Meta ${trigger.meta}`,
      porque2: 'Aumento de tempo de manobra e fila de separação no turno.',
      porque3: 'Gargalo operacional por acúmulo de paletes no corredor.',
      porque4: 'Deficiência na alocação da equipe e reabastecimento tardio.',
      porque5: 'Falha no sequenciamento preventivo das ordens de trabalho.'
    },
    contramedida: 'Executar alocação emergencial, reordenar ordens no WMS e realizar treinamento relâmpago.',
    aprovacaoGestor: 'Pendente',
    aceiteColaborador: false,
    impactoEsperado: 'Restabelecer performance do turno e atingir a meta diária.',
    situacaoMeta: 'Perdida',

    historicoAlteracoes: [
      {
        dataHora: `${dStr} ${hStr}`,
        usuario: 'Gatilho Automático do Sistema',
        alteracao: `Ação Corretiva gerada automaticamente por desvio no indicador "${trigger.indicador}". Formulário dos 5 Porquês aberto.`
      }
    ],

    ...(trigger.produto || trigger.codigoProduto ? {
      isFefoOuQuebra: true,
      produto: trigger.produto || 'Produto Não Especificado',
      codigoProduto: trigger.codigoProduto || '0000000',
      lote: trigger.lote || 'LOTE-SISTEMA',
      validade: trigger.validade || dStr,
      quantidade: trigger.quantidade || 1,
      localizacao: trigger.localizacao || 'Armazém',
      motivoOcorrencia: trigger.desvioEncontrado,
      impactoFinanceiro: trigger.impactoFinanceiro || 0,
      hlPerdido: trigger.hlPerdido || 0,
      planoAcao: 'Tratativa e regularização imediata requisitada.'
    } : {})
  };

  const updatedList = [newAction, ...currentList];
  saveAcoes(updatedList);
  return newAction;
}

// Requirement 33 (Part 2) & Requirement 38: Automatic Preventive Improvement Action Trigger (Tendência Operacional & RLP)
export function triggerAutoAcaoMelhoriaPreventiva(trigger: {
  processo: AcaoCorretiva['processo'];
  indicador: string;
  tendenciaProjecao: string;
  recomendacaoSugerida: string;
  areaRlp?: 'Logística' | 'Comercial' | 'Planejamento' | 'Operação';
  isRlp?: boolean;
  responsavel?: string;
  prioridade?: 'Alta' | 'Média' | 'Baixa';
  produto?: string;
  codigoProduto?: string;
  lote?: string;
}): AcaoCorretiva {
  const currentList = getAcoesAll();

  const now = new Date();
  const dStr = now.toLocaleDateString('pt-BR');
  const dISO = now.toISOString().split('T')[0];
  const hStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const deadlineDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days for preventive
  const deadlineISO = deadlineDate.toISOString().split('T')[0];

  const newAction: AcaoCorretiva = {
    id: `melhoria-auto-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    data: dStr,
    dataISO: dISO,
    hora: hStr,
    processo: trigger.processo,
    setor: 'Geral / Planejamento Operacional',
    colaboradorResponsavel: trigger.responsavel || 'Equipe de Melhoria Contínua',
    indicador: trigger.indicador,
    meta: 'Meta Mensal 100%',
    resultadoObtido: 'Em risco por tendência de queda',
    desvioEncontrado: `Alerta de Tendência: ${trigger.tendenciaProjecao}`,
    causaRaiz: 'Método',
    causaRaizDetalhe: 'Identificado via Inteligência de Tendência Operacional / RLP.',
    status: 'Pendente',
    responsavelTratativa: 'Gestor de Processos & Logística',
    prazo: deadlineISO,
    evidencias: `Alerta emitido pelo algoritmo de tendência operacional em ${dStr}`,
    comentarioOperador: `Ação Preventiva Sugerida: ${trigger.recomendacaoSugerida}`,
    simulado: getActiveDatabaseMode() === 'simulado',
    criadoEm: now.toISOString(),

    tipoAcao: 'Melhoria',
    prioridade: trigger.prioridade || 'Alta',
    contramedida: trigger.recomendacaoSugerida,
    aprovacaoGestor: 'Pendente',
    aceiteColaborador: false,
    impactoEsperado: 'Prevenir a perda da meta mensal e restabelecer tendência positiva de performance.',
    situacaoMeta: 'Tendência de Queda',

    isRlp: trigger.isRlp || false,
    areaRlp: trigger.areaRlp || 'Logística',
    tendenciaProjecao: trigger.tendenciaProjecao,

    ...(trigger.produto ? {
      isFefoOuQuebra: true,
      produto: trigger.produto,
      codigoProduto: trigger.codigoProduto || '0000000',
      lote: trigger.lote || 'LOTE-CRITICO',
      planoAcao: trigger.recomendacaoSugerida
    } : {}),

    historicoAlteracoes: [
      {
        dataHora: `${dStr} ${hStr}`,
        usuario: 'Algoritmo de Tendência e Prevenção RLP',
        alteracao: `Ação de Melhoria Preventiva gerada. Motivo: ${trigger.tendenciaProjecao}`
      }
    ]
  };

  const updatedList = [newAction, ...currentList];
  saveAcoes(updatedList);
  return newAction;
}

export function updateAcaoCorretiva(item: AcaoCorretiva, usuario: string = 'Usuário'): void {
  const currentList = getAcoesAll();
  const idx = currentList.findIndex(a => a.id === item.id);

  const updatedTrail: AuditTrailEntry[] = [
    ...(item.historicoAlteracoes || []),
    {
      dataHora: `${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
      usuario,
      alteracao: `Registro atualizado (Status: ${item.status}).`
    }
  ];

  const itemToSave = { ...item, historicoAlteracoes: updatedTrail };

  if (idx >= 0) {
    currentList[idx] = itemToSave;
  } else {
    currentList.unshift(itemToSave);
  }

  saveAcoes(currentList);
}

export function deleteAcaoCorretiva(id: string): void {
  const currentList = getAcoesAll();
  const filtered = currentList.filter(a => a.id !== id);
  saveAcoes(filtered);
}

export function deleteAcoesBatch(ids: string[]): void {
  const currentList = getAcoesAll();
  const setIds = new Set(ids);
  const filtered = currentList.filter(a => !setIds.has(a.id));
  saveAcoes(filtered);
}

// Requirement 32: Management functions for simulated database
export function restoreSimulatedDatabase(): AcaoCorretiva[] {
  const seeded = generateFullSimulatedDatabase2026();
  saveAcoes(seeded, 'simulado');
  return seeded;
}

export function clearSimulatedDatabase(): void {
  saveAcoes([], 'simulado');
}

export function exportAcoesCSV(mode?: DatabaseMode): void {
  const data = getAcoesAll(mode);
  if (data.length === 0) {
    alert('Não há registros para exportar.');
    return;
  }

  const headers = [
    'ID', 'Data', 'Hora', 'Processo', 'Setor', 'Colaborador', 
    'Indicador', 'Meta', 'Resultado', 'Desvio', 'Causa Raiz', 
    'Status', 'Responsável Tratativa', 'Prazo', 'Comentário Operador'
  ];

  const rows = data.map(item => [
    item.id,
    item.data,
    item.hora,
    item.processo,
    `"${item.setor}"`,
    `"${item.colaboradorResponsavel}"`,
    `"${item.indicador}"`,
    `"${item.meta}"`,
    `"${item.resultadoObtido}"`,
    `"${item.desvioEncontrado.replace(/"/g, '""')}"`,
    item.causaRaiz,
    item.status,
    `"${item.responsavelTratativa}"`,
    item.prazo,
    `"${(item.comentarioOperador || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Acoes_Corretivas_${mode || getActiveDatabaseMode()}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
