import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart2, 
  Upload, 
  Search, 
  Download, 
  Calendar, 
  Sparkles, 
  Filter, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Package, 
  DollarSign, 
  Droplets, 
  PieChart, 
  FileText, 
  Layers, 
  ArrowUpRight, 
  Edit3, 
  Check, 
  Sliders,
  Beer,
  CupSoda,
  Wine,
  ShoppingBag,
  Info,
  Trash2
} from 'lucide-react';
import { PRODUCTS } from '../planosData';

// Helper to verify if an item is a registered finished beverage product (skipping vasilhames/garrafas vazias/ativos)
export function isFinishedProductItem(codigo: number, rawName: string, unid: string): boolean {
  const catItem = PRODUCTS.find(p => p.codigo === codigo);
  if (!catItem) return false; // Must be registered in product catalog

  const nameToCheck = (catItem.descricao || '').toUpperCase();
  const rawUpper = (rawName || '').toUpperCase();
  const unidUpper = (unid || '').toUpperCase();

  // Exclude empty bottles, vasilhames, garrafeiras, chapatex, pallets, active materials
  const isVasilhameOrAtivo =
    nameToCheck.includes('GARRAFEIRA') ||
    nameToCheck.includes('CERVEGELA') ||
    nameToCheck.includes('VASILHAME') ||
    nameToCheck.includes('VASIL') ||
    nameToCheck.includes('GARRAFA VAZIA') ||
    nameToCheck.includes('GFA LITRINHO') ||
    nameToCheck.includes('GFA A ') ||
    nameToCheck.includes('GFA VIDRO') ||
    nameToCheck.includes('CHAPATEX') ||
    nameToCheck.includes('PALLET') ||
    nameToCheck.includes('REFRIGERADOR') ||
    nameToCheck.includes('VISA COOLER') ||
    nameToCheck.includes('CIL CO2') ||
    nameToCheck.includes('MESA') ||
    nameToCheck.includes('CADEIRA') ||
    nameToCheck.includes('MATERIAL MERCHANDISING') ||
    nameToCheck.includes('SOPRO') ||
    nameToCheck.includes('BARRIL VAZIO') ||
    rawUpper.startsWith('GFA ') ||
    rawUpper.includes('VASILHAME') ||
    rawUpper.includes('GARRAFA VAZIA') ||
    (unidUpper === 'UN' && (rawUpper.includes('GFA') || rawUpper.includes('GARRAFA')));

  return !isVasilhameOrAtivo;
}

export type ProductCategoria = 'Cerveja' | 'NAB' | 'Match' | 'Marketplace';

export interface Item030519 {
  codigo: number;
  produto: string;
  unidade: string;
  volumeTotalTrimestre: number; // Volume unificado (soma Coluna AC)
  vendaMediaDiaria: number;      // volumeTotalTrimestre / diasUteis
  fatorHecto: number;           // hL por caixa
  precoUnitario: number;        // R$ por caixa
  vendaMediaReais: number;      // vendaMediaDiaria * precoUnitario
  vendaMediaHectolitro: number;  // vendaMediaDiaria * fatorHecto
  faturamentoTotal: number;     // volumeTotalTrimestre * precoUnitario
  volumeTotalHectolitros: number; // volumeTotalTrimestre * fatorHecto
  categoria: ProductCategoria;
  
  // Pareto ABC
  rank?: number;
  percentualVolume?: number;
  percentualAcumulado?: number;
  classeABC?: 'A' | 'B' | 'C';
}

export interface TrimestreDataStore {
  diasUteis: number;
  itemsMap: Record<number, Item030519>;
  importadoEm?: string;
  nomeArquivo?: string;
  overridesCategoria?: Record<number, ProductCategoria>;
  overridesABC?: Record<number, 'A' | 'B' | 'C'>;
}

const STORAGE_KEY_TRIMESTRES_V1 = 'af_curva_abc_trimestres_030519_v1';

const DEFAULT_DAYS_PER_QUARTER: Record<string, number> = {
  Q1: 66, // 1º Trimestre
  Q2: 65, // 2º Trimestre
  Q3: 66, // 3º Trimestre
  Q4: 64, // 4º Trimestre
};

// Helper for category detection
export function detectCategoria(nome: string, codigo: number): ProductCategoria {
  const upper = (nome || '').toUpperCase();
  
  // 1. MATCH (Drinks Prontos, Beats, Mikes, Ice)
  if (
    upper.includes('BEATS') || upper.includes('SKBTSEN') || upper.includes('SKBGT') ||
    upper.includes('MIKE') || upper.includes('ICE') || upper.includes('SMIRICE') ||
    upper.includes('BTGREENMIX') || upper.includes('BREDMIX') || upper.includes('BTTROP') ||
    upper.includes('DRINK') || upper.includes('MATCH') || upper.includes('51OAGC') ||
    upper.includes('READY TO DRINK')
  ) {
    return 'Match';
  }

  // 2. NAB (Bebidas Não Alcoólicas - Guaraná, Pepsi, Sukita, H2OH, Gatorade, Red Bull, Fusion, Lipton, Toddy, Água)
  if (
    upper.includes('GCA') || upper.includes('GUARANA') || upper.includes('PEPSI') ||
    upper.includes('PC ') || upper.includes('SUKITA') || upper.includes('SU ') ||
    upper.includes('H2OH') || upper.includes('SODA') || upper.includes('SLA') ||
    upper.includes('TONICA') || upper.includes('TA ') || upper.includes('TAD') ||
    upper.includes('RED BULL') || upper.includes('RB ') || upper.includes('RBT') ||
    upper.includes('FUSION') || upper.includes('GATORADE') || upper.includes('GT ') ||
    upper.includes('TODDY') || upper.includes('AGUA') || upper.includes('MINAG') ||
    upper.includes('AMA') || upper.includes('LIPTON') || upper.includes('MONSTER') ||
    upper.includes('PITAG') || upper.includes('PEBL') || upper.includes('GAZR') ||
    upper.includes('SUKLIM') || upper.includes('PEPZERO') || upper.includes('GCAD')
  ) {
    return 'NAB';
  }

  // 3. CERVEJA (Skol, Brahma, Antarctica, Original, Budweiser, Stella, Corona, Spaten, Bohemia, Chopp, Caracu, etc.)
  if (
    upper.includes('SKOL') || upper.includes('SK ') || upper.includes('BRAHMA') ||
    upper.includes('BC ') || upper.includes('ANTARCTICA') || upper.includes('AP ') ||
    upper.includes('ORIGINAL') || upper.includes('BUDWEISER') || upper.includes('BUD') ||
    upper.includes('STELLA') || upper.includes('S ARTOIS') || upper.includes('CORONA') ||
    upper.includes('COREX') || upper.includes('CORCES') || upper.includes('SPATEN') ||
    upper.includes('SPTN') || upper.includes('BOHEMIA') || upper.includes('BOH') ||
    upper.includes('CARACU') || upper.includes('CAR ') || upper.includes('BECK') ||
    upper.includes('CHOPP') || upper.includes('CHP') || upper.includes('SERRAMARES') ||
    upper.includes('STARTPG') || upper.includes('MICULTN') || upper.includes('MZBR') ||
    upper.includes('BCZ') || upper.includes('ASUBZERO') || upper.includes('BONOV') ||
    upper.includes('BRDM') || upper.includes('CERV') || upper.includes('CERVEJA') ||
    upper.includes('GFA A') || upper.includes('GFE 300ML')
  ) {
    return 'Cerveja';
  }

  // 4. MARKETPLACE (Produtos Não Ambev, Whiskies, Gin, Confeitos, Merchandising, Ativos, etc.)
  return 'Marketplace';
}

