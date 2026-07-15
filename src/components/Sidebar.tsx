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
  ClipboardList,
  Users,
  FileText,
  AlertCircle
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
  const isControleOuSupervisor = user.isControle || user.papel === 'controle';
  const isSupervisorOrAdmin = user.isControle || user.papel === 'admin' || user.papel === 'controle' || isNixon;

  const [timeStr, setTimeStr] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'DASHBOARD': isControleOuSupervisor ? true : false,
    'SETORES DE OPERAÇÃO': false,
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

  const handleSubClick = (subId: string) => {
    if (activeTab !== 'repack') {
      onSelectTab('repack');
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('repack-sidebar-action', { detail: subId }));
      }, 150);
    } else {
      window.dispatchEvent(new CustomEvent('repack-sidebar-action', { detail: subId }));
    }
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
      id: 'blitz-dashboard',
      label: 'Dashboard Blitz (Refugo)',
      icon: <BarChart2 className="w-4 h-4 text-indigo-400" />,
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
      visible: !isControleOuSupervisor && (isSupervisorOrAdmin || user.papel === 'repack' || user.papel === 'admin')
    },
    {
      id: 'despejo',
      label: 'Operação Despejo',
      icon: <Trash2 className="w-4 h-4 text-rose-500" />,
      category: 'SETORES DE OPERAÇÃO',
      visible: !isControleOuSupervisor && (isSupervisorOrAdmin || user.papel === 'despejo' || user.papel === 'admin')
    },
    {
      id: 'armazem',
      label: 'Operação de Pátio',
      icon: <Truck className="w-4 h-4 text-sky-400" />,
      category: 'SETORES DE OPERAÇÃO',
      visible: !isControleOuSupervisor && (isSupervisorOrAdmin || user.papel === 'armazem' || user.papel === 'admin')
    },
    {
      id: 'quebras',
      label: 'Operação Quebras',
      icon: <AlertTriangle className="w-4 h-4 text-red-500" />,
      category: 'SETORES DE OPERAÇÃO',
      visible: !isControleOuSupervisor && (isSupervisorOrAdmin || user.papel === 'quebras' || user.papel === 'admin')
    },
    {
      id: 'validades',
      label: 'Operação Validades',
      icon: <Calendar className="w-4 h-4 text-emerald-500" />,
      category: 'SETORES DE OPERAÇÃO',
      visible: !isControleOuSupervisor && (isSupervisorOrAdmin || user.papel === 'validades' || user.papel === 'admin')
    },
    {
      id: 'refugo',
      label: 'Blitz Refugo',
      icon: <Search className="w-4 h-4 text-indigo-400" />,
      category: 'SETORES DE OPERAÇÃO',
      visible: !isControleOuSupervisor && (isSupervisorOrAdmin || user.papel === 'refugo' || user.papel === 'admin')
    },
    {
      id: 'empilhador',
      label: 'Operação Picking',
      icon: <Package className="w-4 h-4 text-amber-500" />,
      category: 'SETORES DE OPERAÇÃO',
      visible: !isControleOuSupervisor && (isSupervisorOrAdmin || user.papel === 'empilhador' || user.papel === 'admin')
    },
    {
      id: 'conferente',
      label: 'Conferência Geral',
      icon: <ClipboardCheck className="w-4 h-4 text-teal-400" />,
      category: 'SETORES DE OPERAÇÃO',
      visible: !isControleOuSupervisor && (isSupervisorOrAdmin || user.papel === 'conferente' || user.papel === 'admin')
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
          className={`w-full flex items-center px-2.5 py-1.5 rounded-md border-none text-left cursor-pointer transition-all relative overflow-hidden group ${
            isActive 
              ? 'bg-[#1e56f0]/10 text-[#1e56f0] border border-[#1e56f0]/15 font-bold' 
              : 'text-slate-500 dark:text-[#6a7d92] hover:text-[#1e56f0] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#151b23]'
          }`}
          title={item.label}
        >
          {isActive && (
            <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-[#1e56f0] rounded-r" />
          )}
          <span className="mr-2 flex-shrink-0 opacity-85 group-hover:opacity-100 transition-opacity [&_svg]:w-3.5 [&_svg]:h-3.5 flex items-center justify-center">
            {item.icon}
          </span>
          <span className="font-sans font-medium text-[9.5px] uppercase tracking-widest flex-1 truncate transition-colors duration-200">
            {item.label}
          </span>
        </button>

        {isRepack && !collapsed && (
          <div className="pl-6 pr-1 py-1 flex flex-col gap-1 border-l border-[#1c2530] ml-4 mt-0.5 mb-2">
            <button
              type="button"
              onClick={() => handleSubClick('raci')}
              className="text-left py-1 text-[8px] font-sans font-bold tracking-wider uppercase text-[#6a7d92] hover:text-[#f5a623] transition-colors flex items-center gap-1.5 bg-transparent border-none cursor-pointer"
            >
              <Users className="w-2.5 h-2.5 text-[#f5a623]" />
              Matriz RACI
            </button>
            <button
              type="button"
              onClick={() => handleSubClick('pop')}
              className="text-left py-1 text-[8px] font-sans font-bold tracking-wider uppercase text-[#6a7d92] hover:text-[#f5a623] transition-colors flex items-center gap-1.5 bg-transparent border-none cursor-pointer"
            >
              <FileText className="w-2.5 h-2.5 text-[#f5a623]" />
              Procedimento POP
            </button>
            <button
              type="button"
              onClick={() => handleSubClick('lup')}
              className="text-left py-1 text-[8px] font-sans font-bold tracking-wider uppercase text-[#6a7d92] hover:text-[#f5a623] transition-colors flex items-center gap-1.5 bg-transparent border-none cursor-pointer"
            >
              <AlertCircle className="w-2.5 h-2.5 text-[#f5a623]" />
              Lição LUP
            </button>
          </div>
        )}
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
          className={`fixed top-3 left-3 z-40 w-10 h-10 rounded-xl backdrop-blur-md text-lg flex items-center justify-center md:hidden cursor-pointer shadow-lg transition-all border ${
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
      <aside className={`fixed md:sticky top-0 h-screen bg-[#0b0e14] border-r border-[#1c2530] flex flex-col z-50 transition-all duration-300 ${
        collapsed ? 'w-[68px]' : 'w-[200px]'
      } ${mobileOpen ? 'left-0 shadow-2xl' : '-left-[200px] md:left-0'}`}>
        
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
          <div className={`p-2.5 mx-2 mt-2 rounded-lg border transition-all duration-300 relative overflow-hidden group ${
            theme === 'dark' 
              ? 'bg-[#11151c]/60 border-[#1c2530] hover:border-[#1e56f0]/25' 
              : 'bg-gradient-to-br from-blue-50/20 to-white border-slate-100 shadow-[0_4px_20px_rgba(30,86,240,0.02)] hover:border-slate-200'
          }`}>
            {theme === 'dark' && (
              <div className="absolute top-0 right-0 w-16 h-16 bg-[#1e56f0]/5 rounded-full blur-xl -mr-6 -mt-6" />
            )}
            <div className="flex items-center gap-2 relative z-10">
              <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-[11px] shadow-xs flex-shrink-0 transition-all ${
                theme === 'dark'
                  ? 'bg-gradient-to-tr from-[#1e56f0]/20 to-[#1e56f0]/5 border-[#1e56f0]/30 text-blue-400'
                  : 'bg-blue-50 border-blue-200 text-[#1e56f0]'
              }`}>
                {getInitials(user.nome)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[8px] uppercase font-black text-[#1e56f0] tracking-widest truncate">
                  Colaborador
                </div>
                <div className={`text-[11px] truncate font-bold leading-tight ${
                  theme === 'dark' ? 'text-white' : 'text-slate-800'
                }`}>
                  {user.nome || 'Operador'}
                </div>
                <div className={`text-[8px] font-semibold uppercase tracking-wider mt-0.5 flex items-center gap-1 ${
                  theme === 'dark' ? 'text-[#6a7d92]' : 'text-slate-500'
                }`}>
                  <span className="w-1 h-1 rounded-full bg-[#1e56f0] animate-pulse" />
                  {user.papel === 'admin' ? 'Administração' : (user.papel === 'controle' || user.isControle) ? 'Supervisor' : 'Operações'}
                </div>
              </div>
            </div>
            
            <div className={`flex items-center justify-between gap-1.5 mt-2 pt-2 border-t ${
              theme === 'dark' ? 'border-[#1c2530]' : 'border-slate-100'
            }`}>
              <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 border rounded ${
                theme === 'dark'
                  ? 'bg-emerald-500/20 border-emerald-500/20 text-emerald-400'
                  : 'bg-emerald-500/10 border-emerald-500/15 text-emerald-600'
              }`}>
                ✓ ATIVO
              </span>
              <button 
                onClick={onLogout}
                className={`text-[9px] font-bold rounded px-1.5 py-0.5 flex items-center gap-1 cursor-pointer transition-colors ml-auto border-none ${
                  theme === 'dark'
                    ? 'text-[#6a7d92] hover:text-rose-400 hover:bg-[#ef4444]/10'
                    : 'text-slate-500 hover:text-red-500 hover:bg-red-500/5'
                }`}
                title="Sair da Conta"
              >
                <LogOut className="w-2.5 h-2.5" />
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
          <div className="px-2.5 pt-2">
            <div className="relative">
              <Search className={`absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 ${
                theme === 'dark' ? 'text-[#6a7d92]' : 'text-slate-400'
              }`} />
              <input 
                type="text"
                placeholder="Ir para setor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full border rounded pl-7 pr-5 py-1 font-sans text-[11px] outline-none transition-all ${
                  theme === 'dark'
                    ? 'bg-[#11151c]/50 border-[#1c2530] text-white placeholder-[#6a7d92] focus:border-[#1e56f0]/40 focus:bg-[#11151c]'
                    : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-[#1e56f0]/40 focus:bg-white'
                }`}
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 text-[9px] border-none bg-transparent cursor-pointer ${
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
                    className="w-full flex items-center justify-between text-[8px] uppercase tracking-widest font-black text-slate-500 dark:text-[#6a7d92] hover:text-[#1e56f0] dark:hover:text-white px-2 py-0.5 bg-transparent border-none cursor-pointer transition-colors"
                  >
                    <span>{category}</span>
                    <span>
                      {isExpanded ? (
                        <ChevronDown className="w-2.5 h-2.5 stroke-[2.5]" />
                      ) : (
                        <ChevronRight className="w-2.5 h-2.5 stroke-[2.5]" />
                      )}
                    </span>
                  </button>
                )}
                
                {isGeral && (
                  <div className="text-[8px] uppercase tracking-widest font-black text-slate-400 dark:text-[#6a7d92]/70 px-2 py-0.5 flex items-center justify-between">
                    <span>{category}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-200 dark:bg-[#1c2530]" />
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
              <span className="text-[9px] text-[#6a7d92] uppercase font-bold tracking-wider block">
                Nenhum setor encontrado
              </span>
            </div>
          )}
        </nav>

        {/* Sidebar Footer block: Network indicators / Clock time */}
        <div className={`p-2 border-t flex flex-col gap-1.5 items-center text-center ${
          theme === 'dark'
            ? 'border-[#1c2530] bg-[#07090d]/40'
            : 'border-slate-100 bg-white'
        }`}>
          <div className={`font-mono text-[11px] tracking-wider select-none font-black flex items-center gap-1 justify-center ${
            theme === 'dark' ? 'text-blue-400' : 'text-[#1e56f0]'
          }`}>
            <Clock className={`w-3 h-3 animate-pulse-slow ${
              theme === 'dark' ? 'text-blue-400' : 'text-[#1e56f0]'
            }`} />
            {!collapsed && <span>{timeStr}</span>}
          </div>



          {!collapsed && (
            <div className={`w-full py-1 px-2 rounded font-sans font-black text-[8px] tracking-widest text-center border transition-all flex items-center justify-center gap-1 ${
              isFbOnline 
                ? theme === 'dark'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                  : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/15'
                : theme === 'dark'
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/20 animate-pulse'
                  : 'bg-rose-500/10 text-rose-600 border-rose-500/15 animate-pulse'
            }`}>
              <span className={`w-1 h-1 rounded-full ${isFbOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span>{isFbOnline ? 'ONLINE' : 'DESCONECTADO'}</span>
            </div>
          )}
        </div>

      </aside>
    </>
  );
}
