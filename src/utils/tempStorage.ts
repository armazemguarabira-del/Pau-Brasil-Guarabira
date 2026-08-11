import * as XLSX from 'xlsx';
import { ArmazemTemperaturaLog } from '../types';
import { BASE_TEMPERATURA_CSV } from '../data/baseTemperaturaCsv';

export const TEMP_STORAGE_KEY = 'armazem_temperatura_logs';

/**
 * Parses the official base CSV data (Jan 15 to Aug 07, 2026).
 */
export function parseBaseCsvData(): ArmazemTemperaturaLog[] {
  const lines = BASE_TEMPERATURA_CSV.trim().split('\n');
  const logs: ArmazemTemperaturaLog[] = [];

  lines.slice(1).forEach((line, idx) => {
    const parts = line.split(';');
    if (parts.length < 4) return;

    const rawData = parts[0].trim();
    const rawTemp = parts[1].trim().replace(',', '.');
    const conferente = parts[2].trim();
    const rawHora = parts[3].trim();

    const dateParts = rawData.split('/');
    if (dateParts.length < 3) return;

    const dd = dateParts[0].padStart(2, '0');
    const mm = dateParts[1].padStart(2, '0');
    let yyyy = dateParts[2];
    if (yyyy.length === 2) yyyy = '20' + yyyy;

    const dataISO = `${yyyy}-${mm}-${dd}`;
    const dataFormatted = `${dd}/${mm}/${yyyy}`;
    const mesAno = `${mm}/${yyyy}`;

    const hourParts = rawHora.split(':');
    const h = hourParts[0].padStart(2, '0');
    const m = (hourParts[1] || '00').padStart(2, '0');
    const horaStr = `${h}:${m}`;

    const tempNum = parseFloat(rawTemp);
    if (isNaN(tempNum)) return;

    const isCrit = tempNum > 28.0 || tempNum < 18.0;

    logs.push({
      id: `temp-base-${idx}-${dataISO}-${horaStr.replace(':', '')}`,
      dataISO,
      dataFormatted,
      mesAno,
      hora: horaStr,
      temperatura: Math.round(tempNum * 10) / 10,
      umidade: 55,
      setor: 'Armazém Central',
      conferenteNome: conferente,
      registradoPor: conferente,
      observacao: 'Aferição de temperatura registrada via planilha oficial',
      alertaCritico: isCrit
    });
  });

  return sortTempLogsDescending(logs);
}

/**
 * Sorts temperature logs strictly from most recent to oldest (dataISO then hora descending).
 */
export function sortTempLogsDescending(logs: ArmazemTemperaturaLog[]): ArmazemTemperaturaLog[] {
  return [...logs].sort((a, b) => {
    const timeA = (a.hora || '00:00').length === 4 ? `0${a.hora}` : (a.hora || '00:00');
    const timeB = (b.hora || '00:00').length === 4 ? `0${b.hora}` : (b.hora || '00:00');
    const keyA = `${a.dataISO || '0000-00-00'}T${timeA}`;
    const keyB = `${b.dataISO || '0000-00-00'}T${timeB}`;
    if (keyA !== keyB) {
      return keyB.localeCompare(keyA);
    }
    return (b.id || '').localeCompare(a.id || '');
  });
}

/**
 * Retrieves the current temperature logs from localStorage (sorted most recent first).
 * If empty or using outdated mock data, populates with the real base dataset (Jan to Aug 2026).
 */
export function getStoredTempLogs(): ArmazemTemperaturaLog[] {
  try {
    const saved = localStorage.getItem(TEMP_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Check if old mock data or misparsed December data is present
        const hasDec = parsed.some(l => l.mesAno === '12/2026' || l.mesAno === '11/2026' || l.mesAno === '10/2026' || l.mesAno === '09/2026');
        if (!hasDec) {
          return sortTempLogsDescending(parsed);
        }
      }
    }
  } catch (e) {
    console.error('Erro ao ler logs de temperatura do localStorage:', e);
  }

  // Populate default database with exact CSV records
  const initial = parseBaseCsvData();
  saveTempLogs(initial);
  return initial;
}

