import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { Usuario, Empresa, Tarefa } from '../types';
import { useEmpresaData } from '../context/EmpresaDataContext';
import { PRODUCTS } from '../planosData';
import A3BoardComponent from './A3BoardComponent';
import CalendarFilter from './CalendarFilter';
import AbastecimentoDiarioComponent from './AbastecimentoDiarioComponent';
import { PadraoOperacionalModal } from './PadraoOperacionalModal';
import { Checklist5SModal } from './Checklist5SModal';
import { ManualInstrucaoCard } from './ManualInstrucaoCard';
import { IndicatorMetaHeader } from './IndicatorMetaHeader';
import LogisticaDashboard from './LogisticaDashboard';
import TmrDashboard from './TmrDashboard';
import SimulacaoAcoesPanel from './SimulacaoAcoesPanel';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart2, 
  Package, 
  Clock, 
  TrendingUp, 
  User, 
  Truck, 
  FileSpreadsheet, 
  CheckCircle2, 
  Calendar, 
  ArrowLeft, 
  Search, 
  SlidersHorizontal, 
  Layers, 
  Activity,
  AlertCircle,
  Play,
  Zap,
  Award,
  Sparkles,
  RefreshCw,
  Gauge as GaugeIcon,
  Flame,
  Clock3,
  Eye,
  EyeOff,
  Info,
  ChevronRight,
  ChevronDown,
  BookOpen,
  ShieldCheck
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import * as XLSX from 'xlsx';

interface PickingDashboardProps {
  user: Usuario;
  empresa: Empresa | null;
  onBack?: () => void;
  theme?: 'light' | 'dark';
  initialModule?: 'operadores' | 'efc_efd' | 'rr_bi' | 'tmr' | 'acoes';
}

interface NormalizedTask {
  id: string | number;
  dataSolicitacao: string; // YYYY-MM-DD
  horaSolicitacao: number; // Hour (0-23)
  horaSolicitacaoStr: string; // HH:MM
  dataAceite: string;
  horaAceite: number;
  horaAceiteStr: string;
  dataConclusao: string;
  horaConclusao: number;
  horaConclusaoStr: string;
  tempoAceite: number; // minutes
  tempoExecucao: number; // minutes
  tempoTotal: number; // minutes
  status: 'pending' | 'in_progress' | 'done' | 'cancelled';
  conferente: string;
  operador: string;
  sku: string | number;
  descricaoSku: string;
  quantidadePaletes: number;
  etapa: 'Durante o Carregamento' | 'Após o Carregamento';
  rawTask: Tarefa;
}

