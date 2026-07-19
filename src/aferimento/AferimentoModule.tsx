import React, { useState, useEffect, useRef } from 'react';
import { User, Driver, Vehicle, Product, ActiveAsset, AuditSession, ReturnForecast, FiscalAlert, ImportedRoute, Vale } from './types';
import { DEFAULT_PRODUCTS, DEFAULT_USERS, DEFAULT_DRIVERS, DEFAULT_VEHICLES, DEFAULT_ACTIVE_ASSETS } from './data';
import { ImageDB } from './imageDb';
import Header from './components/Header';
import ConferenteView from './components/ConferenteView';
import FiscalView from './components/FiscalView';
import GestorDashboard from './components/GestorDashboard';
import MonitoramentoView from './components/MonitoramentoView';
import PlatformManual from './components/PlatformManual';
import AIAgentChat from './components/AIAgentChat';
import { ClipboardCheck, ShieldCheck, BarChart3, AlertCircle, Bell, CheckCircle2 } from 'lucide-react';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import type { Usuario, Empresa } from '../types';

interface AferimentoModuleProps {
  armazemUser: Usuario;
  empresa: Empresa | null;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onExit: () => void;
}

// Firestore document that stores the entire "Aferição de Retorno de Rota" database for this empresa.
// Kept as a single document (mirrors the original single database.json) to minimize rewrite risk.
// NOTE: Firestore documents have a 1MB limit. If "audits" grows very large over time (thousands of
// route audits with full item lists), consider migrating "audits"/"vales" to their own subcollections.
function getAferimentoDocRef(empresaId: string) {
  return doc(db, 'aferimento_rota_db', empresaId);
}

