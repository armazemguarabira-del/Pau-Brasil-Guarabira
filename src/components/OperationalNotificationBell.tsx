import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Bell, 
  Clock, 
  Thermometer, 
  Truck, 
  CheckCircle2, 
  AlertTriangle, 
  FileCheck, 
  ChevronRight, 
  X, 
  Check, 
  ShieldAlert, 
  Volume2, 
  VolumeX,
  ClipboardList,
  Sparkles
} from 'lucide-react';
import { getStoredTempLogs } from '../utils/tempStorage';
import { getStoredJornadas, getStoredMontagens } from '../utils/jornadaUtils';
import { getStoredReminders, OperationalReminderConfig } from '../utils/remindersUtils';

export interface OperationalNotification {
  id: string;
  type: 'temperatura' | 'placa_veiculo' | 'checklist_5s' | 'demanda_delegada' | 'conferente_concluida' | 'alerta_geral';
  title: string;
  message: string;
  timeStr: string;
  priority: 'alta' | 'media' | 'baixa';
  read: boolean;
  actionPanel?: string;
  actionTab?: string;
  actionLabel?: string;
  createdAt: string;
  popupOverlay?: boolean;
}

interface OperationalNotificationBellProps {
  user: any;
  userRole?: 'empilhador' | 'ajudante' | 'conferente' | 'qualidade' | 'admin';
  onNavigate?: (panel: string, subTab?: string) => void;
}

