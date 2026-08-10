import { db } from '../firebase';
import { collection, addDoc, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';

export interface JornadaRecord {
  id: string;
  colaboradorId?: string;
  colaboradorNome: string;
  cargo: 'Conferente' | 'Empilhador' | 'Ajudante' | 'Operacional' | string;
  dataStr: string; // "DD/MM/YYYY"
  dataISO: string; // "YYYY-MM-DD"
  mesAno: string;  // "MM/YYYY"
  horaInicio: string; // "HH:MM"
  horaInicioIntervalo?: string; // "HH:MM" (Almoço / Pausa)
  horaFimIntervalo?: string;    // "HH:MM" (Retorno do Almoço)
  horaFim: string;   // "HH:MM"
  duracaoHoras: number; // e.g. 7.33
  empresaId: string;
  observacoes?: string;
  criadoEm: string;
}

export interface WlpMonthlyConfig {
  empresaId: string;
  mesAno: string; // "08/2026"
  volumeFaturadoHL: number; // Volume total faturado em HL
  diasUteisTrabalhados: number; // Ex: 22
  quadroPessoalTTQLP: number; // Total quadro pessoal operacional
  horasTurnoPadrao: number; // Default 7.33
  metaWlp: number; // Meta WLP HL/HH (Ex: 25.0)
}

// Default initial mock/seeded journeys if empty
const DEFAULT_JORNADAS_SEED: JornadaRecord[] = [
  {
    id: 'jrn-seed-1',
    colaboradorNome: 'MARIVALDO ARTUR ALVES',
    cargo: 'Conferente',
    dataStr: '08/08/2026',
    dataISO: '2026-08-08',
    mesAno: '08/2026',
    horaInicio: '07:00',
    horaFim: '16:20',
    duracaoHoras: 7.33,
    empresaId: 'demo',
    observacoes: 'Jornada normal no armazém - EFC/EFD',
    criadoEm: new Date().toISOString()
  },
  {
    id: 'jrn-seed-2',
    colaboradorNome: 'NIXON HENRIQUE PEREIRA DE ARRUDA',
    cargo: 'Empilhador',
    dataStr: '08/08/2026',
    dataISO: '2026-08-08',
    mesAno: '08/2026',
    horaInicio: '07:00',
    horaFim: '16:20',
    duracaoHoras: 7.33,
    empresaId: 'demo',
    observacoes: 'Operação de movimentação de paletes',
    criadoEm: new Date().toISOString()
  },
  {
    id: 'jrn-seed-3',
    colaboradorNome: 'PAULO PEREIRA DA SILVA',
    cargo: 'Ajudante',
    dataStr: '08/08/2026',
    dataISO: '2026-08-08',
    mesAno: '08/2026',
    horaInicio: '07:00',
    horaFim: '16:20',
    duracaoHoras: 7.33,
    empresaId: 'demo',
    observacoes: 'Repack e montagem de cargas',
    criadoEm: new Date().toISOString()
  }
];

export function getStoredJornadas(empresaId: string = 'demo'): JornadaRecord[] {
  const key = `colaboradores_jornadas_${empresaId}`;
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}

  // Fallback initial storage
  localStorage.setItem(key, JSON.stringify(DEFAULT_JORNADAS_SEED));
  return DEFAULT_JORNADAS_SEED;
}

export function saveJornadaRecord(record: JornadaRecord): void {
  const empresaId = record.empresaId || 'demo';
  const key = `colaboradores_jornadas_${empresaId}`;
  const list = getStoredJornadas(empresaId);
  const existingIdx = list.findIndex(r => r.id === record.id);

  let updated: JornadaRecord[];
  if (existingIdx >= 0) {
    updated = [...list];
    updated[existingIdx] = record;
  } else {
    updated = [record, ...list];
  }

  localStorage.setItem(key, JSON.stringify(updated));

  // Sync to Firestore if available
  if (db) {
    try {
      const docRef = doc(db, 'jornadas_colaboradores', record.id);
      setDoc(docRef, record, { merge: true }).catch(console.warn);
    } catch (e) {}
  }

  window.dispatchEvent(new Event('jornadas_updated'));
  window.dispatchEvent(new Event('storage'));
}