// Estimate hL factor and Unit Price based on SKU name/unit
function estimateProductMeta(codigo: number, nome: string, unid: string): { fatorHecto: number; precoUnitario: number } {
  const catItem = PRODUCTS.find(p => p.codigo === codigo);
  const fullName = catItem ? catItem.descricao : (nome || '');
  const upper = fullName.toUpperCase();

  let fatorHecto = catItem ? catItem.fatorHecto : 0.05; // default 5 hL / 100 cx
  let precoUnitario = 45.0; // default R$ 45/cx

  if (upper.includes('600ML') || upper.includes(' 600')) {
    precoUnitario = 58.0;
  } else if (upper.includes('1L') || upper.includes('LITRINHO') || upper.includes('1/1')) {
    precoUnitario = 62.0;
  } else if (upper.includes('350ML') || upper.includes('LT350') || upper.includes('LATA 350')) {
    precoUnitario = 32.0;
  } else if (upper.includes('473ML') || upper.includes('LT473') || upper.includes('LATA 473')) {
    precoUnitario = 42.0;
  } else if (upper.includes('269ML') || upper.includes('LT269')) {
    precoUnitario = 35.0;
  } else if (upper.includes('330ML') || upper.includes('355ML') || upper.includes('LN330') || upper.includes('LONG NECK')) {
    precoUnitario = 85.0;
  } else if (upper.includes('300ML') || upper.includes('GFVD300')) {
    precoUnitario = 48.0;
  } else if (upper.includes('2L') || upper.includes('PET2') || upper.includes('PET 2L')) {
    precoUnitario = 24.0;
  } else if (upper.includes('2,5L') || upper.includes('PET 2,5L')) {
    precoUnitario = 28.0;
  } else if (upper.includes('KEG50') || upper.includes('50L') || upper.includes('BARRIL')) {
    precoUnitario = 220.0;
  } else if (upper.includes('RED BULL') || upper.includes('RB ') || upper.includes('FUSION')) {
    precoUnitario = 110.0;
  } else if (upper.includes('WHISKY') || upper.includes('JW') || upper.includes('GIN') || upper.includes('VODKA') || upper.includes('DREHER') || upper.includes('PASSPORT') || upper.includes('BLACK & WHITE')) {
    precoUnitario = 95.0;
  } else if (upper.includes('TRIDENT') || upper.includes('HALLS') || upper.includes('BUBBALOO')) {
    precoUnitario = 18.0;
  } else if (upper.includes('YPE') || upper.includes('TIXAN') || upper.includes('ASSOLAN')) {
    precoUnitario = 38.0;
  }

  // Override from catalog if available
  if (catItem && (catItem as any).preco) {
    precoUnitario = (catItem as any).preco;
  }

  return { fatorHecto, precoUnitario };
}

