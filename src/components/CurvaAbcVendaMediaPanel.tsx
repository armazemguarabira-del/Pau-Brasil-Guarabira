import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  BarChart2, 
  Upload, 
  History, 
  Search, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Edit2, 
  Check, 
  RefreshCw, 
  Sparkles, 
  Sliders, 
  Layers, 
  MapPin, 
  ArrowUpRight, 
  ArrowDownRight, 
  Package, 
  ShieldCheck, 
  Truck,
  Filter,
  FileText,
  HelpCircle
} from 'lucide-react';
import { VendaMediaItem, ImportVendaMediaLog } from '../types/estoque';
import { 
  getVendaMediaItens, 
  saveVendaMediaItens, 
  getVendaMediaLogs, 
  saveVendaMediaLogs 
} from '../utils/estoqueStorage';
import { 
  CurvaAbcItem, 
  CurvaAbcResumo, 
  AbcParams, 
  getAbcParams, 
  saveAbcParams, 
  calculateCurvaAbc, 
  setAbcOverride,
  syncAbcClassesToStorage
} from '../utils/curvaAbcUtils';
import { PRODUCTS } from '../planosData';
import { Usuario } from '../types';

interface CurvaAbcVendaMediaPanelProps {
  user: Usuario;
  onDataUpdated?: () => void;
}

