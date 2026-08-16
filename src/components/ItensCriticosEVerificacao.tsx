import React, { useState, useEffect } from 'react';
import { AlertTriangle, ClipboardCheck, CheckCircle2, Plus, Trash2, Edit3, X, Save } from 'lucide-react';

export interface ItemCriticoOuVerificacao {
  id: string;
  tipo: 'IC' | 'IV';
  titulo: string;
  descricao: string;
  setor?: string;
  ativo: boolean;
  atualizadoEm: string;
}

const DEFAULT_ITEMS: ItemCriticoOuVerificacao[] = [
  // IC - ITENS CRÍTICOS DO DIA
  {
    id: 'ic-01',
    tipo: 'IC',
    titulo: 'Produtos com Shelf Life ≤ 15 dias no Armazém',
    descricao: 'Verificar lote e priorizar saída de SKUs críticos via FEFO.',
    setor: 'Armazém / Validade',
    ativo: true,
    atualizadoEm: '2026-08-16'
  },
  {
    id: 'ic-02',
    tipo: 'IC',
    titulo: 'Avaria Elevada na Rua C (Picking Puxado)',
    descricao: 'Respeitar amarração correta de palete para evitar quebra em curva.',
    setor: 'Picking / Movimentação',
    ativo: true,
    atualizadoEm: '2026-08-16'
  },

  // IV - ITENS DE VERIFICAÇÃO DIÁRIA
  {
    id: 'iv-01',
    tipo: 'IV',
    titulo: 'Execução Rigorosa da Regra FEFO',
    descricao: 'Conferir data de validade impresso antes da montagem.',
    setor: 'Conferência / Montagem',
    ativo: true,
    atualizadoEm: '2026-08-16'
  },
  {
    id: 'iv-02',
    tipo: 'IV',
    titulo: 'Checklist Diário de Empilhadeira & Transpaleteira',
    descricao: 'Checagem de fluido, buzina e travamento antes do início do turno.',
    setor: 'Equipamentos / Frota',
    ativo: true,
    atualizadoEm: '2026-08-16'
  }
];

interface ItensCriticosEVerificacaoProps {
  user?: any;
  isSupervisorOrAdmin?: boolean;
}

