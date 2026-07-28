import React, { useState, useEffect, useMemo } from 'react';
import { db, isCustomFirebaseConnected } from '../firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Usuario, Empresa, QuebraRow } from '../types';
import { useEmpresaData } from '../context/EmpresaDataContext';
import { PRODUCTS } from '../planosData';
import { TrendingUp, CheckCircle, Clock, Award, BarChart2, AlertTriangle, FileSpreadsheet, Upload, Download, FileText, Database, Check, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';
import SugerirMelhoriaCard from './SugerirMelhoriaCard';
import { filterHistoryForUser, HistoryRestrictionNotice } from '../utils/historyFilter';

interface QuebrasPanelProps {
  user: Usuario;
  empresa: Empresa | null;
  theme?: 'light' | 'dark';
}

const QB_TIPOS: Record<string, Array<{ cod: number; motivo: string }>> = {
  'ARMAZEM': [
    { cod: 521, motivo: 'ACIDENTE DE TRABALHO' },
    { cod: 530, motivo: 'CLIENTE' },
    { cod: 536, motivo: 'CONSUMO IMPROPRIO' },
    { cod: 538, motivo: 'DIFERENÇA DE ESTOQUE' },
    { cod: 540, motivo: 'DIFERENÇA INVENTÁRIO' },
    { cod: 522, motivo: 'ESTOURADA' },
    { cod: 523, motivo: 'ESTUFADO' },
    { cod: 541, motivo: 'EVENTOS' },
    { cod: 524, motivo: 'FALTA NO PALETE' },
    { cod: 528, motivo: 'FURTO' },
    { cod: 527, motivo: 'IMPUREZA' },
    { cod: 520, motivo: 'INVERSÃO' },
    { cod: 535, motivo: 'MAL CHAPEADA' },
    { cod: 532, motivo: 'MAL CHEIO' },
    { cod: 533, motivo: 'PRODUTO VENCIDO' },
    { cod: 539, motivo: 'QUEBRA COM MOVIMENTAÇÃO' },
    { cod: 537, motivo: 'QUEBRA PICKING' },
    { cod: 525, motivo: 'QUEBRADA' },
    { cod: 531, motivo: 'SEM GAS' },
    { cod: 534, motivo: 'SEM TAMPA' },
    { cod: 529, motivo: 'TROCA - ARMAZÉM' },
    { cod: 526, motivo: 'VAZAMENTO' },
  ],
  'ENTREGA': [
    { cod: 543, motivo: 'ACIDENTE DE TRABALHO' },
    { cod: 556, motivo: 'CARGA TOMBADA' },
    { cod: 551, motivo: 'CLIENTE' },
    { cod: 542, motivo: 'CONSUMO IMPROPRIO' },
    { cod: 544, motivo: 'ESTOURADA' },
    { cod: 545, motivo: 'ESTUFADO' },
    { cod: 558, motivo: 'EVENTOS' },
    { cod: 546, motivo: 'FALTA NO PALETE' },
    { cod: 550, motivo: 'FURTO' },
    { cod: 549, motivo: 'IMPUREZA' },
    { cod: 560, motivo: 'INVERSÃO' },
    { cod: 559, motivo: 'MAL CHAPEADA' },
    { cod: 553, motivo: 'MAL CHEIO' },
    { cod: 557, motivo: 'QUEBRA COM MOVIMENTAÇÃO' },
    { cod: 547, motivo: 'QUEBRADA' },
    { cod: 552, motivo: 'SEM GAS' },
    { cod: 555, motivo: 'SEM TAMPA' },
    { cod: 548, motivo: 'VAZAMENTO' },
    { cod: 554, motivo: 'VENCIDO' },
  ],
  'MERCADO': [
    { cod: 561, motivo: 'ACIDENTE DE TRABALHO' },
    { cod: 570, motivo: 'CLIENTE' },
    { cod: 562, motivo: 'ESTOURADA' },
    { cod: 563, motivo: 'ESTUFADO' },
    { cod: 564, motivo: 'FALTA NO PALETE' },
    { cod: 568, motivo: 'FURTO' },
    { cod: 567, motivo: 'IMPUREZA' },
    { cod: 572, motivo: 'MAL CHEIO' },
    { cod: 565, motivo: 'QUEBRADA' },
    { cod: 571, motivo: 'SEM GAS' },
    { cod: 574, motivo: 'SEM TAMPA' },
    { cod: 569, motivo: 'TROCA' },
    { cod: 566, motivo: 'VAZAMENTO' },
    { cod: 573, motivo: 'VENCIDO' },
  ],
  'PUXADA': [
    { cod: 587, motivo: 'CARGA TOMBADA' },
    { cod: 582, motivo: 'CLIENTE' },
    { cod: 575, motivo: 'ESTUFADO' },
    { cod: 576, motivo: 'FALTA NO PALETE' },
    { cod: 580, motivo: 'FURTO' },
    { cod: 579, motivo: 'IMPUREZA' },
    { cod: 588, motivo: 'MAL CHAPEADA' },
    { cod: 584, motivo: 'MAL CHEIO' },
    { cod: 589, motivo: 'QUEBRA COM MOVIMENTAÇÃO' },
    { cod: 577, motivo: 'QUEBRADA' },
    { cod: 583, motivo: 'SEM GAS' },
    { cod: 581, motivo: 'TROCA' },
    { cod: 578, motivo: 'VAZAMENTO' },
    { cod: 585, motivo: 'VENCIDO' },
  ],
};

export const COLABORADORES_QUEBRA = [
  "DEJEAN SILVA DE OLIVEIRA",
  "PAULO PEREIRA DA SILVA",
  "DIOGENES PEREIRA DA SILVA",
  "MARIVALDO ARTUR ALVES",
  "GILSON ROSA DA SILVA",
  "JOSE RONILDO DA SILVA",
  "CICERO MATHEU DE OLIVEIRA SILVA",
  "NATANAEL LUIZ DA SILVA",
  "ELDENKLEBER MAURICIO DA SILVA",
  "OZENILDO SOUSA SILVA",
  "GLADSON LISBOA DOS SANTOS",
  "LUIS ANTONIO FREIRE MOREIRA",
  "EDILSON VIEIRA DA SILVA",
  "ADMILTON HERMINIO DOS SANTOS MARCELINO",
  "DIMAS EMANUEL MISSIAS DA SILVA"
];

export default function QuebrasPanel({ user, empresa }: QuebrasPanelProps) {
  const empresaId = empresa?.id || 'demo';
  const draftKey = `quebras_draft_${empresaId}_${user.nome || 'guest'}`;
  const empresaData = useEmpresaData();

  const colaboradoresList = COLABORADORES_QUEBRA;

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

  const [produtoBusca, setProdutoBusca] = useState<string>(() => getDraftValue('produtoBusca', ''));
  const [selectedProd, setSelectedProd] = useState<{ codigo: number, descricao: string } | null>(() => getDraftValue('selectedProd', null));
  const [showDropdown, setShowProdDropdown] = useState(false);
  const [quantidade, setQuantidade] = useState<number | ''>(() => getDraftValue('quantidade', ''));
  const [area, setArea] = useState<string>(() => getDraftValue('area', 'ARMAZEM'));
  const [turno, setTurno] = useState<string>(() => getDraftValue('turno', 'MANHÃ'));
  const [motivoCod, setMotivoCod] = useState<number>(() => getDraftValue('motivoCod', 0));
  const [colaboradorQuebrou, setColaboradorQuebrou] = useState<string>(() => getDraftValue('colaboradorQuebrou', ''));
  const [showCustomInput, setShowCustomInput] = useState<boolean>(() => {
    const initial = getDraftValue('colaboradorQuebrou', '');
    return initial !== '' && !colaboradoresList.includes(initial);
  });

  // Sync custom input state if colaboradorQuebrou updates with a valid custom name
  useEffect(() => {
    if (colaboradorQuebrou && !colaboradoresList.includes(colaboradorQuebrou)) {
      setShowCustomInput(true);
    }
  }, [colaboradorQuebrou, colaboradoresList]);
  
  const [activeTab, setActiveTab] = useState<'form' | 'import' | 'stats' | 'hist'>('form');
  const [quebras, setQuebras] = useState<QuebraRow[]>([]);
  const [registering, setRegistering] = useState(false);
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});

  // Database Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [pasteMode, setPasteMode] = useState<'file' | 'paste'>('file');
  const [pastedText, setPastedText] = useState('');
  const [importStatusMsg, setImportStatusMsg] = useState<string | null>(null);

  // Helper to parse individual raw row into QuebraRow format
  const parseQuebraRow = (raw: any): Omit<QuebraRow, '_docId'> & { empresaId: string } => {
    const cleanRow: Record<string, any> = {};
    Object.entries(raw || {}).forEach(([k, v]) => {
      cleanRow[k.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "")] = v;
    });

    const today = new Date();
    const todayStr = today.toLocaleDateString('pt-BR');
    const todayISO = today.toISOString().split('T')[0];

    const rawDate = String(cleanRow.data || cleanRow['data lancamento'] || cleanRow.date || cleanRow.dt || todayStr).trim();
    let dataISO = todayISO;
    let dataStr = rawDate || todayStr;

    if (rawDate.includes('/')) {
      const parts = rawDate.split('/');
      if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
        dataISO = `${year}-${month}-${day}`;
        dataStr = `${day}/${month}/${year}`;
      }
    } else if (rawDate.includes('-')) {
      const parts = rawDate.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) { // YYYY-MM-DD
          dataISO = rawDate;
          dataStr = `${parts[2]}/${parts[1]}/${parts[0]}`;
        } else { // DD-MM-YYYY
          dataISO = `${parts[2]}-${parts[1]}-${parts[0]}`;
          dataStr = `${parts[0]}/${parts[1]}/${parts[2]}`;
        }
      }
    }

    const codProduto = String(cleanRow.produto || cleanRow.codproduto || cleanRow['cod produto'] || cleanRow.codigo || cleanRow.sku || cleanRow.cod || '000').trim();
    const descricao = String(cleanRow.descricao || cleanRow.descricaoproduto || cleanRow['descricao produto'] || cleanRow.produto || cleanRow.item || 'PRODUTO IMPORTADO').trim();
    const quantidade = Math.max(1, Number(cleanRow['quant und.'] || cleanRow['quant und'] || cleanRow.quantidade || cleanRow.qtd || cleanRow.unidades || 1));
    const area = String(cleanRow.area || cleanRow.origem || cleanRow.setor || 'ARMAZEM').trim().toUpperCase();
    const turno = String(cleanRow.turno || 'MANHÃ').trim();
    const codQuebra = String(cleanRow.cod || cleanRow.codquebra || cleanRow['cod quebra'] || cleanRow.codigoquebra || cleanRow.codigodaquebra || '525').trim();
    const motivo = String(cleanRow.motivo || cleanRow.causa || cleanRow['motivo quebra'] || 'QUEBRADA').trim();
    const colaboradorQuebrou = String(cleanRow.responsavel || cleanRow.colaboradorquebrou || cleanRow['colaborador quebrou'] || cleanRow.colaborador || cleanRow.operador || '').trim();
    const responsavel = String(cleanRow.responsavel || '').trim();
    const funcao = String(cleanRow.funcao || cleanRow['funcao'] || '').trim();
    const fiscal = String(cleanRow.fiscal || cleanRow['fiscal lancador'] || user.nome || 'Fiscal').trim();
    const valorUnitario = Number(cleanRow['valor por unid'] || cleanRow.valorunitario || 0);
    const valorTotal = Number(cleanRow['valor tt'] || cleanRow.valortotal || cleanRow['valor total'] || cleanRow.valor || (valorUnitario * quantidade));
    const mes = String(cleanRow.mes || '').trim();
    const rawFatorHl = cleanRow['fator hecto por unidade'] || cleanRow['fator hecto por unid'] || cleanRow['fatorhectoporunidade'] || cleanRow['fator hl'] || cleanRow.fatorhl || cleanRow['fator hecto'] || 0;
    const fatorHl = typeof rawFatorHl === 'string' ? Number(String(rawFatorHl).replace(',', '.')) : Number(rawFatorHl || 0);
    const hlPerdido = Number(cleanRow['hl perdido'] || cleanRow.hlperdido || 0);
    const tipoMarca = String(cleanRow['tipo marca'] || cleanRow.tipomarca || '').trim();
    const embalagem = String(cleanRow.embalagem || '').trim();
    const wqi = String(cleanRow.wqi || '').trim();

    return {
      empresaId: empresa?.id || 'demo',
      data: dataStr,
      dataISO,
      codProduto,
      descricao,
      quantidade,
      area,
      turno,
      codQuebra,
      motivo,
      ...(colaboradorQuebrou ? { colaboradorQuebrou } : {}),
      ...(responsavel ? { responsavel } : {}),
      ...(funcao ? { funcao } : {}),
      fiscal,
      ...(valorUnitario > 0 ? { valorUnitario } : {}),
      ...(valorTotal > 0 ? { valorTotal } : {}),
      ...(mes ? { mes } : {}),
      ...(fatorHl > 0 ? { fatorHl } : {}),
      ...(hlPerdido > 0 ? { hlPerdido } : {}),
      ...(tipoMarca ? { tipoMarca } : {}),
      ...(embalagem ? { embalagem } : {}),
      ...(wqi ? { wqi } : {}),
      _criadoEm: new Date().toISOString()
    };
  };

  // Download Sample Excel Template
  const handleDownloadTemplate = () => {
    const sampleData = [
      {
        "DATA": "2026-01-01",
        "MÊS": "JANEIRO",
        "PRODUTO": 21020,
        "DESCRIÇÃO": "BUDWEISER 350ML",
        "QUANT UND.": 1.0,
        "FATOR HL": 0.0035,
        "HL PERDIDO": 0.0035,
        "TIPO MARCA": "001 - CERVEJA",
        "EMBALAGEM": "187 - LATA SLEEK 350ML",
        "TURNO": "Noite",
        "CÓD": 524,
        "AREA": "ARMAZEM",
        "MOTIVO": "FALTA NO PALETE",
        "VALOR POR UNID": 2.64,
        "VALOR TT": 2.64,
        "RESPONSÁVEL": "RONILDO",
        "FUNÇÃO": "EMPILHADOR",
        "WQI": "NÃO"
      },
      {
        "DATA": "2026-01-02",
        "MÊS": "JANEIRO",
        "PRODUTO": 101,
        "DESCRIÇÃO": "SKOL 350ML CX24",
        "QUANT UND.": 12.0,
        "FATOR HL": 0.042,
        "HL PERDIDO": 0.042,
        "TIPO MARCA": "001 - CERVEJA",
        "EMBALAGEM": "LATA 350ML",
        "TURNO": "Manhã",
        "CÓD": 525,
        "AREA": "ARMAZEM",
        "MOTIVO": "QUEBRADA",
        "VALOR POR UNID": 3.80,
        "VALOR TT": 45.60,
        "RESPONSÁVEL": "PAULO PEREIRA DA SILVA",
        "FUNÇÃO": "CONFERENTE",
        "WQI": "NÃO"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modelo_Quebras");
    XLSX.writeFile(wb, "modelo_importacao_registro_quebras.xlsx");
  };

  // Handle spreadsheet file change & preview
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportStatusMsg(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonHeader = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonHeader.length > 0) {
          const headers = (jsonHeader[0] as any[]).map(String);
          setImportHeaders(headers);
          
          const rows = XLSX.utils.sheet_to_json(worksheet);
          setImportPreview(rows.slice(0, 10));
        }
      } catch (err) {
        alert('Erro ao carregar o arquivo Excel/CSV: ' + err);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Process and save import data
  const processAndImportRows = async (rows: any[]) => {
    if (!rows || rows.length === 0) {
      alert('Nenhum registro encontrado para importação.');
      return;
    }

    setImporting(true);
    setImportStatusMsg(`Importando ${rows.length} registros para o banco de dados...`);

    let importedCount = 0;
    const newItems: QuebraRow[] = [];

    try {
      for (const raw of rows) {
        const rowData = parseQuebraRow(raw);

        if (db) {
          await addDoc(collection(db, 'quebras'), rowData);
        } else {
          newItems.push({ _docId: String(Date.now() + Math.random()), ...rowData });
        }
        importedCount++;
      }

      if (!db) {
        const updated = [...quebras, ...newItems];
        setQuebras(updated);
        localStorage.setItem(`quebras_${empresa?.id || 'demo'}`, JSON.stringify(updated));
      }

      setImportStatusMsg(`✅ Sucesso! ${importedCount} registros de quebras foram importados com êxito!`);
      alert(`🎉 Importação Concluída!\nForam cadastrados ${importedCount} registros de quebras no banco de dados.`);
      setImportFile(null);
      setImportPreview([]);
      setPastedText('');
      setActiveTab('hist');
    } catch (err: any) {
      alert('Erro ao importar registros: ' + (err?.message || err));
      setImportStatusMsg(`❌ Erro durante a importação: ${err?.message || err}`);
    } finally {
      setImporting(false);
    }
  };

  // Submit file upload
  const handleImportFileSubmit = () => {
    if (!importFile) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet) as any[];
        await processAndImportRows(rows);
      } catch (err: any) {
        alert('Erro ao ler planilha: ' + err);
      }
    };
    reader.readAsBinaryString(importFile);
  };

  // Submit pasted JSON or CSV text
  const handlePasteSubmit = async () => {
    if (!pastedText.trim()) return;
    try {
      let parsedRows: any[] = [];
      const text = pastedText.trim();
      if (text.startsWith('[') || text.startsWith('{')) {
        const json = JSON.parse(text);
        parsedRows = Array.isArray(json) ? json : [json];
      } else {
        // Assume CSV
        const workbook = XLSX.read(text, { type: 'string' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        parsedRows = XLSX.utils.sheet_to_json(worksheet) as any[];
      }
      await processAndImportRows(parsedRows);
    } catch (err: any) {
      alert('Erro ao processar texto fornecido. Certifique-se de que é um formato válido (JSON ou CSV/Valores separados por vírgula ou tabulação): ' + err);
    }
  };
  const [draftRestored, setDraftRestored] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return !!(parsed.produtoBusca || parsed.selectedProd || (parsed.quantidade !== undefined && parsed.quantidade !== '') || parsed.area !== 'ARMAZEM' || parsed.turno !== 'MANHÃ' || parsed.colaboradorQuebrou);
      }
    } catch (e) {}
    return false;
  });

  const toggleDateGroup = (dateKey: string) => {
    setExpandedDates(prev => ({ ...prev, [dateKey]: !prev[dateKey] }));
  };

  const motivosDisponiveis = QB_TIPOS[area] || [];
  const isQuebraMovimentacao = motivoCod === 539 || motivoCod === 557 || motivoCod === 589;

  // Reset selected motive code on area update (only if we don't have a loaded motive yet or area changes)
  useEffect(() => {
    if (motivosDisponiveis.length > 0) {
      const savedMotive = getDraftValue('motivoCod', null);
      if (savedMotive && motivosDisponiveis.some(m => m.cod === savedMotive)) {
        setMotivoCod(savedMotive);
      } else {
        setMotivoCod(motivosDisponiveis[0].cod);
      }
    } else {
      setMotivoCod(0);
    }
  }, [area]);

  // Sync state with local draft saving
  useEffect(() => {
    const draftData = {
      produtoBusca,
      selectedProd,
      quantidade,
      area,
      turno,
      motivoCod,
      colaboradorQuebrou
    };
    localStorage.setItem(draftKey, JSON.stringify(draftData));
  }, [produtoBusca, selectedProd, quantidade, area, turno, motivoCod, colaboradorQuebrou, draftKey]);

  // Sync with prop updates / user changing
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setProdutoBusca(parsed.produtoBusca || '');
        setSelectedProd(parsed.selectedProd || null);
        setQuantidade(parsed.quantidade !== undefined ? parsed.quantidade : '');
        setArea(parsed.area || 'ARMAZEM');
        setTurno(parsed.turno || 'MANHÃ');
        setMotivoCod(parsed.motivoCod || 0);
        const colabVal = parsed.colaboradorQuebrou || '';
        setColaboradorQuebrou(colabVal);
        setShowCustomInput(colabVal !== '' && !colaboradoresList.includes(colabVal));
        setDraftRestored(!!(parsed.produtoBusca || parsed.selectedProd || (parsed.quantidade !== undefined && parsed.quantidade !== '') || parsed.area !== 'ARMAZEM' || parsed.turno !== 'MANHÃ' || parsed.colaboradorQuebrou));
      } else {
        setProdutoBusca('');
        setSelectedProd(null);
        setQuantidade('');
        setArea('ARMAZEM');
        setTurno('MANHÃ');
        setMotivoCod(0);
        setColaboradorQuebrou('');
        setShowCustomInput(false);
        setDraftRestored(false);
      }
    } catch (e) {
      console.error(e);
    }
  }, [draftKey]);

  // Sync with Firestore (scoped to company)
  useEffect(() => {
    if (!db || !empresa?.id) {
      const saved = localStorage.getItem(`quebras_${empresa?.id || 'demo'}`);
      if (saved) setQuebras(JSON.parse(saved));
      return;
    }

    const companyId = empresa?.id || 'demo';
    const rows = [...empresaData.quebras];
    rows.sort((a, b) => (b.dataISO || '').localeCompare(a.dataISO || ''));
    setQuebras(rows);
    localStorage.setItem(`quebras_${companyId}`, JSON.stringify(rows));
  }, [empresaData.quebras, empresa?.id]);

  const handleSelectProd = (p: { codigo: number, descricao: string }) => {
    setSelectedProd(p);
    setProdutoBusca(p.descricao);
    setShowProdDropdown(false);
  };

  const handleRegister = async () => {
    if (!selectedProd || !quantidade || Number(quantidade) <= 0 || !area || !turno || !motivoCod) {
      alert('Selecione o produto, digite uma quantidade válida e insira o motivo.');
      return;
    }

    const isQuebraMovimentacao = motivoCod === 539 || motivoCod === 557 || motivoCod === 589;
    if (isQuebraMovimentacao && !colaboradorQuebrou.trim()) {
      alert('Por favor, informe o nome do colaborador que quebrou o produto por movimentação.');
      return;
    }

    setRegistering(true);
    const today = new Date();
    const dataISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const dataStr = today.toLocaleDateString('pt-BR');

    const chosenMotive = motivosDisponiveis.find(m => m.cod === motivoCod)?.motivo || String(motivoCod);

    const newRow: Omit<QuebraRow, '_docId'> & { empresaId: string; _criadoEm?: string } = {
      empresaId: empresa?.id || 'demo',
      data: dataStr,
      dataISO,
      _criadoEm: today.toISOString(),
      fiscal: user.nome || 'Fiscal',
      codProduto: String(selectedProd.codigo),
      descricao: selectedProd.descricao,
      quantidade: Number(quantidade),
      area,
      turno,
      codQuebra: String(motivoCod),
      motivo: chosenMotive,
      ...(isQuebraMovimentacao ? { colaboradorQuebrou: colaboradorQuebrou.trim() } : {})
    };

    try {
      if (db) {
        await addDoc(collection(db, 'quebras'), newRow);
      } else {
        const current = [...quebras, { _docId: String(Date.now()), ...newRow }];
        setQuebras(current);
        localStorage.setItem(`quebras_${empresa?.id || 'demo'}`, JSON.stringify(current));
      }

      setProdutoBusca('');
      setSelectedProd(null);
      setQuantidade('');
      setColaboradorQuebrou('');
      setShowCustomInput(false);
      setDraftRestored(false);
      localStorage.removeItem(draftKey);
      setActiveTab('hist');
    } catch(e) {
      alert('Erro ao registrar quebra: ' + e);
    } finally {
      setRegistering(false);
    }
  };

  // Editing state for history items
  const [editingRow, setEditingRow] = useState<QuebraRow | null>(null);
  const [editQuantidade, setEditQuantidade] = useState<string>('');
  const [editArea, setEditArea] = useState<string>('ARMAZEM');
  const [editTurno, setEditTurno] = useState<string>('MANHÃ');
  const [editMotivoCod, setEditMotivoCod] = useState<number | ''>('');
  const [editColaborador, setEditColaborador] = useState<string>('');
  const [showEditCustomInput, setShowEditCustomInput] = useState<boolean>(false);
  const [editDataISO, setEditDataISO] = useState<string>('');
  const [editProdBusca, setEditProdBusca] = useState<string>('');
  const [editSelectedProd, setEditSelectedProd] = useState<{ codigo: number; descricao: string } | null>(null);
  const [showEditProdDropdown, setShowEditProdDropdown] = useState<boolean>(false);
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  const handleDelete = async (docId?: string) => {
    if (!docId || !confirm('Excluir este lançamento de quebras?')) return;
    try {
      if (db) {
        await deleteDoc(doc(db, 'quebras', docId));
      } else {
        const remaining = quebras.filter(r => r._docId !== docId);
        setQuebras(remaining);
        localStorage.setItem(`quebras_${empresa?.id || 'demo'}`, JSON.stringify(remaining));
      }
    } catch (e) {
      alert('Erro ao excluir: ' + e);
    }
  };

  const handleStartEdit = (q: QuebraRow) => {
    setEditingRow(q);
    setEditQuantidade(String(q.quantidade || ''));
    setEditArea(q.area || 'ARMAZEM');
    setEditTurno(q.turno || 'MANHÃ');
    setEditMotivoCod(q.codQuebra ? Number(q.codQuebra) : '');
    const colabVal = q.colaboradorQuebrou || '';
    setEditColaborador(colabVal);
    setShowEditCustomInput(colabVal !== '' && !colaboradoresList.includes(colabVal));
    setEditDataISO(q.dataISO || (q.data ? q.data.split('/').reverse().join('-') : new Date().toISOString().split('T')[0]));

    const foundProd = PRODUCTS.find(p => String(p.codigo) === String(q.codProduto) || p.descricao.toLowerCase() === (q.descricao || '').toLowerCase());
    if (foundProd) {
      setEditSelectedProd(foundProd);
      setEditProdBusca(foundProd.descricao);
    } else {
      setEditSelectedProd({ codigo: Number(q.codProduto) || 0, descricao: q.descricao });
      setEditProdBusca(q.descricao);
    }
    setShowEditProdDropdown(false);
  };

  const handleSaveEdit = async () => {
    if (!editingRow) return;
    if (!editSelectedProd || !editQuantidade || Number(editQuantidade) <= 0 || !editArea || !editTurno || !editMotivoCod) {
      alert('Preencha os campos obrigatórios para atualizar a quebra.');
      return;
    }

    const motives = QB_TIPOS[editArea] || QB_TIPOS['ARMAZEM'];
    const chosenMotive = motives.find(m => m.cod === Number(editMotivoCod))?.motivo || String(editMotivoCod);
    const isQuebraMovimentacao = Number(editMotivoCod) === 539 || Number(editMotivoCod) === 557 || Number(editMotivoCod) === 589;

    let formattedData = editingRow.data;
    if (editDataISO) {
      const parts = editDataISO.split('-');
      if (parts.length === 3) {
        formattedData = `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }

    setSavingEdit(true);

    const updatedFields: Partial<QuebraRow> = {
      codProduto: String(editSelectedProd.codigo),
      descricao: editSelectedProd.descricao,
      quantidade: Number(editQuantidade),
      area: editArea,
      turno: editTurno,
      codQuebra: String(editMotivoCod),
      motivo: chosenMotive,
      dataISO: editDataISO,
      data: formattedData,
      colaboradorQuebrou: isQuebraMovimentacao || editColaborador ? editColaborador.trim() : ''
    };

    try {
      if (db && editingRow._docId) {
        await updateDoc(doc(db, 'quebras', editingRow._docId), updatedFields);
      }

      const nextQuebras = quebras.map(r => (r._docId === editingRow._docId ? { ...r, ...updatedFields } : r));
      setQuebras(nextQuebras);
      localStorage.setItem(`quebras_${empresa?.id || 'demo'}`, JSON.stringify(nextQuebras));

      setEditingRow(null);
    } catch (e) {
      alert('Erro ao atualizar lançamento: ' + e);
    } finally {
      setSavingEdit(false);
    }
  };

  // Filter products for autocomplete dropdown
  const filteredProducts = PRODUCTS.filter(p => {
    const q = produtoBusca.toLowerCase();
    return String(p.codigo).includes(q) || p.descricao.toLowerCase().includes(q);
  }).slice(0, 10);

  return (
    <div className="flex flex-col gap-6">
      
      <div className="flex items-center justify-between p-4 bg-[#11151c] border-b border-[#222d3a] rounded-t-xl -mx-6 md:-mx-12 -mt-6">
        <span className="font-sans font-black text-sm tracking-widest text-[#ef4444] uppercase">💥 CONTROLE DE QUEBRAS E AVARIAS</span>
      </div>

      <div className="ptabs border-b border-[#222d3a] flex gap-2 flex-wrap">
        <button 
          onClick={() => setActiveTab('form')}
          className={`ptab py-2 px-6 font-sans font-bold text-xs uppercase cursor-pointer relative ${activeTab === 'form' ? 'text-[#ef4444] border-b-2 border-b-[#ef4444]' : 'text-[#6a7d92] hover:text-[#e8eef5]'}`}
        >
          📝 Cadastrar Quebra
        </button>
        <button 
          onClick={() => setActiveTab('import')}
          className={`ptab py-2 px-6 font-sans font-bold text-xs uppercase cursor-pointer relative ${activeTab === 'import' ? 'text-[#ef4444] border-b-2 border-b-[#ef4444]' : 'text-[#6a7d92] hover:text-[#e8eef5]'}`}
        >
          📥 Importar Banco / Planilha
        </button>
        <button 
          onClick={() => setActiveTab('stats')}
          className={`ptab py-2 px-6 font-sans font-bold text-xs uppercase cursor-pointer relative ${activeTab === 'stats' ? 'text-[#ef4444] border-b-2 border-b-[#ef4444]' : 'text-[#6a7d92] hover:text-[#e8eef5]'}`}
        >
          📊 Produtividade do Dia
        </button>
        <button 
          onClick={() => setActiveTab('hist')}
          className={`ptab py-2 px-6 font-sans font-bold text-xs uppercase cursor-pointer relative ${activeTab === 'hist' ? 'text-[#ef4444] border-b-2 border-b-[#ef4444]' : 'text-[#6a7d92] hover:text-[#e8eef5]'}`}
        >
          📋 Histórico <span className="ml-1.5 px-2 py-0.5 rounded-full bg-[#151b23] border border-[#222d3a] text-[10px] text-snow">{filterHistoryForUser(quebras, user).length}</span>
        </button>
      </div>

      {activeTab === 'import' && (
        <div className="g-card p-6 flex flex-col gap-6 bg-[#11151c] border border-[#222d3a] rounded-xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#222d3a] pb-4">
            <div>
              <h3 className="font-sans font-black text-lg text-snow uppercase tracking-wide flex items-center gap-2">
                <Database className="w-5 h-5 text-[#ef4444]" /> Importação em Lote — Registro de Quebras
              </h3>
              <p className="text-xs text-[#6a7d92] mt-1">
                Carregue uma planilha Excel (.xlsx / .xls), CSV ou colar lote JSON/CSV para importar registros diretamente no banco de dados da empresa ({empresa?.razaoSocial || 'Sua Empresa'}).
              </p>
            </div>
            
            <button
              onClick={handleDownloadTemplate}
              className="px-4 py-2 bg-[#151b23] hover:bg-[#1a222c] border border-[#ef4444]/40 hover:border-[#ef4444] text-[#ef4444] rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Download className="w-4 h-4" /> Baixar Modelo Excel
            </button>
          </div>

          {importStatusMsg && (
            <div className={`p-4 rounded-lg border text-xs font-bold ${importStatusMsg.includes('❌') ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
              {importStatusMsg}
            </div>
          )}

          {/* Mode Selector */}
          <div className="flex gap-3 border-b border-[#222d3a] pb-3">
            <button
              onClick={() => setPasteMode('file')}
              className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-2 cursor-pointer ${pasteMode === 'file' ? 'bg-[#ef4444] text-white' : 'bg-[#151b23] text-[#6a7d92] hover:text-snow border border-[#222d3a]'}`}
            >
              <FileSpreadsheet className="w-4 h-4" /> Upload de Arquivo (Excel / CSV)
            </button>
            <button
              onClick={() => setPasteMode('paste')}
              className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-2 cursor-pointer ${pasteMode === 'paste' ? 'bg-[#ef4444] text-white' : 'bg-[#151b23] text-[#6a7d92] hover:text-snow border border-[#222d3a]'}`}
            >
              <FileText className="w-4 h-4" /> Colar Texto (JSON / CSV)
            </button>
          </div>

          {pasteMode === 'file' ? (
            <div className="flex flex-col gap-6">
              <div className="border-2 border-dashed border-[#222d3a] hover:border-[#ef4444]/50 bg-[#151b23]/50 rounded-xl p-8 text-center flex flex-col items-center justify-center gap-3 transition-colors">
                <Upload className="w-10 h-10 text-[#ef4444] opacity-80" />
                <div>
                  <label htmlFor="quebras-file-upload" className="font-bold text-snow text-sm cursor-pointer hover:underline text-[#ef4444]">
                    Clique para selecionar um arquivo
                  </label>
                  <span className="text-xs text-[#6a7d92] block mt-1">Suporta arquivos .xlsx, .xls ou .csv</span>
                </div>
                <input
                  id="quebras-file-upload"
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {importFile && (
                  <div className="mt-2 text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-lg flex items-center gap-2">
                    <Check className="w-4 h-4" /> {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
                  </div>
                )}
              </div>

              {/* Preview Table */}
              {importPreview.length > 0 && (
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#6a7d92]">
                      Pré-visualização das Primeiras {importPreview.length} Linhas
                    </span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-mono">
                      {importHeaders.length} colunas identificadas
                    </span>
                  </div>

                  <div className="overflow-x-auto border border-[#222d3a] rounded-lg">
                    <table className="w-full text-left font-sans text-xs">
                      <thead>
                        <tr className="bg-[#151b23] border-b border-[#222d3a] text-[#6a7d92] uppercase">
                          {importHeaders.map((h, i) => (
                            <th key={i} className="p-2.5 font-bold">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#222d3a] text-snow font-mono">
                        {importPreview.map((row, i) => (
                          <tr key={i} className="hover:bg-[#151b23]/30">
                            {importHeaders.map((h, j) => (
                              <td key={j} className="p-2.5 whitespace-nowrap">{String(row[h] || '—')}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end mt-2">
                    <button
                      onClick={handleImportFileSubmit}
                      disabled={importing}
                      className="px-6 py-3 bg-[#ef4444] hover:bg-[#dc2626] disabled:opacity-50 text-white font-bold rounded-lg text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg transition-all"
                    >
                      {importing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      Confirmar e Importar Registros
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold uppercase text-[#6a7d92] mb-1 block">
                  Cole os dados em formato JSON ou CSV (com cabeçalho na 1ª linha)
                </label>
                <textarea
                  rows={8}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder={`Data,Cód Produto,Descrição Produto,Quantidade,Área,Turno,Cód Quebra,Motivo,Colaborador Quebrou\n26/07/2026,101,SKOL 350ML,10,ARMAZEM,MANHÃ,525,QUEBRADA,PAULO SILVA`}
                  className="w-full bg-[#151b23] border border-[#222d3a] focus:border-[#ef4444] rounded-lg p-3 font-mono text-xs text-snow focus:outline-none"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handlePasteSubmit}
                  disabled={importing || !pastedText.trim()}
                  className="px-6 py-3 bg-[#ef4444] hover:bg-[#dc2626] disabled:opacity-50 text-white font-bold rounded-lg text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg transition-all"
                >
                  {importing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Importar Registros do Texto
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'stats' && (
        <div className="g-card p-6 flex flex-col gap-6 bg-gradient-to-br from-[#11151c] to-[#151b23] border border-[#222d3a]">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="font-sans font-black text-lg text-[#ef4444] uppercase tracking-wide flex items-center gap-2">
                <BarChart2 className="w-5 h-5" /> Minha Produtividade de Hoje (Quebras)
              </h3>
              <p className="text-xs text-[#6a7d92] mt-1">
                Visão em tempo real das quebras registradas no seu turno de hoje ({new Date().toLocaleDateString('pt-BR')}).
              </p>
            </div>
            <div className="text-[10px] text-[#6a7d92] font-mono font-bold bg-[#151b23] border border-[#222d3a] px-3 py-1.5 rounded-lg">
              OPERADOR: {user.nome}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[#151b23] border border-[#222d3a] rounded-xl p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-[#ef4444]/10 text-[#ef4444]">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#6a7d92] block tracking-wider">Registros Efetuados</span>
                <span className="text-xl font-bold text-snow font-mono">
                  {quebras.filter(r => r.data === new Date().toLocaleDateString('pt-BR') && r.fiscal === user.nome).length}
                </span>
              </div>
            </div>

            <div className="bg-[#151b23] border border-[#222d3a] rounded-xl p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-red-500/10 text-red-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#6a7d92] block tracking-wider">Garrafas / Unidades Quebradas</span>
                <span className="text-xl font-bold text-snow font-mono">
                  {quebras.filter(r => r.data === new Date().toLocaleDateString('pt-BR') && r.fiscal === user.nome).reduce((sum, r) => sum + (r.quantidade || 0), 0)} u
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold text-[#6a7d92] uppercase tracking-wider">Histórico Detalhado de Hoje</h4>
            {quebras.filter(r => r.data === new Date().toLocaleDateString('pt-BR') && r.fiscal === user.nome).length === 0 ? (
              <div className="text-center py-6 border border-dashed border-[#222d3a] rounded-xl text-xs text-[#6a7d92]">
                Nenhuma quebra registrada por você hoje ainda. Use a aba "Cadastrar Quebra" para começar!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#a0aec0]">
                  <thead>
                    <tr className="border-b border-[#222d3a] text-[#6a7d92] uppercase text-[10px] font-bold tracking-wider">
                      <th className="py-2.5 px-3">Produto</th>
                      <th className="py-2.5 px-3">Quantidade</th>
                      <th className="py-2.5 px-3">Motivo / Cód</th>
                      <th className="py-2.5 px-3">Área / Turno</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222d3a]">
                    {quebras
                      .filter(r => r.data === new Date().toLocaleDateString('pt-BR') && r.fiscal === user.nome)
                      .map((r, idx) => (
                        <tr key={r._docId || idx} className="hover:bg-[#151b23]/30 transition-colors">
                          <td className="py-3 px-3 font-bold text-snow">
                            <span className="text-gray-500 font-mono text-[11px] block">{r.codSap}</span>
                            {r.produto}
                          </td>
                          <td className="py-3 px-3 font-mono text-red-400 font-semibold">{r.quantidade} un</td>
                          <td className="py-3 px-3">
                            <span className="font-mono bg-[#151b23] border border-[#222d3a] text-snow px-1.5 py-0.5 rounded mr-1.5 font-bold text-[10px]">
                              {r.motivoCod}
                            </span>
                            {r.motivo}
                          </td>
                          <td className="py-3 px-3 font-mono text-[#6a7d92]">
                            {r.area} ({r.turno})
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'form' ? (
        <div className="g-card p-6 flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222d3a] pb-3">
            <h3 className="font-sans font-bold text-sm tracking-wider uppercase text-[#ef4444]">Cadastro de Quebra Operacional</h3>
            <div className="flex items-center gap-1.5 text-[9px] text-[#22c55e] font-black uppercase tracking-wider bg-[#22c55e]/5 px-2.5 py-1 rounded-lg border border-[#22c55e]/15">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              Salvo automaticamente
            </div>
          </div>

          {draftRestored && (
            <div className="flex items-center justify-between gap-3 bg-amber-500/10 border border-amber-500/25 px-4 py-3 rounded-xl text-xs text-amber-300">
              <div className="flex items-center gap-2 font-medium">
                <span>⚡ Dados anteriores restaurados do rascunho salvo!</span>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setProdutoBusca('');
                  setSelectedProd(null);
                  setQuantidade('');
                  setArea('ARMAZEM');
                  setTurno('MANHÃ');
                  setColaboradorQuebrou('');
                  setShowCustomInput(false);
                  setDraftRestored(false);
                  localStorage.removeItem(draftKey);
                }}
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
                placeholder="Busque pelo código ou por palavras..."
                value={produtoBusca}
                onChange={e => {
                  setProdutoBusca(e.target.value);
                  setShowProdDropdown(true);
                  if (selectedProd && e.target.value !== selectedProd.descricao) {
                    setSelectedProd(null);
                  }
                }}
                onFocus={() => setShowProdDropdown(true)}
                className="g-input"
              />
              {showDropdown && produtoBusca && filteredProducts.length > 0 && (
                <div className="absolute top-[103%] left-0 right-0 bg-white border border-slate-200 shadow-xl rounded-xl z-50 max-h-48 overflow-y-auto">
                  {filteredProducts.map(p => (
                    <div 
                      key={p.codigo}
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

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#6a7d92]">Código SKU</label>
              <input 
                type="text" 
                readOnly
                placeholder="Auto"
                value={selectedProd ? selectedProd.codigo : ''}
                className="g-input text-center text-[#f5a623] font-bold font-mono opacity-80"
              />
            </div>

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#6a7d92]">Unidades *</label>
              <input 
                type="number"
                value={quantidade}
                onChange={e => {
                  const val = e.target.value;
                  setQuantidade(val === '' ? '' : parseInt(val) || '');
                }}
                className="g-input text-center"
                placeholder="Ex: 10"
              />
            </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#6a7d92]">Área de Origem *</label>
              <select value={area} onChange={e => setArea(e.target.value)} className="g-input bg-[#151b23] border-[#1c2530]">
                <option value="ARMAZEM">Armazém / Depósito</option>
                <option value="ENTREGA">Rota de Entrega</option>
                <option value="MERCADO">Mercado / Retorno</option>
                <option value="PUXADA">Puxada / Transferência</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#6a7d92]">Turno Ocorrido *</label>
              <select value={turno} onChange={e => setTurno(e.target.value)} className="g-input bg-[#151b23] border-[#1c2530]">
                <option value="MANHÃ">Manhã</option>
                <option value="NOITE">Noite / Madrugada</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#6a7d92]">Tipo/Código de Quebra *</label>
              <select 
                value={motivoCod} 
                onChange={e => setMotivoCod(Number(e.target.value))} 
                className="g-input bg-[#151b23] border-[#1c2530]"
              >
                {motivosDisponiveis.map(m => (
                  <option key={m.cod} value={m.cod}>{m.cod} — {m.motivo}</option>
                ))}
              </select>
            </div>

          </div>

          {isQuebraMovimentacao && (
            <div className="flex flex-col gap-1.5 bg-[#ef4444]/5 border border-[#ef4444]/15 rounded-xl p-4 animate-fadeIn">
              <label className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#ef4444]">Nome do Colaborador que Quebrou *</label>
              <select
                value={
                  showCustomInput 
                    ? 'OUTRO' 
                    : (colaboradorQuebrou === '' ? '' : (colaboradoresList.includes(colaboradorQuebrou) ? colaboradorQuebrou : 'OUTRO'))
                }
                onChange={e => {
                  const val = e.target.value;
                  if (val === 'OUTRO') {
                    setShowCustomInput(true);
                    setColaboradorQuebrou('');
                  } else {
                    setShowCustomInput(false);
                    setColaboradorQuebrou(val);
                  }
                }}
                className="g-input border-[#ef4444]/30 focus:border-[#ef4444] bg-[#151b23] text-white"
                required
              >
                <option value="">Selecione o colaborador...</option>
                {colaboradoresList.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
                <option value="OUTRO">OUTRO / NÃO LISTADO (Digitar manualmente)...</option>
              </select>

              {showCustomInput && (
                <input 
                  type="text"
                  placeholder="Digite o nome completo do colaborador responsável..."
                  value={colaboradorQuebrou}
                  onChange={e => setColaboradorQuebrou(e.target.value)}
                  className="g-input border-[#ef4444]/30 focus:border-[#ef4444] mt-1.5 animate-fadeIn bg-[#151b23] text-white"
                  required
                />
              )}
              <span className="text-[9px] text-[#ef4444]/60 font-semibold uppercase tracking-wider">Identificação obrigatória para quebras com movimentação.</span>
            </div>
          )}

          <button 
            type="button"
            disabled={registering || !selectedProd}
            onClick={handleRegister}
            className="w-full py-4 text-sm font-sans font-bold uppercase tracking-widest text-white bg-gradient-to-br from-[#ef4444] to-[#af2424] hover:shadow-[0_4px_16px_rgba(239,68,68,0.25)] rounded-xl disabled:opacity-50 cursor-pointer"
          >
            {registering ? 'Lançando...' : '💾 ADICIONAR QUEBRA / AVARIA'}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <HistoryRestrictionNotice user={user} />
          {(() => {
            const filteredQuebras = filterHistoryForUser(quebras, user);
            const grouped = filteredQuebras.reduce((acc, q) => {
              const key = q.dataISO || (q.data ? q.data.split('/').reverse().join('-') : 'sem-data');
              if (!acc[key]) acc[key] = [];
              acc[key].push(q);
              return acc;
            }, {} as Record<string, QuebraRow[]>);

            if (Object.keys(grouped).length === 0) {
              return <div className="g-card p-12 text-center text-[#6a7d92]">Nenhuma quebra registrada.</div>;
            }

            return (Object.entries(grouped) as [string, QuebraRow[]][]).map(([dateKey, rows]) => {
              const isOpen = !!expandedDates[dateKey];
              const totalUnits = rows.reduce((s, q) => s + (q.quantidade || 0), 0);

              let formattedDate = dateKey;
              try {
                const [y, m, d] = dateKey.split('-');
                const dt = new Date(Number(y), Number(m) - 1, Number(d));
                const daysOfWeek = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
                formattedDate = `${d}/${m}/${y} — ${daysOfWeek[dt.getDay()]}`;
              } catch (e) {}

              return (
                <div key={dateKey} className="g-card overflow-hidden">
                  <div 
                    onClick={() => toggleDateGroup(dateKey)}
                    className="p-4 bg-[#151b23] flex items-center justify-between cursor-pointer select-none gap-4 flex-wrap"
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-sans font-black text-sm text-[#ef4444] tracking-wide">📅 {formattedDate}</span>
                      <span className="text-[10px] bg-[#11151c] border border-[#222d3a] px-2 py-0.5 rounded-full font-bold text-snow">
                        {rows.length} registros
                      </span>
                      <span className="text-[10px] text-[#6a7d92] font-semibold">
                        ❌ {totalUnits} unidades avariadas
                      </span>
                    </div>
                    <span className="text-[#6a7d92] text-xs transition-transform" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
                  </div>

                  {isOpen && (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse font-sans text-xs min-w-[700px]">
                        <thead>
                          <tr className="bg-[#07090d] border-b border-[#222d3a]">
                            <th className="p-3 text-[#6a7d92] text-left uppercase tracking-wider">Cód. SKU</th>
                            <th className="p-3 text-[#6a7d92] text-left uppercase tracking-wider">Descrição do SKU</th>
                            <th className="p-3 text-[#6a7d92] text-center uppercase tracking-wider">Unidades</th>
                            <th className="p-3 text-[#6a7d92] text-left uppercase tracking-wider">Área</th>
                            <th className="p-3 text-[#6a7d92] text-left uppercase tracking-wider">Turno</th>
                            <th className="p-3 text-[#6a7d92] text-left uppercase tracking-wider">Código Padrão</th>
                            <th className="p-3 text-[#6a7d92] text-left uppercase tracking-wider">Motivo</th>
                            <th className="p-3 text-[#6a7d92] text-right uppercase tracking-wider">Ação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#222d3a]/60">
                          {rows.map((q, i) => (
                            <tr key={q._docId || i} className="hover:bg-[#151b23]/10">
                              <td className="p-3 font-mono font-bold text-snow">{q.codProduto}</td>
                              <td className="p-3">{q.descricao}</td>
                              <td className="p-3 text-center text-red font-black text-sm">{q.quantidade}</td>
                              <td className="p-3 font-bold text-snow">{q.area}</td>
                              <td className="p-3 uppercase text-[10px] font-bold text-[#6a7d92]">{q.turno}</td>
                              <td className="p-3 font-mono font-bold text-[#f5a623]">{q.codQuebra}</td>
                              <td className="p-3 text-[#6a7d92]">
                                {q.motivo}
                                {q.colaboradorQuebrou && (
                                  <span className="block text-[10px] text-red-400 font-black uppercase tracking-wider mt-0.5">
                                    👤 Colab: {q.colaboradorQuebrou}
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button 
                                    onClick={() => handleStartEdit(q)}
                                    className="py-1 px-2 bg-blue-500/10 border border-blue-500/30 hover:bg-blue-600 text-blue-400 hover:text-white rounded text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1"
                                    title="Editar informações do registro"
                                  >
                                    ✏️ Editar
                                  </button>
                                  <button 
                                    onClick={() => handleDelete(q._docId)}
                                    className="py-1 px-2 bg-red-500/10 border border-[#ef4444]/20 hover:bg-[#ef4444] text-[#fca5a5] hover:text-white rounded text-[10px] font-bold cursor-pointer transition-all"
                                    title="Excluir lançamento"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* Sugerir Melhoria / Plano de Ação para Supervisores */}
      <SugerirMelhoriaCard user={user} empresa={empresa} setor="Quebras" />

      {/* Modal de Edição de Lançamento no Histórico */}
      {editingRow && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#11151c] border border-[#222d3a] rounded-xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4 text-snow max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#222d3a] pb-3">
              <h3 className="font-sans font-black text-sm uppercase tracking-wider text-[#ef4444] flex items-center gap-2">
                ✏️ EDITAR INFORMAÇÕES DO REGISTRO
              </h3>
              <button 
                onClick={() => setEditingRow(null)}
                className="text-[#6a7d92] hover:text-white font-bold text-base p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3.5 text-xs">
              {/* Data do Lançamento */}
              <div>
                <label className="block text-[11px] font-bold text-[#6a7d92] uppercase mb-1">Data do Lançamento</label>
                <input 
                  type="date"
                  value={editDataISO}
                  onChange={(e) => setEditDataISO(e.target.value)}
                  className="w-full bg-[#151b23] border border-[#222d3a] rounded p-2.5 text-snow font-mono focus:border-[#ef4444] outline-none"
                />
              </div>

              {/* Produto Autocomplete */}
              <div className="relative">
                <label className="block text-[11px] font-bold text-[#6a7d92] uppercase mb-1">Produto / SKU</label>
                <input 
                  type="text"
                  value={editProdBusca}
                  onChange={(e) => {
                    setEditProdBusca(e.target.value);
                    setShowEditProdDropdown(true);
                  }}
                  onFocus={() => setShowEditProdDropdown(true)}
                  placeholder="Digite o código ou descrição do produto..."
                  className="w-full bg-[#151b23] border border-[#222d3a] rounded p-2.5 text-snow font-mono focus:border-[#ef4444] outline-none"
                />
                {showEditProdDropdown && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-[#151b23] border border-[#222d3a] rounded shadow-xl max-h-48 overflow-y-auto divide-y divide-[#222d3a]">
                    {PRODUCTS.filter(p => {
                      const q = editProdBusca.toLowerCase();
                      return String(p.codigo).includes(q) || p.descricao.toLowerCase().includes(q);
                    }).slice(0, 8).map(p => (
                      <div 
                        key={p.codigo}
                        onClick={() => {
                          setEditSelectedProd(p);
                          setEditProdBusca(p.descricao);
                          setShowEditProdDropdown(false);
                        }}
                        className="p-2.5 hover:bg-[#222d3a] cursor-pointer flex justify-between items-center text-xs"
                      >
                        <span className="font-bold text-snow">{p.descricao}</span>
                        <span className="font-mono text-[#f5a623] text-[11px]">Cód: {p.codigo}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quantidade */}
              <div>
                <label className="block text-[11px] font-bold text-[#6a7d92] uppercase mb-1">Quantidade (Unidades)</label>
                <input 
                  type="number"
                  value={editQuantidade}
                  onChange={(e) => setEditQuantidade(e.target.value)}
                  min="1"
                  className="w-full bg-[#151b23] border border-[#222d3a] rounded p-2.5 text-snow font-bold text-sm focus:border-[#ef4444] outline-none"
                />
              </div>

              {/* Área */}
              <div>
                <label className="block text-[11px] font-bold text-[#6a7d92] uppercase mb-1">Área Operacional</label>
                <select 
                  value={editArea}
                  onChange={(e) => {
                    const newArea = e.target.value;
                    setEditArea(newArea);
                    const availableMotives = QB_TIPOS[newArea] || [];
                    if (availableMotives.length > 0) {
                      setEditMotivoCod(availableMotives[0].cod);
                    }
                  }}
                  className="w-full bg-[#151b23] border border-[#222d3a] rounded p-2.5 text-snow font-bold focus:border-[#ef4444] outline-none"
                >
                  <option value="ARMAZEM">ARMAZÉM</option>
                  <option value="ENTREGA">ENTREGA</option>
                  <option value="MERCADO">MERCADO</option>
                  <option value="PUXADA">PUXADA</option>
                </select>
              </div>

              {/* Turno */}
              <div>
                <label className="block text-[11px] font-bold text-[#6a7d92] uppercase mb-1">Turno</label>
                <select 
                  value={editTurno}
                  onChange={(e) => setEditTurno(e.target.value)}
                  className="w-full bg-[#151b23] border border-[#222d3a] rounded p-2.5 text-snow font-bold focus:border-[#ef4444] outline-none"
                >
                  <option value="MANHÃ">MANHÃ</option>
                  <option value="TARDE">TARDE</option>
                  <option value="NOITE / MADRUGADA">NOITE / MADRUGADA</option>
                </select>
              </div>

              {/* Motivo */}
              <div>
                <label className="block text-[11px] font-bold text-[#6a7d92] uppercase mb-1">Motivo da Quebra</label>
                <select 
                  value={editMotivoCod}
                  onChange={(e) => setEditMotivoCod(Number(e.target.value))}
                  className="w-full bg-[#151b23] border border-[#222d3a] rounded p-2.5 text-snow font-bold focus:border-[#ef4444] outline-none"
                >
                  {(QB_TIPOS[editArea] || QB_TIPOS['ARMAZEM']).map(m => (
                    <option key={m.cod} value={m.cod}>
                      [{m.cod}] {m.motivo}
                    </option>
                  ))}
                </select>
              </div>

              {/* Colaborador */}
              {(editMotivoCod === 539 || editMotivoCod === 557 || editMotivoCod === 589 || editColaborador || showEditCustomInput) && (
                <div className="flex flex-col gap-1.5">
                  <label className="block text-[11px] font-bold text-[#6a7d92] uppercase mb-1">Colaborador / Operador</label>
                  <select 
                    value={
                      showEditCustomInput 
                        ? 'OUTRO' 
                        : (editColaborador === '' ? '' : (colaboradoresList.includes(editColaborador) ? editColaborador : 'OUTRO'))
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'OUTRO') {
                        setShowEditCustomInput(true);
                        setEditColaborador('');
                      } else {
                        setShowEditCustomInput(false);
                        setEditColaborador(val);
                      }
                    }}
                    className="w-full bg-[#151b23] border border-[#222d3a] rounded p-2.5 text-snow font-bold focus:border-[#ef4444] outline-none"
                  >
                    <option value="">Selecione o Colaborador...</option>
                    {colaboradoresList.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    <option value="OUTRO">OUTRO / NÃO LISTADO (Digitar manualmente)...</option>
                  </select>

                  {showEditCustomInput && (
                    <input 
                      type="text"
                      placeholder="Digite o nome do colaborador..."
                      value={editColaborador}
                      onChange={(e) => setEditColaborador(e.target.value)}
                      className="w-full bg-[#151b23] border border-[#ef4444]/40 rounded p-2.5 text-snow font-bold text-xs focus:border-[#ef4444] outline-none animate-fadeIn"
                      required
                    />
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-[#222d3a] pt-4 mt-2">
              <button 
                onClick={() => setEditingRow(null)}
                className="px-4 py-2 border border-[#222d3a] hover:bg-[#151b23] text-[#6a7d92] hover:text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="px-5 py-2 bg-[#ef4444] hover:bg-red-600 text-white rounded-lg text-xs font-black cursor-pointer shadow-lg disabled:opacity-50 flex items-center gap-2"
              >
                {savingEdit ? 'Salvando...' : '💾 Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export {};
