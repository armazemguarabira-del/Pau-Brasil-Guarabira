import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  CheckCircle2, 
  X, 
  Camera, 
  Upload, 
  ShieldCheck, 
  AlertTriangle, 
  Trash2, 
  Building2, 
  User, 
  Calendar,
  FileCheck,
  Check,
  ClipboardList,
  Award,
  Download,
  UploadCloud,
  RefreshCw,
  Target,
  BarChart3,
  Database,
  PieChart,
  FileSpreadsheet,
  HelpCircle,
  Sparkles,
  CheckCircle
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';

import { LISTA_COLABORADORES_OFICIAIS } from './RankingModule';

export interface Audit5SRecord {
  id: string;
  dataISO: string;
  dataFormatted: string;
  setor: string;
  operador: string;
  liderAuditor?: string;
  pontos: number; // 0 to 10
  notaPercentual: number; // 0 to 100
  respostas: boolean[]; // 10 booleans
  observacoesNaoConforme: string;
  fotoUrl: string | null;
  createdAt: string;
  empresaId?: string;
  // Legacy compatibility fields
  seiriStatus?: boolean;
  seitonStatus?: boolean;
  seisoStatus?: boolean;
  seiketsuStatus?: boolean;
  shitsukeStatus?: boolean;
}

export const isWeekendISO = (isoDate: string): boolean => {
  if (!isoDate) return false;
  const parts = isoDate.split('-');
  if (parts.length < 3) return false;
  const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  const day = d.getDay();
  return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
};

export const SETORES_5S = [
  'PICKING',
  'ÁREA DE CARREGAMENTO',
  'CENTRAL',
  'DESPEJO',
  'ÁREA MKT PLACE',
  'PNC',
  'RECICLÁVEIS',
  'REFUGO',
  'DEVOLUÇÃO',
  'REPACK',
  'ÁREA DE CARREGAMENTO DA EMPILHADEIRA',
  'EMPILHADEIRA 2',
  'EMPILHADEIRA 1',
  'FROTA DA ENTREGA'
];

export interface Responsavel5SItem {
  id: number;
  area: string;
  colaborador: string;
  cargo: string;
}

export const MAPEAMENTO_RESPONSAVEIS_5S: Responsavel5SItem[] = [
  { id: 1, area: 'PICKING', colaborador: 'DEJEAN SILVA DE OLIVEIRA', cargo: 'AJUDANTE' },
  { id: 2, area: 'ÁREA DE CARREGAMENTO', colaborador: 'DEJEAN SILVA DE OLIVEIRA', cargo: 'AJUDANTE' },
  { id: 3, area: 'CENTRAL', colaborador: 'DEJEAN SILVA DE OLIVEIRA', cargo: 'AJUDANTE' },
  { id: 4, area: 'DESPEJO', colaborador: 'OZENILDO SOUSA SILVA', cargo: 'AJUDANTE' },
  { id: 5, area: 'ÁREA MKT PLACE', colaborador: 'OZENILDO SOUSA SILVA', cargo: 'AJUDANTE' },
  { id: 6, area: 'PNC', colaborador: 'GLADSON LISBOA DOS SANTOS', cargo: 'AJUDANTE' },
  { id: 7, area: 'RECICLÁVEIS', colaborador: 'DEJEAN SILVA DE OLIVEIRA', cargo: 'AJUDANTE' },
  { id: 8, area: 'REFUGO', colaborador: 'GLADSON LISBOA DOS SANTOS', cargo: 'AJUDANTE' },
  { id: 9, area: 'DEVOLUÇÃO', colaborador: 'GLADSON LISBOA DOS SANTOS', cargo: 'AJUDANTE' },
  { id: 10, area: 'REPACK', colaborador: 'OZENILDO SOUSA SILVA', cargo: 'AJUDANTE' },
  { id: 11, area: 'ÁREA DE CARREGAMENTO DA EMPILHADEIRA', colaborador: 'PAULO PEREIRA DA SILVA', cargo: 'EMPILHADOR' },
  { id: 12, area: 'EMPILHADEIRA 2', colaborador: 'JOSE RONILDO DA SILVA', cargo: 'ADMINISTRATIVO' },
  { id: 13, area: 'EMPILHADEIRA 1', colaborador: 'MARIVALDO ARTUR ALVES', cargo: 'EMPILHADOR' },
  { id: 14, area: 'FROTA DA ENTREGA', colaborador: 'DIOGENES PEREIRA DA SILVA', cargo: 'AJUDANTE' },
];

export const getUserAssignedAreasList = (
  user: any,
  userNombre?: string
): string[] => {
  const nameToMatch = (user?.nome || userNombre || '').trim().toUpperCase();
  const normalizedName = nameToMatch.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (normalizedName) {
    const matched = MAPEAMENTO_RESPONSAVEIS_5S.filter(item => {
      const respName = (item.colaborador || '').trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (!respName) return false;
      const firstNameUser = normalizedName.split(' ')[0];
      const firstNameResp = respName.split(' ')[0];
      return respName.includes(normalizedName) || normalizedName.includes(respName) || (firstNameUser.length > 2 && firstNameUser === firstNameResp);
    });

    if (matched.length > 0) {
      return matched.map(m => m.area);
    }
  }

  // Fallback by user role / panel
  const userRole = (user?.cargo || user?.perfil || user?.setor || '').toString().toUpperCase();
  if (userRole.includes('EMPILHA')) {
    return MAPEAMENTO_RESPONSAVEIS_5S.filter(a => a.cargo === 'EMPILHADOR' || a.cargo === 'ADMINISTRATIVO').map(a => a.area);
  }
  if (userRole.includes('AJUDAN') || userRole.includes('CARGA')) {
    return MAPEAMENTO_RESPONSAVEIS_5S.filter(a => a.cargo === 'AJUDANTE').map(a => a.area);
  }

  return SETORES_5S;
};

import { generateYTD5SAuditsFast, getStored5SAudits, save5SAuditRecord, saveBulk5SAudits } from '../utils/fiveSStore';

export const generateYTD5SAudits = (): Audit5SRecord[] => {
  return generateYTD5SAuditsFast();
};

/* =========================================================================
   FUNÇÕES AUXILIARES DE EXPORTAÇÃO E IMPORTAÇÃO EXCEL (.XLSX) / JSON / CSV
   ========================================================================= */

// Função para formatar / normalizar datas do Excel ou String
export const parse5SDateValue = (val: any): { dataISO: string; dataFormatted: string } => {
  const today = new Date();
  const todayISO = today.toISOString().split('T')[0];
  const todayFormatted = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

  if (!val) return { dataISO: todayISO, dataFormatted: todayFormatted };

  // Se for número serial de data do Excel (ex: 45520)
  if (typeof val === 'number') {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime())) {
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return { dataISO: `${y}-${m}-${day}`, dataFormatted: `${day}/${m}/${y}` };
    }
  }

  const str = String(val).trim();

  // Se estiver em formato DD/MM/AAAA ou DD-MM-AAAA
  const matchBR = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (matchBR) {
    const day = matchBR[1].padStart(2, '0');
    const m = matchBR[2].padStart(2, '0');
    const y = matchBR[3];
    return { dataISO: `${y}-${m}-${day}`, dataFormatted: `${day}/${m}/${y}` };
  }

  // Se estiver em formato AAAA-MM-DD ou AAAA/MM/DD
  const matchISO = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (matchISO) {
    const y = matchISO[1];
    const m = matchISO[2].padStart(2, '0');
    const day = matchISO[3].padStart(2, '0');
    return { dataISO: `${y}-${m}-${day}`, dataFormatted: `${day}/${m}/${y}` };
  }

  return { dataISO: todayISO, dataFormatted: todayFormatted };
};

// Normalizar resposta booleana das perguntas (SIM / NÃO)
export const parse5SBooleanAnswer = (val: any): boolean => {
  if (val === undefined || val === null || val === '') return true;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val > 0;
  const s = String(val).trim().toUpperCase();
  if (['SIM', 'S', 'TRUE', '1', 'OK', 'C', 'CONFORME', 'YES', 'Y', 'V', 'VERDADEIRO'].includes(s)) return true;
  if (['NAO', 'NÃO', 'N', 'FALSE', '0', 'NOK', 'NC', 'NÃO CONFORME', 'NAO CONFORME', 'NO', 'F', 'FALSO'].includes(s)) return false;
  return true;
};

