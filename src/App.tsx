import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import LoginAuth from './components/LoginAuth';
import Sidebar from './components/Sidebar';
import { BrandLogo } from './components/BrandLogo';
import DashboardOverview from './components/DashboardOverview';
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
import BlitzDashboard from './components/BlitzDashboard';
import PickingDashboard from './components/PickingDashboard';
import RegistrosPanel from './components/RegistrosPanel';
import AcessosPanel from './components/AcessosPanel';

import { auth, db, isCustomFirebaseConnected } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Usuario, Empresa } from './types';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<Usuario | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [activePanel, setActivePanel] = useState<string>('landing');
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', { hour12: false }));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

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
            const localSessions = JSON.parse(localStorage.getItem(`local_acessos_${empresaId}`) || '[]');
            localSessions.unshift({ id: currentSessionId, ...newSession });
            localStorage.setItem(`local_acessos_${empresaId}`, JSON.stringify(localSessions.slice(0, 100)));
          }
        } else {
          // No DB, handle locally
          currentSessionId = 'local_' + Date.now();
          sessionStorage.setItem(sessionKey, currentSessionId);
          const localSessions = JSON.parse(localStorage.getItem(`local_acessos_${empresaId}`) || '[]');
          localSessions.unshift({ id: currentSessionId, ...newSession });
          localStorage.setItem(`local_acessos_${empresaId}`, JSON.stringify(localSessions.slice(0, 100)));
        }
      } else {
        // Update existing session
        if (db && !currentSessionId.startsWith('local_')) {
          try {
            const { doc, getDoc, updateDoc } = await import('firebase/firestore');
            const docRef = doc(db, 'acessos', currentSessionId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              const data = docSnap.data();
              const existingAbas = data.abasAcessadas || [];
              const updatedAbas = existingAbas.includes(activePanel) 
                ? existingAbas 
                : [...existingAbas, activePanel];
              const existingAtividades = data.atividades || [];
              
              // Only add if the last activity was a different panel
              const lastAct = existingAtividades[existingAtividades.length - 1];
              const updatedAtividades = lastAct?.aba === activePanel 
                ? existingAtividades 
                : [...existingAtividades, activityItem];

              await updateDoc(docRef, {
                ultimoAcesso: nowStr,
                abasAcessadas: updatedAbas,
                atividades: updatedAtividades
              });
            }
          } catch (e) {
            console.error('Error updating access log in Firestore:', e);
          }
        } else {
          // Local fallback update
          const localSessions = JSON.parse(localStorage.getItem(`local_acessos_${empresaId}`) || '[]');
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
            localStorage.setItem(`local_acessos_${empresaId}`, JSON.stringify(localSessions));
          }
        }
      }
    };

    trackSession();
  }, [user, activePanel]);

  // Sync theme to body element and localStorage
  useEffect(() => {
    document.body.classList.add('light-theme');
    try {
      localStorage.setItem('af-theme', 'light');
    } catch (e) {
      // ignore
    }
  }, []);

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
            setActivePanel('visao-geral');
          }
        } catch(e) {
          console.error('Error syncing auth metadata', e);
        }
      } else {
        setUser(null);
        setEmpresa(null);
        setActivePanel('landing');
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
            localStorage.setItem(`local_acessos_${empresaId}`, JSON.stringify(localSessions));
          }
        }
        sessionStorage.removeItem(sessionKey);
      }
    }

    if (auth) {
      await signOut(auth);
    }
    setUser(null);
    setEmpresa(null);
    setActivePanel('landing');
    setShowAuthGate(false);
  };

  // Main navigation orchestration router
  const renderActivePanel = () => {
    if (!user) {
      return null;
    }

    switch (activePanel) {
      case 'dashboard':
      case 'visao-geral':
        return (
          <DashboardOverview 
            user={user} 
            empresa={empresa} 
            onNavigate={setActivePanel} 
            kpiStats={{
              usuarios: 3,
              modulos: empresa?.modulos ? empresa.modulos.length : 6,
              docsHoje: 12,
              alertasFefo: 4
            }}
          />
        );
      case 'repack':
        return <RepackPanel user={user} empresa={empresa} />;
      case 'repack-dashboard':
        return <RepackDashboard user={user} empresa={empresa} onBack={() => setActivePanel('visao-geral')} />;
      case 'despejo-dashboard':
        return <DespejoDashboard user={user} empresa={empresa} onBack={() => setActivePanel('visao-geral')} />;
      case 'logistica-dashboard':
        return <LogisticaDashboard user={user} empresa={empresa} onBack={() => setActivePanel('visao-geral')} />;
      case 'quebras-dashboard':
        return <QuebrasDashboard user={user} empresa={empresa} onBack={() => setActivePanel('visao-geral')} />;
      case 'fefo-dashboard':
        return <FefoDashboard user={user} empresa={empresa} onBack={() => setActivePanel('visao-geral')} />;
      case 'blitz-dashboard':
        return <BlitzDashboard user={user} empresa={empresa} onBack={() => setActivePanel('visao-geral')} />;
      case 'picking-dashboard':
        return <PickingDashboard user={user} empresa={empresa} onBack={() => setActivePanel('visao-geral')} />;
      case 'despejo':
        return <DespejoPanel user={user} empresa={empresa} />;
      case 'armazem':
        return <ArmazemPanel user={user} empresa={empresa} />;
      case 'quebras':
        return <QuebrasPanel user={user} empresa={empresa} />;
      case 'validades':
        return <ValidadesPanel user={user} empresa={empresa} />;
      case 'refugo':
        return <RefugoPanel user={user} empresa={empresa} />;
      case 'empilhador':
        return <EmpilhadorPanel user={user} empresa={empresa} />;
      case 'conferente':
        return <ConferentePanel user={user} empresa={empresa} />;
      case 'registros':
        return <RegistrosPanel user={user} empresa={empresa} onNavigate={setActivePanel} />;
      case 'acessos':
        return <AcessosPanel user={user} empresa={empresa} />;
      case 'controle':
        return <ControlePanel user={user} empresa={empresa} />;
      case 'firebase':
        return <FirebasePanel />;
      case 'exportar':
        return <ExportarPanel user={user} empresa={empresa} />;
      default:
        return (
          <DashboardOverview 
            user={user} 
            empresa={empresa} 
            onNavigate={setActivePanel} 
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
      case 'visao-geral':
        return {
          breadcrumbs: ['Início', 'Visão Geral'],
          title: 'Visão Geral do Pátio',
          subtitle: 'Acompanhamento em tempo real das movimentações, alertas de vencimento e produtividade do pátio.',
          color: 'from-[#1e56f0]/10 to-transparent'
        };
      case 'repack-dashboard':
        return {
          breadcrumbs: ['Dashboard', 'Dashboard Repack'],
          title: 'Dashboard Repack',
          subtitle: 'Análise de performance, produtividade de operadores e eficiência de reembalagem.',
          color: 'from-purple-500/10 to-transparent'
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
          breadcrumbs: ['Dashboard', 'Dashboard EFC EFD'],
          title: 'Dashboard EFC EFD',
          subtitle: 'Análise de tempos de carregamento, janelas logísticas e fluxo de caminhões.',
          color: 'from-sky-500/10 to-transparent'
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
      case 'blitz-dashboard':
        return {
          breadcrumbs: ['Dashboard', 'Dashboard Blitz'],
          title: 'Dashboard Blitz (Refugo)',
          subtitle: 'Monitoramento de blitz preventivas e refugo de embalagens recuperáveis.',
          color: 'from-indigo-500/10 to-transparent'
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
          subtitle: 'Lançamento de caixas de garrafas e líquidos destinados a descarte.',
          color: 'from-rose-500/10 to-transparent'
        };
      case 'armazem':
        return {
          breadcrumbs: ['Setores de Operação', 'Operação EFC / EFD'],
          title: 'Operação EFC / EFD',
          subtitle: 'Controle de fluxo de carretas, carregamento e janelas logísticas de faturamento.',
          color: 'from-sky-500/10 to-transparent'
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
          breadcrumbs: ['Setores de Operação', 'Operação Blitz Refugo'],
          title: 'Operação Blitz Refugo',
          subtitle: 'Auditoria de caixas descartadas para detecção de itens aproveitáveis.',
          color: 'from-indigo-500/10 to-transparent'
        };
      case 'empilhador':
        return {
          breadcrumbs: ['Setores de Operação', 'Operação Picking'],
          title: 'Operação Picking',
          subtitle: 'Atribuição and acompanhamento de tarefas para operadores de empilhadeira.',
          color: 'from-sky-500/10 to-transparent'
        };
      case 'conferente':
        return {
          breadcrumbs: ['Setores de Operação', 'Operação Conferênte'],
          title: 'Operação Conferênte',
          subtitle: 'Validação de volumes expedidos, recebimentos e auditoria de pallets.',
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
      case 'controle':
        return {
          breadcrumbs: ['Administrativo', 'Painel Controle'],
          title: 'Painel Controle',
          subtitle: 'Gerenciamento de operadores, atribuição de senhas, liberação de turnos.',
          color: 'from-[#1e56f0]/10 to-transparent'
        };
      case 'exportar':
        return {
          breadcrumbs: ['Sistemas', 'Exportador de Dados'],
          title: 'Exportar Base',
          subtitle: 'Extração unificada de relatórios operacionais em formato CSV e planilhas.',
          color: 'from-gray-500/10 to-transparent'
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

  // Active view layout branches
  if (!user) {
    return (
      <div className={`min-h-screen ${showAuthGate ? 'bg-gradient-to-b from-[#eef2f7] to-[#ffffff]' : 'bg-[#07090d]'} text-[#1f2937] overflow-x-hidden transition-colors duration-300`}>
        <AnimatePresence mode="wait">
          {showAuthGate ? (
            <motion.div 
              key="auth-gate"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="relative min-h-screen py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center bg-transparent"
            >
              {/* Absolute close button */}
              <button 
                onClick={() => setShowAuthGate(false)} 
                className="absolute top-6 right-6 p-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer tracking-wider uppercase transition-all"
              >
                ✕ Voltar ao Início
              </button>
              <div className="w-full max-w-lg">
                <LoginAuth 
                  onAuthSuccess={handleAuthSuccess} 
                  onBackToLanding={() => setShowAuthGate(false)} 
                />
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="landing-page"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <LandingPage onEnterApp={() => setShowAuthGate(true)} />
            </motion.div>
          )}
        </AnimatePresence>
        <div id="toast" className="toast">Notificação do Co-pilot</div>
      </div>
    );
  }

  const headerInfo = getHeaderInfo(activePanel);

  return (
    <div className="min-h-screen bg-[#07090d] text-[#e8eef5] flex flex-col md:flex-row font-sans overflow-x-hidden">
      
      {/* Sidebar navigation */}
      <Sidebar 
        user={user} 
        empresa={empresa} 
        activeTab={activePanel} 
        onSelectTab={setActivePanel} 
        onLogout={handleLogout}
        isFbOnline={isCustomFirebaseConnected()}
        theme={theme}
        onToggleTheme={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
      />

      {/* Main workspace arena with smooth tab switching */}
      <div className="flex-1 flex flex-col min-h-screen max-h-screen overflow-y-auto overflow-x-hidden w-full max-w-full">
        
        {/* Workspace Top Header (Glassmorphic & Premium) */}
        <header className="sticky top-0 z-30 bg-[#07090d]/85 backdrop-blur-md border-b border-[#1c2530] pl-14 pr-4 md:px-5 py-1 h-11 md:h-12 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {/* Page title */}
            <h1 className="font-sans font-black text-xs md:text-[13px] tracking-tight text-white uppercase truncate flex-shrink-0">
              {headerInfo.title}
            </h1>
            <span className="hidden xl:inline text-[8px] px-1.5 py-0.5 rounded bg-[#11151c] border border-[#1c2530] text-[#6a7d92] uppercase font-bold tracking-wider">
              {activePanel}
            </span>
            <div className="hidden sm:block w-[1px] h-3 bg-[#1c2530]" />
            {/* Breadcrumbs */}
            <div className="hidden sm:flex items-center gap-1.5 text-[8.5px] uppercase font-black tracking-widest text-[#6a7d92] truncate">
              <span>{headerInfo.breadcrumbs[0]}</span>
              {headerInfo.breadcrumbs[1] && (
                <>
                  <span className="text-[#1c2530] font-bold">/</span>
                  <span className="text-[#1e56f0]">{headerInfo.breadcrumbs[1]}</span>
                </>
              )}
            </div>
          </div>

          {/* Quick Stats / System Health widget aligned horizontally */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-[9px] md:text-[10px] text-white font-bold uppercase tracking-wider hidden md:block">
              Operador: <span className="text-[#1e56f0]">{user.nome?.split(' ')[0]}</span>
            </div>
            {currentTime && (
              <>
                <div className="w-[1px] h-3.5 bg-[#1c2530] hidden md:block" />
                <div className="text-[9px] text-slate-400 font-mono font-bold uppercase tracking-wider hidden md:block">
                  {currentTime}
                </div>
              </>
            )}
            <div className="w-[1px] h-3.5 bg-[#1c2530] hidden sm:block" />
            {/* Live Indicator Widget */}
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#11151c] border border-[#1c2530] text-[8.5px] font-sans font-black tracking-widest text-[#6a7d92]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1e56f0] animate-pulse" />
              <span className="uppercase text-gray-300">SISTEMA ATIVO</span>
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
    </div>
  );
}
