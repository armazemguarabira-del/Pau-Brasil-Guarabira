import React, { useState, useEffect } from 'react';
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
import { motion, AnimatePresence } from 'motion/react';
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
  Radio
} from 'lucide-react';
import { collection, query, where, addDoc, updateDoc, deleteDoc, doc, orderBy, onSnapshot } from 'firebase/firestore';
import { db, isCustomFirebaseConnected } from '../firebase';
import { fetchComCache } from '../utils/fetchComCache';

const getRoleLabel = (role?: string) => {
  if (!role) return '';
  const roles = role.split(',');
  const mapped = roles.map(r => {
    switch (r.trim()) {
      case 'repack': return 'Operação Repack';
      case 'despejo': return 'Operação Despejo';
      case 'armazem': return 'Operação EFC / EFD';
      case 'quebras': return 'Operação Quebras';
      case 'validades': return 'Operação Validade';
      case 'refugo': return 'Operação Retorno de Rota';
      case 'empilhador': return 'Operação Picking';
      case 'conferente': return 'Operação Conferênte';
      case 'controle': return 'Supervisor Controle';
      case 'admin': return 'Administrador';
      default: return r;
    }
  });
  return mapped.join(', ');
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Bom dia';
  if (hour >= 12 && hour < 18) return 'Boa tarde';
  return 'Boa noite';
};

const getRoleTip = (role?: string) => {
  if (!role) return 'Siga os procedimentos operacionais padrão de segurança durante todas as atividades do turno.';
  
  switch (role) {
    case 'repack':
      return 'Foco na produtividade do Repack, recuperação de vasilhames e conformidade com as metas do turno.';
    case 'despejo':
      return 'Garantindo precisão no lançamento de caixas e garrafas com segurança no processo de descarte de líquidos.';
    case 'armazem':
      return 'Controle rigoroso de posições de estoque, endereçamento correto e otimização das contagens cíclicas.';
    case 'quebras':
      return 'Atenção máxima na detecção, contenção e prevenção de avarias físicas nas ruas de estoque.';
    case 'validades':
      return 'Monitoramento constante de vencimentos para garantir o giro ideal de produtos via critério FEFO.';
    case 'refugo':
      return 'Auditoria detalhada de resíduos para identificar e recuperar embalagens e paletes aproveitáveis.';
    case 'empilhador':
      return 'Operação ágil e segura com empilhadeira. Respeite os limites de velocidade e diretrizes de picking.';
    case 'conferente':
      return 'Auditoria precisa e conferência rigorosa de pallets para garantir um fluxo de expedição sem divergências.';
    case 'controle':
      return 'Gestão centralizada de operadores, liberação de turnos e garantia dos padrões operacionais.';
    case 'admin':
      return 'Acesso mestre às configurações globais do sistema, credenciais de banco e chaves de integração.';
    default:
      return 'Siga os procedimentos operacionais padrão de segurança durante todas as atividades do turno.';
  }
};

interface DashboardOverviewProps {
  user: Usuario;
  empresa: Empresa | null;
  onNavigate: (tabId: string) => void;
  kpiStats: {
    usuarios: number;
    modulos: number;
    docsHoje: number;
    alertasFefo: number;
  };
}

