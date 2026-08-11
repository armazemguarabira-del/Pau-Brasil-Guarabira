import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Calendar, 
  Clock, 
  Plus, 
  X, 
  FileText, 
  Paperclip, 
  Download, 
  Trash2, 
  Edit3, 
  Search, 
  Filter, 
  Check, 
  CheckCircle2, 
  AlertCircle, 
  Bell, 
  Sparkles, 
  BookOpen, 
  UserCheck, 
  RefreshCw, 
  Award, 
  ShieldCheck, 
  ExternalLink,
  ChevronRight,
  FileSpreadsheet,
  AlertTriangle,
  Upload,
  BarChart3,
  Sliders,
  Info
} from 'lucide-react';
import { safeGetLocalStorage, safeSetLocalStorage } from '../utils/safeLocalStorage';
import { LISTA_COLABORADORES_OFICIAIS } from './RankingModule';

export interface DocumentoAnexoReuniao {
  id: string;
  nomeArquivo: string;
  tipo: 'pdf' | 'excel' | 'word' | 'imagem' | 'outros';
  categoria: 'Apresentação / Material' | 'Ata Assinada (PDF)' | 'Outros Documentos';
  tamanhoKb: number;
  dataUrl: string;
  criadoEm: string;
  criadoPor: string;
}

export interface PresencaItem {
  matricula: string;
  nome: string;
  cargo: string;
  presente: boolean;
  convocado?: boolean;
  confirmadoPeloColaborador?: boolean;
  horarioConfirmacao?: string;
}

export interface OcorrenciaReuniao {
  id: string;
  reuniaoId: string; // Refers to TOR meeting ID
  dataISO: string; // YYYY-MM-DD
  dataFormatted: string; // DD/MM/YYYY
  hora: string;
  duracaoRealMin: number;
  facilitador: string;
  status: 'Realizada' | 'Não Realizada' | 'Cancelada';
  principaisAssuntos: string;
  listaPresenca: PresencaItem[];
  anexos: DocumentoAnexoReuniao[];
  criadoPor: string;
  criadoEm: string;
}

export interface FichaReuniaoTOR {
  id: string;
  numTOR: number;
  nome: string;
  area: 'Armazém' | 'SPO + DPO';
  frequencia: 'Diária' | 'Semanal' | 'Quinzenal' | 'Mensal';
  duracaoPadraoMin: number;
  dono: string;
  participantesPadrao: string[];
  local: string;
  objetivo: string;
  alertaEspecial?: string;
  metaOcorrenciasMes: number;
}

