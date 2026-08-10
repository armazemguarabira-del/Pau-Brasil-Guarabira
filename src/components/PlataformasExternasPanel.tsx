import React, { useState, useEffect } from 'react';
import { Usuario } from '../types';
import { 
  ExternalLink, 
  Truck, 
  RefreshCw, 
  Edit3, 
  Save, 
  Copy, 
  Check, 
  Lock, 
  Globe, 
  Maximize2, 
  Link2, 
  Info, 
  X, 
  Plus, 
  Trash2, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowUpRight,
  Sliders,
  History
} from 'lucide-react';
import { safeGetLocalStorage, safeSetLocalStorage } from '../utils/safeLocalStorage';

export interface ExternalPlatformTool {
  id: string;
  name: string;
  category: string;
  url: string;
  description: string;
  instructions?: string;
  status: 'active' | 'maintenance' | 'pending';
  lastUpdatedBy?: string;
  lastUpdatedAt?: string;
  openMode: 'new_tab' | 'iframe';
  iconType: 'truck' | 'refresh' | 'custom';
}

export interface AccessLogItem {
  id: string;
  toolName: string;
  userName: string;
  userRole: string;
  timestamp: string;
  url: string;
}

const DEFAULT_PLATFORMS: ExternalPlatformTool[] = [
  {
    id: 'retorno-rota',
    name: 'Plataforma de Retorno de Rota',
    category: 'Logística & Acerto de Rota',
    url: 'https://retornoderota.paubrasil.com.br',
    description: 'Ferramenta de gestão operacional para controle, aferimento e liquidação de retornos de rotas de entrega e acertos com motoristas.',
    instructions: '1. Verifique as notas de retorno e vales emitidos.\n2. Insira a placa da carreta/caminhão e o código da rota.\n3. Confirme os acertos físicos com a equipe de recepção.',
    status: 'active',
    lastUpdatedBy: 'Sistema (Padrão)',
    lastUpdatedAt: new Date().toLocaleDateString('pt-BR'),
    openMode: 'new_tab',
    iconType: 'truck'
  },
  {
    id: 'trocas-reposicoes',
    name: 'Plataforma de Trocas e Reposições',
    category: 'Garantia & Gestão de Avarias',
    url: 'https://trocase-reposicoes.paubrasil.com.br',
    description: 'Ferramenta de gestão para registros de trocas de produtos avariados, solicitações de reposição imediata de estoque e canal de tratativas de cliente.',
    instructions: '1. Selecione a filial/revenda e o código do produto.\n2. Anexe o laudo técnico ou foto da avaria de fábrica/cliente.\n3. Finalize a solicitação para gerar a ordem de reposição no armazém.',
    status: 'active',
    lastUpdatedBy: 'Sistema (Padrão)',
    lastUpdatedAt: new Date().toLocaleDateString('pt-BR'),
    openMode: 'new_tab',
    iconType: 'refresh'
  }
];

interface PlataformasExternasPanelProps {
  user: Usuario;
  theme?: 'light' | 'dark';
}

