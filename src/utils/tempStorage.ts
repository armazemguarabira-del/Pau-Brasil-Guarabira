import * as XLSX from 'xlsx';
import { ArmazemTemperaturaLog } from '../types';

export const TEMP_STORAGE_KEY = 'armazem_temperatura_logs';

/**
 * Retrieves the current temperature logs from localStorage.
 */
export function getStoredTempLogs(): ArmazemTemperaturaLog[] {
  try {
    const saved = localStorage.getItem(TEMP_STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (e) {
    console.error('Erro ao ler logs de temperatura do localStorage:', e);
  }
  return [];
}

/**
 * Saves temperature logs array to localStorage and dispatches sync events.
 */
export function saveTempLogs(logs: ArmazemTemperaturaLog[]): void {
  try {
    localStorage.setItem(TEMP_STORAGE_KEY, JSON.stringify(logs));
    window.dispatchEvent(new CustomEvent('armazem_temp_logs_updated', { detail: logs }));
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
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          reject(new Error('Planilha vazia ou sem abas válidas.'));
          return;
        }

        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawJson: any[] = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          reject(new Error('Nenhum registro encontrado na planilha.'));
          return;
        }

        const importedLogs: ArmazemTemperaturaLog[] = [];

        rawJson.forEach((row, idx) => {
          if (!row || typeof row !== 'object') return;

          const keys = Object.keys(row);
          const getVal = (candidates: string[]): any => {
            const matchKey = keys.find(k => {
              const cleanK = k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
              return candidates.some(c => {
                const cleanC = c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
                return cleanK === cleanC;
              });
            });
            return matchKey ? row[matchKey] : '';
          };

          const rawData = getVal(['data', 'date', 'data medicao', 'data afericao', 'data da medicao']);
          const rawHora = getVal(['hora', 'horario', 'time', 'hora afericao']);
          const rawTemp = getVal(['temperatura', 'temp', 'temperatura c', 'temperatura (c)', 'temp c', 'valor']);
          const rawColab = getVal(['colaborador', 'conferente', 'operador', 'responsavel', 'registrado por', 'usuario', 'nome']);
          const rawObs = getVal(['observacao', 'observacoes', 'obs', 'observacao/justificativa', 'detalhe']);

          if ((rawData === '' || rawData === null || rawData === undefined) && 
              (rawTemp === '' || rawTemp === null || rawTemp === undefined)) {
            return;
          }

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
            if (strData.match(/^\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}$/)) {
              const parts = strData.split(/[\/\.-]/);
              const dd = parts[0].padStart(2, '0');
              const mm = parts[1].padStart(2, '0');
              let yyyy = parts[2];
              if (yyyy.length === 2) yyyy = '20' + yyyy;
              dataISO = `${yyyy}-${mm}-${dd}`;
              dataFormatted = `${dd}/${mm}/${yyyy}`;
              mesAno = `${mm}/${yyyy}`;
            } else if (strData.match(/^\d{4}[\/\.-]\d{1,2}[\/\.-]\d{1,2}$/)) {
              const parts = strData.split(/[\/\.-]/);
              const yyyy = parts[0];
              const mm = parts[1].padStart(2, '0');
              const dd = parts[2].padStart(2, '0');
              dataISO = `${yyyy}-${mm}-${dd}`;
              dataFormatted = `${dd}/${mm}/${yyyy}`;
              mesAno = `${mm}/${yyyy}`;
            } else {
              // Fallback today
              const today = new Date();
              const yyyy = today.getFullYear();
              const mm = String(today.getMonth() + 1).padStart(2, '0');
              const dd = String(today.getDate()).padStart(2, '0');
              dataISO = `${yyyy}-${mm}-${dd}`;
              dataFormatted = `${dd}/${mm}/${yyyy}`;
              mesAno = `${mm}/${yyyy}`;
            }
          }

          // --- Parse Hora ---
          let horaStr = String(rawHora || '09:00').trim();
          if (horaStr.match(/^\d{1,2}:\d{2}/)) {
            const hp = horaStr.split(':');
            horaStr = `${hp[0].padStart(2, '0')}:${hp[1].padStart(2, '0')}`;
          } else if (!isNaN(Number(horaStr)) && Number(horaStr) > 0 && Number(horaStr) < 1) {
            const totalSec = Math.round(Number(horaStr) * 86400);
            const h = Math.floor(totalSec / 3600);
            const m = Math.floor((totalSec % 3600) / 60);
            horaStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
          } else {
            horaStr = '09:00';
          }

          // --- Parse Temperatura ---
          const cleanedTempStr = String(rawTemp || '').replace('°C', '').replace('°', '').replace(',', '.').trim();
          const tempNum = parseFloat(cleanedTempStr);
          if (isNaN(tempNum)) {
            return; // Skip invalid temperature rows
          }

          const colabStr = String(rawColab || 'Operador / Conferente').trim();
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
          reject(new Error('Nenhuma linha de medição válida encontrada na planilha. Verifique as colunas (Data, Hora, Temperatura, Colaborador, Observação).'));
          return;
        }

        // Sort descending by dataISO then hora
        importedLogs.sort((a, b) => {
          if (b.dataISO !== a.dataISO) return b.dataISO.localeCompare(a.dataISO);
          return b.hora.localeCompare(a.hora);
        });

        // Overwrite database
        saveTempLogs(importedLogs);
        resolve({ count: importedLogs.length, logs: importedLogs });
      } catch (err: any) {
        reject(err || new Error('Falha ao processar a planilha.'));
      }
    };

    reader.onerror = () => reject(new Error('Erro de leitura do arquivo.'));
    reader.readAsArrayBuffer(file);
  });
}
