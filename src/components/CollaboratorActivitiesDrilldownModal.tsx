import React, { useState } from 'react';
import {
  X,
  Award,
  Box,
  Trash2,
  AlertTriangle,
  Clock,
  Zap,
  TrendingUp,
  UserCheck,
  Calendar,
  Layers,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Truck,
  RotateCcw,
  ShieldCheck,
  Package,
  Activity
} from 'lucide-react';
import { CollaboratorPnpSummary } from '../utils/pnpCollaboratorUtils';

interface CollaboratorActivitiesDrilldownModalProps {
  collaborator: CollaboratorPnpSummary | null;
  onClose: () => void;
}

export const CollaboratorActivitiesDrilldownModal: React.FC<CollaboratorActivitiesDrilldownModalProps> = ({
  collaborator,
  onClose
}) => {
  const isEmpilhador = collaborator?.funcaoGroup === 'Empilhador' || 
    collaborator?.cargo.toLowerCase().includes('empilhador') || 
    collaborator?.cargo.toLowerCase().includes('empilhadeira');

  const [activeTab, setActiveTab] = useState<string>(isEmpilhador ? 'geral_empilhador' : 'geral');

  if (!collaborator) return null;

  const {
    nome,
    cargo,
    matricula,
    turno,
    metaPnp,
    realPnp,
    totalHoras,
    diasTrabalhados,
    percentualMeta,
    statusMeta,
    repack,
    despejo,
    quebras,
    jornadas,
    empilhador
  } = collaborator;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
      <div className="bg-[#0f172a] border border-slate-700/80 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        
        {/* MODAL HEADER */}
        <div className="p-5 bg-gradient-to-r from-[#111a30] to-[#1e293b] border-b border-slate-700 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-black text-xl shadow-inner">
              {isEmpilhador ? <Truck className="w-6 h-6 text-amber-400" /> : nome.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wide">
                  {nome}
                </h2>
                <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  {cargo}
                </span>
                <span className="bg-slate-800 text-slate-300 text-[10px] font-mono px-2 py-0.5 rounded-full">
                  Mat: {matricula}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Turno: <strong className="text-slate-200">{turno}</strong> • Auditoria Completa de Desempenho Acumulado no Mês (Meta vs Real)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            title="Fechar Detalhes"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── TOP LEVEL KPI BAR ── */}
        {isEmpilhador ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 p-4 bg-[#0a0f1d] border-b border-slate-800 shrink-0">
            {/* EFC */}
            <div className="bg-[#131d33] border border-indigo-500/30 rounded-xl p-2.5">
              <span className="text-[9px] font-black text-indigo-400 uppercase block">EFC (Carga)</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-base font-black font-mono text-emerald-400">{empilhador.efc.compliancePct}%</span>
                <span className="text-[10px] font-mono text-slate-400">({empilhador.efc.tempoMedioMin}m)</span>
              </div>
              <span className="text-[9px] text-slate-400 block mt-0.5">Meta: ≤06:30</span>
            </div>

            {/* EFD */}
            <div className="bg-[#131d33] border border-indigo-500/30 rounded-xl p-2.5">
              <span className="text-[9px] font-black text-indigo-400 uppercase block">EFD (Descarga)</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-base font-black font-mono text-emerald-400">{empilhador.efd.compliancePct}%</span>
                <span className="text-[10px] font-mono text-slate-400">({empilhador.efd.tempoMedioMin}m)</span>
              </div>
              <span className="text-[9px] text-slate-400 block mt-0.5">Meta: ≤22:00</span>
            </div>

            {/* TMR */}
            <div className="bg-[#131d33] border border-slate-800 rounded-xl p-2.5">
              <span className="text-[9px] font-black text-slate-400 uppercase block">TMR Médio</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-base font-black font-mono text-white">{empilhador.tmr.tempoMedioMin}m</span>
                <span className="text-[10px] font-mono text-slate-400">/ 15m</span>
              </div>
              <span className="text-[9px] text-emerald-400 font-bold block mt-0.5">Meta 15 min</span>
            </div>

            {/* RESSUPRIMENTO & REABASTECIMENTO */}
            <div className="bg-[#131d33] border border-slate-800 rounded-xl p-2.5">
              <span className="text-[9px] font-black text-amber-400 uppercase block">Ressuprimento</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-base font-black font-mono text-amber-300">{empilhador.ressuprimento.tempoMedioPalletMin}m</span>
                <span className="text-[10px] font-mono text-slate-400">/ palete</span>
              </div>
              <span className="text-[9px] text-slate-400 block mt-0.5">Meta: 5.0m/pl</span>
            </div>

            {/* WQI CAUSADO */}
            <div className="bg-[#131d33] border border-slate-800 rounded-xl p-2.5">
              <span className="text-[9px] font-black text-emerald-400 uppercase block">WQI Operador</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-base font-black font-mono text-emerald-400">{empilhador.wqi.indicePct}%</span>
                <span className="text-[10px] font-mono text-slate-400">({empilhador.wqi.totalAvariasOperador} av)</span>
              </div>
              <span className="text-[9px] text-emerald-400 font-bold block mt-0.5">Meta: ≥95.0%</span>
            </div>

            {/* PNP OFICIAL */}
            <div className="bg-[#131d33] border border-indigo-500/30 rounded-xl p-2.5">
              <span className="text-[9px] font-black text-indigo-400 uppercase block">PNP Oficial</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-base font-black font-mono text-emerald-400">{realPnp.toFixed(2)}</span>
                <span className="text-[10px] font-mono text-slate-400">/ 6.23</span>
              </div>
              <span className="text-[9px] text-slate-400 block mt-0.5">{totalHoras.toFixed(1)}h Trab.</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-[#0a0f1d] border-b border-slate-800 shrink-0">
            {/* PNP META VS REAL */}
            <div className="bg-[#131d33] border border-indigo-500/30 rounded-xl p-3">
              <div className="flex items-center justify-between text-[10px] font-black text-indigo-400 uppercase">
                <span>PNP Oficial</span>
                <Award className="w-3.5 h-3.5" />
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-black font-mono text-emerald-400">{realPnp.toFixed(2)}</span>
                <span className="text-xs font-mono text-slate-400 font-bold">/ Meta: {metaPnp.toFixed(2)} HL/HH</span>
              </div>
              <div className="text-[10px] text-slate-400 font-semibold mt-0.5 flex items-center gap-1">
                <span>Atingimento:</span>
                <strong className={percentualMeta >= 100 ? 'text-emerald-400' : 'text-amber-400'}>
                  {percentualMeta.toFixed(1)}%
                </strong>
              </div>
            </div>

            {/* TOTAL HORAS */}
            <div className="bg-[#131d33] border border-slate-800 rounded-xl p-3">
              <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase">
                <span>Jornada Total</span>
                <Clock className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-xl font-black font-mono text-white">{totalHoras.toFixed(1)}</span>
                <span className="text-xs text-slate-400">Horas (HH)</span>
              </div>
              <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                Escala oficial do armazém
              </div>
            </div>

            {/* DIAS TRABALHADOS */}
            <div className="bg-[#131d33] border border-slate-800 rounded-xl p-3">
              <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase">
                <span>Dias Trabalhados</span>
                <Calendar className="w-3.5 h-3.5 text-sky-400" />
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-xl font-black font-mono text-white">{diasTrabalhados}</span>
                <span className="text-xs text-slate-400">Dias</span>
              </div>
              <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                Presença confirmada
              </div>
            </div>

            {/* STATUS DA META */}
            <div className="bg-[#131d33] border border-slate-800 rounded-xl p-3">
              <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase">
                <span>Status Desempenho</span>
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="mt-1">
                <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-black uppercase ${
                  statusMeta === 'Acima da Meta' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                  statusMeta === 'Dentro da Meta' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40' :
                  'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}>
                  {statusMeta}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                Gatilho PNP: 6.23 HL/HH
              </div>
            </div>
          </div>
        )}

        {/* ── TAB NAVIGATION ── */}
        <div className="flex items-center gap-1.5 px-4 pt-3 border-b border-slate-800 bg-[#0f172a] shrink-0 overflow-x-auto">
          {isEmpilhador ? (
            <>
              <button
                onClick={() => setActiveTab('geral_empilhador')}
                className={`px-4 py-2.5 rounded-t-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 border-t-2 border-x-2 ${
                  activeTab === 'geral_empilhador'
                    ? 'bg-[#131d33] text-indigo-300 border-indigo-500/40 border-b-transparent'
                    : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>Visão Geral Empilhador</span>
              </button>

              <button
                onClick={() => setActiveTab('efc')}
                className={`px-4 py-2.5 rounded-t-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 border-t-2 border-x-2 ${
                  activeTab === 'efc'
                    ? 'bg-[#131d33] text-indigo-300 border-indigo-500/40 border-b-transparent'
                    : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <Truck className="w-4 h-4 text-emerald-400" />
                <span>EFC - Carregamento</span>
                <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded text-[10px]">
                  {empilhador.efc.atividades.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('efd')}
                className={`px-4 py-2.5 rounded-t-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 border-t-2 border-x-2 ${
                  activeTab === 'efd'
                    ? 'bg-[#131d33] text-indigo-300 border-indigo-500/40 border-b-transparent'
                    : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <Truck className="w-4 h-4 text-sky-400" />
                <span>EFD - Descarregamento</span>
                <span className="px-1.5 py-0.2 bg-sky-500/20 text-sky-300 rounded text-[10px]">
                  {empilhador.efd.atividades.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('tmr')}
                className={`px-4 py-2.5 rounded-t-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 border-t-2 border-x-2 ${
                  activeTab === 'tmr'
                    ? 'bg-[#131d33] text-indigo-300 border-indigo-500/40 border-b-transparent'
                    : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <RotateCcw className="w-4 h-4 text-purple-400" />
                <span>TMR & Recargas</span>
                <span className="px-1.5 py-0.2 bg-purple-500/20 text-purple-300 rounded text-[10px]">
                  {empilhador.tmr.atividades.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('ressuprimento')}
                className={`px-4 py-2.5 rounded-t-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 border-t-2 border-x-2 ${
                  activeTab === 'ressuprimento'
                    ? 'bg-[#131d33] text-amber-300 border-amber-500/40 border-b-transparent'
                    : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <Package className="w-4 h-4 text-amber-400" />
                <span>Ressuprimento Picking (5m/pl)</span>
              </button>

              <button
                onClick={() => setActiveTab('wqi_empilhador')}
                className={`px-4 py-2.5 rounded-t-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 border-t-2 border-x-2 ${
                  activeTab === 'wqi_empilhador'
                    ? 'bg-[#131d33] text-emerald-300 border-emerald-500/40 border-b-transparent'
                    : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>WQI & Avarias ({empilhador.wqi.indicePct}%)</span>
              </button>

              <button
                onClick={() => setActiveTab('jornadas')}
                className={`px-4 py-2.5 rounded-t-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 border-t-2 border-x-2 ${
                  activeTab === 'jornadas'
                    ? 'bg-[#131d33] text-indigo-300 border-indigo-500/40 border-b-transparent'
                    : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Jornadas ({diasTrabalhados}d)</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveTab('geral')}
                className={`px-4 py-2.5 rounded-t-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 border-t-2 border-x-2 ${
                  activeTab === 'geral'
                    ? 'bg-[#131d33] text-indigo-300 border-indigo-500/40 border-b-transparent'
                    : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>Visão Geral</span>
              </button>

              <button
                onClick={() => setActiveTab('repack')}
                className={`px-4 py-2.5 rounded-t-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 border-t-2 border-x-2 ${
                  activeTab === 'repack'
                    ? 'bg-[#131d33] text-indigo-300 border-indigo-500/40 border-b-transparent'
                    : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <Box className="w-4 h-4 text-indigo-400" />
                <span>Repack ({repack.totalCaixas} cx)</span>
              </button>

              <button
                onClick={() => setActiveTab('despejo')}
                className={`px-4 py-2.5 rounded-t-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 border-t-2 border-x-2 ${
                  activeTab === 'despejo'
                    ? 'bg-[#131d33] text-indigo-300 border-indigo-500/40 border-b-transparent'
                    : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <Trash2 className="w-4 h-4 text-amber-400" />
                <span>Despejo ({despejo.totalItens} itens)</span>
              </button>

              <button
                onClick={() => setActiveTab('quebras')}
                className={`px-4 py-2.5 rounded-t-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 border-t-2 border-x-2 ${
                  activeTab === 'quebras'
                    ? 'bg-[#131d33] text-indigo-300 border-indigo-500/40 border-b-transparent'
                    : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Quebras ({quebras.totalOcorrencias})</span>
              </button>

              <button
                onClick={() => setActiveTab('jornadas')}
                className={`px-4 py-2.5 rounded-t-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 border-t-2 border-x-2 ${
                  activeTab === 'jornadas'
                    ? 'bg-[#131d33] text-indigo-300 border-indigo-500/40 border-b-transparent'
                    : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Jornadas ({diasTrabalhados}d)</span>
              </button>
            </>
          )}
        </div>

        {/* ── TAB CONTENT ── */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          
          {/* TAB: VISÃO GERAL EMPILHADOR */}
          {activeTab === 'geral_empilhador' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#111a30] border border-indigo-500/30 rounded-2xl">
                <h3 className="text-sm font-black uppercase text-white flex items-center gap-2">
                  <Truck className="w-4 h-4 text-indigo-400" /> Resumo do Cockpit de Operação de Empilhadeira
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Indicadores acumulados do mês aferidos conforme metas unificadas DPO: EFC ≤06:30, EFD ≤22:00, TMR ≤15m, Ressuprimento ≤5m/pl e WQI ≥95%.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-black text-xs uppercase text-indigo-300 flex items-center gap-2">
                      <Truck className="w-4 h-4 text-emerald-400" /> EFC — Fila de Carregamento
                    </span>
                    <span className="text-xs font-bold text-emerald-400 font-mono">{empilhador.efc.compliancePct}% no prazo</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Meta Oficial:</span>
                    <strong className="text-white font-mono">{empilhador.efc.metaHorario} (100% no prazo)</strong>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Tempo Médio de Carregamento:</span>
                    <strong className="text-emerald-400 font-mono">{empilhador.efc.tempoMedioMin} min</strong>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Veículos Carregados:</span>
                    <strong className="text-white font-mono">{empilhador.efc.totalVeiculos} veículos ({empilhador.efc.noPrazoCount} no prazo)</strong>
                  </div>
                </div>

                <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-black text-xs uppercase text-indigo-300 flex items-center gap-2">
                      <Truck className="w-4 h-4 text-sky-400" /> EFD — Fila de Descarregamento
                    </span>
                    <span className="text-xs font-bold text-emerald-400 font-mono">{empilhador.efd.compliancePct}% no prazo</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Meta Oficial:</span>
                    <strong className="text-white font-mono">{empilhador.efd.metaHorario}</strong>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Tempo Médio de Descarga:</span>
                    <strong className="text-sky-300 font-mono">{empilhador.efd.tempoMedioMin} min</strong>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Pernoites Atendidos (D1-D4):</span>
                    <strong className="text-amber-400 font-mono">{empilhador.efd.pernoiteCount} carretas</strong>
                  </div>
                </div>

                <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-black text-xs uppercase text-indigo-300 flex items-center gap-2">
                      <RotateCcw className="w-4 h-4 text-purple-400" /> TMR — Tempo Médio de Rota / Transferência
                    </span>
                    <span className="text-xs font-bold text-white font-mono">{empilhador.tmr.tempoMedioMin} min</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Meta Oficial:</span>
                    <strong className="text-white font-mono">≤ 15.0 min</strong>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Demandas Atendidas:</span>
                    <strong className="text-white font-mono">{empilhador.tmr.totalDemandas} recargas</strong>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Conformidade SLA:</span>
                    <strong className="text-emerald-400 font-mono">{empilhador.tmr.compliancePct}%</strong>
                  </div>
                </div>

                <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-black text-xs uppercase text-amber-300 flex items-center gap-2">
                      <Package className="w-4 h-4 text-amber-400" /> Ressuprimento & Reabastecimento (R&R)
                    </span>
                    <span className="text-xs font-bold text-amber-300 font-mono">{empilhador.ressuprimento.tempoMedioPalletMin} m/pl</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Meta Oficial:</span>
                    <strong className="text-white font-mono">≤ 5.0 min / palete</strong>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Paletes Reabastecidos no Mês:</span>
                    <strong className="text-white font-mono">{empilhador.ressuprimento.totalPaletes} paletes</strong>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Tempo Total em R&R:</span>
                    <strong className="text-amber-300 font-mono">{empilhador.ressuprimento.tempoTotalMin} min</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: EFC CARREGAMENTO */}
          {activeTab === 'efc' && (
            <div className="space-y-4">
              <div className="p-3 bg-[#111a30] border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase text-white">EFC — Fila de Carregamento (Meta: ≤ 06:30)</h4>
                  <p className="text-[11px] text-slate-400">Tempo médio meta por veículo: 15 min</p>
                </div>
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-black rounded-lg border border-emerald-500/40">
                  {empilhador.efc.compliancePct}% de Conformidade
                </span>
              </div>

              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#090d16] text-[10px] font-black uppercase text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3">Data</th>
                    <th className="p-3">Placa / Veículo</th>
                    <th className="p-3">Tipo</th>
                    <th className="p-3">Duração Real</th>
                    <th className="p-3">Meta Ciclo</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  {empilhador.efc.atividades.map((a, i) => (
                    <tr key={a.id || i} className="hover:bg-slate-800/40">
                      <td className="p-3 font-sans font-bold text-slate-200">{a.data}</td>
                      <td className="p-3 font-black text-white">{a.placa}</td>
                      <td className="p-3 font-sans text-slate-300">{a.tipoVeiculo}</td>
                      <td className="p-3 font-black text-emerald-400">{a.duracaoRealMin} min</td>
                      <td className="p-3 text-slate-400">{a.duracaoMetaMin} min</td>
                      <td className="p-3 font-sans">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          a.status === 'DENTRO DA META' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB: EFD DESCARREGAMENTO */}
          {activeTab === 'efd' && (
            <div className="space-y-4">
              <div className="p-3 bg-[#111a30] border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase text-white">EFD — Fila de Descarregamento (Meta: ≤ 22:00)</h4>
                  <p className="text-[11px] text-slate-400">Tempo médio meta por carreta: 20 min</p>
                </div>
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-black rounded-lg border border-emerald-500/40">
                  {empilhador.efd.compliancePct}% de Conformidade
                </span>
              </div>

              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#090d16] text-[10px] font-black uppercase text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3">Data</th>
                    <th className="p-3">Placa / Veículo</th>
                    <th className="p-3">Tipo</th>
                    <th className="p-3">Duração Real</th>
                    <th className="p-3">Pernoite</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  {empilhador.efd.atividades.map((a, i) => (
                    <tr key={a.id || i} className="hover:bg-slate-800/40">
                      <td className="p-3 font-sans font-bold text-slate-200">{a.data}</td>
                      <td className="p-3 font-black text-white">{a.placa}</td>
                      <td className="p-3 font-sans text-slate-300">{a.tipoVeiculo}</td>
                      <td className="p-3 font-black text-sky-300">{a.duracaoRealMin} min</td>
                      <td className="p-3 font-sans text-amber-400">{a.isPernoite ? 'Sim' : 'Não'}</td>
                      <td className="p-3 font-sans">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          a.status === 'DENTRO DA META' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB: TMR & RECARGAS */}
          {activeTab === 'tmr' && (
            <div className="space-y-4">
              <div className="p-3 bg-[#111a30] border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase text-white">TMR — Tempo Médio de Rota / Transferência</h4>
                  <p className="text-[11px] text-slate-400">Meta oficial: 15 min por demanda de recarga</p>
                </div>
                <span className="px-3 py-1 bg-purple-500/20 text-purple-300 text-xs font-black rounded-lg border border-purple-500/40">
                  Média: {empilhador.tmr.tempoMedioMin} min
                </span>
              </div>

              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#090d16] text-[10px] font-black uppercase text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3">Data</th>
                    <th className="p-3">Origem</th>
                    <th className="p-3">Destino</th>
                    <th className="p-3">Duração Real</th>
                    <th className="p-3">Meta</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  {empilhador.tmr.atividades.map((a, i) => (
                    <tr key={a.id || i} className="hover:bg-slate-800/40">
                      <td className="p-3 font-sans font-bold text-slate-200">{a.data}</td>
                      <td className="p-3 font-sans text-slate-300">{a.origem}</td>
                      <td className="p-3 font-sans text-slate-300">{a.destino}</td>
                      <td className="p-3 font-black text-purple-300">{a.duracaoRealMin} min</td>
                      <td className="p-3 text-slate-400">{a.duracaoMetaMin} min</td>
                      <td className="p-3 font-sans">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          a.status === 'DENTRO DA META' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB: RESSUPRIMENTO & REABASTECIMENTO */}
          {activeTab === 'ressuprimento' && (
            <div className="space-y-4">
              <div className="p-3 bg-[#111a30] border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase text-white">Ressuprimento & Reabastecimento Picking</h4>
                  <p className="text-[11px] text-slate-400">Meta oficial: 5.0 min por palete movimentado</p>
                </div>
                <span className="px-3 py-1 bg-amber-500/20 text-amber-300 text-xs font-black rounded-lg border border-amber-500/40">
                  {empilhador.ressuprimento.tempoMedioPalletMin} min/palete
                </span>
              </div>

              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#090d16] text-[10px] font-black uppercase text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3">Data</th>
                    <th className="p-3">Produto</th>
                    <th className="p-3">Paletes</th>
                    <th className="p-3">Tempo Total</th>
                    <th className="p-3">Tempo Médio / PL</th>
                    <th className="p-3">Meta / PL</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  {empilhador.ressuprimento.atividades.map((a, i) => (
                    <tr key={a.id || i} className="hover:bg-slate-800/40">
                      <td className="p-3 font-sans font-bold text-slate-200">{a.data}</td>
                      <td className="p-3 font-sans font-black text-white">{a.produto}</td>
                      <td className="p-3 font-black text-amber-300">{a.paletes} PL</td>
                      <td className="p-3 text-slate-300">{a.duracaoRealMin} min</td>
                      <td className="p-3 font-black text-emerald-400">{a.tempoMedioPalletMin} m/pl</td>
                      <td className="p-3 text-slate-400">{a.metaTempoPalletMin} m/pl</td>
                      <td className="p-3 font-sans">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB: WQI EMPILHADOR */}
          {activeTab === 'wqi_empilhador' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#111a30] border border-slate-800 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black uppercase text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    WQI — Índice de Qualidade do Operador de Empilhadeira
                  </h4>
                  <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-black text-sm font-mono">
                    {empilhador.wqi.indicePct}% (Meta: ≥95%)
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  O WQI do operador avalia a ausência de quebras, furos de garfos em paletes de lata/garrafa e conformidade de empilhamento no armazém.
                </p>
              </div>

              <div className="p-4 bg-[#090d16] border border-slate-800 rounded-xl">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-300">Total de Avarias Causadas no Mês:</span>
                  <span className="text-emerald-400 font-mono text-sm">{empilhador.wqi.totalAvariasOperador} ocorrências</span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold mt-2 pt-2 border-t border-slate-800">
                  <span className="text-slate-300">Status de Qualidade:</span>
                  <span className="text-emerald-400 uppercase font-black">{empilhador.wqi.status}</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB: JORNADAS */}
          {activeTab === 'jornadas' && (
            <div className="space-y-4">
              <div className="p-3 bg-[#111a30] border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase text-white">Auditoria de Jornadas & Horas Trabalhadas (HH)</h4>
                  <p className="text-[11px] text-slate-400">Total acumulado: {totalHoras.toFixed(1)} Horas em {diasTrabalhados} dias</p>
                </div>
              </div>

              {jornadas.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs">
                  Nenhum registro detalhado de jornada manual cadastrado. Utilizando escala padrão da unidade.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#090d16] text-[10px] font-black uppercase text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-3">Data</th>
                      <th className="p-3">Início</th>
                      <th className="p-3">Fim</th>
                      <th className="p-3">Horas Trabalhadas</th>
                      <th className="p-3">Cargo / Função</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-mono">
                    {jornadas.map((j, i) => (
                      <tr key={j.id || i} className="hover:bg-slate-800/40">
                        <td className="p-3 font-sans font-bold text-slate-200">{j.dataStr || j.dataISO}</td>
                        <td className="p-3 text-slate-300">{j.horaInicio || '08:00'}</td>
                        <td className="p-3 text-slate-300">{j.horaFim || '16:20'}</td>
                        <td className="p-3 font-black text-emerald-400">{j.duracaoHoras.toFixed(2)}h</td>
                        <td className="p-3 font-sans text-slate-400">{j.cargo || cargo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB: VISÃO GERAL AJUDANTE */}
          {activeTab === 'geral' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#111a30] border border-indigo-500/30 rounded-2xl">
                <h3 className="text-sm font-black uppercase text-white flex items-center gap-2">
                  <Box className="w-4 h-4 text-indigo-400" /> Resumo do Cockpit de Repack & Despejo
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Indicadores acumulados do mês com base na meta oficial de Ritmo de Repack (10 cx/h) e Despejo (3 min/item).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-black text-xs uppercase text-indigo-300 flex items-center gap-2">
                      <Box className="w-4 h-4 text-indigo-400" /> Repack
                    </span>
                    <span className="text-xs font-bold text-emerald-400 font-mono">{repack.totalCaixas} CX</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Ritmo Real:</span>
                    <strong className="text-white font-mono">{repack.ritmoRealCxH} cx/h</strong>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Meta Oficial:</span>
                    <strong className="text-slate-400 font-mono">{repack.ritmoMetaCxH} cx/h</strong>
                  </div>
                </div>

                <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-black text-xs uppercase text-amber-300 flex items-center gap-2">
                      <Trash2 className="w-4 h-4 text-amber-400" /> Despejo
                    </span>
                    <span className="text-xs font-bold text-amber-400 font-mono">{despejo.totalItens} Itens</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Tempo Real:</span>
                    <strong className="text-white font-mono">{despejo.tempoRealMin} min</strong>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Tempo Meta:</span>
                    <strong className="text-slate-400 font-mono">{despejo.tempoMetaMin} min</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: REPACK */}
          {activeTab === 'repack' && (
            <div className="space-y-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#090d16] text-[10px] font-black uppercase text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3">Data</th>
                    <th className="p-3">Embalagem</th>
                    <th className="p-3">Quantidade</th>
                    <th className="p-3">Duração Real</th>
                    <th className="p-3">Meta</th>
                    <th className="p-3">Ritmo (cx/h)</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  {repack.atividades.map((a, i) => (
                    <tr key={a.id || i} className="hover:bg-slate-800/40">
                      <td className="p-3 font-sans font-bold text-slate-200">{a.data}</td>
                      <td className="p-3 font-sans text-white font-bold">{a.embalagem}</td>
                      <td className="p-3 font-black text-indigo-300">{a.quantidade} CX</td>
                      <td className="p-3 text-slate-300">{a.duracaoRealMin} min</td>
                      <td className="p-3 text-slate-400">{a.duracaoMetaMin} min</td>
                      <td className="p-3 font-black text-emerald-400">{a.ritmoRealCxH}</td>
                      <td className="p-3 font-sans">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          a.status === 'DENTRO DA META' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB: DESPEJO */}
          {activeTab === 'despejo' && (
            <div className="space-y-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#090d16] text-[10px] font-black uppercase text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3">Data</th>
                    <th className="p-3">Tipo Vasilhame</th>
                    <th className="p-3">Quantidade</th>
                    <th className="p-3">Duração Real</th>
                    <th className="p-3">Meta</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  {despejo.atividades.map((a, i) => (
                    <tr key={a.id || i} className="hover:bg-slate-800/40">
                      <td className="p-3 font-sans font-bold text-slate-200">{a.data}</td>
                      <td className="p-3 font-sans text-white font-bold">{a.tipoVasilhame}</td>
                      <td className="p-3 font-black text-amber-300">{a.quantidade} CX</td>
                      <td className="p-3 text-slate-300">{a.duracaoRealMin} min</td>
                      <td className="p-3 text-slate-400">{a.duracaoMetaMin} min</td>
                      <td className="p-3 font-sans">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          a.status === 'DENTRO DA META' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB: QUEBRAS */}
          {activeTab === 'quebras' && (
            <div className="space-y-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#090d16] text-[10px] font-black uppercase text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3">Data</th>
                    <th className="p-3">Produto</th>
                    <th className="p-3">Quantidade</th>
                    <th className="p-3">Motivo</th>
                    <th className="p-3">Local</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {quebras.atividades.map((a, i) => (
                    <tr key={a.id || i} className="hover:bg-slate-800/40">
                      <td className="p-3 font-bold text-slate-200">{a.data}</td>
                      <td className="p-3 font-black text-white">{a.produto}</td>
                      <td className="p-3 font-mono font-black text-rose-400">{a.quantidade} CX</td>
                      <td className="p-3 text-slate-300">{a.motivo}</td>
                      <td className="p-3 text-slate-400">{a.local}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
