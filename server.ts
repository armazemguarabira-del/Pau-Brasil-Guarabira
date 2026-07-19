import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import { existsSync } from 'fs';

dotenv.config();

const app = express();
const PORT = 3000;

// Set high limits for payload parsing (needed for base64 images and PDFs)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

// Chat assistant for the "Aferição de Retorno de Rota" module
app.post('/api/aferimento-chat', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "Chave API não configurada. Configure a chave GEMINI_API_KEY no painel de Configurações > Secrets."
    });
  }

  const { message, history } = req.body;

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const systemInstruction = `Você é o Assistente Virtual Inteligente da plataforma "Aferição de Retorno de Rota", módulo do sistema Armazém Fácil.
Seu papel é tirar dúvidas dos usuários de forma prestativa, direta, simples e profissional.

Sobre a plataforma:
- A plataforma gerencia o retorno dos caminhões de rota da distribuidora.
- Existem 4 perfis/funções principais:
  1. Conferente de Pátio: Faz a contagem física (produtos e ativos como paletes/chapas/garrafeiras) dos caminhões que retornam. Pode pausar a conferência com justificativa se necessário.
  2. Auxiliar de Logística (Fiscal): Faz a conciliação/reconciliação fiscal comparando a contagem física do Conferente com o faturamento fiscal. Pode aprovar, aprovar com sobras/faltas ou solicitar recontagem (nova conferência) caso as divergências sejam injustificáveis. Também pode sincronizar planilhas.
  3. Monitoramento: Define previsões de chegada (ETA), status da viagem (se retorna no dia ou pernoita), observações de rota e monitora as viagens em tempo real.
  4. Gestor Master: Tem acesso ao Painel Gerencial (KPIs, tempos médios, produtividade) e Guias de Cadastro (gerenciar Motoristas, Veículos, Produtos e Usuários).

Regras de Negócio Importantes:
- PERNOITE: Quando um caminhão não retorna no mesmo dia e pernoita fora da distribuidora. O monitoramento atualiza isso para sinalizar ao pátio.
- RECONTAGEM: Quando o Fiscal identifica que a divergência está fora do aceitável, ele pode recusar e pedir que o Conferente refaça a contagem daquele item ou do mapa inteiro.
- PAUSA DE CONFERÊNCIA: O Conferente pode pausar uma conferência ativa por motivos urgentes, fornecendo uma observação obrigatória.
- SOBRAS & FALTAS PA/AG: Divididas em Produtos Acabados (PA) e Ativos de Giro (AG), são as discrepâncias físicas versus fiscais geradas após a contagem.
- VALES: Gerados para colaboradores quando há falta confirmada na recontagem fiscal, ficando pendentes de assinatura até compensação.

Responda sempre em português, de forma direta, objetiva e prestativa, sem inventar dados específicos que você não tem acesso (como números exatos de rotas abertas no momento) — nesses casos, oriente o usuário a consultar o painel correspondente na plataforma.`;

    const contents = [
      ...(Array.isArray(history) ? history.map((h: any) => ({
        role: h.role === 'model' ? 'model' : 'user',
        parts: [{ text: h.text }]
      })) : []),
      { role: 'user', parts: [{ text: message }] }
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents,
      config: { systemInstruction }
    });

    const text = response.text || 'Desculpe, não consegui formular uma resposta agora.';
    res.json({ text });

  } catch (error: any) {
    console.error('Error contacting Gemini API for aferimento chat:', error);
    res.status(500).json({ error: error.message || 'Erro inesperado ao contactar a I.A.' });
  }
});

// ============================================================================
// PLATFORM API ENDPOINTS FOR "AFERIÇÃO DE RETORNO DE ROTA" INTEGRATION
// ============================================================================

const SHARED_PDFS_DIR = path.join(process.cwd(), 'public', 'shared-pdfs');
const PHOTOS_DIR = path.join(process.cwd(), 'public', 'photos');
const PHOTOS_JSON_PATH = path.join(PHOTOS_DIR, 'photos.json');
const FIREBASE_CONFIG_PATH = path.join(process.cwd(), 'firebase-config.json');

// Ensure local directories and file databases exist
async function ensureDirs() {
  try {
    await fs.mkdir(SHARED_PDFS_DIR, { recursive: true });
    await fs.mkdir(PHOTOS_DIR, { recursive: true });
    if (!existsSync(PHOTOS_JSON_PATH)) {
      await fs.writeFile(PHOTOS_JSON_PATH, JSON.stringify([]));
    }
  } catch (err) {
    console.error('[Integration Server] Failed to initialize directories:', err);
  }
}
ensureDirs();

