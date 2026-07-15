import React, { useState, useEffect } from 'react';
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
  Area
} from 'recharts';
import { 
  Calendar, 
  ChevronRight, 
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
  CheckSquare,
  Sparkles
} from 'lucide-react';
import { Usuario, Empresa, ValidadeRow } from '../types';
import { db, isCustomFirebaseConnected } from '../firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { PRODUCTS } from '../planosData';
import A3BoardComponent from './A3BoardComponent';

interface FefoDashboardProps {
  user: Usuario;
  empresa: Empresa | null;
  onBack?: () => void;
}

// Sub-pages defined by user
type FefoPage = 'executiva' | 'fefo' | 'estoque-picking' | 'estoque-estoque' | 'rlp' | 'detalhes' | 'boarda3';

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
  { ruaOrigem: 'Rua A', ruaDestino: 'Rua D', produto: 'SKOL 600ML', lote: 'SK-2026A', validade: '12/07/2026', quantidade: 140, motivo: 'Consolidação de Lote Antigo (FEFO)', data: '26/06/2026' },
  { ruaOrigem: 'Rua B', ruaDestino: 'Rua C', produto: 'BRAHMA CHOPP GFA VD 1L', lote: 'BR-9842', validade: '22/07/2026', quantidade: 80, motivo: 'Correção de Endereçamento de Corredor', data: '25/06/2026' },
  { ruaOrigem: 'Rua A', ruaDestino: 'Rua F', produto: 'ORIGINAL 600ML', lote: 'OR-3310', validade: '18/08/2026', quantidade: 120, motivo: 'Reorganização do Blocado de Alto Giro', data: '27/06/2026' },
  { ruaOrigem: 'Rua C', ruaDestino: 'Rua B', produto: 'PEPSI COLA PET 2L', lote: 'PE-4100', validade: '05/09/2026', quantidade: 200, motivo: 'Ajuste de Paletes de Lastro Duplo', data: '24/06/2026' },
  { ruaOrigem: 'Rua E', ruaDestino: 'Rua D', produto: 'BUDWEISER 600ML', lote: 'BU-80', validade: '15/07/2026', quantidade: 90, motivo: 'Desvio de Fluxo Corrigido', data: '26/06/2026' },
  { ruaOrigem: 'Rua A', ruaDestino: 'Rua B', produto: 'SKOL GFA VD 1L', lote: 'SK-12', validade: '01/08/2026', quantidade: 70, motivo: 'Remontagem de Palete Danificado', data: '27/06/2026' }
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

