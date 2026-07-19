import React, { useState, useEffect } from 'react';
import { db, isCustomFirebaseConnected } from '../firebase';
import { collection, addDoc, onSnapshot, query, where, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Usuario, Empresa, ValidadeRow } from '../types';
import { PRODUCTS } from '../planosData';
import SugerirMelhoriaCard from './SugerirMelhoriaCard';

interface ValidadesPanelProps {
  user: Usuario;
  empresa: Empresa | null;
}

export default function ValidadesPanel({ user, empresa }: ValidadesPanelProps) {
  const empresaId = empresa?.id || 'demo';
  const draftKey = `validades_draft_${empresaId}_${user.nome || 'guest'}`;

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

  const formatISODateToInput = (isoStr: string): string => {
    if (!isoStr) return '';
    const parts = isoStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return isoStr;
  };

  const parseInputDateToISO = (dateStr: string): string | null => {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    let [dayStr, monthStr, yearStr] = parts;
    if (!dayStr || !monthStr || !yearStr) return null;
    const d = dayStr.padStart(2, '0');
    const m = monthStr.padStart(2, '0');
    let y = yearStr;
    if (y.length === 2) {
      y = '20' + y;
    }
    if (y.length !== 4) return null;
    const isoDate = `${y}-${m}-${d}`;
    const timestamp = Date.parse(isoDate + 'T00:00:00');
    if (isNaN(timestamp)) return null;
    return isoDate;
  };

  const [produtoBusca, setProdutoBusca] = useState<string>(() => getDraftValue('produtoBusca', ''));
  const [selectedProd, setSelectedProd] = useState<{ codigo: number, descricao: string } | null>(() => getDraftValue('selectedProd', null));
  const [showDropdown, setShowProdDropdown] = useState(false);

  const [palhete, setPalhete] = useState<number>(() => getDraftValue('palhete', 0));
  const [lastro, setLastro] = useState<number>(() => getDraftValue('lastro', 0));
  const [caixa, setCaixa] = useState<number>(() => getDraftValue('caixa', 0));
  const [validade, setValidade] = useState<string>(() => getDraftValue('validade', ''));
  const [validadeInput, setValidadeInput] = useState<string>(() => {
    const val = getDraftValue('validade', '');
    return formatISODateToInput(val);
  });
  const [localizacao, setLocalizacao] = useState<'picking' | 'central' | 'marketplace'>(() => getDraftValue('localizacao', 'picking'));
  const [bloco, setBloco] = useState<string>(() => getDraftValue('bloco', ''));

  const [activeTab, setActiveTab] = useState<'form' | 'lista'>('form');
  const [validadesList, setValidadesList] = useState<ValidadeRow[]>([]);
  const [editingRow, setEditingRow] = useState<ValidadeRow | null>(null);
  const [registering, setRegistering] = useState(false);
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});
  const [draftRestored, setDraftRestored] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return !!(parsed.produtoBusca || parsed.selectedProd || parsed.palhete > 0 || parsed.lastro > 0 || parsed.caixa > 0 || parsed.validade || parsed.localizacao !== 'picking' || parsed.bloco);
      }
    } catch (e) {}
    return false;
  });

  const toggleDateGroup = (dateKey: string) => {
    setExpandedDates(prev => ({ ...prev, [dateKey]: !prev[dateKey] }));
  };

  // Filters
  const [filterLoc, setFilterLoc] = useState<string>('todos');
  const [filterBloco, setFilterBloco] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [sortOrder, setSortSort] = useState<'asc' | 'desc'>('asc');

  // Sync state with local draft saving (only when not editing an existing row)
  useEffect(() => {
    if (editingRow) return;
    const draftData = {
      produtoBusca,
      selectedProd,
      palhete,
      lastro,
      caixa,
      validade,
      localizacao,
      bloco
    };
    localStorage.setItem(draftKey, JSON.stringify(draftData));
  }, [produtoBusca, selectedProd, palhete, lastro, caixa, validade, localizacao, bloco, draftKey, editingRow]);

  // Sync with prop updates / user changing
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setProdutoBusca(parsed.produtoBusca || '');
        setSelectedProd(parsed.selectedProd || null);
        setPalhete(parsed.palhete || 0);
        setLastro(parsed.lastro || 0);
        setCaixa(parsed.caixa || 0);
        const val = parsed.validade || '';
        setValidade(val);
        setValidadeInput(formatISODateToInput(val));
        setLocalizacao(parsed.localizacao || 'picking');
        setBloco(parsed.bloco || '');
        setDraftRestored(!!(parsed.produtoBusca || parsed.selectedProd || parsed.palhete > 0 || parsed.lastro > 0 || parsed.caixa > 0 || val || parsed.localizacao !== 'picking' || parsed.bloco));
      } else {
        setProdutoBusca('');
        setSelectedProd(null);
        setPalhete(0);
        setLastro(0);
        setCaixa(0);
        setValidade('');
        setValidadeInput('');
        setLocalizacao('picking');
        setBloco('');
        setDraftRestored(false);
      }
    } catch (e) {
      console.error(e);
    }
  }, [draftKey]);

  // Sync with Firestore (scoped to company)
  useEffect(() => {
    if (!db) {
      const saved = localStorage.getItem(`validades_${empresaId}`);
      if (saved) setValidadesList(JSON.parse(saved));
      return;
    }

    const q = query(collection(db, 'validades'), where('empresaId', '==', empresaId));
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map(doc => ({ _docId: doc.id, ...doc.data() } as ValidadeRow));
      setValidadesList(rows);
      localStorage.setItem(`validades_${empresaId}`, JSON.stringify(rows));
    });

    return () => unsub();
  }, [empresaId]);

  const getDaysRemaining = (expDate: string) => {
    if (!expDate) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(expDate + 'T00:00:00');
    return Math.round((exp.getTime() - today.getTime()) / 86400000);
  };

  const getStatusClass = (days: number) => {
    if (days < 0) return 'expired';
    if (days <= 30) return 'crit';
    if (days <= 45) return 'warn';
    if (days <= 60) return 'alert';
    return 'ok';
  };

  const getStatusLabelAndStyles = (days: number) => {
    if (days < 0) return { label: '⛔ VENCIDO', text: 'text-[#ef4444]', border: 'border-l-[#ef4444]', bg: 'bg-[#ef4444]/5' };
    if (days <= 30) return { label: '🔴 CRÍTICO', text: 'text-[#ef4444]', border: 'border-l-[#ef4444]', bg: 'bg-[#ef4444]/5' };
    if (days <= 45) return { label: '🟠 ATENÇÃO', text: 'text-[#f5a623]', border: 'border-l-[#f5a623]', bg: 'bg-[#f5a623]/5' };
    if (days <= 60) return { label: '🟡 ALERTA', text: 'text-[#eab308]', border: 'border-l-[#eab308]', bg: 'bg-[#eab308]/5' };
    return { label: '🟢 OK', text: 'text-[#22c55e]', border: 'border-l-[#22c55e]', bg: 'bg-[#22c55e]/5' };
  };

  // Stats Counters compiling helper
  const getStats = () => {
    const stats = { expired: 0, crit: 0, warn: 0, alert: 0, ok: 0 };
    validadesList.forEach(r => {
      const days = getDaysRemaining(r.validade);
      const cat = getStatusClass(days);
      stats[cat] = (stats[cat] || 0) + 1;
    });
    return stats;
  };

  const stats = getStats();

  const handleSelectProd = (p: { codigo: number, descricao: string }) => {
    setSelectedProd(p);
    setProdutoBusca(p.descricao);
    setShowProdDropdown(false);
  };

  const handleValidadeChange = (val: string) => {
    // Permite apenas dígitos e barras
    let cleaned = val.replace(/[^0-9/]/g, '');

    // Formatação automática (máscara) DD/MM/AAAA
    const digits = cleaned.replace(/\//g, '');
    let formatted = '';
    if (digits.length > 0) {
      formatted += digits.slice(0, 2);
    }
    if (digits.length > 2) {
      formatted += '/' + digits.slice(2, 4);
    }
    if (digits.length > 4) {
      formatted += '/' + digits.slice(4, 8);
    }

    const finalVal = formatted || cleaned;
    setValidadeInput(finalVal);

    const iso = parseInputDateToISO(finalVal);
    if (iso) {
      setValidade(iso);
    } else {
      setValidade('');
    }
  };

  const cleanForm = () => {
    setProdutoBusca('');
    setSelectedProd(null);
    setPalhete(0);
    setLastro(0);
    setCaixa(0);
    setValidade('');
    setValidadeInput('');
    setLocalizacao('picking');
    setBloco('');
    setEditingRow(null);
    setDraftRestored(false);
    localStorage.removeItem(draftKey);
  };

  const handleSave = async () => {
    if (!validadeInput) {
      alert('Por favor, informe a data de vencimento.');
      return;
    }

    const isoDate = parseInputDateToISO(validadeInput);
    if (!isoDate) {
      alert('Data de vencimento inválida. Por favor, use o formato DD/MM/AAAA (ex: 25/07/2026).');
      return;
    }

    if (!selectedProd && !editingRow) {
      alert('Por favor, selecione um produto.');
      return;
    }

    setRegistering(true);

    const dataObj = {
      codigo: selectedProd ? String(selectedProd.codigo) : editingRow?.codigo || '',
      descricao: selectedProd ? selectedProd.descricao : editingRow?.descricao || '',
      palhete,
      lastro,
      caixa,
      validade: isoDate,
      localizacao,
      bloco,
    };

    try {
      if (editingRow) {
        // Edit Row Action update
        if (db && editingRow._docId) {
          await updateDoc(doc(db, 'validades', editingRow._docId), dataObj);
        } else {
          const updatedList = validadesList.map(item => item.id === editingRow.id ? { ...item, ...dataObj } : item);
          setValidadesList(updatedList);
          localStorage.setItem(`validades_${empresaId}`, JSON.stringify(updatedList));
        }
        toast('Produto atualizado!');
      } else {
        // Add Row Action create
        const newRow: Omit<ValidadeRow, '_docId'> & { empresaId: string } = {
          empresaId,
          id: Date.now(),
          ...dataObj,
          cadastradoEm: new Date().toISOString()
        };

        if (db) {
          await addDoc(collection(db, 'validades'), newRow);
        } else {
          const current = [...validadesList, { _docId: String(Date.now()), ...newRow }];
          setValidadesList(current);
          localStorage.setItem(`validades_${empresaId}`, JSON.stringify(current));
        }
        toast('Produto salvo!');
      }

      cleanForm();
      setActiveTab('lista');
    } catch (e) {
      alert('Erro ao registrar validade: ' + e);
    } finally {
      setRegistering(false);
    }
  };

  const handleEditInit = (r: ValidadeRow) => {
    setEditingRow(r);
    setSelectedProd({ codigo: Number(r.codigo), descricao: r.descricao });
    setProdutoBusca(r.descricao);
    setPalhete(r.palhete);
    setLastro(r.lastro);
    setCaixa(r.caixa);
    setValidade(r.validade);
    setValidadeInput(formatISODateToInput(r.validade));
    setLocalizacao(r.localizacao);
    setBloco(r.bloco || '');
    setActiveTab('form');
  };

  const handleDelete = async (r: ValidadeRow) => {
    if (!confirm('Remover esta ficha de validade do produto?')) return;
    try {
      if (db && r._docId) {
        await deleteDoc(doc(db, 'validades', r._docId));
      } else {
        const remaining = validadesList.filter(item => item.id !== r.id);
        setValidadesList(remaining);
        localStorage.setItem(`validades_${empresaId}`, JSON.stringify(remaining));
      }
      toast('Registro excluído');
    } catch (e) {
      alert('Erro ao excluir: ' + e);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Excluir ABSOLUTAMENTE TODOS os registros de validade cadastrados?')) return;
    try {
      if (db) {
        for (const item of validadesList) {
          if (item._docId) await deleteDoc(doc(db, 'validades', item._docId));
        }
      } else {
        setValidadesList([]);
        localStorage.setItem(`validades_${empresaId}`, JSON.stringify([]));
      }
      toast('Todos os registros excluídos!');
    } catch (e) {
      alert('Erro ao excluir registros: ' + e);
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

  // Pre-filter calculations
  const filteredProducts = PRODUCTS.filter(p => {
    const q = produtoBusca.toLowerCase();
    return String(p.codigo).includes(q) || p.descricao.toLowerCase().includes(q);
  }).slice(0, 10);

  // Expiration entries mapping list
  const getFilteredEntries = () => {
    let rows = [...validadesList];
    if (filterLoc !== 'todos') {
      rows = rows.filter(r => r.localizacao === filterLoc);
    }
    if (filterBloco !== 'todos') {
      rows = rows.filter(r => (r.bloco || '') === filterBloco);
    }
    if (filterStatus !== 'todos') {
      rows = rows.filter(r => {
        const days = getDaysRemaining(r.validade);
        return getStatusClass(days) === filterStatus;
      });
    }

    // Sort order
    rows.sort((a, b) => {
      const order = (a.validade || '').localeCompare(b.validade || '');
      return sortOrder === 'asc' ? order : -order;
    });

    return rows;
  };

  const entriesToDisplay = getFilteredEntries();

  return (
    <div className="flex flex-col gap-6">
      
      {/* Top Header */}
      <div className="flex items-center justify-between p-4 bg-[#11151c] border-b border-[#222d3a] rounded-t-xl -mx-6 md:-mx-12 -mt-6">
        <span className="font-sans font-black text-sm tracking-widest text-[#8b5cf6] uppercase">🏷 CONTROLE DE VALIDADES — GESTÃO FEFO</span>
        <div className="flex gap-2">
          <button onClick={handleClearAll} className="py-1 px-3 bg-[#ef4444]/15 border border-[#ef4444]/30 hover:bg-[#ef4444] text-[#fca5a5] hover:text-white rounded-lg text-[10px] font-bold tracking-wide uppercase transition-colors cursor-pointer">
            🗑 Limpar Tudo
          </button>
        </div>
      </div>

      {/* Expiry Risk Level Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="g-card p-3 text-center border-t-2 border-t-[#7f1d1d] bg-[#7f1d1d]/5">
          <span className="font-sans font-black text-2xl text-red leading-none">{stats.expired}</span>
          <span className="block text-[8px] text-[#6a7d92] uppercase font-bold tracking-wider mt-1">Vencido</span>
          <span className="block text-[8px] text-[#6a7d92]/80 font-semibold mt-0.5">⚠️ Perda integral</span>
        </div>
        <div className="g-card p-3 text-center border-t-2 border-t-[#ef4444] bg-[#ef4444]/5">
          <span className="font-sans font-black text-2xl text-[#ef4444] leading-none">{stats.crit}</span>
          <span className="block text-[8px] text-[#6a7d92] uppercase font-bold tracking-wider mt-1">Crítico</span>
          <span className="block text-[8px] text-[#6a7d92]/80 font-semibold mt-0.5">≤ 30 dias</span>
        </div>
        <div className="g-card p-3 text-center border-t-2 border-t-[#f5a623] bg-[#f5a623]/5">
          <span className="font-sans font-black text-2xl text-[#f5a623] leading-none">{stats.warn}</span>
          <span className="block text-[8px] text-[#6a7d92] uppercase font-bold tracking-wider mt-1">Atenção</span>
          <span className="block text-[8px] text-[#6a7d92]/80 font-semibold mt-0.5">31–45 dias</span>
        </div>
        <div className="g-card p-3 text-center border-t-2 border-t-[#eab308] bg-[#eab308]/5">
          <span className="font-sans font-black text-2xl text-[#eab308] leading-none">{stats.alert}</span>
          <span className="block text-[8px] text-[#6a7d92] uppercase font-bold tracking-wider mt-1">Alerta</span>
          <span className="block text-[8px] text-[#6a7d92]/80 font-semibold mt-0.5">46–60 dias</span>
        </div>
        <div className="g-card p-3 text-center border-t-2 border-t-[#22c55e] bg-[#22c55e]/5 col-span-2 md:col-span-1">
          <span className="font-sans font-black text-2xl text-[#22c55e] leading-none">{stats.ok}</span>
          <span className="block text-[8px] text-[#6a7d92] uppercase font-bold tracking-wider mt-1">Garantido</span>
          <span className="block text-[8px] text-[#22c55e]/70 font-semibold mt-0.5">&gt; 60 dias (FEFO OK)</span>
        </div>
      </div>

      <div className="ptabs border-b border-[#222d3a] flex gap-2">
        <button 
          onClick={() => setActiveTab('form')}
          className={`ptab py-2 px-6 font-sans font-bold text-xs uppercase cursor-pointer relative ${activeTab === 'form' ? 'text-[#8b5cf6] border-b-2 border-b-[#8b5cf6]' : 'text-[#6a7d92] hover:text-[#e8eef5]'}`}
        >
          {editingRow ? '✏️ Editar Lote' : '📝 Cadastrar Lote'}
        </button>
        <button 
          onClick={() => setActiveTab('lista')}
          className={`ptab py-2 px-6 font-sans font-bold text-xs uppercase cursor-pointer relative ${activeTab === 'lista' ? 'text-[#8b5cf6] border-b-2 border-b-[#8b5cf6]' : 'text-[#6a7d92] hover:text-[#e8eef5]'}`}
        >
          📋 Lista do Estoque <span className="ml-1.5 px-2 py-0.5 rounded-full bg-[#151b23] border border-[#222d3a] text-[10px] text-snow">{validadesList.length}</span>
        </button>
      </div>

      {activeTab === 'form' ? (
        <div className="g-card p-6 flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222d3a] pb-3">
            <h3 className="font-sans font-bold text-sm tracking-wider uppercase text-[#8b5cf6]">
              {editingRow ? 'Editar Lote de Validade' : 'Registrar Validade de Lote de Carga'}
            </h3>
            <div className="flex items-center gap-1.5 text-[9px] text-[#22c55e] font-black uppercase tracking-wider bg-[#22c55e]/5 px-2.5 py-1 rounded-lg border border-[#22c55e]/15">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              Salvo automaticamente
            </div>
          </div>

          {draftRestored && !editingRow && (
            <div className="flex items-center justify-between gap-3 bg-amber-500/10 border border-amber-500/25 px-4 py-3 rounded-xl text-xs text-amber-300">
              <div className="flex items-center gap-2 font-medium">
                <span>⚡ Dados anteriores restaurados do rascunho salvo!</span>
              </div>
              <button 
                type="button"
                onClick={cleanForm}
                className="text-[9px] uppercase font-black tracking-wider text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
              >
                Limpar formulário
              </button>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            
            {/* Real-time search autocomplete */}
            <div className="flex flex-col gap-1.5 md:col-span-8 relative">
              <label className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#6a7d92]">Produto (Código ou Descrição) *</label>
              <input 
                type="text"
                placeholder="Busque pelo produto..."
                disabled={!!editingRow}
                value={produtoBusca}
                onChange={e => {
                  setProdutoBusca(e.target.value);
                  setShowProdDropdown(true);
                  if (selectedProd && e.target.value !== selectedProd.descricao) {
                    setSelectedProd(null);
                  }
                }}
                onFocus={() => setShowProdDropdown(true)}
                className="g-input disabled:opacity-50"
              />
              {showDropdown && produtoBusca && filteredProducts.length > 0 && (
                <div className="absolute top-[103%] left-0 right-0 bg-[#0e1626] border border-[#1c2530] rounded-xl z-50 max-h-48 overflow-y-auto">
                  {filteredProducts.map(p => (
                    <div 
                      key={p.codigo}
                      onClick={() => handleSelectProd(p)}
                      className="p-3 border-b border-[#1c2530] hover:bg-[#1a2030] cursor-pointer text-xs flex justify-between"
                    >
                      <span className="font-bold text-[#f5a623]">{p.codigo}</span>
                      <span className="truncate flex-1 ml-4 text-snow text-left">{p.descricao}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5 md:col-span-4">
              <label className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#6a7d92]">Código SKU</label>
              <input 
                type="text" 
                readOnly
                placeholder="Auto"
                value={selectedProd ? selectedProd.codigo : ''}
                className="g-input text-center text-[#f5a623] font-bold font-mono opacity-80"
              />
            </div>

          </div>

          <div className="grid grid-cols-3 gap-3 p-4 bg-[#151b23]/50 border border-[#222d3a] rounded-xl">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold tracking-[1px] uppercase text-[#6a7d92] text-center">Quant. Paletes</label>
              <input 
                type="number"
                min={0}
                value={palhete}
                onChange={e => setPalhete(Math.max(0, parseInt(e.target.value) || 0))}
                className="g-input text-center text-md font-bold text-snow"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold tracking-[1px] uppercase text-[#6a7d92] text-center">Quant. Lastros</label>
              <input 
                type="number"
                min={0}
                value={lastro}
                onChange={e => setLastro(Math.max(0, parseInt(e.target.value) || 0))}
                className="g-input text-center text-md font-bold text-snow"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold tracking-[1px] uppercase text-[#6a7d92] text-center">Quant. SKUs</label>
              <input 
                type="number"
                min={0}
                value={caixa}
                onChange={e => setCaixa(Math.max(0, parseInt(e.target.value) || 0))}
                className="g-input text-center text-md font-bold text-snow"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#6a7d92]">Data de Vencimento *</label>
              <input 
                type="text"
                required
                placeholder="DD/MM/AAAA"
                value={validadeInput}
                onChange={e => handleValidadeChange(e.target.value)}
                className="g-input text-snow h-[42px]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#6a7d92]">Localização de Armazenamento</label>
              <select 
                value={localizacao} 
                onChange={e => setLocalizacao(e.target.value as any)} 
                className="g-input bg-[#151b23] border-[#1c2530]"
              >
                <option value="central">Estoque central</option>
                <option value="picking">Picking</option>
                <option value="marketplace">Marketplace</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#6a7d92]">Bloco</label>
              <select 
                value={bloco} 
                onChange={e => setBloco(e.target.value)} 
                className="g-input bg-[#151b23] border-[#1c2530]"
              >
                <option value="">Nenhum bloco</option>
                <option value="A1">A1</option>
                <option value="A2">A2</option>
                <option value="A3">A3</option>
                <option value="A4">A4</option>
                <option value="B1">B1</option>
                <option value="B2">B2</option>
                <option value="B3">B3</option>
                <option value="B4">B4</option>
                <option value="C1">C1</option>
                <option value="C2">C2</option>
                <option value="C3">C3</option>
                <option value="C4">C4</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3">
            {editingRow && (
              <button 
                type="button"
                onClick={cleanForm}
                className="btn-ghost flex-1 py-3 border border-[#243040] text-[#6a7d92] hover:text-[#e8eef5] rounded-xl text-xs uppercase font-extrabold tracking-wider"
              >
                Cancelar Edição
              </button>
            )}
            <button 
              type="button"
              disabled={registering || (!selectedProd && !editingRow)}
              onClick={handleSave}
              className="py-4 font-sans font-bold uppercase tracking-widest text-[#07090d] bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] hover:shadow-[0_4px_16px_rgba(139,92,246,0.25)] rounded-xl disabled:opacity-50 flex-1 cursor-pointer"
            >
              {registering ? 'Gravando...' : editingRow ? '✏️ ATUALIZAR LOTE NO ESTOQUE' : '💾 SALVAR PRODUTO NO ESTOQUE'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          
          {/* List Search and Filters bar */}
          <div className="g-card p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-2.5 w-full sm:w-auto">
              <select value={filterLoc} onChange={e => setFilterLoc(e.target.value)} className="g-input text-xs py-2 px-3 bg-[#151b23]/80 border-[#222d3a]">
                <option value="todos">📍 Todos os Locais</option>
                <option value="central">Estoque central</option>
                <option value="picking">Picking</option>
                <option value="marketplace">Marketplace</option>
              </select>
              <select value={filterBloco} onChange={e => setFilterBloco(e.target.value)} className="g-input text-xs py-2 px-3 bg-[#151b23]/80 border-[#222d3a]">
                <option value="todos">📦 Todos os Blocos</option>
                <option value="A1">Bloco A1</option>
                <option value="A2">Bloco A2</option>
                <option value="A3">Bloco A3</option>
                <option value="A4">Bloco A4</option>
                <option value="B1">Bloco B1</option>
                <option value="B2">Bloco B2</option>
                <option value="B3">Bloco B3</option>
                <option value="B4">Bloco B4</option>
                <option value="C1">Bloco C1</option>
                <option value="C2">Bloco C2</option>
                <option value="C3">Bloco C3</option>
                <option value="C4">Bloco C4</option>
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="g-input text-xs py-2 px-3 bg-[#151b23]/80 border-[#222d3a]">
                <option value="todos">🚦 Todos os Riscos</option>
                <option value="expired">⛔ Vencidos</option>
                <option value="crit">🔴 Críticos (≤30 dias)</option>
                <option value="warn">🟠 Atenção (≤45 dias)</option>
                <option value="alert">🟡 Alertas (≤60 dias)</option>
                <option value="ok">🟢 Estáveis (&gt;60 dias)</option>
              </select>
              <select value={sortOrder} onChange={e => setSortSort(e.target.value as any)} className="g-input text-xs py-2 px-3 bg-[#151b23]/80 border-[#222d3a]">
                <option value="asc">📅 Mais Próximos</option>
                <option value="desc">📅 Mais Distantes</option>
              </select>
            </div>
            
            <span className="text-[10px] uppercase font-bold text-[#6a7d92] tracking-wider">
              {entriesToDisplay.length} lotes encontrados
            </span>
          </div>

          {/* List content */}
          <div className="flex flex-col gap-3">
            {(() => {
              const grouped = entriesToDisplay.reduce((acc, r) => {
                const key = r.validade || 'sem-data';
                if (!acc[key]) acc[key] = [];
                acc[key].push(r);
                return acc;
              }, {} as Record<string, ValidadeRow[]>);

              if (Object.keys(grouped).length === 0) {
                return <div className="g-card p-12 text-center text-[#6a7d92]">Nenhum produto cadastrado que corresponda a estes filtros.</div>;
              }

              return (Object.entries(grouped) as [string, ValidadeRow[]][]).map(([dateKey, rows]) => {
                const isOpen = !!expandedDates[dateKey];
                const days = getDaysRemaining(dateKey);
                const spec = getStatusLabelAndStyles(days);

                let formattedDate = dateKey;
                try {
                  const [y, m, d] = dateKey.split('-');
                  const dt = new Date(Number(y), Number(m) - 1, Number(d));
                  const daysOfWeek = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
                  formattedDate = `${d}/${m}/${y} — ${daysOfWeek[dt.getDay()]}`;
                } catch (e) {}

                const descDays = days < 0 
                  ? `${Math.abs(days)} dias atrasados` 
                  : days === 0 
                  ? 'Vence hoje' 
                  : `${days} dias restantes`;

                return (
                  <div key={dateKey} className="g-card overflow-hidden">
                    <div 
                      onClick={() => toggleDateGroup(dateKey)}
                      className="p-4 bg-[#151b23] flex items-center justify-between cursor-pointer select-none gap-4 flex-wrap"
                    >
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-sans font-black text-sm text-[#8b5cf6] tracking-wide">📅 Vencimento: {formattedDate}</span>
                        <span className="text-[10px] bg-[#11151c] border border-[#222d3a] px-2 py-0.5 rounded-full font-bold text-snow">
                          {rows.length} lotes
                        </span>
                        <span className={`text-[10px] font-black ${spec.text}`}>{spec.label}</span>
                        <span className="text-[10px] text-[#6a7d92] font-semibold">⏳ {descDays}</span>
                      </div>
                      <span className="text-[#6a7d92] text-xs transition-transform" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
                    </div>

                    {isOpen && (
                      <div className="p-4 flex flex-col gap-3 bg-[#0c1015]/40 border-t border-[#222d3a]/40">
                        {rows.map((r, i) => (
                          <div key={r.id || i} className="border border-[#222d3a] rounded-xl p-4 bg-[#0f1318] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                <span className="text-[9px] bg-[#151b23] border border-[#222d3a] px-2 py-0.5 rounded font-black text-[#f5a623] font-mono">{r.codigo}</span>
                                <span className="text-[9px] bg-[#151b23] px-2 py-0.5 rounded uppercase font-bold text-[#6a7d92]">
                                  {r.localizacao === 'central' ? 'Estoque central' : r.localizacao === 'picking' ? 'Picking' : 'Marketplace'}
                                  {r.bloco ? ` — Bloco ${r.bloco}` : ''}
                                </span>
                              </div>
                              <h4 className="text-sm font-bold text-snow truncate">{r.descricao}</h4>
                              <div className="flex gap-4 flex-wrap text-xs text-[#6a7d92] mt-2">
                                {r.palhete > 0 && <span>🪵 {r.palhete} paletes</span>}
                                {r.lastro > 0 && <span>🗃 {r.lastro} lastros</span>}
                                {r.caixa > 0 && <span>📦 {r.caixa} SKUs</span>}
                              </div>
                            </div>
                            
                            <div className="flex gap-2 self-end sm:self-auto">
                              <button 
                                onClick={() => handleEditInit(r)}
                                className="py-1.5 px-3 border border-[#222d3a] hover:border-[#6a7d92] bg-[#151b23] text-xs font-semibold text-snow rounded-lg cursor-pointer"
                              >
                                ✏️ Editar
                              </button>
                              <button 
                                onClick={() => handleDelete(r)}
                                className="py-1.5 px-3 border border-red/20 bg-red/10 hover:bg-red/20 text-[#fca5a5] text-xs font-semibold rounded-lg cursor-pointer"
                              >
                                🗑 Excluir
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>

        </div>
      )}

      {/* Sugerir Melhoria / Plano de Ação para Supervisores */}
      <SugerirMelhoriaCard user={user} empresa={empresa} setor="Validade" />
    </div>
  );
}
export {};
