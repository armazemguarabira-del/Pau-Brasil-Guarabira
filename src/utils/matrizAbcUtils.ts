import { calcularPoliticaEstoque } from './estoqueStorage';
import { PRODUCTS } from '../planosData';
import { getProductMeta } from './productCatalogData';

export interface MatrizAbcItem {
  // Identificação
  codigo: number;
  descricao: string;
  grupo: string;
  familia: string;
  marca: string;
  embalagem: string;
  unidadeVenda: string;
  fator: number;
  fatorHecto: number;
  precoUnitario: number;

  // Movimentação
  vendaQtdCx: number;
  vendaValorRS: number;
  vendaVolumeHl: number;
  vendaDiariaCx: number;
  percentVendaValor: number;
  percentAcumuladoVendaValor: number;
  curvaAbcValor: 'A' | 'B' | 'C';
  percentVendaVolume: number;
  percentAcumuladoVendaVolume: number;
  curvaAbcVolume: 'A' | 'B' | 'C';

  // Estoque
  estoqueAtualCx: number;
  estoqueSkuFechado: number;
  estoqueUnidadeAvulsa: number;
  estoqueMedioCx: number;
  estoqueValorRS: number;
  percentEstoqueValor: number;
  percentAcumuladoEstoqueValor: number;
  curvaAbcEstoque: 'A' | 'B' | 'C';
  giroEstoque: number; // Rotatividade
  coberturaDias: number;

  // Operação
  qtdPickingCx: number;
  freqPicking: number;
  qtdReabastecimentos: number;
  freqReabastecimento: number;
  scoreImpactoOperacional: number;
  percentOperacional: number;
  percentAcumuladoOperacional: number;
  curvaAbcOperacional: 'A' | 'B' | 'C';

  // Qualidade e Perdas
  qtdQuebras: number;
  valorQuebrasRS: number;
  percentQuebra: number;
  shelfLifeDias: number;
  statusFefo: 'Ok' | 'Atencao' | 'Critico' | 'Vencido' | 'SemRegistro';
  diasParaVencimentoMin: number;
  riscoVencimento: 'Baixo' | 'Medio' | 'Alto' | 'Critico';

  // Classificação e Diagnóstico Final
  criticidade: 'Baixa' | 'Média' | 'Alta' | 'Crítica';
  diagnosticoFinal: string;
}

export interface MatrizAbcKPIs {
  totalSkus: number;
  skusClasseA: number;
  skusClasseB: number;
  skusClasseC: number;
  percentFaturamentoClasseA: number;
  valorTotalEstoque: number;
  valorEstoqueClasseA: number;
  giroMedioEstoque: number;
  coberturaMediaDias: number;
  totalMovimentacoesOperacionais: number;
  totalReabastecimentos: number;
  valorTotalQuebras: number;
  skusRiscoVencimento: number;
}