export default function AferimentoModule({ armazemUser, empresa, theme, onToggleTheme, onExit }: AferimentoModuleProps) {
  const empresaId = empresa?.id || 'demo';
  const lastWriteTime = useRef<number>(0);
  const pendingUpdatesRef = useRef<any>({});
  const pushTimeoutRef = useRef<any>(null);
  const hasLoadedOnce = useRef<boolean>(false);

  // Database states loaded from Firestore (armazemfacil DB, doc: aferimento_rota_db/{empresaId})
  const [users, setUsers] = useState<User[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeAssets, setActiveAssets] = useState<ActiveAsset[]>([]);
  const [audits, setAudits] = useState<AuditSession[]>([]);
  const [vales, setVales] = useState<Vale[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Forecasts and Notifications
  const [returnForecasts, setReturnForecasts] = useState<ReturnForecast[]>([]);
  const [fiscalAlerts, setFiscalAlerts] = useState<FiscalAlert[]>([]);
  const [importedRoutes, setImportedRoutes] = useState<ImportedRoute[]>([]);
  const [isLoadingDb, setIsLoadingDb] = useState<boolean>(true);

  // Session & UI Navigation states
  // "currentUser" here is the internal operational profile (Conferente / Fiscal / Gestor / Monitoramento),
  // which is a different concept from the Armazém Fácil login (armazemUser). No separate password login
  // is required anymore — the user just picks their operational profile via the Header's user switcher.
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('conferencias');

  // Warning & Reset States
  const [hasShownDeadlinePopup, setHasShownDeadlinePopup] = useState<boolean>(false);
  const [acknowledgedSent, setAcknowledgedSent] = useState<string[]>(() => {
    const saved = localStorage.getItem(`aferimento_acknowledged_sent_${empresaId}`);
    return saved ? JSON.parse(saved) : [];
  });

  const handleResetPlatformData = async () => {
    // Clear major functional arrays
    setImportedRoutes([]);
    setAudits([]);
    setReturnForecasts([]);
    setFiscalAlerts([]);
    setVales([]);

    // Push cleared state to Firestore
    await pushToFirestore({
      importedRoutes: [],
      audits: [],
      returnForecasts: [],
      fiscalAlerts: [],
      vales: [],
    });
  };

  // Push changes to the Firestore document with light batching/debouncing so several
  // handleSaveX calls that happen in the same tick collapse into a single write.
  const pushToFirestore = (updates: {
    users?: User[];
    drivers?: Driver[];
    vehicles?: Vehicle[];
    products?: Product[];
    activeAssets?: ActiveAsset[];
    audits?: AuditSession[];
    returnForecasts?: ReturnForecast[];
    fiscalAlerts?: FiscalAlert[];
    importedRoutes?: ImportedRoute[];
    vales?: Vale[];
    auditLogs?: any[];
  }): Promise<void> => {
    lastWriteTime.current = Date.now();

    // Accumulate the updates atomically
    pendingUpdatesRef.current = {
      ...pendingUpdatesRef.current,
      ...updates
    };

    if (pushTimeoutRef.current) {
      clearTimeout(pushTimeoutRef.current);
    }

    return new Promise((resolve) => {
      pushTimeoutRef.current = setTimeout(async () => {
        const payload = { ...pendingUpdatesRef.current };
        pendingUpdatesRef.current = {};
        pushTimeoutRef.current = null;

        if (Object.keys(payload).length > 0) {
          try {
            await setDoc(getAferimentoDocRef(empresaId), {
              ...payload,
              empresaId,
              lastUpdatedBy: currentUser?.name || armazemUser?.nome || 'Sistema',
              lastUpdatedAt: new Date().toISOString(),
            }, { merge: true });
          } catch (err) {
            console.error('Falha ao sincronizar as alterações com o Firestore:', err);
            // Re-queue so the next write attempt retries these fields too
            pendingUpdatesRef.current = { ...payload, ...pendingUpdatesRef.current };
          }
        }
        resolve();
      }, 200);
    });
  };

  // Helper to repair missing or broken product descriptions
  const repairProductsList = (list: Product[]) => {
    if (!list) return [];
    return list.map(p => {
      if (p.description === p.code || !p.description || p.description.trim() === '') {
        const original = DEFAULT_PRODUCTS.find(dp => dp.code === p.code);
        if (original) {
          return { ...p, description: original.description };
        }
      }
      return p;
    });
  };

  // Normalization helper for Map Codes (strips leading zeros)
  const normalizeMapCode = (mapCode: any): string => {
    if (mapCode === undefined || mapCode === null) return '';
    return String(mapCode).trim().replace(/^0+/, '');
  };

  const cleanAudits = (list: AuditSession[]): AuditSession[] => {
    if (!list) return [];
    return list.filter(Boolean).map(a => ({
      ...a,
      routeMap: normalizeMapCode(a.routeMap),
      unifiedMaps: a.unifiedMaps ? a.unifiedMaps.map(normalizeMapCode) : undefined,
    }));
  };

  const cleanImportedRoutes = (list: ImportedRoute[]): ImportedRoute[] => {
    if (!list) return [];
    return list.filter(Boolean).map(r => ({
      ...r,
      routeMap: normalizeMapCode(r.routeMap)
    }));
  };

  const cleanVales = (list: Vale[]): Vale[] => {
    if (!list) return [];
    return list.map(v => ({
      ...v,
      routeMap: v.routeMap ? normalizeMapCode(v.routeMap) : undefined
    }));
  };

  const cleanReturnForecasts = (list: ReturnForecast[]): ReturnForecast[] => {
    if (!list) return [];
    return list.map(f => ({
      ...f,
      routeMap: normalizeMapCode(f.routeMap)
    }));
  };

  // Load & subscribe in real-time to this empresa's Aferição de Retorno de Rota data in Firestore.
  useEffect(() => {
    setIsLoadingDb(true);
    const ref = getAferimentoDocRef(empresaId);

    const unsubscribe = onSnapshot(ref, async (snap) => {
      // Skip applying remote updates if there was a very recent local write, to avoid
      // the classic "my own write bounces back and reverts my optimistic UI" race condition.
      if (Date.now() - lastWriteTime.current < 1500) {
        hasLoadedOnce.current = true;
        setIsLoadingDb(false);
        return;
      }

      if (!snap.exists()) {
        // First time this empresa uses the module: seed Firestore with sensible defaults.
        if (!hasLoadedOnce.current) {
          const seed = {
            users: DEFAULT_USERS,
            drivers: DEFAULT_DRIVERS,
            vehicles: DEFAULT_VEHICLES,
            products: DEFAULT_PRODUCTS,
            activeAssets: DEFAULT_ACTIVE_ASSETS,
            audits: [],
            vales: [],
            returnForecasts: [],
            fiscalAlerts: [],
            importedRoutes: [],
            auditLogs: [],
            empresaId,
          };
          try {
            await setDoc(ref, seed, { merge: true });
          } catch (err) {
            console.error('Erro ao inicializar base de Aferição de Retorno de Rota no Firestore:', err);
          }
          setUsers(DEFAULT_USERS);
          setDrivers(DEFAULT_DRIVERS);
          setVehicles(DEFAULT_VEHICLES);
          setProducts(repairProductsList(DEFAULT_PRODUCTS));
          setActiveAssets(DEFAULT_ACTIVE_ASSETS);
        }
        hasLoadedOnce.current = true;
        setIsLoadingDb(false);
        return;
      }

      const data = snap.data() as any;
      if (data.users && data.users.length > 0) setUsers(data.users);
      if (data.drivers) setDrivers(data.drivers);
      if (data.vehicles) setVehicles(data.vehicles);
      if (data.products) setProducts(repairProductsList(data.products));
      if (data.activeAssets) setActiveAssets(data.activeAssets);
      if (data.audits) setAudits(cleanAudits(data.audits));
      if (data.vales) setVales(cleanVales(data.vales));
      if (data.returnForecasts) setReturnForecasts(cleanReturnForecasts(data.returnForecasts));
      if (data.fiscalAlerts) setFiscalAlerts(data.fiscalAlerts);
      if (data.importedRoutes) setImportedRoutes(cleanImportedRoutes(data.importedRoutes));
      if (data.auditLogs) setAuditLogs(data.auditLogs);

      hasLoadedOnce.current = true;
      setIsLoadingDb(false);
    }, (err) => {
      console.error('Erro ao sincronizar com o Firestore (Aferição de Retorno de Rota):', err);
      setIsLoadingDb(false);
    });

    return () => unsubscribe();
  }, [empresaId]);


  // Monitor for routes open for more than 2 days and auto-generate delay alerts
  useEffect(() => {
    if (!importedRoutes || importedRoutes.length === 0) return;

    const today = new Date();
    const todayNoTime = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const overdueRoutes = importedRoutes.filter(route => {
      if (route.status === 'fechado') return false;
      if (!route.routeDate) return false;

      const rDateObj = new Date(route.routeDate + 'T00:00:00');
      if (isNaN(rDateObj.getTime())) return false;

      const diffTime = todayNoTime.getTime() - rDateObj.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 2;
    });

    if (overdueRoutes.length === 0) return;

    let updated = false;
    const currentAlerts = [...fiscalAlerts];

    overdueRoutes.forEach(route => {
      const alreadyHasAlert = currentAlerts.some(alert => 
        alert.routeMap.toUpperCase() === route.routeMap.toUpperCase() &&
        alert.status === 'outros' &&
        (alert.title?.includes('ATRASADO') || alert.message?.includes('aberto há'))
      );

      if (!alreadyHasAlert) {
        const rDateObj = new Date(route.routeDate + 'T00:00:00');
        const diffTime = todayNoTime.getTime() - rDateObj.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        const delayAlert: FiscalAlert = {
          id: `delay-${route.id}-${Date.now()}`,
          routeMap: route.routeMap,
          plate: route.plate,
          status: 'outros',
          timestamp: new Date().toISOString(),
          read: false,
          title: `⚠️ MAPA ATRASADO (>= 2 DIAS)`,
          message: `O mapa ${route.routeMap} (Veículo ${route.plate}) está aberto há ${diffDays} dias (Data da Rota: ${route.routeDate}) sem conclusão.`,
          targetRole: 'todos'
        };
        currentAlerts.push(delayAlert);
        updated = true;
      }
    });

    if (updated) {
      handleSaveAlerts(currentAlerts);
    }
  }, [importedRoutes, fiscalAlerts]);

  // Sync state changes back to Firestore
  const handleSaveUsers = (newUsers: User[]) => {
    setUsers(newUsers);
    pushToFirestore({ users: newUsers });
  };

  const handleSaveDrivers = (newDrivers: Driver[]) => {
    setDrivers(newDrivers);
    pushToFirestore({ drivers: newDrivers });
  };

  const handleSaveVehicles = (newVehicles: Vehicle[]) => {
    setVehicles(newVehicles);
    pushToFirestore({ vehicles: newVehicles });
  };

  const handleSaveProducts = (newProducts: Product[]) => {
    setProducts(newProducts);
    pushToFirestore({ products: newProducts });
  };

  const handleSaveAudits = (newAudits: AuditSession[]) => {
    const timestamp = new Date().toISOString();
    const updatedAudits = newAudits.map(newAudit => {
      const oldAudit = audits.find(a => a.id === newAudit.id);
      const oldFunctional = oldAudit ? { ...oldAudit, updatedAt: undefined, lastUpdatedBy: undefined } : null;
      const newFunctional = { ...newAudit, updatedAt: undefined, lastUpdatedBy: undefined };
      if (!oldFunctional || JSON.stringify(oldFunctional) !== JSON.stringify(newFunctional)) {
        return {
          ...newAudit,
          updatedAt: timestamp,
          lastUpdatedBy: currentUser?.name || 'Sistema'
        };
      }
      return newAudit;
    });

    const cleaned = cleanAudits(updatedAudits);
    setAudits(cleaned);
    pushToFirestore({ audits: cleaned });
  };

  const handleSaveForecasts = (newForecasts: ReturnForecast[]) => {
    const cleaned = cleanReturnForecasts(newForecasts);
    setReturnForecasts(cleaned);
    pushToFirestore({ returnForecasts: cleaned });
  };

  const handleSaveAlerts = (newAlerts: FiscalAlert[]) => {
    setFiscalAlerts(newAlerts);
    pushToFirestore({ fiscalAlerts: newAlerts });
  };

  const handleSaveImportedRoutes = (newRoutes: ImportedRoute[]) => {
    const cleaned = cleanImportedRoutes(newRoutes);
    setImportedRoutes(cleaned);
    pushToFirestore({ importedRoutes: cleaned });
  };

  const handleSaveVales = (newVales: Vale[]) => {
    const cleaned = cleanVales(newVales);
    setVales(cleaned);
    pushToFirestore({ vales: cleaned });
  };

  // Switch operational profile (Conferente / Fiscal / Gestor / Monitoramento) and jump to its default tab
  const handleUserChange = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem(`aferimento_profile_${empresaId}_${armazemUser.uid}`, user.id);
    if (user.role === 'conferente') {
      setActiveTab('conferencias');
    } else if (user.role === 'auxiliar_logistica') {
      setActiveTab('reconciliacao');
    } else if (user.role === 'gestor') {
      setActiveTab('dashboard');
    } else if (user.role === 'monitoramento') {
      setActiveTab('monitoramento_view');
    }
  };

  // Auto-select the internal operational profile once the users list has loaded.
  // No password login is required here — the Armazém Fácil login already authenticated the person;
  // this only decides which operational workspace (Conferente/Fiscal/Gestor/Monitoramento) to show,
  // and can be switched anytime via the profile switcher in the Header.
  useEffect(() => {
    if (currentUser || users.length === 0) return;
    const savedProfileId = localStorage.getItem(`aferimento_profile_${empresaId}_${armazemUser.uid}`);
    const savedProfile = savedProfileId ? users.find(u => u.id === savedProfileId) : null;
    const byName = users.find(u => u.name?.toLowerCase().trim() === armazemUser.nome?.toLowerCase().trim());
    const isSupervisor = armazemUser.papel === 'admin' || armazemUser.isControle || (armazemUser.papel || '').includes('controle');
    const defaultUser = savedProfile || byName || (isSupervisor ? users.find(u => u.role === 'gestor') : null) || users[0];
    if (defaultUser) {
      setCurrentUser(defaultUser);
      if (defaultUser.role === 'conferente') setActiveTab('conferencias');
      else if (defaultUser.role === 'auxiliar_logistica') setActiveTab('reconciliacao');
      else if (defaultUser.role === 'gestor') setActiveTab('dashboard');
      else if (defaultUser.role === 'monitoramento') setActiveTab('monitoramento_view');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, currentUser]);

  if (isLoadingDb || !currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-slate-500 text-center">
          <p className="font-semibold text-lg">Carregando plataforma de retornos...</p>
        </div>
      </div>
    );
  }

  // Tomorrow's date string
  const tomorrowStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  })();

  // Filter audits for deadlines
  const pendingDeadlines = audits.filter(audit => {
    if (audit.surplusFlowStatus === 'ENVIADO') return false;
    if (!audit.deliveryDate || audit.deliveryDate !== tomorrowStr) return false;
    
    const hasSurplus = audit.items.some(i => {
      const phys = i.rePhysicalQty !== undefined ? i.rePhysicalQty : i.physicalQty;
      return phys > (i.fiscalQty ?? 0);
    }) || audit.assets.some(a => {
      const phys = a.rePhysicalQty !== undefined ? a.rePhysicalQty : a.physicalQty;
      return phys > (a.fiscalQty ?? 0);
    });
    
    return hasSurplus;
  });

  const showDeadlineModal = currentUser && (currentUser.role === 'gestor' || currentUser.role === 'auxiliar_logistica') && pendingDeadlines.length > 0 && !hasShownDeadlinePopup;

  // Sent audits to notify monitoramento
  const sentAuditsToNotify = currentUser && currentUser.role === 'monitoramento'
    ? audits.filter(audit => {
        if (audit.surplusFlowStatus !== 'ENVIADO') return false;
        
        const hasSurplus = audit.items.some(i => {
          const phys = i.rePhysicalQty !== undefined ? i.rePhysicalQty : i.physicalQty;
          return phys > (i.fiscalQty ?? 0);
        }) || audit.assets.some(a => {
          const phys = a.rePhysicalQty !== undefined ? a.rePhysicalQty : a.physicalQty;
          return phys > (a.fiscalQty ?? 0);
        });
        
        return hasSurplus && !acknowledgedSent.includes(audit.id);
      })
    : [];

  const downloadSobrasCSV = (auditsToDownload: AuditSession[]) => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Mapa;Placa;Motorista;Codigo NB;Data de Entrega;Produto/Ativo;Quantidade Sobra\n";
    
    auditsToDownload.forEach(audit => {
      const driver = drivers.find(d => d.id === audit.driverId)?.name || 'Desconhecido';
      
      const surpluses = [
        ...audit.items.filter(i => (i.rePhysicalQty !== undefined ? i.rePhysicalQty : i.physicalQty) > (i.fiscalQty ?? 0)).map(i => ({
          description: i.productDescription,
          qty: (i.rePhysicalQty !== undefined ? i.rePhysicalQty : i.physicalQty) - (i.fiscalQty ?? 0)
        })),
        ...audit.assets.filter(a => (a.rePhysicalQty !== undefined ? a.rePhysicalQty : a.physicalQty) > (a.fiscalQty ?? 0)).map(a => ({
          description: a.assetName,
          qty: (a.rePhysicalQty !== undefined ? a.rePhysicalQty : a.physicalQty) - (a.fiscalQty ?? 0)
        }))
      ];
      
      surpluses.forEach(s => {
        csvContent += `"${audit.routeMap}";"${audit.plate}";"${driver}";"${audit.clientCodeNB || ''}";"${audit.deliveryDate || ''}";"${s.description}";"${s.qty}"\n`;
      });
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sobras_prazo_amanha_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800" id="main_app_wrapper">
      
      {/* Shared Navigation Header with Profile Switcher */}
      <Header
        currentUser={currentUser}
        users={users}
        onUserChange={handleUserChange}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={onExit}
        fiscalAlerts={fiscalAlerts}
        onSaveAlerts={handleSaveAlerts}
        theme={theme}
        onToggleTheme={onToggleTheme}
      />

      {/* Main Content Workspace Routing based on Profile & Tab */}
      <main className="flex-grow">
        
        {/* VIEW 1: CONFERENTE (PHYSICAL AUDITOR) */}
        {(currentUser.role === 'conferente' || currentUser.role === 'gestor') && activeTab === 'conferencias' && (
          <ConferenteView
            currentUser={currentUser}
            drivers={drivers}
            vehicles={vehicles}
            products={products}
            activeAssets={activeAssets}
            audits={audits}
            onSaveAudits={handleSaveAudits}
            onSaveDrivers={handleSaveDrivers}
            onSaveVehicles={handleSaveVehicles}
            returnForecasts={returnForecasts}
            onSaveForecasts={handleSaveForecasts}
            fiscalAlerts={fiscalAlerts}
            onSaveAlerts={handleSaveAlerts}
            importedRoutes={importedRoutes}
            onSaveImportedRoutes={handleSaveImportedRoutes}
          />
        )}

        {/* VIEW 2: AUXILIAR DE LOGÍSTICA (FISCAL WORKSPACE & HISTORY) */}
        {(currentUser.role === 'auxiliar_logistica' || currentUser.role === 'gestor') && (activeTab === 'reconciliacao' || activeTab === 'historico' || activeTab === 'divergencias' || activeTab === 'mapas_importados' || activeTab === 'sincronizador' || activeTab === 'vales_view') && (
          <FiscalView
            currentUser={currentUser}
            drivers={drivers}
            onSaveDrivers={handleSaveDrivers}
            vehicles={vehicles}
            products={products}
            onSaveProducts={handleSaveProducts}
            activeAssets={activeAssets}
            audits={audits}
            onSaveAudits={handleSaveAudits}
            fiscalAlerts={fiscalAlerts}
            onSaveAlerts={handleSaveAlerts}
            importedRoutes={importedRoutes}
            onSaveImportedRoutes={handleSaveImportedRoutes}
            vales={vales}
            onSaveVales={handleSaveVales}
            activeTab={activeTab}
            onResetPlatformData={handleResetPlatformData}
            returnForecasts={returnForecasts}
            onSaveForecasts={handleSaveForecasts}
          />
        )}

        {/* VIEW 4: MONITORAMENTO SPECIFIC ROUTING */}
        {(currentUser.role === 'monitoramento' || currentUser.role === 'gestor') && activeTab === 'monitoramento_view' && (
          <MonitoramentoView
            currentUser={currentUser}
            importedRoutes={importedRoutes}
            onSaveImportedRoutes={handleSaveImportedRoutes}
            returnForecasts={returnForecasts}
            onSaveForecasts={handleSaveForecasts}
            drivers={drivers}
            onSaveDrivers={handleSaveDrivers}
            vehicles={vehicles}
            audits={audits}
            onSaveAudits={handleSaveAudits}
          />
        )}
        {currentUser.role === 'monitoramento' && (activeTab === 'historico' || activeTab === 'divergencias') && (
          <FiscalView
            currentUser={currentUser}
            drivers={drivers}
            onSaveDrivers={handleSaveDrivers}
            vehicles={vehicles}
            products={products}
            onSaveProducts={handleSaveProducts}
            activeAssets={activeAssets}
            audits={audits}
            onSaveAudits={handleSaveAudits}
            fiscalAlerts={fiscalAlerts}
            onSaveAlerts={handleSaveAlerts}
            importedRoutes={importedRoutes}
            onSaveImportedRoutes={handleSaveImportedRoutes}
            vales={vales}
            onSaveVales={handleSaveVales}
            activeTab={activeTab}
            onResetPlatformData={handleResetPlatformData}
            returnForecasts={returnForecasts}
            onSaveForecasts={handleSaveForecasts}
          />
        )}

        {/* VIEW 3: GESTOR & AUXILIAR DE LOGÍSTICA (CADASTROS ACCESS) */}
        {(currentUser.role === 'gestor' || currentUser.role === 'auxiliar_logistica') && (
          <>
            {currentUser.role === 'gestor' && activeTab === 'dashboard' && (
              <GestorDashboard
                currentUser={currentUser}
                drivers={drivers}
                vehicles={vehicles}
                products={products}
                activeAssets={activeAssets}
                audits={audits}
                users={users}
                onSaveUsers={handleSaveUsers}
                onSaveDrivers={handleSaveDrivers}
                onSaveVehicles={handleSaveVehicles}
                onSaveProducts={handleSaveProducts}
                onSaveAudits={handleSaveAudits}
                importedRoutes={importedRoutes}
                onSaveImportedRoutes={handleSaveImportedRoutes}
                vales={vales}
                onSaveVales={handleSaveVales}
                forceTab="dashboard"
                auditLogs={auditLogs}
              />
            )}

            {activeTab === 'cadastros' && (
              <GestorDashboard
                currentUser={currentUser}
                drivers={drivers}
                vehicles={vehicles}
                products={products}
                activeAssets={activeAssets}
                audits={audits}
                users={users}
                onSaveUsers={handleSaveUsers}
                onSaveDrivers={handleSaveDrivers}
                onSaveVehicles={handleSaveVehicles}
                onSaveProducts={handleSaveProducts}
                onSaveAudits={handleSaveAudits}
                importedRoutes={importedRoutes}
                onSaveImportedRoutes={handleSaveImportedRoutes}
                vales={vales}
                onSaveVales={handleSaveVales}
                forceTab="cadastros"
                auditLogs={auditLogs}
              />
            )}
          </>
        )}
      </main>

      {/* Manual de uso da plataforma com exportação para PDF */}
      {currentUser && <PlatformManual />}

      {/* Sticky footer indicating production-ready definitive system */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xxs text-slate-400 font-medium font-sans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>RETORNO DE ROTA PAU BRASIL GUARABIRA © 2026 • Sistema de Monitoramento e Máxima Eficiência de Retornos de Rota</span>
          <div className="flex items-center space-x-2">
            <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full border border-emerald-200 uppercase font-extrabold font-mono flex items-center gap-1">
              <span className="h-1.5 w-1.5 bg-emerald-600 rounded-full animate-ping"></span>
              Modelo Definitivo Ativo
            </span>
            <span className="text-slate-500 font-medium">Ambiente Operacional Homologado Pau Brasil Distribuidora</span>
          </div>
        </div>
      </footer>

      {/* Agente de I.A flutuante para tirar dúvidas dos usuários */}
      {currentUser && <AIAgentChat />}

      {/* MODAL 1: Sobra Deadline Warning for Gestor / Auxiliar Logística */}
      {showDeadlineModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center space-x-3 text-amber-500">
              <div className="bg-amber-100 p-2.5 rounded-full">
                <AlertCircle className="h-6 w-6 text-amber-600 animate-pulse" />
              </div>
              <div>
                <h3 className="font-sans font-black text-slate-900 uppercase text-sm">Prazo de Entrega Amanhã!</h3>
                <span className="text-[10px] text-slate-400 font-semibold font-mono">Alerta de Sobra de Rota</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Identificamos <strong>{pendingDeadlines.length}</strong> mapa(s) de sobras cujas datas de entrega se encerram amanhã (<strong>{new Date(tomorrowStr + 'T00:00:00').toLocaleDateString('pt-BR')}</strong>). Por favor, realize a baixa no sistema para evitar desvios fora do prazo.
            </p>

            <div className="bg-slate-50 rounded-lg p-3 space-y-1.5 border border-slate-100 max-h-36 overflow-y-auto">
              {pendingDeadlines.map(d => (
                <div key={d.id} className="flex justify-between items-center text-xxs font-mono text-slate-500 border-b border-slate-100 pb-1 last:border-none last:pb-0">
                  <span>Mapa: <strong>{d.routeMap}</strong> ({d.plate})</span>
                  <span>NB: {d.clientCodeNB || 'Não informado'}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  downloadSobrasCSV(pendingDeadlines);
                  setHasShownDeadlinePopup(true);
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xxs py-2.5 px-3 rounded-lg transition uppercase text-center cursor-pointer shadow-sm flex items-center justify-center space-x-1"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Baixar do Sistema</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('divergencias');
                  setHasShownDeadlinePopup(true);
                }}
                className="flex-1 bg-slate-900 hover:bg-slate-850 text-white font-bold text-xxs py-2.5 px-3 rounded-lg transition uppercase text-center cursor-pointer shadow-sm"
              >
                Ver no Painel
              </button>
              <button
                type="button"
                onClick={() => setHasShownDeadlinePopup(true)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xxs py-2.5 px-3 rounded-lg transition uppercase text-center cursor-pointer"
              >
                Ignorar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Sobra Sent Notice for Monitoramento */}
      {sentAuditsToNotify.length > 0 && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center space-x-3 text-emerald-500">
              <div className="bg-emerald-100 p-2.5 rounded-full">
                <Bell className="h-6 w-6 text-emerald-600 animate-bounce" />
              </div>
              <div>
                <h3 className="font-sans font-black text-slate-900 uppercase text-sm">Item de Sobra Enviado!</h3>
                <span className="text-[10px] text-slate-400 font-semibold font-mono">Notificação de Monitoramento</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              O item de sobra referente ao mapa <strong>{sentAuditsToNotify[0].routeMap}</strong> (Placa: <strong>{sentAuditsToNotify[0].plate}</strong>) foi enviado com sucesso para o cliente! O status do fluxo de sobras agora é oficialmente <strong>ENVIADO (Baixado)</strong>.
            </p>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  const currentId = sentAuditsToNotify[0].id;
                  const updated = [...acknowledgedSent, currentId];
                  setAcknowledgedSent(updated);
                  localStorage.setItem(`aferimento_acknowledged_sent_${empresaId}`, JSON.stringify(updated));
                }}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xxs py-2.5 px-6 rounded-lg transition uppercase cursor-pointer shadow-sm"
              >
                Confirmar Ciente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
