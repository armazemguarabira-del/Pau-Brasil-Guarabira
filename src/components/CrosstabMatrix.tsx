import React, { useMemo } from 'react';
import { useCrossFilter } from '../context/CrossFilterContext';
import { Table, Filter, Sparkles, HelpCircle } from 'lucide-react';

export interface CrosstabMatrixProps<T> {
  data: T[];
  rowField: string | ((item: T) => string);
  rowLabel?: string;
  colField: string | ((item: T) => string);
  colLabel?: string;
  valueField: string | ((item: T) => number);
  valueLabel?: string;
  aggregation?: 'sum' | 'count' | 'avg';
  formatValue?: (val: number) => string;
  title?: string;
  subtitle?: string;
  maxRows?: number;
  maxCols?: number;
  className?: string;
  theme?: 'light' | 'dark';
}

export function CrosstabMatrix<T extends Record<string, any>>({
  data,
  rowField,
  rowLabel = 'Linha',
  colField,
  colLabel = 'Coluna',
  valueField,
  valueLabel = 'Valor',
  aggregation = 'sum',
  formatValue,
  title,
  subtitle,
  maxRows = 12,
  maxCols = 8,
  className = '',
  theme = 'light'
}: CrosstabMatrixProps<T>) {
  const { toggleFilter, isFiltered, filters } = useCrossFilter();

  const getRowVal = (item: T): string => {
    if (typeof rowField === 'function') return rowField(item) || 'Outros';
    return String(item[rowField] || 'Outros');
  };

  const getColVal = (item: T): string => {
    if (typeof colField === 'function') return colField(item) || 'Outros';
    return String(item[colField] || 'Outros');
  };

  const getNumericVal = (item: T): number => {
    if (typeof valueField === 'function') return valueField(item) || 0;
    const v = item[valueField];
    return typeof v === 'number' ? v : parseFloat(v) || 0;
  };

  const rowFieldName = typeof rowField === 'string' ? rowField : 'linha';
  const colFieldName = typeof colField === 'string' ? colField : 'coluna';

  // Compute Matrix structure
  const matrixData = useMemo(() => {
    if (!data || data.length === 0) {
      return { rowKeys: [], colKeys: [], cells: {}, rowTotals: {}, colTotals: {}, grandTotal: 0 };
    }

    const rowMap: Record<string, number> = {};
    const colMap: Record<string, number> = {};
    const cellMap: Record<string, { sum: number; count: number }> = {};
    const rowCounts: Record<string, number> = {};
    const colCounts: Record<string, number> = {};

    data.forEach(item => {
      const r = getRowVal(item);
      const c = getColVal(item);
      const val = getNumericVal(item);

      const cellKey = `${r}___${c}`;

      if (!cellMap[cellKey]) {
        cellMap[cellKey] = { sum: 0, count: 0 };
      }
      cellMap[cellKey].sum += val;
      cellMap[cellKey].count += 1;

      rowMap[r] = (rowMap[r] || 0) + val;
      colMap[c] = (colMap[c] || 0) + val;
      rowCounts[r] = (rowCounts[r] || 0) + 1;
      colCounts[c] = (colCounts[c] || 0) + 1;
    });

    // Sort rows and cols by total descending
    const rowKeys = Object.keys(rowMap).sort((a, b) => rowMap[b] - rowMap[a]).slice(0, maxRows);
    const colKeys = Object.keys(colMap).sort((a, b) => colMap[b] - colMap[a]).slice(0, maxCols);

    let grandTotal = 0;
    const computedRowTotals: Record<string, number> = {};
    const computedColTotals: Record<string, number> = {};

    rowKeys.forEach(r => {
      if (aggregation === 'count') {
        computedRowTotals[r] = rowCounts[r] || 0;
      } else if (aggregation === 'avg') {
        computedRowTotals[r] = rowCounts[r] ? rowMap[r] / rowCounts[r] : 0;
      } else {
        computedRowTotals[r] = rowMap[r] || 0;
      }
    });

    colKeys.forEach(c => {
      if (aggregation === 'count') {
        computedColTotals[c] = colCounts[c] || 0;
      } else if (aggregation === 'avg') {
        computedColTotals[c] = colCounts[c] ? colMap[c] / colCounts[c] : 0;
      } else {
        computedColTotals[c] = colMap[c] || 0;
      }
    });

    rowKeys.forEach(r => {
      grandTotal += computedRowTotals[r];
    });

    return {
      rowKeys,
      colKeys,
      cells: cellMap,
      rowTotals: computedRowTotals,
      colTotals: computedColTotals,
      grandTotal
    };
  }, [data, rowField, colField, valueField, aggregation, maxRows, maxCols]);

  const defaultFormat = (val: number): string => {
    if (isNaN(val)) return '0';
    if (valueLabel.toLowerCase().includes('r$') || valueLabel.toLowerCase().includes('valor')) {
      return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
    }
    return val % 1 === 0 ? val.toLocaleString('pt-BR') : val.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  };

  const formatter = formatValue || defaultFormat;

  const activeRowVal = filters[rowFieldName];
  const activeColVal = filters[colFieldName];

  const handleRowClick = (rVal: string) => {
    toggleFilter(rowFieldName, rVal, rowLabel);
  };

  const handleColClick = (cVal: string) => {
    toggleFilter(colFieldName, cVal, colLabel);
  };

  const handleCellClick = (rVal: string, cVal: string) => {
    toggleFilter(rowFieldName, rVal, rowLabel);
    toggleFilter(colFieldName, cVal, colLabel);
  };

  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-5 shadow-xs transition-all ${className}`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
              <Table className="w-4 h-4" />
            </div>
            <h3 className="font-sans font-black text-xs uppercase text-[#032b5e] tracking-wider">
              {title || `Tabela Cruzada (Matriz): ${rowLabel} x ${colLabel}`}
            </h3>
          </div>
          {subtitle && (
            <p className="text-[11px] text-slate-500 font-medium mt-0.5 ml-7">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            Cross-Filtering Ativo
          </span>
        </div>
      </div>

      {/* Matrix Table */}
      {matrixData.rowKeys.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-xs font-medium bg-slate-50 rounded-lg border border-dashed border-slate-200">
          Nenhum dado para exibir com os filtros atuais.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/80 border-b-2 border-slate-200">
                {/* Top-left header cell */}
                <th className="p-2.5 font-black text-[#032b5e] uppercase text-[10px] tracking-wider border-r border-slate-200 min-w-[140px]">
                  <div className="flex items-center justify-between">
                    <span>{rowLabel} \ {colLabel}</span>
                  </div>
                </th>

                {/* Column Headers */}
                {matrixData.colKeys.map(cKey => {
                  const isColActive = String(activeColVal) === String(cKey);
                  return (
                    <th
                      key={cKey}
                      onClick={() => handleColClick(cKey)}
                      className={`p-2.5 font-bold text-center text-[10px] uppercase tracking-wider cursor-pointer select-none transition-all border-r border-slate-200 min-w-[110px] hover:bg-amber-100/60 ${
                        isColActive 
                          ? 'bg-amber-500 text-white shadow-xs font-black' 
                          : 'text-slate-700 hover:text-amber-900'
                      }`}
                      title={`Filtrar por ${colLabel}: ${cKey}`}
                    >
                      <div className="truncate max-w-[120px] mx-auto">{cKey}</div>
                    </th>
                  );
                })}

                {/* Row Total Header */}
                <th className="p-2.5 font-black text-right text-[10px] uppercase text-[#032b5e] bg-slate-200/70 min-w-[100px]">
                  Total {rowLabel}
                </th>
              </tr>
            </thead>

            <tbody>
              {matrixData.rowKeys.map((rKey, idx) => {
                const isRowActive = String(activeRowVal) === String(rKey);
                const rowVal = matrixData.rowTotals[rKey] || 0;

                return (
                  <tr
                    key={rKey}
                    className={`border-b border-slate-100 transition-colors ${
                      isRowActive ? 'bg-amber-50/80' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                    } hover:bg-amber-50/50`}
                  >
                    {/* Row Header Cell */}
                    <td
                      onClick={() => handleRowClick(rKey)}
                      className={`p-2.5 font-semibold text-[11px] border-r border-slate-200 cursor-pointer select-none transition-all ${
                        isRowActive
                          ? 'bg-amber-500 text-white font-black'
                          : 'text-slate-800 hover:text-amber-900 hover:bg-amber-100/60'
                      }`}
                      title={`Filtrar por ${rowLabel}: ${rKey}`}
                    >
                      <div className="truncate max-w-[180px]">{rKey}</div>
                    </td>

                    {/* Matrix Intersection Cells */}
                    {matrixData.colKeys.map(cKey => {
                      const isColActive = String(activeColVal) === String(cKey);
                      const isCellActive = isRowActive && isColActive;
                      const cellKey = `${rKey}___${cKey}`;
                      const cellObj = matrixData.cells[cellKey];

                      let val = 0;
                      if (cellObj) {
                        if (aggregation === 'count') val = cellObj.count;
                        else if (aggregation === 'avg') val = cellObj.count ? cellObj.sum / cellObj.count : 0;
                        else val = cellObj.sum;
                      }

                      const hasVal = val > 0;

                      return (
                        <td
                          key={cKey}
                          onClick={() => handleCellClick(rKey, cKey)}
                          className={`p-2.5 text-right font-mono text-[11px] border-r border-slate-200 cursor-pointer select-none transition-all ${
                            isCellActive
                              ? 'bg-amber-600 text-white font-black shadow-inner'
                              : isRowActive || isColActive
                              ? 'bg-amber-100/70 text-amber-950 font-bold'
                              : hasVal
                              ? 'text-slate-800 hover:bg-amber-100/50 hover:font-bold'
                              : 'text-slate-300'
                          }`}
                          title={`Filtrar por ${rowLabel}: ${rKey} & ${colLabel}: ${cKey}`}
                        >
                          {hasVal ? formatter(val) : '-'}
                        </td>
                      );
                    })}

                    {/* Row Total Cell */}
                    <td className="p-2.5 text-right font-mono font-bold text-[11px] text-[#032b5e] bg-slate-100/50">
                      {formatter(rowVal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Matrix Footer Totals */}
            <tfoot>
              <tr className="bg-slate-200/80 font-black border-t-2 border-slate-300">
                <td className="p-2.5 text-[#032b5e] text-[10px] uppercase tracking-wider border-r border-slate-300">
                  Total {colLabel}
                </td>

                {matrixData.colKeys.map(cKey => {
                  const colVal = matrixData.colTotals[cKey] || 0;
                  return (
                    <td key={cKey} className="p-2.5 text-right font-mono text-[11px] text-[#032b5e] border-r border-slate-300">
                      {formatter(colVal)}
                    </td>
                  );
                })}

                <td className="p-2.5 text-right font-mono text-xs text-amber-900 bg-amber-100/80">
                  {formatter(matrixData.grandTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Footer instruction */}
      <div className="mt-3 text-[10px] text-slate-500 font-medium flex items-center justify-between">
        <span className="flex items-center gap-1 text-slate-400">
          <HelpCircle className="w-3 h-3" />
          Clique em uma linha, coluna ou célula para cruzar os filtros com todo o dashboard.
        </span>
        <span className="font-mono text-slate-400">
          {data.length} registros analisados
        </span>
      </div>
    </div>
  );
}
