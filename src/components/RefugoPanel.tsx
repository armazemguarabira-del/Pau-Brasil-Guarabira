import React, { useState, useEffect } from 'react';
import { db, isCustomFirebaseConnected } from '../firebase';
import { collection, addDoc, onSnapshot, query, where, deleteDoc, doc } from 'firebase/firestore';
import { Usuario, Empresa, BlitzRefugoRow } from '../types';
import { TrendingUp, CheckCircle, Clock, Award, BarChart2 } from 'lucide-react';

interface RefugoPanelProps {
  user: Usuario;
  empresa: Empresa | null;
}

const RFG_DEFEITOS = [
  { k: 'quebrada',     l: 'Quebrada' },
  { k: 'segunda',      l: 'Segunda marcas' },
  { k: 'bicada_int',   l: 'Bicada Interna' },
  { k: 'bicada_ext',   l: 'Bicada Externa' },
  { k: 'cor_fora',     l: 'Cor Fora Padrão' },
  { k: 'faltante',     l: 'Faltante / Falha' },
  { k: 'logomarca',    l: 'Logomarca Estranha' },
  { k: 'rotulo_plast', l: 'Rótulo Plástico' },
  { k: 'sujidade_int', l: 'Sujidade Interna' },
  { k: 'sujidade_ext', l: 'Sujidade Externa' },
  { k: 'tampada',      l: 'Tampada' },
  { k: 'trincada',     l: 'Trincada' },
];

const RFG_TIPOS = [
  { id: '1l',  label: '1 Litro (1000ml)',  fator: 12 },
  { id: '600', label: '600 ml',            fator: 24 },
  { id: '300', label: 'caçulinha (300ml)',  fator: 23 },
];

