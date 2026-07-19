import React, { useState, useEffect } from 'react';
import { db, isCustomFirebaseConnected } from '../firebase';
import { collection, addDoc, onSnapshot, query, where, deleteDoc, doc } from 'firebase/firestore';
import { Usuario, Empresa, Tarefa } from '../types';
import { PRODUCTS } from '../planosData';
import SugerirMelhoriaCard from './SugerirMelhoriaCard';

interface ConferentePanelProps {
  user: Usuario;
  empresa: Empresa | null;
}

export default function ConferentePanel({ user, empresa }: ConferentePanelProps) {
  const empresaId = empresa?.id || 'demo';
  const draftKey = `conferente_draft_${empresaId}_${user.nome || 'guest'}`;

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

  const [conferente, setConferente] = useState<string>(() => getDraftValue('conferente', ''));
  const [conferentes, setConferentes] = useState<string[]>(['GILSON ROSA DA SILVA', 'MATHEUS']);
  const [newConfName, setNewConfName] = useState('');

  const [searchQuery, setSearchQuery] = useState<string>(() => getDraftValue('searchQuery', ''));
  const [selectedProd, setSelectedProd] = useState<{ codigo: number, descricao: string } | null>(() => getDraftValue('selectedProd', null));
  const [quantidade, setQuantidade] = useState<number>(() => getDraftValue('quantidade', 1));
  const [operator, setOperator] = useState<string>(() => getDraftValue('operator', ''));
  const [operators, setOperators] = useState<string[]>(['MARIVALDO ARTHUR', 'RONILDO', 'PAULO PEREIRA']);

  // Tasks lists
  const [tasks, setTasks] = useState<Tarefa[]>([]);
  const [activeTab, setActiveTab] = useState<'open' | 'done'>('open');
  const [creating, setCreating] = useState(false);
  const [draftRestored, setDraftRestored] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return !!(parsed.searchQuery || parsed.selectedProd || parsed.quantidade > 1 || parsed.operator);
      }
    } catch (e) {}
    return false;
  });

  // Sync state with local draft saving
  useEffect(() => {
    const draftData = {
      conferente,
      searchQuery,
      selectedProd,
      quantidade,
      operator
    };
    localStorage.setItem(draftKey, JSON.stringify(draftData));
  }, [conferente, searchQuery, selectedProd, quantidade, operator, draftKey]);

  // Sync with prop updates / user changing
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setConferente(parsed.conferente || '');
        setSearchQuery(parsed.searchQuery || '');
        setSelectedProd(parsed.selectedProd || null);
        setQuantidade(parsed.quantidade || 1);
        setOperator(parsed.operator || '');
        setDraftRestored(!!(parsed.searchQuery || parsed.selectedProd || parsed.quantidade > 1 || parsed.operator));
      } else {
        setConferente('');
        setSearchQuery('');
        setSelectedProd(null);
        setQuantidade(1);
        setOperator('');
        setDraftRestored(false);
      }
    } catch (e) {
      console.error(e);
    }
  }, [draftKey]);

  // Read config list and user states from local storage (recovery)
  useEffect(() => {
    const cached = localStorage.getItem(`conferente_state_${empresaId}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.conferentes) setConferentes(parsed.conferentes);
        if (parsed.conferente) setConferente(parsed.conferente);
        if (parsed.operators) setOperators(parsed.operators);
      } catch (e) {}
    }
  }, [empresaId]);

  // Sync with Firestore Tasks (scoped to company)
  useEffect(() => {
    if (!db) {
      const savedTasks = localStorage.getItem(`tasks_${empresaId}`);
      if (savedTasks) setTasks(JSON.parse(savedTasks));
      return;
    }

    const q = query(collection(db, 'tarefas'), where('empresaId', '==', empresaId));
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map(doc => ({ _docId: doc.id, ...doc.data() } as Tarefa));
      rows.sort((a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || ''));
      setTasks(rows);
      localStorage.setItem(`tasks_${empresaId}`, JSON.stringify(rows));
    });

    return () => unsub();
  }, [empresaId]);

  const persistState = (extra: Record<string, any> = {}) => {
    localStorage.setItem(`conferente_state_${empresaId}`, JSON.stringify({
      conferentes,
      conferente,
      operators,
      ...extra
    }));
  };

  const handleAddConferente = () => {
    const clean = newConfName.trim().toUpperCase();
    if (!clean || conferentes.includes(clean)) return;
    const upd = [...conferentes, clean];
    setConferentes(upd);
    setNewConfName('');
    localStorage.setItem(`conferente_state_${empresaId}`, JSON.stringify({ conferes: upd, conferente, operators }));
    toast('Conferente adicionado: ' + clean);
  };

  const handleCreateTask = async () => {
    if (!conferente || !operator || !quantidade || !selectedProd) {
      alert('Certifique-se de selecionar seu nome de Conferente, o produto e o Operador designado.');
      return;
    }

    setCreating(true);

    const newRow: Omit<Tarefa, '_docId'> & { empresaId: string } = {
      empresaId,
      id: Date.now() % 100000,
      codigo: selectedProd.codigo,
      descricao: selectedProd.descricao,
      quantidade: Number(quantidade),
      conferente,
      operador: operator,
      status: 'pending',
      criadoEm: new Date().toISOString(),
      iniciadoEm: null,
      finalizadoEm: null,
      duracaoMin: null
    };

    try {
      if (db) {
        await addDoc(collection(db, 'tarefas'), newRow);
      } else {
        const current = [...tasks, { _docId: String(Date.now()), ...newRow }];
        setTasks(current);
        localStorage.setItem(`tasks_${empresaId}`, JSON.stringify(current));
      }

      setSelectedProd(null);
      setSearchQuery('');
      setQuantidade(1);
      setOperator('');
      setDraftRestored(false);
      localStorage.removeItem(draftKey);
      toast('Tarefa #' + newRow.id + ' despachada para ' + operator);
    } catch(e) {
      alert('Erro ao despachar tarefa: ' + e);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTask = async (t: Tarefa) => {
    if (!confirm('Remover tarefa #' + t.id + ' permanentemente do banco?')) return;
    try {
      if (db && t._docId) {
        await deleteDoc(doc(db, 'tarefas', t._docId));
      } else {
        const remaining = tasks.filter(x => x.id !== t.id);
        setTasks(remaining);
        localStorage.setItem(`tasks_${empresaId}`, JSON.stringify(remaining));
      }
      toast('Tarefa #' + t.id + ' removida.');
    } catch (e) {
      alert('Erro ao excluir: ' + e);
    }
  };

  const toast = (m: string) => {
    const el = document.getElementById('toast');
    if (el) {
      el.style.background = '';
      el.style.color = '';
      el.textContent = m;
      el.className = 'toast show';
      setTimeout(() => {
        el.className = 'toast';
      }, 3000);
    }
  };

  // Filter products for autocomplete dropdown
  const filteredProducts = PRODUCTS.filter(p => {
    const q = searchQuery.toLowerCase().trim();
    return !q || String(p.codigo).includes(q) || p.descricao.toLowerCase().includes(q);
  }).slice(0, 10);

  // Sync data lists
  const openTasksList = tasks.filter(t => t.status !== 'done');
  const doneTasksList = tasks.filter(t => t.status === 'done').slice(0, 20);

  return (
    <div className="flex flex-col gap-6">
      
      {/* Top Header */}
      <div className="flex items-center justify-between p-4 bg-[#11151c] border-b border-[#222d3a] rounded-t-xl -mx-6 md:-mx-12 -mt-6">
        <span className="font-sans font-black text-sm tracking-widest text-[#f5a623] uppercase">📋 CONFERENTE — DESPACHO E ATRIBUIÇÕES</span>
        <div className="text-[10px] text-[#22c55e] font-sans font-bold uppercase tracking-wider bg-[#22c55e]/10 px-2 py-0.5 rounded-full">
          Fila de Atividades
        </div>
      </div>

      {/* Identificação de conferente */}
      <div className="g-card p-6 flex flex-col gap-5">
        <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-[#f5a623]">Identificação do Conferente</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#6a7d92]">Seu Nome de Conferente *</label>
            <select 
              value={conferente}
              onChange={e => { setConferente(e.target.value); persistState(); }}
              className="g-input bg-[#151b23] border-[#1c2530]"
            >
              <option value="">— Selecione seu nome —</option>
              {conferentes.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div className="flex gap-2">
            <input 
              type="text"
              placeholder="Novo conferente nome..."
              value={newConfName}
              onChange={e => setNewConfName(e.target.value)}
              className="g-input flex-1"
            />
            <button 
              onClick={handleAddConferente}
              className="bg-[#151b23] border border-[#222d3a] hover:border-[#6a7d92] text-[#f5a623] text-xs font-sans font-bold px-4 py-2.5 rounded-lg tracking-wider uppercase cursor-pointer"
            >
              + Add
            </button>
          </div>
        </div>
      </div>

      {/* Nova Tarefa Picker */}
      <div className="g-card p-6 flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222d3a] pb-3">
          <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-[#f5a623]">Despachar Nova Tarefa no Pátio</h4>
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
                setSearchQuery('');
                setSelectedProd(null);
                setQuantidade(1);
                setOperator('');
                setDraftRestored(false);
                localStorage.removeItem(draftKey);
              }}
              className="text-[9px] uppercase font-black tracking-wider text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
            >
              Limpar formulário
            </button>
          </div>
        )}
        
        {/* Busca SKU */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#6a7d92]">Pesquisar SKU (Código ou Nome)</label>
          <input 
            type="text"
            placeholder="Digite código SKU ou palavras..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="g-input"
          />
        </div>

        {/* Produto List grid */}
        <div className="p-3 bg-[#07090d] border border-[#222d3a] rounded-xl flex flex-col gap-1 max-h-36 overflow-y-auto">
          {filteredProducts.map(p => {
            const isSel = selectedProd?.codigo === p.codigo;
            return (
              <div 
                key={p.codigo}
                onClick={() => setSelectedProd(p)}
                className={`p-2.5 rounded-lg border cursor-pointer text-xs flex justify-between tracking-wide transition-all ${isSel ? 'bg-[#f5a623]/10 border-[#f5a623]/40' : 'bg-[#151b23]/50 border-[#1c2530] hover:bg-[#1a2030]'}`}
              >
                <span className="font-bold text-[#f5a623]">{p.codigo}</span>
                <span className="flex-1 ml-4 truncate text-left text-[#e8eef5]">{p.descricao}</span>
              </div>
            );
          })}
        </div>

        {/* Quantity and Operator designation */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#6a7d92]">Quantidade de Paletes</label>
            <input 
              type="number"
              min={1}
              value={quantidade}
              onChange={e => setQuantidade(Math.max(1, parseInt(e.target.value) || 0))}
              className="g-input text-center text-snow font-bold text-sm bg-[#151b23]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#6a7d92]">Operador de Empilhadeira Designado *</label>
            <select 
              value={operator}
              onChange={e => { setOperator(e.target.value); }}
              className="g-input bg-[#151b23] border-[#1c2530]"
            >
              <option value="">— Selecionar operador —</option>
              {operators.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <button 
            type="button"
            disabled={creating || !selectedProd}
            onClick={handleCreateTask}
            className="py-3 px-4 text-xs font-bold font-sans tracking-widest text-[#07090d] bg-gradient-to-r from-[#f5a623] to-[#d4780a] hover:shadow-[0_4px_16px_rgba(245,166,35,0.25)] rounded-xl disabled:opacity-40 cursor-pointer text-center uppercase"
          >
            {creating ? 'Despachando...' : '➕ ATRIBUIR TAREFA OPERACIONAL'}
          </button>
        </div>
      </div>

      {/* Tabs and lists of tasks */}
      <div className="g-card p-6">
        <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-[#6a7d92] mb-4">Relatório de Atividades Diárias</h4>
        
        <div className="flex gap-2 border-b border-[#222d3a] mb-4">
          <button 
            onClick={() => setActiveTab('open')}
            className={`py-2 px-4 text-xs uppercase font-sans font-bold cursor-pointer transition-all ${activeTab === 'open' ? 'text-[#f5a623] border-b-2 border-b-[#f5a623]' : 'text-[#6a7d92]'}`}
          >
            Tarefas Abertas ({openTasksList.length})
          </button>
          <button 
            onClick={() => setActiveTab('done')}
            className={`py-2 px-4 text-xs uppercase font-sans font-bold cursor-pointer transition-all ${activeTab === 'done' ? 'text-[#f5a623] border-b-2 border-b-[#f5a623]' : 'text-[#6a7d92]'}`}
          >
            Concluídas Hoje ({doneTasksList.length})
          </button>
        </div>

        {activeTab === 'open' ? (
          <div className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-1">
            {openTasksList.length === 0 ? (
              <p className="text-xs text-[#6a7d92] text-center p-6">Nenhuma tarefa operativa em andamento ou pendente.</p>
            ) : (
              openTasksList.map((t, i) => (
                <div key={t._docId || i} className={`p-4 bg-[#151b23]/50 border border-[#222d3a] rounded-xl border-l-[3px] ${t.status === 'in_progress' ? 'border-l-[#3b82f6]' : 'border-l-[#f5a623]'}`}>
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <span className="text-[10px] font-sans font-bold text-[#f5a623] font-mono leading-none">TAREFA #{t.id} · SKU {t.codigo}</span>
                      <h5 className="text-xs font-bold text-snow leading-tight mt-1">{t.descricao}</h5>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-2xl font-black text-snow leading-none block">{t.quantidade}</span>
                      <span className="text-[8px] font-sans tracking-wider text-[#6a7d92] uppercase font-bold">Paletes</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center text-[10px] text-[#6a7d92] border-t border-[#222d3a]/50 pt-2 mt-3 flex-wrap gap-2">
                    <div>
                      <span>Atribuída para: <strong className="text-[#3b82f6] font-extrabold">{t.operador}</strong> </span>
                      {t.iniciadoEm && <span>· Iniciada às {new Date(t.iniciadoEm).toLocaleTimeString()}</span>}
                    </div>
                    <div className="flex gap-2">
                      <span className={`px-2 py-0.5 rounded font-black uppercase text-[8px] tracking-[0.5px] ${t.status === 'in_progress' ? 'bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20' : 'bg-[#f5a623]/10 text-[#f5a623] border border-[#f5a623]/20'}`}>
                        {t.status === 'in_progress' ? 'Em andamento' : 'Aguardando Operador'}
                      </span>
                      <button 
                        onClick={() => handleDeleteTask(t)}
                        className="text-[9px] font-black text-[#6a7d92] hover:text-[#ef4444] bg-transparent border-none cursor-pointer"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-1">
            {doneTasksList.length === 0 ? (
              <p className="text-xs text-[#6a7d92] text-center p-6">Nenhuma tarefa foi concluída de forma oficial hoje.</p>
            ) : (
              doneTasksList.map((t, i) => (
                <div key={t._docId || i} className="p-4 bg-[#151b23]/30 border border-[#222d3a] rounded-xl border-l-[3px] border-l-[#22c55e]">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <span className="text-[10px] font-sans font-bold text-[#f5a623] font-mono leading-none">TAREFA #{t.id} · SKU {t.codigo}</span>
                      <h5 className="text-xs font-bold text-snow leading-tight mt-1">{t.descricao}</h5>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-2xl font-black text-[#22c55e] leading-none block">{t.quantidade}</span>
                      <span className="text-[8px] font-sans tracking-wider text-[#6a7d92] uppercase font-bold">Paletes</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-[#6a7d92] border-t border-[#222d3a]/50 pt-2 mt-3 flex-wrap gap-2">
                    <div>
                      <span>Finalizado por: <strong className="text-snow">{t.operador}</strong> </span>
                      <span>· Tipo: <strong>{t.tipoOperacao || 'Abastecimento'}</strong></span>
                    </div>
                    <div>
                      Duração operacional: <strong className="text-[#22c55e] text-xs font-black">{t.duracaoMin} min </strong>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>

      {/* Sugerir Melhoria / Plano de Ação para Supervisores */}
      <SugerirMelhoriaCard user={user} empresa={empresa} setor="Conferente" />
    </div>
  );
}
export {};
