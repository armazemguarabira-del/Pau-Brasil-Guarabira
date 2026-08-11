import React, { useState, useEffect, useMemo } from 'react';
import { safeSetLocalStorage } from '../utils/safeLocalStorage';
import { getAllSops, saveOrUpdateSop, canUserManageSop, createSafePdfBlobUrl, openPdfInNewTab, downloadPdfFile, openOrDownloadGeneratedSopPdf } from '../utils/sopUtils';
import { Usuario } from '../types';
import { 
  FileText, 
  Upload, 
  CheckCircle2, 
  X, 
  BookOpen, 
  ShieldCheck, 
  AlertTriangle, 
  Edit3, 
  Save, 
  RotateCcw,
  Download,
  Info,
  Eye,
  ExternalLink,
  Target,
  Users
} from 'lucide-react';

export type OperationalModuleKey = 
  | 'repack' 
  | 'despejo' 
  | 'armazem' 
  | 'validades' 
  | 'empilhador' 
  | 'logistica' 
  | 'fefo' 
  | 'picking'
  | 'quebras'
  | 'ressuprimento'
  | 'capacidade'
  | 'recebimento'
  | 'montagem'
  | 'efc'
  | 'tmr'
  | 'efc_efd'
  | 'ressuprimento_reabastecimento';

export interface POPDocument {
  title: string;
  code: string;
  version: string;
  lastUpdated: string;
  updatedBy: string;
  objetivo: string;
  content: string;
  safetyEPIs: string[];
  steps: { step: number; title: string; description: string }[];
  raciTable?: { atividade: string; god?: string; coa?: string; tst?: string; analista?: string; conferente?: string; empilhador?: string; ajudante?: string; manobrista?: string }[];
  fileUrl?: string;
  fileName?: string;
}

