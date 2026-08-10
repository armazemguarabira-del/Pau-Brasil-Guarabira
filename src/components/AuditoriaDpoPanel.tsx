import { ManualInstrucaoCard } from './ManualInstrucaoCard';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, 
  Award, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Layers, 
  FileText, 
  Save, 
  TrendingUp, 
  Clock, 
  Check, 
  Calendar,
  User,
  Zap,
  ArrowRight,
  ExternalLink,
  Filter,
  CheckSquare,
  Square,
  HelpCircle,
  Package,
  Layers3,
  BarChart3,
  ListCheck
} from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { Usuario, Empresa } from '../types';
import { useEmpresaData } from '../context/EmpresaDataContext';
import { getAcoesAll, saveAcoes, AcaoCorretiva } from '../utils/simulacaoAcoesUtils';

interface AuditoriaDpoPanelProps {
  user: Usuario;
  empresa?: Empresa | null;
  theme?: 'light' | 'dark';
  onNavigate?: (panel: string) => void;
}

export interface DpoQuestion {
  id: string;
  blocoId: number;
  blocoNome: string;
  itemCode: string;
  titulo: string;
  descricao: string;
  criterio3: string;
  criterio1: string;
  criterio0: string;
  indicadoresPlataforma: string[];
  panelLink?: string;
  navLabel?: string;
  autoMetricKey?: string;
}

