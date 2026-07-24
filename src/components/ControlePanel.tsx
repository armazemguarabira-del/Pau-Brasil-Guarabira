import React, { useState, useEffect } from 'react';
import { db, isCustomFirebaseConnected } from '../firebase';
import { collection, addDoc, onSnapshot, query, where, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Usuario, Empresa, RepackRow } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart2, 
  Clock, 
  Clipboard, 
  Award, 
  BookOpen, 
  ArrowLeft, 
  CheckCircle, 
  CheckCircle2,
  AlertTriangle, 
  ShieldAlert,
  Zap, 
  TrendingUp, 
  FileText, 
  Trash2, 
  Percent,
  Activity, 
  Pencil,
  Truck,
  User, 
  Sparkles,
  Layers,
  Users,
  Plus,
  Bell,
  Target,
  ListChecks,
  Search,
  Filter,
  Calendar,
  Check,
  X,
  AlertOctagon,
  ArrowUpRight,
  Send,
  Flame,
  ShieldCheck,
  MapPin,
  Package,
  Tag
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';


interface ControlePanelProps {
  user: Usuario;
  empresa: Empresa | null;
  initialSection?: 'hub' | 'dash' | 'timer' | 'audit' | 'ranking' | 'normas' | 'colaboradores' | 'primeiro_acesso' | 'acoes' | 'alertas';
}

interface DpoAudit {
  _docId?: string;
  data: string;
  dataISO: string;
  auditor: string;
  operador: string;
  embalagem: string;
  pontos: number; // 0 a 6
  score: number; // 0 a 100%
  status: 'EXCELENTE' | 'CONFORME' | 'NAO_CONFORME';
  items: {
    epis: boolean;
    organizacao5S: boolean;
    inspecaoQualidade: boolean;
    coletaCacos: boolean;
    loteLegivel: boolean;
    ergonomia: boolean;
  };
  observacoes: string;
}

const REPACK_EMBALAGENS = [
  { nome: 'LATA 250', meta: '00:04:30' },
  { nome: 'LATA 269', meta: '00:04:30' },
  { nome: 'LATA 350', meta: '00:05:30' },
  { nome: 'LATA 473', meta: '00:05:30' },
  { nome: 'LONG NECK', meta: '00:06:00' },
  { nome: 'PET 1L', meta: '00:05:30' },
  { nome: 'PET 2L', meta: '00:05:00' },
  { nome: 'PET 500ml', meta: '00:05:00' },
  { nome: 'PET 200ml', meta: '00:04:30' },
  { nome: 'PET 2,5L', meta: '00:04:30' },
  { nome: 'PET 3,3L', meta: '00:04:00' },
  { nome: '600 OW', meta: '00:05:00' },
  { nome: '300 OW', meta: '00:04:00' },
];

const getFormattedRoles = (funcaoStr?: string) => {
  if (!funcaoStr) return 'Sem Função';
  const roles = funcaoStr.split(',');
  const mapped = roles.map(role => {
    switch (role.trim()) {
      case 'repack': return 'Operação Repack';
      case 'despejo': return 'Operação Despejo';
      case 'armazem': return 'Operação EFC / EFD';
      case 'quebras': return 'Operação Quebras';
      case 'validades': return 'Operação Validade';
      case 'refugo': return 'Operação Retorno de Rota';
      case 'empilhador': return 'Operação Picking';
      case 'conferente': return 'Operação Conferênte';
      case 'controle': return 'Supervisor Controle';
      default: return role;
    }
  });
  return mapped.join(', ');
};

const OPERATIONAL_ALERTS = [
  {
    id: 'alt_mov_1',
    categoria: 'movimentacao',
    categoriaNome: 'Quebras por Movimentação',
    setor: 'Empilhadeira & Movimentação',
    titulo: 'Pico de Avarias por Deslocamento de Empilhadeira',
    severidade: 'CRÍTICO',
    registroId: 'REG-2026-0722-014',
    dataRegistro: '22/07/2026 às 14:35',
    turno: '2º Turno (14:00 - 22:20)',
    localizacao: 'Corredor 04 (Rua B) - Pos. 102 a 118',
    equipamentoOp: 'Empilhadeira Elétrica #04 (Op. Carlos Silva - RE 3891)',
    produtosEnvolvidos: 'SKU #2546 - ORIGINAL 600ML CX C/24 (14 caixas avariadas / 2 PL)',
    registradoPor: 'Conferente Roberto Alves (RE 4819)',
    impactoEstimado: 'Prejuízo de R$ 680,40 em produtos e risco de atraso na rota 104',
    gatilho: 'Movimentação sem travamento de filme paletizado',
    metricaAtual: '4.2 caixas/palete avariadas',
    metaReferencia: '< 1.0 caixa/palete',
    causaProvavel: 'Velocidade excessiva na transição entre corredores e falta de amarração no topo do palete.',
    acaoRecomendada: 'Auditar velocidade dos operadores de empilhadeira e aplicar check de amarração de palete pré-transporte.'
  },
  {
    id: 'alt_mov_2',
    categoria: 'movimentacao',
    categoriaNome: 'Quebras por Movimentação',
    setor: 'Docas & Carga',
    titulo: 'Avaria na Rampa de Transbordo de Insumos / Refugo',
    severidade: 'ALERTA',
    registroId: 'REG-2026-0723-002',
    dataRegistro: '23/07/2026 às 07:15',
    turno: '1º Turno (06:00 - 14:20)',
    localizacao: 'Doca 04 (Rampa Sul de Transbordo)',
    equipamentoOp: 'Paleteira Hidráulica #12 (Op. Marcos Souza - RE 5102)',
    produtosEnvolvidos: 'SKU #19164 - GUARANA CHP ANTARCTICA PET 1L (8 caixas caídas)',
    registradoPor: 'Supervisora Juliana Costa (RE 1204)',
    impactoEstimado: 'Atraso de 25 min no descarregamento e paralisação temporária da Doca 04',
    gatilho: 'Queda de garra de lata durante descarregamento',
    metricaAtual: '2 incidentes na última semana',
    metaReferencia: '0 incidentes',
    causaProvavel: 'Superfície irregular da rampa e desacoplamento brusco do palete de garrafas/latas.',
    acaoRecomendada: 'Realizar manutenção na rampa da doca 04 e reciclar treinamento de desacoplamento seguro.'
  },
  {
    id: 'alt_repack_1',
    categoria: 'repack',
    categoriaNome: 'Metas Repack',
    setor: 'Repack Operacional',
    titulo: 'Desvio de Tempo Padrão na Embalagem LATA 350 / 473',
    severidade: 'CRÍTICO',
    registroId: 'REG-2026-0722-089',
    dataRegistro: '22/07/2026 às 16:10',
    turno: '2º Turno (14:00 - 22:20)',
    localizacao: 'Mesa 02 de Salvamento (Módulo Repack Central)',
    equipamentoOp: 'Equipe de Reembalagem Repack (3 Operadores)',
    produtosEnvolvidos: 'SKU #9068 - SKOL LATA 350ML e SKU #20164 - SKOL LT 473ML',
    registradoPor: 'Auditor de Qualidade Fernando Dias (RE 2930)',
    impactoEstimado: 'Gargalo de 42 caixas acumuladas aguardando embalagem e estouro de SLA',
    gatilho: 'Tempo médio de salvamento excede a meta estabelecida',
    metricaAtual: '00:07:45 por caixa',
    metaReferencia: '00:05:30 por caixa',
    causaProvavel: 'Falta de fita stretch adequada na mesa de reembalagem e triagem manual de garrafas lentas.',
    acaoRecomendada: 'Fornecer aplicadores ergonômicos de fita e reestruturar a triagem prévia antes da montagem.'
  },
  {
    id: 'alt_repack_2',
    categoria: 'repack',
    categoriaNome: 'Metas Repack',
    setor: 'Repack Operacional',
    titulo: 'Baixa Taxa de Recuperação de Garrafas (Long Neck / 600 OW)',
    severidade: 'ALERTA',
    registroId: 'REG-2026-0723-005',
    dataRegistro: '23/07/2026 às 08:30',
    turno: '1º Turno (06:00 - 14:20)',
    localizacao: 'Bancada 01 - Triagem de Vidro (Repack Entradas)',
    equipamentoOp: 'Gabarito Manual de Triagem (Op. Rodrigo Lima - RE 6120)',
    produtosEnvolvidos: 'SKU #1743 - ANTARCTICA PILSEN GFA 1L / SKU #13205 - SKOL 300ML',
    registradoPor: 'Inspetora de Qualidade Luciana Melo (RE 3311)',
    impactoEstimado: 'Descarte indevido de 120 vasilhames reaproveitáveis por falha na pré-triagem',
    gatilho: 'Índice de aproveitamento abaixo do teto tático',
    metricaAtual: '68% aproveitado',
    metaReferencia: '>= 85% aproveitamento',
    causaProvavel: 'Acúmulo de garrafas trincadas não separadas no descarte inicial.',
    acaoRecomendada: 'Implementar inspeção visual padronizada com gabarito de trincas na entrada do Repack.'
  },
  {
    id: 'alt_quebras_1',
    categoria: 'quebras',
    categoriaNome: 'Metas Quebras',
    setor: 'Gestão de Quebras & Avarias',
    titulo: 'Excesso de Refugo Não-Recuperável na Separação de Rota',
    severidade: 'CRÍTICO',
    registroId: 'REG-2026-0722-045',
    dataRegistro: '22/07/2026 às 11:45',
    turno: '1º Turno (06:00 - 14:20)',
    localizacao: 'Placa de Separação de Rota - Setor de Quebras EFC',
    equipamentoOp: 'Garra de Vidro da Paleteira Elétrica #08 (Op. André Neves)',
    produtosEnvolvidos: 'SKU #1743 - ANTARCTICA PILSEN GFA 1L e SKU #504 - PEPSI COLA 2L',
    registradoPor: 'Conferente de Quebras Marcelo Viana (RE 1982)',
    impactoEstimado: 'Perda direta de R$ 1.240,00 no dia (1.85% da cota da unidade)',
    gatilho: 'Volume diário de quebra direta excede a cota da unidade',
    metricaAtual: '1.85% do faturamento diário',
    metaReferencia: '<= 0.60% do faturamento',
    causaProvavel: 'Manuseio inadequado de caixas de vidro na zona de transbordo e garra desgastada.',
    acaoRecomendada: 'Substituir borrachas de garra das paleteiras manuais e intensificar auditoria EFC.'
  },
  {
    id: 'alt_picking_1',
    categoria: 'picking',
    categoriaNome: 'Metas Picking',
    setor: 'Picking & Separação',
    titulo: 'EFC (Erros de Separação / Picking Fora da Meta)',
    severidade: 'ALERTA',
    registroId: 'REG-2026-0723-011',
    dataRegistro: '23/07/2026 às 09:15',
    turno: '1º Turno (06:00 - 14:20)',
    localizacao: 'Rua B - Posições 045 a 060 (Picking Misto)',
    equipamentoOp: 'Coletor de Dados RF #14 (Op. Gabriel Santos - RE 7140)',
    produtosEnvolvidos: 'SKU #20164 - SKOL LT 473ML / SKU #9068 - SKOL LATA 350ML',
    registradoPor: 'Supervisor de Operações Carlos Eduardo (RE 1002)',
    impactoEstimado: '3.8 erros por 1000 caixas colhidas e 4 paletes retrabalhados na conferência',
    gatilho: 'Conferência indicou divergência recorrente de SKUs',
    metricaAtual: '3.8 erros / 1000 cx',
    metaReferencia: '< 1.0 erro / 1000 cx',
    causaProvavel: 'Endereçamento de gôndolas com etiquetas rasgadas ou sobrepostas na rua B.',
    acaoRecomendada: 'Recadastrar e refazer a sinalização de código de barras nas posições de picking da rua B.'
  }
];

const DEFAULT_ACOES = [
  {
    id: 'local_act_001',
    titulo: 'Plano de Ação: Pico de Avarias por Deslocamento de Empilhadeira',
    setor: 'Movimentação',
    prioridade: 'alta',
    responsavel: 'Carlos Eduardo (Supervisor)',
    status: 'em_andamento',
    limiteEm: '2026-07-28',
    criadoEm: '2026-07-22T14:40:00.000Z',
    origemAlertaId: 'alt_mov_1',
    descricao: `[OCORRÊNCIA REGISTRADA #REG-2026-0722-014]
📅 Data/Hora: 22/07/2026 às 14:35 | Turno: 2º Turno
📍 Local: Corredor 04 (Rua B) - Pos. 102 a 118
🚜 Equip/Op: Empilhadeira Elétrica #04 (Op. Carlos Silva - RE 3891)
📦 SKUs: SKU #2546 - ORIGINAL 600ML CX C/24 (14 caixas avariadas / 2 PL)
👤 Registrado por: Conferente Roberto Alves (RE 4819)
💥 Impacto Estimado: Prejuízo de R$ 680,40 em produtos

• Gatilho: Movimentação sem travamento de filme paletizado
• Métrica Detectada: 4.2 caixas/palete avariadas (Meta: < 1.0 caixa/palete)
• Causa Provável: Velocidade excessiva na transição entre corredores e falta de amarração no topo do palete.
• Recomendação: Auditar velocidade dos operadores de empilhadeira e aplicar check de amarração de palete pré-transporte.`
  },
  {
    id: 'local_act_002',
    titulo: 'Plano de Ação: Avaria na Rampa de Transbordo de Insumos / Refugo',
    setor: 'Movimentação',
    prioridade: 'alta',
    responsavel: 'Juliana Costa (Supervisora)',
    status: 'pendente',
    limiteEm: '2026-07-27',
    criadoEm: '2026-07-23T07:20:00.000Z',
    origemAlertaId: 'alt_mov_2',
    descricao: `[OCORRÊNCIA REGISTRADA #REG-2026-0723-002]
📅 Data/Hora: 23/07/2026 às 07:15 | Turno: 1º Turno
📍 Local: Doca 04 (Rampa Sul de Transbordo)
🚜 Equip/Op: Paleteira Hidráulica #12 (Op. Marcos Souza - RE 5102)
📦 SKUs: SKU #19164 - GUARANA CHP ANTARCTICA PET 1L (8 caixas caídas)
👤 Registrado por: Supervisora Juliana Costa (RE 1204)
💥 Impacto Estimado: Atraso de 25 min no descarregamento e paralisação temporária da Doca 04

• Gatilho: Queda de garra de lata durante descarregamento
• Métrica Detectada: 2 incidentes na última semana (Meta: 0 incidentes)
• Causa Provável: Superfície irregular da rampa e desacoplamento brusco do palete de garrafas/latas.
• Recomendação: Realizar manutenção na rampa da doca 04 e reciclar treinamento de desacoplamento seguro.`
  },
  {
    id: 'local_act_003',
    titulo: 'Plano de Ação: Desvio de Tempo Padrão na Embalagem LATA 350 / 473',
    setor: 'Repack',
    prioridade: 'alta',
    responsavel: 'Fernando Dias (Auditor Qualidade)',
    status: 'em_andamento',
    limiteEm: '2026-07-26',
    criadoEm: '2026-07-22T16:15:00.000Z',
    origemAlertaId: 'alt_rep_1',
    descricao: `[OCORRÊNCIA REGISTRADA #REG-2026-0722-089]
📅 Data/Hora: 22/07/2026 às 16:10 | Turno: 2º Turno
📍 Local: Mesa 02 de Salvamento (Módulo Repack Central)
🚜 Equip/Op: Equipe de Reembalagem Repack (3 Operadores)
📦 SKUs: SKU #9068 - SKOL LATA 350ML / SKU #20164 - SKOL LT 473ML
👤 Registrado por: Auditor de Qualidade Fernando Dias (RE 2930)
💥 Impacto Estimado: Gargalo de 42 caixas acumuladas e estouro de SLA

• Gatilho: Tempo médio de salvamento excede a meta estabelecida
• Métrica Detectada: 00:07:45 por caixa (Meta: 00:05:30 por caixa)
• Causa Provável: Falta de fita stretch adequada na mesa de reembalagem e triagem manual de garrafas lentas.
• Recomendação: Fornecer aplicadores ergonômicos de fita e reestruturar a triagem prévia antes da montagem.`
  },
  {
    id: 'local_act_004',
    titulo: 'Plano de Ação: Excesso de Refugo Não-Recuperável na Separação de Rota',
    setor: 'Quebras',
    prioridade: 'alta',
    responsavel: 'Marcelo Viana (Conferente)',
    status: 'concluido',
    limiteEm: '2026-07-25',
    criadoEm: '2026-07-22T11:50:00.000Z',
    origemAlertaId: 'alt_que_1',
    descricao: `[OCORRÊNCIA REGISTRADA #REG-2026-0722-045]
📅 Data/Hora: 22/07/2026 às 11:45 | Turno: 1º Turno
📍 Local: Placa de Separação de Rota - Setor de Quebras EFC
🚜 Equip/Op: Garra de Vidro da Paleteira Elétrica #08 (Op. André Neves)
📦 SKUs: SKU #1743 - ANTARCTICA PILSEN GFA 1L e SKU #504 - PEPSI COLA 2L
👤 Registrado por: Conferente de Quebras Marcelo Viana (RE 1982)
💥 Impacto Estimado: Perda direta de R$ 1.240,00 no dia (1.85% da cota da unidade)

• Gatilho: Volume diário de quebra direta excede a cota da unidade
• Métrica Detectada: 1.85% do faturamento diário (Meta: <= 0.60% do faturamento)
• Causa Provável: Manuseio inadequado de caixas de vidro na zona de transbordo e garra desgastada.
• Recomendação: Substituir borrachas de garra das paleteiras manuais e intensificar auditoria EFC.`
  },
  {
    id: 'local_act_005',
    titulo: 'Plano de Ação: EFC (Erros de Separação / Picking Fora da Meta)',
    setor: 'Picking',
    prioridade: 'media',
    responsavel: 'Gabriel Santos (Operador)',
    status: 'pendente',
    limiteEm: '2026-07-27',
    criadoEm: '2026-07-23T09:20:00.000Z',
    origemAlertaId: 'alt_pic_1',
    descricao: `[OCORRÊNCIA REGISTRADA #REG-2026-0723-011]
📅 Data/Hora: 23/07/2026 às 09:15 | Turno: 1º Turno
📍 Local: Rua B - Posições 045 a 060 (Picking Misto)
🚜 Equip/Op: Coletor de Dados RF #14 (Op. Gabriel Santos - RE 7140)
📦 SKUs: SKU #20164 - SKOL LT 473ML / SKU #9068 - SKOL LATA 350ML
👤 Registrado por: Supervisor de Operações Carlos Eduardo (RE 1002)
💥 Impacto Estimado: 3.8 erros por 1000 caixas colhidas e 4 paletes retrabalhados

• Gatilho: Conferência indicou divergência recorrente de SKUs
• Métrica Detectada: 3.8 erros / 1000 cx (Meta: < 1.0 erro / 1000 cx)
• Causa Provável: Endereçamento de gôndolas com etiquetas rasgadas ou sobrepostas na rua B.
• Recomendação: Recadastrar e refazer a sinalização de código de barras nas posições de picking da rua B.`
  },
  {
    id: 'local_act_006',
    titulo: 'Plano de Ação: Descumprimento da Curva Pareto 70/30 no Carregamento (Picking)',
    setor: 'Picking',
    prioridade: 'alta',
    responsavel: 'Supervisor de Operações (Picking)',
    status: 'pendente',
    limiteEm: '2026-07-28',
    criadoEm: '2026-07-24T08:00:00.000Z',
    origemAlertaId: 'alt_pareto_carregamento_70_30',
    descricao: `[ALERTA AUTOMÁTICO - DESCUMPRIMENTO DA CURVA PARETO 70/30]
📅 Registro de Ocorrência Operacional no Picking / Carregamento Ativo vs Após
📍 Estágio: Carregamento Ativo vs Após (Distribuição de Volume por Etapa)

📊 Métrica Apurada:
• Durante Carregamento: 26% (115 PL)
• Após Carregamento: 74% (325 PL)

🎯 Meta Estipulada (Pareto 70/30):
• Mínimo 70% Durante o Carregamento
• Máximo 30% Após o Carregamento

⚠️ Análise do Desvio:
A proporção de separação realizada 'Após Carregamento' (74%) ultrapassou drasticamente a cota máxima permitida de 30%, resultando em gargalo no pós-embarque.

💡 Plano de Ação Recomendado:
1. Reorganizar a fila de reabastecimento de picking antes do início da janela de carregamento.
2. Escalar 1 operador extra para montagem prévia dos paletes de maior giro (MVA).
3. Realizar auditoria de sincronismo entre conferência e equipe de pátio.`
  }
];

