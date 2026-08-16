import React, { useState } from 'react';
import { Usuario, Empresa } from '../types';
import { ExecutiveActionBoard } from './ExecutiveActionBoard';
import RegistrosPanel from './RegistrosPanel';
import { ListChecks, ShieldCheck, Layers, Plus, Flame, Sparkles } from 'lucide-react';
import { openModalAcaoDesvio, openModalAcaoMelhoria } from '../utils/actionsEvents';

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

        <div className="flex items-center gap-2 flex-wrap">
          {/* Ação de Desvio */}
          <button
            type="button"
            onClick={() => openModalAcaoDesvio()}
            className="px-3 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/40 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all hover:scale-105 cursor-pointer"
            title="Registrar Ação de Desvio ou Estouro de Gatilho DPO"
          >
            <Flame className="w-3.5 h-3.5 text-red-400 animate-pulse" />
            <span>+ Ação de Desvio</span>
          </button>

          {/* Ação de Melhoria */}
          <button
            type="button"
            onClick={() => openModalAcaoMelhoria()}
            className="px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all hover:scale-105 cursor-pointer"
            title="Registrar Ação de Melhoria TOR e Reuniões DPO"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>+ Ação de Melhoria TOR</span>
          </button>

          <div className="flex items-center gap-1.5 bg-[#0b1222] p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('acoes')}
              className={`px-3.5 py-1.5 rounded-lg font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer border-none ${
                activeTab === 'acoes'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white bg-transparent'
              }`}
            >
              <ListChecks className="w-3.5 h-3.5" />
              Planos DPO
            </button>

            <button
              onClick={() => setActiveTab('governanca')}
              className={`px-3.5 py-1.5 rounded-lg font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer border-none ${
                activeTab === 'governanca'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white bg-transparent'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Governança
            </button>
          </div>
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


