import { jsPDF } from 'jspdf';

export interface Item5SOfficial {
  id: number;
  senso: 'Seleção' | 'Organização' | 'Limpeza' | 'Padronização' | 'Auto-Disciplir';
  checkItem: string;
  descricao: string;
}

export const CHECKLIST_5S_OFFICIAL_ITEMS: Item5SOfficial[] = [
  // SELEÇÃO (1 a 7)
  { id: 1, senso: 'Seleção', checkItem: 'Tráfego', descricao: 'Há elementos desnecessários na área que atrapalham o tráfego?' },
  { id: 2, senso: 'Seleção', checkItem: 'Materiais', descricao: 'Há algum material desnecessário?' },
  { id: 3, senso: 'Seleção', checkItem: 'Ferramentas e Equipamentos', descricao: 'Há algum equipamento quebrado? Ex.: Empilhadeira' },
  { id: 4, senso: 'Seleção', checkItem: 'Identificação', descricao: 'Em caso de equipamentos quebrados/itens desnecessários no local, eles estão delimitados e bloqueados?' },
  { id: 5, senso: 'Seleção', checkItem: 'Condições Gerais', descricao: 'Existe produto quebrado fora de sua caixa de quebra?\nExistem paletes fora dos setores atribuídos?' },
  { id: 6, senso: 'Seleção', checkItem: 'Elementos Pessoais', descricao: 'Os elementos pessoais estão nos locais definidos (roupas, EPI, etc.)?' },
  { id: 7, senso: 'Seleção', checkItem: 'Informação', descricao: 'A área tem Padrões desatualizados?' },

  // ORGANIZAÇÃO (8 a 13)
  { id: 8, senso: 'Organização', checkItem: 'Layout', descricao: 'Existe um Layout claro que mostre cada sub área, equipamento, produtos, ferramentas, etc?' },
  { id: 9, senso: 'Organização', checkItem: 'Faixa de Pedestres', descricao: 'Faixa de pedestres, equipamentos e outros locais importantes estão claramente delimitados?' },
  { id: 10, senso: 'Organização', checkItem: 'Gestão à Vista', descricao: 'Existe no local Gestão a Vista de 5S, Padrão e outras informações úteis para a gestão 5S?' },
  { id: 11, senso: 'Organização', checkItem: 'Armazenamento', descricao: 'A área tem caixas e recipientes para colocar resíduos e subprodutos adequadamente padronizados?' },
  { id: 12, senso: 'Organização', checkItem: 'Kit Ferramenta de Limpeza', descricao: 'A área definiu uma padronização do kit de limpeza? (manutenção / reparações). Todos os produtos químicos são identificados' },
  { id: 13, senso: 'Organização', checkItem: 'Posição', descricao: 'O layout padrão está mantido?\nCheckpoint: Verifique LayOut real vs LayOut padronizado (equipamentos, produtos, caixas, prateleiras identificadas, etc)' },

  // LIMPEZA (14 a 17)
  { id: 14, senso: 'Limpeza', checkItem: 'Chão', descricao: 'O chão está limpo? Verifique o cronograma de limpeza (Plano vs cumprimento)' },
  { id: 15, senso: 'Limpeza', checkItem: 'Paredes/Telhados', descricao: 'As paredes e o telhado estão limpos? (sem teia de aranha)' },
  { id: 16, senso: 'Limpeza', checkItem: 'Janela', descricao: 'As janelas estão limpas? Verifique os vidros quebrados e outras questões' },
  { id: 17, senso: 'Limpeza', checkItem: 'Jardinagem/Área Externa', descricao: 'As áreas verdes estão com gramado conservado e as áreas concretadas livres de vegetação e entulhos' },

  // PADRONIZAÇÃO (18 a 20)
  { id: 18, senso: 'Padronização', checkItem: 'Padrão', descricao: 'O dono de cada área está definido e divulgado?' },
  { id: 19, senso: 'Padronização', checkItem: 'Acompanhamento', descricao: 'Existe um Plano de Ação para melhorar os resultados do 5S?' },
  { id: 20, senso: 'Padronização', checkItem: '3S', descricao: 'A área tem uma rotina de limpeza detalhada, com papéis e responsabilidades definidas, em uma frequência diária, semanal e mensal? (Cronograma de Limpeza, Retirada de Caçambas, Controle de Pragas, etc)' },

  // AUTO-DISCIPLINA (21 a 25)
  { id: 21, senso: 'Auto-Disciplir', checkItem: '5S Monitoramento', descricao: 'As áreas possuem rotina mensal de auditoria?' },
  { id: 22, senso: 'Auto-Disciplir', checkItem: 'Auditoria', descricao: 'Há um plano de ação das auditorias de 5s? Os resultados estão acima de 85%?' },
  { id: 23, senso: 'Auto-Disciplir', checkItem: 'Gestão a Vista', descricao: 'Os quadros de gestão a vista de 5S estão atualizados?' },
  { id: 24, senso: 'Auto-Disciplir', checkItem: 'Evolução', descricao: 'Há um plano de ação para resolver os problemas de 5S da área?' },
  { id: 25, senso: 'Auto-Disciplir', checkItem: 'Evolução', descricao: 'A área pode mostrar evolução nos resultados de 5S?' }
];