export const DPO_QUESTIONS: DpoQuestion[] = [
  // =========================================================================
  // BLOCO 1: LAYOUT E CAPACIDADE
  // =========================================================================
  {
    id: 'Q1.1',
    blocoId: 1,
    blocoNome: '1. Layout e Capacidade',
    itemCode: '1.1',
    titulo: '1.1 Otimização do Layout & Ressuprimento de Picking',
    descricao: 'POP e RACI de reabastecimento no picking, alocação clara de zonas com gerenciamento visual, armazenamento seguro e IV de ocorrências de reabastecimento após carregamento.',
    criterio3: 'POP/RACI ativo, zonas 100% sinalizadas, IV de reabastecimento monitorado diariamente e plano de ação em vigor.',
    criterio1: 'Verificações de layout atendidas parcialmente, mas com lacunas no IV de reabastecimento ou plano de ação.',
    criterio0: 'Sem POP/RACI de reabastecimento ou zonas sem sinalização visual.',
    indicadoresPlataforma: [
      'Ressuprimento Manual (Abastecimento Turno A)',
      'Ressuprimento Inteligente (Reabastecimento Turno B)',
      'Histograma de Ocorrências no Carregamento',
      'POP & RACI de Armazenagem'
    ],
    panelLink: 'simulador-ressuprimento',
    navLabel: 'Ver Ressuprimento & Layout'
  },
  {
    id: 'Q1.2',
    blocoId: 1,
    blocoNome: '1. Layout e Capacidade',
    itemCode: '1.2',
    titulo: '1.2 O Layout Reflete a Curva ABC',
    descricao: 'Análise da Curva ABC usada para preparar o layout de estoque, marketplace, picking e pulmão na frequência correta e medição de adesão ao padrão ABC (%).',
    criterio3: 'Curva ABC 100% aplicada no layout do picking/pulmão, matriz de correlação atualizada e adesão ao padrão ABC % monitorada.',
    criterio1: 'Curva ABC parcialmente aplicada com desvios pontuais em produtos da Curva C.',
    criterio0: 'Layout sem alinhamento com a Curva ABC ou ausência de medição de adesão.',
    indicadoresPlataforma: [
      'Matriz de Blocos (Bloco A/B/CB/C) x Curva ABC',
      'Índice de Adesão ao Padrão ABC (%)',
      'Painel de Posição de Produtos por Curva'
    ],
    panelLink: 'politica-estoque',
    navLabel: 'Ver Política de Estoque ABC'
  },
  {
    id: 'Q1.3',
    blocoId: 1,
    blocoNome: '1. Layout e Capacidade',
    itemCode: '1.3',
    titulo: '1.3 Gestão de Capacidade do Armazém',
    descricao: 'Participação das equipes no KICKOFF de volume, monitoramento de Out/Over/OOR, política de estoque para SKUs de demanda realizada, utilização de capacidade (%) e % Furo de Puxada.',
    criterio3: 'Capacidade e ocupação estática calculadas, indicadores OOR/Overstock monitorados com planos de ação e Furo de Puxada % dentro da meta.',
    criterio1: 'Capacidade monitorada mas com lacunas no registro de planos de ação periódicos.',
    criterio0: 'Sem controle de capacidade ou ausência de acompanhamento de OOR/Overstock.',
    indicadoresPlataforma: [
      'Taxa de Ocupação de Pallets (% Ocupação PA & AG)',
      'Indicadores Out/Over/OOR (Overstock & Out of Range)',
      '% Furo de Puxada & Justificativas'
    ],
    panelLink: 'gestao-capacidade',
    navLabel: 'Ver Gestão de Capacidade'
  },

  // =========================================================================
  // BLOCO 2: QUALIDADE
  // =========================================================================
  {
    id: 'Q2.1',
    blocoId: 2,
    blocoNome: '2. Qualidade',
    itemCode: '2.1',
    titulo: '2.1 Treinamentos de Qualidade',
    descricao: 'Treinamento de capacitação em qualidade abordando validade, FEFO, manuseio, integridade, temperatura e Semana da Qualidade semestral (Plano Verão) para 100% da equipe.',
    criterio3: '100% da equipe treinada com atas assinadas, Semana da Qualidade realizada e pauta de qualidade ativa no Team Room.',
    criterio1: 'Entre 85% e 99% da equipe treinada ou falhas pontuais no registro de evidências.',
    criterio0: 'Menos de 85% dos colaboradores treinados ou não realização da Semana da Qualidade.',
    indicadoresPlataforma: [
      'Atas de Capacitação em Qualidade (100% Logística)',
      'Registro da Semana da Qualidade / Plano Verão',
      'Matriz de Treinamentos Logística'
    ],
    panelLink: 'qualidade',
    navLabel: 'Ver Painel de Qualidade'
  },
  {
    id: 'Q2.2',
    blocoId: 2,
    blocoNome: '2. Qualidade',
    itemCode: '2.2',
    titulo: '2.2 Padrões Globais de Qualidade',
    descricao: 'Inspeção de limpeza do armazém, controle quinzenal de pragas (bug zapper), segregação de químicos/óleos e registro diário de temperatura do armazém/pulmão com LUP.',
    criterio3: 'Controle de pragas quinzenal em dia, segregação total de químicos, temperatura registrada diariamente com LUP e 5S ≥ 90%.',
    criterio1: 'Padrões atendidos mas com pequenas falhas de registro diário de temperatura.',
    criterio0: 'Falha no controle quinzenal de pragas ou descontrole de temperatura.',
    indicadoresPlataforma: [
      'Controle Diário de Temperatura (°C Armazém & Pulmão)',
      'Checklist Quinzenal de Pragas (Bug Zapper)',
      'Ronda GSA & 5S Workstation'
    ],
    panelLink: 'ronda-gsa',
    navLabel: 'Ver Ronda GSA & Temperatura'
  },
  {
    id: 'Q2.3',
    blocoId: 2,
    blocoNome: '2. Qualidade',
    itemCode: '2.3',
    titulo: '2.3 Gestão de Validade',
    descricao: '100% dos paletes identificados com NRI (3 lados) incluindo chopp, acompanhamento FEFO Estoque x Picking e Rua x Rua, Índice de Idade de estoque e rotina semanal RLP (Logística e Vendas).',
    criterio3: '100% NRI nos 3 lados, acompanhamento FEFO diário com ações, Idade de estoque dentro da meta e RLP semanal em dia.',
    criterio1: 'FEFO monitorado mas com falhas pontuais na identificação NRI ou rotina RLP.',
    criterio0: 'Presença de paletes sem NRI ou falta de acompanhamento FEFO.',
    indicadoresPlataforma: [
      'Gestão FEFO Estoque x Picking & Estoque x Estoque',
      'Identificação NRI nos 3 Lados (% Conformidade)',
      'Stock Age Index % & Estratificação de Validades',
      'Matriz RLP (Rotina Semanal Logística + Vendas)'
    ],
    panelLink: 'fefo-validades',
    navLabel: 'Ver FEFO & Validades'
  },
  {
    id: 'Q2.4',
    blocoId: 2,
    blocoNome: '2. Qualidade',
    itemCode: '2.4',
    titulo: '2.4 Políticas de Bloqueio no Armazém',
    descricao: 'Produtos não conformes bloqueados física e sistemicamente (KPI Falha de Bloqueio = 0), limite de 30 dias para destruição/destinação e área segregada (PNC, despejo, retrabalho, Repack com trava/cadeado).',
    criterio3: 'Zero falhas de bloqueio, destruição em < 30 dias, áreas segregadas/fechadas com cadeado/fita e conciliação de devolução/PNC em dia.',
    criterio1: 'Itens bloqueados identificados mas com pendências de liberação/descarte entre 30 e 45 dias.',
    criterio0: 'Produto não conforme misturado com estoque bom ou bloqueado > 45 dias.',
    indicadoresPlataforma: [
      'KPI Falha de Bloqueio (Zero Desvios)',
      'Tempo de Permanência Bloqueado (Limite 30 Dias)',
      'Segregação Física PNC, Despejo & Repack'
    ],
    panelLink: 'quebras-dashboard',
    navLabel: 'Ver Painel de Bloqueios & PNC'
  },
  {
    id: 'Q2.5',
    blocoId: 2,
    blocoNome: '2. Qualidade',
    itemCode: '2.5',
    titulo: '2.5 Políticas de Devolução e Qualidade',
    descricao: 'Políticas de devolução/destruição expostas na área, devoluções por qualidade armazém rastreadas, inspeção de lacres em barris devolvidos e proibição total de reembalagem de devoluções por qualidade.',
    criterio3: 'Todas as devoluções bloqueadas e analisadas, lacres de barris 100% inspecionados e setor de devolução definido.',
    criterio1: 'Devoluções tratadas mas sem quadro de RACI/LUP exposto na área.',
    criterio0: 'Nenhuma política de devolução ativa ou reembalagem indevida de produtos devolvidos.',
    indicadoresPlataforma: [
      'Registro de Devoluções por Qualidade Armazém',
      'Inspeção de Lacres em Barris Devolvidos',
      'Matriz de Criticidade de Comunicação de Devoluções'
    ],
    panelLink: 'qualidade',
    navLabel: 'Ver Devoluções & Qualidade'
  },

  // =========================================================================
  // BLOCO 3: ACURACIDADE
  // =========================================================================
  {
    id: 'Q3.1',
    blocoId: 3,
    blocoNome: '3. Acuracidade',
    itemCode: '3.1',
    titulo: '3.1 Pacote Prejuízo',
    descricao: 'Explicação de perdas por motivos (quebras, erros de programação, shelf, PA, AG, refugos), monitoramento dos KPIs WQI, FGLI (HL perdido), SCL (Pacote Prejuízo R$/HL) e VLC/HL na revisão financeira.',
    criterio3: 'Perdas estratificadas por motivo, WQI/FGLI/SCL dentro da meta, VLC/HL monitorado e plano de ação dos últimos 4 meses em vigor.',
    criterio1: 'Perdas relatadas nos KPIs mas com lacunas na revisão financeira mensal R$/HL.',
    criterio0: 'Sem acompanhamento do Pacote Prejuízo SCL ou ausência de apuração de motivos.',
    indicadoresPlataforma: [
      'WQI Farol (Índice de Qualidade Armazém)',
      'FGLI (HL Perdido por Avaria/Quebra)',
      'Pacote Prejuízo SCL (R$/HL)',
      'Análise de VLC/HL (Custo Variável)'
    ],
    panelLink: 'wqi-tab',
    navLabel: 'Ver WQI & Pacote Prejuízo'
  },
  {
    id: 'Q3.2',
    blocoId: 3,
    blocoNome: '3. Acuracidade',
    itemCode: '3.2',
    titulo: '3.2 Qualidade no Armazém',
    descricao: 'Medição correta de quebra por operador, ajudante, área e motivo; abertura de IVs de avaria; inclusão do Marketplace no WQI e preenchimento da GOP TQI (WH).',
    criterio3: 'Avarias 100% abertas por operador/ajudante/motivo, Marketplace incluso no WQI e GOP TQI preenchida com ações.',
    criterio1: 'Avarias medidas por área mas sem detalhamento individual por operador/ajudante.',
    criterio0: 'Sem medição de quebras por operador ou GOP TQI desatualizada.',
    indicadoresPlataforma: [
      'Prontuário de Qualidade por Operador e Ajudante',
      'Custo Total da Avaria R$',
      'Avaria por Motivo & Área (Picking/Armazém)',
      'GOP TQI (Warehouse Quality Index)'
    ],
    panelLink: 'ranking-produtividade',
    navLabel: 'Ver Prontuários & Avarias'
  },
  {
    id: 'Q3.3',
    blocoId: 3,
    blocoNome: '3. Acuracidade',
    itemCode: '3.3',
    titulo: '3.3 Processo de Contagem de Inventário e Resultados',
    descricao: 'Contagens cíclicas (mínimo 3x/sem PA, 2x/sem AG, 1x/sem Idade), padrão MPD com justificativas de mapas abertos, relato diário/mensal ao financeiro, GOP Inventário e pré/pós inventário.',
    criterio3: 'Frequência de inventário 100% cumprida, acuracidade física ≥ 99,5%, reabertura de mapas tratada e GOP Inventário atualizada.',
    criterio1: 'Frequência cumprida parcialmente ou acuracidade entre 98,0% e 99,4%.',
    criterio0: 'Acuracidade < 98,0% ou não realização das contagens cíclicas obrigatórias.',
    indicadoresPlataforma: [
      'Acuracidade do Inventário Cíclico (%)',
      'Frequência de Contagens (3x PA, 2x AG, 1x Idade)',
      'Painel de Divergências & Reabertura de Mapas MPD',
      'GOP Inventário'
    ],
    panelLink: 'stock-age-index',
    navLabel: 'Ver Stock Age Index & Inventário'
  },
  {
    id: 'Q3.4',
    blocoId: 3,
    blocoNome: '3. Acuracidade',
    itemCode: '3.4',
    titulo: '3.4 Gestão de Ativos',
    descricao: 'Recepção de ativos de retorno de rota, envio à cervejaria (PAVG), assinatura da Carta de Saldo Logtower, controle de refugo em rotas (% sorteados por colaborador, meta ≤ 1%) e descarte de sucata.',
    criterio3: 'Ativos 100% aderentes ao PAVG, Carta de Saldo assinada mensalmente, refugo ≤ 1,0% individualizado e descarte ambiental regular.',
    criterio1: 'Carta de Saldo assinada mas refugo entre 1,1% e 1,5%.',
    criterio0: 'Refugo > 1,5% ou falta de conciliação de ativos com a cervejaria.',
    indicadoresPlataforma: [
      'Aderência PAVG (Plano de Ativos Cervejaria %)',
      'Extrato de Carta de Saldo Logtower',
      'Blitz de Refugo % por Colaborador (Meta ≤ 1.0%)',
      'Eliminação de Sucata / Descarte Ambiental'
    ],
    panelLink: 'refugo-panel',
    navLabel: 'Ver Refugo & Carta de Saldo'
  },

  // =========================================================================
  // BLOCO 4: PREVENÇÃO
  // =========================================================================
  {
    id: 'Q4.1',
    blocoId: 4,
    blocoNome: '4. Prevenção',
    itemCode: '4.1',
    titulo: '4.1 Política de Descarte',
    descricao: 'POP/LUP de descarte de obsoletos e Marketplace, área segregada de sucata/despejo, IV para rastrear produtividade do despejo e licenças ambientais válidas.',
    criterio3: 'Despejo executado com POP/LUP, IV de produtividade ativo, área segregada e documentação ambiental em dia.',
    criterio1: 'Despejo realizado mas com atrasos na atualização do IV de produtividade.',
    criterio0: 'Ausência de área segregada para despejo ou licença ambiental desatualizada.',
    indicadoresPlataforma: [
      'POP / LUP Descarte de Obsoletos & Marketplace',
      'IV Produtividade do Despejo (Embalagens/hora)',
      'Área Segregada de Despejo & Sucata',
      'Licenças Ambientais Válidas'
    ],
    panelLink: 'despejo-dashboard',
    navLabel: 'Ver Painel de Despejo'
  },
  {
    id: 'Q4.2',
    blocoId: 4,
    blocoNome: '4. Prevenção',
    itemCode: '4.2',
    titulo: '4.2 Repack (Reacondicionamento)',
    descricao: 'Repack autorizado somente para produtos 100% conformes com embalagem primária/secundária danificada, respeitando limites de validade, monitoramento do KPI de Produtividade (embalagens/hora) e plano de ação.',
    criterio3: 'Repack operando na meta de produtividade/hora, sem introdução de novas deficiências, IV diário acompanhado e plano de ação ativo.',
    criterio1: 'Repack operando mas com baixa recuperação ou metas não divulgadas aos operadores.',
    criterio0: 'Processo de reacondicionamento despadronizado ou atrasos gerando descarte desnecessário.',
    indicadoresPlataforma: [
      'Painel de Produtividade Repack (Caixas Recuperadas/hora)',
      'Taxa de Recuperação de Embalagens (%)',
      'Controle por Turnos (Turno A, B, C)',
      'LUP & Rotina Básica de Repack'
    ],
    panelLink: 'repack-dashboard',
    navLabel: 'Ver Painel Repack'
  },
  {
    id: 'Q4.3',
    blocoId: 4,
    blocoNome: '4. Prevenção',
    itemCode: '4.3',
    titulo: '4.3 Gestão de Qualidade da Puxada',
    descricao: 'Alertas de qualidade enviados com planos de ação, KPI Pallet Avariado x Pallet Recebido mensurado, contabilização diária no picking e análise dos Top 10 SKUs críticos.',
    criterio3: 'KPI Pallet Avariado x Recebido monitorado, Top 10 SKUs estratificados e reuniões mensais com cervejarias/fornecedores MKTP realizadas.',
    criterio1: 'Avarias registradas mas sem estratificação dos Top 10 SKUs críticos.',
    criterio0: 'Sem controle de avarias no recebimento da puxada.',
    indicadoresPlataforma: [
      'KPI Pallet Avariado x Pallet Recebido (%)',
      'Alertas de Qualidade MKTP & Cervejaria',
      'Estratificação Top 10 SKUs com Avaria na Puxada'
    ],
    panelLink: 'qualidade',
    navLabel: 'Ver Qualidade da Puxada'
  },

  // =========================================================================
  // BLOCO 5: RESULTADOS
  // =========================================================================
  {
    id: 'Q5.1',
    blocoId: 5,
    blocoNome: '5. Resultados',
    itemCode: '5.1',
    titulo: '5.1 Eficiência de Carga (EFC) e Descarga (EFD)',
    descricao: 'Atingimento das metas operacionais de EFC (Meta ≥ 96% caminhões carregados no prazo) e EFD (Meta ≥ 90% caminhões descarregados no prazo) com análise de histograma por rota D1-D4.',
    criterio3: 'EFC ≥ 96% e EFD ≥ 90%, histograma analisado diariamente e medidas corretivas com tendência positiva nos últimos 4 meses.',
    criterio1: 'EFC entre 92% e 95,9% ou EFD entre 85% e 89,9%.',
    criterio0: 'EFC < 92% ou EFD < 85%.',
    indicadoresPlataforma: [
      'EFC (% Carregamento no Prazo - Meta ≥ 96%)',
      'EFD (% Descarga no Prazo - Meta ≥ 90%)',
      'Histograma de Carregamento & Descarga (Rotas D1-D4)'
    ],
    panelLink: 'armazem',
    navLabel: 'Ver Painel EFC / EFD'
  },
  {
    id: 'Q5.2',
    blocoId: 5,
    blocoNome: '5. Resultados',
    itemCode: '5.2',
    titulo: '5.2 Processo de Picking & Eficiência de Montagem',
    descricao: 'Padrão de picking e montagem com ferramentas digitais, caixas para kitting, IV de Eficiência de Montagem (EFM) e IV de Erro de Montagem por colaborador (ERRO %), devoluções por erro de carregamento e Árvore de Erros.',
    criterio3: 'EFM na meta, Erro de Montagem ≤ 0,05% por colaborador, conferência auditada e Árvore de Erros acompanhada.',
    criterio1: 'Erro de montagem entre 0,06% e 0,10% por colaborador.',
    criterio0: 'Erro de montagem > 0,10% ou ausência de acompanhamento de EFM.',
    indicadoresPlataforma: [
      'EFM (% Eficiência de Montagem de Pallets)',
      'ERRO (% Erro de Montagem por Ajudante/Conferente)',
      'Eficiência de Conferência por Conferente',
      'Árvore de Erros de Carregamento'
    ],
    panelLink: 'picking-dashboard',
    navLabel: 'Ver Painel de Picking'
  },
  {
    id: 'Q5.3',
    blocoId: 5,
    blocoNome: '5. Resultados',
    itemCode: '5.3',
    titulo: '5.3 Gestão do WLP (Workload Planning)',
    descricao: 'KPI do WLP monitorado considerando HE por setor (Retorno, Picking, Carregamento, Descarregamento, Repack), produtividade individual por colaborador e simulador semanal de dimensionamento.',
    criterio3: 'WLP controlado em todos os setores e por colaborador, simulador semanal utilizado e metas de WLP atingidas.',
    criterio1: 'WLP calculado mas sem acompanhamento individualizado por colaborador.',
    criterio0: 'Operação sem dimensionamento de carga de trabalho WLP.',
    indicadoresPlataforma: [
      'WLP Dashboard (Volume Faturado HL / TT QLP * 7.33 * Dias Úteis)',
      'Produtividade Homem/Hora por Setor',
      'Produtividade Individual WLP por Colaborador'
    ],
    panelLink: 'gestao-capacidade',
    navLabel: 'Ver Dimensionamento WLP'
  },
  {
    id: 'Q5.4',
    blocoId: 5,
    blocoNome: '5. Resultados',
    itemCode: '5.4',
    titulo: '5.4 Ciclo das Carretas e Tempos de Pátio',
    descricao: 'Padrão para receber modais/desconsolidar paletes mistos, TMA (Tempo Médio de Atendimento) Revenda/Fábrica, ANS Armazém x Puxada e controle do ciclo TMA, TMV e TMR.',
    criterio3: 'TMA, TMV e TMR dentro dos parâmetros da ANS, análise de faixas horárias executada e tendência positiva nos últimos 4 meses.',
    criterio1: 'TMA e TMR acompanhados mas com estouros pontuais na janela horária.',
    criterio0: 'Demora excessiva em pátio sem controle de TMA/TMV/TMR.',
    indicadoresPlataforma: [
      'TMA (Tempo Médio de Atendimento Pátio)',
      'TMV (Tempo Médio de Viagem) & TMR (Tempo Médio de Retorno)',
      'Matriz ANS Armazém x Puxada',
      'Análise de Faixas Horárias de Recebimento'
    ],
    panelLink: 'tmr-dashboard',
    navLabel: 'Ver Ciclo de Carretas & TMR'
  }
];

