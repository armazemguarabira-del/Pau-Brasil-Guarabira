import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Calendar, 
  UserCheck, 
  FileText, 
  Save, 
  X, 
  Plus, 
  Search, 
  Award,
  Building2,
  HelpCircle,
  MessageSquare,
  History,
  Eye,
  Check,
  ClipboardList,
  BarChart2,
  PieChart,
  Filter
} from 'lucide-react';
import { db } from '../firebase';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';

export type NivelAvaliacao = 'excelente' | 'bom' | 'razoavel' | 'ruim';

export interface PerguntasRondaGSA {
  id: number;
  pergunta: string;
}

export const QUESTOES_RONDA_GSA: PerguntasRondaGSA[] = [
  { id: 1, pergunta: 'Piso está limpo e seco?' },
  { id: 2, pergunta: 'Piso uniforme, sem ondulações que ofereçam risco de acidente?' },
  { id: 3, pergunta: 'Empilhamento de produtos segue o manual de segurança (sem ruas com lotes inclinados)?' },
  { id: 4, pergunta: 'Extintores e hidrantes desobstruídos, com inspeção mensal feita e em boas condições?' },
  { id: 5, pergunta: 'Plataformas, escadas e guarda-corpo em boas condições e identificados (sem amassados/soldas quebradas/rodas danificadas)?' },
  { id: 6, pergunta: 'Equipamentos de elevação (racks, prateleiras, paleteiras) inspecionados e com etiqueta de liberação/segregação?' },
  { id: 7, pergunta: 'Painéis elétricos sinalizados, portas fechadas, sem gambiarras?' },
  { id: 8, pergunta: 'Produtos químicos armazenados corretamente, com bacia de contenção e respeitando incompatibilidade?' },
  { id: 9, pergunta: 'Sinalização de circulação de pedestres adequada e visível?' },
  { id: 10, pergunta: 'Sistema de trava-quedas (linha de vida, monovias, troles) em perfeitas condições?' },
  { id: 11, pergunta: 'Trava-rodas em uso no carregamento/retorno de rota/puxada, em bom estado e no padrão correto?' },
  { id: 12, pergunta: 'Paleteiras em uso correto e bom estado?' },
  { id: 13, pergunta: 'Espelhos convexos em boas condições e na quantidade necessária?' },
  { id: 14, pergunta: 'Iluminação das áreas (Logística, Amarração, Repack, Of. Empilhadeira, Pit Stop) adequada?' },
  { id: 15, pergunta: 'Empilhadeiras em boas condições (ré sonora e luminosa, faróis, giroflex, buzina, grade de proteção, freios, pneus, retrovisores, extintor válido, cinto de segurança)?' },
  { id: 16, pergunta: 'Ferramentas/estiletes de segurança em bom estado?' },
  { id: 17, pergunta: 'Abastecimento feito por colaborador treinado, com gradil de GLP fechado com corrente e cadeado?' },
  { id: 18, pergunta: 'Funcionários sem adornos nas áreas produtivas?' },
  { id: 19, pergunta: 'Todos usando EPIs (capacete com jugular, bota, óculos, colete/uniforme refletivo) em bom estado?' },
  { id: 20, pergunta: 'Seguem procedimento correto de movimentação manual (postura correta)?' },
  { id: 21, pergunta: 'Conhecem rota de fuga e ponto de encontro/apoio (guarita)?' },
  { id: 22, pergunta: 'Mantêm 5 metros de distância de empilhadeiras em operação?' },
  { id: 23, pergunta: 'Objetos na área são realmente necessários (5S)? Área organizada e limpa?' },
  { id: 24, pergunta: 'Coleta seletiva feita corretamente?' },
  { id: 25, pergunta: 'Aproxima o corpo da carga abaixando-se com ergonomia correta?' },
  { id: 26, pergunta: 'Empurra a paleteira em vez de puxar?' },
  { id: 27, pergunta: 'Utiliza travas do picking e segregação homem-máquina?' },
  { id: 28, pergunta: 'Usa luvas na operação de empilhadeira?' },
  { id: 29, pergunta: 'Desliga a empilhadeira e abaixa os garfos quando alguém se aproxima?' },
  { id: 30, pergunta: 'Realiza a troca de GLP com duas pessoas?' },
  { id: 31, pergunta: 'Faz o giro de 360° em carretas/caminhões antes de carregar/descarregar?' },
  { id: 32, pergunta: 'Usa cinto de segurança?' },
  { id: 33, pergunta: 'Retira a chave da ignição durante carregamento/descarregamento?' },
  { id: 34, pergunta: 'Desce do caminhão usando os três pontos de apoio?' }
];

