import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Calendar, 
  Award, 
  AlertTriangle, 
  Lock, 
  PackageCheck, 
  RotateCcw, 
  ClipboardList, 
  Truck, 
  Layers, 
  Clock, 
  User, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  FileSpreadsheet, 
  Download, 
  Sparkles,
  BarChart2,
  Check
} from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import { Usuario, Empresa } from '../types';
import { useEmpresaData } from '../context/EmpresaDataContext';
import { WlpDashboard } from './WlpDashboard';

interface PanelProps {
  user: Usuario;
  empresa?: Empresa | null;
  theme?: 'light' | 'dark';
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. TREINAMENTOS DE QUALIDADE PANEL
// ─────────────────────────────────────────────────────────────────────────────
export function TreinamentosQualidadePanel({ user, empresa, theme = 'light' }: PanelProps) {
  const empresaId = empresa?.id || 'demo';
  const [list, setList] = useState<any[]>([]);
  const [tema, setTema] = useState('');
  const [modulo, setModulo] = useState('FEFO & Validades');
  const [colaborador, setColaborador] = useState('');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [instrutor, setInstrutor] = useState(user.nome || '');

  useEffect(() => { loadData(); }, [empresaId]);

  const loadData = async () => {
    if (!db) return;
    try {
      const q = query(collection(db, 'treinamentos_qualidade'), where('empresaId', '==', empresaId));
      const snap = await getDocs(q);
      const rows: any[] = [];
      snap.forEach(d => rows.push({ _docId: d.id, ...d.data() }));
      setList(rows);
    } catch (e) { console.error(e); }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tema || !colaborador) return;
    const newItem = {
      empresaId,
      tema,
      modulo,
      colaborador,
      dataISO: data,
      instrutor,
      status: 'Concluído',
      criadoEm: new Date().toISOString()
    };
    if (db) await addDoc(collection(db, 'treinamentos_qualidade'), newItem);
    setTema('');
    setColaborador('');
    loadData();
  };