// EXPORTAR MODELO DE EXEMPLO OFICIAL EM EXCEL (.XLSX)
export const exportExcel5SExample = () => {
  const wb = XLSX.utils.book_new();

  // SHEET 1: PLANILHA MODELO PARA IMPORTAÇÃO
  const headers = [
    'Área',
    'Data (DD/MM/AAAA)',
    'Quem Aplicou',
    'Colaborador Responsável',
    'P1 - Posto Organizado (SIM/NÃO)',
    'P2 - Endereço Correto (SIM/NÃO)',
    'P3 - Corredores Livres (SIM/NÃO)',
    'P4 - Ferramentas Guardadas (SIM/NÃO)',
    'P5 - Uso de EPIs (SIM/NÃO)',
    'P6 - Sem Riscos Inseguros (SIM/NÃO)',
    'P7 - Extintores Desobstruídos (SIM/NÃO)',
    'P8 - Piso Limpo e Seco (SIM/NÃO)',
    'P9 - Descarte Correto (SIM/NÃO)',
    'P10 - Anomalias Comunicadas (SIM/NÃO)',
    'Observações e Ações Corretivas'
  ];

  const today = new Date();
  const dayStr = String(today.getDate()).padStart(2, '0');
  const monthStr = String(today.getMonth() + 1).padStart(2, '0');
  const yearStr = today.getFullYear();
  const sampleDate = `${dayStr}/${monthStr}/${yearStr}`;

  const rows = MAPEAMENTO_RESPONSAVEIS_5S.map((item, idx) => {
    const isPedroFrota = idx % 4 === 0;
    const auditor = isPedroFrota ? 'Pedro Bruno (Setor de Frota)' : 'Líder Operacional 5S';
    const isPerfeito = idx % 2 === 0;
    return [
      item.area,
      sampleDate,
      auditor,
      item.colaborador,
      'SIM',
      'SIM',
      'SIM',
      'SIM',
      'SIM',
      isPerfeito ? 'SIM' : 'NÃO',
      'SIM',
      'SIM',
      'SIM',
      'SIM',
      isPerfeito ? 'Área inspecionada 100% conforme padrão 5S.' : 'Pallet desalinhado corrigido durante a inspeção.'
    ];
  });

  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  ws['!cols'] = [
    { wch: 32 }, // Área
    { wch: 18 }, // Data
    { wch: 30 }, // Quem Aplicou
    { wch: 32 }, // Colaborador Responsável
    { wch: 32 }, // P1
    { wch: 32 }, // P2
    { wch: 32 }, // P3
    { wch: 32 }, // P4
    { wch: 30 }, // P5
    { wch: 32 }, // P6
    { wch: 32 }, // P7
    { wch: 30 }, // P8
    { wch: 32 }, // P9
    { wch: 34 }, // P10
    { wch: 45 }  // Observações
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Auditorias_5S_Armazem');

  // SHEET 2: GUIA DAS 10 PERGUNTAS OFICIAIS DE 5S
  const dictHeaders = ['Nº', 'Pilar / Categoria', 'Pergunta Oficial do 5S', 'Critério de Preenchimento'];
  const dictRows = PERGUNTAS_5S_OFICIAIS.map(p => [
    `P${p.id}`,
    p.categoria,
    p.pergunta,
    'Preencha com "SIM" (Conforme = 1 ponto) ou "NÃO" (Não Conforme = 0 pontos).'
  ]);

  const wsDict = XLSX.utils.aoa_to_sheet([dictHeaders, ...dictRows]);
  wsDict['!cols'] = [
    { wch: 8 },
    { wch: 22 },
    { wch: 80 },
    { wch: 45 }
  ];
  XLSX.utils.book_append_sheet(wb, wsDict, 'Guia_Perguntas_5S');

  XLSX.writeFile(wb, `Modelo_Exemplo_Auditorias_5S.xlsx`);
};

// EXPORTAR TODA A BASE ATUAL EM EXCEL (.XLSX)
export const exportAuditsToExcel = (auditsList?: Audit5SRecord[]) => {
  const list = auditsList && auditsList.length > 0 ? auditsList : (() => {
    try {
      const saved = localStorage.getItem('af_5s_audits') || localStorage.getItem('5s_audits_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  })();

  if (list.length === 0) {
    alert('Nenhum registro para exportar.');
    return;
  }

  const wb = XLSX.utils.book_new();
  const headers = [
    'ID',
    'Data (ISO)',
    'Data Formatada',
    'Área / Setor',
    'Colaborador Responsável',
    'Quem Aplicou (Auditor)',
    'Pontos (0-10)',
    'Nota (%)',
    'P1 (SIM/NÃO)',
    'P2 (SIM/NÃO)',
    'P3 (SIM/NÃO)',
    'P4 (SIM/NÃO)',
    'P5 (SIM/NÃO)',
    'P6 (SIM/NÃO)',
    'P7 (SIM/NÃO)',
    'P8 (SIM/NÃO)',
    'P9 (SIM/NÃO)',
    'P10 (SIM/NÃO)',
    'Observações / Não Conformidades'
  ];

  const rows = list.map(item => [
    item.id,
    item.dataISO,
    item.dataFormatted,
    item.setor,
    item.operador,
    item.liderAuditor || 'Líder Operacional',
    item.pontos,
    `${item.notaPercentual}%`,
    item.respostas?.[0] ? 'SIM' : 'NÃO',
    item.respostas?.[1] ? 'SIM' : 'NÃO',
    item.respostas?.[2] ? 'SIM' : 'NÃO',
    item.respostas?.[3] ? 'SIM' : 'NÃO',
    item.respostas?.[4] ? 'SIM' : 'NÃO',
    item.respostas?.[5] ? 'SIM' : 'NÃO',
    item.respostas?.[6] ? 'SIM' : 'NÃO',
    item.respostas?.[7] ? 'SIM' : 'NÃO',
    item.respostas?.[8] ? 'SIM' : 'NÃO',
    item.respostas?.[9] ? 'SIM' : 'NÃO',
    item.observacoesNaoConforme || ''
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = [
    { wch: 30 },
    { wch: 14 },
    { wch: 16 },
    { wch: 30 },
    { wch: 30 },
    { wch: 28 },
    { wch: 14 },
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 45 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Base_Auditorias_5S');
  XLSX.writeFile(wb, `Base_Auditorias_5S_Completa_${new Date().toISOString().split('T')[0]}.xlsx`);
};

/* MODAL DE IMPORTAÇÃO E EXPORTAÇÃO DA BASE DE DADOS 5S */
export interface ImportExport5SModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataUpdated?: () => void;
}

export const ImportExport5SModal: React.FC<ImportExport5SModalProps> = ({
  isOpen,
  onClose,
  onDataUpdated
}) => {
  const [importStatus, setImportStatus] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [previewAudits, setPreviewAudits] = useState<Audit5SRecord[]>([]);

  if (!isOpen) return null;

  const getStoredAudits = (): Audit5SRecord[] => {
    try {
      const saved = localStorage.getItem('af_5s_audits') || localStorage.getItem('5s_audits_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  };

  const saveAuditsToStorage = (newList: Audit5SRecord[]) => {
    localStorage.setItem('af_5s_audits', JSON.stringify(newList));
    localStorage.setItem('5s_audits_history', JSON.stringify(newList));
    window.dispatchEvent(new CustomEvent('5s_audit_updated', { detail: newList }));
    window.dispatchEvent(new Event('5s_responsaveis_updated'));
    window.dispatchEvent(new Event('storage'));
    if (onDataUpdated) onDataUpdated();
  };

  const handleExportJSON = () => {
    const list = getStoredAudits();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(list, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `base_dados_5s_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportCSV = () => {
    const list = getStoredAudits();
    if (list.length === 0) {
      alert('Nenhum registro para exportar.');
      return;
    }
    const headers = ['ID', 'DataISO', 'DataFormatada', 'Setor', 'Operador', 'LiderAuditor', 'Pontos', 'NotaPercentual', 'Observacoes'];
    const rows = list.map(item => [
      `"${item.id}"`,
      `"${item.dataISO}"`,
      `"${item.dataFormatted}"`,
      `"${item.setor}"`,
      `"${item.operador}"`,
      `"${item.liderAuditor || ''}"`,
      item.pontos,
      item.notaPercentual,
      `"${(item.observacoesNaoConforme || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `base_dados_5s_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // UPLOAD E PROCESSAMENTO DE EXCEL (.XLSX / .XLS), JSON OU CSV
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setImportStatus(`Lendo arquivo "${file.name}"...`);
    setPreviewAudits([]);

    const fileNameLower = file.name.toLowerCase();

    // PROCESSAMENTO DE ARQUIVOS EXCEL (.xlsx / .xls)
    if (fileNameLower.endsWith('.xlsx') || fileNameLower.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const buffer = event.target?.result as ArrayBuffer;
          const wb = XLSX.read(buffer, { type: 'array' });
          const firstSheetName = wb.SheetNames[0];
          const ws = wb.Sheets[firstSheetName];
          const rawRows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

          if (!rawRows || rawRows.length === 0) {
            throw new Error('A planilha está vazia ou sem linhas de dados.');
          }

          const importedList: Audit5SRecord[] = [];

          rawRows.forEach((row, idx) => {
            // Normalizar chaves do objeto para busca flexível
            const normalizedRow: Record<string, any> = {};
            Object.keys(row).forEach(k => {
              const cleanKey = k.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
              normalizedRow[cleanKey] = row[k];
            });

            // Extrair Área / Setor
            const setorVal = (
              normalizedRow['area'] || 
              normalizedRow['setor'] || 
              normalizedRow['local'] || 
              normalizedRow['posto'] || 
              'PICKING'
            ).toString().trim().toUpperCase();

            // Extrair Data
            const rawData = normalizedRow['data'] || normalizedRow['dataiso'] || normalizedRow['date'] || normalizedRow['dia'] || normalizedRow['data formatada'] || normalizedRow['data auditoria'];
            const { dataISO, dataFormatted } = parse5SDateValue(rawData);

            // Extrair Quem Aplicou (Auditor / Líder)
            const liderAuditor = (
              normalizedRow['quem aplicou'] || 
              normalizedRow['auditor'] || 
              normalizedRow['lider'] || 
              normalizedRow['liderauditor'] || 
              normalizedRow['aplicador'] || 
              normalizedRow['quem realizou'] || 
              normalizedRow['avaliador'] || 
              'Líder Operacional'
            ).toString().trim();

            // Extrair Colaborador Responsável da Área
            let operador = (
              normalizedRow['colaborador responsavel'] || 
              normalizedRow['colaborador'] || 
              normalizedRow['responsavel'] || 
              normalizedRow['operador'] || 
              normalizedRow['auditado'] || 
              normalizedRow['nome'] || 
              ''
            ).toString().trim();

            if (!operador) {
              const mapped = MAPEAMENTO_RESPONSAVEIS_5S.find(m => m.area === setorVal);
              operador = mapped ? mapped.colaborador : 'DEJEAN SILVA DE OLIVEIRA';
            }

            // Extrair respostas das 10 perguntas
            const respostas: boolean[] = [];
            for (let p = 1; p <= 10; p++) {
              // Buscar chave que contenha p1, p2, etc. ou parte do texto
              const matchingKey = Object.keys(normalizedRow).find(k => {
                return k.startsWith(`p${p}`) || k.includes(`p${p} `) || k.includes(`p${p}_`) || k.includes(`pergunta ${p}`) || k.includes(`pergunta${p}`);
              });

              if (matchingKey) {
                respostas.push(parse5SBooleanAnswer(normalizedRow[matchingKey]));
              } else {
                // Tenta buscar por palavras-chave
                if (p === 1) respostas.push(parse5SBooleanAnswer(normalizedRow['posto organizado'] || normalizedRow['organizacao'] || 'SIM'));
                else if (p === 2) respostas.push(parse5SBooleanAnswer(normalizedRow['endereco correto'] || normalizedRow['armazenados'] || 'SIM'));
                else if (p === 3) respostas.push(parse5SBooleanAnswer(normalizedRow['corredores'] || normalizedRow['circulacao'] || 'SIM'));
                else if (p === 4) respostas.push(parse5SBooleanAnswer(normalizedRow['ferramentas'] || normalizedRow['equipamentos'] || 'SIM'));
                else if (p === 5) respostas.push(parse5SBooleanAnswer(normalizedRow['epis'] || normalizedRow['epi'] || 'SIM'));
                else if (p === 6) respostas.push(parse5SBooleanAnswer(normalizedRow['condicoes inseguras'] || normalizedRow['riscos'] || 'SIM'));
                else if (p === 7) respostas.push(parse5SBooleanAnswer(normalizedRow['extintores'] || normalizedRow['saidas'] || 'SIM'));
                else if (p === 8) respostas.push(parse5SBooleanAnswer(normalizedRow['piso limpo'] || normalizedRow['limpeza'] || 'SIM'));
                else if (p === 9) respostas.push(parse5SBooleanAnswer(normalizedRow['descarte'] || normalizedRow['residuos'] || 'SIM'));
                else if (p === 10) respostas.push(parse5SBooleanAnswer(normalizedRow['anomalias'] || normalizedRow['disciplina'] || 'SIM'));
                else respostas.push(true);
              }
            }

            const pontos = respostas.filter(Boolean).length;
            const notaPercentual = Math.round((pontos / 10) * 100);

            // Observações
            const obs = (
              normalizedRow['observacoes e acoes corretivas'] || 
              normalizedRow['observacoes'] || 
              normalizedRow['observacao'] || 
              normalizedRow['obs'] || 
              normalizedRow['nao conformidade'] || 
              (pontos === 10 ? 'Conforme padrão 5S.' : 'Itens não conformes tratados e comunicados.')
            ).toString().trim();

            const sanitizedSetor = setorVal.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
            const docId = `imp_5s_${sanitizedSetor}_${dataISO}_${idx}`;

            importedList.push({
              id: docId,
              dataISO,
              dataFormatted,
              setor: setorVal,
              operador,
              liderAuditor,
              pontos,
              notaPercentual,
              respostas,
              observacoesNaoConforme: obs,
              fotoUrl: null,
              createdAt: new Date().toISOString(),
              empresaId: 'demo',
              seiriStatus: respostas[0] && respostas[1] && respostas[2] && respostas[3],
              seitonStatus: respostas[1],
              seisoStatus: respostas[7] && respostas[8],
              seiketsuStatus: respostas[4] && respostas[5] && respostas[6],
              shitsukeStatus: respostas[9]
            });
          });

          if (importedList.length === 0) {
            throw new Error('Nenhum registro de auditoria válido pôde ser extraído da planilha.');
          }

          const currentList = getStoredAudits();
          const map = new Map<string, Audit5SRecord>();
          currentList.forEach(item => map.set(`${item.setor}_${item.dataISO}`, item));
          importedList.forEach(item => map.set(`${item.setor}_${item.dataISO}`, item));

          const merged = Array.from(map.values());
          saveAuditsToStorage(merged);

          setPreviewAudits(importedList);
          setImportStatus(`✅ Importação de Excel realizada com sucesso! ${importedList.length} auditorias importadas/atualizadas (${merged.length} no histórico total).`);
          setIsProcessing(false);
        } catch (err: any) {
          setImportStatus(`❌ Erro ao ler Excel: ${err.message || 'Formato incompatível.'}`);
          setIsProcessing(false);
        }
      };
      reader.readAsArrayBuffer(file);
      return;
    }

    // PROCESSAMENTO DE ARQUIVOS JSON OU CSV
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        let importedList: Audit5SRecord[] = [];

        if (fileNameLower.endsWith('.json')) {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            importedList = parsed.map((item, idx) => {
              const { dataISO, dataFormatted } = parse5SDateValue(item.dataISO || item.dataFormatted || item.data);
              const setor = (item.setor || item.area || 'PICKING').toUpperCase();
              const respostas = Array.isArray(item.respostas) && item.respostas.length === 10
                ? item.respostas
                : Array(10).fill(true);
              const pontos = typeof item.pontos === 'number' ? item.pontos : respostas.filter(Boolean).length;
              const notaPercentual = typeof item.notaPercentual === 'number' ? item.notaPercentual : Math.round((pontos / 10) * 100);

              return {
                id: item.id || `imp_json_5s_${idx}_${Date.now()}`,
                dataISO,
                dataFormatted,
                setor,
                operador: item.operador || item.colaborador || 'DEJEAN SILVA DE OLIVEIRA',
                liderAuditor: item.liderAuditor || item.auditor || 'Líder Operacional',
                pontos,
                notaPercentual,
                respostas,
                observacoesNaoConforme: item.observacoesNaoConforme || item.observacoes || '',
                fotoUrl: item.fotoUrl || null,
                createdAt: item.createdAt || new Date().toISOString(),
                empresaId: item.empresaId || 'demo'
              };
            });
          }
        } else if (fileNameLower.endsWith('.csv')) {
          const lines = text.split('\n').filter(l => l.trim().length > 0);
          if (lines.length > 1) {
            lines.slice(1).forEach((line, idx) => {
              const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
              if (cols.length >= 4) {
                const { dataISO, dataFormatted } = parse5SDateValue(cols[1] || cols[2]);
                const setor = (cols[3] || 'PICKING').toUpperCase();
                const operador = cols[4] || 'Operador';
                const pontos = parseInt(cols[6] || '10', 10);
                const notaPercentual = parseInt(cols[7] || '100', 10);
                importedList.push({
                  id: `imp_csv_5s_${idx}_${Date.now()}`,
                  dataISO,
                  dataFormatted,
                  setor,
                  operador,
                  liderAuditor: cols[5] || 'Líder Operacional',
                  pontos: isNaN(pontos) ? 10 : pontos,
                  notaPercentual: isNaN(notaPercentual) ? 100 : notaPercentual,
                  respostas: Array(10).fill(true),
                  observacoesNaoConforme: cols[8] || '',
                  fotoUrl: null,
                  createdAt: new Date().toISOString(),
                  empresaId: 'demo'
                });
              }
            });
          }
        }

        if (!Array.isArray(importedList) || importedList.length === 0) {
          throw new Error('Nenhum registro válido encontrado no arquivo.');
        }

        const currentList = getStoredAudits();
        const map = new Map<string, Audit5SRecord>();
        currentList.forEach(item => map.set(`${item.setor}_${item.dataISO}`, item));
        importedList.forEach(item => map.set(`${item.setor}_${item.dataISO}`, item));

        const merged = Array.from(map.values());
        saveAuditsToStorage(merged);

        setPreviewAudits(importedList);
        setImportStatus(`✅ Importação concluída! ${importedList.length} registros importados (${merged.length} no total na base).`);
        setIsProcessing(false);
      } catch (err: any) {
        setImportStatus(`❌ Erro ao importar: ${err.message || 'Arquivo inválido.'}`);
        setIsProcessing(false);
      }
    };

    reader.readAsText(file);
  };

  const handleSeedFullYear = () => {
    setIsProcessing(true);
    setImportStatus('Gerando base histórica do ano (Jan a Ago 2026)...');
    setPreviewAudits([]);
    setTimeout(() => {
      const ytdData = generateYTD5SAudits();
      saveAuditsToStorage(ytdData);
      setImportStatus(`✅ Base completa do ano carregada com sucesso! (${ytdData.length} registros cadastrados).`);
      setIsProcessing(false);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border-2 border-amber-500/40 rounded-2xl p-5 sm:p-6 shadow-2xl text-white space-y-5">
        
        {/* CABEÇALHO */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black uppercase text-white tracking-wider flex items-center gap-2">
                Importação & Exportação de Auditorias 5S
              </h3>
              <p className="text-xs text-slate-400">
                Importe planilhas Excel (.xlsx/.xls) ou arquivos JSON/CSV com área, data, avaliador e as 10 perguntas do 5S.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BOTÃO EM DESTAQUE: BAIXAR MODELO DE EXEMPLO EM EXCEL */}
        <div className="p-4 bg-gradient-to-r from-emerald-950/60 to-slate-900 border-2 border-emerald-500/50 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
          <div className="space-y-1">
            <div className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-400" /> Planilha Modelo Oficial (Excel .xlsx)
            </div>
            <p className="text-[11px] text-slate-300">
              Baixe o modelo pré-formatado contendo as 14 áreas oficiais do armazém, quem aplicou, responsáveis e as 10 perguntas do 5S prontas para preenchimento.
            </p>
          </div>
          <button
            type="button"
            onClick={exportExcel5SExample}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 shrink-0"
          >
            <Download className="w-4 h-4 text-emerald-100" /> Baixar Modelo Excel
          </button>
        </div>

        {/* ÁREA DE UPLOAD DE ARQUIVOS */}
        <div className="p-5 bg-[#0b1222] border-2 border-dashed border-sky-500/40 rounded-xl flex flex-col items-center justify-center text-center space-y-2.5">
          <div className="p-3 bg-sky-500/10 rounded-full text-sky-400">
            <UploadCloud className="w-8 h-8" />
          </div>
          <span className="text-sm font-black uppercase text-white tracking-wider">
            Importar Auditorias do Mês (Excel, JSON ou CSV)
          </span>
          <span className="text-xs text-slate-400 max-w-md">
            Selecione o arquivo preenchido (.xlsx, .xls, .json ou .csv). O sistema calculará as notas, dispersão e atualizará o ranking e gráficos automaticamente.
          </span>
          
          <label className="mt-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer transition-all shadow-lg flex items-center gap-2">
            <Upload className="w-4 h-4" /> Selecionar Arquivo do Computador
            <input 
              type="file" 
              accept=".xlsx,.xls,.json,.csv" 
              onChange={handleFileUpload} 
              className="hidden" 
            />
          </label>
          <span className="text-[10px] text-slate-500 font-mono">Formatos suportados: .xlsx, .xls, .json, .csv</span>
        </div>

        {/* STATUS DA IMPORTAÇÃO */}
        {importStatus && (
          <div className="p-3.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono font-bold text-center text-amber-200">
            {importStatus}
          </div>
        )}

        {/* PRÉVIA DOS DADOS IMPORTADOS */}
        {previewAudits.length > 0 && (
          <div className="p-4 bg-[#0b1222] border border-emerald-500/40 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-400 uppercase tracking-wider">
              <span>Prévia dos Registros Importados ({previewAudits.length})</span>
              <span className="text-[10px] text-slate-400 font-mono">Atualizados no Dashboard</span>
            </div>
            <div className="max-h-40 overflow-y-auto overflow-x-auto">
              <table className="w-full text-left text-[11px] font-mono">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800 text-[10px] uppercase">
                    <th className="p-1.5">Data</th>
                    <th className="p-1.5">Área</th>
                    <th className="p-1.5">Quem Aplicou</th>
                    <th className="p-1.5">Responsável</th>
                    <th className="p-1.5 text-center">Pontos</th>
                    <th className="p-1.5 text-center">Nota</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {previewAudits.slice(0, 10).map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30">
                      <td className="p-1.5 whitespace-nowrap">{item.dataFormatted}</td>
                      <td className="p-1.5 font-bold text-amber-300">{item.setor}</td>
                      <td className="p-1.5 text-slate-400">{item.liderAuditor || 'Líder'}</td>
                      <td className="p-1.5 text-slate-300">{item.operador}</td>
                      <td className="p-1.5 text-center font-bold text-emerald-400">{item.pontos}/10</td>
                      <td className="p-1.5 text-center font-bold">{item.notaPercentual}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {previewAudits.length > 10 && (
              <div className="text-[10px] text-slate-400 text-center italic">
                ... e mais {previewAudits.length - 10} registros salvos com sucesso.
              </div>
            )}
          </div>
        )}

        {/* EXPORTAR BASE ATUAL COMPLETA */}
        <div className="space-y-2">
          <div className="text-xs font-black uppercase text-slate-300 tracking-wider">
            Exportar Base de Dados Armazenada
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              onClick={() => exportAuditsToExcel()}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-emerald-300 transition-all cursor-pointer shadow-sm"
            >
              <Download className="w-4 h-4 text-emerald-400" /> Base Atual (Excel)
            </button>

            <button
              onClick={handleExportJSON}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-amber-300 transition-all cursor-pointer shadow-sm"
            >
              <Download className="w-4 h-4 text-amber-400" /> Base Atual (JSON)
            </button>

            <button
              onClick={handleExportCSV}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-sky-300 transition-all cursor-pointer shadow-sm"
            >
              <Download className="w-4 h-4 text-sky-400" /> Planilha (CSV)
            </button>
          </div>
        </div>

        {/* SINCRONIZAÇÃO DA BASE DO ANO */}
        <div className="p-4 bg-amber-950/30 border border-amber-500/30 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase">
            <RefreshCw className="w-4 h-4 text-amber-400" /> Carregar Histórico Padrão (Jan a Ago 2026)
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Preencha a fábrica com auditorias históricas realistas de Janeiro a Agosto com todas as 14 áreas oficiais.
          </p>
          <button
            onClick={handleSeedFullYear}
            disabled={isProcessing}
            className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            {isProcessing ? 'Processando...' : '⚡ Sincronizar Base Histórica 2026'}
          </button>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase rounded-xl cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

/* COMPONENTE DE DESEMPENHO MENSAL DO COLABORADOR (META VS REAL) */
export interface Collaborator5SPerformanceCardProps {
  user?: any;
  userNombre?: string;
  onSelectSector?: (sectorName: string) => void;
}

export const Collaborator5SPerformanceCard: React.FC<Collaborator5SPerformanceCardProps> = ({
  user,
  userNombre,
  onSelectSector
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('08'); // '08' = Agosto
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [audits, setAudits] = useState<Audit5SRecord[]>([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);

  const operatorName = user?.nome || userNombre || 'DEJEAN SILVA DE OLIVEIRA';
  const assignedAreas = getUserAssignedAreasList(user, userNombre);

  const loadAudits = () => {
    try {
      const data = getStored5SAudits();
      setAudits(data);
    } catch {
      // fallback
    }
  };

  useEffect(() => {
    loadAudits();
    const handleUpdate = () => loadAudits();
    window.addEventListener('5s_audit_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('5s_audit_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Filter audits for this operator / assigned areas in selected month/year
  const monthAudits = audits.filter(a => {
    if (!a.dataISO) return false;
    const parts = a.dataISO.split('-');
    if (parts.length < 2) return false;
    return parts[0] === selectedYear && parts[1] === selectedMonth;
  });

  const numAreas = assignedAreas.length > 0 ? assignedAreas.length : 1;
  const metaQtdTotal = numAreas * 22; // 22 dias úteis por área

  // Audits executed for assigned areas by this user or general
  const realAuditsUser = monthAudits.filter(a => {
    const isAreaMatch = assignedAreas.some(areaName => (a.setor || '').toLowerCase().trim() === areaName.toLowerCase().trim());
    const isUserMatch = a.operador && (
      a.operador.toLowerCase().trim() === operatorName.toLowerCase().trim() ||
      operatorName.toLowerCase().includes(a.operador.toLowerCase().trim()) ||
      a.operador.toLowerCase().includes(operatorName.toLowerCase().trim())
    );
    return isAreaMatch || isUserMatch;
  });

  const realQtdTotal = realAuditsUser.length;
  const pctAtingimento = Math.min(100, Math.round((realQtdTotal / metaQtdTotal) * 100));

  const avgQualidade = realAuditsUser.length > 0
    ? Math.round(realAuditsUser.reduce((acc, curr) => acc + (curr.notaPercentual || 0), 0) / realAuditsUser.length)
    : 100;

  return (
    <div className="bg-[#0b1222] border border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-2xl text-white space-y-4">
      {/* CABEÇALHO DO DESEMPENHO MENSAL (Estilo Imagem do Usuário) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <Target className="w-6 h-6 text-amber-400 shrink-0" />
          <div>
            <h3 className="text-sm sm:text-base font-black uppercase text-amber-400 tracking-wider flex items-center gap-2">
              Desempenho Mensal do Colaborador (Meta vs Real 5S)
            </h3>
            <p className="text-xs text-slate-400">
              Acompanhamento do atingimento mensal das auditorias 5S da sua operação.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-mono font-bold">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-amber-300 font-bold focus:outline-none cursor-pointer"
            >
              <option value="01" className="bg-slate-900 text-white">01 - Janeiro</option>
              <option value="02" className="bg-slate-900 text-white">02 - Fevereiro</option>
              <option value="03" className="bg-slate-900 text-white">03 - Março</option>
              <option value="04" className="bg-slate-900 text-white">04 - Abril</option>
              <option value="05" className="bg-slate-900 text-white">05 - Maio</option>
              <option value="06" className="bg-slate-900 text-white">06 - Junho</option>
              <option value="07" className="bg-slate-900 text-white">07 - Julho</option>
              <option value="08" className="bg-slate-900 text-white">08 - Agosto</option>
              <option value="09" className="bg-slate-900 text-white">09 - Setembro</option>
              <option value="10" className="bg-slate-900 text-white">10 - Outubro</option>
              <option value="11" className="bg-slate-900 text-white">11 - Novembro</option>
              <option value="12" className="bg-slate-900 text-white">12 - Dezembro</option>
            </select>
            <span className="text-slate-500">/</span>
            <span className="text-white font-mono">{selectedYear}</span>
          </div>

          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
          >
            <Database className="w-3.5 h-3.5" /> Base / Importar
          </button>
        </div>
      </div>

      {/* QUADRO DE RESUMO DE METAS DO COLABORADOR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* COLABORADOR E ÁREAS */}
        <div className="p-3 bg-[#131d38] border border-slate-800 rounded-xl space-y-1 lg:col-span-2">
          <div className="text-[10px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-amber-400" /> COLABORADOR & ÁREAS VINCULADAS
          </div>
          <div className="text-xs font-black text-white truncate">{operatorName}</div>
          <div className="flex flex-wrap gap-1 pt-1">
            {assignedAreas.map(a => (
              <span key={a} className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-black uppercase">
                {a}
              </span>
            ))}
          </div>
        </div>

        {/* META QTD */}
        <div className="p-3 bg-[#131d38] border border-slate-800 rounded-xl space-y-1">
          <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">META QTD (MÊS)</div>
          <div className="text-lg font-black font-mono text-white">{metaQtdTotal} <span className="text-[10px] font-normal text-slate-400">checklists</span></div>
          <div className="text-[10px] text-slate-400 font-mono">22 dias × {numAreas} área(s)</div>
        </div>

        {/* REAL QTD */}
        <div className="p-3 bg-[#131d38] border border-slate-800 rounded-xl space-y-1">
          <div className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">REAL QTD (MÊS)</div>
          <div className="text-lg font-black font-mono text-emerald-400">{realQtdTotal} <span className="text-[10px] font-normal text-slate-400">realizados</span></div>
          <div className="text-[10px] text-emerald-400 font-bold">Atualização em Tempo Real</div>
        </div>

        {/* % ATINGIMENTO & CONFORMIDADE */}
        <div className="p-3 bg-[#131d38] border border-slate-800 rounded-xl space-y-1">
          <div className="text-[10px] font-black uppercase text-amber-400 tracking-wider">% FREQUÊNCIA</div>
          <div className="flex items-center justify-between">
            <span className={`text-lg font-black font-mono ${pctAtingimento >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {pctAtingimento}%
            </span>
            <span className="text-[10px] font-mono text-sky-400 font-bold">Conf: {avgQualidade}%</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${pctAtingimento >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}`}
              style={{ width: `${pctAtingimento}%` }}
            />
          </div>
        </div>
      </div>

      {/* DETALHAMENTO DE CADA ÁREA DA RESPONSABILIDADE */}
      <div className="space-y-2 pt-1">
        <div className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
          <Building2 className="w-4 h-4 text-amber-400" /> Status de Atingimento por Área ({assignedAreas.length})
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {assignedAreas.map((areaName) => {
            const areaAudits = monthAudits.filter(a => (a.setor || '').toLowerCase().trim() === areaName.toLowerCase().trim());
            const areaReal = areaAudits.length;
            const areaMeta = 22;
            const areaPct = Math.min(100, Math.round((areaReal / areaMeta) * 100));

            return (
              <div
                key={areaName}
                className="p-3 bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-xl space-y-2 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-300 truncate">{areaName}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${areaPct >= 80 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                    {areaPct >= 100 ? '✅ 100%' : `${areaPct}%`}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-slate-300">
                  <span>Meta: {areaMeta}</span>
                  <span className="font-bold text-emerald-400">Real: {areaReal}</span>
                </div>

                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-amber-400 h-full" style={{ width: `${areaPct}%` }} />
                </div>

                {onSelectSector && (
                  <button
                    type="button"
                    onClick={() => onSelectSector(areaName)}
                    className="w-full py-1 mt-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    <CheckCircle2 className="w-3 h-3 text-amber-400" /> Preencher 5S
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <ImportExport5SModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onDataUpdated={() => loadAudits()}
      />
    </div>
  );
};

export const PERGUNTAS_5S_OFICIAIS = [
  { id: 1, categoria: 'ORGANIZAÇÃO', pergunta: 'O posto de trabalho está organizado e livre de materiais desnecessários.' },
  { id: 2, categoria: 'ORGANIZAÇÃO', pergunta: 'Produtos, pallets e materiais estão armazenados no endereço/local correto.' },
  { id: 3, categoria: 'ORGANIZAÇÃO', pergunta: 'Corredores e áreas de circulação estão totalmente desobstruídos.' },
  { id: 4, categoria: 'ORGANIZAÇÃO', pergunta: 'Ferramentas e equipamentos foram guardados no local identificado após o uso.' },
  { id: 5, categoria: 'SEGURANÇA', pergunta: 'Está utilizando corretamente todos os EPIs obrigatórios.' },
  { id: 6, categoria: 'SEGURANÇA', pergunta: 'Não existem condições inseguras (pallets instáveis, produtos mal empilhados ou riscos de queda).' },
  { id: 7, categoria: 'SEGURANÇA', pergunta: 'Extintores, hidrantes, saídas de emergência e painéis elétricos estão livres de obstrução.' },
  { id: 8, categoria: 'LIMPEZA', pergunta: 'O piso está limpo, seco e sem resíduos ou vazamentos.' },
  { id: 9, categoria: 'LIMPEZA', pergunta: 'Resíduos e materiais descartáveis foram destinados corretamente.' },
  { id: 10, categoria: 'DISCIPLINA', pergunta: 'Qualquer anomalia encontrada foi comunicada imediatamente ao líder.' }
];

export interface Checklist5SFormProps {
  defaultSetor?: string;
  userNombre?: string;
  user?: any;
  empresaId?: string;
  liderAuditor?: string;
  onSaveSuccess?: (record: Audit5SRecord) => void;
  onCancel?: () => void;
  lockSetor?: boolean;
}

export const Checklist5SForm: React.FC<Checklist5SFormProps> = ({
  defaultSetor = 'REPACK',
  userNombre,
  user,
  empresaId = 'demo',
  liderAuditor = 'Líder de Turno',
  onSaveSuccess,
  onCancel,
  lockSetor = false
}) => {
  const initialOperador = user?.nome || userNombre || 'Operador / Responsável';
  
  const assignedAreas = getUserAssignedAreasList(user, userNombre);
  const [showAllAreas, setShowAllAreas] = useState<boolean>(false);

  const availableSetores = showAllAreas 
    ? SETORES_5S 
    : (assignedAreas.length > 0 ? assignedAreas : SETORES_5S);

  const [setor, setSetor] = useState<string>(() => {
    if (assignedAreas.length > 0) return assignedAreas[0];
    return defaultSetor;
  });

  const [operador, setOperador] = useState<string>(initialOperador);
  const [lider, setLider] = useState<string>(liderAuditor);
  const [dataISO, setDataISO] = useState<string>(new Date().toISOString().split('T')[0]);

  // 10 answers state (true = SIM / Conforme, false = NÃO / Não Conforme)
  const [respostas, setRespostas] = useState<boolean[]>([true, true, true, true, true, true, true, true, true, true]);
  const [observacao, setObservacao] = useState<string>('');
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [fotoFileName, setFotoFileName] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  useEffect(() => {
    if (assignedAreas.length > 0 && !assignedAreas.includes(setor) && !showAllAreas) {
      setSetor(assignedAreas[0]);
    }
  }, [user, userNombre]);

  useEffect(() => {
    if (user?.nome || userNombre) {
      setOperador(user?.nome || userNombre);
    }
  }, [user, userNombre]);

  // Calculate total points (0 to 10)
  const pontos = respostas.filter(Boolean).length;
  const notaPercentual = Math.round((pontos / 10) * 100);
  const hasNaoConformidade = pontos < 10;

  // Determine status classification according to image criteria
  const getCriterioInfo = (p: number) => {
    if (p === 10) return { label: 'EXCELENTE', color: 'bg-emerald-600 text-white', border: 'border-emerald-500' };
    if (p >= 8) return { label: 'BOM', color: 'bg-blue-600 text-white', border: 'border-blue-500' };
    if (p >= 6) return { label: 'ATENÇÃO', color: 'bg-amber-500 text-slate-950 font-black', border: 'border-amber-400' };
    return { label: 'AÇÃO CORRETIVA IMEDIATA', color: 'bg-rose-600 text-white font-black', border: 'border-rose-500' };
  };

  const criterio = getCriterioInfo(pontos);

  const handleToggleAnswer = (index: number, value: boolean) => {
    const updated = [...respostas];
    updated[index] = value;
    setRespostas(updated);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFotoFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setFotoUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!operador.trim()) {
      alert('Por favor, informe o nome do colaborador / responsável.');
      return;
    }

    if (hasNaoConformidade && !observacao.trim()) {
      alert('Existem itens não conformes. Por favor, detalhe o motivo/ação no campo de observação.');
      return;
    }

    setIsSaving(true);
    const dateParts = dataISO.split('-');
    const dataFormatted = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

    // Document ID based on Setor and Date for deterministic overwrite
    const sanitizedSetor = setor.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const docId = `5s_${sanitizedSetor}_${dataISO}`;

    const newRecord: Audit5SRecord = {
      id: docId,
      dataISO,
      dataFormatted,
      setor,
      operador: operador.trim(),
      liderAuditor: lider.trim(),
      pontos,
      notaPercentual,
      respostas,
      observacoesNaoConforme: observacao.trim(),
      fotoUrl,
      createdAt: new Date().toISOString(),
      empresaId,
      // Legacy fields mapping
      seiriStatus: respostas[0] && respostas[1] && respostas[2] && respostas[3],
      seitonStatus: respostas[1],
      seisoStatus: respostas[7] && respostas[8],
      seiketsuStatus: respostas[4] && respostas[5] && respostas[6],
      shitsukeStatus: respostas[9]
    };

    try {
      await save5SAuditRecord(newRecord);

      setIsSaving(false);
      setIsSaved(true);

      if (onSaveSuccess) {
        onSaveSuccess(newRecord);
      }
    } catch (err) {
      console.error('Erro ao salvar auditoria 5S:', err);
      setIsSaving(false);
      alert('Ocorreu um erro ao gravar a auditoria. Tente novamente.');
    }
  };

  return (
    <form onSubmit={handleSaveAudit} className="space-y-5 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl">
      
      {/* 0. TOP BANNER MOSTRANDO ÁREA EM PREENCHIMENTO E RESPONSABILIDADE (Estilo Imagem 1) */}
      <div className="bg-[#041a36] border border-blue-500/40 p-3 px-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-mono text-blue-200">
        <div className="flex items-center gap-2">
          <FileCheck className="w-4 h-4 text-amber-400" />
          <span className="font-black tracking-wide text-white uppercase">
            PREENCHENDO CHECKLIST 5S - ÁREA {setor}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded font-bold">
            Áreas sob sua responsabilidade: {assignedAreas.length}
          </span>
        </div>
      </div>

      {/* PAINEL DE SELEÇÃO RÁPIDA DE ÁREAS DA RESPONSABILIDADE DO COLABORADOR */}
      {assignedAreas.length > 0 && (
        <div className="p-3 bg-slate-100 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Áreas de Sua Responsabilidade Direta ({operador})
            </span>

            <button
              type="button"
              onClick={() => setShowAllAreas(!showAllAreas)}
              className="text-[10px] font-bold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
            >
              {showAllAreas ? '🔒 Filtrar apenas minhas áreas' : '🌐 Exibir todas as áreas da fábrica'}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {assignedAreas.map((areaName) => {
              const isActive = setor === areaName;
              return (
                <button
                  key={areaName}
                  type="button"
                  onClick={() => setSetor(areaName)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-400 scale-102 font-black'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-amber-500/50 border border-slate-300 dark:border-slate-700'
                  }`}
                >
                  <CheckCircle2 className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-amber-500'}`} />
                  <span>{areaName}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 1. CABEÇALHO AZUL (Estilo Imagem 3) */}
      <div className="bg-[#032b5e] text-white p-4 rounded-xl flex items-center justify-between shadow-md border-b-4 border-amber-500">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/10 rounded-xl text-amber-400 border border-white/20">
            <ClipboardList className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black uppercase tracking-wider text-white leading-tight">
              CHECKLIST 5S – ARMAZÉM
            </h2>
            <p className="text-[11px] text-amber-300 font-bold uppercase tracking-widest mt-0.5">
              ORGANIZAÇÃO • SEGURANÇA • LIMPEZA
            </p>
          </div>
        </div>

        <div className="hidden sm:flex flex-col items-end">
          <span className="text-[10px] text-slate-300 font-bold uppercase">PAU BRASIL DISTRIBUIDORA</span>
          <span className="text-xs font-black text-amber-400">UNIDADE GUARABIRA-PB</span>
        </div>
      </div>

      {/* 2. CAMPOS DE IDENTIFICAÇÃO (SETOR, COLABORADOR, DATA) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
        <div>
          <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 block mb-1 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-amber-500" /> Setor / Área 5S
          </label>
          <select
            value={setor}
            disabled={lockSetor}
            onChange={(e) => setSetor(e.target.value)}
            className="w-full text-xs font-bold p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 disabled:opacity-80"
          >
            {availableSetores.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 block mb-1 flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-amber-500" /> Colaborador(a) Responsável
          </label>
          <select
            value={operador}
            onChange={(e) => setOperador(e.target.value)}
            className="w-full text-xs font-bold p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
          >
            {LISTA_COLABORADORES_OFICIAIS.map((c) => (
              <option key={c.matricula} value={c.nome}>
                {c.nome} ({c.cargo})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 block mb-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-amber-500" /> Data da Avaliação (Segunda a Sexta)
          </label>
          <input
            type="date"
            value={dataISO}
            onChange={(e) => setDataISO(e.target.value)}
            className={`w-full text-xs font-bold p-2 bg-white dark:bg-slate-900 border rounded-lg text-slate-900 dark:text-white focus:ring-2 ${
              isWeekendISO(dataISO)
                ? 'border-rose-500 ring-2 ring-rose-500/30'
                : 'border-slate-300 dark:border-slate-600 focus:ring-amber-500'
            }`}
          />
        </div>
      </div>

      {/* AVISO DE RESTRIÇÃO DE FIM DE SEMANA */}
      {isWeekendISO(dataISO) && (
        <div className="p-3 bg-rose-500/10 border-2 border-rose-500/40 rounded-xl flex items-center gap-3 text-rose-300 text-xs font-bold animate-fadeIn">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <div>
            <strong className="block uppercase text-rose-400">Jornada Operacional 5S Restrita (Segunda a Sexta-Feira)</strong>
            <span>O programa de 5S da fábrica opera exclusivamente de segunda a sexta-feira. Altere a data para um dia útil para permitir a gravação do registro.</span>
          </div>
        </div>
      )}

      {/* 3. TABELA OFICIAL DE 10 PERGUNTAS (SIM / NÃO) */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[650px]">
            <thead>
              <tr className="bg-[#032b5e] text-white text-[11px] font-black uppercase tracking-wider">
                <th className="p-3 w-12 text-center border-r border-blue-900">Nº</th>
                <th className="p-3 w-36 border-r border-blue-900">CATEGORIA</th>
                <th className="p-3 border-r border-blue-900">ITEM DE VERIFICAÇÃO</th>
                <th className="p-3 w-20 text-center border-r border-blue-900 bg-emerald-700 text-white">SIM</th>
                <th className="p-3 w-20 text-center bg-rose-700 text-white">NÃO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              {PERGUNTAS_5S_OFICIAIS.map((item, idx) => {
                const isSim = respostas[idx];
                return (
                  <tr 
                    key={item.id} 
                    className={`transition-colors ${
                      isSim 
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/10 hover:bg-emerald-50 dark:hover:bg-emerald-950/20' 
                        : 'bg-rose-50/60 dark:bg-rose-950/20 hover:bg-rose-100/60 dark:hover:bg-rose-950/30'
                    }`}
                  >
                    <td className="p-3 text-center font-black text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800">
                      {item.id}
                    </td>
                    <td className="p-3 font-extrabold border-r border-slate-200 dark:border-slate-800">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-black ${
                        item.categoria === 'ORGANIZAÇÃO' ? 'bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-300' :
                        item.categoria === 'SEGURANÇA' ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300' :
                        item.categoria === 'LIMPEZA' ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-300' :
                        'bg-purple-100 text-purple-900 dark:bg-purple-900/40 dark:text-purple-300'
                      }`}>
                        {item.categoria}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-slate-800 dark:text-slate-100 border-r border-slate-200 dark:border-slate-800">
                      {item.pergunta}
                    </td>

                    {/* BOTÃO SIM */}
                    <td className="p-2 text-center border-r border-slate-200 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => handleToggleAnswer(idx, true)}
                        className={`w-full py-1.5 rounded-lg font-black text-xs uppercase flex items-center justify-center gap-1 cursor-pointer transition-all ${
                          isSim 
                            ? 'bg-emerald-600 text-white shadow-xs scale-102 ring-2 ring-emerald-500' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-emerald-600'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        SIM
                      </button>
                    </td>

                    {/* BOTÃO NÃO */}
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleAnswer(idx, false)}
                        className={`w-full py-1.5 rounded-lg font-black text-xs uppercase flex items-center justify-center gap-1 cursor-pointer transition-all ${
                          !isSim 
                            ? 'bg-rose-600 text-white shadow-xs scale-102 ring-2 ring-rose-500' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-rose-600'
                        }`}
                      >
                        <X className="w-3.5 h-3.5" />
                        NÃO
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. CRITÉRIO DE AVALIAÇÃO & OBJETIVO (QUADROS INFERIORES ESTILO IMAGEM 3) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* CRITÉRIO DE AVALIAÇÃO */}
        <div className="border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden shadow-xs bg-slate-50 dark:bg-slate-800/50 flex flex-col justify-between">
          <div className="bg-[#032b5e] text-white p-2.5 font-black text-xs uppercase text-center tracking-wider">
            CRITÉRIO DE AVALIAÇÃO
          </div>
          <div className="p-3 space-y-2 text-xs font-bold">
            <div className="flex items-center justify-between p-1.5 rounded bg-emerald-500/10 border border-emerald-500/20">
              <span className="font-extrabold text-emerald-700 dark:text-emerald-400">10 pontos</span>
              <span className="bg-emerald-600 text-white px-2 py-0.5 rounded text-[10px] font-black">🟢 EXCELENTE</span>
            </div>
            <div className="flex items-center justify-between p-1.5 rounded bg-blue-500/10 border border-blue-500/20">
              <span className="font-extrabold text-blue-700 dark:text-blue-400">8 a 9 pontos</span>
              <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-[10px] font-black">🔵 BOM</span>
            </div>
            <div className="flex items-center justify-between p-1.5 rounded bg-amber-500/10 border border-amber-500/20">
              <span className="font-extrabold text-amber-700 dark:text-amber-400">6 a 7 pontos</span>
              <span className="bg-amber-500 text-slate-950 px-2 py-0.5 rounded text-[10px] font-black">🟡 ATENÇÃO</span>
            </div>
            <div className="flex items-center justify-between p-1.5 rounded bg-rose-500/10 border border-rose-500/20">
              <span className="font-extrabold text-rose-700 dark:text-rose-400">Até 5 pontos</span>
              <span className="bg-rose-600 text-white px-2 py-0.5 rounded text-[10px] font-black">🔴 AÇÃO CORRETIVA IMEDIATA</span>
            </div>
          </div>
        </div>

        {/* OBJETIVO DA ROTINA */}
        <div className="border border-slate-300 dark:border-slate-700 rounded-xl p-4 bg-gradient-to-br from-slate-900 to-[#032b5e] text-white flex flex-col justify-between shadow-xs">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              <span className="text-xs font-black uppercase text-amber-400 tracking-wider">OBJETIVO DO PROGRAMA</span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed font-medium">
              Objetivo: Manter o armazém organizado, seguro e limpo, promovendo um ambiente de trabalho eficiente e livre de riscos.
            </p>
          </div>

          <div className="pt-3 border-t border-white/10 mt-3 text-center">
            <span className="text-xs font-black text-amber-300 block uppercase tracking-wide">FAÇA SUA PARTE!</span>
            <span className="text-[11px] text-slate-300 italic font-serif">Qualidade depende de todos nós.</span>
          </div>
        </div>

      </div>

      {/* 5. RODAPÉ DE ASSINATURA / METADADOS (DATA, SETOR, COLABORADOR, LÍDER, PONTUAÇÃO) */}
      <div className="bg-slate-100 dark:bg-slate-800/90 p-4 rounded-xl border border-slate-300 dark:border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-4">
        
        <div className="space-y-2 text-xs font-bold text-slate-700 dark:text-slate-200">
          <div className="flex items-center justify-between border-b border-slate-300 dark:border-slate-700 pb-1">
            <span className="text-[10px] uppercase font-black text-slate-500">DATA:</span>
            <span className="font-mono">{dataISO.split('-').reverse().join('/')}</span>
          </div>
          <div className="flex items-center justify-between border-b border-slate-300 dark:border-slate-700 pb-1">
            <span className="text-[10px] uppercase font-black text-slate-500">SETOR:</span>
            <span className="text-amber-600 dark:text-amber-400 font-extrabold uppercase">{setor}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-black text-slate-500">COLABORADOR(A):</span>
            <span className="font-extrabold">{operador}</span>
          </div>
        </div>

        <div className="space-y-2 text-xs font-bold text-slate-700 dark:text-slate-200">
          <div className="flex items-center justify-between border-b border-slate-300 dark:border-slate-700 pb-1">
            <span className="text-[10px] uppercase font-black text-slate-500">LÍDER / AUDITOR:</span>
            <input
              type="text"
              value={lider}
              onChange={(e) => setLider(e.target.value)}
              className="bg-transparent border-b border-dashed border-slate-400 text-right font-extrabold text-xs text-slate-900 dark:text-white outline-none"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] uppercase font-black text-slate-500">PONTUAÇÃO OBTIDA:</span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black font-mono text-slate-900 dark:text-white">{pontos} / 10</span>
              <span className={`px-2 py-0.5 rounded text-xs font-black uppercase ${criterio.color}`}>
                {notaPercentual}% ({criterio.label})
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* DETALHAMENTO DE NÃO CONFORMIDADE */}
      {hasNaoConformidade && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-xl p-4 space-y-2 animate-fadeIn">
          <label className="text-xs font-black uppercase text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            Detalhamento das Anomalias / Itens Não Conformes ({10 - pontos} item(ns) zerado(s))
          </label>
          <textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            rows={2}
            placeholder="Descreva o motivo dos itens 'NÃO' marcados e a ação corretiva imediata acordada com o líder..."
            className="w-full p-2.5 text-xs bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium"
          />
        </div>
      )}

      {/* FOTO COMPROVATÓRIA DO LOCAL */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 bg-slate-50/80 dark:bg-slate-800/40 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black uppercase text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
            <Camera className="w-4 h-4 text-amber-500" />
            Anexar Foto do Setor Organizado (Opcional)
          </label>
          {fotoUrl && (
            <button
              type="button"
              onClick={() => {
                setFotoUrl(null);
                setFotoFileName('');
              }}
              className="text-[10px] font-bold text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" /> Remover Foto
            </button>
          )}
        </div>

        {fotoUrl ? (
          <div className="relative rounded-xl overflow-hidden border border-amber-500/40 max-h-40 flex items-center justify-center bg-black/90">
            <img src={fotoUrl} alt="Foto do setor 5S" className="max-h-40 object-contain" />
            <div className="absolute bottom-2 left-2 bg-slate-950/80 text-amber-400 font-mono text-[10px] px-2 py-0.5 rounded border border-amber-500/30">
              {fotoFileName || 'Foto Comprovatória'}
            </div>
          </div>
        ) : (
          <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-amber-500 bg-white dark:bg-slate-900 rounded-xl p-3 flex items-center justify-center gap-3 cursor-pointer transition-all group">
            <Upload className="w-5 h-5 text-slate-400 group-hover:text-amber-500 transition-colors" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
              Clique para Tirar / Carregar Foto do Local Organizado
            </span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </label>
        )}
      </div>

      {/* BOTOES DE AÇÃO */}
      <div className="pt-2 flex items-center justify-end gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl font-bold text-xs uppercase bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
          >
            Cancelar
          </button>
        )}

        <button
          type="submit"
          disabled={isSaving || isSaved || isWeekendISO(dataISO)}
          className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md ${
            isWeekendISO(dataISO)
              ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
              : isSaved
              ? 'bg-emerald-600 text-white cursor-pointer'
              : 'bg-[#032b5e] hover:bg-blue-900 text-white border border-blue-700 cursor-pointer'
          }`}
        >
          {isSaving ? (
            <span>Gravando...</span>
          ) : isSaved ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Checklist 5S Registrado com Sucesso!
            </>
          ) : isWeekendISO(dataISO) ? (
            <>
              <AlertTriangle className="w-4 h-4 text-rose-400" /> Registro Indisponível no Fim de Semana
            </>
          ) : (
            <>
              <FileCheck className="w-4 h-4 text-amber-400" /> Finalizar e Salvar Auditoria 5S ({notaPercentual}%)
            </>
          )}
        </button>
      </div>

    </form>
  );
};

export interface Checklist5SModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSetor?: string;
  userNombre?: string;
  user?: any;
  empresaId?: string;
  liderAuditor?: string;
}

export const Checklist5SModal: React.FC<Checklist5SModalProps> = ({
  isOpen,
  onClose,
  defaultSetor = 'REPACK',
  userNombre,
  user,
  empresaId = 'demo',
  liderAuditor = 'Líder de Turno'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="w-full max-w-4xl max-h-[95vh] overflow-y-auto my-auto">
        <div className="relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 bg-slate-900/80 hover:bg-slate-900 text-slate-300 hover:text-white rounded-full transition-colors cursor-pointer border border-slate-700"
            title="Fechar Modal"
          >
            <X className="w-5 h-5" />
          </button>

          <Checklist5SForm
            defaultSetor={defaultSetor}
            userNombre={userNombre}
            user={user}
            empresaId={empresaId}
            liderAuditor={liderAuditor}
            onCancel={onClose}
            onSaveSuccess={() => {
              setTimeout(() => {
                onClose();
              }, 1200);
            }}
          />
        </div>
      </div>
    </div>
  );
};
