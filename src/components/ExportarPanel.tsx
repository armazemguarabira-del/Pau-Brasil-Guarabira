import React, { useState, useEffect } from 'react';
import { db, isCustomFirebaseConnected } from '../firebase';
import { collection, onSnapshot, query, where, addDoc } from 'firebase/firestore';
import { Usuario, Empresa, RepackRow, DespejoRow, QuebraRow, ValidadeRow, ArmazemRow, BlitzRefugoRow, Tarefa } from '../types';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { 
  Calendar, 
  ArrowRight, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Upload, 
  Database, 
  CheckCircle, 
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface ExportarPanelProps {
  user: Usuario;
  empresa: Empresa | null;
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

export default function ExportarPanel({ user, empresa }: ExportarPanelProps) {
  const [repack, setRepack] = useState<RepackRow[]>([]);
  const [despejo, setDespejo] = useState<DespejoRow[]>([]);
  const [quebras, setQuebras] = useState<QuebraRow[]>([]);
  const [validades, setValidades] = useState<ValidadeRow[]>([]);
  const [armazem, setArmazem] = useState<ArmazemRow[]>([]);
  const [blitz, setBlitz] = useState<BlitzRefugoRow[]>([]);
  const [tasks, setTasks] = useState<Tarefa[]>([]);

  // Selected date ranges for report filtering
  const [startDate, setStartDate] = useState<string>(() => {
    // Default to today
    return new Date().toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    // Default to today
    return new Date().toISOString().split('T')[0];
  });

  // Collapsible tray for import/backup administration
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Simulation of backups
  const [backups, setBackups] = useState<BackupLog[]>([]);
  const [backingUp, setBackingUp] = useState(false);

  // Spreadsheet Import States
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importTarget, setImportTarget] = useState<'repack' | 'despejo' | 'quebras' | 'validades' | 'armazem'>('repack');
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);

  const empresaId = empresa?.id || 'demo';

  // Format display date helper
  const formatDisplayDate = (isoDate: string): string => {
    if (!isoDate) return '—';
    const parts = isoDate.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return isoDate;
  };

  // Helper to determine if a row falls in selected interval
  const isWithinInterval = (dateStr: string, startStr: string, endStr: string): boolean => {
    if (!dateStr) return false;
    let normalized = '';
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        normalized = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    } else if (dateStr.includes('-')) {
      normalized = dateStr.split('T')[0];
    } else {
      normalized = dateStr;
    }
    return normalized >= startStr && normalized <= endStr;
  };

  // Shortcut helpers
  const handleSetToday = () => {
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    setEndDate(today);
  };

  const handleSetWeek = () => {
    const today = new Date();
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    setStartDate(lastWeek.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  };

  const handleSetMonth = () => {
    const today = new Date();
    const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    setStartDate(lastMonth.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  };

  // Load backup simulation logs
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

  // Sync databases lines from Firestore/LocalStorage
  useEffect(() => {
    if (!db) {
      setRepack(JSON.parse(localStorage.getItem(`repack_${empresaId}`) || '[]'));
      setDespejo(JSON.parse(localStorage.getItem(`despejo_${empresaId}`) || '[]'));
      setQuebras(JSON.parse(localStorage.getItem(`quebras_${empresaId}`) || '[]'));
      setValidades(JSON.parse(localStorage.getItem(`validades_${empresaId}`) || '[]'));
      setArmazem(JSON.parse(localStorage.getItem(`armazem_rows_${empresaId}`) || '[]'));
      setBlitz(JSON.parse(localStorage.getItem(`blitz_${empresaId}`) || '[]'));
      setTasks(JSON.parse(localStorage.getItem(`tasks_${empresaId}`) || '[]'));
      return;
    }

    const qRepack = query(collection(db, 'repack'));
    const unsubRepack = onSnapshot(qRepack, s => {
      const rows = s.docs.map(d => ({ _docId: d.id, ...d.data() } as RepackRow));
      setRepack(isCustomFirebaseConnected() ? rows : rows.filter(r => r.empresaId === empresaId));
    });

    const qDespejo = query(collection(db, 'despejo'));
    const unsubDespejo = onSnapshot(qDespejo, s => {
      const rows = s.docs.map(d => ({ _docId: d.id, ...d.data() } as DespejoRow));
      setDespejo(isCustomFirebaseConnected() ? rows : rows.filter(r => r.empresaId === empresaId));
    });

    const qQuebras = query(collection(db, 'quebras'));
    const unsubQuebras = onSnapshot(qQuebras, s => {
      const rows = s.docs.map(d => ({ _docId: d.id, ...d.data() } as QuebraRow));
      setQuebras(isCustomFirebaseConnected() ? rows : rows.filter(r => r.empresaId === empresaId));
    });

    const qValidades = query(collection(db, 'validades'));
    const unsubValidades = onSnapshot(qValidades, s => {
      const rows = s.docs.map(d => ({ _docId: d.id, ...d.data() } as ValidadeRow));
      setValidades(isCustomFirebaseConnected() ? rows : rows.filter(r => r.empresaId === empresaId));
    });

    const qArmazem = query(collection(db, 'armazem'));
    const unsubArmazem = onSnapshot(qArmazem, s => {
      const rows = s.docs.map(d => ({ _docId: d.id, ...d.data() } as ArmazemRow));
      setArmazem(isCustomFirebaseConnected() ? rows : rows.filter(r => r.empresaId === empresaId));
    });

    const qBlitz = query(collection(db, 'blitz_refugo'));
    const unsubBlitz = onSnapshot(qBlitz, s => {
      const rows = s.docs.map(d => ({ _docId: d.id, ...d.data() } as BlitzRefugoRow));
      setBlitz(isCustomFirebaseConnected() ? rows : rows.filter(r => r.empresaId === empresaId));
    });

    const qTasks = query(collection(db, 'tarefas'));
    const unsubTasks = onSnapshot(qTasks, s => {
      const rows = s.docs.map(d => ({ _docId: d.id, ...d.data() } as Tarefa));
      setTasks(isCustomFirebaseConnected() ? rows : rows.filter(t => t.empresaId === empresaId));
    });

    return () => {
      unsubRepack();
      unsubDespejo();
      unsubQuebras();
      unsubValidades();
      unsubArmazem();
      unsubBlitz();
      unsubTasks();
    };
  }, [empresaId]);

  // Export functions with Interval Filter Applied
  const exportPickingCSV = () => {
    try {
      const filtered = tasks.filter(t => {
        const datePart = t.criadoEm ? t.criadoEm.split('T')[0] : '';
        return datePart >= startDate && datePart <= endDate;
      });

      if (filtered.length === 0) {
        toast('Nenhuma tarefa de picking encontrada no período selecionado.');
        return;
      }

      const headers = ['ID', 'Código SKU', 'Descrição SKU', 'Quantidade', 'Conferente', 'Operador', 'Status', 'Criado Em', 'Iniciado Em', 'Finalizado Em', 'Duração (Min)', 'Tipo'];
      const rows = filtered.map(t => [
        t.id,
        t.codigo,
        t.descricao,
        t.quantidade,
        t.conferente,
        t.operador,
        t.status === 'done' ? 'CONCLUÍDO' : t.status === 'in_progress' ? 'EM ANDAMENTO' : 'PENDENTE',
        t.criadoEm ? new Date(t.criadoEm).toLocaleString('pt-BR') : '—',
        t.iniciadoEm ? new Date(t.iniciadoEm).toLocaleString('pt-BR') : '—',
        t.finalizadoEm ? new Date(t.finalizadoEm).toLocaleString('pt-BR') : '—',
        t.duracaoMin || '—',
        t.tipoOperacao || '—'
      ]);

      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
        + [headers.join(';'), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(';'))].join('\n');
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Relatorio_Picking_${startDate}_ate_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast('CSV de Picking baixado com sucesso!');
    } catch (err) {
      alert('Erro ao exportar CSV: ' + err);
    }
  };

  const exportDespejoExcel = () => {
    try {
      const filtered = despejo.filter(d => isWithinInterval(d.dataISO || d.data, startDate, endDate));

      if (filtered.length === 0) {
        toast('Nenhum registro de despejo encontrado no período selecionado.');
        return;
      }

      const wb = XLSX.utils.book_new();
      const data = filtered.map(d => ({
        'Data Lançamento': d.data,
        'Embalagem': d.embalagem,
        'Quantidade (caixas)': d.quantidade,
        'Início': d.inicio,
        'Fim': d.fim,
        'Duração': d.tempo,
        'Metas (cx/h)': d.meta,
        'Status Meta': d.resultado,
        'Operador': d.operador || '—'
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Despejo');
      XLSX.writeFile(wb, `Relatorio_Despejo_${startDate}_ate_${endDate}.xlsx`);
      toast('Relatório Despejo baixado com sucesso!');
    } catch (err) {
      alert('Erro ao exportar Despejo: ' + err);
    }
  };

  const exportRepackExcel = () => {
    try {
      const filtered = repack.filter(r => isWithinInterval(r.dataISO || r.data, startDate, endDate));

      if (filtered.length === 0) {
        toast('Nenhum registro de repack encontrado no período selecionado.');
        return;
      }

      const wb = XLSX.utils.book_new();
      const data = filtered.map(r => ({
        'Data Lançamento': r.data,
        'Embalagem': r.embalagem,
        'Quantidade (unidades)': r.quantidade,
        'Início': r.inicio,
        'Fim': r.fim,
        'Duração': r.duracao,
        'Metas de Produtividade': r.meta,
        'Status Produtividade': r.resultado,
        'Operador': r.operador || '—'
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Repack');
      XLSX.writeFile(wb, `Relatorio_Repack_${startDate}_ate_${endDate}.xlsx`);
      toast('Relatório Repack baixado com sucesso!');
    } catch (err) {
      alert('Erro ao exportar Repack: ' + err);
    }
  };

  const exportArmazemExcel = () => {
    try {
      const filtered = armazem.filter(a => isWithinInterval(a.dataISO || a.data, startDate, endDate));

      if (filtered.length === 0) {
        toast('Nenhum registro de pátio encontrado no período selecionado.');
        return;
      }

      const wb = XLSX.utils.book_new();
      const data = filtered.map(a => ({
        'Data Lançamento': a.data,
        'Operação': a.operacao,
        'Hora Início': a.inicio,
        'Hora Término': a.fim,
        'Status Janela': a.status,
        'Faturador': a.empilhador,
        'Turno': a.turno,
        'Placa': a.placa,
        'Tipo Carga': a.tipo,
        'Total Paletes': a.palhete,
        'Justificativa': a.obs || '—'
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Movimentação Pátio');
      XLSX.writeFile(wb, `Relatorio_Armazem_${startDate}_ate_${endDate}.xlsx`);
      toast('Relatório Armazém baixado com sucesso!');
    } catch (err) {
      alert('Erro ao exportar Armazém: ' + err);
    }
  };

  const exportQuebrasExcel = () => {
    try {
      const filtered = quebras.filter(q => isWithinInterval(q.dataISO || q.data, startDate, endDate));

      if (filtered.length === 0) {
        toast('Nenhum registro de quebra encontrado no período selecionado.');
        return;
      }

      const wb = XLSX.utils.book_new();
      const data = filtered.map(q => ({
        'Data': q.data,
        'Código SKU': q.codProduto,
        'Descrição SKU': q.descricao,
        'Quantidade': q.quantidade,
        'Área Origem': q.area,
        'Turno': q.turno,
        'Cód Quebra': q.codQuebra,
        'Motivo': q.motivo,
        'Colaborador': q.colaboradorQuebrou || ''
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Quebras e Avarias');
      XLSX.writeFile(wb, `Relatorio_Quebras_${startDate}_ate_${endDate}.xlsx`);
      toast('Relatório Quebras baixado com sucesso!');
    } catch (err) {
      alert('Erro ao exportar Quebras: ' + err);
    }
  };

  const exportBlitzExcel = () => {
    try {
      const filtered = blitz.filter(b => isWithinInterval(b.dataISO || b.data, startDate, endDate));

      if (filtered.length === 0) {
        toast('Nenhum registro de refugo encontrado no período selecionado.');
        return;
      }

      const wb = XLSX.utils.book_new();
      const data = filtered.map(b => {
        const summaryList: string[] = [];
        if (b.emb) {
          Object.entries(b.emb).forEach(([key, val]: [string, any]) => {
            if (val && val.caixas > 0) {
              summaryList.push(`${key}: Conf:${val.caixas}/Afe:${val.aferido}/Ref:${val.totalDef || 0}`);
            }
          });
        }

        return {
          'Data Vistoria': b.data,
          'Placa': b.placa,
          'Ajudante': b.ajudante,
          'Rota': b.rota || '—',
          'Mapa': b.mapa || '—',
          'Total Caixas': b.totalCaixas,
          'Total Aferido': b.totalAferido,
          'Total Defeitos': b.totalDef || 0,
          'Percentual Refugo (%)': b.pctRefugo ? `${b.pctRefugo.toFixed(2)}%` : '0%',
          'Resumo Detalhado': summaryList.join(' | '),
          'Observação': b.obs || '—'
        };
      });

      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Blitz Refugo');
      XLSX.writeFile(wb, `Relatorio_Refugo_${startDate}_ate_${endDate}.xlsx`);
      toast('Relatório Refugo baixado com sucesso!');
    } catch (err) {
      alert('Erro ao exportar Refugo: ' + err);
    }
  };

  // Toast / Status Trigger
  const toast = (m: string) => {
    const el = document.getElementById('toast');
    if (el) {
      el.textContent = m;
      el.className = 'show';
      setTimeout(() => el.className = '', 3000);
    }
  };

  // Trigger simulated cloud backups
  const handleTriggerManualBackup = () => {
    setBackingUp(true);
    toast('Iniciando dump de coleções...');

    setTimeout(() => {
      const today = new Date();
      const code = 'BK-' + Math.round(40000 + Math.random() * 9999);
      const rowsCount = repack.length + despejo.length + quebras.length + validades.length + armazem.length + blitz.length;
      
      const newBackup: BackupLog = {
        id: code,
        data: today.toLocaleDateString('pt-BR'),
        dataISO: today.toISOString(),
        tipo: 'Completo (Manual Co-Pilot)',
        tamanhoKb: Math.max(12, Math.round(rowsCount * 1.8 + Math.random() * 5)),
        totalLinhas: rowsCount,
        operador: user.nome.toUpperCase()
      };

      const u = [newBackup, ...backups];
      setBackups(u);
      localStorage.setItem(`backups_${empresaId}`, JSON.stringify(u));
      setBackingUp(false);
      toast(`Backup ${code} criado com sucesso!`);
    }, 1500);
  };

  // Handle incoming bulk file uploads
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
          const headers = (json[0] as any[]).map(String);
          setImportHeaders(headers);
          
          const rows = XLSX.utils.sheet_to_json(worksheet);
          setImportPreview(rows.slice(0, 5));
        }
      } catch (err) {
        alert('Erro ao ler visualização do arquivo Excel: ' + err);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImportSubmit = async () => {
    if (!importFile) return;
    setImporting(true);
    toast('Lendo arquivo Excel...');

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet) as any[];

        if (rows.length === 0) {
          alert('Planilha vazia ou sem linhas detectadas.');
          setImporting(false);
          return;
        }

        toast(`Processando ${rows.length} linhas...`);
        let importedCount = 0;

        for (const raw of rows) {
          let docData: any = { empresaId };
          const cleanRow: Record<string, any> = {};
          Object.entries(raw).forEach(([k, v]) => {
            cleanRow[k.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "")] = v;
          });

          const today = new Date();
          const todayStr = today.toLocaleDateString('pt-BR');
          const todayISO = today.toISOString().split('T')[0];

          if (importTarget === 'repack') {
            docData = {
              ...docData,
              data: String(cleanRow.data || cleanRow['data lancamento'] || todayStr),
              dataISO: String(cleanRow.dataiso || cleanRow['data iso'] || todayISO),
              embalagem: String(cleanRow.embalagem || cleanRow.embalagens || 'LATA 250').toUpperCase(),
              quantidade: Number(cleanRow.quantidade || cleanRow.qtd || 1),
              inicio: String(cleanRow.inicio || cleanRow['hora inicio'] || '08:00'),
              fim: String(cleanRow.fim || cleanRow['hora fim'] || '08:30'),
              duracao: String(cleanRow.duracao || cleanRow.tempo || '00:30:00'),
              meta: String(cleanRow.meta || cleanRow['metas de produtividade'] || '00:00:43'),
              resultado: String(cleanRow.resultado || cleanRow.status || '🟢 META BATIDA'),
              operador: String(cleanRow.operador || user.nome)
            };
          } else if (importTarget === 'despejo') {
            docData = {
              ...docData,
              data: String(cleanRow.data || cleanRow['data lancamento'] || todayStr),
              dataISO: String(cleanRow.dataiso || cleanRow['data iso'] || todayISO),
              embalagem: String(cleanRow.embalagem || cleanRow.embalagens || 'LATA 250').toUpperCase(),
              quantidade: Number(cleanRow.quantidade || cleanRow.qtd || 1),
              inicio: String(cleanRow.inicio || cleanRow['hora inicio'] || '08:00'),
              fim: String(cleanRow.fim || cleanRow['hora fim'] || '08:30'),
              tempo: String(cleanRow.tempo || cleanRow.duracao || '00:30:00'),
              meta: String(cleanRow.meta || cleanRow['metas'] || '00:00:43'),
              resultado: String(cleanRow.resultado || cleanRow.status || '🟢 META BATIDA'),
              operador: String(cleanRow.operador || user.nome)
            };
          } else if (importTarget === 'quebras') {
            docData = {
              ...docData,
              data: String(cleanRow.data || todayStr),
              codProduto: String(cleanRow.codproduto || cleanRow.codigo || cleanRow.sku || '000'),
              descricao: String(cleanRow.descricao || cleanRow.produto || 'SKU Importado'),
              quantidade: Number(cleanRow.quantidade || cleanRow.qtd || 1),
              area: String(cleanRow.area || cleanRow.origem || 'Picking'),
              turno: String(cleanRow.turno || '1º Turno'),
              codQuebra: String(cleanRow.codquebra || cleanRow['cod quebra'] || 'Q01'),
              motivo: String(cleanRow.motivo || 'Avaria Movimentação'),
              colaboradorQuebrou: String(cleanRow.colaboradorquebrou || cleanRow['colaborador quebrou'] || cleanRow.colaborador || '')
            };
          } else if (importTarget === 'validades') {
            docData = {
              ...docData,
              codigo: String(cleanRow.codigo || cleanRow.cod || cleanRow.sku || '000'),
              descricao: String(cleanRow.descricao || cleanRow.produto || 'SKU Importado'),
              palhete: Number(cleanRow.palhete || cleanRow.palete || 0),
              lastro: Number(cleanRow.lastro || 0),
              caixa: Number(cleanRow.caixa || cleanRow.caixas || 0),
              validade: String(cleanRow.validade || cleanRow.vencimento || todayStr),
              localizacao: String(cleanRow.localizacao || cleanRow.local || 'picking').toLowerCase().includes('pulm') ? 'pulmao' : 'picking'
            };
          } else if (importTarget === 'armazem') {
            docData = {
              ...docData,
              data: String(cleanRow.data || todayStr),
              operacao: String(cleanRow.operacao || 'Recebimento'),
              inicio: String(cleanRow.inicio || cleanRow['hora inicio'] || '08:00'),
              fim: String(cleanRow.fim || cleanRow['hora fim'] || '10:00'),
              status: String(cleanRow.status || 'Concluído'),
              empilhador: String(cleanRow.empilhador || cleanRow.faturador || user.nome),
              turno: String(cleanRow.turno || '1º Turno'),
              placa: String(cleanRow.placa || 'AAA-0000'),
              tipo: String(cleanRow.tipo || cleanRow['tipo carga'] || 'Puxada'),
              palhete: Number(cleanRow.palhete || cleanRow.palete || 0),
              obs: String(cleanRow.obs || cleanRow.justificativa || '—')
            };
          }

          if (db) {
            const colName = importTarget === 'armazem' ? 'armazem' : importTarget;
            await addDoc(collection(db, colName), docData);
          } else {
            const lsKey = importTarget === 'armazem' ? `armazem_rows_${empresaId}` : `${importTarget}_${empresaId}`;
            const current = JSON.parse(localStorage.getItem(lsKey) || '[]');
            current.push({ _docId: String(Date.now() + Math.random()), ...docData });
            localStorage.setItem(lsKey, JSON.stringify(current));
          }
          importedCount++;
        }

        toast(`Sucesso! ${importedCount} registros importados.`);
        alert(`Parabéns! Foram importados ${importedCount} registros com sucesso para o banco de dados da sua empresa (${empresa?.razaoSocial || 'Demonstração'}).`);
        setImportFile(null);
        setImportPreview([]);
        setImportHeaders([]);
        setImporting(false);
      } catch (err) {
        alert('Erro ao importar planilha: ' + err);
        setImporting(false);
      }
    };
    reader.readAsBinaryString(importFile);
  };

  const totalLogsLines = repack.length + despejo.length + quebras.length + validades.length + armazem.length + blitz.length;

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto py-2">
      
      {/* CARD 1: INTERVALO DO RELATÓRIO */}
      <div className="g-card p-6 border border-amber-500/15 bg-amber-500/[0.02] flex flex-col gap-4 rounded-2xl shadow-sm hover:border-amber-500/25 transition-all">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <span className="text-lg">📅</span>
          <div>
            <h3 className="font-sans font-black text-sm tracking-wider text-orange-600 uppercase">
              INTERVALO DO RELATÓRIO
            </h3>
            <p className="text-[11px] text-[#6b7280] leading-relaxed mt-0.5">
              Todos os relatórios abaixo serão filtrados pelo intervalo selecionado.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-5 items-stretch sm:items-end justify-between mt-1">
          {/* Date Picker Range */}
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-[#6b7280] uppercase tracking-wider block">DE</span>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white border border-slate-200 text-slate-800 rounded-xl px-4 py-2 text-xs font-mono font-bold outline-none hover:border-amber-400 focus:border-amber-500 transition-colors cursor-pointer w-40 shadow-sm"
              />
            </div>

            <div className="text-slate-400 font-bold mx-1 self-end pb-2 select-none">→</div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-[#6b7280] uppercase tracking-wider block">ATÉ</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white border border-slate-200 text-slate-800 rounded-xl px-4 py-2 text-xs font-mono font-bold outline-none hover:border-amber-400 focus:border-amber-500 transition-colors cursor-pointer w-40 shadow-sm"
              />
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="flex items-center gap-2 self-start sm:self-end">
            <button
              type="button"
              onClick={handleSetToday}
              className="px-3.5 py-2 rounded-xl border border-slate-200 hover:border-slate-300 text-[10px] font-extrabold uppercase tracking-widest bg-white hover:bg-slate-50 text-slate-700 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
            >
              📅 HOJE
            </button>
            <button
              type="button"
              onClick={handleSetWeek}
              className="px-3.5 py-2 rounded-xl border border-slate-200 hover:border-slate-300 text-[10px] font-extrabold uppercase tracking-widest bg-white hover:bg-slate-50 text-slate-700 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
            >
              📅 SEMANA
            </button>
            <button
              type="button"
              onClick={handleSetMonth}
              className="px-3.5 py-2 rounded-xl border border-slate-200 hover:border-slate-300 text-[10px] font-extrabold uppercase tracking-widest bg-white hover:bg-slate-50 text-slate-700 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
            >
              📅 MÊS
            </button>
          </div>

          {/* Active Date Display on right */}
          <div className="ml-auto flex flex-col items-end justify-center self-end pr-1 text-right">
            <span className="font-mono font-black text-sm text-[#f5a623] tracking-widest">
              {formatDisplayDate(endDate)}
            </span>
          </div>
        </div>
      </div>

      {/* CARD 2: PICKING – EXPORTAR CSV */}
      <div className="g-card p-6 md:p-8 flex flex-col gap-3 border border-[#e5e7eb] bg-white rounded-2xl shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
        <h3 className="font-sans font-black text-sm tracking-wider uppercase text-slate-800 flex items-center gap-2">
          📄 PICKING – EXPORTAR CSV
        </h3>
        <p className="text-xs text-[#6b7280] leading-relaxed">
          Exporta as tarefas de picking/reabastecimento salvas localmente.
        </p>
        <div className="mt-1">
          <button 
            type="button"
            onClick={exportPickingCSV}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-sans font-black text-[11px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
          >
            ⬇️ BAIXAR CSV PICKING
          </button>
        </div>
      </div>

      {/* CARD 3: DESPEJO TIMER – EXPORTAR EXCEL */}
      <div className="g-card p-6 md:p-8 flex flex-col gap-3 border border-[#e5e7eb] bg-white rounded-2xl shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
        <h3 className="font-sans font-black text-sm tracking-wider uppercase text-slate-800 flex items-center gap-2">
          🗑️ DESPEJO TIMER – EXPORTAR EXCEL
        </h3>
        <p className="text-xs text-[#6b7280] leading-relaxed">
          Exporta os registros de produtividade de despejo da data selecionada.
        </p>
        <div className="mt-1">
          <button 
            type="button"
            onClick={exportDespejoExcel}
            className="w-full sm:w-auto px-5 py-2.5 bg-[#ef4444] hover:bg-[#dc2626] text-white font-sans font-black text-[11px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
          >
            ⬇️ BAIXAR RELATÓRIO DESPEJO (.XLSX)
          </button>
        </div>
      </div>

      {/* CARD 4: REPACK TIMER – EXPORTAR EXCEL */}
      <div className="g-card p-6 md:p-8 flex flex-col gap-3 border border-[#e5e7eb] bg-white rounded-2xl shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
        <h3 className="font-sans font-black text-sm tracking-wider uppercase text-slate-800 flex items-center gap-2">
          📦 REPACK TIMER – EXPORTAR EXCEL
        </h3>
        <p className="text-xs text-[#6b7280] leading-relaxed">
          Exporta os registros de produtividade de repack da data selecionada.
        </p>
        <div className="mt-1">
          <button 
            type="button"
            onClick={exportRepackExcel}
            className="w-full sm:w-auto px-5 py-2.5 bg-[#f5a623] hover:bg-[#e09110] text-white font-sans font-black text-[11px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
          >
            ⬇️ BAIXAR RELATÓRIO REPACK (.XLSX)
          </button>
        </div>
      </div>

      {/* CARD 5: ARMAZÉM FÁCIL – EXPORTAR EXCEL */}
      <div className="g-card p-6 md:p-8 flex flex-col gap-3 border border-[#e5e7eb] bg-white rounded-2xl shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
        <h3 className="font-sans font-black text-sm tracking-wider uppercase text-slate-800 flex items-center gap-2">
          🚚 ARMAZÉM FÁCIL – EXPORTAR EXCEL
        </h3>
        <p className="text-xs text-[#6b7280] leading-relaxed">
          Exporta os registros de carregamento e descarregamento da data selecionada.
        </p>
        <div className="mt-1">
          <button 
            type="button"
            onClick={exportArmazemExcel}
            className="w-full sm:w-auto px-5 py-2.5 bg-[#38bdf8] hover:bg-[#0ea5e9] text-white font-sans font-black text-[11px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
          >
            ⬇️ BAIXAR RELATÓRIO ARMAZÉM (.XLSX)
          </button>
        </div>
      </div>

      {/* CARD 6: CONTROLE DE QUEBRAS – EXPORTAR EXCEL */}
      <div className="g-card p-6 md:p-8 flex flex-col gap-3 border border-[#e5e7eb] bg-white rounded-2xl shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
        <h3 className="font-sans font-black text-sm tracking-wider uppercase text-slate-800 flex items-center gap-2">
          💥 CONTROLE DE QUEBRAS – EXPORTAR EXCEL
        </h3>
        <p className="text-xs text-[#6b7280] leading-relaxed">
          Exporta os registros de avarias da data selecionada.
        </p>
        <div className="mt-1">
          <button 
            type="button"
            onClick={exportQuebrasExcel}
            className="w-full sm:w-auto px-5 py-2.5 bg-[#ff5757] hover:bg-[#e04444] text-white font-sans font-black text-[11px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
          >
            ⬇️ BAIXAR RELATÓRIO QUEBRAS (.XLSX)
          </button>
        </div>
      </div>

      {/* CARD 7: BLITZ DE REFUGO – EXPORTAR EXCEL */}
      <div className="g-card p-6 md:p-8 flex flex-col gap-3 border border-[#e5e7eb] bg-white rounded-2xl shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
        <h3 className="font-sans font-black text-sm tracking-wider uppercase text-slate-800 flex items-center gap-2">
          🍼 BLITZ DE REFUGO – EXPORTAR EXCEL
        </h3>
        <p className="text-xs text-[#6b7280] leading-relaxed">
          Exporta os registros de aferição de refugo por veículo e embalagem.
        </p>
        <div className="mt-1">
          <button 
            type="button"
            onClick={exportBlitzExcel}
            className="w-full sm:w-auto px-5 py-2.5 bg-[#ffdd59] hover:bg-[#ffd32a] text-slate-900 font-sans font-black text-[11px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
          >
            ⬇️ BAIXAR RELATÓRIO REFUGO (.XLSX)
          </button>
        </div>
      </div>

      {/* COLLAPSIBLE ADVANCED MANAGEMENT TRAY */}
      <div className="mt-6 border-t border-slate-200 pt-6">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center justify-between w-full py-3 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all text-xs font-black tracking-wider text-slate-600 uppercase cursor-pointer shadow-sm"
        >
          <div className="flex items-center gap-2">
            <span>⚙️</span>
            <span>Painel Administrativo Co-Pilot (Importações e Backups)</span>
          </div>
          <span>{showAdvanced ? 'Recolher ▲' : 'Expandir ▼'}</span>
        </button>
        
        {showAdvanced && (
          <div className="flex flex-col gap-6 mt-4 animate-fadeIn">
            {/* 📥 Importador Inteligente de Planilhas */}
            <div className="g-card p-6 flex flex-col gap-5 border-l-4 border-l-[#10b981] bg-white rounded-2xl shadow-sm">
              <div>
                <span className="text-[10px] text-[#10b981] font-black tracking-widest uppercase">MÓDULO DE IMPORTAÇÃO EM MASSA</span>
                <h3 className="font-sans font-black text-sm tracking-wider uppercase text-slate-800 mt-1">📥 Importador Inteligente de Planilhas (XLSX / CSV)</h3>
                <p className="text-xs text-[#6b7280] leading-relaxed mt-1">
                  Selecione uma planilha do Excel ou arquivo CSV para carregar registros em massa diretamente no banco de dados. O importador mapeia automaticamente colunas equivalentes (como "Data", "Operador", "Quantidade", "Embalagem", "SKU").
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-1">
                {/* Target Module Choice */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-[#6b7280] uppercase tracking-wider">
                    1. Selecione o Módulo de Destino
                  </label>
                  <select
                    value={importTarget}
                    onChange={(e: any) => {
                      setImportTarget(e.target.value);
                      setImportFile(null);
                      setImportPreview([]);
                      setImportHeaders([]);
                    }}
                    className="bg-white border border-slate-200 text-slate-800 text-xs rounded-lg p-3 outline-none cursor-pointer hover:border-[#10b981] transition-colors shadow-sm"
                  >
                    <option value="repack">🔄 Repack (Reembalagem de SKU)</option>
                    <option value="despejo">🪣 Despejo (Eficiência de Descarte)</option>
                    <option value="quebras">💥 Quebras e Avarias (SKU Perdas)</option>
                    <option value="validades">📆 Validades e Lotes (FEFO)</option>
                    <option value="armazem">🚛 Movimentação de Pátio (Portaria)</option>
                  </select>
                </div>

                {/* File Picker */}
                <div className="md:col-span-2 flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-[#6b7280] uppercase tracking-wider">
                    2. Escolha o Arquivo Excel (.xlsx, .xls) ou CSV
                  </label>
                  <div className="relative border border-dashed border-slate-300 rounded-xl hover:border-[#10b981] transition-colors p-2.5 flex items-center justify-between bg-slate-50/50">
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="w-8 h-8 text-slate-400" />
                      <div className="text-left">
                        <span className="text-xs font-bold text-slate-700 block truncate max-w-[240px]">
                          {importFile ? importFile.name : 'Nenhum arquivo selecionado'}
                        </span>
                        <span className="text-[10px] text-[#6b7280] block">
                          {importFile ? `${(importFile.size / 1024).toFixed(1)} KB` : 'Arraste ou clique para selecionar'}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase text-[#10b981] bg-[#10b981]/10 px-2.5 py-1 rounded-lg border border-[#10b981]/20">
                      PROCURAR
                    </span>
                  </div>
                </div>
              </div>

              {/* Excel Data Preview Panel */}
              {importFile && importHeaders.length > 0 && (
                <div className="border border-slate-200 rounded-xl bg-slate-50/50 p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-[10px] font-bold text-[#10b981] uppercase tracking-wider">
                      Visualização Prévia (Colunas Detectadas: {importHeaders.length})
                    </span>
                    <span className="text-[10px] text-[#6b7280] font-mono">
                      {importPreview.length} de {importPreview.length} linhas de amostra exibidas
                    </span>
                  </div>

                  {/* Header badges */}
                  <div className="flex flex-wrap gap-1">
                    {importHeaders.map(h => (
                      <span key={h} className="text-[9px] font-mono font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-xs">
                        {h}
                      </span>
                    ))}
                  </div>

                  {/* Sample Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-[10px] font-mono text-slate-500">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-700 font-bold">
                          {importHeaders.slice(0, 6).map(h => (
                            <th key={h} className="py-1">{h}</th>
                          ))}
                          {importHeaders.length > 6 && <th className="py-1">...</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.map((row, idx) => (
                          <tr key={idx} className="border-b border-slate-100">
                            {importHeaders.slice(0, 6).map(h => (
                              <td key={h} className="py-1 truncate max-w-[120px]">{String(row[h] || '—')}</td>
                            ))}
                            {importHeaders.length > 6 && <td className="py-1">...</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Submit Import Action */}
                  <div className="flex items-center justify-between border-t border-slate-200 pt-3 mt-1">
                    <p className="text-[10px] text-[#6b7280] leading-normal max-w-[70%]">
                      Ao clicar em confirmar, o sistema carregará automaticamente as linhas desta planilha no Firebase utilizando inteligência de equivalência de cabeçalhos.
                    </p>
                    <button
                      onClick={handleImportSubmit}
                      disabled={importing}
                      className="py-2 px-5 bg-[#10b981] hover:bg-[#059669] text-white font-extrabold text-xs uppercase rounded-lg cursor-pointer transition-colors shadow-sm"
                    >
                      {importing ? 'SINCADO COMPLETO...' : '🚀 CONFIRMAR IMPORTAÇÃO'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Cloud Backups panel */}
            <div className="g-card p-6 flex flex-col gap-5 border-l-4 border-l-[#a855f7] bg-white rounded-2xl shadow-sm">
              <div className="flex items-center justify-between gap-4 flex-wrap border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] text-[#a855f7] font-black tracking-widest uppercase">Weekly Automated Cloud Backups</span>
                  <h4 className="font-sans font-black text-md text-slate-800 mt-0.5 uppercase">Rotina Semanal de Backups Automáticos</h4>
                </div>
                <button 
                  onClick={handleTriggerManualBackup}
                  disabled={backingUp}
                  className="py-2 px-4 bg-[#a855f7] hover:bg-[#8b5cf6] font-bold text-xs uppercase tracking-wider text-white border-none rounded-xl cursor-pointer transition-colors shadow-sm"
                >
                  {backingUp ? 'EXECUTANDO ENCRYPTION...' : '🔄 FAZER BACKUP COMPLETO AGORA'}
                </button>
              </div>

              <p className="text-xs text-[#6b7280] leading-relaxed">
                O sistema executa backups programados todos os Sábados às 23:59 UTC, gerando pontos de restauração encriptados de todos os reabastecimentos, repacks, limpezas de pátio e quebras da empresa. Total de linhas prontas para backup: <strong className="text-slate-800">{totalLogsLines} registros</strong>.
              </p>

              {/* List of backup logs table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl bg-slate-50/50">
                <table className="w-full text-left border-collapse font-sans text-xs min-w-[600px]">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-slate-200">
                      <th className="p-3 text-slate-500 uppercase font-bold text-[9px] tracking-wider">Código Backup</th>
                      <th className="p-3 text-slate-500 uppercase font-bold text-[9px] tracking-wider">Data do Ponto</th>
                      <th className="p-3 text-slate-500 uppercase font-bold text-[9px] tracking-wider">Tipo de Execução</th>
                      <th className="p-3 text-slate-500 uppercase font-bold text-[9px] tracking-wider text-center">Registros Inclusos</th>
                      <th className="p-3 text-slate-500 uppercase font-bold text-[9px] tracking-wider text-center">Tamanho</th>
                      <th className="p-3 text-slate-500 uppercase font-bold text-[9px] tracking-wider">Autorizador</th>
                      <th className="p-3 text-slate-500 uppercase font-bold text-[9px] tracking-wider text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {backups.map(b => (
                      <tr key={b.id} className="hover:bg-white transition-colors">
                        <td className="p-3 font-mono font-bold text-[#a855f7]">{b.id}</td>
                        <td className="p-3 font-mono text-slate-600">{b.data}</td>
                        <td className="p-3 text-slate-600">{b.tipo}</td>
                        <td className="p-3 text-center font-bold text-slate-700">{b.totalLinhas} linhas</td>
                        <td className="p-3 text-center text-slate-500 font-mono">{b.tamanhoKb} KB</td>
                        <td className="p-3 truncate max-w-[120px] text-slate-600">{b.operador}</td>
                        <td className="p-3 text-right">
                          <span className="text-[10px] font-sans font-bold text-green-600 px-2 py-0.5 rounded-lg bg-green-50 border border-green-200">
                            ✓ Ativo / Seguro
                          </span>
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

    </div>
  );
}
export {};