export const DEFAULT_POPS: Record<OperationalModuleKey, POPDocument> = {
  quebras: {
    title: 'Procedimento Operacional Padrão - Gestão de Quebras e Avarias',
    code: 'WH-LOG-03',
    version: '02',
    lastUpdated: '2025-12-05',
    updatedBy: 'Armazém - Pau Brasil Guarabira',
    objetivo: 'Definir normas e procedimentos para o processo de gestão nas ocorrências de perdas e quebras dentro da operação. Garantindo sempre a segurança, a qualidade e buscando a máxima eficiência no processo de carregamento.',
    content: 'Padrão corporativo para controle estatístico de perdas, isolamento de áreas de risco, recolha segura de garrafas e apuração de causas com aplicação de DTO e matriz RACI.',
    safetyEPIs: ['Bota Antiperfurante', 'Óculos Contra Impactos', 'Capacete com Jugular', 'Luva de Proteção a Objetos Cortantes', 'Uniforme / Colete Refletivo'],
    steps: [
      { step: 1, title: 'Avaliação de Risco & Check Visual', description: 'Verificar obstáculos no entorno, integridade de pallets PBR e firmetude das fitas em embalagens de 600ml e Long Neck antes de qualquer movimentação.' },
      { step: 2, title: 'Atendimento de Emergência & Isolamento (30 min)', description: 'Em caso de quebra de garrafas de produto acabado, isolar a área com fita e cones. Aguardar 30 minutos antes da limpeza, pois garrafas sob estresse térmico/impacto podem estourar em seguida.' },
      { step: 3, title: 'Limpeza Segura e Destinação do Vidro', description: 'Utilizar luvas raspa/anticorte e recolher todo o vidro para tambores ou caixas apropriadas. Nunca misturar cacos com pedras, cerâmicas, plásticos ou metais.' },
      { step: 4, title: 'Contabilização e Registro na Plataforma', description: 'Contabilizar produtos e unidades. O responsável deve efetuar o cadastro formal obrigatorio no painel "Cadastro de Quebra Operacional" (código SKU, área, turno, motivo e responsável).' },
      { step: 5, title: 'Análise de CFTV & Fluxo Punitivo / DTO', description: 'Conferir no CFTV a causa real da quebra. Em incidentes simples, aplicar entrevista de quebra, relato de anomalia, DTO e reciclagem no QLP ativo.' }
    ],
    raciTable: [
      { atividade: 'Verificar integridade física do envolvido', god: '-', coa: '-', tst: '-', analista: '-', conferente: '-', empilhador: '-', ajudante: 'R' },
      { atividade: 'Sinalizar devidamente o local da quebra', god: '-', coa: '-', tst: '-', analista: '-', conferente: '-', empilhador: '-', ajudante: 'R' },
      { atividade: 'Aguardar 30 minutos e realizar isolamento', god: 'I', coa: 'I', tst: 'I', analista: '-', conferente: '-', empilhador: '-', ajudante: 'R' },
      { atividade: 'Realizar a limpeza e destinação dos cacos', god: '-', coa: 'C', tst: 'C', analista: '-', conferente: '-', empilhador: '-', ajudante: 'R' },
      { atividade: 'Contabilizar produto e quantidades quebradas', god: '-', coa: '-', tst: '-', analista: 'A', conferente: '-', empilhador: '-', ajudante: 'R' },
      { atividade: 'Informar ao COA e TST a ocorrência e motivo', god: 'I', coa: 'I', tst: 'I', analista: '-', conferente: '-', empilhador: '-', ajudante: 'R' },
      { atividade: 'Registrar ocorrência no painel da plataforma', god: 'I', coa: 'A', tst: '-', analista: 'R', conferente: '-', empilhador: '-', ajudante: 'R' },
      { atividade: 'Verificar no CFTV o motivo real e desvios', god: 'I', coa: '-', tst: 'R', analista: '-', conferente: '-', empilhador: '-', ajudante: '-' },
      { atividade: 'Aplicar fluxo punitivo / reciclagem DTO', god: 'C', coa: 'R', tst: 'I', analista: '-', conferente: '-', empilhador: '-', ajudante: '-' }
    ]
  },
  repack: {
    title: 'Procedimento Operacional Padrão - DPO Pilar Armazém: Repack',
    code: 'AR-09',
    version: '04',
    lastUpdated: '2025-05-13',
    updatedBy: 'Logística - Revenda Pau Brasil Guarabira',
    objetivo: 'Repack é a atividade de substituição da embalagem secundária de produtos que possuem suas características de qualidade inalteradas, portanto podem ser comercializados.',
    content: 'Padrão operacional de reembalamento e recuperação de pacotes/caixas. Exige área segregada com bancada, iluminação, tela mosquiteira, água corrente e Kit Repack oficial (soprador térmico, aplicadores de silicone, Perfex e filme shrink).',
    safetyEPIs: ['Calçado de Segurança', 'Colete Refletivo', 'Luva de Proteção', 'Óculos de Proteção', 'Cinta Lombar Ergonômica'],
    steps: [
      { step: 1, title: 'Identificação & Triagem dos Produtos', description: 'Identificar pacotes avariados no armazém. Verificar se a embalagem primária (lata/garrafa) está 100% íntegra, com lote e validade visíveis. Jamais reembalar produtos vencidos ou do Marketplace avariados externamente.' },
      { step: 2, title: 'Assepsia e Limpeza dos Produtos', description: 'Higienizar latas e garrafas com papel Perfex e esponja macia na bancada de alvenaria/metal. Secar completamente antes do envelopamento.' },
      { step: 3, title: 'Reembalamento Conforme Padrão', description: 'Utilizar filme shrink ou cartão colado (6-pack Long Neck). Selar fardos de lata/PET com soprador térmico (proibido o uso de maçarico ou gás) e cola de silicone.' },
      { step: 4, title: 'Validação pelo Conferente e Liberação', description: 'Conferente realiza a validação de qualidade dos fardos prontos e efetua a liberação física e lógica para o estoque.' },
      { step: 5, title: 'Acompanhamento de Produtividade no Sistema', description: 'Lançar caixas reembaladas e minutos consumidos no painel Repack Timer da plataforma para apuração do indicador de Unidades/Hora.' }
    ],
    raciTable: [
      { atividade: 'Identificar produtos que precisam reembalamento', god: '-', coa: 'A', tst: '-', analista: '-', conferente: 'R', empilhador: '-', ajudante: 'R/I' },
      { atividade: 'Definir meta de caixas reembaladas por hora', god: '-', coa: 'R', tst: '-', analista: '-', conferente: 'I', empilhador: '-', ajudante: 'I' },
      { atividade: 'Segregar e limpar produtos com anomalias', god: '-', coa: 'A', tst: '-', analista: '-', conferente: '-', empilhador: '-', ajudante: 'R' },
      { atividade: 'Realizar reembalamento conforme padrão', god: '-', coa: 'A', tst: '-', analista: '-', conferente: '-', empilhador: '-', ajudante: 'R' },
      { atividade: 'Realizar validação de qualidade dos produtos', god: '-', coa: 'A', tst: '-', analista: '-', conferente: 'R', empilhador: '-', ajudante: 'C' },
      { atividade: 'Liberar os produtos reembalados para o estoque', god: '-', coa: 'A', tst: '-', analista: '-', conferente: 'R', empilhador: '-', ajudante: 'C' }
    ]
  },
  despejo: {
    title: 'Procedimento Operacional Padrão - Gestão do Despejo e Descarte',
    code: 'WH-LOG-03',
    version: '04',
    lastUpdated: '2026-08-01',
    updatedBy: 'Armazém - Distribuidora Pau Brasil',
    objetivo: 'Mapear o fluxo a ser seguido para o envio de produtos não conformes para análise da fábrica, despejo da bombona, descarte dos descartáveis e destinação responsável dos resíduos gerados na operação.',
    content: 'Processo corporativo de escoamento de líquidos na bombona, enfardamento de resíduos (Projeto Reciclar) e controle de descarte de produtos não conformes (PNC) em até 30 dias.',
    safetyEPIs: ['Óculos de Amplo Espectro', 'Colete Refletivo', 'Bota de Segurança', 'Cinta Lombar', 'Luva Nitrílica / Raspa'],
    steps: [
      { step: 1, title: 'Conferência e Organização de PNC', description: 'Ajudante organiza e confere quebras e ocorrências diárias. Conferente valida os itens vencidos ou bloqueados no PNC.' },
      { step: 2, title: 'Despejo do Líquido na Bombona', description: 'Com autorização do Conferente, realizar o despejo do líquido diretamente na bombona vazia com EPIs de proteção completa.' },
      { step: 3, title: 'Verificação da Bombona e Logística de Troca', description: 'Ajudante verifica se a bombona está cheia. Em caso afirmativo, comunicar o supervisor; Analista de Operações programa a viagem de puxada com a fábrica e emite NF de despejo.' },
      { step: 4, title: 'Segregação de Resíduos & Projeto Reciclar', description: 'Encaminhar latas, PET, papelão e plásticos limpos para a área de coleta seletiva. Reverter os recursos da venda de recicláveis em material escolar para os filhos dos colaboradores.' },
      { step: 5, title: 'Apontamento no APP Armazém Fácil', description: 'Lançar quantidade de SKUs despejados, hora inicial e hora final no aplicativo para cálculo de produtividade (meta 00:03:30 por SKU).' }
    ],
    raciTable: [
      { atividade: 'Organizar/conferir quebras e ocorrências diárias', god: '-', coa: 'I', tst: '-', analista: 'C', conferente: 'A', empilhador: '-', ajudante: 'R' },
      { atividade: 'Autorizar o descarte dentro da bombona', god: '-', coa: 'I', tst: '-', analista: 'C', conferente: 'R', empilhador: '-', ajudante: 'A' },
      { atividade: 'Verificar bombona e comunicar se cheia', god: '-', coa: 'C', tst: '-', analista: 'I', conferente: 'A', empilhador: '-', ajudante: 'R' },
      { atividade: 'Alinhar recolha da bombona cheia e troca', god: '-', coa: 'A', tst: '-', analista: 'R', conferente: 'C', empilhador: '-', ajudante: 'I' },
      { atividade: 'Realizar o despejo na bombona vazia', god: '-', coa: 'I', tst: '-', analista: 'C', conferente: 'A', empilhador: '-', ajudante: 'R' },
      { atividade: 'Lançar produtividade de despejo no APP', god: '-', coa: 'I', tst: '-', analista: '-', conferente: 'C', empilhador: '-', ajudante: 'R' }
    ]
  },
  fefo: {
    title: 'Procedimento Operacional Padrão - Pilar Atendimento: Gestão de FEFO',
    code: 'WH-LOG-01',
    version: '03',
    lastUpdated: '2026-04-16',
    updatedBy: 'Armazém - Pau Brasil Guarabira',
    objetivo: 'O objetivo deste padrão é definir normas e procedimentos para o processo de gestão no carregamento incluindo montagem, abastecimento e reabastecimento respeitando rigorosamente a validade dos produtos (FEFO - First Expire, First Out).',
    content: 'Orientações de etiquetagem NRI em 3 lados do palete com rocama, contagem de idade semanal, farol de vencimentos e divulgação do Stock Age Index ao time de vendas.',
    safetyEPIs: ['Bota Antiperfurante', 'Óculos Contra Impactos', 'Capacete com Jugular', 'Luva de Proteção Cortante', 'Uniforme / Colete Refletivo'],
    steps: [
      { step: 1, title: 'Recebimento & Coleta da Validade', description: 'Empilhador e ajudante coletam código do produto, data de validade, data de recebimento, placa do veículo e fábrica de origem no descarregamento.' },
      { step: 2, title: 'Impressão e Aplicação da NRI em 3 Lados', description: 'Analista emite folhas NRI. Empilhador aplica a etiqueta com rocama grampeada nos 3 lados do palete PBR para mantê-la visível mesmo no picking.' },
      { step: 3, title: 'Armazenamento e Rodízio de Filas (FEFO)', description: 'Armazenar o produto na rua conforme a validade: lote com vencimento mais recente sempre na frente da fila. Se necessário, efetuar o rodízio das filas.' },
      { step: 4, title: 'Coleta de Idade Semanal (RF) & Stock Age Index', description: 'Conferente realiza a contagem geral de idades semanalmente via coletor RF (separando Estoque Central e Picking). Analista atualiza o indicador Stock Age Index.' },
      { step: 5, title: 'Divulgação p/ Vendas & Reunião RLP', description: 'Divulgar semanalmente a tabela de validades e farol de produtos críticos nos grupos de vendedores para direcionamento de descontos e saídas prioritárias.' }
    ],
    raciTable: [
      { atividade: 'Recebimento e check de produtos', god: '-', coa: '-', tst: '-', analista: '-', conferente: '-', empilhador: 'R', ajudante: '-' },
      { atividade: 'Coleta da data de validade na descarga', god: '-', coa: '-', tst: '-', analista: 'I', conferente: '-', empilhador: 'R', ajudante: '-' },
      { atividade: 'Impressão de etiquetas NRI', god: '-', coa: '-', tst: '-', analista: 'R', conferente: '-', empilhador: 'C', ajudante: '-' },
      { atividade: 'Aplicação da NRI em 3 lados com rocama', god: '-', coa: '-', tst: '-', analista: '-', conferente: 'I', empilhador: 'R', ajudante: 'C' },
      { atividade: 'Gestão de FEFO e rodízio de filas', god: '-', coa: '-', tst: '-', analista: '-', conferente: 'C', empilhador: 'R', ajudante: '-' },
      { atividade: 'Coleta semanal de idades (RF)', god: '-', coa: '-', tst: '-', analista: '-', conferente: 'R', empilhador: 'C', ajudante: '-' },
      { atividade: 'Atualização do Stock Age Index', god: '-', coa: 'A', tst: '-', analista: 'R', conferente: '-', empilhador: '-', ajudante: '-' },
      { atividade: 'Divulgação do Farol para Time de Vendas', god: '-', coa: 'A', tst: '-', analista: 'R', conferente: '-', empilhador: '-', ajudante: '-' }
    ]
  },
  armazem: {
    title: 'Procedimento Operacional Padrão - Processo de Carregamento e Descarregamento',
    code: 'Nº 1 / DPO',
    version: '0',
    lastUpdated: '2025-03-15',
    updatedBy: 'Armazém - Revenda Pau Brasil Guarabira',
    objetivo: 'O objetivo deste padrão é deixar claro e evidente todas as atividades que fazem o processo de carregamento dos veículos da entrega garantindo assim que sejam realizadas da forma mais segura e produtiva possível.',
    content: 'Premissas de carregamento: veículo totalmente descarregado, 5S nas baias, inspeção giro 360°, Fast Picking fechado, manobra para RedZone e uso de trava-rodas com linha de vida.',
    safetyEPIs: ['Capacete com Jugular', 'Colete Refletivo', 'Bota de Segurança', 'Protetor Auricular', 'Trava-Rodas'],
    steps: [
      { step: 1, title: 'Garantia de Premissas e 5S', description: 'Verificar se o veículo está 100% descarregado, baias limpas (5S), inspeção giro 360° no caminhão e checklist da empilhadeira concluído.' },
      { step: 2, title: 'Liberação de Mapas no Fast Picking', description: 'No sistema Fast Picking, acessar menu Separação e clicar em Liberar Mapas enviando para o Box do conferente.' },
      { step: 3, title: 'Montagem do Pallete por Coluna', description: 'O ajudante inicia a tarefa no Palm Top. A montagem do palete DEVE ser feita por colunas e não por lastro para facilitar a entrega.' },
      { step: 4, title: 'Conferência Minuciosa do Pallete', description: 'Conferente verifica item a item (quantidade e qualidade). Sinalizar eventuais erros no app: Inversão, Falta ou Sobra.' },
      { step: 5, title: 'Manobra RedZone e Amarração com Linha de Vida', description: 'Manobrista posiciona veículo na RedZone, insere trava-rodas e empilhador realiza o carregamento. Colaboradores realizam a amarração da carga usando linha de vida.' }
    ],
    raciTable: [
      { atividade: 'Garantir veículos descarregados até 22:00', god: '-', coa: '-', tst: '-', analista: '-', conferente: 'A', empilhador: 'R', ajudante: '-', manobrista: '-' },
      { atividade: 'Realizar 5S e limpeza das baias', god: '-', coa: '-', tst: '-', analista: '-', conferente: 'I', empilhador: '-', ajudante: '-', manobrista: 'R' },
      { atividade: 'Realizar liberação dos mapas no Fast Picking', god: '-', coa: '-', tst: '-', analista: '-', conferente: 'R', empilhador: '-', ajudante: 'I', manobrista: '-' },
      { atividade: 'Realizar montagem do palete conforme pedido', god: '-', coa: '-', tst: '-', analista: '-', conferente: 'R', empilhador: '-', ajudante: 'A/C', manobrista: '-' },
      { atividade: 'Realizar conferência do palete montado', god: '-', coa: '-', tst: '-', analista: '-', conferente: 'C', empilhador: 'I', ajudante: 'R', manobrista: '-' },
      { atividade: 'Manobrar veículo para área de RedZone', god: '-', coa: '-', tst: '-', analista: '-', conferente: 'I', empilhador: '-', ajudante: '-', manobrista: 'R' },
      { atividade: 'Colocar trava-rodas e realizar carregamento', god: '-', coa: '-', tst: '-', analista: '-', conferente: 'I', empilhador: 'R', ajudante: '-', manobrista: 'R' },
      { atividade: 'Realizar fechamento de carga no Fast Picking', god: '-', coa: '-', tst: '-', analista: '-', conferente: 'R', empilhador: 'C', ajudante: '-', manobrista: '-' },
      { atividade: 'Manobrar veículo para vaga no pátio', god: '-', coa: '-', tst: '-', analista: '-', conferente: 'I', empilhador: '-', ajudante: '-', manobrista: 'R' }
    ]
  },
  validades: {
    title: 'Procedimento Operacional Padrão - Gestão FEFO & Validades',
    code: 'WH-LOG-01',
    version: '03',
    lastUpdated: '2026-04-16',
    updatedBy: 'Controle de Estoque & Qualidade',
    objetivo: 'Garantir rotatividade do estoque priorizando lotes mais próximos do vencimento para prevenção de perdas e contaminação.',
    content: 'Acompanhamento semanal de Stock Age Index, controle de idades por rua e farol de riscos para área comercial.',
    safetyEPIs: ['Bota de Segurança', 'Luvas de Agarradeira', 'Colete Refletivo'],
    steps: [
      { step: 1, title: 'Leitura de Idades via Coletor RF', description: 'Realizar a contagem semanal auditando validades do Estoque Central e do Picking.' },
      { step: 2, title: 'Atualização do Stock Age Index', description: 'Processar percentual de HLs próximos do bloqueio e gerar plano de ação.' },
      { step: 3, title: 'Ações Preventivas com Time de Vendas', description: 'Divulgar itens críticos no WhatsApp e alinhar descounts no RLP.' }
    ]
  },
  empilhador: {
    title: 'Padrão Oficial DPO — Layout, Capacidade e Correlação (Revenda Guarabira)',
    code: 'PB-GBA-LAY-01',
    version: 'Versão 1 (08/2026)',
    lastUpdated: '2026-08-08',
    updatedBy: 'Pau Brasil Distribuidora — Guarabira (Coord. Djeanderson Soares / Ger. Marcos Guilherme)',
    objetivo: 'Orientar a Revenda Guarabira quanto ao layout físico e virtual do armazém, à ocupação e capacidade por área, à matriz de correlação entre áreas, à classificação por Curva ABC, ao FEFO e ao procedimento de alteração de layout — garantindo aderência aos critérios de auditoria do Bloco Layout do DPO Pilar Armazém.',
    content: 'DOCUMENTO OFICIAL REGULAMENTAR DPO — PILAR ARMAZÉM (PB-GBA-LAY-01):\n\n1. CAMPO DE APLICAÇÃO & PLATAFORMA ARMAZÉM FÁCIL:\nAplica-se às operações do armazém de Guarabira (Estoque Central, Picking, Marketplace, Contingência, PNC, Devoluções, Repacking, Refugo, Retorno de Rota, Carregamento/Recarga e Pulmão). A plataforma Armazém Fácil é a fonte única de verdade para cadastro de produtos, layout virtual, gestão de capacidade e auditoria DPO.\n\n2. ÁREAS & CAPACIDADE META (TOTAL 967 PALETES):\n• 1 - Armazém Central (Blocos A, B, C): 615 Paletes (63,6%)\n• 2 - Picking: 160 Paletes (16,5%)\n• 3 - Marketplace: 84 Paletes (8,7%)\n• 4 - Contingência: 108 Paletes (11,2%)\n\n3. ESTRUTURA DE BLOCOS E RUAS (CURVA ABC):\n• Bloco A (Ruas A1 a A4): Curva A (maior giro) — Mais próximo do Picking/Docas.\n• Bloco B (Ruas B1 a B4): Curva B (giro intermediário) — Centro do armazém.\n• Bloco C (Ruas C1 a C4): Curva C (menor giro) — Fundo do armazém.\n• Pulmão: Área destinada a armazenamento temporário e descarregamento de carretas (puxada).\n\n4. NORMAS DE SEGURANÇA E DISPOSIÇÃO FÍSICA:\n• Ruas de tráfego entre 4,5 m e 5,0 m; Faixas de pedestre com no mínimo 60 cm.\n• Red Zones demarcadas em vermelho com largura mínima de 4,5 m.\n• Espaçamento mínimo de 50 cm entre lotes para ventilação e contagem. Lotes de no máximo 2 paletes de largura por 30 de comprimento.\n• Placas de identificação em 100% das áreas na cor azul com fonte branca.\n• Uso obrigatório de EPIs: Colete refletivo, óculos contra impactos e bota de segurança.',
    safetyEPIs: ['Colete Refletivo com Faixas Fluorescentes', 'Óculos de Proteção Contra Impacto', 'Bota de Segurança com Biqueira de Aço', 'Capacete com Jugular', 'Cinta Lombar Ergonômica'],
    steps: [
      { step: 1, title: 'Verificação de Segurança e Sinalização DPO', description: 'Manter ruas de tráfego entre 4,5m e 5,0m, faixas de pedestre de 60cm e Red Zones sinalizadas em vermelho (largura mínima 4,5m) sem obstrução de extintores.' },
      { step: 2, title: 'Alocação por Curva ABC & Distância de Viagem', description: 'Alocar produtos de Curva A no Bloco A (próximo ao picking), Curva B no Bloco B (centro) e Curva C no Bloco C (fundo do armazém).' },
      { step: 3, title: 'Monitoramento de Capacidade por Área (967 Paletes)', description: 'Controlar o saldo por setor no Armazém Fácil: Central (615 PL), Picking (160 PL), Marketplace (84 PL). Transbordar para Contingência (108 PL) apenas ao saturar o Central.' },
      { step: 4, title: 'Validação de Validade (FEFO Estoque x Picking)', description: 'Garantir tolerância zero de quebra de FEFO entre Estoque Central e Picking, e tolerância máxima de 7 dias entre ruas no estoque central.' },
      { step: 5, title: 'Governança & Fluxo de Alteração de Layout', description: 'Alterações no layout exigem workflow formal: Coordenador -> Esp. Regional -> Eng. Segurança -> Esp. Corporativo -> Time ZLS.' }
    ],
    raciTable: [
      { atividade: 'Manutenção do layout físico e virtual atualizados', god: '-', coa: 'A', tst: 'C', analista: '-', conferente: 'C', empilhador: 'I', ajudante: 'I' },
      { atividade: 'Classificação e atualização mensal da Curva ABC', god: '-', coa: 'A', tst: '-', analista: 'R', conferente: 'I', empilhador: 'I', ajudante: 'I' },
      { atividade: 'Solicitação de alteração de layout formal', god: 'I', coa: 'R', tst: 'C', analista: 'I', conferente: '-', empilhador: '-', ajudante: '-' },
      { atividade: 'Tratamento de quebras de FEFO no armazém', god: '-', coa: 'A', tst: '-', analista: '-', conferente: 'R', empilhador: 'R', ajudante: 'I' },
      { atividade: 'Auditoria do Bloco Layout (DPO Pilar Armazém)', god: 'A', coa: 'C', tst: 'R', analista: 'C', conferente: 'I', empilhador: 'I', ajudante: 'I' }
    ]
  },
  logistica: {
    title: 'Procedimento Operacional Padrão - Logística e Indicadores EFC / EFD',
    code: 'POP-LOG-06',
    version: '1.0',
    lastUpdated: '2026-07-15',
    updatedBy: 'Gestão de Logística',
    objetivo: 'Assegurar conformidade no tempo de permanência de veículos e documentação no pátio.',
    content: 'Cálculo e monitoramento de SLA de EFC (96%) e EFD (90%) com mapa de calor 24h/72h.',
    safetyEPIs: ['Colete Refletivo', 'Bota de Segurança', 'Óculos de Proteção'],
    steps: [
      { step: 1, title: 'Check de Chegada e Liberação', description: 'Registrar horário exato de chegada da frota e conferência física de documentos.' },
      { step: 2, title: 'Apontamento de Tempos Operacionais', description: 'Acompanhar tempo transcorrido de carregamento (SLA 15 min) e descarregamento (SLA 10 min).' }
    ]
  },
  picking: {
    title: 'Procedimento Operacional Padrão - Separação e Abastecimento do Picking',
    code: 'POP-PCK-01',
    version: '2.0',
    lastUpdated: '2026-07-28',
    updatedBy: 'Coordenação de Picking',
    objetivo: 'Garantir o fluxo contínuo de ressuprimento pré-carga e reabastecimento durante o carregamento sem interrupção de montagem.',
    content: 'Regras para organização de baias, prevenção de avarias e sugestão semanal de realocação de paletes (slotting).',
    safetyEPIs: ['Luva Anticorte', 'Bota com Biqueira de Aço', 'Colete Refletivo'],
    steps: [
      { step: 1, title: 'Montagem por Coluna', description: 'Ajudantes devem estruturar os paletes por colunas para evitar tombamento.' },
      { step: 2, title: 'Ressuprimento Antecipado (Pré-Picking)', description: 'Separar paletes completos com antecedência na pré-carga para reduzir movimentações no pico de carregamento.' }
    ]
  },
  ressuprimento: {
    title: 'Procedimento Operacional Padrão - Ressuprimento e Reabastecimento',
    code: 'POP-RES-01',
    version: '1.5',
    lastUpdated: '2026-07-10',
    updatedBy: 'Operações de Estoque',
    objetivo: 'Manter a disponibilidade física de SKUs nas ruas de picking sem sobrecarregar corredores.',
    content: 'Critérios de acionamento do ressuprimento pré-carga e reabastecimento corretivo durante o carregamento.',
    safetyEPIs: ['Colete Refletivo', 'Bota de Segurança', 'Protetor Auricular'],
    steps: [
      { step: 1, title: 'Giro de Posições', description: 'Consultar painel de posições críticas no picking.' },
      { step: 2, title: 'Transferência Central -> Picking', description: 'Efetuar movimentação respeitando sinalização de segurança.' }
    ]
  },
  capacidade: {
    title: 'Padrão Oficial DPO — Layout, Capacidade e Correlação (Revenda Guarabira)',
    code: 'PB-GBA-LAY-01',
    version: 'Versão 1 (08/2026)',
    lastUpdated: '2026-08-08',
    updatedBy: 'Pau Brasil Distribuidora — Guarabira (Coord. Djeanderson Soares / Ger. Marcos Guilherme)',
    objetivo: 'Orientar a Revenda Guarabira quanto ao layout físico e virtual do armazém, à ocupação e capacidade por área, à matriz de correlação entre áreas, à classificação por Curva ABC, ao FEFO e ao procedimento de alteração de layout — garantindo aderência aos critérios de auditoria do Bloco Layout do DPO Pilar Armazém.',
    content: 'DOCUMENTO OFICIAL REGULAMENTAR DPO — PILAR ARMAZÉM (PB-GBA-LAY-01):\n\n1. CAMPO DE APLICAÇÃO & PLATAFORMA ARMAZÉM FÁCIL:\nAplica-se às operações do armazém de Guarabira (Estoque Central, Picking, Marketplace, Contingência, PNC, Devoluções, Repacking, Refugo, Retorno de Rota, Carregamento/Recarga e Pulmão). A plataforma Armazém Fácil é a fonte única de verdade para cadastro de produtos, layout virtual, gestão de capacidade e auditoria DPO.\n\n2. ÁREAS & CAPACIDADE META (TOTAL 967 PALETES):\n• 1 - Armazém Central (Blocos A, B, C): 615 Paletes (63,6%)\n• 2 - Picking: 160 Paletes (16,5%)\n• 3 - Marketplace: 84 Paletes (8,7%)\n• 4 - Contingência: 108 Paletes (11,2%)\n\n3. ESTRUTURA DE BLOCOS E RUAS (CURVA ABC):\n• Bloco A (Ruas A1 a A4): Curva A (maior giro) — Mais próximo do Picking/Docas.\n• Bloco B (Ruas B1 a B4): Curva B (giro intermediário) — Centro do armazém.\n• Bloco C (Ruas C1 a C4): Curva C (menor giro) — Fundo do armazém.\n• Pulmão: Área destinada a armazenamento temporário e descarregamento de carretas (puxada).\n\n4. NORMAS DE SEGURANÇA E DISPOSIÇÃO FÍSICA:\n• Ruas de tráfego entre 4,5 m e 5,0 m; Faixas de pedestre com no mínimo 60 cm.\n• Red Zones demarcadas em vermelho com largura mínima de 4,5 m.\n• Espaçamento mínimo de 50 cm entre lotes para ventilação e contagem. Lotes de no máximo 2 paletes de largura por 30 de comprimento.\n• Placas de identificação em 100% das áreas na cor azul com fonte branca.\n• Uso obrigatório de EPIs: Colete refletivo, óculos contra impactos e bota de segurança.',
    safetyEPIs: ['Colete Refletivo com Faixas Fluorescentes', 'Óculos de Proteção Contra Impacto', 'Bota de Segurança com Biqueira de Aço', 'Capacete com Jugular', 'Cinta Lombar Ergonômica'],
    steps: [
      { step: 1, title: 'Verificação de Segurança e Sinalização DPO', description: 'Manter ruas de tráfego entre 4,5m e 5,0m, faixas de pedestre de 60cm e Red Zones sinalizadas em vermelho (largura mínima 4,5m) sem obstrução de extintores.' },
      { step: 2, title: 'Alocação por Curva ABC & Distância de Viagem', description: 'Alocar produtos de Curva A no Bloco A (próximo ao picking), Curva B no Bloco B (centro) e Curva C no Bloco C (fundo do armazém).' },
      { step: 3, title: 'Monitoramento de Capacidade por Área (967 Paletes)', description: 'Controlar o saldo por setor no Armazém Fácil: Central (615 PL), Picking (160 PL), Marketplace (84 PL). Transbordar para Contingência (108 PL) apenas ao saturar o Central.' },
      { step: 4, title: 'Validação de Validade (FEFO Estoque x Picking)', description: 'Garantir tolerância zero de quebra de FEFO entre Estoque Central e Picking, e tolerância máxima de 7 dias entre ruas no estoque central.' },
      { step: 5, title: 'Governança & Fluxo de Alteração de Layout', description: 'Alterações no layout exigem workflow formal: Coordenador -> Esp. Regional -> Eng. Segurança -> Esp. Corporativo -> Time ZLS.' }
    ],
    raciTable: [
      { atividade: 'Manutenção do layout físico e virtual atualizados', god: '-', coa: 'A', tst: 'C', analista: '-', conferente: 'C', empilhador: 'I', ajudante: 'I' },
      { atividade: 'Classificação e atualização mensal da Curva ABC', god: '-', coa: 'A', tst: '-', analista: 'R', conferente: 'I', empilhador: 'I', ajudante: 'I' },
      { atividade: 'Solicitação de alteração de layout formal', god: 'I', coa: 'R', tst: 'C', analista: 'I', conferente: '-', empilhador: '-', ajudante: '-' },
      { atividade: 'Tratamento de quebras de FEFO no armazém', god: '-', coa: 'A', tst: '-', analista: '-', conferente: 'R', empilhador: 'R', ajudante: 'I' },
      { atividade: 'Auditoria do Bloco Layout (DPO Pilar Armazém)', god: 'A', coa: 'C', tst: 'R', analista: 'C', conferente: 'I', empilhador: 'I', ajudante: 'I' }
    ]
  },
  recebimento: {
    title: 'Procedimento Operacional Padrão - Recebimento e Descarga de Carretas',
    code: 'POP-REC-01',
    version: '1.0',
    lastUpdated: '2026-06-20',
    updatedBy: 'Equipe de Recebimento',
    objetivo: 'Auditar paletes oriundos das cervejarias garantindo integridade de fitas, PBR e validades.',
    content: 'Checklist de recebimento, identificação de avarias de trânsito e atesto de NF.',
    safetyEPIs: ['Óculos de Proteção', 'Bota Antiperfurante', 'Capacete'],
    steps: [
      { step: 1, title: 'Giro 360 no Veículo', description: 'Inspecionar a carga na carreta antes da desamaração.' },
      { step: 2, title: 'Conferência de NRI e Lote', description: 'Coletar datas e emitir etiquetas NRI para aplicação imediata.' }
    ]
  },
  montagem: {
    title: 'Procedimento Operacional Padrão - Montagem de Cargas (Fast Picking)',
    code: 'POP-MNT-01',
    version: '2.1',
    lastUpdated: '2026-07-02',
    updatedBy: 'Fast Picking Operacional',
    objetivo: 'Assegurar montagem perfeita de mapas de entrega sem erros de inversão, falta ou sobra.',
    content: 'Operação via aplicativo Palm Top e cronometragem de tarefas de montagem.',
    safetyEPIs: ['Luva de Agarradeira', 'Bota de Segurança', 'Colete'],
    steps: [
      { step: 1, title: 'Leitura de Tarefa no Palm', description: 'Aceitar mapa liberado pelo conferente.' },
      { step: 2, title: 'Montagem e Envio ao Box', description: 'Dispor unidades no palete por coluna e enviar ao conferente.' }
    ]
  },
  efc: {
    title: 'Procedimento Operacional Padrão - Conformidade EFC (Estrutura Física da Carga)',
    code: 'POP-EFC-01',
    version: '1.0',
    lastUpdated: '2026-07-01',
    updatedBy: 'Supervisão de Pátio',
    objetivo: 'Garantir meta de 96.0% de veículos sem avarias de estrutura física ou amarração incorreta.',
    content: 'Critérios de inspeção de travamento, cantoneiras e lona de proteção.',
    safetyEPIs: ['Colete Refletivo', 'Capacete', 'Bota'],
    steps: [
      { step: 1, title: 'Inspeção do Veículo Pronto', description: 'Vistoriar amarrações na linha de vida antes da saída.' },
      { step: 2, title: 'Atesto do EFC', description: 'Registrar resultado da vistoria na plataforma DPO.' }
    ]
  },
  tmr: {
    title: 'Procedimento Operacional Padrão - TMR (Tempo Médio de Revenda / Atendimento)',
    code: 'POP-LOG-012',
    version: '2.0',
    lastUpdated: '2026-07-28',
    updatedBy: 'Operações de Expedição & TMR',
    objetivo: 'Manter tempo médio de movimentação entre Iniciar e Concluir dentro dos SLAs da operação.',
    content: 'Padrão operacional para paletização, conferência de embalagens e liberação de carretas de revenda.',
    safetyEPIs: ['Luvas Antiderrapantes', 'Bota com Biqueira', 'Protetor Auricular', 'Colete Refletivo'],
    steps: [
      { step: 1, title: 'Conferência de Instruções e Vasilhames', description: 'Verifique as caixas e paletes de vasilhames solicitados pelo Conferente/ADM para a carreta.' },
      { step: 2, title: 'Movimentação Segura', description: 'Paletize com travamento adequado para transporte até as revendas autorizadas.' },
      { step: 3, title: 'Apontamento do Tempo TMR', description: 'Inicie e finalize o atendimento garantindo o cumprimento do target (≤ 2h30 por carreta).' }
    ]
  },
  efc_efd: {
    title: 'DPO - Pilar Produtividade: Processo de Carregamento (EFC & EFD)',
    code: 'POP-LOG-001 (DPO Nº 1)',
    version: '1.0',
    lastUpdated: '2025-03-15',
    updatedBy: 'Armazém - Revenda Pau Brasil (Guarabira-PB)',
    objetivo: 'O objetivo deste padrão é deixar claro e evidente todas as atividades que fazem o processo de carregamento dos veículos da entrega garantindo assim que sejam realizadas da forma mais segura e produtiva possível.',
    content: 'Processo completo de preparação, montagem, conferência, fechamento e movimentação de veículos para EFC (Eficiência no Carregamento) e EFD (Eficiência no Descarregamento). Cumprimento rigoroso das premissas de segurança e RedZone.',
    safetyEPIs: ['Capacete com Jugular', 'Bota com Biqueira de Aço', 'Óculos de Proteção', 'Colete Refletivo', 'Protetor Auricular', 'Linha de Vida'],
    steps: [
      { step: 1, title: 'Liberação dos Mapas no Fast Picking', description: 'Acessar o menu de Separação > Liberar Mapas no sistema Fast Picking. Selecionar o Box e liberar os mapas para priorizar a montagem dos veículos programados.' },
      { step: 2, title: 'Montagem do Pallet por Colunas', description: 'O ajudante inicia a tarefa no Palm Top/Coletor. Deve montar o palete por colunas (e não por lastro) para otimizar a produtividade da entrega. Finalizada a montagem, envia o palete para o Box do Conferente.' },
      { step: 3, title: 'Conferência Minuciosa do Pallet', description: 'O Conferente inspeciona item por item, quantidade e qualidade. Sinalizar erros no app: Inversão (troca de produto), Falta (quantidade menor) ou Sobra (quantidade maior).' },
      { step: 4, title: 'Fechamento de Carga no Fast Picking', description: 'Após conferir todos os paletes do mapa, o Conferente realiza o fechamento no aplicativo, registrando PBRs (PBR1 e PBR2), chapatex e KM do veículo. O tempo registrado sobe para o MPD como carregamento.' },
      { step: 5, title: 'Amarração na Linha de Vida & Estacionamento', description: 'Realizar a amarração da carga na linha de vida com equipe capacitada. Deslocar o veículo com segurança da RedZone para a vaga designada no pátio.' }
    ],
    raciTable: [
      { atividade: 'Garantir todos os veículos descarregados antes das 22:00', empilhador: 'R', conferente: 'A', ajudante: '-', manobrista: '-' },
      { atividade: 'Realizar 5S e limpeza das baias seguindo cronograma', conferente: 'I', manobrista: 'R', empilhador: '-', ajudante: '-' },
      { atividade: 'Realizar liberação dos mapas do dia no FAST PICKING', conferente: 'R', ajudante: 'I', empilhador: '-', manobrista: '-' },
      { atividade: 'Realizar montagem do pallet conforme pedido no sistema', ajudante: 'R', conferente: 'A/C', empilhador: '-', manobrista: '-' },
      { atividade: 'Realizar conferência do pallet montado pelos ajudantes', conferente: 'R', ajudante: 'C', empilhador: 'I', manobrista: '-' },
      { atividade: 'Manobrar veículo para área de RedZone', manobrista: 'R', ajudante: 'I', conferente: '-', empilhador: '-' },
      { atividade: 'Colocar trava-rodas no veículo e realizar seu carregamento', empilhador: 'R', manobrista: 'R', ajudante: 'I', conferente: '-' },
      { atividade: 'Realizar fechamento de carga no FAST PICKING', conferente: 'R', empilhador: 'C', ajudante: '-', manobrista: '-' },
      { atividade: 'Manobrar veículo para sua vaga no estacionamento', manobrista: 'R', ajudante: 'I', conferente: '-', empilhador: '-' }
    ]
  },
  ressuprimento_reabastecimento: {
    title: 'Procedimento Operacional Padrão - Ressuprimento e Reabastecimento de Picking (R&R)',
    code: 'POP-LOG-010',
    version: '2.5',
    lastUpdated: '2026-07-28',
    updatedBy: 'Gestão de Picking & Armazém',
    objetivo: 'Diretrizes para abastecimento de baias de picking por empilhadeira e prevenção de buracos de estoque nas ruas de separação.',
    content: 'Diretrizes para abastecimento de baias de picking por empilhadeira e prevenção de buracos de estoque nas ruas de separação.',
    safetyEPIs: ['Cinto de Segurança de 3 Pontos', 'Protetor Auricular', 'Colete Refletivo', 'Bota de Segurança'],
    steps: [
      { step: 1, title: 'Nivelamento de Estoque Mínimo', description: 'Monitore as baias críticas antes que esvaziem para evitar paralisação dos separadores.' },
      { step: 2, title: 'Separação e Critério FEFO', description: 'Confira a validade do lote retirado no bloco central antes de alocar na baia de picking.' },
      { step: 3, title: 'Posicionamento e Confirmação', description: 'Garanta o alinhamento do palete e dê baixa no painel do empilhador.' }
    ]
  }
};

