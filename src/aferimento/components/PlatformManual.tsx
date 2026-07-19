import React, { useState } from 'react';
import { BookOpen, Download, FileText, ChevronDown, ChevronUp, CheckCircle, Shield, Truck, Settings, AlertTriangle, Users, GitCommit } from 'lucide-react';

export default function PlatformManual() {
  const [isOpen, setIsOpen] = useState(false);

  const handleDownloadPDF = () => {
    const printWindow = window.open('', '', 'width=900,height=950');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Manual de Diretrizes - Retorno de Rota Pau Brasil</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
              body { 
                font-family: 'Inter', sans-serif; 
                color: #0f172a; 
                padding: 40px; 
                line-height: 1.5; 
                background: #ffffff;
                font-size: 11px;
              }
              .header-logo {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 3px solid #0f35a9;
                padding-bottom: 15px;
              }
              .logo-title {
                font-size: 24px;
                font-weight: 800;
                color: #0f35a9;
                letter-spacing: -0.025em;
                margin: 0;
              }
              .logo-subtitle {
                font-size: 10px;
                text-transform: uppercase;
                letter-spacing: 0.15em;
                color: #475569;
                font-weight: 700;
                margin-top: 3px;
              }
              .logo-tag {
                color: #f59e0b;
                font-weight: 900;
              }
              h1 { 
                color: #0f35a9; 
                font-size: 18px; 
                font-weight: 800;
                margin-top: 0; 
                margin-bottom: 15px;
                text-align: center;
              }
              h2 { 
                color: #0f35a9; 
                font-size: 13px; 
                font-weight: 700;
                margin-top: 25px; 
                margin-bottom: 10px;
                border-bottom: 2px solid #0f35a9; 
                padding-bottom: 4px; 
                text-transform: uppercase;
                letter-spacing: 0.02em;
              }
              h3 { 
                color: #1e293b; 
                font-size: 11px; 
                font-weight: 700;
                margin-top: 15px; 
                margin-bottom: 5px;
              }
              p { 
                font-size: 11px; 
                color: #334155;
                margin: 6px 0; 
                text-align: justify;
              }
              ul, ol { 
                font-size: 11px; 
                color: #334155;
                padding-left: 20px; 
                margin-top: 5px;
                margin-bottom: 10px;
              }
              li { 
                margin: 4px 0; 
              }
              .meta-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
                background: #f8fafc;
                border: 1px solid #cbd5e1;
              }
              .meta-table td {
                padding: 10px;
                border: 1px solid #cbd5e1;
                font-size: 11px;
              }
              .meta-label {
                font-weight: 700;
                color: #475569;
                width: 25%;
                background: #f1f5f9;
              }
              .meta-val {
                color: #0f172a;
                font-weight: 600;
              }
              
              /* RACI Table Styling */
              .raci-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 10px;
                margin-bottom: 20px;
              }
              .raci-table th, .raci-table td {
                border: 1px solid #cbd5e1;
                padding: 6px 8px;
                text-align: center;
                font-size: 10px;
              }
              .raci-table th {
                background: #0f35a9;
                color: #ffffff;
                font-weight: 700;
                text-transform: uppercase;
                font-size: 9px;
              }
              .raci-table td:first-child {
                text-align: left;
                font-weight: 700;
                background: #f8fafc;
                width: 35%;
              }
              .raci-letter {
                font-weight: 800;
                font-size: 12px;
                border-radius: 4px;
                padding: 2px 6px;
                display: inline-block;
              }
              .raci-r { background: #fee2e2; color: #991b1b; }
              .raci-a { background: #fef3c7; color: #92400e; }
              .raci-c { background: #e0f2fe; color: #075985; }
              .raci-i { background: #d1fae5; color: #065f46; }

              /* Flowchart Visuals */
              .flowchart {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 15px;
                font-family: 'Courier New', Courier, monospace;
                font-size: 10px;
                color: #0f172a;
                line-height: 1.3;
                white-space: pre-wrap;
                margin: 15px 0;
              }

              .role-badge {
                display: inline-block;
                padding: 3px 10px;
                border-radius: 6px;
                font-size: 9px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                margin-bottom: 10px;
              }
              .badge-conferente { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
              .badge-fiscal { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
              .badge-monitor { background: #e0f2fe; color: #075985; border: 1px solid #bae6fd; }
              .badge-gestor { background: #f3e8ff; color: #6b21a8; border: 1px solid #e9d5ff; }
              
              .rule-box {
                background: #fffbeb;
                border-left: 4px solid #f59e0b;
                padding: 12px 16px;
                margin: 15px 0;
                border-radius: 0 8px 8px 0;
              }
              .rule-box-title {
                font-weight: 700;
                font-size: 11px;
                color: #78350f;
                margin-bottom: 4px;
              }
              .footer { 
                margin-top: 40px; 
                text-align: center; 
                font-size: 9px; 
                color: #64748b; 
                border-top: 1px solid #e2e8f0; 
                padding-top: 15px; 
              }
              .page-break {
                page-break-before: always;
              }
            </style>
          </head>
          <body>
            <div class="header-logo">
              <div class="logo-title">PAU BRASIL</div>
              <div class="logo-subtitle">distribuidora <span class="logo-tag">ambev</span></div>
            </div>
            
            <h1>PADRÃO DE OPERAÇÃO DA PLATAFORMA INTEGRADA DE RETORNO DE ROTA</h1>
            
            <!-- Approval and metadata -->
            <table class="meta-table">
              <tr>
                <td class="meta-label">Elaborador do Padrão</td>
                <td class="meta-val">Djeanderson Soares — Coordenador de Armazém</td>
                <td class="meta-label">Data de Elaboração</td>
                <td class="meta-val">${new Date().toLocaleDateString('pt-BR')}</td>
              </tr>
              <tr>
                <td class="meta-label">Aprovador do Padrão</td>
                <td class="meta-val">Marcos Guilherme — GOD</td>
                <td class="meta-label">Status do Documento</td>
                <td class="meta-val" style="color: #10b981;">✓ Aprovado e Vigente</td>
              </tr>
            </table>

            <p>Este documento estabelece o <strong>Procedimento Operacional Padrão (POP)</strong> para o retorno de rotas na revenda Pau Brasil. O objetivo principal é unificar a contagem física (cega) com a contagem fiscal, definindo responsabilidades claras por meio da Matriz RACI, do fluxograma ponta a ponta e das políticas críticas de Blitz de Refugo e Conciliação.</p>
            
            <h2>1. Matriz de Responsabilidades (RACI)</h2>
            <p>Abaixo são detalhados os papéis envolvidos em cada etapa do processo: 
               <strong>R</strong> (Responsável pela execução), 
               <strong>A</strong> (Aprovador/Dono da tarefa), 
               <strong>C</strong> (Consultado durante a tarefa), 
               <strong>I</strong> (Informado sobre o resultado).</p>
            
            <table class="raci-table">
              <thead>
                <tr>
                  <th>Etapa do Processo</th>
                  <th>Motorista</th>
                  <th>Conferente</th>
                  <th>Auxiliar Fiscal</th>
                  <th>Financeiro / Monit.</th>
                  <th>Djeanderson (Coord.)</th>
                  <th>Marcos G. (GOD)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1. Saída da Revenda & Entregas</td>
                  <td><span class="raci-letter raci-r">R</span></td>
                  <td>-</td>
                  <td>-</td>
                  <td><span class="raci-letter raci-a">A</span></td>
                  <td>-</td>
                  <td><span class="raci-letter raci-i">I</span></td>
                </tr>
                <tr>
                  <td>2. Retorno & Separação de Vasilhames</td>
                  <td><span class="raci-letter raci-r">R</span></td>
                  <td><span class="raci-letter raci-c">C</span></td>
                  <td>-</td>
                  <td>-</td>
                  <td><span class="raci-letter raci-a">A</span></td>
                  <td>-</td>
                </tr>
                <tr>
                  <td>3. Definição da Blitz de Refugo (2x/dia)</td>
                  <td>-</td>
                  <td><span class="raci-letter raci-i">I</span></td>
                  <td><span class="raci-letter raci-c">C</span></td>
                  <td>-</td>
                  <td><span class="raci-letter raci-r">R</span></td>
                  <td><span class="raci-letter raci-a">A</span></td>
                </tr>
                <tr>
                  <td>4. Conferência Física (Cega)</td>
                  <td><span class="raci-letter raci-c">C</span></td>
                  <td><span class="raci-letter raci-r">R</span></td>
                  <td><span class="raci-letter raci-i">I</span></td>
                  <td>-</td>
                  <td><span class="raci-letter raci-a">A</span></td>
                  <td>-</td>
                </tr>
                <tr>
                  <td>5. Lançamento da Contagem Fiscal</td>
                  <td>-</td>
                  <td>-</td>
                  <td><span class="raci-letter raci-r">R</span></td>
                  <td>-</td>
                  <td><span class="raci-letter raci-a">A</span></td>
                  <td>-</td>
                </tr>
                <tr>
                  <td>6. Conciliação de Sobras/Faltas</td>
                  <td><span class="raci-letter raci-c">C</span></td>
                  <td><span class="raci-letter raci-r">R</span></td>
                  <td><span class="raci-letter raci-r">R</span></td>
                  <td><span class="raci-letter raci-a">A</span></td>
                  <td><span class="raci-letter raci-i">I</span></td>
                  <td>-</td>
                </tr>
                <tr>
                  <td>7. Fechamento de Vales / Descontos</td>
                  <td><span class="raci-letter raci-i">I</span></td>
                  <td>-</td>
                  <td><span class="raci-letter raci-r">R</span></td>
                  <td><span class="raci-letter raci-r">R</span></td>
                  <td><span class="raci-letter raci-a">A</span></td>
                  <td><span class="raci-letter raci-i">I</span></td>
                </tr>
              </tbody>
            </table>

            <div class="page-break"></div>

            <h2>2. Fluxograma do Processo Operacional</h2>
            <div class="flowchart">
[ INÍCIO: Saída da Revenda ]
             │
             ▼
[ 1. Execução de Entregas pelo Motorista ]
             │
             ▼
[ 2. Chegada na Revenda & Triagem de Retorno ]
             │
             ▼
[ 3. Importação Automática de Mapas ] ───► [ Sorteio Circular da Blitz de Refugo ]
             │                                     (2 placas sorteadas por dia)
             ▼
[ 4. Conferência Física Cega no Pátio ]
             │
      ┌──────┴────────────────────────┐
      ▼                               ▼
 [ Mapa Normal ]                [ Mapa em Blitz ]
 (Contagem direta de PA/AG)     (Rebater 100% das caixas/vasilhames)
      │                               │
      └──────┬────────────────────────┘
             ▼
[ 5. Conciliação Fiscal (Inicia ZERADO) ]
             │
             ▼
[ 6. Verificação de Divergências ]
             │
      ┌──────┴────────────────────────┐
      ▼                               ▼
 [ Sem Divergências ]           [ Com Divergências (Sobras / Faltas) ]
      │                               │
      │                               ├──► [ SOBRAS ]: Financeiro/Monitoramento alinha reentrega.
      │                               │
      │                               └──► [ FALTAS ]: Recusa Fiscal ──► [ RECONFERÊNCIA ]
      │                                                                   (Fotos obrigatórias)
      │                                                                           │
      │                                                                           ▼
      │                                                                Se persistir: [ VALE ]
      │                                                                (Desconto em folha)
      ▼                                                                           │
[ 7. Assinatura & Fechamento ] ◄──────────────────────────────────────────────────┘
             │
             ▼
 [ FIM: Veículo Liberado ]
            </div>

            <h2>3. Passo a Passo do Procedimento Padrão</h2>
            
            <h3>Passo 3.1: Saída do Veículo & Entregas</h3>
            <p>Os veículos carregados saem da revenda Pau Brasil com notas fiscais faturadas. Durante a rota, o motorista realiza a entrega direta e recolhe vasilhames de logística reversa (garrafas vazias, garrafeiras, paletes) de acordo com o padrão comercial.</p>

            <h3>Passo 3.2: Retorno de Rota & Separação de Itens</h3>
            <p>Ao retornar para a revenda, o veículo é direcionado para a triagem. O motorista deve organizar todos os ativos de giro retornados por tipo de vasilhame (Lata, LN, Garrafas de 1L, 600ml ou 300ml) para otimizar o fluxo de descarga física. O conferente do pátio atua como consultor nesta organização.</p>

            <h3>Passo 3.3: Blitz de Refugo Diária (Circular e Obrigatória)</h3>
            <p>No ato de importação diária dos mapas de rota, o sistema sorteia automaticamente <strong>dois veículos</strong> para passar pela <strong>Blitz de Refugo</strong>. Este sorteio é circular: todas as placas cadastradas na escala devem ser conferidas antes que uma placa se repita. Quando o conferente inicia a contagem de um veículo sorteado, um aviso pulsante em vermelho alerta: <em>"VEÍCULO SELECIONADO PARA BLITZ - REBATER 100% DAS CAIXAS"</em>. O conferente deve abrir caixa por caixa buscando garrafas com defeito, sujeira ou avarias de giro, registrando os refugos e adicionando evidências visuais.</p>

            <h3>Passo 3.4: Conferência Física Cega</h3>
            <p>O conferente acessa o aplicativo e realiza a contagem de todos os produtos acabados (PA) e ativos de giro (AG). Essa contagem é <strong>cega</strong>: o conferente não sabe qual a quantidade que o fiscal espera no sistema, assegurando que o lançamento reflita estritamente a realidade física do veículo.</p>

            <h3>Passo 3.5: Conciliação Fiscal (Padrão Inicial Zerado)</h3>
            <p>O setor fiscal abre a tela de reconciliação fiscal do caminhão. <strong>Por padrão de auditoria, todos os itens fiscais começam com quantidade ZERADA (0)</strong> até que a auxiliar de logística preencha e digite manualmente a contagem com base nas notas fiscais de retorno e faturamento. Isso impede o hábito nocivo de "dar OK" automático e assegura que todas as linhas foram devidamente validadas.</p>

            <h3>Passo 3.6: Alertas de Sobras & Faltas pelo Financeiro/Monitoramento</h3>
            <p>O sistema cruza a contagem física com a contagem fiscal, destacando discrepâncias:</p>
            <ul>
              <li><strong>Fluxo de Sobras:</strong> Identificado o excesso de produtos ou ativos no caminhão, o monitoramento e o financeiro são acionados automaticamente. É obrigatório o preenchimento do código NB do cliente, a data de reentrega alinhada e as observações no sistema para formalizar o trâmite logístico.</li>
              <li><strong>Fluxo de Faltas:</strong> Identificada a falta de itens, a auxiliar fiscal solicita uma <strong>Reconferência</strong>. O sistema força o conferente a refazer a contagem física com <strong>obrigatoriedade de foto</strong> no pátio. Caso a falta persista, o sistema emite um <strong>Vale Eletrônico</strong> de débito do motorista, assinado na tela e enviado para o Financeiro.</li>
            </ul>

            <div class="rule-box">
              <div class="rule-box-title">⚠️ Segurança de Redefinição de Dados</div>
              <p>Nenhum dado da plataforma pode ser redefinido ou limpo sem autorização superior. O botão de "Resetar Plataforma" exige o uso obrigatório da senha mestre hierárquica (<strong>!Bud0102</strong>), de uso exclusivo dos gestores aprovados neste padrão.</p>
            </div>

            <div class="footer">
              PAU BRASIL DISTRIBUIDORA AMBEV • Padrão de Operação Logística Reverso<br/>
              Elaborado por: Djeanderson Soares | Aprovado por: Marcos Guilherme (GOD)
            </div>
            
            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() { window.close(); }, 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="bg-slate-900 border-t border-slate-800 text-white" id="platform_manual_container">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <button
            id="btn_toggle_manual"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center space-x-2.5 text-sm font-bold text-slate-200 hover:text-white transition-colors focus:outline-none"
          >
            <BookOpen className="h-5 w-5 text-amber-500" />
            <div className="text-left">
              <span className="block">Manual de Diretrizes & Padrões de Operação</span>
              <span className="text-[10px] text-slate-400 font-normal font-mono block">Elaborado: Djeanderson S. • Aprovado: Marcos G. (GOD)</span>
            </div>
            {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
          </button>

          <button
            id="btn_export_manual_pdf"
            onClick={handleDownloadPDF}
            className="flex items-center space-x-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2 px-4 rounded-xl shadow-md transition text-xs cursor-pointer w-full md:w-auto justify-center"
          >
            <Download className="h-4 w-4" />
            <span>Exportar Manual de Operações (PDF)</span>
          </button>
        </div>

        {isOpen && (
          <div className="mt-6 pt-6 border-t border-slate-800 text-xs text-slate-300 space-y-6 animate-fade-in" id="manual_details">
            
            {/* Header Approvals in App UI */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-amber-500 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Elaborador Técnico</span>
                  <span className="text-xs font-bold text-white">Djeanderson Soares</span>
                  <span className="text-[10px] text-slate-400 block font-mono">Coordenador de Armazém</span>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Shield className="h-5 w-5 text-emerald-500 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Autoridade Aprovadora</span>
                  <span className="text-xs font-bold text-white">Marcos Guilherme</span>
                  <span className="text-[10px] text-slate-400 block font-mono">GOD (Gerente de Operações de Distribuição)</span>
                </div>
              </div>
            </div>

            {/* Matriz RACI */}
            <div>
              <div className="flex items-center space-x-2 font-bold text-white mb-2 uppercase text-xs tracking-wider border-b border-slate-800 pb-1">
                <Users className="h-4 w-4 text-amber-500" />
                <span>Matriz de Responsabilidades (RACI)</span>
              </div>
              <p className="text-slate-400 mb-3 text-[11px]">
                Define as responsabilidades do processo desde a saída do veículo até a descarga e faturamento fiscal.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] border border-slate-800">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[10px] uppercase">
                      <th className="p-2">Etapa do Processo</th>
                      <th className="p-2 text-center">Motorista</th>
                      <th className="p-2 text-center">Conferente</th>
                      <th className="p-2 text-center">Fiscal</th>
                      <th className="p-2 text-center">Monitoramento</th>
                      <th className="p-2 text-center">Coord. Armazém</th>
                      <th className="p-2 text-center">Marcos G. (GOD)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    <tr>
                      <td className="p-2 font-bold text-slate-200">1. Saída & Entrega no Cliente</td>
                      <td className="p-2 text-center text-red-500 font-extrabold">R</td>
                      <td className="p-2 text-center">-</td>
                      <td className="p-2 text-center">-</td>
                      <td className="p-2 text-center text-amber-500 font-extrabold">A</td>
                      <td className="p-2 text-center">-</td>
                      <td className="p-2 text-center text-emerald-500 font-extrabold">I</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold text-slate-200">2. Retorno & Separação de Vasilhames</td>
                      <td className="p-2 text-center text-red-500 font-extrabold">R</td>
                      <td className="p-2 text-center text-sky-400 font-extrabold">C</td>
                      <td className="p-2 text-center">-</td>
                      <td className="p-2 text-center">-</td>
                      <td className="p-2 text-center text-amber-500 font-extrabold">A</td>
                      <td className="p-2 text-center">-</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold text-slate-200">3. Sorteio de Blitz de Refugo (2x/dia)</td>
                      <td className="p-2 text-center">-</td>
                      <td className="p-2 text-center text-emerald-500 font-extrabold">I</td>
                      <td className="p-2 text-center text-sky-400 font-extrabold">C</td>
                      <td className="p-2 text-center">-</td>
                      <td className="p-2 text-center text-red-500 font-extrabold">R</td>
                      <td className="p-2 text-center text-amber-500 font-extrabold">A</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold text-slate-200">4. Conferência Física Cega (Pátio)</td>
                      <td className="p-2 text-center text-sky-400 font-extrabold">C</td>
                      <td className="p-2 text-center text-red-500 font-extrabold">R</td>
                      <td className="p-2 text-center text-emerald-500 font-extrabold">I</td>
                      <td className="p-2 text-center">-</td>
                      <td className="p-2 text-center text-amber-500 font-extrabold">A</td>
                      <td className="p-2 text-center">-</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold text-slate-200">5. Lançamento da Contagem Fiscal (Zerado)</td>
                      <td className="p-2 text-center">-</td>
                      <td className="p-2 text-center">-</td>
                      <td className="p-2 text-center text-red-500 font-extrabold">R</td>
                      <td className="p-2 text-center">-</td>
                      <td className="p-2 text-center text-amber-500 font-extrabold">A</td>
                      <td className="p-2 text-center">-</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold text-slate-200">6. Conciliação de Sobras/Faltas</td>
                      <td className="p-2 text-center text-sky-400 font-extrabold">C</td>
                      <td className="p-2 text-center text-red-500 font-extrabold">R</td>
                      <td className="p-2 text-center text-red-500 font-extrabold">R</td>
                      <td className="p-2 text-center text-amber-500 font-extrabold">A</td>
                      <td className="p-2 text-center text-emerald-500 font-extrabold">I</td>
                      <td className="p-2 text-center">-</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Passo a Passo Completo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-3">
                <div className="flex items-center space-x-1.5 font-bold text-white uppercase text-[11px] border-b border-slate-800 pb-1">
                  <GitCommit className="h-4 w-4 text-amber-500" />
                  <span>Passo a Passo Ponta a Ponta</span>
                </div>
                <ul className="space-y-2.5 text-[11px] text-slate-400">
                  <li>
                    <strong className="text-slate-200 block">1. Saída da Revenda & Rota:</strong>
                    Caminhão carregado sai para realizar as entregas nos clientes da rota comercial.
                  </li>
                  <li>
                    <strong className="text-slate-200 block">2. Retorno & Separação Física:</strong>
                    Ao retornar, o motorista separa e organiza todos os vasilhames e ativos para triagem rápida na descarga de pátio.
                  </li>
                  <li>
                    <strong className="text-slate-200 block">3. Importação e Ativação de Blitz:</strong>
                    Na importação diária, o sistema sorteia de forma circular 2 veículos para passar pela Blitz de Refugo, sem repetições.
                  </li>
                  <li>
                    <strong className="text-slate-200 block">4. Contagem de Pátio (Física):</strong>
                    O conferente executa contagem 100% cega dos ativos. Em veículos com blitz ativa, o rebate total das caixas é obrigatório.
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-1.5 font-bold text-white uppercase text-[11px] border-b border-slate-800 pb-1">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span>Tratamento de Sobras & Faltas</span>
                </div>
                <ul className="space-y-2.5 text-[11px] text-slate-400">
                  <li>
                    <strong className="text-slate-200 block">5. Conciliação Inicial Zerada:</strong>
                    Os campos fiscais abrem 100% zerados (0), obrigando o preenchimento manual do documento de faturamento para evitar erros operacionais.
                  </li>
                  <li>
                    <strong className="text-slate-200 block">6. Alertas e Ações Críticas:</strong>
                    Sobras exigem código NB do cliente e data alinhada pelo Monitoramento. Faltas exigem recontagem com foto obrigatória do pátio para fundamentar a emissão do Vale.
                  </li>
                  <li>
                    <strong className="text-slate-200 block">7. Resets sob Senha Superior:</strong>
                    Toda redefinição de dados na plataforma requer senha mestre <strong>!Bud0102</strong> do Gestor.
                  </li>
                </ul>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
