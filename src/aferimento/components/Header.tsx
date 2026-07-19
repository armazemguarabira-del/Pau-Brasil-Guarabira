import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole, FiscalAlert } from '../types';
import { 
  Shield, User as UserIcon, Truck, CheckCircle, BarChart3, Settings, 
  LogOut, FileSpreadsheet, Bell, Check, Clock, AlertCircle, FileText,
  Sun, Moon, Folder
} from 'lucide-react';

interface HeaderProps {
  currentUser: User;
  users: User[];
  onUserChange: (user: User) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  fiscalAlerts?: FiscalAlert[];
  onSaveAlerts?: (alerts: FiscalAlert[]) => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export default function Header({ 
  currentUser, 
  users, 
  onUserChange, 
  activeTab, 
  setActiveTab, 
  onLogout,
  fiscalAlerts = [],
  onSaveAlerts,
  theme = 'light',
  onToggleTheme
}: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const bellContainerRef = useRef<HTMLDivElement>(null);

  // Logo back to home action based on current user role
  const handleLogoClick = () => {
    if (currentUser.role === 'conferente') {
      setActiveTab('conferencias');
    } else if (currentUser.role === 'auxiliar_logistica') {
      setActiveTab('reconciliacao');
    } else if (currentUser.role === 'gestor') {
      setActiveTab('dashboard');
    } else if (currentUser.role === 'monitoramento') {
      setActiveTab('monitoramento_view');
    }
  };

  // Close notifications when clicking outside the bell container
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (bellContainerRef.current && !bellContainerRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  // Mark all relevant alerts as read when notifications popup is opened
  useEffect(() => {
    if (showNotifications && fiscalAlerts.length > 0 && onSaveAlerts) {
      const relevantUnreadAlerts = fiscalAlerts.filter(alert => {
        if (alert.read) return false;
        if (!alert.targetRole || alert.targetRole === 'todos') return true;
        return alert.targetRole === currentUser.role;
      });

      if (relevantUnreadAlerts.length > 0) {
        const updated = fiscalAlerts.map(a => {
          if (!a.targetRole || a.targetRole === 'todos' || a.targetRole === currentUser.role) {
            return { ...a, read: true };
          }
          return a;
        });
        onSaveAlerts(updated);
      }
    }
  }, [showNotifications, fiscalAlerts, onSaveAlerts, currentUser.role]);

  return (
    <header className="bg-slate-900 text-white shadow-md border-b border-slate-800" id="main_header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Navigation / Mode Tabs */}
          <div className="hidden md:flex items-center space-x-1 bg-slate-800 p-1 rounded-lg border border-slate-700 overflow-x-auto max-w-[50vw] lg:max-w-[60vw] xl:max-w-none shrink-0 whitespace-nowrap scrollbar-none">
             {currentUser.role === 'conferente' && (
              <button
                id="nav_conferente"
                onClick={() => setActiveTab('conferencias')}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'conferencias' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <CheckCircle className="h-4 w-4" />
                <span>Conferências</span>
              </button>
            )}

            {currentUser.role === 'auxiliar_logistica' && (
              <>
                <button
                  id="nav_auxiliar_reconciliacao"
                  onClick={() => setActiveTab('reconciliacao')}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'reconciliacao' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <Shield className="h-4 w-4" />
                  <span>Conciliação Fiscal</span>
                </button>
                <button
                  id="nav_auxiliar_sincronizador"
                  onClick={() => setActiveTab('sincronizador')}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'sincronizador' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>Sincronizador & Importador de Rotas</span>
                </button>
                <button
                  id="nav_auxiliar_historico"
                  onClick={() => setActiveTab('historico')}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'historico' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>Histórico</span>
                </button>
                <button
                  id="nav_auxiliar_divergencias"
                  onClick={() => setActiveTab('divergencias')}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'divergencias' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <Shield className="h-4 w-4" />
                  <span>Sobras & Faltas PA/AG</span>
                </button>
                <button
                  id="nav_auxiliar_vales"
                  onClick={() => setActiveTab('vales_view')}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'vales_view' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  <span>Gestão de Vales</span>
                </button>
                <button
                  id="nav_auxiliar_cadastros"
                  onClick={() => setActiveTab('cadastros')}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'cadastros' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <Settings className="h-4 w-4" />
                  <span>Cadastros</span>
                </button>

              </>
            )}

            {currentUser.role === 'monitoramento' && (
              <>
                <button
                  id="nav_monitoramento_previsoes"
                  onClick={() => setActiveTab('monitoramento_view')}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'monitoramento_view' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <Truck className="h-4 w-4" />
                  <span>Painel de Monitoramento</span>
                </button>
                <button
                  id="nav_monitoramento_historico"
                  onClick={() => setActiveTab('historico')}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'historico' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>Histórico de Retornos</span>
                </button>
                <button
                  id="nav_monitoramento_divergencias"
                  onClick={() => setActiveTab('divergencias')}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'divergencias' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <Shield className="h-4 w-4" />
                  <span>Sobras & Faltas PA/AG</span>
                </button>
              </>
            )}

            {currentUser.role === 'gestor' && (
              <>
                <button
                  id="nav_gestor_dashboard"
                  onClick={() => setActiveTab('dashboard')}
                  className={`flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-medium transition-all shrink-0 ${
                    activeTab === 'dashboard' ? 'bg-amber-500 text-slate-950 shadow-sm font-bold' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <BarChart3 className="h-3.5 w-3.5 shrink-0" />
                  <span>Painel Gerencial</span>
                </button>
                <button
                  id="nav_gestor_conferencias"
                  onClick={() => setActiveTab('conferencias')}
                  className={`flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-medium transition-all shrink-0 ${
                    activeTab === 'conferencias' ? 'bg-amber-500 text-slate-950 shadow-sm font-bold' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>Contagem Física</span>
                </button>
                <button
                  id="nav_gestor_reconciliacao"
                  onClick={() => setActiveTab('reconciliacao')}
                  className={`flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-medium transition-all shrink-0 ${
                    activeTab === 'reconciliacao' ? 'bg-amber-500 text-slate-950 shadow-sm font-bold' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Shield className="h-3.5 w-3.5 shrink-0" />
                  <span>Conciliação Fiscal</span>
                </button>
                <button
                  id="nav_gestor_monitoramento"
                  onClick={() => setActiveTab('monitoramento_view')}
                  className={`flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-medium transition-all shrink-0 ${
                    activeTab === 'monitoramento_view' ? 'bg-amber-500 text-slate-950 shadow-sm font-bold' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Truck className="h-3.5 w-3.5 shrink-0" />
                  <span>Monitoramento</span>
                </button>
                <button
                  id="nav_gestor_sincronizador"
                  onClick={() => setActiveTab('sincronizador')}
                  className={`flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-medium transition-all shrink-0 ${
                    activeTab === 'sincronizador' ? 'bg-amber-500 text-slate-950 shadow-sm font-bold' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" />
                  <span>Sincronizador</span>
                </button>
                <button
                  id="nav_gestor_divergencias"
                  onClick={() => setActiveTab('divergencias')}
                  className={`flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-medium transition-all shrink-0 ${
                    activeTab === 'divergencias' ? 'bg-amber-500 text-slate-950 shadow-sm font-bold' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Shield className="h-3.5 w-3.5 shrink-0" />
                  <span>Sobras & Faltas</span>
                </button>
                <button
                  id="nav_gestor_vales"
                  onClick={() => setActiveTab('vales_view')}
                  className={`flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-medium transition-all shrink-0 ${
                    activeTab === 'vales_view' ? 'bg-amber-500 text-slate-950 shadow-sm font-bold' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  <span>Gestão de Vales</span>
                </button>

                <button
                  id="nav_gestor_historico"
                  onClick={() => setActiveTab('historico')}
                  className={`flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-medium transition-all shrink-0 ${
                    activeTab === 'historico' ? 'bg-amber-500 text-slate-950 shadow-sm font-bold' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>Histórico</span>
                </button>
                <button
                  id="nav_gestor_cadastros"
                  onClick={() => setActiveTab('cadastros')}
                  className={`flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-medium transition-all shrink-0 ${
                    activeTab === 'cadastros' ? 'bg-amber-500 text-slate-950 shadow-sm font-bold' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Settings className="h-3.5 w-3.5 shrink-0" />
                  <span>Cadastros</span>
                </button>
              </>
            )}
          </div>

          {/* User Profile Switcher */}
          <div className="flex items-center space-x-3">
            {/* Notification Bell with Dropdown Popover */}
            <div className="relative" id="notification_bell_container" ref={bellContainerRef}>
              <button
                id="notification_bell_btn"
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2 rounded-lg border transition-all flex items-center justify-center cursor-pointer relative shadow-sm ${
                  showNotifications 
                    ? 'bg-amber-500 text-slate-950 border-amber-500' 
                    : 'bg-slate-800 border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white'
                }`}
                title="Notificações e Atualizações"
              >
                <Bell className="h-4 w-4" />
                {(() => {
                  const relevantAlerts = (fiscalAlerts || []).filter(alert => {
                    if (!alert.targetRole || alert.targetRole === 'todos') return true;
                    return alert.targetRole === currentUser.role;
                  });
                  const unreadCount = relevantAlerts.filter(a => !a.read).length;
                  return unreadCount > 0 ? (
                    <span 
                      id="unread_badge"
                      className="absolute -top-1 -right-1 bg-red-600 text-white font-sans font-extrabold text-[9px] h-4 min-w-4 px-1 rounded-full flex items-center justify-center border border-white animate-pulse animate-infinite"
                    >
                      {unreadCount}
                    </span>
                  ) : null;
                })()}
              </button>

              {showNotifications && (() => {
                const relevantAlerts = (fiscalAlerts || []).filter(alert => {
                  if (!alert.targetRole || alert.targetRole === 'todos') return true;
                  return alert.targetRole === currentUser.role;
                });
                const unreadCount = relevantAlerts.filter(a => !a.read).length;

                const handleMarkAsRead = (alertId: string) => {
                  if (onSaveAlerts) {
                    const updated = fiscalAlerts.map(a => a.id === alertId ? { ...a, read: true } : a);
                    onSaveAlerts(updated);
                  }
                };

                const handleMarkAllAsRead = () => {
                  if (onSaveAlerts) {
                    const updated = fiscalAlerts.map(a => {
                      if (!a.targetRole || a.targetRole === 'todos' || a.targetRole === currentUser.role) {
                        return { ...a, read: true };
                      }
                      return a;
                    });
                    onSaveAlerts(updated);
                  }
                };

                return (
                  <div 
                    id="notifications_popover"
                    className="absolute right-0 mt-2 w-80 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden"
                  >
                    <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900">
                      <span className="font-sans font-bold text-xs text-white uppercase tracking-wider">Notificações</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllAsRead}
                          className="text-xxs font-sans font-medium text-amber-500 hover:text-amber-400 flex items-center space-x-1 cursor-pointer transition-all bg-transparent border-none p-0"
                        >
                          <Check className="h-3 w-3" />
                          <span>Ler tudo</span>
                        </button>
                      )}
                    </div>

                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-800">
                      {relevantAlerts.length > 0 ? (
                        relevantAlerts.map((alert) => (
                          <div 
                            key={alert.id} 
                            className={`p-3 transition-colors flex items-start space-x-2.5 ${
                              alert.read ? 'bg-slate-950 text-slate-500' : 'bg-slate-900/40 text-white border-l-2 border-amber-500'
                            }`}
                          >
                            <div className={`p-1.5 rounded-lg shrink-0 ${alert.read ? 'bg-slate-900 text-slate-500' : 'bg-amber-500/15 text-amber-400'}`}>
                              <AlertCircle className="h-3.5 w-3.5" />
                            </div>
                            
                            <div className="space-y-0.5 flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <span className="font-sans font-bold text-xs block truncate pr-1 text-white">
                                  {alert.title || `Mapa ${alert.routeMap}`}
                                </span>
                                {!alert.read && (
                                  <button
                                    onClick={() => handleMarkAsRead(alert.id)}
                                    className="text-amber-500 hover:text-amber-400 p-0.5 rounded hover:bg-slate-800 shrink-0 cursor-pointer"
                                    title="Marcar como lida"
                                  >
                                    <Check className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                              
                              <p className="text-[10px] leading-relaxed break-words font-sans text-slate-300">
                                {alert.message || `O status do mapa foi atualizado para ${alert.status}`}
                              </p>
                              
                              <div className="flex items-center space-x-1 pt-1 font-mono text-[8px] text-slate-500">
                                <Clock className="h-2.5 w-2.5" />
                                <span>{new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                <span>•</span>
                                <span>Placa: {alert.plate}</span>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-xxs text-slate-500 font-sans italic">
                          Nenhuma notificação encontrada.
                        </div>
                      )}
                    </div>
                    
                    <div className="p-2 border-t border-slate-800 text-center bg-slate-900">
                      <span className="text-[9px] font-sans text-slate-500 uppercase tracking-wider">Histórico de Alertas Ativo</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Theme Toggle */}
            <button
              id="theme_toggle_btn"
              onClick={onToggleTheme}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white p-2 rounded-lg transition-all flex items-center justify-center cursor-pointer shadow-sm"
              title={theme === 'dark' ? "Ativar Modo Claro" : "Ativar Modo Escuro"}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-slate-400" />}
            </button>
          </div>
        </div>
        
        {/* Mobile menu navigation */}
        <div className="flex md:hidden justify-around py-2 border-t border-slate-800 overflow-x-auto whitespace-nowrap">
          {currentUser.role === 'conferente' && (
            <button
              onClick={() => setActiveTab('conferencias')}
              className={`px-3 py-1 text-xs font-medium rounded-full ${
                activeTab === 'conferencias' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
              }`}
            >
              Conferências
            </button>
          )}

          {currentUser.role === 'auxiliar_logistica' && (
            <>
              <button
                onClick={() => setActiveTab('reconciliacao')}
                className={`px-3 py-1 text-xs font-medium rounded-full ${
                  activeTab === 'reconciliacao' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                }`}
              >
                Conciliação Fiscal
              </button>
              <button
                onClick={() => setActiveTab('sincronizador')}
                className={`px-3 py-1 text-xs font-medium rounded-full ${
                  activeTab === 'sincronizador' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                }`}
              >
                Sincronizador & Importador
              </button>
              <button
                onClick={() => setActiveTab('historico')}
                className={`px-3 py-1 text-xs font-medium rounded-full ${
                  activeTab === 'historico' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                }`}
              >
                Histórico
              </button>
              <button
                onClick={() => setActiveTab('divergencias')}
                className={`px-3 py-1 text-xs font-medium rounded-full ${
                  activeTab === 'divergencias' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                }`}
              >
                Divergências
              </button>
              <button
                onClick={() => setActiveTab('cadastros')}
                className={`px-3 py-1 text-xs font-medium rounded-full ${
                  activeTab === 'cadastros' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                }`}
              >
                Cadastros
              </button>
            </>
          )}

          {currentUser.role === 'monitoramento' && (
            <>
              <button
                onClick={() => setActiveTab('monitoramento_view')}
                className={`px-3 py-1 text-xs font-medium rounded-full ${
                  activeTab === 'monitoramento_view' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                }`}
              >
                Monitoramento
              </button>
              <button
                onClick={() => setActiveTab('historico')}
                className={`px-3 py-1 text-xs font-medium rounded-full ${
                  activeTab === 'historico' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                }`}
              >
                Histórico
              </button>
              <button
                onClick={() => setActiveTab('divergencias')}
                className={`px-3 py-1 text-xs font-medium rounded-full ${
                  activeTab === 'divergencias' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                }`}
              >
                Divergências
              </button>
            </>
          )}

          {currentUser.role === 'gestor' && (
            <>
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-3 py-1 text-xs font-medium rounded-full ${
                  activeTab === 'dashboard' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'
                }`}
              >
                Painel Gerencial
              </button>
              <button
                onClick={() => setActiveTab('conferencias')}
                className={`px-3 py-1 text-xs font-medium rounded-full ${
                  activeTab === 'conferencias' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'
                }`}
              >
                Contagem Física
              </button>
              <button
                onClick={() => setActiveTab('reconciliacao')}
                className={`px-3 py-1 text-xs font-medium rounded-full ${
                  activeTab === 'reconciliacao' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'
                }`}
              >
                Conciliação
              </button>
              <button
                onClick={() => setActiveTab('monitoramento_view')}
                className={`px-3 py-1 text-xs font-medium rounded-full ${
                  activeTab === 'monitoramento_view' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'
                }`}
              >
                Monitoramento
              </button>
              <button
                onClick={() => setActiveTab('sincronizador')}
                className={`px-3 py-1 text-xs font-medium rounded-full ${
                  activeTab === 'sincronizador' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'
                }`}
              >
                Sincronizador
              </button>
              <button
                onClick={() => setActiveTab('divergencias')}
                className={`px-3 py-1 text-xs font-medium rounded-full ${
                  activeTab === 'divergencias' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'
                }`}
              >
                Sobras & Faltas
              </button>
              <button
                onClick={() => setActiveTab('vales_view')}
                className={`px-3 py-1 text-xs font-medium rounded-full ${
                  activeTab === 'vales_view' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'
                }`}
              >
                Vales
              </button>
              <button
                onClick={() => setActiveTab('historico')}
                className={`px-3 py-1 text-xs font-medium rounded-full ${
                  activeTab === 'historico' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'
                }`}
              >
                Histórico
              </button>
              <button
                onClick={() => setActiveTab('cadastros')}
                className={`px-3 py-1 text-xs font-medium rounded-full ${
                  activeTab === 'cadastros' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'
                }`}
              >
                Cadastros
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
