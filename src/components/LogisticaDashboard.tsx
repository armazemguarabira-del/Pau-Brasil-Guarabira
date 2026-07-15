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
  ComposedChart
} from 'recharts';
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
  Trash2
} from 'lucide-react';
import { Usuario, Empresa, ArmazemRow } from '../types';
import { db, isCustomFirebaseConnected } from '../firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import A3BoardComponent from './A3BoardComponent';
import LogisticaDrilldown from './LogisticaDrilldown';

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

interface LogisticaDashboardProps {
  user: Usuario;
  empresa: Empresa | null;
  onBack?: () => void;
}

export default function LogisticaDashboard({ user, empresa, onBack }: LogisticaDashboardProps) {
  const [armazemRows, setArmazemRows] = useState<ArmazemRow[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'indicadores' | 'boarda3' | 'detalhes'>('indicadores');
  const [selectedDrilldownMetric, setSelectedDrilldownMetric] = useState<string | null>(null);

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
      if (saved) setArmazemRows(JSON.parse(saved));
      return;
    }

    const q = query(collection(db, 'armazem'));
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map(doc => ({ _docId: doc.id, ...doc.data() } as ArmazemRow));
      const filtered = isCustomFirebaseConnected() ? rows : rows.filter(r => r.empresaId === companyId);
      setArmazemRows(filtered);
    });

    return () => unsub();
  }, [empresa?.id]);
  // Helper for parsing date fields
  const parseRowDate = (r: ArmazemRow) => {
    if (r.dataISO) {
      const parts = r.dataISO.split('-');
      if (parts.length === 3) {
        return {
          year: parts[0],
          month: parts[1], // "01", "02", etc.
          day: parts[2]
        };
      }
    }
    if (r.data) {
      const parts = r.data.split('/');
      if (parts.length === 3) {
        return {
          year: parts[2],
          month: parts[1],
          day: parts[0]
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

  // FILTERS STATE FOR DYNAMIC ARMAZÉM INTEGRATION
  const [selectedOperacao, setSelectedOperacao] = useState<string>('Todos');
  const [selectedTurno, setSelectedTurno] = useState<string>('Todos');
  const [selectedEmpilhador, setSelectedEmpilhador] = useState<string>('Todos');
  const [selectedTipoVeiculo, setSelectedTipoVeiculo] = useState<string>('Todos');
  const [selectedMes, setSelectedMes] = useState<string>('Todos');
  const [selectedAno, setSelectedAno] = useState<string>('Todos');

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

  // Compute unique filter options from real armazem rows
  const filterOptions = useMemo(() => {
    const empilhadores = new Set<string>();
    const turnos = new Set<string>();
    const tipos = new Set<string>();
    const meses = new Set<string>();
    const anos = new Set<string>();

    armazemRows.forEach(r => {
      if (r.empilhador) empilhadores.add(r.empilhador);
      if (r.turno) turnos.add(r.turno);
      if (r.tipo) tipos.add(r.tipo);
      
      const dt = parseRowDate(r);
      if (dt) {
        meses.add(dt.month);
        anos.add(dt.year);
      }
    });

    return {
      empilhadores: Array.from(empilhadores).sort(),
      turnos: Array.from(turnos).sort(),
      tipos: Array.from(tipos).sort(),
      meses: Array.from(meses).sort((a, b) => Number(a) - Number(b)),
      anos: Array.from(anos).sort((a, b) => Number(b) - Number(a))
    };
  }, [armazemRows]);

  // Compute filtered rows
  const filteredRows = useMemo(() => {
    return armazemRows.filter(r => {
      if (selectedOperacao !== 'Todos' && r.operacao !== selectedOperacao) return false;
      if (selectedTurno !== 'Todos' && r.turno !== selectedTurno) return false;
      if (selectedEmpilhador !== 'Todos' && r.empilhador !== selectedEmpilhador) return false;
      if (selectedTipoVeiculo !== 'Todos' && r.tipo !== selectedTipoVeiculo) return false;
      
      const dt = parseRowDate(r);
      if (dt) {
        if (selectedMes !== 'Todos' && dt.month !== selectedMes) return false;
        if (selectedAno !== 'Todos' && dt.year !== selectedAno) return false;
      }
      return true;
    });
  }, [armazemRows, selectedOperacao, selectedTurno, selectedEmpilhador, selectedTipoVeiculo, selectedMes, selectedAno]);

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

    // Atrasos are defined as operations with "FORA DA JANELA" or duration > 60 min for carregamento / > 45 min for descarregamento
    let atrasosCount = 0;
    filteredRows.forEach(r => {
      if (r.status?.toUpperCase().includes('FORA')) {
        atrasosCount++;
      } else if (r.inicio && r.fim) {
        const diff = timeToMinutes(r.fim) - timeToMinutes(r.inicio);
        if (r.operacao === 'Carregamento' && diff > 60) atrasosCount++;
        if (r.operacao === 'Descarregamento' && diff > 45) atrasosCount++;
      }
    });

    const eDiffC = (efcVal - 96).toFixed(1);
    const eDiffD = (efdVal - 90).toFixed(1);

    const cColor = efcVal >= 96 ? 'text-emerald-500' : efcVal >= 94 ? 'text-amber-500' : 'text-rose-500';
    const cBg = efcVal >= 96 ? 'bg-emerald-500/10 border-emerald-500/20 text-slate-800' : efcVal >= 94 ? 'bg-amber-500/10 border-amber-500/20 text-slate-800' : 'bg-rose-500/10 border-rose-500/20 text-slate-800';

    const dColor = efdVal >= 90 ? 'text-emerald-500' : efdVal >= 87 ? 'text-amber-500' : 'text-rose-500';
    const dBg = efdVal >= 90 ? 'bg-emerald-500/10 border-emerald-500/20 text-slate-800' : efdVal >= 87 ? 'bg-amber-500/10 border-amber-500/20 text-slate-800' : 'bg-rose-500/10 border-rose-500/20 text-slate-800';

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

  const quantidadeAcoesAbertas = acoes.filter(a => a.status !== 'Concluído').length;

  // Historical 4 Months Trend data (EFD and EFC evolution + Loading times)
  const trend4MonthsData = useMemo(() => {
    const monthGroups: Record<string, ArmazemRow[]> = {};
    armazemRows.forEach(r => {
      const dt = parseRowDate(r);
      if (dt) {
        const monthKey = `${dt.year}-${dt.month}`; // e.g. "2025-05"
        if (!monthGroups[monthKey]) monthGroups[monthKey] = [];
        monthGroups[monthKey].push(r);
      }
    });
    
    const sortedKeys = Object.keys(monthGroups).sort(); // chronological
    
    if (sortedKeys.length === 0) {
      return [
        { month: 'Sem dados', EFC: 100, EFD: 100, tempoCarregamento: 0, tempoDescarga: 0 }
      ];
    }
    
    return sortedKeys.map(key => {
      const rows = monthGroups[key];
      const [year, month] = key.split('-');
      
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
        tempoCarregamento: avgC,
        tempoDescarga: avgD
      };
    });
  }, [armazemRows]);

  // Calculate dynamic minimum for the EFC/EFD Y-Axis to prevent rendering clipping
  const dynamicYMin = useMemo(() => {
    if (!trend4MonthsData || trend4MonthsData.length === 0) return 80;
    const allVals = trend4MonthsData.map(d => Math.min(d.EFC, d.EFD));
    const minVal = Math.min(...allVals, 80);
    const rounded = Math.floor(minVal / 10) * 10;
    return rounded < 0 ? 0 : rounded;
  }, [trend4MonthsData]);

  // Histograma Carregamento distribution
  const histogramaCarregamentoData = useMemo(() => {
    const ranges = {
      '0 - 30 min': { count: 0, fill: '#0284c7' },
      '30 - 60 min': { count: 0, fill: '#0369a1' },
      '60 - 90 min': { count: 0, fill: '#032b5e' },
      '90 - 120 min': { count: 0, fill: '#f5a623' },
      '> 120 min': { count: 0, fill: '#ef4444' }
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
        totalPaletes: val.totalPaletes
      }))
      .sort((a, b) => b.totalPaletes - a.totalPaletes)
      .slice(0, 6);
  }, [filteredRows]);

  // Pareto Chart (Atrasos por Tipo de Veículo)
  const paretoData = useMemo(() => {
    const tipoGroups: Record<string, number> = {};
    let totalAtrasos = 0;
    
    filteredRows.forEach(r => {
      const isAtrasado = r.status?.toUpperCase().includes('FORA') || (() => {
        if (r.inicio && r.fim) {
          const diff = timeToMinutes(r.fim) - timeToMinutes(r.inicio);
          return (r.operacao === 'Carregamento' && diff > 60) || (r.operacao === 'Descarregamento' && diff > 45);
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
      if (!r.dataISO) return;
      const dateObj = new Date(r.dataISO + 'T12:00:00'); // avoid timezone offset
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
    if (efdValue < 90) {
      list.push(`⚠️ EFD abaixo do limite corporativo (${efdValue}% vs Meta 90%). Lentidão identificada na descarga.`);
    }
    if (tempoMedioCarregamento > 60) {
      list.push(`⏳ Tempo médio de carregamento elevado (${tempoMedioCarregamento} min). Meta ideal é < 60 minutos.`);
    }
    if (tempoMedioDescarga > 45) {
      list.push(`⏳ Tempo médio de descarga elevado (${tempoMedioDescarga} min). Meta ideal é < 45 minutos.`);
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

  const handleClearFilters = () => {
    setSelectedOperacao('Todos');
    setSelectedTurno('Todos');
    setSelectedEmpilhador('Todos');
    setSelectedTipoVeiculo('Todos');
    setSelectedMes('Todos');
    setSelectedAno('Todos');
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
              onClick={() => setActiveSubTab('indicadores')}
              className={`px-4 py-1.5 rounded-lg font-sans font-bold text-[10px] uppercase tracking-wider transition-all border-none cursor-pointer ${activeSubTab === 'indicadores' ? 'bg-[#032b5e] text-white shadow-sm' : 'text-gray-500 hover:text-[#032b5e] bg-transparent'}`}
            >
              EFC EFD & BI
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
                    if (activeSubTab === 'detalhes') setActiveSubTab('indicadores');
                  }} 
                  className="hover:bg-black/20 rounded px-1.5 ml-1 text-xs"
                >
                  ✕
                </span>
              </button>
            )}
          </div>

          {/* TOP INTERACTIVE ACTIONS */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button 
              onClick={handleClearFilters}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-[10px] font-black uppercase text-gray-500 hover:text-gray-700 transition-colors cursor-pointer rounded-lg shadow-sm"
              title="Resetar Filtros"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Limpar Filtros
            </button>
            
            <button 
              onClick={() => {
                alert('Excel estruturado Logistica_Performance.xlsx gerado e pronto para download corporativo.');
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#032b5e] hover:bg-[#021f44] text-[10px] font-black uppercase text-white transition-all cursor-pointer rounded-lg shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar XLS
            </button>
          </div>
        </div>
      </div>

      {activeSubTab === 'indicadores' && (
        <>

      {/* FILTER BOX SECTION */}
      <div className="bg-white p-4.5 rounded-xl border border-gray-200/80 shadow-xs flex flex-col gap-3">
        <div className="flex items-center gap-2 text-xs font-black text-[#032b5e] uppercase tracking-wider border-b border-gray-100 pb-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span>Filtros do Painel EFC EFD (Integrado ao Armazém Fácil)</span>
        </div>
        
        {/* Responsive Grid with 6 dynamic filters */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-bold text-gray-400 uppercase">Operação</label>
            <select value={selectedOperacao} onChange={e => setSelectedOperacao(e.target.value)} className="bg-slate-50 border border-gray-300 rounded-md px-2 py-1 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#032b5e]">
              <option value="Todos">Todos</option>
              <option value="Carregamento">Carregamento</option>
              <option value="Descarregamento">Descarregamento</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-bold text-gray-400 uppercase">Turno</label>
            <select value={selectedTurno} onChange={e => setSelectedTurno(e.target.value)} className="bg-slate-50 border border-gray-300 rounded-md px-2 py-1 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#032b5e]">
              <option value="Todos">Todos</option>
              {filterOptions.turnos.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-bold text-gray-400 uppercase">Operador (Empilhador)</label>
            <select value={selectedEmpilhador} onChange={e => setSelectedEmpilhador(e.target.value)} className="bg-slate-50 border border-gray-300 rounded-md px-2 py-1 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#032b5e]">
              <option value="Todos">Todos</option>
              {filterOptions.empilhadores.map(e => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-bold text-gray-400 uppercase">Tipo de Veículo</label>
            <select value={selectedTipoVeiculo} onChange={e => setSelectedTipoVeiculo(e.target.value)} className="bg-slate-50 border border-gray-300 rounded-md px-2 py-1 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#032b5e]">
              <option value="Todos">Todos</option>
              {filterOptions.tipos.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-bold text-gray-400 uppercase">Mês</label>
            <select value={selectedMes} onChange={e => setSelectedMes(e.target.value)} className="bg-slate-50 border border-gray-300 rounded-md px-2 py-1 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#032b5e]">
              <option value="Todos">Todos</option>
              {filterOptions.meses.map(m => (
                <option key={m} value={m}>{getMonthName(m)}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-bold text-gray-400 uppercase">Ano</label>
            <select value={selectedAno} onChange={e => setSelectedAno(e.target.value)} className="bg-slate-50 border border-gray-300 rounded-md px-2 py-1 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#032b5e]">
              <option value="Todos">Todos</option>
              {filterOptions.anos.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* INTELLIGENT ALERTS ZONE */}
      {alertas.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-black text-amber-600 uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>Notificações e Alertas Inteligentes de Logística</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-amber-800 font-medium">
            {alertas.map((alerta, i) => (
              <div key={i} className="flex items-start gap-1.5 bg-white/50 p-2 rounded-lg border border-amber-200">
                <span className="mt-0.5">•</span>
                <span>{alerta}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CARDS PRINCIPAIS (8 KPI CARDS - CLICKABLE DRILLDOWN) */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4">
        
        {/* KPI 1: % EFC */}
        <div 
          onClick={() => handleDrilldown('EFC (Carregamento)')}
          className={`p-4 rounded-xl border shadow-xs flex flex-col justify-between hover:-translate-y-1 hover:shadow-md hover:border-indigo-400 cursor-pointer transition-all ${efcBg}`}
          title="Clique para abrir análise detalhada do EFC"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block">
                EFC (CARREGAMENTO)
              </span>
              <span className="text-xs" title="Ver detalhes">🔍</span>
            </div>
            <div className="flex items-baseline mt-1.5 gap-1">
              <span className="text-2xl font-black tracking-tight">{efcValue.toFixed(1)}%</span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[9px] text-gray-400 font-bold">Meta: 96%</span>
              <span className={`text-[9px] font-black ${parseFloat(efcDiff) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                ({parseFloat(efcDiff) >= 0 ? '+' : ''}{efcDiff}%)
              </span>
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between border-t border-gray-100 pt-2 text-[9px] font-bold text-gray-400">
            <span>Status:</span>
            <span className={`uppercase font-black px-1.5 py-0.5 rounded-sm ${efcValue >= 96 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
              {efcValue >= 96 ? 'Conforme' : 'Fora da Meta'}
            </span>
          </div>
        </div>

        {/* KPI 2: % EFD */}
        <div 
          onClick={() => handleDrilldown('EFD (Descarga)')}
          className={`p-4 rounded-xl border shadow-xs flex flex-col justify-between hover:-translate-y-1 hover:shadow-md hover:border-indigo-400 cursor-pointer transition-all ${efdBg}`}
          title="Clique para abrir análise detalhada do EFD"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block">
                EFD (DESCARGA)
              </span>
              <span className="text-xs" title="Ver detalhes">🔍</span>
            </div>
            <div className="flex items-baseline mt-1.5 gap-1">
              <span className="text-2xl font-black tracking-tight">{efdValue.toFixed(1)}%</span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[9px] text-gray-400 font-bold">Meta: 90%</span>
              <span className={`text-[9px] font-black ${parseFloat(efdDiff) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                ({parseFloat(efdDiff) >= 0 ? '+' : ''}{efdDiff}%)
              </span>
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between border-t border-gray-100 pt-2 text-[9px] font-bold text-gray-400">
            <span>Status:</span>
            <span className={`uppercase font-black px-1.5 py-0.5 rounded-sm ${efdValue >= 90 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
              {efdValue >= 90 ? 'Conforme' : 'Fora da Meta'}
            </span>
          </div>
        </div>

        {/* KPI 3: CAMINHÕES CARREGADOS */}
        <div 
          onClick={() => handleDrilldown('Carregamentos')}
          className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs flex flex-col justify-between hover:-translate-y-1 hover:shadow-md hover:border-indigo-400 cursor-pointer transition-all"
          title="Clique para ver lista de carregamentos realizados"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block">
                CARREGAMENTOS
              </span>
              <span className="text-xs" title="Ver detalhes">🔍</span>
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
          onClick={() => handleDrilldown('Descarregamentos')}
          className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs flex flex-col justify-between hover:-translate-y-1 hover:shadow-md hover:border-indigo-400 cursor-pointer transition-all"
          title="Clique para ver lista de descarregamentos realizados"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block">
                DESCARREGAMENTOS
              </span>
              <span className="text-xs" title="Ver detalhes">🔍</span>
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
          onClick={() => handleDrilldown('T.M. Carregamento')}
          className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs flex flex-col justify-between hover:-translate-y-1 hover:shadow-md hover:border-indigo-400 cursor-pointer transition-all"
          title="Clique para ver detalhe do tempo médio de carregamento"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block">
                T.M. CARREGAMENTO
              </span>
              <span className="text-xs" title="Ver detalhes">🔍</span>
            </div>
            <div className="flex items-baseline gap-1 mt-1.5">
              <span className="text-2xl font-black tracking-tight text-slate-800">
                {tempoMedioCarregamento}
              </span>
              <span className="text-[10px] font-bold text-gray-400">min</span>
            </div>
            <span className={`text-[9px] font-bold block mt-1 ${tempoMedioCarregamento <= 60 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {tempoMedioCarregamento <= 60 ? 'Dentro do limite' : 'Abaixo da meta'}
            </span>
          </div>
          <div className="mt-2 border-t border-gray-100 pt-1.5 text-[9px] text-gray-400 font-medium">
            Meta: &lt; 60 min
          </div>
        </div>

        {/* KPI 6: TEMPO MÉDIO DESCARGA */}
        <div 
          onClick={() => handleDrilldown('T.M. Descarga')}
          className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs flex flex-col justify-between hover:-translate-y-1 hover:shadow-md hover:border-indigo-400 cursor-pointer transition-all"
          title="Clique para ver detalhe do tempo médio de descarga"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block">
                T.M. DESCARGA
              </span>
              <span className="text-xs" title="Ver detalhes">🔍</span>
            </div>
            <div className="flex items-baseline gap-1 mt-1.5">
              <span className="text-2xl font-black tracking-tight text-slate-800">
                {tempoMedioDescarga}
              </span>
              <span className="text-[10px] font-bold text-gray-400">min</span>
            </div>
            <span className={`text-[9px] font-bold block mt-1 ${tempoMedioDescarga <= 45 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {tempoMedioDescarga <= 45 ? 'Dentro do limite' : 'Acima da meta'}
            </span>
          </div>
          <div className="mt-2 border-t border-gray-100 pt-1.5 text-[9px] text-gray-400 font-medium">
            Meta: &lt; 45 min
          </div>
        </div>

        {/* KPI 7: QUANTIDADE ATRASOS */}
        <div 
          onClick={() => handleDrilldown('Veículos Atrasados')}
          className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs flex flex-col justify-between hover:-translate-y-1 hover:shadow-md hover:border-indigo-400 cursor-pointer transition-all"
          title="Clique para ver a listagem de veículos atrasados"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block">
                VEÍCULOS ATRASADOS
              </span>
              <span className="text-xs" title="Ver detalhes">🔍</span>
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

        {/* KPI 8: PALETES MOVIMENTADOS */}
        <div 
          onClick={() => handleDrilldown('Paletes Movimentados')}
          className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs flex flex-col justify-between hover:-translate-y-1 hover:shadow-md hover:border-indigo-400 cursor-pointer transition-all"
          title="Clique para ver o detalhamento de paletes movimentados"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block">
                PALETES MOVIMENTADOS
              </span>
              <span className="text-xs" title="Ver detalhes">🔍</span>
            </div>
            <span className="text-2xl font-black tracking-tight text-[#f5a623] block mt-1.5">
              {totalPaletesMovimentados}
            </span>
            <span className="text-[9px] text-slate-500 font-bold block mt-1">
              Média: {mediaPaletesPorViagem} /viagem
            </span>
          </div>
          <div className="mt-2 border-t border-gray-100 pt-1.5 text-[9px] text-slate-400 font-medium">
            Registros Armazém Fácil
          </div>
        </div>

      </div>

      {/* GRAPH GRIDS SECTION (MIDDLE OF PAGE) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CHART 1: TENDÊNCIA DOS ÚLTIMOS 4 MESES (EFC vs EFD) */}
        <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-sans font-black text-xs uppercase text-[#032b5e] tracking-wider">
                6. Evolução das Metas Logísticas (Últimos 4 Meses)
              </h3>
              <p className="text-[10px] text-gray-400 font-bold mt-0.5">Metas: EFC 96% | EFD 90%</p>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-[#22c55e] font-black bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Tendência: Melhoria</span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend4MonthsData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                <CartesianGrid stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis domain={[dynamicYMin, 100]} stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 10, fontWeight: 'bold' }} />
                <Line type="monotone" dataKey="EFC" name="EFC % (Carregamento)" stroke="#032b5e" strokeWidth={3} dot={{ r: 5 }} />
                <Line type="monotone" dataKey="EFD" name="EFD % (Descarga)" stroke="#f5a623" strokeWidth={3} dot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: EVOLUÇÃO DO TEMPO MÉDIO DE ESTADIA */}
        <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-sans font-black text-xs uppercase text-[#032b5e] tracking-wider">
                Evolução do Tempo Médio (Minutos)
              </h3>
              <p className="text-[10px] text-gray-400 font-bold mt-0.5">Tempo operacional por veículo em doca</p>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-amber-500 font-black bg-amber-500/10 px-2 py-0.5 rounded-full uppercase">
              <Clock className="w-3.5 h-3.5" />
              <span>Tendência: Estável</span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend4MonthsData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                <CartesianGrid stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                <Legend verticalAlign="top" height={36} iconType="rect" wrapperStyle={{ fontSize: 10, fontWeight: 'bold' }} />
                <Line type="monotone" dataKey="tempoCarregamento" name="Média Carregamento (min)" stroke="#0284c7" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4 }} />
                <Line type="monotone" dataKey="tempoDescarga" name="Média Descarga (min)" stroke="#ec4899" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* SECOND GRID ROWS: HISTOGRAMAS & PARETO */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* CHART 3: HISTOGRAMA DE CARREGAMENTO */}
        <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-sans font-black text-xs uppercase text-[#032b5e] tracking-wider mb-1">
              3. Histograma de Carregamento
            </h3>
            <span className="text-[9px] text-gray-400 font-bold block mb-4 uppercase">Distribuição do tempo de estadia (Frequência)</span>
            
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={histogramaCarregamentoData} margin={{ top: 10, right: 10, left: -30, bottom: 0 }}>
                  <CartesianGrid stroke="#f8fafc" vertical={false} />
                  <XAxis dataKey="faixa" stroke="#94a3b8" fontSize={9} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                  <Bar dataKey="camioes" name="Caminhões" fill="#032b5e" radius={[4, 4, 0, 0]}>
                    {histogramaCarregamentoData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Sub-KPI summary exact as photo */}
            <div className="grid grid-cols-4 gap-2 border-t border-b border-gray-100 py-3 my-3 text-center">
              <div>
                <span className="text-[8px] font-bold text-gray-400 block uppercase">Médio</span>
                <span className="text-sm font-black text-slate-800">{tempoMedioCarregamento} min</span>
              </div>
              <div>
                <span className="text-[8px] font-bold text-gray-400 block uppercase">Mínimo</span>
                <span className="text-sm font-black text-slate-800">
                  {tempoMinimoCarregamento === Infinity ? 0 : tempoMinimoCarregamento} min
                </span>
              </div>
              <div>
                <span className="text-[8px] font-bold text-gray-400 block uppercase">Máximo</span>
                <span className="text-sm font-black text-slate-800">
                  {tempoMaximoCarregamento === -Infinity ? 0 : tempoMaximoCarregamento} min
                </span>
              </div>
              <div>
                <span className="text-[8px] font-bold text-gray-400 block uppercase">Na Meta</span>
                <span className="text-sm font-black text-emerald-600">{efcValue.toFixed(1)}%</span>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-gray-200">
              <span className="text-[9px] font-black text-[#032b5e] uppercase tracking-wider block mb-1">
                ⚠️ Gargalos Identificados
              </span>
              <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                Pico de fadiga operacional registrado na janela das 14h00 às 16h00 devido ao acúmulo de notas para emissão.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-1 mt-4 pt-3 border-t border-gray-100">
            <label className="text-[9px] font-black tracking-widest text-slate-400 uppercase">Ações definidas para melhoria</label>
            <textarea 
              rows={2}
              value={gargaloAcoes}
              onChange={e => setGargaloAcoes(e.target.value)}
              placeholder="Digite ações prioritárias para resolver o gargalo..."
              className="w-full text-xs p-2 bg-slate-50 border border-gray-300 rounded-lg text-slate-700 font-sans leading-relaxed focus:outline-none focus:ring-1 focus:ring-[#032b5e]"
            />
          </div>
        </div>

        {/* CHART 4: PRODUTIVIDADE & PERFORMANCE DOS OPERADORES */}
        <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-sans font-black text-xs uppercase text-[#032b5e] tracking-wider mb-1">
              4. Produtividade & Eficiência dos Operadores (Empilhadores)
            </h3>
            <span className="text-[9px] text-gray-400 font-bold block mb-4 uppercase">Volumetria de paletes movimentados e conformidade de janela por operador</span>
            
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rotasPerformanceData} layout="vertical" margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid stroke="#f8fafc" horizontal={false} />
                  <XAxis type="number" stroke="#94a3b8" fontSize={9} tickLine={false} />
                  <YAxis type="category" dataKey="rota" stroke="#94a3b8" fontSize={9} tickLine={false} width={80} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                  <Bar dataKey="totalPaletes" name="Paletes Movimentados" fill="#f5a623" radius={[0, 4, 4, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Tabular performance */}
            <div className="border border-gray-100 rounded-lg overflow-hidden my-3">
              <table className="w-full text-left text-[10px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold border-b border-gray-100">
                    <th className="p-2">Operador</th>
                    <th className="p-2 text-center">Tempo Médio</th>
                    <th className="p-2 text-center">Viagens</th>
                    <th className="p-2 text-center">Na Janela (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {rotasPerformanceData.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-2 font-bold text-slate-700">{row.rota}</td>
                      <td className="p-2 text-center text-slate-500">{row.tempoMedio} min</td>
                      <td className="p-2 text-center text-slate-600">{row.quantidade} viagens</td>
                      <td className="p-2 text-center">
                        <span className={`font-black px-1.5 py-0.5 rounded-sm ${row.dentroMeta >= 90 ? 'bg-emerald-500/10 text-emerald-600' : row.dentroMeta >= 80 ? 'bg-amber-500/10 text-amber-600' : 'bg-rose-500/10 text-rose-600'}`}>
                          {row.dentroMeta}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col gap-1 mt-1 pt-3 border-t border-gray-100">
            <label className="text-[9px] font-black tracking-widest text-slate-400 uppercase">Ações Corretivas por Operador</label>
            <textarea 
              rows={2}
              value={rotasAcoes}
              onChange={e => setRotasAcoes(e.target.value)}
              placeholder="Digite ações de treinamento ou remanejamento de operadores..."
              className="w-full text-xs p-2 bg-slate-50 border border-gray-300 rounded-lg text-slate-700 font-sans leading-relaxed focus:outline-none focus:ring-1 focus:ring-[#032b5e]"
            />
          </div>
        </div>

        {/* CHART 5: PARETO DAS CAUSAS DE ATRASOS POR VEÍCULO */}
        <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-sans font-black text-xs uppercase text-[#032b5e] tracking-wider mb-1">
              Diagrama de Pareto: Atrasos por Tipo de Veículo
            </h3>
            <span className="text-[9px] text-gray-400 font-bold block mb-4 uppercase">Identificação de gargalos operacionais por tipo de frota</span>
            
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={paretoData} margin={{ top: 10, right: -10, left: -25, bottom: 5 }}>
                  <CartesianGrid stroke="#f8fafc" vertical={false} />
                  <XAxis dataKey="causa" stroke="#94a3b8" fontSize={9} tickLine={false} />
                  <YAxis yAxisId="left" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} stroke="#ec4899" fontSize={9} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                  <Bar yAxisId="left" dataKey="ocorrencias" name="Atrasos / Ocorrências" fill="#032b5e" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="percentualAcumulado" name="% Acumulado" stroke="#ec4899" strokeWidth={2.5} dot={{ r: 4, fill: '#ec4899' }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Top offenders summary */}
            <div className="bg-rose-50 border border-rose-100 rounded-lg p-3 my-3">
              <span className="text-[10px] font-black text-rose-700 uppercase tracking-wider block mb-1">
                Foco de Tomada de Decisão
              </span>
              <p className="text-[10px] text-rose-600 font-medium leading-relaxed">
                Otimizar o fluxo de atendimento da frota com maior recorrência de atrasos reduzirá drasticamente o tempo médio de pátio geral.
              </p>
            </div>
          </div>

          {/* Horários Heatmap quick glance block */}
          <div className="bg-[#f8fafc] border border-gray-200 rounded-xl p-3 flex flex-col gap-1.5">
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-wider">
              Heatmap de Eficiência de Horários (Doca Congestionada)
            </span>
            <div className="grid grid-cols-6 gap-1 text-center font-mono text-[8px] font-bold text-gray-500 uppercase">
              {weekDays.map((d, i) => (
                <div key={i} className="truncate" title={d}>{d.substring(0, 3)}</div>
              ))}
            </div>
            <div className="grid grid-cols-6 gap-1">
              {weekDays.map((d) => (
                <div key={d} className="flex flex-col gap-1">
                  {hourIntervals.map((h) => {
                    const statusVal = heatmapData[`${d}-${h}`];
                    const cellBg = statusVal === 1 ? 'bg-emerald-500' : statusVal === 2 ? 'bg-amber-400' : 'bg-rose-500';
                    return (
                      <div 
                        key={h} 
                        className={`h-4 rounded-sm ${cellBg} transition-all cursor-help`}
                        title={`${d} às ${h}: ${statusVal === 1 ? 'Livre / Alta eficiência' : statusVal === 2 ? 'Atenção / Ocupação média' : 'Crítico / Congestionado'}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
      </>
      )}

      {activeSubTab === 'boarda3' && (
        <A3BoardComponent user={user} empresa={empresa} dashboard="logistica" />
      )}

      {activeSubTab === 'detalhes' && selectedDrilldownMetric && (
        <LogisticaDrilldown 
          metric={selectedDrilldownMetric} 
          rawRows={filteredRows} 
          onBack={() => {
            setSelectedDrilldownMetric(null);
            setActiveSubTab('indicadores');
          }} 
        />
      )}

      {false && activeSubTab === 'planos' && (
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