export default function CurvaAbcVendaMediaPanel({ user, onDataUpdated }: CurvaAbcVendaMediaPanelProps) {
  const [activeTab, setActiveTab] = useState<'curva-abc' | 'alocacao-picking' | 'importar' | 'historico'>('curva-abc');
  
  // Storage & State
  const [vendaMediaItens, setVendaMediaItens] = useState<VendaMediaItem[]>([]);
  const [logs, setLogs] = useState<ImportVendaMediaLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState<'TODAS' | 'A' | 'B' | 'C'>('TODAS');
  const [onlyDeviations, setOnlyDeviations] = useState(false);

  // Drag & Drop
  const [isDragOver, setIsDragOver] = useState(false);
  const [diasUteisMes, setDiasUteisMes] = useState<number>(22);

  // ABC Engine Parameters
  const [abcParams, setAbcParamsState] = useState<AbcParams>(getAbcParams());

  // Inline Editing for Venda Média
  const [editingCode, setEditingCode] = useState<number | null>(null);
  const [editingVal, setEditingVal] = useState<string>('');

  // Toast notification
  const [notification, setNotification] = useState<string | null>(null);

  const [lastStatus, setLastStatus] = useState<{
    totalLinhas: number;
    produtosUnicos: number;
    aceitos: number;
    rejeitados: number;
    diasUteis: number;
    erros: string[];
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const vItens = getVendaMediaItens();
    setVendaMediaItens(vItens);
    setLogs(getVendaMediaLogs());
    syncAbcClassesToStorage();
    if (onDataUpdated) onDataUpdated();
  };

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Calculate ABC Engine Results
  const { items: abcItems, resumo: abcResumo } = useMemo(() => {
    return calculateCurvaAbc(vendaMediaItens, abcParams);
  }, [vendaMediaItens, abcParams]);

  // Handle Params Change
  const handleUpdateAbcParams = (newParams: Partial<AbcParams>) => {
    const updated = { ...abcParams, ...newParams };
    setAbcParamsState(updated);
    saveAbcParams(updated);
    notify('Parâmetros do cálculo Pareto ABC atualizados!');
  };

  // Handle Manual ABC Override
  const handleToggleOverride = (codigo: number, currentClass: 'A' | 'B' | 'C') => {
    const nextClassMap: Record<string, 'A' | 'B' | 'C' | null> = {
      'A': 'B',
      'B': 'C',
      'C': 'A'
    };
    const next = nextClassMap[currentClass] || 'A';
    setAbcOverride(codigo, next);
    loadData();
    notify(`Classificação do SKU ${codigo} alterada manualmente para Classe ${next}!`);
  };

  // File Upload Processing - Col G (Código) and Col AC (Qtd)
  const processVendaMediaFile = (text: string, fileName: string) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) {
      alert('O arquivo enviado está vazio.');
      return;
    }

    const currentCatalogMap = new Map<number, typeof PRODUCTS[0]>();
    PRODUCTS.forEach(p => currentCatalogMap.set(p.codigo, p));

    const currentVmMap = new Map<number, VendaMediaItem>();
    getVendaMediaItens().forEach(item => currentVmMap.set(item.codigo, item));

    const totalVendidoMap = new Map<number, number>();
    const rawLinesCount = lines.length;

    let aceitosCount = 0;
    let rejeitadosCount = 0;
    const errorDetails: string[] = [];

    lines.forEach((line, idx) => {
      const parts = line.split(';').map(p => p.trim());
      let codeRaw = '';
      let qtyRaw = '';

      if (parts.length >= 29) {
        codeRaw = parts[6];  // Coluna G = Código do Produto
        qtyRaw = parts[28]; // Coluna AC = Quantidade Vendida
      } else if (parts.length >= 7) {
        codeRaw = parts[6];
        qtyRaw = parts[parts.length - 1];
      } else {
        codeRaw = parts[0];
        qtyRaw = parts[1] || '0';
      }

      if (idx === 0 && (codeRaw.toLowerCase().includes('produto') || codeRaw.toLowerCase().includes('código') || codeRaw.toLowerCase().includes('unb'))) {
        return;
      }

      const cleanCodeStr = codeRaw.replace(/\D/g, '');
      const codeNum = parseInt(cleanCodeStr, 10);

      if (isNaN(codeNum) || codeNum <= 0) {
        rejeitadosCount++;
        return;
      }

      const catalogItem = currentCatalogMap.get(codeNum);
      const existingVm = currentVmMap.get(codeNum);

      if (!catalogItem && !existingVm) {
        rejeitadosCount++;
        return;
      }

      let cleanQtyStr = qtyRaw.replace(/\s+/g, '').replace(',', '.');
      if (cleanQtyStr.includes(';')) {
        cleanQtyStr = cleanQtyStr.split(';')[0];
      }
      
      let qtyNum = parseFloat(cleanQtyStr);
      if (isNaN(qtyNum)) qtyNum = 0;

      const prevTotal = totalVendidoMap.get(codeNum) || 0;
      totalVendidoMap.set(codeNum, prevTotal + qtyNum);
      aceitosCount++;
    });

    if (totalVendidoMap.size === 0) {
      alert(`Nenhum produto cadastrado foi encontrado no arquivo. Linhas rejeitadas: ${rejeitadosCount}`);
      return;
    }

    const nowISO = new Date().toISOString();
    const updatedVmList: VendaMediaItem[] = [];

    totalVendidoMap.forEach((totalVendido, codeNum) => {
      const catalogItem = currentCatalogMap.get(codeNum);
      const existingItem = currentVmMap.get(codeNum);

      const vendaMediaDiaria = Math.max(0, Math.round((totalVendido / diasUteisMes) * 10) / 10);
      const prodName = catalogItem?.descricao || existingItem?.produto || `Produto ${codeNum}`;
      const familia = existingItem?.familia || 'Bebidas';
      const marca = existingItem?.marca || 'AMBEV';
      const setor = existingItem?.setor || 'Armazém Central';
      const unitPrice = existingItem?.precoUnitario || 50.0;

      updatedVmList.push({
        codigo: codeNum,
        produto: prodName,
        vendaMediaDiaria,
        precoUnitario: unitPrice,
        familia,
        marca,
        setor,
        atualizadoEm: nowISO
      });
    });

    currentVmMap.forEach((vmItem, codeNum) => {
      if (!totalVendidoMap.has(codeNum)) {
        updatedVmList.push(vmItem);
      }
    });

    saveVendaMediaItens(updatedVmList);

    // Save Log
    const now = new Date();
    const dStr = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', { hour12: false });
    const logId = `vm-log-${Date.now()}`;

    const newLog: ImportVendaMediaLog = {
      id: logId,
      dataHora: dStr,
      nomeArquivo: fileName,
      totalLinhas: rawLinesCount,
      aceitos: aceitosCount,
      rejeitados: rejeitadosCount,
      usuario: user.nome || user.email || 'Analista AMBEV',
      erros: errorDetails
    };

    saveVendaMediaLogs([newLog, ...getVendaMediaLogs()]);

    setLastStatus({
      totalLinhas: rawLinesCount,
      produtosUnicos: totalVendidoMap.size,
      aceitos: aceitosCount,
      rejeitados: rejeitadosCount,
      diasUteis: diasUteisMes,
      erros: errorDetails
    });

    loadData();
    notify('Venda média faturada importada e Curva ABC recalculada com sucesso!');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      processVendaMediaFile(text, file.name);
    };
    reader.readAsText(file, 'ISO-8859-1');
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      processVendaMediaFile(text, file.name);
    };
    reader.readAsText(file, 'ISO-8859-1');
  };

  const handleSaveInlineEdit = (code: number) => {
    const val = parseFloat(editingVal.replace(',', '.'));
    if (isNaN(val) || val < 0) {
      alert('Por favor, informe um valor válido.');
      return;
    }

    const updated = vendaMediaItens.map(item => {
      if (item.codigo === code) {
        return { ...item, vendaMediaDiaria: val, atualizadoEm: new Date().toISOString() };
      }
      return item;
    });

    saveVendaMediaItens(updated);
    setEditingCode(null);
    loadData();
    notify(`Venda média do produto ${code} atualizada manualmente.`);
  };

  // Filtered ABC Items
  const filteredAbcItems = useMemo(() => {
    return abcItems.filter(item => {
      const matchSearch = item.produto.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.codigo.toString().includes(searchTerm);
      const matchClass = classFilter === 'TODAS' || item.classeABC === classFilter;
      const matchDev = !onlyDeviations || item.adesaoLayout !== 'Alinhado';
      return matchSearch && matchClass && matchDev;
    });
  }, [abcItems, searchTerm, classFilter, onlyDeviations]);

  // Export ABC Table Report
  const handleExportAbcReport = () => {
    const csvHeader = 'RANK;CODIGO_SKU;DESCRICAO_PRODUTO;FAMILIA;VENDA_MEDIA_DIARIA;VOLUME_3_MESES;PRECO_UNITARIO;FATURAMENTO_3_MESES;PCT_VOLUME;PCT_ACUMULADO;CLASSE_ABC;POSICAO_SUGERIDA_PICKING;ZONA_LAYOUT;STATUS_ALINHAMENTO\n';
    const csvRows = filteredAbcItems.map(i => 
      `${i.rank};"${i.codigo}";"${i.produto}";"${i.familia}";${i.vendaMediaDiaria};${i.venda3MesesTotal};${i.precoUnitario};${i.faturamento3Meses};${i.percentualVolume.toFixed(2)};${i.percentualAcumulado.toFixed(2)};"${i.classeABC}";"${i.posicaoPickingSugerida}";"${i.zonaLayoutSugerida}";"${i.adesaoLayout}"`
    ).join('\n');

    const blob = new Blob(['\uFEFF' + csvHeader + csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Relatorio_Curva_ABC_Pareto_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify('Relatório da Curva ABC exportado em CSV!');
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER BANNER - REQUIREMENT ETAPA 18 */}
      <div className="bg-gradient-to-r from-slate-950 via-[#032b5e] to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-blue-900/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 flex items-center gap-1.5 w-max">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              ETAPA 18 — MOTOR DE CÁLCULO DA CURVA ABC & PARETO (80/20)
            </span>
          </div>
          <h2 className="text-2xl font-black tracking-tight mt-2 flex items-center gap-2">
            Curva ABC e Venda Média Diária
          </h2>
          <p className="text-xs text-slate-200 font-medium mt-1 max-w-4xl">
            Motor inteligente de classificação Pareto: <strong>Classe A (80% Volume / ~20% SKUs)</strong>, <strong>Classe B (15% Volume / ~30% SKUs)</strong>, e <strong>Classe C (5% Volume / ~50% SKUs)</strong>. Calculado automaticamente com base na <strong>Venda Média Diária dos últimos 3 meses faturados</strong> ({abcParams.diasUteis3Meses} dias úteis). O resultado alimenta as sugestões de alocação de Picking e Layout.
          </p>
        </div>

        {/* CONTROLS RIGHT */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="bg-white/10 p-2.5 rounded-xl border border-white/20 text-center">
            <span className="text-[10px] uppercase font-extrabold text-blue-200 block">Critério de Cálculo</span>
            <select
              value={abcParams.criterioCalculo}
              onChange={(e) => handleUpdateAbcParams({ criterioCalculo: e.target.value as 'volume' | 'faturamento' })}
              className="bg-slate-900 text-white font-black text-xs px-2.5 py-1 rounded-lg border border-amber-400 focus:outline-none cursor-pointer mt-1"
            >
              <option value="volume">Volume Vendido (CX / HL)</option>
              <option value="faturamento">Faturamento Total (R$)</option>
            </select>
          </div>

          <button
            onClick={handleExportAbcReport}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-md transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-blue-200" />
            Exportar Curva ABC (.CSV)
          </button>
        </div>
      </div>

      {/* NOTIFICATION TOAST */}
      {notification && (
        <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-5 py-3 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {notification}
        </div>
      )}

      {/* TOP TAB NAVIGATION SWITCHER */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-xs flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveTab('curva-abc')}
          className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'curva-abc'
              ? 'bg-[#032b5e] text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BarChart2 className="w-4 h-4 text-emerald-400" />
          📊 Motor Curva ABC & Pareto (80/20)
        </button>

        <button
          onClick={() => setActiveTab('alocacao-picking')}
          className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'alocacao-picking'
              ? 'bg-[#032b5e] text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <MapPin className="w-4 h-4 text-amber-400" />
          📍 Sugestões de Alocação de Picking & Layout
        </button>

        <button
          onClick={() => setActiveTab('importar')}
          className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'importar'
              ? 'bg-[#032b5e] text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Upload className="w-4 h-4 text-sky-400" />
          📥 Importação & Gestão da Venda Média (3 Meses)
        </button>

        <button
          onClick={() => setActiveTab('historico')}
          className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'historico'
              ? 'bg-[#032b5e] text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <History className="w-4 h-4 text-purple-400" />
          📜 Histórico de Cargas ({logs.length})
        </button>
      </div>

      {/* TAB 1: MOTOR CURVA ABC & PARETO 80/20 */}
      {activeTab === 'curva-abc' && (
        <div className="space-y-6">
          
          {/* KPI BREAKDOWN CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* CLASSE A */}
            <div className="bg-white dark:bg-[#111827] border-2 border-emerald-500/40 p-5 rounded-2xl shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  CLASSE A — ALTO GIRO
                </span>
                <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400">
                  80% Volume
                </span>
              </div>
              <div className="mt-3">
                <span className="text-3xl font-black font-mono text-slate-900 dark:text-white">
                  {abcResumo.pctVolA.toFixed(1)}% <span className="text-xs font-sans text-slate-400 font-bold">do volume</span>
                </span>
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {abcResumo.countA} SKUs <span className="text-slate-400">({abcResumo.pctSkusA.toFixed(1)}% dos produtos)</span>
                </p>
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 font-medium space-y-1">
                  <div className="flex justify-between">
                    <span>Vol. 3 Meses:</span>
                    <strong className="font-mono text-slate-800 dark:text-slate-200">{abcResumo.volA.toLocaleString('pt-BR')} cx</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Faturamento:</span>
                    <strong className="font-mono text-emerald-500">R$ {abcResumo.valA.toLocaleString('pt-BR')}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* CLASSE B */}
            <div className="bg-white dark:bg-[#111827] border-2 border-amber-500/40 p-5 rounded-2xl shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                  CLASSE B — MÉDIO GIRO
                </span>
                <span className="text-xs font-mono font-black text-amber-600 dark:text-amber-400">
                  15% Volume
                </span>
              </div>
              <div className="mt-3">
                <span className="text-3xl font-black font-mono text-slate-900 dark:text-white">
                  {abcResumo.pctVolB.toFixed(1)}% <span className="text-xs font-sans text-slate-400 font-bold">do volume</span>
                </span>
                <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-1">
                  {abcResumo.countB} SKUs <span className="text-slate-400">({abcResumo.pctSkusB.toFixed(1)}% dos produtos)</span>
                </p>
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 font-medium space-y-1">
                  <div className="flex justify-between">
                    <span>Vol. 3 Meses:</span>
                    <strong className="font-mono text-slate-800 dark:text-slate-200">{abcResumo.volB.toLocaleString('pt-BR')} cx</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Faturamento:</span>
                    <strong className="font-mono text-amber-500">R$ {abcResumo.valB.toLocaleString('pt-BR')}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* CLASSE C */}
            <div className="bg-white dark:bg-[#111827] border-2 border-rose-500/40 p-5 rounded-2xl shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-rose-600 dark:text-rose-400 tracking-wider bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
                  CLASSE C — BAIXO GIRO
                </span>
                <span className="text-xs font-mono font-black text-rose-600 dark:text-rose-400">
                  5% Volume
                </span>
              </div>
              <div className="mt-3">
                <span className="text-3xl font-black font-mono text-slate-900 dark:text-white">
                  {abcResumo.pctVolC.toFixed(1)}% <span className="text-xs font-sans text-slate-400 font-bold">do volume</span>
                </span>
                <p className="text-xs font-bold text-rose-600 dark:text-rose-400 mt-1">
                  {abcResumo.countC} SKUs <span className="text-slate-400">({abcResumo.pctSkusC.toFixed(1)}% dos produtos)</span>
                </p>
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 font-medium space-y-1">
                  <div className="flex justify-between">
                    <span>Vol. 3 Meses:</span>
                    <strong className="font-mono text-slate-800 dark:text-slate-200">{abcResumo.volC.toLocaleString('pt-BR')} cx</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Faturamento:</span>
                    <strong className="font-mono text-rose-500">R$ {abcResumo.valC.toLocaleString('pt-BR')}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* ADESÃO DO LAYOUT AO PADRÃO ABC */}
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs relative">
              <span className="text-[10px] font-black uppercase text-blue-500 tracking-wider block">
                Adesão ao Layout ABC (%)
              </span>
              <div className="mt-3">
                <span className="text-3xl font-black font-mono text-blue-500">
                  {abcResumo.percentualAdesaoLayout.toFixed(1)}%
                </span>
                <p className="text-xs font-bold text-slate-500 mt-1">
                  Alinhamento físico do Picking
                </p>
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
                  <span>{abcItems.filter(i => i.adesaoLayout !== 'Alinhado').length} SKUs sugeridos para remanejamento</span>
                </div>
              </div>
            </div>

          </div>

          {/* PARETO 80/20 INTERACTIVE CHART */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-tight flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-emerald-500" />
                  Gráfico de Pareto 80/20 (Volume & Acumulado %)
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Distribuição acumulada de vendas por produto ordenado pelo volume faturado.
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-bold">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-emerald-500 rounded-sm"></span>
                  <span className="text-slate-300">Classe A (Até 80%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-amber-500 rounded-sm"></span>
                  <span className="text-slate-300">Classe B (80% a 95%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-rose-500 rounded-sm"></span>
                  <span className="text-slate-300">Classe C (95% a 100%)</span>
                </div>
              </div>
            </div>

            {/* BARS CHART */}
            <div className="space-y-3 pt-2">
              {abcItems.slice(0, 15).map((item) => {
                const maxVol = abcItems[0]?.venda3MesesTotal || 1;
                const barWidthPct = (item.venda3MesesTotal / maxVol) * 100;
                
                let colorBg = 'bg-emerald-500';
                let textColor = 'text-emerald-400';
                if (item.classeABC === 'B') {
                  colorBg = 'bg-amber-500';
                  textColor = 'text-amber-400';
                } else if (item.classeABC === 'C') {
                  colorBg = 'bg-rose-500';
                  textColor = 'text-rose-400';
                }

                return (
                  <div key={item.codigo} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-300 font-mono">
                        #{item.rank} — <strong className="text-white">{item.produto}</strong> <span className="text-slate-500 font-normal">({item.codigo})</span>
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-slate-300">{item.venda3MesesTotal.toLocaleString('pt-BR')} cx</span>
                        <span className={`font-mono ${textColor} font-black`}>Acum: {item.percentualAcumulado.toFixed(1)}%</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${colorBg} text-slate-950`}>
                          Classe {item.classeABC}
                        </span>
                      </div>
                    </div>

                    <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden flex">
                      <div 
                        className={`h-full ${colorBg} transition-all duration-500 rounded-full`} 
                        style={{ width: `${Math.max(2, barWidthPct)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* TABLE OF CURVA ABC COMPLETE */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-tight">
                  Tabela Detalhada do Classificador ABC ({filteredAbcItems.length} SKUs)
                </h3>
                <p className="text-xs text-slate-400">
                  Clique no selo da Classe ABC para realizar alteração manual (override).
                </p>
              </div>

              {/* FILTERS */}
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <div className="relative w-full md:w-60">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Buscar SKU ou produto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  {(['TODAS', 'A', 'B', 'C'] as const).map((cls) => (
                    <button
                      key={cls}
                      onClick={() => setClassFilter(cls)}
                      className={`px-3 py-1 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${
                        classFilter === cls 
                          ? 'bg-blue-600 text-white shadow-xs' 
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {cls}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* DATA TABLE */}
            <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-black uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3 px-4 text-center">Rank</th>
                    <th className="py-3 px-4">Código / SKU</th>
                    <th className="py-3 px-4">Descrição do Produto</th>
                    <th className="py-3 px-4 text-right">Venda Média (cx/d)</th>
                    <th className="py-3 px-4 text-right">Faturamento 3M</th>
                    <th className="py-3 px-4 text-right">% Volume</th>
                    <th className="py-3 px-4 text-right font-bold text-amber-400">% Acumulado</th>
                    <th className="py-3 px-4 text-center">Classe ABC</th>
                    <th className="py-3 px-4">Posição Sugerida Picking</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                  {filteredAbcItems.map((item) => {
                    let badgeBg = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
                    if (item.classeABC === 'B') badgeBg = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
                    if (item.classeABC === 'C') badgeBg = 'bg-rose-500/10 text-rose-400 border-rose-500/30';

                    return (
                      <tr key={item.codigo} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all">
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-400">#{item.rank}</td>
                        <td className="py-3 px-4 font-mono font-bold text-blue-400">{item.codigo}</td>
                        <td className="py-3 px-4 font-bold text-slate-200">{item.produto}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-white">
                          {item.vendaMediaDiaria.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} cx
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                          R$ {item.faturamento3Meses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-300">
                          {item.percentualVolume.toFixed(2)}%
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-amber-400">
                          {item.percentualAcumulado.toFixed(2)}%
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleToggleOverride(item.codigo, item.classeABC)}
                            className={`px-3 py-1 rounded-full text-xs font-black uppercase border transition-all cursor-pointer shadow-xs hover:scale-105 ${badgeBg}`}
                            title="Clique para trocar manualmente a Classe ABC (Override)"
                          >
                            Classe {item.classeABC}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-xs font-semibold text-slate-300">
                          {item.posicaoPickingSugerida}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>

        </div>
      )}

      {/* TAB 2: SUGESTÕES DE ALOCAÇÃO DE PICKING & LAYOUT */}
      {activeTab === 'alocacao-picking' && (
        <div className="space-y-6">
          
          {/* RULE CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-emerald-950/20 border border-emerald-500/30 p-5 rounded-2xl space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/20 px-2.5 py-0.5 rounded-full">
                REGRAS CLASSE A — ALTO GIRO
              </span>
              <h4 className="text-sm font-black text-white">Doca Frontal & Ruas Principais (Rua A)</h4>
              <p className="text-xs text-slate-300">
                Posicione nos primeiros níveis (solo) mais próximos das docas para otimizar o fluxo dos empilhadores. Capacidade: <strong>4 a 8 paletes por baia</strong>. Prioridade de ressuprimento: <strong>Imediata (Pré-Picking)</strong>.
              </p>
            </div>

            <div className="bg-amber-950/20 border border-amber-500/30 p-5 rounded-2xl space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/20 px-2.5 py-0.5 rounded-full">
                REGRAS CLASSE B — MÉDIO GIRO
              </span>
              <h4 className="text-sm font-black text-white">Ruas Intermediárias (Rua C e D)</h4>
              <p className="text-xs text-slate-300">
                Posicione em baias intermediárias (Nível 1 e 2). Capacidade sugerida: <strong>2 a 4 paletes por baia</strong>. Prioridade de ressuprimento: <strong>Média (Ponto de Reposição)</strong>.
              </p>
            </div>

            <div className="bg-rose-950/20 border border-rose-500/30 p-5 rounded-2xl space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 bg-rose-500/20 px-2.5 py-0.5 rounded-full">
                REGRAS CLASSE C — BAIXO GIRO
              </span>
              <h4 className="text-sm font-black text-white">Ruas de Fundo & Pulmão Aéreo (Rua E/F)</h4>
              <p className="text-xs text-slate-300">
                Posicione nos níveis superiores ou ruas de fundo para preservar espaço nobre do picking. Capacidade sugerida: <strong>1 palete por baia</strong>. Prioridade de ressuprimento: <strong>Sob Demanda</strong>.
              </p>
            </div>
          </div>

          {/* ALLOCATION TABLE */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-tight flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-500" />
                  Sugestões de Alocação de Picking Geradas pelo Motor ABC
                </h3>
                <p className="text-xs text-slate-400">
                  Comparativo de posicionamento atual versus layout ideal sugerido pela inteligência Pareto.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onlyDeviations}
                    onChange={(e) => setOnlyDeviations(e.target.checked)}
                    className="rounded border-slate-700 text-blue-600 focus:ring-0"
                  />
                  Mostrar apenas SKUs com Desvio de Layout
                </label>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-black uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3 px-4">Código / SKU</th>
                    <th className="py-3 px-4">Descrição do Produto</th>
                    <th className="py-3 px-4 text-center">Classe ABC</th>
                    <th className="py-3 px-4 font-bold text-amber-400">Posição Sugerida no Picking</th>
                    <th className="py-3 px-4">Zona do Layout</th>
                    <th className="py-3 px-4 text-center">Capacidade (Paletes)</th>
                    <th className="py-3 px-4 text-center">Prioridade Ressuprimento</th>
                    <th className="py-3 px-4 text-center">Status Alinhamento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                  {filteredAbcItems.map((item) => {
                    let statusBadge = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
                    if (item.adesaoLayout === 'Desvio de Layout') statusBadge = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
                    if (item.adesaoLayout === 'Crítico') statusBadge = 'bg-rose-500/10 text-rose-400 border-rose-500/30';

                    return (
                      <tr key={item.codigo} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all">
                        <td className="py-3 px-4 font-mono font-bold text-blue-400">{item.codigo}</td>
                        <td className="py-3 px-4 font-bold text-slate-200">{item.produto}</td>
                        <td className="py-3 px-4 text-center font-black">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] ${
                            item.classeABC === 'A' ? 'bg-emerald-500/20 text-emerald-300' :
                            item.classeABC === 'B' ? 'bg-amber-500/20 text-amber-300' :
                            'bg-rose-500/20 text-rose-300'
                          }`}>
                            Classe {item.classeABC}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-amber-300">{item.posicaoPickingSugerida}</td>
                        <td className="py-3 px-4 text-xs font-semibold text-slate-300">{item.zonaLayoutSugerida}</td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-white">{item.capacidadePickingPaletes} PALETES</td>
                        <td className="py-3 px-4 text-center font-bold text-slate-300">{item.prioridadeRessuprimento}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${statusBadge}`}>
                            {item.adesaoLayout}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>

        </div>
      )}

      {/* TAB 3: IMPORTAÇÃO E GESTÃO DA VENDA MÉDIA */}
      {activeTab === 'importar' && (
        <div className="space-y-6">
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
              isDragOver ? 'border-teal-500 bg-teal-50/50 scale-[1.005]' : 'border-slate-300 dark:border-slate-800 bg-white dark:bg-[#111827] hover:border-teal-400'
            }`}
          >
            <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-teal-100 shadow-xs">
              <Upload className="w-6 h-6" />
            </div>

            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
              Arraste o arquivo oficial da Operação (CSV / TXT / Excel)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl mx-auto mt-1 font-medium">
              Mapeamento de colunas: <strong>Coluna G = Código do Produto</strong> e <strong>Coluna AC = Quantidade Vendida</strong>. O sistema consolida as vendas dos últimos 3 meses e calcula a Venda Média Diária para {diasUteisMes} dias úteis.
            </p>

            <div className="mt-4 flex items-center justify-center gap-3">
              <label className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-md transition-all flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span>Selecionar Arquivo CSV</span>
                <input type="file" accept=".csv,.txt" onChange={handleFileChange} className="hidden" />
              </label>
            </div>
          </div>

          {/* TABLE EDITABLE VENDA MEDIA */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                  Venda Média Diária Consolidada ({vendaMediaItens.length} SKUs)
                </h3>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar código ou produto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:border-teal-500 text-white"
                />
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-black uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3 px-4">Código</th>
                    <th className="py-3 px-4">Produto</th>
                    <th className="py-3 px-4 text-right">Venda Média Diária (cx/dia)</th>
                    <th className="py-3 px-4 text-right">Estoque Ideal (6 Dias)</th>
                    <th className="py-3 px-4 text-center">Edição</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                  {vendaMediaItens.map((item) => {
                    const isEditing = editingCode === item.codigo;
                    const idealStock = Math.round(item.vendaMediaDiaria * 6);

                    return (
                      <tr key={item.codigo} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all">
                        <td className="py-3 px-4 font-mono font-bold text-blue-400">{item.codigo}</td>
                        <td className="py-3 px-4 font-bold text-slate-200">{item.produto}</td>
                        <td className="py-3 px-4 text-right font-mono font-black text-white text-sm">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editingVal}
                              onChange={(e) => setEditingVal(e.target.value)}
                              className="w-24 p-1 bg-slate-900 border border-teal-500 rounded-lg text-right font-mono text-xs focus:outline-none text-white"
                              autoFocus
                            />
                          ) : (
                            `${item.vendaMediaDiaria.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} cx`
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-teal-400">
                          {idealStock.toLocaleString('pt-BR')} cx
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isEditing ? (
                            <button
                              onClick={() => handleSaveInlineEdit(item.codigo)}
                              className="p-1 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-all cursor-pointer"
                              title="Salvar"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingCode(item.codigo);
                                setEditingVal(item.vendaMediaDiaria.toString());
                              }}
                              className="p-1 text-slate-400 hover:text-teal-400 hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                              title="Editar manualmente"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}

      {/* TAB 4: HISTÓRICO DE AUDITORIA */}
      {activeTab === 'historico' && (
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-2">
              <History className="w-4 h-4 text-purple-400" />
              Histórico de Cargas e Atualizações da Venda Média (Auditoria)
            </h3>
          </div>

          <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-black uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4">Data / Hora</th>
                  <th className="py-3 px-4">Nome do Arquivo</th>
                  <th className="py-3 px-4 text-right">Total Linhas</th>
                  <th className="py-3 px-4 text-right">Aceitos</th>
                  <th className="py-3 px-4 text-right">Rejeitados</th>
                  <th className="py-3 px-4">Usuário</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-semibold">
                      Nenhum histórico de importação registrado.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all">
                      <td className="py-3 px-4 font-mono font-bold text-slate-300">{log.dataHora}</td>
                      <td className="py-3 px-4 font-bold text-white">{log.nomeArquivo}</td>
                      <td className="py-3 px-4 text-right font-mono">{log.totalLinhas}</td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-400 font-bold">{log.aceitos}</td>
                      <td className="py-3 px-4 text-right font-mono text-rose-400 font-bold">{log.rejeitados}</td>
                      <td className="py-3 px-4 text-slate-400">{log.usuario}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
