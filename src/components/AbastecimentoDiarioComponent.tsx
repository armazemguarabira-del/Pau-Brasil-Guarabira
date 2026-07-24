import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Package, 
  Layers, 
  Truck, 
  Search, 
  SlidersHorizontal, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Activity,
  ArrowUpRight,
  TrendingUp,
  Info,
  Sparkles,
  FileSpreadsheet,
  Save,
  Edit2,
  History,
  Calendar,
  Trash2,
  Database,
  Check,
  X,
  FileText,
  RefreshCw,
  Undo,
  Moon,
  AlertTriangle,
  AlertOctagon
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Cell
} from 'recharts';
import { BaseSkuData, ABASTECIMENTO_PRODUCTS_DATA } from '../data/abastecimentoData';
import { PRODUCTS } from '../planosData';
import { Tarefa } from '../types';
import * as XLSX from 'xlsx';
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';

interface AbastecimentoDiarioComponentProps {
  user: any;
  empresa: any;
  tasks: any[];
}

export default function AbastecimentoDiarioComponent({ user, empresa, tasks }: AbastecimentoDiarioComponentProps) {
  // Date State for analysis (default: today)
  const [selectedAnalysisDate, setSelectedAnalysisDate] = useState<string>(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ok' | 'attention' | 'critical' | 'night_need' | 'no_picking_sales' | 'total_rupture'>('night_need');
  const [showOnlyWithSales, setShowOnlyWithSales] = useState(false);

  // Night Replenishment Strategy State
  const [nightStrategy, setNightStrategy] = useState<'repor_vendas' | 'completar_1pl' | 'completar_2pl' | 'deficit'>('deficit');

  // Edit Mode & Database States
  const [isEditMode, setIsEditMode] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [savedAnalyses, setSavedAnalyses] = useState<any[]>([]);
  const [activePanel, setActivePanel] = useState<'analise' | 'historico'>('analise');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isHistoricalLoaded, setIsHistoricalLoaded] = useState(false);
  const [loadedHistoryMeta, setLoadedHistoryMeta] = useState<any | null>(null);

  // States for importing sales/venda files (Rotina 020304) and picking stock (Rotina 021101)
  const [importing021101, setImporting021101] = useState(false);
  const [fileName021101, setFileName021101] = useState('');
  const [importing020304, setImporting020304] = useState(false);
  const [fileName020304, setFileName020304] = useState('');

  // Customizable products list initialized with default baseline values
  const [productsList, setProductsList] = useState<BaseSkuData[]>(ABASTECIMENTO_PRODUCTS_DATA);

  // Customizable product data state initialized with default baseline values
  const [customProductData, setCustomProductData] = useState<Record<number, { estoqueInicialCaixas: number; vendaCaixas: number }>>(() => {
    const initial: Record<number, { estoqueInicialCaixas: number; vendaCaixas: number }> = {};
    ABASTECIMENTO_PRODUCTS_DATA.forEach(p => {
      initial[p.sku] = {
        estoqueInicialCaixas: p.estoqueInicialCaixas,
        vendaCaixas: p.vendaCaixas
      };
    });
    return initial;
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // 1. Load saved analysis for the selected date from Firestore
  const loadAnalysisForDate = async (dateStr: string) => {
    if (!empresa?.id) return;
    setSaving(true);
    try {
      const q = query(
        collection(db, 'analises_abastecimento_diario'),
        where('empresaId', '==', empresa.id),
        where('dataAnalise', '==', dateStr)
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const docData = querySnapshot.docs[0].data();
        const productDetails = docData.productDetails || [];
        
        const loadedData: Record<number, { estoqueInicialCaixas: number; vendaCaixas: number }> = {};
        const loadedProductsList: BaseSkuData[] = [];
        
        productDetails.forEach((p: any) => {
          loadedData[p.sku] = {
            estoqueInicialCaixas: p.estoqueInicialCaixas,
            vendaCaixas: p.vendaCaixas
          };
          loadedProductsList.push({
            sku: Number(p.sku),
            descricao: p.descricao || `PRODUTO ${p.sku}`,
            unidade: p.unidade || 'cx',
            embalagem: p.embalagem || 1,
            qtdPallet: p.qtdPallet || 100,
            estoqueInicialCaixas: p.estoqueInicialCaixas,
            vendaCaixas: p.vendaCaixas
          });
        });
        
        setProductsList(loadedProductsList.length > 0 ? loadedProductsList : ABASTECIMENTO_PRODUCTS_DATA);
        setCustomProductData(loadedData);
        setIsHistoricalLoaded(true);
        setLoadedHistoryMeta({
          id: querySnapshot.docs[0].id,
          savedBy: docData.usuarioEmail || docData.usuarioNome || 'Sistema',
          savedAt: docData.createdAt || ''
        });
        showToast(`Análise para ${dateStr} carregada com sucesso!`, "success");
      } else {
        // Fallback to baseline default values
        const initial: Record<number, { estoqueInicialCaixas: number; vendaCaixas: number }> = {};
        ABASTECIMENTO_PRODUCTS_DATA.forEach(p => {
          initial[p.sku] = {
            estoqueInicialCaixas: p.estoqueInicialCaixas,
            vendaCaixas: p.vendaCaixas
          };
        });
        setProductsList(ABASTECIMENTO_PRODUCTS_DATA);
        setCustomProductData(initial);
        setIsHistoricalLoaded(false);
        setLoadedHistoryMeta(null);
      }
    } catch (error) {
      console.error("Erro ao carregar análise de abastecimento:", error);
      showToast("Erro ao carregar dados da análise.", "error");
    } finally {
      setSaving(false);
    }
  };

  // 2. Query history list of saved analyses
  const fetchHistory = async () => {
    if (!empresa?.id) return;
    setLoadingHistory(true);
    try {
      const q = query(
        collection(db, 'analises_abastecimento_diario'),
        where('empresaId', '==', empresa.id)
      );
      const querySnapshot = await getDocs(q);
      const list: any[] = [];
      querySnapshot.forEach(docSnap => {
        list.push({
          id: docSnap.id,
          ...docSnap.data()
        });
      });
      list.sort((a, b) => b.dataAnalise.localeCompare(a.dataAnalise));
      setSavedAnalyses(list);
    } catch (error) {
      console.error("Erro ao buscar histórico:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Sync state with selected date or company changes
  useEffect(() => {
    if (empresa?.id) {
      loadAnalysisForDate(selectedAnalysisDate);
      fetchHistory();
    }
  }, [selectedAnalysisDate, empresa?.id]);

  // 3. Process tasks to map to our real Ambev SKUs
  const replenishmentMap = useMemo(() => {
    const map = new Map<number, { boxes: number; pallets: number; operators: Set<string>; hourlyCounts: Record<number, number> }>();
    
    // Initialize map with 0s for all products
    productsList.forEach(p => {
      map.set(p.sku, {
        boxes: 0,
        pallets: 0,
        operators: new Set<string>(),
        hourlyCounts: {}
      });
    });

    let excludedCount = 0;

    tasks.forEach(t => {
      // Check if task is completed
      const isCompleted = t.status === 'done' || t.status === 'concluida' || t.status === 'finalizada' || t.status === 'completed';
      if (!isCompleted) return;

      // Extract date string YYYY-MM-DD
      let taskDate = '';
      if (t.dataConclusao) {
        taskDate = t.dataConclusao;
      } else if (t.rawTask?.finalizadoEm) {
        const rawStr = String(t.rawTask.finalizadoEm);
        if (rawStr.includes('T')) taskDate = rawStr.split('T')[0];
        else if (rawStr.includes(' ')) taskDate = rawStr.split(' ')[0];
        else taskDate = rawStr;
      } else if (t.rawTask?.criadoEm) {
        const rawStr = String(t.rawTask.criadoEm);
        if (rawStr.includes('T')) taskDate = rawStr.split('T')[0];
        else if (rawStr.includes(' ')) taskDate = rawStr.split(' ')[0];
        else taskDate = rawStr;
      }

      // Check date match
      if (taskDate && taskDate !== selectedAnalysisDate) return;

      // Extract completion hour (0-23)
      let hour = 12; // default
      if (t.horaConclusao !== undefined && t.horaConclusao >= 0 && t.horaConclusao <= 23) {
        hour = t.horaConclusao;
      } else if (t.rawTask?.finalizadoEm) {
        try {
          const rawStr = String(t.rawTask.finalizadoEm);
          let timePart = '';
          if (rawStr.includes('T')) timePart = rawStr.split('T')[1];
          else if (rawStr.includes(' ')) timePart = rawStr.split(' ')[1];
          if (timePart) {
            hour = parseInt(timePart.split(':')[0], 10);
          }
        } catch (e) {
          hour = 12;
        }
      }

      if (isNaN(hour) || hour < 0 || hour > 23) hour = 12;

      // Map generated task SKU to real Ambev SKU if it's from mock generator (codes 20000+)
      let targetSku = Number(t.sku || t.codigo || 0);
      if (targetSku >= 20000) {
        const idx = (targetSku - 20000) % ABASTECIMENTO_PRODUCTS_DATA.length;
        targetSku = ABASTECIMENTO_PRODUCTS_DATA[idx].sku;
      }

      let entry = map.get(targetSku);

      // Fallback matching by description if direct SKU match wasn't found
      if (!entry) {
        const descSearch = (t.descricaoSku || t.descricao || '').toUpperCase().trim();
        if (descSearch) {
          for (const prod of productsList) {
            const pDescUpper = prod.descricao.toUpperCase();
            const firstWord = pDescUpper.split(' ')[0];
            if (descSearch.includes(firstWord) || pDescUpper.includes(descSearch.split(' ')[0])) {
              entry = map.get(prod.sku);
              targetSku = prod.sku;
              break;
            }
          }
        }
      }

      if (entry) {
        const productInfo = productsList.find(p => p.sku === targetSku);
        const boxesPerPallet = productInfo?.qtdPallet || 100;

        let qtyPallets = Number(t.quantidadePaletes || 0);
        if (!qtyPallets && t.quantidade) {
          qtyPallets = t.quantidade > 25 ? Math.ceil(t.quantidade / boxesPerPallet) : t.quantidade;
        }
        if (qtyPallets <= 0) qtyPallets = 1;

        const qtyBoxes = qtyPallets * boxesPerPallet;
        
        entry.boxes += qtyBoxes;
        entry.pallets += qtyPallets;
        if (t.operador) {
          entry.operators.add(t.operador);
        }
        
        entry.hourlyCounts[hour] = (entry.hourlyCounts[hour] || 0) + qtyBoxes;
      }
    });

    return { map, excludedCount };
  }, [tasks, selectedAnalysisDate, productsList]);

  // Map for SKU -> Hectolitro Factor (fatorHecto)
  const planoHectoMap = useMemo(() => {
    const map = new Map<number, number>();
    PRODUCTS.forEach(p => {
      if (p.codigo && p.fatorHecto) {
        map.set(Number(p.codigo), Number(p.fatorHecto));
      }
    });
    return map;
  }, []);

  // 4. Combine baseline or custom values with active replenishment data
  const processedSkus = useMemo(() => {
    return productsList.map(p => {
      const replData = replenishmentMap.map.get(p.sku) || { boxes: 0, pallets: 0, operators: new Set<string>() };
      
      const customData = customProductData[p.sku] || { estoqueInicialCaixas: p.estoqueInicialCaixas, vendaCaixas: p.vendaCaixas };
      const estoqueInicial = customData.estoqueInicialCaixas;
      const abastecimento = replData.boxes;
      const venda = customData.vendaCaixas;
      
      const estoqueTotalDisponivel = estoqueInicial + abastecimento;
      const saldoPicking = estoqueTotalDisponivel - venda;
      
      const fatorHecto = planoHectoMap.get(Number(p.sku)) || 0.072;
      const estoqueInicialHecto = estoqueInicial * fatorHecto;
      const abastecimentoHecto = abastecimento * fatorHecto;
      const vendaHecto = venda * fatorHecto;
      const saldoPickingHecto = saldoPicking * fatorHecto;

      let status: 'ok' | 'attention' | 'critical' = 'ok';
      if (saldoPicking < 0) {
        status = 'critical';
      } else if (venda > 0 && (saldoPicking < (venda * 0.20))) {
        status = 'attention';
      }

      // Calculate Night Replenishment Need based on selected strategy
      let target = 0;
      if (nightStrategy === 'repor_vendas') {
        target = venda;
      } else if (nightStrategy === 'completar_1pl') {
        target = p.qtdPallet;
      } else if (nightStrategy === 'completar_2pl') {
        target = p.qtdPallet * 2;
      } else if (nightStrategy === 'deficit') {
        target = 0;
      }

      let necessidadeNoturna = 0;
      if (saldoPicking < target) {
        necessidadeNoturna = target - saldoPicking;
      }

      const necessidadeNoturnaPaletes = Math.round((necessidadeNoturna / p.qtdPallet) * 10) / 10;
      const necessidadeNoturnaHecto = necessidadeNoturna * fatorHecto;

      return {
        ...p,
        fatorHecto,
        estoqueInicialCaixas: estoqueInicial,
        estoqueInicialHecto,
        vendaCaixas: venda,
        vendaHecto,
        abastecimento,
        abastecimentoPaletes: replData.pallets,
        abastecimentoHecto,
        estoqueTotalDisponivel,
        estoqueTotalHecto: estoqueTotalDisponivel * fatorHecto,
        saldoPicking,
        saldoPickingHecto,
        status,
        operadores: Array.from(replData.operators),
        necessidadeNoturna,
        necessidadeNoturnaPaletes,
        necessidadeNoturnaHecto
      };
    });
  }, [productsList, replenishmentMap, customProductData, nightStrategy, planoHectoMap]);

  // 5. Totals calculations
  const totalSkusChecked = useMemo(() => processedSkus.filter(p => p.estoqueInicialCaixas > 0).length, [processedSkus]);
  const totalInitialBoxes = useMemo(() => processedSkus.reduce((acc, curr) => acc + curr.estoqueInicialCaixas, 0), [processedSkus]);
  const totalInitialPallets = useMemo(() => {
    return Math.round(processedSkus.reduce((acc, curr) => acc + (curr.estoqueInicialCaixas / curr.qtdPallet), 0) * 10) / 10;
  }, [processedSkus]);
  const totalInitialHecto = useMemo(() => {
    return processedSkus.reduce((acc, curr) => acc + (curr.estoqueInicialHecto || 0), 0);
  }, [processedSkus]);

  const totalSkusReplenished = useMemo(() => processedSkus.filter(p => p.abastecimento > 0).length, [processedSkus]);
  const totalReplenishedBoxes = useMemo(() => processedSkus.reduce((acc, curr) => acc + curr.abastecimento, 0), [processedSkus]);
  const totalReplenishedPallets = useMemo(() => processedSkus.reduce((acc, curr) => acc + curr.abastecimentoPaletes, 0), [processedSkus]);
  const totalReplenishedHecto = useMemo(() => {
    return processedSkus.reduce((acc, curr) => acc + (curr.abastecimentoHecto || 0), 0);
  }, [processedSkus]);

  const activeOperators = useMemo(() => {
    const allOps = new Set<string>();
    replenishmentMap.map.forEach(val => {
      val.operators.forEach(op => allOps.add(op));
    });
    return allOps.size || 5;
  }, [replenishmentMap]);

  const totalSalesBoxes = useMemo(() => processedSkus.reduce((acc, curr) => acc + curr.vendaCaixas, 0), [processedSkus]);
  const totalSalesHecto = useMemo(() => processedSkus.reduce((acc, curr) => acc + (curr.vendaHecto || 0), 0), [processedSkus]);
  const totalCurrentBalanceBoxes = useMemo(() => processedSkus.reduce((acc, curr) => acc + curr.saldoPicking, 0), [processedSkus]);
  const totalCurrentBalanceHecto = useMemo(() => processedSkus.reduce((acc, curr) => acc + (curr.saldoPickingHecto || 0), 0), [processedSkus]);
  
  // Night Replenishment Totals
  const totalSkusNightReplenish = useMemo(() => processedSkus.filter(p => p.necessidadeNoturna > 0).length, [processedSkus]);
  const totalNightReplenishBoxes = useMemo(() => processedSkus.reduce((acc, curr) => acc + curr.necessidadeNoturna, 0), [processedSkus]);
  const totalNightReplenishPallets = useMemo(() => {
    return Math.round(processedSkus.reduce((acc, curr) => acc + (curr.necessidadeNoturna / curr.qtdPallet), 0) * 10) / 10;
  }, [processedSkus]);
  const totalNightReplenishHecto = useMemo(() => {
    return processedSkus.reduce((acc, curr) => acc + (curr.necessidadeNoturnaHecto || 0), 0);
  }, [processedSkus]);
  
  const statusCounts = useMemo(() => {
    let ok = 0;
    let attention = 0;
    let critical = 0;
    processedSkus.forEach(p => {
      if (p.status === 'ok') ok++;
      else if (p.status === 'attention') attention++;
      else if (p.status === 'critical') critical++;
    });
    return { ok, attention, critical };
  }, [processedSkus]);

  // SKUs without initial picking stock that had sales output
  const skusSemEstoqueInicialComVenda = useMemo(() => {
    return processedSkus.filter(p => p.estoqueInicialCaixas === 0 && p.vendaCaixas > 0);
  }, [processedSkus]);

  const skusRupturaTotalPicking = useMemo(() => {
    return processedSkus.filter(p => p.estoqueTotalDisponivel === 0 && p.vendaCaixas > 0);
  }, [processedSkus]);

  // Hourly replenishment data for charts
  const hourlyChartData = useMemo(() => {
    const hours = Array.from({ length: 13 }, (_, i) => i + 7); // 7 to 19
    const hourLabels: Record<number, string> = {
      7: '07h', 8: '08h', 9: '09h', 10: '10h', 11: '11h', 12: '12h',
      13: '13h', 14: '14h', 15: '15h', 16: '16h', 17: '17h', 18: '18h', 19: '19h'
    };

    const dataMap: Record<number, number> = {};
    hours.forEach(h => { dataMap[h] = 0; });

    replenishmentMap.map.forEach(val => {
      Object.entries(val.hourlyCounts).forEach(([h, count]) => {
        const hourNum = Number(h);
        if (hourNum >= 0 && hourNum <= 23) {
          const countNum = Number(count) || 0;
          const targetHour = (hourNum >= 7 && hourNum <= 19) ? hourNum : (hourNum < 7 ? 7 : 19);
          dataMap[targetHour] = (dataMap[targetHour] || 0) + countNum;
        }
      });
    });

    let totalComputed = Object.values(dataMap).reduce((a, b) => a + b, 0);

    if (totalComputed === 0 && totalReplenishedBoxes > 0) {
      const weights: Record<number, number> = { 7: 0.05, 8: 0.10, 9: 0.14, 10: 0.18, 11: 0.12, 12: 0.05, 13: 0.08, 14: 0.12, 15: 0.10, 16: 0.04, 17: 0.02 };
      let allocated = 0;
      Object.entries(weights).forEach(([hStr, w]) => {
        const h = Number(hStr);
        const val = Math.round(totalReplenishedBoxes * w);
        dataMap[h] = val;
        allocated += val;
      });
      dataMap[10] = (dataMap[10] || 0) + (totalReplenishedBoxes - allocated);
    } else if (totalComputed === 0) {
      // Baseline curve for realistic representation
      dataMap[7] = 210;
      dataMap[8] = 450;
      dataMap[9] = 680;
      dataMap[10] = 920;
      dataMap[11] = 710;
      dataMap[12] = 310;
      dataMap[13] = 420;
      dataMap[14] = 810;
      dataMap[15] = 980;
      dataMap[16] = 750;
      dataMap[17] = 510;
      dataMap[18] = 380;
      dataMap[19] = 140;
    }

    return hours.map(h => ({
      hour: hourLabels[h] || `${h}h`,
      caixas: dataMap[h] || 0
    }));
  }, [replenishmentMap, totalReplenishedBoxes]);

  // Top 10 product replenishments
  const topProductsChartData = useMemo(() => {
    const list = processedSkus
      .filter(p => p.abastecimento > 0)
      .map(p => ({
        sku: p.sku,
        name: p.descricao.length > 20 ? p.descricao.substring(0, 18) + '...' : p.descricao,
        fullName: p.descricao,
        caixas: p.abastecimento,
        paletes: Math.round((p.abastecimento / p.qtdPallet) * 10) / 10
      }))
      .sort((a, b) => b.caixas - a.caixas);

    if (list.length === 0) {
      return [
        { sku: 2546, name: "ORIGINAL 600ML", fullName: "ORIGINAL 600ML", caixas: 320, paletes: 3.2 },
        { sku: 13205, name: "SKOL VD 300ML", fullName: "SKOL GFA VD 300ML CX C/23", caixas: 280, paletes: 2.8 },
        { sku: 19164, name: "GUARANA CHP 200ML", fullName: "GUARANA CHP ANTARCTICA PET 200ML", caixas: 240, paletes: 2.4 },
        { sku: 2548, name: "BUDWEISER 600ML", fullName: "BUDWEISER 600ML", caixas: 180, paletes: 1.8 },
        { sku: 1743, name: "ANTARCTICA GFA 1L", fullName: "ANTARCTICA PILSEN GFA VD 1L", caixas: 170, paletes: 1.7 },
        { sku: 9067, name: "ANTARCTICA LATA 350", fullName: "ANTARCTICA PILSEN LATA 350ML", caixas: 150, paletes: 1.5 },
        { sku: 9068, name: "SKOL LATA 350ML", fullName: "SKOL LATA 350ML SH C/12 NPAL", caixas: 120, paletes: 1.2 },
        { sku: 34698, name: "SPATEN N 600ML", fullName: "SPATEN N 600ML CX C/24", caixas: 100, paletes: 1.0 },
        { sku: 19225, name: "RED BULL 250ML", fullName: "RED BULL ENERGY DRINK 250ML", caixas: 80, paletes: 0.8 },
        { sku: 20530, name: "STELLA ARTOIS 269ML", fullName: "STELLA ARTOIS 269ML", caixas: 70, paletes: 0.7 }
      ];
    }

    return list.slice(0, 10);
  }, [processedSkus]);

  // Filtered SKUs for active table
  const filteredSkus = useMemo(() => {
    return processedSkus.filter(p => {
      const matchesSearch = p.descricao.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            String(p.sku).includes(searchTerm);
      if (!matchesSearch) return false;

      if (statusFilter === 'ok' && p.status !== 'ok') return false;
      if (statusFilter === 'attention' && p.status !== 'attention') return false;
      if (statusFilter === 'critical' && p.status !== 'critical') return false;
      if (statusFilter === 'night_need' && p.necessidadeNoturna === 0) return false;
      if (statusFilter === 'no_picking_sales' && !(p.estoqueInicialCaixas === 0 && p.vendaCaixas > 0)) return false;
      if (statusFilter === 'total_rupture' && !(p.estoqueTotalDisponivel === 0 && p.vendaCaixas > 0)) return false;

      if (showOnlyWithSales && p.vendaCaixas === 0 && p.abastecimento === 0) return false;

      return true;
    });
  }, [processedSkus, searchTerm, statusFilter, showOnlyWithSales]);

  // Export to Excel handler
  const handleExportExcel = () => {
    const dataToExport = filteredSkus.map(item => ({
      "SKU": item.sku,
      "Descrição": item.descricao,
      "Embalagem": item.embalagem,
      "Unidade": item.unidade,
      "Qtd/Palete": item.qtdPallet,
      "Estoque Inicial (Caixas) - Rotina 021101": item.estoqueInicialCaixas,
      "Abastecido (Caixas) - Shift Diurno": item.abastecimento,
      "Estoque Total Disp. (Caixas)": item.estoqueTotalDisponivel,
      "Vendas (Caixas) - Rotina 020304": item.vendaCaixas,
      "Saldo Final (Caixas)": item.saldoPicking,
      "Necessidade Noturna (Caixas)": item.necessidadeNoturna,
      "Necessidade Noturna (Paletes)": item.necessidadeNoturnaPaletes,
      "Status": item.status === 'ok' ? '🟢 OK' : item.status === 'attention' ? '🟡 ATENÇÃO' : '🔴 CRÍTICO'
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Abastecimento");
    XLSX.writeFile(wb, `Ambev_Analise_Abastecimento_Diario_${selectedAnalysisDate}.xlsx`);
    showToast("Planilha Excel exportada com sucesso!", "success");
  };

  // Export only night replenishment items
  const handleExportNightExcel = () => {
    const nightItems = processedSkus.filter(p => p.necessidadeNoturna > 0);
    if (nightItems.length === 0) {
      showToast("Não há necessidade de abastecimento noturno para exportar!", "error");
      return;
    }
    const dataToExport = nightItems.map(item => ({
      "SKU": item.sku,
      "Descrição": item.descricao,
      "Embalagem": item.embalagem,
      "Unidade": item.unidade,
      "Qtd/Palete": item.qtdPallet,
      "Saldo Atual Picking": item.saldoPicking,
      "Necessidade Noturna (Caixas)": item.necessidadeNoturna,
      "Necessidade Noturna (Paletes)": item.necessidadeNoturnaPaletes,
      "Estratégia": nightStrategy === 'repor_vendas' ? 'Repor Vendas' : nightStrategy === 'completar_1pl' ? 'Completar 1 Palete' : nightStrategy === 'completar_2pl' ? 'Completar 2 Paletes' : 'Sanar Déficit'
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Abastecimento_Noturno");
    XLSX.writeFile(wb, `Ambev_Necessidade_Abastecimento_Noturno_${selectedAnalysisDate}.xlsx`);
    showToast("Planilha de Abastecimento Noturno exportada com sucesso!", "success");
  };

  // Save active analysis to Firestore
  const handleSaveAnalysis = async () => {
    if (!empresa?.id) {
      showToast("Por favor, selecione uma empresa para salvar.", "error");
      return;
    }
    setSaving(true);
    try {
      const q = query(
        collection(db, 'analises_abastecimento_diario'),
        where('empresaId', '==', empresa.id),
        where('dataAnalise', '==', selectedAnalysisDate)
      );
      const querySnapshot = await getDocs(q);
      
      const analysisDoc = {
        empresaId: empresa.id,
        dataAnalise: selectedAnalysisDate,
        usuarioEmail: user?.email || 'default',
        usuarioNome: user?.nome || user?.email || 'default',
        createdAt: new Date().toISOString(),
        totals: {
          totalInitialBoxes,
          totalReplenishedBoxes,
          totalSalesBoxes,
          totalCurrentBalanceBoxes,
          statusCounts
        },
        productDetails: processedSkus.map(p => ({
          sku: p.sku,
          descricao: p.descricao,
          estoqueInicialCaixas: p.estoqueInicialCaixas,
          vendaCaixas: p.vendaCaixas,
          abastecimento: p.abastecimento,
          abastecimentoPaletes: p.abastecimentoPaletes,
          saldoPicking: p.saldoPicking,
          status: p.status
        }))
      };

      if (!querySnapshot.empty) {
        // Overwrite previous document
        const batch = writeBatch(db);
        querySnapshot.docs.forEach(d => {
          batch.delete(d.ref);
        });
        await batch.commit();
      }
      
      await addDoc(collection(db, 'analises_abastecimento_diario'), analysisDoc);
      showToast(`Análise de abastecimento para o dia ${selectedAnalysisDate} salva com sucesso!`, "success");
      
      // Sync history lists
      await fetchHistory();
      setIsHistoricalLoaded(true);
      setLoadedHistoryMeta({
        savedBy: user?.email || 'Sistema',
        savedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Erro ao salvar análise:", error);
      showToast("Não foi possível salvar a análise diária.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Delete saved document
  const handleDeleteAnalysis = async (id: string, dateStr: string) => {
    try {
      await deleteDoc(doc(db, 'analises_abastecimento_diario', id));
      showToast(`Análise salva do dia ${dateStr} excluída com sucesso.`, "success");
      await fetchHistory();
      if (selectedAnalysisDate === dateStr) {
        await loadAnalysisForDate(selectedAnalysisDate);
      }
    } catch (error) {
      console.error("Erro ao excluir documento:", error);
      showToast("Erro ao excluir do histórico.", "error");
    }
  };

  // Form value updater
  const handleUpdateValue = (sku: number, field: 'estoqueInicialCaixas' | 'vendaCaixas', value: number) => {
    setCustomProductData(prev => ({
      ...prev,
      [sku]: {
        ...prev[sku],
        [field]: isNaN(value) ? 0 : Math.max(0, value)
      }
    }));
  };

  // Reset fields utilities
  const handleResetSales = () => {
    setCustomProductData(prev => {
      const updated = { ...prev };
      productsList.forEach(p => {
        const current = updated[p.sku] || { estoqueInicialCaixas: p.estoqueInicialCaixas, vendaCaixas: p.vendaCaixas };
        updated[p.sku] = { ...current, vendaCaixas: 0 };
      });
      return updated;
    });
    showToast("Saídas diárias (020304) zeradas para edição!", "success");
  };

  const handleResetInitial = () => {
    setCustomProductData(prev => {
      const updated = { ...prev };
      productsList.forEach(p => {
        const current = updated[p.sku] || { estoqueInicialCaixas: p.estoqueInicialCaixas, vendaCaixas: p.vendaCaixas };
        updated[p.sku] = { ...current, estoqueInicialCaixas: 0 };
      });
      return updated;
    });
    showToast("Contagens iniciais (021101) zeradas para edição!", "success");
  };

  const handleRestoreDefaults = () => {
    const initial: Record<number, { estoqueInicialCaixas: number; vendaCaixas: number }> = {};
    ABASTECIMENTO_PRODUCTS_DATA.forEach(p => {
      initial[p.sku] = {
        estoqueInicialCaixas: p.estoqueInicialCaixas,
        vendaCaixas: p.vendaCaixas
      };
    });
    setProductsList(ABASTECIMENTO_PRODUCTS_DATA);
    setCustomProductData(initial);
    showToast("Valores padrões restaurados com sucesso!", "success");
  };

  const handleClear021101 = () => {
    setFileName021101('');
    setCustomProductData(prev => {
      const updated = { ...prev };
      productsList.forEach(p => {
        const current = updated[p.sku] || { estoqueInicialCaixas: p.estoqueInicialCaixas, vendaCaixas: p.vendaCaixas };
        updated[p.sku] = { ...current, estoqueInicialCaixas: 0 };
      });
      return updated;
    });
    showToast("Arquivo de Contagem Inicial desvinculado e valores zerados.", "success");
  };

  const handleClear020304 = () => {
    setFileName020304('');
    setCustomProductData(prev => {
      const updated = { ...prev };
      productsList.forEach(p => {
        const current = updated[p.sku] || { estoqueInicialCaixas: p.estoqueInicialCaixas, vendaCaixas: p.vendaCaixas };
        updated[p.sku] = { ...current, vendaCaixas: 0 };
      });
      return updated;
    });
    showToast("Arquivo de Saídas/Vendas desvinculado e valores zerados.", "success");
  };

  const handleImport021101 = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting021101(true);
    setFileName021101(file.name);

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (isExcel) {
      const xlsxReader = new FileReader();
      xlsxReader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

          const importedItems: Array<{ sku: number; descricao: string; embalagem: number; unidade: string; qtdPallet: number; estoqueInicialCaixas: number }> = [];
          let totalQty = 0;

          for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length < 10) continue;

            // Skip header if first row has string indicators
            if (i === 0) {
              const cellC = String(row[2] || '').toLowerCase();
              if (cellC.includes('produto') || cellC.includes('código') || cellC.includes('codigo') || cellC.includes('deposito')) {
                continue;
              }
            }

            const skuVal = parseInt(String(row[2] || '').trim(), 10);
            const descVal = String(row[3] || '').trim();
            const embVal = parseInt(String(row[4] || '').trim(), 10) || 1;
            const uniVal = String(row[5] || 'cx').trim();
            const palVal = parseInt(String(row[7] || '').trim(), 10) || 100;
            const qtyVal = parseInt(String(row[9] || '').trim().replace(/\s/g, '').replace(/\./g, ''), 10);

            if (!isNaN(skuVal) && !isNaN(qtyVal)) {
              importedItems.push({
                sku: skuVal,
                descricao: descVal || `PRODUTO ${skuVal}`,
                embalagem: embVal,
                unidade: uniVal,
                qtdPallet: palVal,
                estoqueInicialCaixas: qtyVal
              });
              totalQty += qtyVal;
            }
          }

          if (importedItems.length === 0) {
            showToast("Nenhum código de produto (SKU) válido encontrado nas colunas C e J da planilha de Contagem.", "error");
            setImporting021101(false);
            return;
          }

          // Merge data
          merge021101Data(importedItems);
          showToast(`Sucesso! Importados ${importedItems.length} SKUs da rotina 021101. Total inicial: ${totalQty} caixas.`, "success");
        } catch (err) {
          console.error("Erro ao ler planilha Excel 021101:", err);
          showToast("Erro ao processar planilha Excel da rotina 021101.", "error");
        } finally {
          setImporting021101(false);
          event.target.value = '';
        }
      };
      xlsxReader.readAsArrayBuffer(file);
      return;
    }

    // Default: text / csv parsing
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) {
          showToast("O arquivo está vazio.", "error");
          setImporting021101(false);
          return;
        }

        const lines = text.split('\n');
        const importedItems: Array<{ sku: number; descricao: string; embalagem: number; unidade: string; qtdPallet: number; estoqueInicialCaixas: number }> = [];
        let totalQty = 0;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          // Skip header row if it contains text like "Deposito" or "Produto"
          if (i === 0 && (line.toLowerCase().includes('deposito') || line.toLowerCase().includes('produto') || line.toLowerCase().includes('descricao'))) {
            continue;
          }

          let delimiter = ';';
          if (line.includes(';')) {
            delimiter = ';';
          } else if (line.includes(',')) {
            delimiter = ',';
          } else if (line.includes('\t')) {
            delimiter = '\t';
          }

          const parts = line.split(delimiter);
          if (parts.length < 10) continue;

          const skuRaw = parts[2]?.trim(); // Coluna C is index 2
          const descVal = parts[3]?.trim() || '';
          const embRaw = parts[4]?.trim();
          const uniVal = parts[5]?.trim() || 'cx';
          const palRaw = parts[7]?.trim();
          const qtyRaw = parts[9]?.trim(); // Coluna J is index 9

          if (!skuRaw || !qtyRaw) continue;

          const sku = parseInt(skuRaw, 10);
          const emb = parseInt(embRaw || '1', 10) || 1;
          const pal = parseInt(palRaw || '100', 10) || 100;
          const cleanQty = qtyRaw.replace(/\s/g, '').replace(/\./g, '');
          const qty = parseInt(cleanQty, 10);

          if (!isNaN(sku) && !isNaN(qty)) {
            importedItems.push({
              sku,
              descricao: descVal || `PRODUTO ${sku}`,
              embalagem: emb,
              unidade: uniVal,
              qtdPallet: pal,
              estoqueInicialCaixas: qty
            });
            totalQty += qty;
          }
        }

        if (importedItems.length === 0) {
          showToast("Nenhum código de produto ou quantidade válidos encontrados na Coluna C e J (Rotina 021101).", "error");
          setImporting021101(false);
          return;
        }

        merge021101Data(importedItems);
        showToast(`Sucesso! Importados ${importedItems.length} SKUs de Contagem Inicial. Total de estoque: ${totalQty} caixas.`, "success");
      } catch (err) {
        console.error("Erro ao ler arquivo 021101:", err);
        showToast("Erro ao processar o arquivo de importação 021101.", "error");
      } finally {
        setImporting021101(false);
        event.target.value = '';
      }
    };

    reader.onerror = () => {
      showToast("Erro ao ler o arquivo físico 021101.", "error");
      setImporting021101(false);
    };

    reader.readAsText(file, 'utf-8');
  };

  const merge021101Data = (importedItems: Array<{ sku: number; descricao: string; embalagem: number; unidade: string; qtdPallet: number; estoqueInicialCaixas: number }>) => {
    setProductsList(prevProducts => {
      const updatedProducts = [...prevProducts];
      importedItems.forEach(item => {
        const existingIdx = updatedProducts.findIndex(p => p.sku === item.sku);
        if (existingIdx !== -1) {
          updatedProducts[existingIdx] = {
            ...updatedProducts[existingIdx],
            descricao: item.descricao || updatedProducts[existingIdx].descricao,
            embalagem: item.embalagem || updatedProducts[existingIdx].embalagem,
            unidade: item.unidade || updatedProducts[existingIdx].unidade,
            qtdPallet: item.qtdPallet || updatedProducts[existingIdx].qtdPallet,
          };
        } else {
          updatedProducts.push({
            sku: item.sku,
            descricao: item.descricao || `PRODUTO ${item.sku}`,
            unidade: item.unidade,
            embalagem: item.embalagem,
            qtdPallet: item.qtdPallet,
            estoqueInicialCaixas: item.estoqueInicialCaixas,
            vendaCaixas: 0
          });
        }
      });
      return updatedProducts;
    });

    setCustomProductData(prevCustom => {
      const updatedCustom = { ...prevCustom };
      importedItems.forEach(item => {
        updatedCustom[item.sku] = {
          estoqueInicialCaixas: item.estoqueInicialCaixas,
          vendaCaixas: prevCustom[item.sku]?.vendaCaixas || 0
        };
      });
      return updatedCustom;
    });
  };

  const handleImport020304 = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting020304(true);
    setFileName020304(file.name);

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (isExcel) {
      const xlsxReader = new FileReader();
      xlsxReader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

          const importedItems: Array<{ sku: number; descricao: string; unidade: string; vendaCaixas: number }> = [];
          let totalSales = 0;

          for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length < 10) continue;

            // Skip header if first row has string indicators
            if (i === 0) {
              const cellB = String(row[1] || '').toLowerCase();
              if (cellB.includes('cod') || cellB.includes('produto') || cellB.includes('grade')) {
                continue;
              }
            }

            const skuVal = parseInt(String(row[1] || '').trim(), 10);
            const descVal = String(row[2] || '').trim();
            const uniVal = String(row[3] || 'cx').trim();
            const qtyVal = parseInt(String(row[9] || '').trim().replace(/\s/g, '').replace(/\./g, ''), 10);

            if (!isNaN(skuVal) && !isNaN(qtyVal)) {
              importedItems.push({
                sku: skuVal,
                descricao: descVal || `PRODUTO ${skuVal}`,
                unidade: uniVal,
                vendaCaixas: qtyVal
              });
              totalSales += qtyVal;
            }
          }

          if (importedItems.length === 0) {
            showToast("Nenhum código de produto (SKU) válido encontrado nas colunas B e J da planilha de Saídas.", "error");
            setImporting020304(false);
            return;
          }

          // Merge data
          merge020304Data(importedItems);
          showToast(`Sucesso! Importados ${importedItems.length} SKUs da rotina 020304. Total de saídas: ${totalSales} caixas.`, "success");
        } catch (err) {
          console.error("Erro ao ler planilha Excel 020304:", err);
          showToast("Erro ao processar planilha Excel da rotina 020304.", "error");
        } finally {
          setImporting020304(false);
          event.target.value = '';
        }
      };
      xlsxReader.readAsArrayBuffer(file);
      return;
    }

    // Default: text / csv parsing
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) {
          showToast("O arquivo está vazio.", "error");
          setImporting020304(false);
          return;
        }

        const lines = text.split('\n');
        const importedItems: Array<{ sku: number; descricao: string; unidade: string; vendaCaixas: number }> = [];
        let totalSales = 0;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          // Skip header row if it contains text like "Grade" or "Cod" or "Saidas"
          if (i === 0 && (line.toLowerCase().includes('grade') || line.toLowerCase().includes('cod') || line.toLowerCase().includes('saidas'))) {
            continue;
          }

          let delimiter = ';';
          if (line.includes(';')) {
            delimiter = ';';
          } else if (line.includes(',')) {
            delimiter = ',';
          } else if (line.includes('\t')) {
            delimiter = '\t';
          }

          const parts = line.split(delimiter);
          if (parts.length < 10) continue;

          const skuRaw = parts[1]?.trim(); // Coluna B is index 1
          const descVal = parts[2]?.trim() || '';
          const uniVal = parts[3]?.trim() || 'cx';
          const qtyRaw = parts[9]?.trim(); // Coluna J is index 9

          if (!skuRaw || !qtyRaw) continue;

          const sku = parseInt(skuRaw, 10);
          const cleanQty = qtyRaw.replace(/\s/g, '').replace(/\./g, '');
          const qty = parseInt(cleanQty, 10);

          if (!isNaN(sku) && !isNaN(qty)) {
            importedItems.push({
              sku,
              descricao: descVal || `PRODUTO ${sku}`,
              unidade: uniVal,
              vendaCaixas: qty
            });
            totalSales += qty;
          }
        }

        if (importedItems.length === 0) {
          showToast("Nenhum código de produto ou quantidade válidos encontrados na Coluna B e J (Rotina 020304).", "error");
          setImporting020304(false);
          return;
        }

        merge020304Data(importedItems);
        showToast(`Sucesso! Importados ${importedItems.length} SKUs de Saídas/Vendas. Total de saídas: ${totalSales} caixas.`, "success");
      } catch (err) {
        console.error("Erro ao ler arquivo 020304:", err);
        showToast("Erro ao processar o arquivo de importação 020304.", "error");
      } finally {
        setImporting020304(false);
        event.target.value = '';
      }
    };

    reader.onerror = () => {
      showToast("Erro ao ler o arquivo físico 020304.", "error");
      setImporting020304(false);
    };

    reader.readAsText(file, 'utf-8');
  };

  const merge020304Data = (importedItems: Array<{ sku: number; descricao: string; unidade?: string; vendaCaixas: number }>) => {
    setProductsList(prevProducts => {
      const updatedProducts = [...prevProducts];
      importedItems.forEach(item => {
        const existingIdx = updatedProducts.findIndex(p => p.sku === item.sku);
        if (existingIdx !== -1) {
          updatedProducts[existingIdx] = {
            ...updatedProducts[existingIdx],
            descricao: item.descricao || updatedProducts[existingIdx].descricao,
            unidade: item.unidade || updatedProducts[existingIdx].unidade,
          };
        } else {
          updatedProducts.push({
            sku: item.sku,
            descricao: item.descricao || `PRODUTO ${item.sku}`,
            unidade: item.unidade || 'cx',
            embalagem: 1,
            qtdPallet: 100,
            estoqueInicialCaixas: 0,
            vendaCaixas: item.vendaCaixas
          });
        }
      });
      return updatedProducts;
    });

    setCustomProductData(prevCustom => {
      const updatedCustom = { ...prevCustom };
      importedItems.forEach(item => {
        updatedCustom[item.sku] = {
          estoqueInicialCaixas: prevCustom[item.sku]?.estoqueInicialCaixas || 0,
          vendaCaixas: item.vendaCaixas
        };
      });
      return updatedCustom;
    });
  };

  return (
    <div className="flex flex-col gap-6 relative">
      
      {/* DUAL SUB-TABS SELECTOR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-2 sm:pb-0.5 gap-2">
        <div className="flex gap-2">
          <button 
            onClick={() => setActivePanel('analise')}
            className={`px-4 py-2 font-sans font-black text-xs uppercase tracking-wider transition-all border-b-2 cursor-pointer ${activePanel === 'analise' ? 'border-amber-500 text-amber-600 font-black' : 'border-transparent text-slate-500 hover:text-slate-800 bg-transparent'}`}
          >
            Análise Ativa do Dia
          </button>
          <button 
            onClick={() => setActivePanel('historico')}
            className={`px-4 py-2 font-sans font-black text-xs uppercase tracking-wider transition-all border-b-2 cursor-pointer ${activePanel === 'historico' ? 'border-amber-500 text-amber-600 font-black' : 'border-transparent text-slate-500 hover:text-slate-800 bg-transparent'}`}
          >
            Histórico de Consultas ({savedAnalyses.length})
          </button>
        </div>
        
        <div className="flex items-center flex-wrap gap-2">
          <button 
            onClick={handleExportExcel}
            className="px-2.5 py-1 bg-white hover:bg-slate-50 text-emerald-700 border border-slate-200 font-sans font-black text-[10px] uppercase tracking-wider rounded-lg transition-all shadow-3xs flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            Excel
          </button>
          <button 
            onClick={handleExportNightExcel}
            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-sans font-black text-[10px] uppercase tracking-wider rounded-lg transition-all shadow-3xs flex items-center gap-1.5 cursor-pointer border border-indigo-200"
            title="Exportar apenas itens com necessidade de abastecimento noturno"
          >
            <Moon className="w-3.5 h-3.5 text-indigo-500 fill-indigo-500/15" />
            Excel Noturno
          </button>

          {/* Date Selector Quick Integration */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
            <input 
              type="date"
              value={selectedAnalysisDate}
              onChange={(e) => {
                setSelectedAnalysisDate(e.target.value);
                setActivePanel('analise');
              }}
              className="bg-transparent border-none text-[10px] font-black font-mono text-slate-800 focus:outline-none p-0.5 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* TOAST SYSTEM */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 p-4 rounded-xl shadow-lg border text-white ${toast.type === 'success' ? 'bg-slate-900 border-slate-800' : 'bg-rose-950 border-rose-900'}`}
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-red-400" />}
            <span className="font-sans text-xs font-bold">{toast.message}</span>
            <button onClick={() => setToast(null)} className="p-1 hover:bg-white/10 rounded text-white/60 hover:text-white bg-transparent border-none cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {activePanel === 'historico' ? (
        /* HISTORIC LOGS LIST VIEW */
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-sans font-black text-sm uppercase text-slate-800 flex items-center gap-2">
                <History className="w-4 h-4 text-amber-500" />
                Histórico de Análises Salvas
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">
                Consulte análises de abastecimento diário registradas em datas anteriores.
              </p>
            </div>
            <button 
              onClick={fetchHistory}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-all border-none bg-transparent cursor-pointer"
              title="Sincronizar histórico"
            >
              <RefreshCw className={`w-4 h-4 ${loadingHistory ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loadingHistory ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
              <span className="text-xs font-mono">Carregando histórico do banco de dados...</span>
            </div>
          ) : savedAnalyses.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-3 bg-slate-50">
              <Database className="w-10 h-10 text-slate-300" />
              <div>
                <p className="text-xs font-black uppercase text-slate-600">Nenhum registro encontrado</p>
                <p className="text-[10px] text-slate-400 mt-1">Preencha os valores na aba de análise ativa e clique em salvar para registrar no histórico.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedAnalyses.map((item, idx) => (
                <div key={idx} className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition-all flex flex-col justify-between gap-3 bg-slate-50 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-1">
                    <span className="text-[8px] font-mono bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-black">
                      SALVO
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-amber-600">
                      <Calendar className="w-4 h-4" />
                      <span className="font-mono font-black text-sm">{item.dataAnalise}</span>
                    </div>
                    <div className="mt-2 space-y-1 text-[10px] text-slate-500">
                      <p className="flex justify-between">
                        <span>Contagem Inicial (021101):</span>
                        <strong className="text-slate-700 font-mono">{(item.totals?.totalInitialBoxes ?? 0).toLocaleString()} cx</strong>
                      </p>
                      <p className="flex justify-between">
                        <span>Abastecido (07h às 19h):</span>
                        <strong className="text-emerald-600 font-mono">{(item.totals?.totalReplenishedBoxes ?? 0).toLocaleString()} cx</strong>
                      </p>
                      <p className="flex justify-between">
                        <span>Venda Saída (020304):</span>
                        <strong className="text-blue-600 font-mono">{(item.totals?.totalSalesBoxes ?? 0).toLocaleString()} cx</strong>
                      </p>
                      <p className="flex justify-between border-t border-slate-200/60 pt-1 mt-1 font-bold">
                        <span>Saldo Final:</span>
                        <span className={`font-mono ${(item.totals?.totalCurrentBalanceBoxes ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {(item.totals?.totalCurrentBalanceBoxes ?? 0).toLocaleString()} cx
                        </span>
                      </p>
                    </div>

                    <div className="flex gap-1 mt-2.5 text-[8px] text-center font-bold">
                      <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-1.5 py-0.5 rounded flex-1">
                        OK: {item.totals?.statusCounts?.ok ?? 0}
                      </span>
                      <span className="bg-amber-50 text-amber-600 border border-amber-100 px-1.5 py-0.5 rounded flex-1">
                        AT: {item.totals?.statusCounts?.attention ?? 0}
                      </span>
                      <span className="bg-red-50 text-red-500 border border-red-100 px-1.5 py-0.5 rounded flex-1">
                        CR: {item.totals?.statusCounts?.critical ?? 0}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 mt-1">
                    <span className="text-[8px] text-slate-400 font-medium truncate max-w-[120px]" title={item.usuarioEmail}>
                      Por: {item.usuarioNome || item.usuarioEmail || 'Sistema'}
                    </span>
                    <div className="flex gap-1.5">
                      <button 
                        onClick={() => {
                          setSelectedAnalysisDate(item.dataAnalise);
                          setActivePanel('analise');
                        }}
                        className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-sans font-black text-[9px] uppercase tracking-wider rounded-lg transition-all cursor-pointer border-none flex items-center gap-1"
                      >
                        <FileText className="w-3 h-3" />
                        Carregar
                      </button>
                      <button 
                        onClick={() => handleDeleteAnalysis(item.id, item.dataAnalise)}
                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer border-none bg-transparent"
                        title="Excluir do histórico"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ACTIVE DIARY CHECK / PANEL VIEW */
        <>
          {/* ANALYSIS CONTROLS TOOLBAR */}
          <div className="p-4 bg-white text-slate-800 border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500 text-white rounded-xl">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider block">Análise & Lançamentos</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-black text-slate-800 font-mono">{selectedAnalysisDate}</span>
                  {isHistoricalLoaded ? (
                    <span className="text-[8px] bg-emerald-100 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-black tracking-wider uppercase animate-pulse">
                      REGISTRO SALVO EM BANCO
                    </span>
                  ) : (
                    <span className="text-[8px] bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-black tracking-wider uppercase">
                      VERSÃO DE RASCUNHO
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button 
                onClick={handleSaveAnalysis}
                disabled={saving}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-sans font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer border-none flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                {saving ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5 text-white" />
                )}
                Salvar Análise do Dia
              </button>
            </div>
          </div>



          {/* QUICK EDIT ACTIONS PANEL */}
          {isEditMode && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative p-5 bg-white border border-slate-200 rounded-2xl flex flex-col gap-5 shadow-xs overflow-hidden"
            >
              {/* Top Accent Gradient Bar representing both routines */}
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-500 to-emerald-500" />
              
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 bg-indigo-50/60 text-indigo-600 rounded-lg border border-indigo-100 shrink-0">
                    <SlidersHorizontal className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800 block">Atalhos Operacionais & Importações</span>
                    <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Gerencie os valores de estoque inicial e saídas rapidamente via arquivos ou atalhos</span>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  <button 
                    onClick={handleResetInitial}
                    className="px-3 py-1.5 bg-amber-50/50 hover:bg-amber-100/70 text-amber-800 border border-amber-200/50 rounded-lg text-[9.5px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-3xs"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-amber-600" />
                    Zerar Inicial (021101)
                  </button>
                  <button 
                    onClick={handleResetSales}
                    className="px-3 py-1.5 bg-emerald-50/50 hover:bg-emerald-100/70 text-emerald-800 border border-emerald-200/50 rounded-lg text-[9.5px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-3xs"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-emerald-600" />
                    Zerar Saídas (020304)
                  </button>
                  <button 
                    onClick={handleRestoreDefaults}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-lg text-[9.5px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-3xs"
                  >
                    <Undo className="w-3.5 h-3.5 text-slate-600" />
                    Restaurar Padrão
                  </button>
                </div>
              </div>

              {/* INTEGRATED FILE IMPORT BENTO CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* ROTINA 021101 (CONTAGEM INICIAL) */}
                <div className="relative bg-slate-50/40 border border-slate-200/60 hover:border-amber-200/70 rounded-xl p-5 flex flex-col justify-between gap-4 shadow-3xs transition-all duration-200 group overflow-hidden">
                  <div className="absolute top-0 left-0 bottom-0 w-[3px] bg-amber-500 rounded-l-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-100 shrink-0 shadow-3xs">
                      <FileSpreadsheet className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[11.5px] font-extrabold uppercase tracking-tight text-slate-800 block">Importar Estoque Inicial (021101)</span>
                      <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-1">
                        Carregue o inventário de picking em formato <strong className="text-slate-600">.csv, .txt ou .xlsx</strong> para preencher o estoque inicial.
                      </p>
                      
                      {/* Column specs badges */}
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        <span className="inline-flex items-center gap-1 bg-slate-100/80 border border-slate-200 text-slate-600 text-[8.5px] font-bold px-2 py-0.5 rounded-md font-mono">
                          Col C = SKU
                        </span>
                        <span className="inline-flex items-center gap-1 bg-slate-100/80 border border-slate-200 text-slate-600 text-[8.5px] font-bold px-2 py-0.5 rounded-md font-mono">
                          Col D = Descrição
                        </span>
                        <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200/60 text-amber-800 text-[8.5px] font-bold px-2 py-0.5 rounded-md font-mono">
                          Col J = Qtd Estoque
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {fileName021101 ? (
                    <div className="flex items-center justify-between bg-amber-50/30 border border-amber-200/40 rounded-xl px-3 py-2 mt-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="text-[10px] text-amber-900 font-mono font-bold truncate" title={fileName021101}>
                          {fileName021101}
                        </span>
                      </div>
                      <button 
                        onClick={handleClear021101}
                        className="p-1 bg-amber-100/50 hover:bg-amber-100 text-amber-900 rounded-md transition-colors cursor-pointer border-none"
                        title="Remover arquivo e zerar valores"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="mt-1">
                      <label className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-sans font-black text-[9.5px] uppercase tracking-wider rounded-lg transition-all cursor-pointer shadow-3xs text-center border-none">
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        {importing021101 ? 'Processando...' : 'Selecionar Planilha 021101'}
                        <input 
                          type="file"
                          accept=".csv,.txt,.xlsx,.xls"
                          onChange={handleImport021101}
                          className="hidden"
                          disabled={importing021101}
                        />
                      </label>
                    </div>
                  )}
                </div>

                {/* ROTINA 020304 (SAÍDAS / VENDAS) */}
                <div className="relative bg-slate-50/40 border border-slate-200/60 hover:border-emerald-200/70 rounded-xl p-5 flex flex-col justify-between gap-4 shadow-3xs transition-all duration-200 group overflow-hidden">
                  <div className="absolute top-0 left-0 bottom-0 w-[3px] bg-emerald-500 rounded-l-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 shrink-0 shadow-3xs">
                      <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[11.5px] font-extrabold uppercase tracking-tight text-slate-800 block">Importar Saídas / Vendas (020304)</span>
                      <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-1">
                        Carregue o relatório de vendas/saídas diárias em formato <strong className="text-slate-600">.csv, .txt ou .xlsx</strong> para preencher as saídas.
                      </p>
                      
                      {/* Column specs badges */}
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        <span className="inline-flex items-center gap-1 bg-slate-100/80 border border-slate-200 text-slate-600 text-[8.5px] font-bold px-2 py-0.5 rounded-md font-mono">
                          Col B = SKU
                        </span>
                        <span className="inline-flex items-center gap-1 bg-slate-100/80 border border-slate-200 text-slate-600 text-[8.5px] font-bold px-2 py-0.5 rounded-md font-mono">
                          Col C = Descrição
                        </span>
                        <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200/60 text-emerald-800 text-[8.5px] font-bold px-2 py-0.5 rounded-md font-mono">
                          Col J = Qtd Saídas
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {fileName020304 ? (
                    <div className="flex items-center justify-between bg-emerald-50/30 border border-emerald-200/40 rounded-xl px-3 py-2 mt-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="text-[10px] text-emerald-900 font-mono font-bold truncate" title={fileName020304}>
                          {fileName020304}
                        </span>
                      </div>
                      <button 
                        onClick={handleClear020304}
                        className="p-1 bg-emerald-100/50 hover:bg-emerald-100 text-emerald-900 rounded-md transition-colors cursor-pointer border-none"
                        title="Remover arquivo e zerar valores"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="mt-1">
                      <label className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-sans font-black text-[9.5px] uppercase tracking-wider rounded-lg transition-all cursor-pointer shadow-3xs text-center border-none">
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        {importing020304 ? 'Processando...' : 'Selecionar Planilha 020304'}
                        <input 
                          type="file"
                          accept=".csv,.txt,.xlsx,.xls"
                          onChange={handleImport020304}
                          className="hidden"
                          disabled={importing020304}
                        />
                      </label>
                    </div>
                  )}
                </div>

              </div>
            </motion.div>
          )}

          {/* PROCESS SECTIONS CARDS GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            
            {/* PROCESS 1: CONTAGEM INICIAL */}
            <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl flex flex-col gap-4 relative shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[8px] font-mono font-black uppercase rounded-md">
                    Processo 1 • Rotina 021101
                  </span>
                  <h3 className="text-xs font-sans font-black uppercase tracking-wider text-slate-800 mt-1">
                    Contagem Inicial (Turno Diurno)
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    Inventário físico realizado pelo conferente antes do início da operação.
                  </p>
                </div>
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-200/50">
                  <Clock className="w-5 h-5" />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 bg-white p-3 rounded-xl border border-slate-200/60 shadow-inner">
                <div className="flex flex-col">
                  <span className="text-[9px] tracking-wider text-slate-500 font-bold uppercase">SKUs</span>
                  <span className="text-xl font-black font-mono text-slate-800">{totalSkusChecked}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] tracking-wider text-slate-500 font-bold uppercase">Caixas</span>
                  <span className="text-xl font-black font-mono text-slate-800">{totalInitialBoxes.toLocaleString()}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] tracking-wider text-slate-500 font-bold uppercase">Paletes</span>
                  <span className="text-xl font-black font-mono text-slate-800">{totalInitialPallets.toLocaleString()} <span className="text-[10px] font-bold text-slate-400 font-sans">PL</span></span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] tracking-wider text-amber-600 font-bold uppercase">Hectolitros</span>
                  <span className="text-xl font-black font-mono text-amber-700">{totalInitialHecto.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span className="text-[10px] font-bold text-amber-500 font-sans">HL</span></span>
                </div>
              </div>

              <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1 bg-amber-50/50 p-2 rounded-lg border border-amber-100">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>GILSON ROSA DA SILVA em</span>
                <span className="font-mono text-[9px] font-bold text-slate-600">06:15 AM (Diurno)</span>
              </div>
            </div>

            {/* PROCESS 2: ABASTECIMENTO COMERCIAL */}
            <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl flex flex-col gap-4 relative shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[8px] font-mono font-black uppercase rounded-md">
                    Processo 2 • Operador Empilhadeira
                  </span>
                  <h3 className="text-xs font-sans font-black uppercase tracking-wider text-slate-800 mt-1">
                    Abastecimento Comercial Diurno
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    Monitoramento de reabastecimentos realizados exclusivamente de <strong className="text-slate-700">07:00 às 19:00</strong>.
                  </p>
                </div>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-200/50">
                  <Truck className="w-5 h-5" />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 bg-white p-3 rounded-xl border border-slate-200/60 shadow-inner">
                <div className="flex flex-col">
                  <span className="text-[9px] tracking-wider text-slate-500 font-bold uppercase">Abastecidos</span>
                  <span className="text-xl font-black font-mono text-emerald-600">
                    {totalSkusReplenished || 0} <span className="text-[10px] font-bold text-emerald-500 font-sans">SKUs</span>
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] tracking-wider text-slate-500 font-bold uppercase">Caixas</span>
                  <span className="text-xl font-black font-mono text-emerald-600">
                    {totalReplenishedBoxes.toLocaleString()}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] tracking-wider text-slate-500 font-bold uppercase">Paletes</span>
                  <span className="text-xl font-black font-mono text-emerald-600">
                    {totalReplenishedPallets.toLocaleString()} <span className="text-[10px] font-bold text-emerald-500 font-sans">PL</span>
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] tracking-wider text-emerald-700 font-bold uppercase">Hectolitros</span>
                  <span className="text-xl font-black font-mono text-emerald-600">
                    {totalReplenishedHecto.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span className="text-[10px] font-bold text-emerald-500 font-sans">HL</span>
                  </span>
                </div>
              </div>

              <div className="text-[10px] text-slate-500 font-medium flex items-center justify-between bg-emerald-50/50 p-2 rounded-lg border border-emerald-100">
                <div className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                  <span>{activeOperators} Operadores Ativos</span>
                </div>
                {replenishmentMap.excludedCount > 0 && (
                  <span className="text-[8px] text-red-500 font-bold uppercase bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                    -{replenishmentMap.excludedCount} fora do horário
                  </span>
                )}
              </div>
            </div>

            {/* PROCESS 3: COMPARATIVO & COBERTURA */}
            <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl flex flex-col gap-4 relative shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[8px] font-mono font-black uppercase rounded-md">
                    Processo 3 • Rotina 020304
                  </span>
                  <h3 className="text-xs font-sans font-black uppercase tracking-wider text-slate-800 mt-1">
                    Comparativo de Cobertura
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    Comparação entre o estoque disponível (Inicial + Abastecido) vs. Vendas.
                  </p>
                </div>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-200/50">
                  <Package className="w-5 h-5" />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 bg-white p-3 rounded-xl border border-slate-200/60 shadow-inner">
                <div className="flex flex-col">
                  <span className="text-[9px] tracking-wider text-slate-500 font-bold uppercase">Venda Diária</span>
                  <span className="text-xl font-black font-mono text-blue-600">
                    {totalSalesBoxes.toLocaleString()} <span className="text-[10px] font-bold text-blue-400 font-sans">cx</span>
                  </span>
                  <span className="text-[8px] font-mono text-blue-500 font-bold">{totalSalesHecto.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} HL</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] tracking-wider text-slate-500 font-bold uppercase">Saldo Picking</span>
                  <span className={`text-xl font-black font-mono ${totalCurrentBalanceBoxes >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {totalCurrentBalanceBoxes.toLocaleString()} <span className="text-[10px] font-bold font-sans opacity-70">cx</span>
                  </span>
                  <span className="text-[8px] font-mono text-slate-500 font-bold">{totalCurrentBalanceHecto.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} HL</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] tracking-wider text-slate-500 font-bold uppercase">Suficiência</span>
                  <span className="text-xl font-black font-mono text-indigo-600">
                    {totalSalesBoxes > 0 ? `${Math.round((totalInitialBoxes + totalReplenishedBoxes) / totalSalesBoxes * 100)}%` : '0%'}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] tracking-wider text-indigo-600 font-bold uppercase">Vol. Total</span>
                  <span className="text-xl font-black font-mono text-indigo-700">
                    {(totalInitialHecto + totalReplenishedHecto).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span className="text-[10px] font-bold font-sans">HL</span>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5 text-[11px] text-center font-extrabold uppercase">
                <div className="bg-emerald-50 text-emerald-700 py-2 px-1 rounded-xl border border-emerald-150 flex items-center justify-center gap-1.5">
                  <span>OK</span>
                  <span className="font-mono bg-emerald-600 text-white w-4.5 h-4.5 rounded-full text-[9px] flex items-center justify-center font-black">{statusCounts.ok}</span>
                </div>
                <div className="bg-amber-50 text-amber-700 py-2 px-1 rounded-xl border border-amber-150 flex items-center justify-center gap-1.5">
                  <span>Atenção</span>
                  <span className="font-mono bg-amber-500 text-white w-4.5 h-4.5 rounded-full text-[9px] flex items-center justify-center font-black">{statusCounts.attention}</span>
                </div>
                <div className="bg-red-50 text-red-600 py-2 px-1 rounded-xl border border-red-150 flex items-center justify-center gap-1.5">
                  <span>Crítico</span>
                  <span className="font-mono bg-red-500 text-white w-4.5 h-4.5 rounded-full text-[9px] flex items-center justify-center font-black">{statusCounts.critical}</span>
                </div>
              </div>

              {skusSemEstoqueInicialComVenda.length > 0 && (
                <button 
                  onClick={() => setStatusFilter('no_picking_sales')}
                  className="w-full bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 p-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Sem Inicial c/ Venda
                  </span>
                  <span className="bg-amber-600 text-white px-2 py-0.5 rounded-full font-mono text-[9px] font-black">
                    {skusSemEstoqueInicialComVenda.length} SKUs
                  </span>
                </button>
              )}
            </div>

          </div>

          {/* CHARTS SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* CHART 1: REPLENISHMENTS BY HOUR */}
            <div className="lg:col-span-7 bg-white border border-slate-200 p-5 rounded-2xl flex flex-col gap-3 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs uppercase font-black text-slate-700 tracking-wider flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    Volume de Abastecimento por Horário (Diurno 07h - 19h)
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase block font-bold mt-0.5">
                    Detalhamento de caixas reabastecidas para auditoria de produtividade diurna
                  </span>
                </div>
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-[9px] uppercase font-black text-slate-400">Total Reabastecido</span>
                  <span className="text-xs font-black font-mono text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                    {totalReplenishedBoxes.toLocaleString('pt-BR')} CX
                  </span>
                </div>
              </div>
              
              <div className="h-80 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyChartData} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="hour" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl text-white shadow-xl">
                              <p className="font-extrabold text-xs text-amber-400 mb-1">Horário: {label}</p>
                              <p className="text-[11px] font-bold text-slate-200">
                                Reabastecimento: <span className="font-black text-amber-400">{data.caixas.toLocaleString('pt-BR')} caixas</span>
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="caixas" radius={[4, 4, 0, 0]}>
                      {hourlyChartData.map((entry, index) => {
                        const isLunch = entry.hour === '12h';
                        return <Cell key={`cell-${index}`} fill={isLunch ? '#94a3b8' : '#032b5e'} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* CHART 2: TOP 10 REPLENISHED PRODUCTS */}
            <div className="lg:col-span-5 bg-white border border-slate-200 p-5 rounded-2xl flex flex-col gap-3 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs uppercase font-black text-slate-700 tracking-wider flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    Top 10 Produtos Mais Reabastecidos
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase block font-bold mt-0.5">
                    Produtos que mais demandaram intervenção operativa do empilhador hoje
                  </span>
                </div>
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-[9px] uppercase font-black text-slate-400">SKUs Reabastecidos</span>
                  <span className="text-xs font-black font-mono text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                    {totalSkusReplenished} SKUs
                  </span>
                </div>
              </div>

              <div className="h-80 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={topProductsChartData} 
                    layout="vertical"
                    margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={9} width={130} tickLine={false} />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl text-white shadow-xl max-w-xs">
                              <p className="font-extrabold text-xs text-emerald-400 mb-0.5">#{data.sku} - {data.fullName || data.name}</p>
                              <p className="text-[11px] font-bold text-slate-200">
                                Reabastecido Hoje: <span className="font-black text-emerald-400">{data.caixas.toLocaleString('pt-BR')} caixas</span>
                              </p>
                              {data.paletes !== undefined && (
                                <p className="text-[10px] text-slate-400 font-medium">
                                  Equivalente: {data.paletes} palete(s)
                                </p>
                              )}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="caixas" fill="#10b981" radius={[0, 4, 4, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* COMPREHENSIVE STATUS TABLE */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-4 shadow-sm">
            
            {/* ALERT BANNER: SKUs without Picking Stock that had Sales Output */}
            {skusSemEstoqueInicialComVenda.length > 0 && (
              <div className="p-4 bg-gradient-to-r from-amber-50 via-rose-50 to-amber-50 border-2 border-amber-300 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
                <div className="flex items-start md:items-center gap-3">
                  <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-sm flex-shrink-0">
                    <AlertTriangle className="w-6 h-6 animate-pulse" />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-amber-950">
                        Alerta Operacional: Venda sem Estoque no Picking
                      </span>
                      <span className="px-2 py-0.5 bg-amber-200 text-amber-950 font-mono font-black text-[9px] rounded-full uppercase">
                        {skusSemEstoqueInicialComVenda.length} SKUs Afetados
                      </span>
                    </div>
                    <p className="text-[11px] font-medium text-slate-700 mt-0.5">
                      Estes produtos tiveram <strong className="text-blue-700">saída de venda registrada (Rotina 020304)</strong>, mas estavam com <strong className="text-amber-900">Zero Estoque na Contagem Inicial do Picking</strong> (Rotina 021101). Desses, <strong className="text-rose-700">{skusRupturaTotalPicking.length} SKUs</strong> continuam sem nenhum abastecimento no dia (Ruptura Total).
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setStatusFilter('no_picking_sales')}
                    className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all border cursor-pointer flex items-center gap-1.5 ${
                      statusFilter === 'no_picking_sales'
                        ? 'bg-amber-600 text-white border-amber-700 shadow-md'
                        : 'bg-white text-amber-900 border-amber-300 hover:bg-amber-100'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Sem Inicial ({skusSemEstoqueInicialComVenda.length})
                  </button>
                  {skusRupturaTotalPicking.length > 0 && (
                    <button
                      onClick={() => setStatusFilter('total_rupture')}
                      className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all border cursor-pointer flex items-center gap-1.5 ${
                        statusFilter === 'total_rupture'
                          ? 'bg-rose-600 text-white border-rose-700 shadow-md'
                          : 'bg-white text-rose-900 border-rose-300 hover:bg-rose-100'
                      }`}
                    >
                      <AlertOctagon className="w-3.5 h-3.5" />
                      Ruptura Total ({skusRupturaTotalPicking.length})
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Table Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/60">
              
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar SKU ou descrição de produto..."
                    className="w-full pl-9 pr-4 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium placeholder-slate-400"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                
                <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200">
                  <button 
                    onClick={() => setStatusFilter('all')}
                    className={`px-2 py-1 text-[9px] font-black uppercase tracking-wider rounded-md cursor-pointer border-none transition-all ${statusFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-800 bg-transparent'}`}
                  >
                    Todos ({processedSkus.length})
                  </button>
                  <button 
                    onClick={() => setStatusFilter('ok')}
                    className={`px-2 py-1 text-[9px] font-black uppercase tracking-wider rounded-md cursor-pointer border-none transition-all ${statusFilter === 'ok' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-800 bg-transparent'}`}
                  >
                    OK ({statusCounts.ok})
                  </button>
                  <button 
                    onClick={() => setStatusFilter('attention')}
                    className={`px-2 py-1 text-[9px] font-black uppercase tracking-wider rounded-md cursor-pointer border-none transition-all ${statusFilter === 'attention' ? 'bg-amber-500 text-white' : 'text-slate-500 hover:text-slate-800 bg-transparent'}`}
                  >
                    Atenção ({statusCounts.attention})
                  </button>
                  <button 
                    onClick={() => setStatusFilter('critical')}
                    className={`px-2 py-1 text-[9px] font-black uppercase tracking-wider rounded-md cursor-pointer border-none transition-all ${statusFilter === 'critical' ? 'bg-red-500 text-white' : 'text-slate-500 hover:text-slate-800 bg-transparent'}`}
                  >
                    Crítico ({statusCounts.critical})
                  </button>
                  <button 
                    onClick={() => setStatusFilter('night_need')}
                    className={`px-2 py-1 text-[9px] font-black uppercase tracking-wider rounded-md cursor-pointer border-none transition-all flex items-center gap-1 ${statusFilter === 'night_need' ? 'bg-indigo-600 text-white font-black shadow-sm' : 'text-indigo-600 hover:bg-indigo-50 bg-transparent'}`}
                    title="Exibir apenas SKUs que precisam de abastecimento para a noite"
                  >
                    <Moon className="w-2.5 h-2.5" />
                    Abastar à Noite ({totalSkusNightReplenish})
                  </button>
                  <button 
                    onClick={() => setStatusFilter('no_picking_sales')}
                    className={`px-2 py-1 text-[9px] font-black uppercase tracking-wider rounded-md cursor-pointer border-none transition-all flex items-center gap-1 ${statusFilter === 'no_picking_sales' ? 'bg-amber-600 text-white font-black shadow-sm' : 'text-amber-800 hover:bg-amber-50 bg-transparent'}`}
                    title="Produtos sem estoque inicial no picking que tiveram vendas"
                  >
                    <AlertTriangle className="w-2.5 h-2.5" />
                    Sem Inicial ({skusSemEstoqueInicialComVenda.length})
                  </button>
                  <button 
                    onClick={() => setStatusFilter('total_rupture')}
                    className={`px-2 py-1 text-[9px] font-black uppercase tracking-wider rounded-md cursor-pointer border-none transition-all flex items-center gap-1 ${statusFilter === 'total_rupture' ? 'bg-rose-600 text-white font-black shadow-sm' : 'text-rose-700 hover:bg-rose-50 bg-transparent'}`}
                    title="Produtos sem estoque e sem abastecimento com vendas (Ruptura Total)"
                  >
                    <AlertOctagon className="w-2.5 h-2.5" />
                    Ruptura Total ({skusRupturaTotalPicking.length})
                  </button>
                </div>

                <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                  <span className="text-slate-400 font-bold">Cálculo Noite:</span>
                  <select 
                    value={nightStrategy}
                    onChange={(e) => setNightStrategy(e.target.value as any)}
                    className="bg-transparent border-none text-[9px] font-black text-slate-700 focus:outline-none cursor-pointer uppercase py-0"
                  >
                    <option value="deficit">Apenas Sanar Déficit do Carregamento (Venda &gt; Inicial + Abast.)</option>
                    <option value="repor_vendas">Repor 100% das Vendas do Dia (Processo 3)</option>
                    <option value="completar_1pl">Completar 1 Palete por SKU</option>
                    <option value="completar_2pl">Completar 2 Paletes por SKU</option>
                  </select>
                </div>

                <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase bg-white px-2.5 py-1 rounded-lg border border-slate-200 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={showOnlyWithSales}
                    onChange={(e) => setShowOnlyWithSales(e.target.checked)}
                    className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                  />
                  Com Movimento
                </label>

              </div>

            </div>

            {/* The Intelligent Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-inner bg-slate-50">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase font-bold text-[8px] tracking-wider">
                    <th className="p-3">SKU / Produto</th>
                    <th className="p-3 text-center">Unidade</th>
                    <th className="p-3 text-center bg-amber-50/30">Inicial (021101)</th>
                    <th className="p-3 text-center bg-emerald-50/30">Abastecido (Diurno)</th>
                    <th className="p-3 text-center">Estoque Total</th>
                    <th className="p-3 text-center bg-blue-50/30">Venda do Dia (020304)</th>
                    <th className="p-3 text-center">Saldo Picking</th>
                    <th className="p-3 text-center bg-indigo-50/40 text-indigo-950 font-black">Necessidade Noturna</th>
                    <th className="p-3 text-right">Status do SKU</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
                  {filteredSkus.map((item, idx) => {
                    const totalDisp = item.estoqueTotalDisponivel;
                    const progressPct = item.vendaCaixas > 0 ? Math.min(100, Math.round((totalDisp / item.vendaCaixas) * 100)) : 100;
                    
                    return (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-all text-[11px]">
                        <td className="p-3">
                          <div className="flex flex-col">
                            <span className="font-mono text-[10px] text-amber-600 font-bold">#{item.sku}</span>
                            <span className="font-sans font-black text-[10.5px] text-slate-800" title={item.descricao}>
                              {item.descricao}
                            </span>
                            <span className="text-[8px] text-slate-400 uppercase font-semibold">
                              Embalagem: {item.embalagem} • Palete: {item.qtdPallet} cx
                            </span>
                            {item.estoqueTotalDisponivel === 0 && item.vendaCaixas > 0 ? (
                              <span className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 text-[8px] font-black uppercase rounded bg-rose-100 text-rose-800 border border-rose-300 w-fit">
                                <AlertOctagon className="w-2.5 h-2.5 text-rose-600" />
                                Ruptura Total no Picking
                              </span>
                            ) : item.estoqueInicialCaixas === 0 && item.vendaCaixas > 0 ? (
                              <span className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 text-[8px] font-black uppercase rounded bg-amber-100 text-amber-900 border border-amber-300 w-fit">
                                <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                                Venda sem Estoque Inicial
                              </span>
                            ) : null}
                          </div>
                        </td>
                        
                        <td className="p-3 text-center">
                          <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-500 rounded font-mono text-[9px] font-bold uppercase">
                            {item.unidade}
                          </span>
                        </td>

                        {/* INITIAL COUNT COLUMN - EDITABLE OPTION */}
                        <td className="p-3 text-center font-mono font-bold bg-amber-50/10">
                          <div className="flex flex-col items-center">
                            {isEditMode ? (
                              <div className="flex flex-col items-center gap-1">
                                <input 
                                  type="number"
                                  value={item.estoqueInicialCaixas}
                                  onChange={(e) => handleUpdateValue(item.sku, 'estoqueInicialCaixas', parseInt(e.target.value, 10))}
                                  className="w-20 px-1 py-0.5 text-center text-[10.5px] font-black font-mono border border-amber-300 rounded focus:ring-1 focus:ring-amber-500 bg-amber-50 focus:outline-none"
                                />
                                <span className="text-[8px] text-slate-400 font-normal uppercase">
                                  {Math.round(item.estoqueInicialCaixas / item.qtdPallet * 10) / 10} PL
                                </span>
                              </div>
                            ) : (
                              <>
                                <span className="text-slate-800">{item.estoqueInicialCaixas}</span>
                                <span className="text-[8px] text-slate-400 font-normal uppercase">
                                  {Math.round(item.estoqueInicialCaixas / item.qtdPallet * 10) / 10} PL
                                </span>
                              </>
                            )}
                          </div>
                        </td>

                        <td className="p-3 text-center font-mono bg-emerald-50/10">
                          <div className="flex flex-col items-center">
                            <span className={item.abastecimento > 0 ? 'text-emerald-600 font-black' : 'text-slate-400'}>
                              {item.abastecimento || '—'}
                            </span>
                            {item.abastecimento > 0 && (
                              <span className="text-[8px] text-emerald-500 font-bold uppercase">
                                +{item.abastecimentoPaletes} PL
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="p-3 text-center font-mono font-bold">
                          <div className="flex flex-col items-center">
                            <span className="text-indigo-950">{totalDisp}</span>
                            <span className="text-[8px] text-slate-400 font-normal uppercase">
                              {Math.round(totalDisp / item.qtdPallet * 10) / 10} PL
                            </span>
                          </div>
                        </td>

                        {/* DAILY SALES COLUMN - EDITABLE OPTION */}
                        <td className="p-3 text-center font-mono font-bold bg-blue-50/10">
                          <div className="flex flex-col items-center">
                            {isEditMode ? (
                              <div className="flex flex-col items-center gap-1">
                                <input 
                                  type="number"
                                  value={item.vendaCaixas}
                                  onChange={(e) => handleUpdateValue(item.sku, 'vendaCaixas', parseInt(e.target.value, 10))}
                                  className="w-20 px-1 py-0.5 text-center text-[10.5px] font-black font-mono border border-blue-300 rounded focus:ring-1 focus:ring-blue-500 bg-blue-50 focus:outline-none"
                                />
                                <span className="text-[8px] text-slate-400 font-normal uppercase">
                                  {Math.round(item.vendaCaixas / item.qtdPallet * 10) / 10} PL
                                </span>
                              </div>
                            ) : (
                              <>
                                <span className="text-blue-600">{item.vendaCaixas || '—'}</span>
                                {item.vendaCaixas > 0 && (
                                  <span className="text-[8px] text-slate-400 font-normal uppercase">
                                    {Math.round(item.vendaCaixas / item.qtdPallet * 10) / 10} PL
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </td>

                        <td className="p-3 text-center font-mono">
                          <div className="flex flex-col items-center">
                            <span className={`font-black ${item.saldoPicking >= 0 ? 'text-slate-700' : 'text-red-600'}`}>
                              {item.saldoPicking > 0 ? `+${item.saldoPicking}` : item.saldoPicking}
                            </span>
                            {item.vendaCaixas > 0 && (
                              <div className="w-12 bg-slate-100 h-1 rounded-full overflow-hidden mt-1" title={`Cobertura de ${progressPct}%`}>
                                <div 
                                  className={`h-full rounded-full ${item.status === 'ok' ? 'bg-emerald-500' : item.status === 'attention' ? 'bg-amber-500' : 'bg-red-500'}`}
                                  style={{ width: `${progressPct}%` }}
                                ></div>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* NIGHT REPLENISHMENT COLUMN */}
                        <td className="p-3 text-center font-mono bg-indigo-50/10 border-x border-indigo-100/30">
                          <div className="flex flex-col items-center justify-center">
                            {item.necessidadeNoturna > 0 ? (
                              <div className="flex flex-col items-center bg-indigo-50 border border-indigo-200/50 px-2 py-1 rounded-lg shadow-sm">
                                <span className="text-indigo-800 font-extrabold text-[11px]">
                                  {item.necessidadeNoturna.toLocaleString()} cx
                                </span>
                                <span className="text-[8px] text-indigo-500 font-bold uppercase tracking-wide">
                                  {item.necessidadeNoturnaPaletes} PL
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50/50 border border-emerald-100/40 px-1.5 py-0.5 rounded-md text-[9px] font-bold">
                                <Check className="w-3 h-3 text-emerald-500" />
                                <span>ABASTECIDO</span>
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="p-3 text-right">
                          {item.status === 'ok' ? (
                            <div className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">
                              <CheckCircle2 className="w-3 h-3" />
                              Estoque OK
                            </div>
                          ) : item.status === 'attention' ? (
                            <div className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">
                              <AlertCircle className="w-3 h-3" />
                              Atenção
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 bg-rose-50 border border-rose-200 text-rose-700 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider animate-pulse">
                              <AlertCircle className="w-3 h-3 animate-spin" />
                              Crítico
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredSkus.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400 font-mono text-[10px] uppercase bg-white">
                        Nenhum produto atende aos filtros aplicados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Detailed Guidelines Legend */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-500 shrink-0" />
                <span>
                  <strong>Cálculo do Carregamento Noturno:</strong> Necessidade = Venda do Dia - (Contagem Inicial + Abastecimento Diurno). Se o estoque disponível for suficiente para o carregamento, a necessidade é zerada.
                </span>
              </div>
              <div className="flex gap-4 font-bold uppercase text-[9px]">
                <span className="flex items-center gap-1 text-emerald-600">🟢 OK: Estoque Suficiente</span>
                <span className="flex items-center gap-1 text-amber-500">🟡 Atenção: Saldo Baixo (&lt; 20% da Venda)</span>
                <span className="flex items-center gap-1 text-red-500">🔴 Crítico: Saldo Negativo (Falta para Carregar)</span>
              </div>
            </div>

          </div>
        </>
      )}

    </div>
  );
}
