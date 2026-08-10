import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  GitFork, 
  User, 
  Upload, 
  Plus, 
  X, 
  Trash2, 
  Edit3, 
  Search, 
  Eye, 
  Download, 
  FileText, 
  Image as ImageIcon, 
  Sparkles, 
  UserCheck, 
  CheckCircle2, 
  FileCode,
  FolderOpen,
  Filter,
  ExternalLink,
  Info
} from 'lucide-react';
import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { LISTA_COLABORADORES_OFICIAIS } from './RankingModule';

export interface FluxogramaColaborador {
  id: string;
  nomeColaborador: string;
  cargoOuFuncao: string;
  matricula?: string;
  descricaoResumida?: string;
  dataISO: string; // YYYY-MM-DD
  dataFormatted: string; // DD/MM/YYYY
  anexo: {
    nomeArquivo: string;
    tipo: 'imagem' | 'pdf' | 'outro';
    mimeType: string;
    tamanhoFormatted: string;
    dataUrl?: string; // Base64 data string
  };
  criadoPor?: string;
  criadoEm: string;
}

// Minimal valid sample PDF base64 for seeds
const SAMPLE_PDF_BASE64 = 'data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDAKL1R5cGUgL1BhZ2VzCi9Db3VudCAxCi9LaWRzIFsgMyAwIFIgXQo+PgplbmRvYmoKMyAwIG9iago8PAovVHlwZSAvUGFnZQovUGFyZW50IDIgMCBSCi9NZWRpYUJveCBbIDAgMCA2MTIgNzkyIF0KL0NvbnRlbnRzIDQgMCBSCi9SZXNvdXJjZXMgPDwKL0ZvbnQgPDwKL0YxIDUgMCBSCj4+Cj4+Cj4+CmVuZG9iago0IDAgb2JqCjw8Ci9MZW5ndGggNzgKPj4Kc3RyZWFtCkJUCi9GMSAyNCBUZgo1MCA3MDAgVGQKKEZsdXhvZ3JhbWEgZGUgRGVtYW5kYXMgT3BlcmFjaW9uYWlzIC0gQW1iZXYgVW5CIEd1YXJhYmlyYSkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iago1IDAgb2JqCjw8Ci9UeXBlIC9Gb250Ci9TdWJ0eXBlIC9UeXBlMQovQmFzZUZvbnQgL0hlbHZldGljYQo+PgplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAwMDAwIG4gCjAwMDAwMDA1OCAwMDAwMCBuIAowMDAwMDAxMTUgMDAwMDAgbiAKMDAwMDAwMjY3IDAwMDAwIG4gCjAwMDAwMDM5NSAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDYKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjQ3NgolJUVPRg==';

