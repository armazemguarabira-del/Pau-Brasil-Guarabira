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
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db, isCustomFirebaseConnected } from '../firebase';

const getRoleLabel = (role?: string) => {
  if (!role) return '';
  switch (role) {
    case 'repack': return 'Operador Repack';
    case 'despejo': return 'Operador Despejo';
    case 'armazem': return 'Armazém Fácil';
    case 'quebras': return 'Fiscal de Quebras';
    case 'validades': return 'Gestor de Validades (FEFO)';
    case 'refugo': return 'Operador Blitz Refugo';
    case 'empilhador': return 'Picking/Empilhadeira';
    case 'conferente': return 'Conferente Geral';
    case 'controle': return 'Supervisor de Controle';
    case 'admin': return 'Administrador';
    default: return role.toUpperCase();
  }
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
  const getRelativeTimeString = (timestamp: number) => {
    if (!timestamp) return 'Agora';
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Agora mesmo';
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `há ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `há ${hours} h`;
    const days = Math.floor(hours / 24);
    return `há ${days} dias`;
  };

  // 1. Establish the Firestore Real-time Listeners
  useEffect(() => {
    if (!db) return;

    const companyId = empresa?.id || '';
    const isCustom = isCustomFirebaseConnected();

    // Repack
    const qRepack = query(collection(db, 'repack'));
    const unsubRepack = onSnapshot(qRepack, (snap) => {
      const rows = snap.docs.map(doc => ({ _docId: doc.id, ...doc.data() } as any));
      const filtered = (isCustom || !companyId) ? rows : rows.filter(r => r.empresaId === companyId);
      setRepackList(filtered);
    }, (err) => console.error("Error in repack onSnapshot", err));

    // Despejo
    const qDespejo = query(collection(db, 'despejo'));
    const unsubDespejo = onSnapshot(qDespejo, (snap) => {
      const rows = snap.docs.map(doc => ({ _docId: doc.id, ...doc.data() } as any));
      const filtered = (isCustom || !companyId) ? rows : rows.filter(r => r.empresaId === companyId);
      setDespejoList(filtered);
    }, (err) => console.error("Error in despejo onSnapshot", err));

    // Quebras
    const qQuebras = query(collection(db, 'quebras'));
    const unsubQuebras = onSnapshot(qQuebras, (snap) => {
      const rows = snap.docs.map(doc => ({ _docId: doc.id, ...doc.data() } as any));
      const filtered = (isCustom || !companyId) ? rows : rows.filter(r => r.empresaId === companyId);
      setQuebrasList(filtered);
    }, (err) => console.error("Error in quebras onSnapshot", err));

    // Validades
    const qValidades = query(collection(db, 'validades'));
    const unsubValidades = onSnapshot(qValidades, (snap) => {
      const rows = snap.docs.map(doc => ({ _docId: doc.id, ...doc.data() } as any));
      const filtered = (isCustom || !companyId) ? rows : rows.filter(r => r.empresaId === companyId);
      setValidadesList(filtered);
    }, (err) => console.error("Error in validades onSnapshot", err));

    // Armazem
    const qArmazem = query(collection(db, 'armazem'));
    const unsubArmazem = onSnapshot(qArmazem, (snap) => {
      const rows = snap.docs.map(doc => ({ _docId: doc.id, ...doc.data() } as any));
      const filtered = (isCustom || !companyId) ? rows : rows.filter(r => r.empresaId === companyId);
      setArmazemList(filtered);
    }, (err) => console.error("Error in armazem onSnapshot", err));

    // Blitz Refugo
    const qBlitz = query(collection(db, 'blitz_refugo'));
    const unsubBlitz = onSnapshot(qBlitz, (snap) => {
      const rows = snap.docs.map(doc => ({ _docId: doc.id, ...doc.data() } as any));
      const filtered = (isCustom || !companyId) ? rows : rows.filter(r => r.empresaId === companyId);
      setBlitzList(filtered);
    }, (err) => console.error("Error in blitz onSnapshot", err));

    // Tarefas
    const qTarefas = query(collection(db, 'tarefas'));
    const unsubTarefas = onSnapshot(qTarefas, (snap) => {
      const rows = snap.docs.map(doc => ({ _docId: doc.id, ...doc.data() } as any));
      const filtered = (isCustom || !companyId) ? rows : rows.filter(r => r.empresaId === companyId);
      setTarefasList(filtered);
    }, (err) => console.error("Error in tarefas onSnapshot", err));

    // Usuarios
    const qUsuarios = query(collection(db, 'usuarios'));
    const unsubUsuarios = onSnapshot(qUsuarios, (snap) => {
      const rows = snap.docs.map(doc => ({ _docId: doc.id, ...doc.data() } as any));
      const filtered = (isCustom || !companyId) ? rows : rows.filter(r => r.empresaId === companyId);
      setUsuariosList(filtered);
    }, (err) => console.error("Error in usuarios onSnapshot", err));

    return () => {
      unsubRepack();
      unsubDespejo();
      unsubQuebras();
      unsubValidades();
      unsubArmazem();
      unsubBlitz();
      unsubTarefas();
      unsubUsuarios();
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

    // B. Count Shift Submissions (Created Today)
    const todayISO = new Date().toISOString().split('T')[0];
    const todayStr = new Date().toLocaleDateString('pt-BR');

    const repackToday = repackList.filter(r => r.dataISO === todayISO || r.data === todayStr).length;
    const despejoToday = despejoList.filter(d => d.dataISO === todayISO || d.data === todayStr).length;
    const quebrasToday = quebrasList.filter(q => q.dataISO === todayISO || q.data === todayStr).length;
    const validadesToday = validadesList.filter(v => v.cadastradoEm?.startsWith(todayISO)).length;
    const armazemToday = armazemList.filter(a => a.dataISO === todayISO || a.data === todayStr).length;
    const blitzToday = blitzList.filter(b => b.dataISO === todayISO || b.data === todayStr).length;
    const tarefasToday = tarefasList.filter(t => t.criadoEm?.startsWith(todayISO)).length;

    const totalDocsHoje = repackToday + despejoToday + quebrasToday + validadesToday + armazemToday + blitzToday + tarefasToday;

    setLiveKpiStats({
      usuarios: usuariosList.length > 0 ? usuariosList.length : kpiStats.usuarios,
      modulos: kpiStats.modulos,
      alertasFefo: alertasCount,
      docsHoje: totalDocsHoje,
    });

    // C. Synthesize feed logs from real data
    const allLogs: Array<{ text: string, time: string, type: string, timestamp: number }> = [];

    repackList.forEach(r => {
      const timestamp = r._criadoEm ? new Date(r._criadoEm).getTime() : (r.dataISO ? new Date(r.dataISO + 'T' + (r.inicio || '00:00') + ':00').getTime() : 0);
      if (timestamp) {
        allLogs.push({
          text: `${r.operador || 'Operador'} iniciou a reembalagem de ${r.quantidade} un de ${r.embalagem}.`,
          time: getRelativeTimeString(timestamp),
          type: 'repack',
          timestamp
        });
      }
    });

    despejoList.forEach(d => {
      const timestamp = d._criadoEm ? new Date(d._criadoEm).getTime() : (d.dataISO ? new Date(d.dataISO + 'T' + (d.inicio || '00:00') + ':00').getTime() : 0);
      if (timestamp) {
        allLogs.push({
          text: `${d.operador || 'Operador'} finalizou despejo de ${d.quantidade} un de ${d.embalagem}.`,
          time: getRelativeTimeString(timestamp),
          type: 'repack',
          timestamp
        });
      }
    });

    quebrasList.forEach(q => {
      const timestamp = q._criadoEm ? new Date(q._criadoEm).getTime() : (q.dataISO ? new Date(q.dataISO + 'T00:00:00').getTime() : 0);
      if (timestamp) {
        allLogs.push({
          text: `Registro de Quebra: SKU ${q.codProduto} - ${q.descricao} (${q.quantidade} un) na área ${q.area}.`,
          time: getRelativeTimeString(timestamp),
          type: 'repack',
          timestamp
        });
      }
    });

    validadesList.forEach(v => {
      const timestamp = v._criadoEm ? new Date(v._criadoEm).getTime() : (v.cadastradoEm ? new Date(v.cadastradoEm).getTime() : 0);
      if (timestamp) {
        allLogs.push({
          text: `Novo registro de Validade cadastrado: ${v.descricao} (vence em ${v.validade}).`,
          time: getRelativeTimeString(timestamp),
          type: 'validades',
          timestamp
        });
      }
    });

    armazemList.forEach(a => {
      const timestamp = a._criadoEm ? new Date(a._criadoEm).getTime() : (a.dataISO ? new Date(a.dataISO + 'T' + (a.inicio || '00:00') + ':00').getTime() : 0);
      if (timestamp) {
        allLogs.push({
          text: `Operação ${a.operacao} (${a.placa}) finalizada por ${a.empilhador} dentro da janela (${a.inicio} - ${a.fim}).`,
          time: getRelativeTimeString(timestamp),
          type: 'armazem',
          timestamp
        });
      }
    });

    blitzList.forEach(b => {
      const timestamp = b._criadoEm ? new Date(b._criadoEm).getTime() : (b.dataISO ? new Date(b.dataISO + 'T00:00:00').getTime() : 0);
      if (timestamp) {
        allLogs.push({
          text: `Blitz de Refugo realizada na placa ${b.placa} com ajudante ${b.ajudante}.`,
          time: getRelativeTimeString(timestamp),
          type: 'armazem',
          timestamp
        });
      }
    });

    tarefasList.forEach(t => {
      const timestamp = t.criadoEm ? new Date(t.criadoEm).getTime() : 0;
      if (timestamp) {
        allLogs.push({
          text: `Tarefa #${t.codigo} (${t.descricao}) atualizada para o status: ${t.status} por ${t.operador || 'operador'}.`,
          time: getRelativeTimeString(timestamp),
          type: 'conferente',
          timestamp
        });
      }
    });

    // Sort by descending timestamp
    allLogs.sort((a, b) => b.timestamp - a.timestamp);

    // Slice to top 4 logs
    const topLogs = allLogs.slice(0, 4).map(l => ({
      text: l.text,
      time: l.time,
      type: l.type
    }));

    if (topLogs.length > 0) {
      setLiveLogs(topLogs);
    } else {
      setLiveLogs([]);
    }

  }, [repackList, despejoList, quebrasList, validadesList, armazemList, blitzList, tarefasList, usuariosList, kpiStats]);

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

        {/* Info lateral (Apenas Colaborador, sem turno, sem data e sem botão de alertas) */}
        <div className="flex flex-col justify-center pl-0 lg:pl-6 border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 shrink-0 min-w-[240px]">
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
            <span className="font-sans font-black text-fluid-kpi text-[#3b82f6]">{liveKpiStats.docsHoje}</span>
            <span className="text-[#6a7d92] text-[9.5px] uppercase font-bold tracking-widest mt-1">Lançamentos</span>
            <span className="text-[8.5px] text-[#6a7d92] mt-0.5">Lançamentos hoje</span>
          </div>

        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        
        {/* Real-time Operations Activity Feed */}
        <div className="g-card p-6 md:col-span-8 flex flex-col justify-between">
          <div>
            <h3 className="font-sans font-black text-sm tracking-widest text-[#f5a623] uppercase mb-4 flex items-center justify-between">
              <span>📡 Atividades em Tempo Real</span>
              <span className="text-[9px] bg-[#22c55e]/15 border border-[#22c55e]/25 text-[#22c55e] px-2 py-0.5 rounded-full font-sans tracking-wide">● Sincronizado</span>
            </h3>
            
            <div className="divide-y divide-[#1c2530]">
              {(liveLogs.length > 0 ? liveLogs : recentLogs).map((log, index) => (
                <div key={index} className="flex gap-3 py-3 items-start">
                  <span className="bg-[#151b23] border border-[#222d3a] p-2 rounded-lg flex-shrink-0 flex items-center justify-center">
                    {logIconMap[log.type] || <Activity className="w-4 h-4 text-snow" />}
                  </span>
                  <div className="flex-1">
                    <p className="text-xs text-[#e8eef5] leading-relaxed">{log.text}</p>
                    <span className="text-[9px] text-[#6a7d92] mt-1 block">{log.time}</span>
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
                  onClick={() => onNavigate('blitz-dashboard')}
                  className="text-center py-2.5 bg-[#3b82f6]/10 hover:bg-[#3b82f6]/20 text-[#3b82f6] hover:text-white rounded-xl text-[8px] uppercase font-black tracking-wider border border-[#3b82f6]/25 transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  📊 Blitz
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
                const papel = user.papel || '';
                const tabId = papel === 'empilhador' ? 'empilhador' : papel;
                const label = papel === 'repack' ? 'Reembalagem / Repack' :
                              papel === 'despejo' ? 'Descarte / Despejo' :
                              papel === 'armazem' ? 'Movimentação / Armazém' :
                              papel === 'quebras' ? 'Fiscal de Quebras' :
                              papel === 'validades' ? 'Validades (FEFO)' :
                              papel === 'refugo' ? 'Aferição Blitz Refugo' :
                              papel === 'empilhador' ? 'Picking / Empilhador' :
                              papel === 'conferente' ? 'Fila de Despacho Conferente' : 'Minha Operação';
                return (
                  <button 
                    onClick={() => onNavigate(tabId)}
                    className="w-full text-center py-3 bg-[#f5a623]/10 hover:bg-[#f5a623]/20 text-[#f5a623] hover:text-white rounded-xl text-xs uppercase font-black tracking-widest border border-[#f5a623]/25 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    🚀 Ir para {label}
                  </button>
                );
              })()
            )}
          </div>
        </div>

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
