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
  FileSpreadsheet
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
  const [activeTab, setActiveTab] = useState<'geral' | 'repack' | 'despejo' | 'quebras' | 'jornadas'>('geral');

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
    jornadas
  } = collaborator;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
      <div className="bg-[#0f172a] border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        
        {/* MODAL HEADER */}
        <div className="p-5 bg-gradient-to-r from-[#111a30] to-[#1e293b] border-b border-slate-700 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-black text-xl shadow-inner">
              {nome.charAt(0)}
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
                Turno: <strong className="text-slate-200">{turno}</strong> • Auditoria Completa de Atividades Realizadas (Meta vs Real)
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

        {/* TOP LEVEL PNP KPI BAR */}
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

        {/* TAB NAVIGATION */}
        <div className="flex items-center gap-1.5 px-4 pt-3 border-b border-slate-800 bg-[#0f172a] shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('geral')}
            className={`px-3.5 py-2 text-xs font-black uppercase tracking-wider rounded-t-xl transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'geral'
                ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Visão Consolidada
          </button>

          <button
            onClick={() => setActiveTab('repack')}
            className={`px-3.5 py-2 text-xs font-black uppercase tracking-wider rounded-t-xl transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'repack'
                ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Box className="w-3.5 h-3.5" /> Repack ({repack.totalCaixas} cx)
          </button>

          <button
            onClick={() => setActiveTab('despejo')}
            className={`px-3.5 py-2 text-xs font-black uppercase tracking-wider rounded-t-xl transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'despejo'
                ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" /> Despejo ({despejo.totalItens} un)
          </button>

          <button
            onClick={() => setActiveTab('quebras')}
            className={`px-3.5 py-2 text-xs font-black uppercase tracking-wider rounded-t-xl transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'quebras'
                ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" /> Quebras ({quebras.totalOcorrencias})
          </button>

          <button
            onClick={() => setActiveTab('jornadas')}
            className={`px-3.5 py-2 text-xs font-black uppercase tracking-wider rounded-t-xl transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'jornadas'
                ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> Registro de Jornadas
          </button>
        </div>

        {/* TAB CONTENTS (SCROLLABLE) */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* TAB 1: VISÃO GERAL */}
          {activeTab === 'geral' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* CARD REPACK RESUMO */}
                <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                      <Box className="w-4 h-4 text-indigo-400" /> Performance de Repack
                    </h4>
                    <span className="text-[10px] font-bold text-slate-400">
                      Gatilho: -10 cx/h
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#0b1222] p-3 rounded-xl border border-slate-800/80">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Ritmo Operacional</span>
                      <div className="flex items-baseline gap-1.5 mt-1">
                        <strong className="text-lg font-mono text-white">{repack.ritmoRealCxH}</strong>
                        <span className="text-xs font-mono text-indigo-400">/ Meta: {repack.ritmoMetaCxH} cx/h</span>
                      </div>
                      <span className={`text-[10px] font-black uppercase mt-1 block ${
                        repack.ritmoRealCxH >= repack.ritmoMetaCxH ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {repack.ritmoRealCxH >= repack.ritmoMetaCxH ? '✓ Atingiu 10 cx/h' : '⚠ Abaixo da Meta'}
                      </span>
                    </div>

                    <div className="bg-[#0b1222] p-3 rounded-xl border border-slate-800/80">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Meta por Embalagem</span>
                      <div className="flex items-baseline gap-1.5 mt-1">
                        <strong className="text-lg font-mono text-emerald-400">{repack.tempoRealMin}m</strong>
                        <span className="text-xs font-mono text-slate-400">/ Padrão: {repack.tempoMetaMin}m</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold mt-1 block">
                        Eficiência: <strong className="text-white">{repack.eficienciaPct}%</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* CARD DESPEJO RESUMO */}
                <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                      <Trash2 className="w-4 h-4 text-indigo-400" /> Performance de Despejo
                    </h4>
                    <span className="text-[10px] font-bold text-slate-400">
                      Meta: 3.0 min/cx
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#0b1222] p-3 rounded-xl border border-slate-800/80">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Volume Processado</span>
                      <div className="flex items-baseline gap-1.5 mt-1">
                        <strong className="text-lg font-mono text-white">{despejo.totalItens}</strong>
                        <span className="text-xs text-slate-400">itens</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold mt-1 block">
                        Despejo & Avarias
                      </span>
                    </div>

                    <div className="bg-[#0b1222] p-3 rounded-xl border border-slate-800/80">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Tempo Real vs Meta</span>
                      <div className="flex items-baseline gap-1.5 mt-1">
                        <strong className="text-lg font-mono text-emerald-400">{despejo.tempoRealMin}m</strong>
                        <span className="text-xs font-mono text-slate-400">/ Meta: {despejo.tempoMetaMin}m</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold mt-1 block">
                        Eficiência: <strong className="text-white">{despejo.eficienciaPct}%</strong>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* TABELA DE ATIVIDADES RECENTES */}
              <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-400" /> Resumo das Principais Atividades Registradas
                </h4>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] font-black uppercase text-slate-400 bg-[#0b1222]">
                        <th className="p-2.5">Processo</th>
                        <th className="p-2.5">Descrição</th>
                        <th className="p-2.5 text-center">Meta Padrão</th>
                        <th className="p-2.5 text-center">Real Apurado</th>
                        <th className="p-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      <tr className="hover:bg-slate-800/30">
                        <td className="p-2.5 font-bold text-indigo-400 flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5" /> PNP Operacional
                        </td>
                        <td className="p-2.5 text-slate-300">Produtividade Individual de Carga & Movimentação</td>
                        <td className="p-2.5 text-center font-mono font-bold text-slate-400">{metaPnp.toFixed(2)} HL/HH</td>
                        <td className="p-2.5 text-center font-mono font-black text-emerald-400">{realPnp.toFixed(2)} HL/HH</td>
                        <td className="p-2.5 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            {statusMeta}
                          </span>
                        </td>
                      </tr>

                      <tr className="hover:bg-slate-800/30">
                        <td className="p-2.5 font-bold text-indigo-400 flex items-center gap-1.5">
                          <Box className="w-3.5 h-3.5" /> Ritmo de Repack
                        </td>
                        <td className="p-2.5 text-slate-300">Velocidade de Reembalagem por Hora</td>
                        <td className="p-2.5 text-center font-mono font-bold text-slate-400">10.0 cx/h</td>
                        <td className="p-2.5 text-center font-mono font-black text-emerald-400">{repack.ritmoRealCxH} cx/h</td>
                        <td className="p-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            repack.ritmoRealCxH >= 10 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}>
                            {repack.ritmoRealCxH >= 10 ? 'Meta Atingida' : 'Abaixo da Meta'}
                          </span>
                        </td>
                      </tr>

                      <tr className="hover:bg-slate-800/30">
                        <td className="p-2.5 font-bold text-indigo-400 flex items-center gap-1.5">
                          <Box className="w-3.5 h-3.5" /> Meta por Embalagem
                        </td>
                        <td className="p-2.5 text-slate-300">Tempo Padrão de Reembalagem das Caixas</td>
                        <td className="p-2.5 text-center font-mono font-bold text-slate-400">{repack.tempoMetaMin} min</td>
                        <td className="p-2.5 text-center font-mono font-black text-emerald-400">{repack.tempoRealMin} min</td>
                        <td className="p-2.5 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            {repack.eficienciaPct}% Efic.
                          </span>
                        </td>
                      </tr>

                      <tr className="hover:bg-slate-800/30">
                        <td className="p-2.5 font-bold text-indigo-400 flex items-center gap-1.5">
                          <Trash2 className="w-3.5 h-3.5" /> Tempo de Despejo
                        </td>
                        <td className="p-2.5 text-slate-300">Descarte e Despejo de Vasilhames</td>
                        <td className="p-2.5 text-center font-mono font-bold text-slate-400">{despejo.tempoMetaMin} min</td>
                        <td className="p-2.5 text-center font-mono font-black text-emerald-400">{despejo.tempoRealMin} min</td>
                        <td className="p-2.5 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            {despejo.eficienciaPct}% Efic.
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: REPACK DETALHADO */}
          {activeTab === 'repack' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-[#111a30] p-4 rounded-xl border border-slate-800">
                  <span className="text-[10px] font-black uppercase text-slate-400">Total de Caixas</span>
                  <p className="text-2xl font-mono font-black text-white mt-1">{repack.totalCaixas} cx</p>
                </div>
                <div className="bg-[#111a30] p-4 rounded-xl border border-slate-800">
                  <span className="text-[10px] font-black uppercase text-slate-400">Meta 1: Ritmo (10 cx/h)</span>
                  <p className="text-2xl font-mono font-black text-indigo-400 mt-1">{repack.ritmoRealCxH} cx/h</p>
                  <span className="text-[10px] text-slate-400">Meta: 10.0 cx/h</span>
                </div>
                <div className="bg-[#111a30] p-4 rounded-xl border border-slate-800">
                  <span className="text-[10px] font-black uppercase text-slate-400">Meta 2: Tempo por Embalagem</span>
                  <p className="text-2xl font-mono font-black text-emerald-400 mt-1">{repack.tempoRealMin} min</p>
                  <span className="text-[10px] text-slate-400">Meta padrão somada: {repack.tempoMetaMin} min</span>
                </div>
              </div>

              {repack.atividades.length === 0 ? (
                <div className="p-8 text-center bg-[#111a30] rounded-xl border border-dashed border-slate-800 text-slate-400 text-xs">
                  Nenhum lançamento avulso de Repack registrado para este colaborador no período atual.
                </div>
              ) : (
                <div className="overflow-x-auto bg-[#111a30] rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] font-black uppercase text-slate-400 bg-[#0b1222]">
                        <th className="p-3">Data</th>
                        <th className="p-3">Embalagem</th>
                        <th className="p-3 text-center">Quantidade</th>
                        <th className="p-3 text-center">Horário</th>
                        <th className="p-3 text-center">Tempo Real</th>
                        <th className="p-3 text-center">Tempo Meta</th>
                        <th className="p-3 text-center">Ritmo Real</th>
                        <th className="p-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {repack.atividades.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-slate-800/40">
                          <td className="p-3 font-mono text-slate-300">{item.data}</td>
                          <td className="p-3 font-bold text-white">{item.embalagem}</td>
                          <td className="p-3 text-center font-mono font-bold text-indigo-300">{item.quantidade} cx</td>
                          <td className="p-3 text-center text-slate-400 font-mono">{item.inicio} - {item.fim}</td>
                          <td className="p-3 text-center font-mono font-bold text-emerald-400">{item.duracaoRealMin} min</td>
                          <td className="p-3 text-center font-mono text-slate-400">{item.duracaoMetaMin} min</td>
                          <td className="p-3 text-center font-mono font-black text-amber-400">{item.ritmoRealCxH} cx/h</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              item.status === 'DENTRO DA META' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DESPEJO DETALHADO */}
          {activeTab === 'despejo' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-[#111a30] p-4 rounded-xl border border-slate-800">
                  <span className="text-[10px] font-black uppercase text-slate-400">Total Vasilhames</span>
                  <p className="text-2xl font-mono font-black text-white mt-1">{despejo.totalItens} un</p>
                </div>
                <div className="bg-[#111a30] p-4 rounded-xl border border-slate-800">
                  <span className="text-[10px] font-black uppercase text-slate-400">Tempo Real Total</span>
                  <p className="text-2xl font-mono font-black text-emerald-400 mt-1">{despejo.tempoRealMin} min</p>
                </div>
                <div className="bg-[#111a30] p-4 rounded-xl border border-slate-800">
                  <span className="text-[10px] font-black uppercase text-slate-400">Meta Padrão Total</span>
                  <p className="text-2xl font-mono font-black text-slate-300 mt-1">{despejo.tempoMetaMin} min</p>
                  <span className="text-[10px] text-slate-400">Eficiência: {despejo.eficienciaPct}%</span>
                </div>
              </div>

              {despejo.atividades.length === 0 ? (
                <div className="p-8 text-center bg-[#111a30] rounded-xl border border-dashed border-slate-800 text-slate-400 text-xs">
                  Nenhum registro de despejo no histórico recente deste colaborador.
                </div>
              ) : (
                <div className="overflow-x-auto bg-[#111a30] rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] font-black uppercase text-slate-400 bg-[#0b1222]">
                        <th className="p-3">Data</th>
                        <th className="p-3">Vasilhame</th>
                        <th className="p-3 text-center">Quantidade</th>
                        <th className="p-3">Motivo</th>
                        <th className="p-3 text-center">Tempo Real</th>
                        <th className="p-3 text-center">Tempo Meta</th>
                        <th className="p-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {despejo.atividades.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-slate-800/40">
                          <td className="p-3 font-mono text-slate-300">{item.data}</td>
                          <td className="p-3 font-bold text-white">{item.tipoVasilhame}</td>
                          <td className="p-3 text-center font-mono font-bold text-indigo-300">{item.quantidade}</td>
                          <td className="p-3 text-slate-400">{item.motivo}</td>
                          <td className="p-3 text-center font-mono font-bold text-emerald-400">{item.duracaoRealMin} min</td>
                          <td className="p-3 text-center font-mono text-slate-400">{item.duracaoMetaMin} min</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              item.status === 'DENTRO DA META' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: QUEBRAS */}
          {activeTab === 'quebras' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-[#111a30] p-4 rounded-xl border border-slate-800">
                  <span className="text-[10px] font-black uppercase text-slate-400">Total Ocorrências</span>
                  <p className="text-2xl font-mono font-black text-amber-400 mt-1">{quebras.totalOcorrencias}</p>
                </div>
                <div className="bg-[#111a30] p-4 rounded-xl border border-slate-800">
                  <span className="text-[10px] font-black uppercase text-slate-400">Volume Total de Avarias</span>
                  <p className="text-2xl font-mono font-black text-white mt-1">{quebras.totalCaixas} caixas</p>
                </div>
              </div>

              {quebras.atividades.length === 0 ? (
                <div className="p-8 text-center bg-[#111a30] rounded-xl border border-dashed border-slate-800 text-slate-400 text-xs">
                  Nenhuma quebra ou avaria atribuída a este colaborador. Excelente índice de qualidade!
                </div>
              ) : (
                <div className="overflow-x-auto bg-[#111a30] rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] font-black uppercase text-slate-400 bg-[#0b1222]">
                        <th className="p-3">Data</th>
                        <th className="p-3">Produto</th>
                        <th className="p-3 text-center">Quantidade</th>
                        <th className="p-3">Motivo</th>
                        <th className="p-3">Local</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {quebras.atividades.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-slate-800/40">
                          <td className="p-3 font-mono text-slate-300">{item.data}</td>
                          <td className="p-3 font-bold text-white">{item.produto}</td>
                          <td className="p-3 text-center font-mono font-bold text-rose-400">{item.quantidade} cx</td>
                          <td className="p-3 text-slate-400">{item.motivo}</td>
                          <td className="p-3 text-slate-400">{item.local}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: JORNADAS & HORAS */}
          {activeTab === 'jornadas' && (
            <div className="space-y-4">
              <div className="bg-[#111a30] p-4 rounded-xl border border-slate-800">
                <span className="text-[10px] font-black uppercase text-slate-400">Total de Horas Trabalhadas</span>
                <p className="text-2xl font-mono font-black text-emerald-400 mt-1">{totalHoras.toFixed(2)} HH</p>
                <span className="text-[10px] text-slate-400">Total em {diasTrabalhados} dias trabalhados</span>
              </div>

              {jornadas.length === 0 ? (
                <div className="p-6 text-center bg-[#111a30] rounded-xl border border-slate-800 text-slate-400 text-xs">
                  Jornadas calculadas a partir dos fechamentos de ponto oficiais do WLP 2026.
                </div>
              ) : (
                <div className="overflow-x-auto bg-[#111a30] rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] font-black uppercase text-slate-400 bg-[#0b1222]">
                        <th className="p-3">Data</th>
                        <th className="p-3 text-center">Entrada</th>
                        <th className="p-3 text-center">Saída</th>
                        <th className="p-3 text-center">Duração</th>
                        <th className="p-3">Observações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {jornadas.map((j, idx) => (
                        <tr key={j.id || idx} className="hover:bg-slate-800/40">
                          <td className="p-3 font-mono text-slate-300">{j.dataStr || j.dataISO}</td>
                          <td className="p-3 text-center font-mono text-emerald-400">{j.horaInicio}</td>
                          <td className="p-3 text-center font-mono text-rose-400">{j.horaFim}</td>
                          <td className="p-3 text-center font-mono font-black text-white">{j.duracaoHoras}h</td>
                          <td className="p-3 text-slate-400">{j.observacoes || 'Turno regular'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 bg-[#0a0f1d] border-t border-slate-800 flex items-center justify-between shrink-0">
          <span className="text-[10px] text-slate-400">
            Plataforma Workstation • Indicadores com Meta Oficial de <strong>6.23 HL/HH</strong>
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
