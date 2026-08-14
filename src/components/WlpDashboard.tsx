import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  Cell
} from 'recharts';
import { 
  BarChart3, 
  Clock, 
  Calendar, 
  Users, 
  TrendingUp, 
  Save, 
  Plus, 
  Upload, 
  Download, 
  Trash2, 
  Filter, 
  Award, 
  FileSpreadsheet, 
  FileText,
  CheckCircle2, 
  AlertTriangle,
  HelpCircle,
  X,
  Play,
  Bell,
  AlertCircle,
  ShieldAlert,
  ShieldCheck,
  History,
  Info,
  ArrowRight,
  Edit3,
  UserCheck,
  UserX,
  Search,
  RotateCcw
} from 'lucide-react';

export interface HistoricalVolumeRowItem {
  m: string;
  v24: string;
  v25: string;
  v26: string;
  crit: boolean;
  isParcial26?: boolean;
}

const DEFAULT_HISTORICAL_VOLUMES: HistoricalVolumeRowItem[] = [
  { m: 'Jan', v24: '-', v25: '13.491,3', v26: '16.336,4', crit: false },
  { m: 'Fev', v24: '-', v25: '11.676,1', v26: '12.486,1', crit: false },
  { m: 'Mar', v24: '-', v25: '10.023,7', v26: '13.813,4', crit: true },
  { m: 'Abr', v24: '-', v25: '11.426,4', v26: '12.981,1', crit: false },
  { m: 'Mai', v24: '-', v25: '12.501,8', v26: '12.447,2', crit: false },
  { m: 'Jun', v24: '-', v25: '13.697,8', v26: '16.686,6', crit: true },
  { m: 'Jul', v24: '-', v25: '10.923,4', v26: '13.626,8', crit: false },
  { m: 'Ago', v24: '-', v25: '9.272,7', v26: '5.118,7', isParcial26: true, crit: false },
  { m: 'Set', v24: '-', v25: '11.211,3', v26: '-', crit: false },
  { m: 'Out', v24: '10.040,2', v25: '11.802,8', v26: '-', crit: false },
  { m: 'Nov', v24: '12.553,6', v25: '12.774,3', v26: '-', crit: false },
  { m: 'Dez', v24: '16.231,5', v25: '21.469,2', v26: '-', crit: true },
];

export interface AbsenteeismMonthItem {
  num: string;
  short: string;
  nome: string;
  val: string;
  st: 'OK' | 'NOK' | 'PENDENTE';
  isCritical?: boolean;
  observacao?: string;
}

export const DEFAULT_ABSENTEEISM_2026: AbsenteeismMonthItem[] = [
  { num: '01', short: 'JAN', nome: 'Janeiro', val: '1,17%', st: 'OK' },
  { num: '02', short: 'FEV', nome: 'Fevereiro', val: '0,00%', st: 'NOK' },
  { num: '03', short: 'MAR (Crit.)', nome: 'Março', val: '2,38%', st: 'OK', isCritical: true },
  { num: '04', short: 'ABR', nome: 'Abril', val: '0,23%', st: 'OK' },
  { num: '05', short: 'MAI', nome: 'Maio', val: '0,56%', st: 'OK' },
  { num: '06', short: 'JUN (Crit.)', nome: 'Junho', val: '0,56%', st: 'OK', isCritical: true },
  { num: '07', short: 'JUL', nome: 'Julho', val: '0,69%', st: 'OK' },
  { num: '08', short: 'AGO', nome: 'Agosto', val: '-', st: 'PENDENTE' },
  { num: '09', short: 'SET', nome: 'Setembro', val: '-', st: 'PENDENTE' },
  { num: '10', short: 'OUT', nome: 'Outubro', val: '-', st: 'PENDENTE' },
  { num: '11', short: 'NOV', nome: 'Novembro', val: '-', st: 'PENDENTE' },
  { num: '12', short: 'DEZ (Crit.)', nome: 'Dezembro', val: '-', st: 'PENDENTE', isCritical: true },
];

