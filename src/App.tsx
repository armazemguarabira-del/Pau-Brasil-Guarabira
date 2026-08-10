import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import LoginAuth from './components/LoginAuth';
import Sidebar from './components/Sidebar';
import { BrandLogo } from './components/BrandLogo';
import { isPanelAllowedForUser, getUserOperationPanel, getUserRoleType } from './utils/permissions';
import DashboardOverview from './components/DashboardOverview';
import AjudantePanel from './components/AjudantePanel';
import RepackPanel from './components/RepackPanel';
import DespejoPanel from './components/DespejoPanel';
import ArmazemPanel from './components/ArmazemPanel';
import QuebrasPanel from './components/QuebrasPanel';
import ValidadesPanel from './components/ValidadesPanel';
import RefugoPanel from './components/RefugoPanel';
import EmpilhadorPanel from './components/EmpilhadorPanel';
import ConferentePanel from './components/ConferentePanel';
import ControlePanel from './components/ControlePanel';
import ExportarPanel from './components/ExportarPanel';
import FirebasePanel from './components/FirebasePanel';
import RepackDashboard from './components/RepackDashboard';
import DespejoDashboard from './components/DespejoDashboard';
import LogisticaDashboard from './components/LogisticaDashboard';
import QuebrasDashboard from './components/QuebrasDashboard';
import FefoDashboard from './components/FefoDashboard';
import PickingDashboard from './components/PickingDashboard';
import GestaoCapacidadeDashboard from './components/GestaoCapacidadeDashboard';
import TmrDashboard from './components/TmrDashboard';
import RegistrosPanel from './components/RegistrosPanel';
import AcessosPanel from './components/AcessosPanel';
import EstoqueHub from './components/EstoqueHub';
import PadraoOperacionalPanel from './components/PadraoOperacionalPanel';
import SimulacaoAcoesPanel from './components/SimulacaoAcoesPanel';
import DadosRetroativosPanel from './components/DadosRetroativosPanel';
import SimuladorRessuprimentoPanel from './components/SimuladorRessuprimentoPanel';
import RankingModule from './components/RankingModule';
import EficienciaMontagemPanel from './components/EficienciaMontagemPanel';
import TreeKpiViewer from './components/TreeKpiViewer';
import CadastrosPanel from './components/CadastrosPanel';
import QualidadePanel from './components/QualidadePanel';
import DnSwotPanel from './components/DnSwotPanel';
import AuditoriaDpoPanel from './components/AuditoriaDpoPanel';
import CategoryIndexPanel from './components/CategoryIndexPanel';
import PlataformasExternasPanel from './components/PlataformasExternasPanel';
import { 
  TreinamentosQualidadePanel, 
  BloqueioArmazemPanel, 
  DevolucaoPanel, 
  ContagemInventarioPanel, 
  GestaoAtivosPanel, 
  QualidadePuxadaPanel, 
  GestaoWlpPanel, 
  CicloCarretasPanel 
} from './components/NovosProcessosDpoPanels';
import { AgenteDpoModal } from './components/AgenteDpoModal';
import { AgendaExecutivoComponent } from './components/AgendaExecutivoComponent';
import { DiarioBordoComponent } from './components/DiarioBordoComponent';
import { ReunioesComponent } from './components/ReunioesComponent';
import { WlpDashboard } from './components/WlpDashboard';
import { OperationalNotificationBell } from './components/OperationalNotificationBell';
import { EmpresaDataProvider, useEmpresaData } from './context/EmpresaDataContext';
import { safeSetLocalStorage, safeGetLocalStorage } from './utils/safeLocalStorage';

import { auth, db, isCustomFirebaseConnected } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { Usuario, Empresa } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { Sun, Moon, Zap, PanelLeftOpen, PanelLeftClose, ArrowLeft, ArrowRight } from 'lucide-react';

