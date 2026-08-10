import React, { useState, useEffect } from 'react';
import { Usuario, Empresa } from '../types';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { 
  Users,
  Package, 
  Calendar, 
  Search, 
  ClipboardCheck, 
  ChevronRight,
  ClipboardList,
  Plus,
  Trash2,
  Edit2,
  Lock,
  Unlock,
  Shield,
  Layers,
  X,
  Check
} from 'lucide-react';

interface SectorItem {
  id: string;
  label: string;
  description: string;
  iconName: string;
  colorKey: string;
  tag: string;
  liberadoParaColaboradores: boolean;
  isCustom?: boolean;
  _docId?: string;
}

interface RegistrosPanelProps {
  user: Usuario;
  empresa: Empresa | null;
  onNavigate: (panelId: string) => void;
  theme?: 'light' | 'dark';
}

const DEFAULT_SECTORS: SectorItem[] = [
  {
    id: 'ajudante',
    label: 'Operação Ajudante',
    description: 'Central unificada de lançamentos para Ajudantes (Repack, Despejo e Quebras).',
    iconName: 'Users',
    colorKey: 'indigo',
    tag: 'Ajudantes',
    liberadoParaColaboradores: true
  },
  {
    id: 'empilhador',
    label: 'Operação Empilhador',
    description: 'Atendimento de demandas unificadas (EFC/EFD, R&R e TMR) para operadores de empilhadeira.',
    iconName: 'Package',
    colorKey: 'amber',
    tag: 'Operacional',
    liberadoParaColaboradores: true
  },
  {
    id: 'validades',
    label: 'Operação Validade',
    description: 'Cadastro de lotes e vencimentos de produtos para controle de giro do estoque.',
    iconName: 'Calendar',
    colorKey: 'emerald',
    tag: 'Qualidade (FEFO)',
    liberadoParaColaboradores: true
  },
  {
    id: 'refugo',
    label: 'Operação Retorno de Rota',
    description: 'Inspeções e acompanhamento físico para liberação e aferimento de retorno de rotas.',
    iconName: 'Search',
    colorKey: 'indigo',
    tag: 'Qualidade',
    liberadoParaColaboradores: true
  },
  {
    id: 'conferente',
    label: 'Operação Conferênte',
    description: 'Vistoria de volumes e auditoria para conciliação física de cargas prontas para rota.',
    iconName: 'ClipboardCheck',
    colorKey: 'teal',
    tag: 'Controle',
    liberadoParaColaboradores: true
  }
];

