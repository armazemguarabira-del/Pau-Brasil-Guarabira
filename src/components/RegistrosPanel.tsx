import React from 'react';
import { Usuario, Empresa } from '../types';
import { 
  RefreshCw, 
  Trash2, 
  Truck, 
  AlertTriangle, 
  Calendar, 
  Search, 
  Package, 
  ClipboardCheck, 
  ChevronRight,
  ClipboardList
} from 'lucide-react';

interface RegistrosPanelProps {
  user: Usuario;
  empresa: Empresa | null;
  onNavigate: (panelId: string) => void;
}

// Highly polished, theme-adaptive color configuration for each sector
const colorConfig: Record<string, {
  card: string;
  iconBg: string;
  iconText: string;
  tag: string;
  title: string;
  desc: string;
  action: string;
}> = {
  purple: {
    card: 'border-purple-300 bg-purple-50/80 hover:border-purple-500 hover:bg-purple-100/90 dark:border-purple-500/30 dark:bg-purple-500/[0.05] dark:hover:border-purple-500/60 dark:hover:bg-purple-500/[0.08] shadow-xs hover:shadow-sm',
    iconBg: 'bg-purple-100 dark:bg-purple-500/20',
    iconText: 'text-purple-700 dark:text-purple-400',
    tag: 'bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/20',
    title: 'text-purple-900 dark:text-purple-100 font-extrabold',
    desc: 'text-purple-800/90 dark:text-purple-300',
    action: 'text-purple-700 dark:text-purple-400 group-hover:text-purple-900 dark:group-hover:text-purple-300'
  },
  rose: {
    card: 'border-rose-300 bg-rose-50/80 hover:border-rose-500 hover:bg-rose-100/90 dark:border-rose-500/30 dark:bg-rose-500/[0.05] dark:hover:border-rose-500/60 dark:hover:bg-rose-500/[0.08] shadow-xs hover:shadow-sm',
    iconBg: 'bg-rose-100 dark:bg-rose-500/20',
    iconText: 'text-rose-700 dark:text-rose-400',
    tag: 'bg-rose-100 text-rose-800 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/20',
    title: 'text-rose-900 dark:text-rose-100 font-extrabold',
    desc: 'text-rose-800/90 dark:text-rose-300',
    action: 'text-rose-700 dark:text-rose-400 group-hover:text-rose-900 dark:group-hover:text-rose-300'
  },
  sky: {
    card: 'border-sky-300 bg-sky-50/80 hover:border-sky-500 hover:bg-sky-100/90 dark:border-sky-500/30 dark:bg-sky-500/[0.05] dark:hover:border-sky-500/60 dark:hover:bg-sky-500/[0.08] shadow-xs hover:shadow-sm',
    iconBg: 'bg-sky-100 dark:bg-sky-500/20',
    iconText: 'text-sky-700 dark:text-sky-400',
    tag: 'bg-sky-100 text-sky-800 border border-sky-200 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/20',
    title: 'text-sky-900 dark:text-sky-100 font-extrabold',
    desc: 'text-sky-800/90 dark:text-sky-300',
    action: 'text-sky-700 dark:text-sky-400 group-hover:text-sky-900 dark:group-hover:text-sky-300'
  },
  red: {
    card: 'border-red-300 bg-red-50/80 hover:border-red-500 hover:bg-red-100/90 dark:border-red-500/30 dark:bg-red-500/[0.05] dark:hover:border-red-500/60 dark:hover:bg-red-500/[0.08] shadow-xs hover:shadow-sm',
    iconBg: 'bg-red-100 dark:bg-red-500/20',
    iconText: 'text-red-700 dark:text-red-400',
    tag: 'bg-red-100 text-red-800 border border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/20',
    title: 'text-red-900 dark:text-red-100 font-extrabold',
    desc: 'text-red-800/90 dark:text-red-300',
    action: 'text-red-700 dark:text-red-400 group-hover:text-red-900 dark:group-hover:text-red-300'
  },
  emerald: {
    card: 'border-emerald-300 bg-emerald-50/80 hover:border-emerald-500 hover:bg-emerald-100/90 dark:border-emerald-500/30 dark:bg-emerald-500/[0.05] dark:hover:border-emerald-500/60 dark:hover:bg-emerald-500/[0.08] shadow-xs hover:shadow-sm',
    iconBg: 'bg-emerald-100 dark:bg-emerald-500/20',
    iconText: 'text-emerald-700 dark:text-emerald-400',
    tag: 'bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/20',
    title: 'text-emerald-900 dark:text-emerald-100 font-extrabold',
    desc: 'text-emerald-800/90 dark:text-emerald-300',
    action: 'text-emerald-700 dark:text-emerald-400 group-hover:text-emerald-900 dark:group-hover:text-emerald-300'
  },
  indigo: {
    card: 'border-indigo-300 bg-indigo-50/80 hover:border-indigo-500 hover:bg-indigo-100/90 dark:border-indigo-500/30 dark:bg-indigo-500/[0.05] dark:hover:border-indigo-500/60 dark:hover:bg-indigo-500/[0.08] shadow-xs hover:shadow-sm',
    iconBg: 'bg-indigo-100 dark:bg-indigo-500/20',
    iconText: 'text-indigo-700 dark:text-indigo-400',
    tag: 'bg-indigo-100 text-indigo-800 border border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/20',
    title: 'text-indigo-900 dark:text-indigo-100 font-extrabold',
    desc: 'text-indigo-800/90 dark:text-indigo-300',
    action: 'text-indigo-700 dark:text-indigo-400 group-hover:text-indigo-900 dark:group-hover:text-indigo-300'
  },
  amber: {
    card: 'border-amber-300 bg-amber-50/80 hover:border-amber-500 hover:bg-amber-100/90 dark:border-amber-500/30 dark:bg-amber-500/[0.05] dark:hover:border-amber-500/60 dark:hover:bg-amber-500/[0.08] shadow-xs hover:shadow-sm',
    iconBg: 'bg-amber-100 dark:bg-amber-500/20',
    iconText: 'text-amber-700 dark:text-amber-400',
    tag: 'bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/20',
    title: 'text-amber-900 dark:text-amber-100 font-extrabold',
    desc: 'text-amber-800/90 dark:text-amber-300',
    action: 'text-amber-700 dark:text-amber-400 group-hover:text-amber-900 dark:group-hover:text-amber-300'
  },
  teal: {
    card: 'border-teal-300 bg-teal-50/80 hover:border-teal-500 hover:bg-teal-100/90 dark:border-teal-500/30 dark:bg-teal-500/[0.05] dark:hover:border-teal-500/60 dark:hover:bg-teal-500/[0.08] shadow-xs hover:shadow-sm',
    iconBg: 'bg-teal-100 dark:bg-teal-500/20',
    iconText: 'text-teal-700 dark:text-teal-400',
    tag: 'bg-teal-100 text-teal-800 border border-teal-200 dark:bg-teal-500/20 dark:text-teal-300 dark:border-teal-500/20',
    title: 'text-teal-900 dark:text-teal-100 font-extrabold',
    desc: 'text-teal-800/90 dark:text-teal-300',
    action: 'text-teal-700 dark:text-teal-400 group-hover:text-teal-900 dark:group-hover:text-teal-300'
  }
};