export default function CurvaAbcTrimestralTab() {
  const [activeQuarter, setActiveQuarter] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4' | 'ANUAL'>('Q1');
  
  // Store of 4 Quarters data
  const [quartersData, setQuartersData] = useState<Record<string, TrimestreDataStore>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TRIMESTRES_V1);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Erro ao carregar dados dos trimestres:', e);
    }
    return {
      Q1: { diasUteis: 66, itemsMap: {} },
      Q2: { diasUteis: 65, itemsMap: {} },
      Q3: { diasUteis: 66, itemsMap: {} },
      Q4: { diasUteis: 64, itemsMap: {} },
    };
  });

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<'TODAS' | ProductCategoria>('TODAS');
  const [classAbcFilter, setClassAbcFilter] = useState<'TODAS' | 'A' | 'B' | 'C'>('TODAS');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Notification Toast
  const [notification, setNotification] = useState<string | null>(null);

  // Edit days state
  const [editingDays, setEditingDays] = useState<boolean>(false);
  const [tempDaysVal, setEditingDaysVal] = useState<string>('');

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TRIMESTRES_V1, JSON.stringify(quartersData));
    } catch (e) {
      console.error('Erro ao salvar trimestres no localStorage:', e);
    }
  }, [quartersData]);

  const showNotify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Current Quarter State Object
  const currentQData = quartersData[activeQuarter] || { diasUteis: 66, itemsMap: {} };

  // Parse File 03.05.19 (Col G = Código, Col AC = Qtd Vendida)
  const processFile030519 = (text: string, fileName: string, targetQuarter: 'Q1' | 'Q2' | 'Q3' | 'Q4') => {
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) {
      alert('O arquivo selecionado está vazio.');
      return;
    }

    const quarterStore = quartersData[targetQuarter] || {
      diasUteis: DEFAULT_DAYS_PER_QUARTER[targetQuarter] || 66,
      itemsMap: {}
    };

    const diasUteis = quarterStore.diasUteis || 66;

    // Map to aggregate totals per code
    const volTotalMap = new Map<number, {
      codigo: number;
      nome: string;
      unid: string;
      volumeTotal: number;
    }>();

    let linesProcessed = 0;
    let validRecords = 0;

    lines.forEach((line, idx) => {
      linesProcessed++;
      const parts = line.split(';').map(p => p.trim());
      
      // Header check
      if (idx === 0 && (parts[6]?.toLowerCase().includes('produto') || line.toLowerCase().includes('gte vendas'))) {
        return;
      }

      if (parts.length < 7) return;

      const codeRaw = parts[6] || ''; // Coluna G
      const nameRaw = parts[7] || `Produto ${codeRaw}`; // Coluna H
      const unidRaw = parts[8] || 'cx'; // Coluna I

      const cleanCode = codeRaw.replace(/\D/g, '');
      const codeNum = parseInt(cleanCode, 10);

      if (isNaN(codeNum) || codeNum <= 0) return;

      // Filter: Must be a finished product registered in catalog (excluding vasilhames/garrafas vazias/ativos)
      if (!isFinishedProductItem(codeNum, nameRaw, unidRaw)) return;

      // Coluna AC = Quantidade Vendida (Index 28 + Index 29 decimal)
      let qtyStr = parts[28] || '0';
      let decStr = parts[29] || '00';

      // Clean spaces and format
      qtyStr = qtyStr.replace(/\s+/g, '').replace(',', '.');
      decStr = decStr.replace(/\s+/g, '');

      let qtyNum = parseFloat(`${qtyStr}.${decStr}`);
      if (isNaN(qtyNum)) {
        qtyNum = parseFloat(qtyStr) || 0;
      }

      const existing = volTotalMap.get(codeNum);
      if (existing) {
        existing.volumeTotal += qtyNum;
      } else {
        volTotalMap.set(codeNum, {
          codigo: codeNum,
          nome: nameRaw,
          unid: unidRaw,
          volumeTotal: qtyNum
        });
      }
      validRecords++;
    });

    if (volTotalMap.size === 0) {
      alert('Não foram encontrados produtos acabados cadastrados válidos na coluna G / AC deste relatório.');
      return;
    }

    const updatedItemsMap: Record<number, Item030519> = {};

    volTotalMap.forEach((entry, codeNum) => {
      const catItem = PRODUCTS.find(p => p.codigo === codeNum);
      if (!catItem) return;

      const officialName = catItem.descricao;
      const officialFatorHecto = catItem.fatorHecto;
      const { precoUnitario } = estimateProductMeta(codeNum, officialName, entry.unid);
      const categoriaAuto = detectCategoria(officialName, codeNum);
      
      const categoria = quarterStore.overridesCategoria?.[codeNum] || categoriaAuto;

      const volumeTotalTrimestre = Math.max(0, entry.volumeTotal);
      const vendaMediaDiaria = volumeTotalTrimestre / diasUteis;
      const vendaMediaReais = vendaMediaDiaria * precoUnitario;
      const vendaMediaHectolitro = vendaMediaDiaria * officialFatorHecto;
      const faturamentoTotal = volumeTotalTrimestre * precoUnitario;
      const volumeTotalHectolitros = volumeTotalTrimestre * officialFatorHecto;

      updatedItemsMap[codeNum] = {
        codigo: codeNum,
        produto: officialName,
        unidade: entry.unid,
        volumeTotalTrimestre,
        vendaMediaDiaria,
        fatorHecto: officialFatorHecto,
        precoUnitario,
        vendaMediaReais,
        vendaMediaHectolitro,
        faturamentoTotal,
        volumeTotalHectolitros,
        categoria
      };
    });

    const nowStr = new Date().toLocaleString('pt-BR');

    setQuartersData(prev => ({
      ...prev,
      [targetQuarter]: {
        ...quarterStore,
        itemsMap: updatedItemsMap,
        importadoEm: nowStr,
        nomeArquivo: fileName
      }
    }));

    showNotify(`Arquivo 03.05.19 importado para o ${targetQuarter.replace('Q', '')}º Trimestre! ${Object.keys(updatedItemsMap).length} SKUs de produtos acabados processados.`);
  };

  // Delete active quarter imported dataset
  const handleDeleteActiveQuarterData = () => {
    if (activeQuarter === 'ANUAL') return;

    if (
      window.confirm(
        `Tem certeza que deseja excluir os dados da base 03.05.19 do ${activeQuarter.replace('Q', '')}º Trimestre (${activeQuarter})?`
      )
    ) {
      setQuartersData(prev => ({
        ...prev,
        [activeQuarter]: {
          diasUteis: DEFAULT_DAYS_PER_QUARTER[activeQuarter] || 66,
          itemsMap: {},
          importadoEm: undefined,
          nomeArquivo: undefined,
          overridesCategoria: {},
          overridesABC: {}
        }
      }));
      showNotify(`Base de dados 03.05.19 do ${activeQuarter} excluída com sucesso.`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, targetQuarter: 'Q1' | 'Q2' | 'Q3' | 'Q4') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      processFile030519(text, file.name, targetQuarter);
    };
    reader.readAsText(file, 'ISO-8859-1');
  };

  // Change Days per Quarter
  const handleSaveDays = () => {
    if (activeQuarter === 'ANUAL') return;
    const num = parseInt(tempDaysVal, 10);
    if (isNaN(num) || num <= 0) {
      alert('Informe um número válido de dias úteis.');
      return;
    }

    const currentStore = quartersData[activeQuarter] || { diasUteis: 66, itemsMap: {} };
    const updatedMap = { ...currentStore.itemsMap };

    // Recalculate Venda Média with new days
    Object.keys(updatedMap).forEach(key => {
      const k = Number(key);
      const item = updatedMap[k];
      const vendaMediaDiaria = item.volumeTotalTrimestre / num;
      updatedMap[k] = {
        ...item,
        vendaMediaDiaria,
        vendaMediaReais: vendaMediaDiaria * item.precoUnitario,
        vendaMediaHectolitro: vendaMediaDiaria * item.fatorHecto
      };
    });

    setQuartersData(prev => ({
      ...prev,
      [activeQuarter]: {
        ...currentStore,
        diasUteis: num,
        itemsMap: updatedMap
      }
    }));

    setEditingDays(false);
    showNotify(`Dias úteis do ${activeQuarter} atualizados para ${num} dias.`);
  };

  // Manual Category Override
  const handleCategoryOverride = (codigo: number, newCat: ProductCategoria) => {
    if (activeQuarter === 'ANUAL') return;
    const qStore = quartersData[activeQuarter];
    if (!qStore || !qStore.itemsMap[codigo]) return;

    const item = qStore.itemsMap[codigo];
    const updatedItem = { ...item, categoria: newCat };

    const newOverrides = { ...(qStore.overridesCategoria || {}), [codigo]: newCat };

    setQuartersData(prev => ({
      ...prev,
      [activeQuarter]: {
        ...qStore,
        itemsMap: {
          ...qStore.itemsMap,
          [codigo]: updatedItem
        },
        overridesCategoria: newOverrides
      }
    }));

    showNotify(`Categoria do SKU ${codigo} alterada para ${newCat}.`);
  };

  // Manual ABC Class Override
  const handleAbcOverride = (codigo: number, currentClass?: 'A' | 'B' | 'C') => {
    if (activeQuarter === 'ANUAL') return;
    const nextMap: Record<string, 'A' | 'B' | 'C'> = { 'A': 'B', 'B': 'C', 'C': 'A' };
    const nextClass = nextMap[currentClass || 'C'] || 'A';

    const qStore = quartersData[activeQuarter];
    if (!qStore) return;

    const newOverridesABC = { ...(qStore.overridesABC || {}), [codigo]: nextClass };

    setQuartersData(prev => ({
      ...prev,
      [activeQuarter]: {
        ...qStore,
        overridesABC: newOverridesABC
      }
    }));

    showNotify(`Classe ABC do SKU ${codigo} alterada manualmente para Classe ${nextClass}!`);
  };

  // Calculate Consolidado Anual or Selected Quarter
  const currentItemList = useMemo(() => {
    let rawItems: Item030519[] = [];

    if (activeQuarter === 'ANUAL') {
      // Consolidate Q1, Q2, Q3, Q4
      const mergedMap = new Map<number, {
        codigo: number;
        produto: string;
        unidade: string;
        volumeTotalTrimestre: number;
        fatorHecto: number;
        precoUnitario: number;
        categoria: ProductCategoria;
      }>();

      let totalDaysAnual = 0;
      (['Q1', 'Q2', 'Q3', 'Q4'] as const).forEach(qKey => {
        const qData = quartersData[qKey];
        if (qData) {
          totalDaysAnual += qData.diasUteis || 65;
          Object.values(qData.itemsMap).forEach((item: Item030519) => {
            const ex = mergedMap.get(item.codigo);
            if (ex) {
              ex.volumeTotalTrimestre += item.volumeTotalTrimestre;
            } else {
              mergedMap.set(item.codigo, {
                codigo: item.codigo,
                produto: item.produto,
                unidade: item.unidade,
                volumeTotalTrimestre: item.volumeTotalTrimestre,
                fatorHecto: item.fatorHecto,
                precoUnitario: item.precoUnitario,
                categoria: item.categoria
              });
            }
          });
        }
      });

      const totalDays = totalDaysAnual || 261;

      mergedMap.forEach((entry) => {
        const vendaMediaDiaria = entry.volumeTotalTrimestre / totalDays;
        rawItems.push({
          codigo: entry.codigo,
          produto: entry.produto,
          unidade: entry.unidade,
          volumeTotalTrimestre: entry.volumeTotalTrimestre,
          vendaMediaDiaria,
          fatorHecto: entry.fatorHecto,
          precoUnitario: entry.precoUnitario,
          vendaMediaReais: vendaMediaDiaria * entry.precoUnitario,
          vendaMediaHectolitro: vendaMediaDiaria * entry.fatorHecto,
          faturamentoTotal: entry.volumeTotalTrimestre * entry.precoUnitario,
          volumeTotalHectolitros: entry.volumeTotalTrimestre * entry.fatorHecto,
          categoria: entry.categoria
        });
      });
    } else {
      const qStore = quartersData[activeQuarter];
      if (qStore && qStore.itemsMap) {
        rawItems = Object.values(qStore.itemsMap);
      }
    }

    // Filter and sanitize rawItems against official PRODUCTS catalog
    const sanitizedItems: Item030519[] = [];

    rawItems.forEach(item => {
      if (!isFinishedProductItem(item.codigo, item.produto, item.unidade)) return;
      
      const catItem = PRODUCTS.find(p => p.codigo === item.codigo);
      if (!catItem) return;

      const officialName = catItem.descricao;
      const officialFatorHecto = catItem.fatorHecto;
      const { precoUnitario } = estimateProductMeta(item.codigo, officialName, item.unidade);
      
      const qStoreCurrent = activeQuarter !== 'ANUAL' ? quartersData[activeQuarter] : null;
      const officialCategory = qStoreCurrent?.overridesCategoria?.[item.codigo] || detectCategoria(officialName, item.codigo);

      const diasUteis = activeQuarter === 'ANUAL' ? 261 : (quartersData[activeQuarter]?.diasUteis || 66);
      const volumeTotalTrimestre = Math.max(0, item.volumeTotalTrimestre);
      const vendaMediaDiaria = volumeTotalTrimestre / (diasUteis || 66);
      const vendaMediaReais = vendaMediaDiaria * precoUnitario;
      const vendaMediaHectolitro = vendaMediaDiaria * officialFatorHecto;
      const faturamentoTotal = volumeTotalTrimestre * precoUnitario;
      const volumeTotalHectolitros = volumeTotalTrimestre * officialFatorHecto;

      sanitizedItems.push({
        ...item,
        produto: officialName,
        fatorHecto: officialFatorHecto,
        categoria: officialCategory,
        precoUnitario,
        vendaMediaDiaria,
        vendaMediaReais,
        vendaMediaHectolitro,
        faturamentoTotal,
        volumeTotalHectolitros
      });
    });

    // Sort descending by Volume
    sanitizedItems.sort((a, b) => b.volumeTotalTrimestre - a.volumeTotalTrimestre);

    const grandTotalVol = sanitizedItems.reduce((acc, i) => acc + i.volumeTotalTrimestre, 0) || 1;
    let accumVol = 0;

    const qStoreCurrent = activeQuarter !== 'ANUAL' ? quartersData[activeQuarter] : null;

    // Pareto 80/20 ABC calculation
    const calculated = sanitizedItems.map((item, idx) => {
      accumVol += item.volumeTotalTrimestre;
      const percentualVolume = (item.volumeTotalTrimestre / grandTotalVol) * 100;
      const percentualAcumulado = (accumVol / grandTotalVol) * 100;

      let classeABC: 'A' | 'B' | 'C' = 'C';
      if (percentualAcumulado <= 80) classeABC = 'A';
      else if (percentualAcumulado <= 95) classeABC = 'B';
      else classeABC = 'C';

      // Check for manual ABC override
      if (qStoreCurrent?.overridesABC?.[item.codigo]) {
        classeABC = qStoreCurrent.overridesABC[item.codigo];
      }

      return {
        ...item,
        rank: idx + 1,
        percentualVolume,
        percentualAcumulado,
        classeABC
      };
    });

    return calculated;
  }, [activeQuarter, quartersData]);

  // Filtered List
  const filteredList = useMemo(() => {
    return currentItemList.filter(item => {
      const matchSearch = item.produto.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.codigo.toString().includes(searchQuery);
      const matchCategory = categoryFilter === 'TODAS' || item.categoria === categoryFilter;
      const matchClass = classAbcFilter === 'TODAS' || item.classeABC === classAbcFilter;

      return matchSearch && matchCategory && matchClass;
    });
  }, [currentItemList, searchQuery, categoryFilter, classAbcFilter]);

  // Aggregated KPIs
  const summaryKpis = useMemo(() => {
    const totalSKUs = currentItemList.length;
    const totalVolumeCx = currentItemList.reduce((acc, i) => acc + i.volumeTotalTrimestre, 0);
    const totalVolumeHl = currentItemList.reduce((acc, i) => acc + i.volumeTotalHectolitros, 0);
    const totalFaturamento = currentItemList.reduce((acc, i) => acc + i.faturamentoTotal, 0);

    const vendaMediaDiariaCx = currentItemList.reduce((acc, i) => acc + i.vendaMediaDiaria, 0);
    const vendaMediaDiariaReais = currentItemList.reduce((acc, i) => acc + i.vendaMediaReais, 0);
    const vendaMediaDiariaHl = currentItemList.reduce((acc, i) => acc + i.vendaMediaHectolitro, 0);

    // By Category
    const categoryTotals: Record<ProductCategoria, {
      skus: number;
      volHl: number;
      vmReais: number;
      vmHl: number;
      faturamento: number;
    }> = {
      'Cerveja': { skus: 0, volHl: 0, vmReais: 0, vmHl: 0, faturamento: 0 },
      'NAB': { skus: 0, volHl: 0, vmReais: 0, vmHl: 0, faturamento: 0 },
      'Match': { skus: 0, volHl: 0, vmReais: 0, vmHl: 0, faturamento: 0 },
      'Marketplace': { skus: 0, volHl: 0, vmReais: 0, vmHl: 0, faturamento: 0 },
    };

    currentItemList.forEach(item => {
      if (categoryTotals[item.categoria]) {
        categoryTotals[item.categoria].skus++;
        categoryTotals[item.categoria].volHl += item.volumeTotalHectolitros;
        categoryTotals[item.categoria].vmReais += item.vendaMediaReais;
        categoryTotals[item.categoria].vmHl += item.vendaMediaHectolitro;
        categoryTotals[item.categoria].faturamento += item.faturamentoTotal;
      }
    });

    // By ABC Class
    const abcTotals = {
      A: { skus: 0, volHl: 0, vmReais: 0, vmHl: 0, pctVol: 0 },
      B: { skus: 0, volHl: 0, vmReais: 0, vmHl: 0, pctVol: 0 },
      C: { skus: 0, volHl: 0, vmReais: 0, vmHl: 0, pctVol: 0 },
    };

    currentItemList.forEach(item => {
      const cls = item.classeABC || 'C';
      abcTotals[cls].skus++;
      abcTotals[cls].volHl += item.volumeTotalHectolitros;
      abcTotals[cls].vmReais += item.vendaMediaReais;
      abcTotals[cls].vmHl += item.vendaMediaHectolitro;
    });

    if (totalVolumeHl > 0) {
      abcTotals.A.pctVol = (abcTotals.A.volHl / totalVolumeHl) * 100;
      abcTotals.B.pctVol = (abcTotals.B.volHl / totalVolumeHl) * 100;
      abcTotals.C.pctVol = (abcTotals.C.volHl / totalVolumeHl) * 100;
    }

    return {
      totalSKUs,
      totalVolumeCx,
      totalVolumeHl,
      totalFaturamento,
      vendaMediaDiariaCx,
      vendaMediaDiariaReais,
      vendaMediaDiariaHl,
      categoryTotals,
      abcTotals
    };
  }, [currentItemList]);

  // Export CSV
  const handleExportCSV = () => {
    const csvHeader = 'RANK;CODIGO_SKU;PRODUTO;UNIDADE;CATEGORIA;CLASSE_ABC;VOLUME_TOTAL_TRIMESTRE;VENDA_MEDIA_DIARIA_CX;VENDA_MEDIA_REAIS_DIA;VENDA_MEDIA_HECTOLITRO_DIA;FATURAMENTO_TOTAL_R$;VOLUME_TOTAL_HL;PCT_VOLUME_ACUMULADO\n';
    const csvRows = filteredList.map(i => 
      `${i.rank};"${i.codigo}";"${i.produto.replace(/"/g, '""')}";"${i.unidade}";"${i.categoria}";"${i.classeABC}";${i.volumeTotalTrimestre.toFixed(1)};${i.vendaMediaDiaria.toFixed(2)};${i.vendaMediaReais.toFixed(2)};${i.vendaMediaHectolitro.toFixed(2)};${i.faturamentoTotal.toFixed(2)};${i.volumeTotalHectolitros.toFixed(2)};${i.percentualAcumulado?.toFixed(2)}`
    ).join('\n');

    const blob = new Blob(['\uFEFF' + csvHeader + csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Curva_ABC_03_05_19_${activeQuarter}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotify(`Relatório exportado em CSV (${activeQuarter})!`);
  };

  return (
    <div className="space-y-6">
      
      {/* BANNER ETAPA REQUERIMENTO */}
      <div className="bg-gradient-to-r from-[#032b5e] via-slate-900 to-slate-950 p-6 rounded-2xl text-white shadow-lg border border-blue-900/60 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 flex items-center gap-1.5 w-max">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              RELATÓRIO 03.05.19 — CURVA ABC TRIMESTRAL DE PRODUTOS
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight mt-2 flex items-center gap-2">
            Gestão da Curva ABC e Venda Média por Trimestres (Q1 a Q4)
          </h2>
          <p className="text-xs text-slate-300 font-medium mt-1 max-w-4xl">
            Importe o arquivo do relatório <strong>03.05.19</strong> (Coluna G = Código SKU, Coluna AC = Quantidade Vendida). O motor unifica os registros duplicados e calcula a Venda Média Diária dividindo pelo total de dias úteis do trimestre correspondente, com suporte às <strong>4 classificações oficiais (Cerveja, NAB, Match e Marketplace)</strong> e métricas em <strong>Reais (R$/dia)</strong> e <strong>Hectolitros (hL/dia)</strong>.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
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

      {/* QUARTER TABS SELECTOR (4 TRIMESTRES + ANUAL) */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {(['Q1', 'Q2', 'Q3', 'Q4', 'ANUAL'] as const).map((qKey) => {
            const isSelected = activeQuarter === qKey;
            const qNames = {
              Q1: '1º Trimestre (Jan-Mar)',
              Q2: '2º Trimestre (Abr-Jun)',
              Q3: '3º Trimestre (Jul-Set)',
              Q4: '4º Trimestre (Out-Dez)',
              ANUAL: '📊 Consolidado Anual'
            };

            const store = quartersData[qKey];
            const hasData = store && Object.keys(store.itemsMap || {}).length > 0;

            return (
              <button
                key={qKey}
                onClick={() => setActiveQuarter(qKey)}
                className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center gap-2 ${
                  isSelected
                    ? 'bg-[#032b5e] text-white shadow-md border border-blue-500/40'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Calendar className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>{qNames[qKey]}</span>
                {qKey !== 'ANUAL' && hasData && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                )}
              </button>
            );
          })}
        </div>

        {/* DAYS CONFIGURATION & UPLOAD ACTION FOR ACTIVE QUARTER */}
        {activeQuarter !== 'ANUAL' && (
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
              <Calendar className="w-4 h-4 text-amber-500" />
              <span>Dias Úteis:</span>
              {editingDays ? (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={tempDaysVal}
                    onChange={(e) => setEditingDaysVal(e.target.value)}
                    className="w-16 p-1 bg-white dark:bg-slate-800 border border-blue-500 rounded text-center text-xs font-mono font-bold text-white"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveDays}
                    className="p-1 bg-emerald-600 text-white rounded cursor-pointer hover:bg-emerald-500"
                    title="Salvar Dias Úteis"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setEditingDaysVal(String(currentQData.diasUteis || 66));
                    setEditingDays(true);
                  }}
                  className="font-mono font-black text-amber-500 underline decoration-dashed underline-offset-4 cursor-pointer hover:text-amber-400"
                  title="Clique para alterar a quantidade de dias úteis do trimestre"
                >
                  {currentQData.diasUteis || 66} dias
                </button>
              )}
            </div>

            <label className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-lg cursor-pointer transition-all flex items-center gap-1.5 shadow-xs">
              <Upload className="w-3.5 h-3.5" />
              <span>Importar 03.05.19</span>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={(e) => handleFileUpload(e, activeQuarter as 'Q1' | 'Q2' | 'Q3' | 'Q4')}
                className="hidden"
              />
            </label>

            {Object.keys(currentQData.itemsMap || {}).length > 0 && (
              <button
                onClick={handleDeleteActiveQuarterData}
                className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer"
                title="Excluir/Limpar importação deste trimestre"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir Base</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* IMPORT SUMMARY BAR IF FILE IMPORTED OR DATA EXISTS */}
      {activeQuarter !== 'ANUAL' && (currentQData.nomeArquivo || Object.keys(currentQData.itemsMap || {}).length > 0) && (
        <div className="bg-[#0f172a] border border-slate-800 px-5 py-3 rounded-2xl text-xs text-slate-300 flex flex-wrap items-center justify-between gap-3 shadow-md">
          <div className="flex flex-wrap items-center gap-2">
            <FileText className="w-4 h-4 text-sky-400" />
            {currentQData.nomeArquivo && (
              <>
                <span>Arquivo: <strong>{currentQData.nomeArquivo}</strong></span>
                <span className="text-slate-600">•</span>
              </>
            )}
            {currentQData.importadoEm && (
              <>
                <span>Importado em: <strong>{currentQData.importadoEm}</strong></span>
                <span className="text-slate-600">•</span>
              </>
            )}
            <span className="font-mono text-emerald-400 font-bold">{summaryKpis.totalSKUs} SKUs Acabados (Cadastrados)</span>
          </div>

          <button
            onClick={handleDeleteActiveQuarterData}
            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 hover:border-red-500/50 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer"
            title="Excluir/Limpar base importada deste trimestre"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
            <span>Excluir Base 03.05.19 ({activeQuarter})</span>
          </button>
        </div>
      )}

      {/* KPI METRIC CARDS OVERVIEW (REQUIREMENT: VENDA TRIMESTRAL EM CARD ACIMA) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* TOTAL VENDA TRIMESTRAL EM REAIS (R$) & VENDA MÉDIA */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Faturamento Trimestral</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <span className="text-2xl font-black font-mono text-emerald-500">
              R$ {summaryKpis.totalFaturamento.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
            </span>
            <p className="text-[11px] text-slate-400 font-medium mt-1">
              Faturamento total do {activeQuarter}
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-400 flex justify-between">
            <span>Venda Média Diária:</span>
            <strong className="font-mono text-emerald-400">R$ {summaryKpis.vendaMediaDiariaReais.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/dia</strong>
          </div>
        </div>

        {/* TOTAL VOLUME TRIMESTRAL EM HECTOLITROS (hL) & VENDA MÉDIA */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Volume Trimestral (hL)</span>
            <Droplets className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <span className="text-2xl font-black font-mono text-sky-400">
              {summaryKpis.totalVolumeHl.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} hL
            </span>
            <p className="text-[11px] text-slate-400 font-medium mt-1">
              Volume físico total acumulado no trimestre
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-400 flex justify-between">
            <span>Venda Média Diária:</span>
            <strong className="font-mono text-sky-400">{summaryKpis.vendaMediaDiariaHl.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} hL/dia</strong>
          </div>
        </div>

        {/* TOTAL VOLUME TRIMESTRAL EM CAIXAS (cx) & VENDA MÉDIA */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Volume Trimestral (Caixas)</span>
            <Package className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <span className="text-2xl font-black font-mono text-amber-400">
              {summaryKpis.totalVolumeCx.toLocaleString('pt-BR')} cx
            </span>
            <p className="text-[11px] text-slate-400 font-medium mt-1">
              {summaryKpis.totalSKUs} SKUs unificados e mapeados
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-400 flex justify-between">
            <span>Venda Média Diária:</span>
            <strong className="font-mono text-amber-400">{summaryKpis.vendaMediaDiariaCx.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} cx/dia</strong>
          </div>
        </div>

        {/* DISTRIBUIÇÃO PARETO CLASSE A */}
        <div className="bg-white dark:bg-[#111827] border-2 border-emerald-500/40 p-5 rounded-2xl shadow-xs space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <span>Pareto Classe A (80%)</span>
            <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">
              {summaryKpis.abcTotals.A.skus} SKUs
            </span>
          </div>
          <div>
            <span className="text-2xl font-black font-mono text-emerald-400">
              {summaryKpis.abcTotals.A.pctVol.toFixed(1)}% <span className="text-xs text-slate-400">do vol</span>
            </span>
            <p className="text-[11px] text-slate-300 font-medium mt-1">
              R$ {summaryKpis.abcTotals.A.vmReais.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}/dia
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-400 flex justify-between">
            <span>Volume Alto Giro:</span>
            <strong className="font-mono text-emerald-400">{summaryKpis.abcTotals.A.vmHl.toFixed(1)} hL/dia</strong>
          </div>
        </div>

      </div>

      {/* BREAKDOWN CARDS PER 4 CATEGORIES (REQUIREMENT: CERVEJA, NAB, MATCH, MARKETPLACE) */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-tight flex items-center gap-2">
              <PieChart className="w-4 h-4 text-amber-500" />
              Desempenho por Classificação de Produto (4 Categorias Operacionais)
            </h3>
            <p className="text-xs text-slate-400">
              Venda Média diária em Hectolitros e Reais segregada por família de bebidas e marketplace.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* 1. CERVEJA */}
          <div className="bg-slate-900 border border-amber-500/30 p-4 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5">
                <Beer className="w-4 h-4 text-amber-400" /> Cerveja
              </span>
              <span className="text-[10px] bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded font-mono font-bold">
                {summaryKpis.categoryTotals['Cerveja'].skus} SKUs
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">VM em Reais:</span>
                <strong className="font-mono text-emerald-400">R$ {summaryKpis.categoryTotals['Cerveja'].vmReais.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}/dia</strong>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">VM em Hectolitros:</span>
                <strong className="font-mono text-sky-400">{summaryKpis.categoryTotals['Cerveja'].vmHl.toFixed(1)} hL/dia</strong>
              </div>
            </div>
          </div>

          {/* 2. NAB (Bebidas Não Alcoólicas) */}
          <div className="bg-slate-900 border border-sky-500/30 p-4 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-sky-400 flex items-center gap-1.5">
                <CupSoda className="w-4 h-4 text-sky-400" /> NAB (Não Alcoólicos)
              </span>
              <span className="text-[10px] bg-sky-500/10 text-sky-300 px-2 py-0.5 rounded font-mono font-bold">
                {summaryKpis.categoryTotals['NAB'].skus} SKUs
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">VM em Reais:</span>
                <strong className="font-mono text-emerald-400">R$ {summaryKpis.categoryTotals['NAB'].vmReais.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}/dia</strong>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">VM em Hectolitros:</span>
                <strong className="font-mono text-sky-400">{summaryKpis.categoryTotals['NAB'].vmHl.toFixed(1)} hL/dia</strong>
              </div>
            </div>
          </div>

          {/* 3. MATCH (Drinks Prontos) */}
          <div className="bg-slate-900 border border-purple-500/30 p-4 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-purple-400 flex items-center gap-1.5">
                <Wine className="w-4 h-4 text-purple-400" /> Match (Drinks Prontos)
              </span>
              <span className="text-[10px] bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded font-mono font-bold">
                {summaryKpis.categoryTotals['Match'].skus} SKUs
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">VM em Reais:</span>
                <strong className="font-mono text-emerald-400">R$ {summaryKpis.categoryTotals['Match'].vmReais.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}/dia</strong>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">VM em Hectolitros:</span>
                <strong className="font-mono text-sky-400">{summaryKpis.categoryTotals['Match'].vmHl.toFixed(1)} hL/dia</strong>
              </div>
            </div>
          </div>

          {/* 4. MARKETPLACE (Produtos Não Ambev) */}
          <div className="bg-slate-900 border border-rose-500/30 p-4 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-rose-400 flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-rose-400" /> Marketplace
              </span>
              <span className="text-[10px] bg-rose-500/10 text-rose-300 px-2 py-0.5 rounded font-mono font-bold">
                {summaryKpis.categoryTotals['Marketplace'].skus} SKUs
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">VM em Reais:</span>
                <strong className="font-mono text-emerald-400">R$ {summaryKpis.categoryTotals['Marketplace'].vmReais.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}/dia</strong>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">VM em Hectolitros:</span>
                <strong className="font-mono text-sky-400">{summaryKpis.categoryTotals['Marketplace'].vmHl.toFixed(1)} hL/dia</strong>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* FILTER CONTROLS & DETAILED DATA TABLE */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-tight flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-emerald-400" />
              Tabela Completa de Curva ABC & Venda Média ({filteredList.length} SKUs)
            </h3>
            <p className="text-xs text-slate-400">
              Alterne filtros por categoria e classe ABC para visualizar a Venda Média em Reais e Hectolitros.
            </p>
          </div>

          {/* FILTERS TOOLBAR */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* SEARCH */}
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Buscar SKU ou produto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500 text-white"
              />
            </div>

            {/* CATEGORY FILTER (4 CLASSIFICAÇÕES + TODOS) */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-black uppercase text-slate-400 px-2">Categoria:</span>
              {(['TODAS', 'Cerveja', 'NAB', 'Match', 'Marketplace'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase transition-all cursor-pointer ${
                    categoryFilter === cat
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* PARETO ABC FILTER */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-black uppercase text-slate-400 px-2">Classe:</span>
              {(['TODAS', 'A', 'B', 'C'] as const).map((cls) => (
                <button
                  key={cls}
                  onClick={() => setClassAbcFilter(cls)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase transition-all cursor-pointer ${
                    classAbcFilter === cls
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cls}
                </button>
              ))}
            </div>

          </div>
        </div>

        {/* TABLE DATA */}
        {filteredList.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl space-y-2">
            <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
            <h4 className="text-sm font-bold text-white">Nenhum produto encontrado para os filtros selecionados</h4>
            <p className="text-xs text-slate-400">
              Importe o arquivo do relatório 03.05.19 para o {activeQuarter} ou limpe a pesquisa.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto border-2 border-slate-700/80 rounded-2xl shadow-xl scrollbar-thin scrollbar-thumb-amber-500/80 scrollbar-track-slate-900/80 bg-white dark:bg-[#11192e] p-1">
            <table className="w-full min-w-[1300px] text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/90 text-slate-500 dark:text-slate-300 font-black uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-3 text-center whitespace-nowrap">Rank</th>
                  <th className="py-3 px-3 whitespace-nowrap">Código</th>
                  <th className="py-3 px-3 min-w-[200px]">Descrição do Produto</th>
                  <th className="py-3 px-3 text-center whitespace-nowrap">Categoria</th>
                  <th className="py-3 px-3 text-right font-bold text-amber-400 whitespace-nowrap">Venda Média (cx/d)</th>
                  <th className="py-3 px-3 text-right font-bold text-emerald-400 whitespace-nowrap">Venda Média (R$/dia)</th>
                  <th className="py-3 px-3 text-right font-bold text-sky-400 whitespace-nowrap">Venda Média (hL/dia)</th>
                  <th className="py-3 px-3 text-right text-amber-300 whitespace-nowrap">% Acumulado</th>
                  <th className="py-3 px-3 text-center whitespace-nowrap min-w-[100px]">Classe ABC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                {filteredList.map((item) => {
                  let abcBadge = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
                  if (item.classeABC === 'B') abcBadge = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
                  if (item.classeABC === 'C') abcBadge = 'bg-rose-500/10 text-rose-400 border-rose-500/30';

                  let catBadge = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
                  if (item.categoria === 'NAB') catBadge = 'bg-sky-500/10 text-sky-400 border-sky-500/30';
                  if (item.categoria === 'Match') catBadge = 'bg-purple-500/10 text-purple-400 border-purple-500/30';
                  if (item.categoria === 'Marketplace') catBadge = 'bg-rose-500/10 text-rose-400 border-rose-500/30';

                  return (
                    <tr key={item.codigo} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-400 whitespace-nowrap">#{item.rank}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-400 whitespace-nowrap">{item.codigo}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-200">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{item.produto}</span>
                          <span className="text-[10px] font-normal text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded font-mono">
                            {item.unidade}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <select
                          value={item.categoria}
                          onChange={(e) => handleCategoryOverride(item.codigo, e.target.value as ProductCategoria)}
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border cursor-pointer bg-slate-900 focus:outline-none whitespace-nowrap ${catBadge}`}
                        >
                          <option value="Cerveja">Cerveja</option>
                          <option value="NAB">NAB</option>
                          <option value="Match">Match</option>
                          <option value="Marketplace">Marketplace</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-amber-400 text-xs whitespace-nowrap">
                        {item.vendaMediaDiaria.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-400 whitespace-nowrap">
                        R$ {item.vendaMediaReais.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-sky-400 whitespace-nowrap">
                        {item.vendaMediaHectolitro.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} hL
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-300 whitespace-nowrap">
                        {item.percentualAcumulado?.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleAbcOverride(item.codigo, item.classeABC)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border cursor-pointer transition-all hover:scale-105 whitespace-nowrap inline-flex items-center justify-center ${abcBadge}`}
                          title="Clique para alternar a Classe ABC manualmente"
                        >
                          Classe {item.classeABC}
                        </button>
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
  );
}
