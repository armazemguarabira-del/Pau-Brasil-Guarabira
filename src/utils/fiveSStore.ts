import * as XLSX from 'xlsx';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { SETORES_5S, MAPEAMENTO_RESPONSAVEIS_5S, Audit5SRecord } from '../components/Checklist5SModal';

// In-Memory Singleton Cache to avoid constant expensive JSON.parse / generation
let _inMemoryAuditsCache: Audit5SRecord[] | null = null;
let _inMemoryGeneratedYTD: Audit5SRecord[] | null = null;

export const generateYTD5SAuditsFast = (): Audit5SRecord[] => {
  if (_inMemoryGeneratedYTD) {
    return _inMemoryGeneratedYTD;
  }

  const list: Audit5SRecord[] = [];
  const currentYear = 2026;

  const auditoresDisponiveis = [
    'Pedro Bruno (Setor de Frota)',
    'Líder Operacional 5S',
    'Supervisão de Operações',
    'Inspetor de Qualidade',
    'Auditor Interno 5S',
    'Coordenação de Logística'
  ];

  // Mapping from area to responsible person
  const respMap: Record<string, string> = {};
  MAPEAMENTO_RESPONSAVEIS_5S.forEach(item => {
    respMap[item.area] = item.colaborador;
  });

  // De Janeiro (1) até Agosto (8)
  for (let m = 1; m <= 8; m++) {
    const daysInMonth = m === 2 ? 28 : (m === 4 || m === 6 || m === 9 || m === 11) ? 30 : 31;
    // Em agosto, as auditorias vão estritamente até o dia 25 (o restante será preenchido manualmente)
    const maxDay = m === 8 ? 25 : daysInMonth;

    for (let day = 1; day <= maxDay; day++) {
      const dateObj = new Date(currentYear, m - 1, day);
      const dayOfWeek = dateObj.getDay(); // 0 = Domingo, 6 = Sábado

      // Somente dias úteis da semana (Segunda a Sexta: 1 a 5)
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        const dayStr = day < 10 ? `0${day}` : `${day}`;
        const monthStr = m < 10 ? `0${m}` : `${m}`;
        const dataISO = `${currentYear}-${monthStr}-${dayStr}`;
        const dataFormatted = `${dayStr}/${monthStr}/${currentYear}`;

        SETORES_5S.forEach((areaName, areaIdx) => {
          const respName = respMap[areaName] || 'DEJEAN SILVA DE OLIVEIRA';

          // Gerar pequenas oscilações diárias com notas de 80%, 90% e 100%,
          // garantindo que todos os colaboradores batam a meta de 85% no mês e no acumulado.
          const hash = areaIdx * 11 + day * 17 + m * 23;
          const mod = hash % 10;

          let scoreVal = 9; // 90% padrão
          if (mod === 0 || mod === 5) {
            scoreVal = 8; // 80%
          } else if (mod === 1 || mod === 4 || mod === 7 || mod === 9) {
            scoreVal = 10; // 100%
          } else {
            scoreVal = 9; // 90%
          }

          const notaPct = Math.round((scoreVal / 10) * 100);

          // Gerar respostas específicas para as 10 perguntas do 5S
          const answers = [true, true, true, true, true, true, true, true, true, true];
          if (scoreVal === 8) {
            answers[5] = false; // P6: Risco / Condições inseguras
            answers[7] = false; // P8: Limpeza de piso
          } else if (scoreVal === 9) {
            const failIndex = (areaIdx + day) % 10;
            answers[failIndex] = false;
          }

          const auditor = auditoresDisponiveis[(areaIdx + day + m) % auditoresDisponiveis.length];

          const obs =
            scoreVal === 10
              ? 'Setor 100% organizado, limpo e etiquetado conforme diretrizes do 5S.'
              : scoreVal === 9
              ? 'Pallets e caixas alinhados. Pequeno ajuste de identificação orientado e sanado de imediato.'
              : 'Organização do posto e limpeza de piso corrigidas durante a ronda com o colaborador.';

          list.push({
            id: `audit_5s_${areaName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_${dataISO}`,
            dataISO,
            dataFormatted,
            setor: areaName,
            operador: respName,
            liderAuditor: auditor,
            pontos: scoreVal,
            notaPercentual: notaPct,
            respostas: answers,
            observacoesNaoConforme: obs,
            fotoUrl: null,
            createdAt: `${dataISO}T09:30:00.000Z`,
            empresaId: 'demo',
            seiriStatus: answers[0] && answers[1] && answers[2] && answers[3],
            seitonStatus: answers[1],
            seisoStatus: answers[7] && answers[8],
            seiketsuStatus: answers[4] && answers[5] && answers[6],
            shitsukeStatus: answers[9]
          });
        });
      }
    }
  }

  _inMemoryGeneratedYTD = list;
  return list;
};

