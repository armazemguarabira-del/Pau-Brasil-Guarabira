import React, { useState, useEffect } from 'react';
import { getStoredTempLogs, saveTempLogs } from '../utils/tempStorage';
import { 
  Usuario, 
  Empresa, 
  RepackRow, 
  DespejoRow, 
  QuebraRow, 
  ValidadeRow, 
  ArmazemRow, 
  BlitzRefugoRow, 
  Tarefa 
} from '../types';
import { 
  Users, 
  Layers, 
  Calendar, 
  ClipboardCheck, 
  Bell, 
  RefreshCw, 
  Trash2, 
  Truck, 
  AlertTriangle, 
  Search, 
  Package, 
  Activity,
  CheckCircle2,
  ShieldAlert,
  Briefcase,
  Clock,
  Sparkles,
  Shield,
  Sun,
  Moon,
  Megaphone,
  TrendingUp,
  Zap,
  Radio,
  Award,
  Target,
  Edit3,
  Sliders,
  Eye,
  Settings,
  BarChart3,
  Check,
  Plus,
  X,
  PlusCircle,
  FileText,
  Building2,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  FileSpreadsheet,
  Layers3,
  ListChecks,
  ExternalLink,
  ChevronDown,
  Filter,
  BookOpen,
  ShieldCheck,
  Camera,
  Thermometer,
  Droplets,
  AlertOctagon,
  History,
  UserCheck,
  Flame,
  TrendingDown,
  GitFork,
  Download
} from 'lucide-react';
import { QuadroDesviosEAcoes } from './QuadroDesviosEAcoes';
import AuditoriaDpoPanel from './AuditoriaDpoPanel';
import { PadraoOperacionalModal, OperationalModuleKey } from './PadraoOperacionalModal';
import { getSopForOperation, openPdfInNewTab, downloadPdfFile } from '../utils/sopUtils';
import { getUserRoleType } from '../utils/permissions';
import { Checklist5SModal, Audit5SRecord } from './Checklist5SModal';
import { Workstation5SSection } from './Workstation5SSection';
import { WorkstationCriticosRecolhimento } from './WorkstationCriticosRecolhimento';
import { AgendaExecutivoComponent } from './AgendaExecutivoComponent';
import { DiarioBordoComponent } from './DiarioBordoComponent';
import { ReunioesComponent } from './ReunioesComponent';
import { FluxogramaDemandasComponent } from './FluxogramaDemandasComponent';
import { WlpDashboard } from './WlpDashboard';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useEmpresaData } from '../context/EmpresaDataContext';
import { CADASTRO_MESTRE_COLABORADORES, ColaboradorRankingItem } from './RankingModule';
import { SWOT_FACTORS_2026 } from './DnSwotPanel';
import { getUserOperationPanel } from '../utils/permissions';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Bom dia';
  if (hour >= 12 && hour < 18) return 'Boa tarde';
  return 'Boa noite';
};

export interface Area5SOficial {
  id: string;
  area: string;
  responsavel: string;
  observacao: string;
  metaPct: number;
  realPctDefault: number;
}

export const LISTA_5S_OFICIAL: Area5SOficial[] = [
  { id: '1', area: 'PICKING', responsavel: 'DEJEAN', observacao: 'COLOCADO TODOS POR SER PRIMEIRA ATIVIDADE', metaPct: 80, realPctDefault: 85 },
  { id: '2', area: 'ÁREA DE CARREGAMENTO', responsavel: 'DEJEAN', observacao: 'COLOCADO TODOS POR SER PRIMEIRA ATIVIDADE', metaPct: 80, realPctDefault: 82 },
  { id: '3', area: 'CENTRAL', responsavel: 'DEJEAN', observacao: 'PRINCIPAL RESPONSAVEL', metaPct: 80, realPctDefault: 90 },
  { id: '4', area: 'DESPEJO', responsavel: 'OZENILDO', observacao: 'PRINCIPAL RESPONSAVEL', metaPct: 80, realPctDefault: 88 },
  { id: '5', area: 'ÁREA MKT PLACE', responsavel: 'OZENILDO', observacao: 'PRINCIPAL RESPONSAVEL', metaPct: 80, realPctDefault: 76 },
  { id: '6', area: 'PNC', responsavel: 'GLADSON', observacao: 'PRINCIPAL RESPONSAVEL', metaPct: 80, realPctDefault: 84 },
  { id: '7', area: 'RECICLÁVEIS', responsavel: 'DEJEAN', observacao: 'PRINCIPAL RESPONSAVEL', metaPct: 80, realPctDefault: 86 },
  { id: '8', area: 'REFUGO', responsavel: 'GLADSON', observacao: 'PRINCIPAL RESPONSAVEL', metaPct: 80, realPctDefault: 72 },
  { id: '9', area: 'DEVOLUÇÃO', responsavel: 'GLADSON', observacao: 'PRINCIPAL RESPONSAVEL', metaPct: 80, realPctDefault: 83 },
  { id: '10', area: 'REPACK', responsavel: 'OZENILDO', observacao: 'PRINCIPAL RESPONSAVEL', metaPct: 80, realPctDefault: 92 },
  { id: '11', area: 'ÁREA DE CARREGAMENTO DA EMPILHADEIRA', responsavel: 'PAULO', observacao: 'PRINCIPAL RESPONSAVEL', metaPct: 80, realPctDefault: 85 },
  { id: '12', area: 'EMPILHADEIRA 2', responsavel: 'RONILDO', observacao: 'PRINCIPAL RESPONSAVEL', metaPct: 80, realPctDefault: 95 },
  { id: '13', area: 'EMPILHADEIRA 1', responsavel: 'MARIVALDO', observacao: 'PRINCIPAL RESPONSAVEL', metaPct: 80, realPctDefault: 88 },
  { id: '14', area: 'FROTA DA ENTREGA', responsavel: 'DIOGENES', observacao: 'PRINCIPAL RESPONSAVEL', metaPct: 80, realPctDefault: 81 }
];

export interface ArmazemTemperaturaLog {
  id: string;
  dataISO: string;
  dataFormatted: string;
  mesAno: string;
  hora: string;
  temperatura: number;
  umidade: number;
  setor: string;
  conferenteNome: string;
  observacao?: string;
  alertaCritico: boolean;
}

const generateInitialTempLogs = (): ArmazemTemperaturaLog[] => {
  const list: ArmazemTemperaturaLog[] = [];
  const conferentes = ['Carlos Silva (Conferente)', 'Marcos Vinícius (Conferente)', 'José Fernandes (Conferente)'];
  
  // July 2026 (07/2026 - Mês Vigente)
  for (let day = 1; day <= 30; day++) {
    const dayStr = day < 10 ? `0${day}` : `${day}`;
    const dataISO = `2026-07-${dayStr}`;
    const dataFormatted = `${dayStr}/07/2026`;
    
    let temp = 24.5 + Math.sin(day * 0.7) * 2.2 + (day % 3 === 0 ? 0.8 : 0);
    temp = Number(temp.toFixed(1));
    let obs = 'Medição de rotina realizada em conformidade com o POP-LOG-015.';
    let alerta = false;

    if (day === 18) {
      temp = 28.7;
      obs = '⚠️ ELEVAÇÃO TÉRMICA: Pico de calor externo às 14h. Portão lateral mantido aberto para descarga de carreta.';
      alerta = true;
    } else if (day === 25) {
      temp = 28.3;
      obs = '⚠️ ALERTA DE TEMPERATURA: Registro levemente acima de 28°C. Exaustores acionados.';
      alerta = true;
    }

    list.push({
      id: `temp-2026-07-${dayStr}`,
      dataISO,
      dataFormatted,
      mesAno: '07/2026',
      hora: '14:00',
      temperatura: temp,
      umidade: Math.round(55 + Math.cos(day) * 5),
      setor: 'Armazém Central (Guarabira)',
      conferenteNome: conferentes[day % conferentes.length],
      observacao: obs,
      alertaCritico: alerta
    });
  }

  // June 2026 (06/2026)
  for (let day = 1; day <= 30; day++) {
    const dayStr = day < 10 ? `0${day}` : `${day}`;
    let temp = 25.0 + Math.cos(day * 0.5) * 1.8;
    temp = Number(temp.toFixed(1));
    let alerta = false;
    let obs = 'Aferição diária no horário padrão (14:00).';
    if (day === 12) {
      temp = 28.5;
      alerta = true;
      obs = '⚠️ Registro > 28°C no meio do mês de Junho.';
    }

    list.push({
      id: `temp-2026-06-${dayStr}`,
      dataISO: `2026-06-${dayStr}`,
      dataFormatted: `${dayStr}/06/2026`,
      mesAno: '06/2026',
      hora: '14:00',
      temperatura: temp,
      umidade: Math.round(58 + Math.sin(day) * 4),
      setor: 'Armazém Central (Guarabira)',
      conferenteNome: conferentes[day % conferentes.length],
      observacao: obs,
      alertaCritico: alerta
    });
  }

  // May 2026 (05/2026)
  for (let day = 1; day <= 31; day++) {
    const dayStr = day < 10 ? `0${day}` : `${day}`;
    let temp = 24.2 + Math.sin(day * 0.3) * 1.5;
    temp = Number(temp.toFixed(1));

    list.push({
      id: `temp-2026-05-${dayStr}`,
      dataISO: `2026-05-${dayStr}`,
      dataFormatted: `${dayStr}/05/2026`,
      mesAno: '05/2026',
      hora: '14:00',
      temperatura: temp,
      umidade: 56,
      setor: 'Armazém Central (Guarabira)',
      conferenteNome: conferentes[day % conferentes.length],
      observacao: 'Medição diária em conformidade - maio/2026.',
      alertaCritico: false
    });
  }

  return list;
};

interface DashboardOverviewProps {
  user: Usuario;
  empresa: Empresa | null;
  onNavigate: (tabId: string) => void;
  theme?: 'light' | 'dark';
  kpiStats: {
    usuarios: number;
    modulos: number;
    docsHoje: number;
    alertasFefo: number;
  };
  initialTab?: 'operacao' | '5s' | 'matriz' | 'desvios' | 'agenda' | 'diario_bordo' | 'reunioes' | 'fluxograma';
}

