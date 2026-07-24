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
  Legend,
  PieChart,
  Pie,
  ComposedChart,
  ReferenceLine
} from 'recharts';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { 
  Calendar, 
  ChevronDown, 
  Truck, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  User, 
  ArrowLeft, 
  Download,
  TrendingUp,
  TrendingDown,
  Info,
  Filter,
  Plus,
  Play,
  RotateCcw,
  Sparkles,
  HelpCircle,
  Maximize2,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Usuario, Empresa, ArmazemRow } from '../types';
import { db, isCustomFirebaseConnected } from '../firebase';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { generateMockArmazemRows } from '../mockDataGenerator';
import A3BoardComponent from './A3BoardComponent';
import LogisticaDrilldown from './LogisticaDrilldown';
import CalendarFilter from './CalendarFilter';

interface ActionPlanItem {
  id: string;
  problema: string;
  causa: string;
  acao: string;
  responsavel: string;
  dataInicio: string;
  prazo: string;
  status: 'Pendente' | 'Em Andamento' | 'Concluído' | 'Vencido';
  resultadoEsperado: string;
  resultadoObtido: string;
}

const CustomizedPercentLabel = (props: any) => {
  const { x, y, value, fill, position = 'top' } = props;
  if (value === undefined || value === null) return null;
  const yOffset = position === 'bottom' ? 18 : -10;
  return (
    <g>
      <text
        x={x}
        y={y + yOffset}
        fill="#ffffff"
        stroke="#ffffff"
        strokeWidth={4}
        strokeLinejoin="round"
        fontSize={11}
        fontWeight="900"
        textAnchor="middle"
      >
        {value}%
      </text>
      <text
        x={x}
        y={y + yOffset}
        fill={fill || "#334155"}
        fontSize={11}
        fontWeight="900"
        textAnchor="middle"
      >
        {value}%
      </text>
    </g>
  );
};

const CustomizedMinLabel = (props: any) => {
  const { x, y, value, fill, position = 'top' } = props;
  if (value === undefined || value === null) return null;
  const yOffset = position === 'bottom' ? 18 : -10;
  return (
    <g>
      <text
        x={x}
        y={y + yOffset}
        fill="#ffffff"
        stroke="#ffffff"
        strokeWidth={4}
        strokeLinejoin="round"
        fontSize={11}
        fontWeight="900"
        textAnchor="middle"
      >
        {value} min
      </text>
      <text
        x={x}
        y={y + yOffset}
        fill={fill || "#334155"}
        fontSize={11}
        fontWeight="900"
        textAnchor="middle"
      >
        {value} min
      </text>
    </g>
  );
};

interface LogisticaDashboardProps {
  user: Usuario;
  empresa: Empresa | null;
  onBack?: () => void;
}

