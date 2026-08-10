import React, { useState, useMemo } from 'react';
import { Zap, Clock, TrendingUp, Target, SlidersHorizontal, CheckCircle2, AlertTriangle, ShieldCheck, Box, Activity } from 'lucide-react';

interface SimuladorAgilidadeProps {
  tipo: 'repack' | 'despejo';
  totalHectolitros: number;
  totalCaixasUnidades: number;
  tempoTotalMinutos: number;
  metaHectolitrosMensal?: number;
  diasUteisElapsed?: number;
  diasUteisTotal?: number;
}

export const SimuladorAgilidadeMeta: React.FC<SimuladorAgilidadeProps> = ({
  tipo,
  totalHectolitros,
  totalCaixasUnidades,
  tempoTotalMinutos,
  metaHectolitrosMensal = 450,
  diasUteisElapsed = 18,
  diasUteisTotal = 22
}) => {
  const isRepack = tipo === 'repack';
  const setorNome = isRepack ? 'Repack' : 'Despejo';

  // State for interactive agility adjustment (+0%, +5%, +10%, +15%, +20%)
  const [agilidadeBonusPct, setAgilidadeBonusPct] = useState<number>(10); // Default target +10%

  // Real Current Metrics
  const horasTrabalhadas = Math.max(0.1, tempoTotalMinutos / 60);
  const agilidadeAtualHlHora = totalHectolitros > 0 ? totalHectolitros / horasTrabalhadas : 8.5;
  const tempoMedioMinUnit = totalCaixasUnidades > 0 ? tempoTotalMinutos / totalCaixasUnidades : 4.5; // minutes per package

  // Meta Target: Average time per package with 10% efficiency boost (+10% agility rate)
  const metaTempoMedioMinUnit = tempoMedioMinUnit * 0.909; // 10% faster per package
  const metaAgilidadeHlHora = agilidadeAtualHlHora * 1.10; // +10% HL/hour rate

  // Simulated Metrics based on selected slider
  const simulatedAgilidadeHlHora = agilidadeAtualHlHora * (1 + agilidadeBonusPct / 100);
  const simulatedTempoMedioMinUnit = tempoMedioMinUnit * (1 / (1 + agilidadeBonusPct / 100));
  const tempoEconomizadoMin = Math.max(0, tempoMedioMinUnit - simulatedTempoMedioMinUnit);

  // Monthly Projection based on simulated agility
  const diasRestantes = Math.max(1, diasUteisTotal - diasUteisElapsed);
  const mediaDiariaAtualHl = totalHectolitros / Math.max(1, diasUteisElapsed);
  const mediaDiariaSimuladaHl = mediaDiariaAtualHl * (1 + agilidadeBonusPct / 100);
  const projecaoFechamentoHl = totalHectolitros + (mediaDiariaSimuladaHl * diasRestantes);

  const atingiuMeta = projecaoFechamentoHl >= metaHectolitrosMensal;
  const atingimentoPercent = Math.min(200, Math.round((projecaoFechamentoHl / metaHectolitrosMensal) * 100));

  return (
    <div className="bg-white dark:bg-[#131d38] border border-gray-200 dark:border-slate-700/80 rounded-2xl p-5 shadow-xs space-y-5">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-slate-800 pb-3.5">
        <div>
          <h3 className="font-sans font-black text-xs uppercase tracking-wider text-[#032b5e] dark:text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500 animate-pulse" />
            Simulador de Meta & Agilidade de Operador - {setorNome}
          </h3>
          <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">
            Medição de produtividade em Hectolitros por Hora (HL/h) e Média de tempo por embalagem + 10% de Meta
          </p>
        </div>

        <span className="text-[10px] font-black bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-3 py-1 rounded-lg uppercase tracking-wider self-start sm:self-auto">
          Métrica Oficial DPO
        </span>
      </div>

      {/* 4 PRIMARY METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* CARD 1: AGILIDADE ATUAL (HL/H) */}
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 flex items-center gap-3">
          <div className="p-2.5 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">
              Agilidade Atual do Operador
            </span>
            <span className="text-xl font-black font-mono text-[#032b5e] dark:text-white block">
              {agilidadeAtualHlHora.toFixed(2)} HL/h
            </span>
            <span className="text-[9px] text-slate-500 font-bold uppercase block mt-0.5">
              Volume por hora trabalhada
            </span>
          </div>
        </div>

        {/* CARD 2: TEMPO MÉDIO POR EMBALAGEM */}
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 flex items-center gap-3">
          <div className="p-2.5 bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">
              Tempo Médio p/ Embalagem
            </span>
            <span className="text-xl font-black font-mono text-purple-700 dark:text-purple-300 block">
              {tempoMedioMinUnit.toFixed(2)} min
            </span>
            <span className="text-[9px] text-slate-500 font-bold uppercase block mt-0.5">
              Média por caixa / vasilhame
            </span>
          </div>
        </div>

        {/* CARD 3: META DE AGILIDADE (+10% EFICIÊNCIA) */}
        <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3.5 flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black text-amber-800 dark:text-amber-300 uppercase tracking-wider block">
              Meta Otimizada (+10%)
            </span>
            <span className="text-xl font-black font-mono text-amber-900 dark:text-amber-200 block">
              {metaAgilidadeHlHora.toFixed(2)} HL/h
            </span>
            <span className="text-[9px] text-amber-700 dark:text-amber-400 font-bold uppercase block mt-0.5">
              Alvo: {metaTempoMedioMinUnit.toFixed(2)} min/cx
            </span>
          </div>
        </div>

        {/* CARD 4: PROJEÇÃO MENSAL EM HL */}
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 flex items-center gap-3">
          <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">
              Projeção Mensal ({diasUteisTotal} dias)
            </span>
            <span className="text-xl font-black font-mono text-emerald-700 dark:text-emerald-300 block">
              {projecaoFechamentoHl.toFixed(1)} HL
            </span>
            <span className="text-[9px] text-slate-500 font-bold uppercase block mt-0.5">
              Meta: {metaHectolitrosMensal} HL
            </span>
          </div>
        </div>

      </div>

      {/* INTERACTIVE AGILITY SIMULATOR CONTROLS */}
      <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-black uppercase text-[#032b5e] dark:text-white tracking-wider flex items-center gap-1.5">
              <SlidersHorizontal className="w-4 h-4 text-amber-500" />
              Ajuste de Agilidade e Ritmo Operacional
            </span>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">
              Simule o ganho de tempo e a projeção mensal ao aumentar a agilidade do operador no {setorNome}.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            {[0, 5, 10, 15, 20].map((bonus) => (
              <button
                key={bonus}
                onClick={() => setAgilidadeBonusPct(bonus)}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  agilidadeBonusPct === bonus
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                +{bonus}%
              </button>
            ))}
          </div>
        </div>

        {/* SIMULATED IMPACT RESULTS BAR */}
        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">
              Nova Agilidade Simulada
            </span>
            <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-sm">
              {simulatedAgilidadeHlHora.toFixed(2)} HL/hora
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">
              Tempo Otimizado p/ Caixa
            </span>
            <span className="font-mono font-black text-purple-600 dark:text-purple-400 text-sm">
              {simulatedTempoMedioMinUnit.toFixed(2)} min ({tempoEconomizadoMin.toFixed(2)} min economizados)
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">
              Projeção Mensal Calculada
            </span>
            <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
              {projecaoFechamentoHl.toFixed(1)} HL ({atingimentoPercent}% da Meta)
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};
