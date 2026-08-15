import React, { useState, useMemo } from 'react';
import { useEmpresaData } from '../context/EmpresaDataContext';
import { getAllCollaboratorsPnpSummary, CollaboratorPnpSummary } from '../utils/pnpCollaboratorUtils';
import { CollaboratorActivitiesDrilldownModal } from './CollaboratorActivitiesDrilldownModal';
import { 
  Users, 
  Award, 
  Search, 
  Filter, 
  ChevronRight, 
  TrendingUp, 
  Clock, 
  Box, 
  Trash2,
  Sparkles,
  ExternalLink
} from 'lucide-react';

interface WorkstationExecutivePnpSectionProps {
  empresaId?: string;
}

export const WorkstationExecutivePnpSection: React.FC<WorkstationExecutivePnpSectionProps> = ({
  empresaId = 'demo'
}) => {
  const empresaData = useEmpresaData();
  const [selectedCollaborator, setSelectedCollaborator] = useState<CollaboratorPnpSummary | null>(null);
  const [cargoFilter, setCargoFilter] = useState<'TODOS' | 'AJUDANTE' | 'EMPILHADOR' | 'CONFERENTE' | 'ADMINISTRATIVO'>('TODOS');
  const [searchQuery, setSearchQuery] = useState('');

  const allSummaries = useMemo(() => {
    return getAllCollaboratorsPnpSummary(
      empresaId,
      empresaData.repack,
      empresaData.despejo,
      empresaData.quebras
    );
  }, [empresaId, empresaData.repack, empresaData.despejo, empresaData.quebras]);

  const filteredSummaries = useMemo(() => {
    return allSummaries.filter(c => {
      const matchCargo = cargoFilter === 'TODOS' || c.cargo.toUpperCase() === cargoFilter;
      const matchSearch = !searchQuery || 
        c.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.matricula.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCargo && matchSearch;
    });
  }, [allSummaries, cargoFilter, searchQuery]);

  return (
    <>
      <div className="bg-[#111622] border border-[#222f44] rounded-2xl p-5 shadow-2xl space-y-4 text-slate-100">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#222f44] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black uppercase tracking-wider text-white">
                  Visão Executiva • Produtividade PNP dos Colaboradores
                </h3>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                  Meta Oficial: 6.23 HL/HH
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Acompanhamento individual de metas vs real. Clique em qualquer colaborador para abrir suas atividades detalhadas.
              </p>
            </div>
          </div>

          {/* FILTERS & SEARCH */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar colaborador..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-[#0b101b] border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-44"
              />
            </div>

            <div className="flex items-center bg-[#0b101b] p-1 rounded-xl border border-slate-700 text-xs">
              {(['TODOS', 'AJUDANTE', 'EMPILHADOR', 'CONFERENTE'] as const).map(cargo => (
                <button
                  key={cargo}
                  onClick={() => setCargoFilter(cargo)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                    cargoFilter === cargo
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {cargo}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* COLLABORATOR CARDS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredSummaries.map(colab => {
            const isAcima = colab.percentualMeta >= 100;
            return (
              <div
                key={colab.matricula}
                onClick={() => setSelectedCollaborator(colab)}
                className="bg-[#141b2d] hover:bg-[#1a233a] border border-[#222f44] hover:border-indigo-500/60 rounded-xl p-4 transition-all cursor-pointer group shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400">Mat: {colab.matricula}</span>
                      <h4 className="text-sm font-black text-white group-hover:text-indigo-300 transition-colors uppercase">
                        {colab.nome}
                      </h4>
                    </div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {colab.cargo}
                    </span>
                  </div>

                  {/* PNP META VS REAL */}
                  <div className="mt-3 bg-[#0c1220] p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-black uppercase text-slate-400 block">PNP (HL/HH)</span>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <strong className="text-base font-black font-mono text-emerald-400">
                          {colab.realPnp.toFixed(2)}
                        </strong>
                        <span className="text-[11px] font-mono text-slate-400 font-bold">
                          / Meta: {colab.metaPnp.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-black font-mono block ${isAcima ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {colab.percentualMeta.toFixed(1)}%
                      </span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase">
                        {colab.statusMeta}
                      </span>
                    </div>
                  </div>

                  {/* SUMMARY STATS */}
                  <div className="grid grid-cols-3 gap-2 mt-2.5 text-center text-[10px]">
                    <div className="bg-[#0c1220] p-1.5 rounded border border-slate-800">
                      <span className="text-slate-400 block text-[9px]">Repack</span>
                      <strong className="text-white font-mono">{colab.repack.ritmoRealCxH} cx/h</strong>
                    </div>
                    <div className="bg-[#0c1220] p-1.5 rounded border border-slate-800">
                      <span className="text-slate-400 block text-[9px]">Jornada</span>
                      <strong className="text-white font-mono">{colab.totalHoras.toFixed(1)}h</strong>
                    </div>
                    <div className="bg-[#0c1220] p-1.5 rounded border border-slate-800">
                      <span className="text-slate-400 block text-[9px]">Presença</span>
                      <strong className="text-white font-mono">{colab.diasTrabalhados} dias</strong>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-indigo-400 font-bold">
                  <span>Ver Atividades Detalhadas</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* DRILLDOWN MODAL */}
      {selectedCollaborator && (
        <CollaboratorActivitiesDrilldownModal
          collaborator={selectedCollaborator}
          onClose={() => setSelectedCollaborator(null)}
        />
      )}
    </>
  );
};
