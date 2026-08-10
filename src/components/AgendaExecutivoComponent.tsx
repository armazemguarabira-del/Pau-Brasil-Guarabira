import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  UserCheck, 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  Search, 
  Check, 
  Trash2, 
  Edit3, 
  ListFilter,
  FileText,
  Paperclip,
  Upload,
  Download,
  Eye,
  Image as ImageIcon,
  FileSpreadsheet,
  FileCode,
  FolderOpen,
  User,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  CheckSquare
} from 'lucide-react';
import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';

export interface AnexoDocumento {
  id: string;
  nome: string;
  tamanhoFormatted: string;
  tipo: string;
  dataUrl?: string; // base64 para preview/download
  criadoEm: string;
}

export interface CompromissoAgenda {
  id: string;
  dataISO: string; // YYYY-MM-DD
  dataFormatted: string; // DD/MM/YYYY
  hora: string; // HH:mm
  titulo: string;
  categoria: 'Reunião' | 'Auditoria DPO' | 'Treinamento' | 'Inspeção 5S' | 'Análise KAIZEN' | 'Outros';
  prioridade: 'Alta' | 'Média' | 'Baixa';
  responsavel: string;
  setorOuTime: string;
  observacoes: string;
  status: 'Pendente' | 'Em Andamento' | 'Concluído' | 'Cancelado';
  criadoPor: string;
  criadoEm: string;
  anexos?: AnexoDocumento[];
}

interface AgendaExecutivoComponentProps {
  user: any;
  empresaId?: string;
}