function HeaderClock({ theme }: { theme: 'light' | 'dark' }) {
  const [timeStr, setTimeStr] = useState('');
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTimeStr(now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', { hour12: false }));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!timeStr) return null;

  return (
    <>
      <div className={`w-[1px] h-3.5 hidden md:block ${theme === 'dark' ? 'bg-[#1c2530]' : 'bg-slate-200'}`} />
      <div className="text-[9px] text-slate-400 font-mono font-bold uppercase tracking-wider hidden md:block">
        {timeStr}
      </div>
    </>
  );
}

function GlobalUnitSelector({ theme }: { theme: 'light' | 'dark' }) {
  const { viewUnitMode, setViewUnitMode } = useEmpresaData();
  return (
    <div className={`flex items-center p-0.5 rounded-lg border font-black text-[9px] uppercase tracking-wider ${
      theme === 'dark' ? 'bg-[#151b23] border-[#222d3a] text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
    }`}>
      <span className="px-1.5 text-[8px] text-slate-400 font-black hidden lg:inline">MODO:</span>
      <button
        type="button"
        onClick={() => setViewUnitMode('R$')}
        className={`px-2 py-0.5 rounded transition-all cursor-pointer border-none font-black ${
          viewUnitMode === 'R$'
            ? 'bg-emerald-600 text-white shadow-xs'
            : (theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
        }`}
      >
        R$ (Real)
      </button>
      <button
        type="button"
        onClick={() => setViewUnitMode('HL')}
        className={`px-2 py-0.5 rounded transition-all cursor-pointer border-none font-black ${
          viewUnitMode === 'HL'
            ? 'bg-cyan-600 text-white shadow-xs'
            : (theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
        }`}
      >
        HL (Hecto)
      </button>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<Usuario | null>(() => {
    try {
      const saved = localStorage.getItem('af_logged_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [empresa, setEmpresa] = useState<Empresa | null>(() => {
    try {
      const saved = localStorage.getItem('af_logged_empresa');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [activePanel, setActivePanel] = useState<string>(() => {
    try {
      const savedUser = localStorage.getItem('af_logged_user');
      if (savedUser) {
        return 'visao-geral';
      }
    } catch (e) {
      // fallback
    }
    return 'landing';
  });

  // Navigation History Stack (Back / Forward)
  const [history, setHistory] = useState<string[]>(() => {
    try {
      const savedUser = localStorage.getItem('af_logged_user');
      if (savedUser) {
        return ['visao-geral'];
      }
    } catch (e) {
      // fallback
    }
    return ['landing'];
  });
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  const navigateToPanel = (panel: string) => {
    if (!panel || panel === activePanel) return;
    setHistory(prev => {
      const nextHistory = prev.slice(0, historyIndex + 1);
      nextHistory.push(panel);
      return nextHistory;
    });
    setHistoryIndex(prev => prev + 1);
    setActivePanel(panel);
  };

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < history.length - 1;

  const handleGoBack = () => {
    if (canGoBack) {
      const prevIdx = historyIndex - 1;
      setHistoryIndex(prevIdx);
      setActivePanel(history[prevIdx]);
    }
  };

  const handleGoForward = () => {
    if (canGoForward) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      setActivePanel(history[nextIdx]);
    }
  };

  const [showAuthGate, setShowAuthGate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('af_app_theme') || localStorage.getItem('dashboard_theme') || localStorage.getItem('af-theme');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch (e) {
      // ignore
    }
    return 'dark';
  });
  const [activeActions, setActiveActions] = useState<any[]>([]);
  const [isDpoAgentOpen, setIsDpoAgentOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Sync user, empresa, and activePanel to localStorage for session persistence
  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem('af_logged_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('af_logged_user');
      }
    } catch (e) {
      // ignore
    }
  }, [user]);

  useEffect(() => {
    try {
      if (empresa) {
        localStorage.setItem('af_logged_empresa', JSON.stringify(empresa));
      } else {
        localStorage.removeItem('af_logged_empresa');
      }
    } catch (e) {
      // ignore
    }
  }, [empresa]);

  useEffect(() => {
    try {
      if (user && activePanel && activePanel !== 'landing') {
        localStorage.setItem('af_logged_panel', activePanel);
      } else if (!user) {
        localStorage.removeItem('af_logged_panel');
      }
    } catch (e) {
      // ignore
    }
  }, [user, activePanel]);

  // Listen to pending action plans for the current logged in collaborator
  useEffect(() => {
    if (!user || !db) {
      setActiveActions([]);
      return;
    }
    const companyId = user.empresaId || 'demo';
    
    // Notificações ativas por usuário: limitado a no máximo 10 alertas pendentes simultâneos para evitar sobrecarga visual de popups na tela
    import('firebase/firestore').then(({ limit }) => {
      const q = query(
        collection(db, 'acoes'),
        where('empresaId', '==', companyId),
        where('colaboradorId', '==', user.uid),
        where('status', '==', 'pendente'),
        where('tipo', '==', 'colaborador'),
        limit(10)
      );

      const unsub = onSnapshot(q, (snapshot) => {
        const docs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setActiveActions(docs);
      }, (err) => {
        console.error("Erro ao escutar ações ativas", err);
      });

      return () => unsub();
    });
  }, [user?.uid, user?.empresaId]);

  const isBlockedByActionPlan = () => {
    // Admin, supervisors and master bypasses are never blocked!
    const isNixon = user?.email?.toLowerCase().trim() === 'nixon.a.a100.nh@gmail.com';
    const isSuperOrAdmin = user?.isControle || user?.papel === 'admin' || user?.papel === 'controle' || user?.uid === 'bypass_g1009';
    if (isNixon || isSuperOrAdmin) return false;

    return activeActions.some(action => {
      const limitTime = new Date(action.limiteEm || (new Date(action.criadoEm).getTime() + 7 * 24 * 60 * 60 * 1000)).getTime();
      return Date.now() > limitTime;
    });
  };

  // Session Access Tracking for Security
  useEffect(() => {
    if (!user) {
      return;
    }
    const empresaId = user.empresaId || 'demo';
    const sessionKey = `af_session_doc_id_${user.uid}`;
    let currentSessionId = sessionStorage.getItem(sessionKey);

    const trackSession = async () => {
      // Don't log landing or empty panels
      if (activePanel === 'landing' || !activePanel) return;

      const nowStr = new Date().toISOString();
      const friendlyTime = new Date().toLocaleTimeString('pt-BR', { hour12: false });
      const friendlyDate = new Date().toLocaleDateString('pt-BR');

      const activityItem = {
        aba: activePanel,
        hora: friendlyTime,
        timestamp: nowStr
      };

      if (!currentSessionId) {
        // Create new session document
        const newSession = {
          empresaId,
          userId: user.uid,
          nome: user.nome,
          email: user.email,
          papel: user.papel || 'operador',
          loginEm: nowStr,
          loginData: friendlyDate,
          loginHora: friendlyTime,
          logoutEm: null,
          ultimoAcesso: nowStr,
          abasAcessadas: [activePanel],
          atividades: [activityItem],
          ativo: true
        };

        if (db) {
          try {
            const { collection, addDoc } = await import('firebase/firestore');
            const docRef = await addDoc(collection(db, 'acessos'), newSession);
            currentSessionId = docRef.id;
            sessionStorage.setItem(sessionKey, docRef.id);
          } catch (e) {
            console.error('Error creating access log in Firestore:', e);
            // Fallback locally
            currentSessionId = 'local_' + Date.now();
            sessionStorage.setItem(sessionKey, currentSessionId);
            const localSessions = JSON.parse(safeGetLocalStorage(`local_acessos_${empresaId}`, '[]') || '[]');
            localSessions.unshift({ id: currentSessionId, ...newSession });
            safeSetLocalStorage(`local_acessos_${empresaId}`, JSON.stringify(localSessions.slice(0, 50)));
          }
        } else {
          // No DB, handle locally
          currentSessionId = 'local_' + Date.now();
          sessionStorage.setItem(sessionKey, currentSessionId);
          const localSessions = JSON.parse(safeGetLocalStorage(`local_acessos_${empresaId}`, '[]') || '[]');
          localSessions.unshift({ id: currentSessionId, ...newSession });
          safeSetLocalStorage(`local_acessos_${empresaId}`, JSON.stringify(localSessions.slice(0, 50)));
        }
      } else {
        // Update existing session without performing a getDoc read
        if (db && !currentSessionId.startsWith('local_')) {
          try {
            const { doc, updateDoc, arrayUnion } = await import('firebase/firestore');
            const docRef = doc(db, 'acessos', currentSessionId);
            await updateDoc(docRef, {
              ultimoAcesso: nowStr,
              abasAcessadas: arrayUnion(activePanel),
              atividades: arrayUnion(activityItem)
            });
          } catch (e) {
            console.error('Error updating access log in Firestore:', e);
          }
        } else {
          // Local fallback update
          const localSessions = JSON.parse(safeGetLocalStorage(`local_acessos_${empresaId}`, '[]') || '[]');
          const idx = localSessions.findIndex((s: any) => s.id === currentSessionId);
          if (idx !== -1) {
            const sess = localSessions[idx];
            if (!sess.abasAcessadas.includes(activePanel)) {
              sess.abasAcessadas.push(activePanel);
            }
            if (sess.atividades[sess.atividades.length - 1]?.aba !== activePanel) {
              sess.atividades.push(activityItem);
            }
            sess.ultimoAcesso = nowStr;
            safeSetLocalStorage(`local_acessos_${empresaId}`, JSON.stringify(localSessions.slice(0, 50)));
          }
        }
      }
    };

    trackSession();
  }, [user, activePanel]);

  // Sync theme to body element and localStorage
  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.remove('light-theme');
      document.body.classList.add('dark');
      document.documentElement.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
      document.documentElement.classList.remove('dark');
      document.body.classList.add('light-theme');
    }
    try {
      localStorage.setItem('af_app_theme', theme);
      localStorage.setItem('dashboard_theme', theme);
      localStorage.setItem('af-theme', theme);
    } catch (e) {
      // ignore
    }
  }, [theme]);

  // Sync auth state
  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setLoading(true);
      if (fbUser) {
        try {
          // Fetch user metadata from firestore
          const uDoc = await getDoc(doc(db, 'usuarios', fbUser.uid));
          if (uDoc.exists()) {
            const uData = uDoc.data() as Omit<Usuario, 'uid'>;
            const completeUser: Usuario = { uid: fbUser.uid, ...uData };
            const isNixon = completeUser.email.toLowerCase().trim() === 'nixon.a.a100.nh@gmail.com';
            if (isNixon) {
              completeUser.papel = 'admin';
            }
            
            const savedMode = localStorage.getItem('login_mode');
            if (savedMode === 'controle') {
              completeUser.isControle = true;
            } else if (savedMode === 'operacao') {
              completeUser.isControle = false;
            } else {
              completeUser.isControle = isNixon || uData.isControle || uData.papel === 'controle' || (uData.papel || '').split(',').map((s: string) => s.trim()).includes('controle');
            }
            setUser(completeUser);

            // Fetch company metadata
            if (uData.empresaId) {
              const eDoc = await getDoc(doc(db, 'empresas', uData.empresaId));
              if (eDoc.exists()) {
                const eData = { id: uData.empresaId, ...eDoc.data() } as Empresa;
                const userRolesList = (completeUser.papel || '').split(',').map((s: string) => s.trim());
                if (completeUser.isControle || userRolesList.includes('admin') || userRolesList.includes('controle')) {
                  eData.modulos = ['repack', 'validades', 'quebras', 'despejo', 'empilhador', 'refugo'];
                  eData.plano = 'completo';
                }
                setEmpresa(eData);
              }
            }
            setActivePanel(prev => (prev === 'landing' || !prev ? 'visao-geral' : prev));
          }
        } catch(e) {
          console.error('Error syncing auth metadata', e);
        }
      } else {
        // Only clear if no saved user session exists in localStorage
        const savedUser = localStorage.getItem('af_logged_user');
        if (!savedUser) {
          setUser(null);
          setEmpresa(null);
          setActivePanel('landing');
        }
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleAuthSuccess = (uProfile: any) => {
    const matchedUid = uProfile.uid || uProfile.id || 'demo-user';
    const userEmail = uProfile.email || '';
    const isNixon = userEmail.toLowerCase().trim() === 'nixon.a.a100.nh@gmail.com';
    
    const savedMode = localStorage.getItem('login_mode');
    let isControleVal = uProfile.isControle || isNixon;
    if (savedMode === 'controle') {
      isControleVal = true;
    } else if (savedMode === 'operacao') {
      isControleVal = false;
    }

    const completeUser: Usuario = {
      uid: matchedUid,
      nome: uProfile.nome || 'Operador',
      email: userEmail,
      empresaId: uProfile.empresaId || 'demo',
      papel: isNixon ? 'admin' : (uProfile.papel || uProfile.role || 'operador'),
      status: uProfile.status || 'ativo',
      isControle: isControleVal
    };
    setUser(completeUser);

    if (uProfile.empresa) {
      const eData = { ...uProfile.empresa };
      const userRolesList = (completeUser.papel || '').split(',').map((s: string) => s.trim());
      if (completeUser.isControle || userRolesList.includes('admin') || userRolesList.includes('controle')) {
        eData.modulos = ['repack', 'validades', 'quebras', 'despejo', 'empilhador', 'refugo'];
        eData.plano = 'completo';
      }
      setEmpresa(eData);
    } else {
      setEmpresa({
        id: uProfile.empresaId || 'demo',
        nome: uProfile.empresaNome || 'Minha Empresa',
        cidade: '',
        estado: '',
        plano: uProfile.plano || 'completo',
        modulos: ['repack', 'validades', 'quebras', 'despejo', 'empilhador', 'refugo'],
        ativo: true
      });
    }

    setShowAuthGate(false);
    setActivePanel('visao-geral');
  };

  const handleLogout = async () => {
    if (user) {
      const sessionKey = `af_session_doc_id_${user.uid}`;
      const sessionDocId = sessionStorage.getItem(sessionKey);
      if (sessionDocId) {
        const nowStr = new Date().toISOString();
        if (db && !sessionDocId.startsWith('local_')) {
          try {
            const { updateDoc, doc } = await import('firebase/firestore');
            await updateDoc(doc(db, 'acessos', sessionDocId), {
              logoutEm: nowStr,
              ativo: false
            });
          } catch (e) {
            console.error('Error logging out session in Firestore:', e);
          }
        } else {
          const empresaId = user.empresaId || 'demo';
          const localSessions = JSON.parse(localStorage.getItem(`local_acessos_${empresaId}`) || '[]');
          const idx = localSessions.findIndex((s: any) => s.id === sessionDocId);
          if (idx !== -1) {
            localSessions[idx].logoutEm = nowStr;
            localSessions[idx].ativo = false;
            safeSetLocalStorage(`local_acessos_${empresaId}`, JSON.stringify(localSessions.slice(0, 50)));
          }
        }
        sessionStorage.removeItem(sessionKey);
      }
    }

    localStorage.removeItem('af_logged_user');
    localStorage.removeItem('af_logged_empresa');
    localStorage.removeItem('af_logged_panel');

    if (auth) {
      await signOut(auth);
    }
    setUser(null);
    setEmpresa(null);
    setActivePanel('visao-geral');
    setShowAuthGate(false);
  };

  // Main navigation orchestration router
  const renderActivePanel = () => {
    if (!user) {
      return null;
    }

    if (!isPanelAllowedForUser(activePanel, user)) {
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-sm border border-gray-100 max-w-md mx-auto my-12 text-center" id="acesso-restrito-container">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-4" id="acesso-restrito-icon">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m3-9a1 1 0 11-2 0 1 1 0 012 0zM3.172 7.828c.39-.39.902-.586 1.414-.586h14.828c.512 0 1.024.195 1.414.586a2 2 0 010 2.828l-1.414 1.414a2 2 0 01-2.828 0l-1.414-1.414a2 2 0 010-2.828L15 6.414a2 2 0 01-2.828 0l-1.414 1.414a2 2 0 010 2.828L9.343 12.07a2 2 0 01-2.828 0l-1.414-1.414a2 2 0 010-2.828l1.414-1.414z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2" id="acesso-restrito-title">Acesso Restrito</h2>
          <p className="text-sm text-gray-500 mb-6" id="acesso-restrito-desc">Seu cargo ({user?.cargo || user?.papel || 'Operador'}) não possui privilégios para acessar esta área da plataforma.</p>
          <button 
            id="acesso-restrito-btn-voltar"
            onClick={() => setActivePanel('visao-geral')} 
            className="px-6 py-2 bg-[#1e56f0] text-white rounded-lg hover:bg-[#1a4cd8] font-medium transition-colors cursor-pointer"
          >
            Voltar para Visão Geral
          </button>
        </div>
      );
    }

    const operationalPanels = [
      'repack', 'despejo', 'armazem', 'quebras', 'validades', 'refugo', 'empilhador', 'conferente'
    ];

    if (operationalPanels.includes(activePanel) && isBlockedByActionPlan()) {
      const blockedActions = activeActions.filter(action => {
        const limitTime = new Date(action.limiteEm || (new Date(action.criadoEm).getTime() + 7 * 24 * 60 * 60 * 1000)).getTime();
        return Date.now() > limitTime;
      });

      return (
        <div className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-md border-2 border-red-200 max-w-lg mx-auto my-12 text-center" id="trabalho-bloqueado-container">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4" id="trabalho-bloqueado-icon">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 animate-bounce text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-black text-slate-800 mb-2 uppercase tracking-wide" id="trabalho-bloqueado-title">⚠️ Trabalho Bloqueado</h2>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed" id="trabalho-bloqueado-desc">
            De acordo com as regras operacionais, você possui um plano de ação criado para você que ultrapassou o <strong>limite máximo de 7 dias</strong> para conclusão. Você só poderá registrar produtividade após concluir esta ação.
          </p>

          <div className="w-full text-left bg-slate-50 border border-slate-100 rounded-xl p-4.5 mb-6 flex flex-col gap-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Ação(ões) Pendente(s) Excedida(s):</span>
            {blockedActions.map(action => (
              <div key={action.id} className="p-3 bg-white rounded-lg border border-red-100 flex flex-col gap-1 shadow-xs">
                <span className="font-bold text-slate-850 text-xs">{action.titulo}</span>
                <p className="text-[11px] text-slate-500 mt-1">{action.descricao}</p>
                <div className="flex justify-between items-center mt-2.5 pt-2.5 border-t border-slate-100 text-[10px] text-slate-400 font-medium">
                  <span>Criado em: {new Date(action.criadoEm).toLocaleDateString('pt-BR')}</span>
                  <button
                    onClick={async () => {
                      try {
                        const { doc, updateDoc } = await import('firebase/firestore');
                        await updateDoc(doc(db, 'acoes', action.id), {
                          status: 'concluido',
                          resolvidaEm: new Date().toISOString()
                        });
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md font-bold text-[9px] uppercase tracking-wider cursor-pointer transition-all flex items-center gap-1"
                  >
                    ✓ Concluir Ação
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button 
            id="trabalho-bloqueado-btn-voltar"
            onClick={() => setActivePanel('visao-geral')} 
            className="w-full py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 font-bold text-xs uppercase tracking-widest transition-colors cursor-pointer"
          >
            Ir para a Visão Geral
          </button>
        </div>
      );
    }

    switch (activePanel) {
      case 'cat-produtividade':
      case 'cat-dashboards':
      case 'cat-ferramentas-gestao':
      case 'cat-cadastros':
      case 'cat-dados-acoes':
        return (
          <CategoryIndexPanel
            categoryKey={activePanel}
            user={user}
            onNavigate={setActivePanel}
            theme={theme}
          />
        );
      case 'dashboard':
      case 'visao-geral':
        return (
          <DashboardOverview 
            user={user} 
            empresa={empresa} 
            onNavigate={setActivePanel} 
            theme={theme}
            kpiStats={{
              usuarios: 3,
              modulos: empresa?.modulos ? empresa.modulos.length : 6,
              docsHoje: 12,
              alertasFefo: 4
            }}
          />
        );
      case 'dn-swot':
        return <DnSwotPanel user={user} onNavigate={setActivePanel} />;
      case 'ajudante':
      case 'repack':
        return <AjudantePanel user={user} empresa={empresa} theme={theme} />;
      case 'repack-dashboard':
        return <RepackDashboard user={user} empresa={empresa} theme={theme} onBack={() => setActivePanel('visao-geral')} />;
      case 'despejo-dashboard':
        return <DespejoDashboard user={user} empresa={empresa} theme={theme} onBack={() => setActivePanel('visao-geral')} />;
      case 'logistica-dashboard':
        return <PickingDashboard user={user} empresa={empresa} theme={theme} initialModule="efc_efd" onBack={() => setActivePanel('visao-geral')} />;
      case 'quebras-dashboard':
        return <QuebrasDashboard user={user} empresa={empresa} theme={theme} onBack={() => setActivePanel('visao-geral')} />;
      case 'fefo-dashboard':
        return <FefoDashboard user={user} empresa={empresa} theme={theme} onBack={() => setActivePanel('visao-geral')} />;
      case 'picking-dashboard':
        return <PickingDashboard user={user} empresa={empresa} theme={theme} initialModule="operadores" onBack={() => setActivePanel('visao-geral')} />;
      case 'gestao-capacidade':
        return <GestaoCapacidadeDashboard user={user} empresa={empresa} theme={theme} onBack={() => setActivePanel('visao-geral')} />;
      case 'tmr-dashboard':
        return <PickingDashboard user={user} empresa={empresa} theme={theme} initialModule="tmr" onBack={() => setActivePanel('visao-geral')} />;
      case 'despejo':
        return <DespejoPanel user={user} empresa={empresa} theme={theme} />;
      case 'armazem':
        return <EmpilhadorPanel user={user} empresa={empresa} theme={theme} />;
      case 'quebras':
        return <QuebrasPanel user={user} empresa={empresa} theme={theme} />;
      case 'validades':
        return <ConferentePanel user={user} empresa={empresa} theme={theme} initialTab="validade" />;
      case 'refugo':
        return <RefugoPanel user={user} empresa={empresa} theme={theme} />;
      case 'empilhador':
        return <EmpilhadorPanel user={user} empresa={empresa} theme={theme} />;
      case 'conferente':
        return <ConferentePanel user={user} empresa={empresa} theme={theme} />;
      case 'registros':
        return <SimulacaoAcoesPanel user={user} empresa={empresa} onNavigate={setActivePanel} initialTab="governanca" />;
      case 'acessos':
        return <SimulacaoAcoesPanel user={user} empresa={empresa} onNavigate={setActivePanel} initialTab="acoes" />;
      case 'cadastros':
        return <CadastrosPanel user={user} empresa={empresa} theme={theme} />;
      case 'controle':
        return <ControlePanel user={user} empresa={empresa} theme={theme} />;
      case 'acoes':
        return <SimulacaoAcoesPanel user={user} empresa={empresa} onNavigate={setActivePanel} initialTab="acoes" />;
      case 'firebase':
        return <FirebasePanel theme={theme} />;
      case 'exportar':
        return <ExportarPanel user={user} empresa={empresa} theme={theme} />;
      case 'politica-estoque':
        return <GestaoCapacidadeDashboard user={user} empresa={empresa} theme={theme} initialTab="politica-estoque" onBack={() => setActivePanel('visao-geral')} />;
      case 'importacao-contagens':
        return <EstoqueHub user={user} initialTab="importacao-contagens" />;
      case 'area-contingencia':
        return <EstoqueHub user={user} initialTab="area-contingencia" />;
      case 'venda-media':
        return <EstoqueHub user={user} initialTab="venda-media" />;
      case 'plataformas-externas':
        return <PlataformasExternasPanel user={user} theme={theme} />;
      case 'auditoria-dpo':
        return <AuditoriaDpoPanel user={user} empresa={empresa} theme={theme} onNavigate={setActivePanel} />;
      case 'treinamentos-qualidade':
        return <TreinamentosQualidadePanel user={user} empresa={empresa} theme={theme} />;
      case 'bloqueio-armazem':
        return <BloqueioArmazemPanel user={user} empresa={empresa} theme={theme} />;
      case 'devolucao':
        return <DevolucaoPanel user={user} empresa={empresa} theme={theme} />;
      case 'contagem-inventario':
        return <ContagemInventarioPanel user={user} empresa={empresa} theme={theme} />;
      case 'gestao-ativos':
        return <GestaoAtivosPanel user={user} empresa={empresa} theme={theme} />;
      case 'qualidade-puxada':
        return <QualidadePuxadaPanel user={user} empresa={empresa} theme={theme} />;
      case 'gestao-wlp':
      case 'wlp-dashboard':
        return <WlpDashboard user={user} empresaId={empresa?.id || 'demo'} />;
      case 'ciclo-carretas':
        return <CicloCarretasPanel user={user} empresa={empresa} theme={theme} />;
      case 'padronizacao-processos':
        return <PadraoOperacionalPanel user={user} theme={theme} />;
      case 'simulacao-acoes':
        return <SimulacaoAcoesPanel user={user} />;
      case 'dados-retroativos':
        return <DadosRetroativosPanel user={user} />;
      case 'simulador-ressuprimento':
        return <SimuladorRessuprimentoPanel user={user} />;
      case 'ranking-produtividade':
        return <RankingModule user={user} />;
      case 'qualidade':
        return <QualidadePanel user={user} empresa={empresa} theme={theme} />;
      case 'eficiencia-montagem':
        return <EficienciaMontagemPanel user={user} />;
      case 'kpi-arvore':
        return <TreeKpiViewer user={user} />;
      case 'agenda-executiva':
        return (
          <DashboardOverview 
            user={user} 
            empresa={empresa} 
            onNavigate={setActivePanel} 
            theme={theme}
            initialTab="agenda"
            kpiStats={{
              usuarios: 3,
              modulos: empresa?.modulos ? empresa.modulos.length : 6,
              docsHoje: 12,
              alertasFefo: 4
            }}
          />
        );
      case 'diario-bordo':
        return (
          <DashboardOverview 
            user={user} 
            empresa={empresa} 
            onNavigate={setActivePanel} 
            theme={theme}
            initialTab="diario_bordo"
            kpiStats={{
              usuarios: 3,
              modulos: empresa?.modulos ? empresa.modulos.length : 6,
              docsHoje: 12,
              alertasFefo: 4
            }}
          />
        );
      case 'reunioes':
        return (
          <DashboardOverview 
            user={user} 
            empresa={empresa} 
            onNavigate={setActivePanel} 
            theme={theme}
            initialTab="reunioes"
            kpiStats={{
              usuarios: 3,
              modulos: empresa?.modulos ? empresa.modulos.length : 6,
              docsHoje: 12,
              alertasFefo: 4
            }}
          />
        );
      default:
        return (
          <DashboardOverview 
            user={user} 
            empresa={empresa} 
            onNavigate={setActivePanel} 
            theme={theme}
            kpiStats={{
              usuarios: 3,
              modulos: empresa?.modulos ? empresa.modulos.length : 6,
              docsHoje: 12,
              alertasFefo: 4
            }}
          />
        );
    }
  };

  const getHeaderInfo = (panel: string) => {
    const defaultInfo = {
      breadcrumbs: ['Pau Brasil', 'Painel'],
      title: 'Painel Geral',
      subtitle: 'Controle de retornos e conciliação de rotas.',
      color: 'from-[#1e56f0]/5 to-transparent'
    };
    
    switch (panel) {
      case 'cat-produtividade':
        return {
          breadcrumbs: ['Início', 'Produtividade'],
          title: 'Produtividade',
          subtitle: 'Visão geral e índice de módulos de apontamento operacional.',
          color: 'from-amber-500/10 to-transparent'
        };
      case 'cat-dashboards':
        return {
          breadcrumbs: ['Início', 'Dashboards'],
          title: 'Dashboards & BI',
          subtitle: 'Visão geral e índice de painéis executivos e estatísticas.',
          color: 'from-sky-500/10 to-transparent'
        };
      case 'cat-ferramentas-gestao':
        return {
          breadcrumbs: ['Início', 'Ferramentas de Gestão'],
          title: 'Ferramentas de Gestão',
          subtitle: 'Mecanismos de governança, DPO, inventário e planejamento.',
          color: 'from-purple-500/10 to-transparent'
        };
      case 'cat-cadastros':
        return {
          breadcrumbs: ['Início', 'Cadastros'],
          title: 'Cadastros Unificados',
          subtitle: 'Base mestre de produtos, colaboradores e permissões.',
          color: 'from-emerald-500/10 to-transparent'
        };
      case 'cat-dados-acoes':
        return {
          breadcrumbs: ['Início', 'Dados e Ações'],
          title: 'Dados e Ações',
          subtitle: 'Base de dados central, expurgo/importação e planos de ação.',
          color: 'from-indigo-500/10 to-transparent'
        };
      case 'visao-geral':
        return {
          breadcrumbs: ['Início', 'Workstation'],
          title: 'Workstation (Centro de Controle)',
          subtitle: 'Acompanhamento em tempo real das movimentações, alertas de vencimento e produtividade do pátio.',
          color: 'from-[#1e56f0]/10 to-transparent'
        };
      case 'qualidade':
        return {
          breadcrumbs: ['Controle de Qualidade', 'Qualidade Armazém'],
          title: 'QUALIDADE - 5S, Temperatura & Pragas',
          subtitle: 'Gestão integrada do Controle de Temperatura do Armazém, Programa 5S de 14 Setores e Laudos Quinzenais de Pragas (PDF).',
          color: 'from-amber-500/10 to-transparent'
        };
      case 'repack-dashboard':
        return {
          breadcrumbs: ['Dashboard', 'Dashboard Repack'],
          title: 'Dashboard Repack',
          subtitle: 'Análise de performance, produtividade de operadores e eficiência de reembalagem.',
          color: 'from-purple-500/10 to-transparent'
        };
      case 'wlp-dashboard':
      case 'gestao-wlp':
        return {
          breadcrumbs: ['Dashboard', 'Dashboard WLP'],
          title: 'Dashboard WLP (HL/HH) & Apontamento de Jornadas',
          subtitle: 'Workload Planning (HL/HH), horas médias trabalhadas, fechamento de faturamento (21h) e controle DPO de horas extras.',
          color: 'from-amber-500/10 to-transparent'
        };
      case 'despejo-dashboard':
        return {
          breadcrumbs: ['Dashboard', 'Dashboard Despejo'],
          title: 'Dashboard Despejo',
          subtitle: 'Monitoramento corporativo de descarte de líquidos e eficiência operacional.',
          color: 'from-rose-500/10 to-transparent'
        };
      case 'logistica-dashboard':
        return {
          breadcrumbs: ['Dashboard', 'Dashboard Operadores'],
          title: 'Dashboard Operadores (Unificado)',
          subtitle: 'Visão unificada: Empilhadores & Picking, EFC / EFD, TMR e Planos de Ação Corretiva.',
          color: 'from-amber-500/10 to-transparent'
        };
      case 'quebras-dashboard':
        return {
          breadcrumbs: ['Dashboard', 'Dashboard Quebras'],
          title: 'Dashboard Quebras',
          subtitle: 'Análise detalhada de avarias, perdas por setor e motivos de quebra.',
          color: 'from-sky-500/10 to-transparent'
        };
      case 'fefo-dashboard':
        return {
          breadcrumbs: ['Dashboard', 'Dashboard FEFO'],
          title: 'Dashboard FEFO (Validades)',
          subtitle: 'Indicadores de produtos próximos ao vencimento, lotes em risco e perdas evitadas.',
          color: 'from-emerald-500/10 to-transparent'
        };
      case 'gestao-capacidade':
        return {
          breadcrumbs: ['Dashboard', 'Gestão de Capacidade'],
          title: 'Gestão de Capacidade do Armazém',
          subtitle: 'Monitoramento de ocupação (Central, Picking, Marketplace) com inteligência de transbordo.',
          color: 'from-emerald-500/10 to-transparent'
        };
      case 'picking-dashboard':
        return {
          breadcrumbs: ['Dashboard', 'Dashboard Picking'],
          title: 'Dashboard Picking e Abastecimento',
          subtitle: 'Gargalos operacionais, eficiência de turnos, telemetria de empilhadeira e produtividade.',
          color: 'from-[#1e56f0]/10 to-transparent'
        };
      case 'repack':
        return {
          breadcrumbs: ['Setores de Operação', 'Operação Repack'],
          title: 'Operação Repack',
          subtitle: 'Área para operadores registrarem produtividade e volumes reembalados.',
          color: 'from-purple-500/10 to-transparent'
        };
      case 'despejo':
        return {
          breadcrumbs: ['Setores de Operação', 'Operação Despejo'],
          title: 'Operação Despejo',
          subtitle: 'Lançamento de SKUs de garrafas e líquidos destinados a descarte.',
          color: 'from-rose-500/10 to-transparent'
        };
      case 'armazem':
        return {
          breadcrumbs: ['Setores de Operação', 'Operação Empilhador'],
          title: 'Operação Empilhador',
          subtitle: 'Atendimento de demandas unificadas (EFC/EFD, R&R e TMR) para operadores de empilhadeira.',
          color: 'from-amber-500/10 to-transparent'
        };
      case 'quebras':
        return {
          breadcrumbs: ['Setores de Operação', 'Operação Quebras'],
          title: 'Operação Quebras',
          subtitle: 'Registro imediato de avarias físicas identificadas nas ruas de estoque.',
          color: 'from-red-500/10 to-transparent'
        };
      case 'validades':
        return {
          breadcrumbs: ['Setores de Operação', 'Operação Validade'],
          title: 'Operação Validade',
          subtitle: 'Cadastro de lotes e datas de vencimento para controle de giro (FEFO).',
          color: 'from-emerald-500/10 to-transparent'
        };
      case 'refugo':
        return {
          breadcrumbs: ['Setores de Operação', 'Operação Retorno de Rota'],
          title: 'Operação Retorno de Rota',
          subtitle: 'Acompanhamento e aferimento de retorno de rotas de entrega e devoluções.',
          color: 'from-indigo-500/10 to-transparent'
        };
      case 'empilhador':
        return {
          breadcrumbs: ['Setores de Operação', 'Operação Empilhador'],
          title: 'Operação Empilhador',
          subtitle: 'Atendimento de demandas unificadas (EFC/EFD, R&R e TMR) para operadores de empilhadeira.',
          color: 'from-amber-500/10 to-transparent'
        };
      case 'tmr-dashboard':
        return {
          breadcrumbs: ['Dashboard', 'Dashboard TMR'],
          title: 'Dashboard TMR — Tempo Médio de Revenda',
          subtitle: 'Métricas de tempo médio de permanência na revenda para carretas (meta 1h10) e recargas (meta 40min).',
          color: 'from-amber-500/10 to-transparent'
        };
      case 'conferente':
        return {
          breadcrumbs: ['Setores de Operação', 'Conferente/ADM'],
          title: 'Conferente/ADM',
          subtitle: 'Ecossistema Conferente/ADM — Importação EFC/EFD (03.11.49.02), classificação de pátio e atribuição de colaboradores.',
          color: 'from-teal-500/10 to-transparent'
        };
      case 'registros':
        return {
          breadcrumbs: ['Administração & Gestão', 'Registros de Setores'],
          title: 'Registros de Setores',
          subtitle: 'Visão unificada para acessar os lançamentos e auditorias de todas as frentes de trabalho.',
          color: 'from-emerald-500/10 to-transparent'
        };
      case 'acessos':
        return {
          breadcrumbs: ['Administração & Gestão', 'Controle de Acessos'],
          title: 'Controle de Acessos e Segurança',
          subtitle: 'Auditoria de logins, sessões ativas, horários de entrada/saída e navegação de abas.',
          color: 'from-indigo-500/10 to-transparent'
        };
      case 'cadastros':
        return {
          breadcrumbs: ['Administração & Gestão', 'Cadastros Gerais'],
          title: 'Cadastros Centralizados (Produtos, Colaboradores & Acessos)',
          subtitle: 'Single Source of Truth para o cadastro mestre da unidade.',
          color: 'from-emerald-500/10 to-transparent'
        };
      case 'controle':
        return {
          breadcrumbs: ['Administrativo', 'Painel Controle'],
          title: 'Painel Controle',
          subtitle: 'Gerenciamento de operadores, atribuição de senhas, liberação de turnos.',
          color: 'from-[#1e56f0]/10 to-transparent'
        };
      case 'acoes':
        return {
          breadcrumbs: ['Administração & Gestão', 'Gestão de Ações'],
          title: 'Gestão de Ações & Alertas Operacionais',
          subtitle: 'Acompanhamento de desvios, ocorrências e planos de ação registrados.',
          color: 'from-emerald-500/10 to-transparent'
        };
      case 'exportar':
        return {
          breadcrumbs: ['Sistemas', 'Base de Dados Central'],
          title: 'Base de Dados',
          subtitle: 'Gerenciamento de colaboradores por processo, produtos mestre, metas por operação, importação/expurgo e relatórios.',
          color: 'from-sky-500/10 to-transparent'
        };
      case 'politica-estoque':
        return {
          breadcrumbs: ['Gestão de Estoque', 'Política de Estoque'],
          title: 'Dashboard Política de Estoque (6 Dias)',
          subtitle: 'Aderência à política oficial, alertas de overstock e faltas teóricas.',
          color: 'from-[#1e56f0]/10 to-transparent'
        };
      case 'importacao-contagens':
        return {
          breadcrumbs: ['Gestão de Estoque', 'Importação de Contagens'],
          title: 'Importação de Contagens Físicas',
          subtitle: 'Ambiente exclusivo Drag & Drop para Central, Picking e Marketplace.',
          color: 'from-sky-500/10 to-transparent'
        };
      case 'area-contingencia':
        return {
          breadcrumbs: ['Gestão de Estoque', 'Área de Contingência'],
          title: 'Gestão de Estoque em Contingência',
          subtitle: 'Alocação manual de itens e rastreamento de histórico com observações.',
          color: 'from-amber-500/10 to-transparent'
        };
      case 'venda-media':
        return {
          breadcrumbs: ['Gestão de Estoque', 'Importação Venda Média'],
          title: 'Importação de Venda Média Diária',
          subtitle: 'Carga dos dados de saída diária para cálculo do estoque ideal.',
          color: 'from-teal-500/10 to-transparent'
        };
      case 'plataformas-externas':
        return {
          breadcrumbs: ['Ferramentas de Gestão', 'Plataformas Externas'],
          title: 'Plataforma Retorno de Rota, Trocas & Reposições',
          subtitle: 'Ferramentas de Gestão com links de redirecionamento para Plataforma de Retorno de Rota e Plataforma de Trocas e Reposições.',
          color: 'from-amber-500/10 to-transparent'
        };
      case 'agenda-executiva':
        return {
          breadcrumbs: ['Ferramentas de Gestão', 'Agenda Executiva'],
          title: 'Agenda Executiva & Compromissos',
          subtitle: 'Compromissos do dia, semana e mês no Workstation Executivo.',
          color: 'from-blue-500/10 to-transparent'
        };
      case 'diario-bordo':
        return {
          breadcrumbs: ['Ferramentas de Gestão', 'Diário de Bordo'],
          title: 'Diário de Bordo do Colaborador',
          subtitle: 'Anotações diárias, treinamentos e lembretes individuais.',
          color: 'from-amber-500/10 to-transparent'
        };
      case 'reunioes':
        return {
          breadcrumbs: ['Ferramentas de Gestão', 'Reuniões e Treinamentos'],
          title: 'Reuniões e Treinamentos',
          subtitle: 'Frequência, materiais, atas em PDF, alertas diários, Team Room e troca de turno.',
          color: 'from-indigo-500/10 to-transparent'
        };
      case 'firebase':
        return {
          breadcrumbs: ['Sistemas', 'Status do Banco'],
          title: 'Conexão Firestore',
          subtitle: 'Configuração e teste de latência do banco de dados na nuvem corporativa.',
          color: 'from-sky-500/10 to-transparent'
        };
      default:
        return defaultInfo;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex flex-col items-center justify-center text-[#1f2937] dark:text-[#f8fafc]">
        <motion.div 
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center select-none"
        >
          <BrandLogo size="xl" variant="icon-only" className="mb-6 animate-bounce" />
          <div className="w-8 h-8 border-3 border-t-transparent border-[#1e56f0] rounded-full animate-spin mb-4"></div>
          <span className="text-xs font-black tracking-[3px] text-[#1e56f0] uppercase">PAU BRASIL DISTRIBUIDORA</span>
          <span className="text-[10px] text-[#6b7280] dark:text-[#94a3b8] uppercase tracking-[2px] mt-1.5 font-bold">Carregando Unidade Guarabira...</span>
        </motion.div>
      </div>
    );
  }

  // Active view layout branches: DIRECT LOGIN SCREEN (No intermediate landing page)
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0b0e14] via-[#0e131d] to-[#07090d] text-[#1f2937] overflow-x-hidden flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <LoginAuth 
            onAuthSuccess={handleAuthSuccess} 
            onBackToLanding={() => {}} 
          />
        </div>
        <div id="toast" className="toast">Notificação do Co-pilot</div>
      </div>
    );
  }

  const headerInfo = getHeaderInfo(activePanel);

  return (
    <EmpresaDataProvider empresaId={empresa?.id || user?.empresaId || null}>
      <div className={`min-h-screen flex flex-col md:flex-row font-sans overflow-x-hidden ${
        theme === 'dark' ? 'bg-[#07090d] text-[#e8eef5]' : 'bg-white text-slate-800'
      }`}>
        
        {/* Sidebar navigation */}
        <Sidebar 
          user={user} 
          empresa={empresa} 
          activeTab={activePanel} 
          onSelectTab={navigateToPanel} 
          onLogout={handleLogout}
          isFbOnline={isCustomFirebaseConnected()}
          theme={theme}
          onToggleTheme={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
        />

        {/* Main workspace arena with smooth tab switching */}
        <div className={`flex-1 flex flex-col min-h-screen max-h-screen overflow-y-auto overflow-x-hidden w-full max-w-full ${
          theme === 'dark' ? 'bg-[#07090d]' : 'bg-white'
        }`}>
          
          {/* Workspace Top Header (Glassmorphic & Premium) */}
          <header className={`sticky top-0 z-30 backdrop-blur-md pl-14 pr-4 md:px-5 py-1 h-11 md:h-12 flex items-center justify-between gap-4 border-b ${
            theme === 'dark' 
              ? 'bg-[#07090d]/85 border-[#1c2530]' 
              : 'bg-white/95 border-slate-200 shadow-sm'
          }`}>
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Back & Forward History Navigation Buttons */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={handleGoBack}
                  disabled={!canGoBack}
                  className={`p-1.5 rounded-lg border transition-all flex items-center justify-center ${
                    canGoBack
                      ? theme === 'dark'
                        ? 'bg-[#151b23] border-[#222d3a] text-amber-400 hover:text-amber-300 hover:bg-slate-800 hover:border-amber-500/40 cursor-pointer shadow-xs'
                        : 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200 shadow-xs cursor-pointer'
                      : 'opacity-30 cursor-not-allowed bg-transparent border-slate-700/30 text-slate-500'
                  }`}
                  title={canGoBack ? "Retornar para a tela anterior (Voltar)" : "Sem histórico anterior"}
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleGoForward}
                  disabled={!canGoForward}
                  className={`p-1.5 rounded-lg border transition-all flex items-center justify-center ${
                    canGoForward
                      ? theme === 'dark'
                        ? 'bg-[#151b23] border-[#222d3a] text-amber-400 hover:text-amber-300 hover:bg-slate-800 hover:border-amber-500/40 cursor-pointer shadow-xs'
                        : 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200 shadow-xs cursor-pointer'
                      : 'opacity-30 cursor-not-allowed bg-transparent border-slate-700/30 text-slate-500'
                  }`}
                  title={canGoForward ? "Avançar para a próxima tela" : "Sem histórico posterior"}
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Sidebar toggle button (visible when collapsed or for quick toggle) */}
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(prev => !prev)}
                className={`hidden md:flex items-center justify-center p-1.5 rounded-lg border transition-all cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-[#151b23] border-[#222d3a] text-slate-300 hover:text-white hover:border-slate-600'
                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-200'
                }`}
                title={isSidebarCollapsed ? "Mostrar Menu Lateral" : "Ocultar Menu Lateral (Maximizar Tela)"}
              >
                {isSidebarCollapsed ? <PanelLeftOpen className="w-4 h-4 text-amber-400" /> : <PanelLeftClose className="w-4 h-4 text-slate-400" />}
              </button>

              {/* Brand Logo icon on mobile */}
              <div className="md:hidden flex items-center flex-shrink-0">
                <BrandLogo variant="icon-only" size="sm" iconSize="sm" />
              </div>
              {/* Page title */}
              <h1 className={`font-sans font-black text-xs md:text-[13px] tracking-tight uppercase truncate flex-shrink-0 ${
                theme === 'dark' ? 'text-white' : 'text-slate-800'
              }`}>
                {headerInfo.title}
              </h1>
              <span className={`hidden xl:inline text-[8px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider border ${
                theme === 'dark' 
                  ? 'bg-[#11151c] border-[#1c2530] text-[#6a7d92]' 
                  : 'bg-slate-100 border-slate-200 text-slate-500'
              }`}>
                {activePanel}
              </span>
              <div className={`hidden sm:block w-[1px] h-3 ${theme === 'dark' ? 'bg-[#1c2530]' : 'bg-slate-200'}`} />
              {/* Breadcrumbs */}
              <div className="hidden sm:flex items-center gap-1.5 text-[8.5px] uppercase font-black tracking-widest text-[#6a7d92] truncate">
                <span>{headerInfo.breadcrumbs[0]}</span>
                {headerInfo.breadcrumbs[1] && (
                  <>
                    <span className={`font-bold ${theme === 'dark' ? 'text-[#1c2530]' : 'text-slate-300'}`}>/</span>
                    <span className="text-[#1e56f0]">{headerInfo.breadcrumbs[1]}</span>
                  </>
                )}
              </div>
            </div>

            {/* Quick Stats / System Health widget aligned horizontally */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {/* OPERATIONAL NOTIFICATION BELL */}
              <OperationalNotificationBell user={user} onNavigate={navigateToPanel} />

              {/* YELLOW "IR PARA OPERAÇÃO" BUTTON - Visible for all logged users */}
              {user && (
                <button
                  type="button"
                  onClick={() => {
                    const targetOp = getUserOperationPanel(user);
                    navigateToPanel(targetOp);
                  }}
                  className="bg-amber-400 hover:bg-amber-300 text-slate-950 px-2.5 py-1 md:px-3 md:py-1 rounded-lg font-black text-[10px] md:text-[11px] uppercase tracking-wider shadow-md hover:scale-105 transition-all cursor-pointer flex items-center gap-1 border border-amber-300"
                  title="Ir diretamente para a tela da operação vinculada ao seu perfil"
                >
                  <Zap className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
                  <span className="whitespace-nowrap font-black">Ir para Operação</span>
                </button>
              )}

              {/* Theme Toggle Button */}
              <button
                type="button"
                onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
                className={`px-2 py-1 rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  theme === 'dark'
                    ? 'bg-[#151b23] border-[#222d3a] text-amber-400 hover:text-amber-300 hover:border-amber-400/40 shadow-xs'
                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:text-[#1e56f0] hover:bg-slate-200/80 shadow-xs'
                }`}
                title={theme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
              >
                {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-700" />}
                <span className="text-[9px] font-extrabold uppercase tracking-wider hidden sm:inline">
                  {theme === 'dark' ? 'Claro' : 'Escuro'}
                </span>
              </button>

              <div className={`text-[9px] md:text-[10px] font-bold uppercase tracking-wider hidden md:block ${
                theme === 'dark' ? 'text-white' : 'text-slate-700'
              }`}>
                Operador: <span className="text-[#1e56f0]">{user.nome?.split(' ')[0]}</span>
              </div>
              <HeaderClock theme={theme} />
              <div className={`w-[1px] h-3.5 hidden sm:block ${theme === 'dark' ? 'bg-[#1c2530]' : 'bg-slate-200'}`} />
              {/* Live Indicator Widget */}
              <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8.5px] font-sans font-black tracking-widest border ${
                theme === 'dark' 
                  ? 'bg-[#11151c] border-[#1c2530] text-[#6a7d92]' 
                  : 'bg-slate-100 border-slate-200 text-slate-600'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-[#1e56f0]" />
                <span className={`uppercase ${theme === 'dark' ? 'text-gray-300' : 'text-slate-700'}`}>SISTEMA ATIVO</span>
              </div>
            </div>
          </header>

          {/* Inner Content Body */}
          <main className="flex-1 p-2 md:p-3 lg:p-4.5 relative">
            
            {/* Subtle decorative glow */}
            <div className={`absolute top-0 left-0 w-96 h-96 bg-gradient-to-br ${headerInfo.color} rounded-full blur-3xl pointer-events-none opacity-40 z-0`} />

            <div className={`relative z-10 ${activePanel.endsWith('-dashboard') ? 'max-w-full px-1' : 'max-w-[1300px]'} mx-auto w-full transition-all duration-300`}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activePanel}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                >
                  {renderActivePanel()}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>

        {/* Floating dynamic status toaster */}
        <div id="toast" className="toast">Notificação de Pátio</div>

        {/* FLOATING BUTTON FOR DPO AI AGENT */}
        <button
          onClick={() => setIsDpoAgentOpen(true)}
          className="fixed bottom-5 right-5 z-40 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white p-3.5 rounded-full shadow-2xl flex items-center gap-2 font-black text-xs cursor-pointer border-2 border-white/20 hover:scale-105 transition-all group"
          title="Consultar Agente de IA DPO"
        >
          <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping absolute -top-0.5 -right-0.5" />
          <span className="w-3 h-3 rounded-full bg-emerald-400 absolute -top-0.5 -right-0.5" />
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="hidden sm:inline font-mono tracking-wider uppercase text-[11px]">Agente DPO IA</span>
        </button>

        {/* AGENTE DPO MODAL */}
        {user && (
          <AgenteDpoModal
            user={user}
            isOpen={isDpoAgentOpen}
            onClose={() => setIsDpoAgentOpen(false)}
            onNavigateToActions={() => {
              setIsDpoAgentOpen(false);
              setActivePanel('simulacao-acoes');
            }}
          />
        )}
      </div>
    </EmpresaDataProvider>
  );
}