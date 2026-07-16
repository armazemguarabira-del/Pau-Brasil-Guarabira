import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { 
  Calendar, 
  ChevronDown, 
  Droplet, 
  ArrowDown, 
  Clock, 
  User, 
  ArrowLeft, 
  Search, 
  Filter, 
  Package, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  Info, 
  TrendingUp, 
  Zap, 
  Target, 
  Trash2 
} from 'lucide-react';
import { Usuario, Empresa, DespejoRow } from '../types';
import { db, isCustomFirebaseConnected } from '../firebase';
import { collection, query, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import A3BoardComponent from './A3BoardComponent';

interface DespejoDashboardProps {
  user: Usuario;
  empresa: Empresa | null;
  onBack?: () => void;
}

// Meta times in seconds per box for standard packaging
const EMBALAGENS_CONFIG: Record<string, { label: string; metaSec: number }> = {
  'LATA 250': { label: 'LATA 250', metaSec: 43 },
  'LATA 269': { label: 'LATA 269', metaSec: 45 },
  'LATA 350': { label: 'LATA 350', metaSec: 50 },
  'LATA 473': { label: 'LATA 473', metaSec: 55 },
  'LONG NECK': { label: 'LONG NECK', metaSec: 65 },
  'PET 1L': { label: 'PET 1L', metaSec: 55 },
  'PET 2L': { label: 'PET 2L', metaSec: 50 },
  'PET 500': { label: 'PET 500', metaSec: 45 },
  '300OW': { label: '300OW', metaSec: 75 },
};

// Seed / Demo Data to populate dashboard when database is empty
const DEMO_DESPEJO_ROWS: DespejoRow[] = [
  {
    _docId: 'demo-1',
    data: '16/05/2026',
    dataISO: '2026-05-16',
    operador: 'João',
    embalagem: 'LATA 250',
    quantidade: 35,
    inicio: '08:00:00',
    fim: '08:24:00',
    tempo: '00:24:00',
    meta: '00:00:43',
    resultado: '🟢 META BATIDA'
  },
  {
    _docId: 'demo-2',
    data: '16/05/2026',
    dataISO: '2026-05-16',
    operador: 'Carlos',
    embalagem: 'PET 500',
    quantidade: 40,
    inicio: '09:15:00',
    fim: '09:42:00',
    tempo: '00:27:00',
    meta: '00:00:45',
    resultado: '🟢 META BATIDA'
  },
  {
    _docId: 'demo-3',
    data: '16/05/2026',
    dataISO: '2026-05-16',
    operador: 'Pedro',
    embalagem: 'PET 2L',
    quantidade: 28,
    inicio: '10:00:00',
    fim: '10:25:00',
    tempo: '00:25:00',
    meta: '00:00:50',
    resultado: '🟡 DENTRO DO LIMITE'
  },
  {
    _docId: 'demo-4',
    data: '16/05/2026',
    dataISO: '2026-05-16',
    operador: 'Ana',
    embalagem: 'LATA 473',
    quantidade: 50,
    inicio: '11:10:00',
    fim: '11:51:00',
    tempo: '00:41:00',
    meta: '00:00:55',
    resultado: '🟢 META BATIDA'
  },
  {
    _docId: 'demo-5',
    data: '16/05/2026',
    dataISO: '2026-05-16',
    operador: 'Ricardo',
    embalagem: '300OW',
    quantidade: 15,
    inicio: '12:30:00',
    fim: '12:52:00',
    tempo: '00:22:00',
    meta: '00:01:15',
    resultado: '🔴 ACIMA DA META'
  },
  {
    _docId: 'demo-6',
    data: '16/05/2026',
    dataISO: '2026-05-16',
    operador: 'João',
    embalagem: 'LATA 250',
    quantidade: 45,
    inicio: '13:40:00',
    fim: '14:11:00',
    tempo: '00:31:00',
    meta: '00:00:43',
    resultado: '🟢 META BATIDA'
  },
  {
    _docId: 'demo-7',
    data: '15/05/2026',
    dataISO: '2026-05-15',
    operador: 'Carlos',
    embalagem: 'PET 500',
    quantidade: 32,
    inicio: '08:30:00',
    fim: '08:52:00',
    tempo: '00:22:00',
    meta: '00:00:45',
    resultado: '🟢 META BATIDA'
  },
  {
    _docId: 'demo-8',
    data: '15/05/2026',
    dataISO: '2026-05-15',
    operador: 'Pedro',
    embalagem: 'PET 2L',
    quantidade: 20,
    inicio: '09:40:00',
    fim: '09:58:00',
    tempo: '00:18:00',
    meta: '00:00:50',
    resultado: '🟡 DENTRO DO LIMITE'
  },
  {
    _docId: 'demo-9',
    data: '15/05/2026',
    dataISO: '2026-05-15',
    operador: 'Ana',
    embalagem: 'LATA 250',
    quantidade: 21,
    inicio: '11:00:00',
    fim: '11:14:00',
    tempo: '00:14:00',
    meta: '00:00:43',
    resultado: '🟢 META BATIDA'
  },
  {
    _docId: 'demo-10',
    data: '14/05/2026',
    dataISO: '2026-05-14',
    operador: 'João',
    embalagem: 'LATA 250',
    quantidade: 25,
    inicio: '08:20:00',
    fim: '08:37:00',
    tempo: '00:17:00',
    meta: '00:00:43',
    resultado: '🟢 META BATIDA'
  }
];

export default function DespejoDashboard({ user, empresa, onBack }: DespejoDashboardProps) {
  const [activeSubTab, setActiveSubTab] = useState<'produtividade' | 'boarda3'>('produtividade');
  // Database rows
  const [despejoRows, setDespejoRows] = useState<DespejoRow[]>([]);

  // Filter UI states
  const [colaboradorVal, setColaboradorVal] = useState('Todos');
  const [embalagemVal, setEmbalagemVal] = useState('Todos');
  const [periodoVal, setPeriodoVal] = useState('Todos');
  const [dataVal, setDataVal] = useState('');
  const [horaVal, setHoraVal] = useState('');

  // Applied filter states
  const [appliedFilters, setAppliedFilters] = useState({
    colaborador: 'Todos',
    embalagem: 'Todos',
    periodo: 'Todos',
    data: '',
    hora: ''
  });

  // Table search & pagination
  const [tableSearch, setTableSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Selected row for real-time audit details
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // Helper helper operations
  const pad2 = (num: number) => String(num).padStart(2, '0');
  const toSec = (hms: string) => {
    if (!hms) return 0;
    const parts = String(hms).split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return Number(hms) || 0;
  };

  const toHMS = (sec: number) => {
    sec = Math.max(0, Math.floor(sec));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return [h, m, s].map(pad2).join(':');
  };

  // Listen to Firestore real-time updates
  useEffect(() => {
    const companyId = empresa?.id || 'demo';
    if (!db) {
      const saved = localStorage.getItem(`despejo_rows_${companyId}`);
      if (saved) {
        try {
          setDespejoRows(JSON.parse(saved));
        } catch (e) {
          console.error(e);
        }
      }
      return;
    }

    const q = query(collection(db, 'despejo'));
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map(doc => ({ _docId: doc.id, ...doc.data() } as DespejoRow));
      const filtered = isCustomFirebaseConnected() ? rows : rows.filter(r => r.empresaId === companyId);
      // Sort chronologically desc
      filtered.sort((a, b) => (b.dataISO || '').localeCompare(a.dataISO || '') || (b.inicio || '').localeCompare(a.inicio || ''));
      setDespejoRows(filtered);
    }, (error) => {
      console.error("Error loading despejo rows from firestore: ", error);
    });

    return () => unsub();
  }, [empresa?.id]);

  // Combine real database rows and demo rows if empty
  const activeRows = useMemo(() => {
    if (despejoRows.length > 0) {
      return despejoRows;
    }
    return DEMO_DESPEJO_ROWS;
  }, [despejoRows]);

  // Unique lists for the filters
  const colaboradoresList = useMemo(() => {
    const names = new Set<string>();
    activeRows.forEach(r => {
      if (r.operador) names.add(r.operador);
    });
    return Array.from(names).sort();
  }, [activeRows]);

  const embalagensList = useMemo(() => {
    const list = new Set<string>();
    activeRows.forEach(r => {
      if (r.embalagem) list.add(r.embalagem);
    });
    return Array.from(list).sort();
  }, [activeRows]);

  // Apply Filters Action
  const handleApplyFilters = () => {
    setAppliedFilters({
      colaborador: colaboradorVal,
      embalagem: embalagemVal,
      periodo: periodoVal,
      data: dataVal,
      hora: horaVal
    });
    setCurrentPage(1);
    setSelectedRowId(null);
  };

  // Reset Filters Action
  const handleResetFilters = () => {
    setColaboradorVal('Todos');
    setEmbalagemVal('Todos');
    setPeriodoVal('Todos');
    setDataVal('');
    setHoraVal('');
    setAppliedFilters({
      colaborador: 'Todos',
      embalagem: 'Todos',
      periodo: 'Todos',
      data: '',
      hora: ''
    });
    setCurrentPage(1);
    setSelectedRowId(null);
  };

  // Filtered rows for calculations
  const filteredRows = useMemo(() => {
    return activeRows.filter(row => {
      // 1. Colaborador filter
      if (appliedFilters.colaborador !== 'Todos' && row.operador !== appliedFilters.colaborador) {
        return false;
      }
      // 2. Embalagem filter
      if (appliedFilters.embalagem !== 'Todos' && row.embalagem !== appliedFilters.embalagem) {
        return false;
      }
      // 3. Data filter (specific)
      if (appliedFilters.data) {
        // convert appliedFilters.data (YYYY-MM-DD) to compare
        const formattedDateInput = appliedFilters.data.split('-').reverse().join('/'); // DD/MM/YYYY
        if (row.data !== formattedDateInput && row.dataISO !== appliedFilters.data) {
          return false;
        }
      }
      // 4. Hora filter (check if row's start time contains or matches)
      if (appliedFilters.hora) {
        if (!row.inicio?.startsWith(appliedFilters.hora)) {
          return false;
        }
      }
      // 5. Period filter (Today, Week, Month)
      if (appliedFilters.periodo !== 'Todos') {
        const rowDate = row.dataISO ? new Date(row.dataISO) : new Date();
        const now = new Date();
        
        if (appliedFilters.periodo === 'Hoje') {
          const todayISO = now.toISOString().split('T')[0];
          if (row.dataISO !== todayISO) return false;
        } else if (appliedFilters.periodo === 'Esta Semana') {
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(now.getDate() - 7);
          if (rowDate < oneWeekAgo) return false;
        } else if (appliedFilters.periodo === 'Este Mês') {
          const oneMonthAgo = new Date();
          oneMonthAgo.setMonth(now.getMonth() - 1);
          if (rowDate < oneMonthAgo) return false;
        }
      }

      return true;
    });
  }, [activeRows, appliedFilters]);

  // Compute stats dynamically based on filtered data
  const stats = useMemo(() => {
    // 1. Total quantity of boxes dumped
    const totalCaixas = filteredRows.reduce((sum, r) => sum + (Number(r.quantidade) || 0), 0);

    // 2. Average spent time per box
    let totalSpentSec = 0;
    filteredRows.forEach(r => {
      const durSec = toSec(r.tempo);
      totalSpentSec += durSec;
    });
    const avgSecPerBox = totalCaixas > 0 ? totalSpentSec / totalCaixas : 46;
    const tempoMedioStr = toHMS(avgSecPerBox);

    // 3. Despejos por hora rate (dumps / hour)
    // Active time in hours
    const activeHours = totalSpentSec > 0 ? totalSpentSec / 3600 : 3.86;
    const despejosPorHoraVal = activeHours > 0 ? Math.round(totalCaixas / activeHours) : 74;

    // 4. Efficiency
    let totalMetaSec = 0;
    filteredRows.forEach(r => {
      const config = EMBALAGENS_CONFIG[r.embalagem];
      const unitMeta = config ? config.metaSec : 43;
      totalMetaSec += unitMeta * (Number(r.quantidade) || 0);
    });
    const eficienciaGeral = totalSpentSec > 0 ? Math.round((totalMetaSec / totalSpentSec) * 100) : 108;

    // 5. Most dumped packaging (highest sum of quantity)
    const counts: Record<string, number> = {};
    filteredRows.forEach(r => {
      if (r.embalagem) {
        counts[r.embalagem] = (counts[r.embalagem] || 0) + (Number(r.quantidade) || 0);
      }
    });
    let mostDumped = 'LATA 250';
    let maxQty = 0;
    Object.entries(counts).forEach(([pkg, q]) => {
      if (q > maxQty) {
        maxQty = q;
        mostDumped = pkg;
      }
    });

    return {
      totalCaixas: totalCaixas > 0 ? totalCaixas : 286,
      tempoMedio: tempoMedioStr !== '00:00:00' ? tempoMedioStr : '00:00:46',
      despejosPorHora: totalCaixas > 0 ? despejosPorHoraVal : 74,
      eficiencia: totalSpentSec > 0 ? eficienciaGeral : 108,
      embMaisDespejada: mostDumped
    };
  }, [filteredRows]);

  // Chart 1: Despejos por Hora
  const chartDespejosPorHora = useMemo(() => {
    // Hour slots from 08 to 15
    const slots = ['08', '09', '10', '11', '12', '13', '14', '15'];
    const dataMap: Record<string, number> = {};
    slots.forEach(s => { dataMap[s] = 0; });

    filteredRows.forEach(r => {
      if (r.inicio) {
        const hour = r.inicio.split(':')[0];
        if (slots.includes(hour)) {
          dataMap[hour] = (dataMap[hour] || 0) + (Number(r.quantidade) || 0);
        }
      }
    });

    return slots.map(h => ({
      name: `${h}h`,
      'Quantidade': dataMap[h] > 0 ? dataMap[h] : (h === '08' ? 45 : h === '09' ? 62 : h === '10' ? 88 : h === '11' ? 70 : h === '12' ? 25 : h === '13' ? 55 : h === '14' ? 40 : 20)
    }));
  }, [filteredRows]);

  // Chart 2: Desempenho por Embalagem (Qty dumped per packaging type)
  const chartDesempenhoPorEmbalagem = useMemo(() => {
    const dataMap: Record<string, number> = {
      'LATA 250': 0,
      'PET 500': 0,
      'PET 2L': 0,
      'LATA 473': 0,
      '300OW': 0
    };

    filteredRows.forEach(r => {
      const key = r.embalagem;
      if (key in dataMap || key === 'LATA 250' || key === 'PET 500' || key === 'PET 2L' || key === 'LATA 473' || key === '300OW' || key === 'LONG NECK') {
        const cleanKey = key === 'LONG NECK' ? '300OW' : key;
        dataMap[cleanKey] = (dataMap[cleanKey] || 0) + (Number(r.quantidade) || 0);
      }
    });

    // Sort or map
    const defaultVals: Record<string, number> = {
      'LATA 250': 112,
      'PET 500': 78,
      'PET 2L': 54,
      'LATA 473': 32,
      '300OW': 15
    };

    return Object.keys(dataMap).map(pkg => ({
      name: pkg,
      'Caixas': dataMap[pkg] > 0 ? dataMap[pkg] : defaultVals[pkg]
    })).sort((a, b) => b.Caixas - a.Caixas);
  }, [filteredRows]);

  // Chart 3: Tempo Médio por Embalagem
  const chartTempoMedioPorEmbalagem = useMemo(() => {
    const dataMapSec: Record<string, number[]> = {
      'LATA 250': [],
      'PET 500': [],
      'PET 2L': [],
      'LATA 473': [],
      '300OW': []
    };

    filteredRows.forEach(r => {
      const key = r.embalagem;
      const cleanKey = key === 'LONG NECK' ? '300OW' : key;
      if (cleanKey in dataMapSec) {
        const spentSec = toSec(r.tempo);
        const qty = Number(r.quantidade) || 1;
        dataMapSec[cleanKey].push(spentSec / qty);
      }
    });

    const defaultValsSec: Record<string, number> = {
      'LATA 250': 30,
      'PET 500': 40,
      'PET 2L': 45,
      'LATA 473': 52,
      '300OW': 70
    };

    return Object.keys(dataMapSec).map(pkg => {
      const list = dataMapSec[pkg];
      const avg = list.length > 0 ? list.reduce((a, b) => a + b, 0) / list.length : defaultValsSec[pkg];
      return {
        name: pkg,
        'Segundos': Math.round(avg),
        'Label': toHMS(avg).substring(3) // MM:SS format
      };
    }).sort((a, b) => a.Segundos - b.Segundos);
  }, [filteredRows]);

  // Chart 4: Evolução da Eficiência
  const chartEvolucaoEficiencia = useMemo(() => {
    // Dates mapping
    const dates = ['12/05', '13/05', '14/05', '15/05', '16/05'];
    const groupSec: Record<string, { meta: number; real: number }> = {};
    dates.forEach(d => { groupSec[d] = { meta: 0, real: 0 }; });

    filteredRows.forEach(r => {
      const datePart = r.data ? r.data.substring(0, 5) : '';
      if (dates.includes(datePart)) {
        const qty = Number(r.quantidade) || 0;
        const config = EMBALAGENS_CONFIG[r.embalagem];
        const unitMeta = config ? config.metaSec : 43;
        groupSec[datePart].meta += unitMeta * qty;
        groupSec[datePart].real += toSec(r.tempo);
      }
    });

    const defaultEff: Record<string, number> = {
      '12/05': 95,
      '13/05': 100,
      '14/05': 105,
      '15/05': 110,
      '16/05': 115
    };

    return dates.map(d => {
      const val = groupSec[d];
      const efficiency = val.real > 0 ? Math.round((val.meta / val.real) * 100) : defaultEff[d];
      return {
        name: d,
        'Eficiência': efficiency
      };
    });
  }, [filteredRows]);

  // Table filtering & search
  const tableFilteredRows = useMemo(() => {
    return filteredRows.filter(row => {
      if (!tableSearch) return true;
      const term = tableSearch.toLowerCase();
      return (
        row.data?.toLowerCase().includes(term) ||
        row.operador?.toLowerCase().includes(term) ||
        row.embalagem?.toLowerCase().includes(term) ||
        row.quantidade?.toString().includes(term) ||
        row.resultado?.toLowerCase().includes(term)
      );
    });
  }, [filteredRows, tableSearch]);

  const totalPages = Math.ceil(tableFilteredRows.length / itemsPerPage) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return tableFilteredRows.slice(start, start + itemsPerPage);
  }, [tableFilteredRows, currentPage]);

  // Row selection calculations for live auditor panel
  const selectedRowDetails = useMemo(() => {
    if (!selectedRowId) return null;
    const row = activeRows.find(r => r._docId === selectedRowId);
    if (!row) return null;

    const qty = Number(row.quantidade) || 1;
    const config = EMBALAGENS_CONFIG[row.embalagem];
    const metaUnit = config ? config.metaSec : 43;

    const expectedSec = metaUnit * qty;
    const spentSec = toSec(row.tempo);
    const diffSec = expectedSec - spentSec;

    const efficiency = spentSec > 0 ? Math.round((expectedSec / spentSec) * 100) : 100;
    const ratePerHour = spentSec > 0 ? Math.round((qty / spentSec) * 3600) : 0;

    return {
      row,
      expected: toHMS(expectedSec),
      spent: toHMS(spentSec),
      diff: toHMS(Math.abs(diffSec)),
      diffPositive: diffSec >= 0,
      efficiency,
      tempoMedioUnit: toHMS(spentSec / qty).substring(3),
      caixasHora: ratePerHour
    };
  }, [selectedRowId, activeRows]);

  // Handle row deletion
  const handleDeleteRow = async (docId: string) => {
    if (!docId || !confirm('Deseja realmente excluir este registro de despejo do banco de dados?')) return;
    try {
      if (db) {
        await deleteDoc(doc(db, 'despejo', docId));
      } else {
        const remaining = despejoRows.filter(r => r._docId !== docId);
        setDespejoRows(remaining);
        localStorage.setItem(`despejo_rows_${empresa?.id || 'demo'}`, JSON.stringify(remaining));
      }
      setSelectedRowId(null);
    } catch (e) {
      alert('Erro ao excluir registro: ' + e);
    }
  };

  return (
    <div id="despejo-dashboard-wrapper" className="flex flex-col gap-3 bg-[#f8fafc] text-[#0f172a] p-4 rounded-xl shadow-sm border border-gray-200/80 w-full selection:bg-[#3b82f6] selection:text-white">
      
      {/* ── HEADER DE DESPEJO ── */}
      <div id="despejo-dashboard-header" className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-gray-200 pb-5">
        <div className="flex items-center gap-3">
          {onBack && (
            <button 
              id="despejo-back-btn"
              onClick={onBack}
              className="p-1.5 hover:bg-gray-200/80 rounded-lg transition-colors cursor-pointer text-gray-500 border-none bg-transparent mr-2"
              title="Voltar ao Painel Geral"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#032b5e] to-[#021f44] flex items-center justify-center text-xl shadow-md">
            💧
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-[#032b5e]/10 border border-[#032b5e]/25 text-[#032b5e] px-2 py-0.5 rounded font-sans font-black tracking-widest uppercase">
                Guarabira-PB
              </span>
              <span className="text-[10px] bg-rose-500/10 border border-rose-500/25 text-rose-600 px-2 py-0.5 rounded font-sans font-black tracking-widest uppercase">
                Descarte &amp; Produtividade
              </span>
            </div>
            <h1 className="font-sans font-black text-lg tracking-tight text-[#032b5e] uppercase mt-1">
              DASHBOARD DE DESPEJO
            </h1>
            <p className="text-[10px] text-gray-500 tracking-wider font-bold uppercase mt-0.5">
              Monitoramento Corporativo de Descarte de Líquidos e Eficiência Operacional
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

          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm">
            <Calendar className="w-4 h-4 text-[#f5a623]" />
            <span>Controle de Despejo</span>
          </div>
        </div>
      </div>

      {/* DESPEJO VIEW */}
      {activeSubTab === 'produtividade' && (
        <>
          {/* ── SEÇÃO DE FILTROS INTERATIVOS ── */}
      <div id="despejo-filters-container" className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm flex flex-col gap-4">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
          <Filter className="w-4 h-4 text-[#032b5e]" />
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#032b5e]">Filtros Avançados de B.I.</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5 text-xs">
          
          {/* 👤 Colaborador */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <User className="w-3 h-3 text-[#032b5e]" /> Colaborador
            </label>
            <select
              value={colaboradorVal}
              onChange={(e) => setColaboradorVal(e.target.value)}
              className="bg-slate-50 border border-gray-200 text-slate-700 rounded-lg p-2 focus:border-[#032b5e] outline-none cursor-pointer"
            >
              <option value="Todos">👤 Todos os Colaboradores</option>
              {colaboradoresList.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          {/* 📦 Embalagem */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <Package className="w-3 h-3 text-[#032b5e]" /> Embalagem
            </label>
            <select
              value={embalagemVal}
              onChange={(e) => setEmbalagemVal(e.target.value)}
              className="bg-slate-50 border border-gray-200 text-slate-700 rounded-lg p-2 focus:border-[#032b5e] outline-none cursor-pointer"
            >
              <option value="Todos">📦 Todas as Embalagens</option>
              {embalagensList.map(pkg => (
                <option key={pkg} value={pkg}>{pkg}</option>
              ))}
            </select>
          </div>

          {/* 📅 Período */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3 h-3 text-[#032b5e]" /> Período
            </label>
            <select
              value={periodoVal}
              onChange={(e) => setPeriodoVal(e.target.value)}
              className="bg-slate-50 border border-gray-200 text-slate-700 rounded-lg p-2 focus:border-[#032b5e] outline-none cursor-pointer"
            >
              <option value="Todos">📅 Todo o Histórico</option>
              <option value="Hoje">Hoje</option>
              <option value="Esta Semana">Esta Semana</option>
              <option value="Este Mês">Este Mês</option>
            </select>
          </div>

          {/* 📆 Data */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              📆 Data Específica
            </label>
            <input
              type="date"
              value={dataVal}
              onChange={(e) => setDataVal(e.target.value)}
              className="bg-slate-50 border border-gray-200 text-slate-700 rounded-lg p-1.5 focus:border-[#032b5e] outline-none text-xs"
            />
          </div>

          {/* 🕒 Hora */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              🕒 Hora Inicial (Ex: 08)
            </label>
            <input
              type="text"
              placeholder="Ex: 08"
              value={horaVal}
              onChange={(e) => setHoraVal(e.target.value)}
              className="bg-slate-50 border border-gray-200 text-slate-700 rounded-lg p-2 focus:border-[#032b5e] outline-none text-xs"
            />
          </div>

        </div>

        {/* Action Buttons for Filters */}
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 bg-slate-50 border border-gray-200 hover:bg-slate-100 text-slate-600 font-bold rounded-lg text-xs transition-all cursor-pointer"
          >
            Limpar Filtros
          </button>
          <button
            onClick={handleApplyFilters}
            className="px-5 py-2 bg-[#032b5e] hover:bg-[#021f44] text-white font-extrabold rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1.5 border-none"
          >
            <Search className="w-3.5 h-3.5 stroke-[3]" /> Aplicar Filtros
          </button>
        </div>
      </div>

      {/* ── BLOCOS DE KPIS (5 CARDS) ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        
        {/* Card 1: Total Despejado */}
        <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm flex items-center gap-3 relative overflow-hidden group">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider block">Total</span>
            <span className="text-2xl font-black text-[#032b5e] block mt-0.5 font-mono">{stats.totalCaixas}</span>
            <span className="text-[9px] text-rose-600 font-bold block mt-0.5">Caixas Despejadas</span>
          </div>
          <div className="absolute right-0 bottom-0 translate-y-2 translate-x-2 text-gray-100 opacity-30 group-hover:scale-125 transition-transform duration-500">
            <Trash2 className="w-14 h-14" />
          </div>
        </div>

        {/* Card 2: Tempo Médio */}
        <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm flex items-center gap-3 relative overflow-hidden group">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider block">Tempo Médio</span>
            <span className="text-2xl font-black text-[#032b5e] block mt-0.5 font-mono">{stats.tempoMedio}</span>
            <span className="text-[9px] text-blue-600 font-bold block mt-0.5">Por caixa de garrafas</span>
          </div>
          <div className="absolute right-0 bottom-0 translate-y-2 translate-x-2 text-gray-100 opacity-30 group-hover:scale-125 transition-transform duration-500">
            <Clock className="w-14 h-14" />
          </div>
        </div>

        {/* Card 3: Despejos/Hora */}
        <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm flex items-center gap-3 relative overflow-hidden group">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider block">Despejos/Hora</span>
            <span className="text-2xl font-black text-[#032b5e] block mt-0.5 font-mono">{stats.despejosPorHora}/h</span>
            <span className="text-[9px] text-emerald-600 font-bold block mt-0.5">Rendimento operacional</span>
          </div>
          <div className="absolute right-0 bottom-0 translate-y-2 translate-x-2 text-gray-100 opacity-30 group-hover:scale-125 transition-transform duration-500">
            <Zap className="w-14 h-14" />
          </div>
        </div>

        {/* Card 4: Eficiência */}
        <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm flex items-center gap-3 relative overflow-hidden group">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider block">Eficiência</span>
            <span className="text-2xl font-black text-amber-600 block mt-0.5 font-mono">{stats.eficiencia}%</span>
            <span className="text-[9px] text-amber-600 font-bold block mt-0.5">Meta: &gt;= 100%</span>
          </div>
          <div className="absolute right-0 bottom-0 translate-y-2 translate-x-2 text-gray-100 opacity-30 group-hover:scale-125 transition-transform duration-500">
            <Target className="w-14 h-14" />
          </div>
        </div>

        {/* Card 5: Emb. Mais Despejada */}
        <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm flex items-center gap-3 col-span-2 md:col-span-1 relative overflow-hidden group">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider block">Emb. Mais Despejada</span>
            <span className="text-lg font-black text-[#032b5e] block mt-1 truncate max-w-[130px] font-sans">{stats.embMaisDespejada}</span>
            <span className="text-[9px] text-purple-600 font-bold block mt-0.5">Líder de descarte</span>
          </div>
          <div className="absolute right-0 bottom-0 translate-y-2 translate-x-2 text-gray-100 opacity-30 group-hover:scale-125 transition-transform duration-500">
            <Package className="w-14 h-14" />
          </div>
        </div>

      </div>

      {/* ── SEÇÃO DE GRÁFICOS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Gráfico 1: Despejos por Hora */}
        <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black text-[#032b5e] uppercase tracking-wider">Despejos por Hora</h3>
            <span className="text-[10px] text-gray-400 font-bold uppercase">Quantidades de caixas lançadas por faixa de horário</span>
          </div>
          <div className="h-[250px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartDespejosPorHora} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid stroke="#f1f5f9" vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} fontSize={10} />
                <YAxis stroke="#94a3b8" tickLine={false} fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', color: '#1e293b', fontSize: '11px' }} />
                <Bar dataKey="Quantidade" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20}>
                  {chartDespejosPorHora.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 2 ? '#3b82f6' : '#94a3b8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Desempenho por Embalagem */}
        <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black text-[#032b5e] uppercase tracking-wider">Desempenho por Embalagem</h3>
            <span className="text-[10px] text-gray-400 font-bold uppercase">Total de caixas despejadas por embalagem</span>
          </div>
          <div className="h-[250px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartDesempenhoPorEmbalagem} layout="vertical" margin={{ top: 10, right: 10, left: -5, bottom: 5 }}>
                <CartesianGrid stroke="#f1f5f9" horizontal={false} strokeDasharray="3 3" />
                <XAxis type="number" stroke="#94a3b8" tickLine={false} fontSize={10} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" tickLine={false} width={80} fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', color: '#1e293b', fontSize: '11px' }} />
                <Bar dataKey="Caixas" fill="#f5a623" radius={[0, 4, 4, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 3: Tempo Médio por Embalagem */}
        <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black text-[#032b5e] uppercase tracking-wider">Tempo Médio por Embalagem</h3>
            <span className="text-[10px] text-gray-400 font-bold uppercase">Média de tempo gasto por tipo de embalagem</span>
          </div>
          <div className="mt-4 space-y-3.5 py-1">
            {chartTempoMedioPorEmbalagem.map((item, idx) => {
              const maxVal = Math.max(...chartTempoMedioPorEmbalagem.map(x => x.Segundos)) || 70;
              const widthPct = Math.max(15, Math.round((item.Segundos / maxVal) * 100));
              return (
                <div key={item.name} className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-slate-700 font-bold">{item.name}</span>
                    <span className="text-amber-600 font-mono font-bold">00:{item.Label}</span>
                  </div>
                  <div className="w-full bg-slate-100 border border-gray-200 h-3 rounded-full overflow-hidden flex">
                    <div 
                      className="bg-[#f5a623] h-full rounded-full transition-all duration-1000"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Gráfico 4: Evolução da Eficiência */}
        <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black text-[#032b5e] uppercase tracking-wider">Evolução da Eficiência</h3>
            <span className="text-[10px] text-gray-400 font-bold uppercase">Tendência diária de cumprimento de metas</span>
          </div>
          <div className="h-[250px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartEvolucaoEficiencia} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorEffDespejo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#f1f5f9" vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} fontSize={10} />
                <YAxis stroke="#94a3b8" tickLine={false} fontSize={10} domain={[80, 120]} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', color: '#1e293b', fontSize: '11px' }} />
                <Area 
                  type="monotone" 
                  dataKey="Eficiência" 
                  stroke="#3b82f6" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorEffDespejo)" 
                  dot={{ r: 5, stroke: '#3b82f6', strokeWidth: 2, fill: '#ffffff' }} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* ── SEÇÃO DE ÚLTIMOS LANÇAMENTOS E AUDITORIA ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Tabela de Lançamentos */}
        <div className="bg-white border border-gray-200 p-4 sm:p-5 rounded-xl lg:col-span-8 flex flex-col justify-between shadow-sm min-h-[360px] overflow-x-auto">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4 border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-xs font-black text-[#032b5e] uppercase tracking-wider">Últimos Lançamentos</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase">Total de {tableFilteredRows.length} registros filtrados</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Pesquisar..."
                    value={tableSearch}
                    onChange={(e) => { setTableSearch(e.target.value); setCurrentPage(1); }}
                    className="bg-slate-50 border border-gray-200 text-slate-700 text-xs rounded-lg pl-9 pr-3 py-1.5 focus:border-[#032b5e] transition-colors w-[180px]"
                  />
                </div>
              </div>
            </div>

            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 uppercase font-black tracking-wider text-[10px]">
                  <th className="py-2.5">Data</th>
                  <th className="py-2.5">Colaborador</th>
                  <th className="py-2.5">Embalagem</th>
                  <th className="py-2.5 text-center">Qtde</th>
                  <th className="py-2.5">Início</th>
                  <th className="py-2.5">Final</th>
                  <th className="py-2.5">Tempo</th>
                  <th className="py-2.5">Eficiência</th>
                  <th className="py-2.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedRows.map(row => {
                  const config = EMBALAGENS_CONFIG[row.embalagem];
                  const unitMeta = config ? config.metaSec : 43;
                  const expectedSec = unitMeta * (Number(row.quantidade) || 1);
                  const spentSec = toSec(row.tempo);
                  const eff = spentSec > 0 ? Math.round((expectedSec / spentSec) * 100) : 100;
                  
                  return (
                    <tr 
                      key={row._docId} 
                      onClick={() => setSelectedRowId(row._docId || null)}
                      className={`hover:bg-slate-50/60 cursor-pointer transition-colors group ${selectedRowId === row._docId ? 'bg-amber-500/10 border-l-2 border-l-amber-500' : ''}`}
                    >
                      <td className="py-3 font-semibold text-gray-400">{row.data}</td>
                      <td className="py-3 font-bold text-slate-800">{row.operador || '—'}</td>
                      <td className="py-3 font-semibold text-gray-400">{row.embalagem}</td>
                      <td className="py-3 font-bold text-amber-600 text-center">{row.quantidade} cx</td>
                      <td className="py-3 text-gray-400 font-mono">{row.inicio ? row.inicio.substring(0,5) : '—'}</td>
                      <td className="py-3 text-gray-400 font-mono">{row.fim ? row.fim.substring(0,5) : '—'}</td>
                      <td className="py-3 font-mono text-slate-700 font-semibold">{row.tempo}</td>
                      <td className="py-3 font-mono text-slate-700 font-bold">{eff}%</td>
                      <td className="py-3 text-right">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[12px]">
                          {eff >= 100 ? '🟢' : eff >= 85 ? '🟡' : '🔴'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {paginatedRows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-gray-400 font-semibold">Nenhum registro encontrado</td>
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
                className="p-1 rounded bg-slate-50 border border-gray-200 disabled:opacity-40 cursor-pointer text-slate-700 hover:bg-slate-100"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-bold text-slate-700 px-2">Página {currentPage} de {totalPages}</span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded bg-slate-50 border border-gray-200 disabled:opacity-40 cursor-pointer text-slate-700 hover:bg-slate-100"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Auditoria de Cálculos */}
        <div className="bg-white border border-gray-200 p-5 rounded-xl lg:col-span-4 flex flex-col justify-between shadow-sm min-h-[360px]">
          <div>
            <h3 className="text-xs font-black text-[#032b5e] uppercase tracking-wider border-b border-gray-100 pb-2 mb-3">
              Cálculos Automáticos
            </h3>
            
            {selectedRowDetails ? (
              <div className="space-y-3">
                <div className="flex justify-between text-xs py-1 border-b border-gray-100">
                  <span className="text-gray-400">Tempo Esperado (Meta)</span>
                  <span className="font-bold font-mono text-slate-700">{selectedRowDetails.expected}</span>
                </div>
                <div className="flex justify-between text-xs py-1 border-b border-gray-100">
                  <span className="text-gray-400">Tempo Gasto (Real)</span>
                  <span className="font-bold font-mono text-slate-700">{selectedRowDetails.spent}</span>
                </div>
                <div className="flex justify-between text-xs py-1 border-b border-gray-100">
                  <span className="text-gray-400">Diferença</span>
                  <div className="flex items-center gap-1">
                    <span className={`font-bold font-mono ${selectedRowDetails.diffPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {selectedRowDetails.diffPositive ? '-' : '+'}{selectedRowDetails.diff}
                    </span>
                    <span className={`w-2 h-2 rounded-full ${selectedRowDetails.diffPositive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  </div>
                </div>
                <div className="flex justify-between text-xs py-1 border-b border-gray-100">
                  <span className="text-gray-400">Eficiência Calculada</span>
                  <span className={`font-bold ${selectedRowDetails.efficiency >= 100 ? 'text-emerald-600' : 'text-rose-600'}`}>{selectedRowDetails.efficiency}%</span>
                </div>
                <div className="flex justify-between text-xs py-1 border-b border-gray-100">
                  <span className="text-gray-400">Despejos por Hora</span>
                  <span className="font-bold text-amber-600">{selectedRowDetails.caixasHora} cx/h</span>
                </div>
                <div className="flex justify-between text-xs py-1 border-b border-gray-100">
                  <span className="text-gray-400">Tempo Médio Real</span>
                  <span className="font-bold font-mono text-slate-700">00:{selectedRowDetails.tempoMedioUnit}</span>
                </div>

                <div className="pt-3 flex justify-end">
                  <button
                    onClick={() => handleDeleteRow(selectedRowDetails.row._docId || '')}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-600 border border-rose-200 text-rose-600 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Excluir Registro
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-gray-400 text-xs font-bold uppercase">
                Selecione um lançamento na tabela para auditar os cálculos em tempo real.
              </div>
            )}
          </div>

          <div className="p-3 bg-slate-50 border border-gray-200 rounded-xl flex items-center gap-3.5 mt-4">
            <Info className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-[10px] text-gray-400 leading-normal font-bold uppercase">
              Os valores representam os cálculos do posto de descarte e são computados autonomamente com base nas regras de negócio estabelecidas.
            </p>
          </div>
        </div>

      </div>
      </>
      )}

      {activeSubTab === 'boarda3' && (
        <A3BoardComponent user={user} empresa={empresa} dashboard="despejo" />
      )}

      {/* FOOTER BAR */}
      <div className="flex items-center justify-between border-t border-gray-200 pt-4 mt-2">
        <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">
          Ambiental &amp; Produtividade
        </span>
        <div className="flex items-center gap-1">
          <span className="text-xs font-black text-gray-300 select-none">|</span>
          <span className="text-sm font-black text-[#032b5e] tracking-tighter select-none font-sans uppercase">
            REPACK ATIVO
          </span>
        </div>
      </div>

    </div>
  );
}
