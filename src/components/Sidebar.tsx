import React, { useState, useEffect } from 'react';
import { Usuario, Empresa } from '../types';
import { BrandLogo } from './BrandLogo';
import { 
  LayoutDashboard, 
  RefreshCw, 
  Trash2, 
  Truck, 
  AlertTriangle, 
  Calendar, 
  Search, 
  Package, 
  ClipboardCheck, 
  Download, 
  ListChecks,
  LogOut,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Building2,
  Database,
  BarChart2,
  Sun,
  Moon,
  Sliders,
  Terminal,
  Activity,
  Layers,
  SearchCode,
  Shield,
  HelpCircle,
  Clock,
  ClipboardList
} from 'lucide-react';

interface SidebarProps {
  user: Usuario;
  empresa: Empresa | null;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onLogout: () => void;
  isFbOnline: boolean;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export default function Sidebar({
  user,
  empresa,
  activeTab,
  onSelectTab,
  onLogout,
  isFbOnline,
  theme,
  onToggleTheme
}: SidebarProps) {
  const collapsed = false;
  const isNixon = user.email.toLowerCase().trim() === 'nixon.a.a100.nh@gmail.com';
  const userRoles = (user.papel || '').split(',').map((s: string) => s.trim());
  const hasRole = (role: string) => userRoles.includes(role);
  const isControleOuSupervisor = user.isControle || hasRole('controle');
  const isSupervisorOrAdmin = user.isControle || hasRole('admin') || hasRole('controle') || isNixon;

  const [timeStr, setTimeStr] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'DASHBOARD': isControleOuSupervisor ? true : false,
    'SETORES DE OPERAÇÃO': !isControleOuSupervisor ? true : false,
    'ADMINISTRAÇÃO & GESTÃO': false
  });

  // Tick clock effect
  useEffect(() => {
    const tick = () => {
      setTimeStr(new Date().toLocaleTimeString('pt-BR', { hour12: false }));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleNavClick = (tabId: string) => {
    onSelectTab(tabId);
    setMobileOpen(false);
  };



  // Let's model all potential navigation items with category tags
  const navItems = [
    // General
    {
      id: 'visao-geral',
      label: 'Visão Geral',
      icon: <LayoutDashboard className="w-4 h-4" />,
      category: 'GERAL',
      visible: true
    },
    
    // BI & Analytics
    {
      id: 'repack-dashboard',
      label: 'Dashboard Repack',
      icon: <BarChart2 className="w-4 h-4 text-purple-400" />,
      category: 'DASHBOARD',
      visible: isSupervisorOrAdmin
    },
    {
      id: 'despejo-dashboard',
      label: 'Dashboard Despejo',
      icon: <BarChart2 className="w-4 h-4 text-rose-500" />,
      category: 'DASHBOARD',
      visible: isSupervisorOrAdmin
    },
    {
      id: 'logistica-dashboard',
      label: 'Dashboard EFC EFD',
      icon: <BarChart2 className="w-4 h-4 text-sky-400" />,
      category: 'DASHBOARD',
      visible: isSupervisorOrAdmin
    },
    {
      id: 'quebras-dashboard',
      label: 'Dashboard Quebras',
      icon: <BarChart2 className="w-4 h-4 text-amber-500" />,
      category: 'DASHBOARD',
      visible: isSupervisorOrAdmin
    },
    {
      id: 'fefo-dashboard',
      label: 'Dashboard FEFO (Validades)',
      icon: <BarChart2 className="w-4 h-4 text-emerald-500" />,
      category: 'DASHBOARD',
      visible: isSupervisorOrAdmin
    },
    {
      id: 'picking-dashboard',
      label: 'Dashboard Picking',
      icon: <BarChart2 className="w-4 h-4 text-amber-500" />,
      category: 'DASHBOARD',
      visible: isSupervisorOrAdmin
    },

    // Operations / Sectores
    {
      id: 'repack',
      label: 'Operação Repack',
      icon: <RefreshCw className="w-4 h-4 text-purple-400 animate-spin-hover" />,
      category: 'SETORES DE OPERAÇÃO',
      visible: !isControleOuSupervisor && (isSupervisorOrAdmin || hasRole('repack') || hasRole('admin'))
    },
    {
      id: 'despejo',
      label: 'Operação Despejo',
      icon: <Trash2 className="w-4 h-4 text-rose-500" />,
      category: 'SETORES DE OPERAÇÃO',
      visible: !isControleOuSupervisor && (isSupervisorOrAdmin || hasRole('despejo') || hasRole('admin'))
    },
    {
      id: 'armazem',
      label: 'Operação EFC / EFD',
      icon: <Truck className="w-4 h-4 text-sky-400" />,
      category: 'SETORES DE OPERAÇÃO',
      visible: !isControleOuSupervisor && (isSupervisorOrAdmin || hasRole('armazem') || hasRole('admin'))
    },
    {
      id: 'quebras',
      label: 'Operação Quebras',
      icon: <AlertTriangle className="w-4 h-4 text-red-500" />,
      category: 'SETORES DE OPERAÇÃO',
      visible: !isControleOuSupervisor && (isSupervisorOrAdmin || hasRole('quebras') || hasRole('admin'))
    },
    {
      id: 'validades',
      label: 'Operação Validade',
      icon: <Calendar className="w-4 h-4 text-emerald-500" />,
      category: 'SETORES DE OPERAÇÃO',
      visible: !isControleOuSupervisor && (isSupervisorOrAdmin || hasRole('validades') || hasRole('admin'))
    },

    {
      id: 'empilhador',
      label: 'Operação Picking',
      icon: <Package className="w-4 h-4 text-amber-500" />,
      category: 'SETORES DE OPERAÇÃO',
      visible: !isControleOuSupervisor && (isSupervisorOrAdmin || hasRole('empilhador') || hasRole('admin'))
    },
    {
      id: 'conferente',
      label: 'Operação Conferênte',
      icon: <ClipboardCheck className="w-4 h-4 text-teal-400" />,
      category: 'SETORES DE OPERAÇÃO',
      visible: !isControleOuSupervisor && (isSupervisorOrAdmin || hasRole('conferente') || hasRole('admin'))
    },

    // Administrative / Core
    {
      id: 'registros',
      label: 'Registros de Setores',
      icon: <ClipboardList className="w-4 h-4 text-emerald-500" />,
      category: 'ADMINISTRAÇÃO & GESTÃO',
      visible: isSupervisorOrAdmin
    },
    {
      id: 'acessos',
      label: 'Controle de Acessos',
      icon: <Shield className="w-4 h-4 text-indigo-400" />,
      category: 'ADMINISTRAÇÃO & GESTÃO',
      visible: isSupervisorOrAdmin
    },
    {
      id: 'controle',
      label: 'Painel Controle',
      icon: <Sliders className="w-4 h-4 text-amber-500" />,
      category: 'ADMINISTRAÇÃO & GESTÃO',
      visible: isSupervisorOrAdmin
    },
    {
      id: 'acoes',
      label: 'Gestão de Ações',
      icon: <ListChecks className="w-4 h-4 text-emerald-400" />,
      category: 'ADMINISTRAÇÃO & GESTÃO',
      visible: isSupervisorOrAdmin
    },
    {
      id: 'exportar',
      label: 'Exportar Base',
      icon: <Download className="w-4 h-4 text-gray-400" />,
      category: 'ADMINISTRAÇÃO & GESTÃO',
      visible: isSupervisorOrAdmin
    },
    {
      id: 'firebase',
      label: 'Status Firestore',
      icon: <Database className="w-4 h-4 text-amber-500" />,
      category: 'ADMINISTRAÇÃO & GESTÃO',
      visible: isSupervisorOrAdmin
    }
  ];

  // Filtering based on visibility and search query
  const filteredNavItems = navItems.filter(item => {
    if (!item.visible) return false;
    if (searchQuery.trim() === '') return true;
    return (
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Unique categories left after search
  const activeCategories = Array.from(new Set(filteredNavItems.map(item => item.category)));

  const isCategoryActive = (category: string) => {
    const items = filteredNavItems.filter(item => item.category === category);
    return items.some(item => item.id === activeTab);
  };

  useEffect(() => {
    // Auto-expand category containing active tab
    const activeItem = navItems.find(item => item.id === activeTab);
    if (activeItem && activeItem.category) {
      setExpandedCategories(prev => ({
        ...prev,
        [activeItem.category]: true
      }));
    }
  }, [activeTab]);

  const renderNavItem = (item: typeof navItems[0]) => {
    const isActive = activeTab === item.id;
    const isRepack = item.id === 'repack';

    return (
      <div key={item.id} className="w-full flex flex-col gap-0.5">
        <button
          onClick={() => handleNavClick(item.id)}
          className={`w-full flex items-center px-3 py-2 rounded-lg border-none text-left cursor-pointer transition-all relative overflow-hidden group ${
            isActive 
              ? 'bg-[#1e56f0]/10 text-[#1e56f0] border border-[#1e56f0]/15 font-bold' 
              : 'text-slate-600 dark:text-[#8a9db2] hover:text-[#1e56f0] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#151b23]'
          }`}
          title={item.label}
        >
          {isActive && (
            <span className="absolute left-0 top-1.5 bottom-1.5 w-[3.5px] bg-[#1e56f0] rounded-r" />
          )}
          <span className="mr-2.5 flex-shrink-0 opacity-85 group-hover:opacity-100 transition-opacity [&_svg]:w-4 [&_svg]:h-4 flex items-center justify-center">
            {item.icon}
          </span>
          <span className="font-sans font-semibold text-xs sm:text-[12.5px] uppercase tracking-wider flex-1 truncate transition-colors duration-200">
            {item.label}
          </span>
        </button>
      </div>
    );
  };

  // Get user short name for badge / avatar
  const getInitials = (name: string) => {
    if (!name) return 'OP';
    const split = name.trim().split(' ');
    if (split.length === 1) return split[0].substring(0, 2).toUpperCase();
    return (split[0][0] + split[split.length - 1][0]).toUpperCase();
  };

  return (
    <>
      {/* Mobile Drawer Trigger Backdrop Overlay */}
      {mobileOpen && (
        <div 
          onClick={() => setMobileOpen(false)} 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-all duration-300"
        />
      )}

      {/* Hamburger button for small screens */}
      {!mobileOpen && (
        <button 
          onClick={() => setMobileOpen(true)}
          className={`fixed top-1.5 left-3 z-40 w-8 h-8 rounded-lg backdrop-blur-md text-sm flex items-center justify-center md:hidden cursor-pointer shadow-xs transition-all border ${
            theme === 'dark'
              ? 'bg-[#11151c]/90 border-[#222d3a] text-[#1e56f0]'
              : 'bg-white/90 border-slate-200 text-[#1e56f0] hover:bg-slate-50'
          }`}
          title="Abrir Menu"
        >
          ☰
        </button>
      )}
      {/* Sidebar Layout */}
      <aside className={`fixed md:sticky top-0 h-screen border-r flex flex-col z-50 transition-all duration-300 ${
        theme === 'dark'
          ? 'bg-[#0b0e14] border-[#1c2530]'
          : 'bg-white border-slate-200'
      } ${
        collapsed ? 'w-[68px]' : 'w-[230px] lg:w-[250px]'
      } ${mobileOpen ? 'left-0 shadow-2xl' : '-left-[250px] md:left-0'}`}>
        
        {/* Brand Logo Header at top-left of sidebar */}
        {!collapsed && (
          <div className="p-4 flex items-center justify-center border-b border-slate-200 dark:border-[#1c2530]/40 flex-shrink-0">
            <BrandLogo variant="header" theme={theme} />
          </div>
        )}

        {/* Mobile close toggle (positioned absolutely at top right) */}
        {mobileOpen && (
          <div className="absolute top-3 right-3 z-50 md:hidden">
            <button 
              onClick={() => setMobileOpen(false)}
              className={`w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-colors border ${
                theme === 'dark'
                  ? 'bg-[#151b23] border-[#222d3a] text-[#6a7d92] hover:text-[#ef4444]'
                  : 'bg-white border-slate-200 text-slate-500 hover:text-red-500 hover:bg-red-50 shadow-sm'
              }`}
              title="Fechar Menu"
            >
              ✕
            </button>
          </div>
        )}

        {/* Dynamic SaaS Tenant User Profile Card */}
        {!collapsed ? (
          <div className={`p-3 mx-2 mt-2 rounded-xl border transition-all duration-300 relative overflow-hidden group ${
            theme === 'dark' 
              ? 'bg-[#11151c]/60 border-[#1c2530] hover:border-[#1e56f0]/25' 
              : 'bg-gradient-to-br from-blue-50/30 to-white border-slate-200/80 shadow-[0_4px_20px_rgba(30,86,240,0.03)] hover:border-slate-300'
          }`}>
            {theme === 'dark' && (
              <div className="absolute top-0 right-0 w-16 h-16 bg-[#1e56f0]/5 rounded-full blur-xl -mr-6 -mt-6" />
            )}
            <div className="flex items-center gap-2.5 relative z-10">
              <div className={`w-9 h-9 rounded-full border flex items-center justify-center font-black text-xs sm:text-sm shadow-xs flex-shrink-0 transition-all ${
                theme === 'dark'
                  ? 'bg-gradient-to-tr from-[#1e56f0]/20 to-[#1e56f0]/5 border-[#1e56f0]/30 text-blue-400'
                  : 'bg-blue-50 border-blue-200 text-[#1e56f0]'
              }`}>
                {getInitials(user.nome)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[9px] sm:text-[10px] uppercase font-black text-[#1e56f0] tracking-widest truncate">
                  Colaborador
                </div>
                <div className={`text-xs sm:text-[13px] truncate font-extrabold leading-tight ${
                  theme === 'dark' ? 'text-white' : 'text-slate-800'
                }`}>
                  {user.nome || 'Operador'}
                </div>
                <div className={`text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider mt-0.5 flex items-center gap-1 ${
                  theme === 'dark' ? 'text-[#8a9db2]' : 'text-slate-500'
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1e56f0] animate-pulse" />
                  {user.papel === 'admin' ? 'Administração' : (user.papel === 'controle' || user.isControle) ? 'Supervisor' : 'Operações'}
                </div>
              </div>
            </div>
            
            <div className={`flex items-center justify-between gap-2 mt-2.5 pt-2 border-t ${
              theme === 'dark' ? 'border-[#1c2530]' : 'border-slate-100'
            }`}>
              <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-2 py-0.5 border rounded-md ${
                theme === 'dark'
                  ? 'bg-emerald-500/20 border-emerald-500/20 text-emerald-400'
                  : 'bg-emerald-500/10 border-emerald-500/15 text-emerald-600'
              }`}>
                ✓ ATIVO
              </span>
              <button 
                onClick={onLogout}
                className={`text-xs font-bold rounded-md px-2 py-1 flex items-center gap-1.5 cursor-pointer transition-colors ml-auto border-none ${
                  theme === 'dark'
                    ? 'text-[#8a9db2] hover:text-rose-400 hover:bg-[#ef4444]/10'
                    : 'text-slate-600 hover:text-red-600 hover:bg-red-500/10'
                }`}
                title="Sair da Conta"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>SAIR</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="my-2 flex justify-center">
            <div 
              className={`w-8 h-8 rounded-full border flex items-center justify-center font-black text-xs cursor-pointer transition-colors ${
                theme === 'dark'
                  ? 'bg-[#11151c] border-[#1c2530] text-blue-400 hover:border-[#1e56f0]/40'
                  : 'bg-slate-50 border-slate-200 text-[#1e56f0] hover:border-[#1e56f0]/40'
              }`}
              title={`${user.nome} - Sair`}
              onClick={onLogout}
            >
              {getInitials(user.nome)}
            </div>
          </div>
        )}

        {/* Real-time search filter */}
        {!collapsed && (
          <div className="px-2.5 pt-2.5">
            <div className="relative">
              <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${
                theme === 'dark' ? 'text-[#6a7d92]' : 'text-slate-400'
              }`} />
              <input 
                type="text"
                placeholder="Ir para setor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full border rounded-lg pl-8 pr-6 py-1.5 font-sans text-xs outline-none transition-all ${
                  theme === 'dark'
                    ? 'bg-[#11151c]/50 border-[#1c2530] text-white placeholder-[#6a7d92] focus:border-[#1e56f0]/40 focus:bg-[#11151c]'
                    : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-[#1e56f0]/40 focus:bg-white'
                }`}
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-xs border-none bg-transparent cursor-pointer ${
                    theme === 'dark' ? 'text-[#6a7d92] hover:text-white' : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-1.5 py-2 space-y-1.5 scrollbar-thin">
          {activeCategories.map(category => {
            const items = filteredNavItems.filter(item => item.category === category);
            if (items.length === 0) return null;

            const isGeral = category === 'GERAL';
            const isExpanded = isGeral || expandedCategories[category] !== false;

            return (
              <div key={category} className="space-y-0.5">
                {/* Category Header (collapsible) */}
                {!isGeral && (
                  <button
                    type="button"
                    onClick={() => setExpandedCategories(prev => ({ ...prev, [category]: !isExpanded }))}
                    className="w-full flex items-center justify-between text-[10px] sm:text-[10.5px] uppercase tracking-widest font-black text-slate-500 dark:text-[#8a9db2] hover:text-[#1e56f0] dark:hover:text-white px-2.5 py-1 bg-transparent border-none cursor-pointer transition-colors"
                  >
                    <span>{category}</span>
                    <span>
                      {isExpanded ? (
                        <ChevronDown className="w-3 h-3 stroke-[2.5]" />
                      ) : (
                        <ChevronRight className="w-3 h-3 stroke-[2.5]" />
                      )}
                    </span>
                  </button>
                )}
                
                {isGeral && (
                  <div className="text-[10px] sm:text-[10.5px] uppercase tracking-widest font-black text-slate-500 dark:text-[#8a9db2]/80 px-2.5 py-1 flex items-center justify-between">
                    <span>{category}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-[#1c2530]" />
                  </div>
                )}

                {isExpanded && (
                  <div className="space-y-[1px]">
                    {items.map(renderNavItem)}
                  </div>
                )}
              </div>
            );
          })}

          {filteredNavItems.length === 0 && (
            <div className="p-3 text-center">
              <HelpCircle className="w-6 h-6 text-[#6a7d92]/40 mx-auto mb-1.5" />
              <span className="text-[10px] text-[#6a7d92] uppercase font-bold tracking-wider block">
                Nenhum setor encontrado
              </span>
            </div>
          )}
        </nav>

        {/* Sidebar Footer block: Network indicators / Clock time */}
        <div className={`p-2.5 border-t flex flex-col gap-1.5 items-center text-center ${
          theme === 'dark'
            ? 'border-[#1c2530] bg-[#07090d]/40'
            : 'border-slate-100 bg-white'
        }`}>
          <div className={`font-mono text-xs sm:text-sm tracking-wider select-none font-black flex items-center gap-1.5 justify-center ${
            theme === 'dark' ? 'text-blue-400' : 'text-[#1e56f0]'
          }`}>
            <Clock className={`w-3.5 h-3.5 sm:w-4 sm:h-4 animate-pulse-slow ${
              theme === 'dark' ? 'text-blue-400' : 'text-[#1e56f0]'
            }`} />
            {!collapsed && <span>{timeStr}</span>}
          </div>

          {!collapsed && (
            <div className={`w-full py-1.5 px-2 rounded-md font-sans font-black text-[9.5px] sm:text-[10px] tracking-widest text-center border transition-all flex items-center justify-center gap-1.5 ${
              isFbOnline 
                ? theme === 'dark'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                  : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/15'
                : theme === 'dark'
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/20 animate-pulse'
                  : 'bg-rose-500/10 text-rose-600 border-rose-500/15 animate-pulse'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isFbOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span>{isFbOnline ? 'ONLINE' : 'DESCONECTADO'}</span>
            </div>
          )}
        </div>

      </aside>
    </>
  );
}
