import React, { useState } from 'react';
import { 
  Building2, 
  ChevronRight, 
  ChevronDown, 
  Layers, 
  Users, 
  User, 
  BarChart2, 
  Target, 
  TrendingUp, 
  AlertTriangle, 
  Clock, 
  CheckCircle2,
  Award,
  Zap,
  CornerDownRight
} from 'lucide-react';
import { Usuario } from '../types';

interface IndividualKpi {
  matricula: string;
  nome: string;
  cargo: string;
  grupo: 'Operador' | 'Ajudante';
  meta: number;
  resultado: number;
  produtividadeCxH: number;
  quebrasPct: number;
  repackCxH: number;
  tempoMedioMin: number;
  rankingPosicao: number;
}

interface EquipeNode {
  id: string;
  nome: string;
  turno: string;
  colaboradores: IndividualKpi[];
}

interface SetorNode {
  id: string;
  nome: string;
  equipes: EquipeNode[];
}

export default function TreeKpiViewer({ user }: { user: Usuario }) {
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    'guarabira': true,
    'guarabira-picking': true,
    'guarabira-picking-eqA': true
  });

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  // ÁRVORE HIERÁRQUICA DA UNIDADE GUARABIRA
  const treeData: SetorNode[] = [
    {
      id: 'picking',
      nome: 'Sector Picking',
      equipes: [
        {
          id: 'picking-eqA',
          nome: 'Equipe Alpha (Turno 1 - Manhã)',
          turno: 'Turno 1',
          colaboradores: [
            { matricula: 'G1001', nome: 'Carlos Eduardo Silva', cargo: 'Operador de Empilhadeira', grupo: 'Operador', meta: 130, resultado: 145, produtividadeCxH: 145, quebrasPct: 0.03, repackCxH: 0, tempoMedioMin: 14.2, rankingPosicao: 1 },
            { matricula: 'G1002', nome: 'Roberto Alves Santos', cargo: 'Operador de Empilhadeira', grupo: 'Operador', meta: 130, resultado: 138, produtividadeCxH: 138, quebrasPct: 0.05, repackCxH: 0, tempoMedioMin: 15.5, rankingPosicao: 2 },
            { matricula: 'G2001', nome: 'João Pedro Oliveira', cargo: 'Ajudante de Carga', grupo: 'Ajudante', meta: 110, resultado: 125, produtividadeCxH: 125, quebrasPct: 0.04, repackCxH: 0, tempoMedioMin: 16.0, rankingPosicao: 1 }
          ]
        },
        {
          id: 'picking-eqB',
          nome: 'Equipe Beta (Turno 2 - Tarde)',
          turno: 'Turno 2',
          colaboradores: [
            { matricula: 'G1003', nome: 'Felipe Melo Costa', cargo: 'Operador de Transpaleteira', grupo: 'Operador', meta: 130, resultado: 132, produtividadeCxH: 132, quebrasPct: 0.08, repackCxH: 0, tempoMedioMin: 16.8, rankingPosicao: 3 },
            { matricula: 'G1004', nome: 'Daniel Ferreira Lima', cargo: 'Operador de Empilhadeira', grupo: 'Operador', meta: 130, resultado: 118, produtividadeCxH: 118, quebrasPct: 0.12, repackCxH: 0, tempoMedioMin: 19.4, rankingPosicao: 4 }
          ]
        }
      ]
    },
    {
      id: 'repack',
      nome: 'Sector Repack',
      equipes: [
        {
          id: 'repack-eqA',
          nome: 'Equipe Repack Especializada',
          turno: 'Turno Geral',
          colaboradores: [
            { matricula: 'G1006', nome: 'Fernanda Lima Souza', cargo: 'Operadora de Repack', grupo: 'Operador', meta: 80, resultado: 95, produtividadeCxH: 95, quebrasPct: 0.01, repackCxH: 95, tempoMedioMin: 12.0, rankingPosicao: 1 },
            { matricula: 'G2004', nome: 'Bruno Cesar Nunes', cargo: 'Ajudante de Repack', grupo: 'Ajudante', meta: 70, resultado: 78, produtividadeCxH: 78, quebrasPct: 0.02, repackCxH: 78, tempoMedioMin: 14.5, rankingPosicao: 1 }
          ]
        }
      ]
    },
    {
      id: 'quebras',
      nome: 'Sector Quebras & Avarias',
      equipes: [
        {
          id: 'quebras-eqA',
          nome: 'Equipe Prevenção & Controle',
          turno: 'Turno Unico',
          colaboradores: [
            { matricula: 'G1009', nome: 'Nixon Alisson H.', cargo: 'Operador de Empilhadeira', grupo: 'Operador', meta: 0.15, resultado: 0.02, produtividadeCxH: 160, quebrasPct: 0.02, repackCxH: 0, tempoMedioMin: 11.0, rankingPosicao: 1 },
            { matricula: 'G2006', nome: 'Rafael Henrique Viana', cargo: 'Ajudante de Movimentação', grupo: 'Ajudante', meta: 0.15, resultado: 0.04, produtividadeCxH: 140, quebrasPct: 0.04, repackCxH: 0, tempoMedioMin: 13.0, rankingPosicao: 1 }
          ]
        }
      ]
    }
  ];

  return (
    <div className="space-y-6">
      {/* BANNER HIERARQUICO */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-emerald-950 rounded-2xl p-6 text-white shadow-xl border border-teal-800/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-teal-300 bg-teal-400/10 px-3 py-1 rounded-full border border-teal-400/20 flex items-center gap-1.5 w-max">
            <Layers className="w-3.5 h-3.5 text-teal-300" />
            Navegação Árvore HIERÁRQUICA (KPI Tree)
          </span>
          <h2 className="text-2xl font-black tracking-tight mt-2 flex items-center gap-2">
            Navegação em Árvore de Indicadores Operacionais
          </h2>
          <p className="text-xs text-teal-200/90 font-medium mt-1 max-w-2xl">
            Unidade Guarabira ↓ Setor ↓ Equipe ↓ Operador / Ajudante ↓ Indicadores Individuais.
          </p>
        </div>

        <div className="bg-teal-500/20 border border-teal-500/40 p-3 rounded-xl flex items-center gap-3 shrink-0">
          <Building2 className="w-8 h-8 text-teal-300" />
          <div>
            <span className="text-[9px] text-teal-300 uppercase font-black block">Unidade Ativa</span>
            <span className="text-sm font-black text-white">GUARABIRA</span>
          </div>
        </div>
      </div>

      {/* ÁRVORE HIERÁRQUICA INTERATIVA */}
      <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-6 space-y-4">
        {/* NÍVEL 1: UNIDADE GUARABIRA */}
        <div className="border border-teal-500/30 rounded-xl overflow-hidden bg-[#0b1222]">
          <div 
            onClick={() => toggleNode('guarabira')}
            className="p-4 bg-gradient-to-r from-teal-900/40 to-slate-900 hover:from-teal-900/60 transition-colors cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              {expandedNodes['guarabira'] ? (
                <ChevronDown className="w-5 h-5 text-teal-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-teal-400" />
              )}
              <Building2 className="w-5 h-5 text-teal-400" />
              <div>
                <span className="text-[9px] text-teal-300 font-black uppercase tracking-wider block">Nível 1 - Unidade</span>
                <h3 className="text-base font-black text-white">UNIDADE GUARABIRA</h3>
              </div>
            </div>

            <span className="text-xs font-mono font-bold text-teal-300 bg-teal-500/20 px-3 py-1 rounded-full border border-teal-500/30">
              Performance Geral: 106.8%
            </span>
          </div>

          {/* NÍVEL 2: SETORES */}
          {expandedNodes['guarabira'] && (
            <div className="p-4 space-y-4 border-t border-slate-800">
              {treeData.map(setor => {
                const setorKey = `guarabira-${setor.id}`;
                const isSetorExpanded = expandedNodes[setorKey];

                return (
                  <div key={setor.id} className="border border-slate-800 rounded-xl overflow-hidden bg-[#111a30]">
                    <div 
                      onClick={() => toggleNode(setorKey)}
                      className="p-3 bg-slate-800/40 hover:bg-slate-800/70 transition-colors cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        {isSetorExpanded ? (
                          <ChevronDown className="w-4 h-4 text-indigo-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-indigo-400" />
                        )}
                        <Layers className="w-4 h-4 text-indigo-400" />
                        <span className="text-xs font-black text-white uppercase tracking-wider">{setor.nome}</span>
                      </div>

                      <span className="text-[10px] text-slate-400 font-bold bg-slate-900 px-2.5 py-1 rounded-md">
                        {setor.equipes.length} Equipes
                      </span>
                    </div>

                    {/* NÍVEL 3: EQUIPES */}
                    {isSetorExpanded && (
                      <div className="p-3 space-y-3 bg-[#0b1222] border-t border-slate-800">
                        {setor.equipes.map(equipe => {
                          const eqKey = `guarabira-${setor.id}-${equipe.id}`;
                          const isEqExpanded = expandedNodes[eqKey];

                          return (
                            <div key={equipe.id} className="border border-slate-800/80 rounded-lg overflow-hidden bg-[#111a30]">
                              <div 
                                onClick={() => toggleNode(eqKey)}
                                className="p-2.5 bg-slate-900/80 hover:bg-slate-800 transition-colors cursor-pointer flex items-center justify-between"
                              >
                                <div className="flex items-center gap-2">
                                  <CornerDownRight className="w-3.5 h-3.5 text-sky-400 ml-2" />
                                  <Users className="w-4 h-4 text-sky-400" />
                                  <span className="text-xs font-bold text-slate-200">{equipe.nome}</span>
                                </div>
                                <span className="text-[10px] text-sky-300 font-bold bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                                  {equipe.colaboradores.length} Colaboradores
                                </span>
                              </div>

                              {/* NÍVEL 4 & 5: COLABORADOR E SEUS KPIS INDIVIDUAIS */}
                              {isEqExpanded && (
                                <div className="p-3 space-y-3 bg-[#080d1a] border-t border-slate-800">
                                  {equipe.colaboradores.map((colab, idx) => (
                                    <div key={colab.matricula ? `${colab.matricula}-${idx}` : idx} className="p-3 bg-[#111a30] border border-slate-800 rounded-xl space-y-3">
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                                        <div className="flex items-center gap-2">
                                          <User className="w-4 h-4 text-emerald-400" />
                                          <div>
                                            <span className="text-emerald-400 font-mono text-[10px] font-bold block">{colab.matricula}</span>
                                            <strong className="text-xs text-white">{colab.nome}</strong>
                                            <span className="text-[9px] text-slate-400 block">{colab.cargo} ({colab.grupo})</span>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-black border border-emerald-500/30">
                                            #{colab.rankingPosicao} no Ranking {colab.grupo}
                                          </span>
                                        </div>
                                      </div>

                                      {/* INDICADORES INDIVIDUAIS DO COLABORADOR */}
                                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
                                        <div className="p-2 bg-[#0b1222] rounded-lg border border-slate-800">
                                          <span className="text-[9px] text-slate-400 font-bold uppercase block">Meta</span>
                                          <strong className="text-white font-mono">{colab.meta}</strong>
                                        </div>
                                        <div className="p-2 bg-[#0b1222] rounded-lg border border-slate-800">
                                          <span className="text-[9px] text-slate-400 font-bold uppercase block">Resultado</span>
                                          <strong className="text-emerald-400 font-mono">{colab.resultado}</strong>
                                        </div>
                                        <div className="p-2 bg-[#0b1222] rounded-lg border border-slate-800">
                                          <span className="text-[9px] text-slate-400 font-bold uppercase block">Produtividade</span>
                                          <strong className="text-sky-400 font-mono">{colab.produtividadeCxH} cx/h</strong>
                                        </div>
                                        <div className="p-2 bg-[#0b1222] rounded-lg border border-slate-800">
                                          <span className="text-[9px] text-slate-400 font-bold uppercase block">Quebras</span>
                                          <strong className="text-amber-400 font-mono">{colab.quebrasPct}%</strong>
                                        </div>
                                        <div className="p-2 bg-[#0b1222] rounded-lg border border-slate-800">
                                          <span className="text-[9px] text-slate-400 font-bold uppercase block">Repack</span>
                                          <strong className="text-purple-400 font-mono">{colab.repackCxH} cx/h</strong>
                                        </div>
                                        <div className="p-2 bg-[#0b1222] rounded-lg border border-slate-800">
                                          <span className="text-[9px] text-slate-400 font-bold uppercase block">Tempo Médio</span>
                                          <strong className="text-indigo-400 font-mono">{colab.tempoMedioMin} min</strong>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
