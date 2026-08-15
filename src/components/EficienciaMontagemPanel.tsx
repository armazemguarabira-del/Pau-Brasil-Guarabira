import { ManualInstrucaoCard } from './ManualInstrucaoCard';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart2, 
  Upload, 
  RefreshCw, 
  Award, 
  Clock, 
  Zap, 
  TrendingUp, 
  Download, 
  ExternalLink,
  CheckCircle,
  FileSpreadsheet,
  Users,
  Search,
  Sliders,
  ChevronRight,
  Database,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { Usuario } from '../types';

export interface MontagemRecord {
  matricula?: string;
  colaborador: string;
  cargo?: string;
  veiculos: number;
  paletesMontados: number;
  produtos: number;
  caixasMontadas: number;
  unidades: number;
  hectolitros: number;
  tempoMedioSec: number;
  tempoMedioMinPalete: number;
  eficienciaPct: number;
  eficienciaGeralPct: number;
  errosMontagem: number;
  taxaErroPct: number;
  nivelAcuracidade: number;
  comissao: string;
}

const DEFAULT_MONTAGEM_RECORDS: MontagemRecord[] = [
  { colaborador: 'CICERO MATHEU DE OLIVERIA SILVA', veiculos: 1, paletesMontados: 1, produtos: 6, caixasMontadas: 52, unidades: 0, hectolitros: 3.99, tempoMedioSec: 361, tempoMedioMinPalete: 6.0, eficienciaPct: 100.0, eficienciaGeralPct: 0.0, errosMontagem: 0, taxaErroPct: 0.0, nivelAcuracidade: 100, comissao: 'A' },
  { colaborador: 'ADMILTON HERMINIO DOS SANTOS MARCELINO', veiculos: 87, paletesMontados: 139, produtos: 1702, caixasMontadas: 15002, unidades: 675, hectolitros: 783.39, tempoMedioSec: 1224, tempoMedioMinPalete: 20.4, eficienciaPct: 68.3, eficienciaGeralPct: 33.8, errosMontagem: 17, taxaErroPct: 1.0, nivelAcuracidade: 99.0, comissao: 'C' },
  { colaborador: 'EDILSON VIEIRA DA SILVA', veiculos: 403, paletesMontados: 600, produtos: 6187, caixasMontadas: 60070, unidades: 3541, hectolitros: 3207.90, tempoMedioSec: 1237, tempoMedioMinPalete: 20.6, eficienciaPct: 60.7, eficienciaGeralPct: 18.7, errosMontagem: 53, taxaErroPct: 0.9, nivelAcuracidade: 99.1, comissao: 'C' },
  { colaborador: 'LUIS ANTONIO FREIRE MOREIRA', veiculos: 392, paletesMontados: 573, produtos: 5940, caixasMontadas: 59733, unidades: 2193, hectolitros: 3099.94, tempoMedioSec: 1340, tempoMedioMinPalete: 22.3, eficienciaPct: 57.8, eficienciaGeralPct: 15.7, errosMontagem: 37, taxaErroPct: 0.6, nivelAcuracidade: 99.4, comissao: 'C' },
  { colaborador: 'DIMAS EMANUEL MISSIAS DA SILVA', veiculos: 82, paletesMontados: 119, produtos: 1348, caixasMontadas: 11345, unidades: 373, hectolitros: 646.39, tempoMedioSec: 1315, tempoMedioMinPalete: 21.9, eficienciaPct: 54.6, eficienciaGeralPct: 13.4, errosMontagem: 12, taxaErroPct: 0.9, nivelAcuracidade: 99.1, comissao: 'C' },
  { colaborador: 'NATANAEL LUIZ DA SILVA', veiculos: 1430, paletesMontados: 2288, produtos: 22866, caixasMontadas: 227228, unidades: 14460, hectolitros: 11697.26, tempoMedioSec: 1130, tempoMedioMinPalete: 18.8, eficienciaPct: 41.6, eficienciaGeralPct: 16.3, errosMontagem: 89, taxaErroPct: 0.4, nivelAcuracidade: 99.6, comissao: 'C' },
  { colaborador: 'OZENILDO SOUSA SILVA', veiculos: 8, paletesMontados: 15, produtos: 134, caixasMontadas: 1367, unidades: 42, hectolitros: 75.93, tempoMedioSec: 1675, tempoMedioMinPalete: 27.9, eficienciaPct: 40.0, eficienciaGeralPct: 20.0, errosMontagem: 5, taxaErroPct: 3.7, nivelAcuracidade: 96.3, comissao: 'C' },
  { colaborador: 'ELDENKLEBER MAURICIO DA SILVA', veiculos: 1446, paletesMontados: 2381, produtos: 23583, caixasMontadas: 237419, unidades: 13377, hectolitros: 12319.41, tempoMedioSec: 1156, tempoMedioMinPalete: 19.3, eficienciaPct: 38.1, eficienciaGeralPct: 15.6, errosMontagem: 90, taxaErroPct: 0.4, nivelAcuracidade: 99.6, comissao: 'C' },
  { colaborador: 'DEJEAN SILVA DE OLIVEIRA', veiculos: 21, paletesMontados: 27, produtos: 432, caixasMontadas: 2573, unidades: 539, hectolitros: 142.30, tempoMedioSec: 6445, tempoMedioMinPalete: 107.4, eficienciaPct: 37.0, eficienciaGeralPct: 7.4, errosMontagem: 6, taxaErroPct: 1.4, nivelAcuracidade: 98.6, comissao: 'C' },
  { colaborador: 'ABRAÃO EVANGELISTA DOS SANTOS', veiculos: 976, paletesMontados: 1424, produtos: 13559, caixasMontadas: 138262, unidades: 8894, hectolitros: 7113.29, tempoMedioSec: 1340, tempoMedioMinPalete: 22.3, eficienciaPct: 23.6, eficienciaGeralPct: 9.5, errosMontagem: 53, taxaErroPct: 0.4, nivelAcuracidade: 99.6, comissao: 'C' },
  { colaborador: 'WANDERLEY DA SILVA GONCALO', veiculos: 515, paletesMontados: 721, produtos: 6247, caixasMontadas: 72592, unidades: 5429, hectolitros: 3695.67, tempoMedioSec: 1368, tempoMedioMinPalete: 22.8, eficienciaPct: 6.5, eficienciaGeralPct: 6.7, errosMontagem: 0, taxaErroPct: 0.0, nivelAcuracidade: 100, comissao: 'C' },
  { colaborador: 'ERIVAN FERREIRA NUNES', veiculos: 150, paletesMontados: 238, produtos: 2140, caixasMontadas: 21774, unidades: 1865, hectolitros: 1144.10, tempoMedioSec: 994, tempoMedioMinPalete: 16.5, eficienciaPct: 0.0, eficienciaGeralPct: 0.0, errosMontagem: 0, taxaErroPct: 0.0, nivelAcuracidade: 100, comissao: 'C' },
  { colaborador: 'NIXON HENRIQUE PEREIRA DE ARRUDA', veiculos: 3, paletesMontados: 5, produtos: 58, caixasMontadas: 539, unidades: 2, hectolitros: 25.37, tempoMedioSec: 1708, tempoMedioMinPalete: 28.5, eficienciaPct: 0.0, eficienciaGeralPct: 0.0, errosMontagem: 0, taxaErroPct: 0.0, nivelAcuracidade: 100, comissao: 'C' }
];

