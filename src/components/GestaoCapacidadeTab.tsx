import React, { useState, useMemo } from 'react';
import { PRODUCT_MASTER_DATA, findProductMaster, ProductMaster } from '../data/productMasterData';
import { 
  Database, 
  Upload, 
  Package, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown, 
  Sliders, 
  FileText, 
  ArrowRight, 
  Info, 
  Layers, 
  PieChart, 
  Sparkles, 
  Box, 
  Maximize2,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, PieChart as RePieChart, Pie } from 'recharts';

export interface CapacityItem {
  id: string;
  cod: number;
  descricao: string;
  quantidade: number;
  area: 'CENTRAL' | 'PICKING' | 'MARKETPLACE' | 'CONTINGÊNCIA' | 'PULMÃO' | 'PNC';
  areaOriginal: 'CENTRAL' | 'PICKING' | 'MARKETPLACE' | 'PULMÃO' | 'PNC';
  alocadoParaContingencia: boolean;
  fatorHecto: number;
  valorUnidade: number;
  totalHecto: number;
  valorTotal: number;
}

export const AREA_CAPACITIES = {
  CENTRAL: 615,
  PICKING: 160,
  MARKETPLACE: 84,
  CONTINGÊNCIA: 108,
  PULMÃO: 140,
  PNC: 9
};

// Initial sample inventory based on product master dataset for instant visualization
const DEFAULT_INITIAL_ITEMS: CapacityItem[] = [
  { id: '1', cod: 9067, descricao: 'ANTARCTICA PILSEN LATA 350ML SH C/12 NPAL', quantidade: 320, area: 'CENTRAL', areaOriginal: 'CENTRAL', alocadoParaContingencia: false, fatorHecto: 0.04, valorUnidade: 28.95, totalHecto: 12.8, valorTotal: 9264 },
  { id: '2', cod: 9068, descricao: 'SKOL LATA 350ML SH C/12 NPAL', quantidade: 210, area: 'CENTRAL', areaOriginal: 'CENTRAL', alocadoParaContingencia: false, fatorHecto: 0.04, valorUnidade: 28.52, totalHecto: 8.4, valorTotal: 5989.2 },
  { id: '3', cod: 13201, descricao: 'BRAHMA CHOPP GFA VD 300ML CX C/23', quantidade: 75, area: 'CENTRAL', areaOriginal: 'CENTRAL', alocadoParaContingencia: false, fatorHecto: 0.07, valorUnidade: 39.08, totalHecto: 5.25, valorTotal: 2931 },
  { id: '4', cod: 2538, descricao: 'ANTARCTICA PILSEN 600ML', quantidade: 95, area: 'PICKING', areaOriginal: 'PICKING', alocadoParaContingencia: false, fatorHecto: 0.07, valorUnidade: 48.22, totalHecto: 6.65, valorTotal: 4580.9 },
  { id: '5', cod: 9096, descricao: 'PEPSI COLA LATA 350ML SH C/12 NPAL', quantidade: 50, area: 'PICKING', areaOriginal: 'PICKING', alocadoParaContingencia: false, fatorHecto: 0.04, valorUnidade: 20.03, totalHecto: 2.0, valorTotal: 1001.5 },
  { id: '6', cod: 18836, descricao: 'CORONA EXTRA N LONG NECK 330ML CX C/24 NPAL', quantidade: 40, area: 'MARKETPLACE', areaOriginal: 'MARKETPLACE', alocadoParaContingencia: false, fatorHecto: 0.08, valorUnidade: 118.01, totalHecto: 3.2, valorTotal: 4720.4 },
  { id: '7', cod: 35331, descricao: 'BUDWEISER GFA VD 1L', quantidade: 35, area: 'MARKETPLACE', areaOriginal: 'MARKETPLACE', alocadoParaContingencia: false, fatorHecto: 0.12, valorUnidade: 65.61, totalHecto: 4.2, valorTotal: 2296.35 },
];

interface GestaoCapacidadeTabProps {
  theme?: 'light' | 'dark';
}

