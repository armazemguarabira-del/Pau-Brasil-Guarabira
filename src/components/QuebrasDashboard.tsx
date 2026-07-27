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
  PieChart,
  Pie,
  Legend,
  LabelList
} from 'recharts';
import { 
  Calendar, 
  ChevronDown, 
  AlertTriangle,
  ArrowLeft,
  Download,
  DollarSign,
  TrendingUp,
  Award,
  Filter,
  CheckCircle,
  Clock,
  Plus,
  Trash2,
  FileText,
  User,
  ShieldAlert,
  Archive,
  Truck,
  Package,
  Sun,
  Moon
} from 'lucide-react';
import { Usuario, Empresa, QuebraRow } from '../types';
import { db, isCustomFirebaseConnected } from '../firebase';
import { useEmpresaData } from '../context/EmpresaDataContext';
import { generateMockQuebras } from '../mockDataGenerator';
import A3BoardComponent from './A3BoardComponent';
import CalendarFilter from './CalendarFilter';
import WqiTab from './WqiTab';

interface QuebrasDashboardProps {
  user: Usuario;
  empresa: Empresa | null;
  onBack?: () => void;
  theme?: 'light' | 'dark';
}

interface ActionPlan5W2H {
  id: string;
  what: string;
  why: string;
  who: string;
  where: string;
  when: string;
  how: string;
  howMuch: number;
  status: 'Pendente' | 'Em Andamento' | 'Concluído' | 'Atrasado';
  codeDPO?: string;
}

const DEFAULT_PLANS: ActionPlan5W2H[] = [
  {
    id: 'plan-1',
    what: 'Treinamento de Reciclagem para Operadores de Empilhadeira',
    why: 'Alto índice de quebras por movimentação inadequada (Código 539)',
    who: 'Supervisor de Depósito (Carlos)',
    where: 'Área de Estoque e Docas',
    when: '15/07/2026',
    how: 'Aplicação do módulo de direção defensiva e empilhamento seguro padrão',
    howMuch: 350.00,
    status: 'Em Andamento',
    codeDPO: '539'
  },
  {
    id: 'plan-2',
    what: 'Revisão Sistemática do Fluxo FEFO (Primeiro que Vence, Primeiro que Sai)',
    why: 'Ocorrência de perdas por produtos vencidos no armazém (Código 533)',
    who: 'Analista de Inventário (Fernanda)',
    where: 'Blocados de Cerveja e Refri',
    when: '10/07/2026',
    how: 'Adesão diária à rotina de verificação no painel de validade antes da liberação de picking',
    howMuch: 0.00,
    status: 'Concluído',
    codeDPO: '533'
  },
  {
    id: 'plan-3',
    what: 'Instalação de Redes de Contenção de Altura nos Corredores Críticos',
    why: 'Prevenir acidentes com queda de paletes de altíssima rotação (Código 525)',
    who: 'Técnico de Segurança (Aline)',
    where: 'Corredores de Picking (C e D)',
    when: '20/07/2026',
    how: 'Fixação de redes metálicas de segurança nas posições porta-palete de nível superior',
    howMuch: 1200.00,
    status: 'Pendente',
    codeDPO: '525'
  }
];

// Helper to classify embalagem
const getEmbalagemName = (desc: string): string => {
  const d = (desc || '').toUpperCase();
  if (d.includes('600')) return 'Garrafa 600ml';
  if (d.includes('300') || d.includes('RF') || d.includes('ROMANI') || d.includes('RETORNÁVEL') || d.includes('RETORNAVEL')) return 'Garrafa 300ml';
  if (d.includes('473') || d.includes('LATÃO') || d.includes('LATAO') || d.includes('SLEEK')) return 'Lata 473ml';
  if (d.includes('350') || d.includes('355') || d.includes('269') || d.includes('LATA') || d.includes('LT')) return 'Lata 350ml/269ml';
  if (d.includes('LN') || d.includes('LONG') || d.includes('330') || d.includes('275')) return 'Long Neck';
  if (d.includes('1L') || d.includes('1 L') || d.includes('LITRÃO') || d.includes('LITRAO') || d.includes('1000')) return 'Garrafa 1L';
  if (d.includes('PET') || d.includes('2L') || d.includes('1.5L')) return 'PET';
  return 'Outras Embalagens';
};

// Helper to classify grupo de produto
export const getGrupoName = (desc: string): string => {
  const d = (desc || '').toUpperCase();
  if (
    d.includes('GUARANA') || d.includes('PEPSI') || d.includes('SUKITA') || 
    d.includes('SODA') || d.includes('H2OH') || d.includes('TONICA') || d.includes('CITRUS')
  ) {
    return 'Refrigerantes';
  }
  if (
    d.includes('RED BULL') || d.includes('GATORADE') || d.includes('MONSTER') || d.includes('TNT')
  ) {
    return 'Energéticos & NABS';
  }
  if (
    d.includes('AGUA') || d.includes('ÁGUA') || d.includes('INDAIA') || 
    d.includes('INDAIÁ') || d.includes('DAVILA') || d.includes('SUCO') || d.includes('DEL VALLE')
  ) {
    return 'Águas & Sucos';
  }
  if (
    d.includes('BEATS') || d.includes('SMIRNOFF') || d.includes('WALKER') || 
    d.includes('TANQUERAY') || d.includes('PITU') || d.includes('PITÚ') || 
    d.includes('WHISKY') || d.includes('GIN') || d.includes('VODKA') || 
    d.includes('BALLANTINES') || d.includes('PASSPORT') || d.includes('ICE')
  ) {
    return 'Destilados & Beats';
  }
  if (d.includes('TRIDENT') || d.includes('HALLS')) {
    return 'Confeitaria / Outros';
  }
  return 'Cervejas';
};