// 11 OFFICIAL CATALOGED MEETINGS FROM TOR (BOOK DE ATAS)
export const CATALOGO_REUNIOES_TOR: FichaReuniaoTOR[] = [
  {
    id: 'mpr-armazem-controle',
    numTOR: 1,
    nome: 'MPR Armazém / Controle',
    area: 'Armazém',
    frequencia: 'Mensal',
    duracaoPadraoMin: 90,
    dono: 'GOD (MPR Área)',
    participantesPadrao: ['GOD', 'COA', 'SOA', 'Sup. Controle', 'Coordenador de Controle', 'Analista de Controle'],
    local: 'Sala de Reuniões do Armazém',
    objetivo: 'Reunião Mensal de Performance (MPR) para avaliação de KPIs do armazém, aderência a processos de controle, avarias e planos de ação DPO.',
    metaOcorrenciasMes: 1
  },
  {
    id: 'rps-armazem-controle',
    numTOR: 2,
    nome: 'RPS Armazém / Controle',
    area: 'Armazém',
    frequencia: 'Semanal',
    duracaoPadraoMin: 90,
    dono: 'COA',
    participantesPadrao: ['GOD', 'Coordenador de Armazém', 'Supervisor de Armazém', 'Supervisor de Controle'],
    local: 'Sala de Treinamento DPO',
    objetivo: 'Reunião de Problemas e Soluções (RPS) semanal do Armazém e Controle para tratativa de desvios operacionais e análise de causa raiz (5 Porquês).',
    alertaEspecial: '⚠️ Na semana que antecede o inventário, a pauta de Pré-Inventário deve ser incluída nesta reunião. Na semana seguinte ao inventário, a pauta de Pós-Inventário deve ser incluída.',
    metaOcorrenciasMes: 4
  },
  {
    id: 'team-room-armazem-troca-turno',
    numTOR: 3,
    nome: 'Team Room Armazém (Troca de Turno)',
    area: 'Armazém',
    frequencia: 'Diária',
    duracaoPadraoMin: 15,
    dono: 'Facilitador',
    participantesPadrao: ['Amarradores', 'Operadores de Empilhadeira', 'Ajudantes de Armazém', 'Supervisor de Armazém', 'Conferentes'],
    local: 'Pátio Central / Quadro do Team Room',
    objetivo: 'Alinhamento diário de metas, DDS de segurança, passagem de bastão de trocas de turno e briefing de produtividade.',
    metaOcorrenciasMes: 22
  },
  {
    id: 'pre-team-room-armazem',
    numTOR: 4,
    nome: 'Pré Team Room Armazém',
    area: 'Armazém',
    frequencia: 'Mensal',
    duracaoPadraoMin: 40,
    dono: 'GOD',
    participantesPadrao: ['GOD', 'COD/COA/SOA', 'Motoristas', 'Ajudantes', 'Operador de Empilhadeira', 'Ajudante de Armazém', 'Conferentes', 'Facilitador'],
    local: 'Sala de Reuniões da Operação',
    objetivo: 'Alinhamento e preparação dos facilitadores e representantes para a pauta e indicadores do Team Room Mensal.',
    metaOcorrenciasMes: 1
  },
  {
    id: 'team-room-mensal-armazem',
    numTOR: 5,
    nome: 'Team Room Mensal Armazém',
    area: 'Armazém',
    frequencia: 'Mensal',
    duracaoPadraoMin: 40,
    dono: 'GOD',
    participantesPadrao: ['GOD', 'COD/COA/SOA', 'Operadores do Armazém', 'Facilitador'],
    local: 'Auditório / Pátio do Armazém',
    objetivo: 'Divulgação dos resultados consolidados do mês, reconhecimentos DPO e direcionamento do plano de ação para a equipe.',
    metaOcorrenciasMes: 1
  },
  {
    id: 'pre-pos-inventario',
    numTOR: 6,
    nome: 'Pré e Pós Inventário (SPO + DPO)',
    area: 'SPO + DPO',
    frequencia: 'Quinzenal',
    duracaoPadraoMin: 30,
    dono: 'GAF',
    participantesPadrao: ['GAF', 'GNS/SNS', 'GOD', 'Supervisor de Controle', 'Analista de Controle', 'Técnico de Controle', 'Supervisor Financeiro', 'Analista de Risco', 'Supervisor de Armazém', 'Coordenador de Armazém'],
    local: 'Sala de Gestão & Inventário',
    objetivo: 'Alinhamento estratégico das diretrizes de contagem, auditoria de corte de sistema, apuração de divergências e acerto pós-inventário.',
    metaOcorrenciasMes: 2
  },
  {
    id: 'rlp-limpa-pauta',
    numTOR: 7,
    nome: 'RLP — Reunião de Limpa Pauta (SPO + DPO)',
    area: 'SPO + DPO',
    frequencia: 'Semanal',
    duracaoPadraoMin: 45,
    dono: 'Toda a Liderança da Unidade',
    participantesPadrao: ['Todos os Gerentes da Operação', 'Gerente de Armazém', 'Gerente Financeiro', 'Gerente de Vendas'],
    local: 'Sala Principal da Unidade',
    objetivo: 'Tratativa semanal de pendências operacionais, prazos estourados de planos de ação corporativos e gestão de devoluções.',
    metaOcorrenciasMes: 4
  },
  {
    id: 'rns-nivel-servico',
    numTOR: 8,
    nome: 'RNS — Reunião de Nível de Serviço (SPO + DPO)',
    area: 'SPO + DPO',
    frequencia: 'Quinzenal',
    duracaoPadraoMin: 40,
    dono: 'GAF',
    participantesPadrao: ['GC Revenda', 'GAF', 'GNS', 'SNS', 'GOD', 'GVs'],
    local: 'Sala de Reuniões Comercial/Logística',
    objetivo: 'Avaliação do nível de serviço logístico (OTIF, devoluções, tempo de espera na frota e interface entre armazém e vendas).',
    metaOcorrenciasMes: 2
  },
  {
    id: 'kick-off',
    numTOR: 9,
    nome: 'KICK OFF (SPO + DPO)',
    area: 'SPO + DPO',
    frequencia: 'Mensal',
    duracaoPadraoMin: 120,
    dono: 'Gerente Comercial',
    participantesPadrao: ['Todos os Gerentes da Operação', 'Supervisores de Vendas', 'Supervisores Logísticos'],
    local: 'Auditório da Unidade',
    objetivo: 'Reunião mensal de alinhamento estratégico da revenda, lançamento de campanhas comerciais, metas e prioridades operacionais.',
    metaOcorrenciasMes: 1
  },
  {
    id: 'supermatinal-pex-day',
    numTOR: 10,
    nome: 'Supermatinal & PEX Day (SPO + DPO)',
    area: 'SPO + DPO',
    frequencia: 'Mensal',
    duracaoPadraoMin: 60,
    dono: 'GC',
    participantesPadrao: ['Toda a Revenda (Comercial, Armazém, Logística, Financeiro)'],
    local: 'Auditório / Pátio Central',
    objetivo: 'Celebração dos resultados mensais do Programa de Excelência (PEX), pilares DPO e alinhamento de diretrizes até o dia 10 de cada mês.',
    metaOcorrenciasMes: 1
  },
  {
    id: 'rpp-planejamento-pex',
    numTOR: 11,
    nome: 'RPP — Reunião de Planejamento do PEX (SPO + DPO)',
    area: 'SPO + DPO',
    frequencia: 'Mensal',
    duracaoPadraoMin: 90,
    dono: 'GC Revenda',
    participantesPadrao: ['GC Revenda', 'GVs', 'GOD', 'GG', 'GAF', 'GNS/SNS', 'TST', 'APR'],
    local: 'Sala do Conselho / DPO',
    objetivo: 'Planejamento mensal das pontuações DPO/SPO, auditoria de evidências do pilar e plano de ação de melhorias.',
    metaOcorrenciasMes: 1
  }
];

interface ReunioesComponentProps {
  user: any;
  empresaId?: string;
}