export default function GestaoCapacidadeTab({ theme = 'light' }: GestaoCapacidadeTabProps) {
  const [items, setItems] = useState<CapacityItem[]>(() => {
    try {
      const saved = localStorage.getItem('af_capacity_items');
      return saved ? JSON.parse(saved) : DEFAULT_INITIAL_ITEMS;
    } catch (e) {
      return DEFAULT_INITIAL_ITEMS;
    }
  });

  const [viewMode, setViewMode] = useState<'quantidade' | 'hectolitro'>('quantidade');
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadTargetArea, setUploadTargetArea] = useState<'AUTO' | 'CENTRAL' | 'PICKING' | 'MARKETPLACE'>('AUTO');
  const [uploadStatusMsg, setUploadStatusMsg] = useState<string | null>(null);

  // Save items state to localStorage
  const saveItemsState = (newItems: CapacityItem[]) => {
    setItems(newItems);
    try {
      localStorage.setItem('af_capacity_items', JSON.stringify(newItems));
    } catch (e) {
      console.error(e);
    }
  };

  // Re-calculate capacity allocation and spillover to CONTINGÊNCIA
  const processedItems = useMemo(() => {
    // Group items by original area and apply 100% capacity threshold rule
    const areas: ('CENTRAL' | 'PICKING' | 'MARKETPLACE')[] = ['CENTRAL', 'PICKING', 'MARKETPLACE'];
    const result: CapacityItem[] = [];

    // Track total capacity used in each primary area
    const capacityTracker = {
      CENTRAL: 0,
      PICKING: 0,
      MARKETPLACE: 0,
      CONTINGÊNCIA: 0
    };

    areas.forEach(a => {
      const areaItems = items.filter(i => i.areaOriginal === a);
      const limit = AREA_CAPACITIES[a];

      areaItems.forEach(item => {
        const itemQty = item.quantidade;
        const currentAreaTotal = capacityTracker[a];

        if (currentAreaTotal + itemQty <= limit) {
          // Fits within 100% capacity
          capacityTracker[a] += itemQty;
          result.push({
            ...item,
            area: a,
            alocadoParaContingencia: false
          });
        } else {
          // Exceeds 100% capacity limit -> spillover to CONTINGÊNCIA!
          const fitInArea = Math.max(0, limit - currentAreaTotal);
          const overflow = itemQty - fitInArea;

          if (fitInArea > 0) {
            capacityTracker[a] += fitInArea;
            result.push({
              ...item,
              quantidade: fitInArea,
              area: a,
              alocadoParaContingencia: false,
              totalHecto: fitInArea * item.fatorHecto,
              valorTotal: fitInArea * item.valorUnidade
            });
          }

          if (overflow > 0) {
            capacityTracker.CONTINGÊNCIA += overflow;
            result.push({
              ...item,
              id: `${item.id}-contingencia`,
              quantidade: overflow,
              area: 'CONTINGÊNCIA',
              alocadoParaContingencia: true,
              totalHecto: overflow * item.fatorHecto,
              valorTotal: overflow * item.valorUnidade
            });
          }
        }
      });
    });

    return result;
  }, [items]);

  // Aggregated Area Metrics
  const areaMetrics = useMemo(() => {
    const calcArea = (areaKey: 'CENTRAL' | 'PICKING' | 'MARKETPLACE' | 'CONTINGÊNCIA') => {
      const areaItems = processedItems.filter(i => i.area === areaKey);
      const totalQuant = areaItems.reduce((acc, i) => acc + i.quantidade, 0);
      const totalHecto = areaItems.reduce((acc, i) => acc + i.totalHecto, 0);
      const totalValor = areaItems.reduce((acc, i) => acc + i.valorTotal, 0);
      const maxCap = AREA_CAPACITIES[areaKey];
      const pctOccupied = Math.min(100, Math.round((totalQuant / maxCap) * 100));
      const isOverflown = totalQuant >= maxCap;

      return {
        key: areaKey,
        totalQuant,
        totalHecto,
        totalValor,
        maxCap,
        pctOccupied,
        isOverflown,
        itemCount: areaItems.length
      };
    };

    return {
      CENTRAL: calcArea('CENTRAL'),
      PICKING: calcArea('PICKING'),
      MARKETPLACE: calcArea('MARKETPLACE'),
      CONTINGÊNCIA: calcArea('CONTINGÊNCIA')
    };
  }, [processedItems]);

  // Filtered dataset for search
  const filteredList = useMemo(() => {
    if (!searchTerm.trim()) return processedItems;
    const term = searchTerm.toLowerCase();
    return processedItems.filter(i => 
      i.descricao.toLowerCase().includes(term) || 
      String(i.cod).includes(term) ||
      i.area.toLowerCase().includes(term)
    );
  }, [processedItems, searchTerm]);

  // Top 10 items com maior e menor quantidade
  const sortedItems = useMemo(() => {
    // Group by SKU
    const map = new Map<number, { cod: number; desc: string; quant: number; hecto: number; area: string }>();
    processedItems.forEach(i => {
      const existing = map.get(i.cod);
      if (existing) {
        existing.quant += i.quantidade;
        existing.hecto += i.totalHecto;
      } else {
        map.set(i.cod, {
          cod: i.cod,
          desc: i.descricao,
          quant: i.quantidade,
          hecto: i.totalHecto,
          area: i.area
        });
      }
    });

    const list = Array.from(map.values());
    const top10High = [...list].sort((a, b) => b.quant - a.quant).slice(0, 10);
    const top10Low = [...list].sort((a, b) => a.quant - b.quant).slice(0, 10);

    return { top10High, top10Low };
  }, [processedItems]);

  // Overall Hectoliter Average per Item
  const hectoStats = useMemo(() => {
    const totalHE = processedItems.reduce((acc, i) => acc + i.totalHecto, 0);
    const totalItemsCount = processedItems.reduce((acc, i) => acc + i.quantidade, 0);
    const avgHEPerItem = totalItemsCount > 0 ? (totalHE / totalItemsCount) : 0;
    return { totalHE, avgHEPerItem };
  }, [processedItems]);

  // Parse CSV File Drag-and-Drop
  const handleCSVImport = (file: File, targetAreaOverride?: 'CENTRAL' | 'PICKING' | 'MARKETPLACE') => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length <= 1) {
        setUploadStatusMsg('⚠️ O arquivo fornecido está vazio ou sem dados válidos.');
        return;
      }

      const newParsedItems: CapacityItem[] = [];
      let importedCount = 0;

      // Detect delimiter
      const firstLine = lines[0];
      const delimiter = firstLine.includes(';') ? ';' : ',';

      // Header row check
      const startIndex = (firstLine.toLowerCase().includes('cod') || firstLine.toLowerCase().includes('desc')) ? 1 : 0;

      for (let i = startIndex; i < lines.length; i++) {
        const parts = lines[i].split(delimiter).map(p => p.trim().replace(/^"|"$/g, ''));
        if (parts.length < 2) continue;

        const cod = parseInt(parts[0], 10);
        const desc = parts[1] || '';
        const quant = parseFloat(parts[2] || parts[3] || '1') || 1;

        // Area detection
        let area: 'CENTRAL' | 'PICKING' | 'MARKETPLACE' = 'CENTRAL';
        if (targetAreaOverride) {
          area = targetAreaOverride;
        } else if (uploadTargetArea !== 'AUTO') {
          area = uploadTargetArea;
        } else {
          const areaCol = (parts[4] || parts[3] || '').toUpperCase();
          if (areaCol.includes('PICK')) area = 'PICKING';
          else if (areaCol.includes('MARKET')) area = 'MARKETPLACE';
          else area = 'CENTRAL';
        }

        // Match against master dataset for exact hecto factor and unit price
        const master = findProductMaster(isNaN(cod) ? desc : cod);
        const fatorHecto = master ? master.fatorHecto : 0.05;
        const valorUnidade = master ? master.valor : 30.0;

        newParsedItems.push({
          id: `imp-${Date.now()}-${i}`,
          cod: master ? master.cod : (isNaN(cod) ? 9999 : cod),
          descricao: master ? master.descricao : (desc || 'PRODUTO IMPORTADO'),
          quantidade: quant,
          area: area,
          areaOriginal: area,
          alocadoParaContingencia: false,
          fatorHecto: fatorHecto,
          valorUnidade: valorUnidade,
          totalHecto: quant * fatorHecto,
          valorTotal: quant * valorUnidade
        });

        importedCount++;
      }

      if (importedCount > 0) {
        saveItemsState([...items, ...newParsedItems]);
        setUploadStatusMsg(`✅ ${importedCount} itens importados com sucesso para a gestão de capacidade!`);
      } else {
        setUploadStatusMsg('⚠️ Nenhum item foi reconhecido. Verifique a estrutura do CSV.');
      }
    };

    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetArea?: 'CENTRAL' | 'PICKING' | 'MARKETPLACE') => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleCSVImport(files[0], targetArea);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>, targetArea?: 'CENTRAL' | 'PICKING' | 'MARKETPLACE') => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleCSVImport(files[0], targetArea);
    }
  };

  const handleResetData = () => {
    saveItemsState(DEFAULT_INITIAL_ITEMS);
    setUploadStatusMsg('🔄 Dados restaurados para a amostragem inicial.');
  };

  return (
    <div className={`space-y-6 font-sans ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
      
      {/* HEADER BAR */}
      <div className={`p-5 rounded-2xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        theme === 'dark' ? 'bg-[#131d38] border-slate-700/80' : 'bg-white border-slate-200'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
              <Database className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight text-[#032b5e] dark:text-slate-100">
                Gestão de Capacidade do Armazém
              </h1>
              <p className="text-[10px] text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                Monitoramento de Ocupação • Alocação de Contingência (100% Overflow) • Hectolitros (HE)
              </p>
            </div>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="flex items-center gap-3">
          {/* Unit Toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-slate-800 p-1 rounded-xl border border-gray-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('quantidade')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                viewMode === 'quantidade'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-800 dark:text-slate-400'
              }`}
            >
              Caixas / Unidades
            </button>
            <button
              onClick={() => setViewMode('hectolitro')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                viewMode === 'hectolitro'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-800 dark:text-slate-400'
              }`}
            >
              Hectolitros (HE)
            </button>
          </div>

          <button
            onClick={handleResetData}
            className="px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800 text-xs font-bold text-gray-600 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer"
            title="Resetar amostra de capacidade"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Amostra</span>
          </button>
        </div>
      </div>

      {/* OVERFLOW WARNING BANNER IF CONTINGÊNCIA IS ACTIVE */}
      {areaMetrics.CONTINGÊNCIA.totalQuant > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-start gap-3 shadow-sm animate-pulse">
          <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
              ⚠️ Alerta de Transbordo Operacional - Área de Contingência Ativada
            </h4>
            <p className="text-[11px] font-medium mt-0.5">
              Uma ou mais áreas de armazenamento atingiram <strong>100% da capacidade máxima</strong>. 
              Um total de <strong>{areaMetrics.CONTINGÊNCIA.totalQuant} caixas / {areaMetrics.CONTINGÊNCIA.totalHecto.toFixed(2)} HE</strong> foram automaticamente alocados para a <strong>Área de Contingência (Capacidade 108)</strong>.
            </p>
          </div>
        </div>
      )}

      {/* CAPACITY CARDS GRID (4 AREAS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CENTRAL */}
        <div className={`p-4.5 rounded-2xl border shadow-sm transition-all ${
          areaMetrics.CENTRAL.isOverflown 
            ? 'bg-rose-500/10 border-rose-500/50 text-rose-950 dark:text-rose-100' 
            : (theme === 'dark' ? 'bg-[#131d38] border-slate-700/80' : 'bg-white border-slate-200')
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Área Central
            </span>
            <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
              areaMetrics.CENTRAL.isOverflown 
                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200' 
                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
            }`}>
              Capacidade: {areaMetrics.CENTRAL.maxCap}
            </span>
          </div>

          <div className="mb-3">
            <span className="text-2xl font-black font-mono tracking-tight block">
              {viewMode === 'quantidade' 
                ? `${areaMetrics.CENTRAL.totalQuant} / ${areaMetrics.CENTRAL.maxCap} caixas`
                : `${areaMetrics.CENTRAL.totalHecto.toFixed(1)} HE`
              }
            </span>
            <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase block mt-0.5">
              Ocupação: {areaMetrics.CENTRAL.pctOccupied}% {areaMetrics.CENTRAL.isOverflown ? '(100% LIMITE ATINGIDO)' : ''}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                areaMetrics.CENTRAL.pctOccupied >= 100 ? 'bg-rose-600' : areaMetrics.CENTRAL.pctOccupied >= 85 ? 'bg-amber-500' : 'bg-blue-600'
              }`}
              style={{ width: `${areaMetrics.CENTRAL.pctOccupied}%` }}
            />
          </div>
        </div>

        {/* PICKING */}
        <div className={`p-4.5 rounded-2xl border shadow-sm transition-all ${
          areaMetrics.PICKING.isOverflown 
            ? 'bg-rose-500/10 border-rose-500/50 text-rose-950 dark:text-rose-100' 
            : (theme === 'dark' ? 'bg-[#131d38] border-slate-700/80' : 'bg-white border-slate-200')
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Área Picking
            </span>
            <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
              areaMetrics.PICKING.isOverflown 
                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200' 
                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
            }`}>
              Capacidade: {areaMetrics.PICKING.maxCap}
            </span>
          </div>

          <div className="mb-3">
            <span className="text-2xl font-black font-mono tracking-tight block">
              {viewMode === 'quantidade' 
                ? `${areaMetrics.PICKING.totalQuant} / ${areaMetrics.PICKING.maxCap} caixas`
                : `${areaMetrics.PICKING.totalHecto.toFixed(1)} HE`
              }
            </span>
            <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase block mt-0.5">
              Ocupação: {areaMetrics.PICKING.pctOccupied}% {areaMetrics.PICKING.isOverflown ? '(100% LIMITE ATINGIDO)' : ''}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                areaMetrics.PICKING.pctOccupied >= 100 ? 'bg-rose-600' : areaMetrics.PICKING.pctOccupied >= 85 ? 'bg-amber-500' : 'bg-blue-600'
              }`}
              style={{ width: `${areaMetrics.PICKING.pctOccupied}%` }}
            />
          </div>
        </div>

        {/* MARKETPLACE */}
        <div className={`p-4.5 rounded-2xl border shadow-sm transition-all ${
          areaMetrics.MARKETPLACE.isOverflown 
            ? 'bg-rose-500/10 border-rose-500/50 text-rose-950 dark:text-rose-100' 
            : (theme === 'dark' ? 'bg-[#131d38] border-slate-700/80' : 'bg-white border-slate-200')
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Área Marketplace
            </span>
            <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
              areaMetrics.MARKETPLACE.isOverflown 
                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200' 
                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
            }`}>
              Capacidade: {areaMetrics.MARKETPLACE.maxCap}
            </span>
          </div>

          <div className="mb-3">
            <span className="text-2xl font-black font-mono tracking-tight block">
              {viewMode === 'quantidade' 
                ? `${areaMetrics.MARKETPLACE.totalQuant} / ${areaMetrics.MARKETPLACE.maxCap} caixas`
                : `${areaMetrics.MARKETPLACE.totalHecto.toFixed(1)} HE`
              }
            </span>
            <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase block mt-0.5">
              Ocupação: {areaMetrics.MARKETPLACE.pctOccupied}% {areaMetrics.MARKETPLACE.isOverflown ? '(100% LIMITE ATINGIDO)' : ''}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                areaMetrics.MARKETPLACE.pctOccupied >= 100 ? 'bg-rose-600' : areaMetrics.MARKETPLACE.pctOccupied >= 85 ? 'bg-amber-500' : 'bg-blue-600'
              }`}
              style={{ width: `${areaMetrics.MARKETPLACE.pctOccupied}%` }}
            />
          </div>
        </div>

        {/* CONTINGÊNCIA */}
        <div className={`p-4.5 rounded-2xl border shadow-sm transition-all bg-amber-500/10 border-amber-500/40 text-amber-950 dark:text-amber-100`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">
              Área de Contingência
            </span>
            <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100">
              Capacidade: {areaMetrics.CONTINGÊNCIA.maxCap}
            </span>
          </div>

          <div className="mb-3">
            <span className="text-2xl font-black font-mono tracking-tight text-amber-900 dark:text-amber-200 block">
              {viewMode === 'quantidade' 
                ? `${areaMetrics.CONTINGÊNCIA.totalQuant} / ${areaMetrics.CONTINGÊNCIA.maxCap} caixas`
                : `${areaMetrics.CONTINGÊNCIA.totalHecto.toFixed(1)} HE`
              }
            </span>
            <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase block mt-0.5">
              Ocupação Transbordada: {areaMetrics.CONTINGÊNCIA.pctOccupied}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-amber-200 dark:bg-amber-950 h-2.5 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full bg-amber-600 transition-all duration-500"
              style={{ width: `${areaMetrics.CONTINGÊNCIA.pctOccupied}%` }}
            />
          </div>
        </div>
      </div>

      {/* CSV DRAG AND DROP IMPORT SECTION */}
      <div className={`p-6 rounded-2xl border shadow-sm ${
        theme === 'dark' ? 'bg-[#131d38] border-slate-700/80' : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 border-b border-gray-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-[#032b5e] dark:text-slate-100 flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-600" />
              Importação Diária de Contagem de Estoque (CSV)
            </h3>
            <p className="text-[10px] text-gray-500 dark:text-slate-400 font-medium">
              Arraste a planilha de contagem diária referente a Central, Picking ou Marketplace para quantificar e alocar a capacidade.
            </p>
          </div>

          {/* Selection of Target Area if Unified CSV */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Destino da Carga:</span>
            <select
              value={uploadTargetArea}
              onChange={e => setUploadTargetArea(e.target.value as any)}
              className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none"
            >
              <option value="AUTO">Automático (Coluna da Planilha)</option>
              <option value="CENTRAL">Área Central (Cap. 615)</option>
              <option value="PICKING">Área Picking (Cap. 160)</option>
              <option value="MARKETPLACE">Área Marketplace (Cap. 84)</option>
            </select>
          </div>
        </div>

        {/* 3 Dedicated Dropzones for Central, Picking, Marketplace */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Central Dropzone */}
          <div 
            onDragOver={e => e.preventDefault()}
            onDrop={e => handleDrop(e, 'CENTRAL')}
            className="p-5 rounded-2xl border-2 border-dashed border-blue-300 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/20 text-center hover:border-blue-500 transition-colors cursor-pointer group"
          >
            <Box className="w-6 h-6 text-blue-600 dark:text-blue-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-black uppercase tracking-wider block text-slate-800 dark:text-slate-200">
              Contagem CENTRAL
            </span>
            <span className="text-[10px] text-gray-500 dark:text-slate-400 block mb-3">
              Arraste o CSV de estoque Central aqui
            </span>
            <label className="inline-block px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer shadow-xs">
              <span>Selecionar CSV</span>
              <input type="file" accept=".csv,.txt,.xlsx" onChange={e => handleFileInputChange(e, 'CENTRAL')} className="hidden" />
            </label>
          </div>

          {/* Picking Dropzone */}
          <div 
            onDragOver={e => e.preventDefault()}
            onDrop={e => handleDrop(e, 'PICKING')}
            className="p-5 rounded-2xl border-2 border-dashed border-purple-300 dark:border-purple-800 bg-purple-50/40 dark:bg-purple-950/20 text-center hover:border-purple-500 transition-colors cursor-pointer group"
          >
            <Layers className="w-6 h-6 text-purple-600 dark:text-purple-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-black uppercase tracking-wider block text-slate-800 dark:text-slate-200">
              Contagem PICKING
            </span>
            <span className="text-[10px] text-gray-500 dark:text-slate-400 block mb-3">
              Arraste o CSV de estoque Picking aqui
            </span>
            <label className="inline-block px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer shadow-xs">
              <span>Selecionar CSV</span>
              <input type="file" accept=".csv,.txt,.xlsx" onChange={e => handleFileInputChange(e, 'PICKING')} className="hidden" />
            </label>
          </div>

          {/* Marketplace Dropzone */}
          <div 
            onDragOver={e => e.preventDefault()}
            onDrop={e => handleDrop(e, 'MARKETPLACE')}
            className="p-5 rounded-2xl border-2 border-dashed border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 text-center hover:border-emerald-500 transition-colors cursor-pointer group"
          >
            <Package className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-black uppercase tracking-wider block text-slate-800 dark:text-slate-200">
              Contagem MARKETPLACE
            </span>
            <span className="text-[10px] text-gray-500 dark:text-slate-400 block mb-3">
              Arraste o CSV de estoque Marketplace aqui
            </span>
            <label className="inline-block px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer shadow-xs">
              <span>Selecionar CSV</span>
              <input type="file" accept=".csv,.txt,.xlsx" onChange={e => handleFileInputChange(e, 'MARKETPLACE')} className="hidden" />
            </label>
          </div>
        </div>

        {uploadStatusMsg && (
          <div className="mt-4 p-3 rounded-xl bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-slate-700 text-xs font-bold text-blue-900 dark:text-blue-200">
            {uploadStatusMsg}
          </div>
        )}
      </div>

      {/* TOP 10 HIGHEST & LOWEST QUANTITY RANKINGS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* TOP 10 MAIOR QUANTIDADE */}
        <div className={`p-5 rounded-2xl border shadow-sm ${
          theme === 'dark' ? 'bg-[#131d38] border-slate-700/80' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100 dark:border-slate-800">
            <h3 className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Top 10 Itens com Maior Quantidade
            </h3>
            <span className="text-[10px] text-gray-400 font-bold uppercase">Volume Crítico</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[9px] font-black uppercase text-gray-400 border-b border-gray-200 dark:border-slate-700">
                  <th className="pb-2">#</th>
                  <th className="pb-2">Cód</th>
                  <th className="pb-2">Produto</th>
                  <th className="pb-2 text-right">Qtd (Caixas)</th>
                  <th className="pb-2 text-right">Hectolitros (HE)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800 font-medium">
                {sortedItems.top10High.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                    <td className="py-2 font-black text-gray-400">#{idx + 1}</td>
                    <td className="py-2 font-mono font-bold text-blue-600 dark:text-blue-400">{item.cod}</td>
                    <td className="py-2 font-bold uppercase truncate max-w-[180px]" title={item.desc}>{item.desc}</td>
                    <td className="py-2 text-right font-black text-emerald-600 dark:text-emerald-400">{item.quant.toLocaleString('pt-BR')} cx</td>
                    <td className="py-2 text-right font-mono font-bold">{item.hecto.toFixed(2)} HE</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* TOP 10 MENOR QUANTIDADE */}
        <div className={`p-5 rounded-2xl border shadow-sm ${
          theme === 'dark' ? 'bg-[#131d38] border-slate-700/80' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100 dark:border-slate-800">
            <h3 className="text-xs font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              Top 10 Itens com Menor Quantidade
            </h3>
            <span className="text-[10px] text-gray-400 font-bold uppercase">Risco de Falta</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[9px] font-black uppercase text-gray-400 border-b border-gray-200 dark:border-slate-700">
                  <th className="pb-2">#</th>
                  <th className="pb-2">Cód</th>
                  <th className="pb-2">Produto</th>
                  <th className="pb-2 text-right">Qtd (Caixas)</th>
                  <th className="pb-2 text-right">Hectolitros (HE)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800 font-medium">
                {sortedItems.top10Low.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                    <td className="py-2 font-black text-gray-400">#{idx + 1}</td>
                    <td className="py-2 font-mono font-bold text-blue-600 dark:text-blue-400">{item.cod}</td>
                    <td className="py-2 font-bold uppercase truncate max-w-[180px]" title={item.desc}>{item.desc}</td>
                    <td className="py-2 text-right font-black text-rose-600 dark:text-rose-400">{item.quant.toLocaleString('pt-BR')} cx</td>
                    <td className="py-2 text-right font-mono font-bold">{item.hecto.toFixed(2)} HE</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SMART INTELIGENCE SOLUTION & HECTOLITER SUMMARY */}
      <div className={`p-6 rounded-2xl border shadow-sm ${
        theme === 'dark' ? 'bg-[#131d38] border-slate-700/80' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100 dark:border-slate-800">
          <Sparkles className="w-5 h-5 text-amber-500" />
          <h3 className="text-sm font-black uppercase tracking-wider text-[#032b5e] dark:text-slate-100">
            Soluções Inteligentes de Otimização de Capacidade (IA do Armazém)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Rebalanceamento */}
          <div className="p-4 rounded-xl bg-blue-50/80 dark:bg-slate-800 border border-blue-200 dark:border-slate-700">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-400 block mb-1">
              💡 Recomendação de Remanejamento
            </span>
            <p className="text-xs text-gray-700 dark:text-slate-300 font-medium leading-relaxed">
              {areaMetrics.CONTINGÊNCIA.totalQuant > 0
                ? `Transbordo detectado: Mova os itens em excesso da Área Central para a Contingência mantendo o Picking liberado para separação rápida.`
                : `Distribuição otimizada: Nenhuma área superou 100%. Mantenha o fluxo de entrada direcionado à Central.`
              }
            </p>
          </div>

          {/* Card 2: Hectolitro Médio */}
          <div className="p-4 rounded-xl bg-purple-50/80 dark:bg-slate-800 border border-purple-200 dark:border-slate-700">
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-400 block mb-1">
              📊 Média de Densidade em Hectolitros (HE)
            </span>
            <div className="text-lg font-black font-mono text-purple-900 dark:text-purple-200">
              {hectoStats.totalHE.toFixed(2)} HE Total
            </div>
            <p className="text-[11px] text-gray-600 dark:text-slate-400 font-medium mt-0.5">
              Média por item estocado: <strong>{hectoStats.avgHEPerItem.toFixed(3)} HE/caixa</strong>.
            </p>
          </div>

          {/* Card 3: Projeção de Ocupação */}
          <div className="p-4 rounded-xl bg-emerald-50/80 dark:bg-slate-800 border border-emerald-200 dark:border-slate-700">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block mb-1">
              🚀 Capacidade Residual Total
            </span>
            <div className="text-lg font-black font-mono text-emerald-900 dark:text-emerald-200">
              {(615 + 160 + 84 + 108) - (areaMetrics.CENTRAL.totalQuant + areaMetrics.PICKING.totalQuant + areaMetrics.MARKETPLACE.totalQuant + areaMetrics.CONTINGÊNCIA.totalQuant)} vagas disponíveis
            </div>
            <p className="text-[11px] text-gray-600 dark:text-slate-400 font-medium mt-0.5">
              Soma total das 4 áreas: 967 vagas físicas.
            </p>
          </div>
        </div>
      </div>

      {/* DETAILED INVENTORY SEARCH TABLE */}
      <div className={`p-5 rounded-2xl border shadow-sm ${
        theme === 'dark' ? 'bg-[#131d38] border-slate-700/80' : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#032b5e] dark:text-slate-100">
            Detalhamento Completo de Itens Estocados ({filteredList.length})
          </h3>

          <input
            type="text"
            placeholder="Buscar por código SKU, descrição ou área..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none w-full sm:w-64"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[9px] font-black uppercase text-gray-400 border-b border-gray-200 dark:border-slate-700">
                <th className="p-2.5">Cód SKU</th>
                <th className="p-2.5">Descrição do Produto</th>
                <th className="p-2.5">Área de Armazenamento</th>
                <th className="p-2.5 text-right">Qtd (Caixas)</th>
                <th className="p-2.5 text-right">Volume (HE)</th>
                <th className="p-2.5 text-right">Valor Total (R$)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {filteredList.map((item, idx) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/60 font-medium">
                  <td className="p-2.5 font-mono font-bold text-blue-600 dark:text-blue-400">{item.cod}</td>
                  <td className="p-2.5 uppercase font-bold text-slate-800 dark:text-slate-200">{item.descricao}</td>
                  <td className="p-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                      item.area === 'CONTINGÊNCIA' 
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200' 
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200'
                    }`}>
                      {item.area} {item.alocadoParaContingencia ? '(Transbordado)' : ''}
                    </span>
                  </td>
                  <td className="p-2.5 text-right font-black text-slate-900 dark:text-slate-100">{item.quantidade} cx</td>
                  <td className="p-2.5 text-right font-mono font-bold">{item.totalHecto.toFixed(2)} HE</td>
                  <td className="p-2.5 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    {item.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