export const AgendaExecutivoComponent: React.FC<AgendaExecutivoComponentProps> = ({
  user,
  empresaId = 'demo'
}) => {
  const currentUserName = user?.nome || 'Usuário Executivo';

  const [compromissos, setCompromissos] = useState<CompromissoAgenda[]>(() => {
    try {
      const saved = localStorage.getItem('agenda_executiva_compromissos_list');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    // Seed initial user commitment if empty
    const today = new Date().toISOString().split('T')[0];
    const todayParts = today.split('-');
    const todayFmt = `${todayParts[2]}/${todayParts[1]}/${todayParts[0]}`;

    return [
      {
        id: 'comp-meu-1',
        dataISO: today,
        dataFormatted: todayFmt,
        hora: '10:00',
        titulo: 'Reunião de Alinhamento de Metas Corporativas e Projetos',
        categoria: 'Reunião',
        prioridade: 'Alta',
        responsavel: currentUserName,
        setorOuTime: 'Diretoria & Gestão Executiva',
        observacoes: 'Apresentação do relatório de planejamento estratégico e pauta de investimentos do trimestre.',
        status: 'Pendente',
        criadoPor: currentUserName,
        criadoEm: new Date().toISOString(),
        anexos: [
          {
            id: 'anexo-demo-1',
            nome: 'Pauta_Reuniao_Estrategica.pdf',
            tamanhoFormatted: '380 KB',
            tipo: 'application/pdf',
            criadoEm: todayFmt
          }
        ]
      }
    ];
  });

  const [apenasMeusCompromissos, setApenasMeusCompromissos] = useState<boolean>(true);
  const [periodoFiltro, setPeriodoFiltro] = useState<'dia' | 'semana' | 'mes' | 'todos'>('dia');
  const [selectedDateISO, setSelectedDateISO] = useState<string>(new Date().toISOString().split('T')[0]);
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todas');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal / Form state
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [dataISO, setDataISO] = useState<string>(new Date().toISOString().split('T')[0]);
  const [hora, setHora] = useState<string>('09:00');
  const [titulo, setTitulo] = useState<string>('');
  const [categoria, setCategoria] = useState<CompromissoAgenda['categoria']>('Reunião');
  const [prioridade, setPrioridade] = useState<CompromissoAgenda['prioridade']>('Média');
  const [responsavel, setResponsavel] = useState<string>(currentUserName);
  const [setorOuTime, setSetorOuTime] = useState<string>('Executivo / Liderança');
  const [observacoes, setObservacoes] = useState<string>('');
  const [status, setStatus] = useState<CompromissoAgenda['status']>('Pendente');
  const [modalAnexos, setModalAnexos] = useState<AnexoDocumento[]>([]);

  // Toast / Feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cardFileInputRef = useRef<HTMLInputElement>(null);
  const [activeCardIdForUpload, setActiveCardIdForUpload] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sync with Firestore
  useEffect(() => {
    const fetchAgendaFirestore = async () => {
      if (!db) return;
      try {
        const colRef = collection(db, 'agenda_executiva_compromissos');
        const snap = await getDocs(colRef);
        if (!snap.empty) {
          const list: CompromissoAgenda[] = [];
          snap.forEach(d => list.push({ id: d.id, ...d.data() } as CompromissoAgenda));
          if (list.length > 0) {
            list.sort((a, b) => `${a.dataISO} ${a.hora}`.localeCompare(`${b.dataISO} ${b.hora}`));
            setCompromissos(list);
            localStorage.setItem('agenda_executiva_compromissos_list', JSON.stringify(list));
          }
        }
      } catch (err) {
        console.warn('Firestore load fallback for Agenda Executiva:', err);
      }
    };

    fetchAgendaFirestore();
  }, []);

  const saveToStorageAndFirestore = async (newList: CompromissoAgenda[], itemToSave?: CompromissoAgenda, itemToDeleteId?: string) => {
    setCompromissos(newList);
    localStorage.setItem('agenda_executiva_compromissos_list', JSON.stringify(newList));

    if (db) {
      try {
        if (itemToSave) {
          await setDoc(doc(db, 'agenda_executiva_compromissos', itemToSave.id), itemToSave);
        }
        if (itemToDeleteId) {
          await deleteDoc(doc(db, 'agenda_executiva_compromissos', itemToDeleteId));
        }
      } catch (e) {
        console.warn('Firestore sync error for Agenda:', e);
      }
    }
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    setDataISO(selectedDateISO);
    setHora('09:00');
    setTitulo('');
    setCategoria('Reunião');
    setPrioridade('Média');
    setResponsavel(currentUserName);
    setSetorOuTime('Executivo / Liderança');
    setObservacoes('');
    setStatus('Pendente');
    setModalAnexos([]);
    setShowModal(true);
  };

  const handleEditCompromisso = (c: CompromissoAgenda) => {
    setEditingId(c.id);
    setDataISO(c.dataISO);
    setHora(c.hora);
    setTitulo(c.titulo);
    setCategoria(c.categoria);
    setPrioridade(c.prioridade);
    setResponsavel(c.responsavel);
    setSetorOuTime(c.setorOuTime);
    setObservacoes(c.observacoes);
    setStatus(c.status);
    setModalAnexos(c.anexos || []);
    setShowModal(true);
  };

  const handleDeleteCompromisso = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este compromisso corporativo da sua agenda?')) {
      const updated = compromissos.filter(c => c.id !== id);
      saveToStorageAndFirestore(updated, undefined, id);
      showToast('Compromisso removido com sucesso!');
    }
  };

  const handleToggleStatus = (c: CompromissoAgenda) => {
    const nextStatus = c.status === 'Concluído' ? 'Pendente' : 'Concluído';
    const updatedItem: CompromissoAgenda = { ...c, status: nextStatus };
    const updatedList = compromissos.map(item => item.id === c.id ? updatedItem : item);
    saveToStorageAndFirestore(updatedList, updatedItem);
    showToast(`Status do compromisso alterado para ${nextStatus}!`);
  };

  // Upload handler for Modal
  const handleModalFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const sizeMb = file.size / (1024 * 1024);
        const sizeFormatted = sizeMb >= 1 ? `${sizeMb.toFixed(1)} MB` : `${Math.round(file.size / 1024)} KB`;
        
        const newAnexo: AnexoDocumento = {
          id: `anexo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          nome: file.name,
          tamanhoFormatted: sizeFormatted,
          tipo: file.type || file.name.split('.').pop() || 'documento',
          dataUrl,
          criadoEm: new Date().toLocaleDateString('pt-BR')
        };

        setModalAnexos(prev => [...prev, newAnexo]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Upload handler directly on Commitment Card
  const handleCardFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeCardIdForUpload) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const cardId = activeCardIdForUpload;
    const targetComp = compromissos.find(c => c.id === cardId);
    if (!targetComp) return;

    const newAnexosList: AnexoDocumento[] = [...(targetComp.anexos || [])];

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const sizeMb = file.size / (1024 * 1024);
        const sizeFormatted = sizeMb >= 1 ? `${sizeMb.toFixed(1)} MB` : `${Math.round(file.size / 1024)} KB`;

        const newAnexo: AnexoDocumento = {
          id: `anexo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          nome: file.name,
          tamanhoFormatted: sizeFormatted,
          tipo: file.type || file.name.split('.').pop() || 'documento',
          dataUrl,
          criadoEm: new Date().toLocaleDateString('pt-BR')
        };

        newAnexosList.push(newAnexo);

        const updatedComp: CompromissoAgenda = { ...targetComp, anexos: newAnexosList };
        const updatedList = compromissos.map(item => item.id === cardId ? updatedComp : item);
        saveToStorageAndFirestore(updatedList, updatedComp);
        showToast(`Documento "${file.name}" anexado ao compromisso!`);
      };
      reader.readAsDataURL(file);
    });

    if (cardFileInputRef.current) cardFileInputRef.current.value = '';
    setActiveCardIdForUpload(null);
  };

  const handleDownloadAnexo = (anexo: AnexoDocumento) => {
    if (!anexo.dataUrl) {
      alert(`Documento: ${anexo.nome}\n\nEste anexo de exemplo é informativo.`);
      return;
    }
    const link = document.createElement('a');
    link.href = anexo.dataUrl;
    link.download = anexo.nome;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRemoveAnexoCard = (comp: CompromissoAgenda, anexoId: string) => {
    const updatedAnexos = (comp.anexos || []).filter(a => a.id !== anexoId);
    const updatedComp = { ...comp, anexos: updatedAnexos };
    const updatedList = compromissos.map(item => item.id === comp.id ? updatedComp : item);
    saveToStorageAndFirestore(updatedList, updatedComp);
    showToast('Anexo removido do compromisso!');
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) {
      alert('Por favor, informe o título do compromisso.');
      return;
    }

    const parts = dataISO.split('-');
    const dataFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`;

    const idToUse = editingId || `comp-${Date.now()}`;
    const newCompromisso: CompromissoAgenda = {
      id: idToUse,
      dataISO,
      dataFormatted,
      hora: hora || '08:00',
      titulo: titulo.trim(),
      categoria,
      prioridade,
      responsavel: responsavel.trim() || currentUserName,
      setorOuTime: setorOuTime.trim() || 'Executivo',
      observacoes: observacoes.trim(),
      status,
      criadoPor: currentUserName,
      criadoEm: new Date().toISOString(),
      anexos: modalAnexos
    };

    let updatedList: CompromissoAgenda[];
    if (editingId) {
      updatedList = compromissos.map(item => item.id === editingId ? newCompromisso : item);
    } else {
      updatedList = [newCompromisso, ...compromissos];
    }

    updatedList.sort((a, b) => `${a.dataISO} ${a.hora}`.localeCompare(`${b.dataISO} ${b.hora}`));
    saveToStorageAndFirestore(updatedList, newCompromisso);

    setShowModal(false);
    showToast(editingId ? 'Compromisso atualizado!' : 'Novo compromisso salvo na sua agenda!');
  };

  // Helper for File Icons
  const getFileIcon = (mimeOrName: string) => {
    const l = mimeOrName.toLowerCase();
    if (l.includes('pdf')) return <FileText className="w-4 h-4 text-rose-400 shrink-0" />;
    if (l.includes('xls') || l.includes('xlsx') || l.includes('csv') || l.includes('spreadsheet')) 
      return <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />;
    if (l.includes('image') || l.includes('png') || l.includes('jpg') || l.includes('jpeg')) 
      return <ImageIcon className="w-4 h-4 text-purple-400 shrink-0" />;
    if (l.includes('doc') || l.includes('docx') || l.includes('word')) 
      return <FileText className="w-4 h-4 text-sky-400 shrink-0" />;
    return <Paperclip className="w-4 h-4 text-amber-400 shrink-0" />;
  };

  // Date Filtering Calculation
  const selDateObj = new Date(selectedDateISO + 'T00:00:00');
  const selYear = selDateObj.getFullYear();
  const selMonth = selDateObj.getMonth();

  const dayOfWeek = (selDateObj.getDay() + 6) % 7;
  const mondayObj = new Date(selDateObj);
  mondayObj.setDate(selDateObj.getDate() - dayOfWeek);
  const sundayObj = new Date(mondayObj);
  sundayObj.setDate(mondayObj.getDate() + 6);

  const mondayISO = mondayObj.toISOString().split('T')[0];
  const sundayISO = sundayObj.toISOString().split('T')[0];

  // Filter for User Registered Commitments ONLY ("Mostrar somente os compromissos que você mesmo cadastrou")
  const userFilteredCompromissos = useMemo(() => {
    return compromissos.filter(c => {
      // If user toggled "Apenas Meus Compromissos", ensure created by user or assigned to user
      if (apenasMeusCompromissos) {
        const uName = (currentUserName || '').toLowerCase().trim();
        const cCriado = (c.criadoPor || '').toLowerCase().trim();
        const cResp = (c.responsavel || '').toLowerCase().trim();
        const isUserItem = cCriado.includes(uName) || cResp.includes(uName) || cCriado === 'usuário executivo' || cCriado === 'eu';
        if (!isUserItem) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSearch = c.titulo.toLowerCase().includes(q) || 
                            c.responsavel.toLowerCase().includes(q) || 
                            c.observacoes.toLowerCase().includes(q) || 
                            c.setorOuTime.toLowerCase().includes(q);
        if (!matchSearch) return false;
      }

      // Category filter
      if (categoriaFiltro !== 'todas' && c.categoria !== categoriaFiltro) {
        return false;
      }

      // Period filter
      if (periodoFiltro === 'dia') {
        return c.dataISO === selectedDateISO;
      } else if (periodoFiltro === 'semana') {
        return c.dataISO >= mondayISO && c.dataISO <= sundayISO;
      } else if (periodoFiltro === 'mes') {
        const cDate = new Date(c.dataISO + 'T00:00:00');
        return cDate.getFullYear() === selYear && cDate.getMonth() === selMonth;
      }

      return true;
    });
  }, [compromissos, apenasMeusCompromissos, searchQuery, categoriaFiltro, periodoFiltro, selectedDateISO, mondayISO, sundayISO, selYear, selMonth, currentUserName]);

  // KPI Metrics for Commitments
  const todayISO = new Date().toISOString().split('T')[0];
  const countToday = userFilteredCompromissos.filter(c => c.dataISO === todayISO).length;
  const countWeek = userFilteredCompromissos.filter(c => c.dataISO >= mondayISO && c.dataISO <= sundayISO).length;
  const countPendente = userFilteredCompromissos.filter(c => c.status === 'Pendente' || c.status === 'Em Andamento').length;
  const countComAnexos = userFilteredCompromissos.filter(c => c.anexos && c.anexos.length > 0).length;

  return (
    <div className="space-y-6">
      
      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-blue-600 text-white font-black px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-blue-400 animate-bounce">
          <Sparkles className="w-5 h-5 text-amber-300" />
          <span className="text-xs">{toastMessage}</span>
        </div>
      )}

      {/* HIDDEN FILE INPUT FOR DIRECT CARD ATTACHMENTS */}
      <input
        type="file"
        ref={cardFileInputRef}
        onChange={handleCardFileUpload}
        multiple
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.txt,.csv"
        className="hidden"
      />

      {/* 🚀 CABEÇALHO DA AGENDA EXECUTIVA — COMPROMISSOS CORPORATIVOS */}
      <div className="bg-[#111a30] border border-blue-500/30 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-3 bg-blue-500/20 border border-blue-500/30 rounded-xl text-blue-400 shrink-0">
            <CalendarIcon className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
                AGENDA EXECUTIVA DEDICADA
              </span>
              <span className="text-[10px] text-slate-300 font-mono">Compromissos Corporativos</span>
            </div>
            <h2 className="text-lg font-black text-white mt-1 uppercase tracking-tight">
              Agenda de Compromissos, Reuniões & Anexos
            </h2>
            <p className="text-xs text-slate-300 leading-snug max-w-2xl">
              Gestão exclusiva dos compromissos cadastrados por você com suporte a anexos de documentos (PDF, Word, Excel, Imagens) para lembretes e pautas de reunião.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" /> Novo Compromisso
        </button>
      </div>

      {/* CARDS KPIS DE COMPROMISSOS CORPORATIVOS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 block">Compromissos Hoje</span>
            <strong className="text-2xl font-mono font-black text-blue-400">{countToday}</strong>
          </div>
          <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 block">Na Semana Vigente</span>
            <strong className="text-2xl font-mono font-black text-purple-400">{countWeek}</strong>
          </div>
          <div className="p-2.5 bg-purple-500/10 rounded-xl text-purple-400">
            <CalendarIcon className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 block">Com Documento Anexo</span>
            <strong className="text-2xl font-mono font-black text-emerald-400">{countComAnexos}</strong>
          </div>
          <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400">
            <Paperclip className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 block">Em Aberto / Pendentes</span>
            <strong className="text-2xl font-mono font-black text-amber-400">{countPendente}</strong>
          </div>
          <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-400">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* PAINEL DE CONTROLE DE NAVEGAÇÃO, FILTROS E TOGGLE "SÓ MEUS COMPROMISSOS" */}
      <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-4 space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          
          {/* BOTÕES DE PERÍODO (DIA / SEMANA / MÊS / TODOS) */}
          <div className="flex items-center gap-1.5 bg-[#0b1222] p-1.5 rounded-xl border border-slate-800 overflow-x-auto">
            <button
              type="button"
              onClick={() => setPeriodoFiltro('dia')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                periodoFiltro === 'dia' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Compromissos do Dia
            </button>

            <button
              type="button"
              onClick={() => setPeriodoFiltro('semana')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                periodoFiltro === 'semana' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Da Semana
            </button>

            <button
              type="button"
              onClick={() => setPeriodoFiltro('mes')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                periodoFiltro === 'mes' ? 'bg-sky-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Do Mês
            </button>

            <button
              type="button"
              onClick={() => setPeriodoFiltro('todos')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                periodoFiltro === 'todos' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos
            </button>
          </div>

          {/* TOGGLE: SOMENTE MEUS COMPROMISSOS CADASTRADOS */}
          <div className="flex items-center gap-3 bg-[#0b1222] px-3 py-2 rounded-xl border border-slate-800">
            <User className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="text-xs font-bold text-slate-300">Somente Cadastrados por Mim:</span>
            <button
              type="button"
              onClick={() => setApenasMeusCompromissos(!apenasMeusCompromissos)}
              className={`px-3 py-1 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${
                apenasMeusCompromissos
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {apenasMeusCompromissos ? 'Ativo (Eu)' : 'Exibir Todos'}
            </button>
          </div>

          {/* NAVEGAÇÃO POR DATA ESPECÍFICA */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-slate-400">Data Base:</span>
            <input
              type="date"
              value={selectedDateISO}
              onChange={(e) => setSelectedDateISO(e.target.value)}
              className="bg-[#0b1222] border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-white outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => setSelectedDateISO(todayISO)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold uppercase text-slate-300 rounded-xl cursor-pointer"
            >
              Hoje
            </button>
          </div>
        </div>

        {/* FILTRO DE CATEGORIA E CAMPO DE PESQUISA */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={categoriaFiltro}
              onChange={(e) => setCategoriaFiltro(e.target.value)}
              className="w-full sm:w-48 bg-[#0b1222] border border-slate-700 rounded-xl p-2 text-xs font-bold text-white outline-none focus:border-blue-500"
            >
              <option value="todas">Todas Categorias</option>
              <option value="Reunião">Reuniões</option>
              <option value="Auditoria DPO">Auditorias DPO</option>
              <option value="Treinamento">Treinamentos</option>
              <option value="Inspeção 5S">Inspeções 5S</option>
              <option value="Análise KAIZEN">Análise KAIZEN</option>
              <option value="Outros">Outros</option>
            </select>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por título, pauta, responsável..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0b1222] border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* LISTA DE COMPROMISSOS */}
      <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-blue-400" /> 
            Compromissos ({periodoFiltro.toUpperCase()} - {userFilteredCompromissos.length} item/ns)
          </h3>
          <span className="text-xs font-mono text-slate-400">
            {periodoFiltro === 'dia' ? `Data: ${selectedDateISO.split('-').reverse().join('/')}` : 
             periodoFiltro === 'semana' ? `Semana: ${mondayISO.split('-').reverse().join('/')} até ${sundayISO.split('-').reverse().join('/')}` : 
             `Período Selecionado`}
          </span>
        </div>

        {userFilteredCompromissos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {userFilteredCompromissos.map((c) => {
              const isConcluido = c.status === 'Concluído';
              const temAnexos = c.anexos && c.anexos.length > 0;

              return (
                <div 
                  key={c.id} 
                  className={`border rounded-2xl p-4 space-y-3 transition-all relative flex flex-col justify-between ${
                    isConcluido 
                      ? 'bg-[#080e1b] border-slate-800 opacity-75' 
                      : c.prioridade === 'Alta'
                        ? 'bg-[#121c35] border-rose-500/40 hover:border-rose-500'
                        : 'bg-[#0e172a] border-slate-700/80 hover:border-blue-500/50'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] font-mono font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            ⏰ {c.hora}
                          </span>
                          <span className="text-[10px] font-mono text-slate-300">
                            {c.dataFormatted}
                          </span>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                            c.prioridade === 'Alta' ? 'bg-rose-600 text-white' :
                            c.prioridade === 'Média' ? 'bg-amber-500 text-slate-950 font-black' :
                            'bg-slate-700 text-slate-300'
                          }`}>
                            {c.prioridade}
                          </span>
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            {c.categoria}
                          </span>
                        </div>

                        <h4 className={`text-sm font-black uppercase mt-1.5 ${isConcluido ? 'line-through text-slate-400' : 'text-white'}`}>
                          {c.titulo}
                        </h4>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleStatus(c)}
                        className={`p-2 rounded-xl transition-all cursor-pointer shrink-0 ${
                          isConcluido ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-emerald-600'
                        }`}
                        title={isConcluido ? 'Marcar como Pendente' : 'Marcar como Concluído'}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>

                    {c.observacoes && (
                      <p className="text-xs text-slate-300 bg-[#080d1a] p-2.5 rounded-xl border border-slate-800/80 leading-relaxed">
                        "{c.observacoes}"
                      </p>
                    )}

                    {/* 📎 BLOCO DE DOCUMENTOS E ANEXOS VINCULADOS AO COMPROMISSO */}
                    <div className="bg-[#080e1a] p-3 rounded-xl border border-slate-800/90 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <Paperclip className="w-3.5 h-3.5 text-blue-400" /> Documentos Anexos ({c.anexos?.length || 0})
                        </span>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveCardIdForUpload(c.id);
                            if (cardFileInputRef.current) cardFileInputRef.current.click();
                          }}
                          className="text-[10px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20"
                        >
                          <Upload className="w-3 h-3" /> Anexar Arquivo
                        </button>
                      </div>

                      {temAnexos ? (
                        <div className="space-y-1.5 pt-1">
                          {c.anexos!.map(anexo => (
                            <div key={anexo.id} className="flex items-center justify-between bg-[#111a30] p-2 rounded-lg border border-slate-800 text-xs">
                              <div className="flex items-center gap-2 truncate pr-2">
                                {getFileIcon(anexo.tipo || anexo.nome)}
                                <span className="text-slate-200 truncate font-mono text-[11px]">{anexo.nome}</span>
                                <span className="text-[9px] text-slate-400 font-mono">({anexo.tamanhoFormatted})</span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleDownloadAnexo(anexo)}
                                  className="p-1 text-slate-400 hover:text-emerald-400 cursor-pointer"
                                  title="Baixar / Visualizar"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAnexoCard(c, anexo.id)}
                                  className="p-1 text-slate-400 hover:text-rose-400 cursor-pointer"
                                  title="Excluir anexo"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">
                          Nenhum documento anexado ainda. Clique em "+ Anexar Arquivo" (suporta PDF, Excel, Word, Imagens).
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60 mt-2">
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                      <span>{c.responsavel} ({c.setorOuTime})</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditCompromisso(c)}
                        className="p-1 text-slate-400 hover:text-blue-400 cursor-pointer"
                        title="Editar"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCompromisso(c.id)}
                        className="p-1 text-slate-400 hover:text-rose-400 cursor-pointer"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center space-y-2 bg-[#0b1222] border border-slate-800 rounded-xl">
            <CalendarIcon className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400">
              Nenhum compromisso agendado para o período ou filtro selecionado. Clique em "+ Novo Compromisso" para registrar seu compromisso.
            </p>
          </div>
        )}
      </div>

      {/* MODAL NOVO / EDITAR COMPROMISSO */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveForm} className="bg-[#111a30] border-2 border-blue-500/50 rounded-2xl p-6 w-full max-w-xl space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black uppercase text-white flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-blue-400" />
                {editingId ? 'Editar Compromisso Executivo' : 'Novo Compromisso Corporativo'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Data *</label>
                <input
                  type="date"
                  value={dataISO}
                  onChange={(e) => setDataISO(e.target.value)}
                  className="w-full bg-[#0b1222] border border-slate-700 rounded-xl p-2 text-xs font-mono text-white outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Horário *</label>
                <input
                  type="time"
                  value={hora}
                  onChange={(e) => setHora(e.target.value)}
                  className="w-full bg-[#0b1222] border border-slate-700 rounded-xl p-2 text-xs font-mono text-white outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Título do Compromisso / Reunião *</label>
              <input
                type="text"
                placeholder="Ex: Alinhamento Estratégico de Metas e Produção"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="w-full bg-[#0b1222] border border-slate-700 rounded-xl p-2.5 text-xs font-bold text-white outline-none focus:border-blue-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Categoria</label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value as any)}
                  className="w-full bg-[#0b1222] border border-slate-700 rounded-xl p-2 text-xs font-bold text-white outline-none focus:border-blue-500"
                >
                  <option value="Reunião">Reunião</option>
                  <option value="Auditoria DPO">Auditoria DPO</option>
                  <option value="Treinamento">Treinamento</option>
                  <option value="Inspeção 5S">Inspeção 5S</option>
                  <option value="Análise KAIZEN">Análise KAIZEN</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Prioridade</label>
                <select
                  value={prioridade}
                  onChange={(e) => setPrioridade(e.target.value as any)}
                  className="w-full bg-[#0b1222] border border-slate-700 rounded-xl p-2 text-xs font-bold text-white outline-none focus:border-blue-500"
                >
                  <option value="Alta">Alta</option>
                  <option value="Média">Média</option>
                  <option value="Baixa">Baixa</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full bg-[#0b1222] border border-slate-700 rounded-xl p-2 text-xs font-bold text-white outline-none focus:border-blue-500"
                >
                  <option value="Pendente">Pendente</option>
                  <option value="Em Andamento">Em Andamento</option>
                  <option value="Concluído">Concluído</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Responsável Principal</label>
                <input
                  type="text"
                  value={responsavel}
                  onChange={(e) => setResponsavel(e.target.value)}
                  className="w-full bg-[#0b1222] border border-slate-700 rounded-xl p-2 text-xs text-white outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Setor / Time Envolvido</label>
                <input
                  type="text"
                  value={setorOuTime}
                  onChange={(e) => setSetorOuTime(e.target.value)}
                  className="w-full bg-[#0b1222] border border-slate-700 rounded-xl p-2 text-xs text-white outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Observações / Pauta da Reunião</label>
              <textarea
                rows={3}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Detalhes do compromisso, ordem do dia, pauta de discussão..."
                className="w-full bg-[#0b1222] border border-slate-700 rounded-xl p-2.5 text-xs text-white outline-none focus:border-blue-500 resize-none"
              />
            </div>

            {/* UPLOAD DE DOCUMENTOS NO MODAL */}
            <div className="space-y-2 border-t border-slate-800 pt-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase text-slate-300 flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-blue-400" /> Upload de Documentos (PDF, Word, Excel, Imagens)
                </label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-bold text-blue-400 hover:text-blue-300 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20 cursor-pointer flex items-center gap-1"
                >
                  <Upload className="w-3.5 h-3.5" /> Selecionar Arquivo(s)
                </button>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleModalFileUpload}
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.txt,.csv"
                className="hidden"
              />

              {modalAnexos.length > 0 ? (
                <div className="space-y-1.5 max-h-36 overflow-y-auto bg-[#0b1222] p-2 rounded-xl border border-slate-800">
                  {modalAnexos.map((anexo) => (
                    <div key={anexo.id} className="flex items-center justify-between bg-[#111a30] p-2 rounded-lg border border-slate-800 text-xs">
                      <div className="flex items-center gap-2 truncate pr-2">
                        {getFileIcon(anexo.tipo || anexo.nome)}
                        <span className="text-slate-200 truncate font-mono text-xs">{anexo.nome}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({anexo.tamanhoFormatted})</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setModalAnexos(prev => prev.filter(a => a.id !== anexo.id))}
                        className="p-1 text-slate-400 hover:text-rose-400 cursor-pointer"
                        title="Remover anexo"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 border-2 border-dashed border-slate-700/80 hover:border-blue-500/50 rounded-xl text-center cursor-pointer bg-[#0b1222]/50 space-y-1 transition-all"
                >
                  <Upload className="w-5 h-5 text-slate-500 mx-auto" />
                  <p className="text-xs text-slate-400 font-bold">Clique para enviar arquivos para esta reunião</p>
                  <span className="text-[10px] text-slate-500 block">PDF, Word (.docx), Excel (.xlsx), Imagens (.png/.jpg)</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold uppercase cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase shadow-lg cursor-pointer"
              >
                Salvar Compromisso
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
