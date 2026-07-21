import React, { useState, useEffect, useMemo } from 'react';
import { db, isCustomFirebaseConnected } from '../firebase';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc,
  updateDoc,
  where
} from 'firebase/firestore';
import { RepackRow, Usuario, Empresa, RepackActionPlan, RepackA3Board } from '../types';
import { generateMockRepackRows } from '../mockDataGenerator';
import A3BoardComponent from './A3BoardComponent';
import CalendarFilter from './CalendarFilter';
import { 
  Box, 
  Clock, 
  Target, 
  TrendingUp, 
  Plus, 
  Search, 
  Trash2, 
  CheckCircle2, 
  RefreshCw, 
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Download,
  Info,
  ArrowLeft,
  Play,
  Square,
  Zap,
  Calendar,
  Save,
  Star,
  Trophy,
  Check,
  Droplet,
  AlertTriangle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area
} from 'recharts';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';

interface RepackDashboardProps {
  user: Usuario;
  empresa: Empresa | null;
  onBack?: () => void;
}

const EMBALAGENS_CONFIG: Record<string, { metaSec: number; label: string }> = {
  'LATA 250': { metaSec: 270, label: 'Lata 250 (Meta: 04:30)' },
  'LATA 269': { metaSec: 270, label: 'Lata 269 (Meta: 04:30)' },
  'LATA 350': { metaSec: 330, label: 'Lata 350 (Meta: 05:30)' },
  'LATA 473': { metaSec: 330, label: 'Lata 473 (Meta: 05:30)' },
  'LONG NECK': { metaSec: 360, label: 'Long Neck (Meta: 06:00)' },
  'PET 1L': { metaSec: 330, label: 'Pet 1L (Meta: 05:30)' },
  'PET 2L': { metaSec: 300, label: 'Pet 2L (Meta: 05:00)' },
  'PET 500ml': { metaSec: 300, label: 'Pet 500ml (Meta: 05:00)' },
  'PET 200ml': { metaSec: 270, label: 'Pet 200ml (Meta: 04:30)' },
  'PET 2,5L': { metaSec: 270, label: 'Pet 2,5L (Meta: 04:30)' },
  'PET 3,3L': { metaSec: 240, label: 'Pet 3,3L (Meta: 04:00)' },
  '600 OW': { metaSec: 300, label: '600 OW (Meta: 05:00)' },
  '300 OW': { metaSec: 240, label: '300 OW (Meta: 04:00)' },
  'GARRAFA 600ml': { metaSec: 255, label: 'Garrafa 600ml (Meta: 04:15)' },
  'GARRAFA 1L': { metaSec: 285, label: 'Garrafa 1L (Meta: 04:45)' }
};

// Helper to format seconds to HH:MM:SS inside global helpers
const formatSecToHMSHelper = (tot: number): string => {
  const h = Math.floor(tot / 3600);
  const m = Math.floor((tot % 3600) / 60);
  const s = tot % 60;
  return [h, m, s].map(v => v < 10 ? '0' + v : v).join(':');
};

// Seed highly polished starting data for realistic analytics when no data is registered
const generateSeedRepackRows = (empresaId: string): RepackRow[] => {
  const list: RepackRow[] = [];
  const operators = ['Ozenildo Silva', 'Matheus Barbosa', 'Paulo Pereira', 'Cleiton Souza'];
  const packKeys = Object.keys(EMBALAGENS_CONFIG);
  
  // Create entries for the last 12 days to ensure charts are beautifully populated
  for (let i = 11; i >= 0; i--) {
    const dateObj = new Date();
    dateObj.setDate(dateObj.getDate() - i);
    const dateISO = dateObj.toISOString().split('T')[0];
    const dateBr = dateObj.toLocaleDateString('pt-BR');
    
    // 2-3 entries per day
    const entriesCount = i === 0 ? 1 : Math.floor(Math.random() * 2) + 2;
    
    for (let j = 0; j < entriesCount; j++) {
      const op = operators[(i + j) % operators.length];
      const emb = packKeys[(i * 3 + j) % packKeys.length];
      const config = EMBALAGENS_CONFIG[emb] || { metaSec: 240 };
      
      const qty = Math.floor(Math.random() * 11) + 12; // 12 to 22 boxes
      const expectedTotalSec = config.metaSec * qty;
      
      // efficiency between 90% and 122%
      const efficiency = 0.90 + Math.random() * 0.32;
      const actualTotalSec = Math.round(expectedTotalSec / efficiency);
      
      const startHour = 8 + j * 3;
      const startMin = Math.floor(Math.random() * 60);
      const startStr = `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`;
      
      const endHour = startHour + Math.floor(actualTotalSec / 3600);
      const endMin = startMin + Math.floor((actualTotalSec % 3600) / 60);
      const finalMin = endMin % 60;
      const finalHour = endHour + Math.floor(endMin / 60);
      const endStr = `${finalHour.toString().padStart(2, '0')}:${finalMin.toString().padStart(2, '0')}`;
      
      const durH = Math.floor(actualTotalSec / 3600);
      const durM = Math.floor((actualTotalSec % 3600) / 60);
      const durS = actualTotalSec % 60;
      const durStr = `${durH.toString().padStart(2, '0')}:${durM.toString().padStart(2, '0')}:${durS.toString().padStart(2, '0')}`;
      
      const isWithinMeta = actualTotalSec <= expectedTotalSec;
      
      list.push({
        _docId: `seed-${i}-${j}`,
        empresaId: empresaId,
        data: dateBr,
        dataISO: dateISO,
        embalagem: emb,
        quantidade: qty,
        inicio: startStr,
        fim: endStr,
        duracao: durStr,
        meta: formatSecToHMSHelper(expectedTotalSec),
        resultado: isWithinMeta ? 'Dentro da Meta' : 'Fora da Meta',
        operador: op,
        _criadoEm: dateObj.toISOString()
      });
    }
  }
  
  return list.sort((a, b) => b.dataISO.localeCompare(a.dataISO) || b.inicio.localeCompare(a.inicio));
};

const generateSeedActionPlans = (empresaId: string): RepackActionPlan[] => {
  return [
    {
      _docId: 'seed-ap-1',
      empresaId: empresaId,
      descricao: 'Treinamento prático de reembalagem rápida para Lata 350ml visando reduzir tempo médio de 04:30 para 04:00.',
      causaRaiz4M: 'Mão de Obra',
      responsavel: 'Matheus Barbosa',
      prazo: '15/07/2026',
      status: 'Em Andamento',
      dataCriacaoISO: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString().split('T')[0],
      _criadoEm: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString()
    },
    {
      _docId: 'seed-ap-2',
      empresaId: empresaId,
      descricao: 'Substituição das caixas organizadoras danificadas na bancada de reembalagem do corredor 4.',
      causaRaiz4M: 'Material',
      responsavel: 'Ozenildo Silva',
      prazo: '10/07/2026',
      status: 'Pendente',
      dataCriacaoISO: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString().split('T')[0],
      _criadoEm: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString()
    },
    {
      _docId: 'seed-ap-3',
      empresaId: empresaId,
      descricao: 'Padronização do checklist de inspeção de paletes retrabalhados de PET 2L (Procedimento VPO 14).',
      causaRaiz4M: 'Método',
      responsavel: 'Paulo Pereira',
      prazo: '05/07/2026',
      status: 'Concluído',
      dataCriacaoISO: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString().split('T')[0],
      _criadoEm: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString()
    }
  ];
};

// Colors scheme matching the platform design templates
const COLORS = {
  bg: '#07090d',      // var(--ink)
  card: '#0f1318',    // var(--surf)
  hover: '#151b23',   // var(--surf2)
  azul: '#1e56f0',    // var(--blue) - Blue brand color
  verde: '#22c55e',   // var(--green)
  amarelo: '#eab308', // var(--yellow)
  roxo: '#8b5cf6',    // var(--purple)
  vermelho: '#ef4444',// var(--red)
  cinza: '#6a7d92'    // var(--dim)
};

const PIE_COLORS = [COLORS.azul, COLORS.verde, COLORS.amarelo, COLORS.roxo, COLORS.vermelho];

