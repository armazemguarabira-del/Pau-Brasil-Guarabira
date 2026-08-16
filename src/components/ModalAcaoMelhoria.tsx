import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Sparkles, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  Filter, 
  Search, 
  Plus, 
  Download, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  User, 
  Calendar, 
  FileText,
  Layers,
  Award,
  ArrowRight,
  Sliders,
  Target
} from 'lucide-react';
import { Usuario } from '../types';
import { LISTA_COLABORADORES_OFICIAIS } from './RankingModule';
import { 
  AcaoMelhoriaItem, 
  getAcoesMelhoriasLocal, 
  salvarAcaoMelhoria, 
  excluirAcaoMelhoria, 
  fetchAcoesMelhorias 
} from '../utils/desviosEMelhoriasService';

export interface ModalAcaoMelhoriaProps {
  isOpen: boolean;
  onClose: () => void;
  user?: Usuario | null;
  initialData?: Partial<AcaoMelhoriaItem>;
}

const RITUAIS_TOR: AcaoMelhoriaItem['reuniaoTOR'][] = [
  'Reunião Diária de Operação (RDP)',
  'Reunião Semanal de Indicadores (RPS)',
  'Comitê de Qualidade / DPO',
  'Reunião Mensal de Resultados (RMR)',
  'Workshop Kaizen / Ideia de Melhoria',
  'Auditoria & 5S'
];

const PILARES_DPO: AcaoMelhoriaItem['pilarDPO'][] = [
  'Armazém',
  'Qualidade',
  'Produtividade',
  'Segurança',
  'Manutenção',
  'Gestão de Estoque',
  'Gente & Gestão'
];

const PROCESSOS_LIST = [
  'Picking',
  'Repack',
  'Despejo',
  'EFC / EFD',
  'TMR (Carretas & Recargas)',
  'Gestão FEFO (Validades)',
  'Quebras & Avarias',
  'Ressuprimento & Armazenagem',
  'Gestão de Capacidade',
  'Auditoria & 5S',
  'Gestão de Ativos & Paletes'
];

