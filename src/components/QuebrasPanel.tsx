import React, { useState, useEffect } from 'react';
import { db, isCustomFirebaseConnected } from '../firebase';
import { collection, addDoc, onSnapshot, query, where, deleteDoc, doc } from 'firebase/firestore';
import { Usuario, Empresa, QuebraRow } from '../types';
import { PRODUCTS } from '../planosData';
import { TrendingUp, CheckCircle, Clock, Award, BarChart2, AlertTriangle } from 'lucide-react';

interface QuebrasPanelProps {
  user: Usuario;
  empresa: Empresa | null;
}

const QB_TIPOS: Record<string, Array<{ cod: number; motivo: string }>> = {
  'ARMAZEM': [
    { cod: 521, motivo: 'ACIDENTE DE TRABALHO' },
    { cod: 530, motivo: 'CLIENTE' },
    { cod: 536, motivo: 'CONSUMO IMPROPRIO' },
    { cod: 538, motivo: 'DIFERENÇA DE ESTOQUE' },
    { cod: 540, motivo: 'DIFERENÇA INVENTÁRIO' },
    { cod: 522, motivo: 'ESTOURADA' },
    { cod: 523, motivo: 'ESTUFADO' },
    { cod: 541, motivo: 'EVENTOS' },
    { cod: 524, motivo: 'FALTA NO PALETE' },
    { cod: 528, motivo: 'FURTO' },
    { cod: 527, motivo: 'IMPUREZA' },
    { cod: 520, motivo: 'INVERSÃO' },
    { cod: 535, motivo: 'MAL CHAPEADA' },
    { cod: 532, motivo: 'MAL CHEIO' },
    { cod: 533, motivo: 'PRODUTO VENCIDO' },
    { cod: 539, motivo: 'QUEBRA COM MOVIMENTAÇÃO' },
    { cod: 537, motivo: 'QUEBRA PICKING' },
    { cod: 525, motivo: 'QUEBRADA' },
    { cod: 531, motivo: 'SEM GAS' },
    { cod: 534, motivo: 'SEM TAMPA' },
    { cod: 529, motivo: 'TROCA - ARMAZÉM' },
    { cod: 526, motivo: 'VAZAMENTO' },
  ],
  'ENTREGA': [
    { cod: 543, motivo: 'ACIDENTE DE TRABALHO' },
    { cod: 556, motivo: 'CARGA TOMBADA' },
    { cod: 551, motivo: 'CLIENTE' },
    { cod: 542, motivo: 'CONSUMO IMPROPRIO' },
    { cod: 544, motivo: 'ESTOURADA' },
    { cod: 545, motivo: 'ESTUFADO' },
    { cod: 558, motivo: 'EVENTOS' },
    { cod: 546, motivo: 'FALTA NO PALETE' },
    { cod: 550, motivo: 'FURTO' },
    { cod: 549, motivo: 'IMPUREZA' },
    { cod: 560, motivo: 'INVERSÃO' },
    { cod: 559, motivo: 'MAL CHAPEADA' },
    { cod: 553, motivo: 'MAL CHEIO' },
    { cod: 557, motivo: 'QUEBRA COM MOVIMENTAÇÃO' },
    { cod: 547, motivo: 'QUEBRADA' },
    { cod: 552, motivo: 'SEM GAS' },
    { cod: 555, motivo: 'SEM TAMPA' },
    { cod: 548, motivo: 'VAZAMENTO' },
    { cod: 554, motivo: 'VENCIDO' },
  ],
  'MERCADO': [
    { cod: 561, motivo: 'ACIDENTE DE TRABALHO' },
    { cod: 570, motivo: 'CLIENTE' },
    { cod: 562, motivo: 'ESTOURADA' },
    { cod: 563, motivo: 'ESTUFADO' },
    { cod: 564, motivo: 'FALTA NO PALETE' },
    { cod: 568, motivo: 'FURTO' },
    { cod: 567, motivo: 'IMPUREZA' },
    { cod: 572, motivo: 'MAL CHEIO' },
    { cod: 565, motivo: 'QUEBRADA' },
    { cod: 571, motivo: 'SEM GAS' },
    { cod: 574, motivo: 'SEM TAMPA' },
    { cod: 569, motivo: 'TROCA' },
    { cod: 566, motivo: 'VAZAMENTO' },
    { cod: 573, motivo: 'VENCIDO' },
  ],
  'PUXADA': [
    { cod: 587, motivo: 'CARGA TOMBADA' },
    { cod: 582, motivo: 'CLIENTE' },
    { cod: 575, motivo: 'ESTUFADO' },
    { cod: 576, motivo: 'FALTA NO PALETE' },
    { cod: 580, motivo: 'FURTO' },
    { cod: 579, motivo: 'IMPUREZA' },
    { cod: 588, motivo: 'MAL CHAPEADA' },
    { cod: 584, motivo: 'MAL CHEIO' },
    { cod: 589, motivo: 'QUEBRA COM MOVIMENTAÇÃO' },
    { cod: 577, motivo: 'QUEBRADA' },
    { cod: 583, motivo: 'SEM GAS' },
    { cod: 581, motivo: 'TROCA' },
    { cod: 578, motivo: 'VAZAMENTO' },
    { cod: 585, motivo: 'VENCIDO' },
  ],
};

