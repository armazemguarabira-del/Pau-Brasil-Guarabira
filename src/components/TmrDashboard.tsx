import React, { useState, useEffect, useMemo } from 'react';
import { Usuario, Empresa, TmrDemand } from '../types';
import { getStoredTmrDemands } from '../utils/tmrManager';
import { getStoredEfcVehicles, EfcEfdVehicle } from '../utils/efcEfdManager';
import { useSystemTargets } from '../utils/useSystemTargets';
import { ManualInstrucaoCard, MetricDefinition } from './ManualInstrucaoCard';
import { IndicatorMetaHeader } from './IndicatorMetaHeader';
import { SopBannerViewer } from './SopBannerViewer';
import { 
  Clock, 
  Truck, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  TrendingUp, 
  UserCheck,
  ArrowLeft,
  Calendar,
  Award,
  BarChart3,
  FileText,
  Filter,
  Users,
  Trophy
} from 'lucide-react';
import { ChartTooltipExplainer } from './ChartTooltipExplainer';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  ReferenceLine 
} from 'recharts';

interface TmrDashboardProps {
  user: Usuario;
  empresa: Empresa | null;
  theme?: 'light' | 'dark';
  onBack?: () => void;
}

export default function TmrDashboard({ user, empresa, theme = 'dark', onBack }: TmrDashboardProps) {
  const empresaId = empresa?.id || 'demo';
  const { targets } = useSystemTargets();

  const [tmrDemands, setTmrDemands] = useState<TmrDemand[]>(() => getStoredTmrDemands(empresaId));
  const [efcVehicles, setEfcVehicles] = useState<EfcEfdVehicle[]>(() => getStoredEfcVehicles(empresaId));
  const [showPopModal, setShowPopModal] = useState(false);
  const [dateFilter, setDateFilter] = useState<'hoje' | '7dias' | 'mes' | 'todos'>('todos');

  useEffect(() => {
    const handleTmrUpdate = () => setTmrDemands(getStoredTmrDemands(empresaId));
    const handleEfcUpdate = () => setEfcVehicles(getStoredEfcVehicles(empresaId));

    window.addEventListener('tmr_demands_updated', handleTmrUpdate);
    window.addEventListener('efc_vehicles_updated', handleEfcUpdate);

    return () => {
      window.removeEventListener('tmr_demands_updated', handleTmrUpdate);
      window.removeEventListener('efc_vehicles_updated', handleEfcUpdate);
    };
  }, [empresaId]);

  // Target Metas in Minutes with Editable States
  const [metaCarretaMin, setMetaCarretaMin] = useState<number>(() => {
    const saved = localStorage.getItem(`meta_tmr_carreta_${empresaId}`);
    return saved ? Number(saved) : (targets.tmr_carreta ?? 150);
  });
  const [metaRecargaMin, setMetaRecargaMin] = useState<number>(() => {
    const saved = localStorage.getItem(`meta_tmr_recarga_${empresaId}`);
    return saved ? Number(saved) : (targets.tmr_recarga ?? 50);
  });
  const [metaTerceirosMin, setMetaTerceirosMin] = useState<number>(() => {
    const saved = localStorage.getItem(`meta_tmr_terceiros_${empresaId}`);
    return saved ? Number(saved) : (targets.tmr_terceiros ?? 50);
  });

  const updateMetaCarreta = (val: number) => {
    setMetaCarretaMin(val);
    localStorage.setItem(`meta_tmr_carreta_${empresaId}`, String(val));
  };
  const updateMetaRecarga = (val: number) => {
    setMetaRecargaMin(val);
    localStorage.setItem(`meta_tmr_recarga_${empresaId}`, String(val));
  };
  const updateMetaTerceiros = (val: number) => {
    setMetaTerceirosMin(val);
    localStorage.setItem(`meta_tmr_terceiros_${empresaId}`, String(val));
  };

  const META_CARRETA_MIN = metaCarretaMin;
  const META_RECARGA_MIN = metaRecargaMin;
  const META_TERCEIROS_MIN = metaTerceirosMin;

  // Filter demands by date if applicable
  const filteredDemands = useMemo(() => {
    const now = new Date();
    return tmrDemands.filter(t => {
      if (dateFilter === 'todos') return true;
      if (!t.criadoEm && !t.iniciadoEm) return true;
      const refDate = new Date(t.finalizadoEm || t.iniciadoEm || t.criadoEm || '');
      if (isNaN(refDate.getTime())) return true;

      if (dateFilter === 'hoje') {
        return refDate.toDateString() === now.toDateString();
      }
      if (dateFilter === '7dias') {
        const diffDays = (now.getTime() - refDate.getTime()) / (1000 * 3600 * 24);
        return diffDays <= 7;
      }
      if (dateFilter === 'mes') {
        return refDate.getMonth() === now.getMonth() && refDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [tmrDemands, dateFilter]);

  // 1. CARRETAS TMR
  const finishedCarretas = useMemo(() => {
    return filteredDemands.filter(t => 
      t.status === 'done' && 
      t.duracaoMin && 
      t.tipoDemanda !== 'Terceiros' && 
      !t.carreta?.toLowerCase().includes('terceiro')
    );
  }, [filteredDemands]);

  const totalCarretasTime = finishedCarretas.reduce((acc, t) => acc + (t.duracaoMin || 0), 0);
  const avgCarretaTimeMin = finishedCarretas.length > 0 ? Math.round(totalCarretasTime / finishedCarretas.length) : 0;
  const compliantCarretasCount = finishedCarretas.filter(t => (t.duracaoMin || 0) <= META_CARRETA_MIN).length;
  const pctCarretasAdherence = finishedCarretas.length > 0 ? Math.round((compliantCarretasCount / finishedCarretas.length) * 100) : 100;

  // 2. RECARGAS TMR (from vehicles or tmrDemands)
  const finishedRecargasFromDemands = useMemo(() => {
    return filteredDemands.filter(t => t.status === 'done' && t.tipoDemanda === 'Recarga');
  }, [filteredDemands]);

  const recargaVehicles = useMemo(() => {
    return efcVehicles.filter(v => (v.isRecarga || v.tipoCarga === 'Recarga') && v.statusCarregamento === 'Finalizado' && v.duracaoCarregamentoMin);
  }, [efcVehicles]);

  const totalRecargasCount = finishedRecargasFromDemands.length + recargaVehicles.length;
  const totalRecargasTime = finishedRecargasFromDemands.reduce((a, t) => a + (t.duracaoMin || 0), 0) + recargaVehicles.reduce((a, v) => a + (v.duracaoCarregamentoMin || 0), 0);
  const avgRecargaTimeMin = totalRecargasCount > 0 ? Math.round(totalRecargasTime / totalRecargasCount) : 0;
  const compliantRecargasCount = finishedRecargasFromDemands.filter(t => (t.duracaoMin || 0) <= META_RECARGA_MIN).length + recargaVehicles.filter(v => (v.duracaoCarregamentoMin || 0) <= META_RECARGA_MIN).length;
  const pctRecargasAdherence = totalRecargasCount > 0 ? Math.round((compliantRecargasCount / totalRecargasCount) * 100) : 100;

  // 3. TERCEIROS TMR
  const finishedTerceiros = useMemo(() => {
    return filteredDemands.filter(t => 
      t.status === 'done' && 
      t.duracaoMin && 
      (t.tipoDemanda === 'Terceiros' || t.carreta?.toLowerCase().includes('terceiro'))
    );
  }, [filteredDemands]);

  const totalTerceirosTime = finishedTerceiros.reduce((acc, t) => acc + (t.duracaoMin || 0), 0);
  const avgTerceirosTimeMin = finishedTerceiros.length > 0 ? Math.round(totalTerceirosTime / finishedTerceiros.length) : 0;
  const compliantTerceirosCount = finishedTerceiros.filter(t => (t.duracaoMin || 0) <= META_TERCEIROS_MIN).length;
  const pctTerceirosAdherence = finishedTerceiros.length > 0 ? Math.round((compliantTerceirosCount / finishedTerceiros.length) * 100) : 100;

  // OVERALL TMR ADHERENCE
  const totalCompletedOps = finishedCarretas.length + totalRecargasCount + finishedTerceiros.length;
  const totalCompliantOps = compliantCarretasCount + compliantRecargasCount + compliantTerceirosCount;
  const overallTmrAdherence = totalCompletedOps > 0 ? Math.round((totalCompliantOps / totalCompletedOps) * 100) : 100;

  // COMPARATIVO META X REAL DATA
  const comparativoData = [
    {
      tipo: 'Carreta',
      Real: avgCarretaTimeMin,
      Meta: META_CARRETA_MIN,
      adherence: pctCarretasAdherence,
      status: avgCarretaTimeMin <= META_CARRETA_MIN ? 'Conforme' : 'Fora da Meta',
      fill: avgCarretaTimeMin <= META_CARRETA_MIN ? '#10b981' : '#f43f5e'
    },
    {
      tipo: 'Recarga',
      Real: avgRecargaTimeMin,
      Meta: META_RECARGA_MIN,
      adherence: pctRecargasAdherence,
      status: avgRecargaTimeMin <= META_RECARGA_MIN ? 'Conforme' : 'Fora da Meta',
      fill: avgRecargaTimeMin <= META_RECARGA_MIN ? '#10b981' : '#f43f5e'
    },
    {
      tipo: 'Terceiros',
      Real: avgTerceirosTimeMin,
      Meta: META_TERCEIROS_MIN,
      adherence: pctTerceirosAdherence,
      status: avgTerceirosTimeMin <= META_TERCEIROS_MIN ? 'Conforme' : 'Fora da Meta',
      fill: avgTerceirosTimeMin <= META_TERCEIROS_MIN ? '#10b981' : '#f43f5e'
    }
  ];

  // PERFORMANCE BY EMPILHADOR
  const operatorStats: Record<string, { carretas: number, recargas: number, terceiros: number, totalTime: number, totalOps: number, compliantOps: number }> = {};

  const registerOp = (opName: string, timeMin: number, targetMin: number, isCarreta: boolean, isRecarga: boolean, isTerceiro: boolean) => {
    const cleanOp = (opName || 'A DEFINIR').toUpperCase().trim();
    if (!operatorStats[cleanOp]) {
      operatorStats[cleanOp] = { carretas: 0, recargas: 0, terceiros: 0, totalTime: 0, totalOps: 0, compliantOps: 0 };
    }
    if (isCarreta) operatorStats[cleanOp].carretas += 1;
    if (isRecarga) operatorStats[cleanOp].recargas += 1;
    if (isTerceiro) operatorStats[cleanOp].terceiros += 1;
    operatorStats[cleanOp].totalOps += 1;
    operatorStats[cleanOp].totalTime += timeMin;
    if (timeMin <= targetMin) {
      operatorStats[cleanOp].compliantOps += 1;
    }
  };

  finishedCarretas.forEach(t => {
    registerOp(t.operadorExecutor || '', t.duracaoMin || 0, META_CARRETA_MIN, true, false, false);
  });

  finishedRecargasFromDemands.forEach(t => {
    registerOp(t.operadorExecutor || '', t.duracaoMin || 0, META_RECARGA_MIN, false, true, false);
  });

  recargaVehicles.forEach(v => {
    registerOp(v.operadorExecutorCarregamento || '', v.duracaoCarregamentoMin || 0, META_RECARGA_MIN, false, true, false);
  });

  finishedTerceiros.forEach(t => {
    registerOp(t.operadorExecutor || '', t.duracaoMin || 0, META_TERCEIROS_MIN, false, false, true);
  });

  const sortedOperators = Object.entries(operatorStats).sort((a, b) => b[1].totalOps - a[1].totalOps);

  const tmrMetricsDef: MetricDefinition[] = [
    {
      key: 'tmr_carreta',
      label: 'TMR Carreta (Ciclo Completo / Transbordo)',
      unit: 'min',
      comoCalcular: 'Tempo transcorrido estritamente entre o Iniciar e o Concluir registrado pelo empilhador na Operação Empilhador. Target oficial DPO: ≤ 150 min (2h 30min).',
      observacao: 'Contabiliza apenas tempo em operação ativa, ignorando esperas em pátio.'
    },
    {
      key: 'tmr_recarga',
      label: 'TMR Recarga (Carregamento + Descarregamento Recarga)',
      unit: 'min',
      comoCalcular: 'Tempo de atendimento de veículos e cargas em recarga (Iniciar -> Concluir) pelo empilhador. Target oficial DPO: ≤ 50 min.',
      observacao: 'Desvinculado do EFC assim que o empilhador inicia a recarga.'
    },
    {
      key: 'tmr_terceiros',
      label: 'TMR Terceiros (Fornecedores Externos)',
      unit: 'min',
      comoCalcular: 'Segue rigorosamente a mesma regra de tempo (Iniciar -> Concluir) e meta da Carreta. Target oficial DPO: ≤ 150 min (2h 30min).',
      observacao: 'Atribuído via painel do Conferente e executado na Operação Empilhador.'
    }
  ];

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 bg-[#07090d] text-white min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#222d3a] pb-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button 
              onClick={onBack}
              className="p-2 rounded-xl bg-[#151b23] border border-[#222d3a] hover:border-amber-400 text-slate-300 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
                MÉTRICAS DE TEMPO MÉDIO DE REVENDA
              </span>
              <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-mono">
                DPO Ambev Padronizado
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white mt-1 flex items-center gap-2">
              📊 DASHBOARD TMR — TEMPO MÉDIO DE REVENDA & RECARGAS
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* POP BUTTON */}
          <button
            onClick={() => setShowPopModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 text-blue-300 border border-blue-500/30 hover:bg-blue-600/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4 text-blue-400" /> POP TMR
          </button>

          {/* DATE FILTER */}
          <div className="flex items-center gap-1 bg-[#151b23] p-1 rounded-xl border border-[#222d3a]">
            <Filter className="w-3.5 h-3.5 text-amber-400 ml-1.5" />
            <button
              onClick={() => setDateFilter('todos')}
              className={`px-2.5 py-1 text-[10px] font-extrabold rounded-lg transition-all cursor-pointer ${
                dateFilter === 'todos' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setDateFilter('hoje')}
              className={`px-2.5 py-1 text-[10px] font-extrabold rounded-lg transition-all cursor-pointer ${
                dateFilter === 'hoje' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => setDateFilter('7dias')}
              className={`px-2.5 py-1 text-[10px] font-extrabold rounded-lg transition-all cursor-pointer ${
                dateFilter === '7dias' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              7d
            </button>
            <button
              onClick={() => setDateFilter('mes')}
              className={`px-2.5 py-1 text-[10px] font-extrabold rounded-lg transition-all cursor-pointer ${
                dateFilter === 'mes' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Mês
            </button>
          </div>
        </div>
      </div>

      {/* FIXED TOP BLOCK FOR TMR METAS */}
      <IndicatorMetaHeader
        indicatorName="TMR (Tempo Médio de Atendimento Pátio)"
        theme={theme}
        metas={[
          {
            id: 'meta_tmr_carreta',
            label: 'Meta Carreta',
            value: META_CARRETA_MIN,
            unit: 'min (2h30)',
            step: 5,
            min: 1,
            onChange: updateMetaCarreta,
            calculationText: 'Soma dos tempos de permanência no pátio de carretas ÷ Quantidade de carretas finalizadas'
          },
          {
            id: 'meta_tmr_recarga',
            label: 'Meta Recarga',
            value: META_RECARGA_MIN,
            unit: 'min',
            step: 5,
            min: 1,
            onChange: updateMetaRecarga,
            calculationText: 'Tempo decorrido entre a solicitação e finalização da recarga no pátio'
          },
          {
            id: 'meta_tmr_terceiros',
            label: 'Meta Terceiros',
            value: META_TERCEIROS_MIN,
            unit: 'min',
            step: 5,
            min: 1,
            onChange: updateMetaTerceiros,
            calculationText: 'Tempo decorrido do processo de entrada, conferência e saída de veículos de terceiros'
          }
        ]}
      />

      {/* MANUAL DE INSTRUÇÃO CARD */}
      <ManualInstrucaoCard
        title="Manual de Instrução & Parâmetros de Meta — TMR (Tempo Médio de Revenda)"
        metrics={tmrMetricsDef}
        userRole={user.papel || user.cargo}
        isManager={user.papel === 'admin' || user.papel === 'supervisor' || user.cargo?.toLowerCase().includes('gerente') || user.cargo?.toLowerCase().includes('supervisor') || true}
      />

      {/* METRIC CARDS GRID (CARRETA, RECARGA, TERCEIROS, GLOBAL) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARRETA TMR */}
        <div className="p-4 bg-[#11151c] border border-amber-500/30 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">TMR CARRETA</span>
            <Truck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono">{avgCarretaTimeMin} <span className="text-sm font-normal text-slate-400">min</span></span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${avgCarretaTimeMin <= META_CARRETA_MIN ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
              Meta: ≤ {META_CARRETA_MIN} min
            </span>
          </div>
          <div className="mt-3 pt-2 border-t border-[#1c2530] flex justify-between text-[10px] text-slate-400">
            <span>Concluídas: <strong className="text-white">{finishedCarretas.length}</strong></span>
            <span>Aderência: <strong className={pctCarretasAdherence >= 85 ? 'text-emerald-400' : 'text-rose-400'}>{pctCarretasAdherence}%</strong></span>
          </div>
        </div>

        {/* RECARGAS TMR */}
        <div className="p-4 bg-[#11151c] border border-purple-500/30 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">TMR RECARGA</span>
            <RefreshCw className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono">{avgRecargaTimeMin} <span className="text-sm font-normal text-slate-400">min</span></span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${avgRecargaTimeMin <= META_RECARGA_MIN ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
              Meta: ≤ {META_RECARGA_MIN} min
            </span>
          </div>
          <div className="mt-3 pt-2 border-t border-[#1c2530] flex justify-between text-[10px] text-slate-400">
            <span>Concluídas: <strong className="text-white">{totalRecargasCount}</strong></span>
            <span>Aderência: <strong className={pctRecargasAdherence >= 85 ? 'text-purple-400' : 'text-rose-400'}>{pctRecargasAdherence}%</strong></span>
          </div>
        </div>

        {/* TERCEIROS TMR */}
        <div className="p-4 bg-[#11151c] border border-blue-500/30 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">TMR TERCEIROS</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono">{avgTerceirosTimeMin} <span className="text-sm font-normal text-slate-400">min</span></span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${avgTerceirosTimeMin <= META_TERCEIROS_MIN ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
              Meta: ≤ {META_TERCEIROS_MIN} min
            </span>
          </div>
          <div className="mt-3 pt-2 border-t border-[#1c2530] flex justify-between text-[10px] text-slate-400">
            <span>Concluídas: <strong className="text-white">{finishedTerceiros.length}</strong></span>
            <span>Aderência: <strong className={pctTerceirosAdherence >= 85 ? 'text-blue-400' : 'text-rose-400'}>{pctTerceirosAdherence}%</strong></span>
          </div>
        </div>

        {/* OVERALL TMR ADHERENCE */}
        <div className="p-4 bg-[#11151c] border border-emerald-500/30 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">ADERÊNCIA GLOBAL TMR</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-400 font-mono">{overallTmrAdherence}%</span>
            <span className="text-xs text-slate-400 font-bold">Meta: 100%</span>
          </div>
          <div className="mt-3 pt-2 border-t border-[#1c2530] flex justify-between text-[10px] text-slate-400">
            <span>No Prazo: <strong className="text-emerald-400">{totalCompliantOps}</strong></span>
            <span>Total Ops: <strong className="text-white">{totalCompletedOps}</strong></span>
          </div>
        </div>
      </div>

      {/* COMPARATIVO META X REAL (RECHARTS CHART) */}
      <div className="p-5 bg-[#11151c] border border-[#222d3a] rounded-2xl flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[#222d3a] pb-3">
          <div>
            <h3 className="font-sans font-bold text-xs uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400" /> COMPARATIVO META X REALIZADO (MINUTOS DE ATENDIMENTO)
            </h3>
            <p className="text-[10px] text-slate-400">Medição estrita entre Iniciar e Concluir registrado na Operação Empilhador</p>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparativoData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid stroke="#1e293b" vertical={false} />
              <XAxis dataKey="tipo" stroke="#94a3b8" fontSize={11} fontWeight="bold" tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} unit=" min" />
              <Tooltip 
                content={
                  <ChartTooltipExplainer 
                    title="Tempo Médio x Meta TMR"
                    concept="Tempo transcorrido estritamente entre o Iniciar e o Concluir registrado na Operação Empilhador."
                    formula="Média TMR = (Soma das Durações em Minutos) / (Total de Operações Concluídas)"
                    unit=" min"
                  />
                } 
              />
              
              <Bar dataKey="Real" name="Tempo Real (min)" radius={[4, 4, 0, 0]} barSize={40}>
                {comparativoData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
              <Bar dataKey="Meta" name="Meta Limite (min)" fill="#475569" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* OPERATOR RANKING & PERFORMANCE (WITH RED HIGHLIGHT FOR BELOW TARGET) */}
      <div className="p-5 bg-[#11151c] border border-[#222d3a] rounded-2xl flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[#222d3a] pb-3">
          <h3 className="font-sans font-bold text-xs uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-amber-400" /> RANKING DE PRODUTIVIDADE & TEMPO POR OPERADOR
          </h3>
          <span className="text-[10px] text-slate-400">Destaque em vermelho para operadores com aderência &lt; 85%</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {sortedOperators.length === 0 ? (
            <p className="text-xs text-slate-500 p-4 col-span-3 text-center">Nenhuma operação finalizada por empilhadores ainda.</p>
          ) : (
            sortedOperators.map(([opName, stats]) => {
              const opAvg = stats.totalOps > 0 ? Math.round(stats.totalTime / stats.totalOps) : 0;
              const opAdherence = stats.totalOps > 0 ? Math.round((stats.compliantOps / stats.totalOps) * 100) : 100;
              const isLowAdherence = opAdherence < 85;

              return (
                <div 
                  key={opName} 
                  className={`p-4 rounded-xl border flex flex-col gap-2 transition-all ${
                    isLowAdherence 
                      ? 'bg-rose-950/20 border-rose-500/50 shadow-rose-950/30' 
                      : 'bg-[#151b23] border-[#222d3a]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-white uppercase flex items-center gap-1.5">
                      {isLowAdherence && <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
                      {opName}
                    </span>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      isLowAdherence
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-black'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {opAdherence}% Aderência
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-1 text-center">
                    <div className="p-2 bg-[#0d1218] rounded-lg">
                      <span className="text-[8px] text-slate-400 font-bold uppercase block">Ops</span>
                      <span className="font-mono font-black text-amber-400 text-xs">{stats.totalOps}</span>
                    </div>
                    <div className="p-2 bg-[#0d1218] rounded-lg">
                      <span className="text-[8px] text-slate-400 font-bold uppercase block">Média</span>
                      <span className="font-mono font-black text-blue-400 text-xs">{opAvg} min</span>
                    </div>
                    <div className="p-2 bg-[#0d1218] rounded-lg">
                      <span className="text-[8px] text-slate-400 font-bold uppercase block">Conformes</span>
                      <span className="font-mono font-black text-emerald-400 text-xs">{stats.compliantOps}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RECENT EXECUTED OPERATIONS TABLE */}
      <div className="p-5 bg-[#11151c] border border-[#222d3a] rounded-2xl flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[#222d3a] pb-3">
          <h3 className="font-sans font-bold text-xs uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-400" /> HISTÓRICO DE OPERAÇÕES TMR (REGISTROS EM TEMPO REAL)
          </h3>
          <span className="text-[10px] text-slate-400">Total: {totalCompletedOps} registros finalizados</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#222d3a] text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                <th className="py-2.5 px-3">Tipo</th>
                <th className="py-2.5 px-3">Identificação / Placa</th>
                <th className="py-2.5 px-3">Prazo de Carregamento</th>
                <th className="py-2.5 px-3">Operador Executor</th>
                <th className="py-2.5 px-3">Início</th>
                <th className="py-2.5 px-3">Término</th>
                <th className="py-2.5 px-3 text-center">Duração</th>
                <th className="py-2.5 px-3 text-center">Meta Limite</th>
                <th className="py-2.5 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c2530]">
              {/* TMR DEMANDS */}
              {filteredDemands.filter(t => t.status === 'done').map(t => {
                const isRecarga = t.tipoDemanda === 'Recarga';
                const isTerceiro = t.tipoDemanda === 'Terceiros' || t.carreta?.toLowerCase().includes('terceiro');
                const targetMin = isRecarga ? META_RECARGA_MIN : isTerceiro ? META_TERCEIROS_MIN : META_CARRETA_MIN;
                const compliant = (t.duracaoMin || 0) <= targetMin;

                return (
                  <tr key={`tmr_demand_${t.id}`} className="hover:bg-[#151b23]/50">
                    <td className="py-3 px-3">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                        isRecarga 
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                          : isTerceiro 
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {isRecarga ? 'Recarga' : isTerceiro ? 'Terceiros' : 'Carreta TMR'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-black text-amber-300">{t.carreta}</td>
                    <td className="py-3 px-3 font-semibold text-slate-200">{t.revendaNome}</td>
                    <td className="py-3 px-3 text-slate-300 font-bold">{t.operadorExecutor || 'Empilhador'}</td>
                    <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">
                      {t.iniciadoEm ? new Date(t.iniciadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">
                      {t.finalizadoEm ? new Date(t.finalizadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-extrabold text-white">
                      {t.duracaoMin} min
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-slate-400 text-[11px]">
                      {targetMin} min
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full uppercase ${
                        compliant 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {compliant ? '✓ No Prazo' : '✕ Fora do Prazo'}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {/* RECARGA VEHICLES */}
              {recargaVehicles.map(v => {
                const compliant = (v.duracaoCarregamentoMin || 0) <= META_RECARGA_MIN;
                return (
                  <tr key={`recarga_veh_${v.id}`} className="hover:bg-[#151b23]/50">
                    <td className="py-3 px-3">
                      <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[9px] font-bold px-2 py-0.5 rounded uppercase">
                        Recarga
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-black text-amber-300">{v.placa}</td>
                    <td className="py-3 px-3 font-semibold text-slate-200">Rota / Recarga</td>
                    <td className="py-3 px-3 text-slate-300 font-bold">{v.operadorExecutorCarregamento || 'Empilhador'}</td>
                    <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">
                      {v.horaInicioCarregamento || '—'}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">
                      {v.horaFimCarregamento || '—'}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-extrabold text-white">
                      {v.duracaoCarregamentoMin} min
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-slate-400 text-[11px]">
                      {META_RECARGA_MIN} min
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full uppercase ${
                        compliant 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {compliant ? '✓ No Prazo' : '✕ Fora do Prazo'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SOP BANNER VIEWER */}
      {showPopModal && (
        <SopBannerViewer
          operation="empilhador"
          operationName="TMR (Tempo Médio de Revenda)"
        />
      )}
    </div>
  );
}
