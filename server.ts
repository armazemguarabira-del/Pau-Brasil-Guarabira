import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Main server API proxy endpoint for Gemini AI auditing
app.post('/api/gemini/analise', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    return res.status(401).json({ 
      error: 'Por favor, configure sua chave GEMINI_API_KEY nas Configurações > Secrets do projeto para liberar este recurso.' 
    });
  }

  const {
    empresa,
    componeteRepack,
    caixasDespejadas,
    quebrasAvarias,
    lotesValidadeCriticos,
    faturamentoJanelaPct,
    mediasRefugoBlitz,
    estabilidadeGeralScore
  } = req.body;

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const prompt = `Você é um auditor virtual sênior de excelência logística da Ambev, mestre em diretrizes DPO (Distribution Process Optimisation).
Analise de forma extremamente profissional, objetiva, assertiva e realista as seguintes métricas coletadas da empresa "${empresa}":

- Total de Repack de garrafas: ${componeteRepack} unidades recuperadas.
- Total de Despejo de líquidos baixados: ${caixasDespejadas} caixas.
- Quebras e avarias internas atestadas: ${quebrasAvarias} unidades descartadas.
- Quantidade de lotes com validade crítica (FEFO ≤30 dias): ${lotesValidadeCriticos} SKUs sob perigo.
- Pontualidade de carregamento na janela ideal (07:00 - 21:00): ${faturamentoJanelaPct}%.
- Média de peças danificadas por Blitz de refugo de retornáveis: ${mediasRefugoBlitz} defeitos/veículo.
- Nosso Score Ponderado Geral de Estabilidade e Perdas: ${estabilidadeGeralScore}% de suficiência.

Escreva um relatório analítico contendo:
1. **IMPACTOS E CRÍTICA GERAL**: Avaliação realista das perdas e desvios de processo (DPO) conforme as métricas.
2. **PLANO DE AÇÃO CORRETIVA EXECUTIVO (4 Bullets)**: 4 recomendações técnicas e operacionais claras para implantar imediatamente no pátio para mitigar perdas, aprimorar a separação, reforçar conferência ou segurar faturamentos tardios.
3. Use tom de liderança Ambev, motivador e focado em eficiência. Formate tudo em Markdown direto, elegante, sem cabeçalhos html gigantes.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt
    });

    const reportText = response.text || 'O auditor não conseguiu formular a resposta.';
    res.json({ report: reportText });

  } catch (error: any) {
    console.error('Error contacting Gemini API:', error);
    res.status(500).json({ error: error.message || 'Erro inesperado na chamada ao robô.' });
  }
});

// Endpoint for AI-driven Picking & Conferencia decision analysis (DPO Guidelines)
app.post('/api/gemini/analise-picking', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    return res.status(401).json({ 
      error: 'Por favor, configure sua chave GEMINI_API_KEY nas Configurações > Secrets do projeto para liberar este recurso.' 
    });
  }

  const {
    empresa,
    totalPaletes,
    completedPaletes,
    completionRate,
    averageTMA,
    pendingTasksCount,
    inProgressTasksCount,
    mostRequestedSKU,
    topOperator,
    topConferente
  } = req.body;

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const prompt = `Você é um Engenheiro de Processos Sênior e Especialista em Distribuição (DPO - Distribution Process Optimisation) da Ambev.
Analise de forma analítica e estratégica as seguintes métricas coletadas em tempo real do banco de dados da operação de picking e conferência da unidade "${empresa}":

MÉTRICAS DO TURNO:
- Total de Paletes Solicitados pelas Docas: ${totalPaletes} paletes.
- Paletes Atendidos/Abastecidos pelas Empilhadeiras: ${completedPaletes} paletes (Taxa de conclusão: ${completionRate}%).
- Tempo Médio de Atendimento (TMA) atual: ${averageTMA} minutos (Meta DPO é ≤ 10 min).
- Fila Pendente Atual (Aguardando atendimento): ${pendingTasksCount} ordens.
- Atividades Em Execução no pátio: ${inProgressTasksCount} ordens.
- SKU/Produto com maior gargalo de solicitações: ${mostRequestedSKU || 'Nenhum registrado'}.
- Operador com maior volume de atendimento: ${topOperator || 'Nenhum'}.
- Conferente com maior volume de chamados: ${topConferente || 'Nenhum'}.

Com base nessas informações reais da operação, formule uma diretriz tática de tomada de decisão estruturada em markdown contendo:

1. **DIAGNÓSTICO DA OPERAÇÃO**: Uma avaliação ultra realista e crítica sobre o TMA atual em relação à meta de 10 min, o tamanho da fila pendente (risco de ociosidade de caminhão) e a produtividade de operadores e conferentes.
2. **PLANO DE DESPACHO E BALANCEAMENTO (DPO)**: Diretrizes práticas e imediatas para o supervisor rebalancear a frota de empilhadeiras, readequar frentes de picking do produto crítico ("${mostRequestedSKU}"), e evitar o "atendimento no grito".
3. **AÇÕES PREVENTIVAS DE CURTO PRAZO (3 Bullets)**: 3 ações cirúrgicas que o time de pátio deve colocar em prática na próxima reunião de 10 minutos (DDS) para reduzir a ociosidade da conferência geral nas docas.

Use uma linguagem focada em metas de pátio, produtividade, e eliminação de desperdício Lean. Formate tudo em Markdown direto, elegante e legível.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt
    });

    const reportText = response.text || 'O auditor não conseguiu formular a resposta.';
    res.json({ report: reportText });

  } catch (error: any) {
    console.error('Error contacting Gemini API for picking:', error);
    res.status(500).json({ error: error.message || 'Erro inesperado na chamada ao robô.' });
  }
});

// Configure Vite middleware as SPA router or serve static contents in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Armazém Fácil Workspace] Server listening on port ${PORT}`);
  });
}

startServer();