interface PadraoOperacionalProps {
  moduleKey: OperationalModuleKey;
  moduleName: string;
  isOpen: boolean;
  onClose: () => void;
  canEdit?: boolean;
  user?: Usuario | null;
}

export const PadraoOperacionalModal: React.FC<PadraoOperacionalProps> = ({
  moduleKey,
  moduleName,
  isOpen,
  onClose,
  canEdit = true,
  user
}) => {
  const isUserAdmin = useMemo(() => {
    if (user) return canUserManageSop(user);
    return canEdit;
  }, [user, canEdit]);
  const [popData, setPopData] = useState<POPDocument>(DEFAULT_POPS[moduleKey]);
  const [isEditing, setIsEditing] = useState(false);
  const [customText, setCustomText] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const safePdfBlobUrl = useMemo(() => {
    if (!popData.fileUrl) return '';
    return createSafePdfBlobUrl(popData.fileUrl);
  }, [popData.fileUrl]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`af_pop_doc_${moduleKey}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.title || parsed.fileUrl) {
          setPopData(parsed);
          return;
        }
      }

      // Check central SOPs specifically bound to this moduleKey
      const allSops = getAllSops();
      const matchingSop = allSops.find(sop => 
        sop.status === 'Ativo' && 
        Array.isArray(sop.modulosVinculados) && 
        sop.modulosVinculados.includes(moduleKey as any) &&
        sop.id !== 'sop-global-01'
      );

      if (matchingSop) {
        const firstAnexo = matchingSop.anexos?.[0];
        const mapped: POPDocument = {
          code: matchingSop.codigo,
          title: matchingSop.nome,
          version: matchingSop.revisao,
          lastUpdated: matchingSop.dataRevisao,
          updatedBy: matchingSop.responsavel,
          objetivo: matchingSop.objetivo || matchingSop.nome,
          content: matchingSop.descricao || matchingSop.objetivo,
          safetyEPIs: ['Luvas Anticorte', 'Bota com Biqueira de Aço', 'Óculos de Proteção'],
          steps: (matchingSop.passoAPasso || []).map((stepStr, i) => ({
            step: i + 1,
            title: `Passo ${i + 1}`,
            description: stepStr
          })),
          fileUrl: firstAnexo?.url,
          fileName: firstAnexo?.nome
        };
        setPopData(mapped);
        return;
      }

      setPopData(DEFAULT_POPS[moduleKey] || DEFAULT_POPS.repack);
    } catch (e) {
      console.error(e);
      setPopData(DEFAULT_POPS[moduleKey] || DEFAULT_POPS.repack);
    }
  }, [moduleKey]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    const reader = new FileReader();

    reader.onload = (event) => {
      const result = event.target?.result as string;
      const isTooLarge = result && result.length > 8000000;
      const updated: POPDocument = {
        ...popData,
        fileName: file.name,
        fileUrl: isTooLarge ? undefined : result,
        lastUpdated: new Date().toISOString().split('T')[0],
        content: `Documento de Padrão Importado: ${file.name}.\n${popData.content || ''}`
      };
      setPopData(updated);
      safeSetLocalStorage(`af_pop_doc_${moduleKey}`, JSON.stringify(updated));

      try {
        saveOrUpdateSop({
          id: `pop-doc-${moduleKey}`,
          codigo: updated.code || `POP-${moduleKey.toUpperCase()}-01`,
          nome: updated.title,
          objetivo: updated.objetivo || '',
          descricao: updated.content || '',
          passoAPasso: updated.steps ? updated.steps.map(s => `${s.step}. ${s.title}: ${s.description}`) : [],
          fotos: [],
          videos: [],
          anexos: updated.fileUrl ? [{ nome: updated.fileName || 'Documento', url: updated.fileUrl }] : [],
          revisao: updated.version ? `Rev ${updated.version}` : 'Rev 01',
          dataRevisao: updated.lastUpdated || new Date().toISOString().split('T')[0],
          responsavel: updated.updatedBy || 'Gestor Operacional',
          status: 'Ativo',
          escopo: 'exclusivo',
          modulosVinculados: [moduleKey as any],
          historicoAlteracoes: [],
          criadoEm: new Date().toISOString(),
          atualizadoEm: new Date().toISOString()
        }, 'Gestor Operacional');
      } catch (err) {
        console.error('Error syncing to central SOP store:', err);
      }

      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('af_pop_updated', { detail: { moduleKey } }));
    };

    if (file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.csv') || file.name.endsWith('.md')) {
      reader.readAsText(file);
    } else {
      reader.readAsDataURL(file);
    }
  };

  const handleSaveText = () => {
    if (!customText.trim()) return;
    const updated: POPDocument = {
      ...popData,
      content: customText,
      lastUpdated: new Date().toISOString().split('T')[0]
    };
    setPopData(updated);
    safeSetLocalStorage(`af_pop_doc_${moduleKey}`, JSON.stringify(updated));
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('af_pop_updated', { detail: { moduleKey } }));
    setIsEditing(false);
  };

  const handleResetDefault = () => {
    if (!isUserAdmin) {
      alert('Acesso restrito. Apenas administradores e supervisores podem restaurar o padrão.');
      return;
    }
    const def = DEFAULT_POPS[moduleKey];
    setPopData(def);
    localStorage.removeItem(`af_pop_doc_${moduleKey}`);
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('af_pop_updated', { detail: { moduleKey } }));
    setIsEditing(false);
    setUploadedFileName(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* HEADER */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-amber-500 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-md uppercase tracking-wider">
                  {popData.code}
                </span>
                <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">
                  v{popData.version}
                </span>
              </div>
              <h2 className="text-sm font-black uppercase tracking-wide text-white mt-0.5">
                Padrão Operacional - {moduleName}
              </h2>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 dark:text-slate-100">
          
          {/* BANNER DE AÇÕES DO PDF PARA O OPERACIONAL */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-4 rounded-xl border border-blue-500/30 flex flex-wrap items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-400/30">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-wide text-blue-200 block">
                  Documento do Padrão Operacional em PDF
                </span>
                <span className="text-[11px] text-slate-300 block">
                  Acesse ou baixe o documento em PDF oficial do padrão operacional do setor.
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => openOrDownloadGeneratedSopPdf(popData, false)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <Eye className="w-4 h-4" />
                <span>Visualizar PDF</span>
              </button>

              <button
                type="button"
                onClick={() => openOrDownloadGeneratedSopPdf(popData, true)}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Baixar PDF</span>
              </button>

              {isUserAdmin && (
                <label className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-sm">
                  <Upload className="w-4 h-4" />
                  <span>Importar Padrão (PDF)</span>
                  <input 
                    type="file" 
                    accept=".pdf,.doc,.docx,.txt,.csv,.png,.jpg"
                    onChange={handleFileUpload}
                    className="hidden" 
                  />
                </label>
              )}
            </div>
          </div>

          {/* OBJETIVO DO PROCESSO BANNER */}
          {popData.objetivo && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl p-4 shadow-xs">
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-black text-xs uppercase tracking-wider mb-1">
                <Target className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Objetivo do Processo</span>
              </div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                {popData.objetivo}
              </p>
            </div>
          )}

          {/* TOP SUMMARY BAR */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-tight">
                {popData.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {popData.content}
              </p>
            </div>

            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase">
              <Info className="w-3.5 h-3.5 text-amber-500" />
              <span>Última atualização: {popData.lastUpdated}</span>
            </div>
          </div>

          {/* MATRIZ RACI IF AVAILABLE */}
          {popData.raciTable && popData.raciTable.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase text-purple-700 dark:text-purple-300 tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-purple-600" />
                Matriz RACI do Processo (Responsabilidades e Papéis)
              </h4>

              <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/80">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 text-[10px] uppercase">
                      <th className="p-2.5 min-w-[220px]">Atividade / Etapa</th>
                      {popData.raciTable[0].god !== undefined && <th className="p-2 text-center w-12">GOD</th>}
                      {popData.raciTable[0].coa !== undefined && <th className="p-2 text-center w-12">COA</th>}
                      {popData.raciTable[0].tst !== undefined && <th className="p-2 text-center w-12">TST</th>}
                      {popData.raciTable[0].analista !== undefined && <th className="p-2 text-center w-12 text-blue-600 dark:text-blue-400">Analista</th>}
                      {popData.raciTable[0].conferente !== undefined && <th className="p-2 text-center w-12">Conf.</th>}
                      {popData.raciTable[0].empilhador !== undefined && <th className="p-2 text-center w-12">Empilh.</th>}
                      {popData.raciTable[0].ajudante !== undefined && <th className="p-2 text-center w-12">Ajud.</th>}
                      {popData.raciTable[0].manobrista !== undefined && <th className="p-2 text-center w-12">Manob.</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium text-[11px]">
                    {popData.raciTable.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                        <td className="p-2.5 text-slate-800 dark:text-slate-200">{row.atividade}</td>
                        {row.god !== undefined && <td className="p-2 text-center font-bold text-slate-700 dark:text-slate-300">{row.god}</td>}
                        {row.coa !== undefined && <td className="p-2 text-center font-bold text-slate-700 dark:text-slate-300">{row.coa}</td>}
                        {row.tst !== undefined && <td className="p-2 text-center font-bold text-slate-700 dark:text-slate-300">{row.tst}</td>}
                        {row.analista !== undefined && <td className="p-2 text-center font-bold text-blue-600 dark:text-blue-400">{row.analista}</td>}
                        {row.conferente !== undefined && <td className="p-2 text-center font-bold text-emerald-600 dark:text-emerald-400">{row.conferente}</td>}
                        {row.empilhador !== undefined && <td className="p-2 text-center font-bold text-amber-600 dark:text-amber-400">{row.empilhador}</td>}
                        {row.ajudante !== undefined && <td className="p-2 text-center font-bold text-indigo-600 dark:text-indigo-400">{row.ajudante}</td>}
                        {row.manobrista !== undefined && <td className="p-2 text-center font-bold text-purple-600 dark:text-purple-400">{row.manobrista}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-slate-500 font-bold uppercase pt-1">
                <span className="text-emerald-600 dark:text-emerald-400">R: Responsável</span>
                <span className="text-blue-600 dark:text-blue-400">A: Aprovador</span>
                <span className="text-amber-600 dark:text-amber-400">C: Consultado</span>
                <span className="text-slate-400">I: Informado</span>
              </div>
            </div>
          )}

          {/* SAFETY EPIs */}
          <div>
            <h4 className="text-xs font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider flex items-center gap-1.5 mb-2.5">
              <ShieldCheck className="w-4 h-4" />
              Equipamentos de Proteção Obrigatórios (EPIs)
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {popData.safetyEPIs.map((epi, idx) => (
                <div key={idx} className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 rounded-lg p-2.5 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight">
                    {epi}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* STEP BY STEP PROCEDURE */}
          <div>
            <h4 className="text-xs font-black uppercase text-slate-700 dark:text-slate-200 tracking-wider flex items-center gap-1.5 mb-3">
              <FileText className="w-4 h-4 text-blue-500" />
              Passo a Passo Operacional Padrão
            </h4>

            <div className="space-y-3">
              {popData.steps.map((item) => (
                <div key={item.step} className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 flex gap-3 shadow-xs">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                    {item.step}
                  </div>
                  <div>
                    <h5 className="font-bold text-xs uppercase text-slate-900 dark:text-white">
                      {item.title}
                    </h5>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* UPLOADED FILE PREVIEW IF AVAILABLE */}
          {popData.fileName && (
            <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-blue-900 dark:text-blue-200 block">
                      Documento Oficial Anexo: {popData.fileName}
                    </span>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium block">
                      Padrão de trabalho oficial importado para a operação
                    </span>
                  </div>
                </div>

                {popData.fileUrl && (
                  <div className="flex items-center gap-2">
                    <button 
                      type="button"
                      onClick={() => openPdfInNewTab(popData.fileUrl!, popData.fileName || 'Padrao_Operacional.pdf')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Visualizar
                    </button>
                    <button 
                      type="button"
                      onClick={() => downloadPdfFile(popData.fileUrl!, popData.fileName || 'Padrao_Operacional.pdf')}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Baixar
                    </button>
                  </div>
                )}
              </div>

              {popData.fileUrl && (popData.fileUrl.startsWith('data:application/pdf') || (popData.fileName && popData.fileName.toLowerCase().endsWith('.pdf'))) && (
                <div className="mt-2 rounded-xl border border-blue-200 dark:border-blue-800 overflow-hidden bg-white dark:bg-slate-900 h-[450px]">
                  <object 
                    data={safePdfBlobUrl} 
                    type="application/pdf" 
                    className="w-full h-full"
                  >
                    <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-3 bg-slate-50 dark:bg-slate-800">
                      <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl">
                        <FileText className="w-10 h-10" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-100">
                          Documento Oficial Anexado: {popData.fileName}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                          Clique abaixo para visualizar o PDF completo em alta resolução ou realizar o download sem restrições do navegador.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => openPdfInNewTab(popData.fileUrl!, popData.fileName || 'Padrao_Operacional.pdf')}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Abrir PDF em Tela Cheia (Nova Aba)
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadPdfFile(popData.fileUrl!, popData.fileName || 'Padrao_Operacional.pdf')}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                          Baixar PDF
                        </button>
                      </div>
                    </div>
                  </object>
                </div>
              )}
            </div>
          )}

          {/* EDIT & IMPORT SECTION */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">
                Importar ou Atualizar Padrão Operacional (PDF / Documento)
              </h4>

              {isUserAdmin && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setCustomText(popData.content);
                      setIsEditing(!isEditing);
                    }}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold rounded-lg uppercase transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    {isEditing ? 'Cancelar Edição' : 'Editar Texto'}
                  </button>

                  <button
                    onClick={handleResetDefault}
                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-[10px] font-bold rounded-lg uppercase transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Restaurar Padrão
                  </button>
                </div>
              )}
            </div>

            {isEditing && isUserAdmin && (
              <div className="space-y-2">
                <textarea
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  rows={4}
                  placeholder="Digite as instruções e detalhamento do procedimento operacional..."
                  className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-sans"
                />
                <button
                  onClick={handleSaveText}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Salvar Alterações do Padrão
                </button>
              </div>
            )}

            {/* IMPORT FILE DROPZONE FOR OPERATIONAL & ADMINS */}
            <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-amber-500 dark:hover:border-amber-400 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group">
              <Upload className="w-6 h-6 text-slate-400 group-hover:text-amber-500 transition-colors" />
              <div className="text-center">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
                  Importar Arquivo do Padrão Operacional (PDF, DOC, TXT)
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Selecione o documento oficial para disponibilizar ao ajudante, operador de empilhadeira e conferente
                </span>
              </div>
              <input 
                type="file" 
                accept=".pdf,.doc,.docx,.txt,.csv,.png,.jpg"
                onChange={handleFileUpload}
                className="hidden" 
              />
            </label>
          </div>

        </div>

        {/* FOOTER */}
        <div className="px-6 py-3.5 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-[10px] text-slate-500 font-semibold uppercase">
          <span>SISTEMA DE QUALIDADE & SEGURANÇA AMBEV</span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white font-extrabold text-xs rounded-xl uppercase tracking-wider transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>

      </div>
    </div>
  );
};

export default PadraoOperacionalModal;
