import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, addDoc, getDocs } from 'firebase/firestore';
import { Usuario, Empresa, Tarefa } from '../types';
import { PRODUCTS } from '../planosData';
import A3BoardComponent from './A3BoardComponent';
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
  MapPin, 
  Activity,
  AlertCircle,
  Play
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
  Legend,
  AreaChart,
  Area
} from 'recharts';
import * as XLSX from 'xlsx';

interface PickingDashboardProps {
  user: Usuario;
  empresa: Empresa | null;
  onBack?: () => void;
}

export default function PickingDashboard({ user, empresa, onBack }: PickingDashboardProps) {
  const [tasks, setTasks] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOperator, setSelectedOperator] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedMode, setSelectedMode] = useState('all');
  const [seeding, setSeeding] = useState(false);
  const [selectedTaskDetails, setSelectedTaskDetails] = useState<Tarefa | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'indicadores' | 'boarda3'>('indicadores');

  const empresaId = empresa?.id || 'demo';

  // Synchronize tasks from Firestore
  useEffect(() => {
    if (!db) {
      const savedTasks = localStorage.getItem(`tasks_${empresaId}`);
      if (savedTasks) {
        setTasks(JSON.parse(savedTasks));
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(collection(db, 'tarefas'));
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map(doc => ({ _docId: doc.id, ...doc.data() } as Tarefa))
        .filter(t => t.empresaId === empresaId);
      
      // Sort: newest first
      rows.sort((a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || ''));
      setTasks(rows);
      setLoading(false);
    }, (error) => {
      console.error("Error reading tasks:", error);
      setLoading(false);
    });

    return () => unsub();
  }, [empresaId]);

  // Seed simulated data to populate beautiful B.I. metrics instantly
  const handleGenerateSeedData = async () => {
    setSeeding(true);
    const operatorsList = ['MARIVALDO ARTHUR', 'RONILDO', 'PAULO PEREIRA', 'ALEXANDRE', 'GABRIEL JOSÉ'];
    const conferentesList = ['GILSON ROSA DA SILVA', 'MATHEUS', 'CARLOS OLIVEIRA'];
    const statusOptions: ('pending' | 'in_progress' | 'done')[] = ['done', 'done', 'done', 'in_progress', 'pending'];
    const modesList = ['Durante o Carregamento', 'Após o Carregamento'];

    const seedTasksList: Omit<Tarefa, '_docId'>[] = [];

    // Create 35 randomized tasks distributed across the last 7 days
    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - i);
      const dateISO = targetDate.toISOString().split('T')[0];

      // 4 to 6 tasks per day
      const dailyCount = 4 + Math.floor(Math.random() * 3);

      for (let j = 0; j < dailyCount; j++) {
        const prod = PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)];
        const operatorName = operatorsList[Math.floor(Math.random() * operatorsList.length)];
        const conferenteName = conferentesList[Math.floor(Math.random() * conferentesList.length)];
        
        // Distribution
        const currentStatus = i === 0 && j > 3 ? 'pending' : (i === 0 && j > 1 ? 'in_progress' : 'done');
        const countPaletes = 1 + Math.floor(Math.random() * 4); // 1 to 4 pallets
        
        // Base hours
        const startHour = 8 + Math.floor(Math.random() * 12);
        const startMin = Math.floor(Math.random() * 60);
        
        const createdDate = new Date(targetDate);
        createdDate.setHours(startHour, startMin, 0);

        const initDate = new Date(createdDate);
        initDate.setMinutes(initDate.getMinutes() + 5 + Math.floor(Math.random() * 10)); // started 5-15 mins later

        const durationMinutes = 8 + Math.floor(Math.random() * 15) + (countPaletes * 4); // duration based on pallets
        const finishedDate = new Date(initDate);
        finishedDate.setMinutes(finishedDate.getMinutes() + durationMinutes);

        const opMode = modesList[Math.floor(Math.random() * modesList.length)];

        // Telemetry path simulation
        const distanceSim = Math.round(100 + (Math.random() * 300) + (countPaletes * 80));
        const idleSim = Math.round(20 + Math.random() * 120);
        const stopsSim = Math.random() > 0.4 ? Math.floor(1 + Math.random() * 3) : 0;
        const mapsLinkSim = `https://www.google.com/maps?q=-7.12${Math.floor(Math.random()*9)},-34.88${Math.floor(Math.random()*9)}`;

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
          tipoOperacao: currentStatus !== 'pending' ? opMode : undefined,
          locData: currentStatus === 'done' ? {
            distanciaM: distanceSim,
            totalIdleSec: idleSim,
            segmentosParado: stopsSim,
            mapsLink: mapsLinkSim,
            totalLeituras: 15
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
        // Fallback local storage
        const currentLocal = [...tasks, ...seedTasksList.map((tk, idx) => ({ _docId: `seed-${Date.now()}-${idx}`, ...tk } as Tarefa))];
        setTasks(currentLocal);
        localStorage.setItem(`tasks_${empresaId}`, JSON.stringify(currentLocal));
      }
      alert('35 tarefas demonstrativas geradas com sucesso para popular o Dashboard!');
    } catch (e) {
      console.error(e);
      alert('Erro ao gerar dados simulados: ' + e);
    } finally {
      setSeeding(false);
    }
  };

  // Extract operators list for filter
  const operators = useMemo(() => {
    const list = new Set<string>();
    tasks.forEach(t => {
      if (t.operador) list.add(t.operador);
    });
    return Array.from(list).sort();
  }, [tasks]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchSearch = !searchTerm || 
        t.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(t.codigo).includes(searchTerm) ||
        t.conferente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.operador.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(t.id).includes(searchTerm);

      const matchOperator = selectedOperator === 'all' || t.operador === selectedOperator;
      const matchStatus = selectedStatus === 'all' || t.status === selectedStatus;
      
      const opModeText = t.tipoOperacao || '';
      const matchMode = selectedMode === 'all' || 
        (selectedMode === 'durante' && opModeText.includes('Durante')) ||
        (selectedMode === 'apos' && opModeText.includes('Após'));

      return matchSearch && matchOperator && matchStatus && matchMode;
    });
  }, [tasks, searchTerm, selectedOperator, selectedStatus, selectedMode]);

  // KPIs calculations
  const kpis = useMemo(() => {
    const completed = tasks.filter(t => t.status === 'done');
    const totalPallets = completed.reduce((sum, t) => sum + (t.quantidade || 0), 0);
    
    // Average duration in minutes
    const validDurations = completed.filter(t => t.duracaoMin !== null && t.duracaoMin > 0);
    const avgDuration = validDurations.length > 0 
      ? Math.round(validDurations.reduce((sum, t) => sum + (t.duracaoMin || 0), 0) / validDurations.length * 10) / 10
      : 0;

    // Concluded rate
    const completionRate = tasks.length > 0
      ? Math.round((completed.length / tasks.length) * 100)
      : 0;

    // Predominant mode
    let duranteCount = 0;
    let aposCount = 0;
    completed.forEach(t => {
      if (t.tipoOperacao?.includes('Durante')) duranteCount += t.quantidade;
      else if (t.tipoOperacao?.includes('Após')) aposCount += t.quantidade;
    });

    const predominantMode = duranteCount === 0 && aposCount === 0 
      ? 'Nenhum' 
      : duranteCount >= aposCount 
        ? `Durante Carregamento (${duranteCount} paletes)` 
        : `Após Carregamento (${aposCount} paletes)`;

    return {
      totalTasks: tasks.length,
      pendingCount: tasks.filter(t => t.status === 'pending').length,
      inProgressCount: tasks.filter(t => t.status === 'in_progress').length,
      completedCount: completed.length,
      totalPallets,
      avgDuration,
      completionRate,
      predominantMode,
      duranteCount,
      aposCount
    };
  }, [tasks]);

  // Chart 1: Pallets moved by Operator (Completed Only)
  const chartOperatorData = useMemo(() => {
    const dataMap: Record<string, { operator: string, pallets: number, tasksCount: number, totalMinutes: number }> = {};
    
    tasks.filter(t => t.status === 'done').forEach(t => {
      if (!dataMap[t.operador]) {
        dataMap[t.operador] = { operator: t.operador, pallets: 0, tasksCount: 0, totalMinutes: 0 };
      }
      dataMap[t.operador].pallets += t.quantidade || 0;
      dataMap[t.operador].tasksCount += 1;
      dataMap[t.operador].totalMinutes += t.duracaoMin || 0;
    });

    return Object.values(dataMap).map(d => ({
      ...d,
      avgMinutesPerTask: d.tasksCount > 0 ? Math.round((d.totalMinutes / d.tasksCount) * 10) / 10 : 0
    })).sort((a, b) => b.pallets - a.pallets);
  }, [tasks]);

  // Chart 2: Top SKUs by Pallets
  const chartSkuData = useMemo(() => {
    const dataMap: Record<string, { name: string, pallets: number, sku: string }> = {};

    tasks.filter(t => t.status === 'done').forEach(t => {
      const key = `${t.codigo}`;
      if (!dataMap[key]) {
        // Truncate description for neat labels
        const shortDesc = t.descricao.length > 20 ? t.descricao.substring(0, 20) + '...' : t.descricao;
        dataMap[key] = { name: shortDesc, pallets: 0, sku: String(t.codigo) };
      }
      dataMap[key].pallets += t.quantidade || 0;
    });

    return Object.values(dataMap)
      .sort((a, b) => b.pallets - a.pallets)
      .slice(0, 6);
  }, [tasks]);

  // Chart 3: Efficiency by Mode (Durante vs Após) - Average duration in minutes
  const chartModeEfficiency = useMemo(() => {
    let duranteSum = 0;
    let duranteTasks = 0;
    let aposSum = 0;
    let aposTasks = 0;

    tasks.filter(t => t.status === 'done' && t.duracaoMin !== null).forEach(t => {
      if (t.tipoOperacao?.includes('Durante')) {
        duranteSum += t.duracaoMin || 0;
        duranteTasks++;
      } else if (t.tipoOperacao?.includes('Após')) {
        aposSum += t.duracaoMin || 0;
        aposTasks++;
      }
    });

    return [
      {
        mode: 'Durante o Carregamento',
        avgTime: duranteTasks > 0 ? Math.round((duranteSum / duranteTasks) * 10) / 10 : 0,
        volume: duranteTasks
      },
      {
        mode: 'Após o Carregamento',
        avgTime: aposTasks > 0 ? Math.round((aposSum / aposTasks) * 10) / 10 : 0,
        volume: aposTasks
      }
    ];
  }, [tasks]);

  // Chart 4: Volume Over Time (Pallets Picked Daily)
  const chartTimeData = useMemo(() => {
    const dailyMap: Record<string, { date: string, formattedDate: string, pallets: number, tasksCount: number }> = {};

    // Generate last 7 days keys
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      dailyMap[iso] = { date: iso, formattedDate: label, pallets: 0, tasksCount: 0 };
    }

    // Populate
    tasks.filter(t => t.status === 'done' && t.criadoEm).forEach(t => {
      const iso = t.criadoEm.substring(0, 10);
      if (dailyMap[iso]) {
        dailyMap[iso].pallets += t.quantidade || 0;
        dailyMap[iso].tasksCount += 1;
      }
    });

    return Object.values(dailyMap);
  }, [tasks]);

  // Export spreadsheet xlsx
  const handleExportXLSX = () => {
    if (tasks.length === 0) {
      alert('Nenhuma tarefa para exportar.');
      return;
    }

    const reportRows = tasks.map(t => ({
      'ID Tarefa': t.id,
      'SKU Código': t.codigo,
      'Descrição Produto': t.descricao,
      'Paletes Qtd': t.quantidade,
      'Conferente': t.conferente,
      'Operador Empilhadeira': t.operador,
      'Status': t.status === 'done' ? 'Concluído' : t.status === 'in_progress' ? 'Em Andamento' : 'Aguardando',
      'Tipo de Operação': t.tipoOperacao || 'Não Definido',
      'Criado Em': t.criadoEm ? new Date(t.criadoEm).toLocaleString() : '',
      'Iniciado Em': t.iniciadoEm ? new Date(t.iniciadoEm).toLocaleString() : '',
      'Finalizado Em': t.finalizadoEm ? new Date(t.finalizadoEm).toLocaleString() : '',
      'Duração (Minutos)': t.duracaoMin || 0,
      'Distância IoT (Metros)': t.locData?.distanciaM || 0,
      'Tempo Ocioso IoT (Segundos)': t.locData?.totalIdleSec || 0,
      'Paradas IoT': t.locData?.segmentosParado || 0,
    }));

    const worksheet = XLSX.utils.json_to_sheet(reportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Abastecimento Picking");
    
    // Auto-fit columns
    const max_len = reportRows.reduce((prev, next) => {
      return Object.keys(next).reduce((acc, key) => {
        const val = String(next[key as keyof typeof next] || '');
        acc[key] = Math.max(acc[key] || 0, val.length, key.length);
        return acc;
      }, prev);
    }, {} as Record<string, number>);
    worksheet["!cols"] = Object.keys(max_len).map(k => ({ wch: max_len[k] + 2 }));

    XLSX.writeFile(workbook, `Relatorio_Picking_${empresaId}_${new Date().toISOString().substring(0, 10)}.xlsx`);
  };

  // Color variables
  const COLORS = ['#f5a623', '#3b82f6', '#10b981', '#a855f7', '#ec4899', '#f43f5e', '#14b8a6'];

  return (
    <div id="picking-dashboard-wrapper" className="flex flex-col gap-3">
      
      {/* Top Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between p-3.5 bg-[#11151c] border-b border-[#222d3a] rounded-t-xl -mx-3 md:-mx-4.5 -mt-3.5 gap-3.5">
        <div className="flex items-center gap-3">
          {onBack && (
            <button 
              onClick={onBack}
              className="p-1.5 bg-[#1a212d] hover:bg-[#253042] border border-[#2d394d] rounded-lg text-snow cursor-pointer transition-all"
            >
              <ArrowLeft className="w-4 h-4 text-[#f5a623]" />
            </button>
          )}
          <div>
            <span className="font-sans font-black text-sm tracking-widest text-[#f5a623] uppercase">📊 B.I. ABASTECIMENTO & PICKING</span>
            <span className="text-[10px] text-[#6a7d92] font-mono block uppercase">Análise de Gargalos, Desempenho Operativo de Turno e Telemetria</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200/60">
            <button 
              onClick={() => setActiveSubTab('indicadores')}
              className={`px-3 py-1 rounded font-sans font-bold text-[9px] uppercase tracking-wider transition-all border-none cursor-pointer ${activeSubTab === 'indicadores' ? 'bg-[#032b5e] text-white shadow-xs' : 'text-gray-500 hover:text-[#032b5e] bg-transparent'}`}
            >
              Indicadores & BI
            </button>
            <button 
              onClick={() => setActiveSubTab('boarda3')}
              className={`px-3 py-1 rounded font-sans font-bold text-[9px] uppercase tracking-wider transition-all border-none cursor-pointer ${activeSubTab === 'boarda3' ? 'bg-[#032b5e] text-white shadow-xs' : 'text-gray-500 hover:text-[#032b5e] bg-transparent'}`}
            >
              Quadro de Ações
            </button>
          </div>

          {tasks.length === 0 && (
            <button 
              onClick={handleGenerateSeedData}
              disabled={seeding}
              className="px-3.5 py-2 text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-[#f5a623] border border-amber-500/30 rounded-xl transition-all cursor-pointer flex items-center gap-2"
            >
              <Play className="w-3.5 h-3.5" />
              {seeding ? 'Gerando dados...' : 'Gerar Dados Demo'}
            </button>
          )}
          
          <button 
            onClick={handleExportXLSX}
            className="px-3.5 py-2 text-xs font-bold bg-[#1ca0d3]/10 hover:bg-[#1ca0d3]/20 text-[#1ca0d3] border border-[#1ca0d3]/30 rounded-xl transition-all cursor-pointer flex items-center gap-2"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Exportar Excel
          </button>
        </div>
      </div>

      {loading ? (
        <div className="g-card p-12 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#f5a623] border-t-transparent animate-spin"></div>
          <span className="text-xs text-[#6a7d92] uppercase font-mono tracking-widest">Sincronizando dados operacionais...</span>
        </div>
      ) : (
        <>
          {activeSubTab === 'indicadores' ? (
            <>
          {/* Real-time operational queues summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* KPI 1: Active Operators */}
            <div className="g-card p-4 relative overflow-hidden border-l-[3px] border-l-amber-500">
              <div className="absolute top-2 right-2 p-1.5 bg-[#151b23] rounded-lg">
                <User className="w-4 h-4 text-amber-500" />
              </div>
              <span className="text-[10px] font-bold text-[#6a7d92] uppercase tracking-wider block">Fila de Aguardo</span>
              <span className="text-2xl font-black text-snow block mt-1">{kpis.pendingCount}</span>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#11151c] text-[#6a7d92]">
                  Paletes aguardando operador na fila
                </span>
              </div>
            </div>

            {/* KPI 2: Active Tasks */}
            <div className="g-card p-4 relative overflow-hidden border-l-[3px] border-l-sky-500">
              <div className="absolute top-2 right-2 p-1.5 bg-[#151b23] rounded-lg">
                <Activity className="w-4 h-4 text-sky-500" />
              </div>
              <span className="text-[10px] font-bold text-[#6a7d92] uppercase tracking-wider block">Em Movimentação</span>
              <span className="text-2xl font-black text-snow block mt-1">{kpis.inProgressCount}</span>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#11151c] text-sky-400">
                  Operadores com empilhadeira ativa
                </span>
              </div>
            </div>

            {/* KPI 3: Total Pallets Moved */}
            <div className="g-card p-4 relative overflow-hidden border-l-[3px] border-l-[#10b981]">
              <div className="absolute top-2 right-2 p-1.5 bg-[#151b23] rounded-lg">
                <Package className="w-4 h-4 text-[#10b981]" />
              </div>
              <span className="text-[10px] font-bold text-[#6a7d92] uppercase tracking-wider block">Paletes Movimentados</span>
              <span className="text-2xl font-black text-snow block mt-1">{kpis.totalPallets}</span>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#11151c] text-[#10b981]">
                  Total consolidado de cargas concluídas
                </span>
              </div>
            </div>

            {/* KPI 4: Average Cycle Time */}
            <div className="g-card p-4 relative overflow-hidden border-l-[3px] border-l-purple-500">
              <div className="absolute top-2 right-2 p-1.5 bg-[#151b23] rounded-lg">
                <Clock className="w-4 h-4 text-purple-500" />
              </div>
              <span className="text-[10px] font-bold text-[#6a7d92] uppercase tracking-wider block">Tempo Médio / Ciclo</span>
              <span className="text-2xl font-black text-snow block mt-1">{kpis.avgDuration} <span className="text-xs text-[#6a7d92]">min</span></span>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#11151c] text-purple-400">
                  De atribuído a finalizado no pátio
                </span>
              </div>
            </div>

          </div>

          {/* Quick Info Alerts */}
          <div className="g-card p-3.5 bg-[#151b23]/40 border border-[#222d3a] rounded-xl flex items-center justify-between text-xs flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 bg-amber-500/10 rounded-lg text-[#f5a623]">
                <Truck className="w-4 h-4" />
              </span>
              <div>
                <span className="text-[#6a7d92] block text-[10px] uppercase font-bold tracking-wider">Modo Predominante de Reabastecimento</span>
                <span className="text-snow font-bold">{kpis.predominantMode}</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-[10px] text-[#6a7d92] uppercase font-bold block">Taxa de Eficiência Conclusiva</span>
                <span className="font-bold text-[#10b981]">{kpis.completionRate}% de tarefas concluídas ({kpis.completedCount}/{kpis.totalTasks})</span>
              </div>
            </div>
          </div>

          {/* Charts Row 1: Volume Daily & Operator Productivity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Chart: Pallets over time */}
            <div className="g-card p-5 flex flex-col gap-4">
              <div>
                <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-[#f5a623] flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Volume de Picking Diário (Últimos 7 dias)
                </h4>
                <p className="text-[10px] text-[#6a7d92] mt-0.5">Representação temporal de paletes devidamente entregues no picking</p>
              </div>

              <div className="h-64 w-full">
                {tasks.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-[#6a7d92] text-xs">Sem dados temporais disponíveis.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartTimeData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorPallets" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f5a623" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#f5a623" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#1c2530" strokeDasharray="3 3" />
                      <XAxis dataKey="formattedDate" stroke="#6a7d92" fontSize={10} tickLine={false} />
                      <YAxis stroke="#6a7d92" fontSize={10} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0e121a', borderColor: '#222d3a', borderRadius: '8px' }} 
                        labelStyle={{ color: '#6a7d92', fontSize: '10px', fontWeight: 'bold' }}
                        itemStyle={{ color: '#f5a623', fontSize: '12px' }}
                      />
                      <Area type="monotone" dataKey="pallets" name="Paletes" stroke="#f5a623" strokeWidth={2} fillOpacity={1} fill="url(#colorPallets)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Chart: Operator Productivity */}
            <div className="g-card p-5 flex flex-col gap-4">
              <div>
                <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-[#f5a623] flex items-center gap-2">
                  <User className="w-4 h-4" /> Produtividade por Operador de Empilhadeira
                </h4>
                <p className="text-[10px] text-[#6a7d92] mt-0.5">Paletes movimentados acumulados e tempo médio operacional por operador</p>
              </div>

              <div className="h-64 w-full">
                {chartOperatorData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-[#6a7d92] text-xs">Nenhuma atividade de operador concluída ainda.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartOperatorData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid stroke="#1c2530" strokeDasharray="3 3" />
                      <XAxis dataKey="operator" stroke="#6a7d92" fontSize={8} tickLine={false} interval={0} />
                      <YAxis yAxisId="left" stroke="#6a7d92" fontSize={10} tickLine={false} />
                      <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" fontSize={10} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0e121a', borderColor: '#222d3a', borderRadius: '8px' }} 
                        labelStyle={{ color: '#6a7d92', fontSize: '10px', fontWeight: 'bold' }}
                      />
                      <Bar yAxisId="left" dataKey="pallets" name="Paletes Movimentados" fill="#f5a623" radius={[4, 4, 0, 0]} maxBarSize={30} />
                      <Bar yAxisId="right" dataKey="avgMinutesPerTask" name="Tempo Médio (min)" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

          </div>

          {/* Charts Row 2: SKU Frequency & Mode Bottlenecks */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Chart: Most Picked SKUs */}
            <div className="g-card p-5 flex flex-col gap-4">
              <div>
                <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-[#f5a623] flex items-center gap-2">
                  <Layers className="w-4 h-4" /> Top SKUs com Maior Demanda de Abastecimento
                </h4>
                <p className="text-[10px] text-[#6a7d92] mt-0.5">Identificação das mercadorias de maior giro e paletes solicitados</p>
              </div>

              <div className="h-64 w-full">
                {chartSkuData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-[#6a7d92] text-xs">Sem solicitações de SKUs registradas.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartSkuData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid stroke="#1c2530" strokeDasharray="3 3" />
                      <XAxis type="number" stroke="#6a7d92" fontSize={10} tickLine={false} />
                      <YAxis type="category" dataKey="name" stroke="#e8eef5" fontSize={9} width={120} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0e121a', borderColor: '#222d3a', borderRadius: '8px' }} 
                      />
                      <Bar dataKey="pallets" name="Paletes" fill="#10b981" radius={[0, 4, 4, 0]} maxBarSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Chart: Bottlenecks by Mode (Durante vs Após) */}
            <div className="g-card p-5 flex flex-col gap-4">
              <div>
                <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-[#f5a623] flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4" /> Eficiência de Tempo por Tipo de Reabastecimento
                </h4>
                <p className="text-[10px] text-[#6a7d92] mt-0.5">Comparativo do tempo médio de execução: Durante o Carregamento vs Após o Carregamento</p>
              </div>

              <div className="h-64 w-full flex flex-col md:flex-row gap-4 items-center">
                {kpis.completedCount === 0 ? (
                  <div className="h-full w-full flex items-center justify-center text-[#6a7d92] text-xs">Sem dados comparativos de modos operacionais.</div>
                ) : (
                  <>
                    <div className="flex-1 h-full w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartModeEfficiency} margin={{ top: 20, right: 10, left: -25, bottom: 0 }}>
                          <CartesianGrid stroke="#1c2530" strokeDasharray="3 3" />
                          <XAxis dataKey="mode" stroke="#6a7d92" fontSize={9} tickLine={false} />
                          <YAxis stroke="#6a7d92" fontSize={10} tickLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: '#0e121a' }} />
                          <Bar dataKey="avgTime" name="Tempo Médio (min)" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={40}>
                            <Cell fill="#a855f7" />
                            <Cell fill="#ec4899" />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="w-full md:w-52 flex flex-col gap-3 justify-center">
                      <div className="p-3 bg-[#151b23] border border-[#222d3a] rounded-lg">
                        <span className="text-[9px] text-[#6a7d92] uppercase font-bold block">Durante Carregamento</span>
                        <div className="flex justify-between items-baseline mt-1">
                          <span className="text-lg font-black text-purple-400">{chartModeEfficiency[0].avgTime} min</span>
                          <span className="text-[9px] text-[#6a7d92]">{kpis.duranteCount} paletes</span>
                        </div>
                      </div>

                      <div className="p-3 bg-[#151b23] border border-[#222d3a] rounded-lg">
                        <span className="text-[9px] text-[#6a7d92] uppercase font-bold block">Após Carregamento</span>
                        <div className="flex justify-between items-baseline mt-1">
                          <span className="text-lg font-black text-pink-400">{chartModeEfficiency[1].avgTime} min</span>
                          <span className="text-[9px] text-[#6a7d92]">{kpis.aposCount} paletes</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

          </div>

          {/* IoT Telemetry Tracking map details */}
          <div className="g-card p-5">
            <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-[#f5a623] mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Telemetria de Rotas & Mapeamento IoT de Empilhadeiras
            </h4>
            <p className="text-[10px] text-[#6a7d92] mb-4">Inspeção de rastreamento de trajeto, paradas não programadas e detecção de ociosidade operacional</p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Telemetry quick status checklist */}
              <div className="lg:col-span-2 flex flex-col gap-3 max-h-80 overflow-y-auto pr-1">
                {tasks.filter(t => t.status === 'done').slice(0, 5).map((t, idx) => (
                  <div 
                    key={t._docId || idx} 
                    onClick={() => setSelectedTaskDetails(t)}
                    className={`p-3 border rounded-xl cursor-pointer transition-all flex items-center justify-between text-xs ${selectedTaskDetails?.id === t.id ? 'bg-[#f5a623]/10 border-[#f5a623]' : 'bg-[#151b23]/40 border-[#222d3a] hover:bg-[#1a212d]'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="p-2 bg-[#11151c] rounded-lg text-[#10b981]">
                        <CheckCircle2 className="w-4 h-4" />
                      </span>
                      <div>
                        <span className="text-[10px] text-[#6a7d92] font-mono block"># {t.id} · {t.operador}</span>
                        <strong className="text-snow">{t.descricao}</strong>
                      </div>
                    </div>

                    <div className="text-right flex items-center gap-4">
                      <div>
                        <span className="text-[9px] text-[#6a7d92] uppercase font-bold block">Distância IoT</span>
                        <strong className="text-[#f5a623]">{t.locData?.distanciaM || 180} metros</strong>
                      </div>
                      <span className="text-[10px] bg-gradient-to-r from-teal-500/10 to-transparent text-teal-400 border border-teal-500/20 px-2 py-1 rounded">
                        Detalhes IoT
                      </span>
                    </div>
                  </div>
                ))}

                {tasks.filter(t => t.status === 'done').length === 0 && (
                  <div className="text-center p-6 text-xs text-[#6a7d92] bg-[#151b23]/20 rounded-xl border border-dashed border-[#222d3a]">
                    Nenhum picking finalizado para rastrear coordenadas.
                  </div>
                )}
              </div>

              {/* Map detail preview panel */}
              <div className="p-4 bg-[#11151c] border border-[#222d3a] rounded-xl flex flex-col gap-3 justify-between">
                <div>
                  <span className="text-[9px] text-amber-500 font-mono font-bold tracking-widest block uppercase">PAINEL DE TELEMETRIA IoT</span>
                  <h5 className="text-xs font-bold text-snow mt-1">
                    {selectedTaskDetails ? `Tarefa #${selectedTaskDetails.id}` : 'Selecione uma tarefa'}
                  </h5>
                  <p className="text-[10px] text-[#6a7d92] mt-1">
                    {selectedTaskDetails ? `Operador: ${selectedTaskDetails.operador}` : 'Selecione um dos registros finalizados ao lado para analisar a telemetria do percurso.'}
                  </p>
                </div>

                {selectedTaskDetails ? (
                  <div className="flex flex-col gap-3 py-2">
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="p-2 bg-[#151b23] rounded border border-[#222d3a]">
                        <span className="text-[#6a7d92] block">DISTÂNCIA TOTAL</span>
                        <strong className="text-snow text-xs">{selectedTaskDetails.locData?.distanciaM || 180}m</strong>
                      </div>
                      <div className="p-2 bg-[#151b23] rounded border border-[#222d3a]">
                        <span className="text-[#6a7d92] block">TEMPO PARADO</span>
                        <strong className="text-snow text-xs">{selectedTaskDetails.locData?.totalIdleSec || 45}s</strong>
                      </div>
                      <div className="p-2 bg-[#151b23] rounded border border-[#222d3a]">
                        <span className="text-[#6a7d92] block">PARADAS DETECTADAS</span>
                        <strong className="text-snow text-xs">{selectedTaskDetails.locData?.segmentosParado || 0}</strong>
                      </div>
                      <div className="p-2 bg-[#151b23] rounded border border-[#222d3a]">
                        <span className="text-[#6a7d92] block">CONFERENTE EMISSOR</span>
                        <strong className="text-snow text-[9px] truncate block">{selectedTaskDetails.conferente}</strong>
                      </div>
                    </div>

                    {selectedTaskDetails.locData?.mapsLink && (
                      <a 
                        href={selectedTaskDetails.locData.mapsLink}
                        target="_blank"
                        rel="noreferrer"
                        className="py-2 px-3 text-center bg-[#f5a623] hover:bg-[#d4780a] text-[#11151c] font-black text-[10px] uppercase rounded-lg tracking-wider transition-all block cursor-pointer"
                      >
                        🗺️ Ver Trajeto no Google Maps
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-[#6a7d92] text-xs">
                    <AlertCircle className="w-6 h-6 text-[#6a7d92] mb-1.5" />
                    <span>Aguardando seleção...</span>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Filters and detailed registry list */}
          <div className="g-card p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div>
                <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-[#6a7d92]">Tabela Geral de Lançamentos de Picking</h4>
                <p className="text-[10px] text-[#6a7d92] mt-0.5">Relação completa de abastecimentos pendentes, ativos e concluídos no pátio</p>
              </div>

              {/* Filtering Controls */}
              <div className="flex flex-wrap items-center gap-2">
                
                {/* Search */}
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-2.5">
                    <Search className="w-3 h-3 text-[#6a7d92]" />
                  </span>
                  <input 
                    type="text"
                    placeholder="Filtrar por SKU, operador..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="g-input pl-8 py-1.5 text-xs bg-[#151b23] border-[#1c2530] w-48"
                  />
                </div>

                {/* Operator filter */}
                <select 
                  value={selectedOperator}
                  onChange={e => setSelectedOperator(e.target.value)}
                  className="g-input py-1.5 text-xs bg-[#151b23] border-[#1c2530]"
                >
                  <option value="all">Todos Operadores</option>
                  {operators.map(op => <option key={op} value={op}>{op}</option>)}
                </select>

                {/* Status filter */}
                <select 
                  value={selectedStatus}
                  onChange={e => setSelectedStatus(e.target.value)}
                  className="g-input py-1.5 text-xs bg-[#151b23] border-[#1c2530]"
                >
                  <option value="all">Todos Status</option>
                  <option value="pending">Aguardando</option>
                  <option value="in_progress">Em Andamento</option>
                  <option value="done">Concluído</option>
                </select>

                {/* Mode filter */}
                <select 
                  value={selectedMode}
                  onChange={e => setSelectedMode(e.target.value)}
                  className="g-input py-1.5 text-xs bg-[#151b23] border-[#1c2530]"
                >
                  <option value="all">Todos os Modos</option>
                  <option value="durante">Durante Carregamento</option>
                  <option value="apos">Após Carregamento</option>
                </select>

              </div>
            </div>

            {/* List Table container */}
            <div className="overflow-x-auto border border-[#222d3a] rounded-xl bg-[#0b0f15]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#11151c] border-b border-[#222d3a] text-[#6a7d92] uppercase font-bold text-[9px] tracking-wider">
                    <th className="p-3">ID / SKU</th>
                    <th className="p-3">Produto Descrição</th>
                    <th className="p-3 text-center">Paletes</th>
                    <th className="p-3">Conferente Emissor</th>
                    <th className="p-3">Operador Picking</th>
                    <th className="p-3">Modo</th>
                    <th className="p-3 text-center">Tempo Operação</th>
                    <th className="p-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222d3a]/50">
                  {filteredTasks.map((t, idx) => (
                    <tr key={t._docId || idx} className="hover:bg-[#151b23]/25 transition-all text-[#e8eef5]">
                      <td className="p-3 whitespace-nowrap">
                        <span className="font-mono text-[10px] block text-amber-500">#{t.id}</span>
                        <span className="text-[10px] font-bold text-[#6a7d92] font-mono">SKU {t.codigo}</span>
                      </td>
                      <td className="p-3 max-w-xs truncate font-bold text-[#e8eef5]">{t.descricao}</td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <span className="text-sm font-black text-snow">{t.quantidade}</span>
                      </td>
                      <td className="p-3 text-[#6a7d92] font-bold truncate max-w-[120px]">{t.conferente}</td>
                      <td className="p-3 text-[#3b82f6] font-black truncate max-w-[120px]">{t.operador}</td>
                      <td className="p-3 whitespace-nowrap">
                        {t.status === 'pending' ? (
                          <span className="text-[#6a7d92] text-[10px]">—</span>
                        ) : (
                          <span className={`text-[10px] font-bold ${t.tipoOperacao?.includes('Durante') ? 'text-purple-400' : 'text-pink-400'}`}>
                            {t.tipoOperacao || '—'}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap font-mono font-bold">
                        {t.status === 'done' ? (
                          <span className="text-[#10b981] text-xs">{t.duracaoMin} min</span>
                        ) : t.status === 'in_progress' ? (
                          <span className="text-sky-400 animate-pulse text-[10px] uppercase">Em andamento...</span>
                        ) : (
                          <span className="text-[#6a7d92] text-[10px] uppercase">Aguardando...</span>
                        )}
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border tracking-wider ${
                          t.status === 'done' ? 'bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20' :
                          t.status === 'in_progress' ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' :
                          'bg-amber-500/10 text-[#f5a623] border-amber-500/20'
                        }`}>
                          {t.status === 'done' ? 'Concluído' : t.status === 'in_progress' ? 'Ativo' : 'Pendente'}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {filteredTasks.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-[#6a7d92] text-xs uppercase tracking-widest font-mono">
                        Nenhum lançamento corresponde aos filtros ativos.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          </>
          ) : (
            <A3BoardComponent user={user} empresa={empresa} dashboard="picking" />
          )}
        </>
      )}

    </div>
  );
}
export {};