export const ItensCriticosEVerificacao: React.FC<ItensCriticosEVerificacaoProps> = ({
  user,
  isSupervisorOrAdmin = false
}) => {
  const [items, setItems] = useState<ItemCriticoOuVerificacao[]>(() => {
    try {
      const saved = localStorage.getItem('oficial_ics_ivs_compartilhados');
      if (saved) return JSON.parse(saved);
      return DEFAULT_ITEMS;
    } catch {
      return DEFAULT_ITEMS;
    }
  });

  const [isManaging, setIsManaging] = useState(false);
  const [novoTipo, setNovoTipo] = useState<'IC' | 'IV'>('IC');
  const [novoTitulo, setNovoTitulo] = useState('');
  const [novaDescricao, setNovaDescricao] = useState('');
  const [novoSetor, setNovoSetor] = useState('Armazém Geral');

  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const saved = localStorage.getItem('oficial_ics_ivs_compartilhados');
        if (saved) setItems(JSON.parse(saved));
      } catch {}
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('ics_ivs_updated', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('ics_ivs_updated', handleStorageChange);
    };
  }, []);

  const saveItems = (newItems: ItemCriticoOuVerificacao[]) => {
    setItems(newItems);
    localStorage.setItem('oficial_ics_ivs_compartilhados', JSON.stringify(newItems));
    window.dispatchEvent(new Event('ics_ivs_updated'));
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoTitulo.trim()) return;

    const newItem: ItemCriticoOuVerificacao = {
      id: `${novoTipo.toLowerCase()}-${Date.now()}`,
      tipo: novoTipo,
      titulo: novoTitulo.trim(),
      descricao: novaDescricao.trim(),
      setor: novoSetor.trim(),
      ativo: true,
      atualizadoEm: new Date().toISOString().split('T')[0]
    };

    saveItems([...items, newItem]);
    setNovoTitulo('');
    setNovaDescricao('');
  };

  const handleDeleteItem = (id: string) => {
    saveItems(items.filter(i => i.id !== id));
  };

  const icList = items.filter(i => i.tipo === 'IC' && i.ativo);
  const ivList = items.filter(i => i.tipo === 'IV' && i.ativo);

  return (
    <div className="space-y-4">
      {/* TRÍPLICE ESTRUTURA: IC (ITENS CRÍTICOS) & IV (ITENS DE VERIFICAÇÃO DO DIA) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* ITENS CRÍTICOS DO DIA (IC) */}
        <div className="bg-[#111a30] border border-rose-500/30 rounded-2xl p-5 space-y-3 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" /> IC - Itens Críticos do Dia
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[9px] bg-rose-500/20 text-rose-300 font-bold px-2 py-0.5 rounded border border-rose-500/30">
                Atenção Imediata
              </span>
              {isSupervisorOrAdmin && (
                <button
                  onClick={() => setIsManaging(!isManaging)}
                  className="text-[9px] text-slate-400 hover:text-white p-1 rounded bg-slate-800"
                  title="Configurar IC / IV"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {icList.map((ic) => (
              <div key={ic.id} className="p-3 bg-[#0b1222] rounded-xl border border-rose-500/20 flex items-start justify-between gap-2.5 group">
                <div className="flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 mt-1 shrink-0" />
                  <div>
                    <strong className="text-xs text-white block">{ic.titulo}</strong>
                    <span className="text-[10px] text-slate-400">{ic.descricao}</span>
                  </div>
                </div>
                {isManaging && isSupervisorOrAdmin && (
                  <button
                    onClick={() => handleDeleteItem(ic.id)}
                    className="text-rose-400 hover:text-rose-300 p-1 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}

            {icList.length === 0 && (
              <p className="text-xs text-slate-500 italic p-3 text-center">Nenhum item crítico cadastrado para o dia.</p>
            )}
          </div>
        </div>

        {/* ITENS DE VERIFICAÇÃO DO DIA (IV) */}
        <div className="bg-[#111a30] border border-sky-500/30 rounded-2xl p-5 space-y-3 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-sky-400 flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-sky-400" /> IV - Itens de Verificação Diária
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[9px] bg-sky-500/20 text-sky-300 font-bold px-2 py-0.5 rounded border border-sky-500/30">
                Checklist Rotina
              </span>
              {isSupervisorOrAdmin && (
                <button
                  onClick={() => setIsManaging(!isManaging)}
                  className="text-[9px] text-slate-400 hover:text-white p-1 rounded bg-slate-800"
                  title="Configurar IC / IV"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {ivList.map((iv) => (
              <div key={iv.id} className="p-3 bg-[#0b1222] rounded-xl border border-sky-500/20 flex items-start justify-between gap-2.5 group">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-xs text-white block">{iv.titulo}</strong>
                    <span className="text-[10px] text-slate-400">{iv.descricao}</span>
                  </div>
                </div>
                {isManaging && isSupervisorOrAdmin && (
                  <button
                    onClick={() => handleDeleteItem(iv.id)}
                    className="text-rose-400 hover:text-rose-300 p-1 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}

            {ivList.length === 0 && (
              <p className="text-xs text-slate-500 italic p-3 text-center">Nenhum item de verificação cadastrado para o dia.</p>
            )}
          </div>
        </div>
      </div>

      {/* FORMULÁRIO DE GESTÃO PARA SUPERVISÃO / ADMIN */}
      {isManaging && isSupervisorOrAdmin && (
        <form onSubmit={handleAddItem} className="p-4 bg-[#081226] border border-slate-700 rounded-2xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-black text-amber-400 uppercase">Adicionar Novo IC / IV Unificado</span>
            <button type="button" onClick={() => setIsManaging(false)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Tipo</label>
              <select
                value={novoTipo}
                onChange={e => setNovoTipo(e.target.value as any)}
                className="w-full bg-[#111a30] border border-slate-700 rounded-lg p-2 text-xs text-white"
              >
                <option value="IC">IC - Item Crítico (Atenção Imediata)</option>
                <option value="IV">IV - Item de Verificação (Rotina)</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Título do Item *</label>
              <input
                type="text"
                placeholder="Ex: Execução Rigorosa da Regra FEFO"
                value={novoTitulo}
                onChange={e => setNovoTitulo(e.target.value)}
                className="w-full bg-[#111a30] border border-slate-700 rounded-lg p-2 text-xs text-white"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Descrição / Instrução de Ação</label>
            <input
              type="text"
              placeholder="Ex: Conferir data de validade impresso antes da montagem..."
              value={novaDescricao}
              onChange={e => setNovaDescricao(e.target.value)}
              className="w-full bg-[#111a30] border border-slate-700 rounded-lg p-2 text-xs text-white"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar Item
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
export default ItensCriticosEVerificacao;
