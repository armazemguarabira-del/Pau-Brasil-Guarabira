import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  Search, 
  Layers, 
  ShieldCheck, 
  Target, 
  TrendingUp, 
  AlertTriangle, 
  Zap, 
  CheckCircle2, 
  Clock,
  Sparkles,
  Building2,
  Trash2,
  Users,
  Award,
  Filter,
  BarChart3,
  CheckSquare,
  ArrowRight
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { Usuario } from '../types';

interface DnSwotPanelProps {
  user: Usuario;
  onNavigate?: (tabId: string) => void;
}

// ----------------------------------------------------------------------
// DATASETS EXTRAÍDOS DIRETAMENTE DOS DOCUMENTOS DPO AMBEV SWOT 2026
// ----------------------------------------------------------------------

export interface SwotFactorItem {
  id: string;
  item: string;
  tipo: 'Força' | 'Fraqueza' | 'Oportunidade' | 'Ameaça';
  importancia: string;
  intensidadeOUurgencia: string;
  tendencia: string;
  pontuacao: number;
  categoriaInternaExterna: 'Interno' | 'Externo';
}

export const SWOT_FACTORS_2026: SwotFactorItem[] = [
  // FORÇAS (FACTORES INTERNOS POSITIVOS)
  { id: 'f1', item: 'TRABALHO EM EQUIPE', tipo: 'Força', importancia: 'Muito importante', intensidadeOUurgencia: 'Muito forte', tendencia: 'Melhora muito', pontuacao: 100, categoriaInternaExterna: 'Interno' },
  { id: 'f2', item: 'NOVAS TECNOLOGIAS (FAST PICKING, HTML)', tipo: 'Força', importancia: 'Totalmente importante', intensidadeOUurgencia: 'Muito forte', tendencia: 'Melhora', pontuacao: 100, categoriaInternaExterna: 'Interno' },
  { id: 'f3', item: 'ORGANIZAÇÃO DE ROTINAS', tipo: 'Força', importancia: 'Muito importante', intensidadeOUurgencia: 'Muito forte', tendencia: 'Melhora muito', pontuacao: 100, categoriaInternaExterna: 'Interno' },
  { id: 'f4', item: 'COMUNICAÇÃO ENTRE SETORES', tipo: 'Força', importancia: 'Totalmente importante', intensidadeOUurgencia: 'Forte', tendencia: 'Melhora muito', pontuacao: 100, categoriaInternaExterna: 'Interno' },
  { id: 'f5', item: 'ESTRUTURA PREDIAL', tipo: 'Força', importancia: 'Muito importante', intensidadeOUurgencia: 'Muito forte', tendencia: 'Melhora', pontuacao: 80, categoriaInternaExterna: 'Interno' },
  { id: 'f6', item: 'LIGA DPO', tipo: 'Força', importancia: 'Muito importante', intensidadeOUurgencia: 'Muito forte', tendencia: 'Melhora', pontuacao: 80, categoriaInternaExterna: 'Interno' },
  { id: 'f7', item: 'RELATOS', tipo: 'Força', importancia: 'Muito importante', intensidadeOUurgencia: 'Muito forte', tendencia: 'Melhora', pontuacao: 80, categoriaInternaExterna: 'Interno' },

  // FRAQUEZAS (FACTORES INTERNOS A MELHORAR)
  { id: 'w1', item: 'MONTAGEM', tipo: 'Fraqueza', importancia: 'Totalmente importante', intensidadeOUurgencia: 'Muito fraca', tendencia: 'Piora muito', pontuacao: 125, categoriaInternaExterna: 'Interno' },
  { id: 'w2', item: 'TROCAS E REPOSIÇÕES', tipo: 'Fraqueza', importancia: 'Muito importante', intensidadeOUurgencia: 'Muito fraca', tendencia: 'Piora muito', pontuacao: 100, categoriaInternaExterna: 'Interno' },
  { id: 'w3', item: 'DESVIOS DE PRODUTO', tipo: 'Fraqueza', importancia: 'Muito importante', intensidadeOUurgencia: 'Muito fraca', tendencia: 'Piora muito', pontuacao: 100, categoriaInternaExterna: 'Interno' },
  { id: 'w4', item: 'FALTA DE EQUIPAMENTO PARA OPERACIONAL (PDA, IMPRESSORA)', tipo: 'Fraqueza', importancia: 'Totalmente importante', intensidadeOUurgencia: 'Muito fraca', tendencia: 'Piora', pontuacao: 100, categoriaInternaExterna: 'Interno' },
  { id: 'w5', item: 'AREA PARA ARMAZENAMENTO DE INSUMOS DE OUTROS SETORES (MESAS, FREEZERS, BARRACAS, CADEIRAS)', tipo: 'Fraqueza', importancia: 'Muito importante', intensidadeOUurgencia: 'Muito fraca', tendencia: 'Piora muito', pontuacao: 100, categoriaInternaExterna: 'Interno' },
  { id: 'w6', item: 'ILUMINAÇÃO DA ÁREA DAS CARRETAS', tipo: 'Fraqueza', importancia: 'Muito importante', intensidadeOUurgencia: 'Muito fraca', tendencia: 'Piora muito', pontuacao: 100, categoriaInternaExterna: 'Interno' },
  { id: 'w7', item: 'AGILIDADE E ORGANIZAÇÃO NO PROCESSO DE CONFERÊNCIA DE RETORNOS DE ROTA', tipo: 'Fraqueza', importancia: 'Muito importante', intensidadeOUurgencia: 'Muito fraca', tendencia: 'Piora muito', pontuacao: 100, categoriaInternaExterna: 'Interno' },
  { id: 'w8', item: 'SEGREGAÇÃO DOS RECICLÁVEIS', tipo: 'Fraqueza', importancia: 'Muito importante', intensidadeOUurgencia: 'Fraca', tendencia: 'Piora muito', pontuacao: 80, categoriaInternaExterna: 'Interno' },
  { id: 'w9', item: 'INFRAESTRUTURA/ESCOAMENTO PREDIAL MEDIANTE CHUVAS ACIMA DA MÉDIA', tipo: 'Fraqueza', importancia: 'Muito importante', intensidadeOUurgencia: 'Fraca', tendencia: 'Piora muito', pontuacao: 80, categoriaInternaExterna: 'Interno' },
  { id: 'w10', item: 'MANUTENÇÃO DOS MATERIAIS DE MOVIMENTAÇÃO (PATINHAS)', tipo: 'Fraqueza', importancia: 'Muito importante', intensidadeOUurgencia: 'Fraca', tendencia: 'Piora muito', pontuacao: 80, categoriaInternaExterna: 'Interno' },
  { id: 'w11', item: 'ATIVOS DE GIRO DANIFICADOS', tipo: 'Fraqueza', importancia: 'Importante', intensidadeOUurgencia: 'Fraca', tendencia: 'Piora', pontuacao: 48, categoriaInternaExterna: 'Interno' },

  // OPORTUNIDADES (FACTORES EXTERNOS DE CRESCIMENTO)
  { id: 'o1', item: 'NOVAS TECNOLOGIAS PARA ACOMPANHAMENTO DE PROCESSOS', tipo: 'Oportunidade', importancia: 'Totalmente importante', intensidadeOUurgencia: 'Pra ontem', tendencia: 'Melhora muito', pontuacao: 125, categoriaInternaExterna: 'Externo' },
  { id: 'o2', item: 'PROGRAMA DE BENCHMARKING E TROCA DE BOAS PRÁTICAS ENTRE REVENDAS DO GRUPO', tipo: 'Oportunidade', importancia: 'Totalmente importante', intensidadeOUurgencia: 'Pra ontem', tendencia: 'Melhora muito', pontuacao: 125, categoriaInternaExterna: 'Externo' },
  { id: 'o3', item: 'REUNIÕES COM AS FÁBRICAS', tipo: 'Oportunidade', importancia: 'Totalmente importante', intensidadeOUurgencia: 'Muito urgente', tendencia: 'Melhora muito', pontuacao: 100, categoriaInternaExterna: 'Externo' },
  { id: 'o4', item: 'BOM ESTADO DAS RODOVIAS', tipo: 'Oportunidade', importancia: 'Muito importante', intensidadeOUurgencia: 'Pra ontem', tendencia: 'Melhora', pontuacao: 80, categoriaInternaExterna: 'Externo' },
  { id: 'o5', item: 'CAPACITAÇÃO DE QLP PARA CURSOS (EMPILHADEIRA)', tipo: 'Oportunidade', importancia: 'Muito importante', intensidadeOUurgencia: 'Muito urgente', tendencia: 'Melhora muito', pontuacao: 80, categoriaInternaExterna: 'Externo' },

  // AMEAÇAS (FACTORES EXTERNOS DE RISCO)
  { id: 't1', item: 'AUMENTO DO PREÇO DE INSUMOS', tipo: 'Ameaça', importancia: 'Totalmente importante', intensidadeOUurgencia: 'Pra ontem', tendencia: 'Piora muito', pontuacao: 125, categoriaInternaExterna: 'Externo' },
  { id: 't2', item: 'INDISPONIBILIDADE FABRIL', tipo: 'Ameaça', importancia: 'Totalmente importante', intensidadeOUurgencia: 'Muito urgente', tendencia: 'Piora muito', pontuacao: 100, categoriaInternaExterna: 'Externo' },
  { id: 't3', item: 'FORTES CHUVAS', tipo: 'Ameaça', importancia: 'Totalmente importante', intensidadeOUurgencia: 'Muito urgente', tendencia: 'Piora', pontuacao: 80, categoriaInternaExterna: 'Externo' },
  { id: 't4', item: 'QUEDAS DE ENERGIA', tipo: 'Ameaça', importancia: 'Totalmente importante', intensidadeOUurgencia: 'Muito urgente', tendencia: 'Piora', pontuacao: 80, categoriaInternaExterna: 'Externo' },
  { id: 't5', item: 'AFASTAMENTO POR MOTIVO DE SAÚDE', tipo: 'Ameaça', importancia: 'Muito importante', intensidadeOUurgencia: 'Muito urgente', tendencia: 'Piora muito', pontuacao: 80, categoriaInternaExterna: 'Externo' },
  { id: 't6', item: 'QUEDAS DE INTERNET', tipo: 'Ameaça', importancia: 'Totalmente importante', intensidadeOUurgencia: 'Urgente', tendencia: 'Piora muito', pontuacao: 75, categoriaInternaExterna: 'Externo' },
  { id: 't7', item: 'PROBLEMAS DE QUALIDADE', tipo: 'Ameaça', importancia: 'Muito importante', intensidadeOUurgencia: 'Urgente', tendencia: 'Mantém', pontuacao: 36, categoriaInternaExterna: 'Externo' },
  { id: 't8', item: 'ESTACIONAMENTO DAS CERVEJARIAS', tipo: 'Ameaça', importancia: 'Muito importante', intensidadeOUurgencia: 'Urgente', tendencia: 'Mantém', pontuacao: 36, categoriaInternaExterna: 'Externo' }
];