export const ReunioesComponent: React.FC<ReunioesComponentProps> = ({
  user,
  empresaId = 'demo'
}) => {
  const isManager = user?.papel === 'admin' || user?.papel === 'controle' || user?.isControle || 
                    (user?.cargo && (user.cargo.toLowerCase().includes('supervisor') || user.cargo.toLowerCase().includes('gestor') || user.cargo.toLowerCase().includes('coordenador')));

  // States
  const [fichas, setFichas] = useState<FichaReuniaoTOR[]>([]);
  const [ocorrencias, setOcorrencias] = useState<OcorrenciaReuniao[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>('overview'); // 'overview' or meeting ID

  // Filters for Master Overview
  const [filterArea, setFilterArea] = useState<'Todas' | 'Armazém' | 'SPO + DPO'>('Todas');
  const [filterMeetingId, setFilterMeetingId] = useState<string>('todas');
  const [filterMesAno, setFilterMesAno] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Modals state
  const [isNewOccurrenceModalOpen, setIsNewOccurrenceModalOpen] = useState(false);
  const [isEditFichaModalOpen, setIsEditFichaModalOpen] = useState(false);
  const [viewingOccurrence, setViewingOccurrence] = useState<OcorrenciaReuniao | null>(null);

  // New Occurrence Form State
  const [formMeetingId, setFormMeetingId] = useState<string>('mpr-armazem-controle');
  const [formDataISO, setFormDataISO] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formHora, setFormHora] = useState<string>('08:00');
  const [formDuracao, setFormDuracao] = useState<number>(60);
  const [formFacilitador, setFormFacilitador] = useState<string>(user?.nome || 'Líder DPO');
  const [formStatus, setFormStatus] = useState<'Realizada' | 'Não Realizada' | 'Cancelada'>('Realizada');
  const [formAssuntos, setFormAssuntos] = useState<string>('');
  const [formPresencas, setFormPresencas] = useState<PresencaItem[]>([]);
  const [formAnexos, setFormAnexos] = useState<DocumentoAnexoReuniao[]>([]);

  // Edit Ficha Form State
  const [editNome, setEditNome] = useState('');
  const [editObjetivo, setEditObjetivo] = useState('');
  const [editDono, setEditDono] = useState('');
  const [editLocal, setEditLocal] = useState('');
  const [editDuracao, setEditDuracao] = useState<number>(60);
  const [editFrequencia, setEditFrequencia] = useState<'Diária' | 'Semanal' | 'Quinzenal' | 'Mensal'>('Mensal');
  const [editParticipantesText, setEditParticipantesText] = useState('');

  // Initial Load from localStorage
  useEffect(() => {
    const savedFichas = safeGetLocalStorage<FichaReuniaoTOR[]>('af_tor_reunioes_fichas_v2', CATALOGO_REUNIOES_TOR);
    if (savedFichas && Array.isArray(savedFichas) && savedFichas.length > 0) {
      setFichas(savedFichas);
    } else {
      setFichas(CATALOGO_REUNIOES_TOR);
      safeSetLocalStorage('af_tor_reunioes_fichas_v2', CATALOGO_REUNIOES_TOR);
    }

    const savedOcorrencias = safeGetLocalStorage<OcorrenciaReuniao[]>('af_tor_reunioes_ocorrencias_v2', []);
    if (savedOcorrencias && Array.isArray(savedOcorrencias)) {
      setOcorrencias(savedOcorrencias);
    } else {
      // Create seed occurrence for RPS
      const seedOcorrencia: OcorrenciaReuniao = {
        id: 'oc-seed-1',
        reuniaoId: 'rps-armazem-controle',
        dataISO: new Date().toISOString().split('T')[0],
        dataFormatted: new Date().toLocaleDateString('pt-BR'),
        hora: '08:00',
        duracaoRealMin: 90,
        facilitador: 'Coordenador DPO',
        status: 'Realizada',
        principaisAssuntos: 'Análise de causas de avarias de Picking no setor 3. Definição do plano de ação de reorganização de baias e acompanhamento FEFO.',
        listaPresenca: LISTA_COLABORADORES_OFICIAIS.slice(0, 8).map(c => ({
          matricula: c.matricula,
          nome: c.nome,
          cargo: c.cargo,
          presente: true
        })),
        anexos: [
          {
            id: 'anexo-1',
            nomeArquivo: 'Ata_Assinada_RPS_Armazem_09_08_2026.pdf',
            tipo: 'pdf',
            categoria: 'Ata Assinada (PDF)',
            tamanhoKb: 1420,
            dataUrl: '#',
            criadoEm: new Date().toLocaleString('pt-BR'),
            criadoPor: 'Supervisão DPO'
          }
        ],
        criadoPor: user?.nome || 'Sistema',
        criadoEm: new Date().toLocaleString('pt-BR')
      };
      setOcorrencias([seedOcorrencia]);
      safeSetLocalStorage('af_tor_reunioes_ocorrencias_v2', [seedOcorrencia]);
    }
  }, []);

  const saveFichasToStorage = (updated: FichaReuniaoTOR[]) => {
    setFichas(updated);
    safeSetLocalStorage('af_tor_reunioes_fichas_v2', updated);
  };

  const saveOcorrenciasToStorage = (updated: OcorrenciaReuniao[]) => {
    setOcorrencias(updated);
    safeSetLocalStorage('af_tor_reunioes_ocorrencias_v2', updated);
  };

  // Currently selected meeting object
  const activeFicha = useMemo(() => {
    return fichas.find(f => f.id === selectedMeetingId) || null;
  }, [fichas, selectedMeetingId]);

  // Handle Open New Occurrence Modal
  const handleOpenNewOccurrence = (mId?: string) => {
    const targetId = mId || selectedMeetingId;
    const targetFicha = fichas.find(f => f.id === targetId) || fichas[0];

    setFormMeetingId(targetFicha.id);
    setFormDataISO(new Date().toISOString().split('T')[0]);
    setFormHora('08:00');
    setFormDuracao(targetFicha.duracaoPadraoMin);
    setFormFacilitador(user?.nome || 'Líder de Operações');
    setFormStatus('Realizada');
    setFormAssuntos('');
    setFormAnexos([]);

    // Initialize presence with official collaborators and convocation status
    const initPresences = LISTA_COLABORADORES_OFICIAIS.map(c => ({
      matricula: c.matricula,
      nome: c.nome,
      cargo: c.cargo,
      presente: true,
      convocado: true,
      confirmadoPeloColaborador: false
    }));
    setFormPresencas(initPresences);

    setIsNewOccurrenceModalOpen(true);
  };

  // Confirm collaborator attendance on active convocations
  const handleConfirmPresence = (occId: string) => {
    const timeNow = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const updated = ocorrencias.map(occ => {
      if (occ.id === occId) {
        const updatedList = occ.listaPresenca.map(p => {
          const userName = (user?.nome || '').toLowerCase();
          const match = p.nome.toLowerCase().includes(userName) || (user?.matricula && p.matricula === user.matricula) || p.convocado;
          if (match) {
            return {
              ...p,
              presente: true,
              confirmadoPeloColaborador: true,
              horarioConfirmacao: timeNow
            };
          }
          return p;
        });
        return { ...occ, listaPresenca: updatedList };
      }
      return occ;
    });

    saveOcorrenciasToStorage(updated);
    alert(`✅ Presença e assinatura confirmadas com sucesso às ${timeNow}!`);
  };

  // Handle Save New Occurrence
  const handleSaveOccurrence = (e: React.FormEvent) => {
    e.preventDefault();

    const targetFicha = fichas.find(f => f.id === formMeetingId) || fichas[0];
    const dateParts = formDataISO.split('-');
    const dateFmt = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

    const newOcc: OcorrenciaReuniao = {
      id: 'oc-' + Date.now(),
      reuniaoId: targetFicha.id,
      dataISO: formDataISO,
      dataFormatted: dateFmt,
      hora: formHora,
      duracaoRealMin: formDuracao,
      facilitador: formFacilitador.trim(),
      status: formStatus,
      principaisAssuntos: formAssuntos.trim(),
      listaPresenca: formPresencas,
      anexos: formAnexos,
      criadoPor: user?.nome || 'Operador',
      criadoEm: new Date().toLocaleString('pt-BR')
    };

    const updated = [newOcc, ...ocorrencias];
    saveOcorrenciasToStorage(updated);
    setIsNewOccurrenceModalOpen(false);

    alert(`✅ Reunião "${targetFicha.nome}" registrada com sucesso!`);
  };

  // File Upload Handler for Occurrence Modal
  const handleFileUploadOccurrence = (e: React.ChangeEvent<HTMLInputElement>, isAtaAssinada: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const newDoc: DocumentoAnexoReuniao = {
        id: 'doc-' + Date.now(),
        nomeArquivo: file.name,
        tipo: file.name.endsWith('.pdf') ? 'pdf' : file.name.endsWith('.xlsx') || file.name.endsWith('.xls') ? 'excel' : file.name.endsWith('.docx') ? 'word' : 'outros',
        categoria: isAtaAssinada ? 'Ata Assinada (PDF)' : 'Apresentação / Material',
        tamanhoKb: Math.round(file.size / 1024),
        dataUrl: reader.result as string,
        criadoEm: new Date().toLocaleString('pt-BR'),
        criadoPor: user?.nome || 'Operador'
      };

      setFormAnexos(prev => [newDoc, ...prev]);
    };
    reader.readAsDataURL(file);
  };

  // Handle Edit Ficha
  const handleOpenEditFicha = () => {
    if (!activeFicha) return;
    setEditNome(activeFicha.nome);
    setEditObjetivo(activeFicha.objetivo);
    setEditDono(activeFicha.dono);
    setEditLocal(activeFicha.local);
    setEditDuracao(activeFicha.duracaoPadraoMin);
    setEditFrequencia(activeFicha.frequencia);
    setEditParticipantesText(activeFicha.participantesPadrao.join(', '));
    setIsEditFichaModalOpen(true);
  };

  const handleSaveEditFicha = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFicha) return;

    const parts = editParticipantesText.split(',').map(s => s.trim()).filter(Boolean);

    const updatedFichas = fichas.map(f => {
      if (f.id === activeFicha.id) {
        return {
          ...f,
          nome: editNome.trim(),
          objetivo: editObjetivo.trim(),
          dono: editDono.trim(),
          local: editLocal.trim(),
          duracaoPadraoMin: editDuracao,
          frequencia: editFrequencia,
          participantesPadrao: parts
        };
      }
      return f;
    });

    saveFichasToStorage(updatedFichas);
    setIsEditFichaModalOpen(false);
  };

  // Calculations for Master Overview Table
  const filteredFichas = useMemo(() => {
    return fichas.filter(f => {
      if (filterArea !== 'Todas' && f.area !== filterArea) return false;
      if (filterMeetingId !== 'todas' && f.id !== filterMeetingId) return false;
      return true;
    });
  }, [fichas, filterArea, filterMeetingId]);

  // Helper to get occurrences for a specific meeting in selected period
  const getMeetingStatsForPeriod = (mId: string, ymFilter: string) => {
    const targetFicha = fichas.find(f => f.id === mId);
    const meta = targetFicha ? targetFicha.metaOcorrenciasMes : 1;

    const meetingOccs = ocorrencias.filter(o => o.reuniaoId === mId && o.dataISO.startsWith(ymFilter));
    const realizadas = meetingOccs.filter(o => o.status === 'Realizada').length;
    const aderencia = meta > 0 ? Math.min(100, Math.round((realizadas / meta) * 100)) : 100;

    // Get last occurrence overall
    const allOccsForMeeting = ocorrencias.filter(o => o.reuniaoId === mId).sort((a, b) => b.dataISO.localeCompare(a.dataISO));
    const lastOcc = allOccsForMeeting[0] || null;

    const hasAtaInLastOcc = lastOcc ? lastOcc.anexos.some(a => a.categoria === 'Ata Assinada (PDF)') : false;

    return {
      meta,
      realizadas,
      aderencia,
      lastOcc,
      hasAtaInLastOcc
    };
  };

  return (
    <div className="space-y-6 text-slate-100">
      
      {/* MASTER TOP BANNER */}
      <div className="border rounded-2xl p-6 relative overflow-hidden shadow-xl bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 border-indigo-800/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="flex items-start gap-4">
            <div className="p-3.5 bg-indigo-500/20 border border-indigo-500/30 rounded-2xl text-indigo-400 flex items-center justify-center shrink-0 shadow-inner">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300 bg-indigo-500/20 px-2.5 py-0.5 rounded-md border border-indigo-500/30">
                  Book de Atas TOR (Pau Brasil / Ambev)
                </span>
                <span className="text-[10px] font-bold text-emerald-400 font-mono">
                  11 Reuniões Oficiais Catalogadas
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight mt-1">
                Gestão de Reuniões, Fichas & Atas Assinadas
              </h1>
              <p className="text-xs text-slate-300 font-medium max-w-3xl mt-1 leading-relaxed">
                Plataforma oficial de controle de aderência (Meta x Real), lista de presenças e anexos de Atas em PDF das 11 reuniões corporativas da Unidade.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => handleOpenNewOccurrence()}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-lg flex items-center gap-2"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Registrar Nova Ocorrência</span>
            </button>
          </div>
        </div>
      </div>

      {/* BANNER DE CONVOCAÇÕES DE PRESENÇA ATIVAS PARA O COLABORADOR */}
      {ocorrencias.filter(occ => {
        const item = occ.listaPresenca?.find(p => 
          (p.nome && user?.nome && p.nome.toLowerCase().includes(user.nome.toLowerCase())) || 
          (user?.matricula && p.matricula === user.matricula) || 
          p.convocado
        );
        return item && !item.confirmadoPeloColaborador;
      }).slice(0, 3).map(occ => {
        const matchingFicha = fichas.find(f => f.id === occ.reuniaoId);
        return (
          <div key={occ.id} className="p-4 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 border-2 border-indigo-500 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xl">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30 shrink-0">
                <Users className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                    📢 Convocar Comparecimento / Assinatura de Presença
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {occ.dataFormatted} às {occ.hora}
                  </span>
                </div>
                <h4 className="text-sm sm:text-base font-black text-white uppercase mt-1">
                  {matchingFicha?.nome || 'Reunião e Treinamento Operacional'}
                </h4>
                <p className="text-xs text-slate-300 font-medium mt-0.5">
                  Facilitador: <strong className="text-amber-300">{occ.facilitador}</strong> — O responsável solicitou seu comparecimento e confirmação na Lista de Presença.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleConfirmPresence(occ.id)}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all cursor-pointer shrink-0 border border-emerald-300 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-slate-950" />
              <span>Assinar Lista de Presença</span>
            </button>
          </div>
        );
      })}

      {/* MASTER SUB-TABS SELECTOR */}
      <div className="p-2 rounded-2xl bg-[#0d1527] border border-slate-800 overflow-x-auto flex items-center gap-2 no-scrollbar">
        <button
          onClick={() => setSelectedMeetingId('overview')}
          className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
            selectedMeetingId === 'overview'
              ? 'bg-indigo-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-white bg-slate-900/60'
          }`}
        >
          <Filter className="w-4 h-4" />
          <span>Visão Geral Consolidada & Filtro</span>
        </button>

        <div className="w-px h-6 bg-slate-800 shrink-0" />

        {fichas.map((f) => {
          const stats = getMeetingStatsForPeriod(f.id, filterMesAno);
          const isSelected = selectedMeetingId === f.id;

          return (
            <button
              key={f.id}
              onClick={() => setSelectedMeetingId(f.id)}
              className={`px-3 py-2 rounded-xl font-bold text-[11px] transition-all shrink-0 flex items-center gap-2 cursor-pointer border ${
                isSelected
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-black'
                  : 'bg-[#111a30] border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                f.area === 'Armazém' ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'
              }`}>
                TOR {f.numTOR}
              </span>
              <span className="truncate max-w-[140px]">{f.nome}</span>
              <span className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded-full ${
                stats.aderencia >= 90 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
              }`}>
                {stats.aderencia}%
              </span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* VIEW MODE 1: MASTER CONSOLIDATED OVERVIEW & GENERAL FILTER (PARTE 3) */}
      {/* ========================================================================= */}
      {selectedMeetingId === 'overview' && (
        <div className="space-y-6">
          {/* GENERAL FILTER BAR */}
          <div className="p-5 rounded-2xl bg-[#111a30] border border-slate-800 space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-black uppercase text-white tracking-wider">
                  Filtro Geral de Aderência & Pendências (TOR)
                </h3>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                Exibindo {filteredFichas.length} de {fichas.length} Reuniões Catalogadas
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                  Filtrar por Área
                </label>
                <select
                  value={filterArea}
                  onChange={(e) => setFilterArea(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[#080d19] border border-slate-700 text-xs font-bold text-white rounded-xl outline-none"
                >
                  <option value="Todas">Todas as Áreas (Armazém + SPO/DPO)</option>
                  <option value="Armazém">Armazém / Controle</option>
                  <option value="SPO + DPO">SPO + DPO</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                  Filtrar por Reunião Específica
                </label>
                <select
                  value={filterMeetingId}
                  onChange={(e) => setFilterMeetingId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#080d19] border border-slate-700 text-xs font-bold text-white rounded-xl outline-none"
                >
                  <option value="todas">Todas as 11 Reuniões</option>
                  {fichas.map(f => (
                    <option key={f.id} value={f.id}>TOR {f.numTOR} - {f.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                  Período de Apuração (Mês/Ano)
                </label>
                <input
                  type="month"
                  value={filterMesAno}
                  onChange={(e) => setFilterMesAno(e.target.value)}
                  className="w-full px-3 py-2 bg-[#080d19] border border-slate-700 text-xs font-mono font-bold text-amber-300 rounded-xl outline-none"
                />
              </div>
            </div>
          </div>

          {/* CONSOLIDATED MEETING TABLE */}
          <div className="p-6 rounded-2xl bg-[#111a30] border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                Resumo Consolidado por Reunião ({filterMesAno})
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] uppercase font-black text-slate-400">
                    <th className="py-3 px-3">TOR #</th>
                    <th className="py-3 px-3">Reunião / Pauta</th>
                    <th className="py-3 px-3">Área</th>
                    <th className="py-3 px-3">Frequência</th>
                    <th className="py-3 px-3 text-center">Meta x Real</th>
                    <th className="py-3 px-3 text-center">% Aderência</th>
                    <th className="py-3 px-3">Última Ocorrência</th>
                    <th className="py-3 px-3 text-center">Ata Assinada PDF</th>
                    <th className="py-3 px-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredFichas.map((ficha) => {
                    const stats = getMeetingStatsForPeriod(ficha.id, filterMesAno);

                    return (
                      <tr key={ficha.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-amber-400">#{ficha.numTOR}</td>
                        <td className="py-3 px-3">
                          <div className="font-extrabold text-white">{ficha.nome}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-xs">{ficha.dono}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                            ficha.area === 'Armazém' 
                              ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' 
                              : 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                          }`}>
                            {ficha.area}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-300 font-medium">{ficha.frequencia}</td>
                        <td className="py-3 px-3 text-center font-mono font-bold">
                          {stats.realizadas} / {stats.meta}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-black font-mono inline-block ${
                            stats.aderencia >= 90
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : stats.aderencia >= 70
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}>
                            {stats.aderencia}%
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-300 font-mono text-[11px]">
                          {stats.lastOcc ? stats.lastOcc.dataFormatted : 'Nenhuma'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {!stats.lastOcc ? (
                            <span className="text-[10px] text-slate-500 font-mono">-</span>
                          ) : stats.hasAtaInLastOcc ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              <Check className="w-3 h-3" />
                              Anexada
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 animate-pulse">
                              <AlertCircle className="w-3 h-3" />
                              Pendente
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => setSelectedMeetingId(ficha.id)}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-[11px] cursor-pointer inline-flex items-center gap-1"
                          >
                            <span>Sub-Guia</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW MODE 2: DEDICATED MEETING SUB-TAB (PARTE 2 - BLOCKS 2.1, 2.2, 2.3, 2.4) */}
      {/* ========================================================================= */}
      {selectedMeetingId !== 'overview' && activeFicha && (
        <div className="space-y-6">
          
          {/* SPECIAL WARNING NOTICE FOR RPS ARMAZÉM / CONTROLE */}
          {activeFicha.alertaEspecial && (
            <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs font-bold flex items-start gap-3 shadow-lg">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-black text-amber-300 uppercase tracking-wider block mb-0.5">
                  Regra Especial TOR — RPS Armazém / Controle
                </span>
                <p className="leading-relaxed font-sans">{activeFicha.alertaEspecial}</p>
              </div>
            </div>
          )}

          {/* BLOCK 2.1: CABEÇALHO / FICHA DA REUNIÃO */}
          <div className="p-6 rounded-2xl bg-[#111a30] border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
                    TOR #{activeFicha.numTOR} • Ficha Cadastral da Reunião
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    {activeFicha.area}
                  </span>
                </div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight mt-1">
                  {activeFicha.nome}
                </h2>
              </div>

              {isManager && (
                <button
                  onClick={handleOpenEditFicha}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 rounded-xl font-bold text-xs uppercase cursor-pointer flex items-center gap-1.5"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Editar Ficha</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-3.5 rounded-xl bg-[#0d1527] border border-slate-800">
                <span className="text-[10px] font-black uppercase text-slate-400 block">Dono / Facilitador</span>
                <span className="text-xs font-bold text-sky-400 mt-0.5 block">{activeFicha.dono}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0d1527] border border-slate-800">
                <span className="text-[10px] font-black uppercase text-slate-400 block">Frequência</span>
                <span className="text-xs font-bold text-emerald-400 mt-0.5 block">{activeFicha.frequencia}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0d1527] border border-slate-800">
                <span className="text-[10px] font-black uppercase text-slate-400 block">Duração Padrão</span>
                <span className="text-xs font-bold text-purple-400 mt-0.5 block">{activeFicha.duracaoPadraoMin} minutos</span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0d1527] border border-slate-800">
                <span className="text-[10px] font-black uppercase text-slate-400 block">Local Padrão</span>
                <span className="text-xs font-bold text-amber-400 mt-0.5 block">{activeFicha.local}</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                Objetivo Oficial da Reunião
              </span>
              <p className="text-xs font-medium text-slate-200 leading-relaxed bg-[#080d19] p-3 rounded-xl border border-slate-800">
                {activeFicha.objetivo}
              </p>
            </div>

            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                Participantes Padrão Envolvidos
              </span>
              <div className="flex flex-wrap gap-1.5">
                {activeFicha.participantesPadrao.map((p, idx) => (
                  <span key={idx} className="text-[11px] font-bold text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* BLOCK 2.2: HISTÓRICO & ADERÊNCIA (META X REAL) */}
          <div className="p-6 rounded-2xl bg-[#111a30] border border-slate-800 space-y-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                  Bloco 2.2 — Indicadores & Ocorrências
                </span>
                <h3 className="text-lg font-black text-white uppercase tracking-tight mt-0.5">
                  Histórico de Ocorrências e Aderência
                </h3>
              </div>

              <button
                onClick={() => handleOpenNewOccurrence(activeFicha.id)}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-lg flex items-center gap-2"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Registrar Nova Ocorrência</span>
              </button>
            </div>

            {/* ADERENCIA KPI SUMMARY CARD */}
            {(() => {
              const stats = getMeetingStatsForPeriod(activeFicha.id, filterMesAno);
              return (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl border border-slate-800 bg-[#0d1527] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400">Meta no Mês</span>
                      <div className="text-2xl font-black text-amber-400 mt-1">{stats.meta} reunião(ões)</div>
                    </div>
                    <Calendar className="w-8 h-8 text-amber-400" />
                  </div>

                  <div className="p-4 rounded-xl border border-slate-800 bg-[#0d1527] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400">Realizadas</span>
                      <div className="text-2xl font-black text-emerald-400 mt-1">{stats.realizadas} reunião(ões)</div>
                    </div>
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  </div>

                  <div className="p-4 rounded-xl border border-slate-800 bg-[#0d1527] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400">% Aderência do Mês</span>
                      <div className="text-2xl font-black text-sky-400 mt-1">{stats.aderencia}%</div>
                    </div>
                    <BarChart3 className="w-8 h-8 text-sky-400" />
                  </div>
                </div>
              );
            })()}

            {/* OCORRÊNCIAS REGISTRADAS TABLE */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase text-slate-300 tracking-wider">
                Lista Cronológica de Ocorrências Registradas
              </h4>

              {ocorrencias.filter(o => o.reuniaoId === activeFicha.id).length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-800 rounded-2xl">
                  <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-400">Nenhuma ocorrência registrada para esta reunião.</p>
                  <button
                    onClick={() => handleOpenNewOccurrence(activeFicha.id)}
                    className="mt-3 px-4 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-emerald-400 cursor-pointer"
                  >
                    Lançar Primeira Ocorrência
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {ocorrencias
                    .filter(o => o.reuniaoId === activeFicha.id)
                    .sort((a, b) => b.dataISO.localeCompare(a.dataISO))
                    .map(occ => {
                      const hasAtaPDF = occ.anexos.some(a => a.categoria === 'Ata Assinada (PDF)');

                      return (
                        <div key={occ.id} className="p-5 rounded-2xl border border-slate-800 bg-[#0d1527] space-y-4 shadow-md">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                            <div className="flex items-center gap-3">
                              <span className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono font-black text-xs">
                                {occ.dataFormatted}
                              </span>
                              <div>
                                <h5 className="text-xs font-bold text-white">
                                  Facilitador: {occ.facilitador} ({occ.duracaoRealMin} min)
                                </h5>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  Registrado por {occ.criadoPor} em {occ.criadoEm}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {occ.status === 'Realizada' ? (
                                <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
                                  Realizada
                                </span>
                              ) : (
                                <span className="text-[10px] font-black uppercase text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded border border-rose-500/20">
                                  {occ.status}
                                </span>
                              )}

                              {hasAtaPDF ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
                                  <Check className="w-3.5 h-3.5" />
                                  Ata Anexada
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded border border-rose-500/20 animate-pulse">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  Ata Pendente
                                </span>
                              )}
                            </div>
                          </div>

                          {/* ASSUNTOS */}
                          <div>
                            <span className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">
                              Principais Assuntos Tratados
                            </span>
                            <p className="text-xs text-slate-200 leading-relaxed font-sans">
                              {occ.principaisAssuntos || 'Nenhuma pauta detalhada preenchida.'}
                            </p>
                          </div>

                          {/* LISTA DE PRESENÇA RESUMO & ANEXOS */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
                            {/* PRESENCA */}
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-black uppercase text-slate-400 block">
                                Lista de Presença ({occ.listaPresenca.filter(p => p.presente).length}/{occ.listaPresenca.length} presentes)
                              </span>
                              <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                                {occ.listaPresenca.map((p, idx) => (
                                  <span
                                    key={idx}
                                    className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                                      p.presente ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-500 border-slate-700 line-through'
                                    }`}
                                  >
                                    {p.nome}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* ANEXOS */}
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-black uppercase text-slate-400 block">
                                Documentos e Ata Assinada ({occ.anexos.length})
                              </span>
                              {occ.anexos.length === 0 ? (
                                <span className="text-[10px] font-mono text-rose-400 block">
                                  Nenhum arquivo anexado para esta ocorrência.
                                </span>
                              ) : (
                                <div className="space-y-1">
                                  {occ.anexos.map(a => (
                                    <div key={a.id} className="flex items-center justify-between p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                                      <span className="truncate text-white font-semibold text-[11px]">{a.nomeArquivo}</span>
                                      <a href={a.dataUrl} download={a.nomeArquivo} className="text-sky-400 hover:underline text-[10px] font-bold shrink-0">
                                        Baixar
                                      </a>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* MODAL: REGISTRAR NOVA OCORRÊNCIA */}
      {isNewOccurrenceModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-[#0d1527] border border-slate-700 rounded-2xl p-6 space-y-5 text-white max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black uppercase text-emerald-400">
                Registrar Ocorrência de Reunião
              </h3>
              <button onClick={() => setIsNewOccurrenceModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOccurrence} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-slate-300 block mb-1">Selecione a Reunião *</label>
                <select
                  value={formMeetingId}
                  onChange={(e) => setFormMeetingId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#080d19] border border-slate-700 text-amber-300 font-bold text-xs rounded-xl outline-none"
                >
                  {fichas.map(f => (
                    <option key={f.id} value={f.id}>TOR #{f.numTOR} - {f.nome}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-300 block mb-1">Data da Reunião *</label>
                  <input
                    type="date"
                    required
                    value={formDataISO}
                    onChange={(e) => setFormDataISO(e.target.value)}
                    className="w-full px-3 py-2 bg-[#080d19] border border-slate-700 text-white rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-300 block mb-1">Horário</label>
                  <input
                    type="time"
                    value={formHora}
                    onChange={(e) => setFormHora(e.target.value)}
                    className="w-full px-3 py-2 bg-[#080d19] border border-slate-700 text-white rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-300 block mb-1">Duração Real (min)</label>
                  <input
                    type="number"
                    value={formDuracao}
                    onChange={(e) => setFormDuracao(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#080d19] border border-slate-700 text-white rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-300 block mb-1">Facilitador / Condutor *</label>
                  <input
                    type="text"
                    required
                    value={formFacilitador}
                    onChange={(e) => setFormFacilitador(e.target.value)}
                    className="w-full px-3 py-2 bg-[#080d19] border border-slate-700 text-white rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-300 block mb-1">Status da Reunião</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#080d19] border border-slate-700 text-white font-bold text-xs rounded-xl"
                  >
                    <option value="Realizada">Realizada</option>
                    <option value="Não Realizada">Não Realizada</option>
                    <option value="Cancelada">Cancelada</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-300 block mb-1">Principais Assuntos Tratados</label>
                <textarea
                  rows={3}
                  value={formAssuntos}
                  onChange={(e) => setFormAssuntos(e.target.value)}
                  className="w-full p-3 bg-[#080d19] border border-slate-700 text-white rounded-xl text-xs font-sans"
                  placeholder="Resumo das tratativas e decisões tomadas na reunião..."
                />
              </div>

              {/* LISTA DE PRESENÇA E CONVOCAÇÃO STEP */}
              <div className="p-4 rounded-xl bg-[#080d19] border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-bold uppercase text-amber-400 block">
                      Lista de Presença & Convocação dos Colaboradores
                    </label>
                    <span className="text-[10px] text-slate-400 block">
                      Selecione quem deve comparecer para notificar e coletar assinatura na lista de presença
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const updated = formPresencas.map(p => ({ ...p, presente: true, convocado: true }));
                        setFormPresencas(updated);
                      }}
                      className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[10px] font-bold rounded-lg cursor-pointer"
                    >
                      Convocar Todos ({formPresencas.length})
                    </button>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {formPresencas.filter(p => p.presente).length} Marcado(s)
                    </span>
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-2">
                  {formPresencas.map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                      <div className="min-w-0 pr-2">
                        <span className="text-white font-medium block truncate">{p.nome} ({p.cargo})</span>
                        {p.confirmadoPeloColaborador && (
                          <span className="text-[9px] text-emerald-400 font-mono block">
                            ✓ Assinado pelo colaborador às {p.horarioConfirmacao || 'recém'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...formPresencas];
                            updated[idx].convocado = !updated[idx].convocado;
                            setFormPresencas(updated);
                          }}
                          className={`px-2 py-0.5 rounded font-bold text-[9px] cursor-pointer ${
                            p.convocado ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-slate-800 text-slate-500'
                          }`}
                        >
                          {p.convocado ? '📢 Convocado' : 'Sem Notif.'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...formPresencas];
                            updated[idx].presente = !updated[idx].presente;
                            setFormPresencas(updated);
                          }}
                          className={`px-2.5 py-1 rounded font-bold text-[10px] cursor-pointer ${
                            p.presente ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {p.presente ? '✓ Presente' : '✗ Ausente'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* UPLOAD ATA ASSINADA STEP */}
              <div className="p-4 rounded-xl bg-[#080d19] border border-slate-800 space-y-2">
                <label className="text-xs font-bold uppercase text-emerald-400 block">
                  Anexar Ata Assinada em PDF *
                </label>
                <input
                  type="file"
                  accept=".pdf,.xlsx,.docx,.png"
                  onChange={(e) => handleFileUploadOccurrence(e, true)}
                  className="w-full text-xs text-slate-300 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-500 file:text-slate-950 hover:file:bg-emerald-400 cursor-pointer"
                />
                {formAnexos.length > 0 && (
                  <div className="text-[10px] text-emerald-300 font-mono mt-1">
                    ✓ {formAnexos.length} arquivo(s) preparado(s) para upload.
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button type="button" onClick={() => setIsNewOccurrenceModalOpen(false)} className="px-4 py-2 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl">
                  Cancelar
                </button>
                <button type="submit" className="px-5 py-2 bg-emerald-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg">
                  Salvar Ocorrência
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR FICHA DA REUNIÃO */}
      {isEditFichaModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0d1527] border border-slate-700 rounded-2xl p-6 space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black uppercase text-amber-400">
                Editar Ficha do TOR #{activeFicha?.numTOR}
              </h3>
              <button onClick={() => setIsEditFichaModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditFicha} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-slate-300 block mb-1">Nome da Reunião</label>
                <input
                  type="text"
                  required
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                  className="w-full px-3 py-2 bg-[#080d19] border border-slate-700 text-white rounded-xl text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-300 block mb-1">Dono</label>
                  <input
                    type="text"
                    value={editDono}
                    onChange={(e) => setEditDono(e.target.value)}
                    className="w-full px-3 py-2 bg-[#080d19] border border-slate-700 text-white rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-300 block mb-1">Local</label>
                  <input
                    type="text"
                    value={editLocal}
                    onChange={(e) => setEditLocal(e.target.value)}
                    className="w-full px-3 py-2 bg-[#080d19] border border-slate-700 text-white rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-300 block mb-1">Objetivo Oficial</label>
                <textarea
                  rows={3}
                  value={editObjetivo}
                  onChange={(e) => setEditObjetivo(e.target.value)}
                  className="w-full p-2.5 bg-[#080d19] border border-slate-700 text-white rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-300 block mb-1">Participantes Padrão (separados por vírgula)</label>
                <input
                  type="text"
                  value={editParticipantesText}
                  onChange={(e) => setEditParticipantesText(e.target.value)}
                  className="w-full px-3 py-2 bg-[#080d19] border border-slate-700 text-white rounded-xl text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button type="button" onClick={() => setIsEditFichaModalOpen(false)} className="px-4 py-2 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl">
                  Cancelar
                </button>
                <button type="submit" className="px-5 py-2 bg-amber-500 text-slate-950 font-black text-xs uppercase rounded-xl">
                  Salvar Ficha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