export default function RefugoPanel({ user, empresa }: RefugoPanelProps) {
  const empresaId = empresa?.id || 'demo';
  const draftKey = `refugo_draft_${empresaId}_${user.nome || 'guest'}`;

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

  const [data, setData] = useState<string>(() => getDraftValue('data', ''));
  const [ajudante, setAjudante] = useState<string>(() => getDraftValue('ajudante', ''));
  const [placaPrefix, setPlacaPrefix] = useState<string>(() => getDraftValue('placaPrefix', 'QSK7D92'));
  const [placaCustom, setPlacaOutro] = useState<string>(() => getDraftValue('placaCustom', ''));
  const [mapa, setMapa] = useState<string>(() => getDraftValue('mapa', ''));
  const [rota, setRota] = useState<string>(() => getDraftValue('rota', ''));
  const [obs, setObs] = useState<string>(() => getDraftValue('obs', ''));

  // Quantities structure
  const defaultInputs = {
    '1l': { caixas: 0, quebrada: 0, segunda: 0, bicada_int: 0, bicada_ext: 0, cor_fora: 0, faltante: 0, logomarca: 0, rotulo_plast: 0, sujidade_int: 0, sujidade_ext: 0, tampada: 0, trincada: 0 },
    '600': { caixas: 0, quebrada: 0, segunda: 0, bicada_int: 0, bicada_ext: 0, cor_fora: 0, faltante: 0, logomarca: 0, rotulo_plast: 0, sujidade_int: 0, sujidade_ext: 0, tampada: 0, trincada: 0 },
    '300': { caixas: 0, quebrada: 0, segunda: 0, bicada_int: 0, bicada_ext: 0, cor_fora: 0, faltante: 0, logomarca: 0, rotulo_plast: 0, sujidade_int: 0, sujidade_ext: 0, tampada: 0, trincada: 0 },
  };
  const [inputs, setInputs] = useState<Record<string, Record<string, number>>>(() => getDraftValue('inputs', defaultInputs));

  const [activeTab, setActiveTab] = useState<'form' | 'stats' | 'hist'>('form');
  const [blitzRows, setBlitzRows] = useState<BlitzRefugoRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [registering, setRegistering] = useState(false);
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});
  const [draftRestored, setDraftRestored] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        const hasInputs = Object.values(parsed.inputs || {}).some((cat: any) => Object.values(cat).some((val: any) => val > 0));
        return !!(parsed.ajudante || parsed.placaCustom || parsed.mapa || parsed.rota || parsed.obs || hasInputs);
      }
    } catch (e) {}
    return false;
  });

  const toggleDateGroup = (dateKey: string) => {
    setExpandedDates(prev => ({ ...prev, [dateKey]: !prev[dateKey] }));
  };

  // Tick current date if not set from draft
  useEffect(() => {
    if (!data) {
      const today = new Date();
      setData(today.toISOString().split('T')[0]);
    }
  }, [data]);

  // Sync state with local draft saving
  useEffect(() => {
    const draftData = {
      data,
      ajudante,
      placaPrefix,
      placaCustom,
      mapa,
      rota,
      obs,
      inputs
    };
    localStorage.setItem(draftKey, JSON.stringify(draftData));
  }, [data, ajudante, placaPrefix, placaCustom, mapa, rota, obs, inputs, draftKey]);

  // Sync with prop updates / user changing
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setData(parsed.data || '');
        setAjudante(parsed.ajudante || '');
        setPlacaPrefix(parsed.placaPrefix || 'QSK7D92');
        setPlacaOutro(parsed.placaCustom || '');
        setMapa(parsed.mapa || '');
        setRota(parsed.rota || '');
        setObs(parsed.obs || '');
        setInputs(parsed.inputs || defaultInputs);
        const hasInputs = Object.values(parsed.inputs || {}).some((cat: any) => Object.values(cat).some((val: any) => val > 0));
        setDraftRestored(!!(parsed.ajudante || parsed.placaCustom || parsed.mapa || parsed.rota || parsed.obs || hasInputs));
      } else {
        const today = new Date();
        setData(today.toISOString().split('T')[0]);
        setAjudante('');
        setPlacaPrefix('QSK7D92');
        setPlacaOutro('');
        setMapa('');
        setRota('');
        setObs('');
        setInputs(defaultInputs);
        setDraftRestored(false);
      }
    } catch (e) {
      console.error(e);
    }
  }, [draftKey]);

  // Sync with Firestore (scoped to company)
  useEffect(() => {
    if (!db) {
      const saved = localStorage.getItem(`blitz_${empresaId}`);
      if (saved) setBlitzRows(JSON.parse(saved));
      return;
    }

    const q = query(collection(db, 'blitz_refugo'));
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map(doc => ({ _docId: doc.id, ...doc.data() } as BlitzRefugoRow));
      const filtered = isCustomFirebaseConnected() ? rows : rows.filter(r => r.empresaId === empresaId);
      filtered.sort((a, b) => (b.dataISO || '').localeCompare(a.dataISO || ''));
      setBlitzRows(filtered);
      localStorage.setItem(`blitz_${empresaId}`, JSON.stringify(filtered));
    });

    return () => unsub();
  }, [empresaId]);

  const handleInputChange = (tipoId: string, field: string, val: number) => {
    setInputs(prev => ({
      ...prev,
      [tipoId]: {
        ...prev[tipoId],
        [field]: Math.max(0, val)
      }
    }));
  };

  // Intermediate computations per package
  const getPackageStats = (tipoId: string) => {
    const pInfo = RFG_TIPOS.find(t => t.id === tipoId)!;
    const cat = inputs[tipoId];
    const caixas = cat.caixas || 0;
    const totalAferido = caixas * pInfo.fator;
    
    let totalDefects = 0;
    RFG_DEFEITOS.forEach(d => {
      totalDefects += cat[d.k] || 0;
    });

    const pct = totalAferido > 0 ? (totalDefects / totalAferido) * 100 : 0;
    return { caixas, totalAferido, totalDefects, pct };
  };

  // Consolidated statistics
  const getConsolidated = () => {
    let cxG = 0, unG = 0, defG = 0;
    RFG_TIPOS.forEach(t => {
      const res = getPackageStats(t.id);
      cxG += res.caixas;
      unG += res.totalAferido;
      defG += res.totalDefects;
    });
    const pctG = unG > 0 ? (defG / unG) * 100 : 0;
    return { caixas: cxG, unidades: unG, defeitos: defG, pct: pctG };
  };

  const consolidated = getConsolidated();

  const handleClean = () => {
    if (!confirm('Deseja limpar todos os campos da Blitz atual?')) return;
    setAjudante('');
    setMapa('');
    setRota('');
    setObs('');
    setPlacaOutro('');
    setInputs({
      '1l': { caixas: 0, quebrada: 0, segunda: 0, bicada_int: 0, bicada_ext: 0, cor_fora: 0, faltante: 0, logomarca: 0, rotulo_plast: 0, sujidade_int: 0, sujidade_ext: 0, tampada: 0, trincada: 0 },
      '600': { caixas: 0, quebrada: 0, segunda: 0, bicada_int: 0, bicada_ext: 0, cor_fora: 0, faltante: 0, logomarca: 0, rotulo_plast: 0, sujidade_int: 0, sujidade_ext: 0, tampada: 0, trincada: 0 },
      '300': { caixas: 0, quebrada: 0, segunda: 0, bicada_int: 0, bicada_ext: 0, cor_fora: 0, faltante: 0, logomarca: 0, rotulo_plast: 0, sujidade_int: 0, sujidade_ext: 0, tampada: 0, trincada: 0 },
    });
    setDraftRestored(false);
    localStorage.removeItem(draftKey);
  };

  const handleRegister = async () => {
    const plate = placaPrefix === 'Outra...' ? placaCustom.trim().toUpperCase() : placaPrefix;
    if (!plate || !ajudante || !data) {
      alert('Certifique-se de preencher a Placa, o nome do Ajudante e a Data da Blitz.');
      return;
    }

    setRegistering(true);

    // Dynamic extraction of fields
    const compiledEmb: Record<string, any> = {};
    RFG_TIPOS.forEach(t => {
      const r = getPackageStats(t.id);
      compiledEmb[t.id] = {
        caixas: r.caixas,
        aferido: r.totalAferido,
        fator: t.fator,
        total_def: r.totalDefects,
      };
      RFG_DEFEITOS.forEach(d => {
        compiledEmb[t.id][d.k] = inputs[t.id][d.k] || 0;
      });
    });

    const newRow: Omit<BlitzRefugoRow, '_docId'> & { empresaId: string } = {
      empresaId,
      placa: plate,
      ajudante,
      data: new Date(data).toLocaleDateString('pt-BR'),
      dataISO: data,
      mapa: mapa.trim(),
      rota: rota.trim(),
      obs: obs.trim(),
      emb: compiledEmb as any,
      totalCaixas: consolidated.caixas,
      totalAferido: consolidated.unidades,
      totalDef: consolidated.defeitos,
      pctRefugo: +consolidated.pct.toFixed(2),
    };

    try {
      if (db) {
        await addDoc(collection(db, 'blitz_refugo'), newRow);
      } else {
        const current = [...blitzRows, { _docId: String(Date.now()), ...newRow }];
        setBlitzRows(current);
        localStorage.setItem(`blitz_${empresaId}`, JSON.stringify(current));
      }

      setAjudante('');
      setMapa('');
      setRota('');
      setObs('');
      setPlacaOutro('');
      setInputs({
        '1l': { caixas: 0, quebrada: 0, segunda: 0, bicada_int: 0, bicada_ext: 0, cor_fora: 0, faltante: 0, logomarca: 0, rotulo_plast: 0, sujidade_int: 0, sujidade_ext: 0, tampada: 0, trincada: 0 },
        '600': { caixas: 0, quebrada: 0, segunda: 0, bicada_int: 0, bicada_ext: 0, cor_fora: 0, faltante: 0, logomarca: 0, rotulo_plast: 0, sujidade_int: 0, sujidade_ext: 0, tampada: 0, trincada: 0 },
        '300': { caixas: 0, quebrada: 0, segunda: 0, bicada_int: 0, bicada_ext: 0, cor_fora: 0, faltante: 0, logomarca: 0, rotulo_plast: 0, sujidade_int: 0, sujidade_ext: 0, tampada: 0, trincada: 0 },
      });
      setDraftRestored(false);
      localStorage.removeItem(draftKey);
      setActiveTab('hist');
    } catch(e) {
      alert('Erro ao registrar blitz: ' + e);
    } finally {
      setRegistering(false);
    }
  };

  const handleDelete = async (docId?: string) => {
    if (!docId || !confirm('Excluir ficha de Blitz permanentemente?')) return;
    try {
      if (db) {
        await deleteDoc(doc(db, 'blitz_refugo', docId));
      } else {
        const remaining = blitzRows.filter(r => r._docId !== docId);
        setBlitzRows(remaining);
        localStorage.setItem(`blitz_${empresaId}`, JSON.stringify(remaining));
      }
    } catch (e) {
      alert('Erro ao deletar: ' + e);
    }
  };

  const filteredHistory = blitzRows.filter(r => {
    const q = searchQuery.toLowerCase();
    const str = `${r.placa} ${r.ajudante} ${r.mapa || ''} ${r.rota || ''} ${r.data}`.toLowerCase();
    return !q || str.includes(q);
  });

  return (
    <div className="flex flex-col gap-6">
      
      {/* Top Header */}
      <div className="flex items-center justify-between p-4 bg-[#11151c] border-b border-[#222d3a] rounded-t-xl -mx-6 md:-mx-12 -mt-6">
        <span className="font-sans font-black text-sm tracking-widest text-[#eab308] uppercase">🍾 BLITZ DE REFUGO — AFERIÇÃO RETORNÁVEIS</span>
      </div>

      <div className="ptabs border-b border-[#222d3a] flex gap-2">
        <button 
          onClick={() => setActiveTab('form')}
          className={`ptab py-2 px-6 font-sans font-bold text-xs uppercase cursor-pointer relative ${activeTab === 'form' ? 'text-[#eab308] border-b-2 border-b-[#eab308]' : 'text-[#6a7d92] hover:text-[#e8eef5]'}`}
        >
          📝 Nova Aferição
        </button>
        <button 
          onClick={() => setActiveTab('stats')}
          className={`ptab py-2 px-6 font-sans font-bold text-xs uppercase cursor-pointer relative ${activeTab === 'stats' ? 'text-[#eab308] border-b-2 border-b-[#eab308]' : 'text-[#6a7d92] hover:text-[#e8eef5]'}`}
        >
          📊 Produtividade do Dia
        </button>
        <button 
          onClick={() => setActiveTab('hist')}
          className={`ptab py-2 px-6 font-sans font-bold text-xs uppercase cursor-pointer relative ${activeTab === 'hist' ? 'text-[#eab308] border-b-2 border-b-[#eab308]' : 'text-[#6a7d92] hover:text-[#e8eef5]'}`}
        >
          📋 Histórico de Aferições <span className="ml-1.5 px-2 py-0.5 rounded-full bg-[#151b23] border border-[#222d3a] text-[10px] text-snow">{blitzRows.length}</span>
        </button>
      </div>

      {activeTab === 'stats' && (
        <div className="g-card p-6 flex flex-col gap-6 bg-gradient-to-br from-[#11151c] to-[#151b23] border border-[#222d3a]">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="font-sans font-black text-lg text-[#eab308] uppercase tracking-wide flex items-center gap-2">
                <BarChart2 className="w-5 h-5" /> Minha Produtividade de Hoje (Aferição Refugo)
              </h3>
              <p className="text-xs text-[#6a7d92] mt-1">
                Visão em tempo real das aferições registradas no seu turno de hoje ({new Date().toLocaleDateString('pt-BR')}).
              </p>
            </div>
            <div className="text-[10px] text-[#6a7d92] font-mono font-bold bg-[#151b23] border border-[#222d3a] px-3 py-1.5 rounded-lg">
              OPERADOR: {user.nome}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#151b23] border border-[#222d3a] rounded-xl p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-[#eab308]/10 text-[#eab308]">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#6a7d92] block tracking-wider">Aferições Realizadas</span>
                <span className="text-xl font-bold text-snow font-mono">
                  {blitzRows.filter(r => r.data === new Date().toLocaleDateString('pt-BR') && r.fiscal === user.nome).length}
                </span>
              </div>
            </div>

            <div className="bg-[#151b23] border border-[#222d3a] rounded-xl p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-indigo-500/10 text-indigo-400">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#6a7d92] block tracking-wider">Garrafas Avaliadas</span>
                <span className="text-xl font-bold text-snow font-mono">
                  {blitzRows.filter(r => r.data === new Date().toLocaleDateString('pt-BR') && r.fiscal === user.nome).reduce((sum, r) => sum + (r.totalGeralAmostrado || 0), 0)} u
                </span>
              </div>
            </div>

            <div className="bg-[#151b23] border border-[#222d3a] rounded-xl p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-red-500/10 text-red-400">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#6a7d92] block tracking-wider">Refugos Detectados</span>
                <span className="text-xl font-bold text-snow font-mono">
                  {blitzRows.filter(r => r.data === new Date().toLocaleDateString('pt-BR') && r.fiscal === user.nome).reduce((sum, r) => sum + (r.totalGeralRefugado || 0), 0)} u
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold text-[#6a7d92] uppercase tracking-wider">Histórico Detalhado de Hoje</h4>
            {blitzRows.filter(r => r.data === new Date().toLocaleDateString('pt-BR') && r.fiscal === user.nome).length === 0 ? (
              <div className="text-center py-6 border border-dashed border-[#222d3a] rounded-xl text-xs text-[#6a7d92]">
                Nenhuma aferição registrada por você hoje ainda. Use a aba "Nova Aferição" para começar!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#a0aec0]">
                  <thead>
                    <tr className="border-b border-[#222d3a] text-[#6a7d92] uppercase text-[10px] font-bold tracking-wider">
                      <th className="py-2.5 px-3">Placa / Rota</th>
                      <th className="py-2.5 px-3">Ajudante</th>
                      <th className="py-2.5 px-3">Total Amostra</th>
                      <th className="py-2.5 px-3">Total Refugado</th>
                      <th className="py-2.5 px-3">Índice Refugo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222d3a]">
                    {blitzRows
                      .filter(r => r.data === new Date().toLocaleDateString('pt-BR') && r.fiscal === user.nome)
                      .map((r, idx) => {
                        const totalA = r.totalGeralAmostrado || 1;
                        const totalR = r.totalGeralRefugado || 0;
                        const perc = ((totalR / totalA) * 100).toFixed(1);
                        return (
                          <tr key={r._docId || idx} className="hover:bg-[#151b23]/30 transition-colors">
                            <td className="py-3 px-3 font-bold text-snow">
                              <span className="text-[#eab308] font-mono mr-1.5">{r.placa}</span>
                              <span className="text-[#6a7d92] text-[10px]">({r.rota})</span>
                            </td>
                            <td className="py-3 px-3">{r.ajudante || '—'}</td>
                            <td className="py-3 px-3 font-mono">{r.totalGeralAmostrado} u</td>
                            <td className="py-3 px-3 font-mono text-red-400 font-bold">{r.totalGeralRefugado} u</td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded font-bold font-mono text-[10px] ${
                                Number(perc) > 5 ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
                              }`}>
                                {perc}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'form' ? (
        <div className="flex flex-col gap-6">
          
          {/* General Fields Header */}
          <div className="g-card p-6 flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222d3a] pb-3">
              <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-[#eab308]">Ficha Geral da Amostragem</h4>
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
                    setAjudante('');
                    setMapa('');
                    setRota('');
                    setObs('');
                    setPlacaOutro('');
                    setInputs(defaultInputs);
                    setDraftRestored(false);
                    localStorage.removeItem(draftKey);
                  }}
                  className="text-[9px] uppercase font-black tracking-wider text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                >
                  Limpar formulário
                </button>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="flex flex-col gap-1.5 md:col-span-3">
                <label className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#6a7d92]">Data do Carregamento *</label>
                <input 
                  type="date"
                  value={data}
                  onChange={e => setData(e.target.value)}
                  className="g-input text-snow"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-5">
                <label className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#6a7d92]">Motorista / Ajudante do Veículo *</label>
                <input 
                  type="text"
                  placeholder="Nome completo do conferido"
                  value={ajudante}
                  onChange={e => setAjudante(e.target.value)}
                  className="g-input"
                />
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-4">
                <label className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#6a7d92]">Placa do Caminhão *</label>
                <select 
                  value={placaPrefix} 
                  onChange={e => setPlacaPrefix(e.target.value)} 
                  className="g-input bg-[#151b23] border-[#1c2530]"
                >
                  <option value="QSK7D92">QSK7D92</option>
                  <option value="OXO0532">OXO0532</option>
                  <option value="OXO0542">OXO0542</option>
                  <option value="OXO0552">OXO0552</option>
                  <option value="OXO0782">OXO0782</option>
                  <option value="SLB4A26">SLB4A26</option>
                  <option value="NPR2601">NPR2601</option>
                  <option value="SLB4A56">SLB4A56</option>
                  <option value="TOZ8B20">TOZ8B20</option>
                  <option value="TOZ8B50">TOZ8B50</option>
                  <option value="Outra...">Outra Placa...</option>
                </select>
                {placaPrefix === 'Outra...' && (
                  <input 
                    type="text"
                    maxLength={8}
                    placeholder="DIGITE A PLACA"
                    value={placaCustom}
                    onChange={e => setPlacaOutro(e.target.value.toUpperCase())}
                    className="g-input mt-2"
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#6a7d92]">Mapa de Carga</label>
                <input 
                  type="text"
                  placeholder="Nº de controle"
                  value={mapa}
                  onChange={e => setMapa(e.target.value)}
                  className="g-input font-mono"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#6a7d92]">Rota Comercial</label>
                <input 
                  type="text"
                  placeholder="Ex: Rota 03"
                  value={rota}
                  onChange={e => setRota(e.target.value)}
                  className="g-input font-mono"
                />
              </div>
            </div>
          </div>

          {/* Interactive cards per retornáveis types */}
          {RFG_TIPOS.map(t => {
            const stats = getPackageStats(t.id);
            return (
              <div key={t.id} className="g-card overflow-hidden">
                <div className="p-4 bg-[#151b23] border-b border-[#222d3a] flex items-center justify-between gap-4 flex-wrap">
                  <h4 className="font-sans font-black text-sm tracking-wider uppercase text-snow">
                    🍼 Embalagem: {t.label} 
                  </h4>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] uppercase font-bold text-[#6a7d92]">Caixas Aferidas</span>
                    <input 
                      type="number"
                      min={0}
                      placeholder="0"
                      value={inputs[t.id].caixas || ''}
                      onChange={e => handleInputChange(t.id, 'caixas', parseInt(e.target.value) || 0)}
                      className="g-input w-20 text-center font-bold text-[#eab308] border-[#eab308]/40 bg-[#0f1318]"
                    />
                    <span className="text-[10px] text-[#6a7d92] font-semibold w-16">
                      {stats.totalAferido > 0 ? `= ${stats.totalAferido} un` : ''}
                    </span>
                  </div>
                </div>

                <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#07090d]">
                  {RFG_DEFEITOS.map(d => (
                    <div key={d.k} className="flex flex-col gap-1 p-2.5 bg-[#0f1318] border border-[#1c2530] rounded-lg">
                      <label className="text-[9px] uppercase font-bold text-[#6a7d92] truncate" title={d.l}>{d.l}</label>
                      <input 
                        type="number"
                        min={0}
                        placeholder="0"
                        value={inputs[t.id][d.k] || ''}
                        onChange={e => handleInputChange(t.id, d.k, parseInt(e.target.value) || 0)}
                        className={`g-input text-center py-1.5 focus:border-[#ef4444]/60 ${inputs[t.id][d.k] > 0 ? 'text-[#ef4444] font-black border-[#ef4444]/40 bg-[#ef4444]/5' : ''}`}
                      />
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-[#151b23]/50 border-t border-[#222d3a] flex justify-between text-xs text-[#6a7d92] px-4 font-semibold">
                  <span>Defeitos Totais: <strong className={stats.totalDefects > 0 ? 'text-[#ef4444]' : 'text-[#22c55e]'}>{stats.totalDefects}</strong></span>
                  <span>Percentual de Refugo: <strong className="text-snow">{stats.pct.toFixed(2)}%</strong></span>
                </div>
              </div>
            );
          })}

          {/* Observations and Live Consolidated Summary */}
          <div className="g-card p-6 flex flex-col gap-4 border-l-2 border-l-[#eab308]">
            <h4 className="font-sans font-black text-xs uppercase tracking-wider text-[#eab308]">Anotações Adicionais</h4>
            <textarea 
              value={obs}
              onChange={e => setObs(e.target.value)}
              placeholder="Descreva quaisquer detalhes sobre quebras excepcionais verificadas no pátio..."
              className="g-input h-16 resize-none"
            />
          </div>

          <div className="p-5 g-card bg-[#eab308]/5 border-[#eab308]/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6 flex-wrap justify-center text-center sm:text-left">
              <div>
                <span className="block text-[8px] uppercase tracking-wider font-bold text-[#6a7d92]">Total Caixas</span>
                <span className="font-sans font-black text-2xl text-snow">{consolidated.caixas || '—'}</span>
              </div>
              <div>
                <span className="block text-[8px] uppercase tracking-wider font-bold text-[#6a7d92]">Total Aferido</span>
                <span className="font-sans font-black text-2xl text-snow">{consolidated.unidades || '—'} <small className="text-xs text-[#6a7d92]">unidades</small></span>
              </div>
              <div>
                <span className="block text-[8px] uppercase tracking-wider font-bold text-[#6a7d92]">Total Refugo</span>
                <span className={`font-sans font-black text-2xl ${consolidated.defeitos > 0 ? 'text-[#ef4444]' : 'text-[#22c55e]'}`}>{consolidated.defeitos || '0'}</span>
              </div>
            </div>
            
            <div className="text-center sm:text-right">
              <span className="block text-[9px] uppercase tracking-widest font-black text-[#6a7d92]">PERCENTUAL GERAL REFUGO</span>
              <span className={`font-sans font-black text-3xl tracking-wide ${consolidated.defeitos > 0 ? 'text-[#eab308]' : 'text-[#22c55e]'}`}>
                {consolidated.unidades > 0 ? consolidated.pct.toFixed(2)+'%' : '0.00%'}
              </span>
            </div>
          </div>

          <div className="flex gap-4">
            <button 
              type="button"
              onClick={handleClean}
              className="btn-ghost flex-1 py-4 border border-[#243040] text-[#6a7d92] hover:text-[#e8eef5] rounded-xl text-xs uppercase font-extrabold tracking-wider"
            >
              🗑 Limpar formulário
            </button>
            <button 
              type="button"
              disabled={registering}
              onClick={handleRegister}
              className="py-4 font-sans font-bold uppercase tracking-widest text-[#07090d] bg-gradient-to-br from-[#eab308] to-[#ca9803] hover:shadow-[0_4px_16px_rgba(234,179,8,0.25)] rounded-xl disabled:opacity-50 flex-[2] cursor-pointer"
            >
              {registering ? 'Gravando dados...' : '💾 CONCLUIR E SALVAR BLITZ'}
            </button>
          </div>

        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="g-card p-4">
            <input 
              type="text"
              placeholder="🔍 Busque por Placa, Ajudante, Rota, Data, etc..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="g-input w-full text-xs"
            />
          </div>

          <div className="flex flex-col gap-3">
            {(() => {
              const grouped = filteredHistory.reduce((acc, r) => {
                const key = r.data || r.dataISO || 'sem-data';
                if (!acc[key]) acc[key] = [];
                acc[key].push(r);
                return acc;
              }, {} as Record<string, BlitzRefugoRow[]>);

              if (Object.keys(grouped).length === 0) {
                return <div className="g-card p-12 text-center text-[#6a7d92]">Nenhuma aferição de refugo computada.</div>;
              }

              return (Object.entries(grouped) as [string, BlitzRefugoRow[]][]).map(([dateKey, rows]) => {
                const isOpen = !!expandedDates[dateKey];
                const totalDefects = rows.reduce((s, r) => s + (r.totalDef || 0), 0);
                const totalBoxes = rows.reduce((s, r) => s + (r.totalCaixas || 0), 0);

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
                        <span className="font-sans font-black text-sm text-[#eab308] tracking-wide">📅 {formattedDate}</span>
                        <span className="text-[10px] bg-[#11151c] border border-[#222d3a] px-2 py-0.5 rounded-full font-bold text-snow">
                          {rows.length} fichas
                        </span>
                        <span className="text-[10px] text-[#6a7d92] font-semibold">
                          📦 {totalBoxes} caixas aferidas
                        </span>
                        {totalDefects > 0 ? (
                          <span className="text-[9px] bg-[#ef4444]/15 border border-[#ef4444]/25 text-[#fca5a5] px-2 py-0.5 rounded-full font-bold">
                            ⚠ {totalDefects} avarias detectadas
                          </span>
                        ) : (
                          <span className="text-[9px] bg-[#22c55e]/15 border border-[#22c55e]/25 text-[#22c55e] px-2 py-0.5 rounded-full font-bold">
                            ✓ 100% Ok (Refugo zero)
                          </span>
                        )}
                      </div>
                      <span className="text-[#6a7d92] text-xs transition-transform" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
                    </div>

                    {isOpen && (
                      <div className="p-4 flex flex-col gap-4 bg-[#0c1015]/40 border-t border-[#222d3a]/40">
                        {rows.map((r, i) => (
                          <div key={r._docId || i} className="g-card overflow-hidden border border-[#222d3a]">
                            <div className="p-4 bg-[#151b23] border-b border-[#222d3a] flex items-center justify-between flex-wrap gap-4">
                              <div>
                                <h4 className="font-sans font-black text-[#eab308] tracking-widest text-lg">{r.placa}</h4>
                                <span className="text-[10px] text-[#6a7d92] uppercase font-bold tracking-wider">Ajudante: {r.ajudante}</span>
                              </div>
                              <div className="text-right">
                                <div className="text-[10px] text-[#6a7d92] uppercase mt-1">
                                  {r.mapa ? `Mapa: ${r.mapa}` : ''} {r.rota ? `· Rota: ${r.rota}` : ''}
                                </div>
                              </div>
                            </div>

                            <div className="p-4">
                              {/* Exibe tabela compacta das embalagens e defeitos */}
                              <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse font-sans text-xs">
                                  <thead>
                                    <tr className="bg-[#07090d] border-b border-[#222d3a]">
                                      <th className="p-2 text-[#6a7d92]">Embalagem</th>
                                      <th className="p-2 text-[#6a7d92] text-center">Aferido</th>
                                      <th className="p-2 text-[#6a7d92] text-center">Refugo</th>
                                      <th className="p-2 text-[#6a7d92] text-right">% Refugo</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[#222d3a]/60">
                                    {RFG_TIPOS.map(t => {
                                      const e: any = r.emb?.[t.id] || {};
                                      const cx = e.caixas || 0;
                                      const un = e.aferido || 0;
                                      const def = e.total_def || 0;
                                      const pct = un > 0 ? (def / un) * 100 : 0;
                                      return (
                                        <tr key={t.id}>
                                          <td className="p-2 truncate font-bold">{t.label}</td>
                                          <td className="p-2 text-center">{cx} cx ({un} un)</td>
                                          <td className={`p-2 text-center font-bold ${def > 0 ? 'text-[#ef4444]' : 'text-[#22c55e]'}`}>{def || '—'}</td>
                                          <td className="p-2 text-right font-mono">{pct.toFixed(2)}%</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                  <tfoot className="bg-[#151b23]/30 font-bold border-t border-[#222d3a]">
                                    <tr>
                                      <td className="p-2">Consolidado</td>
                                      <td className="p-2 text-center">{r.totalCaixas} cx ({r.totalAferido} un)</td>
                                      <td className={`p-2 text-center ${r.totalDef > 0 ? 'text-[#ef4444]' : 'text-[#22c55e]'}`}>{r.totalDef}</td>
                                      <td className="p-2 text-right text-[#eab308] text-sm">{r.pctRefugo}%</td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>

                              {/* Defeitos quantificados listagem de chips */}
                              <div className="mt-4 flex flex-wrap gap-1.5 p-3 bg-[#07090d] border border-[#1c2530] rounded-xl">
                                <span className="block text-[8px] uppercase tracking-widest font-black text-[#6a7d92] w-full mb-1">Avarias detectadas no veículo</span>
                                {RFG_DEFEITOS.map(d => {
                                  const sum = RFG_TIPOS.reduce((acc, t) => acc + (r.emb?.[t.id]?.[d.k] || 0), 0);
                                  if (sum === 0) return null;
                                  return (
                                    <span key={d.k} className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded-full bg-[#ef4444]/10 border border-[#ef4444]/25 text-[#fca5a5]">
                                      {d.l}: <strong className="text-white bg-red px-1.5 py-0.5 rounded-full text-[9px]">{sum}</strong>
                                    </span>
                                  );
                                })}
                                {r.totalDef === 0 && (
                                  <span className="text-xs text-[#22c55e] font-semibold">✅ Nenhuma quebra ou anomalia nas garrafas verificadas.</span>
                                )}
                              </div>

                              {r.obs && (
                                <div className="text-xs text-[#6a7d92] italic mt-3.5 border-t border-[#222d3a] pt-3">
                                  📝 Observações: <span className="text-snow not-italic font-bold">{r.obs}</span>
                                </div>
                              )}
                            </div>

                            <div className="p-3 bg-[#151b23]/50 border-t border-[#222d3a] flex justify-between items-center text-xs text-[#6a7d92] px-4 font-semibold">
                              <span />
                              <button 
                                onClick={() => handleDelete(r._docId)}
                                className="py-1 px-3 bg-red/10 border border-red/20 text-[#fca5a5] hover:bg-red hover:text-white rounded-lg text-[10px] font-black cursor-pointer uppercase transition-all"
                              >
                                🗑 Excluir Ficha
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

    </div>
  );
}
export {};
