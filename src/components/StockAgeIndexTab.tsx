import React, { useState, useMemo } from 'react';
import { ValidadeRow, Usuario, Empresa } from '../types';
import { db, isCustomFirebaseConnected } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { 
  AlertTriangle, 
  Clock, 
  Download, 
  Upload, 
  Search, 
  TrendingDown, 
  ShieldAlert, 
  ShieldCheck, 
  Building2, 
  Boxes
} from 'lucide-react';
import { useEmpresaData } from '../context/EmpresaDataContext';
import { PRODUCT_MASTER_DATA } from '../data/productMasterData';
import { 
  calculateStockAgeIndex, 
  calculateStockAgeSummary, 
  StockAgeStatus 
} from '../utils/calculateStockAgeIndex';

interface StockAgeIndexTabProps {
  validadesList: ValidadeRow[];
  user: Usuario;
  empresa: Empresa | null;
  onRefresh?: () => void;
}

export interface CalculatedStockAgeRow {
  _docId?: string;
  id: number;
  codigo: string;
  descricao: string;
  lote: string;
  quantidade: number;
  dataVencimento: string; // YYYY-MM-DD
  vidaUtilTotal: number | null;  // dias (idade cadastrada do produto)
  diasRestantes: number;  // dias
  stockAgeIndex: number;  // % (0 - 100)
  status: StockAgeStatus;
  idadeMissing: boolean;
  statusLabel: string;
  valorTotal: number;
  localizacao: string;
  bloco?: string;
  setor: 'Bloco A' | 'Bloco B' | 'Bloco CB' | 'Bloco C' | 'Picking' | 'Marketplace' | 'Contingência';
}

