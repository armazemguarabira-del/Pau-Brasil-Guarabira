import { ArmazemRow, Tarefa, BlitzRefugoRow, QuebraRow, ValidadeRow, RepackRow, DespejoRow } from './types';

// Helpers to format dates and times
const pad = (n: number) => n.toString().padStart(2, '0');

export function getPastDates(numDays: number): { data: string; dataISO: string }[] {
  const dates: { data: string; dataISO: string }[] = [];
  const today = new Date();
  
  for (let i = numDays - 1; i >= 0; i--) {
    const d = new Date(today.getTime());
    d.setDate(today.getDate() - i);
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    
    dates.push({
      data: `${dd}/${mm}/${yyyy}`,
      dataISO: `${yyyy}-${mm}-${dd}`
    });
  }
  return dates;
}

// 1. LOGISTICA (ArmazemRow) - 4 Months of Fictitious Data
export function generateMockArmazemRows(empresaId: string): ArmazemRow[] {
  const dates = getPastDates(120); // 4 months
  const rows: ArmazemRow[] = [];
  
  const empilhadores = ['MARIVALDO', 'RONILDO', 'PAULO PEREIRA'];
  const placas = ['NPT-4821', 'OET-1290', 'MOU-5531', 'KGT-0982', 'QYF-9921'];
  const tipos = ['Puxada', 'Rota', 'Recarga', 'Terceiro'];
  const turnos = ['Turno A', 'Turno B', 'Turno C'];
  
  dates.forEach((d, dIdx) => {
    // 2-3 loads/unloads per day
    const numOps = 2 + (dIdx % 2);
    for (let i = 0; i < numOps; i++) {
      const operacao = (dIdx + i) % 2 === 0 ? 'Carregamento' : 'Descarregamento';
      const empilhador = empilhadores[(dIdx + i) % empilhadores.length];
      const placa = placas[(dIdx + i) % placas.length];
      const tipo = tipos[(dIdx + i) % tipos.length];
      const turno = turnos[(dIdx + i) % turnos.length];
      const palhete = 10 + ((dIdx * 7 + i * 13) % 20); // 10 to 29 pallets
      
      // Select standard operational start and end hours
      const startHour = 8 + (i * 4) + (dIdx % 3);
      const startMin = (dIdx * 15 + i * 20) % 60;
      const durationMin = 30 + ((dIdx * 11 + i * 17) % 80); // 30 to 110 minutes
      
      const endHour = startHour + Math.floor((startMin + durationMin) / 60);
      const endMin = (startMin + durationMin) % 60;
      
      const inicio = `${pad(startHour)}:${pad(startMin)}`;
      const fim = `${pad(endHour % 24)}:${pad(endMin)}`;
      
      // DENTRO DA META is <= 45 minutes for Descarregamento or <= 90 minutes for Carregamento
      const limit = operacao === 'Descarregamento' ? 45 : 90;
      const status = durationMin <= limit ? 'DENTRO DA META' : 'FORA DA META';
      
      let pernoite: 'D0' | 'D1' | 'D2' | 'D3' | 'D4' | undefined = undefined;
      if (operacao === 'Descarregamento') {
        const pernoiteRand = (dIdx * 17 + i * 29) % 100;
        if (pernoiteRand < 70) {
          pernoite = 'D0';
        } else if (pernoiteRand < 85) {
          pernoite = 'D1';
        } else if (pernoiteRand < 92) {
          pernoite = 'D2';
        } else if (pernoiteRand < 97) {
          pernoite = 'D3';
        } else {
          pernoite = 'D4';
        }
      }
      
      rows.push({
        _docId: `mock-log-${dIdx}-${i}`,
        empresaId,
        operacao,
        data: d.data,
        dataISO: d.dataISO,
        inicio,
        fim,
        status,
        empilhador,
        turno,
        placa,
        tipo,
        palhete,
        pernoite,
        obs: 'Dados simulados para visualização do dashboard',
        _criadoEm: `${d.dataISO}T${inicio}:00`
      });
    }
  });
  
  return rows;
}