export interface SwotRecommendation {
  fatorInterno: string;
  tipoInterno: 'Força' | 'Fraqueza';
  fatorExterno: string;
  tipoExterno: 'Oportunidade' | 'Ameaça';
  tipoEstrategia: 'Estratégia ofensiva' | 'Estratégia de reforço' | 'Estratégia defensiva' | 'Estratégia de confronto';
  recomendacao: string;
}

export const SWOT_RECOMMENDATIONS_2026: SwotRecommendation[] = [
  {
    fatorInterno: 'TRABALHO EM EQUIPE',
    tipoInterno: 'Força',
    fatorExterno: 'PROGRAMA DE BENCHMARKING E TROCA DE BOAS PRÁTICAS ENTRE REVENDAS DO GRUPO',
    tipoExterno: 'Oportunidade',
    tipoEstrategia: 'Estratégia ofensiva',
    recomendacao: 'Utilizar a cooperação entre as áreas para estruturar bench e processos entre as operações.'
  },
  {
    fatorInterno: 'NOVAS TECNOLOGIAS (FAST PICKING, HTML)',
    tipoInterno: 'Força',
    fatorExterno: 'NOVAS TECNOLOGIAS PARA ACOMPANHAMENTO DE PROCESSOS',
    tipoExterno: 'Oportunidade',
    tipoEstrategia: 'Estratégia ofensiva',
    recomendacao: 'Implementar dashboards em tempo real das plataformas integrados à rotina diária para antecipar desvios no acompanhamento de montagem.'
  },
  {
    fatorInterno: 'ORGANIZAÇÃO DE ROTINAS',
    tipoInterno: 'Força',
    fatorExterno: 'CAPACITAÇÃO DE QLP PARA CURSOS (EMPILHADEIRA)',
    tipoExterno: 'Oportunidade',
    tipoEstrategia: 'Estratégia ofensiva',
    recomendacao: 'Criar plano de treinamento contínuo para operadores em parcerias com instituições técnicas.'
  },
  {
    fatorInterno: 'MONTAGEM',
    tipoInterno: 'Fraqueza',
    fatorExterno: 'PROGRAMA DE BENCHMARKING E TROCA DE BOAS PRÁTICAS ENTRE REVENDAS DO GRUPO',
    tipoExterno: 'Oportunidade',
    tipoEstrategia: 'Estratégia de reforço',
    recomendacao: 'Importar práticas que rodem em outras revendas para eliminar erros de conferência e montagem.'
  },
  {
    fatorInterno: 'DESVIOS DE PRODUTO',
    tipoInterno: 'Fraqueza',
    fatorExterno: 'INDISPONIBILIDADE FABRIL',
    tipoExterno: 'Ameaça',
    tipoEstrategia: 'Estratégia defensiva',
    recomendacao: 'Intensificar conciliações de inventários em produtos com maior falta fabril, evitando divergências de faturamento.'
  },
  {
    fatorInterno: 'AREA PARA ARMAZENAMENTO DE INSUMOS DE OUTROS SETORES',
    tipoInterno: 'Fraqueza',
    fatorExterno: 'FORTES CHUVAS',
    tipoExterno: 'Ameaça',
    tipoEstrategia: 'Estratégia defensiva',
    recomendacao: 'Realizar 5S no armazém, movendo materiais de outros setores para locais totalmente cobertos que não sofram com fortes chuvas.'
  },
  {
    fatorInterno: 'ESTRUTURA PREDIAL',
    tipoInterno: 'Força',
    fatorExterno: 'QUEDAS DE ENERGIA',
    tipoExterno: 'Ameaça',
    tipoEstrategia: 'Estratégia de confronto',
    recomendacao: 'Garantir manutenção preventiva de aparelhos na área do armazém para manter faturamento, conferência e montagem sem interrupções.'
  },
  {
    fatorInterno: 'COMUNICAÇÃO ENTRE SETORES',
    tipoInterno: 'Força',
    fatorExterno: 'REUNIÕES COM AS FÁBRICAS',
    tipoExterno: 'Oportunidade',
    tipoEstrategia: 'Estratégia ofensiva',
    recomendacao: 'Utilizar comunicação entre setores para fazer levantamentos de oportunidades para implementar em reuniões com as fábricas.'
  },
  {
    fatorInterno: 'ORGANIZAÇÃO DE ROTINAS',
    tipoInterno: 'Força',
    fatorExterno: 'INDISPONIBILIDADE FABRIL',
    tipoExterno: 'Ameaça',
    tipoEstrategia: 'Estratégia de confronto',
    recomendacao: 'Padronizar o controle de estoque mínimo em itens com possível indisponibilidade fabril, buscando oportunidades para intensificar puxadas antes das faltas.'
  },
  {
    fatorInterno: 'COMUNICAÇÃO ENTRE SETORES',
    tipoInterno: 'Força',
    fatorExterno: 'AUMENTO DO PREÇO DE INSUMOS',
    tipoExterno: 'Ameaça',
    tipoEstrategia: 'Estratégia de confronto',
    recomendacao: 'Promover campanhas internas de conscientização entre Armazém e Distribuição para redução do consumo de filme stretch e combate ao desperdício.'
  },
  {
    fatorInterno: 'ESTRUTURA PREDIAL',
    tipoInterno: 'Força',
    fatorExterno: 'FORTES CHUVAS',
    tipoExterno: 'Ameaça',
    tipoEstrategia: 'Estratégia de confronto',
    recomendacao: 'Estabelecer protocolo operacional para atuação em períodos mais chuvosos e escoamento de calhas.'
  },
  {
    fatorInterno: 'TRABALHO EM EQUIPE',
    tipoInterno: 'Força',
    fatorExterno: 'AFASTAMENTO POR MOTIVO DE SAÚDE',
    tipoExterno: 'Ameaça',
    tipoEstrategia: 'Estratégia de confronto',
    recomendacao: 'Implementar adaptabilidade de colaboradores em outras funções do armazém, permitindo rotação de funções sem perda de produtividade.'
  },
  {
    fatorInterno: 'NOVAS TECNOLOGIAS (FAST PICKING, HTML)',
    tipoInterno: 'Força',
    fatorExterno: 'BOM ESTADO DAS RODOVIAS',
    tipoExterno: 'Oportunidade',
    tipoEstrategia: 'Estratégia ofensiva',
    recomendacao: 'Otimizar a disposição do pátio para agilizar o tempo de manobra e tráfego de carretas vindas de rotas externas.'
  },
  {
    fatorInterno: 'DESVIOS DE PRODUTO',
    tipoInterno: 'Fraqueza',
    fatorExterno: 'PROGRAMA DE BENCHMARKING E TROCA DE BOAS PRÁTICAS',
    tipoExterno: 'Oportunidade',
    tipoEstrategia: 'Estratégia de reforço',
    recomendacao: 'Mapear e adotar em outras revendas do grupo as melhores rotinas de segurança patrimonial e controle de acesso ao estoque restrito.'
  },
  {
    fatorInterno: 'MONTAGEM',
    tipoInterno: 'Fraqueza',
    fatorExterno: 'AUMENTO DO PREÇO DE INSUMOS',
    tipoExterno: 'Ameaça',
    tipoEstrategia: 'Estratégia defensiva',
    recomendacao: 'Aumentar a fiscalização sobre retrabalho em paletes feitos, pois erros de montagem geram retrabalho e consumo duplicado de filme stretch.'
  },
  {
    fatorInterno: 'TROCAS E REPOSIÇÕES',
    tipoInterno: 'Fraqueza',
    fatorExterno: 'NOVAS TECNOLOGIAS PARA ACOMPANHAMENTO DE PROCESSOS',
    tipoExterno: 'Oportunidade',
    tipoEstrategia: 'Estratégia de reforço',
    recomendacao: 'Aproveitar as novas tecnologias para desenvolver acompanhamentos sobre trocas e reposições, ajudando a atingir o resultado do indicador.'
  },
  {
    fatorInterno: 'TROCAS E REPOSIÇÕES',
    tipoInterno: 'Fraqueza',
    fatorExterno: 'AUMENTO DO PREÇO DE INSUMOS',
    tipoExterno: 'Ameaça',
    tipoEstrategia: 'Estratégia defensiva',
    recomendacao: 'Padronizar a rotina de reembalagem (repack) dos produtos vindos de trocas e reposições para evitar o uso excessivo e desperdício de filme.'
  },
  {
    fatorInterno: 'TROCAS E REPOSIÇÕES',
    tipoInterno: 'Fraqueza',
    fatorExterno: 'REUNIÕES COM AS FÁBRICAS',
    tipoExterno: 'Oportunidade',
    tipoEstrategia: 'Estratégia de reforço',
    recomendacao: 'Alinhar em reuniões de fábrica o protocolo e critérios de devolução de produtos com avaria/troca para agilizar a baixa de saldo.'
  },
  {
    fatorInterno: 'FALTA DE EQUIPAMENTO PARA OPERACIONAL',
    tipoInterno: 'Fraqueza',
    fatorExterno: 'NOVAS TECNOLOGIAS PARA ACOMPANHAMENTO DE PROCESSOS',
    tipoExterno: 'Oportunidade',
    tipoEstrategia: 'Estratégia de reforço',
    recomendacao: 'Investimento em coletores/PDAs para gerar melhor qualidade no exercício das rotinas operacionais.'
  }
];

