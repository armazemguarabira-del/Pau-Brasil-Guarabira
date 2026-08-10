import React, { useState } from 'react';
import { Usuario } from '../types';
import { isPanelAllowedForUser } from '../utils/permissions';
import { 
  Users,
  RefreshCw, 
  Trash2, 
  Truck, 
  AlertTriangle, 
  Calendar, 
  Search, 
  Package, 
  ClipboardCheck, 
  Download, 
  ListChecks,
  ChevronRight,
  Database,
  BarChart2,
  Sliders,
  Activity,
  Layers,
  ShieldCheck,
  Clock,
  ClipboardList,
  Upload,
  TrendingUp,
  ShieldAlert,
  Award,
  Zap,
  FileSpreadsheet,
  BookOpen,
  ArrowRight,
  Sparkles,
  Shield,
  Target,
  ExternalLink
} from 'lucide-react';

interface CategoryIndexPanelProps {
  categoryKey: 'cat-produtividade' | 'cat-dashboards' | 'cat-ferramentas-gestao' | 'cat-cadastros' | 'cat-dados-acoes';
  user: Usuario;
  onNavigate: (tabId: string) => void;
  theme?: 'light' | 'dark';
}

export interface ModuleItem {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  badge?: string;
  color: string;
}

export const CATEGORY_DEFINITIONS: Record<
  'cat-produtividade' | 'cat-dashboards' | 'cat-ferramentas-gestao' | 'cat-cadastros' | 'cat-dados-acoes',
  {
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    color: string;
    items: ModuleItem[];
  }