export default function FefoDashboard({ user, empresa, onBack }: FefoDashboardProps) {
  const [activeTab, setActiveTab] = useState<FefoPage>('executiva');
  
  // Core dynamic datasets from firebase / localstorage
  const [validades, setValidades] = useState<ValidadeRow[]>([]);
  const [rlpMeetings, setRlpMeetings] = useState<RLPMeeting[]>([]);
  const [actionPoints, setActionPoints] = useState<ActionPoint[]>([]);
  const [stockTransfers, setStockTransfers] = useState<StockTransfer[]>([]);
  const [pickingComp, setPickingComp] = useState<PickingComparison[]>([]);

  // Advanced Filters State
  const [periodFilter, setPeriodFilter] = useState<string>('30');
  const [productFilter, setProductFilter] = useState<string>('TODOS');
  const [categoryFilter, setCategoryFilter] = useState<string>('TODAS');
  const [ CDFilter, setCDFilter] = useState<string>('TODOS');
  const [streetFilter, setStreetFilter] = useState<string>('TODAS');
  const [lotFilter, setLotFilter] = useState<string>('TODOS');
  const [expiryBracketFilter, setExpiryBracketFilter] = useState<string>('TODAS');
  const [actionStatusFilter, setActionStatusFilter] = useState<string>('TODOS');
  const [responsibleFilter, setResponsibleFilter] = useState<string>('TODOS');

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
    ruaOrigem: 'Rua A',
    ruaDestino: 'Rua B',
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
      if (saved) setValidades(JSON.parse(saved));
      return;
    }

    const q = query(collection(db, 'validades'));
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map(doc => ({ _docId: doc.id, ...doc.data() } as ValidadeRow));
      const filtered = isCustomFirebaseConnected() ? rows : rows.filter(r => r.empresaId === companyId);
      setValidades(filtered);
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

    const totalUnities = (v.palhete || 0) * (v.lastro || 1) * (v.caixa || 1);
    const category = v.descricao.toLowerCase().includes('pet') ? 'PET' : 
                     v.descricao.toLowerCase().includes('lata') || v.descricao.toLowerCase().includes('lt') ? 'Lata' : 'Garrafa Retornável';

    return {
      ...v,
      days,
      bracket,
      totalUnities,
      category,
      unitCost: 6.20, // estimated cost factor per bottle/pack
      estimatedCost: totalUnities * 6.20
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
      ruaOrigem: 'Rua A',
      ruaDestino: 'Rua B',
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
      }
      // Bracket
      if (expiryBracketFilter !== 'TODAS' && v.bracket !== expiryBracketFilter) return false;

      // Period limit
      if (periodFilter !== 'tudo') {
        const daysLimit = parseInt(periodFilter);
        if (v.days > daysLimit) return false;
      }

      return true;
    });
  };

  const filteredValidadesList = getFilteredProductsList();

  // 5. Chart Data preparations
  // Bracket distribution chart
  const bracketCount = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
  compiledValidades.forEach(v => {
    bracketCount[v.bracket] = (bracketCount[v.bracket] || 0) + v.totalUnities;
  });

  const bracketChartData = [
    { name: 'Crítico (0-30 dias)', value: bracketCount['0-30'], color: '#ef4444' },
    { name: 'Alerta (31-60 dias)', value: bracketCount['31-60'], color: '#f5a623' },
    { name: 'Atenção (61-90 dias)', value: bracketCount['61-90'], color: '#eab308' },
    { name: 'Seguro (+90 dias)', value: bracketCount['90+'], color: '#10b981' }
  ].filter(b => b.value > 0);

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
            onClick={() => setActiveTab('fefo')}
            className={`px-3 py-2 rounded-lg font-sans font-bold text-[10px] uppercase tracking-wider transition-all border-none cursor-pointer ${activeTab === 'fefo' ? 'bg-[#032b5e] text-white shadow-sm' : 'text-gray-500 hover:text-[#032b5e] bg-transparent'}`}
          >
            FEFO
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
            Estoque x Estoque (Rua x Rua)
          </button>
          <button 
            onClick={() => setActiveTab('detalhes')}
            className={`px-3 py-2 rounded-lg font-sans font-bold text-[10px] uppercase tracking-wider transition-all border-none cursor-pointer ${activeTab === 'detalhes' ? 'bg-[#032b5e] text-white shadow-sm' : 'text-gray-500 hover:text-[#032b5e] bg-transparent'}`}
          >
            Detalhamento SKUs
          </button>
          <button 
            onClick={() => setActiveTab('boarda3')}
            className={`px-3 py-2 rounded-lg font-sans font-bold text-[10px] uppercase tracking-wider transition-all border-none cursor-pointer ${activeTab === 'boarda3' ? 'bg-[#032b5e] text-white shadow-sm' : 'text-gray-500 hover:text-[#032b5e] bg-transparent'}`}
          >
            Quadro de Ações
          </button>
        </div>
      </div>

      {/* CORE STATS (KPIs) - DISPLAYED REGARDLESS OF TAB */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[8.5px] uppercase font-black tracking-widest text-gray-400 block">PRODUTOS PRÓXIMOS AO VENCIMENTO</span>
            <div className="flex items-baseline mt-2">
              <span className="text-3xl font-extrabold text-[#ef4444]">{totalRiscoUnities}</span>
              <span className="text-[10px] font-bold text-gray-500 ml-1">u (≤90 dias)</span>
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

      {/* AUTOMATIC SYSTEM ALERTS / INSIGHT BAR */}
      <div className="bg-[#fffbeb] border border-amber-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
        <div className="flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <span className="text-xs font-black text-[#7c2d12] uppercase tracking-wider block">ALERTAS FEFO OPERACIONAIS AUTOMÁTICOS</span>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[10px] text-amber-800 font-semibold">
              {totalVencidosUnidades > 0 && <span className="flex items-center gap-1 text-red-600">🛑 {totalVencidosUnidades} UNIDADES VENCIDAS NO ESTOQUE!</span>}
              {totalDesviosFEFO > 0 && <span className="flex items-center gap-1">⚠️ {totalDesviosFEFO} produtos fora da estratégia FEFO no Picking.</span>}
              {actionPoints.filter(a => a.status === 'Atrasado').length > 0 && <span className="flex items-center gap-1 text-red-600">🚨 {actionPoints.filter(a => a.status === 'Atrasado').length} Ações RLP vencidas/atrasadas.</span>}
              <span>📌 Rua A apresenta excesso de remanejamentos internos (+6 movimentações).</span>
            </div>
          </div>
        </div>
        <button 
          onClick={() => {
            const saved = localStorage.getItem(`validades_${companyId}`);
            if (saved) setValidades(JSON.parse(saved));
          }}
          className="flex items-center gap-1 text-[9px] font-black text-[#032b5e] uppercase border border-[#032b5e]/25 hover:bg-white bg-transparent px-2 py-1 rounded-lg transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" /> Atualizar
        </button>
      </div>

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
                    <Line type="monotone" dataKey="risco" name="Volume Crítico (unidades)" stroke="#ef4444" strokeWidth={2} />
                    <Line type="monotone" dataKey="aderencia" name="Aderência FEFO (%)" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* ─────────────────────────────────────────────────────────────────
          TAB 2: FEFO PANEL
          ───────────────────────────────────────────────────────────────── */}
      {activeTab === 'fefo' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left Column: Ranking of Highest Risk Products */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="font-sans font-black text-xs uppercase text-[#032b5e] tracking-wider mb-3">
                RANKING DOS PRODUTOS COM MAIOR RISCO (MÉTODO PARETO)
              </h3>
              <p className="text-[10px] text-gray-400 font-bold mb-4">Lotes cadastrados organizados pela criticidade de vencimento</p>
              
              <div className="overflow-x-auto">
                <table className="w-full border-collapse font-sans text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-gray-200">
                      <th className="p-2.5 text-gray-500 text-left uppercase tracking-wider text-[9px]">Código</th>
                      <th className="p-2.5 text-gray-500 text-left uppercase tracking-wider text-[9px]">Produto</th>
                      <th className="p-2.5 text-gray-500 text-center uppercase tracking-wider text-[9px]">Prazo</th>
                      <th className="p-2.5 text-gray-500 text-right uppercase tracking-wider text-[9px]">Unidades</th>
                      <th className="p-2.5 text-gray-500 text-center uppercase tracking-wider text-[9px]">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {compiledValidades.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-gray-400">Nenhum lote com validade cadastrado para gerar o ranking.</td>
                      </tr>
                    ) : (
                      [...compiledValidades]
                        .sort((a, b) => a.days - b.days)
                        .slice(0, 10)
                        .map((v, idx) => {
                          const statusColor = v.days < 0 ? 'text-red-600 bg-red-100' :
                                              v.days <= 30 ? 'text-red-600 bg-red-50' :
                                              v.days <= 60 ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50';
                          return (
                            <tr key={idx} className="hover:bg-slate-50/40">
                              <td className="p-2.5 font-mono font-bold text-slate-700">{v.codigo}</td>
                              <td className="p-2.5 font-semibold text-slate-800 uppercase">{v.descricao}</td>
                              <td className="p-2.5 text-center font-bold">
                                <span className={v.days < 0 ? 'text-red-600' : v.days <= 30 ? 'text-red-500' : 'text-slate-600'}>
                                  {v.days < 0 ? `Vencido há ${Math.abs(v.days)} dias` : `${v.days} dias`}
                                </span>
                              </td>
                              <td className="p-2.5 text-right font-black text-slate-800">{v.totalUnities}</td>
                              <td className="p-2.5 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${statusColor}`}>
                                  {v.days < 0 ? 'VENCIDO' : v.days <= 30 ? 'CRÍTICO' : v.days <= 60 ? 'ALERTA' : 'OK'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Column: Out of FEFO oldest batch alert */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="font-sans font-black text-xs uppercase text-[#032b5e] tracking-wider mb-2">
                  DESVIOS DE LOTE MAIS ANTIGO (NÃO-EXPEDIDOS)
                </h3>
                <p className="text-[10px] text-gray-400 font-bold mb-4">Lotes que deveriam ter prioridade absoluta de expedição pela regra FEFO</p>
                
                <div className="space-y-3.5">
                  <div className="bg-red-50 border-l-4 border-red-500 p-3.5 rounded-r-lg flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[11px] font-black text-red-800 block">SKOL 600ML (Lote: SK-2026A)</span>
                      <p className="text-[10px] text-red-700 mt-1 leading-normal">
                        Lote antigo parado no endereço <strong>Rua A - End: 12</strong> com vencimento em <strong>12/07/2026</strong>. Lote mais novo SK-2026B está sendo enviado no picking no lugar deste.
                      </p>
                      <span className="inline-block bg-red-100 text-red-800 text-[8px] font-black uppercase px-1.5 py-0.5 rounded mt-2">Diferença de Vencimento: 24 dias</span>
                    </div>
                  </div>

                  <div className="bg-amber-50 border-l-4 border-amber-500 p-3.5 rounded-r-lg flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[11px] font-black text-amber-800 block">GUARANA CHP ANTARCTICA PET 2L (Lote: GU-8821)</span>
                      <p className="text-[10px] text-amber-700 mt-1 leading-normal">
                        Lote parado na <strong>Rua B - Central</strong>. Lote mais novo sendo expedido na rota de vendas. Bloquear expedição e priorizar escoamento FEFO.
                      </p>
                      <span className="inline-block bg-amber-100 text-amber-800 text-[8px] font-black uppercase px-1.5 py-0.5 rounded mt-2">Ação Sugerida: FIFO Switch imediato</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Incidence addresses */}
              <div className="mt-5 pt-4 border-t border-gray-100">
                <span className="text-[9px] uppercase font-black text-gray-400 block mb-2">ENDEREÇOS (RUAS) COM MAIOR INCIDÊNCIA DE DESVIOS FEFO</span>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-gray-100 text-center">
                    <span className="text-[11px] font-black text-red-600 block">Rua A</span>
                    <span className="text-[9px] text-gray-500 font-bold uppercase mt-1 block">4 Desvios</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-gray-100 text-center">
                    <span className="text-[11px] font-black text-amber-500 block">Rua C</span>
                    <span className="text-[9px] text-gray-500 font-bold uppercase mt-1 block">2 Desvios</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-gray-100 text-center">
                    <span className="text-[11px] font-black text-gray-500 block">Rua B</span>
                    <span className="text-[9px] text-gray-500 font-bold uppercase mt-1 block">1 Desvio</span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}


      {/* ─────────────────────────────────────────────────────────────────
          TAB 3: ESTOQUE X PICKING
          ───────────────────────────────────────────────────────────────── */}
      {activeTab === 'estoque-picking' && (
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
                {pickingComp.map((p, idx) => {
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
                })}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 mt-5 border border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <p className="text-gray-500 leading-relaxed max-w-2xl">
              💡 <strong>Regra Operacional do Armazém:</strong> Diferenças acima de 200 caixas entre o estoque central e a rua de picking exigem tarefa de reposição urgente gerada automaticamente no painel do empilhador para evitar rupturas de carga de frota.
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
      )}


      {/* ─────────────────────────────────────────────────────────────────
          TAB 4: ESTOQUE X ESTOQUE (RUA X RUA)
          ───────────────────────────────────────────────────────────────── */}
      {activeTab === 'estoque-estoque' && (
        <div className="flex flex-col gap-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left: Move form and list */}
            <div className="lg:col-span-8 bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <h3 className="font-sans font-black text-xs uppercase text-[#032b5e] tracking-wider">
                    REMANEJAMENTO INTERNO: ESTOQUE x ESTOQUE
                  </h3>
                  <p className="text-[10px] text-gray-400 font-bold mt-0.5">Acompanhamento e registro de transferências físicas de lotes entre ruas de blocados</p>
                </div>
                <button 
                  onClick={() => setShowAddTransfer(!showAddTransfer)}
                  className="flex items-center gap-1 bg-[#032b5e] hover:bg-[#021f44] text-white font-sans font-bold text-[10px] uppercase tracking-wider px-2.5 py-1.5 rounded-lg border-none cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Transferir
                </button>
              </div>

              {showAddTransfer && (
                <form onSubmit={handleAddTransferItem} className="bg-slate-50 p-4 border border-gray-200 rounded-lg text-xs flex flex-col gap-3">
                  <h4 className="font-black text-[#032b5e] uppercase text-[9px] tracking-wider">Lançar Transferência Física de Rua</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[8.5px] font-bold text-gray-500 uppercase mb-1">Rua Origem</label>
                      <select 
                        value={newTransfer.ruaOrigem} 
                        onChange={e => setNewTransfer({ ...newTransfer, ruaOrigem: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded text-xs"
                      >
                        <option value="Rua A">Rua A</option>
                        <option value="Rua B">Rua B</option>
                        <option value="Rua C">Rua C</option>
                        <option value="Rua D">Rua D</option>
                        <option value="Rua E">Rua E</option>
                        <option value="Rua F">Rua F</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[8.5px] font-bold text-gray-500 uppercase mb-1">Rua Destino</label>
                      <select 
                        value={newTransfer.ruaDestino} 
                        onChange={e => setNewTransfer({ ...newTransfer, ruaDestino: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded text-xs"
                      >
                        <option value="Rua A">Rua A</option>
                        <option value="Rua B">Rua B</option>
                        <option value="Rua C">Rua C</option>
                        <option value="Rua D">Rua D</option>
                        <option value="Rua E">Rua E</option>
                        <option value="Rua F">Rua F</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[8.5px] font-bold text-gray-500 uppercase mb-1">Lote</label>
                      <input 
                        type="text" 
                        value={newTransfer.lote} 
                        onChange={e => setNewTransfer({ ...newTransfer, lote: e.target.value })}
                        placeholder="Ex: SK-20"
                        className="w-full p-2 border border-gray-300 rounded text-xs"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[8.5px] font-bold text-gray-500 uppercase mb-1">Quantidade (Caixas)</label>
                      <input 
                        type="number" 
                        value={newTransfer.quantidade} 
                        onChange={e => setNewTransfer({ ...newTransfer, quantidade: parseInt(e.target.value) || 0 })}
                        className="w-full p-2 border border-gray-300 rounded text-xs"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[8.5px] font-bold text-gray-500 uppercase mb-1">Produto</label>
                      <select 
                        value={newTransfer.produto} 
                        onChange={e => setNewTransfer({ ...newTransfer, produto: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded text-xs"
                      >
                        {PRODUCTS.slice(0, 10).map(p => (
                          <option key={p.codigo} value={p.descricao}>{p.descricao}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[8.5px] font-bold text-gray-500 uppercase mb-1">Motivo da Movimentação</label>
                      <input 
                        type="text" 
                        value={newTransfer.motivo} 
                        onChange={e => setNewTransfer({ ...newTransfer, motivo: e.target.value })}
                        placeholder="Ex: Reorganização de Blocado..."
                        className="w-full p-2 border border-gray-300 rounded text-xs"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="self-end py-1.5 px-4 bg-emerald-500 text-white rounded font-sans font-bold text-[9px] uppercase tracking-wider border-none cursor-pointer hover:bg-emerald-600"
                  >
                    Confirmar Transferência
                  </button>
                </form>
              )}

              <div className="overflow-x-auto">
                <table className="w-full border-collapse font-sans text-[11px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-gray-200">
                      <th className="p-2.5 text-gray-500 text-left uppercase tracking-wider text-[9px]">Data</th>
                      <th className="p-2.5 text-gray-500 text-center uppercase tracking-wider text-[9px]">Origem</th>
                      <th className="p-2.5 text-gray-500 text-center uppercase tracking-wider text-[9px]">Destino</th>
                      <th className="p-2.5 text-gray-500 text-left uppercase tracking-wider text-[9px]">Produto / Lote</th>
                      <th className="p-2.5 text-gray-500 text-right uppercase tracking-wider text-[9px]">Qtd</th>
                      <th className="p-2.5 text-gray-500 text-left uppercase tracking-wider text-[9px]">Motivo Justificado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {stockTransfers.map((t, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/40">
                        <td className="p-2.5 text-gray-500">{t.data}</td>
                        <td className="p-2.5 text-center font-bold text-[#ef4444]">{t.ruaOrigem}</td>
                        <td className="p-2.5 text-center font-bold text-emerald-600">{t.ruaDestino}</td>
                        <td className="p-2.5">
                          <div className="font-semibold text-slate-800 uppercase truncate max-w-[150px]">{t.produto}</div>
                          <div className="text-[9px] text-gray-400 font-mono">Lote: {t.lote}</div>
                        </td>
                        <td className="p-2.5 text-right font-extrabold text-slate-700">{t.quantidade} cx</td>
                        <td className="p-2.5 text-gray-600 italic font-medium">{t.motivo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: Heatmap list representation of critical streets */}
            <div className="lg:col-span-4 bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="font-sans font-black text-xs uppercase text-[#032b5e] tracking-wider mb-2">
                  MAPA DE CALOR: TAXA DE MOVIMENTAÇÃO DE RUAS
                </h3>
                <p className="text-[10px] text-gray-400 font-bold mb-4">Ruas com maior movimentação física exigem auditoria preventiva de posicionamento</p>
                
                <div className="space-y-3 mt-4">
                  {Object.entries(streetActivity)
                    .sort((a, b) => b[1] - a[1])
                    .map(([street, total]) => {
                      const pct = Math.min(100, Math.round((total / 1200) * 100));
                      const barColor = pct > 60 ? 'bg-red-500' : pct > 30 ? 'bg-amber-500' : 'bg-emerald-500';
                      return (
                        <div key={street} className="flex flex-col gap-1 text-xs">
                          <div className="flex justify-between font-bold text-slate-700">
                            <span className="uppercase">{street}</span>
                            <span>{total} Caixas remanejadas</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                            <div className={`h-full ${barColor} transition-all duration-500`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="bg-[#eff6ff] p-3 rounded-lg border border-blue-100 mt-5 text-[10px] text-[#1e40af] font-medium leading-normal">
                📌 <strong>Aviso Operacional:</strong> O excesso de movimentação física no mesmo corredor reduz a vida útil dos pisos industriais e eleva em até 23% a quebra operacional por acidente de empilhador. Planeje os blocados com FEFO estático no início do mês.
              </div>
            </div>

          </div>
        </div>
      )}




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
                    <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Quantidade em Risco (Fardo/Caixas)</label>
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


      {/* ─────────────────────────────────────────────────────────────────
          TAB 6: DETALHAMENTO DOS PRODUTOS / ADVANCED FILTERS
          ───────────────────────────────────────────────────────────────── */}
      {activeTab === 'detalhes' && (
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-5">
          
          {/* Header */}
          <div>
            <h3 className="font-sans font-black text-xs uppercase text-[#032b5e] tracking-wider">
              FILTROS AVANÇADOS E DETALHAMENTO DE PRODUTOS FEFO
            </h3>
            <p className="text-[10px] text-gray-400 font-bold mt-0.5">Auditoria profunda de todos os lotes de validades registrados no banco de dados corporativo</p>
          </div>

          {/* Filtering Block */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 bg-slate-50 p-4 rounded-xl border border-gray-200 text-xs">
            
            {/* Filter 1: Expiry Limit */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-gray-500 uppercase">Período Limite</label>
              <select 
                value={periodFilter} 
                onChange={e => setPeriodFilter(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded text-xs outline-none"
              >
                <option value="30">Até 30 dias de validade</option>
                <option value="60">Até 60 dias de validade</option>
                <option value="90">Até 90 dias de validade</option>
                <option value="tudo">Todos os Lotes</option>
              </select>
            </div>

            {/* Filter 2: Category */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-gray-500 uppercase">Categoria</label>
              <select 
                value={categoryFilter} 
                onChange={e => setCategoryFilter(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded text-xs outline-none"
              >
                <option value="TODAS">Todas as Categorias</option>
                <option value="Garrafa Retornável">Garrafa Retornável</option>
                <option value="PET">Embalagem PET</option>
                <option value="Lata">Embalagem Lata</option>
              </select>
            </div>

            {/* Filter 3: CD / Localizacao */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-gray-500 uppercase">Endereçamento / CD</label>
              <select 
                value={streetFilter} 
                onChange={e => setStreetFilter(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded text-xs outline-none"
              >
                <option value="TODAS">Todos os Endereços</option>
                <option value="PICKING">Somente Picking</option>
                <option value="CENTRAL">Somente Blocado Central</option>
              </select>
            </div>

            {/* Filter 4: Expiration Bracket */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-gray-500 uppercase">Faixa Crítica</label>
              <select 
                value={expiryBracketFilter} 
                onChange={e => setExpiryBracketFilter(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded text-xs outline-none"
              >
                <option value="TODAS">Todas as Faixas</option>
                <option value="0-30">Vencimento Crítico (0-30 dias)</option>
                <option value="31-60">Alerta Médio (31-60 dias)</option>
                <option value="61-90">Alerta Baixo (61-90 dias)</option>
              </select>
            </div>

            {/* Clear filters */}
            <div className="flex flex-col justify-end">
              <button 
                onClick={() => {
                  setPeriodFilter('tudo');
                  setProductFilter('TODOS');
                  setCategoryFilter('TODAS');
                  setStreetFilter('TODAS');
                  setExpiryBracketFilter('TODAS');
                }}
                className="w-full p-2 bg-[#032b5e] hover:bg-[#021f44] text-white rounded font-sans font-bold text-[9px] uppercase tracking-wider border-none cursor-pointer"
              >
                Limpar Filtros
              </button>
            </div>

          </div>

          {/* Results table */}
          <div className="overflow-x-auto mt-2">
            <table className="w-full border-collapse font-sans text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-200">
                  <th className="p-3 text-gray-500 text-left uppercase tracking-wider text-[9px]">Código SKU</th>
                  <th className="p-3 text-gray-500 text-left uppercase tracking-wider text-[9px]">Descrição do Produto</th>
                  <th className="p-3 text-gray-500 text-center uppercase tracking-wider text-[9px]">Vencimento</th>
                  <th className="p-3 text-gray-500 text-center uppercase tracking-wider text-[9px]">Faixa</th>
                  <th className="p-3 text-gray-500 text-center uppercase tracking-wider text-[9px]">Dias Restantes</th>
                  <th className="p-3 text-gray-500 text-right uppercase tracking-wider text-[9px]">Total Volumetria (un)</th>
                  <th className="p-3 text-gray-500 text-center uppercase tracking-wider text-[9px]">Endereço físico</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredValidadesList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-gray-400">Nenhum lote corresponde aos filtros selecionados.</td>
                  </tr>
                ) : (
                  filteredValidadesList.map((v, idx) => {
                    const statusBg = v.days < 0 ? 'bg-red-100 text-red-800' :
                                     v.days <= 30 ? 'bg-red-50 text-red-600 border border-red-200' :
                                     v.days <= 60 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800';
                    return (
                      <tr key={idx} className="hover:bg-slate-50/45">
                        <td className="p-3 font-mono font-bold text-[#032b5e]">{v.codigo}</td>
                        <td className="p-3 font-semibold text-slate-800 uppercase">{v.descricao}</td>
                        <td className="p-3 text-center text-slate-700 font-bold">{v.validade}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-0.5 rounded text-[8.5px] font-black uppercase tracking-tight ${statusBg}`}>
                            {v.days < 0 ? 'Expirado' : v.days <= 30 ? 'CRÍTICO' : v.days <= 60 ? 'ALERTA' : 'SEGURO'}
                          </span>
                        </td>
                        <td className="p-3 text-center font-extrabold">
                          <span className={v.days <= 30 ? 'text-red-500' : 'text-slate-600'}>
                            {v.days} dias
                          </span>
                        </td>
                        <td className="p-3 text-right font-black text-[#032b5e]">{v.totalUnities}</td>
                        <td className="p-3 text-center">
                          <span className="bg-slate-100 text-slate-800 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full">
                            {v.localizacao === 'picking' ? 'Pista de Picking' : 'Blocado Central'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
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