export default function AuditoriaDpoPanel({ user, empresa, theme = 'light', onNavigate }: AuditoriaDpoPanelProps) {
  const empresaData = useEmpresaData();
  const empresaId = empresa?.id || 'demo';

  // State for Audit Scores (3, 1, 0) and observations
  const [scores, setScores] = useState<Record<string, { nota: number; obs: string }>>({});
  
  // State for Manual Checklist ("Sim tenho implementado" / "Ainda não tenho")
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  
  const [filterStatus, setFilterStatus] = useState<'all' | 'implemented' | 'pending'>('all');
  const [filterBloco, setFilterBloco] = useState<number>(0); // 0 = all blocks

  const [dataAuditoria, setDataAuditoria] = useState<string>(new Date().toISOString().split('T')[0]);
  const [auditor, setAuditor] = useState<string>(user.nome || 'Gestor Operacional');
  const [saving, setSaving] = useState(false);
  const [historico, setHistorico] = useState<any[]>([]);

  // Load saved checklist and audit scores from localStorage or Firestore
  useEffect(() => {
    // Load checklist
    const storedChecklist = localStorage.getItem(`sdpo_checklist_${empresaId}`);
    if (storedChecklist) {
      try {
        setChecklist(JSON.parse(storedChecklist));
      } catch (e) {
        console.error("Error parsing stored SDPO checklist:", e);
      }
    } else {
      // Default initial state: all 19 requirements marked as implemented (true)
      const defaultState: Record<string, boolean> = {};
      DPO_QUESTIONS.forEach(q => { defaultState[q.id] = true; });
      setChecklist(defaultState);
    }

    loadHistoricoAuditorias();
  }, [empresaId]);

  const loadHistoricoAuditorias = async () => {
    if (!db) {
      const savedHist = localStorage.getItem(`dpo_audits_${empresaId}`);
      if (savedHist) setHistorico(JSON.parse(savedHist));
      return;
    }
    try {
      const q = query(collection(db, 'dpo_auditorias'), where('empresaId', '==', empresaId));
      const snap = await getDocs(q);
      const list: any[] = [];
      snap.forEach(d => list.push({ _docId: d.id, ...d.data() }));
      list.sort((a, b) => (b.dataISO || '').localeCompare(a.dataISO || ''));
      setHistorico(list);

      if (list.length > 0) {
        const latest = list[0];
        setScores(latest.scores || {});
        setDataAuditoria(latest.dataISO || new Date().toISOString().split('T')[0]);
        setAuditor(latest.auditor || user.nome);
      }
    } catch (e) {
      console.error("Erro ao carregar auditorias DPO:", e);
    }
  };

  // Toggle checklist status for an item
  const handleToggleChecklist = (qId: string) => {
    setChecklist(prev => {
      const updated = { ...prev, [qId]: !prev[qId] };
      localStorage.setItem(`sdpo_checklist_${empresaId}`, JSON.stringify(updated));
      return updated;
    });
  };

  // Handle Score selection (3, 1, 0)
  const handleScoreChange = (qId: string, nota: number) => {
    setScores(prev => ({
      ...prev,
      [qId]: {
        nota,
        obs: prev[qId]?.obs || ''
      }
    }));
  };

  const handleObsChange = (qId: string, obs: string) => {
    setScores(prev => ({
      ...prev,
      [qId]: {
        nota: prev[qId]?.nota ?? 3,
        obs
      }
    }));
  };

  // Calculate Checklist Statistics
  const checklistStats = useMemo(() => {
    const total = DPO_QUESTIONS.length;
    let implementedCount = 0;
    DPO_QUESTIONS.forEach(q => {
      if (checklist[q.id]) implementedCount++;
    });
    const pendingCount = total - implementedCount;
    const percentImplemented = total > 0 ? (implementedCount / total) * 100 : 0;

    return { total, implementedCount, pendingCount, percentImplemented };
  }, [checklist]);

  // Calculate Audit Score Stats per block and total
  const blockStats = useMemo(() => {
    const blocks = [1, 2, 3, 4, 5];
    return blocks.map(bId => {
      const qList = DPO_QUESTIONS.filter(q => q.blocoId === bId);
      const maxPossible = qList.length * 3;
      let achieved = 0;
      let implementedInBlock = 0;

      qList.forEach(q => {
        achieved += scores[q.id]?.nota ?? 3;
        if (checklist[q.id]) implementedInBlock++;
      });

      const percentScore = maxPossible > 0 ? (achieved / maxPossible) * 100 : 0;
      const percentChecklist = qList.length > 0 ? (implementedInBlock / qList.length) * 100 : 0;

      return {
        blocoId: bId,
        blocoNome: qList[0]?.blocoNome || `Bloco ${bId}`,
        achieved,
        maxPossible,
        percentScore,
        totalQuestions: qList.length,
        implementedInBlock,
        percentChecklist
      };
    });
  }, [scores, checklist]);

  const overallStats = useMemo(() => {
    const totalMax = DPO_QUESTIONS.length * 3;
    let totalAchieved = 0;
    DPO_QUESTIONS.forEach(q => {
      totalAchieved += scores[q.id]?.nota ?? 3;
    });

    const percent = totalMax > 0 ? (totalAchieved / totalMax) * 100 : 0;

    let nivel = 'Qualificado';
    if (percent >= 95) nivel = 'Sustentado (DPO Diamante)';
    else if (percent >= 90) nivel = 'Certificado';
    else if (percent >= 80) nivel = 'Qualificado';
    else nivel = 'Não Qualificado';

    return { totalAchieved, totalMax, percent, nivel };
  }, [scores]);

  const handleSaveAuditoria = async () => {
    setSaving(true);
    const auditRecord = {
      empresaId,
      dataISO: dataAuditoria,
      auditor,
      scores,
      checklist,
      overallPercent: overallStats.percent,
      checklistPercent: checklistStats.percentImplemented,
      nivel: overallStats.nivel,
      criadoEm: new Date().toISOString()
    };

    try {
      const newActionsToSave: AcaoCorretiva[] = [];
      const firestoreActions: any[] = [];

      DPO_QUESTIONS.forEach(q => {
        const scoreInfo = scores[q.id];
        if (scoreInfo && scoreInfo.nota < 3) {
          const actionId = `AC_DPO_${q.id.replace('.', '_')}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          const actionObj: AcaoCorretiva = {
            id: actionId,
            data: new Date().toLocaleDateString('pt-BR'),
            dataISO: dataAuditoria,
            hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            processo: 'Gestão de Capacidade',
            setor: q.blocoNome,
            colaboradorResponsavel: auditor,
            indicador: q.titulo,
            meta: 'Nota 3/3 (Conforme)',
            resultadoObtido: `Nota ${scoreInfo.nota}/3 (${scoreInfo.nota === 1 ? 'Parcial' : 'Não Atende'})`,
            desvioEncontrado: `[Auditoria DPO] Questão ${q.id} (${q.titulo}): Pontuação ${scoreInfo.nota}/3. Obs: ${scoreInfo.obs || 'Não atende critério máximo do padrão DPO.'}`,
            causaRaiz: 'Método',
            status: 'Pendente',
            responsavelTratativa: auditor,
            prazo: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            comentarioOperador: scoreInfo.obs || 'Adequar processo ao padrão DPO Revendas.',
            historicoAlteracoes: [{
              dataHora: new Date().toLocaleString('pt-BR'),
              usuario: auditor,
              alteracao: `Ação gerada automaticamente pela Auditoria DPO. Questão ${q.id} pontuada com ${scoreInfo.nota}/3.`
            }],
            simulado: false,
            criadoEm: new Date().toISOString(),
            tipoAcao: 'Corretiva',
            prioridade: scoreInfo.nota === 0 ? 'Alta' : 'Média',
            aprovacaoGestor: 'Aprovado',
            aceiteColaborador: false,
          };

          newActionsToSave.push(actionObj);

          firestoreActions.push({
            empresaId,
            titulo: `[Auditoria DPO ${q.id}] Correção para ${q.titulo}`,
            descricao: `Ação gerada automaticamente a partir da Auditoria DPO do dia ${dataAuditoria}. Questão pontuada com ${scoreInfo.nota}/3. Observação: ${scoreInfo.obs || 'Melhorar aderência ao padrão.'}`,
            responsavel: auditor,
            dataLimite: actionObj.prazo,
            status: 'Pendente',
            prioridade: actionObj.prioridade,
            setor: q.blocoNome,
            origem: 'Auditoria DPO',
            criadoEm: new Date().toISOString()
          });
        }
      });

      if (newActionsToSave.length > 0) {
        const existingAcoes = getAcoesAll();
        saveAcoes([...newActionsToSave, ...existingAcoes]);
      }

      if (db) {
        await addDoc(collection(db, 'dpo_auditorias'), auditRecord);
        for (const act of firestoreActions) {
          await addDoc(collection(db, 'acoes'), act);
        }
      } else {
        const hist = JSON.parse(localStorage.getItem(`dpo_audits_${empresaId}`) || '[]');
        hist.unshift(auditRecord);
        localStorage.setItem(`dpo_audits_${empresaId}`, JSON.stringify(hist));
      }

      const numGen = newActionsToSave.length;
      alert(`Auditoria DPO salva com sucesso!\n\nNível: ${overallStats.nivel} (${overallStats.percent.toFixed(1)}%)\nChecklist Aderência: ${checklistStats.implementedCount}/19 (${checklistStats.percentImplemented.toFixed(1)}%)\n${numGen > 0 ? `Foram geradas ${numGen} ação(ões) pendente(s) no módulo de Gestão de Ações.` : 'Todas as questões atingiram Nota 3!'}`);
      loadHistoricoAuditorias();
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar auditoria.');
    } finally {
      setSaving(false);
    }
  };

  // Block color configuration
  const blockColors = [
    { id: 1, border: 'border-sky-500/30', bg: 'bg-sky-500/5', badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/40', accent: 'text-sky-400', bar: 'bg-sky-500' },
    { id: 2, border: 'border-emerald-500/30', bg: 'bg-emerald-500/5', badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', accent: 'text-emerald-400', bar: 'bg-emerald-500' },
    { id: 3, border: 'border-indigo-500/30', bg: 'bg-indigo-500/5', badgeBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40', accent: 'text-indigo-400', bar: 'bg-indigo-500' },
    { id: 4, border: 'border-amber-500/30', bg: 'bg-amber-500/5', badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40', accent: 'text-amber-400', bar: 'bg-amber-500' },
    { id: 5, border: 'border-cyan-500/30', bg: 'bg-cyan-500/5', badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40', accent: 'text-cyan-400', bar: 'bg-cyan-500' },
  ];

  return (
    <div className={`p-4 sm:p-6 space-y-6 ${theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* 🚀 HEADER PRINCIPAL DE MATRIZ SDPO */}
      <div className="p-6 bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-950 text-white rounded-3xl shadow-2xl border border-indigo-500/30 relative overflow-hidden space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" /> Pilar Armazém — DPO Revendas
              </span>
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Matriz SDPO Organizada por 5 Blocos
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
              <Layers3 className="w-8 h-8 text-sky-400 shrink-0" />
              Matriz SDPO & Auditoria de Processos (5 Blocos)
            </h1>

            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Estrutura oficial do documento <strong>Pilar Armazém — DPO Revendas</strong>. Cada bloco agrupa os indicadores reais da plataforma e um checklist editável para acompanhar e validar a implementação completa dos requisitos de auditoria.
            </p>
          </div>

          {/* PAINEL DE ADERÊNCIA E PONTUAÇÃO */}
          <div className="grid grid-cols-2 gap-3 shrink-0">
            <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/10 space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 block">Checklist de Aderência</span>
              <span className="text-xl font-black text-emerald-400 block font-mono">
                {checklistStats.implementedCount} / {checklistStats.total} ({checklistStats.percentImplemented.toFixed(0)}%)
              </span>
              <span className="text-[10px] text-slate-300 font-bold block">Requisitos Implementados</span>
            </div>

            <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/10 space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 block">Auditoria Oficial</span>
              <span className="text-xl font-black text-amber-300 block font-mono">
                {overallStats.percent.toFixed(0)}% ({overallStats.nivel})
              </span>
              <span className="text-[10px] text-amber-200/80 font-bold block">{overallStats.totalAchieved} de {overallStats.totalMax} pts</span>
            </div>
          </div>
        </div>

        {/* METADADOS & BOTÃO SALVAR */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 bg-[#0b1222]/80 px-3 py-1.5 rounded-xl border border-slate-800">
              <Calendar className="w-4 h-4 text-sky-400" />
              <span className="text-[11px] font-bold text-slate-400">Data da Auditoria:</span>
              <input 
                type="date"
                value={dataAuditoria}
                onChange={e => setDataAuditoria(e.target.value)}
                className="bg-transparent text-xs font-mono font-bold text-white outline-none"
              />
            </div>

            <div className="flex items-center gap-2 bg-[#0b1222]/80 px-3 py-1.5 rounded-xl border border-slate-800">
              <User className="w-4 h-4 text-emerald-400" />
              <span className="text-[11px] font-bold text-slate-400">Auditor Responsável:</span>
              <input 
                type="text"
                value={auditor}
                onChange={e => setAuditor(e.target.value)}
                placeholder="Nome do Auditor"
                className="bg-transparent text-xs font-bold text-white outline-none w-36 sm:w-48"
              />
            </div>
          </div>

          <button
            onClick={handleSaveAuditoria}
            disabled={saving}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer uppercase tracking-wider"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Gravando...' : 'Salvar Auditoria DPO'}
          </button>
        </div>
      </div>

      {/* MANUAL DE INSTRUÇÃO E METAS */}
      <ManualInstrucaoCard
        title="Manual de Instrução & Regras de Aderência — Matriz SDPO DPO Revendas"
        metrics={[
          {
            key: 'aderencia_matriz_sdpo',
            label: 'Aderência à Matriz SDPO (%)',
            unit: '%',
            comoCalcular: '(Quantidade de Requisitos com Checklist "Sim, tenho implementado") ÷ (19 Requisitos Oficiais) × 100.'
          },
          {
            key: 'pontuacao_auditoria_dpo',
            label: 'Pontuação da Auditoria Oficial DPO',
            unit: '%',
            comoCalcular: '(Soma das Notas Obtidas nos 19 Quesitos [3, 1 ou 0]) ÷ (Pontuação Máxima Possível: 57 Pontos) × 100.'
          }
        ]}
      />

      {/* 📊 PAINEL RESUMO DOS 5 BLOCOS OFICIAIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {blockStats.map(b => {
          const cfg = blockColors.find(c => c.id === b.blocoId) || blockColors[0];
          return (
            <div 
              key={b.blocoId}
              onClick={() => setFilterBloco(filterBloco === b.blocoId ? 0 : b.blocoId)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-md space-y-2 relative overflow-hidden ${
                filterBloco === b.blocoId ? 'ring-2 ring-sky-400 scale-[1.02]' : ''
              } ${theme === 'dark' ? 'bg-[#111a30] border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200'}`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${cfg.badgeBg}`}>
                  Bloco {b.blocoId}
                </span>
                <span className="text-xs font-mono font-black text-emerald-400">
                  {b.implementedInBlock}/{b.totalQuestions} Sim
                </span>
              </div>

              <h3 className="text-xs font-black text-slate-900 dark:text-white line-clamp-1 mt-1">
                {b.blocoNome.replace(/^\d+\.\s*/, '')}
              </h3>

              {/* BARRA DE PROGRESSO CHECKLIST */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>Aderência:</span>
                  <strong className="text-slate-200">{b.percentChecklist.toFixed(0)}%</strong>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${cfg.bar}`}
                    style={{ width: `${b.percentChecklist}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 🔍 BARRA DE FILTROS RÁPIDOS */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
        theme === 'dark' ? 'bg-[#111a30] border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-sky-400 shrink-0" />
          <span className="text-xs font-black uppercase text-slate-300 tracking-wider">Filtrar Requisitos SDPO:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${
              filterStatus === 'all'
                ? 'bg-sky-600 text-white shadow-md'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            Todos os 19 Requisitos
          </button>

          <button
            onClick={() => setFilterStatus('implemented')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
              filterStatus === 'implemented'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
            Sim ({checklistStats.implementedCount})
          </button>

          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
              filterStatus === 'pending'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            Ainda Não Tenho ({checklistStats.pendingCount})
          </button>

          {filterBloco > 0 && (
            <button
              onClick={() => setFilterBloco(0)}
              className="px-2.5 py-1.5 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 rounded-xl text-xs font-bold uppercase border border-rose-500/30 cursor-pointer"
            >
              Limpar Bloco
            </button>
          )}
        </div>
      </div>

      {/* 📦 LISTA DOS 5 BLOCOS COM REQUISITOS E INDICADORES DA PLATAFORMA */}
      <div className="space-y-8">
        {[1, 2, 3, 4, 5]
          .filter(blocoNum => filterBloco === 0 || filterBloco === blocoNum)
          .map(blocoNum => {
            const allBlocoQuestions = DPO_QUESTIONS.filter(q => q.blocoId === blocoNum);
            
            const questions = allBlocoQuestions.filter(q => {
              const isImplemented = checklist[q.id];
              if (filterStatus === 'implemented') return isImplemented;
              if (filterStatus === 'pending') return !isImplemented;
              return true;
            });

            if (questions.length === 0) return null;

            const blocoNome = allBlocoQuestions[0]?.blocoNome || `Bloco ${blocoNum}`;
            const cfg = blockColors.find(c => c.id === blocoNum) || blockColors[0];

            return (
              <div 
                key={blocoNum}
                className={`rounded-3xl border overflow-hidden shadow-xl ${cfg.border} ${
                  theme === 'dark' ? 'bg-[#111a30]' : 'bg-white'
                }`}
              >
                {/* HEADER DO BLOCO */}
                <div className={`p-5 border-b flex flex-col md:flex-row md:items-center justify-between gap-3 ${cfg.bg} ${cfg.border}`}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-md font-mono text-xs font-black border ${cfg.badgeBg}`}>
                        Bloco {blocoNum}
                      </span>
                      <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
                        {blocoNome}
                      </h2>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="text-slate-400">Status Bloco:</span>
                    <span className="font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                      {allBlocoQuestions.filter(q => checklist[q.id]).length} / {allBlocoQuestions.length} Requisitos Implementados
                    </span>
                  </div>
                </div>

                {/* LISTA DE REQUISITOS DENTRO DO BLOCO */}
                <div className="divide-y divide-slate-800/60">
                  {questions.map(q => {
                    const isImplemented = checklist[q.id] ?? true;
                    const currentScore = scores[q.id]?.nota ?? 3;
                    const currentObs = scores[q.id]?.obs || '';

                    return (
                      <div 
                        key={q.id}
                        className={`p-5 space-y-4 transition-colors ${
                          !isImplemented ? 'bg-amber-500/5' : ''
                        } hover:bg-slate-800/40`}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                          
                          {/* INFORMAÇÕES DO REQUISITO AUDITORIA */}
                          <div className="space-y-2 max-w-3xl">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono text-xs font-black border border-sky-500/30">
                                {q.itemCode}
                              </span>
                              <h3 className="text-sm font-black text-white">{q.titulo}</h3>
                            </div>

                            <p className="text-xs text-slate-300 leading-relaxed">
                              {q.descricao}
                            </p>

                            {/* 🎯 INDICADORES REALMENTE EXISTENTES NA PLATAFORMA PARA ESTE ITEM */}
                            <div className="pt-2 space-y-1.5">
                              <span className="text-[10px] font-black uppercase tracking-wider text-sky-400 flex items-center gap-1">
                                <Package className="w-3 h-3 text-sky-400" />
                                Indicadores Mapeados na Plataforma:
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {q.indicadoresPlataforma.map((ind, idx) => (
                                  <span 
                                    key={idx}
                                    className="px-2.5 py-1 bg-[#0b1222] text-slate-200 rounded-lg text-[11px] font-bold border border-slate-700/80 flex items-center gap-1"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                                    {ind}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* CONTROLES DA DIREITA: CHECKLIST + NAVEGAÇÃO + NOTA AUDITORIA */}
                          <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-3 shrink-0">
                            
                            {/* 🟢/🟡 BOTÃO CHECKLIST EDITÁVEL (SIM / AINDA NÃO) */}
                            <div className="flex items-center gap-2 bg-[#0b1222] p-1.5 rounded-2xl border border-slate-700">
                              <button
                                type="button"
                                onClick={() => handleToggleChecklist(q.id)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-sm ${
                                  isImplemented
                                    ? 'bg-emerald-600 text-white ring-2 ring-emerald-500/30'
                                    : 'text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Sim, tenho
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleChecklist(q.id)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-sm ${
                                  !isImplemented
                                    ? 'bg-amber-600 text-white ring-2 ring-amber-500/30'
                                    : 'text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Ainda não tenho
                              </button>
                            </div>

                            {/* SHORTCUT PARA O PAINEL NA PLATAFORMA */}
                            {q.panelLink && onNavigate && (
                              <button
                                onClick={() => onNavigate(q.panelLink!)}
                                className="px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                              >
                                {q.navLabel || 'Ver Módulo'}
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* PONTUAÇÃO DA AUDITORIA DPO (3, 1, 0) */}
                            <div className="flex items-center gap-1 bg-[#0b1222] p-1 rounded-xl border border-slate-800">
                              <span className="text-[10px] font-bold text-slate-400 px-1.5">Nota DPO:</span>
                              <button
                                type="button"
                                onClick={() => handleScoreChange(q.id, 3)}
                                className={`w-7 h-7 rounded-lg text-xs font-black transition-all cursor-pointer ${
                                  currentScore === 3 ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                                }`}
                                title="3 - Atende"
                              >
                                3
                              </button>
                              <button
                                type="button"
                                onClick={() => handleScoreChange(q.id, 1)}
                                className={`w-7 h-7 rounded-lg text-xs font-black transition-all cursor-pointer ${
                                  currentScore === 1 ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-white'
                                }`}
                                title="1 - Parcial"
                              >
                                1
                              </button>
                              <button
                                type="button"
                                onClick={() => handleScoreChange(q.id, 0)}
                                className={`w-7 h-7 rounded-lg text-xs font-black transition-all cursor-pointer ${
                                  currentScore === 0 ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
                                }`}
                                title="0 - Não Atende"
                              >
                                0
                              </button>
                            </div>

                          </div>
                        </div>

                        {/* CRITÉRIOS DE PONTUAÇÃO DA AUDITORIA */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 p-3 rounded-2xl bg-[#0b1222]/80 border border-slate-800 text-[11px]">
                          <div className={`p-2.5 rounded-xl border ${currentScore === 3 ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-bold' : 'opacity-60 text-slate-400 border-slate-800'}`}>
                            <span className="font-black text-emerald-400 block mb-0.5">Nota 3 (Atende 100%):</span>
                            {q.criterio3}
                          </div>
                          <div className={`p-2.5 rounded-xl border ${currentScore === 1 ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 font-bold' : 'opacity-60 text-slate-400 border-slate-800'}`}>
                            <span className="font-black text-amber-400 block mb-0.5">Nota 1 (Atende Parcial):</span>
                            {q.criterio1}
                          </div>
                          <div className={`p-2.5 rounded-xl border ${currentScore === 0 ? 'bg-rose-500/10 border-rose-500/40 text-rose-300 font-bold' : 'opacity-60 text-slate-400 border-slate-800'}`}>
                            <span className="font-black text-rose-400 block mb-0.5">Nota 0 (Não Atende):</span>
                            {q.criterio0}
                          </div>
                        </div>

                        {/* INPUT PARA EVIDÊNCIA / OBSERVAÇÃO */}
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={currentObs}
                            onChange={e => handleObsChange(q.id, e.target.value)}
                            placeholder="Anotar evidência, justificativa ou observação da auditoria..."
                            className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#0b1222] border border-slate-700 text-white placeholder-slate-500 outline-none"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
      </div>

    </div>
  );
}
