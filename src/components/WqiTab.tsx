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
  PieChart,
  Pie,
  LabelList
} from 'recharts';
import { 
  AlertTriangle, 
  Users, 
  Truck, 
  Package, 
  BarChart2, 
  PieChart as PieIcon, 
  Layers, 
  RefreshCw, 
  TrendingUp,
  Award,
  Filter
} from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { QuebraRow } from '../types';
import { generateMockQuebras } from '../mockDataGenerator';
import CalendarFilter from './CalendarFilter';

interface WqiTabProps {
  empresaId: string;
  startDate: string;
  endDate: string;
  onDateChange: (start: string, end: string) => void;
  viewUnit: 'cx' | 'he';
}

const COLORS = ['#032b5e', '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

// Helper to classify embalagem
export const getEmbalagemName = (desc: string): string => {
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

// Month Label Helper (e.g. '2026-07' -> 'Jul/26')
const getMonthLabel = (dateStr: string) => {
  if (!dateStr) return 'Sem Data';
  const clean = dateStr.split('T')[0];
  const parts = clean.split('-');
  if (parts.length < 2) return 'Sem Data';
  const year = parts[0].slice(2);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[monthIdx] || parts[1]}/${year}`;
};

export default function WqiTab({
  empresaId,
  startDate,
  endDate,
  onDateChange,
  viewUnit
}: WqiTabProps) {
  const [data, setData] = useState<QuebraRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterArea, setFilterArea] = useState<string>('TODAS');
  const [filterEmbalagem, setFilterEmbalagem] = useState<string>('TODAS');

  // Single read with getDocs() (No real-time listener to optimize Firestore read costs)
  const fetchWqiData = async () => {
    setLoading(true);
    try {
      if (db && empresaId && empresaId !== 'demo') {
        const q = query(collection(db, 'quebras'), where('empresaId', '==', empresaId));
        const snap = await getDocs(q);
        const rows = snap.docs.map(doc => ({ _docId: doc.id, ...doc.data() } as QuebraRow));
        rows.sort((a, b) => (b.dataISO || '').localeCompare(a.dataISO || ''));
        if (rows.length > 0) {
          setData(rows);
          setLoading(false);
          return;
        }
      }
      
      // Fallback to local storage or mock generator
      const localSaved = localStorage.getItem(`quebras_${empresaId || 'demo'}`);
      if (localSaved) {
        setData(JSON.parse(localSaved));
      } else {
        setData(generateMockQuebras(empresaId || 'demo'));
      }
    } catch (err) {
      console.warn('WQI fetch fallback to mock:', err);
      const localSaved = localStorage.getItem(`quebras_${empresaId || 'demo'}`);
      if (localSaved) {
        setData(JSON.parse(localSaved));
      } else {
        setData(generateMockQuebras(empresaId || 'demo'));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWqiData();
  }, [empresaId]);

  // Client-side filtering by Date, Area, and Embalagem
  const filteredData = useMemo(() => {
    return data.filter(q => {
      // Area filter
      if (filterArea !== 'TODAS' && q.area !== filterArea) return false;

      // Embalagem filter
      const embName = q.embalagem || getEmbalagemName(q.descricao);
      if (filterEmbalagem !== 'TODAS' && embName !== filterEmbalagem) return false;

      // Date range filter
      if (startDate || endDate) {
        let rowISO = '';
        if (q.dataISO) {
          rowISO = q.dataISO.split('T')[0];
        } else if (q.data) {
          const parts = q.data.split('/');
          if (parts.length === 3) rowISO = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        if (startDate && rowISO && rowISO < startDate) return false;
        if (endDate && rowISO && rowISO > endDate) return false;
      }
      return true;
    });
  }, [data, startDate, endDate, filterArea, filterEmbalagem]);

  // -------------------------------------------------------------
  // CHART 1: Quantidade de Ocorrências (Evolução Mensal)
  // -------------------------------------------------------------
  const monthlyOccurrencesMap: Record<string, { monthKey: string; monthLabel: string; count: number; volume: number }> = {};

  filteredData.forEach(q => {
    const rawDate = q.dataISO || q.data || '';
    let yearMonth = 'Outros';
    if (rawDate) {
      const parts = rawDate.split('T')[0].split('-');
      if (parts.length >= 2) {
        yearMonth = `${parts[0]}-${parts[1]}`;
      }
    }
    
    if (!monthlyOccurrencesMap[yearMonth]) {
      monthlyOccurrencesMap[yearMonth] = {
        monthKey: yearMonth,
        monthLabel: getMonthLabel(rawDate),
        count: 0,
        volume: 0
      };
    }
    monthlyOccurrencesMap[yearMonth].count += 1;
    monthlyOccurrencesMap[yearMonth].volume += (q.quantidade || 0);
  });

  const monthlyChartData = Object.values(monthlyOccurrencesMap)
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey));

  const totalOcorrencias = filteredData.length;
  const totalVolume = filteredData.reduce((acc, curr) => acc + (curr.quantidade || 0), 0);

  // -------------------------------------------------------------
  // CHART 2: Ocorrências por Ajudantes
  // -------------------------------------------------------------
  const ajudantesMap: Record<string, number> = {};

  filteredData.forEach(q => {
    const funcUpper = (q.funcao || '').toUpperCase();
    const areaUpper = (q.area || '').toUpperCase();
    const resp = (q.responsavel || q.colaboradorQuebrou || '').trim();

    // Check if function is AJUDANTE or if area is ENTREGA/ROTA or if explicitly declared
    const isAjudante = funcUpper.includes('AJUDANTE') || 
                      (!q.funcao && (areaUpper === 'ENTREGA' || areaUpper === 'ROTA' || resp.includes('AJUDANTE')));

    if (isAjudante) {
      const name = resp || 'Não Informado';
      ajudantesMap[name] = (ajudantesMap[name] || 0) + 1;
    }
  });

  const ajudantesChartData = Object.entries(ajudantesMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // -------------------------------------------------------------
  // CHART 3: Ocorrências por Empilhadores
  // -------------------------------------------------------------
  const empilhadoresMap: Record<string, number> = {};

  filteredData.forEach(q => {
    const funcUpper = (q.funcao || '').toUpperCase();
    const areaUpper = (q.area || '').toUpperCase();
    const resp = (q.responsavel || q.colaboradorQuebrou || '').trim();

    // Check if function is EMPILHADOR or if area is ARMAZEM or explicitly declared
    const isEmpilhador = funcUpper.includes('EMPILHADOR') || 
                         (!q.funcao && (areaUpper === 'ARMAZEM' || areaUpper === 'ARMAZÉM' || resp.includes('EMPILHADOR')));

    if (isEmpilhador) {
      const name = resp || 'Não Informado';
      empilhadoresMap[name] = (empilhadoresMap[name] || 0) + 1;
    }
  });

  const empilhadoresChartData = Object.entries(empilhadoresMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // -------------------------------------------------------------
  // CHART 4: Ocorrências por Embalagens
  // -------------------------------------------------------------
  const embalagemOccurrencesMap: Record<string, number> = {};

  filteredData.forEach(q => {
    const embName = q.embalagem || getEmbalagemName(q.descricao);
    embalagemOccurrencesMap[embName] = (embalagemOccurrencesMap[embName] || 0) + 1;
  });

  const embalagemChartData = Object.entries(embalagemOccurrencesMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // -------------------------------------------------------------
  // CHART 5: Ocorrências por Produto
  // -------------------------------------------------------------
  const produtoOccurrencesMap: Record<string, number> = {};

  filteredData.forEach(q => {
    const desc = q.descricao || 'PRODUTO NÃO IDENTIFICADO';
    produtoOccurrencesMap[desc] = (produtoOccurrencesMap[desc] || 0) + 1;
  });

  const produtoChartData = Object.entries(produtoOccurrencesMap)
    .map(([name, count]) => ({ 
      name: name.length > 25 ? name.substring(0, 25) + '...' : name, 
      fullName: name,
      count 
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  // -------------------------------------------------------------
  // CHART 6: Ocorrências por Setor / Área
  // -------------------------------------------------------------
  const setorOccurrencesMap: Record<string, number> = {
    'ARMAZÉM': 0,
    'ENTREGA': 0,
    'PUXADA / TRANSF': 0
  };

  filteredData.forEach(q => {
    const rawArea = (q.area || 'ARMAZÉM').toUpperCase();
    let areaKey = 'ARMAZÉM';
    if (rawArea.includes('ENTREGA') || rawArea.includes('ROTA')) {
      areaKey = 'ENTREGA';
    } else if (rawArea.includes('PUXADA') || rawArea.includes('TRANSF') || rawArea.includes('TRANS')) {
      areaKey = 'PUXADA / TRANSF';
    } else {
      areaKey = 'ARMAZÉM';
    }
    setorOccurrencesMap[areaKey] = (setorOccurrencesMap[areaKey] || 0) + 1;
  });

  const setorChartData = Object.entries(setorOccurrencesMap)
    .map(([name, value]) => ({ name, value }))
    .filter(item => item.value > 0);

  return (
    <div className="flex flex-col gap-5">
      
      {/* FILTERS & REFRESH BAR */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
          
          {/* Calendar Period */}
          <div className="flex flex-col gap-1 min-w-[260px]">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
              <Filter className="w-3 h-3 text-[#032b5e]" /> Período
            </span>
            <CalendarFilter
              startDate={startDate}
              endDate={endDate}
              onChange={onDateChange}
            />
          </div>

          {/* Area Filter */}
          <div className="flex flex-col gap-1 w-[150px]">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Setor / Área</span>
            <select 
              value={filterArea} 
              onChange={e => setFilterArea(e.target.value)} 
              className="w-full bg-white border border-gray-200 text-[#032b5e] font-sans font-bold rounded-lg outline-none px-2.5 py-1 text-[10px] h-[32px] cursor-pointer hover:border-blue-400 focus:border-[#032b5e]"
            >
              <option value="TODAS">Todas as Áreas</option>
              <option value="ARMAZEM">Armazém</option>
              <option value="ENTREGA">Entrega / Rota</option>
              <option value="PUXADA">Puxada / Transf</option>
            </select>
          </div>

          {/* Embalagem Filter */}
          <div className="flex flex-col gap-1 w-[160px]">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Embalagem</span>
            <select 
              value={filterEmbalagem} 
              onChange={e => setFilterEmbalagem(e.target.value)} 
              className="w-full bg-white border border-gray-200 text-[#032b5e] font-sans font-bold rounded-lg outline-none px-2.5 py-1 text-[10px] h-[32px] cursor-pointer hover:border-blue-400 focus:border-[#032b5e]"
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

        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[9px] text-slate-400 font-bold uppercase block">Modo Analítico BI</span>
            <span className="text-[10px] font-mono font-black text-[#032b5e] bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              Leitura Única (getDocs)
            </span>
          </div>
          <button
            type="button"
            onClick={fetchWqiData}
            disabled={loading}
            className="flex items-center gap-1.5 bg-[#032b5e] hover:bg-[#021f44] text-white text-[11px] font-bold px-3.5 py-1.5 rounded-lg border-none cursor-pointer transition-all disabled:opacity-50"
            title="Atualizar dados analíticos de quebras"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Carregando...' : 'Atualizar'}
          </button>
        </div>
      </div>

      {/* KPI SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* KPI 1 */}
        <div className="bg-white p-4.5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Total de Ocorrências</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black font-mono text-[#032b5e]">
                {totalOcorrencias.toLocaleString('pt-BR')}
              </span>
              <span className="text-xs font-bold text-slate-500">registros</span>
            </div>
            <span className="text-[9px] text-slate-400 mt-0.5 block font-semibold">No período selecionado</span>
          </div>
          <div className="p-3 bg-blue-50 text-[#032b5e] rounded-xl">
            <BarChart2 className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white p-4.5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Volume Total de Perdas</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black font-mono text-[#ef4444]">
                {totalVolume.toLocaleString('pt-BR')}
              </span>
              <span className="text-xs font-bold text-slate-500">{viewUnit === 'cx' ? 'caixas' : 'HL'}</span>
            </div>
            <span className="text-[9px] text-slate-400 mt-0.5 block font-semibold">Volume acumulado de descartes</span>
          </div>
          <div className="p-3 bg-red-50 text-[#ef4444] rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white p-4.5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Ajudantes & Empilhadores</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black font-mono text-emerald-600">
                {ajudantesChartData.length + empilhadoresChartData.length}
              </span>
              <span className="text-xs font-bold text-slate-500">colaboradores envolvidos</span>
            </div>
            <span className="text-[9px] text-slate-400 mt-0.5 block font-semibold">Análise individualizada WQI</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* CHARTS GRID 1: QUANTIDADE DE OCORRÊNCIAS (EVOLUÇÃO MENSAL) & SETOR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* CHART 1: Quantidade de Ocorrências (Evolução Mensal) */}
        <div className="lg:col-span-2 bg-white p-4.5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between min-h-[340px]">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-sans font-black text-[12px] uppercase text-[#032b5e] tracking-wider flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4 text-[#032b5e]" /> 1. QUANTIDADE DE OCORRÊNCIAS (EVOLUÇÃO MENSAL)
              </h3>
              <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                Total: {totalOcorrencias} registros
              </span>
            </div>
            <span className="text-[9px] text-gray-400 font-bold mt-0.5 block">
              Evolução do número de registros de quebra por mês no período
            </span>
          </div>

          <div className="h-56 w-full my-3">
            {monthlyChartData.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 font-bold">
                Nenhum registro encontrado no período selecionado.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyChartData} margin={{ top: 15, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="monthLabel" stroke="#475569" fontSize={10} fontWeight={700} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: 10, color: '#fff' }}
                    labelStyle={{ color: '#38bdf8', fontWeight: 'bold' }}
                    formatter={(val: any) => [`${val} ocorrências`, 'Ocorrências']}
                  />
                  <Bar dataKey="count" fill="#032b5e" radius={[6, 6, 0, 0]} barSize={28}>
                    <LabelList dataKey="count" position="top" fontSize={10} fontWeight={800} fill="#032b5e" />
                    {monthlyChartData.map((_, index) => (
                      <Cell key={`cell-m-${index}`} fill={index % 2 === 0 ? '#032b5e' : '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="text-[9px] text-gray-400 font-semibold border-t border-gray-100 pt-1.5 flex items-center justify-between">
            <span>Volume total acumulado: {totalVolume.toLocaleString('pt-BR')} {viewUnit === 'cx' ? 'CX' : 'HL'}</span>
            <span className="font-mono font-bold text-[#032b5e]">Contagem de registros</span>
          </div>
        </div>

        {/* CHART 6: Ocorrências por Setor */}
        <div className="bg-white p-4.5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between min-h-[340px]">
          <div>
            <h3 className="font-sans font-black text-[12px] uppercase text-[#032b5e] tracking-wider flex items-center gap-1.5">
              <PieIcon className="w-4 h-4 text-[#10b981]" /> 6. OCORRÊNCIA POR SETOR
            </h3>
            <span className="text-[9px] text-gray-400 font-bold mt-0.5 block">
              Distribuição física dos eventos (Armazém / Entrega / Puxada)
            </span>
          </div>

          <div className="h-52 w-full my-2 flex items-center justify-center">
            {setorChartData.length === 0 ? (
              <div className="text-xs text-gray-400 font-bold">Sem dados de setor</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={setorChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {setorChartData.map((entry, index) => (
                      <Cell key={`cell-setor-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: 10, color: '#fff' }}
                    formatter={(val: any) => [`${val} ocorrências`, 'Total']}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 border-t border-gray-100 pt-2">
            {setorChartData.map((item, idx) => {
              const pct = totalOcorrencias > 0 ? Math.round((item.value / totalOcorrencias) * 100) : 0;
              return (
                <div key={item.name} className="flex items-center gap-1.5 text-[9px] font-bold">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                  <span className="text-slate-600">{item.name}:</span>
                  <span className="font-mono text-[#032b5e]">{item.value} ({pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* CHARTS GRID 2: OCORRÊNCIAS POR AJUDANTES & EMPILHADORES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* CHART 2: Ocorrência por Ajudantes */}
        <div className="bg-white p-4.5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between min-h-[350px]">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-sans font-black text-[12px] uppercase text-[#032b5e] tracking-wider flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-[#ef4444]" /> 2. OCORRÊNCIA POR AJUDANTES
              </h3>
              <span className="text-[9px] font-mono font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                Ranking Ajudantes
              </span>
            </div>
            <span className="text-[9px] text-gray-400 font-bold mt-0.5 block">
              Contagem de registros de quebra atribuídos a Ajudantes de Entrega/Rota
            </span>
          </div>

          <div className="h-60 w-full my-2">
            {ajudantesChartData.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 font-bold">
                Sem registros atribuídos a Ajudantes.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ajudantesChartData} layout="vertical" margin={{ top: 5, right: 35, left: 10, bottom: 5 }}>
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
                    width={110}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: 10, color: '#fff' }}
                    formatter={(val: any) => [`${val} ocorrências`, 'Quebras']}
                  />
                  <Bar dataKey="count" fill="#ef4444" radius={[0, 6, 6, 0]} barSize={16}>
                    <LabelList dataKey="count" position="right" fontSize={9} fontWeight={800} fill="#ef4444" />
                    {ajudantesChartData.map((_, index) => (
                      <Cell key={`cell-aj-${index}`} fill={index === 0 ? '#ef4444' : index === 1 ? '#f97316' : '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="text-[9px] text-gray-400 font-semibold border-t border-gray-100 pt-1.5 flex items-center justify-between">
            <span>Identificação por responsável / colaborador</span>
            <span className="font-mono font-bold text-red-600">Top {ajudantesChartData.length} Ajudantes</span>
          </div>
        </div>

        {/* CHART 3: Ocorrência por Empilhadores */}
        <div className="bg-white p-4.5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between min-h-[350px]">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-sans font-black text-[12px] uppercase text-[#032b5e] tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#3b82f6]" /> 3. OCORRÊNCIA POR EMPILHADORES
              </h3>
              <span className="text-[9px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                Ranking Empilhadores
              </span>
            </div>
            <span className="text-[9px] text-gray-400 font-bold mt-0.5 block">
              Contagem de registros de quebra em operações de Armazém / Movimentação
            </span>
          </div>

          <div className="h-60 w-full my-2">
            {empilhadoresChartData.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 font-bold">
                Sem registros atribuídos a Empilhadores.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={empilhadoresChartData} layout="vertical" margin={{ top: 5, right: 35, left: 10, bottom: 5 }}>
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
                    width={110}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: 10, color: '#fff' }}
                    formatter={(val: any) => [`${val} ocorrências`, 'Quebras']}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={16}>
                    <LabelList dataKey="count" position="right" fontSize={9} fontWeight={800} fill="#3b82f6" />
                    {empilhadoresChartData.map((_, index) => (
                      <Cell key={`cell-[#3b82f6]-${index}`} fill={index === 0 ? '#032b5e' : index === 1 ? '#2563eb' : '#60a5fa'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="text-[9px] text-gray-400 font-semibold border-t border-gray-100 pt-1.5 flex items-center justify-between">
            <span>Operadores de empilhadeira habilitados</span>
            <span className="font-mono font-bold text-blue-600">Top {empilhadoresChartData.length} Empilhadores</span>
          </div>
        </div>

      </div>

      {/* CHARTS GRID 3: OCORRÊNCIAS POR EMBALAGEM & POR PRODUTO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* CHART 4: Ocorrência por Embalagens */}
        <div className="bg-white p-4.5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between min-h-[360px]">
          <div>
            <h3 className="font-sans font-black text-[12px] uppercase text-[#032b5e] tracking-wider flex items-center gap-1.5">
              <Package className="w-4 h-4 text-[#8b5cf6]" /> 4. OCORRÊNCIA POR EMBALAGENS
            </h3>
            <span className="text-[9px] text-gray-400 font-bold mt-0.5 block">
              Top embalagens/vasilhames com maior número de ocorrências de quebra
            </span>
          </div>

          <div className="h-64 w-full my-2">
            {embalagemChartData.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 font-bold">
                Sem dados de embalagens.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={embalagemChartData} layout="vertical" margin={{ top: 5, right: 35, left: 10, bottom: 5 }}>
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
                    width={110}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: 10, color: '#fff' }}
                    formatter={(val: any) => [`${val} ocorrências`, 'Ocorrências']}
                  />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[0, 6, 6, 0]} barSize={16}>
                    <LabelList dataKey="count" position="right" fontSize={9} fontWeight={800} fill="#8b5cf6" />
                    {embalagemChartData.map((_, index) => (
                      <Cell key={`cell-emb-wqi-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="text-[9px] text-gray-400 font-semibold border-t border-gray-100 pt-1.5 flex items-center justify-between">
            <span>Classificação automatizada por descrição do produto</span>
            <span className="font-mono font-bold text-[#8b5cf6]">Top Embalagens</span>
          </div>
        </div>

        {/* CHART 5: Ocorrência por Produto */}
        <div className="bg-white p-4.5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between min-h-[360px]">
          <div>
            <h3 className="font-sans font-black text-[12px] uppercase text-[#032b5e] tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4 text-[#f59e0b]" /> 5. OCORRÊNCIA POR PRODUTO
            </h3>
            <span className="text-[9px] text-gray-400 font-bold mt-0.5 block">
              Top produtos (SKUs) com maior número de registros de perda
            </span>
          </div>

          <div className="h-64 w-full my-2">
            {produtoChartData.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 font-bold">
                Sem registros de produtos no período.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={produtoChartData} layout="vertical" margin={{ top: 5, right: 35, left: 10, bottom: 5 }}>
                  <CartesianGrid stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" stroke="#94a3b8" fontSize={8} tickLine={false} axisLine={false} />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    stroke="#334155" 
                    fontSize={8.5} 
                    fontWeight={700}
                    tickLine={false} 
                    axisLine={false} 
                    width={130}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: 10, color: '#fff' }}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''}
                    formatter={(val: any) => [`${val} ocorrências`, 'Total Ocorrências']}
                  />
                  <Bar dataKey="count" fill="#f59e0b" radius={[0, 6, 6, 0]} barSize={14}>
                    <LabelList dataKey="count" position="right" fontSize={9} fontWeight={800} fill="#d97706" />
                    {produtoChartData.map((_, index) => (
                      <Cell key={`cell-[#f59e0b]-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="text-[9px] text-gray-400 font-semibold border-t border-gray-100 pt-1.5 flex items-center justify-between">
            <span>Agrupamento por descrição oficial do catálogo</span>
            <span className="font-mono font-bold text-[#d97706]">Top {produtoChartData.length} Produtos</span>
          </div>
        </div>

      </div>

    </div>
  );
}