export default function DashboardOverview({
  user,
  empresa,
  onNavigate,
  kpiStats
}: DashboardOverviewProps) {
  const [pushStatus, setPushStatus] = useState<string>('default');
  
  // Real-time collection list states
  const [repackList, setRepackList] = useState<RepackRow[]>([]);
  const [despejoList, setDespejoList] = useState<DespejoRow[]>([]);
  const [quebrasList, setQuebrasList] = useState<QuebraRow[]>([]);
  const [validadesList, setValidadesList] = useState<ValidadeRow[]>([]);
  const [armazemList, setArmazemList] = useState<ArmazemRow[]>([]);
  const [blitzList, setBlitzList] = useState<BlitzRefugoRow[]>([]);
  const [tarefasList, setTarefasList] = useState<Tarefa[]>([]);
  const [usuariosList, setUsuariosList] = useState<any[]>([]);

  // Action Plans states
  const [acoesList, setAcoesList] = useState<any[]>([]);
  const [colaboradoresList, setColaboradoresList] = useState<any[]>([]);
  const [activeActionTab, setActiveActionTab] = useState<'colaborador' | 'supervisor'>('colaborador');
  const [selectedColabId, setSelectedColabId] = useState('');
  const [newActionTitle, setNewActionTitle] = useState('');
  const [newActionDesc, setNewActionDesc] = useState('');
  const [creatingAction, setCreatingAction] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [alertFilter, setAlertFilter] = useState<'all' | 'pending' | 'treated'>('pending');

  // Toggle mode state: CX (Caixas) vs HE (Hectolitros)
  const [viewUnit, setViewUnit] = useState<'cx' | 'he'>(() => {
    return (localStorage.getItem('dashboard_view_unit') as 'cx' | 'he') || 'cx';
  });

  useEffect(() => {
    localStorage.setItem('dashboard_view_unit', viewUnit);
  }, [viewUnit]);

  // Local derived dynamic KPI stats
  const [liveKpiStats, setLiveKpiStats] = useState({
    usuarios: kpiStats.usuarios,
    modulos: kpiStats.modulos,
    docsHoje: kpiStats.docsHoje,
    alertasFefo: kpiStats.alertasFefo,
  });

  // Dynamic dynamic logs feed
  const [liveLogs, setLiveLogs] = useState<Array<{ text: string, time: string, type: string }>>([]);

  const [recentLogs] = useState<Array<{ text: string, time: string, type: string }>>([
    { text: 'Ozenildo iniciou a reembalagem de LATA 350.', time: 'há 4 min', type: 'repack' },
    { text: 'Conferente Matheus atribuiu Tarefa #34 para Paulo Pereira.', time: 'há 12 min', type: 'conferente' },
    { text: 'Novo registro de Validade cadastrado: Brahma 600ml ( Central ).', time: 'há 45 min', type: 'validades' },
    { text: 'CarregamentoOXO0542 finalizado por Marivaldo dentro da Janela ( 12:45 ).', time: 'há 2 horas', type: 'armazem' },
  ]);

  const logIconMap: Record<string, React.ReactNode> = {
    repack: <RefreshCw className="w-4 h-4 text-[#f5a623]" />,
    conferente: <ClipboardCheck className="w-4 h-4 text-[#3b82f6]" />,
    validades: <Calendar className="w-4 h-4 text-purple-400" />,
    armazem: <Truck className="w-4 h-4 text-sky-400" />,
  };

  // Helper to calculate remaining validity days
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
      const diffTime = exp.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch (e) {
      return 999;
    }
  };

  // Helper to format friendly relative time
  const getRelativeTimeString = (timestamp: number, isToday?: boolean) => {
    if (!timestamp) return 'Agora mesmo';
    const now = Date.now();
    const diff = now - timestamp;

    // Slight future clock drift (up to 15 min) treated as "Agora mesmo"
    if (diff < 0 && Math.abs(diff) <= 15 * 60000) {
      return 'Agora mesmo';
    }

    if (diff < 0) {
      return 'Agendado';
    }

    if (diff < 60000) return 'Agora mesmo';
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `há ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `há ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'há 1 dia';
    return `há ${days} dias`;
  };

  const getLocalTodayISO = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const getItemDateInfo = (item: any) => {
    if (!item) return { isoDate: '', timestamp: 0, isToday: false };
    let isoDate = '';
    let timestamp = 0;

    const todayISO = getLocalTodayISO();
    const now = Date.now();

    // 1. Check data / dataISO for date string
    if (item.dataISO && typeof item.dataISO === 'string') {
      const parts = item.dataISO.split('T')[0].split('-');
      if (parts.length === 3) {
        isoDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
    }
    if (!isoDate && item.data && typeof item.data === 'string') {
      const parts = item.data.split('/');
      if (parts.length === 3) {
        isoDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }

    // 2. Check explicit ISO timestamp fields (_criadoEm, finalizadoEm, etc.)
    const isoCandidate = item.finalizadoEm || item.iniciadoEm || item._criadoEm || item.criadoEm || item.cadastradoEm || item.dataCriacaoISO;
    if (isoCandidate && typeof isoCandidate === 'string' && isoCandidate.includes('T')) {
      const dt = new Date(isoCandidate);
      if (!isNaN(dt.getTime())) {
        timestamp = dt.getTime();
        if (!isoDate) {
          const y = dt.getFullYear();
          const m = String(dt.getMonth() + 1).padStart(2, '0');
          const day = String(dt.getDate()).padStart(2, '0');
          isoDate = `${y}-${m}-${day}`;
        }
      }
    }

    // 3. Fallback timestamp if not explicitly set or to refine shift operational time
    if (isoDate) {
      let timeStr = item.fim || item.inicio || item.hora || '12:00';
      if (timeStr.length === 5) timeStr += ':00';
      const dt = new Date(`${isoDate}T${timeStr}`);
      if (!isNaN(dt.getTime())) {
        let opTimestamp = dt.getTime();
        // If operation time string (e.g. 21:53) produces a future time under today's date during early morning hours,
        // it belongs to the night shift of yesterday evening.
        if (opTimestamp > now + 30 * 60000 && isoDate === todayISO) {
          opTimestamp -= 24 * 60 * 60000;
        }
        if (!timestamp) {
          timestamp = opTimestamp;
        }
      } else if (!timestamp) {
        const dtFallback = new Date(`${isoDate}T12:00:00`);
        if (!isNaN(dtFallback.getTime())) {
          timestamp = dtFallback.getTime();
        }
      }
    }

    const isToday = isoDate === todayISO;

    return { isoDate, timestamp, isToday };
  };

  const [ticker, setTicker] = useState(0);

  // Live timer ticker to update relative time strings ("Agora mesmo", "há 1 min", etc.) every 10 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setTicker(t => t + 1);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // 1. Establish Real-Time Subscriptions & LocalStorage Synchronization
  useEffect(() => {
    const companyId = empresa?.id || 'demo';

    const carregarLocal = () => {
      const localRepack = localStorage.getItem(`repack_rows_${companyId}`);
      if (localRepack) setRepackList(JSON.parse(localRepack));

      const localDespejo = localStorage.getItem(`despejo_rows_${companyId}`);
      if (localDespejo) setDespejoList(JSON.parse(localDespejo));

      const localQuebras = localStorage.getItem(`quebras_rows_${companyId}`) || localStorage.getItem(`quebras_list_${companyId}`);
      if (localQuebras) setQuebrasList(JSON.parse(localQuebras));

      const localValidades = localStorage.getItem(`validades_rows_${companyId}`);
      if (localValidades) setValidadesList(JSON.parse(localValidades));

      const localArmazem = localStorage.getItem(`armazem_rows_${companyId}`);
      if (localArmazem) setArmazemList(JSON.parse(localArmazem));

      const localBlitz = localStorage.getItem(`blitz_rows_${companyId}`);
      if (localBlitz) setBlitzList(JSON.parse(localBlitz));

      const localTarefas = localStorage.getItem(`tarefas_rows_${companyId}`) || localStorage.getItem(`tasks_${companyId}`);
      if (localTarefas) setTarefasList(JSON.parse(localTarefas));

      const localAcoes = localStorage.getItem(`acoes_rows_${companyId}`);
      if (localAcoes) setAcoesList(JSON.parse(localAcoes));
    };

    // Load local storage cache immediately
    carregarLocal();

    // Event listeners for instant local changes
    window.addEventListener('storage', carregarLocal);
    window.addEventListener('app_data_updated', carregarLocal);
    window.addEventListener('local_data_changed', carregarLocal);
    const localInterval = setInterval(carregarLocal, 3000);

    if (!db || !companyId) {
      return () => {
        window.removeEventListener('storage', carregarLocal);
        window.removeEventListener('app_data_updated', carregarLocal);
        window.removeEventListener('local_data_changed', carregarLocal);
        clearInterval(localInterval);
      };
    }

    // Set up Firestore real-time onSnapshot listeners
    const unsubs: Array<() => void> = [];

    try {
      unsubs.push(onSnapshot(query(collection(db, 'repack'), where('empresaId', '==', companyId)), snap => {
        setRepackList(snap.docs.map(doc => ({ _docId: doc.id, ...doc.data() } as any)));
      }, err => console.warn('Repack onSnapshot warn:', err)));

      unsubs.push(onSnapshot(query(collection(db, 'despejo'), where('empresaId', '==', companyId)), snap => {
        setDespejoList(snap.docs.map(doc => ({ _docId: doc.id, ...doc.data() } as any)));
      }, err => console.warn('Despejo onSnapshot warn:', err)));

      unsubs.push(onSnapshot(query(collection(db, 'quebras'), where('empresaId', '==', companyId)), snap => {
        setQuebrasList(snap.docs.map(doc => ({ _docId: doc.id, ...doc.data() } as any)));
      }, err => console.warn('Quebras onSnapshot warn:', err)));

      unsubs.push(onSnapshot(query(collection(db, 'validades'), where('empresaId', '==', companyId)), snap => {
        setValidadesList(snap.docs.map(doc => ({ _docId: doc.id, ...doc.data() } as any)));
      }, err => console.warn('Validades onSnapshot warn:', err)));

      unsubs.push(onSnapshot(query(collection(db, 'armazem'), where('empresaId', '==', companyId)), snap => {
        setArmazemList(snap.docs.map(doc => ({ _docId: doc.id, ...doc.data() } as any)));
      }, err => console.warn('Armazem onSnapshot warn:', err)));

      unsubs.push(onSnapshot(query(collection(db, 'blitz_refugo'), where('empresaId', '==', companyId)), snap => {
        setBlitzList(snap.docs.map(doc => ({ _docId: doc.id, ...doc.data() } as any)));
      }, err => console.warn('Blitz onSnapshot warn:', err)));

      unsubs.push(onSnapshot(query(collection(db, 'tarefas'), where('empresaId', '==', companyId)), snap => {
        setTarefasList(snap.docs.map(doc => ({ _docId: doc.id, ...doc.data() } as any)));
      }, err => console.warn('Tarefas onSnapshot warn:', err)));

      unsubs.push(onSnapshot(query(collection(db, 'usuarios'), where('empresaId', '==', companyId)), snap => {
        setUsuariosList(snap.docs.map(doc => ({ _docId: doc.id, ...doc.data() } as any)));
      }, err => console.warn('Usuarios onSnapshot warn:', err)));

      unsubs.push(onSnapshot(query(collection(db, 'acoes'), where('empresaId', '==', companyId)), snap => {
        setAcoesList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
      }, err => console.warn('Acoes onSnapshot warn:', err)));

      unsubs.push(onSnapshot(query(collection(db, 'colaboradores'), where('empresaId', '==', companyId)), snap => {
        setColaboradoresList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
      }, err => console.warn('Colaboradores onSnapshot warn:', err)));
    } catch (e) {
      console.error("Error setting up onSnapshot listeners:", e);
    }

    return () => {
      window.removeEventListener('storage', carregarLocal);
      window.removeEventListener('app_data_updated', carregarLocal);
      window.removeEventListener('local_data_changed', carregarLocal);
      clearInterval(localInterval);
      unsubs.forEach(unsub => unsub());
    };
  }, [empresa?.id]);

  // 2. Synthesize Real-Time Statistics & Dynamic Logs Feed
  useEffect(() => {
    const isAnyLoaded = 
      repackList.length > 0 || 
      despejoList.length > 0 || 
      quebrasList.length > 0 || 
      validadesList.length > 0 || 
      armazemList.length > 0 || 
      blitzList.length > 0 || 
      tarefasList.length > 0;

    if (!isAnyLoaded) {
      // Use fallback properties
      setLiveKpiStats({
        usuarios: kpiStats.usuarios,
        modulos: kpiStats.modulos,
        docsHoje: kpiStats.docsHoje,
        alertasFefo: kpiStats.alertasFefo,
      });
      return;
    }

    // A. Count Critical Expirations (Vence em <= 30 dias)
    const alertasCount = validadesList.filter(v => getDaysRemaining(v.validade) <= 30).length;

    // B. Count Shift Submissions (Created / Dated Today)
    const repackToday = repackList.filter(r => getItemDateInfo(r).isToday).length;
    const despejoToday = despejoList.filter(d => getItemDateInfo(d).isToday).length;
    const quebrasToday = quebrasList.filter(q => getItemDateInfo(q).isToday).length;
    const validadesToday = validadesList.filter(v => getItemDateInfo(v).isToday).length;
    const armazemToday = armazemList.filter(a => getItemDateInfo(a).isToday).length;
    const blitzToday = blitzList.filter(b => getItemDateInfo(b).isToday).length;
    const tarefasToday = tarefasList.filter(t => getItemDateInfo(t).isToday).length;

    const totalDocsHoje = repackToday + despejoToday + quebrasToday + validadesToday + armazemToday + blitzToday + tarefasToday;

    setLiveKpiStats({
      usuarios: usuariosList.length > 0 ? usuariosList.length : kpiStats.usuarios,
      modulos: kpiStats.modulos,
      alertasFefo: alertasCount,
      docsHoje: totalDocsHoje,
    });

    // C. Synthesize feed logs from real data
    const allLogs: Array<{ text: string, time: string, type: string, timestamp: number, isToday: boolean }> = [];

    repackList.forEach(r => {
      const info = getItemDateInfo(r);
      if (info.timestamp) {
        allLogs.push({
          text: `${r.operador || 'Operador'} iniciou a reembalagem de ${r.quantidade} cx de ${r.embalagem}.`,
          time: getRelativeTimeString(info.timestamp, info.isToday),
          type: 'repack',
          timestamp: info.timestamp,
          isToday: info.isToday
        });
      }
    });

    despejoList.forEach(d => {
      const info = getItemDateInfo(d);
      if (info.timestamp) {
        allLogs.push({
          text: `${d.operador || 'Operador'} finalizou despejo de ${d.quantidade} cx de ${d.embalagem}.`,
          time: getRelativeTimeString(info.timestamp, info.isToday),
          type: 'repack',
          timestamp: info.timestamp,
          isToday: info.isToday
        });
      }
    });

    quebrasList.forEach(q => {
      const info = getItemDateInfo(q);
      if (info.timestamp) {
        allLogs.push({
          text: `Registro de Quebra: SKU ${q.codProduto} - ${q.descricao} (${q.quantidade} un) na área ${q.area}.`,
          time: getRelativeTimeString(info.timestamp, info.isToday),
          type: 'repack',
          timestamp: info.timestamp,
          isToday: info.isToday
        });
      }
    });

    validadesList.forEach(v => {
      const info = getItemDateInfo(v);
      if (info.timestamp) {
        allLogs.push({
          text: `Novo registro de Validade cadastrado: ${v.descricao} (vence em ${v.validade}).`,
          time: getRelativeTimeString(info.timestamp, info.isToday),
          type: 'validades',
          timestamp: info.timestamp,
          isToday: info.isToday
        });
      }
    });

    armazemList.forEach(a => {
      const info = getItemDateInfo(a);
      if (info.timestamp) {
        allLogs.push({
          text: `Operação ${a.operacao} (${a.placa}) finalizada por ${a.empilhador} dentro da janela (${a.inicio} - ${a.fim}).`,
          time: getRelativeTimeString(info.timestamp, info.isToday),
          type: 'armazem',
          timestamp: info.timestamp,
          isToday: info.isToday
        });
      }
    });

    blitzList.forEach(b => {
      const info = getItemDateInfo(b);
      if (info.timestamp) {
        allLogs.push({
          text: `Blitz de Refugo realizada na placa ${b.placa} com ajudante ${b.ajudante}.`,
          time: getRelativeTimeString(info.timestamp, info.isToday),
          type: 'armazem',
          timestamp: info.timestamp,
          isToday: info.isToday
        });
      }
    });

    tarefasList.forEach(t => {
      const info = getItemDateInfo(t);
      if (info.timestamp) {
        const isDone = t.status === 'done' || (t.status as string) === 'concluida';
        const isInProgress = t.status === 'in_progress';
        const statusLabel = isDone ? 'finalizada' : (isInProgress ? 'em andamento' : 'pendente');
        
        let opName = t.tipoOperacao || '';
        if (!opName) {
          const descLower = (t.descricao || '').toLowerCase();
          if (descLower.includes('carregamento') || t.codigo?.toString().startsWith('3')) {
            opName = 'Carregamento';
          } else {
            opName = 'Descarregamento';
          }
        }
        
        const user = t.operador || t.conferente || 'operador';
        const desc = t.descricao || `Placa #${t.codigo}`;
        
        let janelaStr = '';
        if (t.iniciadoEm || t.finalizadoEm) {
          const startH = t.iniciadoEm ? new Date(t.iniciadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
          const endH = t.finalizadoEm ? new Date(t.finalizadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
          if (startH && endH) {
            janelaStr = ` dentro da janela (${startH} - ${endH})`;
          } else if (endH) {
            janelaStr = ` às ${endH}`;
          }
        }

        allLogs.push({
          text: `Operação ${opName} (${desc}) ${statusLabel} por ${user}${janelaStr}.`,
          time: getRelativeTimeString(info.timestamp, info.isToday),
          type: 'conferente',
          timestamp: info.timestamp,
          isToday: info.isToday
        });
      }
    });

    // Sort: Newest actual activity timestamp first
    allLogs.sort((a, b) => {
      if (b.timestamp !== a.timestamp) {
        return b.timestamp - a.timestamp;
      }
      return a.text.localeCompare(b.text);
    });

    // Filter only Descarregamento and Carregamento operations
    const opsLogs = allLogs.filter(l => {
      const lower = l.text.toLowerCase();
      return lower.includes('descarregamento') || lower.includes('carregamento');
    });

    // Slice to the last 5 records as requested
    const topLogs = (opsLogs.length > 0 ? opsLogs : allLogs).slice(0, 5).map(l => ({
      text: l.text,
      time: l.time,
      type: l.type
    }));

    if (topLogs.length > 0) {
      setLiveLogs(topLogs);
    } else {
      setLiveLogs([]);
    }

  }, [repackList, despejoList, quebrasList, validadesList, armazemList, blitzList, tarefasList, usuariosList, kpiStats, ticker]);

  useEffect(() => {
    if ('Notification' in window) {
      setPushStatus(Notification.permission);
    }
  }, []);

  const requestPushPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setPushStatus(permission);
      if (permission === 'granted') {
        new Notification('Armazem Fácil Relatórios', {
          body: 'Notificações push ativadas com sucesso! Você receberá atualizações das tarefas em tempo real.',
          icon: '/favicon.ico'
        });
      }
    } else {
      alert('Seu navegador não oferece suporte para notificações push nativas.');
    }
  };

  const handleCreateAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;
    if (!selectedColabId) {
      setErrorMsg('Por favor, selecione um colaborador.');
      return;
    }
    if (!newActionTitle.trim() || !newActionDesc.trim()) {
      setErrorMsg('Preencha o título e a descrição da ação.');
      return;
    }

    setCreatingAction(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // Look up in colaboradores or fallback to usuarios list
      let colabName = 'Colaborador';
      let colabUid = selectedColabId;
      
      const foundInColab = colaboradoresList.find(c => c.id === selectedColabId || c.uid === selectedColabId);
      if (foundInColab) {
        colabName = foundInColab.nome || 'Colaborador';
        colabUid = foundInColab.uid || foundInColab.id;
      } else {
        const foundInUser = usuariosList.find(u => u._docId === selectedColabId || u.uid === selectedColabId);
        if (foundInUser) {
          colabName = foundInUser.nome || 'Colaborador';
          colabUid = foundInUser.uid || foundInUser._docId;
        }
      }

      const companyId = empresa?.id || 'demo';
      const now = new Date().toISOString();
      const limit = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      await addDoc(collection(db, 'acoes'), {
        empresaId: companyId,
        colaboradorId: colabUid,
        colaboradorNome: colabName,
        titulo: newActionTitle.trim(),
        descricao: newActionDesc.trim(),
        tipo: 'colaborador',
        status: 'pendente',
        criadoEm: now,
        limiteEm: limit,
        criadoPorNome: user.nome || 'Supervisor',
        criadoPorUid: user.uid
      });

      setSuccessMsg('Plano de ação criado com sucesso!');
      setNewActionTitle('');
      setNewActionDesc('');
      setSelectedColabId('');
      
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Erro ao criar plano de ação: ' + err.message);
    } finally {
      setCreatingAction(false);
    }
  };

  const handleConcluirAction = async (actionId: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'acoes', actionId), {
        status: 'concluido',
        resolvidaEm: new Date().toISOString()
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAction = async (actionId: string) => {
    if (!db) return;
    if (!window.confirm('Deseja realmente excluir esta ação?')) return;
    try {
      await deleteDoc(doc(db, 'acoes', actionId));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveTratativa = async (type: 'repack' | 'despejo', docId: string, text: string) => {
    if (!text.trim()) {
      alert('Por favor, digite uma descrição para a tratativa.');
      return;
    }
    const companyId = empresa?.id || 'demo';
    try {
      if (db) {
        await updateDoc(doc(db, type, docId), {
          tratativaGestor: text.trim(),
          tratativaData: new Date().toISOString(),
          tratativaResponsavel: user.nome || 'Gestor'
        });
      } else {
        // standalone fallback
        if (type === 'repack') {
          const updated = repackList.map(r => r._docId === docId ? {
            ...r,
            tratativaGestor: text.trim(),
            tratativaData: new Date().toISOString(),
            tratativaResponsavel: user.nome || 'Gestor'
          } : r);
          setRepackList(updated);
          localStorage.setItem(`repack_rows_${companyId}`, JSON.stringify(updated));
        } else {
          const updated = despejoList.map(d => d._docId === docId ? {
            ...d,
            tratativaGestor: text.trim(),
            tratativaData: new Date().toISOString(),
            tratativaResponsavel: user.nome || 'Gestor'
          } : d);
          setDespejoList(updated);
          localStorage.setItem(`despejo_rows_${companyId}`, JSON.stringify(updated));
        }
      }
    } catch (e: any) {
      alert('Erro ao salvar tratativa: ' + e.message);
    }
  };

  const repackAlerts = repackList
    .filter(r => r.resultado && r.resultado.includes('ACIMA'))
    .map(r => ({ ...r, _type: 'repack' as const }));

  const despejoAlerts = despejoList
    .filter(d => d.resultado && d.resultado.includes('ACIMA'))
    .map(d => ({ ...d, _type: 'despejo' as const }));

  const allUnmetGoals = [...repackAlerts, ...despejoAlerts].sort((a, b) => {
    const dateA = a._criadoEm ? new Date(a._criadoEm).getTime() : (a.dataISO ? new Date(a.dataISO + 'T00:00:00').getTime() : 0);
    const dateB = b._criadoEm ? new Date(b._criadoEm).getTime() : (b.dataISO ? new Date(b.dataISO + 'T00:00:00').getTime() : 0);
    return dateB - dateA;
  });

  const unmetGoalsCount = allUnmetGoals.length;
  const unmetGoalsPendingCount = allUnmetGoals.filter(a => !a.tratativaGestor).length;
  const unmetGoalsTreatedCount = allUnmetGoals.filter(a => !!a.tratativaGestor).length;

  const filteredAlerts = allUnmetGoals.filter(alert => {
    if (alertFilter === 'pending') return !alert.tratativaGestor;
    if (alertFilter === 'treated') return !!alert.tratativaGestor;
    return true;
  });

  const [showSyncBanner, setShowSyncBanner] = useState(true);

  return (
    <div className="flex flex-col gap-6">
      
      {/* ── HEADER INTRO BLOCK ── */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch gap-6 p-6 rounded-2xl relative overflow-hidden border border-slate-100 bg-white shadow-xs">
        <div className="absolute right-[-20px] bottom-[-20px] text-9xl select-none opacity-[0.01] pointer-events-none">
          {user.papel === 'repack' ? '🛠' : user.papel === 'despejo' ? '🗑' : user.papel === 'armazem' ? '📦' : '🚜'}
        </div>
        
        <div className="flex flex-col md:flex-row gap-5 items-center flex-1">
          <div className="flex-1 min-w-0">
            <span className="text-xs text-slate-400 font-medium">
              Bem vindo ao
            </span>
            <h1 className="font-black text-2xl sm:text-3xl tracking-tight text-slate-800 leading-tight mt-0.5">
              Armazém Fácil <span className="text-blue-600">Relatórios</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Agilidade operacional para <span className="text-blue-600 font-semibold">toda a operação.</span>
            </p>
            <div className="w-12 h-0.5 bg-blue-500 rounded-full mt-3" />
          </div>
        </div>

        {/* Info lateral & Chave de Visualização (CX / HE) */}
        <div className="flex flex-wrap items-center justify-end gap-4 pl-0 lg:pl-6 border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 shrink-0 min-w-[280px]">
          
          {/* Visualização Unit Toggle Key */}
          <div className="flex flex-col items-start gap-1">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">VISUALIZAÇÃO</span>
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/60 h-[28px] w-[96px]">
              <button
                type="button"
                onClick={() => setViewUnit('cx')}
                className={`flex-1 rounded-md font-sans font-black text-[10px] transition-all border-none cursor-pointer h-full flex items-center justify-center ${viewUnit === 'cx' ? 'bg-[#032b5e] text-white shadow-sm' : 'text-slate-400 hover:text-[#032b5e] bg-transparent'}`}
              >
                CX
              </button>
              <button
                type="button"
                onClick={() => setViewUnit('he')}
                className={`flex-1 rounded-md font-sans font-black text-[10px] transition-all border-none cursor-pointer h-full flex items-center justify-center ${viewUnit === 'he' ? 'bg-[#032b5e] text-white shadow-sm' : 'text-slate-400 hover:text-[#032b5e] bg-transparent'}`}
              >
                HE
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100/80">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold text-xs font-mono shrink-0">
              {user.nome ? user.nome.substring(0, 2).toUpperCase() : 'US'}
            </div>
            <div className="min-w-0">
              <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-bold">Colaborador Ativo</span>
              <span className="text-slate-700 font-bold text-xs block truncate">
                {user.nome}
              </span>
              <span className="text-[9px] font-medium text-slate-500 block">
                {getRoleLabel(user.papel)}
              </span>
            </div>
          </div>
        </div>
      </div>





      {/* ── KPI HIGHLIGHT CARDS (Only in Controle/Supervisor mode) ── */}
      {user.isControle && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3.5">
          
          <div className="g-card p-3.5 md:p-4 text-center flex flex-col justify-center items-center">
            <Users className="w-5 h-5 text-indigo-400 mb-1.5" />
            <span className="font-sans font-black text-fluid-kpi text-snow">{liveKpiStats.usuarios}</span>
            <span className="text-[#6a7d92] text-[9.5px] uppercase font-bold tracking-widest mt-1">Colaboradores</span>
            <span className="text-[8.5px] text-[#22c55e] mt-0.5">Sessões ativas</span>
          </div>

          <div className="g-card p-3.5 md:p-4 text-center flex flex-col justify-center items-center">
            <Layers className="w-5 h-5 text-[#22c55e] mb-1.5" />
            <span className="font-sans font-black text-fluid-kpi text-[#22c55e]">{kpiStatsPercent()}%</span>
            <span className="text-[#6a7d92] text-[9.5px] uppercase font-bold tracking-widest mt-1">Módulos Ativos</span>
            <span className="text-[8.5px] text-[#6a7d92] mt-0.5">{user.papel === 'admin' || user.papel === 'controle' || user.email === 'nixon.a.a100.NH@gmail.com' ? '6' : liveKpiStats.modulos} de 6</span>
          </div>

          <div className="g-card p-3.5 md:p-4 text-center flex flex-col justify-center items-center">
            <Calendar className="w-5 h-5 text-[#ef4444] mb-1.5" />
            <span className="font-sans font-black text-fluid-kpi text-[#ef4444]">{liveKpiStats.alertasFefo}</span>
            <span className="text-[#6a7d92] text-[9.5px] uppercase font-bold tracking-widest mt-1">Validades Críticas</span>
            <span className="text-[8.5px] text-[#ef4444] mt-0.5">Vence em ≤ 30 dias</span>
          </div>

          <div className="g-card p-3.5 md:p-4 text-center flex flex-col justify-center items-center">
            <ClipboardCheck className="w-5 h-5 text-[#3b82f6] mb-1.5" />
            <span className="font-sans font-black text-fluid-kpi text-[#3b82f6]">
              {viewUnit === 'cx' 
                ? liveKpiStats.docsHoje 
                : Math.round(liveKpiStats.docsHoje * 0.135 * 10) / 10
              }
            </span>
            <span className="text-[#6a7d92] text-[9.5px] uppercase font-bold tracking-widest mt-1">
              {viewUnit === 'cx' ? 'Lançamentos (CX)' : 'Volume (HE)'}
            </span>
            <span className="text-[8.5px] text-[#6a7d92] mt-0.5">
              {viewUnit === 'cx' ? 'Lançamentos hoje' : 'Hectolitros hoje'}
            </span>
          </div>

        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        
        {/* Real-time Operations Activity Feed */}
        <div className="g-card p-6 md:col-span-8 flex flex-col justify-between">
          <div>
            <h3 className="font-sans font-black text-sm tracking-widest text-[#f5a623] uppercase mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>📡 Atividades em Tempo Real</span>
                <span className="text-[9px] bg-[#032b5e]/80 text-white font-bold px-2 py-0.5 rounded uppercase">
                  {viewUnit === 'cx' ? 'CX' : 'HE'}
                </span>
              </div>
              <span className="text-[9px] bg-[#22c55e]/15 border border-[#22c55e]/25 text-[#22c55e] px-2 py-0.5 rounded-full font-sans tracking-wide">● Sincronizado</span>
            </h3>
            
            <div className="divide-y divide-[#1c2530] max-h-[500px] overflow-y-auto pr-1">
              {(liveLogs.length > 0 ? liveLogs : recentLogs).map((log, index) => (
                <div key={index} className="flex gap-3 py-3 items-start hover:bg-white/[0.02] transition-colors rounded-lg px-1">
                  <span className="bg-[#151b23] border border-[#222d3a] p-2 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5">
                    {logIconMap[log.type] || <Activity className="w-4 h-4 text-snow" />}
                  </span>
                  <div className="flex-1">
                    <p className="text-xs text-[#e8eef5] leading-relaxed font-medium">{log.text}</p>
                    <span className="text-[9.5px] text-[#6a7d92] mt-1 block font-semibold">{log.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Safety Standards Checklist Card */}
        <div className="g-card p-6 md:col-span-4 flex flex-col justify-between border-l-2 border-l-[#3b82f6]">
          <div>
            <h3 className="font-sans font-black text-sm tracking-widest text-[#3b82f6] uppercase mb-1">
              🚧 LEMBRETES DE SEGURANÇA
            </h3>
            <span className="text-[10px] text-[#6a7d92] tracking-wider uppercase font-semibold">Regras de Segurança de Corredor</span>
            
            <ul className="text-xs text-[#6a7d92] space-y-3.5 mt-5 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-[#3b82f6] text-sm">▶</span> <strong>Isolamento de Corredor:</strong> Sempre utilize cones ou fitas refletivas nas extremidades ao reabastecer.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#3b82f6] text-sm">▶</span> <strong>Velocidade Máxima:</strong> Limite de deslocamento da empilhadeira de no máximo 6 km/h.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#3b82f6] text-sm">▶</span> <strong>Janela de Horário:</strong> Registros fora de 07h-21h exigem observações pormenorizadas obrigatórias.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#3b82f6] text-sm">▶</span> <strong>Conflito Zero:</strong> Jamais movimente paletes enquanto pedestres estiverem transitando na zona amarela.
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-4 border-t border-[#1ca0d3]/10 flex flex-col gap-2">
            {user.isControle && (
              <div className="grid grid-cols-3 md:grid-cols-7 gap-1.5">
                <button 
                  onClick={() => onNavigate('repack-dashboard')}
                  className="text-center py-2.5 bg-[#f5a623]/10 hover:bg-[#f5a623]/20 text-[#f5a623] hover:text-white rounded-xl text-[8px] uppercase font-black tracking-wider border border-[#f5a623]/25 transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  📊 Repack
                </button>
                <button 
                  onClick={() => onNavigate('despejo-dashboard')}
                  className="text-center py-2.5 bg-red-500/10 hover:bg-red-500/20 text-[#ef4444] hover:text-white rounded-xl text-[8px] uppercase font-black tracking-wider border border-red-500/25 transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  📊 Despejo
                </button>
                <button 
                  onClick={() => onNavigate('logistica-dashboard')}
                  className="text-center py-2.5 bg-[#38bdf8]/10 hover:bg-[#38bdf8]/20 text-[#38bdf8] hover:text-white rounded-xl text-[8px] uppercase font-black tracking-wider border border-[#38bdf8]/25 transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  📊 EFC EFD
                </button>
                <button 
                  onClick={() => onNavigate('quebras-dashboard')}
                  className="text-center py-2.5 bg-[#ef4444]/10 hover:bg-[#ef4444]/20 text-[#ef4444] hover:text-white rounded-xl text-[8px] uppercase font-black tracking-wider border border-[#ef4444]/25 transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  📊 Quebras
                </button>
                <button 
                  onClick={() => onNavigate('fefo-dashboard')}
                  className="text-center py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-[#10b981] hover:text-white rounded-xl text-[8px] uppercase font-black tracking-wider border border-emerald-500/25 transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  📊 FEFO
                </button>
                <button 
                  onClick={() => onNavigate('picking-dashboard')}
                  className="text-center py-2.5 bg-[#f5a623]/10 hover:bg-[#f5a623]/20 text-[#f5a623] hover:text-white rounded-xl text-[8px] uppercase font-black tracking-wider border border-[#f5a623]/25 transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  📊 Picking
                </button>
              </div>
            )}

            {/* Dynamic Operator Shortcut or general supervisor fallback */}
            {user.isControle ? (
              <button 
                onClick={() => onNavigate('controle')}
                className="w-full text-center py-3 bg-[#3b82f6]/10 hover:bg-[#3b82f6]/20 text-[#3b82f6] hover:text-white rounded-xl text-xs uppercase font-black tracking-widest border border-[#3b82f6]/25 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                ⚙ Ir para Painel de Controle
              </button>
            ) : (
              (() => {
                const roles = (user.papel || '').split(',').map((s: string) => s.trim()).filter(Boolean);
                if (roles.length === 0) return null;
                
                return (
                  <div className="flex flex-col gap-2 w-full">
                    <span className="text-[10px] font-black text-[#6a7d92] uppercase tracking-wider mb-1 block">Acessos Rápidos da sua Matrícula:</span>
                    <div className="grid grid-cols-1 gap-2">
                      {roles.map((papel) => {
                        const tabId = papel === 'empilhador' ? 'empilhador' : papel;
                        const label = papel === 'repack' ? 'Operação Repack' :
                                      papel === 'despejo' ? 'Operação Despejo' :
                                      papel === 'armazem' ? 'Operação EFC / EFD' :
                                      papel === 'quebras' ? 'Operação Quebras' :
                                      papel === 'validades' ? 'Operação Validade' :
                                      papel === 'refugo' ? 'Operação Retorno de Rota' :
                                      papel === 'empilhador' ? 'Operação Picking' :
                                      papel === 'conferente' ? 'Operação Conferênte' :
                                      papel === 'controle' ? 'Supervisor Controle' : 'Minha Operação';
                        return (
                          <button 
                            key={papel}
                            onClick={() => onNavigate(tabId)}
                            className="w-full text-center py-3 bg-[#f5a623]/10 hover:bg-[#f5a623]/20 text-[#f5a623] hover:text-white rounded-xl text-xs uppercase font-black tracking-widest border border-[#f5a623]/25 transition-all cursor-pointer flex items-center justify-center gap-2"
                          >
                            🚀 Ir para {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </div>

      </div>

      {/* ── SEÇÃO GESTÃO DE ALERTAS E TRATATIVAS (Only for Gestores/Controle) ── */}
      {user.isControle && (
        <div className="bg-white border border-[#ef4444]/20 rounded-2xl p-6 shadow-xs flex flex-col gap-6" id="alertas-e-tratativas-secao">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h2 className="text-base font-black text-slate-800 flex items-center gap-2 uppercase tracking-wide">
                <span className="p-1.5 bg-[#ef4444]/10 text-[#ef4444] rounded-lg">⚠️</span>
                Gestão de Alertas e Tratativas de Produtividade
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Visualização de alertas gerados em tempo real quando as metas operacionais de Repack ou Despejo não são batidas. Aplique medidas de tratativa imediatas.
              </p>
            </div>
            
            {/* Filter controls */}
            <div className="flex bg-slate-100 p-1 rounded-xl self-start md:self-auto text-xs">
              <button
                type="button"
                onClick={() => setAlertFilter('all')}
                className={`px-3 py-1.5 font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer ${
                  alertFilter === 'all' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Todos ({unmetGoalsCount})
              </button>
              <button
                type="button"
                onClick={() => setAlertFilter('pending')}
                className={`px-3 py-1.5 font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer ${
                  alertFilter === 'pending' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Pendentes ({unmetGoalsPendingCount})
              </button>
              <button
                type="button"
                onClick={() => setAlertFilter('treated')}
                className={`px-3 py-1.5 font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer ${
                  alertFilter === 'treated' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Tratados ({unmetGoalsTreatedCount})
              </button>
            </div>
          </div>

          {filteredAlerts.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl text-slate-400 flex flex-col items-center justify-center gap-2">
              <span className="text-2xl">🎉</span>
              <span className="text-xs font-bold uppercase tracking-wider">Nenhum alerta pendente</span>
              <p className="text-[10px] text-slate-400">Excelente! Todas as metas operacionais do turno foram batidas com sucesso.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAlerts.map((alert) => {
                const isTreated = !!alert.tratativaGestor;
                const isRepack = alert._type === 'repack';
                
                return (
                  <div 
                    key={`${alert._type}-${alert._docId}`}
                    className={`g-card p-4 flex flex-col justify-between border-l-4 transition-all ${
                      isTreated 
                        ? 'border-l-[#22c55e] bg-slate-50/50 border-slate-200' 
                        : 'border-l-[#ef4444] bg-[#ef4444]/[0.02] border-[#ef4444]/10 hover:bg-[#ef4444]/[0.04]'
                    }`}
                  >
                    <div>
                      {/* Header row */}
                      <div className="flex items-center justify-between mb-2 gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                            isRepack 
                              ? 'bg-[#f5a623]/10 text-[#f5a623] border border-[#f5a623]/20' 
                              : 'bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20'
                          }`}>
                            {isRepack ? '🔄 Repack' : '🗑 Despejo'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono font-bold">
                            {alert.data}
                          </span>
                        </div>
                        
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          isTreated 
                            ? 'bg-[#22c55e]/10 text-[#22c55e]' 
                            : 'bg-[#ef4444]/10 text-[#ef4444]'
                        }`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {isTreated ? 'TRATADO' : 'PENDENTE'}
                        </span>
                      </div>

                      {/* Details */}
                      <div className="grid grid-cols-2 gap-y-1 gap-x-2 text-xs text-slate-600 mb-3">
                        <div>
                          <span className="text-[9px] text-slate-400 uppercase font-bold block">Colaborador</span>
                          <span className="font-bold text-slate-800">{alert.operador || 'Não informado'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 uppercase font-bold block">Embalagem</span>
                          <span className="font-bold text-slate-800">{alert.embalagem}</span>
                        </div>
                        <div className="mt-1.5">
                          <span className="text-[9px] text-slate-400 uppercase font-bold block">Qtd / Tempo Gasto</span>
                          <span className="font-mono font-bold text-slate-800">
                            {alert.quantidade} cx • {isRepack ? alert.duracao : alert.tempo}
                          </span>
                        </div>
                        <div className="mt-1.5">
                          <span className="text-[9px] text-slate-400 uppercase font-bold block">Meta Unitária</span>
                          <span className="font-mono font-bold text-slate-800">
                            {alert.meta}
                          </span>
                        </div>
                      </div>

                      {/* Operator's explanation */}
                      {alert.motivoNaoBaterMeta && (
                        <div className="bg-slate-100 p-2.5 rounded-lg text-xs text-slate-600 border border-slate-200/50 mb-3 italic">
                          <span className="text-[9px] font-bold text-slate-500 uppercase not-italic block mb-0.5">Motivo relatado pelo operador:</span>
                          "{alert.motivoNaoBaterMeta}"
                        </div>
                      )}
                    </div>

                    {/* Treatment display or action form */}
                    {isTreated ? (
                      <div className="mt-2 pt-2.5 border-t border-slate-200/60 bg-[#22c55e]/[0.02] p-2 rounded-xl border border-[#22c55e]/20">
                        <span className="text-[9px] font-bold text-[#22c55e] uppercase tracking-wider block mb-1 flex items-center gap-1">
                          ✅ MEDIDA DE TRATATIVA APLICADA por {alert.tratativaResponsavel}
                        </span>
                        <p className="text-xs text-slate-700 font-semibold">{alert.tratativaGestor}</p>
                        <span className="text-[9px] text-slate-400 block mt-1">
                          Tratado em {alert.tratativaData ? new Date(alert.tratativaData).toLocaleString('pt-BR') : ''}
                        </span>
                      </div>
                    ) : (
                      <div className="mt-3 pt-3 border-t border-slate-200/60 flex flex-col gap-2">
                        <div className="flex gap-1.5">
                          <input 
                            type="text"
                            placeholder="Descreva a ação de tratativa tomada..."
                            id={`input-tratativa-${alert._type}-${alert._docId}`}
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#ef4444] placeholder:text-slate-400"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const val = (e.currentTarget as HTMLInputElement).value;
                                handleSaveTratativa(alert._type, alert._docId || '', val);
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const inputEl = document.getElementById(`input-tratativa-${alert._type}-${alert._docId}`) as HTMLInputElement;
                              if (inputEl) {
                                handleSaveTratativa(alert._type, alert._docId || '', inputEl.value);
                              }
                            }}
                            className="px-3 py-2 bg-[#ef4444] hover:bg-red-600 text-white rounded-xl text-xs font-bold uppercase transition-all cursor-pointer shrink-0"
                          >
                            Tratar
                          </button>
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => {
                            // Automatically switch tab and fill the action plan form below
                            setActiveActionTab('colaborador');
                            
                            // Find matching operator ID or name
                            let matchingId = '';
                            const operatorNameLower = (alert.operador || '').toLowerCase().trim();
                            
                            const foundUser = usuariosList.find(u => (u.nome || '').toLowerCase().trim() === operatorNameLower);
                            if (foundUser) {
                              matchingId = foundUser._docId || foundUser.uid;
                            } else {
                              const foundColab = colaboradoresList.find(c => (c.nome || '').toLowerCase().trim() === operatorNameLower);
                              if (foundColab) {
                                matchingId = foundColab.id || foundColab.uid;
                              }
                            }
                            
                            if (matchingId) {
                              setSelectedColabId(matchingId);
                            }
                            
                            setNewActionTitle(`Tratativa de Produtividade - Meta não batida (${alert.embalagem})`);
                            setNewActionDesc(`Medida corretiva após o operador não bater a meta de ${alert.meta} na embalagem ${alert.embalagem}. Quantidade executada: ${alert.quantidade} caixas em ${isRepack ? alert.duracao : alert.tempo}. Motivo relatado: ${alert.motivoNaoBaterMeta || 'Não especificado'}.`);
                            
                            // Scroll to action plan form
                            const formSec = document.getElementById('acoes-e-melhorias-secao');
                            if (formSec) {
                              formSec.scrollIntoView({ behavior: 'smooth' });
                            }
                          }}
                          className="text-left text-[10px] text-blue-600 hover:text-blue-800 font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer w-fit mt-1"
                        >
                          🚀 Elaborar Plano de Ação Oficial para este Operador
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── SEÇÃO PLANOS DE AÇÃO & MELHORIAS OPERACIONAIS ── */}
      <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-xs flex flex-col gap-6" id="acoes-e-melhorias-secao">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <h2 className="text-base font-black text-slate-800 flex items-center gap-2 uppercase tracking-wide">
              <span className="p-1.5 bg-[#1e56f0]/10 text-[#1e56f0] rounded-lg">📋</span>
              Planos de Ação e Melhorias Operacionais
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Acompanhamento de metas de melhoria operacional, ações corretivas com limite de 7 dias e sugestões setoriais dos supervisores.
            </p>
          </div>
          
          {/* Tab selector */}
          <div className="flex bg-slate-100 p-1 rounded-xl self-start md:self-auto">
            <button
              type="button"
              onClick={() => setActiveActionTab('colaborador')}
              className={`px-4 py-2 text-[10px] font-black rounded-lg uppercase tracking-wider transition-all cursor-pointer ${
                activeActionTab === 'colaborador' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              👤 Planos de Ação
            </button>
            <button
              type="button"
              onClick={() => setActiveActionTab('supervisor')}
              className={`px-4 py-2 text-[10px] font-black rounded-lg uppercase tracking-wider transition-all cursor-pointer ${
                activeActionTab === 'supervisor' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              💡 Sugestões Setoriais
            </button>
          </div>
        </div>

        {activeActionTab === 'colaborador' ? (
          <div className="flex flex-col gap-6">
            {/* Create form for supervisors */}
            {user.isControle && (
              <form onSubmit={handleCreateAction} className="bg-slate-50 border border-slate-150 p-5 rounded-2xl flex flex-col gap-4">
                <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
                  <span className="text-[#1e56f0] text-sm">➕</span>
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Criar Novo Plano de Ação para Operador</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Select operator dropdown */}
                  <div className="col-span-12 md:col-span-4 flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Colaborador Destinatário</label>
                    <select
                      value={selectedColabId}
                      onChange={(e) => setSelectedColabId(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#1e56f0]"
                    >
                      <option value="">Selecione um colaborador...</option>
                      {usuariosList.map((colab) => (
                        <option key={colab._docId || colab.uid} value={colab._docId || colab.uid}>
                          {colab.nome} ({getRoleLabel(colab.papel)})
                        </option>
                      ))}
                      {colaboradoresList.filter(c => !usuariosList.some(u => u.uid === c.uid || u._docId === c.id)).map((colab) => (
                        <option key={colab.id} value={colab.id}>
                          {colab.nome} (Colaborador)
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Title of the action */}
                  <div className="col-span-12 md:col-span-8 flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Título da Ação</label>
                    <input
                      type="text"
                      placeholder="Ex: Refazer curso de amarração de carga / Organizar rua C-12"
                      value={newActionTitle}
                      onChange={(e) => setNewActionTitle(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#1e56f0]"
                    />
                  </div>
                  
                  {/* Description of the action */}
                  <div className="col-span-12 flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Detalhamento / Descrição Operacional</label>
                    <textarea
                      rows={2}
                      placeholder="Descreva detalhadamente o que o colaborador precisa executar ou corrigir no prazo máximo de 7 dias..."
                      value={newActionDesc}
                      onChange={(e) => setNewActionDesc(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#1e56f0] resize-none"
                    />
                  </div>
                </div>

                {errorMsg && <p className="text-xs text-red-500 font-semibold">{errorMsg}</p>}
                {successMsg && <p className="text-xs text-green-600 font-semibold">{successMsg}</p>}

                <button
                  type="submit"
                  disabled={creatingAction}
                  className="self-end px-5 py-2.5 bg-[#1e56f0] hover:bg-[#1a4cd8] disabled:bg-[#1e56f0]/40 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer"
                >
                  {creatingAction ? 'Salvando...' : '🚀 Criar Plano de Ação'}
                </button>
              </form>
            )}

            <div className="flex flex-col gap-3">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Ações e Planos Ativos</span>
              {(() => {
                let filtered = acoesList.filter(a => a.tipo === 'colaborador');
                
                // If standard operator, show only their own action plans
                if (!user.isControle && user.papel !== 'admin' && user.papel !== 'controle' && user.email?.toLowerCase().trim() !== 'nixon.a.a100.nh@gmail.com') {
                  filtered = filtered.filter(a => a.colaboradorId === user.uid);
                }

                if (filtered.length === 0) {
                  return (
                    <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl text-slate-400 flex flex-col items-center justify-center gap-2">
                      <span className="text-2xl">🎉</span>
                      <span className="text-xs font-bold uppercase tracking-wider">Nenhum plano de ação pendente</span>
                      <p className="text-[10px] text-slate-400">Todos os colaboradores estão em conformidade e sem restrições de trabalho.</p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((action) => {
                      const criadoDate = action.criadoEm ? new Date(action.criadoEm) : new Date();
                      const limitDate = new Date(action.limiteEm || (criadoDate.getTime() + 7 * 24 * 60 * 60 * 1000));
                      const msLeft = limitDate.getTime() - Date.now();
                      const isExceeded = msLeft <= 0 && action.status === 'pendente';
                      
                      let countdownText = '';
                      if (action.status === 'concluido') {
                        countdownText = '✓ CONCLUÍDO';
                      } else if (isExceeded) {
                        countdownText = '⚠️ EXCEDIDO (TRABALHO BLOQUEADO)';
                      } else {
                        const days = Math.floor(msLeft / (1000 * 60 * 60 * 24));
                        const hours = Math.floor((msLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                        countdownText = `⏳ Restam ${days}d e ${hours}h`;
                      }

                      return (
                        <div 
                          key={action.id} 
                          className={`p-4 rounded-xl border flex flex-col justify-between gap-3 shadow-xs transition-all ${
                            action.status === 'concluido' 
                              ? 'bg-emerald-50/40 border-emerald-100' 
                              : isExceeded 
                                ? 'bg-red-50/40 border-red-200 animate-pulse' 
                                : 'bg-white border-slate-150 hover:border-slate-300'
                          }`}
                        >
                          <div>
                            <div className="flex justify-between items-start gap-2 mb-2">
                              <span className="text-[9px] px-2 py-0.5 rounded font-black tracking-wider uppercase border" style={{
                                backgroundColor: action.status === 'concluido' ? '#d1fae5' : isExceeded ? '#fee2e2' : '#fef3c7',
                                color: action.status === 'concluido' ? '#065f46' : isExceeded ? '#991b1b' : '#92400e',
                                borderColor: 'transparent'
                              }}>
                                {countdownText}
                              </span>
                              {user.isControle && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAction(action.id)}
                                  className="text-slate-300 hover:text-red-500 p-1 rounded-md transition-colors cursor-pointer font-black text-xs"
                                  title="Excluir Ação"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                            
                            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider mb-1">
                              Para: <strong className="text-slate-700">{action.colaboradorNome}</strong>
                            </span>
                            <h3 className="font-bold text-slate-800 text-xs tracking-tight line-clamp-1">{action.titulo}</h3>
                            <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed line-clamp-3">{action.descricao}</p>
                          </div>
                          
                          <div className="mt-2 pt-3 border-t border-slate-100/70 flex justify-between items-center text-[10px] text-slate-400">
                            <span className="font-medium">Criado em: {criadoDate.toLocaleDateString('pt-BR')}</span>
                            {action.status === 'pendente' && (action.colaboradorId === user.uid || user.isControle) && (
                              <button
                                type="button"
                                onClick={() => handleConcluirAction(action.id)}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold text-[9px] uppercase tracking-wider cursor-pointer transition-all"
                              >
                                ✓ Concluir
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Sugestões de Melhorias dos Supervisores por Setor</span>
            {(() => {
              const improvements = acoesList.filter(a => a.tipo === 'supervisor' || a.setor);
              
              if (improvements.length === 0) {
                return (
                  <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl text-slate-400 flex flex-col items-center justify-center gap-2">
                    <span className="text-2xl">💡</span>
                    <span className="text-xs font-bold uppercase tracking-wider">Nenhuma melhoria registrada</span>
                    <p className="text-[10px] text-slate-400">As sugestões de melhorias propostas nos setores operacionais aparecerão aqui.</p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {improvements.map((action) => {
                    const criadoDate = action.criadoEm ? new Date(action.criadoEm) : new Date();
                    
                    return (
                      <div 
                        key={action.id} 
                        className={`p-4 rounded-xl border flex flex-col justify-between gap-3 shadow-xs transition-all ${
                          action.status === 'resolvido' || action.status === 'concluido'
                            ? 'bg-emerald-50/40 border-emerald-100' 
                            : 'bg-white border-slate-150 hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-start gap-2 mb-2">
                            <span className="text-[9px] px-2 py-0.5 rounded font-black tracking-wider uppercase bg-[#1e56f0]/10 text-[#1e56f0]">
                              SETOR: {action.setor || 'Geral'}
                            </span>
                            <span className="text-[9px] px-2 py-0.5 rounded font-black tracking-wider uppercase" style={{
                              backgroundColor: (action.status === 'resolvido' || action.status === 'concluido') ? '#d1fae5' : '#fee2e2',
                              color: (action.status === 'resolvido' || action.status === 'concluido') ? '#065f46' : '#991b1b',
                            }}>
                              {(action.status === 'resolvido' || action.status === 'concluido') ? 'RESOLVIDO' : 'PENDENTE'}
                            </span>
                          </div>
                          
                          <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider mb-1">
                            Por: <strong className="text-slate-700">{action.criadoPorNome || 'Operador'}</strong>
                          </span>
                          {action.destinoGestorNome && (
                            <div className="flex items-center gap-1.5 text-[9px] font-bold text-amber-600 mt-1 mb-2 bg-amber-50/50 px-2 py-0.5 rounded-md border border-amber-100/40 w-fit">
                              <span>👉 Destinado a: {action.destinoGestorNome} ({action.destinoGestorPapel || 'Supervisor'})</span>
                            </div>
                          )}
                          <h3 className="font-bold text-slate-800 text-xs tracking-tight line-clamp-1">{action.titulo}</h3>
                          <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed line-clamp-3">{action.descricao}</p>
                        </div>
                        
                        <div className="mt-2 pt-3 border-t border-slate-100/70 flex justify-between items-center text-[10px] text-slate-400">
                          <span className="font-medium">Sugerido em: {criadoDate.toLocaleDateString('pt-BR')}</span>
                          {action.status !== 'resolvido' && action.status !== 'concluido' && user.isControle && (
                            <button
                              type="button"
                              onClick={async () => {
                                if (!db) return;
                                try {
                                  await updateDoc(doc(db, 'acoes', action.id), {
                                    status: 'resolvido',
                                    resolvidaEm: new Date().toISOString()
                                  });
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold text-[9px] uppercase tracking-wider cursor-pointer transition-all"
                            >
                              ✓ Marcar Resolvido
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}
      </div>

    </div>
  );

  function kpiStatsPercent() {
    if (user.papel === 'admin' || user.papel === 'controle' || user.email === 'nixon.a.a100.NH@gmail.com') return 100;
    if (!empresa) return 100;
    return Math.round((empresa.modulos.length / 6) * 100);
  }
}
export {};
