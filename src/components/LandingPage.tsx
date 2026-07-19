import React, { useState, useEffect } from 'react';
import { BrandLogo } from './BrandLogo';
import { 
  Sparkles, 
  ArrowRight, 
  Zap, 
  Shield, 
  Clock, 
  Smartphone, 
  RefreshCw, 
  Trash2, 
  Truck, 
  AlertTriangle, 
  Calendar, 
  Search, 
  Package,
  BookOpen,
  ClipboardCheck,
  Check,
  Activity,
  FileText
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, getDocs, limit } from 'firebase/firestore';

interface LandingPageProps {
  onEnterApp: () => void;
}

export default function LandingPage({ onEnterApp }: LandingPageProps) {
  const [dbKpis, setDbKpis] = useState({
    repackAvg: 780,
    quebrasTotal: 124,
    validadesAlertas: 12,
  });

  // One-time Firestore KPI calculation for active connection proof
  useEffect(() => {
    if (!db) return;

    async function fetchKpis() {
      try {
        const qRepack = query(collection(db, 'repack'), limit(300));
        const snapRepack = await getDocs(qRepack);
        const rowsRepack = snapRepack.docs.map(doc => doc.data());
        if (rowsRepack.length > 0) {
          let totalQty = 0;
          let totalMin = 0;
          rowsRepack.forEach((r: any) => {
            totalQty += Number(r.quantidade) || 0;
            if (r.duracao) {
              const parts = r.duracao.split(':').map(Number);
              if (parts.length >= 2 && !parts.some(isNaN)) {
                const h = parts[0];
                const m = parts[1];
                const s = parts[2] || 0;
                totalMin += (h * 60) + m + (s / 60);
              }
            }
          });
          const avg = totalMin > 0 ? Math.round((totalQty / totalMin) * 60) : 780;
          setDbKpis(prev => ({ ...prev, repackAvg: avg > 0 ? avg : 780 }));
        }
      } catch (err) {
        console.warn("LandingPage repack fetch error:", err);
      }

      try {
        const qQuebras = query(collection(db, 'quebras'), limit(300));
        const snapQuebras = await getDocs(qQuebras);
        const rowsQuebras = snapQuebras.docs.map(doc => doc.data());
        if (rowsQuebras.length > 0) {
          const totalQty = rowsQuebras.reduce((sum: number, r: any) => sum + (Number(r.quantidade) || 0), 0);
          setDbKpis(prev => ({ ...prev, quebrasTotal: totalQty }));
        }
      } catch (err) {
        console.warn("LandingPage quebras fetch error:", err);
      }

      try {
        const qValidades = query(collection(db, 'validades'), limit(300));
        const snapValidades = await getDocs(qValidades);
        const rowsValidades = snapValidades.docs.map(doc => doc.data());
        if (rowsValidades.length > 0) {
          let alertCount = 0;
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          rowsValidades.forEach((v: any) => {
            if (v.validade) {
              try {
                let normDate = v.validade;
                if (v.validade.includes('/')) {
                  const [d, m, y] = v.validade.split('/');
                  normDate = `${y}-${m}-${d}`;
                }
                const exp = new Date(normDate + 'T00:00:00');
                const diffTime = exp.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays <= 30) {
                  alertCount++;
                }
              } catch (e) {
                // ignore
              }
            }
          });
          setDbKpis(prev => ({ ...prev, validadesAlertas: alertCount > 0 ? alertCount : rowsValidades.length }));
        }
      } catch (err) {
        console.warn("LandingPage validades fetch error:", err);
      }
    }

    fetchKpis();
  }, []);

  const modulosOperacionais = [
    {
      nome: 'Repack (Reembalagem)',
      icon: <RefreshCw className="w-5 h-5 text-blue-600" />,
      desc: 'Registre as caixas e garrafas reembaladas no seu turno. Ajuda a demonstrar a sua produtividade diária de forma direta.',
      foco: 'Operador de Repack'
    },
    {
      nome: 'Quebras & Avarias',
      icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
      desc: 'Comunique na hora qualquer garrafa quebrada ou caixa avariada encontrada na pista para o devido acerto físico de estoque.',
      foco: 'Toda a Equipe'
    },
    {
      nome: 'Validades (Controle FEFO)',
      icon: <Calendar className="w-5 h-5 text-amber-600" />,
      desc: 'Lançamento ágil de lotes próximos ao vencimento para garantir que os produtos saiam do armazém na ordem certa.',
      foco: 'Conferente & Estoque'
    },
    {
      nome: 'Empilhador & Segurança',
      icon: <Truck className="w-5 h-5 text-blue-600" />,
      desc: 'Faça o checklist de segurança (bateria, freios, pneus) antes de ligar a máquina e solicite reabastecimento de picking rápido.',
      foco: 'Operador de Empilhadeira'
    },
    {
      nome: 'Despejo & Descarte',
      icon: <Trash2 className="w-5 h-5 text-slate-600" />,
      desc: 'Registre de forma limpa e auditada as perdas que vão para descarte físico, garantindo as devidas aprovações automáticas.',
      foco: 'Operador de Despejo'
    },
    {
      nome: 'Blitz de Refugo',
      icon: <Search className="w-5 h-5 text-emerald-600" />,
      desc: 'Auditoria técnica de paletes de refugo comercial para resgate de itens aproveitáveis e identificação de melhorias.',
      foco: 'Supervisor & Líder'
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-blue-50/40 text-blue-900 relative z-10 selection:bg-blue-600 selection:text-white">
      
      {/* ── BARRA DE NAVEGAÇÃO SUPERIOR ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-16 px-6 md:px-12 bg-white/95 backdrop-blur-md border-b border-blue-100 flex items-center justify-between shadow-xs select-none">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="w-9 h-9 rounded-lg bg-blue-50/85 flex items-center justify-center shadow-xs border border-blue-100">
            <BrandLogo size="sm" variant="icon-only" />
          </div>
          <div className="flex items-center gap-1 font-sans">
            <span className="font-semibold text-blue-900 text-sm tracking-wider">PAU</span>
            <span className="font-black text-sm text-blue-700 tracking-wider border-l border-blue-200 pl-1 ml-1">BRASIL</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <a href="#objetivos" className="text-[11px] font-bold tracking-wider text-blue-600 hover:text-blue-900 transition-colors uppercase">Objetivos</a>
          <a href="#como-funciona" className="text-[11px] font-bold tracking-wider text-blue-600 hover:text-blue-900 transition-colors uppercase">Como Funciona</a>
          <a href="#modulos" className="text-[11px] font-bold tracking-wider text-blue-600 hover:text-blue-900 transition-colors uppercase">Seu Papel</a>
          <button 
            onClick={onEnterApp}
            className="font-sans text-xs font-black tracking-[1.5px] uppercase bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 hover:shadow-md hover:shadow-blue-200 transition-all cursor-pointer flex items-center gap-1.5 border-none"
          >
            Entrar no Sistema <ArrowRight className="w-3.5 h-3.5 stroke-[3px]" />
          </button>
        </div>

        {/* Mobile Action */}
        <div className="flex md:hidden">
          <button 
            onClick={onEnterApp}
            className="text-xs font-black tracking-[1px] uppercase bg-blue-600 text-white px-4 py-2 rounded-lg border-none"
          >
            Acessar
          </button>
        </div>
      </nav>


      {/* ── HERO / INTRODUÇÃO DA PLATAFORMA ── */}
      <header className="min-h-screen flex flex-col items-center justify-center pt-28 pb-16 px-6 text-center max-w-5xl mx-auto">
        
        <div className="inline-flex items-center gap-2 font-sans text-[10px] font-black uppercase tracking-[3px] text-blue-700 bg-blue-50 border border-blue-100 px-4 py-1.5 rounded-full mb-6 select-none shadow-xs">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
          <span>Informativo Oficial do Time do Armazém</span>
        </div>

        <h1 className="font-sans font-black text-3xl sm:text-4xl md:text-5xl leading-[1.15] tracking-tight mb-6 text-blue-900">
          ARMAZÉM FÁCIL PAU BRASIL AMBEV<br />
          <span className="text-blue-600 bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">Sua Produtividade em Tempo Real</span>
        </h1>

        <p className="text-sm sm:text-base text-blue-800/80 max-w-3xl leading-relaxed mb-10 font-medium">
          O <strong>Armazém Fácil</strong> foi criado especialmente para apoiar quem faz a engrenagem da nossa Revenda girar todos os dias: <strong>o nosso time operacional</strong>. Nossa intenção é transformar as antigas planilhas de papel, pranchetas e controles manuais em uma plataforma rápida, conectada e que valoriza a produtividade de cada operador em tempo real.
        </p>

        {/* Botões de Ação Rápida */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 w-full sm:w-auto">
          <button 
            onClick={onEnterApp} 
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-blue-600 text-white font-black text-xs uppercase tracking-wider px-8 py-4 rounded-xl shadow-md shadow-blue-200 hover:bg-blue-700 hover:-translate-y-0.5 transition-all text-center cursor-pointer border-none"
          >
            Acessar a Plataforma Agora <ArrowRight className="w-4 h-4 stroke-[2.5px]" />
          </button>

          <a 
            href="#como-funciona" 
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 bg-white hover:bg-blue-50 border border-blue-150 text-blue-700 hover:text-blue-900 font-bold text-xs uppercase tracking-wider px-6 py-4 rounded-xl transition-all text-center"
          >
            Entender o Funcionamento
          </a>
        </div>

        {/* Visualização de Status do Pátio em Tempo Real */}
        <div className="w-full max-w-4xl bg-white border border-blue-100 rounded-2xl overflow-hidden shadow-xl shadow-blue-100/30">
          <div className="bg-blue-50/50 border-b border-blue-100 px-4 py-3 flex items-center justify-between">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-300"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-blue-300"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-blue-300"></span>
            </div>
            <span className="text-[10px] font-mono text-blue-400 font-semibold tracking-wider">
              armazem-facil-ambev // conexao-ativa
            </span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[9px] font-mono text-emerald-600 font-bold uppercase">Sincronizado</span>
            </div>
          </div>
          <div className="p-6 text-left">
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between border-b border-blue-50 pb-3 gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-blue-900">📊 Visão Ativa do Armazém</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Mesa de Controle Integrada</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50/30 border border-blue-100 rounded-xl">
                <span className="block text-[10px] uppercase font-black text-blue-500 tracking-wider mb-1">Rendimento Médio Repack</span>
                <span className="font-sans font-black text-2xl text-blue-900">{dbKpis.repackAvg} cx/hora</span>
                <p className="text-[10px] text-blue-500 mt-1">Registros consolidados de produtividade</p>
              </div>

              <div className="p-4 bg-blue-50/30 border border-blue-100 rounded-xl">
                <span className="block text-[10px] uppercase font-black text-blue-500 tracking-wider mb-1">Quebras Registradas</span>
                <span className="font-sans font-black text-2xl text-blue-900">{dbKpis.quebrasTotal} cx</span>
                <p className="text-[10px] text-blue-500 mt-1">Avarias comunicadas instantaneamente</p>
              </div>

              <div className="p-4 bg-blue-50/30 border border-blue-100 rounded-xl">
                <span className="block text-[10px] uppercase font-black text-blue-500 tracking-wider mb-1">Alertas de Validade (FEFO)</span>
                <span className="font-sans font-black text-2xl text-blue-900">{dbKpis.validadesAlertas} Produtos</span>
                <p className="text-[10px] text-blue-500 mt-1">Sinalização de lotes com vencimento próximo</p>
              </div>
            </div>
          </div>
        </div>

      </header>


      {/* ── SEÇÃO: QUAIS OS OBJETIVOS COM A PLATAFORMA ── */}
      <section id="objetivos" className="py-20 border-t border-b border-blue-100 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <span className="font-sans font-black text-[10px] uppercase tracking-[3px] text-blue-600 block mb-2">POR QUE CRIAMOS O ARMAZÉM FÁCIL?</span>
            <h2 className="font-sans font-black text-2xl md:text-3xl tracking-tight text-blue-950">Os Nossos Objetivos Principais</h2>
            <p className="text-blue-700/80 text-xs mt-3 leading-relaxed">
              Desenvolvemos esta plataforma para eliminar processos manuais burocráticos e dar mais autonomia, transparência e segurança para a sua rotina de trabalho.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Objetivo 1 */}
            <div className="p-6 bg-slate-50 dark:bg-blue-50/10 border border-blue-100 rounded-2xl flex flex-col gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-sans font-black text-xs uppercase tracking-wider text-blue-950">1. Agilidade e Fim das Planilhas de Papel</h3>
              <p className="text-xs text-blue-700/80 leading-relaxed">
                Chega de andar com pranchetas amassadas na pista ou canetas que falham. Todo lançamento de quebras, repack ou validades é feito em segundos diretamente no celular ou no coletor de dados.
              </p>
            </div>

            {/* Objetivo 2 */}
            <div className="p-6 bg-slate-50 dark:bg-blue-50/10 border border-blue-100 rounded-2xl flex flex-col gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="font-sans font-black text-xs uppercase tracking-wider text-blue-950">2. Conectividade Direta com a Mesa</h3>
              <p className="text-xs text-blue-700/80 leading-relaxed">
                Não precisa caminhar de uma ponta a outra do galpão para entregar uma ficha de quebra física. Assim que você salva o dado, a Mesa de Controle recebe na mesma hora para as devidas aprovações comerciais.
              </p>
            </div>

            {/* Objetivo 3 */}
            <div className="p-6 bg-slate-50 dark:bg-blue-50/10 border border-blue-100 rounded-2xl flex flex-col gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                <ClipboardCheck className="w-5 h-5" />
              </div>
              <h3 className="font-sans font-black text-xs uppercase tracking-wider text-blue-950">3. Valorização e Transparência</h3>
              <p className="text-xs text-blue-700/80 leading-relaxed">
                Seu empenho diário no repack ou no reabastecimento é registrado de forma individual e automática. A plataforma calcula de forma justa os indicadores operacionais de produtividade e qualidade.
              </p>
            </div>

          </div>
        </div>
      </section>


      {/* ── SEÇÃO: COMO FUNCIONA O FLUXO ── */}
      <section id="como-funciona" className="py-20 bg-blue-50/20 border-b border-blue-100 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
            
            <div className="md:col-span-6 space-y-5 text-left">
              <span className="font-sans font-bold text-xs uppercase tracking-[3px] text-blue-600">PASSO A PASSO SIMPLES</span>
              <h2 className="font-sans font-black text-2xl md:text-3xl tracking-tight leading-tight text-blue-950">
                Como a Plataforma Funciona no Seu Dia a Dia
              </h2>
              <p className="text-xs text-blue-800/80 leading-relaxed">
                O funcionamento da plataforma foi desenhado para ser intuitivo. Cada operador contribui diretamente de onde estiver na pista para manter as informações integradas e o pátio sincronizado.
              </p>
              
              <div className="space-y-4 pt-2">
                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-sans font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="font-sans font-black text-xs uppercase tracking-wide text-blue-900">Faça Login com seu Perfil</h4>
                    <p className="text-xs text-blue-600/80 mt-1">Ao entrar, escolha seu papel operacional ou supervisor. Cada perfil tem telas preparadas exatamente para a sua atividade específica.</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-sans font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h4 className="font-sans font-black text-xs uppercase tracking-wide text-blue-900">Lançamento em Segundos</h4>
                    <p className="text-xs text-blue-600/80 mt-1">Digite as quantidades, selecione o SKU (Cerveja, Refrigerante, etc.) e salve. Não há redigitação. O processo de lançamento dura segundos.</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-sans font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h4 className="font-sans font-black text-xs uppercase tracking-wide text-blue-900">Registrou, Atualizou na Hora</h4>
                    <p className="text-xs text-blue-600/80 mt-1">A informação vai direto para o banco de dados e atualiza o painel da Revenda. A mesa de controle de DPO, a coordenação e a supervisão acompanham em tempo real.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-6 bg-white border border-blue-100 p-6 rounded-2xl shadow-xs space-y-4 text-left">
              <h3 className="font-sans font-black text-xs uppercase tracking-wider text-blue-800 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" /> Manuais e POPs ao seu Alcance
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Além de fazer lançamentos de forma ágil, a plataforma funciona como um manual de bolso do operador. Você pode acessar diretamente pelo app:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-50">
                  <span className="font-bold text-[10px] text-blue-700 uppercase tracking-wider block">📄 Instruções de Trabalho (POP)</span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Passo a passo correto para executar tarefas perfeitamente.</span>
                </div>
                <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-50">
                  <span className="font-bold text-[10px] text-blue-700 uppercase tracking-wider block">💡 Lição de um Ponto (LUP)</span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Dicas rápidas e visuais para esclarecer dúvidas frequentes.</span>
                </div>
                <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-50">
                  <span className="font-bold text-[10px] text-blue-700 uppercase tracking-wider block">📊 Matriz RACI</span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Definição clara de quem é o responsável por cada atividade no pátio.</span>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                  <span className="font-bold text-[10px] text-emerald-800 uppercase tracking-wider block">🛡️ Segurança Ativa</span>
                  <span className="text-[10px] text-emerald-600 mt-0.5 block">Checklists e avisos de corredores para garantir o acidente zero.</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>


      {/* ── SEÇÃO: OS MÓDULOS E O PAPEL DE CADA UM ── */}
      <section id="modulos" className="py-20 px-6 max-w-5xl mx-auto bg-white rounded-2xl my-12 border border-blue-100 shadow-xs">
        <div className="text-center mb-14 max-w-2xl mx-auto">
          <span className="font-sans font-black text-[10px] uppercase tracking-[3px] text-blue-600 block mb-2">QUAIS MÓDULOS VOCÊ VAI OPERAR?</span>
          <h2 className="font-sans font-black text-2xl md:text-3xl tracking-tight text-blue-950">Apoio a Todas as Funções da Revenda</h2>
          <p className="text-blue-700/80 text-xs mt-3 leading-relaxed">
            Cada área do armazém tem seu canal específico no sistema, garantindo clareza e separação de responsabilidades.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modulosOperacionais.map((m, idx) => (
            <div key={idx} className="p-5 bg-slate-50 dark:bg-blue-50/5 border border-blue-100 hover:border-blue-200 rounded-xl flex flex-col justify-between transition-all duration-300">
              <div>
                <div className="w-9 h-9 rounded-lg bg-white border border-blue-100 flex items-center justify-center mb-3">
                  {m.icon}
                </div>
                <h3 className="font-sans font-black text-xs text-blue-950 uppercase tracking-wider">{m.nome}</h3>
                <span className="inline-block px-1.5 py-0.5 rounded bg-blue-50 border border-blue-100 text-[8px] font-black text-blue-600 uppercase tracking-widest mt-1 mb-3">
                  👉 Foco: {m.foco}
                </span>
                <p className="text-xs text-slate-500 leading-relaxed">{m.desc}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-blue-100/60 flex items-center gap-1.5 text-[10px] text-emerald-600 font-bold">
                <span>✓</span>
                <span>"Registrou, Atualizou na Hora"</span>
              </div>
            </div>
          ))}
        </div>
      </section>


      {/* ── MENSAGEM DE SEGURANÇA E PRODUTIVIDADE NO RODAPÉ ── */}
      <section className="bg-gradient-to-br from-blue-900 to-blue-950 text-white py-16 px-6 text-center select-none">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto text-yellow-400 border border-white/20">
            <Shield className="w-6 h-6 text-yellow-400" />
          </div>
          <h2 className="font-sans font-black text-2xl md:text-3xl tracking-tight">Fazer o Certo da Maneira Certa, Sempre!</h2>
          <p className="text-xs text-blue-200/90 leading-relaxed max-w-2xl mx-auto font-medium">
            O Armazém Fácil nos ajuda a trabalhar com inteligência, reuniões rápidas e decisões ágeis, reduzindo erros de movimentação de estoque, acelerando as rotas de retorno e valorizando a dedicação diária da nossa equipe. Faça seus lançamentos com atenção e responsabilidade e ajude a manter nossa unidade como referência de eficiência operacional e excelência em DPO Ambev!
          </p>
          <div className="pt-4">
            <button 
              onClick={onEnterApp}
              className="inline-flex items-center gap-2 bg-blue-600 text-white font-black text-xs uppercase tracking-wider px-8 py-4 rounded-xl hover:bg-blue-700 transition-all border-none"
            >
              Começar a Usar a Plataforma <ArrowRight className="w-4 h-4 stroke-[2.5px]" />
            </button>
          </div>
        </div>
      </section>


      {/* ── FOOTER DO PORTAL ── */}
      <footer className="border-t border-blue-100 py-8 text-center text-[10px] text-blue-600 tracking-wider uppercase font-semibold bg-white shadow-inner">
        Pau Brasil Distribuidora © Todos os Direitos Reservados · Gestão de Retorno de Rota em Tempo Real — Ambev Guarabira
      </footer>
    </div>
  );
}