const colorConfig: Record<string, {
  card: string;
  iconBg: string;
  iconText: string;
  tag: string;
  title: string;
  desc: string;
  action: string;
}> = {
  purple: {
    card: 'border-purple-300 bg-purple-50/80 hover:border-purple-500 hover:bg-purple-100/90 dark:border-purple-500/30 dark:bg-purple-500/[0.05] dark:hover:border-purple-500/60 dark:hover:bg-purple-500/[0.08] shadow-xs hover:shadow-sm',
    iconBg: 'bg-purple-100 dark:bg-purple-500/20',
    iconText: 'text-purple-700 dark:text-purple-400',
    tag: 'bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/20',
    title: 'text-purple-900 dark:text-purple-100 font-extrabold',
    desc: 'text-purple-800/90 dark:text-purple-300',
    action: 'text-purple-700 dark:text-purple-400 group-hover:text-purple-900 dark:group-hover:text-purple-300'
  },
  rose: {
    card: 'border-rose-300 bg-rose-50/80 hover:border-rose-500 hover:bg-rose-100/90 dark:border-rose-500/30 dark:bg-rose-500/[0.05] dark:hover:border-rose-500/60 dark:hover:bg-rose-500/[0.08] shadow-xs hover:shadow-sm',
    iconBg: 'bg-rose-100 dark:bg-rose-500/20',
    iconText: 'text-rose-700 dark:text-rose-400',
    tag: 'bg-rose-100 text-rose-800 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/20',
    title: 'text-rose-900 dark:text-rose-100 font-extrabold',
    desc: 'text-rose-800/90 dark:text-rose-300',
    action: 'text-rose-700 dark:text-rose-400 group-hover:text-rose-900 dark:group-hover:text-rose-300'
  },
  sky: {
    card: 'border-sky-300 bg-sky-50/80 hover:border-sky-500 hover:bg-sky-100/90 dark:border-sky-500/30 dark:bg-sky-500/[0.05] dark:hover:border-sky-500/60 dark:hover:bg-sky-500/[0.08] shadow-xs hover:shadow-sm',
    iconBg: 'bg-sky-100 dark:bg-sky-500/20',
    iconText: 'text-sky-700 dark:text-sky-400',
    tag: 'bg-sky-100 text-sky-800 border border-sky-200 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/20',
    title: 'text-sky-900 dark:text-sky-100 font-extrabold',
    desc: 'text-sky-800/90 dark:text-sky-300',
    action: 'text-sky-700 dark:text-sky-400 group-hover:text-sky-900 dark:group-hover:text-sky-300'
  },
  red: {
    card: 'border-red-300 bg-red-50/80 hover:border-red-500 hover:bg-red-100/90 dark:border-red-500/30 dark:bg-red-500/[0.05] dark:hover:border-red-500/60 dark:hover:bg-red-500/[0.08] shadow-xs hover:shadow-sm',
    iconBg: 'bg-red-100 dark:bg-red-500/20',
    iconText: 'text-red-700 dark:text-red-400',
    tag: 'bg-red-100 text-red-800 border border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/20',
    title: 'text-red-900 dark:text-red-100 font-extrabold',
    desc: 'text-red-800/90 dark:text-red-300',
    action: 'text-red-700 dark:text-red-400 group-hover:text-red-900 dark:group-hover:text-red-300'
  },
  emerald: {
    card: 'border-emerald-300 bg-emerald-50/80 hover:border-emerald-500 hover:bg-emerald-100/90 dark:border-emerald-500/30 dark:bg-emerald-500/[0.05] dark:hover:border-emerald-500/60 dark:hover:bg-emerald-500/[0.08] shadow-xs hover:shadow-sm',
    iconBg: 'bg-emerald-100 dark:bg-emerald-500/20',
    iconText: 'text-emerald-700 dark:text-emerald-400',
    tag: 'bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/20',
    title: 'text-emerald-900 dark:text-emerald-100 font-extrabold',
    desc: 'text-emerald-800/90 dark:text-emerald-300',
    action: 'text-emerald-700 dark:text-emerald-400 group-hover:text-emerald-900 dark:group-hover:text-emerald-300'
  },
  indigo: {
    card: 'border-indigo-300 bg-indigo-50/80 hover:border-indigo-500 hover:bg-indigo-100/90 dark:border-indigo-500/30 dark:bg-indigo-500/[0.05] dark:hover:border-indigo-500/60 dark:hover:bg-indigo-500/[0.08] shadow-xs hover:shadow-sm',
    iconBg: 'bg-indigo-100 dark:bg-indigo-500/20',
    iconText: 'text-indigo-700 dark:text-indigo-400',
    tag: 'bg-indigo-100 text-indigo-800 border border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/20',
    title: 'text-indigo-900 dark:text-indigo-100 font-extrabold',
    desc: 'text-indigo-800/90 dark:text-indigo-300',
    action: 'text-indigo-700 dark:text-indigo-400 group-hover:text-indigo-900 dark:group-hover:text-indigo-300'
  },
  amber: {
    card: 'border-amber-300 bg-amber-50/80 hover:border-amber-500 hover:bg-amber-100/90 dark:border-amber-500/30 dark:bg-amber-500/[0.05] dark:hover:border-amber-500/60 dark:hover:bg-amber-500/[0.08] shadow-xs hover:shadow-sm',
    iconBg: 'bg-amber-100 dark:bg-amber-500/20',
    iconText: 'text-amber-700 dark:text-amber-400',
    tag: 'bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/20',
    title: 'text-amber-900 dark:text-amber-100 font-extrabold',
    desc: 'text-amber-800/90 dark:text-amber-300',
    action: 'text-amber-700 dark:text-amber-400 group-hover:text-amber-900 dark:group-hover:text-amber-300'
  },
  teal: {
    card: 'border-teal-300 bg-teal-50/80 hover:border-teal-500 hover:bg-teal-100/90 dark:border-teal-500/30 dark:bg-teal-500/[0.05] dark:hover:border-teal-500/60 dark:hover:bg-teal-500/[0.08] shadow-xs hover:shadow-sm',
    iconBg: 'bg-teal-100 dark:bg-teal-500/20',
    iconText: 'text-teal-700 dark:text-teal-400',
    tag: 'bg-teal-100 text-teal-800 border border-teal-200 dark:bg-teal-500/20 dark:text-teal-300 dark:border-teal-500/20',
    title: 'text-teal-900 dark:text-teal-100 font-extrabold',
    desc: 'text-teal-800/90 dark:text-teal-300',
    action: 'text-teal-700 dark:text-teal-400 group-hover:text-teal-900 dark:group-hover:text-teal-300'
  }
};