export function saveMultipleJornadas(records: JornadaRecord[], empresaId: string = 'demo'): void {
  const key = `colaboradores_jornadas_${empresaId}`;
  const current = getStoredJornadas(empresaId);

  const mergedMap = new Map<string, JornadaRecord>();
  current.forEach(r => mergedMap.set(r.id, r));
  records.forEach(r => mergedMap.set(r.id, r));

  const updated = Array.from(mergedMap.values());
  updated.sort((a, b) => new Date(b.dataISO + 'T' + b.horaInicio).getTime() - new Date(a.dataISO + 'T' + a.horaInicio).getTime());

  localStorage.setItem(key, JSON.stringify(updated));

  window.dispatchEvent(new Event('jornadas_updated'));
  window.dispatchEvent(new Event('storage'));
}

export function deleteJornadaRecord(id: string, empresaId: string = 'demo'): void {
  const key = `colaboradores_jornadas_${empresaId}`;
  const current = getStoredJornadas(empresaId);
  const updated = current.filter(r => r.id !== id);
  localStorage.setItem(key, JSON.stringify(updated));

  if (db) {
    try {
      deleteDoc(doc(db, 'jornadas_colaboradores', id)).catch(console.warn);
    } catch (e) {}
  }

  window.dispatchEvent(new Event('jornadas_updated'));
  window.dispatchEvent(new Event('storage'));
}

export function getWlpConfig(empresaId: string = 'demo', mesAno: string = '08/2026'): WlpMonthlyConfig {
  const key = `wlp_config_${empresaId}_${mesAno.replace('/', '_')}`;
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {}

  return {
    empresaId,
    mesAno,
    volumeFaturadoHL: 14250.0,
    diasUteisTrabalhados: 22,
    quadroPessoalTTQLP: 18,
    horasTurnoPadrao: 7.33,
    metaWlp: 25.0
  };
}

export function saveWlpConfig(config: WlpMonthlyConfig): void {
  const key = `wlp_config_${config.empresaId}_${config.mesAno.replace('/', '_')}`;
  localStorage.setItem(key, JSON.stringify(config));

  if (db) {
    try {
      const docRef = doc(db, 'wlp_configs', key);
      setDoc(docRef, config, { merge: true }).catch(console.warn);
    } catch (e) {}
  }

  window.dispatchEvent(new Event('wlp_config_updated'));
  window.dispatchEvent(new Event('storage'));
}

/**
 * Calculates WLP according to official formula:
 * WLP = Volume Total Faturado (HL) / (TT QLP * 7.33 * Dias Úteis Trabalhados)
 * Or using total actual worked hours calculated from start/end times!
 */
export interface WlpDailyFaturadoRecord {
  id: string;
  dataISO: string; // "YYYY-MM-DD"
  dataStr: string; // "DD/MM/YYYY"
  mesAno: string;  // "MM/YYYY"
  volumeHL: number;
  registradoPor: string;
  registradoEm: string;
  origem: 'ADMIN_21H' | 'MANUAL' | 'CSV' | 'CONFERENTE_TURNO';
  empresaId: string;
}

export interface WlpMontagemRecord {
  id: string;
  dataISO: string;
  dataStr: string;
  mesAno: string;
  conferenteInicio: string;
  horaInicio: string; // "18:00"
  status: 'EM_ANDAMENTO' | 'FINALIZADA';
  conferenteFim?: string;
  horaFim?: string;   // "01:30" or "07:30"
  duracaoHoras?: number;
  finalizadoPelaManha?: boolean;
  volumeHL?: number;
  qtdColaboradores?: number;
  empresaId: string;
  observacoes?: string;
  criadoEm: string;
}

export interface WlpDesvioItem {
  id: string;
  dataISO: string;
  dataStr: string;
  colaboradorNome?: string;
  tipo: 'HORA_EXTRA_INDIVIDUAL' | 'HORA_EXTRA_VOLUME_BAIXO' | 'MONTAGEM_ESTENDIDA_MANHA' | 'EXCESSO_JORNADA_SEMANAL' | 'WLP_ABAIXO_META_DPO';
  severidade: 'ALTA' | 'MEDIA' | 'CRITICA';
  titulo: string;
  descricao: string;
  volumeDiaHL: number;
  horasTrabalhadas: number;
  metaDpoHLHH: number;
  acaoRecomendada: string;
}

