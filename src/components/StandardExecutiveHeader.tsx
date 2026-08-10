import React, { useState } from 'react';
import { Calendar, Filter, Sparkles, RefreshCw, DollarSign, Droplet, ChevronDown, Clock, Layers, ArrowLeft, ArrowRight } from 'lucide-react';
import { useCrossFilter } from '../context/CrossFilterContext';

interface StandardExecutiveHeaderProps {
  title?: string;
  subtitle?: string;
  theme?: 'dark' | 'light';
  className?: string;
  showCustomUnitCX?: boolean;
  onBack?: () => void;
  canGoBack?: boolean;
  onForward?: () => void;
  canGoForward?: boolean;
}

export const StandardExecutiveHeader: React.FC<StandardExecutiveHeaderProps> = ({
  title = 'Painel Executivo & Operacional',
  subtitle = 'Análise estratégica unificada com indicadores, performance em HL/R$ e inteligência de pátio.',
  theme = 'dark',
  className = '',
  showCustomUnitCX = false,
  onBack,
  canGoBack,
  onForward,
  canGoForward
}) => {
  const {
    filters,
    unidadeMedida,
    setUnidadeMedida,
    startDate,
    endDate,
    setDateRange,
    clearAllFilters,
    filterCount
  } = useCrossFilter();

  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);

  const isDark = theme === 'dark';

  // Month shortcuts helper
  const MONTH_SHORTCUTS = [
    { label: 'Jan/2026', start: '2026-01-01', end: '2026-01-31' },
    { label: 'Fev/2026', start: '2026-02-01', end: '2026-02-28' },
    { label: 'Mar/2026', start: '2026-03-01', end: '2026-03-31' },
    { label: 'Abr/2026', start: '2026-04-01', end: '2026-04-30' },
    { label: 'Mai/2026', start: '2026-05-01', end: '2026-05-31' },
    { label: 'Jun/2026', start: '2026-06-01', end: '2026-06-30' },
    { label: 'Jul/2026', start: '2026-07-01', end: '2026-07-31' },
    { label: 'Ago/2026', start: '2026-08-01', end: '2026-08-31' },
    { label: 'Set/2026', start: '2026-09-01', end: '2026-09-30' },
    { label: 'Out/2026', start: '2026-10-01', end: '2026-10-31' },
    { label: 'Nov/2026', start: '2026-11-01', end: '2026-11-30' },
    { label: 'Dez/2026', start: '2026-12-01', end: '2026-12-31' },
  ];

  const handleApplyShortcut = (start: string, end: string) => {
    setDateRange(start, end);
    setIsMonthDropdownOpen(false);
  };

  const handlePresetDays = (days: number) => {
    const today = new Date();
    const past = new Date();
    past.setDate(today.getDate() - (days - 1));

    const formatISO = (d: Date) => d.toISOString().split('T')[0];
    setDateRange(formatISO(past), formatISO(today));
    setIsMonthDropdownOpen(false);
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // Find if a month shortcut is active
  const activeShortcut = MONTH_SHORTCUTS.find(
    m => m.start === startDate && m.end === endDate
  );

  return (
    <div
      className={`p-3.5 md:p-4 rounded-2xl border shadow-md transition-all mb-4 ${
        isDark
          ? 'bg-gradient-to-r from-[#0d1527] via-[#0f1b33] to-[#121f3d] border-slate-700/80 text-white'
          : 'bg-gradient-to-r from-slate-50 via-white to-blue-50/40 border-slate-200 text-slate-800'
      } ${className}`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-700/30">
        
        {/* TITLE & BADGE AREA WITH NAVIGATION CONTROLS */}
        <div className="flex items-center gap-2.5">
          {/* Back & Forward Navigation Controls */}
          {(onBack || onForward) && (
            <div className="flex items-center gap-1 mr-1 flex-shrink-0">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  disabled={canGoBack === false}
                  className={`p-2 rounded-xl border transition-all flex items-center justify-center ${
                    canGoBack !== false
                      ? isDark
                        ? 'bg-[#151b23] hover:bg-slate-800 text-amber-400 border-amber-500/30 hover:border-amber-400 cursor-pointer shadow-sm'
                        : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 cursor-pointer shadow-sm'
                      : 'opacity-35 cursor-not-allowed bg-transparent border-slate-700/30 text-slate-500'
                  }`}
                  title={canGoBack !== false ? "Retornar para a tela anterior (Voltar)" : "Sem histórico anterior"}
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              {onForward && (
                <button
                  type="button"
                  onClick={onForward}
                  disabled={canGoForward === false}
                  className={`p-2 rounded-xl border transition-all flex items-center justify-center ${
                    canGoForward !== false
                      ? isDark
                        ? 'bg-[#151b23] hover:bg-slate-800 text-amber-400 border-amber-500/30 hover:border-amber-400 cursor-pointer shadow-sm'
                        : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 cursor-pointer shadow-sm'
                      : 'opacity-35 cursor-not-allowed bg-transparent border-slate-700/30 text-slate-500'
                  }`}
                  title={canGoForward !== false ? "Avançar para a próxima tela" : "Sem histórico posterior"}
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 font-black shadow-md flex items-center justify-center">
            <Sparkles className="w-5 h-5 fill-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-sans font-black text-sm md:text-base uppercase tracking-wider text-amber-400">
                {title}
              </h2>
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-mono font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                Cabeçalho Executivo Padronizado
              </span>
            </div>
            <p className="text-[10.5px] text-slate-400 font-medium line-clamp-1 mt-0.5">
              {subtitle}
            </p>
          </div>
        </div>

        {/* ACTIVE SUMMARY BADGES & CLEAR BUTTON */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Active Period Badge */}
          {(startDate || endDate) ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold font-mono">
              <Calendar className="w-3 h-3 text-amber-400" />
              <span>
                {startDate ? formatDisplayDate(startDate) : 'Início'} a {endDate ? formatDisplayDate(endDate) : 'Hoje'}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 text-[10px] font-bold font-mono">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>Todo o Período</span>
            </div>
          )}

          {/* Active Unit Badge */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono border ${
            unidadeMedida === 'RS'
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
              : 'bg-blue-500/20 border-blue-500/40 text-blue-300'
          }`}>
            {unidadeMedida === 'RS' ? <DollarSign className="w-3 h-3 text-emerald-400" /> : <Droplet className="w-3 h-3 text-blue-400" />}
            <span>Unidade: {unidadeMedida === 'RS' ? 'Reais (R$)' : 'Hectolitros (HL)'}</span>
          </div>

          {(filterCount > 0 || startDate || endDate) && (
            <button
              onClick={() => {
                clearAllFilters();
                setDateRange('', '');
              }}
              className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer"
              title="Restaurar todos os filtros e período para o padrão"
            >
              <RefreshCw className="w-3 h-3" /> Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* FILTER CONTROLS BAR: (a) PERÍODO CALENDARIZADO + (b) TOGGLE UNIDADE DE MEDIDA */}
      <div className="pt-3 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        
        {/* (a) SELEÇÃO DE PERÍODO CALENDARIZADO (7 COLS ON MD) */}
        <div className="md:col-span-7 flex flex-wrap items-center gap-2 bg-[#080d19] p-2 rounded-xl border border-slate-700/70">
          <div className="flex items-center gap-1.5 text-[#1e56f0] font-black text-[10px] uppercase tracking-wider px-1">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-300">Período:</span>
          </div>

          {/* DATE RANGE INPUTS */}
          <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setDateRange(e.target.value, endDate)}
              className={`w-1/2 px-2 py-1 rounded-lg font-mono text-[11px] font-bold outline-none border transition-all ${
                isDark
                  ? 'bg-[#121c33] border-slate-700 text-white focus:border-amber-400'
                  : 'bg-white border-slate-300 text-slate-800'
              }`}
            />
            <span className="text-slate-500 font-bold text-xs">até</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setDateRange(startDate, e.target.value)}
              className={`w-1/2 px-2 py-1 rounded-lg font-mono text-[11px] font-bold outline-none border transition-all ${
                isDark
                  ? 'bg-[#121c33] border-slate-700 text-white focus:border-amber-400'
                  : 'bg-white border-slate-300 text-slate-800'
              }`}
            />
          </div>

          {/* ATALHOS DE MÊS / ANO DROPDOWN & QUICK PILLS */}
          <div className="relative">
            <button
              onClick={() => setIsMonthDropdownOpen(!isMonthDropdownOpen)}
              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer"
            >
              <Clock className="w-3 h-3 text-amber-400" />
              <span>{activeShortcut ? activeShortcut.label : 'Atalhos Mês/Ano'}</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {isMonthDropdownOpen && (
              <div className="absolute left-0 mt-1.5 w-64 bg-[#0d1627] border border-slate-700 shadow-xl rounded-xl z-50 p-2 text-white animate-in fade-in duration-150">
                <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5 px-1.5">
                  Selecione o Mês / Período:
                </div>
                
                {/* QUICK DAYS PRESETS */}
                <div className="grid grid-cols-2 gap-1 mb-2 pb-2 border-b border-slate-800">
                  <button
                    onClick={() => handlePresetDays(7)}
                    className="text-[10px] font-bold text-left px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                  >
                    ⚡ Últimos 7 dias
                  </button>
                  <button
                    onClick={() => handlePresetDays(30)}
                    className="text-[10px] font-bold text-left px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                  >
                    📅 Últimos 30 dias
                  </button>
                </div>

                {/* MONTH SHORTCUTS GRID */}
                <div className="grid grid-cols-3 gap-1">
                  {MONTH_SHORTCUTS.map((m) => (
                    <button
                      key={m.label}
                      onClick={() => handleApplyShortcut(m.start, m.end)}
                      className={`text-[10px] font-bold py-1 px-1.5 rounded text-center transition-colors ${
                        startDate === m.start && endDate === m.end
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                <div className="mt-2 pt-1.5 border-t border-slate-800 flex justify-between">
                  <button
                    onClick={() => {
                      setDateRange('', '');
                      setIsMonthDropdownOpen(false);
                    }}
                    className="text-[9.5px] font-bold text-rose-400 hover:underline px-1"
                  >
                    Ver Todo o Período
                  </button>
                  <button
                    onClick={() => setIsMonthDropdownOpen(false)}
                    className="text-[9.5px] font-bold text-slate-400 hover:text-white px-1"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* (b) FILTRO GLOBAL DE UNIDADE DE MEDIDA (5 COLS ON MD) */}
        <div className="md:col-span-5 flex items-center justify-between md:justify-end gap-2 bg-[#080d19] p-2 rounded-xl border border-slate-700/70">
          <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-300">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>Unidade de Medida:</span>
          </div>

          {/* TOGGLE SEGMENTADO HL x R$ */}
          <div className="flex items-center bg-[#121c33] p-1 rounded-xl border border-slate-700/90 shadow-inner">
            <button
              type="button"
              onClick={() => setUnidadeMedida('HL')}
              className={`px-3 py-1 rounded-lg text-[10.5px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                unidadeMedida === 'HL'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md scale-102 border border-blue-400/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Droplet className={`w-3.5 h-3.5 ${unidadeMedida === 'HL' ? 'fill-white text-white' : 'text-slate-400'}`} />
              <span>Visão em HL (Hectolitros)</span>
            </button>

            <button
              type="button"
              onClick={() => setUnidadeMedida('RS')}
              className={`px-3 py-1 rounded-lg text-[10.5px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                unidadeMedida === 'RS'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md scale-102 border border-emerald-400/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <DollarSign className={`w-3.5 h-3.5 ${unidadeMedida === 'RS' ? 'text-white' : 'text-slate-400'}`} />
              <span>Visão em Reais (R$)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