  const handleDelete = async (docId: string) => {
    if (db && docId) await deleteDoc(doc(db, 'treinamentos_qualidade', docId));
    loadData();
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-gradient-to-r from-emerald-900 to-slate-900 text-white rounded-2xl shadow-md">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
            DPO Bloco 2 — Qualidade
          </span>
          <h1 className="text-xl font-black mt-1 flex items-center gap-2">
            <Award className="w-6 h-6 text-emerald-400" />
            Treinamentos de Qualidade & Semana da Qualidade
          </h1>
          <p className="text-xs text-slate-300">Meta: 100% dos colaboradores capacitados em FEFO, manuseio e 5S.</p>
        </div>
      </div>

      <form onSubmit={handleAdd} className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-5 gap-3">
        <input type="text" placeholder="Tema do Treinamento" value={tema} onChange={e => setTema(e.target.value)} className="px-3 py-2 border rounded-lg text-xs font-bold" required />
        <select value={modulo} onChange={e => setModulo(e.target.value)} className="px-3 py-2 border rounded-lg text-xs font-bold">
          <option value="FEFO & Validades">FEFO & Validades</option>
          <option value="Manuseio & Anti-Quebra">Manuseio & Anti-Quebra</option>
          <option value="5S & Higiene">5S & Higiene</option>
          <option value="Temperatura & Pragas">Temperatura & Pragas</option>
        </select>
        <input type="text" placeholder="Nome do Colaborador" value={colaborador} onChange={e => setColaborador(e.target.value)} className="px-3 py-2 border rounded-lg text-xs font-bold" required />
        <input type="date" value={data} onChange={e => setData(e.target.value)} className="px-3 py-2 border rounded-lg text-xs font-bold" />
        <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1 cursor-pointer">
          <Plus className="w-4 h-4" /> Registrar Capacitação
        </button>
      </form>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 dark:bg-slate-900 uppercase text-[10px] font-black text-slate-600 dark:text-slate-300">
            <tr>
              <th className="p-3">Data</th>
              <th className="p-3">Tema</th>
              <th className="p-3">Módulo</th>
              <th className="p-3">Colaborador</th>
              <th className="p-3">Instrutor</th>
              <th className="p-3 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {list.map(item => (
              <tr key={item._docId}>
                <td className="p-3 font-bold">{item.dataISO}</td>
                <td className="p-3 font-bold text-emerald-700">{item.tema}</td>
                <td className="p-3">{item.modulo}</td>
                <td className="p-3 font-bold">{item.colaborador}</td>
                <td className="p-3 text-slate-500">{item.instrutor}</td>
                <td className="p-3 text-right">
                  <button onClick={() => handleDelete(item._docId)} className="text-rose-500 hover:text-rose-700 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. BLOQUEIO NO ARMAZÉM PANEL
// ─────────────────────────────────────────────────────────────────────────────
export function BloqueioArmazemPanel({ user, empresa, theme = 'light' }: PanelProps) {
  const empresaId = empresa?.id || 'demo';
  const [list, setList] = useState<any[]>([]);
  const [produto, setProduto] = useState('');
  const [motivo, setMotivo] = useState('Qualidade / Avaria');
  const [quantidade, setQuantidade] = useState(10);
  const [selo, setSelo] = useState('');

  useEffect(() => { loadData(); }, [empresaId]);

  const loadData = async () => {
    if (!db) return;
    try {
      const q = query(collection(db, 'bloqueio_armazem'), where('empresaId', '==', empresaId));
      const snap = await getDocs(q);
      const rows: any[] = [];
      snap.forEach(d => rows.push({ _docId: d.id, ...d.data() }));
      setList(rows);
    } catch (e) { console.error(e); }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!produto) return;
    const newItem = {
      empresaId,
      produto,
      motivo,
      quantidade: Number(quantidade),
      selo,
      dataBloqueioISO: new Date().toISOString().split('T')[0],
      responsavel: user.nome || '',
      status: 'Bloqueado',
      criadoEm: new Date().toISOString()
    };
    if (db) await addDoc(collection(db, 'bloqueio_armazem'), newItem);
    setProduto('');
    loadData();
  };

  const handleDelete = async (docId: string) => {
    if (db && docId) await deleteDoc(doc(db, 'bloqueio_armazem', docId));
    loadData();
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-gradient-to-r from-rose-900 to-slate-900 text-white rounded-2xl shadow-md">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-500/20 text-rose-300 border border-rose-400/30">
            DPO Bloco 2 — Qualidade
          </span>
          <h1 className="text-xl font-black mt-1 flex items-center gap-2">
            <Lock className="w-6 h-6 text-rose-400" />
            Gestão de Bloqueios no Armazém (KPI Falha de Bloqueio)
          </h1>
          <p className="text-xs text-slate-300">Controle físico e sistêmico com alerta de 30 dias para descarte/destruição.</p>
        </div>
      </div>

      <form onSubmit={handleAdd} className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-5 gap-3">
        <input type="text" placeholder="SKU / Descrição do Produto" value={produto} onChange={e => setProduto(e.target.value)} className="px-3 py-2 border rounded-lg text-xs font-bold" required />
        <select value={motivo} onChange={e => setMotivo(e.target.value)} className="px-3 py-2 border rounded-lg text-xs font-bold">
          <option value="Qualidade / Avaria">Qualidade / Avaria</option>
          <option value="Validade Vencida">Validade Vencida</option>
          <option value="Recall Fábrica">Recall Fábrica</option>
          <option value="Aguardando Análise">Aguardando Análise</option>
        </select>
        <input type="number" placeholder="Quantidade (CX/HL)" value={quantidade} onChange={e => setQuantidade(Number(e.target.value))} className="px-3 py-2 border rounded-lg text-xs font-bold" required />
        <input type="text" placeholder="Nº Selo / Lacre" value={selo} onChange={e => setSelo(e.target.value)} className="px-3 py-2 border rounded-lg text-xs font-bold" />
        <button type="submit" className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1 cursor-pointer">
          <Plus className="w-4 h-4" /> Registrar Bloqueio
        </button>
      </form>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 dark:bg-slate-900 uppercase text-[10px] font-black text-slate-600 dark:text-slate-300">
            <tr>
              <th className="p-3">Data Bloqueio</th>
              <th className="p-3">Produto</th>
              <th className="p-3">Motivo</th>
              <th className="p-3">Qtde</th>
              <th className="p-3">Selo/Lacre</th>
              <th className="p-3">Responsável</th>
              <th className="p-3 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {list.map(item => (
              <tr key={item._docId}>
                <td className="p-3 font-bold">{item.dataBloqueioISO}</td>
                <td className="p-3 font-bold text-rose-700">{item.produto}</td>
                <td className="p-3">{item.motivo}</td>
                <td className="p-3 font-bold">{item.quantidade}</td>
                <td className="p-3 text-slate-500">{item.selo || '—'}</td>
                <td className="p-3">{item.responsavel}</td>
                <td className="p-3 text-right">
                  <button onClick={() => handleDelete(item._docId)} className="text-rose-500 hover:text-rose-700 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. DEVOLUÇÃO PANEL
// ─────────────────────────────────────────────────────────────────────────────
export function DevolucaoPanel({ user, empresa, theme = 'light' }: PanelProps) {
  const empresaId = empresa?.id || 'demo';
  const [list, setList] = useState<any[]>([]);
  const [rota, setRota] = useState('');
  const [cliente, setCliente] = useState('');
  const [motivo, setMotivo] = useState('Recusa do Cliente');
  const [quantidade, setQuantidade] = useState(5);

  useEffect(() => { loadData(); }, [empresaId]);

  const loadData = async () => {
    if (!db) return;
    try {
      const q = query(collection(db, 'devolucoes_armazem'), where('empresaId', '==', empresaId));
      const snap = await getDocs(q);
      const rows: any[] = [];
      snap.forEach(d => rows.push({ _docId: d.id, ...d.data() }));
      setList(rows);
    } catch (e) { console.error(e); }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rota || !cliente) return;
    const newItem = {
      empresaId,
      rota,
      cliente,
      motivo,
      quantidade: Number(quantidade),
      dataISO: new Date().toISOString().split('T')[0],
      conferente: user.nome || '',
      status: 'Analisado / Conciliado PNC',
      criadoEm: new Date().toISOString()
    };
    if (db) await addDoc(collection(db, 'devolucoes_armazem'), newItem);
    setRota('');
    setCliente('');
    loadData();
  };

  const handleDelete = async (docId: string) => {
    if (db && docId) await deleteDoc(doc(db, 'devolucoes_armazem', docId));
    loadData();
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-gradient-to-r from-blue-900 to-slate-900 text-white rounded-2xl shadow-md">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-500/20 text-blue-300 border border-blue-400/30">
            DPO Bloco 2 — Qualidade
          </span>
          <h1 className="text-xl font-black mt-1 flex items-center gap-2">
            <RotateCcw className="w-6 h-6 text-blue-400" />
            Controle de Devoluções & Conciliação PNC
          </h1>
          <p className="text-xs text-slate-300">Checklist de integridade de lacres, caixas e destinação do produto devolvido.</p>
        </div>
      </div>

      <form onSubmit={handleAdd} className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-5 gap-3">
        <input type="text" placeholder="Rota / Placa" value={rota} onChange={e => setRota(e.target.value)} className="px-3 py-2 border rounded-lg text-xs font-bold" required />
        <input type="text" placeholder="Nome do Cliente / PDV" value={cliente} onChange={e => setCliente(e.target.value)} className="px-3 py-2 border rounded-lg text-xs font-bold" required />
        <select value={motivo} onChange={e => setMotivo(e.target.value)} className="px-3 py-2 border rounded-lg text-xs font-bold">
          <option value="Recusa do Cliente">Recusa do Cliente</option>
          <option value="Avaria de Transporte">Avaria de Transporte</option>
          <option value="Erro de Pedido">Erro de Pedido</option>
          <option value="Falta de Pagamento">Falta de Pagamento</option>
        </select>
        <input type="number" placeholder="Qtde Caixas" value={quantidade} onChange={e => setQuantidade(Number(e.target.value))} className="px-3 py-2 border rounded-lg text-xs font-bold" required />
        <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1 cursor-pointer">
          <Plus className="w-4 h-4" /> Registrar Devolução
        </button>
      </form>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 dark:bg-slate-900 uppercase text-[10px] font-black text-slate-600 dark:text-slate-300">
            <tr>
              <th className="p-3">Data</th>
              <th className="p-3">Rota</th>
              <th className="p-3">Cliente</th>
              <th className="p-3">Motivo</th>
              <th className="p-3">Qtde</th>
              <th className="p-3">Status PNC</th>
              <th className="p-3 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {list.map(item => (
              <tr key={item._docId}>
                <td className="p-3 font-bold">{item.dataISO}</td>
                <td className="p-3 font-bold text-blue-700">{item.rota}</td>
                <td className="p-3 font-bold">{item.cliente}</td>
                <td className="p-3">{item.motivo}</td>
                <td className="p-3 font-bold">{item.quantidade}</td>
                <td className="p-3 text-emerald-600 font-bold">{item.status}</td>
                <td className="p-3 text-right">
                  <button onClick={() => handleDelete(item._docId)} className="text-rose-500 hover:text-rose-700 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. CONTAGEM DE INVENTÁRIO PANEL
// ─────────────────────────────────────────────────────────────────────────────
export function ContagemInventarioPanel({ user, empresa, theme = 'light' }: PanelProps) {
  const empresaId = empresa?.id || 'demo';
  const [list, setList] = useState<any[]>([]);
  const [zona, setZona] = useState('PA (Picking)');
  const [mapa, setMapa] = useState('MPD-01');
  const [acuracidade, setAcuracidade] = useState(99.8);

  useEffect(() => { loadData(); }, [empresaId]);

  const loadData = async () => {
    if (!db) return;
    try {
      const q = query(collection(db, 'inventarios_ciclicos'), where('empresaId', '==', empresaId));
      const snap = await getDocs(q);
      const rows: any[] = [];
      snap.forEach(d => rows.push({ _docId: d.id, ...d.data() }));
      setList(rows);
    } catch (e) { console.error(e); }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const newItem = {
      empresaId,
      zona,
      mapa,
      acuracidade: Number(acuracidade),
      dataISO: new Date().toISOString().split('T')[0],
      responsavel: user.nome || '',
      status: 'Concluído com Ata',
      criadoEm: new Date().toISOString()
    };
    if (db) await addDoc(collection(db, 'inventarios_ciclicos'), newItem);
    loadData();
  };

  const handleDelete = async (docId: string) => {
    if (db && docId) await deleteDoc(doc(db, 'inventarios_ciclicos', docId));
    loadData();
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-gradient-to-r from-purple-900 to-slate-900 text-white rounded-2xl shadow-md">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-500/20 text-purple-300 border border-purple-400/30">
            DPO Bloco 3 — Acuracidade
          </span>
          <h1 className="text-xl font-black mt-1 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-purple-400" />
            Contagens Cíclicas de Inventário por Zona (PA / AG / Idade)
          </h1>
          <p className="text-xs text-slate-300">Rotina obrigatória: PA 3x/semana, AG 2x/semana e Idade 1x/semana com mapas MPD.</p>
        </div>
      </div>

      <form onSubmit={handleAdd} className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-4 gap-3">
        <select value={zona} onChange={e => setZona(e.target.value)} className="px-3 py-2 border rounded-lg text-xs font-bold">
          <option value="PA (Picking - 3x/sem)">PA (Picking - 3x/sem)</option>
          <option value="AG (Pulmão - 2x/sem)">AG (Pulmão - 2x/sem)</option>
          <option value="Idade de Estoque (1x/sem)">Idade de Estoque (1x/sem)</option>
        </select>
        <input type="text" placeholder="Código do Mapa (MPD)" value={mapa} onChange={e => setMapa(e.target.value)} className="px-3 py-2 border rounded-lg text-xs font-bold" required />
        <input type="number" step="0.1" placeholder="Acuracidade (%)" value={acuracidade} onChange={e => setAcuracidade(Number(e.target.value))} className="px-3 py-2 border rounded-lg text-xs font-bold" required />
        <button type="submit" className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1 cursor-pointer">
          <Plus className="w-4 h-4" /> Registrar Contagem
        </button>
      </form>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 dark:bg-slate-900 uppercase text-[10px] font-black text-slate-600 dark:text-slate-300">
            <tr>
              <th className="p-3">Data</th>
              <th className="p-3">Zona</th>
              <th className="p-3">Mapa MPD</th>
              <th className="p-3">Acuracidade</th>
              <th className="p-3">Responsável</th>
              <th className="p-3 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {list.map(item => (
              <tr key={item._docId}>
                <td className="p-3 font-bold">{item.dataISO}</td>
                <td className="p-3 font-bold text-purple-700">{item.zona}</td>
                <td className="p-3">{item.mapa}</td>
                <td className="p-3 font-black text-emerald-600">{item.acuracidade}%</td>
                <td className="p-3 text-slate-500">{item.responsavel}</td>
                <td className="p-3 text-right">
                  <button onClick={() => handleDelete(item._docId)} className="text-rose-500 hover:text-rose-700 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. GESTÃO DE ATIVOS RETORNÁVEIS PANEL
// ─────────────────────────────────────────────────────────────────────────────
export function GestaoAtivosPanel({ user, empresa, theme = 'light' }: PanelProps) {
  const empresaId = empresa?.id || 'demo';
  const [list, setList] = useState<any[]>([]);
  const [ativo, setAtivo] = useState('Garrafeiras 600ml');
  const [saldo, setSaldo] = useState(1200);

  useEffect(() => { loadData(); }, [empresaId]);

  const loadData = async () => {
    if (!db) return;
    try {
      const q = query(collection(db, 'ativos_retornaveis'), where('empresaId', '==', empresaId));
      const snap = await getDocs(q);
      const rows: any[] = [];
      snap.forEach(d => rows.push({ _docId: d.id, ...d.data() }));
      setList(rows);
    } catch (e) { console.error(e); }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const newItem = {
      empresaId,
      ativo,
      saldo: Number(saldo),
      dataISO: new Date().toISOString().split('T')[0],
      responsavel: user.nome || '',
      status: 'Carta de Saldo Conciliada',
      criadoEm: new Date().toISOString()
    };
    if (db) await addDoc(collection(db, 'ativos_retornaveis'), newItem);
    loadData();
  };

  const handleDelete = async (docId: string) => {
    if (db && docId) await deleteDoc(doc(db, 'ativos_retornaveis', docId));
    loadData();
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-gradient-to-r from-amber-900 to-slate-900 text-white rounded-2xl shadow-md">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-400/30">
            DPO Bloco 3 — Acuracidade
          </span>
          <h1 className="text-xl font-black mt-1 flex items-center gap-2">
            <PackageCheck className="w-6 h-6 text-amber-400" />
            Gestão de Ativos Retornáveis (PAVG) & Blitz de Refugo (≤ 1%)
          </h1>
          <p className="text-xs text-slate-300">Auditoria diária de refugo e conciliação de garrafeiras e pallets com cervejarias.</p>
        </div>
      </div>

      <form onSubmit={handleAdd} className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input type="text" placeholder="Nome do Ativo (ex: Garrafeiras RGB)" value={ativo} onChange={e => setAtivo(e.target.value)} className="px-3 py-2 border rounded-lg text-xs font-bold" required />
        <input type="number" placeholder="Saldo Físico Contado" value={saldo} onChange={e => setSaldo(Number(e.target.value))} className="px-3 py-2 border rounded-lg text-xs font-bold" required />
        <button type="submit" className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1 cursor-pointer">
          <Plus className="w-4 h-4" /> Conciliar Carta de Saldo
        </button>
      </form>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 dark:bg-slate-900 uppercase text-[10px] font-black text-slate-600 dark:text-slate-300">
            <tr>
              <th className="p-3">Data</th>
              <th className="p-3">Ativo</th>
              <th className="p-3">Saldo</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {list.map(item => (
              <tr key={item._docId}>
                <td className="p-3 font-bold">{item.dataISO}</td>
                <td className="p-3 font-bold text-amber-700">{item.ativo}</td>
                <td className="p-3 font-bold">{item.saldo} un</td>
                <td className="p-3 text-emerald-600 font-bold">{item.status}</td>
                <td className="p-3 text-right">
                  <button onClick={() => handleDelete(item._docId)} className="text-rose-500 hover:text-rose-700 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. QUALIDADE DA PUXADA PANEL
// ─────────────────────────────────────────────────────────────────────────────
export function QualidadePuxadaPanel({ user, empresa, theme = 'light' }: PanelProps) {
  const empresaId = empresa?.id || 'demo';
  const [list, setList] = useState<any[]>([]);
  const [placa, setPlaca] = useState('');
  const [fabrica, setFabrica] = useState('Ambev Salto');
  const [palletsAvariados, setPalletsAvariados] = useState(1);

  useEffect(() => { loadData(); }, [empresaId]);

  const loadData = async () => {
    if (!db) return;
    try {
      const q = query(collection(db, 'qualidade_puxada'), where('empresaId', '==', empresaId));
      const snap = await getDocs(q);
      const rows: any[] = [];
      snap.forEach(d => rows.push({ _docId: d.id, ...d.data() }));
      setList(rows);
    } catch (e) { console.error(e); }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!placa) return;
    const newItem = {
      empresaId,
      placa,
      fabrica,
      palletsAvariados: Number(palletsAvariados),
      dataISO: new Date().toISOString().split('T')[0],
      responsavel: user.nome || '',
      status: 'Alerta Aberto na Fábrica',
      criadoEm: new Date().toISOString()
    };
    if (db) await addDoc(collection(db, 'qualidade_puxada'), newItem);
    setPlaca('');
    loadData();
  };

  const handleDelete = async (docId: string) => {
    if (db && docId) await deleteDoc(doc(db, 'qualidade_puxada', docId));
    loadData();
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-gradient-to-r from-teal-900 to-slate-900 text-white rounded-2xl shadow-md">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-teal-500/20 text-teal-300 border border-teal-400/30">
            DPO Bloco 4 — Prevenção
          </span>
          <h1 className="text-xl font-black mt-1 flex items-center gap-2">
            <Truck className="w-6 h-6 text-teal-400" />
            Qualidade da Puxada & KPI Pallet Avariado x Recebido
          </h1>
          <p className="text-xs text-slate-300">Notificação imediata de quebra no transporte e segregação dos Top 10 SKUs críticos.</p>
        </div>
      </div>

      <form onSubmit={handleAdd} className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-4 gap-3">
        <input type="text" placeholder="Placa do Veículo" value={placa} onChange={e => setPlaca(e.target.value)} className="px-3 py-2 border rounded-lg text-xs font-bold" required />
        <input type="text" placeholder="Fábrica de Origem" value={fabrica} onChange={e => setFabrica(e.target.value)} className="px-3 py-2 border rounded-lg text-xs font-bold" required />
        <input type="number" placeholder="Pallets Avariados" value={palletsAvariados} onChange={e => setPalletsAvariados(Number(e.target.value))} className="px-3 py-2 border rounded-lg text-xs font-bold" required />
        <button type="submit" className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1 cursor-pointer">
          <Plus className="w-4 h-4" /> Abrir Alerta
        </button>
      </form>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 dark:bg-slate-900 uppercase text-[10px] font-black text-slate-600 dark:text-slate-300">
            <tr>
              <th className="p-3">Data</th>
              <th className="p-3">Placa</th>
              <th className="p-3">Fábrica</th>
              <th className="p-3">Pallets Avariados</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {list.map(item => (
              <tr key={item._docId}>
                <td className="p-3 font-bold">{item.dataISO}</td>
                <td className="p-3 font-bold text-teal-700">{item.placa}</td>
                <td className="p-3">{item.fabrica}</td>
                <td className="p-3 font-bold text-rose-600">{item.palletsAvariados}</td>
                <td className="p-3 text-amber-600 font-bold">{item.status}</td>
                <td className="p-3 text-right">
                  <button onClick={() => handleDelete(item._docId)} className="text-rose-500 hover:text-rose-700 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. GESTÃO DO WLP PANEL
// ─────────────────────────────────────────────────────────────────────────────
export function GestaoWlpPanel({ user, empresa, theme = 'light' }: PanelProps) {
  return (
    <div className="p-2 sm:p-4">
      <WlpDashboard user={user} empresaId={empresa?.id || 'demo'} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. CICLO DAS CARRETAS PANEL
// ─────────────────────────────────────────────────────────────────────────────
export function CicloCarretasPanel({ user, empresa, theme = 'light' }: PanelProps) {
  const empresaId = empresa?.id || 'demo';
  const [list, setList] = useState<any[]>([]);
  const [placa, setPlaca] = useState('');
  const [tma, setTma] = useState(25);
  const [tmv, setTmv] = useState(40);
  const [tmr, setTmr] = useState(30);

  useEffect(() => { loadData(); }, [empresaId]);

  const loadData = async () => {
    if (!db) return;
    try {
      const q = query(collection(db, 'ciclo_carretas'), where('empresaId', '==', empresaId));
      const snap = await getDocs(q);
      const rows: any[] = [];
      snap.forEach(d => rows.push({ _docId: d.id, ...d.data() }));
      setList(rows);
    } catch (e) { console.error(e); }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!placa) return;
    const newItem = {
      empresaId,
      placa,
      tma: Number(tma),
      tmv: Number(tmv),
      tmr: Number(tmr),
      totalMinutos: Number(tma) + Number(tmv) + Number(tmr),
      dataISO: new Date().toISOString().split('T')[0],
      responsavel: user.nome || '',
      status: (Number(tma) + Number(tmv) + Number(tmr)) <= 120 ? 'No ANS' : 'Atraso em Pátio',
      criadoEm: new Date().toISOString()
    };
    if (db) await addDoc(collection(db, 'ciclo_carretas'), newItem);
    setPlaca('');
    loadData();
  };

  const handleDelete = async (docId: string) => {
    if (db && docId) await deleteDoc(doc(db, 'ciclo_carretas', docId));
    loadData();
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-2xl shadow-md">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
            DPO Bloco 5 — Resultados
          </span>
          <h1 className="text-xl font-black mt-1 flex items-center gap-2">
            <Truck className="w-6 h-6 text-indigo-400" />
            Ciclo das Carretas & Tempos de Pátio (TMA, TMV, TMR)
          </h1>
          <p className="text-xs text-slate-300">Monitoramento dos tempos de recebimento, triagem e liberação de veículos em pátio.</p>
        </div>
      </div>

      <form onSubmit={handleAdd} className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-5 gap-3">
        <input type="text" placeholder="Placa do Veículo" value={placa} onChange={e => setPlaca(e.target.value)} className="px-3 py-2 border rounded-lg text-xs font-bold" required />
        <input type="number" placeholder="TMA (Apresentação min)" value={tma} onChange={e => setTma(Number(e.target.value))} className="px-3 py-2 border rounded-lg text-xs font-bold" required />
        <input type="number" placeholder="TMV (Vistoria min)" value={tmv} onChange={e => setTmv(Number(e.target.value))} className="px-3 py-2 border rounded-lg text-xs font-bold" required />
        <input type="number" placeholder="TMR (Recebimento min)" value={tmr} onChange={e => setTmr(Number(e.target.value))} className="px-3 py-2 border rounded-lg text-xs font-bold" required />
        <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1 cursor-pointer">
          <Plus className="w-4 h-4" /> Registrar Ciclo
        </button>
      </form>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 dark:bg-slate-900 uppercase text-[10px] font-black text-slate-600 dark:text-slate-300">
            <tr>
              <th className="p-3">Data</th>
              <th className="p-3">Placa</th>
              <th className="p-3">TMA</th>
              <th className="p-3">TMV</th>
              <th className="p-3">TMR</th>
              <th className="p-3">Total Pátio</th>
              <th className="p-3">ANS</th>
              <th className="p-3 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {list.map(item => (
              <tr key={item._docId}>
                <td className="p-3 font-bold">{item.dataISO}</td>
                <td className="p-3 font-bold text-indigo-700">{item.placa}</td>
                <td className="p-3">{item.tma} min</td>
                <td className="p-3">{item.tmv} min</td>
                <td className="p-3">{item.tmr} min</td>
                <td className="p-3 font-bold">{item.totalMinutos} min</td>
                <td className={`p-3 font-black ${item.status === 'No ANS' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {item.status}
                </td>
                <td className="p-3 text-right">
                  <button onClick={() => handleDelete(item._docId)} className="text-rose-500 hover:text-rose-700 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
