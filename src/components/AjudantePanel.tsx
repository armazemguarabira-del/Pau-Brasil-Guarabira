import React, { useState, useEffect } from 'react';
import { Usuario, Empresa } from '../types';
import { useEmpresaData } from '../context/EmpresaDataContext';
import { saveJornadaRecord, JornadaRecord } from '../utils/jornadaUtils';
import RepackPanel from './RepackPanel';
import DespejoPanel from './DespejoPanel';
import QuebrasPanel from './QuebrasPanel';
import { Checklist5SForm, Collaborator5SPerformanceCard } from './Checklist5SModal';
import { GuiaAcoesOperacionais } from './GuiaAcoesOperacionais';
import { OperationalCollaboratorPnpBanner } from './OperationalCollaboratorPnpBanner';
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
  Shield,
  ShieldCheck,
  ExternalLink,
  Truck,
  Utensils,
  Edit2,
  Save,
  Lightbulb,
  Send,
  Zap
} from 'lucide-react';
import { add5PorquesDemand } from '../utils/fiveWhysManager';
import { AcaoCorretiva, getAcoesAll, saveAcoes } from '../utils/simulacaoAcoesUtils';

interface AjudantePanelProps {
  user: Usuario;
  empresa: Empresa | null;
  theme?: 'light' | 'dark';
}

interface ShiftHistoryRecord {
  id: string;
  dataStr: string;
  horaInicio: string;
  intervaloInicio?: string;
  intervaloFim?: string;
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

  // Tab State: 'repack' | 'despejo' | 'quebras' | 'retorno_rota' | '5s' | 'historico' | 'acoes'
  const [activeTab, setActiveTab] = useState<'repack' | 'despejo' | 'quebras' | 'retorno_rota' | '5s' | 'historico' | 'acoes'>('repack');

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