// 2. PICKING / TAREFAS (Tarefa) - 2 Months of Fictitious Data
export function generateMockTarefas(empresaId: string, customOperators?: string[]): Tarefa[] {
  const dates = getPastDates(60);
  const tasks: Tarefa[] = [];
  
  const defaultOperators = ['MARIVALDO ARTHUR', 'RONILDO', 'PAULO PEREIRA', 'ALEXANDRE', 'GABRIEL JOSÉ'];
  const operators = customOperators && customOperators.length > 0 ? customOperators : defaultOperators;
  const conferentes = ['GILSON ROSA DA SILVA', 'MATHEUS', 'CARLOS OLIVEIRA'];
  const descriptions = [
    'PREPARAÇÃO ROTA 101 URBANA',
    'SEPARAÇÃO MIX DISTRIBUIÇÃO',
    'ORGANIZAÇÃO PALETE INTEIRO',
    'REABASTECIMENTO PICKING ATIVO',
    'PREPARAÇÃO INTERFÁBRICA CARRETA'
  ];
  
  dates.forEach((d, dIdx) => {
    // 3 tasks per day
    for (let i = 0; i < 3; i++) {
      const idx = dIdx * 3 + i;
      const operator = operators[idx % operators.length];
      const conferente = conferentes[idx % conferentes.length];
      const desc = descriptions[idx % descriptions.length];
      const qty = 50 + ((idx * 23) % 400); // 50 to 450 cases
      const durationMin = 20 + ((idx * 13) % 45); // 20 to 65 min
      
      const startHour = 7 + (i * 4) + (dIdx % 2);
      const startMin = (idx * 17) % 60;
      const endHour = startHour + Math.floor((startMin + durationMin) / 60);
      const endMin = (startMin + durationMin) % 60;
      
      const criadoEm = `${d.dataISO} ${pad(startHour)}:${pad(startMin)}:00`;
      const iniciadoEm = `${d.dataISO} ${pad(startHour)}:${pad(startMin)}:00`;
      const finalizadoEm = `${d.dataISO} ${pad(endHour)}:${pad(endMin)}:00`;
      
      tasks.push({
        _docId: `mock-pick-${idx}`,
        empresaId,
        id: 1000 + idx,
        codigo: 20000 + idx,
        descricao: desc,
        quantidade: qty,
        conferente,
        operador: operator,
        status: 'done',
        criadoEm,
        iniciadoEm,
        finalizadoEm,
        duracaoMin: durationMin,
        tipoOperacao: i % 2 === 0 ? 'Durante o Carregamento' : 'Após o Carregamento',
        locData: {
          distanciaM: 400 + ((idx * 150) % 2000),
          totalIdleSec: 60 + ((idx * 30) % 600),
          segmentosParado: 2 + (idx % 6),
          totalLeituras: Math.round(qty * 0.95),
          mapsLink: '#'
        }
      });
    }
  });
  
  return tasks;
}

// 3. BLITZ REFUGO (BlitzRefugoRow) - 2 Months of Fictitious Data
export function generateMockBlitzRows(empresaId: string): BlitzRefugoRow[] {
  const dates = getPastDates(60);
  const rows: BlitzRefugoRow[] = [];
  
  const ajudantes = ['Victor', 'Marcelo', 'Gabriel', 'Ozenildo'];
  const placas = ['NPT-4821', 'OET-1290', 'MOU-5531', 'KGT-0982'];
  
  dates.forEach((d, dIdx) => {
    // Every 2 days, a Blitz report
    if (dIdx % 2 === 0) {
      const idx = dIdx / 2;
      const ajudante = ajudantes[idx % ajudantes.length];
      const placa = placas[idx % placas.length];
      const totalCaixas = 300 + ((idx * 83) % 400); // 300 to 700 boxes
      const totalDef = Math.floor(1 + ((idx * 7) % 15)); // 1 to 15 broken boxes
      const totalAferido = totalCaixas;
      const pctRefugo = parseFloat(((totalDef / totalCaixas) * 100).toFixed(2));
      
      // Build packages structure
      const emb: BlitzRefugoRow['emb'] = {
        'LATA_350': { caixas: totalCaixas, aferido: totalAferido, fator: 1, 'vazamento': totalDef }
      };
      
      rows.push({
        _docId: `mock-blitz-${idx}`,
        empresaId,
        placa,
        ajudante,
        data: d.data,
        dataISO: d.dataISO,
        mapa: `M-${20000 + idx}`,
        rota: `R-${100 + (idx % 10)}`,
        obs: 'Refugo simulado para análise de perdas',
        emb,
        totalCaixas,
        totalAferido,
        totalDef,
        pctRefugo,
        _criadoEm: `${d.dataISO}T17:00:00`
      });
    }
  });
  
  return rows;
}