export default function DashboardOverview({
  user,
  empresa,
  onNavigate,
  theme,
  kpiStats,
  initialTab
}: DashboardOverviewProps) {
  // Unidade selector state (Guarabira is default, ready for future expansion)
  const [selectedUnidade, setSelectedUnidade] = useState<string>('GUARABIRA');
  const unidadesDisponiveis = ['GUARABIRA'];

  // User permission check
  const isSupervisorOrAdmin = user.isControle || user.papel === 'admin' || user.papel === 'controle' || user.papel === 'supervisor' || getUserRoleType(user) === 'admin';
  
  // View mode state: 'gestao' (Visão Executiva) vs 'operacional' (Visão Operador)
  const [viewMode, setViewMode] = useState<'gestao' | 'operacional'>(() => {
    return isSupervisorOrAdmin ? 'gestao' : 'operacional';
  });

  // Workstation Subtab Navigation
  const [workstationTab, setWorkstationTab] = useState<'operacao' | '5s' | 'matriz' | 'desvios' | 'agenda' | 'diario_bordo' | 'reunioes' | 'fluxograma' | 'wlp'>(() => {
    if (initialTab && (initialTab !== 'desvios' || isSupervisorOrAdmin)) {
      return initialTab;
    }
    return isSupervisorOrAdmin ? 'desvios' : 'operacao';
  });

  useEffect(() => {
    if (initialTab) {
      if (initialTab === 'desvios' && (!isSupervisorOrAdmin || viewMode === 'operacional')) {
        setWorkstationTab('operacao');
      } else {
        setWorkstationTab(initialTab);
      }
    } else if ((!isSupervisorOrAdmin || viewMode === 'operacional') && workstationTab === 'desvios') {
      setWorkstationTab('operacao');
    }
  }, [initialTab, isSupervisorOrAdmin, viewMode]);

  // Action Plans & Collections Data from Context (SINGLE SOURCE OF TRUTH)
  const empresaData = useEmpresaData();
  const [acoesList, setAcoesList] = useState<any[]>([]);

  useEffect(() => {
    if (empresaData?.acoes) {
      setAcoesList(empresaData.acoes);
    }
  }, [empresaData.acoes]);

  // ── KPIS DE SUSTENTABILIDADE MODAL & MATRIZ DE GOVERNANÇA CATEGORIZADA ──
  const [selectedKpiModal, setSelectedKpiModal] = useState<'engagement' | 'tri' | 'dpo' | 'otif' | 'obz' | null>(null);
  type GovCategory = 'geral' | 'setores' | 'quebras' | 'ajudantes' | 'empilhadores' | 'conferentes';
  const [govCategory, setGovCategory] = useState<GovCategory>('geral');

  const GOV_CATEGORIES: Record<GovCategory, {
    label: string;
    title: string;
    badge: string;
    defaultObjetivos: string[];
    defaultIC: string[];
    defaultIV: string[];
  }> = {
    geral: {
      label: '🌐 Geral Armazém',
      title: 'Visão Geral Operacional (Armazém Guarabira)',
      badge: 'Geral',
      defaultObjetivos: [
        'Produtividade de Picking ≥ 130 cx/h por operador.',
        'Acumulado de Quebras ≤ 0.15% sobre a movimentação total.',
        'Ressuprimento concluído em no máximo 20 minutos por palete.',
        'Acuracidade de estoque do armazém ≥ 99.5%.'
      ],
      defaultIC: [
        'Produtos com Shelf Life ≤ 15 dias no Armazém (FEFO urgente)',
        'Avaria elevada na Rua C (Picking Puxado em Curva)',
        'Trava de ressuprimento em paletes de alta rotatividade (Lata 350)'
      ],
      defaultIV: [
        'Execução rigorosa da regra FEFO no endereçamento e carregamento.',
        'Checklist diário de Empilhadeiras e Transpaleteiras antes do turno.',
        'Auditoria de amostragem de palete de saída antes do faturamento.'
      ]
    },
    setores: {
      label: '🏢 Por Setores',
      title: 'Desdobramento por Setor (Picking, Repack, Ressuprimento, Despejo, Recebimento)',
      badge: 'Setores',
      defaultObjetivos: [
        'Picking: Manter ritmo de separação ≥ 130 cx/h sem erros de lote.',
        'Repack: Reembalagem diária de 100% das caixas avariadas no turno.',
        'Ressuprimento: Antecipar 100% dos picos no aéreo antes do travamento.',
        'Despejo: Escoamento sanitário imediato com separação de vasilhame.'
      ],
      defaultIC: [
        'Lotes represados no setor de Repack sem destinação após 24h.',
        'Gargalo de movimentação nas ruas A e B por paletes caídos no chão.',
        'Lentidão na descarga de carretas de fábrica no setor de Recebimento.'
      ],
      defaultIV: [
        'Inspeção horária do fluxo de paletes nas baias de separação.',
        'Controle das caixas montadas/reembaladas por hora no Repack.',
        'Higienização diária e lavagem das calhas de despejo de produto.'
      ]
    },
    quebras: {
      label: '💥 Quebras & Avarias',
      title: 'Controle de Quebras de Vasilhame e Embalagem (IC/IV de Avarias)',
      badge: 'Avarias',
      defaultObjetivos: [
        'Índice total de quebras internas ≤ 0.15% sobre o faturamento.',
        'Zero tombos de paletes por manobra brusca de equipamentos.',
        'Acondicionamento imediato de garrafas avariadas com isolamento.'
      ],
      defaultIC: [
        'Manobras em alta velocidade com transpaleteira transportando Vidro 600ml.',
        'Paletização sem filme stretch nas 3 fiadas superiores de garrafas.',
        'Manuseio direto de cacos sem luvas de proteção anticorte de alta densidade.'
      ],
      defaultIV: [
        'Verificação da amarração com filme stretch antes de movimentar qualquer palete.',
        'Varredura e sanitização imediata da área de quebra com kit de segurança.',
        'Lançamento fotográfico e apontamento da causa raiz de cada garrafa avariada.'
      ]
    },
    ajudantes: {
      label: '👥 Ajudantes',
      title: 'Matriz IC e IV dos Ajudantes de Armazém',
      badge: 'Ajudantes',
      defaultObjetivos: [
        'Montagem manual de paletes seguindo 100% o gabarito oficial DPO.',
        'Passagem de filme stretch firme cobrindo da base até o topo.',
        'Manutenção da limpeza e organização da posição de picking (5S).'
      ],
      defaultIC: [
        'Inversão de caixas e erro de contagem por fiada no palete de saída.',
        'Ausência de luva anticorte e calçado com biqueira durante o manuseio.',
        'Mistura de lotes com datas de validade diferentes no mesmo palete.'
      ],
      defaultIV: [
        'Checklist individual de inicio de turno de EPIs e ferramentas de corte.',
        'Conferência visual de amarração e estiramento de filme stretch.',
        'Etiquetagem com código de barras de 100% dos paletes montados.'
      ]
    },
    empilhadores: {
      label: '🚜 Empilhadores',
      title: 'Matriz IC e IV dos Operadores de Empilhadeira',
      badge: 'Empilhadores',
      defaultObjetivos: [
        'Tráfego seguro dentro do limite máximo de velocidade de 10 km/h.',
        'Ressuprimento aéreo concluído em no máximo 20 minutos por viagem.',
        '100% de preenchimento do checklist mecânico e hidráulico antes do turno.'
      ],
      defaultIC: [
        'Elevação de paletes de latas/garrafas desalinhados no garfo.',
        'Circular em corredores com pedestres sem acionar a buzina de alerta.',
        'Operação com vazamento de óleo hidráulico ou lâmpada/sinalizador com defeito.'
      ],
      defaultIV: [
        'Preenchimento diário do cartão de checklist da máquina no início da jornada.',
        'Isolamento com corrente de sinalização no corredor do ressuprimento.',
        'Verificação de nível do cilindro GLP/carga de bateria e freios.'
      ]
    },
    conferentes: {
      label: '📋 Conferentes',
      title: 'Matriz IC e IV dos Conferentes de Armazém',
      badge: 'Conferentes',
      defaultObjetivos: [
        '100% de acuracidade na conferência cega das carretas e frota.',
        'Cumprimento rigoroso da regra FEFO (Primeiro que Vence, Primeiro que Sai).',
        'Registro diário da temperatura do armazém às 14:00 impreterivelmente.'
      ],
      defaultIC: [
        'Liberação de mapa de faturamento com divergência física vs sistema.',
        'Embarque de palete com produto fora do prazo mínimo de shelf life.',
        'Falta do registro da temperatura do armazém no painel da Qualidade.'
      ],
      defaultIV: [
        'Conferência cega por coletor/papel antes do fechamento do SRO.',
        'Validação de amostragem de lote e código de barras em 100% das notas.',
        'Aferição diária e lançamento no sistema da temperatura às 14:00.'
      ]
    }
  };

  // ── MATRIZ DE GOVERNANÇA (EDITABLE STATES PER CATEGORY) ──
  const [catObjetivos, setCatObjetivos] = useState<Record<GovCategory, string[]>>(() => {
    try {
      const saved = localStorage.getItem('gov_cat_objetivos');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      geral: GOV_CATEGORIES.geral.defaultObjetivos,
      setores: GOV_CATEGORIES.setores.defaultObjetivos,
      quebras: GOV_CATEGORIES.quebras.defaultObjetivos,
      ajudantes: GOV_CATEGORIES.ajudantes.defaultObjetivos,
      empilhadores: GOV_CATEGORIES.empilhadores.defaultObjetivos,
      conferentes: GOV_CATEGORIES.conferentes.defaultObjetivos,
    };
  });

  const [catIC, setCatIC] = useState<Record<GovCategory, string[]>>(() => {
    try {
      const saved = localStorage.getItem('gov_cat_ic');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      geral: GOV_CATEGORIES.geral.defaultIC,
      setores: GOV_CATEGORIES.setores.defaultIC,
      quebras: GOV_CATEGORIES.quebras.defaultIC,
      ajudantes: GOV_CATEGORIES.ajudantes.defaultIC,
      empilhadores: GOV_CATEGORIES.empilhadores.defaultIC,
      conferentes: GOV_CATEGORIES.conferentes.defaultIC,
    };
  });

  const [catIV, setCatIV] = useState<Record<GovCategory, string[]>>(() => {
    try {
      const saved = localStorage.getItem('gov_cat_iv');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      geral: GOV_CATEGORIES.geral.defaultIV,
      setores: GOV_CATEGORIES.setores.defaultIV,
      quebras: GOV_CATEGORIES.quebras.defaultIV,
      ajudantes: GOV_CATEGORIES.ajudantes.defaultIV,
      empilhadores: GOV_CATEGORIES.empilhadores.defaultIV,
      conferentes: GOV_CATEGORIES.conferentes.defaultIV,
    };
  });

  const objetivosList = catObjetivos[govCategory] || [];
  const icList = catIC[govCategory] || [];
  const ivList = catIV[govCategory] || [];

  const [newObjInput, setNewObjInput] = useState('');
  const [newIcInput, setNewIcInput] = useState('');
  const [newIvInput, setNewIvInput] = useState('');

  const handleRemoveObjetivo = (index: number) => {
    const currentList = catObjetivos[govCategory] || [];
    const updatedList = currentList.filter((_, i) => i !== index);
    const updatedMap = { ...catObjetivos, [govCategory]: updatedList };
    setCatObjetivos(updatedMap);
    localStorage.setItem('gov_cat_objetivos', JSON.stringify(updatedMap));
  };

  const handleAddObjetivo = () => {
    if (!newObjInput.trim()) return;
    const currentList = catObjetivos[govCategory] || [];
    const updatedList = [...currentList, newObjInput.trim()];
    const updatedMap = { ...catObjetivos, [govCategory]: updatedList };
    setCatObjetivos(updatedMap);
    localStorage.setItem('gov_cat_objetivos', JSON.stringify(updatedMap));
    setNewObjInput('');
  };

  const handleEditObjetivo = (index: number) => {
    const currentList = catObjetivos[govCategory] || [];
    const val = currentList[index];
    const newVal = prompt('Editar Objetivo:', val);
    if (newVal !== null && newVal.trim() !== '') {
      const updatedList = [...currentList];
      updatedList[index] = newVal.trim();
      const updatedMap = { ...catObjetivos, [govCategory]: updatedList };
      setCatObjetivos(updatedMap);
      localStorage.setItem('gov_cat_objetivos', JSON.stringify(updatedMap));
    }
  };

  const handleRemoveIC = (index: number) => {
    const currentList = catIC[govCategory] || [];
    const updatedList = currentList.filter((_, i) => i !== index);
    const updatedMap = { ...catIC, [govCategory]: updatedList };
    setCatIC(updatedMap);
    localStorage.setItem('gov_cat_ic', JSON.stringify(updatedMap));
  };

  const handleAddIC = () => {
    if (!newIcInput.trim()) return;
    const currentList = catIC[govCategory] || [];
    const updatedList = [...currentList, newIcInput.trim()];
    const updatedMap = { ...catIC, [govCategory]: updatedList };
    setCatIC(updatedMap);
    localStorage.setItem('gov_cat_ic', JSON.stringify(updatedMap));
    setNewIcInput('');
  };

  const handleEditIC = (index: number) => {
    const currentList = catIC[govCategory] || [];
    const val = currentList[index];
    const newVal = prompt('Editar Item Crítico (IC):', val);
    if (newVal !== null && newVal.trim() !== '') {
      const updatedList = [...currentList];
      updatedList[index] = newVal.trim();
      const updatedMap = { ...catIC, [govCategory]: updatedList };
      setCatIC(updatedMap);
      localStorage.setItem('gov_cat_ic', JSON.stringify(updatedMap));
    }
  };

  const handleRemoveIV = (index: number) => {
    const currentList = catIV[govCategory] || [];
    const updatedList = currentList.filter((_, i) => i !== index);
    const updatedMap = { ...catIV, [govCategory]: updatedList };
    setCatIV(updatedMap);
    localStorage.setItem('gov_cat_iv', JSON.stringify(updatedMap));
  };

  const handleAddIV = () => {
    if (!newIvInput.trim()) return;
    const currentList = catIV[govCategory] || [];
    const updatedList = [...currentList, newIvInput.trim()];
    const updatedMap = { ...catIV, [govCategory]: updatedList };
    setCatIV(updatedMap);
    localStorage.setItem('gov_cat_iv', JSON.stringify(updatedMap));
    setNewIvInput('');
  };

  const handleEditIV = (index: number) => {
    const currentList = catIV[govCategory] || [];
    const val = currentList[index];
    const newVal = prompt('Editar Item de Verificação (IV):', val);
    if (newVal !== null && newVal.trim() !== '') {
      const updatedList = [...currentList];
      updatedList[index] = newVal.trim();
      const updatedMap = { ...catIV, [govCategory]: updatedList };
      setCatIV(updatedMap);
      localStorage.setItem('gov_cat_iv', JSON.stringify(updatedMap));
    }
  };

  // Action plan modal for low performers
  const [actionModalColab, setActionModalColab] = useState<{ nome: string; setor: string; matricula: string } | null>(null);
  const [actionTitle, setActionTitle] = useState('');
  const [actionDesc, setActionDesc] = useState('');

  // Modals POP and 5S
  const [popModalKey, setPopModalKey] = useState<OperationalModuleKey | null>(null);
  const [popRefreshKey, setPopRefreshKey] = useState(0);
  const [is5SModalOpen, setIs5SModalOpen] = useState(false);
  const [selected5SSetor, setSelected5SSetor] = useState('Repack');

  useEffect(() => {
    const handlePopUpdate = () => {
      setPopRefreshKey(prev => prev + 1);
    };
    window.addEventListener('af_pop_updated', handlePopUpdate);
    window.addEventListener('storage', handlePopUpdate);
    return () => {
      window.removeEventListener('af_pop_updated', handlePopUpdate);
      window.removeEventListener('storage', handlePopUpdate);
    };
  }, []);
  const [audits5S, setAudits5S] = useState<Audit5SRecord[]>(() => {
    try {
      const saved = localStorage.getItem('af_5s_audits');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const handle5SUpdate = () => {
      try {
        const saved = localStorage.getItem('af_5s_audits');
        setAudits5S(saved ? JSON.parse(saved) : []);
      } catch {
        // ignore
      }
    };
    window.addEventListener('5s_audit_updated', handle5SUpdate);
    return () => window.removeEventListener('5s_audit_updated', handle5SUpdate);
  }, []);

  // 5S Table filter mode
  const [filter5SMode, setFilter5SMode] = useState<'todos' | 'atingiram' | 'fora'>('todos');

  // Temperature control state
  const [activeTempTab, setActiveTempTab] = useState<'vigente' | 'retroativo'>('vigente');
  const [selectedRetroactiveMonth, setSelectedRetroactiveMonth] = useState<string>('06/2026');
  const [selectedTempDayId, setSelectedTempDayId] = useState<string | null>(null);

  const [tempLogs, setTempLogs] = useState<ArmazemTemperaturaLog[]>(() => {
    return getStoredTempLogs();
  });

  // Conferente Form inputs
  const [newTempData, setNewTempData] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newTempHora, setNewTempHora] = useState<string>('14:00');
  const [newTempValor, setNewTempValor] = useState<string>('');
  const [newTempUmidade, setNewTempUmidade] = useState<string>('58');
  const [newTempSetor, setNewTempSetor] = useState<string>('Armazém Central - Posição 1');
  const [newTempConferente, setNewTempConferente] = useState<string>(user?.nome || 'Conferente Responsável');
  const [newTempObs, setNewTempObs] = useState<string>('');
  const [showConferenteForm, setShowConferenteForm] = useState<boolean>(false);

  const handleSaveTemperatureRecord = (e: React.FormEvent) => {
    e.preventDefault();
    const tempNum = parseFloat(newTempValor);
    if (isNaN(tempNum)) {
      alert('Por favor, informe um valor de temperatura válido em °C.');
      return;
    }

    const umidNum = parseInt(newTempUmidade, 10) || 55;
    const parts = newTempData.split('-');
    const dataFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
    const mesAno = `${parts[1]}/${parts[0]}`;
    const isAlerta = tempNum > 28.0;

    const newEntry: ArmazemTemperaturaLog = {
      id: `temp-${Date.now()}`,
      dataISO: newTempData,
      dataFormatted,
      mesAno,
      hora: newTempHora || '14:00',
      temperatura: tempNum,
      umidade: umidNum,
      setor: newTempSetor || 'Armazém Central',
      conferenteNome: newTempConferente.trim() || 'Conferente Responsável',
      observacao: newTempObs.trim() || (isAlerta ? '⚠️ ALERTA DE TEMPERATURA EXCEDIDA (> 28°C)' : 'Medição diária registrada com sucesso'),
      alertaCritico: isAlerta
    };

    const updated = [newEntry, ...tempLogs];
    saveTempLogs(updated);
    setTempLogs(getStoredTempLogs());

    setNewTempValor('');
    setNewTempObs('');
    setShowConferenteForm(false);
    alert(`✅ Medição de ${tempNum}°C registrada com sucesso para o dia ${dataFormatted}!${isAlerta ? ' ⚠️ ALERTA: Temperatura superior a 28°C!' : ''}`);
  };

  const handleCreateActionForColab = async () => {
    if (!actionModalColab || !actionTitle.trim()) return;
    try {
      if (empresaData?.addAcao) {
        await empresaData.addAcao({
          titulo: actionTitle,
          descricao: `Ação para ${actionModalColab.nome} (${actionModalColab.matricula}) no setor ${actionModalColab.setor}: ${actionDesc}`,
          responsavel: actionModalColab.nome,
          setor: actionModalColab.setor,
          prazo: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
          status: 'pendente'
        });
      }
      alert(`✅ Plano de Ação criado com sucesso para ${actionModalColab.nome}!`);
      setActionModalColab(null);
      setActionTitle('');
      setActionDesc('');
    } catch (e) {
      alert('Erro ao criar plano de ação: ' + e);
    }
  };

  // ── DYNAMIC CONSOLIDATION FROM REAL MODULE RECORDS ──
  const moduleMetrics = React.useMemo(() => {
    // 1. Picking (from empresaData.tarefas)
    const pickingTarefas = empresaData.tarefas || [];
    const totalPickingPaletes = pickingTarefas.reduce((sum, t) => sum + Number(t.quantidadePaletes || t.caixas || 1), 0);
    const completedPicking = pickingTarefas.filter(t => t.status === 'done' || t.status === 'concluida');
    
    let pickingCxH = 138; // standard baseline
    if (completedPicking.length > 0) {
      const totalExecMin = completedPicking.reduce((sum, t) => sum + Number(t.tempoExecucao || 15), 0);
      const hours = Math.max(0.1, totalExecMin / 60);
      const totalCaixas = completedPicking.reduce((sum, t) => sum + (Number(t.quantidadePaletes || 1) * 30), 0);
      pickingCxH = Math.round(totalCaixas / hours);
    }

    // 2. Repack (from empresaData.repack)
    const repackRows = empresaData.repack || [];
    const totalRepackCaixas = repackRows.reduce((sum, r) => sum + Number(r.caixasReembaladas || r.caixas || r.quantidade || 0), 0);
    let repackCxH = 88;
    if (repackRows.length > 0) {
      repackCxH = Math.min(150, Math.max(40, Math.round(totalRepackCaixas > 0 ? (totalRepackCaixas / Math.max(1, repackRows.length)) * 12 : 88)));
    }

    // 3. Quebras (from empresaData.quebras)
    const quebrasRows = empresaData.quebras || [];
    const totalQuebrasValor = quebrasRows.reduce((sum, q) => sum + Number(q.valorTotal || q.valor || 0), 0);
    const totalQuebrasCaixas = quebrasRows.reduce((sum, q) => sum + Number(q.caixas || q.quantidade || 0), 0);
    let quebrasPct = 0.08;
    if (quebrasRows.length > 0) {
      quebrasPct = Math.min(2.0, Math.max(0.01, Math.round((totalQuebrasCaixas / Math.max(100, (totalPickingPaletes || 10) * 30)) * 10000) / 100));
    }

    // 4. FEFO / Validades (from empresaData.validades)
    const validadesRows = empresaData.validades || [];
    const criticosFefo = validadesRows.filter(v => Number(v.diasParaVencer || 99) <= 15).length;
    let fefoCompliancePct = 99.8;
    if (validadesRows.length > 0) {
      fefoCompliancePct = Math.round(((validadesRows.length - criticosFefo) / validadesRows.length) * 1000) / 10;
    }

    // 5. Ressuprimento (from empresaData.tarefas filter tipo ressuprimento)
    const ressuprimentoTasks = pickingTarefas.filter(t => (t.descricao || '').toLowerCase().includes('ressuprimento'));
    let ressuprimentoTempo = 16.5;
    if (ressuprimentoTasks.length > 0) {
      const avgTempo = ressuprimentoTasks.reduce((sum, t) => sum + Number(t.tempoExecucao || 15), 0) / ressuprimentoTasks.length;
      ressuprimentoTempo = Math.round(avgTempo * 10) / 10;
    }

    // 6. Capacidade (from empresaData.armazem)
    const armazemRows = empresaData.armazem || [];
    let capacidadePct = 84.2;
    if (armazemRows.length > 0) {
      const ocupadas = armazemRows.filter(a => a.status === 'Ocupada' || a.ocupado).length;
      capacidadePct = Math.round((ocupadas / armazemRows.length) * 1000) / 10;
    }

    // 7. Despejo (from empresaData.despejo)
    const despejoRows = empresaData.despejo || [];
    let despejoAproveitamento = 94.5;
    if (despejoRows.length > 0) {
      const aproveitados = despejoRows.filter(d => d.status === 'Aproveitado' || d.aproveitado).length;
      despejoAproveitamento = Math.round((aproveitados / despejoRows.length) * 1000) / 10;
    }

    // 8. Logística EFC/EFD
    const logisticaPct = 98.2;

    // 9. Eficiência de Montagem
    const montagemPct = 106.8;

    // Build the 12 processes dynamic status array
    const processes = [
      { id: 'picking-dashboard', title: 'Picking', icon: 'Package', val: `${pickingCxH} cx/h`, meta: '130 cx/h', hit: pickingCxH >= 130, pct: (pickingCxH / 130) * 100 },
      { id: 'repack-dashboard', title: 'Repack', icon: 'RefreshCw', val: `${repackCxH} cx/h`, meta: '80 cx/h', hit: repackCxH >= 80, pct: (repackCxH / 80) * 100 },
      { id: 'quebras-dashboard', title: 'Quebras', icon: 'AlertTriangle', val: `${quebrasPct}%`, meta: '0.15%', hit: quebrasPct <= 0.15, pct: (0.15 / Math.max(0.01, quebrasPct)) * 100 },
      { id: 'fefo-dashboard', title: 'FEFO / Validades', icon: 'Calendar', val: `${fefoCompliancePct}%`, meta: '100%', hit: fefoCompliancePct >= 99, pct: fefoCompliancePct },
      { id: 'simulador-ressuprimento', title: 'Ressuprimento', icon: 'Truck', val: `${ressuprimentoTempo} min`, meta: '20 min', hit: ressuprimentoTempo <= 20, pct: (20 / Math.max(1, ressuprimentoTempo)) * 100 },
      { id: 'gestao-capacidade', title: 'Capacidade', icon: 'Layers', val: `${capacidadePct}%`, meta: '85.0%', hit: capacidadePct <= 85.5, pct: (capacidadePct / 85) * 100 },
      { id: 'despejo-dashboard', title: 'Despejo', icon: 'Trash2', val: `${despejoAproveitamento}%`, meta: '90.0%', hit: despejoAproveitamento >= 90, pct: (despejoAproveitamento / 90) * 100 },
      { id: 'logistica-dashboard', title: 'EFC / EFD', icon: 'Truck', val: `${logisticaPct}%`, meta: '95.0%', hit: logisticaPct >= 95, pct: (logisticaPct / 95) * 100 },
      { id: 'eficiencia-montagem', title: 'Montagem', icon: 'Zap', val: `${montagemPct}%`, meta: '100%', hit: montagemPct >= 100, pct: montagemPct },
      { id: 'politica-estoque', title: 'Politica Estoque', icon: 'BarChart3', val: validadesRows.length > 0 && criticosFefo > 0 ? 'Atenção' : 'Ideal', meta: 'Ideal', hit: criticosFefo === 0, pct: criticosFefo === 0 ? 100 : 90 },
      { id: 'dados-retroativos', title: 'Histórico', icon: 'Clock', val: empresaData.loaded ? 'Sincronizado' : 'Carregando', meta: 'Ativo', hit: true, pct: 100 },
      { id: 'kpi-arvore', title: 'Árvore KPI', icon: 'Activity', val: 'Consolidado', meta: 'OK', hit: true, pct: 100 }
    ];

    const hitCount = processes.filter(p => p.hit).length;
    const avgPerf = Math.round((processes.reduce((acc, p) => acc + Math.min(125, p.pct), 0) / processes.length) * 10) / 10;
    const triggersCount = (quebrasPct > 0.15 ? 1 : 0) + (criticosFefo > 0 ? 1 : 0) + (empresaData.acoes.filter(a => a.status !== 'Concluído').length > 5 ? 1 : 0);

    return {
      pickingCxH,
      repackCxH,
      quebrasPct,
      fefoCompliancePct,
      criticosFefo,
      totalQuebrasValor,
      ressuprimentoTempo,
      capacidadePct,
      despejoAproveitamento,
      processes,
      hitCount,
      avgPerf,
      triggersCount
    };
  }, [empresaData]);

  // Persistent Foco do Dia & Foco da Semana
  const [focoDia, setFocoDia] = useState<string>(() => {
    return localStorage.getItem('cda_foco_dia') || 'Atenção máxima no isolamento de corredores e conferência cega na expedição Turno 1.';
  });

  const [focoSemana, setFocoSemana] = useState<string>(() => {
    return localStorage.getItem('cda_foco_semana') || 'Zerar quebras por manuseio inadequado no Picking e manter o Ressuprimento ≤ 25%.';
  });

  const [destaqueSemana, setDestaqueSemana] = useState<{ nome: string; cargo: string; motivo: string }>(() => {
    const saved = localStorage.getItem('cda_destaque_semana');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      nome: 'Carlos Eduardo Silva',
      cargo: 'Operador de Empilhadeira',
      motivo: '42 movimentações de ressuprimento no prazo sem nenhuma avaria e 100% de conformidade de segurança.'
    };
  });

  const [editingFoco, setEditingFoco] = useState(false);
  const [tempFocoDia, setTempFocoDia] = useState(focoDia);
  const [tempFocoSemana, setTempFocoSemana] = useState(focoSemana);
  const [tempDestaqueNome, setTempDestaqueNome] = useState(destaqueSemana.nome);
  const [tempDestaqueCargo, setTempDestaqueCargo] = useState(destaqueSemana.cargo);
  const [tempDestaqueMotivo, setTempDestaqueMotivo] = useState(destaqueSemana.motivo);

  const saveFocos = () => {
    setFocoDia(tempFocoDia);
    setFocoSemana(tempFocoSemana);
    setDestaqueSemana({ nome: tempDestaqueNome, cargo: tempDestaqueCargo, motivo: tempDestaqueMotivo });
    localStorage.setItem('cda_foco_dia', tempFocoDia);
    localStorage.setItem('cda_foco_semana', tempFocoSemana);
    localStorage.setItem('cda_destaque_semana', JSON.stringify({ nome: tempDestaqueNome, cargo: tempDestaqueCargo, motivo: tempDestaqueMotivo }));
    setEditingFoco(false);
  };

  // User pending actions
  const userActions = acoesList.filter(a => a.colaboradorId === user.uid || a.responsavel === user.nome);

  return (
    <div className="space-y-6">
      {/* ── CABEÇALHO DA PLATAFORMA & IDENTIDADE DA UNIDADE ── */}
      <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20 shrink-0 flex items-center justify-center">
            <Building2 className="w-7 h-7 text-indigo-400" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20 shrink-0">
                UNIDADE OPERACIONAL
              </span>
              <span className="text-[10.5px] text-slate-300 font-bold uppercase tracking-wider truncate">
                {getGreeting()}, <strong className="text-white">{user.nome}</strong>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 mt-1.5">
              <h1 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-1.5 shrink-0">
                UNIDADE: <span className="text-indigo-400">{selectedUnidade}</span>
              </h1>

              {/* Filtro de Expansão Futura de Unidade */}
              <select 
                value={selectedUnidade}
                onChange={e => setSelectedUnidade(e.target.value)}
                className="bg-[#0b1222] border border-slate-700 text-slate-300 font-extrabold text-xs px-3 py-1 rounded-lg outline-none focus:border-indigo-400 max-w-[200px]"
              >
                {unidadesDisponiveis.map(u => (
                  <option key={u} value={u}>Pau Brasil - {u}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* CONTROLE DE MODO DE VISÃO & BOTÃO AMARELO IR PARA OPERAÇÃO (APENAS PARA ADMINISTRATIVO / SUPERVISOR) */}
        {isSupervisorOrAdmin && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 bg-[#0b1222] p-1.5 rounded-xl border border-slate-800 shrink-0">
            {/* BOTÃO AMARELO IR PARA OPERAÇÃO (VAI PARA O DIÁRIO DE BORDO) */}
            <button
              type="button"
              onClick={() => {
                setWorkstationTab('diario_bordo');
              }}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 px-3.5 py-2 rounded-lg font-black text-xs uppercase tracking-wider shadow-lg hover:scale-[1.02] active:scale-95 transition-all cursor-pointer flex items-center gap-2 border border-amber-300"
              title="Ir para o Diário de Bordo da Operação"
            >
              <Zap className="w-4 h-4 fill-slate-950 text-slate-950 shrink-0" />
              <span className="font-black">Ir para Operação</span>
            </button>

            <button
              onClick={() => setViewMode('gestao')}
              className={`px-3 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                viewMode === 'gestao'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 shrink-0" />
              Visão Executiva
            </button>

            <button
              onClick={() => setViewMode('operacional')}
              className={`px-3 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                viewMode === 'operacional'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5 shrink-0" />
              Visão Operacional
            </button>
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* NAVEGAÇÃO DE SUBGUIAS DO WORKSTATION (SIMÉTRICA SEM BARRA DE ROLAGEM) */}
      {/* ==================================================================== */}
      <div className={`grid gap-2 w-full border-b border-slate-800 pb-3 ${
        viewMode === 'operacional' 
          ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5' 
          : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9'
      }`}>
        <button
          type="button"
          onClick={() => setWorkstationTab('operacao')}
          className={`px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm ${
            workstationTab === 'operacao'
              ? 'bg-[#032b5e] text-white border-2 border-blue-500 shadow-md ring-2 ring-blue-500/20'
              : 'bg-[#0b1222] text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'
          }`}
        >
          <Zap className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="truncate">Pátio & Focos</span>
        </button>

        <button
          type="button"
          onClick={() => setWorkstationTab('reunioes')}
          className={`px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm ${
            workstationTab === 'reunioes'
              ? 'bg-[#032b5e] text-white border-2 border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
              : 'bg-[#0b1222] text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'
          }`}
        >
          <Users className="w-4 h-4 text-indigo-400 shrink-0" />
          <span className="truncate">Reuniões & Treinamento</span>
        </button>

        <button
          type="button"
          onClick={() => setWorkstationTab('fluxograma')}
          className={`px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm ${
            workstationTab === 'fluxograma'
              ? 'bg-[#032b5e] text-white border-2 border-teal-500 shadow-md ring-2 ring-teal-500/20'
              : 'bg-[#0b1222] text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'
          }`}
        >
          <GitFork className="w-4 h-4 text-teal-400 shrink-0" />
          <span className="truncate">Fluxograma Demandas</span>
        </button>

        <button
          type="button"
          onClick={() => setWorkstationTab('5s')}
          className={`px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm ${
            workstationTab === '5s'
              ? 'bg-[#032b5e] text-white border-2 border-amber-500 shadow-md ring-2 ring-amber-500/20'
              : 'bg-[#0b1222] text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="truncate">Programa 5S</span>
        </button>

        {isSupervisorOrAdmin && viewMode !== 'operacional' && (
          <button
            type="button"
            onClick={() => setWorkstationTab('desvios')}
            className={`px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm ${
              workstationTab === 'desvios'
                ? 'bg-[#032b5e] text-white border-2 border-rose-500 shadow-md ring-2 ring-rose-500/20'
                : 'bg-[#0b1222] text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="truncate">Desvios & Ações</span>
          </button>
        )}

        {viewMode !== 'operacional' && (
          <>
            <button
              type="button"
              onClick={() => setWorkstationTab('matriz')}
              className={`px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm ${
                workstationTab === 'matriz'
                  ? 'bg-[#032b5e] text-white border-2 border-sky-500 shadow-md ring-2 ring-sky-500/20'
                  : 'bg-[#0b1222] text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'
              }`}
            >
              <Target className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="truncate">Matriz SDPO</span>
            </button>

            <button
              type="button"
              onClick={() => setWorkstationTab('agenda')}
              className={`px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm ${
                workstationTab === 'agenda'
                  ? 'bg-[#032b5e] text-white border-2 border-blue-500 shadow-md ring-2 ring-blue-500/20'
                  : 'bg-[#0b1222] text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'
              }`}
            >
              <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="truncate">Agenda Executiva</span>
            </button>

            <button
              type="button"
              onClick={() => setWorkstationTab('diario_bordo')}
              className={`px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm ${
                workstationTab === 'diario_bordo'
                  ? 'bg-[#032b5e] text-white border-2 border-amber-500 shadow-md ring-2 ring-amber-500/20'
                  : 'bg-[#0b1222] text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'
              }`}
            >
              <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="truncate">Diário de Bordo</span>
            </button>

            <button
              type="button"
              onClick={() => setWorkstationTab('wlp')}
              className={`px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm ${
                workstationTab === 'wlp'
                  ? 'bg-[#032b5e] text-white border-2 border-amber-500 shadow-md ring-2 ring-amber-500/20'
                  : 'bg-[#0b1222] text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="truncate">Dashboard WLP</span>
            </button>
          </>
        )}
      </div>

      {/* TELA DA GUIA WLP */}
      {workstationTab === 'wlp' && (
        <WlpDashboard
          user={user}
          empresaId={empresa?.id}
        />
      )}

      {/* TELA DA GUIA 5S */}
      {workstationTab === '5s' && (
        <Workstation5SSection
          user={user}
          viewMode={viewMode}
          empresaId={empresa?.id}
          isSupervisorOrAdmin={isSupervisorOrAdmin}
        />
      )}

      {/* TELA DA GUIA MATRIZ SDPO */}
      {workstationTab === 'matriz' && (
        <div className="space-y-6">
          {/* BANNER OFICIAL DO SONHO SDPO & KPIS ESTRATÉGICOS */}
          <div className="bg-gradient-to-r from-[#032b5e] via-[#0b1b38] to-slate-900 border border-blue-800/80 p-5 rounded-2xl text-white shadow-xl space-y-4">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-blue-800/60 pb-3">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-400 shrink-0 mt-0.5">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                      O SONHO SDPO GUARABIRA
                    </span>
                    <span className="text-[10px] text-blue-300 font-mono">Diretriz Estratégica 2026</span>
                  </div>
                  <p className="text-sm sm:text-base font-extrabold text-slate-100 italic mt-1 leading-snug">
                    "Qualificar o SDPO com gente engajada e segura, promovendo eficiência nos custos e a satisfação dos nossos clientes."
                  </p>
                </div>
              </div>
            </div>

            {/* OS 5 KPIS DO SONHO */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div 
                onClick={() => setSelectedKpiModal('engagement')}
                className="p-3 bg-[#091224]/80 border border-indigo-500/30 rounded-xl hover:border-indigo-400 transition-all cursor-pointer space-y-1 group"
              >
                <span className="text-[10px] text-slate-400 font-black uppercase block tracking-wider">Engagement</span>
                <strong className="text-base font-black text-indigo-400 font-mono block">≥ 85%</strong>
                <span className="text-[9px] text-slate-400 block group-hover:text-indigo-300">Gente Engajada</span>
              </div>

              <div 
                onClick={() => setSelectedKpiModal('tri')}
                className="p-3 bg-[#091224]/80 border border-rose-500/30 rounded-xl hover:border-rose-400 transition-all cursor-pointer space-y-1 group"
              >
                <span className="text-[10px] text-slate-400 font-black uppercase block tracking-wider">TRI</span>
                <strong className="text-base font-black text-rose-400 font-mono block">= 0</strong>
                <span className="text-[9px] text-slate-400 block group-hover:text-rose-300">Zero Acidentes</span>
              </div>

              <div 
                onClick={() => setSelectedKpiModal('dpo')}
                className="p-3 bg-[#091224]/80 border border-sky-500/30 rounded-xl hover:border-sky-400 transition-all cursor-pointer space-y-1 group"
              >
                <span className="text-[10px] text-slate-400 font-black uppercase block tracking-wider">DPO</span>
                <strong className="text-base font-black text-sky-400 font-mono block">Qualificado</strong>
                <span className="text-[9px] text-slate-400 block group-hover:text-sky-300">Nível Excelência</span>
              </div>

              <div 
                onClick={() => setSelectedKpiModal('otif')}
                className="p-3 bg-[#091224]/80 border border-emerald-500/30 rounded-xl hover:border-emerald-400 transition-all cursor-pointer space-y-1 group"
              >
                <span className="text-[10px] text-slate-400 font-black uppercase block tracking-wider">OTIF</span>
                <strong className="text-base font-black text-emerald-400 font-mono block">95%</strong>
                <span className="text-[9px] text-slate-400 block group-hover:text-emerald-300">Entrega Perfeita</span>
              </div>

              <div 
                onClick={() => setSelectedKpiModal('obz')}
                className="p-3 bg-[#091224]/80 border border-purple-500/30 rounded-xl hover:border-purple-400 transition-all cursor-pointer space-y-1 group"
              >
                <span className="text-[10px] text-slate-400 font-black uppercase block tracking-wider">OBZ TT</span>
                <strong className="text-base font-black text-purple-400 font-mono block">≤ Plan</strong>
                <span className="text-[9px] text-slate-400 block group-hover:text-purple-300">Custo no Alvo</span>
              </div>
            </div>
          </div>
          <AuditoriaDpoPanel user={user} empresa={empresa} theme={theme} onNavigate={onNavigate} />
        </div>
      )}

      {/* TELA DA GUIA DESVIOS E AÇÕES */}
      {workstationTab === 'desvios' && isSupervisorOrAdmin && viewMode !== 'operacional' && (
        <QuadroDesviosEAcoes empresaId={empresa?.id} user={user} onNavigateToAcoes={() => onNavigate && onNavigate('acoes')} />
      )}

      {/* TELA DA GUIA AGENDA EXECUTIVA */}
      {workstationTab === 'agenda' && (
        <AgendaExecutivoComponent user={user} empresaId={empresa?.id} />
      )}

      {/* TELA DA GUIA DIÁRIO DE BORDO */}
      {workstationTab === 'diario_bordo' && (
        <DiarioBordoComponent user={user} empresaId={empresa?.id} />
      )}

      {/* TELA DA GUIA REUNIÕES E TREINAMENTOS */}
      {workstationTab === 'reunioes' && (
        <ReunioesComponent user={user} empresaId={empresa?.id} />
      )}

      {/* TELA DA GUIA FLUXOGRAMA DE DEMANDAS */}
      {workstationTab === 'fluxograma' && (
        <FluxogramaDemandasComponent user={user} empresaId={empresa?.id} />
      )}

      {/* ==================================================================== */}
      {/* 2. VISÃO OPERACIONAL (OPERADORES E AJUDANTES) */}
      {/* ==================================================================== */}
      {workstationTab === 'operacao' && viewMode === 'operacional' && (
        <div className="space-y-6">
          <div className="p-4 bg-sky-500/10 border border-sky-500/30 rounded-2xl text-sky-200 text-xs font-medium flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-sky-400 shrink-0" />
              <span><strong>Visão do Operador & Ajudante:</strong> Exibição focada na rotina diária de trabalho. Somente visualização permitida.</span>
            </div>
            {isSupervisorOrAdmin && (
              <button
                onClick={() => setEditingFoco(true)}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all flex items-center gap-1 shrink-0"
              >
                <Edit3 className="w-3 h-3" /> Editar Foco Operacional
              </button>
            )}
          </div>

          {/* EDIT MODAL FOR SUPERVISOR */}
          {editingFoco && (
            <div className="bg-[#111a30] border border-indigo-500/40 rounded-2xl p-5 space-y-4 shadow-xl">
              <h3 className="text-sm font-black uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                <Edit3 className="w-4 h-4" /> Editar Orientação da Operação (Focos e Destaque)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400">Foco do Dia:</label>
                  <textarea
                    rows={2}
                    value={tempFocoDia}
                    onChange={e => setTempFocoDia(e.target.value)}
                    className="w-full bg-[#0b1222] border border-slate-700 rounded-xl p-2.5 text-xs text-white outline-none mt-1"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400">Foco da Semana:</label>
                  <textarea
                    rows={2}
                    value={tempFocoSemana}
                    onChange={e => setTempFocoSemana(e.target.value)}
                    className="w-full bg-[#0b1222] border border-slate-700 rounded-xl p-2.5 text-xs text-white outline-none mt-1"
                  />
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400">Destaque - Nome:</label>
                  <input
                    type="text"
                    value={tempDestaqueNome}
                    onChange={e => setTempDestaqueNome(e.target.value)}
                    className="w-full bg-[#0b1222] border border-slate-700 rounded-xl p-2 text-xs text-white outline-none mt-1"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400">Destaque - Cargo:</label>
                  <input
                    type="text"
                    value={tempDestaqueCargo}
                    onChange={e => setTempDestaqueCargo(e.target.value)}
                    className="w-full bg-[#0b1222] border border-slate-700 rounded-xl p-2 text-xs text-white outline-none mt-1"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400">Destaque - Motivo:</label>
                  <input
                    type="text"
                    value={tempDestaqueMotivo}
                    onChange={e => setTempDestaqueMotivo(e.target.value)}
                    className="w-full bg-[#0b1222] border border-slate-700 rounded-xl p-2 text-xs text-white outline-none mt-1"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setEditingFoco(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold uppercase cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveFocos}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </div>
          )}

          {/* GRID DE FOCOS E OBJETIVO DA OPERAÇÃO */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* FOCO DO DIA */}
            <div className="bg-[#111a30] border border-amber-500/30 rounded-2xl p-5 space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 flex items-center gap-1">
                  <Sun className="w-3 h-3" /> Foco do Dia
                </span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-xs text-slate-200 font-bold leading-relaxed pt-1">
                {focoDia}
              </p>
            </div>

            {/* FOCO DA SEMANA */}
            <div className="bg-[#111a30] border border-indigo-500/30 rounded-2xl p-5 space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Foco da Semana
                </span>
                <Target className="w-4 h-4 text-indigo-400" />
              </div>
              <p className="text-xs text-slate-200 font-bold leading-relaxed pt-1">
                {focoSemana}
              </p>
            </div>

            {/* OBJETIVO DA OPERAÇÃO */}
            <div className="bg-[#111a30] border border-emerald-500/30 rounded-2xl p-5 space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Objetivo da Operação
                </span>
                <Award className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-xs text-slate-200 font-bold leading-relaxed pt-1">
                Garantir 100% das entregas no prazo com zero avarias físicas e acuracidade de picking superior a 99.5%.
              </p>
            </div>
          </div>

          {/* ACOMPANHAMENTO DE ITENS CRÍTICOS DO ÚLTIMO RECOLHIMENTO DE VALIDADE */}
          <WorkstationCriticosRecolhimento
            validadesList={empresaData.validades || []}
            user={user}
            empresa={empresa}
            onRefresh={() => empresaData.refetchValidades?.()}
          />

          {/* TRÍPLICE ESTRUTURA: IC (ITENS CRÍTICOS) & IV (ITENS DE VERIFICAÇÃO DO DIA) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ITENS CRÍTICOS DO DIA (IC) */}
            <div className="bg-[#111a30] border border-rose-500/30 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-rose-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400" /> IC - Itens Críticos do Dia
                </h3>
                <span className="text-[9px] bg-rose-500/20 text-rose-300 font-bold px-2 py-0.5 rounded border border-rose-500/30">
                  Atenção Imediata
                </span>
              </div>

              <div className="space-y-2">
                <div className="p-3 bg-[#0b1222] rounded-xl border border-rose-500/20 flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 mt-1 shrink-0" />
                  <div>
                    <strong className="text-xs text-white block">Produtos com Shelf Life ≤ 15 dias no Armazém</strong>
                    <span className="text-[10px] text-slate-400">Verificar lote e priorizar saída de SKUs críticos via FEFO.</span>
                  </div>
                </div>

                <div className="p-3 bg-[#0b1222] rounded-xl border border-rose-500/20 flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 mt-1 shrink-0" />
                  <div>
                    <strong className="text-xs text-white block">Avaria Elevada na Rua C (Picking Puxado)</strong>
                    <span className="text-[10px] text-slate-400">Respeitar amarração correta de palete para evitar quebra em curva.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ITENS DE VERIFICAÇÃO DO DIA (IV) */}
            <div className="bg-[#111a30] border border-sky-500/30 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-sky-400 flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-sky-400" /> IV - Itens de Verificação Diária
                </h3>
                <span className="text-[9px] bg-sky-500/20 text-sky-300 font-bold px-2 py-0.5 rounded border border-sky-500/30">
                  Checklist Rotina
                </span>
              </div>

              <div className="space-y-2">
                <div className="p-3 bg-[#0b1222] rounded-xl border border-sky-500/20 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-xs text-white block">Execução Rigorosa da Regra FEFO</strong>
                    <span className="text-[10px] text-slate-400">Conferir data de validade impresso antes da montagem.</span>
                  </div>
                </div>

                <div className="p-3 bg-[#0b1222] rounded-xl border border-sky-500/20 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-xs text-white block">Checklist Diário de Empilhadeira & Transpaleteira</strong>
                    <span className="text-[10px] text-slate-400">Checagem de fluido, buzina e travamento antes do início do turno.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RECONHECIMENTO DA SEMANA & MELHORES COLABORADORES */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* RECONHECIMENTO */}
            <div className="bg-[#111a30] border border-indigo-500/30 rounded-2xl p-5 space-y-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20 flex items-center gap-1 w-max">
                <Award className="w-3.5 h-3.5" /> Destaque da Semana
              </span>
              <div>
                <strong className="text-base text-white font-black block mt-1">{destaqueSemana.nome}</strong>
                <span className="text-xs text-indigo-400 font-bold block">{destaqueSemana.cargo}</span>
              </div>
              <p className="text-xs text-slate-300 bg-[#0b1222] p-3 rounded-xl border border-slate-800 leading-relaxed italic">
                "{destaqueSemana.motivo}"
              </p>
            </div>

            {/* RANKING DOS MELHORES TOP 5 (OPERADORES VS AJUDANTES) */}
            <div className="lg:col-span-2 bg-[#111a30] border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-400" /> Top 5 Melhores Desempenhos da Unidade (Guarabira)
                </h3>
                <button
                  onClick={() => onNavigate('ranking-produtividade')}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                >
                  Ver Ranking Completo <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* TOP 5 EMPILHADORES */}
                <div className="p-3 bg-[#0b1222] rounded-xl border border-slate-800 space-y-2">
                  <span className="text-[10px] text-amber-400 font-black uppercase tracking-wider block border-b border-slate-800 pb-1 flex items-center justify-between">
                    <span>Top 5 Empilhadores</span>
                    <span className="text-[9px] text-slate-500 font-normal">Operador Empilhadeira</span>
                  </span>
                  {CADASTRO_MESTRE_COLABORADORES
                    .filter(c => c.funcaoGroup === 'Empilhador')
                    .sort((a, b) => b.percentualMeta - a.percentualMeta)
                    .slice(0, 5)
                    .map((item, idx) => (
                      <div 
                        key={item.matricula ? `${item.matricula}-${idx}` : idx} 
                        onClick={() => onNavigate('ranking-produtividade')}
                        className="flex items-center justify-between text-xs py-1.5 px-2 hover:bg-slate-800/50 rounded-lg cursor-pointer transition-all border-b border-slate-800/30 last:border-0"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                            idx === 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                            idx === 1 ? 'bg-slate-400/20 text-slate-300 border border-slate-400/30' :
                            idx === 2 ? 'bg-amber-700/20 text-amber-500 border border-amber-700/30' :
                            'bg-slate-800 text-slate-400'
                          }`}>
                            {idx + 1}º
                          </span>
                          <div className="truncate">
                            <strong className="text-white block truncate">{item.nome}</strong>
                            <span className="text-[9px] text-slate-400 block">{item.setor}</span>
                          </div>
                        </div>
                        <span className="font-mono text-amber-400 font-bold shrink-0 ml-1">{item.resultado} {item.unidadeMedida}</span>
                      </div>
                    ))}
                </div>

                {/* TOP 5 AJUDANTES */}
                <div className="p-3 bg-[#0b1222] rounded-xl border border-slate-800 space-y-2">
                  <span className="text-[10px] text-sky-400 font-black uppercase tracking-wider block border-b border-slate-800 pb-1 flex items-center justify-between">
                    <span>Top 5 Ajudantes</span>
                    <span className="text-[9px] text-slate-500 font-normal">Ajudante Armazém</span>
                  </span>
                  {CADASTRO_MESTRE_COLABORADORES
                    .filter(c => c.funcaoGroup === 'Ajudante')
                    .sort((a, b) => b.percentualMeta - a.percentualMeta)
                    .slice(0, 5)
                    .map((item, idx) => (
                      <div 
                        key={item.matricula ? `${item.matricula}-${idx}` : idx} 
                        onClick={() => onNavigate('ranking-produtividade')}
                        className="flex items-center justify-between text-xs py-1.5 px-2 hover:bg-slate-800/50 rounded-lg cursor-pointer transition-all border-b border-slate-800/30 last:border-0"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                            idx === 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                            idx === 1 ? 'bg-slate-400/20 text-slate-300 border border-slate-400/30' :
                            idx === 2 ? 'bg-amber-700/20 text-amber-500 border border-amber-700/30' :
                            'bg-slate-800 text-slate-400'
                          }`}>
                            {idx + 1}º
                          </span>
                          <div className="truncate">
                            <strong className="text-white block truncate">{item.nome}</strong>
                            <span className="text-[9px] text-slate-400 block">{item.setor}</span>
                          </div>
                        </div>
                        <span className="font-mono text-sky-400 font-bold shrink-0 ml-1">{item.resultado} {item.unidadeMedida}</span>
                      </div>
                    ))}
                </div>

                {/* TOP 5 CONFERENTES */}
                <div className="p-3 bg-[#0b1222] rounded-xl border border-slate-800 space-y-2">
                  <span className="text-[10px] text-emerald-400 font-black uppercase tracking-wider block border-b border-slate-800 pb-1 flex items-center justify-between">
                    <span>Top 5 Conferentes</span>
                    <span className="text-[9px] text-slate-500 font-normal">Conferente Armazém</span>
                  </span>
                  {CADASTRO_MESTRE_COLABORADORES
                    .filter(c => c.funcaoGroup === 'Conferente' || c.funcaoGroup === 'Operador')
                    .sort((a, b) => b.percentualMeta - a.percentualMeta)
                    .slice(0, 5)
                    .map((item, idx) => (
                      <div 
                        key={item.matricula ? `${item.matricula}-${idx}` : idx} 
                        onClick={() => onNavigate('ranking-produtividade')}
                        className="flex items-center justify-between text-xs py-1.5 px-2 hover:bg-slate-800/50 rounded-lg cursor-pointer transition-all border-b border-slate-800/30 last:border-0"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                            idx === 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                            idx === 1 ? 'bg-slate-400/20 text-slate-300 border border-slate-400/30' :
                            idx === 2 ? 'bg-amber-700/20 text-amber-500 border border-amber-700/30' :
                            'bg-slate-800 text-slate-400'
                          }`}>
                            {idx + 1}º
                          </span>
                          <div className="truncate">
                            <strong className="text-white block truncate">{item.nome}</strong>
                            <span className="text-[9px] text-slate-400 block">{item.setor}</span>
                          </div>
                        </div>
                        <span className="font-mono text-emerald-400 font-bold shrink-0 ml-1">{item.resultado} {item.unidadeMedida}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>

          {/* QUADRANTES SWOT (ESTRATÉGIA DA OPERAÇÃO 2026) */}
          <div className="bg-[#111a30] border border-indigo-500/30 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-400" /> Quadrantes SWOT - Matriz Estratégica
                </h3>
                <p className="text-[10px] text-slate-400">Direcionadores estratégicos para a operação. Clique em qualquer quadrante para ver a SWOT Completa com estratégias e plano de ação 5W2H.</p>
              </div>
              <button
                onClick={() => onNavigate('dn-swot')}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all shadow-md shrink-0"
              >
                SWOT Completa <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>

            <div 
              onClick={() => onNavigate('dn-swot')}
              className="grid grid-cols-1 md:grid-cols-2 gap-4 cursor-pointer group"
            >
              {/* QUADRANTE 1: FORÇAS */}
              <div className="p-4 bg-[#0b1222] border border-emerald-500/30 rounded-xl space-y-2 group-hover:border-emerald-500 transition-all">
                <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Forças (Pontos Fortes)
                  </span>
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-bold border border-emerald-500/20">
                    Interno / Positivo
                  </span>
                </div>
                <ul className="space-y-1.5 pt-1">
                  {SWOT_FACTORS_2026.filter(f => f.tipo === 'Força').slice(0, 3).map(f => (
                    <li key={f.id} className="text-xs text-slate-300 flex items-start gap-1.5">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>{f.item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* QUADRANTE 2: FRAQUEZAS */}
              <div className="p-4 bg-[#0b1222] border border-rose-500/30 rounded-xl space-y-2 group-hover:border-rose-500 transition-all">
                <div className="flex items-center justify-between border-b border-rose-500/20 pb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400" /> Fraquezas (A Melhores)
                  </span>
                  <span className="text-[9px] bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded font-bold border border-rose-500/20">
                    Interno / Risco
                  </span>
                </div>
                <ul className="space-y-1.5 pt-1">
                  {SWOT_FACTORS_2026.filter(f => f.tipo === 'Fraqueza').slice(0, 3).map(f => (
                    <li key={f.id} className="text-xs text-slate-300 flex items-start gap-1.5">
                      <span className="text-rose-400 font-bold">•</span>
                      <span>{f.item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* QUADRANTE 3: OPORTUNIDADES */}
              <div className="p-4 bg-[#0b1222] border border-sky-500/30 rounded-xl space-y-2 group-hover:border-sky-500 transition-all">
                <div className="flex items-center justify-between border-b border-sky-500/20 pb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-sky-400" /> Oportunidades (Crescimento)
                  </span>
                  <span className="text-[9px] bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded font-bold border border-sky-500/20">
                    Externo / Positivo
                  </span>
                </div>
                <ul className="space-y-1.5 pt-1">
                  {SWOT_FACTORS_2026.filter(f => f.tipo === 'Oportunidade').slice(0, 3).map(f => (
                    <li key={f.id} className="text-xs text-slate-300 flex items-start gap-1.5">
                      <span className="text-sky-400 font-bold">•</span>
                      <span>{f.item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* QUADRANTE 4: AMEAÇAS */}
              <div className="p-4 bg-[#0b1222] border border-amber-500/30 rounded-xl space-y-2 group-hover:border-amber-500 transition-all">
                <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-amber-400" /> Ameaças (Fatores Externos)
                  </span>
                  <span className="text-[9px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded font-bold border border-amber-500/20">
                    Externo / Risco
                  </span>
                </div>
                <ul className="space-y-1.5 pt-1">
                  {SWOT_FACTORS_2026.filter(f => f.tipo === 'Ameaça').slice(0, 3).map(f => (
                    <li key={f.id} className="text-xs text-slate-300 flex items-start gap-1.5">
                      <span className="text-amber-400 font-bold">•</span>
                      <span>{f.item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* PADRÕES DO PROCESSO & AÇÕES PENDENTES */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* PADRÕES DO PROCESSO (POPs) */}
            <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                  <ListChecks className="w-4 h-4 text-indigo-400" /> Padrões Operacionais do Processo (POP)
                </h3>
                <button
                  onClick={() => onNavigate('padronizacao-processos')}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider cursor-pointer"
                >
                  Acessar Central
                </button>
              </div>

              <div key={popRefreshKey} className="space-y-2 text-xs">
                {[
                  { key: 'repack' as OperationalModuleKey, name: 'Repack' },
                  { key: 'despejo' as OperationalModuleKey, name: 'Despejo' },
                  { key: 'armazem' as OperationalModuleKey, name: 'EFC / EFD (Armazém)' },
                  { key: 'validades' as OperationalModuleKey, name: 'FEFO / Validades' },
                  { key: 'empilhador' as OperationalModuleKey, name: 'Movimentação / Picking' },
                  { key: 'quebras' as OperationalModuleKey, name: 'Quebras e Avarias' }
                ].map((item) => {
                  const sop = getSopForOperation(item.key);
                  const hasPdfFile = Boolean(sop.fileUrl);

                  return (
                    <div 
                      key={item.key}
                      className="p-3 bg-[#0b1222] hover:bg-[#131f3b] transition-colors rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                    >
                      <div 
                        onClick={() => setPopModalKey(item.key)}
                        className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                        title="Clique para abrir e visualizar o Padrão Operacional completo"
                      >
                        <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20 shrink-0 group-hover:bg-indigo-500/20">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[9px] font-black uppercase text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded">
                              {sop.code || item.name}
                            </span>
                            {hasPdfFile && (
                              <span className="text-[9px] font-extrabold uppercase text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-1.5 py-0.5 rounded flex items-center gap-1">
                                <FileText className="w-2.5 h-2.5" /> PDF Anexo
                              </span>
                            )}
                          </div>
                          <span className="text-slate-200 group-hover:text-white font-bold truncate block text-xs mt-0.5">
                            {sop.title}
                          </span>
                          {sop.fileName && (
                            <span className="text-[10px] text-slate-400 truncate block font-mono">
                              📄 {sop.fileName}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        {/* Visualizar Icon/Button */}
                        <button
                          type="button"
                          onClick={() => setPopModalKey(item.key)}
                          className="px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                          title="Visualizar Padrão Operacional em Tela Cheia"
                        >
                          <Eye className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Visualizar</span>
                        </button>

                        {/* Baixar PDF Icon/Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (hasPdfFile && sop.fileUrl) {
                              downloadPdfFile(sop.fileUrl, sop.fileName || `${sop.code || item.name}_Padrao_Operacional.pdf`);
                            } else {
                              setPopModalKey(item.key);
                            }
                          }}
                          className="px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                          title="Baixar Padrão Operacional em PDF"
                        >
                          <Download className="w-3.5 h-3.5 text-blue-400" />
                          <span>Baixar PDF</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 3. VISÃO EXECUTIVA (GESTORES) - PAINEL EXECUTIVO CCO */}
      {/* ==================================================================== */}
      {workstationTab === 'operacao' && viewMode === 'gestao' && (
        <div className="space-y-6">
          {/* CARDS DE PERFORMANCE GERAL & ATALHOS MESTRE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#111a30] border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Performance Geral Unidade</span>
                <strong className="text-2xl text-emerald-400 font-black">{moduleMetrics.avgPerf}%</strong>
                <span className="text-[10px] text-emerald-300 font-bold block flex items-center gap-0.5">
                  <ArrowUpRight className="w-3 h-3 text-emerald-400" /> Sincronizado com Módulos
                </span>
              </div>
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-[#111a30] border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Situação das Metas</span>
                <strong className="text-2xl text-white font-black">{moduleMetrics.hitCount} / {moduleMetrics.processes.length}</strong>
                <span className="text-[10px] text-slate-400 block">processos na meta</span>
              </div>
              <div className="p-3 bg-sky-500/10 text-sky-400 rounded-2xl border border-sky-500/20">
                <Target className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-[#111a30] border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Gatilhos do Mês</span>
                <strong className="text-2xl text-amber-400 font-black">{moduleMetrics.triggersCount} Alertas</strong>
                <span className="text-[10px] text-amber-300 block">Identificados no CCO</span>
              </div>
              <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-[#111a30] border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Quadro Geral de Ações</span>
                <strong className="text-2xl text-purple-400 font-black">{acoesList.length} Ativas</strong>
                <span className="text-[10px] text-purple-300 block">Corretivas & Melhoria</span>
              </div>
              <div className="p-3 bg-purple-500/10 text-purple-400 rounded-2xl border border-purple-500/20">
                <Sparkles className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* BARRA DE BOTÕES DE NAVEGAÇÃO E MÓDULOS MESTRE */}
          <div className="bg-[#111a30] border border-slate-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-400" /> Módulos Mestre de Gestão CCO:
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => onNavigate('ranking-produtividade')}
                className="px-3.5 py-2 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider border border-indigo-500/30 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Award className="w-3.5 h-3.5" /> Ranking de Produtividade
              </button>

              <button
                onClick={() => onNavigate('dn-swot')}
                className="px-3.5 py-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider border border-emerald-500/30 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /> DN & Matriz SWOT
              </button>

              <button
                onClick={() => onNavigate('eficiencia-montagem')}
                className="px-3.5 py-2 bg-sky-600/20 hover:bg-sky-600 text-sky-300 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider border border-sky-500/30 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" /> Eficiência de Montagem (Fast Picking)
              </button>

              <button
                onClick={() => onNavigate('kpi-arvore')}
                className="px-3.5 py-2 bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider border border-purple-500/30 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Activity className="w-3.5 h-3.5" /> KPI em Árvore
              </button>
            </div>
          </div>

          {/* ACOMPANHAMENTO DE ITENS CRÍTICOS DO ÚLTIMO RECOLHIMENTO DE VALIDADE (VISÃO EXECUTIVA / CCO) */}
          <WorkstationCriticosRecolhimento
            validadesList={empresaData.validades || []}
            user={user}
            empresa={empresa}
            onRefresh={() => empresaData.refetchValidades?.()}
          />

          {/* RANKING DOS PIORES (OPORTUNIDADES DE MELHORIA - EXCLUSIVO DA VISÃO EXECUTIVA) */}
          <div className="bg-[#111a30] border border-rose-500/30 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-rose-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400" /> Oportunidades de Melhoria (Ranking Abaixo da Meta)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Visão Executiva: Estratificação detalhada por colaborador e processos específicos com gargalo de desempenho.
                </p>
              </div>
              <span className="text-[10px] bg-rose-500/20 text-rose-300 font-bold px-2.5 py-1 rounded-full border border-rose-500/30">
                Gargalos Prioritários Gestão
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {CADASTRO_MESTRE_COLABORADORES.filter(c => c.percentualMeta < 100).slice(0, 3).map((colab, idx) => (
                <div key={colab.matricula ? `${colab.matricula}-${idx}` : idx} className="p-4 bg-[#0b1222] border border-rose-500/30 rounded-xl space-y-3 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-rose-400 font-mono font-bold">{colab.matricula}</span>
                      <span className="text-[10px] bg-rose-500/20 text-rose-400 font-black px-2 py-0.5 rounded font-mono">
                        {colab.percentualMeta}% Meta
                      </span>
                    </div>
                    <strong className="text-xs text-white block">{colab.nome}</strong>
                    <span className="text-[10px] text-slate-400 block">{colab.cargo} ({colab.funcaoGroup})</span>

                    <div className="p-2 bg-[#111a30] rounded-lg border border-slate-800 space-y-1 mt-2">
                      <span className="text-[9px] text-amber-400 font-black uppercase block">Gargalo Estratificado:</span>
                      <span className="text-[10px] text-slate-200 font-bold block">Setor Crítico: {colab.setor}</span>
                      <span className="text-[10px] text-slate-400 block">Resultado: {colab.resultado} {colab.unidadeMedida} (Meta: {colab.meta})</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setActionModalColab({ nome: colab.nome, setor: colab.setor, matricula: colab.matricula });
                      setActionTitle(`Plano de Ação Corretiva - ${colab.setor}`);
                      setActionDesc(`Acompanhamento de alinhamento operacional para atingimento de meta no processo ${colab.setor}.`);
                    }}
                    className="w-full py-2 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Gerar Plano de Ação
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* ==================================================================== */}
          {/* 9. TRÍPLICE ESTRUTURA: OBJETIVOS, ITENS CRÍTICOS (IC) E ITENS DE VERIFICAÇÃO (IV) */}
          {/* ==================================================================== */}
          <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-6 space-y-6">

            {/* HEADER MATRIZ OPERACIONAL E ABAS DE SELEÇÃO DE CATEGORIA */}
            <div className="space-y-3">
              <div className="border-b border-slate-800 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                    MATRIZ OPERACIONAL DE GOVERNANÇA (GUARABIRA)
                  </span>
                  <h2 className="text-lg font-black text-white mt-2 flex items-center gap-2">
                    Tríplice Estrutura: Objetivos, Itens Críticos (IC) e Itens de Verificação (IV)
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    {GOV_CATEGORIES[govCategory].title}
                  </p>
                </div>
              </div>

              {/* SELETOR DE ABAS DA MATRIZ */}
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#0b1222] rounded-xl border border-slate-800">
                {(Object.keys(GOV_CATEGORIES) as GovCategory[]).map(catKey => {
                  const cat = GOV_CATEGORIES[catKey];
                  const isActive = govCategory === catKey;
                  return (
                    <button
                      key={catKey}
                      onClick={() => setGovCategory(catKey)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isActive 
                          ? 'bg-indigo-600 text-white shadow-md font-black' 
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* TRES BLOCOS DA MATRIZ OPERACIONAL PARA A CATEGORIA SELECIONADA */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* BLOCO 1: OBJETIVOS */}
              <div className="bg-[#0b1222] border border-emerald-500/30 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                    <Target className="w-4 h-4 text-emerald-400" /> 1. OBJETIVOS
                  </h3>
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded">
                    {GOV_CATEGORIES[govCategory].badge}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">O que precisamos atingir:</span>
                
                <ul className="space-y-2 text-xs text-slate-200">
                  {objetivosList.map((item, idx) => (
                    <li key={idx} className="p-2.5 bg-[#111a30] rounded-xl border border-slate-800 flex items-start justify-between gap-2 group">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </div>
                      {isSupervisorOrAdmin && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleEditObjetivo(idx)}
                            className="p-1 hover:bg-emerald-500/20 text-slate-500 hover:text-emerald-400 rounded transition-colors cursor-pointer"
                            title="Editar Item"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleRemoveObjetivo(idx)}
                            className="p-1 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded transition-colors cursor-pointer"
                            title="Remover Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>

                {isSupervisorOrAdmin && (
                  <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={`Novo objetivo para ${GOV_CATEGORIES[govCategory].badge}...`}
                      value={newObjInput}
                      onChange={e => setNewObjInput(e.target.value)}
                      className="w-full bg-[#111a30] border border-slate-700 text-xs text-white rounded-lg px-2.5 py-1.5 outline-none focus:border-emerald-400"
                    />
                    <button
                      onClick={handleAddObjetivo}
                      className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg cursor-pointer transition-all shrink-0"
                      title="Adicionar Objetivo"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* BLOCO 2: ITENS CRÍTICOS (IC) */}
              <div className="bg-[#0b1222] border border-rose-500/30 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-rose-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400" /> 2. ITENS CRÍTICOS (IC)
                  </h3>
                  <span className="text-[9px] bg-rose-500/20 text-rose-300 font-bold px-2 py-0.5 rounded">
                    Pontos de Risco
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">O que pode impedir o atingimento:</span>
                
                <ul className="space-y-2 text-xs text-slate-200">
                  {icList.map((item, idx) => (
                    <li key={idx} className="p-2.5 bg-[#111a30] rounded-xl border border-slate-800 flex items-start justify-between gap-2 group">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </div>
                      {isSupervisorOrAdmin && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleEditIC(idx)}
                            className="p-1 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded transition-colors cursor-pointer"
                            title="Editar Item Crítico"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleRemoveIC(idx)}
                            className="p-1 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded transition-colors cursor-pointer"
                            title="Remover Item Crítico"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>

                {isSupervisorOrAdmin && (
                  <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={`Novo item crítico para ${GOV_CATEGORIES[govCategory].badge}...`}
                      value={newIcInput}
                      onChange={e => setNewIcInput(e.target.value)}
                      className="w-full bg-[#111a30] border border-slate-700 text-xs text-white rounded-lg px-2.5 py-1.5 outline-none focus:border-rose-400"
                    />
                    <button
                      onClick={handleAddIC}
                      className="p-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg cursor-pointer transition-all shrink-0"
                      title="Adicionar Item Crítico"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* BLOCO 3: ITENS DE VERIFICAÇÃO (IV) */}
              <div className="bg-[#0b1222] border border-sky-500/30 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-sky-400 flex items-center gap-2">
                    <ClipboardCheck className="w-4 h-4 text-sky-400" /> 3. ITENS DE VERIFICAÇÃO (IV)
                  </h3>
                  <span className="text-[9px] bg-sky-500/20 text-sky-300 font-bold px-2 py-0.5 rounded">
                    Rotina Diária
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Quais processos acompanhar diariamente:</span>
                
                <ul className="space-y-2 text-xs text-slate-200">
                  {ivList.map((item, idx) => (
                    <li key={idx} className="p-2.5 bg-[#111a30] rounded-xl border border-slate-800 flex items-start justify-between gap-2 group">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </div>
                      {isSupervisorOrAdmin && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleEditIV(idx)}
                            className="p-1 hover:bg-sky-500/20 text-slate-500 hover:text-sky-400 rounded transition-colors cursor-pointer"
                            title="Editar Item de Verificação"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleRemoveIV(idx)}
                            className="p-1 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded transition-colors cursor-pointer"
                            title="Remover Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>

                {isSupervisorOrAdmin && (
                  <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={`Novo item de verificação para ${GOV_CATEGORIES[govCategory].badge}...`}
                      value={newIvInput}
                      onChange={e => setNewIvInput(e.target.value)}
                      className="w-full bg-[#111a30] border border-slate-700 text-xs text-white rounded-lg px-2.5 py-1.5 outline-none focus:border-sky-400"
                    />
                    <button
                      onClick={handleAddIV}
                      className="p-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg cursor-pointer transition-all shrink-0"
                      title="Adicionar Item de Verificação"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* QUADRO DE DESVIOS & AÇÕES CORRETIVAS PESSOAIS (WORKSTATION - TAREFA 9) */}
          <QuadroDesviosEAcoes 
            user={user} 
            empresaId={empresa?.id || 'demo'} 
            onNavigateToAcoes={() => onNavigate('acoes')} 
          />

          {/* MODAL DE CRIAÇÃO DE PLANO DE AÇÃO PARA COLABORADOR FORA DA META */}
          {actionModalColab && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-[#111a30] border border-rose-500/40 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-scale-in">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-black uppercase text-rose-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Gerar Plano de Ação Corretiva
                  </h3>
                  <button
                    onClick={() => setActionModalColab(null)}
                    className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-3 bg-[#0b1222] rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-black">Colaborador / Processo Crítico:</span>
                  <strong className="text-xs text-white block">{actionModalColab.nome} ({actionModalColab.matricula})</strong>
                  <span className="text-[10px] text-rose-400 font-bold block">Setor: {actionModalColab.setor}</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400">Título da Ação Corretiva:</label>
                    <input
                      type="text"
                      placeholder="Ex: Treinamento de simulação de ergonomia no picking"
                      value={actionTitle}
                      onChange={e => setActionTitle(e.target.value)}
                      className="w-full bg-[#0b1222] border border-slate-700 rounded-xl p-2.5 text-xs text-white outline-none mt-1 focus:border-rose-400"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400">Detalhamento & Causa Raiz:</label>
                    <textarea
                      rows={3}
                      placeholder="Descreva o plano de melhoria e as etapas de acompanhamento do supervisor..."
                      value={actionDesc}
                      onChange={e => setActionDesc(e.target.value)}
                      className="w-full bg-[#0b1222] border border-slate-700 rounded-xl p-2.5 text-xs text-white outline-none mt-1 focus:border-rose-400"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => setActionModalColab(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold uppercase cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCreateActionForColab}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black uppercase cursor-pointer transition-all flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Registrar Plano de Ação
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* GRID DE DASHBOARDS E PROCESSOS DA UNIDADE */}
          <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" /> Monitoramento Integrado dos 12 Processos Operacionais
              </h3>
              <span className="text-[10px] text-slate-400 font-bold bg-slate-800 px-3 py-1 rounded-full">
                Sincronização CCO Ativa
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {moduleMetrics.processes.map(proc => {
                const isOut = !proc.hit;
                return (
                  <div 
                    key={proc.id}
                    onClick={() => onNavigate(proc.id)}
                    className={`p-3.5 border rounded-xl cursor-pointer transition-all space-y-2 group relative overflow-hidden ${
                      isOut 
                        ? 'bg-rose-950/40 border-rose-500/80 hover:border-rose-400 text-rose-200 shadow-lg shadow-rose-950/50' 
                        : 'bg-[#0b1222] border-slate-800 hover:border-emerald-500/50 text-white'
                    }`}
                  >
                    {isOut && (
                      <div className="absolute top-0 right-0 bg-rose-600 text-[8px] font-black uppercase text-white px-1.5 py-0.5 rounded-bl-lg tracking-wider animate-pulse">
                        ⚠️ FORA DA META
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <Activity className={`w-4 h-4 ${isOut ? 'text-rose-400' : proc.hit ? 'text-emerald-400' : 'text-amber-400'}`} />
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                    </div>
                    <strong className={`text-xs block group-hover:text-indigo-300 transition-colors ${isOut ? 'text-rose-100 font-black' : 'text-white'}`}>
                      {proc.title}
                    </strong>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className={`font-mono font-bold ${isOut ? 'text-rose-400' : proc.hit ? 'text-emerald-400' : 'text-amber-400'}`}>{proc.val}</span>
                      <span className={isOut ? 'text-rose-300/80 font-mono' : 'text-slate-500 font-mono'}>M: {proc.meta}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL EXPLICATIVO DOS KPIS DE SUSTENTABILIDADE */}
      {selectedKpiModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#111a30] border border-indigo-500/40 rounded-2xl p-6 max-w-2xl w-full space-y-5 shadow-2xl animate-scale-in text-white max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
                  <Sparkles className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-black uppercase tracking-wider text-indigo-200">
                    {selectedKpiModal === 'engagement' && 'ENGAGEMENT (Pesquisa de Satisfação & Clima)'}
                    {selectedKpiModal === 'tri' && 'TRI (Total Recordable Incidents / Taxa de Acidentes)'}
                    {selectedKpiModal === 'dpo' && 'DPO (Distribution Process Optimization)'}
                    {selectedKpiModal === 'otif' && 'OTIF (On-Time In-Full / Nível de Serviço do Cliente)'}
                    {selectedKpiModal === 'obz' && 'OBZ (Orçamento Base Zero - Gestão de Custos)'}
                  </h3>
                  <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest block">
                    KPI de Sustentabilidade - Padrão Ambev / SDPO
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedKpiModal(null)}
                className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedKpiModal === 'engagement' && (
              <div className="space-y-4 text-xs leading-relaxed text-slate-300">
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl space-y-1">
                  <strong className="text-indigo-300 font-black text-xs uppercase block">🌟 O Sonho de Engagement:</strong>
                  <p className="text-indigo-100 italic">
                    "Formar uma equipe 100% engajada, orgulhosa e motivada no Armazém Guarabira, garantindo um ambiente de trabalho seguro, colaborativo e de alto desempenho."
                  </p>
                </div>
                <div className="space-y-2">
                  <strong className="text-white font-bold block text-sm">O que é o Engagement?</strong>
                  <p>
                    É a nossa pesquisa oficial de satisfação e clima organizacional. Mede a conexão emocional e o orgulho que ajudantes, empilhadores e conferentes sentem em trabalhar na Pau Brasil Distribuidora e seguir as diretrizes do SDPO.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 p-3 bg-[#0b1222] rounded-xl border border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 font-black uppercase block">Meta Guarabira:</span>
                    <strong className="text-emerald-400 font-mono font-black text-sm">≥ 85.0% de Aderência</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-black uppercase block">Fórmula de Cálculo:</span>
                    <strong className="text-indigo-300 font-mono text-[11px] block">(Respostas Positivas / Total) * 100</strong>
                  </div>
                </div>
                <div className="space-y-1">
                  <strong className="text-white font-bold block">Impacto na Operação Diária:</strong>
                  <p>
                    Equipes com alto engagement possuem menor turnover, menor índice de faltas (absenteísmo) e cuidam melhor das mercadorias, reduzindo drasticamente o índice de quebras internas.
                  </p>
                </div>
              </div>
            )}

            {selectedKpiModal === 'tri' && (
              <div className="space-y-4 text-xs leading-relaxed text-slate-300">
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-1">
                  <strong className="text-rose-300 font-black text-xs uppercase block">🛡️ O Sonho de TRI:</strong>
                  <p className="text-rose-100 italic">
                    "Meta ZERO ACIDENTES (= 0). Garantir que 100% dos colaboradores retornem para suas famílias com total saúde e integridade física ao término de cada turno."
                  </p>
                </div>
                <div className="space-y-2">
                  <strong className="text-white font-bold block text-sm">O que é o TRI (Total Recordable Incidents)?</strong>
                  <p>
                    É a taxa global de acidentes e incidentes de segurança da informação e saúde ocupacional. Avalia acidentes com e sem afastamento, primeiros socorros e ocorrências de risco na movimentação de carga com empilhadeiras e transpaleteiras.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 p-3 bg-[#0b1222] rounded-xl border border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 font-black uppercase block">Meta da Unidade:</span>
                    <strong className="text-emerald-400 font-mono font-black text-sm">TRI = 0 (Absoluto)</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-black uppercase block">Regra de Segurança:</span>
                    <strong className="text-rose-400 font-mono text-[11px] block">100% EPI + 10km/h máx</strong>
                  </div>
                </div>
                <div className="space-y-1">
                  <strong className="text-white font-bold block">Pilares de Prevenção:</strong>
                  <p>
                    Uso contínuo de luvas anticorte na movimentação de vidros, calçado de proteção, respeito aos limites de velocidade das máquinas e aplicação rigorosa da política de 'Siga as Regras que Salvam Vidas'.
                  </p>
                </div>
              </div>
            )}

            {selectedKpiModal === 'dpo' && (
              <div className="space-y-4 text-xs leading-relaxed text-slate-300">
                <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl space-y-1">
                  <strong className="text-sky-300 font-black text-xs uppercase block">🎯 O Sonho do DPO:</strong>
                  <p className="text-sky-100 italic">
                    "Certificação e Qualificação da Unidade Guarabira no nível de Excelência em todos os pilares do sistema DPO (Distribuição Otimizada)."
                  </p>
                </div>
                <div className="space-y-2">
                  <strong className="text-white font-bold block text-sm">O que é o DPO (Distribution Process Optimization)?</strong>
                  <p>
                    É a ferramenta e metodologia mundial de gestão utilizada para garantir um processo de logística otimizado, seguro, rentável e padronizado, assegurando a máxima satisfação dos nossos clientes.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 p-3 bg-[#0b1222] rounded-xl border border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 font-black uppercase block">Status da Unidade:</span>
                    <strong className="text-emerald-400 font-mono font-black text-sm">Unidade Qualificada DPO</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-black uppercase block">Pilares Fundamentais:</span>
                    <strong className="text-sky-300 font-mono text-[11px] block">Segurança, Gestão, Armazém, Frota</strong>
                  </div>
                </div>
                <div className="space-y-1">
                  <strong className="text-white font-bold block">Aplicação na Rotina:</strong>
                  <p>
                    Padronização de todas as rotinas operacionais (POPs), auditorias semanais de 5S, alinhamento matinal de diretrizes e execução sem desvios do fluxo de faturamento e armazenagem.
                  </p>
                </div>
              </div>
            )}

            {selectedKpiModal === 'otif' && (
              <div className="space-y-4 text-xs leading-relaxed text-slate-300">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1">
                  <strong className="text-emerald-300 font-black text-xs uppercase block">🚚 O Sonho de OTIF:</strong>
                  <p className="text-emerald-100 italic">
                    "Garantir a entrega perfeita ao cliente: 100% dos pedidos entregues na data correta e exatamente na quantidade e integridade física compradas."
                  </p>
                </div>
                <div className="space-y-2">
                  <strong className="text-white font-bold block text-sm">O que é o OTIF (On-Time In-Full)?</strong>
                  <p>
                    É o indicador definitivo de nível de serviço percebido pelo cliente no PDV. Reflete a combinação perfeita entre o prazo de entrega (<em className="text-emerald-300">On-Time</em>) e a exatidão das caixas enviadas sem erros ou avarias (<em className="text-emerald-300">In-Full</em>).
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 p-3 bg-[#0b1222] rounded-xl border border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 font-black uppercase block">Meta Guarabira:</span>
                    <strong className="text-emerald-400 font-mono font-black text-sm">≥ 95.0% de Entrega Perfeita</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-black uppercase block">Gargalos Evitados:</span>
                    <strong className="text-amber-300 font-mono text-[11px] block">Atrasos de Saída e Falha de Picking</strong>
                  </div>
                </div>
                <div className="space-y-1">
                  <strong className="text-white font-bold block">Como o Armazém Garante o OTIF:</strong>
                  <p>
                    Através da montagem rápida e correta dos paletes no Fast Picking, conferência cega rigorosa de notas e faturamento, e saída das carretas/frota dentro das janelas estipuladas (EFC/EFD).
                  </p>
                </div>
              </div>
            )}

            {selectedKpiModal === 'obz' && (
              <div className="space-y-4 text-xs leading-relaxed text-slate-300">
                <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl space-y-1">
                  <strong className="text-purple-300 font-black text-xs uppercase block">💰 O Sonho de OBZ:</strong>
                  <p className="text-purple-100 italic">
                    "Conquistar a máxima rentabilidade e sustentabilidade financeira da unidade, operando sempre com o gasto real dentro ou abaixo do orçado (Real ≤ Plan)."
                  </p>
                </div>
                <div className="space-y-2">
                  <strong className="text-white font-bold block text-sm">O que é o OBZ (Orçamento Base Zero)?</strong>
                  <p>
                    É a metodologia de gestão financeira que garante a eficiência dos custos operacionais sem desperdícios. Cada despesa da unidade (manutenção de máquinas, filmes stretch, combustível, insumos de limpeza e reembalagem) é justificadamente analisada a cada ciclo.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 p-3 bg-[#0b1222] rounded-xl border border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 font-black uppercase block">Meta de Despesa:</span>
                    <strong className="text-emerald-400 font-mono font-black text-sm">OBZ TT ≤ Planejado</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-black uppercase block">Controle do Armazém:</span>
                    <strong className="text-purple-300 font-mono text-[11px] block">Zero desperdício de insumos</strong>
                  </div>
                </div>
                <div className="space-y-1">
                  <strong className="text-white font-bold block">Como Evitar Extrapolar o OBZ:</strong>
                  <p>
                    Reduzindo o índice de quebras internas de vidros, conservando os pneus e baterias das empilhadeiras através do uso correto e reaproveitando materiais de amarração de acordo com os padrões operacionais.
                  </p>
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedKpiModal(null)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase cursor-pointer transition-all"
              >
                Entendido / Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALS POP & 5S */}
      {popModalKey && (
        <PadraoOperacionalModal
          moduleKey={popModalKey}
          moduleName={popModalKey.toUpperCase()}
          isOpen={Boolean(popModalKey)}
          onClose={() => setPopModalKey(null)}
          user={user}
        />
      )}

      <Checklist5SModal
        isOpen={is5SModalOpen}
        onClose={() => setIs5SModalOpen(false)}
        defaultSetor={selected5SSetor}
        user={user}
      />
    </div>
  );
}
