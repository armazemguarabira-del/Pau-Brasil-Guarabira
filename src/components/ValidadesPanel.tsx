import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { db, isCustomFirebaseConnected } from '../firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Usuario, Empresa, ValidadeRow } from '../types';
import { useEmpresaData } from '../context/EmpresaDataContext';
import { PRODUCTS } from '../planosData';
import SugerirMelhoriaCard from './SugerirMelhoriaCard';
import { SopBannerViewer } from './SopBannerViewer';
import { filterHistoryForUser, HistoryRestrictionNotice } from '../utils/historyFilter';
import { calcularQuebrasFefoEstoqueXEstoque, calcularQuebrasFefoEstoqueXPicking } from '../utils/matrizBlocos';
import { 
  syncFefoDemandsFromValidades, 
  getStoredFefoDemands,
  requestFefoDemand,
  requestAllFefoDemands,
  cancelFefoDemandRequest
} from '../utils/fefoDemandManager';
import StockAgeIndexTab from './StockAgeIndexTab';
import FuturoShelfTab from './FuturoShelfTab';
import GestaoEscoamentoTab from './GestaoEscoamentoTab';
import { WorkstationCriticosRecolhimento } from './WorkstationCriticosRecolhimento';
import { getInitialDefaultValidades } from '../utils/fefoDefaultData';

interface ValidadesPanelProps {
  user: Usuario;
  empresa: Empresa | null;
  theme?: 'light' | 'dark';
  hideSugerirMelhoria?: boolean;
}

