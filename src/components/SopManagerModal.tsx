import React, { useState } from 'react';
import { SopDocument, getSopForOperation, saveSopForOperation } from '../utils/sopUtils';
import { BookOpen, Upload, Plus, Trash2, Check, FileText, X } from 'lucide-react';

interface SopManagerModalProps {
  operation: 'repack' | 'despejo' | 'logistica' | 'fefo' | 'picking';
  operationName: string;
  isOpen: boolean;
  onClose: () => void;
  theme?: 'light' | 'dark';
}

export function SopManagerModal({ operation, operationName, isOpen, onClose, theme = 'light' }: SopManagerModalProps) {
  const [sop, setSop] = useState<SopDocument>(() => getSopForOperation(operation));
  const [newStepText, setNewStepText] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState<string | undefined>(sop.fileName);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setSop(prev => ({
        ...prev,
        fileName: file.name,
        fileType: file.type,
        fileUrl: result,
        updatedAt: new Date().toISOString()
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleAddStep = () => {
    if (!newStepText.trim()) return;
    setSop(prev => ({
      ...prev,
      steps: [...(prev.steps || []), `${(prev.steps?.length || 0) + 1}. ${newStepText.trim()}`]
    }));
    setNewStepText('');
  };

  const handleRemoveStep = (idx: number) => {
    setSop(prev => ({
      ...prev,
      steps: (prev.steps || []).filter((_, i) => i !== idx)
    }));
  };

  const handleSave = () => {
    const updated = {
      ...sop,
      updatedAt: new Date().toISOString(),
      updatedBy: 'Gestão AMBEV'
    };
    saveSopForOperation(operation, updated);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className={`w-full max-w-2xl rounded-2xl shadow-2xl border p-6 transition-all ${
        theme === 'dark' ? 'bg-[#121c38] border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
      }`}>
        <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black uppercase tracking-tight">
                Importar / Gerenciar Padrão Operacional ({operationName})
              </h2>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 font-medium">
                Este padrão (POP / SOP) será exibido automaticamente na tela dos operadores ao acessarem esta operação.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 py-4">
          <div>
            <label className="block text-[11px] font-black uppercase text-gray-500 dark:text-slate-400 mb-1">
              Título do Procedimento Operacional
            </label>
            <input
              type="text"
              value={sop.title}
              onChange={e => setSop({ ...sop, title: e.target.value })}
              className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase text-gray-500 dark:text-slate-400 mb-1">
              Descrição Geral / Objetivo
            </label>
            <textarea
              rows={2}
              value={sop.description}
              onChange={e => setSop({ ...sop, description: e.target.value })}
              className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Upload Document File (PDF or Image) */}
          <div className="p-4 rounded-xl border-2 border-dashed border-blue-300 dark:border-blue-700/60 bg-blue-50/50 dark:bg-blue-950/20 text-center">
            <Upload className="w-6 h-6 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
              Arraste ou selecione o Documento Padrão em PDF, Imagem ou Word
            </p>
            <p className="text-[10px] text-gray-500 dark:text-slate-400 mb-3">
              Formatos aceitos: PDF, PNG, JPG, DOCX (Tamanho recomendado até 10MB)
            </p>

            <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs cursor-pointer shadow-xs transition-colors">
              <FileText className="w-4 h-4" />
              <span>Selecionar Arquivo</span>
              <input type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.csv,.xlsx" onChange={handleFileUpload} className="hidden" />
            </label>

            {uploadedFileName && (
              <div className="mt-3 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 p-2 rounded-lg inline-block border border-emerald-200 dark:border-emerald-800">
                📄 Documento Anexado: {uploadedFileName}
              </div>
            )}
          </div>

          {/* Passo a Passo / Checklist */}
          <div>
            <label className="block text-[11px] font-black uppercase text-gray-500 dark:text-slate-400 mb-1">
              Instruções em Etapas (Checklist de Trabalho do Operador)
            </label>
            <div className="space-y-2 mb-3">
              {(sop.steps || []).map((step, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-medium">
                  <span className="pr-2">{step}</span>
                  <button
                    onClick={() => handleRemoveStep(idx)}
                    className="text-rose-500 hover:text-rose-700 p-1"
                    title="Remover etapa"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Adicionar nova instrução para o operador..."
                value={newStepText}
                onChange={e => setNewStepText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddStep()}
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
              />
              <button
                type="button"
                onClick={handleAddStep}
                className="px-3 py-1.5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white text-xs font-bold rounded-lg flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg font-bold text-xs text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-lg font-black text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-md transition-all"
          >
            {savedSuccess ? <Check className="w-4 h-4" /> : null}
            <span>{savedSuccess ? 'Salvo com Sucesso!' : 'Salvar e Publicar Padrão'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
