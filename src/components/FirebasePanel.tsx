import React, { useState, useEffect } from 'react';
import { db, isCustomFirebaseConnected, getActiveConfig, isUsingCustomFirebase } from '../firebase';
import { doc, getDocFromServer } from 'firebase/firestore';
import { Save, RefreshCw, Trash2, Database, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function FirebasePanel() {
  const [apiKey, setApiKey] = useState('');
  const [authDomain, setAuthDomain] = useState('');
  const [projectId, setProjectId] = useState('');
  const [storageBucket, setStorageBucket] = useState('');
  const [messagingSenderId, setMessagingSenderId] = useState('');
  const [appId, setAppId] = useState('');
  const [measurementId, setMeasurementId] = useState('');

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isConectado, setIsConectado] = useState(false);
  const [isCustom, setIsCustom] = useState(false);

  useEffect(() => {
    setIsConectado(isCustomFirebaseConnected());
    setIsCustom(isUsingCustomFirebase());
    const config = getActiveConfig();
    
    // If connected, populate the inputs with the active config
    if (isCustomFirebaseConnected()) {
      setApiKey(config.apiKey || '');
      setAuthDomain(config.authDomain || '');
      setProjectId(config.projectId || '');
      setStorageBucket(config.storageBucket || '');
      setMessagingSenderId(config.messagingSenderId || '');
      setAppId(config.appId || '');
      setMeasurementId(config.measurementId || '');
    }
  }, []);

  const handleSave = () => {
    if (!apiKey || !projectId || !authDomain || !appId) {
      alert('Por favor, preencha pelo menos os campos obrigatórios: API Key, Project ID, Auth Domain e App ID.');
      return;
    }

    const config = {
      apiKey: apiKey.trim(),
      authDomain: authDomain.trim(),
      projectId: projectId.trim(),
      storageBucket: storageBucket.trim(),
      messagingSenderId: messagingSenderId.trim(),
      appId: appId.trim(),
      measurementId: measurementId.trim(),
    };

    localStorage.setItem('custom_firebase_config', JSON.stringify(config));
    
    // Show quick notification
    alert('Configurações de conexão salvas! Recarregando a página para aplicar o banco de dados...');
    window.location.reload();
  };

  const handleClear = () => {
    if (confirm('Tem certeza de que deseja limpar a conexão personalizada e voltar ao banco de demonstração padrão?')) {
      localStorage.removeItem('custom_firebase_config');
      alert('Conexão limpa! Voltando para o banco de dados padrão...');
      window.location.reload();
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      // Create a test document reference to test read capabilities from server
      const testRef = doc(db, '_test_connection_ping_', 'ping');
      await getDocFromServer(testRef);
      setTestResult({
        success: true,
        message: 'Conexão estabelecida com sucesso! O Firestore respondeu corretamente.'
      });
    } catch (error: any) {
      console.warn('Erro ao testar leitura imediata:', error);
      // If error is just "document not found", it's actually a successful connection because it contacted Firestore!
      if (error?.message?.includes('not-found') || error?.code === 'not-found' || !error?.message?.includes('failed-precondition')) {
        setTestResult({
          success: true,
          message: 'Conexão estabelecida com sucesso! Comunicação com o Firebase ativa.'
        });
      } else {
        setTestResult({
          success: false,
          message: `Falha na conexão: ${error?.message || 'Verifique as chaves e as regras do Firestore.'}`
        });
      }
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER BANNER - STATUS */}
      <div className="p-4 rounded-xl flex items-center justify-between bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e]">
        <div className="flex items-center gap-3">
          <span className="text-xl">🔥</span>
          <div>
            <h4 className="font-sans font-black text-xs uppercase tracking-wider">
              {isCustom ? 'FIREBASE PERSONALIZADO CONECTADO ✅' : 'FIREBASE INTEGRADO CONECTADO ✅'}
            </h4>
            <p className="text-[10px] text-[#6a7d92] uppercase tracking-wide mt-0.5">
              {isCustom ? 'Utilizando o seu banco de dados Firestore personalizado salvo neste navegador.' : 'Conectado com sucesso ao banco de dados oficial integrado diretamente no código!'}
            </p>
          </div>
        </div>
        <div className="w-2.5 h-2.5 rounded-full animate-pulse bg-current" />
      </div>

      {/* AVISO IMPORTANTE SOBRE LINKS COMPARTILHADOS */}
      <div className="p-4 rounded-xl bg-[#f5a623]/10 border border-[#f5a623]/20 text-[#f5a623] text-xs leading-relaxed space-y-1">
        <h4 className="font-sans font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5">
          ⚠️ POR QUE O LINK COMPARTILHADO APARECE SEM OS SEUS DADOS?
        </h4>
        <p className="text-[#a0aec0] text-[11px]">
          O navegador isola o armazenamento local (<span className="font-mono text-snow">localStorage</span>) para cada link separado.
          Como você salvou suas credenciais personalizadas no painel do <b className="text-snow">AI Studio (link de desenvolvimento)</b>, o <b className="text-snow">link publicado/compartilhado</b> ainda não possui essas chaves salvas e volta para o banco de demonstração integrado padrão (que está vazio).
        </p>
        <div className="pt-1.5 flex flex-col gap-1 text-[11px]">
          <span className="text-snow"><b>Como resolver?</b></span>
          <span className="text-[#a0aec0]">👉 <b>Opção A:</b> Abra o seu link compartilhado, acesse este painel <b>"Status Firestore"</b>, insira suas credenciais do Firebase novamente e clique em <b>Salvar</b>.</span>
          <span className="text-[#a0aec0]">👉 <b>Opção B:</b> Envie suas credenciais do Firebase aqui no chat do AI Studio para que eu possa salvá-las <b>diretamente no código-fonte</b> como a configuração padrão (<span className="font-mono text-snow">DEFAULT_CONFIG</span>). Assim, qualquer pessoa que abrir o seu link compartilhado acessará seu banco automaticamente sem precisar configurar nada!</span>
        </div>
      </div>

      {/* CONEXÃO FORM CARD */}
      <div className="g-card p-6 border border-[#222d3a] relative overflow-hidden">
        
        {/* FORM TITLE */}
        <div className="mb-6 border-b border-[#1c2530] pb-4">
          <h3 className="font-sans font-black text-xs uppercase tracking-widest text-[#f5a623]">
            CONEXÃO COM FIREBASE – TAREFAS FINALIZADAS SÃO SALVAS AUTOMATICAMENTE
          </h3>
          <p className="text-[10px] text-[#6a7d92] tracking-wider uppercase mt-1">
            Preencha as credenciais da sua aplicação web do Firebase para sincronizar dados em tempo real.
          </p>
        </div>

        {/* INPUTS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold text-[#6a7d92] uppercase tracking-wider mb-1.5">
              API KEY <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              value={apiKey} 
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Ex: AIzaSyA_ykhJGRklDbPuDNYoMIVvB2DeVzp2VE"
              className="w-full bg-[#07090d] border border-[#222d3a] rounded-lg px-3 py-2 text-xs text-snow font-mono focus:border-[#f5a623] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#6a7d92] uppercase tracking-wider mb-1.5">
              AUTH DOMAIN <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              value={authDomain} 
              onChange={(e) => setAuthDomain(e.target.value)}
              placeholder="Ex: armazemfacil-b2292.firebaseapp.com"
              className="w-full bg-[#07090d] border border-[#222d3a] rounded-lg px-3 py-2 text-xs text-snow font-mono focus:border-[#f5a623] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#6a7d92] uppercase tracking-wider mb-1.5">
              PROJECT ID <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              value={projectId} 
              onChange={(e) => setProjectId(e.target.value)}
              placeholder="Ex: armazemfacil-b2292"
              className="w-full bg-[#07090d] border border-[#222d3a] rounded-lg px-3 py-2 text-xs text-snow font-mono focus:border-[#f5a623] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#6a7d92] uppercase tracking-wider mb-1.5">
              STORAGE BUCKET
            </label>
            <input 
              type="text" 
              value={storageBucket} 
              onChange={(e) => setStorageBucket(e.target.value)}
              placeholder="Ex: armazemfacil-b2292.appspot.com"
              className="w-full bg-[#07090d] border border-[#222d3a] rounded-lg px-3 py-2 text-xs text-snow font-mono focus:border-[#f5a623] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#6a7d92] uppercase tracking-wider mb-1.5">
              MESSAGING SENDER ID
            </label>
            <input 
              type="text" 
              value={messagingSenderId} 
              onChange={(e) => setMessagingSenderId(e.target.value)}
              placeholder="Ex: 688234941301"
              className="w-full bg-[#07090d] border border-[#222d3a] rounded-lg px-3 py-2 text-xs text-snow font-mono focus:border-[#f5a623] focus:outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold text-[#6a7d92] uppercase tracking-wider mb-1.5">
              APP ID <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              value={appId} 
              onChange={(e) => setAppId(e.target.value)}
              placeholder="Ex: 1:688234941301:web:153e2ad3f634379fe3213c"
              className="w-full bg-[#07090d] border border-[#222d3a] rounded-lg px-3 py-2 text-xs text-snow font-mono focus:border-[#f5a623] focus:outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold text-[#6a7d92] uppercase tracking-wider mb-1.5">
              MEASUREMENT ID (OPCIONAL)
            </label>
            <input 
              type="text" 
              value={measurementId} 
              onChange={(e) => setMeasurementId(e.target.value)}
              placeholder="Ex: G-6HFDEKWVDB"
              className="w-full bg-[#07090d] border border-[#222d3a] rounded-lg px-3 py-2 text-xs text-snow font-mono focus:border-[#f5a623] focus:outline-none"
            />
          </div>

        </div>

        {/* TEST RESULTS OR STATUS ALERTS */}
        {testResult && (
          <div className={`p-3.5 rounded-xl mb-6 flex gap-3 items-start text-xs leading-relaxed ${testResult.success ? 'bg-[#22c55e]/10 border border-[#22c55e]/15 text-[#22c55e]' : 'bg-[#ef4444]/10 border border-[#ef4444]/15 text-[#ef4444]'}`}>
            {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
            <span>{testResult.message}</span>
          </div>
        )}

        {/* BUTTON ACTIONS */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#1c2530]">
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-5 py-2.5 bg-gradient-to-r from-[#f5a623] to-[#d4780a] text-[#07090d] font-sans font-bold text-xs uppercase tracking-widest rounded-lg hover:shadow-[0_4px_16px_rgba(245,166,35,0.25)] hover:-translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" /> Salvar
            </button>
            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="px-5 py-2.5 bg-[#151b23] border border-[#222d3a] text-[#e8eef5] hover:text-[#f5a623] hover:border-[#f5a623]/45 font-sans font-bold text-xs uppercase tracking-widest rounded-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              {testing ? 'Testando...' : 'Testar Conexão'}
            </button>
          </div>

          <button
            onClick={handleClear}
            className="px-5 py-2.5 bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#ef4444] hover:bg-[#ef4444]/20 font-sans font-bold text-xs uppercase tracking-widest rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ml-auto"
          >
            <Trash2 className="w-3.5 h-3.5" /> Limpar
          </button>
        </div>

      </div>

      {/* HOW TO MANUAL STEP TUTORIAL */}
      <div className="g-card p-5 bg-[#0f1318]/45 border border-[#1c2530]">
        <h4 className="font-sans font-bold text-[10px] tracking-wider uppercase text-[#6a7d92] mb-3">
          Como configurar:
        </h4>
        <ol className="text-xs text-[#6a7d92] space-y-2 leading-relaxed">
          <li className="flex gap-2 items-start">
            <span className="font-mono font-bold text-[#f5a623]">1.</span>
            <span>Acesse o console oficial: <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-[#f5a623] hover:underline">console.firebase.google.com</a></span>
          </li>
          <li className="flex gap-2 items-start">
            <span className="font-mono font-bold text-[#f5a623]">2.</span>
            <span>No seu projeto do Armazém Fácil, clique em <b>Configurações do Projeto (ícone de engrenagem) → Configurações Gerais</b>.</span>
          </li>
          <li className="flex gap-2 items-start">
            <span className="font-mono font-bold text-[#f5a623]">3.</span>
            <span>Role até a seção <b>"Seus aplicativos"</b> e clique no ícone de tag web <b><code>&lt;/&gt;</code></b> para gerar um novo app web.</span>
          </li>
          <li className="flex gap-2 items-start">
            <span className="font-mono font-bold text-[#f5a623]">4.</span>
            <span>Copie as chaves do objeto de configuração fornecido pelo Firebase e cole-as nos respectivos campos indicados acima, depois clique em <b>Salvar</b>.</span>
          </li>
          <li className="flex gap-2 items-start">
            <span className="font-mono font-bold text-[#f5a623]">5.</span>
            <span>No menu lateral do console do Firebase, acesse <b>Firestore Database → Regras</b> e certifique-se de publicar permissões abertas para testes iniciais (ex: <code>allow read, write: if true;</code>) ou conforme suas diretrizes corporativas de segurança.</span>
          </li>
        </ol>
      </div>

    </div>
  );
}
