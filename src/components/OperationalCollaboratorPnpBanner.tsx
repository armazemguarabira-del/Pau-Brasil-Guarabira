import React, { useState, useMemo } from 'react';
import { Usuario } from '../types';
import { useEmpresaData } from '../context/EmpresaDataContext';
import { getCollaboratorPnpSummary, CollaboratorPnpSummary } from '../utils/pnpCollaboratorUtils';
import { CollaboratorActivitiesDrilldownModal } from './CollaboratorActivitiesDrilldownModal';
import { Award, Zap, Clock, Box, ChevronRight, Sparkles, TrendingUp } from 'lucide-react';

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
    metaPnp,
    realPnp,
    totalHoras,
    diasTrabalhados,
    percentualMeta,
    statusMeta,
    repack
  } = colabSummary;

  return (
    <>
      <div className="w-full bg-gradient-to-r from-[#111a30] via-[#152342] to-[#0f172a] border-2 border-indigo-500/40 rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden text-slate-100">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 relative z-10">
          
          {/* IDENTIFICAÇÃO DO COLABORADOR */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-400/50 flex items-center justify-center text-indigo-300 font-black text-xl shadow-lg shrink-0">
              <Award className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                  MEU DESEMPENHO OPERACIONAL (PNP)
                </span>
                <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                  Mat: {matricula}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wide mt-0.5">
                {nome} — <span className="text-indigo-300 font-bold">{cargo}</span>
              </h2>
            </div>
          </div>

          {/* MINI KPI COCKPIT LADO A LADO */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full lg:w-auto">
            {/* PNP META VS REAL */}
            <div className="bg-[#0b1222]/90 border border-indigo-500/30 rounded-xl p-2.5 px-3">
              <span className="text-[9px] font-black uppercase text-slate-400 block">PNP (HL/HH)</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <strong className="text-base font-black font-mono text-emerald-400">{realPnp.toFixed(2)}</strong>
                <span className="text-[11px] font-mono text-slate-400">/ Meta: {metaPnp.toFixed(2)}</span>
              </div>
              <span className={`text-[9px] font-black uppercase block mt-0.5 ${
                percentualMeta >= 100 ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {percentualMeta.toFixed(1)}% da Meta
              </span>
            </div>

            {/* RITMO REPACK META (10 CX/H) VS REAL */}
            <div className="bg-[#0b1222]/90 border border-slate-800 rounded-xl p-2.5 px-3">
              <span className="text-[9px] font-black uppercase text-slate-400 block">Ritmo Repack</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <strong className="text-base font-black font-mono text-indigo-300">{repack.ritmoRealCxH}</strong>
                <span className="text-[11px] font-mono text-slate-400">/ Meta: 10 cx/h</span>
              </div>
              <span className={`text-[9px] font-black uppercase block mt-0.5 ${
                repack.ritmoRealCxH >= 10 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {repack.ritmoRealCxH >= 10 ? 'Meta OK' : 'Abaixo da Meta'}
              </span>
            </div>

            {/* HORAS & DIAS */}
            <div className="bg-[#0b1222]/90 border border-slate-800 rounded-xl p-2.5 px-3 col-span-2 sm:col-span-1">
              <span className="text-[9px] font-black uppercase text-slate-400 block">Jornada</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <strong className="text-base font-black font-mono text-white">{totalHoras.toFixed(1)}h</strong>
                <span className="text-[11px] text-slate-400">({diasTrabalhados} dias)</span>
              </div>
              <span className="text-[9px] text-indigo-400 font-bold uppercase block mt-0.5">
                Status: {statusMeta}
              </span>
            </div>
          </div>

          {/* BOTÃO DRILLDOWN */}
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer shrink-0 border border-indigo-400/40"
          >
            <span>Minhas Atividades (Meta vs Real)</span>
            <ChevronRight className="w-4 h-4" />
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
