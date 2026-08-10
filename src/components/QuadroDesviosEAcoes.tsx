import React, { useState, useEffect, useMemo } from 'react';
import { Usuario } from '../types';
import { 
  Demand5Porques, 
  getStored5PorquesDemandas, 
  update5PorquesDemandStatus 
} from '../utils/fiveWhysManager';
import { 
  AcaoCorretiva, 
  getAcoesAll, 
  saveAcoes, 
  MODULES_LIST 
} from '../utils/simulacaoAcoesUtils';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  User, 
  Send, 
  Edit3, 
  PlusCircle, 
  Eye, 
  X, 
  Sparkles, 
  FileText, 
  ShieldAlert, 
  ArrowRight, 
  Filter,
  Check,
  TrendingDown,
  Target,
  BarChart3,
  Layers,
  CheckSquare,
  AlertCircle,
  Package,
  ExternalLink,
  ListCheck,
  Zap,
  Play,
  Calendar,
  RotateCcw,
  Users
} from 'lucide-react';
import { LISTA_COLABORADORES_OFICIAIS } from './RankingModule';
import { ManualInstrucaoCard } from './ManualInstrucaoCard';
import { useEmpresaData } from '../context/EmpresaDataContext';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

interface QuadroDesviosEAcoesProps {
  user: Usuario;
  empresaId?: string;
  onNavigateToAcoes?: () => void;
}

export interface IndicatorDevationItem {
  id: string;
  processo: string;
  indicador: string;
  meta: string;
  resultadoAtual: string;
  desvioCalculado: string;
  severidade: 'Alta' | 'Média' | 'Crítica';
  causaProvavel: string;
  categoria: 'Operação' | 'Qualidade' | 'Pátio' | 'Estoque';
}

export const PLATFORM_DEVIATIONS: IndicatorDevationItem[] = [
  {
    id: 'DEV_EFC',
    processo: 'EFC - Carregamento',
    indicador: 'Eficiência de Carga (EFC %)',
    meta: '≥ 96.0%',
    resultadoAtual: '94.2%',
    desvioCalculado: '-1.8% abaixo da meta',
    severidade: 'Alta',
    causaProvavel: 'Gargalo no kitting e montagem de pallets mistos durante o Turno B',
    categoria: 'Operação'
  },
  {
    id: 'DEV_EFD',
    processo: 'EFD - Descarga',
    indicador: 'Eficiência de Descarga (EFD %)',
    meta: '≥ 90.0%',
    resultadoAtual: '88.5%',
    desvioCalculado: '-1.5% abaixo da meta',
    severidade: 'Média',
    causaProvavel: 'Janela concentrada de recebimento de carretas entre 14h e 16h',
    categoria: 'Pátio'
  },
  {
    id: 'DEV_TMR',
    processo: 'TMR - Pátio',
    indicador: 'Tempo Médio de Retorno / Atendimento (TMR)',
    meta: '≤ 45 min',
    resultadoAtual: '52 min',
    desvioCalculado: '+7 min acima do limite',
    severidade: 'Alta',
    causaProvavel: 'Demora na triagem de vasilhame e liberação de documentos na portaria',
    categoria: 'Pátio'
  },
  {
    id: 'DEV_RR',
    processo: 'R&R - Refugo e Retorno',
    indicador: 'Índice de Refugo por Colaborador (%)',
    meta: '≤ 1.0%',
    resultadoAtual: '1.35%',
    desvioCalculado: '+0.35% acima da meta',
    severidade: 'Crítica',
    causaProvavel: 'Erros na troca de produtos no ato da entrega em rota',
    categoria: 'Operação'
  },
  {
    id: 'DEV_FEFO',
    processo: 'Gestão FEFO',
    indicador: 'SKUs na Faixa Vermelha de Validade',
    meta: '0 SKUs sem RLP',
    resultadoAtual: '2 SKUs em risco',
    desvioCalculado: '2 SKUs com vencimento < 30 dias',
    severidade: 'Crítica',
    causaProvavel: 'Falta de ação comercial conjunta (RLP) para desmobilização de saldo',
    categoria: 'Estoque'
  },
  {
    id: 'DEV_WQI',
    processo: 'Qualidade Armazém',
    indicador: 'Warehouse Quality Index (WQI %)',
    meta: '≥ 95.0%',
    resultadoAtual: '92.8%',
    desvioCalculado: '-2.2% abaixo da meta',
    severidade: 'Média',
    causaProvavel: 'Ocorrências pontuais de avarias de manuseio no picking central',
    categoria: 'Qualidade'
  },
  {
    id: 'DEV_QUEBRAS',
    processo: 'Avarias & Quebras',
    indicador: 'Índice de Quebras (% do Faturamento)',
    meta: '≤ 0.15%',
    resultadoAtual: '0.22%',
    desvioCalculado: '+0.07% acima do teto',
    severidade: 'Alta',
    causaProvavel: 'Queda de caixas na movimentação de paletes em alturas elevadas',
    categoria: 'Qualidade'
  },
  {
    id: 'DEV_INVENTARIO',
    processo: 'Acuracidade Inventário',
    indicador: 'Acuracidade Física de Estoque (%)',
    meta: '≥ 99.5%',
    resultadoAtual: '98.9%',
    desvioCalculado: '-0.6% de divergência',
    severidade: 'Alta',
    causaProvavel: 'Atraso na baixa sistêmica de reabastecimentos entre pulmão e picking',
    categoria: 'Estoque'
  }
];