export default function PlataformasExternasPanel({
  user,
  theme = 'dark'
}: PlataformasExternasPanelProps) {
  const isDark = theme !== 'light';
  const isManager = user.papel === 'admin' || user.papel === 'controle' || user.isControle || 
                    (user.cargo && (user.cargo.toLowerCase().includes('supervisor') || user.cargo.toLowerCase().includes('gestor')));

  const [tools, setTools] = useState<ExternalPlatformTool[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingTool, setEditingTool] = useState<ExternalPlatformTool | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewTool, setPreviewTool] = useState<ExternalPlatformTool | null>(null);
  const [accessLogs, setAccessLogs] = useState<AccessLogItem[]>([]);
  const [filterQuery, setFilterQuery] = useState('');

  // Form State for Editing / Creating
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formInstructions, setFormInstructions] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'maintenance' | 'pending'>('active');
  const [formOpenMode, setFormOpenMode] = useState<'new_tab' | 'iframe'>('new_tab');
  const [formIconType, setFormIconType] = useState<'truck' | 'refresh' | 'custom'>('custom');

  // Load tools & logs from storage
  useEffect(() => {
    const savedTools = safeGetLocalStorage<ExternalPlatformTool[]>('af_platform_tools_v1', DEFAULT_PLATFORMS);
    if (savedTools && Array.isArray(savedTools) && savedTools.length > 0) {
      setTools(savedTools);
    } else {
      setTools(DEFAULT_PLATFORMS);
      safeSetLocalStorage('af_platform_tools_v1', DEFAULT_PLATFORMS);
    }

    const savedLogs = safeGetLocalStorage<AccessLogItem[]>('af_platform_access_logs_v1', []);
    if (savedLogs && Array.isArray(savedLogs)) {
      setAccessLogs(savedLogs);
    }
  }, []);

  const saveToolsToStorage = (updatedTools: ExternalPlatformTool[]) => {
    setTools(updatedTools);
    safeSetLocalStorage('af_platform_tools_v1', updatedTools);
  };

  const saveLogsToStorage = (updatedLogs: AccessLogItem[]) => {
    setAccessLogs(updatedLogs);
    safeSetLocalStorage('af_platform_access_logs_v1', updatedLogs);
  };

  const handleOpenAccess = (tool: ExternalPlatformTool) => {
    if (!tool.url || tool.url.trim() === '') {
      alert('Nenhum link foi anexado para esta plataforma de gestão.');
      return;
    }

    let targetUrl = tool.url.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    // Register access log
    const newLog: AccessLogItem = {
      id: 'log-' + Date.now(),
      toolName: tool.name,
      userName: user.nome || 'Operador',
      userRole: user.cargo || user.papel || 'Colaborador',
      timestamp: new Date().toLocaleString('pt-BR'),
      url: targetUrl
    };

    const updatedLogs = [newLog, ...accessLogs].slice(0, 50); // Keep last 50
    saveLogsToStorage(updatedLogs);

    if (tool.openMode === 'iframe') {
      setPreviewTool({ ...tool, url: targetUrl });
    } else {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleCopyLink = (tool: ExternalPlatformTool) => {
    let targetUrl = tool.url.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }
    navigator.clipboard.writeText(targetUrl);
    setCopiedId(tool.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleEditTool = (tool: ExternalPlatformTool) => {
    if (!isManager) {
      alert('Acesso restrito. Apenas administradores e supervisores podem editar os links das ferramentas de gestão.');
      return;
    }
    setEditingTool(tool);
    setFormName(tool.name);
    setFormCategory(tool.category);
    setFormUrl(tool.url);
    setFormDescription(tool.description);
    setFormInstructions(tool.instructions || '');
    setFormStatus(tool.status);
    setFormOpenMode(tool.openMode);
    setFormIconType(tool.iconType);
    setIsModalOpen(true);
  };

  const handleNewTool = () => {
    if (!isManager) {
      alert('Acesso restrito. Apenas administradores e supervisores podem cadastrar novas ferramentas de gestão.');
      return;
    }
    setEditingTool(null);
    setFormName('');
    setFormCategory('Ferramenta de Gestão');
    setFormUrl('');
    setFormDescription('');
    setFormInstructions('');
    setFormStatus('active');
    setFormOpenMode('new_tab');
    setFormIconType('custom');
    setIsModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName.trim()) {
      alert('Por favor, informe o nome da ferramenta de gestão.');
      return;
    }

    if (!formUrl.trim()) {
      alert('Por favor, insira o link/URL de redirecionamento.');
      return;
    }

    let finalUrl = formUrl.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }

    let updatedList: ExternalPlatformTool[];

    if (editingTool) {
      updatedList = tools.map(t => {
        if (t.id === editingTool.id) {
          return {
            ...t,
            name: formName.trim(),
            category: formCategory.trim() || 'Ferramenta de Gestão',
            url: finalUrl,
            description: formDescription.trim(),
            instructions: formInstructions.trim(),
            status: formStatus,
            openMode: formOpenMode,
            iconType: formIconType,
            lastUpdatedBy: user.nome || 'Administrador',
            lastUpdatedAt: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          };
        }
        return t;
      });
    } else {
      const newTool: ExternalPlatformTool = {
        id: 'tool-' + Date.now(),
        name: formName.trim(),
        category: formCategory.trim() || 'Ferramenta de Gestão',
        url: finalUrl,
        description: formDescription.trim(),
        instructions: formInstructions.trim(),
        status: formStatus,
        openMode: formOpenMode,
        iconType: formIconType,
        lastUpdatedBy: user.nome || 'Administrador',
        lastUpdatedAt: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      };
      updatedList = [...tools, newTool];
    }

    saveToolsToStorage(updatedList);
    setIsModalOpen(false);
    setEditingTool(null);
  };

  const handleDeleteTool = (toolId: string) => {
    if (!isManager) {
      alert('Acesso restrito. Apenas administradores podem remover ferramentas.');
      return;
    }
    if (confirm('Tem certeza que deseja remover esta ferramenta de gestão?')) {
      const updatedList = tools.filter(t => t.id !== toolId);
      saveToolsToStorage(updatedList);
    }
  };

  const filteredTools = tools.filter(t => 
    t.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
    t.category.toLowerCase().includes(filterQuery.toLowerCase()) ||
    t.description.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className={`space-y-6 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
      
      {/* HEADER BANNER */}
      <div className={`border rounded-2xl p-6 relative overflow-hidden shadow-xl ${
        isDark 
          ? 'bg-gradient-to-r from-[#0d1527] via-[#111c35] to-[#0b1222] border-slate-800' 
          : 'bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white border-blue-800'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="flex items-start gap-4">
            <div className="p-3.5 bg-amber-500/20 border border-amber-500/30 rounded-2xl text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
              <ExternalLink className="w-8 h-8" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-md border border-amber-500/20">
                  Ferramentas de Gestão & Redirecionamentos
                </span>
                <span className="text-[10px] font-bold text-slate-300 uppercase font-mono">
                  {tools.length} Plataforma(s) Anexada(s)
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight mt-1">
                Plataforma de Retorno de Rota, Trocas & Reposições
              </h1>
              <p className="text-xs text-slate-300 font-medium max-w-3xl mt-1 leading-relaxed">
                Central oficial de links das Ferramentas de Gestão. Acesse diretamente a <strong className="text-amber-300">Plataforma de Retorno de Rota</strong> e a <strong className="text-amber-300">Plataforma de Trocas e Reposições</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {isManager ? (
              <button
                onClick={handleNewTool}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-lg transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Anexar Nova Ferramenta</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-amber-300 text-xs font-bold">
                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Modo Operacional (Colaborador)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FILTER & INFO BAR */}
      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
        isDark ? 'bg-[#111a30] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
          <Info className="w-4 h-4 text-sky-400 shrink-0" />
          <span>Clique em <strong className="text-sky-400">"Acessar Plataforma"</strong> para ser redirecionado com segurança para a ferramenta externa em nova aba.</span>
        </div>

        <input 
          type="text" 
          placeholder="Filtrar ferramentas..."
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          className={`w-full sm:w-64 px-3 py-1.5 text-xs rounded-lg border outline-none font-sans ${
            isDark ? 'bg-[#0b1222] border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-800'
          }`}
        />
      </div>

      {/* TOOLS CARDS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredTools.map((tool) => {
          const isRetorno = tool.id === 'retorno-rota' || tool.iconType === 'truck';
          const isTrocas = tool.id === 'trocas-reposicoes' || tool.iconType === 'refresh';

          return (
            <div 
              key={tool.id} 
              className={`border rounded-2xl p-6 transition-all duration-300 relative flex flex-col justify-between shadow-lg ${
                isDark 
                  ? 'bg-[#111a30] border-slate-800 hover:border-slate-700' 
                  : 'bg-white border-slate-200 hover:shadow-xl'
              }`}
            >
              <div>
                {/* CARD HEADER */}
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800/80">
                  <div className="flex items-center gap-3.5">
                    <div className={`p-3 rounded-2xl border flex items-center justify-center shrink-0 ${
                      isRetorno 
                        ? 'bg-blue-500/15 border-blue-500/30 text-blue-400' 
                        : isTrocas 
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                          : 'bg-purple-500/15 border-purple-500/30 text-purple-400'
                    }`}>
                      {isRetorno ? (
                        <Truck className="w-7 h-7" />
                      ) : isTrocas ? (
                        <RefreshCw className="w-7 h-7" />
                      ) : (
                        <Globe className="w-7 h-7" />
                      )}
                    </div>

                    <div>
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${
                        isRetorno 
                          ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' 
                          : isTrocas 
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                      }`}>
                        {tool.category}
                      </span>
                      <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight mt-1">
                        {tool.name}
                      </h3>
                    </div>
                  </div>

                  {/* STATUS BADGE & ADMIN CONTROLS */}
                  <div className="flex items-center gap-2">
                    {tool.status === 'active' ? (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        Ativo
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-wider">
                        Em Manutenção
                      </span>
                    )}

                    {isManager && (
                      <div className="flex items-center gap-1 ml-1">
                        <button
                          onClick={() => handleEditTool(tool)}
                          className="p-2 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="Editar/Anexar Link da Ferramenta"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {tools.length > 2 && (
                          <button
                            onClick={() => handleDeleteTool(tool.id)}
                            className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                            title="Excluir Ferramenta"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* DESCRIPTION */}
                <p className="text-xs text-slate-300 font-medium leading-relaxed my-4">
                  {tool.description}
                </p>

                {/* INSTRUCTIONS / GUIDELINES BOX */}
                {tool.instructions && (
                  <div className={`p-3.5 rounded-xl border mb-4 text-xs ${
                    isDark ? 'bg-[#0b1222]/80 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}>
                    <div className="font-bold text-amber-400 uppercase text-[10px] tracking-wider mb-1 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Instruções de Operação:
                    </div>
                    <p className="whitespace-pre-line font-mono text-[11px] leading-relaxed">
                      {tool.instructions}
                    </p>
                  </div>
                )}

                {/* ATTACHED LINK DISPLAY */}
                <div className="space-y-1.5 my-4">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center justify-between">
                    <span>Link Anexado (Redirecionamento Oficial):</span>
                    {tool.lastUpdatedAt && (
                      <span className="text-[9px] text-slate-500 font-mono">
                        Atualizado em {tool.lastUpdatedAt}
                      </span>
                    )}
                  </label>
                  <div className={`flex items-center gap-2 p-2.5 rounded-xl border font-mono text-xs overflow-hidden ${
                    isDark ? 'bg-[#080d19] border-slate-700/80 text-sky-400' : 'bg-slate-100 border-slate-300 text-blue-700'
                  }`}>
                    <Link2 className="w-4 h-4 shrink-0 text-slate-400" />
                    <span className="truncate flex-1 font-semibold">
                      {tool.url || 'Nenhum link anexado'}
                    </span>
                    <button
                      onClick={() => handleCopyLink(tool)}
                      className={`p-1.5 rounded-lg border transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-bold shrink-0 ${
                        copiedId === tool.id
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600'
                      }`}
                      title="Copiar Link para Área de Transferência"
                    >
                      {copiedId === tool.id ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* MAIN ACTION BUTTONS */}
              <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={() => handleOpenAccess(tool)}
                  className={`w-full sm:flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    isRetorno
                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/30'
                      : isTrocas
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
                        : 'bg-sky-600 hover:bg-sky-500 text-white'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4 stroke-[3]" />
                  <span>Acessar Plataforma de Gestão</span>
                </button>

                {tool.openMode === 'iframe' && (
                  <button
                    onClick={() => setPreviewTool(tool)}
                    className="w-full sm:w-auto py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Maximize2 className="w-4 h-4" />
                    <span>Visualizador Embutido</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ACCESS AUDIT LOG TABLE */}
      {accessLogs.length > 0 && (
        <div className={`border rounded-2xl p-5 space-y-3 ${
          isDark ? 'bg-[#111a30] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-2">
              <History className="w-4 h-4 text-amber-400" />
              Histórico Recente de Acessos e Redirecionamentos
            </h3>
            <span className="text-[10px] font-mono text-slate-500">
              Registros gravados localmente
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] uppercase font-black text-slate-400">
                  <th className="py-2 px-3">Data / Hora</th>
                  <th className="py-2 px-3">Colaborador</th>
                  <th className="py-2 px-3">Cargo / Função</th>
                  <th className="py-2 px-3">Plataforma Acessada</th>
                  <th className="py-2 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {accessLogs.slice(0, 10).map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30">
                    <td className="py-2 px-3 font-mono text-[11px] text-slate-400">{log.timestamp}</td>
                    <td className="py-2 px-3 font-bold text-white">{log.userName}</td>
                    <td className="py-2 px-3 text-slate-400 text-[11px] uppercase">{log.userRole}</td>
                    <td className="py-2 px-3 font-bold text-sky-400">{log.toolName}</td>
                    <td className="py-2 px-3 text-right">
                      <a 
                        href={log.url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-[10px] font-bold text-emerald-400 hover:underline inline-flex items-center gap-1"
                      >
                        <span>Reabrir</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ANEXAR OU EDITAR LINK DA FERRAMENTA */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-2xl border rounded-2xl p-6 shadow-2xl relative space-y-5 max-h-[90vh] overflow-y-auto ${
            isDark ? 'bg-[#0d1527] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-xl">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase tracking-tight text-white">
                    {editingTool ? 'Editar / Anexar Link da Ferramenta' : 'Cadastrar Nova Ferramenta de Gestão'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Insira a URL oficial de redirecionamento e as instruções operacionais para os colaboradores.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-300 block mb-1">
                    Nome da Plataforma / Ferramenta *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ex: Plataforma de Retorno de Rota"
                    className={`w-full px-3 py-2 text-xs rounded-xl border outline-none font-bold ${
                      isDark ? 'bg-[#080d19] border-slate-700 text-white focus:border-amber-400' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-300 block mb-1">
                    Categoria
                  </label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="Ex: Logística & Acerto de Rota"
                    className={`w-full px-3 py-2 text-xs rounded-xl border outline-none ${
                      isDark ? 'bg-[#080d19] border-slate-700 text-white focus:border-amber-400' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-amber-400 block mb-1 flex items-center justify-between">
                  <span>URL / Link de Redirecionamento (Destino) *</span>
                  <span className="text-[10px] text-slate-400 font-normal">Ex: https://meusistema.com.br</span>
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="url"
                    required
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    placeholder="https://retornoderota.paubrasil.com.br"
                    className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl border outline-none font-mono font-bold ${
                      isDark ? 'bg-[#080d19] border-amber-500/50 text-amber-300 focus:border-amber-400' : 'bg-slate-50 border-slate-300 text-blue-700'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-300 block mb-1">
                  Descrição da Ferramenta
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Resumo das funcionalidades desta plataforma de gestão..."
                  className={`w-full p-3 text-xs rounded-xl border outline-none font-sans ${
                    isDark ? 'bg-[#080d19] border-slate-700 text-white focus:border-amber-400' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-300 block mb-1">
                  Instruções Passo a Passo de Operação (Opcional)
                </label>
                <textarea
                  rows={3}
                  value={formInstructions}
                  onChange={(e) => setFormInstructions(e.target.value)}
                  placeholder="Instruções para o operador ao acessar a plataforma..."
                  className={`w-full p-3 text-xs rounded-xl border outline-none font-mono ${
                    isDark ? 'bg-[#080d19] border-slate-700 text-slate-200 focus:border-amber-400' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-300 block mb-1">
                    Status da Plataforma
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className={`w-full px-3 py-2 text-xs rounded-xl border outline-none font-bold ${
                      isDark ? 'bg-[#080d19] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="active">Online / Ativo</option>
                    <option value="maintenance">Em Manutenção</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-300 block mb-1">
                    Modo de Abertura
                  </label>
                  <select
                    value={formOpenMode}
                    onChange={(e) => setFormOpenMode(e.target.value as any)}
                    className={`w-full px-3 py-2 text-xs rounded-xl border outline-none font-bold ${
                      isDark ? 'bg-[#080d19] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="new_tab">Nova Aba (Recomendado)</option>
                    <option value="iframe">Visualizador Embutido</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-300 block mb-1">
                    Ícone
                  </label>
                  <select
                    value={formIconType}
                    onChange={(e) => setFormIconType(e.target.value as any)}
                    className={`w-full px-3 py-2 text-xs rounded-xl border outline-none font-bold ${
                      isDark ? 'bg-[#080d19] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="truck">Caminhão (Retorno de Rota)</option>
                    <option value="refresh">Trocas & Reposições</option>
                    <option value="custom">Globo / Padrão</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-lg flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar & Anexar Link</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EMBEDDED PREVIEW MODAL IF IFRAME MODE */}
      {previewTool && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex flex-col p-4">
          <div className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-t-2xl text-white">
            <div className="flex items-center gap-3">
              <span className="font-black text-sm uppercase text-amber-400">
                {previewTool.name}
              </span>
              <span className="text-xs font-mono text-slate-400 hidden sm:inline">
                {previewTool.url}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={previewTool.url}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold text-xs flex items-center gap-1"
              >
                <span>Abrir em Nova Aba</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => setPreviewTool(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 bg-white rounded-b-2xl overflow-hidden border border-slate-800 border-t-0 relative">
            <iframe
              src={previewTool.url}
              title={previewTool.name}
              className="w-full h-full border-none"
            />
          </div>
        </div>
      )}

    </div>
  );
}
