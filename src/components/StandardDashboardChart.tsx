import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import { useCrossFilter } from '../context/CrossFilterContext';
import { Download, ZoomIn, ZoomOut, Maximize2, Filter, TrendingUp } from 'lucide-react';

export interface ChartDailyPoint {
  data: string; // DD/MM/YYYY or DD/MM
  dataISO?: string;
  valor: number;
  meta: number;
  unidade?: string;
  detalhes?: string;
  [key: string]: any;
}

interface StandardDashboardChartProps {
  title: string;
  subtitle?: string;
  data: ChartDailyPoint[];
  metaPadrao: number;
  unitLabel?: string; // e.g. "R$", "HL", "CX", "min"
  theme?: 'dark' | 'light';
  higherIsBetter?: boolean; // false for Quebras/Despejo/Errors, true for Productivity/Volume
}

export const StandardDashboardChart: React.FC<StandardDashboardChartProps> = ({
  title,
  subtitle,
  data,
  metaPadrao,
  unitLabel = 'un',
  theme = 'dark',
  higherIsBetter = false
}) => {
  const { toggleFilter, isFiltered } = useCrossFilter();
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [selectedRange, setSelectedRange] = useState<'30' | '60' | '90' | 'all'>('all');

  const isDark = theme === 'dark';

  // Filter data according to range
  const displayData = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    let sliceCount = data.length;
    if (selectedRange === '30') sliceCount = 30;
    else if (selectedRange === '60') sliceCount = 60;
    else if (selectedRange === '90') sliceCount = 90;

    return data.slice(-sliceCount);
  }, [data, selectedRange]);

  // Click handler for cross-filtering
  const handlePointClick = (entry: any) => {
    if (entry && entry.data) {
      toggleFilter('data', entry.data, 'Data');
    }
  };

  // Export chart data CSV
  const handleExportCSV = () => {
    if (displayData.length === 0) return;
    const headers = ['Data', `Resultado (${unitLabel})`, `Meta (${unitLabel})`, 'Status Meta'];
    const rows = displayData.map(d => {
      const isOK = higherIsBetter ? d.valor >= d.meta : d.valor <= d.meta;
      return [d.data, d.valor, d.meta, isOK ? 'DENTRO DA META' : 'FORA DA META'];
    });

    const csv = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encoded = encodeURI(csv);
    const a = document.createElement('a');
    a.href = encoded;
    a.download = `Evolucao_Diaria_${title.replace(/\s+/g, '_')}.csv`;
    a.click();
  };

  // Custom Dot component to highlight above/below target
  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!cx || !cy || !payload) return null;

    const valor = payload.valor ?? 0;
    const meta = payload.meta ?? metaPadrao;
    const isOK = higherIsBetter ? valor >= meta : valor <= meta;
    const active = isFiltered('data', payload.data);

    return (
      <circle
        cx={cx}
        cy={cy}
        r={active ? 7 : 4}
        fill={isOK ? '#10b981' : '#f43f5e'}
        stroke={active ? '#ffffff' : isDark ? '#111a30' : '#ffffff'}
        strokeWidth={active ? 3 : 2}
        className="cursor-pointer transition-all hover:r-6"
        onClick={() => handlePointClick(payload)}
      />
    );
  };

  // Custom Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item: ChartDailyPoint = payload[0].payload;
      const valor = item.valor ?? 0;
      const meta = item.meta ?? metaPadrao;
      const isOK = higherIsBetter ? valor >= meta : valor <= meta;

      return (
        <div className={`p-3 rounded-xl shadow-xl border backdrop-blur-md text-xs space-y-1.5 font-sans ${
          isDark ? 'bg-[#0f172a]/95 border-slate-700 text-white' : 'bg-white/95 border-slate-200 text-slate-800'
        }`}>
          <div className="font-black text-[11px] border-b pb-1 border-slate-700/50 flex items-center justify-between gap-3">
            <span>📅 Data: {item.data}</span>
            <span className={`px-2 py-0.5 rounded font-black text-[9px] uppercase ${
              isOK ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
            }`}>
              {isOK ? 'Meta Atingida' : 'Abaixo da Meta'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Resultado Real</span>
              <span className={`text-sm font-black ${isOK ? 'text-emerald-400' : 'text-rose-400'}`}>
                {unitLabel === 'R$' ? `R$ ${valor.toLocaleString('pt-BR')}` : `${valor} ${unitLabel}`}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Meta Diária</span>
              <span className="text-sm font-black text-amber-400">
                {unitLabel === 'R$' ? `R$ ${meta.toLocaleString('pt-BR')}` : `${meta} ${unitLabel}`}
              </span>
            </div>
          </div>

          {item.detalhes && (
            <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-700/30 font-sans">
              ℹ️ {item.detalhes}
            </p>
          )}

          <div className="pt-1 text-[9px] text-amber-400/80 italic font-semibold">
            👉 Clique no ponto para aplicar filtro cruzado nesta data.
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`p-5 rounded-2xl border shadow-sm transition-all ${
      isDark ? 'bg-[#111a30] border-slate-700/80 text-white' : 'bg-white border-slate-200 text-slate-800'
    }`}>
      {/* HEADER CONTROLS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-black text-base tracking-tight flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-400" /> {title}
          </h3>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>

        {/* CONTROLS: RANGE & EXPORT */}
        <div className="flex items-center flex-wrap gap-2">
          <div className={`flex items-center p-0.5 rounded-xl border ${
            isDark ? 'bg-[#0a1120] border-slate-700' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => setSelectedRange('30')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                selectedRange === '30' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              30 Dias
            </button>
            <button
              onClick={() => setSelectedRange('60')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                selectedRange === '60' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              60 Dias
            </button>
            <button
              onClick={() => setSelectedRange('all')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                selectedRange === 'all' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Download className="w-3.5 h-3.5" /> Exportar Dados
          </button>
        </div>
      </div>

      {/* CHART CONTAINER */}
      <div className="w-full h-72 pt-2">
        {displayData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-xs font-bold">
            Nenhum dado disponível para o período selecionado.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={displayData} onClick={(e: any) => e && e.activePayload && handlePointClick(e.activePayload[0].payload)}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#e2e8f0'} />
              <XAxis dataKey="data" stroke={isDark ? '#64748b' : '#94a3b8'} tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#475569' }} />
              <YAxis stroke={isDark ? '#64748b' : '#94a3b8'} tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#475569' }} />
              <Tooltip content={<CustomTooltip />} />

              {/* REQUISITO 30: LINHA PONTILHADA HORIZONTAL DA META */}
              <ReferenceLine
                y={metaPadrao}
                stroke="#f59e0b"
                strokeDasharray="5 5"
                strokeWidth={2}
                label={{
                  value: `META: ${metaPadrao} ${unitLabel}`,
                  fill: '#f59e0b',
                  fontSize: 10,
                  fontWeight: 'bold',
                  position: 'top'
                }}
              />

              {/* REQUISITO 30: LINHA CONTÍNUA + PONTOS DESTACADOS */}
              <Line
                type="monotone"
                dataKey="valor"
                name="Resultado Diário"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={<CustomDot />}
                activeDot={{ r: 8, stroke: '#ffffff', strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* LEGEND BAR */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-3 border-t border-slate-700/30 mt-2 font-medium">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> DENTRO DA META
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> FORA DA META
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-0.5 border-b-2 border-dashed border-amber-500"></span> LINHA DE META
          </span>
        </div>
        <span>👉 Clique em um ponto para filtrar a plataforma</span>
      </div>
    </div>
  );
};