// Helper to normalize and check if an action's deadline is strictly overdue (< today)
const checkIsOverdue = (prazoStr?: string, status?: string): boolean => {
  if (!prazoStr || status === 'Concluído') return false;
  const todayISO = new Date().toISOString().split('T')[0];
  let normalized = prazoStr;
  if (prazoStr.includes('/')) {
    const parts = prazoStr.split('/');
    if (parts.length === 3) {
      normalized = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  return normalized < todayISO;
};

export const QuadroDesviosEAcoes: React.FC<QuadroDesviosEAcoesProps> = ({
  user,
  empresaId = 'demo',
  onNavigateToAcoes
}) => {
  const empresaData = useEmpresaData();
  const userName = user.nome || user.email?.split('@')[0] || 'Operador Logístico';

  // Primary navigation: Default to "minhas_acoes" for workstation user focus!
  const [activeTab, setActiveTab] = useState<'minhas_acoes' | 'desvios' | 'governanca' | 'pessoal'>('minhas_acoes');
  
  const [demands, setDemands] = useState<Demand5Porques[]>([]);
  const [acoes, setAcoes] = useState<AcaoCorretiva[]>([]);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);

  // Selected item for modal
  const [selectedDemand, setSelectedDemand] = useState<Demand5Porques | null>(null);
  const [selectedDeviation, setSelectedDeviation] = useState<IndicatorDevationItem | null>(null);
  
  // Modal state for Generating Corrective Action
  const [showGerarAcaoModal, setShowGerarAcaoModal] = useState(false);
  const [actionTitle, setActionTitle] = useState('');
  const [actionColab, setActionColab] = useState('');
  const [actionSup, setActionSup] = useState(userName);
  const [actionProcess, setActionProcess] = useState<AcaoCorretiva['processo']>('Picking');
  const [actionCausaRaiz, setActionCausaRaiz] = useState<'Método' | 'Mão de Obra' | 'Máquina' | 'Material'>('Método');
  const [actionContramedida, setActionContramedida] = useState('');
  const [actionPrazo, setActionPrazo] = useState(new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]);
  const [actionPrioridade, setActionPrioridade] = useState<'Alta' | 'Média' | 'Baixa'>('Alta');

  // Modal state for Rescheduling & Delay Justification
  const [showJustifyModal, setShowJustifyModal] = useState(false);
  const [actionToJustify, setActionToJustify] = useState<AcaoCorretiva | null>(null);
  const [justificativaText, setJustificativaText] = useState('');
  const [novoPrazoDate, setNovoPrazoDate] = useState(new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]);

  // Governance Filter states
  const [filterColaborador, setFilterColaborador] = useState<string>('todos');
  const [filterOperacao, setFilterOperacao] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [processFilter, setProcessFilter] = useState<string>('todos');

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Operator comment input state for Personal Actions
  const [operatorComments, setOperatorComments] = useState<Record<string, string>>({});

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Seed sample data if empty or lacking user actions so features can be tested immediately
  const seedInitialDataIfNeeded = (existing: AcaoCorretiva[]) => {
    const hasUserAction = existing.some(a => 
      a.colaboradorResponsavel.toLowerCase().includes(userName.toLowerCase()) ||
      userName.toLowerCase().includes(a.colaboradorResponsavel.toLowerCase())
    );

    if (existing.length >= 5 && hasUserAction) return existing;

    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const nextWeekStr = new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0];

    const seeds: AcaoCorretiva[] = [
      {
        id: `AC_ALERT_${Date.now()}_1`,
        data: new Date().toLocaleDateString('pt-BR'),
        dataISO: todayStr,
        hora: '08:00',
        processo: 'Picking',
        setor: 'Armazém 01',
        colaboradorResponsavel: userName,
        indicador: 'Acuracidade de Picking & Refugo',
        meta: '≤ 1.0%',
        resultadoObtido: '1.35%',
        desvioEncontrado: 'Prevenção de avarias e conferência dupla no setor de Picking',
        causaRaiz: 'Método',
        status: 'Pendente',
        responsavelTratativa: 'Supervisor de Operações',
        prazo: nextWeekStr,
        comentarioOperador: '',
        abertoPor: `Supervisor de Operações`,
        dataAbertura: `${todayStr} 08:00`,
        historicoAlteracoes: [{
          dataHora: new Date().toLocaleString('pt-BR'),
          usuario: 'Supervisor de Operações',
          alteracao: `Ação corretiva atribuída a ${userName}.`
        }],
        simulado: false,
        criadoEm: new Date().toISOString(),
        tipoAcao: 'Corretiva',
        prioridade: 'Alta',
        contramedida: 'Realizar kitting com dupla checagem visual dos vasilhames retornáveis antes da expedição.',
        aprovacaoGestor: 'Aprovado',
        aceiteColaborador: false
      },
      {
        id: `AC_OVERDUE_${Date.now()}_2`,
        data: new Date(Date.now() - 5 * 86400000).toLocaleDateString('pt-BR'),
        dataISO: yesterdayStr,
        hora: '10:30',
        processo: 'EFC',
        setor: 'Expedição / Carregamento',
        colaboradorResponsavel: userName,
        indicador: 'Eficiência de Carga (EFC %)',
        meta: '≥ 96.0%',
        resultadoObtido: '94.2%',
        desvioEncontrado: 'Atraso na montagem e conferencia do palete de Brahma 350ml',
        causaRaiz: 'Mão de Obra',
        status: 'Pendente',
        responsavelTratativa: 'Coordenador de Operações',
        prazo: yesterdayStr, // OVERDUE!
        prazoOriginal: yesterdayStr,
        comentarioOperador: '',
        abertoPor: `Coordenador de Operações`,
        dataAbertura: `${yesterdayStr} 10:30`,
        historicoAlteracoes: [{
          dataHora: new Date(Date.now() - 5 * 86400000).toLocaleString('pt-BR'),
          usuario: 'Coordenador de Operações',
          alteracao: `Ação com prazo expirado em ${yesterdayStr}.`
        }],
        simulado: false,
        criadoEm: new Date(Date.now() - 5 * 86400000).toISOString(),
        tipoAcao: 'Corretiva',
        prioridade: 'Alta',
        contramedida: 'Adequação imediata do mapa de picking e reabastecimento aéreo.',
        aprovacaoGestor: 'Aprovado',
        aceiteColaborador: false
      },
      {
        id: `AC_SEED_GLADSON`,
        data: new Date().toLocaleDateString('pt-BR'),
        dataISO: todayStr,
        hora: '07:30',
        processo: 'Despejo',
        setor: 'Área de Despejo',
        colaboradorResponsavel: 'Gladson Lisboa dos Santos',
        indicador: 'Índice de Quebras & Despejo',
        meta: '≤ 0.15%',
        resultadoObtido: '0.22%',
        desvioEncontrado: 'Acúmulo de cacos e ajuste de canaleta de retenção',
        causaRaiz: 'Máquina',
        status: 'Em Andamento',
        responsavelTratativa: 'Supervisor DPO',
        prazo: nextWeekStr,
        comentarioOperador: 'Em andamento na esteira 2.',
        abertoPor: `Supervisor DPO`,
        dataAbertura: `${todayStr} 07:30`,
        historicoAlteracoes: [{
          dataHora: new Date().toLocaleString('pt-BR'),
          usuario: 'Supervisor DPO',
          alteracao: 'Ação iniciada por Gladson Lisboa.'
        }],
        simulado: false,
        criadoEm: new Date().toISOString(),
        tipoAcao: 'Corretiva',
        prioridade: 'Média',
        contramedida: 'Desobstrução e substituição de calhas de descarte.',
        aprovacaoGestor: 'Aprovado',
        aceiteColaborador: true
      },
      {
        id: `AC_SEED_RONILDO`,
        data: new Date().toLocaleDateString('pt-BR'),
        dataISO: todayStr,
        hora: '09:15',
        processo: 'Repack',
        setor: 'Linha 1 Repack',
        colaboradorResponsavel: 'Ronildo Paiva',
        indicador: 'Tempo de Atendimento Repack',
        meta: '≤ 20 min',
        resultadoObtido: '28 min',
        desvioEncontrado: 'Padronização do kit de selagem rápida na bancada A',
        causaRaiz: 'Método',
        status: 'Concluído',
        concluidoNoPrazo: true,
        responsavelTratativa: 'Supervisor Qualidade',
        prazo: todayStr,
        comentarioOperador: 'Concluído no prazo.',
        abertoPor: `Supervisor Qualidade`,
        dataAbertura: `${todayStr} 09:15`,
        fechadoPor: `Ronildo Paiva (Repack)`,
        dataFechamento: `${todayStr} 11:30`,
        historicoAlteracoes: [{
          dataHora: new Date().toLocaleString('pt-BR'),
          usuario: 'Ronildo Paiva',
          alteracao: 'Ação concluída com sucesso dentro do prazo.'
        }],
        simulado: false,
        criadoEm: new Date().toISOString(),
        tipoAcao: 'Corretiva',
        prioridade: 'Alta',
        contramedida: 'Instalação de suporte rápido de fita e caixas novas.',
        aprovacaoGestor: 'Aprovado',
        aceiteColaborador: true
      },
      {
        id: `AC_SEED_GILSON`,
        data: new Date().toLocaleDateString('pt-BR'),
        dataISO: todayStr,
        hora: '11:00',
        processo: 'Carregamento',
        setor: 'Doca de Expedição',
        colaboradorResponsavel: 'Gilson Ferreira',
        indicador: 'TMR - Pátio',
        meta: '≤ 45 min',
        resultadoObtido: '52 min',
        desvioEncontrado: 'Check-in digital antecipado via portaria central',
        causaRaiz: 'Método',
        status: 'Concluído',
        concluidoNoPrazo: true,
        responsavelTratativa: 'Líder de Expedição',
        prazo: todayStr,
        comentarioOperador: 'Liberação acelerada.',
        abertoPor: `Líder de Expedição`,
        dataAbertura: `${todayStr} 11:00`,
        fechadoPor: `Gilson Ferreira (Carregamento)`,
        dataFechamento: `${todayStr} 12:45`,
        historicoAlteracoes: [{
          dataHora: new Date().toLocaleString('pt-BR'),
          usuario: 'Gilson Ferreira',
          alteracao: 'Ação concluída dentro do prazo estipulado.'
        }],
        simulado: false,
        criadoEm: new Date().toISOString(),
        tipoAcao: 'Corretiva',
        prioridade: 'Média',
        contramedida: 'Uso de coletor sem fio na conferência externa.',
        aprovacaoGestor: 'Aprovado',
        aceiteColaborador: true
      }
    ];

    const existingIds = new Set(existing.map(a => a.id));
    const newSeeds = seeds.filter(s => !existingIds.has(s.id));
    if (newSeeds.length === 0) return existing;

    const merged = [...existing, ...newSeeds];
    saveAcoes(merged);
    return merged;
  };

  const loadData = () => {
    const listDemands = getStored5PorquesDemandas(empresaId);
    setDemands(listDemands);
    let listAcoes = getAcoesAll();
    listAcoes = seedInitialDataIfNeeded(listAcoes);

    // Ensure all actions have explicit open/close tracking values
    const sanitized = listAcoes.map(a => ({
      ...a,
      abertoPor: a.abertoPor || a.responsavelTratativa || a.historicoAlteracoes?.[0]?.usuario || 'Supervisor DPO',
      dataAbertura: a.dataAbertura || a.data || a.criadoEm || a.dataISO,
      fechadoPor: a.status === 'Concluído' ? (a.fechadoPor || a.colaboradorResponsavel || userName) : undefined,
      dataFechamento: a.status === 'Concluído' ? (a.dataFechamento || a.dataISO || 'Concluído') : undefined
    }));

    setAcoes(sanitized);
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener('5porques_demands_updated', handleUpdate);
    window.addEventListener('local_data_changed', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('5porques_demands_updated', handleUpdate);
      window.removeEventListener('local_data_changed', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [empresaId]);

  // Total deviations identified (Platform Indicators below target + 5-Whys reported demands)
  const totalDesviosIdentificados = useMemo(() => {
    return PLATFORM_DEVIATIONS.length + demands.length;
  }, [demands]);

  // Actions assigned specifically to the current logged-in user & sector
  const minhasAcoes = useMemo(() => {
    const uNameLower = userName.toLowerCase();
    const uSectorLower = (user.cargo || user.papel || '').toLowerCase();

    return acoes.filter(a => {
      const matchColab = a.colaboradorResponsavel.toLowerCase().includes(uNameLower) ||
        uNameLower.includes(a.colaboradorResponsavel.toLowerCase()) ||
        (a.responsavelTratativa && a.responsavelTratativa.toLowerCase().includes(uNameLower)) ||
        (a.abertoPor && a.abertoPor.toLowerCase().includes(uNameLower)) ||
        (a.fechadoPor && a.fechadoPor.toLowerCase().includes(uNameLower));

      const matchSetor = uSectorLower && (
        a.setor.toLowerCase().includes(uSectorLower) ||
        uSectorLower.includes(a.setor.toLowerCase()) ||
        a.processo.toLowerCase().includes(uSectorLower) ||
        uSectorLower.includes(a.processo.toLowerCase())
      );

      return matchColab || matchSetor || a.id.startsWith('AC_USER_') || a.id.startsWith('AC_ALERT_') || a.id.startsWith('AC_OVERDUE_');
    });
  }, [acoes, userName, user.cargo, user.papel]);

  // Detect pending action assigned to current user for the instant Alert Banner/Modal
  const pendingUserAlertAction = useMemo(() => {
    return minhasAcoes.find(a => 
      a.status === 'Pendente' && 
      !dismissedAlertIds.includes(a.id)
    );
  }, [minhasAcoes, dismissedAlertIds]);

  // Action Handler: "INICIAR AGORA"
  const handleIniciarAgora = (acaoId: string) => {
    const now = new Date();
    const currentAcoes = getAcoesAll();
    const updated = currentAcoes.map(a => {
      if (a.id === acaoId) {
        return {
          ...a,
          status: 'Em Andamento' as const,
          dataInicioExecucao: now.toISOString(),
          aceiteColaborador: true,
          historicoAlteracoes: [
            ...a.historicoAlteracoes,
            {
              dataHora: now.toLocaleString('pt-BR'),
              usuario: userName,
              alteracao: 'Colaborador iniciou a execução da ação (Status alterado para Em Andamento).'
            }
          ]
        };
      }
      return a;
    });

    saveAcoes(updated);
    setDismissedAlertIds(prev => [...prev, acaoId]);
    window.dispatchEvent(new Event('local_data_changed'));
    loadData();
    showToast(`⚡ Execução da Ação iniciada com sucesso por ${userName}!`);
  };

  // Action Handler: "INICIAR DEPOIS"
  const handleIniciarDepois = (acaoId: string) => {
    setDismissedAlertIds(prev => [...prev, acaoId]);
    showToast(`⏰ Ação mantida na sua lista para início posterior.`);
  };

  // Open modal for Overdue Justification & Rescheduling
  const handleOpenJustifyModal = (acao: AcaoCorretiva) => {
    setActionToJustify(acao);
    setJustificativaText(acao.justificativaAtraso || '');
    setNovoPrazoDate(new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]);
    setShowJustifyModal(true);
  };

  // Confirm Rescheduling with Delay Justification
  const handleConfirmJustifyAndReschedule = async () => {
    if (!actionToJustify) return;

    if (!justificativaText.trim()) {
      alert('Por favor, informe a justificativa detalhada do atraso para o reagendamento.');
      return;
    }

    if (!novoPrazoDate) {
      alert('Por favor, selecione a nova data reagendada para conclusão.');
      return;
    }

    const now = new Date();
    const oldPrazo = actionToJustify.prazo;
    const currentAcoes = getAcoesAll();

    const updated = currentAcoes.map(a => {
      if (a.id === actionToJustify.id) {
        return {
          ...a,
          prazo: novoPrazoDate,
          prazoOriginal: a.prazoOriginal || oldPrazo,
          justificativaAtraso: justificativaText.trim(),
          reagendadoCount: (a.reagendadoCount || 0) + 1,
          status: 'Em Andamento' as const,
          historicoAlteracoes: [
            ...a.historicoAlteracoes,
            {
              dataHora: now.toLocaleString('pt-BR'),
              usuario: userName,
              alteracao: `Prazo Reagendado de ${oldPrazo} para ${novoPrazoDate}. Justificativa: "${justificativaText.trim()}".`
            }
          ]
        };
      }
      return a;
    });

    saveAcoes(updated);

    // Save update to Firestore if present
    if (db) {
      try {
        await addDoc(collection(db, 'acoes_reagendamentos'), {
          empresaId,
          acaoId: actionToJustify.id,
          colaborador: userName,
          prazoAnterior: oldPrazo,
          novoPrazo: novoPrazoDate,
          justificativa: justificativaText.trim(),
          dataHora: now.toISOString()
        });
      } catch (e) {
        console.error("Erro ao salvar reagendamento no Firestore:", e);
      }
    }

    window.dispatchEvent(new Event('local_data_changed'));
    setShowJustifyModal(false);
    setActionToJustify(null);
    loadData();
    showToast(`✅ Prazo reagendado para ${novoPrazoDate} com justificativa registrada!`);
  };

  // Open modal to generate corrective action from an Indicator Deviation
  const handleOpenModalForIndicator = (dev: IndicatorDevationItem) => {
    setSelectedDeviation(dev);
    setSelectedDemand(null);
    setActionTitle(`[Tratativa] ${dev.indicador} (${dev.desvioCalculado})`);
    setActionColab(userName);
    setActionSup(userName);
    
    let mappedProc: AcaoCorretiva['processo'] = 'Picking';
    const pUpper = dev.processo.toUpperCase();
    if (pUpper.includes('EFC')) mappedProc = 'EFC';
    else if (pUpper.includes('EFD')) mappedProc = 'EFD';
    else if (pUpper.includes('TMR') || pUpper.includes('PÁTIO')) mappedProc = 'Carregamento';
    else if (pUpper.includes('FEFO')) mappedProc = 'Gestão FEFO';
    else if (pUpper.includes('QUEBRAS')) mappedProc = 'Gestão de Quebras';
    else if (pUpper.includes('INVENTÁRIO')) mappedProc = 'Gestão de Capacidade';
    setActionProcess(mappedProc);

    setActionContramedida(`Contramedida imediata para corrigir desvio no indicador ${dev.indicador}. Causa raiz: ${dev.causaProvavel}`);
    setShowGerarAcaoModal(true);
  };

  // Open modal to generate corrective action from a 5 Whys demand
  const handleOpenGerarAcaoModal = (demand: Demand5Porques) => {
    setSelectedDemand(demand);
    setSelectedDeviation(null);
    setActionTitle(`Ação Corretiva - Desvio de Meta (${demand.indicador || demand.processo})`);
    setActionColab(demand.colaborador || userName);
    setActionSup(userName);
    
    let mappedProc: AcaoCorretiva['processo'] = 'Picking';
    const pUpper = (demand.processo || '').toUpperCase();
    if (pUpper.includes('REPACK')) mappedProc = 'Repack';
    else if (pUpper.includes('DESPEJO')) mappedProc = 'Despejo';
    else if (pUpper.includes('EFC')) mappedProc = 'EFC';
    else if (pUpper.includes('EFD')) mappedProc = 'EFD';
    else if (pUpper.includes('RESSUPRIMENTO')) mappedProc = 'Ressuprimento';
    else if (pUpper.includes('QUEBRAS')) mappedProc = 'Gestão de Quebras';
    else if (pUpper.includes('FEFO')) mappedProc = 'Gestão FEFO';
    setActionProcess(mappedProc);

    setActionContramedida(demand.porque5 ? `Tratativa para Causa Raiz: ${demand.porque5}` : 'Acompanhamento e reorientação operacional.');
    setShowGerarAcaoModal(true);
  };

  // Submit Corrective Action from Desvio
  const handleConfirmGerarAcao = async () => {
    if (!actionTitle.trim() || !actionColab.trim() || !actionContramedida.trim()) {
      alert('Por favor, preencha o Título, o Colaborador e a Contramedida da ação.');
      return;
    }

    const now = new Date();
    const newAcaoId = `AC_DESVIO_${Date.now()}`;
    const newAcao: AcaoCorretiva = {
      id: newAcaoId,
      data: now.toLocaleDateString('pt-BR'),
      dataISO: now.toISOString().split('T')[0],
      hora: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      processo: actionProcess,
      setor: selectedDemand?.processo || selectedDeviation?.processo || 'Operação',
      colaboradorResponsavel: actionColab,
      indicador: selectedDemand?.indicador || selectedDeviation?.indicador || 'Meta Operacional',
      meta: selectedDemand?.meta || selectedDeviation?.meta || '100% Atingimento',
      resultadoObtido: selectedDemand?.resultadoObtido || selectedDeviation?.resultadoAtual || 'Fora da Meta',
      desvioEncontrado: selectedDemand?.desvioEncontrado || selectedDeviation?.desvioCalculado || actionTitle,
      causaRaiz: actionCausaRaiz,
      status: 'Pendente',
      responsavelTratativa: actionSup,
      prazo: actionPrazo,
      comentarioOperador: '',
      abertoPor: `${userName}${user.cargo ? ` (${user.cargo})` : ''}`,
      dataAbertura: `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
      historicoAlteracoes: [{
        dataHora: now.toLocaleString('pt-BR'),
        usuario: userName,
        alteracao: `Ação corretiva aberta por ${userName} e atribuída a ${actionColab}.`
      }],
      simulado: false,
      criadoEm: now.toISOString(),
      tipoAcao: 'Corretiva',
      prioridade: actionPrioridade,
      cincoPorques: selectedDemand ? {
        porque1: selectedDemand.porque1 || '',
        porque2: selectedDemand.porque2 || '',
        porque3: selectedDemand.porque3 || '',
        porque4: selectedDemand.porque4 || '',
        porque5: selectedDemand.porque5 || ''
      } : undefined,
      contramedida: actionContramedida,
      aprovacaoGestor: 'Aprovado',
      aceiteColaborador: false
    };

    const currentAcoes = getAcoesAll();
    saveAcoes([newAcao, ...currentAcoes]);

    if (db) {
      try {
        await addDoc(collection(db, 'acoes'), {
          empresaId,
          titulo: newAcao.indicador,
          descricao: newAcao.desvioEncontrado,
          responsavel: newAcao.colaboradorResponsavel,
          dataLimite: newAcao.prazo,
          status: 'Pendente',
          prioridade: newAcao.prioridade,
          setor: newAcao.setor,
          origem: 'Quadro de Desvios e Ações',
          criadoEm: now.toISOString()
        });
      } catch (e) {
        console.error("Erro ao salvar ação no Firestore:", e);
      }
    }

    if (selectedDemand) {
      update5PorquesDemandStatus(empresaId, selectedDemand.id, 'Analisado / Acao Atribuida', newAcaoId);
    }

    window.dispatchEvent(new Event('local_data_changed'));

    setShowGerarAcaoModal(false);
    setSelectedDemand(null);
    setSelectedDeviation(null);
    loadData();
    showToast(`✅ Ação Corretiva gerada e destinada a ${actionColab}!`);
  };

  // Toggle Action Status (Concluir / Pendente)
  const handleToggleStatusAcao = (acaoId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'Concluído' ? 'Pendente' : 'Concluído';
    const now = new Date();
    const dateStr = `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    const currentAcoes = getAcoesAll();

    const updated = currentAcoes.map(a => {
      if (a.id === acaoId) {
        const isOverdueAtCompletion = checkIsOverdue(a.prazo, 'Pendente');
        const isClosing = nextStatus === 'Concluído';

        return {
          ...a,
          status: nextStatus as any,
          concluidoNoPrazo: isClosing ? (!isOverdueAtCompletion && !a.justificativaAtraso) : undefined,
          fechadoPor: isClosing ? `${userName}${user.cargo ? ` (${user.cargo})` : ''}` : undefined,
          dataFechamento: isClosing ? dateStr : undefined,
          historicoAlteracoes: [
            ...a.historicoAlteracoes,
            {
              dataHora: now.toLocaleString('pt-BR'),
              usuario: userName,
              alteracao: isClosing 
                ? `Ação CONCLUÍDA / FECHADA por ${userName}.`
                : `Ação REABERTA por ${userName}.`
            }
          ]
        };
      }
      return a;
    });

    saveAcoes(updated);
    window.dispatchEvent(new Event('local_data_changed'));
    loadData();
    showToast(nextStatus === 'Concluído' 
      ? `✅ Ação FECHADA com sucesso por ${userName}!` 
      : `🔄 Ação reaberta por ${userName}.`
    );
  };

  // Get unique list of collaborators for Governance Filter
  const listaColaboradoresUnicos = useMemo(() => {
    const setColab = new Set<string>();
    acoes.forEach(a => {
      if (a.colaboradorResponsavel) setColab.add(a.colaboradorResponsavel);
    });
    LISTA_COLABORADORES_OFICIAIS.forEach(c => setColab.add(c.nome));
    setColab.add(userName);
    return Array.from(setColab).sort();
  }, [acoes, userName]);

  // Governance Filtered Actions & Performance Calculations
  const acoesGovernançaFiltradas = useMemo(() => {
    return acoes.filter(a => {
      // 1. Colaborador Filter
      if (filterColaborador !== 'todos') {
        const matchColab = a.colaboradorResponsavel.toLowerCase().includes(filterColaborador.toLowerCase());
        if (!matchColab) return false;
      }
      // 2. Operação / Processo Filter
      if (filterOperacao !== 'todos') {
        if (a.processo !== filterOperacao) return false;
      }
      // 3. Status Filter
      if (filterStatus !== 'todos') {
        if (filterStatus === 'Atrasado') {
          if (!checkIsOverdue(a.prazo, a.status) && !a.justificativaAtraso && a.status !== 'Atrasado') return false;
        } else if (filterStatus === 'Concluído no Prazo') {
          if (a.status !== 'Concluído' || a.justificativaAtraso || a.concluidoNoPrazo === false) return false;
        } else if (filterStatus === 'Concluído com Atraso') {
          if (a.status !== 'Concluído' || (!a.justificativaAtraso && a.concluidoNoPrazo !== false)) return false;
        } else {
          if (a.status !== filterStatus) return false;
        }
      }
      return true;
    });
  }, [acoes, filterColaborador, filterOperacao, filterStatus]);

  // Performance metrics calculated from the filtered actions
  const estatisticasGovernança = useMemo(() => {
    const totalGeradas = acoesGovernançaFiltradas.length;
    
    // Concluídas sem atraso nem reagendamento
    const concluidasNoPrazo = acoesGovernançaFiltradas.filter(a => 
      a.status === 'Concluído' && !a.justificativaAtraso && (a.concluidoNoPrazo !== false)
    ).length;

    // Concluídas no total
    const concluidasTotal = acoesGovernançaFiltradas.filter(a => a.status === 'Concluído').length;

    // Atrasadas ou Reagendadas com justificativa
    const atrasadasOuReagendadas = acoesGovernançaFiltradas.filter(a => 
      checkIsOverdue(a.prazo, a.status) || a.justificativaAtraso || a.status === 'Atrasado'
    ).length;

    const emAndamento = acoesGovernançaFiltradas.filter(a => a.status === 'Em Andamento').length;
    const pendentes = acoesGovernançaFiltradas.filter(a => a.status === 'Pendente').length;

    // % de Fechamento de Ações Dentro do Prazo (Target = 90%)
    const percentualAtingimentoNoPrazo = totalGeradas > 0 ? (concluidasNoPrazo / totalGeradas) * 100 : 100;
    const metaAtingida = percentualAtingimentoNoPrazo >= 90.0;

    // ETAPA 1: % de Ações Fechadas ÷ Total de Desvios de Meta Identificados na Plataforma
    const totalAcoesFechadasGlobal = acoes.filter(a => a.status === 'Concluído').length;
    const percentualFechadasVsDesvios = totalDesviosIdentificados > 0 
      ? (totalAcoesFechadasGlobal / totalDesviosIdentificados) * 100 
      : 0;

    return {
      totalGeradas,
      concluidasNoPrazo,
      concluidasTotal,
      atrasadasOuReagendadas,
      emAndamento,
      pendentes,
      percentualAtingimentoNoPrazo,
      metaAtingida,
      totalAcoesFechadasGlobal,
      percentualFechadasVsDesvios
    };
  }, [acoesGovernançaFiltradas, acoes, totalDesviosIdentificados]);

  return (
    <div className="w-full flex flex-col gap-6 text-slate-100 bg-[#0b1222] p-4 sm:p-6 rounded-3xl border border-slate-800 shadow-2xl">
      
      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white font-black px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-emerald-400 animate-bounce">
          <Sparkles className="w-5 h-5 text-amber-300" />
          <span className="text-xs">{toastMessage}</span>
        </div>
      )}

      {/* 🚨 ALERTA POPUP/BANNER: AÇÃO GERADA PARA VOCÊ (OPERAÇÃO / WORKSTATION) */}
      {pendingUserAlertAction && (
        <div className="p-5 bg-gradient-to-r from-amber-950/90 via-[#111a30] to-indigo-950/90 border-2 border-amber-500 rounded-3xl shadow-2xl space-y-3 relative overflow-hidden animate-pulse">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/30 pb-2">
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-amber-500 text-slate-950 font-black rounded-xl shadow-md">
                <Zap className="w-5 h-5 animate-spin" />
              </span>
              <div>
                <span className="text-[10px] font-black uppercase text-amber-400 font-mono block">
                  ALERTA WORKSTATION OPERACIONAL
                </span>
                <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                  Nova Ação Corretiva Gerada para Você!
                </h3>
              </div>
            </div>

            <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/40">
              Prazo Estipulado: {pendingUserAlertAction.prazo}
            </span>
          </div>

          <div className="p-3 bg-[#080d1a] rounded-2xl border border-slate-800 text-xs space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase text-indigo-400">{pendingUserAlertAction.processo} • Setor: {pendingUserAlertAction.setor}</span>
              <span className="text-[10px] text-slate-400">Atribuído por: {pendingUserAlertAction.responsavelTratativa}</span>
            </div>
            <strong className="text-sm font-black text-white block">{pendingUserAlertAction.desvioEncontrado || pendingUserAlertAction.indicador}</strong>
            {pendingUserAlertAction.contramedida && (
              <p className="text-slate-300 text-xs pt-1">
                <strong className="text-emerald-400">Contramedida a Executar:</strong> {pendingUserAlertAction.contramedida}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={() => handleIniciarDepois(pendingUserAlertAction.id)}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer border border-slate-700 uppercase tracking-wider flex items-center gap-1.5"
            >
              <Clock className="w-4 h-4 text-amber-400" />
              Iniciar Depois
            </button>

            <button
              type="button"
              onClick={() => handleIniciarAgora(pendingUserAlertAction.id)}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl transition-all cursor-pointer shadow-xl uppercase tracking-wider flex items-center gap-2 animate-bounce"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              Iniciar Agora
            </button>
          </div>
        </div>
      )}

      {/* 🚀 HEADER DA GUIA DESVIOS E AÇÕES (WORKSTATION OPERACIONAL) */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 border-b border-slate-800 pb-5">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> Workstation Operacional
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-teal-400 bg-teal-500/10 px-3 py-1 rounded-full border border-teal-500/20 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-teal-400" /> Meta de Atingimento: 90.0%
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <AlertTriangle className="w-7 h-7 text-rose-400 shrink-0" />
            Desvios e Ações Operacionais
          </h1>
          
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Painel direcionado às ações do colaborador e à governança geral de desvios com meta de atingimento de 90% dentro do prazo, alertas de novas ações e reagendamento com justificativa obrigatória.
          </p>
        </div>

        {/* NAVEGAÇÃO ENTRE ABAS INTERNAS DO WORKSTATION */}
        <div className="flex flex-wrap items-center gap-2 bg-[#111a30] p-1.5 rounded-2xl border border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('minhas_acoes')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'minhas_acoes'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-4 h-4 text-slate-950" />
            Minhas Ações ({minhasAcoes.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('governanca')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'governanca'
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-teal-300" />
            Governança & Filtros 90%
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('desvios')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'desvios'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-rose-300" />
            Desvios de Meta ({totalDesviosIdentificados})
          </button>
        </div>
      </div>

      {/* 🎯 PAINEL DE PERFORMANCE E RESOLUÇÃO DE DESVIOS (ETAPA 1) */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          
          {/* KPI CARD 1: TOTAL DE DESVIOS IDENTIFICADOS */}
          <div className="p-3.5 bg-[#111a30] border border-rose-500/30 rounded-2xl space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 block">Desvios Identificados</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-rose-400 font-mono">{totalDesviosIdentificados}</span>
              <span className="text-[10px] text-slate-400">fora da meta</span>
            </div>
            <p className="text-[10px] text-slate-400">Indicadores & Processos</p>
          </div>

          {/* KPI CARD 2: TOTAL AÇÕES GERADAS */}
          <div className="p-3.5 bg-[#111a30] border border-slate-800 rounded-2xl space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Ações Atribuídas</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white font-mono">{estatisticasGovernança.totalGeradas}</span>
              <span className="text-[10px] text-slate-400">no plano geral</span>
            </div>
            <p className="text-[10px] text-slate-400">Tratativas ativas</p>
          </div>

          {/* KPI CARD 3: AÇÕES FECHADAS */}
          <div className="p-3.5 bg-[#111a30] border border-emerald-500/30 rounded-2xl space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">Ações Fechadas</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-400 font-mono">{estatisticasGovernança.totalAcoesFechadasGlobal}</span>
              <span className="text-[10px] text-emerald-300">concluídas</span>
            </div>
            <p className="text-[10px] text-slate-400">Resoluções efetuadas</p>
          </div>

          {/* KPI CARD 4: % AÇÕES FECHADAS ÷ TOTAL DESVIOS */}
          <div className="p-3.5 bg-gradient-to-br from-[#0c1a30] to-[#122342] border border-indigo-500/40 rounded-2xl space-y-1 shadow-md">
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300 block">
              % Ações Fechadas
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-indigo-300 font-mono">
                {estatisticasGovernança.percentualFechadasVsDesvios.toFixed(1)}%
              </span>
              <span className="text-[10px] text-slate-300">
                ({estatisticasGovernança.totalAcoesFechadasGlobal} ÷ {totalDesviosIdentificados})
              </span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
              <div 
                className="h-full bg-indigo-400 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(estatisticasGovernança.percentualFechadasVsDesvios, 100)}%` }}
              />
            </div>
            <p className="text-[9px] text-indigo-200 font-medium pt-0.5">Fechadas ÷ Total Desvios</p>
          </div>

          {/* KPI CARD 5: % ATINGIMENTO NO PRAZO (META 90%) */}
          <div className={`p-3.5 rounded-2xl space-y-1 border shadow-md relative overflow-hidden ${
            estatisticasGovernança.metaAtingida
              ? 'bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 border-emerald-500/50'
              : 'bg-gradient-to-br from-rose-950 via-slate-900 to-amber-950 border-rose-500/50'
          }`}>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-teal-300 block">
                No Prazo (Meta 90%)
              </span>
              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                90%
              </span>
            </div>

            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl font-black font-mono ${
                estatisticasGovernança.metaAtingida ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {estatisticasGovernança.percentualAtingimentoNoPrazo.toFixed(1)}%
              </span>
              <span className="text-[10px] text-slate-300">
                ({estatisticasGovernança.concluidasNoPrazo}/{estatisticasGovernança.totalGeradas})
              </span>
            </div>

            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
              <div 
                className={`h-full transition-all duration-500 rounded-full ${
                  estatisticasGovernança.metaAtingida ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
                style={{ width: `${Math.min(estatisticasGovernança.percentualAtingimentoNoPrazo, 100)}%` }}
              />
            </div>

            <span className={`text-[9px] font-black block pt-0.5 uppercase ${
              estatisticasGovernança.metaAtingida ? 'text-emerald-300' : 'text-rose-300'
            }`}>
              {estatisticasGovernança.metaAtingida 
                ? '🎯 Meta Atingida (≥ 90%)' 
                : '⚠️ Abaixo da Meta de 90%'}
            </span>
          </div>

        </div>

        {/* BANNER DE SINCRONIZAÇÃO DAS AÇÕES COM A GUIA GERAL DE AÇÕES DA PLATAFORMA */}
        <div className="p-3 bg-gradient-to-r from-indigo-950/80 via-[#0e172e] to-teal-950/80 border border-indigo-500/30 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-500/30">
              <ExternalLink className="w-4 h-4" />
            </div>
            <div>
              <strong className="text-white font-black block">Sincronização Integrada de Ações</strong>
              <p className="text-[11px] text-slate-300">
                Todas as ações geradas em <strong className="text-amber-400">Desvios e Ações</strong> também são consolidadas em tempo real na <strong className="text-indigo-300">Guia Geral de Ações (Plano de Ação)</strong> da plataforma.
              </p>
            </div>
          </div>

          {onNavigateToAcoes && (
            <button
              type="button"
              onClick={onNavigateToAcoes}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl text-xs transition-all cursor-pointer shadow-md flex items-center gap-1.5 uppercase tracking-wider shrink-0"
            >
              Guia Geral de Ações <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* SEÇÃO 1: GUIA MINHAS AÇÕES DIRECIONADAS AO USUÁRIO (WORKSTATION) */}
      {/* ==================================================================== */}
      {activeTab === 'minhas_acoes' && (
        <div className="space-y-4">
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <User className="w-6 h-6 text-amber-400 shrink-0" />
              <div>
                <strong className="text-xs text-white block uppercase tracking-wider">
                  Ações Corretivas Direcionadas a Você ({userName})
                </strong>
                <p className="text-[11px] text-slate-300">
                  Pegue suas ações para dar andamento, inicie o atendimento, justifique atrasos e reagende se necessário.
                </p>
              </div>
            </div>

            <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/20 px-3 py-1 rounded-xl border border-amber-500/30 shrink-0">
              {minhasAcoes.length} Ação(ões) Atribuída(s)
            </span>
          </div>

          {minhasAcoes.length === 0 ? (
            <div className="p-8 text-center bg-[#111a30] rounded-2xl border border-slate-800 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <strong className="text-sm text-white block font-black">Nenhuma Ação Atribuída no Momento</strong>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Você não possui ações pendentes atribuídas ao seu usuário no momento.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {minhasAcoes.map(acao => {
                const isOverdue = checkIsOverdue(acao.prazo, acao.status);

                return (
                  <div 
                    key={acao.id}
                    className={`p-5 bg-[#111a30] border rounded-2xl space-y-4 flex flex-col justify-between transition-all shadow-md ${
                      isOverdue 
                        ? 'border-rose-500/60 bg-[#161224]' 
                        : acao.status === 'Concluído' 
                        ? 'border-emerald-500/40 bg-[#0d1726]' 
                        : 'border-amber-500/40'
                    }`}
                  >
                    <div className="space-y-3">
                      
                      {/* HEADER CARD */}
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-[10px] font-mono font-bold text-amber-300 px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30">
                          {acao.processo}
                        </span>

                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                          acao.status === 'Concluído'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : isOverdue
                            ? 'bg-rose-600 text-white animate-pulse'
                            : acao.status === 'Em Andamento'
                            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {isOverdue ? 'ATRASADO / VENCIDO' : acao.status}
                        </span>
                      </div>

                      {/* DETALHES DA AÇÃO */}
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">Indicador: {acao.indicador}</span>
                        <strong className="text-sm text-white block mt-0.5 font-black">{acao.desvioEncontrado || acao.indicador}</strong>
                        
                        <div className="flex items-center gap-3 mt-1.5 text-xs font-mono">
                          <span className="text-slate-400">Prazo Estipulado: <strong className={isOverdue ? 'text-rose-400' : 'text-emerald-400'}>{acao.prazo}</strong></span>
                          {acao.prazoOriginal && acao.prazoOriginal !== acao.prazo && (
                            <span className="text-amber-400">Orig: {acao.prazoOriginal}</span>
                          )}
                        </div>
                      </div>

                      {/* CONTRAMEDIDA */}
                      {acao.contramedida && (
                        <div className="p-3 bg-[#0b1222] rounded-xl border border-slate-800 text-xs text-slate-200 space-y-1">
                          <span className="text-[9px] text-emerald-400 font-black uppercase block">Contramedida Estipulada:</span>
                          <p className="text-xs">{acao.contramedida}</p>
                        </div>
                      )}

                      {/* JUSTIFICATIVA DE ATRASO REGISTRADA */}
                      {acao.justificativaAtraso && (
                        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1 text-xs text-amber-200">
                          <span className="text-[9px] text-amber-400 font-black uppercase block flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-400" /> Justificativa de Atraso Registrada:
                          </span>
                          <p className="text-xs italic">"{acao.justificativaAtraso}"</p>
                        </div>
                      )}

                      {/* AUDITORIA: QUEM ABRIU E QUEM FECHOU A AÇÃO */}
                      <div className="p-2.5 bg-[#080d1a] rounded-xl border border-slate-800 text-[11px] space-y-1">
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <span className="text-slate-400">
                            🔓 <strong className="text-slate-300">Aberto por:</strong>{' '}
                            <strong className="text-indigo-300">{acao.abertoPor || acao.responsavelTratativa || 'Supervisor DPO'}</strong>
                          </span>
                          {acao.dataAbertura && (
                            <span className="text-[10px] text-slate-500 font-mono">{acao.dataAbertura}</span>
                          )}
                        </div>

                        {acao.status === 'Concluído' ? (
                          <div className="flex flex-wrap items-center justify-between gap-1 border-t border-slate-800/80 pt-1 mt-1">
                            <span className="text-slate-400">
                              🏁 <strong className="text-slate-300">Fechado por:</strong>{' '}
                              <strong className="text-emerald-300">{acao.fechadoPor || acao.colaboradorResponsavel || userName}</strong>
                            </span>
                            {acao.dataFechamento && (
                              <span className="text-[10px] text-emerald-400 font-mono">{acao.dataFechamento}</span>
                            )}
                          </div>
                        ) : (
                          <div className="border-t border-slate-800/80 pt-1 mt-1 text-[10px] text-amber-400/90 font-medium">
                            ⏳ <strong className="text-amber-300">Status:</strong> Aberta (Aguardando Conclusão)
                          </div>
                        )}
                      </div>

                      {/* ALERTA DE PRAZO PASSADO */}
                      {isOverdue && (
                        <div className="p-3 bg-rose-500/15 border border-rose-500/40 rounded-xl space-y-2 text-xs text-rose-200">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                            <strong className="text-xs text-white">Prazo estipulado foi ultrapassado!</strong>
                          </div>
                          <p className="text-[11px] text-slate-300">
                            Para dar andamento nesta ação, você precisa registrar a justificativa do atraso e reagendar o novo prazo.
                          </p>
                          <button
                            type="button"
                            onClick={() => handleOpenJustifyModal(acao)}
                            className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            Justificar Atraso & Reagendar Prazo
                          </button>
                        </div>
                      )}

                    </div>

                    {/* BARRA DE AÇÕES INFERIOR */}
                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                      <span className="text-[9px] font-mono text-slate-500">Responsável: {acao.responsavelTratativa}</span>

                      <div className="flex items-center gap-2">
                        {acao.status === 'Pendente' && !isOverdue && (
                          <button
                            type="button"
                            onClick={() => handleIniciarAgora(acao.id)}
                            className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1 shadow-md"
                          >
                            <Play className="w-3 h-3 fill-white" /> Iniciar
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleToggleStatusAcao(acao.id, acao.status)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                            acao.status === 'Concluído'
                              ? 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          {acao.status === 'Concluído' ? 'Reabrir Ação' : 'Concluir Ação'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* SEÇÃO 2: GOVERNANÇA & FILTROS DE AÇÕES (PERCENTUAL E FILTROS 90%) */}
      {/* ==================================================================== */}
      {activeTab === 'governanca' && (
        <div className="space-y-6">
          
          {/* BARRA DE FILTROS AVANÇADOS (POR COLABORADOR, OPERAÇÃO E STATUS) */}
          <div className="p-4 bg-[#111a30] border border-slate-800 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <Filter className="w-4 h-4 text-teal-400" />
              <strong className="text-xs uppercase font-black text-white tracking-wider">
                Filtros de Governança & Stratificação de Performance
              </strong>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* FILTRO 1: POR COLABORADOR */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                  Filtrar Por Colaborador:
                </label>
                <select
                  value={filterColaborador}
                  onChange={e => setFilterColaborador(e.target.value)}
                  className="w-full bg-[#0b1222] border border-slate-700 rounded-xl p-2.5 text-xs text-white outline-none focus:border-teal-400"
                >
                  <option value="todos">Todos os Colaboradores</option>
                  {listaColaboradoresUnicos.map((colab, idx) => (
                    <option key={idx} value={colab}>{colab}</option>
                  ))}
                </select>
              </div>

              {/* FILTRO 2: POR OPERAÇÃO / PROCESSO */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                  Filtrar Por Operação:
                </label>
                <select
                  value={filterOperacao}
                  onChange={e => setFilterOperacao(e.target.value)}
                  className="w-full bg-[#0b1222] border border-slate-700 rounded-xl p-2.5 text-xs text-white outline-none focus:border-teal-400"
                >
                  <option value="todos">Todas as Operações</option>
                  {MODULES_LIST.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* FILTRO 3: POR STATUS */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                  Filtrar Por Status da Ação:
                </label>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="w-full bg-[#0b1222] border border-slate-700 rounded-xl p-2.5 text-xs text-white outline-none focus:border-teal-400"
                >
                  <option value="todos">Todos os Status</option>
                  <option value="Pendente">Pendente</option>
                  <option value="Em Andamento">Em Andamento</option>
                  <option value="Concluído no Prazo">Concluído no Prazo</option>
                  <option value="Concluído com Atraso">Concluído com Atraso (Reagendado)</option>
                  <option value="Atrasado">Atrasado / Vencido</option>
                </select>
              </div>

            </div>
          </div>

          {/* TABELA / CARDS DAS AÇÕES FILTRADAS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <ListCheck className="w-4 h-4 text-teal-400" /> Ações Resultantes do Filtro ({acoesGovernançaFiltradas.length})
              </h3>
            </div>

            {acoesGovernançaFiltradas.length === 0 ? (
              <div className="p-8 text-center bg-[#111a30] rounded-2xl border border-slate-800 space-y-2">
                <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
                <strong className="text-sm text-white block font-black">Nenhuma ação encontrada para os filtros selecionados</strong>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Tente alterar os filtros de Colaborador, Operação ou Status acima.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {acoesGovernançaFiltradas.map(acao => {
                  const isOverdue = checkIsOverdue(acao.prazo, acao.status);

                  return (
                    <div 
                      key={acao.id}
                      className={`p-4 bg-[#111a30] border rounded-2xl space-y-3 flex flex-col justify-between transition-all shadow-md ${
                        acao.status === 'Concluído'
                          ? 'border-emerald-500/40 bg-[#0d1726]'
                          : isOverdue
                          ? 'border-rose-500/50 bg-[#161224]'
                          : 'border-slate-800'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <span className="text-[10px] font-mono text-teal-300 font-bold px-2 py-0.5 rounded bg-teal-500/20 border border-teal-500/30">
                            {acao.processo}
                          </span>

                          <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                            acao.status === 'Concluído'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : isOverdue
                              ? 'bg-rose-600 text-white'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {isOverdue ? 'Atrasado' : acao.status}
                          </span>
                        </div>

                        <div>
                          <strong className="text-xs text-white block font-black">{acao.desvioEncontrado || acao.indicador}</strong>
                          <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-300">
                            <span>Colaborador: <strong className="text-white">{acao.colaboradorResponsavel}</strong></span>
                            <span className="font-mono text-slate-400">Prazo: {acao.prazo}</span>
                          </div>
                        </div>

                        {acao.contramedida && (
                          <div className="p-2.5 bg-[#0b1222] rounded-xl border border-slate-800 text-xs text-slate-200">
                            <span className="text-[9px] text-teal-400 font-black uppercase block">Contramedida:</span>
                            <p className="text-xs mt-0.5">{acao.contramedida}</p>
                          </div>
                        )}

                        {acao.justificativaAtraso && (
                          <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[10px] text-amber-200">
                            <strong>Justificativa de Reagendamento:</strong> "{acao.justificativaAtraso}"
                          </div>
                        )}

                        {/* AUDITORIA: QUEM ABRIU E QUEM FECHOU */}
                        <div className="p-2 bg-[#080d1a] rounded-xl border border-slate-800 text-[10px] space-y-0.5">
                          <div className="flex items-center justify-between text-slate-400">
                            <span>🔓 Aberto por: <strong className="text-indigo-300">{acao.abertoPor || acao.responsavelTratativa || 'Supervisor DPO'}</strong></span>
                            <span className="font-mono text-slate-500">{acao.dataAbertura || acao.data}</span>
                          </div>
                          {acao.status === 'Concluído' ? (
                            <div className="flex items-center justify-between text-slate-400 border-t border-slate-800/80 pt-0.5 mt-0.5">
                              <span>🏁 Fechado por: <strong className="text-emerald-300">{acao.fechadoPor || acao.colaboradorResponsavel || userName}</strong></span>
                              <span className="font-mono text-emerald-400">{acao.dataFechamento || acao.dataISO}</span>
                            </div>
                          ) : (
                            <div className="text-[9px] text-amber-400/80 border-t border-slate-800/80 pt-0.5 mt-0.5">
                              ⏳ Status: Aberta e Em Trâmite
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                        <span className="text-[9px] font-mono text-slate-500">ID: {acao.id}</span>

                        <div className="flex items-center gap-2">
                          {isOverdue && (
                            <button
                              type="button"
                              onClick={() => handleOpenJustifyModal(acao)}
                              className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm"
                            >
                              Reagendar
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleToggleStatusAcao(acao.id, acao.status)}
                            className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                              acao.status === 'Concluído'
                                ? 'bg-slate-800 text-slate-300 hover:text-white'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            {acao.status === 'Concluído' ? 'Reabrir' : 'Concluir'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ==================================================================== */}
      {/* SEÇÃO 3: LISTA ESTRATIFICADA DE DESVIOS DE META */}
      {/* ==================================================================== */}
      {activeTab === 'desvios' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#111a30] p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-rose-400" />
              <span className="text-xs font-black uppercase text-slate-300 tracking-wider">Estratificar Por Categoria / Processo:</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {['todos', 'Operação', 'Qualidade', 'Pátio', 'Estoque'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setProcessFilter(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${
                    processFilter === cat
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'bg-[#0b1222] text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {cat === 'todos' ? 'Todas as Categorias' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* TABELA ESTRATIFICADA DOS 8 INDICADORES OFICIAIS DA PLATAFORMA */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-rose-400" /> Indicadores Operacionais Fora da Meta (Estratificados)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PLATFORM_DEVIATIONS
                .filter(d => processFilter === 'todos' || d.categoria === processFilter)
                .map(dev => {
                  const hasActionAssigned = acoes.some(a => a.indicador?.includes(dev.indicador) || a.desvioEncontrado?.includes(dev.indicador));

                  return (
                    <div 
                      key={dev.id} 
                      className="p-4 bg-[#111a30] border border-rose-500/30 rounded-2xl space-y-3 flex flex-col justify-between hover:border-rose-500/50 transition-all shadow-md"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            {dev.processo}
                          </span>

                          <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                            dev.severidade === 'Crítica'
                              ? 'bg-rose-600 text-white'
                              : dev.severidade === 'Alta'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                          }`}>
                            Severidade {dev.severidade}
                          </span>
                        </div>

                        <div>
                          <strong className="text-sm font-black text-white block">{dev.indicador}</strong>
                          <div className="flex items-center gap-3 mt-1 text-xs">
                            <span className="text-slate-400 font-mono">Meta: <strong className="text-emerald-400">{dev.meta}</strong></span>
                            <span className="text-slate-400 font-mono">Atual: <strong className="text-rose-400">{dev.resultadoAtual}</strong></span>
                          </div>
                          <span className="text-xs font-mono font-black text-rose-300 block mt-1">
                            Desvio APURADO: {dev.desvioCalculado}
                          </span>
                        </div>

                        <div className="p-3 bg-[#0b1222] rounded-xl border border-slate-800/80 space-y-1">
                          <span className="text-[9px] text-slate-400 font-black uppercase block">Causa Provável / Diagnóstico:</span>
                          <p className="text-xs text-slate-200">{dev.causaProvavel}</p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-slate-400 font-mono">
                          {hasActionAssigned ? '✅ Ação Atribuída' : '⚠️ Sem Tratativa'}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleOpenModalForIndicator(dev)}
                          className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-md uppercase tracking-wider"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Gerar Ação Corretiva
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL DE REAGENDAMENTO E JUSTIFICATIVA DE ATRASO */}
      {/* ==================================================================== */}
      {showJustifyModal && actionToJustify && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#111a30] border-2 border-rose-500/50 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black uppercase text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" /> Justificativa de Atraso & Reagendamento
              </h3>
              <button
                onClick={() => {
                  setShowJustifyModal(false);
                  setActionToJustify(null);
                }}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-[#0b1222] rounded-xl border border-slate-800 space-y-1 text-xs">
              <span className="text-[10px] text-rose-400 font-black uppercase block">Ação com Prazo Vencido:</span>
              <strong className="text-white block">{actionToJustify.desvioEncontrado || actionToJustify.indicador}</strong>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 font-mono">
                <span>Prazo Expirado: <strong className="text-rose-400">{actionToJustify.prazo}</strong></span>
                <span>Responsável: <strong>{actionToJustify.colaboradorResponsavel}</strong></span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-300 block mb-1">
                  Motivo / Justificativa do Atraso (Obrigatório):
                </label>
                <textarea
                  rows={3}
                  placeholder="Descreva o motivo pelo qual o prazo estipulado não foi cumprido (ex: atraso na entrega de insumo, gargalo no pátio, etc)..."
                  value={justificativaText}
                  onChange={e => setJustificativaText(e.target.value)}
                  className="w-full bg-[#0b1222] border border-slate-700 rounded-xl p-3 text-xs text-white outline-none focus:border-rose-400"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-300 block mb-1">
                  Novo Prazo Reagendado:
                </label>
                <input
                  type="date"
                  value={novoPrazoDate}
                  onChange={e => setNovoPrazoDate(e.target.value)}
                  className="w-full bg-[#0b1222] border border-slate-700 rounded-xl p-2.5 text-xs text-white outline-none focus:border-rose-400"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowJustifyModal(false);
                  setActionToJustify(null);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmJustifyAndReschedule}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-lg uppercase tracking-wider"
              >
                <Send className="w-4 h-4" />
                Confirmar Reagendamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL DE GERAR AÇÃO CORRETIVA */}
      {/* ==================================================================== */}
      {showGerarAcaoModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#111a30] border border-amber-500/40 rounded-3xl p-6 max-w-xl w-full space-y-4 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black uppercase text-amber-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Análise de Desvio & Atribuição de Ação Corretiva
              </h3>
              <button
                onClick={() => {
                  setShowGerarAcaoModal(false);
                  setSelectedDemand(null);
                  setSelectedDeviation(null);
                }}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-[#0b1222] rounded-xl border border-slate-800 space-y-1 text-xs">
              <span className="text-[10px] text-amber-400 font-black uppercase block">Desvio Selecionado:</span>
              <strong className="text-white block">
                {selectedDeviation?.indicador || selectedDemand?.indicador || actionTitle}
              </strong>
              <p className="text-slate-300 text-[11px] mt-1">
                <strong>Meta x Atual:</strong> {selectedDeviation?.meta || selectedDemand?.meta} vs {selectedDeviation?.resultadoAtual || selectedDemand?.resultadoObtido} ({selectedDeviation?.desvioCalculado || selectedDemand?.desvioEncontrado})
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400">Título / Título da Ação Corretiva:</label>
                <input
                  type="text"
                  value={actionTitle}
                  onChange={e => setActionTitle(e.target.value)}
                  className="w-full bg-[#0b1222] border border-slate-700 rounded-xl p-2.5 text-xs text-white outline-none mt-1 focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400">Colaborador Atribuído:</label>
                  <select
                    value={actionColab}
                    onChange={e => setActionColab(e.target.value)}
                    className="w-full bg-[#0b1222] border border-slate-700 rounded-xl p-2.5 text-xs text-white outline-none mt-1"
                  >
                    <option value={userName}>{userName}</option>
                    {LISTA_COLABORADORES_OFICIAIS.map((c, idx) => (
                      <option key={c.matricula ? `${c.matricula}-${idx}` : idx} value={c.nome}>{c.nome} ({c.cargo})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400">Supervisor Responsável:</label>
                  <input
                    type="text"
                    value={actionSup}
                    onChange={e => setActionSup(e.target.value)}
                    className="w-full bg-[#0b1222] border border-slate-700 rounded-xl p-2.5 text-xs text-white outline-none mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400">Processo:</label>
                  <select
                    value={actionProcess}
                    onChange={e => setActionProcess(e.target.value as any)}
                    className="w-full bg-[#0b1222] border border-slate-700 rounded-xl p-2 text-xs text-white outline-none mt-1"
                  >
                    {MODULES_LIST.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400">Causa Raiz:</label>
                  <select
                    value={actionCausaRaiz}
                    onChange={e => setActionCausaRaiz(e.target.value as any)}
                    className="w-full bg-[#0b1222] border border-slate-700 rounded-xl p-2 text-xs text-white outline-none mt-1"
                  >
                    <option value="Método">Método</option>
                    <option value="Mão de Obra">Mão de Obra</option>
                    <option value="Máquina">Máquina</option>
                    <option value="Material">Material</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400">Prazo de Conclusão:</label>
                  <input
                    type="date"
                    value={actionPrazo}
                    onChange={e => setActionPrazo(e.target.value)}
                    className="w-full bg-[#0b1222] border border-slate-700 rounded-xl p-2 text-xs text-white outline-none mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400">Contramedida Estipulada / Instruções:</label>
                <textarea
                  rows={3}
                  value={actionContramedida}
                  onChange={e => setActionContramedida(e.target.value)}
                  className="w-full bg-[#0b1222] border border-slate-700 rounded-xl p-2.5 text-xs text-white outline-none mt-1 focus:border-amber-400"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowGerarAcaoModal(false);
                  setSelectedDemand(null);
                  setSelectedDeviation(null);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmGerarAcao}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-lg uppercase tracking-wider"
              >
                <Send className="w-4 h-4" />
                Gerar e Atribuir Ação
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuadroDesviosEAcoes;