export interface SwotActionPlan {
  id: string;
  planosDeAcao: string;
  fatorTipo: 'Força' | 'Fraqueza' | 'Oportunidade' | 'Ameaça';
  itemRelacionado: string;
  responsavel: string;
  area: string;
  previsaoInicio: string;
  previsaoFim: string;
  andamento: 'Concluído' | 'Em andamento';
  status: 'Concluído' | 'Em andamento';
}

export const SWOT_ACTION_PLANS_2026: SwotActionPlan[] = [
  { id: 'p1', planosDeAcao: 'Criar fluxo padrão de recebimento. Definir tempo atrelado à meta para conferência. Implantar indicadores.', fatorTipo: 'Oportunidade', itemRelacionado: 'AGILIDADE E ORGANIZAÇÃO NO PROCESSO DE CONFERÊNCIA', responsavel: 'Djeanderson', area: 'Armazém', previsaoInicio: '01/05/2026', previsaoFim: '30/05/2026', andamento: 'Concluído', status: 'Concluído' },
  { id: 'p2', planosDeAcao: 'Posicionar itens de maior giro próximos à área de montagem (picking). Reduzir deslocamentos.', fatorTipo: 'Oportunidade', itemRelacionado: 'ALTERAÇÃO DE LAYOUT PICKING', responsavel: 'Marcos Guilherme', area: 'Logística', previsaoInicio: '01/04/2026', previsaoFim: '30/04/2026', andamento: 'Concluído', status: 'Concluído' },
  { id: 'p3', planosDeAcao: 'Checklist semanal. Controle de equipamentos. Registro de falhas.', fatorTipo: 'Fraqueza', itemRelacionado: 'MANUTENÇÃO DOS MATERIAIS DE MOVIMENTAÇÃO (PATINHAS)', responsavel: 'Pedro Bruno', area: 'Frota', previsaoInicio: '24/06/2026', previsaoFim: '30/06/2026', andamento: 'Concluído', status: 'Concluído' },
  { id: 'p4', planosDeAcao: 'Delimitação visual. Identificação por cores. Responsáveis pela gestão dos resíduos.', fatorTipo: 'Oportunidade', itemRelacionado: 'SEGREGAÇÃO DE RECICLÁVEIS', responsavel: 'Djeanderson', area: 'Armazém', previsaoInicio: '10/05/2026', previsaoFim: '18/05/2026', andamento: 'Concluído', status: 'Concluído' },
  { id: 'p5', planosDeAcao: 'Demarcação de piso. Etiquetas. Controle de entrada e saída de insumos.', fatorTipo: 'Oportunidade', itemRelacionado: 'AREA PARA ARMAZENAMENTO DE INSUMOS DE OUTROS SETORES', responsavel: 'Kamilly', area: 'Segurança', previsaoInicio: '10/05/2026', previsaoFim: '18/05/2026', andamento: 'Concluído', status: 'Concluído' },
  { id: 'p6', planosDeAcao: 'Instalação de refletores LED. Correção de pontos de alagamento. Revisão do piso.', fatorTipo: 'Oportunidade', itemRelacionado: 'AREA PARA ESCOAMENTO DE ÁGUA (FORTES CHUVAS)', responsavel: 'Alisson', area: 'Financeiro', previsaoInicio: '01/02/2026', previsaoFim: '30/04/2026', andamento: 'Concluído', status: 'Concluído' },
  { id: 'p7', planosDeAcao: 'Conferência em duas etapas. Registro fotográfico. Controle de movimentações.', fatorTipo: 'Ameaça', itemRelacionado: 'DESVIOS DE PRODUTO', responsavel: 'Alisson', area: 'Financeiro', previsaoInicio: '01/02/2026', previsaoFim: '30/03/2026', andamento: 'Concluído', status: 'Concluído' },
  { id: 'p8', planosDeAcao: 'Estudar possíveis novos sistemas para monitorar movimentações no galpão.', fatorTipo: 'Ameaça', itemRelacionado: 'DESVIOS DE PRODUTO', responsavel: 'Pedro Bruno', area: 'Frota', previsaoInicio: '08/04/2026', previsaoFim: '08/05/2026', andamento: 'Concluído', status: 'Concluído' },
  { id: 'p9', planosDeAcao: 'Criar equipes multifuncionais que estejam aptas para assumir possíveis absenteísmos.', fatorTipo: 'Ameaça', itemRelacionado: 'AFASTAMENTO POR MOTIVO DE SAÚDE', responsavel: 'Nixon', area: 'Controle', previsaoInicio: '01/02/2026', previsaoFim: '28/03/2026', andamento: 'Concluído', status: 'Concluído' },
  { id: 'p10', planosDeAcao: 'Garantir cobertura total de câmeras na área de retornos, carregamento e mkt place.', fatorTipo: 'Ameaça', itemRelacionado: 'CÂMERAS DE SEGURANÇA', responsavel: 'Marcos Guilherme', area: 'Logística', previsaoInicio: '01/06/2026', previsaoFim: '30/06/2026', andamento: 'Concluído', status: 'Concluído' },
  { id: 'p11', planosDeAcao: 'Melhorar visibilidade operacional com lâmpadas LED nas docas e pátio.', fatorTipo: 'Ameaça', itemRelacionado: 'ILUMINAÇÃO DA ÁREA DAS CARRETAS', responsavel: 'Djeanderson', area: 'Armazém', previsaoInicio: '01/02/2026', previsaoFim: '30/04/2026', andamento: 'Concluído', status: 'Concluído' },
  { id: 'p12', planosDeAcao: 'Separar materiais por categoria e criticidade para manutenção de paletes.', fatorTipo: 'Ameaça', itemRelacionado: 'ATIVOS DE GIRO DANIFICADOS', responsavel: 'Marcos Guilherme', area: 'Logística', previsaoInicio: '01/02/2026', previsaoFim: '30/12/2026', andamento: 'Concluído', status: 'Concluído' },
  { id: 'p13', planosDeAcao: 'Unificação de processos em uma tela única no CCO digital.', fatorTipo: 'Força', itemRelacionado: 'NOVAS TECNOLOGIAS PARA ACOMPANHAMENTO', responsavel: 'Djeanderson', area: 'Armazém', previsaoInicio: '01/02/2026', previsaoFim: '30/12/2026', andamento: 'Em andamento', status: 'Em andamento' },
  { id: 'p14', planosDeAcao: 'Promover matinais com foco em integração. Treinamentos cruzados no time. Reconhecimento por metas.', fatorTipo: 'Força', itemRelacionado: 'TRABALHO EM EQUIPE', responsavel: 'Djeanderson', area: 'Armazém', previsaoInicio: '02/02/2026', previsaoFim: '30/11/2026', andamento: 'Em andamento', status: 'Em andamento' },
  { id: 'p15', planosDeAcao: 'Padronizar uso do Fast Picking em 100% dos turnos. Mapear rotinas na plataforma.', fatorTipo: 'Força', itemRelacionado: 'NOVAS TECNOLOGIAS (FAST PICKING, HTML)', responsavel: 'Djeanderson', area: 'Armazém', previsaoInicio: '02/02/2026', previsaoFim: '30/04/2026', andamento: 'Concluído', status: 'Concluído' },
  { id: 'p16', planosDeAcao: 'Mapear rotinas diárias e diários de bordo. Criar checklist operacional do armazém.', fatorTipo: 'Força', itemRelacionado: 'ORGANIZAÇÃO DE ROTINAS', responsavel: 'Djeanderson', area: 'Armazém', previsaoInicio: '02/03/2026', previsaoFim: '29/05/2026', andamento: 'Concluído', status: 'Concluído' },
  { id: 'p17', planosDeAcao: 'Alinhar rotinas com frota, distribuição, gente e comercial. Criar alinhamento diário.', fatorTipo: 'Força', itemRelacionado: 'COMUNICAÇÃO ENTRE SETORES', responsavel: 'Nixon', area: 'Controle', previsaoInicio: '01/04/2026', previsaoFim: '30/06/2026', andamento: 'Concluído', status: 'Concluído' },
  { id: 'p18', planosDeAcao: 'Realizar inspeção preventiva do galpão. Manutenção de portões e piso.', fatorTipo: 'Força', itemRelacionado: 'ESTRUTURA PREDIAL', responsavel: 'Alisson', area: 'Financeiro', previsaoInicio: '04/05/2026', previsaoFim: '31/07/2026', andamento: 'Em andamento', status: 'Em andamento' },
  { id: 'p19', planosDeAcao: 'Intensificar treinamentos na área, buscar oportunidades e entender problemas do processo.', fatorTipo: 'Fraqueza', itemRelacionado: 'MONTAGEM', responsavel: 'Djeanderson', area: 'Armazém', previsaoInicio: '02/03/2026', previsaoFim: '30/04/2026', andamento: 'Concluído', status: 'Concluído' },
  { id: 'p20', planosDeAcao: 'Criar processo ágil de conferência de retorno. Registrar motivos de trocas.', fatorTipo: 'Fraqueza', itemRelacionado: 'TROCAS E REPOSIÇÕES', responsavel: 'Djeanderson', area: 'Armazém', previsaoInicio: '01/04/2026', previsaoFim: '30/06/2026', andamento: 'Concluído', status: 'Concluído' },
  { id: 'p21', planosDeAcao: 'Criar acompanhamentos de trocas e reposições com visões por RN, setores e produtos.', fatorTipo: 'Fraqueza', itemRelacionado: 'TROCAS E REPOSIÇÕES', responsavel: 'Djeanderson', area: 'Armazém', previsaoInicio: '01/04/2026', previsaoFim: '30/06/2026', andamento: 'Concluído', status: 'Concluído' },
  { id: 'p22', planosDeAcao: 'Intensificar conciliação diária. Restringir acesso a áreas de alto valor.', fatorTipo: 'Fraqueza', itemRelacionado: 'DESVIOS DE PRODUTO', responsavel: 'Nixon', area: 'Controle', previsaoInicio: '02/03/2026', previsaoFim: '31/03/2026', andamento: 'Concluído', status: 'Concluído' },
  { id: 'p23', planosDeAcao: 'Mapear necessidade de PDAs/Impressoras. Estabelecer colheita de recarga.', fatorTipo: 'Fraqueza', itemRelacionado: 'FALTA DE EQUIPAMENTO PARA OPERACIONAL', responsavel: 'Alisson', area: 'Financeiro', previsaoInicio: '04/05/2026', previsaoFim: '30/06/2026', andamento: 'Concluído', status: 'Concluído' },
  { id: 'p24', planosDeAcao: 'Anexar no próximo CAPEX solicitação de estrutura para armazenamento dos materiais.', fatorTipo: 'Fraqueza', itemRelacionado: 'AREA PARA ARMAZENAMENTO DE INSUMOS', responsavel: 'Marcos Guilherme', area: 'Logística', previsaoInicio: '11/03/2026', previsaoFim: '31/07/2026', andamento: 'Em andamento', status: 'Em andamento' },
  { id: 'p25', planosDeAcao: 'Estudar novas ferramentas de acompanhamento e automação de planilhas.', fatorTipo: 'Oportunidade', itemRelacionado: 'NOVAS TECNOLOGIAS ACOMPANHAMENTO', responsavel: 'Djeanderson', area: 'Armazém', previsaoInicio: '03/02/2026', previsaoFim: '28/08/2026', andamento: 'Em andamento', status: 'Em andamento' },
  { id: 'p26', planosDeAcao: 'Mapear boas práticas de outras revendas. Realizar reuniões de troca.', fatorTipo: 'Oportunidade', itemRelacionado: 'PROGRAMA DE BENCHMARKING', responsavel: 'Nixon', area: 'Controle', previsaoInicio: '01/05/2026', previsaoFim: '31/12/2026', andamento: 'Em andamento', status: 'Em andamento' },
  { id: 'p27', planosDeAcao: 'Criar rotina formal de reuniões com a fábrica atuando nos maiores dores.', fatorTipo: 'Oportunidade', itemRelacionado: 'REUNIÕES COM AS FÁBRICAS', responsavel: 'Kathyel', area: 'Puxada', previsaoInicio: '01/05/2026', previsaoFim: '31/12/2026', andamento: 'Em andamento', status: 'Em andamento' },
  { id: 'p28', planosDeAcao: 'Controlar uso de filme stretch e paletes. Buscar alternativas no modelo de rolo.', fatorTipo: 'Ameaça', itemRelacionado: 'AUMENTO DO PREÇO DE INSUMOS', responsavel: 'Djeanderson', area: 'Armazém', previsaoInicio: '01/05/2026', previsaoFim: '31/12/2026', andamento: 'Em andamento', status: 'Em andamento' },
  { id: 'p29', planosDeAcao: 'Monitorar indicadores de estoque e faltas diretamente com a fábrica.', fatorTipo: 'Ameaça', itemRelacionado: 'INDISPONIBILIDADE FABRIL', responsavel: 'Kathyel', area: 'Puxada', previsaoInicio: '01/05/2026', previsaoFim: '31/12/2026', andamento: 'Em andamento', status: 'Em andamento' },
  { id: 'p30', planosDeAcao: 'Buscar alternativas para entregar meta PNR (Toos e Stock Out).', fatorTipo: 'Ameaça', itemRelacionado: 'INDISPONIBILIDADE FABRIL', responsavel: 'Kathyel', area: 'Puxada', previsaoInicio: '01/05/2026', previsaoFim: '31/12/2026', andamento: 'Em andamento', status: 'Em andamento' },
  { id: 'p31', planosDeAcao: 'Buscar alternativas para alagamento no armazém em fortes chuvas.', fatorTipo: 'Ameaça', itemRelacionado: 'FORTES CHUVAS', responsavel: 'Djeanderson', area: 'Armazém', previsaoInicio: '01/05/2026', previsaoFim: '31/12/2026', andamento: 'Em andamento', status: 'Em andamento' },
  { id: 'p32', planosDeAcao: 'Mapear rotas externas e trajetos da frota rodoviária.', fatorTipo: 'Oportunidade', itemRelacionado: 'BOM ESTADO DAS RODOVIAS', responsavel: 'Elisson', area: 'Distribuição', previsaoInicio: '01/05/2026', previsaoFim: '31/12/2026', andamento: 'Em andamento', status: 'Em andamento' },
  { id: 'p33', planosDeAcao: 'Fechar parcerias com cursos técnicos (SEST/SENAT) para formação da equipe de empilhadores.', fatorTipo: 'Oportunidade', itemRelacionado: 'CAPACITAÇÃO DE QLP (EMPILHADEIRA)', responsavel: 'Djeanderson', area: 'Armazém', previsaoInicio: '01/05/2026', previsaoFim: '31/12/2026', andamento: 'Em andamento', status: 'Em andamento' },
  { id: 'p34', planosDeAcao: 'Realizar compra de carregadores portáteis e dados móveis em falta de energia.', fatorTipo: 'Ameaça', itemRelacionado: 'QUEDAS DE ENERGIA', responsavel: 'Nixon', area: 'Controle', previsaoInicio: '01/05/2026', previsaoFim: '31/12/2026', andamento: 'Em andamento', status: 'Em andamento' },
  { id: 'p35', planosDeAcao: 'Treinar colaboradores em múltiplas funções como forma de atuar em faltas de última hora.', fatorTipo: 'Ameaça', itemRelacionado: 'AFASTAMENTO MOTIVO DE SAÚDE', responsavel: 'Nixon', area: 'Controle', previsaoInicio: '01/05/2026', previsaoFim: '31/12/2026', andamento: 'Em andamento', status: 'Em andamento' }
];