// 4. QUEBRAS (QuebraRow) - 2 Months of Fictitious Data
export function generateMockQuebras(empresaId: string): QuebraRow[] {
  const dates = getPastDates(60);
  const rows: QuebraRow[] = [];
  
  const produtos = [
    { cod: '1010', desc: 'SKOL 600ML PET' },
    { cod: '2020', desc: 'BRAHMA DUPLO MALTE LATA 350ML' },
    { cod: '3030', desc: 'STELLA ARTOIS LONG NECK 275ML' },
    { cod: '4040', desc: 'CORONA EXTRA 330ML LN' }
  ];
  const areas = ['ARMAZEM', 'ENTREGA', 'ROTA'];
  const turnos = ['Turno A', 'Turno B', 'Turno C'];
  const codigosQuebra = ['539', '540', '541'];
  const motivos = ['Avaria Física/Manuseio', 'Quebra em Transporte', 'Choque de Palete'];
  const colaboradores = ['OZENILDO SILVA', 'MARIVALDO ARTHUR', 'RONILDO', 'PAULO PEREIRA'];
  
  dates.forEach((d, dIdx) => {
    // 1-2 quebras per day
    const numQ = 1 + (dIdx % 2);
    for (let i = 0; i < numQ; i++) {
      const idx = dIdx * 2 + i;
      const prod = produtos[idx % produtos.length];
      const area = areas[idx % areas.length];
      const turno = turnos[idx % turnos.length];
      const codQuebra = codigosQuebra[idx % codigosQuebra.length];
      const motivo = motivos[idx % motivos.length];
      const qty = 2 + (idx % 20); // 2 to 21 units
      const colab = colaboradores[idx % colaboradores.length];
      
      rows.push({
        _docId: `mock-quebra-${idx}`,
        empresaId,
        data: d.data,
        dataISO: d.dataISO,
        codProduto: prod.cod,
        descricao: prod.desc,
        quantidade: qty,
        area,
        turno,
        codQuebra,
        motivo,
        colaboradorQuebrou: colab,
        _criadoEm: `${d.dataISO}T11:00:00`
      });
    }
  });
  
  return rows;
}

// 5. FEFO VALIDADE (ValidadeRow) - 2 Months of Fictitious Data
export function generateMockValidades(empresaId: string): ValidadeRow[] {
  const rows: ValidadeRow[] = [];
  const produtos = [
    { cod: '982', desc: 'SKOL 600ML' },
    { cod: '988', desc: 'BRAHMA CHOPP 600ML' },
    { cod: '1699', desc: 'STELLA ARTOIS LT 269ML' },
    { cod: '20329', desc: 'BRAHMA DUPLO MALTE 600ML' },
    { cod: '21632', desc: 'SPATEN N LN 355ML SIXPACK' },
    { cod: '23186', desc: 'SPATEN N 600ML' },
    { cod: '9068', desc: 'SKOL LATA 350ML' },
    { cod: '9069', desc: 'BRAHMA CHOPP LATA 350ML' },
    { cod: '2548', desc: 'BUDWEISER 600ML' },
    { cod: '2546', desc: 'ORIGINAL 600ML' }
  ];
  
  const today = new Date();
  
  produtos.forEach((prod, idx) => {
    // We generate a series of offsets for each product.
    // The first offset (critical) is customized: 3, 6, 9, 12, 15, 18, 21, 24, 27, 30 days.
    // This guarantees EXACTLY 10 distinct products close to expiring!
    const criticalOffset = 3 + idx * 3;
    const offsets = [criticalOffset, 45 + idx, 75 + idx * 2, 110 + idx * 3];
    
    // Add 1-2 expired batches to make it realistic
    if (idx === 0) offsets.unshift(-5);
    if (idx === 1) offsets.unshift(-2);

    offsets.forEach((offset, oIdx) => {
      const valDate = new Date(today.getTime());
      valDate.setDate(today.getDate() + offset);
      const valISO = `${valDate.getFullYear()}-${pad(valDate.getMonth() + 1)}-${pad(valDate.getDate())}`;
      
      rows.push({
        _docId: `mock-validade-${idx}-${offset}`,
        empresaId,
        id: idx * 10 + offset + 100,
        codigo: prod.cod,
        descricao: prod.desc,
        palhete: 3 + (idx % 3),
        lastro: 4,
        caixa: 15 + (idx * 5),
        validade: valISO,
        localizacao: oIdx % 3 === 0 ? 'picking' : oIdx % 3 === 1 ? 'central' : 'marketplace',
        cadastradoEm: today.toLocaleDateString('pt-BR'),
        _criadoEm: today.toISOString()
      });
    });
  });
  
  return rows;
}

