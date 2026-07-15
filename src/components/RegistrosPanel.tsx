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
    card: 'border-purple-500/30 bg-purple-500/[0.05] hover:border-purple-500/60 hover:bg-purple-500/[0.08]',
    iconBg: 'bg-purple-500/15',
    iconText: 'text-purple-600 dark:text-purple-400',
    tag: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/20',
    title: 'text-purple-700 dark:text-purple-300',
    desc: 'text-purple-900/75 dark:text-purple-200/75',
    action: 'text-purple-600 dark:text-purple-400'
  },
  rose: {
    card: 'border-rose-500/30 bg-rose-500/[0.05] hover:border-rose-500/60 hover:bg-rose-500/[0.08]',
    iconBg: 'bg-rose-500/15',
    iconText: 'text-rose-600 dark:text-rose-400',
    tag: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/20',
    title: 'text-rose-700 dark:text-rose-300',
    desc: 'text-rose-900/75 dark:text-rose-200/75',
    action: 'text-rose-600 dark:text-rose-400'
  },
  sky: {
    card: 'border-sky-500/30 bg-sky-500/[0.05] hover:border-sky-500/60 hover:bg-sky-500/[0.08]',
    iconBg: 'bg-sky-500/15',
    iconText: 'text-sky-600 dark:text-sky-400',
    tag: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/20',
    title: 'text-sky-700 dark:text-sky-300',
    desc: 'text-sky-900/75 dark:text-sky-200/75',
    action: 'text-sky-600 dark:text-sky-400'
  },
  red: {
    card: 'border-red-500/30 bg-red-500/[0.05] hover:border-red-500/60 hover:bg-red-500/[0.08]',
    iconBg: 'bg-red-500/15',
    iconText: 'text-red-600 dark:text-red-400',
    tag: 'bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/20',
    title: 'text-red-700 dark:text-red-300',
    desc: 'text-red-900/75 dark:text-red-200/75',
    action: 'text-red-600 dark:text-red-400'
  },
  emerald: {
    card: 'border-emerald-500/30 bg-emerald-500/[0.05] hover:border-emerald-500/60 hover:bg-emerald-500/[0.08]',
    iconBg: 'bg-emerald-500/15',
    iconText: 'text-emerald-600 dark:text-emerald-400',
    tag: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20',
    title: 'text-emerald-700 dark:text-emerald-300',
    desc: 'text-emerald-900/75 dark:text-emerald-200/75',
    action: 'text-emerald-600 dark:text-emerald-400'
  },
  indigo: {
    card: 'border-indigo-500/30 bg-indigo-500/[0.05] hover:border-indigo-500/60 hover:bg-indigo-500/[0.08]',
    iconBg: 'bg-indigo-500/15',
    iconText: 'text-indigo-600 dark:text-indigo-400',
    tag: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20',
    title: 'text-indigo-700 dark:text-indigo-300',
    desc: 'text-indigo-900/75 dark:text-indigo-200/75',
    action: 'text-indigo-600 dark:text-indigo-400'
  },
  amber: {
    card: 'border-amber-500/30 bg-amber-500/[0.05] hover:border-amber-500/60 hover:bg-amber-500/[0.08]',
    iconBg: 'bg-amber-500/15',
    iconText: 'text-amber-600 dark:text-amber-400',
    tag: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20',
    title: 'text-amber-700 dark:text-amber-300',
    desc: 'text-amber-900/75 dark:text-amber-200/75',
    action: 'text-amber-600 dark:text-amber-400'
  },
  teal: {
    card: 'border-teal-500/30 bg-teal-500/[0.05] hover:border-teal-500/60 hover:bg-teal-500/[0.08]',
    iconBg: 'bg-teal-500/15',
    iconText: 'text-teal-600 dark:text-teal-400',
    tag: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/20',
    title: 'text-teal-700 dark:text-teal-300',
    desc: 'text-teal-900/75 dark:text-teal-200/75',
    action: 'text-teal-600 dark:text-teal-400'
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
      label: 'Operação Blitz Refugo',
      description: 'Inspeções e auditorias em paletes destinados a descarte para resgate de embalagens boas.',
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
              className={`group p-5 border rounded-xl transition-all duration-300 cursor-pointer flex flex-col justify-between h-[185px] relative overflow-hidden ${config.card}`}
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-white/[0.02] dark:bg-white/[0.01] rounded-bl-full transition-all group-hover:scale-110 pointer-events-none" />
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${config.iconBg}`}>
                    <sector.icon className={`w-5 h-5 ${config.iconText}`} />
                  </div>
                  <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md transition-all ${config.tag}`}>
                    {sector.tag}
                  </span>
                </div>
                
                <div>
                  <h3 className={`font-sans font-bold text-sm transition-colors ${config.title}`}>
                    {sector.label}
                  </h3>
                  <p className={`text-[11px] leading-snug mt-1.5 line-clamp-2 transition-colors ${config.desc}`}>
                    {sector.description}
                  </p>
                </div>
              </div>

              <div className={`flex items-center gap-1.5 text-xs font-bold transition-colors mt-4 ${config.action}`}>
                <span>Acessar Registro</span>
                <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