export default function ControlePanel({ user, empresa, initialSection }: ControlePanelProps) {
  // Navigation: 'hub' shows the main interactive landing dashboard
  // 'dash', 'timer', 'audit', 'ranking', 'normas' represent the active functional views of Repack
  const [currentSection, setCurrentSection] = useState<'hub' | 'dash' | 'timer' | 'audit' | 'ranking' | 'normas' | 'colaboradores' | 'primeiro_acesso' | 'acoes' | 'alertas'>(initialSection || 'colaboradores');
  const [acoesSubTab, setAcoesSubTab] = useState<'planos' | 'alertas'>(initialSection === 'alertas' ? 'alertas' : 'planos');
  const [selectedMetricTab, setSelectedMetricTab] = useState<'logistica' | 'quebras' | 'repack' | 'outros'>('logistica');
  
  // Ações & Alertas State
  const [acoesList, setAcoesList] = useState<any[]>(DEFAULT_ACOES);
  const [selectedAcaoSetor, setSelectedAcaoSetor] = useState<string>('todos');
  const [selectedAcaoStatus, setSelectedAcaoStatus] = useState<string>('todos');
  const [acaoSearchQuery, setAcaoSearchQuery] = useState<string>('');
  const [alertCategoriaFilter, setAlertCategoriaFilter] = useState<string>('todos');

  // Modal State for creating/editing action
  const [showAcaoModal, setShowAcaoModal] = useState(false);
  const [acaoModalTitle, setAcaoModalTitle] = useState('');
  const [acaoModalDesc, setAcaoModalDesc] = useState('');
  const [acaoModalSetor, setAcaoModalSetor] = useState('Repack');
  const [acaoModalResp, setAcaoModalResp] = useState('');
  const [acaoModalPrioridade, setAcaoModalPrioridade] = useState<'alta' | 'media' | 'baixa'>('alta');
  const [acaoModalLimite, setAcaoModalLimite] = useState('');
  const [acaoModalOrigem, setAcaoModalOrigem] = useState<'alerta' | 'sugestao' | 'manual' | 'a3'>('manual');
  const [acaoModalAlertId, setAcaoModalAlertId] = useState<string | undefined>(undefined);
  const [savingAcao, setSavingAcao] = useState(false);
  
  // Collaborator Management State
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [newMatricula, setNewMatricula] = useState('');
  const [newNome, setNewNome] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newSenha, setNewSenha] = useState('');
  const [newFuncao, setNewFuncao] = useState('repack');
  const [editingColabId, setEditingColabId] = useState<string | null>(null);
  const [registeringColab, setRegisteringColab] = useState(false);
  const [colabMsg, setColabMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [confirmColabId, setConfirmColabId] = useState<string | null>(null);
  const [confirmRepackId, setConfirmRepackId] = useState<string | null>(null);
  const [confirmAuditId, setConfirmAuditId] = useState<string | null>(null);

  // Primeiro Acesso (First-time login) State
  const [paMatricula, setPaMatricula] = useState('');
  const [paNome, setPaNome] = useState('');
  const [paEmail, setPaEmail] = useState('');
  const [paFuncao, setPaFuncao] = useState('repack');
  const [paMsg, setPaMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [registeringPa, setRegisteringPa] = useState(false);
  
  // Timer State
  const [embalagem, setEmbalagem] = useState(REPACK_EMBALAGENS[0].nome);
  const [quantidade, setQuantidade] = useState(1);
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [duracao, setDuracao] = useState('00:00:00');
  const [statusMeta, setStatusMeta] = useState('—');
  const [registeringTimer, setRegisteringTimer] = useState(false);

  // Audit State
  const [operadorAuditado, setOperadorAuditado] = useState('');
  const [embalagemAuditada, setEmbalagemAuditada] = useState(REPACK_EMBALAGENS[0].nome);
  const [auditItems, setAuditItems] = useState({
    epis: false,
    organizacao5S: false,
    inspecaoQualidade: false,
    coletaCacos: false,
    loteLegivel: false,
    ergonomia: false,
  });
  const [observacoesAudit, setObservacoesAudit] = useState('');
  const [registeringAudit, setRegisteringAudit] = useState(false);

  // Sync states
  const [repackRows, setRepackRows] = useState<RepackRow[]>([]);
  const [auditRows, setAuditRows] = useState<DpoAudit[]>([]);

  const activeMeta = REPACK_EMBALAGENS.find((e) => e.nome === embalagem)?.meta || '00:00:00';

  // Time conversion helpers
  const pad2 = (num: number) => String(num).padStart(2, '0');
  const toSec = (hms: string) => {
    const [h = 0, m = 0, s = 0] = String(hms).split(':').map(Number);
    return h * 3600 + m * 60 + s;
  };
  const toHMS = (sec: number) => {
    sec = Math.max(0, Math.floor(sec));
    return [Math.floor(sec / 3600), Math.floor((sec % 3600) / 60), sec % 60]
      .map(pad2)
      .join(':');
  };
  const nowHHMMSS = () => {
    const n = new Date();
    return [n.getHours(), n.getMinutes(), n.getSeconds()].map(pad2).join(':');
  };

  const empresaId = empresa?.id || 'demo';

  // 1. Sync Repack collection
  useEffect(() => {
    if (!db) {
      const saved = localStorage.getItem(`repack_rows_${empresaId}`);
      if (saved) setRepackRows(JSON.parse(saved));
      return;
    }

    const q = query(collection(db, 'repack'), where('empresaId', '==', empresaId));
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map(doc => ({ _docId: doc.id, ...doc.data() } as RepackRow));
      rows.sort((a, b) => (b.dataISO || '').localeCompare(a.dataISO || '') || (b.inicio || '').localeCompare(a.inicio || ''));
      setRepackRows(rows);
      localStorage.setItem(`repack_rows_${empresaId}`, JSON.stringify(rows));
    });

    return () => unsub();
  }, [empresaId]);

  // 2. Sync DPO Audits collection
  useEffect(() => {
    if (!db) {
      const saved = localStorage.getItem(`dpo_audits_${empresaId}`);
      if (saved) setAuditRows(JSON.parse(saved));
      return;
    }

    const q = query(collection(db, 'dpo_audits'), where('empresaId', '==', empresaId));
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map(doc => ({ _docId: doc.id, ...doc.data() } as DpoAudit));
      rows.sort((a, b) => (b.dataISO || '').localeCompare(a.dataISO || ''));
      setAuditRows(rows);
      localStorage.setItem(`dpo_audits_${empresaId}`, JSON.stringify(rows));
    });

    return () => unsub();
  }, [empresaId]);

  // 3. Sync Colaboradores collection
  useEffect(() => {
    if (!db) {
      const saved = localStorage.getItem(`colaboradores_${empresaId}`);
      if (saved) setColaboradores(JSON.parse(saved));
      return;
    }

    const q = query(collection(db, 'colaboradores'), where('empresaId', '==', empresaId));
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map(doc => ({ _docId: doc.id, ...doc.data() } as any));
      rows.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
      setColaboradores(rows);
      localStorage.setItem(`colaboradores_${empresaId}`, JSON.stringify(rows));
    });
    return () => unsub();
  }, [empresaId]);

  // 4. Sync Ações (collection: acoes)
  useEffect(() => {
    if (!db) {
      const saved = localStorage.getItem(`acoes_rows_${empresaId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setAcoesList(parsed);
          } else {
            setAcoesList(DEFAULT_ACOES);
            localStorage.setItem(`acoes_rows_${empresaId}`, JSON.stringify(DEFAULT_ACOES));
          }
        } catch {
          setAcoesList(DEFAULT_ACOES);
        }
      } else {
        setAcoesList(DEFAULT_ACOES);
        localStorage.setItem(`acoes_rows_${empresaId}`, JSON.stringify(DEFAULT_ACOES));
      }
      return;
    }

    const q = query(collection(db, 'acoes'), where('empresaId', '==', empresaId));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      list.sort((a: any, b: any) => new Date(b.criadoEm || 0).getTime() - new Date(a.criadoEm || 0).getTime());
      if (list.length === 0) {
        setAcoesList(DEFAULT_ACOES);
        localStorage.setItem(`acoes_rows_${empresaId}`, JSON.stringify(DEFAULT_ACOES));
      } else {
        setAcoesList(list);
        localStorage.setItem(`acoes_rows_${empresaId}`, JSON.stringify(list));
      }
    }, (error) => {
      console.error("Erro no onSnapshot de acoes", error);
      const saved = localStorage.getItem(`acoes_rows_${empresaId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setAcoesList(parsed);
          } else {
            setAcoesList(DEFAULT_ACOES);
          }
        } catch {
          setAcoesList(DEFAULT_ACOES);
        }
      } else {
        setAcoesList(DEFAULT_ACOES);
      }
    });

    return () => unsub();
  }, [empresaId]);

  // Action Plan handlers
  const handleCreateAcao = async () => {
    if (!acaoModalTitle.trim() || !acaoModalDesc.trim()) return;
    setSavingAcao(true);

    const criadoEm = new Date().toISOString();
    const limiteEm = acaoModalLimite || new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const newDoc = {
      empresaId,
      titulo: acaoModalTitle.trim(),
      descricao: acaoModalDesc.trim(),
      setor: acaoModalSetor,
      responsavel: acaoModalResp.trim() || user.nome || 'Supervisor Controle',
      prioridade: acaoModalPrioridade,
      status: 'pendente',
      origem: acaoModalOrigem,
      origemAlertaId: acaoModalAlertId || null,
      criadoEm,
      limiteEm,
      autorNome: user.nome || 'Gestor'
    };

    try {
      if (db) {
        await addDoc(collection(db, 'acoes'), newDoc);
      } else {
        const current = JSON.parse(localStorage.getItem(`acoes_rows_${empresaId}`) || '[]');
        const updated = [{ id: 'local_' + Date.now(), ...newDoc }, ...current];
        localStorage.setItem(`acoes_rows_${empresaId}`, JSON.stringify(updated));
        setAcoesList(updated);
      }
      setShowAcaoModal(false);
      setAcaoModalTitle('');
      setAcaoModalDesc('');
      setAcaoModalResp('');
      setAcaoModalAlertId(undefined);
      setAcoesSubTab('planos');
      setCurrentSection('acoes');
    } catch (err) {
      console.error("Erro ao salvar ação:", err);
    } finally {
      setSavingAcao(false);
    }
  };

  const handleUpdateAcaoStatus = async (id: string, newStatus: string) => {
    try {
      if (db && !id.startsWith('local_')) {
        await updateDoc(doc(db, 'acoes', id), { status: newStatus });
      } else {
        const updated = acoesList.map(a => a.id === id ? { ...a, status: newStatus } : a);
        setAcoesList(updated);
        localStorage.setItem(`acoes_rows_${empresaId}`, JSON.stringify(updated));
      }
    } catch (err) {
      console.error("Erro ao atualizar status da ação:", err);
    }
  };

  const handleDeleteAcao = async (id: string) => {
    try {
      if (db && !id.startsWith('local_')) {
        await deleteDoc(doc(db, 'acoes', id));
      } else {
        const updated = acoesList.filter(a => a.id !== id);
        setAcoesList(updated);
        localStorage.setItem(`acoes_rows_${empresaId}`, JSON.stringify(updated));
      }
    } catch (err) {
      console.error("Erro ao deletar ação:", err);
    }
  };

  const handleOpenAlertActionModal = (alert: any) => {
    setAcaoModalTitle(`Plano de Ação: ${alert.titulo}`);
    setAcaoModalSetor(alert.setor.includes('Repack') ? 'Repack' : alert.setor.includes('Quebras') ? 'Quebras' : alert.setor.includes('Picking') ? 'Picking' : 'Movimentação');
    setAcaoModalDesc(
`[OCORRÊNCIA REGISTRADA #${alert.registroId || 'S/N'}]
📅 Data/Hora: ${alert.dataRegistro || 'Data Atual'} | Turno: ${alert.turno || '1º Turno'}
📍 Local: ${alert.localizacao || 'Setor Operacional'}
🚜 Equipamento/Op: ${alert.equipamentoOp || 'N/A'}
📦 Produtos/SKUs: ${alert.produtosEnvolvidos || 'N/A'}
👤 Registrado por: ${alert.registradoPor || 'Sistema'}
💥 Impacto Estimado: ${alert.impactoEstimado || 'N/A'}

• Gatilho do Desvio: ${alert.gatilho}
• Métrica Detectada: ${alert.metricaAtual} (Meta: ${alert.metaReferencia})
• Causa Provável: ${alert.causaProvavel}
• Recomendação do Plano: ${alert.acaoRecomendada}`
    );
    setAcaoModalPrioridade(alert.severidade === 'CRÍTICO' ? 'alta' : 'media');
    setAcaoModalResp(user.nome || 'Supervisor Controle');
    setAcaoModalLimite(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setAcaoModalOrigem('alerta');
    setAcaoModalAlertId(alert.id);
    setShowAcaoModal(true);
  };

  // Handle duration calculations
  useEffect(() => {
    if (!inicio || !fim) {
      setDuracao('00:00:00');
      setStatusMeta('—');
      return;
    }
    const tot = toSec(fim) - toSec(inicio);
    setDuracao(toHMS(tot));

    const metaSec = toSec(activeMeta) * quantidade;
    if (tot <= metaSec) {
      setStatusMeta('🟢 META BATIDA');
    } else {
      setStatusMeta('🔴 ACIMA DA META');
    }
  }, [inicio, fim, embalagem, quantidade]);

  // Create repack item
  const handleRegisterTimer = async () => {
    if (!inicio || !fim) return;
    setRegisteringTimer(true);

    const today = new Date();
    const dataStr = today.toLocaleDateString('pt-BR');
    const dataISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const newRow: Omit<RepackRow, '_docId'> & { empresaId: string } = {
      empresaId,
      data: dataStr,
      dataISO,
      embalagem,
      quantidade,
      inicio,
      fim,
      duracao,
      meta: activeMeta,
      resultado: statusMeta,
      operador: user.nome,
    };

    try {
      if (db) {
        await addDoc(collection(db, 'repack'), newRow);
      } else {
        const current = [{ _docId: String(Date.now()), ...newRow }, ...repackRows];
        setRepackRows(current);
        localStorage.setItem(`repack_rows_${empresaId}`, JSON.stringify(current));
      }

      setQuantidade(1);
      setInicio('');
      setFim('');
      setDuracao('00:00:00');
      setStatusMeta('—');
      setCurrentSection('dash');
    } catch (e) {
      alert('Erro ao registrar repack: ' + e);
    } finally {
      setRegisteringTimer(false);
    }
  };

  // Create audit item
  const handleRegisterAudit = async () => {
    if (!operadorAuditado.trim()) {
      alert('Por favor, informe o nome do operador auditado.');
      return;
    }
    setRegisteringAudit(true);

    const today = new Date();
    const dataStr = today.toLocaleDateString('pt-BR');
    const dataISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const totalPoints = Object.values(auditItems).filter(Boolean).length;
    const score = Math.round((totalPoints / 6) * 100);
    
    let status: 'EXCELENTE' | 'CONFORME' | 'NAO_CONFORME' = 'NAO_CONFORME';
    if (score === 100) status = 'EXCELENTE';
    else if (score >= 80) status = 'CONFORME';

    const newAudit: Omit<DpoAudit, '_docId'> & { empresaId: string } = {
      empresaId,
      data: dataStr,
      dataISO,
      auditor: user.nome,
      operador: operadorAuditado,
      embalagem: embalagemAuditada,
      pontos: totalPoints,
      score,
      status,
      items: { ...auditItems },
      observacoes: observacoesAudit
    };

    try {
      if (db) {
        await addDoc(collection(db, 'dpo_audits'), newAudit);
      } else {
        const current = [{ _docId: String(Date.now()), ...newAudit }, ...auditRows];
        setAuditRows(current);
        localStorage.setItem(`dpo_audits_${empresaId}`, JSON.stringify(current));
      }

      // Reset fields
      setOperadorAuditado('');
      setAuditItems({
        epis: false,
        organizacao5S: false,
        inspecaoQualidade: false,
        coletaCacos: false,
        loteLegivel: false,
        ergonomia: false,
      });
      setObservacoesAudit('');
      setCurrentSection('dash');
    } catch (e) {
      alert('Erro ao salvar auditoria: ' + e);
    } finally {
      setRegisteringAudit(false);
    }
  };

  const handleRegisterColaborador = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMatricula.trim() || !newNome.trim() || !newSenha.trim() || !newFuncao) {
      setColabMsg({ type: 'err', text: 'Preencha todos os campos obrigatórios.' });
      return;
    }

    setRegisteringColab(true);
    setColabMsg(null);

    const checkExisting = colaboradores.some(c => c._docId !== editingColabId && String(c.matricula).trim() === newMatricula.trim());
    if (checkExisting) {
      setColabMsg({ type: 'err', text: 'Esta matrícula já está cadastrada.' });
      setRegisteringColab(false);
      return;
    }

    if (newEmail.trim()) {
      const checkExistingEmail = colaboradores.some(c => c._docId !== editingColabId && c.email && String(c.email).toLowerCase().trim() === newEmail.toLowerCase().trim());
      if (checkExistingEmail) {
        setColabMsg({ type: 'err', text: 'Este e-mail já está cadastrado.' });
        setRegisteringColab(false);
        return;
      }
    }

    const colabData = {
      empresaId,
      matricula: newMatricula.trim(),
      nome: newNome.trim(),
      email: newEmail.trim().toLowerCase() || null,
      senha: newSenha.trim(),
      funcao: newFuncao,
      updatedAt: new Date().toISOString()
    };

    try {
      if (editingColabId) {
        if (db) {
          await updateDoc(doc(db, 'colaboradores', editingColabId), colabData);
        } else {
          const updatedList = colaboradores.map(c => c._docId === editingColabId ? { ...c, ...colabData } : c);
          setColaboradores(updatedList);
          localStorage.setItem(`colaboradores_${empresaId}`, JSON.stringify(updatedList));
        }
        setColabMsg({ type: 'ok', text: '✅ Colaborador atualizado com sucesso!' });
        setEditingColabId(null);
      } else {
        const newColab = {
          ...colabData,
          createdAt: new Date().toISOString()
        };
        if (db) {
          await addDoc(collection(db, 'colaboradores'), newColab);
        } else {
          const current = [{ _docId: String(Date.now()), ...newColab }, ...colaboradores];
          setColaboradores(current);
          localStorage.setItem(`colaboradores_${empresaId}`, JSON.stringify(current));
        }
        setColabMsg({ type: 'ok', text: '✅ Colaborador cadastrado com sucesso!' });
      }

      setNewMatricula('');
      setNewNome('');
      setNewEmail('');
      setNewSenha('');
      setNewFuncao('repack');
    } catch (err: any) {
      setColabMsg({ type: 'err', text: 'Erro ao salvar: ' + err.message });
    } finally {
      setRegisteringColab(false);
    }
  };

  const handleRegisterPrimeiroAcesso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paMatricula.trim() && !paEmail.trim()) {
      setPaMsg({ type: 'err', text: 'Preencha a Matrícula ou o E-mail para identificar o usuário.' });
      return;
    }
    if (!paNome.trim() || !paFuncao) {
      setPaMsg({ type: 'err', text: 'Preencha todos os campos obrigatórios (Nome Completo e Função).' });
      return;
    }

    setRegisteringPa(true);
    setPaMsg(null);

    // Check duplicated matrícula
    if (paMatricula.trim()) {
      const checkExisting = colaboradores.some(c => String(c.matricula).trim() === paMatricula.trim());
      if (checkExisting) {
        setPaMsg({ type: 'err', text: 'Esta matrícula já está cadastrada.' });
        setRegisteringPa(false);
        return;
      }
    }

    // Check duplicated email
    if (paEmail.trim()) {
      const checkExistingEmail = colaboradores.some(c => c.email && String(c.email).toLowerCase().trim() === paEmail.toLowerCase().trim());
      if (checkExistingEmail) {
        setPaMsg({ type: 'err', text: 'Este e-mail já está cadastrado.' });
        setRegisteringPa(false);
        return;
      }
    }

    const colabData = {
      empresaId,
      matricula: paMatricula.trim() || null,
      nome: paNome.trim(),
      email: paEmail.trim().toLowerCase() || null,
      senha: '', // No password yet, created on first login
      funcao: paFuncao,
      primeiroAcesso: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      if (db) {
        await addDoc(collection(db, 'colaboradores'), colabData);
      } else {
        const current = [{ _docId: String(Date.now()), ...colabData }, ...colaboradores];
        setColaboradores(current);
        localStorage.setItem(`colaboradores_${empresaId}`, JSON.stringify(current));
      }
      setPaMsg({ type: 'ok', text: '✅ Primeiro acesso pré-autorizado com sucesso!' });
      
      setPaMatricula('');
      setPaNome('');
      setPaEmail('');
      setPaFuncao('repack');
    } catch (err: any) {
      setPaMsg({ type: 'err', text: 'Erro ao pré-autorizar: ' + err.message });
    } finally {
      setRegisteringPa(false);
    }
  };

  const handleEditColaborador = (colab: any) => {
    setEditingColabId(colab._docId || null);
    setNewMatricula(colab.matricula || '');
    setNewNome(colab.nome || '');
    setNewEmail(colab.email || '');
    setNewSenha(colab.senha || '');
    setNewFuncao(colab.funcao || 'repack');
    setColabMsg(null);
  };

  const handleDeleteColaborador = async (docId?: string) => {
    if (!docId) return;
    try {
      if (db) {
        await deleteDoc(doc(db, 'colaboradores', docId));
        // Optimistically update the UI list immediately
        setColaboradores(prev => prev.filter(c => c._docId !== docId && c.id !== docId));
      } else {
        const remaining = colaboradores.filter(c => c._docId !== docId && c.id !== docId);
        setColaboradores(remaining);
        localStorage.setItem(`colaboradores_${empresaId}`, JSON.stringify(remaining));
      }
    } catch (err: any) {
      console.error('Erro ao excluir colaborador:', err);
    }
  };

  const handleDeleteRepack = async (docId?: string) => {
    if (!docId) return;
    try {
      if (db) {
        await deleteDoc(doc(db, 'repack', docId));
        // Optimistically update the UI list immediately
        setRepackRows(prev => prev.filter(r => r._docId !== docId && r.id !== docId));
      } else {
        const remaining = repackRows.filter(r => r._docId !== docId && r.id !== docId);
        setRepackRows(remaining);
        localStorage.setItem(`repack_rows_${empresaId}`, JSON.stringify(remaining));
      }
    } catch (e: any) {
      console.error('Erro ao excluir repack:', e);
    }
  };

  const handleDeleteAudit = async (docId?: string) => {
    if (!docId) return;
    try {
      if (db) {
        await deleteDoc(doc(db, 'dpo_audits', docId));
        // Optimistically update the UI list immediately
        setAuditRows(prev => prev.filter(a => a._docId !== docId && a.id !== docId));
      } else {
        const remaining = auditRows.filter(a => a._docId !== docId && a.id !== docId);
        setAuditRows(remaining);
        localStorage.setItem(`dpo_audits_${empresaId}`, JSON.stringify(remaining));
      }
    } catch (e: any) {
      console.error('Erro ao excluir auditoria:', e);
    }
  };

  // Aggregated analytics
  const totalProcessed = repackRows.reduce((sum, r) => sum + (r.quantidade || 0), 0);
  const metRepacksCount = repackRows.filter(r => r.resultado && r.resultado.includes('BATIDA')).length;
  const complianceRate = repackRows.length > 0 ? Math.round((metRepacksCount / repackRows.length) * 100) : 100;
  
  const avgAuditScore = auditRows.length > 0 
    ? Math.round(auditRows.reduce((sum, a) => sum + (a.score || 0), 0) / auditRows.length)
    : 0;

  // Last 7 active days chart formatter
  const getChartData = () => {
    const datesMap: Record<string, { date: string, caixas: number, batidas: number, total: number }> = {};
    
    repackRows.forEach(r => {
      const date = r.data;
      if (!datesMap[date]) {
        datesMap[date] = { date, caixas: 0, batidas: 0, total: 0 };
      }
      datesMap[date].caixas += (r.quantidade || 0);
      datesMap[date].total += 1;
      if (r.resultado && r.resultado.includes('BATIDA')) {
        datesMap[date].batidas += 1;
      }
    });

    const values = Object.values(datesMap);
    return values.length > 0 ? values.slice(-7) : [{ date: 'Sem dados', caixas: 0, batidas: 0, total: 0 }];
  };

  // Operator ranking algorithm
  const getOperatorRankings = () => {
    const ranks: Record<string, { nome: string, boxes: number, metCount: number, total: number, scoreSum: number, scoreCount: number }> = {};

    repackRows.forEach(r => {
      const name = r.operador || 'Operador';
      if (!ranks[name]) {
        ranks[name] = { nome: name, boxes: 0, metCount: 0, total: 0, scoreSum: 0, scoreCount: 0 };
      }
      ranks[name].boxes += (r.quantidade || 0);
      ranks[name].total += 1;
      if (r.resultado && r.resultado.includes('BATIDA')) {
        ranks[name].metCount += 1;
      }
    });

    auditRows.forEach(a => {
      const name = a.operador;
      if (ranks[name]) {
        ranks[name].scoreSum += a.score;
        ranks[name].scoreCount += 1;
      } else {
        ranks[name] = { nome: name, boxes: 0, metCount: 0, total: 0, scoreSum: a.score, scoreCount: 1 };
      }
    });

    return Object.values(ranks).map(item => {
      const compliance = item.total > 0 ? Math.round((item.metCount / item.total) * 100) : 100;
      const avgScore = item.scoreCount > 0 ? Math.round(item.scoreSum / item.scoreCount) : null;
      
      let rankClass: 'BRONZE' | 'PRATA' | 'OURO' | 'PLATINA' = 'BRONZE';
      if (compliance >= 95 && (avgScore === null || avgScore >= 95)) rankClass = 'PLATINA';
      else if (compliance >= 85 && (avgScore === null || avgScore >= 85)) rankClass = 'OURO';
      else if (compliance >= 70 && (avgScore === null || avgScore >= 70)) rankClass = 'PRATA';

      return {
        ...item,
        compliance,
        avgScore,
        rankClass
      };
    }).sort((a, b) => b.boxes - a.boxes || b.compliance - a.compliance);
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* ── TOP ACTION BRAND HEADER ── */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#11151c] to-[#1a212d] border-b border-[#222d3a] rounded-t-xl -mx-6 md:-mx-12 -mt-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#f5a623]/10 border border-[#f5a623]/20 flex items-center justify-center">
            <Zap className="w-4 h-4 text-[#f5a623]" />
          </div>
          <div>
            <span className="font-sans font-black text-xs tracking-widest text-[#f5a623] uppercase block">CONTROLE DE REPACK</span>
            <span className="text-[9px] text-[#6a7d92] tracking-widest uppercase font-bold block mt-0.5">Indicadores de Produtividade, Estabilidade e Segurança</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 bg-[#f5a623]/10 border border-[#f5a623]/20 rounded-full text-[9px] font-black tracking-widest text-[#f5a623] uppercase">
            QUALIDADE ASSEGURADA
          </div>
        </div>
      </div>

      {/* Navigation sub-tabs (only visible when outside of 'hub') */}
      {currentSection !== 'hub' && (
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#222d3a] gap-4 pb-2">
          <div className="flex gap-2 overflow-x-auto scrollbar-none">
            <button 
              onClick={() => setCurrentSection('colaboradores')}
              className={`py-2.5 px-4 font-sans font-bold text-xs uppercase cursor-pointer whitespace-nowrap transition-all rounded-lg flex items-center gap-1.5 ${currentSection === 'colaboradores' ? 'text-[#f5a623] bg-[#f5a623]/10 border border-[#f5a623]/20' : 'text-[#6a7d92] hover:text-[#e8eef5]'}`}
            >
              <Users className="w-3.5 h-3.5" />
              Colaboradores Ativos
            </button>
            <button 
              onClick={() => setCurrentSection('primeiro_acesso')}
              className={`py-2.5 px-4 font-sans font-bold text-xs uppercase cursor-pointer whitespace-nowrap transition-all rounded-lg flex items-center gap-1.5 ${currentSection === 'primeiro_acesso' ? 'text-[#f5a623] bg-[#f5a623]/10 border border-[#f5a623]/20' : 'text-[#6a7d92] hover:text-[#e8eef5]'}`}
            >
              <Plus className="w-3.5 h-3.5 text-[#f5a623]" />
              Login 1º Acesso
            </button>
            <button 
              onClick={() => {
                setCurrentSection('acoes');
              }}
              className={`py-2.5 px-4 font-sans font-bold text-xs uppercase cursor-pointer whitespace-nowrap transition-all rounded-lg flex items-center gap-1.5 ${(currentSection === 'acoes' || currentSection === 'alertas') ? 'text-[#f5a623] bg-[#f5a623]/10 border border-[#f5a623]/20' : 'text-[#6a7d92] hover:text-[#e8eef5]'}`}
            >
              <ListChecks className="w-3.5 h-3.5 text-emerald-400" />
              Gestão de Ações & Alertas
              {acoesList.length > 0 && (
                <span className="px-1.5 py-0.2 text-[9px] font-mono rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {acoesList.length}
                </span>
              )}
            </button>
            <button 
              onClick={() => setCurrentSection('normas')}
              className={`py-2.5 px-4 font-sans font-bold text-xs uppercase cursor-pointer whitespace-nowrap transition-all rounded-lg flex items-center gap-1.5 ${currentSection === 'normas' ? 'text-[#f5a623] bg-[#f5a623]/10 border border-[#f5a623]/20' : 'text-[#6a7d92] hover:text-[#e8eef5]'}`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Métricas & Fórmulas
            </button>
          </div>

          <button 
            onClick={() => setCurrentSection('hub')}
            className="self-start md:self-auto py-2 px-3.5 rounded-lg border border-[#222d3a] hover:border-[#6a7d92] bg-[#151b23] text-xs font-bold text-[#e8eef5] hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar ao Hub
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={currentSection}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.2 }}
        >
          
          {/* ── SECTION 0: INTERACTIVE CENTRAL HUB MENU ── */}
          {currentSection === 'hub' && (
            <div className="flex flex-col gap-6">
              
              {/* Premium Hero Interactive Banner Card */}
              <div className="relative p-6 md:p-8 bg-gradient-to-br from-[#11151c] via-[#161c27] to-[#0d1117] border border-[#222d3a] rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#f5a623]/10 to-transparent rounded-full blur-3xl pointer-events-none" />
                
                <div className="flex-1 flex flex-col gap-3 relative z-10">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#f5a623]/10 border border-[#f5a623]/20 rounded-full text-[9px] font-black tracking-widest text-[#f5a623] uppercase w-fit">
                    <Sparkles className="w-3 h-3 animate-pulse" /> Assistente Co-Pilot Ativo
                  </div>
                  <h2 className="font-sans font-black text-2xl text-snow tracking-tight uppercase leading-none md:text-3xl">
                    Central de Cadastro de Colaboradores
                  </h2>
                  <p className="text-xs text-[#6a7d92] max-w-xl leading-relaxed">
                    Painel oficial de controle e acesso de colaboradores. Cadastre, altere ou remova colaboradores, defina senhas e matrículas de acesso operacionais e administrativas de forma instantânea.
                  </p>
                </div>

                <button
                  onClick={() => setCurrentSection('colaboradores')}
                  className="w-full md:w-auto px-6 py-4 rounded-xl bg-gradient-to-br from-[#f5a623] to-[#d4780a] hover:shadow-[0_4px_24px_rgba(245,166,35,0.3)] text-[#07090d] font-sans font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] group relative z-10"
                >
                  <Users className="w-4 h-4 text-[#07090d]" />
                  Cadastrar Colaboradores
                </button>
              </div>

              {/* Modern Bento Grid Menu for Navigation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                
                {/* 1. Gestão de Colaboradores card */}
                <div 
                  onClick={() => setCurrentSection('colaboradores')}
                  className="g-card p-5 border border-[#222d3a] hover:border-[#f5a623]/40 bg-[#11151c]/60 hover:bg-[#161c27] transition-all duration-300 rounded-2xl cursor-pointer group flex flex-col justify-between min-h-[170px]"
                >
                  <div className="flex justify-between items-start">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Users className="w-5 h-5 text-indigo-400" />
                    </div>
                    <span className="font-mono text-[9px] text-[#6a7d92] font-black tracking-wider uppercase">CONTROLE ACESSO</span>
                  </div>
                  <div>
                    <h3 className="font-sans font-bold text-sm text-snow uppercase tracking-wide group-hover:text-[#f5a623] transition-colors mt-4">
                      Colaboradores Ativos
                    </h3>
                    <p className="text-[11px] text-[#6a7d92] mt-1 leading-relaxed">
                      Gerencie matrículas, senhas e permissões para novos colaboradores acessarem as dependências digitais do armazém.
                    </p>
                  </div>
                </div>

                {/* 2. Pré-Autorizar Primeiro Acesso card */}
                <div 
                  onClick={() => setCurrentSection('primeiro_acesso')}
                  className="g-card p-5 border border-[#222d3a] hover:border-[#f5a623]/40 bg-[#11151c]/60 hover:bg-[#161c27] transition-all duration-300 rounded-2xl cursor-pointer group flex flex-col justify-between min-h-[170px]"
                >
                  <div className="flex justify-between items-start">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Plus className="w-5 h-5 text-[#f5a623]" />
                    </div>
                    <span className="font-mono text-[9px] text-[#6a7d92] font-black tracking-wider uppercase">PRIMEIRO LOGIN</span>
                  </div>
                  <div>
                    <h3 className="font-sans font-bold text-sm text-snow uppercase tracking-wide group-hover:text-[#f5a623] transition-colors mt-4">
                      Autorizar Primeiro Acesso
                    </h3>
                    <p className="text-[11px] text-[#6a7d92] mt-1 leading-relaxed">
                      Pré-autorize novos colaboradores por matrícula, nome ou e-mail para que criem suas senhas no primeiro login.
                    </p>
                  </div>
                </div>

                {/* 3. Gestão de Ações & Alertas card */}
                <div 
                  onClick={() => {
                    setCurrentSection('acoes');
                  }}
                  className="g-card p-5 border border-emerald-500/30 hover:border-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all duration-300 rounded-2xl cursor-pointer group flex flex-col justify-between min-h-[170px]"
                >
                  <div className="flex justify-between items-start">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <ListChecks className="w-5 h-5 text-emerald-400" />
                    </div>
                    <span className="font-mono text-[9px] text-emerald-400 font-black tracking-wider uppercase bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">AÇÕES & ALERTAS</span>
                  </div>
                  <div>
                    <h3 className="font-sans font-bold text-sm text-snow uppercase tracking-wide group-hover:text-emerald-400 transition-colors mt-4">
                      Gestão de Ações & Alertas
                    </h3>
                    <p className="text-[11px] text-[#6a7d92] mt-1 leading-relaxed">
                      Painel unificado para monitoramento de desvios operacionais em tempo real e acompanhamento de todos os planos de ação da plataforma.
                    </p>
                  </div>
                </div>

                {/* 5. Dicionário de Fórmulas e Métricas card */}
                <div 
                  onClick={() => setCurrentSection('normas')}
                  className="g-card p-5 border border-[#222d3a] hover:border-[#f5a623]/40 bg-[#11151c]/60 hover:bg-[#161c27] transition-all duration-300 rounded-2xl cursor-pointer group flex flex-col justify-between min-h-[170px]"
                >
                  <div className="flex justify-between items-start">
                    <div className="w-10 h-10 rounded-xl bg-[#f5a623]/10 border border-[#f5a623]/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <BookOpen className="w-5 h-5 text-[#f5a623]" />
                    </div>
                    <span className="font-mono text-[9px] text-[#6a7d92] font-black tracking-wider uppercase">FÓRMULAS & NORMAS</span>
                  </div>
                  <div>
                    <h3 className="font-sans font-bold text-sm text-snow uppercase tracking-wide group-hover:text-[#f5a623] transition-colors mt-4">
                      Métricas & Fórmulas
                    </h3>
                    <p className="text-[11px] text-[#6a7d92] mt-1 leading-relaxed">
                      Visualize o manual de regras e as fórmulas exatas de EFC, EFD, Quebras e Refugo.
                    </p>
                  </div>
                </div>

                {/* 4. Current User Stats Quick Glance */}
                <div className="g-card p-5 bg-[#1a212d]/30 border border-[#222d3a] rounded-2xl flex flex-col justify-between min-h-[170px]">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-snow/5 flex items-center justify-center border border-snow/10">
                      <User className="w-3.5 h-3.5 text-snow" />
                    </div>
                    <div>
                      <span className="text-[10px] text-snow font-bold block leading-none">{user.nome}</span>
                      <span className="text-[8px] text-[#6a7d92] uppercase font-semibold block mt-0.5">Operador Atual</span>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-[#222d3a]/60">
                    <div className="flex justify-between items-center py-1">
                      <span className="text-[9px] text-[#6a7d92] uppercase">Compliance Geral:</span>
                      <span className="font-mono text-xs text-green font-bold">{complianceRate}%</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-[9px] text-[#6a7d92] uppercase">Repacks salvos:</span>
                      <span className="font-mono text-xs text-[#f5a623] font-bold">{totalProcessed} cx</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-[9px] text-[#6a7d92] uppercase">Auditorias Realizadas:</span>
                      <span className="font-mono text-xs text-cyan font-bold">{auditRows.length}</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ── SECTION 1: DASHBOARD OVERVIEW ── */}
          {currentSection === 'dash' && (
            <div className="flex flex-col gap-6">
              
              {/* Core metrics row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="g-card p-4.5 border-l-4 border-l-[#f5a623]">
                  <span className="text-[9px] uppercase font-bold text-[#6a7d92] tracking-widest block">ÍNDICE DE CONFORMIDADE</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="font-mono text-3xl font-black text-snow">{complianceRate}%</span>
                    <span className="text-[10px] font-bold text-[#22c55e]">Meta: 90%</span>
                  </div>
                  <div className="w-full bg-[#151b23] h-1.5 rounded-full mt-3 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${complianceRate >= 90 ? 'bg-[#22c55e]' : complianceRate >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                      style={{ width: `${complianceRate}%` }}
                    />
                  </div>
                </div>

                <div className="g-card p-4.5 border-l-4 border-l-cyan">
                  <span className="text-[9px] uppercase font-bold text-[#6a7d92] tracking-widest block">TOTAL REBALADO</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="font-mono text-3xl font-black text-snow">{totalProcessed}</span>
                    <span className="text-[10px] font-bold text-[#6a7d92]">Caixas</span>
                  </div>
                  <span className="text-[10px] text-[#6a7d92] mt-2 block">
                    Soma global de caixas recuperadas
                  </span>
                </div>

                <div className="g-card p-4.5 border-l-4 border-l-green">
                  <span className="text-[9px] uppercase font-bold text-[#6a7d92] tracking-widest block">MÉDIA DE AUDITORIAS</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="font-mono text-3xl font-black text-snow">{avgAuditScore}%</span>
                    <span className="text-[10px] font-bold text-green">Meta: &gt;=85%</span>
                  </div>
                  <div className="w-full bg-[#151b23] h-1.5 rounded-full mt-3 overflow-hidden">
                    <div 
                      className="h-full bg-green rounded-full transition-all duration-500"
                      style={{ width: `${avgAuditScore}%` }}
                    />
                  </div>
                </div>

                <div className="g-card p-4.5 border-l-4 border-l-violet">
                  <span className="text-[9px] uppercase font-bold text-[#6a7d92] tracking-widest block">AUDITORIAS CONCLUÍDAS</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="font-mono text-3xl font-black text-snow">{auditRows.length}</span>
                    <span className="text-[10px] font-bold text-[#6a7d92]">Avaliações</span>
                  </div>
                  <span className="text-[10px] text-[#6a7d92] mt-2 block">
                    Processo de estabilidade auditado
                  </span>
                </div>
              </div>

              {/* Chart & History Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Repack Volume Area Chart */}
                <div className="g-card p-5 lg:col-span-2 flex flex-col gap-4">
                  <div>
                    <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-[#f5a623] flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4" /> Histórico de Recuperação (Últimos Dias)
                    </h4>
                    <p className="text-[10px] text-[#6a7d92]">Gráfico de caixas recuperadas por dia de operação pátio</p>
                  </div>
                  
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={getChartData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorCaixas" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f5a623" stopOpacity={0.25}/>
                            <stop offset="95%" stopColor="#f5a623" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#1c2530" vertical={false} />
                        <XAxis dataKey="date" stroke="#6a7d92" fontSize={9} tickLine={false} />
                        <YAxis stroke="#6a7d92" fontSize={9} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#11151c', border: '1px solid #222d3a', borderRadius: '8px' }}
                          labelStyle={{ color: '#f5a623', fontWeight: 'bold', fontSize: 10 }}
                          itemStyle={{ color: '#fff', fontSize: 10 }}
                        />
                        <Area type="monotone" dataKey="caixas" name="Caixas Repack" stroke="#f5a623" strokeWidth={2} fillOpacity={1} fill="url(#colorCaixas)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Audit Scoring Summary Card */}
                <div className="g-card p-5 flex flex-col gap-4 justify-between">
                  <div>
                    <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-green flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4" /> Ficha de Auditoria
                    </h4>
                    <p className="text-[10px] text-[#6a7d92] mt-0.5">Resultado global do processo de embalagens</p>
                  </div>

                  <div className="flex flex-col gap-4 my-auto">
                    <div className="flex justify-between items-center py-2 border-b border-[#222d3a]">
                      <span className="text-xs text-[#e8eef5] flex items-center gap-1.5">🌟 Perfeito (100%)</span>
                      <span className="font-mono text-xs font-black text-green bg-green/10 px-2 py-0.5 rounded border border-green/10">
                        {auditRows.filter(a => a.status === 'EXCELENTE').length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-[#222d3a]">
                      <span className="text-xs text-[#e8eef5] flex items-center gap-1.5">👍 Conforme (&gt;=80%)</span>
                      <span className="font-mono text-xs font-black text-cyan bg-cyan/10 px-2 py-0.5 rounded border border-cyan/10">
                        {auditRows.filter(a => a.status === 'CONFORME').length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-[#222d3a]">
                      <span className="text-xs text-[#e8eef5] flex items-center gap-1.5">⚠️ Crítico (&lt;80%)</span>
                      <span className="font-mono text-xs font-black text-red-400 bg-red-400/10 px-2 py-0.5 rounded border border-red-400/10">
                        {auditRows.filter(a => a.status === 'NAO_CONFORME').length}
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#151b23] p-3 rounded-lg border border-[#222d3a]">
                    <span className="text-[9px] uppercase font-bold text-[#6a7d92] tracking-wider block">Qualidade Geral</span>
                    <span className="text-[10px] text-snow font-bold mt-1 block">
                      {auditRows.length > 0 
                        ? `${Math.round((auditRows.filter(a => a.status !== 'NAO_CONFORME').length / auditRows.length) * 100)}% das auditorias estão conformes.`
                        : 'Nenhuma auditoria cadastrada.'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Lists section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Repack list table */}
                <div className="g-card p-5 flex flex-col gap-3.5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-[#f5a623] flex items-center gap-1.5">
                      <Layers className="w-4 h-4" /> Lançamentos de Repack
                    </h4>
                    <span className="text-[10px] bg-[#151b23] border border-[#222d3a] px-2.5 py-0.5 rounded-full text-[#6a7d92] font-mono">{repackRows.length} total</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#222d3a] text-[#6a7d92] font-bold uppercase text-[9px] tracking-widest">
                          <th className="py-2.5">Data</th>
                          <th className="py-2.5">Operador</th>
                          <th className="py-2.5">Embalagem</th>
                          <th className="py-2.5 text-center">Caixas</th>
                          <th className="py-2.5">Tempo</th>
                          <th className="py-2.5 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#222d3a]/60 text-[#e8eef5]">
                        {repackRows.slice(0, 10).map((r, i) => (
                          <tr key={r._docId || i} className="hover:bg-[#151b23]/20">
                            <td className="py-2.5 font-mono text-[10px] text-[#6a7d92]">{r.data}</td>
                            <td className="py-2.5 font-semibold max-w-[100px] truncate">{r.operador || '—'}</td>
                            <td className="py-2.5 font-bold text-[#f5a623]">{r.embalagem}</td>
                            <td className="py-2.5 text-center font-bold font-mono">{r.quantidade}</td>
                            <td className="py-2.5 font-mono text-[10px]">
                              <span className={`px-1.5 py-0.5 rounded ${r.resultado && r.resultado.includes('BATIDA') ? 'bg-green/10 text-green border border-green/10' : 'bg-red-500/10 text-red-400 border border-red-500/10'}`}>
                                {r.duracao}
                              </span>
                            </td>
                            <td className="py-2.5 text-right">
                              <button 
                                onClick={() => handleDeleteRepack(r._docId)}
                                className="p-1 px-2 hover:bg-red-500/20 text-[#6a7d92] hover:text-red-400 rounded transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {repackRows.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-[#6a7d92]">Nenhum lançamento registrado.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Audits history list */}
                <div className="g-card p-5 flex flex-col gap-3.5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-green flex items-center gap-1.5">
                      <FileText className="w-4 h-4" /> Fichas de Auditoria Realizadas
                    </h4>
                    <span className="text-[10px] bg-[#151b23] border border-[#222d3a] px-2.5 py-0.5 rounded-full text-[#6a7d92] font-mono">{auditRows.length} total</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#222d3a] text-[#6a7d92] font-bold uppercase text-[9px] tracking-widest">
                          <th className="py-2.5">Data</th>
                          <th className="py-2.5">Operador</th>
                          <th className="py-2.5">Auditor</th>
                          <th className="py-2.5 text-center">Pontos</th>
                          <th className="py-2.5">Resultado</th>
                          <th className="py-2.5 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#222d3a]/60 text-[#e8eef5]">
                        {auditRows.slice(0, 10).map((a, i) => (
                          <tr key={a._docId || i} className="hover:bg-[#151b23]/20">
                            <td className="py-2.5 font-mono text-[10px] text-[#6a7d92]">{a.data}</td>
                            <td className="py-2.5 font-bold">{a.operador}</td>
                            <td className="py-2.5 text-[#6a7d92] truncate max-w-[80px]">{a.auditor}</td>
                            <td className="py-2.5 text-center font-bold font-mono text-cyan">{a.pontos}/6</td>
                            <td className="py-2.5">
                              <span className={`text-[9px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded ${a.status === 'EXCELENTE' ? 'bg-green/10 text-green border border-green/15' : a.status === 'CONFORME' ? 'bg-cyan/10 text-cyan border border-cyan/15' : 'bg-red-500/10 text-red-400 border border-red-500/15'}`}>
                                {a.status}
                              </span>
                            </td>
                            <td className="py-2.5 text-right">
                              <button 
                                onClick={() => handleDeleteAudit(a._docId)}
                                className="p-1 px-2 hover:bg-red-500/20 text-[#6a7d92] hover:text-red-400 rounded transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {auditRows.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-[#6a7d92]">Nenhuma auditoria processada.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ── SECTION 2: TIMER AND REGISTER PANEL ── */}
          {currentSection === 'timer' && (
            <div className="g-card p-6 flex flex-col gap-6 max-w-2xl mx-auto border border-[#222d3a]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center">
                  <Clock className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-sans font-black text-sm tracking-wider uppercase text-[#f5a623]">Cronômetro de Repack</h3>
                  <p className="text-xs text-[#6a7d92] mt-0.5">Registre o tempo gasto no repack sob regras do setor</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold tracking-widest text-[#6a7d92] uppercase">Embalagem</label>
                  <select 
                    value={embalagem}
                    onChange={e => setEmbalagem(e.target.value)}
                    className="g-input bg-[#151b23] border-[#1c2530] text-sm"
                  >
                    {REPACK_EMBALAGENS.map((e) => (
                      <option key={e.nome} value={e.nome}>{e.nome} (meta: {e.meta})</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold tracking-widest text-[#6a7d92] uppercase">Quantidade Reembalada (Caixas)</label>
                  <input 
                    type="number"
                    min={1}
                    value={quantidade}
                    onChange={e => setQuantidade(Math.max(1, parseInt(e.target.value) || 0))}
                    className="g-input text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold tracking-widest text-[#6a7d92] uppercase">Hora Inicial</label>
                  <div className="flex gap-2">
                    <input 
                      type="time"
                      step={1}
                      value={inicio}
                      onChange={e => setInicio(e.target.value)}
                      className="g-input flex-1 font-mono text-sm bg-[#151b23]"
                    />
                    <button 
                      type="button" 
                      onClick={() => setInicio(nowHHMMSS())}
                      className="px-3 border border-[#222d3a] hover:border-[#6a7d92] bg-[#151b23] rounded-lg text-xs font-bold text-[#f5a623] cursor-pointer"
                    >
                      ⏱ Agora
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold tracking-widest text-[#6a7d92] uppercase">Hora Final</label>
                  <div className="flex gap-2">
                    <input 
                      type="time"
                      step={1}
                      value={fim}
                      onChange={e => setFim(e.target.value)}
                      className="g-input flex-1 font-mono text-sm bg-[#151b23]"
                    />
                    <button 
                      type="button" 
                      onClick={() => setFim(nowHHMMSS())}
                      className="px-3 border border-[#222d3a] hover:border-[#6a7d92] bg-[#151b23] rounded-lg text-xs font-bold text-[#f5a623] cursor-pointer"
                    >
                      ⏱ Agora
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-[#151b23]/50 border border-[#222d3a] rounded-xl">
                <div className="flex flex-col justify-center">
                  <span className="text-[9px] uppercase font-bold text-[#6a7d92] tracking-wider">Tempo Total Gasto</span>
                  <span className="font-mono text-3xl font-black text-snow mt-1">{duracao}</span>
                </div>
                <div className="flex flex-col justify-center text-right">
                  <span className="text-[9px] uppercase font-bold text-[#6a7d92] tracking-wider block text-right">Status de Produtividade</span>
                  <span className={`font-sans font-black text-sm tracking-wider mt-1 block ${statusMeta.includes('BATIDA') ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                    {statusMeta}
                  </span>
                </div>
              </div>

              <button 
                type="button"
                disabled={registeringTimer || !inicio || !fim}
                onClick={handleRegisterTimer}
                className="w-full py-4 text-sm font-sans font-black uppercase tracking-widest text-[#07090d] bg-gradient-to-br from-[#f5a623] to-[#d4780a] hover:shadow-[0_4px_16px_rgba(245,166,35,0.25)] rounded-xl disabled:opacity-50 cursor-pointer transition-all"
              >
                {registeringTimer ? 'REGISTRANDO OPERAÇÃO...' : '✅ REGISTRAR PRODUTIVIDADE REPACK'}
              </button>
            </div>
          )}

          {/* ── SECTION 3: AUDIT CHECKLIST ── */}
          {currentSection === 'audit' && (
            <div className="g-card p-6 flex flex-col gap-6 max-w-2xl mx-auto border border-[#222d3a]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green/10 rounded-lg flex items-center justify-center">
                  <Clipboard className="w-4 h-4 text-green" />
                </div>
                <div>
                  <h3 className="font-sans font-black text-sm tracking-wider uppercase text-green">Ficha de Auditoria de Processo</h3>
                  <p className="text-xs text-[#6a7d92] mt-0.5">Auditoria física do posto de repack de acordo com as normas de logística</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold tracking-widest text-[#6a7d92] uppercase">Colaborador / Operador Auditado *</label>
                  <input 
                    type="text"
                    value={operadorAuditado}
                    onChange={e => setOperadorAuditado(e.target.value)}
                    placeholder="Nome do operador que executa o repack"
                    className="g-input text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold tracking-widest text-[#6a7d92] uppercase">Embalagem sob Auditoria</label>
                  <select 
                    value={embalagemAuditada}
                    onChange={e => setEmbalagemAuditada(e.target.value)}
                    className="g-input bg-[#151b23] border-[#1c2530] text-sm"
                  >
                    {REPACK_EMBALAGENS.map((e) => (
                      <option key={e.nome} value={e.nome}>{e.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Checklist */}
              <div className="flex flex-col gap-3">
                <span className="text-[10px] font-bold tracking-widest text-[#6a7d92] uppercase">Itens de Verificação de Conformidade</span>
                
                <div className="grid grid-cols-1 gap-2.5">
                  
                  <label className="flex items-start gap-3 p-3 bg-[#151b23]/50 border border-[#222d3a] rounded-xl cursor-pointer hover:bg-[#151b23] transition-colors select-none">
                    <input 
                      type="checkbox"
                      checked={auditItems.epis}
                      onChange={e => setAuditItems(prev => ({ ...prev, epis: e.target.checked }))}
                      className="mt-1 accent-[#f5a623]"
                    />
                    <div>
                      <span className="font-sans font-bold text-xs text-snow block uppercase tracking-wide">1. EPI Completo Obrigatório</span>
                      <span className="text-[10px] text-[#6a7d92] block mt-0.5">O operador está com luva anticorte de malha de aço/nitrílica, óculos de proteção, protetor auricular e bota com biqueira de composite.</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 bg-[#151b23]/50 border border-[#222d3a] rounded-xl cursor-pointer hover:bg-[#151b23] transition-colors select-none">
                    <input 
                      type="checkbox"
                      checked={auditItems.organizacao5S}
                      onChange={e => setAuditItems(prev => ({ ...prev, organizacao5S: e.target.checked }))}
                      className="mt-1 accent-[#f5a623]"
                    />
                    <div>
                      <span className="font-sans font-bold text-xs text-snow block uppercase tracking-wide">2. Área Organizada (5S)</span>
                      <span className="text-[10px] text-[#6a7d92] block mt-0.5">O posto de repack está limpo, livre de líquidos derramados nas proximidades e sem cacos espalhados no chão ou na mesa.</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 bg-[#151b23]/50 border border-[#222d3a] rounded-xl cursor-pointer hover:bg-[#151b23] transition-colors select-none">
                    <input 
                      type="checkbox"
                      checked={auditItems.inspecaoQualidade}
                      onChange={e => setAuditItems(prev => ({ ...prev, inspecaoQualidade: e.target.checked }))}
                      className="mt-1 accent-[#f5a623]"
                    />
                    <div>
                      <span className="font-sans font-bold text-xs text-snow block uppercase tracking-wide">3. Inspeção de Garrafas / Latas</span>
                      <span className="text-[10px] text-[#6a7d92] block mt-0.5">O operador inspeciona cada item, rejeitando qualquer lata amassada ou garrafa com tampa violada, vazamento ou sem rótulo original.</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 bg-[#151b23]/50 border border-[#222d3a] rounded-xl cursor-pointer hover:bg-[#151b23] transition-colors select-none">
                    <input 
                      type="checkbox"
                      checked={auditItems.coletaCacos}
                      onChange={e => setAuditItems(prev => ({ ...prev, coletaCacos: e.target.checked }))}
                      className="mt-1 accent-[#f5a623]"
                    />
                    <div>
                      <span className="font-sans font-bold text-xs text-snow block uppercase tracking-wide">4. Segregação e Descarte de Cacos</span>
                      <span className="text-[10px] text-[#6a7d92] block mt-0.5">Todos os vidros quebrados gerados são descartados instantaneamente dentro do tambor de descarte de cacos identificado.</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 bg-[#151b23]/50 border border-[#222d3a] rounded-xl cursor-pointer hover:bg-[#151b23] transition-colors select-none">
                    <input 
                      type="checkbox"
                      checked={auditItems.loteLegivel}
                      onChange={e => setAuditItems(prev => ({ ...prev, loteLegivel: e.target.checked }))}
                      className="mt-1 accent-[#f5a623]"
                    />
                    <div>
                      <span className="font-sans font-bold text-xs text-snow block uppercase tracking-wide">5. Carimbo de Lote e Validade</span>
                      <span className="text-[10px] text-[#6a7d92] block mt-0.5">As caixas montadas do repack recebem carimbo com lote do fabricante e validade legível correspondente ao lote físico das garrafas.</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 bg-[#151b23]/50 border border-[#222d3a] rounded-xl cursor-pointer hover:bg-[#151b23] transition-colors select-none">
                    <input 
                      type="checkbox"
                      checked={auditItems.ergonomia}
                      onChange={e => setAuditItems(prev => ({ ...prev, ergonomia: e.target.checked }))}
                      className="mt-1 accent-[#f5a623]"
                    />
                    <div>
                      <span className="font-sans font-bold text-xs text-snow block uppercase tracking-wide">6. Ergonomia no Posto</span>
                      <span className="text-[10px] text-[#6a7d92] block mt-0.5">A bancada possui altura adequada e o operador levanta os engradados mantendo as costas eretas e flexionando os joelhos.</span>
                    </div>
                  </label>

                </div>
              </div>

              {/* Score Preview */}
              {(() => {
                const checkedCount = Object.values(auditItems).filter(Boolean).length;
                const scorePct = Math.round((checkedCount / 6) * 100);
                return (
                  <div className="flex items-center justify-between p-4 bg-[#151b23] border border-[#222d3a] rounded-xl">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-[#6a7d92] tracking-wider block">Nota de Conformidade</span>
                      <span className="text-xl font-bold font-mono text-cyan mt-0.5 block">{scorePct}%</span>
                    </div>
                    <span className={`text-[10px] font-black tracking-widest px-3 py-1.5 rounded-lg border ${scorePct === 100 ? 'bg-green/15 text-green border-green/20' : scorePct >= 80 ? 'bg-cyan/15 text-cyan border-cyan/20' : 'bg-red-500/15 text-red-400 border-red-500/20'}`}>
                      {scorePct === 100 ? '🌟 EXCELENTE (CONFORME)' : scorePct >= 80 ? '👍 CONFORME' : '⚠️ CRÍTICO (NÃO CONFORME)'}
                    </span>
                  </div>
                );
              })()}

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold tracking-widest text-[#6a7d92] uppercase">Observações Operacionais</label>
                <textarea 
                  rows={2}
                  value={observacoesAudit}
                  onChange={e => setObservacoesAudit(e.target.value)}
                  placeholder="Escreva eventuais desvios de segurança ou qualidade observados..."
                  className="g-input text-sm p-3.5"
                />
              </div>

              <button 
                type="button"
                disabled={registeringAudit}
                onClick={handleRegisterAudit}
                className="w-full py-4 text-sm font-sans font-black uppercase tracking-widest text-[#07090d] bg-gradient-to-br from-green to-[#16a34a] hover:shadow-[0_4px_16px_rgba(34,197,94,0.25)] rounded-xl disabled:opacity-50 cursor-pointer transition-all"
              >
                {registeringAudit ? 'SALVANDO AUDITORIA...' : '💾 GRAVAR FICHA DE AUDITORIA'}
              </button>
            </div>
          )}

          {/* ── SECTION 4: OPERATOR LEADERBOARD ── */}
          {currentSection === 'ranking' && (
            <div className="g-card p-6 flex flex-col gap-6 border border-[#222d3a]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center">
                  <Award className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-sans font-black text-sm tracking-wider uppercase text-[#f5a623]">Ranking de Operadores</h3>
                  <p className="text-xs text-[#6a7d92] mt-0.5">Produtividade acumulada e assertividade em auditorias operacionais</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs min-w-[700px]">
                  <thead>
                    <tr className="bg-[#151b23] border-b border-[#222d3a] text-[#6a7d92] font-black uppercase text-[10px] tracking-widest">
                      <th className="p-4">Colaborador</th>
                      <th className="p-4 text-center">Caixas Reembaladas</th>
                      <th className="p-4 text-center">Meta Compliance %</th>
                      <th className="p-4 text-center">Score Médio</th>
                      <th className="p-4 text-center">Classificação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222d3a]">
                    {getOperatorRankings().map((item, index) => (
                      <tr key={index} className="hover:bg-[#151b23]/30">
                        <td className="p-4 flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold font-mono text-[10px] ${index === 0 ? 'bg-[#f5a623] text-[#07090d]' : index === 1 ? 'bg-slate-300 text-[#07090d]' : index === 2 ? 'bg-amber-700 text-snow' : 'bg-[#151b23] border border-[#222d3a]'}`}>
                            {index + 1}
                          </span>
                          <span className="font-bold text-snow text-sm">{item.nome}</span>
                        </td>
                        <td className="p-4 text-center font-black text-sm text-[#e8eef5] font-mono">{item.boxes} caixas</td>
                        <td className="p-4 text-center">
                          <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${item.compliance >= 90 ? 'bg-green/10 text-green' : 'bg-red-500/10 text-red-400'}`}>
                            {item.compliance}%
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="font-mono text-sm text-[#e1e7ed] font-semibold">
                            {item.avgScore !== null ? `${item.avgScore}%` : 'S/ Audit'}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`text-[9px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full border ${item.rankClass === 'PLATINA' ? 'bg-[#a78bfa]/10 text-[#a78bfa] border-[#a78bfa]/20 shadow-[0_0_12px_rgba(167,139,250,0.2)]' : item.rankClass === 'OURO' ? 'bg-[#f5a623]/10 text-[#f5a623] border-[#f5a623]/20 shadow-[0_0_12px_rgba(245,166,35,0.2)]' : item.rankClass === 'PRATA' ? 'bg-slate-300/10 text-slate-300 border-slate-300/20' : 'bg-amber-800/15 text-amber-600 border-amber-800/20'}`}>
                            🎗 {item.rankClass}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {getOperatorRankings().length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-[#6a7d92]">Nenhum operador com dados computados ainda.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── SECTION 5: TECHNICAL MANUAL ── */}
          {currentSection === 'normas' && (
            <div className="flex flex-col gap-6">
              
              {/* ── DICIONÁRIO DE MÉTRICAS E FÓRMULAS OPERACIONAIS ── */}
              <div className="g-card p-6 flex flex-col gap-5 border-l-2 border-l-[#f5a623]">
                <div className="flex items-center gap-3 border-b border-[#222d3a] pb-3 flex-wrap justify-between gap-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#f5a623]/10 flex items-center justify-center text-[#f5a623]">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-sans font-black text-sm tracking-wider uppercase text-[#f5a623]">Dicionário de Métricas e Fórmulas Operacionais</h3>
                      <p className="text-[10px] text-[#6a7d92] font-semibold mt-0.5">Entenda como cada indicador de gestão e logística é medido e calculado de forma automatizada no sistema.</p>
                    </div>
                  </div>
                  
                  {/* Tabs selectors */}
                  <div className="flex bg-[#0f141c] border border-[#222d3a] p-1 rounded-xl gap-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setSelectedMetricTab('logistica')}
                      className={`px-3 py-1.5 rounded-lg font-sans font-black text-[9px] uppercase tracking-wider transition-all cursor-pointer ${selectedMetricTab === 'logistica' ? 'bg-[#f5a623] text-[#07090d] shadow-xs' : 'text-[#6a7d92] hover:text-white bg-transparent border-none'}`}
                    >
                      📊 Logística (EFC/EFD)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedMetricTab('quebras')}
                      className={`px-3 py-1.5 rounded-lg font-sans font-black text-[9px] uppercase tracking-wider transition-all cursor-pointer ${selectedMetricTab === 'quebras' ? 'bg-[#f5a623] text-[#07090d] shadow-xs' : 'text-[#6a7d92] hover:text-white bg-transparent border-none'}`}
                    >
                      💥 Quebras (Perdas)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedMetricTab('repack')}
                      className={`px-3 py-1.5 rounded-lg font-sans font-black text-[9px] uppercase tracking-wider transition-all cursor-pointer ${selectedMetricTab === 'repack' ? 'bg-[#f5a623] text-[#07090d] shadow-xs' : 'text-[#6a7d92] hover:text-white bg-transparent border-none'}`}
                    >
                      🔄 Repack & Refugo
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedMetricTab('outros')}
                      className={`px-3 py-1.5 rounded-lg font-sans font-black text-[9px] uppercase tracking-wider transition-all cursor-pointer ${selectedMetricTab === 'outros' ? 'bg-[#f5a623] text-[#07090d] shadow-xs' : 'text-[#6a7d92] hover:text-white bg-transparent border-none'}`}
                    >
                      💼 Outros Indicadores
                    </button>
                  </div>
                </div>

                {/* Content of the selected Tab */}
                {selectedMetricTab === 'logistica' && (
                  <div className="flex flex-col gap-6 animate-fadeIn">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      {/* EFC Box */}
                      <div className="p-4 bg-[#151b23] border border-[#222d3a] rounded-xl flex flex-col gap-3">
                        <div className="flex items-center gap-2 text-xs font-black text-white uppercase tracking-wider">
                          <Percent className="w-4 h-4 text-emerald-400" />
                          <span>EFC — Eficiência de Faturamento e Carregamento</span>
                        </div>
                        <p className="text-[11px] text-[#6a7d92] leading-relaxed">
                          Mede o nível de cumprimento da janela horária para os caminhões expedidos com mercadorias. Garante que os processos de faturamento e carregamento ocorram no tempo planejado de operação.
                        </p>
                        <div className="bg-[#0f141c] p-3 rounded-lg border border-[#222d3a] flex flex-col items-center justify-center my-1">
                          <span className="text-[9px] font-black uppercase text-[#6a7d92] tracking-widest mb-2">Fórmula Matemática</span>
                          <div className="flex flex-col items-center font-mono text-[10px] text-snow">
                            <span className="pb-1 border-b border-gray-600 text-center px-4">Qtd. Carregamentos Dentro da Janela</span>
                            <span className="pt-1 text-center px-4">Total de Carregamentos Realizados</span>
                          </div>
                          <span className="text-xs font-black text-emerald-400 mt-2">× 100</span>
                        </div>
                        <div className="text-[10px] text-gray-400 leading-normal flex flex-col gap-1.5 border-t border-[#222d3a] pt-2">
                          <div>• <strong>Dentro da Janela:</strong> Operações de carregamento identificadas no sistema com status regular de janela ativa.</div>
                          <div>• <strong>Meta Operacional:</strong> Manter-se acima de <strong className="text-emerald-400">85.0%</strong> para evitar penalidades comerciais e retenção de frotas.</div>
                        </div>
                      </div>

                      {/* EFD Box */}
                      <div className="p-4 bg-[#151b23] border border-[#222d3a] rounded-xl flex flex-col gap-3">
                        <div className="flex items-center gap-2 text-xs font-black text-white uppercase tracking-wider">
                          <Percent className="w-4 h-4 text-sky-400" />
                          <span>EFD — Eficiência de Faturamento de Descarga</span>
                        </div>
                        <p className="text-[11px] text-[#6a7d92] leading-relaxed">
                          Mede o cumprimento das janelas horárias destinadas ao recebimento de materiais e insumos de fornecedores externos, otimizando a rotatividade de docas de descarregamento.
                        </p>
                        <div className="bg-[#0f141c] p-3 rounded-lg border border-[#222d3a] flex flex-col items-center justify-center my-1">
                          <span className="text-[9px] font-black uppercase text-[#6a7d92] tracking-widest mb-2">Fórmula Matemática</span>
                          <div className="flex flex-col items-center font-mono text-[10px] text-snow">
                            <span className="pb-1 border-b border-gray-600 text-center px-4">Qtd. Descarregamentos Dentro da Janela</span>
                            <span className="pt-1 text-center px-4">Total de Descarregamentos Realizados</span>
                          </div>
                          <span className="text-xs font-black text-sky-400 mt-2">× 100</span>
                        </div>
                        <div className="text-[10px] text-gray-400 leading-normal flex flex-col gap-1.5 border-t border-[#222d3a] pt-2">
                          <div>• <strong>Critério do Dashboard:</strong> Calcula o percentual agrupando todos os registros filtrados pelo tipo operacional de "Descarregamento".</div>
                          <div>• <strong>Tempo de Permanência:</strong> Alvo ideal menor que 10 minutos em doca de entrada para recepção física de carga.</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedMetricTab === 'quebras' && (
                  <div className="flex flex-col gap-6 animate-fadeIn">
                    <div className="p-4 bg-[#151b23] border border-[#222d3a] rounded-xl flex flex-col gap-4">
                      <div className="flex items-center gap-2 text-xs font-black text-white uppercase tracking-wider border-b border-[#222d3a] pb-2">
                        <TrendingUp className="w-4 h-4 text-amber-500" />
                        <span>Distribuição de Quebras por Área Operacional</span>
                      </div>
                      <p className="text-xs text-[#6a7d92] leading-relaxed">
                        As perdas físicas no recinto do armazém (garrafas quebradas, fardos rompidos ou avarias no estoque) são registradas pelo time através de formulários digitais. O sistema então compila a representatividade percentual das perdas por área do armazém.
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
                        <div className="bg-[#0f141c] p-4 rounded-xl border border-[#222d3a] flex flex-col justify-center items-center">
                          <span className="text-[9px] font-black uppercase text-[#6a7d92] tracking-widest mb-3">Fórmula de Distribuição por Área (%)</span>
                          <div className="flex flex-col items-center font-mono text-[10px] text-snow">
                            <span className="pb-1 border-b border-gray-600 text-center px-4">Soma das Quebras (Caixas / Itens) na Área X</span>
                            <span className="pt-1 text-center px-4">Soma Total Geral de Quebras Registradas na Empresa</span>
                          </div>
                          <span className="text-xs font-black text-amber-500 mt-2">× 100</span>
                        </div>

                        <div className="flex flex-col gap-2.5">
                          <span className="text-[10px] font-black uppercase text-white tracking-wider">Mapeamento de Ofensores Operacionais:</span>
                          <div className="grid grid-cols-2 gap-2 text-[10px]">
                            <div className="p-2 bg-[#0f141c] rounded-lg border border-[#222d3a]">
                              <span className="text-amber-500 font-extrabold block">📦 BLOCADO / PICKING</span>
                              <span className="text-[#6a7d92]">Avarias comuns por manuseio rápido ou desalinhamento de paletes nas gôndolas de separação.</span>
                            </div>
                            <div className="p-2 bg-[#0f141c] rounded-lg border border-[#222d3a]">
                              <span className="text-sky-400 font-extrabold block">🚚 DOCAS / CARGA</span>
                              <span className="text-[#6a7d92]">Ocorre durante a colocação dos paletes no interior do baú de caminhões de entrega.</span>
                            </div>
                            <div className="p-2 bg-[#0f141c] rounded-lg border border-[#222d3a]">
                              <span className="text-emerald-400 font-extrabold block">🏬 RECON / REPACK</span>
                              <span className="text-[#6a7d92]">Perdas registradas no processo de reembalagem física e segregação de avarias físicas.</span>
                            </div>
                            <div className="p-2 bg-[#0f141c] rounded-lg border border-[#222d3a]">
                              <span className="text-purple-400 font-extrabold block">🚨 BLITZ / PORTARIA</span>
                              <span className="text-[#6a7d92]">Identificação de quebras no recebimento físico de caminhões retornando da rua.</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedMetricTab === 'repack' && (
                  <div className="flex flex-col gap-6 animate-fadeIn">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      {/* Repack Box */}
                      <div className="p-4 bg-[#151b23] border border-[#222d3a] rounded-xl flex flex-col gap-3">
                        <div className="flex items-center gap-2 text-xs font-black text-white uppercase tracking-wider">
                          <Activity className="w-4 h-4 text-violet-400" />
                          <span>Eficiência de Repack (Tempo Médio por Palete)</span>
                        </div>
                        <p className="text-[11px] text-[#6a7d92] leading-relaxed">
                          Calcula o rendimento médio do time focado na reembalagem e recuperação física de produtos avariados, medindo a velocidade de reinserção desses itens recuperados ao estoque.
                        </p>
                        <div className="bg-[#0f141c] p-3 rounded-lg border border-[#222d3a] flex flex-col items-center justify-center my-1">
                          <span className="text-[9px] font-black uppercase text-[#6a7d92] tracking-widest mb-2">Fórmula Matemática</span>
                          <div className="flex flex-col items-center font-mono text-[10px] text-snow">
                            <span className="pb-1 border-b border-gray-600 text-center px-4">Tempo de Atividade de Repack (Minutos)</span>
                            <span className="pt-1 text-center px-4">Total de Paletes ou Caixas Reembaladas</span>
                          </div>
                          <span className="text-[10px] font-black text-violet-400 mt-2">Expresso em Minutos por Unidade (min/Palete)</span>
                        </div>
                        <div className="text-[10px] text-gray-400 leading-normal flex flex-col gap-1 border-t border-[#222d3a] pt-2">
                          <div>• <strong>Nível de Serviço Alvo:</strong> Menor que 15 minutos por palete de garrafa recuperado.</div>
                          <div>• <strong>Governança de Processo:</strong> Aprovado pelo Supervisor e registrado em tempo real pelo operador no painel móvel.</div>
                        </div>
                      </div>

                      {/* Blitz de Refugo Box */}
                      <div className="p-4 bg-[#151b23] border border-[#222d3a] rounded-xl flex flex-col gap-3">
                        <div className="flex items-center gap-2 text-xs font-black text-white uppercase tracking-wider">
                          <Activity className="w-4 h-4 text-rose-400" />
                          <span>Cálculo de Percentual de Refugo (Blitz)</span>
                        </div>
                        <p className="text-[11px] text-[#6a7d92] leading-relaxed">
                          Avalia de forma automatizada o índice de descarte de garrafas retornáveis avariadas ou fora de padrão de mercado (sujeira extrema, desgaste físico excessivo ou quebras) inspecionadas em blitz amostrais.
                        </p>
                        <div className="bg-[#0f141c] p-3 rounded-lg border border-[#222d3a] flex flex-col items-center justify-center my-1">
                          <span className="text-[9px] font-black uppercase text-[#6a7d92] tracking-widest mb-2">Fórmula Matemática</span>
                          <div className="flex flex-col items-center font-mono text-[10px] text-snow">
                            <span className="pb-1 border-b border-gray-600 text-center px-4">Quantidade de Vasilhames Rejeitados / Refugados</span>
                            <span className="pt-1 text-center px-4">Total Geral de Garrafas Inspecionadas no Lote Amostral</span>
                          </div>
                          <span className="text-xs font-black text-rose-400 mt-2">× 100</span>
                        </div>
                        <div className="text-[10px] text-gray-400 leading-normal flex flex-col gap-1 border-t border-[#222d3a] pt-2">
                          <div>• <strong>Tolerância de Qualidade:</strong> O limite tolerado de refugo técnico no lote é de <strong className="text-rose-400">3.5%</strong>. Exceder esse patamar gera alertas imediatos para devoluções.</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedMetricTab === 'outros' && (
                  <div className="flex flex-col gap-6 animate-fadeIn">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      {/* Densidade de Movimentação */}
                      <div className="p-4 bg-[#151b23] border border-[#222d3a] rounded-xl flex flex-col gap-3">
                        <div className="flex items-center gap-2 text-xs font-black text-white uppercase tracking-wider">
                          <Award className="w-4 h-4 text-purple-400" />
                          <span>Média de Paletes por Viagem / Movimentação</span>
                        </div>
                        <p className="text-[11px] text-[#6a7d92] leading-relaxed">
                          Monitora a eficiência de ocupação de garfos de empilhadeira, garantindo que o transporte interno ocorra em sua capacidade ideal, sem desperdício de rotas.
                        </p>
                        <div className="bg-[#0f141c] p-3 rounded-lg border border-[#222d3a] flex flex-col items-center justify-center my-1">
                          <span className="text-[9px] font-black uppercase text-[#6a7d92] tracking-widest mb-2">Fórmula Matemática</span>
                          <div className="flex flex-col items-center font-mono text-[10px] text-snow">
                            <span className="pb-1 border-b border-gray-600 text-center px-4">Soma Geral de Paletes Movimentados</span>
                            <span className="pt-1 text-center px-4">Quantidade Total de Operações (Viagens) Registradas</span>
                          </div>
                        </div>
                        <p className="text-[10px] text-gray-400 border-t border-[#222d3a] pt-2 leading-relaxed">
                          • <strong>Aplicação de Otimização:</strong> Permite o correto dimensionamento das equipes de pátio e das frotas de equipamentos pesados contratados.
                        </p>
                      </div>

                      {/* FEFO */}
                      <div className="p-4 bg-[#151b23] border border-[#222d3a] rounded-xl flex flex-col gap-3">
                        <div className="flex items-center gap-2 text-xs font-black text-white uppercase tracking-wider">
                          <Award className="w-4 h-4 text-teal-400" />
                          <span>Método de Giro FEFO (First Expired, First Out)</span>
                        </div>
                        <p className="text-[11px] text-[#6a7d92] leading-relaxed">
                          Mapeia a criticidade do inventário para que los lotes que expiram primeiro saiam primeiro, mitigando a ocorrência de produtos vencidos no estoque de vendas.
                        </p>
                        <div className="bg-[#0f141c] p-3 rounded-lg border border-[#222d3a] flex flex-col items-center justify-center my-1">
                          <span className="text-[9px] font-black uppercase text-[#6a7d92] tracking-widest mb-2">Cálculo de Criticidade de Validade</span>
                          <span className="font-mono text-[10px] text-teal-300 text-center">Tempo de Vida Útil Restante = Data de Vencimento - Data Atual</span>
                          <span className="text-[10px] text-gray-500 mt-2 text-center block">Classificação de Risco: Crítico (&lt;30 dias), Atenção (30-90 dias), Seguro (&gt;90 dias)</span>
                        </div>
                        <p className="text-[10px] text-gray-400 border-t border-[#222d3a] pt-2 leading-relaxed">
                          • <strong>Prevenção Pró-Ativa:</strong> O sistema bloqueia de forma automática carregamentos de lotes vencidos ou aponta alertas no painel de picking.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Políticas e Segurança cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="g-card p-6 flex flex-col gap-4 border border-[#222d3a]">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center">
                      <FileText className="w-4 h-4 text-[#f5a623]" />
                    </div>
                    <h3 className="font-sans font-black text-sm tracking-wider uppercase text-[#f5a623]">Políticas de Repack</h3>
                  </div>
                  <div className="text-xs text-[#6a7d92] flex flex-col gap-3.5 leading-relaxed">
                    <p>
                      As políticas de <strong>Estabilidade de Depósito</strong> e <strong>Segurança</strong> exigem controle milimétrico e absoluto sobre as operações de repack de garrafas de vidro e latinhas de alumínio.
                    </p>
                    <div>
                      <strong className="text-snow block mb-1">🎯 OBJETIVO DO REPACK:</strong>
                      Recuperar produtos avariados por vazamento ou quebras durante o manuseio. Reduzindo a quebra financeira e gerando caixas mistas ou fechadas 100% íntegras, seguras para faturamento e distribuição ao mercado.
                    </div>
                    <div>
                      <strong className="text-snow block mb-1">⏱ REQUISITOS DE TEMPO (METAS):</strong>
                      A meta é medida por caixa montada. Cada embalagem possui sua meta específica calculada a partir do tempo de montagem e selagem padrão. Qualquer desvio acima da meta aciona sinalização crítica no dashboard operacional.
                    </div>
                  </div>
                </div>

                <div className="g-card p-6 flex flex-col gap-4 border border-[#222d3a]">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center">
                      <ShieldAlert className="w-4 h-4 text-red-400" />
                    </div>
                    <h3 className="font-sans font-black text-sm tracking-wider uppercase text-red-400">Instruções Críticas de Segurança</h3>
                  </div>
                  <div className="text-xs text-[#6a7d92] flex flex-col gap-3.5 leading-relaxed">
                    <div>
                      <strong className="text-snow block mb-1">🛡 LUVA ANTICORTE DE COMPOSITE:</strong>
                      Uso 100% obrigatório no manuseio de garrafas de vidro vazando ou trincadas. Nunca, sob qualquer hipótese, separe cacos de vidro com as mãos desprotegidas ou luva de pano/borracha simples.
                    </div>
                    <div>
                      <strong className="text-snow block mb-1">🗑 FLUXO DE DESCARTE DE CACOS:</strong>
                      Todo resíduo de vidro deve ser colocado no tambor vermelho selado e específico para cacos. A área do posto de repack precisa ser limpa com vassoura e pá a cada término de lote de repacking.
                    </div>
                    <div>
                      <strong className="text-snow block mb-1">🔍 RASTREABILIDADE DE LOTE:</strong>
                      Para garantir que o produto esteja em conformidade no mercado, o operador deve garantir a colagem da nova etiqueta de código de barras e lote legíveis na caixa correspondente.
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ── SECTION 6: GESTÃO DE COLABORADORES ── */}
          {currentSection === 'colaboradores' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
              
              {/* Form Column */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                <div className="g-card p-6 border border-[#222d3a] flex flex-col gap-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-[#222d3a]">
                    <div className="w-8 h-8 bg-[#f5a623]/10 rounded-lg flex items-center justify-center">
                      {editingColabId ? (
                        <Pencil className="w-4 h-4 text-[#f5a623]" />
                      ) : (
                        <Plus className="w-4 h-4 text-[#f5a623]" />
                      )}
                    </div>
                    <h3 className="font-sans font-black text-sm tracking-wider uppercase text-[#f5a623]">
                      {editingColabId ? 'Editar Colaborador' : 'Novo Cadastro'}
                    </h3>
                  </div>

                  <form onSubmit={handleRegisterColaborador} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold tracking-widest text-[#6a7d92] uppercase">Matrícula do Colaborador</label>
                      <input 
                        type="text"
                        required
                        placeholder="Ex: 50928"
                        value={newMatricula}
                        onChange={e => setNewMatricula(e.target.value)}
                        className="g-input"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold tracking-widest text-[#6a7d92] uppercase">Nome Completo</label>
                      <input 
                        type="text"
                        required
                        placeholder="Nome do funcionário"
                        value={newNome}
                        onChange={e => setNewNome(e.target.value)}
                        className="g-input"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold tracking-widest text-[#6a7d92] uppercase">E-mail (Opcional - Para login)</label>
                      <input 
                        type="email"
                        placeholder="Ex: funcionario@empresa.com"
                        value={newEmail}
                        onChange={e => setNewEmail(e.target.value)}
                        className="g-input"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold tracking-widest text-[#6a7d92] uppercase">Senha de Acesso</label>
                      <input 
                        type="password"
                        required
                        placeholder="Mínimo 4 caracteres"
                        value={newSenha}
                        onChange={e => setNewSenha(e.target.value)}
                        className="g-input"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold tracking-widest text-[#6a7d92] uppercase">Função Operacional / Acessos (Selecione um ou mais)</label>
                      <div className="grid grid-cols-1 gap-1.5 p-3 bg-[#151b23] border border-[#222d3a] rounded-xl max-h-56 overflow-y-auto">
                        {[
                          { id: 'repack', label: 'Operação Repack' },
                          { id: 'despejo', label: 'Operação Despejo' },
                          { id: 'armazem', label: 'Operação EFC / EFD' },
                          { id: 'quebras', label: 'Operação Quebras' },
                          { id: 'validades', label: 'Operação Validade' },
                          { id: 'refugo', label: 'Operação Retorno de Rota' },
                          { id: 'empilhador', label: 'Operação Picking' },
                          { id: 'conferente', label: 'Operação Conferênte' },
                          { id: 'controle', label: 'Supervisor Controle' }
                        ].map(op => {
                          const isChecked = newFuncao.split(',').map(s => s.trim()).includes(op.id);
                          return (
                            <label key={op.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-800/40 p-1.5 rounded-lg text-xs text-snow transition-colors">
                              <input 
                                type="checkbox"
                                checked={isChecked}
                                onChange={e => {
                                  const currentRoles = newFuncao ? newFuncao.split(',').map(s => s.trim()).filter(Boolean) : [];
                                  let nextRoles: string[];
                                  if (e.target.checked) {
                                    nextRoles = [...currentRoles, op.id];
                                  } else {
                                    nextRoles = currentRoles.filter(r => r !== op.id);
                                  }
                                  setNewFuncao(nextRoles.join(','));
                                }}
                                className="rounded border-[#222d3a] bg-[#0d1117] text-[#f5a623] focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
                              />
                              <span>{op.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {colabMsg && (
                      <div className={`p-3 rounded-lg text-xs font-semibold ${colabMsg.type === 'ok' ? 'bg-[#22c55e]/10 border border-[#22c55e]/30 text-[#22c55e]' : 'bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444]'}`}>
                        {colabMsg.text}
                      </div>
                    )}

                    <div className="flex flex-col gap-2">
                      <button
                        type="submit"
                        disabled={registeringColab}
                        className="w-full mt-2 py-3 rounded-xl bg-gradient-to-br from-[#f5a623] to-[#d4780a] hover:shadow-[0_4px_16px_rgba(245,166,35,0.25)] text-[#07090d] font-sans font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50"
                      >
                        {editingColabId 
                          ? (registeringColab ? 'Salvando...' : 'Atualizar Colaborador') 
                          : (registeringColab ? 'Cadastrando...' : 'Salvar Colaborador')}
                      </button>

                      {editingColabId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingColabId(null);
                            setNewMatricula('');
                            setNewNome('');
                            setNewEmail('');
                            setNewSenha('');
                            setNewFuncao('repack');
                            setColabMsg(null);
                          }}
                          className="w-full py-2.5 rounded-xl border border-[#222d3a] hover:bg-slate-800 text-slate-400 font-sans font-bold uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 cursor-pointer transition-colors"
                        >
                          Cancelar Edição
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              </div>

              {/* List Column */}
              <div className="lg:col-span-8 flex flex-col gap-4">
                <div className="g-card p-6 border border-[#222d3a] flex flex-col gap-4">
                  <div className="flex items-center justify-between pb-2 border-b border-[#222d3a]">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center">
                        <Users className="w-4 h-4 text-indigo-400" />
                      </div>
                      <div>
                        <h3 className="font-sans font-black text-sm tracking-wider uppercase text-snow">Colaboradores Cadastrados</h3>
                        <p className="text-[10px] text-[#6a7d92]">Controle de acessos ativos</p>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs min-w-[500px]">
                      <thead>
                        <tr className="bg-[#151b23] border-b border-[#222d3a] text-[#6a7d92] font-black uppercase text-[9px] tracking-widest">
                          <th className="p-3">Matrícula</th>
                          <th className="p-3">Nome</th>
                          <th className="p-3 text-center">Função</th>
                          <th className="p-3 text-center">Senha</th>
                          <th className="p-3 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#222d3a]">
                        {colaboradores.filter(c => c.primeiroAcesso !== true).map((colab, idx) => (
                          <tr key={idx} className="hover:bg-[#151b23]/30">
                            <td className="p-3 font-mono font-bold text-snow text-sm">{colab.matricula}</td>
                            <td className="p-3">
                              <div className="flex flex-col">
                                <span className="font-bold text-snow text-sm">{colab.nome}</span>
                                {colab.email && (
                                  <span className="text-[10px] text-[#6a7d92] font-mono">{colab.email}</span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <span className={`text-[9px] font-black tracking-wider uppercase px-2.5 py-1 rounded border ${
                                (colab.funcao || '').includes('controle') 
                                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                                  : (colab.funcao || '').includes('conferente') 
                                    ? 'bg-amber-500/10 text-[#f5a623] border-[#f5a623]/20' 
                                    : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                              }`}>
                                {getFormattedRoles(colab.funcao)}
                              </span>
                            </td>
                            <td className="p-3 text-center font-mono text-[#6a7d92]">{colab.senha}</td>
                            <td className="p-3 text-center flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleEditColaborador(colab)}
                                className="p-2 rounded-lg border border-[#222d3a] hover:border-[#f5a623]/40 bg-[#151b23] hover:bg-[#f5a623]/10 text-[#6a7d92] hover:text-[#f5a623] transition-all cursor-pointer inline-flex items-center justify-center"
                                title="Editar Colaborador"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              {confirmColabId === colab._docId ? (
                                <button
                                  onClick={() => {
                                    handleDeleteColaborador(colab._docId);
                                    setConfirmColabId(null);
                                  }}
                                  className="px-2.5 py-1 text-[10px] uppercase font-black tracking-widest bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-all cursor-pointer"
                                  title="Confirmar Exclusão"
                                >
                                  Certeza?
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setConfirmColabId(colab._docId || null);
                                    setTimeout(() => setConfirmColabId(prev => prev === colab._docId ? null : prev), 4000);
                                  }}
                                  className="p-2 rounded-lg border border-[#222d3a] hover:border-red-500/40 bg-[#151b23] hover:bg-red-500/10 text-[#6a7d92] hover:text-red-400 transition-all cursor-pointer inline-flex items-center justify-center"
                                  title="Remover Colaborador"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                        {colaboradores.filter(c => c.primeiroAcesso !== true).length === 0 && (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-[#6a7d92]">Nenhum colaborador ativo cadastrado ainda. Use o formulário ao lado para cadastrar.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ── SECTION 7: PRÉ-AUTORIZAÇÃO DE PRIMEIRO ACESSO ── */}
          {currentSection === 'primeiro_acesso' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
              
              {/* Form Column */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                <div className="g-card p-6 border border-[#222d3a] flex flex-col gap-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-[#222d3a]">
                    <div className="w-8 h-8 bg-[#f5a623]/10 rounded-lg flex items-center justify-center">
                      <Plus className="w-4 h-4 text-[#f5a623]" />
                    </div>
                    <h3 className="font-sans font-black text-sm tracking-wider uppercase text-[#f5a623]">
                      Pré-Autorizar Acesso
                    </h3>
                  </div>

                  <p className="text-[11px] text-[#6a7d92] leading-relaxed">
                    Insira a matrícula ou e-mail de um novo funcionário para pré-autorizá-lo na plataforma. No primeiro acesso, ele definirá a sua própria senha do sistema.
                  </p>

                  <form onSubmit={handleRegisterPrimeiroAcesso} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold tracking-widest text-[#6a7d92] uppercase">Matrícula (Para identificação)</label>
                      <input 
                        type="text"
                        placeholder="Ex: 50811 (Deixe em branco se usar e-mail)"
                        value={paMatricula}
                        onChange={e => setPaMatricula(e.target.value)}
                        className="g-input"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold tracking-widest text-[#6a7d92] uppercase">Nome Completo *</label>
                      <input 
                        type="text"
                        required
                        placeholder="Nome completo do funcionário"
                        value={paNome}
                        onChange={e => setPaNome(e.target.value)}
                        className="g-input"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold tracking-widest text-[#6a7d92] uppercase">E-mail (Opcional - Para identificação)</label>
                      <input 
                        type="email"
                        placeholder="Ex: colab@paubrasil.com"
                        value={paEmail}
                        onChange={e => setPaEmail(e.target.value)}
                        className="g-input"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold tracking-widest text-[#6a7d92] uppercase">Função Operacional / Acessos * (Selecione uma ou mais)</label>
                      <div className="grid grid-cols-1 gap-1.5 p-3 bg-[#151b23] border border-[#222d3a] rounded-xl max-h-56 overflow-y-auto">
                        {[
                          { id: 'repack', label: 'Operação Repack' },
                          { id: 'despejo', label: 'Operação Despejo' },
                          { id: 'armazem', label: 'Operação EFC / EFD' },
                          { id: 'quebras', label: 'Operação Quebras' },
                          { id: 'validades', label: 'Operação Validade' },
                          { id: 'refugo', label: 'Operação Retorno de Rota' },
                          { id: 'empilhador', label: 'Operação Picking' },
                          { id: 'conferente', label: 'Operação Conferênte' },
                          { id: 'controle', label: 'Supervisor Controle' }
                        ].map(op => {
                          const isChecked = paFuncao.split(',').map(s => s.trim()).includes(op.id);
                          return (
                            <label key={op.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-800/40 p-1.5 rounded-lg text-xs text-snow transition-colors">
                              <input 
                                type="checkbox"
                                checked={isChecked}
                                onChange={e => {
                                  const currentRoles = paFuncao ? paFuncao.split(',').map(s => s.trim()).filter(Boolean) : [];
                                  let nextRoles: string[];
                                  if (e.target.checked) {
                                    nextRoles = [...currentRoles, op.id];
                                  } else {
                                    nextRoles = currentRoles.filter(r => r !== op.id);
                                  }
                                  setPaFuncao(nextRoles.join(','));
                                }}
                                className="rounded border-[#222d3a] bg-[#0d1117] text-[#f5a623] focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
                              />
                              <span>{op.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {paMsg && (
                      <div className={`p-3 rounded-lg text-xs font-semibold ${paMsg.type === 'ok' ? 'bg-[#22c55e]/10 border border-[#22c55e]/30 text-[#22c55e]' : 'bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444]'}`}>
                        {paMsg.text}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={registeringPa}
                      className="w-full mt-2 py-3 rounded-xl bg-gradient-to-br from-[#f5a623] to-[#d4780a] hover:shadow-[0_4px_16px_rgba(245,166,35,0.25)] text-[#07090d] font-sans font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                      {registeringPa ? 'Salvando...' : '⚡ Pré-Autorizar Primeiro Acesso'}
                    </button>
                  </form>
                </div>
              </div>

              {/* List Column */}
              <div className="lg:col-span-8 flex flex-col gap-4">
                <div className="g-card p-6 border border-[#222d3a] flex flex-col gap-4">
                  <div className="flex items-center justify-between pb-2 border-b border-[#222d3a]">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center">
                        <Users className="w-4 h-4 text-indigo-400" />
                      </div>
                      <div>
                        <h3 className="font-sans font-black text-sm tracking-wider uppercase text-snow">Pré-Autorizações Ativas</h3>
                        <p className="text-[10px] text-[#6a7d92]">Lista de funcionários autorizados a definir senha no primeiro login</p>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs min-w-[500px]">
                      <thead>
                        <tr className="bg-[#151b23] border-b border-[#222d3a] text-[#6a7d92] font-black uppercase text-[9px] tracking-widest">
                          <th className="p-3">Matrícula</th>
                          <th className="p-3">Nome</th>
                          <th className="p-3 text-center">Função</th>
                          <th className="p-3 text-center">Status</th>
                          <th className="p-3 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#222d3a]">
                        {colaboradores.filter(c => c.primeiroAcesso === true).map((colab, idx) => (
                          <tr key={idx} className="hover:bg-[#151b23]/30">
                            <td className="p-3 font-mono font-bold text-snow text-sm">{colab.matricula || '—'}</td>
                            <td className="p-3">
                              <div className="flex flex-col">
                                <span className="font-bold text-snow text-sm">{colab.nome}</span>
                                {colab.email && (
                                  <span className="text-[10px] text-[#6a7d92] font-mono">{colab.email}</span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <span className={`text-[9px] font-black tracking-wider uppercase px-2.5 py-1 rounded border ${
                                (colab.funcao || '').includes('controle') 
                                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                                  : (colab.funcao || '').includes('conferente') 
                                    ? 'bg-amber-500/10 text-[#f5a623] border-[#f5a623]/20' 
                                    : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                              }`}>
                                {getFormattedRoles(colab.funcao)}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span className="px-2.5 py-0.5 rounded text-[9px] bg-amber-500/10 text-[#f5a623] border border-[#f5a623]/20 font-black tracking-widest uppercase animate-pulse">
                                AGUARDANDO SENHA
                              </span>
                            </td>
                            <td className="p-3 text-center flex items-center justify-center gap-2">
                              {confirmColabId === colab._docId ? (
                                <button
                                  onClick={() => {
                                    handleDeleteColaborador(colab._docId);
                                    setConfirmColabId(null);
                                  }}
                                  className="px-2.5 py-1 text-[10px] uppercase font-black tracking-widest bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-all cursor-pointer"
                                  title="Confirmar Revogação"
                                >
                                  Certeza?
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setConfirmColabId(colab._docId || null);
                                    setTimeout(() => setConfirmColabId(prev => prev === colab._docId ? null : prev), 4000);
                                  }}
                                  className="p-2 rounded-lg border border-[#222d3a] hover:border-red-500/40 bg-[#151b23] hover:bg-red-500/10 text-[#6a7d92] hover:text-red-400 transition-all cursor-pointer inline-flex items-center justify-center"
                                  title="Revogar Pré-Autorização"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                        {colaboradores.filter(c => c.primeiroAcesso === true).length === 0 && (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-[#6a7d92]">Nenhuma pré-autorização ativa no momento. Cadastre novas ao lado.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ── SECTION: GESTÃO DE AÇÕES & ALERTAS OPERACIONAIS ── */}
          {(currentSection === 'acoes' || currentSection === 'alertas') && (
            <div className="flex flex-col gap-6">
              {/* Header Card with Sub-tab Switcher */}
              <div className="p-6 bg-white border border-slate-200/80 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-emerald-600" />
                      ADMINISTRAÇÃO & GESTÃO
                    </span>
                  </div>
                  <h2 className="font-sans font-black text-xl text-slate-800 tracking-tight uppercase mt-1 flex items-center gap-2">
                    <ListChecks className="w-5 h-5 text-emerald-600" />
                    Gestão de Ações & Alertas Operacionais
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Central de controle para acompanhamento dos planos de ação e monitoramento em tempo real de alertas e desvios operacionais.
                  </p>
                </div>

                {/* Subtab Toggle Pills */}
                <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200 self-stretch md:self-auto">
                  <button
                    onClick={() => setAcoesSubTab('planos')}
                    className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-black uppercase transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      acoesSubTab === 'planos'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <ListChecks className="w-4 h-4" />
                    Acompanhamento de Ações
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${acoesSubTab === 'planos' ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-200 text-slate-700'}`}>
                      {acoesList.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setAcoesSubTab('alertas')}
                    className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-black uppercase transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      acoesSubTab === 'alertas'
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <Bell className="w-4 h-4 animate-pulse" />
                    Central de Alertas
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${acoesSubTab === 'alertas' ? 'bg-amber-600 text-amber-100' : 'bg-slate-200 text-slate-700'}`}>
                      {OPERATIONAL_ALERTS.length}
                    </span>
                  </button>
                </div>
              </div>

              {/* SUBTAB 1: ACOMPANHAMENTO DE AÇÕES */}
              {acoesSubTab === 'planos' && (
                <div className="flex flex-col gap-6">
                  {/* Top Bar Action */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Planos de Ação Registrados</span>
                    <button
                      onClick={() => {
                        setAcaoModalTitle('');
                        setAcaoModalDesc('');
                        setAcaoModalSetor('Repack');
                        setAcaoModalResp(user.nome || 'Supervisor');
                        setAcaoModalPrioridade('alta');
                        setAcaoModalLimite(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
                        setAcaoModalOrigem('manual');
                        setAcaoModalAlertId(undefined);
                        setShowAcaoModal(true);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-md cursor-pointer transition-all active:scale-95 whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4" />
                      Nova Ação Manual
                    </button>
                  </div>

                  {/* KPI Summary Row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-white border border-slate-200/80 rounded-xl flex flex-col gap-1 shadow-sm">
                      <span className="text-[9px] font-mono font-black text-slate-400 uppercase tracking-wider">Total de Ações</span>
                      <span className="font-mono text-2xl font-black text-slate-800">{acoesList.length}</span>
                    </div>
                    <div className="p-4 bg-white border border-amber-200 rounded-xl flex flex-col gap-1 shadow-sm">
                      <span className="text-[9px] font-mono font-black text-amber-600 uppercase tracking-wider">Pendentes</span>
                      <span className="font-mono text-2xl font-black text-amber-600">
                        {acoesList.filter(a => a.status === 'pendente' || !a.status).length}
                      </span>
                    </div>
                    <div className="p-4 bg-white border border-blue-200 rounded-xl flex flex-col gap-1 shadow-sm">
                      <span className="text-[9px] font-mono font-black text-blue-600 uppercase tracking-wider">Em Andamento</span>
                      <span className="font-mono text-2xl font-black text-blue-600">
                        {acoesList.filter(a => a.status === 'em_andamento').length}
                      </span>
                    </div>
                    <div className="p-4 bg-white border border-emerald-200 rounded-xl flex flex-col gap-1 shadow-sm">
                      <span className="text-[9px] font-mono font-black text-emerald-600 uppercase tracking-wider">Concluídas</span>
                      <span className="font-mono text-2xl font-black text-emerald-600">
                        {acoesList.filter(a => a.status === 'concluido').length}
                        <span className="text-xs text-slate-400 ml-2 font-normal">
                          ({acoesList.length > 0 ? Math.round((acoesList.filter(a => a.status === 'concluido').length / acoesList.length) * 100) : 0}%)
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Filters & Search */}
                  <div className="p-4 bg-white border border-slate-200/80 rounded-xl flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
                    <div className="relative w-full md:w-72">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={acaoSearchQuery}
                        onChange={e => setAcaoSearchQuery(e.target.value)}
                        placeholder="Buscar ação por título, responsável..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                      <select
                        value={selectedAcaoSetor}
                        onChange={e => setSelectedAcaoSetor(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 outline-none cursor-pointer focus:border-emerald-500"
                      >
                        <option value="todos">Todos os Setores</option>
                        <option value="Repack">Repack</option>
                        <option value="Quebras">Quebras</option>
                        <option value="Picking">Picking</option>
                        <option value="Movimentação">Movimentação</option>
                        <option value="Logística">Logística</option>
                        <option value="Retorno">Retorno</option>
                        <option value="Geral">Geral</option>
                      </select>

                      <select
                        value={selectedAcaoStatus}
                        onChange={e => setSelectedAcaoStatus(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 outline-none cursor-pointer focus:border-emerald-500"
                      >
                        <option value="todos">Todos os Status</option>
                        <option value="pendente">Pendentes</option>
                        <option value="em_andamento">Em Andamento</option>
                        <option value="concluido">Concluídas</option>
                      </select>
                    </div>
                  </div>

                  {/* Actions List Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {acoesList
                      .filter(a => {
                        if (selectedAcaoSetor !== 'todos' && a.setor !== selectedAcaoSetor) return false;
                        if (selectedAcaoStatus !== 'todos' && (a.status || 'pendente') !== selectedAcaoStatus) return false;
                        if (acaoSearchQuery.trim()) {
                          const q = acaoSearchQuery.toLowerCase();
                          const matchTitle = (a.titulo || '').toLowerCase().includes(q);
                          const matchDesc = (a.descricao || '').toLowerCase().includes(q);
                          const matchResp = (a.responsavel || '').toLowerCase().includes(q);
                          if (!matchTitle && !matchDesc && !matchResp) return false;
                        }
                        return true;
                      })
                      .map((acao, idx) => {
                        const isOverdue = acao.limiteEm && new Date(acao.limiteEm).getTime() < Date.now() && acao.status !== 'concluido';
                        return (
                          <div
                            key={acao.id || idx}
                            className={`p-4 bg-white border rounded-2xl flex flex-col justify-between gap-3 shadow-sm hover:shadow-md transition-all ${
                              acao.status === 'concluido'
                                ? 'border-emerald-200 opacity-90 bg-emerald-50/20'
                                : isOverdue
                                ? 'border-rose-300 bg-rose-50/30'
                                : 'border-slate-200/80 hover:border-emerald-400'
                            }`}
                          >
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center justify-between flex-wrap gap-1">
                                <span className="px-2 py-0.5 rounded text-[8px] font-mono font-black uppercase bg-slate-100 text-slate-600 border border-slate-200">
                                  #{acao.id ? acao.id.slice(-6) : idx + 1}
                                </span>

                                <div className="flex items-center gap-1.5">
                                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase border ${
                                    acao.prioridade === 'alta'
                                      ? 'bg-rose-100 text-rose-700 border-rose-200'
                                      : 'bg-amber-100 text-amber-800 border-amber-200'
                                  }`}>
                                    {acao.prioridade || 'Alta'}
                                  </span>

                                  <span className="px-2 py-0.5 rounded text-[8px] font-bold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    {acao.setor || 'Geral'}
                                  </span>
                                </div>
                              </div>

                              <h3 className="font-sans font-bold text-sm text-slate-800 leading-snug">
                                {acao.titulo}
                              </h3>

                              <p className="text-xs text-slate-600 whitespace-pre-line line-clamp-3 leading-relaxed">
                                {acao.descricao}
                              </p>

                              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-100">
                                <span className="flex items-center gap-1 font-semibold">
                                  <User className="w-3 h-3 text-slate-400" />
                                  {acao.responsavel || 'Não atribuído'}
                                </span>

                                <span className={`flex items-center gap-1 font-mono font-bold ${isOverdue ? 'text-rose-600 animate-pulse' : 'text-slate-500'}`}>
                                  <Calendar className="w-3 h-3" />
                                  Limite: {acao.limiteEm ? acao.limiteEm.split('T')[0] : '—'}
                                </span>
                              </div>
                            </div>

                            {/* Status Updater & Delete Action */}
                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                              <div className="flex items-center gap-1.5 flex-1">
                                <span className="text-[9px] font-bold text-slate-500 uppercase">Status:</span>
                                <select
                                  value={acao.status || 'pendente'}
                                  onChange={e => handleUpdateAcaoStatus(acao.id, e.target.value)}
                                  className={`text-[10px] font-bold uppercase rounded px-2 py-1 outline-none border cursor-pointer ${
                                    acao.status === 'concluido'
                                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                      : acao.status === 'em_andamento'
                                      ? 'bg-blue-100 text-blue-800 border-blue-300'
                                      : 'bg-amber-100 text-amber-800 border-amber-300'
                                  }`}
                                >
                                  <option value="pendente" className="bg-white text-amber-800">Pendente</option>
                                  <option value="em_andamento" className="bg-white text-blue-800">Em Andamento</option>
                                  <option value="concluido" className="bg-white text-emerald-800">Concluído</option>
                                </select>
                              </div>

                              <button
                                onClick={() => handleDeleteAcao(acao.id)}
                                className="p-1.5 rounded border border-slate-200 hover:border-rose-300 bg-slate-50 text-slate-400 hover:text-rose-600 transition-all cursor-pointer"
                                title="Excluir ação"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}

                    {acoesList.length === 0 && (
                      <div className="col-span-full p-12 bg-white border border-slate-200/80 rounded-2xl text-center text-slate-500 flex flex-col items-center justify-center gap-3 shadow-sm">
                        <ListChecks className="w-8 h-8 text-slate-300" />
                        <p className="text-sm font-semibold">Nenhuma ação registrada no momento.</p>
                        <p className="text-xs">Crie ações manuais ou clique na aba "Central de Alertas" para transformar alertas em planos de ação.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SUBTAB 2: CENTRAL DE ALERTAS OPERACIONAIS */}
              {acoesSubTab === 'alertas' && (
                <div className="flex flex-col gap-6">
                  {/* Info Banner */}
                  <div className="p-4 bg-amber-50 border border-amber-200/80 rounded-xl flex items-center justify-between text-xs text-amber-900 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Flame className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <span>
                        Ocorrências com desvios operacionais mapeados. Clique em <strong>"Criar Plano de Ação Imediato"</strong> para vincular uma ação preventiva ou corretiva.
                      </span>
                    </div>
                    <span className="font-mono text-xs font-bold bg-amber-100 px-2.5 py-1 rounded-md text-amber-800 border border-amber-300 whitespace-nowrap">
                      {OPERATIONAL_ALERTS.length} Alertas Ativos
                    </span>
                  </div>

                  {/* Alert Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {OPERATIONAL_ALERTS
                      .map((alert) => {
                        const existingAcao = acoesList.find(a => a.origemAlertaId === alert.id);
                        return (
                          <div
                            key={alert.id}
                            className={`p-5 bg-white border rounded-2xl flex flex-col justify-between gap-4 shadow-sm hover:shadow-md transition-all ${
                              alert.severidade === 'CRÍTICO'
                                ? 'border-rose-300'
                                : 'border-amber-300'
                            }`}
                          >
                            <div className="flex flex-col gap-3">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  {alert.setor}
                                </span>

                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                    #{alert.registroId}
                                  </span>
                                  <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase border ${
                                    alert.severidade === 'CRÍTICO'
                                      ? 'bg-rose-100 text-rose-700 border-rose-200 animate-pulse'
                                      : 'bg-amber-100 text-amber-800 border-amber-200'
                                  }`}>
                                    {alert.severidade}
                                  </span>
                                </div>
                              </div>

                              <h3 className="font-sans font-black text-base text-slate-800 leading-snug">
                                {alert.titulo}
                              </h3>

                              {/* Detailed Record Info Card */}
                              <div className="p-3.5 bg-slate-50/90 border border-slate-200/90 rounded-xl flex flex-col gap-2 text-xs">
                                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2 text-[11px] text-slate-500">
                                  <span className="flex items-center gap-1 font-semibold text-slate-700">
                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                    {alert.dataRegistro}
                                  </span>
                                  <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                    {alert.turno}
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                                  <div className="flex flex-col">
                                    <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                                      <MapPin className="w-3 h-3 text-slate-400" /> Localização
                                    </span>
                                    <span className="font-medium text-slate-700">{alert.localizacao}</span>
                                  </div>

                                  <div className="flex flex-col">
                                    <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                                      <User className="w-3 h-3 text-slate-400" /> Inspector / Resp.
                                    </span>
                                    <span className="font-medium text-slate-700">{alert.registradoPor}</span>
                                  </div>
                                </div>

                                <div className="flex flex-col text-[11px] pt-1 border-t border-slate-100">
                                  <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                                    <Truck className="w-3 h-3 text-slate-400" /> Equipamento & Operador
                                  </span>
                                  <span className="font-medium text-slate-800">{alert.equipamentoOp}</span>
                                </div>

                                <div className="flex flex-col text-[11px] pt-1 border-t border-slate-100">
                                  <span className="text-[10px] uppercase font-bold text-amber-500 flex items-center gap-1">
                                    <Package className="w-3 h-3 text-amber-500" /> Produtos & SKUs Afetados
                                  </span>
                                  <span className="font-semibold text-slate-900 bg-amber-50/60 p-1.5 rounded border border-amber-200/50 mt-0.5">
                                    {alert.produtosEnvolvidos}
                                  </span>
                                </div>

                                <div className="flex flex-col text-[11px] pt-1 border-t border-slate-100">
                                  <span className="text-[10px] uppercase font-bold text-rose-500 flex items-center gap-1">
                                    <AlertOctagon className="w-3 h-3 text-rose-500" /> Impacto Estimado
                                  </span>
                                  <span className="font-bold text-rose-700 bg-rose-50/60 p-1.5 rounded border border-rose-200/50 mt-0.5">
                                    {alert.impactoEstimado}
                                  </span>
                                </div>
                              </div>

                              {/* Trigger and Metrics */}
                              <div className="p-3 bg-amber-50/40 border border-amber-200/60 rounded-xl flex flex-col gap-1.5">
                                <div className="text-[11px] text-amber-900 font-medium">
                                  <strong className="text-amber-700">Gatilho de Detecção: </strong>
                                  {alert.gatilho}
                                </div>
                                <div className="flex items-center justify-between text-xs pt-1.5 border-t border-amber-200/40">
                                  <span className="text-slate-600 font-semibold">Métrica Detectada:</span>
                                  <span className="font-mono font-bold text-rose-600">{alert.metricaAtual}</span>
                                </div>
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-slate-400">Meta Referência:</span>
                                  <span className="font-mono text-emerald-700 font-bold">{alert.metaReferencia}</span>
                                </div>
                              </div>

                              {/* Root Cause & Recommended Action */}
                              <div className="flex flex-col gap-1.5 text-xs">
                                <div className="text-slate-600">
                                  <strong className="text-slate-800">Causa Provável: </strong>
                                  {alert.causaProvavel}
                                </div>
                                <div className="text-emerald-800 bg-emerald-50/80 border border-emerald-200 p-2.5 rounded-lg text-[11px] leading-relaxed">
                                  <strong className="text-emerald-700 uppercase font-black block mb-0.5">Recomendação:</strong>
                                  {alert.acaoRecomendada}
                                </div>
                              </div>
                            </div>

                            {/* Action Creator / Status badge */}
                            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                              {existingAcao ? (
                                <div className="flex items-center justify-between w-full p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                                  <span className="flex items-center gap-1.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    Ação Registrada (#{existingAcao.id ? existingAcao.id.slice(-6) : 'Ativa'})
                                  </span>
                                  <span className="uppercase text-[9px] px-2 py-0.5 rounded bg-emerald-100 border border-emerald-300 text-emerald-800 font-extrabold">
                                    {existingAcao.status || 'Pendente'}
                                  </span>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleOpenAlertActionModal(alert)}
                                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-sans font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-95"
                                >
                                  <Zap className="w-4 h-4 fill-current" />
                                  Criar Plano de Ação Imediato
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}

        </motion.div>
      </AnimatePresence>

      {/* ── MODAL: CRIAR / EDITAR PLANO DE AÇÃO ── */}
      <AnimatePresence>
        {showAcaoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#11151c] border border-[#222d3a] rounded-2xl p-6 shadow-2xl flex flex-col gap-4 text-snow"
            >
              <div className="flex items-center justify-between border-b border-[#222d3a] pb-3">
                <h3 className="font-sans font-black text-base uppercase tracking-tight flex items-center gap-2 text-[#f5a623]">
                  <ListChecks className="w-5 h-5 text-[#f5a623]" />
                  Plano de Ação Integrado
                </h3>
                <button
                  onClick={() => setShowAcaoModal(false)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-[10px] font-black text-[#6a7d92] uppercase block mb-1">Título da Ação</label>
                  <input
                    type="text"
                    value={acaoModalTitle}
                    onChange={e => setAcaoModalTitle(e.target.value)}
                    placeholder="Ex: Treinamento de Redução de Velocidade nas Empilhadeiras"
                    className="w-full bg-[#161c27] border border-[#222d3a] rounded-xl px-3 py-2 text-xs text-snow outline-none focus:border-[#f5a623]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-[#6a7d92] uppercase block mb-1">Setor Responsável</label>
                    <select
                      value={acaoModalSetor}
                      onChange={e => setAcaoModalSetor(e.target.value)}
                      className="w-full bg-[#161c27] border border-[#222d3a] rounded-xl px-3 py-2 text-xs text-snow outline-none cursor-pointer focus:border-[#f5a623]"
                    >
                      <option value="Repack">Repack</option>
                      <option value="Quebras">Quebras</option>
                      <option value="Picking">Picking</option>
                      <option value="Movimentação">Movimentação</option>
                      <option value="Logística">Logística</option>
                      <option value="Retorno">Retorno</option>
                      <option value="Geral">Geral</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-[#6a7d92] uppercase block mb-1">Prioridade</label>
                    <select
                      value={acaoModalPrioridade}
                      onChange={e => setAcaoModalPrioridade(e.target.value as any)}
                      className="w-full bg-[#161c27] border border-[#222d3a] rounded-xl px-3 py-2 text-xs text-snow outline-none cursor-pointer focus:border-[#f5a623]"
                    >
                      <option value="alta">Alta</option>
                      <option value="media">Média</option>
                      <option value="baixa">Baixa</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-[#6a7d92] uppercase block mb-1">Responsável pela Execução</label>
                    <input
                      type="text"
                      value={acaoModalResp}
                      onChange={e => setAcaoModalResp(e.target.value)}
                      placeholder="Nome do Supervisor / Operador"
                      className="w-full bg-[#161c27] border border-[#222d3a] rounded-xl px-3 py-2 text-xs text-snow outline-none focus:border-[#f5a623]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-[#6a7d92] uppercase block mb-1">Data Limite</label>
                    <input
                      type="date"
                      value={acaoModalLimite}
                      onChange={e => setAcaoModalLimite(e.target.value)}
                      className="w-full bg-[#161c27] border border-[#222d3a] rounded-xl px-3 py-2 text-xs text-snow outline-none focus:border-[#f5a623]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-[#6a7d92] uppercase block mb-1">Descrição & Recomendações</label>
                  <textarea
                    rows={4}
                    value={acaoModalDesc}
                    onChange={e => setAcaoModalDesc(e.target.value)}
                    placeholder="Descreva o plano de ação, procedimentos e metas de correção..."
                    className="w-full bg-[#161c27] border border-[#222d3a] rounded-xl p-3 text-xs text-snow outline-none focus:border-[#f5a623] resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#222d3a]">
                <button
                  onClick={() => setShowAcaoModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#222d3a] bg-[#161c27] text-slate-300 hover:text-white font-bold text-xs uppercase cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  disabled={savingAcao || !acaoModalTitle.trim() || !acaoModalDesc.trim()}
                  onClick={handleCreateAcao}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#f5a623] to-[#d4780a] hover:from-[#f5a623] hover:to-[#f5a623] text-slate-950 font-black text-xs uppercase cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                >
                  {savingAcao ? 'Salva...' : 'Salvar Plano de Ação'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
export {};
