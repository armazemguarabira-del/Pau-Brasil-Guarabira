import React, { useState, useRef } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw 
} from 'lucide-react';
import { 
  exportarModeloExcelTemperatura, 
  importarPlanilhaTemperatura, 
  clearTempLogs, 
  getStoredTempLogs 
} from '../utils/tempStorage';

interface TemperaturaImportExportBarProps {
  onDataChanged?: () => void;
  compact?: boolean;
}

export default function TemperaturaImportExportBar({ onDataChanged, compact = false }: TemperaturaImportExportBarProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const currentCount = getStoredTempLogs().length;

  const handleExportModel = () => {
    try {
      exportarModeloExcelTemperatura();
      setStatusMsg({ type: 'success', text: 'Modelo de planilha Excel baixado com sucesso!' });
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: 'Erro ao gerar modelo Excel.' });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setStatusMsg({ type: 'info', text: 'Processando planilha Excel e atualizando base...' });

    try {
      const res = await importarPlanilhaTemperatura(file);
      setStatusMsg({
        type: 'success',
        text: `✅ Sucesso! ${res.count} registros de temperatura foram importados. A base anterior foi sobrescrita e os indicadores foram atualizados.`
      });
      if (onDataChanged) onDataChanged();
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err?.message || 'Falha ao importar a planilha. Verifique a estrutura do arquivo.'
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleConfirmDelete = () => {
    clearTempLogs();
    setShowConfirmDelete(false);
    setStatusMsg({
      type: 'success',
      text: '🗑️ Base de temperatura deletada com sucesso! Todos os registros e indicadores foram zerados.'
    });
    if (onDataChanged) onDataChanged();
    setTimeout(() => setStatusMsg(null), 5000);
  };

  return (
    <div className={`bg-[#0d121c] border border-amber-500/30 rounded-xl ${compact ? 'p-3' : 'p-4'} space-y-3`}>
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx, .xls, .csv"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Left Info */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider">
                Gerenciamento Retroativo de Temperatura
              </h4>
              <span className="text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-mono">
                {currentCount} Registros
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Importe relatórios em Excel para substituir medições retroativas do início do ano até hoje ou zere a base.
            </p>
          </div>
        </div>

        {/* Right Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Export Model */}
          <button
            type="button"
            onClick={handleExportModel}
            className="px-3.5 py-2 rounded-lg bg-[#151b26] hover:bg-[#1f293a] text-slate-200 border border-[#2a3649] text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-xs hover:text-white"
            title="Baixar modelo de planilha Excel com colunas Data, Hora, Temperatura, Colaborador e Observação"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            Exportar Modelo Excel
          </button>

          {/* Import File */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            title="Importar arquivo Excel para sobrescrever e atualizar todas as medições"
          >
            {isImporting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            Importar Base Excel (Sobrescrever)
          </button>

          {/* Delete Base */}
          <button
            type="button"
            onClick={() => setShowConfirmDelete(true)}
            className="px-3.5 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            title="Excluir completamente todos os registros de temperatura armazenados"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Excluir Base Atual
          </button>
        </div>
      </div>

      {/* Feedback Alert */}
      {statusMsg && (
        <div className={`p-3 rounded-lg text-xs font-bold flex items-center gap-2 border ${
          statusMsg.type === 'success' 
            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
            : statusMsg.type === 'error'
            ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
            : 'bg-sky-500/10 text-sky-300 border-sky-500/30'
        }`}>
          {statusMsg.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          {statusMsg.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
          {statusMsg.type === 'info' && <RefreshCw className="w-4 h-4 text-sky-400 animate-spin shrink-0" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#111622] border border-rose-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black uppercase text-white tracking-wide">
                Excluir Base de Temperatura?
              </h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Você está prestes a <strong className="text-rose-400 underline">DELETAR TODOS OS REGISTROS</strong> de temperatura do armazém ({currentCount} aferições). Esta ação é irreversível e resetará os gráficos e indicadores retroativos.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmDelete(false)}
                className="px-4 py-2 rounded-xl bg-[#1c2433] hover:bg-[#283348] text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md"
              >
                Sim, Deletar Toda a Base
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