export function calcularMatrizAbcLogistica(empresaId: string = 'demo'): MatrizAbcItem[] {
  const politicaEstoque = calcularPoliticaEstoque();

  // Carregar dados de quebras
  let quebrasData: any[] = [];
  try {
    const rawQuebras = localStorage.getItem(`quebras_${empresaId}`);
    if (rawQuebras) quebrasData = JSON.parse(rawQuebras);
  } catch (e) {
    console.error('Erro ao ler dados de quebras:', e);
  }

  // Carregar dados de validades
  let validadesData: any[] = [];
  try {
    const rawValidades = localStorage.getItem(`validades_${empresaId}`);
    if (rawValidades) validadesData = JSON.parse(rawValidades);
  } catch (e) {
    console.error('Erro ao ler dados de validades:', e);
  }

  // Mapas auxiliares para quebras
  const mapQuebras = new Map<number, { qtd: number; valor: number }>();
  quebrasData.forEach(q => {
    const cod = Number(q.codProduto || q.codSku || q.codigo || 0);
    if (cod > 0) {
      const current = mapQuebras.get(cod) || { qtd: 0, valor: 0 };
      const qtdAdd = Number(q.quantidade || q.qtd || 1);
      const valorAdd = Number(q.valorTotal || q.valor || 0);
      mapQuebras.set(cod, {
        qtd: current.qtd + qtdAdd,
        valor: current.valor + (valorAdd > 0 ? valorAdd : qtdAdd * 25)
      });
    }
  });

  // Mapas auxiliares para validades
  const mapValidades = new Map<number, { diasMin: number; status: string; totalQtd: number }>();
  const hojeMs = new Date().getTime();
  validadesData.forEach(v => {
    const cod = Number(v.codigo || v.codProduto || 0);
    if (cod > 0) {
      let diasRemaining = 180;
      if (v.validade) {
        const valDate = new Date(v.validade).getTime();
        if (!isNaN(valDate)) {
          diasRemaining = Math.max(0, Math.floor((valDate - hojeMs) / (1000 * 60 * 60 * 24)));
        }
      }
      const existing = mapValidades.get(cod);
      const currentMin = existing ? Math.min(existing.diasMin, diasRemaining) : diasRemaining;
      const totalQtd = (existing ? existing.totalQtd : 0) + Number(v.quantidade || 0);

      let statusStr = 'Ok';
      if (currentMin <= 0) statusStr = 'Vencido';
      else if (currentMin <= 15) statusStr = 'Critico';
      else if (currentMin <= 45) statusStr = 'Atencao';

      mapValidades.set(cod, { diasMin: currentMin, status: statusStr, totalQtd });
    }
  });

  // 1. Iniciar mapeamento preliminar de cada SKU
  const rawList: Omit<
    MatrizAbcItem,
    | 'percentVendaValor'
    | 'percentAcumuladoVendaValor'
    | 'curvaAbcValor'
    | 'percentVendaVolume'
    | 'percentAcumuladoVendaVolume'
    | 'curvaAbcVolume'
    | 'percentEstoqueValor'
    | 'percentAcumuladoEstoqueValor'
    | 'curvaAbcEstoque'
    | 'percentOperacional'
    | 'percentAcumuladoOperacional'
    | 'curvaAbcOperacional'
    | 'criticidade'
    | 'diagnosticoFinal'
  >[] = politicaEstoque.map(p => {
    const cod = Number(p.codigo);
    const catalogItem = PRODUCTS.find(prod => Number(prod.codigo) === cod);
    const meta = getProductMeta(cod);

    const fator = catalogItem?.fator || meta.fator || 12;
    const fatorHecto = meta.fatorHecto || catalogItem?.fatorHecto || 0.04;
    const precoUnitario = catalogItem?.preco || meta.preco || p.precoUnitario || 25;

    const vendaDiariaCx = p.vendaMediaDiaria || 0;
    const vendaQtdCx = Math.round(vendaDiariaCx * 30);
    const vendaValorRS = vendaQtdCx * precoUnitario;
    const vendaVolumeHl = vendaQtdCx * fatorHecto;

    const estoqueSkuFechado = p.qtdSkuFechado ?? p.estoqueAtualTotal;
    const estoqueUnidadeAvulsa = p.qtdUnidadeAvulsa ?? 0;
    const estoqueAtualCx = p.estoqueAtualTotal;
    const estoqueValorRS = (estoqueSkuFechado * precoUnitario) + (estoqueUnidadeAvulsa * (precoUnitario / (fator || 12)));
    const estoqueMedioCx = Math.round((estoqueAtualCx + (p.estoqueIdeal || estoqueAtualCx)) / 2);

    const giroEstoque = vendaDiariaCx > 0 ? parseFloat(((vendaDiariaCx * 30) / Math.max(1, estoqueAtualCx)).toFixed(2)) : 0;
    const coberturaDias = p.coberturaDias || (vendaDiariaCx > 0 ? parseFloat((estoqueAtualCx / vendaDiariaCx).toFixed(1)) : 0);

    // Operação
    const qtdPickingCx = p.estoquePicking || Math.round(estoqueAtualCx * 0.2);
    const freqPicking = Math.max(1, Math.round(vendaDiariaCx * 1.5));
    const qtdReabastecimentos = Math.max(0, Math.floor(vendaQtdCx / Math.max(1, p.estoquePicking || 10)));
    const freqReabastecimento = Math.max(0, Math.round(qtdReabastecimentos * 1.2));
    const scoreImpactoOperacional = Math.round(vendaQtdCx + (freqPicking * 10) + (qtdReabastecimentos * 25));

    // Quebras
    const qData = mapQuebras.get(cod) || { qtd: 0, valor: 0 };
    const qtdQuebras = qData.qtd;
    const valorQuebrasRS = qData.valor;
    const percentQuebra = vendaValorRS > 0 ? parseFloat(((valorQuebrasRS / vendaValorRS) * 100).toFixed(2)) : 0;

    // FEFO / Validades
    const vData = mapValidades.get(cod);
    const shelfLifeDias = 180;
    const diasParaVencimentoMin = vData ? vData.diasMin : 120;
    const statusFefo: MatrizAbcItem['statusFefo'] = vData ? (vData.status as any) : 'SemRegistro';

    let riscoVencimento: MatrizAbcItem['riscoVencimento'] = 'Baixo';
    if (diasParaVencimentoMin <= 0) riscoVencimento = 'Critico';
    else if (diasParaVencimentoMin <= 20 && estoqueAtualCx > 0) riscoVencimento = 'Alto';
    else if (diasParaVencimentoMin <= 45 && estoqueAtualCx > 0) riscoVencimento = 'Medio';

    return {
      codigo: cod,
      descricao: p.produto || `Produto ${cod}`,
      grupo: meta.grupo || p.grupo || 'CERVEJA',
      familia: p.familia || 'CERVEJA',
      marca: p.marca || 'AMBEV',
      embalagem: (fator === 12 ? 'Lata/SH' : 'Garrafa/CX'),
      unidadeVenda: 'CX',
      fator,
      fatorHecto,
      precoUnitario,
      vendaQtdCx,
      vendaValorRS,
      vendaVolumeHl,
      vendaDiariaCx,
      estoqueAtualCx,
      estoqueSkuFechado,
      estoqueUnidadeAvulsa,
      estoqueMedioCx,
      estoqueValorRS,
      giroEstoque,
      coberturaDias,
      qtdPickingCx,
      freqPicking,
      qtdReabastecimentos,
      freqReabastecimento,
      scoreImpactoOperacional,
      qtdQuebras,
      valorQuebrasRS,
      percentQuebra,
      shelfLifeDias,
      statusFefo,
      diasParaVencimentoMin,
      riscoVencimento
    };
  });

  // Totais globais para porcentagens acumuladas
  const totalVendaRS = rawList.reduce((acc, curr) => acc + curr.vendaValorRS, 0) || 1;
  const totalVendaVolume = rawList.reduce((acc, curr) => acc + curr.vendaQtdCx, 0) || 1;
  const totalEstoqueRS = rawList.reduce((acc, curr) => acc + curr.estoqueValorRS, 0) || 1;
  const totalOperacional = rawList.reduce((acc, curr) => acc + curr.scoreImpactoOperacional, 0) || 1;

  // Mapas para armazenar as curvas calculadas independentemente
  const mapCurvaValor = new Map<number, { percent: number; acum: number; curva: 'A' | 'B' | 'C' }>();
  const mapCurvaVolume = new Map<number, { percent: number; acum: number; curva: 'A' | 'B' | 'C' }>();
  const mapCurvaEstoque = new Map<number, { percent: number; acum: number; curva: 'A' | 'B' | 'C' }>();
  const mapCurvaOperacional = new Map<number, { percent: number; acum: number; curva: 'A' | 'B' | 'C' }>();

  // 1. Calcular Curva ABC R$
  [...rawList]
    .sort((a, b) => b.vendaValorRS - a.vendaValorRS)
    .reduce((acum, item) => {
      const pct = (item.vendaValorRS / totalVendaRS) * 100;
      const newAcum = acum + pct;
      const curva: 'A' | 'B' | 'C' = newAcum <= 80 ? 'A' : newAcum <= 95 ? 'B' : 'C';
      mapCurvaValor.set(item.codigo, { percent: parseFloat(pct.toFixed(2)), acum: parseFloat(newAcum.toFixed(2)), curva });
      return newAcum;
    }, 0);

  // 2. Calcular Curva ABC Volume
  [...rawList]
    .sort((a, b) => b.vendaQtdCx - a.vendaQtdCx)
    .reduce((acum, item) => {
      const pct = (item.vendaQtdCx / totalVendaVolume) * 100;
      const newAcum = acum + pct;
      const curva: 'A' | 'B' | 'C' = newAcum <= 80 ? 'A' : newAcum <= 95 ? 'B' : 'C';
      mapCurvaVolume.set(item.codigo, { percent: parseFloat(pct.toFixed(2)), acum: parseFloat(newAcum.toFixed(2)), curva });
      return newAcum;
    }, 0);

  // 3. Calcular Curva ABC Estoque
  [...rawList]
    .sort((a, b) => b.estoqueValorRS - a.estoqueValorRS)
    .reduce((acum, item) => {
      const pct = (item.estoqueValorRS / totalEstoqueRS) * 100;
      const newAcum = acum + pct;
      const curva: 'A' | 'B' | 'C' = newAcum <= 80 ? 'A' : newAcum <= 95 ? 'B' : 'C';
      mapCurvaEstoque.set(item.codigo, { percent: parseFloat(pct.toFixed(2)), acum: parseFloat(newAcum.toFixed(2)), curva });
      return newAcum;
    }, 0);

  // 4. Calcular Curva ABC Operacional
  [...rawList]
    .sort((a, b) => b.scoreImpactoOperacional - a.scoreImpactoOperacional)
    .reduce((acum, item) => {
      const pct = (item.scoreImpactoOperacional / totalOperacional) * 100;
      const newAcum = acum + pct;
      const curva: 'A' | 'B' | 'C' = newAcum <= 80 ? 'A' : newAcum <= 95 ? 'B' : 'C';
      mapCurvaOperacional.set(item.codigo, { percent: parseFloat(pct.toFixed(2)), acum: parseFloat(newAcum.toFixed(2)), curva });
      return newAcum;
    }, 0);

  // Montar o resultado final com diagnósticos e criticidade
  return rawList.map(item => {
    const valObj = mapCurvaValor.get(item.codigo) || { percent: 0, acum: 0, curva: 'C' };
    const volObj = mapCurvaVolume.get(item.codigo) || { percent: 0, acum: 0, curva: 'C' };
    const estObj = mapCurvaEstoque.get(item.codigo) || { percent: 0, acum: 0, curva: 'C' };
    const opObj = mapCurvaOperacional.get(item.codigo) || { percent: 0, acum: 0, curva: 'C' };

    const cVal = valObj.curva;
    const cVol = volObj.curva;
    const cEst = estObj.curva;
    const cOp = opObj.curva;

    // Matriz de Criticidade e Diagnóstico Logístico
    let criticidade: MatrizAbcItem['criticidade'] = 'Baixa';
    let diagnosticoFinal = 'Giro e Controle Padrão';

    if (item.coberturaDias === 0 && (cVal === 'A' || cVol === 'A')) {
      criticidade = 'Crítica';
      diagnosticoFinal = 'Ruptura Iminênte em Produto Classe A — Reposição Urgente';
    } else if (item.riscoVencimento === 'Critico' || item.riscoVencimento === 'Alto') {
      criticidade = 'Crítica';
      diagnosticoFinal = 'Risco FEFO Crítico / Vencimento Próximo — Ação Promocional ou Despacho Urgente';
    } else if (item.percentQuebra > 0.5 && item.valorQuebrasRS > 200) {
      criticidade = 'Alta';
      diagnosticoFinal = 'Avarias/Quebras Elevadas — Auditar Manuseio e Acondicionamento no Armazém';
    } else if (cVal === 'A' && cVol === 'A' && cEst === 'A' && cOp === 'A') {
      criticidade = 'Crítica';
      diagnosticoFinal = 'Prioridade Máxima — Alto Valor, Volume, Estoque e Impacto Operacional';
    } else if (cVal === 'A' && cVol === 'C' && cEst === 'A') {
      criticidade = 'Alta';
      diagnosticoFinal = 'Alto Valor Financeiro com Baixo Giro — Risco de Capital Imobilizado';
    } else if (cVol === 'A' && cOp === 'A' && cVal !== 'A') {
      criticidade = 'Alta';
      diagnosticoFinal = 'Alto Volume e Frequência no Picking — Exige Posicionamento Estratégico no Layout';
    } else if (cEst === 'A' && cVal === 'C' && cVol === 'C') {
      criticidade = 'Alta';
      diagnosticoFinal = 'Excesso de Capital Parado em Estoque — Avaliar Redução de Pedidos';
    } else if (cVal === 'A' || cEst === 'A') {
      criticidade = 'Média';
      diagnosticoFinal = 'Monitoramento Constante de Nível de Serviço e Cobertura';
    } else {
      criticidade = 'Baixa';
      diagnosticoFinal = 'Controle Operacional Padrão e Reposição Contínua';
    }

    return {
      ...item,
      percentVendaValor: valObj.percent,
      percentAcumuladoVendaValor: valObj.acum,
      curvaAbcValor: cVal,
      percentVendaVolume: volObj.percent,
      percentAcumuladoVendaVolume: volObj.acum,
      curvaAbcVolume: cVol,
      percentEstoqueValor: estObj.percent,
      percentAcumuladoEstoqueValor: estObj.acum,
      curvaAbcEstoque: cEst,
      percentOperacional: opObj.percent,
      percentAcumuladoOperacional: opObj.acum,
      curvaAbcOperacional: cOp,
      criticidade,
      diagnosticoFinal
    };
  });
}