  // Interval / Break State (Almoço)
  const [inInterval, setInInterval] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(shiftStorageKey);
      if (saved) return JSON.parse(saved).inInterval || false;
    } catch (e) {}
    return false;
  });

  const [intervalStartTime, setIntervalStartTime] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(shiftStorageKey);
      if (saved) return JSON.parse(saved).intervalStartTime || '';
    } catch (e) {}
    return '';
  });

  const [intervalEndTime, setIntervalEndTime] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(shiftStorageKey);
      if (saved) return JSON.parse(saved).intervalEndTime || '';
    } catch (e) {}
    return '';
  });

  // Edit Shift Record Modal State
  const [editingRecord, setEditingRecord] = useState<ShiftHistoryRecord | null>(null);
  const [editHoraInicio, setEditHoraInicio] = useState('');
  const [editHoraIntervaloInicio, setEditHoraIntervaloInicio] = useState('');
  const [editHoraIntervaloFim, setEditHoraIntervaloFim] = useState('');
  const [editHoraFim, setEditHoraFim] = useState('');

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

  // Sync Shift State to LocalStorage
  useEffect(() => {
    localStorage.setItem(shiftStorageKey, JSON.stringify({
      shiftStarted,
      shiftStartTime,
      inInterval,
      intervalStartTime,
      intervalEndTime
    }));
  }, [shiftStarted, shiftStartTime, inInterval, intervalStartTime, intervalEndTime, shiftStorageKey]);

  useEffect(() => {
    localStorage.setItem(`${shiftStorageKey}_5s`, String(fiveSSubmitted));
  }, [fiveSSubmitted, shiftStorageKey]);

  // Interval Handlers (Almoço / Descanso)
  const handleStartInterval = () => {
    const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setInInterval(true);
    setIntervalStartTime(nowStr);
    triggerToast(`☕ Intervalo de almoço/descanso iniciado às ${nowStr}!`);
  };

  const handleEndInterval = () => {
    const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setInInterval(false);
    setIntervalEndTime(nowStr);
    triggerToast(`⚡ Retorno do intervalo registrado às ${nowStr}! Bom trabalho.`);
  };

  // Open Edit Shift Modal
  const handleOpenEditRecord = (rec: ShiftHistoryRecord) => {
    setEditingRecord(rec);
    setEditHoraInicio(rec.horaInicio || '08:00');
    setEditHoraIntervaloInicio(rec.intervaloInicio || '12:00');
    setEditHoraIntervaloFim(rec.intervaloFim || '13:00');
    setEditHoraFim(rec.horaFim || '17:00');
  };

  // Save Edit Shift Point Correction
  const handleSaveEditPonto = () => {
    if (!editingRecord) return;
    const updatedHistory = shiftHistory.map(rec => {
      if (rec.id === editingRecord.id) {
        return {
          ...rec,
          horaInicio: editHoraInicio,
          intervaloInicio: editHoraIntervaloInicio,
          intervaloFim: editHoraIntervaloFim,
          horaFim: editHoraFim
        };
      }
      return rec;
    });
    setShiftHistory(updatedHistory);
    localStorage.setItem(historyStorageKey, JSON.stringify(updatedHistory));
    setEditingRecord(null);
    triggerToast('✓ Correção de ponto de jornada atualizada com sucesso no histórico!');
  };

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

  // Helper to parse duration or time string into minutes
  const parseTimeToMinutes = (timeStr?: string): number => {
    if (!timeStr) return 0;
    const str = String(timeStr).trim();
    if (str.includes(':')) {
      const parts = str.split(':').map(Number);
      if (parts.length === 3) return parts[0] * 60 + parts[1] + parts[2] / 60;
      if (parts.length === 2) return parts[0] + parts[1] / 60;
    }
    const num = parseFloat(str.replace(/[^0-9.]/g, ''));
    return isNaN(num) ? 0 : num;
  };

  // Repack: Sum of target time per unit vs Sum of actual realized time
  const totalRepackMetaMins = todayRepackEntries.reduce((sum, r) => {
    const metaUnit = parseTimeToMinutes(String(r.metaEmbalagem || r.meta || '5 min')) || 5;
    const qty = Number(r.quantidade) || 1;
    return sum + (metaUnit * qty);
  }, 0);

  const totalRepackRealMins = todayRepackEntries.reduce((sum, r) => {
    if (r.duracao) return sum + parseTimeToMinutes(String(r.duracao));
    if (r.inicio && r.fim) {
      const i = parseTimeToMinutes(r.inicio);
      const f = parseTimeToMinutes(r.fim);
      return sum + Math.max(0, f - i);
    }
    return sum;
  }, 0);

  // If actual realized time > total target time, user missed the goal
  const hasMissedRepackMeta = todayRepackEntries.length > 0 && totalRepackRealMins > totalRepackMetaMins;

  // Repack: 2 Metas Oficiais: (1) 10 cx/h e (2) Meta por Embalagem (Soma das metas vs Real)
  const totalRepackQty = todayRepackEntries.reduce((sum, r) => sum + (Number(r.quantidade) || 0), 0);
  const totalRepackHours = totalRepackRealMins / 60;
  const realRepackCxHora = totalRepackHours > 0 ? (totalRepackQty / totalRepackHours) : 0;
  const isGatilhoRepack10CxAtivo = todayRepackEntries.length > 0 && realRepackCxHora < 10.0;

  // Despejo: Sum of target time per unit vs Sum of actual realized time
  const totalDespejoMetaMins = todayDespejoEntries.reduce((sum, d) => {
    const metaUnit = parseTimeToMinutes(String(d.metaEmbalagem || d.meta || '5 min')) || 5;
    const qty = Number(d.quantidade) || 1;
    return sum + (metaUnit * qty);
  }, 0);

  const totalDespejoRealMins = todayDespejoEntries.reduce((sum, d) => {
    if (d.duracao) return sum + parseTimeToMinutes(String(d.duracao));
    if (d.inicio && d.fim) {
      const i = parseTimeToMinutes(d.inicio);
      const f = parseTimeToMinutes(d.fim);
      return sum + Math.max(0, f - i);
    }
    return sum;
  }, 0);

  // If actual realized time > total target time, user missed the goal
  const hasMissedDespejoMeta = todayDespejoEntries.length > 0 && totalDespejoRealMins > totalDespejoMetaMins;

  const overallMetaMet = !hasMissedRepackMeta && !hasMissedDespejoMeta;

  // State for Operação Ajudante Improvement Suggestions
  const [sugestaoProcesso, setSugestaoProcesso] = useState('Repack');
  const [sugestaoTitulo, setSugestaoTitulo] = useState('');
  const [sugestaoDescricao, setSugestaoDescricao] = useState('');

  const handleSendSugestao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sugestaoTitulo.trim() || !sugestaoDescricao.trim()) return;

    const currentAcoes = getAcoesAll();
    const todayStrNow = new Date().toLocaleDateString('pt-BR');
    const todayISONow = new Date().toISOString().split('T')[0];

    let proc: AcaoCorretiva['processo'] = 'Picking';
    if (sugestaoProcesso === 'Repack') proc = 'Repack';
    else if (sugestaoProcesso === 'Despejo') proc = 'Despejo';
    else if (sugestaoProcesso === 'Quebras') proc = 'Gestão de Quebras';

    const newAcao: AcaoCorretiva = {
      id: `SUGESTO_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      data: todayStrNow,
      dataISO: todayISONow,
      hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      processo: proc,
      setor: sugestaoProcesso,
      colaboradorResponsavel: user.nome,
      indicador: 'Sugestão de Melhoria da Operação',
      meta: 'Análise do Administrativo',
      resultadoObtido: 'Enviado',
      desvioEncontrado: `[SUGESTÃO OPERACIONAL - ${user.nome}] ${sugestaoTitulo}: ${sugestaoDescricao}`,
      causaRaiz: 'Método',
      status: 'Pendente',
      responsavelTratativa: 'Administrativo / Gestão',
      prazo: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      comentarioOperador: sugestaoDescricao,
      simulado: false,
      criadoEm: new Date().toISOString(),
      tipoAcao: 'Melhoria',
      prioridade: 'Média',
      contramedida: sugestaoDescricao,
      aprovacaoGestor: 'Pendente',
      aceiteColaborador: true,
      abertoPor: `${user.nome} (${user.cargo || 'Ajudante/Operador'})`,
      dataAbertura: `${todayStrNow} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
      area: sugestaoProcesso,
      reuniao: 'Ação Sugestiva - Operação',
      obsResponsavel: sugestaoDescricao,
      historicoAlteracoes: [{
        dataHora: `${todayStrNow} ${new Date().toLocaleTimeString('pt-BR')}`,
        usuario: user.nome,
        alteracao: 'Sugestão de melhoria enviada pela operação para análise do administrativo.'
      }]
    };

    saveAcoes([newAcao, ...currentAcoes]);
    setSugestaoTitulo('');
    setSugestaoDescricao('');
    triggerToast('✓ Sugestão enviada ao Administrativo como ação sugestiva com sucesso!');
  };

  // Handle Shift Start
  const handleStartShift = () => {
    const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setShiftStarted(true);
    setShiftStartTime(nowStr);
    setFiveSSubmitted(false);
    setFiveSItems(prev => prev.map(i => ({ ...i, checked: false })));
    triggerToast(`🚀 Jornada da Operação Ajudante iniciada às ${nowStr}!`);
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
    const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const today = new Date().toLocaleDateString('pt-BR');

    // Calculate duration
    let durStr = '00:00:00';
    if (shiftStartTime) {
      try {
        const [h1, m1] = shiftStartTime.split(':').map(Number);
        const [h2, m2] = nowStr.split(':').map(Number);
        const diffMinutes = Math.max(0, (h2 * 60 + m2) - (h1 * 60 + m1));
        const hrs = Math.floor(diffMinutes / 60);
        const mins = diffMinutes % 60;
        durStr = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`;
      } catch (e) {}
    }

    const newRecord: ShiftHistoryRecord = {
      id: String(Date.now()),
      dataStr: today,
      horaInicio: shiftStartTime || '08:00',
      intervaloInicio: intervalStartTime || '12:00',
      intervaloFim: intervalEndTime || '13:00',
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

    setInInterval(false);
    setIntervalStartTime('');
    setIntervalEndTime('');

    // Save to global WLP journey tracker
    const todayISO = new Date().toISOString().split('T')[0];
    const parts = todayISO.split('-');
    const mesAno = `${parts[1]}/${parts[0]}`;
    let diffHrs = 7.33;
    if (shiftStartTime) {
      try {
        const [h1, m1] = shiftStartTime.split(':').map(Number);
        const [h2, m2] = nowStr.split(':').map(Number);
        diffHrs = parseFloat(((Math.max(0, (h2 * 60 + m2) - (h1 * 60 + m1))) / 60).toFixed(2)) || 7.33;
      } catch (e) {}
    }

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
      <div className="bg-white border border-slate-200 text-slate-900 p-4 sm:p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl text-blue-600 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-blue-50 text-blue-600 border border-blue-200 text-[11px] font-black uppercase px-3 py-0.5 rounded-full inline-block">
                Especialista de Armazém
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Atendimento unificado: Repack, Despejo e Avarias de Quebras.
            </p>
          </div>
        </div>

        {/* CONTROLES DA JORNADA & INTERVALO */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          {!shiftStarted ? (
            <button
              onClick={handleStartShift}
              className="px-6 py-2.5 rounded-xl bg-[#00a86b] hover:bg-[#00925d] text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-sm transition-all"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>INICIAR JORNADA</span>
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
              <div className="px-3 py-1 flex items-center gap-2 text-xs font-mono font-bold text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-200">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>JORNADA ATIVA ({shiftStartTime})</span>
              </div>

              {!inInterval ? (
                <button
                  onClick={handleStartInterval}
                  className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                  title="Marcar início do intervalo de almoço/descanso"
                >
                  <Utensils className="w-3.5 h-3.5" />
                  <span>Sair P/ Intervalo</span>
                </button>
              ) : (
                <button
                  onClick={handleEndInterval}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-sm animate-pulse"
                  title="Marcar retorno do intervalo"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Retornar ({intervalStartTime})</span>
                </button>
              )}

              <button
                onClick={handleFinishShiftClick}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>FINALIZAR</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3 METRIC CARDS (REPACK, DESPEJO, QUALIDADE & WQI DO MÊS) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
        {/* CARD 1: META REPACK HOJE */}
        <div className="bg-white border border-slate-200 text-slate-900 p-4 sm:p-5 rounded-2xl shadow-sm flex flex-col justify-between h-full">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-500 rounded-xl border border-blue-100 shrink-0">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <span className="font-extrabold text-[11px] text-slate-700 uppercase tracking-wider block">
                  META REPACK HOJE
                </span>
                <span className="font-bold text-[10px] text-slate-400 uppercase tracking-wider block">
                  (TEMPO POR UNIDADE)
                </span>
              </div>
            </div>

            <div>
              {todayRepackEntries.length === 0 ? (
                <span className="border border-slate-300 text-slate-500 font-bold text-[10px] uppercase px-2.5 py-1 rounded-full inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                  SEM REGISTROS
                </span>
              ) : hasMissedRepackMeta ? (
                <span className="bg-rose-50 text-rose-700 border border-rose-300 font-bold text-[10px] uppercase px-2.5 py-1 rounded-full inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                  FORA DA META
                </span>
              ) : (
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold text-[10px] uppercase px-2.5 py-1 rounded-full inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  META ATINGIDA
                </span>
              )}
            </div>
          </div>

          <div className="text-[11px] text-slate-500 font-medium mt-4">
            <span>Soma Meta Produtos:</span>
            <div className="text-slate-600 font-bold mt-0.5">
              {totalRepackMetaMins.toFixed(0)} min | Tempo Realizado: {totalRepackRealMins.toFixed(0)} min
            </div>
          </div>
        </div>

        {/* CARD 2: META DESPEJO HOJE */}
        <div className="bg-white border border-slate-200 text-slate-900 p-4 sm:p-5 rounded-2xl shadow-sm flex flex-col justify-between h-full">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-50 text-rose-500 rounded-xl border border-rose-100 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <span className="font-extrabold text-[11px] text-slate-700 uppercase tracking-wider block">
                  META DESPEJO HOJE
                </span>
                <span className="font-bold text-[10px] text-slate-400 uppercase tracking-wider block">
                  (TEMPO POR UNIDADE)
                </span>
              </div>
            </div>

            <div>
              {todayDespejoEntries.length === 0 ? (
                <span className="border border-slate-300 text-slate-500 font-bold text-[10px] uppercase px-2.5 py-1 rounded-full inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                  SEM REGISTROS
                </span>
              ) : hasMissedDespejoMeta ? (
                <span className="bg-rose-50 text-rose-700 border border-rose-300 font-bold text-[10px] uppercase px-2.5 py-1 rounded-full inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                  FORA DA META
                </span>
              ) : (
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold text-[10px] uppercase px-2.5 py-1 rounded-full inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  META ATINGIDA
                </span>
              )}
            </div>
          </div>

          <div className="text-[11px] text-slate-500 font-medium mt-4">
            <span>Soma Meta Produtos:</span>
            <div className="text-slate-600 font-bold mt-0.5">
              {totalDespejoMetaMins.toFixed(0)} min | Tempo Realizado: {totalDespejoRealMins.toFixed(0)} min
            </div>
          </div>
        </div>

        {/* CARD 3: QUALIDADE & WQI DO MÊS */}
        <div className="bg-white border border-slate-200 text-slate-900 p-4 sm:p-5 rounded-2xl shadow-sm flex flex-col justify-between h-full">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-sky-50 text-sky-500 rounded-xl border border-sky-100 shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <span className="font-extrabold text-[11px] text-slate-700 uppercase tracking-wider block">
                  QUALIDADE & WQI DO MÊS
                </span>
              </div>
            </div>

            <div>
              <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold text-[10px] uppercase px-2.5 py-1 rounded-full inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                META ATINGIDA
              </span>
            </div>
          </div>

          <div className="flex items-baseline justify-end my-1">
            <span className="text-2xl font-black text-emerald-600">98.2%</span>
          </div>

          <div className="text-[11px] text-slate-500 font-medium">
            <span>Meta do Mês: ≥ 95.0%</span>
          </div>
        </div>
      </div>

      {/* WARNING IF SHIFT NOT STARTED */}
      {!shiftStarted && (
        <div className="bg-sky-50/70 border border-sky-200 text-sky-950 px-4 py-3 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <Clock className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>Atenção:</strong> Você ainda não iniciou a jornada de hoje. Clique em <strong>INICIAR JORNADA</strong> no topo para habilitar os lançamentos.
            </span>
          </div>
          <button
            onClick={handleStartShift}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm shrink-0 cursor-pointer"
          >
            INICIAR AGORA
          </button>
        </div>
      )}

      {/* MAIN TABS NAV - SYMMETRICAL 7 TABS */}
      <div className="bg-white border border-slate-200 p-1.5 rounded-2xl flex items-center gap-1.5 shadow-sm overflow-x-auto w-full">
        <button
          onClick={() => setActiveTab('repack')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'repack'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5 shrink-0" />
          <span>1. REPACK</span>
        </button>

        <button
          onClick={() => setActiveTab('despejo')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'despejo'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Trash2 className="w-3.5 h-3.5 shrink-0" />
          <span>2. DESPEJO</span>
        </button>

        <button
          onClick={() => setActiveTab('quebras')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'quebras'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>3. QUEBRAS</span>
        </button>

        <button
          onClick={() => setActiveTab('retorno_rota')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'retorno_rota'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Truck className="w-3.5 h-3.5 shrink-0" />
          <span>4. RETORNO DE ROTA</span>
        </button>

        <button
          onClick={() => setActiveTab('5s')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === '5s'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
          <span>5. REALIZAÇÃO DO 5S</span>
        </button>

        <button
          onClick={() => setActiveTab('historico')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'historico'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <History className="w-3.5 h-3.5 shrink-0" />
          <span>6. HISTÓRICO</span>
        </button>

        <button
          onClick={() => setActiveTab('acoes')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'acoes'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Zap className="w-3.5 h-3.5 shrink-0" />
          <span>7. GUIA AÇÕES</span>
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
                  <th className="p-3">Intervalo (Almoço)</th>
                  <th className="p-3">Fim</th>
                  <th className="p-3">Duração Total</th>
                  <th className="p-3">Meta Repack</th>
                  <th className="p-3">Meta Despejo</th>
                  <th className="p-3">Status 5S</th>
                  <th className="p-3 text-right">Ação / Correção</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c2530] text-xs">
                {shiftHistory.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500 italic">
                      Nenhum histórico de jornada registrado ainda.
                    </td>
                  </tr>
                ) : (
                  shiftHistory.map(rec => (
                    <tr key={rec.id} className="hover:bg-[#151b23] transition-all">
                      <td className="p-3 font-mono font-bold text-amber-400">{rec.dataStr}</td>
                      <td className="p-3 font-mono text-slate-300">{rec.horaInicio}</td>
                      <td className="p-3 font-mono text-amber-300/90 font-bold">
                        {rec.intervaloInicio ? `${rec.intervaloInicio} - ${rec.intervaloFim || 'Em andamento'}` : '12:00 - 13:00'}
                      </td>
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
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleOpenEditRecord(rec)}
                          className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ml-auto cursor-pointer"
                          title="Corrigir marcação de ponto ou horários de intervalo"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Corrigir Ponto</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 7: GUIA DE AÇÕES */}
      {activeTab === 'acoes' && (
        <GuiaAcoesOperacionais user={user} roleName="Ajudante" />
      )}

      {/* SEÇÃO DE SUGESTÕES DE MELHORIA DA OPERAÇÃO (Cria Ações Sugestivas para o ADM) */}
      <div className="bg-[#11151c] border border-amber-500/30 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
            <Lightbulb className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
              Sugestões de Melhoria da Operação
            </h3>
            <p className="text-xs text-slate-400">
              Envie sugestões de melhoria da rotina. Elas serão registradas como <strong>Ações Sugestivas</strong> no painel do Administrativo.
            </p>
          </div>
        </div>

        <form onSubmit={handleSendSugestao} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-300 uppercase block mb-1">Processo / Setor:</label>
              <select
                value={sugestaoProcesso}
                onChange={e => setSugestaoProcesso(e.target.value)}
                className="w-full bg-[#151b23] border border-[#222d3a] rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500 font-bold"
              >
                <option value="Repack">Repack</option>
                <option value="Despejo">Despejo</option>
                <option value="Quebras">Quebras (Avarias)</option>
                <option value="Armazém">Armazém / Pátio</option>
                <option value="Picking">Picking</option>
                <option value="Retorno Rota">Retorno Rota</option>
                <option value="Geral">Geral da Operação</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-300 uppercase block mb-1">Título da Sugestão / Oportunidade:</label>
              <input
                type="text"
                value={sugestaoTitulo}
                onChange={e => setSugestaoTitulo(e.target.value)}
                placeholder="Ex: Reorganização de pallets no setor de despejo..."
                className="w-full bg-[#151b23] border border-[#222d3a] rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-300 uppercase block mb-1">Detalhamento da Sugestão:</label>
            <textarea
              rows={3}
              value={sugestaoDescricao}
              onChange={e => setSugestaoDescricao(e.target.value)}
              placeholder="Descreva detalhadamente o que pode ser melhorado e o impacto positivo para a equipe..."
              className="w-full bg-[#151b23] border border-[#222d3a] rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500"
              required
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-lg flex items-center gap-2 transition-all"
            >
              <Send className="w-4 h-4" />
              <span>Enviar Sugestão ao Administrativo</span>
            </button>
          </div>
        </form>
      </div>

      {/* MODAL DE CORREÇÃO DE PONTO / HORÁRIOS DA JORNADA */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#11151c] border border-amber-500/50 rounded-2xl p-6 max-w-md w-full flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-amber-500/30 pb-3">
              <div className="flex items-center gap-2 text-amber-400">
                <Edit2 className="w-5 h-5" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  CORRIGIR MARCAÇÃO DE PONTO ({editingRecord.dataStr})
                </h3>
              </div>
              <button onClick={() => setEditingRecord(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Caso haja erro de registro no ponto do colaborador, ajuste os horários de início, intervalo de almoço ou término da jornada abaixo:
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Hora Início Jornada</label>
                <input
                  type="text"
                  value={editHoraInicio}
                  onChange={e => setEditHoraInicio(e.target.value)}
                  className="bg-[#151b23] border border-[#222d3a] rounded-lg p-2 text-xs font-mono text-white outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Hora Fim Jornada</label>
                <input
                  type="text"
                  value={editHoraFim}
                  onChange={e => setEditHoraFim(e.target.value)}
                  className="bg-[#151b23] border border-[#222d3a] rounded-lg p-2 text-xs font-mono text-white outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-amber-400 uppercase">Início Intervalo (Almoço)</label>
                <input
                  type="text"
                  value={editHoraIntervaloInicio}
                  onChange={e => setEditHoraIntervaloInicio(e.target.value)}
                  className="bg-[#151b23] border border-[#222d3a] rounded-lg p-2 text-xs font-mono text-amber-300 outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-amber-400 uppercase">Retorno Intervalo (Almoço)</label>
                <input
                  type="text"
                  value={editHoraIntervaloFim}
                  onChange={e => setEditHoraIntervaloFim(e.target.value)}
                  className="bg-[#151b23] border border-[#222d3a] rounded-lg p-2 text-xs font-mono text-amber-300 outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-3">
              <button
                onClick={() => setEditingRecord(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold uppercase cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEditPonto}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase cursor-pointer flex items-center gap-1.5 shadow-lg"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Correção</span>
              </button>
            </div>
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
