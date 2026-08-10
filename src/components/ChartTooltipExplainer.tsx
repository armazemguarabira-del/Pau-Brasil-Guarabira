import React from 'react';
import { Info } from 'lucide-react';

interface ChartTooltipExplainerProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  title?: string;
  concept?: string;
  formula?: string;
  unit?: string;
  customFormatter?: (val: number) => string;
}

export const ChartTooltipExplainer: React.FC<ChartTooltipExplainerProps> = ({
  active,
  payload,
  label,
  title,
  concept,
  formula,
  unit = '',
  customFormatter
}) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-[#0f172a] text-white border border-[#334155] p-3 rounded-xl shadow-xl max-w-xs text-xs z-50">
      <div className="font-bold border-b border-[#334155] pb-1.5 mb-2 text-amber-400 flex items-center justify-between gap-2">
        <span>{title || label || 'Indicador Operacional'}</span>
        <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono">DPO</span>
      </div>

      {payload.map((entry, index) => {
        const val = typeof entry.value === 'number' 
          ? customFormatter ? customFormatter(entry.value) : `${entry.value.toLocaleString('pt-BR')}${unit}`
          : entry.value;

        return (
          <div key={`item-${index}`} className="flex items-center justify-between gap-3 my-1">
            <span className="flex items-center gap-1.5 text-slate-300 font-medium">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: entry.color || entry.fill || '#3b82f6' }} />
              {entry.name || entry.dataKey}:
            </span>
            <span className="font-mono font-bold text-emerald-400">{val}</span>
          </div>
        );
      })}

      {(concept || formula) && (
        <div className="mt-2.5 pt-2 border-t border-[#334155]/80 flex flex-col gap-1.5 text-[10px] text-slate-300">
          {concept && (
            <div className="flex items-start gap-1">
              <Info className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-400 font-bold">O que é: </strong>
                <span>{concept}</span>
              </div>
            </div>
          )}
          {formula && (
            <div className="flex items-start gap-1">
              <span className="text-emerald-400 font-mono font-bold shrink-0">fx:</span>
              <div>
                <strong className="text-emerald-400 font-bold">Cálculo: </strong>
                <span className="font-mono text-slate-200">{formula}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
