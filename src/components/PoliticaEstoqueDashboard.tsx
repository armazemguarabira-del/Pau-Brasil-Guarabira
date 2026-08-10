import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart2, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  AlertCircle, 
  ShieldAlert, 
  Package, 
  Layers, 
  Filter, 
  Search, 
  Sparkles, 
  ArrowUpRight, 
  ArrowDownRight, 
  RefreshCw, 
  Truck, 
  ShoppingCart, 
  Download,
  Info,
  Calendar,
  Grid,
  Trash2,
  Upload,
  FileSpreadsheet
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell, 
  Legend, 
  AreaChart, 
  Area, 
  LineChart, 
  Line 
} from 'recharts';
import { PoliticaEstoqueCalculada, AreaContagem, ImportEstoqueDisponivelLog, ImportVendaMediaLog } from '../types/estoque';
import { getMediaItem } from '../utils/idbStorage';
import { 
  calcularPoliticaEstoque, 
  getEstoqueDisponivel0205Logs, 
  saveEstoqueDisponivel0205Itens, 
  saveEstoqueDisponivel0205Logs,
  getVendaMediaLogs,
  saveVendaMediaItens,
  saveVendaMediaLogs
} from '../utils/estoqueStorage';
import { 
  processEstoqueDisponivel0205File, 
  processVendaMediaFile, 
  categorizeFamilia 
} from '../utils/estoqueParsers';
import { getProductMeta } from '../utils/productCatalogData';
import { PRODUCTS } from '../planosData';
import { Usuario } from '../types';

interface PoliticaEstoqueDashboardProps {
  user: Usuario;
  onNavigateToImport?: (tab: string) => void;
}

