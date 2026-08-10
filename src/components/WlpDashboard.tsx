import React, { useState, useEffect } from 'react';
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
  CheckCircle2, 
  AlertTriangle,
  HelpCircle,
  X,
  Play,
  Bell,
  AlertCircle,
  ShieldAlert,
  History,
  Info,
  ArrowRight,
  Edit3,
  UserCheck,
  UserX,
  Search
} from 'lucide-react';
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
  getStoredMontagens
} from '../utils/jornadaUtils';
import { LISTA_COLABORADORES_OFICIAIS } from './RankingModule';

interface WlpDashboardProps {
  user: any;
  empresaId?: string;
}

export const WlpDashboard: React.FC<WlpDashboardProps> = ({
  user,
  empresaId = 'demo'
}) => {
  const [selectedMesAno, setSelectedMesAno] = useState<string>('08/2026');
  const [activeSubTab, setActiveSubTab] = useState<'indicador' | 'historico_diario' | 'desvios_dpo' | 'pontos_jornada' | 'presentes_dia'>('indicador');

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
  const [isImportingFile, setIsImportingFile] = useState(false);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);

  // CSV Import text
  const [csvRawInput, setCsvRawInput] = useState('');

  // Retroactive Day Edit State
  const [editingDateISO, setEditingDateISO] = useState<string | null>(null);
  const [editVolumeHL, setEditVolumeHL] = useState<number>(0);
  const [editHoraInicio, setEditHoraInicio] = useState<string>('07:00');
  const [editHoraFim, setEditHoraFim] = useState<string>('16:20');
  const [editSelectedColabs, setEditSelectedColabs] = useState<string[]>([]);

  const calcShiftHours = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    let mins1 = h1 * 60 + m1;
    let mins2 = h2 * 60 + m2;
    if (mins2 < mins1) mins2 += 24 * 60;
    const diffMins = mins2 - mins1;
    return parseFloat((diffMins / 60).toFixed(2));
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
      const result = await importWlpExcelData(file, empresaId);
      setImportFeedback(`✅ Importação concluída! ${result.jornadasCount} pontos de jornada e ${result.faturadosCount} registros de volume importados.`);
      setJornadas(getStoredJornadas(empresaId));
      setDailyFaturados(getStoredDailyFaturado(empresaId));
    } catch (err: any) {
      alert(`Erro na importação da planilha Excel: ${err}`);
      setImportFeedback(`❌ Falha ao importar: ${err}`);
    } finally {
      setIsImportingFile(false);
    }
  };

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
    return jornadas.filter(j => j.mesAno === selectedMesAno);
  }, [jornadas, filterMode, startDateISO, endDateISO, selectedMesAno]);

  // Filter daily faturados by selected month OR by date interval
  const activeDailyFaturados = React.useMemo(() => {
    if (filterMode === 'INTERVALO' && startDateISO && endDateISO) {
      return dailyFaturados.filter(f => f.dataISO >= startDateISO && f.dataISO <= endDateISO);
    }
    return dailyFaturados.filter(f => f.mesAno === selectedMesAno);
  }, [dailyFaturados, filterMode, startDateISO, endDateISO, selectedMesAno]);

  // Calculate metrics
  const metrics = calculateWlpMetrics(journeysInMonth, config);

  // Detect DPO deviations
  const desviosDpo = detectWlpDesvios(journeysInMonth, activeDailyFaturados, config.metaWlp || 25.0, 450.0, empresaId);

  // Analytics chart 1: Collaborators with highest hours & overtime (> 7.33h)
  const colabOvertimeChartData = React.useMemo(() => {
    const map = new Map<string, { nome: string; horasPadrao: number; horasExtras: number; totalHoras: number }>();
    journeysInMonth.forEach(j => {
      const nome = j.colaboradorNome || 'Outro';
      const cur = map.get(nome) || { nome, horasPadrao: 0, horasExtras: 0, totalHoras: 0 };
      const dur = j.duracaoHoras || 0;
      const padrao = Math.min(dur, 7.33);
      const extra = Math.max(0, dur - 7.33);
      cur.horasPadrao = parseFloat((cur.horasPadrao + padrao).toFixed(2));
      cur.horasExtras = parseFloat((cur.horasExtras + extra).toFixed(2));
      cur.totalHoras = parseFloat((cur.totalHoras + dur).toFixed(2));
      map.set(nome, cur);
    });
    return Array.from(map.values())
      .sort((a, b) => b.totalHoras - a.totalHoras)
      .slice(0, 10);
  }, [journeysInMonth]);

  // Analytics chart 2: Deviation Category Distribution
  const desviosCatChartData = React.useMemo(() => {
    const cats: Record<string, number> = {
      'Horas Extras (> 7,33h)': 0,
      'HE Vol. Baixo (<450HL)': 0,
      'Montagem na Manhã': 0,
      'WLP Abaixo Meta': 0
    };
    desviosDpo.forEach(d => {
      if (d.tipo === 'HORA_EXTRA_INDIVIDUAL') cats['Horas Extras (> 7,33h)']++;
      else if (d.tipo === 'HORA_EXTRA_VOLUME_BAIXO') cats['HE Vol. Baixo (<450HL)']++;
      else if (d.tipo === 'MONTAGEM_ESTENDIDA_MANHA') cats['Montagem na Manhã']++;
      else if (d.tipo === 'WLP_ABAIXO_META_DPO') cats['WLP Abaixo Meta']++;
    });
    return Object.entries(cats).map(([name, count]) => ({ name, count }));
  }, [desviosDpo]);

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

    let durHrs = 7.33;
    if (horaInicio && horaFim) {
      try {
        const [h1, m1] = horaInicio.split(':').map(Number);
        const [h2, m2] = horaFim.split(':').map(Number);
        const diffMins = Math.max(0, (h2 * 60 + m2) - (h1 * 60 + m1));
        durHrs = parseFloat((diffMins / 60).toFixed(2)) || 7.33;
      } catch (e) {}
    }

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
  const handleProcessCsvImport = () => {
    if (!csvRawInput.trim()) {
      alert('Cole o conteúdo do relatório CSV ou tabela de pontos retroativos.');
      return;
    }

    const lines = csvRawInput.trim().split('\n');
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

      let dur = 7.33;
      try {
        const [h1, m1] = hIni.split(':').map(Number);
        const [h2, m2] = hFim.split(':').map(Number);
        const diffMins = Math.max(0, (h2 * 60 + m2) - (h1 * 60 + m1));
        dur = parseFloat((diffMins / 60).toFixed(2)) || 7.33;
      } catch (e) {}

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
        {/* Linha 1: Título e Seletor do Mês */}
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

          <div className="flex flex-wrap items-center gap-3 bg-[#0b1222] border border-slate-700 rounded-xl p-2 shrink-0 self-start md:self-auto shadow-inner">
            <div className="flex items-center bg-[#111a30] p-1 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setFilterMode('MES')}
                className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterMode === 'MES'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white bg-transparent'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Filtro Mês</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('INTERVALO')}
                className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterMode === 'INTERVALO'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white bg-transparent'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Entre Dias</span>
              </button>
            </div>

            {filterMode === 'MES' ? (
              <div className="flex items-center gap-2 px-2 py-1">
                <span className="text-[10px] font-black uppercase text-slate-400">Mês do WLP:</span>
                <select
                  value={selectedMesAno}
                  onChange={(e) => setSelectedMesAno(e.target.value)}
                  className="bg-transparent text-xs font-black text-amber-400 outline-none cursor-pointer"
                >
                  <option value="08/2026" className="bg-[#0b1222] text-white">Agosto / 2026</option>
                  <option value="07/2026" className="bg-[#0b1222] text-white">Julho / 2026</option>
                  <option value="06/2026" className="bg-[#0b1222] text-white">Junho / 2026</option>
                  <option value="05/2026" className="bg-[#0b1222] text-white">Maio / 2026</option>
                </select>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2 px-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase text-slate-400">De:</span>
                  <input
                    type="date"
                    value={startDateISO}
                    onChange={(e) => setStartDateISO(e.target.value)}
                    className="bg-[#111a30] border border-amber-500/40 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-amber-300 outline-none focus:border-amber-400"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase text-slate-400">Até:</span>
                  <input
                    type="date"
                    value={endDateISO}
                    onChange={(e) => setEndDateISO(e.target.value)}
                    className="bg-[#111a30] border border-amber-500/40 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-amber-300 outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Linha 2: Descrição e Botões de Ação Uniformes */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <p className="text-xs text-slate-300 leading-snug max-w-2xl">
            Medição da eficiência de carregamento e operação por homem-hora (HL/HH) baseada na jornada dos colaboradores ajudantes, empilhadores e conferentes.
          </p>

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
              <span>Importar (.xlsx / .csv)</span>
            </button>
          </div>
        </div>
      </div>

      {/* FORMULÁRIO DE CONFIGURAÇÃO DE PARÂMETROS MENSAIS DO WLP */}
      <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-black uppercase text-white">
              Parâmetros de Entrada de Cátalogo Operacional — {selectedMesAno}
            </h3>
          </div>
          <button
            onClick={handleSaveConfig}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-4 h-4" /> Salvar Parâmetros
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-[#0b1222] p-3.5 rounded-xl border border-slate-800">
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
              Hectolitro Faturado (HL) *
            </label>
            <input
              type="number"
              step="0.01"
              value={config.volumeFaturadoHL}
              onChange={(e) => setConfig({ ...config, volumeFaturadoHL: Number(e.target.value) })}
              className="w-full bg-[#111a30] border border-amber-500/40 rounded-lg p-2 font-mono font-black text-sm text-amber-400 outline-none focus:border-amber-400"
            />
            <span className="text-[9px] text-slate-500 mt-1 block">Volume faturado no mês</span>
          </div>

          <div className="bg-[#0b1222] p-3.5 rounded-xl border border-slate-800">
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
              Dias Úteis Trabalhados *
            </label>
            <input
              type="number"
              value={config.diasUteisTrabalhados}
              onChange={(e) => setConfig({ ...config, diasUteisTrabalhados: Number(e.target.value) })}
              className="w-full bg-[#111a30] border border-slate-700 rounded-lg p-2 font-mono font-black text-sm text-white outline-none focus:border-amber-400"
            />
            <span className="text-[9px] text-slate-500 mt-1 block">Dias operados no mês</span>
          </div>

          <div className="bg-[#0b1222] p-3.5 rounded-xl border border-slate-800">
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
              Quadro Pessoal (TT QLP) *
            </label>
            <input
              type="number"
              value={config.quadroPessoalTTQLP}
              onChange={(e) => setConfig({ ...config, quadroPessoalTTQLP: Number(e.target.value) })}
              className="w-full bg-[#111a30] border border-slate-700 rounded-lg p-2 font-mono font-black text-sm text-white outline-none focus:border-amber-400"
            />
            <span className="text-[9px] text-slate-500 mt-1 block">Ajudantes + Empil. + Conf.</span>
          </div>

          <div className="bg-[#0b1222] p-3.5 rounded-xl border border-slate-800">
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
              Horas Turno Padrão (h)
            </label>
            <input
              type="number"
              step="0.01"
              value={config.horasTurnoPadrao || 7.33}
              onChange={(e) => setConfig({ ...config, horasTurnoPadrao: Number(e.target.value) })}
              className="w-full bg-[#111a30] border border-slate-700 rounded-lg p-2 font-mono font-black text-sm text-slate-300 outline-none focus:border-amber-400"
            />
            <span className="text-[9px] text-slate-500 mt-1 block">Padrão Ambev 7.33h</span>
          </div>

          <div className="bg-[#0b1222] p-3.5 rounded-xl border border-slate-800">
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
              Meta WLP (HL / HH)
            </label>
            <input
              type="number"
              step="0.1"
              value={config.metaWlp}
              onChange={(e) => setConfig({ ...config, metaWlp: Number(e.target.value) })}
              className="w-full bg-[#111a30] border border-emerald-500/40 rounded-lg p-2 font-mono font-black text-sm text-emerald-400 outline-none focus:border-emerald-400"
            />
            <span className="text-[9px] text-slate-500 mt-1 block">Meta de produtividade</span>
          </div>
        </div>
      </div>

      {/* CARDS DE RESULTADOS E RESULTADO DE WLP REALIZADO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-[#111a30] border border-amber-500/30 rounded-2xl shadow-lg flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
              Volume Faturado
            </span>
            <FileSpreadsheet className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-white">
              {metrics.volumeFaturadoHL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} HL
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

        <div className={`p-4 bg-[#111a30] border-2 ${
          metrics.wlpCalculado >= metrics.metaWlp 
            ? 'border-emerald-500 shadow-emerald-500/20' 
            : 'border-rose-500 shadow-rose-500/20'
        } rounded-2xl shadow-xl flex flex-col justify-between space-y-2`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
              Indicador WLP Realizado
            </span>
            <Award className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <div className="text-3xl font-black font-mono text-white flex items-baseline gap-2">
              <span>{metrics.wlpCalculado.toFixed(2)}</span>
              <span className="text-xs text-slate-400 font-sans font-normal">HL / HH</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-slate-400">Meta: {metrics.metaWlp} HL/HH</span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                metrics.wlpCalculado >= metrics.metaWlp
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}>
                {metrics.percentualMeta.toFixed(1)}% da Meta
              </span>
            </div>
          </div>
        </div>
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
                    <th className="p-3 text-center">WLP Dia (HL/HH)</th>
                    <th className="p-3 text-center">Status DPO</th>
                    <th className="p-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-[#0b1222] text-slate-200">
                  {(() => {
                    // Group journeys by date
                    const datesSet = new Set<string>();
                    journeysInMonth.forEach(j => datesSet.add(j.dataISO));
                    dailyFaturados.forEach(f => datesSet.add(f.dataISO));

                    const sortedDates = Array.from(datesSet).sort().reverse();

                    if (sortedDates.length === 0) {
                      return (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-slate-500">
                            Nenhum registro de faturamento ou jornada cadastrado no mês {selectedMesAno}.
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
                          <td className="p-3 text-center font-mono font-black text-sm text-emerald-400">
                            {wlpDia > 0 ? `${wlpDia.toFixed(2)} HL/HH` : '-'}
                          </td>
                          <td className="p-3 text-center">
                            {hasLowVolumeOvertime ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Hora Extra Proibida
                              </span>
                            ) : wlpDia >= (config.metaWlp || 25.0) ? (
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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-400" /> Painel de Desvios de Jornada, Horas Extras (&gt; 7,33h) &amp; WLP
              </h3>
              <p className="text-xs text-slate-300 mt-0.5 max-w-3xl">
                Auditoria contínua de inconsistências de produtividade WLP: identifica colaboradores com jornada superior a 7,33h, montagens noturnas finalizadas pelo time da manhã e ocorrências em dias de baixo faturamento.
              </p>
            </div>

            {/* Interactive Filters */}
            <div className="flex items-center gap-2 bg-[#0b1222] p-1.5 rounded-xl border border-slate-700 shrink-0">
              <span className="text-[10px] font-black uppercase text-slate-400 pl-2">Filtro:</span>
              <button
                type="button"
                onClick={() => setDesvioFilter('TODOS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                  desvioFilter === 'TODOS'
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'text-slate-400 hover:text-white bg-transparent'
                }`}
              >
                Todos ({desviosDpo.length})
              </button>
              <button
                type="button"
                onClick={() => setDesvioFilter('DESVIOS_APENAS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-1 ${
                  desvioFilter === 'DESVIOS_APENAS'
                    ? 'bg-rose-500 text-white font-black'
                    : 'text-slate-400 hover:text-rose-400 bg-transparent'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" /> Apenas Desvios
              </button>
              <button
                type="button"
                onClick={() => setDesvioFilter('DENTRO_META')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-1 ${
                  desvioFilter === 'DENTRO_META'
                    ? 'bg-emerald-500 text-slate-950 font-black'
                    : 'text-slate-400 hover:text-emerald-400 bg-transparent'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Dentro da Meta
              </button>
            </div>
          </div>

          {/* Cards de Resumo dos Desvios */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-[#0b1222] border border-rose-500/30 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-rose-400 uppercase">Total de Desvios</span>
                <div className="text-2xl font-black font-mono text-white mt-0.5">{desviosDpo.length}</div>
              </div>
              <ShieldAlert className="w-7 h-7 text-rose-500/80" />
            </div>

            <div className="p-4 bg-[#0b1222] border border-amber-500/30 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-amber-400 uppercase">Horas Extras (&gt; 7,33h)</span>
                <div className="text-2xl font-black font-mono text-white mt-0.5">
                  {desviosDpo.filter(d => d.tipo === 'HORA_EXTRA_INDIVIDUAL' || d.tipo === 'HORA_EXTRA_VOLUME_BAIXO').length}
                </div>
              </div>
              <Clock className="w-7 h-7 text-amber-500/80" />
            </div>

            <div className="p-4 bg-[#0b1222] border border-indigo-500/30 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-indigo-400 uppercase">Montagens na Manhã</span>
                <div className="text-2xl font-black font-mono text-white mt-0.5">
                  {desviosDpo.filter(d => d.tipo === 'MONTAGEM_ESTENDIDA_MANHA').length}
                </div>
              </div>
              <Users className="w-7 h-7 text-indigo-500/80" />
            </div>

            <div className="p-4 bg-[#0b1222] border border-emerald-500/30 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-emerald-400 uppercase">Aderência à Meta DPO</span>
                <div className="text-2xl font-black font-mono text-white mt-0.5">
                  {desviosDpo.length === 0 ? '100%' : `${Math.max(0, 100 - desviosDpo.length * 10)}%`}
                </div>
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
                <span className="text-[10px] font-mono font-bold text-slate-400">Top 10 — {selectedMesAno}</span>
              </div>

              {colabOvertimeChartData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-xs text-slate-500">
                  Nenhum registro de jornada computado neste mês.
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
                <span className="text-[10px] font-mono font-bold text-slate-400">Total: {desviosDpo.length} desvios</span>
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

          {/* Renderização condicional por filtro selecionado */}
          {desvioFilter === 'DENTRO_META' ? (
            <div className="p-8 bg-[#0b1222] border border-emerald-500/40 rounded-xl text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <h4 className="text-base font-black text-white uppercase">Visualização: Registros Dentro da Meta DPO</h4>
              <p className="text-xs text-slate-300 max-w-xl mx-auto">
                Todos os dias operacionais sem extrapolação de horas extras (&gt; 7,33h), sem necessidade de término da montagem noturna pela manhã e com WLP atingindo a meta oficial.
              </p>
            </div>
          ) : (() => {
            const displayList = desvioFilter === 'DESVIOS_APENAS' 
              ? desviosDpo.filter(d => d.tipo !== 'WLP_ABAIXO_META_DPO')
              : desviosDpo;

            if (displayList.length === 0) {
              return (
                <div className="p-8 bg-[#0b1222] border border-slate-800 rounded-xl text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                  <h4 className="text-sm font-black text-white uppercase">Nenhum Desvio Identificado</h4>
                  <p className="text-xs text-slate-400">
                    A jornada dos colaboradores e o volume faturado estão 100% alinhados com as diretrizes DPO da Ambev.
                  </p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayList.map((desvio) => (
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
              <Clock className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">
                Nenhum ponto de jornada registrado para {selectedMesAno}. Clique em "+ Ponto Manual / Retroativo" ou "Importar CSV" para cadastrar pontos.
              </p>
            </div>
          )}
        </div>
      )}

      {/* GUIA DE VISÃO GERAL DO INDICADOR WLP */}
      {activeSubTab === 'indicador' && (
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
                  equipe: 'Operacional'
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

            {/* SEÇÃO 1: UPLOAD DE ARQUIVO EXCEL */}
            <div className="p-4 bg-[#0b1222] border border-emerald-500/30 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase text-emerald-400 flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-emerald-400" /> Opção 1: Upload Direto de Planilha Excel (.xlsx, .xls, .csv)
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Selecione o arquivo Excel do seu computador para importar faturamentos diários e pontos de início/fim de jornada desde o início do ano.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={exportWlpModelExcel}
                  className="px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500 hover:text-slate-950 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <Download className="w-3.5 h-3.5" /> Baixar Modelo .xlsx
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
