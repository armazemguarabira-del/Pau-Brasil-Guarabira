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
  Search, 
  FileSpreadsheet, 
  X, 
  Save, 
  Clock, 
  ShieldCheck, 
  Paperclip, 
  Sparkles, 
  ChevronRight, 
  Eye,
  Filter,
  Users,
  Folder,
  FolderOpen,
  Link as LinkIcon,
  Copy,
  ExternalLink,
  Check,
  AlertCircle,
  FolderTree,
  Send,
  HelpCircle,
  BarChart3,
  UserCheck
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

export interface LinkUtilSemana {
  id: string;
  titulo: string;
  url: string;
  descricao?: string;
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

export interface SemanaSemestralEdicao {
  id: string;
  anoEdicao: string;
  semestre: '1S' | '2S';
  titulo: string;
  assunto: string;
  dataInicio: string;
  dataFim: string;
  caminhoPasta: string;
  linkExterno: string;
  status: 'Planejado' | 'Em Andamento' | 'Concluído';
  responsavel: string;
  observacoes: string;
  materiais: DocumentoQualidade[];
  atasAssinadas: DocumentoQualidade[];
  linksUteis: LinkUtilSemana[];
  perguntasForm: PerguntaCheckRetencao[];
  respostasForm: RespostaCheckRetencao[];
  criadoEm: string;
}

const DEFAULT_SEM_1S_2026: SemanaSemestralEdicao = {
  id: 'sq-2026-1s',
  anoEdicao: '2026',
  semestre: '1S',
  titulo: 'Semana da Qualidade 2026 — 1º Semestre',
  assunto: 'Cultura DPO, Padrões Operacionais (POP), Validade FEFO e Zero Avarias no Armazém',
  dataInicio: '2026-05-11',
  dataFim: '2026-05-15',
  caminhoPasta: 'C:\\Armazem\\Qualidade\\Semana_Qualidade_2026_1S',
  linkExterno: 'https://drive.google.com/drive/folders/semana_qualidade_2026_1s',
  status: 'Concluído',
  responsavel: 'Supervisão de Qualidade & DPO',
  observacoes: 'Capacitação completa dos times de Armazém, Picking e Conferência no 1º Semestre.',
  materiais: [
    {
      id: 'mat-1s-1',
      nomeArquivo: 'Apresentacao_Oficial_Semana_Qualidade_1S_2026.pdf',
      tipo: 'pdf',
      categoria: 'Apresentação / Slides',
      tamanhoKb: 2450,
      dataUrl: '#',
      criadoEm: '11/05/2026',
      criadoPor: 'Qualidade'
    },
    {
      id: 'mat-1s-2',
      nomeArquivo: 'Guia_Pratico_Prevencao_Avarias_e_FEFO.pdf',
      tipo: 'pdf',
      categoria: 'Material Didático / Apostila',
      tamanhoKb: 1280,
      dataUrl: '#',
      criadoEm: '11/05/2026',
      criadoPor: 'Supervisão'
    }
  ],
  atasAssinadas: [
    {
      id: 'ata-1s-1',
      nomeArquivo: 'Ata_Assinada_Presenca_Treinamento_1S_2026.pdf',
      tipo: 'pdf',
      categoria: 'Ata Assinada (PDF)',
      tamanhoKb: 1850,
      dataUrl: '#',
      criadoEm: '15/05/2026',
      criadoPor: 'Qualidade'
    }
  ],
  linksUteis: [
    {
      id: 'l-1',
      titulo: 'Pasta Compartilhada no Google Drive (1S)',
      url: 'https://drive.google.com/drive/folders/semana_qualidade_2026_1s',
      descricao: 'Fotos do evento, apresentações em PPTX e planilhas de presença.'
    }
  ],
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
      enunciado: 'Descreva resumidamente o que você aprendeu nesta Semana da Qualidade do 1º Semestre sobre prevenção de acidentes e uso de EPIs:',
      tipo: 'dissertativa',
      peso: 25
    }
  ],
  respostasForm: [
    {
      id: 'resp-1s-1',
      matricula: '101',
      nomeColaborador: 'Carlos Eduardo Oliveira',
      cargo: 'Operador de Empilhadeira',
      dataHora: '12/05/2026 09:15',
      respostas: [
        { perguntaId: 'p1', respostaTexto: '3 lados do palete', opcaoEscolhidaIdx: 1 },
        { perguntaId: 'p2', respostaTexto: 'O produto com vencimento mais próximo', opcaoEscolhidaIdx: 2 },
        { perguntaId: 'p3', respostaTexto: 'Isolar e encaminhar ao Repack', opcaoEscolhidaIdx: 1 },
        { perguntaId: 'p4', respostaTexto: 'Atenção aos pontos cego da empilhadeira e respeito ao checklist de freios.' }
      ],
      notaPercentual: 100
    }
  ],
  criadoEm: '01/05/2026'
};

