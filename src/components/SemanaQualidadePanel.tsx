import React, { useState, useEffect, useMemo } from 'react';
import { Usuario } from '../types';
import { 
  Award, 
  Calendar, 
  CheckCircle2, 
  FileText, 
  Plus, 
  Upload, 
  Download, 
  Trash2, 
  Edit3, 
  HelpCircle, 
  UserCheck, 
  AlertCircle, 
  Search, 
  FileSpreadsheet, 
  X, 
  Save, 
  Check, 
  Clock, 
  Send, 
  BarChart3, 
  ShieldCheck, 
  Paperclip, 
  Sparkles, 
  ChevronRight, 
  Eye,
  Filter,
  Users
} from 'lucide-react';
import { safeGetLocalStorage, safeSetLocalStorage } from '../utils/safeLocalStorage';
import { LISTA_COLABORADORES_OFICIAIS } from './RankingModule';

export interface DocumentoQualidade {
  id: string;
  nomeArquivo: string;
  tipo: 'pdf' | 'excel' | 'word' | 'imagem' | 'outros';
  categoria: 'Apresentação / Slides' | 'Ata Assinada (PDF)' | 'Material Didático / Apostila' | 'Outros';
  tamanhoKb: number;
  dataUrl: string;
  criadoEm: string;
  criadoPor: string;
}

export interface PerguntaCheckRetencao {
  id: string;
  enunciado: string;
  tipo: 'multipla_escolha' | 'dissertativa';
  opcoes?: string[];
  opcaoCorretaIdx?: number;
  peso: number;
}

export interface RespostaCheckRetencao {
  id: string;
  matricula: string;
  nomeColaborador: string;
  cargo: string;
  dataHora: string;
  respostas: { perguntaId: string; respostaTexto: string; opcaoEscolhidaIdx?: number }[];
  notaPercentual: number;
}

export interface SemanaQualidadeEdicao {
  id: string;
  anoEdicao: string;
  titulo: string;
  dataInicio: string;
  dataFim: string;
  temaCentral: string;
  observacoes: string;
  responsavel: string;
  status: 'ativa' | 'concluida' | 'planejamento';
  materiais: DocumentoQualidade[];
  atasAssinadas: DocumentoQualidade[];
  perguntasForm: PerguntaCheckRetencao[];
  respostasForm: RespostaCheckRetencao[];
  criadoEm: string;
}

const DEFAULT_EDICAO_2026: SemanaQualidadeEdicao = {
  id: 'sq-2026',
  anoEdicao: '2026',
  titulo: 'Semana da Qualidade 2026 - Pilar Armazém & Zero Avarias',
  dataInicio: '2026-08-10',
  dataFim: '2026-08-14',
  temaCentral: 'Cultura DPO, Padrões Operacionais (POP), Segurança e Garantia de Qualidade de Estoque',
  observacoes: 'Evento anual oficial de capacitação dos times de Armazém, Conferência, Movimentação e Entrega.',
  responsavel: 'Supervisão de Qualidade & Controle',
  status: 'ativa',
  materiais: [
    {
      id: 'mat-1',
      nomeArquivo: 'Apresentacao_Semana_Qualidade_2026_DPO.pdf',
      tipo: 'pdf',
      categoria: 'Apresentação / Slides',
      tamanhoKb: 2450,
      dataUrl: '#',
      criadoEm: '10/08/2026 08:00',
      criadoPor: 'Supervisão de Qualidade'
    },
    {
      id: 'mat-2',
      nomeArquivo: 'Guia_Pratico_Prevencao_Avarias_Picking.pdf',
      tipo: 'pdf',
      categoria: 'Material Didático / Apostila',
      tamanhoKb: 1280,
      dataUrl: '#',
      criadoEm: '10/08/2026 08:30',
      criadoPor: 'Controle de Armazém'
    }
  ],
  atasAssinadas: [], // Initially empty to show pending alert
  perguntasForm: [
    {
      id: 'p1',
      enunciado: 'Qual é a regra obrigatória para etiquetagem de identificação de palete (NRI)?',
      tipo: 'multipla_escolha',
      opcoes: [
        'Apenas 1 lado frontal do palete',
        '3 lados do palete (Lado A, Lado B e Frente) visíveis para a empilhadeira',
        'Somente na nota fiscal física anexada',
        'Não há obrigatoriedade no pátio'
      ],
      opcaoCorretaIdx: 1,
      peso: 25
    },
    {
      id: 'p2',
      enunciado: 'No gerenciamento de estoque FEFO, qual palete deve ser coletado prioritariamente no Picking?',
      tipo: 'multipla_escolha',
      opcoes: [
        'O palete que estiver mais próximo da porta do armazém',
        'O palete com vencimento mais distante para durar mais',
        'O produto de lote com data de vencimento mais próxima (First Expire, First Out)',
        'Qualquer palete que a empilhadeira alcançar primeiro'
      ],
      opcaoCorretaIdx: 2,
      peso: 25
    },
    {
      id: 'p3',
      enunciado: 'Em caso de detecção de vazamento ou avaria de produto no armazém, qual é o procedimento imediato?',
      tipo: 'multipla_escolha',
      opcoes: [
        'Deixar o palete no local e avisar no final do turno',
        'Isolar a área, fotografar, registrar a quebra/despejo e encaminhar ao Repack',
        'Carregar o produto no caminhão para não travar a meta',
        'Descartar no lixo comum sem apontamento'
      ],
      opcaoCorretaIdx: 1,
      peso: 25
    },
    {
      id: 'p4',
      enunciado: 'Descreva resumidamente o que você aprendeu nesta Semana da Qualidade sobre prevenção de acidentes e uso de EPIs no Armazém:',
      tipo: 'dissertativa',
      peso: 25
    }
  ],
  respostasForm: [
    {
      id: 'resp-1',
      matricula: '101',
      nomeColaborador: 'Carlos Eduardo Oliveira',
      cargo: 'Operador de Empilhadeira',
      dataHora: '10/08/2026 09:15',
      respostas: [
        { perguntaId: 'p1', respostaTexto: '3 lados do palete', opcaoEscolhidaIdx: 1 },
        { perguntaId: 'p2', respostaTexto: 'O produto com vencimento mais próximo', opcaoEscolhidaIdx: 2 },
        { perguntaId: 'p3', respostaTexto: 'Isolar e encaminhar ao Repack', opcaoEscolhidaIdx: 1 },
        { perguntaId: 'p4', respostaTexto: 'Importância de checar freios da empilhadeira, respeitar velocidade nas ruas de acesso e usar cinto e botas.' }
      ],
      notaPercentual: 100
    }
  ],
  criadoEm: '01/08/2026'
};

