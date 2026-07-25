import { QuebraRow } from '../types';
import rawData from './baseQuebrasData.json';

export const RAW_BASE_QUEBRAS = rawData;

export function getBaseQuebrasRows(empresaId: string = 'demo'): QuebraRow[] {
  return RAW_BASE_QUEBRAS.map((item: any, index: number) => {
    const rawDate = String(item.data || '');
    let dataISO = rawDate;
    let dataDisplay = rawDate;
    if (rawDate.includes('-')) {
      const parts = rawDate.split('-');
      if (parts.length === 3) {
        dataISO = rawDate;
        dataDisplay = `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    } else if (rawDate.includes('/')) {
      const parts = rawDate.split('/');
      if (parts.length === 3) {
        dataDisplay = rawDate;
        dataISO = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }

    let rawProdCode = item.produtoCodigo;
    if (rawProdCode === null || rawProdCode === undefined || rawProdCode === '-' || rawProdCode === 0) {
      rawProdCode = item.codigo || '—';
    } else if (typeof rawProdCode === 'number') {
      rawProdCode = Math.floor(rawProdCode);
    }

    let desc = item.descricao;
    if (!desc || desc === '0') {
      desc = item.embalagem || item.tipoMarca || 'SKU NÃO INFORMADO';
    }

    return {
      _docId: `base-quebra-${index}`,
      empresaId,
      data: dataDisplay,
      dataISO,
      codProduto: String(rawProdCode),
      descricao: desc,
      quantidade: Number(item.quantidade) || 0,
      area: item.area || 'ARMAZEM',
      turno: item.turno || 'MANHÃ',
      codQuebra: String(item.codigo || '539'),
      motivo: item.motivo || 'AVARIA / VAZAMENTO',
      fiscal: 'SISTEMA',
      colaboradorQuebrou: item.responsavel || undefined,
      responsavel: item.responsavel || undefined,
      funcao: item.funcao || undefined,
      embalagem: item.embalagem || undefined,
      tipoMarca: item.tipoMarca || undefined,
      valorTotal: Number(item.valorTotal) || 0,
      wqi: item.wqi || 'NÃO',
      _criadoEm: `${dataISO}T12:00:00.000Z`
    };
  });
}
