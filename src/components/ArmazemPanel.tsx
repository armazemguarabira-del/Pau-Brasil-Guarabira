import React, { useState, useEffect } from 'react';
import { db, isCustomFirebaseConnected } from '../firebase';
import { collection, addDoc, onSnapshot, query, where, deleteDoc, doc } from 'firebase/firestore';
import { Usuario, Empresa, ArmazemRow } from '../types';
import { TrendingUp, CheckCircle, Clock, Award, BarChart2 } from 'lucide-react';
import SugerirMelhoriaCard from './SugerirMelhoriaCard';

interface ArmazemPanelProps {
  user: Usuario;
  empresa: Empresa | null;
}

const PLACAS = [
  'QSK7D92', 'OXO0532', 'OXO0542', 'OXO0552', 'OXO0782', 'SLB4A26',
  'NPR2601', 'SLB4A56', 'TOZ8B20', 'TOZ8B50', 'RLR8G79', 'RLU4H49',
  'TOU7F79', 'RLW0C17', 'SLB3J76', 'RLU3F59', 'RLT5J54', 'RLT5J44'
];

export default function ArmazemPanel({ user, empresa }: ArmazemPanelProps) {
  const empresaId = empresa?.id || 'demo';
  const draftKey = `armazem_draft_${empresaId}_${user.nome || 'guest'}`;

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

  const [operacao, setOperacao] = useState<'Carregamento' | 'Descarregamento'>(() => getDraftValue('operacao', 'Carregamento'));
  const [empilhadorSelection, setEmpilhadorSelection] = useState<string>(() => {
    const val = getDraftValue('empilhador', '');
    if (!val) return '';
    if (['MARIVALDO', 'RONILDO', 'PAULO PEREIRA'].includes(val)) return val;
    return 'Outro';
  });
  const [empilhadorOutro, setEmpilhadorOutro] = useState<string>(() => {
    const val = getDraftValue('empilhador', '');
    if (['MARIVALDO', 'RONILDO', 'PAULO PEREIRA'].includes(val)) return '';
    return val;
  });

  const empilhador = empilhadorSelection === 'Outro' ? empilhadorOutro : empilhadorSelection;

  const [turno, setTurno] = useState<string>(() => getDraftValue('turno', 'Diurno'));
  const [placaSelection, setPlacaSelection] = useState<string>(() => getDraftValue('placaSelection', PLACAS[0]));
  const [placaOutro, setPlacaOutro] = useState<string>(() => getDraftValue('placaOutro', ''));
  const [tipo, setTipo] = useState<string>(() => getDraftValue('tipo', 'rota'));
  const [palhete, setPalhete] = useState<number | ''>(() => getDraftValue('palhete', ''));
  const [inicio, setInicio] = useState<string>(() => getDraftValue('inicio', ''));
  const [fim, setFim] = useState<string>(() => getDraftValue('fim', ''));
  const [obs, setObs] = useState<string>(() => getDraftValue('obs', ''));
  const [pernoiteSelection, setPernoiteSelection] = useState<'D0' | 'D1' | 'D2' | 'D3' | 'D4'>('D0');
  const [statusChip, setStatusChip] = useState('—');
  const [activeTab, setActiveTab] = useState<'form' | 'stats' | 'hist'>('form');
  const [armazemRows, setArmazemRows] = useState<ArmazemRow[]>([]);
  const [registering, setRegistering] = useState(false);
  const [draftRestored, setDraftRestored] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return !!(parsed.empilhador || parsed.placaOutro || parsed.inicio || parsed.fim || parsed.obs || (parsed.palhete !== undefined && parsed.palhete !== '') || parsed.operacao !== 'Carregamento');
      }
    } catch (e) {}
    return false;
  });
  
  // Accordion collapsed state: key is date string, value is true/false (collapsed)
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync state with local draft saving
  useEffect(() => {
    const draftData = {
      operacao,
      empilhador,
      turno,
      placaSelection,
      placaOutro,
      tipo,
      palhete,
      inicio,
      fim,
      obs
    };
    localStorage.setItem(draftKey, JSON.stringify(draftData));
  }, [operacao, empilhador, turno, placaSelection, placaOutro, tipo, palhete, inicio, fim, obs, draftKey]);

  // Sync with prop updates / user changing
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setOperacao(parsed.operacao || 'Carregamento');
        
        const empVal = parsed.empilhador || '';
        if (['MARIVALDO', 'RONILDO', 'PAULO PEREIRA'].includes(empVal)) {
          setEmpilhadorSelection(empVal);
          setEmpilhadorOutro('');
        } else if (empVal) {
          setEmpilhadorSelection('Outro');
          setEmpilhadorOutro(empVal);
        } else {
          setEmpilhadorSelection('');
          setEmpilhadorOutro('');
        }

        setTurno(parsed.turno || 'Diurno');
        setPlacaSelection(parsed.placaSelection || PLACAS[0]);
        setPlacaOutro(parsed.placaOutro || '');
        setTipo(parsed.tipo || 'rota');
        setPalhete(parsed.palhete !== undefined ? parsed.palhete : '');
        setInicio(parsed.inicio || '');
        setFim(parsed.fim || '');
        setObs(parsed.obs || '');
        setDraftRestored(!!(parsed.empilhador || parsed.placaOutro || parsed.inicio || parsed.fim || parsed.obs || (parsed.palhete !== undefined && parsed.palhete !== '') || parsed.operacao !== 'Carregamento'));
      } else {
        setOperacao('Carregamento');
        setEmpilhadorSelection('');
        setEmpilhadorOutro('');
        setTurno('Diurno');
        setPlacaSelection(PLACAS[0]);
        setPlacaOutro('');
        setTipo('rota');
        setPalhete('');
        setInicio('');
        setFim('');
        setObs('');
        setDraftRestored(false);
      }
    } catch (e) {
      console.error(e);
    }
  }, [draftKey]);

  function AF_getEmpresaId() { return empresaId; }
  function dbOk() { return !!db && !!empresaId; }

  const pad2 = (num: number) => String(num).padStart(2, '0');
  const nowHHMM = () => {
    const n = new Date();
    return [n.getHours(), n.getMinutes()].map(pad2).join(':');
  };

  useEffect(() => {
    if (!db || !empresaId) return;
    const unsub = fbListenArmazem();
    return () => { if (unsub) unsub(); };
  }, [empresaId]);

  // Sync with Firestore (scoped to company)
  const fbListenArmazem = () => {
    const q = query(collection(db, 'armazem'), where('empresaId', '==', empresaId));
    return onSnapshot(q, (snap) => {
      const rows = snap.docs.map(doc => ({ _docId: doc.id, ...doc.data() } as ArmazemRow));
      setArmazemRows(rows);
      localStorage.setItem(`armazem_rows_${empresaId}`, JSON.stringify(rows));
      
      // Auto expand the most recent date
      if (rows.length > 0) {
        const dates = [...new Set(rows.map(r => r.dataISO))].sort().reverse();
        if (dates.length > 0) {
          const firstDate = dates[0] as string;
          setExpandedDates(prev => ({ [firstDate]: true, ...prev }));
        }
      }
    });
  };

  useEffect(() => {
    // Local fallback if no live database is active
    if (!db) {
      const saved = localStorage.getItem(`armazem_rows_${empresaId}`);
      if (saved) {
        const rows = JSON.parse(saved);
        setArmazemRows(rows);
        if (rows.length > 0) {
          const dates = [...new Set(rows.map((r: any) => r.dataISO))].sort().reverse();
          if (dates.length > 0) {
            const firstDate = dates[0] as string;
            setExpandedDates({ [firstDate]: true });
          }
        }
      }
    }
  }, []);

  useEffect(() => {
    calcWindowStatus();
  }, [inicio, fim, empilhadorSelection]);

  const calcWindowStatus = () => {
    if (!inicio || !fim) {
      setStatusChip('—');
      return;
    }
    const isNightShift = turno === 'Noturno';
    const isOk = isNightShift
      ? (inicio >= '21:00' || inicio <= '06:30') && (fim >= '21:00' || fim <= '06:30')
      : (inicio >= '07:00' && fim <= '21:00');
    setStatusChip(isOk ? '✅ DENTRO DA JANELA' : '⚠ FORA DA JANELA');
  };

  // Group by Date for collapsible accordions
  const getGroupedRows = () => {
    const groups: Record<string, ArmazemRow[]> = {};
    armazemRows.forEach(r => {
      const key = r.dataISO || 'sem-data';
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });
    return Object.fromEntries(
      Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
    );
  };

  const handleRegister = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!inicio || !fim || !empilhador) {
      setErrorMsg('Preencha os horários e o nome do empilhador responsável.');
      return;
    }

    if (palhete === '' || isNaN(Number(palhete)) || Number(palhete) <= 0) {
      setErrorMsg('Por favor, informe uma quantidade válida de palhetes.');
      return;
    }

    const isNightShift = turno === 'Noturno';
    const isOk = isNightShift
      ? (inicio >= '21:00' || inicio <= '06:30') && (fim >= '21:00' || fim <= '06:30')
      : (inicio >= '07:00' && fim <= '21:00');
    if (!isOk && !obs.trim()) {
      const windowStr = isNightShift ? '21:00 – 06:30' : '07:00 – 21:00';
      setErrorMsg(`Observação obrigatória ao lançar registros FORA da janela de faturamento (${windowStr}).`);
      return;
    }

    setRegistering(true);
    const today = new Date();
    const dataISO = today.toISOString().split('T')[0];
    const dataStr = today.toLocaleDateString('pt-BR');

    const finalPlaca = placaSelection === 'Outra...' ? placaOutro.toUpperCase() : placaSelection;

    const newRow: Omit<ArmazemRow, '_docId'> & { empresaId: string } = {
      empresaId,
      operacao,
      data: dataStr,
      dataISO,
      inicio,
      fim,
      status: isOk ? '✅ DENTRO DA JANELA' : '⚠ FORA DA JANELA',
      empilhador,
      turno,
      placa: finalPlaca,
      tipo,
      palhete: Number(palhete),
      pernoite: operacao === 'Descarregamento' ? pernoiteSelection : "",
      obs: obs.trim()
    };

    try {
      if (db) {
        await addDoc(collection(db, 'armazem'), newRow);
      } else {
        const current = [...armazemRows, { _docId: String(Date.now()), ...newRow }];
        setArmazemRows(current);
        localStorage.setItem(`armazem_rows_${empresaId}`, JSON.stringify(current));
      }
      
      setSuccessMsg('Lançamento de pátio salvo com sucesso!');
      // Reset form
      setInicio('');
      setFim('');
      setPalhete('');
      setObs('');
      setPlacaOutro('');
      setStatusChip('—');
      setActiveTab('hist');
      setDraftRestored(false);
      localStorage.removeItem(draftKey);
    } catch (e) {
      setErrorMsg('Erro ao salvar no banco: ' + e);
    } finally {
      setRegistering(false);
    }
  };

  const toggleDateGroup = (dateKey: string) => {
    setExpandedDates(prev => ({
      ...prev,
      [dateKey]: !prev[dateKey]
    }));
  };

  const handleDelete = async (docId?: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!docId || !confirm('Excluir este lançamento de pátio?')) return;
    try {
      if (db) {
        await deleteDoc(doc(db, 'armazem', docId));
      } else {
        const remaining = armazemRows.filter(r => r._docId !== docId);
        setArmazemRows(remaining);
        localStorage.setItem(`armazem_rows_${empresaId}`, JSON.stringify(remaining));
      }
      setSuccessMsg('Registro excluído com sucesso!');
    } catch (e) {
      setErrorMsg('Erro ao excluir: ' + e);
    }
  };

  const grouped = getGroupedRows();

  return (
    <div className="flex flex-col gap-6">
      
      <div className="flex items-center justify-between p-4 bg-[#11151c] border-b border-[#222d3a] rounded-t-xl -mx-6 md:-mx-12 -mt-6">
        <span className="font-sans font-black text-sm tracking-widest text-[#7cc6ff] uppercase">🚛 CARREGAMENTO / DESCARREGAMENTO</span>
      </div>

      <div className="ptabs border-b border-[#222d3a] flex gap-2">
        <button 
          onClick={() => setActiveTab('form')}
          className={`ptab py-2 px-6 font-sans font-bold text-xs uppercase cursor-pointer relative ${activeTab === 'form' ? 'text-[#7cc6ff] border-b-2 border-b-[#7cc6ff]' : 'text-[#6a7d92] hover:text-[#e8eef5]'}`}
        >
          📝 Lançar Registro
        </button>
        <button 
          onClick={() => setActiveTab('stats')}
          className={`ptab py-2 px-6 font-sans font-bold text-xs uppercase cursor-pointer relative ${activeTab === 'stats' ? 'text-[#7cc6ff] border-b-2 border-b-[#7cc6ff]' : 'text-[#6a7d92] hover:text-[#e8eef5]'}`}
        >
          📊 Produtividade do Dia
        </button>
        <button 
          onClick={() => setActiveTab('hist')}
          className={`ptab py-2 px-6 font-sans font-bold text-xs uppercase cursor-pointer relative ${activeTab === 'hist' ? 'text-[#7cc6ff] border-b-2 border-b-[#7cc6ff]' : 'text-[#6a7d92] hover:text-[#e8eef5]'}`}
        >
          📋 Histórico agrupado <span className="ml-1.5 px-2 py-0.5 rounded-full bg-[#151b23] border border-[#222d3a] text-[10px] text-snow">{armazemRows.length}</span>
        </button>
      </div>

      {activeTab === 'stats' && (
        <div className="g-card p-6 flex flex-col gap-6 bg-gradient-to-br from-[#11151c] to-[#151b23] border border-[#222d3a]">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="font-sans font-black text-lg text-[#7cc6ff] uppercase tracking-wide flex items-center gap-2">
                <BarChart2 className="w-5 h-5" /> Minha Produtividade de Hoje (Armazém)
              </h3>
              <p className="text-xs text-[#6a7d92] mt-1">
                Visão em tempo real das movimentações registradas no seu turno de hoje ({new Date().toLocaleDateString('pt-BR')}).
              </p>
            </div>
            <div className="text-[10px] text-[#6a7d92] font-mono font-bold bg-[#151b23] border border-[#222d3a] px-3 py-1.5 rounded-lg">
              OPERADOR: {user.nome}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#151b23] border border-[#222d3a] rounded-xl p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-[#7cc6ff]/10 text-[#7cc6ff]">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#6a7d92] block tracking-wider">Viagens Realizadas</span>
                <span className="text-xl font-bold text-snow font-mono">
                  {armazemRows.filter(r => r.data === new Date().toLocaleDateString('pt-BR') && r.empilhador === user.nome).length}
                </span>
              </div>
            </div>

            <div className="bg-[#151b23] border border-[#222d3a] rounded-xl p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-indigo-500/10 text-indigo-400">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#6a7d92] block tracking-wider">Paletes Movimentados</span>
                <span className="text-xl font-bold text-snow font-mono">
                  {armazemRows.filter(r => r.data === new Date().toLocaleDateString('pt-BR') && r.empilhador === user.nome).reduce((sum, r) => sum + (r.palhete || 0), 0)} pl
                </span>
              </div>
            </div>

            <div className="bg-[#151b23] border border-[#222d3a] rounded-xl p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#6a7d92] block tracking-wider">Eficiência / No Prazo</span>
                <span className="text-xl font-bold text-snow font-mono">
                  {armazemRows.filter(r => r.data === new Date().toLocaleDateString('pt-BR') && r.empilhador === user.nome && r.status?.includes('DENTRO')).length}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold text-[#6a7d92] uppercase tracking-wider">Histórico Detalhado de Hoje</h4>
            {armazemRows.filter(r => r.data === new Date().toLocaleDateString('pt-BR') && r.empilhador === user.nome).length === 0 ? (
              <div className="text-center py-6 border border-dashed border-[#222d3a] rounded-xl text-xs text-[#6a7d92]">
                Nenhuma movimentação registrada por você hoje ainda. Use a aba "Lançar Registro" para começar!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#a0aec0]">
                  <thead>
                    <tr className="border-b border-[#222d3a] text-[#6a7d92] uppercase text-[10px] font-bold tracking-wider">
                      <th className="py-2.5 px-3">Placa / Tipo</th>
                      <th className="py-2.5 px-3">Paletes</th>
                      <th className="py-2.5 px-3">Operação</th>
                      <th className="py-2.5 px-3">Duração</th>
                      <th className="py-2.5 px-3">Resultado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222d3a]">
                    {armazemRows
                      .filter(r => r.data === new Date().toLocaleDateString('pt-BR') && r.empilhador === user.nome)
                      .map((r, idx) => (
                        <tr key={r._docId || idx} className="hover:bg-[#151b23]/30 transition-colors">
                          <td className="py-3 px-3 font-bold text-snow">
                            <span className="text-[#7cc6ff] font-mono mr-1.5">{r.placa}</span>
                            <span className="text-[#6a7d92] text-[10px]">({r.tipo})</span>
                          </td>
                          <td className="py-3 px-3 font-mono font-semibold">{r.palhete} pl</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded font-black text-[9px] uppercase ${
                              r.operacao === 'Carregamento' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-amber-500/10 text-amber-400'
                            }`}>
                              {r.operacao}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono text-[#6a7d92]">{r.inicio} - {r.fim}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                              (r.status || '').includes('DENTRO') 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'form' ? (
        <div className="g-card p-6 flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222d3a] pb-3">
            <h3 className="font-sans font-bold text-sm tracking-wider uppercase text-[#7cc6ff]">Formulário Operacional de Pátio</h3>
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
                  setInicio('');
                  setFim('');
                  setPalhete(1);
                  setObs('');
                  setPlacaOutro('');
                  setEmpilhadorSelection('');
                  setEmpilhadorOutro('');
                  setPlacaSelection(PLACAS[0]);
                  setDraftRestored(false);
                  localStorage.removeItem(draftKey);
                }}
                className="text-[9px] uppercase font-black tracking-wider text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
              >
                Limpar formulário
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-center justify-between gap-3 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl text-xs text-red-400">
              <div className="flex items-center gap-2">
                <span>⚠ {errorMsg}</span>
              </div>
              <button 
                type="button" 
                onClick={() => setErrorMsg(null)} 
                className="text-xs font-bold text-red-400 hover:text-red-300 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center justify-between gap-3 bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 rounded-xl text-xs text-emerald-400">
              <div className="flex items-center gap-2">
                <span>✓ {successMsg}</span>
              </div>
              <button 
                type="button" 
                onClick={() => setSuccessMsg(null)} 
                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#6a7d92]">Operação *</label>
              <select value={operacao} onChange={e => setOperacao(e.target.value as any)} className="g-input">
                <option value="Carregamento">Carregamento</option>
                <option value="Descarregamento">Descarregamento</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#6a7d92]">Empilhador Responsável *</label>
              <select 
                value={empilhadorSelection} 
                onChange={e => {
                  const val = e.target.value;
                  setEmpilhadorSelection(val);
                  if (val !== 'Outro') {
                    setEmpilhadorOutro('');
                  }
                  if (val === 'PAULO PEREIRA') {
                    setTurno('Noturno');
                  } else if (val === 'MARIVALDO' || val === 'RONILDO') {
                    setTurno('Diurno');
                  }
                }} 
                className="g-input bg-[#151b23] border-[#1c2530]"
                required
              >
                <option value="">Selecione o empilhador...</option>
                <option value="MARIVALDO">MARIVALDO</option>
                <option value="RONILDO">RONILDO</option>
                <option value="PAULO PEREIRA">PAULO PEREIRA</option>
                <option value="Outro">Outro...</option>
              </select>
              {empilhadorSelection === 'Outro' && (
                <input 
                  type="text" 
                  required
                  placeholder="Nome do operador"
                  value={empilhadorOutro}
                  onChange={e => setEmpilhadorOutro(e.target.value)}
                  className="g-input mt-2"
                />
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#6a7d92]">Turno operacional *</label>
              <select value={turno} onChange={e => setTurno(e.target.value)} className="g-input">
                <option value="Diurno">Diurno</option>
                <option value="Noturno">Noturno</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#6a7d92]">Placa do Caminhão *</label>
              <select 
                value={placaSelection} 
                onChange={e => setPlacaSelection(e.target.value)} 
                className="g-input bg-[#151b23] border-[#1c2530]"
              >
                {PLACAS.map((pt) => <option key={pt} value={pt}>{pt}</option>)}
                <option value="Outra...">Outra Placa...</option>
              </select>
              {placaSelection === 'Outra...' && (
                <input 
                  type="text"
                  maxLength={8}
                  placeholder="DIGITE A PLACA"
                  value={placaOutro}
                  onChange={e => setPlacaOutro(e.target.value.toUpperCase())}
                  className="g-input mt-2"
                />
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#6a7d92]">Tipo da Carga</label>
              <select value={tipo} onChange={e => setTipo(e.target.value)} className="g-input">
                <option value="rota">Rota Comercial</option>
                <option value="puxada">Puxada / Fábrica</option>
                <option value="recarga">Recarga de Veículo</option>
                <option value="terceiro">Terceiros / Extras</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#6a7d92]">Quantidade de Palhetes *</label>
              <input 
                type="number"
                min={1}
                value={palhete === 0 ? '' : palhete}
                onChange={e => {
                  const val = e.target.value;
                  if (val === '') {
                    setPalhete('');
                  } else {
                    setPalhete(Math.max(1, parseInt(val) || 0));
                  }
                }}
                className="g-input"
                placeholder="Digite a quantidade..."
              />
            </div>
          </div>

          <div className={`grid grid-cols-1 ${operacao === 'Descarregamento' ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4`}>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#6a7d92]">Hora de Início *</label>
              <div className="flex gap-2">
                <input 
                  type="time" 
                  value={inicio} 
                  onChange={e => setInicio(e.target.value)} 
                  className="g-input flex-1 font-mono"
                />
                <button 
                  type="button" 
                  onClick={() => setInicio(nowHHMM())}
                  className="px-3 border border-[#222d3a] hover:border-[#6a7d92] bg-[#151b23] rounded-lg text-xs font-bold text-[#7cc6ff] cursor-pointer"
                >
                  Horário
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#6a7d92]">Hora Término *</label>
              <div className="flex gap-2">
                <input 
                  type="time" 
                  value={fim} 
                  onChange={e => setFim(e.target.value)} 
                  className="g-input flex-1 font-mono"
                />
                <button 
                  type="button" 
                  onClick={() => setFim(nowHHMM())}
                  className="px-3 border border-[#222d3a] hover:border-[#6a7d92] bg-[#151b23] rounded-lg text-xs font-bold text-[#7cc6ff] cursor-pointer"
                >
                  Horário
                </button>
              </div>
            </div>
            {operacao === 'Descarregamento' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#6a7d92]">Pernoite *</label>
                <select 
                  value={pernoiteSelection} 
                  onChange={e => setPernoiteSelection(e.target.value as any)} 
                  className="g-input bg-[#151b23] border-[#1c2530]"
                >
                  <option value="D0">D0 (Mesmo Dia)</option>
                  <option value="D1">D1 (1 Dia)</option>
                  <option value="D2">D2 (2 Dias)</option>
                  <option value="D3">D3 (3 Dias)</option>
                  <option value="D4">D4 (4+ Dias)</option>
                </select>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#6a7d92]">
                {empilhadorSelection === 'PAULO PEREIRA' ? 'Status de Faturamento (21:00 → 06:30)' : 'Status de Faturamento (07:00 → 21:00)'}
              </label>
              <div className={`py-3 px-4 rounded-xl border border-[#222d3a] text-xs font-bold font-sans tracking-wide text-center bg-[#07090d] ${statusChip.includes('DENTRO') ? 'text-[#22c55e]' : statusChip === '—' ? 'text-[#6a7d92]' : 'text-[#f5a623]'}`}>
                {statusChip}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#6a7d92]">Observação (Obrigatória se fora da janela regular de faturamento)</label>
            <textarea 
              value={obs}
              onChange={e => setObs(e.target.value)}
              placeholder="Justifique o faturamento ou descarregamento tardio / adiantado nesta área..."
              className={`g-input h-20 resize-none ${statusChip.includes('FORA') && !obs ? 'border-[#f5a623]' : ''}`}
            />
          </div>

          <button 
            type="button"
            disabled={registering}
            onClick={handleRegister}
            className="w-full py-4 text-sm font-sans font-bold uppercase tracking-widest text-[#07090d] bg-gradient-to-br from-[#7cc6ff] to-[#3a9ad3] hover:shadow-[0_4px_16px_rgba(124,198,255,0.25)] rounded-xl disabled:opacity-50 cursor-pointer"
          >
            {registering ? 'Lançando...' : '💾 SALVAR LANÇAMENTO DE PÁTIO'}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {Object.keys(grouped).length === 0 ? (
            <div className="g-card p-12 text-center text-[#6a7d92]">Nenhum registro de pátio computado.</div>
          ) : (
            Object.entries(grouped).map(([dateKey, rows]) => {
              const isOpen = !!expandedDates[dateKey];
              const foraCount = rows.filter(r => r.status.includes('FORA')).length;
              const totalPallets = rows.reduce((s, r) => s + r.palhete, 0);

              // Date formatting helper
              let formattedDate = dateKey;
              try {
                const [y, m, d] = dateKey.split('-');
                const dt = new Date(Number(y), Number(m) - 1, Number(d));
                const daysOfWeek = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
                formattedDate = `${d}/${m}/${y} — ${daysOfWeek[dt.getDay()]}`;
              } catch (e) {}

              return (
                <div key={dateKey} className="g-card overflow-hidden">
                  <div 
                    onClick={() => toggleDateGroup(dateKey)}
                    className="p-4 bg-[#151b23] flex items-center justify-between cursor-pointer select-none gap-4 flex-wrap"
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-sans font-black text-sm text-[#7cc6ff] tracking-wide">📅 {formattedDate}</span>
                      <span className="text-[10px] bg-[#11151c] border border-[#222d3a] px-2 py-0.5 rounded-full font-bold text-snow">
                        {rows.length} operações
                      </span>
                      {foraCount > 0 ? (
                        <span className="text-[9px] bg-[#ef4444]/15 border border-[#ef4444]/25 text-[#fca5a5] px-2 py-0.5 rounded-full font-bold">
                          ⚠ {foraCount} fora da janela
                        </span>
                      ) : (
                        <span className="text-[9px] bg-[#22c55e]/15 border border-[#22c55e]/25 text-[#22c55e] px-2 py-0.5 rounded-full font-bold">
                          ✓ Tudo Ok
                        </span>
                      )}
                      <span className="text-[10px] text-[#6a7d92] font-semibold">
                        🪵 {totalPallets} palhetes
                      </span>
                    </div>
                    <span className="text-[#6a7d92] text-xs transition-transform" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
                  </div>

                  {isOpen && (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse font-sans text-xs min-w-[700px]">
                        <thead>
                          <tr className="bg-[#07090d] border-b border-[#222d3a]">
                            <th className="p-3 text-[#6a7d92] text-left uppercase tracking-wider">Operação</th>
                            <th className="p-3 text-[#6a7d92] text-left uppercase tracking-wider">Horário</th>
                            <th className="p-3 text-[#6a7d92] text-left uppercase tracking-wider">Status</th>
                            <th className="p-3 text-[#6a7d92] text-left uppercase tracking-wider">Empilhador</th>
                            <th className="p-3 text-[#6a7d92] text-left uppercase tracking-wider">Veículo</th>
                            <th className="p-3 text-[#6a7d92] text-left uppercase tracking-wider">Tipo</th>
                            <th className="p-3 text-[#6a7d92] text-center uppercase tracking-wider">Paletes</th>
                            <th className="p-3 text-[#6a7d92] text-left uppercase tracking-wider">Justificativa</th>
                            <th className="p-3 text-[#6a7d92] text-right uppercase tracking-wider">Ação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#222d3a]/60">
                          {rows.map((r, ri) => {
                            const isAt = r.status.includes('DENTRO');
                            return (
                              <tr key={r._docId || ri} className="hover:bg-[#151b23]/10">
                                <td className="p-3 font-bold text-snow">{r.operacao}</td>
                                <td className="p-3 font-mono">{r.inicio} → {r.fim}</td>
                                <td className={`p-3 font-bold ${isAt ? 'text-[#22c55e]' : 'text-[#f5a623]'}`}>
                                  {isAt ? 'Dentro' : 'Fora'}
                                </td>
                                <td className="p-3">{r.empilhador}</td>
                                <td className="p-3 font-mono text-[#f5a623] font-bold">{r.placa}</td>
                                <td className="p-3 font-bold text-[#e8eef5] capitalize">{r.tipo}</td>
                                <td className="p-3 text-center font-bold text-[#f5a623]">{r.palhete}</td>
                                <td className="p-3 text-[#6a7d92] truncate max-w-[150px]" title={r.obs || '—'}>
                                  {r.obs || '—'}
                                </td>
                                <td className="p-3 text-right">
                                  <button 
                                    onClick={() => handleDelete(r._docId)}
                                    className="py-1 px-2 border border-[#ef4444]/20 hover:bg-[#ef4444] text-[#fca5a5] hover:text-white rounded text-[10px] font-bold cursor-pointer"
                                  >
                                    ✕
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Sugerir Melhoria / Plano de Ação para Supervisores */}
      <SugerirMelhoriaCard user={user} empresa={empresa} setor="EFC / EFD" />
    </div>
  );
}
export {};
