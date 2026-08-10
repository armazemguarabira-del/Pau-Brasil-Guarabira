import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Plus, 
  Edit3, 
  Trash2, 
  Clock, 
  User, 
  Package, 
  AlertCircle, 
  History, 
  CheckCircle2, 
  Search,
  X,
  FileText
} from 'lucide-react';
import { ContingenciaItem, ContingenciaMovimentacao } from '../types/estoque';
import { 
  getContingenciaItens, 
  saveContingenciaItens, 
  getContingenciaHistorico, 
  saveContingenciaHistorico 
} from '../utils/estoqueStorage';
import { PRODUCTS } from '../planosData';
import { Usuario } from '../types';

interface GestaoContingenciaPanelProps {
  user: Usuario;
  onDataUpdated?: () => void;
}

export default function GestaoContingenciaPanel({ user, onDataUpdated }: GestaoContingenciaPanelProps) {
  const [itens, setItens] = useState<ContingenciaItem[]>([]);
  const [historico, setHistorico] = useState<ContingenciaMovimentacao[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'itens' | 'historico'>('itens');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ContingenciaItem | null>(null);

  // Form States
  const [formCodigo, setFormCodigo] = useState('');
  const [formProduto, setFormProduto] = useState('');
  const [formQuantidade, setFormQuantidade] = useState('');
  const [formMotivo, setFormMotivo] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setItens(getContingenciaItens());
    setHistorico(getContingenciaHistorico());
    if (onDataUpdated) onDataUpdated();
  };

  const handleSelectProductFromCatalog = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = parseInt(e.target.value, 10);
    const matched = PRODUCTS.find(p => p.codigo === code);
    if (matched) {
      setFormCodigo(matched.codigo.toString());
      setFormProduto(matched.descricao);
    }
  };

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormCodigo('');
    setFormProduto('');
    setFormQuantidade('');
    setFormMotivo('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: ContingenciaItem) => {
    setEditingItem(item);
    setFormCodigo(item.codigo.toString());
    setFormProduto(item.produto);
    setFormQuantidade(item.quantidade.toString());
    setFormMotivo('');
    setIsModalOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    const code = parseInt(formCodigo, 10);
    const qty = parseFloat(formQuantidade);

    if (isNaN(code) || code <= 0) {
      alert('Informe um código de produto válido.');
      return;
    }

    if (!formProduto.trim()) {
      alert('Informe a descrição do produto.');
      return;
    }

    if (isNaN(qty) || qty <= 0) {
      alert('Informe uma quantidade maior que zero.');
      return;
    }

    if (!formMotivo.trim()) {
      alert('Por favor, descreva o motivo da alocação/alteração na Área de Contingência.');
      return;
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const userName = user.nome || user.email || 'Usuário Autorizado';

    let updatedItens = [...itens];
    let updatedHist = [...historico];

    if (editingItem) {
      // Edit existing item
      const idx = updatedItens.findIndex(i => i.id === editingItem.id);
      if (idx !== -1) {
        const oldQty = updatedItens[idx].quantidade;
        updatedItens[idx] = {
          ...updatedItens[idx],
          quantidade: qty,
          motivo: formMotivo,
          usuario: userName,
          data: dateStr,
          hora: timeStr
        };

        const movLog: ContingenciaMovimentacao = {
          id: `mov-${Date.now()}`,
          itemId: editingItem.id,
          codigo: code,
          produto: formProduto,
          tipo: 'edicao',
          quantidadeAntiga: oldQty,
          quantidadeNova: qty,
          motivo: formMotivo,
          usuario: userName,
          data: dateStr,
          hora: timeStr
        };
        updatedHist = [movLog, ...updatedHist];
      }
    } else {
      // Insert new item
      const newItemId = `ctg-${Date.now()}`;
      const newItem: ContingenciaItem = {
        id: newItemId,
        codigo: code,
        produto: formProduto,
        quantidade: qty,
        motivo: formMotivo,
        usuario: userName,
        data: dateStr,
        hora: timeStr,
        criadoEm: now.toISOString(),
        unidade: 'cx'
      };

      updatedItens.push(newItem);

      const movLog: ContingenciaMovimentacao = {
        id: `mov-${Date.now()}`,
        itemId: newItemId,
        codigo: code,
        produto: formProduto,
        tipo: 'insercao',
        quantidadeNova: qty,
        motivo: formMotivo,
        usuario: userName,
        data: dateStr,
        hora: timeStr
      };
      updatedHist = [movLog, ...updatedHist];
    }

    saveContingenciaItens(updatedItens);
    saveContingenciaHistorico(updatedHist);
    setIsModalOpen(false);
    loadData();
  };

  const handleRemoveItem = (item: ContingenciaItem) => {
    const motivo = window.prompt(`Informe o motivo para remover o produto "${item.produto}" da Área de Contingência:`);
    if (motivo === null) return; // User cancelled
    if (!motivo.trim()) {
      alert('Motivo da remoção é obrigatório.');
      return;
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const userName = user.nome || user.email || 'Usuário Autorizado';

    const updatedItens = itens.filter(i => i.id !== item.id);

    const movLog: ContingenciaMovimentacao = {
      id: `mov-${Date.now()}`,
      itemId: item.id,
      codigo: item.codigo,
      produto: item.produto,
      tipo: 'remocao',
      quantidadeAntiga: item.quantidade,
      quantidadeNova: 0,
      motivo: motivo.trim(),
      usuario: userName,
      data: dateStr,
      hora: timeStr
    };

    const updatedHist = [movLog, ...historico];

    saveContingenciaItens(updatedItens);
    saveContingenciaHistorico(updatedHist);
    loadData();
  };

  const filteredItens = itens.filter(i => 
    i.produto.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.codigo.toString().includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-900 to-[#032b5e] rounded-2xl p-6 text-white shadow-lg border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20">
            🚨 Módulo 14 - Controle de Estoque
          </span>
          <h2 className="text-2xl font-black tracking-tight mt-2 flex items-center gap-2">
            Gestão da Área de Contingência
          </h2>
          <p className="text-xs text-slate-300 font-medium mt-1 max-w-2xl">
            Ambiente restrito e auditado para alocação temporária de produtos fora do fluxo normal de armazenamento. Cada entrada requer justificativa e usuário responsável.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-xl backdrop-blur-md border border-white/10 text-xs">
            <button
              onClick={() => setActiveTab('itens')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'itens' ? 'bg-amber-400 text-slate-950 shadow-sm' : 'text-white hover:bg-white/10'
              }`}
            >
              📦 Produtos ({itens.length})
            </button>
            <button
              onClick={() => setActiveTab('historico')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'historico' ? 'bg-amber-400 text-slate-950 shadow-sm' : 'text-white hover:bg-white/10'
              }`}
            >
              📜 Histórico ({historico.length})
            </button>
          </div>

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Alocar Produto
          </button>
        </div>
      </div>

      {/* ── RULE 14 IMPLEMENTATION: IF EMPTY, SHOW "Área de Contingência Vazia" ── */}
      {itens.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-3 border border-emerald-100">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-wide">
            Área de Contingência Vazia
          </h3>
          <p className="text-xs text-slate-500 font-medium max-w-md mt-1">
            Nenhum produto encontra-se alocado na Área de Contingência. Esta área permanece vazia por padrão até que ocorra uma intervenção manual por usuário autorizado.
          </p>
          <button
            onClick={handleOpenAddModal}
            className="mt-5 px-4 py-2 bg-[#032b5e] hover:bg-[#1e56f0] text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Alocar Item em Contingência
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {activeTab === 'itens' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                    <Package className="w-4 h-4 text-[#1e56f0]" />
                    Produtos Atualmente Alocados ({itens.length})
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    Visão detalhada de volumes em contingência com responsáveis e justificativas.
                  </p>
                </div>

                <div className="relative max-w-xs">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input 
                    type="text" 
                    placeholder="Filtrar por produto ou código..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#1e56f0]"
                  />
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-4">Código</th>
                      <th className="py-3 px-4">Produto</th>
                      <th className="py-3 px-4 text-right">Quantidade</th>
                      <th className="py-3 px-4">Motivo da Alocação</th>
                      <th className="py-3 px-4">Responsável</th>
                      <th className="py-3 px-4">Data / Hora</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredItens.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-all">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{item.codigo}</td>
                        <td className="py-3 px-4 font-bold text-slate-800">{item.produto}</td>
                        <td className="py-3 px-4 text-right font-mono font-black text-amber-700 text-sm">
                          {item.quantidade.toLocaleString('pt-BR')} <span className="text-[10px] text-slate-400 font-normal">cx</span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 max-w-xs">
                          <span className="bg-amber-50 text-amber-900 px-2 py-1 rounded border border-amber-200 text-[11px] block font-medium">
                            {item.motivo}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800 flex items-center gap-1.5 mt-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {item.usuario}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                          {item.data} - {item.hora}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                              title="Alterar quantidade / motivo"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleRemoveItem(item)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                              title="Remover produto da contingência"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── HISTÓRICO DE MOVIMENTAÇÕES TAB ── */}
      {activeTab === 'historico' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
              <History className="w-4 h-4 text-[#1e56f0]" />
              Auditoria e Histórico de Movimentações
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Registro cronológico de todas as inserções, alterações de quantidade e remoções efetuadas.
            </p>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Data / Hora</th>
                  <th className="py-3 px-4">Ação</th>
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Produto</th>
                  <th className="py-3 px-4 text-right">Qtd Anterior / Nova</th>
                  <th className="py-3 px-4">Motivo Informado</th>
                  <th className="py-3 px-4">Usuário</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {historico.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 font-semibold">
                      Nenhum histórico de movimentação registrado.
                    </td>
                  </tr>
                ) : (
                  historico.map((mov) => (
                    <tr key={mov.id} className="hover:bg-slate-50 transition-all">
                      <td className="py-3 px-4 font-mono text-slate-500">{mov.data} {mov.hora}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                          mov.tipo === 'insercao' ? 'bg-emerald-100 text-emerald-800' :
                          mov.tipo === 'edicao' ? 'bg-blue-100 text-blue-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {mov.tipo === 'insercao' ? 'Inserção' : mov.tipo === 'edicao' ? 'Edição' : 'Remoção'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{mov.codigo}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{mov.produto}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        {mov.quantidadeAntiga !== undefined ? `${mov.quantidadeAntiga} ➔ ` : ''}
                        <span className="text-slate-900 font-black">{mov.quantidadeNova} cx</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs">{mov.motivo}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{mov.usuario}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODAL DE INSERÇÃO / EDIÇÃO ── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-500" />
                {editingItem ? 'Alterar Item em Contingência' : 'Alocar Produto na Área de Contingência'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              {!editingItem && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Selecionar do Catálogo AMBEV
                  </label>
                  <select 
                    onChange={handleSelectProductFromCatalog}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#1e56f0]"
                  >
                    <option value="">-- Escolher produto cadastrado --</option>
                    {PRODUCTS.map(p => (
                      <option key={p.codigo} value={p.codigo}>
                        [{p.codigo}] {p.descricao}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Código *
                  </label>
                  <input 
                    type="number" 
                    required
                    value={formCodigo}
                    onChange={(e) => setFormCodigo(e.target.value)}
                    placeholder="Ex: 347"
                    disabled={!!editingItem}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-[#1e56f0]"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Descrição do Produto *
                  </label>
                  <input 
                    type="text" 
                    required
                    value={formProduto}
                    onChange={(e) => setFormProduto(e.target.value)}
                    placeholder="Ex: SUKITA PET 1L CAIXA C/12"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#1e56f0]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Quantidade (Caixas / Unidades) *
                </label>
                <input 
                  type="number" 
                  step="0.1"
                  required
                  value={formQuantidade}
                  onChange={(e) => setFormQuantidade(e.target.value)}
                  placeholder="Ex: 50"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-[#1e56f0]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Motivo da Alocação *
                </label>
                <textarea 
                  required
                  rows={3}
                  value={formMotivo}
                  onChange={(e) => setFormMotivo(e.target.value)}
                  placeholder="Descreva o motivo (ex: aguardando inspeção de avaria de palete, bloqueio temporário por sinistro de transporte, etc)..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#1e56f0]"
                />
              </div>

              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-[11px] text-amber-900 font-medium">
                 Responsável pelo lançamento: <strong>{user.nome || user.email}</strong>. Esta ação será gravada no histórico auditado do sistema.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#032b5e] hover:bg-[#1e56f0] text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Salvar Registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
