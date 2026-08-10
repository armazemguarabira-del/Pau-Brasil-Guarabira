import React, { useState, useMemo } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  Layers, 
  Building2, 
  Truck, 
  AlertTriangle, 
  Package, 
  User, 
  DollarSign, 
  TrendingDown,
  Folder,
  FolderOpen
} from 'lucide-react';
import { QuebraRow } from '../types';
import { getItemHlInfo } from './WqiTab';

interface ArvoreMotivosTreeProps {
  data: QuebraRow[];
  viewUnit: 'rs' | 'hl' | 'sku';
  theme?: 'light' | 'dark';
}

export default function ArvoreMotivosTree({ data, viewUnit, theme = 'light' }: ArvoreMotivosTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    root: true // Root node start open
  });

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const getMetricValue = (row: QuebraRow): number => {
    const qty = row.quantidade || 0;
    if (viewUnit === 'rs') {
      return row.valorTotal || (qty * (row.valorUnitario || 45));
    }
    if (viewUnit === 'hl') {
      return row.hlPerdido || getItemHlInfo({ quantidade: qty, descricao: row.descricao, codProduto: row.codProduto }).totalHl;
    }
    return qty; // 'sku' / caixas
  };

  const formatMetric = (val: number): string => {
    if (viewUnit === 'rs') {
      return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (viewUnit === 'hl') {
      return `${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} HL`;
    }
    return `${val.toLocaleString('pt-BR')} CX`;
  };

  // Build Hierarchy:
  // Total de Quebras -> Setor -> Tipo de Movimentação -> Motivo -> Produto -> Operador
  const treeData = useMemo(() => {
    let totalMetric = 0;
    const sectorMap = new Map<string, {
      setor: string;
      total: number;
      movimentacaoMap: Map<string, {
        movimentacao: string;
        total: number;
        motivoMap: Map<string, {
          motivo: string;
          total: number;
          produtoMap: Map<string, {
            produto: string;
            total: number;
            operadorMap: Map<string, number>;
          }>;
        }>;
      }>;
    }>();

    data.forEach(row => {
      const val = getMetricValue(row);
      totalMetric += val;

      const setor = row.area || 'Sem Setor';
      const movimentacao = row.fatorHl ? 'Interna' : 'Transferência / Rota';
      const motivo = row.motivo || row.codQuebra || 'Outros Motivos';
      const produto = row.descricao || row.codProduto || 'SKU Geral';
      const operador = row.colaboradorQuebrou || row.responsavel || 'Não Identificado';

      if (!sectorMap.has(setor)) {
        sectorMap.set(setor, { setor, total: 0, movimentacaoMap: new Map() });
      }
      const sNode = sectorMap.get(setor)!;
      sNode.total += val;

      if (!sNode.movimentacaoMap.has(movimentacao)) {
        sNode.movimentacaoMap.set(movimentacao, { movimentacao, total: 0, motivoMap: new Map() });
      }
      const mNode = sNode.movimentacaoMap.get(movimentacao)!;
      mNode.total += val;

      if (!mNode.motivoMap.has(motivo)) {
        mNode.motivoMap.set(motivo, { motivo, total: 0, produtoMap: new Map() });
      }
      const motNode = mNode.motivoMap.get(motivo)!;
      motNode.total += val;

      if (!motNode.produtoMap.has(produto)) {
        motNode.produtoMap.set(produto, { produto, total: 0, operadorMap: new Map() });
      }
      const prodNode = motNode.produtoMap.get(produto)!;
      prodNode.total += val;

      const prevOpTotal = prodNode.operadorMap.get(operador) || 0;
      prodNode.operadorMap.set(operador, prevOpTotal + val);
    });

    return { totalMetric, sectorMap };
  }, [data, viewUnit]);

  return (
    <div className={`p-5 rounded-2xl border ${
      theme === 'dark' ? 'bg-[#121c38] border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
    } space-y-4 shadow-xs`}>
      <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-700">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-500" />
            Árvore Interativa de Motivos de Quebra
          </h3>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
            Fluxo de Decomposição: Total → Setor → Tipo Movimentação → Motivo → Produto → Operador
          </p>
        </div>

        <span className="text-xs font-mono font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-3 py-1 rounded-xl border border-emerald-200 dark:border-emerald-800">
          Unidade Ativa: {viewUnit.toUpperCase()}
        </span>
      </div>

      {/* TREE ROOT */}
      <div className="space-y-1 font-sans text-xs">
        <div 
          onClick={() => toggleNode('root')}
          className="flex items-center justify-between p-2.5 bg-slate-900 text-white rounded-xl cursor-pointer font-extrabold shadow-xs hover:bg-slate-800 transition-all"
        >
          <div className="flex items-center gap-2">
            {expandedNodes['root'] ? <ChevronDown className="w-4 h-4 text-emerald-400" /> : <ChevronRight className="w-4 h-4 text-emerald-400" />}
            <FolderOpen className="w-4 h-4 text-emerald-400" />
            <span>TOTAL DE QUEBRAS DA OPERAÇÃO</span>
          </div>
          <span className="font-mono text-emerald-400 text-sm font-black">
            {formatMetric(treeData.totalMetric)}
          </span>
        </div>

        {/* SETORES (LEVEL 1) */}
        {expandedNodes['root'] && (
          <div className="pl-4 space-y-1 mt-1 border-l-2 border-slate-200 dark:border-slate-700 ml-3">
            {Array.from(treeData.sectorMap.values()).map((sNode: any) => {
              const sKey = `setor-${sNode.setor}`;
              const isSOpen = expandedNodes[sKey];

              return (
                <div key={sKey} className="space-y-1">
                  <div 
                    onClick={() => toggleNode(sKey)}
                    className="flex items-center justify-between p-2 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200/80 dark:hover:bg-slate-700 rounded-xl cursor-pointer font-bold transition-all text-slate-900 dark:text-slate-100"
                  >
                    <div className="flex items-center gap-2">
                      {isSOpen ? <ChevronDown className="w-3.5 h-3.5 text-blue-500" /> : <ChevronRight className="w-3.5 h-3.5 text-blue-500" />}
                      <Building2 className="w-3.5 h-3.5 text-blue-500" />
                      <span>Setor: {sNode.setor}</span>
                    </div>
                    <span className="font-mono font-black text-blue-600 dark:text-blue-400">
                      {formatMetric(sNode.total)}
                    </span>
                  </div>

                  {/* MOVIMENTACOES (LEVEL 2) */}
                  {isSOpen && (
                    <div className="pl-4 space-y-1 border-l-2 border-blue-200 dark:border-blue-900 ml-3">
                      {Array.from(sNode.movimentacaoMap.values()).map((mNode: any) => {
                        const mKey = `${sKey}-mov-${mNode.movimentacao}`;
                        const isMOpen = expandedNodes[mKey];

                        return (
                          <div key={mKey} className="space-y-1">
                            <div 
                              onClick={() => toggleNode(mKey)}
                              className="flex items-center justify-between p-1.5 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 rounded-lg cursor-pointer font-bold text-slate-800 dark:text-slate-200"
                            >
                              <div className="flex items-center gap-2">
                                {isMOpen ? <ChevronDown className="w-3.5 h-3.5 text-purple-500" /> : <ChevronRight className="w-3.5 h-3.5 text-purple-500" />}
                                <Truck className="w-3.5 h-3.5 text-purple-500" />
                                <span>Tipo: {mNode.movimentacao}</span>
                              </div>
                              <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                                {formatMetric(mNode.total)}
                              </span>
                            </div>

                            {/* MOTIVOS (LEVEL 3) */}
                            {isMOpen && (
                              <div className="pl-4 space-y-1 border-l-2 border-purple-200 dark:border-purple-900 ml-3">
                                {Array.from(mNode.motivoMap.values()).map((motNode: any) => {
                                  const motKey = `${mKey}-mot-${motNode.motivo}`;
                                  const isMotOpen = expandedNodes[motKey];

                                  return (
                                    <div key={motKey} className="space-y-1">
                                      <div 
                                        onClick={() => toggleNode(motKey)}
                                        className="flex items-center justify-between p-1.5 bg-amber-50/60 dark:bg-amber-950/20 hover:bg-amber-100/60 rounded-lg cursor-pointer font-bold text-amber-900 dark:text-amber-200"
                                      >
                                        <div className="flex items-center gap-2">
                                          {isMotOpen ? <ChevronDown className="w-3.5 h-3.5 text-amber-600" /> : <ChevronRight className="w-3.5 h-3.5 text-amber-600" />}
                                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                          <span>Motivo: {motNode.motivo}</span>
                                        </div>
                                        <span className="font-mono font-black text-amber-700 dark:text-amber-400">
                                          {formatMetric(motNode.total)}
                                        </span>
                                      </div>

                                      {/* PRODUTOS (LEVEL 4) */}
                                      {isMotOpen && (
                                        <div className="pl-4 space-y-1 border-l-2 border-amber-200 dark:border-amber-900 ml-3">
                                          {Array.from(motNode.produtoMap.values()).map((prodNode: any) => {
                                            const prodKey = `${motKey}-prod-${prodNode.produto}`;
                                            const isProdOpen = expandedNodes[prodKey];

                                            return (
                                              <div key={prodKey} className="space-y-1">
                                                <div 
                                                  onClick={() => toggleNode(prodKey)}
                                                  className="flex items-center justify-between p-1.5 bg-slate-50 dark:bg-slate-800/30 hover:bg-slate-100 rounded-lg cursor-pointer font-bold text-slate-700 dark:text-slate-300"
                                                >
                                                  <div className="flex items-center gap-2">
                                                    {isProdOpen ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-500" />}
                                                    <Package className="w-3.5 h-3.5 text-slate-500" />
                                                    <span>Produto: {prodNode.produto}</span>
                                                  </div>
                                                  <span className="font-mono text-slate-800 dark:text-slate-200">
                                                    {formatMetric(prodNode.total)}
                                                  </span>
                                                </div>

                                                {/* OPERADORES (LEVEL 5) */}
                                                {isProdOpen && (
                                                  <div className="pl-4 space-y-1 border-l-2 border-slate-200 dark:border-slate-700 ml-3">
                                                    {Array.from(prodNode.operadorMap.entries()).map(([op, opVal]) => (
                                                      <div key={op} className="flex items-center justify-between p-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                                                        <span className="flex items-center gap-1.5">
                                                          <User className="w-3 h-3 text-teal-500" />
                                                          Operador: {op}
                                                        </span>
                                                        <span className="font-mono font-bold text-teal-700 dark:text-teal-400">
                                                          {formatMetric(opVal)}
                                                        </span>
                                                      </div>
                                                    ))}
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
