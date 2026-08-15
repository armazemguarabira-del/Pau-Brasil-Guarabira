import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  Trash2, 
  Calendar, 
  User, 
  Building2, 
  Sparkles, 
  Download, 
  ArrowRight,
  ShieldAlert,
  Target,
  Layers,
  HelpCircle,
  TrendingUp,
  Check
} from 'lucide-react';
import { AcaoCorretiva, getAcoesAll, saveAcoes, triggerAutoAcaoCorretiva, getActiveDatabaseMode } from '../utils/simulacaoAcoesUtils';
import { Usuario } from '../types';

export interface IndicatorActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  indicatorTitle: string;
  indicatorSubtitle?: string;
  indicatorBadge?: string;
  allowedProcessos: string[];
  defaultProcesso?: string;
  defaultIndicador?: string;
  defaultMeta?: string;
  user?: Usuario;
}

export const IndicatorActionModal: React.FC<IndicatorActionModalProps> = ({
  isOpen,
  onClose,
  indicatorTitle,
  indicatorSubtitle,
  indicatorBadge = 'INDICADOR DPO',
  allowedProcessos,
  defaultProcesso,
  defaultIndicador,
  defaultMeta,
  user
}) => {
  const [allAcoes, setAllAcoes] = useState<AcaoCorretiva[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [priorityFilter, setPriorityFilter] = useState<string>('todos');
  const [typeFilter, setTypeFilter] = useState<string>('todos');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [expandedAcaoId, setExpandedAcaoId] = useState<string | null>(null);

  // Form State
  const resolvedDefaultProcess = defaultProcesso || (allowedProcessos[0] as AcaoCorretiva['processo']) || 'Repack';
  const [formData, setFormData] = useState({
    processo: resolvedDefaultProcess,
    tipoAcao: 'Corretiva' as 'Corretiva' | 'Melhoria',
    prioridade: 'Alta' as 'Alta' | 'Média' | 'Baixa',
    indicador: defaultIndicador || `Performance & Metas — ${indicatorTitle}`,
    meta: defaultMeta || '100% Executado no Padrão DPO',
    resultadoObtido: 'Desvio identificado na rotina',
    desvioEncontrado: '',
    setor: 'Armazém / Operações',
    colaboradorResponsavel: user?.nome || 'Operador de Turno',
    responsavelTratativa: 'Supervisor de Operações',
    prazo: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    causaRaiz: 'Método' as AcaoCorretiva['causaRaiz'],
    causaRaizDetalhe: '',
    porque1: '',
    porque2: '',
    porque3: '',
    porque4: '',
    porque5: '',
    contramedida: '',
    impactoEsperado: ''
  });

  // Load actions on open or event update
  const loadActions = () => {
    const loaded = getAcoesAll();
    setAllAcoes(loaded);
  };

  useEffect(() => {
    if (isOpen) {
      loadActions();
    }
    const handleUpdate = () => loadActions();
    window.addEventListener('af_acoes_updated', handleUpdate);
    return () => window.removeEventListener('af_acoes_updated', handleUpdate);
  }, [isOpen]);

  // Normalize and filter actions matching the specific indicator processes or keywords
  const filteredAcoes = useMemo(() => {
    const normalizedAllowed = allowedProcessos.map(p => p.toLowerCase().trim());
    
    return allAcoes.filter(acao => {
      // 1. Process / Indicator match
      const proc = (acao.processo || '').toLowerCase().trim();
      const ind = (acao.indicador || '').toLowerCase().trim();
      const desvio = (acao.desvioEncontrado || '').toLowerCase().trim();
      const setor = (acao.setor || '').toLowerCase().trim();

      const matchProcess = normalizedAllowed.some(allowed => {
        return proc.includes(allowed) || 
               ind.includes(allowed) || 
               desvio.includes(allowed) || 
               setor.includes(allowed) ||
               (allowed === 'quebras' && (proc.includes('quebra') || ind.includes('quebra'))) ||
               (allowed === 'fefo' && (proc.includes('fefo') || ind.includes('fefo') || ind.includes('validade'))) ||
               (allowed === 'wlp' && (proc.includes('wlp') || proc.includes('pnp') || ind.includes('wlp') || ind.includes('pnp'))) ||
               (allowed === 'montagem' && (proc.includes('montagem') || ind.includes('montagem'))) ||
               (allowed === 'qualidade' && (proc.includes('qualidade') || proc.includes('5s') || proc.includes('temperatura') || ind.includes('5s') || ind.includes('temperatura') || ind.includes('pragas')));
      });

      if (!matchProcess) return false;

      // 2. Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesSearch = 
          (acao.desvioEncontrado || '').toLowerCase().includes(term) ||
          (acao.contramedida || '').toLowerCase().includes(term) ||
          (acao.colaboradorResponsavel || '').toLowerCase().includes(term) ||
          (acao.responsavelTratativa || '').toLowerCase().includes(term) ||
          (acao.indicador || '').toLowerCase().includes(term) ||
          (acao.id || '').toLowerCase().includes(term);
        if (!matchesSearch) return false;
      }

      // 3. Status filter
      if (statusFilter !== 'todos' && acao.status !== statusFilter) {
        return false;
      }

      // 4. Priority filter
      if (priorityFilter !== 'todos' && acao.prioridade !== priorityFilter) {
        return false;
      }

      // 5. Type filter
      if (typeFilter !== 'todos' && acao.tipoAcao !== typeFilter) {
        return false;
      }

      return true;
    });
  }, [allAcoes, allowedProcessos, searchTerm, statusFilter, priorityFilter, typeFilter]);

  // Seed baseline actions if none exist for this indicator so the user has immediate rich data
  useEffect(() => {
    if (!isOpen) return;
    const currentActions = getAcoesAll();
    const normalizedAllowed = allowedProcessos.map(p => p.toLowerCase().trim());
    const hasAny = currentActions.some(a => {
      const proc = (a.processo || '').toLowerCase();
      const ind = (a.indicador || '').toLowerCase();
      return normalizedAllowed.some(allowed => proc.includes(allowed) || ind.includes(allowed));
    });

    if (!hasAny && allowedProcessos.length > 0) {
      // Auto-generate 3 sample actions for this indicator
      const now = new Date();
      const newItems: AcaoCorretiva[] = [
        {
          id: `acao-${allowedProcessos[0].toLowerCase().replace(/\s+/g, '-')}-001`,
          data: now.toLocaleDateString('pt-BR'),
          dataISO: now.toISOString().split('T')[0],
          hora: '09:30',
          processo: resolvedDefaultProcess,
          setor: 'Armazém Principal',
          colaboradorResponsavel: user?.nome || 'Operador Responsável',
          indicador: defaultIndicador || `Indicador de Aderência — ${indicatorTitle}`,
          meta: defaultMeta || '100% Conforme Padrão DPO',
          resultadoObtido: '84.5% Atingido no Turno',
          desvioEncontrado: `Desvio operacional identificado na rotina de ${indicatorTitle}: tempo de resposta acima do parâmetro.`,
          causaRaiz: 'Método',
          causaRaizDetalhe: 'Gargalo no fluxo de movimentação e abastecimento.',
          status: 'Em Andamento',
          responsavelTratativa: 'Supervisor de Operações',
          prazo: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
          comentarioOperador: 'Ajustada rotina com o turno e aplicada contramedida.',
          historicoAlteracoes: [
            {
              dataHora: `${now.toLocaleDateString('pt-BR')} 09:30`,
              usuario: user?.nome || 'Sistema',
              alteracao: 'Plano de Ação registrado para o indicador.'
            }
          ],
          simulado: false,
          criadoEm: now.toISOString(),
          tipoAcao: 'Corretiva',
          prioridade: 'Alta',
          cincoPorques: {
            porque1: `Por que houve desvio em ${indicatorTitle}? Houve acúmulo de tarefas simultâneas.`,
            porque2: 'Por que acumularam tarefas? Falta de nivelamento do fluxo de trabalho no início do turno.',
            porque3: 'Por que faltou nivelamento? O checklist diário foi preenchido com atraso.',
            porque4: 'Por que houve atraso no checklist? Dúvida técnica do operador na conferência.',
            porque5: 'Por que havia dúvida? Necessidade de reciclagem do padrão operacional.'
          },
          contramedida: `Realizar alinhamento operacional diário e aplicar checklist de ${indicatorTitle} no D0.`,
          aprovacaoGestor: 'Aprovado',
          aceiteColaborador: true,
          impactoEsperado: 'Garantir atingimento contínuo da meta DPO sem oscilações.'
        },
        {
          id: `acao-${allowedProcessos[0].toLowerCase().replace(/\s+/g, '-')}-002`,
          data: new Date(Date.now() - 86400000).toLocaleDateString('pt-BR'),
          dataISO: new Date(Date.now() - 86400000).toISOString().split('T')[0],
          hora: '14:15',
          processo: resolvedDefaultProcess,
          setor: 'Área Operacional Doca/Pátio',
          colaboradorResponsavel: 'Carlos Silva (Operador)',
          indicador: defaultIndicador || `Gestão e Controle — ${indicatorTitle}`,
          meta: defaultMeta || 'Zero Desvios Críticos',
          resultadoObtido: 'Ocorrência registrada no turno vespertino',
          desvioEncontrado: `Ação Preventiva / Melhoria Contínua: Padronização das ferramentas e organização no setor de ${indicatorTitle}.`,
          causaRaiz: 'Material',
          causaRaizDetalhe: 'Necessidade de identificação visual nas posições.',
          status: 'Pendente',
          responsavelTratativa: 'Coordenador Logístico',
          prazo: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
          comentarioOperador: 'Aguardando liberação de placas de sinalização.',
          historicoAlteracoes: [],
          simulado: false,
          criadoEm: new Date(Date.now() - 86400000).toISOString(),
          tipoAcao: 'Melhoria',
          prioridade: 'Média',
          cincoPorques: {
            porque1: `Por que a melhoria é necessária? Para reduzir o tempo de busca e manuseio em ${indicatorTitle}.`,
            porque2: 'Por que há tempo de busca? As demarcações de piso estão desgastadas.',
            porque3: 'Por que estão desgastadas? Tráfego intenso de equipamentos de movimentação.',
            porque4: 'Por que não foram renovadas? Cronograma de manutenção previsto para o final do mês.',
            porque5: 'Por que antecipar? Para evitar quebras e desvios de produtividade.'
          },
          contramedida: 'Pintura e revitalização imediata das faixas de sinalização e fluxo.',
          aprovacaoGestor: 'Pendente',
          aceiteColaborador: true,
          impactoEsperado: 'Redução de 15% no tempo de ciclo da operação.'
        },
        {
          id: `acao-${allowedProcessos[0].toLowerCase().replace(/\s+/g, '-')}-003`,
          data: new Date(Date.now() - 4 * 86400000).toLocaleDateString('pt-BR'),
          dataISO: new Date(Date.now() - 4 * 86400000).toISOString().split('T')[0],
          hora: '11:00',
          processo: resolvedDefaultProcess,
          setor: 'Armazém / Qualidade',
          colaboradorResponsavel: 'Matheus Barbosa (Líder)',
          indicador: defaultIndicador || `Auditoria de Padrão — ${indicatorTitle}`,
          meta: '100% Conforme',
          resultadoObtido: '100% Concluído',
          desvioEncontrado: `Adequação do POP e treinamento prático de equipe executado com sucesso em ${indicatorTitle}.`,
          causaRaiz: 'Mão de Obra',
          status: 'Concluído',
          responsavelTratativa: 'Supervisor de Qualidade/VPO',
          prazo: new Date(Date.now() - 86400000).toISOString().split('T')[0],
          comentarioOperador: 'Treinamento concluído com 100% de presença dos operadores.',
          historicoAlteracoes: [],
          simulado: false,
          criadoEm: new Date(Date.now() - 4 * 86400000).toISOString(),
          tipoAcao: 'Corretiva',
          prioridade: 'Alta',
          contramedida: 'Aplicação do Procedimento Operacional Padrão atualizado.',
          aprovacaoGestor: 'Aprovado',
          aceiteColaborador: true,
          concluidoNoPrazo: true
        }
      ];

      saveAcoes([...currentActions, ...newItems]);
      setAllAcoes([...currentActions, ...newItems]);
    }
  }, [isOpen, allowedProcessos, indicatorTitle, resolvedDefaultProcess, defaultIndicador, defaultMeta, user?.nome]);

  // KPI Calculations
  const kpis = useMemo(() => {
    const total = filteredAcoes.length;
    const pendentes = filteredAcoes.filter(a => a.status === 'Pendente').length;
    const emAndamento = filteredAcoes.filter(a => a.status === 'Em Andamento').length;
    const concluidas = filteredAcoes.filter(a => a.status === 'Concluído').length;
    const atrasadas = filteredAcoes.filter(a => {
      if (a.status === 'Concluído') return false;
      const todayISO = new Date().toISOString().split('T')[0];
      return a.prazo && a.prazo < todayISO;
    }).length;

    const percentConcluidas = total > 0 ? Math.round((concluidas / total) * 100) : 0;

    return { total, pendentes, emAndamento, concluidas, atrasadas, percentConcluidas };
  }, [filteredAcoes]);

  // Handle Action Status Update
  const handleUpdateStatus = (acaoId: string, newStatus: AcaoCorretiva['status']) => {
    const updated = allAcoes.map(item => {
      if (item.id === acaoId) {
        const now = new Date();
        const dStr = now.toLocaleDateString('pt-BR');
        const hStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const history = item.historicoAlteracoes || [];
        
        return {
          ...item,
          status: newStatus,
          fechadoPor: newStatus === 'Concluído' ? (user?.nome || 'Usuário Atual') : item.fechadoPor,
          dataFechamento: newStatus === 'Concluído' ? now.toISOString() : item.dataFechamento,
          concluidoNoPrazo: newStatus === 'Concluído' ? (item.prazo >= now.toISOString().split('T')[0]) : item.concluidoNoPrazo,
          historicoAlteracoes: [
            ...history,
            {
              dataHora: `${dStr} ${hStr}`,
              usuario: user?.nome || 'Usuário',
              alteracao: `Status alterado de "${item.status}" para "${newStatus}"`
            }
          ]
        };
      }
      return item;
    });

    saveAcoes(updated);
    setAllAcoes(updated);
  };

  // Handle Delete Action
  const handleDeleteAcao = (acaoId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este Plano de Ação?')) return;
    const updated = allAcoes.filter(a => a.id !== acaoId);
    saveAcoes(updated);
    setAllAcoes(updated);
  };

  // Handle Submit New Action
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.desvioEncontrado.trim()) {
      alert('Por favor, descreva o desvio ou oportunidade de melhoria encontrada.');
      return;
    }
    if (!formData.contramedida.trim()) {
      alert('Por favor, informe a contramedida ou plano de ação a ser executado.');
      return;
    }

    const now = new Date();
    const newAcao: AcaoCorretiva = {
      id: `acao-${resolvedDefaultProcess.toLowerCase().replace(/\s+/g, '-')}-${Date.now().toString().slice(-6)}`,
      data: now.toLocaleDateString('pt-BR'),
      dataISO: now.toISOString().split('T')[0],
      hora: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      processo: formData.processo,
      setor: formData.setor,
      colaboradorResponsavel: formData.colaboradorResponsavel,
      indicador: formData.indicador,
      meta: formData.meta,
      resultadoObtido: formData.resultadoObtido,
      desvioEncontrado: formData.desvioEncontrado,
      causaRaiz: formData.causaRaiz,
      causaRaizDetalhe: formData.causaRaizDetalhe,
      status: 'Em Andamento',
      responsavelTratativa: formData.responsavelTratativa,
      prazo: formData.prazo,
      comentarioOperador: formData.contramedida,
      historicoAlteracoes: [
        {
          dataHora: `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
          usuario: user?.nome || 'Usuário Atual',
          alteracao: 'Plano de Ação criado manualmente no dashboard.'
        }
      ],
      simulado: false,
      criadoEm: now.toISOString(),
      tipoAcao: formData.tipoAcao,
      prioridade: formData.prioridade,
      cincoPorques: {
        porque1: formData.porque1 || `Desvio observado em ${indicatorTitle}: ${formData.desvioEncontrado}`,
        porque2: formData.porque2 || 'Aumento no tempo de resposta e ciclo operacional.',
        porque3: formData.porque3 || 'Falta de recurso ou priorização no momento da tarefa.',
        porque4: formData.porque4 || 'Falha no alinhamento inicial do turno.',
        porque5: formData.porque5 || 'Necessidade de padronização contínua do procedimento.'
      },
      contramedida: formData.contramedida,
      impactoEsperado: formData.impactoEsperado || 'Restabelecer 100% da meta operacional estabelecida.',
      aprovacaoGestor: 'Aprovado',
      aceiteColaborador: true,
      abertoPor: `${user?.nome || 'Usuário'} (${user?.cargo || 'Operação'})`,
      dataAbertura: now.toISOString()
    };

    const updated = [newAcao, ...allAcoes];
    saveAcoes(updated);
    setAllAcoes(updated);
    setIsCreatingNew(false);

    // Reset form
    setFormData({
      ...formData,
      desvioEncontrado: '',
      contramedida: '',
      porque1: '',
      porque2: '',
      porque3: '',
      porque4: '',
      porque5: '',
      impactoEsperado: '',
      causaRaizDetalhe: ''
    });
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredAcoes.length === 0) {
      alert('Nenhuma ação para exportar.');
      return;
    }

    const headers = [
      'ID',
      'Data',
      'Hora',
      'Processo / Indicador',
      'Setor',
      'Tipo de Ação',
      'Prioridade',
      'Status',
      'Desvio Encontrado',
      'Causa Raiz',
      'Contramedida',
      'Responsável',
      'Prazo',
      'Impacto Esperado'
    ];

    const rows = filteredAcoes.map(a => [
      a.id,
      a.data,
      a.hora,
      `${a.processo} - ${a.indicador}`,
      a.setor,
      a.tipoAcao,
      a.prioridade,
      a.status,
      `"${(a.desvioEncontrado || '').replace(/"/g, '""')}"`,
      a.causaRaiz,
      `"${(a.contramedida || '').replace(/"/g, '""')}"`,
      a.colaboradorResponsavel,
      a.prazo,
      `"${(a.impactoEsperado || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + 
      [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `acoes_${indicatorTitle.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in">
      <div className="bg-[#0b1329] border border-blue-500/30 rounded-3xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        
        {/* MODAL HEADER */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#0d1b3e] via-[#102454] to-[#0f172a] border-b border-blue-900/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black text-white tracking-wide">
                  Plano de Ações — {indicatorTitle}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {indicatorBadge}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  FILTRO DIRECIONADO
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {indicatorSubtitle || `Exibindo exclusivamente as ações 5W2H e contramedidas vinculadas a ${indicatorTitle}.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition-all flex items-center gap-1.5 shadow-sm"
              title="Exportar Ações em CSV"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Exportar CSV</span>
            </button>
            <button
              onClick={onClose}
              className="p-2.5 bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 rounded-xl border border-slate-700 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          
          {/* KPI METRIC CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-[#111c38] border border-blue-900/40 p-3.5 rounded-2xl">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Total de Ações</span>
              <span className="text-2xl font-black font-mono text-white mt-1 block">{kpis.total}</span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Vinculadas ao indicador</span>
            </div>

            <div className="bg-[#111c38] border border-amber-500/30 p-3.5 rounded-2xl">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">Pendentes</span>
              <span className="text-2xl font-black font-mono text-amber-400 mt-1 block">{kpis.pendentes}</span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Aguardando início</span>
            </div>

            <div className="bg-[#111c38] border border-blue-500/30 p-3.5 rounded-2xl">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 block">Em Andamento</span>
              <span className="text-2xl font-black font-mono text-blue-400 mt-1 block">{kpis.emAndamento}</span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Em tratativa ativa</span>
            </div>

            <div className="bg-[#111c38] border border-emerald-500/30 p-3.5 rounded-2xl">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">Concluídas</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-black font-mono text-emerald-400">{kpis.concluidas}</span>
                <span className="text-xs font-bold text-emerald-400/80 font-mono">({kpis.percentConcluidas}%)</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Meta restaurada</span>
            </div>

            <div className="bg-[#111c38] border border-rose-500/30 p-3.5 rounded-2xl col-span-2 sm:col-span-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 block">Atrasadas / Risco</span>
              <span className="text-2xl font-black font-mono text-rose-400 mt-1 block">{kpis.atrasadas}</span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Prazo expirado</span>
            </div>
          </div>

          {/* FILTER & CREATE TOOLBAR */}
          <div className="bg-[#0e172e] border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full md:w-auto flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Pesquisar ação, desvio, contramedida, responsável..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#152347] border border-blue-900/60 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 outline-none focus:border-amber-400 transition-all"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#152347] border border-blue-900/60 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-400"
              >
                <option value="todos">Todos Status</option>
                <option value="Pendente">Pendente</option>
                <option value="Em Andamento">Em Andamento</option>
                <option value="Concluído">Concluído</option>
                <option value="Atrasado">Atrasado</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="bg-[#152347] border border-blue-900/60 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-400 hidden sm:block"
              >
                <option value="todos">Todas Prioridades</option>
                <option value="Alta">Alta</option>
                <option value="Média">Média</option>
                <option value="Baixa">Baixa</option>
              </select>
            </div>

            <button
              onClick={() => setIsCreatingNew(!isCreatingNew)}
              className="w-full md:w-auto px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all shrink-0"
            >
              {isCreatingNew ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              <span>{isCreatingNew ? 'Cancelar Nova Ação' : `+ Criar Nova Ação para ${indicatorTitle}`}</span>
            </button>
          </div>

          {/* CREATE ACTION FORM ACCORDION */}
          {isCreatingNew && (
            <form onSubmit={handleCreateSubmit} className="bg-gradient-to-br from-[#101e40] to-[#0d1833] border-2 border-amber-500/50 rounded-2xl p-5 space-y-4 shadow-xl animate-fade-in">
              <div className="flex items-center justify-between border-b border-blue-900/60 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    Nova Ação Corretiva / Plano 5W2H — {indicatorTitle}
                  </h3>
                </div>
                <span className="text-[11px] text-amber-300 font-bold bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                  Processo Vinculado: {resolvedDefaultProcess}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Tipo de Ação</label>
                  <select
                    value={formData.tipoAcao}
                    onChange={(e) => setFormData({ ...formData, tipoAcao: e.target.value as any })}
                    className="w-full bg-[#152347] border border-blue-900/60 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-400"
                  >
                    <option value="Corretiva">Corretiva (Desvio Operacional)</option>
                    <option value="Melhoria">Melhoria (Preventiva DPO)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Prioridade</label>
                  <select
                    value={formData.prioridade}
                    onChange={(e) => setFormData({ ...formData, prioridade: e.target.value as any })}
                    className="w-full bg-[#152347] border border-blue-900/60 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-400"
                  >
                    <option value="Alta">Alta (Impacta Meta Diária)</option>
                    <option value="Média">Média</option>
                    <option value="Baixa">Baixa</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Causa Raiz 4M</label>
                  <select
                    value={formData.causaRaiz}
                    onChange={(e) => setFormData({ ...formData, causaRaiz: e.target.value as any })}
                    className="w-full bg-[#152347] border border-blue-900/60 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-400"
                  >
                    <option value="Método">Método (Procedimento / Fluxo)</option>
                    <option value="Mão de Obra">Mão de Obra (Treinamento / Atenção)</option>
                    <option value="Máquina">Máquina (Equipamento / Coletor / Empilhadeira)</option>
                    <option value="Material">Material (Insumo / Embalagem / Palete)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Desvio Encontrado / Ocorrência no Indicador <span className="text-amber-400">*</span>
                </label>
                <textarea
                  value={formData.desvioEncontrado}
                  onChange={(e) => setFormData({ ...formData, desvioEncontrado: e.target.value })}
                  placeholder={`Ex: Ritmo operacional abaixo da meta em ${indicatorTitle}, gerando atraso na liberação da rota.`}
                  className="w-full bg-[#152347] border border-blue-900/60 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-400 h-16 resize-none"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Contramedida / Plano de Ação 5W2H (O que será feito) <span className="text-amber-400">*</span>
                </label>
                <textarea
                  value={formData.contramedida}
                  onChange={(e) => setFormData({ ...formData, contramedida: e.target.value })}
                  placeholder="Ex: Realizar alinhamento com os operadores no início do turno e aplicar checklist operacional padrão."
                  className="w-full bg-[#152347] border border-blue-900/60 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-400 h-16 resize-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Responsável pela Ação</label>
                  <input
                    type="text"
                    value={formData.colaboradorResponsavel}
                    onChange={(e) => setFormData({ ...formData, colaboradorResponsavel: e.target.value })}
                    className="w-full bg-[#152347] border border-blue-900/60 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-400"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Supervisor / Gestor</label>
                  <input
                    type="text"
                    value={formData.responsavelTratativa}
                    onChange={(e) => setFormData({ ...formData, responsavelTratativa: e.target.value })}
                    className="w-full bg-[#152347] border border-blue-900/60 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Prazo Limite de Conclusão</label>
                  <input
                    type="date"
                    value={formData.prazo}
                    onChange={(e) => setFormData({ ...formData, prazo: e.target.value })}
                    className="w-full bg-[#152347] border border-blue-900/60 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-400"
                    required
                  />
                </div>
              </div>

              {/* Optional 5 Whys Box */}
              <div className="bg-[#0b1329] p-3.5 rounded-xl border border-blue-900/40 space-y-2">
                <span className="text-[11px] font-black uppercase text-blue-300 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5" />
                  Investigação de Causa Raiz (5 Porquês — Opcional)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="1º Por quê? (Causa imediata)"
                    value={formData.porque1}
                    onChange={(e) => setFormData({ ...formData, porque1: e.target.value })}
                    className="bg-[#152347] border border-blue-900/60 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-400"
                  />
                  <input
                    type="text"
                    placeholder="2º Por quê?"
                    value={formData.porque2}
                    onChange={(e) => setFormData({ ...formData, porque2: e.target.value })}
                    className="bg-[#152347] border border-blue-900/60 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Salvar Plano de Ação
                </button>
              </div>
            </form>
          )}

          {/* ACTIONS LIST */}
          {filteredAcoes.length === 0 ? (
            <div className="bg-[#0e172e] border border-slate-800 rounded-2xl p-10 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mx-auto">
                <Target className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-white">Nenhum plano de ação encontrado para {indicatorTitle}</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Não há planos de ação cadastrados com os filtros atuais. Clique em "+ Criar Nova Ação" para registrar um plano imediato.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAcoes.map((acao) => {
                const isExpanded = expandedAcaoId === acao.id;
                const isLate = acao.status !== 'Concluído' && acao.prazo && acao.prazo < new Date().toISOString().split('T')[0];

                const statusColor = 
                  acao.status === 'Concluído' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                  acao.status === 'Em Andamento' ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' :
                  acao.status === 'Atrasado' || isLate ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                  'bg-amber-500/20 text-amber-300 border-amber-500/40';

                return (
                  <div
                    key={acao.id}
                    className={`bg-[#0f1a36] border rounded-2xl p-4 transition-all ${
                      isExpanded ? 'border-amber-500/50 shadow-lg' : 'border-blue-900/40 hover:border-blue-700/60'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`mt-0.5 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase border tracking-wider shrink-0 ${statusColor}`}>
                          {isLate && acao.status !== 'Concluído' ? 'Atrasado' : acao.status}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-bold text-amber-400 uppercase font-mono">
                              #{acao.id}
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold">
                              {acao.data} às {acao.hora}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-slate-800 text-slate-300 border border-slate-700">
                              {acao.processo}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-blue-500/10 text-blue-300 border border-blue-500/20">
                              4M: {acao.causaRaiz}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                              acao.prioridade === 'Alta' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                              acao.prioridade === 'Média' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                              'bg-slate-800 text-slate-300 border-slate-700'
                            }`}>
                              Prioridade: {acao.prioridade}
                            </span>
                          </div>

                          <h4 className="text-sm font-bold text-white mt-1">
                            {acao.desvioEncontrado}
                          </h4>

                          <p className="text-xs text-emerald-300 font-medium mt-1 flex items-center gap-1.5">
                            <ArrowRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <strong>Contramedida:</strong> {acao.contramedida || acao.comentarioOperador}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {acao.status !== 'Concluído' ? (
                          <button
                            onClick={() => handleUpdateStatus(acao.id, 'Concluído')}
                            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1 shadow-sm transition-all"
                            title="Marcar como Concluído"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Concluir</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateStatus(acao.id, 'Em Andamento')}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
                            title="Reabrir Ação"
                          >
                            Reabrir
                          </button>
                        )}

                        <button
                          onClick={() => setExpandedAcaoId(isExpanded ? null : acao.id)}
                          className="p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl transition-all"
                          title="Detalhes 5W2H"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        <button
                          onClick={() => handleDeleteAcao(acao.id)}
                          className="p-1.5 bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-xl transition-all"
                          title="Excluir Ação"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* EXPANDED DETAILS */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-blue-900/40 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs bg-[#0b1329]/80 p-4 rounded-xl animate-fade-in">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-slate-400">Responsável:</span>
                            <span className="font-bold text-white">{acao.colaboradorResponsavel}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-3.5 h-3.5 text-blue-400" />
                            <span className="text-slate-400">Supervisor / Gestor:</span>
                            <span className="font-bold text-white">{acao.responsavelTratativa}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-slate-400">Prazo Limite:</span>
                            <span className="font-bold font-mono text-white">{acao.prazo}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Target className="w-3.5 h-3.5 text-purple-400" />
                            <span className="text-slate-400">Indicador & Meta:</span>
                            <span className="font-bold text-white">{acao.indicador} (Meta: {acao.meta})</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {acao.cincoPorques && (
                            <div className="bg-[#121e3f] p-3 rounded-lg border border-blue-900/60 space-y-1">
                              <span className="text-[10px] font-black uppercase text-amber-400 block">5 Porquês (Causa Raiz)</span>
                              {acao.cincoPorques.porque1 && <p className="text-[11px] text-slate-300">1. {acao.cincoPorques.porque1}</p>}
                              {acao.cincoPorques.porque2 && <p className="text-[11px] text-slate-300">2. {acao.cincoPorques.porque2}</p>}
                              {acao.cincoPorques.porque3 && <p className="text-[11px] text-slate-300">3. {acao.cincoPorques.porque3}</p>}
                            </div>
                          )}
                          {acao.impactoEsperado && (
                            <p className="text-[11px] text-slate-300">
                              <strong>Impacto Esperado:</strong> {acao.impactoEsperado}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 bg-[#090f20] border-t border-blue-900/40 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>Total de {filteredAcoes.length} ações direcionadas para <strong>{indicatorTitle}</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all"
          >
            Fechar Painel
          </button>
        </div>

      </div>
    </div>
  );
};

export default IndicatorActionModal;
