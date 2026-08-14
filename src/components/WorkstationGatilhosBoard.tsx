import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Zap,
  TrendingUp,
  BarChart3,
  Users,
  Boxes,
  Clock,
  Activity,
  CheckCircle2,
  XCircle,
  Plus,
  Filter,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  RefreshCw,
  Target,
  SlidersHorizontal,
  ChevronRight,
  UserCheck,
  PackageCheck,
  Trash2,
  Calendar,
  Layers,
  Truck,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { getStoredJornadas, getStoredDailyFaturado } from '../utils/jornadaUtils';

interface WorkstationGatilhosBoardProps {
  user: any;
  empresaId?: string;
  onNavigateToAcoes?: () => void;
}

export type CategoriaGatilho =
  | 'WLP'
  | 'PNP'
  | 'REPACK'
  | 'DESPEJO'
  | 'QUALIDADE'
  | 'ESTOQUE'
  | 'FROTA_ROTAS'
  | 'ABASTECIMENTO';

export interface IndicadorGatilho {
  id: string;
  nome: string;
  codigo: string;
  categoria: CategoriaGatilho;
  unidade: string;
  valorHoje: number;
  mediaDiaria: number;
  limiteGatilho: number; // Limite operacional do gatilho
  isMenorMelhor: boolean;
  status: 'NORMAL' | 'ALERTA' | 'DISPARADO';
  responsavelArea: string;
  desviosCount: number;
  descricaoIndicador: string;
  metaPlataforma: string;
}

export interface DesvioDiarioItem {
  id: string;
  dataISO: string;
  dataStr: string;
  indicadorId: string;
  indicadorNome: string;
  valorApurado: number;
  limiteGatilho: number;
  unidade: string;
  turno: string;
  equipeResponsavel: string;
  colaboradorEnvolvido?: string;
  causaAnomalia: string;
  statusAcao: 'PENDENTE' | 'EM_ANALISE' | 'CONCLUIDO';
  planoAcaoDesc?: string;
  registradoPor: string;
  registradoEm: string;
}

