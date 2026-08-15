import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, updateDoc, doc, addDoc } from 'firebase/firestore';
import { Usuario, Empresa, Tarefa, TmrDemand, FefoRelocationDemand } from '../types';
import { useEmpresaData } from '../context/EmpresaDataContext';
import SugerirMelhoriaCard from './SugerirMelhoriaCard';
import { filterHistoryForUser, HistoryRestrictionNotice } from '../utils/historyFilter';
import { 
  getStoredEfcVehicles, 
  saveEfcVehicles, 
  subscribeToEfcVehicles,
  EfcEfdVehicle, 
  calculateEfcMetrics, 
  calculateEfdMetrics 
} from '../utils/efcEfdManager';
import { 
  getStoredTmrDemands, 
  updateTmrDemandStatus 
} from '../utils/tmrManager';
import {
  getStoredFefoDemands,
  syncFefoDemandsFromValidades,
  updateFefoDemandStatus
} from '../utils/fefoDemandManager';
import { saveAcoes, getAcoesAll, updateAcaoCorretiva, AcaoCorretiva } from '../utils/simulacaoAcoesUtils';
import { saveJornadaRecord, JornadaRecord } from '../utils/jornadaUtils';
import { add5PorquesDemand } from '../utils/fiveWhysManager';
import { OperationalNotificationBell } from './OperationalNotificationBell';
import { Checklist5SForm, Collaborator5SPerformanceCard } from './Checklist5SModal';
import { GuiaAcoesOperacionais } from './GuiaAcoesOperacionais';
import { OperationalCollaboratorPnpBanner } from './OperationalCollaboratorPnpBanner';
import { 
  Truck, 
  Clock, 
  CheckCircle2, 
  Play, 
  AlertTriangle, 
  Moon, 
  Package, 
  Layers, 
  UserCheck, 
  Activity,
  ChevronDown,
  History,
  FileText,
  X,
  Award,
  Download,
  HelpCircle,
  SquareCheck,
  Zap,
  Power,
  RotateCcw
} from 'lucide-react';

interface EmpilhadorPanelProps {
  user: Usuario;
  empresa: Empresa | null;
  theme?: 'light' | 'dark';
}

