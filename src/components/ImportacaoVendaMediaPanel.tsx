import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  TrendingUp, 
  FileText, 
  CheckCircle2, 
  Trash2, 
  RefreshCw, 
  Search, 
  Download, 
  History, 
  Edit2, 
  Check,
  Calendar,
  AlertCircle,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { VendaMediaItem, ImportVendaMediaLog } from '../types/estoque';
import { 
  getVendaMediaItens, 
  saveVendaMediaItens, 
  getVendaMediaLogs, 
  saveVendaMediaLogs 
} from '../utils/estoqueStorage';
import { PRODUCTS } from '../planosData';
import { Usuario } from '../types';

interface ImportacaoVendaMediaPanelProps {
  user: Usuario;
  onDataUpdated?: () => void;
}

export default function ImportacaoVendaMediaPanel({ user, onDataUpdated }: ImportacaoVendaMediaPanelProps) {
  const [vendaMediaItens, setVendaMediaItens] = useState<VendaMediaItem[]>([]);
  const [logs, setLogs] = useState<ImportVendaMediaLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'importar' | 'historico'>('importar');
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Requirement 25: Business days in month setting
  const [diasUteisMes, setDiasUteisMes] = useState<number>(22);

  // Inline Editing
  const [editingCode, setEditingCode] = useState<number | null>(null);
  const [editingVal, setEditingVal] = useState<string>('');

  const [lastStatus, setLastStatus] = useState<{
    totalLinhas: number;
    produtosUnicos: number;
    aceitos: number;
    rejeitados: number;
    diasUteis: number;
    erros: string[];
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setVendaMediaItens(getVendaMediaItens());
    setLogs(getVendaMediaLogs());
    if (onDataUpdated) onDataUpdated();
  };

  // Requirement 25: Automatic Import Routine with exact Column G and Column AC mapping
  const processVendaMediaFile = (text: string, fileName: string) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) {
      alert('O arquivo enviado está vazio.');
      return;
    }

    const currentCatalogMap = new Map<number, typeof PRODUCTS[0]>();
    PRODUCTS.forEach(p => currentCatalogMap.set(p.codigo, p));

    const currentVmMap = new Map<number, VendaMediaItem>();
    getVendaMediaItens().forEach(item => currentVmMap.set(item.codigo, item));

    // Map to aggregate total sold per product code (Pivot table logic)
    const totalVendidoMap = new Map<number, number>();
    const rawLinesCount = lines.length;

    let aceitosCount = 0;
    let rejeitadosCount = 0;
    const errorDetails: string[] = [];

    // Parse each line
    lines.forEach((line, idx) => {
      // Split by semicolon ';' or tab
      const parts = line.split(';').map(p => p.trim());

      let codeRaw = '';
      let qtyRaw = '';

      // Check if line conforms to official operation format (Column G = index 6, Column AC = index 28)
      if (parts.length >= 29) {
        codeRaw = parts[6];  // Coluna G = Código do Produto
        qtyRaw = parts[28]; // Coluna AC = Quantidade Vendida
      } else if (parts.length >= 7) {
        // Fallback for smaller export files where Col G is present
        codeRaw = parts[6];
        qtyRaw = parts[parts.length - 1];
      } else {
        // Simple 2 or 3 column fallback CSV (Codigo; Venda/Qtd)
        codeRaw = parts[0];
        qtyRaw = parts[1] || '0';
      }

      // Ignore header line if code is non-numeric string
      if (idx === 0 && (codeRaw.toLowerCase().includes('produto') || codeRaw.toLowerCase().includes('código') || codeRaw.toLowerCase().includes('unb'))) {
        return;
      }

      // Clean product code (remove leading zeros or letters if any)
      const cleanCodeStr = codeRaw.replace(/\D/g, '');
      const codeNum = parseInt(cleanCodeStr, 10);

      if (isNaN(codeNum) || codeNum <= 0) {
        rejeitadosCount++;
        if (errorDetails.length < 10) {
          errorDetails.push(`Linha ${idx + 1}: Código do produto inválido ("${codeRaw}").`);
        }
        return;
      }

      // Requirement 25 Rule 2 & 3: Check if product is registered in the platform catalog
      const catalogItem = currentCatalogMap.get(codeNum);
      const existingVm = currentVmMap.get(codeNum);

      if (!catalogItem && !existingVm) {
        // Ignore automatically items that are not finished products or not registered
        rejeitadosCount++;
        if (errorDetails.length < 10) {
          errorDetails.push(`Linha ${idx + 1}: SKU ${codeNum} ignorado (Não cadastrado na plataforma).`);
        }
        return;
      }

      // Clean quantity sold (convert "11340,00" or "2892;05" to numeric float)
      let cleanQtyStr = qtyRaw.replace(/\s+/g, '').replace(',', '.');
      // If contains additional semicolons like "2892;05", take the integer/first part
      if (cleanQtyStr.includes(';')) {
        cleanQtyStr = cleanQtyStr.split(';')[0];
      }
      
      let qtyNum = parseFloat(cleanQtyStr);
      if (isNaN(qtyNum)) qtyNum = 0;

      // Accumulate total sold (Pivot Table aggregation)
      const prevTotal = totalVendidoMap.get(codeNum) || 0;
      totalVendidoMap.set(codeNum, prevTotal + qtyNum);
      aceitosCount++;
    });

    if (totalVendidoMap.size === 0) {
      alert(`Nenhum produto cadastrado foi encontrado no arquivo. Total de linhas rejeitadas: ${rejeitadosCount}`);
      return;
    }

    const nowISO = new Date().toISOString();
    const updatedVmList: VendaMediaItem[] = [];

    // Calculate Daily Average Sales for each aggregated product
    totalVendidoMap.forEach((totalVendido, codeNum) => {
      const catalogItem = currentCatalogMap.get(codeNum);
      const existingItem = currentVmMap.get(codeNum);

      // Formula: Venda Média Diária = Total Vendido ÷ Quantidade de Dias Úteis do Mês
      const vendaMediaDiaria = Math.max(0, Math.round((totalVendido / diasUteisMes) * 10) / 10);

      const prodName = catalogItem?.descricao || existingItem?.produto || `Produto ${codeNum}`;
      const familia = existingItem?.familia || 'Bebidas';
      const marca = existingItem?.marca || 'AMBEV';
      const setor = existingItem?.setor || 'Armazém Central';
      const unitPrice = existingItem?.precoUnitario || 50.0;

      updatedVmList.push({
        codigo: codeNum,
        produto: prodName,
        vendaMediaDiaria,
        precoUnitario: unitPrice,
        familia,
        marca,
        setor,
        atualizadoEm: nowISO
      });
    });

    // Merge with remaining catalog products that had no sales in this file
    currentVmMap.forEach((vmItem, codeNum) => {
      if (!totalVendidoMap.has(codeNum)) {
        updatedVmList.push(vmItem);
      }
    });

    // Save updated items
    saveVendaMediaItens(updatedVmList);

    // Save import log for audit
    const now = new Date();
    const dStr = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', { hour12: false });
    const logId = `vm-log-${Date.now()}`;

    const newLog: ImportVendaMediaLog = {
      id: logId,
      dataHora: dStr,
      nomeArquivo: fileName,
      totalLinhas: rawLinesCount,
      aceitos: aceitosCount,
      rejeitados: rejeitadosCount,
      usuario: user.nome || user.email || 'Analista AMBEV',
      erros: errorDetails
    };

    const existingLogs = getVendaMediaLogs();
    saveVendaMediaLogs([newLog, ...existingLogs]);

    setLastStatus({
      totalLinhas: rawLinesCount,
      produtosUnicos: totalVendidoMap.size,
      aceitos: aceitosCount,
      rejeitados: rejeitadosCount,
      diasUteis: diasUteisMes,
      erros: errorDetails
    });

    loadData();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      processVendaMediaFile(text, file.name);
    };
    reader.readAsText(file, 'ISO-8859-1'); // Read with standard Latin/ISO encoding for AMBEV CSVs
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      processVendaMediaFile(text, file.name);
    };
    reader.readAsText(file, 'ISO-8859-1');
  };

  const handleSaveInlineEdit = (code: number) => {
    const val = parseFloat(editingVal.replace(',', '.'));
    if (isNaN(val) || val < 0) {
      alert('Por favor, informe um valor válido.');
      return;
    }

    const updated = vendaMediaItens.map(item => {
      if (item.codigo === code) {
        return { ...item, vendaMediaDiaria: val, atualizadoEm: new Date().toISOString() };
      }
      return item;
    });

    saveVendaMediaItens(updated);
    setEditingCode(null);
    loadData();
  };

  const filteredItems = vendaMediaItens.filter(item => 
    item.produto.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.codigo.toString().includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#032b5e] via-[#0a4386] to-[#1e56f0] rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-teal-300 bg-teal-400/10 px-3 py-1 rounded-full border border-teal-400/20 flex items-center gap-1.5 w-max">
            <Sparkles className="w-3.5 h-3.5 text-teal-300" />
            Módulo 25 - Processamento da Venda Média Diária
          </span>
          <h2 className="text-2xl font-black tracking-tight mt-2 flex items-center gap-2">
            Importação e Consolidação de Venda Média
          </h2>
          <p className="text-xs text-blue-100/90 font-medium mt-1 max-w-3xl">
            Mapeamento obrigatório da operação: <strong>Coluna G = Código do Produto</strong> e <strong>Coluna AC = Quantidade Vendida</strong>. Consolidação automática via Tabela Dinâmica e cálculo de Venda Média Diária por Dias Úteis.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white/10 p-3 rounded-xl border border-white/20 text-center">
            <span className="text-[10px] uppercase font-extrabold text-blue-200 block">Dias Úteis do Mês</span>
            <select
              value={diasUteisMes}
              onChange={(e) => setDiasUteisMes(parseInt(e.target.value, 10))}
              className="bg-slate-900 text-white font-black text-sm px-2 py-1 rounded-lg border border-teal-400 focus:outline-none cursor-pointer mt-1"
            >
              <option value={20}>20 Dias Úteis</option>
              <option value={21}>21 Dias Úteis</option>
              <option value={22}>22 Dias Úteis (Padrão)</option>
              <option value={23}>23 Dias Úteis</option>
              <option value={24}>24 Dias Úteis</option>
              <option value={26}>26 Dias Úteis (Incluso Sábados)</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABS SELECTOR */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('importar')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'importar' 
              ? 'bg-[#032b5e] text-white shadow-xs' 
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Upload className="w-4 h-4 text-teal-400" />
          Carga de Arquivo & Gestão
        </button>

        <button
          onClick={() => setActiveTab('historico')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'historico' 
              ? 'bg-[#032b5e] text-white shadow-xs' 
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <History className="w-4 h-4 text-amber-400" />
          Histórico de Versões & Auditoria ({logs.length})
        </button>
      </div>

      {activeTab === 'importar' ? (
        <div className="space-y-6">
          {/* DRAG & DROP IMPORT AREA */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
              isDragOver ? 'border-teal-500 bg-teal-50/50 scale-[1.005]' : 'border-slate-300 bg-white hover:border-teal-400'
            }`}
          >
            <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-teal-100 shadow-xs">
              <Upload className="w-6 h-6" />
            </div>

            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
              Arraste o arquivo oficial da Operação (CSV / TXT)
            </h3>
            <p className="text-xs text-slate-500 max-w-xl mx-auto mt-1 font-medium">
              O motor processará a <strong>Coluna G (Código)</strong> e <strong>Coluna AC (Venda)</strong>, somando as movimentações dos produtos acabados e dividindo pelos <strong>{diasUteisMes} dias úteis</strong> configurados.
            </p>

            <div className="mt-4 flex items-center justify-center gap-3">
              <label className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-md transition-all flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span>Selecionar Arquivo CSV</span>
                <input type="file" accept=".csv,.txt" onChange={handleFileChange} className="hidden" />
              </label>
            </div>
          </div>

          {/* STATUS OF LAST IMPORT */}
          {lastStatus && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1 w-max">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Importação Processada com Sucesso
                </span>
                <p className="text-xs font-bold mt-1 text-emerald-900">
                  {lastStatus.produtosUnicos} SKUs consolidados a partir de {lastStatus.totalLinhas} linhas do arquivo ({lastStatus.diasUteis} dias úteis).
                </p>
                {lastStatus.rejeitados > 0 && (
                  <p className="text-[11px] text-amber-800 font-semibold mt-0.5">
                    ⚠️ {lastStatus.rejeitados} linhas ignoradas (itens não cadastrados ou cabeçalho).
                  </p>
                )}
              </div>

              <button
                onClick={() => setLastStatus(null)}
                className="text-xs font-bold text-emerald-800 hover:underline cursor-pointer"
              >
                Fechar Alerta
              </button>
            </div>
          )}

          {/* VENDA MÉRIDA TABLE & EDITING */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                  Venda Média Diária Consolidada ({filteredItems.length} SKUs)
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  Valores utilizados como parâmetro para cálculo do Estoque Ideal (6 Dias).
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar código ou produto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Código</th>
                    <th className="py-3 px-4">Produto</th>
                    <th className="py-3 px-4">Família</th>
                    <th className="py-3 px-4">Marca</th>
                    <th className="py-3 px-4 text-right">Venda Média Diária (cx/dia)</th>
                    <th className="py-3 px-4 text-right">Estoque Ideal (6 Dias)</th>
                    <th className="py-3 px-4 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 font-semibold">
                        Nenhum registro de venda média encontrado.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => {
                      const isEditing = editingCode === item.codigo;
                      const idealStock = Math.round(item.vendaMediaDiaria * 6);

                      return (
                        <tr key={item.codigo} className="hover:bg-slate-50 transition-all">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">{item.codigo}</td>
                          <td className="py-3 px-4 font-bold text-slate-800">{item.produto}</td>
                          <td className="py-3 px-4 text-slate-500">{item.familia}</td>
                          <td className="py-3 px-4 text-slate-500">{item.marca}</td>
                          <td className="py-3 px-4 text-right font-mono font-black text-slate-900 text-sm">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editingVal}
                                onChange={(e) => setEditingVal(e.target.value)}
                                className="w-24 p-1 bg-white border border-teal-500 rounded-lg text-right font-mono text-xs focus:outline-none"
                                autoFocus
                              />
                            ) : (
                              `${item.vendaMediaDiaria.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} cx`
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-black text-teal-700">
                            {idealStock.toLocaleString('pt-BR')} cx
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isEditing ? (
                              <button
                                onClick={() => handleSaveInlineEdit(item.codigo)}
                                className="p-1 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-all cursor-pointer"
                                title="Salvar"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingCode(item.codigo);
                                  setEditingVal(item.vendaMediaDiaria.toString());
                                }}
                                className="p-1 text-slate-400 hover:text-teal-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                                title="Editar manualmente"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* HISTÓRICO DE VERSÕES & AUDITORIA */
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div>
            <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
              <History className="w-4 h-4 text-amber-500" />
              Histórico de Cargas de Venda Média (Auditoria)
            </h3>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Registro completo de todas as importações realizadas no sistema.
            </p>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Data / Hora</th>
                  <th className="py-3 px-4">Nome do Arquivo</th>
                  <th className="py-3 px-4 text-right">Total Linhas</th>
                  <th className="py-3 px-4 text-right">Aceitos</th>
                  <th className="py-3 px-4 text-right">Rejeitados</th>
                  <th className="py-3 px-4">Usuário</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-semibold">
                      Nenhum histórico de importação registrado.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-all">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">{log.dataHora}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{log.nomeArquivo}</td>
                      <td className="py-3 px-4 text-right font-mono">{log.totalLinhas}</td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-600 font-bold">{log.aceitos}</td>
                      <td className="py-3 px-4 text-right font-mono text-rose-600 font-bold">{log.rejeitados}</td>
                      <td className="py-3 px-4 text-slate-600">{log.usuario}</td>
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
