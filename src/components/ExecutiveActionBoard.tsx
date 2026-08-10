import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  Edit2, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  User, 
  MessageSquare, 
  Building2, 
  Filter,
  Layers,
  Search,
  Database,
  Download,
  AlertTriangle,
  Zap,
  CheckSquare,
  Square,
  FileText,
  Calendar,
  X,
  ShieldCheck,
  TrendingUp,
  HelpCircle,
  Paperclip,
  Check
} from 'lucide-react';
import { 
  AcaoCorretiva, 
  CincoPorques,
  MODULES_LIST, 
  DatabaseMode,
  getActiveDatabaseMode,
  setActiveDatabaseMode,
  getAcoesAll,
  saveAcoes,
  triggerAutoAcaoCorretiva,
  triggerAutoAcaoMelhoriaPreventiva,
  updateAcaoCorretiva,
  deleteAcaoCorretiva,
  deleteAcoesBatch,
  restoreSimulatedDatabase,
  exportAcoesCSV
} from '../utils/simulacaoAcoesUtils';
import { Usuario } from '../types';

interface ExecutiveActionBoardProps {
  user?: Usuario;
  theme?: 'dark' | 'light';
  onSelectAction?: (action: AcaoCorretiva) => void;
}

export const ExecutiveActionBoard: React.FC<ExecutiveActionBoardProps> = ({
  user,
  theme = 'light'
}) => {
  const [dbMode, setDbMode] = useState<DatabaseMode>(getActiveDatabaseMode());
  const [acoes, setAcoes] = useState<AcaoCorretiva[]>([]);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProcesso, setSelectedProcesso] = useState<string>('todos');
  const [selectedTipo, setSelectedTipo] = useState<string>('todos'); // Corretiva | Melhoria
  const [selectedPrioridade, setSelectedPrioridade] = useState<string>('todos'); // Alta | Média | Baixa
  const [selectedStatus, setSelectedStatus] = useState<string>('todos');
  const [selectedAprovacao, setSelectedAprovacao] = useState<string>('todos');

  // Modal for Action Detail / 5 Whys / Closure Flow
  const [activeItem, setActiveItem] = useState<AcaoCorretiva | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreatingManual, setIsCreatingManual] = useState(false);

  // Manual Form State
  const [manualForm, setManualForm] = useState({
    processo: 'Repack' as AcaoCorretiva['processo'],
    tipoAcao: 'Corretiva' as 'Corretiva' | 'Melhoria',
    prioridade: 'Alta' as 'Alta' | 'Média' | 'Baixa',
    indicador: 'Produtividade de Turno',
    meta: '100% Executado',
    resultadoObtido: '82% Executado',
    desvioEncontrado: 'Atraso na liberação de paletes na linha 1',
    setor: 'Armazém 01',
    colaboradorResponsavel: user?.nome || 'Operador de Turno',
    responsavelTratativa: 'Supervisor de Operações',
    prazo: new Date(Date.now() + 3*86400000).toISOString().split('T')[0],
    porque1: 'Por que o indicador desviou? Houve atraso na entrega de insumos.',
    porque2: 'Por que faltou insumo? A empilhadeira estava em outra tarefa.',
    porque3: 'Por que a empilhadeira estava ocupada? Não havia priorização no WMS.',
    porque4: 'Por que não havia priorização? Parâmetro de fila desatualizado.',
    porque5: 'Por que o parâmetro estava desatualizado? Falha na rotina de checagem inicial.',
    contramedida: 'Atualizar parâmetro no WMS e alocar empilhador dedicado.',
    impactoEsperado: 'Evitar parada de linha e garantir 100% da meta diária'
  });

  useEffect(() => {
    loadData();
  }, [dbMode]);

  const loadData = () => {
    setAcoes(getAcoesAll(dbMode));
  };

  const isDark = theme === 'dark';

  // KPI Metrics
  const metrics = useMemo(() => {
    const total = acoes.length;
    const corretivas = acoes.filter(a => a.tipoAcao === 'Corretiva').length;
    const melhorias = acoes.filter(a => a.tipoAcao === 'Melhoria').length;
    const concluidas = acoes.filter(a => a.status === 'Concluído').length;
    const pendentes = acoes.filter(a => a.status === 'Pendente' || a.status === 'Em Andamento').length;
    const emRiscoOuAtrasadas = acoes.filter(a => a.status === 'Atrasado' || a.prioridade === 'Alta').length;
    return { total, corretivas, melhorias, concluidas, pendentes, emRiscoOuAtrasadas };
  }, [acoes]);

  // Filtered List
  const filteredAcoes = useMemo(() => {
    return acoes.filter(a => {
      if (selectedProcesso !== 'todos' && a.processo !== selectedProcesso) return false;
      if (selectedTipo !== 'todos' && a.tipoAcao !== selectedTipo) return false;
      if (selectedPrioridade !== 'todos' && a.prioridade !== selectedPrioridade) return false;
      if (selectedStatus !== 'todos' && a.status !== selectedStatus) return false;
      if (selectedAprovacao !== 'todos' && (a.aprovacaoGestor || 'Pendente') !== selectedAprovacao) return false;

      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          a.id.toLowerCase().includes(q) ||
          a.processo.toLowerCase().includes(q) ||
          a.indicador.toLowerCase().includes(q) ||
          a.colaboradorResponsavel.toLowerCase().includes(q) ||
          a.responsavelTratativa.toLowerCase().includes(q) ||
          a.desvioEncontrado.toLowerCase().includes(q) ||
          (a.contramedida || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [acoes, selectedProcesso, selectedTipo, selectedPrioridade, selectedStatus, selectedAprovacao, searchTerm]);

  // Handle Save Action (Approval, Aceite, Evidence)
  const handleSaveActiveItem = () => {
    if (!activeItem) return;
    updateAcaoCorretiva(activeItem, user?.nome || 'Gestor Executivo');
    setIsModalOpen(false);
    loadData();
  };

  const handleDeleteAction = (id: string) => {
    deleteAcaoCorretiva(id);
    loadData();
  };

  // Close Action with Validation (Req 33 & 35)
  const handleCloseAction = () => {
    if (!activeItem) return;
    if (!activeItem.evidencias || activeItem.evidencias.trim() === '') {
      alert('⚠️ Para encerrar uma ação, é obrigatório anexar/preencher a evidência do resultado!');
      return;
    }
    if (activeItem.aprovacaoGestor !== 'Aprovado') {
      alert('⚠️ Para encerrar uma ação, o gestor responsável precisa aprovar a contramedida!');
      return;
    }
    if (!activeItem.aceiteColaborador) {
      alert('⚠️ Para encerrar uma ação, o colaborador responsável deve assinar "Li e estou de acordo"!');
      return;
    }

    const updated = {
      ...activeItem,
      status: 'Concluído' as const,
      situacaoMeta: 'Atingida' as const
    };

    updateAcaoCorretiva(updated, user?.nome || 'Gestor Executivo');
    setActiveItem(updated);
    setIsModalOpen(false);
    loadData();
  };

  // Create Manual Action
  const handleCreateManual = (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date();
    const dStr = now.toLocaleDateString('pt-BR');
    const dISO = now.toISOString().split('T')[0];
    const hStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const newAction: AcaoCorretiva = {
      id: `acao-exec-${Date.now()}`,
      data: dStr,
      dataISO: dISO,
      hora: hStr,
      processo: manualForm.processo,
      setor: manualForm.setor,
      colaboradorResponsavel: manualForm.colaboradorResponsavel,
      indicador: manualForm.indicador,
      meta: manualForm.meta,
      resultadoObtido: manualForm.resultadoObtido,
      desvioEncontrado: manualForm.desvioEncontrado,
      causaRaiz: 'Método',
      causaRaizDetalhe: 'Ação manual criada via Painel Executivo',
      status: 'Pendente',
      responsavelTratativa: manualForm.responsavelTratativa,
      prazo: manualForm.prazo,
      comentarioOperador: manualForm.desvioEncontrado,
      simulado: dbMode === 'simulado',
      criadoEm: now.toISOString(),
      tipoAcao: manualForm.tipoAcao,
      prioridade: manualForm.prioridade,
      cincoPorques: {
        porque1: manualForm.porque1,
        porque2: manualForm.porque2,
        porque3: manualForm.porque3,
        porque4: manualForm.porque4,
        porque5: manualForm.porque5
      },
      contramedida: manualForm.contramedida,
      aprovacaoGestor: 'Pendente',
      aceiteColaborador: false,
      impactoEsperado: manualForm.impactoEsperado,
      situacaoMeta: manualForm.tipoAcao === 'Melhoria' ? 'Tendência de Queda' : 'Perdida',
      historicoAlteracoes: [{
        dataHora: `${dStr} ${hStr}`,
        usuario: user?.nome || 'Gestor Executivo',
        alteracao: `Ação (${manualForm.tipoAcao}) criada manualmente via Painel Executivo.`
      }]
    };

    const current = getAcoesAll();
    saveAcoes([newAction, ...current]);
    setIsCreatingManual(false);
    loadData();
  };

  return (
    <div className={`p-6 rounded-2xl border shadow-sm transition-all space-y-6 ${
      isDark ? 'bg-[#0f172a] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
    }`}>
      
      {/* EXECUTIVE HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-700/40">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <ShieldCheck className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-xl font-black tracking-tight uppercase flex items-center gap-2">
                Painel Executivo Único de Ações (Governança Integrada)
              </h2>
              <p className="text-xs text-slate-400">
                Centralização estratégica de Ações Corretivas e Ações de Melhoria Preventiva para os 14 processos logísticos.
              </p>
            </div>
          </div>
        </div>

        {/* TOP CONTROLS */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsCreatingManual(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-md transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Nova Ação Executiva
          </button>

          <button
            onClick={() => exportAcoesCSV(dbMode)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Exportar Relatório
          </button>
        </div>
      </div>

      {/* METRICS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-[#1e293b]/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          <span className="text-[10px] font-black uppercase text-slate-400 block">Total de Ações</span>
          <span className="text-xl font-black font-mono text-indigo-400">{metrics.total}</span>
        </div>

        <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-[#1e293b]/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          <span className="text-[10px] font-black uppercase text-rose-400 block">Ações Corretivas</span>
          <span className="text-xl font-black font-mono text-rose-400">{metrics.corretivas}</span>
        </div>

        <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-[#1e293b]/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          <span className="text-[10px] font-black uppercase text-amber-400 block">Ações de Melhoria</span>
          <span className="text-xl font-black font-mono text-amber-400">{metrics.melhorias}</span>
        </div>

        <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-[#1e293b]/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          <span className="text-[10px] font-black uppercase text-emerald-400 block">Concluídas</span>
          <span className="text-xl font-black font-mono text-emerald-400">{metrics.concluidas}</span>
        </div>

        <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-[#1e293b]/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          <span className="text-[10px] font-black uppercase text-blue-400 block">Em Andamento</span>
          <span className="text-xl font-black font-mono text-blue-400">{metrics.pendentes}</span>
        </div>

        <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-[#1e293b]/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          <span className="text-[10px] font-black uppercase text-rose-500 block">Prioridade Alta / Risco</span>
          <span className="text-xl font-black font-mono text-rose-500">{metrics.emRiscoOuAtrasadas}</span>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className={`p-4 rounded-xl border space-y-3 ${isDark ? 'bg-[#1e293b]/40 border-slate-700/80' : 'bg-slate-50 border-slate-200'}`}>
        <div className="flex items-center justify-between font-black text-xs uppercase tracking-wider text-slate-400">
          <span className="flex items-center gap-1.5"><Filter className="w-3.5 h-3.5 text-indigo-400" /> Filtros Executivos de Governança</span>
          <span>{filteredAcoes.length} de {acoes.length} ações</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {/* BUSCA */}
          <input
            type="text"
            placeholder="Buscar por termo ou SKU..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className={`px-3 py-2 rounded-lg text-xs outline-none border ${isDark ? 'bg-[#0b1222] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'}`}
          />

          {/* PROCESSO (14 MODULOS) */}
          <select
            value={selectedProcesso}
            onChange={e => setSelectedProcesso(e.target.value)}
            className={`px-3 py-2 rounded-lg text-xs font-bold outline-none border ${isDark ? 'bg-[#0b1222] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'}`}
          >
            <option value="todos">Todos os 14 Processos</option>
            {MODULES_LIST.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          {/* TIPO DE AÇÃO */}
          <select
            value={selectedTipo}
            onChange={e => setSelectedTipo(e.target.value)}
            className={`px-3 py-2 rounded-lg text-xs font-bold outline-none border ${isDark ? 'bg-[#0b1222] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'}`}
          >
            <option value="todos">Todos os Tipos</option>
            <option value="Corretiva">Ações Corretivas (Desvio)</option>
            <option value="Melhoria">Ações de Melhoria (Preventivas)</option>
          </select>

          {/* PRIORIDADE */}
          <select
            value={selectedPrioridade}
            onChange={e => setSelectedPrioridade(e.target.value)}
            className={`px-3 py-2 rounded-lg text-xs font-bold outline-none border ${isDark ? 'bg-[#0b1222] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'}`}
          >
            <option value="todos">Todas Prioridades</option>
            <option value="Alta">Alta Prioridade</option>
            <option value="Média">Média Prioridade</option>
            <option value="Baixa">Baixa Prioridade</option>
          </select>

          {/* STATUS */}
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className={`px-3 py-2 rounded-lg text-xs font-bold outline-none border ${isDark ? 'bg-[#0b1222] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'}`}
          >
            <option value="todos">Todos os Status</option>
            <option value="Pendente">Pendente</option>
            <option value="Em Andamento">Em Andamento</option>
            <option value="Concluído">Concluído</option>
            <option value="Atrasado">Atrasado</option>
          </select>

          {/* APROVAÇÃO DO GESTOR */}
          <select
            value={selectedAprovacao}
            onChange={e => setSelectedAprovacao(e.target.value)}
            className={`px-3 py-2 rounded-lg text-xs font-bold outline-none border ${isDark ? 'bg-[#0b1222] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'}`}
          >
            <option value="todos">Aprovação Gestor</option>
            <option value="Aprovado">Aprovadas</option>
            <option value="Pendente">Pendentes de Aceite</option>
          </select>
        </div>
      </div>

      {/* TABLE / LIST OF ACTIONS */}
      <div className="overflow-x-auto rounded-xl border border-slate-700/50">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className={`border-b uppercase text-[10px] font-black tracking-wider ${
              isDark ? 'bg-[#1e293b] border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}>
              <th className="p-3">Processo / Indicador</th>
              <th className="p-3">Tipo & Prioridade</th>
              <th className="p-3">Desvio / Oportunidade</th>
              <th className="p-3">Responsável</th>
              <th className="p-3">Prazo</th>
              <th className="p-3">Governança (Gestor & Aceite)</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isDark ? 'divide-slate-800/80' : 'divide-slate-200'}`}>
            {filteredAcoes.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400 font-bold">
                  Nenhuma ação encontrada para os parâmetros informados.
                </td>
              </tr>
            ) : (
              filteredAcoes.map(item => {
                const isCorretiva = item.tipoAcao === 'Corretiva';
                const isApproved = item.aprovacaoGestor === 'Aprovado';
                const hasAceite = item.aceiteColaborador;

                return (
                  <tr 
                    key={item.id} 
                    className={`hover:bg-indigo-500/5 transition-all ${
                      item.prioridade === 'Alta' ? 'border-l-4 border-l-rose-500' : 'border-l-4 border-l-transparent'
                    }`}
                  >
                    <td className="p-3">
                      <span className="font-black text-xs block text-indigo-400">{item.processo}</span>
                      <span className="text-[10px] text-slate-400 block">{item.indicador}</span>
                    </td>

                    <td className="p-3 font-semibold">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase inline-block mb-1 ${
                        isCorretiva ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {item.tipoAcao}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase block w-max ${
                        item.prioridade === 'Alta' ? 'bg-rose-600 text-white' : item.prioridade === 'Média' ? 'bg-amber-600 text-white' : 'bg-slate-600 text-white'
                      }`}>
                        {item.prioridade}
                      </span>
                    </td>

                    <td className="p-3 max-w-xs">
                      <span className="font-bold block truncate" title={item.desvioEncontrado}>
                        {item.desvioEncontrado}
                      </span>
                      {item.contramedida && (
                        <span className="text-[10px] text-slate-400 block italic truncate">
                          💡 Contramedida: {item.contramedida}
                        </span>
                      )}
                    </td>

                    <td className="p-3 font-medium">
                      <span className="block font-bold">{item.colaboradorResponsavel}</span>
                      <span className="text-[10px] text-slate-400">Gestor: {item.responsavelTratativa}</span>
                    </td>

                    <td className="p-3 font-mono text-[11px]">
                      {item.prazo}
                    </td>

                    <td className="p-3">
                      <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                        <span className={`px-2 py-0.5 rounded font-black uppercase ${
                          isApproved ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          Gestor: {item.aprovacaoGestor || 'Pendente'}
                        </span>

                        <span className={`px-2 py-0.5 rounded font-black uppercase ${
                          hasAceite ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}>
                          {hasAceite ? '✓ Aceite Assinado' : 'Pend. Aceite'}
                        </span>
                      </div>
                    </td>

                    <td className="p-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase inline-block ${
                        item.status === 'Concluído' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                        item.status === 'Atrasado' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' :
                        'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}>
                        {item.status}
                      </span>
                    </td>

                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setActiveItem(item);
                            setIsModalOpen(true);
                          }}
                          className="px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 rounded-lg text-xs font-black uppercase cursor-pointer transition-all flex items-center gap-1"
                        >
                          <Edit2 className="w-3.5 h-3.5" /> 5 Porquês & Tratativa
                        </button>
                        <button
                          onClick={() => handleDeleteAction(item.id)}
                          className="p-1.5 text-rose-400 hover:text-white hover:bg-rose-500/20 border border-rose-500/30 rounded-lg cursor-pointer transition-all"
                          title="Excluir Ação"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL 5 PORQUÊS & TRATATIVA COMPLETA (REQ 33 & 35) */}
      {isModalOpen && activeItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto ${
            isDark ? 'bg-[#0f172a] border border-slate-700 text-white' : 'bg-white text-slate-800'
          }`}>
            
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between border-b pb-3 border-slate-700/50">
              <div>
                <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase ${
                  activeItem.tipoAcao === 'Corretiva' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                }`}>
                  Ação {activeItem.tipoAcao} - {activeItem.processo}
                </span>
                <h3 className="font-black text-base uppercase mt-1">
                  Tratativa de Governança #{activeItem.id}
                </h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-700/50 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* PROBLEM SUMMARY */}
            <div className={`p-4 rounded-xl border space-y-2 ${isDark ? 'bg-[#1e293b]/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
                <div>
                  <span className="text-[9px] text-slate-400 uppercase block">Processo</span>
                  <span className="font-black text-indigo-400">{activeItem.processo}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase block">Setor / Doca</span>
                  <span className="font-black">{activeItem.setor}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase block">Meta Diária</span>
                  <span className="font-black text-amber-400">{activeItem.meta}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase block">Resultado Obtido</span>
                  <span className="font-black text-rose-400">{activeItem.resultadoObtido}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-700/40 text-xs">
                <span className="text-[10px] text-slate-400 uppercase font-black block">Desvio / Alerta Identificado</span>
                <p className="font-bold text-sm text-amber-300">{activeItem.desvioEncontrado}</p>
              </div>
            </div>

            {/* FORMULÁRIO MANDATÓRIO DOS 5 PORQUÊS (REQ 33 & 35) */}
            <div className={`p-4 rounded-xl border space-y-3 ${isDark ? 'bg-[#1e293b]/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-indigo-400" />
                <h4 className="font-black text-xs uppercase tracking-wider text-indigo-400">
                  Formulário dos 5 Porquês (Análise de Causa Raiz)
                </h4>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">1º Por quê?</label>
                  <input
                    type="text"
                    value={activeItem.cincoPorques?.porque1 || ''}
                    onChange={e => setActiveItem({
                      ...activeItem,
                      cincoPorques: {
                        porque1: e.target.value,
                        porque2: activeItem.cincoPorques?.porque2 || '',
                        porque3: activeItem.cincoPorques?.porque3 || '',
                        porque4: activeItem.cincoPorques?.porque4 || '',
                        porque5: activeItem.cincoPorques?.porque5 || ''
                      }
                    })}
                    placeholder="Primeiro nível da ocorrência..."
                    className={`w-full p-2 rounded-lg border text-xs outline-none ${isDark ? 'bg-[#0b1222] border-slate-700 text-white' : 'bg-white border-slate-300'}`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">2º Por quê?</label>
                  <input
                    type="text"
                    value={activeItem.cincoPorques?.porque2 || ''}
                    onChange={e => setActiveItem({
                      ...activeItem,
                      cincoPorques: {
                        porque1: activeItem.cincoPorques?.porque1 || '',
                        porque2: e.target.value,
                        porque3: activeItem.cincoPorques?.porque3 || '',
                        porque4: activeItem.cincoPorques?.porque4 || '',
                        porque5: activeItem.cincoPorques?.porque5 || ''
                      }
                    })}
                    placeholder="Segundo nível..."
                    className={`w-full p-2 rounded-lg border text-xs outline-none ${isDark ? 'bg-[#0b1222] border-slate-700 text-white' : 'bg-white border-slate-300'}`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">3º Por quê?</label>
                  <input
                    type="text"
                    value={activeItem.cincoPorques?.porque3 || ''}
                    onChange={e => setActiveItem({
                      ...activeItem,
                      cincoPorques: {
                        porque1: activeItem.cincoPorques?.porque1 || '',
                        porque2: activeItem.cincoPorques?.porque2 || '',
                        porque3: e.target.value,
                        porque4: activeItem.cincoPorques?.porque4 || '',
                        porque5: activeItem.cincoPorques?.porque5 || ''
                      }
                    })}
                    placeholder="Terceiro nível..."
                    className={`w-full p-2 rounded-lg border text-xs outline-none ${isDark ? 'bg-[#0b1222] border-slate-700 text-white' : 'bg-white border-slate-300'}`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">4º Por quê?</label>
                  <input
                    type="text"
                    value={activeItem.cincoPorques?.porque4 || ''}
                    onChange={e => setActiveItem({
                      ...activeItem,
                      cincoPorques: {
                        porque1: activeItem.cincoPorques?.porque1 || '',
                        porque2: activeItem.cincoPorques?.porque2 || '',
                        porque3: activeItem.cincoPorques?.porque3 || '',
                        porque4: e.target.value,
                        porque5: activeItem.cincoPorques?.porque5 || ''
                      }
                    })}
                    placeholder="Quarto nível..."
                    className={`w-full p-2 rounded-lg border text-xs outline-none ${isDark ? 'bg-[#0b1222] border-slate-700 text-white' : 'bg-white border-slate-300'}`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">5º Por quê? (Causa Raiz)</label>
                  <input
                    type="text"
                    value={activeItem.cincoPorques?.porque5 || ''}
                    onChange={e => setActiveItem({
                      ...activeItem,
                      cincoPorques: {
                        porque1: activeItem.cincoPorques?.porque1 || '',
                        porque2: activeItem.cincoPorques?.porque2 || '',
                        porque3: activeItem.cincoPorques?.porque3 || '',
                        porque4: activeItem.cincoPorques?.porque4 || '',
                        porque5: e.target.value
                      }
                    })}
                    placeholder="Origem fundamental do problema..."
                    className={`w-full p-2 rounded-lg border text-xs font-bold text-rose-400 outline-none ${isDark ? 'bg-[#0b1222] border-slate-700' : 'bg-white border-slate-300'}`}
                  />
                </div>
              </div>
            </div>

            {/* CONTRAMEDIDA E EVIDÊNCIAS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Contramedida Requerida</label>
                <textarea
                  rows={2}
                  value={activeItem.contramedida || ''}
                  onChange={e => setActiveItem({ ...activeItem, contramedida: e.target.value })}
                  className={`w-full p-2 rounded-lg border text-xs outline-none font-semibold ${isDark ? 'bg-[#0b1222] border-slate-700 text-white' : 'bg-white border-slate-300'}`}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Evidência Anexada (Link / Descrição)</label>
                <textarea
                  rows={2}
                  value={activeItem.evidencias || ''}
                  onChange={e => setActiveItem({ ...activeItem, evidencias: e.target.value })}
                  placeholder="Ex: Foto de verificação anexada em 29/07..."
                  className={`w-full p-2 rounded-lg border text-xs outline-none ${isDark ? 'bg-[#0b1222] border-slate-700 text-white' : 'bg-white border-slate-300'}`}
                />
              </div>
            </div>

            {/* CONTROLES DE GOVERNANÇA: APROVAÇÃO DO GESTOR & TERMO DE ACEITE */}
            <div className={`p-4 rounded-xl border space-y-3 ${isDark ? 'bg-[#1e293b]/80 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Validação de Governança e Encerramento
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* APROVAÇÃO DO GESTOR */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-300 block">Aprovação do Gestor Responsável</label>
                  <select
                    value={activeItem.aprovacaoGestor || 'Pendente'}
                    onChange={e => setActiveItem({ ...activeItem, aprovacaoGestor: e.target.value as any })}
                    className={`w-full p-2 rounded-lg text-xs font-black outline-none border ${
                      activeItem.aprovacaoGestor === 'Aprovado' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    }`}
                  >
                    <option value="Pendente">Pendente de Análise</option>
                    <option value="Aprovado">Aprovado pelo Gestor</option>
                    <option value="Rejeitado">Rejeitado / Reabrir</option>
                  </select>
                </div>

                {/* TERMO DE ACEITE DO COLABORADOR */}
                <div className="space-y-1 flex flex-col justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveItem({ ...activeItem, aceiteColaborador: !activeItem.aceiteColaborador })}
                    className={`p-2 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                      activeItem.aceiteColaborador
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {activeItem.aceiteColaborador ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    <span>"Li e estou de acordo" (Aceite do Colaborador)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* BOTÕES DE AÇÃO */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
              <button
                onClick={() => {
                  deleteAcaoCorretiva(activeItem.id);
                  setIsModalOpen(false);
                  loadData();
                }}
                className="px-3 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" /> Excluir Ação
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveActiveItem}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Salvar Rascunho
                </button>

                <button
                  onClick={handleCloseAction}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-lg transition-all flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" /> Concluir e Encerrar Ação
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MANUAL ACTION CREATION */}
      {isCreatingManual && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleCreateManual} className={`rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 ${
            isDark ? 'bg-[#0f172a] text-white border border-slate-700' : 'bg-white text-slate-800'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-700">
              <h3 className="font-black text-sm uppercase flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-400" />
                Criar Ação Executiva de Governança
              </h3>
              <button type="button" onClick={() => setIsCreatingManual(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
              <div>
                <label className="block text-[10px] text-slate-400 uppercase mb-0.5">Processo Operacional</label>
                <select
                  value={manualForm.processo}
                  onChange={e => setManualForm({ ...manualForm, processo: e.target.value as any })}
                  className={`w-full p-2 rounded-lg border ${isDark ? 'bg-[#0b1222] border-slate-700' : 'bg-slate-50 border-slate-300'}`}
                >
                  {MODULES_LIST.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase mb-0.5">Tipo de Ação</label>
                <select
                  value={manualForm.tipoAcao}
                  onChange={e => setManualForm({ ...manualForm, tipoAcao: e.target.value as any })}
                  className={`w-full p-2 rounded-lg border ${isDark ? 'bg-[#0b1222] border-slate-700' : 'bg-slate-50 border-slate-300'}`}
                >
                  <option value="Corretiva">Ação Corretiva (Desvio)</option>
                  <option value="Melhoria">Ação de Melhoria (Preventiva)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase mb-0.5">Prioridade</label>
                <select
                  value={manualForm.prioridade}
                  onChange={e => setManualForm({ ...manualForm, prioridade: e.target.value as any })}
                  className={`w-full p-2 rounded-lg border ${isDark ? 'bg-[#0b1222] border-slate-700' : 'bg-slate-50 border-slate-300'}`}
                >
                  <option value="Alta">Alta</option>
                  <option value="Média">Média</option>
                  <option value="Baixa">Baixa</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase mb-0.5">Setor / Doca</label>
                <input
                  type="text"
                  value={manualForm.setor}
                  onChange={e => setManualForm({ ...manualForm, setor: e.target.value })}
                  className={`w-full p-2 rounded-lg border ${isDark ? 'bg-[#0b1222] border-slate-700' : 'bg-slate-50 border-slate-300'}`}
                  required
                />
              </div>

              <div className="col-span-2">
                <label className="block text-[10px] text-slate-400 uppercase mb-0.5">Desvio ou Oportunidade</label>
                <input
                  type="text"
                  value={manualForm.desvioEncontrado}
                  onChange={e => setManualForm({ ...manualForm, desvioEncontrado: e.target.value })}
                  className={`w-full p-2 rounded-lg border ${isDark ? 'bg-[#0b1222] border-slate-700' : 'bg-slate-50 border-slate-300'}`}
                  required
                />
              </div>

              <div className="col-span-2">
                <label className="block text-[10px] text-slate-400 uppercase mb-0.5">Contramedida Requerida</label>
                <input
                  type="text"
                  value={manualForm.contramedida}
                  onChange={e => setManualForm({ ...manualForm, contramedida: e.target.value })}
                  className={`w-full p-2 rounded-lg border ${isDark ? 'bg-[#0b1222] border-slate-700' : 'bg-slate-50 border-slate-300'}`}
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-700">
              <button
                type="button"
                onClick={() => setIsCreatingManual(false)}
                className="px-4 py-2 bg-slate-700 text-slate-200 rounded-xl text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-md"
              >
                Criar Ação
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ExecutiveActionBoard;
