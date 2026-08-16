import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  AlertOctagon, 
  Flame, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  Filter, 
  Search, 
  Plus, 
  Sparkles, 
  Download, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  User, 
  Calendar, 
  FileText,
  AlertTriangle,
  Zap,
  ArrowRight,
  Printer
} from 'lucide-react';
import { Usuario } from '../types';
import { LISTA_COLABORADORES_OFICIAIS } from './RankingModule';
import { 
  AcaoDesvioItem, 
  getAcoesDesviosLocal, 
  salvarAcaoDesvio, 
  excluirAcaoDesvio, 
  fetchAcoesDesvios 
} from '../utils/desviosEMelhoriasService';

export interface ModalAcaoDesvioProps {
  isOpen: boolean;
  onClose: () => void;
  user?: Usuario | null;
  initialData?: Partial<AcaoDesvioItem>;
}

const PROCESSOS_DPO = [
  'Quebras',
  'TMR',
  'Gestão FEFO',
  'Picking',
  'Repack',
  'Despejo',
  'EFC',
  'EFD',
  'Ressuprimento',
  'Gestão de Capacidade',
  'Estoque x Estoque',
  'Estoque x Picking',
  'Recebimento',
  'Carregamento / Expedição',
  'Blitz de Refugo',
  'Auditoria 5S'
];

const GATILHOS_PREDEFINIDOS = [
  'Estouro de Teto de Quebra (> 0.08%)',
  'Estouro de Gatilho TMR Carretas (> 70 min)',
  'Estouro de Gatilho TMR Recargas (> 40 min)',
  'Alerta Crítico FEFO (Semáforo Vermelho < 30 dias)',
  'Atraso Crítico no EFC / EFD (> 15 min)',
  'Divergência de Estoque no Inventário (> 0.2%)',
  'Não Conformidade Grave de 5S / Segurança',
  'Avaria de Carga no Descarregamento de Fábrica',
  'Ruptura de Posição de Picking Terrestre',
  'Falta de Colaborador / Gargalo Operacional'
];