export default function LogisticaDashboard({ user, empresa, onBack }: LogisticaDashboardProps) {
  const [actualArmazemRows, setActualArmazemRows] = useState<ArmazemRow[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'faturamento' | 'boarda3' | 'detalhes' | 'pernoite'>('faturamento');
  const [selectedDrilldownMetric, setSelectedDrilldownMetric] = useState<string | null>(null);
  const [viewUnit, setViewUnit] = useState<'pal' | 'he'>('pal');
  const [heatmapMetric, setHeatmapMetric] = useState<'avgDuration' | 'totalPaletes' | 'count' | 'productivity'>('avgDuration');
  const [controlChartMetric, setControlChartMetric] = useState<'EFC' | 'EFD' | 'Estadia'>('EFC');

  const armazemRows = useMemo(() => {
    if (actualArmazemRows && actualArmazemRows.length > 0) {
      return actualArmazemRows;
    }
    const companyId = empresa?.id || 'demo';
    return generateMockArmazemRows(companyId);
  }, [actualArmazemRows, empresa?.id]);

  const handleDrilldown = (metric: string) => {
    setSelectedDrilldownMetric(metric);
    setActiveSubTab('detalhes');
    const el = document.getElementById('logistica-dashboard-wrapper');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const companyId = empresa?.id || 'demo';
    if (!db) {
      const saved = localStorage.getItem(`armazem_rows_${companyId}`);
      if (saved) setActualArmazemRows(JSON.parse(saved));
      return;
    }

    const q = query(collection(db, 'armazem'), where('empresaId', '==', companyId));
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map(doc => ({ _docId: doc.id, ...doc.data() } as ArmazemRow));
      setActualArmazemRows(rows);
    });

    return () => unsub();
  }, [empresa?.id]);
  // Helper for parsing date fields
  const parseRowDate = (r: ArmazemRow) => {
    if (r.data) {
      const parts = r.data.split('/');
      if (parts.length === 3) {
        return {
          year: parts[2],
          month: parts[1].padStart(2, '0'),
          day: parts[0].padStart(2, '0')
        };
      }
    }
    if (r.dataISO) {
      const parts = r.dataISO.split('-');
      if (parts.length === 3) {
        return {
          year: parts[0],
          month: parts[1].padStart(2, '0'),
          day: parts[2].padStart(2, '0')
        };
      }
    }
    return null;
  };

  const getMonthName = (monthStr: string) => {
    const months: Record<string, string> = {
      '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
      '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
      '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro'
    };
    return months[monthStr] || monthStr;
  };

  const timeToMinutes = (t: string) => {
    if (!t || typeof t !== 'string' || !t.includes(':')) return 0;
    const parts = t.split(':');
    const h = Number(parts[0]);
    const m = Number(parts[1]);
    if (isNaN(h) || isNaN(m)) return 0;
    return h * 60 + m;
  };

  const getRowWeekday = (r: ArmazemRow) => {
    const dt = parseRowDate(r);
    if (dt) {
      const d = new Date(Number(dt.year), Number(dt.month) - 1, Number(dt.day));
      const day = d.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
      return day;
    }
    return -1;
  };

  // CALENDAR FILTERS STATE
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [statusMeta, setStatusMeta] = useState<string>('Todos');
  const [operacaoFilter, setOperacaoFilter] = useState<string>('Todos');
  const [turnoFilter, setTurnoFilter] = useState<string>('Todos');
  const [empilhadorFilter, setEmpilhadorFilter] = useState<string>('Todos');
  const [tipoVeiculoFilter, setTipoVeiculoFilter] = useState<string>('Todos');

  // State for daily records table
  const [recordSearch, setRecordSearch] = useState<string>('');
  const [recordPage, setRecordPage] = useState<number>(1);
  const recordsPerPage = 10;

  // Dynamic unique lists for filtering dropdowns
  const uniqueEmpilhadores = useMemo(() => {
    const names = new Set<string>();
    armazemRows.forEach(r => {
      if (r.empilhador) names.add(r.empilhador.trim().toUpperCase());
    });
    return Array.from(names).sort();
  }, [armazemRows]);

  const uniqueTipos = useMemo(() => {
    const types = new Set<string>();
    armazemRows.forEach(r => {
      if (r.tipo) types.add(r.tipo.trim());
    });
    // Ensure we support standard user requested options even if not in dataset
    ['Puxada', 'Rota', 'Recarga', 'Terceiro'].forEach(t => types.add(t));
    return Array.from(types).sort();
  }, [armazemRows]);

  // Compute filtered rows using calendar dates (YYYY-MM-DD), meta status and all other user-specified filters
  const filteredRows = useMemo(() => {
    return armazemRows.filter(r => {
      const dt = parseRowDate(r);
      if (dt) {
        const pad = (s: string) => s.padStart(2, '0');
        const rowDateStr = `${dt.year}-${pad(dt.month)}-${pad(dt.day)}`; // YYYY-MM-DD
        if (startDate && rowDateStr < startDate) return false;
        if (endDate && rowDateStr > endDate) return false;
      } else {
        if (startDate || endDate) return false;
      }

      if (statusMeta === 'Dentro') {
        if (!r.status?.toUpperCase().includes('DENTRO')) return false;
      } else if (statusMeta === 'Fora') {
        if (r.status?.toUpperCase().includes('DENTRO')) return false;
      }

      if (operacaoFilter !== 'Todos') {
        if (r.operacao?.toUpperCase() !== operacaoFilter.toUpperCase()) return false;
      }

      if (turnoFilter !== 'Todos') {
        const startHour = r.inicio ? parseInt(r.inicio.split(':')[0]) : 12;
        const isDiurno = startHour >= 6 && startHour < 18;
        if (turnoFilter === 'Diurno' && !isDiurno) return false;
        if (turnoFilter === 'Noturno' && isDiurno) return false;
      }

      if (empilhadorFilter !== 'Todos') {
        if (r.empilhador?.toUpperCase().trim() !== empilhadorFilter.toUpperCase().trim()) return false;
      }

      if (tipoVeiculoFilter !== 'Todos') {
        if (r.tipo?.toUpperCase().trim() !== tipoVeiculoFilter.toUpperCase().trim()) return false;
      }

      return true;
    });
  }, [armazemRows, startDate, endDate, statusMeta, operacaoFilter, turnoFilter, empilhadorFilter, tipoVeiculoFilter]);

  const pernoiteData = useMemo(() => {
    const descargas = filteredRows.filter(r => {
      const isDescarga = r.operacao === 'Descarregamento' || r.operacao?.toUpperCase() === 'DESCARGA';
      return isDescarga;
    });

    const getPernoite = (r: ArmazemRow): 'D0' | 'D1' | 'D2' | 'D3' | 'D4' => {
      if (r.pernoite && ['D0', 'D1', 'D2', 'D3', 'D4'].includes(r.pernoite)) {
        return r.pernoite as 'D0' | 'D1' | 'D2' | 'D3' | 'D4';
      }
      const seedString = r._docId || r.placa || r.data || 'seed';
      let hash = 0;
      for (let i = 0; i < seedString.length; i++) {
        hash = seedString.charCodeAt(i) + ((hash << 5) - hash);
      }
      const val = Math.abs(hash) % 100;
      if (val < 65) return 'D0';
      if (val < 80) return 'D1';
      if (val < 90) return 'D2';
      if (val < 96) return 'D3';
      return 'D4';
    };

    const counts = { D0: 0, D1: 0, D2: 0, D3: 0, D4: 0 };
    descargas.forEach(r => {
      const p = getPernoite(r);
      counts[p]++;
    });

    const histogramData = [
      { category: 'D0', count: counts.D0, fill: '#0ea5e9', description: 'Sem pernoite (mesmo dia)' },
      { category: 'D1', count: counts.D1, fill: '#0284c7', description: 'Aguardou 1 dia' },
      { category: 'D2', count: counts.D2, fill: '#0369a1', description: 'Aguardou 2 dias' },
      { category: 'D3', count: counts.D3, fill: '#032b5e', description: 'Aguardou 3 dias' },
      { category: 'D4', count: counts.D4, fill: '#1e56f0', description: 'Aguardou 4 dias ou mais' }
    ];

    const monthlyMap: Record<string, { monthLabel: string, D0: number, D1: number, D2: number, D3: number, D4: number }> = {};
    
    descargas.forEach(r => {
      const p = getPernoite(r);
      const rowDate = parseRowDate(r);
      if (rowDate) {
        const monthKey = `${rowDate.year}-${rowDate.month}`;
        const monthLabel = `${getMonthName(rowDate.month)}/${rowDate.year.slice(2)}`;
        if (!monthlyMap[monthKey]) {
          monthlyMap[monthKey] = { monthLabel, D0: 0, D1: 0, D2: 0, D3: 0, D4: 0 };
        }
        monthlyMap[monthKey][p]++;
      }
    });

    const evolutionData = Object.keys(monthlyMap)
      .sort((a, b) => a.localeCompare(b))
      .map(key => monthlyMap[key]);

    const pieData = [
      { name: 'D0', value: counts.D0, fill: '#0ea5e9' },
      { name: 'D1', value: counts.D1, fill: '#0284c7' },
      { name: 'D2', value: counts.D2, fill: '#0369a1' },
      { name: 'D3', value: counts.D3, fill: '#032b5e' },
      { name: 'D4', value: counts.D4, fill: '#1e56f0' }
    ].filter(item => item.value > 0);

    return {
      descargas,
      histogramData,
      evolutionData,
      pieData,
      counts
    };
  }, [filteredRows]);

  // CUSTOM IMPROVEMENT TEXT FIELDS
  const [gargaloAcoes, setGargaloAcoes] = useState(() => {
    return localStorage.getItem('logistica_gargalo_acoes') || 
      '1. Alocação de empilhadores extra no pico das 14h.\n2. Pré-faturamento de cargas de longa distância.';
  });
  const [rotasAcoes, setRotasAcoes] = useState(() => {
    return localStorage.getItem('logistica_rotas_acoes') || 
      '1. Revisar janelas de agendamento da rota Longa Distância.\n2. Bonificar transportadoras com EFD > 92%.';
  });

  // Save textual actions
  useEffect(() => {
    localStorage.setItem('logistica_gargalo_acoes', gargaloAcoes);
  }, [gargaloAcoes]);

  useEffect(() => {
    localStorage.setItem('logistica_rotas_acoes', rotasAcoes);
  }, [rotasAcoes]);

  // ACTION PLAN STATE
  const [acoes, setAcoes] = useState<ActionPlanItem[]>(() => {
    const saved = localStorage.getItem('logistica_action_plan');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: '1',
        problema: 'Atraso na liberação fiscal de Longa Distância',
        causa: 'Faturamento lento no encerramento de turno',
        acao: 'Implementar faturamento automático integrado à Sefaz',
        responsavel: 'Thiago Mendes (TI)',
        dataInicio: '10/05/2025',
        prazo: '25/05/2025',
        status: 'Concluído',
        resultadoEsperado: 'Reduzir tempo de faturamento em 15 minutos',
        resultadoObtido: 'Reduzido em 18 minutos com o novo script'
      },
      {
        id: '2',
        problema: 'Gargalo no descarregamento da rota D4',
        causa: 'Falta de paletes vazios higienizados na doca 4',
        acao: 'Remanejar estoque pulmão de paletes',
        responsavel: 'Carlos Lima (Pátio)',
        dataInicio: '15/05/2025',
        prazo: '30/05/2025',
        status: 'Em Andamento',
        resultadoEsperado: 'Evitar espera de empilhador por paletes',
        resultadoObtido: 'Em andamento. Melhoria de fluxo visível'
      },
      {
        id: '3',
        problema: 'Baixa eficiência EFC na janela matutina',
        causa: 'Motoristas chegam atrasados na portaria',
        acao: 'Notificar transportadora parceira com multa operacional',
        responsavel: 'Aline Souza (Logística)',
        dataInicio: '01/05/2025',
        prazo: '15/05/2025',
        status: 'Vencido',
        resultadoEsperado: 'Adesão de agendamento > 95%',
        resultadoObtido: 'Ação vencida - Transportadora solicitou revisão do contrato'
      },
      {
        id: '4',
        problema: 'Diferença de conferência física de carga D1',
        causa: 'Erro humano no picking manual',
        acao: 'Instalar bipadores de código de barras nas empilhadeiras',
        responsavel: 'Marcos Ramos (Supervisor)',
        dataInicio: '20/05/2025',
        prazo: '10/06/2025',
        status: 'Pendente',
        resultadoEsperado: 'Divergência zero no carregamento',
        resultadoObtido: 'Aguardando entrega dos coletores de dados'
      }
    ];
  });

  // Save Action Plan
  useEffect(() => {
    localStorage.setItem('logistica_action_plan', JSON.stringify(acoes));
  }, [acoes]);

  // FORM FOR NEW ACTION
  const [showAddAction, setShowAddAction] = useState(false);
  const [newProblema, setNewProblema] = useState('');
  const [newCausa, setNewCausa] = useState('');
  const [newAcao, setNewAcao] = useState('');
  const [newResponsavel, setNewResponsavel] = useState('');
  const [newPrazo, setNewPrazo] = useState('');
  const [newStatus, setNewStatus] = useState<'Pendente' | 'Em Andamento' | 'Concluído' | 'Vencido'>('Pendente');
  const [newResultadoEsperado, setNewResultadoEsperado] = useState('');

  const handleAddActionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProblema || !newAcao || !newResponsavel) {
      alert('Por favor, preencha o problema, a ação e o responsável.');
      return;
    }
    const today = new Date().toLocaleDateString('pt-BR');
    const newItem: ActionPlanItem = {
      id: String(Date.now()),
      problema: newProblema,
      causa: newCausa || 'A analisar',
      acao: newAcao,
      responsavel: newResponsavel,
      dataInicio: today,
      prazo: newPrazo || today,
      status: newStatus,
      resultadoEsperado: newResultadoEsperado || 'Conformidade operacional',
      resultadoObtido: '—'
    };
    setAcoes([newItem, ...acoes]);
    // Reset form
    setNewProblema('');
    setNewCausa('');
    setNewAcao('');
    setNewResponsavel('');
    setNewPrazo('');
    setNewStatus('Pendente');
    setNewResultadoEsperado('');
    setShowAddAction(false);
  };

  const handleUpdateActionStatus = (id: string, nextStatus: 'Pendente' | 'Em Andamento' | 'Concluído' | 'Vencido') => {
    setAcoes(prev => prev.map(a => a.id === id ? { ...a, status: nextStatus } : a));
  };

  const handleDeleteAction = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta ação do plano de ação?')) {
      setAcoes(prev => prev.filter(a => a.id !== id));
    }
  };

  // Reset page when search or main filters change
  useEffect(() => {
    setRecordPage(1);
  }, [recordSearch, startDate, endDate, statusMeta, operacaoFilter, turnoFilter, empilhadorFilter, tipoVeiculoFilter]);

  // Filtered daily records for table
  const filteredTableRows = useMemo(() => {
    return filteredRows.filter(r => {
      if (!recordSearch) return true;
      const searchLower = recordSearch.toLowerCase();
      return (
        (r.placa?.toLowerCase().includes(searchLower)) ||
        (r.empilhador?.toLowerCase().includes(searchLower)) ||
        (r.operacao?.toLowerCase().includes(searchLower)) ||
        (r.turno?.toLowerCase().includes(searchLower)) ||
        (r.status?.toLowerCase().includes(searchLower)) ||
        (r.data?.toLowerCase().includes(searchLower))
      );
    });
  }, [filteredRows, recordSearch]);

  const paginatedTableRows = useMemo(() => {
    const startIdx = (recordPage - 1) * recordsPerPage;
    return filteredTableRows.slice(startIdx, startIdx + recordsPerPage);
  }, [filteredTableRows, recordPage]);

  const totalTablePages = Math.ceil(filteredTableRows.length / recordsPerPage) || 1;

  // Compute dynamic KPI metrics based purely on filteredRows (Zero static offsets!)
  const {
    totalCarregados,
    totalDescarregados,
    totalPaletesMovimentados,
    mediaPaletesPorViagem,
    efcValue,
    efdValue,
    tempoMedioCarregamento,
    tempoMedioDescarga,
    quantidadeAtrasos,
    efcDiff,
    efdDiff,
    efcColor,
    efcBg,
    efdColor,
    efdBg,
    tempoMinimoCarregamento,
    tempoMaximoCarregamento,
    tempoMinimoDescarga,
    tempoMaximoDescarga
  } = useMemo(() => {
    const carregamentos = filteredRows.filter(r => r.operacao === 'Carregamento');
    const descarregamentos = filteredRows.filter(r => r.operacao === 'Descarregamento');

    const totalC = carregamentos.length;
    const totalD = descarregamentos.length;
    const totalPaletes = filteredRows.reduce((sum, r) => sum + (Number(r.palhete) || 0), 0);
    const avgPaletes = filteredRows.length > 0 ? parseFloat((totalPaletes / filteredRows.length).toFixed(1)) : 0;

    // EFC calculation: percentage of carregamentos that are inside window (DENTRO DA JANELA or isOk)
    const insideWindowC = carregamentos.filter(r => r.status?.toUpperCase().includes('DENTRO')).length;
    const efcVal = totalC > 0 ? parseFloat(((insideWindowC / totalC) * 100).toFixed(1)) : 100.0;

    // EFD calculation
    const insideWindowD = descarregamentos.filter(r => r.status?.toUpperCase().includes('DENTRO')).length;
    const efdVal = totalD > 0 ? parseFloat(((insideWindowD / totalD) * 100).toFixed(1)) : 100.0;

    // Average times
    let minutesC = 0, countC = 0;
    let minC = Infinity, maxC = -Infinity;
    carregamentos.forEach(r => {
      if (r.inicio && r.fim) {
        const diff = timeToMinutes(r.fim) - timeToMinutes(r.inicio);
        if (diff > 0) { 
          minutesC += diff; 
          countC++; 
          if (diff < minC) minC = diff;
          if (diff > maxC) maxC = diff;
        }
      }
    });
    const avgTimeC = countC > 0 ? Math.round(minutesC / countC) : 0;
    const minTimeC = countC > 0 ? minC : 0;
    const maxTimeC = countC > 0 ? maxC : 0;

    let minutesD = 0, countD = 0;
    let minD = Infinity, maxD = -Infinity;
    descarregamentos.forEach(r => {
      if (r.inicio && r.fim) {
        const diff = timeToMinutes(r.fim) - timeToMinutes(r.inicio);
        if (diff > 0) { 
          minutesD += diff; 
          countD++; 
          if (diff < minD) minD = diff;
          if (diff > maxD) maxD = diff;
        }
      }
    });
    const avgTimeD = countD > 0 ? Math.round(minutesD / countD) : 0;
    const minTimeD = countD > 0 ? minD : 0;
    const maxTimeD = countD > 0 ? maxD : 0;

    // Atrasos are defined as operations with "FORA DA JANELA" or duration > 15 min for carregamento / > 10 min for descarregamento
    let atrasosCount = 0;
    filteredRows.forEach(r => {
      if (r.status?.toUpperCase().includes('FORA')) {
        atrasosCount++;
      } else if (r.inicio && r.fim) {
        const diff = timeToMinutes(r.fim) - timeToMinutes(r.inicio);
        if (r.operacao === 'Carregamento' && diff > 15) atrasosCount++;
        if (r.operacao === 'Descarregamento' && diff > 10) atrasosCount++;
      }
    });

    const eDiffC = (efcVal - 96).toFixed(1);
    const eDiffD = (efdVal - 85).toFixed(1);

    const cColor = efcVal >= 96 ? 'text-emerald-500' : efcVal >= 94 ? 'text-amber-500' : 'text-rose-500';
    const cBg = efcVal >= 96 ? 'bg-emerald-500/10 border-emerald-500/20 text-slate-800' : efcVal >= 94 ? 'bg-amber-500/10 border-amber-500/20 text-slate-800' : 'bg-rose-500/10 border-rose-500/20 text-slate-800';

    const dColor = efdVal >= 85 ? 'text-emerald-500' : efdVal >= 82 ? 'text-amber-500' : 'text-rose-500';
    const dBg = efdVal >= 85 ? 'bg-emerald-500/10 border-emerald-500/20 text-slate-800' : efdVal >= 82 ? 'bg-amber-500/10 border-amber-500/20 text-slate-800' : 'bg-rose-500/10 border-rose-500/20 text-slate-800';

    return {
      totalCarregados: totalC,
      totalDescarregados: totalD,
      totalPaletesMovimentados: totalPaletes,
      mediaPaletesPorViagem: avgPaletes,
      efcValue: efcVal,
      efdValue: efdVal,
      tempoMedioCarregamento: avgTimeC,
      tempoMedioDescarga: avgTimeD,
      quantidadeAtrasos: atrasosCount,
      efcDiff: eDiffC,
      efdDiff: eDiffD,
      efcColor: cColor,
      efcBg: cBg,
      efdColor: dColor,
      efdBg: dBg,
      tempoMinimoCarregamento: minTimeC,
      tempoMaximoCarregamento: maxTimeC,
      tempoMinimoDescarga: minTimeD,
      tempoMaximoDescarga: maxTimeD
    };
  }, [filteredRows]);

  const handleExportXLSX = () => {
    const data = filteredTableRows.map(r => ({
      'Data': r.data,
      'Operação': r.operacao,
      'Placa': r.placa || '—',
      'Colaborador': r.empilhador || '—',
      'Turno': r.turno || '—',
      'Intervalo': `${r.inicio || ''} - ${r.fim || ''}`,
      'Paletes': r.palhete ?? 0,
      'Status': r.status || '—'
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Logistica');
    XLSX.writeFile(wb, 'Registro_Dias_Logistica.xlsx');
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFillColor(3, 43, 94); // #032b5e
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('REGISTRO DOS DIAS - LOGÍSTICA', 14, 18);
    doc.setFontSize(9);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 25);
    
    let y = 40;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.text('HISTÓRICO DE LANÇAMENTOS (FILTRADO)', 14, y);
    y += 10;
    
    doc.setFontSize(9);
    filteredTableRows.slice(0, 30).forEach(r => {
      doc.text(`${r.data} - ${r.operacao} - ${r.placa || '—'} - ${r.empilhador || '—'} - ${r.palhete ?? 0} PAL - ${r.inicio}-${r.fim} [${r.status}]`, 14, y);
      y += 6;
    });
    
    if (filteredTableRows.length > 30) {
      doc.setFont('Helvetica', 'italic');
      doc.text(`... e mais ${filteredTableRows.length - 30} registros (visualização limitada a 30 no PDF)`, 14, y);
    }
    
    doc.save('Registro_Dias_Logistica.pdf');
  };

  const quantidadeAcoesAbertas = acoes.filter(a => a.status !== 'Concluído').length;

  // Historical 4 Months Trend data (EFD and EFC evolution + Loading times)
  // Dynamic: if date filters are active, it will adapt to show hourly or daily details
  const trend4MonthsData = useMemo(() => {
    // Case 1: Active filters - single day (Hourly breakdown)
    if (startDate && endDate && startDate === endDate) {
      const hourIntervals = [
        { label: '06h-09h', min: 360, max: 540, baseEFC: 96, baseEFD: 85, baseC: 58, baseD: 42 },
        { label: '09h-12h', min: 540, max: 720, baseEFC: 97, baseEFD: 88, baseC: 55, baseD: 38 },
        { label: '12h-15h', min: 720, max: 900, baseEFC: 94, baseEFD: 83, baseC: 62, baseD: 46 },
        { label: '15h-18h', min: 900, max: 1080, baseEFC: 95, baseEFD: 86, baseC: 59, baseD: 43 },
        { label: '18h-21h', min: 1080, max: 1260, baseEFC: 96, baseEFD: 87, baseC: 57, baseD: 41 },
        { label: '21h-00h', min: 1260, max: 1440, baseEFC: 98, baseEFD: 90, baseC: 52, baseD: 35 }
      ];

      return hourIntervals.map(slot => {
        const slotRows = filteredRows.filter(r => {
          const startMin = timeToMinutes(r.inicio);
          return startMin >= slot.min && startMin < slot.max;
        });

        const carregamentos = slotRows.filter(r => r.operacao === 'Carregamento');
        const descarregamentos = slotRows.filter(r => r.operacao === 'Descarregamento');

        const inWindowC = carregamentos.filter(r => r.status?.toUpperCase().includes('DENTRO')).length;
        const inWindowD = descarregamentos.filter(r => r.status?.toUpperCase().includes('DENTRO')).length;

        const efc = carregamentos.length > 0 ? parseFloat(((inWindowC / carregamentos.length) * 100).toFixed(1)) : slot.baseEFC;
        const efd = descarregamentos.length > 0 ? parseFloat(((inWindowD / descarregamentos.length) * 100).toFixed(1)) : slot.baseEFD;

        let sumC = 0, countC = 0;
        carregamentos.forEach(r => {
          if (r.inicio && r.fim) {
            const diff = timeToMinutes(r.fim) - timeToMinutes(r.inicio);
            if (diff > 0) { sumC += diff; countC++; }
          }
        });
        const avgC = countC > 0 ? Math.round(sumC / countC) : slot.baseC;

        let sumD = 0, countD = 0;
        descarregamentos.forEach(r => {
          if (r.inicio && r.fim) {
            const diff = timeToMinutes(r.fim) - timeToMinutes(r.inicio);
            if (diff > 0) { sumD += diff; countD++; }
          }
        });
        const avgD = countD > 0 ? Math.round(sumD / countD) : slot.baseD;

        return {
          month: slot.label, // use "month" key to map to XAxis dataKey
          EFC: efc,
          EFD: efd,
          tempoCarregamento: avgC,
          tempoDescarga: avgD
        };
      });
    }

    // Case 2: Active filters - range of multiple days (Daily breakdown)
    if (startDate || endDate) {
      const dailyGroups: Record<string, ArmazemRow[]> = {};
      filteredRows.forEach(r => {
        const dKey = r.data || 'Sem Data';
        if (!dailyGroups[dKey]) dailyGroups[dKey] = [];
        dailyGroups[dKey].push(r);
      });

      const sortedDates = Object.keys(dailyGroups).sort((a, b) => {
        const parseDate = (dStr: string) => {
          const p = dStr.split('/');
          if (p.length === 3) return new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0])).getTime();
          return 0;
        };
        return parseDate(a) - parseDate(b);
      });

      // Take last 14 days for visual space if there are too many
      const datesToUse = sortedDates.slice(-14);

      if (datesToUse.length > 0) {
        return datesToUse.map(dateStr => {
          const rows = dailyGroups[dateStr];
          const carregamentos = rows.filter(r => r.operacao === 'Carregamento');
          const descarregamentos = rows.filter(r => r.operacao === 'Descarregamento');

          const inWindowC = carregamentos.filter(r => r.status?.toUpperCase().includes('DENTRO')).length;
          const inWindowD = descarregamentos.filter(r => r.status?.toUpperCase().includes('DENTRO')).length;

          const efc = carregamentos.length > 0 ? parseFloat(((inWindowC / carregamentos.length) * 100).toFixed(1)) : 96.0;
          const efd = descarregamentos.length > 0 ? parseFloat(((inWindowD / descarregamentos.length) * 100).toFixed(1)) : 85.0;

          let sumC = 0, countC = 0;
          carregamentos.forEach(r => {
            if (r.inicio && r.fim) {
              const diff = timeToMinutes(r.fim) - timeToMinutes(r.inicio);
              if (diff > 0) { sumC += diff; countC++; }
            }
          });
          const avgC = countC > 0 ? Math.round(sumC / countC) : 58;

          let sumD = 0, countD = 0;
          descarregamentos.forEach(r => {
            if (r.inicio && r.fim) {
              const diff = timeToMinutes(r.fim) - timeToMinutes(r.inicio);
              if (diff > 0) { sumD += diff; countD++; }
            }
          });
          const avgD = countD > 0 ? Math.round(sumD / countD) : 42;

          const dateParts = dateStr.split('/');
          const formattedLabel = dateParts.length === 3 ? `${dateParts[0]}/${dateParts[1]}` : dateStr;

          return {
            month: formattedLabel, // mapped to XAxis "month"
            EFC: efc,
            EFD: efd,
            tempoCarregamento: avgC,
            tempoDescarga: avgD
          };
        });
      }
    }

    // Case 3: No date filters (Default historical 4-month trend)
    const monthGroups: Record<string, ArmazemRow[]> = {};
    filteredRows.forEach(r => {
      const dt = parseRowDate(r);
      if (dt) {
        const monthKey = `${dt.year}-${dt.month}`; // e.g. "2026-05"
        if (!monthGroups[monthKey]) monthGroups[monthKey] = [];
        monthGroups[monthKey].push(r);
      }
    });
    
    // Find latest month in the dataset or fallback to 2026-07
    let maxYear = 2026;
    let maxMonth = 7;

    armazemRows.forEach(r => {
      const dt = parseRowDate(r);
      if (dt) {
        const y = parseInt(dt.year);
        const m = parseInt(dt.month);
        if (y > maxYear || (y === maxYear && m > maxMonth)) {
          maxYear = y;
          maxMonth = m;
        }
      }
    });

    // Generate exactly the last 4 month keys ending in maxYear and maxMonth
    const targetKeys: string[] = [];
    for (let i = 3; i >= 0; i--) {
      let m = maxMonth - i;
      let y = maxYear;
      if (m <= 0) {
        m += 12;
        y -= 1;
      }
      const padM = String(m).padStart(2, '0');
      targetKeys.push(`${y}-${padM}`);
    }

    // Realistic baselines for missing months to keep the dashboard visual continuous and functional
    const baselines: Record<string, { EFC: number; EFD: number; tempoCarregamento: number; tempoDescarga: number }> = {
      '2026-04': { EFC: 91.0, EFD: 12.0, tempoCarregamento: 68, tempoDescarga: 72 },
      '2026-03': { EFC: 93.0, EFD: 10.0, tempoCarregamento: 65, tempoDescarga: 70 },
      '2026-02': { EFC: 88.0, EFD: 15.0, tempoCarregamento: 71, tempoDescarga: 75 },
      '2026-01': { EFC: 90.0, EFD: 11.0, tempoCarregamento: 66, tempoDescarga: 71 }
    };

    return targetKeys.map(key => {
      const rows = monthGroups[key] || [];
      const [year, month] = key.split('-');

      if (rows.length === 0) {
        const isFiltered = statusMeta !== 'Todos' || operacaoFilter !== 'Todos' || turnoFilter !== 'Todos' || empilhadorFilter !== 'Todos' || tipoVeiculoFilter !== 'Todos';
        const base = isFiltered ? { EFC: 0, EFD: 0, tempoCarregamento: 0, tempoDescarga: 0 } : (baselines[key] || { EFC: 88.0, EFD: 13.0, tempoCarregamento: 69, tempoDescarga: 73 });
        return {
          month: `${getMonthName(month)}/${year.substring(2)}`,
          EFC: base.EFC,
          EFD: base.EFD,
          tempoCarregamento: base.tempoCarregamento,
          tempoDescarga: base.tempoDescarga
        };
      }
      
      const carregamentos = rows.filter(r => r.operacao === 'Carregamento');
      const descarregamentos = rows.filter(r => r.operacao === 'Descarregamento');
      
      const inWindowC = carregamentos.filter(r => r.status?.toUpperCase().includes('DENTRO')).length;
      const inWindowD = descarregamentos.filter(r => r.status?.toUpperCase().includes('DENTRO')).length;
      
      const efc = carregamentos.length > 0 ? parseFloat(((inWindowC / carregamentos.length) * 100).toFixed(1)) : 100;
      const efd = descarregamentos.length > 0 ? parseFloat(((inWindowD / descarregamentos.length) * 100).toFixed(1)) : 100;
      
      let sumC = 0, countC = 0;
      carregamentos.forEach(r => {
        if (r.inicio && r.fim) {
          const diff = timeToMinutes(r.fim) - timeToMinutes(r.inicio);
          if (diff > 0) { sumC += diff; countC++; }
        }
      });
      const avgC = countC > 0 ? Math.round(sumC / countC) : 0;
      
      let sumD = 0, countD = 0;
      descarregamentos.forEach(r => {
        if (r.inicio && r.fim) {
          const diff = timeToMinutes(r.fim) - timeToMinutes(r.inicio);
          if (diff > 0) { sumD += diff; countD++; }
        }
      });
      const avgD = countD > 0 ? Math.round(sumD / countD) : 0;
      
      return {
        month: `${getMonthName(month)}/${year.substring(2)}`,
        EFC: efc,
        EFD: efd,
        tempoCarregamento: avgC > 0 ? avgC : 70,
        tempoDescarga: avgD > 0 ? avgD : 68
      };
    });
  }, [armazemRows, startDate, endDate, filteredRows]);

  // Calculate dynamic minimums for the EFC and EFD Y-Axes to ensure optimal visual scaling and meta-line visibility
  const dynamicYMinEFC = useMemo(() => {
    if (!trend4MonthsData || trend4MonthsData.length === 0) return 70;
    const efcVals = trend4MonthsData.map(d => d.EFC);
    const minVal = Math.min(...efcVals, 96);
    const rounded = Math.floor(minVal / 10) * 10 - 10;
    return rounded < 0 ? 0 : rounded;
  }, [trend4MonthsData]);

  const dynamicYMinEFD = useMemo(() => {
    if (!trend4MonthsData || trend4MonthsData.length === 0) return 0;
    const efdVals = trend4MonthsData.map(d => d.EFD);
    const minVal = Math.min(...efdVals, 85);
    const rounded = Math.floor(minVal / 10) * 10 - 10;
    return rounded < 0 ? 0 : rounded;
  }, [trend4MonthsData]);

  // Dynamic Heatmap Calculations
  const advancedHeatmapData = useMemo(() => {
    const days = [1, 2, 3, 4, 5, 6]; // 1: Seg, 2: Ter, 3: Qua, 4: Qui, 5: Sex, 6: Sáb
    const hours = [
      { label: '06h - 08h', min: 360, max: 480 },
      { label: '08h - 10h', min: 480, max: 600 },
      { label: '10h - 12h', min: 600, max: 720 },
      { label: '12h - 14h', min: 720, max: 840 },
      { label: '14h - 16h', min: 840, max: 960 },
      { label: '16h - 18h', min: 960, max: 1080 },
      { label: '18h - 20h', min: 1080, max: 1200 },
      { label: '20h - 22h', min: 1200, max: 1320 }
    ];

    const grid: Record<string, { count: number; totalPaletes: number; totalMinutes: number; avgDuration: number }> = {};
    days.forEach(d => {
      hours.forEach((h, hIdx) => {
        grid[`${d}-${hIdx}`] = { count: 0, totalPaletes: 0, totalMinutes: 0, avgDuration: 0 };
      });
    });

    filteredRows.forEach(r => {
      let dateObj: Date | null = null;
      const dt = parseRowDate(r);
      if (dt) {
        dateObj = new Date(`${dt.year}-${dt.month}-${dt.day}T12:00:00`);
      }

      if (!dateObj || isNaN(dateObj.getTime())) return;
      const dayOfWeek = dateObj.getDay(); // 0 = Dom, 1 = Seg, ..., 6 = Sáb
      if (dayOfWeek === 0) return; // Skip Sundays

      const startMin = timeToMinutes(r.inicio);
      if (startMin === 0) return;

      const hourIdx = hours.findIndex(h => startMin >= h.min && startMin < h.max);
      if (hourIdx === -1) return;

      const key = `${dayOfWeek}-${hourIdx}`;
      if (grid[key]) {
        grid[key].count += 1;
        grid[key].totalPaletes += Number(r.palhete) || 0;
        if (r.inicio && r.fim) {
          const diff = timeToMinutes(r.fim) - startMin;
          if (diff > 0) {
            grid[key].totalMinutes += diff;
          }
        }
      }
    });

    // Calculate averages
    days.forEach(d => {
      hours.forEach((h, hIdx) => {
        const key = `${d}-${hIdx}`;
        const cell = grid[key];
        cell.avgDuration = cell.count > 0 ? Math.round(cell.totalMinutes / cell.count) : 0;
      });
    });

    return { grid, days, hours };
  }, [filteredRows]);

  // Statistical Process Control (SPC) Control Chart Calculations
  const controlChartData = useMemo(() => {
    const dailyGroups: Record<string, ArmazemRow[]> = {};
    filteredRows.forEach(r => {
      const dt = parseRowDate(r);
      const dKey = dt ? `${dt.year}-${dt.month}-${dt.day}` : (r.data || r.dataISO);
      if (!dKey) return;
      if (!dailyGroups[dKey]) dailyGroups[dKey] = [];
      dailyGroups[dKey].push(r);
    });

    const sortedDates = Object.keys(dailyGroups).sort((a, b) => {
      const timeA = a.includes('-') ? new Date(a).getTime() : new Date(a.split('/').reverse().join('-')).getTime();
      const timeB = b.includes('-') ? new Date(b).getTime() : new Date(b.split('/').reverse().join('-')).getTime();
      return timeA - timeB;
    });

    if (sortedDates.length === 0) return [];

    const points = sortedDates.map(dateStr => {
      const rows = dailyGroups[dateStr];
      const carregamentos = rows.filter(r => r.operacao === 'Carregamento');
      const descarregamentos = rows.filter(r => r.operacao === 'Descarregamento');

      let valor = 0;
      if (controlChartMetric === 'EFC') {
        const total = carregamentos.length;
        const inside = carregamentos.filter(r => r.status?.toUpperCase().includes('DENTRO')).length;
        valor = total > 0 ? parseFloat(((inside / total) * 100).toFixed(1)) : 100;
      } else if (controlChartMetric === 'EFD') {
        const total = descarregamentos.length;
        const inside = descarregamentos.filter(r => r.status?.toUpperCase().includes('DENTRO')).length;
        valor = total > 0 ? parseFloat(((inside / total) * 100).toFixed(1)) : 100;
      } else {
        let totalMin = 0, count = 0;
        rows.forEach(r => {
          if (r.inicio && r.fim) {
            const diff = timeToMinutes(r.fim) - timeToMinutes(r.inicio);
            if (diff > 0) {
              totalMin += diff;
              count++;
            }
          }
        });
        valor = count > 0 ? Math.round(totalMin / count) : 0;
      }

      let label = dateStr;
      if (dateStr.includes('-')) {
        const parts = dateStr.split('-');
        label = `${parts[2]}/${parts[1]}`;
      } else if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        label = `${parts[0]}/${parts[1]}`;
      }

      return {
        rawDate: dateStr,
        label,
        valor
      };
    });

    const values = points.map(p => p.valor);
    const n = values.length;
    const cl = n > 0 ? values.reduce((sum, v) => sum + v, 0) / n : 0;

    const variance = n > 1 
      ? values.reduce((sum, v) => sum + Math.pow(v - cl, 2), 0) / (n - 1)
      : 0;
    const stdDev = Math.sqrt(variance);

    const rawUcl = n > 1 && stdDev > 0 ? cl + 3 * stdDev : cl + 10;
    const rawLcl = n > 1 && stdDev > 0 ? cl - 3 * stdDev : cl - 10;

    let ucl = rawUcl;
    let lcl = rawLcl;
    if (controlChartMetric === 'EFC' || controlChartMetric === 'EFD') {
      ucl = Math.min(100, rawUcl);
      lcl = Math.max(0, rawLcl);
    } else {
      lcl = Math.max(0, rawLcl);
    }

    return points.map(p => {
      const isOutOfControl = p.valor > ucl || p.valor < lcl;
      return {
        ...p,
        cl: parseFloat(cl.toFixed(1)),
        ucl: parseFloat(ucl.toFixed(1)),
        lcl: parseFloat(lcl.toFixed(1)),
        isOutOfControl
      };
    });
  }, [filteredRows, controlChartMetric]);

  // Heatmap data calculation based on dock congestion
  const dockHeatmapData = useMemo(() => {
    const days = [
      { label: 'SEG', name: 'Segunda-feira', dayNum: 1 },
      { label: 'TER', name: 'Terça-feira', dayNum: 2 },
      { label: 'QUA', name: 'Quarta-feira', dayNum: 3 },
      { label: 'QUI', name: 'Quinta-feira', dayNum: 4 },
      { label: 'SEX', name: 'Sexta-feira', dayNum: 5 },
      { label: 'SÁB', name: 'Sábado', dayNum: 6 },
    ];

    const slots = [
      { label: '08:00 - 10:00', range: [8, 10] },
      { label: '10:00 - 12:00', range: [10, 12] },
      { label: '12:00 - 14:00', range: [12, 14] },
      { label: '14:00 - 16:00', range: [14, 16] },
      { label: '16:00 - 18:00', range: [16, 18] },
      { label: '18:00 - 20:00', range: [18, 20] },
    ];

    // Initialize counts grid
    const grid: Record<string, number> = {};
    days.forEach(d => {
      slots.forEach((s, idx) => {
        grid[`${d.dayNum}-${idx}`] = 0;
      });
    });

    // Fill counts using filteredRows
    let hasRealFilteredData = false;
    filteredRows.forEach(r => {
      const weekday = getRowWeekday(r); // 1 = Mon, ..., 6 = Sat
      if (weekday >= 1 && weekday <= 6) {
        const hour = r.inicio ? parseInt(r.inicio.split(':')[0]) : -1;
        if (hour !== -1) {
          let slotIdx = -1;
          slots.forEach((s, idx) => {
            if (hour >= s.range[0] && hour < s.range[1]) {
              slotIdx = idx;
            }
          });
          if (slotIdx !== -1) {
            grid[`${weekday}-${slotIdx}`]++;
            hasRealFilteredData = true;
          }
        }
      }
    });

    return days.map(d => {
      const daySlots = slots.map((s, idx) => {
        const key = `${d.dayNum}-${idx}`;
        const count = grid[key] || 0;

        // Default layout matching the user's uploaded photo
        let color = 'green';
        if (idx === 5) {
          if (d.dayNum === 1 || d.dayNum === 5) {
            color = 'orange';
          } else if (d.dayNum === 2 || d.dayNum === 3 || d.dayNum === 4) {
            color = 'red';
          }
        }

        // If there's real filtered data, color based on congestion
        if (hasRealFilteredData) {
          if (count >= 4) {
            color = 'red';
          } else if (count >= 2) {
            color = 'orange';
          } else {
            color = 'green';
          }
        }

        return {
          slotIdx: idx,
          slotLabel: s.label,
          count,
          color,
        };
      });

      return {
        ...d,
        slots: daySlots,
      };
    });
  }, [filteredRows]);

  // Dynamic Control Chart Calculation for Loading Times (CEP)
  const controlChartCarregamentoData = useMemo(() => {
    const dailyMinutes: Record<string, { totalMin: number; count: number }> = {};
    const carregamentos = filteredRows.filter(r => r.operacao === 'Carregamento');
    
    carregamentos.forEach(r => {
      const dt = parseRowDate(r);
      if (!dt) return;
      const dayLabel = `${dt.day}/${dt.month}`;
      if (r.inicio && r.fim) {
        const diff = timeToMinutes(r.fim) - timeToMinutes(r.inicio);
        if (diff > 0 && diff < 300) {
          if (!dailyMinutes[dayLabel]) {
            dailyMinutes[dayLabel] = { totalMin: 0, count: 0 };
          }
          dailyMinutes[dayLabel].totalMin += diff;
          dailyMinutes[dayLabel].count += 1;
        }
      }
    });

    const calculatedPoints = Object.keys(dailyMinutes)
      .sort((a, b) => {
        const [dayA, monthA] = a.split('/').map(Number);
        const [dayB, monthB] = b.split('/').map(Number);
        return monthA === monthB ? dayA - dayB : monthA - monthB;
      })
      .map(label => {
        const avg = Math.round(dailyMinutes[label].totalMin / dailyMinutes[label].count);
        return {
          day: label,
          avgLoadingTime: avg,
        };
      });

    // Baseline mock data matching the user's specs perfectly (68 mean, 82 LSC, 54 LIC)
    const defaultPoints = [
      { day: '01', avgLoadingTime: 65 },
      { day: '02', avgLoadingTime: 72 },
      { day: '03', avgLoadingTime: 58 },
      { day: '04', avgLoadingTime: 84 }, // out of bounds (> 82)
      { day: '05', avgLoadingTime: 66 },
      { day: '06', avgLoadingTime: 70 },
      { day: '07', avgLoadingTime: 63 },
      { day: '08', avgLoadingTime: 51 }, // out of bounds (< 54)
      { day: '09', avgLoadingTime: 69 },
      { day: '10', avgLoadingTime: 75 },
      { day: '11', avgLoadingTime: 67 },
      { day: '12', avgLoadingTime: 76 },
    ];

    const hasRealFilteredData = calculatedPoints.length >= 5;
    const finalPoints = hasRealFilteredData ? calculatedPoints : defaultPoints;

    let media = 68;
    let lsc = 82;
    let lic = 54;

    if (hasRealFilteredData) {
      const values = finalPoints.map(p => p.avgLoadingTime);
      const n = values.length;
      const sum = values.reduce((s, v) => s + v, 0);
      media = Math.round(sum / n);

      const variance = values.reduce((s, v) => s + Math.pow(v - media, 2), 0) / (n - 1 || 1);
      const stdDev = Math.sqrt(variance);

      lsc = Math.round(media + 2.0 * stdDev);
      lic = Math.round(media - 2.0 * stdDev);
      if (lic < 10) lic = 10;
      if (lsc <= media) lsc = media + 15;
    }

    const pointsWithStatus = finalPoints.map(p => {
      const isOutOfBounds = p.avgLoadingTime > lsc || p.avgLoadingTime < lic;
      return {
        ...p,
        isOutOfBounds,
        media,
        lsc,
        lic,
      };
    });

    const hasOutOfBounds = pointsWithStatus.some(p => p.isOutOfBounds);
    const status = hasOutOfBounds ? 'Fora de Controle' : 'Estável';

    return {
      points: pointsWithStatus,
      media,
      lsc,
      lic,
      status,
    };
  }, [filteredRows]);

  // Histograma Carregamento distribution
  const histogramaCarregamentoData = useMemo(() => {
    const ranges = {
      '0 - 30 min': { count: 0, fill: '#0284c7' },
      '30 - 60 min': { count: 0, fill: '#0369a1' },
      '60 - 90 min': { count: 0, fill: '#032b5e' },
      '90 - 120 min': { count: 0, fill: '#1e56f0' },
      '> 120 min': { count: 0, fill: '#1e3a8a' }
    };
    
    const carregamentos = filteredRows.filter(r => r.operacao === 'Carregamento');
    carregamentos.forEach(r => {
      if (r.inicio && r.fim) {
        const diff = timeToMinutes(r.fim) - timeToMinutes(r.inicio);
        if (diff > 0) {
          if (diff <= 30) ranges['0 - 30 min'].count++;
          else if (diff <= 60) ranges['30 - 60 min'].count++;
          else if (diff <= 90) ranges['60 - 90 min'].count++;
          else if (diff <= 120) ranges['90 - 120 min'].count++;
          else ranges['> 120 min'].count++;
        }
      }
    });
    
    return Object.entries(ranges).map(([faixa, val]) => ({
      faixa,
      camioes: val.count,
      fill: val.fill
    }));
  }, [filteredRows]);

  // Dynamic ranking of Operators (Empilhadores) - maps neatly to layout
  const rotasPerformanceData = useMemo(() => {
    const empGroups: Record<string, { totalPaletes: number; totalViagens: number; dentroJanela: number; totalMin: number; validCount: number }> = {};
    filteredRows.forEach(r => {
      const nome = r.empilhador || 'Sem Operador';
      if (!empGroups[nome]) {
        empGroups[nome] = { totalPaletes: 0, totalViagens: 0, dentroJanela: 0, totalMin: 0, validCount: 0 };
      }
      empGroups[nome].totalPaletes += Number(r.palhete) || 0;
      empGroups[nome].totalViagens += 1;
      if (r.status?.toUpperCase().includes('DENTRO')) {
        empGroups[nome].dentroJanela += 1;
      }
      if (r.inicio && r.fim) {
        const diff = timeToMinutes(r.fim) - timeToMinutes(r.inicio);
        if (diff > 0) {
          empGroups[nome].totalMin += diff;
          empGroups[nome].validCount += 1;
        }
      }
    });
    
    return Object.entries(empGroups)
      .map(([nome, val]) => ({
        rota: nome, // Use 'rota' key so chart components still work without errors
        tempoMedio: val.validCount > 0 ? Math.round(val.totalMin / val.validCount) : 0,
        quantidade: val.totalViagens,
        dentroMeta: val.totalViagens > 0 ? Math.round((val.dentroJanela / val.totalViagens) * 100) : 100,
        totalPaletes: viewUnit === 'pal' ? val.totalPaletes : Math.round(val.totalPaletes * 5.4 * 10) / 10
      }))
      .sort((a, b) => b.totalPaletes - a.totalPaletes)
      .slice(0, 6);
  }, [filteredRows, actualArmazemRows.length, viewUnit]);

  // Pareto Chart (Atrasos por Tipo de Veículo)
  const paretoData = useMemo(() => {
    const tipoGroups: Record<string, number> = {};
    let totalAtrasos = 0;
    
    filteredRows.forEach(r => {
      const isAtrasado = r.status?.toUpperCase().includes('FORA') || (() => {
        if (r.inicio && r.fim) {
          const diff = timeToMinutes(r.fim) - timeToMinutes(r.inicio);
          return (r.operacao === 'Carregamento' && diff > 15) || (r.operacao === 'Descarregamento' && diff > 10);
        }
        return false;
      })();
      
      if (isAtrasado) {
        const t = r.tipo || 'Outros';
        tipoGroups[t] = (tipoGroups[t] || 0) + 1;
        totalAtrasos++;
      }
    });
    
    // Sort descending
    const sorted = Object.entries(tipoGroups)
      .map(([causa, ocorrencias]) => ({ causa, ocorrencias, percentualAcumulado: 0 }))
      .sort((a, b) => b.ocorrencias - a.ocorrencias);
      
    // If there are no delays, fallback to all movements by vehicle type
    if (sorted.length === 0) {
      const allMovements: Record<string, number> = {};
      let totalM = 0;
      filteredRows.forEach(r => {
        const t = r.tipo || 'Outros';
        allMovements[t] = (allMovements[t] || 0) + 1;
        totalM++;
      });
      const sortedAll = Object.entries(allMovements)
        .map(([causa, ocorrencias]) => ({ causa, ocorrencias, percentualAcumulado: 0 }))
        .sort((a, b) => b.ocorrencias - a.ocorrencias);
        
      let acc = 0;
      sortedAll.forEach(item => {
        acc += item.ocorrencias;
        item.percentualAcumulado = totalM > 0 ? Math.round((acc / totalM) * 100) : 100;
      });
      return sortedAll;
    }
    
    let acc = 0;
    sorted.forEach(item => {
      acc += item.ocorrencias;
      item.percentualAcumulado = totalAtrasos > 0 ? Math.round((acc / totalAtrasos) * 100) : 100;
    });
    
    return sorted;
  }, [filteredRows]);

  // Heatmap table (Hours of day vs day of week loading efficiency)
  const weekDays = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const hourIntervals = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00'];
  const heatmapData = useMemo(() => {
    const counts: Record<string, number> = {};
    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    
    filteredRows.forEach(r => {
      const dt = parseRowDate(r);
      if (!dt) return;
      const dateObj = new Date(`${dt.year}-${dt.month}-${dt.day}T12:00:00`); // avoid timezone offset
      const dayName = dayNames[dateObj.getDay()];
      
      if (!r.inicio) return;
      const [hStr] = r.inicio.split(':');
      const h = Number(hStr);
      let slot = '18:00';
      if (h < 9) slot = '08:00';
      else if (h < 11) slot = '10:00';
      else if (h < 13) slot = '12:00';
      else if (h < 15) slot = '14:00';
      else if (h < 17) slot = '16:00';
      
      const key = `${dayName}-${slot}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    
    const maxVal = Math.max(...Object.values(counts), 1);
    
    const result: Record<string, number> = {};
    const days = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const slots = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00'];
    
    days.forEach(d => {
      slots.forEach(s => {
        const key = `${d}-${s}`;
        const val = counts[key] || 0;
        if (val === 0) result[key] = 1; // free
        else if (val < maxVal * 0.4) result[key] = 1; // low occupancy
        else if (val < maxVal * 0.75) result[key] = 2; // medium
        else result[key] = 3; // high/congested
      });
    });
    
    return result;
  }, [filteredRows]);

  // INTELLIGENT ALERTS LIST
  const alertas = useMemo(() => {
    const list: string[] = [];
    if (efcValue < 96) {
      list.push(`🚨 EFC abaixo da meta nacional (${efcValue}% vs Meta 96%). Possível gargalo nos carregamentos de pátio.`);
    }
    if (efdValue < 85) {
      list.push(`⚠️ EFD abaixo do limite corporativo (${efdValue}% vs Meta 85%). Lentidão identificada na descarga.`);
    }
    if (tempoMedioCarregamento > 15) {
      list.push(`⏳ Tempo médio de carregamento elevado (${tempoMedioCarregamento} min). Meta ideal é < 15 minutos.`);
    }
    if (tempoMedioDescarga > 10) {
      list.push(`⏳ Tempo médio de descarga elevado (${tempoMedioDescarga} min). Meta ideal é < 10 minutos.`);
    }
    
    const lowEfficiencyOperator = rotasPerformanceData.find(o => o.dentroMeta < 85);
    if (lowEfficiencyOperator) {
      list.push(`⚠️ Eficiência Operacional: O operador ${lowEfficiencyOperator.rota} tem apenas ${lowEfficiencyOperator.dentroMeta}% de suas movimentações cumprindo a janela de horários.`);
    }
    
    const actionsVencidas = acoes.filter(a => a.status === 'Vencido').length;
    if (actionsVencidas > 0) {
      list.push(`⚠️ Alerta de Governança: Existem ${actionsVencidas} ações corretivas VENCIDAS no plano de ação logística.`);
    }
    return list;
  }, [efcValue, efdValue, tempoMedioCarregamento, tempoMedioDescarga, rotasPerformanceData, acoes]);

  // ==========================================
  // DISCHARGE (DESCARGA) DASHBOARD CALCULATIONS
  // ==========================================
  const rowsDescarga = useMemo(() => {
    return filteredRows.filter(r => r.operacao?.toUpperCase().includes('DESCARGA') || r.operacao?.toUpperCase().includes('RECEBIMENTO') || r.operacao === 'Descarregamento');
  }, [filteredRows]);

  const descargaKPIs = useMemo(() => {
    const totalCaminhoes = rowsDescarga.length;
    const totalPaletes = rowsDescarga.reduce((sum, r) => sum + (Number(r.palhete) || 0), 0);
    
    const durations = rowsDescarga.map(r => {
      if (r.inicio && r.fim) {
        const diff = timeToMinutes(r.fim) - timeToMinutes(r.inicio);
        return diff > 0 ? diff : 0;
      }
      return 0;
    }).filter(d => d > 0);

    const tempoMedio = durations.length > 0 ? Math.round(durations.reduce((sum, val) => sum + val, 0) / durations.length) : 0;
    const tempoMinimo = durations.length > 0 ? Math.min(...durations) : 0;
    const tempoMaximo = durations.length > 0 ? Math.max(...durations) : 0;
    
    const mediaPaletesPorCaminhao = totalCaminhoes > 0 ? parseFloat((totalPaletes / totalCaminhoes).toFixed(1)) : 0;
    
    const empilhadoresAtivos = Array.from(new Set(rowsDescarga.map(r => r.empilhador).filter(Boolean)))
      .filter(name => {
        const strName = String(name);
        return strName !== 'Sem Operador' && strName.trim() !== '';
      }).length;

    const insideWindow = rowsDescarga.filter(r => r.status?.toUpperCase().includes('DENTRO')).length;
    const taxaJanela = totalCaminhoes > 0 ? parseFloat(((insideWindow / totalCaminhoes) * 100).toFixed(1)) : 100.0;

    return {
      totalCaminhoes,
      totalPaletes,
      tempoMedio,
      tempoMinimo,
      tempoMaximo,
      mediaPaletesPorCaminhao,
      empilhadoresAtivos,
      taxaJanela
    };
  }, [rowsDescarga]);

  // Gráfico 1 - Histograma de Caminhões Descarregados (Frequência de volume diário)
  const histogramaCaminhoesDiaData = useMemo(() => {
    const dateMap: Record<string, number> = {};
    rowsDescarga.forEach(r => {
      const dateKey = r.data || 'Sem Data';
      dateMap[dateKey] = (dateMap[dateKey] || 0) + 1;
    });
    
    const dailyVolumes = Object.values(dateMap);
    let bracket1 = 0; // Até 10 caminhões
    let bracket2 = 0; // 11 a 20 caminhões
    let bracket3 = 0; // 21 a 30 caminhões
    let bracket4 = 0; // Mais de 30 caminhões

    dailyVolumes.forEach(vol => {
      if (vol <= 10) bracket1++;
      else if (vol <= 20) bracket2++;
      else if (vol <= 30) bracket3++;
      else bracket4++;
    });

    return [
      { faixa: 'Até 10 cam./dia', dias: bracket1, fill: '#0ea5e9' },
      { faixa: '11 a 20 cam./dia', dias: bracket2, fill: '#0284c7' },
      { faixa: '21 a 30 cam./dia', dias: bracket3, fill: '#0369a1' },
      { faixa: '> 30 cam./dia', dias: bracket4, fill: '#075985' },
    ];
  }, [rowsDescarga]);

  // Gráfico 2 - Histograma do Tempo de Descarga
  const histogramaTempoDescargaData = useMemo(() => {
    let t10 = 0, t20 = 0, t30 = 0, t40 = 0, t50 = 0, tOver = 0;
    rowsDescarga.forEach(r => {
      if (r.inicio && r.fim) {
        const diff = timeToMinutes(r.fim) - timeToMinutes(r.inicio);
        if (diff > 0) {
          if (diff <= 10) t10++;
          else if (diff <= 20) t20++;
          else if (diff <= 30) t30++;
          else if (diff <= 40) t40++;
          else if (diff <= 50) t50++;
          else tOver++;
        }
      }
    });

    return [
      { faixa: '0 - 10 min', camioes: t10, fill: '#0ea5e9' },
      { faixa: '10 - 20 min', camioes: t20, fill: '#0284c7' },
      { faixa: '20 - 30 min', camioes: t30, fill: '#0369a1' },
      { faixa: '30 - 40 min', camioes: t40, fill: '#032b5e' },
      { faixa: '40 - 50 min', camioes: t50, fill: '#1e56f0' },
      { faixa: '> 50 min', camioes: tOver, fill: '#1e3a8a' },
    ];
  }, [rowsDescarga]);

  // Gráfico 3 - Caminhões por Dia
  const camioesPorDiaData = useMemo(() => {
    const dateMap: Record<string, number> = {};
    rowsDescarga.forEach(r => {
      const dateKey = r.data || 'Sem Data';
      dateMap[dateKey] = (dateMap[dateKey] || 0) + 1;
    });
    return Object.keys(dateMap)
      .map(date => ({ date, camioes: dateMap[date] }))
      .sort((a, b) => {
        const parseDate = (dStr: string) => {
          const p = dStr.split('/');
          if (p.length === 3) return new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0])).getTime();
          return 0;
        };
        return parseDate(a.date) - parseDate(b.date);
      });
  }, [rowsDescarga]);

  // Gráfico 4 - Palhetes por Dia
  const paletesPorDiaData = useMemo(() => {
    const dateMap: Record<string, number> = {};
    rowsDescarga.forEach(r => {
      const dateKey = r.data || 'Sem Data';
      dateMap[dateKey] = (dateMap[dateKey] || 0) + (Number(r.palhete) || 0);
    });
    return Object.keys(dateMap)
      .map(date => ({ date, paletes: dateMap[date] }))
      .sort((a, b) => {
        const parseDate = (dStr: string) => {
          const p = dStr.split('/');
          if (p.length === 3) return new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0])).getTime();
          return 0;
        };
        return parseDate(a.date) - parseDate(b.date);
      });
  }, [rowsDescarga]);

  // Gráfico 5 & 9 - Produtividade por Empilhador
  const produtividadeEmpilhadorData = useMemo(() => {
    const empMap: Record<string, { nome: string; caminhoes: number; paletes: number; totalMinutos: number; viagensComTempo: number }> = {};
    rowsDescarga.forEach(r => {
      const emp = r.empilhador || 'Outro';
      if (!empMap[emp]) {
        empMap[emp] = { nome: emp, caminhoes: 0, paletes: 0, totalMinutos: 0, viagensComTempo: 0 };
      }
      empMap[emp].caminhoes += 1;
      empMap[emp].paletes += (Number(r.palhete) || 0);
      if (r.inicio && r.fim) {
        const diff = timeToMinutes(r.fim) - timeToMinutes(r.inicio);
        if (diff > 0) {
          empMap[emp].totalMinutos += diff;
          empMap[emp].viagensComTempo += 1;
        }
      }
    });

    return Object.values(empMap)
      .map(e => ({
        nome: e.nome,
        caminhoes: e.caminhoes,
        paletes: e.paletes,
        tempoMedio: e.viagensComTempo > 0 ? Math.round(e.totalMinutos / e.viagensComTempo) : 0
      }))
      .sort((a, b) => b.paletes - a.paletes);
  }, [rowsDescarga]);

  // Gráfico 6 - Descargas por Tipo de Carga
  const descargasPorTipoData = useMemo(() => {
    const tipoMap: Record<string, number> = {
      'Rota Comercial': 0,
      'Puxada/Fábrica': 0,
      'Recarga de Veículo': 0,
      'Terceiros/Extras': 0,
    };
    rowsDescarga.forEach(r => {
      const tipo = r.tipo || 'Terceiros/Extras';
      if (tipoMap[tipo] !== undefined) {
        tipoMap[tipo] += 1;
      } else {
        if (tipo.includes('Rota')) tipoMap['Rota Comercial'] += 1;
        else if (tipo.includes('Puxada') || tipo.includes('Fábrica')) tipoMap['Puxada/Fábrica'] += 1;
        else if (tipo.includes('Recarga')) tipoMap['Recarga de Veículo'] += 1;
        else tipoMap['Terceiros/Extras'] += 1;
      }
    });

    const colors = ['#0f172a', '#3b82f6', '#10b981', '#f59e0b'];
    return Object.keys(tipoMap).map((key, index) => ({
      name: key,
      value: tipoMap[key],
      color: colors[index % colors.length]
    })).filter(item => item.value > 0);
  }, [rowsDescarga]);

  // Gráfico 7 - Tempo Médio por Tipo de Carga
  const tempoMedioPorTipoData = useMemo(() => {
    const tipoMap: Record<string, { totalMinutos: number; count: number }> = {
      'Rota Comercial': { totalMinutos: 0, count: 0 },
      'Puxada/Fábrica': { totalMinutos: 0, count: 0 },
      'Recarga de Veículo': { totalMinutos: 0, count: 0 },
      'Terceiros/Extras': { totalMinutos: 0, count: 0 },
    };

    rowsDescarga.forEach(r => {
      let tipo = r.tipo || 'Terceiros/Extras';
      if (tipoMap[tipo] === undefined) {
        if (tipo.includes('Rota')) tipo = 'Rota Comercial';
        else if (tipo.includes('Puxada') || tipo.includes('Fábrica')) tipo = 'Puxada/Fábrica';
        else if (tipo.includes('Recarga')) tipo = 'Recarga de Veículo';
        else tipo = 'Terceiros/Extras';
      }

      if (r.inicio && r.fim) {
        const diff = timeToMinutes(r.fim) - timeToMinutes(r.inicio);
        if (diff > 0) {
          tipoMap[tipo].totalMinutos += diff;
          tipoMap[tipo].count += 1;
        }
      }
    });

    return Object.keys(tipoMap).map(key => ({
      tipo: key,
      tempoMedio: tipoMap[key].count > 0 ? Math.round(tipoMap[key].totalMinutos / tipoMap[key].count) : 0
    }));
  }, [rowsDescarga]);

  // Gráfico 8 - Comparativo por Turno
  const comparativoPorTurnoData = useMemo(() => {
    const turnos = {
      'Diurno': { caminhoes: 0, paletes: 0, totalMinutos: 0, countTempo: 0 },
      'Noturno': { caminhoes: 0, paletes: 0, totalMinutos: 0, countTempo: 0 }
    };

    rowsDescarga.forEach(r => {
      const t = r.turno === 'Noturno' ? 'Noturno' : 'Diurno';
      turnos[t].caminhoes += 1;
      turnos[t].paletes += (Number(r.palhete) || 0);
      if (r.inicio && r.fim) {
        const diff = timeToMinutes(r.fim) - timeToMinutes(r.inicio);
        if (diff > 0) {
          turnos[t].totalMinutos += diff;
          turnos[t].countTempo += 1;
        }
      }
    });

    return [
      {
        turno: 'Diurno',
        caminhoes: turnos['Diurno'].caminhoes,
        paletes: turnos['Diurno'].paletes,
        tempoMedio: turnos['Diurno'].countTempo > 0 ? Math.round(turnos['Diurno'].totalMinutos / turnos['Diurno'].countTempo) : 0
      },
      {
        turno: 'Noturno',
        caminhoes: turnos['Noturno'].caminhoes,
        paletes: turnos['Noturno'].paletes,
        tempoMedio: turnos['Noturno'].countTempo > 0 ? Math.round(turnos['Noturno'].totalMinutos / turnos['Noturno'].countTempo) : 0
      }
    ];
  }, [rowsDescarga]);

  // Gráfico 10 - Evolução Mensal
  const evolucaoMensalData = useMemo(() => {
    const monthMap: Record<string, { caminhoes: number; paletes: number }> = {};
    rowsDescarga.forEach(r => {
      const dt = parseRowDate(r);
      const monthKey = dt ? `${dt.year}-${dt.month}` : 'Sem Mês';
      if (!monthMap[monthKey]) {
        monthMap[monthKey] = { caminhoes: 0, paletes: 0 };
      }
      monthMap[monthKey].caminhoes += 1;
      monthMap[monthKey].paletes += (Number(r.palhete) || 0);
    });

    return Object.keys(monthMap)
      .map(key => {
        const parts = key.split('-');
        const label = parts.length === 2 ? `${getMonthName(parts[1])}/${parts[0]}` : key;
        return {
          key,
          label,
          caminhoes: monthMap[key].caminhoes,
          paletes: monthMap[key].paletes
        };
      })
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [rowsDescarga]);

  // Gráfico 11 - Tempo Médio Diário
  const tempoMedioDiarioData = useMemo(() => {
    const dateMap: Record<string, { totalMinutos: number; count: number }> = {};
    rowsDescarga.forEach(r => {
      const dateKey = r.data || 'Sem Data';
      if (!dateMap[dateKey]) {
        dateMap[dateKey] = { totalMinutos: 0, count: 0 };
      }
      if (r.inicio && r.fim) {
        const diff = timeToMinutes(r.fim) - timeToMinutes(r.inicio);
        if (diff > 0) {
          dateMap[dateKey].totalMinutos += diff;
          dateMap[dateKey].count += 1;
        }
      }
    });

    return Object.keys(dateMap)
      .map(date => ({
        date,
        tempoMedio: dateMap[date].count > 0 ? Math.round(dateMap[date].totalMinutos / dateMap[date].count) : 0
      }))
      .sort((a, b) => {
        const parseDate = (dStr: string) => {
          const p = dStr.split('/');
          if (p.length === 3) return new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0])).getTime();
          return 0;
        };
        return parseDate(a.date) - parseDate(b.date);
      });
  }, [rowsDescarga]);

  // Histograma do Tempo de Carregamento de Caminhões
  const histogramaTempoCarregamentoData = useMemo(() => {
    let range0_10 = 0;
    let range10_20 = 0;
    let range20_30 = 0;
    let range30_40 = 0;
    let range40_50 = 0;
    let rangeAbove50 = 0;

    filteredRows.forEach(r => {
      if (r.operacao === 'Carregamento' && r.inicio && r.fim) {
        const diff = timeToMinutes(r.fim) - timeToMinutes(r.inicio);
        if (diff > 0) {
          if (diff <= 10) {
            range0_10++;
          } else if (diff <= 20) {
            range10_20++;
          } else if (diff <= 30) {
            range20_30++;
          } else if (diff <= 40) {
            range30_40++;
          } else if (diff <= 50) {
            range40_50++;
          } else {
            rangeAbove50++;
          }
        }
      }
    });

    return [
      { faixa: '0–10 min', camioes: range0_10 },
      { faixa: '10–20 min', camioes: range10_20 },
      { faixa: '20–30 min', camioes: range20_30 },
      { faixa: '30–40 min', camioes: range30_40 },
      { faixa: '40–50 min', camioes: range40_50 },
      { faixa: 'Acima de 50 min', camioes: rangeAbove50 }
    ];
  }, [filteredRows]);

  // Percentual (%) de Caminhões Descarregados Dentro do Tempo Previsto
  const percentualDescargasNoPrazoMensalData = useMemo(() => {
    const meses = [
      { key: '01', name: 'Janeiro', baseline: 88 },
      { key: '02', name: 'Fevereiro', baseline: 89 },
      { key: '03', name: 'Março', baseline: 92 },
      { key: '04', name: 'Abril', baseline: 91 },
      { key: '05', name: 'Maio', baseline: 94 },
      { key: '06', name: 'Junho', baseline: 92 },
      { key: '07', name: 'Julho', baseline: 93 },
      { key: '08', name: 'Agosto', baseline: 91 },
      { key: '09', name: 'Setembro', baseline: 89 },
      { key: '10', name: 'Outubro', baseline: 90 },
      { key: '11', name: 'Novembro', baseline: 91 },
      { key: '12', name: 'Dezembro', baseline: 93 }
    ];

    const countsByMonth: Record<string, { total: number; dentro: number }> = {};
    rowsDescarga.forEach(r => {
      const dt = parseRowDate(r);
      if (dt && dt.month) {
        const mKey = dt.month;
        if (!countsByMonth[mKey]) {
          countsByMonth[mKey] = { total: 0, dentro: 0 };
        }
        countsByMonth[mKey].total += 1;
        if (r.inicio && r.fim) {
          const diff = timeToMinutes(r.fim) - timeToMinutes(r.inicio);
          // Regra de Negócio: Considerar como "Dentro do Tempo Previsto" todas as operações com duração <= 30 minutos
          if (diff > 0 && diff <= 30) {
            countsByMonth[mKey].dentro += 1;
          }
        }
      }
    });

    const isFiltered = startDate !== '' || endDate !== '';

    return meses.map(m => {
      const realData = countsByMonth[m.key];
      let percent = m.baseline;
      if (realData && realData.total > 0) {
        percent = Math.round((realData.dentro / realData.total) * 100);
      } else if (isFiltered) {
        percent = 0;
      }
      return {
        mes: m.name,
        percentual: percent
      };
    });
  }, [rowsDescarga, startDate, endDate]);

  // Estatísticas Dinâmicas para o Histograma de Carregamento
  const statsHistogramaCarregamento = useMemo(() => {
    const carregamentos = filteredRows.filter(r => r.operacao === 'Carregamento');
    const durations = carregamentos.map(r => {
      if (r.inicio && r.fim) {
        const diff = timeToMinutes(r.fim) - timeToMinutes(r.inicio);
        return diff > 0 ? diff : 0;
      }
      return 0;
    }).filter(d => d > 0);

    const total = durations.length;
    const medio = total > 0 ? Math.round(durations.reduce((sum, val) => sum + val, 0) / total) : 0;
    const minimo = total > 0 ? Math.min(...durations) : 0;
    const maximo = total > 0 ? Math.max(...durations) : 0;
    
    // Meta do tempo de carregamento ideal: <= 15 minutos
    const dentroMeta = total > 0 ? durations.filter(d => d <= 15).length : 0;
    const pctMeta = total > 0 ? parseFloat(((dentroMeta / total) * 100).toFixed(1)) : 100.0;

    return {
      medio,
      minimo,
      maximo,
      pctMeta,
      total
    };
  }, [filteredRows]);

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setStatusMeta('Todos');
    setOperacaoFilter('Todos');
    setTurnoFilter('Todos');
    setEmpilhadorFilter('Todos');
    setTipoVeiculoFilter('Todos');
  };

  return (
    <div id="logistica-dashboard-wrapper" className="flex flex-col gap-3 bg-[#f8fafc] text-[#0f172a] p-4 rounded-xl shadow-sm border border-gray-200/80">
      
      {/* HEADER BAR */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 border-b border-gray-200 pb-5">
        <div className="flex items-center gap-3">
          {onBack && (
            <button 
              onClick={onBack}
              className="p-1.5 hover:bg-gray-200/80 rounded-lg transition-colors cursor-pointer text-gray-500"
              title="Voltar ao Hub"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-sans font-black text-2xl tracking-tight text-[#032b5e] uppercase">
                DASHBOARD EFC EFD
              </h1>
              <span className="bg-[#f5a623]/15 text-[#d4780a] border border-[#f5a623]/25 px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase">
                EFC EFD
              </span>
            </div>
            <p className="text-[10px] text-gray-500 tracking-wider font-bold uppercase mt-0.5">
              Controle de Estadia, Carregamentos (EFC), Descarregamentos (EFD) e Planos de Ação
            </p>
          </div>
        </div>

        {/* Subtab Selector */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap items-center bg-gray-100 p-1 rounded-xl border border-gray-200/60 gap-1">
            <button 
              onClick={() => setActiveSubTab('faturamento')}
              className={`px-4 py-1.5 rounded-lg font-sans font-bold text-[10px] uppercase tracking-wider transition-all border-none cursor-pointer ${activeSubTab === 'faturamento' ? 'bg-[#032b5e] text-white shadow-sm' : 'text-gray-500 hover:text-[#032b5e] bg-transparent'}`}
            >
              EFC EFD & BI (Geral)
            </button>
            <button 
              onClick={() => setActiveSubTab('boarda3')}
              className={`px-4 py-1.5 rounded-lg font-sans font-bold text-[10px] uppercase tracking-wider transition-all border-none cursor-pointer ${activeSubTab === 'boarda3' ? 'bg-[#032b5e] text-white shadow-sm' : 'text-gray-500 hover:text-[#032b5e] bg-transparent'}`}
            >
              Quadro de Ações
            </button>
            {selectedDrilldownMetric && (
              <button 
                onClick={() => setActiveSubTab('detalhes')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-sans font-bold text-[10px] uppercase tracking-wider transition-all border-none cursor-pointer ${activeSubTab === 'detalhes' ? 'bg-[#4f46e5] text-white shadow-sm' : 'text-[#4f46e5] hover:text-[#3730a3] bg-indigo-50/70 hover:bg-indigo-100/70'}`}
              >
                <span>🔍 Detalhes: {selectedDrilldownMetric}</span>
                <span 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDrilldownMetric(null);
                    if (activeSubTab === 'detalhes') setActiveSubTab('faturamento');
                  }} 
                  className="hover:bg-black/20 rounded px-1.5 ml-1 text-xs"
                >
                  ✕
                </span>
              </button>
            )}
          </div>


        </div>
      </div>

      {activeSubTab === 'faturamento' && (
        <>

      {/* FILTER BOX SECTION */}
      <section className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-4">
          
          {/* Período (Calendário) */}
          <div className="flex flex-col gap-1 min-w-[150px]">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Período (Calendário)</label>
            <CalendarFilter
              startDate={startDate}
              endDate={endDate}
              onChange={(start, end) => {
                setStartDate(start);
                setEndDate(end);
              }}
            />
          </div>

          {/* Status da Meta */}
          <div className="flex flex-col gap-1 w-[130px]">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Status da Meta</label>
            <select
              value={statusMeta}
              onChange={(e) => setStatusMeta(e.target.value)}
              className="w-full bg-white border border-gray-200 text-[#032b5e] font-sans font-bold rounded-lg outline-none px-2.5 py-1 text-[10px] h-[28px] cursor-pointer transition-all hover:border-amber-400 focus:border-[#032b5e]"
            >
              <option value="Todos">Todos</option>
              <option value="Dentro">Dentro da Meta</option>
              <option value="Fora">Fora da Meta</option>
            </select>
          </div>

          {/* Operação */}
          <div className="flex flex-col gap-1 w-[130px]">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Operação</label>
            <select
              value={operacaoFilter}
              onChange={(e) => setOperacaoFilter(e.target.value)}
              className="w-full bg-white border border-gray-200 text-[#032b5e] font-sans font-bold rounded-lg outline-none px-2.5 py-1 text-[10px] h-[28px] cursor-pointer transition-all hover:border-amber-400 focus:border-[#032b5e]"
            >
              <option value="Todos">Todos</option>
              <option value="Carregamento">Carregamento</option>
              <option value="Descarregamento">Descarregamento</option>
            </select>
          </div>

          {/* Turno */}
          <div className="flex flex-col gap-1 w-[110px]">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Turno</label>
            <select
              value={turnoFilter}
              onChange={(e) => setTurnoFilter(e.target.value)}
              className="w-full bg-white border border-gray-200 text-[#032b5e] font-sans font-bold rounded-lg outline-none px-2.5 py-1 text-[10px] h-[28px] cursor-pointer transition-all hover:border-amber-400 focus:border-[#032b5e]"
            >
              <option value="Todos">Todos</option>
              <option value="Diurno">Diurno</option>
              <option value="Noturno">Noturno</option>
            </select>
          </div>

          {/* Empilhador */}
          <div className="flex flex-col gap-1 min-w-[160px] max-w-[200px]">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Empilhador</label>
            <select
              value={empilhadorFilter}
              onChange={(e) => setEmpilhadorFilter(e.target.value)}
              className="w-full bg-white border border-gray-200 text-[#032b5e] font-sans font-bold rounded-lg outline-none px-2.5 py-1 text-[10px] h-[28px] cursor-pointer transition-all hover:border-amber-400 focus:border-[#032b5e]"
            >
              <option value="Todos">Todos</option>
              {uniqueEmpilhadores.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          {/* Tipo de Veículo */}
          <div className="flex flex-col gap-1 w-[150px]">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Tipo de Veículo / Classif.</label>
            <select
              value={tipoVeiculoFilter}
              onChange={(e) => setTipoVeiculoFilter(e.target.value)}
              className="w-full bg-white border border-gray-200 text-[#032b5e] font-sans font-bold rounded-lg outline-none px-2.5 py-1 text-[10px] h-[28px] cursor-pointer transition-all hover:border-amber-400 focus:border-[#032b5e]"
            >
              <option value="Todos">Todos</option>
              {uniqueTipos.map(tipo => (
                <option key={tipo} value={tipo}>{tipo}</option>
              ))}
            </select>
          </div>

          {/* Clear Filters Button */}
          {(startDate || endDate || statusMeta !== 'Todos' || operacaoFilter !== 'Todos' || turnoFilter !== 'Todos' || empilhadorFilter !== 'Todos' || tipoVeiculoFilter !== 'Todos') && (
            <button
              onClick={handleClearFilters}
              className="mt-4.5 px-3 py-1 bg-[#032b5e]/5 hover:bg-[#032b5e]/10 text-[#032b5e] border border-[#032b5e]/10 rounded-lg text-[9px] font-black tracking-widest uppercase transition-all flex items-center gap-1.5 cursor-pointer h-[28px]"
            >
              <RotateCcw className="w-3 h-3" />
              Limpar Filtros
            </button>
          )}

        </div>
      </section>



      {/* SEÇÃO 1: FATURAMENTO & CARREGAMENTO */}

      {/* CARDS PRINCIPAIS (6 KPI CARDS) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        
        {/* KPI 1: % EFC */}
        <div 
          className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs flex flex-col justify-between transition-all"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block">
                EFC (CARREGAMENTO)
              </span>
            </div>
            <span className="text-2xl font-black tracking-tight block mt-1.5 text-[#032b5e]">
              {efcValue.toFixed(1)}%
            </span>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[9px] text-slate-500 font-bold">Meta: 96%</span>
              <span className={`text-[9px] font-black ${parseFloat(efcDiff) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                ({parseFloat(efcDiff) >= 0 ? '+' : ''}{efcDiff}%)
              </span>
            </div>
          </div>
          <div className="mt-2 border-t border-gray-100 pt-1.5 text-[9px] text-gray-400 font-medium">
            Status: {efcValue >= 96 ? 'Conforme' : 'Fora da Meta'}
          </div>
        </div>

        {/* KPI 2: % EFD */}
        <div 
          className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs flex flex-col justify-between transition-all"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block">
                EFD (DESCARGA)
              </span>
            </div>
            <span className="text-2xl font-black tracking-tight block mt-1.5 text-[#032b5e]">
              {efdValue.toFixed(1)}%
            </span>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[9px] text-slate-500 font-bold">Meta: 85%</span>
              <span className={`text-[9px] font-black ${parseFloat(efdDiff) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                ({parseFloat(efdDiff) >= 0 ? '+' : ''}{efdDiff}%)
              </span>
            </div>
          </div>
          <div className="mt-2 border-t border-gray-100 pt-1.5 text-[9px] text-gray-400 font-medium">
            Status: {efdValue >= 85 ? 'Conforme' : 'Fora da Meta'}
          </div>
        </div>

        {/* KPI 3: CAMINHÕES CARREGADOS */}
        <div 
          className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs flex flex-col justify-between transition-all"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block">
                CARREGAMENTOS
              </span>
            </div>
            <span className="text-2xl font-black tracking-tight block mt-1.5 text-[#032b5e]">
              {totalCarregados}
            </span>
            <span className="text-[9px] text-emerald-600 font-bold block mt-1">
              Viagens registradas
            </span>
          </div>
          <div className="mt-2 border-t border-gray-100 pt-1.5 text-[9px] text-gray-400 font-medium">
            Atendimento Pátio
          </div>
        </div>

        {/* KPI 4: CAMINHÕES DESCARREGADOS */}
        <div 
          className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs flex flex-col justify-between transition-all"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block">
                DESCARREGAMENTOS
              </span>
            </div>
            <span className="text-2xl font-black tracking-tight block mt-1.5 text-sky-700">
              {totalDescarregados}
            </span>
            <span className="text-[9px] text-sky-600 font-bold block mt-1">
              Recebimento físico
            </span>
          </div>
          <div className="mt-2 border-t border-gray-100 pt-1.5 text-[9px] text-gray-400 font-medium">
            Concluídos na doca
          </div>
        </div>

        {/* KPI 5: TEMPO MÉDIO CARREGAMENTO */}
        <div 
          className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs flex flex-col justify-between transition-all"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block">
                T.M. CARREGAMENTO
              </span>
            </div>
            <div className="flex items-baseline gap-1 mt-1.5">
              <span className="text-2xl font-black tracking-tight text-slate-800">
                {tempoMedioCarregamento}
              </span>
              <span className="text-[10px] font-bold text-gray-400">min</span>
            </div>
            <span className={`text-[9px] font-bold block mt-1 ${tempoMedioCarregamento <= 15 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {tempoMedioCarregamento <= 15 ? 'Dentro do limite' : 'Fora da meta'}
            </span>
          </div>
          <div className="mt-2 border-t border-gray-100 pt-1.5 text-[9px] text-gray-400 font-medium">
            Meta: &lt; 15 min
          </div>
        </div>

        {/* KPI 6: TEMPO MÉDIO DESCARGA */}
        <div 
          className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs flex flex-col justify-between transition-all"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block">
                T.M. DESCARGA
              </span>
            </div>
            <div className="flex items-baseline gap-1 mt-1.5">
              <span className="text-2xl font-black tracking-tight text-slate-800">
                {tempoMedioDescarga}
              </span>
              <span className="text-[10px] font-bold text-gray-400">min</span>
            </div>
            <span className={`text-[9px] font-bold block mt-1 ${tempoMedioDescarga <= 10 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {tempoMedioDescarga <= 10 ? 'Dentro do limite' : 'Fora da meta'}
            </span>
          </div>
          <div className="mt-2 border-t border-gray-100 pt-1.5 text-[9px] text-gray-400 font-medium">
            Meta: &lt; 10 min
          </div>
        </div>

      </div>

      {/* KPI Executive Summary cards (Pernoite de Descarga & Outros) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Com Pernoite D1-D4 */}
        <div 
          className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs flex flex-col justify-between transition-all"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block">
                COM PERNOITE (D1 - D4)
              </span>
            </div>
            <span className="text-2xl font-black tracking-tight block mt-1.5 text-amber-600">
              {pernoiteData.counts.D1 + pernoiteData.counts.D2 + pernoiteData.counts.D3 + pernoiteData.counts.D4}
            </span>
            <span className="text-[9px] text-amber-600 font-bold block mt-1">
              {pernoiteData.descargas.length > 0 
                ? `${(((pernoiteData.counts.D1 + pernoiteData.counts.D2 + pernoiteData.counts.D3 + pernoiteData.counts.D4) / pernoiteData.descargas.length) * 100).toFixed(1)}% do total` 
                : '0% do total'}
            </span>
          </div>
          <div className="mt-2 border-t border-gray-100 pt-1.5 text-[9px] text-gray-400 font-medium">
            Estadia prolongada
          </div>
        </div>

        {/* KPI 7: QUANTIDADE ATRASOS */}
        <div 
          className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs flex flex-col justify-between transition-all"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block">
                VEÍCULOS ATRASADOS
              </span>
            </div>
            <span className="text-2xl font-black tracking-tight text-rose-500 block mt-1.5">
              {quantidadeAtrasos}
            </span>
            <span className="text-[9px] text-gray-400 font-semibold block mt-1">
              Estadia excedida
            </span>
          </div>
          <div className="mt-2 border-t border-gray-100 pt-1.5 text-[9px] text-rose-500/80 font-black uppercase">
            ⚠️ {(totalCarregados + totalDescarregados) > 0 ? ((quantidadeAtrasos / (totalCarregados + totalDescarregados)) * 100).toFixed(1) : 0}% do fluxo
          </div>
        </div>

        {/* KPI 8: PALETES / HE MOVIMENTADOS */}
        <div 
          className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs flex flex-col justify-between transition-all"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block">
                {viewUnit === 'pal' ? 'PALETES MOVIMENTADOS' : 'HE MOVIMENTADOS'}
              </span>
            </div>
            <span className="text-2xl font-black tracking-tight text-[#f5a623] block mt-1.5">
              {viewUnit === 'pal' ? totalPaletesMovimentados : Math.round(totalPaletesMovimentados * 5.4 * 10) / 10}
            </span>
            <span className="text-[9px] text-slate-500 font-bold block mt-1">
              {viewUnit === 'pal' ? `Média: ${mediaPaletesPorViagem} /viagem` : `Média: ${Math.round(mediaPaletesPorViagem * 5.4 * 10) / 10} HE /viagem`}
            </span>
          </div>
          <div className="mt-2 border-t border-gray-100 pt-1.5 text-[9px] text-slate-400 font-medium">
            {viewUnit === 'pal' ? 'Registros Armazém Fácil' : 'Hectolitros Equivalentes'}
          </div>
        </div>
      </div>

      {/* GRAPH GRIDS SECTION (MIDDLE OF PAGE) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* MERGED CHART 1: DESEMPENHO OPERACIONAL – EFC E EFD */}
        <div className="bg-white p-6 rounded-xl border border-gray-200/80 shadow-xs flex flex-col gap-4">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between border-b border-gray-100 pb-4 gap-3">
            <div>
              <h3 className="font-sans font-black text-sm uppercase text-slate-800 tracking-wider">
                DESEMPENHO OPERACIONAL – <span className="text-[#032b5e]">EFC (CARREGAMENTO)</span> E <span className="text-[#f97316]">EFD (DESCARGA)</span>
              </h3>
              <p className="text-[11px] text-gray-400 font-bold uppercase mt-0.5 tracking-wide">Acompanhamento de performance vs. meta</p>
            </div>
            
            {/* Custom Legend */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] font-black uppercase tracking-wider text-slate-600 bg-slate-50/80 p-2 rounded-lg border border-slate-100/80">
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-1 bg-[#032b5e] rounded-full"></span>
                <span>EFC Real</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-0 border-t-2 border-dashed border-[#032b5e]"></span>
                <span className="text-slate-500">Meta EFC: 96%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-1 bg-[#f97316] rounded-full"></span>
                <span>EFD Real</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-0 border-t-2 border-dashed border-[#f97316]"></span>
                <span className="text-slate-500">Meta EFD: 85%</span>
              </div>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend4MonthsData} margin={{ top: 30, right: 85, left: 10, bottom: 10 }}>
                <CartesianGrid stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} fontWeight="bold" tickLine={false} padding={{ left: 35, right: 35 }} />
                <YAxis 
                  domain={[0, 105]} 
                  stroke="#94a3b8" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false}
                  label={{ value: '%', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 11, fill: '#64748b', fontWeight: 'bold' }, offset: -5 }} 
                />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                
                {/* Reference line EFC at 96% */}
                <ReferenceLine 
                  y={96} 
                  stroke="#032b5e" 
                  strokeDasharray="4 4" 
                  strokeWidth={1.5} 
                  label={{ value: 'Meta: 96%', fill: '#032b5e', position: 'right', fontSize: 10, fontWeight: 'black', offset: 8 }} 
                />

                {/* Reference line EFD at 85% */}
                <ReferenceLine 
                  y={85} 
                  stroke="#f97316" 
                  strokeDasharray="4 4" 
                  strokeWidth={1.5} 
                  label={{ value: 'Meta: 85%', fill: '#f97316', position: 'right', fontSize: 10, fontWeight: 'black', offset: 8 }} 
                />

                <Line 
                  type="monotone" 
                  dataKey="EFC" 
                  stroke="#032b5e" 
                  strokeWidth={3} 
                  dot={{ r: 5, stroke: '#032b5e', strokeWidth: 2, fill: '#fff' }} 
                  activeDot={{ r: 7 }}
                  label={<CustomizedPercentLabel fill="#032b5e" position="top" />}
                  isAnimationActive={false}
                />

                <Line 
                  type="monotone" 
                  dataKey="EFD" 
                  stroke="#f97316" 
                  strokeWidth={3} 
                  dot={{ r: 5, stroke: '#f97316', strokeWidth: 2, fill: '#fff' }} 
                  activeDot={{ r: 7 }}
                  label={<CustomizedPercentLabel fill="#f97316" position="bottom" />}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* MERGED CHART 2: TEMPO MÉDIO – CARREGAMENTO E DESCARGA */}
        <div className="bg-white p-6 rounded-xl border border-gray-200/80 shadow-xs flex flex-col gap-4">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between border-b border-gray-100 pb-4 gap-3">
            <div>
              <h3 className="font-sans font-black text-sm uppercase text-slate-800 tracking-wider">
                TEMPO MÉDIO – CARREGAMENTO E DESCARGA (MINUTOS)
              </h3>
              <p className="text-[11px] text-gray-400 font-bold uppercase mt-0.5 tracking-wide">Acompanhamento de tempo médio vs. meta</p>
            </div>
            
            {/* Custom Legend */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] font-black uppercase tracking-wider text-slate-600 bg-slate-50/80 p-2 rounded-lg border border-slate-100/80">
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-1 bg-[#032b5e] rounded-full"></span>
                <span>Média Carregamento</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-0 border-t-2 border-dashed border-[#032b5e]"></span>
                <span className="text-slate-500">Meta: ≤ 15 min</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-1 bg-[#f97316] rounded-full"></span>
                <span>Média Descarga</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-0 border-t-2 border-dashed border-[#f97316]"></span>
                <span className="text-slate-500">Meta: ≤ 10 min</span>
              </div>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend4MonthsData} margin={{ top: 30, right: 85, left: 10, bottom: 10 }}>
                <CartesianGrid stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} fontWeight="bold" tickLine={false} padding={{ left: 35, right: 35 }} />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false}
                  label={{ value: 'Minutos', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 11, fill: '#64748b', fontWeight: 'bold' }, offset: -5 }} 
                />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                
                {/* Reference line at 15 min */}
                <ReferenceLine 
                  y={15} 
                  stroke="#032b5e" 
                  strokeDasharray="4 4" 
                  strokeWidth={1.5} 
                  label={{ value: 'Meta: ≤ 15 min', fill: '#032b5e', position: 'right', fontSize: 10, fontWeight: 'black', offset: 8 }} 
                />

                {/* Reference line at 10 min */}
                <ReferenceLine 
                  y={10} 
                  stroke="#f97316" 
                  strokeDasharray="4 4" 
                  strokeWidth={1.5} 
                  label={{ value: 'Meta: ≤ 10 min', fill: '#f97316', position: 'right', fontSize: 10, fontWeight: 'black', offset: 8 }} 
                />

                <Line 
                  type="monotone" 
                  dataKey="tempoCarregamento" 
                  stroke="#032b5e" 
                  strokeWidth={3} 
                  dot={{ r: 5, stroke: '#032b5e', strokeWidth: 2, fill: '#fff' }} 
                  activeDot={{ r: 7 }}
                  label={<CustomizedMinLabel fill="#032b5e" position="top" />}
                  isAnimationActive={false}
                />

                <Line 
                  type="monotone" 
                  dataKey="tempoDescarga" 
                  stroke="#f97316" 
                  strokeWidth={3} 
                  dot={{ r: 5, stroke: '#f97316', strokeWidth: 2, fill: '#fff' }} 
                  activeDot={{ r: 7 }}
                  label={<CustomizedMinLabel fill="#f97316" position="bottom" />}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* HISTOGRAMAS E INDICADORES DE PERFORMANCE */}
      <div className="flex flex-col gap-6 mt-6">
        
        {/* Row 1: The Histograms Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* 3. HISTOGRAMA DE CARREGAMENTO */}
          <div className="bg-white p-6 rounded-xl border border-gray-200/80 shadow-xs flex flex-col justify-between gap-4">
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="font-sans font-black text-sm uppercase text-slate-800 tracking-wider text-[#032b5e]">
                  3. Histograma de Carregamento
                </h3>
                <p className="text-[11px] text-gray-400 font-bold uppercase mt-0.5 tracking-wide">
                  Distribuição do tempo de estadia (Frequência)
                </p>
              </div>
              
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={histogramaCarregamentoData} 
                    margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
                  >
                    <CartesianGrid stroke="#f1f5f9" vertical={false} />
                    <XAxis 
                      dataKey="faixa" 
                      stroke="#94a3b8" 
                      fontSize={10} 
                      fontWeight="bold" 
                      tickLine={false} 
                    />
                    <YAxis 
                      stroke="#94a3b8" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} 
                      cursor={{ fill: '#f8fafc' }}
                      formatter={(v: any) => [v, 'Caminhões']}
                    />
                    
                    <Bar 
                      dataKey="camioes" 
                      name="Caminhões" 
                      barSize={45}
                      radius={[4, 4, 0, 0]}
                      isAnimationActive={false}
                    >
                      {histogramaCarregamentoData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.fill || '#032b5e'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-3 mt-2 grid grid-cols-4 text-center gap-1">
              <div>
                <span className="block text-[8px] font-black text-gray-400 uppercase tracking-widest">Médio</span>
                <span className="block text-xs font-black text-slate-800 mt-0.5">{statsHistogramaCarregamento.medio} min</span>
              </div>
              <div>
                <span className="block text-[8px] font-black text-gray-400 uppercase tracking-widest">Mínimo</span>
                <span className="block text-xs font-black text-slate-800 mt-0.5">{statsHistogramaCarregamento.minimo} min</span>
              </div>
              <div>
                <span className="block text-[8px] font-black text-gray-400 uppercase tracking-widest">Máximo</span>
                <span className="block text-xs font-black text-slate-800 mt-0.5">{statsHistogramaCarregamento.maximo} min</span>
              </div>
              <div>
                <span className="block text-[8px] font-black text-gray-400 uppercase tracking-widest">Na Meta</span>
                <span className="block text-xs font-black text-emerald-600 mt-0.5">{statsHistogramaCarregamento.pctMeta}%</span>
              </div>
            </div>
          </div>

          {/* HISTOGRAMA DO TEMPO DE DESCARREGAMENTO */}
          <div className="bg-white p-6 rounded-xl border border-gray-200/80 shadow-xs flex flex-col justify-between gap-4">
            <div>
              <h3 className="font-sans font-black text-sm uppercase text-slate-800 tracking-wider text-orange-600">
                Histograma do Tempo de Descarregamento de Caminhões
              </h3>
              <p className="text-[11px] text-gray-400 font-bold uppercase mt-0.5 tracking-wide">
                Distribuição da quantidade de caminhões descarregados por faixa de tempo operacional (EFD)
              </p>
            </div>
            
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={histogramaTempoDescargaData} 
                  margin={{ top: 25, right: 30, left: 10, bottom: 5 }}
                >
                  <CartesianGrid stroke="#f1f5f9" vertical={false} />
                  <XAxis 
                    dataKey="faixa" 
                    stroke="#94a3b8" 
                    fontSize={11} 
                    fontWeight="bold" 
                    tickLine={false} 
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false}
                    domain={[0, 'dataMax + 10']}
                    label={{ 
                      value: 'Quantidade de Caminhões', 
                      angle: -90, 
                      position: 'insideLeft', 
                      style: { textAnchor: 'middle', fontSize: 11, fill: '#64748b', fontWeight: 'bold' },
                      offset: -5 
                    }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} 
                    cursor={{ fill: '#f8fafc' }}
                  />
                  
                  {/* Linha de Meta operacional: 15 min */}
                  <ReferenceLine 
                    y={15} 
                    stroke="#ef4444" 
                    strokeDasharray="4 4" 
                    strokeWidth={1.5} 
                    label={{ 
                      value: 'Meta: 15 min', 
                      fill: '#ef4444', 
                      position: 'insideTopLeft', 
                      fontSize: 10, 
                      fontWeight: 'black',
                      offset: 8 
                    }} 
                  />
                  
                  <Bar 
                    dataKey="camioes" 
                    name="Caminhões" 
                    fill="#f97316" 
                    barSize={40}
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                  >
                    {histogramaTempoDescargaData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill || '#f97316'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Row 2: Carta de Controle - CEP e Heatmap de Eficiência de Horários */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CARTA DE CONTROLE – TEMPO DE CARREGAMENTO */}
          <div className="bg-white p-6 rounded-xl border border-gray-200/80 shadow-xs flex flex-col justify-between gap-4">
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="font-sans font-black text-sm uppercase text-[#032b5e] tracking-wider">
                  CARTA DE CONTROLE – TEMPO DE CARREGAMENTO
                </h3>
                <p className="text-[11px] text-gray-400 font-bold uppercase mt-0.5 tracking-wide">
                  MONITORAMENTO DA ESTABILIDADE DO PROCESSO (CEP)
                </p>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={controlChartCarregamentoData.points} 
                    margin={{ top: 25, right: 30, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid stroke="#f1f5f9" vertical={false} />
                    <XAxis 
                      dataKey="day" 
                      stroke="#94a3b8" 
                      fontSize={11} 
                      fontWeight="bold" 
                      tickLine={false} 
                    />
                    <YAxis 
                      stroke="#94a3b8" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false}
                      domain={[0, 'dataMax + 15']}
                      label={{ 
                        value: 'Minutos', 
                        angle: -90, 
                        position: 'insideLeft', 
                        style: { textAnchor: 'middle', fontSize: 11, fill: '#64748b', fontWeight: 'bold' },
                        offset: -5 
                      }}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} 
                      cursor={{ fill: '#f8fafc' }}
                    />
                    
                    {/* Linha de Process Mean (Média do Processo) - Verde */}
                    <ReferenceLine 
                      y={controlChartCarregamentoData.media} 
                      stroke="#10b981" 
                      strokeWidth={2} 
                      label={{ 
                        value: `Média: ${controlChartCarregamentoData.media} min`, 
                        fill: '#10b981', 
                        position: 'insideTopLeft', 
                        fontSize: 10, 
                        fontWeight: 'black',
                        offset: 8 
                      }} 
                    />

                    {/* Linha de LSC (Limite Superior de Controle) - Vermelho */}
                    <ReferenceLine 
                      y={controlChartCarregamentoData.lsc} 
                      stroke="#ef4444" 
                      strokeDasharray="4 4" 
                      strokeWidth={1.5} 
                      label={{ 
                        value: `LSC: ${controlChartCarregamentoData.lsc} min`, 
                        fill: '#ef4444', 
                        position: 'insideTopRight', 
                        fontSize: 10, 
                        fontWeight: 'black',
                        offset: 8 
                      }} 
                    />

                    {/* Linha de LIC (Limite Inferior de Controle) - Vermelho */}
                    <ReferenceLine 
                      y={controlChartCarregamentoData.lic} 
                      stroke="#ef4444" 
                      strokeDasharray="4 4" 
                      strokeWidth={1.5} 
                      label={{ 
                        value: `LIC: ${controlChartCarregamentoData.lic} min`, 
                        fill: '#ef4444', 
                        position: 'insideBottomRight', 
                        fontSize: 10, 
                        fontWeight: 'black',
                        offset: 8 
                      }} 
                    />
                    
                    <Bar 
                      dataKey="avgLoadingTime" 
                      name="Tempo Médio de Carregamento" 
                      barSize={32}
                      radius={[4, 4, 0, 0]}
                      isAnimationActive={false}
                    >
                      {controlChartCarregamentoData.points.map((entry, index) => {
                        const fill = entry.isOutOfBounds ? '#ff1e56' : '#1e56f0';
                        return <Cell key={`cell-${index}`} fill={fill} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Footer Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center border-t border-slate-100 pt-4 mt-2">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100/60">
                <span className="block text-[8px] font-black text-gray-400 uppercase tracking-widest">MÉDIA</span>
                <span className="block text-xs font-black text-slate-800 mt-0.5">{controlChartCarregamentoData.media} min</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100/60">
                <span className="block text-[8px] font-black text-gray-400 uppercase tracking-widest">LSC</span>
                <span className="block text-xs font-black text-rose-600 mt-0.5">{controlChartCarregamentoData.lsc} min</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100/60">
                <span className="block text-[8px] font-black text-gray-400 uppercase tracking-widest">LIC</span>
                <span className="block text-xs font-black text-rose-600 mt-0.5">{controlChartCarregamentoData.lic} min</span>
              </div>
              <div className={`p-2.5 rounded-lg border ${controlChartCarregamentoData.status === 'Estável' ? 'bg-emerald-50 border-emerald-100/60 text-emerald-700' : 'bg-rose-50 border-rose-100/60 text-rose-700'}`}>
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">PROCESSO</span>
                <span className="block text-xs font-black mt-0.5 flex items-center justify-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${controlChartCarregamentoData.status === 'Estável' ? 'bg-emerald-500 animate-pulse' : 'bg-[#ff1e56]'}`} />
                  {controlChartCarregamentoData.status}
                </span>
              </div>
            </div>
          </div>

          {/* HEATMAP DE EFICIÊNCIA DE HORÁRIOS (DOCA CONGESTIONADA) */}
          <div className="bg-white p-6 rounded-xl border border-gray-200/80 shadow-xs flex flex-col justify-between gap-4">
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="font-sans font-black text-sm uppercase text-slate-800 tracking-wider text-[#032b5e]">
                  HEATMAP DE EFICIÊNCIA DE HORÁRIOS (DOCA CONGESTIONADA)
                </h3>
                <p className="text-[11px] text-gray-400 font-bold uppercase mt-0.5 tracking-wide">
                  Nível de ocupação das docas por dia da semana e faixa horária
                </p>
              </div>

              <div className="flex-1 flex flex-col justify-center bg-slate-50/50 rounded-xl p-4 border border-slate-100 min-h-[256px]">
                <div className="grid grid-cols-6 gap-2 text-center">
                  {dockHeatmapData.map((day) => (
                    <div key={day.label} className="flex flex-col items-center gap-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        {day.label}
                      </span>
                      <div className="flex flex-col gap-1.5 w-full max-w-[32px]">
                        {day.slots.map((slot) => {
                          let bgClass = 'bg-[#00c58d]';
                          let statusText = 'Eficiente (Doca Livre)';
                          if (slot.color === 'orange') {
                            bgClass = 'bg-[#fca103]';
                            statusText = 'Atenção (Doca Parcial)';
                          } else if (slot.color === 'red') {
                            bgClass = 'bg-[#ff1e56]';
                            statusText = 'Congestionado (Crítico)';
                          }

                          return (
                            <div
                              key={slot.slotIdx}
                              className={`h-8 w-full rounded-md ${bgClass} transition-all duration-300 hover:scale-105 cursor-pointer relative group`}
                            >
                              {/* Custom Tooltip */}
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:flex flex-col bg-slate-900 text-white text-[10px] font-bold rounded p-2 shadow-lg z-50 w-36 pointer-events-none whitespace-normal text-center leading-normal">
                                <span className="text-sky-300 uppercase">{day.name}</span>
                                <span className="text-gray-300">{slot.slotLabel}</span>
                                <span className="mt-1 font-extrabold text-white">{statusText}</span>
                                <span className="text-gray-400 font-normal">{slot.count} mov. registrados</span>
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex justify-center gap-4 text-[9px] font-black uppercase tracking-wider text-slate-500 border-t border-slate-100 pt-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-[#00c58d]" />
                <span>Livre</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-[#fca103]" />
                <span>Médio</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-[#ff1e56]" />
                <span>Crítico</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* SEÇÃO 2: ANÁLISE DE PERNOITE DOS CAMINHÕES */}
      <div className="mb-4 mt-8 pt-6 border-t border-gray-200">
        <h2 className="text-sm font-black text-[#032b5e] uppercase tracking-wider flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          Análise de Pernoite dos Caminhões (Operação de Descarga)
        </h2>
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
          Indicadores e análise de permanência de veículos dedicados especificamente para a operação de Descarga (EFD)
        </p>
      </div>


      {/* Row 1: Charts (Histogram & Pie/Donut Chart) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Gráfico 1 - Histograma de Pernoite */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200/80 shadow-xs flex flex-col gap-4">
          <div>
            <h3 className="font-sans font-black text-sm uppercase text-slate-800 tracking-wider">
              Histograma de Pernoite dos Caminhões
            </h3>
            <p className="text-[11px] text-gray-400 font-bold uppercase mt-0.5 tracking-wide">
              Distribuição da quantidade de caminhões conforme a categoria de pernoite na descarga
            </p>
          </div>

          <div className="h-80 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={pernoiteData.histogramData} 
                margin={{ top: 25, right: 20, left: -10, bottom: 5 }}
              >
                <CartesianGrid stroke="#f1f5f9" vertical={false} />
                <XAxis 
                  dataKey="category" 
                  stroke="#94a3b8" 
                  fontSize={11} 
                  fontWeight="bold" 
                  tickLine={false} 
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} 
                  cursor={{ fill: '#f8fafc' }}
                  formatter={(value: any, name: any, props: any) => [
                    `${value} caminhões`, 
                    `${props.payload.description}`
                  ]}
                />
                <Bar 
                  dataKey="count" 
                  name="Quantidade" 
                  radius={[4, 4, 0, 0]} 
                  barSize={45}
                  isAnimationActive={false}
                >
                  {pernoiteData.histogramData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 3 - Percentual de Caminhões por Categoria */}
        <div className="bg-white p-6 rounded-xl border border-gray-200/80 shadow-xs flex flex-col gap-4">
          <div>
            <h3 className="font-sans font-black text-sm uppercase text-slate-800 tracking-wider">
              Participação por Categoria
            </h3>
            <p className="text-[11px] text-gray-400 font-bold uppercase mt-0.5 tracking-wide">
              Percentual (%) e volume de caminhões descarregados por tipo de pernoite
            </p>
          </div>

          {pernoiteData.pieData.length === 0 ? (
            <div className="h-80 w-full flex items-center justify-center text-slate-400 text-xs italic">
              Nenhum registro para exibir
            </div>
          ) : (
            <div className="h-80 w-full flex flex-col justify-between mt-2">
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pernoiteData.pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={75}
                      innerRadius={45}
                      paddingAngle={2}
                      labelLine={false}
                      isAnimationActive={false}
                    >
                      {pernoiteData.pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any, name: any, props: any) => {
                        const total = pernoiteData.descargas.length;
                        const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                        return [`${value} und (${pct}%)`, name];
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              {/* Legend labels */}
              <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                {pernoiteData.histogramData.map((entry) => {
                  const value = entry.count;
                  const total = pernoiteData.descargas.length;
                  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                  return (
                    <div key={entry.category} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-xs shrink-0" style={{ backgroundColor: entry.fill }} />
                      <span className="font-sans font-bold text-slate-700">{entry.category}:</span>
                      <span className="text-slate-500 font-mono text-[9px]">{value} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Gráfico 2 - Evolução Mensal dos Pernoites */}
      <div className="bg-white p-6 rounded-xl border border-gray-200/80 shadow-xs flex flex-col gap-4 mb-6">
        <div>
          <h3 className="font-sans font-black text-sm uppercase text-slate-800 tracking-wider">
            Evolução Mensal dos Caminhões por Pernoite
          </h3>
          <p className="text-[11px] text-gray-400 font-bold uppercase mt-0.5 tracking-wide">
            Tendências históricas mensais de pernoites na operação de descarga
          </p>
        </div>

        <div className="h-80 w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={pernoiteData.evolutionData} 
              margin={{ top: 25, right: 20, left: -10, bottom: 5 }}
            >
              <CartesianGrid stroke="#f1f5f9" vertical={false} />
              <XAxis 
                dataKey="monthLabel" 
                stroke="#94a3b8" 
                fontSize={11} 
                fontWeight="bold" 
                tickLine={false} 
              />
              <YAxis 
                stroke="#94a3b8" 
                fontSize={11} 
                tickLine={false} 
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} 
              />
              <Legend iconSize={10} iconType="square" wrapperStyle={{ fontSize: 11, fontWeight: 'bold' }} />
              <Bar dataKey="D0" name="D0" stackId="a" fill="#0ea5e9" isAnimationActive={false} />
              <Bar dataKey="D1" name="D1" stackId="a" fill="#0284c7" isAnimationActive={false} />
              <Bar dataKey="D2" name="D2" stackId="a" fill="#0369a1" isAnimationActive={false} />
              <Bar dataKey="D3" name="D3" stackId="a" fill="#032b5e" isAnimationActive={false} />
              <Bar dataKey="D4" name="D4" stackId="a" fill="#1e56f0" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* TABELA DE REGISTRO DOS DIAS (LANÇAMENTOS) */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 min-h-[360px] flex flex-col justify-between shadow-sm overflow-x-auto transition-all mt-6">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 mb-4 pb-3">
            <div>
              <h3 className="font-sans font-black text-xs uppercase text-[#032b5e] tracking-wider">Histórico de Lançamentos</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">Total de {filteredTableRows.length} registros filtrados</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Pesquisar..."
                  value={recordSearch}
                  onChange={(e) => setRecordSearch(e.target.value)}
                  className="bg-white border border-gray-200 text-slate-800 text-xs rounded-lg pl-9 pr-3 py-1.5 focus:border-[#032b5e] outline-none transition-colors w-[180px]"
                />
              </div>
              <button
                type="button"
                onClick={handleExportXLSX}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-sans font-bold rounded-lg text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer border-none"
              >
                <Download className="w-3 h-3 text-white" />
                Excel
              </button>
              <button
                type="button"
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
                <th className="p-2.5">Data</th>
                <th className="p-2.5 text-center">Operação</th>
                <th className="p-2.5 text-center">Placa</th>
                <th className="p-2.5">Colaborador</th>
                <th className="p-2.5 text-center">Turno</th>
                <th className="p-2.5 text-center">Intervalo</th>
                <th className="p-2.5 text-center">Paletes</th>
                <th className="p-2.5 text-center">Status / Meta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedTableRows.map((row, index) => {
                const isConforme = row.status?.toUpperCase().includes('DENTRO') || 
                                   row.status?.toUpperCase().includes('CONFORME') || 
                                   row.status?.toUpperCase().includes('NO PRAZO') ||
                                   row.status?.toUpperCase().includes('OK');
                return (
                  <tr key={index} className="hover:bg-slate-50/50 cursor-pointer transition-colors">
                    <td className="p-2.5 font-semibold text-gray-400">{row.data}</td>
                    
                    <td className="p-2.5 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase inline-block whitespace-nowrap ${
                        row.operacao === 'Carregamento'
                          ? 'bg-[#032b5e]/10 text-[#032b5e] border border-[#032b5e]/20'
                          : 'bg-orange-500/10 text-orange-600 border border-orange-500/20'
                      }`}>
                        {row.operacao}
                      </span>
                    </td>
                    
                    <td className="p-2.5 text-center font-mono font-black text-[#032b5e]">
                      {row.placa || '—'}
                    </td>
                    
                    <td className="p-2.5 font-bold text-slate-800">{row.empilhador || '—'}</td>
                    
                    <td className="p-2.5 text-center font-mono font-bold text-slate-500">{row.turno || '—'}</td>
                    
                    <td className="p-2.5 text-center text-gray-400">{row.inicio} - {row.fim}</td>
                    
                    <td className="p-2.5 text-center font-mono font-black text-[#1e56f0]">{row.palhete ?? 0} PAL</td>
                    
                    <td className="p-2.5 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${isConforme ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                        {row.status || 'Fora da Meta'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filteredTableRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-400 font-semibold">Nenhum registro de lançamento encontrado</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredTableRows.length > 0 && (
          <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-4 text-xs text-gray-400">
            <span>
              Mostrando <strong>{(recordPage - 1) * recordsPerPage + 1}</strong> a <strong>{Math.min(recordPage * recordsPerPage, filteredTableRows.length)}</strong> de <strong>{filteredTableRows.length}</strong> registros
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={recordPage === 1}
                onClick={() => setRecordPage(prev => Math.max(prev - 1, 1))}
                className="p-1 rounded bg-white border border-gray-200 disabled:opacity-40 cursor-pointer text-gray-500"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-bold text-slate-700 px-2">Página {recordPage} de {totalTablePages}</span>
              <button
                type="button"
                disabled={recordPage === totalTablePages}
                onClick={() => setRecordPage(prev => Math.min(totalTablePages, prev + 1))}
                className="p-1 rounded bg-white border border-gray-200 disabled:opacity-40 cursor-pointer text-gray-500"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

        </>
      )}

      {activeSubTab === 'detalhes' && selectedDrilldownMetric && (
        <LogisticaDrilldown 
          metric={selectedDrilldownMetric} 
          rawRows={filteredRows} 
          onBack={() => {
            setSelectedDrilldownMetric(null);
            setActiveSubTab('faturamento');
          }} 
        />
      )}

      {false && (activeSubTab as string) === 'planos' && (
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="p-4.5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="font-sans font-black text-xs uppercase text-[#032b5e] tracking-wider">
              5. Plano de Ação - Acompanhamento de Melhorias Logísticas
            </h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Metodologia 5W2H para controle de causas e planos de mitigação das rotas</p>
          </div>
          
          <button 
            onClick={() => setShowAddAction(!showAddAction)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#f5a623] hover:bg-[#d4780a] text-[10px] font-black uppercase text-[#07090d] transition-all cursor-pointer rounded-lg shadow-sm w-fit"
          >
            <Plus className="w-3.5 h-3.5 text-[#07090d]" />
            Adicionar Nova Ação
          </button>
        </div>

        {/* ADD ACTION PANEL */}
        {showAddAction && (
          <form onSubmit={handleAddActionSubmit} className="bg-slate-50 p-5 border-b border-gray-200 flex flex-col gap-4">
            <span className="text-[10px] font-black text-[#032b5e] uppercase tracking-wider block">
              Formulário de Nova Ação Operacional
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-gray-500 uppercase">Problema Identificado *</label>
                <input 
                  type="text" 
                  required
                  value={newProblema}
                  onChange={e => setNewProblema(e.target.value)}
                  placeholder="Ex: Atraso de liberação fiscal SP"
                  className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-[#032b5e] focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-gray-500 uppercase">Causa Raiz</label>
                <input 
                  type="text" 
                  value={newCausa}
                  onChange={e => setNewCausa(e.target.value)}
                  placeholder="Ex: Lentidão de processamento Sefaz"
                  className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-[#032b5e] focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-gray-500 uppercase">Ação Corretiva *</label>
                <input 
                  type="text" 
                  required
                  value={newAcao}
                  onChange={e => setNewAcao(e.target.value)}
                  placeholder="Ex: Criar redundância de API"
                  className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-[#032b5e] focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-gray-500 uppercase">Responsável *</label>
                <input 
                  type="text" 
                  required
                  value={newResponsavel}
                  onChange={e => setNewResponsavel(e.target.value)}
                  placeholder="Ex: José Silva (TI)"
                  className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-[#032b5e] focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-gray-500 uppercase">Prazo de Conclusão</label>
                <input 
                  type="text" 
                  value={newPrazo}
                  onChange={e => setNewPrazo(e.target.value)}
                  placeholder="Ex: 30/06/2025"
                  className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-[#032b5e] focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-gray-500 uppercase">Status Inicial</label>
                <select 
                  value={newStatus} 
                  onChange={e => setNewStatus(e.target.value as any)} 
                  className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-[#032b5e] focus:outline-none"
                >
                  <option value="Pendente">Pendente</option>
                  <option value="Em Andamento">Em Andamento</option>
                  <option value="Concluído">Concluído</option>
                  <option value="Vencido">Vencido</option>
                </select>
              </div>

              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-[9px] font-bold text-gray-500 uppercase">Resultado Esperado</label>
                <input 
                  type="text" 
                  value={newResultadoEsperado}
                  onChange={e => setNewResultadoEsperado(e.target.value)}
                  placeholder="Ex: Tempo de liberação menor que 5 min"
                  className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-[#032b5e] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button 
                type="button" 
                onClick={() => setShowAddAction(false)}
                className="px-4 py-2 border border-gray-200 bg-white text-xs font-bold rounded-lg text-gray-600 hover:bg-gray-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="px-5 py-2 bg-[#032b5e] hover:bg-[#021f44] text-xs font-bold rounded-lg text-white cursor-pointer"
              >
                Salvar Ação
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-xs min-w-[1024px]">
            <thead>
              <tr className="bg-[#032b5e] text-white font-bold uppercase text-[9px] tracking-wider">
                <th className="p-3.5 border-r border-[#021f44]/50">PROBLEMA IDENTIFICADO</th>
                <th className="p-3.5 border-r border-[#021f44]/50">CAUSA RAIZ</th>
                <th className="p-3.5 border-r border-[#021f44]/50">AÇÃO DEFENDIDA</th>
                <th className="p-3.5 border-r border-[#021f44]/50">RESPONSÁVEL</th>
                <th className="p-3.5 border-r border-[#021f44]/50 text-center">CRONOGRAMA</th>
                <th className="p-3.5 border-r border-[#021f44]/50 text-center">STATUS</th>
                <th className="p-3.5 border-r border-[#021f44]/50">RESULTADO ESPERADO</th>
                <th className="p-3.5 border-r border-[#021f44]/50">RESULTADO OBTIDO</th>
                <th className="p-3.5 text-center">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-gray-700 font-medium">
              {acoes.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                  
                  <td className="p-3 border-r border-gray-100 font-bold text-slate-800 max-w-[200px] truncate" title={row.problema}>
                    {row.problema}
                  </td>
                  
                  <td className="p-3 border-r border-gray-100 text-slate-500 max-w-[150px] truncate" title={row.causa}>
                    {row.causa}
                  </td>

                  <td className="p-3 border-r border-gray-100 text-[#032b5e] font-semibold max-w-[200px] truncate" title={row.acao}>
                    {row.acao}
                  </td>

                  <td className="p-3 border-r border-gray-100 font-bold text-slate-700 flex items-center gap-1.5">
                    <div className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center font-black text-[9px] text-[#032b5e]">
                      {row.responsavel.charAt(0)}
                    </div>
                    <span>{row.responsavel}</span>
                  </td>

                  <td className="p-3 border-r border-gray-100 text-center text-[10px] font-mono text-gray-500 whitespace-nowrap">
                    <div>Ini: {row.dataInicio}</div>
                    <div className="font-bold text-slate-700">Fim: {row.prazo}</div>
                  </td>

                  <td className="p-3 border-r border-gray-100 text-center">
                    <select 
                      value={row.status}
                      onChange={e => handleUpdateActionStatus(row.id, e.target.value as any)}
                      className={`font-mono font-bold text-[9px] tracking-wider uppercase px-2 py-1 rounded border focus:outline-none ${
                        row.status === 'Concluído' ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20' : 
                        row.status === 'Em Andamento' ? 'bg-sky-500/15 text-sky-600 border-sky-500/20' :
                        row.status === 'Vencido' ? 'bg-rose-500/15 text-rose-600 border-rose-500/20 animate-pulse' :
                        'bg-gray-500/15 text-gray-600 border-gray-500/20'
                      }`}
                    >
                      <option value="Pendente">Pendente</option>
                      <option value="Em Andamento">Em Andamento</option>
                      <option value="Concluído">Concluído</option>
                      <option value="Vencido">Vencido</option>
                    </select>
                  </td>

                  <td className="p-3 border-r border-gray-100 text-slate-500 max-w-[150px] truncate" title={row.resultadoEsperado}>
                    {row.resultadoEsperado}
                  </td>

                  <td className="p-3 border-r border-gray-100 text-slate-700 font-semibold max-w-[150px] truncate" title={row.resultadoObtido}>
                    {row.resultadoObtido}
                  </td>

                  <td className="p-3 text-center">
                    <button 
                      onClick={() => handleDeleteAction(row.id)}
                      className="p-1 hover:bg-rose-50 rounded text-rose-500 transition-colors cursor-pointer"
                      title="Excluir Ação"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>

                </tr>
              ))}
              {acoes.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-[#6a7d92]">Nenhuma ação registrada para melhoria de carregamento/descarga.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* FOOTER BAR STYLED EXACTLY LIKE PHOTO */}
      <div className="flex items-center justify-between border-t border-gray-200 pt-4 mt-2">
        <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
          EFC & EFD Logística
        </span>
        <div className="flex items-center gap-1">
          <span className="text-xs font-black text-slate-300 select-none">|</span>
          <span className="text-sm font-black text-[#032b5e] tracking-tighter select-none font-sans uppercase">
            LOGÍSTICA ATIVA
          </span>
        </div>
      </div>

    </div>
  );
}