// Storage for WLP Montagens
export function getStoredMontagens(empresaId: string = 'demo'): WlpMontagemRecord[] {
  const key = `wlp_montagens_${empresaId}`;
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}

  return [
    {
      id: 'montagem-seed-1',
      dataISO: '2026-08-08',
      dataStr: '08/08/2026',
      mesAno: '08/2026',
      conferenteInicio: 'MARIVALDO ARTUR (NOITE)',
      horaInicio: '18:00',
      status: 'FINALIZADA',
      conferenteFim: 'MARIVALDO ARTUR (NOITE)',
      horaFim: '01:30',
      duracaoHoras: 7.5,
      finalizadoPelaManha: false,
      volumeHL: 680.5,
      qtdColaboradores: 7,
      empresaId: 'demo',
      observacoes: 'Montagem noturna dentro do horário planejado.',
      criadoEm: new Date().toISOString()
    }
  ];
}

export function saveMontagemRecord(record: WlpMontagemRecord): void {
  const empresaId = record.empresaId || 'demo';
  const key = `wlp_montagens_${empresaId}`;
  const current = getStoredMontagens(empresaId);
  const idx = current.findIndex(m => m.id === record.id);

  let updated: WlpMontagemRecord[];
  if (idx >= 0) {
    updated = [...current];
    updated[idx] = record;
  } else {
    updated = [record, ...current];
  }

  localStorage.setItem(key, JSON.stringify(updated));

  if (db) {
    try {
      const docRef = doc(db, 'wlp_montagens', record.id);
      setDoc(docRef, record, { merge: true }).catch(console.warn);
    } catch (e) {}
  }

  window.dispatchEvent(new Event('wlp_montagem_updated'));
  window.dispatchEvent(new Event('storage'));
}

export function finalizarMontagemRecord(
  id: string,
  conferenteFim: string,
  horaFim: string,
  finalizadoPelaManha: boolean = false,
  empresaId: string = 'demo'
): void {
  const list = getStoredMontagens(empresaId);
  const target = list.find(m => m.id === id);
  if (!target) return;

  const [h1, m1] = target.horaInicio.split(':').map(Number);
  const [h2, m2] = horaFim.split(':').map(Number);
  let mins1 = h1 * 60 + m1;
  let mins2 = h2 * 60 + m2;
  if (mins2 < mins1) mins2 += 24 * 60;
  const dur = parseFloat(((mins2 - mins1) / 60).toFixed(2));

  const updatedRec: WlpMontagemRecord = {
    ...target,
    status: 'FINALIZADA',
    conferenteFim,
    horaFim,
    duracaoHoras: dur,
    finalizadoPelaManha
  };

  saveMontagemRecord(updatedRec);
}

// Default initial daily faturados
const DEFAULT_DAILY_FATURADO_SEED: WlpDailyFaturadoRecord[] = [
  {
    id: 'fat-seed-1',
    dataISO: '2026-08-08',
    dataStr: '08/08/2026',
    mesAno: '08/2026',
    volumeHL: 680.5,
    registradoPor: 'Administrativo / Faturamento 21h',
    registradoEm: new Date().toISOString(),
    origem: 'ADMIN_21H',
    empresaId: 'demo'
  },
  {
    id: 'fat-seed-2',
    dataISO: '2026-08-07',
    dataStr: '07/08/2026',
    mesAno: '08/2026',
    volumeHL: 310.0, // Low volume day
    registradoPor: 'Administrativo / Faturamento 21h',
    registradoEm: new Date().toISOString(),
    origem: 'ADMIN_21H',
    empresaId: 'demo'
  }
];

export function getStoredDailyFaturado(empresaId: string = 'demo'): WlpDailyFaturadoRecord[] {
  const key = `wlp_daily_faturado_${empresaId}`;
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}

  localStorage.setItem(key, JSON.stringify(DEFAULT_DAILY_FATURADO_SEED));
  return DEFAULT_DAILY_FATURADO_SEED;
}