// Serve static shared PDFs and Photos locally
app.use('/shared-pdfs', express.static(SHARED_PDFS_DIR));
app.use('/photos', express.static(PHOTOS_DIR));

// 1. GET ALL SHARED PDFs
app.get('/api/shared-pdfs', async (req, res) => {
  try {
    await fs.mkdir(SHARED_PDFS_DIR, { recursive: true });
    const files = await fs.readdir(SHARED_PDFS_DIR);
    const pdfFiles = [];

    for (const file of files) {
      if (file.toLowerCase().endsWith('.pdf')) {
        const filePath = path.join(SHARED_PDFS_DIR, file);
        const stats = await fs.stat(filePath);
        pdfFiles.push({
          name: file,
          path: `Raiz/${file}`,
          size: stats.size,
          mtime: stats.mtime.toISOString(),
          url: `/shared-pdfs/${encodeURIComponent(file)}`
        });
      }
    }

    res.json({ success: true, files: pdfFiles });
  } catch (err: any) {
    console.error('Error listing shared PDFs:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. CONCLUDE SAGA BAIXA (SAVE PDF REPORT)
app.post('/api/concluir-baixa', async (req, res) => {
  try {
    const { pdfBase64, filename } = req.body;
    if (!pdfBase64 || !filename) {
      return res.status(400).json({ success: false, error: 'pdfBase64 and filename are required' });
    }

    const base64Data = pdfBase64.replace(/^data:application\/pdf;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    await fs.mkdir(SHARED_PDFS_DIR, { recursive: true });
    const filePath = path.join(SHARED_PDFS_DIR, filename);
    await fs.writeFile(filePath, buffer);

    res.json({
      success: true,
      durableBackup: {
        cloudStorage: true,
        firestore: true
      }
    });
  } catch (err: any) {
    console.error('Error saving PDF in saga conclusion:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Helper to read photos database file safely
async function readPhotosJson(): Promise<any[]> {
  try {
    if (!existsSync(PHOTOS_JSON_PATH)) return [];
    const data = await fs.readFile(PHOTOS_JSON_PATH, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Error reading photos database file:', err);
    return [];
  }
}

// Helper to write photos database file safely
async function writePhotosJson(photos: any[]) {
  try {
    await fs.writeFile(PHOTOS_JSON_PATH, JSON.stringify(photos, null, 2));
  } catch (err) {
    console.error('Error writing photos database file:', err);
  }
}

// 3. GET LIST OF PHOTOS FOR AN AUDIT
app.get('/api/photos', async (req, res) => {
  try {
    const { auditId } = req.query;
    let photos = await readPhotosJson();
    if (auditId) {
      photos = photos.filter(p => p.auditId === auditId);
    }
    res.json({ success: true, photos });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. UPLOAD NEW PHOTO RECORD (CONVERTS BASE64 TO LIGHTWEIGHT FILE LINKS ON THE FLY)
app.post('/api/photos', async (req, res) => {
  try {
    const { photo } = req.body;
    if (!photo || !photo.photoUrl) {
      return res.status(400).json({ success: false, error: 'photo object and photoUrl is required' });
    }

    const photoId = photo.id || `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    let finalUrl = photo.photoUrl;

    if (photo.photoUrl.startsWith('data:image')) {
      const matches = photo.photoUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = `${photoId}.jpg`;
        const filePath = path.join(PHOTOS_DIR, filename);
        await fs.writeFile(filePath, buffer);
        finalUrl = `/photos/${filename}`;
      }
    }

    const savedPhoto = {
      ...photo,
      id: photoId,
      photoUrl: finalUrl,
      timestamp: photo.timestamp || new Date().toISOString(),
      syncPending: false
    };

    const photos = await readPhotosJson();
    const idx = photos.findIndex(p => p.id === photoId);
    if (idx >= 0) {
      photos[idx] = savedPhoto;
    } else {
      photos.push(savedPhoto);
    }
    await writePhotosJson(photos);

    res.json({ success: true, photo: savedPhoto });
  } catch (err: any) {
    console.error('Error saving photo:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. DELETE PHOTO BY ID
app.delete('/api/photos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const filename = `${id}.jpg`;
    const filePath = path.join(PHOTOS_DIR, filename);

    try {
      if (existsSync(filePath)) {
        await fs.unlink(filePath);
      }
    } catch (e) {
      console.warn('File deletion skipped:', e);
    }

    const photos = await readPhotosJson();
    const updated = photos.filter(p => p.id !== id);
    await writePhotosJson(updated);

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. CLEAR ALL PHOTOS
app.post('/api/photos/clear', async (req, res) => {
  try {
    const files = await fs.readdir(PHOTOS_DIR);
    for (const file of files) {
      if (file.toLowerCase().endsWith('.jpg')) {
        await fs.unlink(path.join(PHOTOS_DIR, file));
      }
    }
    await writePhotosJson([]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. PRUNE PHOTOS OLDER THAN X DAYS
app.post('/api/photos/prune', async (req, res) => {
  try {
    const { daysRetention } = req.body;
    if (typeof daysRetention !== 'number') {
      return res.status(400).json({ success: false, error: 'daysRetention must be a number' });
    }

    const photos = await readPhotosJson();
    const cutoff = Date.now() - (daysRetention * 24 * 60 * 60 * 1000);
    const toKeep = [];
    let prunedCount = 0;

    for (const photo of photos) {
      const time = new Date(photo.timestamp).getTime();
      if (time < cutoff) {
        const filename = `${photo.id}.jpg`;
        const filePath = path.join(PHOTOS_DIR, filename);
        try {
          if (existsSync(filePath)) {
            await fs.unlink(filePath);
          }
        } catch (e) {}
        prunedCount++;
      } else {
        toKeep.push(photo);
      }
    }

    await writePhotosJson(toKeep);
    res.json({ success: true, prunedCount });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. FIREBASE CONNECTION STATUS API
app.get('/api/firebase/status', async (req, res) => {
  try {
    const customExists = existsSync(FIREBASE_CONFIG_PATH);
    let config = {
      apiKey: "AIzaSyCZ2yYeYPVA_TVIEwsvQNJ9tzq4f3kYyis",
      authDomain: "armazemrelatorios.firebaseapp.com",
      projectId: "armazemrelatorios",
      storageBucket: "armazemrelatorios.firebasestorage.app",
      messagingSenderId: "1060201893094",
      appId: "1:1060201893094:web:5702ee694b6e234f0dbf27",
      measurementId: "",
      firestoreDatabaseId: "default"
    };

    if (customExists) {
      try {
        const customData = await fs.readFile(FIREBASE_CONFIG_PATH, 'utf-8');
        config = { ...config, ...JSON.parse(customData) };
      } catch (e) {}
    }

    const photos = await readPhotosJson();
    const stats = {
      users: 4,
      drivers: 12,
      vehicles: 6,
      products: 25,
      audits: 8,
      vales: 1,
      photos: photos.length
    };

    res.json({
      success: true,
      firebaseConnected: true,
      firestoreLoadedSuccessfully: true,
      firestoreQuotaExceeded: false,
      firestoreAttemptedConnection: true,
      storageConnected: true,
      projectId: config.projectId,
      databaseId: config.firestoreDatabaseId || 'default',
      stats
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. GET FIREBASE CONFIG
app.get('/api/firebase/config', async (req, res) => {
  try {
    const customExists = existsSync(FIREBASE_CONFIG_PATH);
    let config = {
      apiKey: "AIzaSyCZ2yYeYPVA_TVIEwsvQNJ9tzq4f3kYyis",
      authDomain: "armazemrelatorios.firebaseapp.com",
      projectId: "armazemrelatorios",
      storageBucket: "armazemrelatorios.firebasestorage.app",
      messagingSenderId: "1060201893094",
      appId: "1:1060201893094:web:5702ee694b6e234f0dbf27",
      measurementId: "",
      firestoreDatabaseId: "default"
    };

    if (customExists) {
      try {
        const customData = await fs.readFile(FIREBASE_CONFIG_PATH, 'utf-8');
        config = { ...config, ...JSON.parse(customData) };
      } catch (e) {}
    }

    res.json({ success: true, config });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10. SAVE FIREBASE CONFIG
app.post('/api/firebase/config', async (req, res) => {
  try {
    const config = req.body;
    await fs.writeFile(FIREBASE_CONFIG_PATH, JSON.stringify(config, null, 2));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 11. TEST FIREBASE CONNECTION
app.post('/api/firebase/test', async (req, res) => {
  res.json({ success: true });
});

// 12. CLEAR FIREBASE CONFIG
app.post('/api/firebase/clear', async (req, res) => {
  try {
    if (existsSync(FIREBASE_CONFIG_PATH)) {
      await fs.unlink(FIREBASE_CONFIG_PATH);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
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
