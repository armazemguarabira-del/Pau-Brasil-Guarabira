import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend
} from 'recharts';
import { 
  ArrowLeft, 
  TrendingDown, 
  TrendingUp, 
  Activity, 
  Target, 
  AlertTriangle, 
  Award, 
  ClipboardList, 
  CheckCircle, 
  Clock, 
  AlertCircle 
} from 'lucide-react';
import { Usuario, Empresa, BlitzRefugoRow } from '../types';
import { db, isCustomFirebaseConnected } from '../firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import A3BoardComponent from './A3BoardComponent';

interface BlitzDashboardProps {
  user: Usuario;
  empresa: Empresa | null;
  onBack?: () => void;
}

export default function BlitzDashboard({ user, empresa, onBack }: BlitzDashboardProps) {
  const [blitzRows, setBlitzRows] = useState<BlitzRefugoRow[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'indicadores' | 'boarda3'>('indicadores');

  useEffect(() => {
    const companyId = empresa?.id || 'demo';
    if (!db) {
      const saved = localStorage.getItem(`blitz_rows_${companyId}`);
      if (saved) setBlitzRows(JSON.parse(saved));
      return;
    }

    const q = query(collection(db, 'blitz_refugo'));
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map(doc => ({ _docId: doc.id, ...doc.data() } as BlitzRefugoRow));
      const filtered = isCustomFirebaseConnected() ? rows : rows.filter(r => r.empresaId === companyId);
      setBlitzRows(filtered);
    });

    return () => unsub();
  }, [empresa?.id]);

  const {
    colaboradores,
    mediaGeralRefugo,
    melhorNoUltimoMes,
    alertaNoUltimoMes,
    mediaMaio,
    mediaJunho,
    tendenciaGeralRefugo,
    chartDataRefugo,
    lastMonthIdx
  } = useMemo(() => {
    const baseColabs: Record<string, number[]> = {
      'Victor': [1.8, 1.5, 1.2, 0.9],
      'Marcelo': [2.4, 2.1, 1.9, 1.7],
      'Gabriel': [0.8, 0.7, 0.9, 0.6],
      'Ozenildo': [1.3, 1.1, 0.8, 0.7]
    };

    blitzRows.forEach(row => {
      const name = row.ajudante;
      if (!name) return;
      const pct = row.pctRefugo || 0;
      const dateStr = row.dataISO || '';
      
      let monthIdx = 3; // Default to Junho
      if (dateStr.includes('-03-')) monthIdx = 0;
      else if (dateStr.includes('-04-')) monthIdx = 1;
      else if (dateStr.includes('-05-')) monthIdx = 2;
      else if (dateStr.includes('-06-')) monthIdx = 3;

      if (!baseColabs[name]) {
        baseColabs[name] = [1.0, 1.0, 1.0, pct];
      } else {
        baseColabs[name][monthIdx] = parseFloat(pct.toFixed(2));
      }
    });

    const colabList = Object.entries(baseColabs).map(([name, data]) => ({ name, data }));

    const mesesRefugo = ['Março', 'Abril', 'Maio', 'Junho'];
    const metaRefugo = 1.0;

    const cDataRefugo = mesesRefugo.map((mes, idx) => {
      const obj: any = { name: mes, Meta: metaRefugo };
      colabList.forEach(c => {
        obj[c.name] = c.data[idx];
      });
      return obj;
    });

    const totalRefugoSum = colabList.reduce((acc, colab) => acc + colab.data.reduce((s, val) => s + val, 0), 0);
    const totalPoints = colabList.length * mesesRefugo.length;
    const mediaGeral = totalRefugoSum / totalPoints;

    const lastIdx = 3;
    const melhor = colabList.reduce((prev, curr) => 
      curr.data[lastIdx] < prev.data[lastIdx] ? curr : prev, colabList[0] || { name: 'Ninguém', data: [0,0,0,0] }
    );

    const alerta = colabList.reduce((prev, curr) => 
      curr.data[lastIdx] > prev.data[lastIdx] ? curr : prev, colabList[0] || { name: 'Ninguém', data: [0,0,0,0] }
    );

    const medMaio = colabList.reduce((acc, colab) => acc + colab.data[2], 0) / (colabList.length || 1);
    const medJunho = colabList.reduce((acc, colab) => acc + colab.data[3], 0) / (colabList.length || 1);
    const tend = medJunho < medMaio ? 'melhorando' : (medJunho > medMaio ? 'piorando' : 'estavel');

    return {
      colaboradores: colabList,
      mediaGeralRefugo: mediaGeral,
      melhorNoUltimoMes: melhor,
      alertaNoUltimoMes: alerta,
      mediaMaio: medMaio,
      mediaJunho: medJunho,
      tendenciaGeralRefugo: tend,
      chartDataRefugo: cDataRefugo,
      lastMonthIdx: lastIdx
    };
  }, [blitzRows]);

  const planosDeAcaoRefugo = [
    { id: 1, acao: 'Treinamento de manuseio de embalagens retornáveis', resp: 'Victor/Marcelo', status: 'Em andamento' },
    { id: 2, acao: 'Revisão do procedimento de separação por curva ABC', resp: 'Gabriel', status: 'Concluída' },
    { id: 3, acao: 'Blitz semanal de Refugo com conferente', resp: 'Gilson', status: 'Em andamento' },
    { id: 4, acao: 'Calibração das bancadas de repack', resp: 'Marivaldo', status: 'Pendente' },
    { id: 5, acao: 'Feedback individual quinzenal de % sorteados', resp: 'Supervisor', status: 'Em andamento' }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Concluído':
      case 'Conforme':
      case 'Concluída':
        return (
          <span className="inline-flex items-center gap-1 py-0.5 px-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[9px] font-black uppercase tracking-wider">
            <CheckCircle className="w-3 h-3" /> Concluída
          </span>
        );
      case 'Em andamento':
      case 'Parcial':
        return (
          <span className="inline-flex items-center gap-1 py-0.5 px-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-600 text-[9px] font-black uppercase tracking-wider">
            <Clock className="w-3 h-3" /> Em Andamento
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 py-0.5 px-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-600 text-[9px] font-black uppercase tracking-wider">
            <AlertCircle className="w-3 h-3" /> Pendente
          </span>
        );
    }
  };

  return (
    <div id="blitz-dashboard-wrapper" className="flex flex-col gap-3 bg-[#f8fafc] text-[#0f172a] p-4 rounded-xl shadow-sm border border-gray-200/80 w-full selection:bg-[#3b82f6] selection:text-white">
      
      {/* ── HEADER PRINCIPAL ── */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-gray-200 pb-5">
        <div className="flex items-center gap-3">
          {onBack && (
            <button 
              onClick={onBack}
              className="p-1.5 hover:bg-gray-200/80 rounded-lg transition-colors cursor-pointer text-gray-500 border-none bg-transparent mr-2"
              title="Voltar"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#032b5e] to-[#021f44] flex items-center justify-center text-xl shadow-md">
            📦
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-[#032b5e]/10 border border-[#032b5e]/25 text-[#032b5e] px-2 py-0.5 rounded font-sans font-black tracking-widest uppercase">
                Guarabira-PB
              </span>
              <span className="text-[10px] bg-amber-500/10 border border-amber-500/25 text-amber-600 px-2 py-0.5 rounded font-sans font-black tracking-widest uppercase">
                Indicadores de Operação
              </span>
            </div>
            <h1 className="font-sans font-black text-lg tracking-tight text-[#032b5e] uppercase mt-1">
              Plataforma Corporativa de Controle
            </h1>
            <p className="text-[10px] text-gray-500 mt-0.5 font-bold uppercase">
              Painel Integrado de KPI de Refugo &amp; Blitz do Armazém
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200/60">
            <button 
              onClick={() => setActiveSubTab('indicadores')}
              className={`px-3 py-1 rounded font-sans font-bold text-[9px] uppercase tracking-wider transition-all border-none cursor-pointer ${activeSubTab === 'indicadores' ? 'bg-[#032b5e] text-white shadow-xs' : 'text-gray-500 hover:text-[#032b5e] bg-transparent'}`}
            >
              Indicadores & BI
            </button>
            <button 
              onClick={() => setActiveSubTab('boarda3')}
              className={`px-3 py-1 rounded font-sans font-bold text-[9px] uppercase tracking-wider transition-all border-none cursor-pointer ${activeSubTab === 'boarda3' ? 'bg-[#032b5e] text-white shadow-xs' : 'text-gray-500 hover:text-[#032b5e] bg-transparent'}`}
            >
              Quadro de Ações
            </button>
          </div>
        </div>

      </div>

      {/* CONTEÚDO ÚNICO: CONTROLE & BLITZ DE REFUGO */}
      {activeSubTab === 'indicadores' && (
        <div className="flex flex-col gap-6 animate-fadeIn">
        
        {/* Seção 1 — KPIs Summary (cards no topo) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* % Refugo Geral */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 border-l-4 border-l-[#3b82f6] flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-gray-400 font-black uppercase tracking-wider">
                % Refugo Geral
              </span>
              <Target className="w-5 h-5 text-[#3b82f6]" />
            </div>
            <div>
              <span className="font-sans font-black text-3xl text-[#032b5e] block leading-none">
                {mediaGeralRefugo.toFixed(2)}%
              </span>
              <span className="text-[9px] text-gray-400 mt-1.5 block font-bold uppercase">
                Média consolidada de 4 meses
              </span>
            </div>
          </div>

          {/* Melhor Colaborador */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 border-l-4 border-l-emerald-500 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-gray-400 font-black uppercase tracking-wider">
                Melhor Colaborador
              </span>
              <Award className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <span className="font-sans font-black text-3xl text-emerald-600 block leading-none">
                {melhorNoUltimoMes.name}
              </span>
              <span className="text-[9px] text-emerald-600 font-bold mt-1.5 block uppercase">
                {melhorNoUltimoMes.data[lastMonthIdx].toFixed(1)}% de refugo em Junho
              </span>
            </div>
          </div>

          {/* Colaborador em Alerta */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 border-l-4 border-l-red-500 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-gray-400 font-black uppercase tracking-wider">
                Colaborador em Alerta
              </span>
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <span className="font-sans font-black text-3xl text-red-600 block leading-none">
                {alertaNoUltimoMes.name}
              </span>
              <span className="text-[9px] text-red-600 font-bold mt-1.5 block uppercase">
                {alertaNoUltimoMes.data[lastMonthIdx].toFixed(1)}% de refugo em Junho
              </span>
            </div>
          </div>

          {/* Tendência Geral */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 border-l-4 border-l-cyan-400 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-gray-400 font-black uppercase tracking-wider">
                Tendência Geral (Mai vs Jun)
              </span>
              {tendenciaGeralRefugo === 'melhorando' ? (
                <TrendingDown className="w-5 h-5 text-emerald-500" />
              ) : (
                <TrendingUp className="w-5 h-5 text-red-500" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className={`font-sans font-black text-xl uppercase ${tendenciaGeralRefugo === 'melhorando' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {tendenciaGeralRefugo === 'melhorando' ? '↓ Melhorando' : '↑ Piorando'}
                </span>
              </div>
              <span className="text-[9px] text-gray-400 mt-1.5 block font-bold uppercase">
                Média caiu de {mediaMaio.toFixed(2)}% para {mediaJunho.toFixed(2)}%
              </span>
            </div>
          </div>

        </div>

        {/* Grid para Evolução & Tabela Individual */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Seção 2 — Gráfico de linha (Recharts) */}
          <div className="bg-white border border-gray-200 p-6 rounded-xl lg:col-span-7 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-sans font-black text-xs text-[#032b5e] uppercase tracking-wider">
                    Evolução do % de Refugo por Colaborador
                  </h3>
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Indicadores mensais comparados com o limite regulamentar</span>
                </div>
                <Activity className="w-4 h-4 text-[#032b5e] animate-pulse" />
              </div>

              <div className="h-72 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartDataRefugo} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#94a3b8" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <YAxis 
                      stroke="#94a3b8" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(v) => `${v}%`}
                      domain={[0, 3]}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#ffffff', 
                        borderColor: '#e2e8f0',
                        borderRadius: '8px',
                        color: '#1e293b',
                        fontSize: '11px'
                      }} 
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36} 
                      iconType="circle" 
                      wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
                    />
                    <ReferenceLine 
                      y={1.0} 
                      stroke="#ef4444" 
                      strokeDasharray="4 4" 
                      label={{ 
                        value: 'Meta ≤ 1%', 
                        position: 'top', 
                        fill: '#ef4444', 
                        fontSize: 9, 
                        fontWeight: 'bold' 
                      }} 
                    />
                    {colaboradores.map((colab, idx) => {
                      const colors = ['#f5a623', '#ef4444', '#10b981', '#38bdf8', '#8b5cf6', '#ec4899', '#6366f1'];
                      return (
                        <Line 
                           key={colab.name} 
                           type="monotone" 
                           dataKey={colab.name} 
                           stroke={colors[idx % colors.length]} 
                           strokeWidth={3} 
                           dot={{ r: 4 }} 
                           activeDot={{ r: 6 }} 
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Seção 3 — Tabela individual */}
          <div className="bg-white border border-gray-200 p-6 rounded-xl lg:col-span-5 flex flex-col justify-between shadow-sm">
            <div>
              <h3 className="font-sans font-black text-xs text-[#032b5e] uppercase tracking-wider mb-1">
                Desempenho por Colaborador
              </h3>
              <span className="text-[10px] text-gray-400 font-bold uppercase block mb-4">Acompanhamento individualizado e tendência operacional</span>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-sans text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-400 text-[10px] uppercase font-black tracking-wider">
                      <th className="pb-3 pr-2">Colaborador</th>
                      <th className="pb-3 px-2 text-center">Mar</th>
                      <th className="pb-3 px-2 text-center">Abr</th>
                      <th className="pb-3 px-2 text-center">Mai</th>
                      <th className="pb-3 px-2 text-center">Jun</th>
                      <th className="pb-3 px-2 text-center">Tend.</th>
                      <th className="pb-3 pl-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {colaboradores.map((colab) => {
                      const m3 = colab.data[2];
                      const m4 = colab.data[3];
                      const improved = m4 < m3;
                      const gotWorse = m4 > m3;
                      const isConforme = m4 <= 1.0;

                      return (
                        <tr key={colab.name} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 font-bold text-slate-800 pr-2 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#3b82f6]" />
                            {colab.name}
                          </td>
                          <td className="py-3 px-2 text-center text-gray-400 font-semibold">
                            {colab.data[0].toFixed(1)}%
                          </td>
                          <td className="py-3 px-2 text-center text-gray-400 font-semibold">
                            {colab.data[1].toFixed(1)}%
                          </td>
                          <td className="py-3 px-2 text-center text-gray-400 font-semibold">
                            {colab.data[2].toFixed(1)}%
                          </td>
                          <td className={`py-3 px-2 text-center font-bold rounded-lg ${isConforme ? 'text-emerald-600 bg-emerald-500/5' : 'text-red-600 bg-red-500/5'}`}>
                            {colab.data[3].toFixed(1)}%
                          </td>
                          <td className="py-3 px-2 text-center">
                            {improved ? (
                              <span className="text-emerald-500 font-extrabold" title="Melhorou">↓</span>
                            ) : gotWorse ? (
                              <span className="text-red-500 font-extrabold" title="Piorou">↑</span>
                            ) : (
                              <span className="text-gray-400 font-extrabold" title="Estável">→</span>
                            )}
                          </td>
                          <td className="py-3 pl-2 text-right font-black">
                            {isConforme ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 text-[9px] uppercase border border-emerald-500/25 font-bold">
                                OK
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-600 text-[9px] uppercase border border-red-500/25 font-bold">
                                FORA
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      </div>
      )}

      {activeSubTab === 'boarda3' && (
        <A3BoardComponent user={user} empresa={empresa} dashboard="blitz" />
      )}

      {false && activeSubTab === 'planos' && (
        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm animate-fadeIn">
          <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-4">
            <div>
              <h3 className="font-sans font-black text-xs text-[#032b5e] uppercase tracking-wider flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-[#3b82f6]" /> Plano de Ação Ativo (Mitigação de Refugo)
              </h3>
              <span className="text-[10px] text-gray-400 font-bold uppercase">Controle e status das iniciativas de mitigação das quebras de retornáveis</span>
            </div>
            <span className="px-3 py-1 rounded bg-slate-50 border border-gray-200 text-xs text-slate-700 font-extrabold uppercase">
              5 Ações em Execução
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mt-6">
            {planosDeAcaoRefugo.map((plano) => (
              <div 
                key={plano.id} 
                className="bg-slate-50 border border-gray-200 p-4 rounded-xl flex flex-col justify-between gap-4 hover:border-gray-400 transition-all shadow-sm"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-400 font-black uppercase">
                      Ação #{plano.id}
                    </span>
                    {getStatusBadge(plano.status)}
                  </div>
                  <p className="text-xs font-black text-[#032b5e] leading-relaxed mt-1">
                    {plano.acao}
                  </p>
                </div>

                <div className="pt-3 border-t border-gray-200 flex items-center justify-between text-[10px]">
                  <span className="text-gray-400 font-black uppercase">Responsável:</span>
                  <span className="font-bold text-slate-700 px-2 py-0.5 rounded bg-white border border-gray-200 uppercase">
                    {plano.resp}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
