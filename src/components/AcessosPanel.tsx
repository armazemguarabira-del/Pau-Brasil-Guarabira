import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where, deleteDoc, doc } from 'firebase/firestore';
import { Usuario, Empresa } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Clock, 
  User, 
  Eye, 
  RefreshCw, 
  Search, 
  Filter, 
  Calendar, 
  TrendingUp, 
  LogOut, 
  Activity,
  ArrowRight,
  Sparkles,
  Users,
  CheckCircle,
  HelpCircle,
  Lock,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

interface AcessosPanelProps {
  user: Usuario;
  empresa: Empresa | null;
}

interface ActivityItem {
  aba: string;
  hora: string;
  timestamp: string;
}

interface AcessoSession {
  id: string;
  _docId?: string;
  empresaId: string;
  userId: string;
  nome: string;
  email: string;
  papel: string;
  loginEm: string;
  loginData: string;
  loginHora: string;
  logoutEm: string | null;
  ultimoAcesso: string;
  abasAcessadas: string[];
  atividades: ActivityItem[];
  ativo: boolean;
}

export default function AcessosPanel({ user, empresa }: AcessosPanelProps) {
  const [sessions, setSessions] = useState<AcessoSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'ativos' | 'finalizados'>('todos');
  const [selectedSession, setSelectedSession] = useState<AcessoSession | null>(null);
  
  const empresaId = empresa?.id || 'demo';

  // Format tab names to be friendly and readable
  const getFriendlyTabName = (tabId: string): string => {
    const mapping: Record<string, string> = {
      'visao-geral': 'Visão Geral do Pátio',
      'repack-dashboard': 'Dashboard Repack',
      'despejo-dashboard': 'Dashboard Despejo',
      'logistica-dashboard': 'Dashboard Logística',
      'quebras-dashboard': 'Dashboard Quebras',
      'fefo-dashboard': 'Dashboard FEFO (Validades)',
      'blitz-dashboard': 'Dashboard Blitz',
      'picking-dashboard': 'Dashboard Picking',
      'repack': 'Operação Repack',
      'despejo': 'Operação Despejo',
      'armazem': 'Operação EFC / EFD',
      'quebras': 'Operação Quebras',
      'validades': 'Operação Validade',
      'refugo': 'Operação Retorno de Rota',
      'empilhador': 'Operação Picking',
      'conferente': 'Operação Conferênte',
      'registros': 'Registros de Setores',
      'controle': 'Painel de Controle',
      'exportar': 'Exportar Base',
      'firebase': 'Status Firestore',
      'acessos': 'Controle de Acessos',
      'landing': 'Tela Inicial / Landing'
    };
    return mapping[tabId] || tabId.toUpperCase();
  };

  // Sync access sessions from Firestore or fallback
  useEffect(() => {
    setLoading(true);
    if (!db) {
      // Fallback local recovery
      const saved = localStorage.getItem(`local_acessos_${empresaId}`);
      if (saved) {
        setSessions(JSON.parse(saved));
      } else {
        // Generate mock data for first view if completely empty
        const now = new Date();
        const firstSession: AcessoSession = {
          id: 'mock-1',
          empresaId,
          userId: user.uid,
          nome: user.nome,
          email: user.email,
          papel: user.papel || 'admin',
          loginEm: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
          loginData: now.toLocaleDateString('pt-BR'),
          loginHora: new Date(now.getTime() - 10 * 60 * 1000).toLocaleTimeString('pt-BR', { hour12: false }),
          logoutEm: null,
          ultimoAcesso: now.toISOString(),
          abasAcessadas: ['visao-geral', 'acessos'],
          atividades: [
            { aba: 'visao-geral', hora: new Date(now.getTime() - 10 * 60 * 1000).toLocaleTimeString('pt-BR', { hour12: false }), timestamp: new Date(now.getTime() - 10 * 60 * 1000).toISOString() },
            { aba: 'acessos', hora: now.toLocaleTimeString('pt-BR', { hour12: false }), timestamp: now.toISOString() }
          ],
          ativo: true
        };
        const defaultList = [firstSession];
        setSessions(defaultList);
        localStorage.setItem(`local_acessos_${empresaId}`, JSON.stringify(defaultList));
      }
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'acessos'), where('empresaId', '==', empresaId));
    
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map(doc => ({ 
        id: doc.id,
        _docId: doc.id, 
        ...doc.data() 
      } as AcessoSession));

      // Sort by login time descending
      rows.sort((a, b) => (b.loginEm || '').localeCompare(a.loginEm || ''));
      setSessions(rows);
      setLoading(false);
    }, (error) => {
      console.error("Error loading access sessions from Firestore:", error);
      setLoading(false);
    });

    return () => unsub();
  }, [empresaId]);

  // Clean a session log safely
  const handleDeleteSession = async (sessId: string) => {
    if (!confirm('Deseja realmente remover este registro de acesso?')) return;
    try {
      if (db && !sessId.startsWith('local_') && !sessId.startsWith('mock-')) {
        await deleteDoc(doc(db, 'acessos', sessId));
      } else {
        const remaining = sessions.filter(s => s.id !== sessId);
        setSessions(remaining);
        localStorage.setItem(`local_acessos_${empresaId}`, JSON.stringify(remaining));
      }
      if (selectedSession?.id === sessId) {
        setSelectedSession(null);
      }
    } catch (e: any) {
      alert('Erro ao excluir sessão de acesso: ' + e.message);
    }
  };

  // Clear all logs
  const handleClearAllLogs = async () => {
    if (!confirm('ATENÇÃO: Deseja realmente remover TODOS os registros de segurança do histórico desta unidade? Esta ação é irreversível.')) return;
    try {
      setLoading(true);
      if (db) {
        // Since we cannot run bulk deletes easily on client side without a backend server, 
        // we can delete the ones we loaded in state sequentially
        for (const s of sessions) {
          if (s._docId) {
            await deleteDoc(doc(db, 'acessos', s._docId));
          }
        }
      }
      setSessions([]);
      localStorage.setItem(`local_acessos_${empresaId}`, JSON.stringify([]));
      setSelectedSession(null);
      alert('Histórico de segurança limpo com sucesso.');
    } catch (e: any) {
      alert('Erro ao limpar histórico: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper to format ISO to display readable time/date
  const formatDateTime = (isoStr: string | null) => {
    if (!isoStr) return '—';
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString('pt-BR') + ' às ' + date.toLocaleTimeString('pt-BR', { hour12: false });
    } catch {
      return isoStr;
    }
  };

  // Get duration of session
  const getSessionDuration = (sess: AcessoSession) => {
    const start = new Date(sess.loginEm).getTime();
    const end = sess.logoutEm ? new Date(sess.logoutEm).getTime() : new Date(sess.ultimoAcesso).getTime();
    
    const diffMs = end - start;
    if (diffMs <= 0) return 'Menos de 1 min';
    
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} min`;
    
    const diffHours = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;
    return `${diffHours}h ${remainingMins}m`;
  };

  // Filtering logs
  const filteredSessions = sessions.filter(sess => {
    // Search query match
    const queryLower = searchTerm.toLowerCase().trim();
    const matchesSearch = queryLower === '' || 
      sess.nome.toLowerCase().includes(queryLower) || 
      sess.email.toLowerCase().includes(queryLower) ||
      (sess.papel || '').toLowerCase().includes(queryLower);

    // Status filter match
    if (statusFilter === 'ativos') {
      return matchesSearch && sess.ativo;
    }
    if (statusFilter === 'finalizados') {
      return matchesSearch && !sess.ativo;
    }
    return matchesSearch;
  });

  // Analytics helper variables
  const totalLogsCount = sessions.length;
  const activeSessionsCount = sessions.filter(s => s.ativo).length;
  
  // Calculate most accessed abas
  const getMostVisitedTabs = () => {
    const counts: Record<string, number> = {};
    sessions.forEach(s => {
      (s.abasAcessadas || []).forEach(aba => {
        counts[aba] = (counts[aba] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .map(([aba, count]) => ({ aba, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  const mostVisitedTabs = getMostVisitedTabs();

  return (
    <div className="flex flex-col gap-6">
      
      {/* HEADER BAR */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#11151c] to-[#18212e] border-b border-[#222d3a] rounded-t-xl -mx-6 md:-mx-12 -mt-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Shield className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <span className="font-sans font-black text-xs tracking-widest text-indigo-400 uppercase block">AUDITORIA DE SEGURANÇA</span>
            <span className="text-[9px] text-[#6a7d92] tracking-widest uppercase font-bold block mt-0.5">Rastreabilidade completa de usuários, sessões e navegação</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleClearAllLogs}
            disabled={sessions.length === 0}
            className="py-1 px-2.5 rounded bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
          >
            Limpar Histórico
          </button>
        </div>
      </div>

      {/* KPI BOARD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* KPI 1 */}
        <div className="g-card p-4.5 border-l-4 border-l-indigo-400 flex flex-col justify-between">
          <div>
            <span className="text-[9px] uppercase font-bold text-[#6a7d92] tracking-widest block">Total de Sessões Registradas</span>
            <span className="font-mono text-3xl font-black text-snow block mt-2">{totalLogsCount}</span>
          </div>
          <span className="text-[10px] text-[#6a7d92] mt-2 block">
            Histórico acumulado de conexões à plataforma
          </span>
        </div>

        {/* KPI 2 */}
        <div className="g-card p-4.5 border-l-4 border-l-emerald-400 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center">
              <span className="text-[9px] uppercase font-bold text-[#6a7d92] tracking-widest block">Sessões Ativas no Momento</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <span className="font-mono text-3xl font-black text-snow block mt-2">{activeSessionsCount}</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-medium mt-2 block flex items-center gap-1">
            • Monitorando acessos concorrentes em tempo real
          </span>
        </div>

        {/* KPI 3 */}
        <div className="g-card p-4.5 border-l-4 border-l-indigo-500 flex flex-col justify-between">
          <div>
            <span className="text-[9px] uppercase font-bold text-[#6a7d92] tracking-widest block">Nível de Rastreabilidade</span>
            <span className="font-sans text-xs font-bold text-snow block mt-2 bg-[#1a2030] px-2.5 py-1.5 rounded-lg border border-[#222d3a] w-fit">
              🔒 ALTO PADRÃO (DPO Compliance)
            </span>
          </div>
          <span className="text-[10px] text-[#6a7d92] mt-2 block">
            Segurança de ponta a ponta sem cookies de rastreio
          </span>
        </div>

      </div>

      {/* CORE SPLIT SCREEN */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: FILTER & MAIN SESSIONS LIST */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          
          <div className="g-card p-5 flex flex-col gap-4">
            
            {/* Filter and search bar */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              
              {/* Search input */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6a7d92]" />
                <input 
                  type="text"
                  placeholder="Pesquisar por nome, e-mail ou cargo..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="g-input pl-9.5 pr-4 py-2 text-xs w-full"
                />
              </div>

              {/* Status Tabs */}
              <div className="flex gap-1.5 bg-[#11151c] p-1 rounded-xl border border-[#1c2530] w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setStatusFilter('todos')}
                  className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${statusFilter === 'todos' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-[#6a7d92] hover:text-white'}`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('ativos')}
                  className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${statusFilter === 'ativos' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-[#6a7d92] hover:text-white'}`}
                >
                  Ativos ({activeSessionsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('finalizados')}
                  className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${statusFilter === 'finalizados' ? 'bg-[#1c2530] text-snow' : 'text-[#6a7d92] hover:text-white'}`}
                >
                  Finalizados
                </button>
              </div>

            </div>

            {/* Main Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#222d3a] text-[#6a7d92] font-bold uppercase text-[9px] tracking-widest">
                    <th className="py-3 px-3">Usuário</th>
                    <th className="py-3 px-3">Permissão</th>
                    <th className="py-3 px-3">Entrada (Login)</th>
                    <th className="py-3 px-3">Saída (Logout)</th>
                    <th className="py-3 px-3 text-center">Tempo Conectado</th>
                    <th className="py-3 px-3 text-center">Abas Vistas</th>
                    <th className="py-3 px-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222d3a]/60 text-[#e8eef5]">
                  {filteredSessions.map((sess) => {
                    const isSelected = selectedSession?.id === sess.id;
                    return (
                      <tr 
                        key={sess.id} 
                        onClick={() => setSelectedSession(sess)}
                        className={`transition-colors cursor-pointer group ${isSelected ? 'bg-indigo-500/5' : 'hover:bg-[#151b23]/30'}`}
                      >
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] ${sess.ativo ? 'bg-emerald-500/15 border border-emerald-500/20 text-emerald-400' : 'bg-indigo-500/10 border border-[#222d3a] text-slate-400'}`}>
                              <User className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold block leading-none text-snow group-hover:text-indigo-400 transition-colors">{sess.nome}</span>
                              <span className="text-[10px] text-[#6a7d92] block mt-0.5 max-w-[150px] truncate">{sess.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 uppercase text-[10px] font-mono">
                          <span className={`px-2 py-0.5 rounded font-black tracking-wider text-[9px] ${sess.papel === 'admin' ? 'bg-[#ef4444]/10 text-red-400 border border-[#ef4444]/15' : sess.papel === 'controle' ? 'bg-amber-500/10 text-amber-300 border border-amber-500/15' : 'bg-[#1e56f0]/10 text-blue-400 border border-[#1e56f0]/15'}`}>
                            {sess.papel || 'operador'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 font-mono text-[10px]">
                          <div>{sess.loginData}</div>
                          <div className="text-[#6a7d92] mt-0.5">{sess.loginHora}</div>
                        </td>
                        <td className="py-3.5 px-3 font-mono text-[10px]">
                          {sess.ativo ? (
                            <span className="flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-500/5 px-2 py-0.5 rounded-lg border border-emerald-500/15 w-fit">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                              ONLINE
                            </span>
                          ) : (
                            <div>
                              <span>{sess.logoutEm ? new Date(sess.logoutEm).toLocaleDateString('pt-BR') : '—'}</span>
                              <div className="text-[#6a7d92] mt-0.5">{sess.logoutEm ? new Date(sess.logoutEm).toLocaleTimeString('pt-BR', { hour12: false }) : '—'}</div>
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono text-[11px] font-bold">
                          {getSessionDuration(sess)}
                        </td>
                        <td className="py-3.5 px-3 text-center font-bold">
                          <span className="font-mono text-xs text-indigo-400 bg-indigo-500/5 px-2.5 py-0.5 rounded-full border border-indigo-500/15">
                            {(sess.abasAcessadas || []).length}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button 
                              type="button"
                              onClick={() => setSelectedSession(sess)}
                              className="p-1 px-2 bg-[#151b23] hover:bg-[#1a2030] border border-[#222d3a] text-indigo-400 rounded-lg transition-colors cursor-pointer"
                              title="Inspecionar Navegação"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              type="button"
                              onClick={() => handleDeleteSession(sess.id)}
                              className="p-1 px-2 hover:bg-red-500/15 text-[#6a7d92] hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                              title="Remover Registro"
                            >
                              <LogOut className="w-3.5 h-3.5 rotate-180" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredSessions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[#6a7d92]">
                        <HelpCircle className="w-8 h-8 mx-auto mb-2 text-[#6a7d92]/40" />
                        Nenhum registro de acesso corresponde aos filtros aplicados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>

          {/* MOST ACCESSED ABAS STATS CARD */}
          <div className="g-card p-5">
            <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-indigo-400 flex items-center gap-1.5 mb-3.5">
              <TrendingUp className="w-4 h-4" /> Estatísticas: Áreas Mais Requisitadas do Sistema
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {mostVisitedTabs.map((item, index) => (
                <div key={item.aba} className="bg-[#11151c]/70 p-3 rounded-xl border border-[#1c2530] flex flex-col justify-between">
                  <div>
                    <span className="font-sans font-black text-[10px] text-indigo-400 uppercase tracking-widest block mb-0.5">#{index + 1} Lugar</span>
                    <span className="text-[11px] font-bold text-snow block truncate" title={getFriendlyTabName(item.aba)}>
                      {getFriendlyTabName(item.aba)}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline mt-4 border-t border-[#1c2530] pt-2">
                    <span className="text-[8.5px] text-[#6a7d92] uppercase font-bold">Acessos</span>
                    <span className="font-mono font-black text-xs text-[#e8eef5]">{item.count} vezes</span>
                  </div>
                </div>
              ))}
              {mostVisitedTabs.length === 0 && (
                <div className="col-span-5 text-center text-xs py-4 text-[#6a7d92]">
                  Nenhum dado estatístico disponível.
                </div>
              )}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: DETAIL TIMELINE INSPECTION */}
        <div className="lg:col-span-4">
          <AnimatePresence mode="wait">
            {selectedSession ? (
              <motion.div 
                key="session-details"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="g-card p-5 border border-[#222d3a] flex flex-col gap-4 relative"
              >
                {/* Header details */}
                <div className="border-b border-[#222d3a] pb-3.5">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <span className="text-[9px] uppercase font-black text-[#6a7d92] tracking-wider block">Auditoria Detalhada</span>
                    <button 
                      onClick={() => setSelectedSession(null)}
                      className="text-[#6a7d92] hover:text-white border-none bg-transparent cursor-pointer text-xs uppercase font-bold"
                    >
                      fechar ✕
                    </button>
                  </div>
                  <h3 className="font-sans font-black text-sm text-snow uppercase tracking-wide">{selectedSession.nome}</h3>
                  <span className="text-xs text-[#6a7d92] block font-mono truncate">{selectedSession.email}</span>
                  
                  <div className="flex items-center gap-1.5 mt-2.5">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${selectedSession.papel === 'admin' ? 'bg-red-500/10 text-red-400 border border-red-500/15' : 'bg-[#1e56f0]/10 text-blue-400 border border-[#1e56f0]/15'}`}>
                      {selectedSession.papel || 'operador'}
                    </span>
                    {selectedSession.ativo ? (
                      <span className="px-2 py-0.5 bg-emerald-500/15 border border-emerald-500/20 rounded text-[9px] font-black text-emerald-400 tracking-wider">
                        ATIVO AGORA
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-[#151b23] border border-[#222d3a] rounded text-[9px] font-black text-slate-400 tracking-wider">
                        FINALIZADO
                      </span>
                    )}
                  </div>
                </div>

                {/* Session facts */}
                <div className="flex flex-col gap-2 bg-[#11151c]/60 p-3 rounded-xl border border-[#1c2530] text-xs">
                  <div className="flex justify-between py-0.5">
                    <span className="text-[#6a7d92]">Entrada (Login)</span>
                    <span className="font-mono font-bold text-snow">{formatDateTime(selectedSession.loginEm)}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-[#6a7d92]">Último Acesso</span>
                    <span className="font-mono font-bold text-snow">{formatDateTime(selectedSession.ultimoAcesso)}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-[#6a7d92]">Saída (Logout)</span>
                    <span className="font-mono font-bold text-snow">
                      {selectedSession.ativo ? 'Em andamento' : formatDateTime(selectedSession.logoutEm)}
                    </span>
                  </div>
                  <div className="flex justify-between py-0.5 border-t border-[#1c2530] mt-1 pt-1.5">
                    <span className="text-[#6a7d92]">Duração Total</span>
                    <span className="font-mono font-black text-indigo-400">{getSessionDuration(selectedSession)}</span>
                  </div>
                </div>

                {/* Timeline title */}
                <div className="mt-1">
                  <span className="text-[10px] uppercase font-black text-indigo-400 tracking-wider block mb-2.5 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 animate-pulse" /> Linha do Tempo de Navegação
                  </span>

                  {/* Vertical Timeline */}
                  <div className="flex flex-col gap-4 pl-3.5 border-l-2 border-l-[#222d3a] relative ml-1.5 max-h-[300px] overflow-y-auto pr-1">
                    {(selectedSession.atividades || []).map((act, index) => (
                      <div key={index} className="relative group">
                        
                        {/* Bullet circle */}
                        <div className="absolute -left-[20px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-400 border-2 border-[#07090d] group-hover:bg-emerald-400 transition-colors" />

                        <div className="flex flex-col">
                          <div className="flex justify-between items-baseline gap-2">
                            <span className="font-bold text-xs text-snow group-hover:text-indigo-400 transition-colors">
                              {getFriendlyTabName(act.aba)}
                            </span>
                            <span className="font-mono text-[9px] text-[#6a7d92] font-semibold">{act.hora}</span>
                          </div>
                          <span className="text-[9.5px] text-[#6a7d92] mt-0.5">
                            {index === 0 
                              ? 'Iniciou sessão e abriu o painel' 
                              : `Navegou para o setor ${getFriendlyTabName(act.aba)}`}
                          </span>
                        </div>

                      </div>
                    ))}
                    {(selectedSession.atividades || []).length === 0 && (
                      <div className="text-center py-4 text-xs text-[#6a7d92]">
                        Nenhuma atividade registrada na timeline.
                      </div>
                    )}
                  </div>
                </div>

                {/* Force Terminate active session button */}
                {selectedSession.ativo && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm(`Deseja forçar a finalização do acesso do usuário ${selectedSession.nome}? Isto irá desconectá-lo das sessões ativas.`)) return;
                      try {
                        const nowStr = new Date().toISOString();
                        if (db && !selectedSession.id.startsWith('local_')) {
                          const { updateDoc, doc } = await import('firebase/firestore');
                          await updateDoc(doc(db, 'acessos', selectedSession.id), {
                            logoutEm: nowStr,
                            ativo: false
                          });
                        } else {
                          const localSessions = JSON.parse(localStorage.getItem(`local_acessos_${empresaId}`) || '[]');
                          const idx = localSessions.findIndex((s: any) => s.id === selectedSession.id);
                          if (idx !== -1) {
                            localSessions[idx].logoutEm = nowStr;
                            localSessions[idx].ativo = false;
                            localStorage.setItem(`local_acessos_${empresaId}`, JSON.stringify(localSessions));
                            setSessions(localSessions);
                          }
                        }
                        setSelectedSession(null);
                        alert('Acesso finalizado com sucesso.');
                      } catch (e: any) {
                        alert('Erro ao finalizar sessão: ' + e.message);
                      }
                    }}
                    className="w-full mt-2 py-2.5 rounded-xl border border-rose-500/20 hover:border-rose-500/40 hover:bg-rose-500/10 text-rose-400 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Encerrar Sessão do Usuário
                  </button>
                )}

              </motion.div>
            ) : (
              <div className="g-card p-6 border border-[#222d3a]/60 bg-[#11151c]/30 text-center py-12 flex flex-col items-center justify-center">
                <Lock className="w-10 h-10 text-indigo-400/30 mb-3" />
                <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-indigo-400/80">Rastreabilidade em Tempo Real</h4>
                <p className="text-[11px] text-[#6a7d92] mt-1.5 leading-relaxed max-w-xs">
                  Selecione qualquer registro de acesso ou usuário na tabela ao lado para inspecionar sua linha do tempo, horários e histórico de abas navegadas.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>

      </div>

    </div>
  );
}
