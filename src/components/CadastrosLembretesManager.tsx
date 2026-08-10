import React, { useState } from 'react';
import { 
  Bell, 
  Clock, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  RotateCcw, 
  Save, 
  X, 
  Users, 
  Layout, 
  Eye, 
  EyeOff,
  BellRing
} from 'lucide-react';
import { 
  getStoredReminders, 
  saveStoredReminders, 
  resetRemindersToDefault, 
  OperationalReminderConfig 
} from '../utils/remindersUtils';

export function CadastrosLembretesManager() {
  const [reminders, setReminders] = useState<OperationalReminderConfig[]>(() => getStoredReminders());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Omit<OperationalReminderConfig, 'id'>>({
    titulo: '',
    paraQuem: 'conferente',
    horario: '09:00',
    mensagem: '',
    popupOverlay: true,
    actionPanel: 'conferente',
    actionTab: 'despacho',
    actionLabel: 'Acessar Operação',
    ativo: true,
    prioridade: 'alta'
  });

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormData({
      titulo: '',
      paraQuem: 'conferente',
      horario: '09:00',
      mensagem: '',
      popupOverlay: true,
      actionPanel: 'conferente',
      actionTab: 'despacho',
      actionLabel: 'Acessar Operação',
      ativo: true,
      prioridade: 'alta'
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (rem: OperationalReminderConfig) => {
    setEditingId(rem.id);
    setFormData({
      titulo: rem.titulo,
      paraQuem: rem.paraQuem,
      horario: rem.horario,
      mensagem: rem.mensagem,
      popupOverlay: rem.popupOverlay,
      actionPanel: rem.actionPanel || 'conferente',
      actionTab: rem.actionTab || '',
      actionLabel: rem.actionLabel || 'Acessar Operação',
      ativo: rem.ativo,
      prioridade: rem.prioridade
    });
    setIsModalOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.titulo.trim()) return;

    let updatedList: OperationalReminderConfig[];
    if (editingId) {
      updatedList = reminders.map(r => r.id === editingId ? { ...formData, id: editingId } : r);
    } else {
      const newRem: OperationalReminderConfig = {
        ...formData,
        id: `rem_custom_${Date.now()}`
      };
      updatedList = [newRem, ...reminders];
    }

    setReminders(updatedList);
    saveStoredReminders(updatedList);
    setIsModalOpen(false);
  };

  const handleToggleAtivo = (id: string) => {
    const updated = reminders.map(r => r.id === id ? { ...r, ativo: !r.ativo } : r);
    setReminders(updated);
    saveStoredReminders(updated);
  };

  const handleTogglePopupOverlay = (id: string) => {
    const updated = reminders.map(r => r.id === id ? { ...r, popupOverlay: !r.popupOverlay } : r);
    setReminders(updated);
    saveStoredReminders(updated);
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja realmente remover este lembrete/alerta configurado?')) {
      const updated = reminders.filter(r => r.id !== id);
      setReminders(updated);
      saveStoredReminders(updated);
    }
  };

  const handleResetDefaults = () => {
    if (confirm('Restaurar as configurações originais de lembretes DPO?')) {
      const defs = resetRemindersToDefault();
      setReminders(defs);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'conferente':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30">Conferente / ADM</span>;
      case 'empilhador':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">Empilhador</span>;
      case 'ajudante':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Ajudante</span>;
      case 'qualidade':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">Qualidade</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">Todos os Usuários</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#03224c] via-[#0d2a58] to-[#141b2d] rounded-2xl p-5 border border-amber-500/30 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30 shrink-0">
            <BellRing className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                Módulo Cadastros & Ajustes
              </span>
            </div>
            <h2 className="text-lg md:text-xl font-black text-white uppercase tracking-tight mt-0.5">
              Gestão de Lembretes, Alertas & Horários
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Configure os horários de disparo de lembretes, público destinatário (Conferente, Empilhador, Ajudante, Qualidade) e se a notificação salta na tela em destaque (Pop-up).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
          <button
            onClick={handleResetDefaults}
            className="flex-1 md:flex-none px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
            title="Restaurar Padrões DPO"
          >
            <RotateCcw className="w-4 h-4" />
            Padrões DPO
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex-1 md:flex-none px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Novo Lembrete
          </button>
        </div>
      </div>

      {/* REMINDERS LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reminders.length === 0 ? (
          <div className="col-span-full bg-[#151b23] border border-slate-800 rounded-2xl p-10 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-slate-500 mx-auto" />
            <h3 className="text-sm font-bold text-slate-300 uppercase">Nenhum lembrete cadastrado</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Clique em "Novo Lembrete" para adicionar um alerta programado ou em "Padrões DPO" para restaurar os horários de rotina do sistema.
            </p>
          </div>
        ) : (
          reminders.map((rem) => (
            <div 
              key={rem.id} 
              className={`rounded-2xl border p-4.5 transition-all space-y-3 shadow-md flex flex-col justify-between ${
                rem.ativo 
                  ? 'bg-[#151b23] border-[#222d3a] hover:border-amber-500/40' 
                  : 'bg-[#0e131a] border-slate-800/60 opacity-60'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono font-black text-xs flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {rem.horario}
                    </div>
                    {getRoleBadge(rem.paraQuem)}
                  </div>

                  <button
                    onClick={() => handleToggleAtivo(rem.id)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border transition-colors cursor-pointer ${
                      rem.ativo 
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                        : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                    }`}
                  >
                    {rem.ativo ? 'Ativo' : 'Inativo'}
                  </button>
                </div>

                <h3 className="text-sm font-black text-white uppercase tracking-tight leading-snug">
                  {rem.titulo}
                </h3>

                <p className="text-xs text-slate-300 leading-relaxed bg-[#0d1218] p-3 rounded-xl border border-slate-800/80">
                  {rem.mensagem}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] font-bold text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleTogglePopupOverlay(rem.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold cursor-pointer transition-colors ${
                        rem.popupOverlay 
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' 
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                      title="Clique para alternar se o modal salta na tela sobrepondo a operação"
                    >
                      {rem.popupOverlay ? <Eye className="w-3 h-3 text-rose-400" /> : <EyeOff className="w-3 h-3 text-slate-400" />}
                      Pop-up Overlay: <span className="font-black">{rem.popupOverlay ? 'SIM' : 'NÃO'}</span>
                    </button>
                  </div>

                  {rem.actionPanel && (
                    <span className="text-[10px] font-mono font-bold text-amber-400/90 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                      Painel: {rem.actionPanel}
                    </span>
                  )}
                </div>
              </div>

              {/* CARD ACTIONS */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-slate-400">
                  Prioridade: <span className={rem.prioridade === 'alta' ? 'text-rose-400 font-black' : 'text-amber-400 font-black'}>{rem.prioridade}</span>
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEditModal(rem)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-lg transition-colors cursor-pointer"
                    title="Editar Lembrete"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(rem.id)}
                    className="p-1.5 bg-slate-800 hover:bg-rose-900/40 text-rose-400 rounded-lg transition-colors cursor-pointer"
                    title="Excluir Lembrete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ADD / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#121824] border border-amber-500/40 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl text-white space-y-4">
            {/* MODAL HEADER */}
            <div className="bg-gradient-to-r from-[#032b5e] to-[#0a1830] p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">
                    {editingId ? 'Editar Lembrete & Horário' : 'Novo Lembrete & Horário'}
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Defina o público destinatário e a regra de pop-up overlay.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* FORM BODY */}
            <form onSubmit={handleSaveForm} className="p-5 space-y-4">
              {/* TITULO */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
                  Título do Lembrete *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Lembrete 09:00 — Importação de Placas (03.11.49.02)"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  className="w-full bg-[#0d1218] border border-slate-700 focus:border-amber-400 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 font-bold focus:outline-none"
                />
              </div>

              {/* ROW 1: PARA QUEM & HORARIO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
                    Para Quem (Destinatário) *
                  </label>
                  <select
                    value={formData.paraQuem}
                    onChange={(e) => setFormData({ ...formData, paraQuem: e.target.value as any })}
                    className="w-full bg-[#0d1218] border border-slate-700 focus:border-amber-400 rounded-xl p-2.5 text-xs text-amber-300 font-bold cursor-pointer focus:outline-none"
                  >
                    <option value="conferente">Conferente / ADM</option>
                    <option value="empilhador">Empilhador</option>
                    <option value="ajudante">Ajudante</option>
                    <option value="qualidade">Qualidade</option>
                    <option value="todos">Todos os Usuários</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
                    Horário Programado (HH:mm) *
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.horario}
                    onChange={(e) => setFormData({ ...formData, horario: e.target.value })}
                    className="w-full bg-[#0d1218] border border-slate-700 focus:border-amber-400 rounded-xl p-2.5 text-xs text-emerald-400 font-mono font-bold focus:outline-none"
                  />
                </div>
              </div>

              {/* MENSAGEM */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
                  Mensagem / Descrição da Demanda *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Descreva o que o colaborador precisa realizar neste horário..."
                  value={formData.mensagem}
                  onChange={(e) => setFormData({ ...formData, mensagem: e.target.value })}
                  className="w-full bg-[#0d1218] border border-slate-700 focus:border-amber-400 rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
                />
              </div>

              {/* POP-UP OVERLAY SWITCH */}
              <div className="bg-[#0b1017] p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black uppercase text-rose-300 flex items-center gap-1.5">
                      <Eye className="w-4 h-4 text-rose-400" /> Pop-up em Destaque na Tela (Saltar Modal)
                    </span>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Se ativado, salta um modal centralizado sobrepondo a operação no horário correto.
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={formData.popupOverlay}
                    onChange={(e) => setFormData({ ...formData, popupOverlay: e.target.checked })}
                    className="w-5 h-5 accent-amber-500 cursor-pointer rounded"
                  />
                </div>
              </div>

              {/* ROW 2: ACTION PANEL & PRIORIDADE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
                    Painel de Ação Rápida
                  </label>
                  <select
                    value={formData.actionPanel}
                    onChange={(e) => setFormData({ ...formData, actionPanel: e.target.value })}
                    className="w-full bg-[#0d1218] border border-slate-700 focus:border-amber-400 rounded-xl p-2 text-xs text-slate-200 font-bold focus:outline-none"
                  >
                    <option value="conferente">Painel Conferente</option>
                    <option value="empilhador">Painel Empilhador</option>
                    <option value="ajudante">Painel Ajudante</option>
                    <option value="qualidade">Painel Qualidade</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
                    Nível de Prioridade
                  </label>
                  <select
                    value={formData.prioridade}
                    onChange={(e) => setFormData({ ...formData, prioridade: e.target.value as any })}
                    className="w-full bg-[#0d1218] border border-slate-700 focus:border-amber-400 rounded-xl p-2 text-xs text-amber-300 font-bold focus:outline-none"
                  >
                    <option value="alta">Alta</option>
                    <option value="media">Média</option>
                    <option value="baixa">Baixa</option>
                  </select>
                </div>
              </div>

              {/* BUTTONS */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  Salvar Lembrete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