const DEFAULT_SEM_2S_2026: SemanaSemestralEdicao = {
  id: 'sq-2026-2s',
  anoEdicao: '2026',
  semestre: '2S',
  titulo: 'Semana da Qualidade 2026 — 2º Semestre',
  assunto: 'Garantia da Qualidade de Puxada, Pátio Seguro, Gestão de Devoluções e Repack',
  dataInicio: '2026-10-19',
  dataFim: '2026-10-23',
  caminhoPasta: 'C:\\Armazem\\Qualidade\\Semana_Qualidade_2026_2S',
  linkExterno: 'https://drive.google.com/drive/folders/semana_qualidade_2026_2s',
  status: 'Planejado',
  responsavel: 'Supervisão de Qualidade & Armazém',
  observacoes: 'Evento previsto para o 2º semestre preparando os times para o pico de vendas de fim de ano.',
  materiais: [
    {
      id: 'mat-2s-1',
      nomeArquivo: 'Guia_Qualidade_Puxada_e_Estabilidade_Palete_2S.pdf',
      tipo: 'pdf',
      categoria: 'Apresentação / Slides',
      tamanhoKb: 3100,
      dataUrl: '#',
      criadoEm: '01/10/2026',
      criadoPor: 'Qualidade'
    }
  ],
  atasAssinadas: [],
  linksUteis: [
    {
      id: 'l-2',
      titulo: 'Pasta de Arquivos e Materiais 2º Semestre',
      url: 'https://drive.google.com/drive/folders/semana_qualidade_2026_2s',
      descricao: 'Materiais do 2S, apresentações e vídeos.'
    }
  ],
  perguntasForm: DEFAULT_SEM_1S_2026.perguntasForm,
  respostasForm: [],
  criadoEm: '01/05/2026'
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

  const [edicoes, setEdicoes] = useState<SemanaSemestralEdicao[]>([]);
  const [selectedAno, setSelectedAno] = useState<string>('2026');
  const [activeSemestre, setActiveSemestre] = useState<'1S' | '2S'>('1S');
  const [activeTab, setActiveTab] = useState<'dados_gerais' | 'materiais' | 'atas' | 'links' | 'check_retencao' | 'respostas'>('dados_gerais');

  // Copy indicator state
  const [copiedPath, setCopiedPath] = useState(false);

  // Modal states
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<'Apresentação / Slides' | 'Ata Assinada (PDF)' | 'Material Didático / Apostila' | 'Outros'>('Apresentação / Slides');
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkTitulo, setLinkTitulo] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkDesc, setLinkDesc] = useState('');

  // Editing form states for active edition
  const [formAssunto, setFormAssunto] = useState('');
  const [formDataInicio, setFormDataInicio] = useState('');
  const [formDataFim, setFormDataFim] = useState('');
  const [formCaminhoPasta, setFormCaminhoPasta] = useState('');
  const [formLinkExterno, setFormLinkExterno] = useState('');
  const [formStatus, setFormStatus] = useState<'Planejado' | 'Em Andamento' | 'Concluído'>('Planejado');
  const [formResponsavel, setFormResponsavel] = useState('');
  const [formObs, setFormObs] = useState('');

  // Collaborator response state
  const [selectedColabMatricula, setSelectedColabMatricula] = useState<string>(user.matricula || '101');
  const [colabAnswers, setColabAnswers] = useState<Record<string, { opcaoIdx?: number; texto?: string }>>({});

  // Search filter
  const [searchFilter, setSearchFilter] = useState('');

  // Load storage
  useEffect(() => {
    const saved = safeGetLocalStorage<SemanaSemestralEdicao[]>('af_semana_qualidade_semestral_v2', [DEFAULT_SEM_1S_2026, DEFAULT_SEM_2026_2S()]);
    if (saved && Array.isArray(saved) && saved.length > 0) {
      setEdicoes(saved);
    } else {
      const initial = [DEFAULT_SEM_1S_2026, DEFAULT_SEM_2026_2S()];
      setEdicoes(initial);
      safeSetLocalStorage('af_semana_qualidade_semestral_v2', initial);
    }
  }, []);

  function DEFAULT_SEM_2026_2S(): SemanaSemestralEdicao {
    return DEFAULT_SEM_2026_2S_CONST;
  }

  const saveEdicoesToStorage = (updated: SemanaSemestralEdicao[]) => {
    setEdicoes(updated);
    safeSetLocalStorage('af_semana_qualidade_semestral_v2', updated);
  };

  // Find active edition based on selectedAno & activeSemestre
  const currentEdition = useMemo(() => {
    const found = edicoes.find(e => e.anoEdicao === selectedAno && e.semestre === activeSemestre);
    if (found) return found;

    // Fallback if not found, create a blank edition on the fly
    return {
      id: `sq-${selectedAno}-${activeSemestre.toLowerCase()}`,
      anoEdicao: selectedAno,
      semestre: activeSemestre,
      titulo: `Semana da Qualidade ${selectedAno} — ${activeSemestre === '1S' ? '1º' : '2º'} Semestre`,
      assunto: 'Insira o assunto e tema central do evento',
      dataInicio: `${selectedAno}-${activeSemestre === '1S' ? '05' : '10'}-10`,
      dataFim: `${selectedAno}-${activeSemestre === '1S' ? '05' : '10'}-14`,
      caminhoPasta: `C:\\Armazem\\Qualidade\\Semana_Qualidade_${selectedAno}_${activeSemestre}`,
      linkExterno: `https://drive.google.com/drive/folders/semana_qualidade_${selectedAno}_${activeSemestre.toLowerCase()}`,
      status: 'Planejado' as const,
      responsavel: user.nome || 'Supervisão de Qualidade',
      observacoes: '',
      materiais: [],
      atasAssinadas: [],
      linksUteis: [],
      perguntasForm: DEFAULT_SEM_1S_2026.perguntasForm,
      respostasForm: [],
      criadoEm: new Date().toLocaleDateString('pt-BR')
    };
  }, [edicoes, selectedAno, activeSemestre, user.nome]);

  // Sync form inputs when active edition changes
  useEffect(() => {
    setFormAssunto(currentEdition.assunto || '');
    setFormDataInicio(currentEdition.dataInicio || '');
    setFormDataFim(currentEdition.dataFim || '');
    setFormCaminhoPasta(currentEdition.caminhoPasta || '');
    setFormLinkExterno(currentEdition.linkExterno || '');
    setFormStatus(currentEdition.status || 'Planejado');
    setFormResponsavel(currentEdition.responsavel || '');
    setFormObs(currentEdition.observacoes || '');
  }, [currentEdition]);

  // Handle Save Current Edition
  const handleSaveEditionData = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formAssunto.trim()) {
      alert('Por favor, digite o assunto principal da Semana da Qualidade.');
      return;
    }

    const updatedEdition: SemanaSemestralEdicao = {
      ...currentEdition,
      assunto: formAssunto.trim(),
      dataInicio: formDataInicio,
      dataFim: formDataFim,
      caminhoPasta: formCaminhoPasta.trim(),
      linkExterno: formLinkExterno.trim(),
      status: formStatus,
      responsavel: formResponsavel.trim(),
      observacoes: formObs.trim()
    };

    const exists = edicoes.some(e => e.id === currentEdition.id);
    let updatedList: SemanaSemestralEdicao[];
    if (exists) {
      updatedList = edicoes.map(ed => ed.id === currentEdition.id ? updatedEdition : ed);
    } else {
      updatedList = [updatedEdition, ...edicoes];
    }

    saveEdicoesToStorage(updatedList);
    alert(`Dados da Semana da Qualidade (${selectedAno} - ${activeSemestre}) salvos com sucesso!`);
  };

  // Copy path helper
  const handleCopyPath = (path: string) => {
    navigator.clipboard.writeText(path);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  // File Upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

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
          criadoEm: new Date().toLocaleDateString('pt-BR'),
          criadoPor: user.nome || 'Operador'
        };
        newDocs.push(newDoc);
        loadedCount++;

        if (loadedCount === files.length) {
          const updatedEditions = edicoes.map(ed => {
            if (ed.id === currentEdition.id) {
              return {
                ...ed,
                materiais: isAta ? ed.materiais : [...newDocs, ...ed.materiais],
                atasAssinadas: isAta ? [...newDocs, ...ed.atasAssinadas] : ed.atasAssinadas
              };
            }
            return ed;
          });

          // If current edition didn't exist in array yet, add it
          if (!edicoes.some(ed => ed.id === currentEdition.id)) {
            const newEd: SemanaSemestralEdicao = {
              ...currentEdition,
              materiais: isAta ? [] : newDocs,
              atasAssinadas: isAta ? newDocs : []
            };
            updatedEditions.push(newEd);
          }

          saveEdicoesToStorage(updatedEditions);
          setIsUploadModalOpen(false);
          alert(isAta ? `${files.length} ata(s) assinada(s) anexada(s) com sucesso!` : `${files.length} material(is) anexado(s) com sucesso!`);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Delete Document
  const handleDeleteDoc = (docId: string, isAta: boolean) => {
    if (!isManager) {
      alert('Apenas supervisores e administradores podem remover arquivos.');
      return;
    }
    if (!confirm('Deseja excluir este documento?')) return;

    const updatedEditions = edicoes.map(ed => {
      if (ed.id === currentEdition.id) {
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

  // Add External Link
  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkTitulo.trim() || !linkUrl.trim()) {
      alert('Preencha o título e a URL do link.');
      return;
    }

    const newLink: LinkUtilSemana = {
      id: 'link-' + Date.now(),
      titulo: linkTitulo.trim(),
      url: linkUrl.trim().startsWith('http') ? linkUrl.trim() : `https://${linkUrl.trim()}`,
      descricao: linkDesc.trim()
    };

    const updatedEditions = edicoes.map(ed => {
      if (ed.id === currentEdition.id) {
        return {
          ...ed,
          linksUteis: [...(ed.linksUteis || []), newLink]
        };
      }
      return ed;
    });

    if (!edicoes.some(ed => ed.id === currentEdition.id)) {
      updatedEditions.push({
        ...currentEdition,
        linksUteis: [newLink]
      });
    }

    saveEdicoesToStorage(updatedEditions);
    setIsLinkModalOpen(false);
    setLinkTitulo('');
    setLinkUrl('');
    setLinkDesc('');
  };

  // Delete Link
  const handleDeleteLink = (linkId: string) => {
    if (!confirm('Remover este link da lista?')) return;
    const updatedEditions = edicoes.map(ed => {
      if (ed.id === currentEdition.id) {
        return {
          ...ed,
          linksUteis: (ed.linksUteis || []).filter(l => l.id !== linkId)
        };
      }
      return ed;
    });
    saveEdicoesToStorage(updatedEditions);
  };

  // Submit Collaborator Quiz
  const handleSubmitColabQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    const colabInfo = LISTA_COLABORADORES_OFICIAIS.find(c => c.matricula === selectedColabMatricula) || {
      nome: user.nome,
      cargo: user.cargo || 'Operador',
      matricula: selectedColabMatricula
    };

    const perguntas = currentEdition.perguntasForm || [];
    let pontosGanhos = 0;
    let pesoTotal = 0;

    const respostasProcessadas = perguntas.map(p => {
      pesoTotal += p.peso;
      const ans = colabAnswers[p.id] || {};
      if (p.tipo === 'multipla_escolha') {
        const correta = p.opcaoCorretaIdx === ans.opcaoIdx;
        if (correta) pontosGanhos += p.peso;
        return {
          perguntaId: p.id,
          respostaTexto: p.opcoes ? p.opcoes[ans.opcaoIdx ?? -1] || 'Não respondeu' : '',
          opcaoEscolhidaIdx: ans.opcaoIdx
        };
      } else {
        if (ans.texto && ans.texto.trim().length > 10) {
          pontosGanhos += p.peso;
        }
        return {
          perguntaId: p.id,
          respostaTexto: ans.texto || 'Sem resposta'
        };
      }
    });

    const notaPercent = pesoTotal > 0 ? Math.round((pontosGanhos / pesoTotal) * 100) : 100;

    const novaResposta: RespostaCheckRetencao = {
      id: 'resp-' + Date.now(),
      matricula: colabInfo.matricula,
      nomeColaborador: colabInfo.nome,
      cargo: colabInfo.cargo,
      dataHora: new Date().toLocaleString('pt-BR'),
      respostas: respostasProcessadas,
      notaPercentual: notaPercent
    };

    const updatedEditions = edicoes.map(ed => {
      if (ed.id === currentEdition.id) {
        const existingFiltered = ed.respostasForm.filter(r => r.matricula !== selectedColabMatricula);
        return {
          ...ed,
          respostasForm: [novaResposta, ...existingFiltered]
        };
      }
      return ed;
    });

    saveEdicoesToStorage(updatedEditions);
    alert(`Aproveitamento de ${colabInfo.nome} registrado! Nota: ${notaPercent}%`);
    setColabAnswers({});
  };

  // Helper info for semester cards
  const edition1S = edicoes.find(e => e.anoEdicao === selectedAno && e.semestre === '1S') || (selectedAno === '2026' ? DEFAULT_SEM_1S_2026 : null);
  const edition2S = edicoes.find(e => e.anoEdicao === selectedAno && e.semestre === '2S') || (selectedAno === '2026' ? DEFAULT_SEM_2026_2S_CONST : null);

  return (
    <div className="space-y-6 pb-12">
      
      {/* HEADER BANNER */}
      <div className="bg-[#111a30] border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 shrink-0">
              <Award className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px] font-black uppercase tracking-widest">
                  Gestão Semestral de Qualidade DPO
                </span>
                <span className="text-xs text-slate-400 font-bold">2 Eventos por Ano</span>
              </div>
              <h1 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight mt-1">
                Dashboard Semana da Qualidade
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Centralização das edições semestrais (1º e 2º Semestre), controle de assuntos, cronograma, pastas no gerenciador de arquivos e atas.
              </p>
            </div>
          </div>

          {/* YEAR SELECTOR */}
          <div className="flex items-center gap-2 self-start md:self-auto bg-[#0b1222] p-1.5 border border-slate-800 rounded-2xl">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2">Ano:</span>
            {['2026', '2025', '2024'].map(ano => (
              <button
                key={ano}
                onClick={() => setSelectedAno(ano)}
                className={`px-3 py-1.5 rounded-xl font-mono text-xs font-black transition-all cursor-pointer ${
                  selectedAno === ano
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {ano}
              </button>
            ))}
          </div>
        </div>

        {/* CARDS COMPARATIVOS DOS SEMESTRES (1S vs 2S DO ANO SELECIONADO) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          
          {/* CARD 1º SEMESTRE */}
          <div 
            onClick={() => setActiveSemestre('1S')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
              activeSemestre === '1S'
                ? 'bg-[#15233e] border-emerald-500/60 shadow-lg shadow-emerald-500/5 ring-2 ring-emerald-500/30'
                : 'bg-[#0b1222]/80 border-slate-800 hover:border-slate-700 hover:bg-[#111a30]'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-black uppercase text-white tracking-wider">
                  1º Semestre ({selectedAno})
                </span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase font-mono ${
                (edition1S?.status || 'Concluído') === 'Concluído' 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                  : (edition1S?.status || '') === 'Em Andamento' 
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' 
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {edition1S?.status || 'Planejado'}
              </span>
            </div>

            <div className="space-y-2">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Assunto / Tema Central</span>
                <p className="text-xs font-bold text-slate-200 line-clamp-2 mt-0.5">
                  {edition1S?.assunto || 'Não cadastrado'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                <div className="bg-[#0b1222] p-2 rounded-lg border border-slate-800/60">
                  <span className="text-[9px] text-slate-500 uppercase font-black block">Período</span>
                  <span className="font-mono text-slate-300 font-bold">
                    {edition1S?.dataInicio ? `${edition1S.dataInicio.split('-').reverse().join('/')} a ${edition1S.dataFim.split('-').reverse().join('/')}` : 'A definir'}
                  </span>
                </div>
                <div className="bg-[#0b1222] p-2 rounded-lg border border-slate-800/60">
                  <span className="text-[9px] text-slate-500 uppercase font-black block">Documentos & Atas</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {(edition1S?.materiais?.length || 0) + (edition1S?.atasAssinadas?.length || 0)} arquivos
                  </span>
                </div>
              </div>

              {edition1S?.caminhoPasta && (
                <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center gap-1.5 text-[10px] text-slate-400 font-mono truncate">
                  <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">{edition1S.caminhoPasta}</span>
                </div>
              )}
            </div>

            {activeSemestre === '1S' && (
              <div className="mt-3 flex justify-end">
                <span className="text-[10px] font-black uppercase text-emerald-400 flex items-center gap-1">
                  Gerenciando Atualmente <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            )}
          </div>

          {/* CARD 2º SEMESTRE */}
          <div 
            onClick={() => setActiveSemestre('2S')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
              activeSemestre === '2S'
                ? 'bg-[#15233e] border-sky-500/60 shadow-lg shadow-sky-500/5 ring-2 ring-sky-500/30'
                : 'bg-[#0b1222]/80 border-slate-800 hover:border-slate-700 hover:bg-[#111a30]'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-black uppercase text-white tracking-wider">
                  2º Semestre ({selectedAno})
                </span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase font-mono ${
                (edition2S?.status || '') === 'Concluído' 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                  : (edition2S?.status || '') === 'Em Andamento' 
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' 
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {edition2S?.status || 'Planejado'}
              </span>
            </div>

            <div className="space-y-2">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Assunto / Tema Central</span>
                <p className="text-xs font-bold text-slate-200 line-clamp-2 mt-0.5">
                  {edition2S?.assunto || 'Não cadastrado'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                <div className="bg-[#0b1222] p-2 rounded-lg border border-slate-800/60">
                  <span className="text-[9px] text-slate-500 uppercase font-black block">Período</span>
                  <span className="font-mono text-slate-300 font-bold">
                    {edition2S?.dataInicio ? `${edition2S.dataInicio.split('-').reverse().join('/')} a ${edition2S.dataFim.split('-').reverse().join('/')}` : 'A definir'}
                  </span>
                </div>
                <div className="bg-[#0b1222] p-2 rounded-lg border border-slate-800/60">
                  <span className="text-[9px] text-slate-500 uppercase font-black block">Documentos & Atas</span>
                  <span className="font-mono text-sky-400 font-bold">
                    {(edition2S?.materiais?.length || 0) + (edition2S?.atasAssinadas?.length || 0)} arquivos
                  </span>
                </div>
              </div>

              {edition2S?.caminhoPasta && (
                <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center gap-1.5 text-[10px] text-slate-400 font-mono truncate">
                  <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">{edition2S.caminhoPasta}</span>
                </div>
              )}
            </div>

            {activeSemestre === '2S' && (
              <div className="mt-3 flex justify-end">
                <span className="text-[10px] font-black uppercase text-sky-400 flex items-center gap-1">
                  Gerenciando Atualmente <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* TABS DE GERENCIAMENTO DA EDIÇÃO ATIVA */}
      <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
        
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-black uppercase text-white tracking-wide">
              Gerenciador do {activeSemestre === '1S' ? '1º Semestre' : '2º Semestre'} / {selectedAno}
            </h2>
          </div>

          {/* TAB BUTTONS */}
          <div className="flex flex-wrap gap-1.5 bg-[#0b1222] p-1 border border-slate-800 rounded-xl">
            <button
              onClick={() => setActiveTab('dados_gerais')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'dados_gerais' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" /> Parâmetros & Caminho
            </button>
            <button
              onClick={() => setActiveTab('materiais')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'materiais' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Materiais ({currentEdition.materiais?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('atas')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'atas' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Atas Assinadas ({currentEdition.atasAssinadas?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('links')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'links' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" /> Links & Drive ({currentEdition.linksUteis?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('check_retencao')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'check_retencao' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" /> Responder Form
            </button>
            <button
              onClick={() => setActiveTab('respostas')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'respostas' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" /> Ranking ({currentEdition.respostasForm?.length || 0})
            </button>
          </div>
        </div>

        {/* TAB 1: FORMULÁRIO DE DADOS GERAIS, ASSUNTO, DATA E CAMINHO DO GERENCIADOR DE ARQUIVOS */}
        {activeTab === 'dados_gerais' && (
          <form onSubmit={handleSaveEditionData} className="space-y-5">
            <div className="bg-[#0b1222] p-4 rounded-xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <span className="text-xs font-black uppercase text-amber-400 flex items-center gap-2">
                  <Edit3 className="w-4 h-4" /> Cadastro de Parâmetros da Edição ({activeSemestre} / {selectedAno})
                </span>
                <span className="text-[10px] text-slate-500 uppercase font-mono">
                  Campos Obrigatórios de Entrada
                </span>
              </div>

              {/* ASSUNTO PRINCIPAL */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-300 mb-1">
                  1. Assunto / Tema Central do Evento *
                </label>
                <input
                  type="text"
                  value={formAssunto}
                  onChange={(e) => setFormAssunto(e.target.value)}
                  placeholder="Ex: Cultura DPO, Padrões POP, Validade FEFO e Zero Avarias no Armazém"
                  className="w-full bg-[#111a30] border border-slate-700 rounded-xl p-3 text-sm text-white font-semibold outline-none focus:border-emerald-500 transition-all"
                  required
                />
              </div>

              {/* DATAS (PERÍODO) & RESPONSÁVEL & STATUS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-300 mb-1">
                    Data Inicial *
                  </label>
                  <input
                    type="date"
                    value={formDataInicio}
                    onChange={(e) => setFormDataInicio(e.target.value)}
                    className="w-full bg-[#111a30] border border-slate-700 rounded-xl p-2.5 text-xs text-white font-mono outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-300 mb-1">
                    Data Final *
                  </label>
                  <input
                    type="date"
                    value={formDataFim}
                    onChange={(e) => setFormDataFim(e.target.value)}
                    className="w-full bg-[#111a30] border border-slate-700 rounded-xl p-2.5 text-xs text-white font-mono outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-300 mb-1">
                    Status do Evento
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full bg-[#111a30] border border-slate-700 rounded-xl p-2.5 text-xs text-white font-bold outline-none focus:border-emerald-500"
                  >
                    <option value="Planejado">Planejado</option>
                    <option value="Em Andamento">Em Andamento</option>
                    <option value="Concluído">Concluído</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-300 mb-1">
                    Responsável / Setor
                  </label>
                  <input
                    type="text"
                    value={formResponsavel}
                    onChange={(e) => setFormResponsavel(e.target.value)}
                    placeholder="Supervisão de Qualidade"
                    className="w-full bg-[#111a30] border border-slate-700 rounded-xl p-2.5 text-xs text-white font-semibold outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* CAMINHO PARA PASTA NO GERENCIADOR DE ARQUIVOS */}
              <div className="p-3.5 bg-[#152035] rounded-xl border border-amber-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5">
                    <FolderOpen className="w-4 h-4 text-amber-400" /> 
                    2. Caminho para Pasta no Gerenciador de Arquivos (Local ou Rede)
                  </label>
                  {formCaminhoPasta && (
                    <button
                      type="button"
                      onClick={() => handleCopyPath(formCaminhoPasta)}
                      className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer transition-all"
                    >
                      {copiedPath ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedPath ? 'Caminho Copiado!' : 'Copiar Caminho'}
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={formCaminhoPasta}
                  onChange={(e) => setFormCaminhoPasta(e.target.value)}
                  placeholder="Ex: C:\Armazem\Qualidade\Semana_Qualidade_2026_1S ou \\ServidorGuarabira\Qualidade\2026_1S"
                  className="w-full bg-[#0b1222] border border-slate-700 rounded-xl p-3 text-xs text-amber-300 font-mono font-bold outline-none focus:border-amber-400"
                />
                <span className="text-[10px] text-slate-400 block">
                  Caminho do diretório no computador ou servidor do armazém onde os materiais pesados e fotos do evento estão salvos.
                </span>
              </div>

              {/* LINK EXTERNO / DRIVE */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-300 mb-1 flex items-center justify-between">
                  <span>3. Link Externo (Google Drive, OneDrive ou SharePoint)</span>
                  {formLinkExterno && (
                    <a
                      href={formLinkExterno.startsWith('http') ? formLinkExterno : `https://${formLinkExterno}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-sky-400 hover:underline flex items-center gap-1 font-mono font-bold"
                    >
                      <ExternalLink className="w-3 h-3" /> Testar Link no Navegador
                    </a>
                  )}
                </label>
                <input
                  type="url"
                  value={formLinkExterno}
                  onChange={(e) => setFormLinkExterno(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/sua_pasta_da_semana_qualidade"
                  className="w-full bg-[#111a30] border border-slate-700 rounded-xl p-2.5 text-xs text-sky-300 font-mono outline-none focus:border-sky-500"
                />
              </div>

              {/* OBSERVAÇÕES */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-300 mb-1">
                  Observações & Pauta das Reuniões
                </label>
                <textarea
                  rows={2}
                  value={formObs}
                  onChange={(e) => setFormObs(e.target.value)}
                  placeholder="Anotações adicionais, destaques da ata ou programação dos turnos..."
                  className="w-full bg-[#111a30] border border-slate-700 rounded-xl p-2.5 text-xs text-white font-medium outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" /> Salvar Parâmetros da Edição
                </button>
              </div>
            </div>
          </form>
        )}

        {/* TAB 2: MATERIAIS DE TREINAMENTO E IMPORTAÇÃO */}
        {activeTab === 'materiais' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0b1222] p-4 rounded-xl border border-slate-800">
              <div>
                <h3 className="text-xs font-black uppercase text-white">
                  Materiais e Arquivos do {activeSemestre} / {selectedAno}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Importe apresentações em PDF, guias em Word/PPTX, planilhas e fotos do evento.
                </p>
              </div>
              <button
                onClick={() => {
                  setUploadCategory('Apresentação / Slides');
                  setIsUploadModalOpen(true);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Upload className="w-4 h-4" /> Anexar Arquivos
              </button>
            </div>

            {/* LISTA DE MATERIAIS */}
            {!currentEdition.materiais || currentEdition.materiais.length === 0 ? (
              <div className="bg-[#0b1222] border border-dashed border-slate-800 rounded-xl p-8 text-center space-y-3">
                <FileText className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400 font-bold">Nenhum material anexado para este semestre.</p>
                <button
                  onClick={() => {
                    setUploadCategory('Apresentação / Slides');
                    setIsUploadModalOpen(true);
                  }}
                  className="px-4 py-2 bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-emerald-600/30 transition-all cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" /> Fazer Upload de Documentos
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {currentEdition.materiais.map(doc => (
                  <div key={doc.id} className="bg-[#0b1222] p-3.5 rounded-xl border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-all">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white block truncate" title={doc.nomeArquivo}>
                          {doc.nomeArquivo}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                          <span className="px-1.5 py-0.2 bg-slate-800 rounded text-slate-300">{doc.categoria}</span>
                          <span>{doc.tamanhoKb} KB</span>
                          <span>• {doc.criadoEm}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {doc.dataUrl && doc.dataUrl !== '#' && (
                        <a
                          href={doc.dataUrl}
                          download={doc.nomeArquivo}
                          className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-all"
                          title="Baixar Arquivo"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                      {isManager && (
                        <button
                          onClick={() => handleDeleteDoc(doc.id, false)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                          title="Excluir Arquivo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ATAS ASSINADAS */}
        {activeTab === 'atas' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0b1222] p-4 rounded-xl border border-slate-800">
              <div>
                <h3 className="text-xs font-black uppercase text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> Atas Assinadas de Presença — {activeSemestre} / {selectedAno}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Comprovação de treinamentos e listas de presença físicas digitalizadas em PDF.
                </p>
              </div>
              <button
                onClick={() => {
                  setUploadCategory('Ata Assinada (PDF)');
                  setIsUploadModalOpen(true);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Upload className="w-4 h-4" /> Anexar Ata Assinada (PDF)
              </button>
            </div>

            {!currentEdition.atasAssinadas || currentEdition.atasAssinadas.length === 0 ? (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 text-center space-y-2">
                <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                <p className="text-xs font-bold text-amber-300">Pendente de Anexo de Atas Assinadas.</p>
                <p className="text-[11px] text-amber-200/70 max-w-md mx-auto">
                  Segundo o pilar DPO de Qualidade, é obrigatório anexar as listas de presença digitalizadas assinadas pelos operadores.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {currentEdition.atasAssinadas.map(ata => (
                  <div key={ata.id} className="bg-[#0b1222] p-3.5 rounded-xl border border-emerald-500/30 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-400 shrink-0">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white block truncate" title={ata.nomeArquivo}>
                          {ata.nomeArquivo}
                        </span>
                        <span className="text-[10px] text-emerald-400 font-mono block">
                          Validado DPO • {ata.tamanhoKb} KB • {ata.criadoEm}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {ata.dataUrl && ata.dataUrl !== '#' && (
                        <a
                          href={ata.dataUrl}
                          download={ata.nomeArquivo}
                          className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-all"
                          title="Baixar Ata"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                      {isManager && (
                        <button
                          onClick={() => handleDeleteDoc(ata.id, true)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                          title="Excluir Ata"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: LINKS & DRIVE */}
        {activeTab === 'links' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0b1222] p-4 rounded-xl border border-slate-800">
              <div>
                <h3 className="text-xs font-black uppercase text-white flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-sky-400" /> Links e Pastas Compartilhadas na Nuvem
                </h3>
                <p className="text-[11px] text-slate-400">
                  Acesse pastas no Google Drive, OneDrive, SharePoint ou servidores de arquivos.
                </p>
              </div>
              <button
                onClick={() => setIsLinkModalOpen(true)}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" /> Adicionar Link Externo
              </button>
            </div>

            {(!currentEdition.linksUteis || currentEdition.linksUteis.length === 0) ? (
              <div className="bg-[#0b1222] border border-slate-800 rounded-xl p-8 text-center space-y-2">
                <LinkIcon className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400 font-bold">Nenhum link adicional cadastrado.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {currentEdition.linksUteis.map(link => (
                  <div key={link.id} className="bg-[#0b1222] p-3.5 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2.5 bg-sky-500/10 rounded-lg text-sky-400 shrink-0">
                        <ExternalLink className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white block truncate">{link.titulo}</span>
                        {link.descricao && <span className="text-[10px] text-slate-400 block truncate">{link.descricao}</span>}
                        <span className="text-[10px] text-sky-400 font-mono block truncate mt-0.5">{link.url}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-sky-600/20 text-sky-300 hover:bg-sky-600/30 rounded-lg font-mono text-[10px] font-bold uppercase transition-all flex items-center gap-1"
                      >
                        Acessar <ExternalLink className="w-3 h-3" />
                      </a>
                      <button
                        onClick={() => handleDeleteLink(link.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg transition-all cursor-pointer"
                        title="Remover Link"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: RESPONDER FORMULÁRIO DE CHECK DE RETENÇÃO */}
        {activeTab === 'check_retencao' && (
          <form onSubmit={handleSubmitColabQuiz} className="space-y-5">
            <div className="bg-[#0b1222] p-4 rounded-xl border border-slate-800 space-y-4">
              <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-black uppercase text-amber-400 flex items-center gap-2">
                    <UserCheck className="w-4 h-4" /> Form de Avaliação de Retenção ({activeSemestre} / {selectedAno})
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Selecione o colaborador e responda ao formulário de adestramento de qualidade.
                  </p>
                </div>

                {/* COLABORADOR SELECT */}
                <div className="w-full sm:w-72">
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Colaborador Avaliado *
                  </label>
                  <select
                    value={selectedColabMatricula}
                    onChange={(e) => setSelectedColabMatricula(e.target.value)}
                    className="w-full bg-[#111a30] border border-amber-500/40 rounded-xl p-2 text-xs text-amber-300 font-bold outline-none"
                  >
                    {LISTA_COLABORADORES_OFICIAIS.map(c => (
                      <option key={c.matricula} value={c.matricula}>
                        {c.nome} ({c.cargo})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* LISTA DE PERGUNTAS */}
              <div className="space-y-4">
                {(currentEdition.perguntasForm || []).map((p, idx) => (
                  <div key={p.id} className="bg-[#111a30] p-4 rounded-xl border border-slate-800 space-y-2">
                    <span className="text-[10px] font-black uppercase text-amber-400 block font-mono">
                      Questão {idx + 1} • Peso {p.peso}%
                    </span>
                    <p className="text-xs font-bold text-white">{p.enunciado}</p>

                    {p.tipo === 'multipla_escolha' && p.opcoes && (
                      <div className="space-y-1.5 pt-1">
                        {p.opcoes.map((opcao, oIdx) => (
                          <label
                            key={oIdx}
                            className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                              colabAnswers[p.id]?.opcaoIdx === oIdx
                                ? 'bg-amber-500/20 border-amber-500 text-white font-bold'
                                : 'bg-[#0b1222] border-slate-800 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`pergunta-${p.id}`}
                              checked={colabAnswers[p.id]?.opcaoIdx === oIdx}
                              onChange={() => setColabAnswers({
                                ...colabAnswers,
                                [p.id]: { opcaoIdx: oIdx }
                              })}
                              className="text-amber-500 focus:ring-0"
                            />
                            <span>{opcao}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {p.tipo === 'dissertativa' && (
                      <textarea
                        rows={2}
                        placeholder="Digite a resposta do colaborador..."
                        value={colabAnswers[p.id]?.texto || ''}
                        onChange={(e) => setColabAnswers({
                          ...colabAnswers,
                          [p.id]: { texto: e.target.value }
                        })}
                        className="w-full bg-[#0b1222] border border-slate-800 rounded-lg p-2.5 text-xs text-white outline-none focus:border-amber-400 mt-1"
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" /> Registrar Respostas do Colaborador
                </button>
              </div>
            </div>
          </form>
        )}

        {/* TAB 6: RANKING E RESPOSTAS DOS COLABORADORES */}
        {activeTab === 'respostas' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0b1222] p-4 rounded-xl border border-slate-800">
              <div>
                <h3 className="text-xs font-black uppercase text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-indigo-400" /> Aderência & Ranking de Retenção ({activeSemestre} / {selectedAno})
                </h3>
                <p className="text-[11px] text-slate-400">
                  Desempenho dos colaboradores no formulário da Semana da Qualidade.
                </p>
              </div>
            </div>

            {!currentEdition.respostasForm || currentEdition.respostasForm.length === 0 ? (
              <div className="bg-[#0b1222] border border-slate-800 rounded-xl p-8 text-center space-y-2">
                <Users className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400 font-bold">Nenhuma resposta registrada para este semestre ainda.</p>
              </div>
            ) : (
              <div className="overflow-x-auto bg-[#0b1222] rounded-xl border border-slate-800">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-[#111a30] text-[10px] font-black uppercase tracking-wider text-slate-400">
                      <th className="p-3">Colaborador</th>
                      <th className="p-3">Cargo</th>
                      <th className="p-3 font-mono">Data / Hora</th>
                      <th className="p-3 text-right">Nota de Retenção</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs">
                    {currentEdition.respostasForm.map(resp => (
                      <tr key={resp.id} className="hover:bg-slate-800/30 font-medium">
                        <td className="p-3 font-bold text-white">{resp.nomeColaborador}</td>
                        <td className="p-3 text-slate-300">{resp.cargo}</td>
                        <td className="p-3 font-mono text-slate-400 text-[11px]">{resp.dataHora}</td>
                        <td className="p-3 text-right">
                          <span className={`px-2.5 py-1 rounded-md font-mono font-black text-xs ${
                            resp.notaPercentual >= 80 
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                              : resp.notaPercentual >= 60 
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}>
                            {resp.notaPercentual}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

      {/* MODAL DE UPLOAD DE ARQUIVO */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111a30] border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black uppercase text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-emerald-400" /> Anexar Documento ({activeSemestre} / {selectedAno})
              </h3>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-black uppercase text-slate-300 mb-1">
                  Categoria do Documento
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value as any)}
                  className="w-full bg-[#0b1222] border border-slate-700 rounded-xl p-2.5 text-xs text-white font-bold outline-none"
                >
                  <option value="Apresentação / Slides">Apresentação / Slides (PDF, PPTX)</option>
                  <option value="Ata Assinada (PDF)">Ata Assinada (PDF de Lista de Presença)</option>
                  <option value="Material Didático / Apostila">Material Didático / Apostila</option>
                  <option value="Outros">Outros / Planilhas / Imagens</option>
                </select>
              </div>

              <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-2xl p-6 text-center space-y-2 bg-[#0b1222] transition-all">
                <Upload className="w-8 h-8 text-emerald-400 mx-auto animate-pulse" />
                <p className="text-xs font-bold text-white">Clique abaixo para selecionar arquivos no seu computador</p>
                <p className="text-[10px] text-slate-400 font-mono">Suporta PDF, Excel, Word, Imagens e Apresentações</p>
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload-input"
                />
                <label
                  htmlFor="file-upload-input"
                  className="inline-block mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all shadow-md"
                >
                  Selecionar Arquivos
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ADICIONAR LINK EXTERNO */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <form onSubmit={handleAddLink} className="bg-[#111a30] border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black uppercase text-white flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-sky-400" /> Adicionar Link Externo / Drive ({activeSemestre} / {selectedAno})
              </h3>
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-black uppercase text-slate-300 mb-1">
                  Título do Link *
                </label>
                <input
                  type="text"
                  value={linkTitulo}
                  onChange={(e) => setLinkTitulo(e.target.value)}
                  placeholder="Ex: Pasta de Fotos do Evento (Google Drive)"
                  className="w-full bg-[#0b1222] border border-slate-700 rounded-xl p-2.5 text-xs text-white outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-300 mb-1">
                  URL / Link Completo *
                </label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/..."
                  className="w-full bg-[#0b1222] border border-slate-700 rounded-xl p-2.5 text-xs text-sky-300 font-mono outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-300 mb-1">
                  Descrição Opcional
                </label>
                <input
                  type="text"
                  value={linkDesc}
                  onChange={(e) => setLinkDesc(e.target.value)}
                  placeholder="Ex: Contém vídeos dos treinamentos e fotos das atas"
                  className="w-full bg-[#0b1222] border border-slate-700 rounded-xl p-2.5 text-xs text-white outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 font-bold text-xs uppercase rounded-xl hover:bg-slate-700 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer"
              >
                Salvar Link
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}

// Fallback constant for 2026 2S default
const DEFAULT_SEM_2026_2S_CONST: SemanaSemestralEdicao = {
  id: 'sq-2026-2s',
  anoEdicao: '2026',
  semestre: '2S',
  titulo: 'Semana da Qualidade 2026 — 2º Semestre',
  assunto: 'Qualidade de Puxada, Pátio Seguro, Gestão de Devoluções e Repack',
  dataInicio: '2026-10-19',
  dataFim: '2026-10-23',
  caminhoPasta: 'C:\\Armazem\\Qualidade\\Semana_Qualidade_2026_2S',
  linkExterno: 'https://drive.google.com/drive/folders/semana_qualidade_2026_2s',
  status: 'Planejado',
  responsavel: 'Supervisão de Qualidade & Armazém',
  observacoes: 'Evento previsto para o 2º semestre preparando os times para o pico de vendas de fim de ano.',
  materiais: [],
  atasAssinadas: [],
  linksUteis: [],
  perguntasForm: DEFAULT_SEM_1S_2026.perguntasForm,
  respostasForm: [],
  criadoEm: '01/05/2026'
};