export default function DnSwotPanel({ user, onNavigate }: DnSwotPanelProps) {
  const [activeTab, setActiveTab] = useState<'quadrantes' | 'recomendacoes' | 'planos' | 'tabelas' | 'excel'>('quadrantes');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>('todos');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('todos');

  // Excel Custom Import state
  const [customExcelSheets, setCustomExcelSheets] = useState<{ sheetName: string; headers: string[]; rows: any[] }[]>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const imported: { sheetName: string; headers: string[]; rows: any[] }[] = [];

        workbook.SheetNames.forEach((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
          if (jsonData.length > 0) {
            imported.push({
              sheetName,
              headers: Object.keys(jsonData[0]),
              rows: jsonData
            });
          }
        });

        if (imported.length > 0) {
          setCustomExcelSheets(imported);
          setActiveTab('excel');
          alert(`✅ Planilha personalizada carregada com sucesso! (${imported.length} guias encontradas)`);
        }
      } catch (err) {
        alert('❌ Erro ao ler planilha Excel.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleExportPdf = () => {
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      doc.text('DPO ABInBev - MATRIZ SWOT 2026 (Ciclo de Gerenciamento)', 40, 40);
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text('Pau Brasil Distribuidora - Unidade Guarabira | Visão de Governança Integrada', 40, 58);

      let startY = 90;
      doc.setFontSize(12);
      doc.text('1. TOP 5 FORÇAS & TOP 5 FRAQUEZAS', 40, startY);
      startY += 20;

      doc.setFontSize(9);
      SWOT_FACTORS_2026.slice(0, 10).forEach((item, idx) => {
        doc.text(`${idx + 1}. [${item.tipo}] ${item.item} - Score: ${item.pontuacao}`, 50, startY);
        startY += 15;
      });

      doc.save('DPO_SWOT_2026_Guarabira.pdf');
    } catch (e) {
      window.print();
    }
  };

  // Filtered Action Plans
  const filteredActionPlans = SWOT_ACTION_PLANS_2026.filter((plan) => {
    const matchesSearch = !searchTerm || 
      plan.planosDeAcao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.itemRelacionado.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.responsavel.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesArea = selectedAreaFilter === 'todos' || plan.area === selectedAreaFilter;
    const matchesStatus = selectedStatusFilter === 'todos' || plan.status === selectedStatusFilter;

    return matchesSearch && matchesArea && matchesStatus;
  });

  const totalPlans = SWOT_ACTION_PLANS_2026.length;
  const completedPlans = SWOT_ACTION_PLANS_2026.filter(p => p.status === 'Concluído').length;
  const inProgressPlans = SWOT_ACTION_PLANS_2026.filter(p => p.status === 'Em andamento').length;

  return (
    <div className="space-y-6 pb-12" id="dn-swot-workstation-container">
      {/* HEADER MASTER ESTRATÉGICO */}
      <div className="bg-gradient-to-r from-[#0a1120] via-[#111c35] to-[#0d182e] border border-amber-500/30 rounded-2xl p-6 text-white shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="space-y-2 relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5" /> DPO ABInBev - Ciclo de Gerenciamento
            </span>
            <span className="text-[10px] text-slate-300 font-bold bg-slate-800 px-2.5 py-0.5 rounded-full">
              Pau Brasil Distribuidora - Guarabira
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <FileSpreadsheet className="w-8 h-8 text-amber-400 shrink-0" />
            SWOT 2026 & Descrição de Negócio (DN)
          </h1>

          <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
            Painel institucional oficial de governança e diretrizes estratégicas. Disponível para consulta de todos os colaboradores do armazém, logística e controle.
          </p>
        </div>

        {/* BOTÕES DE AÇÃO */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 relative z-10">
          <label className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg flex items-center gap-2 border border-emerald-400/30">
            <Upload className="w-4 h-4" />
            <span>Importar Outro Excel</span>
            <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} className="hidden" />
          </label>

          <button
            onClick={handleExportPdf}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 border border-slate-700"
          >
            <Download className="w-4 h-4 text-sky-400" />
            <span>Baixar PDF Oficial</span>
          </button>
        </div>
      </div>

      {/* METRICAS DE PLANOS DE AÇÃO DPO */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-[#111a30] border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Total de Ações Mapeadas</span>
            <span className="text-xl font-black text-white font-mono">{totalPlans} Planos</span>
          </div>
          <Target className="w-8 h-8 text-indigo-400 opacity-80" />
        </div>

        <div className="bg-[#111a30] border border-emerald-500/30 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">Ações Concluídas</span>
            <span className="text-xl font-black text-emerald-400 font-mono">{completedPlans} ({Math.round((completedPlans/totalPlans)*100)}%)</span>
          </div>
          <CheckCircle2 className="w-8 h-8 text-emerald-400 opacity-80" />
        </div>

        <div className="bg-[#111a30] border border-amber-500/30 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">Em Andamento / Rotina</span>
            <span className="text-xl font-black text-amber-400 font-mono">{inProgressPlans} ({Math.round((inProgressPlans/totalPlans)*100)}%)</span>
          </div>
          <Clock className="w-8 h-8 text-amber-400 opacity-80" />
        </div>

        <div className="bg-[#111a30] border border-sky-500/30 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-sky-400 block">Recomendações Cruzadas</span>
            <span className="text-xl font-black text-sky-400 font-mono">{SWOT_RECOMMENDATIONS_2026.length} Diretrizes</span>
          </div>
          <Sparkles className="w-8 h-8 text-sky-400 opacity-80" />
        </div>
      </div>

      {/* TABS DE NAVEGAÇÃO DA SWOT */}
      <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-2 flex flex-wrap items-center justify-between gap-2 shadow-md">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('quadrantes')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 border ${
              activeTab === 'quadrantes'
                ? 'bg-amber-600 text-white border-amber-400 shadow-lg scale-102'
                : 'bg-[#0b1222] text-slate-300 hover:text-white border-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-amber-400" />
            <span>Top 5 & Quadrantes SWOT</span>
          </button>

          <button
            onClick={() => setActiveTab('recomendacoes')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 border ${
              activeTab === 'recomendacoes'
                ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg scale-102'
                : 'bg-[#0b1222] text-slate-300 hover:text-white border-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>Estratégias & Recomendações ({SWOT_RECOMMENDATIONS_2026.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('planos')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 border ${
              activeTab === 'planos'
                ? 'bg-emerald-600 text-white border-emerald-400 shadow-lg scale-102'
                : 'bg-[#0b1222] text-slate-300 hover:text-white border-slate-800'
            }`}
          >
            <CheckSquare className="w-4 h-4 text-emerald-400" />
            <span>Planos de Ação ({totalPlans})</span>
          </button>

          <button
            onClick={() => setActiveTab('tabelas')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 border ${
              activeTab === 'tabelas'
                ? 'bg-sky-600 text-white border-sky-400 shadow-lg scale-102'
                : 'bg-[#0b1222] text-slate-300 hover:text-white border-slate-800'
            }`}
          >
            <Layers className="w-4 h-4 text-sky-400" />
            <span>Tabela de Pontuações</span>
          </button>

          {customExcelSheets.length > 0 && (
            <button
              onClick={() => setActiveTab('excel')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 border ${
                activeTab === 'excel'
                  ? 'bg-purple-600 text-white border-purple-400 shadow-lg'
                  : 'bg-[#0b1222] text-purple-300 border-slate-800'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-purple-400" />
              <span>Planilha Customizada Importada ({customExcelSheets.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* CONTEÚDO TAB 1: TOP 5 & QUADRANTES SWOT (RESUMO EXECUTIVO) */}
      {activeTab === 'quadrantes' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* TOP 5 FORÇAS */}
            <div className="bg-[#111a30] border border-emerald-500/40 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" /> 1.1 TOP 5 FORÇAS (INTERNO)
                  </h3>
                  <span className="text-[10px] text-slate-400">Total Pontuação Top 5: 480 pts</span>
                </div>
                <span className="text-xs bg-emerald-500/20 text-emerald-300 font-mono font-bold px-2.5 py-1 rounded-full border border-emerald-500/30">
                  Forças
                </span>
              </div>

              <div className="space-y-2">
                {SWOT_FACTORS_2026.filter(f => f.tipo === 'Força').slice(0, 5).map((fator, idx) => (
                  <div key={fator.id} className="p-3 bg-[#0b1222] rounded-xl border border-emerald-500/20 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">1.{idx + 1}</span>
                      <strong className="text-xs text-white block">{fator.item}</strong>
                      <span className="text-[10px] text-slate-400 block">{fator.importancia} | {fator.intensidadeOUurgencia}</span>
                    </div>
                    <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/30">
                      {fator.pontuacao} pts
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* TOP 5 FRAQUEZAS */}
            <div className="bg-[#111a30] border border-rose-500/40 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-rose-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400" /> 1.2 TOP 5 FRAQUEZAS (INTERNO)
                  </h3>
                  <span className="text-[10px] text-slate-400">Total Pontuação Top 5: 525 pts</span>
                </div>
                <span className="text-xs bg-rose-500/20 text-rose-300 font-mono font-bold px-2.5 py-1 rounded-full border border-rose-500/30">
                  Gargalos
                </span>
              </div>

              <div className="space-y-2">
                {SWOT_FACTORS_2026.filter(f => f.tipo === 'Fraqueza').slice(0, 5).map((fator, idx) => (
                  <div key={fator.id} className="p-3 bg-[#0b1222] rounded-xl border border-rose-500/20 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono text-rose-400 font-bold">2.{idx + 1}</span>
                      <strong className="text-xs text-white block">{fator.item}</strong>
                      <span className="text-[10px] text-slate-400 block">{fator.importancia} | {fator.intensidadeOUurgencia}</span>
                    </div>
                    <span className="text-xs font-mono font-black text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded border border-rose-500/30">
                      {fator.pontuacao} pts
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* TOP 5 OPORTUNIDADES */}
            <div className="bg-[#111a30] border border-sky-500/40 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-sky-400 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-sky-400" /> 2.1 TOP 5 OPORTUNIDADES (EXTERNO)
                  </h3>
                  <span className="text-[10px] text-slate-400">Total Pontuação Top 5: 510 pts</span>
                </div>
                <span className="text-xs bg-sky-500/20 text-sky-300 font-mono font-bold px-2.5 py-1 rounded-full border border-sky-500/30">
                  Crescimento
                </span>
              </div>

              <div className="space-y-2">
                {SWOT_FACTORS_2026.filter(f => f.tipo === 'Oportunidade').slice(0, 5).map((fator, idx) => (
                  <div key={fator.id} className="p-3 bg-[#0b1222] rounded-xl border border-sky-500/20 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono text-sky-400 font-bold">3.{idx + 1}</span>
                      <strong className="text-xs text-white block">{fator.item}</strong>
                      <span className="text-[10px] text-slate-400 block">{fator.importancia} | Urgência: {fator.intensidadeOUurgencia}</span>
                    </div>
                    <span className="text-xs font-mono font-black text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded border border-sky-500/30">
                      {fator.pontuacao} pts
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* TOP 5 AMEAÇAS */}
            <div className="bg-[#111a30] border border-amber-500/40 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" /> 2.2 TOP 5 AMEAÇAS (EXTERNO)
                  </h3>
                  <span className="text-[10px] text-slate-400">Total Pontuação Top 5: 465 pts</span>
                </div>
                <span className="text-xs bg-amber-500/20 text-amber-300 font-mono font-bold px-2.5 py-1 rounded-full border border-amber-500/30">
                  Ameaças
                </span>
              </div>

              <div className="space-y-2">
                {SWOT_FACTORS_2026.filter(f => f.tipo === 'Ameaça').slice(0, 5).map((fator, idx) => (
                  <div key={fator.id} className="p-3 bg-[#0b1222] rounded-xl border border-amber-500/20 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono text-amber-400 font-bold">4.{idx + 1}</span>
                      <strong className="text-xs text-white block">{fator.item}</strong>
                      <span className="text-[10px] text-slate-400 block">{fator.importancia} | Urgência: {fator.intensidadeOUurgencia}</span>
                    </div>
                    <span className="text-xs font-mono font-black text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/30">
                      {fator.pontuacao} pts
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO TAB 2: MATRIZ CRUZADA & RECOMENDAÇÕES ESTRATÉGICAS */}
      {activeTab === 'recomendacoes' && (
        <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" /> Matriz Cruzada & Recomendações Estratégicas DPO
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Diretrizes de alinhamento operacional cruzando Forças/Fraquezas com Oportunidades/Ameaças.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0b1222] border-b border-slate-800 text-[11px] font-black uppercase text-indigo-300">
                  <th className="py-3 px-4">Fatores Internos</th>
                  <th className="py-3 px-4">Oportunidades & Ameaças</th>
                  <th className="py-3 px-4">Tipo de Estratégia</th>
                  <th className="py-3 px-4">Recomendação Estratégica</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-xs">
                {SWOT_RECOMMENDATIONS_2026.map((rec, i) => (
                  <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-200">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-black mr-2 ${rec.tipoInterno === 'Força' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                        {rec.tipoInterno}
                      </span>
                      {rec.fatorInterno}
                    </td>

                    <td className="py-3 px-4 text-slate-300">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-black mr-2 ${rec.tipoExterno === 'Oportunidade' ? 'bg-sky-500/20 text-sky-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        {rec.tipoExterno}
                      </span>
                      {rec.fatorExterno}
                    </td>

                    <td className="py-3 px-4 font-bold whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-black tracking-wider ${
                        rec.tipoEstrategia === 'Estratégia ofensiva' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        rec.tipoEstrategia === 'Estratégia de reforço' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' :
                        rec.tipoEstrategia === 'Estratégia defensiva' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                        'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        {rec.tipoEstrategia}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-200 leading-relaxed font-medium">
                      {rec.recomendacao}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTEÚDO TAB 3: PLANOS DE AÇÃO DETALHADOS (35 PLANOS COM RESPONSÁVEIS) */}
      {activeTab === 'planos' && (
        <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-400" /> Planos de Ação Operacionais ({filteredActionPlans.length} exibidos)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Acompanhamento detalhado com responsáveis, área, previsão de término e status de execução.
              </p>
            </div>

            {/* FILTROS DE PESQUISA, ÁREA E STATUS */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Pesquisar ação, item ou pessoa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-[#0b1222] border border-slate-700 text-white rounded-xl pl-8 pr-3 py-1.5 text-xs outline-none focus:border-emerald-500"
                />
              </div>

              <select
                value={selectedAreaFilter}
                onChange={(e) => setSelectedAreaFilter(e.target.value)}
                className="bg-[#0b1222] border border-slate-700 text-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-emerald-500"
              >
                <option value="todos">Todas as Áreas</option>
                <option value="Armazém">Armazém</option>
                <option value="Logística">Logística</option>
                <option value="Frota">Frota</option>
                <option value="Financeiro">Financeiro</option>
                <option value="Controle">Controle</option>
                <option value="Puxada">Puxada</option>
                <option value="Segurança">Segurança</option>
                <option value="Distribuição">Distribuição</option>
              </select>

              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="bg-[#0b1222] border border-slate-700 text-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-emerald-500"
              >
                <option value="todos">Todos os Status</option>
                <option value="Concluído">Concluídos</option>
                <option value="Em andamento">Em Andamento</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0b1222] border-b border-slate-800 text-[11px] font-black uppercase text-emerald-300">
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Ação Proposta</th>
                  <th className="py-3 px-4">Item Relacionado</th>
                  <th className="py-3 px-4">Responsável</th>
                  <th className="py-3 px-4">Área</th>
                  <th className="py-3 px-4">Período</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-xs">
                {filteredActionPlans.map((plan, i) => (
                  <tr key={plan.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-500 text-[10px]">
                      {i + 1}
                    </td>
                    <td className="py-3 px-4 font-bold text-white max-w-xs leading-relaxed">
                      {plan.planosDeAcao}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {plan.itemRelacionado}
                    </td>
                    <td className="py-3 px-4 font-black text-indigo-300 whitespace-nowrap">
                      {plan.responsavel}
                    </td>
                    <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                        {plan.area}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap text-[10px]">
                      {plan.previsaoInicio} até {plan.previsaoFim}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        plan.status === 'Concluído' 
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        {plan.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTEÚDO TAB 4: TABELA DETALHADA DE PONTUAÇÕES */}
      {activeTab === 'tabelas' && (
        <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-sky-400 flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-400" /> Tabela Completa de Fatores DPO ({SWOT_FACTORS_2026.length} Itens)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Valores completos de Importância, Intensidade/Urgência, Tendência e Score Ponderado.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0b1222] border-b border-slate-800 text-[11px] font-black uppercase text-sky-300">
                  <th className="py-3 px-4">Item Estratégico</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Importância</th>
                  <th className="py-3 px-4">Intensidade / Urgência</th>
                  <th className="py-3 px-4">Tendência</th>
                  <th className="py-3 px-4 text-right">Pontuação Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-xs">
                {SWOT_FACTORS_2026.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-white">
                      {item.item}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        item.tipo === 'Força' ? 'bg-emerald-500/20 text-emerald-400' :
                        item.tipo === 'Fraqueza' ? 'bg-rose-500/20 text-rose-400' :
                        item.tipo === 'Oportunidade' ? 'bg-sky-500/20 text-sky-400' :
                        'bg-amber-500/20 text-amber-400'
                      }`}>
                        {item.tipo}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{item.importancia}</td>
                    <td className="py-3 px-4 text-slate-300">{item.intensidadeOUurgencia}</td>
                    <td className="py-3 px-4 text-slate-300">{item.tendencia}</td>
                    <td className="py-3 px-4 text-right font-mono font-black text-amber-400">
                      {item.pontuacao} pts
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTEÚDO TAB 5: SE O USUÁRIO CARREGOU OUTRA PLANILHA EXCEL */}
      {activeTab === 'excel' && customExcelSheets.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            {customExcelSheets.map((sheet, idx) => (
              <button
                key={sheet.sheetName + idx}
                className="px-3 py-1.5 bg-[#111a30] border border-purple-500/40 text-purple-300 rounded-xl text-xs font-bold"
              >
                {sheet.sheetName} ({sheet.rows.length} linhas)
              </button>
            ))}
          </div>

          {customExcelSheets.map((sheet, sIdx) => (
            <div key={sIdx} className="bg-[#111a30] border border-slate-800 rounded-2xl p-5 space-y-3">
              <h4 className="text-xs font-black uppercase text-white">{sheet.sheetName}</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#0b1222] text-slate-300 font-bold border-b border-slate-800">
                      {sheet.headers.map((h, i) => (
                        <th key={i} className="p-2 border-r border-slate-800">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {sheet.rows.map((row, rIdx) => (
                      <tr key={rIdx}>
                        {sheet.headers.map((h, cIdx) => (
                          <td key={cIdx} className="p-2 border-r border-slate-800/50">{String(row[h] || '')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