export const OperationalNotificationBell: React.FC<OperationalNotificationBellProps> = ({
  user,
  userRole: propRole,
  onNavigate
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'todas' | 'horarios' | 'demandas' | 'concluidas'>('todas');
  const [readIds, setReadIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('af_read_notification_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [dismissedPopups, setDismissedPopups] = useState<string[]>(() => {
    try {
      const saved = sessionStorage.getItem('af_dismissed_popups');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [reminderConfigs, setReminderConfigs] = useState<OperationalReminderConfig[]>(() => getStoredReminders());

  useEffect(() => {
    const handleRemindersUpdate = () => {
      setReminderConfigs(getStoredReminders());
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('af_reminders_updated', handleRemindersUpdate);
      window.addEventListener('storage', handleRemindersUpdate);
      return () => {
        window.removeEventListener('af_reminders_updated', handleRemindersUpdate);
        window.removeEventListener('storage', handleRemindersUpdate);
      };
    }
  }, []);

  // Resolve active role
  const getActiveRole = (): 'empilhador' | 'ajudante' | 'conferente' | 'qualidade' | 'admin' => {
    if (propRole) return propRole;
    const cargoStr = (user?.cargo || user?.funcao || user?.setor || '').toUpperCase();
    if (cargoStr.includes('EMPILHADOR')) return 'empilhador';
    if (cargoStr.includes('AJUDANTE')) return 'ajudante';
    if (cargoStr.includes('CONFERENTE') || cargoStr.includes('ADM')) return 'conferente';
    if (cargoStr.includes('QUALIDADE') || cargoStr.includes('SUPERVISOR') || cargoStr.includes('LÍDER') || cargoStr.includes('LIDER')) return 'qualidade';
    return 'admin';
  };

  const role = getActiveRole();

  // Generate dynamic active notifications based on role & system state & configured reminders
  const generateNotifications = (): OperationalNotification[] => {
    const list: OperationalNotification[] = [];
    const now = new Date();
    const todayISO = now.toISOString().split('T')[0];

    // 1. CARREGAR LEMBRETES CONFIGURADOS NO CADASTROS (Lembretes & Horários)
    reminderConfigs.forEach(rem => {
      if (!rem.ativo) return;

      // Role check:
      let isForRole = false;
      if (role === 'admin') isForRole = true;
      else if (rem.paraQuem === 'todos') isForRole = true;
      else if (rem.paraQuem === role) isForRole = true;

      if (!isForRole) return;

      const notifId = `rem_${rem.id}_${todayISO}`;
      list.push({
        id: notifId,
        type: rem.actionTab === 'temperatura' ? 'temperatura' : 'placa_veiculo',
        title: rem.titulo,
        message: rem.mensagem,
        timeStr: rem.horario,
        priority: rem.prioridade,
        read: readIds.includes(notifId),
        actionPanel: rem.actionPanel,
        actionTab: rem.actionTab,
        actionLabel: rem.actionLabel,
        createdAt: `${todayISO}T${rem.horario}:00`,
        popupOverlay: rem.popupOverlay
      });
    });

    // 2. DYNAMIC SYSTEM EVENTS (MONTAGENS CONCLUÍDAS PELO CONFERENTE/EXECUTORES)
    if (role === 'conferente' || role === 'admin') {
      const montagens = getStoredMontagens();
      const montagensAndamento = montagens.filter(m => m.status === 'EM_ANDAMENTO');
      const montagensFinalizadas = montagens.filter(m => m.status === 'FINALIZADA');

      if (montagensAndamento.length > 0) {
        list.push({
          id: `notif_iniciar_montagem_${todayISO}`,
          type: 'placa_veiculo',
          title: '📦 Lembrete — Iniciar/Validar Montagens de Carga',
          message: `Existem ${montagensAndamento.length} montagens em andamento no pátio aguardando liberação final.`,
          timeStr: 'Turno Ativo',
          priority: 'media',
          read: readIds.includes(`notif_iniciar_montagem_${todayISO}`),
          actionPanel: 'conferente',
          actionTab: 'montagens',
          actionLabel: 'Gerenciar Montagens',
          createdAt: `${todayISO}T08:30:00`,
          popupOverlay: false
        });
      }

      if (montagensFinalizadas.length > 0) {
        const lastFinished = montagensFinalizadas[montagensFinalizadas.length - 1];
        const placaStr = (lastFinished as any).placaVeiculo || (lastFinished as any).placa || 'ABC-1234';
        const timeStr = (lastFinished as any).fimFormatado || (lastFinished as any).dataInicioISO || (lastFinished as any).dataInicio || 'Recentemente';
        list.push({
          id: `notif_conferente_done_${lastFinished.id}`,
          type: 'conferente_concluida',
          title: '🏁 Carga Concluída pelos Executores',
          message: `Montagem da Placa ${placaStr} finalizada com sucesso pelos empilhadores! Paletes liberados.`,
          timeStr,
          priority: 'baixa',
          read: readIds.includes(`notif_conferente_done_${lastFinished.id}`),
          actionPanel: 'conferente',
          actionTab: 'montagens',
          actionLabel: 'Ver Conclusão',
          createdAt: `${todayISO}T12:00:00`,
          popupOverlay: false
        });
      }
    }

    return list;
  };

  const notifications = generateNotifications();
  const unreadCount = notifications.filter(n => !n.read).length;

  // Find unread notification that explicitly requires POP-UP OVERLAY (saltar na tela)
  const popupOverlayNotif = notifications.find(
    n => !n.read && Boolean(n.popupOverlay) && !dismissedPopups.includes(n.id)
  );

  const dismissPopupOverlay = (id: string) => {
    const updated = [...dismissedPopups, id];
    setDismissedPopups(updated);
    try {
      sessionStorage.setItem('af_dismissed_popups', JSON.stringify(updated));
    } catch {}
  };

  const markAsRead = (id: string) => {
    const updated = [...readIds, id];
    setReadIds(updated);
    localStorage.setItem('af_read_notification_ids', JSON.stringify(updated));
  };

  const markAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    const updated = Array.from(new Set([...readIds, ...allIds]));
    setReadIds(updated);
    localStorage.setItem('af_read_notification_ids', JSON.stringify(updated));
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'horarios') return n.type === 'temperatura' || n.type === 'placa_veiculo' || n.type === 'checklist_5s';
    if (filter === 'demandas') return n.type === 'demanda_delegada';
    if (filter === 'concluidas') return n.type === 'conferente_concluida' || n.read;
    return true;
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'temperatura':
        return <Thermometer className="w-4 h-4 text-rose-400 shrink-0" />;
      case 'placa_veiculo':
        return <Truck className="w-4 h-4 text-sky-400 shrink-0" />;
      case 'checklist_5s':
        return <ClipboardList className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'demanda_delegada':
        return <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'conferente_concluida':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
      default:
        return <Clock className="w-4 h-4 text-blue-400 shrink-0" />;
    }
  };

  return (
    <div className="relative inline-block text-left">
      {/* BELL TRIGGER BUTTON */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-[#151b23] border border-[#222d3a] hover:border-amber-500/50 text-slate-200 hover:text-white transition-all cursor-pointer shadow-md flex items-center justify-center"
        title="Central de Notificações e Alertas Operacionais"
      >
        <Bell className={`w-4 h-4 text-amber-400 ${unreadCount > 0 ? 'animate-bounce' : ''}`} />
        
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-black text-white shadow-lg animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* DROPDOWN POPOVER */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[#0e1626] border border-amber-500/40 shadow-2xl z-50 text-white overflow-hidden animate-fadeIn">
          {/* HEADER */}
          <div className="bg-gradient-to-r from-[#032b5e] to-[#0d1e3d] p-3.5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-500/20 rounded-lg text-amber-400 border border-amber-500/30">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                  Alertas Operacionais <Sparkles className="w-3 h-3 text-amber-300" />
                </h3>
                <span className="text-[9px] text-slate-300 font-mono">
                  {unreadCount} não lida(s) de {notifications.length} alertas
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-1 text-slate-400 hover:text-white rounded"
                title={soundEnabled ? "Som ativado" : "Som desativado"}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-amber-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* TAB FILTERS */}
          <div className="flex items-center justify-between p-1.5 bg-[#080d1a] border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setFilter('todas')}
                className={`px-2.5 py-1 rounded-lg cursor-pointer transition-all ${
                  filter === 'todas' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setFilter('horarios')}
                className={`px-2.5 py-1 rounded-lg cursor-pointer transition-all ${
                  filter === 'horarios' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                Horários
              </button>
              <button
                onClick={() => setFilter('demandas')}
                className={`px-2.5 py-1 rounded-lg cursor-pointer transition-all ${
                  filter === 'demandas' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                Demandas
              </button>
              <button
                onClick={() => setFilter('concluidas')}
                className={`px-2.5 py-1 rounded-lg cursor-pointer transition-all ${
                  filter === 'concluidas' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                Concluídas
              </button>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[9px] text-emerald-400 hover:underline font-mono cursor-pointer pr-1"
              >
                Ler todas
              </button>
            )}
          </div>

          {/* NOTIFICATION LIST */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/80 bg-[#0b1222]">
            {filteredNotifications.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs font-mono">
                Nenhum alerta nesta categoria no momento.
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3 transition-colors flex items-start gap-2.5 relative ${
                    notif.read ? 'bg-[#0b1222]/50 opacity-70' : 'bg-[#111a30] border-l-2 border-amber-400'
                  }`}
                >
                  <div className="mt-0.5 p-1.5 bg-slate-900 rounded-lg border border-slate-700/60 shrink-0">
                    {getNotificationIcon(notif.type)}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-black text-white truncate block">
                        {notif.title}
                      </span>
                      <span className="text-[9px] font-mono text-slate-400 shrink-0">
                        {notif.timeStr}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-snug">
                      {notif.message}
                    </p>

                    <div className="flex items-center justify-between pt-1">
                      {notif.actionLabel && (
                        <button
                          type="button"
                          onClick={() => {
                            markAsRead(notif.id);
                            setIsOpen(false);
                            if (onNavigate && notif.actionPanel) {
                              onNavigate(notif.actionPanel, notif.actionTab);
                            }
                          }}
                          className="px-2 py-0.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-[10px] uppercase rounded transition-all cursor-pointer flex items-center gap-1"
                        >
                          {notif.actionLabel} <ChevronRight className="w-3 h-3" />
                        </button>
                      )}

                      {!notif.read && (
                        <button
                          type="button"
                          onClick={() => markAsRead(notif.id)}
                          className="text-[10px] text-slate-400 hover:text-emerald-300 flex items-center gap-0.5 ml-auto cursor-pointer"
                          title="Marcar como lida"
                        >
                          <Check className="w-3 h-3" /> Lida
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* FOOTER */}
          <div className="p-2 bg-[#080d1a] border-t border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 font-mono">
              Monitor de Alertas e Sincronia Operacional Padrão DPO
            </span>
          </div>
        </div>
      )}

      {/* POP-UP OVERLAY MODAL (SOBREPONDO A OPERAÇÃO CENTRALIZADO NA TELA) */}
      {popupOverlayNotif && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-[#0f172a] border-2 border-amber-500 rounded-2xl shadow-2xl overflow-hidden p-6 text-white space-y-4 relative">
            <button
              onClick={() => dismissPopupOverlay(popupOverlayNotif.id)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800/60 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/40 animate-pulse">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block">
                  LEMBRETE OPERACIONAL CRÍTICO DPO
                </span>
                <h2 className="text-base font-black text-white leading-tight">
                  {popupOverlayNotif.title}
                </h2>
              </div>
            </div>

            <div className="bg-[#1e293b] p-4 rounded-xl border border-slate-700/60 space-y-2">
              <p className="text-xs text-slate-200 leading-relaxed font-medium">
                {popupOverlayNotif.message}
              </p>
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1">
                <span>Horário: {popupOverlayNotif.timeStr}</span>
                <span className="text-amber-400 font-bold uppercase">Prioridade Alta</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              {popupOverlayNotif.actionLabel && (
                <button
                  type="button"
                  onClick={() => {
                    markAsRead(popupOverlayNotif.id);
                    dismissPopupOverlay(popupOverlayNotif.id);
                    if (onNavigate && popupOverlayNotif.actionPanel) {
                      onNavigate(popupOverlayNotif.actionPanel, popupOverlayNotif.actionTab);
                    }
                  }}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {popupOverlayNotif.actionLabel} <ChevronRight className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => dismissPopupOverlay(popupOverlayNotif.id)}
                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Ciente
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
