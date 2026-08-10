import React, { useState, useEffect } from 'react';
import { Usuario, Empresa } from '../types';
import { useEmpresaData } from '../context/EmpresaDataContext';
import { saveJornadaRecord, JornadaRecord } from '../utils/jornadaUtils';
import RepackPanel from './RepackPanel';
import DespejoPanel from './DespejoPanel';
import QuebrasPanel from './QuebrasPanel';
import { Checklist5SForm, Collaborator5SPerformanceCard } from './Checklist5SModal';
import { 
  Users, 
  RefreshCw, 
  Trash2, 
  AlertTriangle, 
  Play, 
  SquareCheck, 
  CheckCircle2, 
  History, 
  X, 
  HelpCircle, 
  Award,
  Sparkles,
  Clock,
  TrendingUp,
  ShieldCheck,
  ExternalLink,
  Truck,
  Coffee,
  Pencil
} from 'lucide-react';
import { add5PorquesDemand } from '../utils/fiveWhysManager';

interface AjudantePanelProps {
  user: Usuario;
  empresa: Empresa | null;
  theme?: 'light' | 'dark';
}

interface ShiftHistoryRecord {
  id: string;
  dataStr: string;
  horaInicio: string;
  horaInicioIntervalo?: string;
  horaFimIntervalo?: string;
  horaFim: string;
  duracaoTotal: string;
  fiveSSubmitted: boolean;
  fiveWhysFilled: boolean;
  statusMetaRepack: string;
  statusMetaDespejo: string;
}

