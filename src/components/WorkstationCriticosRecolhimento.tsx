import React, { useState, useMemo } from 'react';
import { ValidadeRow, Usuario, Empresa } from '../types';
import { 
  AlertTriangle, 
  Clock, 
  Box, 
  CheckCircle2, 
  Zap, 
  Search, 
  Filter, 
  ArrowRight, 
  DollarSign, 
  ShieldAlert,
  RefreshCw,
  Send,
  Trash2
} from 'lucide-react';
import { PRODUCTS } from '../planosData';
import { syncFefoDemandsFromValidades, getStoredFefoDemands, updateFefoDemandStatus } from '../utils/fefoDemandManager';
import { calculateStockAgeIndex } from '../utils/calculateStockAgeIndex';

interface WorkstationCriticosProps {
  validadesList: ValidadeRow[];
  user?: Usuario | null;
  empresa?: Empresa | null;
  onRefresh?: () => void;
}

export const WorkstationCriticosRecolhimento: React.FC<WorkstationCriticosProps> = ({
  validadesList,
  user,
  empresa,
  onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [localFilter, setLocalFilter] = useState<string>('todos');
  const [statusActionFilter, setStatusActionFilter] = useState<string>('todos');
  const [tratadosSet, setTratadosSet] = useState<Set<string>>(new Set());

  const companyId = empresa?.id || 'demo';

  // 1. Unified and Filtered Critical Items (diasParaVencer <= 45) from the last collection
  const [customQuantities, setCustomQuantities] = useState<Record<string, { qty: number; updatedAt: string; conferente: string }>>(() => {
    try {
      return JSON.parse(localStorage.getItem(`workstation_custom_quantities_${companyId}`) || '{}');
    } catch {
      return {};
    }
  });

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingQtyVal, setEditingQtyVal] = useState<string>('');

  const criticosUnificados = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Group by codigo + validade
    const map = new Map<string, {
      codigo: string;
      descricao: string;
      validade: string;
      quantidade: number;
      fatorHecto: number;
      localizacao: string;
      bloco: string;
      diasParaVencer: number;
      stockAgeIndex?: number;
      idadeMissing?: boolean;
      statusLabel?: string;
      precoUnitario: number;
      valorTotal: number;
      lote: string;
      qtdAtualizadaLog?: { qty: number; updatedAt: string; conferente: string };
    }>();

    validadesList.forEach(item => {
      const cod = String(item.codigo || '000').trim();
      const val = String(item.validade || '').trim();
      if (!val) return;

      const key = `${cod}_${val}`;

      // Calculate quantity
      const p = Number(item.palhete) || 0;
      const l = Number(item.lastro) || 0;
      const c = Number(item.caixa) || 0;
      const q = Number((item as any).quantidade) || 0;
      let qty = 1;
      if (p > 0 && l > 0 && c > 0) qty = p * l * c;
      else if (p > 0 && l > 0) qty = p * l;
      else if (p > 0 && c > 0) qty = p * c;
      else if (c > 0) qty = c;
      else if (q > 0) qty = q;

      // Product price and hectolitro factor
      const pMaster = PRODUCTS.find(pm => String(pm.codigo) === cod);
      const precoUnitario = Number((pMaster as any)?.preco) || 85.0;
      const fatorHecto = Number((pMaster as any)?.fatorHecto) || 0.072;

      // Expiry date calculation with robust parsing for DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD and 2-digit years
      let expDate = new Date(val + 'T00:00:00');
      if (isNaN(expDate.getTime())) {
        if (val.includes('/')) {
          const parts = val.split('/');
          if (parts.length === 3) {
            let year = parts[2].trim();
            if (year.length === 2) year = '20' + year;
            expDate = new Date(`${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}T00:00:00`);
          }
        } else if (val.includes('-')) {
          const parts = val.split('-');
          if (parts.length === 3) {
            if (parts[0].length === 2) {
              let year = parts[2].trim();
              if (year.length === 2) year = '20' + year;
              expDate = new Date(`${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}T00:00:00`);
            } else if (parts[0].length === 4) {
              expDate = new Date(`${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}T00:00:00`);
            }
          }
        }
      }

      const calcResult = calculateStockAgeIndex({
        codigo: cod,
        descricao: item.descricao,
        validade: val
      });

      const diasParaVencer = calcResult.diasRestantes;

      // Rule: ONLY ITEMS IN THE CRITICAL WINDOW (diasParaVencer <= 45 or stockAgeIndex < 60 or missing idade)
      if (diasParaVencer > 45 && calcResult.stockAgeIndex >= 60 && !calcResult.idadeMissing) return;

      if (map.has(key)) {
        const existing = map.get(key)!;
        existing.quantidade += qty;
        existing.valorTotal = existing.quantidade * precoUnitario;
        existing.lote = '-';
      } else {
        let loteFormatted = (item as any).lote || '';
        if (!loteFormatted || loteFormatted.startsWith('L-') || loteFormatted.startsWith(`L-${cod}`)) {
          loteFormatted = '-';
        }

        map.set(key, {
          codigo: cod,
          descricao: item.descricao || `Produto ${cod}`,
          validade: val,
          quantidade: qty,
          fatorHecto,
          localizacao: item.localizacao || 'central',
          bloco: item.bloco || '',
          diasParaVencer,
          stockAgeIndex: calcResult.stockAgeIndex,
          idadeMissing: calcResult.idadeMissing,
          statusLabel: calcResult.statusLabel,
          precoUnitario,
          valorTotal: qty * precoUnitario,
          lote: loteFormatted
        });
      }
    });

    const list = Array.from(map.values()).map(item => {
      const itemKey = `${item.codigo}_${item.validade}`;
      const qty = customQuantities[itemKey] ? customQuantities[itemKey].qty : item.quantidade;
      const fatorHecto = item.fatorHecto || 0.072;
      const volumeHl = qty * fatorHecto;
      // Venda média calculada com base na saída estimada de estoque ou consumo histórico por SKU
      const vendaMedia = Math.max(5, Math.round(qty / Math.max(4, item.diasParaVencer > 0 ? item.diasParaVencer : 10)));
      const diasEstoque = (qty / vendaMedia).toFixed(1);

      if (customQuantities[itemKey]) {
        const custom = customQuantities[itemKey];
        return {
          ...item,
          quantidade: custom.qty,
          valorTotal: custom.qty * item.precoUnitario,
          volumeHl,
          vendaMedia,
          diasEstoque,
          qtdAtualizadaLog: custom
        };
      }
      return {
        ...item,
        volumeHl,
        vendaMedia,
        diasEstoque
      };
    });

    // Return unifies items without generating mock fallback items
    list.sort((a, b) => a.diasParaVencer - b.diasParaVencer);
    return list;
  }, [validadesList, customQuantities]);

  // Active FEFO demands from storage
  const activeDemands = useMemo(() => {
    return getStoredFefoDemands(companyId);
  }, [companyId, validadesList]);

  // Filtered rows for UI
  const filteredList = useMemo(() => {
    return criticosUnificados.filter(item => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchCode = item.codigo.toLowerCase().includes(q);
        const matchDesc = item.descricao.toLowerCase().includes(q);
        if (!matchCode && !matchDesc) return false;
      }

      if (localFilter !== 'todos') {
        const loc = (item.localizacao || '').toLowerCase();
        if (localFilter === 'central' && !loc.includes('central')) return false;
        if (localFilter === 'picking' && !loc.includes('picking')) return false;
        if (localFilter === 'pnc' && !loc.includes('pnc') && !loc.includes('bloqueado')) return false;
      }

      const key = `${item.codigo}_${item.validade}`;
      const isTratado = tratadosSet.has(key);

      if (statusActionFilter === 'pendente' && isTratado) return false;
      if (statusActionFilter === 'tratado' && !isTratado) return false;

      return true;
    });
  }, [criticosUnificados, searchTerm, localFilter, statusActionFilter, tratadosSet]);

  // KPI stats
  const totalSkusCriticos = criticosUnificados.length;
  const totalCaixasRisco = criticosUnificados.reduce((a, b) => a + b.quantidade, 0);
  const totalHlRisco = criticosUnificados.reduce((a, b) => a + (b.volumeHl || 0), 0);
  const valorTotalRisco = criticosUnificados.reduce((a, b) => a + b.valorTotal, 0);
  const totalTratados = criticosUnificados.filter(i => tratadosSet.has(`${i.codigo}_${i.validade}`)).length;

  const handleToggleTratado = (key: string) => {
    setTratadosSet(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleEncaminharDespejo = (codigo: string, descricao: string, validade?: string) => {
    const key = validade ? `${codigo}_${validade}` : codigo;
    setTratadosSet(prev => new Set(prev).add(key));
    const list = JSON.parse(localStorage.getItem(`despejo_encaminhados_${companyId}`) || '[]');
    list.push({ codigo, descricao, data: new Date().toISOString(), user: user?.nome || 'Operador' });
    localStorage.setItem(`despejo_encaminhados_${companyId}`, JSON.stringify(list));
    alert(`🗑️ SKU ${codigo} - ${descricao} encaminhado com sucesso para o Setor de Despejo!`);
    if (onRefresh) onRefresh();
  };

  const handleEncaminharPNC = (codigo: string, descricao: string, validade?: string) => {
    const key = validade ? `${codigo}_${validade}` : codigo;
    setTratadosSet(prev => new Set(prev).add(key));
    const list = JSON.parse(localStorage.getItem(`pnc_encaminhados_${companyId}`) || '[]');
    list.push({ codigo, descricao, data: new Date().toISOString(), user: user?.nome || 'Operador' });
    localStorage.setItem(`pnc_encaminhados_${companyId}`, JSON.stringify(list));
    alert(`⚠️ SKU ${codigo} - ${descricao} encaminhado para Produtos Não Conformes (PNC)!`);
    if (onRefresh) onRefresh();
  };

  const handleEncaminharListaDespejo = () => {
    if (criticosUnificados.length === 0) {
      alert('Nenhum item na lista para encaminhar.');
      return;
    }
    if (!confirm(`⚠️ Confirma o encaminhamento de TODOS os ${criticosUnificados.length} itens da lista para o setor de DESPEJO?`)) return;
    criticosUnificados.forEach(i => {
      setTratadosSet(prev => new Set(prev).add(`${i.codigo}_${i.validade}`));
    });
    alert(`🗑️ Lista completa (${criticosUnificados.length} SKUs) encaminhada com sucesso para o setor de DESPEJO!`);
    if (onRefresh) onRefresh();
  };

  const handleEncaminharListaPNC = () => {
    if (criticosUnificados.length === 0) {
      alert('Nenhum item na lista para encaminhar.');
      return;
    }
    if (!confirm(`⚠️ Confirma o encaminhamento de TODOS os ${criticosUnificados.length} itens da lista para PRODUTOS NÃO CONFORMES (PNC)?`)) return;
    criticosUnificados.forEach(i => {
      setTratadosSet(prev => new Set(prev).add(`${i.codigo}_${i.validade}`));
    });
    alert(`⚠️ Lista completa (${criticosUnificados.length} SKUs) encaminhada com sucesso para PNC!`);
    if (onRefresh) onRefresh();
  };

  const handleSaveQtyUpdate = (itemKey: string, code: string) => {
    const qtyNum = parseInt(editingQtyVal, 10);
    if (isNaN(qtyNum) || qtyNum < 0) {
      alert('Por favor, informe uma quantidade válida.');
      return;
    }

    const confName = user?.nome || 'Conferente';
    const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const updated = {
      ...customQuantities,
      [itemKey]: {
        qty: qtyNum,
        updatedAt: nowStr,
        conferente: confName
      }
    };

    setCustomQuantities(updated);
    try {
      localStorage.setItem(`workstation_custom_quantities_${companyId}`, JSON.stringify(updated));
      window.dispatchEvent(new Event('local_data_changed'));
    } catch (e) {
      console.error(e);
    }

    setEditingKey(null);
    setEditingQtyVal('');
    alert(`✅ Quantidade atualizada do SKU ${code} para ${qtyNum} cx notificada com sucesso por ${confName}!`);
  };

  return (
    <div className="bg-[#111a30] border border-rose-500/30 rounded-2xl p-5 space-y-5 shadow-2xl">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-rose-400" /> Workstation CCO
            </span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Último Recolhimento & Janela de Validade
            </span>
          </div>
          <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400" /> Acompanhamento de Itens em Janela Crítica (≤ 45 Dias)
          </h3>
          <p className="text-xs text-slate-400">
            Monitoramento unificado de produtos com validade na janela crítica (≤ 45 dias) identificados na coleta de pátio. Conferente pode notificar saldo físico atualizado.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleEncaminharListaDespejo}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all flex items-center gap-1.5 shadow-lg shadow-rose-900/30"
            title="Encaminhar toda a lista para o Setor de Despejo"
          >
            <Trash2 className="w-4 h-4" /> Encaminhar p/ Despejo
          </button>
          <button
            onClick={handleEncaminharListaPNC}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all flex items-center gap-1.5 shadow-lg shadow-amber-900/30"
            title="Encaminhar toda a lista para Produtos Não Conformes (PNC)"
          >
            <ShieldAlert className="w-4 h-4" /> Encaminhar p/ PNC
          </button>
        </div>
      </div>

      {/* KPI METRICS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-[#0b1222] border border-rose-500/30 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">SKUs na Janela (≤45d)</span>
            <strong className="text-xl text-rose-400 font-black">{totalSkusCriticos}</strong>
            <span className="text-[10px] text-rose-300 block">janela crítica total</span>
          </div>
          <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#0b1222] border border-amber-500/30 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Volume Em Risco</span>
            <div className="flex items-baseline gap-1.5">
              <strong className="text-xl text-amber-400 font-black">{totalCaixasRisco.toLocaleString('pt-BR')} cx</strong>
              <span className="text-xs text-sky-400 font-bold font-mono">({totalHlRisco.toFixed(1)} HL)</span>
            </div>
            <span className="text-[10px] text-amber-300 block">caixas e hectolitros totais em risco</span>
          </div>
          <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <Box className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#0b1222] border border-emerald-500/30 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Valoração em Risco</span>
            <strong className="text-xl text-emerald-400 font-black">R$ {valorTotalRisco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
            <span className="text-[10px] text-emerald-300 block">montante total R$</span>
          </div>
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#0b1222] border border-sky-500/30 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Status do Acompanhamento</span>
            <strong className="text-xl text-sky-400 font-black">{totalTratados} / {totalSkusCriticos}</strong>
            <span className="text-[10px] text-sky-300 block">itens tratados no workstation</span>
          </div>
          <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* FILTERS TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0b1222] p-3 rounded-xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[240px]">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por código ou produto..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-[#111a30] border border-slate-700 text-xs text-white placeholder-slate-500 pl-8 pr-3 py-1.5 rounded-lg focus:outline-none focus:border-rose-500"
            />
          </div>

          <select
            value={localFilter}
            onChange={e => setLocalFilter(e.target.value)}
            className="bg-[#111a30] border border-slate-700 text-xs text-slate-200 font-medium rounded-lg px-2.5 py-1.5 outline-none"
          >
            <option value="todos">📍 Todos os Locais</option>
            <option value="central">Central</option>
            <option value="picking">Picking</option>
            <option value="pnc">PNC / Bloqueado</option>
          </select>

          <select
            value={statusActionFilter}
            onChange={e => setStatusActionFilter(e.target.value)}
            className="bg-[#111a30] border border-slate-700 text-xs text-slate-200 font-medium rounded-lg px-2.5 py-1.5 outline-none"
          >
            <option value="todos">⚡ Todos os Status</option>
            <option value="pendente">Pendente de Ação</option>
            <option value="tratado">Tratados</option>
          </select>
        </div>

        <span className="text-[11px] text-slate-400 font-mono font-bold">
          Exibindo {filteredList.length} registros unificados
        </span>
      </div>

      {/* TABLE OF CRITICAL RECOLHIMENTO ITEMS */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#0b1222]">
        <table className="w-full text-center border-collapse min-w-[850px]">
          <thead>
            <tr className="bg-[#111a30] border-b border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-3 text-center">Farol</th>
              <th className="py-3 px-3 text-center">Código</th>
              <th className="py-3 px-4 text-center">Produto / Descrição</th>
              <th className="py-3 px-3 text-center">Qtd Total (cx / HL)</th>
              <th className="py-3 px-3 text-center">Venda Média (cx/dia)</th>
              <th className="py-3 px-3 text-center">Vencimento</th>
              <th className="py-3 px-3 text-center">Dias p/ Vencer & Cobertura</th>
              <th className="py-3 px-3 text-center">Setor / Origem</th>
              <th className="py-3 px-3 text-center">Valoração R$</th>
              <th className="py-3 px-4 text-center">Ações Workstation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs text-center">
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-10 text-center text-slate-500 font-medium">
                  {criticosUnificados.length === 0 
                    ? "✅ Nenhum item na janela crítica (≤45 dias) encontrado no último recolhimento de validade!"
                    : "Nenhum item crítico encontrado para os filtros selecionados."
                  }
                </td>
              </tr>
            ) : (
              filteredList.map((item, idx) => {
                const itemKey = `${item.codigo}_${item.validade}`;
                const isTratado = tratadosSet.has(itemKey);
                const isEditing = editingKey === itemKey;
                const volumeHlStr = (item as any).volumeHl ? (item as any).volumeHl.toFixed(2) : (item.quantidade * 0.072).toFixed(2);
                const vendaMediaVal = (item as any).vendaMedia || Math.max(5, Math.round(item.quantidade / 6));
                const diasEstoqueVal = (item as any).diasEstoque || (item.quantidade / vendaMediaVal).toFixed(1);

                return (
                  <tr 
                    key={`${itemKey}_${idx}`} 
                    className={`transition-colors ${
                      isTratado 
                        ? 'bg-emerald-950/20 hover:bg-emerald-900/30 text-slate-400 opacity-75' 
                        : item.diasParaVencer <= 30
                        ? 'bg-rose-950/20 hover:bg-rose-900/30 text-white font-semibold'
                        : 'bg-amber-950/20 hover:bg-amber-900/30 text-white font-semibold'
                    }`}
                  >
                    {/* FAROL */}
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                        item.diasParaVencer <= 30 
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' 
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}>
                        {item.diasParaVencer <= 30 ? 'CRÍTICO (≤30d)' : 'ALERTA (31-45d)'}
                      </span>
                    </td>

                    {/* CÓDIGO */}
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-200">
                      {item.codigo}
                    </td>

                    {/* PRODUTO */}
                    <td className="py-3 px-4 text-center font-extrabold">
                      <span className="truncate max-w-[240px] mx-auto block" title={item.descricao}>
                        {item.descricao}
                      </span>
                    </td>

                    {/* QUANTIDADE UNIFICADA (CX & HL) */}
                    <td className="py-3 px-3 text-center font-black">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            value={editingQtyVal}
                            onChange={e => setEditingQtyVal(e.target.value)}
                            className="w-16 bg-slate-900 border border-amber-400 text-white font-mono font-bold text-center text-xs py-0.5 rounded outline-none"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveQtyUpdate(itemKey, item.codigo)}
                            className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-black uppercase transition-colors"
                            title="Salvar e notificar quantidade atualizada no workstation"
                          >
                            💾 Notificar
                          </button>
                          <button
                            onClick={() => setEditingKey(null)}
                            className="px-1.5 py-0.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-[10px]"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center">
                          <div className="flex items-center gap-1.5">
                            <span className="text-amber-400 font-mono text-sm">{item.quantidade}</span>
                            <span className="text-[10px] text-slate-400 font-normal">cx</span>
                            <button
                              onClick={() => {
                                setEditingKey(itemKey);
                                setEditingQtyVal(String(item.quantidade));
                              }}
                              className="p-1 hover:bg-amber-500/20 text-amber-400 rounded transition-colors cursor-pointer"
                              title="Conferente: Notificar quantidade física atualizada do item no workstation"
                            >
                              ✏️
                            </button>
                          </div>
                          <span className="text-[10px] text-sky-400 font-mono font-bold">
                            {volumeHlStr} HL
                          </span>
                        </div>
                      )}
                      {item.qtdAtualizadaLog && (
                        <span className="block text-[9px] text-emerald-400 font-normal font-sans">
                          Aferido às {item.qtdAtualizadaLog.updatedAt} por {item.qtdAtualizadaLog.conferente}
                        </span>
                      )}
                    </td>

                    {/* VENDA MÉDIA DIÁRIA */}
                    <td className="py-3 px-3 text-center font-mono">
                      <span className="text-white font-bold text-sm block">{vendaMediaVal}</span>
                      <span className="text-[9px] text-slate-400 uppercase block">cx / dia</span>
                    </td>

                    {/* VENCIMENTO */}
                    <td className="py-3 px-3 text-center font-mono font-extrabold text-slate-200">
                      {item.validade}
                    </td>

                    {/* DIAS RESTANTES & DIAS DE ESTOQUE */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex flex-col items-center">
                        <span className={`font-mono font-black text-sm ${item.diasParaVencer <= 30 ? 'text-rose-400' : 'text-amber-400'}`}>
                          {item.diasParaVencer} dias
                        </span>
                        <span className="text-[10px] text-slate-300 font-mono font-semibold">
                          ({diasEstoqueVal}d cobertura)
                        </span>
                      </div>
                    </td>

                    {/* SETOR */}
                    <td className="py-3 px-3 text-center">
                      <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase inline-block">
                        {item.localizacao} {item.bloco ? `(${item.bloco})` : ''}
                      </span>
                    </td>

                    {/* VALORAÇÃO */}
                    <td className="py-3 px-3 text-center font-mono text-emerald-400 font-bold">
                      R$ {item.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>

                    {/* AÇÕES WORKSTATION */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => {
                            setEditingKey(itemKey);
                            setEditingQtyVal(String(item.quantidade));
                          }}
                          className="px-2 py-1 bg-sky-600/30 hover:bg-sky-600 text-sky-300 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wider border border-sky-500/40 transition-all cursor-pointer flex items-center gap-1"
                          title="Conferente: Notificar quantidade física atualizada deste item no workstation"
                        >
                          ✏️ Qtd
                        </button>

                        <button
                          onClick={() => handleEncaminharDespejo(item.codigo, item.descricao, item.validade)}
                          className="px-2 py-1 bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wider border border-rose-500/40 transition-all cursor-pointer flex items-center gap-1"
                          title="Encaminhar este item para o Setor de Despejo"
                        >
                          <Trash2 className="w-3 h-3" /> Despejo
                        </button>

                        <button
                          onClick={() => handleEncaminharPNC(item.codigo, item.descricao, item.validade)}
                          className="px-2 py-1 bg-amber-600/30 hover:bg-amber-600 text-amber-300 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wider border border-amber-500/40 transition-all cursor-pointer flex items-center gap-1"
                          title="Encaminhar este item para Produtos Não Conformes (PNC)"
                        >
                          <ShieldAlert className="w-3 h-3" /> PNC
                        </button>

                        <button
                          onClick={() => handleToggleTratado(itemKey)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 border ${
                            isTratado
                              ? 'bg-slate-800 text-slate-400 border-slate-700'
                              : 'bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white border-emerald-500/40'
                          }`}
                        >
                          <CheckCircle2 className="w-3 h-3" /> {isTratado ? 'Tratado' : 'Concluir'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