export const getStored5SAudits = (): Audit5SRecord[] => {
  if (_inMemoryAuditsCache && _inMemoryAuditsCache.length > 0) {
    return _inMemoryAuditsCache;
  }

  try {
    const saved = localStorage.getItem('af_5s_audits') || localStorage.getItem('5s_audits_history');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length >= 1000) {
        _inMemoryAuditsCache = parsed;
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Fallback loading 5S audits from localStorage', e);
  }

  const seeded = generateYTD5SAuditsFast();
  _inMemoryAuditsCache = seeded;

  try {
    localStorage.setItem('af_5s_audits', JSON.stringify(seeded));
    localStorage.setItem('5s_audits_history', JSON.stringify(seeded));
  } catch (e) {
    console.warn('LocalStorage save quota or error:', e);
  }

  return seeded;
};

export const save5SAuditRecord = async (newRecord: Audit5SRecord): Promise<boolean> => {
  try {
    // 1. Update Firestore if connected
    if (db) {
      try {
        const docRef = doc(db, 'af_5s_audits', newRecord.id);
        await setDoc(docRef, newRecord);
      } catch (firestoreErr) {
        console.warn('Firestore fallback on save 5S:', firestoreErr);
      }
    }

    // 2. Update memory & LocalStorage
    const currentList = getStored5SAudits();
    const filtered = currentList.filter(
      item => !(item.setor === newRecord.setor && item.dataISO === newRecord.dataISO) && item.id !== newRecord.id
    );
    const updated = [newRecord, ...filtered];
    _inMemoryAuditsCache = updated;

    try {
      localStorage.setItem('af_5s_audits', JSON.stringify(updated));
      localStorage.setItem('5s_audits_history', JSON.stringify(updated));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }

    // 3. Dispatch global sync event
    window.dispatchEvent(new CustomEvent('5s_audit_updated', { detail: newRecord }));
    window.dispatchEvent(new Event('5s_responsaveis_updated'));

    return true;
  } catch (err) {
    console.error('Error saving 5S audit:', err);
    return false;
  }
};

export const saveBulk5SAudits = (bulkList: Audit5SRecord[]) => {
  const currentList = getStored5SAudits();
  const map = new Map<string, Audit5SRecord>();

  // Add existing
  currentList.forEach(item => {
    const key = `${item.setor}_${item.dataISO}`;
    map.set(key, item);
  });

  // Overwrite/insert new ones
  bulkList.forEach(item => {
    const key = `${item.setor}_${item.dataISO}`;
    map.set(key, item);
  });

  const merged = Array.from(map.values()).sort((a, b) => (b.dataISO || '').localeCompare(a.dataISO || ''));
  _inMemoryAuditsCache = merged;

  try {
    localStorage.setItem('af_5s_audits', JSON.stringify(merged));
    localStorage.setItem('5s_audits_history', JSON.stringify(merged));
  } catch (e) {
    console.warn('LocalStorage save error:', e);
  }

  window.dispatchEvent(new CustomEvent('5s_audit_updated', { detail: bulkList }));
  window.dispatchEvent(new Event('5s_responsaveis_updated'));
};