export default function QuebrasPanel({ user, empresa }: QuebrasPanelProps) {
  const empresaId = empresa?.id || 'demo';
  const draftKey = `quebras_draft_${empresaId}_${user.nome || 'guest'}`;

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

  const [produtoBusca, setProdutoBusca] = useState<string>(() => getDraftValue('produtoBusca', ''));
  const [selectedProd, setSelectedProd] = useState<{ codigo: number, descricao: string } | null>(() => getDraftValue('selectedProd', null));
  const [showDropdown, setShowProdDropdown] = useState(false);
  const [quantidade, setQuantidade] = useState<number>(() => getDraftValue('quantidade', 1));
  const [area, setArea] = useState<string>(() => getDraftValue('area', 'ARMAZEM'));
  const [turno, setTurno] = useState<string>(() => getDraftValue('turno', 'MANHÃ'));
  const [motivoCod, setMotivoCod] = useState<number>(() => getDraftValue('motivoCod', 0));
  
  const [activeTab, setActiveTab] = useState<'form' | 'stats' | 'hist'>('form');
  const [quebras, setQuebras] = useState<QuebraRow[]>([]);
  const [registering, setRegistering] = useState(false);
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});
  const [draftRestored, setDraftRestored] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return !!(parsed.produtoBusca || parsed.selectedProd || parsed.quantidade > 1 || parsed.area !== 'ARMAZEM' || parsed.turno !== 'MANHÃ');
      }
    } catch (e) {}
    return false;
  });

  const toggleDateGroup = (dateKey: string) => {
    setExpandedDates(prev => ({ ...prev, [dateKey]: !prev[dateKey] }));
  };

  const motivosDisponiveis = QB_TIPOS[area] || [];

  // Reset selected motive code on area update (only if we don't have a loaded motive yet or area changes)
  useEffect(() => {
    if (motivosDisponiveis.length > 0) {
      const savedMotive = getDraftValue('motivoCod', null);
      if (savedMotive && motivosDisponiveis.some(m => m.cod === savedMotive)) {
        setMotivoCod(savedMotive);
      } else {
        setMotivoCod(motivosDisponiveis[0].cod);
      }
    } else {
      setMotivoCod(0);
    }
  }, [area]);

  // Sync state with local draft saving
  useEffect(() => {
    const draftData = {
      produtoBusca,
      selectedProd,
      quantidade,
      area,
      turno,
      motivoCod
    };
    localStorage.setItem(draftKey, JSON.stringify(draftData));
  }, [produtoBusca, selectedProd, quantidade, area, turno, motivoCod, draftKey]);

  // Sync with prop updates / user changing
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setProdutoBusca(parsed.produtoBusca || '');
        setSelectedProd(parsed.selectedProd || null);
        setQuantidade(parsed.quantidade || 1);
        setArea(parsed.area || 'ARMAZEM');
        setTurno(parsed.turno || 'MANHÃ');
        setMotivoCod(parsed.motivoCod || 0);
        setDraftRestored(!!(parsed.produtoBusca || parsed.selectedProd || parsed.quantidade > 1 || parsed.area !== 'ARMAZEM' || parsed.turno !== 'MANHÃ'));
      } else {
        setProdutoBusca('');
        setSelectedProd(null);
        setQuantidade(1);
        setArea('ARMAZEM');
        setTurno('MANHÃ');
        setMotivoCod(0);
        setDraftRestored(false);
      }
    } catch (e) {
      console.error(e);
    }
  }, [draftKey]);

  // Sync with Firestore (scoped to company)
  useEffect(() => {
    if (!db || !empresa?.id) {
      const saved = localStorage.getItem(`quebras_${empresa?.id || 'demo'}`);
      if (saved) setQuebras(JSON.parse(saved));
      return;
    }

    const companyId = empresa?.id || 'demo';
    const q = query(collection(db, 'quebras'));
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map(doc => ({ _docId: doc.id, ...doc.data() } as QuebraRow));
      const filtered = isCustomFirebaseConnected() ? rows : rows.filter(r => r.empresaId === companyId);
      filtered.sort((a, b) => (b.dataISO || '').localeCompare(a.dataISO || ''));
      setQuebras(filtered);
      localStorage.setItem(`quebras_${companyId}`, JSON.stringify(filtered));
    });

    return () => unsub();
  }, [empresa?.id]);

  const handleSelectProd = (p: { codigo: number, descricao: string }) => {
    setSelectedProd(p);
    setProdutoBusca(p.descricao);
    setShowProdDropdown(false);
  };

  const handleRegister = async () => {
    if (!selectedProd || !quantidade || !area || !turno || !motivoCod) {
      alert('Selecione o produto, digite a quantidade correspondente e insira o motivo.');
      return;
    }

    setRegistering(true);
    const today = new Date();
    const dataISO = today.toISOString().split('T')[0];
    const dataStr = today.toLocaleDateString('pt-BR');

    const chosenMotive = motivosDisponiveis.find(m => m.cod === motivoCod)?.motivo || String(motivoCod);

    const newRow: Omit<QuebraRow, '_docId'> & { empresaId: string } = {
      empresaId: empresa?.id || 'demo',
      data: dataStr,
      dataISO,
      codProduto: String(selectedProd.codigo),
      descricao: selectedProd.descricao,
      quantidade: Number(quantidade),
      area,
      turno,
      codQuebra: String(motivoCod),
      motivo: chosenMotive
    };

    try {
      if (db) {
        await addDoc(collection(db, 'quebras'), newRow);
      } else {
        const current = [...quebras, { _docId: String(Date.now()), ...newRow }];
        setQuebras(current);
        localStorage.setItem(`quebras_${empresa?.id || 'demo'}`, JSON.stringify(current));
      }

      setProdutoBusca('');
      setSelectedProd(null);
      setQuantidade(1);
      setDraftRestored(false);
      localStorage.removeItem(draftKey);
      setActiveTab('hist');
    } catch(e) {
      alert('Erro ao registrar quebra: ' + e);
    } finally {
      setRegistering(false);
    }
  };

  const handleDelete = async (docId?: string) => {
    if (!docId || !confirm('Excluir este lançamento de quebras?')) return;
    try {
      if (db) {
        await deleteDoc(doc(db, 'quebras', docId));
      } else {
        const remaining = quebras.filter(r => r._docId !== docId);
        setQuebras(remaining);
        localStorage.setItem(`quebras_${empresa?.id || 'demo'}`, JSON.stringify(remaining));
      }
    } catch (e) {
      alert('Erro ao excluir: ' + e);
    }
  };

  // Filter products for autocomplete dropdown
  const filteredProducts = PRODUCTS.filter(p => {
    const q = produtoBusca.toLowerCase();
    return String(p.codigo).includes(q) || p.descricao.toLowerCase().includes(q);
  }).slice(0, 10);

  return (
    <div className="flex flex-col gap-6">
      
      <div className="flex items-center justify-between p-4 bg-[#11151c] border-b border-[#222d3a] rounded-t-xl -mx-6 md:-mx-12 -mt-6">
        <span className="font-sans font-black text-sm tracking-widest text-[#ef4444] uppercase">💥 CONTROLE DE QUEBRAS E AVARIAS</span>
      </div>

      <div className="ptabs border-b border-[#222d3a] flex gap-2">
        <button 
          onClick={() => setActiveTab('form')}
          className={`ptab py-2 px-6 font-sans font-bold text-xs uppercase cursor-pointer relative ${activeTab === 'form' ? 'text-[#ef4444] border-b-2 border-b-[#ef4444]' : 'text-[#6a7d92] hover:text-[#e8eef5]'}`}
        >
          📝 Cadastrar Quebra
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
          📋 Histórico <span className="ml-1.5 px-2 py-0.5 rounded-full bg-[#151b23] border border-[#222d3a] text-[10px] text-snow">{quebras.length}</span>
        </button>
      </div>

      {activeTab === 'stats' && (
        <div className="g-card p-6 flex flex-col gap-6 bg-gradient-to-br from-[#11151c] to-[#151b23] border border-[#222d3a]">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="font-sans font-black text-lg text-[#ef4444] uppercase tracking-wide flex items-center gap-2">
                <BarChart2 className="w-5 h-5" /> Minha Produtividade de Hoje (Quebras)
              </h3>
              <p className="text-xs text-[#6a7d92] mt-1">
                Visão em tempo real das quebras registradas no seu turno de hoje ({new Date().toLocaleDateString('pt-BR')}).
              </p>
            </div>
            <div className="text-[10px] text-[#6a7d92] font-mono font-bold bg-[#151b23] border border-[#222d3a] px-3 py-1.5 rounded-lg">
              OPERADOR: {user.nome}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[#151b23] border border-[#222d3a] rounded-xl p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-[#ef4444]/10 text-[#ef4444]">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#6a7d92] block tracking-wider">Registros Efetuados</span>
                <span className="text-xl font-bold text-snow font-mono">
                  {quebras.filter(r => r.data === new Date().toLocaleDateString('pt-BR') && r.fiscal === user.nome).length}
                </span>
              </div>
            </div>

            <div className="bg-[#151b23] border border-[#222d3a] rounded-xl p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-red-500/10 text-red-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#6a7d92] block tracking-wider">Garrafas / Unidades Quebradas</span>
                <span className="text-xl font-bold text-snow font-mono">
                  {quebras.filter(r => r.data === new Date().toLocaleDateString('pt-BR') && r.fiscal === user.nome).reduce((sum, r) => sum + (r.quantidade || 0), 0)} u
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold text-[#6a7d92] uppercase tracking-wider">Histórico Detalhado de Hoje</h4>
            {quebras.filter(r => r.data === new Date().toLocaleDateString('pt-BR') && r.fiscal === user.nome).length === 0 ? (
              <div className="text-center py-6 border border-dashed border-[#222d3a] rounded-xl text-xs text-[#6a7d92]">
                Nenhuma quebra registrada por você hoje ainda. Use a aba "Cadastrar Quebra" para começar!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#a0aec0]">
                  <thead>
                    <tr className="border-b border-[#222d3a] text-[#6a7d92] uppercase text-[10px] font-bold tracking-wider">
                      <th className="py-2.5 px-3">Produto</th>
                      <th className="py-2.5 px-3">Quantidade</th>
                      <th className="py-2.5 px-3">Motivo / Cód</th>
                      <th className="py-2.5 px-3">Área / Turno</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222d3a]">
                    {quebras
                      .filter(r => r.data === new Date().toLocaleDateString('pt-BR') && r.fiscal === user.nome)
                      .map((r, idx) => (
                        <tr key={r._docId || idx} className="hover:bg-[#151b23]/30 transition-colors">
                          <td className="py-3 px-3 font-bold text-snow">
                            <span className="text-gray-500 font-mono text-[11px] block">{r.codSap}</span>
                            {r.produto}
                          </td>
                          <td className="py-3 px-3 font-mono text-red-400 font-semibold">{r.quantidade} un</td>
                          <td className="py-3 px-3">
                            <span className="font-mono bg-[#151b23] border border-[#222d3a] text-snow px-1.5 py-0.5 rounded mr-1.5 font-bold text-[10px]">
                              {r.motivoCod}
                            </span>
                            {r.motivo}
                          </td>
                          <td className="py-3 px-3 font-mono text-[#6a7d92]">
                            {r.area} ({r.turno})
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

      {activeTab === 'form' ? (
        <div className="g-card p-6 flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222d3a] pb-3">
            <h3 className="font-sans font-bold text-sm tracking-wider uppercase text-[#ef4444]">Cadastro de Quebra Operacional</h3>
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
                  setProdutoBusca('');
                  setSelectedProd(null);
                  setQuantidade(1);
                  setArea('ARMAZEM');
                  setTurno('MANHÃ');
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
            
            {/* Real-time search autocomplete */}
            <div className="flex flex-col gap-1.5 md:col-span-8 relative">
              <label className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#6a7d92]">Produto (Código ou Descrição) *</label>
              <input 
                type="text"
                placeholder="Busque pelo código ou por palavras..."
                value={produtoBusca}
                onChange={e => {
                  setProdutoBusca(e.target.value);
                  setShowProdDropdown(true);
                  if (selectedProd && e.target.value !== selectedProd.descricao) {
                    setSelectedProd(null);
                  }
                }}
                onFocus={() => setShowProdDropdown(true)}
                className="g-input"
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

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#6a7d92]">Código SKU</label>
              <input 
                type="text" 
                readOnly
                placeholder="Auto"
                value={selectedProd ? selectedProd.codigo : ''}
                className="g-input text-center text-[#f5a623] font-bold font-mono opacity-80"
              />
            </div>

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#6a7d92]">Unidades *</label>
              <input 
                type="number"
                min={1}
                value={quantidade}
                onChange={e => setQuantidade(Math.max(1, parseInt(e.target.value) || 0))}
                className="g-input text-center"
              />
            </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#6a7d92]">Área de Origem *</label>
              <select value={area} onChange={e => setArea(e.target.value)} className="g-input bg-[#151b23] border-[#1c2530]">
                <option value="ARMAZEM">Armazém / Depósito</option>
                <option value="ENTREGA">Rota de Entrega</option>
                <option value="MERCADO">Mercado / Retorno</option>
                <option value="PUXADA">Puxada / Transferência</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#6a7d92]">Turno Ocorrido *</label>
              <select value={turno} onChange={e => setTurno(e.target.value)} className="g-input bg-[#151b23] border-[#1c2530]">
                <option value="MANHÃ">Manhã</option>
                <option value="NOITE">Noite / Madrugada</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#6a7d92]">Tipo/Código de Quebra *</label>
              <select 
                value={motivoCod} 
                onChange={e => setMotivoCod(Number(e.target.value))} 
                className="g-input bg-[#151b23] border-[#1c2530]"
              >
                {motivosDisponiveis.map(m => (
                  <option key={m.cod} value={m.cod}>{m.cod} — {m.motivo}</option>
                ))}
              </select>
            </div>

          </div>

          <button 
            type="button"
            disabled={registering || !selectedProd}
            onClick={handleRegister}
            className="w-full py-4 text-sm font-sans font-bold uppercase tracking-widest text-white bg-gradient-to-br from-[#ef4444] to-[#af2424] hover:shadow-[0_4px_16px_rgba(239,68,68,0.25)] rounded-xl disabled:opacity-50 cursor-pointer"
          >
            {registering ? 'Lançando...' : '💾 ADICIONAR QUEBRA / AVARIA'}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {(() => {
            const grouped = quebras.reduce((acc, q) => {
              const key = q.dataISO || (q.data ? q.data.split('/').reverse().join('-') : 'sem-data');
              if (!acc[key]) acc[key] = [];
              acc[key].push(q);
              return acc;
            }, {} as Record<string, QuebraRow[]>);

            if (Object.keys(grouped).length === 0) {
              return <div className="g-card p-12 text-center text-[#6a7d92]">Nenhuma quebra registrada.</div>;
            }

            return (Object.entries(grouped) as [string, QuebraRow[]][]).map(([dateKey, rows]) => {
              const isOpen = !!expandedDates[dateKey];
              const totalUnits = rows.reduce((s, q) => s + (q.quantidade || 0), 0);

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
                        {rows.length} registros
                      </span>
                      <span className="text-[10px] text-[#6a7d92] font-semibold">
                        ❌ {totalUnits} unidades avariadas
                      </span>
                    </div>
                    <span className="text-[#6a7d92] text-xs transition-transform" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
                  </div>

                  {isOpen && (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse font-sans text-xs min-w-[700px]">
                        <thead>
                          <tr className="bg-[#07090d] border-b border-[#222d3a]">
                            <th className="p-3 text-[#6a7d92] text-left uppercase tracking-wider">Cód. SKU</th>
                            <th className="p-3 text-[#6a7d92] text-left uppercase tracking-wider">Descrição do SKU</th>
                            <th className="p-3 text-[#6a7d92] text-center uppercase tracking-wider">Unidades</th>
                            <th className="p-3 text-[#6a7d92] text-left uppercase tracking-wider">Área</th>
                            <th className="p-3 text-[#6a7d92] text-left uppercase tracking-wider">Turno</th>
                            <th className="p-3 text-[#6a7d92] text-left uppercase tracking-wider">Código Padrão</th>
                            <th className="p-3 text-[#6a7d92] text-left uppercase tracking-wider">Motivo</th>
                            <th className="p-3 text-[#6a7d92] text-right uppercase tracking-wider">Ação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#222d3a]/60">
                          {rows.map((q, i) => (
                            <tr key={q._docId || i} className="hover:bg-[#151b23]/10">
                              <td className="p-3 font-mono font-bold text-snow">{q.codProduto}</td>
                              <td className="p-3">{q.descricao}</td>
                              <td className="p-3 text-center text-red font-black text-sm">{q.quantidade}</td>
                              <td className="p-3 font-bold text-snow">{q.area}</td>
                              <td className="p-3 uppercase text-[10px] font-bold text-[#6a7d92]">{q.turno}</td>
                              <td className="p-3 font-mono font-bold text-[#f5a623]">{q.codQuebra}</td>
                              <td className="p-3 text-[#6a7d92]">{q.motivo}</td>
                              <td className="p-3 text-right">
                                <button 
                                  onClick={() => handleDelete(q._docId)}
                                  className="py-1 px-2 border border-[#ef4444]/20 hover:bg-[#ef4444] text-[#fca5a5] hover:text-white rounded text-[10px] font-bold cursor-pointer"
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

    </div>
  );
}
export {};
