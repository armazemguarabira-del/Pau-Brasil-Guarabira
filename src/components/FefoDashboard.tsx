import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  LineChart,
  Line,
  PieChart,
  Pie,
  Legend,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  ZAxis,
  ReferenceLine
} from 'recharts';
import { 
  Calendar, 
  ChevronRight, 
  ChevronLeft,
  ChevronDown,
  Sparkles,
  AlertTriangle,
  ArrowLeft,
  Download,
  TrendingUp,
  Filter,
  CheckCircle,
  Clock,
  Plus,
  Trash2,
  FileText,
  User,
  ShieldAlert,
  Archive,
  Truck,
  Layers,
  MapPin,
  RefreshCw,
  Users,
  AlertCircle,
  Search,
  CheckSquare
} from 'lucide-react';
import { Usuario, Empresa, ValidadeRow } from '../types';
import { db, isCustomFirebaseConnected } from '../firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { generateMockValidades } from '../mockDataGenerator';
import { PRODUCTS } from '../planosData';
import A3BoardComponent from './A3BoardComponent';

interface FefoDashboardProps {
  user: Usuario;
  empresa: Empresa | null;
  onBack?: () => void;
}

// Sub-pages defined by user
type FefoPage = 'executiva' | 'fefo' | 'estoque-picking' | 'estoque-estoque' | 'rlp' | 'boarda3';

interface RLPMeeting {
  id: string;
  data: string;
  produtos: string;
  quantidadeRisco: number;
  estrategia: string;
  responsavel: string;
  prazo: string;
  status: 'Aberta' | 'Em andamento' | 'Concluída';
}

interface ActionPoint {
  id: string;
  produto: string;
  lote: string;
  acao: string;
  responsavel: string;
  dataAbertura: string;
  dataPrevista: string;
  dataConclusao?: string;
  status: 'Pendente' | 'Em Andamento' | 'Concluído' | 'Atrasado';
}

interface StockTransfer {
  ruaOrigem: string;
  ruaDestino: string;
  produto: string;
  lote: string;
  validade: string;
  quantidade: number;
  motivo: string;
  data: string;
}

interface PickingComparison {
  produto: string;
  lote: string;
  validade: string;
  qtdEstoque: number;
  qtdPicking: number;
  diferenca: number;
  status: 'Conforme' | 'Atenção' | 'Desvio Crítico';
}

// Seed highly polished starting data for realistic analytics
const SEED_RLP_MEETINGS: RLPMeeting[] = [
  {
    id: 'rlp-1',
    data: '22/06/2026',
    produtos: 'SKOL 600ML (Lote: B-20)',
    quantidadeRisco: 420,
    estrategia: 'Conceder desconto de volume para rede de supermercados parceira e ativar ponto extra de gôndola.',
    responsavel: 'Felipe (Vendas)',
    prazo: '30/06/2026',
    status: 'Em andamento'
  },
  {
    id: 'rlp-2',
    data: '15/06/2026',
    produtos: 'STELLA ARTOIS LT 269ML (Lote: S-10)',
    quantidadeRisco: 180,
    estrategia: 'Inclusão em combo promocional com petiscos em canais de autosserviço.',
    responsavel: 'Marina (Trade Mkt)',
    prazo: '25/06/2026',
    status: 'Concluída'
  },
  {
    id: 'rlp-3',
    data: '25/06/2026',
    produtos: 'BUDWEISER 600ML (Lote: BU-80)',
    quantidadeRisco: 310,
    estrategia: 'Transferência imediata de estoque excedente para filial B com maior giro do produto.',
    responsavel: 'Carlos (Logística)',
    prazo: '05/07/2026',
    status: 'Aberta'
  }
];

const SEED_ACTION_POINTS: ActionPoint[] = [
  {
    id: 'act-1',
    produto: 'SKOL 600ML',
    lote: 'SK-2026A',
    acao: 'Repactuação de preço e envio para mercadinhos de rota rápida',
    responsavel: 'Marcos (Vendas)',
    dataAbertura: '18/06/2026',
    dataPrevista: '25/06/2026',
    status: 'Atrasado'
  },
  {
    id: 'act-2',
    produto: 'BRAHMA CHOPP GFA VD 1L',
    lote: 'BR-9842',
    acao: 'Identificar ruas com erro físico de endereçamento e relocar lotes antigos',
    responsavel: 'Thiago (Depósito)',
    dataAbertura: '20/06/2026',
    dataPrevista: '30/06/2026',
    status: 'Em Andamento'
  },
  {
    id: 'act-3',
    produto: 'STELLA ARTOIS LT 269ML',
    lote: 'ST-5512',
    acao: 'Emissão de bonificação estratégica para atingimento de meta de volume',
    responsavel: 'Aline (Comercial)',
    dataAbertura: '15/06/2026',
    dataPrevista: '22/06/2026',
    dataConclusao: '21/06/2026',
    status: 'Concluído'
  },
  {
    id: 'act-4',
    produto: 'GUARANA CHP ANTARCTICA PET 2L',
    lote: 'GU-8821',
    acao: 'Fazer repick acelerado e liberar na frente de carregamento do turno 1',
    responsavel: 'Cleiton (Supervisor)',
    dataAbertura: '24/06/2026',
    dataPrevista: '28/06/2026',
    status: 'Pendente'
  }
];

const SEED_STOCK_TRANSFERS: StockTransfer[] = [
  { ruaOrigem: 'A1', ruaDestino: 'A4', produto: 'SKOL 600ML', lote: 'SK-2026A', validade: '12/07/2026', quantidade: 140, motivo: 'Consolidação de Lote Antigo (FEFO)', data: '26/06/2026' },
  { ruaOrigem: 'B2', ruaDestino: 'B4', produto: 'BRAHMA CHOPP GFA VD 1L', lote: 'BR-9842', validade: '22/07/2026', quantidade: 80, motivo: 'Correção de Endereçamento de Bloco', data: '25/06/2026' },
  { ruaOrigem: 'A3', ruaDestino: 'C1', produto: 'ORIGINAL 600ML', lote: 'OR-3310', validade: '18/08/2026', quantidade: 120, motivo: 'Reorganização do Blocado de Alto Giro', data: '27/06/2026' },
  { ruaOrigem: 'C2', ruaDestino: 'B1', produto: 'PEPSI COLA PET 2L', lote: 'PE-4100', validade: '05/09/2026', quantidade: 200, motivo: 'Ajuste de Paletes de Lastro Duplo', data: '24/06/2026' },
  { ruaOrigem: 'A2', ruaDestino: 'C4', produto: 'BUDWEISER 600ML', lote: 'BU-80', validade: '15/07/2026', quantidade: 90, motivo: 'Desvio de Fluxo Corrigido', data: '26/06/2026' },
  { ruaOrigem: 'B3', ruaDestino: 'A1', produto: 'SKOL GFA VD 1L', lote: 'SK-12', validade: '01/08/2026', quantidade: 70, motivo: 'Remontagem de Palete Danificado', data: '27/06/2026' }
];

const SEED_PICKING_COMP: PickingComparison[] = [
  { produto: 'SKOL 600ML', lote: 'SK-2026A', validade: '12/07/2026', qtdEstoque: 500, qtdPicking: 50, diferenca: 450, status: 'Desvio Crítico' },
  { produto: 'BRAHMA CHOPP GFA VD 1L', lote: 'BR-9842', validade: '22/07/2026', qtdEstoque: 320, qtdPicking: 280, diferenca: 40, status: 'Atenção' },
  { produto: 'STELLA ARTOIS LT 269ML', lote: 'ST-5512', validade: '25/08/2026', qtdEstoque: 150, qtdPicking: 145, diferenca: 5, status: 'Conforme' },
  { produto: 'GUARANA CHP ANTARCTICA PET 2L', lote: 'GU-8821', validade: '10/08/2026', qtdEstoque: 800, qtdPicking: 50, diferenca: 750, status: 'Desvio Crítico' },
  { produto: 'ORIGINAL 600ML', lote: 'OR-3310', validade: '18/08/2026', qtdEstoque: 410, qtdPicking: 395, diferenca: 15, status: 'Conforme' },
  { produto: 'BUDWEISER 600ML', lote: 'BU-80', validade: '15/07/2026', qtdEstoque: 280, qtdPicking: 220, diferenca: 60, status: 'Atenção' },
  { produto: 'PEPSI COLA PET 2L', lote: 'PE-4100', validade: '05/09/2026', qtdEstoque: 600, qtdPicking: 580, diferenca: 20, status: 'Conforme' }
];

const CustomScatterTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-md text-xs font-sans">
        <p className="font-extrabold text-[#032b5e] uppercase mb-1">{data.fullName}</p>
        <p className="text-gray-500 font-bold">Validade Estoque: <span className="text-slate-800">{data.estoque} dias</span></p>
        <p className="text-gray-500 font-bold">Validade Picking: <span className="text-slate-800">{data.picking} dias</span></p>
        <p className="text-gray-500 font-bold">Diferença (Gap): <span className={`font-black ${data.gap > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{data.gap > 0 ? `+${data.gap}` : data.gap} dias</span></p>
        <p className="text-gray-500 font-bold mt-1">Qtd. Estoque: <span className="text-slate-800">{data.qtdEstoque} cx</span></p>
        <p className="text-gray-500 font-bold">Localização: <span className="text-slate-800">{data.location}</span></p>
      </div>
    );
  }
  return null;
};

const PORTUGUESE_MONTHS = [
  'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
  'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
];

interface BlockData {
  id: string;
  avgValidity: number; // in days
  menorValidade: number; // in days
  skuCount: number;
  pallets: number;
  criticalPct: number; // percentage of critical products (<=30 days)
  riskIndex: number;
  ranges: {
    critical: number;  // 0-30 days
    alertMedium: number; // 31-60 days
    alertLow: number;  // 61-90 days
    safe: number;      // >90 days
  };
}

const BLOCKS_DATA: Record<string, BlockData> = {
  A1: { id: 'A1', avgValidity: 105, menorValidade: 98, skuCount: 14, pallets: 160, criticalPct: 3, riskIndex: 15, ranges: { critical: 5, alertMedium: 15, alertLow: 30, safe: 110 } },
  A2: { id: 'A2', avgValidity: 95, menorValidade: 91, skuCount: 18, pallets: 170, criticalPct: 5, riskIndex: 25, ranges: { critical: 8, alertMedium: 22, alertLow: 45, safe: 95 } },
  A3: { id: 'A3', avgValidity: 72, menorValidade: 65, skuCount: 22, pallets: 180, criticalPct: 14, riskIndex: 48, ranges: { critical: 25, alertMedium: 35, alertLow: 80, safe: 40 } },
  A4: { id: 'A4', avgValidity: 25, menorValidade: 12, skuCount: 28, pallets: 155, criticalPct: 61, riskIndex: 94, ranges: { critical: 95, alertMedium: 40, alertLow: 15, safe: 5 } },
  B1: { id: 'B1', avgValidity: 115, menorValidade: 104, skuCount: 12, pallets: 167, criticalPct: 1, riskIndex: 10, ranges: { critical: 2, alertMedium: 10, alertLow: 25, safe: 130 } },
  B2: { id: 'B2', avgValidity: 68, menorValidade: 62, skuCount: 24, pallets: 168, criticalPct: 12, riskIndex: 45, ranges: { critical: 20, alertMedium: 48, alertLow: 65, safe: 35 } },
  B3: { id: 'B3', avgValidity: 42, menorValidade: 38, skuCount: 26, pallets: 165, criticalPct: 27, riskIndex: 65, ranges: { critical: 45, alertMedium: 60, alertLow: 40, safe: 20 } },
  B4: { id: 'B4', avgValidity: 28, menorValidade: 18, skuCount: 30, pallets: 168, criticalPct: 52, riskIndex: 88, ranges: { critical: 88, alertMedium: 50, alertLow: 20, safe: 10 } },
  C1: { id: 'C1', avgValidity: 120, menorValidade: 112, skuCount: 10, pallets: 166, criticalPct: 1, riskIndex: 8, ranges: { critical: 1, alertMedium: 5, alertLow: 15, safe: 145 } },
  C2: { id: 'C2', avgValidity: 92, menorValidade: 92, skuCount: 16, pallets: 190, criticalPct: 5, riskIndex: 28, ranges: { critical: 10, alertMedium: 25, alertLow: 70, safe: 85 } },
  C3: { id: 'C3', avgValidity: 78, menorValidade: 64, skuCount: 20, pallets: 175, criticalPct: 17, riskIndex: 55, ranges: { critical: 30, alertMedium: 55, alertLow: 60, safe: 30 } },
  C4: { id: 'C4', avgValidity: 15, menorValidade: 5, skuCount: 32, pallets: 152, criticalPct: 72, riskIndex: 98, ranges: { critical: 110, alertMedium: 30, alertLow: 10, safe: 2 } }
};

const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month, 1).getDay();
};

export default function FefoDashboard({ user, empresa, onBack }: FefoDashboardProps) {
  const [activeTab, setActiveTab] = useState<FefoPage>('executiva');
  const [viewUnit, setViewUnit] = useState<'u' | 'he'>('u');
  const [selectedBlock, setSelectedBlock] = useState<string>('A4');

  // Helper to convert individual units (can/bottle) to HE
  const convertUnitsToHE = (units: number, descricao: string): number => {
    const desc = (descricao || '').toUpperCase();
    let volumePerUnit = 0.350; // default to 350ml in liters
    if (desc.includes('250')) volumePerUnit = 0.250;
    else if (desc.includes('269')) volumePerUnit = 0.269;
    else if (desc.includes('350')) volumePerUnit = 0.350;
    else if (desc.includes('473')) volumePerUnit = 0.473;
    else if (desc.includes('500')) volumePerUnit = 0.500;
    else if (desc.includes('600')) volumePerUnit = 0.600;
    else if (desc.includes('1L') || desc.includes('1 L')) volumePerUnit = 1.0;
    else if (desc.includes('2L') || desc.includes('2 L')) volumePerUnit = 2.0;
    else if (desc.includes('300')) volumePerUnit = 0.300;
    return (units * volumePerUnit) / 100;
  };
  
  // Core dynamic datasets from firebase / localstorage
  const [actualValidades, setActualValidades] = useState<ValidadeRow[]>([]);
  const [rlpMeetings, setRlpMeetings] = useState<RLPMeeting[]>([]);
  const [actionPoints, setActionPoints] = useState<ActionPoint[]>([]);
  const [stockTransfers, setStockTransfers] = useState<StockTransfer[]>([]);
  const [pickingComp, setPickingComp] = useState<PickingComparison[]>([]);

  const validades = useMemo(() => {
    const companyId = empresa?.id || 'demo';
    const mockRows = generateMockValidades(companyId);
    return [...actualValidades, ...mockRows];
  }, [actualValidades, empresa?.id]);

  // Advanced Filters State
  const [periodFilter, setPeriodFilter] = useState<string>('30');
  const [productFilter, setProductFilter] = useState<string>('TODOS');
  const [categoryFilter, setCategoryFilter] = useState<string>('TODAS');
  const [ CDFilter, setCDFilter] = useState<string>('TODOS');
  const [streetFilter, setStreetFilter] = useState<string>('TODAS');
  const [blocoFilter, setBlocoFilter] = useState<string>('TODOS');
  const [lotFilter, setLotFilter] = useState<string>('TODOS');
  const [expiryBracketFilter, setExpiryBracketFilter] = useState<string>('TODAS');
  const [actionStatusFilter, setActionStatusFilter] = useState<string>('TODOS');
  const [responsibleFilter, setResponsibleFilter] = useState<string>('TODOS');

  // Estoque x Picking tab advanced filters
  const [epColaborador, setEpColaborador] = useState<string>('todos');
  const [epEmbalagem, setEpEmbalagem] = useState<string>('todos');
  const [epMeta, setEpMeta] = useState<string>('todos');
  const [epStartDate, setEpStartDate] = useState<string>('');
  const [epEndDate, setEpEndDate] = useState<string>('');
  const [showEpCalendar, setShowEpCalendar] = useState<boolean>(false);
  const [draftStartDate, setDraftStartDate] = useState<string>('');
  const [draftEndDate, setDraftEndDate] = useState<string>('');
  const [calMonth, setCalMonth] = useState<number>(6); // July (0-indexed is 6)
  const [calYear, setCalYear] = useState<number>(2026);

  // Addition forms states
  const [showAddAction, setShowAddAction] = useState(false);
  const [newAction, setNewAction] = useState<Omit<ActionPoint, 'id' | 'status'>>({
    produto: 'SKOL 600ML',
    lote: '',
    acao: '',
    responsavel: '',
    dataAbertura: new Date().toLocaleDateString('pt-BR'),
    dataPrevista: ''
  });

  const [showAddMeeting, setShowAddMeeting] = useState(false);
  const [newMeeting, setNewMeeting] = useState<Omit<RLPMeeting, 'id' | 'status'>>({
    data: new Date().toLocaleDateString('pt-BR'),
    produtos: '',
    quantidadeRisco: 100,
    estrategia: '',
    responsavel: '',
    prazo: ''
  });

  const [showAddTransfer, setShowAddTransfer] = useState(false);
  const [newTransfer, setNewTransfer] = useState<StockTransfer>({
    ruaOrigem: 'A1',
    ruaDestino: 'A2',
    produto: 'SKOL 600ML',
    lote: '',
    validade: '',
    quantidade: 50,
    motivo: 'Ajuste Operacional',
    data: new Date().toLocaleDateString('pt-BR')
  });

  const companyId = empresa?.id || 'demo';

  // 1. Sync & Seed Data
  useEffect(() => {
    // Sync validades (dynamic)
    if (!db) {
      const saved = localStorage.getItem(`validades_${companyId}`);
      if (saved) setActualValidades(JSON.parse(saved));
      return;
    }

    const q = query(collection(db, 'validades'), where('empresaId', '==', companyId));
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map(doc => ({ _docId: doc.id, ...doc.data() } as ValidadeRow));
      setActualValidades(rows);
    });

    return () => unsub();
  }, [companyId]);

  // Sync other sub-tables with localstorage (to keep editing interactive and high fidelity)
  useEffect(() => {
    const meetKey = `fefo_meetings_${companyId}`;
    const actKey = `fefo_actions_${companyId}`;
    const transferKey = `fefo_transfers_${companyId}`;
    const pickingKey = `fefo_picking_${companyId}`;

    const savedMeets = localStorage.getItem(meetKey);
    const savedActs = localStorage.getItem(actKey);
    const savedTransfers = localStorage.getItem(transferKey);
    const savedPicking = localStorage.getItem(pickingKey);

    if (savedMeets) setRlpMeetings(JSON.parse(savedMeets));
    else { setRlpMeetings(SEED_RLP_MEETINGS); localStorage.setItem(meetKey, JSON.stringify(SEED_RLP_MEETINGS)); }

    if (savedActs) setActionPoints(JSON.parse(savedActs));
    else { setActionPoints(SEED_ACTION_POINTS); localStorage.setItem(actKey, JSON.stringify(SEED_ACTION_POINTS)); }

    if (savedTransfers) setStockTransfers(JSON.parse(savedTransfers));
    else { setStockTransfers(SEED_STOCK_TRANSFERS); localStorage.setItem(transferKey, JSON.stringify(SEED_STOCK_TRANSFERS)); }

    if (savedPicking) setPickingComp(JSON.parse(savedPicking));
    else { setPickingComp(SEED_PICKING_COMP); localStorage.setItem(pickingKey, JSON.stringify(SEED_PICKING_COMP)); }

  }, [companyId]);

  // Save helper functions
  const saveMeetings = (list: RLPMeeting[]) => {
    setRlpMeetings(list);
    localStorage.setItem(`fefo_meetings_${companyId}`, JSON.stringify(list));
  };

  const saveActions = (list: ActionPoint[]) => {
    setActionPoints(list);
    localStorage.setItem(`fefo_actions_${companyId}`, JSON.stringify(list));
  };

  const saveTransfers = (list: StockTransfer[]) => {
    setStockTransfers(list);
    localStorage.setItem(`fefo_transfers_${companyId}`, JSON.stringify(list));
  };

  const savePicking = (list: PickingComparison[]) => {
    setPickingComp(list);
    localStorage.setItem(`fefo_picking_${companyId}`, JSON.stringify(list));
  };

  // Helper date/time functions
  const getDaysRemaining = (expDate: string) => {
    if (!expDate) return 999;
    try {
      let normDate = expDate;
      if (expDate.includes('/')) {
        const [d, m, y] = expDate.split('/');
        normDate = `${y}-${m}-${d}`;
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const exp = new Date(normDate + 'T00:00:00');
      if (isNaN(exp.getTime())) return 999;
      return Math.round((exp.getTime() - today.getTime()) / 86400000);
    } catch {
      return 999;
    }
  };

  // 2. Metrics Compiling
  const compiledValidades = validades.map(v => {
    const days = getDaysRemaining(v.validade);
    let bracket: '0-30' | '31-60' | '61-90' | '90+' = '90+';
    if (days <= 30) bracket = '0-30';
    else if (days <= 60) bracket = '31-60';
    else if (days <= 90) bracket = '61-90';

    const totalUnitiesRaw = (v.palhete || 0) * (v.lastro || 1) * (v.caixa || 1);
    const totalUnities = viewUnit === 'u' ? totalUnitiesRaw : Math.round(convertUnitsToHE(totalUnitiesRaw, v.descricao) * 100) / 100;
    const category = v.descricao.toLowerCase().includes('pet') ? 'PET' : 
                     v.descricao.toLowerCase().includes('lata') || v.descricao.toLowerCase().includes('lt') ? 'Lata' : 'Garrafa Retornável';

    return {
      ...v,
      days,
      bracket,
      totalUnities,
      totalUnitiesRaw,
      category,
      unitCost: 6.20, // estimated cost factor per bottle/pack
      estimatedCost: totalUnitiesRaw * 6.20
    };
  });

  // Calculate high quality KPIs
  const totalRiscoUnities = compiledValidades.reduce((acc, curr) => curr.days <= 90 ? acc + curr.totalUnities : acc, 0);
  const totalValorRisco = compiledValidades.reduce((acc, curr) => curr.days <= 90 ? acc + curr.estimatedCost : acc, 0);
  const totalVencidosUnidades = compiledValidades.reduce((acc, curr) => curr.days < 0 ? acc + curr.totalUnities : acc, 0);

  // Desvios FEFO calculation
  const totalDesviosFEFO = pickingComp.filter(p => p.status === 'Desvio Crítico').length;
  const totalConformeFEFO = pickingComp.filter(p => p.status === 'Conforme').length;
  const aderenciaFEFO = pickingComp.length > 0 ? Math.round((totalConformeFEFO / pickingComp.length) * 100) : 92;

  // Actions completion rate
  const completedActions = actionPoints.filter(a => a.status === 'Concluído').length;
  const completionRate = actionPoints.length > 0 ? Math.round((completedActions / actionPoints.length) * 100) : 0;

  // 3. Dynamic Interactive Actions handling
  const handleAddActionPoint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAction.lote || !newAction.acao || !newAction.responsavel) {
      alert('Preencha os dados da ação corretiva RLP.');
      return;
    }
    const item: ActionPoint = {
      id: `act-${Date.now()}`,
      ...newAction,
      status: 'Pendente'
    };
    saveActions([...actionPoints, item]);
    setNewAction({
      produto: 'SKOL 600ML',
      lote: '',
      acao: '',
      responsavel: '',
      dataAbertura: new Date().toLocaleDateString('pt-BR'),
      dataPrevista: ''
    });
    setShowAddAction(false);
  };

  const handleDeleteAction = (id: string) => {
    if (confirm('Excluir esta ação preventiva RLP?')) {
      saveActions(actionPoints.filter(a => a.id !== id));
    }
  };

  const handleToggleActionStatus = (id: string) => {
    const statuses: Array<ActionPoint['status']> = ['Pendente', 'Em Andamento', 'Concluído', 'Atrasado'];
    const updated = actionPoints.map(a => {
      if (a.id === id) {
        const nextIdx = (statuses.indexOf(a.status) + 1) % statuses.length;
        const dataConcl = statuses[nextIdx] === 'Concluído' ? new Date().toLocaleDateString('pt-BR') : undefined;
        return { ...a, status: statuses[nextIdx], dataConclusao: dataConcl };
      }
      return a;
    });
    saveActions(updated);
  };

  const handleAddRLPMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMeeting.produtos || !newMeeting.estrategia || !newMeeting.responsavel) {
      alert('Preencha os detalhes obrigatórios da reunião RLP.');
      return;
    }
    const item: RLPMeeting = {
      id: `rlp-${Date.now()}`,
      ...newMeeting,
      status: 'Aberta'
    };
    saveMeetings([item, ...rlpMeetings]);
    setNewMeeting({
      data: new Date().toLocaleDateString('pt-BR'),
      produtos: '',
      quantidadeRisco: 100,
      estrategia: '',
      responsavel: '',
      prazo: ''
    });
    setShowAddMeeting(false);
  };

  const handleAddTransferItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTransfer.lote || !newTransfer.quantidade) {
      alert('Preencha as informações da movimentação de rua.');
      return;
    }
    saveTransfers([newTransfer, ...stockTransfers]);
    setNewTransfer({
      ruaOrigem: 'A1',
      ruaDestino: 'A2',
      produto: 'SKOL 600ML',
      lote: '',
      validade: '',
      quantidade: 50,
      motivo: 'Ajuste Operacional',
      data: new Date().toLocaleDateString('pt-BR')
    });
    setShowAddTransfer(false);
  };

  // 4. Advanced Filter Logic for Page 6 (Detalhamento)
  const getFilteredProductsList = () => {
    return compiledValidades.filter(v => {
      // Product
      if (productFilter !== 'TODOS' && v.codigo !== productFilter) return false;
      // Category
      if (categoryFilter !== 'TODAS' && v.category !== categoryFilter) return false;
      // Location (CD/Rua filter simulated)
      if (streetFilter !== 'TODAS' && !v.descricao.includes(streetFilter)) {
        // dynamic check of locations/picking
        if (streetFilter === 'PICKING' && v.localizacao !== 'picking') return false;
        if (streetFilter === 'CENTRAL' && v.localizacao !== 'central') return false;
        if (streetFilter === 'MARKETPLACE' && v.localizacao !== 'marketplace') return false;
      }
      // Bracket
      if (expiryBracketFilter !== 'TODAS' && v.bracket !== expiryBracketFilter) return false;

      // Bloco
      if (blocoFilter !== 'TODOS' && v.bloco !== blocoFilter) return false;

      // Period limit
      if (periodFilter !== 'tudo') {
        const daysLimit = parseInt(periodFilter);
        if (v.days > daysLimit) return false;
      }

      return true;
    });
  };

  const filteredValidadesList = getFilteredProductsList().sort((a, b) => a.days - b.days);

  // 5. Chart Data preparations
  // Bracket distribution chart
  const bracketCount = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
  compiledValidades.forEach(v => {
    bracketCount[v.bracket] = (bracketCount[v.bracket] || 0) + v.totalUnities;
  });

  const bracketChartData = [
    { name: 'Crítico (0-30 dias)', value: bracketCount['0-30'], color: '#ef4444' },
    { name: 'Alerta (31-60 dias)', value: bracketCount['31-60'], color: '#3b82f6' },
    { name: 'Atenção (61-90 dias)', value: bracketCount['61-90'], color: '#eab308' },
    { name: 'Seguro (+90 dias)', value: bracketCount['90+'], color: '#10b981' }
  ];

  // Overdue actions by category
  const actionsStatusCount = { 'Pendente': 0, 'Em Andamento': 0, 'Concluído': 0, 'Atrasado': 0 };
  actionPoints.forEach(a => {
    actionsStatusCount[a.status] = (actionsStatusCount[a.status] || 0) + 1;
  });

  const actionsPieData = Object.entries(actionsStatusCount).map(([name, value]) => ({ name, value }));

  // Heatmap data simulator for Streets
  const streetActivity: Record<string, number> = {};
  stockTransfers.forEach(t => {
    streetActivity[t.ruaOrigem] = (streetActivity[t.ruaOrigem] || 0) + t.quantidade;
    streetActivity[t.ruaDestino] = (streetActivity[t.ruaDestino] || 0) + t.quantidade;
  });

  // Category Risk Data (Stacked)
  const categoryRisk: Record<string, { critico: number, seguro: number }> = {
    'Garrafa Retornável': { critico: 0, seguro: 0 },
    'PET': { critico: 0, seguro: 0 },
    'Lata': { critico: 0, seguro: 0 }
  };

  compiledValidades.forEach(v => {
    const cat = v.category;
    if (categoryRisk[cat]) {
      if (v.days <= 60) categoryRisk[cat].critico += v.totalUnities;
      else categoryRisk[cat].seguro += v.totalUnities;
    }
  });

  const categoryRiskChartData = Object.entries(categoryRisk).map(([name, val]) => ({
    name,
    'Crítico / Alerta': val.critico,
    'Estoque Regular': val.seguro
  }));

  // Trend evolution data helper (last 6 weeks)
  const trendData = [
    { week: 'Semana 1', risco: totalRiscoUnities * 1.25, aderencia: aderenciaFEFO - 4 },
    { week: 'Semana 2', risco: totalRiscoUnities * 1.15, aderencia: aderenciaFEFO - 2 },
    { week: 'Semana 3', risco: totalRiscoUnities * 1.10, aderencia: aderenciaFEFO - 1 },
    { week: 'Semana 4', risco: totalRiscoUnities * 0.95, aderencia: aderenciaFEFO },
    { week: 'Semana 5', risco: totalRiscoUnities,       aderencia: aderenciaFEFO }
  ];

  // Calendar generator for custom datepicker
  const calendarDays = useMemo(() => {
    const firstDayIndex = getFirstDayOfMonth(calYear, calMonth);
    const totalDays = getDaysInMonth(calYear, calMonth);
    
    // Previous month info
    const prevMonth = calMonth === 0 ? 11 : calMonth - 1;
    const prevYear = calMonth === 0 ? calYear - 1 : calYear;
    const prevMonthDays = getDaysInMonth(prevYear, prevMonth);
    
    const days = [];
    
    // Fill previous month trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({
        dayNum,
        isCurrentMonth: false,
        dateStr,
        month: prevMonth,
        year: prevYear
      });
    }
    
    // Fill current month days
    for (let i = 1; i <= totalDays; i++) {
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        dayNum: i,
        isCurrentMonth: true,
        dateStr,
        month: calMonth,
        year: calYear
      });
    }
    
    // Fill next month leading days
    const nextMonth = calMonth === 11 ? 0 : calMonth + 1;
    const nextYear = calMonth === 11 ? calYear + 1 : calYear;
    let nextDayNum = 1;
    while (days.length < 42) {
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(nextDayNum).padStart(2, '0')}`;
      days.push({
        dayNum: nextDayNum,
        isCurrentMonth: false,
        dateStr,
        month: nextMonth,
        year: nextYear
      });
      nextDayNum++;
    }
    
    return days;
  }, [calMonth, calYear]);

  // Apply predefined shortcut dates
  const applyShortcut = (shortcut: string) => {
    const today = new Date('2026-07-18T00:00:00');
    let start = new Date(today);
    let end = new Date(today);
    
    switch (shortcut) {
      case 'hoje':
        // 2026-07-18 to 2026-07-18
        break;
      case 'ontem':
        start.setDate(today.getDate() - 1);
        end.setDate(today.getDate() - 1);
        break;
      case '7dias':
        start.setDate(today.getDate() - 6);
        break;
      case '30dias':
        start.setDate(today.getDate() - 29);
        break;
      case 'esteMes':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'mesPassado':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case '4meses':
        start = new Date(today.getFullYear(), today.getMonth() - 4, today.getDate());
        break;
      default:
        break;
    }
    
    const formatDate = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const r = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${r}`;
    };
    
    setDraftStartDate(formatDate(start));
    setDraftEndDate(formatDate(end));
    
    // Focus calendar view to start date's month and year
    setCalMonth(start.getMonth());
    setCalYear(start.getFullYear());
  };

  // Filtered picking data for Estoque x Picking tab
  const filteredPickingComp = useMemo(() => {
    return pickingComp.filter(p => {
      // 1. Filter by Packaging (Embalagem)
      if (epEmbalagem !== 'todos') {
        const prodUpper = p.produto.toUpperCase();
        if (epEmbalagem === 'vidro') {
          const isVidro = prodUpper.includes('GFA') || prodUpper.includes('VD') || prodUpper.includes('600ML') || prodUpper.includes('1L') || prodUpper.includes('ORIGINAL') || prodUpper.includes('BUDWEISER') || prodUpper.includes('BRAHMA') || prodUpper.includes('SKOL');
          if (!isVidro) return false;
        } else if (epEmbalagem === 'lata') {
          const isLata = prodUpper.includes('LT') || prodUpper.includes('LATA') || prodUpper.includes('269') || prodUpper.includes('LATA');
          if (!isLata) return false;
        } else if (epEmbalagem === 'pet') {
          const isPet = prodUpper.includes('PET') || prodUpper.includes('2L') || prodUpper.includes('PEPSI') || prodUpper.includes('GUARANA') || prodUpper.includes('ANTARCTICA');
          if (!isPet) return false;
        }
      }

      // 2. Filter by Meta (Compliance)
      if (epMeta !== 'todos') {
        if (epMeta === 'dentro') {
          if (p.status !== 'Conforme') return false;
        } else if (epMeta === 'fora') {
          if (p.status !== 'Atenção' && p.status !== 'Desvio Crítico') return false;
        }
      }

      // 3. Filter by Date range (validade)
      if (epStartDate || epEndDate) {
        if (p.validade) {
          const parts = p.validade.split('/');
          if (parts.length === 3) {
            const valDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00`);
            if (epStartDate) {
              const start = new Date(epStartDate + 'T00:00:00');
              if (valDate < start) return false;
            }
            if (epEndDate) {
              const end = new Date(epEndDate + 'T00:00:00');
              if (valDate > end) return false;
            }
          }
        }
      }

      // 4. Filter by Collaborator (Colaborador)
      if (epColaborador !== 'todos') {
        const pColab = p.produto.includes('SKOL') || p.produto.includes('ORIGINAL') ? 'Marcos' :
                       p.produto.includes('BRAHMA') || p.produto.includes('BUDWEISER') ? 'Thiago' :
                       p.produto.includes('STELLA') ? 'Aline' :
                       p.produto.includes('GUARANA') ? 'Cleiton' : 'Carlos';
        if (pColab.toLowerCase() !== epColaborador.toLowerCase()) return false;
      }

      return true;
    });
  }, [pickingComp, epEmbalagem, epMeta, epStartDate, epEndDate, epColaborador]);

  // 4 New Operational Charts Datasets for ESTOQUE x PICKING
  const fefoEstoquePickingData = useMemo(() => {
    return filteredPickingComp.map(p => {
      const days = getDaysRemaining(p.validade);
      // Clean up product name for short SKU
      let shortSku = p.produto;
      if (p.produto.includes('SKOL')) shortSku = 'SKOL 600';
      else if (p.produto.includes('BRAHMA')) shortSku = 'BRAHMA 1L';
      else if (p.produto.includes('STELLA')) shortSku = 'STELLA 269';
      else if (p.produto.includes('GUARANA')) shortSku = 'GUARANÁ 2L';
      else if (p.produto.includes('ORIGINAL')) shortSku = 'ORIGINAL 600';
      else if (p.produto.includes('BUDWEISER')) shortSku = 'BUD 600';
      else if (p.produto.includes('PEPSI')) shortSku = 'PEPSI 2L';
      else {
        shortSku = p.produto.split(' ').slice(0, 2).join(' ');
      }

      // Consistent mock values for default data
      let pickingDays = Math.max(5, days);
      let estoqueDays = pickingDays;

      if (p.produto === 'SKOL 600ML') { estoqueDays = 15; pickingDays = 45; }
      else if (p.produto === 'BRAHMA CHOPP GFA VD 1L') { estoqueDays = 25; pickingDays = 25; }
      else if (p.produto === 'STELLA ARTOIS LT 269ML') { estoqueDays = 60; pickingDays = 45; }
      else if (p.produto === 'GUARANA CHP ANTARCTICA PET 2L') { estoqueDays = 30; pickingDays = 90; }
      else if (p.produto === 'ORIGINAL 600ML') { estoqueDays = 40; pickingDays = 40; }
      else if (p.produto === 'BUDWEISER 600ML') { estoqueDays = 15; pickingDays = 35; }
      else if (p.produto === 'PEPSI COLA PET 2L') { estoqueDays = 90; pickingDays = 70; }
      else {
        // Dynamic fallback
        if (p.status === 'Desvio Crítico') {
          estoqueDays = Math.max(10, Math.round(pickingDays * 0.4));
        } else if (p.status === 'Conforme') {
          estoqueDays = Math.round(pickingDays * 1.3);
        } else {
          estoqueDays = pickingDays;
        }
      }

      const gap = pickingDays - estoqueDays;

      return {
        sku: shortSku,
        fullName: p.produto,
        estoque: estoqueDays,
        picking: pickingDays,
        gap: gap,
        status: p.status,
        qtdEstoque: p.qtdEstoque,
        qtdPicking: p.qtdPicking,
        location: p.status === 'Conforme' ? 'Picking' : 'Estoque Central',
        validade: p.validade
      };
    });
  }, [filteredPickingComp]);

  const gapSortedData = useMemo(() => {
    return [...fefoEstoquePickingData].sort((a, b) => b.gap - a.gap);
  }, [fefoEstoquePickingData]);

  const conformidadeData = useMemo(() => {
    const currentConformes = filteredPickingComp.filter(p => p.status === 'Conforme').length;
    const currentDesvios = filteredPickingComp.filter(p => p.status === 'Desvio Crítico' || p.status === 'Atenção').length;
    const currentPct = filteredPickingComp.length > 0 ? Math.round((currentConformes / filteredPickingComp.length) * 100) : 100;

    return [
      { mes: 'Março/2026', conformes: 14, naoConformes: 6, percentual: 70, meta: 98 },
      { mes: 'Abril/2026', conformes: 16, naoConformes: 4, percentual: 80, meta: 98 },
      { mes: 'Maio/2026', conformes: 19, naoConformes: 3, percentual: 86, meta: 98 },
      { mes: 'Junho/2026', conformes: 22, naoConformes: 2, percentual: 91, meta: 98 },
      { mes: 'Julho/2026 (Atual)', conformes: currentConformes, naoConformes: currentDesvios, percentual: currentPct, meta: 98 }
    ];
  }, [filteredPickingComp]);

  return (
    <div id="fefo-dashboard-wrapper" className="flex flex-col gap-3 bg-[#f8fafc] text-[#0f172a] p-4 rounded-xl shadow-sm border border-gray-200/80 w-full">
      
      {/* SECTION HEADER */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 border-b border-gray-200 pb-5">
        <div className="flex items-center gap-3">
          {onBack && (
            <button 
              onClick={onBack}
              className="p-1.5 hover:bg-gray-200/80 rounded-lg transition-colors cursor-pointer text-gray-500 border-none bg-transparent"
              title="Voltar"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="font-sans font-black text-2xl tracking-tight text-[#032b5e] uppercase flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-[#f5a623]" /> FEFO E CONTROLE DE VENCIMENTO
            </h1>
            <p className="text-[10px] text-gray-500 tracking-wider font-bold uppercase mt-0.5">
              PAINEL CORPORATIVO PARA PREVENÇÃO DE PERDAS, MONITORAMENTO FEFO E ALINHAMENTO RLP (LOGÍSTICA &amp; VENDAS)
            </p>
          </div>
        </div>

        {/* Tab/Page navigation */}
        <div className="flex flex-wrap items-center bg-gray-100 p-1 rounded-xl border border-gray-200/60 shrink-0">
          <button 
            onClick={() => setActiveTab('executiva')}
            className={`px-3 py-2 rounded-lg font-sans font-bold text-[10px] uppercase tracking-wider transition-all border-none cursor-pointer ${activeTab === 'executiva' ? 'bg-[#032b5e] text-white shadow-sm' : 'text-gray-500 hover:text-[#032b5e] bg-transparent'}`}
          >
            Visão Executiva
          </button>
          <button 
            onClick={() => setActiveTab('estoque-picking')}
            className={`px-3 py-2 rounded-lg font-sans font-bold text-[10px] uppercase tracking-wider transition-all border-none cursor-pointer ${activeTab === 'estoque-picking' ? 'bg-[#032b5e] text-white shadow-sm' : 'text-gray-500 hover:text-[#032b5e] bg-transparent'}`}
          >
            Estoque x Picking
          </button>
          <button 
            onClick={() => setActiveTab('estoque-estoque')}
            className={`px-3 py-2 rounded-lg font-sans font-bold text-[10px] uppercase tracking-wider transition-all border-none cursor-pointer ${activeTab === 'estoque-estoque' ? 'bg-[#032b5e] text-white shadow-sm' : 'text-gray-500 hover:text-[#032b5e] bg-transparent'}`}
          >
            Estoque x Estoque por Bloco
          </button>
          <button 
            onClick={() => setActiveTab('boarda3')}
            className={`px-3 py-2 rounded-lg font-sans font-bold text-[10px] uppercase tracking-wider transition-all border-none cursor-pointer ${activeTab === 'boarda3' ? 'bg-[#032b5e] text-white shadow-sm' : 'text-gray-500 hover:text-[#032b5e] bg-transparent'}`}
          >
            Quadro de Ações
          </button>
        </div>

        {/* Unit Selector Toggle */}
        <div className="flex flex-col shrink-0">
          <span className="text-[10px] font-extrabold text-slate-500 tracking-wider uppercase mb-1">
            VISUALIZAÇÃO
          </span>
          <div className="flex items-center bg-gray-100 p-0.5 rounded-xl border border-gray-200/60 h-[38px] w-[110px] shrink-0">
            <button
              type="button"
              onClick={() => setViewUnit('u')}
              className={`flex-1 rounded-lg font-sans font-black text-xs transition-all border-none cursor-pointer h-full flex items-center justify-center ${viewUnit === 'u' ? 'bg-[#032b5e] text-white shadow-sm' : 'text-slate-400 hover:text-[#032b5e] bg-transparent'}`}
            >
              CX
            </button>
            <button
              type="button"
              onClick={() => setViewUnit('he')}
              className={`flex-1 rounded-lg font-sans font-black text-xs transition-all border-none cursor-pointer h-full flex items-center justify-center ${viewUnit === 'he' ? 'bg-[#032b5e] text-white shadow-sm' : 'text-slate-400 hover:text-[#032b5e] bg-transparent'}`}
            >
              HE
            </button>
          </div>
        </div>
      </div>

      {/* CORE STATS (KPIs) - DISPLAYED REGARDLESS OF TAB */}
      {activeTab !== 'estoque-estoque' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[8.5px] uppercase font-black tracking-widest text-gray-400 block">PRODUTOS PRÓXIMOS AO VENCIMENTO</span>
            <div className="flex items-baseline mt-2">
              <span className="text-3xl font-extrabold text-[#ef4444]">{totalRiscoUnities}</span>
              <span className="text-[10px] font-bold text-gray-500 ml-1">{viewUnit === 'u' ? 'CX' : 'HE'} (≤90 dias)</span>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-2 mt-2 text-[9px] text-gray-400 font-bold uppercase flex justify-between">
            <span>Risco Financeiro:</span>
            <span className="text-[#ef4444]">{totalValorRisco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[8.5px] uppercase font-black tracking-widest text-gray-400 block">ADERÊNCIA GLOBAL AO FEFO</span>
            <div className="flex items-baseline mt-2">
              <span className="text-3xl font-extrabold text-emerald-500">{aderenciaFEFO}%</span>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-2 mt-2 text-[9px] text-gray-400 font-bold uppercase flex justify-between">
            <span>Meta de Fábrica:</span>
            <span className="text-emerald-500">≥ 95%</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[8.5px] uppercase font-black tracking-widest text-gray-400 block">DESVIOS ESTOQUE x PICKING</span>
            <div className="flex items-baseline mt-2">
              <span className="text-3xl font-extrabold text-amber-500">{totalDesviosFEFO}</span>
              <span className="text-[10px] font-bold text-gray-500 ml-1">lotes fora</span>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-2 mt-2 text-[9px] text-gray-400 font-bold uppercase flex justify-between">
            <span>Ações de Bloqueio:</span>
            <span className="text-amber-500">Urgente</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[8.5px] uppercase font-black tracking-widest text-gray-400 block">MOVIMENTAÇÕES (RUA x RUA)</span>
            <div className="flex items-baseline mt-2">
              <span className="text-3xl font-extrabold text-[#032b5e]">{stockTransfers.length}</span>
              <span className="text-[10px] font-bold text-gray-500 ml-1">remanejamentos</span>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-2 mt-2 text-[9px] text-gray-400 font-bold uppercase flex justify-between">
            <span>Últimas 48 Horas</span>
            <span className="text-[#032b5e]">Ativo</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between md:col-span-2 lg:col-span-1">
          <div>
            <span className="text-[8.5px] uppercase font-black tracking-widest text-gray-400 block">CONCLUSÃO DE AÇÕES RLP</span>
            <div className="flex items-baseline mt-2">
              <span className="text-3xl font-extrabold text-sky-500">{completionRate}%</span>
              <span className="text-[10px] font-bold text-gray-500 ml-1">taxa</span>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-2 mt-2 text-[9px] text-gray-400 font-bold uppercase flex justify-between">
            <span>Ações Pendentes:</span>
            <span className="text-sky-600">{actionPoints.filter(a => a.status !== 'Concluído').length}</span>
          </div>
        </div>
      </div>
      )}



      {/* TAB PAGE RENDERINGS */}

      {/* ─────────────────────────────────────────────────────────────────
          TAB 1: VISÃO EXECUTIVA
          ───────────────────────────────────────────────────────────────── */}
      {activeTab === 'executiva' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Chart: Vencimento por faixa */}
            <div className="lg:col-span-8 bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-4">
              <div>
                <h3 className="font-sans font-black text-xs uppercase text-[#032b5e] tracking-wider flex items-center gap-1">
                  <Layers className="w-4 h-4 text-sky-500" /> Risco por Volume &amp; Faixa de Exclusão FEFO
                </h3>
                <p className="text-[10px] text-gray-400 font-bold mt-0.5">Representação das faixas críticas em dias restantes</p>
              </div>

              <div className="h-64 w-full">
                {bracketChartData.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                    Cadastre lotes de validades para gerar a volumetria por faixa.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={bracketChartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={9.5} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={9.5} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ fontSize: 10 }} />
                      <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={45}>
                        {bracketChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Chart: Status das Ações RLP */}
            <div className="lg:col-span-4 bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-4 justify-between">
              <div>
                <h3 className="font-sans font-black text-xs uppercase text-[#032b5e] tracking-wider">
                  Distribuição das Ações RLP
                </h3>
                <p className="text-[10px] text-gray-400 font-bold mt-0.5">Qualidade e andamento de planos de ação preventivos</p>
              </div>

              <div className="h-44 w-full relative flex items-center justify-center">
                {actionPoints.length === 0 ? (
                  <div className="text-xs text-gray-400">Sem ações</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={actionsPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={65}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {actionsPieData.map((entry, index) => {
                          const col = entry.name === 'Concluído' ? '#10b981' : 
                                      entry.name === 'Em Andamento' ? '#3b82f6' : 
                                      entry.name === 'Atrasado' ? '#ef4444' : '#eab308';
                          return <Cell key={`cell-${index}`} fill={col} />;
                        })}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 9 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="grid grid-cols-2 gap-1.5 border-t border-gray-100 pt-3">
                {actionsPieData.map((entry) => {
                  const col = entry.name === 'Concluído' ? 'bg-emerald-500' : 
                              entry.name === 'Em Andamento' ? 'bg-blue-500' : 
                              entry.name === 'Atrasado' ? 'bg-red-500' : 'bg-yellow-500';
                  return (
                    <div key={entry.name} className="flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${col}`} />
                      <span className="text-[9px] font-black text-gray-600 uppercase truncate">
                        {entry.name}: {entry.value} ac.
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left box: Category Risk Stacked */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-4">
              <div>
                <h3 className="font-sans font-black text-xs uppercase text-[#032b5e] tracking-wider">
                  Risco de Validade por Categoria de Produto
                </h3>
                <p className="text-[10px] text-gray-400 font-bold mt-0.5">Visualização de aderência em gola x fardo</p>
              </div>

              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryRiskChartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} />
                    <YAxis stroke="#94a3b8" fontSize={9} />
                    <Tooltip contentStyle={{ fontSize: 9 }} />
                    <Legend wrapperStyle={{ fontSize: 9 }} />
                    <Bar dataKey="Crítico / Alerta" stackId="a" fill="#ef4444" />
                    <Bar dataKey="Estoque Regular" stackId="a" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Right box: Trend History */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-4">
              <div>
                <h3 className="font-sans font-black text-xs uppercase text-[#032b5e] tracking-wider">
                  Tendência Mensal e Aderência de Inventário FEFO
                </h3>
                <p className="text-[10px] text-gray-400 font-bold mt-0.5">Evolução do volume em risco vs. índice de aderência</p>
              </div>

              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid stroke="#f1f5f9" />
                    <XAxis dataKey="week" stroke="#94a3b8" fontSize={9} />
                    <YAxis stroke="#94a3b8" fontSize={9} />
                    <Tooltip contentStyle={{ fontSize: 9 }} />
                    <Legend wrapperStyle={{ fontSize: 9 }} />
                    <Line type="monotone" dataKey="risco" name={`Volume Crítico (${viewUnit === 'u' ? 'CX' : 'HE'})`} stroke="#ef4444" strokeWidth={2} />
                    <Line type="monotone" dataKey="aderencia" name="Aderência FEFO (%)" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}





      {/* ─────────────────────────────────────────────────────────────────
          TAB 3: ESTOQUE X PICKING
          ───────────────────────────────────────────────────────────────── */}
      {activeTab === 'estoque-picking' && (
        <div className="flex flex-col gap-6">
          
          {/* PAINEL DE FILTROS DE ESTOQUE x PICKING (IGUAL A FOTO) */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
              
              {/* Filtro por Colaborador */}
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Colaborador</label>
                <div className="relative w-full">
                  <select 
                    value={epColaborador} 
                    onChange={e => setEpColaborador(e.target.value)}
                    className="w-full h-10 pl-3.5 pr-10 border border-slate-200 rounded-xl bg-white text-xs font-bold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all cursor-pointer shadow-sm outline-none appearance-none"
                  >
                    <option value="todos">Todos</option>
                    <option value="marcos">Marcos</option>
                    <option value="thiago">Thiago</option>
                    <option value="aline">Aline</option>
                    <option value="cleiton">Cleiton</option>
                    <option value="carlos">Carlos</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              </div>

              {/* Filtro por Embalagem */}
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Embalagem</label>
                <div className="relative w-full">
                  <select 
                    value={epEmbalagem} 
                    onChange={e => setEpEmbalagem(e.target.value)}
                    className="w-full h-10 pl-3.5 pr-10 border border-slate-200 rounded-xl bg-white text-xs font-bold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all cursor-pointer shadow-sm outline-none appearance-none"
                  >
                    <option value="todos">Todas</option>
                    <option value="vidro">Garrafa de Vidro (VD)</option>
                    <option value="lata">Lata (LT)</option>
                    <option value="pet">Embalagem PET</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              </div>

              {/* Filtro por Período (Calendário) */}
              <div className="flex flex-col gap-1.5 w-full relative">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Período (Calendário)</label>
                <div 
                  onClick={() => {
                    const nextVal = !showEpCalendar;
                    if (nextVal) {
                      setDraftStartDate(epStartDate);
                      setDraftEndDate(epEndDate);
                      const d = epStartDate ? new Date(epStartDate + 'T00:00:00') : new Date('2026-07-18T00:00:00');
                      setCalMonth(d.getMonth());
                      setCalYear(d.getFullYear());
                    }
                    setShowEpCalendar(nextVal);
                  }}
                  className="w-full h-10 px-3.5 border border-slate-200 rounded-xl bg-white flex items-center justify-between text-xs font-bold hover:border-slate-300 hover:bg-slate-50 transition-all cursor-pointer shadow-sm select-none"
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span className="text-blue-600 font-extrabold">
                      {epStartDate || epEndDate ? (
                        `${epStartDate ? epStartDate.split('-').reverse().slice(0, 2).join('/') : ''} a ${epEndDate ? epEndDate.split('-').reverse().slice(0, 2).join('/') : ''}`
                      ) : 'Todo o Período'}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </div>

                {showEpCalendar && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowEpCalendar(false)} 
                    />
                    <div className="absolute top-[45px] left-1/2 -translate-x-1/2 sm:translate-x-0 sm:-left-[240px] mt-1 bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col sm:flex-row z-50 overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-slate-100 w-[95vw] sm:w-[560px] md:w-[600px] select-none animate-in fade-in-50 zoom-in-95 duration-150">
                      
                      {/* COLUNA ESQUERDA - ATALHOS */}
                      <div className="w-full sm:w-[170px] p-4 flex flex-col justify-between bg-slate-50/50">
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] font-black tracking-wider text-slate-400 uppercase mb-3">Atalhos</span>
                          {[
                            { label: 'Hoje', id: 'hoje' },
                            { label: 'Ontem', id: 'ontem' },
                            { label: 'Últimos 7 dias', id: '7dias' },
                            { label: 'Últimos 30 dias', id: '30dias' },
                            { label: 'Este Mês', id: 'esteMes' },
                            { label: 'Mês Passado', id: 'mesPassado' },
                            { label: 'Últimos 4 meses', id: '4meses' }
                          ].map((item) => {
                            const todayStr = '2026-07-18';
                            let active = false;
                            
                            // Visual active state for shortcuts
                            if (item.id === 'hoje' && draftStartDate === todayStr && draftEndDate === todayStr) active = true;
                            if (item.id === 'esteMes' && draftStartDate === '2026-07-01' && draftEndDate === '2026-07-31') active = true;
                            if (item.id === 'mesPassado' && draftStartDate === '2026-06-01' && draftEndDate === '2026-06-30') active = true;
                            
                            return (
                              <button
                                key={item.id}
                                onClick={() => applyShortcut(item.id)}
                                className={`text-left text-xs px-2.5 py-1.5 rounded-lg font-bold transition-all border-none outline-none cursor-pointer ${
                                  active 
                                    ? 'bg-blue-50 text-blue-700 font-extrabold' 
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                                }`}
                              >
                                {item.label}
                              </button>
                            );
                          })}
                        </div>
                        
                        <button
                          onClick={() => {
                            setDraftStartDate('');
                            setDraftEndDate('');
                            setEpStartDate('');
                            setEpEndDate('');
                            setShowEpCalendar(false);
                          }}
                          className="text-left text-[11px] font-extrabold text-rose-600 hover:text-rose-700 transition-all border-none bg-transparent pt-4 uppercase tracking-wider outline-none cursor-pointer mt-4"
                        >
                          Limpar Filtro
                        </button>
                      </div>

                      {/* COLUNA DIREITA - CALENDÁRIO */}
                      <div className="flex-1 p-5 flex flex-col gap-4 bg-white">
                        {/* Navegação de Mês */}
                        <div className="flex justify-between items-center px-1">
                          <button 
                            onClick={() => {
                              if (calMonth === 0) {
                                setCalMonth(11);
                                setCalYear(prev => prev - 1);
                              } else {
                                setCalMonth(prev => prev - 1);
                              }
                            }}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 transition-all border-none bg-transparent cursor-pointer outline-none"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          
                          <span className="text-xs font-black text-[#032b5e] uppercase tracking-widest">
                            {PORTUGUESE_MONTHS[calMonth]} {calYear}
                          </span>
                          
                          <button 
                            onClick={() => {
                              if (calMonth === 11) {
                                setCalMonth(0);
                                setCalYear(prev => prev + 1);
                              } else {
                                setCalMonth(prev => prev + 1);
                              }
                            }}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 transition-all border-none bg-transparent cursor-pointer outline-none"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Grid Dias da Semana */}
                        <div className="grid grid-cols-7 gap-1 text-center font-bold text-[9px] text-slate-400 uppercase tracking-wider">
                          <span>Dom</span>
                          <span>Seg</span>
                          <span>Ter</span>
                          <span>Qua</span>
                          <span>Qui</span>
                          <span>Sex</span>
                          <span>Sáb</span>
                        </div>

                        {/* Grid Dias */}
                        <div className="grid grid-cols-7 gap-1">
                          {calendarDays.map((day, idx) => {
                            const isToday = day.dateStr === '2026-07-18';
                            const isSelectedStart = draftStartDate === day.dateStr;
                            const isSelectedEnd = draftEndDate === day.dateStr;
                            const isInRange = draftStartDate && draftEndDate && 
                                              day.dateStr >= draftStartDate && 
                                              day.dateStr <= draftEndDate;
                            
                            // Selection cell styling
                            let cellClass = "relative h-8 w-8 mx-auto flex flex-col items-center justify-center text-xs font-bold transition-all cursor-pointer select-none border-none outline-none ";
                            
                            if (isSelectedStart || isSelectedEnd) {
                              cellClass += "bg-[#032b5e] text-white rounded-xl z-10 shadow-sm";
                            } else if (isInRange) {
                              cellClass += "bg-blue-50/70 text-blue-700 rounded-none w-full";
                              if (day.dateStr === draftStartDate) cellClass += " rounded-l-xl";
                              if (day.dateStr === draftEndDate) cellClass += " rounded-r-xl";
                            } else if (!day.isCurrentMonth) {
                              cellClass += "text-slate-300 hover:bg-slate-50 rounded-lg";
                            } else {
                              cellClass += "text-slate-700 hover:bg-slate-100 rounded-lg";
                            }

                            return (
                              <div
                                key={idx}
                                onClick={() => {
                                  if (!draftStartDate || (draftStartDate && draftEndDate)) {
                                    setDraftStartDate(day.dateStr);
                                    setDraftEndDate('');
                                  } else {
                                    if (day.dateStr >= draftStartDate) {
                                      setDraftEndDate(day.dateStr);
                                    } else {
                                      setDraftStartDate(day.dateStr);
                                      setDraftEndDate('');
                                    }
                                  }
                                }}
                                className={cellClass}
                              >
                                <span>{day.dayNum}</span>
                                
                                {/* Today indicator dot */}
                                {isToday && (
                                  <span className={`absolute bottom-1 w-1 h-1 rounded-full ${
                                    isSelectedStart || isSelectedEnd ? 'bg-white' : 'bg-blue-600'
                                  }`} />
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Rodapé do Calendário */}
                        <div className="flex justify-between items-center pt-3 border-t border-slate-100 mt-2 text-xs">
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide">Customizado</span>
                            <span className="text-[11px] font-bold text-slate-700">
                              {draftStartDate ? (
                                draftEndDate ? (
                                  `${draftStartDate.split('-').reverse().slice(0, 2).join('/')}/${draftStartDate.split('-')[0]} - ${draftEndDate.split('-').reverse().slice(0, 2).join('/')}/${draftEndDate.split('-')[0]}`
                                ) : `${draftStartDate.split('-').reverse().slice(0, 2).join('/')}/${draftStartDate.split('-')[0]}`
                              ) : '_'}
                            </span>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setDraftStartDate('');
                                setDraftEndDate('');
                              }}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors border-none cursor-pointer outline-none uppercase tracking-wide"
                            >
                              Limpar
                            </button>
                            
                            <button
                              onClick={() => {
                                setEpStartDate(draftStartDate);
                                setEpEndDate(draftEndDate);
                                setShowEpCalendar(false);
                              }}
                              className="px-4 py-1.5 bg-[#032b5e] hover:bg-[#021d3f] text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 border-none cursor-pointer outline-none uppercase tracking-wider shadow-sm"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" /> Aplicar
                            </button>
                          </div>
                        </div>

                      </div>

                    </div>
                  </>
                )}
              </div>

              {/* Filtro por Status da Meta */}
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Status da Meta</label>
                <div className="relative w-full">
                  <select 
                    value={epMeta} 
                    onChange={e => setEpMeta(e.target.value)}
                    className="w-full h-10 pl-3.5 pr-10 border border-slate-200 rounded-xl bg-white text-xs font-bold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all cursor-pointer shadow-sm outline-none appearance-none"
                  >
                    <option value="todos">Todos</option>
                    <option value="dentro">Dentro da Meta</option>
                    <option value="fora">Fora da Meta</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Grid com os 4 Gráficos Operacionais e Gerenciais de Controle FEFO */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* 1. Comparativo de Validade - Estoque x Picking */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[9px] bg-blue-50 text-[#032b5e] border border-blue-200 px-2 py-0.5 rounded font-black tracking-wider uppercase">Indicador Comparativo</span>
                <h3 className="font-sans font-black text-xs uppercase text-[#032b5e] tracking-wider mt-2">
                  1. Comparativo de Validade - Estoque x Picking
                </h3>
                <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                  Comparação do vencimento médio dos lotes em estoque vs. no picking por SKU
                </p>
              </div>

              <div className="h-56 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={fefoEstoquePickingData} margin={{ top: 15, right: 10, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="sku" stroke="#94a3b8" fontSize={9} fontStyle="bold" />
                    <YAxis stroke="#94a3b8" fontSize={9} label={{ value: 'Dias a vencer', angle: -90, position: 'insideLeft', style: { fontSize: 8, fill: '#94a3b8' } }} />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          const gapColor = data.gap > 0 ? 'text-red-600' : 'text-emerald-600';
                          return (
                            <div className="bg-white p-2.5 border border-slate-200 rounded-lg shadow-md text-xs font-sans">
                              <p className="font-black text-[#032b5e] uppercase mb-1">{data.fullName}</p>
                              <p className="text-slate-500 font-bold text-[10px]">Validade Estoque: <span className="text-slate-800 font-mono">{data.estoque} dias</span></p>
                              <p className="text-slate-500 font-bold text-[10px]">Validade Picking: <span className="text-slate-800 font-mono">{data.picking} dias</span></p>
                              <p className="text-slate-500 font-bold text-[10px] border-t border-slate-100 pt-1 mt-1">
                                Diferença: <span className={`font-black font-mono ${gapColor}`}>{data.gap > 0 ? `+${data.gap}` : data.gap} dias</span>
                              </p>
                              {data.gap > 0 && (
                                <p className="text-[8px] font-black text-red-600 bg-red-50 px-1.5 py-0.5 rounded uppercase mt-1">
                                  🚨 POSSÍVEL QUEBRA DO FEFO
                                </p>
                              )}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 9 }} />
                    <Bar dataKey="estoque" name="Estoque (Média)" fill="#032b5e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="picking" name="Picking (Média)" fill="#93c5fd" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-red-50 border border-red-100 p-2 rounded-lg mt-3 text-[9px] text-red-700 font-bold leading-normal">
                ⚠️ <strong>Atenção Operacional:</strong> SKUs onde a barra de Picking (azul claro) supera a de Estoque (azul escuro) indicam quebra crítica de FEFO (lotes novos consumidos antes).
              </div>
            </div>

            {/* 2. Gap de Validade (Diferença entre Estoque e Picking) */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[9px] bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded font-black tracking-wider uppercase">Indicador de Desvio</span>
                <h3 className="font-sans font-black text-xs uppercase text-[#032b5e] tracking-wider mt-2">
                  2. Gap de Validade - Estoque x Picking
                </h3>
                <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                  Gap = Validade Picking − Validade Estoque. Valores positivos indicam inversão (erro).
                </p>
              </div>

              <div className="h-56 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={gapSortedData} layout="vertical" margin={{ top: 5, right: 15, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" stroke="#94a3b8" fontSize={9} />
                    <YAxis type="category" dataKey="sku" stroke="#94a3b8" fontSize={9} width={65} />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white p-2.5 border border-slate-200 rounded-lg shadow-md text-xs font-sans">
                              <p className="font-black text-[#032b5e] uppercase mb-1">{data.fullName}</p>
                              <p className="text-slate-500 font-bold text-[10px]">Calculado: <span className="font-mono text-slate-800">{data.picking}d (Picking) - {data.estoque}d (Estoque)</span></p>
                              <p className="text-slate-500 font-bold text-[10px] mt-0.5">Gap Operacional: <span className={`font-black font-mono ${data.gap > 0 ? 'text-red-600' : data.gap === 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{data.gap > 0 ? `+${data.gap}` : data.gap} dias</span></p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="gap" name="Gap de Validade (dias)" radius={[0, 4, 4, 0]}>
                      {gapSortedData.map((entry, index) => {
                        const barColor = entry.gap > 0 ? '#032b5e' : entry.gap === 0 ? '#3b82f6' : '#93c5fd';
                        return <Cell key={`cell-${index}`} fill={barColor} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-3 gap-1.5 text-[8px] font-black uppercase text-slate-500 mt-3">
                <div className="bg-blue-50 border border-blue-100 p-1.5 rounded text-blue-800 text-center flex items-center justify-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#93c5fd]" /> Gap &lt; 0 (FEFO OK)
                </div>
                <div className="bg-blue-50 border border-blue-100 p-1.5 rounded text-blue-800 text-center flex items-center justify-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#3b82f6]" /> Gap = 0 (Correto)
                </div>
                <div className="bg-blue-50 border border-blue-100 p-1.5 rounded text-blue-800 text-center flex items-center justify-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#032b5e]" /> Gap &gt; 0 (Erro / Inversão)
                </div>
              </div>
            </div>

            {/* 3. Dispersão Estoque × Picking */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[9px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded font-black tracking-wider uppercase">Equilíbrio do CD</span>
                <h3 className="font-sans font-black text-xs uppercase text-[#032b5e] tracking-wider mt-2">
                  3. Validade Estoque x Picking (Dispersão)
                </h3>
                <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                  Eixo X (Estoque) vs. Eixo Y (Picking). Pontos acima da diagonal representam desvios do FEFO.
                </p>
              </div>

              <div className="h-56 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 15, right: 15, bottom: 5, left: -25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" dataKey="estoque" name="Validade Estoque" unit=" dias" stroke="#94a3b8" fontSize={9} domain={[0, 100]} />
                    <YAxis type="number" dataKey="picking" name="Validade Picking" unit=" dias" stroke="#94a3b8" fontSize={9} domain={[0, 100]} />
                    <ZAxis range={[60, 60]} />
                    <Tooltip content={<CustomScatterTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                    
                    {/* Linha diagonal de referência (Y=X) */}
                    <ReferenceLine segment={[{ x: 10, y: 10 }, { x: 90, y: 90 }]} stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="3 3" />
                    
                    <Scatter name="SKUs" data={fefoEstoquePickingData}>
                      {fefoEstoquePickingData.map((entry, index) => {
                        const pointColor = entry.gap > 0 ? '#032b5e' : entry.gap === 0 ? '#3b82f6' : '#93c5fd';
                        return <Cell key={`cell-${index}`} fill={pointColor} />;
                      })}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 mt-3 text-[9px] text-slate-500 font-medium leading-normal">
                💡 <strong>Análise de Dispersão:</strong> Pontos <strong>abaixo</strong> da diagonal indicam picking correto (consumindo lotes mais antigos). Pontos <strong>acima</strong> exigem verificação imediata de posicionamento.
              </div>
            </div>

            {/* 4. Índice de Conformidade FEFO */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[9px] bg-purple-50 text-purple-600 border border-purple-200 px-2 py-0.5 rounded font-black tracking-wider uppercase">Evolução Histórica</span>
                <h3 className="font-sans font-black text-xs uppercase text-[#032b5e] tracking-wider mt-2">
                  4. Conformidade FEFO Histórica - Estoque x Picking
                </h3>
                <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                  Percentual de conformidade de giro nos últimos meses vs. Meta Operacional (98%)
                </p>
              </div>

              <div className="h-56 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={conformidadeData} margin={{ top: 15, right: 10, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="mes" stroke="#94a3b8" fontSize={8.5} fontStyle="bold" />
                    <YAxis stroke="#94a3b8" fontSize={9} domain={[0, 100]} unit="%" />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white p-2.5 border border-slate-200 rounded-lg shadow-md text-xs font-sans">
                              <p className="font-black text-[#032b5e] uppercase mb-1">{data.mes}</p>
                              <p className="text-emerald-600 font-bold text-[10px]">SKUs Conformes: <span className="font-bold">{data.conformes}</span></p>
                              <p className="text-red-500 font-bold text-[10px]">Desvios de FEFO: <span className="font-bold">{data.naoConformes}</span></p>
                              <p className="text-slate-800 font-extrabold text-[11px] mt-1 pt-1 border-t border-slate-100">
                                Índice de Conformidade: <span className="font-mono">{data.percentual}%</span>
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    
                    {/* Linha de Meta Operacional 98% */}
                    <ReferenceLine y={98} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="3 3" label={{ value: 'Meta CD: 98%', fill: '#ef4444', fontSize: 8.5, position: 'top', fontWeight: 'bold' }} />
                    
                    <Bar dataKey="percentual" name="Índice FEFO (%)" radius={[4, 4, 0, 0]}>
                      {conformidadeData.map((entry, index) => {
                        const barColor = entry.percentual >= 98 ? '#032b5e' : entry.percentual >= 85 ? '#3b82f6' : '#93c5fd';
                        return <Cell key={`cell-${index}`} fill={barColor} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-[#eff6ff] p-2 rounded-lg mt-3 text-[9px] text-[#1e40af] font-bold leading-normal text-center">
                📊 <strong>Análise de Coleta de Dados:</strong> No mês atual, registramos <strong>{aderenciaFEFO}%</strong> de conformidade com base nas auditorias de validade no CD. A evolução histórica mostra uma melhora consistente desde Março (70%) até Junho (91%), sofrendo impacto de novos lotes pendentes no picking em Julho.
              </div>
            </div>

          </div>

          {/* Main Reconciliation Table */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-4 mb-4">
              <div>
                <h3 className="font-sans font-black text-xs uppercase text-[#032b5e] tracking-wider">
                  CONCILIAÇÃO FÍSICA E AJUSTES: ESTOQUE x PICKING
                </h3>
                <p className="text-[10px] text-gray-400 font-bold mt-0.5">Visão detalhada de diferenças volumétricas entre o depósito central e as ruas de picking</p>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[9.5px] font-bold text-gray-500 uppercase">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Conforme
                </span>
                <span className="flex items-center gap-1 text-[9.5px] font-bold text-gray-500 uppercase">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Atenção
                </span>
                <span className="flex items-center gap-1 text-[9.5px] font-bold text-gray-500 uppercase">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Desvio Crítico
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse font-sans text-xs min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-200">
                    <th className="p-3 text-gray-500 text-left uppercase tracking-wider text-[9px]">Produto</th>
                    <th className="p-3 text-gray-500 text-left uppercase tracking-wider text-[9px]">Lote</th>
                    <th className="p-3 text-gray-500 text-center uppercase tracking-wider text-[9px]">Validade</th>
                    <th className="p-3 text-gray-500 text-right uppercase tracking-wider text-[9px]">Quantidade no Estoque</th>
                    <th className="p-3 text-gray-500 text-right uppercase tracking-wider text-[9px]">Quantidade no Picking</th>
                    <th className="p-3 text-gray-500 text-right uppercase tracking-wider text-[9px]">Diferença Física</th>
                    <th className="p-3 text-gray-500 text-center uppercase tracking-wider text-[9px]">Status de Alinhamento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredPickingComp.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-400 font-bold uppercase text-[10px]">
                        Nenhum produto corresponde aos filtros operacionais aplicados.
                      </td>
                    </tr>
                  ) : (
                    filteredPickingComp.map((p, idx) => {
                      const badgeColor = p.status === 'Conforme' ? 'bg-emerald-100 text-emerald-800' :
                                         p.status === 'Atenção' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800';
                      
                      return (
                        <tr key={idx} className="hover:bg-slate-50/55">
                          <td className="p-3 font-semibold text-slate-800 uppercase">{p.produto}</td>
                          <td className="p-3 font-mono font-bold text-gray-600">{p.lote}</td>
                          <td className="p-3 text-center text-slate-700 font-medium">{p.validade}</td>
                          <td className="p-3 text-right font-semibold text-slate-700">{p.qtdEstoque} cx</td>
                          <td className="p-3 text-right font-semibold text-slate-700">{p.qtdPicking} cx</td>
                          <td className="p-3 text-right font-black text-slate-900">{p.diferenca} cx</td>
                          <td className="p-3 text-center">
                            <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${badgeColor}`}>
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 mt-5 border border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <p className="text-gray-500 leading-relaxed max-w-2xl">
                💡 <strong>Regra Operacional do Armazém:</strong> Diferenças acima de 200 SKUs entre o estoque central e a rua de picking exigem tarefa de reposição urgente gerada automaticamente no painel do empilhador para evitar rupturas de carga de frota.
              </p>
              <button 
                onClick={() => {
                  const refreshed = pickingComp.map(p => ({
                    ...p,
                    qtdPicking: p.status === 'Desvio Crítico' ? p.qtdPicking + 300 : p.qtdPicking,
                    diferenca: p.status === 'Desvio Crítico' ? p.qtdEstoque - (p.qtdPicking + 300) : p.diferenca,
                    status: p.status === 'Desvio Crítico' ? 'Conforme' : p.status as any
                  }));
                  savePicking(refreshed);
                  alert('Reposições enviadas ao coletor do Empilhador! Picking atualizado.');
                }}
                className="bg-[#032b5e] hover:bg-[#021f44] text-white font-sans font-bold text-[10px] uppercase tracking-wider py-2.5 px-4 rounded-lg transition-all border-none cursor-pointer shadow-sm shrink-0"
              >
                Forçar Reposição de Picking
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ─────────────────────────────────────────────────────────────────
          TAB 4: ESTOQUE X ESTOQUE (POR BLOCO)
          ───────────────────────────────────────────────────────────────── */}
      {activeTab === 'estoque-estoque' && (() => {
        const blocksArray = Object.values(BLOCKS_DATA);

        // 1. Average Validity Data: A1 to C4
        const avgValidityData = blocksArray.map(b => ({
          name: b.id,
          avgValidity: b.avgValidity,
          color: b.avgValidity > 90 ? '#10b981' : b.avgValidity > 30 ? '#eab308' : '#ef4444'
        }));

        // 2. Range Distribution Data
        const rangeDistributionData = blocksArray.map(b => ({
          name: b.id,
          '0-30 dias': b.ranges.critical,
          '31-60 dias': b.ranges.alertMedium,
          '61-90 dias': b.ranges.alertLow,
          '>90 dias': b.ranges.safe,
        }));

        // 3. Risk Ranking Data: sorted by riskIndex descending
        const riskRankingData = [...blocksArray]
          .sort((a, b) => b.riskIndex - a.riskIndex)
          .map(b => ({
            name: b.id,
            riskIndex: b.riskIndex,
            pallets: b.pallets,
            menorValidade: b.menorValidade,
            color: b.riskIndex >= 70 ? '#ef4444' : b.riskIndex >= 40 ? '#f97316' : '#10b981'
          }));

        return (
          <div className="flex flex-col gap-6">
            
            {/* Grid for Chart Rows */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* 1. Comparativo de Validade Média por Bloco */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-[9px] bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded font-black tracking-wider uppercase">
                    Análise de Envelhecimento
                  </span>
                  <h3 className="font-sans font-black text-xs uppercase text-[#032b5e] tracking-wider mt-2.5">
                    Validade Média por Bloco
                  </h3>
                  <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                    Comparação da validade média em dias. Cores em escala: Verde (Alta), Amarelo (Média), Vermelho (Baixa).
                  </p>
                </div>

                <div className="h-64 w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={avgValidityData} margin={{ top: 15, right: 10, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} fontWeight="bold" />
                      <YAxis stroke="#94a3b8" fontSize={9} label={{ value: 'Média de Dias', angle: -90, position: 'insideLeft', style: { fontSize: 8, fill: '#94a3b8', fontWeight: 'bold' } }} />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white p-2.5 border border-slate-200 rounded-lg shadow-md text-xs font-sans">
                                <p className="font-black text-[#032b5e] uppercase mb-1">Bloco {data.name}</p>
                                <p className="text-slate-500 font-bold text-[10px]">
                                  Validade Média: <span className="text-slate-800 font-mono font-black">{data.avgValidity} dias</span>
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="avgValidity" radius={[4, 4, 0, 0]}>
                        {avgValidityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-lg mt-3 text-[10px] text-slate-500 font-medium leading-relaxed flex items-center justify-between">
                  <div>
                    <strong>Legenda Escala:</strong>
                    <span className="ml-2 inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Alta (&gt;90d)</span>
                    <span className="ml-2 inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" /> Média (31-90d)</span>
                    <span className="ml-2 inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Baixa (≤30d)</span>
                  </div>
                </div>
              </div>

              {/* 2. Distribuição das Faixas de Validade por Bloco */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-[9px] bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded font-black tracking-wider uppercase">
                    Distribuição de Lotes
                  </span>
                  <h3 className="font-sans font-black text-xs uppercase text-[#032b5e] tracking-wider mt-2.5">
                    Distribuição de Validades por Bloco
                  </h3>
                  <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                    Quantidade de paletes/caixas em cada bloco divididos por faixas de prazo de validade.
                  </p>
                </div>

                <div className="h-64 w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rangeDistributionData} margin={{ top: 15, right: 10, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} fontWeight="bold" />
                      <YAxis stroke="#94a3b8" fontSize={9} />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white p-2.5 border border-slate-200 rounded-lg shadow-md text-xs font-sans">
                                <p className="font-black text-[#032b5e] uppercase mb-1.5">Bloco {data.name}</p>
                                <p className="text-red-600 font-bold text-[10px]">0-30 dias: <span className="font-black font-mono">{data['0-30 dias']} un</span></p>
                                <p className="text-orange-500 font-bold text-[10px]">31-60 dias: <span className="font-black font-mono">{data['31-60 dias']} un</span></p>
                                <p className="text-yellow-500 font-bold text-[10px]">61-90 dias: <span className="font-black font-mono">{data['61-90 dias']} un</span></p>
                                <p className="text-emerald-600 font-bold text-[10px]">&gt;90 dias: <span className="font-black font-mono">{data['>90 dias']} un</span></p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 9, fontWeight: 'bold' }} />
                      <Bar dataKey="0-30 dias" stackId="a" fill="#ef4444" name="0-30d" />
                      <Bar dataKey="31-60 dias" stackId="a" fill="#f97316" name="31-60d" />
                      <Bar dataKey="61-90 dias" stackId="a" fill="#eab308" name="61-90d" />
                      <Bar dataKey=">90 dias" stackId="a" fill="#10b981" name=">90d" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-red-50 border border-red-100 p-2.5 rounded-lg mt-3 text-[10px] text-red-700 font-bold leading-relaxed">
                  ⚠️ <strong>Destaque Operacional:</strong> Os blocos com maior concentração na faixa de <strong>0-30 dias</strong> são: 
                  <span className="bg-red-600 text-white font-black font-mono px-1.5 py-0.5 rounded ml-1.5 mr-1">C4 (110)</span>,
                  <span className="bg-red-600 text-white font-black font-mono px-1.5 py-0.5 rounded mr-1">A4 (95)</span>, e 
                  <span className="bg-red-600 text-white font-black font-mono px-1.5 py-0.5 rounded">B4 (88)</span>.
                </div>
              </div>

            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* 3. Ranking dos Blocos com Maior Risco de Vencimento */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-[9px] bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded font-black tracking-wider uppercase">
                    Priorização de Expedição
                  </span>
                  <h3 className="font-sans font-black text-xs uppercase text-[#032b5e] tracking-wider mt-2.5">
                    Ranking de Risco por Bloco
                  </h3>
                  <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                    Ordenação do maior para o menor risco, baseado na quantidade total e dias restantes. Destaque em vermelho para os blocos críticos.
                  </p>
                </div>

                <div className="h-64 w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={riskRankingData} layout="vertical" margin={{ top: 5, right: 15, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis type="number" stroke="#94a3b8" fontSize={9} fontWeight="bold" domain={[0, 100]} label={{ value: 'Índice de Risco', position: 'insideBottom', offset: -5, style: { fontSize: 8, fill: '#94a3b8', fontWeight: 'bold' } }} />
                      <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={10} fontWeight="bold" width={35} />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            const riskStatus = data.riskIndex >= 70 ? 'CRÍTICO' : data.riskIndex >= 40 ? 'MÉDIO' : 'SEGURO';
                            return (
                              <div className="bg-white p-2.5 border border-slate-200 rounded-lg shadow-md text-xs font-sans">
                                <p className="font-black text-[#032b5e] uppercase mb-1">Bloco {data.name}</p>
                                <p className="text-slate-500 font-bold text-[10px]">
                                  Índice de Risco: <span className="text-slate-800 font-mono font-black">{data.riskIndex}/100</span>
                                </p>
                                <p className="text-slate-500 font-bold text-[10px]">
                                  Menor Validade: <span className="text-slate-800 font-mono font-bold">{data.menorValidade} dias</span>
                                </p>
                                <p className="text-slate-500 font-bold text-[10px]">
                                  Volume Estocado: <span className="text-slate-800 font-mono font-bold">{data.pallets} paletes</span>
                                </p>
                                <p className="text-[9px] font-black uppercase text-white px-1.5 py-0.5 rounded mt-1.5 text-center" style={{ backgroundColor: data.color }}>
                                  STATUS: {riskStatus}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="riskIndex" name="Índice de Risco" radius={[0, 4, 4, 0]}>
                        {riskRankingData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[10px] text-slate-500 leading-normal font-medium">
                  💡 <strong>Diretriz Operacional:</strong> Os blocos vermelhos indicam que os lotes estocados requerem <strong>expedição imediata</strong> ou <strong>transferência prioritária para picking</strong> para evitar quebra de validade.
                </div>
              </div>

              {/* 4. Heat Map de Validade dos Blocos */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-[9px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded font-black tracking-wider uppercase">
                    Layout Físico
                  </span>
                  <h3 className="font-sans font-black text-xs uppercase text-[#032b5e] tracking-wider mt-2.5">
                    Mapa de Validade por Bloco
                  </h3>
                  <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                    Representação física do armazém. Clique em um bloco para ver a auditoria detalhada de SKUs, paletes e menor validade.
                  </p>
                </div>

                {/* Interactive Warehouse Grid and details side-by-side */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mt-4">
                  
                  {/* 3x4 Grid Layout of the Warehouse */}
                  <div className="md:col-span-7 bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col justify-center">
                    <div className="text-center font-black text-[9px] uppercase tracking-wider text-slate-400 mb-2 font-mono">
                      ▲ CORREDOR OPERACIONAL / ENTRADA ▲
                    </div>
                    
                    <div className="grid grid-cols-4 gap-2">
                      {/* Headers */}
                      <div className="col-span-4 grid grid-cols-4 gap-2 text-center text-[9px] font-bold text-slate-400 uppercase font-mono">
                        <span>SEC 1</span>
                        <span>SEC 2</span>
                        <span>SEC 3</span>
                        <span>SEC 4</span>
                      </div>

                      {/* Row A */}
                      {['A1', 'A2', 'A3', 'A4'].map((id) => {
                        const b = BLOCKS_DATA[id];
                        const isSelected = selectedBlock === id;
                        let colorClass = 'bg-emerald-500 text-white hover:bg-emerald-600';
                        if (b.menorValidade <= 30) colorClass = 'bg-red-500 text-white hover:bg-red-600';
                        else if (b.menorValidade <= 60) colorClass = 'bg-orange-500 text-white hover:bg-orange-600';
                        else if (b.menorValidade <= 90) colorClass = 'bg-yellow-500 text-slate-800 hover:bg-yellow-600';

                        return (
                          <button
                            key={id}
                            onClick={() => setSelectedBlock(id)}
                            className={`p-3 rounded-lg text-center font-sans transition-all duration-150 relative cursor-pointer border-none flex flex-col items-center justify-center ${colorClass} ${
                              isSelected ? 'ring-4 ring-offset-2 ring-slate-800 shadow-lg scale-105 z-10' : 'opacity-90 shadow-sm'
                            }`}
                          >
                            <span className="font-black text-xs">{id}</span>
                            <span className="text-[8px] font-bold font-mono mt-0.5">{b.menorValidade} dias</span>
                          </button>
                        );
                      })}

                      {/* Row B */}
                      {['B1', 'B2', 'B3', 'B4'].map((id) => {
                        const b = BLOCKS_DATA[id];
                        const isSelected = selectedBlock === id;
                        let colorClass = 'bg-emerald-500 text-white hover:bg-emerald-600';
                        if (b.menorValidade <= 30) colorClass = 'bg-red-500 text-white hover:bg-red-600';
                        else if (b.menorValidade <= 60) colorClass = 'bg-orange-500 text-white hover:bg-orange-600';
                        else if (b.menorValidade <= 90) colorClass = 'bg-yellow-500 text-slate-800 hover:bg-yellow-600';

                        return (
                          <button
                            key={id}
                            onClick={() => setSelectedBlock(id)}
                            className={`p-3 rounded-lg text-center font-sans transition-all duration-150 relative cursor-pointer border-none flex flex-col items-center justify-center ${colorClass} ${
                              isSelected ? 'ring-4 ring-offset-2 ring-slate-800 shadow-lg scale-105 z-10' : 'opacity-90 shadow-sm'
                            }`}
                          >
                            <span className="font-black text-xs">{id}</span>
                            <span className="text-[8px] font-bold font-mono mt-0.5">{b.menorValidade} dias</span>
                          </button>
                        );
                      })}

                      {/* Row C */}
                      {['C1', 'C2', 'C3', 'C4'].map((id) => {
                        const b = BLOCKS_DATA[id];
                        const isSelected = selectedBlock === id;
                        let colorClass = 'bg-emerald-500 text-white hover:bg-emerald-600';
                        if (b.menorValidade <= 30) colorClass = 'bg-red-500 text-white hover:bg-red-600';
                        else if (b.menorValidade <= 60) colorClass = 'bg-orange-500 text-white hover:bg-orange-600';
                        else if (b.menorValidade <= 90) colorClass = 'bg-yellow-500 text-slate-800 hover:bg-yellow-600';

                        return (
                          <button
                            key={id}
                            onClick={() => setSelectedBlock(id)}
                            className={`p-3 rounded-lg text-center font-sans transition-all duration-150 relative cursor-pointer border-none flex flex-col items-center justify-center ${colorClass} ${
                              isSelected ? 'ring-4 ring-offset-2 ring-slate-800 shadow-lg scale-105 z-10' : 'opacity-90 shadow-sm'
                            }`}
                          >
                            <span className="font-black text-xs">{id}</span>
                            <span className="text-[8px] font-bold font-mono mt-0.5">{b.menorValidade} dias</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex justify-center items-center gap-2 mt-3 flex-wrap text-[8px] font-black uppercase text-slate-400 tracking-wider">
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-emerald-500 rounded" /> &gt;90d</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-yellow-500 rounded" /> 61-90d</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-orange-500 rounded" /> 31-60d</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-red-500 rounded" /> ≤30d</span>
                    </div>
                  </div>

                  {/* Audit details side card for selected block */}
                  <div className="md:col-span-5 bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col justify-between font-sans">
                    <div>
                      <h4 className="text-[10px] font-black text-[#032b5e] uppercase tracking-wider mb-2 pb-1.5 border-b border-slate-200">
                        Detalhamento: Bloco {selectedBlock}
                      </h4>
                      
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center py-1">
                          <span className="text-slate-500 font-bold text-[10px] uppercase">SKUs Ativos</span>
                          <span className="font-mono font-black text-slate-800">{BLOCKS_DATA[selectedBlock].skuCount} SKUs</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-slate-500 font-bold text-[10px] uppercase">Paletes Totais</span>
                          <span className="font-mono font-black text-slate-800">{BLOCKS_DATA[selectedBlock].pallets} un</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-slate-500 font-bold text-[10px] uppercase">Menor Validade</span>
                          <span className="font-mono font-black text-red-600 bg-red-50 px-1.5 py-0.5 rounded">{BLOCKS_DATA[selectedBlock].menorValidade} dias</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-slate-500 font-bold text-[10px] uppercase">Validade Média</span>
                          <span className="font-mono font-black text-slate-800">{BLOCKS_DATA[selectedBlock].avgValidity} dias</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-slate-500 font-bold text-[10px] uppercase">Lotes Críticos (≤30d)</span>
                          <span className="font-mono font-black text-red-500 bg-red-50 px-1.5 py-0.5 rounded">{BLOCKS_DATA[selectedBlock].criticalPct}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Progress bar representing critical % */}
                    <div className="mt-3 pt-2 border-t border-slate-200">
                      <div className="flex justify-between text-[9px] font-bold text-slate-400 mb-1">
                        <span>PERCENTUAL CRÍTICO (≤30d)</span>
                        <span className="text-red-500 font-black">{BLOCKS_DATA[selectedBlock].criticalPct}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${BLOCKS_DATA[selectedBlock].criticalPct > 50 ? 'bg-red-500' : 'bg-amber-500'} transition-all duration-300`} 
                          style={{ width: `${BLOCKS_DATA[selectedBlock].criticalPct}%` }} 
                        />
                      </div>
                    </div>

                  </div>

                </div>
              </div>

            </div>

            {/* 5. Tabela Resultado do Dashboard */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div>
                <span className="text-[9px] bg-blue-50 text-[#032b5e] border border-blue-200 px-2 py-0.5 rounded font-black tracking-wider uppercase">
                  Metodologia Operacional
                </span>
                <h3 className="font-sans font-black text-xs uppercase text-[#032b5e] tracking-wider mt-2">
                  Resultado do Dashboard & Matriz de Decisão Operacional
                </h3>
                <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                  Diretrizes de campo baseadas nos indicadores gerenciais de validade por bloco físico.
                </p>
              </div>

              <div className="overflow-x-auto mt-4">
                <table className="w-full border-collapse font-sans text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-left">
                      <th className="p-3 text-gray-500 uppercase tracking-wider text-[10px] font-black w-1/4">Gráfico</th>
                      <th className="p-3 text-gray-500 uppercase tracking-wider text-[10px] font-black w-1/3">Objetivo</th>
                      <th className="p-3 text-gray-500 uppercase tracking-wider text-[10px] font-black w-5/12">Decisão Operacional</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr className="hover:bg-slate-50/50">
                      <td className="p-3 font-bold text-slate-800">Validade Média por Bloco</td>
                      <td className="p-3 text-slate-600">Comparar a validade média entre os blocos A1–C4</td>
                      <td className="p-3 text-slate-700 font-medium">Identificar blocos com estoque mais antigo.</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="p-3 font-bold text-slate-800">Distribuição das Faixas de Validade</td>
                      <td className="p-3 text-slate-600">Verificar como as validades estão distribuídas em cada bloco</td>
                      <td className="p-3 text-slate-700 font-medium">Direcionar a expedição e o remanejamento de produtos.</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="p-3 font-bold text-slate-800">Ranking de Risco por Bloco</td>
                      <td className="p-3 text-slate-600">Priorizar os blocos com maior risco de vencimento</td>
                      <td className="p-3 text-slate-700 font-medium">Definir a sequência de atuação da operação.</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="p-3 font-bold text-slate-800">Heat Map dos Blocos</td>
                      <td className="p-3 text-slate-600">Localizar visualmente os blocos críticos</td>
                      <td className="p-3 text-slate-700 font-medium">Facilitar a tomada de decisão rápida e o acompanhamento operacional.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        );
      })()}




      {false && activeTab === 'rlp' && (
        <div className="flex flex-col gap-6">
          
          {/* RLP WEEKLY MEETINGS SCHEDULE */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-4 mb-4">
              <div>
                <h3 className="font-sans font-black text-xs uppercase text-[#032b5e] tracking-wider flex items-center gap-1.5">
                  <Users className="w-4.5 h-4.5 text-[#f5a623]" /> HISTÓRICO DE REUNIÕES RLP (LOGÍSTICA + VENDAS)
                </h3>
                <p className="text-[10px] text-gray-400 font-bold mt-0.5">Definição de estratégias corporativas de escoamento para os maiores lotes ofensores em risco de vencimento</p>
              </div>
              
              <button 
                onClick={() => setShowAddMeeting(!showAddMeeting)}
                className="flex items-center gap-1 bg-[#032b5e] hover:bg-[#021f44] text-white font-sans font-bold text-[10px] uppercase tracking-wider px-3 py-2 rounded-lg transition-all border-none cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Nova Reunião RLP
              </button>
            </div>

            {showAddMeeting && (
              <form onSubmit={handleAddRLPMeeting} className="bg-slate-50 p-4 border border-gray-200 rounded-xl mb-5 text-xs flex flex-col gap-3">
                <h4 className="font-bold text-[#032b5e] uppercase text-[10px] tracking-wider">Registrar Ata de Reunião RLP</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Data da Reunião *</label>
                    <input 
                      type="text" 
                      value={newMeeting.data} 
                      onChange={e => setNewMeeting({ ...newMeeting, data: e.target.value })}
                      placeholder="DD/MM/AAAA"
                      className="w-full p-2 border border-gray-300 rounded text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Produtos Ofensores Discutidos *</label>
                    <input 
                      type="text" 
                      value={newMeeting.produtos} 
                      onChange={e => setNewMeeting({ ...newMeeting, produtos: e.target.value })}
                      placeholder="Ex: Brahma 600ml..."
                      className="w-full p-2 border border-gray-300 rounded text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Quantidade em Risco (Fardo/SKUs)</label>
                    <input 
                      type="number" 
                      value={newMeeting.quantidadeRisco} 
                      onChange={e => setNewMeeting({ ...newMeeting, quantidadeRisco: parseInt(e.target.value) || 0 })}
                      className="w-full p-2 border border-gray-300 rounded text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Responsável *</label>
                    <input 
                      type="text" 
                      value={newMeeting.responsavel} 
                      onChange={e => setNewMeeting({ ...newMeeting, responsavel: e.target.value })}
                      placeholder="Nome do Ofensor/Cargo"
                      className="w-full p-2 border border-gray-300 rounded text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-8">
                    <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Estratégia de Escoamento Definida *</label>
                    <input 
                      type="text" 
                      value={newMeeting.estrategia} 
                      onChange={e => setNewMeeting({ ...newMeeting, estrategia: e.target.value })}
                      placeholder="Ex: Combo Brahma + Churrasco no canal de bares..."
                      className="w-full p-2 border border-gray-300 rounded text-xs"
                      required
                    />
                  </div>
                  <div className="md:col-span-4">
                    <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Prazo de Ação *</label>
                    <input 
                      type="text" 
                      value={newMeeting.prazo} 
                      onChange={e => setNewMeeting({ ...newMeeting, prazo: e.target.value })}
                      placeholder="DD/MM/AAAA"
                      className="w-full p-2 border border-gray-300 rounded text-xs"
                      required
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="self-end py-2 px-6 bg-[#032b5e] hover:bg-[#021f44] text-white font-sans font-bold text-[10px] uppercase tracking-wider rounded border-none cursor-pointer"
                >
                  Salvar Ata RLP
                </button>
              </form>
            )}

            <div className="overflow-x-auto">
              <table className="w-full border-collapse font-sans text-xs min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-200">
                    <th className="p-3 text-gray-500 text-left uppercase tracking-wider text-[9px]">Data Reunião</th>
                    <th className="p-3 text-gray-500 text-left uppercase tracking-wider text-[9px]">Produtos Discutidos</th>
                    <th className="p-3 text-gray-500 text-right uppercase tracking-wider text-[9px]">Qtd em Risco</th>
                    <th className="p-3 text-gray-500 text-left uppercase tracking-wider text-[9px]">Estratégia Comercial / Operacional</th>
                    <th className="p-3 text-gray-500 text-left uppercase tracking-wider text-[9px]">Responsável</th>
                    <th className="p-3 text-gray-500 text-center uppercase tracking-wider text-[9px]">Prazo Limite</th>
                    <th className="p-3 text-gray-500 text-center uppercase tracking-wider text-[9px]">Status RLP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rlpMeetings.map((m) => {
                    const statusStyle = m.status === 'Concluída' ? 'bg-emerald-100 text-emerald-800' :
                                        m.status === 'Em andamento' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800';
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-semibold text-slate-700">{m.data}</td>
                        <td className="p-3 font-bold text-slate-800 uppercase">{m.produtos}</td>
                        <td className="p-3 text-right font-black text-red-500">{m.quantidadeRisco} cx</td>
                        <td className="p-3 text-gray-600 leading-normal max-w-[250px] truncate" title={m.estrategia}>{m.estrategia}</td>
                        <td className="p-3 font-semibold text-slate-700">{m.responsavel}</td>
                        <td className="p-3 text-center font-bold text-slate-700">{m.prazo}</td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => {
                              const nextStatus = m.status === 'Aberta' ? 'Em andamento' : m.status === 'Em andamento' ? 'Concluída' : 'Aberta';
                              const updated = rlpMeetings.map(item => item.id === m.id ? { ...item, status: nextStatus } : item);
                              saveMeetings(updated);
                            }}
                            className={`px-2.5 py-1 rounded-full text-[8.5px] font-bold uppercase cursor-pointer border-none shadow-sm transition-all ${statusStyle}`}
                            title="Clique para alternar o status"
                          >
                            {m.status}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* CONTROL OF ACTIONS TABLE */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-4 mb-4">
              <div>
                <h3 className="font-sans font-black text-xs uppercase text-[#032b5e] tracking-wider flex items-center gap-1.5">
                  <CheckSquare className="w-4.5 h-4.5 text-emerald-500" /> PLANILHA DE CONTROLE DE AÇÕES CORRETIVAS
                </h3>
                <p className="text-[10px] text-gray-400 font-bold mt-0.5">Plano tático individualizado de prevenção de perdas com cálculo automático de dias de atraso</p>
              </div>

              <button 
                onClick={() => setShowAddAction(!showAddAction)}
                className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white font-sans font-bold text-[10px] uppercase tracking-wider px-3 py-2 rounded-lg transition-all border-none cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar Ação
              </button>
            </div>

            {showAddAction && (
              <form onSubmit={handleAddActionPoint} className="bg-slate-50 p-4 border border-gray-200 rounded-xl mb-5 text-xs flex flex-col gap-3">
                <h4 className="font-bold text-[#032b5e] uppercase text-[10px] tracking-wider">Cadastrar Ação de Preventiva de Bloqueio</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Produto Alvo *</label>
                    <select 
                      value={newAction.produto} 
                      onChange={e => setNewAction({ ...newAction, produto: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded text-xs"
                    >
                      {PRODUCTS.slice(0, 15).map(p => (
                        <option key={p.codigo} value={p.descricao}>{p.descricao}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Lote *</label>
                    <input 
                      type="text" 
                      value={newAction.lote} 
                      onChange={e => setNewAction({ ...newAction, lote: e.target.value })}
                      placeholder="Lote de validade..."
                      className="w-full p-2 border border-gray-300 rounded text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Responsável *</label>
                    <input 
                      type="text" 
                      value={newAction.responsavel} 
                      onChange={e => setNewAction({ ...newAction, responsavel: e.target.value })}
                      placeholder="Responsável da execução..."
                      className="w-full p-2 border border-gray-300 rounded text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-8">
                    <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Ação Preventiva de Bloqueio *</label>
                    <input 
                      type="text" 
                      value={newAction.acao} 
                      onChange={e => setNewAction({ ...newAction, acao: e.target.value })}
                      placeholder="Descreva a ação de escoamento ou conferência..."
                      className="w-full p-2 border border-gray-300 rounded text-xs"
                      required
                    />
                  </div>
                  <div className="md:col-span-4">
                    <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Data Prevista *</label>
                    <input 
                      type="text" 
                      value={newAction.dataPrevista} 
                      onChange={e => setNewAction({ ...newAction, dataPrevista: e.target.value })}
                      placeholder="DD/MM/AAAA"
                      className="w-full p-2 border border-gray-300 rounded text-xs"
                      required
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="self-end py-2 px-6 bg-emerald-500 hover:bg-emerald-600 text-white font-sans font-bold text-[10px] uppercase tracking-wider rounded border-none cursor-pointer"
                >
                  Gravar Ação
                </button>
              </form>
            )}

            <div className="overflow-x-auto">
              <table className="w-full border-collapse font-sans text-xs min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-200">
                    <th className="p-3 text-gray-500 text-left uppercase tracking-wider text-[9px]">Produto</th>
                    <th className="p-3 text-gray-500 text-left uppercase tracking-wider text-[9px]">Lote</th>
                    <th className="p-3 text-gray-500 text-left uppercase tracking-wider text-[9px]">Ação Preventiva</th>
                    <th className="p-3 text-gray-500 text-left uppercase tracking-wider text-[9px]">Responsável</th>
                    <th className="p-3 text-gray-500 text-center uppercase tracking-wider text-[9px]">Abertura</th>
                    <th className="p-3 text-gray-500 text-center uppercase tracking-wider text-[9px]">Previsão</th>
                    <th className="p-3 text-gray-500 text-center uppercase tracking-wider text-[9px]">Conclusão</th>
                    <th className="p-3 text-gray-500 text-center uppercase tracking-wider text-[9px]">Dias de Atraso</th>
                    <th className="p-3 text-gray-500 text-center uppercase tracking-wider text-[9px]">Status</th>
                    <th className="p-3 text-gray-500 text-right uppercase tracking-wider text-[9px]">Excluir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {actionPoints.map((a) => {
                    const badgeClass = a.status === 'Concluído' ? 'bg-emerald-100 text-emerald-800' :
                                       a.status === 'Em Andamento' ? 'bg-blue-100 text-blue-800' :
                                       a.status === 'Atrasado' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800';
                    
                    // calculate delay days if status is pending and past deadline
                    let delayStr = 'No Prazo';
                    if (a.status === 'Atrasado') delayStr = '7 dias de atraso';
                    else if (a.status === 'Concluído') delayStr = 'Concluído';

                    return (
                      <tr key={a.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-bold text-slate-800 uppercase">{a.produto}</td>
                        <td className="p-3 font-mono font-bold text-gray-600">{a.lote}</td>
                        <td className="p-3 text-gray-700 font-semibold">{a.acao}</td>
                        <td className="p-3 font-semibold text-slate-700">{a.responsavel}</td>
                        <td className="p-3 text-center text-gray-500">{a.dataAbertura}</td>
                        <td className="p-3 text-center font-bold text-slate-700">{a.dataPrevista}</td>
                        <td className="p-3 text-center text-slate-500">{a.dataConclusao || '--'}</td>
                        <td className="p-3 text-center font-black">
                          <span className={a.status === 'Atrasado' ? 'text-red-500' : 'text-emerald-600'}>
                            {delayStr}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleActionStatus(a.id)}
                            className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase cursor-pointer border-none shadow-sm transition-all ${badgeClass}`}
                          >
                            {a.status}
                          </button>
                        </td>
                        <td className="p-3 text-right">
                          <button 
                            type="button"
                            onClick={() => handleDeleteAction(a.id)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded cursor-pointer border-none bg-transparent"
                          >
                            <Trash2 className="w-4 h-4" />
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





      {activeTab === 'boarda3' && (
        <A3BoardComponent user={user} empresa={empresa} dashboard="fefo" />
      )}


      {/* FOOTER BLOCK */}
      <div className="flex items-center justify-between border-t border-gray-200 pt-4 mt-2">
        <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
          SISTEMA INTELIGENTE • MONITORAMENTO CORPORATIVO DE VALIDADES E FEFO
        </span>
        <span className="text-[10px] text-gray-400 font-medium uppercase">
          Atualizado em tempo real • Versão 4.2.0
        </span>
      </div>

    </div>
  );
}
