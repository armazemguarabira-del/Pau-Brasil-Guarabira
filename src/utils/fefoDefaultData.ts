import { ValidadeRow } from '../types';

export function getInitialDefaultValidades(companyId: string = 'demo'): ValidadeRow[] {
  const today = new Date();
  
  function addDaysISO(days: number): string {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  const todayStr = addDaysISO(0);

  return [
    {
      id: 101,
      _docId: `seed-val-101-${companyId}`,
      codigo: '982',
      descricao: 'SKOL 600ML',
      validade: addDaysISO(10), // Vence em 10 dias (Crítico)
      palhete: 1,
      lastro: 10,
      caixa: 120,
      quantidade: 120,
      localizacao: 'central',
      bloco: 'B-01',
      lote: 'LT-982-A',
      responsavel: 'Conferente Oficial',
      dataColeta: todayStr,
      empresaId: companyId
    },
    {
      id: 102,
      _docId: `seed-val-102-${companyId}`,
      codigo: '988',
      descricao: 'BRAHMA CHOPP 600ML',
      validade: addDaysISO(18), // Vence em 18 dias (Crítico)
      palhete: 1,
      lastro: 15,
      caixa: 180,
      quantidade: 180,
      localizacao: 'central',
      bloco: 'B-02',
      lote: 'LT-988-B',
      responsavel: 'Conferente Oficial',
      dataColeta: todayStr,
      empresaId: companyId
    },
    {
      id: 103,
      _docId: `seed-val-103-${companyId}`,
      codigo: '2538',
      descricao: 'ANTARCTICA PILSEN 600ML',
      validade: addDaysISO(25), // Vence em 25 dias (Crítico)
      palhete: 1,
      lastro: 8,
      caixa: 96,
      quantidade: 96,
      localizacao: 'central',
      bloco: 'B-03',
      lote: 'LT-2538-C',
      responsavel: 'Conferente Oficial',
      dataColeta: todayStr,
      empresaId: companyId
    },
    {
      id: 104,
      _docId: `seed-val-104-${companyId}`,
      codigo: '2349',
      descricao: 'GUARANA CHP ANTARCTICA PET 2L CAIXA C/6',
      validade: addDaysISO(32), // Vence em 32 dias (Atenção)
      palhete: 1,
      lastro: 15,
      caixa: 150,
      quantidade: 150,
      localizacao: 'central',
      bloco: 'A-04',
      lote: 'LT-2349-D',
      responsavel: 'Conferente Oficial',
      dataColeta: todayStr,
      empresaId: companyId
    },
    {
      id: 105,
      _docId: `seed-val-105-${companyId}`,
      codigo: '2546',
      descricao: 'ORIGINAL 600ML',
      validade: addDaysISO(38), // Vence em 38 dias (Atenção)
      palhete: 1,
      lastro: 7,
      caixa: 84,
      quantidade: 84,
      localizacao: 'central',
      bloco: 'A-05',
      lote: 'LT-2546-E',
      responsavel: 'Conferente Oficial',
      dataColeta: todayStr,
      empresaId: companyId
    },
    {
      id: 106,
      _docId: `seed-val-106-${companyId}`,
      codigo: '2548',
      descricao: 'BUDWEISER 600ML',
      validade: addDaysISO(42), // Vence em 42 dias (Atenção)
      palhete: 1,
      lastro: 10,
      caixa: 100,
      quantidade: 100,
      localizacao: 'central',
      bloco: 'A-06',
      lote: 'LT-2548-F',
      responsavel: 'Conferente Oficial',
      dataColeta: todayStr,
      empresaId: companyId
    },
    {
      id: 107,
      _docId: `seed-val-107-${companyId}`,
      codigo: '504',
      descricao: 'PEPSI COLA PET 2L CAIXA C/6',
      validade: addDaysISO(14), // Vence em 14 dias (PNC / Crítico)
      palhete: 1,
      lastro: 6,
      caixa: 60,
      quantidade: 60,
      localizacao: 'pnc',
      bloco: 'PNC-01',
      lote: 'LT-504-PNC',
      responsavel: 'Conferente Oficial',
      dataColeta: todayStr,
      dataTransferenciaPnc: addDaysISO(-5),
      empresaId: companyId
    },
    {
      id: 108,
      _docId: `seed-val-108-${companyId}`,
      codigo: '9068',
      descricao: 'SKOL LATA 350ML SH C/12 NPAL',
      validade: addDaysISO(28), // Vence em 28 dias (Crítico)
      palhete: 1,
      lastro: 21,
      caixa: 210,
      quantidade: 210,
      localizacao: 'central',
      bloco: 'A-02',
      lote: 'LT-9068-G',
      responsavel: 'Conferente Oficial',
      dataColeta: todayStr,
      empresaId: companyId
    }
  ];
}
