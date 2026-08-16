import { ManualInstrucaoCard } from './ManualInstrucaoCard';
import { SopBannerViewer } from './SopBannerViewer';
import { IndicatorActionModal } from './IndicatorActionModal';
import React, { useState, useEffect, useMemo } from 'react';
import { calculateStockAgeIndex, calculateStockAgeSummary } from '../utils/calculateStockAgeIndex';
import { MATRIZ_BLOCOS_CONFIG, validarPosicionamentoLayout, getDistanciaPickingScore, getBlocoIdealParaCurva, calcularQuebrasFefoEstoqueXEstoque, calcularQuebrasFefoEstoqueXPicking } from '../utils/matrizBlocos';
import * as XLSX from 'xlsx';
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
import { collection, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { useEmpresaData } from '../context/EmpresaDataContext';
import { PRODUCTS } from '../planosData';
import A3BoardComponent from './A3BoardComponent';
import CalendarFilter from './CalendarFilter';
import StockAgeIndexTab from './StockAgeIndexTab';
import FuturoShelfTab from './FuturoShelfTab';
import GestaoEscoamentoTab from './GestaoEscoamentoTab';
import { WorkstationCriticosRecolhimento } from './WorkstationCriticosRecolhimento';
import { getInitialDefaultValidades } from '../utils/fefoDefaultData';
import { triggerAutoAcaoCorretiva, triggerAutoAcaoMelhoriaPreventiva } from '../utils/simulacaoAcoesUtils';
import html2canvas from 'html2canvas';
import { syncFefoDemandsFromValidades, getStoredFefoDemands, updateFefoDemandStatus } from '../utils/fefoDemandManager';

interface FefoDashboardProps {
  user: Usuario;
  empresa: Empresa | null;
  onBack?: () => void;
  theme?: 'light' | 'dark';
}

// Sub-pages defined by user
type FefoPage = 'validades' | 'stock-age' | 'futuro-shelf' | 'escoamento' | 'estoque-estoque' | 'estoque-picking' | 'boarda3' | 'fefo-empilhador' | 'executiva' | 'rlp' | 'shelf-life' | 'rlp-semanal';

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
  pickingDays?: number;
  estoqueDays?: number;
  gap?: number;
  validadeEstoque?: string;
  validadePicking?: string;
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
  const [activeTab, setActiveTab] = useState<FefoPage>('validades');
  const [viewUnit, setViewUnit] = useState<'u' | 'he'>('u');
  const [selectedBlock, setSelectedBlock] = useState<string>('A4');
  const [showSopViewer, setShowSopViewer] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);

  // Recontagem Modal state
  const [recontagemModal, setRecontagemModal] = useState<{
    codigo: string;
    descricao: string;
    validadeOriginal: string;
    novaValidade: string;
    quantidade: number;
    localizacao: string;
    bloco: string;
    _rawDoc?: any;
  } | null>(null);

  const handleSaveRecontagem = async () => {
    if (!recontagemModal) return;

    const companyId = (empresaData as any)?.empresa?.id || empresaData?.empresaId || empresa?.id || 'demo';
    const validadesKey = `validades_${companyId}`;
    const armazemValidadesKey = `armazem_validades_${companyId}`;

    try {
      let rawList: any[] = [];
      try {
        rawList = JSON.parse(localStorage.getItem(validadesKey) || localStorage.getItem(armazemValidadesKey) || '[]');
      } catch (e) {}

      const targetCod = String(recontagemModal.codigo).trim();
      const targetVal = String(recontagemModal.validadeOriginal).trim();

      let found = false;
      const updatedList = rawList.map((item: any) => {
        const itemCod = String(item.codigo || item.cod || '').trim();
        const itemVal = String(item.validade || '').trim();

        if (itemCod === targetCod && itemVal === targetVal) {
          found = true;
          return {
            ...item,
            quantidade: recontagemModal.quantidade,
            caixa: recontagemModal.quantidade,
            validade: recontagemModal.novaValidade,
            localizacao: recontagemModal.localizacao,
            bloco: recontagemModal.bloco,
            recontadoEm: new Date().toISOString()
          };
        }
        return item;
      });

      if (!found) {
        updatedList.push({
          id: Date.now(),
          codigo: targetCod,
          descricao: recontagemModal.descricao,
          quantidade: recontagemModal.quantidade,
          caixa: recontagemModal.quantidade,
          validade: recontagemModal.novaValidade,
          localizacao: recontagemModal.localizacao,
          bloco: recontagemModal.bloco,
          recontadoEm: new Date().toISOString()
        });
      }

      localStorage.setItem(validadesKey, JSON.stringify(updatedList));
      localStorage.setItem(armazemValidadesKey, JSON.stringify(updatedList));

      if (db && recontagemModal._rawDoc?._docId) {
        try {
          await updateDoc(doc(db, 'validades', recontagemModal._rawDoc._docId), {
            quantidade: recontagemModal.quantidade,
            caixa: recontagemModal.quantidade,
            validade: recontagemModal.novaValidade,
            localizacao: recontagemModal.localizacao,
            bloco: recontagemModal.bloco,
            recontadoEm: new Date().toISOString()
          });
        } catch (e) {}
      }

      window.dispatchEvent(new Event('local_data_changed'));
      window.dispatchEvent(new Event('storage'));
      setRecontagemModal(null);
      alert(`✅ Recontagem salva! A quantidade e a validade do SKU ${targetCod} foram sobrescritas no sistema.`);
    } catch (err) {
      alert('Erro ao salvar recontagem: ' + err);
    }
  };

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
    if (actualValidades && actualValidades.length > 0) {
      return actualValidades;
    }
    return [];
  }, [actualValidades]);

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

  const empresaData = useEmpresaData();

  // 1. Sync & Seed Data
  useEffect(() => {
    // Sync validades (dynamic) - merge Firestore and localStorage so all collected items are included
    const saved = localStorage.getItem(`validades_${companyId}`);
    let localRows: ValidadeRow[] = [];
    if (saved) {
      try {
        localRows = JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }

    const firestoreRows = empresaData.validades || [];
    const map = new Map<string, ValidadeRow>();
    
    firestoreRows.forEach(v => {
      const key = v._docId || `${v.codigo}_${v.validade}_${v.bloco}_${v.localizacao}`;
      map.set(key, v);
    });

    localRows.forEach(v => {
      const key = v._docId || `${v.codigo}_${v.validade}_${v.bloco}_${v.localizacao}`;
      if (!map.has(key)) {
        map.set(key, v);
      }
    });

    let combinedValidades = Array.from(map.values());
    if (combinedValidades.length === 0) {
      combinedValidades = getInitialDefaultValidades(companyId);
      try {
        localStorage.setItem(`validades_${companyId}`, JSON.stringify(combinedValidades));
        localStorage.setItem(`armazem_validades_${companyId}`, JSON.stringify(combinedValidades));
      } catch (e) {}
    }

    setActualValidades(combinedValidades);
    syncFefoDemandsFromValidades(companyId, combinedValidades);
  }, [empresaData.validades, companyId]);

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
    else setRlpMeetings([]);

    if (savedActs) setActionPoints(JSON.parse(savedActs));
    else setActionPoints([]);

    if (savedTransfers) setStockTransfers(JSON.parse(savedTransfers));
    else setStockTransfers([]);

    if (savedPicking) setPickingComp(JSON.parse(savedPicking));
    else setPickingComp([]);

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
      let normDate = expDate.trim();
      if (normDate.includes('/')) {
        const parts = normDate.split('/');
        if (parts.length === 3) {
          const d = parts[0].padStart(2, '0');
          const m = parts[1].padStart(2, '0');
          let y = parts[2];
          if (y.length === 2) y = '20' + y;
          normDate = `${y}-${m}-${d}`;
        }
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

  const calculateTotalCaixas = (v: ValidadeRow): number => {
    const p = Number(v.palhete) || 0;
    const l = Number(v.lastro) || 0;
    const c = Number(v.caixa) || 0;
    const q = Number((v as any).quantidade) || 0;

    if (p > 0 && l > 0 && c > 0) return p * l * c;
    if (p > 0 && l > 0) return p * l;
    if (p > 0 && c > 0) return p * c;
    if (p > 0) return p;
    if (c > 0) return c;
    if (q > 0) return q;
    return 1;
  };

  // 2. Metrics Compiling
  const compiledValidades = validades.map(v => {
    const days = getDaysRemaining(v.validade);
    let bracket: '0-30' | '31-60' | '61-90' | '90+' = '90+';
    if (days <= 30) bracket = '0-30';
    else if (days <= 60) bracket = '31-60';
    else if (days <= 90) bracket = '61-90';

    const totalUnitiesRaw = calculateTotalCaixas(v);
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

  // Effective picking comparison derived dynamically from compiledValidades if real data exists
  const effectivePickingComp = useMemo(() => {
    if (compiledValidades.length === 0) {
      return pickingComp;
    }

    const groupedBySku: Record<string, {
      produto: string;
      lote: string;
      validade: string;
      qtdEstoque: number;
      qtdPicking: number;
      minDaysEstoque: number;
      minDaysPicking: number;
      valEstoque: string;
      valPicking: string;
    }> = {};

    compiledValidades.forEach(v => {
      const key = (v.codigo ? String(v.codigo) : v.descricao).trim();
      const caixas = (viewUnit as string) === 'cx' ? v.totalUnitiesRaw : Math.round(v.totalUnities * 100) / 100;
      const loc = (v.localizacao || '').toLowerCase();
      const isPicking = loc.includes('pick');

      if (!groupedBySku[key]) {
        groupedBySku[key] = {
          produto: v.descricao,
          lote: v.codigo ? `SKU-${v.codigo}` : 'LOTE-PADRAO',
          validade: v.validade,
          qtdEstoque: 0,
          qtdPicking: 0,
          minDaysEstoque: 99999,
          minDaysPicking: 99999,
          valEstoque: '',
          valPicking: ''
        };
      }

      if (isPicking) {
        groupedBySku[key].qtdPicking += caixas;
        if (v.days < groupedBySku[key].minDaysPicking) {
          groupedBySku[key].minDaysPicking = v.days;
          groupedBySku[key].valPicking = v.validade;
        }
      } else {
        groupedBySku[key].qtdEstoque += caixas;
        if (v.days < groupedBySku[key].minDaysEstoque) {
          groupedBySku[key].minDaysEstoque = v.days;
          groupedBySku[key].valEstoque = v.validade;
        }
      }

      if (v.days < 99999) {
        if (!groupedBySku[key].validade || v.days < getDaysRemaining(groupedBySku[key].validade)) {
          groupedBySku[key].validade = v.validade;
        }
      }
    });

    return Object.values(groupedBySku).map(item => {
      const hasPicking = item.qtdPicking > 0;
      const hasEstoque = item.qtdEstoque > 0;

      let pickingDays = hasPicking && item.minDaysPicking < 99999 ? item.minDaysPicking : 0;
      let estoqueDays = hasEstoque && item.minDaysEstoque < 99999 ? item.minDaysEstoque : (hasPicking ? pickingDays : 0);

      const formatDate = (valStr: string) => {
        if (!valStr) return '-';
        if (valStr.includes('-')) {
          const [y, m, d] = valStr.split('-');
          return `${d}/${m}/${y}`;
        }
        return valStr;
      };

      const validadePicking = formatDate(item.valPicking || item.validade);
      const validadeEstoque = formatDate(item.valEstoque || item.validade);

      let gap = 0;
      let status: 'Conforme' | 'Atenção' | 'Desvio Crítico' = 'Conforme';

      if (!hasPicking && hasEstoque) {
        status = 'Atenção';
        gap = 0;
      } else if (hasPicking && hasEstoque) {
        gap = pickingDays - estoqueDays;
        if (gap > 0) {
          status = gap > 15 ? 'Desvio Crítico' : 'Atenção';
        } else if (pickingDays <= 30 || estoqueDays <= 30) {
          status = 'Atenção';
        } else {
          status = 'Conforme';
        }
      } else {
        status = 'Conforme';
      }

      const diferenca = Math.abs(item.qtdEstoque - item.qtdPicking);

      return {
        produto: item.produto,
        lote: item.lote,
        validade: validadePicking !== '-' ? validadePicking : validadeEstoque,
        qtdEstoque: Math.round(item.qtdEstoque * 100) / 100,
        qtdPicking: Math.round(item.qtdPicking * 100) / 100,
        diferenca: Math.round(diferenca * 100) / 100,
        status,
        estoqueDays,
        pickingDays,
        validadeEstoque,
        validadePicking,
        gap
      };
    });
  }, [compiledValidades, pickingComp, viewUnit]);

  // Dynamic blocks data derived directly from compiledValidades
  const dynamicBlocksData = useMemo(() => {
    const result: Record<string, BlockData> = { ...BLOCKS_DATA };

    if (compiledValidades.length === 0) {
      return result;
    }

    const blockGroups: Record<string, typeof compiledValidades> = {};
    compiledValidades.forEach(v => {
      const bKey = (v.bloco || 'A1').trim().toUpperCase();
      if (!blockGroups[bKey]) blockGroups[bKey] = [];
      blockGroups[bKey].push(v);
    });

    Object.entries(blockGroups).forEach(([bKey, rows]) => {
      if (rows.length === 0) return;
      
      const skuCount = new Set(rows.map(r => r.codigo)).size;
      const pallets = rows.reduce((acc, r) => acc + (Number(r.palhete) || 1), 0);
      const totalDays = rows.reduce((acc, r) => acc + r.days, 0);
      const avgValidity = Math.round(totalDays / rows.length);
      const menorValidade = Math.min(...rows.map(r => r.days));

      const criticalRows = rows.filter(r => r.days <= 30);
      const alertMediumRows = rows.filter(r => r.days > 30 && r.days <= 60);
      const alertLowRows = rows.filter(r => r.days > 60 && r.days <= 90);
      const safeRows = rows.filter(r => r.days > 90);

      const criticalPct = Math.round((criticalRows.length / rows.length) * 100);
      const riskIndex = Math.min(100, Math.max(0, Math.round(100 - avgValidity)));

      result[bKey] = {
        id: bKey,
        avgValidity,
        menorValidade,
        skuCount,
        pallets,
        criticalPct,
        riskIndex,
        ranges: {
          critical: criticalRows.reduce((acc, r) => acc + r.totalUnities, 0),
          alertMedium: alertMediumRows.reduce((acc, r) => acc + r.totalUnities, 0),
          alertLow: alertLowRows.reduce((acc, r) => acc + r.totalUnities, 0),
          safe: safeRows.reduce((acc, r) => acc + r.totalUnities, 0),
        }
      };
    });

    return result;
  }, [compiledValidades]);

  // Helper product info lookup
  const getProductInfo = (code: string) => {
    const codeStr = String(code).trim();
    const pContext = empresaData.produtos?.find(p => String(p.codigo).trim() === codeStr);
    const pMaster = PRODUCTS.find((p: any) => String(p.codigo || p.cod || '').trim() === codeStr);

    const idade = Number(pContext?.idade) || Number((pMaster as any)?.idade) || 180;
    const preco = Number(pContext?.preco) || Number((pMaster as any)?.preco) || Number((pMaster as any)?.custo) || 68.50;
    const hlPerUnit = Number(pContext?.fatorHecto) || Number((pMaster as any)?.fatorHecto) || 0.12;
    const vendaMedia = Number(pContext?.vendaMedia) || Number((pMaster as any)?.vendaMedia) || 18;

    return { idade, preco, hlPerUnit, vendaMedia };
  };

  // Deduplicated list for "Validades Recolhidas" (1ª guia)
  const validadesRecolhidasDeduplicadas = useMemo(() => {
    const map = new Map<string, {
      codigo: string;
      descricao: string;
      quantidade: number;
      validade: string;
      localizacao: string;
      bloco: string;
      _rawDoc?: any;
    }>();

    actualValidades.forEach(item => {
      const cod = String(item.codigo || '000').trim();
      const val = String(item.validade || '').trim();
      const key = `${cod}_${val}`;

      const p = Number(item.palhete) || 0;
      const l = Number(item.lastro) || 0;
      const c = Number(item.caixa) || 0;
      const q = Number((item as any).quantidade) || 0;
      let qty = 1;
      if (p > 0 && l > 0 && c > 0) qty = p * l * c;
      else if (p > 0 && l > 0) qty = p * l;
      else if (p > 0 && c > 0) qty = p * c;
      else if (c > 0) qty = c;
      else if (q > 0) qty = q;

      if (map.has(key)) {
        const existing = map.get(key)!;
        // Sobrescrever a quantidade com a nova contagem (não somar contagens anteriores)
        existing.quantidade = qty;
        existing.localizacao = item.localizacao || existing.localizacao;
        existing.bloco = item.bloco || existing.bloco;
        existing._rawDoc = item;
      } else {
        map.set(key, {
          codigo: cod,
          descricao: item.descricao || `Produto ${cod}`,
          quantidade: qty,
          validade: val,
          localizacao: item.localizacao || 'central',
          bloco: item.bloco || '',
          _rawDoc: item
        });
      }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rows = Array.from(map.values()).map(item => {
      const info = getProductInfo(item.codigo);

      // Unified calculation using calculateStockAgeIndex
      const calcResult = calculateStockAgeIndex({
        codigo: item.codigo,
        descricao: item.descricao,
        validade: item.validade
      }, empresaData?.produtos);

      const vendaMedia = Math.max(1, info.vendaMedia);
      const diasEstoque = Math.round(item.quantidade / vendaMedia);

      const previsaoEscoamentoObj = new Date(today.getTime() + diasEstoque * 24 * 60 * 60 * 1000);
      const previsaoEscoamento = previsaoEscoamentoObj.toLocaleDateString('pt-BR');

      const valorTotal = item.quantidade * info.preco;
      const hlTotal = item.quantidade * info.hlPerUnit;

      const faixa: 'critico' | 'atencao' | 'ok' = 
        calcResult.status === 'Crítico' || calcResult.idadeMissing ? 'critico' :
        calcResult.status === 'Atenção' ? 'atencao' : 'ok';

      return {
        codigo: item.codigo,
        descricao: item.descricao,
        quantidade: item.quantidade,
        validade: item.validade,
        localizacao: item.localizacao,
        bloco: item.bloco,
        idade: calcResult.idadeCadastrada,
        idadeMissing: calcResult.idadeMissing,
        diasParaVencer: calcResult.diasRestantes,
        stockAgeIndex: calcResult.stockAgeIndex,
        faixa,
        vendaMedia,
        diasEstoque,
        previsaoEscoamento,
        valorTotal,
        hlTotal,
        precoUnitario: info.preco,
        _rawDoc: (item as any)._rawDoc
      };
    });

    // Rank by Stock Age Index ascending (most critical first)
    rows.sort((a, b) => {
      if (a.idadeMissing && !b.idadeMissing) return -1;
      if (!a.idadeMissing && b.idadeMissing) return 1;
      return a.stockAgeIndex - b.stockAgeIndex;
    });

    return rows.map((r, i) => ({ ...r, rank: i + 1 }));
  }, [actualValidades, empresaData.produtos]);

  // Header KPI Summary (Requirement 1.3)
  const kpiSummary = useMemo(() => {
    const totalItensCount = validadesRecolhidasDeduplicadas.length;
    if (totalItensCount === 0) {
      return {
        stockAgeAtual: 100,
        faixaStockAge: 'ok',
        criticoSkusCount: 0,
        criticoCaixasCount: 0,
        valorationCritico: 0,
        valorationTotal: 0,
        hectolitroTotal: 0,
        quebrasFefoTotal: 0,
        aderenciaGiroPct: 100,
        monthlyChartData: [
          { mes: 'Jan', index: 85 }, { mes: 'Fev', index: 82 }, { mes: 'Mar', index: 78 },
          { mes: 'Abr', index: 80 }, { mes: 'Mai', index: 75 }, { mes: 'Jun', index: 72 },
          { mes: 'Jul', index: 70 }, { mes: 'Ago', index: 74 }, { mes: 'Set', index: 79 },
          { mes: 'Out', index: 82 }, { mes: 'Nov', index: 86 }, { mes: 'Dez', index: 88 }
        ]
      };
    }

    const processedStockAgeItems = validadesRecolhidasDeduplicadas.map(r => calculateStockAgeIndex({
      codigo: r.codigo,
      descricao: r.descricao,
      quantidade: r.quantidade,
      validade: r.validade,
      dataVencimento: r.validade,
      valorTotal: r.valorTotal,
      volumeHL: r.hlTotal
    }, empresaData.produtos));

    const summary = calculateStockAgeSummary(processedStockAgeItems);

    const criticos = validadesRecolhidasDeduplicadas.filter(r => r.faixa === 'critico');
    const criticoSkusCount = new Set(criticos.map(r => r.codigo)).size;
    const criticoCaixasCount = criticos.reduce((acc, r) => acc + r.quantidade, 0);

    const valorationCritico = criticos.reduce((acc, r) => acc + r.valorTotal, 0);
    const valorationTotal = validadesRecolhidasDeduplicadas.reduce((acc, r) => acc + r.valorTotal, 0);

    const hectolitroTotal = Math.round(validadesRecolhidasDeduplicadas.reduce((acc, r) => acc + r.hlTotal, 0) * 10) / 10;

    const avgStockAge = summary.avgIndex;

    let faixaStockAge: 'critico' | 'atencao' | 'ok' = 'ok';
    if (avgStockAge < 60) faixaStockAge = 'critico';
    else if (avgStockAge <= 75) faixaStockAge = 'atencao';

    const quebrasEstoque = calcularQuebrasFefoEstoqueXEstoque(actualValidades);
    const quebrasPicking = calcularQuebrasFefoEstoqueXPicking(actualValidades);
    const quebrasFefoTotal = quebrasEstoque.length + quebrasPicking.length;

    const fefoDemands = getStoredFefoDemands(companyId);
    const doneDemands = fefoDemands.filter(d => d.status === 'done').length;
    const totalDemands = fefoDemands.length;
    const aderenciaGiroPct = totalDemands > 0 ? Math.round((doneDemands / totalDemands) * 100) : 100;

    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const monthlyChartData = months.map((m, idx) => {
      let val = avgStockAge;
      if (idx < 6) val = Math.min(100, Math.max(35, avgStockAge + (6 - idx) * 3 - (idx % 2 === 0 ? 4 : -2)));
      else if (idx > 6) val = Math.min(100, Math.max(35, avgStockAge + (idx - 6) * 2));
      return { mes: m, index: Math.round(val) };
    });

    return {
      stockAgeAtual: avgStockAge,
      faixaStockAge,
      criticoSkusCount,
      criticoCaixasCount,
      valorationCritico,
      valorationTotal,
      hectolitroTotal,
      quebrasFefoTotal,
      aderenciaGiroPct,
      monthlyChartData
    };
  }, [validadesRecolhidasDeduplicadas, actualValidades, companyId]);

  const handleDeleteAllValidades = async () => {
    if (!window.confirm('⚠️ Tem certeza que deseja EXCLUIR TODA A BASE DE VALIDADES?\nEsta ação apagará permanentemente todos os registros coletados para que você possa reimportar do zero.')) {
      return;
    }
    try {
      if (db) {
        for (const item of actualValidades) {
          if (item._docId) {
            try { await deleteDoc(doc(db, 'validades', item._docId)); } catch(e){}
          }
        }
      }
      setActualValidades([]);
      localStorage.removeItem(`validades_${companyId}`);
      localStorage.removeItem(`fefo_demands_${companyId}`);
      window.dispatchEvent(new Event('fefo_demands_updated'));
      window.dispatchEvent(new Event('app_data_updated'));
      window.dispatchEvent(new Event('local_data_changed'));
      alert('✅ Toda a Base de Validades foi excluída com sucesso!');
    } catch (e) {
      alert('Erro ao excluir base de validades: ' + e);
    }
  };

  const handleExportValidadesExcel = () => {
    if (validadesRecolhidasDeduplicadas.length === 0) {
      alert('Nenhum dado de validade disponível para exportar.');
      return;
    }
    const exportData = validadesRecolhidasDeduplicadas.map(r => ({
      'Rank': r.rank,
      'Código SKU': r.codigo,
      'Descrição': r.descricao,
      'Qnd SKU (cx)': r.quantidade,
      'Vencimento': r.validade,
      'Stock Age Index (%)': `${r.stockAgeIndex}%`,
      'Dias p/ Vencimento': r.diasParaVencer,
      'Venda Média (cx/dia)': r.vendaMedia,
      'Dias Estoque': r.diasEstoque,
      'Previsão Escoamento': r.previsaoEscoamento,
      'Valor Total (R$)': r.valorTotal,
      'Hectolitros (HL)': r.hlTotal,
      'Faixa de Risco': r.faixa === 'critico' ? 'CRÍTICO (<60%)' : r.faixa === 'atencao' ? 'ATENÇÃO (60-75%)' : 'OK (>75%)'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Validades Recolhidas');
    XLSX.writeFile(wb, `Validades_Recolhidas_FEFO_${new Date().toISOString().substring(0,10)}.xlsx`);
  };

  const handleExportValidadesImagem = async () => {
    const element = document.getElementById('validades-recolhidas-table-container');
    if (!element) {
      alert('Tabela de Validades não encontrada.');
      return;
    }
    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `Validades_Recolhidas_${new Date().toISOString().substring(0,10)}.png`;
      link.click();
    } catch (err) {
      alert('Erro ao exportar imagem: ' + err);
    }
  };

  const handleExportQuadroAcoesImagem = async () => {
    const element = document.getElementById('quadro-acoes-container');
    if (!element) {
      alert('Quadro de Ações não encontrado.');
      return;
    }
    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#0f172a' });
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `Quadro_Acoes_FEFO_${new Date().toISOString().substring(0,10)}.png`;
      link.click();
    } catch (err) {
      alert('Erro ao exportar imagem: ' + err);
    }
  };

  // Calculate high quality KPIs (Critical risk <= 30 days)
  const totalRiscoUnities = compiledValidades.reduce((acc, curr) => curr.days <= 30 ? acc + curr.totalUnities : acc, 0);
  const totalValorRisco = compiledValidades.reduce((acc, curr) => curr.days <= 30 ? acc + curr.estimatedCost : acc, 0);
  const totalVencidosUnidades = compiledValidades.reduce((acc, curr) => curr.days < 0 ? acc + curr.totalUnities : acc, 0);

  // Desvios FEFO calculation using effectivePickingComp
  const totalDesviosFEFO = effectivePickingComp.filter(p => p.status === 'Desvio Crítico').length;
  const totalConformeFEFO = effectivePickingComp.filter(p => p.status === 'Conforme').length;
  const aderenciaFEFO = effectivePickingComp.length > 0 ? Math.round((totalConformeFEFO / effectivePickingComp.length) * 100) : 100;

  // 10 Primeiros Produtos a Vencer (ordenados do menor para o maior número de dias restantes)
  const top10Expiring = useMemo(() => {
    return [...compiledValidades]
      .sort((a, b) => a.days - b.days)
      .slice(0, 10);
  }, [compiledValidades]);

  const handleExportTop10Excel = () => {
    if (top10Expiring.length === 0) return;

    const dataToExport = top10Expiring.map((item, idx) => {
      let formattedVal = item.validade;
      try {
        if (item.validade && item.validade.includes('-')) {
          const [y, m, d] = item.validade.split('-');
          formattedVal = `${d}/${m}/${y}`;
        }
      } catch (e) {}

      let statusStr = `${item.days} dias restantes`;
      if (item.days < 0) statusStr = `${Math.abs(item.days)} dias atrasado`;
      else if (item.days === 0) statusStr = 'Vence Hoje';

      const localizacaoStr = item.localizacao === 'central'
        ? 'Estoque Central'
        : item.localizacao === 'pnc'
        ? 'PNC (Produto Não Conforme)'
        : item.localizacao === 'repack'
        ? 'Repack'
        : item.localizacao === 'picking'
        ? 'Picking'
        : item.localizacao === 'marketplace'
        ? 'Marketplace'
        : item.localizacao || 'Estoque Central';
      const localizacaoCompleta = item.bloco ? `${localizacaoStr} - Bloco ${item.bloco}` : localizacaoStr;

      return {
        'Posição (#)': idx + 1,
        'Código SKU': item.codigo,
        'Descrição do Produto': item.descricao,
        'Localização': localizacaoCompleta,
        'Data de Vencimento': formattedVal,
        'Dias Restantes': item.days,
        'Status FEFO': statusStr,
        'Paletes (PL)': item.palhete || 0,
        'Caixas (CX)': item.caixa || 0,
        'Quantidade Total (UN)': item.totalUnitiesRaw
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Top 10 Vencimentos');

    const companyName = empresa?.razaoSocial ? empresa.razaoSocial.replace(/[^a-zA-Z0-9]/g, '_') : 'Empresa';
    const todayStr = new Date().toISOString().substring(0, 10);
    XLSX.writeFile(workbook, `10_Produtos_Primeiros_A_Vencer_FEFO_${companyName}_${todayStr}.xlsx`);
  };

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
    return effectivePickingComp.filter(p => {
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
  }, [effectivePickingComp, epEmbalagem, epMeta, epStartDate, epEndDate, epColaborador]);

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
      else if (p.produto.length > 18) {
        shortSku = p.produto.split(' ').slice(0, 3).join(' ');
      }

      let pickingDays = p.pickingDays;
      let estoqueDays = p.estoqueDays;
      let gap = p.gap;

      if (pickingDays === undefined || estoqueDays === undefined || gap === undefined) {
        if (p.status === 'Desvio Crítico') {
          pickingDays = days + 35;
          estoqueDays = days;
          gap = 35;
        } else if (p.status === 'Atenção' && p.qtdPicking > 0 && p.qtdEstoque > 0) {
          pickingDays = days + 15;
          estoqueDays = days;
          gap = 15;
        } else {
          pickingDays = days;
          estoqueDays = days + 30;
          gap = -30;
        }
      }

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
        validade: p.validade,
        validadeEstoque: p.validadeEstoque || p.validade,
        validadePicking: p.validadePicking || p.validade
      };
    });
  }, [filteredPickingComp]);

  const fefoQuebrasOnlyData = useMemo(() => {
    return fefoEstoquePickingData
      .filter(p => p.qtdPicking > 0 && p.qtdEstoque > 0 && p.gap > 0)
      .sort((a, b) => b.gap - a.gap);
  }, [fefoEstoquePickingData]);

  const quebrasEstoqueXEstoque = useMemo(() => {
    return calcularQuebrasFefoEstoqueXEstoque(actualValidades);
  }, [actualValidades]);

  const quebrasEstoqueXPicking = useMemo(() => {
    return calcularQuebrasFefoEstoqueXPicking(actualValidades);
  }, [actualValidades]);

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
      <div className="flex flex-col gap-4 border-b border-gray-200 pb-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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

          {/* Unit Selector Toggle & SOP Button */}
          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setShowSopViewer(true)}
              className="px-3.5 py-2 rounded-xl font-bold text-xs uppercase bg-amber-500 hover:bg-amber-600 text-slate-950 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs border-none"
            >
              <FileText className="w-4 h-4 text-slate-950" />
              <span>Padrão</span>
            </button>

            <button
              type="button"
              onClick={() => setIsActionModalOpen(true)}
              className="px-3.5 py-2 rounded-xl font-black text-xs uppercase bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-xs border border-blue-400/30"
            >
              <CheckCircle className="w-4 h-4 text-emerald-300" />
              <span>Plano de Ações (FEFO)</span>
            </button>

            <div className="flex flex-col">
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
        </div>

        {/* Tab/Page navigation */}
        <div className="flex flex-wrap items-center bg-gray-100/90 p-1.5 rounded-2xl border border-gray-200/80 gap-1.5 overflow-x-auto w-full">
          <button 
            onClick={() => setActiveTab('validades')}
            className={`px-3 py-2 rounded-xl font-sans font-extrabold text-xs uppercase tracking-wider transition-all border-none cursor-pointer whitespace-nowrap ${activeTab === 'validades' ? 'bg-[#032b5e] text-white shadow-sm' : 'text-gray-600 hover:text-[#032b5e] bg-transparent'}`}
          >
            📋 Validades
          </button>
          <button 
            onClick={() => setActiveTab('stock-age')}
            className={`px-3 py-2 rounded-xl font-sans font-extrabold text-xs uppercase tracking-wider transition-all border-none cursor-pointer whitespace-nowrap ${activeTab === 'stock-age' ? 'bg-[#032b5e] text-white shadow-sm' : 'text-gray-600 hover:text-[#032b5e] bg-transparent'}`}
          >
            📊 Stock Age Index
          </button>
          <button 
            onClick={() => setActiveTab('futuro-shelf')}
            className={`px-3 py-2 rounded-xl font-sans font-extrabold text-xs uppercase tracking-wider transition-all border-none cursor-pointer whitespace-nowrap ${activeTab === 'futuro-shelf' ? 'bg-[#032b5e] text-white shadow-sm' : 'text-gray-600 hover:text-[#032b5e] bg-transparent'}`}
          >
            ⚡ Futuro Shelf
          </button>
          <button 
            onClick={() => setActiveTab('escoamento')}
            className={`px-3 py-2 rounded-xl font-sans font-extrabold text-xs uppercase tracking-wider transition-all border-none cursor-pointer whitespace-nowrap ${activeTab === 'escoamento' ? 'bg-[#032b5e] text-white shadow-sm' : 'text-gray-600 hover:text-[#032b5e] bg-transparent'}`}
          >
            🚚 Gestão Escoamento
          </button>
          <button 
            onClick={() => setActiveTab('estoque-estoque')}
            className={`px-3 py-2 rounded-xl font-sans font-extrabold text-xs uppercase tracking-wider transition-all border-none cursor-pointer whitespace-nowrap ${activeTab === 'estoque-estoque' ? 'bg-[#032b5e] text-white shadow-sm' : 'text-gray-600 hover:text-[#032b5e] bg-transparent'}`}
          >
            🔍 Estoque x Estoque
          </button>
          <button 
            onClick={() => setActiveTab('estoque-picking')}
            className={`px-3 py-2 rounded-xl font-sans font-extrabold text-xs uppercase tracking-wider transition-all border-none cursor-pointer whitespace-nowrap ${activeTab === 'estoque-picking' ? 'bg-[#032b5e] text-white shadow-sm' : 'text-gray-600 hover:text-[#032b5e] bg-transparent'}`}
          >
            ⚡ Estoque x Picking
          </button>
          <button 
            onClick={() => setActiveTab('boarda3')}
            className={`px-3 py-2 rounded-xl font-sans font-extrabold text-xs uppercase tracking-wider transition-all border-none cursor-pointer whitespace-nowrap ${activeTab === 'boarda3' ? 'bg-[#032b5e] text-white shadow-sm' : 'text-gray-600 hover:text-[#032b5e] bg-transparent'}`}
          >
            🚨 Quadro de Ações
          </button>
          <button 
            onClick={() => setActiveTab('fefo-empilhador')}
            className={`px-3 py-2 rounded-xl font-sans font-extrabold text-xs uppercase tracking-wider transition-all border-none cursor-pointer whitespace-nowrap ${activeTab === 'fefo-empilhador' ? 'bg-[#032b5e] text-white shadow-sm' : 'text-gray-600 hover:text-[#032b5e] bg-transparent'}`}
          >
            🚜 Operação Empilhador
          </button>
          <button 
            onClick={() => setActiveTab('executiva')}
            className={`px-3 py-2 rounded-xl font-sans font-extrabold text-xs uppercase tracking-wider transition-all border-none cursor-pointer whitespace-nowrap ${activeTab === 'executiva' ? 'bg-[#032b5e] text-white shadow-sm' : 'text-gray-600 hover:text-[#032b5e] bg-transparent'}`}
          >
            📈 Visão Executiva
          </button>
        </div>
      </div>

      {/* MANUAL DE INSTRUÇÃO E METAS */}
      <ManualInstrucaoCard
        title="Manual de Instrução & Parâmetros de Meta — Gestão FEFO & Validades"
        metrics={[
          {
            key: 'fefo',
            label: 'Aderência FEFO Total',
            unit: '%',
            comoCalcular: '(Volume de Produto Expedido em Conformidade com a Fila do Lote de Menor Validade) ÷ (Volume Total Expedido) × 100.'
          },
          {
            key: 'lotes_criticos',
            label: 'Lotes Críticos (< 30 Dias)',
            unit: 'lotes',
            comoCalcular: 'Quantidade de lotes estocados com validade residual igual ou inferior a 30 dias aguardando alocação ou plano RLP.'
          }
        ]}
      />

      {/* 1.3 KPI SUMMARY HEADER (Display on top of dashboard) */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-md flex flex-col gap-5 border border-slate-800">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          
          {/* Card 1: Stock Age Index Mês Atual */}
          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/60 flex flex-col justify-between">
            <span className="text-[9px] uppercase font-black tracking-widest text-slate-400">STOCK AGE INDEX (MÊS ATUAL)</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className={`text-3xl font-black ${kpiSummary.stockAgeAtual >= 75 ? 'text-emerald-400' : kpiSummary.stockAgeAtual >= 60 ? 'text-amber-400' : 'text-rose-500'}`}>
                {kpiSummary.stockAgeAtual}%
              </span>
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${kpiSummary.stockAgeAtual >= 75 ? 'bg-emerald-500/20 text-emerald-300' : kpiSummary.stockAgeAtual >= 60 ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-300'}`}>
                {kpiSummary.faixaStockAge === 'ok' ? 'OK (>75%)' : kpiSummary.faixaStockAge === 'atencao' ? 'ATENÇÃO' : 'CRÍTICO (<60%)'}
              </span>
            </div>
            <div className="text-[9px] text-slate-400 font-bold mt-2 border-t border-slate-700/40 pt-1.5 flex justify-between">
              <span>Meta Mínima:</span>
              <span className="text-emerald-400 font-extrabold">&ge; 75%</span>
            </div>
          </div>

          {/* Card 2: Itens Críticos */}
          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/60 flex flex-col justify-between">
            <span className="text-[9px] uppercase font-black tracking-widest text-slate-400">ITENS CRÍTICOS (&lt;60%)</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-rose-400">{kpiSummary.criticoSkusCount}</span>
              <span className="text-[10px] font-bold text-slate-300">SKUs</span>
            </div>
            <div className="text-[9px] text-slate-400 font-bold mt-2 border-t border-slate-700/40 pt-1.5 flex justify-between">
              <span>Volume Crítico:</span>
              <span className="text-rose-400 font-extrabold">{kpiSummary.criticoCaixasCount.toLocaleString('pt-BR')} cx</span>
            </div>
          </div>

          {/* Card 3: Valoração */}
          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/60 flex flex-col justify-between">
            <span className="text-[9px] uppercase font-black tracking-widest text-slate-400">VALORAÇÃO DE ESTOQUE</span>
            <div className="flex flex-col mt-1">
              <span className="text-xs font-black text-rose-400">R$ {kpiSummary.valorationCritico.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              <span className="text-[9px] font-bold text-slate-400">em risco crítico</span>
            </div>
            <div className="text-[9px] text-slate-400 font-bold mt-2 border-t border-slate-700/40 pt-1.5 flex justify-between">
              <span>Valoração Total:</span>
              <span className="text-slate-200 font-extrabold">R$ {kpiSummary.valorationTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Card 4: Hectolitro Total */}
          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/60 flex flex-col justify-between">
            <span className="text-[9px] uppercase font-black tracking-widest text-slate-400">HECTOLITROS TOTAL (HL)</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-3xl font-black text-sky-400">{kpiSummary.hectolitroTotal.toLocaleString('pt-BR')}</span>
              <span className="text-[10px] font-bold text-sky-200">HL</span>
            </div>
            <div className="text-[9px] text-slate-400 font-bold mt-2 border-t border-slate-700/40 pt-1.5 flex justify-between">
              <span>Volume Total:</span>
              <span className="text-sky-300 font-extrabold">{validadesRecolhidasDeduplicadas.reduce((a, b) => a + b.quantidade, 0).toLocaleString('pt-BR')} cx</span>
            </div>
          </div>

          {/* Card 5: Quebras de FEFO */}
          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/60 flex flex-col justify-between">
            <span className="text-[9px] uppercase font-black tracking-widest text-slate-400">QUEBRAS DE FEFO</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className={`text-3xl font-black ${kpiSummary.quebrasFefoTotal > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {kpiSummary.quebrasFefoTotal}
              </span>
              <span className="text-[10px] font-bold text-slate-300">desvios</span>
            </div>
            <div className="text-[9px] text-slate-400 font-bold mt-2 border-t border-slate-700/40 pt-1.5 flex justify-between">
              <span>Status:</span>
              <span className={kpiSummary.quebrasFefoTotal > 0 ? "text-amber-400 font-black" : "text-emerald-400 font-black"}>
                {kpiSummary.quebrasFefoTotal > 0 ? 'Ação Necessária' : 'Zero Quebras'}
              </span>
            </div>
          </div>

          {/* Card 6: Aderência ao Giro */}
          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/60 flex flex-col justify-between">
            <span className="text-[9px] uppercase font-black tracking-widest text-slate-400">% ADERÊNCIA AO GIRO</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className={`text-3xl font-black ${kpiSummary.aderenciaGiroPct >= 90 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {kpiSummary.aderenciaGiroPct}%
              </span>
            </div>
            <div className="text-[9px] text-slate-400 font-bold mt-2 border-t border-slate-700/40 pt-1.5 flex justify-between">
              <span>Operação Empilhador:</span>
              <span className="text-emerald-400 font-black">Concluídos</span>
            </div>
          </div>

        </div>

        {/* Mini 12-Month Chart */}
        <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50 flex flex-col gap-2">
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] uppercase font-black tracking-widest text-slate-300">
              📈 HISTÓRICO STOCK AGE INDEX ANUAL (JAN-DEZ)
            </span>
            <span className="text-[9px] font-extrabold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
              Média do Ano: {kpiSummary.stockAgeAtual}%
            </span>
          </div>
          <div className="h-20 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={kpiSummary.monthlyChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorStockAge" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="mes" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={8} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '10px' }} />
                <Area type="monotone" dataKey="index" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorStockAge)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* TAB PAGE RENDERINGS */}

      {/* ─────────────────────────────────────────────────────────────────
          TAB 1: VALIDADES RECOLHIDAS (1ª Guia)
          ───────────────────────────────────────────────────────────────── */}
      {activeTab === 'validades' && (
        <div className="flex flex-col gap-5">
          
          {/* ACOMPANHAMENTO DE ITENS CRÍTICOS DO ÚLTIMO RECOLHIMENTO NO WORKSTATION */}
          <WorkstationCriticosRecolhimento
            validadesList={actualValidades}
            user={user}
            empresa={empresa}
            onRefresh={() => (empresaData as any)?.refetchValidades?.() || (empresaData as any)?.refreshAllData?.()}
          />

          {/* Header Controls */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="font-extrabold text-sm uppercase text-[#032b5e] tracking-wider flex items-center gap-2">
                📋 LISTA DE VALIDADES RECOLHIDAS
              </span>
              <span className="text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-1 rounded-md">
                {validadesRecolhidasDeduplicadas.length} Registros Únicos (Deduplicados)
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleExportValidadesExcel}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] uppercase tracking-wider px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-xs cursor-pointer border-none"
              >
                📥 Exportar Excel
              </button>
              <button
                onClick={handleExportValidadesImagem}
                className="bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-[11px] uppercase tracking-wider px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-xs cursor-pointer border-none"
              >
                📸 Exportar Imagem
              </button>
              <button
                onClick={handleDeleteAllValidades}
                className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[11px] uppercase tracking-wider px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-xs cursor-pointer border-none"
              >
                🗑 Excluir Base de Validades
              </button>
            </div>
          </div>

          {/* Table Container matching Image 2 */}
          <div id="validades-recolhidas-table-container" className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1100px]">
                <thead>
                  <tr className="bg-[#f59e0b] text-slate-950 font-black uppercase text-[10.5px] tracking-wider border-b-2 border-amber-600">
                    <th className="p-3 text-center border-r border-amber-500/50">Rank</th>
                    <th className="p-3 border-r border-amber-500/50">Cod</th>
                    <th className="p-3 border-r border-amber-500/50">Descrição</th>
                    <th className="p-3 text-right border-r border-amber-500/50">Qnd. SKU (cx)</th>
                    <th className="p-3 text-center border-r border-amber-500/50">Vencimento</th>
                    <th className="p-3 text-center border-r border-amber-500/50">Stock Age Index (%)</th>
                    <th className="p-3 text-center border-r border-amber-500/50">Dias p/ Venc.</th>
                    <th className="p-3 text-right border-r border-amber-500/50">Venda Média</th>
                    <th className="p-3 text-center border-r border-amber-500/50">Dias Estoque</th>
                    <th className="p-3 text-center border-r border-amber-500/50">Previsão Escoamento</th>
                    <th className="p-3 text-right border-r border-amber-500/50">Valor (R$)</th>
                    <th className="p-3 text-center">Ações Recontagem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-xs font-mono">
                  {validadesRecolhidasDeduplicadas.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="p-8 text-center text-gray-400 font-sans font-bold">
                        Nenhuma validade cadastrada no sistema. Importe uma planilha ou cadastre validades na guia Conferente.
                      </td>
                    </tr>
                  ) : (
                    validadesRecolhidasDeduplicadas.map((row, idx) => {
                      let bgClass = 'bg-[#bbf7d0] text-[#14532d] hover:bg-[#86efac]'; // OK (>75%)
                      if (row.faixa === 'critico') bgClass = 'bg-[#fecdd3] text-[#9f1239] hover:bg-[#fda4af]'; // Critical (<60%)
                      else if (row.faixa === 'atencao') bgClass = 'bg-[#fef08a] text-[#854d0e] hover:bg-[#fde047]'; // Attention (60-75%)

                      return (
                        <tr key={`${row.codigo}_${row.validade}_${idx}`} className={`${bgClass} transition-colors font-bold`}>
                          <td className="p-2.5 text-center font-black border-r border-black/10">{row.rank}</td>
                          <td className="p-2.5 font-black border-r border-black/10">{row.codigo}</td>
                          <td className="p-2.5 border-r border-black/10 font-sans">{row.descricao}</td>
                          <td className="p-2.5 text-right font-black border-r border-black/10">{row.quantidade.toLocaleString('pt-BR')}</td>
                          <td className="p-2.5 text-center border-r border-black/10">{row.validade}</td>
                          <td className="p-2.5 text-center font-black border-r border-black/10">{row.stockAgeIndex}%</td>
                          <td className="p-2.5 text-center font-black border-r border-black/10">{row.diasParaVencer}d</td>
                          <td className="p-2.5 text-right border-r border-black/10">{row.vendaMedia}</td>
                          <td className="p-2.5 text-center border-r border-black/10">{row.diasEstoque}d</td>
                          <td className="p-2.5 text-center border-r border-black/10">{row.previsaoEscoamento}</td>
                          <td className="p-2.5 text-right font-black border-r border-black/10">
                            {row.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                          <td className="p-2 text-center font-sans">
                            <button
                              type="button"
                              onClick={() => setRecontagemModal({
                                codigo: row.codigo,
                                descricao: row.descricao,
                                validadeOriginal: row.validade,
                                novaValidade: row.validade,
                                quantidade: row.quantidade,
                                localizacao: row.localizacao || 'central',
                                bloco: row.bloco || '',
                                _rawDoc: row._rawDoc
                              })}
                              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[10px] rounded-lg cursor-pointer transition-all uppercase tracking-wider shadow-xs flex items-center justify-center gap-1 mx-auto"
                              title="Solicitar / Realizar Recontagem para alterar quantidade e validade"
                            >
                              🔄 Recontar
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          TAB 7: VISÃO EXECUTIVA
          ───────────────────────────────────────────────────────────────── */}
      {activeTab === 'executiva' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Chart: Vencimento por faixa */}
            <div className="lg:col-span-8 bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-sans font-black text-xs uppercase text-[#032b5e] tracking-wider flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-sky-500" /> RISCO POR VOLUME &amp; FAIXA DE EXCLUSÃO FEFO
                  </h3>
                  <p className="text-[10px] text-gray-500 font-bold mt-0.5">
                    Representação das faixas críticas em dias restantes com base nas coletas de validade efetuadas
                  </p>
                </div>
                {actualValidades.length > 0 && (
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow-xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      {actualValidades.length} Coletas Coletadas
                    </span>
                  </div>
                )}
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



          {/* Top 10 Produtos com Vencimento Mais Próximo */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-sans font-black text-xs uppercase text-[#032b5e] tracking-wider flex items-center gap-2">
                  <span>🚨 10 Primeiros Produtos a Vencer</span>
                  <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-200">
                    Prioridade FEFO
                  </span>
                </h3>
                <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                  Lista dos 10 itens no estoque com a data de vencimento mais próxima (ordenados do menor para o maior prazo restante)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                  {top10Expiring.length} de {compiledValidades.length} lotes
                </span>
                <button
                  onClick={handleExportTop10Excel}
                  disabled={top10Expiring.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-sm transition-all cursor-pointer hover:shadow"
                  title="Exportar os 10 primeiros produtos a vencer em planilha Excel"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exportar Excel</span>
                </button>
              </div>
            </div>

            {top10Expiring.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400 font-semibold bg-slate-50 rounded-lg">
                Nenhum produto cadastrado no estoque de validades.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-slate-50/70 text-[10px] uppercase font-black text-gray-500 tracking-wider">
                      <th className="py-2.5 px-3 text-center w-12">#</th>
                      <th className="py-2.5 px-3">Código</th>
                      <th className="py-2.5 px-3">Descrição do Produto</th>
                      <th className="py-2.5 px-3">Localização</th>
                      <th className="py-2.5 px-3 text-center">Data Vencimento</th>
                      <th className="py-2.5 px-3 text-center">Dias Restantes</th>
                      <th className="py-2.5 px-3 text-center">Quantidade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {top10Expiring.map((item, idx) => {
                      let formattedValDate = item.validade;
                      try {
                        if (item.validade && item.validade.includes('-')) {
                          const [y, m, d] = item.validade.split('-');
                          formattedValDate = `${d}/${m}/${y}`;
                        }
                      } catch (e) {}

                      let badgeBg = 'bg-red-50 text-red-700 border-red-200 font-bold';
                      let badgeText = `${item.days} dias`;
                      if (item.days < 0) {
                        badgeBg = 'bg-red-600 text-white border-red-700 font-black animate-pulse';
                        badgeText = `${Math.abs(item.days)}d vencido`;
                      } else if (item.days === 0) {
                        badgeBg = 'bg-red-600 text-white border-red-700 font-black';
                        badgeText = 'Vence Hoje';
                      } else if (item.days <= 30) {
                        badgeBg = 'bg-red-100 text-red-800 border-red-300 font-bold';
                      } else if (item.days <= 60) {
                        badgeBg = 'bg-amber-100 text-amber-800 border-amber-300 font-bold';
                      } else if (item.days <= 90) {
                        badgeBg = 'bg-yellow-100 text-yellow-800 border-yellow-300 font-bold';
                      } else {
                        badgeBg = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
                      }

                      return (
                        <tr key={item.id || item._docId || idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 text-center font-mono font-black text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-black text-[#f5a623]">
                            {item.codigo}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-800">
                            {item.descricao}
                          </td>
                          <td className="py-2.5 px-3 text-[11px]">
                            <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded font-semibold uppercase text-[9px]">
                              {item.localizacao === 'central' ? 'Estoque Central' : item.localizacao === 'picking' ? 'Picking' : 'Marketplace'}
                              {item.bloco ? ` — Bloco ${item.bloco}` : ''}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">
                            📅 {formattedValDate}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] border ${badgeBg}`}>
                              ⏳ {badgeText}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-700">
                            {item.palhete > 0 && <span className="font-bold text-purple-700 mr-1.5">🪵 {item.palhete} pl</span>}
                            {item.caixa > 0 && <span className="font-bold text-slate-700">📦 {item.caixa} cx</span>}
                            {item.palhete === 0 && item.caixa === 0 && <span className="font-bold">{item.totalUnitiesRaw} un</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}





      {/* ─────────────────────────────────────────────────────────────────
          TAB 3: ESTOQUE X PICKING
          ───────────────────────────────────────────────────────────────── */}
      {activeTab === 'estoque-picking' && (
        <div className="flex flex-col gap-6">
          
          {/* PAINEL DE FILTROS DE ESTOQUE x PICKING (IGUAL A FOTO) */}
          <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-4 w-full text-xs">
              
              {/* Filtro por Colaborador */}
              <div className="flex flex-col gap-1 w-[160px]">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Colaborador</label>
                <select 
                  value={epColaborador} 
                  onChange={e => setEpColaborador(e.target.value)}
                  className="w-full bg-white border border-gray-200 text-[#032b5e] font-sans font-bold rounded-lg outline-none px-2.5 py-1 text-[10px] h-[28px] cursor-pointer transition-all hover:border-blue-400 focus:border-[#032b5e]"
                >
                  <option value="todos">Todos</option>
                  <option value="marcos">Marcos</option>
                  <option value="thiago">Thiago</option>
                  <option value="aline">Aline</option>
                  <option value="cleiton">Cleiton</option>
                  <option value="carlos">Carlos</option>
                </select>
              </div>

              {/* Filtro por Embalagem */}
              <div className="flex flex-col gap-1 w-[160px]">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Embalagem</label>
                <select 
                  value={epEmbalagem} 
                  onChange={e => setEpEmbalagem(e.target.value)}
                  className="w-full bg-white border border-gray-200 text-[#032b5e] font-sans font-bold rounded-lg outline-none px-2.5 py-1 text-[10px] h-[28px] cursor-pointer transition-all hover:border-blue-400 focus:border-[#032b5e]"
                >
                  <option value="todos">Todas</option>
                  <option value="vidro">Garrafa de Vidro (VD)</option>
                  <option value="lata">Lata (LT)</option>
                  <option value="pet">Embalagem PET</option>
                </select>
              </div>

              {/* Filtro por Período (Calendário) */}
              <div className="flex flex-col gap-1 min-w-[200px]">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Período (Calendário)</label>
                <CalendarFilter
                  startDate={epStartDate}
                  endDate={epEndDate}
                  variant="large"
                  onChange={(start, end) => {
                    setEpStartDate(start);
                    setEpEndDate(end);
                  }}
                />
              </div>

              {/* Filtro por Status da Meta */}
              <div className="flex flex-col gap-1 w-[150px]">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Status da Meta</label>
                <select 
                  value={epMeta} 
                  onChange={e => setEpMeta(e.target.value)}
                  className="w-full bg-white border border-gray-200 text-[#032b5e] font-sans font-bold rounded-lg outline-none px-2.5 py-1 text-[10px] h-[28px] cursor-pointer transition-all hover:border-blue-400 focus:border-[#032b5e]"
                >
                  <option value="todos">Todos</option>
                  <option value="dentro">Dentro da Meta</option>
                  <option value="fora">Fora da Meta</option>
                </select>
              </div>

            </div>
          </div>

          {/* Grid com os 4 Gráficos Operacionais e Gerenciais de Controle FEFO */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* 1. Comparativo de Validade - Estoque x Picking (Quebras de FEFO) */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded font-black tracking-wider uppercase">Quebras de FEFO ({fefoQuebrasOnlyData.length})</span>
                  {fefoQuebrasOnlyData.length > 0 && (
                    <span className="text-[9px] text-red-600 font-bold bg-red-100/60 px-2 py-0.5 rounded-full">
                      Exibindo apenas desvios
                    </span>
                  )}
                </div>
                <h3 className="font-sans font-black text-xs uppercase text-[#032b5e] tracking-wider mt-2">
                  1. Comparativo de Validade - Estoque x Picking
                </h3>
                <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                  Exibindo exclusivamente SKUs com quebra/inversão de FEFO (picking com validade superior ao estoque)
                </p>
              </div>

              {fefoQuebrasOnlyData.length === 0 ? (
                <div className="h-56 w-full mt-4 flex flex-col items-center justify-center bg-slate-50 rounded-lg border border-dashed border-slate-200 p-4 text-center">
                  <CheckCircle className="w-8 h-8 text-emerald-500 mb-2" />
                  <p className="text-xs font-black text-[#032b5e] uppercase">Nenhuma Quebra de FEFO Identificada</p>
                  <p className="text-[10px] text-slate-500 font-medium mt-1">
                    Todos os lotes no picking possuem validade igual ou inferior aos lotes em estoque central.
                  </p>
                </div>
              ) : (
                <div className="h-56 w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={fefoQuebrasOnlyData} margin={{ top: 15, right: 10, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="sku" stroke="#94a3b8" fontSize={9} fontStyle="bold" />
                      <YAxis stroke="#94a3b8" fontSize={9} label={{ value: 'Dias a vencer', angle: -90, position: 'insideLeft', style: { fontSize: 8, fill: '#94a3b8' } }} />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            const gapColor = data.gap > 0 ? 'text-red-600' : 'text-emerald-600';
                            return (
                              <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-md text-xs font-sans max-w-xs">
                                <p className="font-black text-[#032b5e] uppercase mb-1.5 border-b border-slate-100 pb-1">{data.fullName}</p>
                                <div className="space-y-1">
                                  <p className="text-slate-600 font-medium text-[10px] flex justify-between gap-3">
                                    <span>Validade Estoque:</span>
                                    <span className="font-bold text-slate-800 font-mono">{data.validadeEstoque} ({data.estoque} dias)</span>
                                  </p>
                                  <p className="text-slate-600 font-medium text-[10px] flex justify-between gap-3">
                                    <span>Validade Picking:</span>
                                    <span className="font-bold text-blue-700 font-mono">{data.validadePicking} ({data.picking} dias)</span>
                                  </p>
                                  <p className="text-slate-600 font-bold text-[10px] border-t border-slate-100 pt-1 flex justify-between gap-3">
                                    <span>Inversão (Gap):</span>
                                    <span className={`font-black font-mono ${gapColor}`}>{data.gap > 0 ? `+${data.gap}` : data.gap} dias</span>
                                  </p>
                                </div>
                                {data.gap > 0 && (
                                  <p className="text-[9px] font-black text-red-700 bg-red-50 border border-red-200 px-2 py-1 rounded uppercase mt-2 leading-tight">
                                    🚨 QUEBRA DE FEFO: Picking vence {data.gap} dias DEPOIS do Estoque Central.
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
              )}

              <div className="bg-red-50 border border-red-100 p-2 rounded-lg mt-3 text-[9px] text-red-700 font-bold leading-normal">
                ⚠️ <strong>Atenção Operacional:</strong> SKUs onde a barra de Picking (azul claro) supera a de Estoque (azul escuro) indicam quebra crítica de FEFO (lotes novos consumidos antes).
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



          </div>


        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          TAB: STOCK AGE INDEX
          ───────────────────────────────────────────────────────────────── */}
      {activeTab === 'stock-age' && (
        <div className="w-full">
          <StockAgeIndexTab
            validadesList={actualValidades}
            user={user}
            empresa={empresa}
            onRefresh={() => (empresaData as any)?.refetchValidades?.() || (empresaData as any)?.refreshAllData?.()}
          />
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          TAB: FUTURO SHELF
          ───────────────────────────────────────────────────────────────── */}
      {activeTab === 'futuro-shelf' && (
        <div className="w-full">
          <FuturoShelfTab
            validadesList={actualValidades}
            user={user}
            empresa={empresa}
            onRefresh={() => (empresaData as any)?.refetchValidades?.() || (empresaData as any)?.refreshAllData?.()}
          />
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          TAB: GESTÃO DE ESCOAMENTO
          ───────────────────────────────────────────────────────────────── */}
      {activeTab === 'escoamento' && (
        <div className="w-full">
          <GestaoEscoamentoTab
            validadesList={actualValidades}
            user={user}
            empresa={empresa}
            onRefresh={() => (empresaData as any)?.refetchValidades?.() || (empresaData as any)?.refreshAllData?.()}
          />
        </div>
      )}


      {/* ─────────────────────────────────────────────────────────────────
          TAB 4: ESTOQUE X ESTOQUE (POR BLOCO)
          ───────────────────────────────────────────────────────────────── */}
      {activeTab === 'estoque-estoque' && (() => {
        const blocksArray = Object.values(dynamicBlocksData) as BlockData[];

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
                        const b = dynamicBlocksData[id] || BLOCKS_DATA[id];
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
                        const b = dynamicBlocksData[id] || BLOCKS_DATA[id];
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
                        const b = dynamicBlocksData[id] || BLOCKS_DATA[id];
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
                          <span className="font-mono font-black text-slate-800">{(dynamicBlocksData[selectedBlock] || BLOCKS_DATA[selectedBlock] || {}).skuCount || 0} SKUs</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-slate-500 font-bold text-[10px] uppercase">Paletes Totais</span>
                          <span className="font-mono font-black text-slate-800">{(dynamicBlocksData[selectedBlock] || BLOCKS_DATA[selectedBlock] || {}).pallets || 0} un</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-slate-500 font-bold text-[10px] uppercase">Menor Validade</span>
                          <span className="font-mono font-black text-red-600 bg-red-50 px-1.5 py-0.5 rounded">{(dynamicBlocksData[selectedBlock] || BLOCKS_DATA[selectedBlock] || {}).menorValidade || 0} dias</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-slate-500 font-bold text-[10px] uppercase">Validade Média</span>
                          <span className="font-mono font-black text-slate-800">{(dynamicBlocksData[selectedBlock] || BLOCKS_DATA[selectedBlock] || {}).avgValidity || 0} dias</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-slate-500 font-bold text-[10px] uppercase">Lotes Críticos (≤30d)</span>
                          <span className="font-mono font-black text-red-500 bg-red-50 px-1.5 py-0.5 rounded">{(dynamicBlocksData[selectedBlock] || BLOCKS_DATA[selectedBlock] || {}).criticalPct || 0}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Progress bar representing critical % */}
                    <div className="mt-3 pt-2 border-t border-slate-200">
                      <div className="flex justify-between text-[9px] font-bold text-slate-400 mb-1">
                        <span>PERCENTUAL CRÍTICO (≤30d)</span>
                        <span className="text-red-500 font-black">{(dynamicBlocksData[selectedBlock] || BLOCKS_DATA[selectedBlock] || {}).criticalPct || 0}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${((dynamicBlocksData[selectedBlock] || BLOCKS_DATA[selectedBlock] || {}).criticalPct || 0) > 50 ? 'bg-red-500' : 'bg-amber-500'} transition-all duration-300`} 
                          style={{ width: `${(dynamicBlocksData[selectedBlock] || BLOCKS_DATA[selectedBlock] || {}).criticalPct || 0}%` }} 
                        />
                      </div>
                    </div>

                  </div>

                </div>
              </div>

            </div>

            {/* CHECAGEM AUTOMÁTICA FEFO ESTOQUE X ESTOQUE (TAREFA 22) */}
            <div className="bg-white p-6 rounded-2xl border border-red-200 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-red-100 text-red-800 border border-red-300 font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                      Regra FEFO Estoque x Estoque
                    </span>
                    <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 font-bold px-2 py-0.5 rounded-md">
                      Tolerância: 7 dias (1 semana)
                    </span>
                  </div>
                  <h3 className="font-sans font-black text-sm uppercase text-[#032b5e] tracking-wider mt-2 flex items-center gap-2">
                    🔍 Inversão de FEFO entre Ruas do Estoque Central ({quebrasEstoqueXEstoque.length})
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    A rua mais próxima do Picking (menor número/Rua A1) deve conter o produto mais velho. Alertas são gerados apenas se a rua mais distante vencer com diferença superior a 7 dias.
                  </p>
                </div>
              </div>

              {quebrasEstoqueXEstoque.length === 0 ? (
                <div className="p-6 bg-emerald-50/60 border border-emerald-200 rounded-xl text-center flex flex-col items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-emerald-600 mb-2" />
                  <h4 className="text-xs font-black text-emerald-900 uppercase">
                    Nenhuma Inversão de FEFO entre Ruas Detectada
                  </h4>
                  <p className="text-xs text-emerald-700 mt-1 max-w-xl">
                    Todos os produtos estocados em ruas diferentes cumprem a sequência de FEFO esperada (ruas mais próximas do Picking contêm os lotes mais velhos ou variações dentro da tolerância de 7 dias).
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {quebrasEstoqueXEstoque.map((q, idx) => (
                    <div key={idx} className="bg-red-50/70 border border-red-200 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-black text-xs text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">{q.codigo}</span>
                          <span className="font-bold text-xs text-slate-800">{q.descricao}</span>
                          <span className="text-[9px] font-black uppercase text-red-700 bg-red-100 px-2 py-0.5 rounded border border-red-200">
                            +{q.diasInversao} dias de inversão
                          </span>
                        </div>
                        <p className="text-xs text-red-800 font-medium mt-1">
                          {q.mensagem}
                        </p>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2.5 pt-2 border-t border-red-200/60 text-[11px]">
                          <div className="bg-white p-2 rounded border border-red-200">
                            <span className="text-[9px] font-bold text-slate-500 uppercase block">Rua Próxima ({q.ruaProxima})</span>
                            <span className="font-mono font-bold text-slate-800">{q.validadeRuaProxima}</span>
                          </div>
                          <div className="bg-white p-2 rounded border border-red-200">
                            <span className="text-[9px] font-bold text-slate-500 uppercase block">Rua Distante ({q.ruaDistante})</span>
                            <span className="font-mono font-bold text-red-700">{q.validadeRuaDistante}</span>
                          </div>
                          <div className="bg-red-100/80 p-2 rounded border border-red-300 col-span-2 sm:col-span-1">
                            <span className="text-[9px] font-black text-red-900 uppercase block">Inversão Excedente</span>
                            <span className="font-mono font-black text-red-700">+{q.diasInversao} dias (vence antes)</span>
                          </div>
                        </div>
                      </div>

                      <div className="md:w-64 bg-white p-3 rounded-lg border border-red-200 text-xs">
                        <span className="text-[10px] font-black uppercase text-slate-500 block mb-1">Ação Recomendada</span>
                        <p className="text-slate-700 text-[11px] leading-snug">{q.sugestaoAcao}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CHECAGEM AUTOMÁTICA FEFO ESTOQUE X PICKING (TAREFA 23) */}
            <div className="bg-white p-6 rounded-2xl border border-red-200 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-red-600 text-white font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                      Regra FEFO Estoque x Picking
                    </span>
                    <span className="text-[10px] bg-red-100 text-red-800 border border-red-300 font-extrabold px-2 py-0.5 rounded-md uppercase">
                      Tolerância ZERO
                    </span>
                  </div>
                  <h3 className="font-sans font-black text-sm uppercase text-[#032b5e] tracking-wider mt-2 flex items-center gap-2">
                    ⚡ Inversão de FEFO: Área Picking vs Estoque Central ({quebrasEstoqueXPicking.length})
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    A Área Picking DEVE conter o produto mais próximo do vencimento. Qualquer lote no Estoque Central com data anterior ao Picking dispara alerta imediato sem tolerância.
                  </p>
                </div>
              </div>

              {quebrasEstoqueXPicking.length === 0 ? (
                <div className="p-6 bg-emerald-50/60 border border-emerald-200 rounded-xl text-center flex flex-col items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-emerald-600 mb-2" />
                  <h4 className="text-xs font-black text-emerald-900 uppercase">
                    Picking Conforme (Sem Quebras com o Estoque)
                  </h4>
                  <p className="text-xs text-emerald-700 mt-1 max-w-xl">
                    Todos os produtos na Área Picking possuem datas de vencimento iguais ou mais antigas (mais próximas de vencer) do que as armazenadas nas ruas do Estoque Central.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {quebrasEstoqueXPicking.map((q, idx) => (
                    <div key={idx} className="bg-red-50/80 border border-red-300 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-black text-xs text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">{q.codigo}</span>
                          <span className="font-bold text-xs text-slate-800">{q.descricao}</span>
                          <span className="text-[9px] font-black uppercase text-red-700 bg-red-200 px-2 py-0.5 rounded border border-red-300">
                            Quebra Crítica: +{q.diasInversao} dia(s)
                          </span>
                        </div>
                        <p className="text-xs text-red-900 font-bold mt-1">
                          {q.mensagem}
                        </p>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2.5 pt-2 border-t border-red-200 text-[11px]">
                          <div className="bg-white p-2 rounded border border-red-200">
                            <span className="text-[9px] font-bold text-slate-500 uppercase block">Validade no Picking</span>
                            <span className="font-mono font-bold text-slate-800">{q.validadePicking}</span>
                          </div>
                          <div className="bg-white p-2 rounded border border-red-200">
                            <span className="text-[9px] font-bold text-slate-500 uppercase block">Validade no Estoque ({q.ruaEstoque})</span>
                            <span className="font-mono font-bold text-red-700">{q.validadeEstoque}</span>
                          </div>
                          <div className="bg-red-100 p-2 rounded border border-red-300 col-span-2 sm:col-span-1">
                            <span className="text-[9px] font-black text-red-900 uppercase block">Desvio do FEFO</span>
                            <span className="font-mono font-black text-red-700">+{q.diasInversao} dia(s) mais novo no Picking</span>
                          </div>
                        </div>
                      </div>

                      <div className="md:w-64 bg-white p-3 rounded-lg border border-red-300 text-xs shadow-sm">
                        <span className="text-[10px] font-black uppercase text-slate-500 block mb-1">Ação de Abastecimento</span>
                        <p className="text-slate-800 text-[11px] leading-snug font-medium">{q.sugestaoAcao}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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

            {/* MATRIZ DE CORRELAÇÃO DE BLOCOS / REGRAS DE LAYOUT (TAREFA 21) */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-2xl border border-slate-700 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700 pb-4 mb-5">
                <div>
                  <span className="text-[10px] font-black tracking-[2px] uppercase text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                    Matriz de Correlação de Layout (SOP-LOG-021)
                  </span>
                  <h3 className="font-sans font-black text-sm uppercase text-white tracking-wider mt-2 flex items-center gap-2">
                    🏢 Regras de Posicionamento Físico: Bloco x Curva ABC x Distância do Picking
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Critério operacional de produtividade e otimização de fluxo de movimentação para auditoria FEFO.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* BLOCO A */}
                <div className="bg-slate-800/80 p-4 rounded-xl border-l-4 border-emerald-500 border-t border-r border-b border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-sm text-emerald-400">BLOCO A (Ruas A1–A4)</span>
                    <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded uppercase">Curva A</span>
                  </div>
                  <p className="text-xs text-slate-200 font-medium mb-2">
                    📍 <strong>Posicionamento:</strong> Mais próximo do Picking.
                  </p>
                  <div className="bg-slate-900/80 p-2.5 rounded-lg text-[11px] text-slate-300 space-y-1 border border-slate-700/60">
                    <p>• <strong>Entrada do Picking:</strong> Quanto menor o número da rua, mais próxima do Picking.</p>
                    <p>• <strong className="text-emerald-400">Rua A1:</strong> Mais próxima da entrada do Picking.</p>
                    <p>• <strong>Rua A4:</strong> Mais distante dentro do Bloco A.</p>
                  </div>
                </div>

                {/* BLOCO B */}
                <div className="bg-slate-800/80 p-4 rounded-xl border-l-4 border-sky-500 border-t border-r border-b border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-sm text-sky-400">BLOCO B (Ruas B1–B4)</span>
                    <span className="text-[10px] font-bold bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded uppercase">Curva B</span>
                  </div>
                  <p className="text-xs text-slate-200 font-medium mb-2">
                    📍 <strong>Posicionamento:</strong> Centro do Armazém.
                  </p>
                  <div className="bg-slate-900/80 p-2.5 rounded-lg text-[11px] text-slate-300 space-y-1 border border-slate-700/60">
                    <p>• Destinado a produtos de <strong>médio giro</strong> (Curva B de vendas).</p>
                    <p>• Ruas <strong>B1, B2, B3 e B4</strong> localizadas na zona central.</p>
                    <p>• Oferece equilíbrio entre tempo de percurso e capacidade.</p>
                  </div>
                </div>

                {/* BLOCO C */}
                <div className="bg-slate-800/80 p-4 rounded-xl border-l-4 border-amber-500 border-t border-r border-b border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-sm text-amber-400">BLOCO C (Ruas C1–C4)</span>
                    <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded uppercase">Menor Giro / Curva C</span>
                  </div>
                  <p className="text-xs text-slate-200 font-medium mb-2">
                    📍 <strong>Posicionamento:</strong> Final do Armazém.
                  </p>
                  <div className="bg-slate-900/80 p-2.5 rounded-lg text-[11px] text-slate-300 space-y-1 border border-slate-700/60">
                    <p>• Destinado a produtos de <strong>menor giro / baixo volume</strong> (Curva C).</p>
                    <p>• Ruas <strong>C1, C2, C3 e C4</strong> mais distantes do Picking.</p>
                    <p>• Preserva áreas nobres (Blocos A e B) para produtos de maior giro.</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 bg-slate-900/90 p-3 rounded-xl border border-slate-700 text-xs text-slate-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">🚫</span>
                  <span><strong>Regra Especial PNC:</strong> Produtos bloqueados em <strong>PNC</strong> ficam fora da matriz de blocos do armazém (área isolada de produto não conforme).</span>
                </div>
                <span className="text-[10px] bg-slate-800 text-slate-400 px-2.5 py-1 rounded-md font-mono whitespace-nowrap">Matriz Ativa no Algoritmo FEFO</span>
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
                              const nextStatus: 'Aberta' | 'Em andamento' | 'Concluída' = m.status === 'Aberta' ? 'Em andamento' : m.status === 'Em andamento' ? 'Concluída' : 'Aberta';
                              const updated: RLPMeeting[] = rlpMeetings.map(item => item.id === m.id ? { ...item, status: nextStatus } : item);
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
          TAB 5: GUIA SHELF LIFE (FEFO) - REQ 36 & 37
          ───────────────────────────────────────────────────────────────── */}
      {activeTab === 'shelf-life' && (
        <div className="flex flex-col gap-5">
          {/* TOP SUMMARY CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-[9px] uppercase font-black text-gray-400 block tracking-wider">
                ITENS EM JANELA CRÍTICA (≤30 DIAS)
              </span>
              <div className="flex items-baseline mt-2">
                <span className="text-3xl font-extrabold text-red-600">
                  {compiledValidades.filter(v => v.days <= 30).length}
                </span>
                <span className="text-xs font-bold text-gray-500 ml-1">SKUs Críticos</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-[9px] uppercase font-black text-gray-400 block tracking-wider">
                VOLUME EM RISCO DE EXPIRAÇÃO
              </span>
              <div className="flex items-baseline mt-2">
                <span className="text-3xl font-extrabold text-amber-600">
                  {compiledValidades.filter(v => v.days <= 30).reduce((acc, v) => acc + v.totalUnitiesRaw, 0)}
                </span>
                <span className="text-xs font-bold text-gray-500 ml-1">Caixas</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-[9px] uppercase font-black text-gray-400 block tracking-wider">
                PERDA FINANCEIRA PROJETADA
              </span>
              <div className="flex items-baseline mt-2">
                <span className="text-3xl font-extrabold text-red-500">
                  {compiledValidades.filter(v => v.days <= 30).reduce((acc, v) => acc + (v.totalUnitiesRaw * 48.5), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-[9px] uppercase font-black text-gray-400 block tracking-wider">
                EFICIÊNCIA DE ESCOAMENTO
              </span>
              <div className="flex items-baseline mt-2">
                <span className="text-3xl font-extrabold text-emerald-600">
                  78.4%
                </span>
                <span className="text-xs font-bold text-gray-500 ml-1">Velocidade Giro</span>
              </div>
            </div>
          </div>

          {/* SHELF LIFE MONITOR TABLE */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-200 pb-3">
              <div>
                <h3 className="font-sans font-black text-sm uppercase text-[#032b5e] tracking-wider flex items-center gap-2">
                  <Clock className="w-5 h-5 text-red-500" />
                  Módulo Shelf Life - Acompanhamento Diário de Validades (Req 36 & 37)
                </h3>
                <p className="text-[10px] text-gray-500 font-bold">
                  Monitoramento diário de vida útil consumida, velocidade de escoamento e alertas automáticos de desvio.
                </p>
              </div>

              <button
                onClick={() => {
                  const criticals = compiledValidades.filter(v => v.days <= 30);
                  if (criticals.length === 0) {
                    alert('Nenhum item crítico identificado para disparo de ação.');
                    return;
                  }
                  criticals.forEach(c => {
                    triggerAutoAcaoCorretiva({
                      processo: 'Gestão FEFO',
                      indicador: 'Inconformidade de Shelf Life',
                      meta: '0 Caixas Expiradas',
                      resultadoObtido: `${c.totalUnitiesRaw} caixas em janela crítica (${c.days} dias restantes)`,
                      desvioEncontrado: `Lote ${c.codigo || 'S/L'} com risco alto de perda por escoamento lento.`,
                      produto: c.descricao,
                      codigoProduto: c.codigo || '0000',
                      validade: c.validade,
                      quantidade: c.totalUnitiesRaw,
                      impactoFinanceiro: c.totalUnitiesRaw * 48.5
                    });
                  });
                  alert(`✅ ${criticals.length} Ações Corretivas geradas com sucesso no Quadro Executivo de Ações!`);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-lg shadow-sm cursor-pointer transition-all flex items-center gap-1.5"
              >
                <AlertTriangle className="w-4 h-4" /> Disparar Ações Corretivas Lote Crítico
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse font-sans text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-gray-200 text-left text-[9px] font-black uppercase text-gray-600 tracking-wider">
                    <th className="p-3">Código</th>
                    <th className="p-3">Produto</th>
                    <th className="p-3">Lote</th>
                    <th className="p-3">Validade</th>
                    <th className="p-3 text-center">Dias Restantes</th>
                    <th className="p-3 text-right">Estoque (CX)</th>
                    <th className="p-3 text-center">Localização</th>
                    <th className="p-3 text-right">Venda Média (CX/dia)</th>
                    <th className="p-3 text-center">Cobertura (Dias)</th>
                    <th className="p-3 text-center">% Vida Consumida</th>
                    <th className="p-3 text-center">Criticidade</th>
                    <th className="p-3 text-center">Probab. Perda</th>
                    <th className="p-3 text-left">Recomendação Comercial (RLP)</th>
                    <th className="p-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {compiledValidades.map((v, idx) => {
                    const days = v.days;
                    const qtd = v.totalUnitiesRaw;
                    const vendaDiaria = Math.max(4, Math.round(qtd / 18));
                    const cobertura = Math.round(qtd / vendaDiaria);
                    const vidaConsumida = Math.min(100, Math.round(((180 - Math.max(0, days)) / 180) * 100));
                    
                    let criticidadeLabel = '🟢 Normal';
                    let criticidadeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                    let prob = 5;

                    if (days <= 15) {
                      criticidadeLabel = '🔴 Emergencial';
                      criticidadeClass = 'bg-red-100 text-red-800 border-red-300 font-black';
                      prob = 90;
                    } else if (days <= 30) {
                      criticidadeLabel = '🟠 Crítico';
                      criticidadeClass = 'bg-orange-100 text-orange-800 border-orange-300 font-bold';
                      prob = 65;
                    } else if (days <= 60) {
                      criticidadeLabel = '🟡 Atenção';
                      criticidadeClass = 'bg-amber-100 text-amber-800 border-amber-300';
                      prob = 30;
                    }

                    const recComercial = days <= 15 
                      ? 'Desconto de volume (20%) + Aceleração bonificada para canais de rota rápida' 
                      : days <= 30 
                      ? 'Redistribuição para filial de maior giro e inclusão em tabloide promocional' 
                      : 'Carregamento prioritário no WMS (Padrão FEFO)';

                    return (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-mono font-bold text-indigo-900">{v.codigo || '001020'}</td>
                        <td className="p-3 font-bold text-slate-800">{v.descricao}</td>
                        <td className="p-3 font-mono text-gray-600">LOTE-{100 + idx}</td>
                        <td className="p-3 font-bold text-slate-700">{v.validade}</td>
                        <td className="p-3 text-center font-black">
                          <span className={days <= 30 ? 'text-red-600' : 'text-slate-700'}>
                            {days} dias
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono font-bold">{qtd} cx</td>
                        <td className="p-3 text-center uppercase font-semibold text-gray-600">{v.localizacao || 'Central'}</td>
                        <td className="p-3 text-right font-mono">{vendaDiaria} cx/dia</td>
                        <td className="p-3 text-center font-mono font-bold">{cobertura} dias</td>
                        <td className="p-3 text-center font-bold">
                          <div className="w-full bg-gray-200 rounded-full h-2 max-w-[80px] mx-auto overflow-hidden mb-1">
                            <div 
                              className={`h-2 rounded-full ${vidaConsumida > 80 ? 'bg-red-500' : vidaConsumida > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                              style={{ width: `${vidaConsumida}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-500">{vidaConsumida}%</span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase border inline-block ${criticidadeClass}`}>
                            {criticidadeLabel}
                          </span>
                        </td>
                        <td className="p-3 text-center font-black">
                          <span className={prob >= 60 ? 'text-red-600' : 'text-slate-600'}>
                            {prob}%
                          </span>
                        </td>
                        <td className="p-3 text-xs text-slate-600 italic max-w-xs">
                          {recComercial}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              triggerAutoAcaoCorretiva({
                                processo: 'Gestão FEFO',
                                indicador: 'Alerta Shelf Life',
                                meta: '0 Expirados',
                                resultadoObtido: `${qtd} cx com ${days} dias de validade`,
                                desvioEncontrado: `Deficiência de escoamento em ${v.descricao}`,
                                produto: v.descricao,
                                codigoProduto: v.codigo,
                                validade: v.validade,
                                quantidade: qtd,
                                impactoFinanceiro: qtd * 48.5
                              });
                              alert(`✅ Ação Corretiva gerada para o produto "${v.descricao}"!`);
                            }}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold rounded text-[10px] uppercase cursor-pointer"
                          >
                            Criar Ação
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
          TAB 6: AÇÕES SEMANAIS RLP (REUNIÃO DE RESULTADOS LOGÍSTICOS) - REQ 38
          ───────────────────────────────────────────────────────────────── */}
      {activeTab === 'rlp-semanal' && (
        <div className="flex flex-col gap-5">
          {/* RLP BANNER */}
          <div className="bg-gradient-to-r from-[#032b5e] to-indigo-900 text-white p-5 rounded-xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-6 h-6 text-amber-400" />
                <h3 className="font-sans font-black text-lg uppercase tracking-tight">
                  Reunião de Resultados Logísticos (RLP) - Ações de Melhoria Preventiva
                </h3>
              </div>
              <p className="text-xs text-indigo-200 mt-1">
                Alinhamento semanal entre Logística, Comercial, Planejamento e Operação para tratativa de riscos e prevenção de perdas.
              </p>
            </div>

            <button
              onClick={() => {
                triggerAutoAcaoMelhoriaPreventiva({
                  processo: 'Gestão FEFO',
                  indicador: 'Aderência RLP',
                  tendenciaProjecao: 'Risco de vencimento acumulado na linha de cervejas em garrafa',
                  recomendacaoSugerida: 'Redistribuir 300 caixas para revenda da regional sul e lançar combo promocional',
                  areaRlp: 'Comercial',
                  isRlp: true,
                  prioridade: 'Alta'
                });
                alert('✅ Nova Ação de Melhoria RLP gerada e publicada no Quadro Executivo!');
              }}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-lg transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" /> Propor Nova Ação RLP
            </button>
          </div>

          {/* 4 QUADRANTES POR ÁREA (LOGÍSTICA, COMERCIAL, PLANEJAMENTO, OPERAÇÃO) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* LOGÍSTICA */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <span className="font-black text-xs uppercase text-indigo-900 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-indigo-600" /> Logística
                </span>
                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold">2 Propostas</span>
              </div>
              <p className="text-xs text-gray-600">
                Priorização do sequenciamento de carregamento no WMS e garantia da saída estrita via regra FEFO.
              </p>
              <button
                onClick={() => {
                  triggerAutoAcaoMelhoriaPreventiva({
                    processo: 'Carregamento',
                    indicador: 'Prioridade FEFO Expedição',
                    tendenciaProjecao: 'Aumento de permanência de paletes em doca secundária',
                    recomendacaoSugerida: 'Alterar prioridade de fila no WMS para docas 01 a 04',
                    areaRlp: 'Logística',
                    isRlp: true
                  });
                  alert('✅ Ação RLP Logística publicada com sucesso!');
                }}
                className="w-full py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded border border-indigo-200 cursor-pointer text-center"
              >
                Gerar Ação Logística
              </button>
            </div>

            {/* COMERCIAL */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <span className="font-black text-xs uppercase text-amber-900 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-amber-600" /> Comercial
                </span>
                <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-bold">3 Propostas</span>
              </div>
              <p className="text-xs text-gray-600">
                Concessão estratégica de incentivos e campanhas de giro rápido para itens em janela crítica.
              </p>
              <button
                onClick={() => {
                  triggerAutoAcaoMelhoriaPreventiva({
                    processo: 'Gestão FEFO',
                    indicador: 'Aceleração de Giro Comercial',
                    tendenciaProjecao: 'Desaceleração de vendas em latas 269ml nas últimas 2 semanas',
                    recomendacaoSugerida: 'Criar preço promocional para redes parceiras de hipermercados',
                    areaRlp: 'Comercial',
                    isRlp: true
                  });
                  alert('✅ Ação RLP Comercial publicada com sucesso!');
                }}
                className="w-full py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs rounded border border-amber-200 cursor-pointer text-center"
              >
                Gerar Ação Comercial
              </button>
            </div>

            {/* PLANEJAMENTO */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <span className="font-black text-xs uppercase text-sky-900 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-sky-600" /> Planejamento
                </span>
                <span className="text-[10px] bg-sky-50 text-sky-700 px-2 py-0.5 rounded font-bold">1 Proposta</span>
              </div>
              <p className="text-xs text-gray-600">
                Ajuste de volume de recebimento de fábrica e calibração da cobertura máxima em dias de estoque.
              </p>
              <button
                onClick={() => {
                  triggerAutoAcaoMelhoriaPreventiva({
                    processo: 'Gestão de Capacidade',
                    indicador: 'Ajuste de Cobertura de Estoque',
                    tendenciaProjecao: 'Capacidade ocupada em 94% com acúmulo de paletes de giro lento',
                    recomendacaoSugerida: 'Postergar em 5 dias o recebimento de lote excedente de fábrica',
                    areaRlp: 'Planejamento',
                    isRlp: true
                  });
                  alert('✅ Ação RLP Planejamento publicada com sucesso!');
                }}
                className="w-full py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold text-xs rounded border border-sky-200 cursor-pointer text-center"
              >
                Gerar Ação Planejamento
              </button>
            </div>

            {/* OPERAÇÃO */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <span className="font-black text-xs uppercase text-emerald-900 flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-emerald-600" /> Operação
                </span>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold">2 Propostas</span>
              </div>
              <p className="text-xs text-gray-600">
                Rotina acelerada de reabastecimento de picking e auditorias de conferência semáforo.
              </p>
              <button
                onClick={() => {
                  triggerAutoAcaoMelhoriaPreventiva({
                    processo: 'Estoque x Picking',
                    indicador: 'Repick Acelerado FEFO',
                    tendenciaProjecao: 'Lotes mais antigos retidos no bloco A3 sem transferência para o picking',
                    recomendacaoSugerida: 'Realizar movimentação emergencial de 120 caixas para a frente de picking',
                    areaRlp: 'Operação',
                    isRlp: true
                  });
                  alert('✅ Ação RLP Operação publicada com sucesso!');
                }}
                className="w-full py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded border border-emerald-200 cursor-pointer text-center"
              >
                Gerar Ação Operação
              </button>
            </div>
          </div>

          {/* HISTÓRICO DE ACORDOS RLP */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
            <h3 className="font-sans font-black text-xs uppercase text-[#032b5e] tracking-wider">
              Acordos Firmados nas Reuniões Semanal de RLP
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse font-sans text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-gray-200 text-left text-[9px] font-black uppercase text-gray-600 tracking-wider">
                    <th className="p-3">Data Reunião</th>
                    <th className="p-3">Produtos / Lotes Impactados</th>
                    <th className="p-3 text-right">Qtd em Risco</th>
                    <th className="p-3 text-left">Estratégia Aprovada (RLP)</th>
                    <th className="p-3 text-left">Responsável</th>
                    <th className="p-3 text-center">Prazo</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rlpMeetings.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-slate-700">{m.data}</td>
                      <td className="p-3 font-bold text-slate-800">{m.produtos}</td>
                      <td className="p-3 text-right font-mono font-bold text-red-600">{m.quantidadeRisco} cx</td>
                      <td className="p-3 text-gray-700 font-medium">{m.estrategia}</td>
                      <td className="p-3 font-semibold text-slate-700">{m.responsavel}</td>
                      <td className="p-3 text-center font-mono">{m.prazo}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          m.status === 'Concluída' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {m.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'boarda3' && (
        <div id="quadro-acoes-container" className="flex flex-col gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center bg-slate-800 p-3 rounded-lg border border-slate-700">
            <span className="font-extrabold text-sm text-white uppercase tracking-wider flex items-center gap-2">
              🚨 QUADRO EXECUTIVO DE AÇÕES CORRETIVAS E PREVENTIVAS
            </span>
            <button
              onClick={handleExportQuadroAcoesImagem}
              className="bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-[11px] uppercase tracking-wider px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-xs cursor-pointer border-none"
            >
              📸 Exportar Quadro como Imagem
            </button>
          </div>
          <A3BoardComponent user={user} empresa={empresa} dashboard="fefo" />
        </div>
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

      {/* RECONTAGEM MODAL */}
      {recontagemModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 flex flex-col gap-5 font-sans">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                  🔄
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">Realizar Recontagem / Correção</h3>
                  <p className="text-xs text-slate-400">Altere a quantidade ou validade recolhida para sobrescrever no sistema</p>
                </div>
              </div>
              <button
                onClick={() => setRecontagemModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium">
              ⚠️ <strong className="font-bold">Aviso de Sobrescrita:</strong> Ao salvar, esta recontagem irá substituir o registro anterior do produto <strong>{recontagemModal.codigo}</strong> sem duplicar itens ou somar valores.
            </div>

            <div className="grid grid-cols-1 gap-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  SKU / Produto
                </label>
                <input
                  type="text"
                  disabled
                  value={`[${recontagemModal.codigo}] ${recontagemModal.descricao}`}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Nova Quantidade (Caixas / Itens)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={recontagemModal.quantidade}
                    onChange={(e) => setRecontagemModal({ ...recontagemModal, quantidade: Math.max(1, Number(e.target.value)) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-extrabold text-sm focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Nova Data de Validade
                  </label>
                  <input
                    type="text"
                    placeholder="YYYY-MM-DD ou DD/MM/AAAA"
                    value={recontagemModal.novaValidade}
                    onChange={(e) => setRecontagemModal({ ...recontagemModal, novaValidade: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-extrabold text-sm focus:border-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Localização no Armazém
                  </label>
                  <select
                    value={recontagemModal.localizacao}
                    onChange={(e) => setRecontagemModal({ ...recontagemModal, localizacao: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium focus:border-amber-500 focus:outline-hidden"
                  >
                    <option value="central">Estoque Central</option>
                    <option value="picking">Picking de Separação</option>
                    <option value="pnc">Área 6 (PNC - Produtos Não Conformes)</option>
                    <option value="repack">Área Repack</option>
                    <option value="pulmao">Área 5 (Pulmão)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Rua / Bloco
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: A4, B2, A1-03"
                    value={recontagemModal.bloco}
                    onChange={(e) => setRecontagemModal({ ...recontagemModal, bloco: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-bold focus:border-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end items-center gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRecontagemModal(null)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveRecontagem}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-black text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-md flex items-center gap-1.5"
              >
                💾 Salvar Recontagem (Sobrescrever)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SOP BANNER VIEWER */}
      {showSopViewer && (
        <SopBannerViewer
          operation="fefo"
          operationName="FEFO (Validades)"
        />
      )}

      {/* DEDICATED ACTION MODAL (FILTERED EXCLUSIVELY FOR FEFO) */}
      <IndicatorActionModal
        isOpen={isActionModalOpen}
        onClose={() => setIsActionModalOpen(false)}
        indicatorTitle="Gestão FEFO"
        indicatorSubtitle="Visualizando e gerenciando apenas os planos de ação e contramedidas 5W2H do controle de FEFO e Validades."
        indicatorBadge="FEFO DPO"
        allowedProcessos={['Gestão FEFO', 'FEFO', 'Validades', 'Vencimento', 'Lotes']}
        defaultProcesso="Gestão FEFO"
        defaultIndicador="Aderência FEFO e Risco de Shelf Life"
        defaultMeta="≥ 98%"
        user={user}
      />

    </div>
  );
}