// Sample SVG Image Data URL for graphic flowcharts
const SAMPLE_PNG_BASE64 = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500"><rect width="800" height="500" fill="%230b1222" rx="16"/><rect x="30" y="30" width="740" height="440" rx="16" fill="%23111a30" stroke="%2314b8a6" stroke-width="3"/><text x="400" y="90" font-family="sans-serif" font-size="22" font-weight="900" fill="%2314b8a6" text-anchor="middle">FLUXOGRAMA OPERACIONAL DE DEMANDAS</text><text x="400" y="125" font-family="sans-serif" font-size="14" fill="%2394a3b8" text-anchor="middle">AMBEV UnB GUARABIRA — PROCEDIMENTO DE LOGÍSTICA &amp; DPO</text><g transform="translate(60, 170)"><rect width="200" height="120" rx="12" fill="%231e293b" stroke="%2338bdf8" stroke-width="2"/><text x="100" y="45" font-family="sans-serif" font-size="14" font-weight="bold" fill="%23ffffff" text-anchor="middle">ETAPA 1: TRIAGEM</text><text x="100" y="75" font-family="sans-serif" font-size="11" fill="%23cbd5e1" text-anchor="middle">Separação de Vasilhames</text><text x="100" y="95" font-family="sans-serif" font-size="11" fill="%23cbd5e1" text-anchor="middle">Conferência de Cacos</text></g><path d="M 270 230 L 320 230" stroke="%2338bdf8" stroke-width="4" marker-end="url(%23arr)"/><g transform="translate(330, 170)"><rect width="200" height="120" rx="12" fill="%231e293b" stroke="%23f59e0b" stroke-width="2"/><text x="100" y="45" font-family="sans-serif" font-size="14" font-weight="bold" fill="%23ffffff" text-anchor="middle">ETAPA 2: REPACK</text><text x="100" y="75" font-family="sans-serif" font-size="11" fill="%23cbd5e1" text-anchor="middle">Reembalagem &amp; Palete</text><text x="100" y="95" font-family="sans-serif" font-size="11" fill="%23cbd5e1" text-anchor="middle">Identificação de Lote</text></g><path d="M 540 230 L 590 230" stroke="%23f59e0b" stroke-width="4"/><g transform="translate(600, 170)"><rect width="140" height="120" rx="12" fill="%231e293b" stroke="%2310b981" stroke-width="2"/><text x="70" y="45" font-family="sans-serif" font-size="14" font-weight="bold" fill="%23ffffff" text-anchor="middle">ETAPA 3: EFC</text><text x="70" y="75" font-family="sans-serif" font-size="11" fill="%23cbd5e1" text-anchor="middle">Armazenagem</text><text x="70" y="95" font-family="sans-serif" font-size="11" fill="%23cbd5e1" text-anchor="middle">Picking DPO</text></g><rect x="60" y="340" width="680" height="90" rx="10" fill="%23080d1a" stroke="%23334155"/><text x="80" y="375" font-family="sans-serif" font-size="12" font-weight="bold" fill="%2314b8a6">Checklist DPO de Segurança &amp; Ergonomia:</text><text x="80" y="405" font-family="sans-serif" font-size="11" fill="%2394a3b8">Uso obrigatório de EPIs completos • 3 Pontos de apoio na movimentação • Segregação total pedestre/empilhadeira</text></svg>`;

// Helper function to convert dataURL/base64 to a Blob Object URL reliably
const getBlobUrlFromDataUrl = (dataUrl?: string): string | null => {
  if (!dataUrl) return null;
  try {
    if (dataUrl.startsWith('blob:')) return dataUrl;
    const parts = dataUrl.split(',');
    if (parts.length < 2) return null;
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    const blob = new Blob([u8arr], { type: mime });
    return URL.createObjectURL(blob);
  } catch (e) {
    console.warn('Error converting dataUrl to Blob:', e);
    return null;
  }
};