export function saveDailyFaturadoRecord(record: WlpDailyFaturadoRecord): void {
  const empresaId = record.empresaId || 'demo';
  const key = `wlp_daily_faturado_${empresaId}`;
  const current = getStoredDailyFaturado(empresaId);
  const existingIdx = current.findIndex(r => r.dataISO === record.dataISO);

  let updated: WlpDailyFaturadoRecord[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = record;
  } else {
    updated = [record, ...current];
  }

  localStorage.setItem(key, JSON.stringify(updated));

  if (db) {
    try {
      const docRef = doc(db, 'wlp_daily_faturado', record.id);
      setDoc(docRef, record, { merge: true }).catch(console.warn);
    } catch (e) {}
  }

  window.dispatchEvent(new Event('wlp_faturado_updated'));
  window.dispatchEvent(new Event('storage'));
}

export function deleteDailyFaturadoRecord(id: string, empresaId: string = 'demo'): void {
  const key = `wlp_daily_faturado_${empresaId}`;
  const current = getStoredDailyFaturado(empresaId);
  const updated = current.filter(r => r.id !== id);
  localStorage.setItem(key, JSON.stringify(updated));

  if (db) {
    try {
      deleteDoc(doc(db, 'wlp_daily_faturado', id)).catch(console.warn);
    } catch (e) {}
  }

  window.dispatchEvent(new Event('wlp_faturado_updated'));
  window.dispatchEvent(new Event('storage'));
}

/**
 * DPO Deviation Detector for WLP
 * Analyzes daily journeys against daily faturado HL.
 * Rule 1: In days with low volume (e.g. < 500 HL), OVERTIME IS STRICTLY FORBIDDEN.
 * Rule 2: Exceeding 44h weekly limit / 7.33h daily standard limit without volume justification.
 * Rule 3: Daily WLP < Meta DPO (e.g. 25 HL/HH).
 */
/**
 * DPO Deviation Detector for WLP
 * Analyzes daily journeys against daily faturado HL and Assembly Records.
 * Rule 1: Individual Overtime > 7.33h daily standard limit.
 * Rule 2: Assembly finished by Morning Shift (Montagem Estendida para o dia seguinte).
 * Rule 3: In days with low volume (< 450 HL), OVERTIME IS STRICTLY FORBIDDEN.
 * Rule 4: Daily WLP < Meta DPO (e.g. 25 HL/HH).
 */