export const ModalAcaoDesvio: React.FC<ModalAcaoDesvioProps> = ({
  isOpen,
  onClose,
  user,
  initialData
}) => {
  const [activeTab, setActiveTab] = useState<'novo' | 'historico'>('novo');
  const [acoesList, setAcoesList] = useState<AcaoDesvioItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProcesso, setFilterProcesso] = useState('todos');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterSeveridade, setFilterSeveridade] = useState('todos');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Form State
  const [processo, setProcesso] = useState<string>('Quebras');
  const [setor, setSetor] = useState<string>('Armazém Central');
  const [indicador, setIndicador] = useState<string>('Índice de Quebras Internas');
  const [meta, setMeta] = useState<string>('< 0.08% das caixas');
  const [resultadoObtido, setResultadoObtido] = useState<string>('');
  const [desvioEncontrado, setDesvioEncontrado] = useState<string>('');
  const [tipoGatilho, setTipoGatilho] = useState<string>(GATILHOS_PREDEFINIDOS[0]);
  const [severidade, setSeveridade] = useState<'Crítica (P1)' | 'Alta (P2)' | 'Média (P3)'>('Alta (P2)');
  const [turno, setTurno] = useState<'MANHÃ' | 'TARDE' | 'NOITE' | 'ADMINISTRATIVO'>('MANHÃ');
  
  // Contenção Imediata (D0)
  const [contencaoImediata, setContencaoImediata] = useState<string>('');
  const [responsavelContencao, setResponsavelContencao] = useState<string>('');
  
  // 4M & 5 Porquês
  const [causaRaiz4M, setCausaRaiz4M] = useState<'Método' | 'Mão de Obra' | 'Máquina' | 'Material' | 'Meio Ambiente' | 'Medição'>('Método');
  const [pq1, setPq1] = useState<string>('');
  const [pq2, setPq2] = useState<string>('');
  const [pq3, setPq3] = useState<string>('');
  const [pq4, setPq4] = useState<string>('');
  const [pq5, setPq5] = useState<string>('');
  
  // 5W2H
  const [oQueFazer, setOQueFazer] = useState<string>('');
  const [responsavelTratativa, setResponsavelTratativa] = useState<string>('');
  const [prazo, setPrazo] = useState<string>(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [ondeLocal, setOndeLocal] = useState<string>('Armazém Geral');
  const [comoExecutar, setComoExecutar] = useState<string>('');
  
  // Opcionais
  const [produto, setProduto] = useState<string>('');
  const [codigoProduto, setCodigoProduto] = useState<string>('');
  const [lote, setLote] = useState<string>('');

  // Carrega lista ao abrir
  useEffect(() => {
    if (isOpen) {
      loadData();
      if (initialData) {
        if (initialData.processo) setProcesso(initialData.processo);
        if (initialData.indicador) setIndicador(initialData.indicador);
        if (initialData.meta) setMeta(initialData.meta);
        if (initialData.resultadoObtido) setResultadoObtido(initialData.resultadoObtido);
        if (initialData.desvioEncontrado) setDesvioEncontrado(initialData.desvioEncontrado);
        if (initialData.tipoGatilho) setTipoGatilho(initialData.tipoGatilho);
        if (initialData.severidade) setSeveridade(initialData.severidade);
        if (initialData.setor) setSetor(initialData.setor);
        if (initialData.produto) setProduto(initialData.produto);
        if (initialData.codigoProduto) setCodigoProduto(initialData.codigoProduto);
        if (initialData.lote) setLote(initialData.lote);
        setActiveTab('novo');
      }
    }
  }, [isOpen, initialData]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchAcoesDesvios(user?.empresaId || 'demo');
      setAcoesList(data);
    } catch (e) {
      setAcoesList(getAcoesDesviosLocal());
    } finally {
      setLoading(false);
    }
  };

  // Preenchimento Inteligente DPO de 5 Porquês
  const handleAutoSuggest5P = () => {
    if (!desvioEncontrado) {
      alert('Por favor, informe a descrição do desvio/ocorrência primeiro.');
      return;
    }

    if (processo === 'Quebras') {
      setPq1(`Por que houve quebra? Devido ao desbalanceamento de caixas durante movimentação no corredor.`);
      setPq2(`Por que desbalanceou? Porque o filme stretch afrouxou na terceira fiada.`);
      setPq3(`Por que afrouxou? Porque o rolo manual estava sem travamento de tensão.`);
      setPq4(`Por que estava sem travamento? Falta de verificação no início do turno.`);
      setPq5(`Por que não verificou? Ausência de rotina padronizada de checklist 5S antes da operação.`);
      setCausaRaiz4M('Método');
      setOQueFazer('Padronizar checklist 5S de ferramentas de envolvimento e treinar ajudantes no padrão de amarração DPO.');
    } else if (processo === 'TMR') {
      setPq1(`Por que o TMR estourou? Porque a conferência do veículo demorou 35 min além da meta.`);
      setPq2(`Por que demorou? Houve divergência entre a nota fiscal de transferência e as caixas físicas.`);
      setPq3(`Por que houve divergência? O palete foi substituído na fábrica sem atualização no manifesto.`);
      setPq4(`Por que a validação parou o pátio? O protocolo anterior exigia liberação manual via e-mail.`);
      setPq5(`Por que via e-mail? Falta de canal direto de contingência entre conferentes e o suporte logístico.`);
      setCausaRaiz4M('Método');
      setOQueFazer('Implementar alinhamento com a fábrica para liberação de divergências em canal prioritário em até 10 minutos.');
    } else if (processo.includes('FEFO') || processo.includes('Validade')) {
      setPq1(`Por que o lote crítico não desceu? Porque o empilhador ressupriu o picking com o lote mais recente.`);
      setPq2(`Por que pegou o mais recente? Porque estava posicionado no piso mais baixo do porta-paletes.`);
      setPq3(`Por que estava no piso baixo? Foi descarregado da fábrica e alocado no primeiro endereço livre.`);
      setPq4(`Por que sem triagem FEFO? Falta de identificação visual com etiqueta de semáforo na entrada.`);
      setPq5(`Por que sem etiqueta? Rolo de etiquetas de semáforo havia esgotado na doca.`);
      setCausaRaiz4M('Material');
      setOQueFazer('Garantir estoque de segurança de etiquetas coloridas de validade na doca e bloquear ressuprimento fora da regra FEFO.');
    } else {
      setPq1(`Por que ocorreu o desvio? Houve falha na execução do procedimento operacional padrão.`);
      setPq2(`Por que falhou? O operador não seguiu o fluxo padrão de conferência.`);
      setPq3(`Por que não seguiu? Desconhecimento da atualização recente da regra DPO.`);
      setPq4(`Por que não conhecia? Ausência de registro de DPO Diálogo de Qualidade com a equipe.`);
      setPq5(`Por que não houve diálogo? Falta de ritual estruturado de passagem de turno.`);
      setCausaRaiz4M('Método');
      setOQueFazer('Realizar DPO Diálogo Operacional de 5 minutos reforçando o procedimento e colher assinatura da equipe.');
    }
  };

  const handleSalvarDesvio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!desvioEncontrado.trim() || !oQueFazer.trim() || !responsavelTratativa.trim()) {
      alert('Por favor, preencha a descrição do desvio, o plano de ação (o que fazer) e o responsável.');
      return;
    }

    const now = new Date();
    const dStr = now.toLocaleDateString('pt-BR');
    const dISO = now.toISOString().split('T')[0];
    const hStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const novoItem: AcaoDesvioItem = {
      id: `desvio-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      empresaId: user?.empresaId || 'demo',
      data: dStr,
      dataISO: dISO,
      hora: hStr,
      turno,
      processo,
      setor,
      indicador,
      meta: meta || '100% no Padrão DPO',
      resultadoObtido: resultadoObtido || 'Desvio identificado na rotina',
      desvioEncontrado,
      tipoGatilho,
      severidade,
      contencaoImediata: contencaoImediata || 'Ação de contenção imediata registrada.',
      responsavelContencao: responsavelContencao || user?.nome || 'Operação',
      causaRaiz4M,
      cincoPorques: {
        pq1,
        pq2,
        pq3,
        pq4,
        pq5
      },
      oQueFazer,
      responsavelTratativa,
      prazo,
      ondeLocal: ondeLocal || setor,
      comoExecutar: comoExecutar || 'Conforme plano de ação aprovado.',
      status: 'Pendente',
      abertoPor: `${user?.nome || 'Colaborador'} (${user?.papel || 'Operação'})`,
      criadoEm: now.toISOString(),
      produto: produto || undefined,
      codigoProduto: codigoProduto || undefined,
      lote: lote || undefined
    };

    const saved = await salvarAcaoDesvio(novoItem, user?.empresaId || 'demo');
    setAcoesList(prev => [saved, ...prev]);
    setSaveSuccessMsg('Ação de Desvio / Gatilho registrada com sucesso!');
    setTimeout(() => setSaveSuccessMsg(null), 3500);

    // Reset Form
    setDesvioEncontrado('');
    setResultadoObtido('');
    setContencaoImediata('');
    setPq1('');
    setPq2('');
    setPq3('');
    setPq4('');
    setPq5('');
    setOQueFazer('');
    setComoExecutar('');
    setActiveTab('historico');
  };

  const handleUpdateStatus = async (item: AcaoDesvioItem, newStatus: AcaoDesvioItem['status']) => {
    const isEficaz = newStatus === 'Validado / Eficaz';
    const updated: AcaoDesvioItem = {
      ...item,
      status: newStatus,
      eficazValidado: isEficaz ? true : item.eficazValidado,
      observacoesValidacao: isEficaz ? `Validado e auditado por ${user?.nome || 'Gestão'} em ${new Date().toLocaleDateString('pt-BR')}` : item.observacoesValidacao
    };

    const saved = await salvarAcaoDesvio(updated, user?.empresaId || 'demo');
    setAcoesList(prev => prev.map(a => a.id === saved.id ? saved : a));
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja realmente excluir este registro de desvio?')) {
      await excluirAcaoDesvio(id);
      setAcoesList(prev => prev.filter(a => a.id !== id));
    }
  };

  const handleExportCSV = () => {
    if (acoesList.length === 0) return;
    const headers = [
      'ID', 'Data', 'Hora', 'Turno', 'Processo', 'Setor', 'Tipo de Gatilho', 
      'Severidade', 'Indicador', 'Meta', 'Resultado', 'Desvio', 
      'Contenção Imediata', 'Causa Raiz 4M', 'Contramedida', 'Responsável', 'Prazo', 'Status'
    ];

    const rows = acoesList.map(item => [
      item.id,
      item.data,
      item.hora,
      item.turno,
      `"${item.processo}"`,
      `"${item.setor}"`,
      `"${item.tipoGatilho}"`,
      item.severidade,
      `"${item.indicador}"`,
      `"${item.meta}"`,
      `"${item.resultadoObtido}"`,
      `"${item.desvioEncontrado.replace(/"/g, '""')}"`,
      `"${item.contencaoImediata.replace(/"/g, '""')}"`,
      item.causaRaiz4M,
      `"${item.oQueFazer.replace(/"/g, '""')}"`,
      `"${item.responsavelTratativa}"`,
      item.prazo,
      item.status
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `Acoes_Desvios_Gatilhos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtragem
  const filteredList = useMemo(() => {
    return acoesList.filter(item => {
      const matchSearch = 
        item.desvioEncontrado.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.processo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.responsavelTratativa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.tipoGatilho.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchProc = filterProcesso === 'todos' || item.processo === filterProcesso;
      const matchStatus = filterStatus === 'todos' || item.status === filterStatus;
      const matchSev = filterSeveridade === 'todos' || item.severidade === filterSeveridade;

      return matchSearch && matchProc && matchStatus && matchSev;
    });
  }, [acoesList, searchTerm, filterProcesso, filterStatus, filterSeveridade]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header do Modal */}
        <div className="bg-gradient-to-r from-red-950/80 via-slate-900 to-amber-950/60 p-4 sm:p-5 border-b border-red-800/40 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-600/20 border border-red-500/40 text-red-400">
              <Flame className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-[10px] font-black uppercase tracking-wider text-red-400">
                  DPO • Gestão de Ocorrências & Gatilhos
                </span>
                <span className="hidden sm:inline-block text-xs text-slate-400 font-mono">
                  Tratativa Imediata D0 / 5 Porquês / 5W2H
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-tight mt-0.5">
                Plano de Ação por Desvios & Estouro de Gatilho
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
                  ? 'border-red-500 text-red-400 bg-red-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Registrar Novo Desvio</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('historico')}
              className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                activeTab === 'historico'
                  ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <AlertOctagon className="w-3.5 h-3.5" />
              <span>Quadro de Desvios ({acoesList.length})</span>
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
                <Download className="w-3.5 h-3.5 text-amber-400" />
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
            <form onSubmit={handleSalvarDesvio} className="space-y-6">
              
              {/* BLOCO 1: IDENTIFICAÇÃO DO DESVIO & GATILHO */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-red-900/30 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2 text-red-400 font-black text-xs uppercase tracking-wider">
                    <ShieldAlert className="w-4 h-4" />
                    <span>1. Identificação do Desvio & Gatilho Operacional</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Etapa D0/D1</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Processo / Módulo</label>
                    <select
                      value={processo}
                      onChange={(e) => setProcesso(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-red-500 focus:outline-none"
                    >
                      {PROCESSOS_DPO.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Setor / Local</label>
                    <input
                      type="text"
                      value={setor}
                      onChange={(e) => setSetor(e.target.value)}
                      placeholder="Ex: Armazém Central - Rua 04"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-red-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Tipo de Gatilho Violado</label>
                    <select
                      value={tipoGatilho}
                      onChange={(e) => setTipoGatilho(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-red-500 focus:outline-none"
                    >
                      {GATILHOS_PREDEFINIDOS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Severidade / Prioridade</label>
                    <select
                      value={severidade}
                      onChange={(e) => setSeveridade(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-red-500 focus:outline-none font-bold"
                    >
                      <option value="Crítica (P1)" className="text-red-400 font-bold">Crítica (P1) • Parada / Risco</option>
                      <option value="Alta (P2)" className="text-amber-400 font-bold">Alta (P2) • Meta Ameaçada</option>
                      <option value="Média (P3)" className="text-blue-400 font-bold">Média (P3) • Desvio Controlável</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Indicador Afetado</label>
                    <input
                      type="text"
                      value={indicador}
                      onChange={(e) => setIndicador(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-red-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Meta Oficial do Indicador</label>
                    <input
                      type="text"
                      value={meta}
                      onChange={(e) => setMeta(e.target.value)}
                      placeholder="Ex: < 0.08%"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-red-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Resultado Real Atingido</label>
                    <input
                      type="text"
                      value={resultadoObtido}
                      onChange={(e) => setResultadoObtido(e.target.value)}
                      placeholder="Ex: 0.22% (Estouro de teto)"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-amber-300 font-mono font-bold focus:border-red-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Descrição Detalhada do Desvio / Ocorrência <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={desvioEncontrado}
                    onChange={(e) => setDesvioEncontrado(e.target.value)}
                    placeholder="Descreva exatamente o que aconteceu, o momento, pessoas envolvidas e impacto na operação..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:border-red-500 focus:outline-none leading-relaxed"
                    required
                  />
                </div>
              </div>

              {/* BLOCO 2: CONTENÇÃO IMEDIATA (D0) */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-amber-900/30 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2 text-amber-400 font-black text-xs uppercase tracking-wider">
                    <Zap className="w-4 h-4" />
                    <span>2. Contenção Imediata (Estancar o Problema)</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Resposta Rápida</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Ação de Contenção Realizada na Hora</label>
                    <input
                      type="text"
                      value={contencaoImediata}
                      onChange={(e) => setContencaoImediata(e.target.value)}
                      placeholder="Ex: Isolamento da rua, segregação do lote, parada de máquina, limpeza imediata..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Responsável pela Contenção</label>
                    <select
                      value={responsavelContencao}
                      onChange={(e) => setResponsavelContencao(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                    >
                      <option value="">Selecione da lista ou deixe padrão...</option>
                      {LISTA_COLABORADORES_OFICIAIS.map(c => (
                        <option key={c.matricula} value={c.nome}>{c.nome} ({c.cargo})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* BLOCO 3: ANÁLISE DE CAUSA RAIZ (5 PORQUÊS & 4M) */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-blue-900/30 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-blue-400 font-black text-xs uppercase tracking-wider">
                    <Sparkles className="w-4 h-4" />
                    <span>3. Análise de Causa Raiz DPO (5 Porquês + 4M)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAutoSuggest5P}
                    className="px-3 py-1 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-300" />
                    <span>Sugerir 5 Porquês DPO</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Classificação Causa Raiz (4M/6M)</label>
                    <select
                      value={causaRaiz4M}
                      onChange={(e) => setCausaRaiz4M(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="Método">Método (Procedimento, POP, Instrução de Trabalho)</option>
                      <option value="Mão de Obra">Mão de Obra (Treinamento, Habilidade, Atenção)</option>
                      <option value="Máquina">Máquina (Equipamento, Empilhadeira, Coletor, Ferramenta)</option>
                      <option value="Material">Material (Insumo, Embalagem, Palete de Madeira)</option>
                      <option value="Meio Ambiente">Meio Ambiente (Clima, Umidade, Piso Molhado)</option>
                      <option value="Medição">Medição (Critério de Aferição, Divergência de Saldo)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Turno da Ocorrência</label>
                    <select
                      value={turno}
                      onChange={(e) => setTurno(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="MANHÃ">Turno da Manhã (06h às 14h)</option>
                      <option value="TARDE">Turno da Tarde (14h às 22h)</option>
                      <option value="NOITE">Turno da Noite (22h às 06h)</option>
                      <option value="ADMINISTRATIVO">Horário Administrativo</option>
                    </select>
                  </div>
                </div>

                {/* 5 Porquês Inputs */}
                <div className="space-y-2 pt-1">
                  <div>
                    <label className="text-[10.5px] font-bold text-slate-400 uppercase">1º Por quê? (Sintoma Imediato)</label>
                    <input
                      type="text"
                      value={pq1}
                      onChange={(e) => setPq1(e.target.value)}
                      placeholder="Por que ocorreu o primeiro sintoma?"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-lg p-2 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10.5px] font-bold text-slate-400 uppercase">2º Por quê?</label>
                    <input
                      type="text"
                      value={pq2}
                      onChange={(e) => setPq2(e.target.value)}
                      placeholder="Por que o fato acima aconteceu?"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-lg p-2 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10.5px] font-bold text-slate-400 uppercase">3º Por quê?</label>
                    <input
                      type="text"
                      value={pq3}
                      onChange={(e) => setPq3(e.target.value)}
                      placeholder="Por que?"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-lg p-2 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10.5px] font-bold text-slate-400 uppercase">4º Por quê?</label>
                    <input
                      type="text"
                      value={pq4}
                      onChange={(e) => setPq4(e.target.value)}
                      placeholder="Por que?"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-lg p-2 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10.5px] font-bold text-emerald-400 uppercase font-mono">5º Por quê? (Causa Raiz Fundamental)</label>
                    <input
                      type="text"
                      value={pq5}
                      onChange={(e) => setPq5(e.target.value)}
                      placeholder="Causa raiz fundamental a ser eliminada..."
                      className="w-full bg-slate-900 border border-emerald-500/50 rounded-lg p-2 text-xs text-emerald-300 font-semibold focus:border-emerald-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* BLOCO 4: CONTRAMEDIDA DEFINITIVA (5W2H) */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-emerald-900/30 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-black text-xs uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>4. Plano de Ação Corretiva (Contramedida 5W2H)</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Eliminação Definitiva</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    O que será feito? (Contramedida Definitiva) <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={oQueFazer}
                    onChange={(e) => setOQueFazer(e.target.value)}
                    placeholder="Descreva a ação definitiva que impedirá a reincidência deste desvio..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                      Quem é o Responsável? <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={responsavelTratativa}
                      onChange={(e) => setResponsavelTratativa(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                      required
                    >
                      <option value="">Selecione o responsável oficial...</option>
                      {LISTA_COLABORADORES_OFICIAIS.map(c => (
                        <option key={c.matricula} value={c.nome}>{c.nome} ({c.cargo})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Prazo Limite (Quando)</label>
                    <input
                      type="date"
                      value={prazo}
                      onChange={(e) => setPrazo(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Onde será aplicado?</label>
                    <input
                      type="text"
                      value={ondeLocal}
                      onChange={(e) => setOndeLocal(e.target.value)}
                      placeholder="Ex: Todas as linhas de picking"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Como será executado / Padronizado?</label>
                  <input
                    type="text"
                    value={comoExecutar}
                    onChange={(e) => setComoExecutar(e.target.value)}
                    placeholder="Ex: Treinamento de 15 minutos em DPO Diálogo de Qualidade + Atualização do POP de Armazenagem..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Botões de Ação do Formulário */}
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
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white text-xs font-black uppercase tracking-wider shadow-lg hover:scale-[1.02] active:scale-95 transition-all cursor-pointer flex items-center gap-2"
                >
                  <Flame className="w-4 h-4" />
                  <span>Salvar Ação de Desvio & Gatilho</span>
                </button>
              </div>
            </form>
          ) : (
            /* QUADRO DE DESVIOS E OCORRÊNCIAS HISTÓRICO */
            <div className="space-y-4">
              
              {/* Filtros e Busca */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <div className="sm:col-span-2 relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por desvio, processo, responsável ou gatilho..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <select
                    value={filterProcesso}
                    onChange={(e) => setFilterProcesso(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                  >
                    <option value="todos">Todos os Processos</option>
                    {PROCESSOS_DPO.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                  >
                    <option value="todos">Todos os Status</option>
                    <option value="Pendente">Pendente</option>
                    <option value="Em Andamento">Em Andamento</option>
                    <option value="Concluído">Concluído</option>
                    <option value="Validado / Eficaz">Validado / Eficaz</option>
                  </select>
                </div>
              </div>

              {/* Lista de Ações de Desvio */}
              {loading ? (
                <div className="text-center py-12 text-slate-400 text-xs">Carregando plano de desvios...</div>
              ) : filteredList.length === 0 ? (
                <div className="text-center py-12 bg-slate-950/40 rounded-xl border border-slate-800 text-slate-400 text-xs">
                  Nenhuma ação de desvio encontrada com os filtros selecionados.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredList.map((item) => {
                    const isExp = expandedId === item.id;
                    const isP1 = item.severidade === 'Crítica (P1)';
                    const isP2 = item.severidade === 'Alta (P2)';

                    return (
                      <div 
                        key={item.id} 
                        className={`bg-slate-950/70 border rounded-xl p-4 transition-all ${
                          item.status === 'Validado / Eficaz' 
                            ? 'border-emerald-800/40' 
                            : isP1 
                              ? 'border-red-800/50 bg-red-950/10' 
                              : 'border-slate-800'
                        }`}
                      >
                        {/* Linha Principal */}
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className={`p-2 rounded-lg mt-0.5 flex-shrink-0 ${
                              isP1 
                                ? 'bg-red-500/20 text-red-400 border border-red-500/40' 
                                : isP2 
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' 
                                  : 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                            }`}>
                              <Flame className="w-4 h-4" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-black uppercase text-slate-300 border border-slate-700">
                                  {item.processo}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  isP1 ? 'bg-red-950 text-red-400 border border-red-800' :
                                  isP2 ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                                  'bg-blue-950 text-blue-400 border border-blue-800'
                                }`}>
                                  {item.severidade}
                                </span>
                                <span className="text-[11px] text-amber-400 font-bold">
                                  Gatilho: {item.tipoGatilho}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono ml-auto">
                                  {item.data} • {item.hora} ({item.turno})
                                </span>
                              </div>

                              <h4 className="text-xs sm:text-sm font-bold text-white mt-1.5 leading-snug">
                                {item.desvioEncontrado}
                              </h4>

                              <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-2 flex-wrap">
                                <span><strong>Meta:</strong> {item.meta}</span>
                                <span>•</span>
                                <span><strong>Resultado:</strong> <span className="text-amber-300 font-mono">{item.resultadoObtido}</span></span>
                                <span>•</span>
                                <span><strong>Responsável:</strong> {item.responsavelTratativa}</span>
                                <span>•</span>
                                <span><strong>Prazo:</strong> {item.prazo}</span>
                              </div>
                            </div>
                          </div>

                          {/* Controles de Status e Expansão */}
                          <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
                            <select
                              value={item.status}
                              onChange={(e) => handleUpdateStatus(item, e.target.value as any)}
                              className={`p-1.5 px-2.5 rounded-lg text-xs font-bold border cursor-pointer ${
                                item.status === 'Validado / Eficaz' ? 'bg-emerald-900/60 border-emerald-600 text-emerald-300' :
                                item.status === 'Concluído' ? 'bg-blue-900/60 border-blue-600 text-blue-300' :
                                item.status === 'Em Andamento' ? 'bg-amber-900/60 border-amber-600 text-amber-300' :
                                'bg-slate-800 border-slate-700 text-slate-300'
                              }`}
                            >
                              <option value="Pendente">Pendente</option>
                              <option value="Em Andamento">Em Andamento</option>
                              <option value="Concluído">Concluído</option>
                              <option value="Validado / Eficaz">Validado / Eficaz</option>
                            </select>

                            <button
                              type="button"
                              onClick={() => setExpandedId(isExp ? null : item.id)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                              title={isExp ? "Ocultar Detalhes" : "Ver 5 Porquês e Contramedidas"}
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

                        {/* Área Expandida com Detalhes DPO */}
                        {isExp && (
                          <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-3 bg-slate-900/50 p-3.5 rounded-xl text-xs">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="bg-slate-950/80 p-3 rounded-lg border border-amber-900/30">
                                <div className="text-[10.5px] font-black uppercase text-amber-400 mb-1 flex items-center gap-1.5">
                                  <Zap className="w-3.5 h-3.5" />
                                  <span>Contenção Imediata (D0)</span>
                                </div>
                                <p className="text-slate-200 leading-relaxed">{item.contencaoImediata}</p>
                                <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                                  Executado por: {item.responsavelContencao}
                                </span>
                              </div>

                              <div className="bg-slate-950/80 p-3 rounded-lg border border-emerald-900/30">
                                <div className="text-[10.5px] font-black uppercase text-emerald-400 mb-1 flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Contramedida Definitiva (5W2H)</span>
                                </div>
                                <p className="text-slate-200 font-bold leading-relaxed">{item.oQueFazer}</p>
                                <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                                  Como: {item.comoExecutar} • Onde: {item.ondeLocal}
                                </span>
                              </div>
                            </div>

                            {/* 5 Porquês */}
                            <div className="bg-slate-950/80 p-3 rounded-lg border border-blue-900/30">
                              <div className="text-[10.5px] font-black uppercase text-blue-400 mb-2 flex items-center justify-between">
                                <span>Árvore de Causa Raiz DPO (4M: {item.causaRaiz4M})</span>
                              </div>
                              <ul className="space-y-1.5 text-[11px] text-slate-300 font-mono">
                                {item.cincoPorques?.pq1 && <li><strong className="text-blue-400">1º:</strong> {item.cincoPorques.pq1}</li>}
                                {item.cincoPorques?.pq2 && <li><strong className="text-blue-400">2º:</strong> {item.cincoPorques.pq2}</li>}
                                {item.cincoPorques?.pq3 && <li><strong className="text-blue-400">3º:</strong> {item.cincoPorques.pq3}</li>}
                                {item.cincoPorques?.pq4 && <li><strong className="text-blue-400">4º:</strong> {item.cincoPorques.pq4}</li>}
                                {item.cincoPorques?.pq5 && <li className="text-emerald-300 font-bold"><strong className="text-emerald-400">5º (Raiz):</strong> {item.cincoPorques.pq5}</li>}
                              </ul>
                            </div>

                            {item.observacoesValidacao && (
                              <div className="p-2 rounded bg-emerald-950/50 border border-emerald-600/40 text-emerald-300 text-[11px]">
                                {item.observacoesValidacao}
                              </div>
                            )}

                            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1">
                              <span>Registrado por: {item.abertoPor}</span>
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

export default ModalAcaoDesvio;
