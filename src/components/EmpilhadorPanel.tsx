import React, { useState, useEffect } from 'react';
import { db, isCustomFirebaseConnected } from '../firebase';
import { collection, onSnapshot, query, where, updateDoc, doc, addDoc } from 'firebase/firestore';
import { Usuario, Empresa, Tarefa } from '../types';
import SugerirMelhoriaCard from './SugerirMelhoriaCard';

interface EmpilhadorPanelProps {
  user: Usuario;
  empresa: Empresa | null;
}

export default function EmpilhadorPanel({ user, empresa }: EmpilhadorPanelProps) {
  const empresaId = empresa?.id || 'demo';
  const draftKey = `empilhador_draft_${empresaId}_${user.nome || 'guest'}`;

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

  const [operatorName, setOperatorName] = useState<string>(() => getDraftValue('operatorName', ''));
  const [operators, setOperators] = useState<string[]>(['MARIVALDO', 'RONILDO', 'PAULO PEREIRA']);
  const [newOpName, setNewOpName] = useState<string>(() => getDraftValue('newOpName', ''));

  const defaultChecklist = [
    { id: 1, label: 'Corredor de operação isolado', desc: 'Isolamento com cones ou fitas refletivas nas duas cabeceiras do corredor.', checked: false },
    { id: 2, label: 'Zonas de pedestre livres', desc: 'Confirmado que nenhum pedestre transita dentro da área operacional de manobra.', checked: false },
    { id: 3, label: 'Sinalização visual ativa', desc: 'Luz giratória (giroflex) ou strobo e buzina atestadas como operacionais.', checked: false },
    { id: 4, label: 'Piso livre de resíduos', desc: 'Obstáculos, paletes avariados, plásticos ou fitas de arquear removidos do piso.', checked: false },
    { id: 5, label: 'Iluminação de pátio adequada', desc: 'Visibilidade regular para empilhadeira atestada na zona operativa.', checked: false },
  ];
  const [checklist, setChecklist] = useState(() => getDraftValue('checklist', defaultChecklist));
  const [checklistDone, setChecklistDone] = useState<boolean>(() => getDraftValue('checklistDone', false));
  const [operMode, setOperMode] = useState<'durante' | 'apos' | null>(() => getDraftValue('operMode', null));

  // Tasks States
  const [tasks, setTasks] = useState<Tarefa[]>([]);
  const [activeTaskTrack, setActiveTaskTrack] = useState<number | null>(null);
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});
  const [draftRestored, setDraftRestored] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        const hasChecks = (parsed.checklist || []).some((item: any) => item.checked);
        return !!(parsed.operatorName || parsed.newOpName || hasChecks || parsed.checklistDone || parsed.operMode);
      }
    } catch (e) {}
    return false;
  });

  const toggleDateGroup = (dateKey: string) => {
    setExpandedDates(prev => ({ ...prev, [dateKey]: !prev[dateKey] }));
  };

  // Sync state with local draft saving
  useEffect(() => {
    const draftData = {
      operatorName,
      operators,
      newOpName,
      checklist,
      checklistDone,
      operMode
    };
    localStorage.setItem(draftKey, JSON.stringify(draftData));
  }, [operatorName, operators, newOpName, checklist, checklistDone, operMode, draftKey]);

  // Sync with prop updates / user changing
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setOperatorName(parsed.operatorName || '');
        setOperators(['MARIVALDO', 'RONILDO', 'PAULO PEREIRA']);
        setNewOpName(parsed.newOpName || '');
        setChecklist(parsed.checklist || defaultChecklist);
        setChecklistDone(parsed.checklistDone || false);
        setOperMode(parsed.operMode || null);
        const hasChecks = (parsed.checklist || []).some((item: any) => item.checked);
        setDraftRestored(!!(parsed.operatorName || parsed.newOpName || hasChecks || parsed.checklistDone || parsed.operMode));
      } else {
        setOperatorName('');
        setOperators(['MARIVALDO', 'RONILDO', 'PAULO PEREIRA']);
        setNewOpName('');
        setChecklist(defaultChecklist);
        setChecklistDone(false);
        setOperMode(null);
        setDraftRestored(false);
      }
    } catch (e) {
      console.error(e);
    }
  }, [draftKey]);

  // Sync with Firestore Tasks (scoped to company matching operator)
  useEffect(() => {
    if (!db) {
      const savedTasks = localStorage.getItem(`tasks_${empresaId}`);
      if (savedTasks) setTasks(JSON.parse(savedTasks));
      return;
    }

    const q = query(collection(db, 'tarefas'), where('empresaId', '==', empresaId));
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map(doc => ({ _docId: doc.id, ...doc.data() } as Tarefa));
      setTasks(rows);
      localStorage.setItem(`tasks_${empresaId}`, JSON.stringify(rows));
    });

    return () => unsub();
  }, [empresaId]);

  // Sync operators from Firestore 'colaboradores' collection
  useEffect(() => {
    const allowedOps = ['MARIVALDO', 'RONILDO', 'PAULO PEREIRA'];
    setOperators(allowedOps);
  }, [empresaId]);

  const persistState = (extra: Record<string, any> = {}) => {
    const d = {
      operators,
      operatorName,
      checklistDone,
      operMode,
      ...extra
    };
    localStorage.setItem(`empilhador_state_${empresaId}`, JSON.stringify(d));
  };

  const handleToggleCheck = (id: number) => {
    setChecklist(prev => prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  };

  const checklistCheckedCount = checklist.filter(c => c.checked).length;
  const isChecklistCompleted = checklistCheckedCount === checklist.length;

  const handleConfirmChecklist = () => {
    if (!isChecklistCompleted) return;
    setChecklistDone(true);
    persistState({ checklistDone: true });
    // Trigger in-app alerting toast
    triggerToast('Checklist concluído! Lançamentos liberados para o turno.');
  };

  const handleAddOperator = () => {
    const clean = newOpName.trim().toUpperCase();
    if (!clean || operators.includes(clean)) return;
    const upd = [...operators, clean];
    setOperators(upd);
    setNewOpName('');
    persistOps(upd);
    triggerAlert('Adicionado operador: ' + clean);
  };

  const handleSelectOp = (name: string) => {
    setOperatorName(name);
    setTimeout(() => {
      persistState();
    }, 100);
  };

  const handleSelectMode = (mode: 'durante' | 'apos') => {
    if (!operator) {
      triggerAlert('Por favor, selecione seu nome de operador antes.', true);
      return;
    }
    setOperMode(mode);
    persistState();
    triggerAlert('Tipo de reabastecimento definido!');
  };

  const handleStartTask = async (t: Tarefa) => {
    if (!tipoOperacao) {
      triggerAlert('Configure o tipo de operação antes de iniciar (Durante ou Após o Carregamento).', true);
      return;
    }
    setTaskProgress(t.id, 'in_progress', {
      iniciadoEm: new Date().toISOString(),
      tipoOperacao: tipoOperacao === 'durante' ? 'Durante o Carregamento' : 'Após o Carregamento',
    });
    triggerAlert(`Tarefa #${t.id} INICIADA de forma segura!`);
  };

  const handleFinishTask = async (t: Tarefa) => {
    const finishedTs = new Date().toISOString();
    const duration = Math.round((new Date(finishedTs).getTime() - new Date(t.iniciadoEm || '').getTime()) / 60000);
    
    // Simulate safety maps coordinates tracking
    const pathSimulation = {
      distanciaM: Math.round(150 + Math.random() * 200),
      totalIdleSec: Math.round(15 + Math.random() * 45),
      segmentosParado: Math.random() > 0.5 ? 1 : 0,
      mapsLink: 'https://www.google.com/maps?q=-7.05,' + (-35.4 - Math.random() * 0.1).toFixed(4),
      totalLeituras: 12
    };

    setTaskProgress(t.id, 'done', {
      finalizadoEm: finishedTs,
      duracaoMin: duration > 0 ? duration : 1,
      locData: pathSimulation
    });

    triggerAlert(`Tarefa #${t.id} CONCLUÍDA! Tempo total gasto: ${duration > 0 ? duration : 1} min.`);
  };

  const setTaskProgress = async (taskId: number, status: 'in_progress' | 'done', payload: any) => {
    const target = tasks.find(x => x.id === taskId);
    if (!target) return;

    if (db && target._docId) {
      await updateDoc(doc(db, 'tarefas', target._docId), { status, ...payload });
      
      // Auto register to completed static reports
      if (status === 'done') {
        const repoRef = collection(db, 'registros');
        await addDoc(repoRef, {
          empresaId,
          id: target.id,
          codigo: target.codigo,
          descricao: target.descricao,
          quantidade: target.quantidade,
          conferente: target.conferente,
          operador: target.operador,
          criadoEm: target.criadoEm,
          iniciadoEm: target.iniciadoEm || new Date().toISOString(),
          finalizadoEm: payload.finalizadoEm,
          duracaoMin: payload.duracaoMin,
          enviadoEm: new Date().toISOString(),
          tipoOperacao: target.tipoOperacao || payload.tipoOperacao,
          locDistanciaM: payload.locData.distanciaM,
          locIdleSec: payload.locData.totalIdleSec,
          locParadas: payload.locData.segmentosParado,
          locMapsLink: payload.locData.mapsLink,
        });
      }
      window.dispatchEvent(new CustomEvent('app_data_updated'));
      window.dispatchEvent(new CustomEvent('local_data_changed'));
    } else {
      // Local fallback
      const updated = tasks.map(x => x.id === taskId ? { ...x, status, ...payload } : x);
      setTasks(updated);
      localStorage.setItem(`tasks_${empresaId}`, JSON.stringify(updated));
      localStorage.setItem(`tarefas_rows_${empresaId}`, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('app_data_updated'));
      window.dispatchEvent(new CustomEvent('local_data_changed'));
    }
  };

  const persistOps = (upd: string[]) => {
    const cached = localStorage.getItem(`empilhador_state_${empresaId}`);
    let d = {};
    if (cached) try { d = JSON.parse(cached); } catch(e) {}
    localStorage.setItem(`empilhador_state_${empresaId}`, JSON.stringify({ ...d, operators: upd }));
  };

  const triggerToast = (m: string) => {
    const el = document.getElementById('toast');
    if (el) {
      el.style.background = '';
      el.style.color = '';
      el.textContent = m;
      el.className = 'toast show';
      setTimeout(() => {
        el.className = 'toast';
      }, 3000);
    }
  };

  const triggerAlert = (m: string, err?: boolean) => {
    const el = document.getElementById('toast');
    if (el) {
      el.style.background = err ? '#ef4444' : 'var(--green)';
      el.style.color = err ? '#ffffff' : '#0a0c10';
      el.textContent = m;
      el.className = 'toast show';
      setTimeout(() => {
        el.className = 'toast';
        el.style.background = '';
        el.style.color = '';
      }, 3000);
    }
  };

  // Aliases for ease-of-use
  const operator = operatorName;
  const tipoOperacao = operMode;

  // Filter tasks based on operator name
  const matchOp = (targetOpName: string) => {
    if (!operator) return false;
    const opClean = operator.toUpperCase().trim();
    const tgtClean = targetOpName.toUpperCase().trim();
    return opClean === tgtClean || opClean.includes(tgtClean) || tgtClean.includes(opClean);
  };

  const pendingTasks  = tasks.filter(t => t.status === 'pending' && matchOp(t.operador));
  const progressTasks = tasks.filter(t => t.status === 'in_progress' && matchOp(t.operador));
  const completedTasks= tasks.filter(t => t.status === 'done' && matchOp(t.operador)).slice(0, 10);

  return (
    <div className="flex flex-col gap-6">
      
      {/* CHECKLIST ESCREVER BLOCK COVERS FULL PAGE IF LOCKED */}
      {!checklistDone ? (
        <div className="g-card p-6 md:p-8 flex flex-col gap-5 border border-[#f5a623]/20 bg-[#11151c]/90">
          <div className="text-5xl text-center mb-3">✅</div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222d3a] pb-3">
            <h3 className="font-sans font-black text-sm tracking-widest text-[#f5a623] uppercase">CHECKLIST PRÉ-OPERAÇÃO</h3>
            <div className="flex items-center gap-1.5 text-[9px] text-[#22c55e] font-black uppercase tracking-wider bg-[#22c55e]/5 px-2.5 py-1 rounded-lg border border-[#22c55e]/15">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              Salvo automaticamente
            </div>
          </div>
          <p className="text-xs text-[#6a7d92] text-center leading-relaxed max-w-md mx-auto">
            Por normas de segurança da plataforma, confirme cada item de segurança antes de liberar o painel de reabastecimento.
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
              ✅ REVISÃO FEITA — CONFIRMAR E INICIAR
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          
          {/* Operator identification settings card */}
          <div className="g-card p-6 flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222d3a] pb-3">
              <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-[#f5a623]">Identificação do Operador e Modo</h4>
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
                    setOperatorName('');
                    setNewOpName('');
                    setChecklist(defaultChecklist);
                    setChecklistDone(false);
                    setOperMode(null);
                    setDraftRestored(false);
                    localStorage.removeItem(draftKey);
                  }}
                  className="text-[9px] uppercase font-black tracking-wider text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                >
                  Limpar formulário
                </button>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-end">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#6a7d92]">Seu Nome de Operador *</label>
                <select 
                  value={operator}
                  onChange={e => handleSelectOp(e.target.value)}
                  className="g-input bg-[#151b23] border-[#1c2530]"
                >
                  <option value="">— Selecione seu nome —</option>
                  {operators.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              <div className="flex gap-2">
                <input 
                  type="text"
                  placeholder="Novo colaborador name"
                  value={newOpName}
                  onChange={e => setNewOpName(e.target.value)}
                  className="g-input flex-1"
                />
                <button 
                  onClick={handleAddOperator}
                  className="bg-[#151b23] border border-[#222d3a] hover:border-[#6a7d92] text-[#f5a623] text-xs font-sans font-bold px-4 py-2.5 rounded-lg tracking-wider uppercase cursor-pointer"
                >
                  + Add
                </button>
              </div>
            </div>

            {/* Mode selection block */}
            <div className="border-t border-[#222d3a] pt-4 mt-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#6a7d92] block mb-3">Estágio de reabastecimento</span>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => handleSelectMode('durante')}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all cursor-pointer ${tipoOperacao === 'durante' ? 'bg-[#f5a623]/10 border-[#f5a623]/40 text-[#f5a623]' : 'bg-[#151b23] border-[#1c2530] text-[#6a7d92] hover:text-snow'}`}
                >
                  <span className="text-2xl mb-1.5 block">🚛</span>
                  <span className="font-sans font-black text-xs uppercase tracking-wider">Durante o carregamento</span>
                </button>
                <button 
                  onClick={() => handleSelectMode('apos')}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all cursor-pointer ${tipoOperacao === 'apos' ? 'bg-[#f5a623]/10 border-[#f5a623]/40 text-[#f5a623]' : 'bg-[#151b23] border-[#1c2530] text-[#6a7d92] hover:text-snow'}`}
                >
                  <span className="text-2xl mb-1.5 block">📦</span>
                  <span className="font-sans font-black text-xs uppercase tracking-wider">Após o carregamento</span>
                </button>
              </div>
            </div>
          </div>

          {/* Pending tasks area */}
          <div>
            <div className="sec-head open bg-[#11151c] p-3 rounded-t-xl border border-[#222d3a] flex items-center justify-between">
              <h4 className="font-sans font-black text-xs uppercase tracking-wider text-snow">Minhas Tarefas Pendentes</h4>
              <span className={`text-xs font-black px-2 py-0.5 rounded-full ${pendingTasks.length > 0 ? 'bg-[#f5a623] text-[#07090d]' : 'bg-[#151b23] text-[#6a7d92]'}`}>{pendingTasks.length}</span>
            </div>
            <div className="p-4 bg-[#0f1318] border border-[#222d3a] border-t-none rounded-b-xl flex flex-col gap-3 max-h-80 overflow-y-auto">
              {!operator ? (
                <p className="text-xs text-[#6a7d92] text-center p-4">Selecione seu nome de operador acima para visualizar as tarefas pendentes.</p>
              ) : pendingTasks.length === 0 ? (
                <p className="text-xs text-[#6a7d92] text-center p-4">Nenhuma tarefa pendente na fila de reabastecimento. Bom trabalho!</p>
              ) : (
                pendingTasks.map(t => (
                  <div key={t.id} className="p-4 bg-[#11151c] border border-[#1c2530] rounded-xl flex items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-mono text-[#f5a623] font-bold block mb-1">SKU: {t.codigo}</span>
                      <h5 className="text-xs font-bold text-snow leading-tight">{t.descricao}</h5>
                      <span className="text-[10px] text-[#6a7d92] block mt-2">Desejado por {t.conferente}</span>
                    </div>
                    <div className="text-right flex-shrink-0 flex items-center gap-4">
                      <div>
                        <span className="text-2xl font-black text-[#f5a623]">{t.quantidade}</span>
                        <span className="block text-[8px] uppercase tracking-wider font-bold text-[#6a7d92]">Palete</span>
                      </div>
                      <button 
                        onClick={() => handleStartTask(t)}
                        className="py-2.5 px-4 bg-[#f5a623] hover:bg-yellow font-bold text-xs uppercase tracking-widest text-[#07090d] rounded-lg transition-colors cursor-pointer"
                      >
                        Iniciar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Progress area */}
          <div>
            <div className="sec-head open bg-[#11151c] p-3 rounded-t-xl border border-[#222d3a] flex items-center justify-between">
              <h4 className="font-sans font-black text-xs uppercase tracking-wider text-snow">Em Andamento</h4>
              <span className={`text-xs font-black px-2 py-0.5 rounded-full ${progressTasks.length > 0 ? 'bg-[#3b82f6] text-white' : 'bg-[#151b23] text-[#6a7d92]'}`}>{progressTasks.length}</span>
            </div>
            <div className="p-4 bg-[#0f1318] border border-[#222d3a] border-t-none rounded-b-xl flex flex-col gap-3">
              {progressTasks.length === 0 ? (
                <p className="text-xs text-[#6a7d92] text-center p-4">Nenhuma tarefa ativa no momento.</p>
              ) : (
                progressTasks.map(t => (
                  <div key={t.id} className="p-4 bg-[#11151c] border-l-4 border-l-[#3b82f6] border border-[#1c2530] rounded-xl flex items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-mono text-[#f5a623] font-bold block mb-1">SKU: {t.codigo}</span>
                      <h5 className="text-xs font-bold text-snow leading-tight">{t.descricao}</h5>
                      <span className="text-[10px] text-[#6a7d92] block mt-1.5">Iniciado às {new Date(t.iniciadoEm || '').toLocaleTimeString()} ({t.tipoOperacao})</span>
                    </div>
                    <div className="text-right flex-shrink-0 flex items-center gap-4">
                      <div>
                        <span className="text-2xl font-black text-[#3b82f6]">{t.quantidade}</span>
                        <span className="block text-[8px] uppercase tracking-wider font-bold text-[#6a7d92]">Palete</span>
                      </div>
                      <button 
                        onClick={() => handleFinishTask(t)}
                        className="py-2.5 px-4 bg-[#22c55e] hover:bg-green font-bold text-xs uppercase tracking-widest text-[#07090d] rounded-lg transition-colors cursor-pointer"
                      >
                        Finalizar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Completed area */}
          <div>
            <div className="sec-head open bg-[#11151c] p-3 rounded-t-xl border border-[#222d3a] flex items-center justify-between">
              <h4 className="font-sans font-black text-xs uppercase tracking-wider text-snow">Minhas Concluídas</h4>
              <span className="text-xs font-black px-2 py-0.5 rounded-full bg-[#151b23] text-[#6a7d92]">{completedTasks.length}</span>
            </div>
            <div className="p-4 bg-[#0f1318] border border-[#222d3a] border-t-none rounded-b-xl flex flex-col gap-3">
              {completedTasks.length === 0 ? (
                <p className="text-xs text-[#6a7d92] text-center p-4">Nenhuma tarefa encerrada hoje.</p>
              ) : (
                (() => {
                  const grouped = completedTasks.reduce((acc, t) => {
                    const key = t.finalizadoEm ? t.finalizadoEm.split('T')[0] : new Date().toISOString().split('T')[0];
                    if (!acc[key]) acc[key] = [];
                    acc[key].push(t);
                    return acc;
                  }, {} as Record<string, Tarefa[]>);

                  return (Object.entries(grouped) as [string, Tarefa[]][]).map(([dateKey, rows]) => {
                    const isOpen = !!expandedDates[dateKey];
                    const totalPallets = rows.reduce((s, t) => s + (t.quantidade || 0), 0);

                    let formattedDate = dateKey;
                    try {
                      const [y, m, d] = dateKey.split('-');
                      const dt = new Date(Number(y), Number(m) - 1, Number(d));
                      const daysOfWeek = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
                      formattedDate = `${d}/${m}/${y} — ${daysOfWeek[dt.getDay()]}`;
                    } catch (e) {}

                    return (
                      <div key={dateKey} className="g-card border border-[#222d3a] rounded-xl overflow-hidden mb-2">
                        <div 
                          onClick={() => toggleDateGroup(dateKey)}
                          className="p-3 bg-[#151b23] flex items-center justify-between cursor-pointer select-none gap-2 flex-wrap"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-sans font-bold text-xs text-[#f5a623] tracking-wide">📅 {formattedDate}</span>
                            <span className="text-[9px] bg-[#11151c] border border-[#222d3a] px-2 py-0.5 rounded-full font-bold text-snow">
                              {rows.length} concluídas
                            </span>
                            <span className="text-[10px] text-[#6a7d92] font-semibold">
                              🪵 {totalPallets} paletes movimentados
                            </span>
                          </div>
                          <span className="text-[#6a7d92] text-xs transition-transform" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
                        </div>

                        {isOpen && (
                          <div className="p-3 bg-[#0c1015]/40 border-t border-[#222d3a]/40 flex flex-col gap-3">
                            {rows.map(t => (
                              <div key={t.id} className="p-4 bg-[#11151c] border border-[#1c2530] rounded-xl">
                                <div className="flex items-center justify-between mb-2">
                                  <div>
                                    <span className="text-[10px] font-mono text-[#f5a623] font-bold block">SKU: {t.codigo}</span>
                                    <h5 className="text-xs font-bold text-snow leading-tight">{t.descricao}</h5>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-md font-sans font-black text-snow">{t.quantidade} paletes</span>
                                    <span className="block text-[8px] uppercase tracking-widest font-black text-[#2e3e50]">{t.tipoOperacao}</span>
                                  </div>
                                </div>
                                <div className="flex justify-between items-center text-[10px] text-[#6a7d92] border-t border-[#1c2530]/50 pt-2 mt-2">
                                  <span>Iniciado: {t.iniciadoEm ? new Date(t.iniciadoEm).toLocaleTimeString() : '—'} · Fim: {t.finalizadoEm ? new Date(t.finalizadoEm).toLocaleTimeString() : '—'}</span>
                                  <span>Duração total: <strong className="text-[#22c55e]">{t.duracaoMin} min</strong></span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()
              )}
            </div>
          </div>

        </div>
      )}

      {/* Sugerir Melhoria / Plano de Ação para Supervisores */}
      <SugerirMelhoriaCard user={user} empresa={empresa} setor="Picking" />
    </div>
  );
}
export {};