export default function PoliticaEstoqueDashboard({ user, onNavigateToImport }: PoliticaEstoqueDashboardProps) {
  const [data, setData] = useState<PoliticaEstoqueCalculada[]>([]);
  
  // Import state
  const [log0205, setLog0205] = useState<ImportEstoqueDisponivelLog | null>(null);
  const [log0305, setLog0305] = useState<ImportVendaMediaLog | null>(null);
  const [diasUteis0305, setDiasUteis0305] = useState<number>(22);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filters
  const [selectedVisao, setSelectedVisao] = useState<'ALL' | 'AMBEV' | 'MARKETPLACE'>('ALL');
  const [selectedGrupos, setSelectedGrupos] = useState<string[]>(['CERVEJA', 'NAB', 'MATCH', 'MARKETPLACE']);
  const [selectedCurva, setSelectedCurva] = useState<'ALL' | 'A' | 'B' | 'C'>('ALL');
  const [selectedArea, setSelectedArea] = useState<AreaContagem>('todas');
  const [selectedFamilia, setSelectedFamilia] = useState<string>('todas');
  const [selectedMarca, setSelectedMarca] = useState<string>('todas');
  const [selectedSetor, setSelectedSetor] = useState<string>('todos');
  const [selectedPeriodo, setSelectedPeriodo] = useState<string>('mes_vigente');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Selected Tab for Recommendations / Detail view
  const [activeBucketTab, setActiveBucketTab] = useState<'todos' | 'imediata' | 'excesso' | 'atencao' | 'acima6'>('todos');

  useEffect(() => {
    const restoreAndLoad = async () => {
      try {
        const raw0205 = localStorage.getItem('af_estoque_disponivel_0205');
        if (!raw0205) {
          const idbVal0205 = await getMediaItem('af_estoque_disponivel_0205');
          if (idbVal0205) {
            localStorage.setItem('af_estoque_disponivel_0205', idbVal0205);
          }
        }
        const rawVM = localStorage.getItem('af_estoque_venda_media');
        if (!rawVM) {
          const idbValVM = await getMediaItem('af_estoque_venda_media');
          if (idbValVM) {
            localStorage.setItem('af_estoque_venda_media', idbValVM);
          }
        }
      } catch (_) {}
      loadData();
    };
    restoreAndLoad();
  }, []);

  const loadData = () => {
    const calculated = calcularPoliticaEstoque();
    setData(calculated);

    const logs0205 = getEstoqueDisponivel0205Logs();
    if (logs0205.length > 0) setLog0205(logs0205[0]);
    else setLog0205(null);

    const logs0305 = getVendaMediaLogs();
    if (logs0305.length > 0) setLog0305(logs0305[0]);
    else setLog0305(null);
  };

  // Handlers for 02.05.02 Import
  const handleFileChange0205 = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const res = processEstoqueDisponivel0205File(text, file.name, user.nome || 'Usuário');
      if (res.success) {
        setFeedbackMsg({ type: 'success', text: res.message || 'Arquivo 02.05.02 importado com sucesso!' });
        loadData();
      } else {
        setFeedbackMsg({ type: 'error', text: res.message || 'Erro ao processar o arquivo 02.05.02.' });
      }
    };
    reader.readAsText(file, 'ISO-8859-1');
    e.target.value = '';
  };

  const handleClear0205 = () => {
    if (window.confirm('Tem certeza que deseja excluir a base atual do 02.05.02 (Posição de Estoque)?')) {
      saveEstoqueDisponivel0205Itens([]);
      saveEstoqueDisponivel0205Logs([]);
      setLog0205(null);
      loadData();
      setFeedbackMsg({ type: 'success', text: 'Base 02.05.02 excluída com sucesso. O sistema retornou às contagens manuais.' });
    }
  };

  // Handlers for 03.05.19 Import
  const handleFileChange0305 = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const res = processVendaMediaFile(text, file.name, diasUteis0305, user.nome || 'Usuário');
      if (res.success) {
        setFeedbackMsg({ type: 'success', text: res.message || 'Arquivo 03.05.19 importado com sucesso!' });
        loadData();
      } else {
        setFeedbackMsg({ type: 'error', text: res.message || 'Erro ao processar o arquivo 03.05.19.' });
      }
    };
    reader.readAsText(file, 'ISO-8859-1');
    e.target.value = '';
  };

  const handleClear0305 = () => {
    if (window.confirm('Tem certeza que deseja excluir a base atual do 03.05.19 (Venda do Mês)?')) {
      saveVendaMediaItens([]);
      saveVendaMediaLogs([]);
      setLog0305(null);
      loadData();
      setFeedbackMsg({ type: 'success', text: 'Base 03.05.19 excluída com sucesso.' });
    }
  };

  // Filter options
  const familias = useMemo(() => Array.from(new Set(data.map(d => d.familia))), [data]);
  const marcas = useMemo(() => Array.from(new Set(data.map(d => d.marca))), [data]);
  const setores = useMemo(() => Array.from(new Set(data.map(d => d.setor))), [data]);

  // Group toggle helper
  const toggleGrupo = (grupo: string) => {
    if (selectedGrupos.includes(grupo)) {
      if (selectedGrupos.length === 1) {
        setSelectedGrupos(['CERVEJA', 'NAB', 'MATCH', 'MARKETPLACE']);
      } else {
        setSelectedGrupos(selectedGrupos.filter(g => g !== grupo));
      }
    } else {
      setSelectedGrupos([...selectedGrupos, grupo]);
    }
  };

  // Filtered dataset
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const meta = getProductMeta(item.codigo);
      const itemGrupo = meta.grupo;
      const itemCurva = meta.curva;

      const matchesVisao = selectedVisao === 'ALL' || 
        (selectedVisao === 'AMBEV' && (itemGrupo === 'CERVEJA' || itemGrupo === 'NAB' || itemGrupo === 'MATCH')) ||
        (selectedVisao === 'MARKETPLACE' && itemGrupo === 'MARKETPLACE');

      const matchesGrupo = selectedGrupos.length === 0 || selectedGrupos.includes(itemGrupo);
      const matchesCurva = selectedCurva === 'ALL' || itemCurva === selectedCurva;

      const matchesFamilia = selectedFamilia === 'todas' || item.familia === selectedFamilia;
      const matchesMarca = selectedMarca === 'todas' || item.marca === selectedMarca;
      const matchesSetor = selectedSetor === 'todos' || item.setor === selectedSetor;
      const matchesSearch = searchTerm.trim() === '' || 
        item.produto.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.codigo.toString().includes(searchTerm);

      let matchesArea = true;
      if (selectedArea === 'central') matchesArea = item.estoqueCentral > 0;
      else if (selectedArea === 'picking') matchesArea = item.estoquePicking > 0;
      else if (selectedArea === 'marketplace') matchesArea = item.estoqueMarketplace > 0;

      return matchesVisao && matchesGrupo && matchesCurva && matchesFamilia && matchesMarca && matchesSetor && matchesSearch && matchesArea;
    });
  }, [data, selectedVisao, selectedGrupos, selectedCurva, selectedFamilia, selectedMarca, selectedSetor, selectedArea, searchTerm]);

  // ── KEY INDICATORS ──
  const kpis = useMemo(() => {
    const totalItens = filteredData.length;
    const itensAcimaPolitica = filteredData.filter(d => d.estoqueAtualTotal > d.estoqueIdeal);
    const itensAbaixoPolitica = filteredData.filter(d => d.estoqueAtualTotal < d.estoqueIdeal);
    
    const valorExcessoTotal = filteredData.reduce((acc, curr) => acc + curr.excessoValor, 0);
    const valorFaltaTotal = filteredData.reduce((acc, curr) => acc + curr.faltaValor, 0);

    // Valoração Estoque Total (R$) considerando valor do SKU fechado (Coluna D) + unidades avulsas
    const valorEstoqueTotalComAvulso = filteredData.reduce((acc, curr) => {
      const meta = getProductMeta(curr.codigo);
      const catalog = PRODUCTS.find(p => Number(p.codigo) === Number(curr.codigo));
      const price = meta.preco;
      const fator = meta.fator ?? catalog?.fator ?? 12;
      const qtdFechado = curr.qtdSkuFechado ?? curr.estoqueAtualTotal;
      const qtdAvulsa = curr.qtdUnidadeAvulsa ?? 0;
      return acc + (qtdFechado * price) + (qtdAvulsa * (price / (fator || 12)));
    }, 0);

    const qtdSkuFechadoTotal = filteredData.reduce((acc, curr) => acc + (curr.qtdSkuFechado ?? curr.estoqueAtualTotal), 0);
    const qtdUnidadeAvulsaTotal = filteredData.reduce((acc, curr) => acc + (curr.qtdUnidadeAvulsa ?? 0), 0);

    const estoqueAtualTotal = filteredData.reduce((acc, curr) => acc + curr.estoqueAtualTotal, 0);
    const estoqueIdealTotal = filteredData.reduce((acc, curr) => acc + curr.estoqueIdeal, 0);
    const vendaMediaTotal = filteredData.reduce((acc, curr) => acc + curr.vendaMediaDiaria, 0);

    // Total Volume em Hectolitros (HL) considerando Fator Hectolitro do SKU (Coluna E)
    const totalHecto = filteredData.reduce((acc, curr) => {
      const meta = getProductMeta(curr.codigo);
      const catalog = PRODUCTS.find(p => Number(p.codigo) === Number(curr.codigo));
      const fatorHecto = meta.fatorHecto ?? catalog?.fatorHecto ?? 0.05;
      const fator = meta.fator ?? catalog?.fator ?? 12;
      const qtdFechado = curr.qtdSkuFechado ?? curr.estoqueAtualTotal;
      const qtdAvulsa = curr.qtdUnidadeAvulsa ?? 0;
      return acc + ((qtdFechado + (qtdAvulsa / (fator || 12))) * fatorHecto);
    }, 0);

    const coberturaMedia = vendaMediaTotal > 0 ? (estoqueAtualTotal / vendaMediaTotal) : 0;

    // Adherence rate: items where status is adequate or overstock within reasonable limit
    const aderentes = filteredData.filter(d => d.coberturaDias >= 5.5 && d.coberturaDias <= 8.5).length;
    const percentAderencia = totalItens > 0 ? Math.round((aderentes / totalItens) * 100) : 0;

    return {
      totalItens,
      countAcima: itensAcimaPolitica.length,
      countAbaixo: itensAbaixoPolitica.length,
      valorExcessoTotal,
      valorFaltaTotal,
      valorEstoqueTotalComAvulso,
      qtdSkuFechadoTotal,
      qtdUnidadeAvulsaTotal,
      estoqueAtualTotal,
      estoqueIdealTotal,
      totalHecto,
      coberturaMedia: parseFloat(coberturaMedia.toFixed(1)),
      percentAderencia
    };
  }, [filteredData]);

  // ── CHARTS DATA PREPARATION (REQUIREMENT 18) ──

  // 1. Distribution by Coverage Status (Pie Chart)
  const pieDistributionData = useMemo(() => {
    const statusCounts = {
      Adequado: filteredData.filter(d => d.criticidade === '🟢 Adequado').length,
      Atenção: filteredData.filter(d => d.criticidade === '🟡 Atenção').length,
      Crítico: filteredData.filter(d => d.criticidade === '🟠 Crítico').length,
      Ruptura: filteredData.filter(d => d.criticidade === '🔴 Ruptura').length,
    };

    return [
      { name: '🟢 Adequado (5.5 - 7d)', value: statusCounts.Adequado, color: '#10b981' },
      { name: '🟡 Atenção (3 - 5.4d)', value: statusCounts.Atenção, color: '#f59e0b' },
      { name: '🟠 Crítico (< 3d)', value: statusCounts.Crítico, color: '#f97316' },
      { name: '🔴 Ruptura (0d)', value: statusCounts.Ruptura, color: '#ef4444' },
    ];
  }, [filteredData]);

  // 2. Top 10 Excess Stock
  const top10Excess = useMemo(() => {
    return [...filteredData]
      .filter(d => d.excessoQtd > 0)
      .sort((a, b) => b.excessoValor - a.excessoValor)
      .slice(0, 10)
      .map(d => ({
        nome: d.produto.length > 20 ? d.produto.substring(0, 18) + '...' : d.produto,
        excessoValor: d.excessoValor,
        excessoQtd: d.excessoQtd,
        cobertura: d.coberturaDias
      }));
  }, [filteredData]);

  // 3. Top 10 Shortage (Falta Teórica)
  const top10Shortage = useMemo(() => {
    return [...filteredData]
      .filter(d => d.faltaQtd > 0)
      .sort((a, b) => b.faltaValor - a.faltaValor)
      .slice(0, 10)
      .map(d => ({
        nome: d.produto.length > 20 ? d.produto.substring(0, 18) + '...' : d.produto,
        faltaValor: d.faltaValor,
        faltaQtd: d.faltaQtd,
        cobertura: d.coberturaDias
      }));
  }, [filteredData]);

  // 4. Histogram Coverage Ranges
  const histogramData = useMemo(() => {
    const ranges = [
      { range: '0 dias (Ruptura)', count: 0 },
      { range: '1 - 3 dias', count: 0 },
      { range: '4 - 6 dias (Ideal)', count: 0 },
      { range: '7 - 10 dias', count: 0 },
      { range: '> 10 dias (Excesso)', count: 0 },
    ];

    filteredData.forEach(d => {
      if (d.coberturaDias === 0) ranges[0].count++;
      else if (d.coberturaDias <= 3) ranges[1].count++;
      else if (d.coberturaDias <= 6) ranges[2].count++;
      else if (d.coberturaDias <= 10) ranges[3].count++;
      else ranges[4].count++;
    });

    return ranges;
  }, [filteredData]);

  // 5. ABC Curve Comparison
  const abcCurveData = useMemo(() => {
    // Sort items by total stock value
    const sorted = [...filteredData].sort((a, b) => (b.estoqueAtualTotal * b.precoUnitario) - (a.estoqueAtualTotal * a.precoUnitario));
    const totalVal = sorted.reduce((acc, curr) => acc + (curr.estoqueAtualTotal * curr.precoUnitario), 0) || 1;

    let cumVal = 0;
    const catA: PoliticaEstoqueCalculada[] = [];
    const catB: PoliticaEstoqueCalculada[] = [];
    const catC: PoliticaEstoqueCalculada[] = [];

    sorted.forEach(item => {
      cumVal += (item.estoqueAtualTotal * item.precoUnitario);
      const perc = (cumVal / totalVal) * 100;
      if (perc <= 80) catA.push(item);
      else if (perc <= 95) catB.push(item);
      else catC.push(item);
    });

    const avgCob = (list: PoliticaEstoqueCalculada[]) => {
      if (list.length === 0) return 0;
      const sum = list.reduce((acc, curr) => acc + curr.coberturaDias, 0);
      return parseFloat((sum / list.length).toFixed(1));
    };

    return [
      { classe: 'Classe A (80% valor)', itens: catA.length, coberturaMedia: avgCob(catA), target: 6 },
      { classe: 'Classe B (15% valor)', itens: catB.length, coberturaMedia: avgCob(catB), target: 6 },
      { classe: 'Classe C (5% valor)', itens: catC.length, coberturaMedia: avgCob(catC), target: 6 },
    ];
  }, [filteredData]);

  // 6. Historical Evolution of Adherence (Mock trend line)
  const historicalEvolutionData = [
    { mes: 'Semana 1', aderencia: 68, cobertura: 8.2 },
    { mes: 'Semana 2', aderencia: 72, cobertura: 7.5 },
    { mes: 'Semana 3', aderencia: 79, cobertura: 6.8 },
    { mes: 'Semana 4', aderencia: kpis.percentAderencia, cobertura: kpis.coberturaMedia },
  ];

  // 7. Heatmap por Família: CERVEJA, NAB, MATCH, MARKETPLACE
  const heatmapData = useMemo(() => {
    const targetGroups: ('Cerveja' | 'NAB' | 'Match' | 'Marketplace')[] = [
      'Cerveja', 
      'NAB', 
      'Match', 
      'Marketplace'
    ];

    return targetGroups.map(grupo => {
      const matches = filteredData.filter(d => categorizeFamilia(d) === grupo);
      const totalEstoque = matches.reduce((acc, c) => acc + c.estoqueAtualTotal, 0);
      const totalVendaMedia = matches.reduce((acc, c) => acc + c.vendaMediaDiaria, 0);
      const totalValorExcesso = matches.reduce((acc, c) => acc + c.excessoValor, 0);
      const totalValorFalta = matches.reduce((acc, c) => acc + c.faltaValor, 0);

      const avgCoverage = totalVendaMedia > 0 
        ? parseFloat((totalEstoque / totalVendaMedia).toFixed(1))
        : (totalEstoque > 0 ? 99 : 0);

      let statusColor = 'bg-emerald-50 text-emerald-950 border-emerald-200 hover:border-emerald-400';
      let badgeColor = 'bg-emerald-600 text-white';
      let statusText = 'Adequado (3-8d)';

      if (totalEstoque === 0 && matches.length > 0) {
        statusColor = 'bg-rose-50 text-rose-950 border-rose-200 hover:border-rose-400';
        badgeColor = 'bg-rose-600 text-white';
        statusText = 'Ruptura (0d)';
      } else if (avgCoverage < 3) {
        statusColor = 'bg-amber-50 text-amber-950 border-amber-200 hover:border-amber-400';
        badgeColor = 'bg-amber-600 text-white';
        statusText = 'Crítico (<3d)';
      } else if (avgCoverage > 8) {
        statusColor = 'bg-purple-50 text-purple-950 border-purple-200 hover:border-purple-400';
        badgeColor = 'bg-purple-600 text-white';
        statusText = 'Excesso (>8d)';
      }

      return {
        familia: grupo,
        countSkus: matches.length,
        totalEstoque: Math.round(totalEstoque),
        totalVendaMedia: Math.round(totalVendaMedia * 10) / 10,
        avgCoverage,
        totalValorExcesso,
        totalValorFalta,
        statusColor,
        badgeColor,
        statusText
      };
    });
  }, [filteredData]);

  // ── SMART BUCKETS FOR REQUIREMENT 19 (Excluding item 838 Chopp) ──
  const bucketImediata = useMemo(() => filteredData.filter(d => d.codigo !== 838 && (d.status === 'ruptura' || d.status === 'critico')), [filteredData]);
  const bucketExcesso = useMemo(() => filteredData.filter(d => d.codigo !== 838 && d.status === 'sobre_estoque'), [filteredData]);
  const bucketAtencao = useMemo(() => filteredData.filter(d => d.codigo !== 838 && d.status === 'atencao'), [filteredData]);
  const bucketAcima6 = useMemo(() => filteredData.filter(d => d.codigo !== 838 && d.coberturaDias > 6), [filteredData]);

  const displayedBucketData = useMemo(() => {
    if (activeBucketTab === 'imediata') return bucketImediata;
    if (activeBucketTab === 'excesso') return bucketExcesso;
    if (activeBucketTab === 'atencao') return bucketAtencao;
    if (activeBucketTab === 'acima6') return bucketAcima6;
    return filteredData;
  }, [activeBucketTab, bucketImediata, bucketExcesso, bucketAtencao, bucketAcima6, filteredData]);

  return (
    <div className="space-y-6">
      {/* ── HEADER BANNER & VISÃO FILTER ── */}
      <div className="bg-gradient-to-r from-[#032b5e] via-[#0a4386] to-[#1e56f0] rounded-2xl p-6 text-white shadow-xl border border-blue-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20 flex items-center gap-1.5 w-max">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Módulos 16, 17, 18 & 19 - Gestão Integrada de Estoque
          </span>
          <h2 className="text-2xl font-black tracking-tight mt-2 flex items-center gap-2">
            Dashboard da Política de Estoque & Análise Inteligente (6 Dias)
          </h2>
          <p className="text-xs text-blue-100/90 font-medium mt-1 max-w-3xl">
            Motor de cálculo em tempo real parametrizado na política oficial de <strong>6 dias de cobertura</strong>. Monitore sobre-estoque, rupturas teóricas e receba recomendações táticas automatizadas.
          </p>

          {/* VISÃO FILTER TOGGLE (ALL / AMBEV / MARKETPLACE) */}
          <div className="mt-4 flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-blue-200 tracking-wider">Visão:</span>
            <div className="flex items-center gap-1.5 bg-black/30 p-1 rounded-xl border border-white/15">
              <button
                onClick={() => setSelectedVisao('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedVisao === 'ALL' ? 'bg-amber-400 text-slate-950 shadow-md font-extrabold' : 'text-slate-200 hover:bg-white/10'
                }`}
              >
                🌐 Todos (ALL)
              </button>
              <button
                onClick={() => setSelectedVisao('AMBEV')}
                className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedVisao === 'AMBEV' ? 'bg-amber-400 text-slate-950 shadow-md font-extrabold' : 'text-slate-200 hover:bg-white/10'
                }`}
              >
                🍺 Visão AMBEV
              </button>
              <button
                onClick={() => setSelectedVisao('MARKETPLACE')}
                className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedVisao === 'MARKETPLACE' ? 'bg-amber-400 text-slate-950 shadow-md font-extrabold' : 'text-slate-200 hover:bg-white/10'
                }`}
              >
                🛒 Marketplace
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onNavigateToImport && (
            <button
              onClick={() => onNavigateToImport('importacao-contagens')}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 transition-all cursor-pointer flex items-center gap-2"
            >
              📂 Cargas de Estoque
            </button>
          )}
          {onNavigateToImport && (
            <button
              onClick={() => onNavigateToImport('venda-media')}
              className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              📈 Atualizar Venda Média
            </button>
          )}
        </div>
      </div>

      {/* ── CARD IMPORTAÇÃO DE BASE (02.05.02 e 03.05.19) ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-[#1e56f0] rounded-xl border border-blue-100">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                Importação de Base Oficial (02.05.02 e 03.05.19)
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Carregue os relatórios em .csv ou .txt para atualizar a Posição de Estoque Disponível e a Venda Média em tempo real.
              </p>
            </div>
          </div>
        </div>

        {feedbackMsg && (
          <div className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between ${
            feedbackMsg.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-rose-50 text-rose-900 border border-rose-200'
          }`}>
            <span>{feedbackMsg.text}</span>
            <button onClick={() => setFeedbackMsg(null)} className="text-slate-400 hover:text-slate-600 font-black ml-2 cursor-pointer">✕</button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* DROPZONE 1: 02.05.02 */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-800 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                02.05.02 — Posição de Estoque
              </span>
              <button
                onClick={handleClear0205}
                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[10px] uppercase rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                title="Excluir base atual de Posição de Estoque"
              >
                <Trash2 className="w-3 h-3" /> Excluir Base Atual
              </button>
            </div>

            <label className="border-2 border-dashed border-slate-300 hover:border-[#1e56f0] hover:bg-blue-50/30 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all">
              <Upload className="w-6 h-6 text-slate-400 mb-1" />
              <span className="text-xs font-bold text-slate-700">Clique para selecionar ou arraste o arquivo</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Relatório 02.05.02 (.csv ou .txt)</span>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileChange0205}
                className="hidden"
              />
            </label>

            {log0205 ? (
              <div className="bg-white border border-slate-200 rounded-lg p-2.5 text-[11px] space-y-1">
                <div className="flex items-center justify-between text-slate-700 font-bold">
                  <span className="truncate max-w-[200px]">📄 {log0205.nomeArquivo}</span>
                  <span className="text-slate-400 font-mono text-[10px]">{log0205.dataHora}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-600 text-[10px] pt-1 border-t border-slate-100">
                  <span>Linhas: <strong>{log0205.totalLinhas}</strong></span>
                  <span className="text-emerald-600">Aceitos: <strong>{log0205.aceitos}</strong></span>
                  <span className="text-amber-600">Rejeitados: <strong>{log0205.rejeitados}</strong></span>
                </div>
              </div>
            ) : (
              <p className="text-[10px] text-slate-400 italic text-center">Nenhum arquivo 02.05.02 importado ainda.</p>
            )}
          </div>

          {/* DROPZONE 2: 03.05.19 */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-800 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-[#1e56f0]" />
                03.05.19 — Venda do Mês
              </span>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                  <span>Dias Úteis:</span>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={diasUteis0305}
                    onChange={(e) => setDiasUteis0305(parseInt(e.target.value) || 22)}
                    className="w-12 p-0.5 bg-white border border-slate-200 rounded text-center font-mono font-bold"
                  />
                </div>
                <button
                  onClick={handleClear0305}
                  className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[10px] uppercase rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                  title="Excluir base atual de Venda do Mês"
                >
                  <Trash2 className="w-3 h-3" /> Excluir Base Atual
                </button>
              </div>
            </div>

            <label className="border-2 border-dashed border-slate-300 hover:border-[#1e56f0] hover:bg-blue-50/30 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all">
              <Upload className="w-6 h-6 text-slate-400 mb-1" />
              <span className="text-xs font-bold text-slate-700">Clique para selecionar ou arraste o arquivo</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Relatório 03.05.19 (.csv ou .txt)</span>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileChange0305}
                className="hidden"
              />
            </label>

            {log0305 ? (
              <div className="bg-white border border-slate-200 rounded-lg p-2.5 text-[11px] space-y-1">
                <div className="flex items-center justify-between text-slate-700 font-bold">
                  <span className="truncate max-w-[200px]">📄 {log0305.nomeArquivo}</span>
                  <span className="text-slate-400 font-mono text-[10px]">{log0305.dataHora}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-600 text-[10px] pt-1 border-t border-slate-100">
                  <span>Linhas: <strong>{log0305.totalLinhas}</strong></span>
                  <span className="text-emerald-600">Aceitos: <strong>{log0305.aceitos}</strong></span>
                  <span className="text-amber-600">Rejeitados: <strong>{log0305.rejeitados}</strong></span>
                </div>
              </div>
            ) : (
              <p className="text-[10px] text-slate-400 italic text-center">Nenhum arquivo 03.05.19 importado ainda.</p>
            )}
          </div>
        </div>
      </div>

      {/* ── CENTRALIZED FILTERS BAR (GRUPO & CURVA ABC) ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#1e56f0]" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-800">
              Filtros de Estoque (Grupo & Curva ABC)
            </span>
            <span className="text-[10px] font-bold px-2.5 py-0.5 bg-blue-50 text-[#1e56f0] rounded-full border border-blue-100">
              {kpis.totalItens} produtos visíveis
            </span>
          </div>

          <button 
            onClick={() => {
              setSelectedGrupos(['CERVEJA', 'NAB', 'MATCH', 'MARKETPLACE']);
              setSelectedCurva('ALL');
              setSearchTerm('');
            }}
            className="text-[11px] font-bold text-[#1e56f0] hover:text-blue-800 hover:underline cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw className="w-3 h-3" /> Limpar Filtros
          </button>
        </div>

        {/* PRIMARY FILTERS ROW: Grupos (Multi-Select), Curva ABC, Busca SKU */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* 1. GRUPOS MULTI-SELECT CLICKABLE BUTTONS */}
          <div className="md:col-span-6 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">
                1. Filtro por Grupo (Seleção Múltipla)
              </label>
              <span className="text-[9px] font-bold text-slate-400">Clique para alternar um ou mais</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'CERVEJA', label: 'Cerveja', color: 'bg-amber-500 border-amber-600 text-white' },
                { id: 'NAB', label: 'NAB', color: 'bg-blue-600 border-blue-700 text-white' },
                { id: 'MATCH', label: 'Match', color: 'bg-purple-600 border-purple-700 text-white' },
                { id: 'MARKETPLACE', label: 'Marketplace', color: 'bg-indigo-600 border-indigo-700 text-white' }
              ].map(g => {
                const isSelected = selectedGrupos.includes(g.id);
                return (
                  <button
                    key={g.id}
                    onClick={() => toggleGrupo(g.id)}
                    className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                      isSelected 
                        ? `${g.color} shadow-xs font-black ring-2 ring-slate-900/10` 
                        : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${isSelected ? 'bg-white' : 'bg-slate-300'}`}></span>
                    {g.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. CURVA ABC FILTER */}
          <div className="md:col-span-3 space-y-1.5">
            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">
              2. Filtro por Curva ABC
            </label>
            <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 font-bold text-xs">
              {(['ALL', 'A', 'B', 'C'] as const).map(c => (
                <button
                  key={c}
                  onClick={() => setSelectedCurva(c)}
                  className={`flex-1 py-1.5 rounded-lg transition-all text-center cursor-pointer ${
                    selectedCurva === c 
                      ? 'bg-slate-900 text-white font-black shadow-xs' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {c === 'ALL' ? 'Todas' : `Curva ${c}`}
                </button>
              ))}
            </div>
          </div>

          {/* 3. BUSCAR SKU POR CÓDIGO OU DESCRIÇÃO */}
          <div className="md:col-span-3 space-y-1.5">
            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">
              Buscar SKU (Código / Nome)
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Digitar código ou nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#1e56f0] focus:bg-white transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI CARDS GRID (6 CARDS INCL. VALORAÇÃO E HECTOLITROS) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        {/* KPI 1: Cobertura Média */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Cobertura Média</span>
            <span className="p-1.5 bg-blue-50 text-[#1e56f0] rounded-lg">
              <Calendar className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black font-mono text-[#032b5e]">
              {kpis.coberturaMedia} <span className="text-xs font-bold text-slate-500">dias</span>
            </span>
            <span className="text-[10px] font-extrabold text-emerald-600 block mt-0.5">
              Alvo Oficial: 6,0 Dias
            </span>
          </div>
        </div>

        {/* KPI 2: Valoração Estoque Total (Fechado + Avulso) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between border-l-4 border-l-indigo-600">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-900">Valoração Estoque Total</span>
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <Package className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <span className="text-xl font-black font-mono text-indigo-950">
              R$ {kpis.valorEstoqueTotalComAvulso.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] font-extrabold text-indigo-700 block mt-0.5">
              Fechado + Avulso ({kpis.qtdSkuFechadoTotal.toLocaleString('pt-BR')} cx / {kpis.qtdUnidadeAvulsaTotal.toLocaleString('pt-BR')} un)
            </span>
          </div>
        </div>

        {/* KPI 3: Total Hectolitros em Estoque */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between border-l-4 border-l-sky-500">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-sky-800">Volume Total Estoque</span>
            <span className="p-1.5 bg-sky-50 text-sky-600 rounded-lg">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <span className="text-xl font-black font-mono text-sky-950">
              {kpis.totalHecto.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} <span className="text-xs font-bold text-slate-500">HL</span>
            </span>
            <span className="text-[10px] font-extrabold text-sky-700 block mt-0.5">
              Hectolitros Totais (Fator Hecto)
            </span>
          </div>
        </div>

        {/* KPI 4: Valor Excesso de Estoque */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">Valor Excesso (Overstock)</span>
            <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <span className="text-xl font-black font-mono text-amber-900">
              R$ {kpis.valorExcessoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] font-extrabold text-amber-700 block mt-0.5">
              {kpis.countAcima} produtos acima de 6d
            </span>
          </div>
        </div>

        {/* KPI 5: Valor Falta Teórica */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-800">Valor Falta Teórica</span>
            <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
              <TrendingDown className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <span className="text-xl font-black font-mono text-rose-900">
              R$ {kpis.valorFaltaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] font-extrabold text-rose-700 block mt-0.5">
              {kpis.countAbaixo} produtos abaixo de 6d
            </span>
          </div>
        </div>

        {/* KPI 6: Percentual de Aderência */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">Aderência à Política</span>
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black font-mono text-emerald-950">
              {kpis.percentAderencia}%
            </span>
            <span className="text-[10px] font-extrabold text-slate-400 block mt-0.5">
              Estoque Fechado: {kpis.estoqueAtualTotal.toLocaleString('pt-BR')} / Ideal: {kpis.estoqueIdealTotal.toLocaleString('pt-BR')}
            </span>
          </div>
        </div>
      </div>

      {/* ── CHARTS SECTION 1: DISTRIBUIÇÃO & HISTOGRAMA & EVOLUÇÃO ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CHART 1: Distribuição por Cobertura */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-[#1e56f0]" />
              Distribuição por Cobertura de Estoque
            </h3>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Classificação por criticidade do saldo disponível.
            </p>
          </div>

          <div className="h-64 my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieDistributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => [`${value} SKUs`, 'Quantidade']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }}
                />
                <Legend 
                  layout="horizontal" 
                  verticalAlign="bottom" 
                  align="center" 
                  wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 4: Histograma de Cobertura em Dias */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#1e56f0]" />
              Histograma de Cobertura (Faixas de Dias)
            </h3>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Quantidade de SKUs agrupados por intervalo de autonomia.
            </p>
          </div>

          <div className="h-64 my-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={histogramData} margin={{ top: 20, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="range" tick={{ fontSize: 9, fill: '#64748b' }} interval={0} angle={-15} textAnchor="end" />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }}
                />
                <Bar dataKey="count" fill="#1e56f0" radius={[6, 6, 0, 0]} name="SKUs na faixa" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 6: Evolução Histórica da Aderência */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#1e56f0]" />
              Evolução da Aderência à Política (%)
            </h3>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Tendência temporal do alinhamento ao alvo de 6 dias.
            </p>
          </div>

          <div className="h-64 my-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historicalEvolutionData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAderencia" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip 
                  formatter={(val: any) => [`${val}%`, 'Aderência']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }}
                />
                <Area type="monotone" dataKey="aderencia" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorAderencia)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── CHARTS SECTION 2: TOP EXCESSO & TOP FALTA & CURVA ABC ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CHART 2: Top 10 Excesso */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-amber-500" />
            Top 10 Maior Excesso de Estoque (R$)
          </h3>
          <p className="text-[11px] text-slate-400 font-medium mb-3">
            Produtos com maior capital imobilizado acima dos 6d.
          </p>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={top10Excess} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 9, fill: '#64748b' }} />
                <YAxis dataKey="nome" type="category" tick={{ fontSize: 9, fill: '#334155', fontWeight: 'bold' }} width={110} />
                <Tooltip 
                  formatter={(val: any) => [`R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Excesso Financeiro']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }}
                />
                <Bar dataKey="excessoValor" fill="#f59e0b" radius={[0, 6, 6, 0]} name="Valor Excedente" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 3: Top 10 Falta Teórica */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-rose-500" />
            Top 10 Maior Falta Teórica (R$)
          </h3>
          <p className="text-[11px] text-slate-400 font-medium mb-3">
            Produtos com maior déficit para atingir os 6d.
          </p>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={top10Shortage} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 9, fill: '#64748b' }} />
                <YAxis dataKey="nome" type="category" tick={{ fontSize: 9, fill: '#334155', fontWeight: 'bold' }} width={110} />
                <Tooltip 
                  formatter={(val: any) => [`R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Falta Financeira']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }}
                />
                <Bar dataKey="faltaValor" fill="#ef4444" radius={[0, 6, 6, 0]} name="Valor Faltante" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 5: Curva ABC vs Cobertura */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2 mb-1">
            <Grid className="w-4 h-4 text-[#1e56f0]" />
            Curva ABC Comparada à Cobertura
          </h3>
          <p className="text-[11px] text-slate-400 font-medium mb-3">
            Média de dias de estoque por importância financeira.
          </p>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={abcCurveData} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="classe" tick={{ fontSize: 10, fill: '#334155', fontWeight: 'bold' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip 
                  formatter={(val: any) => [`${val} dias`, 'Cobertura Média']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }}
                />
                <Bar dataKey="coberturaMedia" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Cobertura Atual (Dias)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── CHART 7: MAPA DE CALOR POR FAMÍLIA (CERVEJA, NAB, MATCH, MARKETPLACE) ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
              <Grid className="w-4 h-4 text-purple-600" />
              Mapa de Calor de Cobertura por Família (Cerveja, NAB, Match, Marketplace)
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Matriz de autonomia em dias calculada com base no Estoque Disponível (02.05.02) e Venda Média (03.05.19).
            </p>
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 px-2.5 py-1 rounded-lg border border-purple-100">
            Visão Consolidada por Família
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
          {heatmapData.map((cell, idx) => (
            <div key={idx} className={`p-4 rounded-xl border flex flex-col justify-between transition-all shadow-xs hover:shadow-md ${cell.statusColor}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-tight">{cell.familia}</span>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${cell.badgeColor}`}>
                  {cell.statusText}
                </span>
              </div>

              <div className="my-3">
                <span className="text-2xl font-black font-mono block tracking-tight">
                  {cell.avgCoverage} <span className="text-xs font-extrabold text-slate-500">dias</span>
                </span>
                <span className="text-[10px] font-bold text-slate-500 mt-0.5 block">
                  {cell.countSkus} SKUs Ativos
                </span>
              </div>

              <div className="space-y-1 text-[10px] font-semibold border-t border-slate-200/60 pt-2 opacity-90">
                <div className="flex justify-between">
                  <span>Estoque Total:</span>
                  <span className="font-mono font-bold">{cell.totalEstoque.toLocaleString('pt-BR')} cx</span>
                </div>
                <div className="flex justify-between">
                  <span>Venda Média/Dia:</span>
                  <span className="font-mono font-bold">{cell.totalVendaMedia.toLocaleString('pt-BR')} cx</span>
                </div>
                {cell.totalValorExcesso > 0 && (
                  <div className="flex justify-between text-purple-900 font-bold">
                    <span>Excesso (R$):</span>
                    <span className="font-mono">R$ {cell.totalValorExcesso.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── MÓDULO 19: ANÁLISE INTELIGENTE DE REPOSIÇÃO & RECOMENDAÇÕES ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#1e56f0] bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
            🤖 Módulo 19 - Inteligência de Estoque
          </span>
          <h3 className="text-lg font-black text-slate-900 tracking-tight mt-2 flex items-center gap-2">
            Análise Inteligente de Reposição & Recomendações Táticas
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Classificação automatizada dos produtos com motor de decisões em tempo real para abastecimento, remanejamento e compras.
          </p>
        </div>

        {/* RECOMENDAÇÕES TÁTICAS AUTO-GERADAS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-950 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Ação 1: Ruptura / Crítico
              </span>
              <span className="bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                {bucketImediata.length} SKUs
              </span>
            </div>
            <p className="text-xs font-bold mt-2 text-rose-900">
              🚨 Priorizar Compras e Carga Urgente
            </p>
            <p className="text-[11px] text-rose-800/90 font-medium mt-1">
              Produtos com estoque zerado ou autonomia abaixo de 3 dias. Requer intervenção imediata para evitar desabastecimento no mercado.
            </p>
            <button
              onClick={() => setActiveBucketTab('imediata')}
              className="mt-3 w-full py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition-all cursor-pointer"
            >
              Ver Itens Críticos ➔
            </button>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-950 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 flex items-center gap-1">
                <RefreshCw className="w-3.5 h-3.5" /> Ação 2: Reabastecer Picking
              </span>
              <span className="bg-amber-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                {filteredData.filter(d => d.acaoRecomendada === 'reabastecer_picking' || d.acaoRecomendada === 'transferir_central_picking').length} SKUs
              </span>
            </div>
            <p className="text-xs font-bold mt-2 text-amber-900">
              🚚 Transferir do Central para Picking
            </p>
            <p className="text-[11px] text-amber-800/90 font-medium mt-1">
              Baias de separação desequilibradas em relação ao saldo estocado no Armazém Central. Realizar reposição interna de paletes.
            </p>
            <button
              onClick={() => setActiveBucketTab('atencao')}
              className="mt-3 w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-all cursor-pointer"
            >
              Ver Remanejamentos ➔
            </button>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-purple-950 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-800 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" /> Ação 3: Excesso (&gt; 6 Dias)
              </span>
              <span className="bg-purple-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                {bucketAcima6.length} SKUs
              </span>
            </div>
            <p className="text-xs font-bold mt-2 text-purple-900">
              ⛔ Suspender Abastecimento & Remanejar
            </p>
            <p className="text-[11px] text-purple-800/90 font-medium mt-1">
              Itens com estoque superior à política oficial. Congelar novos recebimentos e reavaliar giro de vendas.
            </p>
            <button
              onClick={() => setActiveBucketTab('acima6')}
              className="mt-3 w-full py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg transition-all cursor-pointer"
            >
              Ver Itens em Excesso ➔
            </button>
          </div>
        </div>

        {/* TABS DE CLASSIFICAÇÃO */}
        <div className="border-t border-slate-100 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setActiveBucketTab('todos')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeBucketTab === 'todos' ? 'bg-[#032b5e] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todos ({filteredData.length})
              </button>
              <button
                onClick={() => setActiveBucketTab('imediata')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeBucketTab === 'imediata' ? 'bg-rose-600 text-white shadow-xs' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                }`}
              >
                🔴 Reposição Imediata ({bucketImediata.length})
              </button>
              <button
                onClick={() => setActiveBucketTab('atencao')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeBucketTab === 'atencao' ? 'bg-amber-600 text-white shadow-xs' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                }`}
              >
                🟡 Próximos da Ruptura ({bucketAtencao.length})
              </button>
              <button
                onClick={() => setActiveBucketTab('excesso')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeBucketTab === 'excesso' ? 'bg-purple-600 text-white shadow-xs' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                }`}
              >
                🟣 Excesso de Estoque ({bucketExcesso.length})
              </button>
              <button
                onClick={() => setActiveBucketTab('acima6')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeBucketTab === 'acima6' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                }`}
              >
                🔵 Cobertura &gt; 6d ({bucketAcima6.length})
              </button>
            </div>
          </div>

          {/* TABLE OF REPLENISHMENT RECOMMENDATIONS */}
          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Produto / SKU</th>
                  <th className="py-3 px-4 text-right">Venda Média (d)</th>
                  <th className="py-3 px-4 text-right">Estoque Ideal (6d)</th>
                  <th className="py-3 px-4 text-right">Estoque Atual</th>
                  <th className="py-3 px-4 text-center">Cobertura</th>
                  <th className="py-3 px-4">Grupo</th>
                  <th className="py-3 px-4 text-center">Curva ABC</th>
                  <th className="py-3 px-4">Criticidade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {displayedBucketData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 font-semibold">
                      Nenhum produto nesta categoria.
                    </td>
                  </tr>
                ) : (
                  displayedBucketData.map((row) => {
                    const meta = getProductMeta(row.codigo);
                    const grupo = meta.grupo || row.grupo || row.familia;
                    const curva = meta.curva || row.curvaABC || 'C';

                    return (
                      <tr key={row.codigo} className="hover:bg-slate-50 transition-all">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{row.codigo}</td>
                        <td className="py-3 px-4 font-bold text-slate-800">
                          {row.produto}
                          <span className="block text-[10px] font-normal text-slate-400">{row.familia} • {row.marca}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-700">
                          {row.vendaMediaDiaria.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {row.estoqueIdeal.toLocaleString('pt-BR')} cx
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-slate-950 text-sm">
                          {row.estoqueAtualTotal.toLocaleString('pt-BR')} cx
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-black">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] ${
                            row.coberturaDias === 0 ? 'bg-rose-100 text-rose-800 font-black' :
                            row.coberturaDias < 3 ? 'bg-amber-100 text-amber-800 font-black' :
                            row.coberturaDias > 8 ? 'bg-purple-100 text-purple-800 font-black' :
                            'bg-emerald-100 text-emerald-800 font-bold'
                          }`}>
                            {row.coberturaDias}d
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800">
                          <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 text-[11px] font-black border border-slate-200 inline-block">
                            {grupo}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-black border inline-block ${
                            curva === 'A' ? 'bg-amber-100 text-amber-900 border-amber-300' :
                            curva === 'B' ? 'bg-blue-100 text-blue-900 border-blue-300' :
                            'bg-slate-100 text-slate-800 border-slate-300'
                          }`}>
                            Curva {curva}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-[11px]">
                          {row.criticidade}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