function parseVolNumber(valStr: string): number {
  if (!valStr || valStr === '-' || valStr.trim() === '') return 0;
  const clean = valStr.replace(/[^\d,. -]/g, '').replace(/\./g, '').replace(',', '.').trim();
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

function formatVolNumber(num: number): string {
  if (num <= 0) return '-';
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
import { 
  JornadaRecord, 
  WlpMonthlyConfig, 
  getStoredJornadas, 
  saveJornadaRecord, 
  deleteJornadaRecord, 
  getWlpConfig, 
  saveWlpConfig, 
  calculateWlpMetrics,
  saveMultipleJornadas,
  WlpDailyFaturadoRecord,
  getStoredDailyFaturado,
  saveDailyFaturadoRecord,
  deleteDailyFaturadoRecord,
  detectWlpDesvios,
  WlpDesvioItem,
  exportWlpModelExcel,
  importWlpExcelData,
  parseWlpExcelFile,
  commitWlpImport,
  downloadWlpSampleJson,
  getStoredMontagens,
  isColaboradorExcluidoWlp,
  clearAllWlpData,
  clearWlpMonthData,
  calcularDuracaoHorasComIntervalo,
  normalizeMesAnoStr
} from '../utils/jornadaUtils';
import { normalizeCollaboratorName, getCollaboratorOfficialInfo } from '../utils/colaboradorUtils';
import { LISTA_COLABORADORES_OFICIAIS } from './RankingModule';
import { getMetaOficialMes, getMetaOficialPnp, getHeadcountEsperado } from '../data/wlpRetroactiveData';

export const ALL_MONTHS_NAV = [
  { num: '01', short: 'JAN', name: 'Janeiro', vol2025: 13491.3, vol2026: 16336.4, abs2026: '1,17%', absStatus: 'OK' },
  { num: '02', short: 'FEV', name: 'Fevereiro', vol2025: 11676.1, vol2026: 12486.1, abs2026: '0,00%', absStatus: 'NOK' },
  { num: '03', short: 'MAR', name: 'Março', isCritical: true, criticalTag: 'PICO (+2h HE)', vol2025: 10023.7, vol2026: 13813.4, abs2026: '2,38%', absStatus: 'OK' },
  { num: '04', short: 'ABR', name: 'Abril', vol2025: 11426.4, vol2026: 12981.1, abs2026: '0,23%', absStatus: 'OK' },
  { num: '05', short: 'MAI', name: 'Maio', vol2025: 12501.8, vol2026: 12447.2, abs2026: '0,56%', absStatus: 'OK' },
  { num: '06', short: 'JUN', name: 'Junho', isCritical: true, criticalTag: 'PICO (+2h HE)', vol2025: 13697.8, vol2026: 16686.6, abs2026: '0,56%', absStatus: 'OK' },
  { num: '07', short: 'JUL', name: 'Julho', vol2025: 10923.4, vol2026: 13626.8, abs2026: '0,69%', absStatus: 'OK' },
  { num: '08', short: 'AGO', name: 'Agosto', vol2025: 9272.7, vol2026: 5118.7, abs2026: '-', absStatus: 'PENDENTE' },
  { num: '09', short: 'SET', name: 'Setembro', vol2025: 11211.3, vol2026: 0, abs2026: '-', absStatus: 'PENDENTE' },
  { num: '10', short: 'OUT', name: 'Outubro', vol2024: 10040.2, vol2025: 11802.8, vol2026: 0, abs2026: '-', absStatus: 'PENDENTE' },
  { num: '11', short: 'NOV', name: 'Novembro', vol2024: 12553.6, vol2025: 12774.3, vol2026: 0, abs2026: '-', absStatus: 'PENDENTE' },
  { num: '12', short: 'DEZ', name: 'Dezembro', isCritical: true, criticalTag: 'PICO (+2h HE)', vol2024: 16231.5, vol2025: 21469.2, vol2026: 0, abs2026: '-', absStatus: 'PENDENTE' }
];

interface WlpDashboardProps {
  user: any;
  empresaId?: string;
}

export const WlpDashboard: React.FC<WlpDashboardProps> = ({
  user,
  empresaId = 'demo'
}) => {
  const [selectedMesAno, setSelectedMesAno] = useState<string>('08/2026');
  const [activeSubTab, setActiveSubTab] = useState<'indicador' | 'historico_diario' | 'desvios_dpo' | 'pontos_jornada' | 'presentes_dia' | 'pnp_ajudante' | 'pnp_empilhador' | 'pnp_conferente'>('indicador');

  // Filtro Entre Dias (Intervalo de Datas)
  const [filterMode, setFilterMode] = useState<'MES' | 'INTERVALO'>('MES');
  const [startDateISO, setStartDateISO] = useState<string>('2026-08-01');
  const [endDateISO, setEndDateISO] = useState<string>('2026-08-31');

  // Estado para a Guia: Colaboradores Presentes no Dia
  const [selectedDayPresenceISO, setSelectedDayPresenceISO] = useState<string>(new Date().toISOString().split('T')[0]);
  const [presenceSearchTerm, setPresenceSearchTerm] = useState<string>('');
  const [presenceCargoFilter, setPresenceCargoFilter] = useState<string>('TODOS');
  const [presenceStatusFilter, setPresenceStatusFilter] = useState<'TODOS' | 'PRESENTES' | 'AUSENTES'>('TODOS');

  // Modal rápido de marcação de presença
  const [showQuickMarkModal, setShowQuickMarkModal] = useState<boolean>(false);
  const [quickMarkColabName, setQuickMarkColabName] = useState<string>('');
  const [quickMarkColabCargo, setQuickMarkColabCargo] = useState<'Ajudante' | 'Empilhador' | 'Conferente' | 'Operacional'>('Ajudante');
  const [quickMarkStart, setQuickMarkStart] = useState<string>('07:00');
  const [quickMarkEnd, setQuickMarkEnd] = useState<string>('16:20');

  // Load WLP Config
  const [config, setConfig] = useState<WlpMonthlyConfig>(() => getWlpConfig(empresaId, selectedMesAno));

  // Load Journeys & Daily Faturados
  const [jornadas, setJornadas] = useState<JornadaRecord[]>(() => getStoredJornadas(empresaId));
  const [dailyFaturados, setDailyFaturados] = useState<WlpDailyFaturadoRecord[]>(() => getStoredDailyFaturado(empresaId));

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showFaturadoModal, setShowFaturadoModal] = useState(false);
  const [dismiss21hAlert, setDismiss21hAlert] = useState(false);

  // Daily Faturado Form state
  const [faturadoDataISO, setFaturadoDataISO] = useState<string>(new Date().toISOString().split('T')[0]);
  const [faturadoHLInput, setFaturadoHLInput] = useState<number>(650.0);

  // New Journey Form
  const [colabNome, setColabNome] = useState('');
  const [cargoColab, setCargoColab] = useState<'Ajudante' | 'Empilhador' | 'Conferente' | 'Operacional'>('Ajudante');
  const [dataPontoISO, setDataPontoISO] = useState<string>(new Date().toISOString().split('T')[0]);
  const [horaInicio, setHoraInicio] = useState('07:00');
  const [horaFim, setHoraFim] = useState('16:20');
  const [obsPonto, setObsPonto] = useState('');

  // Deviation filter state: 'TODOS' | 'DESVIOS_APENAS' | 'DENTRO_META'
  const [desvioFilter, setDesvioFilter] = useState<'TODOS' | 'DESVIOS_APENAS' | 'DENTRO_META'>('TODOS');
  const [selectedDesvioDateISO, setSelectedDesvioDateISO] = useState<string>('TODAS');

  React.useEffect(() => {
    setSelectedDesvioDateISO('TODAS');
  }, [selectedMesAno, filterMode, startDateISO, endDateISO]);

  // Historical Volume Comparative Table State & Handlers
  const [historicalVolumes, setHistoricalVolumes] = useState<HistoricalVolumeRowItem[]>(() => {
    try {
      const saved = localStorage.getItem(`wlp_historico_volumes_${empresaId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 12) {
          return parsed;
        }
      }
    } catch (e) {}
    return DEFAULT_HISTORICAL_VOLUMES;
  });

  const [isEditingHistorical, setIsEditingHistorical] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.setItem(`wlp_historico_volumes_${empresaId}`, JSON.stringify(historicalVolumes));
    } catch (e) {}
  }, [historicalVolumes, empresaId]);

  const calculatedHistoricalRows = React.useMemo(() => {
    return historicalVolumes.map(row => {
      const n24 = parseVolNumber(row.v24);
      const n25 = parseVolNumber(row.v25);
      const n26 = parseVolNumber(row.v26);

      let varStr = '-';
      if (n25 > 0 && n26 > 0) {
        const pct = ((n26 - n25) / n25) * 100;
        varStr = `${pct >= 0 ? '+' : ''}${pct.toFixed(1).replace('.', ',')}%`;
      }

      return {
        ...row,
        n24,
        n25,
        n26,
        varStr
      };
    });
  }, [historicalVolumes]);

  const totalsHistorical = React.useMemo(() => {
    let sum24 = 0;
    let sum25 = 0;
    let sum26 = 0;

    calculatedHistoricalRows.forEach(r => {
      sum24 += r.n24;
      sum25 += r.n25;
      sum26 += r.n26;
    });

    let varTotalStr = '-';
    if (sum25 > 0 && sum26 > 0) {
      const pct = ((sum26 - sum25) / sum25) * 100;
      varTotalStr = `${pct >= 0 ? '+' : ''}${pct.toFixed(1).replace('.', ',')}% md`;
    }

    return {
      sum24,
      sum25,
      sum26,
      varTotalStr,
      formatted24: sum24 > 0 ? formatVolNumber(sum24) + ' HL' : '-',
      formatted25: sum25 > 0 ? formatVolNumber(sum25) + ' HL' : '-',
      formatted26: sum26 > 0 ? formatVolNumber(sum26) + ' HL' : '-',
    };
  }, [calculatedHistoricalRows]);

  const handleHistoricalCellChange = (index: number, field: 'v24' | 'v25' | 'v26', value: string) => {
    setHistoricalVolumes(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleHistoricalCritToggle = (index: number) => {
    setHistoricalVolumes(prev => {
      const next = [...prev];
      next[index] = { ...next[index], crit: !next[index].crit };
      return next;
    });
  };

  const handleHistoricalParcialToggle = (index: number) => {
    setHistoricalVolumes(prev => {
      const next = [...prev];
      next[index] = { ...next[index], isParcial26: !next[index].isParcial26 };
      return next;
    });
  };

  const handleResetHistorical = () => {
    if (window.confirm('Deseja restaurar os valores padrão da tabela de histórico comparativo de volume?')) {
      setHistoricalVolumes(DEFAULT_HISTORICAL_VOLUMES);
    }
  };

  // Absenteeism 2026 Management (Editable Month-by-Month)
  const [absenteeismList, setAbsenteeismList] = useState<AbsenteeismMonthItem[]>(() => {
    try {
      const saved = localStorage.getItem(`wlp_absenteismo_2026_${empresaId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 12) {
          return parsed;
        }
      }
    } catch (e) {}
    return DEFAULT_ABSENTEEISM_2026;
  });

  const [responsavelAbsenteismo, setResponsavelAbsenteismo] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(`wlp_absenteismo_resp_${empresaId}`);
      if (saved && saved.trim()) return saved.trim();
    } catch (e) {}
    return 'ISRAELY';
  });

  const [isEditingAbsenteeism, setIsEditingAbsenteeism] = useState<boolean>(false);
  const [quickEditMonthIdx, setQuickEditMonthIdx] = useState<number | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(`wlp_absenteismo_2026_${empresaId}`, JSON.stringify(absenteeismList));
      localStorage.setItem(`wlp_absenteismo_resp_${empresaId}`, responsavelAbsenteismo);
    } catch (e) {}
  }, [absenteeismList, responsavelAbsenteismo, empresaId]);

  const calculatedAbsenteeismSummary = React.useMemo(() => {
    let sumPct = 0;
    let count = 0;
    let hasNok = false;

    absenteeismList.forEach(item => {
      if (item.val && item.val !== '-' && item.val.trim() !== '' && item.st !== 'PENDENTE') {
        const clean = item.val.replace(/[^\d,. -]/g, '').replace(/\./g, '').replace(',', '.').trim();
        const num = parseFloat(clean);
        if (!isNaN(num)) {
          sumPct += num;
          count += 1;
        }
        if (item.st === 'NOK') hasNok = true;
      }
    });

    const avgPct = count > 0 ? (sumPct / count) : 0.80;
    const avgFormatted = avgPct.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
    const statusOverall = (avgPct <= 2.5 && !hasNok) ? 'OK' : (avgPct <= 2.5 ? 'OK' : 'NOK');

    return {
      count,
      avgPct,
      avgFormatted,
      statusOverall
    };
  }, [absenteeismList]);

  const handleAbsenteeismCellChange = (index: number, field: 'val' | 'st' | 'observacao', value: string) => {
    setAbsenteeismList(prev => {
      const next = [...prev];
      let formattedVal = value;
      let newSt: 'OK' | 'NOK' | 'PENDENTE' = next[index].st;

      if (field === 'val') {
        formattedVal = value;
        if (value.trim() === '-' || value.trim() === '') {
          newSt = 'PENDENTE';
        } else {
          // If valid number, check if > 3.0% for NOK or OK
          const num = parseFloat(value.replace(/[^\d,. -]/g, '').replace(/\./g, '').replace(',', '.').trim());
          if (!isNaN(num) && next[index].st === 'PENDENTE') {
            newSt = num <= 2.5 ? 'OK' : 'NOK';
          }
        }
        next[index] = { ...next[index], val: formattedVal, st: newSt };
      } else if (field === 'st') {
        next[index] = { ...next[index], st: value as 'OK' | 'NOK' | 'PENDENTE' };
      } else if (field === 'observacao') {
        next[index] = { ...next[index], observacao: value };
      }
      return next;
    });
  };

  const handleResetAbsenteeism = () => {
    if (window.confirm('Deseja restaurar os dados padrão de absenteísmo para todos os meses de 2026?')) {
      setAbsenteeismList(DEFAULT_ABSENTEEISM_2026);
      setResponsavelAbsenteismo('ISRAELY');
    }
  };

  const handleSaveAbsenteeism = () => {
    try {
      localStorage.setItem(`wlp_absenteismo_2026_${empresaId}`, JSON.stringify(absenteeismList));
      localStorage.setItem(`wlp_absenteismo_resp_${empresaId}`, responsavelAbsenteismo);
      setIsEditingAbsenteeism(false);
      setQuickEditMonthIdx(null);
      window.dispatchEvent(new CustomEvent('wlp_absenteismo_updated'));
      alert('✅ Dados de absenteísmo e fechamento mensal salvos com sucesso!');
    } catch (e) {
      alert('Erro ao salvar absenteísmo.');
    }
  };
  const [isImportingFile, setIsImportingFile] = useState(false);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);

  // File Refs
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const monthJsonInputRef = useRef<HTMLInputElement>(null);
  const monthExcelInputRef = useRef<HTMLInputElement>(null);

  // Month-specific import paste state
  const [showMonthPasteArea, setShowMonthPasteArea] = useState<boolean>(false);
  const [monthTextPaste, setMonthTextPaste] = useState<string>('');

  // CSV Import text
  const [csvRawInput, setCsvRawInput] = useState('');

  // Handlers for month-specific file import
  const handleMonthJsonUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImportingFile(true);
    setImportFeedback(null);
    try {
      const parsed = await parseWlpExcelFile(file, empresaId);
      if (!parsed.success || (parsed.rows.length === 0 && parsed.pendencias.length === 0)) {
        throw new Error(parsed.validationError || 'Falha ao processar arquivo JSON do mês.');
      }
      const result = commitWlpImport(parsed, empresaId, true);
      
      const targetMonth = (parsed.rows.length > 0) ? (normalizeMesAnoStr(parsed.rows[0].mesAno, parsed.rows[0].dataISO) || selectedMesAno) : selectedMesAno;
      setSelectedMesAno(targetMonth);

      setJornadas(getStoredJornadas(empresaId));
      setDailyFaturados(getStoredDailyFaturado(empresaId));
      
      const monthParts = targetMonth.split('/');
      const monthName = ALL_MONTHS_NAV.find(m => m.num === monthParts[0])?.name || targetMonth;
      setImportFeedback(`✅ Importação de ${monthName} (${targetMonth}) concluída! ${result.importedCount} pontos e ${parsed.rendimentoPorDia.length} registros salvos.`);
      alert(`✅ Sucesso! Dados do mês de ${monthName} (${targetMonth}) foram atualizados com ${result.importedCount} pontos de jornada e ${parsed.rendimentoPorDia.length} dias de faturamento.`);
    } catch (err: any) {
      alert(`⚠️ Erro ao importar JSON para o mês de ${selectedMesAno}: ${err?.message || err}`);
    } finally {
      setIsImportingFile(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleMonthExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImportingFile(true);
    setImportFeedback(null);
    try {
      const parsed = await parseWlpExcelFile(file, empresaId);
      if (!parsed.success || (parsed.rows.length === 0 && parsed.pendencias.length === 0)) {
        throw new Error(parsed.validationError || 'Falha ao processar planilha Excel/CSV do mês.');
      }
      const result = commitWlpImport(parsed, empresaId, true);
      
      const targetMonth = (parsed.rows.length > 0) ? (normalizeMesAnoStr(parsed.rows[0].mesAno, parsed.rows[0].dataISO) || selectedMesAno) : selectedMesAno;
      setSelectedMesAno(targetMonth);

      setJornadas(getStoredJornadas(empresaId));
      setDailyFaturados(getStoredDailyFaturado(empresaId));
      
      const monthParts = targetMonth.split('/');
      const monthName = ALL_MONTHS_NAV.find(m => m.num === monthParts[0])?.name || targetMonth;
      setImportFeedback(`✅ Planilha de ${monthName} (${targetMonth}) importada com sucesso! ${result.importedCount} pontos salvos.`);
      alert(`✅ Sucesso! Dados do mês de ${monthName} (${targetMonth}) foram atualizados com ${result.importedCount} pontos de jornada e ${parsed.rendimentoPorDia.length} dias de faturamento.`);
    } catch (err: any) {
      alert(`⚠️ Erro ao importar planilha para o mês de ${selectedMesAno}: ${err?.message || err}`);
    } finally {
      setIsImportingFile(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleProcessMonthTextPaste = async () => {
    if (!monthTextPaste.trim()) {
      alert('Cole o conteúdo JSON ou linhas CSV antes de processar.');
      return;
    }
    setIsImportingFile(true);
    setImportFeedback(null);
    try {
      let rawStr = monthTextPaste.trim()
        .replace(/:\s*NaN\b/g, ': null')
        .replace(/:\s*Infinity\b/g, ': null')
        .replace(/:\s*-Infinity\b/g, ': null');
      let parsedObjects: any[] = [];
      if (rawStr.startsWith('[') || rawStr.startsWith('{')) {
        const obj = JSON.parse(rawStr);
        if (Array.isArray(obj)) {
          parsedObjects = obj;
        } else if (obj && typeof obj === 'object') {
          const arrayKey = Object.keys(obj).find(k => Array.isArray((obj as any)[k]));
          if (arrayKey) {
            parsedObjects = (obj as any)[arrayKey];
          } else {
            parsedObjects = [obj];
          }
        }
      } else {
        const lines = rawStr.split('\n').filter(l => l.trim().length > 0);
        const headers = lines[0].split(/[,;\t]/).map(h => h.trim());
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(/[,;\t]/).map(c => c.trim());
          if (cols.length > 1) {
            const rowObj: any = {};
            headers.forEach((h, idx) => { rowObj[h] = cols[idx] || ''; });
            parsedObjects.push(rowObj);
          }
        }
      }

      if (parsedObjects.length === 0) {
        throw new Error('Nenhum registro válido identificado no texto informado.');
      }

      const blob = new Blob([JSON.stringify(parsedObjects, null, 2)], { type: 'application/json' });
      const mockFile = new File([blob], `import_${selectedMesAno.replace('/', '_')}.json`, { type: 'application/json' });
      const parsed = await parseWlpExcelFile(mockFile, empresaId);
      
      if (!parsed.success || parsed.rows.length === 0) {
        throw new Error(parsed.validationError || 'Não foi possível interpretar o formato informado.');
      }

      const result = commitWlpImport(parsed, empresaId, true);
      
      const targetMonth = (parsed.rows.length > 0) ? (normalizeMesAnoStr(parsed.rows[0].mesAno, parsed.rows[0].dataISO) || selectedMesAno) : selectedMesAno;
      setSelectedMesAno(targetMonth);

      setJornadas(getStoredJornadas(empresaId));
      setDailyFaturados(getStoredDailyFaturado(empresaId));
      setMonthTextPaste('');
      setShowMonthPasteArea(false);
      const monthParts = targetMonth.split('/');
      const monthName = ALL_MONTHS_NAV.find(m => m.num === monthParts[0])?.name || targetMonth;
      setImportFeedback(`✅ Importação de ${monthName} (${targetMonth}) concluída! ${result.importedCount} pontos salvos.`);
      alert(`✅ Dados importados com sucesso para ${monthName} (${targetMonth})! ${result.importedCount} registros salvos.`);
    } catch (err: any) {
      alert(`⚠️ Erro ao importar texto: ${err?.message || err}`);
    } finally {
      setIsImportingFile(false);
    }
  };

  // Retroactive Day Edit State
  const [editingDateISO, setEditingDateISO] = useState<string | null>(null);
  const [editVolumeHL, setEditVolumeHL] = useState<number>(0);
  const [editHoraInicio, setEditHoraInicio] = useState<string>('07:00');
  const [editHoraFim, setEditHoraFim] = useState<string>('16:20');
  const [editSelectedColabs, setEditSelectedColabs] = useState<string[]>([]);

  const calcShiftHours = (start: string, end: string): number => {
    return calcularDuracaoHorasComIntervalo(start, end);
  };

  const handleStartEditDay = (dataISO: string, volumeHL: number, dayJourneys: JornadaRecord[]) => {
    setEditingDateISO(dataISO);
    setEditVolumeHL(volumeHL);
    if (dayJourneys.length > 0) {
      setEditHoraInicio(dayJourneys[0].horaInicio);
      setEditHoraFim(dayJourneys[0].horaFim);
      setEditSelectedColabs(dayJourneys.map(j => j.colaboradorNome));
    } else {
      setEditHoraInicio('07:00');
      setEditHoraFim('16:20');
      setEditSelectedColabs(LISTA_COLABORADORES_OFICIAIS.slice(0, 7).map(c => c.nome));
    }
  };

  const handleToggleColabInEdit = (nome: string) => {
    setEditSelectedColabs(prev => 
      prev.includes(nome) ? prev.filter(n => n !== nome) : [...prev, nome]
    );
  };

  const handleSaveDayEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDateISO) return;

    const parts = editingDateISO.split('-');
    const dataStr = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : editingDateISO;
    const mesAno = parts.length === 3 ? `${parts[1]}/${parts[0]}` : selectedMesAno;

    // 1. Update Daily Faturado
    saveDailyFaturadoRecord({
      id: `fat-${editingDateISO}`,
      dataISO: editingDateISO,
      dataStr,
      mesAno,
      volumeHL: editVolumeHL,
      empresaId,
      registradoPor: `${user?.nome || 'Admin'} (Editado via Workstation)`,
      registradoEm: new Date().toISOString(),
      origem: 'MANUAL'
    });

    // 2. Save journeys
    const durHrs = calcShiftHours(editHoraInicio, editHoraFim);
    const otherJourneys = jornadas.filter(j => j.dataISO !== editingDateISO);

    const newJornadasForDay: JornadaRecord[] = editSelectedColabs.map((colabNome, idx) => {
      const colabObj = LISTA_COLABORADORES_OFICIAIS.find(c => c.nome === colabNome);
      return {
        id: `jrn-edit-${editingDateISO}-${idx}-${Date.now()}`,
        colaboradorNome: colabNome,
        cargo: colabObj?.cargo || 'Ajudante',
        dataStr,
        dataISO: editingDateISO,
        mesAno,
        horaInicio: editHoraInicio,
        horaFim: editHoraFim,
        duracaoHoras: durHrs,
        empresaId,
        observacoes: `Pontos e horário editados via Histórico WLP`,
        criadoEm: new Date().toISOString()
      };
    });

    const updated = [...otherJourneys, ...newJornadasForDay];
    localStorage.setItem(`jornadas_colaboradores_${empresaId}`, JSON.stringify(updated));

    setJornadas(getStoredJornadas(empresaId));
    setDailyFaturados(getStoredDailyFaturado(empresaId));
    setEditingDateISO(null);

    window.dispatchEvent(new CustomEvent('jornadas_updated'));
    window.dispatchEvent(new CustomEvent('wlp_faturado_updated'));
    window.dispatchEvent(new CustomEvent('local_data_changed'));

    alert(`✅ Registro do dia ${dataStr} editado com sucesso! O WLP do dia e o acumulado do mês foram atualizados.`);
  };

  const handleExcelFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImportingFile(true);
    setImportFeedback(null);

    try {
      const parsed = await parseWlpExcelFile(file, empresaId);
      if (!parsed.success || (parsed.rows.length === 0 && parsed.pendencias.length === 0)) {
        throw new Error(parsed.validationError || 'Falha ao processar arquivo.');
      }
      const result = commitWlpImport(parsed, empresaId, true);
      setImportFeedback(`✅ Importação concluída! ${result.importedCount} pontos de jornada e ${parsed.rendimentoPorDia.length} registros de volume salvos e atualizados.`);

      if (parsed.rows.length > 0) {
        const norm = normalizeMesAnoStr(parsed.rows[0].mesAno, parsed.rows[0].dataISO);
        if (norm) setSelectedMesAno(norm);
      }

      setJornadas(getStoredJornadas(empresaId));
      setDailyFaturados(getStoredDailyFaturado(empresaId));
    } catch (err: any) {
      alert(`Erro na importação da planilha Excel: ${err.message || err}`);
      setImportFeedback(`❌ Falha ao importar: ${err.message || err}`);
    } finally {
      setIsImportingFile(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleJsonFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImportingFile(true);
    setImportFeedback(null);

    try {
      const parsed = await parseWlpExcelFile(file, empresaId);
      if (!parsed.success || (parsed.rows.length === 0 && parsed.pendencias.length === 0)) {
        throw new Error(parsed.validationError || 'Falha ao processar arquivo JSON.');
      }

      const result = commitWlpImport(parsed, empresaId, true);

      const importedMonths = Array.from(new Set(parsed.rows.map(r => normalizeMesAnoStr(r.mesAno, r.dataISO)).filter(Boolean)));
      let periodMsg = 'Janeiro até o último registro';
      if (importedMonths.length > 0) {
        const sortedAsc = [...importedMonths].sort((a, b) => {
          const [ma, ya] = a.split('/').map(Number);
          const [mb, yb] = b.split('/').map(Number);
          if (ya !== yb) return ya - yb;
          return ma - mb;
        });
        const firstM = sortedAsc[0];
        const lastM = sortedAsc[sortedAsc.length - 1];
        periodMsg = `${firstM} até ${lastM}`;
        setSelectedMesAno(lastM);
      }

      setJornadas(getStoredJornadas(empresaId));
      setDailyFaturados(getStoredDailyFaturado(empresaId));

      setImportFeedback(`✅ Importação JSON concluída! ${result.importedCount} pontos de jornada reescritos (${periodMsg}).`);
      alert(`✅ Arquivo JSON Importado com Sucesso!\n\n• Pontos de Jornada Processados: ${result.importedCount}\n• Faturamentos Diários (HL): ${parsed.rendimentoPorDia.length}\n• Período Atualizado: ${periodMsg}\n• Cargos Reescritos & Sincronizados (Ajudante, Empilhador, Conferente)\n\nOs indicadores de ${periodMsg} foram 100% atualizados no código/armazenamento da plataforma.`);
    } catch (err: any) {
      alert(`Erro na importação do arquivo JSON: ${err.message || err}`);
      setImportFeedback(`❌ Falha ao importar JSON: ${err.message || err}`);
    } finally {
      setIsImportingFile(false);
      if (e.target) e.target.value = '';
    }
  };

  // Helper to normalize MM/YYYY with optional dataISO fallback
  const normalizeMesAnoStr = (str?: string, dataISO?: string) => {
    let clean = (str || '').trim();
    if (!clean && dataISO) {
      const parts = dataISO.split('-');
      if (parts.length >= 2) {
        clean = `${parts[1]}/${parts[0]}`;
      }
    }
    if (!clean) return '';
    if (clean.includes('/')) {
      const parts = clean.split('/');
      if (parts.length === 2) {
        return `${parts[0].padStart(2, '0')}/${parts[1].length === 2 ? `20${parts[1]}` : parts[1]}`;
      }
    } else if (clean.includes('-')) {
      const parts = clean.split('-');
      if (parts.length === 2) {
        if (parts[0].length === 4) {
          return `${parts[1].padStart(2, '0')}/${parts[0]}`;
        } else {
          return `${parts[0].padStart(2, '0')}/${parts[1].length === 2 ? `20${parts[1]}` : parts[1]}`;
        }
      }
    }
    return clean;
  };

  // Build dynamic list of months available
  const availableMonths = React.useMemo(() => {
    const monthsSet = new Set<string>();
    for (let m = 1; m <= 12; m++) {
      monthsSet.add(`${String(m).padStart(2, '0')}/2026`);
    }
    jornadas.forEach(j => { if (j.mesAno || j.dataISO) monthsSet.add(normalizeMesAnoStr(j.mesAno, j.dataISO)); });
    dailyFaturados.forEach(f => { if (f.mesAno || f.dataISO) monthsSet.add(normalizeMesAnoStr(f.mesAno, f.dataISO)); });

    return Array.from(monthsSet).sort((a, b) => {
      const [ma, ya] = a.split('/').map(Number);
      const [mb, yb] = b.split('/').map(Number);
      if (ya !== yb) return (yb || 0) - (ya || 0);
      return (mb || 0) - (ma || 0);
    });
  }, [jornadas, dailyFaturados]);

  // Reload config and update default date range when month changes
  useEffect(() => {
    setConfig(getWlpConfig(empresaId, selectedMesAno));
    if (selectedMesAno) {
      const parts = selectedMesAno.split('/');
      if (parts.length === 2) {
        const mm = parts[0];
        const yyyy = parts[1];
        const lastDay = new Date(Number(yyyy), Number(mm), 0).getDate();
        setStartDateISO(`${yyyy}-${mm.padStart(2, '0')}-01`);
        setEndDateISO(`${yyyy}-${mm.padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`);
      }
    }
  }, [empresaId, selectedMesAno]);

  // Listen for storage / jornada updates
  useEffect(() => {
    const handleUpdate = () => {
      setJornadas(getStoredJornadas(empresaId));
      setDailyFaturados(getStoredDailyFaturado(empresaId));
    };

    window.addEventListener('jornadas_updated', handleUpdate);
    window.addEventListener('wlp_faturado_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('jornadas_updated', handleUpdate);
      window.removeEventListener('wlp_faturado_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [empresaId]);

  // Save monthly configuration change
  const handleSaveConfig = () => {
    saveWlpConfig(config);
    alert('✅ Parâmetros de WLP salvos com sucesso!');
  };

  // Filter journeys by selected month OR by date interval (entre dias)
  const journeysInMonth = React.useMemo(() => {
    if (filterMode === 'INTERVALO' && startDateISO && endDateISO) {
      return jornadas.filter(j => j.dataISO >= startDateISO && j.dataISO <= endDateISO);
    }
    const normSel = normalizeMesAnoStr(selectedMesAno);
    return jornadas.filter(j => normalizeMesAnoStr(j.mesAno, j.dataISO) === normSel);
  }, [jornadas, filterMode, startDateISO, endDateISO, selectedMesAno]);

  // Filter daily faturados by selected month OR by date interval
  const activeDailyFaturados = React.useMemo(() => {
    if (filterMode === 'INTERVALO' && startDateISO && endDateISO) {
      return dailyFaturados.filter(f => f.dataISO >= startDateISO && f.dataISO <= endDateISO);
    }
    const normSel = normalizeMesAnoStr(selectedMesAno);
    return dailyFaturados.filter(f => normalizeMesAnoStr(f.mesAno, f.dataISO) === normSel);
  }, [dailyFaturados, filterMode, startDateISO, endDateISO, selectedMesAno]);

  // Compute dynamic configuration derived automatically from imported data and official targets
  const mesNum = parseInt(selectedMesAno.split('/')[0], 10) || 8;
  const metaOficial = getMetaOficialMes(mesNum);

  const dynamicConfig = React.useMemo(() => {
    const volSum = activeDailyFaturados.reduce((acc, curr) => acc + (curr.volumeHL || 0), 0);
    const datesSet = new Set([
      ...activeDailyFaturados.map(f => f.dataISO),
      ...journeysInMonth.map(j => j.dataISO)
    ]);
    const validColabNames = new Set(
      journeysInMonth
        .filter(j => !isColaboradorExcluidoWlp(j.colaboradorNome, mesNum, j.cargo).excluido)
        .map(j => normalizeCollaboratorName(j.colaboradorNome))
    );

    return {
      empresaId,
      mesAno: selectedMesAno,
      volumeFaturadoHL: volSum,
      diasUteisTrabalhados: datesSet.size,
      quadroPessoalTTQLP: validColabNames.size,
      horasTurnoPadrao: 7.33,
      metaWlp: metaOficial,
    };
  }, [activeDailyFaturados, journeysInMonth, empresaId, selectedMesAno, mesNum, metaOficial]);

  const hasDataForPeriod = journeysInMonth.length > 0 || activeDailyFaturados.length > 0;

  // Calculate metrics using dynamicConfig
  const metrics = calculateWlpMetrics(journeysInMonth, dynamicConfig);

  // ACUMULADO DO ANO 2026 — INDICADOR DE PERFORMANCE DPO YTD
  const ytdMetrics2026 = React.useMemo(() => {
    const fat2026 = dailyFaturados.filter(f => {
      if (f.dataISO && f.dataISO.startsWith('2026')) return true;
      if (f.mesAno && f.mesAno.endsWith('2026')) return true;
      return false;
    });
    const vol2026Sum = fat2026.reduce((acc, f) => acc + (f.volumeHL || 0), 0);

    const jrn2026 = jornadas.filter(j => {
      if (j.dataISO && j.dataISO.startsWith('2026')) return true;
      if (j.mesAno && j.mesAno.endsWith('2026')) return true;
      return false;
    });

    const totalHH2026 = jrn2026.reduce((acc, j) => acc + (j.duracaoHoras || 0), 0);

    const monthsSet = new Set<string>();
    fat2026.forEach(f => {
      const norm = normalizeMesAnoStr(f.mesAno, f.dataISO);
      if (norm) monthsSet.add(norm);
    });
    jrn2026.forEach(j => {
      const norm = normalizeMesAnoStr(j.mesAno, j.dataISO);
      if (norm) monthsSet.add(norm);
    });

    const volumeTotalHL = vol2026Sum > 0 ? vol2026Sum : 103496.3;
    const totalHH = totalHH2026 > 0 ? totalHH2026 : Math.round(103496.3 / 6.93);
    const realWlp = totalHH > 0 ? volumeTotalHL / totalHH : 6.93;
    const metaWlp = 5.00;
    const atingimentoPct = metaWlp > 0 ? (realWlp / metaWlp) * 100 : 0;
    const deltaVsMeta = realWlp - metaWlp;

    return {
      volumeTotalHL,
      totalHH,
      realWlp,
      metaWlp,
      atingimentoPct,
      deltaVsMeta,
      monthsCount: Math.max(monthsSet.size, 7),
      totalJourneys2026: jrn2026.length,
      isRealImportedData: vol2026Sum > 0 || totalHH2026 > 0
    };
  }, [dailyFaturados, jornadas]);

  // Datas operacionais disponíveis no mês/período
  const availableDesvioDates = React.useMemo(() => {
    const set = new Set<string>();
    journeysInMonth.forEach(j => { if (j.dataISO) set.add(j.dataISO); });
    activeDailyFaturados.forEach(f => { if (f.dataISO) set.add(f.dataISO); });
    return Array.from(set).sort();
  }, [journeysInMonth, activeDailyFaturados]);

  // Jornadas e Faturados filtrados pelo dia específico selecionado (ou TODAS as datas)
  const effectiveJourneysForDesvios = React.useMemo(() => {
    if (selectedDesvioDateISO === 'TODAS') return journeysInMonth;
    return journeysInMonth.filter(j => j.dataISO === selectedDesvioDateISO);
  }, [journeysInMonth, selectedDesvioDateISO]);

  const effectiveFaturadosForDesvios = React.useMemo(() => {
    if (selectedDesvioDateISO === 'TODAS') return activeDailyFaturados;
    return activeDailyFaturados.filter(f => f.dataISO === selectedDesvioDateISO);
  }, [activeDailyFaturados, selectedDesvioDateISO]);

  // Desvios base do período/dia selecionado
  const baseDesviosDpo = React.useMemo(() => {
    return detectWlpDesvios(effectiveJourneysForDesvios, effectiveFaturadosForDesvios, metaOficial, 450.0, empresaId);
  }, [effectiveJourneysForDesvios, effectiveFaturadosForDesvios, metaOficial, empresaId]);

  // Alias para retrocompatibilidade
  const desviosDpo = baseDesviosDpo;

  // Média de Horas Trabalhadas por Dia por Função (Cargo)
  const horasPorCargoStats = React.useMemo(() => {
    const cargoMap = new Map<string, { totalHoras: number; daysSet: Set<string>; colabsSet: Set<string>; totalJornadas: number }>();

    journeysInMonth.forEach(j => {
      let cargo = (j.cargo || 'AJUDANTE').trim().toUpperCase();
      if (cargo.includes('AJUDANTE')) cargo = 'AJUDANTE';
      else if (cargo.includes('MOTORISTA')) cargo = 'MOTORISTA';
      else if (cargo.includes('EMPILHADOR')) cargo = 'EMPILHADOR';
      else if (cargo.includes('CONFERENTE')) cargo = 'CONFERENTE';
      else if (cargo.includes('OPERADOR') || cargo.includes('LIDER') || cargo.includes('LÍDER')) cargo = 'OPERADOR / LÍDER';

      const curr = cargoMap.get(cargo) || { totalHoras: 0, daysSet: new Set<string>(), colabsSet: new Set<string>(), totalJornadas: 0 };
      curr.totalHoras += (j.duracaoHoras || 0);
      if (j.dataISO) curr.daysSet.add(j.dataISO);
      if (j.colaboradorNome) curr.colabsSet.add(j.colaboradorNome);
      curr.totalJornadas += 1;
      cargoMap.set(cargo, curr);
    });

    const result: Array<{
      cargo: string;
      totalHoras: number;
      diasOperados: number;
      colabsCount: number;
      totalJornadas: number;
      mediaHorasPorDia: number;
      mediaHorasPorPessoaDia: number;
    }> = [];

    cargoMap.forEach((val, cargo) => {
      const diasOperados = val.daysSet.size || 1;
      const totalJornadas = val.totalJornadas || 1;
      result.push({
        cargo,
        totalHoras: val.totalHoras,
        diasOperados,
        colabsCount: val.colabsSet.size,
        totalJornadas,
        mediaHorasPorDia: parseFloat((val.totalHoras / diasOperados).toFixed(2)),
        mediaHorasPorPessoaDia: parseFloat((val.totalHoras / totalJornadas).toFixed(2)),
      });
    });

    result.sort((a, b) => b.totalHoras - a.totalHoras);
    return result;
  }, [journeysInMonth]);

  // Lista ativa de desvios aplicando o filtro de status (TODOS, APENAS DESVIOS, DENTRO DA META)
  const activeDesviosList = React.useMemo(() => {
    if (desvioFilter === 'DENTRO_META') {
      return [];
    }
    if (desvioFilter === 'DESVIOS_APENAS') {
      return baseDesviosDpo.filter(d => d.tipo !== 'WLP_ABAIXO_META_DPO');
    }
    return baseDesviosDpo;
  }, [baseDesviosDpo, desvioFilter]);

  // Métricas dinâmicas dos Cards no topo do Painel
  const displayTotalDesvios = desvioFilter === 'DENTRO_META' ? 0 : activeDesviosList.length;
  const displayHorasExtras = desvioFilter === 'DENTRO_META' ? 0 : activeDesviosList.filter(d => d.tipo === 'HORA_EXTRA_INDIVIDUAL' || d.tipo === 'HORA_EXTRA_VOLUME_BAIXO').length;
  const displayMontagensManha = desvioFilter === 'DENTRO_META' ? 0 : activeDesviosList.filter(d => d.tipo === 'MONTAGEM_ESTENDIDA_MANHA').length;

  const displayAderenciaDpo = React.useMemo(() => {
    if (desvioFilter === 'DENTRO_META') return '100%';
    if (effectiveJourneysForDesvios.length === 0) return '100%';
    if (activeDesviosList.length === 0) return '100%';
    const totalColabs = new Set(effectiveJourneysForDesvios.map(j => j.colaboradorNome)).size || 1;
    const desviosColabCount = new Set(activeDesviosList.map(d => d.colaboradorNome).filter(Boolean)).size || activeDesviosList.length;
    const pct = Math.max(0, Math.round(((totalColabs - desviosColabCount) / totalColabs) * 100));
    return `${pct}%`;
  }, [desvioFilter, effectiveJourneysForDesvios, activeDesviosList]);

  // Analytics chart 1: Collaborators with highest hours & overtime (> 7.33h) - responds to filters
  const colabOvertimeChartData = React.useMemo(() => {
    const map = new Map<string, { nome: string; horasPadrao: number; horasExtras: number; totalHoras: number }>();
    
    effectiveJourneysForDesvios.forEach(j => {
      const dur = j.duracaoHoras || 0;
      const padrao = Math.min(dur, 7.33);
      const extra = Math.max(0, dur - 7.33);

      if (desvioFilter === 'DESVIOS_APENAS' && extra <= 0) {
        return;
      }
      if (desvioFilter === 'DENTRO_META' && extra > 0) {
        return;
      }

      const nome = j.colaboradorNome || 'Outro';
      const cur = map.get(nome) || { nome, horasPadrao: 0, horasExtras: 0, totalHoras: 0 };

      if (desvioFilter === 'DENTRO_META') {
        cur.horasPadrao = parseFloat((cur.horasPadrao + dur).toFixed(2));
        cur.horasExtras = 0;
      } else {
        cur.horasPadrao = parseFloat((cur.horasPadrao + padrao).toFixed(2));
        cur.horasExtras = parseFloat((cur.horasExtras + extra).toFixed(2));
      }
      cur.totalHoras = parseFloat((cur.totalHoras + dur).toFixed(2));
      map.set(nome, cur);
    });

    return Array.from(map.values())
      .sort((a, b) => b.totalHoras - a.totalHoras)
      .slice(0, 10);
  }, [effectiveJourneysForDesvios, desvioFilter]);

  // Analytics chart 2: Deviation Category Distribution - responds to filters
  const desviosCatChartData = React.useMemo(() => {
    const cats: Record<string, number> = {
      'Horas Extras (> 7,33h)': 0,
      'HE Vol. Baixo (<450HL)': 0,
      'Montagem na Manhã': 0,
      'WLP Abaixo Meta': 0
    };

    if (desvioFilter !== 'DENTRO_META') {
      activeDesviosList.forEach(d => {
        if (d.tipo === 'HORA_EXTRA_INDIVIDUAL') cats['Horas Extras (> 7,33h)']++;
        else if (d.tipo === 'HORA_EXTRA_VOLUME_BAIXO') cats['HE Vol. Baixo (<450HL)']++;
        else if (d.tipo === 'MONTAGEM_ESTENDIDA_MANHA') cats['Montagem na Manhã']++;
        else if (d.tipo === 'WLP_ABAIXO_META_DPO') cats['WLP Abaixo Meta']++;
      });
    }

    return Object.entries(cats).map(([name, count]) => ({ name, count }));
  }, [activeDesviosList, desvioFilter]);

  // Handle saving daily faturado HL
  const handleSaveDailyFaturado = (e: React.FormEvent) => {
    e.preventDefault();
    if (faturadoHLInput <= 0) {
      alert('Informe um valor de hectolitro faturado válido (> 0).');
      return;
    }

    const parts = faturadoDataISO.split('-');
    const dataStr = `${parts[2]}/${parts[1]}/${parts[0]}`;
    const mesAno = `${parts[1]}/${parts[0]}`;

    const newFatRec: WlpDailyFaturadoRecord = {
      id: `fat-${faturadoDataISO}`,
      dataISO: faturadoDataISO,
      dataStr,
      mesAno,
      volumeHL: Number(faturadoHLInput),
      registradoPor: user?.nome ? `${user.nome} (Admin)` : 'Administrativo / Faturamento 21h',
      registradoEm: new Date().toISOString(),
      origem: 'ADMIN_21H',
      empresaId
    };

    saveDailyFaturadoRecord(newFatRec);
    setDailyFaturados(getStoredDailyFaturado(empresaId));
    setShowFaturadoModal(false);
    alert(`✅ Volume faturado do dia ${dataStr} (${faturadoHLInput} HL) registrado com sucesso!`);
  };

  // Handle adding manual or retroactive journey point
  const handleCreateManualPoint = (e: React.FormEvent) => {
    e.preventDefault();

    if (!colabNome.trim()) {
      alert('Por favor, selecione ou informe o nome do colaborador.');
      return;
    }

    const parts = dataPontoISO.split('-');
    const dataStr = `${parts[2]}/${parts[1]}/${parts[0]}`;
    const mesAno = `${parts[1]}/${parts[0]}`;

    let durHrs = (horaInicio && horaFim) ? (calcularDuracaoHorasComIntervalo(horaInicio, horaFim) || 7.33) : 7.33;

    const newRec: JornadaRecord = {
      id: `jrn-retro-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      colaboradorNome: colabNome.trim().toUpperCase(),
      cargo: cargoColab,
      dataStr,
      dataISO: dataPontoISO,
      mesAno,
      horaInicio,
      horaFim,
      duracaoHoras: durHrs,
      empresaId,
      observacoes: obsPonto.trim() || 'Ponto retroativo inserido via Workstation WLP',
      criadoEm: new Date().toISOString()
    };

    saveJornadaRecord(newRec);
    setJornadas(getStoredJornadas(empresaId));
    setShowAddModal(false);
    setColabNome('');
    setObsPonto('');

    alert(`✅ Ponto de jornada de ${newRec.colaboradorNome} salvo com sucesso! (${durHrs}h)`);
  };

  // Handle Delete Point
  const handleDeletePoint = (id: string, colab: string) => {
    if (!window.confirm(`Confirma a exclusão do ponto registrado de ${colab}?`)) return;
    deleteJornadaRecord(id, empresaId);
    setJornadas(getStoredJornadas(empresaId));
  };

  // Handle CSV Import
  const handleProcessCsvImport = async () => {
    const trimmedInput = csvRawInput.trim();
    if (!trimmedInput) {
      alert('Cole o conteúdo do relatório CSV, JSON ou tabela de pontos retroativos.');
      return;
    }

    // Check if pasted text is JSON
    if (trimmedInput.startsWith('[') || trimmedInput.startsWith('{')) {
      setIsImportingFile(true);
      try {
        const file = new File([trimmedInput], 'pasted_data.json', { type: 'application/json' });
        const parsed = await parseWlpExcelFile(file, empresaId);
        if (!parsed.success || (parsed.rows.length === 0 && parsed.pendencias.length === 0)) {
          throw new Error(parsed.validationError || 'Falha ao processar texto JSON.');
        }
        const result = commitWlpImport(parsed, empresaId, true);
        const importedMonths = Array.from(new Set(parsed.rows.map(r => normalizeMesAnoStr(r.mesAno, r.dataISO)).filter(Boolean)));
        let periodMsg = 'Janeiro até o último registro';
        if (importedMonths.length > 0) {
          const sortedAsc = [...importedMonths].sort((a, b) => {
            const [ma, ya] = a.split('/').map(Number);
            const [mb, yb] = b.split('/').map(Number);
            if (ya !== yb) return ya - yb;
            return ma - mb;
          });
          const firstM = sortedAsc[0];
          const lastM = sortedAsc[sortedAsc.length - 1];
          periodMsg = `${firstM} até ${lastM}`;
          setSelectedMesAno(lastM);
        }

        setJornadas(getStoredJornadas(empresaId));
        setDailyFaturados(getStoredDailyFaturado(empresaId));
        setCsvRawInput('');
        setShowImportModal(false);
        alert(`✅ Importação JSON concluída com sucesso!\n\n• ${result.importedCount} pontos de jornada e cargos reescritos na plataforma.\n• Período Atualizado: ${periodMsg}\n• Todos os indicadores da guia foram 100% atualizados.`);
        return;
      } catch (err: any) {
        alert(`Erro ao processar JSON: ${err.message || err}`);
        return;
      } finally {
        setIsImportingFile(false);
      }
    }

    const lines = trimmedInput.split('\n');
    const importedRecords: JornadaRecord[] = [];

    lines.forEach((line, index) => {
      if (index === 0 && (line.toLowerCase().includes('colaborador') || line.toLowerCase().includes('nome'))) {
        return; // skip header line
      }

      const cols = line.split(';');
      if (cols.length < 5) return;

      const colab = cols[0]?.trim().toUpperCase();
      const cargoStr = cols[1]?.trim() || 'Ajudante';
      const dataCol = cols[2]?.trim(); // "DD/MM/YYYY" or "YYYY-MM-DD"
      const hIni = cols[3]?.trim() || '07:00';
      const hFim = cols[4]?.trim() || '16:20';
      const obs = cols[5]?.trim() || 'Importação retroativa CSV';

      if (!colab) return;

      let dataISOStr = new Date().toISOString().split('T')[0];
      let dataFormatted = new Date().toLocaleDateString('pt-BR');
      let mesAnoStr = '08/2026';

      if (dataCol.includes('/')) {
        const p = dataCol.split('/');
        if (p.length === 3) {
          dataFormatted = dataCol;
          dataISOStr = `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
          mesAnoStr = `${p[1].padStart(2, '0')}/${p[2]}`;
        }
      } else if (dataCol.includes('-')) {
        const p = dataCol.split('-');
        if (p.length === 3) {
          dataISOStr = dataCol;
          dataFormatted = `${p[2]}/${p[1]}/${p[0]}`;
          mesAnoStr = `${p[1]}/${p[0]}`;
        }
      }

      let dur = (hIni && hFim) ? (calcularDuracaoHorasComIntervalo(hIni, hFim) || 7.33) : 7.33;

      importedRecords.push({
        id: `imp-csv-${Date.now()}-${index}`,
        colaboradorNome: colab,
        cargo: cargoStr,
        dataStr: dataFormatted,
        dataISO: dataISOStr,
        mesAno: mesAnoStr,
        horaInicio: hIni,
        horaFim: hFim,
        duracaoHoras: dur,
        empresaId,
        observacoes: obs,
        criadoEm: new Date().toISOString()
      });
    });

    if (importedRecords.length === 0) {
      alert('Nenhum registro válido foi identificado no formato informado. Verifique o padrão de colunas.');
      return;
    }

    saveMultipleJornadas(importedRecords, empresaId);
    setJornadas(getStoredJornadas(empresaId));
    setShowImportModal(false);
    setCsvRawInput('');

    alert(`🎉 Sucesso! ${importedRecords.length} pontos retroativos de jornada foram importados e computados no WLP!`);
  };

  const SAMPLE_CSV_TEMPLATE = `Colaborador;Cargo;Data;HoraInicio;HoraFim;Observacao
MARIVALDO ARTUR ALVES;Conferente;01/08/2026;07:00;16:20;Turno Normal
NIXON HENRIQUE PEREIRA DE ARRUDA;Empilhador;01/08/2026;07:00;16:20;Turno Normal
PAULO PEREIRA DA SILVA;Ajudante;01/08/2026;07:00;16:20;Turno Normal`;

  return (
    <div className="space-y-6">
      
      {/* BANNER DE ALERTA DAS 21:00 PARA O SETOR ADMINISTRATIVO */}
      {!dismiss21hAlert && (
        <div className="bg-gradient-to-r from-amber-950/80 via-[#1a233d] to-slate-900 border-2 border-amber-500/60 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-pulse-subtle">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-400 shrink-0">
              <Bell className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 px-2 py-0.5 rounded font-mono">
                  ALERTA ADMINISTRATIVO 21:00
                </span>
                <span className="text-[10px] text-amber-300/80 font-bold">Importação/Registro de Faturamento</span>
              </div>
              <h4 className="text-sm font-black text-white mt-1">
                Aviso de Fechamento de Jornada — Registrar Hectolitros Faturados (HL) do Dia
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed mt-0.5">
                Às 21:00 o setor administrativo deve registrar o Hectolitro Faturado do dia para atualização da produtividade WLP e cálculo das médias de horas trabalhadas por colaborador, bem como auditoria DPO de horas extras.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowFaturadoModal(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" /> Informar HL Faturado Hoje
            </button>
            <button
              onClick={() => setDismiss21hAlert(true)}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Fechar Alerta"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* CABEÇALHO COMPACTO E ALINHADO WLP WORKSTATION */}
      <div className="bg-[#111a30] border border-amber-500/40 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4">
        {/* Linha 1: Título do Dashboard */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-400 shrink-0">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  INDICADOR ESTRATÉGICO WORKSTATION
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Fórmula: HL Faturado ÷ (TT QLP × 7.33h × Dias Úteis)
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-tight mt-0.5">
                Dashboard de WLP (Workload Planning &amp; Produtividade Operacional)
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={exportWlpModelExcel}
              className="px-3 py-2 bg-[#0b1222] hover:bg-slate-800 text-emerald-400 font-bold text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer border border-emerald-500/40 flex items-center gap-1.5 shadow-xs"
              title="Baixar Modelo de Planilha Excel (.xlsx)"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Modelo Excel (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={() => setShowFaturadoModal(true)}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>+ HL Faturado Diário</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Ponto Manual</span>
            </button>

            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="px-3 py-2 bg-sky-950 hover:bg-sky-900 text-sky-200 font-black text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer border border-sky-500/50 flex items-center gap-1.5 shadow-md"
            >
              <Upload className="w-3.5 h-3.5 text-sky-400" />
              <span>Central Importação Geral</span>
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-snug">
          Medição da eficiência de carregamento e operação por homem-hora (HL/HH) baseada na jornada dos colaboradores ajudantes, empilhadores e conferentes.
        </p>

        {/* CARD INDICADOR ACUMULADO DO ANO 2026 (YTD) */}
        <div className="bg-[#111a30] border-2 border-amber-500/50 rounded-2xl p-5 shadow-2xl space-y-4 relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/20 rounded-2xl border border-amber-500/60 text-amber-400 shrink-0 shadow-md">
                <Award className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-black uppercase text-white tracking-wide">
                    INDICADOR ACUMULADO DO ANO 2026 (YTD)
                  </h3>
                  <span className="px-2.5 py-0.5 bg-emerald-500 text-slate-950 font-black text-[10px] uppercase rounded-full tracking-wide shadow-xs flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> 🔒 Mês a Mês Isolado & Protegido
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Consolidação oficial de desempenho DPO em 2026. Cada importação mensal atualiza <strong>estritamente o mês correspondente</strong>, sem impactar ou alterar dados dos outros meses.
                </p>
              </div>
            </div>

            <div className="px-4 py-2 bg-[#0b1222] border border-amber-500/40 rounded-xl shrink-0 text-center self-start md:self-auto shadow-inner">
              <span className="text-[10px] uppercase font-black text-slate-400 block">Status Acumulado 2026</span>
              <span className="text-sm font-mono font-black text-emerald-400 block">+38,6% Acima da Meta</span>
            </div>
          </div>

          {/* KPI GRID DO ACUMULADO DO ANO */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* CARD 1: WLP REAL ACUMULADO */}
            <div className="bg-[#0b1222] border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                WLP Real Acumulado
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-mono font-black text-amber-400">
                  {ytdMetrics2026.realWlp.toFixed(2).replace('.', ',')}
                </span>
                <span className="text-xs font-mono font-bold text-slate-400">HL/HH</span>
              </div>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[9px] font-black text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.2 rounded">
                  Meta: {ytdMetrics2026.metaWlp.toFixed(2).replace('.', ',')} HL/HH
                </span>
              </div>
            </div>

            {/* CARD 2: VOLUME TOTAL ACUMULADO */}
            <div className="bg-[#0b1222] border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                Volume Total Expedido
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-mono font-black text-white">
                  {ytdMetrics2026.volumeTotalHL.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
                </span>
                <span className="text-xs font-mono font-bold text-slate-400">HL</span>
              </div>
              <span className="text-[9px] text-slate-400 font-mono block">
                Soma de todos os faturamentos de 2026
              </span>
            </div>

            {/* CARD 3: HOMENS-HORA TRABALHADOS (HH) */}
            <div className="bg-[#0b1222] border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                Total Homens-Hora (HH)
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-mono font-black text-sky-300">
                  {ytdMetrics2026.totalHH.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
                </span>
                <span className="text-xs font-mono font-bold text-slate-400">HH</span>
              </div>
              <span className="text-[9px] text-slate-400 font-mono block">
                Carga horária acumulada dos turnos
              </span>
            </div>

            {/* CARD 4: COBERTURA MENSAL & BANCO DE DADOS */}
            <div className="bg-[#0b1222] border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                Cobertura do Banco
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-mono font-black text-emerald-400">
                  {ytdMetrics2026.monthsCount} de 12
                </span>
                <span className="text-xs font-mono font-bold text-slate-400">Meses</span>
              </div>
              <span className="text-[9px] text-amber-300 font-mono block font-bold">
                {ytdMetrics2026.totalJourneys2026 > 0 ? `${ytdMetrics2026.totalJourneys2026} pontos importados e salvos` : '7 meses oficiais gravados'}
              </span>
            </div>
          </div>

          <div className="p-2.5 bg-[#0b1222] border border-slate-800 rounded-xl text-[11px] text-slate-300 flex items-center justify-between flex-wrap gap-2">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <strong>Pronto para Importação Mês a Mês:</strong> Você pode importar o mês de Janeiro agora. Os dados de Fevereiro, Março, Abril, Maio, etc., continuarão intactos.
            </span>
            <span className="text-[10px] text-amber-400 font-mono font-black uppercase">
              Gravação Permanente no Código/Navegador: Ativa
            </span>
          </div>
        </div>

        {/* GUIAS HORIZONTAIS SIMÉTRICAS DE MESES */}
        <div className="bg-[#0b1222] border border-slate-800 rounded-2xl p-4 shadow-inner space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-2.5">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <h3 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2">
                  Guias Mensais de WLP <span className="text-amber-400 font-mono">({selectedMesAno.split('/')[1] || '2026'})</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Clique em qualquer guia de mês para visualizar os relatórios e importar dados do respectivo período.
                </p>
              </div>
            </div>

            {/* Alternar Filtro Mês x Entre Dias */}
            <div className="flex items-center bg-[#111a30] p-1 rounded-xl border border-slate-800 shrink-0 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setFilterMode('MES')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterMode === 'MES'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white bg-transparent'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Guias de Meses</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('INTERVALO')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterMode === 'INTERVALO'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white bg-transparent'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Entre Dias</span>
              </button>
            </div>
          </div>

          {filterMode === 'MES' ? (
            /* GRID HORIZONTAL SIMÉTRICA DE 12 MESES */
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-1.5 pt-1">
              {ALL_MONTHS_NAV.map((m) => {
                const year = selectedMesAno.split('/')[1] || '2026';
                const mesAnoKey = `${m.num}/${year}`;
                const isSelected = selectedMesAno === mesAnoKey;

                // Stats for month badge
                const monthJourneys = jornadas.filter(j => normalizeMesAnoStr(j.mesAno, j.dataISO) === mesAnoKey);
                const monthFaturados = dailyFaturados.filter(f => normalizeMesAnoStr(f.mesAno, f.dataISO) === mesAnoKey);
                const volSum = monthFaturados.reduce((s, f) => s + (f.volumeHL || 0), 0);
                const hasData = monthJourneys.length > 0 || volSum > 0;

                return (
                  <button
                    key={m.num}
                    type="button"
                    onClick={() => setSelectedMesAno(mesAnoKey)}
                    className={`relative p-2 rounded-xl transition-all cursor-pointer border text-center flex flex-col justify-between items-center min-h-[74px] shadow-sm ${
                      isSelected
                        ? m.isCritical
                          ? 'bg-amber-500 text-slate-950 border-amber-300 ring-2 ring-amber-400/80 shadow-lg font-black scale-[1.03] z-10'
                          : 'bg-amber-500 text-slate-950 border-amber-400 ring-2 ring-amber-400/50 shadow-md font-black scale-[1.03] z-10'
                        : m.isCritical
                        ? 'bg-amber-950/40 hover:bg-amber-900/60 text-amber-200 border-amber-500/80 shadow-xs'
                        : 'bg-[#111a30] hover:bg-slate-800 text-slate-300 border-slate-800'
                    }`}
                  >
                    {/* Tag de Alerta no mês de Junho */}
                    {m.isCritical && (
                      <span className={`absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded text-[7px] font-black uppercase tracking-wider shrink-0 flex items-center gap-0.5 whitespace-nowrap shadow-xs ${
                        isSelected ? 'bg-slate-950 text-amber-400 border border-amber-400' : 'bg-amber-500 text-slate-950 font-black'
                      }`}>
                        <AlertTriangle className="w-2.5 h-2.5" /> CRÍTICO
                      </span>
                    )}

                    <div className="w-full text-center mt-1">
                      <span className={`text-xs font-black uppercase tracking-wider block ${
                        isSelected ? 'text-slate-950' : m.isCritical ? 'text-amber-300 font-black' : 'text-white'
                      }`}>
                        {m.short}
                      </span>
                      <span className={`text-[9px] font-mono font-bold block ${
                        isSelected ? 'text-slate-900' : 'text-slate-400'
                      }`}>
                        {m.num}/{year.slice(2)}
                      </span>
                    </div>

                    {/* Quick status badge */}
                    <div className="mt-1 w-full">
                      {hasData ? (
                        <span className={`text-[8px] font-mono font-bold px-1 py-0.2 rounded block truncate ${
                          isSelected ? 'bg-slate-950/20 text-slate-950 font-black' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {volSum > 0 ? `${Math.round(volSum)} HL` : `${monthJourneys.length} pts`}
                        </span>
                      ) : (
                        <span className={`text-[8px] font-mono block italic ${
                          isSelected ? 'text-slate-800' : 'text-slate-500'
                        }`}>
                          Sem dados
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3 bg-[#111a30] p-3 rounded-xl border border-slate-700">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-slate-400">Data Inicial:</span>
                <input
                  type="date"
                  value={startDateISO}
                  onChange={(e) => setStartDateISO(e.target.value)}
                  className="bg-[#0b1222] border border-amber-500/40 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-amber-300 outline-none focus:border-amber-400"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-slate-400">Data Final:</span>
                <input
                  type="date"
                  value={endDateISO}
                  onChange={(e) => setEndDateISO(e.target.value)}
                  className="bg-[#0b1222] border border-amber-500/40 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-amber-300 outline-none focus:border-amber-400"
                />
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Filtrando registros entre {startDateISO} e {endDateISO}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* BANNER DE ALERTA DE PERÍODO CRÍTICO (MARÇO, JUNHO, DEZEMBRO) */}
      {(selectedMesAno.startsWith('03/') || selectedMesAno.startsWith('06/') || selectedMesAno.startsWith('12/')) && (
        <div className="bg-amber-950/40 border-2 border-amber-500/80 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-3 relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-3 bg-amber-500/20 rounded-xl border border-amber-500/60 shrink-0 mt-0.5">
                <AlertTriangle className="w-7 h-7 text-amber-400 animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-black uppercase tracking-wider text-amber-300">
                    ⚠️ PERÍODO CRÍTICO DE MAIOR VOLUME OPERACIONAL E RISCO DE ABSENTEÍSMO — {
                      selectedMesAno.startsWith('03/') ? 'MÊS DE MARÇO' :
                      selectedMesAno.startsWith('06/') ? 'MÊS DE JUNHO' : 'MÊS DE DEZEMBRO'
                    }
                  </h3>
                  <span className="px-2.5 py-0.5 bg-amber-500 text-slate-950 font-black text-[10px] uppercase rounded-full tracking-wide shadow-xs">
                    Pico de Demanda Expedida
                  </span>
                </div>
                <p className="text-xs text-slate-200 mt-1.5 leading-relaxed max-w-5xl">
                  {selectedMesAno.startsWith('03/') && 'Março é um dos meses de pico absoluto de expedição (atingindo 13.813,4 HL em 2026, um salto de +37,8% vs 2025). '}
                  {selectedMesAno.startsWith('06/') && 'Junho é um dos meses de pico absoluto de expedição (atingindo 16.686,6 HL em 2026, um salto de +21,8% vs 2025). '}
                  {selectedMesAno.startsWith('12/') && 'Dezembro é o mês de maior pico de festas e demanda anual do armazém (superando 21.469,2 HL em 2025). '}
                  Por ser um <strong>Período Crítico de Pico</strong> com alta sobrecarga e <strong>maior probabilidade de absenteísmo no setor</strong>, a regra de horas extras DPO foi flexibilizada: 
                  <span className="text-amber-300 font-bold"> Horas extras de até +2,00h por colaborador (jornada diária total de até 9,33h) são 100% PERMITIDAS e ISENTAS de desvio DPO</span>. Essa tolerância garante a capacidade de resposta da equipe sem penalização por hora extra quando ocorrerem faltas ou picos imprevisíveis de carga.
                </p>
              </div>
            </div>
            <div className="px-4 py-2.5 bg-[#0b1222] border border-amber-500/50 rounded-xl shrink-0 text-center self-start md:self-auto shadow-inner">
              <span className="text-[10px] font-black uppercase text-amber-400 block">Tolerância HE Período Crítico</span>
              <span className="text-base font-black font-mono text-white">+2,00h Sem Desvio</span>
              <span className="text-[9px] text-slate-400 font-mono block mt-0.5">Jornada Máx. Perm.: 9,33h</span>
            </div>
          </div>
        </div>
      )}

      {/* PAINEL ESTRATÉGICO DE VOLUME FATURADO (2024-2026) E ABSENTEÍSMO 2026 */}
      <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase text-white tracking-wide flex items-center gap-2">
                Painel Estratégico de Volume Faturado (HL) & Indicadores de Absenteísmo
              </h3>
              <p className="text-[11px] text-slate-400">
                Histórico comparativo de volumes hectolitros (2024–2026) e monitoramento oficial de absenteísmo por mês com fechamento mensal editável.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            {/* Responsável e Acumulado */}
            <div className="flex items-center gap-2 bg-[#0b1222] px-3 py-1.5 rounded-xl border border-slate-800 shrink-0">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <div className="text-[10px] uppercase font-black flex items-center gap-1">
                <span className="text-slate-400">Resp.: </span>
                {isEditingAbsenteeism ? (
                  <input
                    type="text"
                    value={responsavelAbsenteismo}
                    onChange={(e) => setResponsavelAbsenteismo(e.target.value.toUpperCase())}
                    className="bg-slate-900 border border-amber-500/50 rounded px-1.5 py-0.5 text-[10px] font-bold text-amber-300 w-24 outline-none"
                    placeholder="NOME"
                  />
                ) : (
                  <span className="text-amber-400 font-bold">{responsavelAbsenteismo}</span>
                )}
              </div>
              <div className="ml-2 pl-2 border-l border-slate-700 text-xs font-mono font-black text-emerald-400">
                Acumulado: {calculatedAbsenteeismSummary.avgFormatted} [{calculatedAbsenteeismSummary.statusOverall}]
              </div>
            </div>

            {/* Botão de Edição de Absenteísmo */}
            {isEditingAbsenteeism ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSaveAbsenteeism}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer border border-emerald-400 flex items-center gap-1 shadow-md"
                  title="Salvar alterações de absenteísmo"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetAbsenteeism}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px] uppercase rounded-xl transition-all cursor-pointer border border-slate-700 flex items-center gap-1"
                  title="Restaurar padrão"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Padrão</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingAbsenteeism(false)}
                  className="px-2.5 py-1.5 bg-rose-950 hover:bg-rose-900 text-rose-300 font-bold text-[11px] uppercase rounded-xl transition-all cursor-pointer border border-rose-500/40 flex items-center gap-1"
                  title="Cancelar edição"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Sair</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingAbsenteeism(true)}
                className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-amber-200 font-black text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer border border-amber-500/50 flex items-center gap-1.5 shadow-sm"
                title="Editar absenteísmo dos meses e inserir dados de fechamento"
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                <span>Editar Fechamento</span>
              </button>
            )}
          </div>
        </div>

        {/* ABSENTEÍSMO MÊS A MÊS 2026 (12 MESES COMPLETOS COM EDIÇÃO) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Monitoramento Mensal de Absenteísmo 2026 (12 Meses)
              </span>
              <span className="text-[10px] text-slate-400">
                • Responsável: <strong className="text-slate-200">{responsavelAbsenteismo}</strong>
              </span>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
              <span>Meses Fechados: <strong className="text-emerald-400">{calculatedAbsenteeismSummary.count}/12</strong></span>
              <span>Acumulado Ano: <strong className="text-amber-300 font-bold">{calculatedAbsenteeismSummary.avgFormatted} ({calculatedAbsenteeismSummary.statusOverall})</strong></span>
              <button
                type="button"
                onClick={() => setIsEditingAbsenteeism(!isEditingAbsenteeism)}
                className="text-amber-400 hover:text-amber-300 underline font-bold cursor-pointer flex items-center gap-1"
              >
                <Edit3 className="w-3 h-3" />
                {isEditingAbsenteeism ? 'Concluir Edição' : 'Editar Valores'}
              </button>
            </div>
          </div>

          {/* GRID COM TODOS OS 12 MESES DO ANO */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12 gap-2">
            {absenteeismList.map((item, idx) => {
              const isClosed = item.val && item.val !== '-' && item.st !== 'PENDENTE';
              let cardBg = 'bg-slate-900/60 border-slate-800 text-slate-400';
              if (item.st === 'OK') {
                cardBg = 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300';
              } else if (item.st === 'NOK') {
                cardBg = 'bg-rose-950/30 border-rose-500/40 text-rose-300';
              } else if (item.st === 'PENDENTE') {
                cardBg = 'bg-[#0b1222] border-slate-800 text-slate-400';
              }

              return (
                <div
                  key={item.num}
                  className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all relative group ${cardBg} ${
                    item.isCritical ? 'ring-1 ring-amber-500/40' : ''
                  }`}
                >
                  {/* Topo do Card */}
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-black uppercase text-slate-300 flex items-center gap-0.5 truncate">
                      {item.short}
                    </span>
                    {item.isCritical && (
                      <span className="text-[8px] font-black bg-amber-500/20 border border-amber-500/40 text-amber-300 px-1 py-0.2 rounded" title="Período Crítico (+2h HE)">
                        CRIT
                      </span>
                    )}
                    {!isEditingAbsenteeism && (
                      <button
                        type="button"
                        onClick={() => setQuickEditMonthIdx(idx)}
                        className="opacity-0 group-hover:opacity-100 text-amber-400 hover:text-amber-300 transition-opacity p-0.5 cursor-pointer"
                        title={`Editar fechamento de ${item.nome}`}
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Conteúdo: Modo Edição Inline ou Visualização */}
                  {isEditingAbsenteeism ? (
                    <div className="space-y-1.5 mt-1.5">
                      <input
                        type="text"
                        value={item.val}
                        onChange={(e) => handleAbsenteeismCellChange(idx, 'val', e.target.value)}
                        placeholder="Ex: 0,75%"
                        className="w-full bg-[#0b1222] border border-amber-500/60 rounded px-1.5 py-1 text-xs font-mono font-black text-amber-300 outline-none text-center focus:ring-1 focus:ring-amber-400"
                      />
                      <select
                        value={item.st}
                        onChange={(e) => handleAbsenteeismCellChange(idx, 'st', e.target.value)}
                        className="w-full bg-[#0b1222] border border-slate-700 rounded px-1 py-0.5 text-[9px] font-black text-white outline-none cursor-pointer"
                      >
                        <option value="OK">OK</option>
                        <option value="NOK">NOK</option>
                        <option value="PENDENTE">PENDENTE</option>
                      </select>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <div className="flex items-baseline justify-between gap-1">
                        <span className="text-xs font-black font-mono tracking-tight">
                          {item.val || '-'}
                        </span>
                        <span
                          className={`text-[8px] font-black px-1.5 py-0.2 rounded uppercase ${
                            item.st === 'OK'
                              ? 'bg-emerald-500 text-slate-950 font-black'
                              : item.st === 'NOK'
                              ? 'bg-rose-500 text-white font-black'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {item.st}
                        </span>
                      </div>
                      <span className="text-[8px] text-slate-500 font-mono block mt-1 truncate" title={item.nome}>
                        {isClosed ? 'Fechado' : 'Aguardando'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Modal / Popover de Edição Rápida de Mês Específico */}
          {quickEditMonthIdx !== null && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-[#111a30] border-2 border-amber-500/80 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-amber-500/20 border border-amber-500/50 rounded-xl text-amber-400">
                      <Edit3 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black uppercase text-white">
                        Fechamento de Absenteísmo: {absenteeismList[quickEditMonthIdx]?.nome} ({absenteeismList[quickEditMonthIdx]?.num}/2026)
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Insira a taxa apurada no fechamento oficial do mês.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setQuickEditMonthIdx(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-black uppercase text-slate-300 block mb-1">
                      Taxa de Absenteísmo do Mês (%):
                    </label>
                    <input
                      type="text"
                      value={absenteeismList[quickEditMonthIdx]?.val || ''}
                      onChange={(e) => handleAbsenteeismCellChange(quickEditMonthIdx, 'val', e.target.value)}
                      placeholder="Ex: 0,69% ou 1,20%"
                      className="w-full bg-[#0b1222] border border-amber-500/60 rounded-xl px-3 py-2 text-sm font-mono font-black text-amber-300 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                    />
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Dica: Digite o valor em percentual apurado pela gestão DPO.
                    </span>
                  </div>

                  <div>
                    <label className="text-[11px] font-black uppercase text-slate-300 block mb-1">
                      Status do Indicador:
                    </label>
                    <select
                      value={absenteeismList[quickEditMonthIdx]?.st || 'OK'}
                      onChange={(e) => handleAbsenteeismCellChange(quickEditMonthIdx, 'st', e.target.value)}
                      className="w-full bg-[#0b1222] border border-slate-700 rounded-xl px-3 py-2 text-xs font-black text-white outline-none cursor-pointer focus:border-amber-500"
                    >
                      <option value="OK">✅ OK (Dentro da Meta DPO)</option>
                      <option value="NOK">❌ NOK (Acima da Meta DPO)</option>
                      <option value="PENDENTE">⏳ PENDENTE / EM ABERTO</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-black uppercase text-slate-300 block mb-1">
                      Observação / Detalhamento (Opcional):
                    </label>
                    <input
                      type="text"
                      value={absenteeismList[quickEditMonthIdx]?.observacao || ''}
                      onChange={(e) => handleAbsenteeismCellChange(quickEditMonthIdx, 'observacao', e.target.value)}
                      placeholder="Ex: Fechamento oficial auditado sem desvios"
                      className="w-full bg-[#0b1222] border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setQuickEditMonthIdx(null)}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAbsenteeism}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer flex items-center gap-1.5 shadow-md"
                  >
                    <Save className="w-4 h-4" />
                    <span>Salvar Fechamento</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* VOLUME HECTOLITRO FATURADO (2024 / 2025 / 2026) */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between flex-wrap gap-1">
            <span className="text-[11px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Volume Hectolitro Faturado (HL) — Histórico Comparativo 2024 x 2025 x 2026
            </span>
            <span className="text-[10px] font-mono text-slate-400">Total 2026 Acumulado (Até Ago): 103.496,3 HL</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="bg-[#0b1222] text-slate-400 text-[10px] uppercase font-black border-b border-slate-800">
                  <th className="py-2 px-3">Mês</th>
                  <th className="py-2 px-3 text-right">Volume 2024</th>
                  <th className="py-2 px-3 text-right">Volume 2025</th>
                  <th className="py-2 px-3 text-right">Volume 2026</th>
                  <th className="py-2 px-3 text-right">Variação '26 vs '25</th>
                  <th className="py-2 px-3 text-center">Status Período</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200 text-[11px]">
                {[
                  { m: 'Jan', v24: '-', v25: '13.491,3', v26: '16.336,4', var: '+21,1%', crit: false },
                  { m: 'Fev', v24: '-', v25: '11.676,1', v26: '12.486,1', var: '+6,9%', crit: false },
                  { m: 'Mar', v24: '-', v25: '10.023,7', v26: '13.813,4', var: '+37,8%', crit: true },
                  { m: 'Abr', v24: '-', v25: '11.426,4', v26: '12.981,1', var: '+13,6%', crit: false },
                  { m: 'Mai', v24: '-', v25: '12.501,8', v26: '12.447,2', var: '-0,4%', crit: false },
                  { m: 'Jun', v24: '-', v25: '13.697,8', v26: '16.686,6', var: '+21,8%', crit: true },
                  { m: 'Jul', v24: '-', v25: '10.923,4', v26: '13.626,8', var: '+24,7%', crit: false },
                  { m: 'Ago', v24: '-', v25: '9.272,7', v26: '5.118,7 (parcial)', var: '-', crit: false },
                  { m: 'Set', v24: '-', v25: '11.211,3', v26: '-', var: '-', crit: false },
                  { m: 'Out', v24: '10.040,2', v25: '11.802,8', v26: '-', var: '-', crit: false },
                  { m: 'Nov', v24: '12.553,6', v25: '12.774,3', v26: '-', var: '-', crit: false },
                  { m: 'Dez', v24: '16.231,5', v25: '21.469,2', v26: '-', var: '-', crit: true },
                ].map((row, i) => (
                  <tr key={i} className={row.crit ? 'bg-amber-500/10 font-bold' : 'hover:bg-slate-800/40'}>
                    <td className="py-2 px-3 font-bold uppercase text-white flex items-center gap-1.5">
                      {row.m}
                      {row.crit && (
                        <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 text-[9px] font-black rounded uppercase shrink-0">
                          PICO CRÍTICO
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-400">{row.v24}</td>
                    <td className="py-2 px-3 text-right text-slate-300">{row.v25}</td>
                    <td className="py-2 px-3 text-right font-black text-amber-300">{row.v26}</td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-400">{row.var}</td>
                    <td className="py-2 px-3 text-center">
                      {row.crit ? (
                        <span className="text-[10px] text-amber-400 font-black uppercase tracking-wider">
                          Pico (+2h HE Isento)
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 uppercase">Padrão</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#0b1222] font-black text-white text-xs border-t-2 border-slate-700">
                  <td className="py-2.5 px-3 uppercase">Total Geral</td>
                  <td className="py-2.5 px-3 text-right text-slate-400">38.825,4 HL</td>
                  <td className="py-2.5 px-3 text-right text-slate-300">150.270,9 HL</td>
                  <td className="py-2.5 px-3 text-right text-amber-400">103.496,3 HL</td>
                  <td className="py-2.5 px-3 text-right text-emerald-400">+19,8% md</td>
                  <td className="py-2.5 px-3 text-center text-slate-400">Ref. 2026</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* CENTRAL DE IMPORTAÇÃO ESPECÍFICA DO MÊS SELECIONADO */}
      <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-4 space-y-3 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-500/10 border border-purple-500/30 rounded-xl text-purple-400 shrink-0">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                Campos de Importação do Mês: <span className="text-amber-400 font-mono">{ALL_MONTHS_NAV.find(m => m.num === selectedMesAno.split('/')[0])?.name || selectedMesAno} ({selectedMesAno})</span>
              </h4>
              <p className="text-[11px] text-slate-400">
                Importe arquivos JSON, Excel ou CSV especificamente para o mês de {ALL_MONTHS_NAV.find(m => m.num === selectedMesAno.split('/')[0])?.name || selectedMesAno}.
              </p>
            </div>
          </div>

          {/* Botões de Ação de Importação do Mês */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <input
              type="file"
              ref={monthJsonInputRef}
              accept=".json"
              onChange={handleMonthJsonUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => monthJsonInputRef.current?.click()}
              className="px-3 py-2 bg-purple-950 hover:bg-purple-900 text-purple-200 font-black text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer border border-purple-500/50 flex items-center gap-1.5 shadow-md"
              title={`Importar arquivo JSON de ${selectedMesAno}`}
            >
              <Upload className="w-3.5 h-3.5 text-purple-400" />
              <span>Importar JSON do Mês</span>
            </button>

            <input
              type="file"
              ref={monthExcelInputRef}
              accept=".xlsx, .xls, .csv"
              onChange={handleMonthExcelUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => monthExcelInputRef.current?.click()}
              className="px-3 py-2 bg-sky-950 hover:bg-sky-900 text-sky-200 font-black text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer border border-sky-500/50 flex items-center gap-1.5 shadow-md"
              title={`Importar planilha Excel/CSV de ${selectedMesAno}`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-sky-400" />
              <span>Importar Excel/CSV do Mês</span>
            </button>

            <button
              type="button"
              onClick={() => setShowMonthPasteArea(!showMonthPasteArea)}
              className="px-3 py-2 bg-[#0b1222] hover:bg-slate-800 text-slate-300 font-bold text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer border border-slate-700 flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>{showMonthPasteArea ? 'Ocultar Caixa' : 'Colar Dados do Mês'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const monthName = ALL_MONTHS_NAV.find(m => m.num === selectedMesAno.split('/')[0])?.name || selectedMesAno;
                if (window.confirm(`⚠️ ATENÇÃO: Tem certeza que deseja APAGAR os dados de jornadas e faturamento referente ao mês de ${monthName} (${selectedMesAno}) do cache e banco de dados?\n\n* Os demais meses serão preservados e você poderá realizar a importação limpa deste mês.`)) {
                  clearWlpMonthData(empresaId, selectedMesAno);
                  setJornadas(getStoredJornadas(empresaId));
                  setDailyFaturados(getStoredDailyFaturado(empresaId));
                  alert(`✅ Os dados do mês de ${monthName} (${selectedMesAno}) foram apagados com sucesso! Os demais meses permanecem intactos.`);
                }
              }}
              className="px-3 py-2 bg-rose-950/90 hover:bg-rose-900 text-rose-200 font-bold text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer border border-rose-500/60 flex items-center gap-1.5 shadow-md"
              title={`Apagar apenas os dados do mês selecionado (${selectedMesAno})`}
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Limpar Base de {ALL_MONTHS_NAV.find(m => m.num === selectedMesAno.split('/')[0])?.name || selectedMesAno}</span>
            </button>
          </div>
        </div>

        {/* Caixa expansível para colar texto JSON / CSV do mês */}
        {showMonthPasteArea && (
          <div className="bg-[#0b1222] p-3.5 rounded-xl border border-slate-700 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase text-amber-400">
                Cole o conteúdo JSON ou linhas CSV referentes a {selectedMesAno}:
              </label>
              <span className="text-[9px] text-slate-500">Mês Selecionado: {selectedMesAno}</span>
            </div>
            <textarea
              value={monthTextPaste}
              onChange={(e) => setMonthTextPaste(e.target.value)}
              rows={4}
              placeholder={`[\n  { "dataStr": "15/${selectedMesAno}", "volumeHL": 850, "colaboradorNome": "MARIVALDO ARTUR ALVES", "cargo": "Conferente", "horaInicio": "07:00", "horaFim": "16:20" }\n]`}
              className="w-full bg-[#111a30] border border-slate-800 rounded-lg p-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
            />
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-[10px] text-slate-400">
                Aceita objetos JSON ou linhas separadas por vírgula / ponto-e-vírgula.
              </span>
              <button
                type="button"
                onClick={handleProcessMonthTextPaste}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer shadow-md flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Processar e Gravar {selectedMesAno}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CARD DE CONSOLIDAÇÃO AUTOMÁTICA DOS DADOS OPERACIONAIS (MÊS SELECIONADO) */}
      <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <h3 className="text-sm font-black uppercase text-white tracking-wide">
                Consolidação Operacional WLP Importada — {selectedMesAno}
              </h3>
              <p className="text-[11px] text-slate-400">
                O volume faturado e as horas trabalhadas são extraídos automaticamente do arquivo de importação e apontamentos diários.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 rounded-lg font-mono text-xs font-bold shrink-0 self-start sm:self-auto">
            Meta Oficial: {metaOficial.toFixed(2)} HL/HH
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="bg-[#0b1222] p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400">Hectolitros Faturados (HL)</span>
            <div className="text-base font-black font-mono text-amber-400 mt-1">
              {metrics.volumeFaturadoHL.toLocaleString('pt-BR')} HL
            </div>
            <span className="text-[9px] text-slate-500 mt-1">Extraído da planilha importada</span>
          </div>

          <div className="bg-[#0b1222] p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400">Horas Trabalhadas (HH)</span>
            <div className="text-base font-black font-mono text-sky-400 mt-1">
              {metrics.effectiveTotalHours.toFixed(2)}h
            </div>
            <span className="text-[9px] text-slate-500 mt-1">Soma das jornadas de trabalho</span>
          </div>

          <div className="bg-[#0b1222] p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400">Quadro de Pessoal (Ativos)</span>
            <div className="text-base font-black font-mono text-indigo-300 mt-1">
              {metrics.colabCount} Pessoas
            </div>
            <span className="text-[9px] text-slate-500 mt-1">Colaboradores com registro</span>
          </div>

          <div className="bg-[#0b1222] p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400">Dias Operados</span>
            <div className="text-base font-black font-mono text-slate-200 mt-1">
              {metrics.diasUteisTrabalhados} Dias
            </div>
            <span className="text-[9px] text-slate-500 mt-1">Dias com atividade registrada</span>
          </div>

          <div className="bg-[#0b1222] p-3.5 rounded-xl border border-emerald-500/30 flex flex-col justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400">Meta WLP Ambev</span>
            <div className="text-base font-black font-mono text-emerald-400 mt-1">
              {metrics.metaWlp.toFixed(2)} HL/HH
            </div>
            <span className="text-[9px] text-slate-500 mt-1">Meta oficial cadastrada</span>
          </div>
        </div>
      </div>

      {/* CARDS DE RESULTADOS E RESULTADO DE WLP REALIZADO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 bg-[#111a30] border border-amber-500/30 rounded-2xl shadow-lg flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
              Volume Faturado
            </span>
            <FileSpreadsheet className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-white">
              {metrics.volumeFaturadoHL.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} HL
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Ref. Mês {selectedMesAno} ({metrics.diasUteisTrabalhados} dias úteis)
            </p>
          </div>
        </div>

        <div className="p-4 bg-[#111a30] border border-sky-500/30 rounded-2xl shadow-lg flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-sky-400">
              Total Horas Operacionais (HH)
            </span>
            <Clock className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-white">
              {metrics.effectiveTotalHours.toFixed(1)} HH
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {metrics.actualHoursSum > 0 
                ? `Calculado dos ${journeysInMonth.length} pontos de jornada registrados`
                : `Fórmula: ${metrics.ttQlp} colabs × 7.33h × ${metrics.diasUteisTrabalhados} dias`}
            </p>
          </div>
        </div>

        <div className="p-4 bg-[#111a30] border border-purple-500/30 rounded-2xl shadow-lg flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-400">
              Média Horas por Colaborador
            </span>
            <Users className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-white">
              {metrics.mediaHorasPorColaborador.toFixed(2)} hrs / colab
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Amostra: {metrics.colabCount} colaboradores com pontos ativos
            </p>
          </div>
        </div>

        {/* CARD INDICADOR WLP: META vs REAL SIDE BY SIDE */}
        <div className={`p-4 bg-[#111a30] border-2 ${
          metrics.wlpCalculado >= metaOficial 
            ? 'border-emerald-500 shadow-emerald-500/20' 
            : 'border-rose-500 shadow-rose-500/20'
        } rounded-2xl shadow-xl flex flex-col justify-between space-y-2`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
              Indicador WLP (HL/HH)
            </span>
            <Award className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="grid grid-cols-2 gap-2 bg-[#0b1222] p-2 rounded-xl border border-slate-800 text-center">
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Meta WLP</span>
                <span className="text-base font-black font-mono text-amber-400">{metaOficial.toFixed(2)}</span>
              </div>
              <div className="border-l border-slate-800">
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Real WLP</span>
                <span className="text-base font-black font-mono text-emerald-400">{metrics.wlpCalculado.toFixed(2)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-slate-400">Superávit: +{(metrics.wlpCalculado - metaOficial).toFixed(2)}</span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {metrics.percentualMeta.toFixed(1)}% da Meta
              </span>
            </div>
          </div>
        </div>

        {/* CARD INDICADOR PNP: META vs REAL SIDE BY SIDE */}
        <div className="p-4 bg-[#111a30] border-2 border-amber-500/50 shadow-amber-500/10 rounded-2xl shadow-xl flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
              Indicador PNP (HL/HH)
            </span>
            <Users className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="grid grid-cols-2 gap-2 bg-[#0b1222] p-2 rounded-xl border border-slate-800 text-center">
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Meta PNP</span>
                <span className="text-base font-black font-mono text-amber-400">5.00</span>
              </div>
              <div className="border-l border-slate-800">
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Real PNP</span>
                <span className="text-base font-black font-mono text-emerald-400">{(metrics.wlpCalculado > 0 ? metrics.wlpCalculado * 0.98 : 0).toFixed(2)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-slate-400">Desempenho</span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Acima da Meta
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CARD PAINEL MÉDIA DE HORAS TRABALHADAS POR DIA POR FUNÇÃO */}
      <div className="bg-[#111a30] border border-amber-500/40 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              Média de Horas Trabalhadas por Dia por Função
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Média diária da jornada de trabalho segregada por cargo operado ({selectedMesAno}) — Sem sábados ordinários
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20 shrink-0">
            {metrics.diasUteisTrabalhados} dias operados
          </span>
        </div>

        {horasPorCargoStats.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-400 font-mono">
            Nenhum registro de jornada encontrado no período selecionado.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {horasPorCargoStats.map((item) => (
              <div 
                key={item.cargo}
                className="bg-[#0b1222] p-4 rounded-xl border border-slate-700/80 hover:border-amber-500/60 transition-all space-y-3 shadow-md"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-black uppercase tracking-wide text-white">
                    {item.cargo}
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {item.colabsCount} colab(s)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-[#111a30] p-2 rounded-lg border border-slate-800">
                    <span className="text-[9px] font-bold uppercase text-slate-400 block">
                      Média / Colab / Dia
                    </span>
                    <span className="text-lg font-black font-mono text-amber-400">
                      {item.mediaHorasPorPessoaDia.toFixed(2)}h
                    </span>
                  </div>

                  <div className="bg-[#111a30] p-2 rounded-lg border border-slate-800">
                    <span className="text-[9px] font-bold uppercase text-slate-400 block">
                      Média Cargo / Dia
                    </span>
                    <span className="text-lg font-black font-mono text-sky-400">
                      {item.mediaHorasPorDia.toFixed(2)}h
                    </span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 font-mono">
                  <span>Total: <strong>{item.totalHoras.toFixed(1)}h</strong></span>
                  <span><strong>{item.totalJornadas}</strong> apontamento(s)</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* NAV SUBTABS: VISÃO INDICADOR vs HISTÓRICO DIÁRIO vs DESVIOS DPO vs PONTOS */}
      <div className="flex flex-wrap items-center bg-[#111a30] border border-slate-800 p-1.5 rounded-xl gap-2">
        <button
          onClick={() => setActiveSubTab('indicador')}
          className={`px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all border-none cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'indicador'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white bg-transparent'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Visão Geral do Indicador WLP</span>
        </button>

        <button
          onClick={() => setActiveSubTab('historico_diario')}
          className={`px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all border-none cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'historico_diario'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white bg-transparent'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Histórico Diário (Início/Fim & HL Faturado)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('desvios_dpo')}
          className={`px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all border-none cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'desvios_dpo'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white bg-transparent'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-amber-950" />
          <span>Desvios & Horas Extras (DPO) {desviosDpo.length > 0 && `(${desviosDpo.length})`}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('pontos_jornada')}
          className={`px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all border-none cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'pontos_jornada'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white bg-transparent'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Guia dos Pontos de Início e Fim de Jornada ({journeysInMonth.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('presentes_dia')}
          className={`px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all border-none cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'presentes_dia'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white bg-transparent'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Colaboradores Presentes no Dia</span>
        </button>

        <button
          onClick={() => setActiveSubTab('pnp_ajudante')}
          className={`px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all border-none cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'pnp_ajudante'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white bg-transparent'
          }`}
        >
          <Users className="w-4 h-4 text-emerald-400" />
          <span>PNP Ajudante</span>
        </button>

        <button
          onClick={() => setActiveSubTab('pnp_empilhador')}
          className={`px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all border-none cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'pnp_empilhador'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white bg-transparent'
          }`}
        >
          <Users className="w-4 h-4 text-sky-400" />
          <span>PNP Empilhador</span>
        </button>

        <button
          onClick={() => setActiveSubTab('pnp_conferente')}
          className={`px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all border-none cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'pnp_conferente'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white bg-transparent'
          }`}
        >
          <Users className="w-4 h-4 text-purple-400" />
          <span>PNP Conferente</span>
        </button>
      </div>

      {/* GUIA DE HISTÓRICO DIÁRIO DE WLP, JORNADAS E FATURAMENTO */}
      {activeSubTab === 'historico_diario' && (
        <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <History className="w-5 h-5 text-amber-400" /> Histórico Diário de Início/Término de Jornada & Hectolitro Faturado
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Acompanhamento dia a dia da carga horária média dos colaboradores (padrão 44h semanais / 7.33h diárias) e cálculo de WLP por homem-hora.
              </p>
            </div>

            <button
              onClick={() => setShowFaturadoModal(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Registrar HL Faturado do Dia
            </button>
          </div>

          <div className="border border-slate-800 rounded-xl overflow-hidden shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#0b1222] text-slate-300 font-black uppercase tracking-wider text-[10px] border-b border-slate-800">
                    <th className="p-3">Data</th>
                    <th className="p-3">HL Faturado (Volume Dia)</th>
                    <th className="p-3">Início e Término de Jornada (Amostra)</th>
                    <th className="p-3 text-center">Nº Colabs</th>
                    <th className="p-3 text-center">Total Horas (HH)</th>
                    <th className="p-3 text-center">Média Horas / Colab</th>
                    <th className="p-3 text-center">Meta WLP</th>
                    <th className="p-3 text-center">WLP Real Dia</th>
                    <th className="p-3 text-center">Status DPO</th>
                    <th className="p-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-[#0b1222] text-slate-200">
                  {(() => {
                    // Group journeys by date
                    const datesSet = new Set<string>();
                    journeysInMonth.forEach(j => datesSet.add(j.dataISO));
                    activeDailyFaturados.forEach(f => datesSet.add(f.dataISO));

                    const sortedDates = Array.from(datesSet).sort().reverse();

                    if (sortedDates.length === 0) {
                      return (
                        <tr>
                          <td colSpan={10} className="p-8 text-center text-slate-400 font-bold">
                            Nenhum dado importado para este período
                          </td>
                        </tr>
                      );
                    }

                    return sortedDates.map(dataISO => {
                      const dayJourneys = journeysInMonth.filter(j => j.dataISO === dataISO);
                      const fatRec = dailyFaturados.find(f => f.dataISO === dataISO);
                      const volumeHL = fatRec ? fatRec.volumeHL : 0;

                      const parts = dataISO.split('-');
                      const dataStr = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dataISO;

                      const totalHH = dayJourneys.reduce((acc, c) => acc + c.duracaoHoras, 0);
                      const numColabs = dayJourneys.length;
                      const mediaHorasColab = numColabs > 0 ? totalHH / numColabs : 0;
                      const wlpDia = totalHH > 0 && volumeHL > 0 ? volumeHL / totalHH : 0;

                      // Check low volume overtime violation
                      const hasLowVolumeOvertime = volumeHL > 0 && volumeHL < 450 && dayJourneys.some(j => j.duracaoHoras > 7.33);

                      return (
                        <tr key={dataISO} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-3 font-mono font-bold text-amber-400">
                            {dataStr}
                          </td>
                          <td className="p-3 font-mono font-black text-white">
                            {volumeHL > 0 ? `${volumeHL.toFixed(1)} HL` : <span className="text-slate-500 italic">Não informado</span>}
                          </td>
                          <td className="p-3">
                            {dayJourneys.length > 0 ? (
                              <div className="space-y-1 max-h-20 overflow-y-auto pr-1">
                                {dayJourneys.slice(0, 3).map(j => (
                                  <div key={j.id} className="text-[10px] text-slate-300 font-mono flex items-center justify-between bg-[#111a30] px-2 py-0.5 rounded border border-slate-800">
                                    <span className="truncate max-w-[120px]">{j.colaboradorNome}</span>
                                    <span className="text-emerald-400 font-bold">{j.horaInicio} - {j.horaFim} ({j.duracaoHoras.toFixed(1)}h)</span>
                                  </div>
                                ))}
                                {dayJourneys.length > 3 && (
                                  <span className="text-[9px] text-slate-500 block text-right">+{dayJourneys.length - 3} colaborador(es)</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-500 italic">Sem pontos registrados</span>
                            )}
                          </td>
                          <td className="p-3 text-center font-bold font-mono text-slate-300">
                            {numColabs}
                          </td>
                          <td className="p-3 text-center font-bold font-mono text-sky-400">
                            {totalHH.toFixed(1)} h
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-purple-300">
                            {mediaHorasColab.toFixed(2)} h / colab
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-amber-400">
                            5.00
                          </td>
                          <td className="p-3 text-center font-mono font-black text-sm text-emerald-400">
                            {wlpDia > 0 ? `${wlpDia.toFixed(2)}` : '-'}
                          </td>
                          <td className="p-3 text-center">
                            {hasLowVolumeOvertime ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Hora Extra Proibida
                              </span>
                            ) : wlpDia >= (metaOficial || 5.0) ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                Meta DPO Atingida
                              </span>
                            ) : wlpDia > 0 ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                Abaixo Meta
                              </span>
                            ) : (
                              <span className="text-slate-500 text-[10px]">-</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleStartEditDay(dataISO, volumeHL, dayJourneys)}
                              className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500 hover:text-slate-950 text-amber-300 font-bold text-[10px] uppercase rounded border border-amber-500/30 transition-all flex items-center gap-1 mx-auto cursor-pointer"
                              title="Editar Faturamento e Presença do Dia"
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Editar
                            </button>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* GUIA DE DESVIOS E HORAS EXTRAS DPO */}
      {activeSubTab === 'desvios_dpo' && (
        <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-5 space-y-5 shadow-xl">
          {/* Header & Filter Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-400" /> Painel de Desvios de Jornada, Horas Extras (&gt; 7,33h) &amp; WLP
              </h3>
              <p className="text-xs text-slate-300 mt-0.5 max-w-3xl">
                Auditoria contínua de inconsistências de produtividade WLP: identifica colaboradores com jornada superior a 7,33h, montagens noturnas finalizadas pelo time da manhã e ocorrências em dias de baixo faturamento.
              </p>
            </div>

            {/* Interactive Filters: Day / Date + Status */}
            <div className="flex flex-wrap items-center gap-2 bg-[#0b1222] p-2 rounded-xl border border-slate-700 shrink-0">
              {/* Day Filter Selector */}
              <div className="flex items-center gap-1.5 pr-2 border-r border-slate-700">
                <Calendar className="w-3.5 h-3.5 text-amber-400 ml-1" />
                <span className="text-[10px] font-black uppercase text-slate-400">Dia:</span>
                <select
                  value={selectedDesvioDateISO}
                  onChange={(e) => setSelectedDesvioDateISO(e.target.value)}
                  className="bg-[#111a30] text-xs font-mono font-bold text-amber-300 border border-slate-700 rounded-lg px-2.5 py-1.5 outline-none cursor-pointer focus:border-amber-400"
                >
                  <option value="TODAS">Todas as Datas ({availableDesvioDates.length} dias)</option>
                  {availableDesvioDates.map((dISO) => {
                    const parts = dISO.split('-');
                    const dStr = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dISO;
                    const dayDesviosCount = baseDesviosDpo.filter(d => d.dataISO === dISO).length;
                    return (
                      <option key={dISO} value={dISO}>
                        {dStr} {dayDesviosCount > 0 ? `(⚠️ ${dayDesviosCount} desvios)` : ' (🟢 OK)'}
                      </option>
                    );
                  })}
                </select>
                {selectedDesvioDateISO !== 'TODAS' && (
                  <button
                    type="button"
                    onClick={() => setSelectedDesvioDateISO('TODAS')}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded-md transition-colors cursor-pointer"
                    title="Mostrar todas as datas"
                  >
                    Ver Todas
                  </button>
                )}
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase text-slate-400 pl-1">Filtro:</span>
                <button
                  type="button"
                  onClick={() => setDesvioFilter('TODOS')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                    desvioFilter === 'TODOS'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                      : 'text-slate-400 hover:text-white bg-transparent'
                  }`}
                >
                  Todos ({baseDesviosDpo.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDesvioFilter('DESVIOS_APENAS')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-1 ${
                    desvioFilter === 'DESVIOS_APENAS'
                      ? 'bg-rose-500 text-white font-black shadow-xs'
                      : 'text-slate-400 hover:text-rose-400 bg-transparent'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" /> Apenas Desvios ({baseDesviosDpo.filter(d => d.tipo !== 'WLP_ABAIXO_META_DPO').length})
                </button>
                <button
                  type="button"
                  onClick={() => setDesvioFilter('DENTRO_META')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-1 ${
                    desvioFilter === 'DENTRO_META'
                      ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                      : 'text-slate-400 hover:text-emerald-400 bg-transparent'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Dentro da Meta
                </button>
              </div>
            </div>
          </div>

          {/* Cards de Resumo dos Desvios (Dinâmicos conforme filtro ativo) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-[#0b1222] border border-rose-500/30 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-rose-400 uppercase">Total de Desvios</span>
                <div className="text-2xl font-black font-mono text-white mt-0.5">{displayTotalDesvios}</div>
              </div>
              <ShieldAlert className="w-7 h-7 text-rose-500/80" />
            </div>

            <div className="p-4 bg-[#0b1222] border border-amber-500/30 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-amber-400 uppercase">Horas Extras (&gt; 7,33h)</span>
                <div className="text-2xl font-black font-mono text-white mt-0.5">{displayHorasExtras}</div>
              </div>
              <Clock className="w-7 h-7 text-amber-500/80" />
            </div>

            <div className="p-4 bg-[#0b1222] border border-indigo-500/30 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-indigo-400 uppercase">Montagens na Manhã</span>
                <div className="text-2xl font-black font-mono text-white mt-0.5">{displayMontagensManha}</div>
              </div>
              <Users className="w-7 h-7 text-indigo-500/80" />
            </div>

            <div className="p-4 bg-[#0b1222] border border-emerald-500/30 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-emerald-400 uppercase">Aderência à Meta DPO</span>
                <div className="text-2xl font-black font-mono text-white mt-0.5">{displayAderenciaDpo}</div>
              </div>
              <Award className="w-7 h-7 text-emerald-500/80" />
            </div>
          </div>

          {/* PAINEL DE GRÁFICOS E AUDITORIA VISUAL */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-2">
            {/* Gráfico 1: Colaboradores com Maior Carga Horária e Horas Extras */}
            <div className="p-4 bg-[#0b1222] border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h4 className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-amber-400" /> Colaboradores com Maior Carga Horária &amp; Horas Extras (&gt; 7,33h)
                </h4>
                <span className="text-[10px] font-mono font-bold text-slate-400">
                  Top 10 — {selectedDesvioDateISO === 'TODAS' ? selectedMesAno : selectedDesvioDateISO.split('-').reverse().join('/')}
                </span>
              </div>

              {colabOvertimeChartData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-xs text-slate-500">
                  Nenhum registro de jornada encontrado para o filtro aplicado.
                </div>
              ) : (
                <div className="h-64 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={colabOvertimeChartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis 
                        dataKey="nome" 
                        stroke="#94a3b8" 
                        tick={{ fontSize: 9, fill: '#94a3b8' }} 
                        interval={0} 
                        angle={-25} 
                        textAnchor="end" 
                      />
                      <YAxis stroke="#94a3b8" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                        formatter={(value: any, name: any) => [
                          `${Number(value).toFixed(2)}h`, 
                          name === 'horasPadrao' ? 'Jornada Padrão (≤ 7,33h)' : 'Horas Extras (> 7,33h)'
                        ]}
                      />
                      <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                      <Bar dataKey="horasPadrao" name="Jornada Padrão (h)" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="horasExtras" name="Horas Extras (h)" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Gráfico 2: Distribuição de Desvios por Categoria */}
            <div className="p-4 bg-[#0b1222] border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h4 className="text-xs font-black uppercase text-rose-400 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-400" /> Distribuição de Desvios Detectados por Categoria
                </h4>
                <span className="text-[10px] font-mono font-bold text-slate-400">
                  Total: {displayTotalDesvios} desvio(s)
                </span>
              </div>

              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={desviosCatChartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#94a3b8" 
                      tick={{ fontSize: 9, fill: '#94a3b8' }} 
                      interval={0} 
                      angle={-20} 
                      textAnchor="end" 
                    />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                      formatter={(value: any) => [`${value} ocorrência(s)`, 'Quantidade']}
                    />
                    <Bar dataKey="count" name="Ocorrências" radius={[6, 6, 0, 0]}>
                      {desviosCatChartData.map((entry, index) => {
                        const colors = ['#f59e0b', '#ef4444', '#6366f1', '#10b981'];
                        return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Renderização condicional por filtro e alertas do dia */}
          {desvioFilter === 'DENTRO_META' ? (
            <div className="p-8 bg-[#0b1222] border border-emerald-500/40 rounded-xl text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <h4 className="text-base font-black text-white uppercase">Visualização: Registros Dentro da Meta DPO</h4>
              <p className="text-xs text-slate-300 max-w-xl mx-auto">
                Para {selectedDesvioDateISO === 'TODAS' ? `o mês de ${selectedMesAno}` : `a data ${selectedDesvioDateISO.split('-').reverse().join('/')}`}, todos os registros apresentados estão dentro da jornada de 7,33h sem excesso de horas extras.
              </p>
            </div>
          ) : (() => {
            if (!hasDataForPeriod) {
              return (
                <div className="p-8 bg-[#0b1222] border border-slate-800 rounded-xl text-center space-y-2">
                  <ShieldAlert className="w-10 h-10 text-amber-500/50 mx-auto" />
                  <h4 className="text-sm font-black text-white uppercase">Nenhum dado importado para este período</h4>
                  <p className="text-xs text-slate-400">
                    Importe os dados de faturamento e jornadas do mês {selectedMesAno} para habilitar a auditoria de desvios DPO.
                  </p>
                </div>
              );
            }

            if (activeDesviosList.length === 0) {
              return (
                <div className="p-8 bg-[#0b1222] border border-slate-800 rounded-xl text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                  <h4 className="text-sm font-black text-white uppercase">
                    {selectedDesvioDateISO === 'TODAS' 
                      ? 'Nenhum Desvio Identificado no Período' 
                      : `Nenhum Desvio / Excesso de Jornada em ${selectedDesvioDateISO.split('-').reverse().join('/')}`}
                  </h4>
                  <p className="text-xs text-slate-400">
                    A jornada dos colaboradores e o volume operado no filtro selecionado estão 100% alinhados com as diretrizes DPO da Ambev.
                  </p>
                </div>
              );
            }

            return (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>Exibindo <strong>{activeDesviosList.length}</strong> alerta(s) de desvio {selectedDesvioDateISO !== 'TODAS' && `para a data ${selectedDesvioDateISO.split('-').reverse().join('/')}`}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeDesviosList.map((desvio) => (
                    <div 
                      key={desvio.id} 
                      className={`p-4 rounded-xl border-2 space-y-2.5 shadow-lg ${
                        desvio.severidade === 'CRITICA' 
                          ? 'bg-rose-950/30 border-rose-500/60 text-rose-200' 
                          : desvio.tipo === 'MONTAGEM_ESTENDIDA_MANHA'
                          ? 'bg-indigo-950/30 border-indigo-500/60 text-indigo-200'
                          : 'bg-amber-950/30 border-amber-500/60 text-amber-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                          desvio.severidade === 'CRITICA' 
                            ? 'bg-rose-500 text-slate-950' 
                            : desvio.tipo === 'MONTAGEM_ESTENDIDA_MANHA'
                            ? 'bg-indigo-500 text-white'
                            : 'bg-amber-500 text-slate-950'
                        }`}>
                          {desvio.tipo.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-400">
                          Data: {desvio.dataStr}
                        </span>
                      </div>

                      <h4 className="text-sm font-black uppercase tracking-tight text-white flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        {desvio.titulo}
                      </h4>

                      <p className="text-xs text-slate-300 leading-relaxed">
                        {desvio.descricao}
                      </p>

                      <div className="p-2.5 bg-[#0b1222] border border-slate-800 rounded-lg text-[11px] space-y-1">
                        <div className="font-bold text-amber-400">💡 Ação Corretiva Recomendada:</div>
                        <div className="text-slate-300">{desvio.acaoRecomendada}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* GUIA DE PONTOS DE JORNADA DOS COLABORADORES */}
      {activeSubTab === 'pontos_jornada' && (
        <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" /> Registros de Início e Término de Jornada dos Colaboradores
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Pontos computados automaticamente via painéis de Ajudantes, Empilhadores e Conferentes ou inseridos manualmente.
              </p>
            </div>

            <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20">
              Total no Mês: {journeysInMonth.length} Ponto(s)
            </span>
          </div>

          {journeysInMonth.length > 0 ? (
            <div className="border border-slate-800 rounded-xl overflow-hidden shadow-md">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#0b1222] text-slate-300 font-black uppercase tracking-wider text-[10px] border-b border-slate-800">
                      <th className="p-3">Colaborador Operacional</th>
                      <th className="p-3">Cargo</th>
                      <th className="p-3">Data</th>
                      <th className="p-3">Hora Início</th>
                      <th className="p-3">Hora Término</th>
                      <th className="p-3 text-center">Duração (Horas)</th>
                      <th className="p-3">Observações / Origem</th>
                      <th className="p-3 text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-[#0b1222] text-slate-200">
                    {journeysInMonth.map((jrn) => (
                      <tr key={jrn.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-bold text-white uppercase">
                          {jrn.colaboradorNome}
                        </td>
                        <td className="p-3">
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase ${
                            jrn.cargo === 'Conferente' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                            jrn.cargo === 'Empilhador' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' :
                            'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}>
                            {jrn.cargo}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-300">
                          {jrn.dataStr}
                        </td>
                        <td className="p-3 font-mono text-emerald-400 font-bold">
                          {jrn.horaInicio}
                        </td>
                        <td className="p-3 font-mono text-rose-400 font-bold">
                          {jrn.horaFim}
                        </td>
                        <td className="p-3 font-mono text-center font-black text-amber-400 text-sm">
                          {jrn.duracaoHoras.toFixed(2)}h
                        </td>
                        <td className="p-3 text-slate-400 text-[11px] italic">
                          {jrn.observacoes || 'Registro de Ponto'}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleDeletePoint(jrn.id, jrn.colaboradorNome)}
                            className="p-1.5 bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white rounded text-[10px] cursor-pointer transition-all border border-rose-500/30 mx-auto"
                            title="Excluir Ponto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-8 bg-[#0b1222] border border-slate-800 rounded-xl text-center space-y-2">
              <Clock className="w-8 h-8 text-amber-500/50 mx-auto" />
              <p className="text-sm font-bold text-white">
                Nenhum dado importado para este período
              </p>
              <p className="text-xs text-slate-400">
                Clique em "+ Ponto Manual / Retroativo" ou "Importar Planilha WLP" para cadastrar pontos.
              </p>
            </div>
          )}
        </div>
      )}

      {/* GUIA DE VISÃO GERAL DO INDICADOR WLP */}
      {activeSubTab === 'indicador' && (
        <div className="space-y-6">
          {!hasDataForPeriod && (
            <div className="p-6 bg-[#0b1222] border border-amber-500/30 rounded-2xl text-center space-y-2 shadow-lg">
              <FileSpreadsheet className="w-8 h-8 text-amber-400 mx-auto" />
              <h4 className="text-sm font-black text-white uppercase">Nenhum dado importado para este período</h4>
              <p className="text-xs text-slate-400 max-w-lg mx-auto">
                Não existem registros reais de faturamento ou jornada cadastrados para {selectedMesAno}. Importe uma planilha oficial de WLP/Faturamento ou registre pontos manualmente para alimentar os indicadores.
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* CARD DE DETALHAMENTO DA FÓRMULA WLP */}
          <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <h3 className="text-sm font-black uppercase text-amber-400 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-amber-400" /> Base de Cálculo do WLP (Ambev Padrão)
            </h3>

            <div className="p-4 bg-[#0b1222] border border-slate-800 rounded-xl text-xs space-y-3">
              <div className="font-mono bg-[#111a30] p-3 rounded-lg border border-amber-500/30 text-amber-300 font-bold">
                WLP = Volume Total Faturado (HL) ÷ Total de Horas Operacionais (HH)
              </div>

              <ul className="space-y-2 text-slate-300 list-disc list-inside text-[11px]">
                <li>
                  <strong>Volume Total Faturado (HL):</strong> Soma de todos os hectolitros faturados da unidade no mês.
                </li>
                <li>
                  <strong>Total Horas Operacionais (HH):</strong> Soma das horas trabalhadas por Ajudantes, Empilhadores e Conferentes.
                </li>
                <li>
                  <strong>Média por Colaborador:</strong> Total Horas Operacionais ÷ Total de Colaboradores com ponto registrado.
                </li>
              </ul>
            </div>
          </div>

          {/* CARD DE RESUMO DE JORNADAS POR CARGO */}
          <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <h3 className="text-sm font-black uppercase text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-sky-400" /> Distribuição de Horas Trabalhadas por Cargo
            </h3>

            {(() => {
              const totalAjudantesHrs = journeysInMonth
                .filter(j => j.cargo === 'Ajudante')
                .reduce((acc, c) => acc + c.duracaoHoras, 0);

              const totalEmpilhadoresHrs = journeysInMonth
                .filter(j => j.cargo === 'Empilhador')
                .reduce((acc, c) => acc + c.duracaoHoras, 0);

              const totalConferentesHrs = journeysInMonth
                .filter(j => j.cargo === 'Conferente')
                .reduce((acc, c) => acc + c.duracaoHoras, 0);

              return (
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-[#0b1222] border border-emerald-500/30 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase text-emerald-400 block">Ajudantes Operacionais</span>
                      <span className="text-base font-black font-mono text-white mt-0.5 block">
                        {totalAjudantesHrs.toFixed(1)} HH
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      {journeysInMonth.filter(j => j.cargo === 'Ajudante').length} ponto(s)
                    </span>
                  </div>

                  <div className="p-3 bg-[#0b1222] border border-sky-500/30 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase text-sky-400 block">Empilhadores de Pátio</span>
                      <span className="text-base font-black font-mono text-white mt-0.5 block">
                        {totalEmpilhadoresHrs.toFixed(1)} HH
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      {journeysInMonth.filter(j => j.cargo === 'Empilhador').length} ponto(s)
                    </span>
                  </div>

                  <div className="p-3 bg-[#0b1222] border border-amber-500/30 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase text-amber-400 block">Conferentes de Carregamento</span>
                      <span className="text-base font-black font-mono text-white mt-0.5 block">
                        {totalConferentesHrs.toFixed(1)} HH
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      {journeysInMonth.filter(j => j.cargo === 'Conferente').length} ponto(s)
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>
          </div>
        </div>
      )}

      {/* GUIA DE COLABORADORES PRESENTES NO DIA */}
      {activeSubTab === 'presentes_dia' && (
        <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-5 space-y-5 shadow-xl">
          {/* TOPO: SELETOR DE DIA E RESUMO DE PRESENÇA */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-amber-400" /> Painel de Colaboradores Presentes no Dia
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Consulte e gerencie a lista oficial de presença dos colaboradores para o dia selecionado.
              </p>
            </div>

            {/* SELETOR DE DIA */}
            <div className="flex flex-wrap items-center gap-2 bg-[#0b1222] p-2 rounded-xl border border-slate-800">
              <span className="text-[10px] font-black uppercase text-slate-400 px-1">Data de Consulta:</span>
              <input
                type="date"
                value={selectedDayPresenceISO}
                onChange={(e) => setSelectedDayPresenceISO(e.target.value)}
                className="bg-[#111a30] border border-amber-500/50 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-amber-300 outline-none focus:border-amber-400"
              />
              <button
                type="button"
                onClick={() => setSelectedDayPresenceISO(new Date().toISOString().split('T')[0])}
                className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500 hover:text-slate-950 text-amber-300 font-bold text-[10px] uppercase rounded-lg border border-amber-500/30 transition-all cursor-pointer"
              >
                Hoje
              </button>
            </div>
          </div>

          {/* DADOS CALCULADOS PARA O DIA SELECIONADO */}
          {(() => {
            const dayJourneys = jornadas.filter(j => j.dataISO === selectedDayPresenceISO);
            const fatRec = dailyFaturados.find(f => f.dataISO === selectedDayPresenceISO);
            const dayVolumeHL = fatRec ? fatRec.volumeHL : 0;
            const dayTotalHH = dayJourneys.reduce((acc, c) => acc + c.duracaoHoras, 0);
            const dayWLP = dayTotalHH > 0 && dayVolumeHL > 0 ? dayVolumeHL / dayTotalHH : 0;

            const presentNames = new Set(dayJourneys.map(j => j.colaboradorNome.toLowerCase().trim()));

            const allColabList = [...LISTA_COLABORADORES_OFICIAIS];
            dayJourneys.forEach(j => {
              const exists = allColabList.some(c => c.nome.toLowerCase().trim() === j.colaboradorNome.toLowerCase().trim());
              if (!exists) {
                allColabList.push({
                  matricula: `EXTRA-${Math.floor(Math.random() * 9000 + 1000)}`,
                  nome: j.colaboradorNome,
                  cargo: j.cargo || 'Ajudante',
                  cpf: '000.000.000-00',
                  turno: 'Turno 1',
                  funcaoGroup: 'Ajudante'
                });
              }
            });

            const totalColabsCount = allColabList.length;
            const presentCount = allColabList.filter(c => presentNames.has(c.nome.toLowerCase().trim())).length;
            const absentCount = totalColabsCount - presentCount;

            const filteredColabs = allColabList.filter(colab => {
              const nameMatch = colab.nome.toLowerCase().includes(presenceSearchTerm.toLowerCase()) ||
                                colab.matricula.toLowerCase().includes(presenceSearchTerm.toLowerCase());
              const cargoMatch = presenceCargoFilter === 'TODOS' || colab.cargo === presenceCargoFilter;
              
              const isPres = presentNames.has(colab.nome.toLowerCase().trim());
              let statusMatch = true;
              if (presenceStatusFilter === 'PRESENTES') statusMatch = isPres;
              if (presenceStatusFilter === 'AUSENTES') statusMatch = !isPres;

              return nameMatch && cargoMatch && statusMatch;
            });

            return (
              <div className="space-y-4">
                {/* METRICS RESUMO DO DIA */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div className="p-3 bg-[#0b1222] border border-emerald-500/30 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase text-emerald-400 block">Presentes no Dia</span>
                      <span className="text-xl font-black font-mono text-white mt-0.5 block">{presentCount} Colab(s)</span>
                    </div>
                    <UserCheck className="w-6 h-6 text-emerald-400" />
                  </div>

                  <div className="p-3 bg-[#0b1222] border border-rose-500/30 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase text-rose-400 block">Ausentes no Dia</span>
                      <span className="text-xl font-black font-mono text-white mt-0.5 block">{absentCount} Colab(s)</span>
                    </div>
                    <UserX className="w-6 h-6 text-rose-400" />
                  </div>

                  <div className="p-3 bg-[#0b1222] border border-sky-500/30 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase text-sky-400 block">Total HH Trabalhadas</span>
                      <span className="text-xl font-black font-mono text-white mt-0.5 block">{dayTotalHH.toFixed(1)} HH</span>
                    </div>
                    <Clock className="w-6 h-6 text-sky-400" />
                  </div>

                  <div className="p-3 bg-[#0b1222] border border-amber-500/30 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase text-amber-400 block">Volume HL Faturado</span>
                      <span className="text-xl font-black font-mono text-white mt-0.5 block">
                        {dayVolumeHL > 0 ? `${dayVolumeHL.toFixed(1)} HL` : '0 HL'}
                      </span>
                    </div>
                    <FileSpreadsheet className="w-6 h-6 text-amber-400" />
                  </div>

                  <div className="p-3 bg-[#0b1222] border border-purple-500/30 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase text-purple-400 block">WLP do Dia (HL/HH)</span>
                      <span className="text-xl font-black font-mono text-white mt-0.5 block">
                        {dayWLP > 0 ? dayWLP.toFixed(2) : '0.00'}
                      </span>
                    </div>
                    <Award className="w-6 h-6 text-purple-400" />
                  </div>
                </div>

                {/* BARRA DE PESQUISA E FILTROS */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0b1222] p-3 rounded-xl border border-slate-800">
                  <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
                    <div className="relative flex-1 min-w-[180px]">
                      <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Buscar colaborador ou matrícula..."
                        value={presenceSearchTerm}
                        onChange={(e) => setPresenceSearchTerm(e.target.value)}
                        className="w-full bg-[#111a30] border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-400"
                      />
                    </div>

                    <select
                      value={presenceCargoFilter}
                      onChange={(e) => setPresenceCargoFilter(e.target.value)}
                      className="bg-[#111a30] border border-slate-700 text-xs font-bold text-slate-300 rounded-lg px-3 py-1.5 outline-none focus:border-amber-400 cursor-pointer"
                    >
                      <option value="TODOS">Todos os Cargos</option>
                      <option value="Ajudante">Ajudante</option>
                      <option value="Empilhador">Empilhador</option>
                      <option value="Conferente">Conferente</option>
                    </select>

                    <select
                      value={presenceStatusFilter}
                      onChange={(e) => setPresenceStatusFilter(e.target.value as any)}
                      className="bg-[#111a30] border border-slate-700 text-xs font-bold text-slate-300 rounded-lg px-3 py-1.5 outline-none focus:border-amber-400 cursor-pointer"
                    >
                      <option value="TODOS">Todos os Status</option>
                      <option value="PRESENTES">Apenas Presentes</option>
                      <option value="AUSENTES">Apenas Ausentes</option>
                    </select>
                  </div>

                  <span className="text-xs font-mono font-bold text-slate-400">
                    Exibindo {filteredColabs.length} de {totalColabsCount} colaboradores
                  </span>
                </div>

                {/* TABELA / LISTA DE COLABORADORES */}
                <div className="border border-slate-800 rounded-xl overflow-hidden shadow-md">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-[#0b1222] text-slate-300 font-black uppercase tracking-wider text-[10px] border-b border-slate-800">
                          <th className="p-3">Matrícula</th>
                          <th className="p-3">Colaborador Operacional</th>
                          <th className="p-3">Cargo</th>
                          <th className="p-3 text-center">Status no Dia</th>
                          <th className="p-3 text-center">Horário de Jornada</th>
                          <th className="p-3 text-center">Total HH</th>
                          <th className="p-3 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 bg-[#0b1222] text-slate-200">
                        {filteredColabs.map((colab) => {
                          const jrn = dayJourneys.find(j => j.colaboradorNome.toLowerCase().trim() === colab.nome.toLowerCase().trim());
                          const isPres = !!jrn;

                          return (
                            <tr key={colab.matricula} className="hover:bg-slate-800/40 transition-colors">
                              <td className="p-3 font-mono font-bold text-slate-400 text-[11px]">
                                {colab.matricula}
                              </td>
                              <td className="p-3 font-bold text-white uppercase flex items-center gap-2">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-[10px] border ${
                                  isPres ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-slate-800 text-slate-500 border-slate-700'
                                }`}>
                                  {colab.nome.substring(0, 2).toUpperCase()}
                                </div>
                                <span>{colab.nome}</span>
                              </td>
                              <td className="p-3">
                                <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase ${
                                  colab.cargo === 'Conferente' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                                  colab.cargo === 'Empilhador' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' :
                                  'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                }`}>
                                  {colab.cargo}
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                {isPres ? (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 inline-flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Presente
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-slate-800 text-slate-500 border border-slate-700 inline-flex items-center gap-1">
                                    <UserX className="w-3 h-3 text-slate-500" /> Ausente
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-center font-mono font-bold">
                                {isPres ? (
                                  <span className="text-emerald-400">{jrn.horaInicio} - {jrn.horaFim}</span>
                                ) : (
                                  <span className="text-slate-600">-</span>
                                )}
                              </td>
                              <td className="p-3 text-center font-mono font-black text-amber-400">
                                {isPres ? `${jrn.duracaoHoras.toFixed(2)}h` : '-'}
                              </td>
                              <td className="p-3 text-center">
                                {isPres ? (
                                  <button
                                    onClick={() => handleDeletePoint(jrn.id, jrn.colaboradorNome)}
                                    className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white rounded text-[10px] font-bold uppercase transition-all border border-rose-500/30 flex items-center gap-1 mx-auto cursor-pointer"
                                    title="Remover Presença do Dia"
                                  >
                                    <Trash2 className="w-3 h-3" /> Remover
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setQuickMarkColabName(colab.nome);
                                      setQuickMarkColabCargo(colab.cargo as any || 'Ajudante');
                                      setShowQuickMarkModal(true);
                                    }}
                                    className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 rounded text-[10px] font-bold uppercase transition-all border border-emerald-500/30 flex items-center gap-1 mx-auto cursor-pointer"
                                    title="Marcar Presença do Colaborador"
                                  >
                                    <Plus className="w-3 h-3" /> Presença
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* GUIA PNP AJUDANTE, EMPILHADOR & CONFERENTE (PRODUTIVIDADE INDIVIDUAL) */}
      {(activeSubTab === 'pnp_ajudante' || activeSubTab === 'pnp_empilhador' || activeSubTab === 'pnp_conferente') && (
        <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-5 space-y-5 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
                  {activeSubTab === 'pnp_ajudante' ? 'PAINEL PNP AJUDANTE' : (activeSubTab === 'pnp_conferente' ? 'PAINEL PNP CONFERENTE' : 'PAINEL PNP EMPILHADOR')}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Mês Referência: {selectedMesAno}
                </span>
              </div>
              <h3 className="text-base font-black uppercase tracking-wider text-white mt-1 flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                Produtividade Nível Individual (PNP) — {activeSubTab === 'pnp_ajudante' ? 'Ajudantes Operacionais' : (activeSubTab === 'pnp_conferente' ? 'Conferentes de Carga/Armazém' : 'Empilhadores de Paletes')}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Acompanhamento detalhado de pontos registrados, horas trabalhadas (HH), faturamento atribuído e produtividade por colaborador agrupado pelo cargo do apontamento.
              </p>
            </div>

            <div className="flex items-center gap-3 bg-[#0b1222] p-2 rounded-xl border border-slate-800 shrink-0">
              <span className="text-[10px] font-black uppercase text-slate-400">Total Faturado no Mês:</span>
              <span className="text-sm font-black font-mono text-emerald-400">{metrics.volumeFaturadoHL.toLocaleString('pt-BR')} HL</span>
            </div>
          </div>

          {/* TABELA DE PRODUTIVIDADE INDIVIDUAL DO CARGO SELECIONADO */}
          {(() => {
            const targetCargo = activeSubTab === 'pnp_ajudante' 
              ? 'Ajudante' 
              : (activeSubTab === 'pnp_conferente' ? 'Conferente' : 'Empilhador');
            const mesNum = parseInt(selectedMesAno.split('/')[0], 10);

            // Dynamically collect collaborators for the target Cargo based on imported journey records & registered profiles
            const colabsMap = new Map<string, { nome: string; matricula: string; cargo: string; turno: string }>();

            // 1. Check journey records in this month
            journeysInMonth.forEach(j => {
              const norm = normalizeCollaboratorName(j.colaboradorNome);
              const info = getCollaboratorOfficialInfo(norm, empresaId);
              const effectiveCargo = j.cargo || info.cargo || 'Ajudante';

              if (effectiveCargo.toUpperCase().includes(targetCargo.toUpperCase())) {
                if (!colabsMap.has(norm)) {
                  colabsMap.set(norm, {
                    nome: norm,
                    matricula: info.nomeOficial ? (LISTA_COLABORADORES_OFICIAIS.find(c => c.nome === info.nomeOficial)?.matricula || `G${1000 + colabsMap.size + 1}`) : `G${1000 + colabsMap.size + 1}`,
                    cargo: effectiveCargo,
                    turno: 'MANHÃ'
                  });
                }
              }
            });

            // 2. Also check official and registered list
            LISTA_COLABORADORES_OFICIAIS.forEach(c => {
              const norm = normalizeCollaboratorName(c.nome);
              const info = getCollaboratorOfficialInfo(norm, empresaId);
              if (info.cargo.toUpperCase().includes(targetCargo.toUpperCase())) {
                if (!colabsMap.has(norm)) {
                  colabsMap.set(norm, {
                    nome: c.nome,
                    matricula: c.matricula,
                    cargo: info.cargo,
                    turno: c.turno
                  });
                }
              }
            });

            const colabsToDisplay = Array.from(colabsMap.values());
            const metaPnp = getMetaOficialPnp(selectedMesAno);

            if (!hasDataForPeriod) {
              return (
                <div className="p-8 bg-[#0b1222] border border-slate-800 rounded-xl text-center space-y-2">
                  <Users className="w-8 h-8 text-amber-500/50 mx-auto" />
                  <p className="text-sm font-bold text-white">
                    Nenhum dado importado para este período
                  </p>
                  <p className="text-xs text-slate-400">
                    Não existem apontamentos de jornada ou faturamento para {selectedMesAno}.
                  </p>
                </div>
              );
            }

            const realPnpMedio = metrics.wlpCalculado > 0 ? metrics.wlpCalculado * 0.98 : 0;
            const statusPct = metaPnp > 0 ? ((realPnpMedio / metaPnp) - 1) * 100 : 0;

            return (
              <div className="space-y-4">
                {/* BANNER META x REAL PNP LADO A LADO */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#0b1222] p-4 rounded-xl border border-slate-800">
                  <div className="flex flex-col border-r border-slate-800/80 pr-3">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Meta PNP Oficial</span>
                    <span className="text-xl font-black font-mono text-amber-400 mt-0.5">{metaPnp.toFixed(2)} HL/HH</span>
                    <span className="text-[9px] text-slate-500">Ambev / DPO {selectedMesAno}</span>
                  </div>
                  <div className="flex flex-col border-r border-slate-800/80 px-3">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Real PNP Médio ({targetCargo}s)</span>
                    <span className="text-xl font-black font-mono text-emerald-400 mt-0.5">
                      {realPnpMedio.toFixed(2)} HL/HH
                    </span>
                    <span className="text-[9px] text-slate-500">Produtividade Realizada no Mês</span>
                  </div>
                  <div className="flex flex-col justify-center px-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Status de Desempenho</span>
                    <span className={`text-xs font-black px-3 py-1.5 rounded-lg border text-center ${
                      statusPct >= 0 
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                        : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                    }`}>
                      {statusPct >= 0 ? `Acima da Meta (+${statusPct.toFixed(1)}%)` : `Abaixo da Meta (${statusPct.toFixed(1)}%)`}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#0b1222]">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-[#111a30] text-[10px] font-black uppercase text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="p-3">Colaborador</th>
                        <th className="p-3 text-center">Cargo / Perfil</th>
                        <th className="p-3 text-center">Turno Oficial</th>
                        <th className="p-3 text-center">Dias Trabalhados</th>
                        <th className="p-3 text-center">Total Horas (HH)</th>
                        <th className="p-3 text-center">Meta PNP</th>
                        <th className="p-3 text-center">Real PNP (HL/HH)</th>
                        <th className="p-3 text-center">Desempenho x Meta</th>
                        <th className="p-3 text-center">Status / Exceção</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium">
                      {colabsToDisplay.map((colab) => {
                        const excCheck = isColaboradorExcluidoWlp(colab.nome, mesNum, colab.cargo);
                        
                        // Jornadas deste colaborador no mês
                        const colabJornadas = journeysInMonth.filter(j => 
                          normalizeCollaboratorName(j.colaboradorNome) === colab.nome
                        );

                        const totalHorasHH = colabJornadas.reduce((acc, curr) => acc + (curr.duracaoHoras || 0), 0);
                        const diasTrabalhados = new Set(colabJornadas.map(j => j.dataISO)).size;
                        
                        // Volume proporcional por colaborador
                        const volumeEquip = colabJornadas.length > 0 && metrics.colabCount > 0
                          ? metrics.volumeFaturadoHL / metrics.colabCount
                          : 0;
                        
                        const wlpIndiv = totalHorasHH > 0 ? (volumeEquip / totalHorasHH) : 0;
                        const pctMetaColab = metaPnp > 0 ? (wlpIndiv / metaPnp) * 100 : 0;

                        return (
                          <tr key={colab.matricula} className="hover:bg-slate-800/40 transition-all">
                            <td className="p-3 flex items-center gap-2.5 font-bold text-white">
                              <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-[11px] font-black text-amber-300 shrink-0">
                                {colab.nome.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="text-xs font-bold text-white">{colab.nome}</div>
                                <div className="text-[10px] text-slate-400 font-mono">Matrícula: #{colab.matricula}</div>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase bg-slate-800 text-slate-300 border border-slate-700">
                                {colab.cargo}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                colab.turno === 'Noturno' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}>
                                {colab.turno}
                              </span>
                            </td>
                            <td className="p-3 text-center font-mono font-bold text-slate-200">
                              {diasTrabalhados} dias
                            </td>
                            <td className="p-3 text-center font-mono font-black text-amber-400">
                              {totalHorasHH.toFixed(2)}h
                            </td>
                            <td className="p-3 text-center font-mono font-bold text-amber-400">
                              {metaPnp.toFixed(2)}
                            </td>
                            <td className="p-3 text-center font-mono font-black text-emerald-400">
                              {excCheck.excluido ? '-' : `${wlpIndiv.toFixed(2)}`}
                            </td>
                            <td className="p-3 text-center font-mono font-bold text-xs">
                              {excCheck.excluido ? (
                                <span className="text-slate-500">-</span>
                              ) : pctMetaColab >= 100 ? (
                                <span className="text-emerald-400 font-black px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30">
                                  {pctMetaColab.toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-amber-400 font-black px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30">
                                  {pctMetaColab.toFixed(1)}%
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {excCheck.excluido ? (
                                <span className="px-2.5 py-1 rounded text-[10px] font-black uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40 inline-flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3 text-rose-400" /> {excCheck.motivo}
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Ativo WLP
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* MODAL RÁPIDO PARA MARCAR PRESENÇA DO COLABORADOR */}
      {showQuickMarkModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111a30] border-2 border-emerald-500/50 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black uppercase text-emerald-400 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-400" /> Marcar Presença — {quickMarkColabName}
              </h3>
              <button
                onClick={() => setShowQuickMarkModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const parts = selectedDayPresenceISO.split('-');
                const dataStr = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : selectedDayPresenceISO;
                const mesAno = parts.length === 3 ? `${parts[1]}/${parts[0]}` : selectedMesAno;
                const durHrs = calcShiftHours(quickMarkStart, quickMarkEnd);

                const newJrn: JornadaRecord = {
                  id: `jrn-${Date.now()}`,
                  colaboradorNome: quickMarkColabName,
                  cargo: quickMarkColabCargo,
                  dataStr,
                  dataISO: selectedDayPresenceISO,
                  mesAno,
                  horaInicio: quickMarkStart,
                  horaFim: quickMarkEnd,
                  duracaoHoras: durHrs,
                  empresaId,
                  observacoes: 'Presença lançada via Painel de Presença Diária',
                  criadoEm: new Date().toISOString()
                };

                saveJornadaRecord(newJrn);
                setJornadas(getStoredJornadas(empresaId));
                setShowQuickMarkModal(false);
                window.dispatchEvent(new CustomEvent('jornadas_updated'));
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                  Data Selecionada
                </label>
                <input
                  type="text"
                  disabled
                  value={selectedDayPresenceISO.split('-').reverse().join('/')}
                  className="w-full bg-[#0b1222] border border-slate-700 rounded-lg p-2.5 font-mono text-slate-300 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Hora Início *
                  </label>
                  <input
                    type="time"
                    value={quickMarkStart}
                    onChange={(e) => setQuickMarkStart(e.target.value)}
                    className="w-full bg-[#0b1222] border border-slate-700 rounded-lg p-2.5 text-white font-mono font-bold outline-none focus:border-emerald-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Hora Término *
                  </label>
                  <input
                    type="time"
                    value={quickMarkEnd}
                    onChange={(e) => setQuickMarkEnd(e.target.value)}
                    className="w-full bg-[#0b1222] border border-slate-700 rounded-lg p-2.5 text-white font-mono font-bold outline-none focus:border-emerald-400"
                    required
                  />
                </div>
              </div>

              <div className="p-3 bg-[#0b1222] border border-slate-800 rounded-xl flex items-center justify-between font-mono text-xs">
                <span className="text-slate-400">Total HH:</span>
                <span className="font-black text-emerald-400">{calcShiftHours(quickMarkStart, quickMarkEnd)} horas</span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuickMarkModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold uppercase cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase rounded-xl cursor-pointer shadow-lg"
                >
                  Confirmar Presença
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA ADICIONAR PONTO MANUAL / RETROATIVO */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111a30] border-2 border-amber-500/50 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black uppercase text-amber-400 flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-400" /> Cadastrar Ponto Retroativo de Jornada
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManualPoint} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                  Nome do Colaborador *
                </label>
                <input
                  type="text"
                  placeholder="Selecione ou digite o nome completo..."
                  value={colabNome}
                  onChange={(e) => setColabNome(e.target.value)}
                  list="colabs_official_list"
                  className="w-full bg-[#0b1222] border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-amber-400 uppercase"
                  required
                />
                <datalist id="colabs_official_list">
                  {LISTA_COLABORADORES_OFICIAIS.map(c => (
                    <option key={c.matricula || c.nome} value={c.nome} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Cargo Operacional
                  </label>
                  <select
                    value={cargoColab}
                    onChange={(e: any) => setCargoColab(e.target.value)}
                    className="w-full bg-[#0b1222] border border-slate-700 rounded-lg p-2.5 text-white font-bold outline-none focus:border-amber-400"
                  >
                    <option value="Ajudante">Ajudante</option>
                    <option value="Empilhador">Empilhador</option>
                    <option value="Conferente">Conferente</option>
                    <option value="Operacional">Operacional Geral</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Data do Ponto
                  </label>
                  <input
                    type="date"
                    value={dataPontoISO}
                    onChange={(e) => setDataPontoISO(e.target.value)}
                    className="w-full bg-[#0b1222] border border-slate-700 rounded-lg p-2.5 text-white font-mono outline-none focus:border-amber-400"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Hora Início Jornada
                  </label>
                  <input
                    type="time"
                    value={horaInicio}
                    onChange={(e) => setHoraInicio(e.target.value)}
                    className="w-full bg-[#0b1222] border border-slate-700 rounded-lg p-2.5 text-white font-mono outline-none focus:border-amber-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Hora Fim Jornada
                  </label>
                  <input
                    type="time"
                    value={horaFim}
                    onChange={(e) => setHoraFim(e.target.value)}
                    className="w-full bg-[#0b1222] border border-slate-700 rounded-lg p-2.5 text-white font-mono outline-none focus:border-amber-400"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                  Observações / Justificativa
                </label>
                <input
                  type="text"
                  placeholder="Ex: Ajuste manual de ponto retroativo"
                  value={obsPonto}
                  onChange={(e) => setObsPonto(e.target.value)}
                  className="w-full bg-[#0b1222] border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black uppercase rounded-xl cursor-pointer"
                >
                  Salvar Ponto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA IMPORTAÇÃO RETROATIVA DE PLANILHA EXCEL E CSV */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111a30] border-2 border-amber-500/50 rounded-2xl w-full max-w-2xl p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black uppercase text-amber-400 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-amber-400" /> Importar Planilha de Pontos & WLP Retroativo (Ano 2026)
              </h3>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFeedback(null);
                }}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SEÇÃO 1: UPLOAD ARQUIVO JSON */}
            <div className="p-4 bg-[#0b1222] border border-purple-500/40 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase text-purple-300 flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-purple-400" /> Opção 1: Upload de Arquivo JSON WLP (.json)
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Importe um arquivo JSON completo. Os dados informados de janeiro até o último registro reescreverão os registros e salvarão no código/armazenamento da plataforma.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={downloadWlpSampleJson}
                  className="px-3 py-1.5 bg-purple-500/20 border border-purple-500/40 text-purple-200 hover:bg-purple-500 hover:text-slate-950 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <Download className="w-3.5 h-3.5 text-purple-400" /> Modelo .json
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleJsonFileUpload}
                  disabled={isImportingFile}
                  className="block w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-black file:uppercase file:bg-purple-600 file:text-white hover:file:bg-purple-500 file:cursor-pointer bg-[#111a30] border border-purple-500/30 rounded-xl p-1"
                />
              </div>
            </div>

            {/* SEÇÃO 2: UPLOAD DE ARQUIVO EXCEL */}
            <div className="p-4 bg-[#0b1222] border border-emerald-500/30 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase text-emerald-400 flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-emerald-400" /> Opção 2: Upload de Planilha Excel (.xlsx, .xls, .csv)
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Selecione a planilha Excel para importar faturamentos diários e pontos de início/fim de jornada desde o início do ano.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={exportWlpModelExcel}
                  className="px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500 hover:text-slate-950 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <Download className="w-3.5 h-3.5" /> Modelo .xlsx
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleExcelFileUpload}
                  disabled={isImportingFile}
                  className="block w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-black file:uppercase file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 file:cursor-pointer bg-[#111a30] border border-slate-700 rounded-xl p-1"
                />
              </div>

              {importFeedback && (
                <div className={`p-3 rounded-lg text-xs font-mono font-bold ${
                  importFeedback.startsWith('✅') 
                    ? 'bg-emerald-950/60 border border-emerald-500/50 text-emerald-300' 
                    : 'bg-rose-950/60 border border-rose-500/50 text-rose-300'
                }`}>
                  {importFeedback}
                </div>
              )}
            </div>

            {/* SEÇÃO 2: COLAR CSV / TEXTO */}
            <div className="space-y-2 text-xs pt-1 border-t border-slate-800">
              <h4 className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-amber-400" /> Opção 2: Colar Dados CSV / Texto Separado por Ponto e Vírgula (;)
              </h4>

              <div className="bg-[#0b1222] p-2.5 rounded-lg border border-slate-800 text-[10px] font-mono text-slate-400">
                <code>Colaborador;Cargo;Data;HoraInicio;HoraFim;Observacao</code>
              </div>

              <textarea
                rows={5}
                value={csvRawInput}
                onChange={(e) => setCsvRawInput(e.target.value)}
                placeholder={SAMPLE_CSV_TEMPLATE}
                className="w-full bg-[#0b1222] border border-slate-700 rounded-xl p-3 font-mono text-xs text-white outline-none focus:border-amber-400 resize-none"
              />

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setCsvRawInput(SAMPLE_CSV_TEMPLATE)}
                  className="text-amber-400 hover:underline text-[11px] font-bold cursor-pointer"
                >
                  Carregar Exemplo de Texto
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowImportModal(false);
                      setImportFeedback(null);
                    }}
                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold uppercase cursor-pointer"
                  >
                    Fechar
                  </button>

                  <button
                    type="button"
                    onClick={handleProcessCsvImport}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black uppercase rounded-xl cursor-pointer flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" /> Processar Texto CSV
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA REGISTRO DE FATURAMENTO DIÁRIO (21:00) */}
      {showFaturadoModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111a30] border-2 border-emerald-500/50 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black uppercase text-emerald-400 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" /> Registro de Hectolitros Faturados (HL)
              </h3>
              <button
                onClick={() => setShowFaturadoModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDailyFaturado} className="space-y-4 text-xs">
              <div className="p-3 bg-[#0b1222] border border-amber-500/30 rounded-xl text-slate-300 text-[11px] leading-relaxed">
                <span className="font-bold text-amber-400 block mb-1">📌 Protocolo de Fechamento Administrativo (21:00):</span>
                Informe o hectolitro faturado oficial do dia para vincular à jornada dos colaboradores de carregamento e recalcular o indicador WLP (HL/HH).
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                  Data do Faturamento *
                </label>
                <input
                  type="date"
                  value={faturadoDataISO}
                  onChange={(e) => setFaturadoDataISO(e.target.value)}
                  className="w-full bg-[#0b1222] border border-slate-700 rounded-lg p-2.5 text-white font-mono outline-none focus:border-emerald-400"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                  Volume Hectolitro Faturado (HL) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Ex: 680.5"
                  value={faturadoHLInput}
                  onChange={(e) => setFaturadoHLInput(Number(e.target.value))}
                  className="w-full bg-[#0b1222] border border-emerald-500/50 rounded-lg p-2.5 font-mono font-black text-lg text-emerald-400 outline-none focus:border-emerald-400"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {faturadoHLInput < 450 ? '⚠️ Volume considerado reduzido. Não é permitida a realização de horas extras neste dia.' : '✅ Volume padrão de faturamento.'}
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFaturadoModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase rounded-xl cursor-pointer shadow-lg"
                >
                  Salvar Faturamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA EDIÇÃO RETROATIVA DO HISTÓRICO WLP DO DIA */}
      {editingDateISO && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111a30] border-2 border-amber-500/60 rounded-2xl w-full max-w-2xl p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black uppercase text-amber-400 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-400" /> Edição Retroativa do Registro WLP — Dia {editingDateISO.split('-').reverse().join('/')}
              </h3>
              <button
                onClick={() => setEditingDateISO(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDayEdit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Volume Faturado (HL) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={editVolumeHL}
                    onChange={(e) => setEditVolumeHL(Number(e.target.value))}
                    className="w-full bg-[#0b1222] border border-amber-500/50 rounded-lg p-2.5 font-mono font-black text-amber-400 outline-none focus:border-amber-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Hora Início *
                  </label>
                  <input
                    type="time"
                    value={editHoraInicio}
                    onChange={(e) => setEditHoraInicio(e.target.value)}
                    className="w-full bg-[#0b1222] border border-slate-700 rounded-lg p-2.5 text-white font-mono font-bold outline-none focus:border-amber-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Hora Término *
                  </label>
                  <input
                    type="time"
                    value={editHoraFim}
                    onChange={(e) => setEditHoraFim(e.target.value)}
                    className="w-full bg-[#0b1222] border border-slate-700 rounded-lg p-2.5 text-white font-mono font-bold outline-none focus:border-amber-400"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">
                  Colaboradores Presentes no Dia ({editSelectedColabs.length} Selecionados):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-[#0b1222] rounded-xl border border-slate-800">
                  {LISTA_COLABORADORES_OFICIAIS.map(colab => {
                    const isSelected = editSelectedColabs.includes(colab.nome);
                    return (
                      <button
                        type="button"
                        key={colab.matricula}
                        onClick={() => handleToggleColabInEdit(colab.nome)}
                        className={`p-2 rounded-lg border text-left flex items-center justify-between text-xs transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-500'
                        }`}
                      >
                        <span className="truncate max-w-[140px]">{colab.nome}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-mono ${
                          isSelected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-500'
                        }`}>
                          {isSelected ? '✓ Presente' : 'Ausente'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-3 bg-[#0b1222] border border-slate-800 rounded-xl flex items-center justify-between font-mono text-xs">
                <span className="text-slate-400">Duração do Turno Calculada:</span>
                <span className="font-bold text-amber-400">{calcShiftHours(editHoraInicio, editHoraFim)}h</span>
                <span className="text-slate-400">Total HH do Dia:</span>
                <span className="font-bold text-emerald-400">
                  {(calcShiftHours(editHoraInicio, editHoraFim) * editSelectedColabs.length).toFixed(1)} HH
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingDateISO(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold uppercase cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black uppercase rounded-xl cursor-pointer shadow-lg"
                >
                  Salvar Alterações no Histórico
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default WlpDashboard;
