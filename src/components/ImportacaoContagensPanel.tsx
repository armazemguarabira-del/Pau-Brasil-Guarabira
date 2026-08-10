import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  RefreshCw, 
  Filter, 
  List, 
  Database, 
  Search, 
  Download, 
  Layers, 
  AlertTriangle,
  History,
  FileCheck
} from 'lucide-react';
import { ContagemRecord, ImportLog, AreaContagem } from '../types/estoque';
import { 
  getContagens, 
  saveContagens, 
  getContagensLogs, 
  saveContagensLogs 
} from '../utils/estoqueStorage';
import { PRODUCTS } from '../planosData';
import { Usuario } from '../types';

interface ImportacaoContagensPanelProps {
  user: Usuario;
  onDataUpdated?: () => void;
}

export default function ImportacaoContagensPanel({ user, onDataUpdated }: ImportacaoContagensPanelProps) {
  const [contagens, setContagens] = useState<ContagemRecord[]>([]);
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [selectedFilterArea, setSelectedFilterArea] = useState<AreaContagem>('todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'importar' | 'registros' | 'historico'>('importar');

  // Drag over state for each area
  const [isDragOverCentral, setIsDragOverCentral] = useState(false);
  const [isDragOverPicking, setIsDragOverPicking] = useState(false);
  const [isDragOverMP, setIsDragOverMP] = useState(false);

  // Status notification banner after import
  const [lastImportStatus, setLastImportStatus] = useState<{
    areaName: string;
    total: number;
    aceitos: number;
    rejeitados: number;
    erros: string[];
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setContagens(getContagens());
    setLogs(getContagensLogs());
    if (onDataUpdated) onDataUpdated();
  };

  // CSV / Text File parser helper
  const processImportFile = (text: string, area: 'central' | 'picking' | 'marketplace', fileName: string) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) {
      alert('O arquivo enviado está vazio.');
      return;
    }

    let aceitosCount = 0;
    let rejeitadosCount = 0;
    const errorDetails: string[] = [];
    const newRecords: ContagemRecord[] = [];
    const importId = `imp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const importTime = new Date().toISOString();

    // Check header line if present
    const firstLine = lines[0].toLowerCase();
    const hasHeader = firstLine.includes('codigo') || firstLine.includes('código') || firstLine.includes('produto') || firstLine.includes('quantidade') || firstLine.includes('qtd');
    const dataLines = hasHeader ? lines.slice(1) : lines;

    dataLines.forEach((line, idx) => {
      const lineNum = hasHeader ? idx + 2 : idx + 1;
      const parts = line.split(/[;,|\t]/).map(p => p.trim());
      if (parts.length < 2) {
        rejeitadosCount++;
        errorDetails.push(`Linha ${lineNum}: Formato inválido ou colunas insuficientes.`);
        return;
      }

      const rawCode = parts[0].replace(/\D/g, '');
      const code = parseInt(rawCode, 10);
      let qty = 0;
      let rawProdName = parts[1] || '';

      // Check if 2nd column is quantity or product name
      if (!isNaN(parseFloat(parts[1])) && parts.length > 2) {
        qty = parseFloat(parts[1]);
        rawProdName = parts[2];
      } else if (parts.length >= 3 && !isNaN(parseFloat(parts[2]))) {
        qty = parseFloat(parts[2]);
      } else {
        qty = parseFloat(parts[1]) || 0;
      }

      if (isNaN(code) || code <= 0) {
        rejeitadosCount++;
        errorDetails.push(`Linha ${lineNum}: Código de produto inválido ("${parts[0]}").`);
        return;
      }

      if (isNaN(qty) || qty < 0) {
        rejeitadosCount++;
        errorDetails.push(`Linha ${lineNum}: Quantidade inválida ("${parts[1]}").`);
        return;
      }

      // Validate against product catalog if possible
      const matchedCatalog = PRODUCTS.find(p => p.codigo === code);
      const productName = matchedCatalog ? matchedCatalog.descricao : (rawProdName || `SKU ${code}`);

      aceitosCount++;
      newRecords.push({
        id: `cnt-${importId}-${idx}`,
        codigo: code,
        produto: productName,
        quantidade: qty,
        area,
        importadoEm: importTime,
        importId
      });
    });

    if (aceitosCount === 0) {
      alert(`Erro na importação: Nenhum registro válido encontrado. Rejeitados: ${rejeitadosCount}`);
      return;
    }

    // Save records & logs
    const existing = getContagens();
    const updatedRecords = [...existing, ...newRecords];
    saveContagens(updatedRecords);

    const now = new Date();
    const dStr = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', { hour12: false });
    const areaLabels = { central: 'Central', picking: 'Picking', marketplace: 'Marketplace' };

    const newLog: ImportLog = {
      id: importId,
      dataHora: dStr,
      area,
      nomeArquivo: fileName,
      totalLinhas: dataLines.length,
      aceitos: aceitosCount,
      rejeitados: rejeitadosCount,
      usuario: user.nome || user.email || 'Usuário',
      erros: errorDetails
    };

    const existingLogs = getContagensLogs();
    const updatedLogs = [newLog, ...existingLogs];
    saveContagensLogs(updatedLogs);

    setLastImportStatus({
      areaName: areaLabels[area],
      total: dataLines.length,
      aceitos: aceitosCount,
      rejeitados: rejeitadosCount,
      erros: errorDetails
    });

    loadData();
  };

  const handleFileDrop = (e: React.DragEvent, area: 'central' | 'picking' | 'marketplace') => {
    e.preventDefault();
    if (area === 'central') setIsDragOverCentral(false);
    if (area === 'picking') setIsDragOverPicking(false);
    if (area === 'marketplace') setIsDragOverMP(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        processImportFile(text, area, file.name);
      };
      reader.readAsText(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>, area: 'central' | 'picking' | 'marketplace') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        processImportFile(text, area, file.name);
      };
      reader.readAsText(file);
    }
  };

  const handleExcluirImportacao = (importId: string) => {
    if (!window.confirm('Deseja realmente excluir esta importação? Os registros de contagem associados a este lote serão removidos do sistema.')) {
      return;
    }

    const currentRecords = getContagens();
    const filteredRecords = currentRecords.filter(r => r.importId !== importId);
    saveContagens(filteredRecords);

    const currentLogs = getContagensLogs();
    const filteredLogs = currentLogs.filter(l => l.id !== importId);
    saveContagensLogs(filteredLogs);

    loadData();
    if (onDataUpdated) onDataUpdated();
  };

  const handleDeleteSingleContagem = (id: string) => {
    if (!window.confirm('Deseja realmente excluir este registro de contagem?')) return;
    const currentRecords = getContagens();
    const filtered = currentRecords.filter(r => r.id !== id);
    saveContagens(filtered);
    setContagens(filtered);
    if (onDataUpdated) onDataUpdated();
  };

  const handleClearAllContagens = () => {
    if (!window.confirm('ATENÇÃO: Deseja realmente ZERAR / EXCLUIR TODOS OS REGISTROS DE CONTAGEM DE ESTOQUE? Esta ação irá apagar os registros das 3 áreas e é irreversível.')) return;
    saveContagens([]);
    saveContagensLogs([]);
    setContagens([]);
    setLogs([]);
    if (onDataUpdated) onDataUpdated();
  };

  const downloadSampleTemplate = (areaName: string) => {
    const sampleCsv = `codigo;quantidade;produto\n347;150;SUKITA PET 1L CAIXA C/12\n982;240;SKOL 600ML\n988;320;BRAHMA CHOPP 600ML\n504;180;PEPSI COLA PET 2L CAIXA C/6\n838;50;CHOPP BRAHMA CLARO BARRIL KEG 50L`;
    const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `modelo_importacao_contagem_${areaName.toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered dataset
  const filteredContagens = contagens.filter(item => {
    const matchesArea = selectedFilterArea === 'todas' || item.area === selectedFilterArea;
    const matchesSearch = searchTerm.trim() === '' || 
      item.produto.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.codigo.toString().includes(searchTerm);
    return matchesArea && matchesSearch;
  });

  const totalCentral = contagens.filter(c => c.area === 'central').reduce((a, b) => a + b.quantidade, 0);
  const totalPicking = contagens.filter(c => c.area === 'picking').reduce((a, b) => a + b.quantidade, 0);
  const totalMP = contagens.filter(c => c.area === 'marketplace').reduce((a, b) => a + b.quantidade, 0);

  return (
    <div className="space-y-6">
      {/* ── HEADER TITLE ── */}
      <div className="bg-gradient-to-r from-[#032b5e] to-[#0a4386] rounded-2xl p-6 text-white shadow-lg border border-blue-900/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20">
            📂 Módulo 13 - Controle de Estoque
          </span>
          <h2 className="text-2xl font-black tracking-tight mt-2 flex items-center gap-2">
            Importação de Contagens de Estoque
          </h2>
          <p className="text-xs text-blue-100/80 font-medium mt-1 max-w-2xl">
            Ambiente exclusivo para carga de inventários físicos. Cada área (Central, Picking e Marketplace) é mantida de forma totalmente independente com rastreabilidade completa.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-xl backdrop-blur-md border border-white/10 text-xs">
          <button
            onClick={() => setActiveTab('importar')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'importar' ? 'bg-amber-400 text-slate-950 shadow-sm' : 'text-white hover:bg-white/10'
            }`}
          >
            📥 Importar Arquivos
          </button>
          <button
            onClick={() => setActiveTab('registros')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'registros' ? 'bg-amber-400 text-slate-950 shadow-sm' : 'text-white hover:bg-white/10'
            }`}
          >
            📋 Registros ({contagens.length})
          </button>
          <button
            onClick={() => setActiveTab('historico')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'historico' ? 'bg-amber-400 text-slate-950 shadow-sm' : 'text-white hover:bg-white/10'
            }`}
          >
            📜 Historico ({logs.length})
          </button>
        </div>
      </div>

      {/* STATUS NOTIFICATION BANNER */}
      {lastImportStatus && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-950 flex items-start justify-between gap-4 shadow-sm animate-fade-in">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-extrabold text-sm uppercase tracking-wider text-emerald-900">
                Importação Concluída com Sucesso - {lastImportStatus.areaName}
              </h4>
              <p className="text-xs text-emerald-800 mt-0.5 font-semibold">
                Processadas {lastImportStatus.total} linhas | <strong>{lastImportStatus.aceitos} registros importados</strong> | {lastImportStatus.rejeitados} rejeitados.
              </p>
              {lastImportStatus.erros.length > 0 && (
                <div className="mt-2 text-[11px] bg-white/80 p-2 rounded border border-emerald-200 text-rose-700 max-h-24 overflow-y-auto">
                  <span className="font-bold block mb-1">Alertas de Rejeição:</span>
                  {lastImportStatus.erros.map((err, i) => (
                    <div key={i}>• {err}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button 
            onClick={() => setLastImportStatus(null)}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            Fechar ✖
          </button>
        </div>
      )}

      {/* ── SUMMARY STATS CARDS ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Total Geral em Estoque</span>
          <span className="text-2xl font-black text-[#032b5e] font-mono mt-1 block">
            {(totalCentral + totalPicking + totalMP).toLocaleString('pt-BR')} <span className="text-xs font-semibold text-slate-500">cx/unid</span>
          </span>
          <span className="text-[10px] text-slate-400 font-semibold block mt-1">Consolidado 3 Áreas</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs border-l-4 border-l-sky-500">
          <span className="text-[10px] font-black uppercase tracking-wider text-sky-700 block">Contagem Central</span>
          <span className="text-2xl font-black text-sky-900 font-mono mt-1 block">
            {totalCentral.toLocaleString('pt-BR')} <span className="text-xs font-semibold text-slate-500">cx</span>
          </span>
          <span className="text-[10px] text-slate-400 font-semibold block mt-1">Armazém Central</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs border-l-4 border-l-amber-500">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 block">Contagem Picking</span>
          <span className="text-2xl font-black text-amber-900 font-mono mt-1 block">
            {totalPicking.toLocaleString('pt-BR')} <span className="text-xs font-semibold text-slate-500">cx</span>
          </span>
          <span className="text-[10px] text-slate-400 font-semibold block mt-1">Área de Separação</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs border-l-4 border-l-purple-500">
          <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 block">Contagem Marketplace</span>
          <span className="text-2xl font-black text-purple-900 font-mono mt-1 block">
            {totalMP.toLocaleString('pt-BR')} <span className="text-xs font-semibold text-slate-500">cx</span>
          </span>
          <span className="text-[10px] text-slate-400 font-semibold block mt-1">Plataforma Marketplace</span>
        </div>
      </div>

      {/* ── TAB CONTENT ── */}
      {activeTab === 'importar' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Upload className="w-4 h-4 text-[#1e56f0]" />
              Áreas de Carga de Inventário (Drag & Drop)
            </h3>
            <span className="text-xs text-slate-500">
              Formatos suportados: <strong>CSV, TXT, TSV</strong> (Semicólon ; ou Vírgula ,)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1. DROPZONE CENTRAL */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:border-sky-400 transition-all">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="bg-sky-100 text-sky-800 text-[10px] font-black uppercase px-2.5 py-1 rounded-md tracking-wider flex items-center gap-1">
                    📂 Central
                  </span>
                  <button 
                    onClick={() => downloadSampleTemplate('Central')}
                    className="text-[10px] text-sky-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3 h-3" /> Exemplo CSV
                  </button>
                </div>
                <h4 className="font-extrabold text-slate-900 text-sm">Contagem Central</h4>
                <p className="text-xs text-slate-500 mt-1">Carregue o inventário físico do Armazém Central.</p>
              </div>

              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOverCentral(true); }}
                onDragLeave={() => setIsDragOverCentral(false)}
                onDrop={(e) => handleFileDrop(e, 'central')}
                className={`mt-4 border-2 border-dashed rounded-xl p-6 text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
                  isDragOverCentral 
                    ? 'border-sky-500 bg-sky-50/80 scale-[1.01]' 
                    : 'border-slate-300 hover:border-sky-400 bg-slate-50/50 hover:bg-sky-50/30'
                }`}
              >
                <input 
                  type="file" 
                  accept=".csv,.txt,.tsv" 
                  onChange={(e) => handleFileInput(e, 'central')} 
                  className="hidden" 
                  id="file-input-central" 
                />
                <label htmlFor="file-input-central" className="cursor-pointer w-full flex flex-col items-center">
                  <div className="w-12 h-12 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center mb-2 shadow-xs">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-extrabold text-slate-800 block">
                    Arraste o arquivo da Contagem Central
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium mt-0.5 block">
                    ou clique para selecionar
                  </span>
                </label>
              </div>
            </div>

            {/* 2. DROPZONE PICKING */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:border-amber-400 transition-all">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-black uppercase px-2.5 py-1 rounded-md tracking-wider flex items-center gap-1">
                    📂 Picking
                  </span>
                  <button 
                    onClick={() => downloadSampleTemplate('Picking')}
                    className="text-[10px] text-amber-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3 h-3" /> Exemplo CSV
                  </button>
                </div>
                <h4 className="font-extrabold text-slate-900 text-sm">Contagem Picking</h4>
                <p className="text-xs text-slate-500 mt-1">Carregue a contagem de estoques em baias de picking.</p>
              </div>

              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOverPicking(true); }}
                onDragLeave={() => setIsDragOverPicking(false)}
                onDrop={(e) => handleFileDrop(e, 'picking')}
                className={`mt-4 border-2 border-dashed rounded-xl p-6 text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
                  isDragOverPicking 
                    ? 'border-amber-500 bg-amber-50/80 scale-[1.01]' 
                    : 'border-slate-300 hover:border-amber-400 bg-slate-50/50 hover:bg-amber-50/30'
                }`}
              >
                <input 
                  type="file" 
                  accept=".csv,.txt,.tsv" 
                  onChange={(e) => handleFileInput(e, 'picking')} 
                  className="hidden" 
                  id="file-input-picking" 
                />
                <label htmlFor="file-input-picking" className="cursor-pointer w-full flex flex-col items-center">
                  <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-2 shadow-xs">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-extrabold text-slate-800 block">
                    Arraste o arquivo da Contagem Picking
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium mt-0.5 block">
                    ou clique para selecionar
                  </span>
                </label>
              </div>
            </div>

            {/* 3. DROPZONE MARKETPLACE */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:border-purple-400 transition-all">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="bg-purple-100 text-purple-800 text-[10px] font-black uppercase px-2.5 py-1 rounded-md tracking-wider flex items-center gap-1">
                    📂 Marketplace
                  </span>
                  <button 
                    onClick={() => downloadSampleTemplate('Marketplace')}
                    className="text-[10px] text-purple-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3 h-3" /> Exemplo CSV
                  </button>
                </div>
                <h4 className="font-extrabold text-slate-900 text-sm">Contagem Marketplace</h4>
                <p className="text-xs text-slate-500 mt-1">Carregue o saldo estipulado no setor Marketplace.</p>
              </div>

              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOverMP(true); }}
                onDragLeave={() => setIsDragOverMP(false)}
                onDrop={(e) => handleFileDrop(e, 'marketplace')}
                className={`mt-4 border-2 border-dashed rounded-xl p-6 text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
                  isDragOverMP 
                    ? 'border-purple-500 bg-purple-50/80 scale-[1.01]' 
                    : 'border-slate-300 hover:border-purple-400 bg-slate-50/50 hover:bg-purple-50/30'
                }`}
              >
                <input 
                  type="file" 
                  accept=".csv,.txt,.tsv" 
                  onChange={(e) => handleFileInput(e, 'marketplace')} 
                  className="hidden" 
                  id="file-input-mp" 
                />
                <label htmlFor="file-input-mp" className="cursor-pointer w-full flex flex-col items-center">
                  <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-2 shadow-xs">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-extrabold text-slate-800 block">
                    Arraste o arquivo da Contagem Marketplace
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium mt-0.5 block">
                    ou clique para selecionar
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── REGISTROS DE CONTAGEM TAB ── */}
      {(activeTab === 'registros' || activeTab === 'importar') && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                <List className="w-4 h-4 text-[#1e56f0]" />
                Registros de Contagens de Estoque
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Exibição filtrada dos itens apurados. Selecione a área desejada ou analise o total consolidado.
              </p>
            </div>

            {/* FILTROS POR ÁREA */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Área:
              </span>
              <button
                onClick={() => setSelectedFilterArea('todas')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  selectedFilterArea === 'todas'
                    ? 'bg-[#032b5e] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todas as áreas
              </button>
              <button
                onClick={() => setSelectedFilterArea('central')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  selectedFilterArea === 'central'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
                }`}
              >
                Apenas Central
              </button>
              <button
                onClick={() => setSelectedFilterArea('picking')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  selectedFilterArea === 'picking'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                }`}
              >
                Apenas Picking
              </button>
              <button
                onClick={() => setSelectedFilterArea('marketplace')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  selectedFilterArea === 'marketplace'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                }`}
              >
                Apenas Marketplace
              </button>
            </div>
            {contagens.length > 0 && (
              <button
                onClick={handleClearAllContagens}
                className="px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white border border-rose-200 transition-all cursor-pointer flex items-center gap-1.5"
                title="Zerar todos os registros de contagem de estoque"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpar Base de Contagens</span>
              </button>
            )}
          </div>

          {/* SEARCH FIELD */}
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input 
              type="text" 
              placeholder="Buscar por código ou descrição do produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#1e56f0]"
            />
          </div>

          {/* TABLE */}
          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Produto</th>
                  <th className="py-3 px-4">Área de Estoque</th>
                  <th className="py-3 px-4 text-right">Quantidade Contada</th>
                  <th className="py-3 px-4">Importado Em</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredContagens.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-semibold">
                      Nenhum registro de contagem encontrado para este filtro.
                    </td>
                  </tr>
                ) : (
                  filteredContagens.slice(0, 100).map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition-all">
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{row.codigo}</td>
                      <td className="py-2.5 px-4 font-bold text-slate-800">{row.produto}</td>
                      <td className="py-2.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          row.area === 'central' ? 'bg-sky-100 text-sky-800' :
                          row.area === 'picking' ? 'bg-amber-100 text-amber-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {row.area.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-black text-slate-900 text-sm">
                        {row.quantidade.toLocaleString('pt-BR')} <span className="text-[10px] text-slate-400 font-normal">cx</span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-400 text-[11px]">
                        {new Date(row.importadoEm).toLocaleDateString('pt-BR')} {new Date(row.importadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <button
                          onClick={() => handleDeleteSingleContagem(row.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer inline-flex items-center justify-center"
                          title="Excluir este registro de contagem"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {filteredContagens.length > 100 && (
            <div className="text-center text-xs text-slate-400 font-bold py-1">
              Exibindo 100 de {filteredContagens.length} registros. Utilize a busca para refinar.
            </div>
          )}
        </div>
      )}

      {/* ── HISTORICO DE IMPORTACOES TAB ── */}
      {activeTab === 'historico' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-[#1e56f0]" />
                Histórico de Cargas e Logs de Importação
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Rastreabilidade de todas as cargas enviadas. É possível excluir qualquer lote e re-importar se necessário.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Data/Hora</th>
                  <th className="py-3 px-4">Área</th>
                  <th className="py-3 px-4">Arquivo</th>
                  <th className="py-3 px-4 text-center">Aceitos</th>
                  <th className="py-3 px-4 text-center">Rejeitados</th>
                  <th className="py-3 px-4">Usuário</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 font-semibold">
                      Nenhum histórico de importação gravado.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-all">
                      <td className="py-3 px-4 font-mono text-slate-600 font-semibold">{log.dataHora}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                          log.area === 'central' ? 'bg-sky-100 text-sky-800' :
                          log.area === 'picking' ? 'bg-amber-100 text-amber-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {log.area}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        {log.nomeArquivo}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-emerald-700">
                        {log.aceitos}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-rose-600">
                        {log.rejeitados}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-semibold">{log.usuario}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleExcluirImportacao(log.id)}
                          className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold rounded text-[11px] transition-all cursor-pointer flex items-center gap-1 ml-auto"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Excluir
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