> = {
  'cat-produtividade': {
    title: 'Produtividade',
    subtitle: 'Módulos de apontamento operacional diário do armazém e pátio',
    icon: <Zap className="w-6 h-6 text-amber-400" />,
    color: 'from-amber-500/20 to-transparent',
    items: [
      {
        id: 'ajudante',
        label: 'Operação Ajudante',
        description: 'Apontamento unificado de atividades de Ajudante: Repack, Despejo e Quebras.',
        icon: <Users className="w-5 h-5 text-indigo-400" />,
        badge: 'Ajudantes',
        color: 'border-indigo-500/30 bg-indigo-500/5 hover:border-indigo-500/60'
      },
      {
        id: 'empilhador',
        label: 'Operação Empilhador',
        description: 'Apontamento de atividades de pátio, movimentação e carregamento.',
        icon: <Package className="w-5 h-5 text-amber-400" />,
        badge: 'Pátio',
        color: 'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/60'
      },
      {
        id: 'conferente',
        label: 'Conferente/ADM',
        description: 'Conferência de cargas, validação de minutas, contagem de validade e relatórios.',
        icon: <ClipboardCheck className="w-5 h-5 text-teal-400" />,
        badge: 'Conferência',
        color: 'border-teal-500/30 bg-teal-500/5 hover:border-teal-500/60'
      },
      {
        id: 'wlp-dashboard',
        label: 'Dashboard WLP (HL/HH)',
        description: 'Produtividade Workload Planning, jornadas de trabalho, faturamento diário (21h) e desvios DPO.',
        icon: <Clock className="w-5 h-5 text-amber-400" />,
        badge: 'WLP & DPO',
        color: 'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/60'
      }
    ]
  },
  'cat-dashboards': {
    title: 'Dashboards',
    subtitle: 'Painéis analíticos, BI e métricas em tempo real para tomada de decisão',
    icon: <BarChart2 className="w-6 h-6 text-sky-400" />,
    color: 'from-sky-500/20 to-transparent',
    items: [
      {
        id: 'visao-geral',
        label: 'Workstation (Centro de Controle)',
        description: 'Painel central de controle com visão integrada de movimentação e alertas.',
        icon: <Activity className="w-5 h-5 text-sky-400" />,
        badge: 'Central',
        color: 'border-sky-500/30 bg-sky-500/5 hover:border-sky-500/60'
      },
      {
        id: 'repack-dashboard',
        label: 'Dashboard Repack',
        description: 'Indicadores de produtividade, velocidade cx/h e histórico do Repack.',
        icon: <BarChart2 className="w-5 h-5 text-purple-400" />,
        badge: 'BI Repack',
        color: 'border-purple-500/30 bg-purple-500/5 hover:border-purple-500/60'
      },
      {
        id: 'despejo-dashboard',
        label: 'Dashboard Despejo',
        description: 'Métricas de escoamento de liquido, volumetria e capacidade.',
        icon: <BarChart2 className="w-5 h-5 text-rose-400" />,
        badge: 'BI Despejo',
        color: 'border-rose-500/30 bg-rose-500/5 hover:border-rose-500/60'
      },
      {
        id: 'quebras-dashboard',
        label: 'Dashboard Quebras',
        description: 'Análise de causas de perdas, mapa de calor por turno e setor.',
        icon: <BarChart2 className="w-5 h-5 text-amber-400" />,
        badge: 'BI Perdas',
        color: 'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/60'
      },
      {
        id: 'fefo-dashboard',
        label: 'Dashboard FEFO (Validades)',
        description: 'Curva de envelhecimento de lote, alertas de risco e curva ABC.',
        icon: <BarChart2 className="w-5 h-5 text-emerald-400" />,
        badge: 'BI FEFO',
        color: 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/60'
      },
      {
        id: 'picking-dashboard',
        label: 'Dashboard Operadores',
        description: 'Performance de separadores, conferentes e SLA de atendimento.',
        icon: <BarChart2 className="w-5 h-5 text-amber-400" />,
        badge: 'Operadores',
        color: 'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/60'
      },
      {
        id: 'gestao-capacidade',
        label: 'Gestão de Capacidade & Curva ABC',
        description: 'Layout, Ocupação de Posições, Matriz de Correlação e Curva ABC (Relatório 03.05.19).',
        icon: <Layers className="w-5 h-5 text-emerald-400" />,
        badge: 'Armazém & ABC',
        color: 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/60'
      },
      {
        id: 'ranking-produtividade',
        label: 'Ranking de Produtividade',
        description: 'Gamificação e quadro de destaques do time operacional.',
        icon: <Award className="w-5 h-5 text-amber-400" />,
        badge: 'Gamificação',
        color: 'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/60'
      },
      {
        id: 'wlp-dashboard',
        label: 'Dashboard WLP (HL/HH)',
        description: 'Produtividade Workload Planning, acompanhamento de horas trabalhadas e desvios DPO.',
        icon: <Clock className="w-5 h-5 text-amber-400" />,
        badge: 'WLP & DPO',
        color: 'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/60'
      },
      {
        id: 'qualidade',
        label: 'Qualidade (5S, Temp & Pragas)',
        description: 'Controle sanitário, medição de temperatura e auditorias de 5S.',
        icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
        badge: 'Qualidade',
        color: 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/60'
      },
      {
        id: 'eficiencia-montagem',
        label: 'Eficiência de Montagem',
        description: 'Aderência e padrão de montagem de paletes para expedição.',
        icon: <Zap className="w-5 h-5 text-sky-400" />,
        badge: 'Montagem',
        color: 'border-sky-500/30 bg-sky-500/5 hover:border-sky-500/60'
      },
      {
        id: 'kpi-arvore',
        label: 'KPI em Árvore',
        description: 'Visão em árvore hierárquica para desdobramento de metas DPO.',
        icon: <Activity className="w-5 h-5 text-emerald-400" />,
        badge: 'Árvore KPI',
        color: 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/60'
      }
    ]
  },
  'cat-ferramentas-gestao': {
    title: 'Ferramentas de Gestão',
    subtitle: 'Sistemas de governança, auditoria DPO, inventários e padronização',
    icon: <Sliders className="w-6 h-6 text-purple-400" />,
    color: 'from-purple-500/20 to-transparent',
    items: [
      {
        id: 'plataformas-externas',
        label: 'Plataforma Retorno de Rota, Trocas & Reposições',
        description: 'Ferramentas de Gestão com links de redirecionamento para Plataforma de Retorno de Rota e Plataforma de Trocas e Reposições.',
        icon: <ExternalLink className="w-5 h-5 text-sky-400" />,
        badge: 'Redirecionamentos',
        color: 'border-sky-500/30 bg-sky-500/5 hover:border-sky-500/60'
      },
      {
        id: 'auditoria-dpo',
        label: 'Auditoria DPO (5 Blocos)',
        description: 'Avaliação de maturidade dos 5 blocos operacionais do Pilar Armazém.',
        icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
        badge: 'DPO',
        color: 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/60'
      },
      {
        id: 'treinamentos-qualidade',
        label: 'Treinamentos de Qualidade',
        description: 'Matriz de habilitação e registros de capacitação do time.',
        icon: <Award className="w-5 h-5 text-emerald-400" />,
        badge: 'Capacitação',
        color: 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/60'
      },
      {
        id: 'bloqueio-armazem',
        label: 'Bloqueio no Armazém',
        description: 'Gestão de produtos bloqueados, quarentena e devolução técnica.',
        icon: <ShieldAlert className="w-5 h-5 text-rose-500" />,
        badge: 'Bloqueios',
        color: 'border-rose-500/30 bg-rose-500/5 hover:border-rose-500/60'
      },
      {
        id: 'devolucao',
        label: 'Devolução de Produtos',
        description: 'Processamento de devoluções de rota e tratativa de avarias de cliente.',
        icon: <RefreshCw className="w-5 h-5 text-blue-400" />,
        badge: 'Devoluções',
        color: 'border-blue-500/30 bg-blue-500/5 hover:border-blue-500/60'
      },
      {
        id: 'contagem-inventario',
        label: 'Contagem de Inventário',
        description: 'Rotinas de inventário cíclico e contagem geral de estoque.',
        icon: <ClipboardList className="w-5 h-5 text-purple-400" />,
        badge: 'Inventário',
        color: 'border-purple-500/30 bg-purple-500/5 hover:border-purple-500/60'
      },
      {
        id: 'gestao-ativos',
        label: 'Gestão de Ativos Retornáveis',
        description: 'Controle de vasilhames vazios, caixas plásticas e garrafeiras.',
        icon: <Package className="w-5 h-5 text-amber-500" />,
        badge: 'Ativos',
        color: 'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/60'
      },
      {
        id: 'qualidade-puxada',
        label: 'Qualidade da Puxada',
        description: 'Conferência e checklist de transferência de carretas entre fábricas.',
        icon: <Truck className="w-5 h-5 text-teal-400" />,
        badge: 'Puxada',
        color: 'border-teal-500/30 bg-teal-500/5 hover:border-teal-500/60'
      },
      {
        id: 'gestao-wlp',
        label: 'Gestão do WLP',
        description: 'Nivelamento de carga de trabalho e planejamento de jornada (WLP).',
        icon: <Clock className="w-5 h-5 text-sky-400" />,
        badge: 'WLP',
        color: 'border-sky-500/30 bg-sky-500/5 hover:border-sky-500/60'
      },
      {
        id: 'ciclo-carretas',
        label: 'Ciclo das Carretas',
        description: 'Gestão de TMR, tempo em doca e giro de frotas pesadas.',
        icon: <Truck className="w-5 h-5 text-indigo-400" />,
        badge: 'Frotas',
        color: 'border-indigo-500/30 bg-indigo-500/5 hover:border-indigo-500/60'
      },
      {
        id: 'politica-estoque',
        label: 'Política de Estoque & Análise',
        description: 'Análise de dias de cobertura, estoque mínimo e giro de produtos.',
        icon: <BarChart2 className="w-5 h-5 text-[#1e56f0]" />,
        badge: 'Giro',
        color: 'border-blue-500/30 bg-blue-500/5 hover:border-blue-500/60'
      },
      {
        id: 'simulador-ressuprimento',
        label: 'Simulador de Ressuprimento',
        description: 'Calculadora de reposição baseada na demanda média e lead time.',
        icon: <Truck className="w-5 h-5 text-cyan-400" />,
        badge: 'Simulação',
        color: 'border-cyan-500/30 bg-cyan-500/5 hover:border-cyan-500/60'
      },
      {
        id: 'importacao-contagens',
        label: 'Importação de Contagens',
        description: 'Carregamento em lote de arquivos de inventário físico.',
        icon: <Upload className="w-5 h-5 text-sky-400" />,
        badge: 'Importar',
        color: 'border-sky-500/30 bg-sky-500/5 hover:border-sky-500/60'
      },
      {
        id: 'venda-media',
        label: 'Curva ABC & Venda Média',
        description: 'Motor de cálculo Pareto (80/20) com Venda Média de 3 Meses e sugestões de alocação de Picking.',
        icon: <TrendingUp className="w-5 h-5 text-teal-400" />,
        badge: 'Curva ABC 80/20',
        color: 'border-teal-500/30 bg-teal-500/5 hover:border-teal-500/60'
      },
      {
        id: 'area-contingencia',
        label: 'Área de Contingência',
        description: 'Procedimentos de emergência para quedas de sistema ou pico de safra.',
        icon: <ShieldAlert className="w-5 h-5 text-amber-500" />,
        badge: 'Contingência',
        color: 'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/60'
      },
      {
        id: 'padronizacao-processos',
        label: 'Padronização de Processos (POP)',
        description: 'Biblioteca de Procedimentos Operacionais Padrão e rotinas.',
        icon: <ClipboardList className="w-5 h-5 text-emerald-400" />,
        badge: 'POP',
        color: 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/60'
      },
      {
        id: 'simulacao-acoes',
        label: 'Gestão de Ações & Governança',
        description: 'Acompanhamento do Plano de Ações, Donos e Matriz de Priorização.',
        icon: <Sparkles className="w-5 h-5 text-purple-400" />,
        badge: 'Ações',
        color: 'border-purple-500/30 bg-purple-500/5 hover:border-purple-500/60'
      },
      {
        id: 'dn-swot',
        label: 'DN & Matriz SWOT',
        description: 'Análise de Diagnóstico de Negócio, Forças, Fraquezas e Oportunidades.',
        icon: <FileSpreadsheet className="w-5 h-5 text-emerald-400" />,
        badge: 'Estratégia',
        color: 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/60'
      },
      {
        id: 'controle',
        label: 'Painel Controle',
        description: 'Configurações avançadas da unidade e limites operacionais.',
        icon: <Sliders className="w-5 h-5 text-amber-500" />,
        badge: 'Parâmetros',
        color: 'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/60'
      },
      {
        id: 'dados-retroativos',
        label: 'Dados Retroativos',
        description: 'Ferramenta para reprocessamento de histórico e correções passadas.',
        icon: <Clock className="w-5 h-5 text-amber-400" />,
        badge: 'Ajustes',
        color: 'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/60'
      },
      {
        id: 'agenda-executiva',
        label: 'Agenda Executiva',
        description: 'Compromissos do dia, semana e mês no Workstation Executivo.',
        icon: <Calendar className="w-5 h-5 text-blue-400" />,
        badge: 'Agenda',
        color: 'border-blue-500/30 bg-blue-500/5 hover:border-blue-500/60'
      },
      {
        id: 'diario-bordo',
        label: 'Diário de Bordo',
        description: 'Anotações diárias, treinamentos e lembretes individuais por colaborador.',
        icon: <BookOpen className="w-5 h-5 text-amber-400" />,
        badge: 'Diário',
        color: 'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/60'
      },
      {
        id: 'reunioes',
        label: 'Reuniões e Treinamentos',
        description: 'Gestão de reuniões, treinamentos DPO, Team Room do armazém, trocas de turno e atas em PDF.',
        icon: <Users className="w-5 h-5 text-indigo-400" />,
        badge: 'Treinamentos',
        color: 'border-indigo-500/30 bg-indigo-500/5 hover:border-indigo-500/60'
      },
      {
        id: 'semana-qualidade',
        label: 'Semana da Qualidade',
        description: 'Gestão do evento anual da qualidade, anexos de atas assinadas, materiais e formulários de Check de Retenção.',
        icon: <Award className="w-5 h-5 text-emerald-400" />,
        badge: 'DPO Qualidade',
        color: 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/60'
      }
    ]
  },
  'cat-cadastros': {
    title: 'Cadastros & Governança',
    subtitle: 'Gestão unificada da base mestre de produtos, colaboradores, acessos, metas e planos de ação',
    icon: <Database className="w-6 h-6 text-emerald-400" />,
    color: 'from-emerald-500/20 to-transparent',
    items: [
      {
        id: 'cadastros',
        label: 'Central de Cadastros & Dados-Mestre',
        description: 'Hub unificado para gestão de Produtos, Colaboradores, Permissões de Acesso, Metas Operacionais e Padrões (POP/SOP).',
        icon: <Database className="w-5 h-5 text-emerald-400" />,
        badge: 'Hub Central',
        color: 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/60'
      },
      {
        id: 'exportar',
        label: 'Base de Dados Central (Apagar & Importar)',
        description: 'Gestão da base mestre por processo, expurgo/limpeza de base e importação de planilhas.',
        icon: <Database className="w-5 h-5 text-sky-400" />,
        badge: 'Base Central',
        color: 'border-sky-500/30 bg-sky-500/5 hover:border-sky-500/60'
      },
      {
        id: 'acoes',
        label: 'Gestão de Ações & Governança',
        description: 'Central de acompanhamento de tratativas DPO, criação e liberação de setores operacionais.',
        icon: <ListChecks className="w-5 h-5 text-emerald-400" />,
        badge: 'Ações & Setores',
        color: 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/60'
      },
      {
        id: 'firebase',
        label: 'Status Firestore',
        description: 'Monitoramento da conexão com o banco de dados e sincronização em tempo real.',
        icon: <Database className="w-5 h-5 text-amber-500" />,
        badge: 'Infra',
        color: 'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/60'
      }
    ]
  },
  'cat-dados-acoes': {
    title: 'Cadastros & Governança',
    subtitle: 'Gestão unificada da base mestre de produtos, colaboradores, acessos, metas e planos de ação',
    icon: <Database className="w-6 h-6 text-emerald-400" />,
    color: 'from-emerald-500/20 to-transparent',
    items: [
      {
        id: 'cadastros',
        label: 'Central de Cadastros & Dados-Mestre',
        description: 'Hub unificado para gestão de Produtos, Colaboradores, Permissões de Acesso, Metas Operacionais e Padrões (POP/SOP).',
        icon: <Database className="w-5 h-5 text-emerald-400" />,
        badge: 'Hub Central',
        color: 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/60'
      },
      {
        id: 'exportar',
        label: 'Base de Dados Central (Apagar & Importar)',
        description: 'Gestão da base mestre por processo, expurgo/limpeza de base e importação de planilhas.',
        icon: <Database className="w-5 h-5 text-sky-400" />,
        badge: 'Base Central',
        color: 'border-sky-500/30 bg-sky-500/5 hover:border-sky-500/60'
      },
      {
        id: 'acoes',
        label: 'Gestão de Ações & Governança',
        description: 'Central de acompanhamento de tratativas DPO, criação e liberação de setores operacionais.',
        icon: <ListChecks className="w-5 h-5 text-emerald-400" />,
        badge: 'Ações & Setores',
        color: 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/60'
      },
      {
        id: 'firebase',
        label: 'Status Firestore',
        description: 'Monitoramento da conexão com o banco de dados e sincronização em tempo real.',
        icon: <Database className="w-5 h-5 text-amber-500" />,
        badge: 'Infra',
        color: 'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/60'
      }
    ]
  }
};