export interface RondaGSARecord {
  id: string;
  dataISO: string;
  dataFormatted: string;
  mesAno: string; // e.g. "08/2026"
  localAuditado: string; // Ex: "Armazém Principal - Guarabira"
  colaboradorAuditado: string;
  auditorNome: string;
  respostasAvaliacao: Record<number, NivelAvaliacao>; // id 1..34 -> 'excelente' | 'bom' | 'razoavel' | 'ruim'
  observacoesItem: Record<number, string>;
  respostaTreinamento: string; // questao 35
  pontos: number; // 0 to 10 scale
  pontosPercentual: number; // 0 to 100% Qualidade da Ronda
  countExcelente: number;
  countBom: number;
  countRazoavel: number;
  countRuim: number;
  statusPontuacao: 'EXCELENTE' | 'BOM' | 'RAZOÁVEL' | 'RUIM';
  criadoEm: string;
}

interface RondaGsaComponentProps {
  user: any;
  empresaId?: string;
}

export const RondaGsaComponent: React.FC<RondaGsaComponentProps> = ({
  user,
  empresaId = 'demo'
}) => {
  const [records, setRecords] = useState<RondaGSARecord[]>(() => {
    try {
      const saved = localStorage.getItem('ronda_gsa_audits_history');
      if (saved) return JSON.parse(saved);

      // Default sample record if empty
      const sample: RondaGSARecord[] = [{
        id: 'gsa-sample-1',
        dataISO: '2026-08-08',
        dataFormatted: '08/08/2026',
        mesAno: '08/2026',
        localAuditado: 'Armazém Central - Guarabira',
        colaboradorAuditado: 'MARIVALDO ARTUR ALVES',
        auditorNome: 'Controle de Qualidade',
        respostasAvaliacao: {
          1: 'excelente', 2: 'excelente', 3: 'bom', 4: 'excelente', 5: 'bom',
          6: 'bom', 7: 'excelente', 8: 'bom', 9: 'excelente', 10: 'excelente',
          11: 'excelente', 12: 'bom', 13: 'excelente', 14: 'bom', 15: 'excelente',
          16: 'bom', 17: 'excelente', 18: 'excelente', 19: 'excelente', 20: 'bom',
          21: 'excelente', 22: 'excelente', 23: 'bom', 24: 'bom', 25: 'bom',
          26: 'excelente', 27: 'excelente', 28: 'bom', 29: 'excelente', 30: 'excelente',
          31: 'bom', 32: 'excelente', 33: 'excelente', 34: 'excelente'
        },
        observacoesItem: {},
        respostaTreinamento: 'Treinamento de 5S e Movimentação Ergonômica de Paletes',
        pontos: 9.6,
        pontosPercentual: 96,
        countExcelente: 23,
        countBom: 11,
        countRazoavel: 0,
        countRuim: 0,
        statusPontuacao: 'EXCELENTE',
        criadoEm: '2026-08-08T08:00:00.000Z'
      }];
      localStorage.setItem('ronda_gsa_audits_history', JSON.stringify(sample));
      return sample;
    } catch {
      return [];
    }
  });

  const [showForm, setShowForm] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<RondaGSARecord | null>(null);
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('todos');

  // Form states
  const [dataISO, setDataISO] = useState<string>(new Date().toISOString().split('T')[0]);
  const [localAuditado, setLocalAuditado] = useState<string>('Armazém Central - Guarabira');
  const [colaboradorAuditado, setColaboradorAuditado] = useState<string>('');
  const [auditorNome, setAuditorNome] = useState<string>(user?.nome || 'Controle de Qualidade');
  const [respostaTreinamento, setRespostaTreinamento] = useState<string>('');

  // 34 question responses (default 'excelente')
  const [respostasAvaliacao, setRespostasAvaliacao] = useState<Record<number, NivelAvaliacao>>(() => {
    const initial: Record<number, NivelAvaliacao> = {};
    QUESTOES_RONDA_GSA.forEach(q => {
      initial[q.id] = 'excelente';
    });
    return initial;
  });

  const [observacoesItem, setObservacoesItem] = useState<Record<number, string>>({});

  // Sync with Firestore
  useEffect(() => {
    const fetchFirestoreGSA = async () => {
      if (!db) return;
      try {
        const colRef = collection(db, 'fefo_ronda_gsa');
        const snap = await getDocs(colRef);
        if (!snap.empty) {
          const list: RondaGSARecord[] = [];
          snap.forEach(d => list.push({ id: d.id, ...d.data() } as RondaGSARecord));
          if (list.length > 0) {
            list.sort((a, b) => new Date(b.criadoEm || b.dataISO).getTime() - new Date(a.criadoEm || a.dataISO).getTime());
            setRecords(list);
            localStorage.setItem('ronda_gsa_audits_history', JSON.stringify(list));
          }
        }
      } catch (e) {
        console.warn('Fallback loading Ronda GSA:', e);
      }
    };

    fetchFirestoreGSA();
  }, []);

  // Compute live score from 4 evaluation options
  let countExcelente = 0;
  let countBom = 0;
  let countRazoavel = 0;
  let countRuim = 0;

  Object.values(respostasAvaliacao).forEach(val => {
    if (val === 'excelente') countExcelente++;
    else if (val === 'bom') countBom++;
    else if (val === 'razoavel') countRazoavel++;
    else if (val === 'ruim') countRuim++;
  });

  const totalPoints = (countExcelente * 4) + (countBom * 3) + (countRazoavel * 2) + (countRuim * 1);
  const maxPossiblePoints = 34 * 4; // 136
  const pctQualidade = Math.round((totalPoints / maxPossiblePoints) * 100);
  const nota10Scale = Number(((totalPoints / maxPossiblePoints) * 10).toFixed(1));

  const getStatusFromPct = (pct: number): 'EXCELENTE' | 'BOM' | 'RAZOÁVEL' | 'RUIM' => {
    if (pct >= 90) return 'EXCELENTE';
    if (pct >= 75) return 'BOM';
    if (pct >= 60) return 'RAZOÁVEL';
    return 'RUIM';
  };

  const currentStatus = getStatusFromPct(pctQualidade);

  const handleSelectOption = (id: number, val: NivelAvaliacao) => {
    setRespostasAvaliacao(prev => ({ ...prev, [id]: val }));
  };

  const handleObsChange = (id: number, text: string) => {
    setObservacoesItem(prev => ({ ...prev, [id]: text }));
  };

  const handleSaveAuditoriaGSA = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!colaboradorAuditado.trim()) {
      alert('Por favor, informe o nome do colaborador inspecionado.');
      return;
    }

    const parts = dataISO.split('-');
    const dataFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
    const mesAno = `${parts[1]}/${parts[0]}`;
    const status = getStatusFromPct(pctQualidade);

    const newRecord: RondaGSARecord = {
      id: `gsa-${Date.now()}`,
      dataISO,
      dataFormatted,
      mesAno,
      localAuditado: localAuditado.trim() || 'Armazém Central',
      colaboradorAuditado: colaboradorAuditado.trim(),
      auditorNome: auditorNome.trim() || 'Controle de Qualidade',
      respostasAvaliacao,
      observacoesItem,
      respostaTreinamento: respostaTreinamento.trim(),
      pontos: nota10Scale,
      pontosPercentual: pctQualidade,
      countExcelente,
      countBom,
      countRazoavel,
      countRuim,
      statusPontuacao: status,
      criadoEm: new Date().toISOString()
    };

    const updated = [newRecord, ...records];
    setRecords(updated);
    localStorage.setItem('ronda_gsa_audits_history', JSON.stringify(updated));

    if (db) {
      try {
        await setDoc(doc(db, 'fefo_ronda_gsa', newRecord.id), newRecord);
      } catch (err) {
        console.warn('Firestore write error for Ronda GSA:', err);
      }
    }

    // Reset Form
    setShowForm(false);
    setRespostaTreinamento('');
    setColaboradorAuditado('');

    alert(`✅ Ronda de Qualidade Semanal salva com sucesso!\nPercentual de Qualidade: ${pctQualidade}% — Status: ${status}`);
  };

  // Filter records by Month
  const filteredRecords = records.filter(r => {
    if (selectedMonthFilter === 'todos') return true;
    return r.mesAno === selectedMonthFilter;
  });

  // Calculate overall monthly graph metrics
  const totalAuditsInFilter = filteredRecords.length;
  const avgQualityPctInFilter = totalAuditsInFilter > 0
    ? Math.round(filteredRecords.reduce((acc, curr) => acc + curr.pontosPercentual, 0) / totalAuditsInFilter)
    : 0;

  const totalExcelenteAll = filteredRecords.reduce((acc, c) => acc + (c.countExcelente || 0), 0);
  const totalBomAll = filteredRecords.reduce((acc, c) => acc + (c.countBom || 0), 0);
  const totalRazoavelAll = filteredRecords.reduce((acc, c) => acc + (c.countRazoavel || 0), 0);
  const totalRuimAll = filteredRecords.reduce((acc, c) => acc + (c.countRuim || 0), 0);
  const grandTotalItems = totalExcelenteAll + totalBomAll + totalRazoavelAll + totalRuimAll || 1;

  return (
    <div className="space-y-6">
      
      {/* CABEÇALHO DA SEÇÃO RONDA DE QUALIDADE */}
      <div className="bg-[#111a30] border border-blue-500/30 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-3 bg-blue-500/20 border border-blue-500/30 rounded-xl text-blue-400 shrink-0">
            <ClipboardList className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
                AUDITORIA DE QUALIDADE & SEGURANÇA
              </span>
              <span className="text-[10px] text-slate-300 font-mono">Realizado pelo perfil Controle</span>
            </div>
            <h2 className="text-lg font-black text-white mt-1 uppercase tracking-tight">
              Ronda de Qualidade Semanal (34 Itens)
            </h2>
            <p className="text-xs text-slate-300 leading-snug max-w-2xl">
              Avaliação de condições do local auditado com 4 níveis de qualidade: Excelente (Azul), Bom (Verde), Razoável (Amarelo) e Ruim (Vermelho).
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg flex items-center gap-2 shrink-0"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Fechar Formulário' : '+ Nova Ronda Semanal'}
        </button>
      </div>

      {/* GRÁFICO DE QUALIDADE DO LOCAL AUDITADO (GLOBAL/MENSAL) */}
      <div className="bg-[#111a30] border border-blue-500/30 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-black uppercase tracking-wider text-white">
              Gráfico de Qualidade da Situação do Local Auditado
            </h3>
          </div>

          <div className="flex items-center gap-2 bg-[#0b1222] border border-slate-700 rounded-xl px-3 py-1.5">
            <Filter className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[10px] font-black uppercase text-slate-400">Filtrar Mês:</span>
            <select
              value={selectedMonthFilter}
              onChange={(e) => setSelectedMonthFilter(e.target.value)}
              className="bg-transparent text-xs font-black text-blue-400 outline-none cursor-pointer"
            >
              <option value="todos" className="bg-[#0b1222] text-white">Todos os Meses</option>
              <option value="08/2026" className="bg-[#0b1222] text-white">Agosto / 2026</option>
              <option value="07/2026" className="bg-[#0b1222] text-white">Julho / 2026</option>
              <option value="06/2026" className="bg-[#0b1222] text-white">Junho / 2026</option>
              <option value="05/2026" className="bg-[#0b1222] text-white">Maio / 2026</option>
            </select>
          </div>
        </div>

        {/* MÉTRICAS E DISTRIBUIÇÃO GRÁFICA */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-1 bg-[#0b1222] p-4 rounded-xl border border-slate-800 flex flex-col justify-center items-center text-center">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Média de Qualidade Semanal
            </span>
            <div className="text-3xl font-black font-mono text-blue-400 mt-1">
              {avgQualityPctInFilter}%
            </div>
            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded mt-2 ${
              avgQualityPctInFilter >= 90 ? 'bg-blue-600 text-white' :
              avgQualityPctInFilter >= 75 ? 'bg-emerald-600 text-white' :
              avgQualityPctInFilter >= 60 ? 'bg-amber-500 text-slate-950' : 'bg-rose-600 text-white'
            }`}>
              {getStatusFromPct(avgQualityPctInFilter)}
            </span>
          </div>

          <div className="md:col-span-4 bg-[#0b1222] p-4 rounded-xl border border-slate-800 space-y-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Distribuição Visual por Nível de Avaliação ({totalAuditsInFilter} Ronda(s) Mês)
            </span>

            {/* BARRA DE PROGRESSO MULTICOLORIDA */}
            <div className="h-6 w-full bg-slate-900 rounded-lg overflow-hidden flex shadow-inner">
              <div 
                style={{ width: `${Math.round((totalExcelenteAll / grandTotalItems) * 100)}%` }} 
                className="bg-blue-500 h-full transition-all flex items-center justify-center text-[10px] font-black text-white"
                title="Excelente"
              >
                {Math.round((totalExcelenteAll / grandTotalItems) * 100) > 5 ? `${Math.round((totalExcelenteAll / grandTotalItems) * 100)}%` : ''}
              </div>
              <div 
                style={{ width: `${Math.round((totalBomAll / grandTotalItems) * 100)}%` }} 
                className="bg-emerald-500 h-full transition-all flex items-center justify-center text-[10px] font-black text-white"
                title="Bom"
              >
                {Math.round((totalBomAll / grandTotalItems) * 100) > 5 ? `${Math.round((totalBomAll / grandTotalItems) * 100)}%` : ''}
              </div>
              <div 
                style={{ width: `${Math.round((totalRazoavelAll / grandTotalItems) * 100)}%` }} 
                className="bg-amber-500 h-full transition-all flex items-center justify-center text-[10px] font-black text-slate-950"
                title="Razoável"
              >
                {Math.round((totalRazoavelAll / grandTotalItems) * 100) > 5 ? `${Math.round((totalRazoavelAll / grandTotalItems) * 100)}%` : ''}
              </div>
              <div 
                style={{ width: `${Math.round((totalRuimAll / grandTotalItems) * 100)}%` }} 
                className="bg-rose-500 h-full transition-all flex items-center justify-center text-[10px] font-black text-white"
                title="Ruim"
              >
                {Math.round((totalRuimAll / grandTotalItems) * 100) > 5 ? `${Math.round((totalRuimAll / grandTotalItems) * 100)}%` : ''}
              </div>
            </div>

            {/* LEGENDA DAS 4 OPÇÕES */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
              <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 p-2 rounded-lg">
                <div className="w-3.5 h-3.5 bg-blue-500 rounded-full shrink-0" />
                <div>
                  <span className="block text-[10px] font-black uppercase text-blue-400">Excelente (Azul)</span>
                  <strong className="text-white font-mono">{totalExcelenteAll} item(s)</strong>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 p-2 rounded-lg">
                <div className="w-3.5 h-3.5 bg-emerald-500 rounded-full shrink-0" />
                <div>
                  <span className="block text-[10px] font-black uppercase text-emerald-400">Bom (Verde)</span>
                  <strong className="text-white font-mono">{totalBomAll} item(s)</strong>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 p-2 rounded-lg">
                <div className="w-3.5 h-3.5 bg-amber-500 rounded-full shrink-0" />
                <div>
                  <span className="block text-[10px] font-black uppercase text-amber-400">Razoável (Amarelo)</span>
                  <strong className="text-white font-mono">{totalRazoavelAll} item(s)</strong>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 p-2 rounded-lg">
                <div className="w-3.5 h-3.5 bg-rose-500 rounded-full shrink-0" />
                <div>
                  <span className="block text-[10px] font-black uppercase text-rose-400">Ruim (Vermelho)</span>
                  <strong className="text-white font-mono">{totalRuimAll} item(s)</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DETALHES DO REGISTRO SELECIONADO NO HISTÓRICO */}
      {selectedRecord && (
        <div className="bg-[#0b1222] border-2 border-blue-500/50 rounded-2xl p-5 space-y-4 shadow-2xl relative">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-black uppercase text-blue-400 flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-400" /> Detalhes da Ronda de Qualidade - {selectedRecord.dataFormatted} ({selectedRecord.localAuditado})
            </h3>
            <button
              onClick={() => setSelectedRecord(null)}
              className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-[#111a30] p-3 rounded-xl text-xs text-slate-300">
            <div><span className="text-slate-500 block uppercase text-[10px]">Data:</span> <strong>{selectedRecord.dataFormatted}</strong></div>
            <div><span className="text-slate-500 block uppercase text-[10px]">Local Auditado:</span> <strong>{selectedRecord.localAuditado}</strong></div>
            <div><span className="text-slate-500 block uppercase text-[10px]">Colaborador Auditado:</span> <strong>{selectedRecord.colaboradorAuditado}</strong></div>
            <div><span className="text-slate-500 block uppercase text-[10px]">Auditor:</span> <strong>{selectedRecord.auditorNome}</strong></div>
          </div>

          <div className="flex items-center justify-between p-3 bg-blue-950/60 border border-blue-500/30 rounded-xl">
            <span className="text-xs font-black uppercase text-slate-200">Percentual de Qualidade Semanal:</span>
            <span className={`text-base font-mono font-black px-3 py-1 rounded ${
              selectedRecord.statusPontuacao === 'EXCELENTE' ? 'bg-blue-600 text-white' :
              selectedRecord.statusPontuacao === 'BOM' ? 'bg-emerald-600 text-white' :
              selectedRecord.statusPontuacao === 'RAZOÁVEL' ? 'bg-amber-500 text-slate-950 font-black' :
              'bg-rose-600 text-white font-black'
            }`}>
              {selectedRecord.pontosPercentual}% Qualidade — {selectedRecord.statusPontuacao}
            </span>
          </div>

          <div className="max-h-80 overflow-y-auto space-y-1 pr-1 border border-slate-800 rounded-xl p-2 bg-[#111a30]">
            {QUESTOES_RONDA_GSA.map(q => {
              const resp = selectedRecord.respostasAvaliacao?.[q.id] || 'excelente';
              const obs = selectedRecord.observacoesItem?.[q.id] || '';

              return (
                <div key={q.id} className="p-2 bg-[#0b1222] rounded flex items-center justify-between text-xs gap-3">
                  <div className="flex-1">
                    <span className="text-slate-400 font-mono font-bold mr-1.5">{q.id}.</span>
                    <span className="text-white font-medium">{q.pergunta}</span>
                    {obs && <span className="block text-[10px] text-amber-300 italic mt-0.5">Obs: "{obs}"</span>}
                  </div>
                  <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase shrink-0 ${
                    resp === 'excelente' ? 'bg-blue-600 text-white' :
                    resp === 'bom' ? 'bg-emerald-600 text-white' :
                    resp === 'razoavel' ? 'bg-amber-500 text-slate-950 font-black' :
                    'bg-rose-600 text-white font-black'
                  }`}>
                    {resp}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* FORMULÁRIO COMPLETO DE PREENCHIMENTO DA RONDA */}
      {showForm && (
        <form onSubmit={handleSaveAuditoriaGSA} className="bg-[#111a30] border-2 border-blue-500/50 rounded-2xl p-5 space-y-6 shadow-2xl">
          
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-blue-400" />
              <h3 className="text-sm font-black uppercase text-white">
                Preenchimento da Ronda de Qualidade Semanal (34 Itens)
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="p-1 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* DADOS BÁSICOS DA AUDITORIA */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#0b1222] p-4 rounded-xl border border-slate-800">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Data da Ronda</label>
              <input
                type="date"
                value={dataISO}
                onChange={e => setDataISO(e.target.value)}
                className="w-full bg-[#111a30] border border-slate-700 rounded-lg p-2 text-xs font-mono text-white outline-none focus:border-blue-400"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Local / Ponto Auditado</label>
              <input
                type="text"
                value={localAuditado}
                onChange={e => setLocalAuditado(e.target.value)}
                placeholder="Ex: Armazém Central - Setor A/B"
                className="w-full bg-[#111a30] border border-slate-700 rounded-lg p-2 text-xs font-bold text-white outline-none focus:border-blue-400"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Colaborador Inspecionado *</label>
              <input
                type="text"
                placeholder="Ex: Carlos Silva / Equipe Operacional"
                value={colaboradorAuditado}
                onChange={e => setColaboradorAuditado(e.target.value)}
                className="w-full bg-[#111a30] border border-slate-700 rounded-lg p-2 text-xs text-white outline-none focus:border-blue-400"
                required
              />
            </div>
          </div>

          {/* CRITÉRIO E PONTUAÇÃO AO VIVO (4 NÍVEIS) */}
          <div className="bg-[#081226] border border-blue-500/30 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Award className="w-8 h-8 text-blue-400 shrink-0" />
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Percentual de Qualidade Semanal Calculado
                </span>
                <strong className="text-xl font-mono font-black text-white">
                  {pctQualidade}% Qualidade <span className="text-xs text-slate-400 font-normal">({nota10Scale}/10 pts)</span>
                </strong>
              </div>
            </div>

            {/* SELETOR DE STATUS */}
            <div className="flex items-center gap-2 text-[10px] font-black">
              <span className={`px-2.5 py-1 rounded uppercase ${currentStatus === 'EXCELENTE' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                ≥ 90% = Excelente (Azul)
              </span>
              <span className={`px-2.5 py-1 rounded uppercase ${currentStatus === 'BOM' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                75-89% = Bom (Verde)
              </span>
              <span className={`px-2.5 py-1 rounded uppercase ${currentStatus === 'RAZOÁVEL' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-500'}`}>
                60-74% = Razoável (Amarelo)
              </span>
              <span className={`px-2.5 py-1 rounded uppercase ${currentStatus === 'RUIM' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                &lt; 60% = Ruim (Vermelho)
              </span>
            </div>
          </div>

          {/* TABELA DAS 34 PERGUNTAS COM 4 OPÇÕES DE AVALIAÇÃO */}
          <div className="border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#032b5e] text-white font-black uppercase tracking-wider text-[11px]">
                    <th className="p-3 w-12 text-center">Nº</th>
                    <th className="p-3">Item de Verificação (Qualidade / Segurança)</th>
                    <th className="p-3 text-center w-72">Avaliação de Qualidade</th>
                    <th className="p-3 w-64">Observação do Item</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-[#0b1222] text-slate-200">
                  {QUESTOES_RONDA_GSA.map((item) => {
                    const currentVal = respostasAvaliacao[item.id] || 'excelente';

                    return (
                      <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-mono font-bold text-slate-400 text-center">
                          {item.id}
                        </td>
                        <td className="p-3 font-medium text-slate-200">
                          {item.pergunta}
                        </td>
                        <td className="p-3">
                          <div className="grid grid-cols-4 gap-1">
                            <button
                              type="button"
                              onClick={() => handleSelectOption(item.id, 'ruim')}
                              className={`py-1.5 px-1 rounded text-[9px] font-black uppercase transition-all cursor-pointer border ${
                                currentVal === 'ruim'
                                  ? 'bg-rose-600 text-white border-rose-400 shadow-md'
                                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-rose-500'
                              }`}
                            >
                              Ruim
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSelectOption(item.id, 'razoavel')}
                              className={`py-1.5 px-1 rounded text-[9px] font-black uppercase transition-all cursor-pointer border ${
                                currentVal === 'razoavel'
                                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-black'
                                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-amber-500'
                              }`}
                            >
                              Razoável
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSelectOption(item.id, 'bom')}
                              className={`py-1.5 px-1 rounded text-[9px] font-black uppercase transition-all cursor-pointer border ${
                                currentVal === 'bom'
                                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-md'
                                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-emerald-500'
                              }`}
                            >
                              Bom
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSelectOption(item.id, 'excelente')}
                              className={`py-1.5 px-1 rounded text-[9px] font-black uppercase transition-all cursor-pointer border ${
                                currentVal === 'excelente'
                                  ? 'bg-blue-600 text-white border-blue-400 shadow-md'
                                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-blue-500'
                              }`}
                            >
                              Excelente
                            </button>
                          </div>
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            placeholder="Anotação / Desvio..."
                            value={observacoesItem[item.id] || ''}
                            onChange={(e) => handleObsChange(item.id, e.target.value)}
                            className="w-full bg-[#111a30] border border-slate-700 rounded p-1.5 text-xs text-white outline-none focus:border-blue-400"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ITEM 35 - PERGUNTA ABERTA DE TREINAMENTO */}
          <div className="p-4 bg-[#0b1222] border border-amber-500/40 rounded-xl space-y-2">
            <label className="block text-xs font-black uppercase text-amber-400 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-amber-400" /> Item 35: "Os colaboradores lembram qual foi o último treinamento? Qual foi a resposta?"
            </label>
            <textarea
              rows={2}
              value={respostaTreinamento}
              onChange={e => setRespostaTreinamento(e.target.value)}
              placeholder="Descreva o treinamento mencionado pelos colaboradores durante a ronda..."
              className="w-full bg-[#111a30] border border-slate-700 rounded-lg p-2.5 text-xs text-white outline-none focus:border-amber-400 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4 text-white" /> Gravar Ronda de Qualidade
            </button>
          </div>
        </form>
      )}

      {/* HISTÓRICO DE RONDAS DE QUALIDADE REALIZADAS */}
      <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                Histórico de Rondas de Qualidade Semanal
              </h3>
              <span className="text-[10px] text-slate-400">
                Auditorias registradas pelo perfil Controle
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-[#0b1222] border border-slate-700 rounded-xl px-3 py-1.5">
            <Filter className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[10px] font-black uppercase text-slate-400">Filtrar Mês:</span>
            <select
              value={selectedMonthFilter}
              onChange={(e) => setSelectedMonthFilter(e.target.value)}
              className="bg-transparent text-xs font-black text-blue-400 outline-none cursor-pointer"
            >
              <option value="todos" className="bg-[#0b1222] text-white">Todos os Meses</option>
              <option value="08/2026" className="bg-[#0b1222] text-white">Agosto / 2026</option>
              <option value="07/2026" className="bg-[#0b1222] text-white">Julho / 2026</option>
              <option value="06/2026" className="bg-[#0b1222] text-white">Junho / 2026</option>
              <option value="05/2026" className="bg-[#0b1222] text-white">Maio / 2026</option>
            </select>
          </div>
        </div>

        {filteredRecords.length > 0 ? (
          <div className="border border-slate-800 rounded-xl overflow-hidden shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#032b5e] text-white font-black uppercase tracking-wider text-[11px]">
                    <th className="p-3">Data</th>
                    <th className="p-3">Local Auditado</th>
                    <th className="p-3">Colaborador Inspecionado</th>
                    <th className="p-3">Auditor (Controle)</th>
                    <th className="p-3 text-center">% Qualidade Semanal</th>
                    <th className="p-3 text-center">Situação do Local</th>
                    <th className="p-3 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-[#0b1222] text-slate-200">
                  {filteredRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="p-3 font-mono font-bold text-white">
                        {r.dataFormatted}
                      </td>
                      <td className="p-3 font-bold text-blue-400 uppercase">
                        {r.localAuditado}
                      </td>
                      <td className="p-3 text-slate-300 font-bold">
                        {r.colaboradorAuditado}
                      </td>
                      <td className="p-3 text-slate-400 text-[11px]">
                        {r.auditorNome}
                      </td>
                      <td className="p-3 text-center font-mono font-black text-sm text-blue-400">
                        {r.pontosPercentual}%
                      </td>
                      <td className="p-3 text-center">
                        <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded ${
                          r.statusPontuacao === 'EXCELENTE' ? 'bg-blue-600 text-white' :
                          r.statusPontuacao === 'BOM' ? 'bg-emerald-600 text-white' :
                          r.statusPontuacao === 'RAZOÁVEL' ? 'bg-amber-500 text-slate-950' :
                          'bg-rose-600 text-white'
                        }`}>
                          {r.statusPontuacao}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => setSelectedRecord(r)}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-bold uppercase cursor-pointer transition-all flex items-center justify-center gap-1 mx-auto"
                        >
                          <Eye className="w-3 h-3" /> Detalhes
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-[#0b1222] border border-slate-800 rounded-xl text-center space-y-2">
            <ClipboardList className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400">
              Nenhuma Ronda de Qualidade foi cadastrada para o mês selecionado. Clique no botão acima para iniciar o formulário.
            </p>
          </div>
        )}
      </div>

    </div>
  );
};

export default RondaGsaComponent;