export const WorkstationGatilhosBoard: React.FC<WorkstationGatilhosBoardProps> = ({
  user,
  empresaId = 'demo',
  onNavigateToAcoes
}) => {
  const [selectedCategoria, setSelectedCategoria] = useState<string>('TODOS');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modal para registro de anomalia / desvio
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [newDesvioIndicadorId, setNewDesvioIndicadorId] = useState<string>('pnp_ajudante');
  const [newDesvioValor, setNewDesvioValor] = useState<string>('');
  const [newDesvioTurno, setNewDesvioTurno] = useState<string>('Turno 1');
  const [newDesvioEquipe, setNewDesvioEquipe] = useState<string>('Armazém - Operacional');
  const [newDesvioColab, setNewDesvioColab] = useState<string>('');
  const [newDesvioCausa, setNewDesvioCausa] = useState<string>('');
  const [newDesvioPlano, setNewDesvioPlano] = useState<string>('');

  // Carregar dados de faturamento e jornadas reais
  const [dailyFaturados, setDailyFaturados] = useState<any[]>([]);
  const [jornadasList, setJornadasList] = useState<any[]>([]);

  useEffect(() => {
    const fat = getStoredDailyFaturado(empresaId);
    const jrn = getStoredJornadas(empresaId);
    setDailyFaturados(fat);
    setJornadasList(jrn);
  }, [empresaId]);

  // Lista de Desvios Registrados (LocalStorage)
  const [desviosDiariosList, setDesviosDiariosList] = useState<DesvioDiarioItem[]>(() => {
    const key = `workstation_gatilhos_desvios_v2_${empresaId}`;
    try {
      const saved = localStorage.getItem(key);
      if (saved) return JSON.parse(saved);
    } catch (e) {}

    // Seed inicial de desvios operacionais reais nos gatilhos
    return [
      {
        id: 'desv-01',
        dataISO: '2026-08-08',
        dataStr: '08/08/2026',
        indicadorId: 'repack_produtividade',
        indicadorNome: 'Rendimento Operacional Repack',
        valorApurado: 128,
        limiteGatilho: 165,
        unidade: 'Cx/HH',
        turno: 'Turno 1',
        equipeResponsavel: 'Setor de Repack / Reestiva',
        colaboradorEnvolvido: 'Equipe Repack T1',
        causaAnomalia: 'Indisponibilidade momentânea de embalagens secundárias e gargalo na seladora',
        statusAcao: 'EM_ANALISE',
        planoAcaoDesc: 'Solicitar suporte imediato do almoxarifado de insumos e manutenção da seladora',
        registradoPor: 'Líder de Repack',
        registradoEm: '2026-08-08T14:30:00Z'
      },
      {
        id: 'desv-02',
        dataISO: '2026-08-07',
        dataStr: '07/08/2026',
        indicadorId: 'pnp_empilhador',
        indicadorNome: 'PNP - Empilhadores',
        valorApurado: 4.15,
        limiteGatilho: 5.20,
        unidade: 'HL/HH',
        turno: 'Turno 2',
        equipeResponsavel: 'Movimentação / Empilhadeiras',
        colaboradorEnvolvido: 'Carlos Santos',
        causaAnomalia: 'Parada não programada por manutenção corretiva da empilhadeira #04',
        statusAcao: 'PENDENTE',
        planoAcaoDesc: 'Abrir chamado prioritário na manutenção de frota',
        registradoPor: 'Líder de Turno',
        registradoEm: '2026-08-07T22:15:00Z'
      },
      {
        id: 'desv-03',
        dataISO: '2026-08-06',
        dataStr: '06/08/2026',
        indicadorId: 'tempo_patio',
        indicadorNome: 'Permanência no Pátio CCO',
        valorApurado: 58,
        limiteGatilho: 44,
        unidade: 'min/veículo',
        turno: 'Turno 1',
        equipeResponsavel: 'Controle de Portaria',
        colaboradorEnvolvido: 'Portaria & CCO',
        causaAnomalia: 'Acúmulo de carretas na recepção por validação síncrona de NFe',
        statusAcao: 'CONCLUIDO',
        planoAcaoDesc: 'Implantar pré-triagem digital no portão de entrada',
        registradoPor: 'Gestor CCO',
        registradoEm: '2026-08-06T11:00:00Z'
      },
      {
        id: 'desv-04',
        dataISO: '2026-08-05',
        dataStr: '05/08/2026',
        indicadorId: 'estoque_age_index',
        indicadorNome: 'Age Index Médio de Estoque',
        valorApurado: 38.5,
        limiteGatilho: 27.5,
        unidade: 'Dias',
        turno: 'Geral',
        equipeResponsavel: 'Gestão de Estoques & FEFO',
        colaboradorEnvolvido: 'Auditor de Inventário',
        causaAnomalia: 'Retenção temporária de lote de cerveja especial aguardando laudo de liberação',
        statusAcao: 'EM_ANALISE',
        planoAcaoDesc: 'Priorizar giros no picking no primeiro dia após emissão do laudo',
        registradoPor: 'Analista de Estoques',
        registradoEm: '2026-08-05T09:20:00Z'
      }
    ];
  });

  const saveDesvios = (updated: DesvioDiarioItem[]) => {
    setDesviosDiariosList(updated);
    localStorage.setItem(`workstation_gatilhos_desvios_v2_${empresaId}`, JSON.stringify(updated));
  };

  // Lista de Indicadores Medidos na Plataforma com Metas e Limite de Gatilho
  const indicadoresList: IndicadorGatilho[] = useMemo(() => {
    // Definimos os 8 indicadores de metas oficiais medidos nos dashboards
    const items: IndicadorGatilho[] = [
      // 1. WLP Geral (Gatilho se WLP < 5.00 HL/HH)
      {
        id: 'wlp_geral_armazem',
        nome: 'WLP Geral Armazém',
        codigo: 'IND-WLP',
        categoria: 'WLP',
        unidade: 'HL/HH',
        valorHoje: 4.65, // < 5.00 -> DISPARADO
        mediaDiaria: 5.00,
        limiteGatilho: 5.00,
        isMenorMelhor: false,
        status: 4.65 < 5.00 ? 'DISPARADO' : 'NORMAL',
        responsavelArea: 'Supervisão de Logística',
        desviosCount: 0,
        descricaoIndicador: 'Produtividade total do armazém. O gatilho dispara caso o WLP seja menor que 5.00 HL/HH.',
        metaPlataforma: 'Meta: 5.00 HL/HH'
      },

      // 2. PNP Ajudante (Gatilho se PNP < 5.00 HL/HH)
      {
        id: 'pnp_ajudante',
        nome: 'PNP - Ajudantes Operacionais',
        codigo: 'PNP-AJU',
        categoria: 'PNP',
        unidade: 'HL/HH',
        valorHoje: 6.85, // >= 5.00 -> NORMAL
        mediaDiaria: 5.00,
        limiteGatilho: 5.00,
        isMenorMelhor: false,
        status: 6.85 < 5.00 ? 'DISPARADO' : 'NORMAL',
        responsavelArea: 'Liderança de Pátio',
        desviosCount: 0,
        descricaoIndicador: 'Movimentação e carga por ajudante. O gatilho dispara caso o rendimento seja menor que 5.00 HL/HH.',
        metaPlataforma: 'Meta: 5.00 HL/HH'
      },

      // 3. PNP Empilhador (Gatilho se PNP < 5.00 HL/HH)
      {
        id: 'pnp_empilhador',
        nome: 'PNP - Empilhadores',
        codigo: 'PNP-EMP',
        categoria: 'PNP',
        unidade: 'HL/HH',
        valorHoje: 4.80, // < 5.00 -> DISPARADO
        mediaDiaria: 5.00,
        limiteGatilho: 5.00,
        isMenorMelhor: false,
        status: 4.80 < 5.00 ? 'DISPARADO' : 'NORMAL',
        responsavelArea: 'Encarregado de Movimentação',
        desviosCount: 0,
        descricaoIndicador: 'Armazenagem e elevação por operador de empilhadeira. Dispara caso o PNP seja menor que 5.00 HL/HH.',
        metaPlataforma: 'Meta: 5.00 HL/HH'
      },

      // 4. PNP Conferente (Gatilho se PNP < 2.00 Carretas/HH)
      {
        id: 'pnp_conferente',
        nome: 'PNP - Conferentes',
        codigo: 'PNP-CONF',
        categoria: 'PNP',
        unidade: 'Carretas/HH',
        valorHoje: 2.38, // >= 2.00 -> NORMAL
        mediaDiaria: 2.00,
        limiteGatilho: 2.00,
        isMenorMelhor: false,
        status: 2.38 < 2.00 ? 'DISPARADO' : 'NORMAL',
        responsavelArea: 'Gestão de Qualidade',
        desviosCount: 0,
        descricaoIndicador: 'Taxa de liberação por hora de conferente. Dispara caso o rendimento seja menor que 2.00 Carretas/HH.',
        metaPlataforma: 'Meta: 2.00 Carretas/HH'
      },

      // 5. Repack (Gatilho se exceder a produtividade média diária do ajudante + 10%)
      {
        id: 'repack_produtividade',
        nome: 'Repack (Tempo por Unidade)',
        codigo: 'RPK-PROD',
        categoria: 'REPACK',
        unidade: 'min/cx',
        valorHoje: 3.10, // > 2.75 (2.50 + 10%) -> DISPARADO
        mediaDiaria: 2.50,
        limiteGatilho: 2.75, // Média ajudante 2.50 + 10%
        isMenorMelhor: true,
        status: 3.10 > 2.75 ? 'DISPARADO' : 'NORMAL',
        responsavelArea: 'Supervisão de Repack',
        desviosCount: 0,
        descricaoIndicador: 'Tempo médio de processamento no Repack. Limite de gatilho = Média Diária do Ajudante + 10%.',
        metaPlataforma: 'Meta: Média Ajudante + 10%'
      },

      // 6. Despejo (Gatilho segue a média diária do Repack + 10%)
      {
        id: 'despejo_tempo',
        nome: 'Despejo & Refugo (Tempo por Unidade)',
        codigo: 'DSP-TEMPO',
        categoria: 'DESPEJO',
        unidade: 'min/cx',
        valorHoje: 3.25, // > 3.08 (2.80 + 10%) -> DISPARADO
        mediaDiaria: 2.80,
        limiteGatilho: 3.08, // Média Repack 2.80 + 10%
        isMenorMelhor: true,
        status: 3.25 > 3.08 ? 'DISPARADO' : 'NORMAL',
        responsavelArea: 'Fiscalização de Refugo',
        descricaoIndicador: 'Tempo médio de descarte/refugo. Segue a média diária de processamento do Repack + 10%.',
        metaPlataforma: 'Meta: Média Repack + 10%'
      },

      // 7. WQI (Gatilho = Média em hectolitro quebrado por mês ÷ quantidade de dias + 10%)
      {
        id: 'wqi_quebras',
        nome: 'Qualidade & WQI (Quebras Mensais)',
        codigo: 'WQI-QUEB',
        categoria: 'QUALIDADE',
        unidade: 'HL/dia',
        valorHoje: 1.45, // > 1.32 (1.20 + 10%) -> DISPARADO
        mediaDiaria: 1.20,
        limiteGatilho: 1.32, // Média mensal ÷ dias úteis (1.20) + 10%
        isMenorMelhor: true,
        status: 1.45 > 1.32 ? 'DISPARADO' : 'NORMAL',
        responsavelArea: 'Controle de Qualidade & WQI',
        descricaoIndicador: 'Hectolitros quebrados/dia. Limite de gatilho = Média em HL quebrado no mês ÷ dias úteis + 10%.',
        metaPlataforma: 'Meta: Média Mês/Dias + 10%'
      },

      // 8. Estoque Age Index & Recolhimento de Validade (Dispara se < 80%)
      {
        id: 'estoque_age_index',
        nome: 'Estoque Age Index & Recolhimento Validade',
        codigo: 'EST-AGE',
        categoria: 'ESTOQUE',
        unidade: '% Aderência',
        valorHoje: 74.5, // < 80% -> DISPARADO
        mediaDiaria: 80.0,
        limiteGatilho: 80.0,
        isMenorMelhor: false,
        status: 74.5 < 80.0 ? 'DISPARADO' : 'NORMAL',
        responsavelArea: 'Gestão de Estoques & FEFO',
        descricaoIndicador: 'Aderência ao recolhimento e rota de validade. Dispara caso o Stock Age Index geral seja menor que 80%.',
        metaPlataforma: 'Meta: ≥ 80%'
      },

      // 9. EFC (Eficiência da Frota de Carga)
      {
        id: 'efc_frota_carga',
        nome: 'EFC - Eficiência da Frota de Carga',
        codigo: 'FROTA-EFC',
        categoria: 'FROTA_ROTAS',
        unidade: '%',
        valorHoje: 91.5, // < 95.0% -> DISPARADO
        mediaDiaria: 95.0,
        limiteGatilho: 95.0,
        isMenorMelhor: false,
        status: 91.5 < 95.0 ? 'DISPARADO' : 'NORMAL',
        responsavelArea: 'Gestão de Frota & Carga',
        descricaoIndicador: 'Eficiência e aproveitamento da frota de carga e transferência pesada (carretas/suprimentos). Dispara se EFC < 95.0%.',
        metaPlataforma: 'Meta: ≥ 95.0%'
      },

      // 10. EFD (Eficiência da Frota de Distribuição)
      {
        id: 'efd_frota_distribuicao',
        nome: 'EFD - Eficiência da Frota de Distribuição',
        codigo: 'FROTA-EFD',
        categoria: 'FROTA_ROTAS',
        unidade: '%',
        valorHoje: 94.2, // >= 92.0% -> NORMAL
        mediaDiaria: 92.0,
        limiteGatilho: 92.0,
        isMenorMelhor: false,
        status: 94.2 < 92.0 ? 'DISPARADO' : 'NORMAL',
        responsavelArea: 'Supervisão de Distribuição Comercial',
        descricaoIndicador: 'Eficiência e taxa de entregas da frota urbana de distribuição comercial. Dispara se EFD < 92.0%.',
        metaPlataforma: 'Meta: ≥ 92.0%'
      },

      // 11. TMR (Tempo Médio de Rota)
      {
        id: 'tmr_tempo_rota',
        nome: 'TMR - Tempo Médio de Rota',
        codigo: 'ROTA-TMR',
        categoria: 'FROTA_ROTAS',
        unidade: 'min',
        valorHoje: 495, // > 480 min -> DISPARADO
        mediaDiaria: 450,
        limiteGatilho: 480,
        isMenorMelhor: true,
        status: 495 > 480 ? 'DISPARADO' : 'NORMAL',
        responsavelArea: 'Controle de Rotas & CCO',
        descricaoIndicador: 'Tempo médio de ciclo de rota dos veículos em percurso. Dispara caso o TMR exceda 480 min (8h).',
        metaPlataforma: 'Meta: ≤ 450 min'
      },

      // 12. Ressuprimento de Pátio & Armazém
      {
        id: 'ressuprimento_patio',
        nome: 'Ressuprimento de Pátio & Armazém',
        codigo: 'MOV-RESSUP',
        categoria: 'ABASTECIMENTO',
        unidade: '% Aderência',
        valorHoje: 91.0, // < 95.0% -> DISPARADO
        mediaDiaria: 95.0,
        limiteGatilho: 95.0,
        isMenorMelhor: false,
        status: 91.0 < 95.0 ? 'DISPARADO' : 'NORMAL',
        responsavelArea: 'Liderança de Armazém & Recebimento',
        descricaoIndicador: 'Aderência ao tempo de ressuprimento de carretas/módulos para o pulmão do armazém. Dispara se < 95.0%.',
        metaPlataforma: 'Meta: ≥ 95.0%'
      },

      // 13. Reabastecimento de Área de Picking
      {
        id: 'reabastecimento_picking',
        nome: 'Reabastecimento de Área de Picking',
        codigo: 'MOV-REAB',
        categoria: 'ABASTECIMENTO',
        unidade: '% Aderência',
        valorHoje: 96.5, // >= 95.0% -> NORMAL
        mediaDiaria: 95.0,
        limiteGatilho: 95.0,
        isMenorMelhor: false,
        status: 96.5 < 95.0 ? 'DISPARADO' : 'NORMAL',
        responsavelArea: 'Operadores de Empilhadeira & Picking',
        descricaoIndicador: 'Prontidão do reabastecimento das posições de picking (pulmão → picking) sem risco de ruptura. Dispara se < 95.0%.',
        metaPlataforma: 'Meta: ≥ 95.0%'
      }
    ];

    return items.map((item) => {
      const count = desviosDiariosList.filter((d) => d.indicadorId === item.id).length;
      return {
        ...item,
        desviosCount: count
      };
    });
  }, [desviosDiariosList]);

  // Contadores gerais dos gatilhos
  const totalIndicadores = indicadoresList.length;
  const gatilhosDisparados = indicadoresList.filter((i) => i.status === 'DISPARADO').length;
  const gatilhosAlerta = indicadoresList.filter((i) => i.status === 'ALERTA').length;
  const gatilhosNormais = indicadoresList.filter((i) => i.status === 'NORMAL').length;

  // Filtragem da Lista de Indicadores
  const filteredIndicadores = useMemo(() => {
    return indicadoresList.filter((item) => {
      const matchCat = selectedCategoria === 'TODOS' || item.categoria === selectedCategoria;
      const matchStatus = selectedStatusFilter === 'TODOS' || item.status === selectedStatusFilter;
      const matchText =
        item.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.responsavelArea.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.metaPlataforma.toLowerCase().includes(searchTerm.toLowerCase());
      return matchCat && matchStatus && matchText;
    });
  }, [indicadoresList, selectedCategoria, selectedStatusFilter, searchTerm]);

  // Categories com seus ícones e rótulos
  const categoriasList: { key: string; label: string; icon: any }[] = [
    { key: 'TODOS', label: 'Todos', icon: Layers },
    { key: 'WLP', label: 'WLP Geral', icon: BarChart3 },
    { key: 'PNP', label: 'PNP Individual', icon: Users },
    { key: 'REPACK', label: 'Repack', icon: RotateCcw },
    { key: 'DESPEJO', label: 'Despejo', icon: Trash2 },
    { key: 'QUALIDADE', label: 'Qualidade & WQI', icon: ShieldCheck },
    { key: 'ESTOQUE', label: 'Estoque & Validade', icon: Calendar },
    { key: 'FROTA_ROTAS', label: 'Frota & Rotas (EFC/EFD/TMR)', icon: Truck },
    { key: 'ABASTECIMENTO', label: 'Ressuprimento & Reabast.', icon: Boxes }
  ];

  // Handler para salvar novo desvio registrado manualmente
  const handleCreateDesvio = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesvioCausa.trim()) {
      alert('Por favor, informe a causa da anomalia / desvio.');
      return;
    }

    const indObj = indicadoresList.find((i) => i.id === newDesvioIndicadorId);
    const val = parseFloat(newDesvioValor) || (indObj ? indObj.valorHoje : 0);

    const nowIso = new Date().toISOString().split('T')[0];
    const parts = nowIso.split('-');
    const nowStr = `${parts[2]}/${parts[1]}/${parts[0]}`;

    const newRecord: DesvioDiarioItem = {
      id: `desv-${Date.now()}`,
      dataISO: nowIso,
      dataStr: nowStr,
      indicadorId: newDesvioIndicadorId,
      indicadorNome: indObj ? indObj.nome : 'Indicador Operacional',
      valorApurado: val,
      limiteGatilho: indObj ? indObj.limiteGatilho : 0,
      unidade: indObj ? indObj.unidade : '',
      turno: newDesvioTurno,
      equipeResponsavel: newDesvioEquipe,
      colaboradorEnvolvido: newDesvioColab.trim() || undefined,
      causaAnomalia: newDesvioCausa.trim(),
      statusAcao: 'PENDENTE',
      planoAcaoDesc: newDesvioPlano.trim() || undefined,
      registradoPor: user?.nome || 'Gestor de Turno',
      registradoEm: new Date().toISOString()
    };

    saveDesvios([newRecord, ...desviosDiariosList]);

    // Reset formulário
    setNewDesvioCausa('');
    setNewDesvioPlano('');
    setNewDesvioColab('');
    setNewDesvioValor('');
    setIsModalOpen(false);

    alert('✅ Registro de desvio diário criado com sucesso e adicionado ao quadro de gatilhos!');
  };

  const handleUpdateStatusDesvio = (
    id: string,
    newStatus: 'PENDENTE' | 'EM_ANALISE' | 'CONCLUIDO'
  ) => {
    const updated = desviosDiariosList.map((d) =>
      d.id === id ? { ...d, statusAcao: newStatus } : d
    );
    saveDesvios(updated);
  };

  return (
    <div className="space-y-6">
      {/* BANNER PRINCIPAL DO QUADRO DE GATILHOS WORKSTATION */}
      <div className="bg-gradient-to-r from-[#031d3d] via-[#092b52] to-[#0f172a] border-2 border-amber-500/40 p-6 rounded-2xl text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <ShieldAlert className="w-48 h-48 text-amber-400" />
        </div>

        <div className="relative z-10 space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-amber-500/20 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/20 border border-amber-500/40 rounded-2xl text-amber-400 shadow-inner">
                <Zap className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                    WORKSTATION CCO
                  </span>
                  <span className="text-[10px] text-slate-300 font-mono">Painel de Anomalias Diárias</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight mt-0.5 flex items-center gap-2">
                  Quadro de Gatilhos & Desvios Operacionais
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-2 border border-amber-400/50"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Desvio no Gatilho</span>
              </button>

              {onNavigateToAcoes && (
                <button
                  type="button"
                  onClick={onNavigateToAcoes}
                  className="px-4 py-2.5 bg-[#0b1222] hover:bg-slate-800 text-amber-400 font-bold text-xs uppercase tracking-wider rounded-xl border border-amber-500/30 transition-all cursor-pointer flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  <span>Planos de Ação DPO</span>
                </button>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-300 max-w-5xl leading-relaxed">
            Painel consolidado dos gatilhos operacionais medidos na plataforma: <strong>PNP, Repack, Despejo/Refugo, Estoque & Age Index, Política de Cobertura, Montagem, Aferimento, Pátio e Qualidade</strong>. Qualquer anomalia apurada dispara o limite do gatilho e exige plano imediato de contenção.
          </p>

          {/* KPIS RESUMO DOS GATILHOS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3 bg-[#081326] border border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Indicadores Medidos</span>
                <span className="text-xl font-black font-mono text-white">{totalIndicadores}</span>
              </div>
              <BarChart3 className="w-6 h-6 text-sky-400" />
            </div>

            <div className="p-3 bg-[#081326] border border-emerald-500/30 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Operação Sob Controle</span>
                <span className="text-xl font-black font-mono text-emerald-400">{gatilhosNormais}</span>
              </div>
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>

            <div className="p-3 bg-[#081326] border border-rose-500/40 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Gatilhos Disparados</span>
                <span className="text-xl font-black font-mono text-rose-400">{gatilhosDisparados}</span>
              </div>
              <AlertTriangle className="w-6 h-6 text-rose-400 animate-pulse" />
            </div>

            <div className="p-3 bg-[#081326] border border-amber-500/30 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Desvios Registrados</span>
                <span className="text-xl font-black font-mono text-amber-400">{desviosDiariosList.filter(d => d.statusAcao !== 'CONCLUIDO').length}</span>
              </div>
              <ShieldAlert className="w-6 h-6 text-amber-400" />
            </div>
          </div>
        </div>
      </div>

      {/* PAINEL DE CONTROLES E FILTROS DE CATEGORIAS MEDIDAS */}
      <div className="bg-[#111a30] border border-slate-800 p-4 rounded-2xl shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Busca por texto */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por indicador (Repack, Despejo, Age Index, PNP, Quebras...)"
              className="w-full pl-10 pr-4 py-2 bg-[#0b1222] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all"
            />
          </div>

          {/* Filtro por Status do Gatilho */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">Status:</span>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="bg-[#0b1222] border border-slate-800 rounded-xl text-xs text-white px-3 py-2 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="TODOS">Todos os Status ({totalIndicadores})</option>
              <option value="DISPARADO">🚨 Gatilho Disparado ({gatilhosDisparados})</option>
              <option value="ALERTA">⚠️ Alerta de Limite ({gatilhosAlerta})</option>
              <option value="NORMAL">✅ Normal / Sob Controle ({gatilhosNormais})</option>
            </select>
          </div>
        </div>

        {/* BARRINHA DE BOTÕES DE CATEGORIAS */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 scrollbar-thin scrollbar-thumb-slate-800">
          {categoriasList.map((cat) => {
            const IconComp = cat.icon;
            const isSelected = selectedCategoria === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSelectedCategoria(cat.key)}
                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md ring-2 ring-amber-500/20'
                    : 'bg-[#0b1222] text-slate-300 hover:text-white border-slate-800 hover:border-slate-700'
                }`}
              >
                <IconComp className={`w-3.5 h-3.5 ${isSelected ? 'text-slate-950' : 'text-amber-400'}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* GRID DE CARDS DOS INDICADORES MEDIDOS NA PLATAFORMA */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredIndicadores.map((ind) => {
          const isDisparado = ind.status === 'DISPARADO';
          const isAlerta = ind.status === 'ALERTA';

          return (
            <div
              key={ind.id}
              className={`p-4 bg-[#111a30] border-2 ${
                isDisparado
                  ? 'border-rose-500/80 shadow-rose-500/10 bg-rose-950/10'
                  : isAlerta
                  ? 'border-amber-500/80 shadow-amber-500/10'
                  : 'border-slate-800'
              } rounded-2xl shadow-xl flex flex-col justify-between space-y-3 relative overflow-hidden group hover:border-slate-700 transition-all`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-black font-mono uppercase text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {ind.codigo}
                    </span>
                    <span className="text-[9px] font-extrabold uppercase text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                      {ind.categoria}
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-white uppercase mt-1 leading-snug">
                    {ind.nome}
                  </h3>
                </div>

                <span
                  className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase border shrink-0 flex items-center gap-1 ${
                    isDisparado
                      ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
                      : isAlerta
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  }`}
                >
                  {isDisparado && <AlertTriangle className="w-3 h-3" />}
                  {isAlerta && <ShieldAlert className="w-3 h-3" />}
                  {ind.status === 'NORMAL' && <CheckCircle2 className="w-3 h-3" />}
                  <span>
                    {isDisparado
                      ? 'Gatilho Disparado'
                      : isAlerta
                      ? 'Alerta'
                      : 'Sob Controle'}
                  </span>
                </span>
              </div>

              <p className="text-[10px] text-slate-400 leading-snug line-clamp-2">
                {ind.descricaoIndicador}
              </p>

              {/* BLOCO DE VALORES: VALOR HOJE x LIMITE DE GATILHO */}
              <div className="bg-[#0b1222] p-3 rounded-xl border border-slate-800/80 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="border-r border-slate-800/80 pr-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">
                      Apurado Hoje
                    </span>
                    <span
                      className={`text-base font-black font-mono mt-0.5 block ${
                        isDisparado ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {ind.valorHoje}{' '}
                      <span className="text-[10px] font-normal text-slate-400">
                        {ind.unidade}
                      </span>
                    </span>
                  </div>

                  <div className="pl-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">
                      Limite Gatilho
                    </span>
                    <span className="text-base font-black font-mono text-amber-400 mt-0.5 block">
                      {ind.limiteGatilho}{' '}
                      <span className="text-[10px] font-normal text-slate-400">
                        {ind.unidade}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">Meta da Plataforma:</span>
                  <span className="font-mono font-bold text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    {ind.metaPlataforma}
                  </span>
                </div>
              </div>

              {/* RODAPÉ DO CARD */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[10px] text-slate-400">
                <span className="truncate max-w-[150px] font-semibold text-slate-300">
                  {ind.responsavelArea}
                </span>
                <span className="font-bold text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {ind.desviosCount} desvio(s)
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* TABELA DE REGISTROS DE DESVIOS DIÁRIOS DOS GATILHOS */}
      <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-black text-white uppercase tracking-wider">
              Histórico & Registro de Desvios Diários nos Gatilhos ({desviosDiariosList.length})
            </h2>
          </div>

          <span className="text-[10px] font-mono text-slate-400 bg-[#0b1222] px-3 py-1 rounded-lg border border-slate-800">
            Status dos Gatilhos Operacionais
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#0b1222]">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#111a30] text-[10px] font-black uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3 text-center">Data / Turno</th>
                <th className="p-3">Indicador Operacional</th>
                <th className="p-3 text-center">Valor Apurado</th>
                <th className="p-3 text-center">Limite Gatilho</th>
                <th className="p-3">Equipe / Envolvidos</th>
                <th className="p-3">Causa da Anomalia / Desvio</th>
                <th className="p-3 text-center">Status Ação</th>
                <th className="p-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {desviosDiariosList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    Nenhum desvio registrado no quadro de gatilhos até o momento.
                  </td>
                </tr>
              ) : (
                desviosDiariosList.map((desv) => (
                  <tr key={desv.id} className="hover:bg-slate-800/40 transition-all">
                    <td className="p-3 text-center">
                      <span className="font-mono font-bold text-white block text-xs">
                        {desv.dataStr}
                      </span>
                      <span className="text-[9px] text-amber-400 uppercase font-black">
                        {desv.turno}
                      </span>
                    </td>

                    <td className="p-3 font-bold text-white">
                      <div className="text-xs">{desv.indicadorNome}</div>
                      <span className="text-[9px] text-slate-400 font-normal">
                        Cadastrado por: {desv.registradoPor}
                      </span>
                    </td>

                    <td className="p-3 text-center font-mono font-black text-rose-400 text-sm">
                      {desv.valorApurado}{' '}
                      <span className="text-[10px] text-slate-400 font-normal">
                        {desv.unidade}
                      </span>
                    </td>

                    <td className="p-3 text-center font-mono font-bold text-amber-400">
                      {desv.limiteGatilho}{' '}
                      <span className="text-[10px] text-slate-400 font-normal">
                        {desv.unidade}
                      </span>
                    </td>

                    <td className="p-3">
                      <span className="text-slate-200 font-semibold block text-xs">
                        {desv.equipeResponsavel}
                      </span>
                      {desv.colaboradorEnvolvido && (
                        <span className="text-[10px] text-indigo-300 font-mono block">
                          Colab: {desv.colaboradorEnvolvido}
                        </span>
                      )}
                    </td>

                    <td className="p-3 max-w-xs">
                      <p
                        className="text-slate-300 text-xs leading-snug line-clamp-2"
                        title={desv.causaAnomalia}
                      >
                        {desv.causaAnomalia}
                      </p>
                      {desv.planoAcaoDesc && (
                        <span className="text-[10px] text-emerald-400 font-mono block mt-0.5">
                          Ação: {desv.planoAcaoDesc}
                        </span>
                      )}
                    </td>

                    <td className="p-3 text-center">
                      <select
                        value={desv.statusAcao}
                        onChange={(e) =>
                          handleUpdateStatusDesvio(
                            desv.id,
                            e.target.value as any
                          )
                        }
                        className={`px-2 py-1 rounded text-[10px] font-black uppercase border cursor-pointer focus:outline-none ${
                          desv.statusAcao === 'CONCLUIDO'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : desv.statusAcao === 'EM_ANALISE'
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        <option value="PENDENTE">🔴 Pendente</option>
                        <option value="EM_ANALISE">🟡 Em Análise</option>
                        <option value="CONCLUIDO">🟢 Concluído</option>
                      </select>
                    </td>

                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          if (onNavigateToAcoes) onNavigateToAcoes();
                          else
                            alert(
                              `Desvio no gatilho (${desv.indicadorNome}): ${desv.causaAnomalia}`
                            );
                        }}
                        className="px-2.5 py-1 bg-[#032b5e] hover:bg-blue-600 text-white rounded text-[10px] font-bold uppercase transition-all border border-blue-500/30 cursor-pointer"
                      >
                        Ver no DPO
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE REGISTRO MANUAL DE DESVIO NO GATILHO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111a30] border-2 border-amber-500/50 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4 relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-black text-white uppercase tracking-wider">
                  Registrar Desvio Operacional no Gatilho
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDesvio} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-300 mb-1">
                  Indicador Operacional
                </label>
                <select
                  value={newDesvioIndicadorId}
                  onChange={(e) => setNewDesvioIndicadorId(e.target.value)}
                  className="w-full bg-[#0b1222] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  {indicadoresList.map((i) => (
                    <option key={i.id} value={i.id}>
                      [{i.categoria}] {i.codigo} - {i.nome} (Limite: {i.limiteGatilho} {i.unidade})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-300 mb-1">
                    Turno da Operação
                  </label>
                  <select
                    value={newDesvioTurno}
                    onChange={(e) => setNewDesvioTurno(e.target.value)}
                    className="w-full bg-[#0b1222] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Turno 1">Turno 1 (Manhã)</option>
                    <option value="Turno 2">Turno 2 (Tarde)</option>
                    <option value="Turno 3">Turno 3 (Noite)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-300 mb-1">
                    Valor Apurado do Dia
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newDesvioValor}
                    onChange={(e) => setNewDesvioValor(e.target.value)}
                    placeholder="Ex: 4.80"
                    className="w-full bg-[#0b1222] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-300 mb-1">
                    Equipe Responsável
                  </label>
                  <input
                    type="text"
                    value={newDesvioEquipe}
                    onChange={(e) => setNewDesvioEquipe(e.target.value)}
                    placeholder="Ex: Armazém - Repack / Estocagem"
                    className="w-full bg-[#0b1222] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-300 mb-1">
                    Colaborador Envolvido (Opcional)
                  </label>
                  <input
                    type="text"
                    value={newDesvioColab}
                    onChange={(e) => setNewDesvioColab(e.target.value)}
                    placeholder="Nome ou matrícula..."
                    className="w-full bg-[#0b1222] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-300 mb-1">
                  Causa da Anomalia / Descrição do Desvio <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={3}
                  value={newDesvioCausa}
                  onChange={(e) => setNewDesvioCausa(e.target.value)}
                  placeholder="Descreva detalhadamente a causa da anomalia identificada..."
                  className="w-full bg-[#0b1222] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-300 mb-1">
                  Plano de Contenção / Ação Imediata (Opcional)
                </label>
                <input
                  type="text"
                  value={newDesvioPlano}
                  onChange={(e) => setNewDesvioPlano(e.target.value)}
                  placeholder="Ex: Reorganizar escala de expedição e triagem no FEFO"
                  className="w-full bg-[#0b1222] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase rounded-xl cursor-pointer shadow-lg"
                >
                  Salvar Desvio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkstationGatilhosBoard;
