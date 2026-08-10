import React, { useState } from 'react';
import { BookOpen, Edit2, Check, HelpCircle, ChevronDown, ChevronUp, ShieldCheck, Target, RefreshCw } from 'lucide-react';
import { useSystemTargets } from '../utils/useSystemTargets';

export interface MetricDefinition {
  key: string;
  label: string;
  unit: string;
  comoCalcular: string;
  observacao?: string;
  padraoComparativo?: string;
}

interface ManualInstrucaoCardProps {
  title?: string;
  metrics: MetricDefinition[];
  userRole?: string;
  isManager?: boolean;
}

export function ManualInstrucaoCard({
  title = "Manual de Instrução & Parâmetros de Meta (DPO)",
  metrics,
  userRole,
  isManager = true
}: ManualInstrucaoCardProps) {
  const { targets, updateTarget } = useSystemTargets();
  const [isExpanded, setIsExpanded] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [tempVal, setTempVal] = useState<string>('');

  const handleStartEdit = (key: string, currentVal: number) => {
    setEditingKey(key);
    setTempVal(String(currentVal));
  };

  const handleSave = (key: string) => {
    const num = parseFloat(tempVal);
    if (!isNaN(num)) {
      updateTarget(key, num);
    }
    setEditingKey(null);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/60 rounded-2xl shadow-sm overflow-hidden mb-6 transition-all">
      {/* HEADER */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 text-white flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-emerald-400 shadow-inner">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black tracking-wide text-white">{title}</h3>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Padrão DPO
              </span>
            </div>
            <p className="text-[11px] text-blue-200">
              Metas vigentes e metodologia oficial de cálculo. Clique para {isExpanded ? 'recolher' : 'expadir'}.
            </p>
          </div>
        </div>

        <button className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10">
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {/* BODY */}
      {isExpanded && (
        <div className="p-4 space-y-4 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {metrics.map((m) => {
              const currentMeta = targets[m.key] !== undefined ? targets[m.key] : 0;
              const isEditing = editingKey === m.key;

              return (
                <div 
                  key={m.key} 
                  className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-2 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                        {m.label}
                      </span>

                      {/* META EDITABLE BADGE */}
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Meta:</span>
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="any"
                              value={tempVal}
                              onChange={(e) => setTempVal(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleSave(m.key)}
                              className="w-16 px-1.5 py-0.5 bg-blue-50 dark:bg-slate-800 border border-blue-400 text-xs font-black rounded text-center focus:outline-none"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSave(m.key)}
                              className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 cursor-pointer"
                              title="Salvar Meta"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-lg">
                            <span className="text-xs font-black text-emerald-700 dark:text-emerald-300">
                              {currentMeta} {m.unit}
                            </span>
                            {isManager && (
                              <button
                                onClick={() => handleStartEdit(m.key, currentMeta)}
                                className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer ml-0.5"
                                title="Ajustar Meta do Indicador"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* COMO CALCULAR */}
                    <div className="bg-slate-100/70 dark:bg-slate-800/60 p-2.5 rounded-lg text-xs space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                        📐 Como Calcular:
                      </span>
                      <p className="text-slate-700 dark:text-slate-200 font-medium leading-relaxed">
                        {m.comoCalcular}
                      </p>
                    </div>

                    {m.observacao && (
                      <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium italic flex items-center gap-1">
                        <HelpCircle className="w-3 h-3 shrink-0" />
                        {m.observacao}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                    <span>Fórmula Fixa — Somente a Meta Numérica é Editável</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">100% DPO Alinhado</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
