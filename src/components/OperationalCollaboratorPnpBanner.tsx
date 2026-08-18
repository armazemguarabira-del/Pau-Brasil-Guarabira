import React, { useState, useMemo } from 'react';
import { Usuario } from '../types';
import { useEmpresaData } from '../context/EmpresaDataContext';
import { getCollaboratorPnpSummary, CollaboratorPnpSummary } from '../utils/pnpCollaboratorUtils';
import { CollaboratorActivitiesDrilldownModal } from './CollaboratorActivitiesDrilldownModal';
import { 
  Award, 
  Zap, 
  Clock, 
  Box, 
  ChevronRight, 
  Sparkles, 
  TrendingUp, 
  Truck, 
  ShieldCheck, 
  RotateCcw, 
  Layers, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';

interface OperationalCollaboratorPnpBannerProps {
  user: Usuario;
  theme?: 'light' | 'dark';
}

export const OperationalCollaboratorPnpBanner: React.FC<OperationalCollaboratorPnpBannerProps> = ({
  user,
  theme = 'dark'
}) => {
  const empresaData = useEmpresaData();
  const [showModal, setShowModal] = useState(false);

  const colabSummary = useMemo<CollaboratorPnpSummary | null>(() => {
    const ident = user.nome || user.email || user.uid || '';
    return getCollaboratorPnpSummary(
      ident,
      user.empresaId || 'demo',
      empresaData.repack,
      empresaData.despejo,
      empresaData.quebras
    );
  }, [user, empresaData.repack, empresaData.despejo, empresaData.quebras]);

  if (!colabSummary) {
    return null;
  }

  const {
    nome,
    cargo,
    matricula,
    funcaoGroup,
    metaPnp,
    realPnp,
    totalHoras,
    diasTrabalhados,
    percentualMeta,
    statusMeta,
    repack,
    despejo,
    empilhador
  } = colabSummary;

  const isEmpilhador = funcaoGroup === 'Empilhador' || cargo.toLowerCase().includes('empilhador') || cargo.toLowerCase().includes('empilhadeira');

  return (
    <>
      <div className="w-full bg-gradient-to-r from-[#111a30] via-[#152342] to-[#0f172a] border-2 border-indigo-500/40 rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden text-slate-100 min-w-0">
        <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 relative z-10 min-w-0">
          
          {/* IDENTIFICAÇÃO DO COLABORADOR */}
          <div className="flex items-center gap-3.5 min-w-0 shrink-0">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-indigo-600/30 border border-indigo-400/50 flex items-center justify-center text-indigo-300 font-black text-xl shadow-lg shrink-0">
              {isEmpilhador ? (
                <Truck className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
              ) : (
                <Award className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 whitespace-nowrap">
                  {isEmpilhador ? 'DESEMPENHO DO OPERADOR (ACUMULADO DO MÊS)' : 'DESEMPENHO OPERACIONAL (PNP)'}
                </span>
                <span className="text-[9px] sm:text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded whitespace-nowrap">
                  Mat: {matricula}
                </span>
              </div>
              <h2 className="text-sm sm:text-base md:text-lg font-black text-white uppercase tracking-wide mt-0.5 truncate">
                {nome} — <span className="text-indigo-300 font-bold">{cargo}</span>
              </h2>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              KPI COCKPIT: OPERADOR DE EMPILHADEIRA (EFC, EFD, TMR, RESSUPRIMENTO, WQI, PNP)
          ───────────────────────────────────────────────────────────── */}
          {isEmpilhador ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5 w-full xl:w-auto min-w-0">
              
              {/* 1. EFC (FILA DE CARREGAMENTO) */}
              <div className="bg-[#0b1222]/90 border border-indigo-500/30 rounded-xl p-2 px-2.5 min-w-0">
                <span className="text-[9px] font-black uppercase text-indigo-300 block truncate">EFC (Carga)</span>
                <div className="flex items-baseline gap-1 mt-0.5 flex-wrap">
                  <strong className="text-sm sm:text-base font-black font-mono text-emerald-400">{empilhador.efc.compliancePct}%</strong>
                  <span className="text-[10px] text-slate-400 font-mono">({empilhador.efc.tempoMedioMin}m)</span>
                </div>
                <span className="text-[9px] text-slate-400 font-bold block mt-0.5 truncate">
                  Meta: {empilhador.efc.metaHorario}
                </span>
              </div>

              {/* 2. EFD (FILA DE DESCARREGAMENTO) */}
              <div className="bg-[#0b1222]/90 border border-indigo-500/30 rounded-xl p-2 px-2.5 min-w-0">
                <span className="text-[9px] font-black uppercase text-indigo-300 block truncate">EFD (Descarga)</span>
                <div className="flex items-baseline gap-1 mt-0.5 flex-wrap">
                  <strong className="text-sm sm:text-base font-black font-mono text-emerald-400">{empilhador.efd.compliancePct}%</strong>
                  <span className="text-[10px] text-slate-400 font-mono">({empilhador.efd.tempoMedioMin}m)</span>
                </div>
                <span className="text-[9px] text-slate-400 font-bold block mt-0.5 truncate">
                  Meta: {empilhador.efd.metaHorario}
                </span>
              </div>

              {/* 3. TMR (TEMPO MÉDIO DE ROTA / RECARGAS) */}
              <div className="bg-[#0b1222]/90 border border-indigo-500/30 rounded-xl p-2 px-2.5 min-w-0">
                <span className="text-[9px] font-black uppercase text-indigo-300 block truncate">TMR (Ciclo)</span>
                <div className="flex items-baseline gap-1 mt-0.5 flex-wrap">
                  <strong className="text-sm sm:text-base font-black font-mono text-white">{empilhador.tmr.tempoMedioMin}m</strong>
                  <span className="text-[10px] font-mono text-slate-400">/ 15m</span>
                </div>
                <span className={`text-[9px] font-black uppercase block mt-0.5 truncate ${
                  empilhador.tmr.tempoMedioMin <= 15 ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {empilhador.tmr.tempoMedioMin <= 15 ? 'Meta OK' : 'Ajustar'}
                </span>
              </div>

              {/* 4. RESSUPRIMENTO & REABASTECIMENTO (TEMPO MÉDIO POR PALLET) */}
              <div className="bg-[#0b1222]/90 border border-indigo-500/30 rounded-xl p-2 px-2.5 min-w-0">
                <span className="text-[9px] font-black uppercase text-amber-300 block truncate">Ressup. / R&R</span>
                <div className="flex items-baseline gap-1 mt-0.5 flex-wrap">
                  <strong className="text-sm sm:text-base font-black font-mono text-amber-300">{empilhador.ressuprimento.tempoMedioPalletMin}m</strong>
                  <span className="text-[10px] font-mono text-slate-400">/ pl</span>
                </div>
                <span className="text-[9px] text-slate-400 font-bold block mt-0.5 truncate">
                  Meta: 5.0 min/pl
                </span>
              </div>

              {/* 5. WQI CAUSADO NO MÊS */}
              <div className="bg-[#0b1222]/90 border border-indigo-500/30 rounded-xl p-2 px-2.5 min-w-0">
                <span className="text-[9px] font-black uppercase text-emerald-300 block truncate">WQI Operador</span>
                <div className="flex items-baseline gap-1 mt-0.5 flex-wrap">
                  <strong className="text-sm sm:text-base font-black font-mono text-emerald-400">{empilhador.wqi.indicePct}%</strong>
                  <span className="text-[10px] text-slate-400 font-mono">({empilhador.wqi.totalAvariasOperador} av)</span>
                </div>
                <span className="text-[9px] text-emerald-400 font-bold uppercase block mt-0.5 truncate">
                  Meta: ≥ 95.0%
                </span>
              </div>

              {/* 6. PNP OFICIAL (HL/HH) */}
              <div className="bg-[#0b1222]/90 border border-indigo-500/30 rounded-xl p-2 px-2.5 min-w-0">
                <span className="text-[9px] font-black uppercase text-indigo-400 block truncate">PNP (HL/HH)</span>
                <div className="flex items-baseline gap-1 mt-0.5 flex-wrap">
                  <strong className="text-sm sm:text-base font-black font-mono text-emerald-400">{realPnp.toFixed(2)}</strong>
                  <span className="text-[10px] font-mono text-slate-400">/ 6.23</span>
                </div>
                <span className="text-[9px] text-indigo-400 font-bold uppercase block mt-0.5 truncate">
                  {totalHoras.toFixed(1)}h Trab.
                </span>
              </div>

            </div>
          ) : (
            /* ─────────────────────────────────────────────────────────────
                KPI COCKPIT: AJUDANTE OPERACIONAL (REPACK, DESPEJO, WQI, PNP)
            ───────────────────────────────────────────────────────────── */
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 sm:gap-3 w-full xl:w-auto min-w-0">
              {/* PNP META VS REAL */}
              <div className="bg-[#0b1222]/90 border border-indigo-500/30 rounded-xl p-2.5 px-3 min-w-0">
                <span className="text-[9px] font-black uppercase text-slate-400 block truncate">PNP (HL/HH)</span>
                <div className="flex items-baseline gap-1.5 mt-0.5 flex-wrap">
                  <strong className="text-base font-black font-mono text-emerald-400">{realPnp.toFixed(2)}</strong>
                  <span className="text-[11px] font-mono text-slate-400">/ Meta: {metaPnp.toFixed(2)}</span>
                </div>
                <span className={`text-[9px] font-black uppercase block mt-0.5 truncate ${
                  percentualMeta >= 100 ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {percentualMeta.toFixed(1)}% da Meta
                </span>
              </div>

              {/* RITMO REPACK META (10 CX/H) VS REAL */}
              <div className="bg-[#0b1222]/90 border border-slate-800 rounded-xl p-2.5 px-3 min-w-0">
                <span className="text-[9px] font-black uppercase text-slate-400 block truncate">Ritmo Repack</span>
                <div className="flex items-baseline gap-1.5 mt-0.5 flex-wrap">
                  <strong className="text-base font-black font-mono text-indigo-300">{repack.ritmoRealCxH}</strong>
                  <span className="text-[11px] font-mono text-slate-400">/ Meta: 10 cx/h</span>
                </div>
                <span className={`text-[9px] font-black uppercase block mt-0.5 truncate ${
                  repack.ritmoRealCxH >= 10 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {repack.ritmoRealCxH >= 10 ? 'Meta OK' : 'Abaixo da Meta'}
                </span>
              </div>

              {/* WQI */}
              <div className="bg-[#0b1222]/90 border border-slate-800 rounded-xl p-2.5 px-3 min-w-0">
                <span className="text-[9px] font-black uppercase text-slate-400 block truncate">WQI Qualidade</span>
                <div className="flex items-baseline gap-1.5 mt-0.5 flex-wrap">
                  <strong className="text-base font-black font-mono text-emerald-400">98.2%</strong>
                  <span className="text-[11px] font-mono text-slate-400">/ Meta: ≥95%</span>
                </div>
                <span className="text-[9px] text-emerald-400 font-bold uppercase block mt-0.5 truncate">
                  Sem avarias
                </span>
              </div>

              {/* HORAS & DIAS */}
              <div className="bg-[#0b1222]/90 border border-slate-800 rounded-xl p-2.5 px-3 min-w-0">
                <span className="text-[9px] font-black uppercase text-slate-400 block truncate">Jornada</span>
                <div className="flex items-baseline gap-1.5 mt-0.5 flex-wrap">
                  <strong className="text-base font-black font-mono text-white">{totalHoras.toFixed(1)}h</strong>
                  <span className="text-[11px] text-slate-400">({diasTrabalhados}d)</span>
                </div>
                <span className="text-[9px] text-indigo-400 font-bold uppercase block mt-0.5 truncate">
                  Status: {statusMeta}
                </span>
              </div>
            </div>
          )}

          {/* BOTÃO DRILLDOWN */}
          <button
            onClick={() => setShowModal(true)}
            className="w-full xl:w-auto px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer shrink-0 border border-indigo-400/40"
          >
            <span className="truncate">Minhas Atividades (Meta vs Real)</span>
            <ChevronRight className="w-4 h-4 shrink-0" />
          </button>
        </div>
      </div>

      {/* DRILLDOWN MODAL */}
      {showModal && (
        <CollaboratorActivitiesDrilldownModal
          collaborator={colabSummary}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
};
