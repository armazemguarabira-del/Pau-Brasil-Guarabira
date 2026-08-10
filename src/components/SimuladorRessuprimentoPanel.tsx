import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Box, 
  Sparkles, 
  Search, 
  ShieldAlert, 
  RefreshCw,
  TrendingUp,
  Download,
  Calendar,
  Layers,
  Award,
  Sliders,
  Plus,
  Trash2,
  Edit2,
  Check,
  Zap,
  Target,
  BarChart3,
  Filter
} from 'lucide-react';
import { 
  SimulacaoRessuprimentoItem, 
  executarSimulacaoRessuprimento,
  RessuprimentoHistoricoEntry,
  gerarHistoricoYTDResuprimento,
  salvarHistoricoYTDResuprimento
} from '../utils/simuladorRessuprimentoUtils';
import { triggerAutoAcaoCorretiva } from '../utils/simulacaoAcoesUtils';
import { Usuario } from '../types';
import { UnifiedStandardFilterBar } from './UnifiedStandardFilterBar';

interface SimuladorRessuprimentoPanelProps {
  user: Usuario;
}

export default function SimuladorRessuprimentoPanel({ user }: SimuladorRessuprimentoPanelProps) {
  const [items, setItems] = useState<SimulacaoRessuprimentoItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPrioridade, setFilterPrioridade] = useState<string>('todos');
  const [activeTab, setActiveTab] = useState<'operacional' | 'historico' | 'analise' | 'metas'>('operacional');

  // Metas do Gestor
  const [metaRessuprimento, setMetaRessuprimento] = useState<number>(() => {
    return Number(localStorage.getItem('meta_ressuprimento_pct') || '25');
  });

  // Histórico YTD
  const [historico, setHistorico] = useState<RessuprimentoHistoricoEntry[]>([]);
  
  // Novo registro manual
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newPalletsRes, setNewPalletsRes] = useState('22');
  const [newPalletsReab, setNewPalletsReab] = useState('78');
  const [newTempoMedio, setNewTempoMedio] = useState('16');
  const [newSkus, setNewSkus] = useState('18');

  const isSupervisorOrAdmin = user.papel === 'admin' || user.papel === 'controle' || user.isControle;

  useEffect(() => {
    runSim();
    const histData = gerarHistoricoYTDResuprimento('demo', metaRessuprimento);
    setHistorico(histData);
  }, []);

  const handleSaveMeta = (newVal: number) => {
    setMetaRessuprimento(newVal);
    localStorage.setItem('meta_ressuprimento_pct', String(newVal));
  };

  const runSim = () => {
    const res = executarSimulacaoRessuprimento([], 22);
    setItems(res);
  };

  const handleAddHistoricalEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const res = Number(newPalletsRes) || 0;
    const reab = Number(newPalletsReab) || 0;
    const total = res + reab;
    if (total === 0) return;

    const pctRes = parseFloat(((res / total) * 100).toFixed(1));
    const pctReab = parseFloat(((reab / total) * 100).toFixed(1));
    const isExceeded = pctRes > metaRessuprimento;

    const entry: RessuprimentoHistoricoEntry = {
      id: `manual_${Date.now()}`,
      data: newDate,
      palletsRessupridos: res,
      palletsReabastecidos: reab,
      totalPallets: total,
      pctRessuprimento: pctRes,
      pctReabastecimento: pctReab,
      hlRessupridos: Math.round(res * 8.4 * 10) / 10,
      totalMovimentacoes: total + 5,
      tempoMedioMin: Number(newTempoMedio) || 15,
      skusRessupridos: Number(newSkus) || 10,
      metaRessuprimentoPct: metaRessuprimento,
      metaReabastecimentoPct: 100 - metaRessuprimento,
      statusMeta: isExceeded ? 'FORA_DA_META' : 'NO_PRAZO',
      observacao: isExceeded ? `Lançamento manual com estouro de meta (${pctRes}% > ${metaRessuprimento}%).` : 'Lançamento manual em conformidade.',
      isSimulated: false
    };

    if (isExceeded) {
      triggerAutoAcaoCorretiva({
        processo: 'Ressuprimento',
        colaboradorResponsavel: user.nome,
        indicador: '% Ressuprimento de Picking',
        meta: `≤ ${metaRessuprimento}%`,
        resultadoObtido: `${pctRes}%`,
        desvioEncontrado: `Percentual de Ressuprimento no dia ${newDate} atingiu ${pctRes}%, excedendo a meta estipulada de ≤ ${metaRessuprimento}%.`,
        comentarioOperador: `Estouro de meta registrado no lançamento do Ressuprimento (${res} pallets ressupridos vs ${reab} reabastecidos).`
      });
    }

    const updated = [entry, ...historico];
    setHistorico(updated);
    salvarHistoricoYTDResuprimento('demo', updated);
    setShowAddModal(false);
  };

  const handleDeleteHistoryEntry = (id: string) => {
    if (!window.confirm('Deseja excluir este registro do histórico?')) return;
    const updated = historico.filter(h => h.id !== id);
    setHistorico(updated);
    salvarHistoricoYTDResuprimento('demo', updated);
  };

  // Aggregated totals
  const totalPalletsRes = historico.reduce((acc, h) => acc + h.palletsRessupridos, 0) || 450;
  const totalPalletsReab = historico.reduce((acc, h) => acc + h.palletsReabastecidos, 0) || 1680;
  const totalPalletsGeral = totalPalletsRes + totalPalletsReab;
  
  const mainPctRes = parseFloat(((totalPalletsRes / totalPalletsGeral) * 100).toFixed(1));
  const mainPctReab = parseFloat(((totalPalletsReab / totalPalletsGeral) * 100).toFixed(1));

  const totalHlRes = Math.round(totalPalletsRes * 8.4);
  const totalMovs = totalPalletsGeral + 140;
  const avgTime = Math.round(historico.reduce((acc, h) => acc + h.tempoMedioMin, 0) / (historico.length || 1)) || 16;
  const totalSkus = items.length || 32;

  const filteredItems = items.filter(item => {
    if (filterPrioridade !== 'todos' && item.prioridadeAbastecimento !== filterPrioridade) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        item.produto.toLowerCase().includes(q) ||
        item.codigo.toString().includes(q) ||
        item.recomendacaoInteligente.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const urgentesCount = items.filter(i => i.prioridadeAbastecimento === 'Urgente').length;
  const altasCount = items.filter(i => i.prioridadeAbastecimento === 'Alta').length;
  const prePickingCount = items.filter(i => i.necessitaPrePickingAntecipado).length;

  return (
    <div className="space-y-6">
      {/* BANNER WORKSTATION CCO */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-blue-800/60">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-cyan-300 bg-cyan-400/10 px-3 py-1 rounded-full border border-cyan-400/20 flex items-center gap-1.5 w-max">
            <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
            Workstation CCO - Módulo Executivo de Ressuprimento
          </span>
          <h2 className="text-2xl font-black tracking-tight mt-2 flex items-center gap-2">
            Gestão Integrada de Ressuprimento & Reabastecimento
          </h2>
          <p className="text-xs text-blue-200/90 font-medium mt-1 max-w-3xl">
            Monitoramento centralizado de movimentações do Central para o Picking e Pré-Picking. Inteligência de Venda Média, Política de Estoque e snapshots diários históricos.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={runSim}
            className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Recalcular
          </button>
          {isSupervisorOrAdmin && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Lançar Snapshot
            </button>
          )}
        </div>
      </div>

      {/* HEADER CARDS EXECUTIVOS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-3.5 shadow-sm">
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Pallets Ressupridos</span>
          <p className="text-xl font-black text-amber-400 mt-1">{totalPalletsRes} pl</p>
          <span className="text-[9px] text-amber-300/80 font-bold block mt-0.5">{mainPctRes}% do Total</span>
        </div>

        <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-3.5 shadow-sm">
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Pallets Reabastecidos</span>
          <p className="text-xl font-black text-emerald-400 mt-1">{totalPalletsReab} pl</p>
          <span className="text-[9px] text-emerald-300/80 font-bold block mt-0.5">{mainPctReab}% do Total</span>
        </div>

        <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-3.5 shadow-sm">
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Volume Ressuprido</span>
          <p className="text-xl font-black text-cyan-400 mt-1">{totalHlRes} HL</p>
          <span className="text-[9px] text-cyan-300/80 font-bold block mt-0.5">EFC / EFD</span>
        </div>

        <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-3.5 shadow-sm">
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Movimentações</span>
          <p className="text-xl font-black text-indigo-400 mt-1">{totalMovs} movs</p>
          <span className="text-[9px] text-indigo-300/80 font-bold block mt-0.5">Empilhadeiras</span>
        </div>

        <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-3.5 shadow-sm">
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Tempo Médio / SKU</span>
          <p className="text-xl font-black text-purple-400 mt-1">{avgTime} min</p>
          <span className="text-[9px] text-purple-300/80 font-bold block mt-0.5">Meta: ≤ 20 min</span>
        </div>

        <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-3.5 shadow-sm">
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">SKUs Gerenciados</span>
          <p className="text-xl font-black text-rose-400 mt-1">{totalSkus} SKUs</p>
          <span className="text-[9px] text-rose-300/80 font-bold block mt-0.5">Curva A, B e C</span>
        </div>
      </div>

      {/* PAINEL COMPLEMENTAR DE INDICADORES CHAVE (SOMAM 100%) */}
      <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-amber-400" /> Indicadores Mestre de Proporção Operacional (Total = 100%)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Acompanhamento contínuo da relação entre Ressuprimento (Emergencial/Intermediário) e Reabastecimento (Rotina/Preventivo).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-[#0b1222] border border-slate-700/80 px-3 py-1.5 rounded-xl text-xs text-slate-300">
              Meta Ressuprimento: <strong className="text-amber-400 font-mono">≤ {metaRessuprimento}%</strong>
            </div>
            <div className="bg-[#0b1222] border border-slate-700/80 px-3 py-1.5 rounded-xl text-xs text-slate-300">
              Meta Reabastecimento: <strong className="text-emerald-400 font-mono">≥ {100 - metaRessuprimento}%</strong>
            </div>
          </div>
        </div>

        {/* PROGRESS BAR PROPORTIONAL */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider">
            <span className="text-amber-400 flex items-center gap-1.5">
              ● % Ressuprimento: {mainPctRes}%
            </span>
            <span className="text-emerald-400 flex items-center gap-1.5">
              ● % Reabastecimento: {mainPctReab}%
            </span>
          </div>

          <div className="w-full h-4 bg-slate-900 rounded-full overflow-hidden flex border border-slate-700 p-0.5">
            <div 
              style={{ width: `${mainPctRes}%` }} 
              className={`h-full rounded-l-full transition-all duration-500 ${mainPctRes > metaRessuprimento ? 'bg-rose-500' : 'bg-amber-500'}`}
            />
            <div 
              style={{ width: `${mainPctReab}%` }} 
              className="h-full bg-emerald-500 rounded-r-full transition-all duration-500"
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
            <span>
              {mainPctRes > metaRessuprimento ? (
                <strong className="text-rose-400 uppercase font-black">⚠ Fora da Meta (Estouro Registrado)</strong>
              ) : (
                <strong className="text-emerald-400 uppercase font-black">✓ Operação Dentro da Meta</strong>
              )}
            </span>
            <span>Total Combinado: 100%</span>
          </div>
        </div>
      </div>

      {/* FILTROS GLOBAIS EMBEDDED */}
      <UnifiedStandardFilterBar theme="dark" />

      {/* TAB NAVIGATION */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab('operacional')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'operacional'
              ? 'border-cyan-400 text-cyan-400 bg-cyan-400/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Simulação & Prioridades
        </button>

        <button
          onClick={() => setActiveTab('historico')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'historico'
              ? 'border-cyan-400 text-cyan-400 bg-cyan-400/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Histórico YTD (Snapshots)
        </button>

        <button
          onClick={() => setActiveTab('analise')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'analise'
              ? 'border-cyan-400 text-cyan-400 bg-cyan-400/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Zap className="w-4 h-4" />
          Análise Inteligente & Recomendações
        </button>

        {isSupervisorOrAdmin && (
          <button
            onClick={() => setActiveTab('metas')}
            className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'metas'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-400/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            Configuração de Metas
          </button>
        )}
      </div>

      {/* TAB CONTENT 1: OPERACIONAL (SIMULAÇÃO) */}
      {activeTab === 'operacional' && (
        <div className="space-y-6">
          {/* KPI HIGHLIGHTS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#111a30] border border-rose-500/30 rounded-2xl p-4 shadow-xs flex items-center gap-3">
              <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-rose-400 uppercase">Abastecimento Urgente</span>
                <p className="text-2xl font-black text-white">{urgentesCount} SKUs</p>
                <p className="text-[10px] text-rose-300 font-bold">Risco alto de ruptura na expedição</p>
              </div>
            </div>

            <div className="bg-[#111a30] border border-amber-500/30 rounded-2xl p-4 shadow-xs flex items-center gap-3">
              <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-amber-400 uppercase">Prioridade Alta</span>
                <p className="text-2xl font-black text-white">{altasCount} SKUs</p>
                <p className="text-[10px] text-amber-300 font-bold">Programar abastecimento intermediário</p>
              </div>
            </div>

            <div className="bg-[#111a30] border border-cyan-500/30 rounded-2xl p-4 shadow-xs flex items-center gap-3">
              <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl">
                <Box className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-cyan-400 uppercase">Estágio Pré-Picking</span>
                <p className="text-2xl font-black text-white">{prePickingCount} SKUs</p>
                <p className="text-[10px] text-cyan-300 font-bold">Separação antecipada requerida</p>
              </div>
            </div>
          </div>

          {/* SEARCH & FILTER BAR */}
          <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por SKU, produto ou recomendação..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-[#0b1222] border border-slate-700 text-white rounded-xl pl-9 pr-4 py-2 text-xs outline-none focus:border-cyan-400"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-bold">Prioridade:</span>
              <select
                value={filterPrioridade}
                onChange={e => setFilterPrioridade(e.target.value)}
                className="bg-[#0b1222] border border-slate-700 text-white text-xs font-bold rounded-xl px-3 py-2 outline-none"
              >
                <option value="todos">Todas</option>
                <option value="Urgente">Urgente</option>
                <option value="Alta">Alta</option>
                <option value="Média">Média</option>
                <option value="Sem Necessidade">Sem Necessidade</option>
              </select>
            </div>
          </div>

          {/* TABLE */}
          <div className="bg-[#111a30] border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#0b1222] text-slate-400 font-black uppercase text-[10px] border-b border-slate-800">
                    <th className="p-3">Código / Produto</th>
                    <th className="p-3">Venda Média</th>
                    <th className="p-3">Central</th>
                    <th className="p-3">Picking</th>
                    <th className="p-3">Saída Prevista</th>
                    <th className="p-3">Qtd Movimentar</th>
                    <th className="p-3">Prioridade</th>
                    <th className="p-3">Horário Sugerido</th>
                    <th className="p-3">Recomendação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300 font-medium">
                  {filteredItems.map(item => (
                    <tr key={item.codigo} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 font-bold text-white">
                        <span className="text-slate-400 font-mono text-[10px] block">#{item.codigo}</span>
                        {item.produto}
                      </td>
                      <td className="p-3 font-mono">{item.vendaMediaDiaria} cx/dia</td>
                      <td className="p-3 font-mono">{item.estoqueCentral} cx</td>
                      <td className="p-3 font-mono">
                        <span className={item.estoquePicking < item.vendaMediaDiaria ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                          {item.estoquePicking} cx
                        </span>
                      </td>
                      <td className="p-3 font-mono">{item.saidaPrevistaDia} cx</td>
                      <td className="p-3 font-mono font-bold text-cyan-400">
                        {item.qtdIdealMovimentar} cx ({item.qtdPaletesIdeal} pl)
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                          item.prioridadeAbastecimento === 'Urgente' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                          item.prioridadeAbastecimento === 'Alta' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                          item.prioridadeAbastecimento === 'Média' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {item.prioridadeAbastecimento}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-indigo-300">{item.horarioSugerido}</td>
                      <td className="p-3 text-[11px] max-w-xs">{item.recomendacaoInteligente}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: HISTÓRICO YTD */}
      {activeTab === 'historico' && (
        <div className="space-y-6">
          <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-cyan-400" /> Histórico YTD de Snapshots diários (01/Jan até Hoje)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Registros consolidados de movimentações para alimentação de evoluções diárias, semanais e mensais.
                </p>
              </div>

              {isSupervisorOrAdmin && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-md transition-all flex items-center gap-1.5 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Snapshot
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#0b1222] text-slate-400 font-black uppercase text-[10px] border-b border-slate-800">
                    <th className="p-3">Data</th>
                    <th className="p-3">Pallets Ressupridos</th>
                    <th className="p-3">Pallets Reabastecidos</th>
                    <th className="p-3">Total Pallets</th>
                    <th className="p-3">% Ressuprimento</th>
                    <th className="p-3">% Reabastecimento</th>
                    <th className="p-3">Tempo Médio</th>
                    <th className="p-3">Status Meta</th>
                    <th className="p-3">Observação</th>
                    {isSupervisorOrAdmin && <th className="p-3 text-right">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300 font-medium">
                  {historico.slice(0, 40).map(entry => (
                    <tr key={entry.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 font-mono font-bold text-white">{entry.data}</td>
                      <td className="p-3 font-mono text-amber-400 font-bold">{entry.palletsRessupridos} pl</td>
                      <td className="p-3 font-mono text-emerald-400 font-bold">{entry.palletsReabastecidos} pl</td>
                      <td className="p-3 font-mono">{entry.totalPallets} pl</td>
                      <td className="p-3 font-mono font-black">
                        <span className={entry.pctRessuprimento > metaRessuprimento ? 'text-rose-400' : 'text-amber-400'}>
                          {entry.pctRessuprimento}%
                        </span>
                      </td>
                      <td className="p-3 font-mono font-black text-emerald-400">{entry.pctReabastecimento}%</td>
                      <td className="p-3 font-mono">{entry.tempoMedioMin} min</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                          entry.statusMeta === 'FORA_DA_META' 
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {entry.statusMeta === 'FORA_DA_META' ? 'Estouro Meta' : 'Conforme'}
                        </span>
                      </td>
                      <td className="p-3 text-[11px] text-slate-400 max-w-xs truncate">{entry.observacao}</td>
                      {isSupervisorOrAdmin && (
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleDeleteHistoryEntry(entry.id)}
                            className="p-1 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: ANÁLISE INTELIGENTE & RECOMENDAÇÕES */}
      {activeTab === 'analise' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" /> Recomendações Automáticas da Operação
              </h3>

              <div className="space-y-3">
                <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-xs text-cyan-200">
                  <strong className="block text-cyan-400 font-bold mb-1">💡 Sugestão de Pré-Picking Antecipado</strong>
                  Identificados 4 SKUs da Curva A com saída prevista excedendo 140% da venda média diária. Recomenda-se realizar pré-separação de 8 pallets no início do turno para evitar filas de empilhadeira.
                </div>

                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-200">
                  <strong className="block text-rose-400 font-bold mb-1">⚠ Alerta de Risco de Tendência de Estouro</strong>
                  A proporção de ressuprimentos nas últimas 48h atingiu 24.8%, muito próxima do limite de 25%. Risco de acionamento automático de Ações Corretivas no turno vespertino.
                </div>

                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-200">
                  <strong className="block text-amber-400 font-bold mb-1">📦 Produtos com Excesso no Corredor de Picking</strong>
                  SKU #102 (Skol 600ml) apresenta 145 caixas no picking (cobertura de 3.2 dias), excedendo a política padrão de 1.5 dias. Sugere-se pausa no abastecimento deste item.
                </div>
              </div>
            </div>

            <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-400" /> Rankings de Performance & Operadores
              </h3>

              <div className="space-y-3 text-xs">
                <div className="bg-[#0b1222] p-3 rounded-xl border border-slate-700/80">
                  <span className="text-[10px] text-slate-400 uppercase font-black block">Operadores Mais Eficientes</span>
                  <div className="mt-2 space-y-1.5 font-bold">
                    <div className="flex justify-between text-white">
                      <span>1. Carlos Silva (Empilhadeira 03)</span>
                      <span className="text-emerald-400">42 movs/turno (12 min/sku)</span>
                    </div>
                    <div className="flex justify-between text-white">
                      <span>2. Fernanda Lima (Empilhadeira 01)</span>
                      <span className="text-emerald-400">38 movs/turno (14 min/sku)</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#0b1222] p-3 rounded-xl border border-slate-700/80">
                  <span className="text-[10px] text-slate-400 uppercase font-black block">SKUs Mais Movimentados</span>
                  <div className="mt-2 space-y-1.5 font-bold">
                    <div className="flex justify-between text-white">
                      <span>1. Brahma Garrafa 600ml</span>
                      <span className="text-amber-400">18 pallets ressupridos</span>
                    </div>
                    <div className="flex justify-between text-white">
                      <span>2. Skol Lata 350ml</span>
                      <span className="text-amber-400">14 pallets ressupridos</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: CONFIGURAÇÃO DE METAS */}
      {activeTab === 'metas' && isSupervisorOrAdmin && (
        <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-5 shadow-sm max-w-xl space-y-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" /> Configuração de Metas Operacionais de Ressuprimento
          </h3>
          <p className="text-xs text-slate-400">
            Ajuste a meta limite de % Ressuprimento. Valores acima desta meta acionarão automaticamente instâncias no Quadro Geral de Ações e Governança.
          </p>

          <div className="space-y-3 pt-2">
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-slate-300 block mb-1">
                Meta Limite Max de Ressuprimento (%)
              </label>
              <input
                type="number"
                value={metaRessuprimento}
                onChange={e => handleSaveMeta(Number(e.target.value))}
                className="w-full bg-[#0b1222] border border-slate-700 text-amber-400 font-mono font-bold text-sm rounded-xl px-3 py-2 outline-none focus:border-amber-400"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Meta atual de Reabastecimento Mínimo: <strong>{100 - metaRessuprimento}%</strong>
              </span>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-200 font-medium">
              ✓ As alterações de metas são aplicadas imediatamente para todos os relatórios e snapshots históricos.
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOVO SNAPSHOT */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-black text-white uppercase tracking-wider">Lançar Snapshot de Ressuprimento</h3>

            <form onSubmit={handleAddHistoricalEntry} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-bold block mb-1">Data</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  className="w-full bg-[#0b1222] border border-slate-700 text-white rounded-xl p-2 font-mono outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-bold block mb-1">Pallets Ressupridos</label>
                  <input
                    type="number"
                    value={newPalletsRes}
                    onChange={e => setNewPalletsRes(e.target.value)}
                    className="w-full bg-[#0b1222] border border-slate-700 text-amber-400 font-mono font-bold rounded-xl p-2 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-slate-400 font-bold block mb-1">Pallets Reabastecidos</label>
                  <input
                    type="number"
                    value={newPalletsReab}
                    onChange={e => setNewPalletsReab(e.target.value)}
                    className="w-full bg-[#0b1222] border border-slate-700 text-emerald-400 font-mono font-bold rounded-xl p-2 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-bold block mb-1">Tempo Médio (min)</label>
                  <input
                    type="number"
                    value={newTempoMedio}
                    onChange={e => setNewTempoMedio(e.target.value)}
                    className="w-full bg-[#0b1222] border border-slate-700 text-white font-mono rounded-xl p-2 outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-400 font-bold block mb-1">SKUs Movimentados</label>
                  <input
                    type="number"
                    value={newSkus}
                    onChange={e => setNewSkus(e.target.value)}
                    className="w-full bg-[#0b1222] border border-slate-700 text-white font-mono rounded-xl p-2 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black uppercase rounded-xl cursor-pointer"
                >
                  Salvar Snapshot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
