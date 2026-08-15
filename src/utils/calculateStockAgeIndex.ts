import { ProdutoMaster } from '../types';
import { findProductMaster } from '../data/productMasterData';

export type StockAgeStatus = 'Crítico' | 'Atenção' | 'OK';

export interface StockAgeCalculationInput {
  codigo?: string | number;
  descricao?: string;
  validade: string; // ISO (YYYY-MM-DD) or DD/MM/YYYY or DD-MM-YYYY
  idadeCadastrada?: number | null; // explicit shelf life in days if available
  [key: string]: any;
}

export interface StockAgeCalculationResult {
  diasRestantes: number;
  idadeCadastrada: number | null;
  stockAgeIndex: number; // percentage (e.g. 65.4)
  status: StockAgeStatus;
  idadeMissing: boolean; // true if product does not have 'idade' registered
  statusLabel: string; // "🔴 Crítico", "🟡 Atenção", "🟢 OK", or "⚠ Idade não cadastrada"
}

/**
 * Parses date strings in various formats (YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, etc.)
 */
export function parseValidadeDate(valStr: string): Date | null {
  if (!valStr) return null;
  const clean = String(valStr).trim();
  if (!clean) return null;
  
  // Try T00:00:00 ISO format
  let d = new Date(clean.includes('T') ? clean : clean + 'T00:00:00');
  if (!isNaN(d.getTime())) return d;

  if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length === 3) {
      let year = parts[2].trim();
      if (year.length === 2) year = '20' + year;
      const month = parts[1].padStart(2, '0');
      const day = parts[0].padStart(2, '0');
      d = new Date(`${year}-${month}-${day}T00:00:00`);
      if (!isNaN(d.getTime())) return d;
    }
  } else if (clean.includes('-')) {
    const parts = clean.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 2) {
        let year = parts[2].trim();
        if (year.length === 2) year = '20' + year;
        const month = parts[1].padStart(2, '0');
        const day = parts[0].padStart(2, '0');
        d = new Date(`${year}-${month}-${day}T00:00:00`);
        if (!isNaN(d.getTime())) return d;
      } else if (parts[0].length === 4) {
        d = new Date(`${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}T00:00:00`);
        if (!isNaN(d.getTime())) return d;
      }
    }
  }
  return null;
}

/**
 * Calculates remaining days from reference date (default: today) to validade date.
 */