// Helper function to open PDF in new tab cleanly
const openPdfInNewTab = (dataUrl?: string, fileName?: string) => {
  const urlToUse = dataUrl || SAMPLE_PDF_BASE64;
  try {
    const blobUrl = getBlobUrlFromDataUrl(urlToUse);
    if (blobUrl) {
      const win = window.open(blobUrl, '_blank');
      if (!win) {
        // Fallback: direct download link trigger if popup was blocked
        const link = document.createElement('a');
        link.href = blobUrl;
        link.target = '_blank';
        link.download = fileName || 'fluxograma.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  } catch (err) {
    console.warn('Failed to open PDF in new tab:', err);
  }
};

interface FluxogramaDemandasComponentProps {
  user: any;
  empresaId?: string;
}

export const FluxogramaDemandasComponent: React.FC<FluxogramaDemandasComponentProps> = ({
  user,
  empresaId = 'demo'
}) => {
  const currentUserName = user?.nome || 'Usuário Operacional';

  // Seed default flowcharts if empty
  const [fluxogramas, setFluxogramas] = useState<FluxogramaColaborador[]>(() => {
    try {
      const saved = localStorage.getItem(`fluxogramas_demandas_list_${empresaId}`);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }

    const today = new Date().toISOString().split('T')[0];
    const todayParts = today.split('-');
    const todayFmt = `${todayParts[2]}/${todayParts[1]}/${todayParts[0]}`;

    return [
      {
        id: 'fluxo-seed-1',
        nomeColaborador: 'JOSE RONILDO DA SILVA',
        cargoOuFuncao: 'OPERADOR DE EMPILHADEIRA',
        matricula: 'G1009',
        descricaoResumida: 'Mapeamento de Rotas e Fluxo de Abastecimento EFC/EFD e Pulmões de Picking.',
        dataISO: today,
        dataFormatted: todayFmt,
        anexo: {
          nomeArquivo: 'Fluxo_Operacao_Empilhadeira_Ronildo.pdf',
          tipo: 'pdf',
          mimeType: 'application/pdf',
          tamanhoFormatted: '420 KB',
          dataUrl: SAMPLE_PDF_BASE64
        },
        criadoPor: 'Coordenação de Logística',
        criadoEm: new Date().toISOString()
      },
      {
        id: 'fluxo-seed-2',
        nomeColaborador: 'GLADSON LISBOA DOS SANTOS',
        cargoOuFuncao: 'AJUDANTE DE ARMAZEM',
        matricula: 'G1160',
        descricaoResumida: 'Fluxo de Triagem de Cacos e Separação de Vasilhames Retornáveis no Despejo.',
        dataISO: today,
        dataFormatted: todayFmt,
        anexo: {
          nomeArquivo: 'Fluxograma_Despejo_Triagem_Gladson.png',
          tipo: 'imagem',
          mimeType: 'image/png',
          tamanhoFormatted: '1.2 MB',
          dataUrl: SAMPLE_PNG_BASE64
        },
        criadoPor: 'Supervisor DPO',
        criadoEm: new Date().toISOString()
      },
      {
        id: 'fluxo-seed-3',
        nomeColaborador: 'GILSON ROSA DA SILVA',
        cargoOuFuncao: 'CONFERNTE',
        matricula: 'G1093',
        descricaoResumida: 'Procedimento Operacional Padronizado de Conferência Física e Leitura de Carretas.',
        dataISO: today,
        dataFormatted: todayFmt,
        anexo: {
          nomeArquivo: 'Fluxograma_Conferencia_Carretas_Gilson.pdf',
          tipo: 'pdf',
          mimeType: 'application/pdf',
          tamanhoFormatted: '580 KB',
          dataUrl: SAMPLE_PDF_BASE64
        },
        criadoPor: 'Controle de Armazém',
        criadoEm: new Date().toISOString()
      }
    ];
  });

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [funcaoFiltro, setFuncaoFiltro] = useState<string>('todos');

  // Modal State for Upload / Edit
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [selectedMatricula, setSelectedMatricula] = useState<string>('');
  const [nomeColaborador, setNomeColaborador] = useState<string>('');
  const [cargoOuFuncao, setCargoOuFuncao] = useState<string>('');
  const [matricula, setMatricula] = useState<string>('');
  const [descricaoResumida, setDescricaoResumida] = useState<string>('');
  const [anexoFile, setAnexoFile] = useState<{
    nomeArquivo: string;
    tipo: 'imagem' | 'pdf' | 'outro';
    mimeType: string;
    tamanhoFormatted: string;
    dataUrl?: string;
  } | null>(null);

  // Modal Viewer State for Previewing Document / Image
  const [previewDoc, setPreviewDoc] = useState<FluxogramaColaborador | null>(null);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sync with Firestore
  useEffect(() => {
    const fetchFluxogramasFirestore = async () => {
      if (!db) return;
      try {
        const colRef = collection(db, 'fluxogramas_demandas_colaboradores');
        const snap = await getDocs(colRef);
        if (!snap.empty) {
          const list: FluxogramaColaborador[] = [];
          snap.forEach(d => list.push({ id: d.id, ...d.data() } as FluxogramaColaborador));
          if (list.length > 0) {
            setFluxogramas(list);
            localStorage.setItem(`fluxogramas_demandas_list_${empresaId}`, JSON.stringify(list));
          }
        }
      } catch (err) {
        console.warn('Firestore fetch fallback for Fluxograma de Demandas:', err);
      }
    };

    fetchFluxogramasFirestore();
  }, [empresaId]);

  const saveToStorageAndFirestore = async (newList: FluxogramaColaborador[], itemToSave?: FluxogramaColaborador, deleteId?: string) => {
    setFluxogramas(newList);
    localStorage.setItem(`fluxogramas_demandas_list_${empresaId}`, JSON.stringify(newList));

    if (db) {
      try {
        if (itemToSave) {
          await setDoc(doc(db, 'fluxogramas_demandas_colaboradores', itemToSave.id), itemToSave);
        }
        if (deleteId) {
          await deleteDoc(doc(db, 'fluxogramas_demandas_colaboradores', deleteId));
        }
      } catch (e) {
        console.warn('Firestore sync error for Fluxograma:', e);
      }
    }
  };

  // Handle preset selection from official collaborators list
  const handleSelectOfficialColab = (mat: string) => {
    setSelectedMatricula(mat);
    if (!mat) return;
    const found = LISTA_COLABORADORES_OFICIAIS.find(c => c.matricula === mat);
    if (found) {
      setNomeColaborador(found.nome);
      setCargoOuFuncao(found.cargo);
      setMatricula(found.matricula);
    }
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    setSelectedMatricula('');
    setNomeColaborador('');
    setCargoOuFuncao('Operador de Armazém');
    setMatricula('');
    setDescricaoResumida('');
    setAnexoFile(null);
    setShowModal(true);
  };

  const handleEdit = (item: FluxogramaColaborador) => {
    setEditingId(item.id);
    const found = LISTA_COLABORADORES_OFICIAIS.find(c => c.nome.toLowerCase() === item.nomeColaborador.toLowerCase() || c.matricula === item.matricula);
    setSelectedMatricula(found?.matricula || '');
    setNomeColaborador(item.nomeColaborador);
    setCargoOuFuncao(item.cargoOuFuncao);
    setMatricula(item.matricula || '');
    setDescricaoResumida(item.descricaoResumida || '');
    setAnexoFile(item.anexo);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja realmente remover o fluxograma deste colaborador?')) {
      const updated = fluxogramas.filter(f => f.id !== id);
      saveToStorageAndFirestore(updated, undefined, id);
      showToast('Fluxograma removido com sucesso!');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const sizeMb = file.size / (1024 * 1024);
      const sizeFormatted = sizeMb >= 1 ? `${sizeMb.toFixed(1)} MB` : `${Math.round(file.size / 1024)} KB`;
      const isPdf = file.type.includes('pdf') || file.name.endsWith('.pdf');
      const isImg = file.type.includes('image') || /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(file.name);

      setAnexoFile({
        nomeArquivo: file.name,
        tipo: isPdf ? 'pdf' : isImg ? 'imagem' : 'outro',
        mimeType: file.type || (isPdf ? 'application/pdf' : 'image/png'),
        tamanhoFormatted: sizeFormatted,
        dataUrl
      });
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeColaborador.trim()) {
      alert('Por favor, informe o nome do colaborador.');
      return;
    }
    if (!anexoFile) {
      alert('Por favor, faça o upload da imagem ou arquivo PDF com o fluxograma/demanda.');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const todayParts = today.split('-');
    const todayFmt = `${todayParts[2]}/${todayParts[1]}/${todayParts[0]}`;

    const idToUse = editingId || `fluxo-${Date.now()}`;
    const newItem: FluxogramaColaborador = {
      id: idToUse,
      nomeColaborador: nomeColaborador.trim(),
      cargoOuFuncao: cargoOuFuncao.trim() || 'Operador',
      matricula: matricula.trim(),
      descricaoResumida: descricaoResumida.trim(),
      dataISO: today,
      dataFormatted: todayFmt,
      anexo: anexoFile,
      criadoPor: currentUserName,
      criadoEm: new Date().toISOString()
    };

    let updatedList: FluxogramaColaborador[];
    if (editingId) {
      updatedList = fluxogramas.map(f => f.id === editingId ? newItem : f);
    } else {
      updatedList = [newItem, ...fluxogramas];
    }

    saveToStorageAndFirestore(updatedList, newItem);
    setShowModal(false);
    showToast(editingId ? 'Fluxograma atualizado com sucesso!' : `Fluxograma cadastrado para ${newItem.nomeColaborador}!`);
  };

  const handleDownloadOrOpen = (item: FluxogramaColaborador) => {
    const isPdf = item.anexo.tipo === 'pdf' || item.anexo.nomeArquivo.endsWith('.pdf');
    const dataUrlToUse = item.anexo.dataUrl || (isPdf ? SAMPLE_PDF_BASE64 : SAMPLE_PNG_BASE64);

    try {
      const blobUrl = getBlobUrlFromDataUrl(dataUrlToUse);
      const link = document.createElement('a');
      link.href = blobUrl || dataUrlToUse;
      link.download = item.anexo.nomeArquivo;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.warn('Erro ao fazer download do anexo:', err);
    }
  };

  // Filter Logic
  const fluxogramasFiltrados = useMemo(() => {
    return fluxogramas.filter(f => {
      if (funcaoFiltro !== 'todos') {
        const cargoL = f.cargoOuFuncao.toLowerCase();
        if (funcaoFiltro === 'ajudante' && !cargoL.includes('ajudante') && !cargoL.includes('auxiliar')) return false;
        if (funcaoFiltro === 'empilhador' && !cargoL.includes('empilhadeira') && !cargoL.includes('operador de empilhadeira')) return false;
        if (funcaoFiltro === 'conferente' && !cargoL.includes('conferente') && !cargoL.includes('assistente')) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match = f.nomeColaborador.toLowerCase().includes(q) ||
                      f.cargoOuFuncao.toLowerCase().includes(q) ||
                      (f.matricula && f.matricula.toLowerCase().includes(q)) ||
                      (f.descricaoResumida && f.descricaoResumida.toLowerCase().includes(q)) ||
                      f.anexo.nomeArquivo.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [fluxogramas, funcaoFiltro, searchQuery]);

  return (
    <div className="space-y-6">

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-teal-500 text-slate-950 font-black px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-teal-300 animate-bounce">
          <Sparkles className="w-5 h-5 text-slate-950" />
          <span className="text-xs">{toastMessage}</span>
        </div>
      )}

      {/* 🚀 CABEÇALHO DO FLUXOGRAMA DE DEMANDAS */}
      <div className="bg-[#111a30] border border-teal-500/30 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-3 bg-teal-500/20 border border-teal-500/30 rounded-xl text-teal-400 shrink-0">
            <GitFork className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-widest text-teal-400 bg-teal-500/10 px-2.5 py-0.5 rounded-full border border-teal-500/20">
                WORKSTATION OPERACIONAL
              </span>
              <span className="text-[10px] text-slate-300 font-mono">ETAPA 5 — REPOSITÓRIO VISUAL</span>
            </div>
            <h2 className="text-lg font-black text-white mt-1 uppercase tracking-tight">
              Fluxograma de Demandas por Colaborador
            </h2>
            <p className="text-xs text-slate-300 leading-snug max-w-2xl">
              Repositório visual de "quem faz o quê". Cadastre cada colaborador com o seu fluxograma em imagem ou PDF. Consultável de forma simples e rápida por toda a equipe.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" /> Cadastrar Fluxograma
        </button>
      </div>

      {/* PAINEL DE BUSCA E FILTROS */}
      <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={funcaoFiltro}
              onChange={(e) => setFuncaoFiltro(e.target.value)}
              className="w-full sm:w-56 bg-[#0b1222] border border-slate-700 rounded-xl p-2 text-xs font-bold text-white outline-none focus:border-teal-400"
            >
              <option value="todos">Todas as Funções Operacionais</option>
              <option value="ajudante">Ajudantes de Armazém</option>
              <option value="empilhador">Operadores de Empilhadeira</option>
              <option value="conferente">Conferentes & Assistentes</option>
            </select>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por colaborador, matrícula ou função..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0b1222] border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white outline-none focus:border-teal-400"
            />
          </div>

        </div>
      </div>

      {/* GRID DE CARDS COM OS FLUXOGRAMAS ANEXADOS POR COLABORADOR */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-teal-400" />
            Colaboradores Cadastrados ({fluxogramasFiltrados.length})
          </h3>
          <span className="text-[11px] text-slate-400 font-mono">
            Consultável por qualquer integrante do time
          </span>
        </div>

        {fluxogramasFiltrados.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fluxogramasFiltrados.map((item) => {
              const isPdf = item.anexo.tipo === 'pdf' || item.anexo.nomeArquivo.endsWith('.pdf');

              return (
                <div
                  key={item.id}
                  className="bg-[#111a30] border border-slate-800 hover:border-teal-500/50 rounded-2xl p-5 space-y-4 transition-all flex flex-col justify-between shadow-xl"
                >
                  <div className="space-y-3">
                    
                    {/* CABEÇALHO DO COLABORADOR */}
                    <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-teal-500/10 border border-teal-500/20 rounded-xl text-teal-400 shrink-0 font-mono text-xs font-black">
                          {item.matricula || 'COLAB'}
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-white uppercase tracking-tight leading-snug">
                            {item.nomeColaborador}
                          </h4>
                          <span className="text-[10px] font-bold text-teal-400 block uppercase">
                            {item.cargoOuFuncao}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEdit(item)}
                          className="p-1.5 text-slate-400 hover:text-teal-400 cursor-pointer bg-slate-800/60 rounded-lg"
                          title="Editar Fluxograma"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 cursor-pointer bg-slate-800/60 rounded-lg"
                          title="Excluir Fluxograma"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* DESCRIÇÃO / NOTAS */}
                    {item.descricaoResumida && (
                      <p className="text-xs text-slate-300 bg-[#080d1a] p-2.5 rounded-xl border border-slate-800/80 leading-relaxed">
                        "{item.descricaoResumida}"
                      </p>
                    )}

                    {/* PREVIEW DO ANEXO (SE FOR IMAGEM BASE64) */}
                    <div className="bg-[#080d1a] rounded-xl border border-slate-800 p-3 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-300">
                        <span className="font-mono flex items-center gap-1.5 truncate pr-2">
                          {isPdf ? (
                            <FileText className="w-4 h-4 text-rose-400 shrink-0" />
                          ) : (
                            <ImageIcon className="w-4 h-4 text-purple-400 shrink-0" />
                          )}
                          <span className="truncate font-bold">{item.anexo.nomeArquivo}</span>
                        </span>
                        <span className="text-[9px] font-mono text-slate-400 shrink-0">
                          {item.anexo.tamanhoFormatted}
                        </span>
                      </div>

                      {/* TUMBNAIL DE IMAGEM CASO SEJA BASE64 */}
                      {!isPdf && item.anexo.dataUrl && (
                        <div 
                          onClick={() => setPreviewDoc(item)}
                          className="relative rounded-lg overflow-hidden border border-slate-800 max-h-36 bg-black/40 group cursor-pointer"
                        >
                          <img
                            src={item.anexo.dataUrl}
                            alt={item.anexo.nomeArquivo}
                            className="w-full h-32 object-cover group-hover:scale-105 transition-all"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-1 text-white font-bold text-xs">
                            <Eye className="w-4 h-4" /> Visualizar Ampliado
                          </div>
                        </div>
                      )}
                    </div>

                  </div>

                  {/* BOTOES DE AÇÃO — VISUALIZAR E DOWNLOAD */}
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[9px] text-slate-500 font-mono">
                      Cadastrado em: {item.dataFormatted}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewDoc(item)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1.5 transition-all"
                      >
                        <Eye className="w-3.5 h-3.5 text-teal-400" /> Consultar
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadOrOpen(item)}
                        className="px-3 py-1.5 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/30 text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1.5 transition-all"
                        title="Baixar Arquivo Anexo"
                      >
                        <Download className="w-3.5 h-3.5" /> Baixar
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-10 text-center space-y-3 bg-[#0b1222] border border-slate-800 rounded-2xl">
            <GitFork className="w-10 h-10 text-slate-600 mx-auto" />
            <h4 className="text-sm font-bold text-slate-300">Nenhum fluxograma de colaborador encontrado</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Nenhum fluxograma cadastrado para os filtros atuais. Clique no botão "Cadastrar Fluxograma" acima para anexar a imagem ou PDF com as demandas do colaborador.
            </p>
          </div>
        )}
      </div>

      {/* MODAL DE CADASTRO / EDIÇÃO DE FLUXOGRAMA */}
      {showModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveForm} className="bg-[#111a30] border-2 border-teal-500/50 rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-2xl">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black uppercase text-white flex items-center gap-2">
                <GitFork className="w-4 h-4 text-teal-400" />
                {editingId ? 'Editar Fluxograma de Colaborador' : 'Novo Fluxograma de Demanda'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SELETOR DE COLABORADOR DA BASE OFICIAL */}
            <div>
              <label className="block text-[10px] font-black uppercase text-teal-400 mb-1">
                Selecionar Colaborador da Base (ou digitar abaixo)
              </label>
              <select
                value={selectedMatricula}
                onChange={(e) => handleSelectOfficialColab(e.target.value)}
                className="w-full bg-[#0b1222] border border-slate-700 rounded-xl p-2.5 text-xs font-bold text-white outline-none focus:border-teal-400"
              >
                <option value="">-- Selecionar da Lista Oficial ou Digitar Personalizado --</option>
                {LISTA_COLABORADORES_OFICIAIS.map(c => (
                  <option key={c.matricula} value={c.matricula}>
                    [{c.matricula}] {c.nome} — {c.cargo}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Nome do Colaborador *</label>
                <input
                  type="text"
                  placeholder="Ex: GLADSON LISBOA DOS SANTOS"
                  value={nomeColaborador}
                  onChange={(e) => setNomeColaborador(e.target.value)}
                  className="w-full bg-[#0b1222] border border-slate-700 rounded-xl p-2 text-xs font-bold text-white outline-none focus:border-teal-400"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Cargo / Função *</label>
                <input
                  type="text"
                  placeholder="Ex: OPERADOR DE EMPILHADEIRA"
                  value={cargoOuFuncao}
                  onChange={(e) => setCargoOuFuncao(e.target.value)}
                  className="w-full bg-[#0b1222] border border-slate-700 rounded-xl p-2 text-xs font-bold text-white outline-none focus:border-teal-400"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Matrícula (Opcional)</label>
              <input
                type="text"
                placeholder="Ex: G1009"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                className="w-full bg-[#0b1222] border border-slate-700 rounded-xl p-2 text-xs font-mono text-white outline-none focus:border-teal-400"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Descrição do Fluxo / Observações</label>
              <textarea
                rows={2}
                placeholder="Resumo do fluxo de trabalho, demandas do turno ou observações operacionais..."
                value={descricaoResumida}
                onChange={(e) => setDescricaoResumida(e.target.value)}
                className="w-full bg-[#0b1222] border border-slate-700 rounded-xl p-2 text-xs text-white outline-none focus:border-teal-400 resize-none"
              />
            </div>

            {/* SEÇÃO DE UPLOAD DO ANEXO (IMAGEM OU PDF) */}
            <div className="space-y-2 border-t border-slate-800 pt-3">
              <label className="block text-[10px] font-black uppercase text-teal-400">
                Upload de Imagem ou PDF com o Fluxo/Demanda *
              </label>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*,.pdf"
                className="hidden"
              />

              {anexoFile ? (
                <div className="flex items-center justify-between bg-[#0b1222] p-3 rounded-xl border border-teal-500/40">
                  <div className="flex items-center gap-2 truncate pr-2">
                    {anexoFile.tipo === 'pdf' ? (
                      <FileText className="w-5 h-5 text-rose-400 shrink-0" />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-purple-400 shrink-0" />
                    )}
                    <div>
                      <span className="text-xs font-mono font-bold text-white block truncate">{anexoFile.nomeArquivo}</span>
                      <span className="text-[10px] font-mono text-slate-400 block">{anexoFile.tamanhoFormatted}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setAnexoFile(null)}
                    className="p-1 text-slate-400 hover:text-rose-400 cursor-pointer"
                    title="Remover anexo"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-5 border-2 border-dashed border-slate-700 hover:border-teal-400/80 rounded-xl text-center cursor-pointer bg-[#0b1222]/60 space-y-2 transition-all"
                >
                  <Upload className="w-6 h-6 text-teal-400 mx-auto" />
                  <div>
                    <p className="text-xs font-bold text-white">Clique para selecionar Imagem (.png, .jpg) ou PDF (.pdf)</p>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Anexe o organograma ou mapa de fluxo do colaborador</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold uppercase cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl text-xs font-black uppercase shadow-lg cursor-pointer"
              >
                Salvar Fluxograma
              </button>
            </div>

          </form>
        </div>
      )}

      {/* MODAL DE VISUALIZAÇÃO AMPLIADA DO FLUXOGRAMA */}
      {previewDoc && (() => {
        const isPdf = previewDoc.anexo.tipo === 'pdf' || previewDoc.anexo.nomeArquivo.endsWith('.pdf');
        const pdfDataUrl = previewDoc.anexo.dataUrl || SAMPLE_PDF_BASE64;
        const blobUrl = getBlobUrlFromDataUrl(pdfDataUrl);

        return (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="bg-[#111a30] border-2 border-teal-500/50 rounded-2xl p-6 w-full max-w-4xl max-h-[92vh] flex flex-col space-y-4 shadow-2xl">
              
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] font-black uppercase text-teal-400 block font-mono">
                    [{previewDoc.matricula || 'COLAB'}] — {previewDoc.cargoOuFuncao}
                  </span>
                  <h3 className="text-base font-black uppercase text-white flex items-center gap-2">
                    <GitFork className="w-5 h-5 text-teal-400" />
                    Fluxograma de Demandas — {previewDoc.nomeColaborador}
                  </h3>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isPdf && (
                    <button
                      type="button"
                      onClick={() => openPdfInNewTab(pdfDataUrl, previewDoc.anexo.nomeArquivo)}
                      className="px-3.5 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs uppercase rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-md"
                      title="Abrir PDF diretamente em uma nova guia"
                    >
                      <ExternalLink className="w-4 h-4" /> Abrir em Nova Aba
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDownloadOrOpen(previewDoc)}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase rounded-xl flex items-center gap-1.5 cursor-pointer border border-slate-700"
                    title="Baixar arquivo"
                  >
                    <Download className="w-4 h-4 text-teal-400" /> Baixar
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDoc(null)}
                    className="p-2 text-slate-400 hover:text-white cursor-pointer rounded-xl bg-slate-800 border border-slate-700 hover:border-slate-600"
                    title="Fechar Visualizador"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {previewDoc.descricaoResumida && (
                <div className="bg-[#0b1222] p-3 rounded-xl border border-slate-800 text-xs text-slate-200">
                  <strong className="text-teal-400">Observações do Fluxo:</strong> {previewDoc.descricaoResumida}
                </div>
              )}

              {/* ÁREA DE VISUALIZAÇÃO DO DOCUMENTO OU IMAGEM */}
              <div className="flex-1 bg-[#080d1a] border border-slate-800 rounded-xl overflow-hidden p-2 flex items-center justify-center min-h-[420px]">
                {isPdf ? (
                  <object
                    data={blobUrl || pdfDataUrl}
                    type="application/pdf"
                    className="w-full h-[520px] rounded-lg border border-slate-800 bg-[#0b1222]"
                  >
                    {/* FALLBACK QUANDO O NAVEGADOR BLOQUEIA VISUALIZAÇÃO DE PDF EM IFRAME */}
                    <div className="p-8 text-center space-y-4 bg-[#0b1222] border border-slate-800 rounded-xl max-w-lg mx-auto my-auto">
                      <div className="w-16 h-16 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                        <FileText className="w-8 h-8" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-base font-black text-white uppercase">{previewDoc.anexo.nomeArquivo}</h4>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Visualizador interno do navegador ativo. Clique no botão abaixo para abrir ou baixar o documento PDF em tela cheia sem restrições.
                        </p>
                        <span className="text-[10px] font-mono text-slate-400 block pt-1">
                          Tamanho: {previewDoc.anexo.tamanhoFormatted} • Registrado em: {previewDoc.dataFormatted}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => openPdfInNewTab(pdfDataUrl, previewDoc.anexo.nomeArquivo)}
                          className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs uppercase rounded-xl flex items-center gap-2 shadow-lg cursor-pointer"
                        >
                          <ExternalLink className="w-4 h-4" /> Abrir PDF em Nova Aba
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadOrOpen(previewDoc)}
                          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase rounded-xl flex items-center gap-2 cursor-pointer border border-slate-700"
                        >
                          <Download className="w-4 h-4 text-teal-400" /> Baixar PDF
                        </button>
                      </div>
                    </div>
                  </object>
                ) : (
                  <img
                    src={previewDoc.anexo.dataUrl || SAMPLE_PNG_BASE64}
                    alt={previewDoc.anexo.nomeArquivo}
                    className="max-w-full max-h-[500px] object-contain rounded-lg shadow-2xl"
                  />
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                <span>Cadastrado por: <strong className="text-slate-200">{previewDoc.criadoPor || 'Sistema'}</strong></span>
                <span>Data de Registro: <strong className="text-slate-200">{previewDoc.dataFormatted}</strong></span>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
};