export default function ValidadesPanel({ user, empresa, hideSugerirMelhoria }: ValidadesPanelProps) {
  const empresaId = empresa?.id || 'demo';
  const draftKey = `validades_draft_${empresaId}_${user.nome || 'guest'}`;

  // Helper to load safe initial state
  const getDraftValue = (key: string, defaultValue: any) => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed[key] !== undefined) return parsed[key];
      }
    } catch (e) {
      console.error(e);
    }
    return defaultValue;
  };

  const formatISODateToInput = (isoStr: string): string => {
    if (!isoStr) return '';
    const parts = isoStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return isoStr;
  };

  const parseInputDateToISO = (dateStr: string): string | null => {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    let [dayStr, monthStr, yearStr] = parts;
    if (!dayStr || !monthStr || !yearStr) return null;
    const d = dayStr.padStart(2, '0');
    const m = monthStr.padStart(2, '0');
    let y = yearStr;
    if (y.length === 2) {
      y = '20' + y;
    }
    if (y.length !== 4) return null;
    const isoDate = `${y}-${m}-${d}`;
    const timestamp = Date.parse(isoDate + 'T00:00:00');
    if (isNaN(timestamp)) return null;
    return isoDate;
  };

  const [produtoBusca, setProdutoBusca] = useState<string>(() => getDraftValue('produtoBusca', ''));
  const [selectedProd, setSelectedProd] = useState<{ codigo: number, descricao: string } | null>(() => getDraftValue('selectedProd', null));
  const [showDropdown, setShowProdDropdown] = useState(false);

  const [palhete, setPalhete] = useState<number>(() => getDraftValue('palhete', 0));
  const [lastro, setLastro] = useState<number>(() => getDraftValue('lastro', 0));
  const [caixa, setCaixa] = useState<number>(() => getDraftValue('caixa', 0));
  const [validade, setValidade] = useState<string>(() => getDraftValue('validade', ''));
  const [validadeInput, setValidadeInput] = useState<string>(() => {
    const val = getDraftValue('validade', '');
    return formatISODateToInput(val);
  });
  const [localizacao, setLocalizacao] = useState<string>(() => getDraftValue('localizacao', 'central'));
  const [bloco, setBloco] = useState<string>(() => getDraftValue('bloco', ''));

  const [activeTab, setActiveTab] = useState<'form' | 'lista' | 'stock_age' | 'futuro_shelf' | 'escoamento' | 'fefo_quadro' | 'fefo_picking' | 'fefo_estoque'>('form');
  const [validadesList, setValidadesList] = useState<ValidadeRow[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Immediate notification modal for FEFO breaks upon entry or import
  const [importBreaksModalData, setImportBreaksModalData] = useState<{
    isOpen: boolean;
    title: string;
    source: 'single' | 'import';
    pickingBreaks: any[];
    estoqueBreaks: any[];
  } | null>(null);

  // Modal for inspecting specific product FEFO lot details
  const [selectedProductAlert, setSelectedProductAlert] = useState<{
    codigo: string;
    descricao: string;
  } | null>(null);

  const quebrasFefoEstoque = React.useMemo(() => {
    return calcularQuebrasFefoEstoqueXEstoque(validadesList);
  }, [validadesList]);

  const quebrasFefoPicking = React.useMemo(() => {
    return calcularQuebrasFefoEstoqueXPicking(validadesList);
  }, [validadesList]);

  // FEFO relocation demands state & automatic sync
  const [fefoDemands, setFefoDemands] = useState(() => getStoredFefoDemands(empresaId));

  useEffect(() => {
    if (validadesList) {
      const synced = syncFefoDemandsFromValidades(empresaId, validadesList);
      setFefoDemands(synced);
    }
  }, [validadesList, empresaId]);

  useEffect(() => {
    const handleFefoUpdate = () => {
      setFefoDemands(getStoredFefoDemands(empresaId));
    };
    window.addEventListener('fefo_demands_updated', handleFefoUpdate);
    window.addEventListener('storage', handleFefoUpdate);
    window.addEventListener('local_data_changed', handleFefoUpdate);
    return () => {
      window.removeEventListener('fefo_demands_updated', handleFefoUpdate);
      window.removeEventListener('storage', handleFefoUpdate);
      window.removeEventListener('local_data_changed', handleFefoUpdate);
    };
  }, [empresaId]);

  const renderDelegationStatus = (
    tipoQuebra: 'estoque_x_picking' | 'estoque_x_estoque',
    codigo: string
  ) => {
    const cod = String(codigo).trim();
    const matching = fefoDemands.find(d => 
      String(d.codigo).trim() === cod &&
      d.tipoQuebra === tipoQuebra
    );

    if (!matching || !matching.solicitadoPorConferente) {
      return (
        <div className="p-2 bg-[#0d1218] border border-[#222d3a] rounded-lg flex items-center justify-between text-xs mt-2">
          <span className="text-[10px] font-bold text-slate-400">
            Demanda para Empilhador:
          </span>
          <button
            type="button"
            onClick={() => {
              if (matching) {
                requestFefoDemand(empresaId, matching.id, user.nome || 'Conferente');
              } else {
                requestAllFefoDemands(empresaId, user.nome || 'Conferente');
              }
              setFefoDemands(getStoredFefoDemands(empresaId));
            }}
            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] uppercase rounded flex items-center gap-1 cursor-pointer transition-colors shadow"
          >
            🚜 Delegar Realocação ao Empilhador
          </button>
        </div>
      );
    }

    return (
      <div className="p-2 bg-[#0d1218] border border-[#222d3a] rounded-lg flex items-center justify-between text-xs mt-2 flex-wrap gap-2">
        <span className="text-[10px] font-bold text-slate-400">
          Status Visão Empilhador:
        </span>
        {matching.status === 'done' ? (
          <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
            ✓ Realocação Concluída por {matching.operadorExecutor || 'Empilhador'} ({matching.duracaoMin || 1} min)
          </span>
        ) : matching.status === 'in_progress' ? (
          <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded animate-pulse">
            🚜 Em Andamento por {matching.operadorExecutor || 'Empilhador'}
          </span>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
              ⏳ Solicitado ao Empilhador (Aguardando Atendimento)
            </span>
            <button
              type="button"
              onClick={() => {
                cancelFefoDemandRequest(empresaId, matching.id);
                setFefoDemands(getStoredFefoDemands(empresaId));
              }}
              className="text-[9px] font-bold text-red-400 hover:text-red-300 underline cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    );
  };
  const [editingRow, setEditingRow] = useState<ValidadeRow | null>(null);
  const [registering, setRegistering] = useState(false);
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});
  const [draftRestored, setDraftRestored] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return !!(parsed.produtoBusca || parsed.selectedProd || parsed.palhete > 0 || parsed.lastro > 0 || parsed.caixa > 0 || parsed.validade || parsed.localizacao !== 'picking' || parsed.bloco);
      }
    } catch (e) {}
    return false;
  });

  const toggleDateGroup = (dateKey: string) => {
    setExpandedDates(prev => ({ ...prev, [dateKey]: !prev[dateKey] }));
  };

  // Filters
  const [filterLoc, setFilterLoc] = useState<string>('todos');
  const [filterBloco, setFilterBloco] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [sortOrder, setSortSort] = useState<'asc' | 'desc'>('asc');

  // Sync state with local draft saving (only when not editing an existing row)
  useEffect(() => {
    if (editingRow) return;
    const draftData = {
      produtoBusca,
      selectedProd,
      palhete,
      lastro,
      caixa,
      validade,
      localizacao,
      bloco
    };
    localStorage.setItem(draftKey, JSON.stringify(draftData));
  }, [produtoBusca, selectedProd, palhete, lastro, caixa, validade, localizacao, bloco, draftKey, editingRow]);

  // Sync with prop updates / user changing
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setProdutoBusca(parsed.produtoBusca || '');
        setSelectedProd(parsed.selectedProd || null);
        setPalhete(parsed.palhete || 0);
        setLastro(parsed.lastro || 0);
        setCaixa(parsed.caixa || 0);
        const val = parsed.validade || '';
        setValidade(val);
        setValidadeInput(formatISODateToInput(val));
        setLocalizacao(parsed.localizacao || 'central');
        setBloco(parsed.bloco || '');
        setDraftRestored(!!(parsed.produtoBusca || parsed.selectedProd || parsed.palhete > 0 || parsed.lastro > 0 || parsed.caixa > 0 || val || (parsed.localizacao && parsed.localizacao !== 'central') || parsed.bloco));
      } else {
        setProdutoBusca('');
        setSelectedProd(null);
        setPalhete(0);
        setLastro(0);
        setCaixa(0);
        setValidade('');
        setValidadeInput('');
        setLocalizacao('central');
        setBloco('');
        setDraftRestored(false);
      }
    } catch (e) {
      console.error(e);
    }
  }, [draftKey]);

  const empresaData = useEmpresaData();

  // Sync with Firestore (scoped to company) - Filter out repack validades
  useEffect(() => {
    let rows: ValidadeRow[] = [];
    if (!db) {
      const saved = localStorage.getItem(`validades_${empresaId}`);
      if (saved) {
        try {
          rows = JSON.parse(saved);
        } catch (e) {
          console.error(e);
        }
      }
    } else {
      rows = empresaData.validades || [];
    }

    // Exclude any repack validades so this panel ONLY shows conferente validades
    let conferenteRows = rows.filter((r: any) => {
      const loc = String(r.localizacao || '').toLowerCase();
      const origem = String(r.origem || '').toLowerCase();
      const setor = String(r.setor || '').toLowerCase();
      const tipo = String(r.tipo || '').toLowerCase();
      if (loc.includes('repack') || origem.includes('repack') || setor.includes('repack') || tipo.includes('repack') || r.isRepack) {
        return false;
      }
      return true;
    });

    if (conferenteRows.length === 0) {
      conferenteRows = getInitialDefaultValidades(empresaId || 'demo');
      try {
        localStorage.setItem(`validades_${empresaId || 'demo'}`, JSON.stringify(conferenteRows));
        localStorage.setItem(`armazem_validades_${empresaId || 'demo'}`, JSON.stringify(conferenteRows));
      } catch (e) {}
    }

    setValidadesList(conferenteRows);
    if (!db) {
      localStorage.setItem(`validades_${empresaId}`, JSON.stringify(conferenteRows));
    }
  }, [empresaData.validades, empresaId]);

  const getDaysRemaining = (expDate: string) => {
    if (!expDate) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(expDate + 'T00:00:00');
    return Math.round((exp.getTime() - today.getTime()) / 86400000);
  };

  const getStatusClass = (days: number) => {
    if (days < 0) return 'expired';
    if (days <= 30) return 'crit';
    if (days <= 45) return 'warn';
    if (days <= 60) return 'alert';
    return 'ok';
  };

  const getStatusLabelAndStyles = (days: number) => {
    if (days < 0) return { label: '⛔ VENCIDO', text: 'text-[#ef4444]', border: 'border-l-[#ef4444]', bg: 'bg-[#ef4444]/5' };
    if (days <= 30) return { label: '🔴 CRÍTICO', text: 'text-[#ef4444]', border: 'border-l-[#ef4444]', bg: 'bg-[#ef4444]/5' };
    if (days <= 45) return { label: '🟠 ATENÇÃO', text: 'text-[#f5a623]', border: 'border-l-[#f5a623]', bg: 'bg-[#f5a623]/5' };
    if (days <= 60) return { label: '🟡 ALERTA', text: 'text-[#eab308]', border: 'border-l-[#eab308]', bg: 'bg-[#eab308]/5' };
    return { label: '🟢 OK', text: 'text-[#22c55e]', border: 'border-l-[#22c55e]', bg: 'bg-[#22c55e]/5' };
  };

  // Stats Counters compiling helper
  const getStats = () => {
    const stats = { expired: 0, crit: 0, warn: 0, alert: 0, ok: 0 };
    validadesList.forEach(r => {
      const days = getDaysRemaining(r.validade);
      const cat = getStatusClass(days);
      stats[cat] = (stats[cat] || 0) + 1;
    });
    return stats;
  };

  const stats = getStats();

  const handleSelectProd = (p: { codigo: number, descricao: string }) => {
    setSelectedProd(p);
    setProdutoBusca(p.descricao);
    setShowProdDropdown(false);
  };

  const handleValidadeChange = (val: string) => {
    // Permite apenas dígitos e barras
    let cleaned = val.replace(/[^0-9/]/g, '');

    // Formatação automática (máscara) DD/MM/AAAA
    const digits = cleaned.replace(/\//g, '');
    let formatted = '';
    if (digits.length > 0) {
      formatted += digits.slice(0, 2);
    }
    if (digits.length > 2) {
      formatted += '/' + digits.slice(2, 4);
    }
    if (digits.length > 4) {
      formatted += '/' + digits.slice(4, 8);
    }

    const finalVal = formatted || cleaned;
    setValidadeInput(finalVal);

    const iso = parseInputDateToISO(finalVal);
    if (iso) {
      setValidade(iso);
    } else {
      setValidade('');
    }
  };

  const cleanForm = () => {
    setProdutoBusca('');
    setSelectedProd(null);
    setPalhete(0);
    setLastro(0);
    setCaixa(0);
    setValidade('');
    setValidadeInput('');
    // Preserva 'picking' se foi o local selecionado
    if (localizacao !== 'picking') {
      setLocalizacao('central');
    }
    setBloco('');
    setEditingRow(null);
    setDraftRestored(false);
    localStorage.removeItem(draftKey);
  };

  const handleDeleteAllValidades = async () => {
    if (!window.confirm('⚠️ Tem certeza que deseja EXCLUIR TODA A BASE DE VALIDADES?\nEsta ação apagará permanentemente todos os registros coletados para que você possa reimportar do zero.')) {
      return;
    }
    try {
      if (db) {
        for (const item of validadesList) {
          if (item._docId) {
            try { await deleteDoc(doc(db, 'validades', item._docId)); } catch(e){}
          }
        }
      }
      setValidadesList([]);
      localStorage.removeItem(`validades_${empresaId}`);
      localStorage.removeItem(`fefo_demands_${empresaId}`);
      window.dispatchEvent(new Event('fefo_demands_updated'));
      window.dispatchEvent(new Event('app_data_updated'));
      window.dispatchEvent(new Event('local_data_changed'));
      alert('✅ Toda a Base de Validades foi excluída com sucesso!');
    } catch (e) {
      alert('Erro ao excluir base de validades: ' + e);
    }
  };

  const handleSave = async () => {
    if (!validadeInput) {
      alert('Por favor, informe a data de vencimento.');
      return;
    }

    const isoDate = parseInputDateToISO(validadeInput);
    if (!isoDate) {
      alert('Data de vencimento inválida. Por favor, use o formato DD/MM/AAAA (ex: 25/07/2026).');
      return;
    }

    if (!selectedProd && !editingRow) {
      alert('Por favor, selecione um produto.');
      return;
    }

    setRegistering(true);

    const dataObj = {
      codigo: selectedProd ? String(selectedProd.codigo) : editingRow?.codigo || '',
      descricao: selectedProd ? selectedProd.descricao : editingRow?.descricao || '',
      palhete,
      lastro,
      caixa,
      validade: isoDate,
      localizacao,
      bloco: (localizacao === 'pnc' || localizacao === 'picking') ? '' : bloco,
    };

    try {
      let updatedListAfterSave = [...validadesList];

      if (editingRow) {
        // Edit Row Action update
        if (db && editingRow._docId) {
          await updateDoc(doc(db, 'validades', editingRow._docId), dataObj);
        }
        updatedListAfterSave = validadesList.map(item => item.id === editingRow.id ? { ...item, ...dataObj } : item);
        setValidadesList(updatedListAfterSave);
        localStorage.setItem(`validades_${empresaId}`, JSON.stringify(updatedListAfterSave));
        toast('Produto atualizado!');
      } else {
        // Sobrescrever registro anterior com a mesma combinação: código + localizacao + bloco (rua)
        const targetCod = String(dataObj.codigo).trim();
        const targetLoc = String(dataObj.localizacao).toLowerCase();
        const targetRua = String(dataObj.bloco || '').trim().toLowerCase();

        const filteredList = [];
        for (const item of validadesList) {
          const itemCod = String(item.codigo).trim();
          const itemLoc = String(item.localizacao || 'central').toLowerCase();
          const itemRua = String(item.bloco || '').trim().toLowerCase();

          if (itemCod === targetCod && itemLoc === targetLoc && itemRua === targetRua) {
            // Delete old match from Firestore if connected
            if (db && item._docId) {
              try { await deleteDoc(doc(db, 'validades', item._docId)); } catch (e) {}
            }
          } else {
            filteredList.push(item);
          }
        }

        const newRow: Omit<ValidadeRow, '_docId'> & { empresaId: string } = {
          empresaId,
          id: Date.now(),
          ...dataObj,
          cadastradoEm: new Date().toISOString()
        };

        if (db) {
          const docRef = await addDoc(collection(db, 'validades'), newRow);
          updatedListAfterSave = [...filteredList, { _docId: docRef.id, ...newRow }];
        } else {
          updatedListAfterSave = [...filteredList, { _docId: String(Date.now()), ...newRow }];
        }
        setValidadesList(updatedListAfterSave);
        localStorage.setItem(`validades_${empresaId}`, JSON.stringify(updatedListAfterSave));
        toast('Produto salvo (registro anterior da mesma combinação foi sobrescrito)!');
      }

      // Check for immediate FEFO breaks on this product
      const targetCode = String(dataObj.codigo).trim();
      const newPickingBreaks = calcularQuebrasFefoEstoqueXPicking(updatedListAfterSave);
      const newEstoqueBreaks = calcularQuebrasFefoEstoqueXEstoque(updatedListAfterSave);

      const relPicking = newPickingBreaks.filter(q => String(q.codigo).trim() === targetCode);
      const relEstoque = newEstoqueBreaks.filter(q => String(q.codigo).trim() === targetCode);

      if (relPicking.length > 0 || relEstoque.length > 0) {
        setImportBreaksModalData({
          isOpen: true,
          title: `⚠️ ATENÇÃO: Quebra de FEFO Identificada na Contagem!`,
          source: 'single',
          pickingBreaks: relPicking,
          estoqueBreaks: relEstoque,
        });
      }

      cleanForm();
      if (!relPicking.length && !relEstoque.length) {
        setActiveTab('lista');
      }
    } catch (e) {
      alert('Erro ao registrar validade: ' + e);
    } finally {
      setRegistering(false);
    }
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        if (!data || data.length === 0) {
          alert('A planilha importada está vazia.');
          return;
        }

        const newImportedRows: ValidadeRow[] = [];
        const importedKeys = new Set<string>();

        data.forEach((row, idx) => {
          const cod = String(row['Código'] || row['codigo'] || row['SKU'] || '0').trim();
          const desc = String(row['Descrição'] || row['descricao'] || row['Produto'] || row['produto'] || `Produto ${cod}`).trim();
          const valRaw = String(row['Validade'] || row['validade'] || row['Vencimento'] || row['dataVencimento'] || '').trim();
          let loc = String(row['Localização'] || row['localizacao'] || row['Local'] || 'central').toLowerCase();
          if (loc.includes('picking')) loc = 'picking';
          else if (loc.includes('pnc')) loc = 'pnc';
          else loc = 'central';

          const rua = (loc === 'pnc' || loc === 'picking') ? '' : String(row['Bloco'] || row['bloco'] || row['Rua'] || row['rua'] || '').trim();
          const pal = Number(row['Paletes'] || row['palhete'] || 0);
          const las = Number(row['Lastros'] || row['lastro'] || 0);
          const cx = Number(row['Caixas'] || row['caixa'] || row['Quantidade'] || 1);

          let iso = parseInputDateToISO(valRaw);
          if (!iso && valRaw.includes('-')) iso = valRaw;

          if (cod && desc && iso) {
            const key = `${cod.toLowerCase()}_${loc}_${rua.toLowerCase()}`;
            importedKeys.add(key);

            newImportedRows.push({
              _docId: `imp_${Date.now()}_${idx}`,
              id: Date.now() + idx,
              empresaId,
              codigo: cod,
              descricao: desc,
              palhete: pal,
              lastro: las,
              caixa: cx,
              validade: iso,
              localizacao: loc,
              bloco: rua,
              cadastradoEm: new Date().toISOString()
            });
          }
        });

        if (newImportedRows.length === 0) {
          alert('Nenhum registro válido encontrado. Certifique-se de que a planilha possui as colunas: Código, Descrição, Validade, Localização, Bloco.');
          return;
        }

        // Sobrescrever registros antigos com a mesma chave (código + localizacao + bloco)
        const remainingExisting = [];
        for (const oldItem of validadesList) {
          const k = `${String(oldItem.codigo).trim().toLowerCase()}_${String(oldItem.localizacao || 'central').trim().toLowerCase()}_${String(oldItem.bloco || '').trim().toLowerCase()}`;
          if (importedKeys.has(k)) {
            if (db && oldItem._docId) {
              try { await deleteDoc(doc(db, 'validades', oldItem._docId)); } catch (err) {}
            }
          } else {
            remainingExisting.push(oldItem);
          }
        }

        const addedRowsWithDocId: ValidadeRow[] = [];
        if (db) {
          for (const item of newImportedRows) {
            const { _docId, ...rest } = item;
            const docRef = await addDoc(collection(db, 'validades'), rest);
            addedRowsWithDocId.push({ _docId: docRef.id, ...item });
          }
        } else {
          addedRowsWithDocId.push(...newImportedRows);
        }

        const updated = [...remainingExisting, ...addedRowsWithDocId];
        setValidadesList(updated);
        localStorage.setItem(`validades_${empresaId}`, JSON.stringify(updated));

        const impPickingBreaks = calcularQuebrasFefoEstoqueXPicking(updated);
        const impEstoqueBreaks = calcularQuebrasFefoEstoqueXEstoque(updated);

        if (impPickingBreaks.length > 0 || impEstoqueBreaks.length > 0) {
          setImportBreaksModalData({
            isOpen: true,
            title: `⚠️ ATENÇÃO: Importação Concluída com ${impPickingBreaks.length + impEstoqueBreaks.length} Quebra(s) de FEFO Detectada(s)!`,
            source: 'import',
            pickingBreaks: impPickingBreaks,
            estoqueBreaks: impEstoqueBreaks
          });
        } else {
          alert(`✅ Importação realizada com sucesso! ${newImportedRows.length} lotes importados (registros anteriores da mesma chave foram sobrescritos).`);
        }
      } catch (err) {
        console.error(err);
        alert('Erro ao processar planilha de validades.');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleEditInit = (r: ValidadeRow) => {
    setEditingRow(r);
    setSelectedProd({ codigo: Number(r.codigo), descricao: r.descricao });
    setProdutoBusca(r.descricao);
    setPalhete(r.palhete);
    setLastro(r.lastro);
    setCaixa(r.caixa);
    setValidade(r.validade);
    setValidadeInput(formatISODateToInput(r.validade));
    setLocalizacao(r.localizacao);
    setBloco(r.bloco || '');
    setActiveTab('form');
  };

  const handleDelete = async (r: ValidadeRow) => {
    try {
      if (db && r._docId) {
        await deleteDoc(doc(db, 'validades', r._docId));
      }
    } catch (e) {
      console.error(e);
    } finally {
      const remaining = validadesList.filter(item => item.id !== r.id && item._docId !== r._docId);
      setValidadesList(remaining);
      localStorage.setItem(`validades_${empresaId}`, JSON.stringify(remaining));
      toast('Registro de validade excluído com sucesso');
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Excluir ABSOLUTAMENTE TODOS os registros de validade cadastrados?')) return;
    try {
      if (db) {
        for (const item of validadesList) {
          if (item._docId) await deleteDoc(doc(db, 'validades', item._docId));
        }
      } else {
        setValidadesList([]);
        localStorage.setItem(`validades_${empresaId}`, JSON.stringify([]));
      }
      toast('Todos os registros excluídos!');
    } catch (e) {
      alert('Erro ao excluir registros: ' + e);
    }
  };

  const toast = (m: string) => {
    const el = document.getElementById('toast');
    if (el) {
      el.style.background = '';
      el.style.color = '';
      el.textContent = m;
      el.className = 'toast show';
      setTimeout(() => {
        el.className = 'toast';
      }, 3000);
    }
  };

  // Pre-filter calculations
  const filteredProducts = PRODUCTS.filter(p => {
    const q = produtoBusca.toLowerCase();
    return String(p.codigo).includes(q) || p.descricao.toLowerCase().includes(q);
  }).slice(0, 10);

  // Helper to extract registration date key for history filtering
  const getRegDateKey = (item: ValidadeRow) => {
    const raw = item.cadastradoEm || (item as any).dataISO || (item as any).dataRegistro || (item as any).criadoEm || (item as any).createdAt || (item as any).data;
    if (raw) {
      const s = String(raw).trim();
      if (s.includes('T')) return s.split('T')[0];
      if (s.includes('-') && s.length >= 10) return s.slice(0, 10);
      if (s.includes('/')) {
        const parts = s.split('/');
        if (parts.length === 3) {
          const d = parts[0].padStart(2, '0');
          const m = parts[1].padStart(2, '0');
          const y = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
          return `${y}-${m}-${d}`;
        }
      }
    }
    // Fallback: if no registration date is present, group as registered today so current session lots stay together
    return new Date().toISOString().split('T')[0];
  };

  // Expiration entries mapping list
  const getFilteredEntries = () => {
    let rows = filterHistoryForUser(validadesList, user, getRegDateKey);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      rows = rows.filter(r => 
        String(r.codigo).toLowerCase().includes(q) || 
        r.descricao.toLowerCase().includes(q) ||
        (r.bloco || '').toLowerCase().includes(q)
      );
    }

    if (filterLoc !== 'todos') {
      rows = rows.filter(r => r.localizacao === filterLoc);
    }
    if (filterBloco !== 'todos') {
      rows = rows.filter(r => (r.bloco || '') === filterBloco);
    }
    if (filterStatus !== 'todos') {
      rows = rows.filter(r => {
        const days = getDaysRemaining(r.validade);
        return getStatusClass(days) === filterStatus;
      });
    }

    // Sort order
    rows.sort((a, b) => {
      const order = (a.validade || '').localeCompare(b.validade || '');
      return sortOrder === 'asc' ? order : -order;
    });

    return rows;
  };

  const entriesToDisplay = getFilteredEntries();

  return (
    <div className="flex flex-col gap-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-[#11151c] border border-[#222d3a] rounded-xl w-full gap-3">
        <span className="font-sans font-black text-sm tracking-widest text-[#8b5cf6] uppercase">🏷 CONTROLE DE VALIDADES — GESTÃO FEFO</span>
        <div className="flex gap-2 items-center">
          <label className="py-1 px-3 bg-[#8b5cf6]/15 border border-[#8b5cf6]/30 hover:bg-[#8b5cf6] text-[#c4b5fd] hover:text-white rounded-lg text-[10px] font-bold tracking-wide uppercase transition-colors cursor-pointer flex items-center gap-1">
            📥 Importar Planilha
            <input type="file" accept=".xlsx, .xls, .csv" onChange={handleImportExcel} className="hidden" />
          </label>
          <button onClick={handleDeleteAllValidades} className="py-1 px-3 bg-[#ef4444]/15 border border-[#ef4444]/30 hover:bg-[#ef4444] text-[#fca5a5] hover:text-white rounded-lg text-[10px] font-bold tracking-wide uppercase transition-colors cursor-pointer">
            🗑 Excluir Base de Validades
          </button>
        </div>
      </div>

      {/* PAINEL DE ACOMPANHAMENTO DE ITENS CRÍTICOS (JANELA DE 45 DIAS) WORKSTATION CCO / CONFERENTE */}
      <WorkstationCriticosRecolhimento
        validadesList={validadesList}
        user={user}
        empresa={empresa}
      />

      {/* Expiry Risk Level Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="g-card p-3 text-center border-t-2 border-t-[#7f1d1d] bg-[#7f1d1d]/5">
          <span className="font-sans font-black text-2xl text-red leading-none">{stats.expired}</span>
          <span className="block text-[8px] text-[#6a7d92] uppercase font-bold tracking-wider mt-1">Vencido</span>
          <span className="block text-[8px] text-[#6a7d92]/80 font-semibold mt-0.5">⚠️ Perda integral</span>
        </div>
        <div className="g-card p-3 text-center border-t-2 border-t-[#ef4444] bg-[#ef4444]/5">
          <span className="font-sans font-black text-2xl text-[#ef4444] leading-none">{stats.crit}</span>
          <span className="block text-[8px] text-[#6a7d92] uppercase font-bold tracking-wider mt-1">Crítico</span>
          <span className="block text-[8px] text-[#6a7d92]/80 font-semibold mt-0.5">≤ 30 dias</span>
        </div>
        <div className="g-card p-3 text-center border-t-2 border-t-[#f5a623] bg-[#f5a623]/5">
          <span className="font-sans font-black text-2xl text-[#f5a623] leading-none">{stats.warn}</span>
          <span className="block text-[8px] text-[#6a7d92] uppercase font-bold tracking-wider mt-1">Atenção</span>
          <span className="block text-[8px] text-[#6a7d92]/80 font-semibold mt-0.5">31–45 dias</span>
        </div>
        <div className="g-card p-3 text-center border-t-2 border-t-[#eab308] bg-[#eab308]/5">
          <span className="font-sans font-black text-2xl text-[#eab308] leading-none">{stats.alert}</span>
          <span className="block text-[8px] text-[#6a7d92] uppercase font-bold tracking-wider mt-1">Alerta</span>
          <span className="block text-[8px] text-[#6a7d92]/80 font-semibold mt-0.5">46–60 dias</span>
        </div>
        <div className="g-card p-3 text-center border-t-2 border-t-[#22c55e] bg-[#22c55e]/5 col-span-2 md:col-span-1">
          <span className="font-sans font-black text-2xl text-[#22c55e] leading-none">{stats.ok}</span>
          <span className="block text-[8px] text-[#6a7d92] uppercase font-bold tracking-wider mt-1">Garantido</span>
          <span className="block text-[8px] text-[#22c55e]/70 font-semibold mt-0.5">&gt; 60 dias (FEFO OK)</span>
        </div>
      </div>

      {/* Standard Operating Procedure (POP / SOP) Banner for Operator */}
      <SopBannerViewer operation="fefo" operationName="FEFO / Validades" />

      <div className="ptabs border-b border-[#222d3a] flex gap-2">
        <button 
          onClick={() => setActiveTab('form')}
          className={`ptab py-2 px-6 font-sans font-bold text-xs uppercase cursor-pointer relative ${activeTab === 'form' ? 'text-[#8b5cf6] border-b-2 border-b-[#8b5cf6]' : 'text-[#6a7d92] hover:text-[#e8eef5]'}`}
        >
          {editingRow ? '✏️ Editar Lote' : '📝 Cadastrar Lote'}
        </button>
        <button 
          onClick={() => setActiveTab('lista')}
          className={`ptab py-2 px-6 font-sans font-bold text-xs uppercase cursor-pointer relative ${activeTab === 'lista' ? 'text-[#8b5cf6] border-b-2 border-b-[#8b5cf6]' : 'text-[#6a7d92] hover:text-[#e8eef5]'}`}
        >
          📋 Lista do Estoque <span className="ml-1.5 px-2 py-0.5 rounded-full bg-[#151b23] border border-[#222d3a] text-[10px] text-snow">{filterHistoryForUser(validadesList, user, getRegDateKey).length}</span>
        </button>
        <button 
          onClick={() => setActiveTab('stock_age')}
          className={`ptab py-2 px-6 font-sans font-bold text-xs uppercase cursor-pointer relative ${activeTab === 'stock_age' ? 'text-purple-400 border-b-2 border-b-purple-500 font-extrabold' : 'text-[#6a7d92] hover:text-[#e8eef5]'}`}
        >
          📊 Stock Age Index (%)
        </button>
        <button 
          onClick={() => setActiveTab('futuro_shelf')}
          className={`ptab py-2 px-6 font-sans font-bold text-xs uppercase cursor-pointer relative ${activeTab === 'futuro_shelf' ? 'text-amber-400 border-b-2 border-b-amber-500 font-extrabold' : 'text-[#6a7d92] hover:text-[#e8eef5]'}`}
        >
          ⚡ Futuro Shelf (Janela 30d)
        </button>
        <button 
          onClick={() => setActiveTab('escoamento')}
          className={`ptab py-2 px-6 font-sans font-bold text-xs uppercase cursor-pointer relative ${activeTab === 'escoamento' ? 'text-rose-400 border-b-2 border-b-rose-500 font-extrabold' : 'text-[#6a7d92] hover:text-[#e8eef5]'}`}
        >
          📉 Gestão de Escoamento
        </button>
        <button 
          onClick={() => setActiveTab('fefo_quadro')}
          className={`ptab py-2 px-6 font-sans font-bold text-xs uppercase cursor-pointer relative ${activeTab === 'fefo_quadro' ? 'text-red-400 border-b-2 border-b-red-500 font-extrabold' : 'text-[#6a7d92] hover:text-[#e8eef5]'}`}
        >
          🚨 Quadro Alertas FEFO {(quebrasFefoPicking.length + quebrasFefoEstoque.length) > 0 && <span className="ml-1.5 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-black">{quebrasFefoPicking.length + quebrasFefoEstoque.length}</span>}
        </button>
        <button 
          onClick={() => setActiveTab('fefo_picking')}
          className={`ptab py-2 px-6 font-sans font-bold text-xs uppercase cursor-pointer relative ${activeTab === 'fefo_picking' ? 'text-red-400 border-b-2 border-b-red-500 font-extrabold' : 'text-[#6a7d92] hover:text-[#e8eef5]'}`}
        >
          ⚡ Estoque x Picking {quebrasFefoPicking.length > 0 && <span className="ml-1.5 px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black">{quebrasFefoPicking.length}</span>}
        </button>
        <button 
          onClick={() => setActiveTab('fefo_estoque')}
          className={`ptab py-2 px-6 font-sans font-bold text-xs uppercase cursor-pointer relative ${activeTab === 'fefo_estoque' ? 'text-amber-400 border-b-2 border-b-amber-500 font-extrabold' : 'text-[#6a7d92] hover:text-[#e8eef5]'}`}
        >
          🔍 Estoque x Estoque {quebrasFefoEstoque.length > 0 && <span className="ml-1.5 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-black">{quebrasFefoEstoque.length}</span>}
        </button>
      </div>

      {activeTab === 'form' ? (
        <div className="g-card p-6 flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222d3a] pb-3">
            <h3 className="font-sans font-bold text-sm tracking-wider uppercase text-[#8b5cf6]">
              {editingRow ? 'Editar Lote de Validade' : 'Registrar Validade de Lote de Carga'}
            </h3>
            <div className="flex items-center gap-1.5 text-[9px] text-[#22c55e] font-black uppercase tracking-wider bg-[#22c55e]/5 px-2.5 py-1 rounded-lg border border-[#22c55e]/15">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              Salvo automaticamente
            </div>
          </div>

          {draftRestored && !editingRow && (
            <div className="flex items-center justify-between gap-3 bg-amber-500/10 border border-amber-500/25 px-4 py-3 rounded-xl text-xs text-amber-300">
              <div className="flex items-center gap-2 font-medium">
                <span>⚡ Dados anteriores restaurados do rascunho salvo!</span>
              </div>
              <button 
                type="button"
                onClick={cleanForm}
                className="text-[9px] uppercase font-black tracking-wider text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
              >
                Limpar formulário
              </button>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            
            {/* Real-time search autocomplete */}
            <div className="flex flex-col gap-1.5 md:col-span-8 relative">
              <label className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#6a7d92]">Produto (Código ou Descrição) *</label>
              <input 
                type="text"
                placeholder="Busque pelo produto..."
                disabled={!!editingRow}
                value={produtoBusca}
                onChange={e => {
                  setProdutoBusca(e.target.value);
                  setShowProdDropdown(true);
                  if (selectedProd && e.target.value !== selectedProd.descricao) {
                    setSelectedProd(null);
                  }
                }}
                onFocus={() => setShowProdDropdown(true)}
                className="g-input disabled:opacity-50"
              />
              {showDropdown && produtoBusca && filteredProducts.length > 0 && (
                <div className="absolute top-[103%] left-0 right-0 bg-white border border-slate-200 shadow-xl rounded-xl z-50 max-h-48 overflow-y-auto">
                  {filteredProducts.map((p, idx) => (
                    <div 
                      key={`${p.codigo}_${idx}`}
                      onClick={() => handleSelectProd(p)}
                      className="p-3 border-b border-slate-100 hover:bg-slate-50 cursor-pointer text-xs flex justify-between"
                    >
                      <span className="font-bold text-amber-600">{p.codigo}</span>
                      <span className="truncate flex-1 ml-4 text-slate-800 font-medium text-left">{p.descricao}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5 md:col-span-4">
              <label className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#6a7d92]">Código SKU</label>
              <input 
                type="text" 
                readOnly
                placeholder="Auto"
                value={selectedProd ? selectedProd.codigo : ''}
                className="g-input text-center text-[#f5a623] font-bold font-mono opacity-80"
              />
            </div>

          </div>

          <div className="grid grid-cols-3 gap-3 p-4 bg-[#151b23]/50 border border-[#222d3a] rounded-xl">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold tracking-[1px] uppercase text-[#6a7d92] text-center">Quant. Paletes</label>
              <input 
                type="number"
                min={0}
                value={palhete}
                onChange={e => setPalhete(Math.max(0, parseInt(e.target.value) || 0))}
                className="g-input text-center text-md font-bold text-snow"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold tracking-[1px] uppercase text-[#6a7d92] text-center">Quant. Lastros</label>
              <input 
                type="number"
                min={0}
                value={lastro}
                onChange={e => setLastro(Math.max(0, parseInt(e.target.value) || 0))}
                className="g-input text-center text-md font-bold text-snow"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold tracking-[1px] uppercase text-[#6a7d92] text-center">Quant. SKUs</label>
              <input 
                type="number"
                min={0}
                value={caixa}
                onChange={e => setCaixa(Math.max(0, parseInt(e.target.value) || 0))}
                className="g-input text-center text-md font-bold text-snow"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#6a7d92]">Data de Vencimento *</label>
              <input 
                type="text"
                required
                placeholder="DD/MM/AAAA"
                value={validadeInput}
                onChange={e => handleValidadeChange(e.target.value)}
                className="g-input text-snow h-[42px]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#6a7d92]">Local de Contagem / Origem *</label>
              <select 
                value={localizacao} 
                onChange={e => {
                  const val = e.target.value;
                  setLocalizacao(val);
                  if (val === 'pnc' || val === 'picking') {
                    setBloco('');
                  }
                }} 
                className="g-input bg-[#151b23] border-[#1c2530] font-bold text-amber-300"
              >
                <option value="central">Estoque Central</option>
                <option value="pnc">PNC (Produto Não Conforme / Bloqueado)</option>
                <option value="picking">Picking</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#6a7d92]">
                Rua / Bloco {localizacao === 'central' ? '*' : ''}
              </label>
              <select 
                value={bloco} 
                onChange={e => setBloco(e.target.value)} 
                disabled={localizacao === 'pnc' || localizacao === 'picking'}
                className="g-input bg-[#151b23] border-[#1c2530] font-bold text-[#e2e8f0] disabled:opacity-40"
              >
                {localizacao === 'pnc' ? (
                  <option value="">N/A — PNC Bloqueado (Fora da Matriz de Blocos)</option>
                ) : localizacao === 'picking' ? (
                  <option value="">N/A — Área de Picking</option>
                ) : (
                  <>
                    <option value="">Selecione a Rua / Bloco...</option>
                    <optgroup label="Bloco A">
                      <option value="A1">A1</option>
                      <option value="A2">A2</option>
                      <option value="A3">A3</option>
                      <option value="A4">A4</option>
                    </optgroup>
                    <optgroup label="Bloco B">
                      <option value="B1">B1</option>
                      <option value="B2">B2</option>
                      <option value="B3">B3</option>
                      <option value="B4">B4</option>
                    </optgroup>
                    <optgroup label="Bloco CB">
                      <option value="CB1">CB1</option>
                      <option value="CB2">CB2</option>
                      <option value="CB3">CB3</option>
                      <option value="CB4">CB4</option>
                    </optgroup>
                    <optgroup label="Bloco C">
                      <option value="C1">C1</option>
                      <option value="C2">C2</option>
                      <option value="C3">C3</option>
                      <option value="C4">C4</option>
                    </optgroup>
                    <optgroup label="Outras Áreas">
                      <option value="Área Picking">Área Picking</option>
                      <option value="Marketplace">Marketplace</option>
                      <option value="Contingência">Contingência</option>
                    </optgroup>
                  </>
                )}
              </select>
            </div>
          </div>

          <div className="flex gap-3">
            {editingRow && (
              <button 
                type="button"
                onClick={cleanForm}
                className="btn-ghost flex-1 py-3 border border-[#243040] text-[#6a7d92] hover:text-[#e8eef5] rounded-xl text-xs uppercase font-extrabold tracking-wider"
              >
                Cancelar Edição
              </button>
            )}
            <button 
              type="button"
              disabled={registering || (!selectedProd && !editingRow)}
              onClick={handleSave}
              className="py-4 font-sans font-bold uppercase tracking-widest text-[#07090d] bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] hover:shadow-[0_4px_16px_rgba(139,92,246,0.25)] rounded-xl disabled:opacity-50 flex-1 cursor-pointer"
            >
              {registering ? 'Gravando...' : editingRow ? '✏️ ATUALIZAR LOTE NO ESTOQUE' : '💾 SALVAR PRODUTO NO ESTOQUE'}
            </button>
          </div>
        </div>
      ) : activeTab === 'lista' ? (
        <div className="flex flex-col gap-4">
          <HistoryRestrictionNotice user={user} />
          
          {/* List Search and Filters bar */}
          <div className="g-card p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-2.5 w-full sm:w-auto flex-1">
              <input 
                type="text"
                placeholder="🔎 Buscar por Código SKU, Descrição ou Rua..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="g-input text-xs py-2 px-3 bg-[#151b23]/80 border-[#222d3a] text-snow placeholder-[#6a7d92] min-w-[200px]"
              />
              <select value={filterLoc} onChange={e => setFilterLoc(e.target.value)} className="g-input text-xs py-2 px-3 bg-[#151b23]/80 border-[#222d3a]">
                <option value="todos">📍 Todos os Locais</option>
                <option value="central">Estoque Central</option>
                <option value="pnc">PNC (Produto Não Conforme)</option>
                <option value="repack">Repack</option>
                <option value="picking">Picking (Histórico)</option>
                <option value="marketplace">Marketplace (Histórico)</option>
              </select>
              <select value={filterBloco} onChange={e => setFilterBloco(e.target.value)} className="g-input text-xs py-2 px-3 bg-[#151b23]/80 border-[#222d3a]">
                <option value="todos">📦 Todos os Blocos / Ruas</option>
                <optgroup label="Bloco A">
                  <option value="A1">Bloco A1</option>
                  <option value="A2">Bloco A2</option>
                  <option value="A3">Bloco A3</option>
                  <option value="A4">Bloco A4</option>
                </optgroup>
                <optgroup label="Bloco B">
                  <option value="B1">Bloco B1</option>
                  <option value="B2">Bloco B2</option>
                  <option value="B3">Bloco B3</option>
                  <option value="B4">Bloco B4</option>
                </optgroup>
                <optgroup label="Bloco CB">
                  <option value="CB1">Bloco CB1</option>
                  <option value="CB2">Bloco CB2</option>
                  <option value="CB3">Bloco CB3</option>
                  <option value="CB4">Bloco CB4</option>
                </optgroup>
                <optgroup label="Bloco C">
                  <option value="C1">Bloco C1</option>
                  <option value="C2">Bloco C2</option>
                  <option value="C3">Bloco C3</option>
                  <option value="C4">Bloco C4</option>
                </optgroup>
                <optgroup label="Outras Áreas">
                  <option value="Área Picking">Área Picking</option>
                  <option value="Marketplace">Marketplace</option>
                  <option value="Contingência">Contingência</option>
                </optgroup>
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="g-input text-xs py-2 px-3 bg-[#151b23]/80 border-[#222d3a]">
                <option value="todos">🚦 Todos os Riscos</option>
                <option value="expired">⛔ Vencidos</option>
                <option value="crit">🔴 Críticos (≤30 dias)</option>
                <option value="warn">🟠 Atenção (≤45 dias)</option>
                <option value="alert">🟡 Alertas (≤60 dias)</option>
                <option value="ok">🟢 Estáveis (&gt;60 dias)</option>
              </select>
              <select value={sortOrder} onChange={e => setSortSort(e.target.value as any)} className="g-input text-xs py-2 px-3 bg-[#151b23]/80 border-[#222d3a]">
                <option value="asc">📅 Mais Próximos</option>
                <option value="desc">📅 Mais Distantes</option>
              </select>
            </div>
            
            <span className="text-[10px] uppercase font-bold text-[#6a7d92] tracking-wider">
              {entriesToDisplay.length} lotes encontrados
            </span>
          </div>

          {/* List content */}
          <div className="flex flex-col gap-3">
            {(() => {
              const grouped = entriesToDisplay.reduce((acc, r) => {
                const key = getRegDateKey(r);
                if (!acc[key]) acc[key] = [];
                acc[key].push(r);
                return acc;
              }, {} as Record<string, ValidadeRow[]>);

              const sortedRegDateKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

              if (sortedRegDateKeys.length === 0) {
                return <div className="g-card p-12 text-center text-[#6a7d92]">Nenhum produto cadastrado que corresponda a estes filtros.</div>;
              }

              return sortedRegDateKeys.map(regDateKey => {
                const rows = grouped[regDateKey];
                const isOpen = expandedDates[regDateKey] !== false;

                let formattedRegDate = regDateKey;
                try {
                  const [y, m, d] = regDateKey.split('-');
                  const dt = new Date(Number(y), Number(m) - 1, Number(d));
                  const daysOfWeek = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
                  formattedRegDate = `${d}/${m}/${y} — ${daysOfWeek[dt.getDay()]}`;
                } catch (e) {}

                return (
                  <div key={regDateKey} className="g-card overflow-hidden">
                    <div 
                      onClick={() => toggleDateGroup(regDateKey)}
                      className="p-4 bg-[#151b23] flex items-center justify-between cursor-pointer select-none gap-4 flex-wrap hover:bg-[#1a222c] transition-colors border-b border-[#222d3a]/60"
                    >
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-sans font-black text-sm text-[#8b5cf6] tracking-wide">
                          📅 Registros de: {formattedRegDate}
                        </span>
                        <span className="text-[10px] bg-[#11151c] border border-[#222d3a] px-2.5 py-0.5 rounded-full font-bold text-snow">
                          {rows.length} {rows.length === 1 ? 'lote registrado' : 'lotes registrados'}
                        </span>
                      </div>
                      <span className="text-[#6a7d92] text-xs transition-transform" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
                    </div>

                    {isOpen && (
                      <div className="p-4 flex flex-col gap-3 bg-[#0c1015]/40 border-t border-[#222d3a]/40">
                        {rows.map((r, i) => {
                          const days = getDaysRemaining(r.validade);
                          const spec = getStatusLabelAndStyles(days);
                          const descDays = days < 0 
                            ? `${Math.abs(days)} dias atrasados` 
                            : days === 0 
                            ? 'Vence hoje' 
                            : `${days} dias restantes`;

                          let formattedValidadeDate = r.validade;
                          try {
                            const [y, m, d] = r.validade.split('-');
                            formattedValidadeDate = `${d}/${m}/${y}`;
                          } catch (e) {}

                          return (
                            <div key={r.id || r._docId || i} className="border border-[#222d3a] rounded-xl p-4 bg-[#0f1318] flex flex-col sm:flex-row items-center justify-between gap-4 hover:border-[#334155] transition-all shadow-sm text-center sm:text-left">
                              <div className="flex-1 min-w-0 w-full flex flex-col items-center sm:items-start text-center sm:text-left">
                                <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap mb-1.5 w-full">
                                  <span className="text-[9px] bg-[#151b23] border border-[#222d3a] px-2 py-0.5 rounded font-black text-[#f5a623] font-mono">
                                    SKU: {r.codigo}
                                  </span>
                                  <span className="text-[9px] bg-[#151b23] px-2 py-0.5 rounded uppercase font-bold text-[#6a7d92]">
                                    {r.localizacao === 'central'
                                      ? 'Estoque Central'
                                      : r.localizacao === 'pnc'
                                      ? 'PNC'
                                      : r.localizacao === 'repack'
                                      ? 'Repack'
                                      : r.localizacao === 'picking'
                                      ? 'Picking'
                                      : r.localizacao === 'marketplace'
                                      ? 'Marketplace'
                                      : r.localizacao || 'Estoque Central'}
                                    {r.bloco ? ` — Bloco ${r.bloco}` : ''}
                                  </span>
                                  <span className="text-[9px] bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 rounded font-bold text-[#a78bfa]">
                                    📅 Vencimento: {formattedValidadeDate}
                                  </span>
                                  <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${spec.bg || 'bg-slate-800'} ${spec.text} border-current/20`}>
                                    {spec.label}
                                  </span>
                                  <span className="text-[9px] text-[#6a7d92] font-semibold">
                                    ⏳ {descDays}
                                  </span>
                                </div>
                                <h4 className="text-sm font-bold text-snow truncate w-full text-center sm:text-left">{r.descricao}</h4>
                                <div className="flex justify-center sm:justify-start gap-4 flex-wrap text-xs text-[#6a7d92] mt-2 font-mono font-semibold w-full">
                                  {r.palhete > 0 && <span>🪵 {r.palhete} paletes</span>}
                                  {r.lastro > 0 && <span>🗃 {r.lastro} lastros</span>}
                                  {r.caixa > 0 && <span>📦 {r.caixa} SKUs</span>}
                                </div>
                              </div>
                              
                              <div className="flex gap-2 self-end sm:self-auto">
                                <button 
                                  onClick={() => handleEditInit(r)}
                                  className="py-1.5 px-3 border border-[#222d3a] hover:border-[#6a7d92] bg-[#151b23] text-xs font-semibold text-snow rounded-lg cursor-pointer transition-colors"
                                >
                                  🔄 Realizar Recontagem
                                </button>
                                <button 
                                  onClick={() => handleDelete(r)}
                                  className="py-1.5 px-3 border border-red/20 bg-red/10 hover:bg-red/20 text-[#fca5a5] text-xs font-semibold rounded-lg cursor-pointer transition-colors"
                                >
                                  🗑 Excluir
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>

        </div>
      ) : activeTab === 'stock_age' ? (
        <StockAgeIndexTab 
          validadesList={validadesList} 
          user={user} 
          empresa={empresa} 
        />
      ) : activeTab === 'futuro_shelf' ? (
        <FuturoShelfTab 
          validadesList={validadesList} 
          user={user} 
          empresa={empresa} 
        />
      ) : activeTab === 'escoamento' ? (
        <GestaoEscoamentoTab 
          validadesList={validadesList} 
          user={user} 
          empresa={empresa} 
          onRefresh={() => {
            if (!db) {
              const saved = localStorage.getItem(`validades_${empresaId}`);
              if (saved) {
                try {
                  const rows = JSON.parse(saved);
                  setValidadesList(rows);
                } catch (e) {}
              }
            }
          }}
        />
      ) : activeTab === 'fefo_quadro' ? (
        /* QUADRO CENTRAL DE ALERTAS DE QUEBRA DE FEFO (TAREFA 24) */
        <div className="flex flex-col gap-6 font-sans">
          
          {/* Header Banner */}
          <div className="g-card p-6 border-l-4 border-l-red-500 bg-gradient-to-r from-red-950/30 to-[#151b23]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-red-600 text-white font-black px-2.5 py-0.5 rounded tracking-wider uppercase">
                    Quadro Central de Alertas
                  </span>
                  <span className="text-[10px] bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded font-bold uppercase">
                    Conferência Operacional FEFO
                  </span>
                </div>
                <h2 className="font-sans font-black text-lg tracking-wider uppercase text-snow mt-2 flex items-center gap-2">
                  🚨 Dashboard & Quadro de Alertas de Quebra de FEFO
                </h2>
                <p className="text-xs text-[#a0aec0] mt-1 max-w-2xl">
                  Centralização em tempo real de todos os desvios de FEFO. Alertas são atualizados automaticamente ao lançar ou importar dados de validade.
                </p>
              </div>

              {/* Quick Metrics Badges */}
              <div className="flex gap-2 flex-wrap">
                <div className="bg-[#1a222c] border border-red-500/40 p-3 rounded-xl text-center min-w-[120px]">
                  <span className="block text-xl font-black text-red-400">{quebrasFefoPicking.length}</span>
                  <span className="text-[9px] font-bold text-[#6a7d92] uppercase">Estoque x Picking</span>
                  <span className="block text-[8px] font-bold text-red-400/80">Tol. Zero</span>
                </div>
                <div className="bg-[#1a222c] border border-amber-500/40 p-3 rounded-xl text-center min-w-[120px]">
                  <span className="block text-xl font-black text-amber-400">{quebrasFefoEstoque.length}</span>
                  <span className="text-[9px] font-bold text-[#6a7d92] uppercase">Estoque x Estoque</span>
                  <span className="block text-[8px] font-bold text-amber-400/80">Tol. 7 Dias</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 1: QUEBRAS ESTOQUE X PICKING (TOLERÂNCIA ZERO) */}
          <div className="g-card p-6 flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222d3a] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] bg-red-600 text-white font-black px-2.5 py-0.5 rounded tracking-wider uppercase">
                    Regra FEFO Estoque x Picking
                  </span>
                  <span className="text-[9px] bg-red-500/20 text-red-300 border border-red-500/40 px-2 py-0.5 rounded font-black uppercase">
                    Tolerância ZERO
                  </span>
                </div>
                <h3 className="font-sans font-bold text-sm tracking-wider uppercase text-red-400 mt-2">
                  ⚡ Inversões entre Área Picking e Estoque Central ({quebrasFefoPicking.length})
                </h3>
                <p className="text-xs text-[#a0aec0] mt-1">
                  A Área Picking deve conter o lote com a validade mais antiga. Qualquer produto no Estoque Central mais antigo do que o Picking gera alerta imediato.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={() => {
                    requestAllFefoDemands(empresaId, user.nome || 'Conferente');
                    setFefoDemands(getStoredFefoDemands(empresaId));
                  }}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs uppercase transition-colors shadow cursor-pointer flex items-center gap-1.5"
                >
                  🚜 Delegar Todas ao Empilhador
                </button>
                <button 
                  type="button"
                  onClick={() => setActiveTab('fefo_picking')}
                  className="px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500 hover:text-white rounded-lg text-xs font-bold uppercase transition-colors"
                >
                  Ver Guia Exclusiva →
                </button>
              </div>
            </div>

            {quebrasFefoPicking.length === 0 ? (
              <div className="p-6 bg-[#151b23] border border-emerald-500/30 rounded-xl text-center flex flex-col items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-lg mb-2">
                  ✓
                </div>
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Área Picking 100% Conforme com o Estoque
                </h4>
                <p className="text-xs text-[#a0aec0] mt-1">
                  Todos os produtos no Picking possuem datas iguais ou mais antigas que os lotes estocados nas ruas do Estoque Central.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {quebrasFefoPicking.map((q, idx) => (
                  <div key={idx} className="bg-[#151b23] border border-red-500/40 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-xs text-snow bg-[#222d3a] px-2 py-0.5 rounded border border-[#303e4e]">
                          {q.codigo}
                        </span>
                        <span className="font-bold text-xs text-snow">{q.descricao}</span>
                        <span className="text-[9px] font-black uppercase text-red-400 bg-red-500/20 px-2 py-0.5 rounded border border-red-500/30">
                          Quebra Crítica: +{q.diasInversao} dia(s)
                        </span>
                      </div>

                      <p className="text-xs text-red-300 font-bold">
                        {q.mensagem}
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                        <div className="bg-[#1a222c] p-2 rounded border border-[#2d3a4b]">
                          <span className="text-[9px] font-bold text-[#6a7d92] uppercase block">Validade no Picking</span>
                          <span className="font-mono font-bold text-snow">{q.validadePicking}</span>
                        </div>
                        <div className="bg-[#1a222c] p-2 rounded border border-[#2d3a4b]">
                          <span className="text-[9px] font-bold text-[#6a7d92] uppercase block">Validade no Estoque ({q.ruaEstoque})</span>
                          <span className="font-mono font-bold text-red-400">{q.validadeEstoque}</span>
                        </div>
                        <div className="bg-red-500/20 p-2 rounded border border-red-500/40 col-span-2 sm:col-span-1">
                          <span className="text-[9px] font-bold text-red-300 uppercase block">Desvio de Tolerância</span>
                          <span className="font-mono font-bold text-red-400">+{q.diasInversao} dia(s) no Picking</span>
                        </div>
                      </div>

                      {renderDelegationStatus('estoque_x_picking', q.codigo)}
                    </div>

                    <div className="flex flex-col gap-2 md:w-56">
                      <button 
                        onClick={() => {
                          setSearchQuery(q.codigo);
                          setActiveTab('lista');
                        }}
                        className="w-full py-2 px-3 bg-[#222d3a] hover:bg-[#8b5cf6] text-snow hover:text-white rounded-lg text-xs font-bold uppercase transition-colors flex items-center justify-center gap-1.5"
                      >
                        📋 Ver Lotes no Estoque
                      </button>
                      <button 
                        onClick={() => setSelectedProductAlert({ codigo: q.codigo, descricao: q.descricao })}
                        className="w-full py-2 px-3 bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500 hover:text-white rounded-lg text-xs font-bold uppercase transition-colors flex items-center justify-center gap-1.5"
                      >
                        🔍 Inspecionar SKU
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 2: QUEBRAS ESTOQUE X ESTOQUE (TOLERÂNCIA 7 DIAS) */}
          <div className="g-card p-6 flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222d3a] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded font-black tracking-wider uppercase">
                    Regra FEFO Estoque x Estoque
                  </span>
                  <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-bold">
                    Tolerância de 7 Dias (1 Semana)
                  </span>
                </div>
                <h3 className="font-sans font-bold text-sm tracking-wider uppercase text-amber-400 mt-2">
                  🔍 Inversões entre Ruas / Blocos do Estoque Central ({quebrasFefoEstoque.length})
                </h3>
                <p className="text-xs text-[#a0aec0] mt-1">
                  A rua mais próxima do Picking (menor número/rua A1) deve conter o produto com validade mais próxima de vencer. Inversões são sinalizadas se excederem 7 dias.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={() => {
                    requestAllFefoDemands(empresaId, user.nome || 'Conferente');
                    setFefoDemands(getStoredFefoDemands(empresaId));
                  }}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs uppercase transition-colors shadow cursor-pointer flex items-center gap-1.5"
                >
                  🚜 Delegar Todas ao Empilhador
                </button>
                <button 
                  type="button"
                  onClick={() => setActiveTab('fefo_estoque')}
                  className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500 hover:text-white rounded-lg text-xs font-bold uppercase transition-colors"
                >
                  Ver Guia Exclusiva →
                </button>
              </div>
            </div>

            {quebrasFefoEstoque.length === 0 ? (
              <div className="p-6 bg-[#151b23] border border-emerald-500/30 rounded-xl text-center flex flex-col items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-lg mb-2">
                  ✓
                </div>
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Sequência das Ruas 100% Conforme
                </h4>
                <p className="text-xs text-[#a0aec0] mt-1">
                  Todas as ruas respeitam a regra de proximidade do Picking ou possuem variações dentro da tolerância aceita de 7 dias.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {quebrasFefoEstoque.map((q, idx) => (
                  <div key={idx} className="bg-[#151b23] border border-amber-500/30 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-xs text-snow bg-[#222d3a] px-2 py-0.5 rounded border border-[#303e4e]">
                          {q.codigo}
                        </span>
                        <span className="font-bold text-xs text-snow">{q.descricao}</span>
                        <span className="text-[9px] font-black uppercase text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                          Inversão: +{q.diasInversao} dias
                        </span>
                      </div>

                      <p className="text-xs text-amber-300 font-medium">
                        {q.mensagem}
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                        <div className="bg-[#1a222c] p-2 rounded border border-[#2d3a4b]">
                          <span className="text-[9px] font-bold text-[#6a7d92] uppercase block">Rua Próxima ({q.ruaProxima})</span>
                          <span className="font-mono font-bold text-snow">{q.validadeRuaProxima}</span>
                        </div>
                        <div className="bg-[#1a222c] p-2 rounded border border-[#2d3a4b]">
                          <span className="text-[9px] font-bold text-[#6a7d92] uppercase block">Rua Distante ({q.ruaDistante})</span>
                          <span className="font-mono font-bold text-amber-400">{q.validadeRuaDistante}</span>
                        </div>
                        <div className="bg-amber-500/10 p-2 rounded border border-amber-500/30 col-span-2 sm:col-span-1">
                          <span className="text-[9px] font-bold text-amber-300 uppercase block">Inversão Excedente</span>
                          <span className="font-mono font-bold text-amber-400">+{q.diasInversao} dias</span>
                        </div>
                      </div>

                      {renderDelegationStatus('estoque_x_estoque', q.codigo)}
                    </div>

                    <div className="flex flex-col gap-2 md:w-56">
                      <button 
                        onClick={() => {
                          setSearchQuery(q.codigo);
                          setActiveTab('lista');
                        }}
                        className="w-full py-2 px-3 bg-[#222d3a] hover:bg-[#8b5cf6] text-snow hover:text-white rounded-lg text-xs font-bold uppercase transition-colors flex items-center justify-center gap-1.5"
                      >
                        📋 Ver Lotes no Estoque
                      </button>
                      <button 
                        onClick={() => setSelectedProductAlert({ codigo: q.codigo, descricao: q.descricao })}
                        className="w-full py-2 px-3 bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500 hover:text-white rounded-lg text-xs font-bold uppercase transition-colors flex items-center justify-center gap-1.5"
                      >
                        🔍 Inspecionar SKU
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'fefo_picking' ? (
        /* GUIA ESPECÍFICA ESTOQUE X PICKING (TAREFA 24) */
        <div className="g-card p-6 flex flex-col gap-5 font-sans">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222d3a] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] bg-red-600 text-white font-black px-2.5 py-0.5 rounded tracking-wider uppercase">
                  Guia Exclusiva Estoque x Picking
                </span>
                <span className="text-[9px] bg-red-500/20 text-red-300 border border-red-500/40 px-2 py-0.5 rounded font-black uppercase">
                  Tolerância ZERO
                </span>
              </div>
              <h3 className="font-sans font-bold text-base tracking-wider uppercase text-red-400 mt-2">
                ⚡ Inversões de FEFO entre Área Picking e Estoque Central ({quebrasFefoPicking.length})
              </h3>
              <p className="text-xs text-[#a0aec0] mt-1">
                Visualização dedicada exclusivamente às quebras de tolerância zero entre a Área Picking e as ruas do Estoque Central.
              </p>
            </div>
            <button 
              type="button"
              onClick={() => {
                requestAllFefoDemands(empresaId, user.nome || 'Conferente');
                setFefoDemands(getStoredFefoDemands(empresaId));
              }}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs uppercase transition-colors shadow cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
            >
              🚜 Delegar Todas ao Empilhador
            </button>
          </div>

          {quebrasFefoPicking.length === 0 ? (
            <div className="p-12 bg-[#151b23] border border-emerald-500/30 rounded-xl text-center flex flex-col items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xl mb-2">
                ✓
              </div>
              <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">
                Nenhuma Quebra Estoque x Picking Encontrada
              </h4>
              <p className="text-xs text-[#a0aec0] mt-1 max-w-lg">
                Sua Área Picking está perfeitamente abastecida com as validades mais antigas do armazém.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {quebrasFefoPicking.map((q, idx) => (
                <div key={idx} className="bg-[#151b23] border border-red-500/50 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-sm text-snow bg-[#222d3a] px-2.5 py-1 rounded border border-[#303e4e]">
                        {q.codigo}
                      </span>
                      <span className="font-bold text-sm text-snow">{q.descricao}</span>
                      <span className="text-[10px] font-black uppercase text-red-400 bg-red-500/20 px-2.5 py-1 rounded border border-red-500/30">
                        Quebra Crítica: +{q.diasInversao} dia(s)
                      </span>
                    </div>

                    <p className="text-xs text-red-300 font-bold leading-relaxed">
                      {q.mensagem}
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-2">
                      <div className="bg-[#1a222c] p-2.5 rounded-lg border border-[#2d3a4b]">
                        <span className="text-[9px] font-bold text-[#6a7d92] uppercase block">Validade no Picking</span>
                        <span className="font-mono font-bold text-snow">{q.validadePicking}</span>
                      </div>
                      <div className="bg-[#1a222c] p-2.5 rounded-lg border border-[#2d3a4b]">
                        <span className="text-[9px] font-bold text-[#6a7d92] uppercase block">Validade no Estoque ({q.ruaEstoque})</span>
                        <span className="font-mono font-bold text-red-400">{q.validadeEstoque}</span>
                      </div>
                      <div className="bg-red-500/20 p-2.5 rounded-lg border border-red-500/40 col-span-2 sm:col-span-1">
                        <span className="text-[9px] font-bold text-red-300 uppercase block">Recomendação Operacional</span>
                        <span className="font-sans font-bold text-red-200 text-[11px]">{q.sugestaoAcao}</span>
                      </div>
                    </div>
                    {renderDelegationStatus('estoque_x_picking', q.codigo)}
                  </div>

                  <div className="flex flex-col gap-2 md:w-56">
                    <button 
                      onClick={() => {
                        setSearchQuery(q.codigo);
                        setActiveTab('lista');
                      }}
                      className="w-full py-2.5 px-3 bg-[#222d3a] hover:bg-[#8b5cf6] text-snow hover:text-white rounded-xl text-xs font-bold uppercase transition-colors flex items-center justify-center gap-1.5"
                    >
                      📋 Ver Lotes no Estoque
                    </button>
                    <button 
                      onClick={() => setSelectedProductAlert({ codigo: q.codigo, descricao: q.descricao })}
                      className="w-full py-2.5 px-3 bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500 hover:text-white rounded-xl text-xs font-bold uppercase transition-colors flex items-center justify-center gap-1.5"
                    >
                      🔍 Inspecionar SKU
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* GUIA ESPECÍFICA ESTOQUE X ESTOQUE (TAREFA 24) */
        <div className="g-card p-6 flex flex-col gap-5 font-sans">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222d3a] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-black uppercase tracking-wider">
                  Guia Exclusiva Estoque x Estoque
                </span>
                <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-bold">
                  Tolerância de 7 Dias
                </span>
              </div>
              <h3 className="font-sans font-bold text-base tracking-wider uppercase text-amber-400 mt-2">
                🔍 Análise de Inversão de FEFO entre Ruas / Blocos ({quebrasFefoEstoque.length})
              </h3>
              <p className="text-xs text-[#a0aec0] mt-1">
                Visualização dedicada às regras de layout e sequenciamento de ruas dentro do Estoque Central.
              </p>
            </div>
            <button 
              type="button"
              onClick={() => {
                requestAllFefoDemands(empresaId, user.nome || 'Conferente');
                setFefoDemands(getStoredFefoDemands(empresaId));
              }}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs uppercase transition-colors shadow cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
            >
              🚜 Delegar Todas ao Empilhador
            </button>
          </div>

          {quebrasFefoEstoque.length === 0 ? (
            <div className="p-12 bg-[#151b23] border border-emerald-500/30 rounded-xl text-center flex flex-col items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xl mb-2">
                ✓
              </div>
              <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">
                Nenhum Desvio de Ruas Encontrado
              </h4>
              <p className="text-xs text-[#a0aec0] mt-1 max-w-lg">
                Todas as ruas do Estoque Central estão devidamente organizadas conforme as regras de FEFO por bloco.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {quebrasFefoEstoque.map((q, idx) => (
                <div key={idx} className="bg-[#151b23] border border-amber-500/40 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-sm text-snow bg-[#222d3a] px-2.5 py-1 rounded border border-[#303e4e]">
                        {q.codigo}
                      </span>
                      <span className="font-bold text-sm text-snow">{q.descricao}</span>
                      <span className="text-[10px] font-black uppercase text-amber-400 bg-amber-500/20 px-2.5 py-1 rounded border border-amber-500/30">
                        Inversão: +{q.diasInversao} dias
                      </span>
                    </div>

                    <p className="text-xs text-amber-300 font-medium leading-relaxed">
                      {q.mensagem}
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-2">
                      <div className="bg-[#1a222c] p-2.5 rounded-lg border border-[#2d3a4b]">
                        <span className="text-[9px] font-bold text-[#6a7d92] uppercase block">Rua Próxima ({q.ruaProxima})</span>
                        <span className="font-mono font-bold text-snow">{q.validadeRuaProxima}</span>
                      </div>
                      <div className="bg-[#1a222c] p-2.5 rounded-lg border border-[#2d3a4b]">
                        <span className="text-[9px] font-bold text-[#6a7d92] uppercase block">Rua Distante ({q.ruaDistante})</span>
                        <span className="font-mono font-bold text-amber-400">{q.validadeRuaDistante}</span>
                      </div>
                      <div className="bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/30 col-span-2 sm:col-span-1">
                        <span className="text-[9px] font-bold text-amber-300 uppercase block">Ação Recomendada</span>
                        <span className="font-sans font-bold text-amber-200 text-[11px]">{q.sugestaoAcao}</span>
                      </div>
                    </div>
                    {renderDelegationStatus('estoque_x_estoque', q.codigo)}
                  </div>

                  <div className="flex flex-col gap-2 md:w-56">
                    <button 
                      onClick={() => {
                        setSearchQuery(q.codigo);
                        setActiveTab('lista');
                      }}
                      className="w-full py-2.5 px-3 bg-[#222d3a] hover:bg-[#8b5cf6] text-snow hover:text-white rounded-xl text-xs font-bold uppercase transition-colors flex items-center justify-center gap-1.5"
                    >
                      📋 Ver Lotes no Estoque
                    </button>
                    <button 
                      onClick={() => setSelectedProductAlert({ codigo: q.codigo, descricao: q.descricao })}
                      className="w-full py-2.5 px-3 bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500 hover:text-white rounded-xl text-xs font-bold uppercase transition-colors flex items-center justify-center gap-1.5"
                    >
                      🔍 Inspecionar SKU
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: NOTIFICAÇÃO IMEDIATA NO MOMENTO DO LANÇAMENTO OU IMPORTAÇÃO */}
      {importBreaksModalData?.isOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#151b23] border border-red-500/50 rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col gap-4 text-snow max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#222d3a] pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚠️</span>
                <h3 className="font-sans font-black text-base text-red-400 uppercase tracking-wide">
                  {importBreaksModalData.title}
                </h3>
              </div>
              <button 
                onClick={() => setImportBreaksModalData(null)}
                className="text-gray-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              Foram identificados conflitos com as regras de FEFO do armazém. Verifique os lotes abaixo antes de prosseguir com a movimentação:
            </p>

            {importBreaksModalData.pickingBreaks.length > 0 && (
              <div className="space-y-2 bg-red-950/20 p-4 rounded-xl border border-red-500/30">
                <span className="text-[10px] font-black uppercase text-red-400 bg-red-500/20 px-2 py-0.5 rounded">
                  ⚡ Quebra Estoque x Picking (Tolerância ZERO)
                </span>
                {importBreaksModalData.pickingBreaks.map((q, i) => (
                  <div key={i} className="text-xs bg-[#1a222c] p-3 rounded-lg border border-[#2d3a4b] space-y-1">
                    <div className="font-bold text-snow">{q.codigo} — {q.descricao}</div>
                    <div className="text-red-300 font-medium">{q.mensagem}</div>
                    <div className="text-[10px] text-gray-400">Picking: {q.validadePicking} | Estoque ({q.ruaEstoque}): {q.validadeEstoque}</div>
                  </div>
                ))}
              </div>
            )}

            {importBreaksModalData.estoqueBreaks.length > 0 && (
              <div className="space-y-2 bg-amber-950/20 p-4 rounded-xl border border-amber-500/30">
                <span className="text-[10px] font-black uppercase text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded">
                  🔍 Quebra Estoque x Estoque (Tolerância 7 Dias)
                </span>
                {importBreaksModalData.estoqueBreaks.map((q, i) => (
                  <div key={i} className="text-xs bg-[#1a222c] p-3 rounded-lg border border-[#2d3a4b] space-y-1">
                    <div className="font-bold text-snow">{q.codigo} — {q.descricao}</div>
                    <div className="text-amber-300 font-medium">{q.mensagem}</div>
                    <div className="text-[10px] text-gray-400">Rua Próxima ({q.ruaProxima}): {q.validadeRuaProxima} | Rua Distante ({q.ruaDistante}): {q.validadeRuaDistante}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-[#222d3a] justify-end">
              <button 
                onClick={() => {
                  setImportBreaksModalData(null);
                  setActiveTab('fefo_quadro');
                }}
                className="py-2 px-4 bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase rounded-xl transition-colors"
              >
                🚨 Ir para Quadro de Alertas
              </button>
              <button 
                onClick={() => {
                  const code = importBreaksModalData.pickingBreaks[0]?.codigo || importBreaksModalData.estoqueBreaks[0]?.codigo || '';
                  setSearchQuery(code);
                  setImportBreaksModalData(null);
                  setActiveTab('lista');
                }}
                className="py-2 px-4 bg-[#222d3a] hover:bg-[#8b5cf6] text-snow font-bold text-xs uppercase rounded-xl transition-colors"
              >
                📋 Ver no Estoque
              </button>
              <button 
                onClick={() => setImportBreaksModalData(null)}
                className="py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white font-bold text-xs uppercase rounded-xl transition-colors"
              >
                ✕ Ciente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: INSPEÇÃO DETALHADA DOS LOTES DO SKU */}
      {selectedProductAlert && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#151b23] border border-[#222d3a] rounded-2xl max-w-3xl w-full p-6 shadow-2xl flex flex-col gap-4 text-snow max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#222d3a] pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-[#8b5cf6] bg-[#8b5cf6]/10 px-2 py-0.5 rounded border border-[#8b5cf6]/20">
                  Inspeção de Lotes Cadastrados
                </span>
                <h3 className="font-sans font-bold text-base text-snow mt-1">
                  SKU {selectedProductAlert.codigo} — {selectedProductAlert.descricao}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedProductAlert(null)}
                className="text-gray-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                Lotes no Estoque Central / Picking:
              </span>

              {validadesList.filter(r => String(r.codigo).trim() === String(selectedProductAlert.codigo).trim()).length === 0 ? (
                <div className="p-4 bg-[#1a222c] text-center text-xs text-gray-400 rounded-xl">
                  Nenhum lote ativo cadastrado para este produto.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#222d3a] text-[10px] text-gray-400 uppercase">
                        <th className="p-2">Local / Rua</th>
                        <th className="p-2">Validade</th>
                        <th className="p-2">Qtd Paletes/Caixas</th>
                        <th className="p-2">Dias Restantes</th>
                        <th className="p-2 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#222d3a]">
                      {validadesList.filter(r => String(r.codigo).trim() === String(selectedProductAlert.codigo).trim()).map((r, i) => {
                        const days = getDaysRemaining(r.validade);
                        const isPicking = r.localizacao === 'picking';
                        return (
                          <tr key={i} className="hover:bg-[#1a222c]">
                            <td className="p-2 font-bold">
                              <span className={`px-2 py-0.5 rounded text-[10px] uppercase ${isPicking ? 'bg-red-500/20 text-red-300 border border-red-500/40' : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'}`}>
                                {isPicking ? 'Área Picking' : `Rua ${r.bloco || 'Central'}`}
                              </span>
                            </td>
                            <td className="p-2 font-mono font-bold">{r.validade}</td>
                            <td className="p-2 text-gray-300">{r.palhete || 0} pal. | {r.caixa || 0} cx.</td>
                            <td className="p-2 font-mono font-bold text-amber-400">{days} dias</td>
                            <td className="p-2 text-right">
                              <button 
                                onClick={() => {
                                  setSelectedProductAlert(null);
                                  handleEditInit(r);
                                  setActiveTab('form');
                                }}
                                className="px-2.5 py-1 bg-[#8b5cf6]/20 hover:bg-[#8b5cf6] text-[#c4b5fd] hover:text-white rounded text-[10px] font-bold uppercase transition-colors"
                              >
                                ✏️ Editar
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

            <div className="flex justify-end pt-2 border-t border-[#222d3a]">
              <button 
                onClick={() => setSelectedProductAlert(null)}
                className="py-2 px-5 bg-gray-700 hover:bg-gray-600 text-white font-bold text-xs uppercase rounded-xl transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sugerir Melhoria / Plano de Ação para Supervisores */}
      {!hideSugerirMelhoria && <SugerirMelhoriaCard user={user} empresa={empresa} setor="Validade" />}
    </div>
  );
}
export {};
