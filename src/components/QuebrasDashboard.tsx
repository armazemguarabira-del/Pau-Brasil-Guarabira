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
  LabelList
} from 'recharts';
import { 
  AlertTriangle,
  ArrowLeft,
  TrendingUp,
  Package,
  Sun,
  Moon,
  Archive,
  Truck,
  Table,
  Layers
} from 'lucide-react';
import { Usuario, Empresa, QuebraRow } from '../types';
import { db } from '../firebase';
import { useEmpresaData } from '../context/EmpresaDataContext';
import { generateMockQuebras } from '../mockDataGenerator';
import A3BoardComponent from './A3BoardComponent';
import CalendarFilter from './CalendarFilter';
import WqiTab, { getItemHlInfo } from './WqiTab';
import { CrossFilterProvider, useCrossFilter, ActiveCrossFiltersBar } from '../context/CrossFilterContext';
import { CrosstabMatrix } from './CrosstabMatrix';

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

function QuebrasDashboardInner({ user, empresa, onBack }: QuebrasDashboardProps) {
  const { filters, toggleFilter, isFiltered, filterData } = useCrossFilter();

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
  const [filterMotivo, setFilterMotivo] = useState<string>('TODOS');
  const [secondChartMode, setSecondChartMode] = useState<'grupo' | 'embalagem'>('grupo');
  const [activeSubTab, setActiveSubTab] = useState<'indicadores' | 'wqi' | 'boarda3'>('indicadores');
  const [viewUnit, setViewUnit] = useState<'cx' | 'he'>(() => {
    return (localStorage.getItem('dashboard_view_unit') as 'cx' | 'he') || 'he';
  });

  useEffect(() => {
    localStorage.setItem('dashboard_view_unit', viewUnit);
  }, [viewUnit]);

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

  // Convert physical units to HE (Hectolitros) accurately
  const convertCxToHE = (quantidade: number, descricao: string = '', codProduto?: string | number): number => {
    return getItemHlInfo({ quantidade, descricao, codProduto: codProduto ? String(codProduto) : undefined }).totalHl;
  };
  
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

  const availableMotivos = useMemo(() => {
    const map = new Map<string, string>();
    quebras.forEach(q => {
      const cod = String(q.codQuebra || '').trim();
      const mot = (q.motivo || '').trim();
      if (cod && mot) {
        map.set(cod, `[${cod}] ${mot}`);
      } else if (mot) {
        map.set(mot, mot);
      } else if (cod) {
        map.set(cod, `Código ${cod}`);
      }
    });

    if (!map.has('539')) map.set('539', '[539] Quebra com Movimentação');
    if (!map.has('540')) map.set('540', '[540] Avaria Física / Manuseio');
    if (!map.has('541')) map.set('541', '[541] Choque de Palete');
    if (!map.has('557')) map.set('557', '[557] Quebra na Entrega / Rota');
    if (!map.has('589')) map.set('589', '[589] Quebra em Transferência');

    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [quebras]);

  // Header Dropdown Filter Logic
  const baseFilteredData = useMemo(() => {
    return quebras.filter(q => {
      if (filterArea !== 'TODAS' && q.area !== filterArea) return false;
      if (filterTurno !== 'TODOS' && q.turno !== filterTurno) return false;
      if (filterEmbalagem !== 'TODAS' && getEmbalagemName(q.descricao) !== filterEmbalagem) return false;
      if (filterGrupo !== 'TODOS' && getGrupoName(q.descricao) !== filterGrupo) return false;
      if (filterMotivo !== 'TODOS') {
        const cod = String(q.codQuebra || '').trim();
        const mot = (q.motivo || '').trim().toUpperCase();
        const filterUpper = filterMotivo.toUpperCase();
        
        const match = cod === filterMotivo || mot === filterUpper || mot.includes(filterUpper) || `${cod} - ${q.motivo}`.toUpperCase().includes(filterUpper);
        if (!match) return false;
      }
      
      if (startDate || endDate) {
        let rowISO = '';
        if (q.dataISO) {
          rowISO = q.dataISO.split('T')[0];
        } else if (q.data) {
          if (q.data.includes('/')) {
            const parts = q.data.split('/');
            if (parts.length === 3) {
              const yyyy = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
              rowISO = `${yyyy}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
          } else if (q.data.includes('-')) {
            rowISO = q.data.split('T')[0];
          }
        }
        if (rowISO) {
          if (startDate && rowISO < startDate) return false;
          if (endDate && rowISO > endDate) return false;
        }
      }
      return true;
    });
  }, [quebras, filterArea, filterTurno, filterEmbalagem, filterGrupo, filterMotivo, startDate, endDate]);

  // Full Cross-Filtered Data for KPIs and Tables
  const crossFilteredData = useMemo(() => {
    return filterData(baseFilteredData);
  }, [baseFilteredData, filterData]);

  // Dimension-specific datasets for charts (excluding own dimension so chart elements stay visible)
  const motivosData = useMemo(() => {
    return filterData(baseFilteredData, undefined, 'motivo');
  }, [baseFilteredData, filterData]);

  const grupoData = useMemo(() => {
    return filterData(baseFilteredData, undefined, 'grupo');
  }, [baseFilteredData, filterData]);

  const embalagemData = useMemo(() => {
    return filterData(baseFilteredData, undefined, 'embalagem');
  }, [baseFilteredData, filterData]);

  const areaData = useMemo(() => {
    return filterData(baseFilteredData, undefined, 'area');
  }, [baseFilteredData, filterData]);

  const timelineData = useMemo(() => {
    return filterData(baseFilteredData, undefined, 'data');
  }, [baseFilteredData, filterData]);

  const turnoData = useMemo(() => {
    return filterData(baseFilteredData, undefined, 'turno');
  }, [baseFilteredData, filterData]);

  // Filter status flags for cross-filter opacity highlighting
  const isMotivoFiltered = isFiltered('motivo') || isFiltered('codQuebra');
  const isGrupoFiltered = isFiltered('grupo');
  const isEmbalagemFiltered = isFiltered('embalagem');
  const isAreaFiltered = isFiltered('area');
  const isTurnoFiltered = isFiltered('turno');

  // Metric Calculation from crossFilteredData
  const totalQuantCx = crossFilteredData.reduce((acc, curr) => acc + curr.quantidade, 0);
  const totalQuantHE = crossFilteredData.reduce((acc, curr) => acc + convertCxToHE(curr.quantidade, curr.descricao, curr.codProduto), 0);
  const totalQuant = viewUnit === 'cx' ? totalQuantCx : Math.round(totalQuantHE * 100) / 100;
  const estimatedCost = totalQuantCx * 5.95;

  // SKU Pareto computation
  const sortedSkus = useMemo(() => {
    const skuMap: Record<string, { desc: string, quantCx: number, quantHE: number }> = {};
    crossFilteredData.forEach(q => {
      if (!skuMap[q.codProduto]) {
        skuMap[q.codProduto] = { desc: q.descricao, quantCx: 0, quantHE: 0 };
      }
      skuMap[q.codProduto].quantCx += q.quantidade;
      skuMap[q.codProduto].quantHE += convertCxToHE(q.quantidade, q.descricao, q.codProduto);
    });

    return Object.entries(skuMap)
      .map(([cod, item]) => ({
        cod,
        desc: item.desc,
        quant: viewUnit === 'cx' ? item.quantCx : Math.round(item.quantHE * 100) / 100,
        quantCx: item.quantCx
      }))
      .sort((a, b) => b.quant - a.quant || b.quantCx - a.quantCx || a.cod.localeCompare(b.cod));
  }, [crossFilteredData, viewUnit]);

  const topSku = sortedSkus[0] || { cod: '-', desc: 'Nenhum', quant: 0, quantCx: 0 };
  const topSkuPct = totalQuantCx > 0 ? ((topSku.quantCx / totalQuantCx) * 100).toFixed(1) : '0';

  // Critical Area computation
  const { areaVolumeMap, criticalAreaKey, criticalAreaName } = useMemo(() => {
    const areaMapCx: Record<string, number> = { 'ARMAZEM': 0, 'ENTREGA': 0, 'MERCADO': 0, 'PUXADA': 0 };
    const areaMapHE: Record<string, number> = { 'ARMAZEM': 0, 'ENTREGA': 0, 'MERCADO': 0, 'PUXADA': 0 };

    crossFilteredData.forEach(q => {
      if (areaMapCx[q.area] !== undefined) {
        areaMapCx[q.area] += q.quantidade;
        areaMapHE[q.area] += convertCxToHE(q.quantidade, q.descricao, q.codProduto);
      }
    });

    const activeMap = viewUnit === 'cx' ? areaMapCx : areaMapHE;
    const cKey = Object.keys(areaMapCx).reduce((a, b) => areaMapCx[a] > areaMapCx[b] ? a : b, 'ARMAZEM');
    const cName = {
      'ARMAZEM': 'Armazém / Depósito',
      'ENTREGA': 'Rota de Entrega',
      'MERCADO': 'Mercado / Retorno',
      'PUXADA': 'Puxada / Transferência'
    }[cKey] || 'Nenhuma';

    return { areaVolumeMap: activeMap, criticalAreaKey: cKey, criticalAreaName: cName };
  }, [crossFilteredData, viewUnit]);

  // Motivos Chart Data (computed from motivosData)
  const motivosChartData = useMemo(() => {
    const map: Record<string, { desc: string, val: number, rawMotivo: string }> = {};
    motivosData.forEach(q => {
      const rawMot = q.motivo || q.codQuebra || 'Outros';
      const key = `${q.codQuebra} - ${q.motivo}`;
      if (!map[key]) {
        map[key] = { desc: q.motivo, val: 0, rawMotivo: rawMot };
      }
      map[key].val += viewUnit === 'cx' ? q.quantidade : convertCxToHE(q.quantidade, q.descricao, q.codProduto);
    });

    return Object.entries(map)
      .map(([codMotivo, item]) => ({
        name: codMotivo,
        rawMotivo: item.rawMotivo,
        value: Math.round(item.val * 100) / 100
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  }, [motivosData, viewUnit]);

  // Embalagem Chart Data (computed from embalagemData)
  const embalagemChartData = useMemo(() => {
    const map: Record<string, number> = {};
    embalagemData.forEach(q => {
      const embName = getEmbalagemName(q.descricao);
      const val = viewUnit === 'cx' ? q.quantidade : convertCxToHE(q.quantidade, q.descricao, q.codProduto);
      map[embName] = (map[embName] || 0) + val;
    });

    return Object.entries(map)
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  }, [embalagemData, viewUnit]);

  const totalEmbalagemVolume = Math.round(embalagemChartData.reduce((acc, curr) => acc + curr.value, 0) * 100) / 100;
  const topEmbalagensPct = embalagemChartData.length > 0 && totalEmbalagemVolume > 0
    ? `${embalagemChartData[0].name} (${Math.round((embalagemChartData[0].value / totalEmbalagemVolume) * 100)}%)`
    : '';

  // Grupo Chart Data (computed from grupoData)
  const grupoChartData = useMemo(() => {
    const map: Record<string, number> = {};
    grupoData.forEach(q => {
      const gName = getGrupoName(q.descricao);
      const val = viewUnit === 'cx' ? q.quantidade : convertCxToHE(q.quantidade, q.descricao, q.codProduto);
      map[gName] = (map[gName] || 0) + val;
    });

    return Object.entries(map)
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  }, [grupoData, viewUnit]);

  const totalGrupoVolume = Math.round(grupoChartData.reduce((acc, curr) => acc + curr.value, 0) * 100) / 100;
  const topGrupoPct = grupoChartData.length > 0 && totalGrupoVolume > 0
    ? `${grupoChartData[0].name} (${Math.round((grupoChartData[0].value / totalGrupoVolume) * 100)}%)`
    : '';

  // Area Chart Data (computed from areaData)
  const areaChartData = useMemo(() => {
    const map: Record<string, number> = { 'ARMAZEM': 0, 'ENTREGA': 0, 'MERCADO': 0, 'PUXADA': 0 };
    areaData.forEach(q => {
      if (map[q.area] !== undefined) {
        map[q.area] += viewUnit === 'cx' ? q.quantidade : convertCxToHE(q.quantidade, q.descricao, q.codProduto);
      }
    });

    return Object.entries(map)
      .map(([key, value]) => {
        const name = {
          'ARMAZEM': 'Armazém',
          'ENTREGA': 'Rota Entrega',
          'MERCADO': 'Mercado',
          'PUXADA': 'Puxada/Transf'
        }[key] || key;
        return { name, rawArea: key, value: Math.round(value * 100) / 100 };
      })
      .filter(item => item.value > 0);
  }, [areaData, viewUnit]);

  const COLORS = ['#ef4444', '#f5a623', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#6366f1'];

  // Trend Chart Data (computed from timelineData)
  const sortedDays = useMemo(() => {
    const map: Record<string, number> = {};
    timelineData.forEach(q => {
      const day = q.data ? q.data.substring(0, 5) : ''; // DD/MM
      if (day) {
        map[day] = (map[day] || 0) + (viewUnit === 'cx' ? q.quantidade : convertCxToHE(q.quantidade, q.descricao, q.codProduto));
      }
    });

    return Object.entries(map)
      .map(([date, value]) => ({ date, quebras: Math.round(value * 100) / 100 }))
      .sort((a, b) => {
        const [dayA, monthA] = a.date.split('/');
        const [dayB, monthB] = b.date.split('/');
        return `${monthA}-${dayA}`.localeCompare(`${monthB}-${dayB}`);
      });
  }, [timelineData, viewUnit]);

  // Turno Chart Data (computed from turnoData)
  const { turnoChartData, turnoMap } = useMemo(() => {
    const tMap: Record<string, number> = { 'MANHÃ': 0, 'NOITE / MADRUGADA': 0 };
    turnoData.forEach(q => {
      const norm = q.turno.toUpperCase().includes('MANHÃ') ? 'MANHÃ' : 'NOITE / MADRUGADA';
      tMap[norm] = (tMap[norm] || 0) + (viewUnit === 'cx' ? q.quantidade : convertCxToHE(q.quantidade, q.descricao, q.codProduto));
    });

    const cData = Object.entries(tMap).map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }));
    return { turnoChartData: cData, turnoMap: tMap };
  }, [turnoData, viewUnit]);

  // Active CrossFilter indicators
  const isDateFiltered = isFiltered('data');

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
              Painel Corporativo de Desempenho, Análise Pareto, Matriz Cruzada e Planos de Ação 5W2H
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
          {/* HEADER DROPDOWN FILTERS */}
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

              {/* Motivo filter */}
              <div className="flex flex-col gap-1 w-[170px]">
                <span className={`text-[9px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-gray-400'}`}>Motivo da Quebra</span>
                <select 
                  value={filterMotivo} 
                  onChange={e => setFilterMotivo(e.target.value)} 
                  className={`w-full font-sans font-bold rounded-lg outline-none px-2.5 py-1 text-[10px] h-[28px] cursor-pointer transition-all ${
                    theme === 'dark' 
                      ? 'bg-[#1e2942] border border-slate-600 text-slate-100 hover:border-blue-400' 
                      : 'bg-white border border-gray-200 text-[#032b5e] hover:border-blue-400 focus:border-[#032b5e]'
                  }`}
                >
                  <option value="TODOS">Todos os Motivos</option>
                  {availableMotivos.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
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
                    UN
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

          {/* ACTIVE CROSS-FILTERS TOOLBAR BANNER */}
          <ActiveCrossFiltersBar />

          {/* TOP KPI CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* KPI 1: Total Quebrada */}
            <div className="bg-gradient-to-br from-[#ef4444] to-[#b91c1c] text-white p-4.5 rounded-xl shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[125px]">
              <div>
                <span className="text-[9px] uppercase font-black tracking-widest text-[#fecaca]/80 block">
                  VOLUME TOTAL DE QUEBRAS
                </span>
                <div className="flex items-baseline mt-2">
                  <span className="text-4xl font-extrabold tracking-tight">
                    {viewUnit === 'cx' 
                      ? totalQuantCx.toLocaleString('pt-BR') 
                      : totalQuant.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
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
                  Clique na barra para filtrar por motivo
                </span>
              </div>

              <div className="h-48 w-full cursor-pointer">
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
                        tickFormatter={(val) => val.split(' — ')[0] || val}
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
                      <Bar 
                        dataKey="value" 
                        radius={[0, 4, 4, 0]} 
                        barSize={12}
                        onClick={(entry) => {
                          if (entry && entry.name) {
                            toggleFilter('motivo', entry.name, 'Motivo');
                          }
                        }}
                      >
                        {motivosChartData.map((entry, index) => {
                          const isSelected = isFiltered('motivo', entry.name);
                          const opacity = isMotivoFiltered ? (isSelected ? 1.0 : 0.3) : 1.0;
                          return (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={COLORS[index % COLORS.length]} 
                              fillOpacity={opacity}
                              stroke={isSelected ? '#032b5e' : undefined}
                              strokeWidth={isSelected ? 2 : 0}
                            />
                          );
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className={`text-[9px] font-semibold border-t pt-1 flex items-center justify-between ${
                theme === 'dark' ? 'border-slate-800 text-slate-400' : 'border-gray-100 text-gray-400'
              }`}>
                <span>Códigos conforme manual DPO</span>
                {isMotivoFiltered && (
                  <span className="text-amber-600 font-bold uppercase text-[8px]">Filtro Ativo</span>
                )}
              </div>
            </div>

            {/* CHART 2: Perdas por Grupo */}
            <div className={`p-4.5 rounded-xl border shadow-sm flex flex-col justify-between gap-3 min-h-[340px] transition-colors ${
              theme === 'dark' ? 'bg-[#131d38] border-slate-700/80 text-slate-100' : 'bg-white border-gray-200'
            }`}>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className={`font-sans font-black text-[11px] uppercase tracking-wider flex items-center gap-1.5 ${
                    theme === 'dark' ? 'text-blue-300' : 'text-[#032b5e]'
                  }`}>
                    <Package className="w-3.5 h-3.5 text-[#3b82f6]" /> PERDAS POR GRUPO
                  </h3>
                  <span className="text-[9px] text-gray-400 font-bold mt-0.5 block">
                    Clique na barra para cruzar os filtros
                  </span>
                </div>

                <span className={`text-[10px] font-mono font-black border px-2 py-0.5 rounded-md ${
                  theme === 'dark' ? 'text-blue-300 bg-slate-800 border-slate-700' : 'text-[#032b5e] bg-slate-100 border-slate-200/80'
                }`}>
                  {totalGrupoVolume.toLocaleString('pt-BR')} {viewUnit === 'cx' ? 'UN' : 'HL'}
                </span>
              </div>

              <div className="h-48 w-full cursor-pointer">
                {grupoChartData.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                    Sem registros para exibição.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={grupoChartData} 
                      layout="vertical" 
                      margin={{ top: 5, right: 45, left: -5, bottom: 5 }} 
                      accessibilityLayer={false}
                    >
                      <CartesianGrid stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} horizontal={false} />
                      <XAxis type="number" stroke={theme === 'dark' ? '#64748b' : '#94a3b8'} fontSize={8} tickLine={false} axisLine={false} />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        stroke={theme === 'dark' ? '#cbd5e1' : '#334155'} 
                        fontSize={9}
                        fontWeight={700}
                        tickLine={false} 
                        axisLine={false} 
                        width={105}
                      />
                      <Tooltip 
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{ 
                          backgroundColor: theme === 'dark' ? '#0f172a' : '#fff', 
                          border: theme === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0', 
                          borderRadius: '8px', 
                          fontSize: 10, 
                          color: theme === 'dark' ? '#f8fafc' : '#0f172a' 
                        }}
                        labelStyle={{ color: theme === 'dark' ? '#38bdf8' : '#032b5e', fontWeight: 'bold' }}
                        itemStyle={{ color: '#38bdf8' }}
                        formatter={(val: any) => [`${val.toLocaleString('pt-BR')} ${viewUnit === 'cx' ? 'UN' : 'HL'}`, 'Volume']}
                      />
                      <Bar 
                        dataKey="value" 
                        radius={[0, 6, 6, 0]} 
                        barSize={16}
                        onClick={(entry) => {
                          if (entry && entry.name) {
                            toggleFilter('grupo', entry.name, 'Grupo');
                          }
                        }}
                      >
                        <LabelList 
                          dataKey="value" 
                          position="right" 
                          fontSize={9} 
                          fontWeight={800} 
                          fill={theme === 'dark' ? '#93c5fd' : '#032b5e'} 
                          formatter={(val: number) => `${val.toLocaleString('pt-BR')}`} 
                        />
                        {grupoChartData.map((entry, index) => {
                          const isSelected = isFiltered('grupo', entry.name);
                          const opacity = isGrupoFiltered ? (isSelected ? 1.0 : 0.3) : 1.0;
                          return (
                            <Cell 
                              key={`cell-grp-${index}`} 
                              fill={COLORS[(index + 2) % COLORS.length]} 
                              fillOpacity={opacity}
                              stroke={isSelected ? (theme === 'dark' ? '#38bdf8' : '#032b5e') : undefined}
                              strokeWidth={isSelected ? 2 : 0}
                            />
                          );
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className={`text-[9px] font-semibold border-t pt-1.5 flex items-center justify-between ${
                theme === 'dark' ? 'border-slate-800 text-slate-400' : 'border-gray-100 text-gray-500'
              }`}>
                <span>Classificação por grupo de produto</span>
                {topGrupoPct && (
                  <span className={`font-bold font-mono ${theme === 'dark' ? 'text-blue-300' : 'text-[#032b5e]'}`}>
                    Maior: {topGrupoPct}
                  </span>
                )}
              </div>
            </div>

            {/* CHART 3: Distribuição por Área */}
            <div className={`p-4.5 rounded-xl border shadow-sm flex flex-col justify-between gap-3 min-h-[340px] transition-colors ${
              theme === 'dark' ? 'bg-[#131d38] border-slate-700/80 text-slate-100' : 'bg-white border-gray-200'
            }`}>
              <div>
                <h3 className={`font-sans font-black text-[11px] uppercase tracking-wider ${
                  theme === 'dark' ? 'text-blue-300' : 'text-[#032b5e]'
                }`}>
                  DISTRIBUIÇÃO POR ÁREA
                </h3>
                <span className="text-[9px] text-gray-400 font-bold mt-0.5 block">
                  Clique na fatia para filtrar por setor físico
                </span>
              </div>

              <div className="h-32 w-full relative flex items-center justify-center cursor-pointer">
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
                        onClick={(entry: any) => {
                          if (entry && (entry.rawArea || entry.name)) {
                            toggleFilter('area', entry.rawArea || entry.name, 'Área');
                          }
                        }}
                      >
                        {areaChartData.map((entry, index) => {
                          const isSelected = isFiltered('area', entry.rawArea) || isFiltered('area', entry.name);
                          const opacity = isAreaFiltered ? (isSelected ? 1.0 : 0.3) : 1.0;
                          return (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={COLORS[index % COLORS.length]} 
                              fillOpacity={opacity}
                              stroke={isSelected ? '#032b5e' : '#fff'}
                              strokeWidth={isSelected ? 2.5 : 1}
                            />
                          );
                        })}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: theme === 'dark' ? '#0f172a' : '#fff', 
                          border: theme === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0', 
                          borderRadius: '8px', 
                          fontSize: 9,
                          color: theme === 'dark' ? '#f8fafc' : '#0f172a'
                        }} 
                        itemStyle={{ fontSize: 9 }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Legend Area indicators */}
              <div className={`grid grid-cols-2 gap-1.5 border-t pt-2.5 ${
                theme === 'dark' ? 'border-slate-800' : 'border-gray-100'
              }`}>
                {areaChartData.map((entry, idx) => {
                  const isSelected = isFiltered('area', entry.rawArea) || isFiltered('area', entry.name);
                  return (
                    <div 
                      key={entry.name} 
                      onClick={() => toggleFilter('area', entry.rawArea || entry.name, 'Área')}
                      className={`flex items-center gap-1 cursor-pointer p-1 rounded-md transition-colors ${
                        isSelected 
                          ? (theme === 'dark' ? 'bg-amber-500/20 border border-amber-400/50' : 'bg-amber-100 border border-amber-300') 
                          : (theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-slate-100')
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span className={`text-[8.5px] font-bold uppercase tracking-tight truncate ${
                        theme === 'dark' ? 'text-slate-300' : 'text-gray-600'
                      }`}>
                        {entry.name}: <strong>{entry.value} u</strong>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* CHARTS CONTAINER - BOTTOM ROW (3 CHARTS: TENDÊNCIA, EMBALAGEM, TURNO) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-1">

            {/* CHART 4: Tendência Diária */}
            <div className={`p-4.5 rounded-xl border shadow-sm flex flex-col justify-between gap-3 min-h-[340px] transition-colors ${
              theme === 'dark' ? 'bg-[#131d38] border-slate-700/80 text-slate-100' : 'bg-white border-gray-200'
            }`}>
              <div>
                <h3 className={`font-sans font-black text-[11px] uppercase tracking-wider ${
                  theme === 'dark' ? 'text-blue-300' : 'text-[#032b5e]'
                }`}>
                  TENDÊNCIA TEMPORAL (DIÁRIO)
                </h3>
                <span className="text-[9px] text-gray-400 font-bold mt-0.5 block">
                  Acompanhamento de evolução volumétrica
                </span>
              </div>

              <div className="h-48 w-full cursor-pointer">
                {sortedDays.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                    Sem dados temporais.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sortedDays} margin={{ top: 5, right: 5, left: -30, bottom: 5 }}>
                      <CartesianGrid stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} vertical={false} />
                      <XAxis dataKey="date" stroke={theme === 'dark' ? '#64748b' : '#94a3b8'} fontSize={8} tickLine={false} axisLine={false} />
                      <YAxis stroke={theme === 'dark' ? '#64748b' : '#94a3b8'} fontSize={8} tickLine={false} axisLine={false} />
                      <Tooltip 
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
                      <Line 
                        type="monotone" 
                        dataKey="quebras" 
                        stroke="#ef4444" 
                        strokeWidth={2} 
                        activeDot={{ 
                          r: 6, 
                          onClick: (e, payload: any) => {
                            if (payload && payload.payload && payload.payload.date) {
                              toggleFilter('data', payload.payload.date, 'Data');
                            }
                          }
                        }} 
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className={`text-[9px] text-gray-400 font-semibold border-t pt-1 text-center ${
                theme === 'dark' ? 'border-slate-800' : 'border-gray-100'
              }`}>
                {sortedDays.length > 0 
                  ? `Exibindo todas as ${sortedDays.length} datas com lançamentos`
                  : 'Sem lançamentos no período'}
              </div>
            </div>

            {/* CHART 5: Perdas por Embalagem */}
            <div className={`p-4.5 rounded-xl border shadow-sm flex flex-col justify-between gap-3 min-h-[340px] transition-colors ${
              theme === 'dark' ? 'bg-[#131d38] border-slate-700/80 text-slate-100' : 'bg-white border-gray-200'
            }`}>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className={`font-sans font-black text-[11px] uppercase tracking-wider flex items-center gap-1.5 ${
                    theme === 'dark' ? 'text-blue-300' : 'text-[#032b5e]'
                  }`}>
                    <Package className="w-3.5 h-3.5 text-[#10b981]" /> PERDAS POR EMBALAGEM
                  </h3>
                  <span className="text-[9px] text-gray-400 font-bold mt-0.5 block">
                    Clique na barra para cruzar os filtros
                  </span>
                </div>

                <span className={`text-[10px] font-mono font-black border px-2 py-0.5 rounded-md ${
                  theme === 'dark' ? 'text-blue-300 bg-slate-800 border-slate-700' : 'text-[#032b5e] bg-slate-100 border-slate-200/80'
                }`}>
                  {totalEmbalagemVolume.toLocaleString('pt-BR')} {viewUnit === 'cx' ? 'UN' : 'HL'}
                </span>
              </div>

              <div className="h-48 w-full cursor-pointer">
                {embalagemChartData.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                    Sem registros para exibição.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={embalagemChartData} 
                      layout="vertical" 
                      margin={{ top: 5, right: 45, left: -5, bottom: 5 }} 
                      accessibilityLayer={false}
                    >
                      <CartesianGrid stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} horizontal={false} />
                      <XAxis type="number" stroke={theme === 'dark' ? '#64748b' : '#94a3b8'} fontSize={8} tickLine={false} axisLine={false} />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        stroke={theme === 'dark' ? '#cbd5e1' : '#334155'} 
                        fontSize={9}
                        fontWeight={700}
                        tickLine={false} 
                        axisLine={false} 
                        width={105}
                      />
                      <Tooltip 
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{ 
                          backgroundColor: theme === 'dark' ? '#0f172a' : '#fff', 
                          border: theme === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0', 
                          borderRadius: '8px', 
                          fontSize: 10, 
                          color: theme === 'dark' ? '#f8fafc' : '#0f172a' 
                        }}
                        labelStyle={{ color: theme === 'dark' ? '#38bdf8' : '#032b5e', fontWeight: 'bold' }}
                        itemStyle={{ color: '#38bdf8' }}
                        formatter={(val: any) => [`${val.toLocaleString('pt-BR')} ${viewUnit === 'cx' ? 'UN' : 'HL'}`, 'Volume']}
                      />
                      <Bar 
                        dataKey="value" 
                        radius={[0, 6, 6, 0]} 
                        barSize={16}
                        onClick={(entry) => {
                          if (entry && entry.name) {
                            toggleFilter('embalagem', entry.name, 'Embalagem');
                          }
                        }}
                      >
                        <LabelList 
                          dataKey="value" 
                          position="right" 
                          fontSize={9} 
                          fontWeight={800} 
                          fill={theme === 'dark' ? '#93c5fd' : '#032b5e'} 
                          formatter={(val: number) => `${val.toLocaleString('pt-BR')}`} 
                        />
                        {embalagemChartData.map((entry, index) => {
                          const isSelected = isFiltered('embalagem', entry.name);
                          const opacity = isEmbalagemFiltered ? (isSelected ? 1.0 : 0.3) : 1.0;
                          return (
                            <Cell 
                              key={`cell-emb-${index}`} 
                              fill={COLORS[(index + 3) % COLORS.length]} 
                              fillOpacity={opacity}
                              stroke={isSelected ? (theme === 'dark' ? '#38bdf8' : '#032b5e') : undefined}
                              strokeWidth={isSelected ? 2 : 0}
                            />
                          );
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className={`text-[9px] font-semibold border-t pt-1.5 flex items-center justify-between ${
                theme === 'dark' ? 'border-slate-800 text-slate-400' : 'border-gray-100 text-gray-500'
              }`}>
                <span>Classificação por vasilhame</span>
                {topEmbalagensPct && (
                  <span className={`font-bold font-mono ${theme === 'dark' ? 'text-blue-300' : 'text-[#032b5e]'}`}>
                    Maior: {topEmbalagensPct}
                  </span>
                )}
              </div>
            </div>

            {/* CHART 6: Quebras por Turno */}
            <div className={`p-4.5 rounded-xl border shadow-sm flex flex-col justify-between gap-3 min-h-[340px] transition-colors ${
              theme === 'dark' ? 'bg-[#131d38] border-slate-700/80 text-slate-100' : 'bg-white border-gray-200'
            }`}>
              <div>
                <h3 className={`font-sans font-black text-[11px] uppercase tracking-wider ${
                  theme === 'dark' ? 'text-blue-300' : 'text-[#032b5e]'
                }`}>
                  QUEBRAS POR TURNO
                </h3>
                <span className="text-[9px] text-gray-400 font-bold mt-0.5 block">
                  Clique na barra para filtrar por turno
                </span>
              </div>

              <div className="h-32 w-full cursor-pointer">
                {turnoChartData.every(t => t.value === 0) ? (
                  <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                    Sem dados
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={turnoChartData} margin={{ top: 5, right: 5, left: -30, bottom: 5 }} accessibilityLayer={false}>
                      <CartesianGrid stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} vertical={false} />
                      <XAxis dataKey="name" stroke={theme === 'dark' ? '#64748b' : '#94a3b8'} fontSize={8} tickLine={false} axisLine={false} />
                      <YAxis stroke={theme === 'dark' ? '#64748b' : '#94a3b8'} fontSize={8} tickLine={false} axisLine={false} />
                      <Tooltip 
                        cursor={{ fill: 'transparent' }} 
                        contentStyle={{ 
                          backgroundColor: theme === 'dark' ? '#0f172a' : '#fff', 
                          border: theme === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0', 
                          borderRadius: '8px', 
                          fontSize: 9,
                          color: theme === 'dark' ? '#f8fafc' : '#0f172a'
                        }} 
                      />
                      <Bar 
                        dataKey="value" 
                        radius={[4, 4, 0, 0]} 
                        barSize={25}
                        onClick={(entry) => {
                          if (entry && entry.name) {
                            toggleFilter('turno', entry.name, 'Turno');
                          }
                        }}
                      >
                        {turnoChartData.map((entry, index) => {
                          const isSelected = isFiltered('turno', entry.name);
                          const opacity = isTurnoFiltered ? (isSelected ? 1.0 : 0.3) : 1.0;
                          return (
                            <Cell 
                              key={`cell-turno-${index}`} 
                              fill={index === 0 ? '#f5a623' : (theme === 'dark' ? '#3b82f6' : '#032b5e')} 
                              fillOpacity={opacity}
                              stroke={isSelected ? '#ef4444' : undefined}
                              strokeWidth={isSelected ? 2 : 0}
                            />
                          );
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Quick stats on Shift */}
              <div className={`flex justify-around items-center p-2 rounded-lg border ${
                theme === 'dark' ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-50 border-gray-100'
              }`}>
                <div 
                  onClick={() => toggleFilter('turno', 'MANHÃ', 'Turno')}
                  className={`text-center cursor-pointer p-1 rounded-md transition-colors ${
                    isFiltered('turno', 'MANHÃ') ? 'bg-amber-100/30 border border-amber-300' : (theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-slate-100')
                  }`}
                >
                  <span className="text-[8px] font-black text-[#f5a623] block">MANHÃ</span>
                  <span className={`text-[10px] font-extrabold ${theme === 'dark' ? 'text-slate-200' : 'text-[#334155]'}`}>{turnoMap['MANHÃ']} u</span>
                </div>
                <div className={`w-[1px] h-5 ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-200'}`} />
                <div 
                  onClick={() => toggleFilter('turno', 'NOITE / MADRUGADA', 'Turno')}
                  className={`text-center cursor-pointer p-1 rounded-md transition-colors ${
                    isFiltered('turno', 'NOITE / MADRUGADA') ? 'bg-amber-100/30 border border-amber-300' : (theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-slate-100')
                  }`}
                >
                  <span className={`text-[8px] font-black block ${theme === 'dark' ? 'text-blue-300' : 'text-[#032b5e]'}`}>NOITE</span>
                  <span className={`text-[10px] font-extrabold ${theme === 'dark' ? 'text-slate-200' : 'text-[#334155]'}`}>{turnoMap['NOITE / MADRUGADA']} u</span>
                </div>
              </div>
            </div>

          </div>

          {/* CROSSTAB / MATRIX TABLES SECTION */}
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-[#032b5e] text-white rounded-lg shadow-xs">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-sans font-black text-sm uppercase text-[#032b5e] tracking-wider">
                  MATRIZ DE CRUZAMENTO DE DADOS (CROSSTAB / MATRIX)
                </h2>
                <p className="text-[11px] text-slate-500 font-medium">
                  Cruzamento bidimensional com suporte a filtros dinâmicos de linha, coluna e células
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* CROSSTAB 1: Motorista / Responsável x Produto */}
              <CrosstabMatrix
                data={baseFilteredData}
                rowField={(item) => item.colaboradorQuebrou || item.responsavel || 'Não Informado'}
                rowLabel="Motorista / Responsável"
                colField="descricao"
                colLabel="Produto / SKU"
                valueField={(item) => viewUnit === 'cx' ? item.quantidade : convertCxToHE(item.quantidade, item.descricao, item.codProduto)}
                valueLabel={viewUnit === 'cx' ? 'Unidades' : 'Volume (HE)'}
                title="Motorista / Responsável x Produto (SKU)"
                subtitle="Matriz de relacionamento entre o colaborador que causou a quebra e os SKUs afetados"
                maxRows={8}
                maxCols={5}
                theme={theme}
              />

              {/* CROSSTAB 2: Área / CD x Motivo de Quebra */}
              <CrosstabMatrix
                data={baseFilteredData}
                rowField="area"
                rowLabel="Área Operacional"
                colField={(item) => item.motivo || item.codQuebra || 'Outros'}
                colLabel="Motivo de Quebra"
                valueField={(item) => viewUnit === 'cx' ? item.quantidade : convertCxToHE(item.quantidade, item.descricao, item.codProduto)}
                valueLabel={viewUnit === 'cx' ? 'Unidades' : 'Volume (HE)'}
                title="Área Operacional x Motivo de Quebra"
                subtitle="Matriz de origem física dos descartes versus motivo e código DPO"
                maxRows={6}
                maxCols={5}
                theme={theme}
              />
            </div>
          </div>

          {/* DETAILED SKU AND RECENT REGISTRIES TABS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            
            {/* Top SKU Ofensores Table */}
            <div className={`p-5 rounded-xl border shadow-sm transition-colors ${
              theme === 'dark' ? 'bg-[#131d38] border-slate-700/80 text-slate-100' : 'bg-white border-gray-200'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`font-sans font-black text-xs uppercase tracking-wider ${
                  theme === 'dark' ? 'text-blue-300' : 'text-[#032b5e]'
                }`}>
                  RANKING DE PRODUTOS OFENSORES (SKUs) ({sortedSkus.length})
                </h3>
                <span className="text-[10px] text-slate-400 font-medium">Clique na linha para filtrar</span>
              </div>
              <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
                <table className="w-full border-collapse font-sans text-xs">
                  <thead>
                    <tr className={`border-b sticky top-0 z-10 ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-gray-200 text-gray-500'}`}>
                      <th className="p-2 text-left uppercase tracking-wider text-[9px]">Posição</th>
                      <th className="p-2 text-left uppercase tracking-wider text-[9px]">Código</th>
                      <th className="p-2 text-left uppercase tracking-wider text-[9px]">SKU Descrição</th>
                      <th className="p-2 text-center uppercase tracking-wider text-[9px]">Unidades</th>
                      <th className="p-2 text-right uppercase tracking-wider text-[9px]">Proporção</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-800' : 'divide-gray-100'}`}>
                    {sortedSkus.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-gray-400">Sem produtos no ranking</td>
                      </tr>
                    ) : (
                      sortedSkus.map((item, index) => {
                        const pct = totalQuant > 0 ? ((item.quant / totalQuant) * 100).toFixed(1) : '0';
                        const isSelected = isFiltered('produto', item.desc);
                        return (
                          <tr 
                            key={item.cod} 
                            onClick={() => toggleFilter('produto', item.desc, 'Produto')}
                            className={`cursor-pointer transition-colors ${
                              isSelected 
                                ? (theme === 'dark' ? 'bg-amber-500/20 text-amber-200 font-bold border-l-4 border-amber-400' : 'bg-amber-100/80 font-bold border-l-4 border-amber-500') 
                                : (theme === 'dark' ? 'hover:bg-slate-800/60' : 'hover:bg-amber-50/60')
                            }`}
                          >
                            <td className={`p-2.5 font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>#{index + 1}</td>
                            <td className={`p-2.5 font-mono font-bold ${theme === 'dark' ? 'text-blue-300' : 'text-slate-700'}`}>{item.cod}</td>
                            <td className={`p-2.5 font-semibold uppercase ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>{item.desc}</td>
                            <td className="p-2.5 text-center text-[#ef4444] font-black">{item.quant}</td>
                            <td className="p-2.5 text-right font-mono font-bold text-gray-400">
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
            <div className={`p-5 rounded-xl border shadow-sm flex flex-col justify-between transition-colors ${
              theme === 'dark' ? 'bg-[#131d38] border-slate-700/80 text-slate-100' : 'bg-white border-gray-200'
            }`}>
              <div>
                <h3 className={`font-sans font-black text-xs uppercase tracking-wider mb-3 ${
                  theme === 'dark' ? 'text-blue-300' : 'text-[#032b5e]'
                }`}>
                  LANÇAMENTOS DO PERÍODO ({crossFilteredData.length})
                </h3>
                <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
                  <table className="w-full border-collapse font-sans text-[11px]">
                    <thead>
                      <tr className={`border-b sticky top-0 z-10 ${
                        theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-gray-200 text-gray-500'
                      }`}>
                        <th className="p-2 text-left uppercase tracking-wider text-[9px]">Data</th>
                        <th className="p-2 text-left uppercase tracking-wider text-[9px]">SKU</th>
                        <th className="p-2 text-center uppercase tracking-wider text-[9px]">Quantidade</th>
                        <th className="p-2 text-left uppercase tracking-wider text-[9px]">Área / Turno</th>
                        <th className="p-2 text-left uppercase tracking-wider text-[9px]">Código</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-800' : 'divide-gray-100'}`}>
                      {crossFilteredData.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-gray-400">Nenhum registro encontrado</td>
                        </tr>
                      ) : (
                        crossFilteredData.map((q, idx) => (
                          <tr key={idx} className={theme === 'dark' ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50/50'}>
                            <td className={`p-2 font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>{q.data}</td>
                            <td 
                              className="p-2 cursor-pointer hover:text-amber-500"
                              onClick={() => toggleFilter('produto', q.descricao, 'Produto')}
                            >
                              <div className={`font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>{q.codProduto}</div>
                              <div className="text-[9px] text-gray-400 uppercase truncate max-w-[130px]">{q.descricao}</div>
                            </td>
                            <td className="p-2 text-center text-red-500 font-extrabold">{q.quantidade}</td>
                            <td 
                              className="p-2 cursor-pointer hover:text-amber-500"
                              onClick={() => toggleFilter('area', q.area, 'Área')}
                            >
                              <div className={`font-semibold text-[10px] uppercase ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>{q.area}</div>
                              <div className="text-[9px] text-gray-400 font-medium uppercase">{q.turno}</div>
                            </td>
                            <td 
                              className="p-2 font-mono font-bold text-[#f5a623] cursor-pointer" 
                              title={q.motivo}
                              onClick={() => toggleFilter('motivo', q.motivo || q.codQuebra, 'Motivo')}
                            >
                              {q.codQuebra}
                              {q.colaboradorQuebrou && (
                                <div 
                                  className="text-[9px] text-red-400 font-extrabold uppercase mt-1 hover:underline" 
                                  title={`Quebrado por: ${q.colaboradorQuebrou}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFilter('motorista', q.colaboradorQuebrou || '', 'Motorista');
                                  }}
                                >
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
              
              <div className={`flex items-center justify-between border-t pt-3 mt-3 ${
                theme === 'dark' ? 'border-slate-800' : 'border-gray-100'
              }`}>
                <span className={`text-[10px] font-bold uppercase ${
                  theme === 'dark' ? 'text-blue-300' : 'text-[#032b5e]'
                }`}>
                  Total de registros exibidos: {Math.min(10, crossFilteredData.length)} de {crossFilteredData.length}
                </span>
              </div>
            </div>

          </div>
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
          Atualizado em tempo real • Versão 3.6.0
        </span>
      </div>

    </div>
  );
}

export default function QuebrasDashboard(props: QuebrasDashboardProps) {
  return (
    <CrossFilterProvider>
      <QuebrasDashboardInner {...props} />
    </CrossFilterProvider>
  );
}
