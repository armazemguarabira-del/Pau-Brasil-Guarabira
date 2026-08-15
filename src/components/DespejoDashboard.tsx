import { ManualInstrucaoCard } from './ManualInstrucaoCard';
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
  Trash2,
  Box,
  AlertTriangle,
  SlidersHorizontal,
  CheckCircle2,
  BarChart2
} from 'lucide-react';
import { Usuario, Empresa, DespejoRow, QuebraRow } from '../types';
import { db, isCustomFirebaseConnected } from '../firebase';
import { deleteDoc, doc, collection, addDoc } from 'firebase/firestore';
import { useEmpresaData } from '../context/EmpresaDataContext';
import { analisarQuebraParaDespejo } from '../utils/quebrasDespejoUtils';
import A3BoardComponent from './A3BoardComponent';
import CalendarFilter from './CalendarFilter';
import { SimuladorAgilidadeMeta } from './SimuladorAgilidadeMeta';
import { PadraoOperacionalModal } from './PadraoOperacionalModal';
import { SopManagerModal } from './SopManagerModal';

interface DespejoDashboardProps {
  user: Usuario;
  empresa: Empresa | null;
  onBack?: () => void;
  theme?: 'light' | 'dark';
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

export default function DespejoDashboard({ user, empresa, onBack }: DespejoDashboardProps) {
  const [activeSubTab, setActiveSubTab] = useState<'produtividade' | 'boarda3'>('produtividade');
  // Database rows
  const [despejoRows, setDespejoRows] = useState<DespejoRow[]>([]);

  // Filter UI states
  const [colaboradorVal, setColaboradorVal] = useState('Todos');
  const [embalagemVal, setEmbalagemVal] = useState('Todos');
  const [horaVal, setHoraVal] = useState('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Applied filter states
  const [appliedFilters, setAppliedFilters] = useState({
    colaborador: 'Todos',
    embalagem: 'Todos',
    hora: '',
    startDate: '',
    endDate: ''
  });

  // Table search & pagination
  const [tableSearch, setTableSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // POP Modal State
  const [isPopModalOpen, setIsPopModalOpen] = useState(false);

  // Selected row for real-time audit details
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // Simulator states
  const [simUnidade, setSimUnidade] = useState<'HE' | 'SKUs'>('HE');
  const [simMetaCustom, setSimMetaCustom] = useState<number | null>(null);
  const [simMediaCustom, setSimMediaCustom] = useState<number | null>(null);
  const [simVolumeCustom, setSimVolumeCustom] = useState<number | null>(null);

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

  const empresaData = useEmpresaData();

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

    const rows = [...empresaData.despejo];
    rows.sort((a, b) => (b.dataISO || '').localeCompare(a.dataISO || '') || (b.inicio || '').localeCompare(a.inicio || ''));
    setDespejoRows(rows);
  }, [empresaData.despejo, empresa?.id]);

  // Combine real database rows
  const activeRows = useMemo(() => {
    return despejoRows;
  }, [despejoRows]);

  // Unique lists for the filters
  const colaboradoresList = useMemo(() => {
    const names = new Set<string>();
    activeRows.forEach(r => {
      if (r.operador) {
        const cleanName = r.operador.split('(')[0].trim().toUpperCase();
        if (cleanName) {
          names.add(cleanName);
        }
      }
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
      hora: horaVal,
      startDate: startDate,
      endDate: endDate
    });
    setCurrentPage(1);
    setSelectedRowId(null);
  };

  // Reset Filters Action
  const handleResetFilters = () => {
    setColaboradorVal('Todos');
    setEmbalagemVal('Todos');
    setHoraVal('');
    const defaultStart = (() => {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return d.toISOString().split('T')[0];
    })();
    const defaultEnd = new Date().toISOString().split('T')[0];
    setStartDate(defaultStart);
    setEndDate(defaultEnd);
    setAppliedFilters({
      colaborador: 'Todos',
      embalagem: 'Todos',
      hora: '',
      startDate: defaultStart,
      endDate: defaultEnd
    });
    setCurrentPage(1);
    setSelectedRowId(null);
  };

  // Filtered rows for calculations
  const filteredRows = useMemo(() => {
    return activeRows.filter(row => {
      // 1. Colaborador filter
      if (appliedFilters.colaborador !== 'Todos') {
        const rowOpClean = row.operador?.split('(')[0].trim().toUpperCase() || '';
        const filterOpClean = appliedFilters.colaborador.toUpperCase();
        if (rowOpClean !== filterOpClean && !row.operador?.toUpperCase().includes(filterOpClean)) {
          return false;
        }
      }
      // 2. Embalagem filter
      if (appliedFilters.embalagem !== 'Todos' && row.embalagem !== appliedFilters.embalagem) {
        return false;
      }
      // 3. Date range filter
      if (appliedFilters.startDate || appliedFilters.endDate) {
        if (row.data) {
          const parts = row.data.split('/');
          if (parts.length === 3) {
            const rowISO = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            if (appliedFilters.startDate && rowISO < appliedFilters.startDate) return false;
            if (appliedFilters.endDate && rowISO > appliedFilters.endDate) return false;
          }
        } else if (row.dataISO) {
          if (appliedFilters.startDate && row.dataISO < appliedFilters.startDate) return false;
          if (appliedFilters.endDate && row.dataISO > appliedFilters.endDate) return false;
        }
      }
      // 4. Hora filter (check if row's start time contains or matches)
      if (appliedFilters.hora) {
        if (!row.inicio?.startsWith(appliedFilters.hora)) {
          return false;
        }
      }

      return true;
    });
  }, [activeRows, appliedFilters]);

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

  // Derived core KPIs and Metrics matching Repack's Cockpit
  const totalSkus = useMemo(() => {
    return filteredRows.reduce((sum, r) => sum + (Number(r.quantidade) || 0), 0);
  }, [filteredRows]);

  const totalHE = useMemo(() => {
    const EMBALAGENS_VOLUME: Record<string, number> = {
      'LATA 250': 6.0,
      'LATA 269': 6.456,
      'LATA 350': 8.4,
      'LATA 473': 11.352,
      'LONG NECK': 8.52,
      'PET 1L': 12.0,
      'PET 2L': 12.0,
      'PET 500': 6.0,
      'PET 500ml': 6.0,
      '300OW': 7.2
    };
    const totalLiters = filteredRows.reduce((sum, r) => {
      const factor = EMBALAGENS_VOLUME[r.embalagem] || 10.0;
      return sum + (factor * (Number(r.quantidade) || 0));
    }, 0);
    return Math.round((totalLiters / 100) * 100) / 100;
  }, [filteredRows]);

  const totalTempoGastoSec = useMemo(() => {
    return filteredRows.reduce((sum, r) => sum + toSec(r.tempo), 0);
  }, [filteredRows]);

  const tempoMedioPorSkuSec = useMemo(() => {
    return totalSkus > 0 ? totalTempoGastoSec / totalSkus : 0;
  }, [totalTempoGastoSec, totalSkus]);

  const tempoMedioPorSkuStr = useMemo(() => {
    return toHMS(tempoMedioPorSkuSec);
  }, [tempoMedioPorSkuSec]);

  const totalTempoTrabalhadoStr = useMemo(() => {
    const h = Math.floor(totalTempoGastoSec / 3600);
    const m = Math.floor((totalTempoGastoSec % 3600) / 60);
    const s = totalTempoGastoSec % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }, [totalTempoGastoSec]);

  const totalTempoEsperadoSec = useMemo(() => {
    return filteredRows.reduce((sum, r) => {
      const config = EMBALAGENS_CONFIG[r.embalagem];
      const unitMeta = config ? config.metaSec : 43;
      return sum + (unitMeta * (Number(r.quantidade) || 0));
    }, 0);
  }, [filteredRows]);

  const eficienciaMedia = useMemo(() => {
    if (totalTempoGastoSec === 0) return 0;
    return Math.round((totalTempoEsperadoSec / totalTempoGastoSec) * 100);
  }, [totalTempoEsperadoSec, totalTempoGastoSec]);

  const produtividadeRealHE = useMemo(() => {
    const totalHours = totalTempoGastoSec / 3600;
    if (totalHours === 0) return 0;
    return totalHE / totalHours;
  }, [totalHE, totalTempoGastoSec]);

  const diasTrabalhadosFiltrados = useMemo(() => {
    const uniqueDays = new Set<string>();
    filteredRows.forEach(r => {
      if (r.data) {
        uniqueDays.add(r.data);
      }
    });
    return uniqueDays.size;
  }, [filteredRows]);

  const mesesTrabalhadosFiltrados = useMemo(() => {
    const uniqueMonths = new Set<string>();
    filteredRows.forEach(r => {
      if (r.data) {
        const parts = r.data.split('/');
        if (parts.length === 3) {
          uniqueMonths.add(`${parts[2]}-${parts[1]}`);
        }
      }
    });
    return uniqueMonths.size;
  }, [filteredRows]);

  const produtividadeMetaHE = useMemo(() => {
    const totalHours = totalTempoGastoSec / 3600;
    if (totalHours === 0 || diasTrabalhadosFiltrados === 0 || mesesTrabalhadosFiltrados === 0) return 0;
    const realProd = totalHE / totalHours;
    return ((realProd / diasTrabalhadosFiltrados) / mesesTrabalhadosFiltrados) * 1.10;
  }, [totalHE, totalTempoGastoSec, diasTrabalhadosFiltrados, mesesTrabalhadosFiltrados]);

  const nivelFiltroProdutividade = useMemo(() => {
    if ((appliedFilters as any).periodo && (appliedFilters as any).periodo !== 'Todos') {
      return 'Período';
    }
    return 'Geral';
  }, [(appliedFilters as any).periodo]);

  const tendenciaMensal = useMemo(() => {
    const now = new Date();
    const currentMonthStr = String(now.getMonth() + 1).padStart(2, '0');
    const currentYearStr = String(now.getFullYear());
    
    const currentMonthRows = activeRows.filter(r => {
      if (!r.data) return false;
      const parts = r.data.split('/');
      return parts.length === 3 && parts[1] === currentMonthStr && parts[2] === currentYearStr;
    });

    const rowsToAnalyze = currentMonthRows.length > 0 ? currentMonthRows : filteredRows;

    if (rowsToAnalyze.length === 0) {
      return { percent: 0, status: 'SEM DADOS', colorClass: 'text-gray-400', label: 'Sem registros' };
    }

    const totalActualSec = rowsToAnalyze.reduce((sum, r) => sum + toSec(r.tempo), 0);
    const totalExpectedSec = rowsToAnalyze.reduce((sum, r) => {
      const config = EMBALAGENS_CONFIG[r.embalagem];
      const metaUnit = config ? config.metaSec : 43;
      return sum + (metaUnit * (Number(r.quantidade) || 0));
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
  }, [activeRows, filteredRows]);

  // Monthly live values for simulator
  const simLiveValores = useMemo(() => {
    const now = new Date();
    const currentMonthStr = String(now.getMonth() + 1).padStart(2, '0');
    const currentYearStr = String(now.getFullYear());

    const currentMonthRows = activeRows.filter(r => {
      if (!r.data) return false;
      const parts = r.data.split('/');
      return parts.length === 3 && parts[1] === currentMonthStr && parts[2] === currentYearStr;
    });

    const rowsToUse = currentMonthRows.length > 0 ? currentMonthRows : activeRows;

    if (rowsToUse.length === 0) {
      return {
        diasTrabalhados: workingDaysInfo.elapsedWorkingDays,
        totalHE: 0,
        totalSKUs: 0,
        mediaHE: 0,
        mediaSKUs: 0,
        defaultMetaHE: 0,
        defaultMetaSKUs: 0
      };
    }

    // 1. Volume in HE and SKUs
    const totalSKUs = rowsToUse.reduce((sum, r) => sum + (Number(r.quantidade) || 0), 0);

    const EMBALAGENS_VOLUME_MAP: Record<string, number> = {
      'LATA 250': 6.0,
      'LATA 269': 6.456,
      'LATA 350': 8.4,
      'LATA 473': 11.352,
      'LONG NECK': 8.52,
      'PET 1L': 12.0,
      'PET 2L': 12.0,
      'PET 500': 6.0,
      'PET 500ml': 6.0,
      '300OW': 7.2
    };

    const totalLiters = rowsToUse.reduce((sum, r) => {
      const factor = EMBALAGENS_VOLUME_MAP[r.embalagem] || 10.0;
      return sum + (factor * (Number(r.quantidade) || 0));
    }, 0);
    const totalHEVal = Math.round((totalLiters / 100) * 100) / 100;

    // Use elapsed working days from the current month
    const elapsedDays = Math.max(1, workingDaysInfo.elapsedWorkingDays);

    // 3. Daily averages
    const mediaHEVal = Math.round((totalHEVal / elapsedDays) * 100) / 100;
    const mediaSKUsVal = Math.round((totalSKUs / elapsedDays) * 10) / 10;

    // 4. Default meta (1.3x current month's trend)
    const defaultMetaHEVal = Math.round(totalHEVal * 1.3);
    const defaultMetaSKUsVal = Math.round(totalSKUs * 1.3);

    return {
      diasTrabalhados: elapsedDays,
      totalHE: totalHEVal,
      totalSKUs: totalSKUs,
      mediaHE: mediaHEVal,
      mediaSKUs: mediaSKUsVal,
      defaultMetaHE: defaultMetaHEVal,
      defaultMetaSKUs: defaultMetaSKUsVal
    };
  }, [activeRows, workingDaysInfo]);

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

  // Compute stats dynamically based on filtered data (preserved for legacy compatibility)
  const stats = useMemo(() => {
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
      totalCaixas: totalSkus,
      tempoMedio: tempoMedioPorSkuStr,
      despejosPorHora: totalSkus > 0 ? Math.round(totalSkus / (totalTempoGastoSec / 3600)) : 74,
      eficiencia: eficienciaMedia,
      embMaisDespejada: mostDumped
    };
  }, [totalSkus, tempoMedioPorSkuStr, totalTempoGastoSec, eficienciaMedia, filteredRows]);

  // Chart 1: Despejos por Hora
  const chartDespejosPorHora = useMemo(() => {
    if (filteredRows.length === 0) return [];
    // Hour slots from 08 to 15
    const slots = ['08', '09', '10', '11', '12', '13', '14', '15'];
    const dataMap: Record<string, number> = {};
    slots.forEach(s => { dataMap[s] = 0; });

    const EMBALAGENS_VOLUME: Record<string, number> = {
      'LATA 250': 6.0,
      'LATA 269': 6.456,
      'LATA 350': 8.4,
      'LATA 473': 11.352,
      'LONG NECK': 8.52,
      'PET 1L': 12.0,
      'PET 2L': 12.0,
      'PET 500': 6.0,
      'PET 500ml': 6.0,
      '300OW': 7.2
    };

    filteredRows.forEach(r => {
      if (r.inicio) {
        const hour = r.inicio.split(':')[0];
        if (slots.includes(hour)) {
          const qty = Number(r.quantidade) || 0;
          if (simUnidade === 'HE') {
            const factor = EMBALAGENS_VOLUME[r.embalagem] || 10.0;
            const hl = (factor * qty) / 100;
            dataMap[hour] = (dataMap[hour] || 0) + hl;
          } else {
            dataMap[hour] = (dataMap[hour] || 0) + qty;
          }
        }
      }
    });

    return slots.map(h => ({
      name: `${h}h`,
      'Quantidade': Math.round((dataMap[h] || 0) * 100) / 100
    }));
  }, [filteredRows, simUnidade]);

  // Chart 2: Desempenho por Embalagem (Qty or HE dumped per packaging type)
  const chartDesempenhoPorEmbalagem = useMemo(() => {
    if (filteredRows.length === 0) return [];
    const dataMap: Record<string, number> = {};

    const EMBALAGENS_VOLUME: Record<string, number> = {
      'LATA 250': 6.0,
      'LATA 269': 6.456,
      'LATA 350': 8.4,
      'LATA 473': 11.352,
      'LONG NECK': 8.52,
      'PET 1L': 12.0,
      'PET 2L': 12.0,
      'PET 500': 6.0,
      'PET 500ml': 6.0,
      '300OW': 7.2
    };

    filteredRows.forEach(r => {
      const key = r.embalagem || 'Outros';
      const cleanKey = key === 'LONG NECK' ? '300OW' : key;
      const qty = Number(r.quantidade) || 0;
      if (simUnidade === 'HE') {
        const factor = EMBALAGENS_VOLUME[key] || 10.0;
        const hl = (factor * qty) / 100;
        dataMap[cleanKey] = (dataMap[cleanKey] || 0) + hl;
      } else {
        dataMap[cleanKey] = (dataMap[cleanKey] || 0) + qty;
      }
    });

    return Object.keys(dataMap).map(pkg => ({
      name: pkg,
      'SKUs': Math.round((dataMap[pkg] || 0) * 100) / 100
    })).sort((a, b) => b.SKUs - a.SKUs);
  }, [filteredRows, simUnidade]);

  // Chart 3: Tempo Médio por Embalagem
  const chartTempoMedioPorEmbalagem = useMemo(() => {
    if (filteredRows.length === 0) return [];
    const dataMapSec: Record<string, number[]> = {};

    filteredRows.forEach(r => {
      const key = r.embalagem || 'Outros';
      const cleanKey = key === 'LONG NECK' ? '300OW' : key;
      if (!dataMapSec[cleanKey]) dataMapSec[cleanKey] = [];
      const spentSec = toSec(r.tempo);
      const qty = Number(r.quantidade) || 1;
      dataMapSec[cleanKey].push(spentSec / qty);
    });

    return Object.keys(dataMapSec).map(pkg => {
      const list = dataMapSec[pkg];
      const avg = list.length > 0 ? list.reduce((a, b) => a + b, 0) / list.length : 0;
      return {
        name: pkg,
        'Segundos': Math.round(avg),
        'Label': toHMS(avg).substring(3) // MM:SS format
      };
    }).sort((a, b) => a.Segundos - b.Segundos);
  }, [filteredRows]);

  // Chart 4: Evolução da Eficiência
  const chartEvolucaoEficiencia = useMemo(() => {
    if (filteredRows.length === 0) return [];
    const groupSec: Record<string, { meta: number; real: number }> = {};

    filteredRows.forEach(r => {
      const datePart = r.data ? r.data.substring(0, 5) : 'Geral';
      if (!groupSec[datePart]) groupSec[datePart] = { meta: 0, real: 0 };
      const qty = Number(r.quantidade) || 0;
      const config = EMBALAGENS_CONFIG[r.embalagem];
      const unitMeta = config ? config.metaSec : 43;
      groupSec[datePart].meta += unitMeta * qty;
      groupSec[datePart].real += toSec(r.tempo);
    });

    return Object.keys(groupSec).map(d => {
      const val = groupSec[d];
      const efficiency = val.real > 0 ? Math.round((val.meta / val.real) * 100) : 0;
      return {
        name: d,
        'Eficiência': efficiency
      };
    });
  }, [filteredRows]);

  // ── ANÁLISE DE QUEBRAS COM POSSIBILIDADE DE DESPEJO ──
  const allQuebras = useMemo(() => {
    return empresaData.quebras || [];
  }, [empresaData.quebras]);

  const quebrasAnalisadas = useMemo(() => {
    return allQuebras.map(q => ({
      quebra: q,
      analise: analisarQuebraParaDespejo(q)
    }));
  }, [allQuebras]);

  const quebrasElegiveisDespejo = useMemo(() => {
    return quebrasAnalisadas.filter(item => item.analise.possivel);
  }, [quebrasAnalisadas]);

  const totaisQuebrasDespejo = useMemo(() => {
    const totalHlElegivel = quebrasElegiveisDespejo.reduce((s, i) => s + i.analise.volumeHl, 0);
    const totalSkusElegivel = quebrasElegiveisDespejo.reduce((s, i) => s + i.analise.skus, 0);
    const totalHlGeral = quebrasAnalisadas.reduce((s, i) => s + i.analise.volumeHl, 0);
    const pctAproveitavel = totalHlGeral > 0 ? Math.round((totalHlElegivel / totalHlGeral) * 100) : 0;

    return {
      qtd: quebrasElegiveisDespejo.length,
      totalHl: Math.round(totalHlElegivel * 100) / 100,
      totalSkus: totalSkusElegivel,
      pctAproveitavel
    };
  }, [quebrasElegiveisDespejo, quebrasAnalisadas]);

  // Gráfico 5: Origem do Despejo por Embalagem (Despejo Direto vs Quebras Elegíveis)
  const chartQuebrasDespejoPorEmbalagem = useMemo(() => {
    if (filteredRows.length === 0 && quebrasElegiveisDespejo.length === 0) return [];
    const pkgMap: Record<string, { diretoHL: number; quebraHL: number }> = {
      'LATA 250': { diretoHL: 0, quebraHL: 0 },
      'LATA 269': { diretoHL: 0, quebraHL: 0 },
      'LATA 350': { diretoHL: 0, quebraHL: 0 },
      'LATA 473': { diretoHL: 0, quebraHL: 0 },
      'PET 2L': { diretoHL: 0, quebraHL: 0 },
      'LONG NECK': { diretoHL: 0, quebraHL: 0 }
    };

    filteredRows.forEach(r => {
      const pkg = r.embalagem in pkgMap ? r.embalagem : 'LATA 350';
      const factor = pkg === 'LATA 250' ? 6.0 : pkg === 'LATA 269' ? 6.456 : pkg === 'LATA 350' ? 8.4 : pkg === 'LATA 473' ? 11.352 : pkg === 'PET 2L' ? 12.0 : 8.52;
      pkgMap[pkg].diretoHL += (factor * (Number(r.quantidade) || 0)) / 100;
    });

    quebrasElegiveisDespejo.forEach(item => {
      const desc = (item.quebra.descricao || '').toUpperCase();
      let pkg = 'LATA 350';
      if (desc.includes('250')) pkg = 'LATA 250';
      else if (desc.includes('269')) pkg = 'LATA 269';
      else if (desc.includes('473')) pkg = 'LATA 473';
      else if (desc.includes('PET 2L') || desc.includes('2L')) pkg = 'PET 2L';
      else if (desc.includes('LONG') || desc.includes('LN')) pkg = 'LONG NECK';
      
      pkgMap[pkg].quebraHL += item.analise.volumeHl;
    });

    return Object.entries(pkgMap)
      .map(([name, vals]) => ({
        name,
        'Despejo Direto (HL)': Math.round(vals.diretoHL * 100) / 100,
        'Quebras Elegíveis (HL)': Math.round(vals.quebraHL * 100) / 100
      }))
      .filter(item => item['Despejo Direto (HL)'] > 0 || item['Quebras Elegíveis (HL)'] > 0);
  }, [filteredRows, quebrasElegiveisDespejo]);

  // Gráfico 6: Distribuição de Quebras Elegíveis por Causa/Motivo
  const chartQuebrasPorMotivo = useMemo(() => {
    if (quebrasElegiveisDespejo.length === 0) return [];
    const counts: Record<string, number> = {};
    quebrasElegiveisDespejo.forEach(item => {
      const cat = item.analise.categoria;
      counts[cat] = (counts[cat] || 0) + item.analise.volumeHl;
    });

    return Object.entries(counts).map(([name, hl]) => ({
      name,
      'HL': Math.round(hl * 100) / 100
    })).sort((a, b) => b.HL - a.HL);
  }, [quebrasElegiveisDespejo]);

  // Ação Rápida: Converter Quebra em Lançamento de Despejo
  const handleConverterQuebraEmDespejo = async (item: { quebra: QuebraRow, analise: any }) => {
    const q = item.quebra;
    const now = new Date();
    const dataStr = now.toLocaleDateString('pt-BR');
    const dataISO = now.toISOString().split('T')[0];
    const pad = (n: number) => String(n).padStart(2, '0');
    const inicio = `${pad(now.getHours())}:${pad(now.getMinutes())}:00`;
    const endMinutes = now.getMinutes() + Math.ceil(item.analise.tempoEstimativalustrativaSec / 60);
    const endHour = now.getHours() + Math.floor(endMinutes / 60);
    const fim = `${pad(endHour % 24)}:${pad(endMinutes % 60)}:00`;

    const desc = (q.descricao || '').toUpperCase();
    let embalagem = 'LATA 350';
    if (desc.includes('250')) embalagem = 'LATA 250';
    else if (desc.includes('269')) embalagem = 'LATA 269';
    else if (desc.includes('473')) embalagem = 'LATA 473';
    else if (desc.includes('PET 2L') || desc.includes('2L')) embalagem = 'PET 2L';
    else if (desc.includes('PET 1L')) embalagem = 'PET 1L';
    else if (desc.includes('LONG') || desc.includes('LN')) embalagem = 'LONG NECK';

    const newRow: Omit<DespejoRow, '_docId'> & { empresaId: string } = {
      empresaId: empresa?.id || 'demo',
      data: dataStr,
      dataISO,
      embalagem,
      quantidade: Number(q.quantidade) || 1,
      inicio,
      fim,
      tempo: item.analise.tempoEstimativalustrativaStr,
      meta: '00:04:00',
      resultado: '🟢 META BATIDA',
      operador: user.nome || 'Fiscal Operacional'
    };

    try {
      if (db) {
        await addDoc(collection(db, 'despejo'), newRow);
      } else {
        const current = [...despejoRows, { _docId: String(Date.now()), ...newRow }];
        setDespejoRows(current);
        localStorage.setItem(`despejo_rows_${empresa?.id || 'demo'}`, JSON.stringify(current));
      }
      alert(`✅ Quebra [${q.codProduto} - ${q.descricao}] enviada com sucesso para a Operação Despejo!`);
    } catch (e) {
      alert('Erro ao enviar para despejo: ' + e);
    }
  };

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
    if (!docId) return;
    try {
      if (db) {
        await deleteDoc(doc(db, 'despejo', docId));
      }
    } catch (e) {
      console.error(e);
    } finally {
      const remaining = despejoRows.filter(r => r._docId !== docId && (r as any).id !== docId);
      setDespejoRows(remaining);
      localStorage.setItem(`despejo_rows_${empresa?.id || 'demo'}`, JSON.stringify(remaining));
      setSelectedRowId(null);
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
          <button
            onClick={() => setIsPopModalOpen(true)}
            className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs rounded-lg shadow-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
          >
            📋 Padrão Operacional (POP)
          </button>

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
          {/* MANUAL DE INSTRUÇÃO E METAS */}
          <ManualInstrucaoCard
            title="Manual de Instrução & Parâmetros de Meta — Operação de Despejo"
            metrics={[
              {
                key: 'despejo_produtividade',
                label: 'Produtividade Média de Despejo',
                unit: 'cx/h',
                comoCalcular: '(Total de Caixas Despejadas) ÷ (Soma de Horas Trabalhadas da Equipe no Processo de Despejo).'
              },
              {
                key: 'acuracidade_despejo',
                label: 'Acuracidade Físico vs Fiscal no Despejo',
                unit: '%',
                comoCalcular: '(Volume de Engarrafado/Lata Efetivamente Destruído com B.I. Validado) ÷ (Volume Solicitado para Despejo) × 100.'
              }
            ]}
          />
          {/* ── SEÇÃO DE FILTROS INTERATIVOS ── */}
      <div id="despejo-filters-container" className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-2">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#032b5e]" />
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#032b5e]">Filtros Avançados de B.I.</span>
          </div>
          
          <div className="flex items-center bg-slate-100 border border-slate-200 p-0.5 rounded-lg text-[10px] font-bold">
            <button
              onClick={() => setSimUnidade('HE')}
              className={`px-3 py-1.5 rounded-md transition-all font-extrabold uppercase border-none cursor-pointer ${
                simUnidade === 'HE'
                  ? 'bg-white text-[#1e56f0] shadow-xs border border-gray-100'
                  : 'text-slate-500 hover:text-slate-800 bg-transparent'
              }`}
            >
              Hectolitro (HE)
            </button>
            <button
              onClick={() => setSimUnidade('SKUs')}
              className={`px-3 py-1.5 rounded-md transition-all font-extrabold uppercase border-none cursor-pointer ${
                simUnidade === 'SKUs'
                  ? 'bg-white text-[#1e56f0] shadow-xs border border-gray-100'
                  : 'text-slate-500 hover:text-slate-800 bg-transparent'
              }`}
            >
              Volume (SKUs)
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs">
          
          {/* 📅 Filtro Calendário Interativo */}
          <div className="flex flex-col gap-1 min-w-[180px]">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
              Período (Calendário)
            </label>
            <CalendarFilter
              startDate={startDate}
              endDate={endDate}
              onChange={(start, end) => {
                setStartDate(start);
                setEndDate(end);
              }}
            />
          </div>

          {/* 👤 Colaborador */}
          <div className="flex flex-col gap-1 w-[160px]">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
              Colaborador
            </label>
            <select
              value={colaboradorVal}
              onChange={(e) => setColaboradorVal(e.target.value)}
              className="w-full bg-white border border-gray-200 text-[#032b5e] font-sans font-bold rounded-lg outline-none px-2.5 py-1 text-[10px] h-[28px] cursor-pointer transition-all hover:border-blue-400 focus:border-[#032b5e]"
            >
              <option value="Todos">Todos os Colaboradores</option>
              {colaboradoresList.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          {/* 📦 Embalagem */}
          <div className="flex flex-col gap-1 w-[160px]">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
              Embalagem
            </label>
            <select
              value={embalagemVal}
              onChange={(e) => setEmbalagemVal(e.target.value)}
              className="w-full bg-white border border-gray-200 text-[#032b5e] font-sans font-bold rounded-lg outline-none px-2.5 py-1 text-[10px] h-[28px] cursor-pointer transition-all hover:border-blue-400 focus:border-[#032b5e]"
            >
              <option value="Todos">Todas as Embalagens</option>
              {embalagensList.map(pkg => (
                <option key={pkg} value={pkg}>{pkg}</option>
              ))}
            </select>
          </div>

          {/* 🕒 Hora */}
          <div className="flex flex-col gap-1 w-[100px]">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
              Hora Inicial
            </label>
            <input
              type="text"
              placeholder="Ex: 08"
              value={horaVal}
              onChange={(e) => setHoraVal(e.target.value)}
              className="w-full bg-white border border-gray-200 text-[#032b5e] font-sans font-bold rounded-lg outline-none px-2.5 py-1 text-[10px] h-[28px] transition-all hover:border-blue-400 focus:border-[#032b5e]"
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

      {/* ── COCKPIT INDICADORES GERAL ── */}
      <div className="space-y-3">
        {/* LINE 1: KPIs (Columns containing stacked Cards) */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Column 1: SKUs & HE */}
          <div className="flex flex-col gap-3">
            {simUnidade === 'HE' ? (
              <>
                {/* KPI 1B: HE = Hectolitro (Active) */}
                <div className="bg-white rounded-xl border-2 border-sky-500 flex flex-col justify-between shadow-xs hover:border-sky-500/80 transition-all duration-300 p-2.5 h-[115px] overflow-hidden relative">
                  <div className="absolute top-1.5 right-1.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                  </div>
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-black uppercase text-sky-600 tracking-wider">🧪 HE = Hectolitro (Ativo)</span>
                      <span className="font-extrabold text-[#032b5e] mt-0.5 text-2xl leading-none font-mono">
                        {totalHE.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} HL
                      </span>
                      <span className="text-[9px] text-gray-400 font-bold uppercase mt-1 font-sans">Volume de Descarte</span>
                    </div>
                    <div className="rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-500 w-7 h-7 flex-shrink-0">
                      <Droplet className="w-4 h-4" fill="currentColor" />
                    </div>
                  </div>
                  <div className="w-full h-[32px] mt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartDespejosPorHora} margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                        <Area type="monotone" dataKey="Quantidade" stroke="#0ea5e9" fill="rgba(14,165,233,0.06)" strokeWidth={1} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* KPI 1: SKUs (Inactive) */}
                <div className="bg-white rounded-xl border border-gray-200 flex flex-col justify-between shadow-xs hover:border-[#1e56f0]/50 transition-all duration-300 p-2.5 h-[115px] overflow-hidden">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">📦 SKUs Despejados</span>
                      <span className="font-extrabold text-[#032b5e] mt-0.5 text-2xl leading-none font-mono">{totalSkus}</span>
                      <span className="text-[9px] text-gray-400 font-bold uppercase mt-1 font-sans">Total no período</span>
                    </div>
                    <div className="rounded-lg bg-[#1e56f0]/10 flex items-center justify-center text-[#1e56f0] w-7 h-7 flex-shrink-0">
                      <Box className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="w-full h-[32px] mt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartDespejosPorHora} margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                        <Area type="monotone" dataKey="Quantidade" stroke="#1e56f0" fill="rgba(30,86,240,0.06)" strokeWidth={1} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* KPI 1: SKUs (Active) */}
                <div className="bg-white rounded-xl border-2 border-[#1e56f0] flex flex-col justify-between shadow-xs hover:border-[#1e56f0]/80 transition-all duration-300 p-2.5 h-[115px] overflow-hidden relative">
                  <div className="absolute top-1.5 right-1.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1e56f0]"></span>
                  </div>
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-black uppercase text-[#1e56f0] tracking-wider">📦 SKUs Despejados (Ativo)</span>
                      <span className="font-extrabold text-[#032b5e] mt-0.5 text-2xl leading-none font-mono">{totalSkus}</span>
                      <span className="text-[9px] text-gray-400 font-bold uppercase mt-1 font-sans">Total no período</span>
                    </div>
                    <div className="rounded-lg bg-[#1e56f0]/10 flex items-center justify-center text-[#1e56f0] w-7 h-7 flex-shrink-0">
                      <Box className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="w-full h-[32px] mt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartDespejosPorHora} margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                        <Area type="monotone" dataKey="Quantidade" stroke="#1e56f0" fill="rgba(30,86,240,0.06)" strokeWidth={1} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* KPI 1B: HE = Hectolitro (Inactive) */}
                <div className="bg-white rounded-xl border border-gray-200 flex flex-col justify-between shadow-xs hover:border-sky-500/50 transition-all duration-300 p-2.5 h-[115px] overflow-hidden">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">🧪 HE = Hectolitro</span>
                      <span className="font-extrabold text-[#032b5e] mt-0.5 text-2xl leading-none font-mono">
                        {totalHE.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} HL
                      </span>
                      <span className="text-[9px] text-gray-400 font-bold uppercase mt-1 font-sans">Volume de Descarte</span>
                    </div>
                    <div className="rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-500 w-7 h-7 flex-shrink-0">
                      <Droplet className="w-4 h-4" fill="currentColor" />
                    </div>
                  </div>
                  <div className="w-full h-[32px] mt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartDespejosPorHora} margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                        <Area type="monotone" dataKey="Quantidade" stroke="#0ea5e9" fill="rgba(14,165,233,0.06)" strokeWidth={1} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Column 2: Tempo Médio & Tempo Total */}
          <div className="flex flex-col gap-3">
            {/* KPI 2: Tempo Médio */}
            <div className="bg-white rounded-xl border border-gray-200 flex flex-col justify-between shadow-xs hover:border-emerald-500/50 transition-all duration-300 p-2.5 h-[115px] overflow-hidden">
              <div className="flex justify-between items-start">
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">⏱ Tempo Médio</span>
                  <span className="font-extrabold text-[#032b5e] mt-0.5 text-2xl leading-none font-mono">{tempoMedioPorSkuStr}</span>
                  <span className="text-[9px] text-gray-400 font-bold uppercase mt-1 font-sans">Por SKU</span>
                </div>
                <div className="rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 w-7 h-7 flex-shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="w-full h-[32px] mt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartTempoMedioPorEmbalagem} margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                    <Area type="monotone" dataKey="Segundos" stroke="#22c55e" fill="rgba(34,197,94,0.06)" strokeWidth={1} dot={false} />
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
                  <span className="text-[9px] text-gray-400 font-bold uppercase mt-1 font-sans">Horas Trabalhadas</span>
                </div>
                <div className="rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 w-7 h-7 flex-shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="w-full h-[32px] mt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartTempoMedioPorEmbalagem} margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                    <Area type="monotone" dataKey="Segundos" stroke="#10b981" fill="rgba(16,185,129,0.06)" strokeWidth={1} dot={false} />
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
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider font-sans">⚡ Produtividade ({nivelFiltroProdutividade})</span>
                  <span className="font-extrabold text-[#1e56f0] mt-0.5 text-2xl leading-none font-mono">
                    {produtividadeRealHE.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-semibold text-gray-500">HE/h</span>
                  </span>
                  <span className="text-[9px] text-gray-400 font-bold uppercase mt-1 font-sans">
                    Meta: {produtividadeMetaHE.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} HE/h
                  </span>
                </div>
                <div className="rounded-lg bg-[#1e56f0]/10 flex items-center justify-center text-[#1e56f0] w-7 h-7 flex-shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
              </div>
              <div className="w-full h-[32px] mt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartDespejosPorHora} margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                    <Area type="monotone" dataKey="Quantidade" stroke="#1e56f0" fill="rgba(30,86,240,0.06)" strokeWidth={1} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            {/* Spacer to keep columns balanced as in Repack */}
            <div className="h-[115px] hidden lg:block" />
          </div>

          {/* Column 4: Eficiência & Tendência */}
          <div className="flex flex-col gap-3">
            {/* KPI 4: Eficiência */}
            <div className="bg-white rounded-xl border border-gray-200 flex flex-col justify-between shadow-xs hover:border-purple-500/50 transition-all duration-300 p-2.5 h-[115px] overflow-hidden">
              <div className="flex justify-between items-start">
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">🎯 Eficiência</span>
                  <span className="font-extrabold text-[#032b5e] mt-0.5 text-2xl leading-none font-mono">{eficienciaMedia}%</span>
                  <span className={`text-[9px] font-bold uppercase mt-1 font-sans ${eficienciaMedia >= 100 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {eficienciaMedia >= 100 ? 'Meta OK' : 'Abaixo da meta'}
                  </span>
                </div>
                <div className="rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500 w-7 h-7 flex-shrink-0">
                  <Target className="w-4 h-4" />
                </div>
              </div>
              <div className="w-full h-[32px] mt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartEvolucaoEficiencia} margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                    <Area type="monotone" dataKey="Eficiência" stroke="#8b5cf6" fill="rgba(139,92,246,0.06)" strokeWidth={1} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* KPI 4B: Tendência do Mês */}
            <div className="bg-white rounded-xl border border-gray-200 flex flex-col justify-between shadow-xs hover:border-purple-500/50 transition-all duration-300 p-2.5 h-[115px] overflow-hidden">
              <div className="flex justify-between items-start">
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">📈 Tendência do Mês</span>
                  <span className={`font-black mt-0.5 text-[14px] leading-tight ${tendenciaMensal.colorClass} uppercase font-sans`}>
                    {tendenciaMensal.status}
                  </span>
                  <span className="text-[9px] text-gray-400 font-bold uppercase mt-1 font-sans">
                    {tendenciaMensal.label} ({tendenciaMensal.percent}%)
                  </span>
                </div>
                <div className={`rounded-lg flex items-center justify-center w-7 h-7 flex-shrink-0 ${tendenciaMensal.percent >= 100 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="w-full h-[32px] mt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartEvolucaoEficiencia} margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                    <Area type="monotone" dataKey="Eficiência" stroke={tendenciaMensal.percent >= 100 ? '#10b981' : '#f43f5e'} fill={tendenciaMensal.percent >= 100 ? 'rgba(16,185,129,0.06)' : 'rgba(244,63,94,0.06)'} strokeWidth={1} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ── SEÇÃO DE GRÁFICOS OU ESTADO VAZIO ── */}
      {filteredRows.length === 0 ? (
        <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center my-4 flex flex-col items-center justify-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-200/80 flex items-center justify-center text-slate-500 mb-3">
            <BarChart2 className="w-6 h-6 text-slate-400" />
          </div>
          <h4 className="text-sm font-black text-slate-700 uppercase tracking-wide">
            Nenhum dado importado para o período selecionado
          </h4>
          <p className="text-xs text-slate-500 max-w-md mt-1">
            Não existem lançamentos ou registros de despejo para os filtros aplicados. As métricas em R$ e HL foram zeradas e nenhum gráfico fictício é gerado.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Gráfico 1: Despejos por Hora */}
        <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black text-[#032b5e] uppercase tracking-wider">
              Despejos por Hora {simUnidade === 'HE' ? '(HL)' : '(SKUs)'}
            </h3>
            <span className="text-[10px] text-gray-400 font-bold uppercase">
              {simUnidade === 'HE' ? 'Volume total em Hectolitros despejados por hora' : 'Quantidade total de SKUs despejados por hora'}
            </span>
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
            <h3 className="text-xs font-black text-[#032b5e] uppercase tracking-wider">
              Desempenho por Embalagem {simUnidade === 'HE' ? '(HL)' : '(SKUs)'}
            </h3>
            <span className="text-[10px] text-gray-400 font-bold uppercase">
              {simUnidade === 'HE' ? 'Volume total em Hectolitros por tipo de embalagem' : 'Quantidade total de SKUs despejados por embalagem'}
            </span>
          </div>
          <div className="h-[250px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartDesempenhoPorEmbalagem} layout="vertical" margin={{ top: 10, right: 10, left: -5, bottom: 5 }}>
                <CartesianGrid stroke="#f1f5f9" horizontal={false} strokeDasharray="3 3" />
                <XAxis type="number" stroke="#94a3b8" tickLine={false} fontSize={10} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" tickLine={false} width={80} fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', color: '#1e293b', fontSize: '11px' }} />
                <Bar dataKey="SKUs" fill="#f5a623" radius={[0, 4, 4, 0]} barSize={12} />
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
      )}

      {/* ── SEÇÃO DE INTEGRAÇÃO: QUEBRAS REGISTRADAS COM POSSIBILIDADE DE DESPEJO ── */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-900 to-[#151b23] border border-amber-500/30 rounded-2xl p-6 text-white shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-400">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                  Cruzamento Quebras x Despejo
                </span>
                <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {totaisQuebrasDespejo.pctAproveitavel}% do Volume de Quebras Elegível
                </span>
              </div>
              <h3 className="text-base font-black text-white uppercase tracking-wide mt-1">
                Análise de Quebras do Sistema com Possibilidade de Despejo
              </h3>
              <p className="text-xs text-slate-400">
                Avarias pressurizadas, vazamentos ativos, produtos WQI e lotes com vencimento próximo identificados para esvaziamento e reciclagem.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-800/80 border border-slate-700/80 px-4 py-2 rounded-xl text-center">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Quebras Candidatas</span>
              <span className="text-base font-black text-amber-400 font-mono">{totaisQuebrasDespejo.qtd} itens</span>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/80 px-4 py-2 rounded-xl text-center">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Potencial Despejo</span>
              <span className="text-base font-black text-emerald-400 font-mono">{totaisQuebrasDespejo.totalHl} HL</span>
            </div>
          </div>
        </div>

        {/* Gráficos de Quebras vs Despejo */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Gráfico A: Comparativo de Origem do Despejo (Direto vs Quebras por Embalagem) */}
          <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center justify-between">
                <span>Origem do Volume de Despejo (HL)</span>
                <span className="text-[10px] font-normal text-amber-400">Despejo Direto vs Quebras Elegíveis</span>
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Volume de cerveja/refrigerante drenável proveniente de quebras operacionais comparado ao despejo direto.
              </p>
            </div>
            <div className="h-[240px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartQuebrasDespejoPorEmbalagem} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
                  <CartesianGrid stroke="#1e293b" vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="name" stroke="#64748b" tickLine={false} fontSize={10} />
                  <YAxis stroke="#64748b" tickLine={false} fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc', fontSize: '11px' }} />
                  <Bar dataKey="Despejo Direto (HL)" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={14} />
                  <Bar dataKey="Quebras Elegíveis (HL)" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico B: Distribuição das Quebras Elegíveis por Causa / Motivo */}
          <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center justify-between">
                <span>Potencial de Despejo por Causa da Quebra</span>
                <span className="text-[10px] font-mono text-emerald-400">HL por Categoria</span>
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Classificação das ocorrências de quebra elegíveis para drenagem rápida no centro de descarte.
              </p>
            </div>
            <div className="h-[240px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartQuebrasPorMotivo} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid stroke="#1e293b" horizontal={false} strokeDasharray="3 3" />
                  <XAxis type="number" stroke="#64748b" tickLine={false} fontSize={10} />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" tickLine={false} width={130} fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc', fontSize: '11px' }} />
                  <Bar dataKey="HL" fill="#10b981" radius={[0, 4, 4, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Tabela de Quebras Elegíveis para Encaminhamento Direto */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span>📦 Fila de Quebras Prontas para Operação Despejo</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-mono font-bold">
                  {quebrasElegiveisDespejo.length} itens aguardando
                </span>
              </h4>
              <p className="text-[11px] text-slate-400">
                Selecione uma quebra identificada no sistema para gerar automaticamente a ordem e cronômetro de despejo.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase font-bold tracking-wider bg-slate-900/90">
                  <th className="p-2.5">Código / Produto</th>
                  <th className="p-2.5">Motivo / Categoria</th>
                  <th className="p-2.5 text-center">Quantidade</th>
                  <th className="p-2.5 text-center">Vol. Estimado</th>
                  <th className="p-2.5">Tempo Est. Drenagem</th>
                  <th className="p-2.5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {quebrasElegiveisDespejo.slice(0, 5).map((item, i) => (
                  <tr key={(item.quebra as any).id || (item.quebra as any)._docId || i} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-2.5 font-bold text-slate-200">
                      <span className="text-amber-400 font-mono">[{item.quebra.codProduto || '539'}]</span> {item.quebra.descricao}
                      <span className="block text-[9px] text-slate-500 font-mono">Lote: {(item.quebra as any).lote || 'A-2026'}</span>
                    </td>
                    <td className="p-2.5">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-amber-300 border border-slate-700">
                        {item.analise.categoria}
                      </span>
                    </td>
                    <td className="p-2.5 text-center font-bold font-mono text-white">
                      {item.quebra.quantidade} cx
                    </td>
                    <td className="p-2.5 text-center font-mono font-bold text-emerald-400">
                      {item.analise.volumeHl} HL
                    </td>
                    <td className="p-2.5 font-mono text-slate-300">
                      ⏱️ {item.analise.tempoEstimativalustrativaStr}
                    </td>
                    <td className="p-2.5 text-right">
                      <button
                        onClick={() => handleConverterQuebraEmDespejo(item)}
                        className="py-1.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] rounded-lg transition-all shadow-md cursor-pointer flex items-center gap-1 ml-auto"
                      >
                        📥 Lançar no Despejo
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── SEÇÃO DO SIMULADOR DE AGILIDADE & META (+10%) ── */}
      <SimuladorAgilidadeMeta 
        tipo="despejo"
        totalHectolitros={totalHE}
        totalCaixasUnidades={totalSkus}
        tempoTotalMinutos={Math.round(totalTempoGastoSec / 60)}
        metaHectolitrosMensal={simMeta}
      />

      {/* MODAL DE PADRÃO OPERACIONAL (POP/SOP) */}
      <PadraoOperacionalModal
        moduleKey="despejo"
        moduleName="Despejo de Produtos Avariados"
        isOpen={isPopModalOpen}
        onClose={() => setIsPopModalOpen(false)}
        user={user}
      />
      <SopManagerModal
        operation="despejo"
        operationName="Despejo"
        isOpen={isPopModalOpen}
        onClose={() => setIsPopModalOpen(false)}
      />

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
                  <span className="font-bold text-amber-600">{selectedRowDetails.caixasHora} SKU/h</span>
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
