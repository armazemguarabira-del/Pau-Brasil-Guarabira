import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, addDoc, where } from 'firebase/firestore';
import { Usuario, Empresa, Tarefa } from '../types';
import { generateMockTarefas } from '../mockDataGenerator';
import { PRODUCTS } from '../planosData';
import A3BoardComponent from './A3BoardComponent';
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
  ChevronRight
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

export default function PickingDashboard({ user, empresa, onBack }: PickingDashboardProps) {
  const [actualTasks, setActualTasks] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'indicadores' | 'boarda3'>('indicadores');

  // Interactive Global Filters
  const [filterStartDate, setFilterStartDate] = useState<string>(() => {
    // Default to last 30 days
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [filterEndDate, setFilterEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [selectedOperator, setSelectedOperator] = useState<string>('all');
  const [selectedConferente, setSelectedConferente] = useState<string>('all');
  const [selectedSku, setSelectedSku] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedEtapa, setSelectedEtapa] = useState<string>('all');
  const [slaLimit, setSlaLimit] = useState<number>(15); // Configurable SLA target (default: 15 min)
  const [datePreset, setDatePreset] = useState<'today' | '7days' | '30days' | 'custom'>('30days');
  
  const empresaId = empresa?.id || 'demo';

  const tasks = useMemo(() => {
    const mockTasks = generateMockTarefas(empresaId);
    return [...actualTasks, ...mockTasks];
  }, [actualTasks, empresaId]);

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

    setLoading(true);
    const q = query(collection(db, 'tarefas'), where('empresaId', '==', empresaId));
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map(doc => ({ _docId: doc.id, ...doc.data() } as Tarefa));
      
      rows.sort((a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || ''));
      setActualTasks(rows);
      setLoading(false);
    }, (error) => {
      console.error("Error reading tasks:", error);
      setLoading(false);
    });

    return () => unsub();
  }, [empresaId]);

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

  // 1. Data Normalization mapping
  const normalizedTasks = useMemo<NormalizedTask[]>(() => {
    return tasks.map(t => {
      const dateObj = parseDateString(t.criadoEm);
      const dateAceiteObj = parseDateString(t.iniciadoEm);
      const dateConclusaoObj = parseDateString(t.finalizadoEm);

      const dataSolicitacao = dateObj ? dateObj.toISOString().split('T')[0] : '';
      const horaSolicitacao = dateObj ? dateObj.getHours() : 0;
      const horaSolicitacaoStr = dateObj ? dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—';

      const dataAceite = dateAceiteObj ? dateAceiteObj.toISOString().split('T')[0] : '';
      const horaAceite = dateAceiteObj ? dateAceiteObj.getHours() : 0;
      const horaAceiteStr = dateAceiteObj ? dateAceiteObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—';

      const dataConclusao = dateConclusaoObj ? dateConclusaoObj.toISOString().split('T')[0] : '';
      const horaConclusao = dateConclusaoObj ? dateConclusaoObj.getHours() : 0;
      const horaConclusaoStr = dateConclusaoObj ? dateConclusaoObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—';

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
        operador: t.operador || 'Sem Operador',
        sku: t.codigo || 0,
        descricaoSku: t.descricao || 'Sem Descrição',
        quantidadePaletes,
        etapa,
        rawTask: t
      };
    });
  }, [tasks]);

  // Unique filters lists extracted from live data
  const uniqueOperators = useMemo(() => Array.from(new Set(normalizedTasks.map(t => t.operador).filter(Boolean))).sort(), [normalizedTasks]);
  const uniqueConferentes = useMemo(() => Array.from(new Set(normalizedTasks.map(t => t.conferente).filter(Boolean))).sort(), [normalizedTasks]);
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
      if (selectedOperator !== 'all' && t.operador !== selectedOperator) return false;
      if (selectedConferente !== 'all' && t.conferente !== selectedConferente) return false;
      if (selectedSku !== 'all' && String(t.sku) !== selectedSku) return false;
      if (selectedStatus !== 'all' && t.status !== selectedStatus) return false;
      if (selectedEtapa !== 'all' && t.etapa !== selectedEtapa) return false;
      return true;
    });
  }, [normalizedTasks, filterStartDate, filterEndDate, selectedOperator, selectedConferente, selectedSku, selectedStatus, selectedEtapa]);

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

    // SLA of today's items or all filtered completed items
    const completedHoje = completedTasks.filter(t => t.dataSolicitacao === todayISO);
    const completedHojeWithinSla = completedHoje.filter(t => t.tempoTotal <= slaLimit).length;
    const slaHoje = completedHoje.length > 0 
      ? Math.round((completedHojeWithinSla / completedHoje.length) * 100) 
      : 100;

    const totalPaletes = filteredTasks.reduce((sum, t) => sum + t.quantidadePaletes, 0);
    const operadoresAtivos = new Set(filteredTasks.filter(t => t.status !== 'pending').map(t => t.operador)).size;

    return {
      solicHoje,
      pendentes,
      emAtendimento,
      concluidas,
      tempoMedioAtendimento,
      slaHoje,
      totalPaletes,
      operadoresAtivos
    };
  }, [filteredTasks, completedTasks, slaLimit]);

  // 2. SOLICITAÇÕES POR HORA
  const requestsByHour = useMemo(() => {
    const counts: Record<number, number> = {};
    for (let h = 7; h <= 21; h++) counts[h] = 0;
    filteredTasks.forEach(t => {
      const h = t.horaSolicitacao;
      if (h >= 7 && h <= 21) {
        counts[h] = (counts[h] || 0) + 1;
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
        if (t.tempoTotal <= slaLimit) {
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
  }, [filteredTasks]);

  // 6. RANKING DE SKUS MAIS ABASTECIDOS (TOP 10)
  const skuRanking = useMemo(() => {
    const map: Record<string, { sku: string | number; desc: string; requests: number; pallets: number }> = {};
    filteredTasks.forEach(t => {
      const key = String(t.sku);
      if (!map[key]) {
        map[key] = { sku: t.sku, desc: t.descricaoSku, requests: 0, pallets: 0 };
      }
      const entry = map[key];
      entry.requests += 1;
      entry.pallets += t.quantidadePaletes;
    });
    return Object.values(map)
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 10);
  }, [filteredTasks]);

  // 7. DURANTE X APÓS CARREGAMENTO
  const duringVsAfterData = useMemo(() => {
    let durante = 0;
    let apos = 0;
    filteredTasks.forEach(t => {
      if (t.etapa === 'Durante o Carregamento') durante += t.quantidadePaletes;
      else apos += t.quantidadePaletes;
    });
    const total = durante + apos || 1;
    return [
      { name: 'Durante Carregamento', value: durante, percentage: Math.round((durante / total) * 100) },
      { name: 'Após Carregamento', value: apos, percentage: Math.round((apos / total) * 100) }
    ];
  }, [filteredTasks]);

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

  // 11. PALETES MOVIMENTADOS POR HORA
  const palletsByHour = useMemo(() => {
    const counts: Record<number, number> = {};
    for (let h = 7; h <= 21; h++) counts[h] = 0;
    filteredTasks.forEach(t => {
      const h = t.horaSolicitacao;
      if (h >= 7 && h <= 21) {
        counts[h] = (counts[h] || 0) + t.quantidadePaletes;
      }
    });
    return Object.keys(counts).map(h => ({
      hour: `${h.padStart(2, '0')}h`,
      pallets: counts[Number(h)]
    }));
  }, [filteredTasks]);

  // 12. SLA % (GENERAL)
  const slaStats = useMemo(() => {
    const doneCount = completedTasks.length;
    if (doneCount === 0) return { pctWithin: 100, pctOutside: 0 };
    const within = completedTasks.filter(t => t.tempoTotal <= slaLimit).length;
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
    const operatorsList = ['MARIVALDO ARTHUR', 'RONILDO', 'PAULO PEREIRA', 'ALEXANDRE', 'GABRIEL JOSÉ'];
    const conferentesList = ['GILSON ROSA DA SILVA', 'MATHEUS', 'CARLOS OLIVEIRA'];
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
    <div id="picking-dashboard-wrapper" className="flex flex-col gap-4 text-slate-800 selection:bg-amber-100 selection:text-slate-950 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
      
      {/* 1. TOP HEADER BRAND AND SUBTAB TOGGLERS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white border-b border-slate-100 rounded-t-2xl -mx-6 -mt-6 gap-4">
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
              Indicadores & BI
            </button>
            <button 
              onClick={() => setActiveSubTab('boarda3')}
              className={`px-3 py-1.5 rounded-lg font-sans font-black text-[9px] uppercase tracking-wider transition-all border-none cursor-pointer ${activeSubTab === 'boarda3' ? 'bg-[#f5a623] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 bg-transparent'}`}
            >
              Quadro de Ações A3
            </button>
          </div>

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
              
              {/* --- DYNAMIC GLOBAL FILTER SECTION --- */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-amber-600" />
                    <span className="text-xs uppercase font-black tracking-widest text-amber-600">Filtros Globais de Operação</span>
                  </div>
                  
                  {/* Presets buttons */}
                  <div className="flex gap-1.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button 
                      onClick={() => setDatePreset('today')}
                      className={`px-2.5 py-1 rounded text-[9px] uppercase font-bold transition-all border-none cursor-pointer ${datePreset === 'today' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 bg-transparent'}`}
                    >
                      Hoje
                    </button>
                    <button 
                      onClick={() => setDatePreset('7days')}
                      className={`px-2.5 py-1 rounded text-[9px] uppercase font-bold transition-all border-none cursor-pointer ${datePreset === '7days' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 bg-transparent'}`}
                    >
                      7 Dias
                    </button>
                    <button 
                      onClick={() => setDatePreset('30days')}
                      className={`px-2.5 py-1 rounded text-[9px] uppercase font-bold transition-all border-none cursor-pointer ${datePreset === '30days' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 bg-transparent'}`}
                    >
                      30 Dias
                    </button>
                    <button 
                      onClick={() => setDatePreset('custom')}
                      className={`px-2.5 py-1 rounded text-[9px] uppercase font-bold transition-all border-none cursor-pointer ${datePreset === 'custom' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 bg-transparent'}`}
                    >
                      Período
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 items-end">
                  
                  {/* Data Inicial */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[8px] uppercase tracking-wider font-black text-slate-500">Data Inicial</label>
                    <input 
                      type="date" 
                      value={filterStartDate} 
                      onChange={e => {
                        setFilterStartDate(e.target.value);
                        setDatePreset('custom');
                      }}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 text-slate-800 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-sm"
                    />
                  </div>

                  {/* Data Final */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[8px] uppercase tracking-wider font-black text-slate-500">Data Final</label>
                    <input 
                      type="date" 
                      value={filterEndDate} 
                      onChange={e => {
                        setFilterEndDate(e.target.value);
                        setDatePreset('custom');
                      }}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 text-slate-800 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-sm"
                    />
                  </div>

                  {/* Operador dropdown */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[8px] uppercase tracking-wider font-black text-slate-500">Operador</label>
                    <select 
                      value={selectedOperator}
                      onChange={e => setSelectedOperator(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 text-slate-800 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-sm"
                    >
                      <option value="all">Todos Operadores</option>
                      {uniqueOperators.map(op => <option key={op} value={op}>{op}</option>)}
                    </select>
                  </div>

                  {/* Conferente dropdown */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[8px] uppercase tracking-wider font-black text-slate-500">Conferente</label>
                    <select 
                      value={selectedConferente}
                      onChange={e => setSelectedConferente(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 text-slate-800 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-sm"
                    >
                      <option value="all">Todos Conferentes</option>
                      {uniqueConferentes.map(cf => <option key={cf} value={cf}>{cf}</option>)}
                    </select>
                  </div>

                  {/* SKU dropdown */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[8px] uppercase tracking-wider font-black text-slate-500">Produto SKU</label>
                    <select 
                      value={selectedSku}
                      onChange={e => setSelectedSku(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 text-slate-800 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-sm"
                    >
                      <option value="all">Todos os SKUs</option>
                      {uniqueSkus.map(s => <option key={s.sku} value={s.sku}>{s.sku} - {s.desc.substring(0, 15)}...</option>)}
                    </select>
                  </div>

                  {/* Status dropdown */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[8px] uppercase tracking-wider font-black text-slate-500">Status</label>
                    <select 
                      value={selectedStatus}
                      onChange={e => setSelectedStatus(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 text-slate-800 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-sm"
                    >
                      <option value="all">Todos Status</option>
                      <option value="pending">Pendente (Fila)</option>
                      <option value="in_progress">Em Andamento</option>
                      <option value="done">Concluída</option>
                      <option value="cancelled">Cancelada</option>
                    </select>
                  </div>

                  {/* Durante/Após Carregamento dropdown */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[8px] uppercase tracking-wider font-black text-slate-500">Momento Carga</label>
                    <select 
                      value={selectedEtapa}
                      onChange={e => setSelectedEtapa(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 text-slate-800 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-sm"
                    >
                      <option value="all">Durante/Após</option>
                      <option value="Durante o Carregamento">Durante Carregamento</option>
                      <option value="Após o Carregamento">Após Carregamento</option>
                    </select>
                  </div>

                  {/* Configurable SLA target limit in minutes */}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[8px] uppercase tracking-wider font-black text-slate-500">Meta SLA</label>
                      <span className="text-[10px] font-bold text-amber-600">{slaLimit}m</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="range" 
                        min="5" 
                        max="60" 
                        step="5"
                        value={slaLimit} 
                        onChange={e => setSlaLimit(Number(e.target.value))}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                    </div>
                  </div>

                </div>
              </div>

              {/* --- 15. COCKPIT EXECUTIVO SUMMARY (SNEAK PEEK SUMMARY) --- */}
              <div className="p-2 px-3 bg-gradient-to-r from-slate-50 to-slate-100/50 border border-slate-200 rounded-xl">
                <span className="text-[9px] uppercase font-black text-slate-500 tracking-widest block mb-2 flex items-center gap-1 border-b border-slate-200 pb-1">
                  <Award className="w-3.5 h-3.5" />
                  COCKPIT EXECUTIVO DE FLUXO & RESSUPRIMENTO
                </span>
                
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 text-center">
                  
                  <div className="p-1.5 px-2 bg-white border border-slate-200 rounded-lg shadow-xs">
                    <span className="text-[8px] text-slate-500 font-bold block uppercase">Solicitações</span>
                    <span className="text-base font-mono font-black text-slate-800 block mt-0.5">{executiveCockpit.totalSolicitacoes}</span>
                  </div>

                  <div className="p-1.5 px-2 bg-white border border-slate-200 rounded-lg shadow-xs">
                    <span className="text-[8px] text-slate-500 font-bold block uppercase">Concluídas</span>
                    <span className="text-base font-mono font-black text-emerald-600 block mt-0.5">{executiveCockpit.totalConcluidas}</span>
                  </div>

                  <div className="p-1.5 px-2 bg-white border border-slate-200 rounded-lg shadow-xs">
                    <span className="text-[8px] text-slate-500 font-bold block uppercase">Tempo Médio</span>
                    <span className="text-base font-mono font-black text-amber-600 block mt-0.5">{executiveCockpit.tempoMedio} min</span>
                  </div>

                  <div className="p-1.5 px-2 bg-white border border-slate-200 rounded-lg shadow-xs">
                    <span className="text-[8px] text-slate-500 font-bold block uppercase">SLA Global</span>
                    <span className="text-base font-mono font-black text-emerald-600 block mt-0.5">{executiveCockpit.sla}%</span>
                  </div>

                  <div className="p-1.5 px-2 bg-white border border-slate-200 rounded-lg shadow-xs">
                    <span className="text-[8px] text-slate-500 font-bold block uppercase">Paletes Movimentados</span>
                    <span className="text-base font-mono font-black text-blue-600 block mt-0.5">{executiveCockpit.paletesMovimentados} PL</span>
                  </div>

                  <div className="p-1.5 px-2 bg-white border border-slate-200 rounded-lg shadow-xs">
                    <span className="text-[8px] text-slate-500 font-bold block uppercase">Operador Destaque</span>
                    <span className="text-[10px] font-black text-emerald-600 block mt-1.5 truncate" title={executiveCockpit.operadorDestaque}>{executiveCockpit.operadorDestaque}</span>
                  </div>

                  <div className="p-1.5 px-2 bg-white border border-slate-200 rounded-lg shadow-xs">
                    <span className="text-[8px] text-slate-500 font-bold block uppercase">Conferente Destaque</span>
                    <span className="text-[10px] font-black text-blue-600 block mt-1.5 truncate" title={executiveCockpit.conferenteDestaque}>{executiveCockpit.conferenteDestaque}</span>
                  </div>

                  <div className="p-1.5 px-2 bg-white border border-slate-200 rounded-lg shadow-xs">
                    <span className="text-[8px] text-slate-500 font-bold block uppercase">SKU mais solicitado</span>
                    <span className="text-[9px] font-black text-amber-600 block mt-1.5 truncate" title={executiveCockpit.skuDestaque}>{executiveCockpit.skuDestaque}</span>
                  </div>

                </div>
              </div>

              {/* --- 1. CARDS SUPERIORES (8 CARDS) --- */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
                
                {/* 1. Solicitações Hoje */}
                <div className="bg-white border border-slate-200 p-1.5 px-2.5 rounded-xl relative overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-sm transition-all">
                  <div>
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">Solicitações Hoje</span>
                    <span className="text-base font-black font-mono text-amber-600 mt-0.5 block">{statsCards.solicHoje}</span>
                  </div>
                  <span className="text-[7px] text-slate-400 block mt-1 font-bold">Criadas no dia atual</span>
                  <div className="absolute top-1.5 right-1.5 bg-amber-50 p-0.5 rounded text-amber-500">
                    <Calendar className="w-3 h-3" />
                  </div>
                </div>

                {/* 2. Solicitações Pendentes */}
                <div className="bg-white border border-slate-200 p-1.5 px-2.5 rounded-xl relative overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-sm transition-all">
                  <div>
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">Pendentes</span>
                    <span className="text-base font-black font-mono text-amber-600 mt-0.5 block">{statsCards.pendentes}</span>
                  </div>
                  <span className="text-[7px] text-slate-400 block mt-1 font-bold">Na fila de aguardo</span>
                  <div className="absolute top-1.5 right-1.5 bg-amber-50 p-0.5 rounded text-amber-500">
                    <Clock3 className="w-3 h-3" />
                  </div>
                </div>

                {/* 3. Em Atendimento */}
                <div className="bg-white border border-slate-200 p-1.5 px-2.5 rounded-xl relative overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-sm transition-all">
                  <div>
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">Em Atendimento</span>
                    <span className="text-base font-black font-mono text-blue-600 mt-0.5 block">{statsCards.emAtendimento}</span>
                  </div>
                  <span className="text-[7px] text-slate-400 block mt-1 font-bold">Aceitas e em execução</span>
                  <div className="absolute top-1.5 right-1.5 bg-blue-50 p-0.5 rounded text-blue-500">
                    <Truck className="w-3 h-3" />
                  </div>
                </div>

                {/* 4. Solicitações Concluídas */}
                <div className="bg-white border border-slate-200 p-1.5 px-2.5 rounded-xl relative overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-sm transition-all">
                  <div>
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">Concluídas</span>
                    <span className="text-base font-black font-mono text-emerald-600 mt-0.5 block">{statsCards.concluidas}</span>
                  </div>
                  <span className="text-[7px] text-slate-400 block mt-1 font-bold">Abastecimentos efetuados</span>
                  <div className="absolute top-1.5 right-1.5 bg-emerald-50 p-0.5 rounded text-emerald-500">
                    <CheckCircle2 className="w-3 h-3" />
                  </div>
                </div>

                {/* 5. Tempo Médio de Atendimento */}
                <div className="bg-white border border-slate-200 p-1.5 px-2.5 rounded-xl relative overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-sm transition-all">
                  <div>
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">TMA (Lead Time)</span>
                    <span className="text-base font-black font-mono text-amber-600 mt-0.5 block">{statsCards.tempoMedioAtendimento}m</span>
                  </div>
                  <span className="text-[7px] text-slate-400 block mt-1 font-bold">Média desde a emissão</span>
                  <div className="absolute top-1.5 right-1.5 bg-amber-50 p-0.5 rounded text-amber-500">
                    <Clock className="w-3 h-3" />
                  </div>
                </div>

                {/* 6. SLA do Dia */}
                <div className="bg-white border border-slate-200 p-1.5 px-2.5 rounded-xl relative overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-sm transition-all">
                  <div>
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">SLA do Dia</span>
                    <span className="text-base font-black font-mono text-emerald-600 mt-0.5 block">{statsCards.slaHoje}%</span>
                  </div>
                  <span className="text-[7px] text-slate-400 block mt-1 font-bold">Dentro da meta de {slaLimit}m</span>
                  <div className="absolute top-1.5 right-1.5 bg-emerald-50 p-0.5 rounded text-emerald-500">
                    <GaugeIcon className="w-3 h-3" />
                  </div>
                </div>

                {/* 7. Total de Paletes Movimentados */}
                <div className="bg-white border border-slate-200 p-1.5 px-2.5 rounded-xl relative overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-sm transition-all">
                  <div>
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">Total Paletes</span>
                    <span className="text-base font-black font-mono text-slate-800 mt-0.5 block">{statsCards.totalPaletes}</span>
                  </div>
                  <span className="text-[7px] text-slate-400 block mt-1 font-bold">Capacidade consolidada</span>
                  <div className="absolute top-1.5 right-1.5 bg-slate-50 p-0.5 rounded text-slate-500">
                    <Package className="w-3 h-3" />
                  </div>
                </div>

                {/* 8. Operadores Ativos */}
                <div className="bg-white border border-slate-200 p-1.5 px-2.5 rounded-xl relative overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-sm transition-all">
                  <div>
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">Op Ativos</span>
                    <span className="text-base font-black font-mono text-blue-600 mt-0.5 block">{statsCards.operadoresAtivos}</span>
                  </div>
                  <span className="text-[7px] text-slate-400 block mt-1 font-bold">Logados na plataforma</span>
                  <div className="absolute top-1.5 right-1.5 bg-blue-50 p-0.5 rounded text-blue-500">
                    <User className="w-3 h-3" />
                  </div>
                </div>

              </div>

              {/* --- CHARTS GRID SECTION (BENTO GRID STYLE) --- */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                
                {/* 12. SLA Speedometer & 8. Process Flow Timeline (Merged beautifully in 4 columns) */}
                <div className="lg:col-span-4 bg-white border border-slate-200 p-4 rounded-2xl flex flex-col justify-between gap-4 shadow-sm">
                  <div>
                    <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider block mb-2 flex items-center gap-1.5">
                      <GaugeIcon className="w-4 h-4 text-emerald-500" />
                      12. SLA do Dia & 8. Tempos do Processo
                    </span>
                    
                    {/* Gauge Visual representation */}
                    <div className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="relative w-32 h-20 flex items-center justify-center overflow-hidden">
                        {/* Gauge Arc Background */}
                        <div className="absolute bottom-0 w-32 h-32 rounded-full border-[10px] border-slate-200" />
                        {/* Gauge Arc Fill (Using dynamic clip-path/conic-gradient style representation) */}
                        <div className="absolute bottom-0 w-32 h-32 rounded-full border-[10px] border-emerald-500 border-b-transparent border-r-transparent rotate-45 transform origin-center transition-all duration-1000" style={{ transform: `rotate(${(slaStats.pctWithin / 100) * 180 - 45}deg)` }} />
                        
                        <div className="absolute bottom-0 flex flex-col items-center justify-center">
                          <span className="text-2xl font-black font-mono text-emerald-600">{slaStats.pctWithin}%</span>
                          <span className="text-[8px] text-slate-500 font-bold uppercase">Dentro SLA</span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between w-full mt-3 text-[10px] font-black uppercase text-slate-500 border-t border-slate-200 pt-2">
                        <span className="text-emerald-600">{slaStats.pctWithin}% No Prazo</span>
                        <span className="text-red-500">{slaStats.pctOutside}% Atrasado</span>
                      </div>
                    </div>
                  </div>

                  {/* 8. Process Flow Visual Chevron Cards */}
                  <div className="flex flex-col gap-2.5">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block tracking-widest border-b border-slate-200 pb-1">Ciclo Médio de Atendimento</span>
                    
                    <div className="flex items-center justify-between p-2.5 bg-blue-50/50 border border-blue-100 rounded-xl">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-black">1</span>
                        <div>
                          <span className="text-[9px] text-slate-500 block uppercase font-bold">Aviso → Aceite</span>
                          <span className="text-xs font-black text-blue-600">{processStages.aceite} min</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                      <div>
                        <span className="text-[8px] text-blue-600 font-bold block uppercase bg-blue-50 px-1 py-0.5 rounded border border-blue-100">TMA Reação</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] font-black">2</span>
                        <div>
                          <span className="text-[9px] text-slate-500 block uppercase font-bold">Aceite → Conclusão</span>
                          <span className="text-xs font-black text-emerald-600">{processStages.execucao} min</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                      <div>
                        <span className="text-[8px] text-emerald-600 font-bold block uppercase bg-emerald-50 px-1 py-0.5 rounded border border-emerald-100">TMA Trajeto</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-amber-50/50 border border-amber-100 rounded-xl">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-[10px] font-black">3</span>
                        <div>
                          <span className="text-[9px] text-slate-500 block uppercase font-bold">Tempo Total do Processo</span>
                          <span className="text-xs font-black text-amber-600">{processStages.total} min</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[8px] text-amber-600 font-bold block uppercase bg-amber-50 px-1 py-0.5 rounded border border-amber-100">Lead Time</span>
                      </div>
                    </div>

                  </div>
                </div>

                {/* 2. Gráfico de Solicitações por Hora (8 Columns) */}
                <div className="lg:col-span-8 bg-white border border-slate-200 p-4 rounded-2xl flex flex-col justify-between shadow-sm">
                  <div>
                    <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider block mb-1 flex items-center gap-1.5">
                      <BarChart2 className="w-4 h-4 text-amber-500" />
                      2. Histograma de Solicitações por Hora do Dia
                    </span>
                    <span className="text-[8px] text-slate-400 block font-bold mb-4 uppercase">Volume acumulado de emissão por faixa horária (Identificação de Gargalos de Turno)</span>
                  </div>

                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={requestsByHour} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="hour" stroke="#475569" fontSize={9} fontWeight="bold" />
                        <YAxis stroke="#475569" fontSize={9} fontWeight="bold" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                          labelClassName="text-slate-800 text-xs font-black"
                        />
                        <Bar dataKey="quantidade" fill="#f5a623" radius={[4, 4, 0, 0]}>
                          {requestsByHour.map((entry, index) => (
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
                <div className="lg:col-span-3 bg-white border border-slate-200 p-4 rounded-2xl flex flex-col justify-between shadow-sm">
                  <div>
                    <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider block mb-1 flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-amber-500" />
                      7. Carregamento Ativo vs Após
                    </span>
                    <span className="text-[8px] text-slate-400 uppercase block font-bold mb-4">Volume total distribuído por etapa</span>
                  </div>

                  <div className="h-44 w-full flex items-center justify-center relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={duringVsAfterData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={65}
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
                    <div className="absolute flex flex-col items-center">
                      <span className="text-slate-400 text-[8px] uppercase font-bold">Estágio</span>
                      <span className="text-sm font-black text-slate-800">Picking</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 mt-3 border-t border-slate-200 pt-2 text-[10px] font-black uppercase">
                    <div className="flex justify-between items-center text-purple-600">
                      <span>Durante Carregamento</span>
                      <span>{duringVsAfterData[0]?.percentage}% ({duringVsAfterData[0]?.value} PL)</span>
                    </div>
                    <div className="flex justify-between items-center text-pink-600">
                      <span>Após Carregamento</span>
                      <span>{duringVsAfterData[1]?.percentage}% ({duringVsAfterData[1]?.value} PL)</span>
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

              {/* THIRD GRID ROW - HEATMAP, PALLETS BY HOUR & DAILY TREND */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                
                {/* 10. Heatmap (Dias x Horários) (5 Columns) */}
                <div className="lg:col-span-5 bg-white border border-slate-200 p-4 rounded-2xl flex flex-col justify-between shadow-sm">
                  <div>
                    <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider block mb-1 flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-orange-500" />
                      10. Mapa de Calor (Dias × Horários)
                    </span>
                    <span className="text-[8px] text-slate-400 uppercase block font-bold mb-4">Gargalos operacionais por dia e faixa horária</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[9px] border-collapse min-w-[280px]">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase">
                          <th className="py-1">Dia</th>
                          {heatmapData.hourBlocks.map(hb => (
                            <th key={hb} className="py-1 text-center">{hb}h</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {heatmapData.days.map(day => (
                          <tr key={day} className="border-b border-slate-100">
                            <td className="py-1.5 font-bold text-slate-600">{day}</td>
                            {heatmapData.hourBlocks.map(hb => {
                              const count = heatmapData.matrix[day]?.[hb] || 0;
                              // Determine color density classes
                              let bgClass = 'bg-slate-50 text-slate-400';
                              if (count > 0 && count <= 1) bgClass = 'bg-blue-50 text-blue-600 border border-blue-100';
                              else if (count > 1 && count <= 3) bgClass = 'bg-blue-100 text-blue-800 font-bold border border-blue-200';
                              else if (count > 3 && count <= 5) bgClass = 'bg-amber-100 text-amber-800 font-black border border-amber-200';
                              else if (count > 5) bgClass = 'bg-red-100 text-red-600 font-black border border-red-200 animate-pulse';

                              return (
                                <td key={hb} className={`py-1 text-center font-mono rounded-md transition-all ${bgClass}`} title={`${count} solicitações`}>
                                  {count}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 11. Paletes Movimentados por Hora (Bar Chart) (4 Columns) */}
                <div className="lg:col-span-4 bg-white border border-slate-200 p-4 rounded-2xl flex flex-col justify-between shadow-sm">
                  <div>
                    <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider block mb-1 flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-emerald-500" />
                      11. Paletes Movimentados por Hora
                    </span>
                    <span className="text-[8px] text-slate-400 uppercase block font-bold mb-4">Mapeamento de capacidade expedida por hora</span>
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

                {/* 13. Evolução Diária (Line Chart) (3 Columns) */}
                <div className="lg:col-span-3 bg-white border border-slate-200 p-4 rounded-2xl flex flex-col justify-between shadow-sm">
                  <div>
                    <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider block mb-1 flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-sky-500" />
                      13. Tendência de Evolução Diária
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

              {/* FIFTH GRID ROW - SKU RANKING (TOP 10) & OPERATOR PRODUCTIVITY TABLE */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                
                {/* 6. Ranking dos SKUs mais abastecidos (TOP 10) (5 Columns) */}
                <div className="lg:col-span-5 bg-white border border-slate-200 p-4 rounded-2xl flex flex-col gap-2 shadow-sm">
                  <div>
                    <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider block flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-amber-500" />
                      6. Top 10 SKUs Mais Abastecidos no Picking
                    </span>
                    <span className="text-[8px] text-slate-400 uppercase block font-bold">Lista dos produtos de maior giro no período</span>
                  </div>

                  <div className="overflow-x-auto max-h-72 border border-slate-200 rounded-xl bg-slate-50 shadow-inner">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase font-bold text-[8px] tracking-wider">
                          <th className="p-2.5">SKU / Produto</th>
                          <th className="p-2.5 text-center">Solicitações</th>
                          <th className="p-2.5 text-right">Paletes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {skuRanking.map((sku, idx) => (
                          <tr key={idx} className="hover:bg-slate-100/50 transition-all text-[11px]">
                            <td className="p-2.5 font-bold">
                              <div className="flex flex-col">
                                <span className="font-mono text-[10px] text-amber-600">#{sku.sku}</span>
                                <span className="text-[10px] truncate max-w-[180px] text-slate-500 font-normal" title={sku.desc}>{sku.desc}</span>
                              </div>
                            </td>
                            <td className="p-2.5 text-center font-mono text-blue-600 font-bold">{sku.requests}</td>
                            <td className="p-2.5 text-right font-mono text-emerald-600 font-black">{sku.pallets} PL</td>
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

                {/* 14. Produtividade Detalhada dos Operadores (7 Columns) */}
                <div className="lg:col-span-7 bg-white border border-slate-200 p-4 rounded-2xl flex flex-col gap-2 shadow-sm">
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

              </div>

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

    </div>
  );
}
export {};