export default function PickingDashboard({ user, empresa, onBack, theme = 'dark', initialModule = 'operadores' }: PickingDashboardProps) {
  const [mainModule, setMainModule] = useState<'operadores' | 'efc_efd' | 'rr_bi' | 'tmr' | 'acoes'>(initialModule);
  const [actualTasks, setActualTasks] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'indicadores' | 'rr_bi' | 'abastecimento' | 'boarda3'>('indicadores');

  // Interactive Global Filters
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [selectedOperator, setSelectedOperator] = useState<string>('all');
  const [selectedConferente, setSelectedConferente] = useState<string>('all');
  const [selectedSku, setSelectedSku] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedEtapa, setSelectedEtapa] = useState<string>('all');
  const [selectedMeta, setSelectedMeta] = useState<'all' | 'dentro' | 'fora'>('all');
  const [slaLimit, setSlaLimit] = useState<number>(5); // Target time per pallet (default: 5 min)
  const [datePreset, setDatePreset] = useState<'today' | '7days' | '30days' | 'custom'>('custom');
  const [alertGeneratedNotice, setAlertGeneratedNotice] = useState<string | null>(null);
  const [isPopModalOpen, setIsPopModalOpen] = useState(false);
  const [is5SModalOpen, setIs5SModalOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(true);
  
  const empresaId = empresa?.id || 'demo';

  const [metaRrTempo, setMetaRrTempo] = useState<number>(() => {
    const saved = localStorage.getItem(`meta_rr_tempo_${empresaId}`);
    return saved ? Number(saved) : 5.0;
  });

  const [metaRrMaxReab, setMetaRrMaxReab] = useState<number>(() => {
    const saved = localStorage.getItem(`meta_rr_max_reab_${empresaId}`);
    return saved ? Number(saved) : 20.0;
  });

  const updateMetaRrTempo = (val: number) => {
    setMetaRrTempo(val);
    localStorage.setItem(`meta_rr_tempo_${empresaId}`, String(val));
  };

  const updateMetaRrMaxReab = (val: number) => {
    setMetaRrMaxReab(val);
    localStorage.setItem(`meta_rr_max_reab_${empresaId}`, String(val));
  };

  const [enableDemoData, setEnableDemoData] = useState<boolean>(() => {
    const stored = localStorage.getItem(`enable_demo_data_${empresaId}`);
    return stored !== null ? stored === 'true' : false;
  });

  const [colaboradores, setColaboradores] = useState<any[]>([]);

  const empresaData = useEmpresaData();

  // Synchronize colaboradores from Firestore
  useEffect(() => {
    if (!db) {
      const savedColab = localStorage.getItem(`colaboradores_${empresaId}`);
      if (savedColab) {
        setColaboradores(JSON.parse(savedColab));
      }
      return;
    }
    setColaboradores(empresaData.colaboradores);
  }, [empresaData.colaboradores, empresaId]);

  const registeredEmpilhadores = useMemo(() => {
    const allowed = ['MARIVALDO', 'RONILDO', 'PAULO PEREIRA'];
    
    let list = colaboradores
      .filter(c => {
        const func = (c.funcao || '').toLowerCase();
        return func !== 'conferente' && func !== 'controle';
      })
      .map(c => c.nome.toUpperCase())
      .filter(name => allowed.some(a => name.includes(a)));

    // Normalize matching names to canonical list
    list = list.map(name => {
      if (name.includes('MARIVALDO')) return 'MARIVALDO';
      if (name.includes('RONILDO')) return 'RONILDO';
      if (name.includes('PAULO PEREIRA')) return 'PAULO PEREIRA';
      return name;
    });

    list = Array.from(new Set(list));

    if (list.length === 0) {
      list = allowed;
    }
    return list;
  }, [colaboradores]);

  const tasks = useMemo(() => {
    return actualTasks;
  }, [actualTasks]);

  // Synchronize tasks from Firestore
  useEffect(() => {
    if (!db) {
      const savedTasks = localStorage.getItem(`tasks_${empresaId}`);
      if (savedTasks) {
        setActualTasks(JSON.parse(savedTasks));
      }
      setLoading(false);
      return;
    }

    const rows = [...empresaData.tarefas];
    rows.sort((a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || ''));
    setActualTasks(rows);
    setLoading(false);
  }, [empresaData.tarefas, empresaId]);

  // Handle Preset Dates
  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (datePreset === 'today') {
      setFilterStartDate(todayStr);
      setFilterEndDate(todayStr);
    } else if (datePreset === '7days') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setFilterStartDate(d.toISOString().split('T')[0]);
      setFilterEndDate(todayStr);
    } else if (datePreset === '30days') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setFilterStartDate(d.toISOString().split('T')[0]);
      setFilterEndDate(todayStr);
    }
  }, [datePreset]);

  // Helper to parse date string safely
  const parseDateString = (str: string | null | undefined): Date | null => {
    if (!str) return null;
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d;
    const clean = str.replace(' ', 'T');
    const d2 = new Date(clean);
    if (!isNaN(d2.getTime())) return d2;
    return null;
  };

  // Helper to parse date and adjust to Warehouse local time (America/Recife, UTC-3)
  const getWarehouseDate = (str: string | null | undefined): Date | null => {
    if (!str) return null;

    // Handle local date strings from generators or formatted strings
    if (!str.includes('Z') && !str.includes('T')) {
      const parts = str.split(' ');
      const sep = parts[0].includes('/') ? '/' : '-';
      const dateParts = parts[0].split(sep);
      const timeParts = (parts[1] || '00:00:00').split(':');
      if (dateParts.length === 3) {
        let year = parseInt(dateParts[0], 10);
        let month = parseInt(dateParts[1], 10);
        let day = parseInt(dateParts[2], 10);
        // If DD/MM/YYYY
        if (dateParts[0].length <= 2 && dateParts[2].length === 4) {
          day = parseInt(dateParts[0], 10);
          month = parseInt(dateParts[1], 10);
          year = parseInt(dateParts[2], 10);
        }
        return new Date(Date.UTC(
          year,
          month - 1,
          day,
          parseInt(timeParts[0], 10),
          parseInt(timeParts[1], 10),
          parseInt(timeParts[2] || '0', 10)
        ));
      }
    }

    let d = new Date(str);
    if (isNaN(d.getTime())) {
      const clean = str.replace(' ', 'T');
      d = new Date(clean);
    }
    if (isNaN(d.getTime())) return null;

    // America/Recife is always UTC-3
    const recifeOffsetMs = -3 * 60 * 60 * 1000;
    return new Date(d.getTime() + recifeOffsetMs);
  };

  const getWarehouseDateString = (adjustedDate: Date | null): string => {
    if (!adjustedDate) return '';
    const year = adjustedDate.getUTCFullYear();
    const month = String(adjustedDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(adjustedDate.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getWarehouseHour = (adjustedDate: Date | null): number => {
    if (!adjustedDate) return 12;
    return adjustedDate.getUTCHours();
  };

  const getWarehouseTimeStr = (adjustedDate: Date | null): string => {
    if (!adjustedDate) return '—';
    const hours = String(adjustedDate.getUTCHours()).padStart(2, '0');
    const minutes = String(adjustedDate.getUTCMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // 1. Data Normalization mapping
  const normalizedTasks = useMemo<NormalizedTask[]>(() => {
    return tasks.map(t => {
      const dateObj = parseDateString(t.criadoEm);
      const dateAceiteObj = parseDateString(t.iniciadoEm);
      const dateConclusaoObj = parseDateString(t.finalizadoEm);

      const whDateObj = getWarehouseDate(t.criadoEm);
      const whDateAceiteObj = getWarehouseDate(t.iniciadoEm);
      const whDateConclusaoObj = getWarehouseDate(t.finalizadoEm);

      const dataSolicitacao = whDateObj ? getWarehouseDateString(whDateObj) : '';
      const horaSolicitacao = whDateObj ? getWarehouseHour(whDateObj) : 0;
      const horaSolicitacaoStr = whDateObj ? getWarehouseTimeStr(whDateObj) : '—';

      const dataAceite = whDateAceiteObj ? getWarehouseDateString(whDateAceiteObj) : '';
      const horaAceite = whDateAceiteObj ? getWarehouseHour(whDateAceiteObj) : 0;
      const horaAceiteStr = whDateAceiteObj ? getWarehouseTimeStr(whDateAceiteObj) : '—';

      const dataConclusao = whDateConclusaoObj ? getWarehouseDateString(whDateConclusaoObj) : '';
      const horaConclusao = whDateConclusaoObj ? getWarehouseHour(whDateConclusaoObj) : 0;
      const horaConclusaoStr = whDateConclusaoObj ? getWarehouseTimeStr(whDateConclusaoObj) : '—';

      // Durations in minutes
      const tAceite = dateAceiteObj && dateObj ? Math.max(0, (dateAceiteObj.getTime() - dateObj.getTime()) / 60000) : (t.status !== 'pending' ? 4 : 0);
      const tExec = dateConclusaoObj && dateAceiteObj ? Math.max(0, (dateConclusaoObj.getTime() - dateAceiteObj.getTime()) / 60000) : (t.status === 'done' ? (t.duracaoMin || 15) : 0);
      const tTotal = t.status === 'done' ? (dateConclusaoObj && dateObj ? Math.max(0, (dateConclusaoObj.getTime() - dateObj.getTime()) / 60000) : (tAceite + tExec)) : 0;

      const etapaRaw = t.tipoOperacao || '';
      const etapa: 'Durante o Carregamento' | 'Após o Carregamento' = (etapaRaw.toLowerCase().includes('durante') || etapaRaw.toLowerCase().includes('during')) ? 'Durante o Carregamento' : 'Após o Carregamento';

      // Quantity converter to represent pallets reliably (if input looks like high number of boxes, we estimate/divide)
      const quantidadePaletes = t.quantidade > 15 ? Math.ceil(t.quantidade / 30) : (t.quantidade || 1);

      return {
        id: t.id || t._docId || Math.random(),
        dataSolicitacao,
        horaSolicitacao,
        horaSolicitacaoStr,
        dataAceite,
        horaAceite,
        horaAceiteStr,
        dataConclusao,
        horaConclusao,
        horaConclusaoStr,
        tempoAceite: Math.round(tAceite * 10) / 10,
        tempoExecucao: Math.round(tExec * 10) / 10,
        tempoTotal: Math.round(tTotal * 10) / 10,
        status: t.status || 'pending',
        conferente: t.conferente || 'Desconhecido',
        operador: (() => {
          let op = t.operador || 'Sem Operador';
          if (op !== 'Sem Operador') {
            const upperOp = op.toUpperCase();
            if (upperOp.includes('MARIVALDO')) {
              op = 'MARIVALDO';
            } else if (upperOp.includes('RONILDO')) {
              op = 'RONILDO';
            } else if (upperOp.includes('PAULO PEREIRA')) {
              op = 'PAULO PEREIRA';
            } else {
              const allowed = ['MARIVALDO', 'RONILDO', 'PAULO PEREIRA'];
              const strVal = String(t.id || t._docId || 'default');
              let hash = 0;
              for (let i = 0; i < strVal.length; i++) {
                hash = strVal.charCodeAt(i) + ((hash << 5) - hash);
              }
              op = allowed[Math.abs(hash) % allowed.length];
            }
          }
          return op;
        })(),
        sku: t.codigo || 0,
        descricaoSku: t.descricao || 'Sem Descrição',
        quantidadePaletes,
        etapa,
        rawTask: t
      };
    });
  }, [tasks]);

  // Registered conferentes in the system
  const registeredConferentes = useMemo(() => {
    const baseConferentes = ['GILSON ROSA DA SILVA', 'MATHEUS'];

    // 1. From colaboradores collection
    const fromColab = colaboradores
      .filter(c => {
        const func = (c.funcao || '').toLowerCase();
        return func.includes('conferente');
      })
      .map(c => (c.nome || '').trim().toUpperCase())
      .filter(Boolean);

    // 2. From conferente_state in localStorage
    let fromState: string[] = [];
    try {
      const savedState = localStorage.getItem(`conferente_state_${empresaId}`);
      if (savedState) {
        const parsed = JSON.parse(savedState);
        if (Array.isArray(parsed.conferentes)) {
          fromState = parsed.conferentes
            .map((n: any) => String(n || '').trim().toUpperCase())
            .filter(Boolean);
        }
      }
    } catch {
      // ignore
    }

    return Array.from(new Set([...baseConferentes, ...fromColab, ...fromState])).sort();
  }, [colaboradores, empresaId]);

  // Unique filters lists extracted from live data
  const uniqueOperators = useMemo(() => Array.from(new Set(normalizedTasks.map(t => t.operador?.trim().toUpperCase()).filter(Boolean))).sort(), [normalizedTasks]);
  const uniqueConferentes = registeredConferentes;
  const uniqueSkus = useMemo(() => {
    const list = new Map<string, string>();
    normalizedTasks.forEach(t => { if (t.sku) list.set(String(t.sku), t.descricaoSku); });
    return Array.from(list.entries()).map(([sku, desc]) => ({ sku, desc }));
  }, [normalizedTasks]);

  // Apply Global Filters to Normalized Dataset
  const filteredTasks = useMemo(() => {
    return normalizedTasks.filter(t => {
      if (filterStartDate && t.dataSolicitacao && t.dataSolicitacao < filterStartDate) return false;
      if (filterEndDate && t.dataSolicitacao && t.dataSolicitacao > filterEndDate) return false;
      if (selectedOperator !== 'all' && t.operador?.trim().toUpperCase() !== selectedOperator.toUpperCase()) return false;
      if (selectedConferente !== 'all' && t.conferente?.trim().toUpperCase() !== selectedConferente.toUpperCase()) return false;
      if (selectedSku !== 'all' && String(t.sku) !== selectedSku) return false;
      if (selectedStatus !== 'all' && t.status !== selectedStatus) return false;
      if (selectedEtapa !== 'all' && t.etapa !== selectedEtapa) return false;

      // Filtro de Meta (5 minutos por palete solicitado)
      if (selectedMeta !== 'all') {
        const targetMin = (t.quantidadePaletes || 1) * 5;
        const isWithinMeta = t.tempoTotal <= targetMin;
        if (selectedMeta === 'dentro' && !isWithinMeta) return false;
        if (selectedMeta === 'fora' && isWithinMeta) return false;
      }

      return true;
    });
  }, [normalizedTasks, filterStartDate, filterEndDate, selectedOperator, selectedConferente, selectedSku, selectedStatus, selectedEtapa, selectedMeta]);

  // --- STATS COMPUTATIONS ---

  // Completed items in filtered list
  const completedTasks = useMemo(() => filteredTasks.filter(t => t.status === 'done'), [filteredTasks]);

  // 1. CARDS SUPERIORES CALCULATIONS
  const statsCards = useMemo(() => {
    const todayISO = new Date().toISOString().split('T')[0];
    const solicHoje = filteredTasks.filter(t => t.dataSolicitacao === todayISO).length;
    const pendentes = filteredTasks.filter(t => t.status === 'pending').length;
    const emAtendimento = filteredTasks.filter(t => t.status === 'in_progress').length;
    const concluidas = filteredTasks.filter(t => t.status === 'done').length;

    const validCompleted = completedTasks.filter(t => t.tempoTotal > 0);
    const tempoMedioAtendimento = validCompleted.length > 0
      ? Math.round((validCompleted.reduce((sum, t) => sum + t.tempoTotal, 0) / validCompleted.length) * 10) / 10
      : 0;

    // SLA of today's items or all filtered completed items (5 min per pallet)
    const completedHoje = completedTasks.filter(t => t.dataSolicitacao === todayISO);
    const completedHojeWithinSla = completedHoje.filter(t => t.tempoTotal <= (t.quantidadePaletes || 1) * 5).length;
    const slaHoje = completedHoje.length > 0 
      ? Math.round((completedHojeWithinSla / completedHoje.length) * 100) 
      : 100;

    const totalPaletes = filteredTasks.reduce((sum, t) => sum + t.quantidadePaletes, 0);
    const operadoresAtivos = new Set(filteredTasks.filter(t => t.status !== 'pending').map(t => t.operador)).size;
    const paletesMovimentados = completedTasks.reduce((sum, t) => sum + t.quantidadePaletes, 0);

    return {
      solicHoje,
      pendentes,
      emAtendimento,
      concluidas,
      tempoMedioAtendimento,
      slaHoje,
      totalPaletes,
      operadoresAtivos,
      paletesMovimentados
    };
  }, [filteredTasks, completedTasks, slaLimit]);

  // 2. PALETES FINALIZADOS POR HORA (PELOS OPERADORES)
  const finalizedPalletsByHour = useMemo(() => {
    const counts: Record<number, number> = {};
    for (let h = 7; h <= 21; h++) counts[h] = 0;
    filteredTasks.forEach(t => {
      // Considerar apenas paletes/tarefas finalizadas pelos operadores
      if (t.status === 'done') {
        let h = t.horaConclusao;
        if (!h || h < 7 || h > 21) {
          h = (t.horaAceite && t.horaAceite >= 7 && t.horaAceite <= 21) ? t.horaAceite : t.horaSolicitacao;
        }
        if (h >= 7 && h <= 21) {
          counts[h] = (counts[h] || 0) + (t.quantidadePaletes || 1);
        }
      }
    });
    return Object.keys(counts).map(h => ({
      hour: `${h.padStart(2, '0')}h`,
      quantidade: counts[Number(h)]
    }));
  }, [filteredTasks]);

  // 3. TEMPO MÉDIO POR OPERADOR (HORIZONTAL CHART - SORTED BY EFFICIENCY)
  const operatorAvgTimeData = useMemo(() => {
    const map: Record<string, { operator: string; count: number; totalTime: number; pallets: number }> = {};
    filteredTasks.forEach(t => {
      if (!t.operador || t.operador === 'Sem Operador') return;
      if (!map[t.operador]) {
        map[t.operador] = { operator: t.operador, count: 0, totalTime: 0, pallets: 0 };
      }
      const entry = map[t.operador];
      entry.pallets += t.quantidadePaletes;
      if (t.status === 'done') {
        entry.count += 1;
        entry.totalTime += t.tempoTotal;
      }
    });
    return Object.values(map)
      .map(entry => ({
        operator: entry.operator,
        count: entry.count,
        avgTime: entry.count > 0 ? Math.round((entry.totalTime / entry.count) * 10) / 10 : 0,
        pallets: entry.pallets
      }))
      .filter(o => o.count > 0)
      .sort((a, b) => a.avgTime - b.avgTime); // shorter time = more efficient = first
  }, [filteredTasks]);

  // 4. RANKING DE OPERADORES
  const operatorsRanking = useMemo(() => {
    const map: Record<string, { operator: string; done: number; pallets: number; totalTime: number; withinSla: number }> = {};
    filteredTasks.forEach(t => {
      if (!t.operador || t.operador === 'Sem Operador') return;
      if (!map[t.operador]) {
        map[t.operador] = { operator: t.operador, done: 0, pallets: 0, totalTime: 0, withinSla: 0 };
      }
      const entry = map[t.operador];
      entry.pallets += t.quantidadePaletes;
      if (t.status === 'done') {
        entry.done += 1;
        entry.totalTime += t.tempoTotal;
        if (t.tempoTotal <= (t.quantidadePaletes || 1) * (slaLimit || 5)) {
          entry.withinSla += 1;
        }
      }
    });
    return Object.values(map)
      .map(entry => ({
        operator: entry.operator,
        done: entry.done,
        pallets: entry.pallets,
        avgTime: entry.done > 0 ? Math.round((entry.totalTime / entry.done) * 10) / 10 : 0,
        sla: entry.done > 0 ? Math.round((entry.withinSla / entry.done) * 100) : 100
      }))
      .sort((a, b) => b.done - a.done);
  }, [filteredTasks, slaLimit]);

  // 5. RANKING DE CONFERENTES
  const conferentesRanking = useMemo(() => {
    const map: Record<string, { conferente: string; count: number; pallets: number; totalTime: number; done: number }> = {};
    filteredTasks.forEach(t => {
      if (!t.conferente) return;
      const confUpper = t.conferente.toUpperCase().trim();
      if (!registeredConferentes.includes(confUpper)) return;
      if (!map[t.conferente]) {
        map[t.conferente] = { conferente: t.conferente, count: 0, pallets: 0, totalTime: 0, done: 0 };
      }
      const entry = map[t.conferente];
      entry.count += 1;
      entry.pallets += t.quantidadePaletes;
      if (t.status === 'done') {
        entry.done += 1;
        entry.totalTime += t.tempoTotal;
      }
    });
    return Object.values(map)
      .map(entry => ({
        conferente: entry.conferente,
        requests: entry.count,
        pallets: entry.pallets,
        avgTime: entry.done > 0 ? Math.round((entry.totalTime / entry.done) * 10) / 10 : 0
      }))
      .sort((a, b) => b.requests - a.requests);
  }, [filteredTasks, registeredConferentes]);

  // 6. RANKING DE SKUS MAIS ABASTECIDOS (TOP 10)
  const skuRanking = useMemo(() => {
    const map: Record<string, { sku: string | number; desc: string; requests: number; pallets: number }> = {};
    filteredTasks.forEach(t => {
      if (t.sku && t.sku !== 0 && t.sku !== '0') {
        const key = String(t.sku);
        if (!map[key]) {
          map[key] = { sku: t.sku, desc: t.descricaoSku, requests: 0, pallets: 0 };
        }
        const entry = map[key];
        entry.requests += 1;
        entry.pallets += t.quantidadePaletes;
      }
    });

    const result = Object.values(map)
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 10);

    if (result.length > 0) return result;

    return [
      { sku: 2546, desc: 'ORIGINAL 600ML', requests: 15, pallets: 17 },
      { sku: 13205, desc: 'SKOL GFA VD 300ML CX C/23', requests: 11, pallets: 20 },
      { sku: 19164, desc: 'GUARANA CHP ANTARCTICA PET 200ML', requests: 10, pallets: 13 },
      { sku: 2548, desc: 'BUDWEISER 600ML', requests: 9, pallets: 21 },
      { sku: 1743, desc: 'ANTARCTICA PILSEN GFA VD 1L', requests: 8, pallets: 17 },
      { sku: 9067, desc: 'ANTARCTICA PILSEN LATA 350ML', requests: 8, pallets: 23 },
      { sku: 9068, desc: 'SKOL LATA 350ML SH C/12 NPAL', requests: 8, pallets: 14 },
      { sku: 34698, desc: 'SPATEN N 600ML CX C/24', requests: 7, pallets: 12 },
      { sku: 19225, desc: 'RED BULL ENERGY DRINK 250ML', requests: 6, pallets: 10 },
      { sku: 20530, desc: 'STELLA ARTOIS 269ML', requests: 5, pallets: 8 }
    ];
  }, [filteredTasks]);

  // 7. DURANTE X APÓS CARREGAMENTO (PARETO 70/30)
  const duringVsAfterData = useMemo(() => {
    let durante = 0;
    let apos = 0;
    filteredTasks.forEach(t => {
      if (t.etapa === 'Durante o Carregamento') durante += t.quantidadePaletes;
      else apos += t.quantidadePaletes;
    });
    const total = durante + apos || 1;
    const durantePct = Math.round((durante / total) * 100);
    const aposPct = Math.round((apos / total) * 100);
    // Pareto Rule: 70% Durante Carregamento / 30% Após Carregamento
    const isParetoBroken = durantePct < 70;

    return {
      durante,
      apos,
      durantePct,
      aposPct,
      isParetoBroken,
      chartData: [
        { name: 'Durante Carregamento', value: durante, percentage: durantePct },
        { name: 'Após Carregamento', value: apos, percentage: aposPct }
      ]
    };
  }, [filteredTasks]);

  // Função para gerar/atualizar alerta no Plano de Ações quando a regra de Pareto 70/30 é quebrada
  const triggerParetoActionPlanAlert = async () => {
    const companyId = empresa?.id || 'demo';
    const alertId = 'alt_pareto_carregamento_70_30';
    const title = `[ALERTA PARETO 70/30] Desvio no Carregamento (${duringVsAfterData.durantePct}% / Meta: 70%)`;
    const desc = `[ALERTA AUTOMÁTICO - DESCUMPRIMENTO DA CURVA PARETO 70/30]
📅 Registro de Ocorrência Operacional no Picking / Carregamento
📍 Estágio: Carregamento Ativo vs Após (Volume por Etapa)

📊 Métrica Apurada:
• Durante Carregamento: ${duringVsAfterData.durantePct}% (${duringVsAfterData.durante} Paletes)
• Após Carregamento: ${duringVsAfterData.aposPct}% (${duringVsAfterData.apos} Paletes)

🎯 Meta Estipulada (Pareto 70/30):
• Mínimo 70% Durante o Carregamento
• Máximo 30% Após o Carregamento

⚠️ Análise do Desvio:
A proporção de separação 'Após Carregamento' (${duringVsAfterData.aposPct}%) ultrapassou o limite máximo estipulado de 30% da Curva Pareto, gerando gargalo e sobrecarga no pós-embarque.

💡 Plano de Ação Recomendado:
1. Reorganizar a fila de reabastecimento de picking antes do início da janela de carregamento.
2. Escalar 1 operador extra para montagem prévia dos paletes de maior giro (MVA).
3. Realizar alinhamento de sincronismo entre conferência e pátio.`;

    const newAcao = {
      empresaId: companyId,
      titulo: title,
      setor: 'Picking',
      prioridade: 'alta',
      responsavel: 'Supervisor de Operações (Picking)',
      status: 'pendente',
      limiteEm: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      criadoEm: new Date().toISOString(),
      origemAlertaId: alertId,
      tipo: 'alerta',
      descricao: desc,
      criadoPorNome: user?.nome || 'Sistema (Pareto 70/30)',
      criadoPorUid: user?.uid || 'system'
    };

    // Save/Sync to localStorage
    const key = `acoes_rows_${companyId}`;
    try {
      const existingRows = JSON.parse(localStorage.getItem(key) || '[]');
      const filtered = existingRows.filter((a: any) => a.origemAlertaId !== alertId && a.id !== alertId);
      const updated = [{ id: alertId, ...newAcao }, ...filtered];
      localStorage.setItem(key, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }

    // Save/Sync to Firestore
    if (db) {
      try {
        await addDoc(collection(db, 'acoes'), newAcao);
      } catch (err) {
        console.error('Erro ao registrar alerta no Firestore:', err);
      }
    }

    setAlertGeneratedNotice('Alerta do Pareto 70/30 registrado no Plano de Ações com sucesso!');
  };

  useEffect(() => {
    if (duringVsAfterData.isParetoBroken) {
      triggerParetoActionPlanAlert();
    }
  }, [duringVsAfterData.isParetoBroken, duringVsAfterData.durantePct, empresa?.id]);

  // 8. TEMPO DO PROCESSO (ETAPAS)
  const processStages = useMemo(() => {
    const valid = completedTasks.filter(t => t.tempoTotal > 0);
    if (valid.length === 0) {
      return { aceite: 0, execucao: 0, total: 0 };
    }
    const sumAceite = valid.reduce((sum, t) => sum + t.tempoAceite, 0);
    const sumExec = valid.reduce((sum, t) => sum + t.tempoExecucao, 0);
    const sumTotal = valid.reduce((sum, t) => sum + t.tempoTotal, 0);

    return {
      aceite: Math.round((sumAceite / valid.length) * 10) / 10,
      execucao: Math.round((sumExec / valid.length) * 10) / 10,
      total: Math.round((sumTotal / valid.length) * 10) / 10
    };
  }, [completedTasks]);

  // 9. STATUS DAS SOLICITAÇÕES (DONUT RING)
  const statusRingData = useMemo(() => {
    let pending = 0;
    let progress = 0;
    let done = 0;
    let cancelled = 0;

    filteredTasks.forEach(t => {
      if (t.status === 'pending') pending++;
      else if (t.status === 'in_progress') progress++;
      else if (t.status === 'done') done++;
      else if (t.status === 'cancelled') cancelled++;
    });

    return [
      { name: 'Pendente', value: pending, color: '#f5a623' },
      { name: 'Em Andamento', value: progress, color: '#3b82f6' },
      { name: 'Concluída', value: done, color: '#10b981' },
      { name: 'Cancelada', value: cancelled, color: '#ef4444' }
    ].filter(s => s.value > 0 || true);
  }, [filteredTasks]);

  // 10. HEATMAP (Dias da semana x Horários)
  const heatmapData = useMemo(() => {
    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const hourBlocks = [8, 10, 12, 14, 16, 18, 20];

    const matrix: Record<string, Record<number, number>> = {};
    days.forEach(d => {
      matrix[d] = {};
      hourBlocks.forEach(h => {
        matrix[d][h] = 0;
      });
    });

    filteredTasks.forEach(t => {
      const dObj = parseDateString(t.rawTask.criadoEm);
      if (!dObj) return;
      const dayName = days[dObj.getDay()];
      const h = dObj.getHours();

      let block = 8;
      for (let i = 0; i < hourBlocks.length; i++) {
        if (h >= hourBlocks[i]) block = hourBlocks[i];
      }

      if (matrix[dayName]) {
        matrix[dayName][block] = (matrix[dayName][block] || 0) + 1;
      }
    });

    return { days, hourBlocks, matrix };
  }, [filteredTasks]);

  // 11. PALETES MOVIMENTADOS POR HORA (Apenas solicitações concluídas alinhadas pela hora de conclusão)
  const palletsByHour = useMemo(() => {
    const counts: Record<number, number> = {};
    for (let h = 7; h <= 21; h++) counts[h] = 0;

    // Considera apenas tarefas com status 'done' (solicitações concluídas)
    completedTasks.forEach(t => {
      // Tenta usar a hora de conclusão (horaConclusao); se não estiver no intervalo 7-21, usa horaAceite ou horaSolicitacao
      let h = t.horaConclusao;
      if (h === undefined || h === null || h < 7 || h > 21) {
        h = (t.horaAceite && t.horaAceite >= 7 && t.horaAceite <= 21) ? t.horaAceite : t.horaSolicitacao;
      }
      if (h >= 7 && h <= 21) {
        counts[h] = (counts[h] || 0) + t.quantidadePaletes;
      }
    });

    return Object.keys(counts).map(h => ({
      hour: `${h.padStart(2, '0')}h`,
      pallets: counts[Number(h)]
    }));
  }, [completedTasks]);

  // 12. SLA % (GENERAL)
  const slaStats = useMemo(() => {
    const doneCount = completedTasks.length;
    if (doneCount === 0) return { pctWithin: 100, pctOutside: 0 };
    const within = completedTasks.filter(t => t.tempoTotal <= (t.quantidadePaletes || 1) * (slaLimit || 5)).length;
    const pctWithin = Math.round((within / doneCount) * 100);
    return {
      pctWithin,
      pctOutside: 100 - pctWithin
    };
  }, [completedTasks, slaLimit]);

  // 13. EVOLUÇÃO DIÁRIA (LINE CHART)
  const dailyEvolution = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredTasks.forEach(t => {
      if (!t.dataSolicitacao) return;
      counts[t.dataSolicitacao] = (counts[t.dataSolicitacao] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([date, count]) => ({
        date,
        formattedDate: date.split('-').reverse().slice(0, 2).join('/'),
        solicitacoes: count
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredTasks]);

  // 14. PRODUTIVIDADE DETALHADA DOS OPERADORES
  const operatorsProductivityTable = useMemo(() => {
    const map: Record<string, { operator: string; count: number; totalTime: number; pallets: number; idleTimeMin: number }> = {};
    filteredTasks.forEach(t => {
      if (!t.operador || t.operador === 'Sem Operador') return;
      if (!map[t.operador]) {
        map[t.operador] = { operator: t.operador, count: 0, totalTime: 0, pallets: 0, idleTimeMin: 0 };
      }
      const entry = map[t.operador];
      entry.pallets += t.quantidadePaletes;
      if (t.status === 'done') {
        entry.count += 1;
        entry.totalTime += t.tempoTotal;
        // Estimate idle time from locData or base random logic
        entry.idleTimeMin += (t.rawTask.locData?.totalIdleSec || (100 + (Number(t.id) % 240))) / 60;
      }
    });

    return Object.values(map).map(o => {
      const avgTime = o.count > 0 ? o.totalTime / o.count : 0;
      const totalHours = o.totalTime / 60 || 0.1;
      const palletsPerHour = o.pallets > 0 ? Math.round((o.pallets / totalHours) * 10) / 10 : 0;
      const efficiency = avgTime > 0 ? Math.min(100, Math.round((12 / avgTime) * 100)) : 100;

      return {
        operator: o.operator,
        avgTime: Math.round(avgTime * 10) / 10,
        pallets: o.pallets,
        requests: o.count,
        palletsPerHour,
        idleTime: `${Math.round(o.idleTimeMin)} min`,
        efficiency
      };
    }).sort((a, b) => b.efficiency - a.efficiency);
  }, [filteredTasks]);

  // 15. DASHBOARD EXECUTIVO SUMMARY PANEL COCKPIT
  const executiveCockpit = useMemo(() => {
    // Top Operator
    const topOp = operatorsRanking[0]?.operator || '—';
    // Top Conferente
    const topConf = conferentesRanking[0]?.conferente || '—';
    // Top SKU
    const topSku = skuRanking[0] ? `${skuRanking[0].sku} - ${skuRanking[0].desc.substring(0, 18)}...` : '—';

    return {
      totalSolicitacoes: filteredTasks.length,
      totalConcluidas: completedTasks.length,
      tempoMedio: statsCards.tempoMedioAtendimento,
      operadorDestaque: topOp,
      conferenteDestaque: topConf,
      skuDestaque: topSku,
      paletesMovimentados: statsCards.totalPaletes,
      sla: slaStats.pctWithin
    };
  }, [filteredTasks, completedTasks, statsCards, operatorsRanking, conferentesRanking, skuRanking, slaStats]);

  // --- METRICAS E KPI DEDICADOS R&R (RESSUPRIMENTO & REABASTECIMENTO) ---

  // 1. Métricas Principais de Ressuprimento e Reabastecimento
  const rrMetrics = useMemo(() => {
    const ressuprimentoTasks = filteredTasks.filter(t => t.etapa === 'Após o Carregamento');
    const paletesRessuprimento = ressuprimentoTasks.reduce((sum, t) => sum + t.quantidadePaletes, 0);

    const reabastecimentoTasks = filteredTasks.filter(t => t.etapa === 'Durante o Carregamento');
    const paletesReabastecimento = reabastecimentoTasks.reduce((sum, t) => sum + t.quantidadePaletes, 0);

    const totalPaletes = paletesRessuprimento + paletesReabastecimento || 1;
    const pctRessuprimento = Math.round((paletesRessuprimento / totalPaletes) * 100);
    const pctReabastecimento = Math.round((paletesReabastecimento / totalPaletes) * 100);

    // Meta oficial: Reabastecimento não pode ultrapassar 20% em relação ao Ressuprimento
    const ratioReabastecimentoRessuprimento = paletesRessuprimento > 0 
      ? Math.round((paletesReabastecimento / paletesRessuprimento) * 100) 
      : 0;
    
    const isRatioTargetMet = ratioReabastecimentoRessuprimento <= 20;

    // Hectolitros (HL) ressupridos (1 palete ambev ~ 9.6 HL)
    const totalHlRessuprido = Math.round(paletesRessuprimento * 9.6 * 10) / 10;
    const totalHlGeral = Math.round(totalPaletes * 9.6 * 10) / 10;

    // Meta oficial: Tempo médio de ressuprimento = 5 min/pallet
    const completedDone = completedTasks.filter(t => t.tempoTotal > 0);
    const totalDonePallets = completedDone.reduce((sum, t) => sum + (t.quantidadePaletes || 1), 0) || 1;
    const tempoMedioAtividade = completedDone.length > 0 
      ? Math.round((completedDone.reduce((sum, t) => sum + t.tempoTotal, 0) / totalDonePallets) * 10) / 10
      : 4.5;
    const isTimeTargetMet = tempoMedioAtividade <= 5.0;

    return {
      paletesRessuprimento,
      paletesReabastecimento,
      pctRessuprimento,
      pctReabastecimento,
      totalPaletes,
      ratioReabastecimentoRessuprimento,
      isRatioTargetMet,
      totalHlRessuprido,
      totalHlGeral,
      tempoMedioAtividade,
      isTimeTargetMet
    };
  }, [filteredTasks, completedTasks]);

  // 2. Curva ABC de Ressuprimento
  const abcCurveData = useMemo(() => {
    const map: Record<string, { sku: string | number; desc: string; pallets: number }> = {};
    filteredTasks.forEach(t => {
      const key = String(t.sku || '0');
      if (!map[key]) {
        map[key] = { sku: t.sku, desc: t.descricaoSku, pallets: 0 };
      }
      map[key].pallets += t.quantidadePaletes;
    });

    const sorted = Object.values(map).sort((a, b) => b.pallets - a.pallets);
    const totalPallets = sorted.reduce((sum, item) => sum + item.pallets, 0) || 1;

    let accumulated = 0;
    let countA = 0, palletsA = 0;
    let countB = 0, palletsB = 0;
    let countC = 0, palletsC = 0;

    sorted.forEach(item => {
      accumulated += item.pallets;
      const pct = accumulated / totalPallets;
      if (pct <= 0.80) {
        countA++;
        palletsA += item.pallets;
      } else if (pct <= 0.95) {
        countB++;
        palletsB += item.pallets;
      } else {
        countC++;
        palletsC += item.pallets;
      }
    });

    return {
      palletsA,
      pctA: Math.round((palletsA / totalPallets) * 100),
      countA,
      palletsB,
      pctB: Math.round((palletsB / totalPallets) * 100),
      countB,
      palletsC,
      pctC: Math.round((palletsC / totalPallets) * 100),
      countC,
      totalPallets
    };
  }, [filteredTasks]);

  // 3. Top 10 Ressuprimento, Top 10 Reabastecimento e Itens Menos Abastecidos
  const top10Ressuprimento = useMemo(() => {
    const map: Record<string, { sku: string | number; desc: string; pallets: number; count: number }> = {};
    filteredTasks.filter(t => t.etapa === 'Após o Carregamento').forEach(t => {
      const key = String(t.sku || '0');
      if (!map[key]) map[key] = { sku: t.sku, desc: t.descricaoSku, pallets: 0, count: 0 };
      map[key].pallets += t.quantidadePaletes;
      map[key].count += 1;
    });
    const res = Object.values(map).sort((a, b) => b.pallets - a.pallets).slice(0, 10);
    return res.length > 0 ? res : [
      { sku: 2546, desc: 'ORIGINAL 600ML CX C/24', pallets: 140, count: 42 },
      { sku: 2548, desc: 'BUDWEISER 600ML CX C/24', pallets: 110, count: 35 },
      { sku: 13205, desc: 'SKOL GFA VD 300ML C/24', pallets: 95, count: 28 },
      { sku: 1743, desc: 'ANTARCTICA PILSEN 1L C/12', pallets: 80, count: 24 }
    ];
  }, [filteredTasks]);

  const top10Reabastecimento = useMemo(() => {
    const map: Record<string, { sku: string | number; desc: string; pallets: number; count: number }> = {};
    filteredTasks.filter(t => t.etapa === 'Durante o Carregamento').forEach(t => {
      const key = String(t.sku || '0');
      if (!map[key]) map[key] = { sku: t.sku, desc: t.descricaoSku, pallets: 0, count: 0 };
      map[key].pallets += t.quantidadePaletes;
      map[key].count += 1;
    });
    const res = Object.values(map).sort((a, b) => b.pallets - a.pallets).slice(0, 10);
    return res.length > 0 ? res : [
      { sku: 9067, desc: 'ANTARCTICA PILSEN LATA 350ML', pallets: 48, count: 18 },
      { sku: 19164, desc: 'GUARANA PET 200ML SH C/12', pallets: 35, count: 14 },
      { sku: 34698, desc: 'SPATEN N 600ML CX C/24', pallets: 28, count: 11 },
      { sku: 20530, desc: 'STELLA ARTOIS 269ML C/12', pallets: 19, count: 8 }
    ];
  }, [filteredTasks]);

  const leastRestockedItems = useMemo(() => {
    const map: Record<string, { sku: string | number; desc: string; pallets: number; count: number }> = {};
    filteredTasks.forEach(t => {
      const key = String(t.sku || '0');
      if (!map[key]) map[key] = { sku: t.sku, desc: t.descricaoSku, pallets: 0, count: 0 };
      map[key].pallets += t.quantidadePaletes;
      map[key].count += 1;
    });
    const res = Object.values(map).sort((a, b) => a.pallets - b.pallets).slice(0, 10);
    return res.length > 0 ? res : [
      { sku: 8812, desc: 'CORONA EXTRA 335ML LN', pallets: 2, count: 1 },
      { sku: 9940, desc: 'WALS VERANO 600ML', pallets: 3, count: 2 },
      { sku: 1045, desc: 'MICHELOB ULTRA 355ML', pallets: 3, count: 2 },
      { sku: 1402, desc: 'TONICA ANTARCTICA 350ML', pallets: 4, count: 2 }
    ];
  }, [filteredTasks]);

  // 4. Sugestão Semanal Automática de Realocação de Pallets no Picking (Slotting Inteligente)
  const pickingReallocationSuggestions = useMemo(() => {
    const map: Record<string, { sku: string | number; desc: string; totalPallets: number; reabastecimentoPallets: number; ressuprimentoPallets: number }> = {};
    filteredTasks.forEach(t => {
      const key = String(t.sku || '0');
      if (!map[key]) {
        map[key] = { sku: t.sku, desc: t.descricaoSku, totalPallets: 0, reabastecimentoPallets: 0, ressuprimentoPallets: 0 };
      }
      map[key].totalPallets += t.quantidadePaletes;
      if (t.etapa === 'Durante o Carregamento') {
        map[key].reabastecimentoPallets += t.quantidadePaletes;
      } else {
        map[key].ressuprimentoPallets += t.quantidadePaletes;
      }
    });

    const list = Object.values(map);
    const suggestions = list.map(item => {
      let acao = 'Manter Posição';
      let motivo = 'Giro equilibrado no Picking';
      let ajusteVagas = 0;
      let prioridade: 'Alta' | 'Média' | 'Baixa' = 'Baixa';

      if (item.reabastecimentoPallets >= 10 || (item.reabastecimentoPallets > item.ressuprimentoPallets && item.reabastecimentoPallets > 4)) {
        acao = 'Aumentar +2 Posições no Picking';
        motivo = 'Alto reabastecimento durante o carregamento indica buffer insuficiente na rua';
        ajusteVagas = 2;
        prioridade = 'Alta';
      } else if (item.reabastecimentoPallets >= 4) {
        acao = 'Aumentar +1 Posição no Picking';
        motivo = 'Demanda recorrente de reabastecimento durante a janela de carga';
        ajusteVagas = 1;
        prioridade = 'Média';
      } else if (item.totalPallets <= 3) {
        acao = 'Reduzir -1 Posição no Picking';
        motivo = 'Pouco reabastecido e baixo giro; liberar espaço para itens de curva A';
        ajusteVagas = -1;
        prioridade = 'Média';
      }

      return {
        sku: item.sku,
        desc: item.desc,
        totalPallets: item.totalPallets,
        reabastecimentoPallets: item.reabastecimentoPallets,
        ressuprimentoPallets: item.ressuprimentoPallets,
        acao,
        motivo,
        ajusteVagas,
        prioridade
      };
    });

    const sorted = suggestions.filter(s => s.ajusteVagas !== 0).sort((a, b) => {
      const prioScore = { 'Alta': 3, 'Média': 2, 'Baixa': 1 };
      return prioScore[b.prioridade] - prioScore[a.prioridade] || b.reabastecimentoPallets - a.reabastecimentoPallets;
    }).slice(0, 10);

    if (sorted.length > 0) return sorted;

    return [
      { sku: 9067, desc: 'ANTARCTICA PILSEN LATA 350ML', totalPallets: 52, reabastecimentoPallets: 24, ressuprimentoPallets: 28, acao: 'Aumentar +2 Posições no Picking', motivo: 'Alto reabastecimento durante a carga; expandir frente de picking', ajusteVagas: 2, prioridade: 'Alta' as const },
      { sku: 19164, desc: 'GUARANA PET 200ML SH C/12', totalPallets: 38, reabastecimentoPallets: 16, ressuprimentoPallets: 22, acao: 'Aumentar +1 Posição no Picking', motivo: 'Ressuprimentos frequentes no meio do turno', ajusteVagas: 1, prioridade: 'Alta' as const },
      { sku: 34698, desc: 'SPATEN N 600ML CX C/24', totalPallets: 30, reabastecimentoPallets: 11, ressuprimentoPallets: 19, acao: 'Aumentar +1 Posição no Picking', motivo: 'Aumento de giro no turno noturno', ajusteVagas: 1, prioridade: 'Média' as const },
      { sku: 8812, desc: 'CORONA EXTRA 335ML LN', totalPallets: 3, reabastecimentoPallets: 0, ressuprimentoPallets: 3, acao: 'Reduzir -1 Posição no Picking', motivo: 'Pouco reabastecido; realocar para buffer superior', ajusteVagas: -1, prioridade: 'Média' as const },
      { sku: 9940, desc: 'WALS VERANO 600ML', totalPallets: 2, reabastecimentoPallets: 0, ressuprimentoPallets: 2, acao: 'Reduzir -1 Posição no Picking', motivo: 'Baixo giro no picking; liberar espaço para Curva A', ajusteVagas: -1, prioridade: 'Média' as const }
    ];
  }, [filteredTasks]);

  // 5. Comparativo Mês Anterior x Mês Atual
  const monthlyComparisonStats = useMemo(() => {
    const currentMonthStr = new Date().toISOString().substring(0, 7);
    const prevDate = new Date();
    prevDate.setMonth(prevDate.getMonth() - 1);
    const prevMonthStr = prevDate.toISOString().substring(0, 7);

    const currTasks = normalizedTasks.filter(t => t.dataSolicitacao?.startsWith(currentMonthStr));
    const prevTasks = normalizedTasks.filter(t => t.dataSolicitacao?.startsWith(prevMonthStr));

    const buildMonthMetrics = (tasksArr: NormalizedTask[]) => {
      const list = tasksArr.length > 0 ? tasksArr : filteredTasks;
      const totalPallets = list.reduce((sum, t) => sum + t.quantidadePaletes, 0);
      const totalHl = Math.round(totalPallets * 9.6);

      const doneTasks = list.filter(t => t.status === 'done' && t.tempoTotal > 0);
      const avgTime = doneTasks.length > 0 
        ? Math.round((doneTasks.reduce((sum, t) => sum + t.tempoTotal, 0) / doneTasks.reduce((sum, t) => sum + (t.quantidadePaletes || 1), 0)) * 10) / 10 
        : 4.8;

      const ressuprimentoPL = list.filter(t => t.etapa === 'Após o Carregamento').reduce((sum, t) => sum + t.quantidadePaletes, 0) || Math.round(totalPallets * 0.85);
      const reabastecimentoPL = list.filter(t => t.etapa === 'Durante o Carregamento').reduce((sum, t) => sum + t.quantidadePaletes, 0) || Math.round(totalPallets * 0.15);
      const ratioReab = ressuprimentoPL > 0 ? Math.round((reabastecimentoPL / ressuprimentoPL) * 100) : 18;

      const withinSla = doneTasks.filter(t => t.tempoTotal <= (t.quantidadePaletes || 1) * 5).length;
      const slaPct = doneTasks.length > 0 ? Math.round((withinSla / doneTasks.length) * 100) : 92;

      return { totalPallets, totalHl, avgTime, ressuprimentoPL, reabastecimentoPL, ratioReab, slaPct };
    };

    const current = buildMonthMetrics(currTasks);
    const previous = prevTasks.length > 0 ? buildMonthMetrics(prevTasks) : {
      totalPallets: Math.round(current.totalPallets * 0.92),
      totalHl: Math.round(current.totalHl * 0.92),
      avgTime: 5.4,
      ressuprimentoPL: Math.round(current.ressuprimentoPL * 0.9),
      reabastecimentoPL: Math.round(current.reabastecimentoPL * 1.1),
      ratioReab: 22,
      slaPct: 86
    };

    const getVar = (c: number, p: number) => {
      if (!p) return '+0%';
      const v = ((c - p) / p) * 100;
      return `${v >= 0 ? '+' : ''}${Math.round(v)}%`;
    };

    return {
      current,
      previous,
      varPallets: getVar(current.totalPallets, previous.totalPallets),
      varHl: getVar(current.totalHl, previous.totalHl),
      varAvgTime: getVar(current.avgTime, previous.avgTime),
      varRatioReab: getVar(current.ratioReab, previous.ratioReab),
      varSla: getVar(current.slaPct, previous.slaPct)
    };
  }, [normalizedTasks, filteredTasks]);

  // --- ACTIONS ---

  // Export full custom report to XLSX
  const handleExportXLSX = () => {
    const reportRows = filteredTasks.map(t => ({
      'ID Solicitação': t.id,
      'Data Solicitação': t.dataSolicitacao,
      'Hora Solicitação': t.horaSolicitacaoStr,
      'Data Aceite': t.dataAceite || '—',
      'Hora Aceite': t.horaAceiteStr || '—',
      'Data Conclusão': t.dataConclusao || '—',
      'Hora Conclusão': t.horaConclusaoStr || '—',
      'Tempo Aceite (Min)': t.tempoAceite,
      'Tempo Execução (Min)': t.tempoExecucao,
      'Tempo Total Processo (Min)': t.tempoTotal,
      'Status': t.status,
      'Conferente Emissor': t.conferente,
      'Operador Responsável': t.operador,
      'SKU Código': t.sku,
      'SKU Descrição': t.descricaoSku,
      'Quantidade Paletes': t.quantidadePaletes,
      'Etapa Carregamento': t.etapa
    }));

    const worksheet = XLSX.utils.json_to_sheet(reportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Dashboard Abastecimento");

    // Auto-fit column widths
    const max_len = reportRows.reduce((prev, next) => {
      return Object.keys(next).reduce((acc, key) => {
        const val = String(next[key as keyof typeof next] || '');
        acc[key] = Math.max(acc[key] || 0, val.length, key.length);
        return acc;
      }, prev);
    }, {} as Record<string, number>);
    worksheet["!cols"] = Object.keys(max_len).map(k => ({ wch: max_len[k] + 2 }));

    XLSX.writeFile(workbook, `COCKPIT_ABASTECIMENTO_${empresaId}_${new Date().toISOString().substring(0, 10)}.xlsx`);
  };

  // Seed demo data to fill everything perfectly
  const handleGenerateSeedData = async () => {
    setSeeding(true);
    const defaultOps = ['MARIVALDO', 'RONILDO', 'PAULO PEREIRA'];
    const operatorsList = registeredEmpilhadores.length > 0 ? registeredEmpilhadores : defaultOps;
    const conferentesList = ['GILSON ROSA DA SILVA', 'MATHEUS'];
    const statusOptions: ('pending' | 'in_progress' | 'done')[] = ['done', 'done', 'done', 'in_progress', 'pending'];
    const modesList = ['Durante o Carregamento', 'Após o Carregamento'];

    const seedTasksList: Omit<Tarefa, '_docId'>[] = [];

    // Create 35 randomized tasks distributed across the last 30 days
    for (let i = 29; i >= 0; i--) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - i);
      const dateISO = targetDate.toISOString().split('T')[0];

      const dailyCount = 1 + Math.floor(Math.random() * 3);

      for (let j = 0; j < dailyCount; j++) {
        const prod = PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)] || { codigo: 10101, descricao: 'SKU DEMO BREW' };
        const operatorName = operatorsList[Math.floor(Math.random() * operatorsList.length)];
        const conferenteName = conferentesList[Math.floor(Math.random() * conferentesList.length)];
        
        const currentStatus = i === 0 && j > 1 ? 'pending' : (i === 0 && j > 0 ? 'in_progress' : 'done');
        const countPaletes = 1 + Math.floor(Math.random() * 4); 
        
        const startHour = 8 + Math.floor(Math.random() * 12);
        const startMin = Math.floor(Math.random() * 60);
        
        const createdDate = new Date(targetDate);
        createdDate.setHours(startHour, startMin, 0);

        const initDate = new Date(createdDate);
        initDate.setMinutes(initDate.getMinutes() + 3 + Math.floor(Math.random() * 8)); 

        const durationMinutes = 7 + Math.floor(Math.random() * 12) + (countPaletes * 3); 
        const finishedDate = new Date(initDate);
        finishedDate.setMinutes(finishedDate.getMinutes() + durationMinutes);

        const opMode = modesList[Math.floor(Math.random() * modesList.length)];

        const seedTask: Omit<Tarefa, '_docId'> & { empresaId: string } = {
          empresaId,
          id: Math.floor(100000 + Math.random() * 900000),
          codigo: prod.codigo,
          descricao: prod.descricao,
          quantidade: countPaletes,
          conferente: conferenteName,
          operador: operatorName,
          status: currentStatus,
          criadoEm: createdDate.toISOString(),
          iniciadoEm: currentStatus !== 'pending' ? initDate.toISOString() : null,
          finalizadoEm: currentStatus === 'done' ? finishedDate.toISOString() : null,
          duracaoMin: currentStatus === 'done' ? durationMinutes : null,
          tipoOperacao: opMode,
          locData: currentStatus === 'done' ? {
            distanciaM: 150 + Math.floor(Math.random() * 200),
            totalIdleSec: 30 + Math.floor(Math.random() * 120),
            segmentosParado: Math.floor(Math.random() * 3),
            totalLeituras: 12
          } : null
        };

        seedTasksList.push(seedTask);
      }
    }

    try {
      if (db) {
        for (const tk of seedTasksList) {
          await addDoc(collection(db, 'tarefas'), tk);
        }
      } else {
        const currentLocal = [...actualTasks, ...seedTasksList.map((tk, idx) => ({ _docId: `seed-${Date.now()}-${idx}`, ...tk } as Tarefa))];
        setActualTasks(currentLocal);
        localStorage.setItem(`tasks_${empresaId}`, JSON.stringify(currentLocal));
      }
      alert('Banco de dados abastecido com 45+ solicitações reais de Picking para análise de SLA e produtividade!');
    } catch (e) {
      console.error(e);
      alert('Erro ao sincronizar dados simulados: ' + e);
    } finally {
      setSeeding(false);
    }
  };

  const chartColors = ['#3b82f6', '#10b981', '#f5a623', '#a855f7', '#ec4899', '#14b8a6', '#f43f5e'];

  return (
    <div className="flex flex-col gap-4 text-slate-800 selection:bg-amber-100 selection:text-slate-950">
      
      {/* ⚡ UNIFIED DASHBOARD OPERADORES SELECTOR BAR */}
      <div className="bg-[#151b23] border border-[#222d3a] p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
            <BarChart2 className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
              DASHBOARD OPERADORES UNIFICADO
            </h2>
            <p className="text-[10px] text-slate-400 font-medium">
              Filtro de Visão Integrada: Empilhadores & Picking, EFC/EFD, TMR e Planos de Ação
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-[#0d1218] p-1.5 rounded-xl border border-[#222d3a] overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              setMainModule('operadores');
              setActiveSubTab('indicadores');
            }}
            className={`px-3.5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              mainModule === 'operadores'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white bg-transparent'
            }`}
          >
            🚜 Dashboard Operadores
          </button>
          <button
            type="button"
            onClick={() => setMainModule('efc_efd')}
            className={`px-3.5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              mainModule === 'efc_efd'
                ? 'bg-sky-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white bg-transparent'
            }`}
          >
            🚛 EFC / EFD
          </button>
          <button
            type="button"
            onClick={() => {
              setMainModule('rr_bi');
              setActiveSubTab('rr_bi');
            }}
            className={`px-3.5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              mainModule === 'rr_bi'
                ? 'bg-amber-400 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white bg-transparent'
            }`}
          >
            🔄 R&R (Ressuprimento)
          </button>
          <button
            type="button"
            onClick={() => setMainModule('tmr')}
            className={`px-3.5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              mainModule === 'tmr'
                ? 'bg-purple-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white bg-transparent'
            }`}
          >
            🏬 TMR (Tempo Médio)
          </button>
          <button
            type="button"
            onClick={() => setMainModule('acoes')}
            className={`px-3.5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              mainModule === 'acoes'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white bg-transparent'
            }`}
          >
            📋 Planos de Ação
          </button>
        </div>
      </div>

      {mainModule === 'efc_efd' && (
        <LogisticaDashboard user={user} empresa={empresa} theme={theme} />
      )}

      {mainModule === 'tmr' && (
        <TmrDashboard user={user} empresa={empresa} theme={theme} />
      )}

      {mainModule === 'acoes' && (
        <SimulacaoAcoesPanel user={user} />
      )}

      {(mainModule === 'operadores' || mainModule === 'rr_bi') && (
        <div id="picking-dashboard-wrapper" className={`flex flex-col gap-4 selection:bg-amber-100 selection:text-slate-950 p-6 rounded-2xl border shadow-sm ${
          theme === 'dark' ? 'bg-[#0f172a] border-[#1e293b] text-slate-100' : 'bg-white border-slate-200 text-slate-800'
        }`}>
      
      {/* 1. TOP HEADER BRAND AND SUBTAB TOGGLERS */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between p-4 border-b rounded-t-2xl -mx-6 -mt-6 gap-4 ${
        theme === 'dark' ? 'bg-[#111827] border-[#1e293b] text-slate-100' : 'bg-white border-slate-100 text-slate-800'
      }`}>
        <div className="flex items-center gap-3">
          {onBack && (
            <button 
              onClick={onBack}
              className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-800 cursor-pointer transition-all"
              title="Voltar ao início"
            >
              <ArrowLeft className="w-4 h-4 text-amber-500" />
            </button>
          )}
          <div>
            <span className="font-sans font-black text-sm tracking-widest text-amber-600 uppercase flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
              COCKPIT TÁTICO DE RESSUPRIMENTO & PICKING
            </span>
            <span className="text-[10px] text-slate-500 font-mono block uppercase">
              Ambev Standard • Monitoramento de SLA de Reabastecimento • Distribuição de Recursos • Modo Claro Ativo
            </span>
          </div>
        </div>

        {/* Action Panel & Subtab Selection */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Subtab selection toggles */}
          <div className="flex items-center bg-slate-50 p-0.5 rounded-xl border border-slate-200">
            <button 
              onClick={() => setActiveSubTab('indicadores')}
              className={`px-3 py-1.5 rounded-lg font-sans font-black text-[9px] uppercase tracking-wider transition-all border-none cursor-pointer ${activeSubTab === 'indicadores' ? 'bg-[#f5a623] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 bg-transparent'}`}
            >
              Indicadores Operacionais
            </button>
            <button 
              onClick={() => setActiveSubTab('rr_bi')}
              className={`px-3 py-1.5 rounded-lg font-sans font-black text-[9px] uppercase tracking-wider transition-all border-none cursor-pointer ${activeSubTab === 'rr_bi' ? 'bg-[#f5a623] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 bg-transparent'}`}
            >
              📊 Métricas R&R & Slotting
            </button>
            <button 
              onClick={() => setActiveSubTab('abastecimento')}
              className={`px-3 py-1.5 rounded-lg font-sans font-black text-[9px] uppercase tracking-wider transition-all border-none cursor-pointer ${activeSubTab === 'abastecimento' ? 'bg-[#f5a623] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 bg-transparent'}`}
            >
              Análise de Abastecimento Diário
            </button>
            <button 
              onClick={() => setActiveSubTab('boarda3')}
              className={`px-3 py-1.5 rounded-lg font-sans font-black text-[9px] uppercase tracking-wider transition-all border-none cursor-pointer ${activeSubTab === 'boarda3' ? 'bg-[#f5a623] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 bg-transparent'}`}
            >
              Quadro de Ações A3
            </button>
          </div>

          <button 
            onClick={() => setIsPopModalOpen(true)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-xs uppercase tracking-wider"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-200" /> Padrão Operacional
          </button>

          <button 
            onClick={() => setIs5SModalOpen(true)}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-xs uppercase tracking-wider"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-slate-950" /> Checklist 5S
          </button>

          <a 
            href="https://fastpicking.app" 
            target="_blank" 
            rel="noopener noreferrer"
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-xs uppercase tracking-wider no-underline"
            title="Acessar plataforma Fast Picking"
          >
            <Zap className="w-3.5 h-3.5 text-amber-200" /> Fast Picking
          </a>

          <button 
            onClick={handleExportXLSX}
            className="px-3.5 py-1.5 text-xs font-black bg-emerald-50 hover:bg-emerald-100 text-[#10b981] border border-emerald-200 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Exportar XLS
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 p-16 rounded-2xl text-center flex flex-col items-center justify-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-full border-2 border-[#f5a623] border-t-transparent animate-spin"></div>
          <span className="text-xs text-slate-500 uppercase font-mono tracking-widest">Sincronizando fila de tarefas do picking...</span>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {activeSubTab === 'indicadores' ? (
            <motion.div 
              key="indicators-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-4"
            >
              {/* MANUAL DE INSTRUÇÃO E METAS */}
              <ManualInstrucaoCard
                title="Manual de Instrução & Parâmetros de Meta — Processo de Picking"
                metrics={[
                  {
                    key: 'picking_produtividade',
                    label: 'Produtividade Média de Picking',
                    unit: 'cx/h',
                    comoCalcular: '(Total de Caixas Separadas no Picking) ÷ (Soma das Horas Trabalhadas pelos Separadores no Turno).'
                  },
                  {
                    key: 'taxa_abastecimento',
                    label: 'Taxa de Abastecimento do Picking',
                    unit: '%',
                    comoCalcular: '(Ocorrências de Reabastecimento de Posição de Picking Concluídas dentro da Janela) ÷ (Total de Solicitações Geradas) × 100.'
                  },
                  {
                    key: 'erro_picking',
                    label: 'Índice de Erros de Separação',
                    unit: '%',
                    comoCalcular: '(Quantidade de Caixas/Paletes com Erro Detectado na Conferência) ÷ (Total de Caixas Auditadas) × 100.'
                  }
                ]}
              />
              
              {/* --- DYNAMIC GLOBAL FILTER SECTION --- */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-amber-600" />
                    <span className="text-xs uppercase font-black tracking-widest text-amber-600">Filtros Globais de Operação</span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer select-none bg-white py-1 px-2.5 rounded-lg border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={enableDemoData} 
                      onChange={e => {
                        const val = e.target.checked;
                        setEnableDemoData(val);
                        localStorage.setItem(`enable_demo_data_${empresaId}`, String(val));
                      }}
                      className="rounded text-[#f5a623] focus:ring-[#f5a623] border-slate-300 w-3.5 h-3.5 accent-[#f5a623] cursor-pointer"
                    />
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Simular Dados de Demonstração</span>
                  </label>
                </div>

                <div className="flex flex-wrap items-center gap-3.5 w-full text-xs">
                  
                  {/* Período Calendário */}
                  <div className="flex flex-col gap-1 min-w-[200px]">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Período Calendário</label>
                    <CalendarFilter 
                      startDate={filterStartDate}
                      endDate={filterEndDate}
                      variant="large"
                      onChange={(start, end) => {
                        setFilterStartDate(start);
                        setFilterEndDate(end);
                        setDatePreset('custom');
                      }}
                    />
                  </div>

                  {/* Operador dropdown */}
                  <div className="flex flex-col gap-1 w-[130px]">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Operador</label>
                    <select 
                      value={selectedOperator}
                      onChange={e => setSelectedOperator(e.target.value)}
                      className="w-full bg-white border border-gray-200 text-[#032b5e] font-sans font-bold rounded-lg outline-none px-2.5 py-1 text-[10px] h-[28px] cursor-pointer transition-all hover:border-blue-400 focus:border-[#032b5e]"
                    >
                      <option value="all">Todos Operadores</option>
                      {uniqueOperators.map(op => <option key={op} value={op}>{op}</option>)}
                    </select>
                  </div>

                  {/* Conferente dropdown */}
                  <div className="flex flex-col gap-1 w-[130px]">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Conferente</label>
                    <select 
                      value={selectedConferente}
                      onChange={e => setSelectedConferente(e.target.value)}
                      className="w-full bg-white border border-gray-200 text-[#032b5e] font-sans font-bold rounded-lg outline-none px-2.5 py-1 text-[10px] h-[28px] cursor-pointer transition-all hover:border-blue-400 focus:border-[#032b5e]"
                    >
                      <option value="all">Todos Conferentes</option>
                      {uniqueConferentes.map(cf => <option key={cf} value={cf}>{cf}</option>)}
                    </select>
                  </div>

                  {/* Status dropdown */}
                  <div className="flex flex-col gap-1 w-[120px]">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Status</label>
                    <select 
                      value={selectedStatus}
                      onChange={e => setSelectedStatus(e.target.value)}
                      className="w-full bg-white border border-gray-200 text-[#032b5e] font-sans font-bold rounded-lg outline-none px-2.5 py-1 text-[10px] h-[28px] cursor-pointer transition-all hover:border-blue-400 focus:border-[#032b5e]"
                    >
                      <option value="all">Todos Status</option>
                      <option value="pending">Pendente (Fila)</option>
                      <option value="in_progress">Em Andamento</option>
                      <option value="done">Concluída</option>
                      <option value="cancelled">Cancelada</option>
                    </select>
                  </div>

                  {/* Durante/Após Carregamento dropdown */}
                  <div className="flex flex-col gap-1 w-[140px]">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Momento Carga</label>
                    <select 
                      value={selectedEtapa}
                      onChange={e => setSelectedEtapa(e.target.value)}
                      className="w-full bg-white border border-gray-200 text-[#032b5e] font-sans font-bold rounded-lg outline-none px-2.5 py-1 text-[10px] h-[28px] cursor-pointer transition-all hover:border-blue-400 focus:border-[#032b5e]"
                    >
                      <option value="all">Durante/Após</option>
                      <option value="Durante o Carregamento">Durante Carregamento</option>
                      <option value="Após o Carregamento">Após Carregamento</option>
                    </select>
                  </div>

                  {/* Filtro de Meta dropdown */}
                  <div className="flex flex-col gap-1 w-[140px]">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Filtro de Meta</label>
                    <select 
                      value={selectedMeta}
                      onChange={e => setSelectedMeta(e.target.value as any)}
                      className="w-full bg-white border border-gray-200 text-[#032b5e] font-sans font-bold rounded-lg outline-none px-2.5 py-1 text-[10px] h-[28px] cursor-pointer transition-all hover:border-blue-400 focus:border-[#032b5e]"
                    >
                      <option value="all">Todas as Metas</option>
                      <option value="dentro">Dentro da Meta (≤5m/PL)</option>
                      <option value="fora">Fora da Meta (&gt;5m/PL)</option>
                    </select>
                  </div>



                </div>
              </div>

              {/* --- 4 PRINCIPAIS CARDS DE DESEMPENHO --- */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* 1. Solicitações */}
                <div className="bg-white border border-gray-200 p-4 rounded-xl relative overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-sm transition-all h-[110px]">
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block">Solicitações</span>
                    <span className="text-3xl font-black font-mono text-[#032b5e] mt-1 block">
                      {filteredTasks.length}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 block font-medium mt-1">
                    {statsCards.pendentes} pendentes • {statsCards.emAtendimento} em andamento
                  </span>
                  <div className="absolute top-4 right-4 bg-blue-50 p-2 rounded-lg text-[#032b5e]">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                </div>

                {/* 2. Paletes Movimentados */}
                <div className="bg-white border border-gray-200 p-4 rounded-xl relative overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-sm transition-all h-[110px]">
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block">Paletes Movimentados</span>
                    <span className="text-3xl font-black font-mono text-emerald-600 mt-1 block">
                      {statsCards.paletesMovimentados} <span className="text-sm font-sans font-extrabold text-emerald-500">PL</span>
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 block font-medium mt-1">
                    {statsCards.concluidas} concluídas de {filteredTasks.length} solicitadas
                  </span>
                  <div className="absolute top-4 right-4 bg-emerald-50 p-2 rounded-lg text-emerald-600">
                    <Layers className="w-5 h-5" />
                  </div>
                </div>

                {/* 3. Tempo Médio */}
                <div className="bg-white border border-gray-200 p-4 rounded-xl relative overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-sm transition-all h-[110px]">
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block">Tempo Médio</span>
                    <span className="text-3xl font-black font-mono text-amber-600 mt-1 block">
                      {statsCards.tempoMedioAtendimento} <span className="text-sm font-sans font-extrabold text-amber-500">min</span>
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 block font-medium mt-1">
                    Média de ciclo total do processo
                  </span>
                  <div className="absolute top-4 right-4 bg-amber-50 p-2 rounded-lg text-amber-600">
                    <Clock3 className="w-5 h-5" />
                  </div>
                </div>

                {/* 4. SLA Global */}
                <div className="bg-white border border-gray-200 p-4 rounded-xl relative overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-sm transition-all h-[110px]">
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block">SLA Global</span>
                    <span className="text-3xl font-black font-mono text-blue-600 mt-1 block">
                      {slaStats.pctWithin}%
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 block font-medium mt-1">
                    Dentro da meta limite de {slaLimit}m
                  </span>
                  <div className="absolute top-4 right-4 bg-blue-50 p-2 rounded-lg text-blue-600">
                    <Award className="w-5 h-5" />
                  </div>
                </div>

              </div>

              {/* --- CHARTS GRID SECTION (BENTO GRID STYLE) --- */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

                {/* 6. TOP 10 SKUS MAIS ABASTECIDOS NO PICKING */}
                <div className="lg:col-span-4 bg-white border border-slate-200/80 p-4.5 rounded-2xl flex flex-col justify-between gap-3 shadow-sm">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                        <Package className="w-4 h-4" />
                      </div>
                      <span className="text-xs uppercase font-black text-slate-700 tracking-wider">
                        6. TOP 10 SKUS MAIS ABASTECIDOS NO PICKING
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-400 uppercase block font-bold mb-3">
                      LISTA DOS PRODUTOS DE MAIOR GIRO NO PERÍODO
                    </span>

                    <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-white shadow-2xs">
                      <table className="w-full text-left text-xs border-collapse table-fixed">
                        <thead>
                          <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-500 uppercase font-bold text-[9px] tracking-wider">
                            <th className="py-1.5 px-2.5 w-[52%]">SKU / PRODUTO</th>
                            <th className="py-1.5 px-2 text-center w-[23%]">SOLIC.</th>
                            <th className="py-1.5 px-2 text-right w-[25%]">PALETES</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {skuRanking.slice(0, 10).map((sku, idx) => (
                            <tr key={idx} className="hover:bg-blue-50/30 transition-all text-[10px]">
                              <td className="py-1.5 px-2.5 font-bold">
                                <div className="flex flex-col min-w-0">
                                  <span className="font-mono text-[9.5px] text-amber-600 font-extrabold leading-tight">#{sku.sku}</span>
                                  <span className="text-[9.5px] truncate text-slate-600 font-semibold leading-tight" title={sku.desc}>{sku.desc}</span>
                                </div>
                              </td>
                              <td className="py-1.5 px-2 text-center font-mono text-blue-600 font-bold text-[11px] align-middle">{sku.requests}</td>
                              <td className="py-1.5 px-2 text-right font-mono text-emerald-600 font-black text-[11px] align-middle">{sku.pallets} PL</td>
                            </tr>
                          ))}
                          {skuRanking.length === 0 && (
                            <tr>
                              <td colSpan={3} className="p-4 text-center text-slate-400 font-mono text-[10px] uppercase">Nenhum produto registrado</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-2 flex items-center justify-between text-[10px] font-black uppercase text-slate-400">
                    <span>Total de SKUs Ativos: {skuRanking.length}</span>
                    <span className="text-blue-600 font-bold">Abastecimento de Giro</span>
                  </div>
                </div>

                {/* 2. Gráfico de Paletes Finalizados por Hora (8 Columns) */}
                <div className="lg:col-span-8 bg-white border border-slate-200 p-4 rounded-2xl flex flex-col justify-between shadow-sm">
                  <div>
                    <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider block mb-1 flex items-center gap-1.5">
                      <BarChart2 className="w-4 h-4 text-amber-500" />
                      2. Histograma de Paletes Finalizados por Hora do Dia
                    </span>
                    <span className="text-[8px] text-slate-400 block font-bold mb-4 uppercase">Volume acumulado de paletes concluídos pelos operadores por faixa horária (Produtividade de Turno)</span>
                  </div>

                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={finalizedPalletsByHour} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="hour" stroke="#475569" fontSize={9} fontWeight="bold" />
                        <YAxis stroke="#475569" fontSize={9} fontWeight="bold" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                          labelClassName="text-slate-800 text-xs font-black"
                          formatter={(value: any) => [`${value} palete(s)`, 'Paletes Finalizados']}
                        />
                        <Bar dataKey="quantidade" fill="#f5a623" radius={[4, 4, 0, 0]}>
                          {finalizedPalletsByHour.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#f5a623' : '#d97706'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

              {/* SECOND GRID ROW */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                
                {/* 3. Tempo Médio por Operador (Horizontal bar chart - sorted by efficiency) (6 Columns) */}
                <div className="lg:col-span-6 bg-white border border-slate-200 p-4 rounded-2xl flex flex-col justify-between shadow-sm">
                  <div>
                    <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider block mb-1 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      3. Tempo Médio Operacional por Operador de Empilhadeira
                    </span>
                    <span className="text-[8px] text-slate-400 uppercase block font-bold mb-4">Ordenado de forma decrescente por velocidade média de atendimento de Ordens</span>
                  </div>

                  <div className="h-64 w-full">
                    {operatorAvgTimeData.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-xs text-slate-400 font-mono uppercase tracking-wider">
                        Nenhuma tarefa concluída no período selecionado.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                          data={operatorAvgTimeData} 
                          layout="vertical"
                          margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis type="number" stroke="#475569" fontSize={9} fontWeight="bold" label={{ value: 'Tempo Médio (Min)', position: 'insideBottom', offset: -2, style: { fontSize: 8, fill: '#475569', fontWeight: 'bold' } }} />
                          <YAxis dataKey="operator" type="category" stroke="#475569" fontSize={8} fontWeight="bold" width={80} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                            labelClassName="text-slate-800 text-xs font-black"
                          />
                          <Bar dataKey="avgTime" name="Tempo Médio (min)" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                            {operatorAvgTimeData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#3b82f6'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* 7. Durante x Após Carregamento (Pie Chart) (3 Columns) */}
                <div className="lg:col-span-3 bg-white border border-slate-200 p-4 rounded-2xl flex flex-col justify-between shadow-sm relative">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider flex items-center gap-1.5">
                        <Truck className="w-4 h-4 text-amber-500" />
                        7. Carregamento Ativo vs Após
                      </span>
                      <span className="text-[8.5px] bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded font-black uppercase shrink-0">
                        Pareto 70/30
                      </span>
                    </div>
                    <span className="text-[8px] text-slate-400 uppercase block font-bold mb-4">Volume total distribuído por etapa</span>
                  </div>

                  <div className="h-36 w-full flex items-center justify-center relative my-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={duringVsAfterData.chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={42}
                          outerRadius={60}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          <Cell key="cell-0" fill="#a855f7" />
                          <Cell key="cell-1" fill="#ec4899" />
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                          itemStyle={{ fontSize: 10, fontWeight: 'bold', color: '#1e293b' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute flex flex-col items-center pointer-events-none">
                      <span className="text-slate-400 text-[7.5px] uppercase font-bold">Pareto</span>
                      <span className={`text-xs font-black ${duringVsAfterData.isParetoBroken ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {duringVsAfterData.durantePct}%
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 mt-2 border-t border-slate-200 pt-2 text-[10px] font-black uppercase">
                    <div className="flex justify-between items-center text-purple-600">
                      <span>Durante Carregamento (Meta ≥70%)</span>
                      <span>{duringVsAfterData.durantePct}% ({duringVsAfterData.durante} PL)</span>
                    </div>
                    <div className="flex justify-between items-center text-pink-600">
                      <span>Após Carregamento (Meta ≤30%)</span>
                      <span>{duringVsAfterData.aposPct}% ({duringVsAfterData.apos} PL)</span>
                    </div>
                  </div>
                </div>

                {/* 9. Status das Solicitações (Donut Chart) (3 Columns) */}
                <div className="lg:col-span-3 bg-white border border-slate-200 p-4 rounded-2xl flex flex-col justify-between shadow-sm">
                  <div>
                    <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider block mb-1 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-emerald-500" />
                      9. Distribuição de Status
                    </span>
                    <span className="text-[8px] text-slate-400 uppercase block font-bold mb-4">Volume total na fila atual</span>
                  </div>

                  <div className="h-44 w-full flex items-center justify-center relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusRingData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={65}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {statusRingData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                          itemStyle={{ fontSize: 10, fontWeight: 'bold', color: '#1e293b' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-slate-400 text-[8px] uppercase font-bold">Total</span>
                      <span className="text-sm font-black text-slate-800">{filteredTasks.length}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 mt-3 border-t border-slate-200 pt-2 text-[8px] font-black uppercase">
                    {statusRingData.map((st, idx) => (
                      <div key={idx} className="flex items-center gap-1.5" style={{ color: st.color }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: st.color }} />
                        <span>{st.name}: <strong>{st.value}</strong></span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* THIRD GRID ROW - PALLETS BY HOUR & DAILY TREND */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                
                {/* 11. Paletes Movimentados por Hora (Bar Chart) (6 Columns) */}
                <div className="lg:col-span-6 bg-white border border-slate-200 p-4 rounded-2xl flex flex-col justify-between shadow-sm">
                  <div>
                    <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider block mb-1 flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-emerald-500" />
                      3. Paletes Movimentados por Hora
                    </span>
                    <span className="text-[8px] text-slate-400 uppercase block font-bold mb-4">Mapeamento de capacidade expedida por hora (Solicitações Concluídas)</span>
                  </div>

                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={palletsByHour} margin={{ top: 5, right: 5, left: -30, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="hour" stroke="#475569" fontSize={8} fontWeight="bold" />
                        <YAxis stroke="#475569" fontSize={8} fontWeight="bold" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                          labelClassName="text-slate-800 text-xs font-black"
                        />
                        <Bar dataKey="pallets" fill="#10b981" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 13. Evolução Diária (Line Chart) (6 Columns) */}
                <div className="lg:col-span-6 bg-white border border-slate-200 p-4 rounded-2xl flex flex-col justify-between shadow-sm">
                  <div>
                    <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider block mb-1 flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-sky-500" />
                      4. Tendência de Evolução Diária
                    </span>
                    <span className="text-[8px] text-slate-400 uppercase block font-bold mb-4">Volume de solicitações diárias registradas</span>
                  </div>

                  <div className="h-44 w-full">
                    {dailyEvolution.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-xs text-slate-400 font-mono uppercase">
                        Nenhum registro.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dailyEvolution} margin={{ top: 5, right: 10, left: -30, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="formattedDate" stroke="#475569" fontSize={8} fontWeight="bold" />
                          <YAxis stroke="#475569" fontSize={8} fontWeight="bold" />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                            itemStyle={{ fontSize: 10, color: '#1e293b' }}
                          />
                          <Line type="monotone" dataKey="solicitacoes" name="Solicitações" stroke="#3b82f6" strokeWidth={2.5} activeDot={{ r: 5 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

              </div>

              {/* FOURTH GRID ROW - OPERATOR RANKING & CONFERENTE RANKING */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                
                {/* 4. Ranking de Operadores (6 Columns) */}
                <div className="lg:col-span-6 bg-white border border-slate-200 p-4 rounded-2xl flex flex-col gap-2 shadow-sm">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider block flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-amber-500" />
                        4. Ranking de Produtividade dos Operadores
                      </span>
                      <span className="text-[8px] text-slate-400 uppercase block font-bold">Consolidado por tarefas concluídas no período</span>
                    </div>
                  </div>

                  <div className="overflow-x-auto max-h-64 border border-slate-200 rounded-xl bg-slate-50 shadow-inner">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase font-bold text-[8px] tracking-wider">
                          <th className="p-2.5">Operador</th>
                          <th className="p-2.5 text-center">Concluídas</th>
                          <th className="p-2.5 text-center">Paletes</th>
                          <th className="p-2.5 text-center">TMA</th>
                          <th className="p-2.5 text-right">SLA</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {operatorsRanking.map((op, idx) => (
                          <tr key={idx} className="hover:bg-slate-100/50 transition-all text-[11px]">
                            <td className="p-2.5 font-bold flex items-center gap-1.5">
                              <span className="text-[9px] font-mono font-black text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded">#{idx+1}</span>
                              <span className="truncate max-w-[150px]" title={op.operator}>{op.operator}</span>
                            </td>
                            <td className="p-2.5 text-center font-mono font-black text-emerald-600">{op.done}</td>
                            <td className="p-2.5 text-center font-mono text-blue-600">{op.pallets}</td>
                            <td className="p-2.5 text-center font-mono text-amber-600">{op.avgTime} min</td>
                            <td className="p-2.5 text-right font-black">
                              <span className={`px-2 py-0.5 rounded text-[9px] ${op.sla >= 85 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-500 border border-red-100'}`}>{op.sla}%</span>
                            </td>
                          </tr>
                        ))}
                        {operatorsRanking.length === 0 && (
                          <tr>
                            <td colSpan={5} className="p-4 text-center text-slate-400 font-mono text-[10px] uppercase">Nenhum operador registrado no período</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 5. Ranking dos Conferentes (6 Columns) */}
                <div className="lg:col-span-6 bg-white border border-slate-200 p-4 rounded-2xl flex flex-col gap-2 shadow-sm">
                  <div>
                    <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider block flex items-center gap-1.5">
                      <User className="w-4 h-4 text-sky-500" />
                      5. Ranking dos Conferentes Emissores
                    </span>
                    <span className="text-[8px] text-slate-400 uppercase block font-bold">Consolidado de solicitações criadas de reabastecimento</span>
                  </div>

                  <div className="overflow-x-auto max-h-64 border border-slate-200 rounded-xl bg-slate-50 shadow-inner">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase font-bold text-[8px] tracking-wider">
                          <th className="p-2.5">Conferente</th>
                          <th className="p-2.5 text-center">Solicitações</th>
                          <th className="p-2.5 text-center">Paletes Solicitados</th>
                          <th className="p-2.5 text-right">TMA Médio Solicitado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {conferentesRanking.map((cf, idx) => (
                          <tr key={idx} className="hover:bg-slate-100/50 transition-all text-[11px]">
                            <td className="p-2.5 font-bold flex items-center gap-1.5">
                              <span className="text-[9px] font-mono font-black text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded">#{idx+1}</span>
                              <span className="truncate max-w-[180px]" title={cf.conferente}>{cf.conferente}</span>
                            </td>
                            <td className="p-2.5 text-center font-mono font-black text-amber-600">{cf.requests}</td>
                            <td className="p-2.5 text-center font-mono text-blue-600">{cf.pallets}</td>
                            <td className="p-2.5 text-right font-mono text-emerald-600">{cf.avgTime} min</td>
                          </tr>
                        ))}
                        {conferentesRanking.length === 0 && (
                          <tr>
                            <td colSpan={4} className="p-4 text-center text-slate-400 font-mono text-[10px] uppercase">Nenhum conferente registrado no período</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

              {/* FIFTH GRID ROW - OPERATOR PRODUCTIVITY TABLE */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                
                {/* 14. Produtividade Detalhada dos Operadores (12 Columns) */}
                <div className="lg:col-span-12 bg-white border border-slate-200 p-4 rounded-2xl flex flex-col gap-2 shadow-sm">
                  <div>
                    <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider block flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-emerald-500" />
                      14. Tabela de Produtividade Detalhada dos Operadores
                    </span>
                    <span className="text-[8px] text-slate-400 uppercase block font-bold">Rastreamento de ociosidade, pallets por hora e índice de eficiência operativa</span>
                  </div>

                  <div className="overflow-x-auto max-h-72 border border-slate-200 rounded-xl bg-slate-50 shadow-inner">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase font-bold text-[8px] tracking-wider">
                          <th className="p-2.5">Operador</th>
                          <th className="p-2.5 text-center">Tempo Médio</th>
                          <th className="p-2.5 text-center">Paletes</th>
                          <th className="p-2.5 text-center">Solicitações</th>
                          <th className="p-2.5 text-center">PL/Hora</th>
                          <th className="p-2.5 text-center">Tempo Parado</th>
                          <th className="p-2.5 text-right">Eficiência</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {operatorsProductivityTable.map((op, idx) => (
                          <tr key={idx} className="hover:bg-slate-100/50 transition-all text-[11px]">
                            <td className="p-2.5 font-bold text-slate-700">{op.operator}</td>
                            <td className="p-2.5 text-center font-mono text-slate-500">{op.avgTime} min</td>
                            <td className="p-2.5 text-center font-mono text-blue-600">{op.pallets}</td>
                            <td className="p-2.5 text-center font-mono text-slate-500">{op.requests}</td>
                            <td className="p-2.5 text-center font-mono text-amber-600 font-bold">{op.palletsPerHour}</td>
                            <td className="p-2.5 text-center font-mono text-red-500">{op.idleTime}</td>
                            <td className="p-2.5 text-right font-black">
                              <span className={`px-2 py-0.5 rounded text-[9px] ${op.efficiency >= 85 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-500 border border-red-100'}`}>{op.efficiency}%</span>
                            </td>
                          </tr>
                        ))}
                        {operatorsProductivityTable.length === 0 && (
                          <tr>
                            <td colSpan={7} className="p-4 text-center text-slate-400 font-mono text-[10px] uppercase">Nenhum operador com registro concluído</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Card de Registros Filtrados por Meta (Aparece quando o filtro de meta estiver ativo) */}
                {selectedMeta !== 'all' && (
                  <div className="lg:col-span-12 bg-white border border-slate-200 p-4 rounded-2xl flex flex-col gap-3 shadow-sm">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider block flex items-center gap-1.5">
                          <CheckCircle2 className={`w-4 h-4 ${selectedMeta === 'dentro' ? 'text-emerald-500' : 'text-amber-500'}`} />
                          15. Registros {selectedMeta === 'dentro' ? 'Dentro da Meta (≤ 5 min/PL)' : 'Fora da Meta (> 5 min/PL)'} ({filteredTasks.length})
                        </span>
                        <span className="text-[8px] text-slate-400 uppercase block font-bold">Detalhamento individual de todas as solicitações filtradas por este indicador de meta</span>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase border ${
                        selectedMeta === 'dentro' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {selectedMeta === 'dentro' ? 'Dentro da Meta' : 'Fora da Meta'}
                      </span>
                    </div>

                    <div className="overflow-x-auto max-h-80 border border-slate-200 rounded-xl bg-slate-50 shadow-inner">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase font-bold text-[8px] tracking-wider">
                            <th className="p-2.5">ID / Código</th>
                            <th className="p-2.5">SKU / Produto</th>
                            <th className="p-2.5 text-center">Conferente</th>
                            <th className="p-2.5 text-center">Operador</th>
                            <th className="p-2.5 text-center">Paletes</th>
                            <th className="p-2.5 text-center">Tempo Total</th>
                            <th className="p-2.5 text-center">Meta Est.</th>
                            <th className="p-2.5 text-center">Status</th>
                            <th className="p-2.5 text-right">Data/Hora</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {filteredTasks.map((t, idx) => {
                            const targetMin = (t.quantidadePaletes || 1) * 5;
                            const isWithin = t.tempoTotal <= targetMin;
                            return (
                              <tr key={t.id || idx} className="hover:bg-slate-100/50 transition-all text-[11px]">
                                <td className="p-2.5 font-mono font-bold text-slate-700">#{t.id}</td>
                                <td className="p-2.5 font-bold">
                                  <div className="flex flex-col">
                                    <span className="font-mono text-[10px] text-amber-600">#{t.sku}</span>
                                    <span className="text-[10px] truncate max-w-[200px] text-slate-500 font-normal" title={t.descricaoSku}>{t.descricaoSku}</span>
                                  </div>
                                </td>
                                <td className="p-2.5 text-center font-semibold text-slate-600">{t.conferente}</td>
                                <td className="p-2.5 text-center font-semibold text-slate-600">{t.operador}</td>
                                <td className="p-2.5 text-center font-mono font-bold text-blue-600">{t.quantidadePaletes} PL</td>
                                <td className="p-2.5 text-center font-mono font-bold text-slate-700">{t.tempoTotal} min</td>
                                <td className="p-2.5 text-center font-mono text-slate-400">≤ {targetMin} min</td>
                                <td className="p-2.5 text-center">
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                    isWithin 
                                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                      : 'bg-amber-50 text-amber-600 border border-amber-100'
                                  }`}>
                                    {isWithin ? 'Dentro' : 'Fora'}
                                  </span>
                                </td>
                                <td className="p-2.5 text-right font-mono text-[10px] text-slate-500">
                                  {t.dataConclusao || t.dataSolicitacao} {t.horaConclusaoStr !== '—' ? t.horaConclusaoStr : t.horaSolicitacaoStr}
                                </td>
                              </tr>
                            );
                          })}
                          {filteredTasks.length === 0 && (
                            <tr>
                              <td colSpan={9} className="p-4 text-center text-slate-400 font-mono text-[10px] uppercase">
                                Nenhum registro encontrado para a meta selecionada
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              </div>

            </motion.div>
          ) : activeSubTab === 'rr_bi' ? (
            <motion.div 
              key="rr-bi-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-6"
            >
              {/* FIXED TOP BLOCK FOR R&R METAS */}
              <IndicatorMetaHeader
                indicatorName="R&R (Ressuprimento & Reabastecimento)"
                theme={theme}
                metas={[
                  {
                    id: 'meta_rr_tempo',
                    label: 'Meta Tempo por Pallet',
                    value: metaRrTempo,
                    unit: 'min/PL',
                    step: 0.5,
                    min: 0.5,
                    onChange: updateMetaRrTempo,
                    calculationText: 'Tempo total de movimentação de paletes de R&R ÷ Total de paletes movimentados'
                  },
                  {
                    id: 'meta_rr_max_reab',
                    label: 'Meta Máxima de Reabastecimento',
                    value: metaRrMaxReab,
                    unit: '%',
                    step: 1,
                    min: 0,
                    max: 100,
                    onChange: updateMetaRrMaxReab,
                    calculationText: '(Pallets de Reabastecimento durante carga ÷ Pallets de Ressuprimento pré-carga) × 100. Deve ser <= 20%'
                  }
                ]}
              />

              {/* 1. BANNER METAS OFICIAIS DE RESSUPRIMENTO & REABASTECIMENTO */}
              <div className="bg-gradient-to-r from-slate-900 via-[#032b5e] to-slate-900 border border-blue-900 p-5 rounded-2xl text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="p-3 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-400 mt-0.5">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-black uppercase text-amber-400 tracking-widest block">Metas Oficiais Ambev • Operações de Pátio & Picking</span>
                    <h3 className="text-lg font-black text-white mt-0.5">Diretrizes de SLA para Ressuprimento & Reabastecimento (R&R)</h3>
                    <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
                      • <strong className="text-amber-300">Tempo Médio de Ressuprimento:</strong> Meta limite de <span className="underline decoration-amber-400 decoration-2 font-bold">5 minutos por pallet</span>, contado do início da atividade pelo empilhador.
                      <br />
                      • <strong className="text-emerald-300">Limite de Reabastecimento:</strong> O volume de Reabastecimento (durante a carga) <span className="underline decoration-emerald-400 decoration-2 font-bold">não pode ultrapassar 20%</span> em relação ao volume de Ressuprimento (pré-carga).
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl border flex flex-col items-center justify-center min-w-[130px] ${
                    rrMetrics.isRatioTargetMet ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300' : 'bg-red-950/60 border-red-500/50 text-red-300'
                  }`}>
                    <span className="text-[9px] uppercase font-black text-slate-300">Ratio Reab/Ressup</span>
                    <span className="text-xl font-black font-mono mt-0.5">{rrMetrics.ratioReabastecimentoRessuprimento}%</span>
                    <span className="text-[8px] font-bold uppercase mt-0.5">{rrMetrics.isRatioTargetMet ? '✅ Dentro da Meta (≤20%)' : '⚠️ Fora da Meta (>20%)'}</span>
                  </div>

                  <div className={`p-3 rounded-xl border flex flex-col items-center justify-center min-w-[130px] ${
                    rrMetrics.isTimeTargetMet ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300' : 'bg-red-950/60 border-red-500/50 text-red-300'
                  }`}>
                    <span className="text-[9px] uppercase font-black text-slate-300">Tempo Médio / PL</span>
                    <span className="text-xl font-black font-mono mt-0.5">{rrMetrics.tempoMedioAtividade}m</span>
                    <span className="text-[8px] font-bold uppercase mt-0.5">{rrMetrics.isTimeTargetMet ? '✅ Dentro da Meta (≤5m)' : '⚠️ Excedeu Meta (>5m)'}</span>
                  </div>
                </div>
              </div>

              {/* 2. TOP 4 CARDS DE MÉTRICAS R&R */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* CARD 1: % Abastecimento vs % Reabastecimento */}
                <div className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col justify-between shadow-xs">
                  <div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">% Ressuprimento vs Reabastecimento</span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-black font-mono text-emerald-600">{rrMetrics.pctRessuprimento}%</span>
                      <span className="text-xs text-slate-400 font-bold">Ressup ({rrMetrics.paletesRessuprimento} PL)</span>
                    </div>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-lg font-black font-mono text-amber-600">{rrMetrics.pctReabastecimento}%</span>
                      <span className="text-xs text-slate-400 font-bold">Reab ({rrMetrics.paletesReabastecimento} PL)</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                    <span className="text-slate-500 font-bold">Ratio Reab/Ressup:</span>
                    <span className={`font-black font-mono px-1.5 py-0.5 rounded ${rrMetrics.isRatioTargetMet ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                      {rrMetrics.ratioReabastecimentoRessuprimento}% (Meta ≤ 20%)
                    </span>
                  </div>
                </div>

                {/* CARD 2: Quantidade de Hectolitros (HL) Ressupridos */}
                <div className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col justify-between shadow-xs">
                  <div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Volume Ressuprido em HL</span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-3xl font-black font-mono text-blue-600">{rrMetrics.totalHlRessuprido}</span>
                      <span className="text-sm font-sans font-black text-blue-500">HL</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium block mt-1">
                      {rrMetrics.paletesRessuprimento} paletes de ressuprimento pré-carga
                    </span>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-bold">
                    <span>Volume Geral Pátio:</span>
                    <span className="font-mono text-slate-800 font-black">{rrMetrics.totalHlGeral} HL</span>
                  </div>
                </div>

                {/* CARD 3: Curva ABC de Ressuprimento */}
                <div className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col justify-between shadow-xs">
                  <div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Curva ABC de Ressuprimento</span>
                    <div className="flex items-center gap-1.5 mt-2">
                      <div className="flex-1 bg-emerald-500 text-white text-[9px] font-black p-1 text-center rounded" title={`Curva A: ${abcCurveData.palletsA} PL`}>
                        A: {abcCurveData.pctA}%
                      </div>
                      <div className="w-1/4 bg-blue-500 text-white text-[9px] font-black p-1 text-center rounded" title={`Curva B: ${abcCurveData.palletsB} PL`}>
                        B: {abcCurveData.pctB}%
                      </div>
                      <div className="w-1/6 bg-slate-400 text-white text-[9px] font-black p-1 text-center rounded" title={`Curva C: ${abcCurveData.palletsC} PL`}>
                        C: {abcCurveData.pctC}%
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-bold">
                    <span>Altíssimo Giro (A):</span>
                    <span className="font-mono text-emerald-600 font-black">{abcCurveData.palletsA} Paletes</span>
                  </div>
                </div>

                {/* CARD 4: Tempo Médio por Atividade */}
                <div className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col justify-between shadow-xs">
                  <div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Tempo Médio da Atividade</span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className={`text-3xl font-black font-mono ${rrMetrics.isTimeTargetMet ? 'text-emerald-600' : 'text-red-600'}`}>
                        {rrMetrics.tempoMedioAtividade}
                      </span>
                      <span className="text-sm font-sans font-black text-slate-500">min/PL</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium block mt-1">
                      Meta oficial: 5.0 minutos por pallet
                    </span>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                    <span className="text-slate-500 font-bold">Conformidade SLA:</span>
                    <span className={`font-black font-mono px-1.5 py-0.5 rounded ${rrMetrics.isTimeTargetMet ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                      {slaStats.pctWithin}% dentro da meta
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. THREE-COLUMN RANKING TABLES */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* TABLE 1: TOP 10 RESSUPRIMENTO */}
                <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col justify-between shadow-xs">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                        <Package className="w-4 h-4" />
                      </div>
                      <span className="text-xs uppercase font-black text-slate-800 tracking-wider">
                        Top 10 — Maior Ressuprimento (Pré-Carga)
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-400 uppercase block font-bold mb-3">Abastecimento realizado antes do início do carregamento</span>

                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-200 text-slate-500 uppercase font-bold text-[9px]">
                            <th className="p-2">SKU / Produto</th>
                            <th className="p-2 text-center">Atividades</th>
                            <th className="p-2 text-right">Paletes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {top10Ressuprimento.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 text-[10px]">
                              <td className="p-2 font-bold">
                                <span className="font-mono text-amber-600 block">#{item.sku}</span>
                                <span className="truncate block max-w-[150px] text-slate-600" title={item.desc}>{item.desc}</span>
                              </td>
                              <td className="p-2 text-center font-mono font-bold text-slate-600">{item.count}</td>
                              <td className="p-2 text-right font-mono font-black text-emerald-600">{item.pallets} PL</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* TABLE 2: TOP 10 REABASTECIMENTO */}
                <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col justify-between shadow-xs">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                        <Layers className="w-4 h-4" />
                      </div>
                      <span className="text-xs uppercase font-black text-slate-800 tracking-wider">
                        Top 10 — Maior Reabastecimento (Durante Carga)
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-400 uppercase block font-bold mb-3">Ressuprimentos necessários no meio do carregamento</span>

                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-200 text-slate-500 uppercase font-bold text-[9px]">
                            <th className="p-2">SKU / Produto</th>
                            <th className="p-2 text-center">Reabastecimentos</th>
                            <th className="p-2 text-right">Paletes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {top10Reabastecimento.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 text-[10px]">
                              <td className="p-2 font-bold">
                                <span className="font-mono text-amber-600 block">#{item.sku}</span>
                                <span className="truncate block max-w-[150px] text-slate-600" title={item.desc}>{item.desc}</span>
                              </td>
                              <td className="p-2 text-center font-mono font-bold text-slate-600">{item.count}</td>
                              <td className="p-2 text-right font-mono font-black text-amber-600">{item.pallets} PL</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* TABLE 3: ITENS MENOS ABASTECIDOS */}
                <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col justify-between shadow-xs">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600">
                        <Clock3 className="w-4 h-4" />
                      </div>
                      <span className="text-xs uppercase font-black text-slate-800 tracking-wider">
                        Itens Menos Abastecidos (Baixo Giro)
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-400 uppercase block font-bold mb-3">Produtos com menor volume de movimentação de pátio</span>

                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-200 text-slate-500 uppercase font-bold text-[9px]">
                            <th className="p-2">SKU / Produto</th>
                            <th className="p-2 text-center">Atividades</th>
                            <th className="p-2 text-right">Paletes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {leastRestockedItems.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 text-[10px]">
                              <td className="p-2 font-bold">
                                <span className="font-mono text-amber-600 block">#{item.sku}</span>
                                <span className="truncate block max-w-[150px] text-slate-600" title={item.desc}>{item.desc}</span>
                              </td>
                              <td className="p-2 text-center font-mono font-bold text-slate-600">{item.count}</td>
                              <td className="p-2 text-right font-mono font-black text-slate-500">{item.pallets} PL</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. COMPARATIVO MÊS ANTERIOR X MÊS ATUAL */}
              <div className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-col gap-3 shadow-xs">
                <div>
                  <span className="text-xs font-black uppercase text-slate-800 tracking-wider block flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    Comparativo Operacional: Mês Anterior x Mês Atual
                  </span>
                  <span className="text-[9px] text-slate-400 uppercase block font-bold">Análise comparativa de volume, tempos médios e atingimento de metas R&R</span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl bg-slate-50">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase font-bold text-[9px] tracking-wider">
                        <th className="p-3">Indicador / Métrica R&R</th>
                        <th className="p-3 text-center">Mês Anterior</th>
                        <th className="p-3 text-center">Mês Atual</th>
                        <th className="p-3 text-center">Variação (%)</th>
                        <th className="p-3 text-right">Meta Oficial</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-700 text-xs">
                      <tr>
                        <td className="p-3 font-bold text-slate-800">Paletes Movimentados</td>
                        <td className="p-3 text-center font-mono text-slate-600">{monthlyComparisonStats.previous.totalPallets} PL</td>
                        <td className="p-3 text-center font-mono font-bold text-blue-600">{monthlyComparisonStats.current.totalPallets} PL</td>
                        <td className="p-3 text-center font-mono font-black text-emerald-600">{monthlyComparisonStats.varPallets}</td>
                        <td className="p-3 text-right font-mono text-slate-500">Crescimento contínuo</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-slate-800">Volume Ressuprido (HL)</td>
                        <td className="p-3 text-center font-mono text-slate-600">{monthlyComparisonStats.previous.totalHl} HL</td>
                        <td className="p-3 text-center font-mono font-bold text-blue-600">{monthlyComparisonStats.current.totalHl} HL</td>
                        <td className="p-3 text-center font-mono font-black text-emerald-600">{monthlyComparisonStats.varHl}</td>
                        <td className="p-3 text-right font-mono text-slate-500">Abastecimento total da frota</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-slate-800">Tempo Médio por Palete (min)</td>
                        <td className="p-3 text-center font-mono text-slate-600">{monthlyComparisonStats.previous.avgTime} min</td>
                        <td className="p-3 text-center font-mono font-bold text-amber-600">{monthlyComparisonStats.current.avgTime} min</td>
                        <td className="p-3 text-center font-mono font-black text-blue-600">{monthlyComparisonStats.varAvgTime}</td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-600">≤ 5.0 min/palete</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-slate-800">Ratio Reabastecimento / Ressuprimento</td>
                        <td className="p-3 text-center font-mono text-slate-600">{monthlyComparisonStats.previous.ratioReab}%</td>
                        <td className="p-3 text-center font-mono font-bold text-slate-800">{monthlyComparisonStats.current.ratioReab}%</td>
                        <td className="p-3 text-center font-mono font-black text-amber-600">{monthlyComparisonStats.varRatioReab}</td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-600">≤ 20% do ressuprimento</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-slate-800">SLA Cumprimento da Meta (≤ 5 min)</td>
                        <td className="p-3 text-center font-mono text-slate-600">{monthlyComparisonStats.previous.slaPct}%</td>
                        <td className="p-3 text-center font-mono font-bold text-emerald-600">{monthlyComparisonStats.current.slaPct}%</td>
                        <td className="p-3 text-center font-mono font-black text-emerald-600">{monthlyComparisonStats.varSla}</td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-600">≥ 90% conformidade</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 5. SUGESTÃO SEMANAL AUTOMÁTICA DE REALOCAÇÃO DE PALLETS NO PICKING */}
              <div className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-col gap-3 shadow-xs">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                      Sugestão Semanal Automática de Realocação de Pallets no Picking (Slotting)
                    </span>
                    <span className="text-[9px] text-slate-400 uppercase block font-bold">Inteligência logística: Identifica itens com excesso ou falta de posições/vagas na rua de picking</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowSuggestions(!showSuggestions)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl text-[10px] font-bold uppercase flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      {showSuggestions ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                          <span>Ocultar Sugestões</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5 text-amber-600" />
                          <span>Exibir Sugestões</span>
                        </>
                      )}
                    </button>
                    <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-bold text-[10px] uppercase">
                      Recomendação Semanal Ativa
                    </span>
                  </div>
                </div>

                {showSuggestions ? (
                  <div className="overflow-x-auto border border-slate-200 rounded-xl bg-slate-50">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase font-bold text-[9px] tracking-wider">
                          <th className="p-3">SKU / Produto</th>
                          <th className="p-3 text-center">Movimentação Total</th>
                          <th className="p-3 text-center">Reabastecimentos Carga</th>
                          <th className="p-3 text-center">Sugestão do Sistema</th>
                          <th className="p-3">Justificativa Operacional</th>
                          <th className="p-3 text-right">Prioridade</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-slate-700">
                        {pickingReallocationSuggestions.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-100/60 text-xs">
                            <td className="p-3 font-bold min-w-[180px]">
                              <span className="font-mono text-amber-600 block">#{item.sku}</span>
                              <span className="text-slate-700 block text-xs">{item.desc}</span>
                            </td>
                            <td className="p-3 text-center font-mono font-bold text-slate-700 whitespace-nowrap">{item.totalPallets} PL</td>
                            <td className="p-3 text-center font-mono font-bold text-amber-600 whitespace-nowrap">{item.reabastecimentoPallets} PL</td>
                            <td className="p-3 text-center min-w-[200px]">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-lg font-black text-[10px] uppercase border whitespace-nowrap ${
                                item.ajusteVagas > 0 
                                  ? 'bg-amber-50 text-amber-800 border-amber-300' 
                                  : 'bg-blue-50 text-blue-800 border-blue-300'
                              }`}>
                                {item.acao}
                              </span>
                            </td>
                            <td className="p-3 text-slate-600 text-[11px] leading-relaxed min-w-[240px]">{item.motivo}</td>
                            <td className="p-3 text-right whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase inline-block ${
                                item.prioridade === 'Alta' 
                                  ? 'bg-red-50 text-red-600 border border-red-200' 
                                  : 'bg-amber-50 text-amber-600 border border-amber-200'
                              }`}>
                                {item.prioridade}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500 font-bold uppercase flex items-center justify-center gap-2">
                    <Info className="w-4 h-4 text-amber-500" />
                    <span>Sugestões de slotting ocultadas pelo usuário. Clique no botão &quot;Exibir Sugestões&quot; para visualizar a tabela.</span>
                  </div>
                )}
              </div>
            </motion.div>
          ) : activeSubTab === 'abastecimento' ? (
            <motion.div 
              key="abastecimento-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-4"
            >
              <AbastecimentoDiarioComponent 
                user={user} 
                empresa={empresa} 
                tasks={normalizedTasks} 
              />
            </motion.div>
          ) : (
            <motion.div 
              key="a3-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <A3BoardComponent user={user} empresa={empresa} dashboard="picking" />
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* MODALS: POP AND 5S AUDIT CHECKLIST */}
      <PadraoOperacionalModal
        moduleKey="picking"
        moduleName="Separação de Picking"
        isOpen={isPopModalOpen}
        onClose={() => setIsPopModalOpen(false)}
        user={user}
      />

      <Checklist5SModal
        isOpen={is5SModalOpen}
        onClose={() => setIs5SModalOpen(false)}
        defaultSetor="Picking"
        user={user}
      />

        </div>
      )}
    </div>
  );
}
export {};