export interface ExportChecklist5SOptions {
  auditor?: string;
  auditado?: string;
  areaAuditada?: string;
  dataStr?: string;
  scores?: Record<number, number>; // 1 = OK, 0 = NOK
  pontuacaoTotal?: number;
  pontuacaoPercentual?: number;
}

export function exportChecklist5SOfficialPdf(options?: ExportChecklist5SOptions) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const margin = 10;
  const contentWidth = pageWidth - (margin * 2); // 190mm

  // CABEÇALHO SUPERIOR (5S Logo + PAUBRASIL + DPO)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(200, 150, 0); // Dourado
  doc.text('5s', margin + 8, 16);

  doc.setFontSize(7);
  doc.setTextColor(60, 60, 60);
  doc.setFont('helvetica', 'italic');
  doc.text('Uma dose de BOM SENSO', margin + 2, 20);
  doc.text('em tudo o que a gente faz', margin + 2, 23);

  // Título Central
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(20, 30, 60);
  doc.text('Checklist 5S - Armazém', 85, 14);

  // Logo PAUBRASIL
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 60, 140);
  doc.text('PAUBRASIL', pageWidth - margin - 35, 13);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text('distribuidora ambev', pageWidth - margin - 35, 16);

  // Logo DPO
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bolditalic');
  doc.setTextColor(180, 20, 20);
  doc.text('DPO', pageWidth - margin - 40, 28);
  doc.setFontSize(5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('DISTRIBUTION PROCESS OPTIMISATION', pageWidth - margin - 58, 31);

  // Linhas de dados do cabeçalho
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);

  doc.text(`Auditor: ${options?.auditor || '____________________________________________________'}`, 60, 20);
  doc.text(`Auditado: ${options?.auditado || '____________________________________________________'}`, 60, 24);
  doc.text(`Área auditada: ${options?.areaAuditada || '____________________________________________________'}`, 60, 28);

  // Data no cabeçalho da coluna direita
  const dataLabel = options?.dataStr || new Date().toLocaleDateString('pt-BR');

  // TABELA PRINCIPAL
  const colSensW = 12;
  const colNumW = 8;
  const colCheckItemW = 35;
  const colDescW = 117;
  const colScoreW = 18;

  let currentY = 34;

  // Header da tabela
  doc.setFillColor(235, 235, 235);
  doc.rect(margin, currentY, contentWidth, 7, 'F');
  doc.rect(margin, currentY, contentWidth, 7, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(20, 20, 20);

  doc.text('Nº', margin + colSensW + 2, currentY + 4.5);
  doc.text('Check item', margin + colSensW + colNumW + 2, currentY + 4.5);
  doc.text('Descrição', margin + colSensW + colNumW + colCheckItemW + 2, currentY + 4.5);

  // Caixa de Data à direita
  doc.text('Data', margin + contentWidth - colScoreW + 3, currentY + 3.5);
  doc.setFontSize(6.5);
  doc.text(dataLabel, margin + contentWidth - colScoreW + 1, currentY + 6);

  currentY += 7;

  // Agrupamento por Senso para mesclar a coluna lateral
  const sensos = [
    { name: 'Seleção', items: CHECKLIST_5S_OFFICIAL_ITEMS.filter(i => i.senso === 'Seleção') },
    { name: 'Organização', items: CHECKLIST_5S_OFFICIAL_ITEMS.filter(i => i.senso === 'Organização') },
    { name: 'Limpeza', items: CHECKLIST_5S_OFFICIAL_ITEMS.filter(i => i.senso === 'Limpeza') },
    { name: 'Padronização', items: CHECKLIST_5S_OFFICIAL_ITEMS.filter(i => i.senso === 'Padronização') },
    { name: 'Auto-Disciplir', nameDisplay: 'Auto-Disciplir', items: CHECKLIST_5S_OFFICIAL_ITEMS.filter(i => i.senso === 'Auto-Disciplir') },
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);

  sensos.forEach(sensoGroup => {
    const startSensoY = currentY;

    sensoGroup.items.forEach(item => {
      // Calcular altura dinâmica da linha baseado no texto da descrição
      const descLines = doc.splitTextToSize(item.descricao, colDescW - 3);
      const rowHeight = Math.max(7.5, (descLines.length * 2.8) + 2.5);

      // Bordas da linha
      doc.setDrawColor(180, 180, 180);
      doc.rect(margin + colSensW, currentY, colNumW, rowHeight);
      doc.rect(margin + colSensW + colNumW, currentY, colCheckItemW, rowHeight);
      doc.rect(margin + colSensW + colNumW + colCheckItemW, currentY, colDescW, rowHeight);
      doc.rect(margin + contentWidth - colScoreW, currentY, colScoreW, rowHeight);

      // Textos
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 30, 30);
      doc.text(String(item.id), margin + colSensW + (colNumW / 2) - 1, currentY + 4.5);

      doc.setFont('helvetica', 'bold');
      doc.text(item.checkItem, margin + colSensW + colNumW + 1.5, currentY + 4.5);

      doc.setFont('helvetica', 'normal');
      doc.text(descLines, margin + colSensW + colNumW + colCheckItemW + 1.5, currentY + 3.8);

      // Se houver score
      if (options?.scores && options.scores[item.id] !== undefined) {
        const sc = options.scores[item.id];
        doc.setFont('helvetica', 'bold');
        if (sc === 1) {
          doc.setTextColor(20, 140, 40); // Verde OK
          doc.text('1 (OK)', margin + contentWidth - colScoreW + 4, currentY + 4.5);
        } else {
          doc.setTextColor(200, 20, 20); // Vermelho NOK
          doc.text('0 (NOK)', margin + contentWidth - colScoreW + 3, currentY + 4.5);
        }
      }

      currentY += rowHeight;
    });

    const totalSensoHeight = currentY - startSensoY;

    // Coluna do Senso Lateral com texto vertical ou centrado
    doc.rect(margin, startSensoY, colSensW, totalSensoHeight);
    doc.saveGraphicsState();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(40, 40, 40);
    
    // Desenha texto rotacionado no bloco lateral do senso
    const midY = startSensoY + (totalSensoHeight / 2);
    const labelSenso = sensoGroup.nameDisplay || sensoGroup.name;
    
    // Transformação para texto vertical centralizado
    doc.text(labelSenso, margin + 4, midY + (labelSenso.length * 1.2), { angle: 90 });
    doc.restoreGraphicsState();
  });

  // RODAPÉ COM ASSINATURAS E PONTUAÇÃO
  currentY += 6;

  // Linhas de Assinatura
  doc.setDrawColor(60, 60, 60);
  doc.line(margin + 15, currentY + 8, margin + 70, currentY + 8);
  doc.line(margin + 115, currentY + 8, margin + 170, currentY + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 30, 30);
  doc.text('Ass. Auditor', margin + 33, currentY + 12);
  doc.text('Ass. Auditado', margin + 133, currentY + 12);

  currentY += 16;

  // Legenda 0 = NOK, 1 = OK
  doc.setFillColor(235, 40, 40);
  doc.rect(margin + 5, currentY, 5, 5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('0', margin + 6.5, currentY + 3.8);

  doc.setTextColor(30, 30, 30);
  doc.text('= NOK', margin + 12, currentY + 3.8);

  doc.setFillColor(40, 160, 40);
  doc.rect(margin + 5, currentY + 6, 5, 5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text('1', margin + 6.5, currentY + 9.8);

  doc.setTextColor(30, 30, 30);
  doc.text('= OK', margin + 12, currentY + 9.8);

  // Pontuação Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 20);
  doc.text('Pontuação:', margin + 85, currentY + 6);
  
  if (options?.pontuacaoPercentual !== undefined) {
    doc.setFontSize(11);
    doc.setTextColor(20, 60, 140);
    doc.text(`${options.pontuacaoTotal || 0} / 25 (${options.pontuacaoPercentual}%)`, margin + 110, currentY + 6);
  } else {
    doc.line(margin + 108, currentY + 7, margin + 150, currentY + 7);
  }

  // Baixar PDF
  const filename = `Checklist_5S_Armazem_${(options?.areaAuditada || 'Guarabira').replace(/\s+/g, '_')}_${(options?.dataStr || 'manual').replace(/\//g, '-')}.pdf`;
  doc.save(filename);
}
