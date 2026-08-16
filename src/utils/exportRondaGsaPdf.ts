import { jsPDF } from 'jspdf';
import { QUESTOES_RONDA_GSA, NivelAvaliacao } from '../components/RondaGsaComponent';

export interface ExportRondaGsaOptions {
  auditorNome?: string;
  colaboradorAuditado?: string;
  localAuditado?: string;
  dataStr?: string;
  respostas?: Record<number, NivelAvaliacao>;
  observacoes?: Record<number, string>;
  pontosPercentual?: number;
  pontuacaoPercentual?: number;
  statusPontuacao?: string;
}

export function exportRondaGsaManualPdf(options?: ExportRondaGsaOptions) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const margin = 10;
  const contentWidth = pageWidth - (margin * 2); // 190mm

  // CABEÇALHO
  doc.setFillColor(15, 23, 42); // Navy Dark
  doc.rect(margin, 8, contentWidth, 20, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text('RONDA DE QUALIDADE SEMANAL - GSA (34 ITENS)', margin + 5, 16);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('DPO Qualidade & Armazém • Avaliação de Padrões Operacionais e Boas Práticas', margin + 5, 22);

  if (options?.pontuacaoPercentual !== undefined) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(250, 204, 21);
    doc.text(`${options.pontuacaoPercentual}% - ${options.statusPontuacao || ''}`, pageWidth - margin - 50, 18);
  }

  // DADOS DA AUDITORIA
  let currentY = 32;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 30, 30);

  doc.text(`Data: ${options?.dataStr || '_____/_____/________'}`, margin + 2, currentY);
  doc.text(`Local / Setor: ${options?.localAuditado || '_____________________________________'}`, margin + 45, currentY);
  doc.text(`Colaborador: ${options?.colaboradorAuditado || '_____________________________________'}`, margin + 115, currentY);
  
  currentY += 5;
  doc.text(`Auditor Responsável: ${options?.auditorNome || '_____________________________________'}`, margin + 2, currentY);

  currentY += 5;

  // TABELA DAS 34 QUESTÕES
  const colNumW = 8;
  const colPerguntaW = 120;
  const colNivelW = 62;

  // Header Tabela
  doc.setFillColor(226, 232, 240);
  doc.rect(margin, currentY, contentWidth, 6, 'F');
  doc.rect(margin, currentY, contentWidth, 6, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);

  doc.text('Nº', margin + 2, currentY + 4);
  doc.text('Item / Pergunta de Qualidade Operacional', margin + colNumW + 2, currentY + 4);
  doc.text('Avaliação (Exc. / Bom / Raz. / Ruim)', margin + colNumW + colPerguntaW + 2, currentY + 4);

  currentY += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);

  QUESTOES_RONDA_GSA.forEach((q) => {
    // Quebra de página caso passe da página 1 (34 itens cabem em 2 páginas ou 1 página compacta)
    if (currentY > 275) {
      doc.addPage();
      currentY = 12;

      // Header na página seguinte
      doc.setFillColor(226, 232, 240);
      doc.rect(margin, currentY, contentWidth, 6, 'F');
      doc.rect(margin, currentY, contentWidth, 6, 'S');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text('Nº', margin + 2, currentY + 4);
      doc.text('Item / Pergunta de Qualidade Operacional (Cont.)', margin + colNumW + 2, currentY + 4);
      doc.text('Avaliação (Exc. / Bom / Raz. / Ruim)', margin + colNumW + colPerguntaW + 2, currentY + 4);
      currentY += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);
    }

    const rowH = 6.8;
    doc.setDrawColor(203, 213, 225);
    doc.rect(margin, currentY, colNumW, rowH);
    doc.rect(margin + colNumW, currentY, colPerguntaW, rowH);
    doc.rect(margin + colNumW + colPerguntaW, currentY, colNivelW, rowH);

    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.text(String(q.id), margin + 2.5, currentY + 4.5);

    doc.setFont('helvetica', 'normal');
    const splitText = doc.splitTextToSize(q.pergunta, colPerguntaW - 4);
    doc.text(splitText, margin + colNumW + 2, currentY + 3.5);

    // Se tiver resposta preenchida
    const resp = options?.respostas ? options.respostas[q.id] : undefined;
    if (resp) {
      doc.setFont('helvetica', 'bold');
      if (resp === 'excelente') {
        doc.setTextColor(37, 99, 235);
        doc.text('[X] EXCELENTE', margin + colNumW + colPerguntaW + 2, currentY + 4.5);
      } else if (resp === 'bom') {
        doc.setTextColor(16, 185, 129);
        doc.text('[X] BOM', margin + colNumW + colPerguntaW + 2, currentY + 4.5);
      } else if (resp === 'razoavel') {
        doc.setTextColor(217, 119, 6);
        doc.text('[X] RAZOÁVEL', margin + colNumW + colPerguntaW + 2, currentY + 4.5);
      } else {
        doc.setTextColor(225, 29, 72);
        doc.text('[X] RUIM', margin + colNumW + colPerguntaW + 2, currentY + 4.5);
      }
    } else {
      // Checkboxes manuais para impressão
      doc.setTextColor(100, 116, 139);
      doc.text('( ) Exc   ( ) Bom   ( ) Raz   ( ) Ruim', margin + colNumW + colPerguntaW + 3, currentY + 4.5);
    }

    currentY += rowH;
  });

  // ASSINATURAS NO FINAL
  currentY += 8;
  if (currentY > 265) {
    doc.addPage();
    currentY = 20;
  }

  doc.setDrawColor(71, 85, 105);
  doc.line(margin + 15, currentY + 10, margin + 75, currentY + 10);
  doc.line(margin + 115, currentY + 10, margin + 175, currentY + 10);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('Assinatura do Auditor (Controle / Gestão)', margin + 20, currentY + 14);
  doc.text('Assinatura do Colaborador / Responsável', margin + 120, currentY + 14);

  const filename = `Ronda_Qualidade_GSA_34_Itens_${(options?.dataStr || 'Manual').replace(/\//g, '-')}.pdf`;
  doc.save(filename);
}