export default function QuebrasDashboard({ user, empresa, onBack }: QuebrasDashboardProps) {
  const [actualQuebras, setActualQuebras] = useState<QuebraRow[]>([]);
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [filterArea, setFilterArea] = useState<string>('TODAS');
  const [filterTurno, setFilterTurno] = useState<string>('TODOS');
  const [filterEmbalagem, setFilterEmbalagem] = useState<string>('TODAS');
  const [filterGrupo, setFilterGrupo] = useState<string>('TODOS');
  const [secondChartMode, setSecondChartMode] = useState<'grupo' | 'embalagem'>('grupo');
  const [activeSubTab, setActiveSubTab] = useState<'indicadores' | 'wqi' | 'boarda3'>('indicadores');
  const [viewUnit, setViewUnit] = useState<'cx' | 'he'>('cx');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('dashboard_theme') as 'light' | 'dark') || 'light';
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('dashboard_theme', nextTheme);
  };

  const quebras = useMemo(() => {
    const companyId = empresa?.id || 'demo';
    if (actualQuebras && actualQuebras.length > 0) {
      return actualQuebras;
    }
    return generateMockQuebras(companyId);
  }, [actualQuebras, empresa?.id]);

  // Convert physical boxes to HE
  const convertCxToHE = (quantidade: number, descricao: string = ''): number => {
    const desc = (descricao || '').toUpperCase();
    let litersPerCx = 9.0; // default factor
    if (desc.includes('250')) litersPerCx = 6.0;
    else if (desc.includes('269')) litersPerCx = 6.456;
    else if (desc.includes('350')) litersPerCx = 8.4;
    else if (desc.includes('473')) litersPerCx = 11.352;
    else if (desc.includes('500')) litersPerCx = 6.0;
    else if (desc.includes('600')) litersPerCx = 7.2;
    else if (desc.includes('1L') || desc.includes('1 L')) litersPerCx = 12.0;
    else if (desc.includes('2L') || desc.includes('2 L')) litersPerCx = 12.0;
    else if (desc.includes('300')) litersPerCx = 7.2;
    return (quantidade * litersPerCx) / 100;
  };
  
  // 5W2H state
  const [planos, setPlanos] = useState<ActionPlan5W2H[]>([]);
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [newPlan, setNewPlan] = useState<Omit<ActionPlan5W2H, 'id'>>({
    what: '',
    why: '',
    who: '',
    where: '',
    when: '',
    how: '',
    howMuch: 0,
    status: 'Pendente',
    codeDPO: '539'
  });

  const empresaData = useEmpresaData();

  // Sync Quebras
  useEffect(() => {
    if (!db || !empresa?.id) {
      const saved = localStorage.getItem(`quebras_${empresa?.id || 'demo'}`);
      if (saved) setActualQuebras(JSON.parse(saved));
      return;
    }

    const rows = [...empresaData.quebras];
    rows.sort((a, b) => (b.dataISO || '').localeCompare(a.dataISO || ''));
    setActualQuebras(rows);
  }, [empresaData.quebras, empresa?.id]);

  // Sync Action Plans 5W2H
  useEffect(() => {
    const key = `quebras_planos_5w2h_${empresa?.id || 'demo'}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      setPlanos(JSON.parse(saved));
    } else {
      setPlanos(DEFAULT_PLANS);
      localStorage.setItem(key, JSON.stringify(DEFAULT_PLANS));
    }
  }, [empresa?.id]);

  const savePlanosToLocal = (updatedList: ActionPlan5W2H[]) => {
    setPlanos(updatedList);
    localStorage.setItem(`quebras_planos_5w2h_${empresa?.id || 'demo'}`, JSON.stringify(updatedList));
  };

  // Filter Logic
  const getFilteredQuebras = () => {
    return quebras.filter(q => {
      // Area filter
      if (filterArea !== 'TODAS' && q.area !== filterArea) return false;
      // Turno filter
      if (filterTurno !== 'TODOS' && q.turno !== filterTurno) return false;
      // Embalagem filter
      if (filterEmbalagem !== 'TODAS' && getEmbalagemName(q.descricao) !== filterEmbalagem) return false;
      // Grupo filter
      if (filterGrupo !== 'TODOS' && getGrupoName(q.descricao) !== filterGrupo) return false;
      
      // Date range filter
      if (startDate || endDate) {
        let rowISO = '';
        if (q.dataISO) {
          rowISO = q.dataISO.split('T')[0];
        } else if (q.data) {
          const parts = q.data.split('/');
          if (parts.length === 3) {
            rowISO = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          }
        }
        if (rowISO) {
          if (startDate && rowISO < startDate) return false;
          if (endDate && rowISO > endDate) return false;
        }
      }
      return true;
    });
  };

  const filteredData = getFilteredQuebras();

  // Metric Calculation
  const totalQuantCx = filteredData.reduce((acc, curr) => acc + curr.quantidade, 0);
  const totalQuantHE = filteredData.reduce((acc, curr) => acc + convertCxToHE(curr.quantidade, curr.descricao), 0);
  const totalQuant = viewUnit === 'cx' ? totalQuantCx : Math.round(totalQuantHE * 100) / 100;
  const estimatedCost = totalQuantCx * 5.95; // Average cost factor per SKU unit

  // SKU Pareto computation
  const skuMap: Record<string, { desc: string, quantCx: number, quantHE: number }> = {};
  filteredData.forEach(q => {
    if (!skuMap[q.codProduto]) {
      skuMap[q.codProduto] = { desc: q.descricao, quantCx: 0, quantHE: 0 };
    }
    skuMap[q.codProduto].quantCx += q.quantidade;
    skuMap[q.codProduto].quantHE += convertCxToHE(q.quantidade, q.descricao);
  });

  const sortedSkus = Object.entries(skuMap)
    .map(([cod, item]) => ({
      cod,
      desc: item.desc,
      quant: viewUnit === 'cx' ? item.quantCx : Math.round(item.quantHE * 100) / 100,
      quantCx: item.quantCx
    }))
    .sort((a, b) => b.quant - a.quant || b.quantCx - a.quantCx || a.cod.localeCompare(b.cod));

  const topSku = sortedSkus[0] || { cod: '-', desc: 'Nenhum', quant: 0, quantCx: 0 };
  const topSkuPct = totalQuantCx > 0 ? ((topSku.quantCx / totalQuantCx) * 100).toFixed(1) : '0';

  // Critical Area computation
  const areaVolumeMapCx: Record<string, number> = { 'ARMAZEM': 0, 'ENTREGA': 0, 'MERCADO': 0, 'PUXADA': 0 };
  const areaVolumeMapHE: Record<string, number> = { 'ARMAZEM': 0, 'ENTREGA': 0, 'MERCADO': 0, 'PUXADA': 0 };

  filteredData.forEach(q => {
    if (areaVolumeMapCx[q.area] !== undefined) {
      areaVolumeMapCx[q.area] += q.quantidade;
      areaVolumeMapHE[q.area] += convertCxToHE(q.quantidade, q.descricao);
    }
  });

  const areaVolumeMap = viewUnit === 'cx' ? areaVolumeMapCx : areaVolumeMapHE;

  const criticalAreaKey = Object.keys(areaVolumeMapCx).reduce((a, b) => areaVolumeMapCx[a] > areaVolumeMapCx[b] ? a : b, 'ARMAZEM');
  const criticalAreaName = {
    'ARMAZEM': 'Armazém / Depósito',
    'ENTREGA': 'Rota de Entrega',
    'MERCADO': 'Mercado / Retorno',
    'PUXADA': 'Puxada / Transferência'
  }[criticalAreaKey] || 'Nenhuma';

  // Motivos Pareto data
  const motivosMap: Record<string, { desc: string, val: number }> = {};
  filteredData.forEach(q => {
    const key = `${q.codQuebra} - ${q.motivo}`;
    if (!motivosMap[key]) {
      motivosMap[key] = { desc: q.motivo, val: 0 };
    }
    motivosMap[key].val += viewUnit === 'cx' ? q.quantidade : convertCxToHE(q.quantidade, q.descricao);
  });

  const motivosChartData = Object.entries(motivosMap)
    .map(([codMotivo, item]) => ({ name: codMotivo, value: Math.round(item.val * 100) / 100 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 7);

  // Embalagem Pareto Data
  const embalagemMap: Record<string, number> = {};
  filteredData.forEach(q => {
    const embName = getEmbalagemName(q.descricao);
    const val = viewUnit === 'cx' ? q.quantidade : convertCxToHE(q.quantidade, q.descricao);
    embalagemMap[embName] = (embalagemMap[embName] || 0) + val;
  });

  const embalagemChartData = Object.entries(embalagemMap)
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 7);

  const totalEmbalagemVolume = Math.round(embalagemChartData.reduce((acc, curr) => acc + curr.value, 0) * 100) / 100;
  const topEmbalagensPct = embalagemChartData.length > 0 && totalEmbalagemVolume > 0
    ? `${embalagemChartData[0].name} (${Math.round((embalagemChartData[0].value / totalEmbalagemVolume) * 100)}%)`
    : '';

  // Grupo Pareto Data
  const grupoMap: Record<string, number> = {};
  filteredData.forEach(q => {
    const gName = getGrupoName(q.descricao);
    const val = viewUnit === 'cx' ? q.quantidade : convertCxToHE(q.quantidade, q.descricao);
    grupoMap[gName] = (grupoMap[gName] || 0) + val;
  });

  const grupoChartData = Object.entries(grupoMap)
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 7);

  const totalGrupoVolume = Math.round(grupoChartData.reduce((acc, curr) => acc + curr.value, 0) * 100) / 100;
  const topGrupoPct = grupoChartData.length > 0 && totalGrupoVolume > 0
    ? `${grupoChartData[0].name} (${Math.round((grupoChartData[0].value / totalGrupoVolume) * 100)}%)`
    : '';

  // Area Chart Data
  const areaChartData = Object.entries(areaVolumeMap)
    .map(([key, value]) => {
      const name = {
        'ARMAZEM': 'Armazém',
        'ENTREGA': 'Rota Entrega',
        'MERCADO': 'Mercado',
        'PUXADA': 'Puxada/Transf'
      }[key] || key;
      return { name, value: Math.round(value * 100) / 100 };
    })
    .filter(item => item.value > 0);

  const COLORS = ['#ef4444', '#f5a623', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#6366f1'];

  // Trend Chart Data (Last 7 active days with entries)
  const daysMap: Record<string, number> = {};
  filteredData.forEach(q => {
    const day = q.data.substring(0, 5); // DD/MM
    daysMap[day] = (daysMap[day] || 0) + (viewUnit === 'cx' ? q.quantidade : convertCxToHE(q.quantidade, q.descricao));
  });

  const sortedDays = Object.entries(daysMap)
    .map(([date, value]) => ({ date, quebras: Math.round(value * 100) / 100 }))
    .sort((a, b) => {
      const [dayA, monthA] = a.date.split('/');
      const [dayB, monthB] = b.date.split('/');
      return `${monthA}-${dayA}`.localeCompare(`${monthB}-${dayB}`);
    })
    .slice(-10);

  // Turno Chart Data
  const turnoMap: Record<string, number> = { 'MANHÃ': 0, 'NOITE / MADRUGADA': 0 };
  filteredData.forEach(q => {
    const norm = q.turno.toUpperCase().includes('MANHÃ') ? 'MANHÃ' : 'NOITE / MADRUGADA';
    turnoMap[norm] = (turnoMap[norm] || 0) + (viewUnit === 'cx' ? q.quantidade : convertCxToHE(q.quantidade, q.descricao));
  });

  const turnoChartData = Object.entries(turnoMap).map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }));

  // Handle addition of 5W2H Action Plan
  const handleAddPlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlan.what || !newPlan.who || !newPlan.when) {
      alert('Preencha os campos obrigatórios (O quê, Quem e Quando).');
      return;
    }

    const plan: ActionPlan5W2H = {
      id: `plan-${Date.now()}`,
      ...newPlan
    };

    savePlanosToLocal([...planos, plan]);
    setNewPlan({
      what: '',
      why: '',
      who: '',
      where: '',
      when: '',
      how: '',
      howMuch: 0,
      status: 'Pendente',
      codeDPO: '539'
    });
    setShowAddPlan(false);
  };

  const handleDeletePlan = (id: string) => {
    if (confirm('Deseja realmente remover este plano de ação 5W2H?')) {
      const remaining = planos.filter(p => p.id !== id);
      savePlanosToLocal(remaining);
    }
  };

  const handleTogglePlanStatus = (id: string) => {
    const statuses: Array<ActionPlan5W2H['status']> = ['Pendente', 'Em Andamento', 'Concluído', 'Atrasado'];
    const updated = planos.map(p => {
      if (p.id === id) {
        const nextIdx = (statuses.indexOf(p.status) + 1) % statuses.length;
        return { ...p, status: statuses[nextIdx] };
      }
      return p;
    });
    savePlanosToLocal(updated);
  };

  return (
    <div id="quebras-dashboard-wrapper" className={`flex flex-col gap-4 p-4 lg:p-6 rounded-2xl shadow-sm border transition-colors duration-300 ${
      theme === 'dark' ? 'bg-[#0b1329] text-slate-100 border-slate-800' : 'bg-[#f8fafc] text-[#0f172a] border-gray-200/80'
    }`}>
      
      {/* HEADER BLOCK */}
      <div className={`flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b pb-5 transition-colors ${
        theme === 'dark' ? 'border-slate-800' : 'border-gray-200'
      }`}>
        <div className="flex items-center gap-3">
          {onBack && (
            <button 
              onClick={onBack}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer border-none ${
                theme === 'dark' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-200/80 text-gray-500'
              }`}
              title="Voltar"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className={`font-sans font-black text-2xl tracking-tight uppercase flex items-center gap-2 ${
              theme === 'dark' ? 'text-blue-300' : 'text-[#032b5e]'
            }`}>
              <AlertTriangle className="w-6 h-6 text-[#ef4444]" /> GESTÃO E RECOLHA DE QUEBRAS
            </h1>
            <p className={`text-[10px] tracking-wider font-bold uppercase mt-0.5 ${
              theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
            }`}>
              Painel Corporativo de Desempenho, Análise Pareto e Planos de Ação 5W2H
            </p>
          </div>
        </div>

        {/* Subtab Selector & Theme Toggle */}
        <div className="flex flex-wrap items-center gap-3">
          <div className={`flex items-center p-1 rounded-xl border transition-colors ${
            theme === 'dark' ? 'bg-[#131d38] border-slate-700/80' : 'bg-gray-100 border-gray-200/60'
          }`}>
            <button 
              onClick={() => setActiveSubTab('indicadores')}
              className={`px-4 py-1.5 rounded-lg font-sans font-bold text-[10px] uppercase tracking-wider transition-all border-none cursor-pointer ${
                activeSubTab === 'indicadores' 
                  ? (theme === 'dark' ? 'bg-blue-600 text-white shadow-sm' : 'bg-[#032b5e] text-white shadow-sm') 
                  : (theme === 'dark' ? 'text-slate-400 hover:text-white bg-transparent' : 'text-gray-500 hover:text-[#032b5e] bg-transparent')
              }`}
            >
              Quebras & BI
            </button>
            <button 
              onClick={() => setActiveSubTab('wqi')}
              className={`px-4 py-1.5 rounded-lg font-sans font-bold text-[10px] uppercase tracking-wider transition-all border-none cursor-pointer ${
                activeSubTab === 'wqi' 
                  ? (theme === 'dark' ? 'bg-blue-600 text-white shadow-sm' : 'bg-[#032b5e] text-white shadow-sm') 
                  : (theme === 'dark' ? 'text-slate-400 hover:text-white bg-transparent' : 'text-gray-500 hover:text-[#032b5e] bg-transparent')
              }`}
            >
              WQI
            </button>
            <button 
              onClick={() => setActiveSubTab('boarda3')}
              className={`px-4 py-1.5 rounded-lg font-sans font-bold text-[10px] uppercase tracking-wider transition-all border-none cursor-pointer ${
                activeSubTab === 'boarda3' 
                  ? (theme === 'dark' ? 'bg-blue-600 text-white shadow-sm' : 'bg-[#032b5e] text-white shadow-sm') 
                  : (theme === 'dark' ? 'text-slate-400 hover:text-white bg-transparent' : 'text-gray-500 hover:text-[#032b5e] bg-transparent')
              }`}
            >
              Quadro de Ações
            </button>
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border transition-all duration-300 cursor-pointer shadow-sm ${
              theme === 'dark' 
                ? 'bg-[#131d38] text-amber-300 border-slate-700/80 hover:bg-slate-800/80' 
                : 'bg-white text-slate-700 border-gray-200 hover:bg-slate-50'
            }`}
            title={theme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
          >
            {theme === 'dark' ? (
              <>
                <Moon className="w-4 h-4 text-amber-400 fill-amber-400/20" />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-200">Tema Escuro</span>
              </>
            ) : (
              <>
                <Sun className="w-4 h-4 text-amber-500 fill-amber-500/20" />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">Tema Claro</span>
              </>
            )}
          </button>
        </div>

      </div>

      {activeSubTab === 'indicadores' && (
        <>
          {/* FILTERS BAR */}
          <div className={`flex flex-wrap items-center justify-between gap-4 p-3.5 rounded-xl border shadow-sm transition-colors ${
            theme === 'dark' ? 'bg-[#131d38] border-slate-700/80 text-slate-100' : 'bg-white border-gray-200'
          }`}>
            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
              {/* Period selector */}
              <div className="flex flex-col gap-1 min-w-[260px]">
                <span className={`text-[9px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-gray-400'}`}>Período</span>
                <CalendarFilter
                  startDate={startDate}
                  endDate={endDate}
                  onChange={(start, end) => {
                    setStartDate(start);
                    setEndDate(end);
                  }}
                />
              </div>

              {/* Area filter */}
              <div className="flex flex-col gap-1 w-[160px]">
                <span className={`text-[9px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-gray-400'}`}>Área</span>
                <select 
                  value={filterArea} 
                  onChange={e => setFilterArea(e.target.value)} 
                  className={`w-full font-sans font-bold rounded-lg outline-none px-2.5 py-1 text-[10px] h-[28px] cursor-pointer transition-all ${
                    theme === 'dark' 
                      ? 'bg-[#1e2942] border border-slate-600 text-slate-100 hover:border-blue-400' 
                      : 'bg-white border border-gray-200 text-[#032b5e] hover:border-blue-400 focus:border-[#032b5e]'
                  }`}
                >
                  <option value="TODAS">Todas as Áreas</option>
                  <option value="ARMAZEM">Armazém / Depósito</option>
                  <option value="ENTREGA">Rota de Entrega</option>
                  <option value="MERCADO">Mercado / Retorno</option>
                  <option value="PUXADA">Puxada / Transferência</option>
                </select>
              </div>

              {/* Turno filter */}
              <div className="flex flex-col gap-1 w-[130px]">
                <span className={`text-[9px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-gray-400'}`}>Turno</span>
                <select 
                  value={filterTurno} 
                  onChange={e => setFilterTurno(e.target.value)} 
                  className={`w-full font-sans font-bold rounded-lg outline-none px-2.5 py-1 text-[10px] h-[28px] cursor-pointer transition-all ${
                    theme === 'dark' 
                      ? 'bg-[#1e2942] border border-slate-600 text-slate-100 hover:border-blue-400' 
                      : 'bg-white border border-gray-200 text-[#032b5e] hover:border-blue-400 focus:border-[#032b5e]'
                  }`}
                >
                  <option value="TODOS">Todos os Turnos</option>
                  <option value="MANHÃ">Manhã</option>
                  <option value="NOITE">Noite / Madrugada</option>
                </select>
              </div>

              {/* Embalagem filter */}
              <div className="flex flex-col gap-1 w-[140px]">
                <span className={`text-[9px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-gray-400'}`}>Embalagem</span>
                <select 
                  value={filterEmbalagem} 
                  onChange={e => setFilterEmbalagem(e.target.value)} 
                  className={`w-full font-sans font-bold rounded-lg outline-none px-2.5 py-1 text-[10px] h-[28px] cursor-pointer transition-all ${
                    theme === 'dark' 
                      ? 'bg-[#1e2942] border border-slate-600 text-slate-100 hover:border-blue-400' 
                      : 'bg-white border border-gray-200 text-[#032b5e] hover:border-blue-400 focus:border-[#032b5e]'
                  }`}
                >
                  <option value="TODAS">Todas Embalagens</option>
                  <option value="Garrafa 600ml">Garrafa 600ml</option>
                  <option value="Garrafa 300ml">Garrafa 300ml</option>
                  <option value="Lata 473ml">Lata 473ml</option>
                  <option value="Lata 350ml/269ml">Lata 350ml/269ml</option>
                  <option value="Long Neck">Long Neck</option>
                  <option value="Garrafa 1L">Garrafa 1L</option>
                  <option value="PET">PET</option>
                  <option value="Outras Embalagens">Outras Embalagens</option>
                </select>
              </div>

              {/* Grupo filter */}
              <div className="flex flex-col gap-1 w-[150px]">
                <span className={`text-[9px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-gray-400'}`}>Grupo de Produto</span>
                <select 
                  value={filterGrupo} 
                  onChange={e => setFilterGrupo(e.target.value)} 
                  className={`w-full font-sans font-bold rounded-lg outline-none px-2.5 py-1 text-[10px] h-[28px] cursor-pointer transition-all ${
                    theme === 'dark' 
                      ? 'bg-[#1e2942] border border-slate-600 text-slate-100 hover:border-blue-400' 
                      : 'bg-white border border-gray-200 text-[#032b5e] hover:border-blue-400 focus:border-[#032b5e]'
                  }`}
                >
                  <option value="TODOS">Todos os Grupos</option>
                  <option value="Cervejas">Cervejas</option>
                  <option value="Refrigerantes">Refrigerantes</option>
                  <option value="Energéticos & NABS">Energéticos & NABS</option>
                  <option value="Águas & Sucos">Águas & Sucos</option>
                  <option value="Destilados & Beats">Destilados & Beats</option>
                  <option value="Confeitaria / Outros">Confeitaria / Outros</option>
                </select>
              </div>

              {/* Visualização Unit Toggle */}
              <div className="flex flex-col gap-1">
                <span className={`text-[9px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-gray-400'}`}>Visualização</span>
                <div className={`flex items-center p-0.5 rounded-lg border h-[28px] min-w-[90px] ${
                  theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-gray-100 border-gray-200/60'
                }`}>
                  <button
                    type="button"
                    onClick={() => setViewUnit('cx')}
                    className={`flex-1 rounded-md font-sans font-black text-[10px] transition-all border-none cursor-pointer h-full flex items-center justify-center ${
                      viewUnit === 'cx' 
                        ? (theme === 'dark' ? 'bg-blue-600 text-white shadow-sm' : 'bg-[#032b5e] text-white shadow-sm') 
                        : 'text-slate-400 hover:text-white bg-transparent'
                    }`}
                  >
                    CX
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewUnit('he')}
                    className={`flex-1 rounded-md font-sans font-black text-[10px] transition-all border-none cursor-pointer h-full flex items-center justify-center ${
                      viewUnit === 'he' 
                        ? (theme === 'dark' ? 'bg-blue-600 text-white shadow-sm' : 'bg-[#032b5e] text-white shadow-sm') 
                        : 'text-slate-400 hover:text-white bg-transparent'
                    }`}
                  >
                    HE
                  </button>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-gray-400 font-bold uppercase hidden md:block">
              Filtros ativos para a visualização dos gráficos
            </div>
          </div>

      {/* TOP KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* KPI 1: Total Quebrada (unidades) */}
        <div className="bg-gradient-to-br from-[#ef4444] to-[#b91c1c] text-white p-4.5 rounded-xl shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[125px]">
          <div>
            <span className="text-[9px] uppercase font-black tracking-widest text-[#fecaca]/80 block">
              VOLUME TOTAL DE QUEBRAS
            </span>
            <div className="flex items-baseline mt-2">
              <span className="text-4xl font-extrabold tracking-tight">{totalQuant}</span>
              <span className="text-xs font-bold ml-1.5 text-[#fecaca]">{viewUnit === 'cx' ? 'unidades' : 'HE'}</span>
            </div>
          </div>
          <p className="text-[10px] text-red-100 font-medium leading-normal mt-2 border-t border-red-500/30 pt-2 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Meta Operacional da Unidade: Zero Perdas
          </p>
        </div>

        {/* KPI 2: Finance Impact */}
        <div className={`p-4.5 rounded-xl border shadow-sm flex flex-col justify-between min-h-[125px] transition-colors ${
          theme === 'dark' ? 'bg-[#131d38] border-slate-700/80 text-slate-100' : 'bg-white border-gray-200'
        }`}>
          <div>
            <span className={`text-[9px] uppercase font-black tracking-widest block ${theme === 'dark' ? 'text-slate-400' : 'text-gray-400'}`}>
              IMPACTO FINANCEIRO ESTIMADO
            </span>
            <span className={`text-3xl font-extrabold mt-2 block ${theme === 'dark' ? 'text-blue-300' : 'text-[#032b5e]'}`}>
              {estimatedCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
          <div className={`mt-2 border-t pt-2 ${theme === 'dark' ? 'border-slate-800' : 'border-gray-100'}`}>
            <span className="text-[10px] text-gray-400 font-bold block uppercase">
              Custo médio ponderado por SKU
            </span>
          </div>
        </div>

        {/* KPI 3: Principal SKU Ofensor */}
        <div className={`p-4.5 rounded-xl border shadow-sm flex flex-col justify-between min-h-[125px] transition-colors ${
          theme === 'dark' ? 'bg-[#131d38] border-slate-700/80 text-slate-100' : 'bg-white border-gray-200'
        }`}>
          <div>
            <span className={`text-[9px] uppercase font-black tracking-widest block ${theme === 'dark' ? 'text-slate-400' : 'text-gray-400'}`}>
              OFENSOR PRINCIPAL (80/20)
            </span>
            <span className="text-lg font-black text-[#f5a623] mt-2 block truncate uppercase" title={topSku.desc}>
              {topSku.desc}
            </span>
            <span className={`text-[10px] font-semibold mt-1 block ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
              Código: <strong className={theme === 'dark' ? 'text-slate-200' : 'text-gray-700'}>{topSku.cod}</strong>
            </span>
          </div>
          <div className={`mt-2 border-t pt-2 flex justify-between items-center text-[10px] font-bold uppercase ${
            theme === 'dark' ? 'border-slate-800 text-slate-400' : 'border-gray-100 text-gray-500'
          }`}>
            <span>Volumetria SKU</span>
            <span className="text-[#ef4444]">{topSku.quant} {viewUnit === 'cx' ? 'un' : 'HE'} ({topSkuPct}%)</span>
          </div>
        </div>

        {/* KPI 4: Área Mais Crítica */}
        <div className={`p-4.5 rounded-xl border shadow-sm flex flex-col justify-between min-h-[125px] transition-colors ${
          theme === 'dark' ? 'bg-[#131d38] border-slate-700/80 text-slate-100' : 'bg-white border-gray-200'
        }`}>
          <div>
            <span className={`text-[9px] uppercase font-black tracking-widest block ${theme === 'dark' ? 'text-slate-400' : 'text-gray-400'}`}>
              ÁREA OPERACIONAL CRÍTICA
            </span>
            <span className={`text-xl font-extrabold mt-2 block uppercase flex items-center gap-1 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>
              {criticalAreaKey === 'ARMAZEM' && <Archive className="w-5 h-5 text-amber-500" />}
              {criticalAreaKey === 'ENTREGA' && <Truck className="w-5 h-5 text-sky-500" />}
              {criticalAreaName}
            </span>
          </div>
          <div className={`mt-2 border-t pt-2 flex justify-between items-center text-[10px] font-bold uppercase ${
            theme === 'dark' ? 'border-slate-800 text-slate-400' : 'border-gray-100 text-gray-500'
          }`}>
            <span>Concentração</span>
            <span className={theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}>
              {totalQuant > 0 ? ((areaVolumeMap[criticalAreaKey] / totalQuant) * 100).toFixed(0) : 0}% de quebras
            </span>
          </div>
        </div>

      </div>

      {/* CHARTS CONTAINER - TOP ROW (3 CHARTS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* CHART 1: Pareto por Código DPO / Motivo */}
        <div className={`p-4.5 rounded-xl border shadow-sm flex flex-col justify-between gap-3 min-h-[340px] transition-colors ${
          theme === 'dark' ? 'bg-[#131d38] border-slate-700/80 text-slate-100' : 'bg-white border-gray-200'
        }`}>
          <div>
            <h3 className={`font-sans font-black text-[11px] uppercase tracking-wider flex items-center gap-1.5 ${
              theme === 'dark' ? 'text-blue-300' : 'text-[#032b5e]'
            }`}>
              <TrendingUp className="w-3.5 h-3.5 text-[#ef4444]" /> PERDAS POR MOTIVO
            </h3>
            <span className="text-[9px] text-gray-400 font-bold mt-0.5 block">
              Volume de perdas por motivo
            </span>
          </div>

          <div className="h-48 w-full">
            {motivosChartData.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                Sem registros para gerar o Pareto.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={motivosChartData} layout="vertical" margin={{ top: 5, right: 10, left: 15, bottom: 5 }} accessibilityLayer={false}>
                  <CartesianGrid stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} horizontal={false} />
                  <XAxis type="number" stroke={theme === 'dark' ? '#64748b' : '#94a3b8'} fontSize={8} tickLine={false} axisLine={false} />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    stroke={theme === 'dark' ? '#94a3b8' : '#475569'} 
                    fontSize={8} 
                    tickLine={false} 
                    axisLine={false} 
                    width={45}
                    tickFormatter={(val) => val.split(' — ')[0] || val} // Just show code
                  />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ 
                      backgroundColor: theme === 'dark' ? '#0f172a' : '#fff', 
                      border: theme === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0', 
                      borderRadius: '8px', 
                      fontSize: 9,
                      color: theme === 'dark' ? '#f8fafc' : '#0f172a'
                    }}
                    labelStyle={{ color: theme === 'dark' ? '#93c5fd' : '#032b5e', fontWeight: 'bold' }}
                    itemStyle={{ color: '#ef4444' }}
                  />
                  <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={12}>
                    {motivosChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className={`text-[9px] font-semibold border-t pt-1 text-center ${
            theme === 'dark' ? 'border-slate-800 text-slate-400' : 'border-gray-100 text-gray-400'
          }`}>
            Códigos conforme manual operacional
          </div>
        </div>

        {/* CHART 2: Perdas por Grupo / Embalagem */}
        <div className={`p-4.5 rounded-xl border shadow-sm flex flex-col justify-between gap-3 min-h-[340px] transition-colors ${
          theme === 'dark' ? 'bg-[#131d38] border-slate-700/80 text-slate-100' : 'bg-white border-gray-200'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`font-sans font-black text-[11px] uppercase tracking-wider flex items-center gap-1.5 ${
                  theme === 'dark' ? 'text-blue-300' : 'text-[#032b5e]'
                }`}>
                  <Package className="w-3.5 h-3.5 text-[#3b82f6]" /> {secondChartMode === 'grupo' ? 'PERDAS POR GRUPO' : 'PERDAS POR EMBALAGEM'}
                </h3>
              </div>
              <span className="text-[9px] text-gray-400 font-bold mt-0.5 block">
                {secondChartMode === 'grupo' ? 'Volume de perdas por grupo/categoria de produto' : 'Volume por tipo de vasilhame/lata'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Toggle Mode */}
              <div className={`flex items-center p-0.5 rounded-lg border text-[9px] font-bold ${
                theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-gray-100 border-gray-200'
              }`}>
                <button
                  type="button"
                  onClick={() => setSecondChartMode('grupo')}
                  className={`px-2 py-0.5 rounded-md transition-all border-none cursor-pointer ${
                    secondChartMode === 'grupo'
                      ? (theme === 'dark' ? 'bg-blue-600 text-white shadow-sm' : 'bg-[#032b5e] text-white shadow-sm')
                      : 'text-slate-400 hover:text-white bg-transparent'
                  }`}
                >
                  GRUPO
                </button>
                <button
                  type="button"
                  onClick={() => setSecondChartMode('embalagem')}
                  className={`px-2 py-0.5 rounded-md transition-all border-none cursor-pointer ${
                    secondChartMode === 'embalagem'
                      ? (theme === 'dark' ? 'bg-blue-600 text-white shadow-sm' : 'bg-[#032b5e] text-white shadow-sm')
                      : 'text-slate-400 hover:text-white bg-transparent'
                  }`}
                >
                  EMBALAGEM
                </button>
              </div>

              <span className={`text-[10px] font-mono font-black border px-2 py-0.5 rounded-md ${
                theme === 'dark' ? 'text-blue-300 bg-slate-800 border-slate-700' : 'text-[#032b5e] bg-slate-100 border-slate-200/80'
              }`}>
                {(secondChartMode === 'grupo' ? totalGrupoVolume : totalEmbalagemVolume).toLocaleString('pt-BR')} {viewUnit === 'cx' ? 'CX' : 'HL'}
              </span>
            </div>
          </div>

          <div className="h-48 w-full">
            {(secondChartMode === 'grupo' ? grupoChartData : embalagemChartData).length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                Sem registros para exibição.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={secondChartMode === 'grupo' ? grupoChartData : embalagemChartData} 
                  layout="vertical" 
                  margin={{ top: 5, right: 45, left: -5, bottom: 5 }} 
                  accessibilityLayer={false}
                >
                  <CartesianGrid stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" stroke="#94a3b8" fontSize={8} tickLine={false} axisLine={false} />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    stroke="#334155" 
                    fontSize={9}
                    fontWeight={700}
                    tickLine={false} 
                    axisLine={false} 
                    width={105}
                  />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: 10, color: '#fff' }}
                    labelStyle={{ color: '#38bdf8', fontWeight: 'bold' }}
                    itemStyle={{ color: '#cbd5e1' }}
                    formatter={(val: any) => [`${val.toLocaleString('pt-BR')} ${viewUnit === 'cx' ? 'CX' : 'HL'}`, 'Volume']}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={16}>
                    <LabelList 
                      dataKey="value" 
                      position="right" 
                      fontSize={9} 
                      fontWeight={800} 
                      fill="#032b5e" 
                      formatter={(val: number) => `${val.toLocaleString('pt-BR')}`} 
                    />
                    {(secondChartMode === 'grupo' ? grupoChartData : embalagemChartData).map((entry, index) => (
                      <Cell key={`cell-emb-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="text-[9px] text-gray-500 font-semibold border-t border-gray-100 pt-1.5 flex items-center justify-between">
            <span>{secondChartMode === 'grupo' ? 'Classificação por grupo de produto' : 'Classificação por vasilhame'}</span>
            {(secondChartMode === 'grupo' ? topGrupoPct : topEmbalagensPct) && (
              <span className="font-bold text-[#032b5e] font-mono">
                Maior: {secondChartMode === 'grupo' ? topGrupoPct : topEmbalagensPct}
              </span>
            )}
          </div>
        </div>

        {/* CHART 3: Distribuição por Área */}
        <div className="bg-white p-4.5 rounded-xl border border-gray-200/80 shadow-sm flex flex-col justify-between gap-3 min-h-[340px]">
          <div>
            <h3 className="font-sans font-black text-[11px] uppercase text-[#032b5e] tracking-wider">
              DISTRIBUIÇÃO POR ÁREA
            </h3>
            <span className="text-[9px] text-gray-400 font-bold mt-0.5 block">
              Origem física dos descartes
            </span>
          </div>

          <div className="h-32 w-full relative flex items-center justify-center">
            {areaChartData.length === 0 ? (
              <div className="text-xs text-gray-400">Sem dados</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={areaChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={48}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {areaChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ fontSize: 9 }}
                    itemStyle={{ fontSize: 9 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Legend Area indicators */}
          <div className="grid grid-cols-2 gap-1.5 border-t border-gray-100 pt-2.5">
            {areaChartData.map((entry, idx) => (
              <div key={entry.name} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                <span className="text-[8.5px] font-bold text-gray-600 uppercase tracking-tight truncate">
                  {entry.name}: <strong>{entry.value} u</strong>
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* CHARTS CONTAINER - BOTTOM ROW (2 CHARTS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">

        {/* CHART 4: Tendência Diária */}
        <div className="bg-white p-4.5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between gap-3 min-h-[340px]">
          <div>
            <h3 className="font-sans font-black text-[11px] uppercase text-[#032b5e] tracking-wider">
              TENDÊNCIA TEMPORAL (DIÁRIO)
            </h3>
            <span className="text-[9px] text-gray-400 font-bold mt-0.5 block">
              Acompanhamento de evolução volumétrica
            </span>
          </div>

          <div className="h-48 w-full">
            {sortedDays.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                Sem dados temporais.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sortedDays} margin={{ top: 5, right: 5, left: -30, bottom: 5 }}>
                  <CartesianGrid stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={8} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={8} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: 9 }}
                    labelStyle={{ color: '#032b5e', fontWeight: 'bold' }}
                    itemStyle={{ color: '#3b82f6' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="quebras" 
                    stroke="#ef4444" 
                    strokeWidth={2} 
                    activeDot={{ r: 5 }} 
                    dot={{ r: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="text-[9px] text-gray-400 font-semibold border-t border-gray-100 pt-1 text-center">
            Últimos 10 dias com lançamentos
          </div>
        </div>

        {/* CHART 5: Perdas por Turno */}
        <div className="bg-white p-4.5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between gap-3 min-h-[340px]">
          <div>
            <h3 className="font-sans font-black text-[11px] uppercase text-[#032b5e] tracking-wider">
              QUEBRAS POR TURNO
            </h3>
            <span className="text-[9px] text-gray-400 font-bold mt-0.5 block">
              Comparação Manhã x Noite
            </span>
          </div>

          <div className="h-32 w-full">
            {turnoChartData.every(t => t.value === 0) ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                Sem dados
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={turnoChartData} margin={{ top: 5, right: 5, left: -30, bottom: 5 }} accessibilityLayer={false}>
                  <CartesianGrid stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={8} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={8} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ fontSize: 9 }} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={25}>
                    <Cell fill="#f5a623" />
                    <Cell fill="#032b5e" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Quick stats on Shift */}
          <div className="flex justify-around items-center bg-slate-50 p-2 rounded-lg border border-gray-100">
            <div className="text-center">
              <span className="text-[8px] font-black text-[#f5a623] block">MANHÃ</span>
              <span className="text-[10px] font-extrabold text-[#334155]">{turnoMap['MANHÃ']} u</span>
            </div>
            <div className="w-[1px] h-5 bg-gray-200" />
            <div className="text-center">
              <span className="text-[8px] font-black text-[#032b5e] block">NOITE</span>
              <span className="text-[10px] font-extrabold text-[#334155]">{turnoMap['NOITE / MADRUGADA']} u</span>
            </div>
          </div>
        </div>

      </div>

      {false && activeSubTab === 'planos' && (
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
          <div>
            <h3 className="font-sans font-black text-xs uppercase text-[#032b5e] tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-emerald-500" /> PLANOS DE AÇÃO 5W2H (PADRÃO DE EXCELÊNCIA)
            </h3>
            <p className="text-[10px] text-gray-400 font-bold mt-0.5">
              Planos corretivos estruturados para mitigação das causas de quebra e avaria
            </p>
          </div>
          <button 
            onClick={() => setShowAddPlan(!showAddPlan)}
            className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white font-sans font-bold text-[10px] uppercase tracking-wider px-3 py-2 rounded-lg transition-all border-none cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Novo Plano
          </button>
        </div>

        {/* Expandable Form to add Action Plan */}
        {showAddPlan && (
          <form onSubmit={handleAddPlan} className="bg-slate-50/60 p-4 border border-gray-200 rounded-xl mb-4 text-xs flex flex-col gap-3">
            <h4 className="font-bold text-[#032b5e] uppercase text-[10px] tracking-wider mb-1">Cadastrar Plano de Ação</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">O quê (What) * - Ação de bloqueio</label>
                <input 
                  type="text" 
                  value={newPlan.what} 
                  onChange={e => setNewPlan({ ...newPlan, what: e.target.value })}
                  placeholder="Ex: Treinamento de reciclagem de empilhador..."
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs outline-none focus:border-[#3b82f6]"
                  required
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Por quê (Why) - Motivo / Código</label>
                <input 
                  type="text" 
                  value={newPlan.why} 
                  onChange={e => setNewPlan({ ...newPlan, why: e.target.value })}
                  placeholder="Ex: Desvios frequentes no picking de garrafas..."
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Quem (Who) *</label>
                <input 
                  type="text" 
                  value={newPlan.who} 
                  onChange={e => setNewPlan({ ...newPlan, who: e.target.value })}
                  placeholder="Responsável..."
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Onde (Where)</label>
                <input 
                  type="text" 
                  value={newPlan.where} 
                  onChange={e => setNewPlan({ ...newPlan, where: e.target.value })}
                  placeholder="Setor/Local..."
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs outline-none"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Quando (When) *</label>
                <input 
                  type="text" 
                  value={newPlan.when} 
                  onChange={e => setNewPlan({ ...newPlan, when: e.target.value })}
                  placeholder="Prazo (Ex: DD/MM/AAAA)"
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Cód Padrão Alvo</label>
                <input 
                  type="text" 
                  value={newPlan.codeDPO} 
                  onChange={e => setNewPlan({ ...newPlan, codeDPO: e.target.value })}
                  placeholder="Ex: 539, 533..."
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-8">
                <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Como (How)</label>
                <input 
                  type="text" 
                  value={newPlan.how} 
                  onChange={e => setNewPlan({ ...newPlan, how: e.target.value })}
                  placeholder="Método/Etapas de execução..."
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs outline-none"
                />
              </div>
              <div className="md:col-span-4">
                <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Quanto Custa (How Much) R$</label>
                <input 
                  type="number" 
                  value={newPlan.howMuch} 
                  onChange={e => setNewPlan({ ...newPlan, howMuch: parseFloat(e.target.value) || 0 })}
                  placeholder="Custo estimado..."
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs outline-none"
                />
              </div>
            </div>

            <button 
              type="submit"
              className="mt-1 self-end py-2 px-6 bg-[#032b5e] hover:bg-[#021f44] text-white font-sans font-bold text-[10px] uppercase tracking-wider rounded-lg transition-all border-none cursor-pointer"
            >
              Gravar Plano de Ação
            </button>
          </form>
        )}

        {/* 5W2H List Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse font-sans text-xs min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-200">
                <th className="p-3 text-gray-500 text-left uppercase tracking-wider text-[9px]">Código</th>
                <th className="p-3 text-gray-500 text-left uppercase tracking-wider text-[9px]">Ação (What) / Justificativa (Why)</th>
                <th className="p-3 text-gray-500 text-left uppercase tracking-wider text-[9px]">Quem / Onde</th>
                <th className="p-3 text-gray-500 text-center uppercase tracking-wider text-[9px]">Quando (Prazo)</th>
                <th className="p-3 text-gray-500 text-left uppercase tracking-wider text-[9px]">Método (How)</th>
                <th className="p-3 text-gray-500 text-right uppercase tracking-wider text-[9px]">Custo</th>
                <th className="p-3 text-gray-500 text-center uppercase tracking-wider text-[9px]">Status</th>
                <th className="p-3 text-gray-500 text-right uppercase tracking-wider text-[9px]">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {planos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-gray-400">Nenhum plano de ação de melhoria registrado.</td>
                </tr>
              ) : (
                planos.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-mono font-bold text-[#ef4444]">
                      {p.codeDPO ? `Cód ${p.codeDPO}` : 'GERAL'}
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-slate-800">{p.what}</div>
                      <div className="text-[10px] text-gray-500 italic mt-0.5">{p.why}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-700">{p.who}</div>
                      <div className="text-[10px] text-gray-400">{p.where || 'Geral'}</div>
                    </td>
                    <td className="p-3 text-center text-slate-700 font-bold whitespace-nowrap">
                      {p.when}
                    </td>
                    <td className="p-3 text-gray-500 leading-normal max-w-[200px] truncate" title={p.how}>
                      {p.how || '--'}
                    </td>
                    <td className="p-3 text-right font-semibold text-slate-700">
                      {p.howMuch > 0 ? p.howMuch.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00 (KAIZEN)'}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleTogglePlanStatus(p.id)}
                        className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider cursor-pointer border-none shadow-sm transition-all ${
                          p.status === 'Concluído' ? 'bg-emerald-100 text-emerald-800' :
                          p.status === 'Em Andamento' ? 'bg-blue-100 text-blue-800' :
                          p.status === 'Atrasado' ? 'bg-red-100 text-red-800' :
                          'bg-amber-100 text-amber-800'
                        }`}
                        title="Clique para alternar o status do plano"
                      >
                        {p.status}
                      </button>
                    </td>
                    <td className="p-3 text-right">
                      <button 
                        onClick={() => handleDeletePlan(p.id)}
                        className="p-1 hover:bg-red-50 text-red-500 rounded border-none cursor-pointer"
                        title="Excluir Plano"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* DETAILED SKU AND RECENT REGISTRIES TABS */}
      {activeSubTab === 'indicadores' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top SKU Ofensores Table */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="font-sans font-black text-xs uppercase text-[#032b5e] tracking-wider mb-3">
            RANKING DE PRODUTOS OFENSORES (SKUs)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse font-sans text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-200">
                  <th className="p-2 text-gray-500 text-left uppercase tracking-wider text-[9px]">Posição</th>
                  <th className="p-2 text-gray-500 text-left uppercase tracking-wider text-[9px]">Código</th>
                  <th className="p-2 text-gray-500 text-left uppercase tracking-wider text-[9px]">SKU Descrição</th>
                  <th className="p-2 text-gray-500 text-center uppercase tracking-wider text-[9px]">Unidades</th>
                  <th className="p-2 text-gray-500 text-right uppercase tracking-wider text-[9px]">Proporção</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedSkus.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-gray-400">Sem produtos no ranking</td>
                  </tr>
                ) : (
                  sortedSkus.slice(0, 7).map((item, index) => {
                    const pct = totalQuant > 0 ? ((item.quant / totalQuant) * 100).toFixed(1) : '0';
                    return (
                      <tr key={item.cod} className="hover:bg-slate-50/50">
                        <td className="p-2.5 font-bold text-slate-800">#{index + 1}</td>
                        <td className="p-2.5 font-mono font-bold text-slate-700">{item.cod}</td>
                        <td className="p-2.5 text-slate-700 font-semibold uppercase">{item.desc}</td>
                        <td className="p-2.5 text-center text-[#ef4444] font-black">{item.quant}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-gray-500">
                          {pct}%
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Registries List */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-sans font-black text-xs uppercase text-[#032b5e] tracking-wider mb-3">
              ÚLTIMOS LANÇAMENTOS DO PERÍODO
            </h3>
            <div className="overflow-x-auto max-h-[250px] overflow-y-auto">
              <table className="w-full border-collapse font-sans text-[11px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-200 sticky top-0">
                    <th className="p-2 text-gray-500 text-left uppercase tracking-wider text-[9px]">Data</th>
                    <th className="p-2 text-gray-500 text-left uppercase tracking-wider text-[9px]">SKU</th>
                    <th className="p-2 text-gray-500 text-center uppercase tracking-wider text-[9px]">Quantidade</th>
                    <th className="p-2 text-gray-500 text-left uppercase tracking-wider text-[9px]">Área / Turno</th>
                    <th className="p-2 text-gray-500 text-left uppercase tracking-wider text-[9px]">Código</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-gray-400">Nenhum registro encontrado</td>
                    </tr>
                  ) : (
                    filteredData.slice(0, 10).map((q, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-2 text-slate-600 font-medium">{q.data}</td>
                        <td className="p-2 text-slate-800">
                          <div className="font-bold">{q.codProduto}</div>
                          <div className="text-[9px] text-gray-400 uppercase truncate max-w-[130px]">{q.descricao}</div>
                        </td>
                        <td className="p-2 text-center text-red-600 font-extrabold">{q.quantidade}</td>
                        <td className="p-2 text-slate-700">
                          <div className="font-semibold text-[10px] uppercase">{q.area}</div>
                          <div className="text-[9px] text-gray-400 font-medium uppercase">{q.turno}</div>
                        </td>
                        <td className="p-2 font-mono font-bold text-[#f5a623]" title={q.motivo}>
                          {q.codQuebra}
                          {q.colaboradorQuebrou && (
                            <div className="text-[9px] text-red-500 font-extrabold uppercase mt-1" title={`Quebrado por: ${q.colaboradorQuebrou}`}>
                              👤 {q.colaboradorQuebrou}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-3">
            <span className="text-[10px] font-bold text-[#032b5e] uppercase">
              Total de registros exibidos: {Math.min(10, filteredData.length)} de {filteredData.length}
            </span>
          </div>
        </div>

      </div>
        </>
      )}

      </>
      )}

      {activeSubTab === 'wqi' && (
        <WqiTab 
          empresaId={empresa?.id || 'demo'}
          startDate={startDate}
          endDate={endDate}
          onDateChange={(start, end) => {
            setStartDate(start);
            setEndDate(end);
          }}
          viewUnit={viewUnit}
          theme={theme}
        />
      )}

      {activeSubTab === 'boarda3' && (
        <A3BoardComponent user={user} empresa={empresa} dashboard="quebras" />
      )}

      {/* FOOTER BLOCK */}
      <div className="flex items-center justify-between border-t border-gray-200 pt-4 mt-2">
        <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
          PADRÃO DE EXCELÊNCIA DE DEPÓSITO &amp; TRANSPORTE
        </span>
        <span className="text-[10px] text-gray-400 font-medium uppercase">
          Atualizado em tempo real • Versão 3.5.0
        </span>
      </div>

    </div>
  );
}