export default function AjudantePanel({ user, empresa, theme = 'dark' }: AjudantePanelProps) {
  const empresaId = empresa?.id || 'demo';
  const empresaData = useEmpresaData();
  const shiftStorageKey = `ajudante_shift_${empresaId}_${user.uid || user.nome}`;
  const historyStorageKey = `ajudante_history_${empresaId}_${user.uid || user.nome}`;

  // Tab State: 'repack' | 'despejo' | 'quebras' | 'retorno_rota' | '5s' | 'historico'
  const [activeTab, setActiveTab] = useState<'repack' | 'despejo' | 'quebras' | 'retorno_rota' | '5s' | 'historico'>('repack');

  // Shift State
  const [shiftStarted, setShiftStarted] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(shiftStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.shiftStarted || false;
      }
    } catch (e) {}
    return false;
  });

  const [shiftStartTime, setShiftStartTime] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(shiftStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.shiftStartTime || '';
      }
    } catch (e) {}
    return '';
  });

  // Interval / Lunch State
  const [onBreak, setOnBreak] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(`${shiftStorageKey}_break`);
      if (saved) return JSON.parse(saved).onBreak || false;
    } catch (e) {}
    return false;
  });

  const [breakStartTime, setBreakStartTime] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(`${shiftStorageKey}_break`);
      if (saved) return JSON.parse(saved).breakStartTime || '';
    } catch (e) {}
    return '';
  });

  const [breakEndTime, setBreakEndTime] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(`${shiftStorageKey}_break`);
      if (saved) return JSON.parse(saved).breakEndTime || '';
    } catch (e) {}
    return '';
  });

  // Point Correction Modal State
  const [editingRecord, setEditingRecord] = useState<ShiftHistoryRecord | null>(null);
  const [editForm, setEditForm] = useState({
    horaInicio: '',
    horaInicioIntervalo: '',
    horaFimIntervalo: '',
    horaFim: ''
  });

  // 5S Modal & State
  const [show5SModal, setShow5SModal] = useState<boolean>(false);
  const [fiveSSubmitted, setFiveSSubmitted] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(`${shiftStorageKey}_5s`);
      return saved === 'true';
    } catch (e) {}
    return false;
  });

  const [fiveSItems, setFiveSItems] = useState([
    { id: 1, s: '1S - SEIRI (Utilização)', label: 'Área do posto limpa e livre de materiais desnecessários ou caixas vazias', checked: false },
    { id: 2, s: '2S - SEITON (Organização)', label: 'Ferramentas, pás, vassouras e fita de arquear guardadas nos locais corretos', checked: false },
    { id: 3, s: '3S - SEISO (Limpeza)', label: 'Posto de repack/despejo limpo, sem cacos de vidro no chão ou líquidos derramados', checked: false },
    { id: 4, s: '4S - SEIKETSU (Padronização)', label: 'EPIs completos (luvas anticorte, óculos, mangotes e calçado) em bom estado', checked: false },
    { id: 5, s: '5S - SHITSUKE (Disciplina)', label: 'Segregação rigorosa de resíduos de vidro no tambor selado e rotulagem correta', checked: false },
  ]);

  // 5 Whys Modal & State
  const [showFiveWhysModal, setShowFiveWhysModal] = useState<boolean>(false);
  const [fiveWhysData, setFiveWhysData] = useState({
    porque1: '',
    porque2: '',
    porque3: '',
    porque4: '',
    porque5: '',
    acaoCorretiva: '',
  });

  // Success Celebration Modal
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Shift History State
  const [shiftHistory, setShiftHistory] = useState<ShiftHistoryRecord[]>(() => {
    try {
      const saved = localStorage.getItem(historyStorageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  // Sync Shift & Break State to LocalStorage
  useEffect(() => {
    localStorage.setItem(shiftStorageKey, JSON.stringify({
      shiftStarted,
      shiftStartTime
    }));
  }, [shiftStarted, shiftStartTime, shiftStorageKey]);

  useEffect(() => {
    localStorage.setItem(`${shiftStorageKey}_break`, JSON.stringify({
      onBreak,
      breakStartTime,
      breakEndTime
    }));
  }, [onBreak, breakStartTime, breakEndTime, shiftStorageKey]);

  useEffect(() => {
    localStorage.setItem(`${shiftStorageKey}_5s`, String(fiveSSubmitted));
  }, [fiveSSubmitted, shiftStorageKey]);

  // Calculate today's productivity meta compliance for Repack & Despejo
  const todayISO = new Date().toISOString().split('T')[0];
  const todayStr = new Date().toLocaleDateString('pt-BR');

  const todayRepackEntries = (empresaData.repack || []).filter(r => 
    (r.dataISO === todayISO || r.data === todayStr) && 
    (r.operador === user.nome || !r.operador)
  );

  const todayDespejoEntries = (empresaData.despejo || []).filter(d => 
    (d.dataISO === todayISO || d.data === todayStr) && 
    (d.operador === user.nome || !d.operador)
  );

  // Check if user missed meta in any Repack or Despejo entry today
  const hasMissedRepackMeta = todayRepackEntries.some(r => 
    r.resultado?.includes('ACIMA') || r.resultado?.includes('Fora') || r.resultado?.includes('Não')
  );

  const hasMissedDespejoMeta = todayDespejoEntries.some(d => 
    d.resultado?.includes('ACIMA') || d.resultado?.includes('Fora') || d.resultado?.includes('Não')
  );

  const overallMetaMet = !hasMissedRepackMeta && !hasMissedDespejoMeta;

  // Handle Shift Start
  const handleStartShift = () => {
    const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setShiftStarted(true);
    setShiftStartTime(nowStr);
    setOnBreak(false);
    setBreakStartTime('');
    setBreakEndTime('');
    setFiveSSubmitted(false);
    setFiveSItems(prev => prev.map(i => ({ ...i, checked: false })));
    triggerToast(`🚀 Jornada da Operação Ajudante iniciada às ${nowStr}!`);
  };

  // Handle Break Start
  const handleStartBreak = () => {
    const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setOnBreak(true);
    setBreakStartTime(nowStr);
    triggerToast(`☕ Intervalo de Almoço/Pausa iniciado às ${nowStr}! Bom descanso.`);
  };

  // Handle Break End
  const handleEndBreak = () => {
    const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setOnBreak(false);
    setBreakEndTime(nowStr);
    triggerToast(`⚡ Retorno do intervalo às ${nowStr}! Bom trabalho.`);
  };

  // Handle Shift Finish Click
  const handleFinishShiftClick = () => {
    if (!shiftStarted) return;

    // Check if daily goals were met for Repack and Despejo
    if (hasMissedRepackMeta || hasMissedDespejoMeta) {
      // Must fill 5 Whys before finishing
      setShowFiveWhysModal(true);
    } else {
      // Goal was met or no negative entries
      setShowSuccessModal(true);
    }
  };

  // Complete Shift Finalization
  const finalizeShiftProcess = (fiveWhysFilled: boolean) => {
    const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const today = new Date().toLocaleDateString('pt-BR');

    // Calculate duration (subtracting break if present)
    let durStr = '00:00:00';
    let diffHrs = 7.33;
    if (shiftStartTime) {
      try {
        const [h1, m1] = shiftStartTime.split(':').map(Number);
        const [h2, m2] = nowStr.split(':').map(Number);
        let totalMins = (h2 * 60 + m2) - (h1 * 60 + m1);

        if (breakStartTime && breakEndTime) {
          const [bh1, bm1] = breakStartTime.split(':').map(Number);
          const [bh2, bm2] = breakEndTime.split(':').map(Number);
          const breakMins = (bh2 * 60 + bm2) - (bh1 * 60 + bm1);
          totalMins = Math.max(0, totalMins - Math.max(0, breakMins));
        }

        const hrs = Math.floor(totalMins / 60);
        const mins = totalMins % 60;
        durStr = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`;
        diffHrs = parseFloat((totalMins / 60).toFixed(2)) || 7.33;
      } catch (e) {}
    }

    const newRecord: ShiftHistoryRecord = {
      id: String(Date.now()),
      dataStr: today,
      horaInicio: shiftStartTime || '08:00',
      horaInicioIntervalo: breakStartTime || undefined,
      horaFimIntervalo: breakEndTime || undefined,
      horaFim: nowStr,
      duracaoTotal: durStr,
      fiveSSubmitted,
      fiveWhysFilled,
      statusMetaRepack: hasMissedRepackMeta ? '🔴 Fora da Meta' : '🟢 Meta Bateu',
      statusMetaDespejo: hasMissedDespejoMeta ? '🔴 Fora da Meta' : '🟢 Meta Bateu',
    };

    const updatedHistory = [newRecord, ...shiftHistory];
    setShiftHistory(updatedHistory);
    localStorage.setItem(historyStorageKey, JSON.stringify(updatedHistory));

    // Save to global WLP journey tracker
    const todayISO = new Date().toISOString().split('T')[0];
    const parts = todayISO.split('-');
    const mesAno = `${parts[1]}/${parts[0]}`;

    const jrn: JornadaRecord = {
      id: `jrn-ajud-${Date.now()}`,
      colaboradorNome: user.nome || 'Ajudante',
      cargo: 'Ajudante',
      dataStr: today,
      dataISO: todayISO,
      mesAno,
      horaInicio: shiftStartTime || '07:00',
      horaInicioIntervalo: breakStartTime || undefined,
      horaFimIntervalo: breakEndTime || undefined,
      horaFim: nowStr,
      duracaoHoras: diffHrs,
      empresaId: empresa?.id || 'demo',
      observacoes: 'Jornada Operação Ajudante',
      criadoEm: new Date().toISOString()
    };
    saveJornadaRecord(jrn);

    setShiftStarted(false);
    setShiftStartTime('');
    setOnBreak(false);
    setBreakStartTime('');
    setBreakEndTime('');
    setFiveSSubmitted(false);
    setShowFiveWhysModal(false);
    setShowSuccessModal(false);

    triggerToast(`🏁 Jornada da Operação Ajudante finalizada às ${nowStr}!`);
  };

  // Open edit modal for point correction
  const handleOpenEditModal = (rec: ShiftHistoryRecord) => {
    setEditingRecord(rec);
    setEditForm({
      horaInicio: rec.horaInicio || '07:00',
      horaInicioIntervalo: rec.horaInicioIntervalo || '12:00',
      horaFimIntervalo: rec.horaFimIntervalo || '13:00',
      horaFim: rec.horaFim || '16:20'
    });
  };

  // Save edited record
  const handleSaveEditedRecord = () => {
    if (!editingRecord) return;

    let netMinutes = 0;
    try {
      const [h1, m1] = editForm.horaInicio.split(':').map(Number);
      const [h2, m2] = editForm.horaFim.split(':').map(Number);
      let totalMins = (h2 * 60 + m2) - (h1 * 60 + m1);

      if (editForm.horaInicioIntervalo && editForm.horaFimIntervalo) {
        const [bh1, bm1] = editForm.horaInicioIntervalo.split(':').map(Number);
        const [bh2, bm2] = editForm.horaFimIntervalo.split(':').map(Number);
        const breakMins = (bh2 * 60 + bm2) - (bh1 * 60 + bm1);
        totalMins = Math.max(0, totalMins - Math.max(0, breakMins));
      }
      netMinutes = Math.max(0, totalMins);
    } catch (e) {}

    const hrs = Math.floor(netMinutes / 60);
    const mins = netMinutes % 60;
    const durStr = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`;

    const updatedHistory = shiftHistory.map(rec => {
      if (rec.id === editingRecord.id) {
        return {
          ...rec,
          horaInicio: editForm.horaInicio,
          horaInicioIntervalo: editForm.horaInicioIntervalo || undefined,
          horaFimIntervalo: editForm.horaFimIntervalo || undefined,
          horaFim: editForm.horaFim,
          duracaoTotal: durStr
        };
      }
      return rec;
    });

    setShiftHistory(updatedHistory);
    localStorage.setItem(historyStorageKey, JSON.stringify(updatedHistory));
    setEditingRecord(null);
    triggerToast('✅ Ponto corrigido no histórico com sucesso!');
  };

    const jrn: JornadaRecord = {
      id: `jrn-ajud-${Date.now()}`,
      colaboradorNome: user.nome || 'Ajudante',
      cargo: 'Ajudante',
      dataStr: today,
      dataISO: todayISO,
      mesAno,
      horaInicio: shiftStartTime || '07:00',
      horaFim: nowStr,
      duracaoHoras: diffHrs,
      empresaId: empresa?.id || 'demo',
      observacoes: 'Jornada Operação Ajudante',
      criadoEm: new Date().toISOString()
    };
    saveJornadaRecord(jrn);

    setShiftStarted(false);
    setShiftStartTime('');
    setFiveSSubmitted(false);
    setShowFiveWhysModal(false);
    setShowSuccessModal(false);

    triggerToast(`🏁 Jornada da Operação Ajudante finalizada às ${nowStr}!`);
  };

  // Handle 5 Whys Submission
  const handleSubmitFiveWhys = () => {
    if (!fiveWhysData.porque1.trim() || !fiveWhysData.acaoCorretiva.trim()) {
      alert('Por favor, preencha pelo menos o Primeiro Porquê e a Ação Corretiva.');
      return;
    }

    add5PorquesDemand(empresaId, {
      data: new Date().toLocaleDateString('pt-BR'),
      dataISO: new Date().toISOString().split('T')[0],
      hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      colaborador: user.nome || 'Ajudante de Armazém',
      processo: 'Ajudante / Operação',
      indicador: 'Despejo / Repack / Metas de Turno',
      meta: '100% de Atingimento',
      resultadoObtido: 'Desvio no Encerramento de Turno',
      desvioEncontrado: fiveWhysData.porque1 || 'Desvio registrado no encerramento da jornada',
      porque1: fiveWhysData.porque1,
      porque2: fiveWhysData.porque2,
      porque3: fiveWhysData.porque3,
      porque4: fiveWhysData.porque4,
      porque5: fiveWhysData.porque5,
      status: 'Pendente'
    });

    finalizeShiftProcess(true);
  };

  return (
    <div className="w-full flex flex-col gap-6 text-slate-100 p-2 sm:p-4 md:p-6 bg-[#090d12] min-h-screen">
      
      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-emerald-400 animate-bounce">
          <Sparkles className="w-5 h-5 text-amber-300" />
          <span className="text-xs">{toastMessage}</span>
        </div>
      )}

      {/* HEADER BAR & SHIFT CONTROL */}
      <div className="bg-[#11151c] border border-[#222d3a] p-5 rounded-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black uppercase tracking-wider text-white">
                Operação Ajudante
              </h1>
              <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                Especialista de Armazém
              </span>
              <OperationalNotificationBell user={user} userRole="ajudante" onNavigate={(panel, tab) => { if (tab) setActiveTab(tab as any); }} />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Atendimento unificado: Repack, Despejo e Avarias de Quebras.
            </p>
          </div>
        </div>

        {/* CONTROLES DA JORNADA & 5S */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end border-t lg:border-t-0 border-[#222d3a] pt-3 lg:pt-0">
          
          {/* BOTÃO 5S */}
          <button
            onClick={() => setShow5SModal(true)}
            className={`px-4 py-2.5 rounded-xl border text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md transition-all ${
              fiveSSubmitted 
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20' 
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400 font-bold'
            }`}
          >
            <SquareCheck className="w-4 h-4" />
            <span>CHECKLIST 5S {fiveSSubmitted ? '✓ (OK)' : ''}</span>
          </button>

          {/* BOTÃO INICIAR / FINALIZAR JORNADA */}
          {!shiftStarted ? (
            <button
              onClick={handleStartShift}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/40 border border-emerald-400"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>INICIAR JORNADA</span>
            </button>
          ) : (
            <div className="flex items-center gap-3 bg-[#151b23] p-1.5 rounded-xl border border-emerald-500/30">
              <div className="px-3 py-1 flex items-center gap-2 text-xs font-mono font-bold text-emerald-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>JORNADA ATIVA ({shiftStartTime})</span>
              </div>
              <button
                onClick={handleFinishShiftClick}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow border border-rose-400"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>FINALIZAR JORNADA</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* PAINEL DE STATUS DA META DE PRODUTIVIDADE DO DIA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* REPACK SUMMARY */}
        <div className="bg-[#11151c] border border-[#222d3a] p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-lg">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Meta Repack Hoje</span>
              <span className="text-xs font-bold text-white">
                {todayRepackEntries.length} lançamentos hoje
              </span>
            </div>
          </div>
          <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
            hasMissedRepackMeta 
              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' 
              : todayRepackEntries.length > 0 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}>
            {hasMissedRepackMeta ? '🔴 Fora da Meta' : todayRepackEntries.length > 0 ? '🟢 Bateu Meta' : '⚪ Sem Registros'}
          </span>
        </div>

        {/* DESPEJO SUMMARY */}
        <div className="bg-[#11151c] border border-[#222d3a] p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-lg">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Meta Despejo Hoje</span>
              <span className="text-xs font-bold text-white">
                {todayDespejoEntries.length} lançamentos hoje
              </span>
            </div>
          </div>
          <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
            hasMissedDespejoMeta 
              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' 
              : todayDespejoEntries.length > 0 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}>
            {hasMissedDespejoMeta ? '🔴 Fora da Meta' : todayDespejoEntries.length > 0 ? '🟢 Bateu Meta' : '⚪ Sem Registros'}
          </span>
        </div>

        {/* QUEBRAS (WQI) SUMMARY */}
        <div className="bg-[#11151c] border border-[#222d3a] p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Operação Quebras (Avarias)</span>
              <span className="text-xs font-bold text-white">Avaliação via WQI Individual</span>
            </div>
          </div>
          <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30">
            Índice WQI
          </span>
        </div>
      </div>

      {/* WARNING IF SHIFT NOT STARTED */}
      {!shiftStarted && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>
              <strong>Atenção:</strong> Você ainda não iniciou a jornada de hoje. Clique em <strong>INICIAR JORNADA</strong> no topo para habilitar os lançamentos.
            </span>
          </div>
          <button
            onClick={handleStartShift}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] uppercase tracking-wider rounded-lg flex-shrink-0 cursor-pointer"
          >
            Iniciar Agora
          </button>
        </div>
      )}

      {/* MAIN TABS NAV - SYMMETRICAL 6 TABS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 bg-[#11151c] border border-[#222d3a] p-2 rounded-xl w-full">
        <button
          onClick={() => setActiveTab('repack')}
          className={`px-3 py-2.5 rounded-lg font-sans font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'repack'
              ? 'bg-purple-600 text-white font-black shadow'
              : 'text-slate-400 hover:text-white bg-transparent'
          }`}
        >
          <RefreshCw className="w-4 h-4 shrink-0" />
          <span className="truncate">1. Repack</span>
        </button>

        <button
          onClick={() => setActiveTab('despejo')}
          className={`px-3 py-2.5 rounded-lg font-sans font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'despejo'
              ? 'bg-rose-600 text-white font-black shadow'
              : 'text-slate-400 hover:text-white bg-transparent'
          }`}
        >
          <Trash2 className="w-4 h-4 shrink-0" />
          <span className="truncate">2. Despejo</span>
        </button>

        <button
          onClick={() => setActiveTab('quebras')}
          className={`px-3 py-2.5 rounded-lg font-sans font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'quebras'
              ? 'bg-amber-600 text-white font-black shadow'
              : 'text-slate-400 hover:text-white bg-transparent'
          }`}
        >
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="truncate">3. Quebras</span>
        </button>

        <button
          onClick={() => setActiveTab('retorno_rota')}
          className={`px-3 py-2.5 rounded-lg font-sans font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'retorno_rota'
              ? 'bg-emerald-600 text-white font-black shadow'
              : 'text-slate-400 hover:text-white bg-transparent'
          }`}
        >
          <Truck className="w-4 h-4 shrink-0" />
          <span className="truncate">4. Retorno Rota</span>
        </button>

        <button
          onClick={() => setActiveTab('5s')}
          className={`px-3 py-2.5 rounded-lg font-sans font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === '5s'
              ? 'bg-amber-500 text-slate-950 font-black shadow'
              : 'text-slate-400 hover:text-white bg-transparent'
          }`}
        >
          <SquareCheck className="w-4 h-4 shrink-0" />
          <span className="truncate">5. Realização 5S</span>
        </button>

        <button
          onClick={() => setActiveTab('historico')}
          className={`px-3 py-2.5 rounded-lg font-sans font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'historico'
              ? 'bg-cyan-600 text-white font-black shadow'
              : 'text-slate-400 hover:text-white bg-transparent'
          }`}
        >
          <History className="w-4 h-4 shrink-0" />
          <span className="truncate">6. Histórico</span>
        </button>
      </div>

      {/* TAB CONTENT 1: REPACK */}
      {activeTab === 'repack' && (
        <div className="bg-[#11151c] border border-[#222d3a] rounded-2xl p-4 sm:p-6 shadow-xl">
          <RepackPanel 
            user={user} 
            empresa={empresa} 
            theme={theme} 
            shiftStarted={shiftStarted} 
            onRequireShiftStart={handleStartShift} 
          />
        </div>
      )}

      {/* TAB CONTENT 2: DESPEJO */}
      {activeTab === 'despejo' && (
        <div className="bg-[#11151c] border border-[#222d3a] rounded-2xl p-4 sm:p-6 shadow-xl">
          <DespejoPanel 
            user={user} 
            empresa={empresa} 
            theme={theme} 
            shiftStarted={shiftStarted} 
            onRequireShiftStart={handleStartShift} 
          />
        </div>
      )}

      {/* TAB CONTENT 3: QUEBRAS */}
      {activeTab === 'quebras' && (
        <div className="bg-[#11151c] border border-[#222d3a] rounded-2xl p-4 sm:p-6 shadow-xl">
          <QuebrasPanel 
            user={user} 
            empresa={empresa} 
            theme={theme} 
            shiftStarted={shiftStarted} 
            onRequireShiftStart={handleStartShift} 
          />
        </div>
      )}

      {/* TAB CONTENT 4: RETORNO DE ROTA */}
      {activeTab === 'retorno_rota' && (
        <div className="bg-[#11151c] border border-[#222d3a] rounded-2xl p-6 shadow-xl flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#222d3a] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Truck className="w-6 h-6 text-emerald-400" />
                <h3 className="text-lg font-black uppercase tracking-wider text-white">
                  Retorno de Rota — Operação Ajudante
                </h3>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                  Link Oficial Anexado
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                O Ajudante inicia a jornada, clica no link e é redirecionado diretamente para a plataforma de Retorno de Rota.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-xs font-mono font-bold px-3 py-1.5 rounded-lg border ${
                shiftStarted 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}>
                {shiftStarted ? `✓ Jornada Iniciada às ${shiftStartTime}` : '⚠️ Jornada Não Iniciada'}
              </span>
            </div>
          </div>

          {/* LINK ACCESSIBLE CARD */}
          <div className="bg-[#151b23] border border-emerald-500/30 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 opacity-5 pointer-events-none">
              <Truck className="w-64 h-64 text-emerald-400" />
            </div>

            <div className="flex items-start gap-4 z-10">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 shrink-0">
                <ExternalLink className="w-8 h-8" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">
                  SISTEMA OFICIAL DE RETORNO DE ROTA
                </span>
                <h4 className="text-xl font-black text-white">
                  PLATAFORMA RETORNO DE ROTA DOS VEÍCULOS
                </h4>
                <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                  Acesse o sistema externo definitivo para registro de chegada, conferência de vasilhames e checklists de prestação de contas de rotas.
                </p>
                <div className="mt-3 inline-flex items-center gap-2 text-[11px] font-mono text-slate-300 bg-[#0d1117] px-3.5 py-2 rounded-xl border border-[#222d3a] w-fit">
                  <span className="text-emerald-400 font-bold">URL:</span>
                  <span className="text-emerald-300 underline">https://nixonhenriquegit.github.io/RETORNO-DE-ROTA/</span>
                </div>
              </div>
            </div>

            <a
              href="https://nixonhenriquegit.github.io/RETORNO-DE-ROTA/"
              target="_blank"
              rel="noopener noreferrer"
              className="z-10 py-4 px-6 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm uppercase tracking-wider rounded-xl cursor-pointer transition-all shadow-xl shadow-emerald-950/50 flex items-center gap-3 shrink-0 border border-emerald-300 hover:scale-105"
            >
              <span>ACESSAR PLATAFORMA DE RETORNO DE ROTA</span>
              <ExternalLink className="w-5 h-5" />
            </a>
          </div>

          {!shiftStarted && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs text-amber-300">
              <span>
                💡 <strong>Dica Operacional:</strong> Lembre-se de clicar em <strong>INICIAR JORNADA</strong> no topo da página ao começar seu turno para sincronizar seus apontamentos.
              </span>
              <button
                onClick={handleStartShift}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-lg cursor-pointer shrink-0 ml-2"
              >
                Iniciar Jornada
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 5: REALIZAÇÃO DO 5S */}
      {activeTab === '5s' && (
        <div className="flex flex-col gap-6">
          <Collaborator5SPerformanceCard user={user} userNombre={user.nome} />

          <div className="bg-[#11151c] border border-[#222d3a] rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-[#222d3a] pb-4">
              <div>
                <h3 className="text-lg font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <SquareCheck className="w-6 h-6 text-amber-400" />
                  Realização do Checklist 5S — Operação Ajudante
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Execute a auditoria diária de 5S no seu posto de trabalho para manter a excelência operacional.
                </p>
              </div>
            </div>

            <Checklist5SForm 
              defaultSetor="REPACK" 
              userNombre={user.nome} 
              user={user} 
              empresaId={empresaId} 
              liderAuditor="Líder Operacional"
              onSaveSuccess={() => {
                setFiveSSubmitted(true);
                triggerToast('✓ Auditoria 5S registrada com sucesso!');
              }} 
            />
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: HISTÓRICO UNIFICADO */}
      {activeTab === 'historico' && (
        <div className="bg-[#11151c] border border-[#222d3a] rounded-2xl p-6 shadow-xl flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[#222d3a] pb-4">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <History className="w-4 h-4 text-cyan-400" />
                HISTÓRICO DE JORNADAS DA OPERAÇÃO AJUDANTE
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Registros de início, fim, duração e checklists de 5S / 5 Porquês por colaborador.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-400">
              {shiftHistory.length} sessões registradas
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#222d3a] text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="p-3">Data</th>
                  <th className="p-3">Início</th>
                  <th className="p-3">Fim</th>
                  <th className="p-3">Duração Total</th>
                  <th className="p-3">Meta Repack</th>
                  <th className="p-3">Meta Despejo</th>
                  <th className="p-3">Status 5S</th>
                  <th className="p-3">Análise 5 Porquês</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c2530] text-xs">
                {shiftHistory.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500 italic">
                      Nenhum histórico de jornada registrado ainda.
                    </td>
                  </tr>
                ) : (
                  shiftHistory.map(rec => (
                    <tr key={rec.id} className="hover:bg-[#151b23] transition-all">
                      <td className="p-3 font-mono font-bold text-amber-400">{rec.dataStr}</td>
                      <td className="p-3 font-mono text-slate-300">{rec.horaInicio}</td>
                      <td className="p-3 font-mono text-slate-300">{rec.horaFim}</td>
                      <td className="p-3 font-mono font-bold text-white">{rec.duracaoTotal}</td>
                      <td className="p-3 font-bold">{rec.statusMetaRepack}</td>
                      <td className="p-3 font-bold">{rec.statusMetaDespejo}</td>
                      <td className="p-3">
                        {rec.fiveSSubmitted ? (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                            ✓ Realizado
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500">Pendente</span>
                        )}
                      </td>
                      <td className="p-3">
                        {rec.fiveWhysFilled ? (
                          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                            ⚠️ Preenchido
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-400">Não necessário</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 5S CHECKLIST */}
      {show5SModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#11151c] border border-amber-500/50 rounded-2xl p-6 max-w-xl w-full flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-amber-500/30 pb-3">
              <div className="flex items-center gap-2">
                <SquareCheck className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  CHECKLIST DE 5S — ÁREA DO AJUDANTE
                </h3>
              </div>
              <button onClick={() => setShow5SModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Ateste o cumprimento dos 5 Senso de Organização e Limpeza na área de Repack, Despejo e Avarias:
            </p>

            <div className="flex flex-col gap-2.5 max-h-[350px] overflow-y-auto pr-1">
              {fiveSItems.map(item => (
                <div 
                  key={item.id}
                  onClick={() => setFiveSItems(prev => prev.map(x => x.id === item.id ? { ...x, checked: !x.checked } : x))}
                  className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                    item.checked 
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-200' 
                      : 'bg-[#151b23] border-[#222d3a] text-slate-400 hover:text-white'
                  }`}
                >
                  <input 
                    type="checkbox" 
                    checked={item.checked} 
                    onChange={() => {}} 
                    className="mt-0.5 accent-amber-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-[10px] font-black uppercase text-amber-400 block">{item.s}</span>
                    <p className="text-xs font-semibold leading-snug">{item.label}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-slate-800 pt-3">
              <span className="text-xs font-mono font-bold text-slate-400">
                {fiveSItems.filter(i => i.checked).length} / {fiveSItems.length} itens marcados
              </span>
              <button
                disabled={fiveSItems.filter(i => i.checked).length < fiveSItems.length}
                onClick={() => {
                  setFiveSSubmitted(true);
                  setShow5SModal(false);
                  triggerToast('Checklist 5S da área do ajudante registrado com sucesso!');
                }}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg disabled:opacity-40"
              >
                REGISTRAR 5S
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5 PORQUÊS (SE NÃO BATEU A META) */}
      {showFiveWhysModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#11151c] border border-rose-500/50 rounded-2xl p-6 max-w-xl w-full flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-rose-500/30 pb-3">
              <div className="flex items-center gap-2 text-rose-400">
                <HelpCircle className="w-5 h-5" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  ANÁLISE DE DESVIO DE META — 5 PORQUÊS
                </h3>
              </div>
              <button onClick={() => setShowFiveWhysModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl text-xs text-rose-300">
              <strong>Desvio Detectado:</strong> Sua produtividade em Repack ou Despejo ficou abaixo da meta no dia de hoje.
              Para finalizar a jornada, preencha obrigatoriamente os 5 Porquês e a ação corretiva.
            </div>

            <div className="flex flex-col gap-3 max-h-[380px] overflow-y-auto pr-1">
              {[1, 2, 3, 4, 5].map(num => (
                <div key={num} className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-300 uppercase">
                    {num}º Porquê {num === 1 ? '(Por que a meta de Repack/Despejo não foi atingida?)' : ''}
                  </label>
                  <input
                    type="text"
                    value={(fiveWhysData as any)[`porque${num}`]}
                    onChange={e => setFiveWhysData(prev => ({ ...prev, [`porque${num}`]: e.target.value }))}
                    placeholder={`Descreva o ${num}º motivo...`}
                    className="w-full bg-[#151b23] border border-[#222d3a] rounded-lg p-2.5 text-xs text-white focus:border-rose-500 outline-none"
                  />
                </div>
              ))}

              <div className="flex flex-col gap-1 mt-2">
                <label className="text-[10px] font-bold text-emerald-400 uppercase">
                  Ação Corretiva Imediata (O que será feito para corrigir no próximo turno?)
                </label>
                <textarea
                  rows={2}
                  value={fiveWhysData.acaoCorretiva}
                  onChange={e => setFiveWhysData(prev => ({ ...prev, acaoCorretiva: e.target.value }))}
                  placeholder="Descreva a ação corretiva..."
                  className="w-full bg-[#151b23] border border-[#222d3a] rounded-lg p-2.5 text-xs text-white focus:border-emerald-500 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-3">
              <button
                onClick={() => setShowFiveWhysModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold uppercase"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmitFiveWhys}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg"
              >
                ENVIAR 5 PORQUÊS E FINALIZAR JORNADA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARABÉNS (META ATINGIDA) */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#11151c] border border-emerald-500/50 rounded-2xl p-6 max-w-md w-full flex flex-col items-center gap-4 text-center shadow-2xl">
            <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-full animate-bounce">
              <Award className="w-10 h-10" />
            </div>

            <h3 className="text-lg font-black text-white uppercase tracking-wider">
              PARABÉNS! META ATINGIDA!
            </h3>

            <p className="text-xs text-slate-300">
              Excelente trabalho! Suas metas de produtividade em Repack e Despejo foram atingidas com sucesso no dia de hoje.
            </p>

            <button
              onClick={() => finalizeShiftProcess(false)}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg mt-2"
            >
              CONCLUIR E REGISTRAR JORNADA
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
