import React, { useState, useEffect } from 'react';
import { db, isCustomFirebaseConnected } from '../firebase';
import { collection, addDoc, onSnapshot, query, where, deleteDoc, doc } from 'firebase/firestore';
import { Usuario, Empresa, RepackRow, RepackValidadeRow } from '../types';
import { PRODUCTS } from '../planosData';
import { TrendingUp, CheckCircle, Clock, Award, BarChart2, BookOpen, Users, FileText, ChevronDown, ChevronUp, AlertCircle, ShieldAlert } from 'lucide-react';

interface RepackPanelProps {
  user: Usuario;
  empresa: Empresa | null;
}

const REPACK_EMBALAGENS = [
  { nome: 'LATA 250', meta: '00:04:30' },
  { nome: 'LATA 269', meta: '00:04:30' },
  { nome: 'LATA 350', meta: '00:05:30' },
  { nome: 'LATA 473', meta: '00:05:30' },
  { nome: 'LONG NECK', meta: '00:06:00' },
  { nome: 'PET 1L', meta: '00:05:30' },
  { nome: 'PET 2L', meta: '00:05:00' },
  { nome: 'PET 500ml', meta: '00:05:00' },
  { nome: 'PET 200ml', meta: '00:04:30' },
  { nome: 'PET 2,5L', meta: '00:04:30' },
  { nome: 'PET 3,3L', meta: '00:04:00' },
  { nome: '600 OW', meta: '00:05:00' },
  { nome: '300 OW', meta: '00:04:00' },
];

