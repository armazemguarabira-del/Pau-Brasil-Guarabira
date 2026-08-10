import React from 'react';
import { Target, Info, Edit3 } from 'lucide-react';

export interface MetaParam {
  id: string;
  label: string;
  value: number;
  unit: string;
  step?: number;
  min?: number;
  max?: number;
  onChange: (newVal: number) => void;
  calculationText: string;
}

interface IndicatorMetaHeaderProps {
  indicatorName: string;
  metas: MetaParam[];
  theme?: 'light' | 'dark';
}

export const IndicatorMetaHeader: React.FC<IndicatorMetaHeaderProps> = ({
  indicatorName,
  metas,
  theme = 'dark'
}) => {
  const isDark = theme === 'dark';

  return (
    <div
      className={`p-4 rounded-2xl border shadow-sm transition-all mb-4 ${
        isDark
          ? 'bg-slate-900/90 border-slate-800 text-slate-100'
          : 'bg-white border-slate-200 text-slate-800'
      }`}
    >
      <div className="flex items-center justify-between border-b border-slate-200/20 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-sans font-black text-sm uppercase tracking-wider text-amber-500">
              Parâmetros & Metas do Indicador — {indicatorName}
            </h3>
            <span className="text-[10px] text-slate-400 font-mono block">
              Edite apenas o número da meta. A fórmula de cálculo permanece fixa e automática.
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {metas.map((m) => (
          <div
            key={m.id}
            className={`p-3 rounded-xl border flex flex-col justify-between gap-2.5 ${
              isDark
                ? 'bg-[#131b26] border-slate-800'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-black uppercase text-slate-200 tracking-wide">
                {m.label}
              </span>
              <div className="flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-amber-500/30 shadow-xs">
                <Edit3 className="w-3 h-3 text-amber-400" />
                <span className="text-[10px] text-slate-400 font-bold uppercase">Meta:</span>
                <input
                  type="number"
                  step={m.step ?? 1}
                  min={m.min ?? 0}
                  max={m.max ?? 9999}
                  value={m.value}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    m.onChange(isNaN(val) ? 0 : val);
                  }}
                  className="w-16 bg-slate-900 text-amber-400 font-mono font-black text-xs text-center border border-amber-500/50 rounded px-1 py-0.5 focus:outline-none focus:border-amber-300 focus:ring-1 focus:ring-amber-300"
                />
                <span className="text-[10px] text-amber-300 font-black">{m.unit}</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-300 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800 leading-relaxed">
              <div className="flex items-center gap-1 text-amber-400 font-bold text-[10px] uppercase mb-1">
                <Info className="w-3 h-3" />
                <span>Como é calculated:</span>
              </div>
              <p className="font-mono text-[10.5px] text-slate-300 font-medium">{m.calculationText}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
