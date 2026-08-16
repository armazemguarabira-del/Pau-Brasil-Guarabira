import React, { useState, useEffect } from 'react';
import { Users, Calendar, CheckCircle2, Clock, Search, Filter, FileText, Check, Sparkles } from 'lucide-react';
import { normalizeCollaboratorName } from '../utils/colaboradorUtils';

export interface PresencaReuniaoRecord {
  id: string;
  dataISO: string;
  dataFormatted: string;
  nomeReuniao: string;
  tipo: 'RDP (Diária)' | 'RPS (Semanal)' | 'RMR (Mensal)' | 'Treinamento Operacional' | 'Comitê 5S' | 'Diálogo de Segurança (DDS)';
  pauta: string;
  condutor: string;
  colaboradoresPresentes: string[]; // Nomes normalizados ou matrículas
  duracaoMin: number;
}

const DEFAULT_REUNIOES_PRESENCA: PresencaReuniaoRecord[] = [
  {
    id: 'reu-01',
    dataISO: '2026-08-16',
    dataFormatted: '16/08/2026',
    nomeReuniao: 'RDP — Reunião Diária de Produtividade & FEFO',
    tipo: 'RDP (Diária)',
    pauta: 'Alinhamento de metas de montagem do turno, priorização de lotes com validade ≤ 15 dias e checklist pré-uso de empilhadeiras.',
    condutor: 'Supervisor de Armazém',
    colaboradoresPresentes: [
      'MARIVALDO ARTUR ALVES', 'JOSE RONILDO DA SILVA', 'PAULO PEREIRA DA SILVA',
      'DIOGENES PEREIRA DA SILVA', 'DJEANDERSON SILVA', 'CARLOS SANTOS', 'PEDRO HENRIQUE'
    ],
    duracaoMin: 15
  },
  {
    id: 'reu-02',
    dataISO: '2026-08-14',
    dataFormatted: '14/08/2026',
    nomeReuniao: 'DDS & Treinamento de Ergonomia e Movimentação Segura',
    tipo: 'Diálogo de Segurança (DDS)',
    pauta: 'Boas práticas na paletização de caixas pesadas, amarração de segurança de palete e prevenção de avarias em curva.',
    condutor: 'Técnico de Segurança / Líder DPO',
    colaboradoresPresentes: [
      'MARIVALDO ARTUR ALVES', 'JOSE RONILDO DA SILVA', 'PAULO PEREIRA DA SILVA',
      'DIOGENES PEREIRA DA SILVA', 'LUCAS OLIVEIRA', 'MARCOS SILVA'
    ],
    duracaoMin: 20
  },
  {
    id: 'reu-03',
    dataISO: '2026-08-10',
    dataFormatted: '10/08/2026',
    nomeReuniao: 'RPS — Reunião Semanal de Indicadores & 5S',
    tipo: 'RPS (Semanal)',
    pauta: 'Apresentação dos resultados da semana anterior (PNP, Repack, Avarias), revisão do quadro de 5S das 14 áreas e plano de ação.',
    condutor: 'Gerente de Logística & Qualidade',
    colaboradoresPresentes: [
      'MARIVALDO ARTUR ALVES', 'JOSE RONILDO DA SILVA', 'PAULO PEREIRA DA SILVA',
      'DIOGENES PEREIRA DA SILVA', 'DJEANDERSON SILVA'
    ],
    duracaoMin: 30
  }
];

interface ListaPresencaReunioesProps {
  user: any;
  roleName?: string;
}