export function detectWlpDesvios(
  jornadas: JornadaRecord[],
  dailyFaturados: WlpDailyFaturadoRecord[],
  metaDpoHLHH: number = 25.0,
  volumeBaixoLimiteHL: number = 450.0,
  empresaId: string = 'demo'
): WlpDesvioItem[] {
  const desvios: WlpDesvioItem[] = [];

  // Group journeys by date
  const jornadasPorData = new Map<string, JornadaRecord[]>();
  jornadas.forEach(j => {
    const list = jornadasPorData.get(j.dataISO) || [];
    list.push(j);
    jornadasPorData.set(j.dataISO, list);
  });

  // Check each date for journeys
  jornadasPorData.forEach((dayJourneys, dataISO) => {
    const fatRec = dailyFaturados.find(f => f.dataISO === dataISO);
    const volumeHL = fatRec ? fatRec.volumeHL : 0;
    const dataStr = dayJourneys[0]?.dataStr || dataISO;

    const totalHorasDia = dayJourneys.reduce((acc, curr) => acc + (curr.duracaoHoras || 0), 0);

    // Check individual collaborator overtime (> 7.33h / dia)
    dayJourneys.forEach(j => {
      if (j.duracaoHoras > 7.33) {
        const hsExtra = (j.duracaoHoras - 7.33).toFixed(2);
        
        if (volumeHL > 0 && volumeHL < volumeBaixoLimiteHL) {
          desvios.push({
            id: `desvio-he-bv-${j.id}`,
            dataISO,
            dataStr,
            colaboradorNome: j.colaboradorNome,
            tipo: 'HORA_EXTRA_VOLUME_BAIXO',
            severidade: 'CRITICA',
            titulo: `HORA EXTRA PROIBIDA (DPO) — Volume Baixo (${volumeHL} HL)`,
            descricao: `O colaborador ${j.colaboradorNome} realizou ${j.duracaoHoras.toFixed(2)}h (+${hsExtra}h extra) em um dia com faturamento de apenas ${volumeHL} HL (Abaixo do limite DPO de ${volumeBaixoLimiteHL} HL).`,
            volumeDiaHL: volumeHL,
            horasTrabalhadas: j.duracaoHoras,
            metaDpoHLHH,
            acaoRecomendada: 'Proibir horas extras em dias de faturamento reduzido para mitigar estouro de orçamento DPO.'
          });
        } else {
          desvios.push({
            id: `desvio-he-ind-${j.id}`,
            dataISO,
            dataStr,
            colaboradorNome: j.colaboradorNome,
            tipo: 'HORA_EXTRA_INDIVIDUAL',
            severidade: 'MEDIA',
            titulo: `DESVIO HORA EXTRA (> 7,33H) — ${j.colaboradorNome}`,
            descricao: `Carga horária realizada de ${j.duracaoHoras.toFixed(2)}h excedeu o padrão diário de 7,33h (+${hsExtra}h extras acumuladas).`,
            volumeDiaHL: volumeHL,
            horasTrabalhadas: j.duracaoHoras,
            metaDpoHLHH,
            acaoRecomendada: 'Verificar se a hora extra foi autorizada pela gestão e compensar banco de horas.'
          });
        }
      }
    });

    // Check daily WLP vs Meta DPO
    if (volumeHL > 0 && totalHorasDia > 0) {
      const wlpDia = volumeHL / totalHorasDia;
      if (wlpDia < metaDpoHLHH) {
        desvios.push({
          id: `desvio-wlp-meta-${dataISO}`,
          dataISO,
          dataStr,
          tipo: 'WLP_ABAIXO_META_DPO',
          severidade: wlpDia < metaDpoHLHH * 0.7 ? 'CRITICA' : 'ALTA',
          titulo: `WLP DIA ABAIXO DA META DPO (${wlpDia.toFixed(2)} HL/HH)`,
          descricao: `A produtividade WLP do dia ${dataStr} ficou em ${wlpDia.toFixed(2)} HL/HH, abaixo da meta DPO de ${metaDpoHLHH} HL/HH. Volume: ${volumeHL} HL | Horas Totais: ${totalHorasDia.toFixed(1)} HH.`,
          volumeDiaHL: volumeHL,
          horasTrabalhadas: totalHorasDia,
          metaDpoHLHH,
          acaoRecomendada: 'Adequar escala de mão de obra ao volume real expedido para manter a eficiência.'
        });
      }
    }
  });

  // Check assembly extensions (Montagens finalizadas pela manhã)
  const montagens = getStoredMontagens(empresaId);
  montagens.forEach(m => {
    if (m.finalizadoPelaManha || (m.horaFim && m.horaFim > '06:00' && m.horaFim < '12:00')) {
      desvios.push({
        id: `desvio-montagem-manha-${m.id}`,
        dataISO: m.dataISO,
        dataStr: m.dataStr,
        tipo: 'MONTAGEM_ESTENDIDA_MANHA',
        severidade: 'ALTA',
        titulo: `DESVIO WLP — MONTAGEM ESTENDIDA PARA O TIME DA MANHÃ`,
        descricao: `A montagem iniciada por ${m.conferenteInicio} precisou ser finalizada pelo time/conferente da manhã (${m.conferenteFim || 'Time Manhã'}) às ${m.horaFim || '07:30'}, impactando a produtividade do dia seguinte.`,
        volumeDiaHL: m.volumeHL || 0,
        horasTrabalhadas: m.duracaoHoras || 0,
        metaDpoHLHH,
        acaoRecomendada: 'Rever ritmo de separação noturna e balanceamento de rotas para concluir 100% da montagem no turno da noite.'
      });
    }
  });

  return desvios;
}

/**
 * EXCEL / CSV MODEL EXPORTER
 * Downloads an official template spreadsheet (.xlsx) for retroactive data entry from 2026 onwards.
 */
