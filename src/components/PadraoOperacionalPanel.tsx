import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  Globe, 
  Share2, 
  Lock, 
  CheckCircle2, 
  X, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  Paperclip, 
  History, 
  UserCheck, 
  Calendar,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Eye,
  Printer
} from 'lucide-react';
import { 
  SopDocument, 
  SopModule, 
  SopScope, 
  SOP_MODULES_LIST, 
  getAllSops, 
  saveOrUpdateSop, 
  deleteSop,
  canUserManageSop,
  openPdfInNewTab,
  downloadPdfFile 
} from '../utils/sopUtils';
import { Usuario } from '../types';

interface PadraoOperacionalPanelProps {
  user: Usuario;
  initialModuleFilter?: SopModule | 'todos';
  theme?: 'light' | 'dark';
}

export default function PadraoOperacionalPanel({ 
  user, 
  initialModuleFilter = 'todos',
  theme = 'dark' 
}: PadraoOperacionalPanelProps) {
  const isDark = theme !== 'light';
  const isManager = canUserManageSop(user);
  const [sops, setSops] = useState<SopDocument[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState<SopModule | 'todos'>(initialModuleFilter);
  const [selectedScope, setSelectedScope] = useState<SopScope | 'todos'>('todos');
  const [selectedStatus, setSelectedStatus] = useState<'Ativo' | 'Inativo' | 'todos'>('Ativo');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSop, setEditingSop] = useState<Partial<SopDocument> | null>(null);
  const [viewerSop, setViewerSop] = useState<SopDocument | null>(null);
  const [deleteConfirmSop, setDeleteConfirmSop] = useState<SopDocument | null>(null);

  // Form Fields
  const [codigo, setCodigo] = useState('');
  const [nome, setNome] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [passoTexto, setPassoTexto] = useState('');
  const [passosList, setPassosList] = useState<string[]>([]);
  const [fotosList, setFotosList] = useState<string[]>([]);
  const [videosList, setVideosList] = useState<string[]>([]);
  const [revisao, setRevisao] = useState('Rev 01');
  const [dataRevisao, setDataRevisao] = useState(new Date().toISOString().split('T')[0]);
  const [responsavel, setResponsavel] = useState(user.nome || 'Gestor Operacional');
  const [status, setStatus] = useState<'Ativo' | 'Inativo'>('Ativo');
  const [escopo, setEscopo] = useState<SopScope>('global');
  const [modulosVinculados, setModulosVinculados] = useState<SopModule[]>(SOP_MODULES_LIST.map(m => m.id));
  const [anexosList, setAnexosList] = useState<{ nome: string; url: string; tipo?: string }[]>([]);

  useEffect(() => {
    loadSops();
  }, []);

  const loadSops = () => {
    setSops(getAllSops());
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setAnexosList(prev => [...prev, { nome: file.name, url: result, tipo: file.type }]);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAnexo = (idx: number) => {
    setAnexosList(anexosList.filter((_, i) => i !== idx));
  };

  const handleOpenNewModal = () => {
    setEditingSop(null);
    setCodigo(`POP-AMB-${Math.floor(100 + Math.random() * 900)}`);
    setNome('');
    setObjetivo('');
    setDescricao('');
    setPassosList([]);
    setPassoTexto('');
    setFotosList([]);
    setVideosList([]);
    setAnexosList([]);
    setRevisao('Rev 01');
    setDataRevisao(new Date().toISOString().split('T')[0]);
    setResponsavel(user.nome || 'Gestor Operacional');
    setStatus('Ativo');
    setEscopo(selectedModule !== 'todos' ? 'exclusivo' : 'global');
    setModulosVinculados(selectedModule !== 'todos' ? [selectedModule] : SOP_MODULES_LIST.map(m => m.id));
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (sop: SopDocument) => {
    setEditingSop(sop);
    setCodigo(sop.codigo);
    setNome(sop.nome);
    setObjetivo(sop.objetivo);
    setDescricao(sop.descricao);
    setPassosList(sop.passoAPasso || []);
    setPassoTexto('');
    setFotosList(sop.fotos || []);
    setVideosList(sop.videos || []);
    setAnexosList(sop.anexos || []);
    setRevisao(sop.revisao);
    setDataRevisao(sop.dataRevisao);
    setResponsavel(sop.responsavel);
    setStatus(sop.status);
    setEscopo(sop.escopo);
    setModulosVinculados(sop.modulosVinculados || []);
    setIsModalOpen(true);
  };

  const handleAddPasso = () => {
    if (!passoTexto.trim()) return;
    setPassosList([...passosList, `${passosList.length + 1}. ${passoTexto.trim()}`]);
    setPassoTexto('');
  };

  const handleRemovePasso = (idx: number) => {
    setPassosList(passosList.filter((_, i) => i !== idx));
  };

  const handleSaveModal = () => {
    if (!codigo.trim() || !nome.trim()) {
      alert('Por favor, preencha o Código e o Nome do Padrão Operacional.');
      return;
    }

    const docToSave: SopDocument = {
      id: editingSop?.id || `sop-${Date.now()}`,
      codigo: codigo.trim(),
      nome: nome.trim(),
      objetivo: objetivo.trim(),
      descricao: descricao.trim(),
      passoAPasso: passosList,
      fotos: fotosList,
      videos: videosList,
      anexos: anexosList,
      revisao: revisao.trim(),
      dataRevisao,
      responsavel: responsavel.trim(),
      status,
      escopo,
      modulosVinculados: escopo === 'global' ? SOP_MODULES_LIST.map(m => m.id) : modulosVinculados,
      historicoAlteracoes: editingSop?.historicoAlteracoes || [],
      criadoEm: editingSop?.criadoEm || new Date().toISOString(),
      atualizadoEm: new Date().toISOString()
    };

    saveOrUpdateSop(docToSave, user.nome || user.email || 'Gestor');
    loadSops();
    setIsModalOpen(false);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('af_pop_updated'));
      window.dispatchEvent(new Event('storage'));
    }
    alert(`✅ Padrão Operacional "${codigo.trim()} - ${nome.trim()}" salvo e vinculado às áreas com sucesso!`);
  };

  const handleDelete = (sop: SopDocument) => {
    if (!isManager) {
      alert('Acesso restrito. Apenas administradores e supervisores podem excluir padrões operacionais.');
      return;
    }
    setDeleteConfirmSop(sop);
  };

  const confirmDeleteSop = () => {
    if (!isManager) {
      alert('Acesso restrito. Apenas administradores e supervisores podem excluir padrões operacionais.');
      setDeleteConfirmSop(null);
      return;
    }
    if (deleteConfirmSop) {
      deleteSop(deleteConfirmSop.id);
      setDeleteConfirmSop(null);
      loadSops();
    }
  };

  const toggleModuloVinculado = (modId: SopModule) => {
    if (modulosVinculados.includes(modId)) {
      setModulosVinculados(modulosVinculados.filter(m => m !== modId));
    } else {
      setModulosVinculados([...modulosVinculados, modId]);
    }
  };

  const filteredSops = sops.filter(sop => {
    if (selectedModule !== 'todos') {
      if (sop.escopo !== 'global' && !sop.modulosVinculados.includes(selectedModule)) return false;
    }
    if (selectedScope !== 'todos' && sop.escopo !== selectedScope) return false;
    if (selectedStatus !== 'todos' && sop.status !== selectedStatus) return false;
    
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        sop.codigo.toLowerCase().includes(q) ||
        sop.nome.toLowerCase().includes(q) ||
        sop.objetivo.toLowerCase().includes(q) ||
        sop.responsavel.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Manual compilation state
  const [showManualModal, setShowManualModal] = useState(false);

  return (
    <div className="space-y-6">
      {/* BANNER REQUISITO 20 */}
      <div className="bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#334155] rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-700">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-400/20 flex items-center gap-1.5 w-max">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            Módulo 20 - Central Global de Padronização de Processos (POP/LUP)
          </span>
          <h2 className="text-2xl font-black tracking-tight mt-2 flex items-center gap-2">
            Procedimentos Operacionais Padronizados
          </h2>
          <p className="text-xs text-slate-300 font-medium mt-1 max-w-3xl">
            Gestão unificada de Padrões Operacionais para todas as 17 áreas da plataforma. Escolha o escopo de aplicação (Exclusivo, Compartilhado ou Global) e sincronize automaticamente em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowManualModal(true)}
            className="px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <BookOpen className="w-4 h-4" />
            Gerar Manual de Instrução
          </button>

          {isManager ? (
            <button
              onClick={handleOpenNewModal}
              className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Cadastrar Novo Padrão
            </button>
          ) : (
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-amber-300 text-xs font-bold">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Modo Visualização (Colaborador)</span>
            </div>
          )}
        </div>
      </div>


      {/* GUIA DE MÓDULOS DE PROCESSOS (ABAS RÁPIDAS) */}
      <div className={`p-3 rounded-2xl border ${isDark ? 'bg-[#151b23] border-[#222d3a]' : 'bg-white border-slate-200'} space-y-2`}>
        <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block px-1">
          📁 Selecione a Célula / Processo Operacional para Inserir ou Consultar Padrões:
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'todos', label: '⚡ Todos os Módulos' },
            { id: 'quebras', label: '💥 Quebras' },
            { id: 'repack', label: '📦 Repack' },
            { id: 'despejo', label: '♻️ Despejo' },
            { id: 'fefo', label: '⏳ FEFO (Validades)' },
            { id: 'efc_efd', label: '🚚 EFC / EFD' },
            { id: 'ressuprimento_reabastecimento', label: '🪵 Abastecimento & Reabastecimento (R&R)' },
            { id: 'tmr', label: '🏬 TMR (Revendas)' }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedModule(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                selectedModule === tab.id
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-md scale-105'
                  : isDark 
                    ? 'bg-[#0d1218] text-slate-300 border-[#222d3a] hover:bg-[#1a222c] hover:text-white' 
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* FILTROS E PESQUISA */}
      <div className={`border rounded-2xl p-4 shadow-xs space-y-3 ${isDark ? 'bg-[#151b23] border-[#222d3a] text-slate-100' : 'bg-white border-slate-200'}`}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Busca por Texto */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar por código, nome ou responsável..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-9 pr-3 py-2 border rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-400 ${
                isDark ? 'bg-[#0d1218] border-[#222d3a] text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            />
          </div>

          {/* Filtro por Módulo/Área */}
          <div>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value as any)}
              className={`w-full px-3 py-2 border rounded-xl text-xs font-bold focus:outline-none focus:border-amber-400 cursor-pointer ${
                isDark ? 'bg-[#0d1218] border-[#222d3a] text-amber-300' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <option value="todos">📂 Todas as Áreas da Plataforma</option>
              {SOP_MODULES_LIST.map(m => (
                <option key={m.id} value={m.id} className={isDark ? 'bg-[#151b23] text-slate-100' : ''}>Module: {m.label}</option>
              ))}
            </select>
          </div>

          {/* Filtro por Escopo */}
          <div>
            <select
              value={selectedScope}
              onChange={(e) => setSelectedScope(e.target.value as any)}
              className={`w-full px-3 py-2 border rounded-xl text-xs font-bold focus:outline-none focus:border-amber-400 cursor-pointer ${
                isDark ? 'bg-[#0d1218] border-[#222d3a] text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <option value="todos" className={isDark ? 'bg-[#151b23]' : ''}>🌐 Todos os Escopos</option>
              <option value="global" className={isDark ? 'bg-[#151b23]' : ''}>🌐 Global (Toda a Plataforma)</option>
              <option value="compartilhado" className={isDark ? 'bg-[#151b23]' : ''}>🔗 Compartilhado entre Áreas</option>
              <option value="exclusivo" className={isDark ? 'bg-[#151b23]' : ''}>🔒 Exclusivo de uma Área</option>
            </select>
          </div>

          {/* Filtro por Status */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className={`w-full px-3 py-2 border rounded-xl text-xs font-bold focus:outline-none focus:border-amber-400 cursor-pointer ${
                isDark ? 'bg-[#0d1218] border-[#222d3a] text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <option value="todos" className={isDark ? 'bg-[#151b23]' : ''}>⚡ Todos os Status</option>
              <option value="Ativo" className={isDark ? 'bg-[#151b23]' : ''}>✅ Ativo</option>
              <option value="Inativo" className={isDark ? 'bg-[#151b23]' : ''}>❌ Inativo</option>
            </select>
          </div>
        </div>
      </div>

      {/* CARDS LIST OF SOPS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSops.length === 0 ? (
          <div className={`col-span-full border rounded-2xl p-12 text-center ${isDark ? 'bg-[#151b23] border-[#222d3a] text-slate-400' : 'bg-white border-slate-200 text-slate-400'}`}>
            <BookOpen className="w-10 h-10 mx-auto mb-2 text-slate-500" />
            <p className="font-bold text-sm">Nenhum Padrão Operacional encontrado para estes filtros.</p>
          </div>
        ) : (
          filteredSops.map((sop) => (
            <div key={sop.id} className={`border rounded-2xl p-5 shadow-xs hover:border-amber-400/80 transition-all flex flex-col justify-between gap-4 ${isDark ? 'bg-[#151b23] border-[#222d3a] text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className={`font-mono text-[11px] font-black px-2.5 py-0.5 rounded-lg border ${isDark ? 'text-amber-300 bg-amber-500/10 border-amber-500/30' : 'text-emerald-700 bg-emerald-50 border-emerald-200'}`}>
                    {sop.codigo}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md flex items-center gap-1 ${
                      sop.escopo === 'global' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' :
                      sop.escopo === 'compartilhado' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                      'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    }`}>
                      {sop.escopo === 'global' ? <Globe className="w-3 h-3" /> : sop.escopo === 'compartilhado' ? <Share2 className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                      {sop.escopo}
                    </span>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      sop.status === 'Ativo' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-700 text-slate-300'
                    }`}>
                      {sop.status}
                    </span>
                  </div>
                </div>

                <h3 className={`font-extrabold text-sm leading-snug ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {sop.nome}
                </h3>

                <p className={`text-xs line-clamp-2 font-medium ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
                  {sop.objetivo || sop.descricao}
                </p>

                {/* Modulos Vinculados Badges */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {sop.escopo === 'global' ? (
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${isDark ? 'bg-[#0d1218] text-slate-300 border border-[#222d3a]' : 'bg-slate-100 text-slate-600'}`}>
                      Disponível em todas as 17 áreas
                    </span>
                  ) : (
                    sop.modulosVinculados.map(modId => {
                      const modLabel = SOP_MODULES_LIST.find(m => m.id === modId)?.label || modId;
                      return (
                        <span key={modId} className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${isDark ? 'bg-[#0d1218] text-amber-300 border border-amber-500/20' : 'bg-slate-100 text-slate-600'}`}>
                          {modLabel}
                        </span>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-slate-700">Resp: {sop.responsavel}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{sop.revisao} • {sop.dataRevisao}</p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setViewerSop(sop)}
                    className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
                    title="Visualizar Detalhes"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  {isManager && (
                    <>
                      <button
                        onClick={() => handleOpenEditModal(sop)}
                        className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
                        title="Editar Padrão"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(sop)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all cursor-pointer"
                        title="Excluir Padrão"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL EDIT / CREATE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto border border-slate-200 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base uppercase tracking-tight">
                    {editingSop ? 'Editar Padrão Operacional' : 'Cadastrar Novo Padrão Operacional (POP/LUP)'}
                  </h3>
                  <p className="text-xs text-slate-500">Defina os parâmetros do procedimento e as áreas com acesso.</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Código do Padrão</label>
                <input
                  type="text"
                  value={codigo}
                  onChange={e => setCodigo(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Nome do Padrão Operacional</label>
                <input
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Ex: Padrão de Separação de Paletes no Picking"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Objetivo</label>
              <input
                type="text"
                value={objetivo}
                onChange={e => setObjetivo(e.target.value)}
                placeholder="Ex: Eliminar avarias durante a movimentação e garantir a segurança ergonômica."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Descrição Detalhada</label>
              <textarea
                rows={2}
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* ESCOPO E VÍNCULOS DE MÓDULO */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <label className="block text-[11px] font-black uppercase text-slate-700">
                Escopo de Disponibilidade do Padrão
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setEscopo('global')}
                  className={`p-2.5 rounded-xl text-xs font-black border text-left cursor-pointer transition-all flex items-center gap-2 ${
                    escopo === 'global' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  <div>
                    <p>Global</p>
                    <p className="text-[9px] font-normal opacity-80">Todas as 17 áreas</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setEscopo('compartilhado')}
                  className={`p-2.5 rounded-xl text-xs font-black border text-left cursor-pointer transition-all flex items-center gap-2 ${
                    escopo === 'compartilhado' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Share2 className="w-4 h-4" />
                  <div>
                    <p>Compartilhado</p>
                    <p className="text-[9px] font-normal opacity-80">Áreas selecionadas</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setEscopo('exclusivo')}
                  className={`p-2.5 rounded-xl text-xs font-black border text-left cursor-pointer transition-all flex items-center gap-2 ${
                    escopo === 'exclusivo' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  <div>
                    <p>Exclusivo</p>
                    <p className="text-[9px] font-normal opacity-80">Apenas 1 área</p>
                  </div>
                </button>
              </div>

              {escopo !== 'global' && (
                <div className="pt-2">
                  <p className="text-[10px] font-black uppercase text-slate-500 mb-2">
                    Selecione as Áreas Vinculadas ({modulosVinculados.length} selecionadas):
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto p-2 bg-white rounded-xl border border-slate-200">
                    {SOP_MODULES_LIST.map(mod => {
                      const isChecked = modulosVinculados.includes(mod.id);
                      return (
                        <label key={mod.id} className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer p-1 rounded hover:bg-slate-50">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleModuloVinculado(mod.id)}
                            className="rounded text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>{mod.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* PASSO A PASSO */}
            <div className="space-y-2">
              <label className="block text-[11px] font-black uppercase text-slate-500">Passo a Passo Operacional</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={passoTexto}
                  onChange={e => setPassoTexto(e.target.value)}
                  placeholder="Digite o passo e clique em Adicionar..."
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleAddPasso}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800"
                >
                  Adicionar
                </button>
              </div>

              <div className="space-y-1 mt-2">
                {passosList.map((passo, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-xs font-semibold border border-slate-200">
                    <span>{passo}</span>
                    <button type="button" onClick={() => handleRemovePasso(idx)} className="text-rose-500 hover:text-rose-700">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* ANEXAR DOCUMENTO PDF / PADRÃO OFICIAL */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-[11px] font-black uppercase text-slate-700">
                📄 Anexar Documento PDF / Padrão Oficial do Processo
              </label>

              <div className="flex flex-col gap-2">
                <label className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 rounded-xl p-3 flex items-center justify-center gap-3 cursor-pointer transition-colors">
                  <Paperclip className="w-5 h-5 text-emerald-600" />
                  <div className="text-left">
                    <span className="text-xs font-extrabold text-slate-800 block">
                      Clique para importar o PDF do Padrão Operacional
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium block">
                      Disponibiliza o PDF completo para consulta no Repack, Quebras e Workstation
                    </span>
                  </div>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                {anexosList.length > 0 && (
                  <div className="space-y-1.5">
                    {anexosList.map((anexo, idx) => (
                      <div key={idx} className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="text-xs font-bold text-emerald-950 truncate">{anexo.nome}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAnexo(idx)}
                          className="text-rose-500 hover:text-rose-700 p-1 shrink-0"
                          title="Remover anexo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* RESPONSAVEL & REVISAO */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Revisão</label>
                <input
                  type="text"
                  value={revisao}
                  onChange={e => setRevisao(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Data Revisão</label>
                <input
                  type="date"
                  value={dataRevisao}
                  onChange={e => setDataRevisao(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Responsável</label>
                <input
                  type="text"
                  value={responsavel}
                  onChange={e => setResponsavel(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold cursor-pointer"
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveModal}
                className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-500 shadow-md cursor-pointer"
              >
                Salvar Padrão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEWER MODAL */}
      {viewerSop && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 border border-slate-200 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  {viewerSop.codigo}
                </span>
                <h3 className="font-black text-slate-900 text-base">{viewerSop.nome}</h3>
              </div>
              <button onClick={() => setViewerSop(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <p className="font-black uppercase text-[10px] text-slate-400">Objetivo</p>
                <p className="font-semibold text-slate-800">{viewerSop.objetivo}</p>
              </div>

              <div>
                <p className="font-black uppercase text-[10px] text-slate-400">Descrição</p>
                <p className="font-medium text-slate-600">{viewerSop.descricao}</p>
              </div>

              <div>
                <p className="font-black uppercase text-[10px] text-slate-400 mb-1">Passo a Passo</p>
                <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {viewerSop.passoAPasso?.map((step, idx) => (
                    <p key={idx} className="font-bold text-slate-800">{step}</p>
                  ))}
                </div>
              </div>

              {/* ANEXOS / PDF OFICIAL */}
              {viewerSop.anexos && viewerSop.anexos.length > 0 && (
                <div>
                  <p className="font-black uppercase text-[10px] text-emerald-700 mb-1">Documento Anexo Oficial (PDF)</p>
                  <div className="space-y-2">
                    {viewerSop.anexos.map((anexo, idx) => (
                      <div key={idx} className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-emerald-600 shrink-0" />
                          <div>
                            <span className="text-xs font-bold text-slate-900 block">{anexo.nome}</span>
                            <span className="text-[10px] text-emerald-700 font-medium">Documento oficial do padrão operacional</span>
                          </div>
                        </div>
                        {anexo.url && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => openPdfInNewTab(anexo.url, anexo.nome)}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Visualizar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => downloadPdfFile(anexo.url, anexo.nome)}
                              className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <span>Baixar</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* HISTÓRICO DE ALTERAÇÕES */}
              {viewerSop.historicoAlteracoes && viewerSop.historicoAlteracoes.length > 0 && (
                <div>
                  <p className="font-black uppercase text-[10px] text-slate-400 mb-1">Histórico de Revisões</p>
                  <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    {viewerSop.historicoAlteracoes.map((hist) => (
                      <div key={hist.id} className="flex justify-between font-mono text-[11px]">
                        <span>{hist.data} - {hist.alteracao}</span>
                        <span className="text-slate-400">({hist.usuario})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setViewerSop(null)}
                className="px-5 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL COMPILADOR DO MANUAL DE INSTRUÇÃO DPO */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
            
            <div className="p-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between border-b border-blue-800">
              <div className="flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-emerald-400" />
                <div>
                  <h3 className="text-base font-black text-white">Manual de Instrução Operacional — Pilar Armazém DPO</h3>
                  <p className="text-[11px] text-blue-200">Compilação Oficial de Padrões, Metas, RACI e LUPs da Unidade</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg cursor-pointer flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> Imprimir / PDF
                </button>
                <button
                  onClick={() => setShowManualModal(false)}
                  className="p-1.5 text-slate-300 hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto space-y-6 text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-950 font-sans print:bg-white print:text-black">
              <div className="text-center space-y-2 pb-6 border-b border-slate-200 dark:border-slate-800">
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 font-extrabold text-xs uppercase tracking-widest rounded-full">
                  Pau Brasil Distribuidora — Guarabira-PB
                </span>
                <h1 className="text-2xl font-black">Manual de Procedimentos Operacionais Padronizados</h1>
                <p className="text-xs text-slate-500">Documento dinâmico compilado em tempo real com base nos POPs ativos cadastrados.</p>
              </div>

              {sops.filter(s => s.status === 'Ativo').length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  Nenhum padrão ativo encontrado no cadastro.
                </div>
              ) : (
                sops.filter(s => s.status === 'Ativo').map((sop, idx) => (
                  <div key={sop.id} className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-black text-blue-600 bg-blue-50 dark:bg-blue-900/40 px-2.5 py-1 rounded-md">
                        #{idx + 1} — {sop.codigo}
                      </span>
                      <span className="text-[11px] text-slate-400 font-bold">{sop.revisao} ({sop.dataRevisao})</span>
                    </div>

                    <h2 className="text-base font-black text-slate-900 dark:text-white">{sop.nome}</h2>
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300"><strong>Objetivo:</strong> {sop.objetivo}</p>

                    {sop.passoAPasso && sop.passoAPasso.length > 0 && (
                      <div className="space-y-1 pt-2">
                        <span className="text-[11px] font-black uppercase text-slate-400 block">Passo a Passo Operacional:</span>
                        <ol className="list-decimal list-inside text-xs space-y-1 font-medium text-slate-700 dark:text-slate-300">
                          {sop.passoAPasso.map((p, i) => (
                            <li key={i}>{p}</li>
                          ))}
                        </ol>
                      </div>
                    )}

                    <div className="pt-2 text-[10px] text-slate-400 font-bold border-t border-slate-100 dark:border-slate-800 flex justify-between">
                      <span>Responsável: {sop.responsavel}</span>
                      <span>Escopo: {sop.escopo}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {deleteConfirmSop && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`max-w-md w-full rounded-2xl p-6 border shadow-2xl space-y-4 ${isDark ? 'bg-[#151b23] border-[#222d3a] text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base">Excluir Padrão Operacional</h3>
                <p className="text-xs text-slate-400">Esta ação é irreversível e removerá o documento da plataforma.</p>
              </div>
            </div>

            <div className={`p-3.5 rounded-xl border text-xs font-semibold space-y-1 ${isDark ? 'bg-[#0d1218] border-[#222d3a] text-amber-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
              <p><strong className="text-slate-400">Código:</strong> {deleteConfirmSop.codigo}</p>
              <p><strong className="text-slate-400">Nome:</strong> {deleteConfirmSop.nome}</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmSop(null)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${isDark ? 'bg-[#0d1218] text-slate-300 border-[#222d3a] hover:bg-[#1a222c]' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'}`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteSop}
                className="px-4 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white transition-all cursor-pointer shadow-md flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sim, Excluir</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