/**
 * Saves temperature logs array to localStorage and dispatches sync events.
 */
export function saveTempLogs(logs: ArmazemTemperaturaLog[]): void {
  try {
    const sorted = sortTempLogsDescending(logs);
    localStorage.setItem(TEMP_STORAGE_KEY, JSON.stringify(sorted));
    window.dispatchEvent(new CustomEvent('armazem_temp_logs_updated', { detail: sorted }));
    window.dispatchEvent(new Event('storage'));
  } catch (e) {
    console.error('Erro ao salvar logs de temperatura no localStorage:', e);
  }
}

/**
 * Clears all temperature records from the database.
 */
export function clearTempLogs(): void {
  saveTempLogs([]);
}

/**
 * Exports the standard Excel template file (.xlsx) with required headers and example data.
 */
export function exportarModeloExcelTemperatura(): void {
  const templateData = [
    {
      'Data': '02/01/2026',
      'Hora': '09:00',
      'Temperatura': 23.5,
      'Colaborador': 'Carlos Silva',
      'Observação': 'Aferição matutina de rotina - Início do Ano'
    },
    {
      'Data': '02/01/2026',
      'Hora': '16:00',
      'Temperatura': 26.2,
      'Colaborador': 'José Fernandes',
      'Observação': 'Aferição vespertina'
    },
    {
      'Data': '02/01/2026',
      'Hora': '22:00',
      'Temperatura': 21.8,
      'Colaborador': 'Marcos Vinícius',
      'Observação': 'Aferição noturna'
    },
    {
      'Data': '15/04/2026',
      'Hora': '09:00',
      'Temperatura': 24.0,
      'Colaborador': 'Operador G1009',
      'Observação': 'Conforme POP-LOG-015'
    },
    {
      'Data': '04/08/2026',
      'Hora': '09:00',
      'Temperatura': 25.5,
      'Colaborador': 'Carlos Silva',
      'Observação': 'Medição atual do armazém'
    }
  ];

  const ws = XLSX.utils.json_to_sheet(templateData);
  ws['!cols'] = [
    { wch: 15 }, // Data
    { wch: 10 }, // Hora
    { wch: 16 }, // Temperatura
    { wch: 25 }, // Colaborador
    { wch: 40 }  // Observacao
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Modelo_Temperatura');
  XLSX.writeFile(wb, 'modelo_importacao_temperaturas.xlsx');
}

/**
 * Reads an uploaded Excel/CSV file, parses rows, formats date/time/temperature/collaborator/observation,
 * and overwrites the existing temperature database with the imported logs.
 */
export async function importarPlanilhaTemperatura(file: File): Promise<{ count: number; logs: ArmazemTemperaturaLog[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        if (!buffer) {
          reject(new Error('Não foi possível ler o arquivo.'));
          return;
        }

        const data = new Uint8Array(buffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: false, raw: true });
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          reject(new Error('Planilha vazia ou sem abas válidas.'));
          return;
        }

        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawJson: any[] = XLSX.utils.sheet_to_json(firstSheet, { defval: '', raw: false });

        if (!rawJson || rawJson.length === 0) {
          reject(new Error('Nenhum registro encontrado na planilha.'));
          return;
        }

        const importedLogs: ArmazemTemperaturaLog[] = [];

        // Helper to normalize strings for comparisons
        const cleanStr = (s: any): string => {
          return String(s || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, '');
        };

        rawJson.forEach((row, idx) => {
          if (!row || typeof row !== 'object') return;

          const keys = Object.keys(row);
          const getVal = (candidates: string[]): any => {
            let matchKey = keys.find(k => {
              const cleanK = cleanStr(k);
              return candidates.some(c => cleanStr(c) === cleanK);
            });
            if (!matchKey) {
              matchKey = keys.find(k => {
                const cleanK = cleanStr(k);
                return candidates.some(c => {
                  const cleanC = cleanStr(c);
                  return (cleanK.length >= 2 && cleanC.length >= 2) && (cleanK.includes(cleanC) || cleanC.includes(cleanK));
                });
              });
            }
            return matchKey ? row[matchKey] : undefined;
          };

          let rawData = getVal(['data', 'date', 'data medicao', 'data afericao', 'data da medicao', 'dt']);
          let rawHora = getVal(['hora', 'horario', 'horrio', 'horio', 'time', 'hora afericao', 'horariomedicao', 'hr', 'hor']);
          let rawTemp = getVal(['temperatura', 'temp', 'temperatura c', 'temperatura (c)', 'temp c', 'valor', 'grau']);
          let rawColab = getVal(['colaborador', 'conferente', 'operador', 'responsavel', 'registrado por', 'usuario', 'nome']);
          let rawObs = getVal(['observacao', 'observacoes', 'obs', 'observacao/justificativa', 'detalhe', 'nota']);

          // --- Parse Data ---
          let dataISO = '';
          let dataFormatted = '';
          let mesAno = '';

          if (rawData instanceof Date && !isNaN(rawData.getTime())) {
            const yyyy = rawData.getFullYear();
            const mm = String(rawData.getMonth() + 1).padStart(2, '0');
            const dd = String(rawData.getDate()).padStart(2, '0');
            dataISO = `${yyyy}-${mm}-${dd}`;
            dataFormatted = `${dd}/${mm}/${yyyy}`;
            mesAno = `${mm}/${yyyy}`;
          } else {
            const strData = String(rawData || '').trim();
            const dmMatch = strData.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})$/);
            const ymdMatch = strData.match(/^(\d{4})[\/\.-](\d{1,2})[\/\.-](\d{1,2})$/);

            if (dmMatch) {
              const dd = dmMatch[1].padStart(2, '0');
              const mm = dmMatch[2].padStart(2, '0');
              let yyyy = dmMatch[3];
              if (yyyy.length === 2) yyyy = '20' + yyyy;
              dataISO = `${yyyy}-${mm}-${dd}`;
              dataFormatted = `${dd}/${mm}/${yyyy}`;
              mesAno = `${mm}/${yyyy}`;
            } else if (ymdMatch) {
              const yyyy = ymdMatch[1];
              const mm = ymdMatch[2].padStart(2, '0');
              const dd = ymdMatch[3].padStart(2, '0');
              dataISO = `${yyyy}-${mm}-${dd}`;
              dataFormatted = `${dd}/${mm}/${yyyy}`;
              mesAno = `${mm}/${yyyy}`;
            } else {
              // Value scan fallback for date
              for (const k of keys) {
                const val = String(row[k] || '').trim();
                const mDate = val.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})$/);
                if (mDate) {
                  const dd = mDate[1].padStart(2, '0');
                  const mm = mDate[2].padStart(2, '0');
                  let yyyy = mDate[3];
                  if (yyyy.length === 2) yyyy = '20' + yyyy;
                  dataISO = `${yyyy}-${mm}-${dd}`;
                  dataFormatted = `${dd}/${mm}/${yyyy}`;
                  mesAno = `${mm}/${yyyy}`;
                  break;
                }
              }
            }
          }

          if (!dataISO) {
            // Skip rows without any parseable date
            return;
          }

          // --- Parse Hora ---
          let horaStr = '';
          if (rawHora instanceof Date && !isNaN(rawHora.getTime())) {
            const h = String(rawHora.getHours()).padStart(2, '0');
            const m = String(rawHora.getMinutes()).padStart(2, '0');
            horaStr = `${h}:${m}`;
          } else if (typeof rawHora === 'string' || typeof rawHora === 'number') {
            const strVal = String(rawHora).trim();
            const timeMatch = strVal.match(/^(\d{1,2}):(\d{2})/);
            if (timeMatch) {
              const h = String(parseInt(timeMatch[1], 10)).padStart(2, '0');
              const m = timeMatch[2].padStart(2, '0');
              horaStr = `${h}:${m}`;
            } else if (!isNaN(Number(strVal)) && Number(strVal) > 0 && Number(strVal) < 1) {
              const totalSec = Math.round(Number(strVal) * 86400);
              const h = Math.floor(totalSec / 3600);
              const m = Math.floor((totalSec % 3600) / 60);
              horaStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            }
          }

          // Value scan fallback for Hora
          if (!horaStr) {
            for (const k of keys) {
              const val = String(row[k] || '').trim();
              const timeMatch = val.match(/^(\d{1,2}):(\d{2})/);
              if (timeMatch) {
                const h = String(parseInt(timeMatch[1], 10)).padStart(2, '0');
                const m = timeMatch[2].padStart(2, '0');
                horaStr = `${h}:${m}`;
                break;
              }
            }
          }

          // Date time component fallback
          if (!horaStr && rawData instanceof Date && !isNaN(rawData.getTime())) {
            const h = rawData.getHours();
            const m = rawData.getMinutes();
            if (h !== 0 || m !== 0) {
              horaStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            }
          }

          if (!horaStr) {
            horaStr = '09:00';
          }

          // --- Parse Temperatura ---
          let tempNum = NaN;
          if (typeof rawTemp === 'number') {
            tempNum = rawTemp;
          } else {
            const strTemp = String(rawTemp || '').replace('°C', '').replace('°', '').replace(',', '.').trim();
            tempNum = parseFloat(strTemp);
          }

          if (isNaN(tempNum)) {
            for (const k of keys) {
              const val = String(row[k] || '').replace('°C', '').replace('°', '').replace(',', '.').trim();
              const parsedVal = parseFloat(val);
              if (!isNaN(parsedVal) && parsedVal >= 10 && parsedVal <= 50) {
                tempNum = parsedVal;
                break;
              }
            }
          }

          if (isNaN(tempNum)) {
            return; // Skip row if no valid temperature
          }

          // --- Parse Colaborador & Observacao ---
          let colabStr = String(rawColab || '').trim();
          if (!colabStr) {
            for (const k of keys) {
              const val = String(row[k] || '').trim();
              if (val && !val.match(/^\d{1,2}[\/\.-]/) && !val.match(/^(\d{1,2}):(\d{2})/) && isNaN(Number(val.replace(',', '.')))) {
                colabStr = val;
                break;
              }
            }
          }
          if (!colabStr) colabStr = 'Conferente Responsável';

          const obsStr = String(rawObs || 'Importado via planilha Excel retroativa').trim();
          const isCrit = tempNum > 28.0 || tempNum < 18.0;

          importedLogs.push({
            id: `temp-imp-${idx}-${Date.now()}`,
            dataISO,
            dataFormatted,
            mesAno,
            hora: horaStr,
            temperatura: Math.round(tempNum * 10) / 10,
            umidade: 55,
            setor: 'Armazém Central',
            conferenteNome: colabStr,
            registradoPor: colabStr,
            observacao: obsStr,
            alertaCritico: isCrit
          });
        });

        if (importedLogs.length === 0) {
          reject(new Error('Nenhuma linha de medição válida encontrada na planilha. Verifique a estrutura do arquivo.'));
          return;
        }

        const sortedLogs = sortTempLogsDescending(importedLogs);

        // Overwrite database
        saveTempLogs(sortedLogs);
        resolve({ count: sortedLogs.length, logs: sortedLogs });
      } catch (err: any) {
        reject(err || new Error('Falha ao processar a planilha.'));
      }
    };

    reader.onerror = () => reject(new Error('Erro de leitura do arquivo.'));
    reader.readAsArrayBuffer(file);
  });
}