export function exportWlpModelExcel(): void {
  const sampleData = [
    {
      "Data (DD/MM/AAAA)": "02/01/2026",
      "Volume Faturado (HL)": 650.0,
      "Nome Colaborador": "MARIVALDO ARTUR ALVES",
      "Cargo": "Conferente",
      "Hora Inicio (HH:MM)": "07:00",
      "Hora Fim (HH:MM)": "16:20",
      "Observações": "Abertura do ano / Faturamento normal"
    },
    {
      "Data (DD/MM/AAAA)": "02/01/2026",
      "Volume Faturado (HL)": 650.0,
      "Nome Colaborador": "NIXON HENRIQUE PEREIRA",
      "Cargo": "Empilhador",
      "Hora Inicio (HH:MM)": "07:00",
      "Hora Fim (HH:MM)": "16:20",
      "Observações": "Movimentação de carga"
    },
    {
      "Data (DD/MM/AAAA)": "02/01/2026",
      "Volume Faturado (HL)": 650.0,
      "Nome Colaborador": "PAULO PEREIRA DA SILVA",
      "Cargo": "Ajudante",
      "Hora Inicio (HH:MM)": "18:00",
      "Hora Fim (HH:MM)": "01:30",
      "Observações": "Montagem noturna"
    },
    {
      "Data (DD/MM/AAAA)": "03/01/2026",
      "Volume Faturado (HL)": 420.0,
      "Nome Colaborador": "JOAO BATISTA DOS SANTOS",
      "Cargo": "Ajudante",
      "Hora Inicio (HH:MM)": "07:00",
      "Hora Fim (HH:MM)": "16:20",
      "Observações": "Dia de volume reduzido"
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Modelo_WLP_Retroativo");

  // Write file and trigger download
  XLSX.writeFile(workbook, "Modelo_Importacao_WLP_Jornadas_2026.xlsx");
}

/**
 * EXCEL / CSV IMPORTER
 * Parses uploaded .xlsx, .xls, .csv files containing retroactive journey & faturado data.
 */
export async function importWlpExcelData(
  file: File,
  empresaId: string = 'demo'
): Promise<{ jornadasCount: number; faturadosCount: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rows || rows.length === 0) {
          throw new Error('A planilha importada está vazia.');
        }

        const newJornadas: JornadaRecord[] = [];
        const faturadosMap = new Map<string, number>();

        rows.forEach((row, idx) => {
          // Normalize column names
          const dataVal = row['Data (DD/MM/AAAA)'] || row['Data'] || row['data'] || row['DATA'] || '';
          const volumeVal = row['Volume Faturado (HL)'] || row['Volume HL'] || row['Volume'] || row['volume'] || 0;
          const colabNome = row['Nome Colaborador'] || row['Colaborador'] || row['Nome'] || row['nome'] || '';
          const cargoVal = row['Cargo'] || row['cargo'] || 'Ajudante';
          const horaInicioVal = row['Hora Inicio (HH:MM)'] || row['Hora Inicio'] || row['Inicio'] || '07:00';
          const horaFimVal = row['Hora Fim (HH:MM)'] || row['Hora Fim'] || row['Fim'] || '16:20';
          const obsVal = row['Observações'] || row['Observacao'] || row['Obs'] || 'Importado via planilha retroativa';

          if (!dataVal || !colabNome) return; // skip empty rows

          // Parse Data DD/MM/YYYY
          let dataStr = String(dataVal).trim();
          let dataISO = '';
          if (dataStr.includes('/')) {
            const parts = dataStr.split('/');
            if (parts.length === 3) {
              const day = parts[0].padStart(2, '0');
              const month = parts[1].padStart(2, '0');
              const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
              dataStr = `${day}/${month}/${year}`;
              dataISO = `${year}-${month}-${day}`;
            }
          } else if (dataStr.includes('-')) {
            dataISO = dataStr;
            const parts = dataStr.split('-');
            if (parts.length === 3) {
              dataStr = `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
          }

          if (!dataISO) return;

          const mesAno = `${dataStr.split('/')[1]}/${dataStr.split('/')[2]}`;

          // Calculate duration hours
          const [h1, m1] = String(horaInicioVal).split(':').map(Number);
          const [h2, m2] = String(horaFimVal).split(':').map(Number);
          let mins1 = (isNaN(h1) ? 7 : h1) * 60 + (isNaN(m1) ? 0 : m1);
          let mins2 = (isNaN(h2) ? 16 : h2) * 60 + (isNaN(m2) ? 20 : m2);
          if (mins2 < mins1) mins2 += 24 * 60;
          const duracaoHoras = parseFloat(((mins2 - mins1) / 60).toFixed(2));

          const volNum = Number(volumeVal) || 0;

          if (volNum > 0) {
            faturadosMap.set(dataISO, volNum);
          }

          newJornadas.push({
            id: `jrn-imp-${dataISO}-${idx}-${Date.now()}`,
            colaboradorNome: String(colabNome).trim().toUpperCase(),
            cargo: String(cargoVal).trim(),
            dataStr,
            dataISO,
            mesAno,
            horaInicio: String(horaInicioVal).trim(),
            horaFim: String(horaFimVal).trim(),
            duracaoHoras,
            empresaId,
            observacoes: String(obsVal).trim(),
            criadoEm: new Date().toISOString()
          });
        });

        // Save journeys
        if (newJornadas.length > 0) {
          saveMultipleJornadas(newJornadas, empresaId);
        }

        // Save faturados
        let fatCount = 0;
        faturadosMap.forEach((volHL, dataISO) => {
          const parts = dataISO.split('-');
          const dataStr = `${parts[2]}/${parts[1]}/${parts[0]}`;
          const mesAno = `${parts[1]}/${parts[0]}`;

          saveDailyFaturadoRecord({
            id: `fat-imp-${dataISO}`,
            dataISO,
            dataStr,
            mesAno,
            volumeHL: volHL,
            registradoPor: 'Importação Retroativa Excel',
            registradoEm: new Date().toISOString(),
            origem: 'CSV',
            empresaId
          });
          fatCount++;
        });

        resolve({
          jornadasCount: newJornadas.length,
          faturadosCount: fatCount
        });

      } catch (err: any) {
        reject(err?.message || 'Erro ao processar planilha Excel.');
      }
    };

    reader.onerror = () => reject('Erro ao ler o arquivo.');
    reader.readAsArrayBuffer(file);
  });
}

export function calculateWlpMetrics(
  jornadasMonth: JornadaRecord[],
  config: WlpMonthlyConfig
) {
  const { volumeFaturadoHL, diasUteisTrabalhados, quadroPessoalTTQLP, horasTurnoPadrao, metaWlp } = config;

  // 1. Calculate standard denominator from formula: TT QLP * 7.33 * Dias Úteis
  const ttQlp = quadroPessoalTTQLP > 0 ? quadroPessoalTTQLP : 1;
  const totalHorasPadraoFormula = ttQlp * horasTurnoPadrao * (diasUteisTrabalhados > 0 ? diasUteisTrabalhados : 1);

  // 2. Calculate actual registered worked hours from collaborator start and end shift points
  const actualHoursSum = jornadasMonth.reduce((acc, curr) => acc + (curr.duracaoHoras || 0), 0);

  // If we have registered journey points, use actual registered hours, otherwise fallback to formula
  const effectiveTotalHours = actualHoursSum > 0 ? actualHoursSum : totalHorasPadraoFormula;

  // WLP = Volume total faturado (HL) / Total Horas Operacionais (HH)
  const wlpCalculado = effectiveTotalHours > 0 ? volumeFaturadoHL / effectiveTotalHours : 0;

  // Calculate Average Hours worked per collaborator
  const uniqueColabs = new Set(jornadasMonth.map(j => j.colaboradorNome));
  const colabCount = uniqueColabs.size || ttQlp;
  const mediaHorasPorColaborador = colabCount > 0 ? effectiveTotalHours / colabCount : 0;

  const percentualMeta = metaWlp > 0 ? (wlpCalculado / metaWlp) * 100 : 0;

  return {
    volumeFaturadoHL,
    diasUteisTrabalhados,
    ttQlp,
    horasTurnoPadrao,
    totalHorasPadraoFormula,
    actualHoursSum,
    effectiveTotalHours,
    wlpCalculado,
    metaWlp,
    percentualMeta,
    colabCount,
    mediaHorasPorColaborador
  };
}