export default function RegistrosPanel({ user, empresa, onNavigate }: RegistrosPanelProps) {
  // Sector lists mapping with modular configurations
  const sectors = [
    {
      id: 'repack',
      label: 'Operação Repack',
      description: 'Lançamentos de reembalagem, refação de caixas e produtividade de garrafas.',
      icon: RefreshCw,
      colorKey: 'purple',
      tag: 'Produtividade'
    },
    {
      id: 'despejo',
      label: 'Operação Despejo',
      description: 'Descarte controlado de líquidos e garrafas com fluxo de auditoria física.',
      icon: Trash2,
      colorKey: 'rose',
      tag: 'Aprovação'
    },
    {
      id: 'armazem',
      label: 'Operação EFC / EFD',
      description: 'Controle de fluxo de caminhões, tempos de carregamento e janelas de faturamento.',
      icon: Truck,
      colorKey: 'sky',
      tag: 'Logística'
    },
    {
      id: 'quebras',
      label: 'Operação Quebras',
      description: 'Registro de avarias imediatas, quebras físicas em paletes e ruas do estoque.',
      icon: AlertTriangle,
      colorKey: 'red',
      tag: 'Avarias'
    },
    {
      id: 'validades',
      label: 'Operação Validade',
      description: 'Cadastro de lotes e vencimentos de produtos para controle de giro do estoque.',
      icon: Calendar,
      colorKey: 'emerald',
      tag: 'Qualidade (FEFO)'
    },
    {
      id: 'refugo',
      label: 'Operação Retorno de Rota',
      description: 'Inspeções e acompanhamento físico para liberação e aferimento de retorno de rotas.',
      icon: Search,
      colorKey: 'indigo',
      tag: 'Qualidade'
    },
    {
      id: 'empilhador',
      label: 'Operação Picking',
      description: 'Atribuição de reabastecimento de picking e controle de ordens por operadores de empilhadeira.',
      icon: Package,
      colorKey: 'amber',
      tag: 'Operacional'
    },
    {
      id: 'conferente',
      label: 'Operação Conferênte',
      description: 'Vistoria de volumes e auditoria para conciliação física de cargas prontas para rota.',
      icon: ClipboardCheck,
      colorKey: 'teal',
      tag: 'Controle'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Theme-adaptive glass header banner */}
      <div className="bg-[#11151c] border border-[#1c2530] rounded-2xl p-6 relative overflow-hidden shadow-sm">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <ClipboardList className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-sans font-black uppercase tracking-tight text-[#e8eef5] leading-none">
                Painel Geral de Registros de Setores
              </h2>
              <p className="text-xs text-[#6a7d92] mt-1.5">
                Central de atalhos rápidos para monitorar e auditar lançamentos de todos os setores operacionais.
              </p>
            </div>
          </div>
          <span className="text-[10px] uppercase font-black px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg self-start sm:self-auto tracking-widest">
            Modo Supervisor
          </span>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {sectors.map((sector) => {
          const config = colorConfig[sector.colorKey];
          return (
            <div 
              key={sector.id}
              onClick={() => onNavigate(sector.id)}
              className={`group p-4 border rounded-xl transition-all duration-300 cursor-pointer flex flex-col justify-between h-[155px] relative overflow-hidden ${config.card}`}
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-white/[0.02] dark:bg-white/[0.01] rounded-bl-full transition-all group-hover:scale-110 pointer-events-none" />
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${config.iconBg}`}>
                    <sector.icon className={`w-4.5 h-4.5 ${config.iconText}`} />
                  </div>
                  <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md transition-all ${config.tag}`}>
                    {sector.tag}
                  </span>
                </div>
                
                <div>
                  <h3 className={`font-sans font-bold text-xs sm:text-sm transition-colors ${config.title}`}>
                    {sector.label}
                  </h3>
                  <p className={`text-[10px] leading-snug mt-1 line-clamp-2 transition-colors ${config.desc}`}>
                    {sector.description}
                  </p>
                </div>
              </div>

              <div className={`flex items-center gap-1 text-[11px] font-bold transition-colors mt-2 ${config.action}`}>
                <span>Acessar Registro</span>
                <ChevronRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
