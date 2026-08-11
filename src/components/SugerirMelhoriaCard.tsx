import React, { useState, useEffect } from 'react';
import { Usuario, Empresa } from '../types';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useEmpresaData } from '../context/EmpresaDataContext';
import { motion, AnimatePresence } from 'motion/react';
import { Lightbulb, Send, CheckCircle2, MessageSquare, Shield } from 'lucide-react';

interface SugerirMelhoriaCardProps {
  user: Usuario;
  empresa: Empresa | null;
  setor: string;
}

export default function SugerirMelhoriaCard({ user, empresa, setor }: SugerirMelhoriaCardProps) {
  const [categoriaAcao, setCategoriaAcao] = useState<'fefo_quebra' | 'fefo_comercial' | 'fefo_wms'>('fefo_quebra');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [recentMelhorias, setRecentMelhorias] = useState<any[]>([]);
  
  // List of active supervisors/administrators
  const [gestores, setGestores] = useState<any[]>([]);
  const [selectedGestorId, setSelectedGestorId] = useState('');

  const empresaId = user.empresaId || 'demo';
  const empresaData = useEmpresaData();

  const isFefoSetor = setor === 'Validade' || setor === 'Conferente' || setor === 'EFC / EFD';

  // Load supervisors and administrators of the company
  useEffect(() => {
    if (!db || !empresaId) return;
    const list = empresaData.usuarios.filter((u: any) => u.papel === 'admin' || u.papel === 'controle' || u.isControle === true);
    setGestores(list);
    if (list.length > 0 && !selectedGestorId) {
      setSelectedGestorId((list[0] as any).id || (list[0] as any).uid || '');
    }
  }, [empresaData.usuarios, empresaId]);

  // Load proposed improvements for this sector and company
  useEffect(() => {
    if (!db) return;
    const docs = empresaData.acoes.filter((a: any) => (a.setor === setor || isFefoSetor) && a.tipo === 'supervisor');
    docs.sort((a, b) => {
      const dateA = a.criadoEm ? new Date(a.criadoEm).getTime() : 0;
      const dateB = b.criadoEm ? new Date(b.criadoEm).getTime() : 0;
      return dateB - dateA;
    });
    setRecentMelhorias(docs);
  }, [empresaData.acoes, setor, isFefoSetor]);

  const applyPreset = (presetTitle: string, presetDesc: string, cat: 'fefo_quebra' | 'fefo_comercial' | 'fefo_wms') => {
    setTitulo(presetTitle);
    setDescricao(presetDesc);
    setCategoriaAcao(cat);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !descricao.trim()) return;

    setSending(true);
    setSuccess(false);

    try {
      const criadoEm = new Date().toISOString();
      const limiteEm = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days limit

      // Find selected gestor info
      const targetGestor = gestores.find(g => g.id === selectedGestorId || g.uid === selectedGestorId);
      const destinoGestorId = selectedGestorId || 'geral';
      const destinoGestorNome = targetGestor ? targetGestor.nome : 'Supervisor Geral';
      const destinoGestorPapel = targetGestor ? (targetGestor.papel === 'admin' ? 'Administrador' : 'Supervisor') : 'Supervisor';

      await addDoc(collection(db, 'acoes'), {
        empresaId,
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        categoriaAcao,
        tipo: 'supervisor',
        setor,
        status: 'pendente',
        criadoEm,
        limiteEm,
        colaboradorId: user.uid,
        colaboradorNome: user.nome,
        criadoPorNome: user.nome,
        criadoPorEmail: user.email || '',
        destinoGestorId,
        destinoGestorNome,
        destinoGestorPapel
      });

      setTitulo('');
      setDescricao('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      console.error("Erro ao propor melhoria", err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mt-6" id={`sugerir-melhoria-${setor.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <Lightbulb className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-sans font-bold text-slate-800 text-sm">
              {isFefoSetor ? 'Gestão e Governança de Ações FEFO & Escoamento Comercial' : 'Propor Melhoria Diária / Plano de Ação'}
            </h4>
            <p className="text-[10px] text-slate-400">
              {isFefoSetor 
                ? 'Registre ações direcionadas ao item FEFO: prevenção de quebra de FEFO e ofertas comerciais para escoamento acelerado' 
                : 'Sugira soluções ou melhorias de processos e indique o gestor responsável para agir'}
            </p>
          </div>
        </div>

        {isFefoSetor && (
          <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 bg-amber-500/10 text-amber-700 border border-amber-300 rounded-lg">
            Ações Direcionadas FEFO
          </span>
        )}
      </div>

      {/* QUICK PRESETS FOR FEFO */}
      {isFefoSetor && (
        <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-2">
          <span className="text-[10px] font-bold uppercase text-slate-500">
            ⚡ Modelos Rápidos de Governança FEFO & Escoamento:
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyPreset('Prevenção de Quebra FEFO: Remanejamento para Picking', 'Identificada diferença de validade entre estoque central e picking. Solicitado remanejamento imediato do lote mais antigo para a frente de expedição.', 'fefo_quebra')}
              className="text-[10px] font-bold px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors cursor-pointer"
            >
              🚨 Prevenir Quebra FEFO (Remanejar p/ Picking)
            </button>
            <button
              type="button"
              onClick={() => applyPreset('Ação Comercial de Escoamento: Combo Promocional & Desconto', 'Lote com Stock Age elevado. Proposta comercial de combo com desconto progressivo para clientes de giro rápido da rota regional.', 'fefo_comercial')}
              className="text-[10px] font-bold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              📢 Escoamento Comercial (Combo Promocional)
            </button>
            <button
              type="button"
              onClick={() => applyPreset('Bloqueio no WMS: Lote Mais Novo Retido', 'Solicitação de trava temporária no WMS para impedir o faturamento do lote mais recente enquanto restarem caixas do lote FEFO anterior.', 'fefo_wms')}
              className="text-[10px] font-bold px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors cursor-pointer"
            >
              🔒 Trava no WMS (Priorizar FEFO)
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 flex flex-col gap-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Categoria FEFO
              </label>
              <select
                value={categoriaAcao}
                onChange={(e) => setCategoriaAcao(e.target.value as any)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-amber-500 text-slate-700 font-bold"
              >
                <option value="fefo_quebra">🚨 Quebra de FEFO (Ação Corretiva)</option>
                <option value="fefo_comercial">📢 Ação Comercial (Escoamento)</option>
                <option value="fefo_wms">⚙️ Trava / Operacional WMS</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Título da Ação FEFO
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Escoamento comercial de chopp / Trava WMS"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-amber-500 text-slate-700 font-medium"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Destinar para Gestor
              </label>
              <select
                value={selectedGestorId}
                onChange={(e) => setSelectedGestorId(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-amber-500 text-slate-700 font-medium"
              >
                <option value="">Geral (Todos os Supervisores)</option>
                {gestores.map((g) => (
                  <option key={g.id || g.uid} value={g.id || g.uid}>
                    {g.nome} ({g.papel === 'admin' ? 'Administrador' : 'Supervisor'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Detalhes do Plano de Ação FEFO
            </label>
            <textarea
              required
              rows={2}
              placeholder="Descreva o SKU, a quantidade envolvida, a ação comercial de escoamento ou procedimento para evitar quebra de FEFO..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-amber-500 text-slate-700 font-medium resize-none"
            />
          </div>

          <div className="flex justify-between items-center mt-1">
            <AnimatePresence>
              {success && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Enviado com sucesso ao gestor!
                </motion.span>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={sending || !titulo.trim() || !descricao.trim()}
              className="ml-auto flex items-center gap-1.5 px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-700 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? 'Enviando...' : (
                <>
                  <Send className="w-3 h-3" />
                  Enviar para Gestor
                </>
              )}
            </button>
          </div>
        </form>

        {/* Recent Proposed list */}
        <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-slate-100 lg:pl-5 flex flex-col max-h-[200px]">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">
            Sugestões Recentes deste Setor ({recentMelhorias.length})
          </span>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {recentMelhorias.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <MessageSquare className="w-5 h-5 text-slate-300 mb-1" />
                <p className="text-[10px] text-slate-400">Nenhuma sugestão enviada recentemente por aqui.</p>
              </div>
            ) : (
              recentMelhorias.slice(0, 5).map((m: any) => (
                <div key={m.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex flex-col gap-1">
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-bold text-slate-700 text-[11px] truncate leading-tight">
                      {m.titulo}
                    </span>
                    <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                      m.status === 'concluido' || m.status === 'resolvido' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {m.status === 'concluido' || m.status === 'resolvido' ? 'Resolvido' : 'Pendente'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">
                    {m.descricao}
                  </p>
                  
                  {m.destinoGestorNome && (
                    <div className="flex items-center gap-1 text-[9px] font-semibold text-amber-600 mt-1">
                      <Shield className="w-3 h-3 text-amber-500" />
                      <span>Para: {m.destinoGestorNome} ({m.destinoGestorPapel || 'Supervisor'})</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[8px] text-slate-400 mt-1 font-medium border-t border-slate-100/60 pt-1">
                    <span>Por: {m.colaboradorNome}</span>
                    <span>{new Date(m.criadoEm).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