export const ListaPresencaReunioes: React.FC<ListaPresencaReunioesProps> = ({
  user,
  roleName = 'Colaborador'
}) => {
  const [reunioes, setReunioes] = useState<PresencaReuniaoRecord[]>(() => {
    try {
      const saved = localStorage.getItem('lista_presencas_reunioes_operacao');
      if (saved) return JSON.parse(saved);
      return DEFAULT_REUNIOES_PRESENCA;
    } catch {
      return DEFAULT_REUNIOES_PRESENCA;
    }
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('TODAS');

  const userName = (user?.nome || '').trim().toUpperCase();
  const userNameFirst = userName.split(' ')[0] || '';

  // Confirmar Presença do Colaborador
  const handleConfirmarPresenca = (reuniaoId: string) => {
    const updated = reunioes.map(r => {
      if (r.id === reuniaoId) {
        const jaPresente = r.colaboradoresPresentes.some(
          p => p.toUpperCase().includes(userNameFirst) || userName.includes(p.toUpperCase())
        );
        if (!jaPresente) {
          return {
            ...r,
            colaboradoresPresentes: [...r.colaboradoresPresentes, user?.nome || 'Colaborador']
          };
        }
      }
      return r;
    });

    setReunioes(updated);
    localStorage.setItem('lista_presencas_reunioes_operacao', JSON.stringify(updated));
    alert('✅ Presença confirmada na reunião com sucesso!');
  };

  const filteredReunioes = reunioes.filter(r => {
    const matchSearch = r.nomeReuniao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        r.pauta.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        r.condutor.toLowerCase().includes(searchTerm.toLowerCase());
    const matchFilter = selectedFilter === 'TODAS' || r.tipo === selectedFilter;
    return matchSearch && matchFilter;
  });

  // Estatísticas de Presença do Usuário
  const totalReunioes = reunioes.length;
  const reunioesParticipadas = reunioes.filter(r => 
    r.colaboradoresPresentes.some(p => p.toUpperCase().includes(userNameFirst) || userName.includes(p.toUpperCase()))
  ).length;

  const taxaPresenca = totalReunioes > 0 ? Math.round((reunioesParticipadas / totalReunioes) * 100) : 100;

  return (
    <div className="space-y-6">
      
      {/* BANNER PRINCIPAL DE LISTA DE PRESENÇA */}
      <div className="bg-[#111a30] border border-indigo-500/30 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-3 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-indigo-400 shrink-0">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                GUIA DE PRESENÇA OPERACIONAL
              </span>
              <span className="text-[10px] text-slate-300 font-mono">Registro de Rituais DPO</span>
            </div>
            <h2 className="text-lg font-black text-white mt-1 uppercase tracking-tight">
              Lista de Presença nas Reuniões ({user?.nome || 'Operador'})
            </h2>
            <p className="text-xs text-slate-300 leading-snug max-w-2xl">
              Histórico e confirmação de presença nas reuniões matinais (RDP), semanais (RPS), comitês de 5S e diálogos de segurança participados.
            </p>
          </div>
        </div>

        {/* KPI DE PRESENÇA */}
        <div className="bg-[#0b1222] border border-indigo-500/30 p-3 rounded-xl flex items-center gap-4 shrink-0">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Sua Frequência</span>
            <span className="text-xl font-black font-mono text-indigo-400">{taxaPresenca}% Presença</span>
          </div>
          <div className="text-right border-l border-slate-800 pl-4">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Participações</span>
            <span className="text-base font-black font-mono text-emerald-400">{reunioesParticipadas} / {totalReunioes} Rituais</span>
          </div>
        </div>
      </div>

      {/* FILTROS E BUSCA */}
      <div className="bg-[#111a30] border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-lg">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar reunião, pauta ou condutor..."
            className="w-full pl-9 pr-4 py-2 bg-[#0b1222] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedFilter}
            onChange={e => setSelectedFilter(e.target.value)}
            className="bg-[#0b1222] border border-slate-800 rounded-xl text-xs text-white px-3 py-2 focus:outline-none focus:border-indigo-500"
          >
            <option value="TODAS">Todos os Tipos</option>
            <option value="RDP (Diária)">RDP (Diária)</option>
            <option value="RPS (Semanal)">RPS (Semanal)</option>
            <option value="Diálogo de Segurança (DDS)">Diálogo de Segurança (DDS)</option>
            <option value="Treinamento Operacional">Treinamento Operacional</option>
            <option value="Comitê 5S">Comitê 5S</option>
          </select>
        </div>
      </div>

      {/* LISTA DE REUNIÕES */}
      <div className="space-y-3">
        {filteredReunioes.map((reu) => {
          const isPresente = reu.colaboradoresPresentes.some(
            p => p.toUpperCase().includes(userNameFirst) || userName.includes(p.toUpperCase())
          );

          return (
            <div
              key={reu.id}
              className={`p-4 bg-[#111a30] border rounded-2xl shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${
                isPresente ? 'border-emerald-500/40 bg-emerald-950/10' : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                    {reu.tipo}
                  </span>
                  <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" /> {reu.dataFormatted}
                  </span>
                  <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" /> {reu.duracaoMin} min
                  </span>
                </div>

                <h3 className="text-sm font-black text-white">{reu.nomeReuniao}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{reu.pauta}</p>

                <div className="text-[11px] text-slate-400 pt-1 flex items-center gap-3">
                  <span><strong>Condutor:</strong> {reu.condutor}</span>
                  <span>•</span>
                  <span><strong>Quórum:</strong> {reu.colaboradoresPresentes.length} colaboradores presentes</span>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-3">
                {isPresente ? (
                  <div className="px-3.5 py-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Presença Confirmada</span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleConfirmarPresenca(reu.id)}
                    className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Confirmar Minha Presença</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {filteredReunioes.length === 0 && (
          <div className="p-8 text-center text-slate-500 bg-[#111a30] rounded-2xl border border-slate-800">
            Nenhuma reunião encontrada com o filtro selecionado.
          </div>
        )}
      </div>
    </div>
  );
};
export default ListaPresencaReunioes;
