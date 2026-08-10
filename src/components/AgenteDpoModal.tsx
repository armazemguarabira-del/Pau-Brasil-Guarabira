import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Send, 
  X, 
  Bot, 
  User, 
  ShieldCheck, 
  ArrowRight, 
  RefreshCw, 
  HelpCircle, 
  CheckCircle2, 
  AlertTriangle,
  FileText,
  Plus,
  Minus,
  Maximize2
} from 'lucide-react';
import { Usuario } from '../types';
import { useEmpresaData } from '../context/EmpresaDataContext';

interface AgenteDpoModalProps {
  user: Usuario;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToActions?: () => void;
}

interface Message {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
}

export function AgenteDpoModal({ user, isOpen, onClose, onNavigateToActions }: AgenteDpoModalProps) {
  const empresaData = useEmpresaData();
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'agent',
      text: `Olá, ${user.nome || 'Gestor'}! Sou o **Agente de IA Especializado em DPO — Pilar Armazém**.\n\nEstou conectado aos dados em tempo real da sua operação em Guarabira-PB. Como posso ajudar com auditorias, fórmulas oficiais (EFC/EFD, WQI, EFM) ou diagnóstico dos 5 Blocos DPO hoje?`,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isMinimized]);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: input,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    setInput('');
    setLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        text: m.text
      }));

      // Summarize context data to send to Gemini API
      const contextData = {
        empresa: 'Armazém Fácil (Pau Brasil Distribuidora - Guarabira-PB)',
        repackCount: empresaData.repack?.length || 0,
        despejoCount: empresaData.despejo?.length || 0,
        quebrasCount: empresaData.quebras?.length || 0,
        validadesCount: empresaData.validades?.length || 0,
        armazemCount: empresaData.armazem?.length || 0,
        blitzCount: empresaData.blitz?.length || 0,
        tarefasCount: empresaData.tarefas?.length || 0
      };

      const res = await fetch('/api/gemini/dpo-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: currentInput,
          history,
          contextData
        })
      });

      const data = await res.json();
      if (res.ok && data.text) {
        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: 'agent',
            text: data.text,
            timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      } else {
        throw new Error(data.error || 'Falha ao obter resposta do Agente DPO.');
      }
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'agent',
          text: `⚠️ **Aviso de Conexão**: ${err.message || 'Erro ao conectar com o Agente DPO.'}\n\n*Dica*: Você também pode consultar diretamente as normas no módulo Auditoria DPO e POPs da plataforma.`,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // IF MINIMIZED: DISCRETE FLOATING BADGE
  if (isMinimized) {
    return (
      <div 
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 right-4 z-50 bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border border-emerald-500/50 hover:border-emerald-400 text-white px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-3 cursor-pointer group hover:scale-105 transition-all animate-bounce-subtle"
      >
        <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400 shrink-0">
          <Bot className="w-4 h-4" />
        </div>
        <div className="text-left">
          <span className="text-xs font-black block leading-tight text-white group-hover:text-emerald-300 transition-colors">
            Agente DPO I.A.
          </span>
          <span className="text-[9px] text-emerald-400 font-bold uppercase block tracking-wider">
            ● Ativo • Clique p/ expandir
          </span>
        </div>
        <Maximize2 className="w-4 h-4 text-slate-400 group-hover:text-white ml-1 transition-colors" />
      </div>
    );
  }

  // FLOATING SIDE PANEL (DISCRETE RIGHT COLUMN)
  return (
    <div className="fixed bottom-4 right-4 z-50 w-92 sm:w-96 h-[520px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-300 dark:border-slate-800 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
      
      {/* HEADER */}
      <div className="p-3.5 bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-blue-900/60 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-black text-white">Agente DPO — Auditor I.A.</h3>
              <span className="px-1.5 py-0.2 rounded-md text-[8px] font-black uppercase bg-emerald-500/30 text-emerald-300 border border-emerald-400/30">
                Online
              </span>
            </div>
            <p className="text-[9px] text-slate-300 font-medium">Pilar Armazém & Qualidade (Ambev)</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button 
            onClick={() => setIsMinimized(true)}
            title="Minimizar painel"
            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button 
            onClick={onClose}
            title="Fechar"
            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-rose-500/30 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* MESSAGES BODY */}
      <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-slate-50 dark:bg-slate-950/50 text-xs">
        {messages.map(m => (
          <div 
            key={m.id}
            className={`flex gap-2 max-w-[92%] ${m.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
          >
            <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center font-bold text-[10px] ${
              m.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'
            }`}>
              {m.sender === 'user' ? <User className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
            </div>

            <div className={`p-3 rounded-xl text-[11px] space-y-1 shadow-2xs ${
              m.sender === 'user'
                ? 'bg-blue-600 text-white rounded-tr-none'
                : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-tl-none'
            }`}>
              <div className="whitespace-pre-wrap leading-relaxed font-sans">{m.text}</div>
              <span className={`text-[8px] block text-right font-medium ${m.sender === 'user' ? 'text-blue-200' : 'text-slate-400'}`}>
                {m.timestamp}
              </span>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2 max-w-[85%]">
            <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] text-slate-500 flex items-center gap-1.5">
              <span>Consultando normas DPO...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* QUICK PROMPTS & INPUT FOOTER */}
      <div className="p-2.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 space-y-2 shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[9px] no-scrollbar">
          <button
            onClick={() => setInput('Como avaliar o Bloco 2 de Qualidade e FEFO?')}
            className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md font-bold shrink-0 cursor-pointer whitespace-nowrap"
          >
            ❓ Bloco 2 (Qualidade)
          </button>
          <button
            onClick={() => setInput('Quais são as metas oficiais de EFC e EFD?')}
            className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md font-bold shrink-0 cursor-pointer whitespace-nowrap"
          >
            📊 Metas EFC/EFD
          </button>
          <button
            onClick={() => setInput('Como funciona a fórmula de Abastecimento do Picking?')}
            className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md font-bold shrink-0 cursor-pointer whitespace-nowrap"
          >
            📦 Abastecimento
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Dúvida sobre a matriz DPO..."
            className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1 shadow-md cursor-pointer shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

    </div>
  );
}
