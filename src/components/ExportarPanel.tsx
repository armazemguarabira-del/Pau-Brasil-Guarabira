import React, { useState, useEffect, useMemo } from 'react';
import { db, isCustomFirebaseConnected } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, writeBatch, query, where, getDocs } from 'firebase/firestore';
import { Usuario, Empresa, RepackRow, DespejoRow, QuebraRow, ValidadeRow, ArmazemRow, BlitzRefugoRow, Tarefa, ProdutoMaster, ColaboradorMaster } from '../types';
import { useEmpresaData } from '../context/EmpresaDataContext';
import * as XLSX from 'xlsx';
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
  X
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
  const [importTarget, setImportTarget] = useState<'repack' | 'despejo' | 'quebras' | 'validades' | 'armazem' | 'picking' | 'montagem'>('repack');
  const [replacePrevious, setReplacePrevious] = useState<boolean>(true);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);

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

    const colName = key === 'armazem' ? 'armazem' : key === 'picking' ? 'tarefas' : key === 'blitz' ? 'blitz_refugo' : key;
    keys.push(`sync:${empresaId}:${colName}`);
    return { keys, colName };
  };

  // ── APAGAR BASE DE OPERAÇÃO & IMPORTAR NOVA ──
  const handleApagarBaseOperacao = async (opKey: string) => {
    if (opKey === 'ALL') {
      const confirmAll = confirm(
        '🚨 ATENÇÃO CRÍTICA: Deseja realmente APAGAR TODA A BASE OPERACIONAL DE TODOS OS PROCESSOS DA PLATAFORMA?\n\nEsta ação apagará todo o histórico de Repack, Despejo, Quebras, Validades, Armazém, Picking e Blitz para permitir importar novos arquivos a partir do início do ano!'
      );
      if (!confirmAll) return;

      setClearingOp(true);
      try {
        const allOps = ['repack', 'despejo', 'quebras', 'validades', 'armazem', 'picking', 'blitz'];
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
      blitz: 'Blitz de Refugo'
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
                </select>
              </div>

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
            </div>

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