export default function RepackDashboard({ user, empresa, onBack }: RepackDashboardProps) {
  const [activeSubTab, setActiveSubTab] = useState<'produtividade' | 'boarda3'>('produtividade');
  const [isCompact, setIsCompact] = useState(false);
  const [biPage, setBiPage] = useState<'geral' | 'comparativos' | 'historico'>('geral');
  const [actualRepackRows, setActualRepackRows] = useState<RepackRow[]>([]);
  const [actualActionPlans, setActualActionPlans] = useState<RepackActionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // A3 Problem Solving Board states
  const [boards, setBoards] = useState<RepackA3Board[]>([]);
  const [activeBoard, setActiveBoard] = useState<RepackA3Board | null>(null);
  const [savingBoard, setSavingBoard] = useState(false);
  const [boardSaveStatus, setBoardSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [currentA3Step, setCurrentA3Step] = useState<number>(1);
  const [a3ViewMode, setA3ViewMode] = useState<'passo-a-passo' | 'tabuleiro'>('passo-a-passo');

  const seedRows = useMemo(() => {
    return generateSeedRepackRows(empresa?.id || 'demo');
  }, [empresa?.id]);

  const seedActionPlans = useMemo(() => {
    return generateSeedActionPlans(empresa?.id || 'demo');
  }, [empresa?.id]);

  const repackRows = useMemo(() => {
    if (actualRepackRows && actualRepackRows.length > 0) {
      return actualRepackRows;
    }
    const companyId = empresa?.id || 'demo';
    return generateMockRepackRows(companyId);
  }, [actualRepackRows, empresa?.id]);

  const actionPlans = useMemo(() => {
    if (actualActionPlans.length === 0) {
      return seedActionPlans;
    }
    return actualActionPlans;
  }, [actualActionPlans, seedActionPlans]);

  // Filters State
  const [filterColaborador, setFilterColaborador] = useState('todos');
  const [filterEmbalagem, setFilterEmbalagem] = useState('todos');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterMeta, setFilterMeta] = useState<'todos' | 'dentro' | 'fora'>('todos');

  // Active filters (applied automatically on change)
  const [activeColaborador, setActiveColaborador] = useState('todos');
  const [activeEmbalagem, setActiveEmbalagem] = useState('todos');
  const [activeStartDate, setActiveStartDate] = useState('');
  const [activeEndDate, setActiveEndDate] = useState('');
  const [activeMeta, setActiveMeta] = useState<'todos' | 'dentro' | 'fora'>('todos');

  // Automatically apply filters on filter input change (reactive)
  useEffect(() => {
    setActiveColaborador(filterColaborador);
    setActiveEmbalagem(filterEmbalagem);
    setActiveStartDate(filterStartDate);
    setActiveEndDate(filterEndDate);
    setActiveMeta(filterMeta);
    setCurrentPage(1);
  }, [filterColaborador, filterEmbalagem, filterStartDate, filterEndDate, filterMeta]);

  // Search & Pagination in Linha 7 Table
  const [tableSearch, setTableSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Selected Row for calculations panel
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // New Record Form / Stopwatch Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formEmbalagem, setFormEmbalagem] = useState('LATA 250');
  const [formQuantidade, setFormQuantidade] = useState<number>(10);
  const [formInicio, setFormInicio] = useState('');
  const [formFim, setFormFim] = useState('');
  const [formOperador, setFormOperador] = useState(user.nome || 'Operador');
  const [formMotivoNaoBaterMeta, setFormMotivoNaoBaterMeta] = useState('');
  const [timerActive, setTimerActive] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);

  // Action Plans form
  const [apDesc, setApDesc] = useState('');
  const [apCausa, setApCausa] = useState<'Método' | 'Mão de Obra' | 'Máquina' | 'Material'>('Método');
  const [apResp, setApResp] = useState('');
  const [apPrazo, setApPrazo] = useState('');

  // Simulator states
  const [simUnidade, setSimUnidade] = useState<'HE' | 'SKUs'>('HE');
  const [simMetaCustom, setSimMetaCustom] = useState<number | null>(null);
  const [simMediaCustom, setSimMediaCustom] = useState<number | null>(null);
  const [simVolumeCustom, setSimVolumeCustom] = useState<number | null>(null);

  // Clock state
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('pt-BR') + ' - ' + now.toLocaleDateString('pt-BR'));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Timer loop
  useEffect(() => {
    let interval: any = null;
    if (timerActive) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timerActive]);

  const timeToSec = (hms: string): number => {
    if (!hms) return 0;
    const parts = hms.split(':').map(Number);
    if (parts.length === 2) return (parts[0] * 3600) + (parts[1] * 60);
    if (parts.length === 3) return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
    return 0;
  };

  const formatSecToHMS = (tot: number): string => {
    const h = Math.floor(tot / 3600);
    const m = Math.floor((tot % 3600) / 60);
    const s = tot % 60;
    return [h, m, s].map(v => v < 10 ? '0' + v : v).join(':');
  };

  const isFormAboveMeta = useMemo(() => {
    if (!formInicio || !formFim) return false;
    const activeMeta = EMBALAGENS_CONFIG[formEmbalagem]?.metaSec || 240;
    const totalMetaSec = activeMeta * formQuantidade;
    const durSec = timeToSec(formFim) - timeToSec(formInicio);
    const spentSec = durSec < 0 ? durSec + 86400 : durSec;
    return spentSec > totalMetaSec;
  }, [formInicio, formFim, formEmbalagem, formQuantidade]);

  const todayISO = useMemo(() => new Date().toISOString().split('T')[0], []);
  
  const getDaysAgoISO = (days: number): string => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  };

  // Fetch Firestore entries
  useEffect(() => {
    const companyId = empresa?.id || 'demo';
    const q = query(collection(db, 'repack'), where('empresaId', '==', companyId));
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map(docSnap => ({
        _docId: docSnap.id,
        ...docSnap.data()
      } as RepackRow));
      rows.sort((a, b) => (b.dataISO || '').localeCompare(a.dataISO || '') || (b.inicio || '').localeCompare(a.inicio || ''));
      setActualRepackRows(rows);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });
    return () => unsub();
  }, [empresa?.id]);

  // Fetch Action Plans
  useEffect(() => {
    const companyId = empresa?.id || 'demo';
    const q = query(collection(db, 'repack_action_plans'), where('empresaId', '==', companyId));
    const unsub = onSnapshot(q, (snap) => {
      const plans = snap.docs.map(docSnap => ({
        _docId: docSnap.id,
        ...docSnap.data()
      } as RepackActionPlan));
      plans.sort((a, b) => (b.dataCriacaoISO || '').localeCompare(a.dataCriacaoISO || ''));
      setActualActionPlans(plans);
    });
    return () => unsub();
  }, [empresa?.id]);

  // A3 Board helpers and fallback seed
  const fallbackSeedBoard = useMemo<RepackA3Board>(() => {
    return {
      _docId: 'seed-board-1',
      empresaId: empresa?.id || 'demo',
      titulo: 'Redução do Tempo de Repack de Lata 350ml - Guarabira',
      dataCriacaoISO: new Date().toISOString().split('T')[0],
      problemaDesc: 'O tempo médio de reembalagem da Lata 350ml está em 04:30 minutos, o que excede a nossa meta operacional estabelecida pelo VPO de 04:00 minutos por caixa, causando gargalos no fluxo de expedição.',
      problemaImpacto: 'Atrasos recorrentes no carregamento das rotas de distribuição urbana de Guarabira, gerando horas extras para os conferentes e insatisfação no cliente final devido à perda do horário de recebimento.',
      problemaCausa: '1. Desorganização do layout de insumos (caixas novas a 5 metros de distância).\n2. Operadores não treinados no novo padrão de dobra das divisórias (Procedimento SOP-04).\n3. Falta de suporte adequado para posicionamento do rolo de fita plástica.',
      problemaEvidencias: 'Relatório de produtividade do BI do Repack mostrando eficiência de 88% na média semanal da Lata 350ml e 4 ocorrências de atraso de saída de rota registradas em Junho.',
      recursos: '1. Cavalete portátil para suporte de fita adesiva (custo estimado R$120).\n2. 2 horas de liberação dos operadores para reciclagem de SOP.',
      comentarios: 'Acompanhamento diário no Matinal de 5 minutos. Equipe engajada na solução. Ozenildo dando suporte.',
      concluidas: '1. Criação do cavalete de fita portátil por manutenção preventiva.\n2. Treinamento prático em bancada da SOP-04 para todos os operadores do turno.',
      aprendizados: 'O layout de posicionamento de insumos impacta em até 15% no tempo de ciclo. Pequenas melhorias ergonômicas eliminam movimentos desnecessários.',
      padronizacao: 'Inclusão do novo layout de bancada padrão no Checklist de 5S semanal e atualização da folha de instrução de trabalho (LPP) na bancada 1.',
      resultadosDesc: 'Redução significativa do tempo de ciclo após as ações corretivas. A meta de 04:00 foi atingida e estabilizada.',
      impactoNegocio: 'Eliminação de 100% das reclamações de atraso de carregamento e redução de horas extras operacionais em cerca de R$1.800/mês.',
      proximosPassos: 'Replicar o mesmo layout de bancada e o suporte de fita para as demais linhas de PET e Vidro no próximo ciclo de PDCA.',
      dataRevisao: '2026-07-20',
      actions: [
        { acao: 'Fabricar suporte portátil para rolo de fita plástica', responsavel: 'Ozenildo Silva', prazo: '10/07/2026', status: 'Concluído', pct: 100 },
        { acao: 'Treinar operadores no padrão de dobra SOP-04', responsavel: 'Matheus Barbosa', prazo: '12/07/2026', status: 'Concluído', pct: 100 },
        { acao: 'Reorganizar layout da bancada (aproximar caixas)', responsavel: 'Paulo Pereira', prazo: '08/07/2026', status: 'Concluído', pct: 100 },
        { acao: 'Realizar cronometragem de validação do tempo de ciclo', responsavel: 'Matheus Barbosa', prazo: '15/07/2026', status: 'Em Andamento', pct: 60 },
        { acao: 'Padronizar o novo checklist de 5S na rotina', responsavel: 'Paulo Pereira', prazo: '20/07/2026', status: 'Pendente', pct: 0 }
      ],
      indicadores: [
        { indicador: 'Tempo ciclo Lata 350ml', antes: '04:30', depois: '03:55', variacao: '-13.0%' },
        { indicador: 'Eficiência do Repack', antes: '88%', depois: '102%', variacao: '+15.9%' },
        { indicador: 'Atrasos de Rota por Repack', antes: '4', depois: '0', variacao: '-100.0%' }
      ]
    };
  }, [empresa?.id]);

  const getEmptyBoard = (empresaId: string, titulo: string): Omit<RepackA3Board, '_docId'> => ({
    empresaId,
    dashboard: 'repack',
    titulo,
    dataCriacaoISO: new Date().toISOString().split('T')[0],
    problemaDesc: '',
    problemaImpacto: '',
    problemaCausa: '',
    problemaEvidencias: '',
    actions: [
      { acao: '', responsavel: '', prazo: '', status: 'Pendente', pct: 0 },
      { acao: '', responsavel: '', prazo: '', status: 'Pendente', pct: 0 },
      { acao: '', responsavel: '', prazo: '', status: 'Pendente', pct: 0 },
      { acao: '', responsavel: '', prazo: '', status: 'Pendente', pct: 0 },
      { acao: '', responsavel: '', prazo: '', status: 'Pendente', pct: 0 }
    ],
    recursos: '',
    comentarios: '',
    concluidas: '',
    aprendizados: '',
    padronizacao: '',
    resultadosDesc: '',
    indicadores: [
      { indicador: '', antes: '', depois: '', variacao: '' },
      { indicador: '', antes: '', depois: '', variacao: '' },
      { indicador: '', antes: '', depois: '', variacao: '' }
    ],
    impactoNegocio: '',
    proximosPassos: '',
    dataRevisao: ''
  });

  // Sync A3 Boards from firestore
  useEffect(() => {
    const companyId = empresa?.id || 'demo';
    const q = query(collection(db, 'repack_a3_boards'), where('empresaId', '==', companyId));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(docSnap => ({
        _docId: docSnap.id,
        ...docSnap.data()
      } as RepackA3Board));
      
      const filtered = list.filter(b => !b.dashboard || b.dashboard === 'repack');
      setBoards(filtered);
    }, (err) => {
      console.error('Error loading A3 boards:', err);
    });
    return () => unsub();
  }, [empresa?.id]);

  // Handle active A3 board selection
  useEffect(() => {
    if (activeSubTab === 'boarda3') {
      if (!activeBoard) {
        if (boards.length > 0) {
          setActiveBoard(boards[0]);
        } else {
          setActiveBoard(fallbackSeedBoard);
        }
      }
    }
  }, [activeSubTab, boards, activeBoard, fallbackSeedBoard]);

  const distinctOperadores = useMemo(() => {
    const ops = new Set<string>();
    repackRows.forEach(r => {
      if (r.operador) {
        const cleanName = r.operador.split('(')[0].trim().toUpperCase();
        if (cleanName) {
          ops.add(cleanName);
        }
      }
    });
    return Array.from(ops).sort();
  }, [repackRows]);

  // Active filtered rows
  const filteredRows = useMemo(() => {
    return repackRows.filter(row => {
      // 1. Colaborador
      if (activeColaborador !== 'todos') {
        const rowOpClean = row.operador?.split('(')[0].trim().toUpperCase() || '';
        const filterOpClean = activeColaborador.toUpperCase();
        if (rowOpClean !== filterOpClean && !row.operador?.toUpperCase().includes(filterOpClean)) return false;
      }

      // 2. Embalagem
      if (activeEmbalagem !== 'todos' && row.embalagem !== activeEmbalagem) return false;

      // 3. Período (Calendário)
      const rowDate = row.dataISO || (row.data ? row.data.split('/').reverse().join('-') : '');
      if (activeStartDate && rowDate && rowDate < activeStartDate) return false;
      if (activeEndDate && rowDate && rowDate > activeEndDate) return false;

      // 7. Status da Meta / Desempenho
      if (activeMeta !== 'todos') {
        let isWithin = false;
        const resClean = (row.resultado || '').toLowerCase();
        
        if (resClean.includes('dentro') || resClean.includes('batida')) {
          isWithin = true;
        } else if (resClean.includes('fora') || resClean.includes('abaixo') || resClean.includes('acima')) {
          isWithin = false;
        } else {
          // Fallback to dynamic calculation on-the-fly
          const config = EMBALAGENS_CONFIG[row.embalagem];
          if (config) {
            const expectedTotalSec = config.metaSec * (Number(row.quantidade) || 0);
            const actualTotalSec = timeToSec(row.duracao || '');
            isWithin = actualTotalSec <= expectedTotalSec;
          } else {
            isWithin = true; // Default fallback
          }
        }

        if (activeMeta === 'dentro' && !isWithin) return false;
        if (activeMeta === 'fora' && isWithin) return false;
      }

      return true;
    });
  }, [repackRows, activeColaborador, activeEmbalagem, activeStartDate, activeEndDate, activeMeta]);

  // Calculations for KPIs
  const totalSkus = useMemo(() => {
    return filteredRows.reduce((sum, r) => sum + (Number(r.quantidade) || 0), 0);
  }, [filteredRows]);

  const totalTempoGastoSec = useMemo(() => {
    return filteredRows.reduce((sum, r) => sum + timeToSec(r.duracao), 0);
  }, [filteredRows]);

  const tempoMedioPorSkuSec = useMemo(() => {
    if (totalSkus === 0) return 0;
    return Math.round(totalTempoGastoSec / totalSkus);
  }, [totalTempoGastoSec, totalSkus]);

  const tempoMedioPorSkuStr = useMemo(() => formatSecToHMS(tempoMedioPorSkuSec), [tempoMedioPorSkuSec]);

  const produtividadeSkuHora = useMemo(() => {
    if (totalTempoGastoSec === 0) return 0;
    return Math.round((totalSkus / (totalTempoGastoSec / 3600)) * 10) / 10;
  }, [totalSkus, totalTempoGastoSec]);

  // Volume in Hectoliters (HE/HL)
  const totalHE = useMemo(() => {
    const EMBALAGENS_VOLUME: Record<string, number> = {
      'LATA 250': 6.0,
      'LATA 350': 8.4,
      'LATA 473': 11.352,
      'PET 500ml': 6.0,
      'PET 1L': 12.0,
      'PET 2L': 12.0,
      'GARRAFA 600ml': 7.2,
      'GARRAFA 1L': 12.0
    };
    const totalLiters = filteredRows.reduce((sum, r) => {
      const factor = EMBALAGENS_VOLUME[r.embalagem] || 10.0;
      return sum + (factor * (Number(r.quantidade) || 0));
    }, 0);
    return Math.round((totalLiters / 100) * 100) / 100;
  }, [filteredRows]);

  // Dias com registro (dias trabalhados) no conjunto de dados filtrados
  const diasTrabalhadosFiltrados = useMemo(() => {
    const uniqueDays = new Set<string>();
    filteredRows.forEach(r => {
      if (r.dataISO) {
        uniqueDays.add(r.dataISO);
      }
    });
    return uniqueDays.size > 0 ? uniqueDays.size : 1;
  }, [filteredRows]);

  // Meses com registro (meses trabalhados) no conjunto de dados filtrados
  const mesesTrabalhadosFiltrados = useMemo(() => {
    const uniqueMonths = new Set<string>();
    filteredRows.forEach(r => {
      if (r.dataISO) {
        uniqueMonths.add(r.dataISO.substring(0, 7)); // YYYY-MM
      }
    });
    return monthsSetSize(uniqueMonths);
    function monthsSetSize(set: Set<string>) {
      return set.size > 0 ? set.size : 1;
    }
  }, [filteredRows]);

  // Produtividade Real baseada em Hectolitros / Horas cumuladas
  const produtividadeRealHE = useMemo(() => {
    const totalHours = totalTempoGastoSec / 3600;
    if (totalHours === 0) return 0;
    return totalHE / totalHours;
  }, [totalHE, totalTempoGastoSec]);

  // Meta de Produtividade: ((HE / Horas) / Dias) / Meses * 1.10
  const produtividadeMetaHE = useMemo(() => {
    const totalHours = totalTempoGastoSec / 3600;
    if (totalHours === 0) return 0;
    const realProd = totalHE / totalHours;
    return ((realProd / diasTrabalhadosFiltrados) / mesesTrabalhadosFiltrados) * 1.10;
  }, [totalHE, totalTempoGastoSec, diasTrabalhadosFiltrados, mesesTrabalhadosFiltrados]);

  // Nível do filtro para fins informativos na UI
  const nivelFiltroProdutividade = useMemo(() => {
    if (activeStartDate && activeEndDate) {
      if (activeStartDate === activeEndDate) return 'Diário';
      return 'Período';
    }
    return 'Geral';
  }, [activeStartDate, activeEndDate]);


  const totalTempoEsperadoSec = useMemo(() => {
    return filteredRows.reduce((sum, r) => {
      const metaUnit = EMBALAGENS_CONFIG[r.embalagem]?.metaSec || 240;
      return sum + (metaUnit * (Number(r.quantidade) || 1));
    }, 0);
  }, [filteredRows]);

  const eficienciaMedia = useMemo(() => {
    if (totalTempoGastoSec === 0) return 0;
    return Math.round((totalTempoEsperadoSec / totalTempoGastoSec) * 100);
  }, [totalTempoEsperadoSec, totalTempoGastoSec]);



  // Total Tempo Trabalhado formatted
  const totalTempoTrabalhadoStr = useMemo(() => {
    const h = Math.floor(totalTempoGastoSec / 3600);
    const m = Math.floor((totalTempoGastoSec % 3600) / 60);
    const s = totalTempoGastoSec % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }, [totalTempoGastoSec]);

  // Monthly trend for efficiency
  const tendenciaMensal = useMemo(() => {
    const now = new Date();
    const currentYearMonth = now.toISOString().slice(0, 7); // "YYYY-MM"
    const currentMonthRows = repackRows.filter(r => r.dataISO && r.dataISO.startsWith(currentYearMonth));
    const rowsToAnalyze = currentMonthRows.length > 0 ? currentMonthRows : filteredRows;

    if (rowsToAnalyze.length === 0) {
      return { percent: 0, status: 'SEM DADOS', colorClass: 'text-gray-400', label: 'Sem registros' };
    }

    const totalActualSec = rowsToAnalyze.reduce((sum, r) => sum + timeToSec(r.duracao), 0);
    const totalExpectedSec = rowsToAnalyze.reduce((sum, r) => {
      const metaUnit = EMBALAGENS_CONFIG[r.embalagem]?.metaSec || 240;
      return sum + (metaUnit * (Number(r.quantidade) || 1));
    }, 0);

    if (totalActualSec === 0) {
      return { percent: 0, status: 'SEM DADOS', colorClass: 'text-gray-400', label: 'Sem registros' };
    }

    const percent = Math.round((totalExpectedSec / totalActualSec) * 100);
    const vaiBater = percent >= 100;

    return {
      percent,
      status: vaiBater ? 'DENTRO DA META' : 'FORA DA META',
      label: vaiBater ? 'Meta Tendência OK' : 'Risco de não bater',
      colorClass: vaiBater ? 'text-emerald-500' : 'text-rose-500',
    };
  }, [repackRows, filteredRows]);

  // Working days of current month calculation (mês vigente)
  const workingDaysInfo = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed (e.g. 6 is July)
    
    // Total business days in this month (Monday to Friday)
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const totalDaysInMonth = lastDay.getDate();
    
    let totalWorkingDays = 0;
    let elapsedWorkingDays = 0;
    
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const date = new Date(year, month, d);
      const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
      const isWorkingDay = dayOfWeek !== 0 && dayOfWeek !== 6;
      
      if (isWorkingDay) {
        totalWorkingDays++;
        if (d <= now.getDate()) {
          elapsedWorkingDays++;
        }
      }
    }
    
    elapsedWorkingDays = Math.max(1, elapsedWorkingDays);
    const remainingWorkingDays = Math.max(0, totalWorkingDays - elapsedWorkingDays);
    
    const monthName = now.toLocaleString('pt-BR', { month: 'long' });
    const capitalizedMonthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    
    return {
      totalWorkingDays,
      elapsedWorkingDays,
      remainingWorkingDays,
      monthName: capitalizedMonthName,
      year
    };
  }, []);

  // Monthly live values for simulator
  const simLiveValores = useMemo(() => {
    const now = new Date();
    const currentYearMonth = now.toISOString().slice(0, 7); // "YYYY-MM"
    const currentMonthRows = repackRows.filter(r => r.dataISO && r.dataISO.startsWith(currentYearMonth));
    const rowsToUse = currentMonthRows.length > 0 ? currentMonthRows : repackRows;

    // 1. Volume in HE and SKUs
    const totalSKUs = rowsToUse.reduce((sum, r) => sum + (Number(r.quantidade) || 0), 0);

    const EMBALAGENS_VOLUME_MAP: Record<string, number> = {
      'LATA 250': 6.0,
      'LATA 350': 8.4,
      'LATA 473': 11.352,
      'PET 500ml': 6.0,
      'PET 1L': 12.0,
      'PET 2L': 12.0,
      'GARRAFA 600ml': 7.2,
      'GARRAFA 1L': 12.0
    };
    const totalLiters = rowsToUse.reduce((sum, r) => {
      const factor = EMBALAGENS_VOLUME_MAP[r.embalagem] || 10.0;
      return sum + (factor * (Number(r.quantidade) || 0));
    }, 0);
    const totalHE = Math.round((totalLiters / 100) * 100) / 100;

    // Use elapsed working days from the current month
    const elapsedDays = workingDaysInfo.elapsedWorkingDays;

    // 3. Daily averages
    const mediaHE = Math.round((totalHE / elapsedDays) * 100) / 100;
    const mediaSKUs = Math.round((totalSKUs / elapsedDays) * 10) / 10;

    // 4. Default meta (1.3x current month's trend)
    const defaultMetaHE = Math.round(totalHE * 1.3) || 450;
    const defaultMetaSKUs = Math.round(totalSKUs * 1.3) || 2500;

    return {
      diasTrabalhados: elapsedDays,
      totalHE,
      totalSKUs,
      mediaHE,
      mediaSKUs,
      defaultMetaHE,
      defaultMetaSKUs
    };
  }, [repackRows, workingDaysInfo]);

  // Derived simulation values - COMPLETELY automatic and read-only based on real database!
  const simVolumeAcumulado = simUnidade === 'HE' ? simLiveValores.totalHE : simLiveValores.totalSKUs;
  const simMediaAcumulada = simUnidade === 'HE' ? simLiveValores.mediaHE : simLiveValores.mediaSKUs;
  const simMeta = simUnidade === 'HE' ? simLiveValores.defaultMetaHE : simLiveValores.defaultMetaSKUs;
  const simMediaProjetada = simMediaAcumulada;

  const simDiasRestantes = workingDaysInfo.remainingWorkingDays;
  const projecaoRestante = simMediaProjetada * simDiasRestantes;
  const projecaoFechamento = simVolumeAcumulado + projecaoRestante;
  const atingiuMeta = projecaoFechamento >= simMeta;
  const atingimentoPercent = simMeta > 0 ? Math.round((projecaoFechamento / simMeta) * 100) : 0;
  const deficit = simMeta - projecaoFechamento;
  const adicionalDiarioNecessario = deficit > 0 && simDiasRestantes > 0 ? (deficit / simDiasRestantes) : 0;
  const mediaNecessariaProximosDias = simMediaAcumulada + adicionalDiarioNecessario;

  // Daily Chart Data Generator (Produtividade e Tempo Médio)
  const { chartProdutividadeDia, chartTempoMedioDia } = useMemo(() => {
    // Determine start and end dates
    let startStr = activeStartDate;
    let endStr = activeEndDate;

    if (!startStr || !endStr) {
      // Find range from filteredRows
      let earliest = '';
      let latest = '';
      filteredRows.forEach(r => {
        const d = r.dataISO || (r.data ? r.data.split('/').reverse().join('-') : '');
        if (d) {
          if (!earliest || d < earliest) earliest = d;
          if (!latest || d > latest) latest = d;
        }
      });

      if (earliest && latest) {
        startStr = earliest;
        endStr = latest;
      } else {
        // Fallback to last 12 days
        const today = new Date();
        const twelveDaysAgo = new Date();
        twelveDaysAgo.setDate(today.getDate() - 11);
        const formatISO = (date: Date) => date.toISOString().split('T')[0];
        startStr = formatISO(twelveDaysAgo);
        endStr = formatISO(today);
      }
    }

    // Generate list of all dates in range
    const dates: string[] = [];
    const sDate = new Date(startStr + 'T00:00:00');
    const eDate = new Date(endStr + 'T00:00:00');
    
    // Safety guard: if range is larger than 31 days, take the last 31 days to avoid cluttering the charts
    const diffTime = Math.abs(eDate.getTime() - sDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    let current = new Date(sDate);
    if (diffDays > 31) {
      // Shift start date to be at most 31 days before end date
      current = new Date(eDate);
      current.setDate(current.getDate() - 30);
    }

    while (current <= eDate) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }

    // Aggregate data
    const prodMap: Record<string, number> = {};
    const sumSecMap: Record<string, number> = {};
    const qtyMap: Record<string, number> = {};

    filteredRows.forEach(r => {
      const d = r.dataISO || (r.data ? r.data.split('/').reverse().join('-') : '');
      if (d) {
        prodMap[d] = (prodMap[d] || 0) + (Number(r.quantidade) || 0);
        sumSecMap[d] = (sumSecMap[d] || 0) + timeToSec(r.duracao);
        qtyMap[d] = (qtyMap[d] || 0) + (Number(r.quantidade) || 1);
      }
    });

    const prodData = dates.map(dStr => {
      const parts = dStr.split('-');
      const label = parts.length === 3 ? `${parts[2]}/${parts[1]}` : dStr;
      return {
        name: label,
        SKUs: prodMap[dStr] || 0
      };
    });

    const tempoData = dates.map(dStr => {
      const parts = dStr.split('-');
      const label = parts.length === 3 ? `${parts[2]}/${parts[1]}` : dStr;
      const avgMin = qtyMap[dStr] > 0 ? (sumSecMap[dStr] / qtyMap[dStr]) / 60 : 0;
      return {
        name: label,
        Minutos: parseFloat(avgMin.toFixed(2))
      };
    });

    return {
      chartProdutividadeDia: prodData,
      chartTempoMedioDia: tempoData
    };
  }, [filteredRows, activeStartDate, activeEndDate]);

  // Ranking Embalagens
  const chartRankingEmbalagens = useMemo(() => {
    const map: Record<string, number> = {};
    filteredRows.forEach(r => { map[r.embalagem] = (map[r.embalagem] || 0) + (Number(r.quantidade) || 0); });
    const sorted = Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    if (sorted.length === 0) {
      return [
        { name: 'PET 500ml', value: 148 },
        { name: 'Lata 250ml', value: 124 },
        { name: 'PET 2L', value: 86 },
        { name: 'Lata 473ml', value: 62 },
        { name: '300 OW', value: 36 }
      ];
    }
    return sorted.slice(0, 5);
  }, [filteredRows]);

  // Comparativo Meta x Real (caixas)
  const chartComparativoMetaReal = useMemo(() => {
    const map: Record<string, { meta: number; real: number }> = {};
    filteredRows.forEach(r => {
      if (!map[r.embalagem]) map[r.embalagem] = { meta: 0, real: 0 };
      const unitMeta = EMBALAGENS_CONFIG[r.embalagem]?.metaSec || 240;
      map[r.embalagem].meta += unitMeta * (Number(r.quantidade) || 1);
      map[r.embalagem].real += timeToSec(r.duracao);
    });
    const result = Object.entries(map).map(([name, v]) => ({
      name,
      Meta: Math.round(v.meta / 60),
      Real: Math.round(v.real / 60)
    }));
    if (result.length === 0) {
      return [
        { name: 'Lata 250', Meta: 100, Real: 85 },
        { name: 'PET 500ml', Meta: 100, Real: 120 }
      ];
    }
    return result.slice(0, 4);
  }, [filteredRows]);

  // Heatmap static mock / real matrix
  const heatmapData = useMemo(() => {
    return {
      '08h': { SEG: 'green', TER: 'green', QUA: 'green', QUI: 'green', SEX: 'yellow' },
      '09h': { SEG: 'green', TER: 'green', QUA: 'yellow', QUI: 'green', SEX: 'red' },
      '10h': { SEG: 'green', TER: 'green', QUA: 'green', QUI: 'green', SEX: 'red' },
      '11h': { SEG: 'red', TER: 'yellow', QUA: 'yellow', QUI: 'yellow', SEX: 'yellow' },
      '12h': { SEG: 'yellow', TER: 'yellow', QUA: 'yellow', QUI: 'green', SEX: 'red' }
    };
  }, []);

  // Distribuição do Trabalho Pizza
  const chartDistribuicaoTrabalho = useMemo(() => {
    const map: Record<string, number> = {};
    filteredRows.forEach(r => { map[r.embalagem] = (map[r.embalagem] || 0) + (Number(r.quantidade) || 0); });
    const entries = Object.entries(map).map(([name, value]) => ({ name, value }));
    if (entries.length === 0) {
      return [
        { name: 'Lata 250', value: 40 },
        { name: 'PET 500ml', value: 25 },
        { name: 'PET 2L', value: 15 },
        { name: 'Lata 473', value: 12 },
        { name: 'Outros', value: 8 }
      ];
    }
    const tot = entries.reduce((s, e) => s + e.value, 0);
    return entries.map(e => ({ name: e.name, value: Math.round((e.value / tot) * 100) }));
  }, [filteredRows]);

  // Evolução Semanal Eficiência calculada dinamicamente com base nas linhas filtradas
  const chartEvolucaoSemanal = useMemo(() => {
    if (filteredRows.length === 0) {
      return [
        { name: 'S1', Eficiencia: 100 },
        { name: 'S2', Eficiencia: 100 },
        { name: 'S3', Eficiencia: 100 },
        { name: 'S4', Eficiencia: 100 },
        { name: 'S5', Eficiencia: 100 }
      ];
    }

    // Encontra a data mais recente nos registros filtrados
    let latestTime = -Infinity;
    filteredRows.forEach(r => {
      if (r.dataISO) {
        const t = new Date(r.dataISO + 'T00:00:00').getTime();
        if (t > latestTime) latestTime = t;
      }
    });

    const latestDate = latestTime === -Infinity ? new Date() : new Date(latestTime);
    
    // Gera as últimas 5 semanas terminando na semana da data mais recente
    const weeksData = Array.from({ length: 5 }, (_, idx) => {
      const weekDiff = idx - 4; // -4, -3, -2, -1, 0
      const d = new Date(latestDate.getTime());
      d.setDate(d.getDate() + weekDiff * 7);
      
      const day = d.getDay();
      const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
      const startOfWeek = new Date(d.setDate(diffToMonday));
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek.getTime());
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      
      return {
        start: startOfWeek.getTime(),
        end: endOfWeek.getTime(),
        name: `S${idx + 1}`
      };
    });

    return weeksData.map(week => {
      const rowsInWeek = filteredRows.filter(r => {
        if (!r.dataISO) return false;
        const t = new Date(r.dataISO + 'T00:00:00').getTime();
        return t >= week.start && t <= week.end;
      });

      if (rowsInWeek.length === 0) {
        // Se a semana não tiver dados específicos, gera uma variação realista ao redor da eficiência média
        const hash = week.name.charCodeAt(1) * 7;
        const variance = (hash % 11) - 5; // -5% a +5% de variação
        const base = eficienciaMedia > 0 ? eficienciaMedia : 100;
        const value = Math.max(70, Math.min(150, Math.round(base + variance)));
        return {
          name: week.name,
          Eficiencia: value
        };
      }

      // Calcula a eficiência real da semana
      const weekExpectedSec = rowsInWeek.reduce((sum, r) => {
        const metaUnit = EMBALAGENS_CONFIG[r.embalagem]?.metaSec || 240;
        return sum + (metaUnit * (Number(r.quantidade) || 1));
      }, 0);

      const weekGastoSec = rowsInWeek.reduce((sum, r) => sum + timeToSec(r.duracao), 0);
      const weekEficiencia = weekGastoSec === 0 ? 0 : Math.round((weekExpectedSec / weekGastoSec) * 100);

      return {
        name: week.name,
        Eficiencia: weekEficiencia
      };
    });
  }, [filteredRows, eficienciaMedia]);

  // Table paging and filtering
  const tableFilteredRows = useMemo(() => {
    return filteredRows.filter(r => {
      const term = tableSearch.toLowerCase();
      return (
        r.embalagem.toLowerCase().includes(term) ||
        (r.operador || '').toLowerCase().includes(term) ||
        (r.resultado || '').toLowerCase().includes(term)
      );
    });
  }, [filteredRows, tableSearch]);

  const totalPages = Math.ceil(tableFilteredRows.length / itemsPerPage) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return tableFilteredRows.slice(start, start + itemsPerPage);
  }, [tableFilteredRows, currentPage]);

  // Active calculations based on selected row or average
  const selectedRowDetails = useMemo(() => {
    const r = repackRows.find(x => x._docId === selectedRowId) || paginatedRows[0] || null;
    if (!r) return null;
    const unitMeta = EMBALAGENS_CONFIG[r.embalagem]?.metaSec || 240;
    const expectedSec = unitMeta * (Number(r.quantidade) || 1);
    const spentSec = timeToSec(r.duracao);
    const diffSec = expectedSec - spentSec;
    const eff = spentSec > 0 ? Math.round((expectedSec / spentSec) * 100) : 100;
    const cxH = spentSec > 0 ? Math.round(((Number(r.quantidade) || 0) / (spentSec / 3600)) * 10) / 10 : 0;
    const mediaUnit = spentSec > 0 ? formatSecToHMS(Math.round(spentSec / (Number(r.quantidade) || 1))) : '—';

    return {
      row: r,
      expected: formatSecToHMS(expectedSec),
      spent: r.duracao,
      diff: formatSecToHMS(Math.abs(diffSec)),
      diffPositive: diffSec >= 0,
      efficiency: eff,
      caixasHora: cxH,
      tempoMedioUnit: mediaUnit
    };
  }, [repackRows, selectedRowId, paginatedRows]);

  // Register Production Submit
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formInicio || !formFim) {
      alert('Selecione os horários inicial e final');
      return;
    }
    const today = new Date();
    const activeMeta = EMBALAGENS_CONFIG[formEmbalagem]?.metaSec || 240;
    const totalMetaSec = activeMeta * formQuantidade;
    const durSec = timeToSec(formFim) - timeToSec(formInicio);
    const spentSec = durSec < 0 ? durSec + 86400 : durSec;
    const result = spentSec <= totalMetaSec ? 'Dentro da meta' : 'Abaixo da meta';

    const isAboveMeta = spentSec > totalMetaSec;
    if (isAboveMeta && !formMotivoNaoBaterMeta.trim()) {
      alert('Por favor, informe o motivo de não bater a meta.');
      return;
    }

    const newEntry: Omit<RepackRow, '_docId'> = {
      empresaId: empresa?.id || 'demo',
      data: today.toLocaleDateString('pt-BR'),
      dataISO: today.toISOString().split('T')[0],
      embalagem: formEmbalagem,
      quantidade: formQuantidade,
      inicio: formInicio,
      fim: formFim,
      duracao: formatSecToHMS(spentSec),
      meta: formatSecToHMS(totalMetaSec),
      resultado: result,
      operador: formOperador,
      motivoNaoBaterMeta: isAboveMeta ? formMotivoNaoBaterMeta.trim() : "",
      _criadoEm: today.toISOString()
    };

    try {
      await addDoc(collection(db, 'repack'), newEntry);
      setIsModalOpen(false);
      setFormInicio('');
      setFormFim('');
      setFormQuantidade(10);
      setTimerSeconds(0);
      setTimerActive(false);
      setFormMotivoNaoBaterMeta('');
    } catch(err) {
      console.error(err);
    }
  };

  const handleStartStopwatch = () => {
    const hhmm = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setFormInicio(hhmm);
    setTimerSeconds(0);
    setTimerActive(true);
  };

  const handleStopStopwatch = () => {
    const hhmm = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setFormFim(hhmm);
    setTimerActive(false);
  };

  const handleDeleteRow = async (id: string) => {
    if (!window.confirm('Excluir este registro permanentemente?')) return;
    try {
      await deleteDoc(doc(db, 'repack', id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apDesc || !apResp || !apPrazo) return;
    const today = new Date();
    const companyId = empresa?.id || 'demo';
    const newPlan: Omit<RepackActionPlan, '_docId'> = {
      empresaId: companyId,
      dataCriacao: today.toLocaleDateString('pt-BR'),
      dataCriacaoISO: today.toISOString().split('T')[0],
      descricao: apDesc,
      causaRaiz4M: apCausa,
      responsavel: apResp,
      prazo: apPrazo,
      status: 'Pendente',
      _criadoEm: today.toISOString()
    };
    try {
      await addDoc(collection(db, 'repack_action_plans'), newPlan);
      setApDesc('');
      setApResp('');
      setApPrazo('');
    } catch (e) {
      console.error(e);
    }
  };

  const handleChangeApStatus = async (id: string, next: 'Pendente' | 'Em Andamento' | 'Concluído') => {
    try {
      await updateDoc(doc(db, 'repack_action_plans', id), { status: next });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteAp = async (id: string) => {
    if (!window.confirm('Deletar plano de ação?')) return;
    try {
      await deleteDoc(doc(db, 'repack_action_plans', id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleApplyFilters = () => {
    setActiveColaborador(filterColaborador);
    setActiveEmbalagem(filterEmbalagem);
    setActiveStartDate(filterStartDate);
    setActiveEndDate(filterEndDate);
    setActiveMeta(filterMeta);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilterColaborador('todos');
    setFilterEmbalagem('todos');
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterMeta('todos');

    setActiveColaborador('todos');
    setActiveEmbalagem('todos');
    setActiveStartDate('');
    setActiveEndDate('');
    setActiveMeta('todos');
    setCurrentPage(1);
  };

  const handleExportXLSX = () => {
    const data = filteredRows.map(r => ({
      'Data': r.data,
      'Colaborador': r.operador || '—',
      'Embalagem': r.embalagem,
      'Quantidade': r.quantidade,
      'Hora Inicial': r.inicio,
      'Hora Final': r.fim,
      'Duração': r.duracao,
      'Resultado': r.resultado
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Repack');
    XLSX.writeFile(wb, 'Produtividade_Repack.xlsx');
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('REPAD DASHBOARD - PRODUTIVIDADE', 14, 18);
    doc.setFontSize(9);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 25);
    
    let y = 40;
    doc.setTextColor(0, 0, 0);
    doc.text('HISTÓRICO DE LANÇAMENTOS', 14, y);
    y += 10;
    
    filteredRows.slice(0, 30).forEach(r => {
      doc.text(`${r.data} - ${r.operador || '—'} - ${r.embalagem} - ${r.quantidade}cx - ${r.duracao} [${r.resultado}]`, 14, y);
      y += 6;
    });
    doc.save('Relatorio_Repack.pdf');
  };

  // A3 Board state update and action handlers
  const updateField = (field: keyof RepackA3Board, value: any) => {
    if (!activeBoard) return;
    setActiveBoard(prev => {
      if (!prev) return null;
      return { ...prev, [field]: value };
    });
  };

  const updateAction = (index: number, key: string, value: any) => {
    if (!activeBoard) return;
    const newActions = [...activeBoard.actions];
    newActions[index] = { ...newActions[index], [key]: value };
    
    // Auto-set percentage and completed actions list if status is Concluído!
    if (key === 'status') {
      if (value === 'Concluído') {
        newActions[index].pct = 100;
      } else if (value === 'Pendente') {
        newActions[index].pct = 0;
      } else if (value === 'Em Andamento' && newActions[index].pct === 100) {
        newActions[index].pct = 50;
      }
    } else if (key === 'pct') {
      if (value === 100) {
        newActions[index].status = 'Concluído';
      } else if (value === 0) {
        newActions[index].status = 'Pendente';
      } else if (newActions[index].status === 'Concluído' && value < 100) {
        newActions[index].status = 'Em Andamento';
      }
    }

    // Auto compile concluded list
    const concludedList = newActions
      .filter(a => a.status === 'Concluído' || a.pct === 100)
      .map((a, i) => `${i + 1}. ${a.acao || '(Sem nome)'}`)
      .join('\n');

    setActiveBoard(prev => {
      if (!prev) return null;
      return { 
        ...prev, 
        actions: newActions,
        concluidas: concludedList || prev.concluidas
      };
    });
  };

  const updateIndicador = (index: number, key: string, value: any) => {
    if (!activeBoard) return;
    const newIndicators = [...activeBoard.indicadores];
    newIndicators[index] = { ...newIndicators[index], [key]: value };
    
    // If we change 'antes' or 'depois', try to auto-calculate 'variacao' if they are numbers!
    if (key === 'antes' || key === 'depois') {
      const antesVal = parseFloat(newIndicators[index].antes.replace(',', '.'));
      const depoisVal = parseFloat(newIndicators[index].depois.replace(',', '.'));
      if (!isNaN(antesVal) && !isNaN(depoisVal)) {
        if (antesVal === 0) {
          newIndicators[index].variacao = '0%';
        } else {
          const diff = ((depoisVal - antesVal) / antesVal) * 100;
          const sign = diff >= 0 ? '+' : '';
          newIndicators[index].variacao = `${sign}${diff.toFixed(1)}%`;
        }
      }
    }
    
    setActiveBoard(prev => {
      if (!prev) return null;
      return { ...prev, indicadores: newIndicators };
    });
  };

  const handleSaveBoard = async () => {
    if (!activeBoard) return;
    setSavingBoard(true);
    setBoardSaveStatus('idle');
    try {
      const companyId = empresa?.id || 'demo';
      const payload = {
        ...activeBoard,
        empresaId: companyId
      };
      
      if (activeBoard._docId === 'seed-board-1') {
        const { _docId, ...cleanPayload } = payload;
        const docRef = await addDoc(collection(db, 'repack_a3_boards'), {
          ...cleanPayload,
          _criadoEm: new Date().toISOString()
        });
        setActiveBoard({
          ...activeBoard,
          _docId: docRef.id
        });
      } else if (activeBoard._docId) {
        const { _docId, ...saveData } = activeBoard;
        await updateDoc(doc(db, 'repack_a3_boards', _docId), saveData);
      } else {
        const docRef = await addDoc(collection(db, 'repack_a3_boards'), {
          ...payload,
          _criadoEm: new Date().toISOString()
        });
        setActiveBoard({
          ...activeBoard,
          _docId: docRef.id
        });
      }
      setBoardSaveStatus('success');
      setTimeout(() => setBoardSaveStatus('idle'), 3000);
    } catch (err) {
      console.error('Error saving A3 board:', err);
      setBoardSaveStatus('error');
      setTimeout(() => setBoardSaveStatus('idle'), 3000);
    } finally {
      setSavingBoard(false);
    }
  };

  const handleCreateNewBoard = async () => {
    const title = prompt('Digite o título para o novo Quadro de Resolução de Problemas A3:');
    if (!title) return;
    
    const companyId = empresa?.id || 'demo';
    const newBoard = getEmptyBoard(companyId, title);
    
    try {
      const docRef = await addDoc(collection(db, 'repack_a3_boards'), {
        ...newBoard,
        _criadoEm: new Date().toISOString()
      });
      const created = {
        _docId: docRef.id,
        ...newBoard
      } as RepackA3Board;
      setActiveBoard(created);
    } catch (err) {
      console.error('Error creating A3 board:', err);
    }
  };

  const handleDeleteBoard = async () => {
    if (!activeBoard) return;
    if (activeBoard._docId === 'seed-board-1') {
      setActiveBoard(null);
      return;
    }
    
    const confirmDelete = window.confirm(`Deseja realmente excluir o quadro "${activeBoard.titulo}"? Esta operação é irreversível.`);
    if (!confirmDelete) return;
    
    try {
      await deleteDoc(doc(db, 'repack_a3_boards', activeBoard._docId!));
      setActiveBoard(null);
    } catch (err) {
      console.error('Error deleting A3 board:', err);
    }
  };

  return (
    <div id="repack-dashboard-wrapper" className={`w-full bg-[#f8fafc] text-[#0f172a] rounded-xl shadow-sm border border-gray-200/80 relative transition-all duration-300 ${isCompact ? 'p-3' : 'p-4'}`}>

      {/* ── BARRA SUPERIOR ── */}
      <header className={`flex flex-col xl:flex-row xl:items-center xl:justify-between gap-2.5 border-b border-gray-200 ${isCompact ? 'pb-2 mb-2' : 'pb-4 mb-4'}`}>
        <div className="flex items-center gap-2.5">
          {onBack && (
            <button 
              onClick={onBack}
              className="p-1 hover:bg-gray-200/80 rounded-lg transition-colors cursor-pointer text-gray-500 border-none bg-transparent"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1e56f0] to-[#113fa9] flex items-center justify-center text-base shadow-[0_0_12px_rgba(30,86,240,0.2)]">
            📦
          </div>
          <div>
            <h1 className={`font-sans font-black tracking-tight text-[#032b5e] uppercase ${isCompact ? 'text-base' : 'text-xl'}`}>
              PRODUTIVIDADE DO REPACK
            </h1>
            <p className="text-[9px] text-gray-400 tracking-wider font-bold uppercase mt-0.5">
              INDICADORES ESTRATÉGICOS, METAS DE DESEMPENHO E CRONOMETRAGEM DE REEMBALAGEM
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200/60">
            <button 
              onClick={() => setActiveSubTab('produtividade')}
              className={`px-3 py-1 rounded font-sans font-bold text-[9px] uppercase tracking-wider transition-all border-none cursor-pointer ${activeSubTab === 'produtividade' ? 'bg-[#032b5e] text-white shadow-xs' : 'text-gray-500 hover:text-[#032b5e] bg-transparent'}`}
            >
              Produtividade & BI
            </button>
            <button 
              onClick={() => setActiveSubTab('boarda3')}
              className={`px-3 py-1 rounded font-sans font-bold text-[9px] uppercase tracking-wider transition-all border-none cursor-pointer ${activeSubTab === 'boarda3' ? 'bg-[#032b5e] text-white shadow-xs' : 'text-gray-500 hover:text-[#032b5e] bg-transparent'}`}
            >
              Quadro de Ações
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-gray-500 bg-white px-2.5 py-1 rounded-lg border border-gray-200 shadow-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-mono">{currentTime || 'Sincronizando...'}</span>
          </div>
        </div>
      </header>

      {activeSubTab === 'produtividade' && (
        <div className="space-y-3">
          
          {/* ── LINHA DE FILTROS COMPACTA ── */}
          <section className="bg-white border border-gray-200 rounded-xl flex flex-wrap items-center justify-between p-3 gap-3 shadow-xs">
            <div className="flex flex-wrap items-center gap-4">
              {/* Período (Calendário) */}
              <div className="flex flex-col gap-1 min-w-[200px]">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Período (Calendário)</label>
                <CalendarFilter
                  startDate={filterStartDate}
                  endDate={filterEndDate}
                  onChange={(start, end) => {
                    setFilterStartDate(start);
                    setFilterEndDate(end);
                  }}
                />
              </div>

              {/* Colaborador */}
              <div className="flex flex-col gap-1 w-[130px]">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Colaborador</label>
                <select
                  value={filterColaborador}
                  onChange={(e) => setFilterColaborador(e.target.value)}
                  className="w-full bg-white border border-gray-200 text-[#032b5e] font-sans font-bold rounded-lg outline-none px-2.5 py-1 text-[10px] h-[28px] cursor-pointer transition-all hover:border-blue-400 focus:border-[#032b5e]"
                >
                  <option value="todos">Todos</option>
                  {distinctOperadores.map(op => (
                    <option key={op} value={op}>{op}</option>
                  ))}
                </select>
              </div>

              {/* Embalagem */}
              <div className="flex flex-col gap-1 w-[130px]">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Embalagem</label>
                <select
                  value={filterEmbalagem}
                  onChange={(e) => setFilterEmbalagem(e.target.value)}
                  className="w-full bg-white border border-gray-200 text-[#032b5e] font-sans font-bold rounded-lg outline-none px-2.5 py-1 text-[10px] h-[28px] cursor-pointer transition-all hover:border-blue-400 focus:border-[#032b5e]"
                >
                  <option value="todos">Todas</option>
                  {Object.keys(EMBALAGENS_CONFIG).map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>

              {/* Status da Meta */}
              <div className="flex flex-col gap-1 w-[150px]">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Status da Meta</label>
                <select
                  value={filterMeta}
                  onChange={(e) => setFilterMeta(e.target.value as any)}
                  className="w-full bg-white border border-gray-200 text-[#032b5e] font-sans font-bold rounded-lg outline-none px-2.5 py-1 text-[10px] h-[28px] cursor-pointer transition-all hover:border-blue-400 focus:border-[#032b5e]"
                >
                  <option value="todos">Todos</option>
                  <option value="dentro">Dentro da Meta</option>
                  <option value="fora">Fora da Meta (Dias Ruins)</option>
                </select>
              </div>
            </div>
          </section>

          {/* ── COCKPIT INDICADORES GERAL ── */}
          <div className="space-y-3">
              {/* LINE 1: KPIs (Columns containing stacked Cards) */}
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Column 1: SKUs & HE */}
                <div className="flex flex-col gap-3">
                  {/* KPI 1: SKUs */}
                  <div className="bg-white rounded-xl border border-gray-200 flex flex-col justify-between shadow-xs hover:border-[#1e56f0]/50 transition-all duration-300 p-2.5 h-[115px] overflow-hidden">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">📦 SKUs</span>
                        <span className="font-extrabold text-[#032b5e] mt-0.5 text-2xl leading-none">{totalSkus}</span>
                        <span className="text-[9px] text-gray-400 font-bold uppercase mt-1">Total no período</span>
                      </div>
                      <div className="rounded-lg bg-[#1e56f0]/10 flex items-center justify-center text-[#1e56f0] w-7 h-7 flex-shrink-0">
                        <Box className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="w-full h-[32px] mt-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartProdutividadeDia} margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                          <Area type="monotone" dataKey="SKUs" stroke="#1e56f0" fill="rgba(30,86,240,0.06)" strokeWidth={1} dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* KPI 1B: HE = Hectolitro */}
                  <div className="bg-white rounded-xl border border-gray-200 flex flex-col justify-between shadow-xs hover:border-sky-500/50 transition-all duration-300 p-2.5 h-[115px] overflow-hidden">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">🧪 HE = Hectolitro</span>
                        <span className="font-extrabold text-[#032b5e] mt-0.5 text-2xl leading-none font-mono">
                          {totalHE.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} HL
                        </span>
                        <span className="text-[9px] text-gray-400 font-bold uppercase mt-1">Volume de Reembalagem</span>
                      </div>
                      <div className="rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-500 w-7 h-7 flex-shrink-0">
                        <Droplet className="w-4 h-4" fill="currentColor" />
                      </div>
                    </div>
                    <div className="w-full h-[32px] mt-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartProdutividadeDia} margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                          <Area type="monotone" dataKey="SKUs" stroke="#0ea5e9" fill="rgba(14,165,233,0.06)" strokeWidth={1} dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Column 2: Tempo Médio & Tempo Total */}
                <div className="flex flex-col gap-3">
                  {/* KPI 2: Tempo Médio */}
                  <div className="bg-white rounded-xl border border-gray-200 flex flex-col justify-between shadow-xs hover:border-emerald-500/50 transition-all duration-300 p-2.5 h-[115px] overflow-hidden">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">⏱ Tempo Médio</span>
                        <span className="font-extrabold text-[#032b5e] mt-0.5 text-2xl leading-none font-mono">{tempoMedioPorSkuStr}</span>
                        <span className="text-[9px] text-gray-400 font-bold uppercase mt-1">Por SKU</span>
                      </div>
                      <div className="rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 w-7 h-7 flex-shrink-0">
                        <Clock className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="w-full h-[32px] mt-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartTempoMedioDia} margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                          <Area type="monotone" dataKey="Minutos" stroke="#22c55e" fill="rgba(34,197,94,0.06)" strokeWidth={1} dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* KPI 2B: Tempo Total Trabalhado */}
                  <div className="bg-white rounded-xl border border-gray-200 flex flex-col justify-between shadow-xs hover:border-emerald-500/50 transition-all duration-300 p-2.5 h-[115px] overflow-hidden">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">⏱ Tempo Total Trabalhado</span>
                        <span className="font-extrabold text-[#032b5e] mt-0.5 text-2xl leading-none font-mono">{totalTempoTrabalhadoStr}</span>
                        <span className="text-[9px] text-gray-400 font-bold uppercase mt-1">Horas Trabalhadas</span>
                      </div>
                      <div className="rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 w-7 h-7 flex-shrink-0">
                        <Clock className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="w-full h-[32px] mt-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartTempoMedioDia} margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                          <Area type="monotone" dataKey="Minutos" stroke="#10b981" fill="rgba(16,185,129,0.06)" strokeWidth={1} dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Column 3: Produtividade */}
                <div className="flex flex-col gap-3">
                  {/* KPI 3: Produtividade */}
                  <div className="bg-white rounded-xl border border-gray-200 flex flex-col justify-between shadow-xs hover:border-[#1e56f0]/50 transition-all duration-300 p-2.5 h-[115px] overflow-hidden">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">⚡ Produtividade ({nivelFiltroProdutividade})</span>
                        <span className="font-extrabold text-[#1e56f0] mt-0.5 text-2xl leading-none font-mono">
                          {produtividadeRealHE.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-semibold text-gray-500">HE/h</span>
                        </span>
                        <span className="text-[9px] text-gray-400 font-bold uppercase mt-1">
                          Meta: {produtividadeMetaHE.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} HE/h
                        </span>
                      </div>
                      <div className="rounded-lg bg-[#1e56f0]/10 flex items-center justify-center text-[#1e56f0] w-7 h-7 flex-shrink-0">
                        <Zap className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="w-full h-[32px] mt-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartProdutividadeDia} margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                          <Area type="monotone" dataKey="SKUs" stroke="#1e56f0" fill="rgba(30,86,240,0.06)" strokeWidth={1} dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  {/* Spacer under Column 3 as requested: Produtividade não precisa ter nada */}
                  <div className="h-[115px] hidden lg:block" />
                </div>

                {/* Column 4: Eficiência & Tendência */}
                <div className="flex flex-col gap-3">
                  {/* KPI 4: Eficiência */}
                  <div className="bg-white rounded-xl border border-gray-200 flex flex-col justify-between shadow-xs hover:border-purple-500/50 transition-all duration-300 p-2.5 h-[115px] overflow-hidden">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">🎯 Eficiência</span>
                        <span className="font-extrabold text-[#032b5e] mt-0.5 text-2xl leading-none">{eficienciaMedia}%</span>
                        <span className={`text-[9px] font-bold uppercase mt-1 ${eficienciaMedia >= 100 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {eficienciaMedia >= 100 ? 'Meta OK' : 'Abaixo da meta'}
                        </span>
                      </div>
                      <div className="rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500 w-7 h-7 flex-shrink-0">
                        <Target className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="w-full h-[32px] mt-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartEvolucaoSemanal} margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                          <Area type="monotone" dataKey="Eficiencia" stroke="#8b5cf6" fill="rgba(139,92,246,0.06)" strokeWidth={1} dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* KPI 4B: Tendência do Mês */}
                  <div className="bg-white rounded-xl border border-gray-200 flex flex-col justify-between shadow-xs hover:border-purple-500/50 transition-all duration-300 p-2.5 h-[115px] overflow-hidden">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">📈 Tendência do Mês</span>
                        <span className={`font-black mt-0.5 text-[14px] leading-tight ${tendenciaMensal.colorClass}`}>
                          {tendenciaMensal.status}
                        </span>
                        <span className="text-[9px] text-gray-400 font-bold uppercase mt-1">
                          {tendenciaMensal.label} ({tendenciaMensal.percent}%)
                        </span>
                      </div>
                      <div className={`rounded-lg flex items-center justify-center w-7 h-7 flex-shrink-0 ${tendenciaMensal.percent >= 100 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                        <TrendingUp className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="w-full h-[32px] mt-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartEvolucaoSemanal} margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                          <Area type="monotone" dataKey="Eficiencia" stroke={tendenciaMensal.percent >= 100 ? '#10b981' : '#f43f5e'} fill={tendenciaMensal.percent >= 100 ? 'rgba(16,185,129,0.06)' : 'rgba(244,63,94,0.06)'} strokeWidth={1} dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </section>

              {/* ── SIMULADOR DE META MENSAL ── */}
              <section className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:border-[#1e56f0]/30 transition-all duration-300">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 pb-3 mb-4">
                  <div>
                    <h3 className="font-sans font-black text-xs uppercase text-[#032b5e] tracking-wider flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-[#1e56f0] animate-pulse" />
                      Simulador de Meta Mensal - Fechamento Projetado (Mês Vigente)
                    </h3>
                    <p className="text-[10px] text-gray-400 font-semibold mt-0.5 uppercase tracking-wide">
                      Projeção automatizada baseada inteiramente em dados reais de produção e calendário útil
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => {
                        setSimUnidade('HE');
                        setSimMetaCustom(null);
                        setSimMediaCustom(null);
                        setSimVolumeCustom(null);
                      }}
                      className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg border transition-all duration-300 cursor-pointer ${simUnidade === 'HE' ? 'bg-[#032b5e] text-white border-[#032b5e]' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}
                    >
                      Volume em HE
                    </button>
                    <button
                      onClick={() => {
                        setSimUnidade('SKUs');
                        setSimMetaCustom(null);
                        setSimMediaCustom(null);
                        setSimVolumeCustom(null);
                      }}
                      className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg border transition-all duration-300 cursor-pointer ${simUnidade === 'SKUs' ? 'bg-[#032b5e] text-white border-[#032b5e]' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}
                    >
                      Volume em SKUs
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  {/* Card 1: Volume Realizado */}
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center gap-3 shadow-xs">
                    <div className="p-2 bg-blue-50 text-[#1e56f0] rounded-lg">
                      <Box className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">Realizado Acumulado</span>
                      <span className="font-extrabold text-[#032b5e] text-[15px] block leading-tight font-mono">
                        {simVolumeAcumulado.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} {simUnidade}
                      </span>
                      <span className="text-[9px] text-gray-400 font-semibold block uppercase leading-tight mt-0.5">
                        Mês: {workingDaysInfo.monthName}
                      </span>
                    </div>
                  </div>

                  {/* Card 2: Média Diária Real */}
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center gap-3 shadow-xs">
                    <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">Média p/ Dia Útil</span>
                      <span className="font-extrabold text-purple-700 text-[15px] block leading-tight font-mono">
                        {simMediaAcumulada.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} {simUnidade}/dia
                      </span>
                      <span className="text-[9px] text-gray-400 font-semibold block uppercase leading-tight mt-0.5">
                        Ritmo real do mês
                      </span>
                    </div>
                  </div>

                  {/* Card 3: Calendário de Dias Úteis */}
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center gap-3 shadow-xs">
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">Calendário Útil</span>
                      <span className="font-extrabold text-amber-700 text-[15px] block leading-tight font-mono">
                        {workingDaysInfo.totalWorkingDays} dias úteis
                      </span>
                      <span className="text-[9px] text-gray-400 font-semibold block uppercase leading-tight mt-0.5">
                        {workingDaysInfo.elapsedWorkingDays} trab. | {workingDaysInfo.remainingWorkingDays} rest.
                      </span>
                    </div>
                  </div>

                  {/* Card 4: Meta Mensal */}
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center gap-3 shadow-xs">
                    <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                      <Target className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">Meta Estabelecida</span>
                      <span className="font-extrabold text-rose-700 text-[15px] block leading-tight font-mono">
                        {simMeta.toLocaleString('pt-BR')} {simUnidade}
                      </span>
                      <span className="text-[9px] text-gray-400 font-semibold block uppercase leading-tight mt-0.5">
                        Objetivo do controle (130%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Consolidated Closing Projection & Progress Status */}
                <div className={`p-4 rounded-xl border ${atingiuMeta ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-rose-50 border-rose-200 text-rose-950'} flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs`}>
                  {/* Left block: Numeric result */}
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg flex items-center justify-center flex-shrink-0 ${atingiuMeta ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                      {atingiuMeta ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                    </div>
                    <div>
                      <span className="text-[9px] font-extrabold uppercase tracking-widest block opacity-70">Fechamento Projetado</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-black font-mono tracking-tight text-[#032b5e]">
                          {projecaoFechamento.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} {simUnidade}
                        </span>
                        <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${atingiuMeta ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {atingiuMeta ? `Meta OK (${atingimentoPercent}%)` : `Risco de Desvio (${atingimentoPercent}%)`}
                        </span>
                      </div>
                      <p className="text-[10.5px] font-medium mt-0.5 leading-tight opacity-90">
                        {atingiuMeta 
                          ? `Com base no ritmo real, a meta mensal de ${simMeta} ${simUnidade} será batida com folga de +${(projecaoFechamento - simMeta).toFixed(1)} ${simUnidade}.`
                          : `Desvio de ${deficit.toFixed(1)} ${simUnidade} projetado. É recomendável ativar o plano de contingência abaixo.`
                        }
                      </p>
                    </div>
                  </div>

                  {/* Right block: Compact progress bar */}
                  <div className="md:w-64 flex-shrink-0">
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-wider mb-1.5">
                      <span className="opacity-70">Progresso da Meta</span>
                      <span>{atingimentoPercent}%</span>
                    </div>
                    <div className="w-full bg-gray-200/80 rounded-full h-2.5 overflow-hidden relative shadow-inner">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ease-out ${atingiuMeta ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' : 'bg-gradient-to-r from-rose-500 to-rose-600'}`}
                        style={{ width: `${Math.min(100, atingimentoPercent)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Plano de Ação Elaborado pelo Controle */}
                {!atingiuMeta && (
                  <div className="mt-4 border-t border-dashed border-gray-200 pt-4">
                    <div className="bg-[#032b5e]/5 border border-[#032b5e]/20 rounded-xl p-3 mb-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-black text-[#032b5e] uppercase tracking-wider flex items-center gap-1.5">
                            <SlidersHorizontal className="w-3.5 h-3.5 text-[#032b5e]" />
                            Dimensionamento de Esforço Recomendado pelo Controle
                          </span>
                          <p className="text-[10px] text-gray-500 font-medium mt-0.5">
                            Para atingir a meta nos {simDiasRestantes} dias restantes, a média de produção precisa de incremento operacional.
                          </p>
                        </div>
                        <div className="bg-[#032b5e] text-white rounded-lg px-2.5 py-1 text-center font-mono text-[10px] font-bold">
                          <span className="block text-[8px] text-gray-300 font-black uppercase tracking-widest">Média Necessária</span>
                          {mediaNecessariaProximosDias.toFixed(1)} {simUnidade}/dia
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
                      <div className="bg-slate-50 border-b border-gray-100 px-3 py-2 flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase text-gray-500 tracking-wider flex items-center gap-1.5">
                          📋 Plano de Ação Crítico - Elaborado pelo Controle de Produtividade
                        </span>
                        <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider">
                          Requer Ativação Urgente
                        </span>
                      </div>
                      <div className="divide-y divide-gray-100 text-xs text-slate-700">
                        <div className="p-3 grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                          <div className="md:col-span-2">
                            <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">Mão de Obra</span>
                          </div>
                          <div className="md:col-span-6">
                            <span className="font-bold text-slate-800 block">Redistribuição tática de operadores</span>
                            <span className="text-[10px] text-gray-400 font-semibold block mt-0.5">
                              Deslocar 1 operador adicional de apoio das áreas de menor criticidade para a linha de reembalagem do Repack.
                            </span>
                          </div>
                          <div className="md:col-span-2">
                            <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wide">Prazo / Responsável</span>
                            <span className="font-semibold text-slate-700 block">D+1 / Matheus Barbosa</span>
                          </div>
                          <div className="md:col-span-2 text-right">
                            <span className="inline-block bg-[#1e56f0]/10 text-[#1e56f0] px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase">
                              Aguardando
                            </span>
                          </div>
                        </div>

                        <div className="p-3 grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                          <div className="md:col-span-2">
                            <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">Método</span>
                          </div>
                          <div className="md:col-span-6">
                            <span className="font-bold text-slate-800 block">Blitz de Otimização de Bancada (5S + Ergonomia)</span>
                            <span className="text-[10px] text-gray-400 font-semibold block mt-0.5">
                              Reorganizar insumos de divisórias e fitas a menos de 1,5 metro de raio de giro do operador para mitigar perda por micro-movimentações.
                            </span>
                          </div>
                          <div className="md:col-span-2">
                            <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wide">Prazo / Responsável</span>
                            <span className="font-semibold text-slate-700 block">D+2 / Paulo Pereira</span>
                          </div>
                          <div className="md:col-span-2 text-right">
                            <span className="inline-block bg-[#1e56f0]/10 text-[#1e56f0] px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase">
                              Aguardando
                            </span>
                          </div>
                        </div>

                        <div className="p-3 grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                          <div className="md:col-span-2">
                            <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">Máquina</span>
                          </div>
                          <div className="md:col-span-6">
                            <span className="font-bold text-slate-800 block">Escalonamento de Pausas em Regime Rotativo</span>
                            <span className="text-[10px] text-gray-400 font-semibold block mt-0.5">
                              Assegurar que as pausas para refeição ocorram de forma intercalada, mantendo o processo produtivo ativo continuamente.
                            </span>
                          </div>
                          <div className="md:col-span-2">
                            <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wide">Prazo / Responsável</span>
                            <span className="font-semibold text-slate-700 block">D+1 / Ozenildo Silva</span>
                          </div>
                          <div className="md:col-span-2 text-right">
                            <span className="inline-block bg-[#1e56f0]/10 text-[#1e56f0] px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase">
                              Aguardando
                            </span>
                          </div>
                        </div>

                        <div className="p-3 grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                          <div className="md:col-span-2">
                            <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">Material</span>
                          </div>
                          <div className="md:col-span-6">
                            <span className="font-bold text-slate-800 block">Acordo de Lotes Mínimos de Setup (PCP)</span>
                            <span className="text-[10px] text-gray-400 font-semibold block mt-0.5">
                              Negociar com o PCP o agrupamento de ordens semanais do mesmo SKU para evitar transições de formato frequentes nas linhas.
                            </span>
                          </div>
                          <div className="md:col-span-2">
                            <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wide">Prazo / Responsável</span>
                            <span className="font-semibold text-slate-700 block">D+3 / Supervisão de Logística</span>
                          </div>
                          <div className="md:col-span-2 text-right">
                            <span className="inline-block bg-[#1e56f0]/10 text-[#1e56f0] px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase">
                              Aguardando
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* LINE 2: Produtividade por Dia & Tempo Médio */}
              <section className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                <div className="bg-white border border-gray-200 rounded-xl lg:col-span-6 p-2.5 h-[175px] flex flex-col justify-between shadow-3xs">
                  <h3 className="font-sans font-black text-[10px] uppercase text-[#032b5e] tracking-wider mb-1">Produtividade por Dia</h3>
                  <div className="w-full h-[135px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartProdutividadeDia} margin={{ top: 10, bottom: 0, left: -25, right: 0 }}>
                        <CartesianGrid strokeDasharray="2 2" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} axisLine={false} fontSize={8} />
                        <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} fontSize={8} />
                        <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '6px', fontSize: '10px' }} />
                        <Bar dataKey="SKUs" fill="#1e56f0" radius={0} barSize={24} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl lg:col-span-6 p-2.5 h-[175px] flex flex-col justify-between shadow-3xs">
                  <h3 className="font-sans font-black text-[10px] uppercase text-[#032b5e] tracking-wider mb-1">Tempo Médio Gasto por Dia</h3>
                  <div className="w-full h-[135px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartTempoMedioDia} margin={{ top: 10, bottom: 0, left: -25, right: 0 }}>
                        <CartesianGrid strokeDasharray="2 2" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} axisLine={false} fontSize={8} />
                        <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} fontSize={8} />
                        <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '6px', fontSize: '10px' }} />
                        <Line type="monotone" dataKey="Minutos" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, stroke: '#10b981', fill: '#ffffff', strokeWidth: 1.5 }} activeDot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </section>

              {/* LINE 3: Eficiência Circular Gauge, Ranking Embalagens, Distribuição de Trabalho */}
              <section className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                {/* Eficiência Gauge */}
                <div className="bg-white border border-gray-200 rounded-xl lg:col-span-4 p-2.5 h-[185px] flex flex-col justify-between items-center relative">
                  <h3 className="font-sans font-black text-[10px] uppercase text-[#032b5e] tracking-wider w-full mb-1">Eficiência Geral</h3>
                  <div className="relative w-full h-[110px] flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { value: Math.min(eficienciaMedia, 150) },
                            { value: Math.max(0, 150 - eficienciaMedia) }
                          ]}
                          cx="50%"
                          cy="80%"
                          startAngle={180}
                          endAngle={0}
                          innerRadius={45}
                          outerRadius={58}
                          paddingAngle={0}
                          dataKey="value"
                        >
                          <Cell fill={eficienciaMedia >= 100 ? COLORS.verde : eficienciaMedia >= 80 ? COLORS.amarelo : COLORS.vermelho} />
                          <Cell fill="#f1f5f9" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-x-0 bottom-1.5 flex flex-col items-center justify-end">
                      <span className="font-extrabold text-[#032b5e] text-lg leading-none">{eficienciaMedia}%</span>
                      <span className="text-[7px] text-gray-400 font-bold uppercase tracking-wider mt-1">Eficiência Geral</span>
                    </div>
                  </div>
                  <div className="flex justify-between w-full text-[8px] text-gray-400 font-bold uppercase px-1 border-t border-gray-100 pt-1">
                    <span>0%</span>
                    <span className="text-emerald-500 font-extrabold">Meta</span>
                    <span>150%</span>
                  </div>
                </div>

                {/* Ranking Embalagens */}
                <div className="bg-white border border-gray-200 rounded-xl lg:col-span-4 p-2.5 h-[185px] flex flex-col justify-between">
                  <h3 className="font-sans font-black text-[10px] uppercase text-[#032b5e] tracking-wider mb-1">Ranking Embalagens</h3>
                  <div className="w-full h-[140px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart layout="vertical" data={chartRankingEmbalagens} margin={{ left: -30, right: 5, top: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="2 2" stroke="#f1f5f9" horizontal={false} />
                        <XAxis type="number" stroke="#94a3b8" tickLine={false} fontSize={8} />
                        <YAxis dataKey="name" type="category" stroke="#94a3b8" tickLine={false} width={80} fontSize={8} />
                        <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '6px', fontSize: '9px' }} />
                        <Bar dataKey="value" fill="#1e56f0" radius={[0, 2, 2, 0]} barSize={8} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Distribuição do Trabalho */}
                <div className="bg-white border border-gray-200 rounded-xl lg:col-span-4 p-2.5 h-[185px] flex flex-col justify-between">
                  <h3 className="font-sans font-black text-[10px] uppercase text-[#032b5e] tracking-wider mb-1">Distribuição do Trabalho</h3>
                  <div className="flex items-center justify-between gap-2 h-[140px] w-full">
                    <div className="w-[85px] h-[85px] shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartDistribuicaoTrabalho}
                            cx="50%"
                            cy="50%"
                            innerRadius={24}
                            outerRadius={36}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {chartDistribuicaoTrabalho.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 min-w-0 overflow-y-auto max-h-[120px] space-y-1 text-[8px] uppercase font-black tracking-wider text-gray-500">
                      {chartDistribuicaoTrabalho.slice(0, 4).map((item, idx) => (
                        <div key={item.name} className="flex items-center justify-between gap-1 py-0.5 border-b border-gray-50">
                          <span className="flex items-center gap-1 truncate">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                            <span className="truncate">{item.name}</span>
                          </span>
                          <span className="font-extrabold text-[#032b5e] shrink-0">{item.value}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* ── COCKPIT MATRIZES & BI ── */}
            <div className="space-y-3">
              {/* LINE 1: Heatmap & Evolução */}
              <section className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                <div className="bg-white border border-gray-200 rounded-xl lg:col-span-6 p-3 h-[245px] flex flex-col justify-between shadow-3xs">
                  <h3 className="font-sans font-black text-[10px] uppercase text-[#032b5e] tracking-wider mb-1">Heatmap de Produtividade <span className="text-[9px] text-gray-400 font-normal normal-case">(SKUs por hora)</span></h3>
                  <div className="grid grid-cols-6 gap-y-2 gap-x-1 text-center py-2 flex-1 my-auto">
                    <div />
                    {['SEG', 'TER', 'QUA', 'QUI', 'SEX'].map(d => (
                      <span key={d} className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{d}</span>
                    ))}

                    {Object.entries(heatmapData).map(([hour, daysMap]) => (
                      <React.Fragment key={hour}>
                        <span className="text-[9px] font-bold text-gray-500 self-center">{hour}</span>
                        {Object.entries(daysMap).map(([day, level]) => (
                          <div key={day} className="flex justify-center items-center h-4">
                            <span className={`rounded-full inline-block transition-all duration-300 hover:scale-125 cursor-pointer shadow-xs w-2 h-2 ${
                              level === 'green' ? 'bg-emerald-500 shadow-emerald-500/10' :
                              level === 'yellow' ? 'bg-[#1e56f0] shadow-[#1e56f0]/10' :
                              'bg-rose-500 shadow-rose-500/10'
                            }`} />
                          </div>
                        ))}
                      </React.Fragment>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2 text-[8px] text-gray-400 font-black uppercase pt-1.5 border-t border-gray-50 mt-1">
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block" /> Alta</span>
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-[#1e56f0] rounded-full inline-block" /> Média</span>
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-rose-500 rounded-full inline-block" /> Baixa</span>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl lg:col-span-6 p-3 h-[245px] flex flex-col justify-between shadow-3xs">
                  <h3 className="font-sans font-black text-[10px] uppercase text-[#032b5e] tracking-wider mb-1">Evolução Semanal da Eficiência</h3>
                  <div className="w-full h-[190px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartEvolucaoSemanal} margin={{ top: 5, bottom: 0, left: -25, right: 0 }}>
                        <defs>
                          <linearGradient id="colorEf" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#1e56f0" stopOpacity={0.15}/>
                            <stop offset="95%" stopColor="#1e56f0" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="2 2" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} fontSize={8} />
                        <YAxis stroke="#94a3b8" tickLine={false} domain={[80, 130]} fontSize={8} />
                        <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '6px', fontSize: '9px' }} />
                        <Area type="monotone" dataKey="Eficiencia" stroke="#1e56f0" strokeWidth={2} fillOpacity={1} fill="url(#colorEf)" dot={{ r: 3, stroke: '#1e56f0', fill: '#ffffff' }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </section>

              {/* LINE 2: Comparativo Meta x Real, Fórmula, Bento de Médias */}
              <section className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                {/* Comparativo Meta x Real */}
                <div className="bg-white border border-gray-200 rounded-xl lg:col-span-4 p-2.5 h-[180px] flex flex-col justify-between">
                  <h3 className="font-sans font-black text-[10px] uppercase text-[#032b5e] tracking-wider mb-1">Meta x Real <span className="text-[9px] text-gray-400 font-normal normal-case">(SKUs)</span></h3>
                  <div className="w-full h-[135px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartComparativoMetaReal} margin={{ top: 5, bottom: 0, left: -25, right: 0 }}>
                        <CartesianGrid strokeDasharray="2 2" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} fontSize={8} />
                        <YAxis stroke="#94a3b8" tickLine={false} fontSize={8} />
                        <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '6px', fontSize: '9px' }} />
                        <Bar dataKey="Meta" fill="#1e56f0" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="Real" fill="#22c55e" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Fórmula Card */}
                <div className="bg-white border border-gray-200 rounded-xl lg:col-span-3 p-2.5 h-[180px] flex flex-col justify-between">
                  <div>
                    <h3 className="font-sans font-black text-[10px] uppercase text-[#032b5e] tracking-wider mb-1">Fórmula de Produtividade</h3>
                    <div className="p-1.5 bg-slate-50 border border-gray-100 rounded-lg text-center">
                      <span className="font-mono text-[10px] block text-[#1e56f0] font-extrabold">Eficiência =</span>
                      <span className="font-mono text-[8px] block text-gray-400 mt-0.5 leading-tight uppercase font-bold">
                        (Tempo Esperado / Tempo Gasto) × 100
                      </span>
                    </div>
                  </div>
                  <div className="border-t border-gray-100 space-y-0.5 text-[10px] text-gray-500 pt-1.5 mt-1.5">
                    <div className="flex justify-between">
                      <span>Ex: Meta:</span>
                      <span className="font-mono font-bold">4:30</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Gasto:</span>
                      <span className="font-mono font-bold">4:00</span>
                    </div>
                    <div className="flex justify-between font-bold text-emerald-500">
                      <span>Resultado:</span>
                      <span className="font-mono">112% (Meta OK)</span>
                    </div>
                  </div>
                </div>

                {/* Bento Médias Inteligentes */}
                <div className="bg-white border border-gray-200 rounded-xl lg:col-span-5 p-2.5 h-[180px] flex flex-col justify-between overflow-hidden">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-1 mb-1">Médias de Desempenho</h3>
                  <div className="overflow-y-auto flex-1 pr-0.5 space-y-1 text-[11px]">
                    {Object.keys(EMBALAGENS_CONFIG).slice(0, 3).map(key => {
                      const matched = repackRows.filter(x => x.embalagem === key);
                      const totalMatchedSec = matched.reduce((s, r) => s + timeToSec(r.duracao), 0);
                      const totalMatchedQty = matched.reduce((s, r) => s + (Number(r.quantidade) || 1), 0);
                      const avgSec = totalMatchedQty > 0 ? Math.round(totalMatchedSec / totalMatchedQty) : 0;
                      const targetSec = EMBALAGENS_CONFIG[key].metaSec;
                      return (
                        <div key={key} className="flex justify-between items-center py-0.5 border-b border-gray-50">
                          <div>
                            <span className="block font-bold text-slate-800 text-[10px]">{key}</span>
                            <span className="text-[8px] text-gray-400">Meta: {formatSecToHMS(targetSec)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-slate-600 text-[10px]">{avgSec > 0 ? formatSecToHMS(avgSec) : '—'}</span>
                            <span className={`w-2 h-2 rounded-full inline-block ${avgSec === 0 ? 'bg-gray-200' : avgSec <= targetSec ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            </div>

          {/* ── LINHA 7: TABELA (1300px) & PAINEL LATERAL (450px) ── */}
          <section className={`grid grid-cols-1 lg:grid-cols-12 ${isCompact ? 'gap-3' : 'gap-4'}`}>
            
            {/* Tabela de Lançamentos */}
            <div className={`bg-white border border-gray-200 rounded-xl lg:col-span-8 flex flex-col justify-between shadow-sm overflow-x-auto transition-all ${isCompact ? 'p-3 min-h-[300px]' : 'p-5 min-h-[360px]'}`}>
              <div>
                <div className={`flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 ${isCompact ? 'mb-2.5 pb-2' : 'mb-4 pb-3'}`}>
                  <div>
                    <h3 className="font-sans font-black text-xs uppercase text-[#032b5e] tracking-wider">Histórico de Lançamentos</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">Total de {tableFilteredRows.length} registros filtrados</p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Pesquisar..."
                        value={tableSearch}
                        onChange={(e) => { setTableSearch(e.target.value); setCurrentPage(1); }}
                        className="bg-white border border-gray-200 text-slate-800 text-xs rounded-lg pl-9 pr-3 py-1.5 focus:border-[#032b5e] outline-none transition-colors w-[180px]"
                      />
                    </div>
                    <button
                      onClick={handleExportXLSX}
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-sans font-bold rounded-lg text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer border-none"
                    >
                      <Download className="w-3 h-3 text-white" />
                      Excel
                    </button>
                    <button
                      onClick={handleExportPDF}
                      className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white font-sans font-bold rounded-lg text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer border-none"
                    >
                      <Download className="w-3 h-3 text-white" />
                      PDF
                    </button>
                  </div>
                </div>

                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-gray-200 text-gray-500 uppercase font-bold tracking-wider text-[9px]">
                      <th className={isCompact ? 'p-1.5' : 'p-2.5'}>Data</th>
                      <th className={isCompact ? 'p-1.5' : 'p-2.5'}>Colaborador</th>
                      <th className={isCompact ? 'p-1.5' : 'p-2.5'}>Embalagem</th>
                      <th className={isCompact ? 'p-1.5' : 'p-2.5'}>Quantidade</th>
                      <th className={isCompact ? 'p-1.5' : 'p-2.5'}>Intervalo</th>
                      <th className={isCompact ? 'p-1.5' : 'p-2.5'}>Tempo</th>
                      <th className={isCompact ? 'p-1.5' : 'p-2.5'}>Eficiência</th>
                      <th className={`${isCompact ? 'p-1.5' : 'p-2.5'} text-right`}>Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedRows.map(row => {
                      const unitMeta = EMBALAGENS_CONFIG[row.embalagem]?.metaSec || 240;
                      const expectedSec = unitMeta * (Number(row.quantidade) || 1);
                      const spentSec = timeToSec(row.duracao);
                      const eff = spentSec > 0 ? Math.round((expectedSec / spentSec) * 100) : 100;

                      return (
                        <tr 
                          key={row._docId} 
                          onClick={() => setSelectedRowId(row._docId || null)}
                          className={`hover:bg-slate-50/50 cursor-pointer transition-colors group ${selectedRowId === row._docId ? 'bg-blue-500/10 border-l-2 border-l-[#1e56f0]' : ''}`}
                        >
                          <td className={`${isCompact ? 'p-1.5' : 'p-2.5'} font-semibold text-gray-400`}>{row.data}</td>
                          <td className={`${isCompact ? 'p-1.5' : 'p-2.5'} font-bold text-slate-800`}>{row.operador || '—'}</td>
                          <td className={`${isCompact ? 'p-1.5' : 'p-2.5'} font-semibold text-gray-500`}>{row.embalagem}</td>
                          <td className={`${isCompact ? 'p-1.5' : 'p-2.5'} font-bold text-[#1e56f0]`}>{row.quantidade} SKU</td>
                          <td className={`${isCompact ? 'p-1.5' : 'p-2.5'} text-gray-400`}>{row.inicio} - {row.fim}</td>
                          <td className={`${isCompact ? 'p-1.5' : 'p-2.5'} font-mono text-slate-700 font-semibold`}>{row.duracao}</td>
                          <td className={isCompact ? 'p-1.5' : 'p-2.5'}>
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${eff >= 100 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                              {eff}%
                            </span>
                          </td>
                          <td className={`${isCompact ? 'p-1.5' : 'p-2.5'} text-right`}>
                            <button
                               onClick={(e) => { e.stopPropagation(); handleDeleteRow(row._docId || ''); }}
                              className="p-1.5 text-gray-400 hover:text-rose-500 rounded hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-none bg-transparent"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {paginatedRows.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-gray-400 font-semibold">Nenhum registro encontrado</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-4 text-xs text-gray-400">
                <span>
                  Mostrando <strong>{paginatedRows.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</strong> a <strong>{Math.min(currentPage * itemsPerPage, tableFilteredRows.length)}</strong> de <strong>{tableFilteredRows.length}</strong> registros
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-1 rounded bg-white border border-gray-200 disabled:opacity-40 cursor-pointer text-gray-500"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-bold text-slate-700 px-2">Página {currentPage} de {totalPages}</span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1 rounded bg-white border border-gray-200 disabled:opacity-40 cursor-pointer text-gray-500"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Painel lateral direito (450px) -> lg:col-span-4 */}
            <div className={`bg-white border border-gray-200 rounded-xl lg:col-span-4 flex flex-col justify-between shadow-sm transition-all ${isCompact ? 'p-3 min-h-[300px]' : 'p-5 min-h-[360px]'}`}>
              <div>
                <h3 className="font-sans font-black text-xs uppercase text-[#032b5e] tracking-wider border-b border-gray-100 pb-2 mb-3">
                  Cálculos Automáticos
                </h3>
                
                {selectedRowDetails ? (
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs py-1 border-b border-gray-100">
                      <span className="text-gray-400 font-bold uppercase text-[10px]">Tempo Esperado (Meta)</span>
                      <span className="font-bold font-mono text-slate-700">{selectedRowDetails.expected}</span>
                    </div>
                    <div className="flex justify-between text-xs py-1 border-b border-gray-100">
                      <span className="text-gray-400 font-bold uppercase text-[10px]">Tempo Gasto (Real)</span>
                      <span className="font-bold font-mono text-slate-700">{selectedRowDetails.spent}</span>
                    </div>
                    <div className="flex justify-between text-xs py-1 border-b border-gray-100">
                      <span className="text-gray-400 font-bold uppercase text-[10px]">Diferença</span>
                      <div className="flex items-center gap-1">
                        <span className={`font-bold font-mono ${selectedRowDetails.diffPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {selectedRowDetails.diffPositive ? '-' : '+'}{selectedRowDetails.diff}
                        </span>
                        <span className={`w-2 h-2 rounded-full ${selectedRowDetails.diffPositive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      </div>
                    </div>
                    <div className="flex justify-between text-xs py-1 border-b border-gray-100">
                      <span className="text-gray-400 font-bold uppercase text-[10px]">Eficiência Calculada</span>
                      <span className={`font-bold ${selectedRowDetails.efficiency >= 100 ? 'text-emerald-500' : 'text-rose-500'}`}>{selectedRowDetails.efficiency}%</span>
                    </div>
                    <div className="flex justify-between text-xs py-1 border-b border-gray-100">
                      <span className="text-gray-400 font-bold uppercase text-[10px]">SKUs por Hora</span>
                      <span className="font-bold text-[#1e56f0]">{selectedRowDetails.caixasHora} SKU/h</span>
                    </div>
                    <div className="flex justify-between text-xs py-1 border-b border-gray-100">
                      <span className="text-gray-400 font-bold uppercase text-[10px]">Tempo Médio Real</span>
                      <span className="font-bold font-mono text-slate-700">{selectedRowDetails.tempoMedioUnit}</span>
                    </div>
                    {selectedRowDetails.row.motivoNaoBaterMeta && (
                      <div className="flex flex-col gap-1 text-xs py-1.5 border-b border-gray-100">
                        <span className="text-rose-500 font-bold uppercase text-[10px] flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Motivo de Não Bater Meta
                        </span>
                        <span className="font-bold text-slate-700 bg-rose-50/50 border border-rose-100 p-2 rounded-lg break-words">{selectedRowDetails.row.motivoNaoBaterMeta}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-12 text-center text-gray-400 text-xs font-bold uppercase">
                    Selecione um lançamento na tabela para auditar os cálculos em tempo real.
                  </div>
                )}
              </div>

              <div className="p-3.5 bg-blue-50 border border-blue-200/60 rounded-xl flex items-center gap-3 mt-4">
                <Info className="w-5 h-5 text-[#1e56f0] shrink-0" />
                <p className="text-[10px] text-blue-800 leading-normal font-bold uppercase">
                  Os valores acima representam o cálculo do posto de trabalho e são atualizados de forma autônoma pelo sistema de B.I.
                </p>
              </div>
            </div>

          </section>

        </div>
      )}

      {activeSubTab === 'boarda3' && (
        <A3BoardComponent user={user} empresa={empresa} dashboard="repack" />
      )}

      {/* REMAINDER OF INLINE A3 BOARD REMOVED */}
      {false && activeBoard && (
        <section className="space-y-6 animate-fade-in text-slate-800">
          {/* ── BARRA DE CONTROLE DO QUADRO A3 ── */}
          <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
              <label className="text-gray-500 uppercase font-black text-[10px] tracking-wider shrink-0 mt-1 sm:mt-0">
                Selecione o Quadro:
              </label>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={activeBoard._docId || 'seed-board-1'}
                  onChange={(e) => {
                    const selected = boards.find(b => b._docId === e.target.value);
                    if (selected) {
                      setActiveBoard(selected);
                    } else if (e.target.value === 'seed-board-1') {
                      setActiveBoard(fallbackSeedBoard);
                    }
                  }}
                  className="bg-[#f8fafc] border border-gray-200 text-[#032b5e] font-sans font-bold text-xs rounded-xl px-3 py-2 focus:border-[#032b5e] outline-none min-w-[200px] max-w-full"
                >
                  <option value="seed-board-1">💡 Exemplo: {fallbackSeedBoard.titulo}</option>
                  {boards.map(b => (
                    <option key={b._docId} value={b._docId}>
                      📋 {b.titulo}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={activeBoard.titulo}
                  onChange={(e) => updateField('titulo', e.target.value)}
                  placeholder="Título do quadro..."
                  className="bg-white border border-gray-200 text-slate-800 font-sans font-bold text-xs rounded-xl px-3 py-2 focus:border-[#032b5e] outline-none flex-1 max-w-[250px]"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleCreateNewBoard}
                className="px-3.5 py-2 bg-[#032b5e] hover:bg-[#021f44] text-white font-sans font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer border-none transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" /> Novo Quadro
              </button>

              <button
                type="button"
                onClick={handleSaveBoard}
                disabled={savingBoard}
                className={`px-3.5 py-2 text-white font-sans font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer border-none transition-all shadow-sm ${
                  boardSaveStatus === 'success' 
                    ? 'bg-emerald-500 hover:bg-emerald-600' 
                    : boardSaveStatus === 'error' 
                      ? 'bg-rose-500 hover:bg-rose-600' 
                      : 'bg-[#1e56f0] hover:bg-[#113fa9]'
                }`}
              >
                <Save className="w-4 h-4" /> 
                {savingBoard ? 'Salvando...' : boardSaveStatus === 'success' ? 'Salvo!' : boardSaveStatus === 'error' ? 'Erro ao Salvar' : 'Salvar Quadro'}
              </button>

              <button
                type="button"
                onClick={handleDeleteBoard}
                className="px-3.5 py-2 bg-white hover:bg-rose-50 border border-gray-200 text-rose-600 font-sans font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Trash2 className="w-4 h-4" /> Excluir
              </button>
            </div>
          </div>

          {/* ── HEADER DE PASSOS DO PROCESSO ── */}
          <div className="bg-white border border-gray-200/80 p-4 rounded-2xl shadow-sm flex flex-col xl:flex-row items-center justify-between gap-3 overflow-x-auto">
            {[
              {
                step: 1,
                numBg: 'bg-[#ef4444]',
                title: '1. IDENTIFICAR O PROBLEMA',
                titleColor: 'text-[#ef4444]',
                desc: 'Mapeamento e causas',
                icon: <Search className="w-4 h-4 text-white" />,
                iconBg: 'bg-[#ef4444]'
              },
              {
                step: 2,
                numBg: 'bg-[#f5a623]',
                title: '2. QUADRO DE AÇÕES',
                titleColor: 'text-[#f5a623]',
                desc: 'Definir contramedidas',
                icon: <Zap className="w-4 h-4 text-white" />,
                iconBg: 'bg-[#f5a623]'
              },
              {
                step: 3,
                numBg: 'bg-[#1e56f0]',
                title: '3. ACOMPANHAR AÇÕES',
                titleColor: 'text-[#1e56f0]',
                desc: 'Status e progresso',
                icon: <Calendar className="w-4 h-4 text-white" />,
                iconBg: 'bg-[#1e56f0]'
              },
              {
                step: 4,
                numBg: 'bg-[#22c55e]',
                title: '4. CONCLUIR & APRENDER',
                titleColor: 'text-[#22c55e]',
                desc: 'Padronização e SOP',
                icon: <Check className="w-4 h-4 text-white" />,
                iconBg: 'bg-[#22c55e]'
              },
              {
                step: 5,
                numBg: 'bg-[#8b5cf6]',
                title: '5. RESULTADOS DO PLANO',
                titleColor: 'text-[#8b5cf6]',
                desc: 'Impacto e indicadores',
                icon: <Trophy className="w-4 h-4 text-white" />,
                iconBg: 'bg-[#8b5cf6]'
              }
            ].map((item, idx) => (
              <React.Fragment key={item.step}>
                <button
                  type="button"
                  onClick={() => setCurrentA3Step(item.step)}
                  className={`flex items-start gap-2.5 flex-1 min-w-[190px] text-left border-none bg-transparent p-2 rounded-xl transition-all cursor-pointer ${currentA3Step === item.step ? 'ring-2 ring-[#032b5e]/20 bg-slate-50' : 'hover:bg-slate-50/50 opacity-75'}`}
                >
                  <div className="relative shrink-0">
                    <div className={`w-9 h-9 rounded-xl ${item.iconBg} flex items-center justify-center shadow-md transition-transform ${currentA3Step === item.step ? 'scale-105' : ''}`}>
                      {item.icon}
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <h4 className={`font-sans font-black text-[10px] tracking-tight ${item.titleColor} uppercase`}>
                      {item.title}
                    </h4>
                    <p className="text-[9px] text-gray-400 font-bold uppercase leading-tight">
                      {item.desc}
                    </p>
                  </div>
                </button>
                {idx < 4 && (
                  <div className="hidden xl:block text-gray-300 flex-shrink-0">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* ── PAINEL DO PASSO SELECIONADO ── */}
          <div className="grid grid-cols-1 gap-4">
            
            {/* ── COLUNA 1: DETALHES DO PROBLEMA ── */}
            {currentA3Step === 1 && (
              <div className="bg-white rounded-2xl border-t-4 border-t-rose-500 border-x border-b border-gray-200 shadow-sm p-5 flex flex-col justify-between min-h-[500px] space-y-4 animate-fade-in w-full">
              <div className="space-y-4">
                <div className="border-b border-gray-100 pb-2">
                  <h3 className="font-sans font-black text-xs uppercase text-rose-500 tracking-wider">
                    1. Detalhes do Problema
                  </h3>
                  <p className="text-[9px] text-gray-400 font-semibold uppercase">Mapeamento e evidências</p>
                </div>

                <div className="space-y-1">
                  <label className="text-gray-500 uppercase font-black text-[9px] tracking-wider block">
                    Descrição do Problema
                  </label>
                  <textarea
                    value={activeBoard.problemaDesc}
                    onChange={(e) => updateField('problemaDesc', e.target.value)}
                    placeholder="Descreva o problema identificado de forma clara e objetiva..."
                    className="w-full border border-gray-200 text-slate-800 text-xs rounded-xl p-2.5 h-24 focus:border-rose-500 bg-white outline-none resize-none transition-all shadow-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-gray-500 uppercase font-black text-[9px] tracking-wider block">
                    Impacto do Problema
                  </label>
                  <textarea
                    value={activeBoard.problemaImpacto}
                    onChange={(e) => updateField('problemaImpacto', e.target.value)}
                    placeholder="Qual o impacto nas rotas, carregamento, perdas ou custos?"
                    className="w-full border border-gray-200 text-slate-800 text-xs rounded-xl p-2.5 h-24 focus:border-rose-500 bg-white outline-none resize-none transition-all shadow-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-gray-500 uppercase font-black text-[9px] tracking-wider block">
                    Causa Raiz
                  </label>
                  <textarea
                    value={activeBoard.problemaCausa}
                    onChange={(e) => updateField('problemaCausa', e.target.value)}
                    placeholder="Qual a causa raiz? (Use 5 porquês, Ishikawa...)"
                    className="w-full border border-gray-200 text-slate-800 text-xs rounded-xl p-2.5 h-24 focus:border-rose-500 bg-white outline-none resize-none transition-all shadow-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-gray-500 uppercase font-black text-[9px] tracking-wider block">
                    Evidências / Dados
                  </label>
                  <textarea
                    value={activeBoard.problemaEvidencias}
                    onChange={(e) => updateField('problemaEvidencias', e.target.value)}
                    placeholder="Insira dados, fotos, links de relatórios ou indicadores..."
                    className="w-full border border-gray-200 text-slate-800 text-xs rounded-xl p-2.5 h-24 focus:border-rose-500 bg-white outline-none resize-none transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="bg-rose-500/5 border border-rose-500/10 p-3.5 rounded-xl flex items-start gap-2.5">
                <Target className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-sans font-black text-[10px] text-rose-600 uppercase">FOCO</h4>
                  <p className="text-[9px] text-rose-900/80 leading-normal font-bold uppercase">
                    Ter clareza absoluta do problema é o primeiro passo para resolver.
                  </p>
                </div>
              </div>
            </div>
            )}

            {/* ── COLUNA 2: PLANO DE AÇÃO ── */}
            {currentA3Step === 2 && (
              <div className="bg-white rounded-2xl border-t-4 border-t-amber-500 border-x border-b border-gray-200 shadow-sm p-5 flex flex-col justify-between min-h-[500px] space-y-4 animate-fade-in w-full">
              <div className="space-y-4">
                <div className="border-b border-gray-100 pb-2">
                  <h3 className="font-sans font-black text-xs uppercase text-amber-500 tracking-wider">
                    2. Plano de Ação
                  </h3>
                  <p className="text-[9px] text-gray-400 font-semibold uppercase">Contramedidas definidas</p>
                </div>

                <div className="space-y-2">
                  <label className="text-gray-500 uppercase font-black text-[9px] tracking-wider block">
                    Ações Corretivas
                  </label>
                  
                  <div className="space-y-3">
                    {activeBoard.actions.map((act, index) => (
                      <div key={index} className="bg-slate-50 p-2 rounded-xl border border-gray-200/80 space-y-1.5">
                        <span className="text-[9px] font-black text-amber-600 block">AÇÃO #{index + 1}</span>
                        <input
                          type="text"
                          value={act.acao}
                          onChange={(e) => updateAction(index, 'acao', e.target.value)}
                          placeholder="O que fazer?"
                          className="w-full bg-white border border-gray-200 text-slate-800 text-[11px] rounded-lg p-1.5 focus:border-amber-500 outline-none"
                        />
                        <div className="grid grid-cols-2 gap-1.5">
                          <input
                            type="text"
                            value={act.responsavel}
                            onChange={(e) => updateAction(index, 'responsavel', e.target.value)}
                            placeholder="Quem?"
                            className="w-full bg-white border border-gray-200 text-slate-800 text-[10px] rounded-lg p-1.5 focus:border-amber-500 outline-none"
                          />
                          <input
                            type="text"
                            value={act.prazo}
                            onChange={(e) => updateAction(index, 'prazo', e.target.value)}
                            placeholder="Prazo (dd/mm)"
                            className="w-full bg-white border border-gray-200 text-slate-800 text-[10px] rounded-lg p-1.5 focus:border-amber-500 outline-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-gray-500 uppercase font-black text-[9px] tracking-wider block">
                    Recursos Necessários
                  </label>
                  <textarea
                    value={activeBoard.recursos}
                    onChange={(e) => updateField('recursos', e.target.value)}
                    placeholder="Quais verbas, ferramentas ou permissões serão requeridas?"
                    className="w-full border border-gray-200 text-slate-800 text-xs rounded-xl p-2.5 h-20 focus:border-amber-500 bg-white outline-none resize-none transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="bg-amber-500/5 border border-amber-500/10 p-3.5 rounded-xl flex items-start gap-2.5">
                <Star className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-sans font-black text-[10px] text-amber-600 uppercase">DISCIPLINA</h4>
                  <p className="text-[9px] text-amber-900/80 leading-normal font-bold uppercase">
                    Planejar bem é definir o caminho para gerar resultados consistentes.
                  </p>
                </div>
              </div>
            </div>
            )}

            {/* ── COLUNA 3: ACOMPANHAMENTO DAS AÇÕES ── */}
            {currentA3Step === 3 && (
              <div className="bg-white rounded-2xl border-t-4 border-t-blue-500 border-x border-b border-gray-200 shadow-sm p-5 flex flex-col justify-between min-h-[500px] space-y-4 animate-fade-in w-full">
              <div className="space-y-4">
                <div className="border-b border-gray-100 pb-2">
                  <h3 className="font-sans font-black text-xs uppercase text-blue-500 tracking-wider">
                    3. Acompanhar Ações
                  </h3>
                  <p className="text-[9px] text-gray-400 font-semibold uppercase">Execução e Status do Plano</p>
                </div>

                <div className="space-y-3">
                  <label className="text-gray-500 uppercase font-black text-[9px] tracking-wider block">
                    Status e Progresso
                  </label>
                  
                  <div className="space-y-3">
                    {activeBoard.actions.map((act, index) => (
                      <div key={index} className="bg-slate-50 p-2 rounded-xl border border-gray-200/80 space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-black text-blue-600">AÇÃO #{index + 1}</span>
                          <span className="text-[9px] font-mono font-bold text-gray-400">
                            {act.prazo ? `Até ${act.prazo}` : 'Sem prazo'}
                          </span>
                        </div>
                        <p className="text-[11px] font-bold text-slate-800 truncate" title={act.acao}>
                          {act.acao || '(Ação não definida)'}
                        </p>
                        <p className="text-[9px] font-semibold text-gray-400">
                          Resp: {act.responsavel || '—'}
                        </p>
                        <div className="grid grid-cols-2 gap-1.5 pt-1">
                          <select
                            value={act.status}
                            onChange={(e) => updateAction(index, 'status', e.target.value)}
                            className="bg-white border border-gray-200 text-[#0f172a] text-[10px] font-bold rounded-lg p-1.5 focus:border-blue-500 outline-none"
                          >
                            <option value="Pendente">🟡 Pendente</option>
                            <option value="Em Andamento">🔵 Em Andamento</option>
                            <option value="Bloqueado">🔴 Bloqueado</option>
                            <option value="Concluído">🟢 Concluído</option>
                          </select>
                          <select
                            value={act.pct}
                            onChange={(e) => updateAction(index, 'pct', Number(e.target.value))}
                            className="bg-white border border-gray-200 text-[#0f172a] text-[10px] font-bold rounded-lg p-1.5 focus:border-blue-500 outline-none"
                          >
                            {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(p => (
                              <option key={p} value={p}>{p}%</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-gray-500 uppercase font-black text-[9px] tracking-wider block">
                    Comentários / Observações
                  </label>
                  <textarea
                    value={activeBoard.comentarios}
                    onChange={(e) => updateField('comentarios', e.target.value)}
                    placeholder="Registre aqui os principais pontos, riscos resolvidos e decisões..."
                    className="w-full border border-gray-200 text-slate-800 text-xs rounded-xl p-2.5 h-20 focus:border-blue-500 bg-white outline-none resize-none transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="bg-blue-500/5 border border-blue-500/10 p-3.5 rounded-xl flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-sans font-black text-[10px] text-blue-600 uppercase">ROTINA</h4>
                  <p className="text-[9px] text-blue-900/80 leading-normal font-bold uppercase">
                    Acompanhar com frequência garante entrega e permite ajustes a tempo.
                  </p>
                </div>
              </div>
            </div>
            )}

            {/* ── COLUNA 4: CONCLUSÃO DAS AÇÕES ── */}
            {currentA3Step === 4 && (
              <div className="bg-white rounded-2xl border-t-4 border-t-emerald-500 border-x border-b border-gray-200 shadow-sm p-5 flex flex-col justify-between min-h-[500px] space-y-4 animate-fade-in w-full">
              <div className="space-y-4">
                <div className="border-b border-gray-100 pb-2">
                  <h3 className="font-sans font-black text-xs uppercase text-emerald-500 tracking-wider">
                    4. Concluir Ação
                  </h3>
                  <p className="text-[9px] text-gray-400 font-semibold uppercase">Resultados e Padronização</p>
                </div>

                <div className="space-y-1">
                  <label className="text-gray-500 uppercase font-black text-[9px] tracking-wider block">
                    Ações Concluídas
                  </label>
                  <textarea
                    value={activeBoard.concluidas}
                    onChange={(e) => updateField('concluidas', e.target.value)}
                    placeholder="Registre quais ações foram dadas como concluídas operacionais..."
                    className="w-full border border-gray-200 text-slate-800 text-xs rounded-xl p-2.5 h-36 focus:border-emerald-500 bg-white outline-none resize-none transition-all shadow-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-gray-500 uppercase font-black text-[9px] tracking-wider block">
                    Principais Aprendizados
                  </label>
                  <textarea
                    value={activeBoard.aprendizados}
                    onChange={(e) => updateField('aprendizados', e.target.value)}
                    placeholder="Quais foram as lições aprendidas durante este processo de resolução?"
                    className="w-full border border-gray-200 text-slate-800 text-xs rounded-xl p-2.5 h-28 focus:border-emerald-500 bg-white outline-none resize-none transition-all shadow-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-gray-500 uppercase font-black text-[9px] tracking-wider block">
                    Padronização (SOP/LPP)
                  </label>
                  <textarea
                    value={activeBoard.padronizacao}
                    onChange={(e) => updateField('padronizacao', e.target.value)}
                    placeholder="Como vamos garantir que este problema nunca mais volte a ocorrer?"
                    className="w-full border border-gray-200 text-slate-800 text-xs rounded-xl p-2.5 h-28 focus:border-emerald-500 bg-white outline-none resize-none transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="bg-emerald-500/5 border border-emerald-500/10 p-3.5 rounded-xl flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-sans font-black text-[10px] text-emerald-600 uppercase">DONO</h4>
                  <p className="text-[9px] text-emerald-900/80 leading-normal font-bold uppercase">
                    Concluir é validar, aprender e garantir que o ganho fique.
                  </p>
                </div>
              </div>
            </div>
            )}

            {/* ── COLUNA 5: RESULTADOS E IMPACTOS ── */}
            {currentA3Step === 5 && (
              <div className="bg-white rounded-2xl border-t-4 border-t-purple-500 border-x border-b border-gray-200 shadow-sm p-5 flex flex-col justify-between min-h-[500px] space-y-4 animate-fade-in w-full">
              <div className="space-y-4">
                <div className="border-b border-gray-100 pb-2">
                  <h3 className="font-sans font-black text-xs uppercase text-purple-500 tracking-wider">
                    5. Resultados e Impactos
                  </h3>
                  <p className="text-[9px] text-gray-400 font-semibold uppercase">Mensuração dos ganhos</p>
                </div>

                <div className="space-y-1">
                  <label className="text-gray-500 uppercase font-black text-[9px] tracking-wider block">
                    Resultados Alcançados
                  </label>
                  <textarea
                    value={activeBoard.resultadosDesc}
                    onChange={(e) => updateField('resultadosDesc', e.target.value)}
                    placeholder="Descreva de forma geral o resultado final do plano de ação..."
                    className="w-full border border-gray-200 text-slate-800 text-xs rounded-xl p-2.5 h-24 focus:border-purple-500 bg-white outline-none resize-none transition-all shadow-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-gray-500 uppercase font-black text-[9px] tracking-wider block">
                    Indicadores Impactados
                  </label>
                  
                  <div className="space-y-2.5">
                    {activeBoard.indicadores.map((ind, indIdx) => (
                      <div key={indIdx} className="bg-slate-50 p-2 rounded-xl border border-gray-200/80 space-y-1">
                        <span className="text-[9px] font-black text-purple-600 block">INDICADOR #{indIdx + 1}</span>
                        <input
                          type="text"
                          value={ind.indicador}
                          onChange={(e) => updateIndicador(indIdx, 'indicador', e.target.value)}
                          placeholder="Nome do indicador (ex: eficiência)"
                          className="w-full bg-white border border-gray-200 text-slate-800 text-[10px] rounded-lg p-1 focus:border-purple-500 outline-none"
                        />
                        <div className="grid grid-cols-3 gap-1">
                          <input
                            type="text"
                            value={ind.antes}
                            onChange={(e) => updateIndicador(indIdx, 'antes', e.target.value)}
                            placeholder="Antes"
                            className="w-full bg-white border border-gray-200 text-slate-800 text-[10px] rounded-lg p-1 focus:border-purple-500 outline-none text-center"
                          />
                          <input
                            type="text"
                            value={ind.depois}
                            onChange={(e) => updateIndicador(indIdx, 'depois', e.target.value)}
                            placeholder="Depois"
                            className="w-full bg-white border border-gray-200 text-slate-800 text-[10px] rounded-lg p-1 focus:border-purple-500 outline-none text-center"
                          />
                          <div className="w-full bg-purple-50 border border-purple-200/50 text-purple-700 text-[9px] font-black rounded-lg p-1 flex items-center justify-center font-mono">
                            {ind.variacao || 'Var'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-gray-500 uppercase font-black text-[9px] tracking-wider block">
                    Impacto no Negócio
                  </label>
                  <textarea
                    value={activeBoard.impactoNegocio}
                    onChange={(e) => updateField('impactoNegocio', e.target.value)}
                    placeholder="Quais foram as reduções de custos, horas extras ou gargalos geradas?"
                    className="w-full border border-gray-200 text-slate-800 text-xs rounded-xl p-2.5 h-20 focus:border-purple-500 bg-white outline-none resize-none transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="bg-purple-500/5 border border-purple-500/10 p-3.5 rounded-xl flex items-start gap-2.5">
                <Trophy className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-sans font-black text-[10px] text-purple-600 uppercase">RESULTADOS</h4>
                  <p className="text-[9px] text-purple-900/80 leading-normal font-bold uppercase">
                    Medir os resultados é reconhecer o esforço e gerar valor para o negócio.
                  </p>
                </div>
              </div>
            </div>
            )}

          </div>

          {/* ── BOTÕES DE NAVEGAÇÃO DOS PASSOS E REVISÃO DE ROTINA ── */}
          <div className="bg-white border border-gray-200 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <button
              type="button"
              onClick={() => setCurrentA3Step(p => Math.max(1, p - 1))}
              disabled={currentA3Step === 1}
              className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-gray-200 rounded-xl text-slate-700 font-sans font-bold text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all w-full md:w-auto justify-center animate-fade-in"
            >
              <ChevronLeft className="w-4 h-4" /> Passo Anterior
            </button>

            <span className="text-gray-400 font-sans font-black text-[10px] uppercase text-center shrink-0">
              Visualizando passo <strong className="text-[#032b5e]">{currentA3Step} de 5</strong>
            </span>

            {currentA3Step < 5 ? (
              <button
                type="button"
                onClick={() => setCurrentA3Step(p => Math.min(5, p + 1))}
                className="px-4 py-2.5 bg-[#032b5e] hover:bg-[#021f44] text-white font-sans font-bold text-xs flex items-center gap-2 cursor-pointer transition-all border-none rounded-xl w-full md:w-auto justify-center animate-fade-in"
              >
                Próximo Passo <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSaveBoard}
                disabled={savingBoard}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-sans font-bold text-xs flex items-center gap-2 cursor-pointer transition-all border-none rounded-xl w-full md:w-auto justify-center animate-fade-in"
              >
                <Save className="w-4 h-4" /> {savingBoard ? 'Salvando...' : 'Salvar e Concluir'}
              </button>
            )}
          </div>

          {/* ── PRÓXIMOS PASSOS E REVISÃO DE ROTINA (SEMPRE VISÍVEIS ABAIXO PARA MELHOR ACOMPANHAMENTO) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-8 bg-white border border-gray-200 p-4 rounded-2xl shadow-sm space-y-2">
              <label className="text-gray-500 uppercase font-black text-[10px] tracking-wider block">
                Próximos Passos recomendados para consolidar
              </label>
              <textarea
                value={activeBoard.proximosPassos}
                onChange={(e) => updateField('proximosPassos', e.target.value)}
                placeholder="O que precisa ser feito agora? Replicar melhorias? Nova cronometragem?"
                className="w-full border border-gray-200 text-slate-800 text-xs rounded-xl p-3 h-20 focus:border-[#032b5e] bg-white outline-none resize-none transition-all shadow-sm"
              />
            </div>

            <div className="lg:col-span-4 bg-white border border-gray-200 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
              <div className="space-y-1.5">
                <label className="text-gray-500 uppercase font-black text-[10px] tracking-wider block">
                  Data da Revisão de Rotina
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={activeBoard.dataRevisao}
                    onChange={(e) => updateField('dataRevisao', e.target.value)}
                    className="w-full bg-[#f8fafc] border border-gray-200 text-[#032b5e] font-sans font-bold text-xs rounded-xl px-3 py-2.5 focus:border-[#032b5e] outline-none"
                  />
                </div>
              </div>
              <p className="text-[9px] text-gray-400 font-bold uppercase leading-normal mt-2">
                A data de revisão serve para reavaliar a sustentabilidade da melhoria no Matinal de Rotina Operacional.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ── MODAL: NOVO REGISTRO / CRONÔMETRO ── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-gray-200 p-6 rounded-xl w-full max-w-[500px] shadow-2xl relative animate-scale-up">
            <h3 className="font-sans font-black text-base uppercase text-[#032b5e] tracking-wider border-b border-gray-100 pb-2 mb-4">Lançar Produção Repack</h3>
            
            {/* Stopwatch Section */}
            <div className="bg-slate-50 border border-gray-200 p-3 rounded-xl text-center mb-4">
              <span className="text-[9px] uppercase font-black tracking-widest text-gray-400 block">Cronômetro de Operação</span>
              <div className="text-3xl font-mono font-extrabold text-[#032b5e] my-1">
                {formatSecToHMS(timerSeconds)}
              </div>
              <div className="flex justify-center gap-2 mt-2">
                {!timerActive ? (
                  <button
                    type="button"
                    onClick={handleStartStopwatch}
                    className="px-3 py-1.5 bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer hover:bg-emerald-600 transition-colors border-none"
                  >
                    <Play className="w-3.5 h-3.5 text-white" /> Iniciar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStopStopwatch}
                    className="px-3 py-1.5 bg-rose-500 text-white font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer hover:bg-rose-600 transition-colors border-none"
                  >
                    <Square className="w-3.5 h-3.5 text-white" /> Parar
                  </button>
                )}
              </div>
            </div>

            <form onSubmit={handleRegister} className="space-y-3.5 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-gray-400 uppercase font-bold text-[9px] tracking-wider">Embalagem</label>
                <select
                  value={formEmbalagem}
                  onChange={(e) => setFormEmbalagem(e.target.value)}
                  className="bg-white border border-gray-200 text-slate-800 rounded-lg p-2 focus:border-[#032b5e] outline-none"
                >
                  {Object.keys(EMBALAGENS_CONFIG).map(k => (
                    <option key={k} value={k}>{EMBALAGENS_CONFIG[k].label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-gray-400 uppercase font-bold text-[9px] tracking-wider">Quantidade (SKU)</label>
                  <input
                    type="number"
                    value={formQuantidade}
                    onChange={(e) => setFormQuantidade(Math.max(1, Number(e.target.value)))}
                    className="bg-white border border-gray-200 text-slate-800 rounded-lg p-2 focus:border-[#032b5e] outline-none"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-gray-400 uppercase font-bold text-[9px] tracking-wider">Operador</label>
                  <input
                    type="text"
                    value={formOperador}
                    onChange={(e) => setFormOperador(e.target.value)}
                    className="bg-white border border-gray-200 text-slate-800 rounded-lg p-2 focus:border-[#032b5e] outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-gray-400 uppercase font-bold text-[9px] tracking-wider">Hora Inicial</label>
                  <input
                    type="text"
                    placeholder="HH:MM"
                    value={formInicio}
                    onChange={(e) => setFormInicio(e.target.value)}
                    className="bg-white border border-gray-200 text-slate-800 rounded-lg p-2 font-mono focus:border-[#032b5e] outline-none"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-gray-400 uppercase font-bold text-[9px] tracking-wider">Hora Final</label>
                  <input
                    type="text"
                    placeholder="HH:MM"
                    value={formFim}
                    onChange={(e) => setFormFim(e.target.value)}
                    className="bg-white border border-gray-200 text-slate-800 rounded-lg p-2 font-mono focus:border-[#032b5e] outline-none"
                    required
                  />
                </div>
              </div>

              {isFormAboveMeta && (
                <div className="flex flex-col gap-1 p-3 bg-rose-50 border border-rose-200 rounded-lg animate-fadeIn">
                  <label className="text-rose-500 uppercase font-bold text-[9px] tracking-wider flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Motivo de Não Bater a Meta *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Embalagem danificada, queda de energia, etc..."
                    value={formMotivoNaoBaterMeta}
                    onChange={(e) => setFormMotivoNaoBaterMeta(e.target.value)}
                    className="bg-white border border-rose-200 text-slate-800 rounded-lg p-2 focus:border-rose-500 outline-none text-xs"
                    required
                  />
                </div>
              )}

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="submit"
                  className="flex-1 h-10 bg-[#032b5e] hover:bg-[#021f44] text-white font-sans font-bold rounded-lg uppercase tracking-wider cursor-pointer border-none transition-all"
                >
                  Registrar Produção
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 h-10 bg-slate-50 border border-gray-200 text-slate-700 hover:bg-gray-100 font-bold rounded-lg uppercase tracking-wider cursor-pointer transition-all"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
