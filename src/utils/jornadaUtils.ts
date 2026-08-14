import { db } from '../firebase';
import { collection, addDoc, getDocs, doc, setDoc, deleteDoc, query } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { LISTA_COLABORADORES_OFICIAIS } from '../components/RankingModule';
import { normalizeCollaboratorName, getCollaboratorOfficialInfo, registerQuickCollaborator } from './colaboradorUtils';
import {
  parseRetroactiveText,
  WLP_METAS_OFICIAIS_2026,
  WLP_ACUMULADO_ANO_2026,
  WLP_EXCECOES_FERIAS,
  getHeadcountEsperado,
  getMetaOficialMes
} from '../data/wlpRetroactiveData';

export interface JornadaRecord {
  id: string;
  colaboradorId?: string;
  colaboradorNome: string;
  cargo: 'Conferente' | 'Empilhador' | 'Ajudante' | 'Operacional' | 'Administrativo' | string;
  dataStr: string; // "DD/MM/YYYY"
  dataISO: string; // "YYYY-MM-DD"
  mesAno: string;  // "MM/YYYY"
  horaInicio: string; // "HH:MM"
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

/**
 * Helper to normalize MM/YYYY with optional dataISO fallback (e.g. '1/2026' -> '01/2026', '2026-03-15' -> '03/2026')
 */
export function normalizeMesAnoStr(str?: string, dataISO?: string): string {
  let clean = (str || '').trim();
  if (!clean && dataISO) {
    const parts = dataISO.split('-');
    if (parts.length >= 2) {
      clean = `${parts[1]}/${parts[0]}`;
    }
  }
  if (!clean) return '';
  if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length === 2) {
      return `${parts[0].padStart(2, '0')}/${parts[1].length === 2 ? `20${parts[1]}` : parts[1]}`;
    }
  } else if (clean.includes('-')) {
    const parts = clean.split('-');
    if (parts.length === 2) {
      if (parts[0].length === 4) {
        return `${parts[1].padStart(2, '0')}/${parts[0]}`;
      } else {
        return `${parts[0].padStart(2, '0')}/${parts[1].length === 2 ? `20${parts[1]}` : parts[1]}`;
      }
    }
  }
  return clean;
}

/**
 * Verificação de Exclusão de WLP (Administrativo + Férias/Afastamentos retroativos)
 */
export function isColaboradorExcluidoWlp(colaboradorNome: string, mesNum: number, cargo?: string): { excluido: boolean; motivo?: string } {
  const norm = normalizeCollaboratorName(colaboradorNome).toUpperCase();

  const official = LISTA_COLABORADORES_OFICIAIS.find(c => c.nome === norm);
  const actualCargo = cargo || official?.cargo || '';
  if (actualCargo.toUpperCase() === 'ADMINISTRATIVO') {
    return { excluido: true, motivo: 'Perfil Administrativo (não entra no WLP)' };
  }

  // Exceções retroativas oficiais
  if (mesNum === 2 && norm.includes('MARIVALDO')) {
    return { excluido: true, motivo: 'Férias em Fevereiro (Marivaldo Empilhador)' };
  }

  return { excluido: false };
}

/**
 * Checks if a date falls on a Saturday.
 */
export function isSaturdayDate(dataISO: string, dataStr?: string): boolean {
  if (!dataISO && !dataStr) return false;
  let y = 0, m = 0, d = 0;
  if (dataISO && dataISO.includes('-')) {
    const parts = dataISO.split('-').map(Number);
    if (parts.length === 3) { y = parts[0]; m = parts[1]; d = parts[2]; }
  } else if (dataStr && dataStr.includes('/')) {
    const parts = dataStr.split('/').map(Number);
    if (parts.length === 3) { d = parts[0]; m = parts[1]; y = parts[2]; }
  }
  if (!y || !m || !d) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getDay() === 6; // 6 = Saturday
}

/**
 * Validates if a Saturday is explicitly allowed for WLP:
 * 1. 2 Saturdays preceding Carnival 2026: 07/02/2026 and 14/02/2026
 * 2. 1 Saturday preceding June 23: 20/06/2026
 * 3. Saturday on 01/07 (01/07/2026 or 01/08/2026)
 */