export default function StockAgeIndexTab({ validadesList, user, empresa, onRefresh }: StockAgeIndexTabProps) {
  const empresaData = useEmpresaData();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'Crítico' | 'Atenção' | 'OK' | 'sem_idade'>('todos');
  const [faixaVencFilter, setFaixaVencFilter] = useState<string>('todos');
  const [loteFilter, setLoteFilter] = useState<string>('todos');
  const [setorFilter, setSetorFilter] = useState<string>('todos');
  const [isImporting, setIsImporting] = useState(false);
  const [customRows, setCustomRows] = useState<CalculatedStockAgeRow[]>([]);
  const [sortAsc, setSortAsc] = useState(true);

  const todayObj = new Date();
  todayObj.setHours(0, 0, 0, 0);
  const todayISO = todayObj.toISOString().substring(0, 10);

  // Helper to determine sector from street/bloco/location
  const getSetor = (blocoStr?: string, locStr?: string): 'Bloco A' | 'Bloco B' | 'Bloco CB' | 'Bloco C' | 'Picking' | 'Marketplace' | 'Contingência' => {
    const combined = `${blocoStr || ''} ${locStr || ''}`.toUpperCase().trim();
    if (combined.includes('MARKETPLACE') || combined.includes('MKT')) return 'Marketplace';
    if (combined.includes('CONTINGÊNCIA') || combined.includes('CONTINGENCIA') || combined.includes('CONT')) return 'Contingência';
    if (combined.includes('PICKING') || combined.includes('PICK')) return 'Picking';
    if (combined.includes('CB') || combined.includes('BLOCO CB')) return 'Bloco CB';
    if (combined.includes('A1') || combined.includes('A2') || combined.includes('A3') || combined.includes('A4') || combined.includes('BLOCO A') || combined.startsWith('A')) return 'Bloco A';
    if (combined.includes('B1') || combined.includes('B2') || combined.includes('B3') || combined.includes('B4') || combined.includes('BLOCO B') || combined.startsWith('B')) return 'Bloco B';
    if (combined.includes('C1') || combined.includes('C2') || combined.includes('C3') || combined.includes('C4') || combined.includes('BLOCO C') || combined.startsWith('C')) return 'Bloco C';
    return 'Bloco A';
  };

  // 1. Unifica itens de mesmo código e validade e calcula Stock Age Index oficial
  const processedRows = useMemo(() => {
    const map = new Map<string, CalculatedStockAgeRow>();

    validadesList.forEach((item, idx) => {
      const codigo = String(item.codigo || '0000').trim();
      const validadeStr = item.validade || todayISO;
      const key = `${codigo}_${validadeStr}`;

      const quantidade = Number((item as any).quantidade) || (Number(item.palhete || 1) * Number(item.lastro || 1) * Number(item.caixa || 1)) || Number(item.caixa || 1);
      const descricao = String(item.descricao || 'Produto sem descrição').trim();

      // Product price
      const pMaster = PRODUCT_MASTER_DATA.find(pm => String(pm.cod) === codigo);
      const pCtx = empresaData?.produtos?.find(p => String(p.codigo).trim() === codigo);
      const unitPrice = Number(pCtx?.valor) || Number(pMaster?.valor) || 50.0;
      const valorTotal = quantidade * unitPrice;

      // Single source of truth calculation
      const calcResult = calculateStockAgeIndex({
        codigo,
        descricao,
        validade: validadeStr
      }, empresaData?.produtos);

      const setor = getSetor(item.bloco, item.localizacao);

      if (map.has(key)) {
        const existing = map.get(key)!;
        existing.quantidade += quantidade;
        existing.valorTotal += valorTotal;
        existing.lote = '-';
      } else {
        let cleanedLote = (item as any).lote || '';
        if (!cleanedLote || cleanedLote.startsWith('L-') || cleanedLote.startsWith(`L-${codigo}`)) {
          cleanedLote = '-';
        }

        map.set(key, {
          _docId: item._docId || `${codigo}_${validadeStr}_${idx}`,
          id: item.id || (idx + 1),
          codigo,
          descricao,
          lote: cleanedLote,
          quantidade,
          dataVencimento: validadeStr,
          vidaUtilTotal: calcResult.idadeCadastrada,
          diasRestantes: calcResult.diasRestantes,
          stockAgeIndex: calcResult.stockAgeIndex,
          status: calcResult.status,
          idadeMissing: calcResult.idadeMissing,
          statusLabel: calcResult.statusLabel,
          valorTotal,
          localizacao: item.localizacao || 'central',
          bloco: item.bloco,
          setor
        } as CalculatedStockAgeRow);
      }
    });

    return Array.from(map.values());
  }, [validadesList, todayISO, empresaData?.produtos]);

  const allRows = useMemo(() => {
    return [...processedRows, ...customRows];
  }, [processedRows, customRows]);

  const uniqueLotes = useMemo(() => {
    const lotes = new Set<string>();
    allRows.forEach(r => { if (r.lote && r.lote !== '-') lotes.add(r.lote); });
    return Array.from(lotes).sort();
  }, [allRows]);

  // Overall Stats Summary using calculateStockAgeSummary
  const stats = useMemo(() => {
    const summary = calculateStockAgeSummary(allRows);
    const total = summary.totalItens;
    const criticoPct = total > 0 ? Math.round((summary.criticoCount / total) * 100) : 0;
    const atencaoPct = total > 0 ? Math.round((summary.atencaoCount / total) * 100) : 0;
    const okPct = total > 0 ? Math.round((summary.okCount / total) * 100) : 0;

    return {
      total,
      avgIndex: summary.avgIndex,
      criticoCount: summary.criticoCount,
      criticoPct,
      atencaoCount: summary.atencaoCount,
      atencaoPct,
      okCount: summary.okCount,
      okPct,
      missingIdadeCount: summary.missingIdadeCount,
      totalValor: summary.totalValor
    };
  }, [allRows]);

  // 2. Visão Agregada por Setor
  const sectorAggrStats = useMemo(() => {
    const sectorKeys: Array<'Bloco A' | 'Bloco B' | 'Bloco CB' | 'Bloco C' | 'Picking' | 'Marketplace' | 'Contingência'> = [
      'Bloco A', 'Bloco B', 'Bloco CB', 'Bloco C', 'Picking', 'Marketplace', 'Contingência'
    ];

    const map: Record<string, { count: number; totalQty: number; totalValor: number; sumIndex: number; validCount: number; criticoCount: number }> = {};
    sectorKeys.forEach(k => {
      map[k] = { count: 0, totalQty: 0, totalValor: 0, sumIndex: 0, validCount: 0, criticoCount: 0 };
    });

    allRows.forEach(r => {
      const sKey = r.setor || 'Bloco A';
      if (!map[sKey]) {
        map[sKey] = { count: 0, totalQty: 0, totalValor: 0, sumIndex: 0, validCount: 0, criticoCount: 0 };
      }
      map[sKey].count++;
      map[sKey].totalQty += r.quantidade;
      map[sKey].totalValor += r.valorTotal || 0;
      if (!r.idadeMissing) {
        map[sKey].sumIndex += r.stockAgeIndex;
        map[sKey].validCount++;
        if (r.status === 'Crítico') map[sKey].criticoCount++;
      } else {
        map[sKey].criticoCount++;
      }
    });

    return sectorKeys.map(key => {
      const item = map[key];
      const avgIndex = item.validCount > 0 ? Math.round((item.sumIndex / item.validCount) * 10) / 10 : 0;
      let status: StockAgeStatus = 'OK';
      if (avgIndex < 60) status = 'Crítico';
      else if (avgIndex <= 75) status = 'Atenção';

      return {
        setor: key,
        lotesCount: item.count,
        totalCaixas: item.totalQty,
        totalValor: item.totalValor,
        avgStockAgeIndex: avgIndex,
        criticoCount: item.criticoCount,
        status
      };
    });
  }, [allRows]);

  // Product Meta Mapping (Grupo & Curva ABC)
  const productMetaMap = useMemo(() => {
    const map = new Map<string, { grupo: string; curva: string }>();
    if (empresaData?.produtos) {
      empresaData.produtos.forEach(p => {
        if (p.codigo) {
          map.set(String(p.codigo).trim(), {
            grupo: p.grupo || 'Outros',
            curva: (p as any).curva || 'B'
          });
        }
      });
    }
    PRODUCT_MASTER_DATA.forEach(p => {
      const codeStr = String(p.cod).trim();
      if (!map.has(codeStr)) {
        map.set(codeStr, {
          grupo: (p as any).grupo || 'Outros',
          curva: (p as any).curva || 'B'
        });
      }
    });
    return map;
  }, [empresaData?.produtos]);

  // 3. Card Agregado por Grupo
  const grupoAggrStats = useMemo(() => {
    const map: Record<string, { count: number; totalQty: number; totalValor: number; sumIndex: number; validCount: number; criticoCount: number }> = {};
    allRows.forEach(r => {
      const meta = productMetaMap.get(r.codigo);
      const grupo = meta?.grupo || 'Outros';
      if (!map[grupo]) {
        map[grupo] = { count: 0, totalQty: 0, totalValor: 0, sumIndex: 0, validCount: 0, criticoCount: 0 };
      }
      map[grupo].count++;
      map[grupo].totalQty += r.quantidade;
      map[grupo].totalValor += r.valorTotal || 0;
      if (!r.idadeMissing) {
        map[grupo].sumIndex += r.stockAgeIndex;
        map[grupo].validCount++;
        if (r.status === 'Crítico') map[grupo].criticoCount++;
      } else {
        map[grupo].criticoCount++;
      }
    });

    return Object.entries(map).map(([grupo, data]) => {
      const avgIndex = data.validCount > 0 ? Math.round((data.sumIndex / data.validCount) * 10) / 10 : 0;
      let status: StockAgeStatus = 'OK';
      if (avgIndex < 60) status = 'Crítico';
      else if (avgIndex <= 75) status = 'Atenção';
      return {
        grupo,
        count: data.count,
        totalQty: data.totalQty,
        totalValor: data.totalValor,
        avgStockAgeIndex: avgIndex,
        criticoCount: data.criticoCount,
        status
      };
    }).sort((a, b) => b.totalValor - a.totalValor);
  }, [allRows, productMetaMap]);

  // 4. Card Agregado por Curva ABC
  const curvaAggrStats = useMemo(() => {
    const map: Record<string, { count: number; totalQty: number; totalValor: number; sumIndex: number; validCount: number; criticoCount: number }> = {
      'Curva A': { count: 0, totalQty: 0, totalValor: 0, sumIndex: 0, validCount: 0, criticoCount: 0 },
      'Curva B': { count: 0, totalQty: 0, totalValor: 0, sumIndex: 0, validCount: 0, criticoCount: 0 },
      'Curva C': { count: 0, totalQty: 0, totalValor: 0, sumIndex: 0, validCount: 0, criticoCount: 0 },
    };

    allRows.forEach(r => {
      const meta = productMetaMap.get(r.codigo);
      const rawCurva = meta?.curva || 'B';
      const cKey = rawCurva.toUpperCase().includes('A') ? 'Curva A' : rawCurva.toUpperCase().includes('C') ? 'Curva C' : 'Curva B';
      map[cKey].count++;
      map[cKey].totalQty += r.quantidade;
      map[cKey].totalValor += r.valorTotal || 0;
      if (!r.idadeMissing) {
        map[cKey].sumIndex += r.stockAgeIndex;
        map[cKey].validCount++;
        if (r.status === 'Crítico') map[cKey].criticoCount++;
      } else {
        map[cKey].criticoCount++;
      }
    });

    return Object.entries(map).map(([curva, data]) => {
      const avgIndex = data.validCount > 0 ? Math.round((data.sumIndex / data.validCount) * 10) / 10 : 0;
      let status: StockAgeStatus = 'OK';
      if (avgIndex < 60) status = 'Crítico';
      else if (avgIndex <= 75) status = 'Atenção';
      return {
        curva,
        count: data.count,
        totalQty: data.totalQty,
        totalValor: data.totalValor,
        avgStockAgeIndex: avgIndex,
        criticoCount: data.criticoCount,
        status
      };
    });
  }, [allRows, productMetaMap]);

  // 5. Card Agregado por Meses (Histórico dos últimos 12 meses)
  const mesesAggrStats = useMemo(() => {
    const monthLabels: Record<string, { label: string; count: number; totalQty: number; totalValor: number; sumIndex: number; validCount: number; criticoCount: number }> = {};
    
    // Generate last 12 months
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthName = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).toUpperCase();
      monthLabels[key] = { label: monthName, count: 0, totalQty: 0, totalValor: 0, sumIndex: 0, validCount: 0, criticoCount: 0 };
    }

    allRows.forEach(r => {
      if (!r.dataVencimento) return;
      const key = r.dataVencimento.substring(0, 7);
      if (!monthLabels[key]) {
        const d = new Date(r.dataVencimento + 'T00:00:00');
        const monthName = isNaN(d.getTime()) ? key : d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).toUpperCase();
        monthLabels[key] = { label: monthName, count: 0, totalQty: 0, totalValor: 0, sumIndex: 0, validCount: 0, criticoCount: 0 };
      }

      monthLabels[key].count++;
      monthLabels[key].totalQty += r.quantidade;
      monthLabels[key].totalValor += r.valorTotal || 0;
      if (!r.idadeMissing) {
        monthLabels[key].sumIndex += r.stockAgeIndex;
        monthLabels[key].validCount++;
        if (r.status === 'Crítico') monthLabels[key].criticoCount++;
      } else {
        monthLabels[key].criticoCount++;
      }
    });

    return Object.entries(monthLabels)
      .map(([key, data]) => {
        const avgIndex = data.validCount > 0 ? Math.round((data.sumIndex / data.validCount) * 10) / 10 : 0;
        let status: StockAgeStatus = 'OK';
        if (avgIndex < 60) status = 'Crítico';
        else if (avgIndex <= 75) status = 'Atenção';
        return {
          key,
          label: data.label,
          count: data.count,
          totalQty: data.totalQty,
          totalValor: data.totalValor,
          avgStockAgeIndex: avgIndex,
          criticoCount: data.criticoCount,
          status
        };
      })
      .filter(m => m.count > 0)
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [allRows]);

  // Filter & Sort for Table View
  const filteredAndSortedRows = useMemo(() => {
    let result = allRows.filter(r => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchCode = r.codigo.toLowerCase().includes(q);
        const matchDesc = r.descricao.toLowerCase().includes(q);
        const matchLote = r.lote.toLowerCase().includes(q);
        if (!matchCode && !matchDesc && !matchLote) return false;
      }

      if (statusFilter === 'sem_idade') {
        if (!r.idadeMissing) return false;
      } else if (statusFilter !== 'todos' && r.status !== statusFilter) {
        return false;
      }

      if (setorFilter !== 'todos' && r.setor !== setorFilter) {
        return false;
      }

      if (loteFilter !== 'todos' && r.lote !== loteFilter) {
        return false;
      }

      if (faixaVencFilter === 'vencidos' && r.diasRestantes >= 0) return false;
      if (faixaVencFilter === '30d' && (r.diasRestantes < 0 || r.diasRestantes > 30)) return false;
      if (faixaVencFilter === '31-60d' && (r.diasRestantes <= 30 || r.diasRestantes > 60)) return false;
      if (faixaVencFilter === '61-90d' && (r.diasRestantes <= 60 || r.diasRestantes > 90)) return false;
      if (faixaVencFilter === '90d+' && r.diasRestantes <= 90) return false;

      return true;
    });

    result.sort((a, b) => {
      if (a.idadeMissing && !b.idadeMissing) return -1;
      if (!a.idadeMissing && b.idadeMissing) return 1;
      if (sortAsc) return a.stockAgeIndex - b.stockAgeIndex;
      return b.stockAgeIndex - a.stockAgeIndex;
    });

    return result;
  }, [allRows, searchTerm, statusFilter, setorFilter, loteFilter, faixaVencFilter, sortAsc]);

  // File Importer
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!jsonData || jsonData.length === 0) {
          alert('Arquivo vazio ou em formato inválido!');
          setIsImporting(false);
          return;
        }

        const newImportedRows: CalculatedStockAgeRow[] = [];

        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i];
          const cleanKeys: Record<string, any> = {};
          Object.keys(row).forEach(k => {
            cleanKeys[k.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')] = row[k];
          });

          const codigo = String(cleanKeys.codigo || cleanKeys.cod || cleanKeys.sku || cleanKeys.material || (1000 + i)).trim();
          const descricao = String(cleanKeys.produto || cleanKeys.descricao || cleanKeys.desc || cleanKeys.nome || 'Produto Importado').trim();
          const lote = String(cleanKeys.lote || cleanKeys.batch || `LOT-${codigo}-${i}`).trim();
          const quantidade = Number(cleanKeys.quantidade || cleanKeys.caixas || cleanKeys.qtd || cleanKeys.unidades || 1);
          const localizacaoStr = String(cleanKeys.localizacao || cleanKeys.local || cleanKeys.rua || cleanKeys.bloco || 'central');

          let validadeVal = cleanKeys.validade || cleanKeys.vencimento || cleanKeys.data_vencimento || cleanKeys.dt_venc || todayISO;
          if (typeof validadeVal === 'number') {
            validadeVal = new Date((validadeVal - (25567 + 2)) * 86400 * 1000).toISOString().substring(0, 10);
          } else if (String(validadeVal).includes('/')) {
            const parts = String(validadeVal).split('/');
            if (parts.length === 3) {
              validadeVal = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
          }
          const validadeStr = String(validadeVal).substring(0, 10);

          const calcResult = calculateStockAgeIndex({
            codigo,
            descricao,
            validade: validadeStr
          }, empresaData?.produtos);

          const unitPrice = 50.0;
          const valorTotal = quantidade * unitPrice;
          const setor = getSetor(cleanKeys.bloco, localizacaoStr);

          const newRowObj: CalculatedStockAgeRow = {
            id: Date.now() + i,
            codigo,
            descricao,
            lote,
            quantidade,
            dataVencimento: validadeStr,
            vidaUtilTotal: calcResult.idadeCadastrada,
            diasRestantes: calcResult.diasRestantes,
            stockAgeIndex: calcResult.stockAgeIndex,
            status: calcResult.status,
            idadeMissing: calcResult.idadeMissing,
            statusLabel: calcResult.statusLabel,
            valorTotal,
            localizacao: localizacaoStr,
            setor
          };

          newImportedRows.push(newRowObj);

          if (db && isCustomFirebaseConnected()) {
            try {
              await addDoc(collection(db, 'validades'), {
                empresaId: empresa?.id || 'demo',
                codigo,
                descricao,
                palhete: 1,
                lastro: 1,
                caixa: quantidade,
                validade: validadeStr,
                lote,
                quantidade,
                localizacao: localizacaoStr,
                _criadoEm: new Date().toISOString()
              });
            } catch (err) {
              console.error('Erro ao salvar no firebase:', err);
            }
          }
        }

        setCustomRows(prev => [...prev, ...newImportedRows]);
        setIsImporting(false);
        alert(`Sucesso! ${newImportedRows.length} registros importados e calculados no Stock Age Index.`);
        if (onRefresh) onRefresh();
      } catch (err) {
        console.error(err);
        alert('Erro ao processar a planilha. Verifique a estrutura das colunas.');
        setIsImporting(false);
      }
    };

    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const formatDateBR = (dateStr: string) => {
    if (!dateStr) return '-';
    if (dateStr.includes('/')) return dateStr;
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  const handleExportExcel = () => {
    if (filteredAndSortedRows.length === 0) {
      alert('Nenhum dado disponível para exportar.');
      return;
    }

    const excelData = filteredAndSortedRows.map(r => ({
      'Código': r.codigo,
      'Produto': r.descricao,
      'Lote': r.lote,
      'Setor': r.setor,
      'Quantidade (Cx)': r.quantidade,
      'Valoração (R$)': r.valorTotal,
      'Data Vencimento': formatDateBR(r.dataVencimento),
      'Idade Cadastrada (Dias)': r.idadeMissing ? 'NÃO CADASTRADA' : r.vidaUtilTotal,
      'Dias Restantes': r.diasRestantes,
      'Stock Age Index (%)': r.idadeMissing ? 'N/A' : `${r.stockAgeIndex}%`,
      'Status': r.statusLabel,
      'Localização': r.localizacao
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock Age Index');
    XLSX.writeFile(workbook, `Guia_Geral_Stock_Age_Index_${empresa?.id || 'Armazem'}_${todayISO}.xlsx`);
  };

  const handleExportPDF = () => {
    if (filteredAndSortedRows.length === 0) {
      alert('Nenhum dado para exportar.');
      return;
    }

    const doc = new jsPDF('landscape');
    doc.setFontSize(14);
    doc.text(`Relatório Oficial Stock Age Index - ${empresa?.nome || 'Armazém Fácil'}`, 16, 20);
    doc.setFontSize(9);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')} | Empresa ID: ${empresa?.id || 'Demo'}`, 16, 28);
    doc.text(`Total Analisado: ${stats.total} itens | Crítico: ${stats.criticoCount} | Atenção: ${stats.atencaoCount} | OK: ${stats.okCount} | Stock Age Médio: ${stats.avgIndex}%`, 16, 36);

    let startY = 46;
    doc.setFillColor(30, 41, 59);
    doc.rect(14, startY, 268, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('CÓDIGO', 16, startY + 5);
    doc.text('PRODUTO', 45, startY + 5);
    doc.text('SETOR', 120, startY + 5);
    doc.text('QTD (CX)', 155, startY + 5);
    doc.text('VENCIMENTO', 185, startY + 5);
    doc.text('IDADE', 220, startY + 5);
    doc.text('AGE INDEX %', 245, startY + 5);

    startY += 9;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    filteredAndSortedRows.slice(0, 30).forEach((r, idx) => {
      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, startY, 268, 6, 'F');
      }

      doc.text(String(r.codigo), 16, startY + 4.5);
      doc.text(String(r.descricao).substring(0, 32), 45, startY + 4.5);
      doc.text(String(r.setor), 120, startY + 4.5);
      doc.text(String(r.quantidade), 155, startY + 4.5);
      doc.text(formatDateBR(r.dataVencimento), 185, startY + 4.5);
      doc.text(r.idadeMissing ? 'N/C' : `${r.vidaUtilTotal}d`, 220, startY + 4.5);
      doc.text(r.idadeMissing ? 'N/A' : `${r.stockAgeIndex}%`, 245, startY + 4.5);

      startY += 7.5;
    });

    doc.save(`Stock_Age_Index_${todayISO}.pdf`);
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER PRINCIPAL DA GUIA STOCK AGE INDEX */}
      <div className="bg-[#111822] p-5 rounded-2xl border border-[#222d3a] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-black text-white tracking-wide uppercase flex items-center gap-2">
              📊 Stock Age Index (Fórmula Oficial)
            </h2>
            <span className="bg-[#1b2533] text-purple-400 border border-purple-500/30 px-3 py-1 rounded-full text-xs font-mono font-extrabold">
              {allRows.length} SKUs Únicos
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Maturidade de estoque calculada por: <strong className="text-purple-300">Dias Restantes ÷ Idade Cadastrada no Produto × 100</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <label className="bg-[#16202c] hover:bg-[#202d3e] text-slate-200 border border-[#283648] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors">
            <Upload className="w-4 h-4 text-purple-400" />
            <span>{isImporting ? 'Importando...' : 'Importar Planilha'}</span>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" disabled={isImporting} />
          </label>

          <button
            onClick={handleExportExcel}
            className="bg-[#16202c] hover:bg-[#202d3e] text-emerald-400 border border-emerald-500/30 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Exportar Excel</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="bg-[#16202c] hover:bg-[#202d3e] text-purple-400 border border-purple-500/30 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Exportar Relatório</span>
          </button>
        </div>
      </div>

      {/* ALERT SE HOUVER ITENS SEM IDADE CADASTRADA */}
      {stats.missingIdadeCount > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/40 p-4 rounded-2xl flex items-center justify-between text-amber-300 text-xs font-bold gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <span className="font-extrabold uppercase block text-amber-200">
                ⚠ {stats.missingIdadeCount} produto(s) na base de validades sem &quot;Idade&quot; cadastrada!
              </span>
              <span className="text-[11px] text-amber-300/80 font-normal">
                Estes itens foram excluídos do cálculo médio geral de Stock Age Index. Cadastre a vida útil em dias no Cadastro de Produtos para incluir na média.
              </span>
            </div>
          </div>
          <button
            onClick={() => setStatusFilter('sem_idade')}
            className="bg-amber-500/20 hover:bg-amber-500/40 text-amber-200 border border-amber-500/40 px-3 py-1.5 rounded-xl text-[11px] uppercase tracking-wider font-extrabold shrink-0 cursor-pointer"
          >
            Ver {stats.missingIdadeCount} Itens
          </button>
        </div>
      )}

      {/* CARDS RESUMO DE CLASSIFICAÇÃO */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#111822] p-4 rounded-2xl border border-red-500/20 bg-gradient-to-b from-red-500/5 to-transparent flex flex-col justify-between">
          <div className="flex items-center justify-between text-red-400 text-xs font-bold">
            <span className="flex items-center gap-1">🔴 Crítico (≤30d ou &lt;60%)</span>
            <ShieldAlert className="w-4 h-4 text-red-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-red-400 font-mono">{stats.criticoCount}</span>
            <span className="text-sm font-bold text-red-400/90">{stats.criticoPct}%</span>
          </div>
          <div className="w-full bg-slate-800/80 rounded-full h-1.5 mt-2 overflow-hidden">
            <div className="bg-red-500 h-full rounded-full transition-all" style={{ width: `${stats.criticoPct}%` }} />
          </div>
        </div>

        <div className="bg-[#111822] p-4 rounded-2xl border border-amber-500/20 bg-gradient-to-b from-amber-500/5 to-transparent flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-400 text-xs font-bold">
            <span className="flex items-center gap-1">🟡 Atenção (60% - 75%)</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-400 font-mono">{stats.atencaoCount}</span>
            <span className="text-sm font-bold text-amber-400/90">{stats.atencaoPct}%</span>
          </div>
          <div className="w-full bg-slate-800/80 rounded-full h-1.5 mt-2 overflow-hidden">
            <div className="bg-amber-500 h-full rounded-full transition-all" style={{ width: `${stats.atencaoPct}%` }} />
          </div>
        </div>

        <div className="bg-[#111822] p-4 rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-emerald-500/5 to-transparent flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-bold">
            <span className="flex items-center gap-1">🟢 OK (&gt; 75%)</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-400 font-mono">{stats.okCount}</span>
            <span className="text-sm font-bold text-emerald-400/90">{stats.okPct}%</span>
          </div>
          <div className="w-full bg-slate-800/80 rounded-full h-1.5 mt-2 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${stats.okPct}%` }} />
          </div>
        </div>

        <div className="bg-[#111822] p-4 rounded-2xl border border-purple-500/20 bg-gradient-to-b from-purple-500/5 to-transparent flex flex-col justify-between">
          <div className="flex items-center justify-between text-purple-400 text-xs font-bold">
            <span>Stock Age Médio Geral</span>
            <span className="text-[10px] text-purple-300 font-mono font-bold">R$ {stats.totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-purple-300 font-mono">{stats.avgIndex}%</span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
              stats.avgIndex < 60 ? 'bg-red-500/20 text-red-400' : stats.avgIndex <= 75 ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
            }`}>
              {stats.avgIndex < 60 ? 'Crítico' : stats.avgIndex <= 75 ? 'Atenção' : 'Excelente'}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">Validade média de giro das validades ativas</p>
        </div>
      </div>

      {/* VISÃO AGREGADA POR SETOR */}
      <div className="bg-[#111822] p-5 rounded-2xl border border-[#222d3a] flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-[#1f2b3a] pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                Visão Agregada por Setor (Média Stock Age Index)
              </h3>
              <p className="text-[11px] text-slate-400">
                Resumo da saúde de validades consolidado por setor do armazém.
              </p>
            </div>
          </div>
          {setorFilter !== 'todos' && (
            <button
              onClick={() => setSetorFilter('todos')}
              className="text-xs text-amber-400 hover:text-amber-300 underline font-bold cursor-pointer"
            >
              Remover Filtro ({setorFilter})
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {sectorAggrStats.map((st) => {
            const isSelected = setorFilter === st.setor;
            const isCrit = st.status === 'Crítico';
            const isAten = st.status === 'Atenção';

            return (
              <div
                key={st.setor}
                onClick={() => setSetorFilter(isSelected ? 'todos' : st.setor)}
                className={`p-3.5 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                  isSelected 
                    ? 'border-purple-500 bg-purple-950/30 shadow-lg scale-[1.02]' 
                    : isCrit
                    ? 'border-red-500/30 bg-red-950/10 hover:border-red-500/60'
                    : isAten
                    ? 'border-amber-500/30 bg-amber-950/10 hover:border-amber-500/60'
                    : 'border-[#222d3a] bg-[#16202c] hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className="text-xs font-extrabold text-white truncate" title={st.setor}>
                    {st.setor}
                  </span>
                  <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                    isCrit ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                    isAten ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {st.avgStockAgeIndex}%
                  </span>
                </div>

                <div className="space-y-1 my-1">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>SKUs:</span>
                    <strong className="text-slate-200 font-mono">{st.lotesCount}</strong>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Volume:</span>
                    <strong className="text-slate-200 font-mono">{st.totalCaixas} cx</strong>
                  </div>
                  <div className="flex justify-between text-[10px] text-purple-300 font-bold">
                    <span>Valoração:</span>
                    <strong className="font-mono">R$ {Math.round(st.totalValor).toLocaleString('pt-BR')}</strong>
                  </div>
                </div>

                <div className="w-full bg-slate-800 rounded-full h-1 mt-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      isCrit ? 'bg-red-500' : isAten ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.max(0, Math.min(100, st.avgStockAgeIndex))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ESTRATIFICAÇÕES: POR GRUPO, POR CURVA ABC E POR MÊS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CARD POR GRUPO DE PRODUTO */}
        <div className="bg-[#111822] p-5 rounded-2xl border border-[#222d3a] shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              <h3 className="font-sans font-black text-xs uppercase text-white tracking-wider">
                Estratificação por Grupo de Produto
              </h3>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              Índice médio, volume, valoração R$ e SKUs críticos por família.
            </p>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {grupoAggrStats.map((grp) => {
              const isCrit = grp.status === 'Crítico';
              const isAten = grp.status === 'Atenção';
              return (
                <div key={grp.grupo} className="bg-[#16202c] p-3 rounded-xl border border-[#222d3a] flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-200">{grp.grupo}</span>
                    <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded ${
                      isCrit ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                      isAten ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {grp.avgStockAgeIndex}%
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>Vol: {grp.totalQty.toLocaleString('pt-BR')} cx</span>
                    <span className="text-purple-300 font-bold">R$ {Math.round(grp.totalValor).toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>{grp.count} SKUs</span>
                    {grp.criticoCount > 0 && <strong className="text-red-400">({grp.criticoCount} críticos)</strong>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CARD POR CURVA ABC */}
        <div className="bg-[#111822] p-5 rounded-2xl border border-[#222d3a] shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              <h3 className="font-sans font-black text-xs uppercase text-white tracking-wider">
                Estratificação por Curva (A / B / C)
              </h3>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              Acompanhamento do indicador para produtos de alto, médio e baixo giro.
            </p>
          </div>

          <div className="space-y-3">
            {curvaAggrStats.map((crv) => {
              const isCrit = crv.status === 'Crítico';
              const isAten = crv.status === 'Atenção';
              const colorBadge = crv.curva === 'Curva A' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                                 crv.curva === 'Curva B' ? 'bg-sky-500/20 text-sky-300 border-sky-500/40' :
                                 'bg-amber-500/20 text-amber-300 border-amber-500/40';

              return (
                <div key={crv.curva} className="bg-[#16202c] p-3 rounded-xl border border-[#222d3a] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded border ${colorBadge}`}>
                      {crv.curva}
                    </span>
                    <span className={`text-xs font-mono font-black px-2 py-0.5 rounded ${
                      isCrit ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                      isAten ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {crv.avgStockAgeIndex}%
                    </span>
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-300 font-mono">
                    <span>Estoque: <strong className="text-white">{crv.totalQty.toLocaleString('pt-BR')} cx</strong></span>
                    <span className="text-purple-300 font-bold">R$ {Math.round(crv.totalValor).toLocaleString('pt-BR')}</span>
                  </div>

                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>SKUs: <strong className="text-white">{crv.count}</strong></span>
                    {crv.criticoCount > 0 && <span className="text-red-400 font-bold">{crv.criticoCount} críticos</span>}
                  </div>

                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        isCrit ? 'bg-red-500' : isAten ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.max(0, Math.min(100, crv.avgStockAgeIndex))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CARD POR MÊS DE VENCIMENTO */}
        <div className="bg-[#111822] p-5 rounded-2xl border border-[#222d3a] shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <h3 className="font-sans font-black text-xs uppercase text-white tracking-wider">
                Estratificação por Mês de Vencimento
              </h3>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              Tendência e evolução do Stock Age Index ao longo dos meses de validade.
            </p>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {mesesAggrStats.map((ms) => {
              const isCrit = ms.status === 'Crítico';
              const isAten = ms.status === 'Atenção';
              return (
                <div key={ms.key} className="bg-[#16202c] p-2.5 rounded-xl border border-[#222d3a] flex items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-200">{ms.label}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {ms.totalQty.toLocaleString('pt-BR')} cx | R$ {Math.round(ms.totalValor).toLocaleString('pt-BR')}
                    </span>
                  </div>

                  <span className={`text-xs font-mono font-black px-2.5 py-1 rounded ${
                    isCrit ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                    isAten ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {ms.avgStockAgeIndex}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* FILTROS E PESQUISA */}
      <div className="bg-[#111822] p-4 rounded-2xl border border-[#222d3a] flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por produto, código ou lote..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-[#16202c] border border-[#283648] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          <select
            value={setorFilter}
            onChange={e => setSetorFilter(e.target.value)}
            className="bg-[#16202c] border border-[#283648] text-xs text-slate-200 font-medium rounded-xl px-3 py-2 focus:outline-none focus:border-purple-500"
          >
            <option value="todos">🏬 Todos os Setores</option>
            <option value="Bloco A">Bloco A</option>
            <option value="Bloco B">Bloco B</option>
            <option value="Bloco CB">Bloco CB</option>
            <option value="Bloco C">Bloco C</option>
            <option value="Picking">Picking</option>
            <option value="Marketplace">Marketplace</option>
            <option value="Contingência">Contingência</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="bg-[#16202c] border border-[#283648] text-xs text-slate-200 font-medium rounded-xl px-3 py-2 focus:outline-none focus:border-purple-500"
          >
            <option value="todos">🎯 Todos os Status</option>
            <option value="Crítico">🔴 Crítico (≤30d / &lt;60%)</option>
            <option value="Atenção">🟡 Atenção (60% - 75%)</option>
            <option value="OK">🟢 OK (&gt; 75%)</option>
            <option value="sem_idade">⚠ Sem Idade Cadastrada</option>
          </select>

          <select
            value={faixaVencFilter}
            onChange={e => setFaixaVencFilter(e.target.value)}
            className="bg-[#16202c] border border-[#283648] text-xs text-slate-200 font-medium rounded-xl px-3 py-2 focus:outline-none focus:border-purple-500"
          >
            <option value="todos">📅 Todas as Faixas</option>
            <option value="vencidos">⚠️ Já Vencidos</option>
            <option value="30d">⏳ 0 a 30 Dias Restantes</option>
            <option value="31-60d">⏳ 31 a 60 Dias Restantes</option>
            <option value="61-90d">⏳ 61 a 90 Dias Restantes</option>
            <option value="90d+">⏳ Mais de 90 Dias</option>
          </select>

          {uniqueLotes.length > 0 && (
            <select
              value={loteFilter}
              onChange={e => setLoteFilter(e.target.value)}
              className="bg-[#16202c] border border-[#283648] text-xs text-slate-200 font-medium rounded-xl px-3 py-2 focus:outline-none focus:border-purple-500 max-w-[150px] truncate"
            >
              <option value="todos">📦 Todos os Lotes</option>
              {uniqueLotes.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          )}

          <button
            onClick={() => setSortAsc(!sortAsc)}
            className="bg-[#16202c] hover:bg-[#202d3e] border border-[#283648] text-xs text-slate-300 font-medium rounded-xl px-3 py-2 flex items-center gap-1.5 cursor-pointer"
            title="Alterar ordenação do Stock Age Index"
          >
            <TrendingDown className={`w-3.5 h-3.5 transition-transform ${sortAsc ? '' : 'rotate-180'}`} />
            <span>{sortAsc ? 'Menor Age Index' : 'Maior Age Index'}</span>
          </button>
        </div>
      </div>

      {/* TABELA DE PRODUTOS / LOTES */}
      <div className="bg-[#111822] rounded-2xl border border-[#222d3a] overflow-hidden shadow-xl">
        <div className="px-5 py-3.5 bg-[#16202c] border-b border-[#222d3a] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Boxes className="w-4 h-4 text-purple-400" />
            <h4 className="text-xs font-black text-white uppercase tracking-wider">
              Tabela Stock Age Index por Lote / Validade ({filteredAndSortedRows.length} registros únicos)
            </h4>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            Unificado por Código + Validade | Derivado do Cadastro de Produtos
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse min-w-[950px]">
            <thead>
              <tr className="bg-[#111822] border-b border-[#222d3a] text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4 text-center">Produto / Descrição</th>
                <th className="py-3.5 px-3 text-center">Código</th>
                <th className="py-3.5 px-3 text-center">Lote</th>
                <th className="py-3.5 px-3 text-center">Setor / Local</th>
                <th className="py-3.5 px-3 text-center">Quantidade</th>
                <th className="py-3.5 px-3 text-center">Valoração</th>
                <th className="py-3.5 px-3 text-center">Data Vencimento</th>
                <th className="py-3.5 px-3 text-center">Idade Cadastrada</th>
                <th className="py-3.5 px-3 text-center">Dias Restantes</th>
                <th className="py-3.5 px-3 text-center">Stock Age Index (%)</th>
                <th className="py-3.5 px-4 text-center">Classificação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b] text-xs text-center">
              {filteredAndSortedRows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500 font-medium">
                    Nenhum lote encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredAndSortedRows.map((row, idx) => {
                  const isCritico = row.status === 'Crítico' || row.idadeMissing;
                  const isAtencao = row.status === 'Atenção' && !row.idadeMissing;

                  let rowStyle = 'hover:bg-[#1a2536] transition-colors';
                  if (row.idadeMissing) {
                    rowStyle = 'bg-amber-500/10 hover:bg-amber-500/15 border-l-4 border-l-amber-500';
                  } else if (isCritico) {
                    rowStyle = 'bg-red-500/5 hover:bg-red-500/10 border-l-4 border-l-red-500';
                  } else if (isAtencao) {
                    rowStyle = 'bg-amber-500/5 hover:bg-amber-500/10 border-l-4 border-l-amber-500';
                  } else {
                    rowStyle = 'bg-emerald-500/5 hover:bg-emerald-500/10 border-l-4 border-l-emerald-500';
                  }

                  return (
                    <tr key={row._docId || row.id || idx} className={rowStyle}>
                      
                      {/* PRODUTO */}
                      <td className="py-3 px-4 text-center font-semibold text-white">
                        <div className="flex flex-col items-center justify-center">
                          <span className="truncate max-w-[240px]" title={row.descricao}>
                            {row.descricao}
                          </span>
                        </div>
                      </td>

                      {/* CÓDIGO */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-300">
                        {row.codigo}
                      </td>

                      {/* LOTE */}
                      <td className="py-3 px-3 text-center font-mono text-purple-300 font-semibold">
                        {row.lote}
                      </td>

                      {/* SETOR / LOCAL */}
                      <td className="py-3 px-3 text-center">
                        <span className="bg-[#1b2533] text-slate-300 border border-slate-700 px-2 py-0.5 rounded text-[10px] font-bold inline-block">
                          {row.setor} ({row.localizacao})
                        </span>
                      </td>

                      {/* QUANTIDADE */}
                      <td className="py-3 px-3 text-center font-bold text-slate-200">
                        {row.quantidade} <span className="text-[10px] text-slate-400 font-normal">cx</span>
                      </td>

                      {/* VALORAÇÃO */}
                      <td className="py-3 px-3 text-center font-mono text-purple-300 font-bold">
                        R$ {Math.round(row.valorTotal).toLocaleString('pt-BR')}
                      </td>

                      {/* DATA VENCIMENTO */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-200">
                        {formatDateBR(row.dataVencimento)}
                      </td>

                      {/* IDADE CADASTRADA */}
                      <td className="py-3 px-3 text-center font-mono font-bold">
                        {row.idadeMissing ? (
                          <span className="text-amber-400 text-[10px] bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                            ⚠ Não Cadastrada
                          </span>
                        ) : (
                          <span className="text-amber-300">
                            {row.vidaUtilTotal} <span className="text-[10px] text-slate-400 font-normal">dias</span>
                          </span>
                        )}
                      </td>

                      {/* DIAS RESTANTES */}
                      <td className={`py-3 px-3 text-center font-bold font-mono ${
                        row.diasRestantes < 0 ? 'text-red-400' : row.diasRestantes <= 30 ? 'text-amber-400' : 'text-slate-200'
                      }`}>
                        {row.diasRestantes < 0 ? `${row.diasRestantes}d (Vencido)` : `${row.diasRestantes}d`}
                      </td>

                      {/* STOCK AGE INDEX (%) */}
                      <td className="py-3 px-3 text-center">
                        {row.idadeMissing ? (
                          <span className="text-slate-500 font-mono text-xs">N/A</span>
                        ) : (
                          <div className="flex flex-col items-center">
                            <span className={`font-mono font-black text-sm ${
                              isCritico ? 'text-red-400' : isAtencao ? 'text-amber-400' : 'text-emerald-400'
                            }`}>
                              {row.stockAgeIndex}%
                            </span>
                            <div className="w-16 bg-slate-800 rounded-full h-1 mt-1 overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${
                                  isCritico ? 'bg-red-500' : isAtencao ? 'bg-amber-500' : 'bg-emerald-500'
                                }`} 
                                style={{ width: `${Math.max(0, Math.min(100, row.stockAgeIndex))}%` }} 
                              />
                            </div>
                          </div>
                        )}
                      </td>

                      {/* STATUS BADGE */}
                      <td className="py-3 px-4 text-center">
                        {row.idadeMissing ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            <AlertTriangle className="w-3 h-3 text-amber-400" />
                            ⚠ Idade não cadastrada
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase border ${
                            isCritico 
                              ? 'bg-red-500/10 text-red-400 border-red-500/30' 
                              : isAtencao 
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          }`}>
                            {isCritico && <ShieldAlert className="w-3 h-3" />}
                            {isAtencao && <Clock className="w-3 h-3" />}
                            {!isCritico && !isAtencao && <ShieldCheck className="w-3 h-3" />}
                            {row.status}
                          </span>
                        )}
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-[#16202c] p-3 px-4 border-t border-[#222d3a] flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
          <div>
            Exibindo <strong className="text-white">{filteredAndSortedRows.length}</strong> de <strong className="text-white">{allRows.length}</strong> lotes cadastrados
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Crítico (≤30d / &lt;60%)</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Atenção (60-75%)</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> OK (&gt;75%)</span>
          </div>
        </div>
      </div>

    </div>
  );
}