export default function CategoryIndexPanel({
  categoryKey,
  user,
  onNavigate,
  theme = 'light'
}: CategoryIndexPanelProps) {
  const [filterText, setFilterText] = useState('');

  const config = CATEGORY_DEFINITIONS[categoryKey] || CATEGORY_DEFINITIONS['cat-produtividade'];

  const visibleItems = config.items.filter(item => {
    const isAllowed = isPanelAllowedForUser(item.id, user);
    if (!isAllowed) return false;
    if (!filterText.trim()) return true;
    const query = filterText.toLowerCase();
    return (
      item.label.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      (item.badge && item.badge.toLowerCase().includes(query))
    );
  });

  return (
    <div className={`space-y-6 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
      {/* Category Header Banner */}
      <div className={`bg-[#111a30] border border-slate-800 rounded-2xl p-6 relative overflow-hidden bg-gradient-to-r ${config.color} shadow-lg`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#0b1222] border border-slate-800 rounded-2xl shadow-inner flex items-center justify-center">
              {config.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-sky-400 bg-sky-500/10 px-2.5 py-0.5 rounded-md border border-sky-500/20">
                  Índice da Categoria
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">
                  {visibleItems.length} Módulo(s) disponível(is)
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight mt-1">
                {config.title}
              </h1>
              <p className="text-xs text-slate-300 font-medium max-w-2xl mt-0.5">
                {config.subtitle}
              </p>
            </div>
          </div>

          {/* Local Filter Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder={`Filtrar em ${config.title}...`}
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full bg-[#0b1222]/90 border border-slate-700/80 text-white text-xs rounded-xl pl-9 pr-3 py-2.5 outline-none focus:border-sky-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Full-Screen Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleItems.length === 0 ? (
          <div className="col-span-full bg-[#111a30] border border-slate-800 rounded-2xl p-12 text-center space-y-3">
            <Search className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-black text-slate-300 uppercase tracking-wide">
              Nenhum módulo encontrado
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Não foram localizados módulos ativos para esta busca ou perfil de usuário. Tente limpar os filtros de pesquisa.
            </p>
          </div>
        ) : (
          visibleItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`text-left bg-[#111a30] border rounded-2xl p-5 space-y-3 relative group transition-all duration-200 cursor-pointer hover:shadow-xl hover:-translate-y-0.5 ${item.color}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="p-2.5 bg-[#0b1222] border border-slate-800 rounded-xl group-hover:border-slate-700 transition-colors">
                  {item.icon}
                </div>

                <div className="flex items-center gap-2">
                  {item.badge && (
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                      {item.badge}
                    </span>
                  )}
                  <div className="p-1.5 bg-[#0b1222] rounded-lg text-slate-400 group-hover:text-white group-hover:bg-sky-600 transition-all">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-tight group-hover:text-sky-400 transition-colors">
                  {item.label}
                </h3>
                <p className="text-xs text-slate-400 font-sans leading-relaxed mt-1 line-clamp-2">
                  {item.description}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <span>Clique para acessar</span>
                <span className="text-sky-400 group-hover:underline flex items-center gap-1 font-mono">
                  Abrir Módulo <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