export function isAllowedSaturday(dataISO: string, dataStr?: string): boolean {
  if (!isSaturdayDate(dataISO, dataStr)) return false;

  let iso = dataISO || '';
  let str = dataStr || '';
  if (iso && !str && iso.includes('-')) {
    const p = iso.split('-');
    if (p.length === 3) str = `${p[2].padStart(2, '0')}/${p[1].padStart(2, '0')}/${p[0]}`;
  } else if (str && !iso && str.includes('/')) {
    const p = str.split('/');
    if (p.length === 3) iso = `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
  }

  const allowedIso = ['2026-02-07', '2026-02-14', '2026-06-20', '2026-07-01', '2026-08-01'];
  const allowedStr = ['07/02/2026', '14/02/2026', '20/06/2026', '01/07/2026', '01/08/2026'];
  const dayMonth = str.substring(0, 5); // "DD/MM"

  if (allowedIso.includes(iso) || allowedStr.includes(str) || dayMonth === '01/07' || dayMonth === '01/08') {
    return true;
  }
  return false;
}

export function isDisallowedSaturday(dataISO: string, dataStr?: string): boolean {
  if (isSaturdayDate(dataISO, dataStr)) {
    return !isAllowedSaturday(dataISO, dataStr);
  }
  return false;
}

// Seed retroativo automático gerado a partir do dataset do usuário
function buildRetroactiveSeedJornadas(empresaId: string = 'demo'): {
  jornadas: JornadaRecord[];
  faturados: WlpDailyFaturadoRecord[];
} {
  const rawList = parseRetroactiveText();
  const jornadas: JornadaRecord[] = [];
  const faturadosMap = new Map<string, number>();

  rawList.forEach((item, idx) => {
    // Parse Date DD/MM/YYYY
    const parts = item.data.split('/');
    if (parts.length !== 3) return;
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
    const dataISO = `${year}-${month}-${day}`;
    const dataStr = `${day}/${month}/${year}`;
    const mesAno = `${month}/${year}`;

    // Descarte rigoroso de Sábados não permitidos
    if (isDisallowedSaturday(dataISO, dataStr)) {
      return;
    }

    const normName = normalizeCollaboratorName(item.colaborador);
    const official = LISTA_COLABORADORES_OFICIAIS.find(c => c.nome === normName);
    const cargo = item.cargo || official?.cargo || 'AJUDANTE';

    // Duracao horas com deducao de intervalo
    const dur = calcularDuracaoHorasComIntervalo(item.horaInicio, item.horaFim || item.horaInicio);

    if (item.volumeHl > 0) {
      faturadosMap.set(dataISO, item.volumeHl);
    }

    jornadas.push({
      id: `jrn-retro-${dataISO}-${idx}`,
      colaboradorNome: normName,
      cargo,
      dataStr,
      dataISO,
      mesAno,
      horaInicio: item.horaInicio,
      horaFim: item.horaFim || item.horaInicio,
      duracaoHoras: dur,
      empresaId,
      observacoes: item.observacoes || 'Apontamento oficial retroativo 2026',
      criadoEm: '2026-08-12T00:00:00.000Z'
    });
  });

  const faturados: WlpDailyFaturadoRecord[] = [];
  faturadosMap.forEach((volHL, dataISO) => {
    const parts = dataISO.split('-');
    const dataStr = `${parts[2]}/${parts[1]}/${parts[0]}`;
    const mesAno = `${parts[1]}/${parts[0]}`;
    faturados.push({
      id: `fat-retro-${dataISO}`,
      dataISO,
      dataStr,
      mesAno,
      volumeHL: volHL,
      registradoPor: 'Faturamento Oficial 2026',
      registradoEm: '2026-08-12T00:00:00.000Z',
      origem: 'CSV',
      empresaId
    });
  });

  return { jornadas, faturados };
}

const SEED_TAG_V9 = 'colaboradores_jornadas_seed_v2026_08_v11_abril_complete';

let firestoreCleaned = false;
export function cleanFirestoreSyntheticData(): void {
  if (!db || firestoreCleaned) return;
  firestoreCleaned = true;
  try {
    getDocs(collection(db, 'jornadas_colaboradores')).then(querySnapshot => {
      querySnapshot.forEach(docSnap => {
        if (docSnap.id.startsWith('jrn-gen-')) {
          deleteDoc(doc(db, 'jornadas_colaboradores', docSnap.id)).catch(console.warn);
        }
      });
    }).catch(console.warn);
  } catch (e) {
    console.warn('Erro ao limpar Firestore synthetic data:', e);
  }
}

/**
 * Clear all WLP data (cache and local storage and cloud database)
 */
export function clearAllWlpData(empresaId: string = 'demo'): void {
  try {
    const keysToRemove = [
      `colaboradores_jornadas_${empresaId}`,
      `jornadas_colaboradores_${empresaId}`,
      `wlp_permanent_imported_dataset_${empresaId}`,
      `wlp_daily_faturados_${empresaId}`,
      `wlp_daily_faturado_${empresaId}`,
      `wlp_quick_colabs_${empresaId}`,
      SEED_TAG_V9,
      'wlp_seed_tag_v8',
      'wlp_seed_tag_v7',
      'wlp_seed_tag_v6',
      'wlp_seed_tag_v5'
    ];

    keysToRemove.forEach(k => localStorage.removeItem(k));
    localStorage.setItem(`wlp_user_cleared_${empresaId}`, 'true');

    if (db) {
      try {
        const qJrn = query(collection(db, 'jornadas_colaboradores'));
        getDocs(qJrn).then(snap => {
          snap.forEach(docSnap => {
            deleteDoc(doc(db, 'jornadas_colaboradores', docSnap.id)).catch(() => {});
          });
        }).catch(() => {});

        const qFat = query(collection(db, 'wlp_daily_faturados'));
        getDocs(qFat).then(snap => {
          snap.forEach(docSnap => {
            deleteDoc(doc(db, 'wlp_daily_faturados', docSnap.id)).catch(() => {});
          });
        }).catch(() => {});
      } catch (e) {}
    }

    window.dispatchEvent(new Event('jornadas_updated'));
    window.dispatchEvent(new CustomEvent('jornadas_updated'));
    window.dispatchEvent(new Event('wlp_faturado_updated'));
    window.dispatchEvent(new CustomEvent('wlp_faturado_updated'));
    window.dispatchEvent(new Event('wlp_config_updated'));
    window.dispatchEvent(new Event('local_data_changed'));
    window.dispatchEvent(new Event('storage'));
  } catch (e) {
    console.error('Erro ao limpar dados do WLP:', e);
  }
}

/**
 * Clear WLP data specifically for a single month (e.g., "08/2026")
 */
export function clearWlpMonthData(empresaId: string = 'demo', targetMesAno: string): void {
  if (!targetMesAno) return;
  const keyJrn = `colaboradores_jornadas_${empresaId}`;
  const keyJrnAlt = `jornadas_colaboradores_${empresaId}`;
  const keyFat1 = `wlp_daily_faturados_${empresaId}`;
  const keyFat2 = `wlp_daily_faturado_${empresaId}`;
  const keyPerm = `wlp_permanent_imported_dataset_${empresaId}`;

  const parts = targetMesAno.split('/');
  const monthNum = parts[0] ? parts[0].padStart(2, '0') : '01';
  const yearNum = parts[1] || '2026';
  const prefixISO = `${yearNum}-${monthNum}`;

  const matchesMonth = (recordMesAno?: string, recordDataISO?: string, recordDataStr?: string) => {
    if (recordMesAno === targetMesAno) return true;
    if (recordDataStr && (recordDataStr.endsWith(`/${targetMesAno}`) || recordDataStr.endsWith(`/${monthNum}/${yearNum}`))) return true;
    if (recordDataISO && recordDataISO.startsWith(prefixISO)) return true;
    return false;
  };

  // 1. Filter local storage jornadas
  [keyJrn, keyJrnAlt].forEach(k => {
    try {
      const saved = localStorage.getItem(k);
      if (saved) {
        const parsed: JornadaRecord[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter(j => !matchesMonth(j.mesAno, j.dataISO, j.dataStr));
          localStorage.setItem(k, JSON.stringify(filtered));
        }
      } else {
        localStorage.setItem(k, JSON.stringify([]));
      }
    } catch (e) {}
  });

  // 2. Filter local storage daily faturados
  [keyFat1, keyFat2].forEach(k => {
    try {
      const saved = localStorage.getItem(k);
      if (saved) {
        const parsed: WlpDailyFaturadoRecord[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter(f => !matchesMonth(f.mesAno, f.dataISO, f.dataStr));
          localStorage.setItem(k, JSON.stringify(filtered));
        }
      } else {
        localStorage.setItem(k, JSON.stringify([]));
      }
    } catch (e) {}
  });

  // 3. Filter permanent dataset
  try {
    const saved = localStorage.getItem(keyPerm);
    if (saved) {
      const parsed: any[] = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter(p => !matchesMonth(p.mesAno, p.dataISO, p.dataStr));
        localStorage.setItem(keyPerm, JSON.stringify(filtered));
      }
    }
  } catch (e) {}

  // 4. Firestore docs deletion for target month
  if (db) {
    try {
      const qJrn = query(collection(db, 'jornadas_colaboradores'));
      getDocs(qJrn).then(snap => {
        snap.forEach(docSnap => {
          const d = docSnap.data();
          if (matchesMonth(d.mesAno, d.dataISO, d.dataStr)) {
            deleteDoc(doc(db, 'jornadas_colaboradores', docSnap.id)).catch(() => {});
          }
        });
      }).catch(() => {});

      const qFat = query(collection(db, 'wlp_daily_faturados'));
      getDocs(qFat).then(snap => {
        snap.forEach(docSnap => {
          const d = docSnap.data();
          if (matchesMonth(d.mesAno, d.dataISO, d.dataStr)) {
            deleteDoc(doc(db, 'wlp_daily_faturados', docSnap.id)).catch(() => {});
          }
        });
      }).catch(() => {});
    } catch (e) {}
  }

  window.dispatchEvent(new Event('jornadas_updated'));
  window.dispatchEvent(new CustomEvent('jornadas_updated'));
  window.dispatchEvent(new Event('wlp_faturado_updated'));
  window.dispatchEvent(new CustomEvent('wlp_faturado_updated'));
  window.dispatchEvent(new Event('wlp_config_updated'));
  window.dispatchEvent(new Event('local_data_changed'));
  window.dispatchEvent(new Event('storage'));
}

/**
 * Calculates shift duration in net hours deducting meal breaks:
 * - Bater ponto antes das 12:00 (horaInicio < "12:00"): abater 2.0 horas de intervalo
 * - Iniciar depois das 13:00 e encerramento até as 06:00: abater 1.0 hora de intervalo
 * - Demais turnos: abater 1.0 hora de intervalo
 */
export function calcularDuracaoHorasComIntervalo(horaInicio: string, horaFim: string): number {
  if (!horaInicio || !horaFim || !/^\d{1,2}:\d{2}$/.test(horaInicio) || !/^\d{1,2}:\d{2}$/.test(horaFim)) {
    return 0;
  }
  const [h1, m1] = horaInicio.split(':').map(Number);
  const [h2, m2] = horaFim.split(':').map(Number);
  let mins1 = h1 * 60 + m1;
  let mins2 = h2 * 60 + m2;
  let isOvernight = false;
  if (mins2 < mins1) {
    mins2 += 24 * 60; // Overnight shift
    isOvernight = true;
  }
  const diffMins = mins2 - mins1;
  const rawHours = diffMins / 60;

  // Dedução de Intervalo (Almoço/Janta/Descanso)
  // 1. Quem bate ponto antes das 12:00 (start < 12:00): abater 2.0h
  // 2. Quem inicia a partir das 13:00 e encerra até as 06:00 (start >= 13:00 e end <= 06:00): abater 1.0h
  let intervalHours = 1.0;
  if (mins1 < 12 * 60) {
    intervalHours = 2.0;
  } else if (mins1 >= 13 * 60 && (h2 < 6 || (h2 === 6 && m2 === 0) || isOvernight)) {
    intervalHours = 1.0;
  } else {
    intervalHours = 1.0;
  }

  const netHours = Math.max(0, rawHours - intervalHours);
  return parseFloat(netHours.toFixed(2));
}

export function getStoredJornadas(empresaId: string = 'demo'): JornadaRecord[] {
  const key = `colaboradores_jornadas_${empresaId}`;
  const isUserCleared = localStorage.getItem(`wlp_user_cleared_${empresaId}`) === 'true';
  let baseJornadas: JornadaRecord[] = [];

  try {
    const saved = localStorage.getItem(key) || localStorage.getItem(`jornadas_colaboradores_${empresaId}`);
    if (saved !== null) {
      let parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        baseJornadas = parsed.filter((j: JornadaRecord) => j && j.id && !j.id.startsWith('jrn-gen-'));
      }
    }
  } catch (e) {}

  if (isUserCleared && baseJornadas.length === 0) {
    return [];
  }

  // Self-healing: Merge with the official retroactive seed dataset (January, February 2026, etc.)
  // If the user has not explicitly cleared data, ensure all official days and journeys are present
  if (!isUserCleared) {
    const seed = buildRetroactiveSeedJornadas(empresaId);
    const existingMap = new Map<string, JornadaRecord>();

    // Seed first
    seed.jornadas.forEach(sj => {
      const norm = normalizeCollaboratorName(sj.colaboradorNome);
      existingMap.set(`${sj.dataISO}__${norm}`, sj);
    });

    // Overwrite with stored/imported journeys (user modifications take priority)
    baseJornadas.forEach(bj => {
      const norm = normalizeCollaboratorName(bj.colaboradorNome);
      existingMap.set(`${bj.dataISO}__${norm}`, bj);
    });

    baseJornadas = Array.from(existingMap.values());
    try {
      localStorage.setItem(key, JSON.stringify(baseJornadas));
      localStorage.setItem(`jornadas_colaboradores_${empresaId}`, JSON.stringify(baseJornadas));
    } catch (e) {}
  }

  // Merge with permanent user imported datasets if any
  try {
    const permKey = `wlp_permanent_imported_dataset_${empresaId}`;
    const savedPerm = localStorage.getItem(permKey);
    if (savedPerm) {
      const permRows: any[] = JSON.parse(savedPerm);
      if (Array.isArray(permRows) && permRows.length > 0) {
        const existingMap = new Map<string, JornadaRecord>();
        baseJornadas.forEach(j => {
          const norm = normalizeCollaboratorName(j.colaboradorNome);
          existingMap.set(`${j.dataISO}__${norm}`, j);
        });

        permRows.forEach(pr => {
          const norm = normalizeCollaboratorName(pr.colaboradorNome);
          const k = `${pr.dataISO}__${norm}`;
          existingMap.set(k, {
            id: `jrn-${pr.dataISO}-${encodeURIComponent(norm).toLowerCase().replace(/%20/g, '-')}`,
            colaboradorNome: norm,
            cargo: pr.cargo || 'Ajudante',
            dataStr: pr.dataStr,
            dataISO: pr.dataISO,
            mesAno: pr.mesAno,
            horaInicio: pr.horaInicio,
            horaFim: pr.horaFim,
            duracaoHoras: pr.duracaoHoras,
            empresaId,
            observacoes: 'Registro importado salvo em código/banco',
            criadoEm: pr.importedAt || new Date().toISOString()
          });
        });

        baseJornadas = Array.from(existingMap.values());
      }
    }
  } catch (e) {}

  // Excluir rigorosamente todos os sábados que não foram expressamente autorizados
  return baseJornadas.filter(j => !isDisallowedSaturday(j.dataISO, j.dataStr));
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
    volumeFaturadoHL: 0,
    diasUteisTrabalhados: 0,
    quadroPessoalTTQLP: 0,
    horasTurnoPadrao: 7.33,
    metaWlp: getMetaOficialMes(mesAno)
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
  const key1 = `wlp_daily_faturados_${empresaId}`;
  const key2 = `wlp_daily_faturado_${empresaId}`;
  const isUserCleared = localStorage.getItem(`wlp_user_cleared_${empresaId}`) === 'true';
  let baseFaturados: WlpDailyFaturadoRecord[] = [];

  try {
    const saved = localStorage.getItem(key1) || localStorage.getItem(key2);
    if (saved) {
      let parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        baseFaturados = parsed.filter((f: WlpDailyFaturadoRecord) => 
          f && f.id && 
          !f.id.startsWith('jrn-gen-') && 
          !f.id.startsWith('fat-gen-') &&
          !isDisallowedSaturday(f.dataISO, f.dataStr)
        );
      }
    }
  } catch (e) {}

  if (isUserCleared && baseFaturados.length === 0) {
    return [];
  }

  // Self-healing: Merge with the official seed faturados (January, February 2026, etc.)
  if (!isUserCleared) {
    const seed = buildRetroactiveSeedJornadas(empresaId);
    const fatMap = new Map<string, WlpDailyFaturadoRecord>();

    // Seed first
    seed.faturados.forEach(sf => {
      if (!isDisallowedSaturday(sf.dataISO, sf.dataStr)) {
        fatMap.set(sf.dataISO, sf);
      }
    });

    // Stored/imported overrides seed
    baseFaturados.forEach(bf => {
      if (!isDisallowedSaturday(bf.dataISO, bf.dataStr)) {
        fatMap.set(bf.dataISO, bf);
      }
    });

    baseFaturados = Array.from(fatMap.values());
    try {
      localStorage.setItem(key1, JSON.stringify(baseFaturados));
      localStorage.setItem(key2, JSON.stringify(baseFaturados));
    } catch (e) {}
  }

  return baseFaturados;
}

export function saveDailyFaturadoRecord(record: WlpDailyFaturadoRecord): void {
  const empresaId = record.empresaId || 'demo';
  const key1 = `wlp_daily_faturados_${empresaId}`;
  const key2 = `wlp_daily_faturado_${empresaId}`;
  const current = getStoredDailyFaturado(empresaId);
  const existingIdx = current.findIndex(r => r.dataISO === record.dataISO);

  let updated: WlpDailyFaturadoRecord[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = record;
  } else {
    updated = [record, ...current];
  }

  localStorage.setItem(key1, JSON.stringify(updated));
  localStorage.setItem(key2, JSON.stringify(updated));

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
  const key1 = `wlp_daily_faturados_${empresaId}`;
  const key2 = `wlp_daily_faturado_${empresaId}`;
  const current = getStoredDailyFaturado(empresaId);
  const updated = current.filter(r => r.id !== id);

  localStorage.setItem(key1, JSON.stringify(updated));
  localStorage.setItem(key2, JSON.stringify(updated));

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

    // Check individual collaborator overtime
    dayJourneys.forEach(j => {
      // Extract month number from dataISO (e.g. "2026-03-15" -> 3) or mesAno
      const monthFromDate = parseInt(dataISO.split('-')[1], 10);
      const monthFromMesAno = j.mesAno ? parseInt(j.mesAno.split('/')[0], 10) : monthFromDate;
      const isCriticalPeriodMonth = monthFromDate === 3 || monthFromDate === 6 || monthFromDate === 12 || 
                                    monthFromMesAno === 3 || monthFromMesAno === 6 || monthFromMesAno === 12;

      // In Critical Months (Março, Junho e Dezembro), overtime up to +2h (7.33 + 2.0 = 9.33h) is permitted without deviation
      const overtimeToleranceHours = isCriticalPeriodMonth ? 9.33 : 7.33;

      if (j.duracaoHoras > overtimeToleranceHours) {
        const hsExtra = (j.duracaoHoras - 7.33).toFixed(2);
        
        if (volumeHL > 0 && volumeHL < volumeBaixoLimiteHL && !isCriticalPeriodMonth) {
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
          const limitText = isCriticalPeriodMonth 
            ? `excedeu o limite tolerado no Período Crítico de Pico (+2h HE / max 9,33h)`
            : `excedeu o padrão diário de 7,33h`;
            
          desvios.push({
            id: `desvio-he-ind-${j.id}`,
            dataISO,
            dataStr,
            colaboradorNome: j.colaboradorNome,
            tipo: 'HORA_EXTRA_INDIVIDUAL',
            severidade: isCriticalPeriodMonth ? 'ALTA' : 'MEDIA',
            titulo: `DESVIO HORA EXTRA EXCEDENTE (> ${isCriticalPeriodMonth ? '9,33h' : '7,33h'}) — ${j.colaboradorNome}`,
            descricao: `Carga horária realizada de ${j.duracaoHoras.toFixed(2)}h ${limitText} (+${hsExtra}h extras acumuladas).`,
            volumeDiaHL: volumeHL,
            horasTrabalhadas: j.duracaoHoras,
            metaDpoHLHH,
            acaoRecomendada: isCriticalPeriodMonth 
              ? 'Ajustar turno para não ultrapassar 2h de hora extra acima da jornada padrão de 7,33h no período crítico de pico.'
              : 'Verificar se a hora extra foi autorizada pela gestão e compensar banco de horas.'
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

export interface WlpPendenciaRow {
  lineNum: number;
  dataStr: string;
  dataISO: string;
  colaboradorNomeOriginal: string;
  colaboradorNomeNormalizado: string;
  cargo: string;
  horaInicio: string;
  horaFim: string;
  motivo: string;
  tipo: 'horario_incompleto' | 'colaborador_nao_cadastrado' | 'outro';
  observacoes?: string;
  isColaboradorNaoCadastrado?: boolean;
}

export interface WlpColabTempoMedio {
  colaboradorNome: string;
  cargo: string;
  totalHoras: number;
  diasCount: number;
  mediaHoras: number;
  isColaboradorNaoCadastrado?: boolean;
}

export interface WlpImportParsedRow {
  lineNum: number;
  dataStr: string;
  dataISO: string;
  mesAno: string;
  volumeFaturadoHL: number;
  colaboradorNomeOriginal: string;
  colaboradorNomeNormalizado: string;
  cargo: string;
  horaInicio: string;
  horaFim: string;
  duracaoHoras: number;
  isOvernight: boolean;
  observacoes: string;
  rendimentoDiaHL: number;
  isOverwrite: boolean;
  existingRecordId?: string;
  isColaboradorNaoCadastrado?: boolean;
}

export interface WlpCargoMedia {
  cargo: string;
  mediaHoras: number;
  totalHoras: number;
  count: number;
}

export interface WlpDiaRendimento {
  dataStr: string;
  dataISO: string;
  volumeHL: number;
  colabsCount: number;
  rendimentoHL: number;
}

export interface WlpImportPreviewResult {
  success: boolean;
  totalRows: number;
  importedCount: number;
  pendenciasCount: number;
  novosCount: number;
  sobrescreverCount: number;
  datasIntervalo: string;
  colaboradoresUnicosCount: number;
  tempoMedioGeralHoras: number;
  rendimentoMedioHL: number;
  mediaPorCargo: WlpCargoMedia[];
  tempoMedioPorColaborador: WlpColabTempoMedio[];
  rendimentoPorDia: WlpDiaRendimento[];
  rows: WlpImportParsedRow[];
  pendencias: WlpPendenciaRow[];
  colaboradoresNaoCadastrados: string[];
  warningLargeFile?: string;
  validationError?: string;
}

/**
 * Format volume value in Brazilian format ("536,06" -> 536.06)
 */
export function parseVolumeHLBR(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  let str = String(val).trim();
  if (str.includes(',') && str.includes('.')) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes(',')) {
    str = str.replace(',', '.');
  }
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format Excel time value to HH:MM string with support for ISO strings, floats, integers, and custom formats
 */
export function formatExcelTimeValue(val: any): string {
  if (val === null || val === undefined || val === '') return '';

  // 1. Date instance
  if (val instanceof Date && !isNaN(val.getTime())) {
    const h = String(val.getHours()).padStart(2, '0');
    const m = String(val.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  // 2. Numeric Excel time fraction (e.g. 0.8340277 -> 20:01) or integers (635 -> 06:35, 1551 -> 15:51)
  if (typeof val === 'number') {
    if (val >= 0 && val < 1) {
      const totalMins = Math.round(val * 24 * 60);
      const h = Math.floor(totalMins / 60) % 24;
      const m = Math.floor(totalMins % 60);
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    if (val >= 100 && val <= 2359) {
      const str = String(val).padStart(4, '0');
      const h = str.slice(0, 2);
      const m = str.slice(2);
      const hNum = parseInt(h, 10);
      const mNum = parseInt(m, 10);
      if (hNum >= 0 && hNum <= 23 && mNum >= 0 && mNum <= 59) {
        return `${h}:${m}`;
      }
    }
    if (val >= 0 && val <= 23) {
      return `${String(val).padStart(2, '0')}:00`;
    }
  }

  // 3. String value
  let str = String(val).trim();

  // Check if string contains ISO timestamp or date with time (e.g. "2026-02-02T20:01:00.000Z" or "2026-02-02 20:01:00" or "06:35:00")
  const timeRegex = /(?:T|\s|^)(\d{1,2})[:hH\.](\d{2})(?::\d{2})?/;
  const match = str.match(timeRegex);
  if (match) {
    const hNum = parseInt(match[1], 10);
    const mNum = parseInt(match[2], 10);
    if (hNum >= 0 && hNum <= 23 && mNum >= 0 && mNum <= 59) {
      return `${String(hNum).padStart(2, '0')}:${String(mNum).padStart(2, '0')}`;
    }
  }

  // If number as string (e.g. "0.8340" or "2001" or "8")
  const numVal = parseFloat(str);
  if (!isNaN(numVal)) {
    if (numVal >= 0 && numVal < 1) {
      const totalMins = Math.round(numVal * 24 * 60);
      const h = Math.floor(totalMins / 60) % 24;
      const m = Math.floor(totalMins % 60);
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    if (numVal >= 100 && numVal <= 2359 && !str.includes(':')) {
      const padded = str.padStart(4, '0');
      const h = padded.slice(0, 2);
      const m = padded.slice(2);
      return `${h}:${m}`;
    }
    if (numVal >= 0 && numVal <= 23 && !str.includes(':')) {
      return `${String(numVal).padStart(2, '0')}:00`;
    }
  }

  return str;
}

/**
 * Format Excel date value to { dataStr, dataISO, mesAno }
 */
export function formatExcelDateValue(val: any): { dataStr: string; dataISO: string; mesAno: string } | null {
  if (val === null || val === undefined || val === '') return null;

  if (val instanceof Date && !isNaN(val.getTime())) {
    const day = String(val.getDate()).padStart(2, '0');
    const month = String(val.getMonth() + 1).padStart(2, '0');
    const year = String(val.getFullYear());
    return {
      dataStr: `${day}/${month}/${year}`,
      dataISO: `${year}-${month}-${day}`,
      mesAno: `${month}/${year}`
    };
  }

  if (typeof val === 'number') {
    if (val > 1000000000000) {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = String(d.getFullYear());
        return {
          dataStr: `${day}/${month}/${year}`,
          dataISO: `${year}-${month}-${day}`,
          mesAno: `${month}/${year}`
        };
      }
    }

    try {
      const jd = XLSX.SSF.parse_date_code(val);
      if (jd && jd.y && jd.m && jd.d) {
        const day = String(jd.d).padStart(2, '0');
        const month = String(jd.m).padStart(2, '0');
        const year = String(jd.y);
        return {
          dataStr: `${day}/${month}/${year}`,
          dataISO: `${year}-${month}-${day}`,
          mesAno: `${month}/${year}`
        };
      }
    } catch (e) {}
  }

  // Clean ISO strings (e.g. "2026-03-15T00:00:00.000Z" -> "2026-03-15")
  let strVal = String(val).trim();
  if (strVal.includes('T')) {
    strVal = strVal.split('T')[0];
  } else if (strVal.includes(' ')) {
    const parts = strVal.split(' ');
    if (parts[0].includes('-') || parts[0].includes('/')) {
      strVal = parts[0];
    }
  }

  const str = strVal.replace(/\./g, '/').replace(/-/g, '/');
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) {
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10);
      const p2 = parseInt(parts[2], 10);

      let dayNum = 0;
      let monthNum = 0;
      let yearNum = 0;

      if (p0 > 1000) {
        // YYYY/MM/DD
        yearNum = p0;
        monthNum = p1;
        dayNum = p2;
      } else {
        // DD/MM/YYYY
        yearNum = p2 < 100 ? p2 + 2000 : p2;
        if (p0 >= 1 && p0 <= 31 && p1 >= 1 && p1 <= 12) {
          dayNum = p0;
          monthNum = p1;
        } else if (p0 >= 1 && p0 <= 12 && p1 >= 1 && p1 <= 31) {
          monthNum = p0;
          dayNum = p1;
        }
      }

      if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12 && yearNum >= 2000 && yearNum <= 2050) {
        const day = String(dayNum).padStart(2, '0');
        const month = String(monthNum).padStart(2, '0');
        const year = String(yearNum);
        return {
          dataStr: `${day}/${month}/${year}`,
          dataISO: `${year}-${month}-${day}`,
          mesAno: `${month}/${year}`
        };
      }
    }
  }

  return null;
}

/**
 * Universal JSON Flattener for WLP Journey Files
 * Unpacks nested objects, nested employee arrays, date-keyed structures, or simple arrays
 */
export function flattenJsonRows(parsedObj: any): any[] {
  if (!parsedObj) return [];
  if (typeof parsedObj === 'string') {
    try {
      parsedObj = JSON.parse(parsedObj);
    } catch (e) {
      return [];
    }
  }

  const result: any[] = [];

  const processRow = (item: any, parentContext: { data?: any; volume?: any; mesAno?: any } = {}) => {
    if (!item) return;

    if (typeof item === 'string') {
      const del = item.includes(';') ? ';' : (item.includes('\t') ? '\t' : ',');
      const parts = item.split(del).map(s => s.trim());
      if (parts.length >= 3) {
        result.push({
          data: parts[0] || parentContext.data,
          volume: parts[1] || parentContext.volume,
          colaborador: parts[2],
          cargo: parts[3] || 'Ajudante',
          horaInicio: parts[4] || parts[3],
          horaFim: parts[5] || parts[4]
        });
      }
      return;
    }

    if (typeof item !== 'object') return;

    const rowData = item.data || item.Data || item.DATA || item.dataISO || item.dataStr || item.dia || item.date || item.Date || parentContext.data;
    const rowVolume = item.volumeHL || item.volumeHl || item.volume || item.Volume || item.volumeFaturado || item.faturado || item['Volume Faturado (HL)'] || item['Volume Faturado'] || parentContext.volume;
    const rowMesAno = item.mesAno || item.mes || parentContext.mesAno;

    const nestedArray = item.colaboradores || item.pontos || item.jornadas || item.equipe || item.funcionarios || item.registros || item.items || item.quadro || item.operadores;
    if (Array.isArray(nestedArray) && nestedArray.length > 0) {
      nestedArray.forEach(sub => {
        processRow(sub, { data: rowData, volume: rowVolume, mesAno: rowMesAno });
      });
      return;
    }

    result.push({
      ...item,
      data: rowData,
      volume: rowVolume,
      mesAno: rowMesAno
    });
  };

  if (Array.isArray(parsedObj)) {
    parsedObj.forEach(item => processRow(item));
  } else if (typeof parsedObj === 'object') {
    let foundArray = false;
    for (const k of Object.keys(parsedObj)) {
      if (Array.isArray(parsedObj[k])) {
        parsedObj[k].forEach((sub: any) => processRow(sub));
        foundArray = true;
      }
    }

    if (!foundArray) {
      Object.keys(parsedObj).forEach(k => {
        const val = parsedObj[k];
        if (typeof val === 'object' && val !== null) {
          processRow(val, { data: k });
        }
      });
    }
  }

  return result;
}

/**
 * Deterministic client-side Excel/CSV/JSON parser for WLP retroactive journeys
 */
export async function parseWlpExcelFile(
  file: File,
  empresaId: string = 'demo'
): Promise<WlpImportPreviewResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    let warningLargeFile: string | undefined = undefined;
    if (file.size > 5 * 1024 * 1024) {
      warningLargeFile = `Atenção: O arquivo possui ${(file.size / 1024 / 1024).toFixed(1)}MB. Caso note lentidão ao importar, considere fracionar por meses.`;
    }

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        let workbook: XLSX.WorkBook;

        const isJson = file.name.toLowerCase().endsWith('.json');
        const isCsv = file.name.toLowerCase().endsWith('.csv');

        let rawJson: any[] = [];

        if (isJson) {
          let text = '';
          try {
            const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
            text = utf8Decoder.decode(buffer);
          } catch (utfErr) {
            const latinDecoder = new TextDecoder('windows-1252');
            text = latinDecoder.decode(buffer);
          }

          // Pre-sanitize invalid JS/Python JSON tokens like NaN, Infinity, -Infinity
          const sanitizedText = text
            .replace(/:\s*NaN\b/g, ': null')
            .replace(/:\s*Infinity\b/g, ': null')
            .replace(/:\s*-Infinity\b/g, ': null');

          try {
            const parsedObj = JSON.parse(sanitizedText);
            rawJson = flattenJsonRows(parsedObj);
          } catch (jsonErr: any) {
            return resolve({
              success: false,
              totalRows: 0,
              importedCount: 0,
              pendenciasCount: 0,
              novosCount: 0,
              sobrescreverCount: 0,
              datasIntervalo: '',
              colaboradoresUnicosCount: 0,
              tempoMedioGeralHoras: 0,
              rendimentoMedioHL: 0,
              mediaPorCargo: [],
              tempoMedioPorColaborador: [],
              rendimentoPorDia: [],
              rows: [],
              pendencias: [],
              colaboradoresNaoCadastrados: [],
              validationError: `Erro de formato no arquivo JSON: ${jsonErr.message || jsonErr}`
            });
          }
        } else if (isCsv) {
          // Decode with encoding tolerance (utf-8 or windows-1252 / latin-1)
          let text = '';
          try {
            const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
            text = utf8Decoder.decode(buffer);
          } catch (utfErr) {
            const latinDecoder = new TextDecoder('windows-1252');
            text = latinDecoder.decode(buffer);
          }
          workbook = XLSX.read(text, { type: 'string', raw: true });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        } else {
          const data = new Uint8Array(buffer);
          workbook = XLSX.read(data, { type: 'array', cellDates: true, cellText: true });
          if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            return resolve({
              success: false,
              totalRows: 0,
              importedCount: 0,
              pendenciasCount: 0,
              novosCount: 0,
              sobrescreverCount: 0,
              datasIntervalo: '',
              colaboradoresUnicosCount: 0,
              tempoMedioGeralHoras: 0,
              rendimentoMedioHL: 0,
              mediaPorCargo: [],
              tempoMedioPorColaborador: [],
              rendimentoPorDia: [],
              rows: [],
              pendencias: [],
              colaboradoresNaoCadastrados: [],
              validationError: 'O arquivo não possui planilhas válidas.'
            });
          }
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });
        }

        if (!rawJson || rawJson.length === 0) {
          return resolve({
            success: false,
            totalRows: 0,
            importedCount: 0,
            pendenciasCount: 0,
            novosCount: 0,
            sobrescreverCount: 0,
            datasIntervalo: '',
            colaboradoresUnicosCount: 0,
            tempoMedioGeralHoras: 0,
            rendimentoMedioHL: 0,
            mediaPorCargo: [],
            tempoMedioPorColaborador: [],
            rendimentoPorDia: [],
            rows: [],
            pendencias: [],
            colaboradoresNaoCadastrados: [],
            validationError: 'A planilha ou arquivo JSON selecionado está vazio ou não possui registros.'
          });
        }

        if (rawJson.length > 3000) {
          warningLargeFile = `Atenção: A planilha contém ${rawJson.length} linhas. Se o processo demorar, considere fracioná-la por meses.`;
        }

        // Fetch existing stored journeys for overwrite matching
        const existingJornadas = getStoredJornadas(empresaId);
        const existingMap = new Map<string, JornadaRecord>();
        existingJornadas.forEach(j => {
          const norm = normalizeCollaboratorName(j.colaboradorNome);
          existingMap.set(`${j.dataISO}__${norm}`, j);
        });

        const parsedRows: WlpImportParsedRow[] = [];
        const pendencias: WlpPendenciaRow[] = [];
        const colaboradoresNaoCadastradosSet = new Set<string>();
        const uniqueColabsSet = new Set<string>();
        const dailyVolumesMap = new Map<string, { dataStr: string; volumeHL: number; colabs: Set<string> }>();

        let totalRowsRead = 0;

        for (let idx = 0; idx < rawJson.length; idx++) {
          const row = rawJson[idx];
          const lineNum = idx + 2; // Line 1 is header in Excel/CSV

          // Find key columns
          let dataVal: any = '';
          let volumeVal: any = 0;
          let colabVal: any = '';
          let cargoVal: any = '';
          let horaInicioVal: any = '';
          let horaFimVal: any = '';
          let obsVal: any = '';

          Object.keys(row).forEach(k => {
            const cleanKey = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
            if (cleanKey.includes('data') || cleanKey.includes('dia') || cleanKey.includes('date') || cleanKey.includes('dt_')) {
              if (!dataVal) dataVal = row[k];
            } else if (cleanKey.includes('volume') || cleanKey.includes('faturado') || cleanKey.includes('hl') || cleanKey.includes('hectolitro')) {
              if (!volumeVal) volumeVal = row[k];
            } else if (cleanKey.includes('colaborador') || cleanKey.includes('nome') || cleanKey.includes('funcionario') || cleanKey.includes('operador') || cleanKey.includes('matricula') || cleanKey.includes('employee') || cleanKey.includes('name')) {
              if (!colabVal) colabVal = row[k];
            } else if (cleanKey.includes('cargo') || cleanKey.includes('funcao') || cleanKey.includes('perfil') || cleanKey.includes('role') || cleanKey.includes('position')) {
              if (!cargoVal) cargoVal = row[k];
            } else if (cleanKey.includes('inicio') || cleanKey.includes('entrada') || cleanKey.includes('inici') || cleanKey.includes('start') || cleanKey.includes('horainicio') || cleanKey.includes('hora_inicio') || cleanKey.includes('horario_inicio')) {
              if (!horaInicioVal) horaInicioVal = row[k];
            } else if (cleanKey.includes('fim') || cleanKey.includes('saida') || cleanKey.includes('termino') || cleanKey.includes('end') || cleanKey.includes('horafim') || cleanKey.includes('hora_fim') || cleanKey.includes('horario_fim')) {
              if (!horaFimVal) horaFimVal = row[k];
            } else if (cleanKey.includes('observa') || cleanKey.includes('obs') || cleanKey.includes('detalhes') || cleanKey.includes('notes')) {
              if (!obsVal) obsVal = row[k];
            }
          });

          // Direct property overrides if available
          if (row.Data !== undefined && row.Data !== '') dataVal = row.Data;
          if (row.data !== undefined && row.data !== '') dataVal = row.data;
          if (row.DATA !== undefined && row.DATA !== '') dataVal = row.DATA;
          if (row.dataISO !== undefined && row.dataISO !== '') dataVal = row.dataISO;
          if (row.dataStr !== undefined && row.dataStr !== '') dataVal = row.dataStr;

          if (row['Volume Faturado (HL)'] !== undefined && row['Volume Faturado (HL)'] !== '') volumeVal = row['Volume Faturado (HL)'];
          if (row['Volume Faturado'] !== undefined && row['Volume Faturado'] !== '') volumeVal = row['Volume Faturado'];
          if (row.volumeHL !== undefined && row.volumeHL !== '') volumeVal = row.volumeHL;
          if (row.volumeHl !== undefined && row.volumeHl !== '') volumeVal = row.volumeHl;
          if (row.volume !== undefined && row.volume !== '') volumeVal = row.volume;

          if (row['Colaborador (ID)'] !== undefined && row['Colaborador (ID)'] !== '') colabVal = row['Colaborador (ID)'];
          if (row['Colaborador'] !== undefined && row['Colaborador'] !== '') colabVal = row['Colaborador'];
          if (row.colaborador !== undefined && row.colaborador !== '') colabVal = row.colaborador;
          if (row.colaboradorNome !== undefined && row.colaboradorNome !== '') colabVal = row.colaboradorNome;
          if (row.nome !== undefined && row.nome !== '') colabVal = row.nome;

          if (row.Cargo !== undefined && row.Cargo !== '') cargoVal = row.Cargo;
          if (row.cargo !== undefined && row.cargo !== '') cargoVal = row.cargo;

          if (row['Hora Início (HH:MM)'] !== undefined && row['Hora Início (HH:MM)'] !== '') horaInicioVal = row['Hora Início (HH:MM)'];
          if (row['Hora Início'] !== undefined && row['Hora Início'] !== '') horaInicioVal = row['Hora Início'];
          if (row['Hora Inicio'] !== undefined && row['Hora Inicio'] !== '') horaInicioVal = row['Hora Inicio'];
          if (row.horaInicio !== undefined && row.horaInicio !== '') horaInicioVal = row.horaInicio;
          if (row.inicio !== undefined && row.inicio !== '') horaInicioVal = row.inicio;
          if (row.entrada !== undefined && row.entrada !== '') horaInicioVal = row.entrada;

          if (row['Hora Fim (HH:MM)'] !== undefined && row['Hora Fim (HH:MM)'] !== '') horaFimVal = row['Hora Fim (HH:MM)'];
          if (row['Hora Fim'] !== undefined && row['Hora Fim'] !== '') horaFimVal = row['Hora Fim'];
          if (row.horaFim !== undefined && row.horaFim !== '') horaFimVal = row.horaFim;
          if (row.fim !== undefined && row.fim !== '') horaFimVal = row.fim;
          if (row.saida !== undefined && row.saida !== '') horaFimVal = row.saida;

          if (row.Observações !== undefined && row.Observações !== null) obsVal = row.Observações;
          if (row.observacoes !== undefined && row.observacoes !== null) obsVal = row.observacoes;

          // Skip completely empty row
          if (!dataVal && !colabVal && !horaInicioVal && !horaFimVal) {
            continue;
          }

          totalRowsRead++;

          // Validate Date
          const dateInfo = formatExcelDateValue(dataVal);
          const rawColabName = String(colabVal || '').trim();
          const colabNorm = normalizeCollaboratorName(rawColabName);

          // Disallow regular Saturdays
          if (dateInfo && isDisallowedSaturday(dateInfo.dataISO, dateInfo.dataStr)) {
            continue;
          }

          // Cargo Enrichment & Registration Check
          const colabInfo = getCollaboratorOfficialInfo(colabNorm, empresaId);
          let rawCargo = String(cargoVal || '').trim();
          let formattedCargo = rawCargo;
          if (rawCargo) {
            const upperCargo = rawCargo.toUpperCase();
            if (upperCargo.includes('EMPILHA')) formattedCargo = 'Empilhador';
            else if (upperCargo.includes('CONFEREN')) formattedCargo = 'Conferente';
            else if (upperCargo.includes('AJUDAN') || upperCargo.includes('AUXILIAR')) formattedCargo = 'Ajudante';
            else if (upperCargo.includes('MOTORIST')) formattedCargo = 'Motorista';
            else if (upperCargo.includes('OPERADOR') || upperCargo.includes('LIDER') || upperCargo.includes('LÍDER')) formattedCargo = 'Operador';
            else if (upperCargo.includes('ADMIN') || upperCargo.includes('ANALISTA') || upperCargo.includes('SUPERVISOR')) formattedCargo = 'Administrativo';
          }

          let isPendingCargo = !formattedCargo || formattedCargo.toUpperCase().includes('PENDENTE') || formattedCargo.toLowerCase().includes('CONFIRMAR');

          let cargo = '';
          let isColaboradorNaoCadastrado = false;

          if (formattedCargo && !isPendingCargo) {
            cargo = formattedCargo;
            if (!colabInfo.isRegistered) {
              isColaboradorNaoCadastrado = true;
            }
          } else if (colabInfo.isRegistered && colabInfo.cargo) {
            cargo = colabInfo.cargo;
          } else {
            cargo = 'Ajudante';
            if (!colabInfo.isRegistered) {
              isColaboradorNaoCadastrado = true;
            }
          }

          if (isColaboradorNaoCadastrado && colabNorm) {
            colaboradoresNaoCadastradosSet.add(colabNorm);
          }

          // Line by Line Time Validation
          const horaInicio = formatExcelTimeValue(horaInicioVal);
          const horaFim = formatExcelTimeValue(horaFimVal);

          const isValidStart = /^\d{1,2}:\d{2}$/.test(horaInicio);
          const isValidEnd = /^\d{1,2}:\d{2}$/.test(horaFim);

          if (!dateInfo || !rawColabName || !isValidStart || !isValidEnd) {
            let motivoParts: string[] = [];
            if (!dateInfo) motivoParts.push('Data inválida');
            if (!rawColabName) motivoParts.push('Nome do colaborador ausente');
            if (!isValidStart) motivoParts.push('Hora Início ausente/inválida');
            if (!isValidEnd) motivoParts.push('Hora Fim ausente/inválida');
            if (isColaboradorNaoCadastrado) motivoParts.push('Colaborador não cadastrado');

            pendencias.push({
              lineNum,
              dataStr: dateInfo ? dateInfo.dataStr : String(dataVal || 's/data'),
              dataISO: dateInfo ? dateInfo.dataISO : '',
              colaboradorNomeOriginal: rawColabName || 'Não Informado',
              colaboradorNomeNormalizado: colabNorm || 'NAO_INFORMADO',
              cargo,
              horaInicio: horaInicio || String(horaInicioVal || ''),
              horaFim: horaFim || String(horaFimVal || ''),
              motivo: motivoParts.join(' • '),
              tipo: !isValidStart || !isValidEnd ? 'horario_incompleto' : 'colaborador_nao_cadastrado',
              observacoes: String(obsVal || ''),
              isColaboradorNaoCadastrado
            });

            continue;
          }

          uniqueColabsSet.add(colabNorm);

          // PASSO 4 — Overnight & Duration Calculations
          const [h1, m1] = horaInicio.split(':').map(Number);
          const [h2, m2] = horaFim.split(':').map(Number);
          let mins1 = h1 * 60 + m1;
          let mins2 = h2 * 60 + m2;
          let isOvernight = false;
          if (mins2 < mins1) {
            mins2 += 24 * 60; // Overnight shift
            isOvernight = true;
          }
          let rawWorkedHours = parseFloat(row['Horas Trabalhadas'] || row['Duração (h)'] || row.horasTrabalhadas || row.duracao);
          if (isNaN(rawWorkedHours) || rawWorkedHours <= 0) {
            rawWorkedHours = calcularDuracaoHorasComIntervalo(horaInicio, horaFim);
          }
          const duracaoHoras = parseFloat(rawWorkedHours.toFixed(2));

          const volNum = parseVolumeHLBR(volumeVal);
          const obs = String(obsVal || '').trim() || 'Importado via planilha WLP';

          // Track Daily Volume & Active Collaborators for Day Yield calculation
          if (!dailyVolumesMap.has(dateInfo.dataISO)) {
            dailyVolumesMap.set(dateInfo.dataISO, {
              dataStr: dateInfo.dataStr,
              volumeHL: volNum,
              colabs: new Set([colabNorm])
            });
          } else {
            const currentObj = dailyVolumesMap.get(dateInfo.dataISO)!;
            if (volNum > currentObj.volumeHL) {
              currentObj.volumeHL = volNum;
            }
            currentObj.colabs.add(colabNorm);
          }

          // Check overwrite status
          const matchKey = `${dateInfo.dataISO}__${colabNorm}`;
          const existing = existingMap.get(matchKey);

          parsedRows.push({
            lineNum,
            dataStr: dateInfo.dataStr,
            dataISO: dateInfo.dataISO,
            mesAno: dateInfo.mesAno,
            volumeFaturadoHL: volNum,
            colaboradorNomeOriginal: rawColabName,
            colaboradorNomeNormalizado: colabNorm,
            cargo,
            horaInicio,
            horaFim,
            duracaoHoras,
            isOvernight,
            observacoes: obs,
            rendimentoDiaHL: 0,
            isOverwrite: !!existing,
            existingRecordId: existing?.id,
            isColaboradorNaoCadastrado
          });
        }

        if (parsedRows.length === 0 && pendencias.length === 0) {
          return resolve({
            success: false,
            totalRows: 0,
            importedCount: 0,
            pendenciasCount: 0,
            novosCount: 0,
            sobrescreverCount: 0,
            datasIntervalo: '',
            colaboradoresUnicosCount: 0,
            tempoMedioGeralHoras: 0,
            rendimentoMedioHL: 0,
            mediaPorCargo: [],
            tempoMedioPorColaborador: [],
            rendimentoPorDia: [],
            rows: [],
            pendencias: [],
            colaboradoresNaoCadastrados: [],
            validationError: 'Nenhuma linha válida ou pendência identificada na planilha.'
          });
        }

        // Calculate Day Yield (Rendimento = Volume ÷ Colaboradores Ativos)
        const rendimentoPorDia: WlpDiaRendimento[] = [];
        dailyVolumesMap.forEach((val, dataISO) => {
          const colabsCount = val.colabs.size;
          const rendimentoHL = colabsCount > 0 ? parseFloat((val.volumeHL / colabsCount).toFixed(2)) : 0;
          rendimentoPorDia.push({
            dataStr: val.dataStr,
            dataISO,
            volumeHL: val.volumeHL,
            colabsCount,
            rendimentoHL
          });
        });
        rendimentoPorDia.sort((a, b) => a.dataISO.localeCompare(b.dataISO));

        const rendMap = new Map<string, number>();
        rendimentoPorDia.forEach(d => rendMap.set(d.dataISO, d.rendimentoHL));

        parsedRows.forEach(row => {
          row.rendimentoDiaHL = rendMap.get(row.dataISO) || 0;
        });

        // Compute Averages & KPI Stats
        const totalDurationHours = parsedRows.reduce((sum, r) => sum + r.duracaoHoras, 0);
        const tempoMedioGeralHoras = parsedRows.length > 0 ? parseFloat((totalDurationHours / parsedRows.length).toFixed(2)) : 0;

        // Group by Cargo
        const cargoMap = new Map<string, { totalHoras: number; count: number }>();
        parsedRows.forEach(r => {
          const current = cargoMap.get(r.cargo) || { totalHoras: 0, count: 0 };
          cargoMap.set(r.cargo, {
            totalHoras: current.totalHoras + r.duracaoHoras,
            count: current.count + 1
          });
        });

        const mediaPorCargo: WlpCargoMedia[] = Array.from(cargoMap.entries()).map(([cargo, val]) => ({
          cargo,
          totalHoras: parseFloat(val.totalHoras.toFixed(2)),
          count: val.count,
          mediaHoras: parseFloat((val.totalHoras / val.count).toFixed(2))
        }));

        // Group by Collaborator
        const colabHoursMap = new Map<string, { cargo: string; totalHoras: number; diasCount: number; isNaoCadastrado?: boolean }>();
        parsedRows.forEach(r => {
          const cur = colabHoursMap.get(r.colaboradorNomeNormalizado) || { cargo: r.cargo, totalHoras: 0, diasCount: 0, isNaoCadastrado: r.isColaboradorNaoCadastrado };
          colabHoursMap.set(r.colaboradorNomeNormalizado, {
            cargo: r.cargo || cur.cargo,
            totalHoras: cur.totalHoras + r.duracaoHoras,
            diasCount: cur.diasCount + 1,
            isNaoCadastrado: cur.isNaoCadastrado
          });
        });

        const tempoMedioPorColaborador: WlpColabTempoMedio[] = Array.from(colabHoursMap.entries()).map(([colaboradorNome, val]) => ({
          colaboradorNome,
          cargo: val.cargo,
          totalHoras: parseFloat(val.totalHoras.toFixed(2)),
          diasCount: val.diasCount,
          mediaHoras: parseFloat((val.totalHoras / val.diasCount).toFixed(2)),
          isColaboradorNaoCadastrado: val.isNaoCadastrado
        }));

        const rendimentoSum = rendimentoPorDia.reduce((sum, d) => sum + d.rendimentoHL, 0);
        const rendimentoMedioHL = rendimentoPorDia.length > 0 ? parseFloat((rendimentoSum / rendimentoPorDia.length).toFixed(2)) : 0;

        let datasIntervalo = 'Sem registros';
        if (parsedRows.length > 0) {
          const sortedDates = [...parsedRows].sort((a, b) => a.dataISO.localeCompare(b.dataISO));
          const firstDate = sortedDates[0].dataStr;
          const lastDate = sortedDates[sortedDates.length - 1].dataStr;
          datasIntervalo = firstDate === lastDate ? firstDate : `${firstDate} a ${lastDate}`;
        }

        const novosCount = parsedRows.filter(r => !r.isOverwrite).length;
        const sobrescreverCount = parsedRows.filter(r => r.isOverwrite).length;

        resolve({
          success: true,
          totalRows: totalRowsRead,
          importedCount: parsedRows.length,
          pendenciasCount: pendencias.length,
          novosCount,
          sobrescreverCount,
          datasIntervalo,
          colaboradoresUnicosCount: uniqueColabsSet.size,
          tempoMedioGeralHoras,
          rendimentoMedioHL,
          mediaPorCargo,
          tempoMedioPorColaborador,
          rendimentoPorDia,
          rows: parsedRows,
          pendencias,
          colaboradoresNaoCadastrados: Array.from(colaboradoresNaoCadastradosSet),
          warningLargeFile
        });

      } catch (err: any) {
        resolve({
          success: false,
          totalRows: 0,
          importedCount: 0,
          pendenciasCount: 0,
          novosCount: 0,
          sobrescreverCount: 0,
          datasIntervalo: '',
          colaboradoresUnicosCount: 0,
          tempoMedioGeralHoras: 0,
          rendimentoMedioHL: 0,
          mediaPorCargo: [],
          tempoMedioPorColaborador: [],
          rendimentoPorDia: [],
          rows: [],
          pendencias: [],
          colaboradoresNaoCadastrados: [],
          validationError: `Erro ao processar o arquivo: ${err?.message || err}`
        });
      }
    };

    reader.onerror = () => resolve({
      success: false,
      totalRows: 0,
      importedCount: 0,
      pendenciasCount: 0,
      novosCount: 0,
      sobrescreverCount: 0,
      datasIntervalo: '',
      colaboradoresUnicosCount: 0,
      tempoMedioGeralHoras: 0,
      rendimentoMedioHL: 0,
      mediaPorCargo: [],
      tempoMedioPorColaborador: [],
      rendimentoPorDia: [],
      rows: [],
      pendencias: [],
      colaboradoresNaoCadastrados: [],
      validationError: 'Erro de leitura do arquivo no navegador.'
    });

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Downloads a sample JSON template for WLP journeys and daily HL volume
 */
export function downloadWlpSampleJson(): void {
  const sampleData = [
    {
      "Data": "2026-01-05",
      "Volume Faturado (HL)": 655.02,
      "Colaborador (ID)": "JOSE GONCALVES DE SOUZA",
      "Cargo": "Ajudante",
      "Hora Início (HH:MM)": "07:00",
      "Hora Fim (HH:MM)": "16:20",
      "Observações": "Ponto de jornada retroativo 2026"
    },
    {
      "Data": "2026-01-05",
      "Volume Faturado (HL)": 655.02,
      "Colaborador (ID)": "CICERO MATHEU DE OLIVEIRA SILVA",
      "Cargo": "Conferente",
      "Hora Início (HH:MM)": "06:30",
      "Hora Fim (HH:MM)": "16:30",
      "Observações": "Ponto de jornada retroativo 2026"
    },
    {
      "Data": "2026-01-05",
      "Volume Faturado (HL)": 655.02,
      "Colaborador (ID)": "GILSON ROSA DA SILVA",
      "Cargo": "Empilhador",
      "Hora Início (HH:MM)": "07:00",
      "Hora Fim (HH:MM)": "16:20",
      "Observações": "Ponto de jornada retroativo 2026"
    }
  ];

  const blob = new Blob([JSON.stringify(sampleData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'modelo_wlp_jornadas_2026.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Commits the parsed preview result to LocalStorage and Firestore, overwriting existing records of the same period & collaborator
 */
export function commitWlpImport(
  preview: WlpImportPreviewResult,
  empresaId: string = 'demo',
  overwriteCompleteDataset: boolean = false
): { importedCount: number; overwrittenCount: number; newCount: number } {
  if (!preview || !preview.rows || preview.rows.length === 0) {
    throw new Error('Nenhum dado de jornada para gravar.');
  }

  localStorage.removeItem(`wlp_user_cleared_${empresaId}`);

  const currentJornadas = getStoredJornadas(empresaId);
  const updatedMap = new Map<string, JornadaRecord>();

  if (!overwriteCompleteDataset) {
    // Populate existing records
    currentJornadas.forEach(j => {
      const norm = normalizeCollaboratorName(j.colaboradorNome);
      updatedMap.set(`${j.dataISO}__${norm}`, j);
    });
  } else {
    // Overwrite mode: filter out existing journeys for the dates present in the import
    const importedDatesSet = new Set(preview.rows.map(r => r.dataISO));
    currentJornadas.forEach(j => {
      if (!importedDatesSet.has(j.dataISO)) {
        const norm = normalizeCollaboratorName(j.colaboradorNome);
        updatedMap.set(`${j.dataISO}__${norm}`, j);
      }
    });
  }

  let overwrittenCount = 0;
  let newCount = 0;

  preview.rows.forEach(row => {
    const key = `${row.dataISO}__${row.colaboradorNomeNormalizado}`;
    if (updatedMap.has(key)) {
      overwrittenCount++;
    } else {
      newCount++;
    }

    if (row.colaboradorNomeNormalizado && row.cargo) {
      registerQuickCollaborator(row.colaboradorNomeNormalizado, row.cargo, empresaId);
    }

    const recId = row.existingRecordId || `jrn-${row.dataISO}-${encodeURIComponent(row.colaboradorNomeNormalizado).toLowerCase().replace(/%20/g, '-')}`;

    const rec: JornadaRecord = {
      id: recId,
      colaboradorNome: row.colaboradorNomeNormalizado,
      cargo: row.cargo,
      dataStr: row.dataStr,
      dataISO: row.dataISO,
      mesAno: row.mesAno,
      horaInicio: row.horaInicio,
      horaFim: row.horaFim,
      duracaoHoras: row.duracaoHoras,
      empresaId,
      observacoes: row.observacoes,
      criadoEm: new Date().toISOString()
    };

    updatedMap.set(key, rec);

    // Save/Sync to Firestore
    if (db) {
      try {
        const docRef = doc(db, 'jornadas_colaboradores', recId);
        setDoc(docRef, rec, { merge: true }).catch(console.warn);
      } catch (e) {}
    }
  });

  const updatedJornadasList = Array.from(updatedMap.values());
  updatedJornadasList.sort((a, b) => new Date(b.dataISO + 'T' + (b.horaInicio || '00:00')).getTime() - new Date(a.dataISO + 'T' + (a.horaInicio || '00:00')).getTime());

  localStorage.setItem(`colaboradores_jornadas_${empresaId}`, JSON.stringify(updatedJornadasList));
  localStorage.setItem(`jornadas_colaboradores_${empresaId}`, JSON.stringify(updatedJornadasList));

  // Permanently store in user imported dataset registry
  try {
    const permKey = `wlp_permanent_imported_dataset_${empresaId}`;
    const savedPerm = localStorage.getItem(permKey);
    let permList: any[] = savedPerm ? JSON.parse(savedPerm) : [];
    if (!Array.isArray(permList)) permList = [];

    const importedDatesSet = new Set(preview.rows.map(r => r.dataISO));
    // Remove previous records for the dates being imported to avoid stale or duplicate data
    permList = permList.filter(p => !importedDatesSet.has(p.dataISO));

    preview.rows.forEach(r => {
      permList.push({
        dataISO: r.dataISO,
        dataStr: r.dataStr,
        mesAno: r.mesAno,
        colaboradorNome: r.colaboradorNomeNormalizado,
        cargo: r.cargo,
        horaInicio: r.horaInicio,
        horaFim: r.horaFim,
        duracaoHoras: r.duracaoHoras,
        volumeFaturadoHL: r.volumeFaturadoHL,
        importedAt: new Date().toISOString()
      });
    });

    localStorage.setItem(permKey, JSON.stringify(permList));
  } catch (e) {}

  // Save daily faturado records with reliable mesAno computation
  preview.rendimentoPorDia.forEach(day => {
    if (day.volumeHL > 0) {
      const parts = day.dataISO.split('-');
      const dataStr = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : day.dataStr;
      const mesAno = parts.length === 3 ? `${parts[1]}/${parts[0]}` : (day.dataStr.includes('/') ? `${day.dataStr.split('/')[1]}/${day.dataStr.split('/')[2]}` : '');

      saveDailyFaturadoRecord({
        id: `fat-${day.dataISO}`,
        dataISO: day.dataISO,
        dataStr: dataStr,
        mesAno: mesAno,
        volumeHL: day.volumeHL,
        registradoPor: 'Importação Retroativa Excel (Base Central)',
        registradoEm: new Date().toISOString(),
        origem: 'CSV',
        empresaId
      });
    }
  });

  // Dispatch events to update all productivity & workstation dashboards immediately
  window.dispatchEvent(new Event('jornadas_updated'));
  window.dispatchEvent(new CustomEvent('jornadas_updated'));
  window.dispatchEvent(new Event('wlp_faturado_updated'));
  window.dispatchEvent(new CustomEvent('wlp_faturado_updated'));
  window.dispatchEvent(new Event('wlp_config_updated'));
  window.dispatchEvent(new Event('local_data_changed'));
  window.dispatchEvent(new Event('storage'));

  return {
    importedCount: preview.rows.length,
    overwrittenCount,
    newCount
  };
}

/**
 * EXCEL / CSV IMPORTER
 * Legacy wrapper calling deterministic parser and committer
 */
export async function importWlpExcelData(
  file: File,
  empresaId: string = 'demo'
): Promise<{ jornadasCount: number; faturadosCount: number }> {
  const parsed = await parseWlpExcelFile(file, empresaId);
  if (!parsed.success || parsed.rows.length === 0) {
    throw new Error(parsed.validationError || 'Falha ao processar arquivo.');
  }
  const result = commitWlpImport(parsed, empresaId);
  return {
    jornadasCount: result.importedCount,
    faturadosCount: parsed.rendimentoPorDia.length
  };
}

export function calculateWlpMetrics(
  jornadasMonth: JornadaRecord[],
  config: WlpMonthlyConfig
) {
  const { volumeFaturadoHL, diasUteisTrabalhados, quadroPessoalTTQLP, horasTurnoPadrao, metaWlp, mesAno } = config;

  // Extract month number from mesAno (e.g. "02/2026" -> 2)
  const mesNum = mesAno ? parseInt(mesAno.split('/')[0], 10) : 8;

  // Filter out administrative staff and month-specific exclusions (vacations)
  const jornadasValidas = jornadasMonth.filter(j => {
    const check = isColaboradorExcluidoWlp(j.colaboradorNome, mesNum, j.cargo);
    return !check.excluido;
  });

  // 1. Calculate standard denominator from formula: TT QLP * 7.33 * Dias Úteis
  const ttQlp = quadroPessoalTTQLP;
  const totalHorasPadraoFormula = ttQlp * horasTurnoPadrao * diasUteisTrabalhados;

  // 2. Calculate actual registered worked hours from valid collaborator start and end shift points
  const actualHoursSum = jornadasValidas.reduce((acc, curr) => acc + (curr.duracaoHoras || 0), 0);

  // If we have registered journey points, use actual registered hours. If we have working days, use formula. Otherwise 0.
  const effectiveTotalHours = actualHoursSum > 0 
    ? actualHoursSum 
    : (diasUteisTrabalhados > 0 ? totalHorasPadraoFormula : 0);

  // WLP = Volume total faturado (HL) / Total Horas Operacionais (HH)
  const wlpCalculado = effectiveTotalHours > 0 ? volumeFaturadoHL / effectiveTotalHours : 0;

  // Calculate Average Hours worked per collaborator
  const uniqueColabs = new Set(jornadasValidas.map(j => j.colaboradorNome));
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
    mediaHorasPorColaborador,
    jornadasExcluidasCount: jornadasMonth.length - jornadasValidas.length
  };
}
