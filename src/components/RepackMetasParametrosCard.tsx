import React, { useState } from 'react';
import { 
  BookOpen, 
  Edit2, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Target, 
  RotateCcw, 
  Zap, 
  Box, 
  Clock, 
  AlertTriangle,
  Layers,
  Save,
  X
} from 'lucide-react';

interface RepackMetasParametrosCardProps {
  empresaId: string;
  metaProdutividadeCxH: number;
  onUpdateMetaProdutividade: (newVal: number) => void;
  embalagensConfig: Record<string, { metaSec: number; label: string }>;
  onUpdateEmbalagemMeta: (key: string, newSec: number) => void;
  onResetEmbalagens: () => void;
  isManager?: boolean;
}

export function RepackMetasParametrosCard({
  empresaId,
  metaProdutividadeCxH = 10,
  onUpdateMetaProdutividade,
  embalagensConfig,
  onUpdateEmbalagemMeta,
  onResetEmbalagens,
  isManager = true
}: RepackMetasParametrosCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Edit states for Meta 1 (Produtividade cx/h)
  const [editingMeta1, setEditingMeta1] = useState(false);
  const [tempMeta1, setTempMeta1] = useState(String(metaProdutividadeCxH));

  // Edit states for individual packaging meta
  const [editingPackKey, setEditingPackKey] = useState<string | null>(null);
  const [tempMin, setTempMin] = useState<number>(0);
  const [tempSec, setTempSec] = useState<number>(0);

  const handleStartEditMeta1 = () => {
    setTempMeta1(String(metaProdutividadeCxH));
    setEditingMeta1(true);
  };

  const handleSaveMeta1 = () => {
    const num = parseFloat(tempMeta1);
    if (!isNaN(num) && num > 0) {
      onUpdateMetaProdutividade(num);
    }
    setEditingMeta1(false);
  };

  const handleStartEditPack = (key: string, currentSec: number) => {
    setEditingPackKey(key);
    setTempMin(Math.floor(currentSec / 60));
    setTempSec(currentSec % 60);
  };

  const handleSavePack = (key: string) => {
    const totalSec = Math.max(10, tempMin * 60 + tempSec);
    onUpdateEmbalagemMeta(key, totalSec);
    setEditingPackKey(null);
  };

  const packEntries = Object.entries(embalagensConfig);

  return (
    <div className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/60 rounded-2xl shadow-sm overflow-hidden mb-6 transition-all">
      {/* HEADER */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 bg-gradient-to-r from-[#0a1931] via-[#0f274a] to-[#153460] text-white flex items-center justify-between cursor-pointer select-none border-b border-blue-900/40"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-emerald-400 shadow-inner">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black tracking-wide text-white">
                Manual de Instrução & Parâmetros de Meta — Processo de Repack
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                PADRÃO DPO
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-blue-500/20 text-blue-300 border border-blue-400/30 hidden sm:inline-block">
                2 METAS OFICIAIS
              </span>
            </div>
            <p className="text-[11px] text-blue-200">
              Metas vigentes de ritmo operacional (cx/h) e tempos por embalagem. Clique para {isExpanded ? 'recolher' : 'expandir'}.
            </p>
          </div>
        </div>

        <button 
          type="button"
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
        >
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {/* BODY */}
      {isExpanded && (
        <div className="p-4 sm:p-5 space-y-5 bg-slate-50/60 dark:bg-slate-950/50">
          
          {/* AS 2 METAS OFICIAIS DE REPACK (APENAS ESTAS DUAS) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* META 1: PRODUTIVIDADE REPACK (CAIXAS POR HORA) */}
            <div className="lg:col-span-5 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs flex flex-col justify-between space-y-3">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase text-amber-500 tracking-wider block leading-none">
                        Meta 1 • Ritmo Operacional
                      </span>
                      <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                        Produtividade Repack
                      </span>
                    </div>
                  </div>

                  {/* EDITABLE META 1 BADGE */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">META:</span>
                    {editingMeta1 ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.5"
                          min="1"
                          max="100"
                          value={tempMeta1}
                          onChange={(e) => setTempMeta1(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveMeta1()}
                          className="w-16 px-1.5 py-0.5 bg-blue-50 dark:bg-slate-800 border border-blue-400 text-xs font-black rounded text-center focus:outline-none"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={handleSaveMeta1}
                          className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded cursor-pointer transition-colors"
                          title="Salvar Meta"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingMeta1(false)}
                          className="p-1 bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded cursor-pointer transition-colors"
                          title="Cancelar"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-lg">
                        <span className="text-xs font-black text-emerald-700 dark:text-emerald-300 font-mono">
                          {metaProdutividadeCxH} cx/h
                        </span>
                        {isManager && (
                          <button
                            type="button"
                            onClick={handleStartEditMeta1}
                            className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer ml-0.5 transition-colors"
                            title="Editar Meta de Produtividade (cx/h)"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* METODOLOGIA DE CÁLCULO */}
                <div className="bg-slate-100/70 dark:bg-slate-800/60 p-3 rounded-lg text-xs space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 block flex items-center gap-1">
                    📐 Como Calcular:
                  </span>
                  <p className="text-slate-700 dark:text-slate-200 font-medium leading-relaxed">
                    (Total de Caixas Reembaladas/Recuperadas) ÷ (Soma das Horas Trabalhadas da Equipe de Repack).
                  </p>
                </div>

                {/* GATILHO REPACK */}
                <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div className="text-[11px] leading-snug">
                    <span className="font-black text-rose-700 dark:text-rose-400 uppercase tracking-wide block">
                      Gatilho de Repack: &lt; {metaProdutividadeCxH} cx/h
                    </span>
                    <span className="text-rose-600/90 dark:text-rose-300">
                      Rendimento abaixo da meta dispara plano de contenção imediato e análise de causa raiz 4M.
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2 font-medium">
                <span>Fórmula Fixa — Somente a Meta Numérica é Editável</span>
                <span className="text-emerald-500 font-bold">100% DPO Alinhado</span>
              </div>
            </div>

            {/* META 2: META POR EMBALAGEM (GRADE COMPLETA DE TODAS AS EMBALAGENS) */}
            <div className="lg:col-span-7 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs flex flex-col justify-between space-y-3">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-500">
                      <Target className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase text-indigo-500 tracking-wider block leading-none">
                        Meta 2 • Tempos Unitários
                      </span>
                      <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                        Metas de Todas as Embalagens
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      {packEntries.length} Embalagens Ativas
                    </span>
                    {isManager && (
                      <button
                        type="button"
                        onClick={onResetEmbalagens}
                        className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 transition-colors cursor-pointer bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md"
                        title="Restaurar todas as embalagens para os tempos padrão DPO"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Restaurar Padrão
                      </button>
                    )}
                  </div>
                </div>

                {/* METODOLOGIA DE CÁLCULO */}
                <div className="bg-slate-100/70 dark:bg-slate-800/60 p-2.5 rounded-lg text-xs space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 block flex items-center gap-1">
                    📐 Como Calcular:
                  </span>
                  <p className="text-slate-700 dark:text-slate-200 font-medium leading-relaxed">
                    Σ (Meta Unitária da Embalagem em seg/caixa × Quantidade de Caixas) vs Tempo Real Total Gasto.
                  </p>
                </div>

                {/* GRADE INTERATIVA COM TODAS AS EMBALAGENS */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    <span>Embalagem / Vasilhame</span>
                    <span>Meta (Min:Seg / Caixa)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-[220px] overflow-y-auto pr-1">
                    {packEntries.map(([key, config]) => {
                      const isEditing = editingPackKey === key;
                      const mm = Math.floor(config.metaSec / 60);
                      const ss = config.metaSec % 60;
                      const formattedTime = `${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;

                      return (
                        <div 
                          key={key}
                          className={`p-2 rounded-lg border transition-all ${
                            isEditing
                              ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 shadow-xs'
                              : 'bg-slate-50/80 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate" title={key}>
                              {key}
                            </span>

                            {isEditing ? (
                              <div className="flex items-center gap-1 shrink-0">
                                <input
                                  type="number"
                                  min="0"
                                  max="59"
                                  value={tempMin}
                                  onChange={(e) => setTempMin(Math.max(0, parseInt(e.target.value) || 0))}
                                  className="w-8 px-1 py-0.5 text-[11px] font-mono font-bold bg-white dark:bg-slate-900 border border-blue-400 rounded text-center"
                                  placeholder="min"
                                />
                                <span className="text-xs font-bold">:</span>
                                <input
                                  type="number"
                                  min="0"
                                  max="59"
                                  value={tempSec}
                                  onChange={(e) => setTempSec(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                                  className="w-8 px-1 py-0.5 text-[11px] font-mono font-bold bg-white dark:bg-slate-900 border border-blue-400 rounded text-center"
                                  placeholder="seg"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSavePack(key)}
                                  className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded cursor-pointer"
                                  title="Salvar Tempo"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingPackKey(null)}
                                  className="p-1 bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded cursor-pointer"
                                  title="Cancelar"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[11px] font-mono font-black text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800/60">
                                  {formattedTime}
                                </span>
                                {isManager && (
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditPack(key, config.metaSec)}
                                    className="text-slate-400 hover:text-blue-500 cursor-pointer p-0.5"
                                    title={`Alterar meta de ${key}`}
                                  >
                                    <Edit2 className="w-2.5 h-2.5" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2 font-medium">
                <span>Clique no ícone de lápis para ajustar o tempo de qualquer embalagem</span>
                <span className="text-indigo-500 font-bold">Tempos Ponderados</span>
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