const getIconComponent = (name: string) => {
  switch (name) {
    case 'Users': return Users;
    case 'Package': return Package;
    case 'Calendar': return Calendar;
    case 'Search': return Search;
    case 'ClipboardCheck': return ClipboardCheck;
    default: return Layers;
  }
};

export default function RegistrosPanel({ user, empresa, onNavigate }: RegistrosPanelProps) {
  const empresaId = empresa?.id || 'demo';

  const [sectors, setSectors] = useState<SectorItem[]>(() => {
    try {
      const saved = localStorage.getItem(`sectores_list_${empresaId}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_SECTORS;
  });

  const [showModal, setShowModal] = useState(false);
  const [editingSector, setEditingSector] = useState<SectorItem | null>(null);
  const [sectorForm, setSectorForm] = useState({
    label: '',
    description: '',
    tag: 'Operacional',
    colorKey: 'indigo',
    liberadoParaColaboradores: true
  });

  const saveSectorsToStorage = (updated: SectorItem[]) => {
    setSectors(updated);
    localStorage.setItem(`sectores_list_${empresaId}`, JSON.stringify(updated));
    window.dispatchEvent(new Event('local_data_changed'));
  };

  const handleToggleLiberation = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = sectors.map(s => {
      if (s.id === id) {
        return { ...s, liberadoParaColaboradores: !s.liberadoParaColaboradores };
      }
      return s;
    });
    saveSectorsToStorage(updated);
  };

  const handleDeleteSector = (idToDelete: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm('Deseja realmente EXCLUIR este setor operacional do painel?')) return;
    const updated = sectors.filter(s => s.id !== idToDelete);
    saveSectorsToStorage(updated);
  };

  const openNewSectorModal = () => {
    setEditingSector(null);
    setSectorForm({
      label: '',
      description: '',
      tag: 'Operacional',
      colorKey: 'indigo',
      liberadoParaColaboradores: true
    });
    setShowModal(true);
  };

  const openEditSectorModal = (sec: SectorItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingSector(sec);
    setSectorForm({
      label: sec.label,
      description: sec.description,
      tag: sec.tag,
      colorKey: sec.colorKey || 'indigo',
      liberadoParaColaboradores: sec.liberadoParaColaboradores !== false
    });
    setShowModal(true);
  };

  const handleSaveSector = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectorForm.label.trim()) {
      alert('Preencha o Nome do Setor.');
      return;
    }

    if (editingSector) {
      const updated = sectors.map(s => {
        if (s.id === editingSector.id) {
          return {
            ...s,
            label: sectorForm.label.trim(),
            description: sectorForm.description.trim() || 'Setor operacional configurado pela gestão.',
            tag: sectorForm.tag.trim() || 'Operacional',
            colorKey: sectorForm.colorKey,
            liberadoParaColaboradores: sectorForm.liberadoParaColaboradores
          };
        }
        return s;
      });
      saveSectorsToStorage(updated);
    } else {
      const newSector: SectorItem = {
        id: `custom_sec_${Date.now()}`,
        label: sectorForm.label.trim(),
        description: sectorForm.description.trim() || 'Novo setor operacional cadastrado.',
        iconName: 'Layers',
        colorKey: sectorForm.colorKey,
        tag: sectorForm.tag.trim() || 'Novo Setor',
        liberadoParaColaboradores: sectorForm.liberadoParaColaboradores,
        isCustom: true
      };
      saveSectorsToStorage([...sectors, newSector]);
    }

    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Theme-adaptive glass header banner */}
      <div className="bg-[#11151c] border border-[#1c2530] rounded-2xl p-6 relative overflow-hidden shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <ClipboardList className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-sans font-black uppercase tracking-tight text-[#e8eef5] leading-none">
              Governança & Setores Operacionais
            </h2>
            <p className="text-xs text-[#6a7d92] mt-1.5">
              Escolha quais setores liberar para acesso dos colaboradores e adicione novos setores conforme necessário.
            </p>
          </div>
        </div>

        <button
          onClick={openNewSectorModal}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer border-none shrink-0"
        >
          <Plus className="w-4 h-4" />
          Adicionar Novo Setor
        </button>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sectors.map((sector) => {
          const config = colorConfig[sector.colorKey] || colorConfig.indigo;
          const IconComp = getIconComponent(sector.iconName);

          return (
            <div 
              key={sector.id}
              className={`group p-5 border rounded-2xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden bg-[#0f172a] ${
                sector.liberadoParaColaboradores 
                  ? 'border-slate-800 hover:border-emerald-500/50' 
                  : 'border-rose-900/40 opacity-80'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${config.iconBg}`}>
                    <IconComp className={`w-5 h-5 ${config.iconText}`} />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${config.tag}`}>
                      {sector.tag}
                    </span>

                    {/* Trash & Edit buttons */}
                    <button
                      onClick={(e) => openEditSectorModal(sector, e)}
                      className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-md transition-colors cursor-pointer"
                      title="Editar Setor"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteSector(sector.id, e)}
                      className="p-1 bg-slate-800 hover:bg-rose-900/50 text-rose-400 hover:text-rose-200 rounded-md transition-colors cursor-pointer"
                      title="Excluir Setor"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className={`font-sans font-bold text-sm text-white flex items-center gap-2`}>
                    {sector.label}
                  </h3>
                  <p className={`text-xs leading-relaxed text-slate-400 mt-1 line-clamp-2`}>
                    {sector.description}
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                {/* Toggle Liberado para Colaboradores */}
                <button
                  onClick={(e) => handleToggleLiberation(sector.id, e)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer border ${
                    sector.liberadoParaColaboradores
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                  }`}
                  title="Clique para alternar permissão aos colaboradores"
                >
                  {sector.liberadoParaColaboradores ? (
                    <>
                      <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                      Liberado
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5 text-rose-400" />
                      Bloqueado
                    </>
                  )}
                </button>

                <button
                  onClick={() => onNavigate(sector.id)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer border border-slate-700"
                >
                  <span>Acessar</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Adicionar / Editar Setor */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveSector} className="bg-[#111a30] border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black uppercase tracking-tight text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-400" />
                {editingSector ? 'Editar Setor Operacional' : 'Adicionar Novo Setor'}
              </h3>
              <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase block mb-1">Nome do Setor *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Operação Empacotamento / Logística Especial"
                  value={sectorForm.label}
                  onChange={(e) => setSectorForm(prev => ({ ...prev, label: e.target.value }))}
                  className="w-full bg-[#0b1222] border border-slate-800 focus:border-emerald-500 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 uppercase block mb-1">Descrição do Setor</label>
                <textarea
                  rows={2}
                  placeholder="Descrição breve do objetivo ou procedimentos do setor..."
                  value={sectorForm.description}
                  onChange={(e) => setSectorForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-[#0b1222] border border-slate-800 focus:border-emerald-500 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase block mb-1">Tag / Categoria</label>
                  <input
                    type="text"
                    placeholder="Ex: Qualidade, Armazém"
                    value={sectorForm.tag}
                    onChange={(e) => setSectorForm(prev => ({ ...prev, tag: e.target.value }))}
                    className="w-full bg-[#0b1222] border border-slate-800 focus:border-emerald-500 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase block mb-1">Cor do Card</label>
                  <select
                    value={sectorForm.colorKey}
                    onChange={(e) => setSectorForm(prev => ({ ...prev, colorKey: e.target.value }))}
                    className="w-full bg-[#0b1222] border border-slate-800 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none cursor-pointer"
                  >
                    <option value="indigo">Índigo (Azul)</option>
                    <option value="emerald">Emeralda (Verde)</option>
                    <option value="amber">Âmbar (Laranja)</option>
                    <option value="teal">Teal (Ciano)</option>
                    <option value="purple">Púrpura</option>
                    <option value="rose">Rosa</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-[#0b1222] border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-xs text-white block">Liberado para Colaboradores?</span>
                  <span className="text-[10px] text-slate-400">Define se operadores podem ver este setor no menu.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSectorForm(prev => ({ ...prev, liberadoParaColaboradores: !prev.liberadoParaColaboradores }))}
                  className={`px-3 py-1 rounded-lg text-xs font-black uppercase cursor-pointer border ${
                    sectorForm.liberadoParaColaboradores
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-rose-900/60 text-rose-300 border-rose-700'
                  }`}
                >
                  {sectorForm.liberadoParaColaboradores ? 'SIM (Liberado)' : 'NÃO (Bloqueado)'}
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-md"
              >
                Salvar Setor
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