interface SemanaQualidadePanelProps {
  user: Usuario;
  theme?: 'light' | 'dark';
}

export default function SemanaQualidadePanel({
  user,
  theme = 'dark'
}: SemanaQualidadePanelProps) {
  const isDark = theme !== 'light';
  const isManager = user.papel === 'admin' || user.papel === 'controle' || user.isControle || 
                    (user.cargo && (user.cargo.toLowerCase().includes('supervisor') || user.cargo.toLowerCase().includes('gestor') || user.cargo.toLowerCase().includes('qualidade')));

  const [edicoes, setEdicoes] = useState<SemanaQualidadeEdicao[]>([]);
  const [activeEdicaoId, setActiveEdicaoId] = useState<string>('sq-2026');
  const [activeTab, setActiveTab] = useState<'evento' | 'material' | 'atas' | 'form_responder' | 'respostas_painel'>('evento');

  // Modal states
  const [isEdicaoModalOpen, setIsEdicaoModalOpen] = useState(false);
  const [isPerguntaModalOpen, setIsPerguntaModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<'Apresentação / Slides' | 'Ata Assinada (PDF)' | 'Material Didático / Apostila' | 'Outros'>('Apresentação / Slides');

  // Form states for Edition
  const [formAno, setFormAno] = useState('2026');
  const [formTitulo, setFormTitulo] = useState('');
  const [formDataInicio, setFormDataInicio] = useState('');
  const [formDataFim, setFormDataFim] = useState('');
  const [formTema, setFormTema] = useState('');
  const [formObs, setFormObs] = useState('');
  const [formResponsavel, setFormResponsavel] = useState('');

  // Form states for Question Builder
  const [formEnunciado, setFormEnunciado] = useState('');
  const [formTipoPergunta, setFormTipoPergunta] = useState<'multipla_escolha' | 'dissertativa'>('multipla_escolha');
  const [formOpcoes, setFormOpcoes] = useState<string[]>(['', '', '', '']);
  const [formOpcaoCorreta, setFormOpcaoCorreta] = useState<number>(0);

  // Form states for Collaborator Response
  const [selectedColabMatricula, setSelectedColabMatricula] = useState<string>(user.matricula || '101');
  const [colabAnswers, setColabAnswers] = useState<Record<string, { opcaoIdx?: number; texto?: string }>>({});
  const [searchFilter, setSearchFilter] = useState('');

  // Load editions
  useEffect(() => {
    const saved = safeGetLocalStorage<SemanaQualidadeEdicao[]>('af_semana_qualidade_edicoes_v1', [DEFAULT_EDICAO_2026]);
    if (saved && Array.isArray(saved) && saved.length > 0) {
      setEdicoes(saved);
      setActiveEdicaoId(saved[0].id);
    } else {
      setEdicoes([DEFAULT_EDICAO_2026]);
      safeSetLocalStorage('af_semana_qualidade_edicoes_v1', [DEFAULT_EDICAO_2026]);
    }
  }, []);

  const saveEdicoesToStorage = (updated: SemanaQualidadeEdicao[]) => {
    setEdicoes(updated);
    safeSetLocalStorage('af_semana_qualidade_edicoes_v1', updated);
  };

  const currentEdicao = useMemo(() => {
    return edicoes.find(e => e.id === activeEdicaoId) || edicoes[0] || DEFAULT_EDICAO_2026;
  }, [edicoes, activeEdicaoId]);

  // Handle Save / Edit Edition
  const handleOpenEditEdicao = () => {
    if (!currentEdicao) return;
    setFormAno(currentEdicao.anoEdicao);
    setFormTitulo(currentEdicao.titulo);
    setFormDataInicio(currentEdicao.dataInicio);
    setFormDataFim(currentEdicao.dataFim);
    setFormTema(currentEdicao.temaCentral);
    setFormObs(currentEdicao.observacoes);
    setFormResponsavel(currentEdicao.responsavel);
    setIsEdicaoModalOpen(true);
  };

  const handleOpenNewEdicao = () => {
    const nextYear = new Date().getFullYear().toString();
    setFormAno(nextYear);
    setFormTitulo(`Semana da Qualidade ${nextYear}`);
    setFormDataInicio(`${nextYear}-08-10`);
    setFormDataFim(`${nextYear}-08-14`);
    setFormTema('Cultura de Excelência Operacional, DPO e Qualidade de Estoque');
    setFormObs('');
    setFormResponsavel(user.nome || 'Supervisão de Qualidade');
    setIsEdicaoModalOpen(true);
  };

  const handleSaveEdicaoModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitulo.trim()) {
      alert('Por favor, preencha o título da edição.');
      return;
    }

    const existingIndex = edicoes.findIndex(e => e.id === activeEdicaoId);
    let updatedList: SemanaQualidadeEdicao[];

    if (existingIndex >= 0 && isEdicaoModalOpen && currentEdicao.id === activeEdicaoId) {
      updatedList = edicoes.map(ed => {
        if (ed.id === activeEdicaoId) {
          return {
            ...ed,
            anoEdicao: formAno,
            titulo: formTitulo.trim(),
            dataInicio: formDataInicio,
            dataFim: formDataFim,
            temaCentral: formTema.trim(),
            observacoes: formObs.trim(),
            responsavel: formResponsavel.trim()
          };
        }
        return ed;
      });
    } else {
      const newEd: SemanaQualidadeEdicao = {
        id: 'sq-' + Date.now(),
        anoEdicao: formAno,
        titulo: formTitulo.trim(),
        dataInicio: formDataInicio,
        dataFim: formDataFim,
        temaCentral: formTema.trim(),
        observacoes: formObs.trim(),
        responsavel: formResponsavel.trim(),
        status: 'ativa',
        materiais: [],
        atasAssinadas: [],
        perguntasForm: DEFAULT_EDICAO_2026.perguntasForm,
        respostasForm: [],
        criadoEm: new Date().toLocaleDateString('pt-BR')
      };
      updatedList = [newEd, ...edicoes];
      setActiveEdicaoId(newEd.id);
    }

    saveEdicoesToStorage(updatedList);
    setIsEdicaoModalOpen(false);
  };

  // Handle Add File Upload (Material or Ata) - Multiple files supported
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !currentEdicao) return;

    const isAta = uploadCategory === 'Ata Assinada (PDF)';
    let loadedCount = 0;
    const newDocs: DocumentoQualidade[] = [];

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const newDoc: DocumentoQualidade = {
          id: 'doc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          nomeArquivo: file.name,
          tipo: file.name.endsWith('.pdf') ? 'pdf' : file.name.endsWith('.xlsx') || file.name.endsWith('.xls') ? 'excel' : file.name.endsWith('.docx') ? 'word' : 'outros',
          categoria: uploadCategory,
          tamanhoKb: Math.round(file.size / 1024),
          dataUrl: reader.result as string,
          criadoEm: new Date().toLocaleString('pt-BR'),
          criadoPor: user.nome || 'Operador'
        };
        newDocs.push(newDoc);
        loadedCount++;

        if (loadedCount === files.length) {
          const updatedEditions = edicoes.map(ed => {
            if (ed.id === currentEdicao.id) {
              return {
                ...ed,
                materiais: isAta ? ed.materiais : [...newDocs, ...ed.materiais],
                atasAssinadas: isAta ? [...newDocs, ...ed.atasAssinadas] : ed.atasAssinadas
              };
            }
            return ed;
          });

          saveEdicoesToStorage(updatedEditions);
          setIsUploadModalOpen(false);
          alert(isAta ? `${files.length} ata(s) assinada(s) anexada(s) com sucesso!` : `${files.length} material(is) anexado(s) com sucesso!`);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Handle Rename File
  const handleRenameDoc = (docId: string, currentName: string, isAta: boolean) => {
    const newName = prompt('Digite o novo nome para o arquivo:', currentName);
    if (!newName || !newName.trim() || newName.trim() === currentName) return;

    const updatedEditions = edicoes.map(ed => {
      if (ed.id === currentEdicao.id) {
        return {
          ...ed,
          materiais: isAta ? ed.materiais : ed.materiais.map(d => d.id === docId ? { ...d, nomeArquivo: newName.trim() } : d),
          atasAssinadas: isAta ? ed.atasAssinadas.map(d => d.id === docId ? { ...d, nomeArquivo: newName.trim() } : d) : ed.atasAssinadas
        };
      }
      return ed;
    });

    saveEdicoesToStorage(updatedEditions);
  };

  // Handle Delete File
  const handleDeleteDoc = (docId: string, isAta: boolean) => {
    if (!isManager) {
      alert('Apenas supervisores e administradores podem remover arquivos.');
      return;
    }
    if (!confirm('Deseja excluir este documento?')) return;

    const updatedEditions = edicoes.map(ed => {
      if (ed.id === currentEdicao.id) {
        return {
          ...ed,
          materiais: isAta ? ed.materiais : ed.materiais.filter(d => d.id !== docId),
          atasAssinadas: isAta ? ed.atasAssinadas.filter(d => d.id !== docId) : ed.atasAssinadas
        };
      }
      return ed;
    });

    saveEdicoesToStorage(updatedEditions);
  };

  // Handle Question Builder
  const handleSavePergunta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEnunciado.trim()) {
      alert('Preencha o enunciado da pergunta.');
      return;
    }

    const newPergunta: PerguntaCheckRetencao = {
      id: 'p-' + Date.now(),
      enunciado: formEnunciado.trim(),
      tipo: formTipoPergunta,
      opcoes: formTipoPergunta === 'multipla_escolha' ? formOpcoes.filter(o => o.trim() !== '') : undefined,
      opcaoCorretaIdx: formTipoPergunta === 'multipla_escolha' ? formOpcaoCorreta : undefined,
      peso: 25
    };

    const updatedEditions = edicoes.map(ed => {
      if (ed.id === currentEdicao.id) {
        return {
          ...ed,
          perguntasForm: [...ed.perguntasForm, newPergunta]
        };
      }
      return ed;
    });

    saveEdicoesToStorage(updatedEditions);
    setIsPerguntaModalOpen(false);
    setFormEnunciado('');
    setFormOpcoes(['', '', '', '']);
  };

  const handleDeletePergunta = (pId: string) => {
    if (!isManager) return;
    if (!confirm('Remover esta pergunta do formulário?')) return;

    const updatedEditions = edicoes.map(ed => {
      if (ed.id === currentEdicao.id) {
        return {
          ...ed,
          perguntasForm: ed.perguntasForm.filter(p => p.id !== pId)
        };
      }
      return ed;
    });

    saveEdicoesToStorage(updatedEditions);
  };

  // Handle Submit Form Response by Collaborator
  const handleSubmitColabForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEdicao) return;

    const colabObj = LISTA_COLABORADORES_OFICIAIS.find(c => c.matricula === selectedColabMatricula) || {
      matricula: selectedColabMatricula,
      nome: user.nome || 'Colaborador',
      cargo: user.cargo || 'Operações'
    };

    // Calculate score
    let totalScore = 0;
    let maxScore = 0;

    const formattedAnswers = currentEdicao.perguntasForm.map(p => {
      maxScore += p.peso;
      const ans = colabAnswers[p.id];

      if (p.tipo === 'multipla_escolha') {
        const selectedIdx = ans?.opcaoIdx ?? -1;
        if (selectedIdx === p.opcaoCorretaIdx) {
          totalScore += p.peso;
        }
        return {
          perguntaId: p.id,
          respostaTexto: p.opcoes?.[selectedIdx] || 'Não respondido',
          opcaoEscolhidaIdx: selectedIdx
        };
      } else {
        // Essay question - full credit if text filled
        if (ans?.texto && ans.texto.trim().length > 5) {
          totalScore += p.peso;
        }
        return {
          perguntaId: p.id,
          respostaTexto: ans?.texto || 'Sem resposta'
        };
      }
    });

    const notaPercentual = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 100;

    const newResposta: RespostaCheckRetencao = {
      id: 'resp-' + Date.now(),
      matricula: colabObj.matricula,
      nomeColaborador: colabObj.nome,
      cargo: colabObj.cargo,
      dataHora: new Date().toLocaleString('pt-BR'),
      respostas: formattedAnswers,
      notaPercentual
    };

    const updatedEditions = edicoes.map(ed => {
      if (ed.id === currentEdicao.id) {
        // Filter out prior response from same matricula if any
        const filteredResps = ed.respostasForm.filter(r => r.matricula !== colabObj.matricula);
        return {
          ...ed,
          respostasForm: [newResposta, ...filteredResps]
        };
      }
      return ed;
    });

    saveEdicoesToStorage(updatedEditions);
    alert(`🎉 Formulário enviado com sucesso!\nSua nota de retenção: ${notaPercentual}%`);
    setActiveTab('respostas_painel');
  };

  // Export Results to CSV
  const handleExportCSV = () => {
    if (!currentEdicao || currentEdicao.respostasForm.length === 0) {
      alert('Nenhum resultado registrado para exportação.');
      return;
    }

    const headers = ['Matrícula', 'Nome do Colaborador', 'Cargo', 'Data e Hora', 'Nota Retenção (%)'];
    const rows = currentEdicao.respostasForm.map(r => [
      r.matricula,
      `"${r.nomeColaborador}"`,
      `"${r.cargo}"`,
      r.dataHora,
      `${r.notaPercentual}%`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Resultados_Retencao_Semana_Qualidade_${currentEdicao.anoEdicao}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Statistics calculation
  const totalColaboradores = LISTA_COLABORADORES_OFICIAIS.length;
  const totalRespondidos = currentEdicao.respostasForm.length;
  const percentualAdesao = totalColaboradores > 0 ? Math.round((totalRespondidos / totalColaboradores) * 100) : 0;
  const mediaNotaGeral = totalRespondidos > 0 
    ? Math.round(currentEdicao.respostasForm.reduce((acc, r) => acc + r.notaPercentual, 0) / totalRespondidos) 
    : 0;

  const hasAtaAssinada = currentEdicao.atasAssinadas.length > 0;

  return (
    <div className={`space-y-6 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
      
      {/* HEADER BANNER */}
      <div className={`border rounded-2xl p-6 relative overflow-hidden shadow-xl ${
        isDark 
          ? 'bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 border-emerald-800/60' 
          : 'bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 text-white border-emerald-700'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="flex items-start gap-4">
            <div className="p-3.5 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
              <Award className="w-8 h-8" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-md border border-emerald-500/20">
                  Programa de Qualidade & DPO Armazém
                </span>
                <span className="text-[10px] font-bold text-amber-300 font-mono">
                  Edição {currentEdicao.anoEdicao}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight mt-1">
                Semana da Qualidade & Check de Retenção
              </h1>
              <p className="text-xs text-slate-300 font-medium max-w-3xl mt-1 leading-relaxed">
                {currentEdicao.temaCentral}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* EDITION SELECTOR */}
            <select
              value={activeEdicaoId}
              onChange={(e) => setActiveEdicaoId(e.target.value)}
              className="px-3 py-2 bg-slate-900/90 border border-slate-700 text-emerald-400 font-bold text-xs rounded-xl outline-none"
            >
              {edicoes.map(ed => (
                <option key={ed.id} value={ed.id}>
                  Edição {ed.anoEdicao} ({ed.titulo})
                </option>
              ))}
            </select>

            {isManager && (
              <>
                <button
                  onClick={handleOpenEditEdicao}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-bold text-xs uppercase cursor-pointer flex items-center gap-1.5"
                  title="Editar dados desta edição"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Editar Evento</span>
                </button>
                <button
                  onClick={handleOpenNewEdicao}
                  className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-lg flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Nova Edição</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* STATUS & SUMMARY METRICS BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-4 rounded-xl border flex items-center justify-between ${
          isDark ? 'bg-[#111a30] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div>
            <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
              Status da Ata Assinada
            </div>
            <div className="mt-1">
              {hasAtaAssinada ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4" />
                  Ata Anexada
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-black text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-md border border-rose-500/20 animate-pulse">
                  <AlertCircle className="w-4 h-4" />
                  Ata Pendente
                </span>
              )}
            </div>
          </div>
          <FileText className={`w-8 h-8 ${hasAtaAssinada ? 'text-emerald-400' : 'text-rose-400'}`} />
        </div>

        <div className={`p-4 rounded-xl border flex items-center justify-between ${
          isDark ? 'bg-[#111a30] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div>
            <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
              Adesão ao Check de Retenção
            </div>
            <div className="text-xl font-black text-amber-400 mt-0.5">
              {percentualAdesao}% <span className="text-xs text-slate-400 font-normal">({totalRespondidos}/{totalColaboradores})</span>
            </div>
          </div>
          <UserCheck className="w-8 h-8 text-amber-400" />
        </div>

        <div className={`p-4 rounded-xl border flex items-center justify-between ${
          isDark ? 'bg-[#111a30] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div>
            <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
              Média de Retenção de Conteúdo
            </div>
            <div className="text-xl font-black text-sky-400 mt-0.5">
              {mediaNotaGeral}% <span className="text-xs text-slate-400 font-normal">de aproveitamento</span>
            </div>
          </div>
          <BarChart3 className="w-8 h-8 text-sky-400" />
        </div>

        <div className={`p-4 rounded-xl border flex items-center justify-between ${
          isDark ? 'bg-[#111a30] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div>
            <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
              Período de Realização
            </div>
            <div className="text-xs font-bold text-white mt-1 font-mono">
              {currentEdicao.dataInicio.split('-').reverse().join('/')} até {currentEdicao.dataFim.split('-').reverse().join('/')}
            </div>
          </div>
          <Calendar className="w-8 h-8 text-purple-400" />
        </div>
      </div>

      {/* TAB NAVIGATION BAR */}
      <div className={`p-1.5 rounded-2xl border flex flex-wrap items-center gap-1 ${
        isDark ? 'bg-[#0d1527] border-slate-800' : 'bg-slate-100 border-slate-200'
      }`}>
        <button
          onClick={() => setActiveTab('evento')}
          className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'evento'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Ficha do Evento</span>
        </button>

        <button
          onClick={() => setActiveTab('material')}
          className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'material'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Paperclip className="w-4 h-4" />
          <span>Material Apresentado ({currentEdicao.materiais.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('atas')}
          className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer relative ${
            activeTab === 'atas'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Atas Assinadas</span>
          {!hasAtaAssinada && (
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('form_responder')}
          className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'form_responder'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-amber-400 hover:text-amber-300'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Responder Check de Retenção</span>
        </button>

        <button
          onClick={() => setActiveTab('respostas_painel')}
          className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'respostas_painel'
              ? 'bg-sky-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Resultados e Acompanhamento ({currentEdicao.respostasForm.length})</span>
        </button>
      </div>

      {/* TAB 1: FICHA DO EVENTO */}
      {activeTab === 'evento' && (
        <div className={`border rounded-2xl p-6 space-y-6 ${
          isDark ? 'bg-[#111a30] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                Ficha Oficial da Edição
              </span>
              <h2 className="text-lg font-black text-white uppercase tracking-tight mt-0.5">
                {currentEdicao.titulo}
              </h2>
            </div>

            {isManager && (
              <button
                onClick={handleOpenEditEdicao}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 rounded-xl font-bold text-xs uppercase cursor-pointer flex items-center gap-1.5"
              >
                <Edit3 className="w-4 h-4" />
                <span>Editar Dados do Evento</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                  Tema Central da Semana da Qualidade
                </label>
                <p className="text-sm font-semibold text-slate-200 mt-1 leading-relaxed">
                  {currentEdicao.temaCentral}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                    Data de Início
                  </label>
                  <p className="text-xs font-mono font-bold text-emerald-400 mt-0.5">
                    {currentEdicao.dataInicio.split('-').reverse().join('/')}
                  </p>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                    Data de Término
                  </label>
                  <p className="text-xs font-mono font-bold text-emerald-400 mt-0.5">
                    {currentEdicao.dataFim.split('-').reverse().join('/')}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                  Comissão Organizadora / Responsável
                </label>
                <p className="text-xs font-bold text-sky-400 mt-0.5">
                  {currentEdicao.responsavel}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                  Observações Gerais & Diretrizes DPO
                </label>
                <p className="text-xs text-slate-300 mt-1 whitespace-pre-line leading-relaxed">
                  {currentEdicao.observacoes || 'Sem observações adicionais gravadas para esta edição.'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  Regras de Validação do Evento (PEX / DPO)
                </div>
                <ul className="text-[11px] text-slate-300 space-y-1 list-disc list-inside font-medium">
                  <li>Obrigatório realizar o upload das <strong>Atas Assinadas</strong> em PDF.</li>
                  <li>100% dos colaboradores do Armazém devem responder ao <strong>Check de Retenção</strong>.</li>
                  <li>Materiais apresentados devem ficar salvos para consulta contínua na aba de materiais.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MATERIAL APRESENTADO */}
      {activeTab === 'material' && (
        <div className={`border rounded-2xl p-6 space-y-6 ${
          isDark ? 'bg-[#111a30] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                Repositório de Materiais
              </span>
              <h2 className="text-lg font-black text-white uppercase tracking-tight mt-0.5">
                Slides, Apostilas e Treinamentos Apresentados
              </h2>
            </div>

            {isManager && (
              <button
                onClick={() => {
                  setUploadCategory('Apresentação / Slides');
                  setIsUploadModalOpen(true);
                }}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-md flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                <span>Anexar Material</span>
              </button>
            )}
          </div>

          {currentEdicao.materiais.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl">
              <Paperclip className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-400">Nenhum material didático foi anexado ainda nesta edição.</p>
              {isManager && (
                <button
                  onClick={() => {
                    setUploadCategory('Apresentação / Slides');
                    setIsUploadModalOpen(true);
                  }}
                  className="mt-3 px-4 py-2 bg-slate-800 text-emerald-400 font-bold text-xs rounded-xl hover:bg-slate-700 cursor-pointer"
                >
                  Anexar primeiro arquivo
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentEdicao.materiais.map(doc => (
                <div key={doc.id} className="p-4 rounded-xl border border-slate-800 bg-[#0d1527] space-y-3 flex flex-col justify-between">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[9px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          {doc.categoria}
                        </span>
                        <h4 className="text-xs font-bold text-white truncate mt-1" title={doc.nomeArquivo}>
                          {doc.nomeArquivo}
                        </h4>
                        <span className="text-[10px] font-mono text-slate-500 block">
                          {doc.tamanhoKb} KB • {doc.criadoEm}
                        </span>
                      </div>
                    </div>

                    {isManager && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleRenameDoc(doc.id, doc.nomeArquivo, false)}
                          className="text-slate-400 hover:text-amber-300 p-1 cursor-pointer"
                          title="Renomear Arquivo"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteDoc(doc.id, false)}
                          className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-[10px] text-slate-400">Por: {doc.criadoPor}</span>
                    <a
                      href={doc.dataUrl}
                      download={doc.nomeArquivo}
                      className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Baixar</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ATAS ASSINADAS */}
      {activeTab === 'atas' && (
        <div className={`border rounded-2xl p-6 space-y-6 ${
          isDark ? 'bg-[#111a30] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">
                Comprovação de Presença & Auditoria DPO
              </span>
              <h2 className="text-lg font-black text-white uppercase tracking-tight mt-0.5">
                Atas Assinadas em PDF
              </h2>
            </div>

            {isManager && (
              <button
                onClick={() => {
                  setUploadCategory('Ata Assinada (PDF)');
                  setIsUploadModalOpen(true);
                }}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-md flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                <span>Anexar Ata Assinada (PDF)</span>
              </button>
            )}
          </div>

          {!hasAtaAssinada ? (
            <div className="p-6 rounded-2xl bg-rose-950/30 border border-rose-500/40 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-rose-400 mx-auto animate-bounce" />
              <h3 className="text-sm font-black text-rose-300 uppercase">
                Atenção: Nenhum documento de Ata Assinada foi anexado para esta edição!
              </h3>
              <p className="text-xs text-slate-300 max-w-xl mx-auto">
                Para conformidade com as auditorias do Pilar Qualidade / DPO, é obrigatório anexar o PDF da lista de presença e ata devidamente assinada pelos colaboradores.
              </p>
              {isManager && (
                <button
                  onClick={() => {
                    setUploadCategory('Ata Assinada (PDF)');
                    setIsUploadModalOpen(true);
                  }}
                  className="px-5 py-2.5 bg-rose-500 hover:bg-rose-400 text-slate-950 font-black text-xs uppercase rounded-xl shadow-lg cursor-pointer inline-flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>Anexar Ata Assinada Agora</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>Ata oficial assinada anexada com sucesso. Edição com auditoria regularizada!</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentEdicao.atasAssinadas.map(doc => (
                  <div key={doc.id} className="p-4 rounded-xl border border-slate-800 bg-[#0d1527] space-y-3 flex flex-col justify-between">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[9px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            Ata Assinada (PDF)
                          </span>
                          <h4 className="text-xs font-bold text-white truncate mt-1" title={doc.nomeArquivo}>
                            {doc.nomeArquivo}
                          </h4>
                          <span className="text-[10px] font-mono text-slate-500 block">
                            {doc.tamanhoKb} KB • {doc.criadoEm}
                          </span>
                        </div>
                      </div>

                      {isManager && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleRenameDoc(doc.id, doc.nomeArquivo, true)}
                            className="text-slate-400 hover:text-amber-300 p-1 cursor-pointer"
                            title="Renomear Arquivo"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteDoc(doc.id, true)}
                            className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <span className="text-[10px] text-slate-400">Por: {doc.criadoPor}</span>
                      <a
                        href={doc.dataUrl}
                        download={doc.nomeArquivo}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Baixar PDF</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: RESPONDER CHECK DE RETENÇÃO (FORMS) */}
      {activeTab === 'form_responder' && (
        <div className={`border rounded-2xl p-6 space-y-6 ${
          isDark ? 'bg-[#111a30] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
                Formulário de Verificação de Aprendizagem
              </span>
              <h2 className="text-lg font-black text-white uppercase tracking-tight mt-0.5">
                Check de Retenção de Conteúdo DPO
              </h2>
            </div>

            {isManager && (
              <button
                onClick={() => setIsPerguntaModalOpen(true)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 rounded-xl font-bold text-xs uppercase cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Pergunta</span>
              </button>
            )}
          </div>

          <form onSubmit={handleSubmitColabForm} className="space-y-6 max-w-3xl">
            {/* SELECTOR OF COLLABORATOR */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <label className="text-xs font-bold uppercase text-slate-300 block">
                Selecione seu Nome / Matrícula *
              </label>
              <select
                value={selectedColabMatricula}
                onChange={(e) => setSelectedColabMatricula(e.target.value)}
                className="w-full px-3 py-2 bg-[#080d19] border border-slate-700 text-amber-300 font-bold text-xs rounded-xl outline-none"
              >
                {LISTA_COLABORADORES_OFICIAIS.map(c => (
                  <option key={c.matricula} value={c.matricula}>
                    [{c.matricula}] {c.nome} - {c.cargo}
                  </option>
                ))}
              </select>
            </div>

            {/* QUESTIONS LIST */}
            {currentEdicao.perguntasForm.map((p, idx) => (
              <div key={p.id} className="p-5 rounded-2xl border border-slate-800 bg-[#0d1527] space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 text-xs font-black flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="text-xs font-extrabold text-white leading-relaxed">
                        {p.enunciado}
                      </h4>
                      <span className="text-[10px] font-mono text-slate-400">
                        Tipo: {p.tipo === 'multipla_escolha' ? 'Múltipla Escolha' : 'Dissertativa'} • Peso: {p.peso}%
                      </span>
                    </div>
                  </div>

                  {isManager && (
                    <button
                      type="button"
                      onClick={() => handleDeletePergunta(p.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                      title="Excluir pergunta"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* MULTIPLE CHOICE OPTIONS */}
                {p.tipo === 'multipla_escolha' && p.opcoes && (
                  <div className="space-y-2 pl-9">
                    {p.opcoes.map((op, opIdx) => {
                      const isSelected = colabAnswers[p.id]?.opcaoIdx === opIdx;
                      return (
                        <label
                          key={opIdx}
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-amber-500/15 border-amber-500/50 text-amber-200'
                              : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/50'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`pergunta-${p.id}`}
                            checked={isSelected}
                            onChange={() => {
                              setColabAnswers(prev => ({
                                ...prev,
                                [p.id]: { opcaoIdx: opIdx }
                              }));
                            }}
                            className="accent-amber-400 w-4 h-4"
                          />
                          <span className="text-xs font-medium">{op}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* ESSAY TEXTAREA */}
                {p.tipo === 'dissertativa' && (
                  <div className="pl-9">
                    <textarea
                      rows={3}
                      placeholder="Digite sua resposta aqui..."
                      value={colabAnswers[p.id]?.texto || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setColabAnswers(prev => ({
                          ...prev,
                          [p.id]: { texto: val }
                        }));
                      }}
                      className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-amber-400 font-sans"
                    />
                  </div>
                )}
              </div>
            ))}

            <div className="pt-4 flex items-center justify-end">
              <button
                type="submit"
                className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg cursor-pointer flex items-center gap-2"
              >
                <Send className="w-4 h-4 stroke-[3]" />
                <span>Enviar Respostas do Check de Retenção</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 5: RESULTADOS E PAINEL DE RESPOSTAS */}
      {activeTab === 'respostas_painel' && (
        <div className={`border rounded-2xl p-6 space-y-6 ${
          isDark ? 'bg-[#111a30] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest">
                Relatório de Aproveitamento
              </span>
              <h2 className="text-lg font-black text-white uppercase tracking-tight mt-0.5">
                Painel de Respostas & Retenção de Conteúdo
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Filtrar colaborador..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-900 border border-slate-700 text-xs text-white rounded-lg outline-none"
              />
              <button
                onClick={handleExportCSV}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase rounded-xl shadow cursor-pointer flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Exportar Resultados (CSV)</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] uppercase font-black text-slate-400">
                  <th className="py-2.5 px-3">Matrícula</th>
                  <th className="py-2.5 px-3">Colaborador</th>
                  <th className="py-2.5 px-3">Cargo</th>
                  <th className="py-2.5 px-3">Data e Hora</th>
                  <th className="py-2.5 px-3 text-center">Nota de Retenção</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {currentEdicao.respostasForm
                  .filter(r => r.nomeColaborador.toLowerCase().includes(searchFilter.toLowerCase()) || r.matricula.includes(searchFilter))
                  .map(r => (
                    <tr key={r.id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-3 font-mono text-[11px] text-amber-400 font-bold">{r.matricula}</td>
                      <td className="py-3 px-3 font-bold text-white">{r.nomeColaborador}</td>
                      <td className="py-3 px-3 text-slate-400 text-[11px] uppercase">{r.cargo}</td>
                      <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">{r.dataHora}</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full font-black text-xs font-mono inline-block ${
                          r.notaPercentual >= 80 
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                            : r.notaPercentual >= 60 
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        }`}>
                          {r.notaPercentual}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          Concluído
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: CRIAR OU EDITAR EDIÇÃO */}
      {isEdicaoModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-[#0d1527] border border-slate-700 rounded-2xl p-6 space-y-5 text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black uppercase text-amber-400">
                Cadastro / Edição da Semana da Qualidade
              </h3>
              <button onClick={() => setIsEdicaoModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdicaoModal} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-300 block mb-1">Ano da Edição</label>
                  <input
                    type="text"
                    required
                    value={formAno}
                    onChange={(e) => setFormAno(e.target.value)}
                    className="w-full px-3 py-2 bg-[#080d19] border border-slate-700 text-white rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-300 block mb-1">Título do Evento</label>
                  <input
                    type="text"
                    required
                    value={formTitulo}
                    onChange={(e) => setFormTitulo(e.target.value)}
                    className="w-full px-3 py-2 bg-[#080d19] border border-slate-700 text-white rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-300 block mb-1">Data Início</label>
                  <input
                    type="date"
                    required
                    value={formDataInicio}
                    onChange={(e) => setFormDataInicio(e.target.value)}
                    className="w-full px-3 py-2 bg-[#080d19] border border-slate-700 text-white rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-300 block mb-1">Data Término</label>
                  <input
                    type="date"
                    required
                    value={formDataFim}
                    onChange={(e) => setFormDataFim(e.target.value)}
                    className="w-full px-3 py-2 bg-[#080d19] border border-slate-700 text-white rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-300 block mb-1">Tema Central</label>
                <input
                  type="text"
                  required
                  value={formTema}
                  onChange={(e) => setFormTema(e.target.value)}
                  className="w-full px-3 py-2 bg-[#080d19] border border-slate-700 text-white rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-300 block mb-1">Comissão / Responsável</label>
                <input
                  type="text"
                  value={formResponsavel}
                  onChange={(e) => setFormResponsavel(e.target.value)}
                  className="w-full px-3 py-2 bg-[#080d19] border border-slate-700 text-white rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-300 block mb-1">Observações Gerais</label>
                <textarea
                  rows={3}
                  value={formObs}
                  onChange={(e) => setFormObs(e.target.value)}
                  className="w-full p-3 bg-[#080d19] border border-slate-700 text-white rounded-xl text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button type="button" onClick={() => setIsEdicaoModalOpen(false)} className="px-4 py-2 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl">
                  Cancelar
                </button>
                <button type="submit" className="px-5 py-2 bg-emerald-500 text-slate-950 font-black text-xs uppercase rounded-xl">
                  Salvar Edição
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: UPLOAD DE ARQUIVO */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0d1527] border border-slate-700 rounded-2xl p-6 space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black uppercase text-emerald-400">
                Upload de Documento ({uploadCategory})
              </h3>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold uppercase text-slate-300 block">
                Selecione um ou vários arquivos (PDF, Excel, Word, Imagem)
              </label>
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                accept=".pdf,.xlsx,.xls,.docx,.doc,.png,.jpg"
                className="w-full text-xs text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-500 file:text-slate-950 hover:file:bg-emerald-400 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADICIONAR PERGUNTA AO CHECK DE RETENÇÃO */}
      {isPerguntaModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0d1527] border border-slate-700 rounded-2xl p-6 space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black uppercase text-amber-400">
                Nova Pergunta para o Check de Retenção
              </h3>
              <button onClick={() => setIsPerguntaModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePergunta} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-slate-300 block mb-1">Enunciado *</label>
                <textarea
                  required
                  rows={2}
                  value={formEnunciado}
                  onChange={(e) => setFormEnunciado(e.target.value)}
                  className="w-full p-2.5 bg-[#080d19] border border-slate-700 text-xs text-white rounded-xl"
                  placeholder="Ex: Qual o tempo máximo para tratativa de avaria?"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-300 block mb-1">Tipo de Pergunta</label>
                <select
                  value={formTipoPergunta}
                  onChange={(e) => setFormTipoPergunta(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[#080d19] border border-slate-700 text-xs text-white rounded-xl"
                >
                  <option value="multipla_escolha">Múltipla Escolha</option>
                  <option value="dissertativa">Dissertativa / Texto Livre</option>
                </select>
              </div>

              {formTipoPergunta === 'multipla_escolha' && (
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-amber-400 block">
                    Opções de Resposta & Marque a Correta
                  </label>
                  {formOpcoes.map((op, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="opcaoCorreta"
                        checked={formOpcaoCorreta === idx}
                        onChange={() => setFormOpcaoCorreta(idx)}
                        className="accent-amber-400 w-4 h-4"
                      />
                      <input
                        type="text"
                        placeholder={`Opção ${idx + 1}`}
                        value={op}
                        onChange={(e) => {
                          const newOps = [...formOpcoes];
                          newOps[idx] = e.target.value;
                          setFormOpcoes(newOps);
                        }}
                        className="flex-1 px-3 py-1.5 bg-[#080d19] border border-slate-700 text-xs text-white rounded-lg"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button type="button" onClick={() => setIsPerguntaModalOpen(false)} className="px-4 py-2 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl">
                  Cancelar
                </button>
                <button type="submit" className="px-5 py-2 bg-amber-500 text-slate-950 font-black text-xs uppercase rounded-xl">
                  Salvar Pergunta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
