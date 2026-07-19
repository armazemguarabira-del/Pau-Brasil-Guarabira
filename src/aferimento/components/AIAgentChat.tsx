import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Sparkles, Bot, User, CornerDownLeft } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export default function AIAgentChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Olá! Sou o Assistente de Inteligência Artificial da plataforma. Posso tirar qualquer dúvida sobre a operação física de pátio, reconciliação fiscal, monitoramento de viagens ou cadastro de motoristas e veículos. Como posso te ajudar hoje?'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(true); // Toast indicator for welcome
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setHasNewMessage(false);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const quickQuestions = [
    "Como iniciar uma conferência?",
    "Como funciona o pernoite?",
    "O que fazer se houver sobras?",
    "Como pedir recontagem fiscal?"
  ];

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsgId = `user-${Date.now()}`;
    const newMessages: ChatMessage[] = [
      ...messages,
      { id: userMsgId, role: 'user', text: textToSend }
    ];
    setMessages(newMessages);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/aferimento-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: textToSend,
          // Format history excluding the welcome message
          history: messages
            .filter(m => m.id !== 'welcome')
            .map(m => ({
              role: m.role,
              text: m.text
            }))
        })
      });

      let data: any = {};
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        try {
          data = await response.json();
        } catch (jsonErr) {
          console.error("Error parsing chat response JSON:", jsonErr);
        }
      } else {
        console.warn("Unexpected chat response content type:", contentType);
      }
      
      if (response.ok && data.text) {
        setMessages(prev => [
          ...prev,
          { id: `ai-${Date.now()}`, role: 'model', text: data.text }
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          { 
            id: `ai-${Date.now()}`, 
            role: 'model', 
            text: data.error || 'Desculpe, ocorreu uma instabilidade ao conectar com o servidor da I.A. Verifique se o seu GEMINI_API_KEY está configurado corretamente.' 
          }
        ]);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        { 
          id: `ai-${Date.now()}`, 
          role: 'model', 
          text: 'Não foi possível estabelecer contato com a inteligência artificial. Certifique-se de que o servidor está rodando.' 
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputText);
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 font-sans" id="ai_agent_chat_wrapper">
      {/* Floating Action Button (FAB) */}
      {!isOpen && (
        <button
          id="ai_chat_fab_button"
          onClick={() => setIsOpen(true)}
          className="relative group bg-[#0f35a9] hover:bg-[#0c2a86] text-white p-4 rounded-full shadow-2xl transition-all duration-300 flex items-center justify-center cursor-pointer border border-[#0f35a9]/50 hover:scale-105"
          title="Fale com a Inteligência Artificial"
        >
          {hasNewMessage && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 text-[10px] font-extrabold text-white items-center justify-center">1</span>
            </span>
          )}
          <Bot className="h-6 w-6 text-white" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 ease-in-out whitespace-nowrap text-xs font-bold pl-0 group-hover:pl-2">
            Dúvidas? Fale com a I.A
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div 
          id="ai_chat_window"
          className="bg-white rounded-2xl shadow-3xl border border-slate-200 w-80 sm:w-96 h-[480px] flex flex-col overflow-hidden animate-fade-in"
        >
          {/* Header */}
          <div className="bg-slate-900 px-4 py-3 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-[#0f35a9]/10 rounded-lg border border-[#0f35a9]/30">
                <Sparkles className="h-4 w-4 text-amber-400 animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white leading-none flex items-center gap-1">
                  Assistente Pau Brasil
                  <span className="bg-[#0f35a9] text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">I.A</span>
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Operações Pau Brasil Ambev</p>
              </div>
            </div>
            <button
              id="ai_chat_close_button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages List */}
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 max-w-[85%] ${
                  msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''
                }`}
              >
                <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 border ${
                  msg.role === 'user' 
                    ? 'bg-slate-200 border-slate-300 text-slate-700' 
                    : 'bg-[#0f35a9]/10 border-[#0f35a9]/20 text-[#0f35a9]'
                }`}>
                  {msg.role === 'user' ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                </div>
                
                <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#0f35a9] text-white rounded-tr-none'
                    : 'bg-white text-slate-700 shadow-3xs border border-slate-100 rounded-tl-none'
                }`}>
                  <p className="whitespace-pre-line">{msg.text}</p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2.5 max-w-[85%]">
                <div className="h-7 w-7 rounded-full bg-[#0f35a9]/10 border-[#0f35a9]/20 text-[#0f35a9] flex items-center justify-center">
                  <Bot className="h-3.5 w-3.5" />
                </div>
                <div className="p-3 bg-white border border-slate-100 rounded-2xl rounded-tl-none flex items-center space-x-1.5 shadow-3xs">
                  <span className="w-1.5 h-1.5 bg-[#0f35a9] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-[#0f35a9] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-[#0f35a9] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions */}
          {messages.length === 1 && !isLoading && (
            <div className="px-4 py-2 bg-slate-100/50 border-t border-slate-100 flex flex-wrap gap-1.5">
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(q)}
                  className="bg-white hover:bg-slate-50 border border-slate-200 text-[10px] text-slate-600 hover:text-slate-800 font-medium px-2 py-1 rounded-lg transition text-left shrink-0 cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input Form */}
          <form 
            onSubmit={handleSubmit} 
            className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Digite sua dúvida sobre o sistema..."
              disabled={isLoading}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#0f35a9] focus:border-[#0f35a9] transition disabled:opacity-60"
            />
            <button
              id="ai_chat_send_button"
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="bg-[#0f35a9] hover:bg-[#0c2a86] text-white p-2 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              title="Enviar mensagem"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