export default function EficienciaMontagemPanel({ user }: { user: Usuario }) {
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [rawText, setRawText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedComissaoFilter, setSelectedComissaoFilter] = useState('TODOS');

  const empresaId = user.empresaId || 'demo';
  const lsKey = `montagem_rows_${empresaId}`;

  const [records, setRecords] = useState<MontagemRecord[]>(() => {
    try {
      const saved = localStorage.getItem(lsKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_MONTAGEM_RECORDS;
  });

  const reloadRecords = () => {
    try {
      const saved = localStorage.getItem(lsKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRecords(parsed);
          return;
        }
      }
    } catch (e) {
      console.error(e);
    }
    setRecords(DEFAULT_MONTAGEM_RECORDS);
  };

  useEffect(() => {
    const handleUpdate = () => reloadRecords();
    window.addEventListener('montagem_data_updated', handleUpdate);
    window.addEventListener('sector_data_cleared', handleUpdate);
    return () => {
      window.removeEventListener('montagem_data_updated', handleUpdate);
      window.removeEventListener('sector_data_cleared', handleUpdate);
    };
  }, []);

  // Semicolon/Tab/Comma CSV Parsing
  const parseCSVData = (text: string): MontagemRecord[] => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) return [];

    const delimiter = lines[0].includes(';') ? ';' : (lines[0].includes('\t') ? '\t' : ',');
    const headers = lines[0].split(delimiter).map(h => h.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));

    const parsed: MontagemRecord[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(delimiter).map(c => c.trim());
      if (cols.length < 2) continue;

      const getColVal = (keys: string[]): string => {
        for (const k of keys) {
          const idx = headers.findIndex(h => h.includes(k));
          if (idx >= 0 && cols[idx] !== undefined) return cols[idx];
        }
        return '';
      };

      const parseNum = (val: string): number => {
        if (!val) return 0;
        const cleaned = val.replace('%', '').replace(',', '.').trim();
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
      };

      const operador = getColVal(['operador', 'colaborador', 'nome']) || `Operador ${i}`;
      const veiculos = parseNum(getColVal(['veiculos', 'veiculo']));
      const paletes = parseNum(getColVal(['paletes', 'palete']));
      const produtos = parseNum(getColVal(['produtos', 'produto']));
      const caixas = parseNum(getColVal(['caixas', 'caixa']));
      const unidades = parseNum(getColVal(['unidades', 'unidade']));
      const hl = parseNum(getColVal(['hectolitros', 'hl']));
      const tempoSec = parseNum(getColVal(['tempo medio (s)', 'tempomedio', 'tempo']));
      const efFase = parseNum(getColVal(['eficiencia fase %', 'eficiencia fase', 'fase']));
      const efGeral = parseNum(getColVal(['eficiencia geral %', 'eficiencia geral', 'geral']));
      const erros = parseNum(getColVal(['erros montagem', 'erros']));
      const taxaErro = parseNum(getColVal(['taxa erro %', 'taxa erro']));
      const comissao = getColVal(['comissao']) || 'C';

      const tempoMinPalete = paletes > 0 ? Math.round((tempoSec / 60) * 10) / 10 : Math.round((tempoSec / 60) * 10) / 10;
      const acuracidade = Math.max(0, Math.round((100 - taxaErro) * 10) / 10);

      parsed.push({
        colaborador: operador,
        veiculos,
        paletesMontados: paletes,
        produtos,
        caixasMontadas: caixas,
        unidades,
        hectolitros: hl,
        tempoMedioSec: tempoSec,
        tempoMedioMinPalete: tempoMinPalete,
        eficienciaPct: efFase,
        eficienciaGeralPct: efGeral,
        errosMontagem: erros,
        taxaErroPct: taxaErro,
        nivelAcuracidade: acuracidade,
        comissao
      });
    }

    return parsed;
  };

  const handleProcessImport = () => {
    if (!rawText.trim()) {
      alert('Por favor, cole o texto do relatório CSV do Fast Picking.');
      return;
    }

    setIsImporting(true);
    try {
      const parsed = parseCSVData(rawText);
      if (parsed.length === 0) {
        alert('Não foi possível identificar linhas válidas. Verifique o formato do texto (delimitador ponto-e-vírgula ";" ou tabulação).');
        setIsImporting(false);
        return;
      }

      localStorage.setItem(lsKey, JSON.stringify(parsed));
      setRecords(parsed);
      setRawText('');
      setImportStatus(`Sucesso! ${parsed.length} colaboradores importados e sincronizados.`);
      window.dispatchEvent(new Event('montagem_data_updated'));
    } catch (e: any) {
      alert('Erro ao processar dados: ' + e.message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleClearMontagemData = () => {
    if (!confirm('Deseja zerar o histórico de montagem e restaurar a base padrão?')) return;
    localStorage.removeItem(lsKey);
    setRecords(DEFAULT_MONTAGEM_RECORDS);
    setImportStatus('Dados de montagem redefinidos.');
    window.dispatchEvent(new Event('sector_data_cleared'));
  };

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        if (!r.colaborador.toLowerCase().includes(s)) return false;
      }
      if (selectedComissaoFilter !== 'TODOS') {
        if (r.comissao !== selectedComissaoFilter) return false;
      }
      return true;
    });
  }, [records, searchTerm, selectedComissaoFilter]);

  const sortedRecords = useMemo(() => {
    return [...filteredRecords].sort((a, b) => b.eficienciaPct - a.eficienciaPct);
  }, [filteredRecords]);

  const melhorColaborador = sortedRecords[0];

  const totalCaixas = records.reduce((acc, r) => acc + r.caixasMontadas, 0);
  const totalPaletes = records.reduce((acc, r) => acc + r.paletesMontados, 0);
  const totalHL = records.reduce((acc, r) => acc + r.hectolitros, 0);
  const totalErros = records.reduce((acc, r) => acc + r.errosMontagem, 0);
  const mediaEficiencia = (records.reduce((acc, r) => acc + r.eficienciaPct, 0) / (records.length || 1)).toFixed(1);

  return (
    <div className="space-y-6">
      {/* HEADER FAST PICKING INTEGRATION */}
      <div className="bg-gradient-to-r from-blue-900 via-sky-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-sky-800/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-sky-300 bg-sky-400/10 px-3 py-1 rounded-full border border-sky-400/20 flex items-center gap-1.5 w-max">
            <Zap className="w-3.5 h-3.5 text-sky-400" />
            Processo Oficial Fast Picking (Montagem de Cargas)
          </span>
          <h2 className="text-2xl font-black tracking-tight mt-2 flex items-center gap-2">
            Eficiência de Montagem (Assembly Dashboard)
          </h2>
          <p className="text-xs text-sky-200/90 font-medium mt-1 max-w-2xl">
            Sincronização de desempenho, caixas montadas, tempo por palete e acuracidade por operador.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a 
            href="https://new.fastpicking.com.br/pickings/dashboards?tab=assembly" 
            target="_blank" 
            rel="noreferrer"
            className="bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs uppercase tracking-wider px-4 py-3 rounded-xl transition-all shadow-lg flex items-center gap-2 cursor-pointer shrink-0"
          >
            <ExternalLink className="w-4 h-4" />
            Fast Picking Oficial
          </a>
        </div>
      </div>

      {/* MANUAL DE INSTRUÇÃO E METAS */}
      <ManualInstrucaoCard
        title="Manual de Instrução & Parâmetros de Meta — Eficiência de Montagem"
        metrics={[
          {
            key: 'montagem_produtividade',
            label: 'Eficiência Geral de Montagem',
            unit: '%',
            comoCalcular: '(Paletes Montados sem Inconformidade na Portaria) ÷ (Total de Paletes Montados no Fast Picking) × 100.'
          },
          {
            key: 'tempo_medio_montagem',
            label: 'Tempo Médio de Montagem',
            unit: 'min',
            comoCalcular: '(Tempo Total do Operador no Processo de Montagem em Minutos) ÷ (Total de Paletes Concluídos).'
          }
        ]}
      />

      {/* PAINEL DE METRICAS DE MONTAGEM */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#111a30] border border-slate-800 p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">1º Lugar Eficiência</span>
            <strong className="text-xs text-white font-black truncate block max-w-[170px]">{melhorColaborador?.colaborador || 'N/A'}</strong>
            <span className="text-[10px] text-emerald-400 font-bold block">{melhorColaborador?.eficienciaPct}% Eficiência</span>
          </div>
        </div>

        <div className="bg-[#111a30] border border-slate-800 p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Eficiência Média da Fase</span>
            <strong className="text-xl text-sky-300 font-black">{mediaEficiencia}%</strong>
            <span className="text-[10px] text-slate-400 block">{records.length} operadores avaliados</span>
          </div>
        </div>

        <div className="bg-[#111a30] border border-slate-800 p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <BarChart2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Volume Total Montado</span>
            <strong className="text-xl text-emerald-400 font-black">{totalCaixas.toLocaleString()} cx</strong>
            <span className="text-[10px] text-slate-300 block">{totalPaletes.toLocaleString()} paletes ({totalHL.toFixed(1)} HL)</span>
          </div>
        </div>

        <div className="bg-[#111a30] border border-slate-800 p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Erros de Montagem</span>
            <strong className="text-xl text-amber-400 font-black">{totalErros} erros</strong>
            <span className="text-[10px] text-slate-400 block">Total no período</span>
          </div>
        </div>
      </div>

      {/* ÁREA DE IMPORTAÇÃO E COLA DE RELATÓRIO DO FAST PICKING */}
      <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-sky-400" /> Sincronizar Relatório Fast Picking (Assembly)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Cole abaixo as linhas do relatório exportado ou zerar para redefinir.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClearMontagemData}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold uppercase px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Zerar Base
            </button>
            <button
              onClick={handleProcessImport}
              disabled={isImporting}
              className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs uppercase px-4 py-2 rounded-xl cursor-pointer transition-all flex items-center gap-2 shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isImporting ? 'animate-spin' : ''}`} />
              {isImporting ? 'Processando...' : 'Sincronizar CSV'}
            </button>
          </div>
        </div>

        {importStatus && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl flex items-center gap-2 font-medium">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            {importStatus}
          </div>
        )}

        <div>
          <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
            Cole as linhas do relatório (Separado por Ponto e Vírgula ";"):
          </label>
          <textarea
            rows={3}
            placeholder="Operador;Veículos;Paletes;Produtos;Caixas;Unidades;Hectolitros;Tempo Médio (s);Eficiência Fase %;Eficiência Geral %;Erros Montagem..."
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            className="w-full bg-[#0b1222] border border-slate-700 rounded-xl p-3 text-xs text-white outline-none focus:border-sky-400 font-mono"
          />
        </div>
      </div>

      {/* TABELA RANKING DE MONTAGEM */}
      <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-sky-400" /> Ranking de Eficiência de Montagem ({records.length} Colaboradores)
          </h3>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar operador..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-[#0b1222] border border-slate-700 text-white text-xs pl-8 pr-3 py-1.5 rounded-xl outline-none focus:border-sky-400 w-48"
              />
            </div>

            <select
              value={selectedComissaoFilter}
              onChange={e => setSelectedComissaoFilter(e.target.value)}
              className="bg-[#0b1222] border border-slate-700 text-slate-300 text-xs px-3 py-1.5 rounded-xl outline-none"
            >
              <option value="TODOS">Todas Comissões</option>
              <option value="A">Comissão A</option>
              <option value="B">Comissão B</option>
              <option value="C">Comissão C</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#0b1222] text-slate-400 font-black uppercase text-[9px] border-b border-slate-800">
                <th className="p-3">Posição</th>
                <th className="p-3">Operador</th>
                <th className="p-3 text-right">Veículos</th>
                <th className="p-3 text-right">Paletes</th>
                <th className="p-3 text-right">Caixas Montadas</th>
                <th className="p-3 text-right">Hectolitros (HL)</th>
                <th className="p-3 text-right">Tempo Médio / Pl</th>
                <th className="p-3 text-right">Eficiência Fase</th>
                <th className="p-3 text-right">Erros</th>
                <th className="p-3 text-center">Comissão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 font-medium">
              {sortedRecords.map((item, index) => (
                <tr key={item.colaborador} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-3 font-black text-xs text-sky-400">
                    {index === 0 ? '🥇 1º' : index === 1 ? '🥈 2º' : index === 2 ? '🥉 3º' : `${index + 1}º`}
                  </td>
                  <td className="p-3">
                    <strong className="text-white text-xs block">{item.colaborador}</strong>
                  </td>
                  <td className="p-3 text-right font-mono">{item.veiculos}</td>
                  <td className="p-3 text-right font-mono font-bold text-slate-200">{item.paletesMontados}</td>
                  <td className="p-3 text-right font-mono font-bold text-white">
                    {item.caixasMontadas.toLocaleString()} cx
                  </td>
                  <td className="p-3 text-right font-mono text-sky-300">
                    {item.hectolitros.toFixed(1)}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-slate-300">
                    {item.tempoMedioMinPalete} min
                  </td>
                  <td className="p-3 text-right font-mono font-black text-emerald-400 text-xs">
                    {item.eficienciaPct}%
                  </td>
                  <td className="p-3 text-right font-mono text-amber-400">
                    {item.errosMontagem}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                      item.comissao === 'A' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                      item.comissao === 'B' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' :
                      'bg-slate-700/50 text-slate-300'
                    }`}>
                      {item.comissao}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
