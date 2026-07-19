import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc,
  updateDoc,
  where
} from 'firebase/firestore';
import { Usuario, Empresa, RepackA3Board } from '../types';
import { 
  Search, 
  Plus, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  Trophy, 
  Check,
  Zap,
  Calendar,
  BarChart3,
  AlertCircle,
  Users,
  Activity,
  CheckCircle2,
  Clock,
  TrendingUp,
  Sliders,
  User
} from 'lucide-react';

interface A3BoardComponentProps {
  user: Usuario;
  empresa: Empresa | null;
  dashboard: 'repack' | 'despejo' | 'logistica' | 'quebras' | 'fefo' | 'blitz' | 'picking';
}

export default function A3BoardComponent({ user, empresa, dashboard }: A3BoardComponentProps) {
  const [boards, setBoards] = useState<RepackA3Board[]>([]);
  const [activeBoard, setActiveBoard] = useState<RepackA3Board | null>(null);
  const [savingBoard, setSavingBoard] = useState(false);
  const [boardSaveStatus, setBoardSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [currentA3Step, setCurrentA3Step] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'landscape' | 'steps'>('steps');
  const [activeTab, setActiveTab] = useState<'passos' | 'dashboard_acoes'>('passos');
  const [actionSearch, setActionSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<'todos' | 'Pendente' | 'Em Andamento' | 'Bloqueado' | 'Concluído'>('todos');

  // Fallback seed template depending on dashboard
  const fallbackSeedBoard = useMemo<RepackA3Board>(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const empresaId = empresa?.id || 'demo';

    switch (dashboard) {
      case 'picking':
        return {
          _docId: 'seed-board-picking',
          empresaId,
          dashboard: 'picking',
          titulo: 'Otimização do Tempo de Abastecimento de Picking e Sincronismo com Conferência',
          dataCriacaoISO: todayStr,
          problemaDesc: 'Lentidão no atendimento de ordens de reabastecimento de picking disparadas pelos conferentes gerais, gerando ociosidade na conferência de expedição e atrasando a saída de caminhões.',
          problemaImpacto: 'Atraso médio de 18 minutos por solicitação de reabastecimento, gerando acúmulo de conferentes parados na doca e caminhões perdendo a janela de faturamento padrão.',
          problemaCausa: '1. Falta de canal direto de aviso de reabastecimento para as empilhadeiras (anteriormente feito no grito ou rádio congestionado).\n2. Abastecimento executado sem checklist de prontidão e corredor desorganizado.\n3. Falta de classificação de prioridade entre carregamento ativo ("Durante") e rotinas normativas ("Após").',
          problemaEvidencias: 'Média de TMA (Tempo Médio de Atendimento) de 18.5 minutos por palete de picking solicitado, com picos de congestionamento operacional entre 14h00 e 17h30.',
          recursos: '1. Aplicativo de Pátio integrado para recebimento de ordens digitais no suporte da cabine.\n2. Instalação de sinalizadores luminosos (semáforos de status) nas docas principais.',
          comentarios: 'Plano desenvolvido com a participação ativa dos conferentes Gilson e Matheus e o operador Ronildo.',
          concluidas: '1. Lançamento do módulo de despacho digital de ordens de reabastecimento.\n2. Implementação do checklist de segurança pré-operação das empilhadeiras.',
          aprendizados: 'A substituição de chamadas de voz por atribuição digital transparente na cabine reduziu o tempo de espera do operador em mais de 40%.',
          padronizacao: 'Inclusão da auditoria de TMA de Picking na reunião operacional de 10 minutos (DDS) matinal.',
          resultadosDesc: 'O TMA médio de picking caiu de 18.5 min para apenas 4.2 min, perfeitamente alinhado à meta de pátio.',
          impactoNegocio: 'Aumento da fluidez de saída de frotas e redução drástica do tempo ocioso na conferência geral de pallets.',
          proximosPassos: 'Instalar alertas vibratórios no console das empilhadeiras para notificações urgentes de faturamento em andamento.',
          dataRevisao: todayStr,
          actions: [
            { acao: 'Configurar o recebimento digital de tarefas na cabine', responsavel: 'Líder TI / Pátio', prazo: todayStr, status: 'Concluído', pct: 100 },
            { acao: 'Efetuar auditoria e isolamento do corredor de reabastecimento', responsavel: 'Supervisor Operações', prazo: todayStr, status: 'Concluído', pct: 100 },
            { acao: 'Treinar equipe de conferentes e empilhadores no uso do despacho', responsavel: 'Supervisor Operações', prazo: todayStr, status: 'Em Andamento', pct: 85 },
            { acao: 'Instalar suportes ergonômicos para smartphones/tablets nas empilhadeiras', responsavel: 'Manutenção Pátio', prazo: todayStr, status: 'Pendente', pct: 0 },
            { acao: 'Fixar metas de TMA em 5 min para reabastecimento urgente', responsavel: 'Supervisor Pátio', prazo: todayStr, status: 'Pendente', pct: 0 }
          ],
          indicadores: [
            { indicador: 'Tempo Médio de Atendimento - TMA (min)', antes: '18.5', depois: '4.2', variacao: '-77.3%' },
            { indicador: 'Produtividade de Paletes Movimentados/Hora', antes: '12', depois: '28', variacao: '+133.3%' },
            { indicador: 'Tempo Ocioso do Conferente na Doca (min/h)', antes: '22', depois: '3', variacao: '-86.4%' }
          ]
        };

      case 'despejo':
        return {
          _docId: 'seed-board-despejo',
          empresaId,
          dashboard: 'despejo',
          titulo: 'Otimização do Tempo de Despejo e Redução de Quebras de Vasilhames',
          dataCriacaoISO: todayStr,
          problemaDesc: 'O tempo de despejo de líquidos vencidos/retornados está acima do padrão VPO (meta de 5 min por palete), gerando acúmulo de paletes na área de descarte e elevando a taxa de desperdício/quebras operacionais.',
          problemaImpacto: 'Gargalos graves na área de devolução de rota, lentidão na liberação de paleteiras hidráulicas do pátio e alto índice de avaria de garrafas de vidro de 600ml e 1L durante o manuseio brusco.',
          problemaCausa: '1. Processo manual e lento de abertura de engradados plásticos.\n2. Canaleta de escoamento e drenagem de líquidos sem manutenção, com vazão reduzida.\n3. Layout de trânsito de resíduos confuso, misturando paletes vazios com cheios.',
          problemaEvidencias: 'Mapeamento diário de despejos mostrando média de 7:30 min para esvaziamento total por palete e taxa de quebras e perdas de garrafas atingindo 1.8% do volume de retorno total.',
          recursos: '1. Mesa de apoio de madeira ergonômica (custo R$150).\n2. Equipamentos para desobstrução e ampliação de grade da canaleta operacional (custo R$80).',
          comentarios: 'Discussão de 5 minutos feita no Matinal Operacional com o time. Idéia da mesa veio do operador Cleiton.',
          concluidas: '1. Instalação da nova mesa de apoio ergonômica.\n2. Desobstrução profunda e reparo de inclinação da canaleta de vazão de líquidos.',
          aprendizados: 'Ajustar a altura do descarte elimina a fadiga muscular e acelera o ciclo de trabalho manual em cerca de 25%.',
          padronizacao: 'Elaboração e publicação da LPP-Despejo-02 fixada ao posto de trabalho e treinamento para os ajudantes.',
          resultadosDesc: 'O tempo de despejo foi reduzido significativamente e estabilizado abaixo da meta de 5 minutos.',
          impactoNegocio: 'Liberação de 1.5 horas/dia de tempo útil de paleteiras e redução drástica das reclamações de lentidão no pátio de retorno.',
          proximosPassos: 'Instalar barreira de contenção metálica no entorno do container de descarte de vidro para maior segurança contra estilhaços.',
          dataRevisao: '2026-07-15',
          actions: [
            { acao: 'Instalar canaleta de alta vazão para escoamento rápido', responsavel: 'Manutenção Pátio', prazo: '10/07/2026', status: 'Concluído', pct: 100 },
            { acao: 'Criar mesa ergonômica de apoio para garrafas', responsavel: 'Equipe Despejo', prazo: '12/07/2026', status: 'Concluído', pct: 100 },
            { acao: 'Treinar auxiliares no novo método de descarte sem impacto', responsavel: 'Supervisor Operações', prazo: '15/07/2026', status: 'Em Andamento', pct: 80 },
            { acao: 'Avaliar desgaste de cestos coletores metálicos', responsavel: 'Comissão de Segurança', prazo: '18/07/2026', status: 'Pendente', pct: 0 },
            { acao: 'Sinalizar área de fluxo de paletes vazios', responsavel: 'Equipe de Pátio', prazo: '20/07/2026', status: 'Pendente', pct: 0 }
          ],
          indicadores: [
            { indicador: 'Tempo de Despejo por Palete (min)', antes: '07:30', depois: '04:15', variacao: '-43.3%' },
            { indicador: 'Taxa de Quebra de Garrafas no Descarte', antes: '1.8%', depois: '0.4%', variacao: '-77.8%' },
            { indicador: 'Paletes Acumulados no Fim do Turno', antes: '12', depois: '2', variacao: '-83.3%' }
          ]
        };

      case 'logistica':
        return {
          _docId: 'seed-board-logistica',
          empresaId,
          dashboard: 'logistica',
          titulo: 'Redução do Tempo de Estadia e Estacionamento de Caminhões (SLA)',
          dataCriacaoISO: todayStr,
          problemaDesc: 'O tempo de permanência total (estadia) dos caminhões de puxada de fábrica e rota urbana ultrapassa rotineiramente a meta de 2 horas de SLA de pátio, causando insatisfação de transportadores.',
          problemaImpacto: 'Atrasos na saída de frotas prontas para distribuição, formação de fila externa de caminhões na via pública e cobrança de multas por diárias de estadia (demurrage).',
          problemaCausa: '1. Lentidão na liberação inicial e faturamento por falta de processo unificado.\n2. Ausência de comunicação ativa sobre docas livres para descarga de vasilhames.\n3. Desalinhamento entre o horário de chegada do motorista e a escala de conferentes.',
          problemaEvidencias: 'Indicador de conformidade de permanência registrando apenas 65% dentro da meta contratual de 120 minutos, com picos de atraso no turno da tarde (14h às 18h).',
          recursos: '1. Quadro branco de gestão visual para as docas (custo R$100).\n2. Rádios extras para comunicação direta entre portaria e faturamento.',
          comentarios: 'Ação estratégica integrada com a equipe de faturamento e o operador de pátio.',
          concluidas: '1. Colocação do painel de docas ativo na portaria.\n2. Integração do grupo de mensagens rápidas de liberação.',
          aprendizados: 'Manter a portaria ciente do status exato das docas elimina 15 minutos de trânsito cego do motorista buscando local.',
          padronizacao: 'Rotina de atualização de docas a cada 30 minutos incluída no manual de faturamento.',
          resultadosDesc: 'Conformidade com o SLA de estadia de pátio subiu para 94%, reduzindo drasticamente as diárias pagas.',
          impactoNegocio: 'Economia estimada de R$ 3.200 mensais em custos de retenção de caminhões de puxada.',
          proximosPassos: 'Integrar os dados de chegada da portaria com o sistema de agendamento digital para automação total de chamadas.',
          dataRevisao: '2026-07-20',
          actions: [
            { acao: 'Instalar painel físico de status de docas na portaria', responsavel: 'Faturista Líder', prazo: '11/07/2026', status: 'Concluído', pct: 100 },
            { acao: 'Padronizar entrega física de ordens de carregamento', responsavel: 'Supervisor Logística', prazo: '13/07/2026', status: 'Concluído', pct: 100 },
            { acao: 'Organizar escala de conferência para pico das 15h', responsavel: 'Líder Conferência', prazo: '15/07/2026', status: 'Em Andamento', pct: 60 },
            { acao: 'Auditar tempos parciais de carregamento por transportadora', responsavel: 'Faturista', prazo: '18/07/2026', status: 'Pendente', pct: 0 },
            { acao: 'Treinar porteiros no checklist de entrada rápida', responsavel: 'Companhia de Vigilância', prazo: '22/07/2026', status: 'Pendente', pct: 0 }
          ],
          indicadores: [
            { indicador: 'Conformidade SLA de Estadia (%)', antes: '65%', depois: '94%', variacao: '+44.6%' },
            { indicador: 'Tempo Médio de Permanência (min)', antes: '155', depois: '105', variacao: '-32.3%' },
            { indicador: 'Custo de Estadia Adicional (R$)', antes: '3200', depois: '0', variacao: '-100.0%' }
          ]
        };

      case 'quebras':
        return {
          _docId: 'seed-board-quebras',
          empresaId,
          dashboard: 'quebras',
          titulo: 'Mitigação de Avarias de Produtos Acabados no Picking de Rota',
          dataCriacaoISO: todayStr,
          problemaDesc: 'O índice de quebras físicas e avarias internas durante a montagem de paletes de rota no picking ultrapassa a meta tolerável de perdas operacionais, encarecendo os custos de movimentação.',
          problemaImpacto: 'Custo elevado com descarte de líquidos, desperdício de caixas/engradados, risco ergonômico com cacos de vidro soltos nas frentes e atraso na conferência de saída.',
          problemaCausa: '1. Abastecimento de frentes de picking executado de forma descuidada com empilhamento excessivo.\n2. Curvas rápidas e piso irregular na transição para o Corredor 3.\n3. Iluminação deficiente que impede a visualização de fendas ou trincas nos engradados.',
          problemaEvidencias: 'Planilha de quebras indicando perda semanal acumulada de R$ 4.500 concentrada no picking de vasilhame de vidro retornável.',
          recursos: '1. Instalação de refletores de LED extras no Corredor 3 (custo R$350).\n2. Aplicação de cantoneiras plásticas rígidas nas colunas de picking.',
          comentarios: 'Ação focada na cultura de cuidado de produtos e segurança física do trabalhador.',
          concluidas: '1. Troca das lâmpadas e instalação de refletores de LED extras no Corredor 3.\n2. Proteção de colunas com cantoneiras de sinalização.',
          aprendizados: 'Boa iluminação previne colisões e ajuda a identificar pequenos vazamentos de líquidos antes que molhem outras caixas.',
          padronizacao: 'Inserção da "Regra de Ouro do Abastecimento de Picking" no DDS matinal das equipes de pátio.',
          resultadosDesc: 'Custo semanal de quebras no picking caiu de R$ 4.500 para R$ 1.570 após as melhorias visuais e estruturais.',
          impactoNegocio: 'Redução de 65% na perda de produtos acabados de alto valor e melhoria das condições de 5S no setor.',
          proximosPassos: 'Instalar espelhos convexos nos cruzamentos de picking para evitar colisões entre empilhadeiras em velocidade.',
          dataRevisao: '2026-07-18',
          actions: [
            { acao: 'Substituir lâmpadas antigas por refletores LED', responsavel: 'Elétrica Unidade', prazo: '06/07/2026', status: 'Concluído', pct: 100 },
            { acao: 'Instalar cantoneiras de segurança reforçadas nas esquinas', responsavel: 'Líder Operação', prazo: '09/07/2026', status: 'Concluído', pct: 100 },
            { acao: 'Efetuar reciclagem de treinamento de direção defensiva', responsavel: 'Segurança do Trabalho', prazo: '12/07/2026', status: 'Em Andamento', pct: 90 },
            { acao: 'Recuperar rachaduras no piso do Corredor 3', responsavel: 'Obras Civis', prazo: '15/07/2026', status: 'Pendente', pct: 0 },
            { acao: 'Fixar limite máximo de velocidade em 10 km/h', responsavel: 'Supervisor Pátio', prazo: '17/07/2026', status: 'Pendente', pct: 0 }
          ],
          indicadores: [
            { indicador: 'Custo Semanal de Avarias (R$)', antes: '4500', depois: '1570', variacao: '-65.1%' },
            { indicador: 'Quebras de Vidros por Turno', antes: '15', depois: '3', variacao: '-80.0%' },
            { indicador: 'Nível de Iluminação do Corredor (Lux)', antes: '85', depois: '260', variacao: '+205.8%' }
          ]
        };

      case 'fefo':
        return {
          _docId: 'seed-board-fefo',
          empresaId,
          dashboard: 'fefo',
          titulo: 'Zero Perda de Validade por FEFO Através de Gestão Visual Dinâmica',
          dataCriacaoISO: todayStr,
          problemaDesc: 'Descarte de produtos acabados de alto giro devido ao descumprimento do rodízio FEFO (First Expired, First Out) na área de picking central de Guarabira.',
          problemaImpacto: 'Perda financeira líquida direta, retrabalho de descarte seguro regulamentado e eventual falta de estoque imediato de marcas líderes para expedição.',
          problemaCausa: '1. Abastecedores inserindo paletes de lotes novos na frente de lotes mais antigos por comodidade.\n2. Falta de etiquetas ou painéis de identificação visual rápida de datas críticas nas posições terrestres.\n3. Rotação do estoque não auditada pelos conferentes no início do turno.',
          problemaEvidencias: 'Registro de descarte de 45 caixas de refrigerante PET por validade vencida e conformidade FEFO apurada em apenas 45% nos corredores operacionais.',
          recursos: '1. Placas coloridas (Amarelo, Laranja, Vermelho) para semáforo de validades críticas (custo R$120).',
          comentarios: 'Plano focado na disciplina de pátio de abastecimento e faturamento seguro.',
          concluidas: '1. Instalação física dos suportes e placas coloridas nas frentes.\n2. Realização da reciclagem de FEFO com o time de empilhadores.',
          aprendizados: 'Sinalização visual de semáforo impede erros de retirada muito mais do que planilhas em papel ou consultas sistêmicas.',
          padronizacao: 'Inclusão da auditoria visual de semáforo FEFO no checklist diário do Conferente Operacional.',
          resultadosDesc: 'Conformidade da rotação FEFO subiu para 98% e as perdas de estoque caíram a zero no último ciclo diário.',
          impactoNegocio: 'Prevenção de descarte que representava perdas de até R$ 3.100 por ocorrência operacional.',
          proximosPassos: 'Replicar a gestão visual semáforo FEFO para a área de estoque aéreo vertical e câmaras frias.',
          dataRevisao: '2026-07-22',
          actions: [
            { acao: 'Fabricar placas coloridas para sinalização FEFO', responsavel: 'Comunicação Visual', prazo: '08/07/2026', status: 'Concluído', pct: 100 },
            { acao: 'Instalar suportes plásticos nas posições de picking', responsavel: 'Auxiliares de Pátio', prazo: '11/07/2026', status: 'Concluído', pct: 100 },
            { acao: 'Treinar empilhadores e ajudantes na rotação FEFO', responsavel: 'Supervisor Abastecimento', prazo: '14/07/2026', status: 'Em Andamento', pct: 75 },
            { acao: 'Realizar inventário rotativo de datas toda terça', responsavel: 'Controle de Estoque', prazo: '18/07/2026', status: 'Pendente', pct: 0 },
            { acao: 'Vincular liberação sistêmica ao lote físico real', responsavel: 'Analista TI', prazo: '22/07/2026', status: 'Pendente', pct: 0 }
          ],
          indicadores: [
            { indicador: 'Perdas por Vencimento (R$)', antes: '3100', depois: '0', variacao: '-100.0%' },
            { indicador: 'Conformidade das Auditorias FEFO (%)', antes: '45%', depois: '98%', variacao: '+117.8%' },
            { indicador: 'Lotes Críticos Monitorados Ativos', antes: '5', depois: '24', variacao: '+380.0%' }
          ]
        };

      case 'blitz':
        return {
          _docId: 'seed-board-blitz',
          empresaId,
          dashboard: 'blitz',
          titulo: 'Aumento do Índice de Aferição e Redução de Refugos nas Rotas',
          dataCriacaoISO: todayStr,
          problemaDesc: 'Lentidão e baixo percentual de aferição de caixas retornadas e refugo nas rotas urbana (Blitz), gerando inconsistência de estoque e acertos financeiros imprecisos.',
          problemaImpacto: 'Quebra de confiança nas conciliações de rotas com os motoristas, perda de rastreabilidade do motivo de refugo operacional e acúmulo de caixas abertas no pátio.',
          problemaCausa: '1. Posto de Blitz sem infraestrutura adequada de balança, energia e apoio logístico.\n2. Processamento demorado por anotação manual em prancheta de papel sujeita a perdas.\n3. Falta de padronização nas regras de pesagem rápida.',
          problemaEvidencias: 'Fechamento financeiro diário indicando índice de erro de 4.5% no acerto de rotas e apenas 50% de rotas retornadas aferidas na Blitz.',
          recursos: '1. Fornecimento de tablet corporativo com app de pátio ativado (custo R$800).\n2. Balança de plataforma digital robusta (custo R$450).',
          comentarios: 'Plano com alta sinergia entre o supervisor de distribuição e a conferência de rotas.',
          concluidas: '1. Aquisição e calibração da balança digital robusta de pátio.\n2. Configuração e entrega do tablet de blitz ao conferente.',
          aprendizados: 'Digitação instantânea de refugo no pátio elimina 98% dos erros humanos de redigitação posterior na sala de controle.',
          padronizacao: 'Inclusão do novo fluxograma de Blitz rápida no manual de acerto de rotas da unidade.',
          resultadosDesc: 'O percentual de rotas aferidas na Blitz subiu para 95% e a taxa de divergência financeira despencou a zero.',
          impactoNegocio: 'Conciliações precisas e transparentes com 100% de aceitação por parte dos transportadores.',
          proximosPassos: 'Revisar os motivos de refugo no matinal de distribuição de rota para atuar na causa raiz das quebras na rua.',
          dataRevisao: '2026-07-25',
          actions: [
            { acao: 'Disponibilizar tablet com aplicativo ativo no pátio', responsavel: 'Analista Suporte TI', prazo: '07/07/2026', status: 'Concluído', pct: 100 },
            { acao: 'Instalar balança digital calibrada na área de Blitz', responsavel: 'Equipe de Qualidade', prazo: '10/07/2026', status: 'Concluído', pct: 100 },
            { acao: 'Capacitar conferentes no lançamento ágil de refugo', responsavel: 'Supervisor Distribuição', prazo: '13/07/2026', status: 'Em Andamento', pct: 60 },
            { acao: 'Implantar cobertura móvel para proteção de chuva', responsavel: 'Manutenção Pátio', prazo: '18/07/2026', status: 'Pendente', pct: 0 },
            { acao: 'Padronizar entrega organizada por ajudante de rota', responsavel: 'Líder de Logística', prazo: '20/07/2026', status: 'Pendente', pct: 0 }
          ],
          indicadores: [
            { indicador: 'Percentual de Rotas Aferidas (%)', antes: '50%', depois: '95%', variacao: '+90.0%' },
            { indicador: 'Divergência Financeira no Fechamento', antes: '4.5%', depois: '0.2%', variacao: '-95.6%' },
            { indicador: 'Tempo de Atendimento de Rota (min)', antes: '22', depois: '11', variacao: '-50.0%' }
          ]
        };

      case 'repack':
      default:
        return {
          _docId: 'seed-board-repack',
          empresaId,
          dashboard: 'repack',
          titulo: 'Redução do Tempo de Repack de Lata 350ml - Guarabira',
          dataCriacaoISO: todayStr,
          problemaDesc: 'O tempo médio de reembalagem da Lata 350ml está em 04:30 minutos, o que excede a nossa meta operacional estabelecida pelo VPO de 04:00 minutos por caixa, causando gargalos no fluxo de expedição.',
          problemaImpacto: 'Atrasos recorrentes no carregamento das rotas de distribuição urbana de Guarabira, gerando horas extras para os conferentes e insatisfação no cliente final devido à perda do horário de recebimento.',
          problemaCausa: '1. Desorganização do layout de insumos (caixas novas a 5 metros de distância).\n2. Operadores não treinados no novo padrão de dobra das divisórias (Procedimento SOP-04).\n3. Falta de suporte adequado para posicionamento do rolo de fita plástica.',
          problemaEvidencias: 'Relatório de produtividade do BI do Repack mostrando eficiência de 88% na média semanal da Lata 350ml e 4 ocorrências de atraso de saída de rota registradas em Junho.',
          recursos: '1. Cavalete portátil para suporte de fita adesiva (custo estimado R$120).\n2. 2 horas de liberação dos operadores para reciclagem de SOP.',
          comentarios: 'Acompanhamento diário no Matinal de 5 minutos. Equipe engajada na solução. Ozenildo dando suporte.',
          concluidas: '1. Criação do cavalete de fita portátil por manutenção preventiva.\n2. Treinamento prático em bancada da SOP-04 para todos os operadores do turno.',
          aprendizados: 'O layout de posicionamento de insumos impacta em até 15% no tempo de ciclo. Pequenas melhorias ergonômicas eliminam movimentos desnecessários.',
          padronizacao: 'Inclusão do novo layout de bancada padrão no Checklist de 5S semanal e atualização da folha de instrução de trabalho (LPP) na bancada 1.',
          resultadosDesc: 'Redução significativa do tempo de ciclo após as ações corretivas. A meta de 04:00 foi atingida e estabilizada.',
          impactoNegocio: 'Eliminação de 100% das reclamações de atraso de carregamento e redução de horas extras operacionais em cerca de R$1.800/mês.',
          proximosPassos: 'Replicar o mesmo layout de bancada e o suporte de fita para as demais linhas de PET e Vidro no próximo ciclo de PDCA.',
          dataRevisao: '2026-07-20',
          actions: [
            { acao: 'Fabricar suporte portátil para rolo de fita plástica', responsavel: 'Ozenildo Silva', prazo: '10/07/2026', status: 'Concluído', pct: 100 },
            { acao: 'Treinar operadores no padrão de dobra SOP-04', responsavel: 'Matheus Barbosa', prazo: '12/07/2026', status: 'Concluído', pct: 100 },
            { acao: 'Reorganizar layout da bancada (aproximar caixas)', responsavel: 'Paulo Pereira', prazo: '08/07/2026', status: 'Concluído', pct: 100 },
            { acao: 'Realizar cronometragem de validação do tempo de ciclo', responsavel: 'Matheus Barbosa', prazo: '15/07/2026', status: 'Em Andamento', pct: 60 },
            { acao: 'Padronizar o novo checklist de 5S na rotina', responsavel: 'Paulo Pereira', prazo: '20/07/2026', status: 'Pendente', pct: 0 }
          ],
          indicadores: [
            { indicador: 'Tempo ciclo Lata 350ml', antes: '04:30', depois: '03:55', variacao: '-13.0%' },
            { indicador: 'Eficiência do Repack', antes: '88%', depois: '102%', variacao: '+15.9%' },
            { indicador: 'Atrasos de Rota por Repack', antes: '4', depois: '0', variacao: '-100.0%' }
          ]
        };
    }
  }, [dashboard, empresa?.id]);

  const getEmptyBoard = (empresaId: string, titulo: string): Omit<RepackA3Board, '_docId'> => ({
    empresaId,
    dashboard,
    titulo,
    dataCriacaoISO: new Date().toISOString().split('T')[0],
    problemaDesc: '',
    problemaImpacto: '',
    problemaCausa: '',
    problemaEvidencias: '',
    actions: [
      { acao: '', responsavel: '', prazo: '', status: 'Pendente', pct: 0 },
      { acao: '', responsavel: '', prazo: '', status: 'Pendente', pct: 0 },
      { acao: '', responsavel: '', prazo: '', status: 'Pendente', pct: 0 },
      { acao: '', responsavel: '', prazo: '', status: 'Pendente', pct: 0 },
      { acao: '', responsavel: '', prazo: '', status: 'Pendente', pct: 0 }
    ],
    recursos: '',
    comentarios: '',
    concluidas: '',
    aprendizados: '',
    padronizacao: '',
    resultadosDesc: '',
    indicadores: [
      { indicador: '', antes: '', depois: '', variacao: '' },
      { indicador: '', antes: '', depois: '', variacao: '' },
      { indicador: '', antes: '', depois: '', variacao: '' }
    ],
    impactoNegocio: '',
    proximosPassos: '',
    dataRevisao: ''
  });

  // Sync A3 Boards from firestore
  useEffect(() => {
    const companyId = empresa?.id || 'demo';
    const q = query(collection(db, 'repack_a3_boards'), where('empresaId', '==', companyId));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(docSnap => ({
        _docId: docSnap.id,
        ...docSnap.data()
      } as RepackA3Board));
      
      const filtered = list.filter(b => b.dashboard === dashboard || (!b.dashboard && dashboard === 'repack'));
      setBoards(filtered);
    }, (err) => {
      console.error(`Error loading A3 boards for dashboard ${dashboard}:`, err);
    });
    return () => unsub();
  }, [empresa?.id, dashboard]);

  // Handle active A3 board selection
  useEffect(() => {
    if (!activeBoard) {
      if (boards.length > 0) {
        setActiveBoard(boards[0]);
      } else {
        setActiveBoard(fallbackSeedBoard);
      }
    } else {
      // Keep selected board up to date with DB updates if any
      const matched = boards.find(b => b._docId === activeBoard._docId);
      if (matched && JSON.stringify(matched) !== JSON.stringify(activeBoard)) {
        setActiveBoard(matched);
      }
    }
  }, [boards, activeBoard, fallbackSeedBoard]);

  // ── METRICAS DO DASHBOARD DE AÇÕES ──
  const actionMetrics = useMemo(() => {
    if (!activeBoard || !activeBoard.actions) {
      return {
        total: 0,
        concluidas: 0,
        emAndamento: 0,
        pendentes: 0,
        bloqueadas: 0,
        pctMedio: 0,
        responsiblesData: [] as Array<{
          name: string;
          total: number;
          concluidas: number;
          emAndamento: number;
          pendentes: number;
          bloqueadas: number;
          pctMedio: number;
        }>
      };
    }

    const actions = activeBoard.actions;
    const total = actions.length;
    let concluidas = 0;
    let emAndamento = 0;
    let pendentes = 0;
    let bloqueadas = 0;
    let somaPct = 0;

    interface RespData {
      total: number;
      concluidas: number;
      emAndamento: number;
      pendentes: number;
      bloqueadas: number;
      somaPct: number;
    }
    const respMap: { [key: string]: RespData } = {};

    actions.forEach(act => {
      somaPct += Number(act.pct || 0);
      const statusNormal = (act.status || 'Pendente').trim();
      
      if (statusNormal === 'Concluído') concluidas++;
      else if (statusNormal === 'Em Andamento') emAndamento++;
      else if (statusNormal === 'Bloqueado') bloqueadas++;
      else pendentes++;

      const resp = (act.responsavel || 'Não Definido').trim() || 'Não Definido';
      if (!respMap[resp]) {
        respMap[resp] = { total: 0, concluidas: 0, emAndamento: 0, pendentes: 0, bloqueadas: 0, somaPct: 0 };
      }
      respMap[resp].total++;
      respMap[resp].somaPct += Number(act.pct || 0);
      if (statusNormal === 'Concluído') respMap[resp].concluidas++;
      else if (statusNormal === 'Em Andamento') respMap[resp].emAndamento++;
      else if (statusNormal === 'Bloqueado') respMap[resp].bloqueadas++;
      else respMap[resp].pendentes++;
    });

    const pctMedio = total > 0 ? Math.round(somaPct / total) : 0;

    const responsiblesData = Object.entries(respMap).map(([name, data]) => ({
      name,
      total: data.total,
      concluidas: data.concluidas,
      emAndamento: data.emAndamento,
      pendentes: data.pendentes,
      bloqueadas: data.bloqueadas,
      pctMedio: data.total > 0 ? Math.round(data.somaPct / data.total) : 0
    })).sort((a, b) => b.total - a.total);

    return {
      total,
      concluidas,
      emAndamento,
      pendentes,
      bloqueadas,
      pctMedio,
      responsiblesData
    };
  }, [activeBoard]);

  const updateField = (key: keyof RepackA3Board, value: any) => {
    if (!activeBoard) return;
    setActiveBoard(prev => {
      if (!prev) return null;
      return { ...prev, [key]: value };
    });
  };

  const updateAction = (index: number, key: string, value: any) => {
    if (!activeBoard) return;
    const newActions = [...activeBoard.actions];
    
    // Ensure safety bounds
    let finalValue = value;
    if (key === 'pct') {
      finalValue = Math.min(100, Math.max(0, parseInt(value) || 0));
    }
    
    newActions[index] = { ...newActions[index], [key]: finalValue };
    
    // Auto sync status with pct
    if (key === 'pct') {
      if (finalValue === 100) {
        newActions[index].status = 'Concluído';
      } else if (finalValue > 0) {
        newActions[index].status = 'Em Andamento';
      } else {
        newActions[index].status = 'Pendente';
      }
    } else if (key === 'status') {
      if (finalValue === 'Concluído') {
        newActions[index].pct = 100;
      } else if (finalValue === 'Pendente') {
        newActions[index].pct = 0;
      }
    }

    // Auto compile concluded list
    const concludedList = newActions
      .filter(a => a.status === 'Concluído' || a.pct === 100)
      .map((a, i) => `${i + 1}. ${a.acao || '(Sem nome)'}`)
      .join('\n');

    setActiveBoard(prev => {
      if (!prev) return null;
      return { 
        ...prev, 
        actions: newActions,
        concluidas: concludedList || prev.concluidas
      };
    });
  };

  const updateIndicador = (index: number, key: string, value: any) => {
    if (!activeBoard) return;
    const newIndicators = [...activeBoard.indicadores];
    newIndicators[index] = { ...newIndicators[index], [key]: value };
    
    // Try to auto-calculate variation if before/after are numbers
    if (key === 'antes' || key === 'depois') {
      const antesStr = newIndicators[index].antes.replace('%', '').replace(',', '.').trim();
      const depoisStr = newIndicators[index].depois.replace('%', '').replace(',', '.').trim();
      
      const antesVal = parseFloat(antesStr);
      const depoisVal = parseFloat(depoisStr);
      
      if (!isNaN(antesVal) && !isNaN(depoisVal)) {
        if (antesVal === 0) {
          newIndicators[index].variacao = '0%';
        } else {
          const diff = ((depoisVal - antesVal) / antesVal) * 100;
          const sign = diff >= 0 ? '+' : '';
          newIndicators[index].variacao = `${sign}${diff.toFixed(1)}%`;
        }
      }
    }
    
    setActiveBoard(prev => {
      if (!prev) return null;
      return { ...prev, indicadores: newIndicators };
    });
  };

  const handleSaveBoard = async () => {
    if (!activeBoard) return;
    setSavingBoard(true);
    setBoardSaveStatus('idle');
    try {
      const companyId = empresa?.id || 'demo';
      const payload = {
        ...activeBoard,
        empresaId: companyId,
        dashboard: dashboard
      };
      
      if (activeBoard._docId && activeBoard._docId.startsWith('seed-board-')) {
        const { _docId, ...cleanPayload } = payload;
        const docRef = await addDoc(collection(db, 'repack_a3_boards'), {
          ...cleanPayload,
          _criadoEm: new Date().toISOString()
        });
        setActiveBoard({
          ...activeBoard,
          _docId: docRef.id
        });
      } else if (activeBoard._docId) {
        const { _docId, ...saveData } = activeBoard;
        await updateDoc(doc(db, 'repack_a3_boards', _docId), saveData);
      } else {
        const docRef = await addDoc(collection(db, 'repack_a3_boards'), {
          ...payload,
          _criadoEm: new Date().toISOString()
        });
        setActiveBoard({
          ...activeBoard,
          _docId: docRef.id
        });
      }
      setBoardSaveStatus('success');
      setTimeout(() => setBoardSaveStatus('idle'), 3000);
    } catch (err) {
      console.error(`Error saving A3 board for ${dashboard}:`, err);
      setBoardSaveStatus('error');
      setTimeout(() => setBoardSaveStatus('idle'), 3000);
    } finally {
      setSavingBoard(false);
    }
  };

  const handleCreateNewBoard = async () => {
    const title = prompt('Digite o título para o novo Quadro de Resolução de Problemas A3:');
    if (!title) return;
    
    const companyId = empresa?.id || 'demo';
    const newBoard = getEmptyBoard(companyId, title);
    
    try {
      const docRef = await addDoc(collection(db, 'repack_a3_boards'), {
        ...newBoard,
        _criadoEm: new Date().toISOString()
      });
      const created = {
        _docId: docRef.id,
        ...newBoard
      } as RepackA3Board;
      setActiveBoard(created);
    } catch (err) {
      console.error('Error creating A3 board:', err);
    }
  };

  const handleDeleteBoard = async () => {
    if (!activeBoard) return;
    if (activeBoard._docId && activeBoard._docId.startsWith('seed-board-')) {
      setActiveBoard(null);
      return;
    }
    
    const confirmDelete = window.confirm(`Deseja realmente excluir o quadro "${activeBoard.titulo}"? Esta operação é irreversível.`);
    if (!confirmDelete) return;
    
    try {
      await deleteDoc(doc(db, 'repack_a3_boards', activeBoard._docId!));
      setActiveBoard(null);
    } catch (err) {
      console.error('Error deleting A3 board:', err);
    }
  };

  if (!activeBoard) {
    return (
      <div className="bg-white border border-gray-200 p-8 rounded-xl text-center">
        <p className="text-gray-400 font-bold uppercase text-xs mb-4">Nenhum quadro de ações disponível.</p>
        <button
          type="button"
          onClick={handleCreateNewBoard}
          className="px-4 py-2 bg-[#032b5e] hover:bg-[#021f44] text-white font-sans font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer mx-auto border-none transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" /> Criar Primeiro Quadro
        </button>
      </div>
    );
  }

  return (
    <section className="space-y-6 animate-fade-in text-slate-800">
      {/* ── BARRA DE CONTROLE DO QUADRO A3 ── */}
      <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
          <label className="text-gray-500 uppercase font-black text-[10px] tracking-wider shrink-0 mt-1 sm:mt-0">
            Selecione o Quadro:
          </label>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={activeBoard._docId || 'seed-board'}
              onChange={(e) => {
                const selected = boards.find(b => b._docId === e.target.value);
                if (selected) {
                  setActiveBoard(selected);
                } else if (e.target.value.startsWith('seed-board-')) {
                  setActiveBoard(fallbackSeedBoard);
                }
              }}
              className="bg-[#f8fafc] border border-gray-200 text-[#032b5e] font-sans font-bold text-xs rounded-xl px-3 py-2 focus:border-[#032b5e] outline-none min-w-[200px] max-w-full"
            >
              {activeBoard._docId && activeBoard._docId.startsWith('seed-board-') && (
                <option value={activeBoard._docId}>💡 Exemplo: {fallbackSeedBoard.titulo}</option>
              )}
              {boards.map(b => (
                <option key={b._docId} value={b._docId}>
                  📋 {b.titulo}
                </option>
              ))}
              {(!activeBoard._docId || !activeBoard._docId.startsWith('seed-board-')) && (
                <option value="seed-board-fallback">💡 Carregar Exemplo do Posto</option>
              )}
            </select>
            <input
              type="text"
              value={activeBoard.titulo}
              onChange={(e) => updateField('titulo', e.target.value)}
              placeholder="Título do quadro..."
              className="bg-white border border-gray-200 text-slate-800 font-sans font-bold text-xs rounded-xl px-3 py-2 focus:border-[#032b5e] outline-none flex-1 max-w-[250px]"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          <div className="flex items-center bg-gray-100 p-0.5 rounded-xl border border-gray-200 mr-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('passos')}
              className={`px-3 py-1.5 rounded-lg font-sans font-bold text-[9px] uppercase tracking-wider transition-all border-none cursor-pointer flex items-center gap-1 ${
                activeTab === 'passos' 
                  ? 'bg-[#032b5e] text-white shadow-xs' 
                  : 'text-gray-500 hover:text-[#032b5e] bg-transparent'
              }`}
            >
              🔄 Passo a Passo (A4)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('dashboard_acoes')}
              className={`px-3 py-1.5 rounded-lg font-sans font-bold text-[9px] uppercase tracking-wider transition-all border-none cursor-pointer flex items-center gap-1 ${
                activeTab === 'dashboard_acoes' 
                  ? 'bg-[#032b5e] text-white shadow-xs' 
                  : 'text-gray-500 hover:text-[#032b5e] bg-transparent'
              }`}
            >
              📊 Painel de Ações
            </button>
          </div>

          <button
            type="button"
            onClick={handleCreateNewBoard}
            className="px-3.5 py-2 bg-[#032b5e] hover:bg-[#021f44] text-white font-sans font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer border-none transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" /> Novo Quadro
          </button>

          <button
            type="button"
            onClick={handleSaveBoard}
            disabled={savingBoard}
            className={`px-3.5 py-2 text-white font-sans font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer border-none transition-all shadow-sm ${
              boardSaveStatus === 'success' 
                ? 'bg-emerald-500 hover:bg-emerald-600' 
                : boardSaveStatus === 'error' 
                  ? 'bg-rose-500 hover:bg-rose-600' 
                  : 'bg-amber-500 hover:bg-amber-600'
            }`}
          >
            <Save className="w-4 h-4" /> 
            {savingBoard ? 'Salvando...' : boardSaveStatus === 'success' ? 'Salvo!' : boardSaveStatus === 'error' ? 'Erro ao Salvar' : 'Salvar Quadro'}
          </button>

          <button
            type="button"
            onClick={handleDeleteBoard}
            className="px-3.5 py-2 bg-white hover:bg-rose-50 border border-gray-200 text-rose-600 font-sans font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Trash2 className="w-4 h-4" /> Excluir
          </button>
        </div>
      </div>

      {activeTab === 'dashboard_acoes' ? (
        <div className="space-y-6 animate-fade-in text-slate-800">
          {/* DASHBOARD DE AÇÕES COMPONENT */}
          <div className="bg-gradient-to-r from-[#032b5e] to-[#0d4b96] rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-200">GESTÃO INTEGRADA DE ROTINA (VPO)</span>
              <h2 className="font-sans font-black text-xl tracking-tight leading-tight text-white flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-amber-400" /> DASHBOARD DE CONTROLE DE AÇÕES
              </h2>
              <p className="text-[11px] text-blue-100/80 font-semibold max-w-xl">
                Acompanhamento dinâmico de contramedidas e responsabilidades do quadro: <strong className="text-white underline">{activeBoard?.titulo || '(Quadro sem título)'}</strong>
              </p>
            </div>
            
            <div className="flex items-center gap-3 bg-white/10 px-4 py-3 rounded-xl border border-white/10 shrink-0">
              <div className="text-right">
                <span className="text-[9px] font-bold text-blue-200 uppercase tracking-wider block">Progresso Geral</span>
                <span className="text-xl font-mono font-black text-white">{actionMetrics.pctMedio}%</span>
              </div>
              <div className="w-12 h-12 rounded-full border-4 border-white/20 flex items-center justify-center relative overflow-hidden">
                <div 
                  className="absolute bottom-0 left-0 right-0 bg-emerald-400 transition-all duration-500" 
                  style={{ height: `${actionMetrics.pctMedio}%`, opacity: 0.8 }}
                />
                <span className="relative font-mono text-[10px] font-black text-white z-10">{actionMetrics.pctMedio}%</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 p-4 rounded-2xl shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                <Activity className="w-5 h-5 text-slate-500" />
              </div>
              <div>
                <span className="text-gray-400 font-bold uppercase tracking-wider text-[8px] block">Ações Totais</span>
                <span className="text-xl font-mono font-black text-slate-800">{actionMetrics.total}</span>
              </div>
            </div>

            <div className="bg-white border border-gray-200 p-4 rounded-2xl shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <span className="text-gray-400 font-bold uppercase tracking-wider text-[8px] block">Concluídas</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-mono font-black text-slate-800">{actionMetrics.concluidas}</span>
                  <span className="text-[9px] font-bold text-emerald-600">
                    ({actionMetrics.total > 0 ? Math.round((actionMetrics.concluidas / actionMetrics.total) * 100) : 0}%)
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 p-4 rounded-2xl shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <span className="text-gray-400 font-bold uppercase tracking-wider text-[8px] block">Em Andamento</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-mono font-black text-slate-800">{actionMetrics.emAndamento + actionMetrics.pendentes}</span>
                  <span className="text-[9px] font-bold text-blue-600">
                    ({actionMetrics.emAndamento} ativa{actionMetrics.emAndamento !== 1 ? 's' : ''})
                  </span>
                </div>
              </div>
            </div>

            <div className={`border p-4 rounded-2xl shadow-sm flex items-center gap-3 transition-all ${
              actionMetrics.bloqueadas > 0 
                ? 'bg-rose-50 border-rose-200/80 animate-pulse' 
                : 'bg-white border-gray-200'
            }`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                actionMetrics.bloqueadas > 0 ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-gray-400 font-bold uppercase tracking-wider text-[8px] block">Bloqueadas</span>
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-xl font-mono font-black ${actionMetrics.bloqueadas > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                    {actionMetrics.bloqueadas}
                  </span>
                  {actionMetrics.bloqueadas > 0 && (
                    <span className="text-[8px] font-black text-rose-700 bg-rose-200/50 px-1 py-0.5 rounded uppercase">Urgente</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-5 bg-white border border-gray-200 rounded-2xl shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#032b5e]" />
                  <h3 className="font-sans font-black text-[11px] text-[#032b5e] uppercase tracking-wider">
                    Liderança & Carga de Trabalho
                  </h3>
                </div>
                <span className="text-[9px] font-bold text-gray-400 uppercase">Donos das Ações</span>
              </div>

              {actionMetrics.responsiblesData.length === 0 ? (
                <div className="text-center py-8 text-gray-400 uppercase text-[9px] font-bold">
                  Nenhum responsável atribuído às ações.
                </div>
              ) : (
                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                  {actionMetrics.responsiblesData.map((resp, idx) => {
                    const initials = resp.name.substring(0, 2).toUpperCase();
                    const colors = [
                      'bg-indigo-500 text-white', 
                      'bg-emerald-500 text-white', 
                      'bg-amber-500 text-white', 
                      'bg-rose-500 text-white', 
                      'bg-sky-500 text-white', 
                      'bg-purple-500 text-white'
                    ];
                    const avatarColor = colors[idx % colors.length];

                    return (
                      <div key={idx} className="bg-slate-50/50 hover:bg-slate-50 border border-gray-100 p-3 rounded-xl flex items-center gap-3 transition-all">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${avatarColor}`}>
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <span className="font-sans font-black text-[10px] text-slate-800 truncate uppercase">{resp.name}</span>
                            <span className="font-mono text-[9px] font-bold text-[#032b5e] bg-[#032b5e]/5 px-1.5 py-0.5 rounded">
                              {resp.total} ação{resp.total !== 1 ? 'es' : ''}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-emerald-500 rounded-full transition-all duration-300" 
                                style={{ width: `${resp.pctMedio}%` }}
                              />
                            </div>
                            <span className="text-[9px] font-mono font-bold text-emerald-600">{resp.pctMedio}%</span>
                          </div>

                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {resp.concluidas > 0 && (
                              <span className="text-[7px] font-bold bg-emerald-100 text-emerald-700 px-1 py-0.2 rounded">{resp.concluidas} OK</span>
                            )}
                            {resp.emAndamento > 0 && (
                              <span className="text-[7px] font-bold bg-blue-100 text-blue-700 px-1 py-0.2 rounded">{resp.emAndamento} Em Andamento</span>
                            )}
                            {resp.bloqueadas > 0 && (
                              <span className="text-[7px] font-black bg-rose-100 text-rose-700 px-1 py-0.2 rounded animate-pulse">{resp.bloqueadas} BLOQUEADO</span>
                            )}
                            {resp.pendentes > 0 && (
                              <span className="text-[7px] font-bold bg-gray-100 text-gray-700 px-1 py-0.2 rounded">{resp.pendentes} Pendente</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="lg:col-span-7 bg-white border border-gray-200 rounded-2xl shadow-sm p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-rose-500" />
                    <h3 className="font-sans font-black text-[11px] text-rose-600 uppercase tracking-wider">
                      Pontos Críticos / Gargalos Ativos
                    </h3>
                  </div>
                  <span className="text-[9px] font-black text-rose-500 uppercase">Atenção Necessária</span>
                </div>

                {!activeBoard || activeBoard.actions.filter(a => a.status === 'Bloqueado' || (a.status === 'Pendente' && a.pct === 0)).length === 0 ? (
                  <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center gap-3">
                    <Trophy className="w-5 h-5 text-emerald-500 shrink-0" />
                    <div>
                      <h4 className="font-sans font-black text-[10px] text-emerald-800 uppercase">Tudo Sob Controle!</h4>
                      <p className="text-[9px] text-emerald-700 leading-normal font-bold uppercase">
                        Nenhuma ação se encontra bloqueada ou totalmente estagnada neste momento. Continue assim!
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                    {activeBoard?.actions.filter(a => a.status === 'Bloqueado' || (a.status === 'Pendente' && a.pct === 0)).map((act, idx) => (
                      <div key={idx} className="border border-rose-100 bg-rose-50/30 p-2.5 rounded-xl flex items-start gap-2.5 animate-fade-in">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[8px] font-black text-rose-600 uppercase">
                              {act.status === 'Bloqueado' ? '🔴 BLOQUEADO' : '⚠️ ESTAGNADO'}
                            </span>
                            <span className="text-[9px] font-mono font-bold text-gray-500 uppercase">{act.prazo}</span>
                          </div>
                          <p className="text-[10px] font-bold text-slate-800 truncate">{act.acao}</p>
                          <span className="text-[9px] text-gray-400 font-semibold">
                            Dono: <strong className="text-slate-600 uppercase">{act.responsavel || 'Não definido'}</strong>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-2 border-t border-gray-100">
                <span className="text-gray-500 uppercase font-black text-[9px] tracking-wider block">
                  🚀 Próximos Passos recomendados pelo plano
                </span>
                <div className="bg-[#032b5e]/5 p-3 rounded-xl border border-[#032b5e]/10">
                  <p className="text-[10px] font-bold text-[#032b5e] leading-relaxed">
                    {activeBoard?.proximosPassos || 'Nenhum próximo passo cadastrado no momento. Preencha na etapa 4 ou 5 do Passo a Passo.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-sans font-black text-xs text-[#032b5e] uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-[#032b5e]" />
                  Quadro Geral & Edição Rápida de Ações
                </h3>
                <p className="text-[9px] text-gray-400 font-bold uppercase leading-tight mt-0.5">
                  Atualize prazos, progresso ou responsáveis diretamente neste painel
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={actionSearch}
                    onChange={(e) => setActionSearch(e.target.value)}
                    placeholder="Buscar ação..."
                    className="pl-8 pr-3 py-1 bg-gray-50 border border-gray-200 text-slate-800 text-[10px] rounded-lg focus:border-[#032b5e] outline-none w-[150px] font-bold"
                  />
                </div>

                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value as any)}
                  className="bg-gray-50 border border-gray-200 text-slate-700 font-sans font-bold text-[10px] rounded-lg px-2 py-1 focus:border-[#032b5e] outline-none"
                >
                  <option value="todos">Todos os Status</option>
                  <option value="Pendente">Pendentes</option>
                  <option value="Em Andamento">Em Andamento</option>
                  <option value="Bloqueado">Bloqueados</option>
                  <option value="Concluído">Concluídos</option>
                </select>
              </div>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {activeBoard?.actions && activeBoard.actions.filter(act => {
                const matchesSearch = (act.acao || '').toLowerCase().includes(actionSearch.toLowerCase()) || 
                                      (act.responsavel || '').toLowerCase().includes(actionSearch.toLowerCase());
                const matchesFilter = actionFilter === 'todos' || act.status === actionFilter;
                return matchesSearch && matchesFilter;
              }).length === 0 ? (
                <div className="text-center py-10 text-gray-400 uppercase text-[9px] font-bold">
                  Nenhuma ação encontrada para os filtros aplicados.
                </div>
              ) : (
                activeBoard?.actions.map((act, actIdx) => {
                  const matchesSearch = (act.acao || '').toLowerCase().includes(actionSearch.toLowerCase()) || 
                                        (act.responsavel || '').toLowerCase().includes(actionSearch.toLowerCase());
                  const matchesFilter = actionFilter === 'todos' || act.status === actionFilter;
                  if (!matchesSearch || !matchesFilter) return null;

                  return (
                    <div key={actIdx} className="bg-slate-50 hover:bg-slate-50/80 border border-gray-200 p-3.5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all animate-fade-in">
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] font-black text-slate-400">AÇÃO #{actIdx + 1}</span>
                          <span className={`px-2 py-0.2 rounded text-[7px] font-black uppercase tracking-wider ${
                            act.status === 'Concluído' 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : act.status === 'Em Andamento' 
                                ? 'bg-blue-100 text-blue-700' 
                                : act.status === 'Bloqueado'
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-gray-100 text-gray-700'
                          }`}>
                            {act.status}
                          </span>
                        </div>
                        <input
                          type="text"
                          value={act.acao}
                          onChange={(e) => updateAction(actIdx, 'acao', e.target.value)}
                          placeholder="Qual a ação?"
                          className="w-full bg-white border border-gray-200 text-slate-800 text-xs font-bold rounded-lg p-1.5 focus:border-[#032b5e] outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:w-[450px]">
                        <div>
                          <label className="text-gray-400 text-[8px] uppercase font-bold block mb-1">Dono</label>
                          <input
                            type="text"
                            value={act.responsavel}
                            onChange={(e) => updateAction(actIdx, 'responsavel', e.target.value)}
                            placeholder="Dono..."
                            className="w-full bg-white border border-gray-200 text-slate-800 text-[10px] font-bold rounded-lg p-1.5 focus:border-[#032b5e] outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-gray-400 text-[8px] uppercase font-bold block mb-1">Prazo</label>
                          <input
                            type="text"
                            value={act.prazo}
                            onChange={(e) => updateAction(actIdx, 'prazo', e.target.value)}
                            placeholder="DD/MM/AAAA"
                            className="w-full bg-white border border-gray-200 text-slate-800 text-[10px] font-bold rounded-lg p-1.5 focus:border-[#032b5e] outline-none text-center"
                          />
                        </div>

                        <div>
                          <label className="text-gray-400 text-[8px] uppercase font-bold block mb-1">Progresso</label>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[10px] font-mono font-black text-slate-700 w-8">{act.pct}%</span>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              step="10"
                              value={act.pct}
                              onChange={(e) => updateAction(actIdx, 'pct', e.target.value)}
                              className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-gray-400 text-[8px] uppercase font-bold block mb-1">Status</label>
                          <select
                            value={act.status}
                            onChange={(e) => updateAction(actIdx, 'status', e.target.value)}
                            className="w-full bg-white border border-gray-200 text-[#032b5e] font-sans font-black text-[10px] rounded-lg p-1.5 focus:border-[#032b5e] outline-none"
                          >
                            <option value="Pendente">Pendente</option>
                            <option value="Em Andamento">Em Andamento</option>
                            <option value="Bloqueado">Bloqueado</option>
                            <option value="Concluído">Concluído</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={handleSaveBoard}
                disabled={savingBoard}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-sans font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer border-none transition-all shadow-sm"
              >
                <Save className="w-4 h-4" />
                {savingBoard ? 'Salvando...' : 'Salvar Alterações do Quadro'}
              </button>
            </div>
          </div>
        </div>
      ) : viewMode === 'steps' ? (
        <>
          {/* ── HEADER DE PASSOS DO PROCESSO ── */}
          <div className="bg-white border border-gray-200/80 p-4 rounded-2xl shadow-sm flex flex-col xl:flex-row items-center justify-between gap-3 overflow-x-auto">
            {[
              {
                step: 1,
                title: '1. IDENTIFICAR O PROBLEMA',
                titleColor: 'text-[#ef4444]',
                desc: 'Mapeamento e causas',
                icon: <Search className="w-4 h-4 text-white" />,
                iconBg: 'bg-[#ef4444]'
              },
              {
                step: 2,
                title: '2. QUADRO DE AÇÕES',
                titleColor: 'text-[#f5a623]',
                desc: 'Definir contramedidas',
                icon: <Zap className="w-4 h-4 text-white" />,
                iconBg: 'bg-[#f5a623]'
              },
              {
                step: 3,
                title: '3. ACOMPANHAR AÇÕES',
                titleColor: 'text-[#1e56f0]',
                desc: 'Status e progresso',
                icon: <Calendar className="w-4 h-4 text-white" />,
                iconBg: 'bg-[#1e56f0]'
              },
              {
                step: 4,
                title: '4. CONCLUIR & APRENDER',
                titleColor: 'text-[#22c55e]',
                desc: 'Padronização e SOP',
                icon: <Check className="w-4 h-4 text-white" />,
                iconBg: 'bg-[#22c55e]'
              },
              {
                step: 5,
                title: '5. RESULTADOS DO PLANO',
                titleColor: 'text-[#8b5cf6]',
                desc: 'Impacto e indicadores',
                icon: <Trophy className="w-4 h-4 text-white" />,
                iconBg: 'bg-[#8b5cf6]'
              }
            ].map((item, idx) => (
              <React.Fragment key={item.step}>
                <button
                  type="button"
                  onClick={() => setCurrentA3Step(item.step)}
                  className={`flex items-start gap-2.5 flex-1 min-w-[190px] text-left border-none bg-transparent p-2 rounded-xl transition-all cursor-pointer ${currentA3Step === item.step ? 'ring-2 ring-[#032b5e]/20 bg-slate-50' : 'hover:bg-slate-50/50 opacity-75'}`}
                >
                  <div className="relative shrink-0">
                    <div className={`w-9 h-9 rounded-xl ${item.iconBg} flex items-center justify-center shadow-md transition-transform ${currentA3Step === item.step ? 'scale-105' : ''}`}>
                      {item.icon}
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <h4 className={`font-sans font-black text-[10px] tracking-tight ${item.titleColor} uppercase`}>
                      {item.title}
                    </h4>
                    <p className="text-[9px] text-gray-400 font-bold uppercase leading-tight">
                      {item.desc}
                    </p>
                  </div>
                </button>
                {idx < 4 && (
                  <div className="hidden xl:block text-gray-300 flex-shrink-0">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* ── PAINEL DO PASSO SELECIONADO ── */}
          <div className="grid grid-cols-1 gap-4">
            {/* Passo 1: Detalhes do Problema */}
            {currentA3Step === 1 && (
              <div className="bg-white rounded-2xl border-t-4 border-t-rose-500 border-x border-b border-gray-200 shadow-sm p-5 flex flex-col justify-between min-h-[500px] space-y-4 animate-fade-in w-full">
                <div className="space-y-4">
                  <div className="border-b border-gray-100 pb-2">
                    <h3 className="font-sans font-black text-xs uppercase text-rose-500 tracking-wider">
                      1. Detalhes do Problema
                    </h3>
                    <p className="text-[9px] text-gray-400 font-semibold uppercase">Mapeamento e causas</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-500 uppercase font-black text-[9px] tracking-wider block">
                      Descrição do Problema
                    </label>
                    <textarea
                      value={activeBoard.problemaDesc}
                      onChange={(e) => updateField('problemaDesc', e.target.value)}
                      placeholder="Descreva o problema identificado de forma clara e objetiva..."
                      className="w-full border border-gray-200 text-slate-800 text-xs rounded-xl p-2.5 h-24 focus:border-rose-500 bg-white outline-none resize-none transition-all shadow-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-500 uppercase font-black text-[9px] tracking-wider block">
                      Impacto do Problema
                    </label>
                    <textarea
                      value={activeBoard.problemaImpacto}
                      onChange={(e) => updateField('problemaImpacto', e.target.value)}
                      placeholder="Qual o impacto nas rotas, carregamento, perdas ou custos?"
                      className="w-full border border-gray-200 text-slate-800 text-xs rounded-xl p-2.5 h-24 focus:border-rose-500 bg-white outline-none resize-none transition-all shadow-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-500 uppercase font-black text-[9px] tracking-wider block">
                      Causa Raiz
                    </label>
                    <textarea
                      value={activeBoard.problemaCausa}
                      onChange={(e) => updateField('problemaCausa', e.target.value)}
                      placeholder="Qual a causa raiz? (Use 5 porquês, Ishikawa...)"
                      className="w-full border border-gray-200 text-slate-800 text-xs rounded-xl p-2.5 h-24 focus:border-rose-500 bg-white outline-none resize-none transition-all shadow-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-500 uppercase font-black text-[9px] tracking-wider block">
                      Evidências Práticas
                    </label>
                    <textarea
                      value={activeBoard.problemaEvidencias}
                      onChange={(e) => updateField('problemaEvidencias', e.target.value)}
                      placeholder="Ocorrências registradas, fotos, reclamações formais..."
                      className="w-full border border-gray-200 text-slate-800 text-xs rounded-xl p-2.5 h-24 focus:border-rose-500 bg-white outline-none resize-none transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div className="bg-rose-500/5 border border-rose-500/10 p-3.5 rounded-xl flex items-start gap-2.5">
                  <Search className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-sans font-black text-[10px] text-rose-600 uppercase">INFORMAÇÃO ÚTIL</h4>
                    <p className="text-[9px] text-rose-900/80 leading-normal font-bold uppercase">
                      O sucesso do A3 vem de descrever o problema no pátio ("Gochi") e não da sala de reuniões. Investigue no local.
                    </p>
                  </div>
                </div>
              </div>
            )}

        {/* Passo 2: Planejamento / Contramedidas */}
        {currentA3Step === 2 && (
          <div className="bg-white rounded-2xl border-t-4 border-t-amber-500 border-x border-b border-gray-200 shadow-sm p-5 flex flex-col justify-between min-h-[500px] space-y-4 animate-fade-in w-full">
            <div className="space-y-4">
              <div className="border-b border-gray-100 pb-2">
                <h3 className="font-sans font-black text-xs uppercase text-amber-500 tracking-wider">
                  2. Definição de Contramedidas
                </h3>
                <p className="text-[9px] text-gray-400 font-semibold uppercase">O que e quem resolve</p>
              </div>

              <div className="space-y-2.5">
                <label className="text-gray-500 uppercase font-black text-[9px] tracking-wider block">
                  Lista de Ações e Contramedidas Estipuladas
                </label>
                
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {activeBoard.actions.map((act, actIdx) => (
                    <div key={actIdx} className="bg-slate-50 p-3 rounded-xl border border-gray-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-[#032b5e] uppercase">AÇÃO #{actIdx + 1}</span>
                        <select
                          value={act.status}
                          onChange={(e) => updateAction(actIdx, 'status', e.target.value)}
                          className="bg-white border border-gray-200 text-[#032b5e] font-sans font-bold text-[9px] rounded-md px-2 py-0.5 focus:border-[#032b5e] outline-none"
                        >
                          <option value="Pendente">Pendente</option>
                          <option value="Em Andamento">Em Andamento</option>
                          <option value="Bloqueado">Bloqueado</option>
                          <option value="Concluído">Concluído</option>
                        </select>
                      </div>

                      <input
                        type="text"
                        value={act.acao}
                        onChange={(e) => updateAction(actIdx, 'acao', e.target.value)}
                        placeholder="Qual ação corretiva imediata?"
                        className="w-full bg-white border border-gray-200 text-slate-800 text-xs rounded-lg p-1.5 focus:border-amber-500 outline-none"
                      />

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-gray-400 text-[8px] uppercase font-bold">Quem?</label>
                          <input
                            type="text"
                            value={act.responsavel}
                            onChange={(e) => updateAction(actIdx, 'responsavel', e.target.value)}
                            placeholder="Responsável..."
                            className="w-full bg-white border border-gray-200 text-slate-800 text-[10px] rounded-lg p-1 focus:border-amber-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-gray-400 text-[8px] uppercase font-bold">Prazo?</label>
                          <input
                            type="text"
                            value={act.prazo}
                            onChange={(e) => updateAction(actIdx, 'prazo', e.target.value)}
                            placeholder="DD/MM/AAAA"
                            className="w-full bg-white border border-gray-200 text-slate-800 text-[10px] rounded-lg p-1 focus:border-amber-500 outline-none text-center"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-gray-500 uppercase font-black text-[9px] tracking-wider block">
                  Recursos Necessários / Orçamento
                </label>
                <input
                  type="text"
                  value={activeBoard.recursos}
                  onChange={(e) => updateField('recursos', e.target.value)}
                  placeholder="Materiais, cavaletes, tempo livre para reuniões..."
                  className="w-full border border-gray-200 text-slate-800 text-xs rounded-xl p-2.5 focus:border-amber-500 bg-white outline-none transition-all shadow-sm"
                />
              </div>
            </div>

            <div className="bg-amber-500/5 border border-amber-500/10 p-3.5 rounded-xl flex items-start gap-2.5">
              <Zap className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-sans font-black text-[10px] text-amber-600 uppercase">DICA VPO</h4>
                <p className="text-[9px] text-amber-900/80 leading-normal font-bold uppercase">
                  Ações devem eliminar a causa raiz do problema permanentemente, e não apenas remediar as consequências temporárias.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Passo 3: Acompanhamento de Status */}
        {currentA3Step === 3 && (
          <div className="bg-white rounded-2xl border-t-4 border-t-blue-500 border-x border-b border-gray-200 shadow-sm p-5 flex flex-col justify-between min-h-[500px] space-y-4 animate-fade-in w-full">
            <div className="space-y-4">
              <div className="border-b border-gray-100 pb-2">
                <h3 className="font-sans font-black text-xs uppercase text-blue-500 tracking-wider">
                  3. Acompanhamento e Status das Ações
                </h3>
                <p className="text-[9px] text-gray-400 font-semibold uppercase">Controle diário e percentual de avanço</p>
              </div>

              <div className="space-y-3">
                <label className="text-gray-500 uppercase font-black text-[9px] tracking-wider block">
                  Avanço Físico das Contramedidas
                </label>

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {activeBoard.actions.map((act, actIdx) => (
                    <div key={actIdx} className="bg-slate-50 p-2.5 rounded-xl border border-gray-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex-1">
                        <span className="text-[9px] font-black text-slate-400 block">AÇÃO #{actIdx + 1}</span>
                        <p className="text-xs font-bold text-slate-800 truncate">{act.acao || '(Sem nome)'}</p>
                        <span className="text-[9px] text-gray-400 font-semibold">Responsável: <strong className="text-slate-600">{act.responsavel || '—'}</strong></span>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-black text-blue-500 w-10 text-right">{act.pct}%</span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="10"
                          value={act.pct}
                          onChange={(e) => updateAction(actIdx, 'pct', e.target.value)}
                          className="w-[120px] h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                          act.status === 'Concluído' 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : act.status === 'Em Andamento' 
                              ? 'bg-blue-100 text-blue-700' 
                              : act.status === 'Bloqueado'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-gray-100 text-gray-700'
                        }`}>
                          {act.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-gray-500 uppercase font-black text-[9px] tracking-wider block">
                  Comentários de Rotina e Barricadas
                </label>
                <textarea
                  value={activeBoard.comentarios}
                  onChange={(e) => updateField('comentarios', e.target.value)}
                  placeholder="Se houver alguma barricada ou atraso nas tarefas, descreva os motivos operacionais aqui..."
                  className="w-full border border-gray-200 text-slate-800 text-xs rounded-xl p-2.5 h-20 focus:border-blue-500 bg-white outline-none resize-none transition-all shadow-sm"
                />
              </div>
            </div>

            <div className="bg-blue-500/5 border border-blue-500/10 p-3.5 rounded-xl flex items-start gap-2.5">
              <Calendar className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-sans font-black text-[10px] text-blue-600 uppercase">CADÊNCIA OPERACIONAL</h4>
                <p className="text-[9px] text-blue-900/80 leading-normal font-bold uppercase">
                  Revisar o quadro de ações toda semana no Matinal garante que os bloqueios sejam removidos de forma ágil e colaborativa.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Passo 4: Concluir e Aprender */}
        {currentA3Step === 4 && (
          <div className="bg-white rounded-2xl border-t-4 border-t-emerald-500 border-x border-b border-gray-200 shadow-sm p-5 flex flex-col justify-between min-h-[500px] space-y-4 animate-fade-in w-full">
            <div className="space-y-4">
              <div className="border-b border-gray-100 pb-2">
                <h3 className="font-sans font-black text-xs uppercase text-emerald-500 tracking-wider">
                  4. Concluir & Aprender
                </h3>
                <p className="text-[9px] text-gray-400 font-semibold uppercase">Padronização do novo processo (SOP/LPP)</p>
              </div>

              <div className="space-y-1">
                <label className="text-gray-500 uppercase font-black text-[9px] tracking-wider block">
                  Ações de Bloqueio Concluídas com Sucesso
                </label>
                <textarea
                  value={activeBoard.concluidas}
                  onChange={(e) => updateField('concluidas', e.target.value)}
                  placeholder="Quais ações foram consolidadas?"
                  className="w-full border border-gray-200 text-slate-800 text-xs rounded-xl p-2.5 h-24 focus:border-emerald-500 bg-white outline-none resize-none transition-all shadow-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-gray-500 uppercase font-black text-[9px] tracking-wider block">
                  Principais Aprendizados e Conclusões do Time
                </label>
                <textarea
                  value={activeBoard.aprendizados}
                  onChange={(e) => updateField('aprendizados', e.target.value)}
                  placeholder="O que o time aprendeu sobre o processo de pátio durante a execução deste A3?"
                  className="w-full border border-gray-200 text-slate-800 text-xs rounded-xl p-2.5 h-24 focus:border-emerald-500 bg-white outline-none resize-none transition-all shadow-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-gray-500 uppercase font-black text-[9px] tracking-wider block">
                  Padronização e Atualização de Documentos (LPP / POP)
                </label>
                <textarea
                  value={activeBoard.padronizacao}
                  onChange={(e) => updateField('padronizacao', e.target.value)}
                  placeholder="Quais POPs ou LPPs foram criados ou atualizados no quadro?"
                  className="w-full border border-gray-200 text-slate-800 text-xs rounded-xl p-2.5 h-24 focus:border-emerald-500 bg-white outline-none resize-none transition-all shadow-sm"
                />
              </div>
            </div>

            <div className="bg-emerald-500/5 border border-emerald-500/10 p-3.5 rounded-xl flex items-start gap-2.5">
              <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-sans font-black text-[10px] text-emerald-600 uppercase">CONHECIMENTO ATIVO</h4>
                <p className="text-[9px] text-emerald-900/80 leading-normal font-bold uppercase">
                  Sem padronização, a melhoria retrocede. Treine os demais turnos com base no novo padrão estabelecido neste documento.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Passo 5: Resultados e Impactos */}
        {currentA3Step === 5 && (
          <div className="bg-white rounded-2xl border-t-4 border-t-purple-500 border-x border-b border-gray-200 shadow-sm p-5 flex flex-col justify-between min-h-[500px] space-y-4 animate-fade-in w-full">
            <div className="space-y-4">
              <div className="border-b border-gray-100 pb-2">
                <h3 className="font-sans font-black text-xs uppercase text-purple-500 tracking-wider">
                  5. Resultados e Impactos
                </h3>
                <p className="text-[9px] text-gray-400 font-semibold uppercase">Mensuração dos ganhos</p>
              </div>

              <div className="space-y-1">
                <label className="text-gray-500 uppercase font-black text-[9px] tracking-wider block">
                  Resultados Alcançados
                </label>
                <textarea
                  value={activeBoard.resultadosDesc}
                  onChange={(e) => updateField('resultadosDesc', e.target.value)}
                  placeholder="Descreva de forma geral o resultado final do plano de ação..."
                  className="w-full border border-gray-200 text-slate-800 text-xs rounded-xl p-2.5 h-24 focus:border-purple-500 bg-white outline-none resize-none transition-all shadow-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-gray-500 uppercase font-black text-[9px] tracking-wider block">
                  Indicadores Impactados
                </label>
                
                <div className="space-y-2.5">
                  {activeBoard.indicadores.map((ind, indIdx) => (
                    <div key={indIdx} className="bg-slate-50 p-2 rounded-xl border border-gray-200/80 space-y-1">
                      <span className="text-[9px] font-black text-purple-600 block">INDICADOR #{indIdx + 1}</span>
                      <input
                        type="text"
                        value={ind.indicador}
                        onChange={(e) => updateIndicador(indIdx, 'indicador', e.target.value)}
                        placeholder="Nome do indicador (ex: eficiência)"
                        className="w-full bg-white border border-gray-200 text-slate-800 text-[10px] rounded-lg p-1 focus:border-purple-500 outline-none font-bold"
                      />
                      <div className="grid grid-cols-3 gap-1">
                        <input
                          type="text"
                          value={ind.antes}
                          onChange={(e) => updateIndicador(indIdx, 'antes', e.target.value)}
                          placeholder="Antes"
                          className="w-full bg-white border border-gray-200 text-slate-800 text-[10px] rounded-lg p-1 focus:border-purple-500 outline-none text-center"
                        />
                        <input
                          type="text"
                          value={ind.depois}
                          onChange={(e) => updateIndicador(indIdx, 'depois', e.target.value)}
                          placeholder="Depois"
                          className="w-full bg-white border border-gray-200 text-slate-800 text-[10px] rounded-lg p-1 focus:border-purple-500 outline-none text-center"
                        />
                        <div className="w-full bg-purple-50 border border-purple-200/50 text-purple-700 text-[9px] font-black rounded-lg p-1 flex items-center justify-center font-mono">
                          {ind.variacao || 'Var'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-gray-500 uppercase font-black text-[9px] tracking-wider block">
                  Impacto no Negócio
                </label>
                <textarea
                  value={activeBoard.impactoNegocio}
                  onChange={(e) => updateField('impactoNegocio', e.target.value)}
                  placeholder="Quais foram as reduções de custos, horas extras ou gargalos geradas?"
                  className="w-full border border-gray-200 text-slate-800 text-xs rounded-xl p-2.5 h-20 focus:border-purple-500 bg-white outline-none resize-none transition-all shadow-sm"
                />
              </div>
            </div>

            <div className="bg-purple-500/5 border border-purple-500/10 p-3.5 rounded-xl flex items-start gap-2.5">
              <Trophy className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-sans font-black text-[10px] text-purple-600 uppercase">RESULTADOS DO PLANO</h4>
                <p className="text-[9px] text-purple-900/80 leading-normal font-bold uppercase">
                  Medir os resultados e colher indicadores é reconhecer o esforço do time e gerar valor para o pátio.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── BOTÕES DE NAVEGAÇÃO DOS PASSOS E REVISÃO DE ROTINA ── */}
      <div className="bg-white border border-gray-200 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <button
          type="button"
          onClick={() => setCurrentA3Step(p => Math.max(1, p - 1))}
          disabled={currentA3Step === 1}
          className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-gray-200 rounded-xl text-slate-700 font-sans font-bold text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all w-full md:w-auto justify-center animate-fade-in"
        >
          <ChevronLeft className="w-4 h-4" /> Passo Anterior
        </button>

        <span className="text-gray-400 font-sans font-black text-[10px] uppercase text-center shrink-0">
          Visualizando passo <strong className="text-[#032b5e]">{currentA3Step} de 5</strong>
        </span>

        {currentA3Step < 5 ? (
          <button
            type="button"
            onClick={() => setCurrentA3Step(p => Math.min(5, p + 1))}
            className="px-4 py-2.5 bg-[#032b5e] hover:bg-[#021f44] text-white font-sans font-bold text-xs flex items-center gap-2 cursor-pointer transition-all border-none rounded-xl w-full md:w-auto justify-center animate-fade-in"
          >
            Próximo Passo <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSaveBoard}
            disabled={savingBoard}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-sans font-bold text-xs flex items-center gap-2 cursor-pointer transition-all border-none rounded-xl w-full md:w-auto justify-center animate-fade-in"
          >
            <Save className="w-4 h-4" /> {savingBoard ? 'Salvando...' : 'Salvar e Concluir'}
          </button>
        )}
      </div>

      {/* ── PRÓXIMOS PASSOS E REVISÃO DE ROTINA (SEMPRE VISÍVEIS ABAIXO) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 bg-white border border-gray-200 p-4 rounded-2xl shadow-sm space-y-2">
          <label className="text-gray-500 uppercase font-black text-[10px] tracking-wider block">
            Próximos Passos recomendados para consolidar
          </label>
          <textarea
            value={activeBoard.proximosPassos}
            onChange={(e) => updateField('proximosPassos', e.target.value)}
            placeholder="O que precisa ser feito agora? Replicar melhorias? Nova cronometragem?"
            className="w-full border border-gray-200 text-slate-800 text-xs rounded-xl p-3 h-20 focus:border-[#032b5e] bg-white outline-none resize-none transition-all shadow-sm"
          />
        </div>

        <div className="lg:col-span-4 bg-white border border-gray-200 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="space-y-1.5">
            <label className="text-gray-500 uppercase font-black text-[10px] tracking-wider block">
              Data da Revisão de Rotina
            </label>
            <div className="relative">
              <input
                type="date"
                value={activeBoard.dataRevisao}
                onChange={(e) => updateField('dataRevisao', e.target.value)}
                className="w-full bg-[#f8fafc] border border-gray-200 text-[#032b5e] font-sans font-bold text-xs rounded-xl px-3 py-2.5 focus:border-[#032b5e] outline-none"
              />
            </div>
          </div>
          <p className="text-[9px] text-gray-400 font-bold uppercase leading-normal mt-2">
            A data de revisão serve para reavaliar a sustentabilidade da melhoria no Matinal de Rotina Operacional.
          </p>
        </div>
      </div>
        </>
      ) : (
        /* ── VISUALIZAÇÃO EM FOLHA HORIZONTAL A3 (COMPACTA E IMPRESSIVA) ── */
        <div className="border border-slate-300 rounded-2xl bg-slate-50/60 p-1 md:p-1.5 shadow-inner overflow-x-auto">
          <div className="min-w-[1240px] bg-white border-2 border-slate-300 rounded-xl shadow-xl p-5 md:p-6 text-slate-800 space-y-4 relative overflow-hidden">
            
            {/* Background design accents */}
            <div className="absolute inset-0 opacity-[0.015] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#032b5e 2px, transparent 2px)', backgroundSize: '16px 16px' }} />

            {/* A3 Header Block */}
            <div className="border-2 border-slate-700 grid grid-cols-12 rounded-xl overflow-hidden shadow-sm">
              <div className="col-span-4 p-4 border-r-2 border-slate-700 flex flex-col justify-center bg-[#032b5e] text-white">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[9px] font-black tracking-widest text-emerald-300 uppercase">SISTEMA INTEGRADO VPO</span>
                </div>
                <h1 className="font-sans font-black text-base tracking-tight uppercase leading-tight mt-0.5 text-white">
                  RELATÓRIO DE RESOLUÇÃO DE PROBLEMAS A3
                </h1>
                <p className="text-[9px] text-slate-200 font-bold uppercase tracking-wider mt-0.5">
                  POSTO OPERACIONAL: <span className="bg-slate-700 text-white font-black px-1.5 py-0.5 rounded ml-1 text-[8px]">{dashboard.toUpperCase()}</span>
                </p>
              </div>

              <div className="col-span-5 p-4 border-r-2 border-slate-700 flex flex-col justify-between bg-slate-900 text-white">
                <label className="text-[8px] text-slate-400 font-black uppercase tracking-wider block">
                  Tema do Desafio / Título do Projeto A3
                </label>
                <input
                  type="text"
                  value={activeBoard.titulo}
                  onChange={(e) => updateField('titulo', e.target.value)}
                  placeholder="Digite o título do desafio..."
                  className="w-full bg-slate-800 border border-slate-700 text-white font-sans font-black text-xs rounded-lg px-2.5 py-1.5 focus:border-amber-400 outline-none tracking-tight shadow-inner mt-1"
                />
              </div>

              <div className="col-span-3 p-3 grid grid-cols-2 gap-x-2 gap-y-1.5 text-[9px] font-bold uppercase bg-slate-950 text-slate-200">
                <div className="flex flex-col justify-center">
                  <span className="text-[7px] text-slate-500 font-black">Setor / Unidade</span>
                  <span className="truncate font-black text-slate-100">{empresa?.nome || 'Unidade Guarabira'}</span>
                </div>
                <div className="flex flex-col justify-center">
                  <span className="text-[7px] text-slate-500 font-black">Líder / Solicitante</span>
                  <span className="truncate text-slate-100">{user.nome}</span>
                </div>
                <div className="flex flex-col justify-center">
                  <span className="text-[7px] text-slate-500 font-black">Data de Início</span>
                  <input
                    type="date"
                    value={activeBoard.dataCriacaoISO}
                    onChange={(e) => updateField('dataCriacaoISO', e.target.value)}
                    className="bg-slate-900 border border-slate-800 text-slate-100 text-[9px] font-black rounded px-1 py-0.5 outline-none focus:border-amber-400 w-full"
                  />
                </div>
                <div className="flex flex-col justify-center">
                  <span className="text-[7px] text-slate-500 font-black">Próxima Revisão</span>
                  <input
                    type="date"
                    value={activeBoard.dataRevisao || ''}
                    onChange={(e) => updateField('dataRevisao', e.target.value)}
                    className="bg-slate-900 border border-slate-800 text-slate-100 text-[9px] font-black rounded px-1 py-0.5 outline-none focus:border-amber-400 w-full"
                  />
                </div>
              </div>
            </div>

            {/* A3 Columns Layout */}
            <div className="grid grid-cols-2 gap-4 items-start">
              
              {/* LEFT COLUMN: PROBLEMAS, EVIDENCIAS, CAUSAS */}
              <div className="space-y-4">
                
                {/* 1. Contexto e Problema */}
                <div className="bg-white border-2 border-slate-700 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-slate-700 text-white px-3 py-1.5 flex items-center justify-between">
                    <h3 className="font-sans font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                      <span className="bg-rose-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black">1</span>
                      Contexto e Definição do Problema (O que está fora do padrão?)
                    </h3>
                    <span className="text-[7px] font-black uppercase text-slate-300">Lean Problem Solving</span>
                  </div>
                  <div className="p-3 grid grid-cols-2 gap-3 bg-slate-50/30">
                    <div className="space-y-1">
                      <label className="text-slate-500 uppercase font-black text-[8px] tracking-wider block">
                        Descrição do Desvio / Anomalia
                      </label>
                      <textarea
                        value={activeBoard.problemaDesc}
                        onChange={(e) => updateField('problemaDesc', e.target.value)}
                        placeholder="Descreva o desvio físico detectado no posto..."
                        className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-lg p-2 h-20 focus:border-rose-500 focus:ring-1 focus:ring-rose-200 outline-none resize-none transition-all shadow-sm leading-relaxed"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-500 uppercase font-black text-[8px] tracking-wider block">
                        Impacto nas Operações / Custos / Gargalos
                      </label>
                      <textarea
                        value={activeBoard.problemaImpacto}
                        onChange={(e) => updateField('problemaImpacto', e.target.value)}
                        placeholder="Qual a consequência operacional, perdas de embalagens ou horas de atraso?"
                        className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-lg p-2 h-20 focus:border-rose-500 focus:ring-1 focus:ring-rose-200 outline-none resize-none transition-all shadow-sm leading-relaxed"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Situação Atual */}
                <div className="bg-white border-2 border-slate-700 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-slate-700 text-white px-3 py-1.5 flex items-center justify-between">
                    <h3 className="font-sans font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                      <span className="bg-amber-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black">2</span>
                      Situação Atual &amp; Evidências Coletadas no Campo
                    </h3>
                    <span className="text-[7px] font-black uppercase text-slate-300">Gochi Genbutsu</span>
                  </div>
                  <div className="p-3 space-y-2 bg-slate-50/30">
                    <div className="space-y-1">
                      <label className="text-slate-500 uppercase font-black text-[8px] tracking-wider block">
                        Fatos, Dados Reais e Indicadores Iniciais
                      </label>
                      <textarea
                        value={activeBoard.problemaEvidencias}
                        onChange={(e) => updateField('problemaEvidencias', e.target.value)}
                        placeholder="Evidências encontradas (ex: taxa de quebras em 1.8%, tempo de ciclo 4:30 min)..."
                        className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-lg p-2 h-18 focus:border-amber-500 focus:ring-1 focus:ring-amber-100 outline-none resize-none transition-all shadow-sm leading-relaxed"
                      />
                    </div>
                    <div className="bg-amber-500/5 border border-amber-300/30 p-2 rounded-lg flex items-center gap-2">
                      <Search className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <p className="text-[8px] text-amber-800 font-bold uppercase leading-tight">
                        Investigue as causas no pátio diretamente com a equipe operacional envolvida.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Análise de Causa Raiz */}
                <div className="bg-white border-2 border-slate-700 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-slate-700 text-white px-3 py-1.5 flex items-center justify-between">
                    <h3 className="font-sans font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                      <span className="bg-sky-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black">3</span>
                      Análise de Causa Raiz (Os 5 Porquês / Ishikawa)
                    </h3>
                    <span className="text-[7px] font-black uppercase text-slate-300">Investigação</span>
                  </div>
                  <div className="p-3 bg-slate-50/30">
                    <label className="text-slate-500 uppercase font-black text-[8px] tracking-wider block mb-1">
                      Sequência lógico-dedutiva para identificar a Causa Sistêmica
                    </label>
                    <textarea
                      value={activeBoard.problemaCausa}
                      onChange={(e) => updateField('problemaCausa', e.target.value)}
                      placeholder="Ex:&#10;1. Por que o Repack atrasa? -> Insumos longe.&#10;2. Por que os insumos estão longe? -> Layout antigo.&#10;3. Por que o layout é antigo? -> Nunca revisado.&#10;4. Por que nunca foi revisado? -> Falta de padrão de pátio..."
                      className="w-full bg-white border border-slate-200 text-slate-800 text-[11px] rounded-lg p-2 h-24 focus:border-sky-500 focus:ring-1 focus:ring-sky-100 outline-none resize-none transition-all shadow-sm leading-relaxed font-mono"
                    />
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN: CONTRAMEDIDAS, APRENDIZADOS, RESULTADOS */}
              <div className="space-y-4">
                
                {/* 4. Plano de Ação */}
                <div className="bg-white border-2 border-slate-700 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-slate-700 text-white px-3 py-1.5 flex items-center justify-between">
                    <h3 className="font-sans font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                      <span className="bg-emerald-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black">4</span>
                      Contramedidas e Plano de Ações Estipulado
                    </h3>
                    <span className="text-[7px] font-black uppercase text-slate-300">5W2H Simplificado</span>
                  </div>
                  <div className="p-2.5 bg-slate-50/30 space-y-2">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-[10px]">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500 font-black uppercase text-[7px] tracking-wider">
                            <th className="py-1 px-1 w-6">Ref</th>
                            <th className="py-1 px-1">O que fazer? (Ação Corretiva)</th>
                            <th className="py-1 px-1 w-24">Responsável (Quem?)</th>
                            <th className="py-1 px-1 w-20 text-center">Prazo (Quando?)</th>
                            <th className="py-1 px-1 w-28 text-right">Status / Progresso</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {activeBoard.actions.map((act, actIdx) => (
                            <tr key={actIdx} className="hover:bg-slate-100/50">
                              <td className="py-1 px-1 font-bold text-slate-400">#{actIdx + 1}</td>
                              <td className="py-1 px-1">
                                <input
                                  type="text"
                                  value={act.acao}
                                  onChange={(e) => updateAction(actIdx, 'acao', e.target.value)}
                                  placeholder="Nova ação..."
                                  className="w-full bg-transparent border-none text-slate-800 text-[10px] font-bold focus:bg-white focus:ring-1 focus:ring-slate-400 rounded px-1 outline-none"
                                />
                              </td>
                              <td className="py-1 px-1">
                                <input
                                  type="text"
                                  value={act.responsavel}
                                  onChange={(e) => updateAction(actIdx, 'responsavel', e.target.value)}
                                  placeholder="Responsável..."
                                  className="w-full bg-transparent border-none text-slate-800 text-[10px] focus:bg-white focus:ring-1 focus:ring-slate-400 rounded px-1 outline-none"
                                />
                              </td>
                              <td className="py-1 px-1 text-center">
                                <input
                                  type="text"
                                  value={act.prazo}
                                  onChange={(e) => updateAction(actIdx, 'prazo', e.target.value)}
                                  placeholder="DD/MM"
                                  className="w-full bg-transparent border-none text-slate-800 text-[10px] text-center focus:bg-white focus:ring-1 focus:ring-slate-400 rounded px-1 outline-none"
                                />
                              </td>
                              <td className="py-1 px-1 text-right">
                                <div className="flex items-center justify-end gap-1 scale-95 origin-right">
                                  <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="10"
                                    value={act.pct}
                                    onChange={(e) => updateAction(actIdx, 'pct', e.target.value)}
                                    className="w-12 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                  />
                                  <span className="text-[9px] font-mono font-bold w-6 text-right">{act.pct}%</span>
                                  <span className={`px-1 py-0.2 text-[7px] font-black rounded uppercase ${
                                    act.status === 'Concluído' 
                                      ? 'bg-emerald-100 text-emerald-700' 
                                      : act.status === 'Em Andamento' 
                                        ? 'bg-blue-100 text-blue-700' 
                                        : 'bg-gray-100 text-gray-700'
                                  }`}>
                                    {act.status === 'Concluído' ? 'OK' : act.status === 'Em Andamento' ? 'AND' : 'PEN'}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="grid grid-cols-12 gap-2 pt-1.5 border-t border-slate-200">
                      <div className="col-span-8 space-y-0.5">
                        <label className="text-slate-500 uppercase font-black text-[7px] tracking-wider block">
                          Comentários de Rotina e Barricadas de Pátio
                        </label>
                        <input
                          type="text"
                          value={activeBoard.comentarios || ''}
                          onChange={(e) => updateField('comentarios', e.target.value)}
                          placeholder="Registro rápido de observações ou impedimentos..."
                          className="w-full bg-white border border-slate-200 text-slate-800 text-[10px] rounded p-1 outline-none"
                        />
                      </div>
                      <div className="col-span-4 space-y-0.5">
                        <label className="text-slate-500 uppercase font-black text-[7px] tracking-wider block">
                          Orçamento / Recursos
                        </label>
                        <input
                          type="text"
                          value={activeBoard.recursos || ''}
                          onChange={(e) => updateField('recursos', e.target.value)}
                          placeholder="Materiais..."
                          className="w-full bg-white border border-slate-200 text-slate-800 text-[10px] rounded p-1 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5. Aprendizados e Padronização */}
                <div className="bg-white border-2 border-slate-700 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-slate-700 text-white px-3 py-1.5 flex items-center justify-between">
                    <h3 className="font-sans font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                      <span className="bg-purple-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black">5</span>
                      Aprendizados Obtidos e Ações de Padronização (SOP/LPP)
                    </h3>
                    <span className="text-[7px] font-black uppercase text-slate-300">Sustentabilidade</span>
                  </div>
                  <div className="p-3 grid grid-cols-2 gap-3 bg-slate-50/30">
                    <div className="space-y-1">
                      <label className="text-slate-500 uppercase font-black text-[8px] tracking-wider block">
                        Principais Aprendizados do Time
                      </label>
                      <textarea
                        value={activeBoard.aprendizados}
                        onChange={(e) => updateField('aprendizados', e.target.value)}
                        placeholder="O que aprendemos executando as contramedidas?"
                        className="w-full bg-white border border-slate-200 text-slate-800 text-[11px] rounded-lg p-2 h-14 focus:border-purple-500 outline-none resize-none transition-all shadow-sm leading-relaxed"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-500 uppercase font-black text-[8px] tracking-wider block">
                        Padronização (POPs/LPPs criados)
                      </label>
                      <textarea
                        value={activeBoard.padronizacao}
                        onChange={(e) => updateField('padronizacao', e.target.value)}
                        placeholder="Quais folhas ou processos foram criados ou atualizados?"
                        className="w-full bg-white border border-slate-200 text-slate-800 text-[11px] rounded-lg p-2 h-14 focus:border-purple-500 outline-none resize-none transition-all shadow-sm leading-relaxed"
                      />
                    </div>
                  </div>
                </div>

                {/* 6. Resultados */}
                <div className="bg-white border-2 border-slate-700 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-slate-700 text-white px-3 py-1.5 flex items-center justify-between">
                    <h3 className="font-sans font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                      <span className="bg-violet-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black">6</span>
                      Mensuração de Ganhos, Indicadores e Próximos Passos
                    </h3>
                    <span className="text-[7px] font-black uppercase text-slate-300">Medir</span>
                  </div>
                  <div className="p-3 bg-slate-50/30 space-y-2">
                    <div className="grid grid-cols-12 gap-3">
                      
                      {/* Indicators */}
                      <div className="col-span-7 space-y-1">
                        <label className="text-slate-500 uppercase font-black text-[8px] tracking-wider block">
                          Indicadores Operacionais Monitorados (Antes x Depois)
                        </label>
                        <div className="space-y-1">
                          {activeBoard.indicadores.map((ind, indIdx) => (
                            <div key={indIdx} className="grid grid-cols-12 gap-1 items-center">
                              <div className="col-span-6">
                                <input
                                  type="text"
                                  value={ind.indicador}
                                  onChange={(e) => updateIndicador(indIdx, 'indicador', e.target.value)}
                                  placeholder="Nome do indicador..."
                                  className="w-full bg-white border border-slate-200 text-slate-800 text-[10px] font-bold rounded p-0.5 outline-none focus:border-slate-400"
                                />
                              </div>
                              <div className="col-span-2">
                                <input
                                  type="text"
                                  value={ind.antes}
                                  onChange={(e) => updateIndicador(indIdx, 'antes', e.target.value)}
                                  placeholder="Ant"
                                  className="w-full bg-white border border-slate-200 text-slate-800 text-[10px] rounded p-0.5 text-center outline-none focus:border-slate-400 font-mono"
                                />
                              </div>
                              <div className="col-span-2">
                                <input
                                  type="text"
                                  value={ind.depois}
                                  onChange={(e) => updateIndicador(indIdx, 'depois', e.target.value)}
                                  placeholder="Dep"
                                  className="w-full bg-white border border-slate-200 text-slate-800 text-[10px] rounded p-0.5 text-center outline-none focus:border-slate-400 font-mono"
                                />
                              </div>
                              <div className="col-span-2 bg-slate-200 text-slate-700 text-[9px] font-black rounded p-0.5 text-center font-mono truncate">
                                {ind.variacao || 'Var'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Text */}
                      <div className="col-span-5 space-y-1.5">
                        <div className="space-y-0.5">
                          <label className="text-slate-500 uppercase font-black text-[7px] tracking-wider block">
                            Impacto no Negócio / Ganhos
                          </label>
                          <input
                            type="text"
                            value={activeBoard.impactoNegocio || ''}
                            onChange={(e) => updateField('impactoNegocio', e.target.value)}
                            placeholder="Economia gerada..."
                            className="w-full bg-white border border-slate-200 text-slate-800 text-[10px] rounded p-1 outline-none"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-slate-500 uppercase font-black text-[7px] tracking-wider block">
                            Próximos Passos recomendados
                          </label>
                          <input
                            type="text"
                            value={activeBoard.proximosPassos || ''}
                            onChange={(e) => updateField('proximosPassos', e.target.value)}
                            placeholder="Ex: Replicar no turno B..."
                            className="w-full bg-white border border-slate-200 text-slate-800 text-[10px] rounded p-1 outline-none"
                          />
                        </div>
                      </div>

                    </div>
                  </div>
                </div>

              </div>

            </div>

            {/* A3 Footer Sheet bar */}
            <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-[9px] text-slate-400 font-bold uppercase tracking-widest">
              <span>Metodologia A3 de Solução de Problemas baseada no VPO</span>
              <span>Empresa: {empresa?.nome || 'Pátio Ambev/Parceiros'} — Usuário: {user.nome}</span>
              <span className="text-slate-500 font-black">Visualização Paisagem (A3 Completo)</span>
            </div>

          </div>
        </div>
      )}

    </section>
  );
}
