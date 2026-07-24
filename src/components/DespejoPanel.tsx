import React, { useState, useEffect } from 'react';
import { db, isCustomFirebaseConnected } from '../firebase';
import { collection, addDoc, onSnapshot, query, where, deleteDoc, doc } from 'firebase/firestore';
import { Usuario, Empresa, DespejoRow } from '../types';
import DespejoDashboard from './DespejoDashboard';
import { TrendingUp, CheckCircle, Clock, Award, BarChart2 } from 'lucide-react';
import SugerirMelhoriaCard from './SugerirMelhoriaCard';

interface DespejoPanelProps {
  user: Usuario;
  empresa: Empresa | null;
}

const DESPEJO_EMBALAGENS = [
  { nome: 'LATA 250', meta: '00:03:30' },
  { nome: 'LATA 269', meta: '00:03:30' },
  { nome: 'LATA 350', meta: '00:04:00' },
  { nome: 'LATA 473', meta: '00:04:00' },
  { nome: 'LONG NECK', meta: '00:05:00' },
  { nome: 'PET 1L', meta: '00:04:30' },
  { nome: 'PET 2L', meta: '00:04:00' },
];

export default function DespejoPanel({ user, empresa }: DespejoPanelProps) {
  const empresaId = empresa?.id || 'demo';
  const draftKey = `despejo_draft_${empresaId}_${user.nome || 'guest'}`;

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

  const [embalagem, setEmbalagem] = useState<string>(() => getDraftValue('embalagem', DESPEJO_EMBALAGENS[0].nome));
  const [quantidade, setQuantidade] = useState<number | ''>(() => getDraftValue('quantidade', ''));
  const [inicio, setInicio] = useState<string>(() => getDraftValue('inicio', ''));
  const [fim, setFim] = useState<string>(() => getDraftValue('fim', ''));
  const [tempo, setTempo] = useState('00:00:00');
  const [statusMeta, setStatusMeta] = useState('—');
  const [activeTab, setActiveTab] = useState<'form' | 'stats' | 'hist'>('form');
  const [despejoRows, setDespejoRows] = useState<DespejoRow[]>([]);
  const [registering, setRegistering] = useState(false);
  const [draftRestored, setDraftRestored] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return !!(parsed.inicio || parsed.fim || (parsed.quantidade !== undefined && parsed.quantidade !== '') || parsed.embalagem !== DESPEJO_EMBALAGENS[0].nome);
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
        setEmbalagem(parsed.embalagem || DESPEJO_EMBALAGENS[0].nome);
        setQuantidade(parsed.quantidade !== undefined ? parsed.quantidade : '');
        setInicio(parsed.inicio || '');
        setFim(parsed.fim || '');
        setDraftRestored(!!(parsed.inicio || parsed.fim || (parsed.quantidade !== undefined && parsed.quantidade !== '') || parsed.embalagem !== DESPEJO_EMBALAGENS[0].nome));
      } else {
        setEmbalagem(DESPEJO_EMBALAGENS[0].nome);
        setQuantidade('');
        setInicio('');
        setFim('');
        setDraftRestored(false);
      }
    } catch (e) {
      console.error(e);
    }
  }, [draftKey]);

  const toggleDateGroup = (dateKey: string) => {
    setExpandedDates(prev => ({ ...prev, [dateKey]: !prev[dateKey] }));
  };

  const activeMeta = DESPEJO_EMBALAGENS.find((e) => e.nome === embalagem)?.meta || '00:00:00';

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
      const saved = localStorage.getItem(`despejo_rows_${empresa?.id || 'demo'}`);
      if (saved) setDespejoRows(JSON.parse(saved));
      return;
    }

    const companyId = empresa?.id || 'demo';
    const q = query(collection(db, 'despejo'), where('empresaId', '==', companyId));
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map(doc => ({ _docId: doc.id, ...doc.data() } as DespejoRow));
      rows.sort((a, b) => (b.dataISO || '').localeCompare(a.dataISO || '') || (b.inicio || '').localeCompare(a.inicio || ''));
      setDespejoRows(rows);
      localStorage.setItem(`despejo_rows_${companyId}`, JSON.stringify(rows));
    });

    return () => unsub();
  }, [empresa?.id]);

  useEffect(() => {
    calcDuration();
  }, [inicio, fim, embalagem, quantidade]);

  const calcDuration = () => {
    if (!inicio || !fim) {
      setTempo('00:00:00');
      setStatusMeta('—');
      return;
    }
    const tot = toSec(fim) - toSec(inicio);
    setTempo(toHMS(tot));

    const metaSec = toSec(activeMeta) * (Number(quantidade) || 0);
    if (tot <= metaSec) {
      setStatusMeta('🟢 META BATIDA');
    } else {
      setStatusMeta('🔴 ACIMA DA META');
    }
  };

  const handleRegister = async () => {
    if (!inicio || !fim) return;
    if (quantidade === '' || isNaN(Number(quantidade)) || Number(quantidade) <= 0) {
      alert('Por favor, informe uma quantidade válida de caixas despejadas.');
      return;
    }
    setRegistering(true);

    const today = new Date();
    const dataStr = today.toLocaleDateString('pt-BR');
    const dataISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const newRow: Omit<DespejoRow, '_docId'> & { empresaId: string } = {
      empresaId: empresa?.id || 'demo',
      data: dataStr,
      dataISO,
      embalagem,
      quantidade: Number(quantidade),
      inicio,
      fim,
      tempo,
      meta: activeMeta,
      resultado: statusMeta,
      operador: user.nome,
    };

    try {
      if (db) {
        await addDoc(collection(db, 'despejo'), newRow);
      } else {
        // standalone fallback
        const current = [...despejoRows, { _docId: String(Date.now()), ...newRow }];
        setDespejoRows(current);
        localStorage.setItem(`despejo_rows_${empresa?.id || 'demo'}`, JSON.stringify(current));
      }

      // Reset fields
      setQuantidade('');
      setInicio('');
      setFim('');
      setTempo('00:00:00');
      setStatusMeta('—');
      setActiveTab('hist');
      setDraftRestored(false);
      localStorage.removeItem(draftKey);
    } catch (e) {
      alert('Erro ao registrar despejo: ' + e);
    } finally {
      setRegistering(false);
    }
  };

  const handleDelete = async (docId?: string) => {
    if (!docId || !confirm('Excluir este registro?')) return;
    try {
      if (db) {
        await deleteDoc(doc(db, 'despejo', docId));
      } else {
        const remaining = despejoRows.filter(r => r._docId !== docId);
        setDespejoRows(remaining);
        localStorage.setItem(`despejo_rows_${empresa?.id || 'demo'}`, JSON.stringify(remaining));
      }
    } catch (e) {
      alert('Erro ao deletar: ' + e);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* Top Header bar with Metadata */}
      <div className="flex items-center justify-between p-4 bg-[#11151c] border-b border-[#222d3a] rounded-t-xl -mx-6 md:-mx-12 -mt-6">
        <span className="font-sans font-black text-sm tracking-widest text-[#ef4444] uppercase">🗑 DESPEJO TIMER — PRODUTIVIDADE</span>
        <div className="text-xs text-[#6a7d92] tracking-wider font-semibold">
          META UNIT.: <strong className="text-[#ef4444] font-mono">{activeMeta}</strong>
        </div>
      </div>

      <div className="ptabs border-b border-[#222d3a] flex gap-2">
        <button 
          onClick={() => setActiveTab('form')}
          className={`ptab py-2 px-6 font-sans font-bold text-xs uppercase cursor-pointer relative ${activeTab === 'form' ? 'text-[#ef4444] border-b-2 border-b-[#ef4444]' : 'text-[#6a7d92] hover:text-[#e8eef5]'}`}
        >
          ⚙ Registrar
        </button>
        <button 
          onClick={() => setActiveTab('stats')}
          className={`ptab py-2 px-6 font-sans font-bold text-xs uppercase cursor-pointer relative ${activeTab === 'stats' ? 'text-[#ef4444] border-b-2 border-b-[#ef4444]' : 'text-[#6a7d92] hover:text-[#e8eef5]'}`}
        >
          📊 Produtividade do Dia
        </button>
        <button 
          onClick={() => setActiveTab('hist')}
          className={`ptab py-2 px-6 font-sans font-bold text-xs uppercase cursor-pointer relative ${activeTab === 'hist' ? 'text-[#ef4444] border-b-2 border-b-[#ef4444]' : 'text-[#6a7d92] hover:text-[#e8eef5]'}`}
        >
          📋 Histórico <span className="ml-1.5 px-2 py-0.5 rounded-full bg-[#151b23] border border-[#222d3a] text-[10px] text-snow">{despejoRows.length}</span>
        </button>
      </div>

      {activeTab === 'stats' && (
        <div className="g-card p-6 flex flex-col gap-6 bg-gradient-to-br from-[#11151c] to-[#151b23] border border-[#222d3a]">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="font-sans font-black text-lg text-[#ef4444] uppercase tracking-wide flex items-center gap-2">
                <BarChart2 className="w-5 h-5" /> Minha Produtividade de Hoje (Despejo)
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
              <div className="p-3 rounded-lg bg-[#ef4444]/10 text-[#ef4444]">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#6a7d92] block tracking-wider">Lançamentos</span>
                <span className="text-xl font-bold text-snow font-mono">
                  {despejoRows.filter(r => r.data === new Date().toLocaleDateString('pt-BR') && r.operador === user.nome).length}
                </span>
              </div>
            </div>

            <div className="bg-[#151b23] border border-[#222d3a] rounded-xl p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-indigo-500/10 text-indigo-400">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#6a7d92] block tracking-wider">Líquido Despejado</span>
                <span className="text-xl font-bold text-snow font-mono">
                  {despejoRows.filter(r => r.data === new Date().toLocaleDateString('pt-BR') && r.operador === user.nome).reduce((sum, r) => sum + (r.quantidade || 0), 0)} cx
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
                  {despejoRows.filter(r => r.data === new Date().toLocaleDateString('pt-BR') && r.operador === user.nome && r.resultado?.includes('BATIDA')).length}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold text-[#6a7d92] uppercase tracking-wider">Histórico Detalhado de Hoje</h4>
            {despejoRows.filter(r => r.data === new Date().toLocaleDateString('pt-BR') && r.operador === user.nome).length === 0 ? (
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
                    {despejoRows
                      .filter(r => r.data === new Date().toLocaleDateString('pt-BR') && r.operador === user.nome)
                      .map((r, idx) => (
                        <tr key={r._docId || idx} className="hover:bg-[#151b23]/30 transition-colors">
                          <td className="py-3 px-3 font-bold text-snow">{r.embalagem}</td>
                          <td className="py-3 px-3 font-mono">{r.quantidade} cx</td>
                          <td className="py-3 px-3 font-mono text-[#6a7d92]">{r.inicio} - {r.fim}</td>
                          <td className="py-3 px-3 font-mono">{r.tempo || r.duracao || '—'}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                              (r.resultado || '').includes('BATIDA') 
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
            <h3 className="font-sans font-bold text-sm tracking-wider uppercase text-[#ef4444]">Configurar Lançamento</h3>
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
                  setInicio('');
                  setFim('');
                  setQuantidade('');
                  setEmbalagem(DESPEJO_EMBALAGENS[0].nome);
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
                {DESPEJO_EMBALAGENS.map((e) => (
                  <option key={e.nome} value={e.nome}>{e.nome} (meta: {e.meta})</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold tracking-widest text-[#6a7d92] uppercase">Quantidade Despejada (SKUs) *</label>
              <input 
                type="number"
                value={quantidade}
                onChange={e => {
                  const val = e.target.value;
                  setQuantidade(val === '' ? '' : parseInt(val) || '');
                }}
                className="g-input"
                placeholder="Digite a quantidade..."
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
              <span className="font-mono text-3xl font-black text-snow mt-1">{tempo}</span>
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
            className="w-full py-4 text-sm font-sans font-bold uppercase tracking-widest text-white bg-gradient-to-br from-[#ef4444] to-[#c22d2d] hover:shadow-[0_4px_16px_rgba(239,68,68,0.25)] rounded-xl disabled:opacity-50 cursor-pointer"
          >
            {registering ? 'Registrando dados...' : '✅ REGISTRAR PRODUTIVIDADE'}
          </button>
        </div>
      )}

      {activeTab === 'hist' && (
        <div className="flex flex-col gap-3">
          {(() => {
            const grouped = despejoRows.reduce((acc, r) => {
              const key = r.dataISO || (r.data ? r.data.split('/').reverse().join('-') : 'sem-data');
              if (!acc[key]) acc[key] = [];
              acc[key].push(r);
              return acc;
            }, {} as Record<string, DespejoRow[]>);

            if (Object.keys(grouped).length === 0) {
              return <div className="g-card p-12 text-center text-[#6a7d92]">Nenhum despejo computado ainda.</div>;
            }

            return (Object.entries(grouped) as [string, DespejoRow[]][]).map(([dateKey, rows]) => {
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
                      <span className="font-sans font-black text-sm text-[#ef4444] tracking-wide">📅 {formattedDate}</span>
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
                        📦 {totalBoxes} SKUs despejados
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
                            <th className="p-3 text-[#6a7d92] uppercase font-bold tracking-wider text-center">SKUs</th>
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
                              <td className="p-3 font-semibold text-[#ef4444]">{r.embalagem}</td>
                              <td className="p-3 text-center font-bold">{r.quantidade}</td>
                              <td className="p-3 font-mono">{r.inicio}</td>
                              <td className="p-3 font-mono">{r.fim}</td>
                              <td className="p-3 font-mono text-snow font-bold">{r.tempo}</td>
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

      {/* Sugerir Melhoria / Plano de Ação para Supervisores */}
      <SugerirMelhoriaCard user={user} empresa={empresa} setor="Despejo" />
    </div>
  );
}
export {};
