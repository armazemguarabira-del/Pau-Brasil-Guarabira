import React, { useState, useEffect, useMemo } from 'react';
import { Usuario } from '../types';
import { Search, AlertTriangle, Clock, CheckCircle2, Play, MessageSquare, Send, ShieldCheck, FilterX, Trash2 } from 'lucide-react';
import { db } from '../firebase';

export interface ActionItem {
  id: string;
  titulo?: string;
  indicador?: string;
  desvioEncontrado?: string;
  descricao?: string;
  processo?: string;
  responsavel?: string;
  colaboradorId?: string;
  colaboradorNome?: string;
  criadoEm?: string;
  prazo?: string;
  limiteEm?: string;
  status: 'pendente' | 'em_andamento' | 'concluido' | 'Pendente' | 'Em Andamento' | 'Concluído';
  contramedida?: string;
  parecerColaborador?: string;
  resolvidaEm?: string;
  tipo?: string;
}

interface GuiaAcoesOperacionaisProps {
  user: Usuario;
  roleName: 'Ajudante' | 'Operador de Empilhadeira' | 'Conferente' | string;
}

export const GuiaAcoesOperacionais: React.FC<GuiaAcoesOperacionaisProps> = ({ user, roleName }) => {
  const [activeStatusTab, setActiveStatusTab] = useState<'pendentes' | 'andamento' | 'concluidas'>('pendentes');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionsList, setActionsList] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentsMap, setCommentsMap] = useState<Record<string, string>>({});

  // Fetch actions for user & role from Firestore and LocalStorage
  const loadActions = async () => {
    setLoading(true);
    let loaded: ActionItem[] = [];

    // 1. Try fetching from Firestore
    try {
      const { collection, getDocs } = await import('firebase/firestore');
      const snap = await getDocs(collection(db, 'acoes'));
      if (!snap.empty) {
        snap.docs.forEach(doc => {
          const data = doc.data();
          loaded.push({
            id: doc.id,
            titulo: data.titulo || data.indicador || data.desvioEncontrado || 'Ação Operacional',
            indicador: data.indicador || data.processo || 'Operação',
            desvioEncontrado: data.desvioEncontrado || data.descricao,
            descricao: data.descricao || data.contramedida || 'Acompanhar alinhamento operacional.',
            processo: data.processo || roleName,
            responsavel: data.responsavel || data.colaboradorNome || user.nome,
            colaboradorId: data.colaboradorId,
            colaboradorNome: data.colaboradorNome || data.colaborador,
            criadoEm: data.criadoEm || new Date().toISOString(),
            prazo: data.prazo || data.limiteEm || 'Prazo Padrão 7 Dias',
            limiteEm: data.limiteEm,
            status: data.status || 'pendente',
            contramedida: data.contramedida,
            parecerColaborador: data.parecerColaborador || data.comentario,
            resolvidaEm: data.resolvidaEm
          });
        });
      }
    } catch (err) {
      console.warn("Firestore acoes fetch error (using fallback):", err);
    }

    // 2. LocalStorage Fallback
    try {
      const local = localStorage.getItem('af_desvios_acoes_v2');
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) {
          parsed.forEach((item: any) => {
            // Ignorar ações marcadas como automáticas do sistema se houver
            if (item.isAutomatica || item.origem === 'automatica' || item.tipo === 'automatica') {
              return;
            }
            if (!loaded.some(a => a.id === item.id)) {
              loaded.push({
                id: String(item.id),
                titulo: item.indicador || item.desvioEncontrado || 'Tratativa Operacional',
                indicador: item.indicador || item.processo,
                desvioEncontrado: item.desvioEncontrado,
                descricao: item.contramedida || item.causaRaiz || 'Atendimento de ocorrência operacional.',
                processo: item.processo || roleName,
                responsavel: item.responsavelTratativa || item.responsavel || user.nome,
                criadoEm: item.dataCriacao || new Date().toISOString(),
                prazo: item.prazo || 'Prazo 7 Dias',
                status: item.status === 'Concluído' ? 'concluido' : item.status === 'Em Andamento' ? 'em_andamento' : 'pendente',
                contramedida: item.contramedida,
                parecerColaborador: item.observacao,
                resolvidaEm: item.dataConclusao
              });
            }
          });
        }
      }
    } catch (e) {}

    // Remover qualquer ação puramente automática do sistema
    loaded = loaded.filter(a => !(a.id.startsWith('auto-') || (a as any).isAutomatica));

    setActionsList(loaded);
    setLoading(false);
  };

  const handleClearAutomaticActions = () => {
    try {
      const local = localStorage.getItem('af_desvios_acoes_v2');
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter((item: any) => !item.id?.toString().startsWith('auto-') && !item.isAutomatica && item.origem !== 'automatica');
          localStorage.setItem('af_desvios_acoes_v2', JSON.stringify(cleaned));
        }
      }
      loadActions();
    } catch (e) {}
  };

  useEffect(() => {
    loadActions();
  }, [user.uid, roleName]);

  // Normalize status string
  const normalizeStatus = (statusStr: string): 'pendentes' | 'andamento' | 'concluidas' => {
    const s = (statusStr || '').toLowerCase();
    if (s.includes('conclu') || s.includes('fechad') || s.includes('resolv')) return 'concluidas';
    if (s.includes('andamento') || s.includes('tratativ') || s.includes('iniciad')) return 'andamento';
    return 'pendentes';
  };

  // Filter actions for current user & tab with ONLY search text input
  const filteredActions = useMemo(() => {
    const userClean = (user.nome || '').toLowerCase().trim();
    const roleClean = (roleName || '').toLowerCase().trim();

    return actionsList.filter(action => {
      // 1. Status match
      const currentTab = normalizeStatus(action.status);
      if (currentTab !== activeStatusTab) return false;

      // 2. User or Role relevance
      const respClean = (action.responsavel || '').toLowerCase();
      const colabClean = (action.colaboradorNome || '').toLowerCase();
      const procClean = (action.processo || '').toLowerCase();
      
      const isRelevant = 
        respClean.includes(userClean) || 
        colabClean.includes(userClean) || 
        procClean.includes(roleClean) ||
        respClean.includes('todos') ||
        respClean.includes(roleClean);

      if (!isRelevant) return false;

      // 3. Search term text filter ONLY
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase().trim();
      const title = (action.titulo || '').toLowerCase();
      const desc = (action.descricao || '').toLowerCase();
      const desvio = (action.desvioEncontrado || '').toLowerCase();
      const resp = (action.responsavel || '').toLowerCase();
      const proc = (action.processo || '').toLowerCase();

      return title.includes(term) || desc.includes(term) || desvio.includes(term) || resp.includes(term) || proc.includes(term);
    });
  }, [actionsList, activeStatusTab, user.nome, roleName, searchTerm]);

  // Action status updates
  const handleUpdateStatus = async (actionId: string, newStatus: 'em_andamento' | 'concluido', comment?: string) => {
    const dateNow = new Date().toISOString();
    const updated = actionsList.map(a => {
      if (a.id === actionId) {
        return {
          ...a,
          status: newStatus,
          parecerColaborador: comment || a.parecerColaborador || 'Atendimento iniciado pelo colaborador.',
          resolvidaEm: newStatus === 'concluido' ? dateNow : a.resolvidaEm
        };
      }
      return a;
    });

    setActionsList(updated);

    // Sync to Firestore
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'acoes', actionId), {
        status: newStatus === 'concluido' ? 'concluido' : 'em_andamento',
        parecerColaborador: comment || 'Atualizado via painel operacional',
        resolvidaEm: newStatus === 'concluido' ? dateNow : null
      });
    } catch (e) {
      console.warn("Could not sync action to Firestore:", e);
    }

    // Sync to LocalStorage
    try {
      localStorage.setItem('af_desvios_acoes_v2', JSON.stringify(updated));
    } catch (e) {}
  };

  const pendingCount = actionsList.filter(a => normalizeStatus(a.status) === 'pendentes').length;
  const inProgressCount = actionsList.filter(a => normalizeStatus(a.status) === 'andamento').length;
  const completedCount = actionsList.filter(a => normalizeStatus(a.status) === 'concluidas').length;

  return (
    <div className="space-y-4">
      {/* HEADER CARD */}
      <div className="p-4 bg-gradient-to-r from-[#0d1627] via-[#111c33] to-[#0d1627] border border-amber-500/30 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30 shrink-0">
            <ShieldCheck className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                GUIA DE AÇÕES - {roleName.toUpperCase()}
              </span>
            </div>
            <h3 className="text-sm md:text-base font-black text-white uppercase mt-1 tracking-tight">
              Ações Corretivas e de Melhoria
            </h3>
            <p className="text-xs text-slate-300 font-medium mt-0.5">
              Consulte e acompanhe suas tratativas em andamento e concluídas com total simplicidade.
            </p>
          </div>
        </div>

        {/* SEARCH INPUT & ACTIONS */}
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <div className="relative min-w-[200px] sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Pesquisar ação..."
              className="w-full bg-[#080e1a] border border-slate-700 focus:border-amber-400 text-slate-100 placeholder-slate-500 text-xs font-medium pl-9 pr-8 py-2 rounded-xl outline-none shadow-inner transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
              >
                <FilterX className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={handleClearAutomaticActions}
            title="Limpar ações automáticas antigas do sistema"
            className="px-3 py-2 bg-slate-800/80 hover:bg-rose-900/40 text-slate-300 hover:text-rose-200 border border-slate-700 hover:border-rose-500/50 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Limpar Automáticas</span>
          </button>
        </div>
      </div>

      {/* STATUS TABS - STRICTLY 3 TABS (PENDENTES, EM ANDAMENTO, CONCLUÍDA) */}
      <div className="grid grid-cols-3 gap-2 bg-[#090f1c] p-1.5 rounded-2xl border border-slate-800">
        <button
          type="button"
          onClick={() => setActiveStatusTab('pendentes')}
          className={`py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeStatusTab === 'pendentes'
              ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-400/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="truncate">Pendentes ({pendingCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveStatusTab('andamento')}
          className={`py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeStatusTab === 'andamento'
              ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Clock className="w-4 h-4 shrink-0" />
          <span className="truncate">Em Andamento ({inProgressCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveStatusTab('concluidas')}
          className={`py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeStatusTab === 'concluidas'
              ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="truncate">Concluídas ({completedCount})</span>
        </button>
      </div>

      {/* ACTION CARDS LIST */}
      {loading ? (
        <div className="p-8 text-center text-slate-400 font-bold text-xs bg-[#0b1222] border border-slate-800 rounded-2xl animate-pulse">
          Carregando suas ações operacionais...
        </div>
      ) : filteredActions.length === 0 ? (
        <div className="p-8 text-center bg-[#0d1627] border border-slate-800 rounded-2xl space-y-2">
          <ShieldCheck className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-xs font-bold text-slate-300 uppercase tracking-wide">
            Nenhuma ação encontrada nesta categoria.
          </p>
          <p className="text-[11px] text-slate-500">
            {searchTerm ? 'Tente alterar os termos da busca.' : 'Sua lista operacional está atualizada e sem pendências ativas!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredActions.map((action) => {
            const isPendente = activeStatusTab === 'pendentes';
            const isAndamento = activeStatusTab === 'andamento';
            const isConcluida = activeStatusTab === 'concluidas';

            return (
              <div
                key={action.id}
                className="bg-[#0b1222] border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-lg transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
                        {action.indicador || action.processo || roleName}
                      </span>
                      <h4 className="text-xs sm:text-sm font-black text-white mt-0.5 leading-snug">
                        {action.titulo || action.desvioEncontrado || 'Ação de Melhoria Operacional'}
                      </h4>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase shrink-0 border ${
                        isPendente
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                          : isAndamento
                          ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                          : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                      }`}
                    >
                      {isPendente ? 'Pendente' : isAndamento ? 'Em Andamento' : 'Concluída'}
                    </span>
                  </div>

                  {action.descricao && (
                    <p className="text-xs text-slate-300 bg-[#070c17] p-3 rounded-xl border border-slate-800/80 leading-relaxed">
                      {action.descricao}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400 font-mono pt-1">
                    <span>Responsável: <strong className="text-slate-200">{action.responsavel || user.nome}</strong></span>
                    <span>Prazo: <strong className="text-amber-300">{action.prazo || '7 Dias'}</strong></span>
                  </div>

                  {action.parecerColaborador && (
                    <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800 text-[11px]">
                      <span className="text-[10px] font-bold text-indigo-400 uppercase block">Comentário do Atendimento:</span>
                      <p className="text-slate-300 font-medium mt-0.5">{action.parecerColaborador}</p>
                    </div>
                  )}
                </div>

                {/* CONTROLS PER STATUS */}
                <div className="pt-3 border-t border-slate-800/80 mt-2">
                  {isPendente && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(action.id, 'em_andamento')}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Iniciar Atendimento</span>
                    </button>
                  )}

                  {isAndamento && (
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Adicione um parecer ou contramedida realizada..."
                        value={commentsMap[action.id] || ''}
                        onChange={e => setCommentsMap({ ...commentsMap, [action.id]: e.target.value })}
                        className="w-full bg-[#070c17] border border-slate-700 text-white placeholder-slate-500 text-xs p-2 rounded-xl outline-none focus:border-emerald-400"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const note = commentsMap[action.id] || 'Atendimento concluído conforme diretriz operacional.';
                          handleUpdateStatus(action.id, 'concluido', note);
                        }}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Concluir Ação</span>
                      </button>
                    </div>
                  )}

                  {isConcluida && (
                    <div className="flex items-center justify-between text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Ação Finalizada
                      </span>
                      {action.resolvidaEm && (
                        <span className="font-mono text-slate-400">
                          {new Date(action.resolvidaEm).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GuiaAcoesOperacionais;