// Helper Component: Real-time Live Timer Widget for Picking/R&R Task against official SLA (5 min / pallet)
function TaskTimerWidget({ task }: { task: Tarefa }) {
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const startTime = task.iniciadoEm ? new Date(task.iniciadoEm).getTime() : now;
  const elapsedSeconds = Math.max(0, Math.floor((now - startTime) / 1000));

  const pallets = task.quantidade > 15 ? Math.ceil(task.quantidade / 30) : (task.quantidade || 1);
  const targetMinutes = pallets * 5; // Official Target: 5 min per pallet
  const targetSeconds = targetMinutes * 60;

  const isWithinMeta = elapsedSeconds <= targetSeconds;

  const formatTime = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = Math.floor(totalSec % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className={`p-3 rounded-xl border transition-all flex flex-col gap-1.5 mt-2 ${
      isWithinMeta 
        ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-300' 
        : 'bg-red-950/40 border-red-500/80 text-red-300 animate-pulse'
    }`}>
      <div className="flex items-center justify-between text-xs font-bold">
        <span className="uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
          {isWithinMeta ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ⚡ CRONÔMETRO NO PRAZO (Meta: 5m/palete)
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4 text-red-400" />
              ⚠️ ALERTA: SLA EXCEDIDO (&gt; 5m/palete)
            </>
          )}
        </span>

        <span className="font-mono font-black text-sm text-white">
          {formatTime(elapsedSeconds)} <span className="text-slate-400 text-xs">/ {formatTime(targetSeconds)}</span>
        </span>
      </div>

      <div className="w-full bg-slate-800/80 h-2 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ${isWithinMeta ? 'bg-emerald-400' : 'bg-red-500'}`}
          style={{ width: `${Math.min(100, (elapsedSeconds / (targetSeconds || 1)) * 100)}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
        <span>Volume: {pallets} PL ({task.quantidade} cx)</span>
        <span>Meta estipulada: {targetMinutes} min limite</span>
      </div>
    </div>
  );
}

export default function EmpilhadorPanel({ user, empresa, theme = 'dark' }: EmpilhadorPanelProps) {
  const empresaId = empresa?.id || 'demo';
  const draftKey = `empilhador_draft_${empresaId}_${user.uid || user.nome || 'guest'}`;

  // Active Logged-in Operator Name
  const [operatorName, setOperatorName] = useState<string>(() => user.nome || 'PAULO PEREIRA');
  
  useEffect(() => {
    if (user?.nome) {
      setOperatorName(user.nome.toUpperCase());
    }
  }, [user]);

  // Shift Management State (Iniciar / Encerrar Jornada)
  const [shiftStarted, setShiftStarted] = useState<boolean>(() => {
    return localStorage.getItem(`shift_active_${empresaId}_${user.nome}`) === 'true';
  });
  const [shiftStartTime, setShiftStartTime] = useState<string>(() => {
    return localStorage.getItem(`shift_start_${empresaId}_${user.nome}`) || '';
  });

  // POP Operational Module Selector State
  const [selectedSopOp, setSelectedSopOp] = useState<'efc_efd' | 'ressuprimento' | 'tmr'>('efc_efd');
  
  // POP Modal State
  const [showPopModal, setShowPopModal] = useState<boolean>(false);
  const [popAgreed, setPopAgreed] = useState<boolean>(false);
  
  // Operator Action Comments State
  const [actionComments, setActionComments] = useState<Record<string, string>>({});

  // 5 Whys Modal State
  const [showFiveWhysModal, setShowFiveWhysModal] = useState<boolean>(false);
  const [shiftSuccessCelebration, setShiftSuccessCelebration] = useState<boolean>(false);

  const [fiveWhysData, setFiveWhysData] = useState({
    porque1: '',
    porque2: '',
    porque3: '',
    porque4: '',
    porque5: '',
    causaRaiz: '',
    planoAcao: ''
  });

  // Safety Checklist State
  const defaultChecklist = [
    { id: 1, label: 'Corredor de operação isolado', desc: 'Isolamento com cones ou fitas refletivas nas duas cabeceiras do corredor.', checked: false },
    { id: 2, label: 'Zonas de pedestre livres', desc: 'Confirmado que nenhum pedestre transita dentro da área operacional de manobra.', checked: false },
    { id: 3, label: 'Sinalização visual ativa', desc: 'Luz giratória (giroflex) ou strobo e buzina atestadas como operacionais.', checked: false },
    { id: 4, label: 'Piso livre de resíduos', desc: 'Obstáculos, paletes avariados, plásticos ou fitas de arquear removidos do piso.', checked: false },
    { id: 5, label: 'Iluminação de pátio adequada', desc: 'Visibilidade regular para empilhadeira atestada na zona operativa.', checked: false },
  ];
  const [checklist, setChecklist] = useState(defaultChecklist);
  const [checklistDone, setChecklistDone] = useState<boolean>(false);

  // Subtab for Demand Board: 7 main tabs ('carregamento' | 'descarregamento' | 'tmr' | 'rr' | 'realocacao_dedo' | '5s' | 'historico')
  const [demandTab, setDemandTab] = useState<'carregamento' | 'descarregamento' | 'tmr' | 'rr' | 'realocacao_dedo' | '5s' | 'historico'>('carregamento');
  
  // Per-tab history toggle states
  const [efcHistoryView, setEfcHistoryView] = useState<boolean>(false);
  const [tmrHistoryView, setTmrHistoryView] = useState<boolean>(false);
  const [rrHistoryView, setRrHistoryView] = useState<boolean>(false);
  const [fefoHistoryView, setFefoHistoryView] = useState<boolean>(false);

  // EFC / EFD Vehicles state
  const [efcVehicles, setEfcVehicles] = useState<EfcEfdVehicle[]>(() => getStoredEfcVehicles(empresaId));
  
  // TMR Demands state
  const [tmrDemands, setTmrDemands] = useState<TmrDemand[]>(() => getStoredTmrDemands(empresaId));

  // FEFO Relocation Demands state
  const [fefoDemands, setFefoDemands] = useState<FefoRelocationDemand[]>(() => {
    try {
      const savedValidadesStr = localStorage.getItem(`validades_${empresaId}`);
      const savedValidades = savedValidadesStr ? JSON.parse(savedValidadesStr) : [];
      return syncFefoDemandsFromValidades(empresaId, savedValidades);
    } catch (e) {
      return getStoredFefoDemands(empresaId);
    }
  });

  // Picking Tasks state
  const [tasks, setTasks] = useState<Tarefa[]>([]);

  const empresaData = useEmpresaData();

  // Load and subscribe to real-time events
  useEffect(() => {
    const unsubEfc = subscribeToEfcVehicles(empresaId, (list) => {
      setEfcVehicles(list);
    });

    const reloadTmr = () => {
      setTmrDemands(getStoredTmrDemands(empresaId));
    };

    const reloadFefo = () => {
      try {
        const savedValidadesStr = localStorage.getItem(`validades_${empresaId}`);
        const savedValidades = savedValidadesStr ? JSON.parse(savedValidadesStr) : [];
        setFefoDemands(syncFefoDemandsFromValidades(empresaId, savedValidades));
      } catch (e) {
        setFefoDemands(getStoredFefoDemands(empresaId));
      }
    };

    window.addEventListener('tmr_demands_updated', reloadTmr);
    window.addEventListener('fefo_demands_updated', reloadFefo);
    window.addEventListener('storage', reloadFefo);
    window.addEventListener('local_data_changed', reloadFefo);
    window.addEventListener('app_data_updated', reloadFefo);

    return () => {
      unsubEfc();
      window.removeEventListener('tmr_demands_updated', reloadTmr);
      window.removeEventListener('fefo_demands_updated', reloadFefo);
      window.removeEventListener('storage', reloadFefo);
      window.removeEventListener('local_data_changed', reloadFefo);
      window.removeEventListener('app_data_updated', reloadFefo);
    };
  }, [empresaId]);

  // Sync tasks from Firestore / localStorage
  useEffect(() => {
    if (!db) {
      const savedTasks = localStorage.getItem(`tasks_${empresaId}`);
      if (savedTasks) setTasks(JSON.parse(savedTasks));
      return;
    }
    setTasks(empresaData.tarefas || []);
    localStorage.setItem(`tasks_${empresaId}`, JSON.stringify(empresaData.tarefas || []));
  }, [empresaData.tarefas, empresaId]);

  // Helpers
  const triggerToast = (msg: string, err?: boolean) => {
    const el = document.getElementById('toast');
    if (el) {
      el.style.background = err ? '#ef4444' : '#22c55e';
      el.style.color = err ? '#ffffff' : '#07090d';
      el.textContent = msg;
      el.className = 'toast show';
      setTimeout(() => {
        el.className = 'toast';
        el.style.background = '';
        el.style.color = '';
      }, 3500);
    }
  };

  // Shift Start / End Logic
  const handleStartShift = () => {
    const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setShiftStarted(true);
    setShiftStartTime(nowStr);
    localStorage.setItem(`shift_active_${empresaId}_${user.nome}`, 'true');
    localStorage.setItem(`shift_start_${empresaId}_${user.nome}`, nowStr);
    triggerToast(`Jornada iniciada às ${nowStr} por ${user.nome || operatorName}! Bom trabalho.`);
  };

  const handleRequestEndShift = () => {
    // Check if operator met all targets today
    const activeOperatorClean = (user.nome || operatorName).toUpperCase().trim();
    const myCompletedEfc = efcVehicles.filter(v => v.statusCarregamento === 'Finalizado' && (v.operadorExecutorCarregamento || '').toUpperCase().includes(activeOperatorClean));
    const myCompletedEfd = efcVehicles.filter(v => v.statusDescarregamento === 'Finalizado' && (v.operadorExecutorDescarregamento || '').toUpperCase().includes(activeOperatorClean));
    
    const totalDone = myCompletedEfc.length + myCompletedEfd.length;
    const delayedEfc = myCompletedEfc.filter(v => v.efcCompliant === false).length;
    const delayedEfd = myCompletedEfd.filter(v => v.efdCompliant === false).length;

    if (totalDone > 0 && delayedEfc === 0 && delayedEfd === 0) {
      // Targets MET!
      setShiftSuccessCelebration(true);
      setShiftStarted(false);
      localStorage.removeItem(`shift_active_${empresaId}_${user.nome}`);
    } else if (totalDone === 0) {
      // No tasks finished, open 5 Whys
      setShowFiveWhysModal(true);
    } else if (delayedEfc > 0 || delayedEfd > 0) {
      // Missed some target -> Required 5 Whys
      setShowFiveWhysModal(true);
    } else {
      setShiftSuccessCelebration(true);
      setShiftStarted(false);
      localStorage.removeItem(`shift_active_${empresaId}_${user.nome}`);
    }
  };

  const handleSubmitFiveWhys = () => {
    if (!fiveWhysData.porque1 || !fiveWhysData.causaRaiz) {
      alert('Por favor preencha ao menos o Primeiro Porquê e a Causa Raiz para concluir o encerramento de turno.');
      return;
    }

    // Save Action Item for management
    const existing = getAcoesAll();
    const newAcao: any = {
      id: `5W_${Date.now()}`,
      data: new Date().toLocaleDateString('pt-BR'),
      dataISO: new Date().toISOString().split('T')[0],
      hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      processo: 'Carregamento',
      setor: 'Pátio Operacional',
      colaboradorResponsavel: user.nome || operatorName,
      indicador: 'EFC / EFD Metas de Pátio',
      meta: '100% no prazo (EFC ≤06:30 / EFD ≤22:00)',
      resultadoObtido: 'Desvio no tempo de ciclo do turno',
      desvioEncontrado: `Análise de causa raiz 5 Porquês por ${user.nome || operatorName}`,
      causaRaiz: 'Método',
      status: 'Pendente',
      responsavelTratativa: 'Supervisor de Operações',
      prazo: new Date(Date.now() + 2*86400000).toISOString().split('T')[0],
      comentarioOperador: fiveWhysData.planoAcao || 'Encaminhado via 5 Porquês',
      cincoPorques: {
        porque1: fiveWhysData.porque1,
        porque2: fiveWhysData.porque2,
        porque3: fiveWhysData.porque3,
        porque4: fiveWhysData.porque4,
        porque5: fiveWhysData.porque5
      },
      contramedida: fiveWhysData.planoAcao,
      simulado: false,
      tipoAcao: 'Corretiva',
      prioridade: 'Alta',
      criadoEm: new Date().toISOString(),
      historicoAlteracoes: [{
        dataHora: new Date().toLocaleString('pt-BR'),
        usuario: user.nome || operatorName,
        alteracao: '5 Porquês registrado no encerramento de jornada do empilhador'
      }]
    };

    saveAcoes([newAcao, ...existing]);

    add5PorquesDemand(empresaId, {
      data: new Date().toLocaleDateString('pt-BR'),
      dataISO: new Date().toISOString().split('T')[0],
      hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      colaborador: user.nome || operatorName,
      processo: 'EFC / EFD / Empilhador',
      indicador: 'EFC / EFD Metas de Pátio',
      meta: '100% no prazo (EFC ≤06:30 / EFD ≤22:00)',
      resultadoObtido: 'Desvio no tempo de ciclo do turno',
      desvioEncontrado: fiveWhysData.porque1 || 'Análise de causa raiz 5 Porquês por empilhador',
      porque1: fiveWhysData.porque1,
      porque2: fiveWhysData.porque2,
      porque3: fiveWhysData.porque3,
      porque4: fiveWhysData.porque4,
      porque5: fiveWhysData.porque5,
      status: 'Pendente'
    });

    const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const todayStr = new Date().toLocaleDateString('pt-BR');
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
      id: `jrn-emp-${Date.now()}`,
      colaboradorNome: user.nome || operatorName || 'Empilhador',
      cargo: 'Empilhador',
      dataStr: todayStr,
      dataISO: todayISO,
      mesAno,
      horaInicio: shiftStartTime || '07:00',
      horaFim: nowStr,
      duracaoHoras: diffHrs,
      empresaId: empresaId || 'demo',
      observacoes: 'Jornada Operação Empilhador',
      criadoEm: new Date().toISOString()
    };
    saveJornadaRecord(jrn);

    setShowFiveWhysModal(false);
    setShiftStarted(false);
    localStorage.removeItem(`shift_active_${empresaId}_${user.nome}`);
    triggerToast('Jornada encerrada e formulário de 5 Porquês enviado ao supervisor com sucesso!');
  };

  const handleToggleCheck = (id: number) => {
    setChecklist(prev => prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  };

  const checklistCheckedCount = checklist.filter(c => c.checked).length;
  const isChecklistCompleted = checklistCheckedCount === checklist.length;

  const handleConfirmChecklist = () => {
    if (!isChecklistCompleted) return;
    setChecklistDone(true);
    triggerToast('Checklist concluído! Quadro de demandas liberado para operação.');
  };

  // --- EFC (Carregamento) Actions ---
  const handleUpdateEfcType = (vId: string, tipoCarga: string) => {
    const updated = efcVehicles.map(v => v.id === vId ? { ...v, tipoCarga, isRecarga: tipoCarga === 'Recarga' } : v);
    setEfcVehicles(updated as EfcEfdVehicle[]);
    saveEfcVehicles(empresaId, updated as EfcEfdVehicle[]);
  };

  const handleStartEfc = (vId: string) => {
    const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const currentOp = user.nome || operatorName;
    const updated = efcVehicles.map(v => {
      if (v.id === vId) {
        const existingOps = v.operadoresExecutoresCarregamento || (v.operadorExecutorCarregamento ? [v.operadorExecutorCarregamento] : []);
        const newOps = existingOps.includes(currentOp) ? existingOps : [...existingOps, currentOp];
        const isRecarga = v.isRecarga || v.tipoCarga === 'Recarga';
        return {
          ...v,
          statusCarregamento: 'Em Carregamento' as const,
          horaInicioCarregamento: v.horaInicioCarregamento || nowStr,
          timestampInicioCarregamento: v.timestampInicioCarregamento || new Date().toISOString(),
          operadorExecutorCarregamento: newOps.join(', '),
          operadoresExecutoresCarregamento: newOps,
          isRecarga
        };
      }
      return v;
    });
    setEfcVehicles(updated as EfcEfdVehicle[]);
    saveEfcVehicles(empresaId, updated as EfcEfdVehicle[]);
    const target = updated.find(v => v.id === vId);
    if (target?.isRecarga || target?.tipoCarga === 'Recarga') {
      triggerToast(`⚡ Recarga iniciada para ${vId}. O tempo será computado no indicador TMR (não no EFC).`);
    } else {
      triggerToast(`Carregamento iniciado para ${vId} por ${currentOp}`);
    }
  };

  const handleFinishEfc = (vId: string) => {
    const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const currentOp = user.nome || operatorName;
    const updated = efcVehicles.map(v => {
      if (v.id === vId) {
        const start = v.horaInicioCarregamento || nowStr;
        let durMin = 15;
        try {
          const [sh, sm] = start.split(':').map(Number);
          const [fh, fm] = nowStr.split(':').map(Number);
          durMin = Math.max(1, (fh * 60 + fm) - (sh * 60 + sm));
        } catch(e) {}

        const efcCompliant = nowStr <= '06:30';
        const existingOps = v.operadoresExecutoresCarregamento || (v.operadorExecutorCarregamento ? [v.operadorExecutorCarregamento] : []);
        const newOps = existingOps.includes(currentOp) ? existingOps : [...existingOps, currentOp];
        const isRecarga = v.isRecarga || v.tipoCarga === 'Recarga';
        return {
          ...v,
          statusCarregamento: 'Finalizado' as const,
          // Placa carregada passa a ficar disponível em EFD
          statusDescarregamento: v.statusDescarregamento === 'Finalizado' ? 'Finalizado' : 'Pendente',
          horaFimCarregamento: nowStr,
          timestampFimCarregamento: new Date().toISOString(),
          efcCompliant,
          duracaoCarregamentoMin: durMin,
          operadorExecutorCarregamento: newOps.join(', '),
          operadoresExecutoresCarregamento: newOps,
          isRecarga
        };
      }
      return v;
    });
    setEfcVehicles(updated as EfcEfdVehicle[]);
    saveEfcVehicles(empresaId, updated as EfcEfdVehicle[]);
    
    const finishedVeh = updated.find(v => v.id === vId);
    if (finishedVeh && (finishedVeh.isRecarga || finishedVeh.tipoCarga === 'Recarga')) {
      triggerToast(`⚡ Recarga finalizada! Tempo direcionado ao indicador TMR.`);
    } else {
      triggerToast(`Carregamento EFC finalizado! Placa ${vId} encaminhada para EFD.`);
    }
  };

  // --- EFD (Descarregamento & Pernoite) Actions ---
  const handleStartEfd = (vId: string) => {
    const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const currentOp = user.nome || operatorName;
    const updated = efcVehicles.map(v => {
      if (v.id === vId) {
        const existingOps = v.operadoresExecutoresDescarregamento || (v.operadorExecutorDescarregamento ? [v.operadorExecutorDescarregamento] : []);
        const newOps = existingOps.includes(currentOp) ? existingOps : [...existingOps, currentOp];
        return {
          ...v,
          statusDescarregamento: 'Em Descarregamento' as const,
          horaInicioDescarregamento: v.horaInicioDescarregamento || nowStr,
          timestampInicioDescarregamento: v.timestampInicioDescarregamento || new Date().toISOString(),
          operadorExecutorDescarregamento: newOps.join(', '),
          operadoresExecutoresDescarregamento: newOps
        };
      }
      return v;
    });
    setEfcVehicles(updated);
    saveEfcVehicles(empresaId, updated);
    triggerToast(`Descarregamento iniciado por ${currentOp}`);
  };

  const handleFinishEfd = (vId: string) => {
    const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const currentOp = user.nome || operatorName;
    const updated = efcVehicles.map(v => {
      if (v.id === vId) {
        const start = v.horaInicioDescarregamento || nowStr;
        let durMin = 20;
        try {
          const [sh, sm] = start.split(':').map(Number);
          const [fh, fm] = nowStr.split(':').map(Number);
          durMin = Math.max(1, (fh * 60 + fm) - (sh * 60 + sm));
        } catch(e) {}

        const isPernoite = v.pernoiteMarked || v.statusDescarregamento === 'Pernoite';
        const efdCompliant = isPernoite ? true : (nowStr <= '22:00');
        const existingOps = v.operadoresExecutoresDescarregamento || (v.operadorExecutorDescarregamento ? [v.operadorExecutorDescarregamento] : []);
        const newOps = existingOps.includes(currentOp) ? existingOps : [...existingOps, currentOp];
        return {
          ...v,
          statusDescarregamento: 'Finalizado' as const,
          horaFimDescarregamento: nowStr,
          timestampFimDescarregamento: new Date().toISOString(),
          efdCompliant,
          duracaoDescarregamentoMin: durMin,
          operadorExecutorDescarregamento: newOps.join(', '),
          operadoresExecutoresDescarregamento: newOps
        };
      }
      return v;
    });
    setEfcVehicles(updated);
    saveEfcVehicles(empresaId, updated);
    triggerToast(`Descarregamento concluído! Registrado sob ${currentOp}`);
  };

  const handleMarkRecarga = (vId: string) => {
    let newIsRecarga = false;
    const updated = efcVehicles.map(v => {
      if (v.id === vId) {
        newIsRecarga = !(v.isRecarga || v.tipoCarga === 'Recarga');
        return {
          ...v,
          isRecarga: newIsRecarga,
          tipoCarga: newIsRecarga ? 'Recarga' : 'Rota Comercial'
        };
      }
      return v;
    });
    setEfcVehicles(updated);
    saveEfcVehicles(empresaId, updated);
    if (newIsRecarga) {
      triggerToast(`⚡ Veículo marcado como Recarga! Tempo direcionado ao indicador TMR (não afeta EFC).`, true);
    } else {
      triggerToast(`Status de Recarga removido do veículo.`, false);
    }
  };

  const handleMarkPernoite = (vId: string) => {
    let assignedNextStatus: 'D1' | 'D2' | 'D3' | 'D4' = 'D1';
    const updated = efcVehicles.map(v => {
      if (v.id === vId) {
        let nextStatus: 'D1' | 'D2' | 'D3' | 'D4' = 'D1';
        if (!v.pernoiteMarked) {
          nextStatus = v.pernoiteStatus || 'D1';
        } else if (v.pernoiteStatus === 'D1') nextStatus = 'D2';
        else if (v.pernoiteStatus === 'D2') nextStatus = 'D3';
        else if (v.pernoiteStatus === 'D3') nextStatus = 'D4';
        else nextStatus = 'D1';

        assignedNextStatus = nextStatus;
        const diasMap = { D1: 1, D2: 2, D3: 3, D4: 4 };

        return {
          ...v,
          statusDescarregamento: v.statusDescarregamento === 'Finalizado' ? 'Finalizado' : (v.statusDescarregamento === 'Em Descarregamento' ? 'Em Descarregamento' : 'Pernoite'),
          pernoiteMarked: true,
          pernoiteStatus: nextStatus,
          diasAtraso: diasMap[nextStatus],
          observacaoPernoite: `Pernoite ${nextStatus} registrado pelo empilhador ${user.nome || operatorName}`
        };
      }
      return v;
    });
    setEfcVehicles(updated as EfcEfdVehicle[]);
    saveEfcVehicles(empresaId, updated as EfcEfdVehicle[]);
    triggerToast(`Veículo marcado como Pernoite (${assignedNextStatus})! Isento da meta de hoje.`, true);
  };

  // --- FEFO Relocation Demands Actions ---
  const handleStartFefo = (fId: string) => {
    updateFefoDemandStatus(empresaId, fId, 'in_progress', user.nome || operatorName);
    const reloadList = getStoredFefoDemands(empresaId);
    setFefoDemands(reloadList);
    triggerToast(`Demanda FEFO iniciada por ${user.nome || operatorName}`);
  };

  const handleFinishFefo = (fId: string) => {
    updateFefoDemandStatus(empresaId, fId, 'done', user.nome || operatorName);
    const reloadList = getStoredFefoDemands(empresaId);
    setFefoDemands(reloadList);
    triggerToast(`✅ Realocação FEFO concluída por ${user.nome || operatorName}!`);
  };

  // --- TMR Demands Actions ---
  const handleStartTmr = (tId: string) => {
    updateTmrDemandStatus(empresaId, tId, 'in_progress', user.nome || operatorName);
    setTmrDemands(getStoredTmrDemands(empresaId));
    triggerToast(`Demanda TMR iniciada por ${user.nome || operatorName}`);
  };

  const handleFinishTmr = (tId: string) => {
    const targetDemand = tmrDemands.find(d => d.id === tId);
    updateTmrDemandStatus(empresaId, tId, 'done', user.nome || operatorName);
    const updatedList = getStoredTmrDemands(empresaId);
    setTmrDemands(updatedList);

    const finished = updatedList.find(d => d.id === tId);
    const durMin = finished?.duracaoMin || 1;
    const isRecargaOrTerceiros = targetDemand?.tipoCarga === 'Recarga' || targetDemand?.tipoCarga === 'Terceiros';
    const targetMin = isRecargaOrTerceiros ? 50 : 150; // 50 min for Recarga/Terceiros, 2h 30min (150 min) for Carreta
    const hitTarget = durMin <= targetMin;
    const targetLabel = isRecargaOrTerceiros ? '50 min' : '2h 30min';

    if (hitTarget) {
      triggerToast(`⚡ Demanda TMR concluída em ${durMin} min — DENTRO DA META (≤ ${targetLabel})!`, true);
    } else {
      triggerToast(`⚠️ Demanda TMR concluída em ${durMin} min — FORA DA META (Meta ≤ ${targetLabel}).`, false);
    }
  };

  // --- Picking Tasks Actions ---
  const handleStartPickingTask = async (t: Tarefa) => {
    const nowISO = new Date().toISOString();
    if (db && t._docId) {
      await updateDoc(doc(db, 'tarefas', t._docId), {
        status: 'in_progress',
        iniciadoEm: nowISO,
        operador: user.nome || operatorName
      });
    } else {
      const updated = tasks.map(x => x.id === t.id ? { ...x, status: 'in_progress' as const, iniciadoEm: nowISO, operador: user.nome || operatorName } : x);
      setTasks(updated);
      localStorage.setItem(`tasks_${empresaId}`, JSON.stringify(updated));
    }
    triggerToast(`Tarefa de picking #${t.id} INICIADA por ${user.nome || operatorName}`);
  };

  const handleFinishPickingTask = async (t: Tarefa) => {
    const nowISO = new Date().toISOString();
    const duration = Math.max(1, Math.round((new Date(nowISO).getTime() - new Date(t.iniciadoEm || nowISO).getTime()) / 60000));

    if (db && t._docId) {
      await updateDoc(doc(db, 'tarefas', t._docId), {
        status: 'done',
        finalizadoEm: nowISO,
        duracaoMin: duration,
        operador: user.nome || operatorName
      });

      const repoRef = collection(db, 'registros');
      await addDoc(repoRef, {
        empresaId,
        id: t.id,
        codigo: t.codigo,
        descricao: t.descricao,
        quantidade: t.quantidade,
        conferente: t.conferente,
        operador: user.nome || operatorName,
        criadoEm: t.criadoEm,
        iniciadoEm: t.iniciadoEm || nowISO,
        finalizadoEm: nowISO,
        duracaoMin: duration,
        enviadoEm: nowISO,
        tipoOperacao: 'Ressuprimento de Picking'
      });
    } else {
      const updated = tasks.map(x => x.id === t.id ? { ...x, status: 'done' as const, finalizadoEm: nowISO, duracaoMin: duration, operador: user.nome || operatorName } : x);
      setTasks(updated);
      localStorage.setItem(`tasks_${empresaId}`, JSON.stringify(updated));
    }
    triggerToast(`Picking #${t.id} CONCLUÍDO por ${user.nome || operatorName}! Duration: ${duration} min`);
  };

  // --- Productivity Metrics for the Logged-in Operator ---
  const activeOperatorClean = (user.nome || operatorName).toUpperCase().trim();

  // Filtered lists for the logged-in operator
  // All EFC/EFD imported vehicles are available to all operators concurrently
  const myAssignedVehicles = efcVehicles;

  const myAssignedTasks = tasks.filter(t => {
    if (!t.operador || t.operador === 'TODOS') return true;
    return t.operador.toUpperCase().includes(activeOperatorClean);
  });

  const myAssignedTmr = tmrDemands.filter(t => {
    // Admin, supervisor, manager or conferente profile can see all delegated TMR demands
    const userRole = (user.papel || '').toLowerCase();
    const userCargo = (user.cargo || '').toLowerCase();
    const isAdminOrSupervisor = 
      user.isControle || 
      userRole === 'admin' || 
      userRole === 'controle' || 
      userRole.includes('supervisor') || 
      userRole.includes('coordenador') || 
      userCargo.includes('admin') || 
      userCargo.includes('supervisor') || 
      userCargo.includes('gerente') ||
      userCargo.includes('coordenador') ||
      userCargo.includes('conferente') ||
      userRole.includes('conferente');

    if (isAdminOrSupervisor) return true;

    // If designated to TODOS or unassigned, available to all
    if (!t.operadorDesignado || t.operadorDesignado === 'TODOS' || t.operadorDesignado.toUpperCase().includes('TODOS')) return true;

    // Operator name comparison (full name, substring, or first name match)
    const activeOp = activeOperatorClean;
    const firstName = activeOp.split(' ')[0];

    const desigUpper = (t.operadorDesignado || '').toUpperCase();
    if (desigUpper.includes(activeOp) || (firstName.length >= 3 && desigUpper.includes(firstName))) return true;

    if (t.operadoresAtribuidos && Array.isArray(t.operadoresAtribuidos) && t.operadoresAtribuidos.length > 0) {
      return t.operadoresAtribuidos.some(o => {
        const oUpper = o.toUpperCase().trim();
        const oFirstName = oUpper.split(' ')[0];
        return activeOp.includes(oUpper) || 
               oUpper.includes(activeOp) || 
               (oFirstName.length >= 3 && activeOp.includes(oFirstName)) ||
               (firstName.length >= 3 && oUpper.includes(firstName));
      });
    }

    return false;
  });

  const myAssignedFefo = fefoDemands.filter(t => {
    if (!t.solicitadoPorConferente) return false;
    if (t.status === 'done') return false;
    return true;
  });

  // Completed items by logged in user (Recarga is excluded from EFC metrics, included in TMR metrics)
  const myCompletedEfc = efcVehicles.filter(v => 
    !(v.isRecarga || v.tipoCarga === 'Recarga') && 
    v.statusCarregamento === 'Finalizado' && 
    (v.operadorExecutorCarregamento || '').toUpperCase().includes(activeOperatorClean)
  );
  
  const myCompletedEfd = efcVehicles.filter(v => 
    v.statusDescarregamento === 'Finalizado' && 
    (v.operadorExecutorDescarregamento || '').toUpperCase().includes(activeOperatorClean)
  );

  const completedRecargasEfc = efcVehicles.filter(v => 
    (v.isRecarga || v.tipoCarga === 'Recarga') && 
    v.statusCarregamento === 'Finalizado' && 
    (v.operadorExecutorCarregamento || '').toUpperCase().includes(activeOperatorClean)
  ).map(v => ({
    id: v.id,
    carreta: v.placa || 'Recarga EFC',
    revendaNome: v.tipoCarga || 'Recarga',
    status: 'done' as const,
    duracaoMin: v.duracaoCarregamentoMin || 15
  }));

  const myCompletedTmr = [
    ...tmrDemands.filter(t => t.status === 'done' && (t.operadorExecutor || '').toUpperCase().includes(activeOperatorClean)),
    ...completedRecargasEfc
  ];

  const myCompletedPicking = tasks.filter(t => t.status === 'done' && (t.operador || '').toUpperCase().includes(activeOperatorClean));

  const myCompletedFefo = fefoDemands.filter(t => t.status === 'done' && (t.operadorExecutor || '').toUpperCase().includes(activeOperatorClean));

  // Total operations count
  const totalOpsCompleted = myCompletedEfc.length + myCompletedEfd.length + myCompletedTmr.length + myCompletedPicking.length + myCompletedFefo.length;

  // Total duration & Average duration calculation
  const totalDurations = [
    ...myCompletedEfc.map(v => v.duracaoCarregamentoMin || 15),
    ...myCompletedEfd.map(v => v.duracaoDescarregamentoMin || 20),
    ...myCompletedTmr.map(t => t.duracaoMin || 15),
    ...myCompletedPicking.map(t => t.duracaoMin || 10),
    ...myCompletedFefo.map(t => t.duracaoMin || 10)
  ];
  const avgOperationDuration = totalDurations.length > 0 
    ? Math.round(totalDurations.reduce((a, b) => a + b, 0) / totalDurations.length) 
    : 0;

  // Hectoliters & Pallets replenished in Picking
  const totalPalletsPicking = myCompletedPicking.reduce((acc, t) => acc + (t.quantidade || 0), 0);
  const totalHectolitersPicking = Math.round(totalPalletsPicking * 48.5 * 10) / 10; // ~48.5 CX/palete avg

  // Vehicle Counts for assigned (Pernoite & 03.111.49.02 sorted to top)
  // Rule 1: Placa importada -> aparece em EFC (statusCarregamento !== 'Finalizado')
  const efcPendingVehicles = myAssignedVehicles.filter(v => v.statusCarregamento !== 'Finalizado');

  // Rule 2 & Rule 5: Placa CARREGADA (ou Pernoite/D1) -> aparece em EFD (somente se statusCarregamento === 'Finalizado' ou pernoiteMarked)
  // "nunca existe uma placa disponível para descarregar que não foi carregada antes"
  const efdPendingVehicles = myAssignedVehicles
    .filter(v => {
      const isLoadedOrPernoite = v.statusCarregamento === 'Finalizado' || v.pernoiteMarked === true || v.statusDescarregamento === 'Pernoite';
      const isNotDischarged = v.statusDescarregamento !== 'Finalizado';
      return isLoadedOrPernoite && isNotDischarged;
    })
    .sort((a, b) => {
      const aPernoite = (a.pernoiteMarked || a.statusDescarregamento === 'Pernoite' || a.placa?.includes('03.111.49.02')) ? 1 : 0;
      const bPernoite = (b.pernoiteMarked || b.statusDescarregamento === 'Pernoite' || b.placa?.includes('03.111.49.02')) ? 1 : 0;
      return bPernoite - aPernoite;
    });
  const tercerosVehicles = myAssignedVehicles.filter(v => (v.tipoCarga || '').toLowerCase().includes('terceiro'));
  const pernoiteVehicles = myAssignedVehicles.filter(v => v.statusDescarregamento === 'Pernoite' || v.pernoiteMarked === true);

  return (
    <div className="flex flex-col gap-6">
      {/* CHECKLIST ESCREVER BLOCK COVERS FULL PAGE IF LOCKED */}
      {!checklistDone ? (
        <div className="g-card p-6 md:p-8 flex flex-col gap-5 border border-[#f5a623]/20 bg-[#11151c]/90">
          <div className="text-5xl text-center mb-3">✅</div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222d3a] pb-3">
            <h3 className="font-sans font-black text-sm tracking-widest text-[#f5a623] uppercase flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-400" /> CHECKLIST PRÉ-OPERAÇÃO EMPILHADEIRA
            </h3>
            <div className="flex items-center gap-1.5 text-[9px] text-[#22c55e] font-black uppercase tracking-wider bg-[#22c55e]/5 px-2.5 py-1 rounded-lg border border-[#22c55e]/15">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              Operador: {user.nome || operatorName}
            </div>
          </div>
          <p className="text-xs text-[#6a7d92] text-center leading-relaxed max-w-md mx-auto">
            Por normas de segurança DPO Ambev, confirme cada item do checklist antes de liberar o quadro de tarefas de EFC, EFD e TMR.
          </p>

          <div className="flex flex-col gap-3 max-w-xl mx-auto w-full mt-4">
            {checklist.map(item => (
              <div 
                key={item.id}
                onClick={() => handleToggleCheck(item.id)}
                className={`p-3.5 rounded-xl border border-[#222d3a] flex items-start gap-4 cursor-pointer transition-all ${item.checked ? 'bg-[#22c55e]/5 border-[#22c55e]/30' : 'bg-[#151b23] hover:bg-[#1a2030]'}`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center font-bold text-xs mt-0.5 ${item.checked ? 'bg-[#22c55e] border-[#22c55e] text-[#07090d]' : 'border-[#243040] text-[#243040]'}`}>
                  {item.checked ? '✓' : ''}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-snow leading-tight">{item.label}</h4>
                  <p className="text-[10px] text-[#6a7d92] mt-1 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="max-w-xl mx-auto w-full mt-2">
            <div className="h-1.5 w-full bg-[#151b23] border border-[#222d3a] rounded-full overflow-hidden">
              <div className="h-full bg-[#22c55e] transition-all" style={{ width: `${(checklistCheckedCount / checklist.length) * 100}%` }}></div>
            </div>
            <div className="text-[10px] font-sans font-bold tracking-wider text-[#6a7d92] text-right mt-2">
              {checklistCheckedCount} / {checklist.length} itens confirmados
            </div>
          </div>

          <div className="flex justify-center gap-3 w-full max-w-xl mx-auto mt-4">
            <button 
              disabled={!isChecklistCompleted}
              onClick={handleConfirmChecklist}
              className="btn-primary flex-1 py-4 text-xs font-bold tracking-widest bg-gradient-to-r from-[#f5a623] to-[#d4780a] text-[#07090d] rounded-xl text-center disabled:opacity-40 cursor-pointer shadow-md"
            >
              ✅ REVISÃO FEITA — LIBERAR TAREFAS DO EMPILHADOR
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">

          {/* PAINEL EXCLUSIVO DO OPERADOR EMPILHADOR - PNP E METAS VS REAL */}
          <OperationalCollaboratorPnpBanner user={user} theme={theme} />

          {/* ACTIVE OPERATOR USER BADGE & PRODUCTIVITY KPI HEADER */}
          <div className="g-card p-5 border-l-4 border-l-amber-500 bg-[#11151c]">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#222d3a] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-lg">
                  🚜
                </div>
                <div>
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">OPERADOR LOGADO NA PLATAFORMA</span>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    {user.nome || operatorName}
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">
                      ● Ativo
                    </span>
                    <OperationalNotificationBell user={user} userRole="empilhador" onNavigate={(panel, tab) => { if (tab) setDemandTab(tab as any); }} />
                  </h3>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Atribuição Automática de Registros</span>
                <span className="text-xs font-semibold text-slate-300">
                  Todas as inicializações e conclusões serão registradas em seu nome.
                </span>
              </div>
            </div>

            {/* PRODUCTIVITY CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              <div className="p-3 bg-[#151b23] border border-[#222d3a] rounded-xl">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider">Tempo Médio / Op</span>
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <span className="text-xl font-black text-amber-400 block">{avgOperationDuration} min</span>
                <span className="text-[9px] text-slate-400">Duração média por demanda</span>
              </div>

              <div className="p-3 bg-[#151b23] border border-[#222d3a] rounded-xl">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider">Ressuprimento Picking</span>
                  <Package className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <span className="text-xl font-black text-emerald-400 block">{totalHectolitersPicking} HL</span>
                <span className="text-[9px] text-slate-400">{totalPalletsPicking} paletes no picking</span>
              </div>

              <div className="p-3 bg-[#151b23] border border-[#222d3a] rounded-xl">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider">Carros EFC/EFD</span>
                  <Truck className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <span className="text-xl font-black text-blue-400 block">{myCompletedEfc.length + myCompletedEfd.length} veículos</span>
                <span className="text-[9px] text-slate-400">{myCompletedEfc.length} EFC · {myCompletedEfd.length} EFD</span>
              </div>

              <div className="p-3 bg-[#151b23] border border-[#222d3a] rounded-xl">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider">Demanda TMR</span>
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <span className="text-xl font-black text-purple-400 block">{myCompletedTmr.length} ativas</span>
                <span className="text-[9px] text-slate-400">Atendimentos para revendas</span>
              </div>
            </div>
          </div>

          {/* QUADRO DE AÇÕES CORRETIVAS E MELHORIAS ATRIBUÍDAS AO OPERADOR DE EMPILHADEIRA */}
          <GuiaAcoesOperacionais user={user} roleName="Operador de Empilhadeira" />

          {/* QUADRO DE DEMANDAS TABS */}
          <div className="g-card p-6 flex flex-col gap-5">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-[#222d3a] pb-4">
              <div>
                <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-[#f5a623] flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-400" /> QUADRO DE DEMANDAS DO DIA DOS EMPILHADORES
                </h4>
                <p className="text-[10px] text-slate-400 font-medium">
                  Ciclo Operacional Ativo: EFC (Carregamento) ➔ EFD (Descarregamento) ➔ Histórico de Conclusões
                </p>
              </div>

              {/* SHIFT CONTROLS */}
              <div className="flex flex-wrap items-center gap-2">
                {!shiftStarted ? (
                  <button
                    onClick={handleStartShift}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Power className="w-3.5 h-3.5" /> Iniciar Jornada
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                      Jornada desde {shiftStartTime}
                    </span>
                    <button
                      onClick={handleRequestEndShift}
                      className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <Power className="w-3.5 h-3.5" /> Encerrar Jornada
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* TAB SELECTORS - 7 OPERATIONAL TABS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 bg-[#151b23] border border-[#222d3a] p-2 rounded-xl w-full">
              <button
                onClick={() => setDemandTab('carregamento')}
                className={`px-3 py-2.5 rounded-lg font-sans font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  demandTab === 'carregamento'
                    ? 'bg-amber-500 text-slate-950 font-black shadow'
                    : 'text-slate-400 hover:text-white bg-transparent'
                }`}
              >
                <Truck className="w-4 h-4 shrink-0" />
                <span className="truncate">1. Carregamento</span>
                <span className="bg-slate-900 text-amber-300 text-[9px] px-1.5 py-0.5 rounded-full font-mono font-bold shrink-0">
                  {efcPendingVehicles.length}
                </span>
              </button>

              <button
                onClick={() => setDemandTab('descarregamento')}
                className={`px-3 py-2.5 rounded-lg font-sans font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  demandTab === 'descarregamento'
                    ? 'bg-emerald-600 text-white font-black shadow'
                    : 'text-slate-400 hover:text-white bg-transparent'
                }`}
              >
                <Clock className="w-4 h-4 shrink-0" />
                <span className="truncate">2. Descarregamento</span>
                <span className="bg-emerald-950 text-emerald-200 text-[9px] px-1.5 py-0.5 rounded-full font-mono font-bold shrink-0">
                  {efdPendingVehicles.length}
                </span>
              </button>

              <button
                onClick={() => setDemandTab('tmr')}
                className={`px-3 py-2.5 rounded-lg font-sans font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  demandTab === 'tmr'
                    ? 'bg-purple-600 text-white font-black shadow'
                    : 'text-slate-400 hover:text-white bg-transparent'
                }`}
              >
                <Layers className="w-4 h-4 shrink-0" />
                <span className="truncate">3. TMR Revendas</span>
                <span className="bg-purple-950 text-purple-200 text-[9px] px-1.5 py-0.5 rounded-full font-mono font-bold shrink-0">
                  {myAssignedTmr.filter(t => t.status !== 'done').length}
                </span>
              </button>

              <button
                onClick={() => setDemandTab('rr')}
                className={`px-3 py-2.5 rounded-lg font-sans font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  demandTab === 'rr'
                    ? 'bg-emerald-600 text-white font-black shadow'
                    : 'text-slate-400 hover:text-white bg-transparent'
                }`}
              >
                <Package className="w-4 h-4 shrink-0" />
                <span className="truncate">4. Ressuprimento</span>
                <span className="bg-emerald-950 text-emerald-200 text-[9px] px-1.5 py-0.5 rounded-full font-mono font-bold shrink-0">
                  {myAssignedTasks.filter(t => t.status !== 'done').length}
                </span>
              </button>

              <button
                onClick={() => setDemandTab('realocacao_dedo')}
                className={`px-3 py-2.5 rounded-lg font-sans font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  demandTab === 'realocacao_dedo'
                    ? 'bg-red-600 text-white font-black shadow'
                    : 'text-slate-400 hover:text-white bg-transparent'
                }`}
              >
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-300" />
                <span className="truncate">5. Realocação Dedo</span>
                <span className="bg-red-950 text-red-200 text-[9px] px-1.5 py-0.5 rounded-full font-mono font-bold shrink-0">
                  {myAssignedFefo.filter(t => t.status !== 'done').length}
                </span>
              </button>

              <button
                onClick={() => setDemandTab('5s')}
                className={`px-3 py-2.5 rounded-lg font-sans font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  demandTab === '5s'
                    ? 'bg-amber-500 text-slate-950 font-black shadow'
                    : 'text-slate-400 hover:text-white bg-transparent'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="truncate">6. Realização 5S</span>
              </button>

              <button
                onClick={() => setDemandTab('historico')}
                className={`px-3 py-2.5 rounded-lg font-sans font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  demandTab === 'historico'
                    ? 'bg-cyan-600 text-white font-black shadow'
                    : 'text-slate-400 hover:text-white bg-transparent'
                }`}
              >
                <History className="w-4 h-4 shrink-0" />
                <span className="truncate">7. Histórico</span>
                <span className="bg-cyan-950 text-cyan-200 text-[9px] px-1.5 py-0.5 rounded-full font-mono shrink-0">
                  {totalOpsCompleted}
                </span>
              </button>
            </div>

            {/* ABA 1: CARREGAMENTO */}
            {demandTab === 'carregamento' && (
              <div className="flex flex-col gap-4">
                <div className="p-3 bg-[#0d1218] border border-amber-500/30 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-amber-300 font-bold flex items-center gap-2">
                    <Truck className="w-4 h-4 text-amber-400" />
                    CARREGAMENTO — Meta DPO: Conclusão total até às <strong className="font-mono text-white">06:30 AM</strong>
                  </span>
                  <span className="text-slate-400 text-[10px]">
                    Ao concluir o carregamento, o veículo é direcionado automaticamente para a guia de <strong>Descarregamento</strong>.
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 max-h-[480px] overflow-y-auto">
                  {efcPendingVehicles.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center p-8 bg-[#11151c] rounded-xl border border-[#1c2530]">
                      Nenhum veículo pendente de carregamento atribuído para você no momento.
                    </p>
                  ) : (
                    efcPendingVehicles.map(v => (
                      <div 
                        key={`efc_${v.id}`} 
                        className={`p-4 bg-[#11151c] border rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${
                          v.statusCarregamento === 'Em Carregamento' 
                            ? 'border-blue-500/50 bg-blue-950/20' 
                            : 'border-[#1c2530] hover:border-slate-700'
                        }`}
                      >
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black font-mono text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
                              {v.placa}
                            </span>
                            <span className="text-xs font-bold text-slate-300">
                              Mapa: {v.mapa} · {v.tipoVeiculo}
                            </span>
                            <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                              v.statusCarregamento === 'Em Carregamento'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              {v.statusCarregamento}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1">
                            <span className="font-mono text-amber-300 font-bold">{v.caixas?.toLocaleString('pt-BR')} cx</span>
                            <span>·</span>
                            <span>Entrega: {v.dataEntrega}</span>
                            {v.operadorExecutorCarregamento && (
                              <>
                                <span>·</span>
                                <span className="text-emerald-400 font-bold">Op: {v.operadorExecutorCarregamento}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* TIPO DE CARGA BADGE / TOGGLE & INICIAR/CONCLUIR BUTTONS */}
                        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 border-[#222d3a] pt-3 md:pt-0">
                          <button
                            onClick={() => handleMarkRecarga(v.id)}
                            className={`py-1.5 px-2.5 border font-bold text-xs uppercase tracking-wider rounded-lg flex items-center gap-1.5 cursor-pointer transition-all ${
                              v.isRecarga || v.tipoCarga === 'Recarga'
                                ? 'bg-purple-600/30 text-purple-300 border-purple-500/50'
                                : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border-purple-500/30'
                            }`}
                            title="Marcar / Desmarcar veículo como Recarga (TMR)"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            {v.isRecarga || v.tipoCarga === 'Recarga' ? 'Recarga Ativa' : 'Marcar Recarga'}
                          </button>

                          {v.statusCarregamento === 'Pendente' && (
                            <button
                              onClick={() => handleStartEfc(v.id)}
                              className="py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg flex items-center gap-1.5 cursor-pointer shadow"
                            >
                              <Play className="w-3.5 h-3.5" /> Iniciar
                            </button>
                          )}

                          {v.statusCarregamento === 'Em Carregamento' && (
                            <button
                              onClick={() => handleFinishEfc(v.id)}
                              className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg flex items-center gap-1.5 cursor-pointer shadow"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Concluir
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ABA 2: DESCARREGAMENTO */}
            {demandTab === 'descarregamento' && (
              <div className="flex flex-col gap-4">
                <div className="p-3 bg-[#0d1218] border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-emerald-400 font-bold flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    DESCARREGAMENTO — Meta DPO: Conclusão total até às <strong className="font-mono text-white">22:00 PM</strong>
                  </span>
                  <span className="text-slate-400 text-[10px]">
                    Veículos concluídos no Carregamento passam para <strong>Aguardando Descarregamento</strong>. Pernoites possuem a marcação 🌙 D1.
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 max-h-[480px] overflow-y-auto">
                  {efdPendingVehicles.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center p-8 bg-[#11151c] rounded-xl border border-[#1c2530]">
                      Nenhum veículo liberado ou aguardando descarregamento no momento.
                    </p>
                  ) : (
                    efdPendingVehicles.map(v => {
                      const isPernoite = v.statusDescarregamento === 'Pernoite' || v.pernoiteMarked === true;
                      const statusLabel = v.statusDescarregamento === 'Pendente' 
                        ? 'Aguardando Descarregamento' 
                        : (v.statusDescarregamento || 'Pendente');

                      return (
                        <div 
                          key={`efd_${v.id}`} 
                          className={`p-4 bg-[#11151c] border rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${
                            isPernoite
                              ? 'border-amber-500/50 bg-amber-950/20'
                              : v.statusDescarregamento === 'Em Descarregamento'
                              ? 'border-blue-500/50 bg-blue-950/20'
                              : 'border-[#1c2530] hover:border-slate-700'
                          }`}
                        >
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black font-mono text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
                                {v.placa}
                              </span>
                              <span className="text-xs font-bold text-slate-300">
                                Mapa: {v.mapa} · {v.tipoVeiculo}
                              </span>
                              
                              {isPernoite && (
                                <span className="text-[10px] font-black bg-amber-500 text-slate-950 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow">
                                  <Moon className="w-3 h-3 fill-slate-950" /> {v.pernoiteStatus || 'D1'} PERNOITE
                                </span>
                              )}

                              <span className={`text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                                v.statusDescarregamento === 'Em Descarregamento'
                                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse'
                                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold'
                              }`}>
                                {statusLabel}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1">
                              <span className="font-mono text-amber-300 font-bold">{v.caixas?.toLocaleString('pt-BR')} cx</span>
                              {v.operadorExecutorDescarregamento && (
                                <>
                                  <span>·</span>
                                  <span className="text-emerald-400 font-bold">Op: {v.operadorExecutorDescarregamento}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 border-[#222d3a] pt-3 md:pt-0">
                            {(v.statusDescarregamento === 'Pendente' || v.statusDescarregamento === 'Pernoite') && (
                              <>
                                <button
                                  onClick={() => handleStartEfd(v.id)}
                                  className="py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg flex items-center gap-1.5 cursor-pointer shadow"
                                >
                                  <Play className="w-3.5 h-3.5" /> Iniciar
                                </button>
                                <button
                                  onClick={() => handleMarkRecarga(v.id)}
                                  className={`py-2 px-3 border font-bold text-xs uppercase tracking-wider rounded-lg flex items-center gap-1.5 cursor-pointer transition-all ${
                                    v.isRecarga || v.tipoCarga === 'Recarga'
                                      ? 'bg-purple-600/30 text-purple-300 border-purple-500/50'
                                      : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border-purple-500/30'
                                  }`}
                                  title="Marcar / Desmarcar veículo como Recarga (TMR)"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  {v.isRecarga || v.tipoCarga === 'Recarga' ? 'Recarga Ativa' : 'Marcar Recarga'}
                                </button>
                                <button
                                  onClick={() => handleMarkPernoite(v.id)}
                                  className="py-2 px-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 font-bold text-xs uppercase tracking-wider rounded-lg flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Moon className="w-3.5 h-3.5" /> {v.pernoiteMarked ? `Pernoite (${v.pernoiteStatus || 'D1'})` : 'Pernoite D1'}
                                </button>
                              </>
                            )}

                            {v.statusDescarregamento === 'Em Descarregamento' && (
                              <button
                                onClick={() => handleFinishEfd(v.id)}
                                className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg flex items-center gap-1.5 cursor-pointer shadow"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Concluir
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* ABA 2: TMR REVENDAS / DELEGADAS PELO CONFERENTE */}
            {demandTab === 'tmr' && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-[#0d1218] p-2.5 rounded-xl border border-purple-500/30">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setTmrHistoryView(false)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                        !tmrHistoryView ? 'bg-purple-600 text-white font-black' : 'text-slate-400 hover:text-white bg-slate-900/60'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Demandas TMR Ativas ({myAssignedTmr.filter(t => t.status !== 'done').length})</span>
                    </button>

                    <button
                      onClick={() => setTmrHistoryView(true)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                        tmrHistoryView ? 'bg-cyan-600 text-white font-black' : 'text-slate-400 hover:text-white bg-slate-900/60'
                      }`}
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>Histórico TMR Concluído ({myCompletedTmr.length})</span>
                    </button>
                  </div>

                  <span className="text-[10px] text-purple-300 font-mono font-bold bg-purple-950/60 px-2.5 py-1 rounded-lg border border-purple-800/40">
                    SLA Meta TMR: ≤ 150 min Carretas · ≤ 50 min Recarga
                  </span>
                </div>

                {!tmrHistoryView ? (
                  <div className="grid grid-cols-1 gap-3 max-h-[550px] overflow-y-auto">
                    {myAssignedTmr.filter(t => t.status !== 'done').length === 0 ? (
                      <div className="text-center p-8 bg-[#11151c] rounded-xl border border-[#1c2530] flex flex-col items-center justify-center gap-2">
                        <Layers className="w-8 h-8 text-purple-400/40" />
                        <p className="text-xs text-slate-400 font-bold">Nenhuma demanda de TMR / Revenda pendente para você no momento.</p>
                        <span className="text-[10px] text-slate-500">Todas as movimentações delegadas pelo Conferente foram concluídas ou você não tem atribuições pendentes.</span>
                      </div>
                    ) : (
                      myAssignedTmr.filter(t => t.status !== 'done').map(t => (
                        <div 
                          key={`tmr_item_${t.id}`}
                          className={`p-4 bg-[#11151c] border rounded-xl flex flex-col gap-3 transition-all ${
                            t.status === 'in_progress'
                              ? 'border-blue-500/60 bg-blue-950/20 shadow-lg'
                              : 'border-purple-500/40 bg-purple-950/10 hover:border-purple-500/60'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-mono font-black text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
                                  Carreta: {t.carreta}
                                </span>
                                <span className="text-xs font-bold text-white">
                                  {t.revendaNome || 'Revenda / Unidade'}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                  t.isTerceiros || t.tipoPlaca === 'terceiros'
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                }`}>
                                  {t.isTerceiros || t.tipoPlaca === 'terceiros' ? 'Terceiros' : 'Casa'}
                                </span>
                                <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                                  t.status === 'in_progress'
                                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 animate-pulse'
                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                }`}>
                                  {t.status === 'in_progress' ? '⚡ Em Execução' : '⏳ Aguardando Início'}
                                </span>
                              </div>

                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                Operação: <strong className="text-slate-200">{t.tipoCarga || 'Carregamento TMR'}</strong> · Delegado por Conferente: <strong className="text-amber-300">{t.conferente || 'ADM'}</strong>
                              </span>
                              {t.instrucoes && (
                                <p className="text-[11px] text-slate-300 bg-[#0d1218] p-2 rounded border border-[#222d3a] mt-1 font-mono">
                                  📌 Instrução: {t.instrucoes}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 border-[#222d3a] pt-2 sm:pt-0">
                              {t.status === 'pending' && (
                                <button
                                  type="button"
                                  onClick={() => handleStartTmr(t.id)}
                                  className="py-2 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-lg cursor-pointer shadow flex items-center gap-1.5"
                                >
                                  <Play className="w-3.5 h-3.5 fill-slate-950" /> Iniciar TMR
                                </button>
                              )}

                              {t.status === 'in_progress' && (
                                <button
                                  type="button"
                                  onClick={() => handleFinishTmr(t.id)}
                                  className="py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-lg cursor-pointer shadow flex items-center gap-1.5"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Concluir TMR
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Grid de Ativos / Vasilhames */}
                          <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 p-2 bg-[#0d1218] rounded-lg text-center text-[10px] border border-[#1c2530]">
                            <div><span className="text-[8px] text-slate-500 block uppercase font-bold">Litrinho</span><span className="font-mono font-bold text-amber-300">{t.palletsLitrinho || 0}</span></div>
                            <div><span className="text-[8px] text-slate-500 block uppercase font-bold">Litrão</span><span className="font-mono font-bold text-amber-300">{t.palletsLitrao || 0}</span></div>
                            <div><span className="text-[8px] text-slate-500 block uppercase font-bold">600 Verde</span><span className="font-mono font-bold text-emerald-400">{t.pallets600Verde || 0}</span></div>
                            <div><span className="text-[8px] text-slate-500 block uppercase font-bold">600 Âmbar</span><span className="font-mono font-bold text-amber-500">{t.pallets600Ambar || 0}</span></div>
                            <div><span className="text-[8px] text-slate-500 block uppercase font-bold">Chopp</span><span className="font-mono font-bold text-yellow-400">{t.palletsBarrilChopp || 0}</span></div>
                            <div><span className="text-[8px] text-slate-500 block uppercase font-bold">PBR1</span><span className="font-mono font-bold text-blue-400">{t.palletsPbr1 || t.palletsPbr || 0}</span></div>
                            <div><span className="text-[8px] text-slate-500 block uppercase font-bold">PBR2</span><span className="font-mono font-bold text-indigo-400">{t.palletsPbr2 || 0}</span></div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 max-h-[500px] overflow-y-auto">
                    {myCompletedTmr.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center p-8 bg-[#11151c] rounded-xl border border-[#1c2530]">
                        Nenhuma demanda TMR concluída registrada ainda.
                      </p>
                    ) : (
                      myCompletedTmr.map(t => (
                        <div key={`tmr_hist_${t.id}`} className="p-3 bg-[#11151c] border border-purple-500/30 rounded-xl flex items-center justify-between text-xs">
                          <div>
                            <span className="font-mono text-purple-300 font-bold text-[10px] block">
                              Carreta: {(t as any).carreta || (t as any).id} — {(t as any).revendaNome || 'TMR Revenda'}
                            </span>
                            <span className="text-[10px] text-slate-400 block">Concluído por: {activeOperatorClean}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-emerald-400 font-bold block">✓ Concluído</span>
                            <span className="text-[10px] font-mono text-slate-400">Duração: {t.duracaoMin || 15} min</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
            {demandTab === 'rr' && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-[#0d1218] p-2.5 rounded-xl border border-emerald-500/30">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setRrHistoryView(false)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                        !rrHistoryView ? 'bg-emerald-600 text-white font-black' : 'text-slate-400 hover:text-white bg-slate-900/60'
                      }`}
                    >
                      <Package className="w-3.5 h-3.5" />
                      <span>Ordens de Ressuprimento Ativas ({myAssignedTasks.filter(t => t.status !== 'done').length})</span>
                    </button>

                    <button
                      onClick={() => setRrHistoryView(true)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                        rrHistoryView ? 'bg-cyan-600 text-white font-black' : 'text-slate-400 hover:text-white bg-slate-900/60'
                      }`}
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>Histórico Ressuprimento ({myCompletedPicking.length})</span>
                    </button>
                  </div>

                  <span className="text-[10px] text-emerald-400 font-mono font-bold">
                    Meta SLA: ≤ 5 min por palete despachado
                  </span>
                </div>

                {!rrHistoryView ? (
                  <div className="grid grid-cols-1 gap-3 max-h-[500px] overflow-y-auto">
                    {myAssignedTasks.filter(t => t.status !== 'done').length === 0 ? (
                      <p className="text-xs text-slate-500 text-center p-8 bg-[#11151c] rounded-xl border border-[#1c2530]">
                        Nenhuma tarefa de ressuprimento R&R pendente para você no momento.
                      </p>
                    ) : (
                      myAssignedTasks.filter(t => t.status !== 'done').map(t => (
                        <div 
                          key={`rr_${t.id}`} 
                          className={`p-4 bg-[#11151c] border rounded-xl flex flex-col gap-3 transition-all ${
                            t.status === 'in_progress'
                              ? 'border-blue-500/50 bg-blue-950/20 shadow-md'
                              : 'border-[#1c2530]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <span className="text-[10px] font-mono text-amber-400 font-bold block mb-1">SKU: {t.codigo}</span>
                              <h5 className="text-xs font-bold text-white leading-tight">{t.descricao}</h5>
                              <span className="text-[10px] text-slate-400 block mt-1">Despachado por: {t.conferente}</span>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <span className="text-xl font-black text-amber-400">{t.quantidade}</span>
                                <span className="block text-[8px] uppercase font-bold text-slate-400">Palete</span>
                              </div>

                              {t.status === 'pending' && (
                                <button
                                  onClick={() => handleStartPickingTask(t)}
                                  className="py-2 px-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-lg cursor-pointer shadow"
                                >
                                  <Play className="w-3.5 h-3.5 inline mr-1" /> Iniciar
                                </button>
                              )}

                              {t.status === 'in_progress' && (
                                <button
                                  onClick={() => handleFinishPickingTask(t)}
                                  className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg cursor-pointer shadow"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" /> Concluir
                                </button>
                              )}
                            </div>
                          </div>

                          {t.status === 'in_progress' && (
                            <TaskTimerWidget task={t} />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 max-h-[500px] overflow-y-auto">
                    {myCompletedPicking.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center p-8 bg-[#11151c] rounded-xl border border-[#1c2530]">
                        Nenhum ressuprimento concluído registrado nesta sessão.
                      </p>
                    ) : (
                      myCompletedPicking.map(t => (
                        <div key={`rr_hist_${t.id}`} className="p-3 bg-[#11151c] border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs">
                          <div>
                            <span className="font-mono text-amber-400 font-bold text-[10px] block">SKU: {t.codigo} — {t.descricao}</span>
                            <span className="text-[10px] text-slate-400 block">Conferente: {t.conferente}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-emerald-400 font-bold block">✓ Concluído</span>
                            <span className="text-[10px] font-mono text-slate-400">Duração: {t.duracaoMin || 1} min</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ABA 4: REALOCAÇÃO DE DEDO (FEFO) */}
            {demandTab === 'realocacao_dedo' && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-[#0d1218] p-2.5 rounded-xl border border-red-500/30">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setFefoHistoryView(false)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                        !fefoHistoryView ? 'bg-red-600 text-white font-black' : 'text-slate-400 hover:text-white bg-slate-900/60'
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
                      <span>Realocações Ativas ({myAssignedFefo.filter(t => t.status !== 'done').length})</span>
                    </button>

                    <button
                      onClick={() => setFefoHistoryView(true)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                        fefoHistoryView ? 'bg-cyan-600 text-white font-black' : 'text-slate-400 hover:text-white bg-slate-900/60'
                      }`}
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>Histórico Realocação Dedo ({myCompletedFefo.length})</span>
                    </button>
                  </div>

                  <span className="text-red-400 font-bold text-[10px] bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                    SLA Meta: Realocação em até 15 min
                  </span>
                </div>

                {!fefoHistoryView ? (
                  <div className="grid grid-cols-1 gap-3 max-h-[500px] overflow-y-auto">
                    {myAssignedFefo.filter(t => t.status !== 'done').length === 0 ? (
                      <p className="text-xs text-slate-500 text-center p-8 bg-[#11151c] rounded-xl border border-[#1c2530]">
                        Nenhuma quebra de FEFO detectada no momento. Nenhuma realocação de dedo pendente!
                      </p>
                    ) : (
                      myAssignedFefo.filter(t => t.status !== 'done').map(t => (
                        <div 
                          key={`fefo_${t.id}`}
                          className={`p-4 bg-[#11151c] border rounded-xl flex flex-col gap-3 transition-all ${
                            t.status === 'in_progress'
                              ? 'border-amber-500/50 bg-amber-950/20'
                              : 'border-red-500/40 bg-red-950/10 hover:border-red-500/70'
                          }`}
                        >
                          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-black font-mono text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
                                  PRODUTO / SKU: {t.codigo}
                                </span>
                                <span className="text-xs font-bold text-white">
                                  {t.descricao}
                                </span>
                                <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                                  t.status === 'in_progress'
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                }`}>
                                  {t.status === 'in_progress' ? 'Em Andamento' : 'Pendente'}
                                </span>
                              </div>

                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                Tipo: <strong>{t.tipoQuebra === 'estoque_x_picking' ? '🚨 Estoque x Picking (Tolerância ZERO)' : '🔍 Estoque x Estoque (Inversão > 7 dias)'}</strong>
                                {t.operadorExecutor && <strong className="text-emerald-400 ml-2">Executado por: {t.operadorExecutor}</strong>}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {t.status === 'pending' && (
                                <button
                                  onClick={() => handleStartFefo(t.id)}
                                  className="py-2 px-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-lg flex items-center gap-1.5 cursor-pointer shadow"
                                >
                                  <Play className="w-3.5 h-3.5" /> Iniciar Realocação
                                </button>
                              )}

                              {t.status === 'in_progress' && (
                                (() => {
                                  const isMine = !t.operadorExecutor || (t.operadorExecutor || '').toUpperCase().includes(activeOperatorClean);
                                  if (isMine) {
                                    return (
                                      <button
                                        onClick={() => handleFinishFefo(t.id)}
                                        className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg flex items-center gap-1.5 cursor-pointer shadow"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5" /> Concluir Realocação
                                      </button>
                                    );
                                  }
                                  return (
                                    <span className="py-2 px-3 bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-xs uppercase tracking-wider rounded-lg flex items-center gap-1.5 cursor-not-allowed opacity-90">
                                      🔒 Em Andamento por {t.operadorExecutor}
                                    </span>
                                  );
                                })()
                              )}
                            </div>
                          </div>

                          {/* RUA ONDE ESTÁ -> RUA ONDE PRECISA ESTAR */}
                          <div className="p-3 bg-[#0a0d12] border border-[#1c2530] rounded-xl flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-3 w-full md:w-auto">
                              <div className="p-2.5 bg-red-950/30 border border-red-500/30 rounded-lg text-center min-w-[140px]">
                                <span className="text-[9px] font-extrabold text-red-400 uppercase tracking-wider block">📍 Rua onde está</span>
                                <span className="font-mono font-black text-white text-sm block mt-0.5">{t.ruaOndeEsta}</span>
                                <span className="text-[9px] text-slate-400 font-mono">Validade: {t.validadeLoteInconforme}</span>
                              </div>

                              <div className="text-amber-400 font-black text-lg px-2">
                                ➔
                              </div>

                              <div className="p-2.5 bg-emerald-950/30 border border-emerald-500/30 rounded-lg text-center min-w-[140px]">
                                <span className="text-[9px] font-extrabold text-emerald-400 uppercase tracking-wider block">🎯 Rua onde precisa estar</span>
                                <span className="font-mono font-black text-white text-sm block mt-0.5">{t.ruaOndePrecisaEstar}</span>
                                {t.validadeLoteComparado && (
                                  <span className="text-[9px] text-slate-400 font-mono">Ref. Validade: {t.validadeLoteComparado}</span>
                                )}
                              </div>
                            </div>

                            <div className="flex-1 text-right md:text-left bg-[#151b23] p-2.5 rounded-lg border border-[#222d3a]">
                              <span className="text-[9px] font-bold text-amber-400 uppercase block mb-0.5">Ação Recomendada:</span>
                              <p className="text-[11px] text-slate-300 leading-snug">{t.sugestaoAcao || t.mensagem}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 max-h-[500px] overflow-y-auto">
                    {myCompletedFefo.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center p-8 bg-[#11151c] rounded-xl border border-[#1c2530]">
                        Nenhuma realocação de dedo concluída registrada ainda.
                      </p>
                    ) : (
                      myCompletedFefo.map(t => (
                        <div key={`fefo_hist_${t.id}`} className="p-3 bg-[#11151c] border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs">
                          <div>
                            <span className="font-mono text-amber-400 font-bold text-[10px] block">SKU: {t.codigo} — {t.descricao}</span>
                            <span className="text-[10px] text-slate-400 block">Rua De: <strong>{t.ruaOndeEsta}</strong> ➔ Para: <strong>{t.ruaOndePrecisaEstar}</strong></span>
                          </div>
                          <div className="text-right">
                            <span className="text-emerald-400 font-bold block">✓ Realocação Concluída</span>
                            <span className="text-[10px] font-mono text-slate-400">Tempo: {t.duracaoMin || 1} min</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ABA 5: REALIZAÇÃO DO 5S */}
            {demandTab === '5s' && (
              <div className="flex flex-col gap-6">
                <Collaborator5SPerformanceCard user={user} userNombre={user.nome || operatorName} />

                <div className="bg-[#11151c] border border-[#222d3a] rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col gap-6">
                  <div className="flex items-center justify-between border-b border-[#222d3a] pb-4">
                    <div>
                      <h3 className="text-lg font-black uppercase tracking-wider text-white flex items-center gap-2">
                        <CheckCircle2 className="w-6 h-6 text-amber-400" />
                        Realização do Checklist 5S — Operação Empilhador
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Realize a verificação diária de 5S das empilhadeiras e das ruas de armazenagem (Pátio, Armazém e Corredores).
                      </p>
                    </div>
                  </div>

                  <Checklist5SForm 
                    defaultSetor="EMPILHADEIRAS" 
                    userNombre={user.nome || operatorName} 
                    user={user} 
                    empresaId={empresaId} 
                    liderAuditor="Líder Operacional"
                    onSaveSuccess={() => {
                      alert('✓ Auditoria 5S registrada com sucesso!');
                    }} 
                  />
                </div>
              </div>
            )}

            {/* TAB CONTENT 6: HISTÓRICO DE CONCLUSÕES */}
            {demandTab === 'historico' && (
              <div className="flex flex-col gap-4">
                <div className="p-3 bg-[#0d1218] border border-[#222d3a] rounded-xl flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-semibold">
                    Histórico completo de carretas, veículos e tarefas finalizadas por <strong>{user.nome || operatorName}</strong>
                  </span>
                  <span className="text-slate-400 text-[10px]">
                    Controle de tempos e movimentos registrados com data e hora.
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 max-h-[500px] overflow-y-auto">
                  {myCompletedEfc.length === 0 && myCompletedEfd.length === 0 && myCompletedTmr.length === 0 && myCompletedPicking.length === 0 && myCompletedFefo.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center p-8">Nenhuma operação finalizada ainda nesta sessão.</p>
                  ) : (
                    <>
                      {myCompletedFefo.map(v => (
                        <div key={`hist_fefo_${v.id}`} className="p-3 bg-[#11151c] border border-red-500/30 rounded-xl flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-black text-red-400 uppercase tracking-widest block">REALOCAÇÃO FEFO</span>
                            <h5 className="text-xs font-bold text-white">SKU: {v.codigo} · {v.descricao}</h5>
                            <span className="text-[10px] text-slate-400">
                              Mover de <strong>{v.ruaOndeEsta}</strong> ➔ para <strong>{v.ruaOndePrecisaEstar}</strong>
                            </span>
                          </div>
                          <div className="text-right font-mono text-xs">
                            <span className="text-emerald-400 font-bold block">✓ Concluída</span>
                            <span className="text-[10px] text-slate-400">{v.duracaoMin || 1} min</span>
                          </div>
                        </div>
                      ))}
                      {myCompletedEfc.map(v => (
                        <div key={`hist_efc_${v.id}`} className="p-3 bg-[#11151c] border border-emerald-500/30 rounded-xl flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block">CARREGAMENTO EFC</span>
                            <h5 className="text-xs font-bold text-white">Placa: {v.placa} · Mapa {v.mapa}</h5>
                            <span className="text-[10px] text-slate-400">
                              Início: {v.horaInicioCarregamento || '--:--'} · Fim: {v.horaFimCarregamento || '--:--'}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-mono font-bold text-emerald-400 block">{v.duracaoCarregamentoMin || 15} min</span>
                            <span className="text-[9px] text-slate-400">{v.efcCompliant ? '✅ No Prazo' : '⚠️ Atrasado'}</span>
                          </div>
                        </div>
                      ))}

                      {myCompletedEfd.map(v => (
                        <div key={`hist_efd_${v.id}`} className="p-3 bg-[#11151c] border border-blue-500/30 rounded-xl flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest block">DESCARREGAMENTO EFD</span>
                            <h5 className="text-xs font-bold text-white">Placa: {v.placa} · Mapa {v.mapa}</h5>
                            <span className="text-[10px] text-slate-400">
                              Início: {v.horaInicioDescarregamento || '--:--'} · Fim: {v.horaFimDescarregamento || '--:--'}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-mono font-bold text-emerald-400 block">{v.duracaoDescarregamentoMin || 20} min</span>
                            <span className="text-[9px] text-slate-400">{v.efdCompliant ? '✅ No Prazo' : '⚠️ Atrasado'}</span>
                          </div>
                        </div>
                      ))}

                      {myCompletedTmr.map(t => (
                        <div key={`hist_tmr_${t.id}`} className="p-3 bg-[#11151c] border border-purple-500/30 rounded-xl flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest block">DEMANDA TMR</span>
                            <h5 className="text-xs font-bold text-white">Carreta: {t.carreta} ({t.revendaNome})</h5>
                            <span className="text-[10px] text-slate-400">Paletes PBR / Vasilhame</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-mono font-bold text-emerald-400 block">{t.duracaoMin || 20} min</span>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* POP OPERACIONAL MODAL WITH REQUIRED CIENTE AGREEMENT */}
          {showPopModal && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#11151c] border border-sky-500/40 rounded-2xl p-6 max-w-2xl w-full flex flex-col gap-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-sky-400" />
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">
                      PADRÃO OPERACIONAL (POP) — CARREGAMENTO & DESCARREGAMENTO
                    </h3>
                  </div>
                  <button onClick={() => setShowPopModal(false)} className="text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="max-h-[350px] overflow-y-auto space-y-3 text-xs text-slate-300 pr-2">
                  <p className="font-bold text-amber-400">1. OBJETIVO E DIRETRIZES DPO AMBEV</p>
                  <p>Garantir o fluxo contínuo de movimentação de paletes nas operações de EFC (Especialista de Frente de Carregamento) e EFD (Especialista de Frente de Descarregamento), respeitando a meta de tempo e movimentação da Pau Brasil Distribuidora.</p>
                  
                  <p className="font-bold text-amber-400">2. CICLO DAS PLACAS E PERNOITE</p>
                  <p>● Toda placa importada pelo relatório 03.11.49.02 deve seguir a sequência: Carregamento Noturno ➔ Saída Rota ➔ Retorno Pátio ➔ Descarregamento.</p>
                  <p>● Placas não descarregadas no dia devem ser marcadas como <strong>Pernoite D1</strong> até D4. Não contam como desvio do dia e permanecem na fila para o turno seguinte.</p>

                  <p className="font-bold text-amber-400">3. SEGURANÇA NA ZONA OPERACIONAL</p>
                  <p>● Uso obrigatório de EPI (Colete refletivo, bota de aço, protetor auricular).</p>
                  <p>● Proibido circular com pedestres a menos de 5 metros da manobra de empilhadeira.</p>

                  <p className="font-bold text-amber-400">4. METAS DE TEMPO (IVs CRÍTICOS)</p>
                  <p>● Carregamento EFC: Conclusão total até 06:30 AM.</p>
                  <p>● Descarregamento EFD: Conclusão total até 22:00 PM.</p>
                  <p>● Ressuprimento R&R: Tempo máximo de 5 minutos por palete despachado.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800 pt-4">
                  <button
                    onClick={() => {
                      const element = document.createElement("a");
                      const file = new Blob(["POP OPERACIONAL - AMBEV PAU BRASIL\n\n1. EFC ≤ 06:30\n2. EFD ≤ 22:00\n3. R&R ≤ 5 min/palete\n4. Pernoites marcados como D1."], {type: 'text/plain'});
                      element.href = URL.createObjectURL(file);
                      element.download = "POP_Empilhador_PauBrasil.txt";
                      document.body.appendChild(element);
                      element.click();
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2"
                  >
                    <Download className="w-4 h-4 text-sky-400" /> Baixar Documento POP
                  </button>

                  <button
                    onClick={() => {
                      setPopAgreed(true);
                      setShowPopModal(false);
                      triggerToast('Termo de ciência do POP registrado com sucesso!');
                    }}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg"
                  >
                    <SquareCheck className="w-4 h-4" /> Ciente / Estou de Acordo
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 5 WHYS (5 PORQUÊS) DIAGNOSTIC MODAL */}
          {showFiveWhysModal && (
            <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-[#11151c] border border-amber-500/50 rounded-2xl p-6 max-w-2xl w-full flex flex-col gap-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-amber-500/30 pb-3">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-amber-400" />
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">
                      ANÁLISE DE CAUSA RAIZ — FERRAMENTA DOS 5 PORQUÊS
                    </h3>
                  </div>
                </div>

                <p className="text-xs text-amber-200/90 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl leading-relaxed">
                  ⚠️ <strong>Atenção:</strong> A meta operacional do turno não foi atingida em 100%. Para concluir o encerramento da jornada, preencha obrigatoriamente a análise de 5 Porquês que será enviada ao Painel Executivo / Workstation para o Supervisor.
                </p>

                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-300 uppercase block mb-1">1º Porquê: Qual foi o problema / desvio ocorrido?</label>
                    <input
                      type="text"
                      placeholder="Ex: Carregamento do mapa 016080 atrasou mais de 20 minutos"
                      value={fiveWhysData.porque1}
                      onChange={e => setFiveWhysData({ ...fiveWhysData, porque1: e.target.value })}
                      className="g-input w-full text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-300 uppercase block mb-1">2º Porquê: Por que esse problema aconteceu?</label>
                    <input
                      type="text"
                      placeholder="Ex: Falta de paletes de vasilhame na linha de apoio"
                      value={fiveWhysData.porque2}
                      onChange={e => setFiveWhysData({ ...fiveWhysData, porque2: e.target.value })}
                      className="g-input w-full text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-300 uppercase block mb-1">3º Porquê: Por que a causa acima ocorreu?</label>
                    <input
                      type="text"
                      placeholder="Ex: A empilhadeira de ressuprimento estava ocupada descarregando outra carreta"
                      value={fiveWhysData.porque3}
                      onChange={e => setFiveWhysData({ ...fiveWhysData, porque3: e.target.value })}
                      className="g-input w-full text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-300 uppercase block mb-1">4º Porquê: Por que não havia plano de contingência?</label>
                    <input
                      type="text"
                      placeholder="Ex: A priorização das tarefas no quadro não estava ordenada por horário"
                      value={fiveWhysData.porque4}
                      onChange={e => setFiveWhysData({ ...fiveWhysData, porque4: e.target.value })}
                      className="g-input w-full text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-300 uppercase block mb-1">5º Porquê: Qual a causa sistêmica / falha do processo?</label>
                    <input
                      type="text"
                      placeholder="Ex: Ausência de alinhamento prévio no início do turno entre conferente e empilhador"
                      value={fiveWhysData.porque5}
                      onChange={e => setFiveWhysData({ ...fiveWhysData, porque5: e.target.value })}
                      className="g-input w-full text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-amber-400 uppercase block mb-1">Causa Raiz & Plano de Ação Sugerido</label>
                    <textarea
                      rows={2}
                      placeholder="Descreva a contramedida para evitar que esse atraso se repita no próximo turno..."
                      value={fiveWhysData.causaRaiz}
                      onChange={e => setFiveWhysData({ ...fiveWhysData, causaRaiz: e.target.value, planoAcao: e.target.value })}
                      className="g-input w-full text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-800 pt-3">
                  <button
                    onClick={handleSubmitFiveWhys}
                    className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg"
                  >
                    ENVIAR 5 PORQUÊS E ENCERRAR JORNADA
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SHIFT SUCCESS CELEBRATION MODAL */}
          {shiftSuccessCelebration && (
            <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-[#11151c] border border-emerald-500/50 rounded-2xl p-6 max-w-md w-full flex flex-col items-center text-center gap-4 shadow-2xl">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-3xl">
                  🎉
                </div>
                <h3 className="text-lg font-black text-white uppercase tracking-wider">
                  PARABÉNS, METAS ATINGIDAS!
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Você concluiu todas as tarefas do turno dentro do padrão DPO Ambev sem desvios de tempo. Excelente trabalho!
                </p>
                <button
                  onClick={() => setShiftSuccessCelebration(false)}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg w-full mt-2"
                >
                  OK — CONCLUIR
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Sugerir Melhoria / Plano de Ação para Supervisores */}
      <SugerirMelhoriaCard user={user} empresa={empresa} setor="Picking & Empilhadeiras" />
    </div>
  );
}
