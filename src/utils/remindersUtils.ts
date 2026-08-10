// Operational Reminders & Scheduled Notifications Manager (Requirement DPO)

export interface OperationalReminderConfig {
  id: string;
  titulo: string;
  paraQuem: 'conferente' | 'empilhador' | 'ajudante' | 'qualidade' | 'todos';
  horario: string; // HH:mm e.g. "09:00", "10:00", "16:00"
  mensagem: string;
  popupOverlay: boolean; // Sim (salta na tela modal) / Não
  actionPanel?: string;
  actionTab?: string;
  actionLabel?: string;
  ativo: boolean;
  prioridade: 'alta' | 'media' | 'baixa';
  criadoEm?: string;
  atualizadoEm?: string;
}

export const DEFAULT_OPERATIONAL_REMINDERS: OperationalReminderConfig[] = [
  {
    id: 'rem_placas_09h',
    titulo: '🚚 Lembrete 09:00 — Importação de Placas (Relatório 03.11.49.02)',
    paraQuem: 'conferente',
    horario: '09:00',
    mensagem: 'Atenção Conferente: Lembrete de rotina das 09h00 para importar o relatório oficial 03.11.49.02 e atribuir o pátio.',
    popupOverlay: true,
    actionPanel: 'conferente',
    actionTab: 'despacho',
    actionLabel: 'Importar Placas Agora',
    ativo: true,
    prioridade: 'alta'
  },
  {
    id: 'rem_temp_10h',
    titulo: '🌡️ Lembrete 10:00 — Registro Matutino de Temperatura',
    paraQuem: 'qualidade',
    horario: '10:00',
    mensagem: 'Lembrete da Qualidade: Coleta matutina (10:00) de temperatura da câmara fria pendente de registro.',
    popupOverlay: false,
    actionPanel: 'qualidade',
    actionTab: 'temperatura',
    actionLabel: 'Registrar Temperatura',
    ativo: true,
    prioridade: 'media'
  },
  {
    id: 'rem_temp_16h',
    titulo: '🌡️ Lembrete 16:00 — Registro Vespertino de Temperatura',
    paraQuem: 'qualidade',
    horario: '16:00',
    mensagem: 'Lembrete da Qualidade: Coleta vespertina (16:00) de temperatura pendente para conformidade sanitária DPO.',
    popupOverlay: false,
    actionPanel: 'qualidade',
    actionTab: 'temperatura',
    actionLabel: 'Registrar Temperatura',
    ativo: true,
    prioridade: 'media'
  }
];

const STORAGE_KEY_REMINDERS = 'af_operational_reminders_config';

export function getStoredReminders(): OperationalReminderConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REMINDERS);
    if (!raw) return [...DEFAULT_OPERATIONAL_REMINDERS];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (e) {
    console.error('Erro ao ler lembretes cadastrados:', e);
  }
  return [...DEFAULT_OPERATIONAL_REMINDERS];
}

export function saveStoredReminders(list: OperationalReminderConfig[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_REMINDERS, JSON.stringify(list));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('af_reminders_updated'));
      window.dispatchEvent(new Event('storage'));
    }
  } catch (e) {
    console.error('Erro ao salvar lembretes:', e);
  }
}

export function resetRemindersToDefault(): OperationalReminderConfig[] {
  saveStoredReminders(DEFAULT_OPERATIONAL_REMINDERS);
  return [...DEFAULT_OPERATIONAL_REMINDERS];
}
