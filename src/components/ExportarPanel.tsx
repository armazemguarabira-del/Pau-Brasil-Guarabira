import React, { useState, useEffect, useMemo } from 'react';
import { db, isCustomFirebaseConnected } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, writeBatch, query, where, getDocs } from 'firebase/firestore';
import { Usuario, Empresa, RepackRow, DespejoRow, QuebraRow, ValidadeRow, ArmazemRow, BlitzRefugoRow, Tarefa, ProdutoMaster, ColaboradorMaster } from '../types';
import { useEmpresaData } from '../context/EmpresaDataContext';
import * as XLSX from 'xlsx';
import { 
  exportWlpModelExcel, 
  parseWlpExcelFile, 
  commitWlpImport, 
  WlpImportPreviewResult, 
  WlpImportParsedRow 
} from '../utils/jornadaUtils';
import { 
  Calendar, 
  ArrowRight, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Upload, 
  Database, 
  CheckCircle, 
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Package,
  Users,
  Shield,
  Search,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  Target,
  Flame,
  Check,
  X,
  Clock,
  TrendingUp,
  Info
} from 'lucide-react';

interface ExportarPanelProps {
  user: Usuario;
  empresa: Empresa | null;
  theme?: 'light' | 'dark';
  onNavigate?: (panel: string, extra?: any) => void;
}

interface BackupLog {
  id: string;
  data: string;
  dataISO: string;
  tipo: string;
  tamanhoKb: number;
  totalLinhas: number;
  operador: string;
}

const PROCESSOS_LIST = [
  { id: 'ALL', label: '🚨 TODA A BASE OPERACIONAL (Todos os Processos)' },
  { id: 'repack', label: 'Repack' },
  { id: 'despejo', label: 'Despejo' },
  { id: 'quebras', label: 'Quebras & Recolha' },
  { id: 'validades', label: 'Validades (FEFO)' },
  { id: 'armazem', label: 'Armazém / Carretas' },
  { id: 'picking', label: 'Picking / Separação' },
  { id: 'blitz', label: 'Blitz & Refugo' }
];