export function getMatrizAbcKPIs(items: MatrizAbcItem[]): MatrizAbcKPIs {
  const totalSkus = items.length;
  const skusClasseA = items.filter(i => i.curvaAbcValor === 'A').length;
  const skusClasseB = items.filter(i => i.curvaAbcValor === 'B').length;
  const skusClasseC = items.filter(i => i.curvaAbcValor === 'C').length;

  const totalFaturamento = items.reduce((acc, i) => acc + i.vendaValorRS, 0) || 1;
  const faturamentoClasseA = items.filter(i => i.curvaAbcValor === 'A').reduce((acc, i) => acc + i.vendaValorRS, 0);
  const percentFaturamentoClasseA = parseFloat(((faturamentoClasseA / totalFaturamento) * 100).toFixed(1));

  const valorTotalEstoque = items.reduce((acc, i) => acc + i.estoqueValorRS, 0);
  const valorEstoqueClasseA = items.filter(i => i.curvaAbcEstoque === 'A').reduce((acc, i) => acc + i.estoqueValorRS, 0);

  const totalVendaDiaria = items.reduce((acc, i) => acc + i.vendaDiariaCx, 0);
  const totalEstoqueCx = items.reduce((acc, i) => acc + i.estoqueAtualCx, 0);
  const coberturaMediaDias = totalVendaDiaria > 0 ? parseFloat((totalEstoqueCx / totalVendaDiaria).toFixed(1)) : 0;

  const giroMedioEstoque = totalEstoqueCx > 0 ? parseFloat(((totalVendaDiaria * 30) / totalEstoqueCx).toFixed(2)) : 0;

  const totalMovimentacoesOperacionais = items.reduce((acc, i) => acc + i.scoreImpactoOperacional, 0);
  const totalReabastecimentos = items.reduce((acc, i) => acc + i.qtdReabastecimentos, 0);
  const valorTotalQuebras = items.reduce((acc, i) => acc + i.valorQuebrasRS, 0);

  const skusRiscoVencimento = items.filter(i => i.riscoVencimento === 'Alto' || i.riscoVencimento === 'Critico').length;

  return {
    totalSkus,
    skusClasseA,
    skusClasseB,
    skusClasseC,
    percentFaturamentoClasseA,
    valorTotalEstoque,
    valorEstoqueClasseA,
    giroMedioEstoque,
    coberturaMediaDias,
    totalMovimentacoesOperacionais,
    totalReabastecimentos,
    valorTotalQuebras,
    skusRiscoVencimento
  };
}
