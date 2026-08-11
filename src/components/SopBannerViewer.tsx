import React, { useState, useEffect, useMemo } from 'react';
import { getAllSopsForOperationList, SopViewOption, openPdfInNewTab, downloadPdfFile, deleteSop, createSafePdfBlobUrl } from '../utils/sopUtils';
import { BookOpen, ChevronDown, ChevronUp, FileText, CheckCircle2, Download, ExternalLink, Layers, Trash2, Eye, X, Maximize2 } from 'lucide-react';

interface SopBannerViewerProps {
  operation: 'repack' | 'despejo' | 'armazem' | 'logistica' | 'fefo' | 'picking' | 'quebras' | 'validades' | 'empilhador';
  operationName: string;
  theme?: 'light' | 'dark';
}

export function SopBannerViewer({ operation, operationName, theme = 'dark' }: SopBannerViewerProps) {
  const [expanded, setExpanded] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});
  const [allSopsList, setAllSopsList] = useState<SopViewOption[]>(() => getAllSopsForOperationList(operation));
  const [selectedSopId, setSelectedSopId] = useState<string>('');
  const [showEmbeddedPdf, setShowEmbeddedPdf] = useState(true);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  const refreshSops = () => {
    const list = getAllSopsForOperationList(operation);
    setAllSopsList(list);
    if (list.length > 0 && (!selectedSopId || !list.some(s => s.id === selectedSopId))) {
      setSelectedSopId(list[0].id);
    }
  };

  useEffect(() => {
    refreshSops();

    if (typeof window !== 'undefined') {
      window.addEventListener('af_pop_updated', refreshSops);
      window.addEventListener('storage', refreshSops);
      return () => {
        window.removeEventListener('af_pop_updated', refreshSops);
        window.removeEventListener('storage', refreshSops);
      };
    }
  }, [operation]);

  useEffect(() => {
    if (allSopsList.length > 0 && !selectedSopId) {
      setSelectedSopId(allSopsList[0].id);
    }
  }, [allSopsList]);

  const selectedSop = allSopsList.find(s => s.id === selectedSopId) || allSopsList[0];

  const safePdfUrl = useMemo(() => {
    if (!selectedSop?.fileUrl) return '';
    return createSafePdfBlobUrl(selectedSop.fileUrl);
  }, [selectedSop?.fileUrl]);

  const toggleStep = (idx: number) => {
    setCompletedSteps(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  if (!selectedSop) return null;

  const hasFile = Boolean(selectedSop.fileUrl);

  return (
    <div className="mb-5 rounded-2xl border border-[#222d3a] bg-[#151b23] text-slate-100 transition-all duration-300 shadow-md overflow-hidden">
      {/* Selector Bar if multiple SOPs are available */}
      {allSopsList.length > 1 && (
        <div className="bg-[#0d1218] px-4 py-2.5 border-b border-[#222d3a] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
              Escolher Padrão da Célula ({allSopsList.length} disponíveis):
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedSopId}
              onChange={(e) => {
                setSelectedSopId(e.target.value);
                setCompletedSteps({});
                setShowEmbeddedPdf(true);
              }}
              className="bg-[#151b23] border border-[#2b384a] text-amber-300 text-xs font-bold py-1.5 px-3 rounded-xl focus:outline-none focus:border-amber-400 w-full sm:w-auto cursor-pointer"
            >
              {allSopsList.map((s) => (
                <option key={s.id} value={s.id} className="bg-[#151b23] text-slate-100 font-medium">
                  {s.displayName}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Banner Header Bar */}
      <div 
        onClick={() => setExpanded(!expanded)}
        className="p-4 flex items-center justify-between cursor-pointer select-none hover:bg-[#1a222c] transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-xs shrink-0 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-300 bg-blue-950/80 border border-blue-800/60 px-2 py-0.5 rounded-full shrink-0">
                Instrução Padrão de Trabalho (POP / SOP)
              </span>
              <span className="text-[10px] text-slate-400 font-mono font-bold shrink-0">
                {operationName.toUpperCase()}
              </span>
            </div>
            <h3 className="text-sm md:text-base font-black uppercase tracking-tight text-white mt-1 break-words">
              {selectedSop.displayName || selectedSop.title}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span className="text-[10px] font-bold text-amber-400 hidden sm:inline-block bg-amber-400/10 px-2.5 py-1 rounded-lg border border-amber-400/20">
            {expanded ? 'Ocultar Padrão' : 'Ver Padrão de Operação'}
          </span>
          <div className="p-2 rounded-lg bg-[#222d3a] text-amber-400">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {/* Expanded Content View */}
      {expanded && (
        <div className="px-5 pb-5 pt-3 border-t border-[#222d3a] space-y-4 animate-in fade-in duration-200 bg-[#11161d]">
          {selectedSop.description && (
            <p className="text-xs text-slate-300 leading-relaxed font-medium bg-[#151b23] p-3 rounded-xl border border-[#222d3a]">
              {selectedSop.description}
            </p>
          )}

          {/* Download or View Attached File if available */}
          {hasFile && (
            <div className="space-y-3 p-4 rounded-xl bg-[#0d1218] border border-blue-500/40 shadow-inner">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-100 block uppercase tracking-wide">
                      Documento Oficial Anexado: {selectedSop.fileName || 'Padrao_Operacional.pdf'}
                    </span>
                    <span className="text-[11px] text-blue-300 font-medium">
                      Padrão de trabalho importado em PDF para visualização e consulta operacional
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setShowEmbeddedPdf(!showEmbeddedPdf)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{showEmbeddedPdf ? 'Ocultar PDF' : 'Exibir PDF'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPdfModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Tela Cheia</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openPdfInNewTab(selectedSop.fileUrl!, selectedSop.fileName || 'Padrao_Operacional.pdf')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Nova Aba</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => downloadPdfFile(selectedSop.fileUrl!, selectedSop.fileName || 'Padrao_Operacional.pdf')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      deleteSop(selectedSop.id);
                      refreshSops();
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white font-bold text-xs rounded-xl border border-rose-500/40 shadow-xs transition-all cursor-pointer"
                    title="Excluir este Padrão Operacional"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* EMBEDDED INTERACTIVE PDF VIEWER */}
              {showEmbeddedPdf && safePdfUrl && (
                <div className="mt-3 rounded-xl border border-blue-500/30 overflow-hidden bg-slate-900 h-[500px] shadow-lg">
                  <object
                    data={safePdfUrl}
                    type="application/pdf"
                    className="w-full h-full"
                  >
                    <iframe
                      src={safePdfUrl}
                      title={selectedSop.fileName || 'Documento PDF'}
                      className="w-full h-full border-0"
                    >
                      <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-3 bg-slate-900 text-slate-200">
                        <FileText className="w-10 h-10 text-amber-400" />
                        <p className="text-xs font-bold">
                          Documento PDF: {selectedSop.fileName || 'Padrao_Operacional.pdf'}
                        </p>
                        <button
                          type="button"
                          onClick={() => openPdfInNewTab(selectedSop.fileUrl!, selectedSop.fileName || 'Padrao_Operacional.pdf')}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl uppercase tracking-wider flex items-center gap-2 cursor-pointer"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Abrir PDF em Nova Aba
                        </button>
                      </div>
                    </iframe>
                  </object>
                </div>
              )}
            </div>
          )}

          {/* Checklist of Operational Steps */}
          {selectedSop.steps && selectedSop.steps.length > 0 && (
            <div>
              <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider block mb-2">
                Passo a Passo Obrigatório para Realizar o Trabalho:
              </span>
              <div className="space-y-2">
                {selectedSop.steps.map((step, idx) => {
                  const isDone = Boolean(completedSteps[idx]);
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleStep(idx)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isDone 
                          ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200' 
                          : 'bg-[#18202a] border-[#222d3a] hover:border-blue-500/50 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className={`w-4 h-4 shrink-0 ${isDone ? 'text-emerald-400' : 'text-slate-600'}`} />
                        <span className={`text-xs font-semibold ${isDone ? 'line-through opacity-80' : ''}`}>
                          {step}
                        </span>
                      </div>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${
                        isDone ? 'bg-emerald-900 text-emerald-200 border border-emerald-700' : 'bg-[#222d3a] text-slate-400'
                      }`}>
                        {isDone ? 'Concluído' : 'Pendente'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* FULLSCREEN PDF MODAL */}
      {isPdfModalOpen && hasFile && safePdfUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#111a30] border border-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 bg-[#0b1222] border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-amber-400" />
                <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wide">
                  {selectedSop.fileName || 'Material Importado em PDF'}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openPdfInNewTab(selectedSop.fileUrl!, selectedSop.fileName || 'Padrao_Operacional.pdf')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Nova Aba
                </button>
                <button
                  type="button"
                  onClick={() => setIsPdfModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-950">
              <object
                data={safePdfUrl}
                type="application/pdf"
                className="w-full h-full"
              >
                <iframe
                  src={safePdfUrl}
                  title="PDF Viewer"
                  className="w-full h-full border-0"
                />
              </object>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