export default function ExportarPanel({ user, empresa, theme = 'light', onNavigate }: ExportarPanelProps) {
  const empresaId = empresa?.id || 'demo';
  const empresaData = useEmpresaData();

  // ── SUB-TABS STATE ──
  const [activeMainSubTab, setActiveMainSubTab] = useState<'zerar-importar' | 'exportar-relatorios'>('zerar-importar');

  // ── APAGAR & IMPORTAR BASE DE OPERAÇÃO STATE ──
  const [opTargetToClear, setOpTargetToClear] = useState<string>('repack');
  const [clearingOp, setClearingOp] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importTarget, setImportTarget] = useState<string>('repack');
  const [replacePrevious, setReplacePrevious] = useState<boolean>(true);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);

  // ── WLP RETROACTIVE JOURNEYS IMPORT STATE ──
  const [wlpFile, setWlpFile] = useState<File | null>(null);
  const [wlpParsing, setWlpParsing] = useState(false);
  const [wlpPreview, setWlpPreview] = useState<WlpImportPreviewResult | null>(null);
  const [wlpImportSuccessMsg, setWlpImportSuccessMsg] = useState<string | null>(null);
  const [wlpFilterTerm, setWlpFilterTerm] = useState('');
  const [committingWlp, setCommittingWlp] = useState(false);

  // ── 5. EXPORTAR RELATÓRIOS & BACKUP STATE ──
  const [repack, setRepack] = useState<RepackRow[]>([]);
  const [despejo, setDespejo] = useState<DespejoRow[]>([]);
  const [quebras, setQuebras] = useState<QuebraRow[]>([]);
  const [validades, setValidades] = useState<ValidadeRow[]>([]);
  const [armazem, setArmazem] = useState<ArmazemRow[]>([]);
  const [blitz, setBlitz] = useState<BlitzRefugoRow[]>([]);
  const [tasks, setTasks] = useState<Tarefa[]>([]);

  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [backups, setBackups] = useState<BackupLog[]>([]);
  const [backingUp, setBackingUp] = useState(false);

  // Sync data from EmpresaDataContext
  useEffect(() => { setRepack(empresaData.repack); }, [empresaData.repack]);
  useEffect(() => { setDespejo(empresaData.despejo); }, [empresaData.despejo]);
  useEffect(() => { setQuebras(empresaData.quebras); }, [empresaData.quebras]);
  useEffect(() => { setValidades(empresaData.validades); }, [empresaData.validades]);
  useEffect(() => { setArmazem(empresaData.armazem); }, [empresaData.armazem]);
  useEffect(() => { setBlitz(empresaData.blitz); }, [empresaData.blitz]);
  useEffect(() => { setTasks(empresaData.tarefas); }, [empresaData.tarefas]);

  // Backup log initializer
  useEffect(() => {
    const saved = localStorage.getItem(`backups_${empresaId}`);
    if (saved) {
      setBackups(JSON.parse(saved));
    } else {
      const initBackups: BackupLog[] = [
        { id: 'BK-48301', data: '13/06/2026', dataISO: '2026-06-13T10:00:00.000Z', tipo: 'Completo (Auto Semanal)', tamanhoKb: 284, totalLinhas: 142, operador: 'Sistema (Interno)' },
        { id: 'BK-47429', data: '06/06/2026', dataISO: '2026-06-06T10:00:00.000Z', tipo: 'Completo (Auto Semanal)', tamanhoKb: 212, totalLinhas: 98, operador: 'Sistema (Interno)' },
      ];
      setBackups(initBackups);
      localStorage.setItem(`backups_${empresaId}`, JSON.stringify(initBackups));
    }
  }, [empresaId]);

  const toast = (msg: string) => {
    console.log('[BASE DE DADOS]', msg);
  };

  // ── HELPER: RETORNA CHAVES DE LOCALSTORAGE E COLLECTION FIRESTORE POR OPERAÇÃO ──
  const getKeysForOp = (key: string) => {
    const keys: string[] = [];
    if (key === 'repack') keys.push(`repack_${empresaId}`, `repack_rows_${empresaId}`);
    else if (key === 'despejo') keys.push(`despejo_${empresaId}`, `despejo_rows_${empresaId}`);
    else if (key === 'quebras') keys.push(`quebras_${empresaId}`, `quebras_rows_${empresaId}`);
    else if (key === 'validades') keys.push(`validades_${empresaId}`, `validades_rows_${empresaId}`);
    else if (key === 'armazem') keys.push(`armazem_${empresaId}`, `armazem_rows_${empresaId}`);
    else if (key === 'picking') keys.push(`tasks_${empresaId}`, `picking_rows_${empresaId}`, `tarefas_${empresaId}`);
    else if (key === 'blitz') keys.push(`blitz_${empresaId}`, `blitz_refugo_${empresaId}`);
    else if (key === 'jornadas') keys.push(`colaboradores_jornadas_${empresaId}`, `wlp_daily_faturado_${empresaId}`);

    const colName = key === 'armazem' ? 'armazem' : key === 'picking' ? 'tarefas' : key === 'blitz' ? 'blitz_refugo' : key === 'jornadas' ? 'jornadas_colaboradores' : key;
    keys.push(`sync:${empresaId}:${colName}`);
    return { keys, colName };
  };

  // ── WLP HANDLERS ──
  const handleWlpFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;
    setWlpFile(file);
    setWlpParsing(true);
    setWlpImportSuccessMsg(null);
    try {
      const res = await parseWlpExcelFile(file, empresaId);
      setWlpPreview(res);
    } catch (err: any) {
      setWlpPreview({
        success: false,
        totalRows: 0,
        importedCount: 0,
        pendenciasCount: 0,
        novosCount: 0,
        sobrescreverCount: 0,
        datasIntervalo: '',
        colaboradoresUnicosCount: 0,
        tempoMedioGeralHoras: 0,
        rendimentoMedioHL: 0,
        mediaPorCargo: [],
        tempoMedioPorColaborador: [],
        rendimentoPorDia: [],
        rows: [],
        pendencias: [],
        colaboradoresNaoCadastrados: [],
        validationError: 'Erro ao processar planilha: ' + (err?.message || err)
      });
    } finally {
      setWlpParsing(false);
    }
  };

  const handleConfirmWlpImport = () => {
    if (!wlpPreview || !wlpPreview.success) return;
    setCommittingWlp(true);
    try {
      const result = commitWlpImport(wlpPreview, empresaId);
      setWlpImportSuccessMsg(
        `✅ Importação de Jornadas concluída com sucesso! ${result.importedCount} registros gravados (${result.newCount} novos e ${result.overwrittenCount} sobrescritos/atualizados). Os dashboards de Produtividade e WLP foram atualizados!`
      );
      setWlpPreview(null);
      setWlpFile(null);
    } catch (err: any) {
      alert('Erro ao gravar importação: ' + (err?.message || err));
    } finally {
      setCommittingWlp(false);
    }
  };

  // ── APAGAR BASE DE OPERAÇÃO & IMPORTAR NOVA ──
  const handleApagarBaseOperacao = async (opKey: string) => {
    if (opKey === 'ALL') {
      const confirmAll = confirm(
        '🚨 ATENÇÃO CRÍTICA: Deseja realmente APAGAR TODA A BASE OPERACIONAL DE TODOS OS PROCESSOS DA PLATAFORMA?\n\nEsta ação apagará todo o histórico de Repack, Despejo, Quebras, Validades, Armazém, Picking, Blitz e Jornadas WLP para permitir importar novos arquivos a partir do início do ano!'
      );
      if (!confirmAll) return;

      setClearingOp(true);
      try {
        const allOps = ['repack', 'despejo', 'quebras', 'validades', 'armazem', 'picking', 'blitz', 'jornadas'];
        for (const op of allOps) {
          const { keys, colName } = getKeysForOp(op);
          if (db) {
            try {
              const q = query(collection(db, colName), where('empresaId', '==', empresaId));
              const snap = await getDocs(q);
              for (const docSnap of snap.docs) {
                await deleteDoc(doc(db, colName, docSnap.id));
              }
            } catch (e) {
              console.warn(`Erro ao deletar collection ${colName}:`, e);
            }
          }
          keys.forEach(k => localStorage.removeItem(k));
        }
        alert('✅ TODA A BASE OPERACIONAL DA PLATAFORMA FOI ZERADA COM SUCESSO! Você pode importar as novas planilhas com datas do início do ano.');
        setTimeout(() => window.location.reload(), 500);
      } catch (e: any) {
        alert('Erro ao zerar base completa: ' + (e?.message || e));
      } finally {
        setClearingOp(false);
      }
      return;
    }

    const mapNames: Record<string, string> = {
      repack: 'Repack',
      despejo: 'Despejo',
      quebras: 'Quebras & Avarias',
      validades: 'Validades (FEFO)',
      armazem: 'Armazém / Carretas (EFC/EFD)',
      picking: 'Picking & Separação',
      blitz: 'Blitz de Refugo',
      jornadas: 'Jornadas / WLP (Pontos & Volume Faturado)'
    };

    const opName = mapNames[opKey] || opKey.toUpperCase();
    const confirmDelete = confirm(
      `⚠️ ATENÇÃO: Deseja realmente APAGAR TODOS os registros da base do processo "${opName}"?\n\nEsta ação excluirá permanentemente todo o histórico de lançamentos desta operação!`
    );

    if (!confirmDelete) return;

    setClearingOp(true);
    try {
      const { keys, colName } = getKeysForOp(opKey);

      if (db) {
        try {
          const q = query(collection(db, colName), where('empresaId', '==', empresaId));
          const snap = await getDocs(q);
          for (const docSnap of snap.docs) {
            await deleteDoc(doc(db, colName, docSnap.id));
          }
        } catch (e) {
          console.warn('Erro ao deletar via query Firestore:', e);
        }

        let itemsToDelete: any[] = [];
        if (opKey === 'repack') itemsToDelete = repack;
        else if (opKey === 'despejo') itemsToDelete = despejo;
        else if (opKey === 'quebras') itemsToDelete = quebras;
        else if (opKey === 'validades') itemsToDelete = validades;
        else if (opKey === 'armazem') itemsToDelete = armazem;
        else if (opKey === 'blitz') itemsToDelete = blitz;
        else if (opKey === 'picking') itemsToDelete = tasks;

        for (const docObj of itemsToDelete) {
          if (docObj._docId) {
            try {
              await deleteDoc(doc(db, colName, docObj._docId));
            } catch (e) {}
          }
        }
      }

      // Limpar todos os caches no LocalStorage
      keys.forEach(k => localStorage.removeItem(k));

      alert(`Base do processo "${opName}" zerada com sucesso! Você pode importar uma nova planilha abaixo.`);
      setTimeout(() => window.location.reload(), 500);
    } catch (e: any) {
      alert('Erro ao apagar base da operação: ' + (e?.message || e));
    } finally {
      setClearingOp(false);
    }
  };

  const handleDownloadHistoricalSample = (targetKey: string) => {
    if (targetKey === 'jornadas') {
      exportWlpModelExcel();
      return;
    }

    let sampleData: any[] = [];
    let fileName = `Modelo_Importacao_${targetKey.toUpperCase()}_Ano2026.xlsx`;

    if (targetKey === 'repack') {
      sampleData = [
        { 'Data': '05/01/2026', 'DataISO': '2026-01-05', 'Embalagem': 'LATA 350', 'Quantidade': 450, 'Inicio': '08:00', 'Fim': '09:30', 'Duracao': '01:30:00', 'Meta': '400', 'Resultado': '🟢 META BATIDA', 'Operador': 'EDMILSON FERREIRA DA SILVA' },
        { 'Data': '12/01/2026', 'DataISO': '2026-01-12', 'Embalagem': 'LATA 269', 'Quantidade': 380, 'Inicio': '10:00', 'Fim': '11:45', 'Duracao': '01:45:00', 'Meta': '350', 'Resultado': '🟢 META BATIDA', 'Operador': 'MIGUEL ARCANJO NETO' },
        { 'Data': '02/02/2026', 'DataISO': '2026-02-02', 'Embalagem': 'GARRAFA 600', 'Quantidade': 520, 'Inicio': '13:00', 'Fim': '15:00', 'Duracao': '02:00:00', 'Meta': '500', 'Resultado': '🟢 META BATIDA', 'Operador': 'GILMAR CARDOSO' }
      ];
    } else if (targetKey === 'despejo') {
      sampleData = [
        { 'Data': '06/01/2026', 'DataISO': '2026-01-06', 'Embalagem': 'LATA 350', 'Quantidade': 320, 'Inicio': '08:00', 'Fim': '09:00', 'Tempo': '01:00:00', 'Meta': '85 cx/h', 'Resultado': '🟢 DENTRO DA META', 'Operador': 'LUIZ CARLOS SOARES' },
        { 'Data': '15/01/2026', 'DataISO': '2026-01-15', 'Embalagem': 'LATA 269', 'Quantidade': 290, 'Inicio': '09:30', 'Fim': '10:30', 'Tempo': '01:00:00', 'Meta': '85 cx/h', 'Resultado': '🟢 DENTRO DA META', 'Operador': 'PAULO SERGIO COSTA' }
      ];
    } else if (targetKey === 'quebras') {
      sampleData = [
        { 'Data': '08/01/2026', 'DataISO': '2026-01-08', 'CodProduto': '1001', 'Descricao': 'SKOL LATA 350ML', 'Quantidade': 12, 'Area': 'Armazém', 'Turno': '1º Turno', 'CodQuebra': 'Q1', 'Motivo': 'Avaria na movimentação', 'Colaborador': 'EDMILSON FERREIRA DA SILVA' }
      ];
    } else {
      sampleData = [
        { 'Data': '10/01/2026', 'DataISO': '2026-01-10', 'Codigo': '1001', 'Descricao': 'CORONA EXTRA 330ML', 'Quantidade': 150, 'Conferente': 'EDMILSON FERREIRA DA SILVA', 'Operador': 'MIGUEL ARCANJO NETO', 'Status': 'Concluído' }
      ];
    }

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modelo');
    XLSX.writeFile(wb, fileName);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        if (json.length > 0) {
          setImportHeaders((json[0] as any[]).map(String));
          setImportPreview(XLSX.utils.sheet_to_json(worksheet).slice(0, 5));
        }
      } catch (err) {
        alert('Erro ao ler planilha: ' + err);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImportSubmit = async () => {
    if (!importFile) return;
    setImporting(true);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet) as any[];

        if (rows.length === 0) {
          alert('Planilha vazia.');
          setImporting(false);
          return;
        }

        const { keys, colName } = getKeysForOp(importTarget);

        if (replacePrevious) {
          if (db) {
            try {
              const q = query(collection(db, colName), where('empresaId', '==', empresaId));
              const snap = await getDocs(q);
              for (const docSnap of snap.docs) {
                await deleteDoc(doc(db, colName, docSnap.id));
              }
            } catch (e) {}
          }
          keys.forEach(k => localStorage.removeItem(k));
        }

        let importedCount = 0;
        const todayStr = new Date().toLocaleDateString('pt-BR');
        const todayISO = new Date().toISOString().split('T')[0];
        const importedList: any[] = [];

        for (const raw of rows) {
          let docData: any = { empresaId };
          const cleanRow: Record<string, any> = {};
          Object.entries(raw).forEach(([k, v]) => {
            cleanRow[k.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "")] = v;
          });

          if (importTarget === 'repack') {
            docData = {
              ...docData,
              data: String(cleanRow.data || todayStr),
              dataISO: String(cleanRow.dataiso || todayISO),
              embalagem: String(cleanRow.embalagem || 'LATA 250').toUpperCase(),
              quantidade: Number(cleanRow.quantidade || cleanRow.qtd || 1),
              inicio: String(cleanRow.inicio || '08:00'),
              fim: String(cleanRow.fim || '08:30'),
              duracao: String(cleanRow.duracao || '00:30:00'),
              meta: String(cleanRow.meta || '00:00:43'),
              resultado: String(cleanRow.resultado || '🟢 META BATIDA'),
              operador: String(cleanRow.operador || user.nome)
            };
          } else if (importTarget === 'despejo') {
            docData = {
              ...docData,
              data: String(cleanRow.data || todayStr),
              dataISO: String(cleanRow.dataiso || todayISO),
              embalagem: String(cleanRow.embalagem || 'LATA 350').toUpperCase(),
              quantidade: Number(cleanRow.quantidade || cleanRow.qtd || 1),
              inicio: String(cleanRow.inicio || '08:00'),
              fim: String(cleanRow.fim || '08:30'),
              tempo: String(cleanRow.tempo || '00:30:00'),
              meta: String(cleanRow.meta || '85 cx/h'),
              resultado: String(cleanRow.resultado || '🟢 DENTRO DA META'),
              operador: String(cleanRow.operador || user.nome)
            };
          } else if (importTarget === 'quebras') {
            docData = {
              ...docData,
              data: String(cleanRow.data || todayStr),
              dataISO: String(cleanRow.dataiso || todayISO),
              codProduto: String(cleanRow.codproduto || cleanRow.codigo || '000'),
              descricao: String(cleanRow.descricao || 'Produto Avariado'),
              quantidade: Number(cleanRow.quantidade || cleanRow.qtd || 1),
              area: String(cleanRow.area || 'Armazém'),
              turno: String(cleanRow.turno || '1º Turno'),
              codQuebra: String(cleanRow.codquebra || 'Q1'),
              motivo: String(cleanRow.motivo || 'Queda de Palete'),
              colaboradorQuebrou: String(cleanRow.colaborador || 'Não Identificado')
            };
          } else if (importTarget === 'validades') {
            docData = {
              ...docData,
              id: Date.now() + Math.floor(Math.random() * 100000),
              codigo: String(cleanRow.codigo || cleanRow.cod || '000'),
              descricao: String(cleanRow.descricao || 'Produto FEFO'),
              palhete: Number(cleanRow.palhete || 1),
              lastro: Number(cleanRow.lastro || 1),
              caixa: Number(cleanRow.caixa || 1),
              validade: String(cleanRow.validade || todayISO),
              localizacao: String(cleanRow.localizacao || 'picking')
            };
          } else if (importTarget === 'blitz') {
            docData = {
              ...docData,
              data: String(cleanRow.data || todayStr),
              dataISO: String(cleanRow.dataiso || todayISO),
              placa: String(cleanRow.placa || 'AAA-0000').toUpperCase(),
              tipo: String(cleanRow.tipo || 'Puxada'),
              conferente: String(cleanRow.conferente || user.nome),
              resultado: String(cleanRow.resultado || 'SEM DIVERGÊNCIA'),
              itensVerificados: Number(cleanRow.itensverificados || cleanRow.itens || 1)
            };
          } else if (importTarget === 'picking') {
            docData = {
              ...docData,
              data: String(cleanRow.data || todayStr),
              dataISO: String(cleanRow.dataiso || todayISO),
              codigo: String(cleanRow.codigo || cleanRow.cod || '000'),
              descricao: String(cleanRow.descricao || 'Item Picking'),
              quantidade: Number(cleanRow.quantidade || cleanRow.qtd || 1),
              conferente: String(cleanRow.conferente || user.nome),
              operador: String(cleanRow.operador || user.nome),
              status: String(cleanRow.status || 'Concluído')
            };
          } else {
            docData = {
              ...docData,
              data: String(cleanRow.data || todayStr),
              dataISO: String(cleanRow.dataiso || todayISO),
              operacao: String(cleanRow.operacao || 'Recebimento'),
              inicio: String(cleanRow.inicio || '08:00'),
              fim: String(cleanRow.fim || '10:00'),
              status: String(cleanRow.status || 'Concluído'),
              empilhador: String(cleanRow.empilhador || user.nome),
              turno: String(cleanRow.turno || '1º Turno'),
              placa: String(cleanRow.placa || 'AAA-0000'),
              tipo: String(cleanRow.tipo || 'Puxada'),
              palhete: Number(cleanRow.palhete || 0)
            };
          }

          if (db) {
            try {
              const addedRef = await addDoc(collection(db, colName), docData);
              docData._docId = addedRef.id;
              if (!docData.id) docData.id = addedRef.id;
            } catch (e) {
              console.warn('Erro ao salvar no Firestore:', e);
            }
          }

          importedList.push(docData);
          importedCount++;
        }

        // Salvar também no local storage para sincronização e cálculo offline instantâneo
        keys.forEach(k => {
          if (!k.startsWith('sync:')) {
            localStorage.setItem(k, JSON.stringify(importedList));
          }
        });

        alert(`Sucesso! ${importedCount} registros importados para ${importTarget.toUpperCase()}.`);
        setImportFile(null);
        setImportPreview([]);
        setImporting(false);
        setTimeout(() => window.location.reload(), 500);
      } catch (err: any) {
        alert('Erro ao importar planilha: ' + err);
        setImporting(false);
      }
    };
    reader.readAsBinaryString(importFile);
  };

  // ── EXPORTAR RELATÓRIOS HANDLERS ──
  const isWithinInterval = (dateStr: string, startStr: string, endStr: string): boolean => {
    if (!dateStr) return false;
    let normalized = dateStr.includes('/') 
      ? `${dateStr.split('/')[2]}-${dateStr.split('/')[1].padStart(2, '0')}-${dateStr.split('/')[0].padStart(2, '0')}`
      : dateStr.split('T')[0];
    return normalized >= startStr && normalized <= endStr;
  };

  const exportPickingCSV = () => {
    const filtered = tasks.filter(t => (t.criadoEm || '').split('T')[0] >= startDate && (t.criadoEm || '').split('T')[0] <= endDate);
    if (filtered.length === 0) { alert('Nenhum registro no período.'); return; }
    const headers = ['ID', 'SKU', 'Descrição', 'Quantidade', 'Conferente', 'Operador', 'Status'];
    const rows = filtered.map(t => [t.id, t.codigo, t.descricao, t.quantidade, t.conferente, t.operador, t.status]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `Picking_${startDate}_ate_${endDate}.csv`;
    link.click();
  };

  const exportDespejoExcel = () => {
    const filtered = despejo.filter(d => isWithinInterval(d.dataISO || d.data, startDate, endDate));
    if (filtered.length === 0) { alert('Nenhum registro no período.'); return; }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(filtered.map(d => ({
      Data: d.data, Embalagem: d.embalagem, Caixas: d.quantidade, Inicio: d.inicio, Fim: d.fim, Tempo: d.tempo, Meta: d.meta, Resultado: d.resultado, Operador: d.operador
    })));
    XLSX.utils.book_append_sheet(wb, ws, 'Despejo');
    XLSX.writeFile(wb, `Despejo_${startDate}_ate_${endDate}.xlsx`);
  };

  const exportRepackExcel = () => {
    const filtered = repack.filter(r => isWithinInterval(r.dataISO || r.data, startDate, endDate));
    if (filtered.length === 0) { alert('Nenhum registro no período.'); return; }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(filtered.map(r => ({
      Data: r.data, Embalagem: r.embalagem, Quantidade: r.quantidade, Inicio: r.inicio, Fim: r.fim, Meta: r.meta, Resultado: r.resultado, Operador: r.operador
    })));
    XLSX.utils.book_append_sheet(wb, ws, 'Repack');
    XLSX.writeFile(wb, `Repack_${startDate}_ate_${endDate}.xlsx`);
  };

  return (
    <div className={`space-y-6 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
      
      {/* ── TOP MAIN SUB-TAB NAVIGATION ── */}
      <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-3 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
              Base de Dados Central
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Expurgo/Zerar Histórico, Importação de Planilhas e Exportação de Relatórios
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-[#0b1222] border border-slate-800 p-1 rounded-xl gap-1">
            <button
              onClick={() => setActiveMainSubTab('zerar-importar')}
              className={`px-3.5 py-2 rounded-lg font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer border-none ${
                activeMainSubTab === 'zerar-importar'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white bg-transparent'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              Apagar & Importar Base
            </button>

            <button
              onClick={() => setActiveMainSubTab('exportar-relatorios')}
              className={`px-3.5 py-2 rounded-lg font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer border-none ${
                activeMainSubTab === 'exportar-relatorios'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white bg-transparent'
              }`}
            >
              <Download className="w-4 h-4" />
              Exportar Relatórios
            </button>
          </div>

          {onNavigate && (
            <button
              onClick={() => onNavigate('cadastros')}
              className="px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Database className="w-4 h-4" />
              Central de Cadastros ↗
            </button>
          )}
        </div>
      </div>

      {/* ── 4. SUB-ABA: APAGAR & IMPORTAR BASE DE OPERAÇÃO ── */}
      {activeMainSubTab === 'zerar-importar' && (
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* APAGAR BASE SEÇÃO */}
          <div className="bg-[#111a30] border border-rose-900/40 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-rose-900/30 pb-3">
              <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Apagar / Zerar Base de Uma Operação
                </h3>
                <p className="text-xs text-slate-400">
                  Remova completamente os lançamentos históricos de um processo mantendo todas as metas intactas.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 bg-[#0b1222] p-4 rounded-xl border border-slate-800">
              <div className="flex-1 space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Selecione a Operação para Apagar:
                </label>
                <select
                  value={opTargetToClear}
                  onChange={(e) => setOpTargetToClear(e.target.value)}
                  className="w-full bg-[#111a30] border border-slate-700 text-white text-xs font-bold rounded-xl p-2.5 outline-none cursor-pointer"
                >
                  <option value="ALL">🚨 TODA A BASE OPERACIONAL (Todos os Processos / Dashboards)</option>
                  <option value="repack">📦 Repack de Embalagens</option>
                  <option value="despejo">🧪 Despejo de PNC</option>
                  <option value="quebras">💥 Quebras e Avarias</option>
                  <option value="validades">🏷️ Validades e Lotes (FEFO)</option>
                  <option value="armazem">🚛 Armazém e Carretas (EFC/EFD)</option>
                  <option value="picking">📦 Picking e Separação</option>
                  <option value="blitz">🔍 Blitz de Refugo</option>
                  <option value="jornadas">⏱️ Jornadas / WLP (Pontos & Volume Faturado)</option>
                </select>
              </div>

              <button
                onClick={() => handleApagarBaseOperacao(opTargetToClear)}
                disabled={clearingOp}
                className="px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-md flex items-center justify-center gap-2 self-end sm:self-center"
              >
                {clearingOp ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {opTargetToClear === 'ALL' ? 'Apagar TODA a Base Operacional' : 'Apagar Base da Operação'}
              </button>
            </div>
          </div>

          {/* IMPORTAR NOVA BASE SEÇÃO */}
          <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    Importar Nova Base por Planilha (CSV / XLSX)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Faça o upload da nova base de dados para o processo selecionado.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleDownloadHistoricalSample(importTarget)}
                className="px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all uppercase tracking-wider"
              >
                <Download className="w-4 h-4" />
                Baixar Planilha Exemplo (Início do Ano)
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Módulo de Destino
                </label>
                <select
                  value={importTarget}
                  onChange={(e: any) => setImportTarget(e.target.value)}
                  className="w-full bg-[#0b1222] border border-slate-800 text-white text-xs font-bold rounded-xl p-2.5 outline-none cursor-pointer"
                >
                  <option value="repack">📦 Repack</option>
                  <option value="despejo">🧪 Despejo</option>
                  <option value="quebras">💥 Quebras</option>
                  <option value="validades">🏷️ Validades (FEFO)</option>
                  <option value="armazem">🚛 Armazém (EFC/EFD)</option>
                  <option value="picking">📦 Picking</option>
                  <option value="blitz">🔍 Blitz de Refugo</option>
                  <option value="jornadas">⏱️ Jornadas / WLP (Aba Única - Horários & Volume)</option>
                </select>
              </div>

              {importTarget !== 'jornadas' && (
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer bg-[#0b1222] p-2.5 border border-slate-800 rounded-xl w-full">
                    <input
                      type="checkbox"
                      checked={replacePrevious}
                      onChange={(e) => setReplacePrevious(e.target.checked)}
                      className="accent-rose-500 rounded"
                    />
                    <span className="text-xs font-bold text-slate-300">Apagar dados anteriores antes de importar</span>
                  </label>
                </div>
              )}
            </div>

            {/* IF JORNADAS WLP IS SELECTED */}
            {importTarget === 'jornadas' ? (
              <div className="space-y-5 pt-2">
                {/* WLP FORMAT GUIDELINE BOX */}
                <div className="bg-[#0b1222] border border-sky-500/30 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sky-400">
                    <Info className="w-4 h-4" />
                    <span className="text-xs font-black uppercase tracking-wider">Regras & Formato Obrigatório da Planilha de Jornadas (WLP)</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    A planilha deve possuir uma <strong>aba única</strong> com os seguintes cabeçalhos na <strong>Linha 1</strong>:
                  </p>
                  <div className="bg-[#111a30] p-3 rounded-xl border border-slate-800 text-[11px] font-mono text-sky-300 overflow-x-auto flex flex-wrap gap-2">
                    <span className="bg-slate-800 px-2 py-1 rounded">Data (DD/MM/AAAA)</span>
                    <span className="bg-slate-800 px-2 py-1 rounded">Volume Faturado (HL)</span>
                    <span className="bg-slate-800 px-2 py-1 rounded">Nome Colaborador</span>
                    <span className="bg-slate-800 px-2 py-1 rounded">Cargo</span>
                    <span className="bg-slate-800 px-2 py-1 rounded">Hora Inicio (HH:MM)</span>
                    <span className="bg-slate-800 px-2 py-1 rounded">Hora Fim (HH:MM)</span>
                    <span className="bg-slate-800 px-2 py-1 rounded">Observações</span>
                  </div>
                  <div className="text-[11px] text-slate-400 space-y-1 pt-1">
                    <p>• <strong>Virada de Dia (Turno Noturno):</strong> Se Hora Fim &lt; Hora Início (ex: 18:00 às 01:30), a duração é calculada automaticamente (7h30 = 7.50h).</p>
                    <p>• <strong>Normalização de Nomes:</strong> Os nomes são higienizados sem acentos/caracteres para evitar cadastros duplicados no sistema.</p>
                    <p>• <strong>Sobrescrita Automática:</strong> Se já existir lançamento para o mesmo dia e colaborador, os dados anteriores serão atualizados sem duplicar registros.</p>
                  </div>
                </div>

                {/* SUCCESS MESSAGE */}
                {wlpImportSuccessMsg && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-emerald-300 font-medium">
                      {wlpImportSuccessMsg}
                    </div>
                  </div>
                )}

                {/* FILE INPUT */}
                <div className="relative border-2 border-dashed border-sky-500/40 hover:border-sky-400 rounded-2xl p-6 text-center bg-[#0b1222]/80 transition-colors">
                  <input
                    type="file"
                    accept=".csv, .xlsx, .xls"
                    onChange={handleWlpFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <FileSpreadsheet className="w-10 h-10 text-sky-400 mx-auto mb-2" />
                  <span className="text-xs font-black text-white block uppercase tracking-wider">
                    {wlpFile ? wlpFile.name : 'Clique ou arraste a planilha de Jornadas (.xlsx / .csv) aqui'}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Análise determinística em client-side — sem envio para servidores externos.
                  </p>
                </div>

                {/* PARSING SPINNER */}
                {wlpParsing && (
                  <div className="bg-[#0b1222] p-6 rounded-2xl border border-slate-800 text-center space-y-2">
                    <RefreshCw className="w-6 h-6 text-sky-400 animate-spin mx-auto" />
                    <p className="text-xs font-bold text-white uppercase tracking-wider">Analisando e validando arquivo Excel...</p>
                  </div>
                )}

                {/* VALIDATION ERROR DISPLAY */}
                {wlpPreview && !wlpPreview.success && (
                  <div className="bg-rose-500/10 border border-rose-500/30 p-5 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-rose-400 font-black text-xs uppercase tracking-wider">
                      <AlertTriangle className="w-5 h-5" />
                      Falha na Validação da Planilha
                    </div>
                    <p className="text-xs text-rose-200 font-mono bg-[#0b1222] p-3 rounded-xl border border-rose-900/40">
                      {wlpPreview.validationError}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Corrija a linha informada no arquivo e faça o upload novamente para prosseguir.
                    </p>
                  </div>
                )}

                {/* PREVIEW DASHBOARD & CONFIRMATION */}
                {wlpPreview && wlpPreview.success && (
                  <div className="bg-[#0b1222] border border-slate-800 rounded-2xl p-5 space-y-5">
                    {/* LARGE FILE WARNING ALERT */}
                    {wlpPreview.warningLargeFile && (
                      <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                        <span className="text-xs text-amber-200 font-bold">{wlpPreview.warningLargeFile}</span>
                      </div>
                    )}

                    {/* TOP HEADER */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                      <div>
                        <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                          <Clock className="w-4 h-4 text-sky-400" />
                          Prévia da Importação — Intervalo: {wlpPreview.datasIntervalo}
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          Revise as linhas válidas, pendências e estatísticas calculadas antes de gravar na base.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => { setWlpPreview(null); setWlpFile(null); }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleConfirmWlpImport}
                          disabled={committingWlp}
                          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-lg flex items-center gap-2"
                        >
                          {committingWlp ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                          Confirmar e Gravar ({wlpPreview.importedCount} Válidos)
                        </button>
                      </div>
                    </div>

                    {/* KPI CARDS GRID */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                      <div className="bg-[#111a30] p-3 rounded-xl border border-slate-800 text-center">
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Linhas Lidas</span>
                        <span className="text-lg font-black text-white">{wlpPreview.totalRows}</span>
                      </div>

                      <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 text-center">
                        <span className="text-[9px] font-bold text-emerald-400 uppercase block">✨ Válidas (Importar)</span>
                        <span className="text-lg font-black text-emerald-300">{wlpPreview.importedCount}</span>
                      </div>

                      <div className={`p-3 rounded-xl border text-center ${wlpPreview.pendenciasCount > 0 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-[#111a30] border-slate-800'}`}>
                        <span className={`text-[9px] font-bold uppercase block ${wlpPreview.pendenciasCount > 0 ? 'text-amber-400' : 'text-slate-400'}`}>⚠️ Pendências</span>
                        <span className={`text-lg font-black ${wlpPreview.pendenciasCount > 0 ? 'text-amber-300' : 'text-slate-400'}`}>{wlpPreview.pendenciasCount}</span>
                      </div>

                      <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 text-center">
                        <span className="text-[9px] font-bold text-amber-400 uppercase block">🔄 Sobrescrever</span>
                        <span className="text-lg font-black text-amber-300">{wlpPreview.sobrescreverCount}</span>
                      </div>

                      <div className="bg-[#111a30] p-3 rounded-xl border border-slate-800 text-center">
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Colaboradores</span>
                        <span className="text-lg font-black text-sky-400">{wlpPreview.colaboradoresUnicosCount}</span>
                      </div>

                      <div className="bg-[#111a30] p-3 rounded-xl border border-slate-800 text-center">
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Duração Média</span>
                        <span className="text-lg font-black text-purple-400">{wlpPreview.tempoMedioGeralHoras}h</span>
                      </div>

                      <div className="bg-[#111a30] p-3 rounded-xl border border-slate-800 text-center">
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Rendimento Médio</span>
                        <span className="text-lg font-black text-emerald-400">{wlpPreview.rendimentoMedioHL} <span className="text-[9px]">HL/colab</span></span>
                      </div>
                    </div>

                    {/* ALERTA DE COLABORADORES NÃO CADASTRADOS */}
                    {wlpPreview.colaboradoresNaoCadastrados && wlpPreview.colaboradoresNaoCadastrados.length > 0 && (
                      <div className="bg-sky-500/10 border border-sky-500/30 p-3.5 rounded-2xl space-y-2">
                        <div className="flex items-center gap-2 text-sky-300 text-xs font-black uppercase tracking-wider">
                          <Users className="w-4 h-4" />
                          Colaboradores não encontrados no cadastro oficial ({wlpPreview.colaboradoresNaoCadastrados.length}):
                        </div>
                        <p className="text-[11px] text-slate-300">
                          Estes colaboradores receberam cargo padrão e serão <strong>cadastrados automaticamente</strong> ao confirmar a importação:
                        </p>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {wlpPreview.colaboradoresNaoCadastrados.map(name => (
                            <span key={name} className="px-2.5 py-1 bg-[#111a30] border border-sky-500/30 text-sky-200 text-[11px] font-bold rounded-lg font-mono">
                              {name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* PENDÊNCIAS LISTING IF ANY */}
                    {wlpPreview.pendencias && wlpPreview.pendencias.length > 0 && (
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-amber-400 font-black text-xs uppercase tracking-wider">
                            <AlertTriangle className="w-4 h-4" />
                            Linhas com Pendência / Incompletas ({wlpPreview.pendencias.length}) — Não Descartadas
                          </div>
                          <span className="text-[10px] text-amber-300 font-bold">
                            Estas linhas serão ignoradas na gravação automática até correção
                          </span>
                        </div>

                        <div className="overflow-x-auto max-h-48 rounded-xl border border-amber-500/20 bg-[#111a30]">
                          <table className="w-full text-left text-xs text-slate-300">
                            <thead className="bg-[#0b1222] text-[10px] uppercase font-bold text-amber-400 sticky top-0">
                              <tr>
                                <th className="p-2">Linha</th>
                                <th className="p-2">Data</th>
                                <th className="p-2">Colaborador</th>
                                <th className="p-2">Início/Fim</th>
                                <th className="p-2">Motivo da Pendência</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
                              {wlpPreview.pendencias.map(p => (
                                <tr key={`pend-${p.lineNum}-${p.colaboradorNomeOriginal}`} className="hover:bg-slate-800/50">
                                  <td className="p-2 text-amber-300 font-bold">{p.lineNum}</td>
                                  <td className="p-2">{p.dataStr}</td>
                                  <td className="p-2 font-sans font-bold text-white">{p.colaboradorNomeOriginal}</td>
                                  <td className="p-2 text-slate-400">{p.horaInicio || '--:--'} às {p.horaFim || '--:--'}</td>
                                  <td className="p-2 text-rose-300 font-sans font-bold">{p.motivo}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* MEDIAS POR CARGO */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                        ⏱️ Média de Tempo de Jornada por Cargo:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {wlpPreview.mediaPorCargo.map(c => (
                          <div key={c.cargo} className="bg-[#111a30] border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-200 flex items-center gap-2">
                            <span className="text-sky-400">{c.cargo}:</span>
                            <span className="text-white font-mono">{c.mediaHoras}h</span>
                            <span className="text-[10px] text-slate-400 font-normal">({c.count} reg)</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* RENDIMENTO POR DIA */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                        📦 Rendimento Calculado por Dia (Volume Faturado ÷ Nº Colaboradores Ativos):
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                        {wlpPreview.rendimentoPorDia.map(d => (
                          <div key={d.dataISO} className="bg-[#111a30] border border-slate-800 p-2.5 rounded-xl text-xs flex items-center justify-between">
                            <div>
                              <span className="font-bold text-white block">{d.dataStr}</span>
                              <span className="text-[10px] text-slate-400">{d.volumeHL} HL • {d.colabsCount} colabs</span>
                            </div>
                            <span className="font-black text-emerald-400 font-mono">{d.rendimentoHL} HL/colab</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* DETAILED ROWS TABLE PREVIEW */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                          📋 Registros Válidos a Importar ({wlpPreview.rows.length}):
                        </span>

                        <div className="relative w-48 sm:w-64">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                          <input
                            type="text"
                            placeholder="Filtrar por nome ou cargo..."
                            value={wlpFilterTerm}
                            onChange={(e) => setWlpFilterTerm(e.target.value)}
                            className="w-full bg-[#111a30] border border-slate-800 text-white text-xs pl-8 pr-3 py-1.5 rounded-xl outline-none"
                          />
                        </div>
                      </div>

                      <div className="overflow-x-auto max-h-64 rounded-xl border border-slate-800">
                        <table className="w-full text-left text-xs text-slate-300">
                          <thead className="bg-[#111a30] text-[10px] uppercase font-bold text-slate-400 sticky top-0">
                            <tr>
                              <th className="p-2.5">Linha</th>
                              <th className="p-2.5">Data</th>
                              <th className="p-2.5">Colaborador</th>
                              <th className="p-2.5">Cargo</th>
                              <th className="p-2.5">Horário</th>
                              <th className="p-2.5">Duração</th>
                              <th className="p-2.5">Rendimento Dia</th>
                              <th className="p-2.5">Status Base</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 font-mono">
                            {wlpPreview.rows
                              .filter(r => !wlpFilterTerm || r.colaboradorNomeNormalizado.toLowerCase().includes(wlpFilterTerm.toLowerCase()) || r.cargo.toLowerCase().includes(wlpFilterTerm.toLowerCase()))
                              .map(r => (
                                <tr key={`${r.lineNum}-${r.dataISO}-${r.colaboradorNomeNormalizado}`} className="hover:bg-slate-800/40">
                                  <td className="p-2.5 text-slate-500">{r.lineNum}</td>
                                  <td className="p-2.5 font-bold text-white">{r.dataStr}</td>
                                  <td className="p-2.5 font-sans font-bold text-sky-200">
                                    {r.colaboradorNomeNormalizado}
                                  </td>
                                  <td className="p-2.5 font-sans text-slate-300">{r.cargo}</td>
                                  <td className="p-2.5 text-slate-200">
                                    {r.horaInicio} – {r.horaFim} {r.isOvernight && <span className="text-[10px] text-amber-400 font-sans font-bold">(Noturno)</span>}
                                  </td>
                                  <td className="p-2.5 font-bold text-purple-300">{r.duracaoHoras}h</td>
                                  <td className="p-2.5 text-emerald-400 font-bold">{r.rendimentoDiaHL} HL</td>
                                  <td className="p-2.5 font-sans">
                                    {r.isOverwrite ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                        🔄 SOBRESCREVER
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                        ✨ NOVO
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* STANDARD FILE INPUT FOR OTHER OPERATIONS */
              <>
                <div className="relative border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-2xl p-6 text-center bg-[#0b1222]/50 transition-colors">
                  <input
                    type="file"
                    accept=".csv, .xlsx, .xls"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <span className="text-xs font-bold text-white block">
                    {importFile ? importFile.name : 'Clique ou arraste a planilha (CSV/XLSX) aqui'}
                  </span>
                </div>

                {importFile && (
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleImportSubmit}
                      disabled={importing}
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-md flex items-center gap-2"
                    >
                      {importing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      Confirmar e Salvar Nova Base
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── 5. SUB-ABA: EXPORTAR RELATÓRIOS ── */}
      {activeMainSubTab === 'exportar-relatorios' && (
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* INTERVAL FILTER CARD */}
          <div className="bg-[#111a30] border border-amber-500/20 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Calendar className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="font-black text-sm text-amber-400 uppercase tracking-wider">
                  Intervalo dos Relatórios
                </h3>
                <p className="text-xs text-slate-400">
                  Filtre os dados por período para exportação.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-end justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">De</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-[#0b1222] border border-slate-800 text-white rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none"
                  />
                </div>
                <span className="text-slate-500 font-bold self-end pb-2">→</span>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Até</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-[#0b1222] border border-slate-800 text-white rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => { const today = new Date().toISOString().split('T')[0]; setStartDate(today); setEndDate(today); }}
                  className="px-3 py-2 bg-[#0b1222] border border-slate-800 hover:border-slate-700 text-slate-300 font-bold text-[10px] uppercase rounded-xl cursor-pointer"
                >
                  Hoje
                </button>
                <button
                  onClick={() => { const today = new Date(); const lw = new Date(today.getTime() - 7 * 86400000); setStartDate(lw.toISOString().split('T')[0]); setEndDate(today.toISOString().split('T')[0]); }}
                  className="px-3 py-2 bg-[#0b1222] border border-slate-800 hover:border-slate-700 text-slate-300 font-bold text-[10px] uppercase rounded-xl cursor-pointer"
                >
                  Semana
                </button>
                <button
                  onClick={() => { const today = new Date(); const lm = new Date(today.getTime() - 30 * 86400000); setStartDate(lm.toISOString().split('T')[0]); setEndDate(today.toISOString().split('T')[0]); }}
                  className="px-3 py-2 bg-[#0b1222] border border-slate-800 hover:border-slate-700 text-slate-300 font-bold text-[10px] uppercase rounded-xl cursor-pointer"
                >
                  Mês
                </button>
              </div>
            </div>
          </div>

          {/* EXPORT BUTTONS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-5 space-y-3">
              <h4 className="font-black text-xs text-white uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-400" />
                Picking CSV
              </h4>
              <p className="text-[11px] text-slate-400">Exporta tarefas e produtividade de separadores.</p>
              <button
                onClick={exportPickingCSV}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-sky-400 font-black text-xs uppercase rounded-xl cursor-pointer border border-slate-700"
              >
                Baixar CSV
              </button>
            </div>

            <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-5 space-y-3">
              <h4 className="font-black text-xs text-white uppercase tracking-wider flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                Despejo Excel
              </h4>
              <p className="text-[11px] text-slate-400">Exporta escoamento e produtividade na bombona.</p>
              <button
                onClick={exportDespejoExcel}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-black text-xs uppercase rounded-xl cursor-pointer border border-slate-700"
              >
                Baixar Excel
              </button>
            </div>

            <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-5 space-y-3">
              <h4 className="font-black text-xs text-white uppercase tracking-wider flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                Repack Excel
              </h4>
              <p className="text-[11px] text-slate-400">Exporta montagens e produtividade de repacks.</p>
              <button
                onClick={exportRepackExcel}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-400 font-black text-xs uppercase rounded-xl cursor-pointer border border-slate-700"
              >
                Baixar Excel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