export function getDiasRestantes(validadeStr: string, referenceDate?: Date): number {
  const expDate = parseValidadeDate(validadeStr);
  if (!expDate) return 0;
  
  const today = referenceDate ? new Date(referenceDate) : new Date();
  today.setHours(0, 0, 0, 0);
  
  const target = new Date(expDate);
  target.setHours(0, 0, 0, 0);

  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Resolves the registered product 'idade' (total shelf life in days)
 * from Cadastro de Produtos or Product Master Data.
 */
export function resolveProductEdad(
  codigo?: string | number,
  descricao?: string,
  produtosList?: ProdutoMaster[]
): number | null {
  const codeStr = String(codigo || '').trim();
  const descStr = String(descricao || '').trim().toLowerCase();

  // 1. Search in registered products list (Cadastro de Produtos)
  if (produtosList && produtosList.length > 0) {
    if (codeStr) {
      const found = produtosList.find(p => String(p.codigo).trim() === codeStr);
      if (found && typeof found.idade === 'number' && found.idade > 0) {
        return found.idade;
      }
    }
    if (descStr) {
      const found = produtosList.find(p => p.descricao && p.descricao.toLowerCase().trim() === descStr);
      if (found && typeof found.idade === 'number' && found.idade > 0) {
        return found.idade;
      }
    }
  }

  // 2. Search in PRODUCT_MASTER_DATA fallback
  if (codeStr || descStr) {
    const master = findProductMaster(codeStr || descStr);
    if (master && typeof master.idade === 'number' && master.idade > 0) {
      return master.idade;
    }
  }

  return null;
}

/**
 * Calculates Stock Age Index using official formula:
 * diasRestantes = dataVencimento - dataAtual
 * stockAgeIndex (%) = (diasRestantes / idadeCadastrada) * 100
 *
 * Rules:
 * 1. If diasRestantes <= 30 -> Crítico (regardless of percentage).
 * 2. Else:
 *    < 60%  -> Crítico
 *    60-75% -> Atenção
 *    > 75%  -> OK
 *
 * If idade is missing or <= 0 -> marked as missing, excluded from overall averages.
 */
export function calculateStockAgeIndex(
  input: StockAgeCalculationInput,
  produtosList?: ProdutoMaster[],
  referenceDate?: Date
): StockAgeCalculationResult {
  const diasRestantes = getDiasRestantes(input.validade, referenceDate);
  
  // Resolve registered shelf life
  let idade = input.idadeCadastrada;
  if (idade === undefined || idade === null || idade <= 0) {
    idade = resolveProductEdad(input.codigo, input.descricao, produtosList);
  }

  if (idade === null || idade <= 0) {
    // Missing Idade in Cadastro de Produtos!
    return {
      diasRestantes,
      idadeCadastrada: null,
      stockAgeIndex: 0,
      status: 'Crítico',
      idadeMissing: true,
      statusLabel: '⚠ Idade não cadastrada'
    };
  }

  // Calculate percentage: (diasRestantes / idade) * 100
  const rawPercentage = (diasRestantes / idade) * 100;
  const stockAgeIndex = Math.round(rawPercentage * 10) / 10;

  // Apply classification rules in strict priority order:
  // Rule 1: diasRestantes <= 30 -> Crítico
  let status: StockAgeStatus = 'OK';
  if (diasRestantes <= 30) {
    status = 'Crítico';
  } else if (stockAgeIndex < 60) {
    status = 'Crítico';
  } else if (stockAgeIndex <= 75) {
    status = 'Atenção';
  } else {
    status = 'OK';
  }

  let statusLabel = '🟢 OK';
  if (status === 'Crítico') statusLabel = '🔴 Crítico';
  else if (status === 'Atenção') statusLabel = '🟡 Atenção';

  return {
    diasRestantes,
    idadeCadastrada: idade,
    stockAgeIndex,
    status,
    idadeMissing: false,
    statusLabel
  };
}

/**
 * Calculates overall summary metrics for a collection of processed Stock Age items.
 * Strictly excludes items with missing 'idade' from the average index calculation.
 */
export function calculateStockAgeSummary<T extends {
  stockAgeIndex: number;
  status: StockAgeStatus;
  idadeMissing: boolean;
  valorTotal?: number;
  volumeHL?: number;
  quantidade?: number;
}>(items: T[]) {
  let totalValor = 0;
  let totalHL = 0;
  let totalQtd = 0;
  let criticoCount = 0;
  let atencaoCount = 0;
  let okCount = 0;
  let missingIdadeCount = 0;

  let sumIndexForAvg = 0;
  let countForAvg = 0;

  items.forEach(item => {
    totalValor += item.valorTotal || 0;
    totalHL += item.volumeHL || 0;
    totalQtd += item.quantidade || 0;

    if (item.idadeMissing) {
      missingIdadeCount++;
      criticoCount++;
    } else {
      if (item.status === 'Crítico') criticoCount++;
      else if (item.status === 'Atenção') atencaoCount++;
      else okCount++;

      sumIndexForAvg += item.stockAgeIndex;
      countForAvg++;
    }
  });

  const avgIndex = countForAvg > 0 ? Math.round((sumIndexForAvg / countForAvg) * 10) / 10 : 0;

  return {
    totalItens: items.length,
    validItensCount: countForAvg,
    missingIdadeCount,
    avgIndex,
    criticoCount,
    atencaoCount,
    okCount,
    totalValor,
    totalHL,
    totalQtd
  };
}