export default function RepackPanel({ user, empresa }: RepackPanelProps) {
  const empresaId = empresa?.id || 'demo';
  const draftKey = `repack_draft_${empresaId}_${user.nome || 'guest'}`;

  // Helper to load safe initial state
  const getDraftValue = (key: string, defaultValue: any) => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed[key] !== undefined) return parsed[key];
      }
    } catch (e) {
      console.error(e);
    }
    return defaultValue;
  };

  const [embalagem, setEmbalagem] = useState<string>(() => getDraftValue('embalagem', REPACK_EMBALAGENS[0].nome));
  const [quantidade, setQuantidade] = useState<number>(() => getDraftValue('quantidade', 1));
  const [inicio, setInicio] = useState<string>(() => getDraftValue('inicio', ''));
  const [fim, setFim] = useState<string>(() => getDraftValue('fim', ''));
  const [duracao, setDuracao] = useState('00:00:00');
  const [statusMeta, setStatusMeta] = useState('—');
  const [activeTab, setActiveTab] = useState<'form' | 'stats' | 'hist' | 'validade' | 'raci' | 'pop' | 'lup'>('form');
  const [repackRows, setRepackRows] = useState<RepackRow[]>([]);
  const [registering, setRegistering] = useState(false);

  // State variables for Repack Validade tab
  const [vProdutoBusca, setVProdutoBusca] = useState<string>('');
  const [vSelectedProd, setVSelectedProd] = useState<{ codigo: number, descricao: string } | null>(null);
  const [vShowDropdown, setVShowDropdown] = useState(false);

  const [vQuantidade, setVQuantidade] = useState<number>(1);
  const [vValidade, setVValidade] = useState<string>('');
  const [vLocalizacao, setVLocalizacao] = useState<string>('repack'); // 'repack' or 'outro'
  const [vNomeManual, setVNomeManual] = useState<string>('');

  const [repackValidades, setRepackValidades] = useState<RepackValidadeRow[]>([]);
  const [vRegistering, setVRegistering] = useState(false);

  const [draftRestored, setDraftRestored] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return !!(parsed.inicio || parsed.fim || parsed.quantidade > 1 || parsed.embalagem !== REPACK_EMBALAGENS[0].nome);
      }
    } catch (e) {}
    return false;
  });
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});

  // Sync state with local draft saving
  useEffect(() => {
    const draftData = {
      embalagem,
      quantidade,
      inicio,
      fim
    };
    localStorage.setItem(draftKey, JSON.stringify(draftData));
  }, [embalagem, quantidade, inicio, fim, draftKey]);

  // Sync with prop updates / user changing
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setEmbalagem(parsed.embalagem || REPACK_EMBALAGENS[0].nome);
        setQuantidade(parsed.quantidade || 1);
        setInicio(parsed.inicio || '');
        setFim(parsed.fim || '');
        setDraftRestored(!!(parsed.inicio || parsed.fim || parsed.quantidade > 1 || parsed.embalagem !== REPACK_EMBALAGENS[0].nome));
      } else {
        setEmbalagem(REPACK_EMBALAGENS[0].nome);
        setQuantidade(1);
        setInicio('');
        setFim('');
        setDraftRestored(false);
      }
    } catch (e) {
      console.error(e);
    }
  }, [draftKey]);

  // Listen for navigation links from the sidebar to open RACI, POP, or LUP reference sections
  useEffect(() => {
    const handleSidebarAction = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      const action = customEvent.detail;
      if (action === 'raci') {
        setActiveTab('raci');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (action === 'pop') {
        setActiveTab('pop');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (action === 'lup') {
        setActiveTab('lup');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    window.addEventListener('repack-sidebar-action', handleSidebarAction);
    return () => {
      window.removeEventListener('repack-sidebar-action', handleSidebarAction);
    };
  }, []);

  const toggleDateGroup = (dateKey: string) => {
    setExpandedDates(prev => ({ ...prev, [dateKey]: !prev[dateKey] }));
  };

  const activeMeta = REPACK_EMBALAGENS.find((e) => e.nome === embalagem)?.meta || '00:00:00';

  // Helper formatting operations
  const pad2 = (num: number) => String(num).padStart(2, '0');
  const toSec = (hms: string) => {
    const [h = 0, m = 0, s = 0] = String(hms).split(':').map(Number);
    return h * 3600 + m * 60 + s;
  };
  const toHMS = (sec: number) => {
    sec = Math.max(0, Math.floor(sec));
    return [Math.floor(sec / 3600), Math.floor((sec % 3600) / 60), sec % 60]
      .map(pad2)
      .join(':');
  };
  const nowHHMMSS = () => {
    const n = new Date();
    return [n.getHours(), n.getMinutes(), n.getSeconds()].map(pad2).join(':');
  };

  // Sync with Firestore (scoped to company)
  useEffect(() => {
    if (!db || !empresa?.id) {
      // Local sync fallback
      const saved = localStorage.getItem(`repack_rows_${empresa?.id || 'demo'}`);
      if (saved) setRepackRows(JSON.parse(saved));
      return;
    }

    const companyId = empresa?.id || 'demo';
    const q = query(collection(db, 'repack'));
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map(doc => ({ _docId: doc.id, ...doc.data() } as RepackRow));
      const filtered = isCustomFirebaseConnected() ? rows : rows.filter(r => r.empresaId === companyId);
      filtered.sort((a, b) => (b.dataISO || '').localeCompare(a.dataISO || '') || (b.inicio || '').localeCompare(a.inicio || ''));
      setRepackRows(filtered);
      localStorage.setItem(`repack_rows_${companyId}`, JSON.stringify(filtered));
    });

    return () => unsub();
  }, [empresa?.id]);

  // Listen for repack_validades
  useEffect(() => {
    if (!db || !empresa?.id) {
      const saved = localStorage.getItem(`repack_validades_${empresa?.id || 'demo'}`);
      if (saved) setRepackValidades(JSON.parse(saved));
      return;
    }

    const companyId = empresa?.id || 'demo';
    const q = query(collection(db, 'repack_validades'));
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map(doc => ({ _docId: doc.id, ...doc.data() } as RepackValidadeRow));
      const filtered = isCustomFirebaseConnected() ? rows : rows.filter(r => r.empresaId === companyId);
      filtered.sort((a, b) => (a.validade || '').localeCompare(b.validade || '') || (a.descricao || '').localeCompare(b.descricao || ''));
      setRepackValidades(filtered);
      localStorage.setItem(`repack_validades_${companyId}`, JSON.stringify(filtered));
    });

    return () => unsub();
  }, [empresa?.id]);

  useEffect(() => {
    calcDuration();
  }, [inicio, fim, embalagem, quantidade]);

  const calcDuration = () => {
    if (!inicio || !fim) {
      setDuracao('00:00:00');
      setStatusMeta('—');
      return;
    }
    const tot = toSec(fim) - toSec(inicio);
    setDuracao(toHMS(tot));

    const metaSec = toSec(activeMeta) * quantidade;
    if (tot <= metaSec) {
      setStatusMeta('🟢 META BATIDA');
    } else {
      setStatusMeta('🔴 ACIMA DA META');
    }
  };

  const handleRegister = async () => {
    if (!inicio || !fim) return;
    setRegistering(true);

    const today = new Date();
    const dataStr = today.toLocaleDateString('pt-BR');
    const dataISO = today.toISOString().split('T')[0];

    const newRow: Omit<RepackRow, '_docId'> & { empresaId: string } = {
      empresaId: empresa?.id || 'demo',
      data: dataStr,
      dataISO,
      embalagem,
      quantidade,
      inicio,
      fim,
      duracao,
      meta: activeMeta,
      resultado: statusMeta,
      operador: user.nome,
    };

    try {
      if (db) {
        await addDoc(collection(db, 'repack'), newRow);
      } else {
        // standalone fallback
        const current = [...repackRows, { _docId: String(Date.now()), ...newRow }];
        setRepackRows(current);
        localStorage.setItem(`repack_rows_${empresa?.id || 'demo'}`, JSON.stringify(current));
      }

      // Reset fields
      setQuantidade(1);
      setInicio('');
      setFim('');
      setDuracao('00:00:00');
      setStatusMeta('—');
      setActiveTab('hist');
      setDraftRestored(false);
      localStorage.removeItem(draftKey);
    } catch (e) {
      alert('Erro ao registrar repack: ' + e);
    } finally {
      setRegistering(false);
    }
  };

  const handleDelete = async (docId?: string) => {
    if (!docId || !confirm('Excluir este registro?')) return;
    try {
      if (db) {
        await deleteDoc(doc(db, 'repack', docId));
      } else {
        const remaining = repackRows.filter(r => r._docId !== docId);
        setRepackRows(remaining);
        localStorage.setItem(`repack_rows_${empresa?.id || 'demo'}`, JSON.stringify(remaining));
      }
    } catch (e) {
      alert('Erro ao deletar: ' + e);
    }
  };

  const handleVRegister = async () => {
    if (!vValidade || !vSelectedProd) {
      alert('Por favor, selecione um produto e insira a data de validade.');
      return;
    }
    if (vLocalizacao === 'outro' && !vNomeManual.trim()) {
      alert('Por favor, digite o nome manual do local de repack.');
      return;
    }
    setVRegistering(true);

    const localizacaoValor = vLocalizacao === 'outro' ? vNomeManual.trim() : 'Repack';

    const newRow = {
      empresaId: empresa?.id || 'demo',
      id: Date.now(),
      codigo: String(vSelectedProd.codigo),
      descricao: vSelectedProd.descricao,
      quantidade: vQuantidade,
      validade: vValidade,
      localizacao: localizacaoValor,
      cadastradoEm: new Date().toISOString(),
      operador: user.nome || 'Sistema',
    };

    try {
      if (db) {
        await addDoc(collection(db, 'repack_validades'), newRow);
      } else {
        const current = [...repackValidades, { _docId: String(Date.now()), ...newRow }];
        setRepackValidades(current);
        localStorage.setItem(`repack_validades_${empresa?.id || 'demo'}`, JSON.stringify(current));
      }

      // Reset
      setVProdutoBusca('');
      setVSelectedProd(null);
      setVQuantidade(1);
      setVValidade('');
      setVLocalizacao('repack');
      setVNomeManual('');
    } catch (e) {
      alert('Erro ao registrar validade de repack: ' + e);
    } finally {
      setVRegistering(false);
    }
  };

  const handleVDelete = async (docId?: string) => {
    if (!docId || !confirm('Deseja excluir este registro de validade de repack?')) return;
    try {
      if (db) {
        await deleteDoc(doc(db, 'repack_validades', docId));
      } else {
        const remaining = repackValidades.filter(r => r._docId !== docId);
        setRepackValidades(remaining);
        localStorage.setItem(`repack_validades_${empresa?.id || 'demo'}`, JSON.stringify(remaining));
      }
    } catch (e) {
      alert('Erro ao deletar validade: ' + e);
    }
  };

  const getDaysRemaining = (expDate: string) => {
    if (!expDate) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(expDate + 'T00:00:00');
    return Math.round((exp.getTime() - today.getTime()) / 86400000);
  };

  const getStatusLabelAndStyles = (days: number) => {
    if (days < 0) return { label: '⛔ VENCIDO', text: 'text-[#ef4444]', bg: 'bg-[#ef4444]/10 border-[#ef4444]/20' };
    if (days <= 30) return { label: '🔴 CRÍTICO', text: 'text-[#ef4444]', bg: 'bg-[#ef4444]/10 border-[#ef4444]/20' };
    if (days <= 45) return { label: '🟠 ATENÇÃO', text: 'text-[#f5a623]', bg: 'bg-[#f5a623]/10 border-[#f5a623]/20' };
    if (days <= 60) return { label: '🟡 ALERTA', text: 'text-[#eab308]', bg: 'bg-[#eab308]/10 border-[#eab308]/20' };
    return { label: '🟢 OK', text: 'text-[#22c55e]', bg: 'bg-[#22c55e]/10 border-[#22c55e]/20' };
  };

  const vFilteredProducts = PRODUCTS.filter(p => {
    const q = vProdutoBusca.toLowerCase();
    return String(p.codigo).includes(q) || p.descricao.toLowerCase().includes(q);
  }).slice(0, 10);

  const handleVSelectProd = (p: { codigo: number, descricao: string }) => {
    setVSelectedProd(p);
    setVProdutoBusca(p.descricao);
    setVShowDropdown(false);
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* Top Header bar with Metadata */}
      <div className="flex items-center justify-between p-4 bg-[#11151c] border-b border-[#222d3a] rounded-t-xl -mx-6 md:-mx-12 -mt-6">
        <span className="font-sans font-black text-sm tracking-widest text-[#f5a623] uppercase">♻️ REPACK TIMER — PRODUTIVIDADE</span>
        <div className="text-xs text-[#6a7d92] tracking-wider font-semibold">
          META UNIT.: <strong className="text-[#f5a623] font-mono">{activeMeta}</strong>
        </div>
      </div>

      <div className="ptabs border-b border-[#222d3a] flex gap-2 flex-wrap">
        <button 
          onClick={() => setActiveTab('form')}
          className={`ptab py-2 px-6 font-sans font-bold text-xs uppercase cursor-pointer relative ${activeTab === 'form' ? 'text-[#f5a623] border-b-2 border-b-[#f5a623]' : 'text-[#6a7d92] hover:text-[#e8eef5]'}`}
        >
          ⚙ Registrar
        </button>
        <button 
          onClick={() => setActiveTab('stats')}
          className={`ptab py-2 px-6 font-sans font-bold text-xs uppercase cursor-pointer relative ${activeTab === 'stats' ? 'text-[#f5a623] border-b-2 border-b-[#f5a623]' : 'text-[#6a7d92] hover:text-[#e8eef5]'}`}
        >
          📊 Produtividade do Dia
        </button>
        <button 
          onClick={() => setActiveTab('hist')}
          className={`ptab py-2 px-6 font-sans font-bold text-xs uppercase cursor-pointer relative ${activeTab === 'hist' ? 'text-[#f5a623] border-b-2 border-b-[#f5a623]' : 'text-[#6a7d92] hover:text-[#e8eef5]'}`}
        >
          📋 Histórico <span className="ml-1.5 px-2 py-0.5 rounded-full bg-[#151b23] border border-[#222d3a] text-[10px] text-snow">{repackRows.length}</span>
        </button>
        <button 
          onClick={() => setActiveTab('validade')}
          className={`ptab py-2 px-6 font-sans font-bold text-xs uppercase cursor-pointer relative ${activeTab === 'validade' ? 'text-[#f5a623] border-b-2 border-b-[#f5a623]' : 'text-[#6a7d92] hover:text-[#e8eef5]'}`}
        >
          📅 Validade do Repack <span className="ml-1.5 px-2 py-0.5 rounded-full bg-[#151b23] border border-[#222d3a] text-[10px] text-snow">{repackValidades.length}</span>
        </button>

        {activeTab === 'raci' && (
          <button 
            type="button"
            className="ptab py-2 px-6 font-sans font-bold text-xs uppercase cursor-pointer relative text-[#f5a623] border-b-2 border-b-[#f5a623]"
          >
            👥 Matriz RACI
          </button>
        )}
        {activeTab === 'pop' && (
          <button 
            type="button"
            className="ptab py-2 px-6 font-sans font-bold text-xs uppercase cursor-pointer relative text-[#f5a623] border-b-2 border-b-[#f5a623]"
          >
            📄 Procedimento POP
          </button>
        )}
        {activeTab === 'lup' && (
          <button 
            type="button"
            className="ptab py-2 px-6 font-sans font-bold text-xs uppercase cursor-pointer relative text-[#f5a623] border-b-2 border-b-[#f5a623]"
          >
            ⚠️ Lição LUP
          </button>
        )}
      </div>

      {activeTab === 'stats' && (
        <div className="g-card p-6 flex flex-col gap-6 bg-gradient-to-br from-[#11151c] to-[#151b23] border border-[#222d3a]">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="font-sans font-black text-lg text-[#f5a623] uppercase tracking-wide flex items-center gap-2">
                <BarChart2 className="w-5 h-5" /> Minha Produtividade de Hoje
              </h3>
              <p className="text-xs text-[#6a7d92] mt-1">
                Visão em tempo real das suas atividades registradas no turno de {new Date().toLocaleDateString('pt-BR')}.
              </p>
            </div>
            <div className="text-[10px] text-[#6a7d92] font-mono font-bold bg-[#151b23] border border-[#222d3a] px-3 py-1.5 rounded-lg">
              OPERADOR: {user.nome}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#151b23] border border-[#222d3a] rounded-xl p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-[#f5a623]/10 text-[#f5a623]">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#6a7d92] block tracking-wider">Lançamentos</span>
                <span className="text-xl font-bold text-snow font-mono">
                  {repackRows.filter(r => r.data === new Date().toLocaleDateString('pt-BR') && r.operador === user.nome).length}
                </span>
              </div>
            </div>

            <div className="bg-[#151b23] border border-[#222d3a] rounded-xl p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-indigo-500/10 text-indigo-400">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#6a7d92] block tracking-wider">Caixas Reembaladas</span>
                <span className="text-xl font-bold text-snow font-mono">
                  {repackRows.filter(r => r.data === new Date().toLocaleDateString('pt-BR') && r.operador === user.nome).reduce((sum, r) => sum + (r.quantidade || 0), 0)} cx
                </span>
              </div>
            </div>

            <div className="bg-[#151b23] border border-[#222d3a] rounded-xl p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#6a7d92] block tracking-wider">Metas Batidas</span>
                <span className="text-xl font-bold text-snow font-mono">
                  {repackRows.filter(r => r.data === new Date().toLocaleDateString('pt-BR') && r.operador === user.nome && r.resultado?.includes('BATIDA')).length}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold text-[#6a7d92] uppercase tracking-wider">Histórico Detalhado de Hoje</h4>
            {repackRows.filter(r => r.data === new Date().toLocaleDateString('pt-BR') && r.operador === user.nome).length === 0 ? (
              <div className="text-center py-6 border border-dashed border-[#222d3a] rounded-xl text-xs text-[#6a7d92]">
                Nenhuma atividade registrada por você hoje ainda. Use a aba "Registrar" para começar!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#a0aec0]">
                  <thead>
                    <tr className="border-b border-[#222d3a] text-[#6a7d92] uppercase text-[10px] font-bold tracking-wider">
                      <th className="py-2.5 px-3">Embalagem</th>
                      <th className="py-2.5 px-3">Quantidade</th>
                      <th className="py-2.5 px-3">Início / Fim</th>
                      <th className="py-2.5 px-3">Duração</th>
                      <th className="py-2.5 px-3">Resultado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222d3a]">
                    {repackRows
                      .filter(r => r.data === new Date().toLocaleDateString('pt-BR') && r.operador === user.nome)
                      .map((r, idx) => (
                        <tr key={r._docId || idx} className="hover:bg-[#151b23]/30 transition-colors">
                          <td className="py-3 px-3 font-bold text-snow">{r.embalagem}</td>
                          <td className="py-3 px-3 font-mono">{r.quantidade} cx</td>
                          <td className="py-3 px-3 font-mono text-[#6a7d92]">{r.inicio} - {r.fim}</td>
                          <td className="py-3 px-3 font-mono">{r.duracao}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                              r.resultado?.includes('BATIDA') 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                              {r.resultado}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'form' && (
        <div className="g-card p-6 flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222d3a] pb-3">
            <h3 className="font-sans font-bold text-sm tracking-wider uppercase text-[#f5a623]">Configurar Lançamento</h3>
            <div className="flex items-center gap-1.5 text-[9px] text-[#22c55e] font-black uppercase tracking-wider bg-[#22c55e]/5 px-2.5 py-1 rounded-lg border border-[#22c55e]/15">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              Salvo automaticamente
            </div>
          </div>

          {draftRestored && (
            <div className="flex items-center justify-between gap-3 bg-amber-500/10 border border-amber-500/25 px-4 py-3 rounded-xl text-xs text-amber-300">
              <div className="flex items-center gap-2 font-medium">
                <span>⚡ Dados anteriores restaurados do rascunho salvo!</span>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setQuantidade(1);
                  setInicio('');
                  setFim('');
                  setEmbalagem(REPACK_EMBALAGENS[0].nome);
                  setDraftRestored(false);
                  localStorage.removeItem(draftKey);
                }}
                className="text-[9px] uppercase font-black tracking-wider text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
              >
                Limpar formulário
              </button>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold tracking-widest text-[#6a7d92] uppercase">Embalagem</label>
              <select 
                value={embalagem}
                onChange={e => setEmbalagem(e.target.value)}
                className="g-input bg-[#151b23] border-[#1c2530]"
              >
                {REPACK_EMBALAGENS.map((e) => (
                  <option key={e.nome} value={e.nome}>{e.nome} (meta: {e.meta})</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold tracking-widest text-[#6a7d92] uppercase">Quantidade Reembalada (Caixas)</label>
              <input 
                type="number"
                min={1}
                value={quantidade}
                onChange={e => setQuantidade(Math.max(1, parseInt(e.target.value) || 0))}
                className="g-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold tracking-widest text-[#6a7d92] uppercase">Hora Inicial</label>
              <div className="flex gap-2">
                <input 
                  type="time"
                  step={1}
                  value={inicio}
                  onChange={e => setInicio(e.target.value)}
                  className="g-input flex-1 font-mono"
                />
                <button 
                  type="button" 
                  onClick={() => setInicio(nowHHMMSS())}
                  className="px-3 border border-[#222d3a] hover:border-[#6a7d92] bg-[#151b23] rounded-lg text-xs font-bold text-[#f5a623] cursor-pointer"
                >
                  ⏱ Agora
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold tracking-widest text-[#6a7d92] uppercase">Hora Final</label>
              <div className="flex gap-2">
                <input 
                  type="time"
                  step={1}
                  value={fim}
                  onChange={e => setFim(e.target.value)}
                  className="g-input flex-1 font-mono"
                />
                <button 
                  type="button" 
                  onClick={() => setFim(nowHHMMSS())}
                  className="px-3 border border-[#222d3a] hover:border-[#6a7d92] bg-[#151b23] rounded-lg text-xs font-bold text-[#f5a623] cursor-pointer"
                >
                  ⏱ Agora
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 p-4 bg-[#151b23]/50 border border-[#222d3a] rounded-xl">
            <div className="flex flex-col justify-center">
              <span className="text-[9px] uppercase font-bold text-[#6a7d92] tracking-wider">Tempo Total Gasto</span>
              <span className="font-mono text-3xl font-black text-snow mt-1">{duracao}</span>
            </div>
            <div className="flex flex-col justify-center text-right">
              <span className="text-[9px] uppercase font-bold text-[#6a7d92] tracking-wider block text-right">Status de Produtividade</span>
              <span className={`font-sans font-black text-lg tracking-wider mt-1 block ${statusMeta.includes('BATIDA') ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                {statusMeta}
              </span>
            </div>
          </div>

          <button 
            type="button"
            disabled={registering || !inicio || !fim}
            onClick={handleRegister}
            className="w-full py-4 text-sm font-sans font-bold uppercase tracking-widest text-[#07090d] bg-gradient-to-br from-[#f5a623] to-[#d4780a] hover:shadow-[0_4px_16px_rgba(245,166,35,0.25)] rounded-xl disabled:opacity-50 cursor-pointer"
          >
            {registering ? 'Registrando dados...' : '✅ REGISTRAR PRODUTIVIDADE'}
          </button>
        </div>
      )}

      {activeTab === 'hist' && (
        <div className="flex flex-col gap-3">
          {(() => {
            const grouped = repackRows.reduce((acc, r) => {
              const key = r.dataISO || (r.data ? r.data.split('/').reverse().join('-') : 'sem-data');
              if (!acc[key]) acc[key] = [];
              acc[key].push(r);
              return acc;
            }, {} as Record<string, RepackRow[]>);

            if (Object.keys(grouped).length === 0) {
              return <div className="g-card p-12 text-center text-[#6a7d92]">Nenhum repack computado ainda.</div>;
            }

            return (Object.entries(grouped) as [string, RepackRow[]][]).map(([dateKey, rows]) => {
              const isOpen = !!expandedDates[dateKey];
              const batidaCount = rows.filter(r => r.resultado.includes('BATIDA')).length;
              const totalBoxes = rows.reduce((s, r) => s + (r.quantidade || 0), 0);

              let formattedDate = dateKey;
              try {
                const [y, m, d] = dateKey.split('-');
                const dt = new Date(Number(y), Number(m) - 1, Number(d));
                const daysOfWeek = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
                formattedDate = `${d}/${m}/${y} — ${daysOfWeek[dt.getDay()]}`;
              } catch (e) {}

              return (
                <div key={dateKey} className="g-card overflow-hidden">
                  <div 
                    onClick={() => toggleDateGroup(dateKey)}
                    className="p-4 bg-[#151b23] flex items-center justify-between cursor-pointer select-none gap-4 flex-wrap"
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-sans font-black text-sm text-[#f5a623] tracking-wide">📅 {formattedDate}</span>
                      <span className="text-[10px] bg-[#11151c] border border-[#222d3a] px-2 py-0.5 rounded-full font-bold text-snow">
                        {rows.length} operações
                      </span>
                      {batidaCount === rows.length ? (
                        <span className="text-[9px] bg-[#22c55e]/15 border border-[#22c55e]/25 text-[#22c55e] px-2 py-0.5 rounded-full font-bold">
                          ✓ Tudo Ok ({batidaCount}/{rows.length})
                        </span>
                      ) : (
                        <span className="text-[9px] bg-[#ef4444]/15 border border-[#ef4444]/25 text-[#fca5a5] px-2 py-0.5 rounded-full font-bold">
                          ⚠ {rows.length - batidaCount} acima da meta
                        </span>
                      )}
                      <span className="text-[10px] text-[#6a7d92] font-semibold">
                        📦 {totalBoxes} caixas reembaladas
                      </span>
                    </div>
                    <span className="text-[#6a7d92] text-xs transition-transform" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
                  </div>

                  {isOpen && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs min-w-[640px]">
                        <thead>
                          <tr className="bg-[#07090d] border-b border-[#222d3a]">
                            <th className="p-3 text-[#6a7d92] uppercase font-bold tracking-wider">Embalagem</th>
                            <th className="p-3 text-[#6a7d92] uppercase font-bold tracking-wider text-center">Caixas</th>
                            <th className="p-3 text-[#6a7d92] uppercase font-bold tracking-wider">Início</th>
                            <th className="p-3 text-[#6a7d92] uppercase font-bold tracking-wider">Fim</th>
                            <th className="p-3 text-[#6a7d92] uppercase font-bold tracking-wider">Duração</th>
                            <th className="p-3 text-[#6a7d92] uppercase font-bold tracking-wider">Resultado</th>
                            <th className="p-3 text-[#6a7d92] uppercase font-bold tracking-wider text-right">Ação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#222d3a]">
                          {rows.map((r, i) => (
                            <tr key={r._docId || i} className="hover:bg-[#151b23]/30">
                              <td className="p-3 font-semibold text-[#f5a623]">{r.embalagem}</td>
                              <td className="p-3 text-center font-bold">{r.quantidade}</td>
                              <td className="p-3 font-mono">{r.inicio}</td>
                              <td className="p-3 font-mono">{r.fim}</td>
                              <td className="p-3 font-mono text-snow font-bold">{r.duracao}</td>
                              <td className={`p-3 font-sans font-black ${r.resultado.includes('BATIDA') ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>{r.resultado}</td>
                              <td className="p-3 text-right">
                                <button 
                                  onClick={() => handleDelete(r._docId)}
                                  className="py-1 px-2.5 bg-[#ef4444]/10 border border-[#ef4444]/20 hover:bg-[#ef4444] text-[#fca5a5] hover:text-white rounded-md text-[10px] font-bold cursor-pointer"
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>
      )}

      {activeTab === 'validade' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Side */}
          <div className="lg:col-span-5 g-card p-6 flex flex-col gap-5 rounded-xl">
            <div>
              <h3 className="font-sans font-bold text-sm tracking-widest text-[#f5a623] uppercase flex items-center gap-2">
                ⚙️ Registrar Validade de Lote
              </h3>
              <p className="text-[10px] text-[#6a7d92] font-semibold mt-1">
                Garantia de FEFO: cadastre a validade do lote físico das garrafas repactadas.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {/* Product autocomplete search */}
              <div className="flex flex-col gap-1.5 relative">
                <label className="text-[10px] font-bold tracking-widest text-[#6a7d92] uppercase">Produto (Código ou Descrição) *</label>
                <input 
                  type="text"
                  placeholder="Busque pelo produto..."
                  value={vProdutoBusca}
                  onChange={e => {
                    setVProdutoBusca(e.target.value);
                    setVShowDropdown(true);
                    if (vSelectedProd && e.target.value !== vSelectedProd.descricao) {
                      setVSelectedProd(null);
                    }
                  }}
                  onFocus={() => setVShowDropdown(true)}
                  className="g-input"
                />
                {vShowDropdown && vProdutoBusca && vFilteredProducts.length > 0 && (
                  <div className="absolute top-[103%] left-0 right-0 bg-[var(--surf)] border border-[var(--edge)] rounded-xl z-50 max-h-48 overflow-y-auto shadow-xl">
                    {vFilteredProducts.map(p => (
                      <div 
                        key={p.codigo}
                        onClick={() => handleVSelectProd(p)}
                        className="p-3 border-b border-[var(--edge)] hover:bg-[var(--surf2)] cursor-pointer text-xs flex justify-between"
                      >
                        <span className="font-bold text-[#f5a623]">{p.codigo}</span>
                        <span className="truncate flex-1 ml-4 text-snow text-left">{p.descricao}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SKU code show */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold tracking-widest text-[#6a7d92] uppercase">Código SKU</label>
                <input 
                  type="text" 
                  readOnly
                  placeholder="Selecione um produto acima"
                  value={vSelectedProd ? vSelectedProd.codigo : ''}
                  className="g-input text-center text-[#f5a623] font-bold font-mono opacity-80"
                />
              </div>

              {/* Unidades input (replaced Paletes, Lastros, Caixas as requested) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold tracking-widest text-[#6a7d92] uppercase">Unidades (Un) *</label>
                <input 
                  type="number"
                  min={1}
                  value={vQuantidade}
                  onChange={e => setVQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
                  className="g-input font-mono font-bold"
                />
              </div>

              {/* Data de Vencimento / Validade */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold tracking-widest text-[#6a7d92] uppercase">Data de Validade *</label>
                <input 
                  type="date"
                  value={vValidade}
                  onChange={e => setVValidade(e.target.value)}
                  className="g-input font-mono h-[42px]"
                />
              </div>

              {/* Location selection: Repack or Outro */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold tracking-widest text-[#6a7d92] uppercase">Destino / Localização</label>
                <select 
                  value={vLocalizacao}
                  onChange={e => setVLocalizacao(e.target.value)}
                  className="g-input"
                >
                  <option value="repack">Repack</option>
                  <option value="outro">Outro (especificar manual)</option>
                </select>
              </div>

              {/* Manual name field: if 'outro' is chosen */}
              {vLocalizacao === 'outro' && (
                <div className="flex flex-col gap-1.5 animate-fadeIn">
                  <label className="text-[10px] font-bold tracking-widest text-[#f5a623] uppercase">Especificar Localização Manual *</label>
                  <input 
                    type="text"
                    value={vNomeManual}
                    onChange={e => setVNomeManual(e.target.value)}
                    placeholder="Digite o nome do local ou detalhe..."
                    className="g-input border-[#f5a623]/40 focus:border-[#f5a623]"
                  />
                </div>
              )}

              <button 
                type="button"
                disabled={vRegistering || !vValidade || !vSelectedProd || (vLocalizacao === 'outro' && !vNomeManual.trim())}
                onClick={handleVRegister}
                className="w-full mt-2 py-3 text-xs font-sans font-bold uppercase tracking-widest text-[#07090d] bg-gradient-to-br from-[#f5a623] to-[#d4780a] hover:shadow-[0_4px_16px_rgba(245,166,35,0.25)] rounded-xl disabled:opacity-50 cursor-pointer transition-all font-sans font-black"
              >
                {vRegistering ? 'GRAVANDO...' : '💾 GRAVAR VALIDADE DE REPACK'}
              </button>
            </div>
          </div>

          {/* List Side */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-sans font-black text-[#6a7d92] uppercase tracking-wider">
                Lotes de Repack Ativos ({repackValidades.length})
              </span>
            </div>

            {repackValidades.length === 0 ? (
              <div className="g-card p-8 text-center rounded-xl flex flex-col items-center justify-center gap-2">
                <AlertCircle className="w-8 h-8 text-[#6a7d92]/60" />
                <p className="text-xs text-[#6a7d92] font-semibold">Nenhum lote de repack cadastrado ainda.</p>
                <p className="text-[10px] text-[#6a7d92]/70">Use o formulário ao lado para registrar o primeiro.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {repackValidades.map((item, idx) => {
                  const days = getDaysRemaining(item.validade);
                  const statusInfo = getStatusLabelAndStyles(days);
                  return (
                    <div 
                      key={item._docId || idx}
                      className="g-card p-4 hover:border-[#6a7d92]/30 rounded-xl flex items-center justify-between gap-4 transition-all"
                    >
                      <div className="flex-1 flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-sans font-black text-xs text-snow uppercase tracking-wide">
                            {item.descricao}
                          </span>
                          <span className="px-2 py-0.5 bg-[#1e56f0]/10 border border-[#1e56f0]/25 rounded-md font-mono text-[10px] text-snow font-bold uppercase">
                            SKU: {item.codigo}
                          </span>
                          <span className="px-2 py-0.5 bg-[#f5a623]/10 border border-[#f5a623]/25 rounded-md font-sans text-[10px] text-snow font-bold uppercase">
                            📍 {item.localizacao}
                          </span>
                          <span className={`px-2 py-0.5 border rounded-md font-sans font-black text-[9px] uppercase tracking-wider ${statusInfo.text} ${statusInfo.bg}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-[10px] text-[#6a7d92] font-semibold mt-1 flex-wrap">
                          <span>📅 Validade: <strong className="text-snow font-mono">{item.validade ? new Date(item.validade + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</strong></span>
                          <span>📦 Quantidade: <strong className="text-snow font-mono">{item.quantidade || 0} Un</strong></span>
                          {days >= 0 ? (
                            <span>⏳ <strong className="text-snow font-mono">{days}</strong> d restantes</span>
                          ) : (
                            <span className="text-[#ef4444]">⏳ Vencido há <strong className="font-mono">{Math.abs(days)}</strong> d</span>
                          )}
                        </div>
                        <div className="text-[9px] text-[#6a7d92]/60 mt-0.5">
                          Registrado em {item.cadastradoEm ? new Date(item.cadastradoEm).toLocaleString('pt-BR') : '—'} por {item.operador || 'Sistema'}
                        </div>
                      </div>

                      <button 
                        onClick={() => handleVDelete(item._docId)}
                        className="p-2 bg-[#ef4444]/10 border border-[#ef4444]/20 hover:bg-[#ef4444] text-[#fca5a5] hover:text-white rounded-lg text-xs font-bold cursor-pointer transition-all shrink-0"
                        title="Excluir"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'raci' && (
        <div className="g-card p-6 flex flex-col gap-6 bg-[var(--surf)] border border-[var(--edge)]">
          <div className="flex items-center justify-between border-b border-[var(--edge)] pb-4 flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h3 className="font-sans font-black text-sm tracking-widest text-[var(--snow)] uppercase">MATRIZ RACI — FLUXO DE REPACK</h3>
                <p className="text-[10px] text-[var(--dim)] font-semibold mt-0.5">Quem executa, quem aprova, quem é consultado e informado no processo de Repack.</p>
              </div>
            </div>
            <button 
              type="button"
              onClick={() => setActiveTab('form')}
              className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/25 border border-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg font-black text-[10px] transition-all flex items-center gap-1 cursor-pointer uppercase tracking-wider"
            >
              ← Voltar ao Formulário
            </button>
          </div>

          <div className="p-5 bg-[var(--surf2)] border border-[var(--edge)] rounded-xl flex flex-col gap-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-[var(--edge)] pb-3 flex-wrap gap-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--snow)]">Legenda de Atribuição</span>
              <div className="flex gap-2 text-[9px] font-black flex-wrap">
                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-650 dark:text-blue-400 rounded-md border border-blue-500/20">R: RESPONSIBLE (Executor)</span>
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-md border border-emerald-500/20">A: ACCOUNTABLE (Aprovador)</span>
                <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-md border border-amber-500/20">C: CONSULTED (Consultado)</span>
                <span className="px-2 py-0.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-md border border-purple-500/20">I: INFORMED (Informado)</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[550px]">
                <thead>
                  <tr className="border-b border-[var(--edge)] text-[var(--dim)] text-[10px] uppercase font-black tracking-wider">
                    <th className="py-3 px-2">Atividade Operacional</th>
                    <th className="py-3 px-2 text-center w-28">Op. Repack</th>
                    <th className="py-3 px-2 text-center w-28">Supervisor</th>
                    <th className="py-3 px-2 text-center w-28">Conferente</th>
                    <th className="py-3 px-2 text-center w-28">Controle (Mesa)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--edge)] text-[var(--snow)]">
                  <tr className="hover:bg-slate-500/5 transition-colors">
                    <td className="py-4 px-2 font-bold text-[var(--snow)]">1. Segregação de produtos e avarias físicas</td>
                    <td className="py-4 px-2 text-center">
                      <span className="inline-flex w-7 h-7 items-center justify-center rounded-lg font-black text-xs bg-blue-500/10 text-blue-650 dark:text-blue-400 border border-blue-500/20 shadow-xs">R</span>
                    </td>
                    <td className="py-4 px-2 text-center">
                      <span className="inline-flex w-7 h-7 items-center justify-center rounded-lg font-black text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs">A</span>
                    </td>
                    <td className="py-4 px-2 text-center">
                      <span className="inline-flex w-7 h-7 items-center justify-center rounded-lg font-black text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-xs">C</span>
                    </td>
                    <td className="py-4 px-2 text-center">
                      <span className="inline-flex w-7 h-7 items-center justify-center rounded-lg font-black text-xs bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-700/60">—</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-500/5 transition-colors">
                    <td className="py-4 px-2 font-bold text-[var(--snow)]">2. Execução da reembalagem física (Repack)</td>
                    <td className="py-4 px-2 text-center">
                      <span className="inline-flex w-7 h-7 items-center justify-center rounded-lg font-black text-xs bg-blue-500/10 text-blue-650 dark:text-blue-400 border border-blue-500/20 shadow-xs">R</span>
                    </td>
                    <td className="py-4 px-2 text-center">
                      <span className="inline-flex w-7 h-7 items-center justify-center rounded-lg font-black text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs">A</span>
                    </td>
                    <td className="py-4 px-2 text-center">
                      <span className="inline-flex w-7 h-7 items-center justify-center rounded-lg font-black text-xs bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-700/60">—</span>
                    </td>
                    <td className="py-4 px-2 text-center">
                      <span className="inline-flex w-7 h-7 items-center justify-center rounded-lg font-black text-xs bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shadow-xs">I</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-500/5 transition-colors">
                    <td className="py-4 px-2 font-bold text-[var(--snow)]">3. Registro de tempos e volumes no aplicativo</td>
                    <td className="py-4 px-2 text-center">
                      <span className="inline-flex w-7 h-7 items-center justify-center rounded-lg font-black text-xs bg-blue-500/10 text-blue-650 dark:text-blue-400 border border-blue-500/20 shadow-xs">R</span>
                    </td>
                    <td className="py-4 px-2 text-center">
                      <span className="inline-flex w-7 h-7 items-center justify-center rounded-lg font-black text-xs bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shadow-xs">I</span>
                    </td>
                    <td className="py-4 px-2 text-center">
                      <span className="inline-flex w-7 h-7 items-center justify-center rounded-lg font-black text-xs bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-700/60">—</span>
                    </td>
                    <td className="py-4 px-2 text-center">
                      <span className="inline-flex w-7 h-7 items-center justify-center rounded-lg font-black text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs">A</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-500/5 transition-colors">
                    <td className="py-4 px-2 font-bold text-[var(--snow)]">4. Aprovação de descarte definitivo (DPO)</td>
                    <td className="py-4 px-2 text-center">
                      <span className="inline-flex w-7 h-7 items-center justify-center rounded-lg font-black text-xs bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-700/60">—</span>
                    </td>
                    <td className="py-4 px-2 text-center">
                      <span className="inline-flex w-7 h-7 items-center justify-center rounded-lg font-black text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs">A</span>
                    </td>
                    <td className="py-4 px-2 text-center">
                      <span className="inline-flex w-7 h-7 items-center justify-center rounded-lg font-black text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-xs">C</span>
                    </td>
                    <td className="py-4 px-2 text-center">
                      <span className="inline-flex w-7 h-7 items-center justify-center rounded-lg font-black text-xs bg-blue-500/10 text-blue-650 dark:text-blue-400 border border-blue-500/20 shadow-xs">R</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-500/5 transition-colors">
                    <td className="py-4 px-2 font-bold text-[var(--snow)]">5. Devolução de caixas íntegras ao estoque de picking</td>
                    <td className="py-4 px-2 text-center">
                      <span className="inline-flex w-7 h-7 items-center justify-center rounded-lg font-black text-xs bg-blue-500/10 text-blue-650 dark:text-blue-400 border border-blue-500/20 shadow-xs">R</span>
                    </td>
                    <td className="py-4 px-2 text-center">
                      <span className="inline-flex w-7 h-7 items-center justify-center rounded-lg font-black text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs">A</span>
                    </td>
                    <td className="py-4 px-2 text-center">
                      <span className="inline-flex w-7 h-7 items-center justify-center rounded-lg font-black text-xs bg-blue-500/10 text-blue-650 dark:text-blue-400 border border-blue-500/20 shadow-xs">R</span>
                    </td>
                    <td className="py-4 px-2 text-center">
                      <span className="inline-flex w-7 h-7 items-center justify-center rounded-lg font-black text-xs bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-700/60">—</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'pop' && (
        <div className="g-card p-6 bg-[var(--surf)] border border-[var(--edge)] flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-[var(--edge)] pb-4 flex-wrap gap-4">
            <div className="flex items-center gap-2.5">
              <FileText className="w-5 h-5 text-blue-550" />
              <div>
                <h3 className="font-sans font-black text-sm tracking-widest text-[var(--snow)] uppercase">PROCEDIMENTO OPERACIONAL PADRÃO (POP)</h3>
                <p className="text-[10px] text-[var(--dim)] font-semibold mt-0.5">Instrução de trabalho padrão para triagem, higienização, montagem e registro.</p>
              </div>
            </div>
            <button 
              type="button"
              onClick={() => setActiveTab('form')}
              className="px-3 py-1.5 bg-[#1e56f0]/10 hover:bg-[#1e56f0]/20 border border-[#1e56f0]/20 text-[#1e56f0] rounded-lg font-bold text-[10px] transition-colors flex items-center gap-1 cursor-pointer uppercase tracking-wider"
            >
              ← Voltar ao Formulário
            </button>
          </div>

          <div className="p-5 bg-[var(--surf2)] border border-[var(--edge)] rounded-xl flex flex-col gap-5 text-[var(--snow)] shadow-sm">
            <div className="flex flex-col gap-4 font-sans text-xs">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center font-bold text-blue-650 dark:text-blue-400 text-xs flex-shrink-0 mt-0.5 shadow-xs">1</span>
                <div>
                  <h5 className="font-black text-[var(--snow)] uppercase text-[11.5px] tracking-wide">Segregação e Inspeção das Avarias</h5>
                  <p className="text-[var(--dim)] mt-1 font-medium leading-relaxed">Retirar do fluxo de pátio todas as caixas molhadas, amassadas ou com suspeita de quebra física. Mover para a baia demarcada de repack.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center font-bold text-blue-650 dark:text-blue-400 text-xs flex-shrink-0 mt-0.5 shadow-xs">2</span>
                <div>
                  <h5 className="font-black text-[var(--snow)] uppercase text-[11.5px] tracking-wide">Abertura do Timer no Aplicativo</h5>
                  <p className="text-[var(--dim)] mt-1 font-medium leading-relaxed">Antes de iniciar a montagem física, acesse o painel, selecione o tipo de embalagem do lote (ex: LATA 350) e registre o horário de início (botão ⏱ Agora).</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center font-bold text-blue-650 dark:text-blue-400 text-xs flex-shrink-0 mt-0.5 shadow-xs">3</span>
                <div>
                  <h5 className="font-black text-[var(--snow)] uppercase text-[11.5px] tracking-wide">Montagem Física de Caixas Recuperadas</h5>
                  <p className="text-[var(--dim)] mt-1 font-medium leading-relaxed">Higienizar garrafas/latas íntegras com panos limpos. Montar caixas novas respeitando as divisórias Ambev. Descarte cacos e líquidos no dreno ecológico de refugo.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center font-bold text-blue-650 dark:text-blue-400 text-xs flex-shrink-0 mt-0.5 shadow-xs">4</span>
                <div>
                  <h5 className="font-black text-[var(--snow)] uppercase text-[11.5px] tracking-wide">Fechamento e Registro de Resultados</h5>
                  <p className="text-[var(--dim)] mt-1 font-medium leading-relaxed">Feche as caixas com fita adesiva padrão. Finalize o timer (botão ⏱ Agora), insira a quantidade exata montada e envie. O sistema calcula a eficácia na hora! (Meta Ambev).</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center font-bold text-blue-650 dark:text-blue-400 text-xs flex-shrink-0 mt-0.5 shadow-xs">5</span>
                <div>
                  <h5 className="font-black text-[var(--snow)] uppercase text-[11.5px] tracking-wide">Destinação do Estoque e Limpeza</h5>
                  <p className="text-[var(--dim)] mt-1 font-medium leading-relaxed">Leve o pallet de repack finalizado de volta ao endereço de estocagem de origem. Varra os detritos da baia de trabalho para evitar acidentes com resíduos.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'lup' && (
        <div className="g-card p-6 bg-[var(--surf)] border border-[var(--edge)] flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-[var(--edge)] pb-4 flex-wrap gap-4">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-blue-550" />
              <div>
                <h3 className="font-sans font-black text-sm tracking-widest text-[var(--snow)] uppercase">LUP — LIÇÃO DE UM PONTO</h3>
                <p className="text-[10px] text-[var(--dim)] font-semibold mt-0.5">Garantia visual Ambev de qualidade para paletização, montagem e amarração.</p>
              </div>
            </div>
            <button 
              type="button"
              onClick={() => setActiveTab('form')}
              className="px-3 py-1.5 bg-[#1e56f0]/10 hover:bg-[#1e56f0]/20 border border-[#1e56f0]/20 text-[#1e56f0] rounded-lg font-bold text-[10px] transition-colors flex items-center gap-1 cursor-pointer uppercase tracking-wider"
            >
              ← Voltar ao Formulário
            </button>
          </div>

          <div className="p-5 bg-[var(--surf2)] border border-[var(--edge)] rounded-xl flex flex-col gap-4 text-[var(--snow)] shadow-sm">
            <div className="p-4 rounded-xl bg-[var(--surf)] border border-[var(--edge)] mb-2 shadow-xs flex flex-col gap-1">
              <span className="font-bold text-blue-650 dark:text-blue-400 block text-[10px] uppercase tracking-wider">TEMA DA LIÇÃO:</span>
              <span className="font-black text-[var(--snow)] text-[13px] tracking-wide uppercase">Padrão de Paletização, Amarração de Repack e Filme Stretch</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* DO */}
              <div className="bg-emerald-500/5 border border-emerald-500/20 dark:border-emerald-500/30 rounded-xl p-5 flex flex-col gap-3 shadow-xs">
                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 tracking-wider flex items-center gap-1">
                  🟢 CERTO (Padrão de Qualidade)
                </span>
                <ul className="text-xs space-y-2 text-[var(--snow)] list-disc list-inside">
                  <li><strong className="text-[var(--snow)]">Amarração cruzada (tijolinho):</strong> caixas travadas por camadas intercaladas.</li>
                  <li><strong className="text-[var(--snow)]">Filme stretch tensionado:</strong> mínimo de 3 voltas na base de madeira e no topo do pallet.</li>
                  <li><strong className="text-[var(--snow)]">Monolote por pallet:</strong> apenas produtos do mesmo lote de validade e SKU no mesmo pallet.</li>
                  <li><strong className="text-[var(--snow)]">Altura de segurança:</strong> empilhamento máximo de até 5 camadas por pallet.</li>
                </ul>
              </div>

              {/* DON'T */}
              <div className="bg-red-500/5 border border-red-500/20 dark:border-red-500/30 rounded-xl p-5 flex flex-col gap-3 shadow-xs">
                <span className="text-[10px] font-black text-red-600 dark:text-red-400 tracking-wider flex items-center gap-1">
                  🔴 ERRADO (Risco de Tombamento / Quebra)
                </span>
                <ul className="text-xs space-y-2 text-[var(--snow)] list-disc list-inside">
                  <li><strong className="text-[var(--snow)]">Empilhamento em coluna direta:</strong> sem cruzamento de camadas (pallet tomba fácil).</li>
                  <li><strong className="text-[var(--snow)]">Falta de amarração na base:</strong> stretch aplicado sem prender na madeira do pallet.</li>
                  <li><strong className="text-[var(--snow)]">SKUs ou validades misturadas:</strong> gera quebra de FEFO e descontrole de inventário.</li>
                  <li><strong className="text-[var(--snow)]">Caixas rasgadas/úmidas:</strong> utilizar caixas danificadas na base causa desmoronamento.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
export {};
