import React, { useState } from 'react';
import { Usuario, Empresa } from '../types';
import { ExecutiveActionBoard } from './ExecutiveActionBoard';
import RegistrosPanel from './RegistrosPanel';
import { ListChecks, ShieldCheck, Layers, Plus } from 'lucide-react';

interface SimulacaoAcoesPanelProps {
  user: Usuario;
  empresa?: Empresa | null;
  onNavigate?: (panelId: string) => void;
  initialTab?: 'acoes' | 'governanca';
}

export default function SimulacaoAcoesPanel({ user, empresa = null, onNavigate = () => {}, initialTab = 'acoes' }: SimulacaoAcoesPanelProps) {
  const [activeTab, setActiveTab] = useState<'acoes' | 'governanca'>(initialTab);

  return (
    <div className="w-full space-y-6">
      {/* Top Header & Subtab Switcher */}
      <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
        <div>
          <h1 className="text-lg font-black uppercase text-white tracking-wide flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            Central de Ações e Governança
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Acompanhamento de tratativas, planos de ação DPO e governança de liberação de setores operacionais.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#0b1222] p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('acoes')}
            className={`px-4 py-2 rounded-lg font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border-none ${
              activeTab === 'acoes'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white bg-transparent'
            }`}
          >
            <ListChecks className="w-4 h-4" />
            Planos de Ação DPO
          </button>

          <button
            onClick={() => setActiveTab('governanca')}
            className={`px-4 py-2 rounded-lg font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border-none ${
              activeTab === 'governanca'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white bg-transparent'
            }`}
          >
            <Layers className="w-4 h-4" />
            Governança & Setores Operacionais
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'acoes' ? (
        <ExecutiveActionBoard user={user} />
      ) : (
        <RegistrosPanel user={user} empresa={empresa} onNavigate={onNavigate} />
      )}
    </div>
  );
}