// 6. REPACK (RepackRow) - 2 Months of Fictitious Data
export function generateMockRepackRows(empresaId: string): RepackRow[] {
  const dates = getPastDates(60);
  const rows: RepackRow[] = [];
  
  const embalagens = ['LATA 350ML', 'GARRAFA 600ML', 'LATA 269ML', 'LONG NECK 275ML'];
  const operadores = ['OZENILDO SILVA', 'MARIVALDO ARTHUR', 'RONILDO', 'PAULO PEREIRA'];
  
  dates.forEach((d, dIdx) => {
    // 1-2 repacks per day
    const numR = 1 + (dIdx % 2);
    for (let i = 0; i < numR; i++) {
      const idx = dIdx * 2 + i;
      const embalagem = embalagens[idx % embalagens.length];
      const operador = operadores[idx % operadores.length];
      const qty = 5 + (idx % 45); // 5 to 49 boxes
      const durationMin = 15 + (idx % 30); // 15 to 44 minutes
      
      const startHour = 9 + i * 3;
      const startMin = (idx * 13) % 60;
      const endHour = startHour + Math.floor((startMin + durationMin) / 60);
      const endMin = (startMin + durationMin) % 60;
      
      const inicio = `${pad(startHour)}:${pad(startMin)}`;
      const fim = `${pad(endHour)}:${pad(endMin)}`;
      
      // meta format e.g. "04:00" (min per box ratio or standard time)
      const meta = "04:00";
      // Let's compute actual duration string
      const durationStr = `${pad(Math.floor(durationMin / 60))}:${pad(durationMin % 60)}`;
      
      rows.push({
        _docId: `mock-repack-${idx}`,
        empresaId,
        data: d.data,
        dataISO: d.dataISO,
        embalagem,
        quantidade: qty,
        inicio,
        fim,
        duracao: durationStr,
        meta,
        resultado: durationMin <= qty * 4 ? 'Abaixo da Meta' : 'Acima da Meta',
        operador,
        _criadoEm: `${d.dataISO}T${inicio}:00`
      });
    }
  });
  
  return rows;
}

// 7. DESPEJO (DespejoRow) - 2 Months of Fictitious Data
export function generateMockDespejoRows(empresaId: string): DespejoRow[] {
  const dates = getPastDates(60);
  const rows: DespejoRow[] = [];
  
  const embalagens = ['SKOL 600ML PET', 'BRAHMA LATA 350ML', 'LONG NECK STELLA'];
  const operadores = ['OZENILDO SILVA', 'MARIVALDO ARTHUR', 'RONILDO', 'PAULO PEREIRA'];
  
  dates.forEach((d, dIdx) => {
    // Every 2 days, a Despejo record
    if (dIdx % 2 === 0) {
      const idx = dIdx / 2;
      const embalagem = embalagens[idx % embalagens.length];
      const operador = operadores[idx % operadores.length];
      const qty = 100 + (idx % 400); // 100 to 499 units
      const durationMin = 45 + (idx % 60); // 45 to 104 minutes
      
      const startHour = 14;
      const startMin = (idx * 11) % 60;
      const endHour = startHour + Math.floor((startMin + durationMin) / 60);
      const endMin = (startMin + durationMin) % 60;
      
      const inicio = `${pad(startHour)}:${pad(startMin)}`;
      const fim = `${pad(endHour)}:${pad(endMin)}`;
      const tempoStr = `${pad(Math.floor(durationMin / 60))}:${pad(durationMin % 60)}`;
      
      rows.push({
        _docId: `mock-despejo-${idx}`,
        empresaId,
        data: d.data,
        dataISO: d.dataISO,
        embalagem,
        quantidade: qty,
        inicio,
        fim,
        tempo: tempoStr,
        meta: '01:30',
        resultado: durationMin <= 90 ? 'Abaixo da Meta' : 'Acima da Meta',
        operador,
        _criadoEm: `${d.dataISO}T${inicio}:00`
      });
    }
  });
  
  return rows;
}