export const ModalAcaoMelhoria: React.FC<ModalAcaoMelhoriaProps> = ({
  isOpen,
  onClose,
  user,
  initialData
}) => {
  const [activeTab, setActiveTab] = useState<'novo' | 'historico'>('novo');
  const [acoesList, setAcoesList] = useState<AcaoMelhoriaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRitual, setFilterRitual] = useState<string>('todos');
  const [filterPilar, setFilterPilar] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Form State
  const [reuniaoTOR, setReuniaoTOR] = useState<AcaoMelhoriaItem['reuniaoTOR']>('Reunião Diária de Operação (RDP)');
  const [pilarDPO, setPilarDPO] = useState<AcaoMelhoriaItem['pilarDPO']>('Produtividade');
  const [processo, setProcesso] = useState<string>('Picking');
  const [setor, setSetor] = useState<string>('Corredor de Picking');
  const [dataProximoAcompanhamento, setDataProximoAcompanhamento] = useState<string>(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  
  // Oportunidade e Metas
  const [tituloMelhoria, setTituloMelhoria] = useState<string>('');
  const [oportunidadeIdentificada, setOportunidadeIdentificada] = useState<string>('');
  const [indicadorBeneficiado, setIndicadorBeneficiado] = useState<string>('Produtividade de Picking (CX/HH)');
  const [metaMelhoria, setMetaMelhoria] = useState<string>('Aumento de +15% na taxa de separação');
  const [ganhoEsperado, setGanhoEsperado] = useState<string>('');

  // 5W2H
  const [oQueSeraFeito, setOQueSeraFeito] = useState<string>('');
  const [responsavelPrincipal, setResponsavelPrincipal] = useState<string>('');
  const [prazoImplantacao, setPrazoImplantacao] = useState<string>(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [comoSeraFeito, setComoSeraFeito] = useState<string>('');
  const [recursosNecessarios, setRecursosNecessarios] = useState<string>('');
  
  // Status e Evolução TOR
  const [statusTOR, setStatusTOR] = useState<AcaoMelhoriaItem['statusTOR']>('Planejada');
  const [percentualConcluido, setPercentualConcluido] = useState<number>(20);
  const [feedbackGestao, setFeedbackGestao] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadData();
      if (initialData) {
        if (initialData.reuniaoTOR) setReuniaoTOR(initialData.reuniaoTOR);
        if (initialData.pilarDPO) setPilarDPO(initialData.pilarDPO);
        if (initialData.processo) setProcesso(initialData.processo);
        if (initialData.setor) setSetor(initialData.setor);
        if (initialData.tituloMelhoria) setTituloMelhoria(initialData.tituloMelhoria);
        if (initialData.oportunidadeIdentificada) setOportunidadeIdentificada(initialData.oportunidadeIdentificada);
        if (initialData.indicadorBeneficiado) setIndicadorBeneficiado(initialData.indicadorBeneficiado);
        if (initialData.metaMelhoria) setMetaMelhoria(initialData.metaMelhoria);
        if (initialData.ganhoEsperado) setGanhoEsperado(initialData.ganhoEsperado);
        if (initialData.responsavelPrincipal) setResponsavelPrincipal(initialData.responsavelPrincipal);
        setActiveTab('novo');
      }
    }
  }, [isOpen, initialData]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchAcoesMelhorias(user?.empresaId || 'demo');
      setAcoesList(data);
    } catch (e) {
      setAcoesList(getAcoesMelhoriasLocal());
    } finally {
      setLoading(false);
    }
  };

  const handleSalvarMelhoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tituloMelhoria.trim() || !oQueSeraFeito.trim() || !responsavelPrincipal.trim()) {
      alert('Por favor, informe o título da melhoria, a descrição do plano de ação e o responsável principal.');
      return;
    }

    const now = new Date();
    const dStr = now.toLocaleDateString('pt-BR');
    const dISO = now.toISOString().split('T')[0];
    const hStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const novoItem: AcaoMelhoriaItem = {
      id: `melhoria-tor-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      empresaId: user?.empresaId || 'demo',
      data: dStr,
      dataISO: dISO,
      hora: hStr,
      reuniaoTOR,
      pilarDPO,
      processo,
      setor: setor || 'Armazém Geral',
      dataProximoAcompanhamento,
      tituloMelhoria,
      oportunidadeIdentificada: oportunidadeIdentificada || tituloMelhoria,
      indicadorBeneficiado: indicadorBeneficiado || 'Produtividade / Qualidade Operacional',
      metaMelhoria: metaMelhoria || 'Ganho Contínuo',
      ganhoEsperado: ganhoEsperado || 'Otimização de tempo e recursos da rotina.',
      oQueSeraFeito,
      responsavelPrincipal,
      prazoImplantacao,
      comoSeraFeito: comoSeraFeito || 'Conforme alinhamento em reunião TOR.',
      recursosNecessarios: recursosNecessarios || undefined,
      statusTOR,
      percentualConcluido,
      feedbackGestao: feedbackGestao || `Acompanhado em pauta TOR por ${user?.nome || 'Gestão'}`,
      registradoPor: `${user?.nome || 'Colaborador'} (${user?.papel || 'Operação'})`,
      criadoEm: now.toISOString()
    };

    const saved = await salvarAcaoMelhoria(novoItem, user?.empresaId || 'demo');
    setAcoesList(prev => [saved, ...prev]);
    setSaveSuccessMsg('Ação de Melhoria TOR registrada e inserida na pauta de acompanhamento!');
    setTimeout(() => setSaveSuccessMsg(null), 3500);

    // Reset Form
    setTituloMelhoria('');
    setOportunidadeIdentificada('');
    setGanhoEsperado('');
    setOQueSeraFeito('');
    setComoSeraFeito('');
    setRecursosNecessarios('');
    setFeedbackGestao('');
    setActiveTab('historico');
  };

  const handleUpdateStatusTOR = async (item: AcaoMelhoriaItem, newStatus: AcaoMelhoriaItem['statusTOR']) => {
    const isDone = newStatus === 'Concluída' || newStatus === 'Padronizada no POP';
    const updated: AcaoMelhoriaItem = {
      ...item,
      statusTOR: newStatus,
      percentualConcluido: isDone ? 100 : item.percentualConcluido
    };

    const saved = await salvarAcaoMelhoria(updated, user?.empresaId || 'demo');
    setAcoesList(prev => prev.map(a => a.id === saved.id ? saved : a));
  };

  const handleUpdateProgress = async (item: AcaoMelhoriaItem, newPct: number) => {
    const updated: AcaoMelhoriaItem = {
      ...item,
      percentualConcluido: newPct,
      statusTOR: newPct === 100 ? 'Concluída' : newPct > 0 ? 'Em Execução' : 'Planejada'
    };

    const saved = await salvarAcaoMelhoria(updated, user?.empresaId || 'demo');
    setAcoesList(prev => prev.map(a => a.id === saved.id ? saved : a));
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja realmente excluir esta Ação de Melhoria?')) {
      await excluirAcaoMelhoria(id);
      setAcoesList(prev => prev.filter(a => a.id !== id));
    }
  };

  const handleExportCSV = () => {
    if (acoesList.length === 0) return;
    const headers = [
      'ID', 'Data', 'Reunião TOR', 'Pilar DPO', 'Processo', 'Setor', 
      'Título da Melhoria', 'Indicador Beneficiado', 'Meta de Melhoria', 
      'O que será feito', 'Responsável', 'Prazo Implantação', 'Status TOR', '% Concluído', 'Próx Acompanhamento'
    ];

    const rows = acoesList.map(item => [
      item.id,
      item.data,
      `"${item.reuniaoTOR}"`,
      item.pilarDPO,
      `"${item.processo}"`,
      `"${item.setor}"`,
      `"${item.tituloMelhoria.replace(/"/g, '""')}"`,
      `"${item.indicadorBeneficiado}"`,
      `"${item.metaMelhoria}"`,
      `"${item.oQueSeraFeito.replace(/"/g, '""')}"`,
      `"${item.responsavelPrincipal}"`,
      item.prazoImplantacao,
      item.statusTOR,
      `${item.percentualConcluido}%`,
      item.dataProximoAcompanhamento
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `Acoes_Melhoria_TOR_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtragem
  const filteredList = useMemo(() => {
    return acoesList.filter(item => {
      const matchSearch = 
        item.tituloMelhoria.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.oQueSeraFeito.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.responsavelPrincipal.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.processo.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchRitual = filterRitual === 'todos' || item.reuniaoTOR === filterRitual;
      const matchPilar = filterPilar === 'todos' || item.pilarDPO === filterPilar;
      const matchStatus = filterStatus === 'todos' || item.statusTOR === filterStatus;

      return matchSearch && matchRitual && matchPilar && matchStatus;
    });
  }, [acoesList, searchTerm, filterRitual, filterPilar, filterStatus]);

  // Estatísticas Rápidas
  const stats = useMemo(() => {
    const total = acoesList.length;
    const concluidas = acoesList.filter(a => a.statusTOR === 'Concluída' || a.statusTOR === 'Padronizada no POP').length;
    const emExecucao = acoesList.filter(a => a.statusTOR === 'Em Execução' || a.statusTOR === 'Em Teste Piloto').length;
    const avgProgresso = total > 0 ? Math.round(acoesList.reduce((acc, a) => acc + (a.percentualConcluido || 0), 0) / total) : 0;
    return { total, concluidas, emExecucao, avgProgresso };
  }, [acoesList]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header do Modal */}
        <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-blue-950/60 p-4 sm:p-5 border-b border-emerald-800/40 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-400">
              <Sparkles className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-black uppercase tracking-wider text-emerald-400">
                  DPO • Gestão de Melhoria Contínua & TOR
                </span>
                <span className="hidden sm:inline-block text-xs text-slate-400 font-mono">
                  Rituais TOR • Reuniões RDP / RPS / RMR • Kaizen
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-tight mt-0.5">
                Plano de Ações de Melhoria & Rotina TOR
              </h2>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Fechar Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas de Navegação */}
        <div className="bg-slate-950/70 px-4 pt-2 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('novo')}
              className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                activeTab === 'novo'
                  ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Registrar Ação de Melhoria (TOR)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('historico')}
              className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                activeTab === 'historico'
                  ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Acompanhamento de Pauta TOR ({acoesList.length})</span>
            </button>
          </div>

          {activeTab === 'historico' && (
            <div className="flex items-center gap-2 py-1">
              <button
                type="button"
                onClick={handleExportCSV}
                className="p-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
                title="Exportar Planilha CSV"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Exportar CSV</span>
              </button>
            </div>
          )}
        </div>

        {/* Notificação de Sucesso */}
        {saveSuccessMsg && (
          <div className="bg-emerald-950/80 border-b border-emerald-500/40 text-emerald-300 p-2.5 px-4 text-xs font-bold flex items-center justify-between animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{saveSuccessMsg}</span>
            </div>
          </div>
        )}

        {/* Conteúdo com Scroll */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'novo' ? (
            <form onSubmit={handleSalvarMelhoria} className="space-y-6">
              
              {/* BLOCO 1: RITUAL TOR & PILAR DPO */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-emerald-900/30 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-black text-xs uppercase tracking-wider">
                    <Calendar className="w-4 h-4" />
                    <span>1. Ritual de Reunião TOR & Pilar DPO Vinculado</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Governança TOR</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Ritual / Reunião TOR</label>
                    <select
                      value={reuniaoTOR}
                      onChange={(e) => setReuniaoTOR(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-emerald-500 focus:outline-none font-semibold"
                    >
                      {RITUAIS_TOR.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Pilar DPO</label>
                    <select
                      value={pilarDPO}
                      onChange={(e) => setPilarDPO(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-emerald-500 focus:outline-none font-semibold"
                    >
                      {PILARES_DPO.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Processo / Frente</label>
                    <select
                      value={processo}
                      onChange={(e) => setProcesso(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                    >
                      {PROCESSOS_LIST.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Data Próximo Acompanhamento TOR</label>
                    <input
                      type="date"
                      value={dataProximoAcompanhamento}
                      onChange={(e) => setDataProximoAcompanhamento(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* BLOCO 2: OPORTUNIDADE & OBJETIVO DA MELHORIA */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-blue-900/30 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2 text-blue-400 font-black text-xs uppercase tracking-wider">
                    <Target className="w-4 h-4" />
                    <span>2. Oportunidade Identificada & Objetivos</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Ganho de Performance</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Título Resumido da Ação de Melhoria <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={tituloMelhoria}
                    onChange={(e) => setTituloMelhoria(e.target.value)}
                    placeholder="Ex: Otimização de Layout de Picking por Curva ABC / Padronização de Bancada 5S..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:border-blue-500 focus:outline-none font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Oportunidade / Gap Identificado na Reunião
                  </label>
                  <textarea
                    rows={2}
                    value={oportunidadeIdentificada}
                    onChange={(e) => setOportunidadeIdentificada(e.target.value)}
                    placeholder="Descreva a oportunidade de ganho, desperdício observado ou melhoria ergonômica levantada na rotina..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Indicador Beneficiado (KPI)</label>
                    <input
                      type="text"
                      value={indicadorBeneficiado}
                      onChange={(e) => setIndicadorBeneficiado(e.target.value)}
                      placeholder="Ex: Caixas/Homem-Hora (Picking Rate)"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Meta Alvo de Melhoria</label>
                    <input
                      type="text"
                      value={metaMelhoria}
                      onChange={(e) => setMetaMelhoria(e.target.value)}
                      placeholder="Ex: De 145 para 175 CX/HH (+20%)"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Ganho Esperado (Impacto)</label>
                    <input
                      type="text"
                      value={ganhoEsperado}
                      onChange={(e) => setGanhoEsperado(e.target.value)}
                      placeholder="Ex: Redução de 30 min por rota e menor fadiga"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-emerald-300 font-semibold focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* BLOCO 3: PLANO DE EXECUÇÃO (5W2H) */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-purple-900/30 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2 text-purple-400 font-black text-xs uppercase tracking-wider">
                    <TrendingUp className="w-4 h-4" />
                    <span>3. Plano de Implantação 5W2H</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Execução Estruturada</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    O que será feito? (Detalhamento da Ação) <span className="text-emerald-400">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={oQueSeraFeito}
                    onChange={(e) => setOQueSeraFeito(e.target.value)}
                    placeholder="Descreva com clareza as etapas de implantação da melhoria..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:border-purple-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                      Responsável Principal <span className="text-emerald-400">*</span>
                    </label>
                    <select
                      value={responsavelPrincipal}
                      onChange={(e) => setResponsavelPrincipal(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                      required
                    >
                      <option value="">Selecione o responsável oficial...</option>
                      {LISTA_COLABORADORES_OFICIAIS.map(c => (
                        <option key={c.matricula} value={c.nome}>{c.nome} ({c.cargo})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Prazo Final de Implantação</label>
                    <input
                      type="date"
                      value={prazoImplantacao}
                      onChange={(e) => setPrazoImplantacao(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Como será feito?</label>
                    <input
                      type="text"
                      value={comoSeraFeito}
                      onChange={(e) => setComoSeraFeito(e.target.value)}
                      placeholder="Ex: Realização de teste piloto de 3 dias no turno da manhã..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Recursos / Ferramentas Necessárias</label>
                    <input
                      type="text"
                      value={recursosNecessarios}
                      onChange={(e) => setRecursosNecessarios(e.target.value)}
                      placeholder="Ex: Suporte ergonômico, 1 turno extra de sábado..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* BLOCO 4: STATUS TOR E EVOLUÇÃO (% CONCLUÍDO) */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-amber-900/30 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2 text-amber-400 font-black text-xs uppercase tracking-wider">
                    <Sliders className="w-4 h-4" />
                    <span>4. Status na Pauta TOR & Evolução</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Controle de Reunião</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Status da Ação na TOR</label>
                    <select
                      value={statusTOR}
                      onChange={(e) => setStatusTOR(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-amber-500 focus:outline-none font-bold"
                    >
                      <option value="Planejada">Planejada (Aguardando Início)</option>
                      <option value="Em Execução">Em Execução (Em Andamento)</option>
                      <option value="Em Teste Piloto">Em Teste Piloto (Validação)</option>
                      <option value="Concluída">Concluída</option>
                      <option value="Padronizada no POP">Padronizada no POP (DPO Nível 3)</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-300 uppercase">Percentual Concluído</label>
                      <span className="text-xs font-black text-emerald-400 font-mono">{percentualConcluido}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={percentualConcluido}
                      onChange={(e) => setPercentualConcluido(Number(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-0.5">
                      <span>0% (Início)</span>
                      <span>50% (Piloto)</span>
                      <span>100% (Padronizado)</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Feedback / Comentários da Gestão em Reunião</label>
                  <input
                    type="text"
                    value={feedbackGestao}
                    onChange={(e) => setFeedbackGestao(e.target.value)}
                    placeholder="Ex: Ação aprovada pelo comitê DPO. Pauta a ser revisada na próxima RPS."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white text-xs font-black uppercase tracking-wider shadow-lg hover:scale-[1.02] active:scale-95 transition-all cursor-pointer flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Salvar Ação de Melhoria TOR</span>
                </button>
              </div>
            </form>
          ) : (
            /* QUADRO DE AÇÕES DE MELHORIA TOR */
            <div className="space-y-4">
              
              {/* Cards de Métricas de Melhoria */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl">
                  <span className="text-[10px] text-slate-400 uppercase font-black">Total de Melhorias</span>
                  <div className="text-xl font-black text-white font-mono mt-0.5">{stats.total}</div>
                </div>
                <div className="bg-slate-950/70 border border-blue-900/30 p-3 rounded-xl">
                  <span className="text-[10px] text-blue-400 uppercase font-black">Em Execução / Piloto</span>
                  <div className="text-xl font-black text-blue-300 font-mono mt-0.5">{stats.emExecucao}</div>
                </div>
                <div className="bg-slate-950/70 border border-emerald-900/30 p-3 rounded-xl">
                  <span className="text-[10px] text-emerald-400 uppercase font-black">Concluídas / Padronizadas</span>
                  <div className="text-xl font-black text-emerald-300 font-mono mt-0.5">{stats.concluidas}</div>
                </div>
                <div className="bg-slate-950/70 border border-purple-900/30 p-3 rounded-xl">
                  <span className="text-[10px] text-purple-400 uppercase font-black">Evolução Média TOR</span>
                  <div className="text-xl font-black text-purple-300 font-mono mt-0.5">{stats.avgProgresso}%</div>
                </div>
              </div>

              {/* Filtros e Busca */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <div className="sm:col-span-2 relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por título, responsável ou processo..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <select
                    value={filterRitual}
                    onChange={(e) => setFilterRitual(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="todos">Todos os Rituais TOR</option>
                    {RITUAIS_TOR.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                <div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="todos">Todos os Status</option>
                    <option value="Planejada">Planejada</option>
                    <option value="Em Execução">Em Execução</option>
                    <option value="Em Teste Piloto">Em Teste Piloto</option>
                    <option value="Concluída">Concluída</option>
                    <option value="Padronizada no POP">Padronizada no POP</option>
                  </select>
                </div>
              </div>

              {/* Lista de Ações de Melhoria */}
              {loading ? (
                <div className="text-center py-12 text-slate-400 text-xs">Carregando pauta de melhorias TOR...</div>
              ) : filteredList.length === 0 ? (
                <div className="text-center py-12 bg-slate-950/40 rounded-xl border border-slate-800 text-slate-400 text-xs">
                  Nenhuma ação de melhoria encontrada com os filtros selecionados.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredList.map((item) => {
                    const isExp = expandedId === item.id;
                    const isPadrao = item.statusTOR === 'Padronizada no POP' || item.statusTOR === 'Concluída';

                    return (
                      <div 
                        key={item.id} 
                        className={`bg-slate-950/70 border rounded-xl p-4 transition-all ${
                          isPadrao ? 'border-emerald-800/40 bg-emerald-950/10' : 'border-slate-800'
                        }`}
                      >
                        {/* Linha Principal */}
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className={`p-2 rounded-lg mt-0.5 flex-shrink-0 ${
                              isPadrao 
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                                : 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                            }`}>
                              <Sparkles className="w-4 h-4" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-[10px] font-black uppercase text-emerald-400 border border-emerald-500/40">
                                  {item.reuniaoTOR}
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-bold text-slate-300 border border-slate-700">
                                  Pilar: {item.pilarDPO}
                                </span>
                                <span className="text-[11px] text-blue-400 font-bold">
                                  Processo: {item.processo}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono ml-auto">
                                  Próx. Pauta: {item.dataProximoAcompanhamento}
                                </span>
                              </div>

                              <h4 className="text-xs sm:text-sm font-black text-white mt-1.5 leading-snug">
                                {item.tituloMelhoria}
                              </h4>

                              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                                {item.oQueSeraFeito}
                              </p>

                              {/* Barra de Progresso */}
                              <div className="mt-3 flex items-center gap-3">
                                <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                                  <div 
                                    className="bg-gradient-to-r from-blue-500 to-emerald-500 h-full rounded-full transition-all duration-300"
                                    style={{ width: `${item.percentualConcluido}%` }}
                                  />
                                </div>
                                <span className="text-xs font-black text-emerald-400 font-mono">{item.percentualConcluido}%</span>
                              </div>

                              <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-2 flex-wrap">
                                <span><strong>Responsável:</strong> {item.responsavelPrincipal}</span>
                                <span>•</span>
                                <span><strong>Prazo Implantação:</strong> {item.prazoImplantacao}</span>
                                <span>•</span>
                                <span><strong>KPI Beneficiado:</strong> <span className="text-emerald-400 font-semibold">{item.indicadorBeneficiado}</span></span>
                              </div>
                            </div>
                          </div>

                          {/* Controles de Status e Expansão */}
                          <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
                            <select
                              value={item.statusTOR}
                              onChange={(e) => handleUpdateStatusTOR(item, e.target.value as any)}
                              className={`p-1.5 px-2.5 rounded-lg text-xs font-bold border cursor-pointer ${
                                isPadrao ? 'bg-emerald-900/60 border-emerald-600 text-emerald-300' :
                                item.statusTOR === 'Em Teste Piloto' ? 'bg-purple-900/60 border-purple-600 text-purple-300' :
                                item.statusTOR === 'Em Execução' ? 'bg-blue-900/60 border-blue-600 text-blue-300' :
                                'bg-slate-800 border-slate-700 text-slate-300'
                              }`}
                            >
                              <option value="Planejada">Planejada</option>
                              <option value="Em Execução">Em Execução</option>
                              <option value="Em Teste Piloto">Em Teste Piloto</option>
                              <option value="Concluída">Concluída</option>
                              <option value="Padronizada no POP">Padronizada no POP</option>
                            </select>

                            <button
                              type="button"
                              onClick={() => setExpandedId(isExp ? null : item.id)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                              title={isExp ? "Ocultar Detalhes" : "Ver Detalhes do Plano e Gestão"}
                            >
                              {isExp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(item.id)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
                              title="Excluir Registro"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Área Expandida com Detalhes da Melhoria */}
                        {isExp && (
                          <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-3 bg-slate-900/50 p-3.5 rounded-xl text-xs">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="bg-slate-950/80 p-3 rounded-lg border border-blue-900/30">
                                <div className="text-[10.5px] font-black uppercase text-blue-400 mb-1 flex items-center gap-1.5">
                                  <Target className="w-3.5 h-3.5" />
                                  <span>Oportunidade & Ganho Esperado</span>
                                </div>
                                <p className="text-slate-300 leading-relaxed">{item.oportunidadeIdentificada}</p>
                                <div className="mt-2 text-emerald-300 font-bold">
                                  Ganho: {item.ganhoEsperado}
                                </div>
                              </div>

                              <div className="bg-slate-950/80 p-3 rounded-lg border border-purple-900/30">
                                <div className="text-[10.5px] font-black uppercase text-purple-400 mb-1 flex items-center gap-1.5">
                                  <TrendingUp className="w-3.5 h-3.5" />
                                  <span>Como será feito & Recursos</span>
                                </div>
                                <p className="text-slate-300 leading-relaxed">{item.comoSeraFeito}</p>
                                {item.recursosNecessarios && (
                                  <span className="text-[10.5px] text-amber-400 font-mono mt-1 block">
                                    Recursos: {item.recursosNecessarios}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Atualizar Progresso Rápido */}
                            <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 flex items-center justify-between gap-3 flex-wrap">
                              <div className="text-[11px] font-bold text-slate-300">
                                Atualizar Progresso na Pauta TOR:
                              </div>
                              <div className="flex items-center gap-1.5">
                                {[25, 50, 75, 100].map(val => (
                                  <button
                                    key={val}
                                    type="button"
                                    onClick={() => handleUpdateProgress(item, val)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                      item.percentualConcluido === val
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                    }`}
                                  >
                                    {val}%
                                  </button>
                                ))}
                              </div>
                            </div>

                            {item.feedbackGestao && (
                              <div className="p-2 rounded bg-slate-950/60 border border-slate-800 text-slate-300 text-[11px]">
                                <strong>Feedback da Gestão:</strong> {item.feedbackGestao}
                              </div>
                            )}

                            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1">
                              <span>Registrado por: {item.registradoPor}</span>
                              <span>ID: {item.id}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default ModalAcaoMelhoria;
