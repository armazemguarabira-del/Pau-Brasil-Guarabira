import React, { useState, useEffect, useMemo } from 'react';
import { 
  Database, 
  Package, 
  Users, 
  Shield, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  RefreshCw, 
  Filter, 
  Check, 
  Layers,
  Sparkles,
  Download,
  Target,
  BookOpen,
  Zap,
  Award,
  FileText,
  Key,
  UserPlus,
  Clock,
  BellRing
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { Usuario, Empresa, ProdutoMaster, ColaboradorMaster, AcessoColaborador } from '../types';
import { useEmpresaData } from '../context/EmpresaDataContext';
import { PRODUCT_MASTER_DATA } from '../data/productMasterData';
import { LISTA_COLABORADORES_OFICIAIS } from './RankingModule';
import { normalizeCollaboratorName, normalizeCollaboratorNamesInRecords } from '../utils/colaboradorUtils';
import PadraoOperacionalPanel from './PadraoOperacionalPanel';
import { CadastrosLembretesManager } from './CadastrosLembretesManager';
import { autoAssignRoleFromCargo, getDefaultModulesForCargo } from '../utils/permissions';

interface CadastrosPanelProps {
  user: Usuario;
  empresa: Empresa | null;
  initialSubTab?: 'produtos' | 'colaboradores' | 'acessos' | 'metas' | 'padroes' | 'lembretes';
  theme?: 'dark' | 'light';
  onNavigate?: (panel: string, extra?: any) => void;
}

export interface MetaOperacao {
  operacaoKey: string;
  nome: string;
  indicador: string;
  valor: string | number;
  unidade: string;
  descricao: string;
}

export const DEFAULT_METAS_OPERACAO: MetaOperacao[] = [
  { operacaoKey: 'repack', nome: 'Repack de Embalagens', indicador: 'Produtividade Média', valor: 12, unidade: 'cx/h', descricao: 'Meta oficial de recondicionamento por operador' },
  { operacaoKey: 'despejo', nome: 'Despejo de PNC', indicador: 'Produtividade Média', valor: 85, unidade: 'cx/h', descricao: 'Meta oficial de escoamento de vasilhames na bombona' },
  { operacaoKey: 'picking', nome: 'Picking / Separação', indicador: 'SLA Média de Separação', valor: '00:30:00', unidade: 'hh:mm:ss', descricao: 'Tempo padrão de atendimento por mapa' },
  { operacaoKey: 'quebras', nome: 'Quebras e Avarias', indicador: 'Tolerância Máxima de Perdas', valor: 0.15, unidade: 'HL', descricao: 'Limite mensal aceitável de quebras internas' },
  { operacaoKey: 'efc', nome: 'Eficiência de Carregamento (EFC)', indicador: 'Aderência ao Horário', valor: 96.0, unidade: '%', descricao: 'Aderência ao carregamento de rotas' },
  { operacaoKey: 'efd', nome: 'Eficiência de Descarregamento (EFD)', indicador: 'Aderência de Retorno', valor: 90.0, unidade: '%', descricao: 'Aderência ao descarregamento da frota' },
  { operacaoKey: 'tmr', nome: 'TMR Carretas / Transbordo', indicador: 'Tempo Máximo na Doca', valor: '02:30:00', unidade: 'hh:mm:ss', descricao: 'Tempo médio de rotação de carretas na unidade' },
  { operacaoKey: 'validades', nome: 'Validades & FEFO', indicador: 'Alerta Antecipado', valor: 45, unidade: 'dias', descricao: 'Dias mínimos de antecedência para trava FEFO' },
  { operacaoKey: 'ressuprimento', nome: 'Simulador de Ressuprimento', indicador: 'Giro de Reposição', valor: 24, unidade: 'horas', descricao: 'Frequência padrão de reabastecimento de picking' },
  { operacaoKey: 'capacidade', nome: 'Gestão de Capacidade', indicador: 'Ocupação Alvo', valor: 85, unidade: '%', descricao: 'Meta de ocupação dos pulmões do armazém' },
  { operacaoKey: 'montagem', nome: 'Eficiência de Montagem', indicador: 'Padronização de Palete', valor: 95, unidade: '%', descricao: 'Nível mínimo de conformidade de amarração' },
  { operacaoKey: 'politica_estoque', nome: 'Política de Estoque', indicador: 'Cobertura Máxima', valor: 15, unidade: 'dias', descricao: 'Limite ideal de dias de estoque em pátio' },
  { operacaoKey: 'temperatura', nome: 'Controle de Temperatura', indicador: 'Limite Térmico', valor: 35.0, unidade: '°C', descricao: 'Temperatura máxima tolerada no armazém / pulmão' },
  { operacaoKey: 'cinco_s', nome: 'Auditoria 5S', indicador: 'Índice de Organização', valor: 90, unidade: '%', descricao: 'Nota mínima de limpeza e arrumação por setor' }
];

export function isValidCPF(cpf: string): boolean {
  if (!cpf) return false;
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(clean)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(clean.charAt(i)) * (10 - i);
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(9))) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(clean.charAt(i)) * (11 - i);
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(10))) return false;

  return true;
}

export function formatCPF(cpf: string): string {
  const clean = (cpf || '').replace(/\D/g, '');
  if (clean.length !== 11) return cpf;
  return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`;
}

const MODULES_LIST = [
  { id: 'visao-geral', label: 'Workstation / Visão Geral' },
  { id: 'ajudante', label: 'Operação Ajudante' },
  { id: 'empilhador', label: 'Painel Empilhador (Picking & Logística)' },
  { id: 'conferente', label: 'Painel Conferente / Operacional' },
  { id: 'repack', label: 'Repack & Reembalagem' },
  { id: 'validades', label: 'Validades & FEFO' },
  { id: 'quebras', label: 'Quebras & Recolha' },
  { id: 'despejo', label: 'Despejo & Desfazimento' },
  { id: 'refugo', label: 'Refugo & Blitz' },
  { id: 'armazem', label: 'Armazém Fácil / TMR' },
  { id: 'simulador-ressuprimento', label: 'Simulador Ressuprimento' },
  { id: 'acoes', label: 'Plano de Ações & Desvios' },
  { id: 'agenda-executiva', label: 'Agenda Executiva' },
  { id: 'diario-bordo', label: 'Diário de Bordo' },
  { id: 'reunioes', label: 'Reuniões e Treinamentos' },
  { id: 'cadastros', label: 'Cadastros Gerais & Governança' },
];

export default function CadastrosPanel({
  user,
  empresa,
  initialSubTab = 'produtos',
  theme = 'light',
  onNavigate
}: CadastrosPanelProps) {
  const empresaData = useEmpresaData();
  const empresaId = empresa?.id || 'demo';

  const [mainTab, setMainTab] = useState<'gerais' | 'acessos'>(() => {
    return initialSubTab === 'acessos' ? 'acessos' : 'gerais';
  });

  const [activeSubTab, setActiveSubTab] = useState<'produtos' | 'colaboradores' | 'metas' | 'padroes' | 'lembretes'>(() => {
    if (initialSubTab === 'produtos') return 'produtos';
    if (initialSubTab === 'metas') return 'metas';
    if (initialSubTab === 'padroes') return 'padroes';
    if (initialSubTab === 'lembretes') return 'lembretes';
    return 'colaboradores';
  });

  useEffect(() => {
    if (initialSubTab === 'acessos') {
      setMainTab('acessos');
    } else if (initialSubTab) {
      setMainTab('gerais');
      if (initialSubTab === 'produtos' || initialSubTab === 'colaboradores' || initialSubTab === 'metas' || initialSubTab === 'padroes') {
        setActiveSubTab(initialSubTab as any);
      }
    }
  }, [initialSubTab]);

  // ── PRODUTOS STATE ──
  const [produtoSearch, setProdutoSearch] = useState('');
  const [filterGrupo, setFilterGrupo] = useState('TODOS');
  const [filterCurva, setFilterCurva] = useState('TODAS');
  const [editingProduto, setEditingProduto] = useState<ProdutoMaster | null>(null);
  const [showProdutoModal, setShowProdutoModal] = useState(false);
  const [savingProduto, setSavingProduto] = useState(false);
  const [seedingProdutos, setSeedingProdutos] = useState(false);

  // Form Produto State
  const [prodForm, setProdForm] = useState({
    codigo: '',
    descricao: '',
    fator: 12,
    fatorPallet: 60,
    valor: 0.0,
    fatorHecto: 0.07,
    grupo: 'Cervejas',
    embalagem: '',
    curva: 'A',
    idade: 180
  });

  // Drag & Drop Import State for Products (Sobrescrever Base)
  const [isProdDragOver, setIsProdDragOver] = useState(false);
  const [importingProdutos, setImportingProdutos] = useState(false);
  const [prodImportPreview, setProdImportPreview] = useState<ProdutoMaster[]>([]);
  const [showProdImportModal, setShowProdImportModal] = useState(false);

  // Selection state for batch deletion
  const [selectedProdCodes, setSelectedProdCodes] = useState<string[]>([]);
  const [selectedColabMatriculas, setSelectedColabMatriculas] = useState<string[]>([]);

  // ── COLABORADORES STATE ──
  const [colabSearch, setColabSearch] = useState('');
  const [colabCargoFilter, setColabCargoFilter] = useState('TODOS');
  const [colabTurnoFilter, setColabTurnoFilter] = useState('TODOS');
  const [localVersion, setLocalVersion] = useState(0);
  const [deletedMatriculas, setDeletedMatriculas] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(`deleted_colaboradores_${empresaId}`) || '[]');
    } catch {
      return [];
    }
  });

  const [editingColab, setEditingColab] = useState<ColaboradorMaster | null>(null);
  const [showColabModal, setShowColabModal] = useState(false);
  const [savingColab, setSavingColab] = useState(false);

  // Form Colab State
  const [colabForm, setColabForm] = useState({
    matricula: '',
    nome: '',
    cpf: '',
    cargo: 'Operador de Empilhadeira',
    turno: 'Turno 1'
  });

  // ── PRÉ-AUTORIZAR PRIMEIRO ACESSO STATE ──
  const [showPaModal, setShowPaModal] = useState(false);
  const [paMatricula, setPaMatricula] = useState('');
  const [paNome, setPaNome] = useState('');
  const [paEmail, setPaEmail] = useState('');
  const [paCpf, setPaCpf] = useState('');
  const [paFuncao, setPaFuncao] = useState('repack');
  const [savingPa, setSavingPa] = useState(false);

  // ── METAS DA OPERAÇÃO STATE ──
  const [metas, setMetas] = useState<MetaOperacao[]>(() => {
    try {
      const saved = localStorage.getItem(`metas_operacao_${empresaId}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_METAS_OPERACAO;
  });
  const [editingMeta, setEditingMeta] = useState<MetaOperacao | null>(null);
  const [isNewMeta, setIsNewMeta] = useState(false);
  const [showMetaModal, setShowMetaModal] = useState(false);
  const [metaForm, setMetaForm] = useState<MetaOperacao>({
    operacaoKey: '',
    nome: '',
    indicador: 'Produtividade Média',
    valor: 10,
    unidade: 'cx/h',
    descricao: ''
  });

  // Drag & Drop Import State
  const [importingColab, setImportingColab] = useState(false);
  const [importPreview, setImportPreview] = useState<{
    raw: any;
    matricula: string;
    nome: string;
    cpf: string;
    cargo: string;
    turno: string;
    isValid: boolean;
    errors: string[];
  }[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  // ── CONTROLE DE ACESSOS STATE & HANDLERS (ETAPA 8) ──
  const [acessoSearch, setAcessoSearch] = useState('');
  const [acessoRoleFilter, setAcessoRoleFilter] = useState('TODOS');
  const [acessoStatusFilter, setAcessoStatusFilter] = useState('TODOS');
  const [savingAcesso, setSavingAcesso] = useState<string | null>(null);
  const [matrixColab, setMatrixColab] = useState<ColaboradorMaster | null>(null);

  // Consolidated master list combining Firestore, LocalStorage and Official Base
  const allColaboradores = useMemo(() => {
    const firestoreList = empresaData.colaboradores || [];
    let localList: ColaboradorMaster[] = [];
    try {
      const saved = localStorage.getItem(`colaboradores_${empresaId}`);
      if (saved) localList = JSON.parse(saved);
    } catch (e) {
      console.warn('Error reading local colaboradores:', e);
    }

    const isCleared = localStorage.getItem(`colaboradores_cleared_${empresaId}`) === 'true';
    const isCustomBase = localStorage.getItem(`colaboradores_custom_base_${empresaId}`) === 'true';

    if (isCleared && localList.length === 0 && firestoreList.length === 0) {
      return [];
    }

    const map = new Map<string, ColaboradorMaster>();
    
    // Add official defaults ONLY if custom base is not set and base is not cleared
    if (!isCustomBase && !isCleared) {
      LISTA_COLABORADORES_OFICIAIS.forEach(c => {
        const key = String(c.matricula || c.nome || '').trim().toUpperCase();
        if (key) {
          map.set(key, {
            matricula: String(c.matricula).trim().toUpperCase(),
            nome: String(c.nome).trim(),
            cpf: String(c.cpf || '').trim(),
            cargo: String(c.cargo || 'Ajudante').trim(),
            turno: String(c.turno || 'Diurno').trim()
          });
        }
      });
    }

    // Add local storage entries (overriding or extending defaults)
    localList.forEach(c => {
      const key = String(c.matricula || c.nome || '').trim().toUpperCase();
      if (key) map.set(key, c);
    });

    // Add Firestore entries (highest priority)
    firestoreList.forEach(c => {
      const key = String(c.matricula || c.nome || '').trim().toUpperCase();
      if (key) map.set(key, c);
    });

    return Array.from(map.values());
  }, [empresaData.colaboradores, empresaId, localVersion]);

  // Modal Login State
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [editingLoginColab, setEditingLoginColab] = useState<ColaboradorMaster | null>(null);
  const [loginForm, setLoginForm] = useState({
    colabMatricula: '',
    usuario: '',
    senha: 'Ambev10',
    tipoAcesso: 'Ajudante',
    ativo: true
  });

  const openCreateLoginModal = (colab?: ColaboradorMaster) => {
    if (colab) {
      setEditingLoginColab(colab);
      const roleType = autoAssignRoleFromCargo(colab.cargo);
      const tipoLabel = roleType === 'admin' ? 'Administrativo' :
                        roleType === 'conferente' ? 'Conferente' :
                        roleType === 'empilhador' ? 'Operador de Empilhadeira' : 'Ajudante';
      setLoginForm({
        colabMatricula: colab.matricula,
        usuario: colab.matricula,
        senha: (colab as any).senha || 'Ambev10',
        tipoAcesso: tipoLabel,
        ativo: colab.ativo !== false
      });
    } else {
      setEditingLoginColab(null);
      setLoginForm({
        colabMatricula: allColaboradores[0]?.matricula || '',
        usuario: '',
        senha: 'Ambev10',
        tipoAcesso: 'Ajudante',
        ativo: true
      });
    }
    setShowLoginModal(true);
  };

  const handleSaveLogin = async () => {
    const mat = (loginForm.usuario || loginForm.colabMatricula).trim().toUpperCase();
    if (!mat) {
      alert('Selecione ou informe a matrícula/usuário para o login.');
      return;
    }

    const colabTarget = allColaboradores.find(c => c.matricula.trim().toUpperCase() === mat);

    const cargoMap: Record<string, string> = {
      'Administrativo': 'Administrativo',
      'Conferente': 'Conferente / Operacional',
      'Operador de Empilhadeira': 'Operador de Empilhadeira',
      'Ajudante': 'Ajudante de Armazém'
    };
    const newCargo = cargoMap[loginForm.tipoAcesso] || 'Ajudante de Armazém';
    const defaultMods = getDefaultModulesForCargo(newCargo);

    let updatedColab: ColaboradorMaster;

    if (colabTarget) {
      updatedColab = {
        ...colabTarget,
        matricula: mat,
        cargo: newCargo,
        senha: loginForm.senha.trim() || 'Ambev10',
        ativo: loginForm.ativo,
        modulosPermitidos: defaultMods,
        primeiroAcesso: false
      };
    } else {
      updatedColab = {
        matricula: mat,
        nome: `Colaborador ${mat}`,
        cargo: newCargo,
        turno: 'Turno 1',
        senha: loginForm.senha.trim() || 'Ambev10',
        ativo: loginForm.ativo,
        modulosPermitidos: defaultMods,
        primeiroAcesso: false
      };
    }

    try {
      if (db && updatedColab._docId && !updatedColab._docId.startsWith('local_') && !updatedColab._docId.startsWith('official_')) {
        await updateDoc(doc(db, 'colaboradores', updatedColab._docId), {
          matricula: updatedColab.matricula,
          cargo: updatedColab.cargo,
          senha: updatedColab.senha,
          ativo: updatedColab.ativo,
          modulosPermitidos: defaultMods,
          primeiroAcesso: false
        });
      } else if (db && (!updatedColab._docId || updatedColab._docId.startsWith('official_'))) {
        const docRef = await addDoc(collection(db, 'colaboradores'), {
          empresaId,
          matricula: updatedColab.matricula,
          nome: updatedColab.nome,
          cargo: updatedColab.cargo,
          turno: updatedColab.turno || 'Turno 1',
          senha: updatedColab.senha,
          ativo: updatedColab.ativo,
          modulosPermitidos: defaultMods,
          primeiroAcesso: false,
          _criadoEm: new Date().toISOString()
        });
        updatedColab._docId = docRef.id;
      }
    } catch (e) {
      console.warn('Firestore sync warning:', e);
    }

    const key = `colaboradores_${empresaId}`;
    const map = new Map<string, ColaboradorMaster>();
    allColaboradores.forEach(c => map.set(c.matricula.trim().toUpperCase(), c));
    map.set(updatedColab.matricula, updatedColab);

    localStorage.setItem(key, JSON.stringify(Array.from(map.values())));
    localStorage.setItem(`colaboradores_custom_base_${empresaId}`, 'true');

    setLocalVersion(v => v + 1);
    setShowLoginModal(false);
    alert(`✅ Credenciais de login da matrícula ${updatedColab.matricula} (${updatedColab.nome}) gravadas com sucesso!`);
  };

  const handleToggleAtivoLogin = async (c: ColaboradorMaster) => {
    const newAtivo = !(c.ativo !== false);
    const updated = { ...c, ativo: newAtivo };

    if (db && c._docId && !c._docId.startsWith('local_') && !c._docId.startsWith('official_')) {
      try {
        await updateDoc(doc(db, 'colaboradores', c._docId), { ativo: newAtivo });
      } catch (e) {
        console.warn('Firestore update error:', e);
      }
    }

    const key = `colaboradores_${empresaId}`;
    const map = new Map<string, ColaboradorMaster>();
    allColaboradores.forEach(col => map.set(col.matricula.trim().toUpperCase(), col));
    map.set(c.matricula.trim().toUpperCase(), updated);
    localStorage.setItem(key, JSON.stringify(Array.from(map.values())));
    localStorage.setItem(`colaboradores_custom_base_${empresaId}`, 'true');

    setLocalVersion(v => v + 1);
  };

  const filteredLogins = useMemo(() => {
    return allColaboradores.filter(c => {
      if (deletedMatriculas.includes(c.matricula)) return false;

      const q = acessoSearch.toLowerCase().trim();
      const matchesSearch = !q ||
        c.matricula.toLowerCase().includes(q) ||
        c.nome.toLowerCase().includes(q) ||
        (c.cargo && c.cargo.toLowerCase().includes(q));

      const roleType = autoAssignRoleFromCargo(c.cargo);
      const matchesRole = acessoRoleFilter === 'TODOS' ||
        (acessoRoleFilter === 'admin' && roleType === 'admin') ||
        (acessoRoleFilter === 'conferente' && roleType === 'conferente') ||
        (acessoRoleFilter === 'empilhador' && roleType === 'empilhador') ||
        (acessoRoleFilter === 'ajudante' && roleType === 'ajudante');

      const isAtivo = c.ativo !== false;
      const matchesStatus = acessoStatusFilter === 'TODOS' ||
        (acessoStatusFilter === 'ativo' && isAtivo) ||
        (acessoStatusFilter === 'inativo' && !isAtivo);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [allColaboradores, deletedMatriculas, acessoSearch, acessoRoleFilter, acessoStatusFilter]);

  const handleDeleteLogin = async (c: ColaboradorMaster) => {
    if (!confirm(`⚠️ Confirma a exclusão do LOGIN do colaborador "${c.nome}" (Matrícula: ${c.matricula})?\n\nEle continuará na base de Colaboradores, mas seu login de acesso será removido/inativado.`)) return;

    const updated = { ...c, senha: '', ativo: false };

    if (db && c._docId && !c._docId.startsWith('local_') && !c._docId.startsWith('official_')) {
      try {
        await updateDoc(doc(db, 'colaboradores', c._docId), { senha: '', ativo: false });
      } catch (e) {
        console.warn('Firestore update error:', e);
      }
    }

    const key = `colaboradores_${empresaId}`;
    const map = new Map<string, ColaboradorMaster>();
    allColaboradores.forEach(col => map.set(col.matricula.trim().toUpperCase(), col));
    map.set(c.matricula.trim().toUpperCase(), updated);
    localStorage.setItem(key, JSON.stringify(Array.from(map.values())));

    setLocalVersion(v => v + 1);
    alert(`✅ Credenciais de login do colaborador ${c.nome} excluídas com sucesso!`);
  };

  const handleQuickChangeRole = async (c: ColaboradorMaster, newTipoAcesso: string) => {
    const cargoMap: Record<string, string> = {
      'Administrativo': 'Administrativo',
      'Conferente': 'Conferente / Operacional',
      'Operador de Empilhadeira': 'Operador de Empilhadeira',
      'Ajudante': 'Ajudante de Armazém'
    };
    const newCargo = cargoMap[newTipoAcesso] || 'Ajudante de Armazém';
    const defaultMods = getDefaultModulesForCargo(newCargo);

    const updated = { ...c, cargo: newCargo, modulosPermitidos: defaultMods };

    if (db && c._docId && !c._docId.startsWith('local_') && !c._docId.startsWith('official_')) {
      try {
        await updateDoc(doc(db, 'colaboradores', c._docId), { cargo: newCargo, modulosPermitidos: defaultMods });
      } catch (e) {
        console.warn('Firestore update error:', e);
      }
    }

    const key = `colaboradores_${empresaId}`;
    const map = new Map<string, ColaboradorMaster>();
    allColaboradores.forEach(col => map.set(col.matricula.trim().toUpperCase(), col));
    map.set(c.matricula.trim().toUpperCase(), updated);
    localStorage.setItem(key, JSON.stringify(Array.from(map.values())));

    setLocalVersion(v => v + 1);
  };

  // Seed default product catalogue if collection is empty and base NOT explicitly cleared by user
  useEffect(() => {
    const isCleared = localStorage.getItem(`produtos_cleared_${empresaId}`) === 'true';
    if (!isCleared && empresaData.loaded && empresaData.produtos.length === 0 && !seedingProdutos) {
      handleSeedDefaultProducts();
    }
  }, [empresaData.loaded, empresaData.produtos.length, empresaId]);

  const handleSeedDefaultProducts = async () => {
    setSeedingProdutos(true);
    try {
      const initialSeed: Omit<ProdutoMaster, '_docId'>[] = PRODUCT_MASTER_DATA.slice(0, 80).map((p) => {
        let grupo = 'Cervejas';
        const d = p.descricao.toUpperCase();
        if (d.includes('GUARANA') || d.includes('PEPSI') || d.includes('SUKITA') || d.includes('SODA') || d.includes('H2OH') || d.includes('TONICA')) {
          grupo = 'Refrigerantes';
        } else if (d.includes('AGUA') || d.includes('GATORADE') || d.includes('SUCO') || d.includes('INDAIA')) {
          grupo = 'Águas & NABS';
        } else if (d.includes('BEATS') || d.includes('STELLA') || d.includes('CORONA') || d.includes('BUDWEISER') || d.includes('COLORADO') || d.includes('BECKS')) {
          grupo = 'Puro Malte / Premium';
        }

        let curva: 'A' | 'B' | 'C' = 'B';
        if (p.valor > 50 || d.includes('600ML') || d.includes('1L') || d.includes('LATA')) curva = 'A';
        if (p.valor < 20) curva = 'C';

        return {
          empresaId,
          codigo: String(p.cod),
          descricao: p.descricao,
          fator: p.fator,
          valor: p.valor,
          fatorHecto: p.fatorHecto,
          grupo,
          curva,
          _criadoEm: new Date().toISOString()
        };
      });

      if (db) {
        for (const item of initialSeed) {
          await addDoc(collection(db, 'produtos'), item);
        }
      }
    } catch (e) {
      console.error('Erro ao popular produtos:', e);
    } finally {
      setSeedingProdutos(false);
    }
  };

  // ── PRODUTO HANDLERS ──
  const openNewProdutoModal = () => {
    setEditingProduto(null);
    setProdForm({
      codigo: '',
      descricao: '',
      fator: 12,
      fatorPallet: 60,
      valor: 0.0,
      fatorHecto: 0.07,
      grupo: 'Cervejas',
      embalagem: '',
      curva: 'A',
      idade: 180
    });
    setShowProdutoModal(true);
  };

  const openEditProdutoModal = (p: ProdutoMaster) => {
    setEditingProduto(p);
    setProdForm({
      codigo: p.codigo,
      descricao: p.descricao,
      fator: p.fator,
      fatorPallet: p.fatorPallet || 60,
      valor: p.valor,
      fatorHecto: p.fatorHecto,
      grupo: p.grupo,
      embalagem: p.embalagem || '',
      curva: p.curva,
      idade: p.idade || 180
    });
    setShowProdutoModal(true);
  };

  const handleSaveProduto = async () => {
    if (!prodForm.codigo.trim() || !prodForm.descricao.trim()) {
      alert('Código e Descrição são obrigatórios.');
      return;
    }

    setSavingProduto(true);
    try {
      const payload = {
        empresaId,
        codigo: prodForm.codigo.trim(),
        descricao: prodForm.descricao.trim().toUpperCase(),
        fator: Number(prodForm.fator) || 1,
        fatorPallet: Number(prodForm.fatorPallet) || 60,
        valor: Number(prodForm.valor) || 0,
        fatorHecto: Number(prodForm.fatorHecto) || 0,
        grupo: prodForm.grupo,
        embalagem: prodForm.embalagem.trim().toUpperCase(),
        curva: prodForm.curva,
        idade: Number(prodForm.idade) || 180,
        _criadoEm: new Date().toISOString()
      };

      if (editingProduto && editingProduto._docId) {
        if (db) {
          await updateDoc(doc(db, 'produtos', editingProduto._docId), payload);
        }
      } else {
        if (db) {
          await addDoc(collection(db, 'produtos'), payload);
        }
      }
      setShowProdutoModal(false);
    } catch (e) {
      alert('Erro ao salvar produto: ' + e);
    } finally {
      setSavingProduto(false);
    }
  };

  const handleDeleteProduto = async (p: ProdutoMaster) => {
    if (!confirm(`Confirma a exclusão do produto ${p.codigo} - ${p.descricao}?`)) return;

    const targetId = p._docId || (p as any).id;
    try {
      if (db && targetId && !targetId.startsWith('local_') && !targetId.startsWith('import_')) {
        try {
          await deleteDoc(doc(db, 'produtos', targetId));
        } catch (e) {
          console.warn('Firestore delete error:', e);
        }
      }

      const key = `produtos_${empresaId}`;
      const existing: ProdutoMaster[] = JSON.parse(localStorage.getItem(key) || '[]');
      const filtered = existing.filter((item: any) => 
        item._docId !== targetId && item.id !== targetId && item.codigo !== p.codigo
      );
      localStorage.setItem(key, JSON.stringify(filtered));

      if (filtered.length === 0) {
        localStorage.setItem(`produtos_cleared_${empresaId}`, 'true');
      }

      window.dispatchEvent(new Event('local_data_changed'));
      window.dispatchEvent(new Event('storage'));
      if ((empresaData as any).refetchProdutos) {
        (empresaData as any).refetchProdutos();
      }
      setLocalVersion(v => v + 1);
    } catch (e: any) {
      console.error('Error deleting product:', e);
    }
  };

  const handleSelectAllProducts = (filteredList: ProdutoMaster[]) => {
    if (selectedProdCodes.length === filteredList.length && filteredList.length > 0) {
      setSelectedProdCodes([]);
    } else {
      setSelectedProdCodes(filteredList.map(p => p.codigo));
    }
  };

  const handleToggleSelectProduct = (codigo: string) => {
    setSelectedProdCodes(prev =>
      prev.includes(codigo) ? prev.filter(c => c !== codigo) : [...prev, codigo]
    );
  };

  const handleDeleteSelectedProducts = async () => {
    if (selectedProdCodes.length === 0) {
      alert('Nenhum produto selecionado para exclusão.');
      return;
    }
    if (!confirm(`⚠️ Confirma a exclusão de ${selectedProdCodes.length} produtos selecionados? esta ação é irreversível.`)) return;

    try {
      if (db) {
        for (const p of empresaData.produtos) {
          if (selectedProdCodes.includes(p.codigo) && p._docId && !p._docId.startsWith('local_')) {
            try {
              await deleteDoc(doc(db, 'produtos', p._docId));
            } catch (e) {}
          }
        }
      }

      const key = `produtos_${empresaId}`;
      const existing: ProdutoMaster[] = JSON.parse(localStorage.getItem(key) || '[]');
      const filtered = existing.filter((item: any) => !selectedProdCodes.includes(item.codigo));
      localStorage.setItem(key, JSON.stringify(filtered));

      if (filtered.length === 0) {
        localStorage.setItem(`produtos_cleared_${empresaId}`, 'true');
      }

      setSelectedProdCodes([]);
      window.dispatchEvent(new Event('local_data_changed'));
      window.dispatchEvent(new Event('storage'));
      if ((empresaData as any).refetchProdutos) (empresaData as any).refetchProdutos();
      setLocalVersion(v => v + 1);
      alert(`✅ ${selectedProdCodes.length} produtos excluídos com sucesso!`);
    } catch (e: any) {
      alert('Erro ao excluir produtos selecionados: ' + e);
    }
  };

  // ── PRODUTO DRAG & DROP OVERWRITE HANDLERS ──
  const handleProdFileUpload = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!jsonData || jsonData.length === 0) {
          alert('A planilha importada está vazia ou em formato inválido.');
          return;
        }

        const parsedList: ProdutoMaster[] = [];

        jsonData.forEach((row: any, idx: number) => {
          const cod = String(
            row['COD'] || row['Código'] || row['Codigo'] || row['CODIGO'] || row['CÓDIGO'] || 
            row['cod'] || row['codigo'] || row['SKU'] || ''
          ).trim();

          const desc = String(
            row['DESCRIÇÃO PRODUTO'] || row['DESCRICAO PRODUTO'] || row['Descrição'] || row['Descricao'] || row['DESCRIÇÃO'] || row['DESCRICAO'] || 
            row['produto'] || row['Produto'] || row['PRODUTO'] || ''
          ).trim();

          if (!cod && !desc) return;

          const parseVal = (v: any) => {
            if (typeof v === 'number') return v;
            if (!v) return 0;
            let s = String(v).replace(/R\$/g, '').replace(/"/g, '').trim();
            if (s.includes(',') && s.includes('.')) {
              s = s.replace(/\./g, '').replace(',', '.');
            } else if (s.includes(',')) {
              s = s.replace(',', '.');
            }
            const p = parseFloat(s);
            return isNaN(p) ? 0 : p;
          };

          const fatorNum = parseVal(row['FATOR'] || row['Fator SKU'] || row['Fator'] || row['Fator (SKU)'] || row['fator'] || 12);
          const valorNum = parseVal(row['VALOR'] || row[' VALOR '] || row['Valor Unit (R$)'] || row['Valor Unit'] || row['Valor'] || row['valor'] || row['Preço'] || row['Preco'] || 0);
          const hectoNum = parseVal(row['FATOR HECTO'] || row['Fator Hecto (HL)'] || row['Fator Hecto'] || row['fatorHecto'] || row['HECTO'] || 0.07);
          const grupoStr = String(row['GRUPO'] || row['Grupo'] || row['grupo'] || 'CERVEJA').trim().toUpperCase();
          const embalagemStr = String(row['EMBALAGEM'] || row['Embalagem'] || row['embalagem'] || row['EMBALAGEM (SKU)'] || '').trim().toUpperCase();
          const curvaStr = String(row['CURVA'] || row['Curva'] || row['curva'] || 'B').trim().toUpperCase();
          const curvaVal: 'A' | 'B' | 'C' = (curvaStr === 'A' || curvaStr === 'C') ? curvaStr : 'B';
          const idadeNum = parseVal(row['IDADE (DIAS)'] || row['IDADE'] || row['Idade (Dias)'] || row['Idade'] || row['idade'] || 180);
          const palletNum = parseVal(row['FATOR PALLET'] || row['Fator Pallet'] || row['Fator Palete'] || row['PALLET'] || row['pallet'] || 60);

          parsedList.push({
            _docId: `import_${Date.now()}_${idx}`,
            empresaId,
            codigo: cod || `SKU-${idx + 1}`,
            descricao: (desc || `PRODUTO ${cod}`).toUpperCase(),
            fator: fatorNum <= 0 ? 12 : fatorNum,
            valor: valorNum,
            fatorHecto: hectoNum || 0.07,
            grupo: grupoStr || 'CERVEJA',
            embalagem: embalagemStr,
            curva: curvaVal,
            idade: idadeNum <= 0 ? 180 : idadeNum,
            fatorPallet: palletNum <= 0 ? 60 : palletNum,
            _criadoEm: new Date().toISOString()
          });
        });

        if (parsedList.length === 0) {
          alert('Nenhum produto válido identificado no arquivo. Verifique se as colunas possuem Código e Descrição.');
          return;
        }

        setProdImportPreview(parsedList);
        setShowProdImportModal(true);
      } catch (err) {
        console.error(err);
        alert('Erro ao ler arquivo Excel. Certifique-se de que é um arquivo .xlsx, .xls ou .csv válido.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirmOverwriteProducts = async () => {
    if (prodImportPreview.length === 0) return;
    setImportingProdutos(true);
    try {
      if (db) {
        for (const p of empresaData.produtos) {
          if (p._docId && !p._docId.startsWith('local_')) {
            try {
              await deleteDoc(doc(db, 'produtos', p._docId));
            } catch (e) {
              console.warn('Erro ao remover produto antigo do firestore:', e);
            }
          }
        }
        for (const newP of prodImportPreview) {
          const { _docId, ...clean } = newP;
          await addDoc(collection(db, 'produtos'), clean);
        }
      }

      const key = `produtos_${empresaId}`;
      localStorage.setItem(key, JSON.stringify(prodImportPreview));
      localStorage.removeItem(`produtos_cleared_${empresaId}`);
      window.dispatchEvent(new Event('local_data_changed'));
      window.dispatchEvent(new Event('storage'));

      alert(`✅ Base de produtos SOBRESCRITA com sucesso! ${prodImportPreview.length} produtos cadastrados.`);
      setShowProdImportModal(false);
      setProdImportPreview([]);
      if ((empresaData as any).refetchProdutos) {
        (empresaData as any).refetchProdutos();
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao sobrescrever produtos: ' + err);
    } finally {
      setImportingProdutos(false);
    }
  };

  const handleDownloadProductModelExcel = () => {
    const sampleData = [
      { 'Código': '347', 'Descrição': 'SUKITA PET 1L CAIXA C/12', 'Fator SKU': 12, 'FATOR PALLET': 84, 'VALOR': 30.48, 'Fator Hecto (HL)': 0.12, 'GRUPO': 'NAB', 'EMBALAGEM': 'PET 1L', 'IDADE': 180 },
      { 'Código': '503', 'Descrição': 'SUKITA PET 2L CAIXA C/6', 'Fator SKU': 6, 'FATOR PALLET': 60, 'VALOR': 19.45, 'Fator Hecto (HL)': 0.12, 'GRUPO': 'NAB', 'EMBALAGEM': 'PET 2L', 'IDADE': 120 },
      { 'Código': '982', 'Descrição': 'SKOL 600ML GARRAFA C/12', 'Fator SKU': 12, 'FATOR PALLET': 60, 'VALOR': 53.35, 'Fator Hecto (HL)': 0.072, 'GRUPO': 'CERVEJA', 'EMBALAGEM': 'VIDRO 600ML', 'IDADE': 180 },
      { 'Código': '9068', 'Descrição': 'SKOL LATA 350ML SH C/12 NPAL', 'Fator SKU': 12, 'FATOR PALLET': 286, 'VALOR': 28.52, 'Fator Hecto (HL)': 0.042, 'GRUPO': 'CERVEJA', 'EMBALAGEM': 'LATA 350ML', 'IDADE': 180 },
      { 'Código': '33820', 'Descrição': 'BRAHMA CHOPP LT 350ML SH C/12 NP MULTIPK', 'Fator SKU': 12, 'FATOR PALLET': 286, 'VALOR': 34.90, 'Fator Hecto (HL)': 0.042, 'GRUPO': 'CERVEJA', 'EMBALAGEM': 'LATA 350ML', 'IDADE': 180 },
      { 'Código': '34608', 'Descrição': 'SKOL LATA 350ML SH C/12 NPAL MULTIPACK', 'Fator SKU': 12, 'FATOR PALLET': 286, 'VALOR': 39.00, 'Fator Hecto (HL)': 0.042, 'GRUPO': 'CERVEJA', 'EMBALAGEM': 'LATA 350ML', 'IDADE': 180 },
      { 'Código': '34475', 'Descrição': 'ELEVE AGUA MIN S GAS GFA PET 510ML FD C/12', 'Fator SKU': 12, 'FATOR PALLET': 175, 'VALOR': 10.04, 'Fator Hecto (HL)': 0.0612, 'GRUPO': 'NAB', 'EMBALAGEM': 'PET 510ML', 'IDADE': 360 }
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ModeloProdutos');
    XLSX.writeFile(wb, 'modelo_cadastro_produtos_sobrescrever.xlsx');
  };

  // Filtered Products List
  const filteredProdutos = useMemo(() => {
    return empresaData.produtos.filter(p => {
      const matchesSearch = !produtoSearch || 
        p.codigo.toLowerCase().includes(produtoSearch.toLowerCase()) || 
        p.descricao.toLowerCase().includes(produtoSearch.toLowerCase());
      const matchesGrupo = filterGrupo === 'TODOS' || p.grupo === filterGrupo;
      const matchesCurva = filterCurva === 'TODAS' || p.curva === filterCurva;
      return matchesSearch && matchesGrupo && matchesCurva;
    });
  }, [empresaData.produtos, produtoSearch, filterGrupo, filterCurva]);

  const gruposList = useMemo(() => {
    const list = Array.from(new Set(empresaData.produtos.map(p => p.grupo).filter(Boolean)));
    return ['TODOS', ...list];
  }, [empresaData.produtos]);

  // ── COLABORADOR HANDLERS ──
  const openNewColabModal = () => {
    setEditingColab(null);
    setColabForm({
      matricula: '',
      nome: '',
      cpf: '',
      cargo: 'Operador de Empilhadeira',
      turno: 'Turno 1'
    });
    setShowColabModal(true);
  };

  const openEditColabModal = (c: ColaboradorMaster) => {
    setEditingColab(c);
    setColabForm({
      matricula: c.matricula,
      nome: c.nome,
      cpf: c.cpf,
      cargo: c.cargo,
      turno: c.turno
    });
    setShowColabModal(true);
  };

  const handleSaveColab = async () => {
    if (!colabForm.matricula.trim() || !colabForm.nome.trim()) {
      alert('Matrícula e Nome são obrigatórios.');
      return;
    }

    setSavingColab(true);
    try {
      const payload: Omit<ColaboradorMaster, '_docId'> = {
        empresaId,
        matricula: colabForm.matricula.trim().toUpperCase(),
        nome: colabForm.nome.trim(),
        cpf: colabForm.cpf ? colabForm.cpf.replace(/\D/g, '') : '',
        cargo: colabForm.cargo.trim(),
        turno: colabForm.turno.trim(),
        _criadoEm: new Date().toISOString()
      };

      let savedDocId = editingColab?._docId;

      if (editingColab && editingColab._docId) {
        if (db && !editingColab._docId.startsWith('local_')) {
          await updateDoc(doc(db, 'colaboradores', editingColab._docId), payload);
        }
      } else {
        if (db) {
          try {
            const docRef = await addDoc(collection(db, 'colaboradores'), payload);
            savedDocId = docRef.id;
          } catch (e) {
            console.warn('Firestore addDoc fallback:', e);
            savedDocId = `local_${Date.now()}`;
          }
        } else {
          savedDocId = `local_${Date.now()}`;
        }
      }

      // Sync to LocalStorage for offline and instant reactivity
      const key = `colaboradores_${empresaId}`;
      let existingLocal: ColaboradorMaster[] = [];
      try {
        existingLocal = JSON.parse(localStorage.getItem(key) || '[]');
      } catch {}

      const mapLocal = new Map<string, ColaboradorMaster>();
      existingLocal.forEach(c => {
        const k = String(c.matricula || c.nome).trim().toUpperCase();
        if (k) mapLocal.set(k, c);
      });
      mapLocal.set(payload.matricula, { _docId: savedDocId, ...payload });

      localStorage.setItem(key, JSON.stringify(Array.from(mapLocal.values())));

      // Clear deletion filter if previously deleted
      const updatedDeleted = deletedMatriculas.filter(
        m => m.toUpperCase() !== payload.matricula.toUpperCase() && m.toUpperCase() !== payload.nome.toUpperCase()
      );
      if (updatedDeleted.length !== deletedMatriculas.length) {
        setDeletedMatriculas(updatedDeleted);
        localStorage.setItem(`deleted_colaboradores_${empresaId}`, JSON.stringify(updatedDeleted));
      }

      setLocalVersion(v => v + 1);
      setShowColabModal(false);
    } catch (e) {
      alert('Erro ao salvar colaborador: ' + e);
    } finally {
      setSavingColab(false);
    }
  };

  const handleDeleteColab = async (c: ColaboradorMaster) => {
    if (!confirm(`Confirma a exclusão do colaborador ${c.nome} (Matrícula: ${c.matricula})?`)) return;

    try {
      const targetId = c._docId || (c as any).id;
      if (db && targetId && !targetId.startsWith('local_') && !targetId.startsWith('import_')) {
        try {
          await deleteDoc(doc(db, 'colaboradores', targetId));
        } catch (err) {
          console.warn('Firestore delete:', err);
        }
      }

      // 1. Remove from localStorage saved list
      const key = `colaboradores_${empresaId}`;
      const existing: ColaboradorMaster[] = JSON.parse(localStorage.getItem(key) || '[]');
      const filteredLS = existing.filter((item: any) => 
        item._docId !== targetId && item.id !== targetId && item.matricula !== c.matricula && item.nome !== c.nome
      );
      localStorage.setItem(key, JSON.stringify(filteredLS));

      // 2. Mark as deleted globally
      const updatedDeleted = Array.from(new Set([...deletedMatriculas, c.matricula, c.nome].filter(Boolean)));
      localStorage.setItem(`deleted_colaboradores_${empresaId}`, JSON.stringify(updatedDeleted));
      setDeletedMatriculas(updatedDeleted);
      setLocalVersion(v => v + 1);
      window.dispatchEvent(new Event('local_data_changed'));
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleSelectAllColaboradores = (filteredList: ColaboradorMaster[]) => {
    if (selectedColabMatriculas.length === filteredList.length && filteredList.length > 0) {
      setSelectedColabMatriculas([]);
    } else {
      setSelectedColabMatriculas(filteredList.map(c => c.matricula));
    }
  };

  const handleToggleSelectColaborador = (matricula: string) => {
    setSelectedColabMatriculas(prev =>
      prev.includes(matricula) ? prev.filter(m => m !== matricula) : [...prev, matricula]
    );
  };

  const handleDeleteSelectedColaboradores = async () => {
    if (selectedColabMatriculas.length === 0) {
      alert('Nenhum colaborador selecionado para exclusão.');
      return;
    }
    if (!confirm(`⚠️ Confirma a exclusão de ${selectedColabMatriculas.length} colaboradores selecionados?`)) return;

    try {
      if (db) {
        const list = empresaData.colaboradores || [];
        for (const c of list) {
          if (selectedColabMatriculas.includes(c.matricula) && c._docId && !c._docId.startsWith('local_')) {
            try {
              await deleteDoc(doc(db, 'colaboradores', c._docId));
            } catch (e) {
              console.warn('Firestore delete:', e);
            }
          }
        }
      }

      // 1. Remove from localStorage saved list
      const key = `colaboradores_${empresaId}`;
      const existing: ColaboradorMaster[] = JSON.parse(localStorage.getItem(key) || '[]');
      const filteredLS = existing.filter((item: any) => !selectedColabMatriculas.includes(item.matricula));
      localStorage.setItem(key, JSON.stringify(filteredLS));

      // 2. Mark as deleted globally
      const updatedDeleted = Array.from(new Set([...deletedMatriculas, ...selectedColabMatriculas].filter(Boolean)));
      localStorage.setItem(`deleted_colaboradores_${empresaId}`, JSON.stringify(updatedDeleted));
      setDeletedMatriculas(updatedDeleted);

      setSelectedColabMatriculas([]);
      setLocalVersion(v => v + 1);
      window.dispatchEvent(new Event('local_data_changed'));
      window.dispatchEvent(new Event('storage'));
      alert(`✅ ${selectedColabMatriculas.length} colaboradores excluídos com sucesso!`);
    } catch (e: any) {
      alert('Erro ao excluir colaboradores selecionados: ' + e);
    }
  };

  const handleZerarBaseColaboradores = async () => {
    if (!confirm('⚠️ Tem certeza que deseja ZERAR A BASE DE COLABORADORES? Todos os colaboradores atuais serão removidos para que você possa importar uma nova planilha limpa.')) {
      return;
    }

    try {
      if (db) {
        const list = empresaData.colaboradores || [];
        for (const c of list) {
          if (c._docId && !c._docId.startsWith('local_')) {
            try {
              await deleteDoc(doc(db, 'colaboradores', c._docId));
            } catch (e) {}
          }
        }
      }

      localStorage.setItem(`colaboradores_${empresaId}`, JSON.stringify([]));
      localStorage.setItem(`colaboradores_cleared_${empresaId}`, 'true');
      localStorage.setItem(`colaboradores_custom_base_${empresaId}`, 'true');
      localStorage.setItem(`deleted_colaboradores_${empresaId}`, JSON.stringify([]));
      setDeletedMatriculas([]);
      setColabSearch('');
      setColabCargoFilter('TODOS');
      setColabTurnoFilter('TODOS');

      window.dispatchEvent(new Event('local_data_changed'));
      window.dispatchEvent(new Event('storage'));
      setLocalVersion(v => v + 1);
      alert('Base de colaboradores zerada com sucesso! Você já pode importar sua nova planilha sem interferência de dados antigos.');
    } catch (e) {
      alert('Erro ao zerar base de colaboradores: ' + e);
    }
  };

  // Drag & Drop File Parsing
  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

        const parsed = rows.map((row) => {
          const rawObj: Record<string, string> = {};
          Object.entries(row).forEach(([k, v]) => {
            const keyNorm = k.toString().toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            rawObj[keyNorm] = String(v || '').trim();
          });

          let matricula = rawObj['matricula'] || rawObj['matr'] || rawObj['registro'] || rawObj['id'] || rawObj['code'] || rawObj['codigo'] || rawObj['cod'] || rawObj['chv'] || rawObj['chave'] || rawObj['m'] || '';
          let nome = rawObj['nome'] || rawObj['colaborador'] || rawObj['funcionario'] || rawObj['nome completo'] || rawObj['nomecolaborador'] || rawObj['nome do colaborador'] || rawObj['nome do funcionario'] || rawObj['nome/matricula'] || '';
          let cpf = rawObj['cpf'] || rawObj['documento'] || rawObj['doc'] || '';
          let cargo = rawObj['cargo'] || rawObj['funcao'] || rawObj['função'] || rawObj['funcao/cargo'] || rawObj['cargo/funcao'] || rawObj['ocupacao'] || rawObj['papel'] || 'Ajudante';
          let turno = rawObj['turno'] || rawObj['horario'] || rawObj['tur'] || 'Diurno';

          // Fallback: if matricula or nome missing, extract first non-empty cells
          if (!matricula || !nome) {
            const values = Object.values(row).map(v => String(v || '').trim()).filter(Boolean);
            if (!matricula && values.length > 0) matricula = values[0];
            if (!nome && values.length > 1) nome = values[1];
            if (!nome) nome = matricula;
          }

          const errors: string[] = [];
          if (!matricula && !nome) {
            errors.push('Matrícula ou Nome do colaborador em branco');
          }

          const finalMatricula = (matricula || nome).toUpperCase();
          const finalNome = nome || matricula;

          return {
            raw: row,
            matricula: finalMatricula,
            nome: finalNome,
            cpf,
            cargo,
            turno,
            isValid: errors.length === 0,
            errors
          };
        });

        setImportPreview(parsed);
      } catch (err) {
        alert('Erro ao processar arquivo: ' + err);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleBatchConfirmImport = async () => {
    const validRows = importPreview.filter(p => p.isValid);
    if (validRows.length === 0) {
      alert('Nenhum registro válido para importar.');
      return;
    }

    setImportingColab(true);
    try {
      const newItems: ColaboradorMaster[] = [];

      for (const row of validRows) {
        const item: Omit<ColaboradorMaster, '_docId'> = {
          empresaId,
          matricula: row.matricula.trim().toUpperCase(),
          nome: row.nome.trim(),
          cpf: row.cpf ? row.cpf.replace(/\D/g, '') : '',
          cargo: row.cargo.trim(),
          turno: row.turno.trim(),
          _criadoEm: new Date().toISOString()
        };

        let savedDocId = `import_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        if (db) {
          try {
            const docRef = await addDoc(collection(db, 'colaboradores'), item);
            savedDocId = docRef.id;
          } catch (err) {
            console.warn('Firestore addDoc batch warning:', err);
          }
        }
        newItems.push({ _docId: savedDocId, ...item });
      }

      // 1. Mark custom base as active, unmark cleared, reset deletedMatriculas
      localStorage.setItem(`colaboradores_custom_base_${empresaId}`, 'true');
      localStorage.setItem(`colaboradores_cleared_${empresaId}`, 'false');
      localStorage.setItem(`deleted_colaboradores_${empresaId}`, '[]');
      setDeletedMatriculas([]);

      // 2. Reset filters so all imported rows appear immediately
      setColabSearch('');
      setColabCargoFilter('TODOS');
      setColabTurnoFilter('TODOS');

      // 3. Save to LocalStorage
      const key = `colaboradores_${empresaId}`;
      let existingLocal: ColaboradorMaster[] = [];
      try {
        existingLocal = JSON.parse(localStorage.getItem(key) || '[]');
      } catch {}

      const updatedLocalMap = new Map<string, ColaboradorMaster>();
      existingLocal.forEach(i => {
        const k = String(i.matricula || i.nome).trim().toUpperCase();
        if (k) updatedLocalMap.set(k, i);
      });
      newItems.forEach(i => {
        const k = String(i.matricula || i.nome).trim().toUpperCase();
        if (k) updatedLocalMap.set(k, i);
      });

      const updatedLocalList = Array.from(updatedLocalMap.values());
      localStorage.setItem(key, JSON.stringify(updatedLocalList));

      setImportPreview([]);
      setLocalVersion(v => v + 1);
      window.dispatchEvent(new Event('local_data_changed'));
      window.dispatchEvent(new Event('storage'));

      alert(`✅ Importação concluída com sucesso! ${newItems.length} colaboradores salvos e atualizados na base.`);
    } catch (e) {
      alert('Erro na gravação em lote: ' + e);
    } finally {
      setImportingColab(false);
    }
  };

  const handleNormalizeAllCollaboratorNames = () => {
    let fixCount = 0;
    const modules = ['quebras', 'despejo', 'repack', 'validades', 'refugo', 'blitz', 'acoes'];
    modules.forEach(mod => {
      const key = `af_${mod}_registros`;
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            const normalized = normalizeCollaboratorNamesInRecords(
              list,
              ['colaborador', 'responsavel', 'conferente', 'operador', 'ajudante', 'autor', 'nome', 'operadorNome'],
              empresaData.colaboradores
            );
            localStorage.setItem(key, JSON.stringify(normalized));
            fixCount++;
          }
        } catch (e) {}
      }
    });

    window.dispatchEvent(new Event('local_data_changed'));
    window.dispatchEvent(new Event('storage'));
    alert(`✨ Normalização de nomes de colaboradores concluída! Nomes com variações ou erros (ex: "mARIVALDO mARIVALDO") foram padronizados de acordo com o Cadastro de Colaboradores.`);
  };

  // ── PRÉ-AUTORIZAR PRIMEIRO ACESSO HANDLER ──
  const handleRegisterPrimeiroAcesso = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!paMatricula.trim() && !paEmail.trim()) {
      alert('Preencha a Matrícula ou o E-mail para identificar o colaborador.');
      return;
    }
    if (!paNome.trim() || !paFuncao) {
      alert('Preencha o Nome Completo e a Função do colaborador.');
      return;
    }

    setSavingPa(true);
    try {
      const payload: Omit<ColaboradorMaster, '_docId'> & { primeiroAcesso?: boolean; senha?: string; funcao?: string; email?: string } = {
        empresaId,
        matricula: paMatricula.trim().toUpperCase() || `PA-${Date.now().toString().slice(-5)}`,
        nome: paNome.trim(),
        cpf: paCpf ? paCpf.replace(/\D/g, '') : '',
        email: paEmail.trim().toLowerCase() || '',
        cargo: 'Primeiro Acesso Pendente',
        turno: 'Turno 1',
        senha: '',
        funcao: paFuncao,
        primeiroAcesso: true,
        _criadoEm: new Date().toISOString()
      };

      let docId = `local_${Date.now()}`;
      if (db) {
        try {
          const docRef = await addDoc(collection(db, 'colaboradores'), payload as any);
          docId = docRef.id;
        } catch (err) {
          console.warn('Firestore addDoc fallback:', err);
        }
      }

      const key = `colaboradores_${empresaId}`;
      let existing: ColaboradorMaster[] = [];
      try {
        existing = JSON.parse(localStorage.getItem(key) || '[]');
      } catch {}
      existing.unshift({ _docId: docId, ...payload });
      localStorage.setItem(key, JSON.stringify(existing));

      setLocalVersion(v => v + 1);
      setShowPaModal(false);
      setPaMatricula('');
      setPaNome('');
      setPaEmail('');
      setPaCpf('');
      setPaFuncao('repack');
      alert('✅ Colaborador pré-autorizado com sucesso! No primeiro login ele cadastrará sua senha.');
    } catch (err: any) {
      alert('Erro ao pré-autorizar colaborador: ' + (err.message || err));
    } finally {
      setSavingPa(false);
    }
  };

  // ── METAS DA OPERAÇÃO HANDLERS ──
  const openNewMetaModal = () => {
    setIsNewMeta(true);
    setEditingMeta(null);
    setMetaForm({
      operacaoKey: `meta_${Date.now()}`,
      nome: '',
      indicador: 'Produtividade Média',
      valor: '10',
      unidade: 'cx/h',
      descricao: ''
    });
    setShowMetaModal(true);
  };

  const openEditMetaModal = (m: MetaOperacao) => {
    setIsNewMeta(false);
    setEditingMeta(m);
    setMetaForm({
      operacaoKey: m.operacaoKey,
      nome: m.nome,
      indicador: m.indicador,
      valor: m.valor,
      unidade: m.unidade,
      descricao: m.descricao
    });
    setShowMetaModal(true);
  };

  const handleDeleteMeta = async (keyToDelete: string) => {
    if (!confirm('Deseja realmente excluir esta meta operacional?')) return;
    const updated = metas.filter(m => m.operacaoKey !== keyToDelete);
    setMetas(updated);
    localStorage.setItem(`metas_operacao_${empresaId}`, JSON.stringify(updated));
    alert('Meta removida com sucesso!');
  };

  const handleSaveMeta = async () => {
    if (!metaForm.nome.trim()) {
      alert('Preencha o Nome da Meta.');
      return;
    }
    const targetKey = metaForm.operacaoKey.trim() || `meta_${Date.now()}`;
    const newOrUpdatedMeta: MetaOperacao = {
      operacaoKey: targetKey,
      nome: metaForm.nome.trim(),
      indicador: metaForm.indicador.trim() || 'Indicador Operacional',
      valor: metaForm.valor,
      unidade: metaForm.unidade.trim() || 'un',
      descricao: metaForm.descricao.trim() || 'Meta definida pela liderança'
    };

    let updated: MetaOperacao[];
    if (isNewMeta) {
      updated = [...metas, newOrUpdatedMeta];
    } else {
      updated = metas.map(m => m.operacaoKey === targetKey ? newOrUpdatedMeta : m);
    }

    setMetas(updated);
    localStorage.setItem(`metas_operacao_${empresaId}`, JSON.stringify(updated));

    if (db) {
      try {
        await addDoc(collection(db, 'metas_operacao'), {
          empresaId,
          ...newOrUpdatedMeta,
          atualizadoEm: new Date().toISOString()
        });
      } catch (e) {
        console.warn('Firestore metas save:', e);
      }
    }
    setShowMetaModal(false);
    alert(isNewMeta ? 'Nova meta criada com sucesso!' : `Meta para ${newOrUpdatedMeta.nome} atualizada com sucesso!`);
  };

  const handleRestoreAllColaboradores = () => {
    if (!confirm('Deseja restaurar a base oficial completa com os 21 colaboradores?')) return;
    localStorage.removeItem(`deleted_colaboradores_${empresaId}`);
    localStorage.removeItem(`colaboradores_${empresaId}`);
    setDeletedMatriculas([]);
    setColabCargoFilter('TODOS');
    setColabTurnoFilter('TODOS');
    setColabSearch('');
    setLocalVersion(v => v + 1);
    alert('✅ Base oficial de 21 colaboradores restaurada com sucesso!');
  };

  // Dynamic cargos list for filter dropdown
  const colabCargosOptions = useMemo(() => {
    const set = new Set<string>();
    allColaboradores.forEach(c => {
      if (c.cargo) set.add(c.cargo.trim());
    });
    return ['TODOS', ...Array.from(set).sort()];
  }, [allColaboradores]);

  // Dynamic turnos list for filter dropdown
  const colabTurnosOptions = useMemo(() => {
    const set = new Set<string>();
    allColaboradores.forEach(c => {
      if (c.turno) set.add(c.turno.trim());
    });
    return ['TODOS', ...Array.from(set).sort()];
  }, [allColaboradores]);

  const filteredColaboradores = useMemo(() => {
    return allColaboradores.filter(c => {
      const mat = String(c.matricula || '').trim();
      const nm = String(c.nome || '').trim();

      if (mat && deletedMatriculas.includes(mat)) return false;
      if (nm && deletedMatriculas.includes(nm)) return false;

      // Cargo Filter with normalized string comparison
      if (colabCargoFilter !== 'TODOS') {
        const cCargoNorm = String(c.cargo || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
        const filterCargoNorm = colabCargoFilter.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
        if (cCargoNorm !== filterCargoNorm) return false;
      }

      // Turno Filter with normalized string comparison
      if (colabTurnoFilter !== 'TODOS') {
        const cTurnoNorm = String(c.turno || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
        const filterTurnoNorm = colabTurnoFilter.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
        if (cTurnoNorm !== filterTurnoNorm) return false;
      }

      if (!colabSearch.trim()) return true;

      const s = colabSearch.toLowerCase().trim();
      return (
        String(c.matricula || '').toLowerCase().includes(s) ||
        String(c.nome || '').toLowerCase().includes(s) ||
        String(c.cargo || '').toLowerCase().includes(s) ||
        String(c.cpf || '').includes(s)
      );
    });
  }, [allColaboradores, colabSearch, deletedMatriculas, colabCargoFilter, colabTurnoFilter]);

  // ── ACESSOS HANDLERS ──
  const getColaboradorAccess = (matricula: string): string[] => {
    const existing = empresaData.acessos.find(a => a.matricula === matricula);
    if (existing && existing.modulosPermitidos && existing.modulosPermitidos.length > 0) {
      return existing.modulosPermitidos;
    }
    const colab = allColaboradores.find(c => c.matricula === matricula);
    return getDefaultModulesForCargo(colab?.cargo);
  };

  const handleToggleModuleAccess = async (matricula: string, nomeColaborador: string, moduleId: string) => {
    const current = getColaboradorAccess(matricula);
    const updated = current.includes(moduleId)
      ? current.filter(m => m !== moduleId)
      : [...current, moduleId];

    setSavingAcesso(matricula);
    try {
      const existingDoc = empresaData.acessos.find(a => a.matricula === matricula);
      if (existingDoc && existingDoc._docId) {
        if (db) {
          await updateDoc(doc(db, 'acessos', existingDoc._docId), {
            modulosPermitidos: updated,
            nomeColaborador,
            _criadoEm: new Date().toISOString()
          });
        }
      } else {
        if (db) {
          await addDoc(collection(db, 'acessos'), {
            empresaId,
            matricula,
            nomeColaborador,
            modulosPermitidos: updated,
            _criadoEm: new Date().toISOString()
          });
        }
      }
    } catch (e) {
      console.error('Erro ao salvar acessos:', e);
    } finally {
      setSavingAcesso(null);
    }
  };

  return (
    <div className={`space-y-6 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
      {/* TOP NAVIGATION: 1. CADASTROS GERAIS | 2. CONTROLE DE ACESSOS (ETAPA 8) */}
      <div className="space-y-3">
        <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-4 shadow-md flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
                Cadastros & Governança da Plataforma
              </h2>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                Gestão de Cadastros Gerais (Colaboradores e Produtos) e Controle de Acessos & Logins
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center bg-[#0b1222] border border-slate-800 p-1.5 rounded-xl gap-1.5">
            <button
              type="button"
              onClick={() => setMainTab('gerais')}
              className={`px-4 py-2.5 rounded-lg font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border-none ${
                mainTab === 'gerais'
                  ? 'bg-emerald-600 text-white shadow-md scale-[1.02]'
                  : 'text-slate-400 hover:text-white bg-transparent'
              }`}
            >
              <Database className="w-4 h-4" />
              1. Cadastros Gerais
            </button>

            <button
              type="button"
              onClick={() => setMainTab('acessos')}
              className={`px-4 py-2.5 rounded-lg font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border-none ${
                mainTab === 'acessos'
                  ? 'bg-purple-600 text-white shadow-md scale-[1.02]'
                  : 'text-slate-400 hover:text-white bg-transparent'
              }`}
            >
              <Key className="w-4 h-4 text-amber-300" />
              2. Controle de Acessos
            </button>
          </div>
        </div>

        {/* SUB-TABS UNDER CADASTROS GERAIS */}
        {mainTab === 'gerais' && (
          <div className="bg-[#0b1222] border border-slate-800 p-1.5 rounded-xl flex flex-wrap items-center justify-between gap-2">
            <span className="text-[10px] font-black uppercase text-slate-400 px-3 tracking-wider flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-emerald-400" /> Sub-guias de Cadastros Gerais:
            </span>
            <div className="flex flex-wrap items-center gap-1">
              <button
                onClick={() => setActiveSubTab('colaboradores')}
                className={`px-3.5 py-2 rounded-lg font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer border-none ${
                  activeSubTab === 'colaboradores'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white bg-transparent'
                }`}
              >
                <Users className="w-4 h-4" />
                Colaboradores ({allColaboradores.length})
              </button>

              <button
                onClick={() => setActiveSubTab('produtos')}
                className={`px-3.5 py-2 rounded-lg font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer border-none ${
                  activeSubTab === 'produtos'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white bg-transparent'
                }`}
              >
                <Package className="w-4 h-4" />
                Produtos ({empresaData.produtos.length})
              </button>

              <button
                onClick={() => setActiveSubTab('metas')}
                className={`px-3.5 py-2 rounded-lg font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer border-none ${
                  activeSubTab === 'metas'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white bg-transparent'
                }`}
              >
                <Target className="w-4 h-4" />
                Metas (Operação)
              </button>

              <button
                onClick={() => setActiveSubTab('padroes')}
                className={`px-3.5 py-2 rounded-lg font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer border-none ${
                  activeSubTab === 'padroes'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white bg-transparent'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Padrões (POP/SOP)
              </button>

              <button
                onClick={() => setActiveSubTab('lembretes')}
                className={`px-3.5 py-2 rounded-lg font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer border-none ${
                  activeSubTab === 'lembretes'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white bg-transparent'
                }`}
              >
                <Clock className="w-4 h-4" />
                Lembretes & Horários
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── 1. SUB-ABA PRODUTOS ── */}
      {mainTab === 'gerais' && activeSubTab === 'produtos' && (
        <div className="space-y-4">
          {/* DRAG AND DROP PRODUCT IMPORT / OVERWRITE CARD */}
          <div 
            onDragOver={(e) => { e.preventDefault(); setIsProdDragOver(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsProdDragOver(false); }}
            onDrop={(e) => {
              e.preventDefault();
              setIsProdDragOver(false);
              const files = e.dataTransfer.files;
              if (files && files.length > 0) {
                handleProdFileUpload(files[0]);
              }
            }}
            className={`p-5 rounded-2xl border-2 border-dashed transition-all flex flex-col md:flex-row items-center justify-between gap-4 ${
              isProdDragOver 
                ? 'bg-emerald-950/40 border-emerald-400 scale-[1.005]' 
                : 'bg-[#0f172a]/90 border-slate-700/80 hover:border-slate-500'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white uppercase tracking-wide flex items-center gap-2">
                  Sobrescrever Base de Produtos (Drag & Drop)
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-mono">
                    Excel / CSV
                  </span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Arraste e solte o arquivo aqui para <strong className="text-emerald-300">sobrescrever e substituir</strong> toda a base cadastrada (Código, Descrição, Fator SKU, Valor, Fator Hecto, Grupo, Curva, Idade).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => handleSelectAllProducts(filteredProdutos)}
                className="px-3.5 py-2 bg-[#1e293b] hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all"
                title="Selecionar ou desmarcar todos os produtos exibidos"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {selectedProdCodes.length === filteredProdutos.length && filteredProdutos.length > 0
                  ? 'Desmarcar Todos'
                  : `Selecionar Todos (${filteredProdutos.length})`}
              </button>

              {selectedProdCodes.length > 0 && (
                <button
                  type="button"
                  onClick={handleDeleteSelectedProducts}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-md animate-pulse"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir {selectedProdCodes.length} Selecionados
                </button>
              )}

              <button
                type="button"
                onClick={handleDownloadProductModelExcel}
                className="px-3.5 py-2 bg-[#1e293b] hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                Baixar Modelo Excel
              </button>

              <label className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl flex items-center gap-2 cursor-pointer transition-all shadow-md">
                <FileSpreadsheet className="w-4 h-4" />
                Substituir Base (Excel)
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files && files.length > 0) {
                      handleProdFileUpload(files[0]);
                    }
                    e.target.value = '';
                  }}
                />
              </label>

              {(empresaData.produtos.length > 0 || filteredProdutos.length > 0) && (
                <button
                  type="button"
                  onClick={async () => {
                    if (confirm(`⚠️ Tem certeza que deseja ZERAR E EXCLUIR TODA A BASE DE PRODUTOS CADASTRADOS? Esta ação não pode ser desfeita.`)) {
                      if (db) {
                        for (const p of empresaData.produtos) {
                          if (p._docId && !p._docId.startsWith('local_')) {
                            try {
                              await deleteDoc(doc(db, 'produtos', p._docId));
                            } catch (e) {}
                          }
                        }
                      }
                      localStorage.setItem(`produtos_${empresaId}`, JSON.stringify([]));
                      localStorage.setItem(`produtos_cleared_${empresaId}`, 'true');
                      setSelectedProdCodes([]);
                      window.dispatchEvent(new Event('local_data_changed'));
                      window.dispatchEvent(new Event('storage'));
                      setLocalVersion(v => v + 1);
                      if ((empresaData as any).refetchProdutos) (empresaData as any).refetchProdutos();
                      alert('Base de produtos totalmente zerada com sucesso.');
                    }
                  }}
                  className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all"
                  title="Apagar todos os produtos cadastrados"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir Base de Produtos
                </button>
              )}
            </div>
          </div>

          <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Buscar produto por código ou descrição..."
                  value={produtoSearch}
                  onChange={(e) => setProdutoSearch(e.target.value)}
                  className="w-full bg-[#0b1222] border border-slate-800 focus:border-emerald-500 text-white text-xs rounded-xl pl-9 pr-3 py-2.5 focus:outline-none"
                />
              </div>

              <select
                value={filterGrupo}
                onChange={(e) => setFilterGrupo(e.target.value)}
                className="bg-[#0b1222] border border-slate-800 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none font-bold cursor-pointer"
              >
                {gruposList.map(g => (
                  <option key={g} value={g}>{g === 'TODOS' ? 'Todos os Grupos' : g}</option>
                ))}
              </select>

              <select
                value={filterCurva}
                onChange={(e) => setFilterCurva(e.target.value)}
                className="bg-[#0b1222] border border-slate-800 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none font-bold cursor-pointer"
              >
                <option value="TODAS">Todas as Curvas (A/B/C)</option>
                <option value="A">Curva A (Alta Rotação)</option>
                <option value="B">Curva B (Média Rotação)</option>
                <option value="C">Curva C (Baixa Rotação)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={openNewProdutoModal}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all shadow-md"
              >
                <Plus className="w-4 h-4" />
                Novo Produto
              </button>
            </div>
          </div>

          {/* TABLE OF PRODUCTS */}
          <div className="bg-[#111a30] border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#0b1222] border-b border-slate-800 text-slate-400 font-black uppercase text-[10px] tracking-wider">
                    <th className="p-3.5 text-center w-10">
                      <input
                        type="checkbox"
                        checked={selectedProdCodes.length > 0 && selectedProdCodes.length === filteredProdutos.length}
                        onChange={() => handleSelectAllProducts(filteredProdutos)}
                        className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                        title="Selecionar Todos"
                      />
                    </th>
                    <th className="p-3.5">Código</th>
                    <th className="p-3.5">Descrição do SKU</th>
                    <th className="p-3.5">Fator (SKU)</th>
                    <th className="p-3.5">Fator Pallet</th>
                    <th className="p-3.5">Valor Unit (R$)</th>
                    <th className="p-3.5">Fator Hecto (HL)</th>
                    <th className="p-3.5">Grupo</th>
                    <th className="p-3.5">Embalagem</th>
                    <th className="p-3.5 text-center">Curva</th>
                    <th className="p-3.5 text-center">Idade (Dias)</th>
                    <th className="p-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-slate-200">
                  {filteredProdutos.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-8 text-center text-slate-500 text-xs font-sans">
                        Nenhum produto cadastrado com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredProdutos.map((p) => {
                      const isSelected = selectedProdCodes.includes(p.codigo);
                      return (
                        <tr key={p._docId || p.codigo} className={`hover:bg-slate-800/30 transition-colors ${isSelected ? 'bg-emerald-500/10' : ''}`}>
                          <td className="p-3.5 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectProduct(p.codigo)}
                              className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                            />
                          </td>
                          <td className="p-3.5 font-bold text-amber-400">{p.codigo}</td>
                          <td className="p-3.5 font-sans font-bold text-white">{p.descricao}</td>
                          <td className="p-3.5 text-slate-300">{p.fator} un</td>
                          <td className="p-3.5 text-center font-bold text-emerald-400 font-mono">
                            {p.fatorPallet || 60} cx/PL
                          </td>
                          <td className="p-3.5 font-bold text-emerald-400">R$ {Number(p.valor || 0).toFixed(2)}</td>
                          <td className="p-3.5 text-cyan-400 font-bold">{p.fatorHecto} HL</td>
                          <td className="p-3.5 font-sans">
                            <span className="bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase">
                              {p.grupo || 'Geral'}
                            </span>
                          </td>
                          <td className="p-3.5 font-sans text-slate-300">
                            {p.embalagem || '-'}
                          </td>
                          <td className="p-3.5 text-center">
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase ${
                              p.curva === 'A' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                              p.curva === 'B' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' :
                              'bg-slate-800 text-slate-400'
                            }`}>
                              Curva {p.curva || 'B'}
                            </span>
                          </td>
                          <td className="p-3.5 text-center font-bold text-amber-300 font-mono">
                            {p.idade || 180} d
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openEditProdutoModal(p)}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-lg transition-colors cursor-pointer"
                                title="Editar Produto"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteProduto(p)}
                                className="p-1.5 bg-slate-800 hover:bg-rose-900/40 text-rose-400 rounded-lg transition-colors cursor-pointer"
                                title="Excluir Produto"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. SUB-ABA COLABORADORES ── */}
      {mainTab === 'gerais' && activeSubTab === 'colaboradores' && (
        <div className="space-y-6">
          {/* DRAG AND DROP IMPORT ZONE */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFileUpload(e.dataTransfer.files[0]);
              }
            }}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
              isDragOver ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-800 bg-[#111a30]'
            }`}
          >
            <div className="max-w-md mx-auto space-y-3">
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl inline-block border border-emerald-500/20">
                <Upload className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-wide">
                Importação / Carga em Lote de Colaboradores
              </h3>
              <p className="text-xs text-slate-400">
                Arraste e solte uma planilha (CSV ou XLSX) contendo as colunas:{' '}
                <strong className="text-emerald-400">Matrícula, Nome, CPF, Cargo, Turno</strong>.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <label className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer inline-flex items-center gap-2 border border-slate-700 transition-all">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  Selecionar Arquivo CSV / XLSX
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                  />
                </label>

                <button
                  onClick={() => {
                    const data = [
                      { 'Matrícula': 'G1160', 'Nome': 'GLADSON LISBOA DOS SANTOS', 'CPF': '017.832.554-63', 'Cargo': 'AJUDANTE DE ARMAZEM', 'Turno': 'TARDE' },
                      { 'Matrícula': 'G1163', 'Nome': 'OZENILDO SOUSA SILVA', 'CPF': '083.601.774-90', 'Cargo': 'AJUDANTE DE ARMAZEM', 'Turno': 'MANHÃ' },
                      { 'Matrícula': 'G1121', 'Nome': 'ADMILTON HERMINIO DOS SANTOS MARCELINO', 'CPF': '042.370.104-57', 'Cargo': 'AJUDANTE DE ARMAZEM', 'Turno': 'NOITE' },
                      { 'Matrícula': 'G1001', 'Nome': 'DIMAS EMANUEL MISSIAS DA SILVA', 'CPF': '014.305.954-85', 'Cargo': 'AJUDANTE DE ARMAZEM', 'Turno': 'NOITE' },
                      { 'Matrícula': 'G1161', 'Nome': 'EDILSON VIEIRA DA SILVA', 'CPF': '099.129.724-57', 'Cargo': 'AJUDANTE DE ARMAZEM', 'Turno': 'NOITE' },
                      { 'Matrícula': 'G1055', 'Nome': 'ELDENKLEBER MAURICIO DA SILVA', 'CPF': '000.618.854-01', 'Cargo': 'AJUDANTE DE ARMAZEM', 'Turno': 'NOITE' },
                      { 'Matrícula': 'G1002', 'Nome': 'LUIS ANTONIO FREIRE MOREIRA', 'CPF': '088.770.774-25', 'Cargo': 'AJUDANTE DE ARMAZEM', 'Turno': 'NOITE' },
                      { 'Matrícula': 'G1154', 'Nome': 'NATANAEL LUIZ DA SILVA', 'CPF': '708.229.224-44', 'Cargo': 'AJUDANTE DE ARMAZEM', 'Turno': 'NOITE' },
                      { 'Matrícula': 'G1128', 'Nome': 'NIXON HENRIQUE PEREIRA DE ARRUDA', 'CPF': '121.247.484-83', 'Cargo': 'ASSISTENTE DE CONTROLE', 'Turno': 'DIURNO' },
                      { 'Matrícula': 'G1088', 'Nome:': 'ALECYA CRISTINA FLORENCIO FERREIRA', 'CPF': '116.288.364-23', 'Cargo': 'AUXILIAR DE CONTROLE', 'Turno': 'TARDE' },
                      { 'Matrícula': 'G1145', 'Nome': 'KATHYEL ROCHA DA SILVA', 'CPF': '715.236.124-01', 'Cargo': 'AUXILIAR DE PUXADA', 'Turno': 'DIURNO' },
                      { 'Matrícula': 'G1150', 'Nome': 'DEJEAN SILVA DE OLIVEIRA', 'CPF': '106.036.454-96', 'Cargo': 'AUXILIAR DE SERVICOS GERAIS', 'Turno': 'DIURNO' },
                      { 'Matrícula': 'G1093', 'Nome': 'GILSON ROSA DA SILVA', 'CPF': '125.403.194-40', 'Cargo': 'CONFERNTE', 'Turno': 'DIURNO' },
                      { 'Matrícula': 'G1073', 'Nome': 'CICERO MATHEU DE OLIVEIRA SILVA', 'CPF': '148.472.344-99', 'Cargo': 'CONFERNTE', 'Turno': 'NOITE' },
                      { 'Matrícula': 'G1147', 'Nome': 'DJEANDERSON SOARES DO NASCIMENTO', 'CPF': '114.071.384-13', 'Cargo': 'COORDENADOR DE ARMAZEM', 'Turno': 'DIURNO' },
                      { 'Matrícula': 'G1071', 'Nome': 'JOSE GONCALVES DE SOUZA', 'CPF': '128.791.634-12', 'Cargo': 'JOVEM APRENDIZ ARMAZEM', 'Turno': 'DIURNO' },
                      { 'Matrícula': 'G1125', 'Nome': 'DIOGENES PEREIRA DA SILVA', 'CPF': '701.931.834-71', 'Cargo': 'MANOBRISTA', 'Turno': 'NOITE' },
                      { 'Matrícula': 'G1009', 'Nome': 'JOSE RONILDO DA SILVA', 'CPF': '085.789.634-23', 'Cargo': 'OPERADOR DE EMPILHADEIRA', 'Turno': 'TARDE' },
                      { 'Matrícula': 'G1137', 'Nome': 'MARIVALDO ARTUR ALVES', 'CPF': '047.471.304-03', 'Cargo': 'OPERADOR DE EMPILHADEIRA', 'Turno': 'DIURNO' },
                      { 'Matrícula': 'G1013', 'Nome': 'PAULO PEREIRA DA SILVA', 'CPF': '029.604.844-52', 'Cargo': 'OPERADOR DE EMPILHADEIRA', 'Turno': 'NOITE' }
                    ];
                    const ws = XLSX.utils.json_to_sheet(data);
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, 'Colaboradores');
                    XLSX.writeFile(wb, 'modelo_importacao_colaboradores_guarabira.xlsx');
                  }}
                  className="px-4 py-2.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer border border-indigo-500/30 transition-all flex items-center gap-2"
                >
                  <Download className="w-4 h-4 text-indigo-400" />
                  Baixar Modelo Oficial XLSX
                </button>
              </div>
            </div>
          </div>

          {/* IMPORT PREVIEW TABLE */}
          {importPreview.length > 0 && (
            <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-white uppercase flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Pré-visualização da Importação ({importPreview.length} linhas)
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Sua lista foi validada linha a linha. Linhas com CPF inválido ou campos faltando estão sinalizadas.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setImportPreview([])}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-white uppercase font-bold cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <button
                    onClick={handleBatchConfirmImport}
                    disabled={importingColab || importPreview.filter(p => p.isValid).length === 0}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-2 cursor-pointer transition-all shadow-md"
                  >
                    {importingColab ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Confirmar Gravação ({importPreview.filter(p => p.isValid).length} válidos)
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-800 rounded-xl max-h-[300px]">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-[#0b1222] border-b border-slate-800 text-slate-400 uppercase text-[10px] font-black">
                    <tr>
                      <th className="p-3">Status</th>
                      <th className="p-3">Matrícula</th>
                      <th className="p-3">Nome</th>
                      <th className="p-3">CPF</th>
                      <th className="p-3">Cargo</th>
                      <th className="p-3">Turno</th>
                      <th className="p-3">Observação / Validação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-slate-200">
                    {importPreview.map((item, idx) => (
                      <tr key={idx} className={item.isValid ? 'hover:bg-slate-800/30' : 'bg-rose-950/20 hover:bg-rose-900/30'}>
                        <td className="p-3 font-bold">
                          {item.isValid ? (
                            <span className="text-emerald-400 flex items-center gap-1 font-sans text-[10px]">
                              <Check className="w-3.5 h-3.5" /> OK
                            </span>
                          ) : (
                            <span className="text-rose-400 flex items-center gap-1 font-sans text-[10px]">
                              <AlertTriangle className="w-3.5 h-3.5" /> Erro
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-bold text-amber-400">{item.matricula || '—'}</td>
                        <td className="p-3 font-sans font-bold text-white">{item.nome || '—'}</td>
                        <td className="p-3">{formatCPF(item.cpf)}</td>
                        <td className="p-3 font-sans">{item.cargo}</td>
                        <td className="p-3 font-sans">{item.turno}</td>
                        <td className="p-3 font-sans">
                          {item.errors.length > 0 ? (
                            <span className="text-rose-400 text-[10px] font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                              {item.errors.join(', ')}
                            </span>
                          ) : (
                            <span className="text-emerald-400 text-[10px] font-bold">Pronto para salvar</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* COLABORADORES TABLE HEADER & LIST */}
          <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Buscar colaborador por matrícula, nome, CPF ou cargo..."
                value={colabSearch}
                onChange={(e) => setColabSearch(e.target.value)}
                className="w-full bg-[#0b1222] border border-slate-800 focus:border-emerald-500 text-white text-xs rounded-xl pl-9 pr-3 py-2.5 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-black rounded-xl uppercase tracking-wider">
                Exibindo {filteredColaboradores.length} de {allColaboradores.length} colaboradores
              </span>

              <button
                type="button"
                onClick={handleZerarBaseColaboradores}
                className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all uppercase tracking-wider"
                title="Apaga a base atual de colaboradores para permitir importar uma nova do zero"
              >
                <Trash2 className="w-4 h-4" />
                Zerar Base Colaboradores
              </button>

              <button
                type="button"
                onClick={handleRestoreAllColaboradores}
                className="px-3 py-2 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all uppercase tracking-wider"
                title="Restaura os 21 colaboradores oficiais e limpa filtros de exclusão"
              >
                <RefreshCw className="w-4 h-4" />
                Restaurar Base (21 Colaboradores)
              </button>

              {selectedColabMatriculas.length > 0 && (
                <button
                  type="button"
                  onClick={handleDeleteSelectedColaboradores}
                  className="px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all uppercase tracking-wider shadow-md animate-pulse"
                  title="Excluir colaboradores selecionados"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir Selecionados ({selectedColabMatriculas.length})
                </button>
              )}

              <select
                value={colabCargoFilter}
                onChange={(e) => setColabCargoFilter(e.target.value)}
                className="bg-[#0b1222] border border-slate-800 text-slate-300 text-xs px-3 py-2.5 rounded-xl outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="TODOS">Todos os Cargos</option>
                {colabCargosOptions.filter(cg => cg !== 'TODOS').map(cg => (
                  <option key={cg} value={cg}>{cg}</option>
                ))}
              </select>

              <select
                value={colabTurnoFilter}
                onChange={(e) => setColabTurnoFilter(e.target.value)}
                className="bg-[#0b1222] border border-slate-800 text-slate-300 text-xs px-3 py-2.5 rounded-xl outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="TODOS">Todos os Turnos</option>
                {colabTurnosOptions.filter(t => t !== 'TODOS').map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              <button
                onClick={openNewColabModal}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all shadow-md shrink-0"
              >
                <Plus className="w-4 h-4" />
                Novo Colaborador Manual
              </button>

              <button
                onClick={() => setShowPaModal(true)}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all shadow-md shrink-0"
              >
                <Zap className="w-4 h-4" />
                Pré-Autorizar 1º Acesso
              </button>
            </div>
          </div>

          <div className="bg-[#111a30] border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#0b1222] border-b border-slate-800 text-slate-400 font-black uppercase text-[10px] tracking-wider">
                    <th className="p-3.5 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedColabMatriculas.length === filteredColaboradores.length && filteredColaboradores.length > 0}
                        onChange={() => handleSelectAllColaboradores(filteredColaboradores)}
                        className="w-4 h-4 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500/20 bg-[#0b1222] cursor-pointer"
                        title="Selecionar Todos"
                      />
                    </th>
                    <th className="p-3.5">Matrícula</th>
                    <th className="p-3.5">Nome Colaborador</th>
                    <th className="p-3.5">CPF / Contato</th>
                    <th className="p-3.5">Cargo / Função</th>
                    <th className="p-3.5">Nível de Acesso à Plataforma</th>
                    <th className="p-3.5">Senha de Login</th>
                    <th className="p-3.5">Turno</th>
                    <th className="p-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-slate-200">
                  {filteredColaboradores.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-500 text-xs font-sans">
                        Nenhum colaborador encontrado. Faça a importação da lista ou adicione manualmente.
                      </td>
                    </tr>
                  ) : (
                    filteredColaboradores.map((c, idx) => {
                      const roleType = autoAssignRoleFromCargo(c.cargo);
                      const isSelected = selectedColabMatriculas.includes(c.matricula);

                      return (
                        <tr key={c._docId || `${c.matricula}-${idx}`} className={`hover:bg-slate-800/30 transition-colors ${isSelected ? 'bg-indigo-950/30' : ''}`}>
                          <td className="p-3.5 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectColaborador(c.matricula)}
                              className="w-4 h-4 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500/20 bg-[#0b1222] cursor-pointer"
                            />
                          </td>
                          <td className="p-3.5 font-bold text-amber-400">{c.matricula}</td>
                          <td className="p-3.5 font-sans font-bold text-white flex items-center gap-2">
                            {c.nome}
                            {(c as any).primeiroAcesso && (
                              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                                <Zap className="w-3 h-3" /> 1º Acesso Pendente
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-slate-300">{c.cpf ? formatCPF(c.cpf) : (c as any).email || '—'}</td>
                          <td className="p-3.5 font-sans">
                            <span className="bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md text-[10px] font-bold">
                              {c.cargo}
                            </span>
                          </td>
                          <td className="p-3.5 font-sans">
                            {roleType === 'admin' ? (
                              <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30 inline-flex items-center gap-1">
                                <Shield className="w-3 h-3 text-purple-400" /> Administrativo (Total)
                              </span>
                            ) : roleType === 'conferente' ? (
                              <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1">
                                <Shield className="w-3 h-3 text-emerald-400" /> Conferente (3 Painéis Op.)
                              </span>
                            ) : roleType === 'empilhador' ? (
                              <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1">
                                <Shield className="w-3 h-3 text-amber-400" /> Operador de Empilhadeira
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase bg-sky-500/20 text-sky-300 border border-sky-500/30 inline-flex items-center gap-1">
                                <Shield className="w-3 h-3 text-sky-400" /> Ajudante
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 font-mono text-xs">
                            <span className="px-2 py-1 bg-slate-900 text-amber-300 border border-slate-700 rounded-md font-bold">
                              {(c as any).senha || 'Ambev10'}
                            </span>
                          </td>
                          <td className="p-3.5 font-sans text-sky-400 font-bold">{c.turno}</td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setMatrixColab(c)}
                                className="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border border-indigo-500/30 cursor-pointer flex items-center gap-1"
                                title="Ver / Editar Permissões por Módulo"
                              >
                                <Shield className="w-3 h-3" /> Módulos
                              </button>
                              <button
                                onClick={() => openEditColabModal(c)}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-lg transition-colors cursor-pointer"
                                title="Editar Colaborador"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteColab(c)}
                                className="p-1.5 bg-slate-800 hover:bg-rose-900/40 text-rose-400 rounded-lg transition-colors cursor-pointer"
                                title="Excluir Colaborador"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── 4. SUB-ABA METAS DA OPERAÇÃO ── */}
      {mainTab === 'gerais' && activeSubTab === 'metas' && (
        <div className="space-y-6">
          <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-5 shadow-md flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-tight">
                  Metas & Indicadores da Operação Logística
                </h3>
                <p className="text-xs text-slate-400">
                  Definição oficial dos alvos de produtividade, tempos de SLA e margens de qualidade aplicados nas dashboards.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={openNewMetaModal}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all shadow-md shrink-0"
            >
              <Plus className="w-4 h-4" />
              Nova Meta Operacional
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metas.map((m) => (
              <div key={m.operacaoKey} className="bg-[#111a30] border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-3 shadow-md flex flex-col justify-between transition-all">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                      {m.indicador}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditMetaModal(m)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-lg transition-colors cursor-pointer text-xs font-bold flex items-center gap-1"
                        title="Editar Meta"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteMeta(m.operacaoKey)}
                        className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg transition-colors cursor-pointer text-xs font-bold flex items-center gap-1"
                        title="Excluir Meta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <h4 className="text-sm font-black text-white uppercase">{m.nome}</h4>
                  <p className="text-xs text-slate-400 mt-1">{m.descricao}</p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-baseline justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase">Meta Definida:</span>
                  <div className="text-right">
                    <span className="text-2xl font-black font-mono text-emerald-400">{m.valor}</span>
                    <span className="text-xs font-bold text-slate-300 ml-1 uppercase">{m.unidade}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 5. SUB-ABA PADRÕES OPERACIONAIS (POP/SOP) ── */}
      {mainTab === 'gerais' && activeSubTab === 'padroes' && (
        <div className="space-y-4">
          <PadraoOperacionalPanel user={user} theme={theme} />
        </div>
      )}

      {/* ── 6. SUB-ABA LEMBRETES & HORÁRIOS ── */}
      {mainTab === 'gerais' && activeSubTab === 'lembretes' && (
        <div className="space-y-4">
          <CadastrosLembretesManager />
        </div>
      )}

      {/* ── 2. GUIA CONTROLE DE ACESSOS (ETAPA 8) ── */}
      {mainTab === 'acessos' && (
        <div className="space-y-6">
          {/* BANNER DE REGRA DE SEGURANÇA */}
          <div className="bg-purple-950/30 border border-purple-500/30 rounded-2xl p-4 flex items-start gap-3.5 shadow-md">
            <div className="p-2.5 bg-purple-500/20 text-purple-300 rounded-xl border border-purple-500/30 shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-black text-purple-200 uppercase tracking-wider flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-300" /> Regra de Segurança Integrada (Gestão de Logins)
              </h3>
              <p className="text-xs text-purple-300/90 leading-relaxed font-sans">
                O acesso à plataforma é restrito exclusivamente aos usuários/matrículas com <strong>login e senha devidamente cadastrados</strong> nesta guia. A inativação de um login impede o acesso do usuário sem remover o seu histórico ou seu cadastro de colaborador.
              </p>
            </div>
          </div>

          {/* CARDS DE RESUMO E METRICAS DE LOGIN */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#111a30] border border-slate-800 p-4 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total de Logins</span>
              <span className="text-2xl font-black font-mono text-white">{allColaboradores.length}</span>
            </div>
            <div className="bg-[#111a30] border border-emerald-500/30 p-4 rounded-xl space-y-1 bg-emerald-950/10">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Logins Ativos</span>
              <span className="text-2xl font-black font-mono text-emerald-400">
                {allColaboradores.filter(c => c.ativo !== false).length}
              </span>
            </div>
            <div className="bg-[#111a30] border border-rose-500/30 p-4 rounded-xl space-y-1 bg-rose-950/10">
              <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">Logins Inativos</span>
              <span className="text-2xl font-black font-mono text-rose-400">
                {allColaboradores.filter(c => c.ativo === false).length}
              </span>
            </div>
            <div className="bg-[#111a30] border border-purple-500/30 p-4 rounded-xl space-y-1 bg-purple-950/10">
              <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider block">Acesso Admin</span>
              <span className="text-2xl font-black font-mono text-purple-300">
                {allColaboradores.filter(c => autoAssignRoleFromCargo(c.cargo) === 'admin').length}
              </span>
            </div>
          </div>

          {/* BARRA DE AÇÕES, PESQUISA E FILTROS */}
          <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-4 shadow-md flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por usuário, matrícula, nome..."
                  value={acessoSearch}
                  onChange={(e) => setAcessoSearch(e.target.value)}
                  className="w-full bg-[#0b1222] border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              {/* Filtro por Nível de Acesso */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase text-slate-400 hidden sm:inline">Perfil:</span>
                <select
                  value={acessoRoleFilter}
                  onChange={(e) => setAcessoRoleFilter(e.target.value)}
                  className="bg-[#0b1222] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="TODOS">Todos os Perfis</option>
                  <option value="admin">Administrativo (Total)</option>
                  <option value="conferente">Conferente (3 Painéis)</option>
                  <option value="empilhador">Operador de Empilhadeira</option>
                  <option value="ajudante">Ajudante</option>
                </select>
              </div>

              {/* Filtro por Status */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase text-slate-400 hidden sm:inline">Status:</span>
                <select
                  value={acessoStatusFilter}
                  onChange={(e) => setAcessoStatusFilter(e.target.value)}
                  className="bg-[#0b1222] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="TODOS">Todos os Status</option>
                  <option value="ativo">Somente Ativos</option>
                  <option value="inativo">Somente Inativos</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={() => openCreateLoginModal()}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer flex items-center gap-2 transition-all shadow-md shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              Criar Novo Login
            </button>
          </div>

          {/* TABELA DE CONTROLE DE LOGINS */}
          <div className="bg-[#111a30] border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-400" />
                Credenciais e Status de Login ({filteredLogins.length} registrados)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#0b1222] text-slate-400 uppercase font-black tracking-wider text-[10px] border-b border-slate-800">
                    <th className="p-3.5">Matrícula / Usuário</th>
                    <th className="p-3.5">Nome Colaborador</th>
                    <th className="p-3.5">Tipo de Acesso (Perfil)</th>
                    <th className="p-3.5">Senha Atual</th>
                    <th className="p-3.5">Status do Login</th>
                    <th className="p-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-slate-200">
                  {filteredLogins.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500 text-xs font-sans">
                        Nenhum login cadastrado encontrado com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredLogins.map((c, idx) => {
                      const roleType = autoAssignRoleFromCargo(c.cargo);
                      const isAtivo = c.ativo !== false;
                      const senhaExibida = (c as any).senha || 'Ambev10';

                      return (
                        <tr key={c._docId || `${c.matricula}-${idx}`} className={`hover:bg-slate-800/30 transition-colors ${!isAtivo ? 'opacity-60 bg-rose-950/10' : ''}`}>
                          <td className="p-3.5 font-bold text-amber-400 flex items-center gap-1.5 font-mono">
                            <Key className="w-3.5 h-3.5 text-slate-400" />
                            {c.matricula}
                          </td>
                          <td className="p-3.5 font-sans font-bold text-white">
                            <div>{c.nome}</div>
                            <div className="text-[10px] font-normal text-slate-400">{c.cargo}</div>
                          </td>
                          <td className="p-3.5 font-sans">
                            <select
                              value={
                                roleType === 'admin' ? 'Administrativo' :
                                roleType === 'conferente' ? 'Conferente' :
                                roleType === 'empilhador' ? 'Operador de Empilhadeira' : 'Ajudante'
                              }
                              onChange={(e) => handleQuickChangeRole(c, e.target.value)}
                              className="bg-[#0b1222] border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer font-bold"
                            >
                              <option value="Ajudante">Ajudante (Básico)</option>
                              <option value="Operador de Empilhadeira">Operador de Empilhadeira</option>
                              <option value="Conferente">Conferente (3 Painéis Op.)</option>
                              <option value="Administrativo">Administrativo (Total)</option>
                            </select>
                          </td>
                          <td className="p-3.5 font-mono text-xs">
                            <span className="px-2.5 py-1 bg-slate-900 text-amber-300 border border-slate-700 rounded-md font-bold">
                              {senhaExibida}
                            </span>
                          </td>
                          <td className="p-3.5 font-sans">
                            {isAtivo ? (
                              <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> ATIVO (Liberado)
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30 inline-flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-rose-400" /> INATIVO (Bloqueado)
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-right font-sans">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Botão Ativar / Inativar */}
                              <button
                                type="button"
                                onClick={() => handleToggleAtivoLogin(c)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border cursor-pointer flex items-center gap-1 ${
                                  isAtivo
                                    ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                                    : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40'
                                }`}
                                title={isAtivo ? "Bloquear acesso sem excluir cadastro" : "Desbloquear acesso para login"}
                              >
                                {isAtivo ? 'Inativar Login' : 'Ativar Login'}
                              </button>

                              {/* Botão Editar Login */}
                              <button
                                type="button"
                                onClick={() => openCreateLoginModal(c)}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-lg transition-colors cursor-pointer"
                                title="Editar Credenciais e Senha"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {/* Botão Matriz de Módulos */}
                              <button
                                type="button"
                                onClick={() => setMatrixColab(c)}
                                className="p-1.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 rounded-lg transition-colors cursor-pointer border border-indigo-500/30"
                                title="Editar Módulos Específicos"
                              >
                                <Shield className="w-3.5 h-3.5" />
                              </button>

                              {/* Botão Excluir Login */}
                              <button
                                type="button"
                                onClick={() => handleDeleteLogin(c)}
                                className="p-1.5 bg-slate-800 hover:bg-rose-900/40 text-rose-400 rounded-lg transition-colors cursor-pointer"
                                title="Excluir Credenciais de Login"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CRIAR / EDITAR LOGIN */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-6 max-w-lg w-full space-y-5 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black uppercase flex items-center gap-2">
                <Key className="w-5 h-5 text-purple-400" />
                {editingLoginColab ? `Editar Login: ${editingLoginColab.nome}` : 'Criar Novo Login de Acesso'}
              </h3>
              <button onClick={() => setShowLoginModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Seleção de Colaborador (se criando novo) */}
              {!editingLoginColab ? (
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                    Vincular a Colaborador Cadastrado
                  </label>
                  <select
                    value={loginForm.colabMatricula}
                    onChange={(e) => {
                      const mat = e.target.value;
                      const c = allColaboradores.find(col => col.matricula === mat);
                      const roleType = c ? autoAssignRoleFromCargo(c.cargo) : 'ajudante';
                      const tipoLabel = roleType === 'admin' ? 'Administrativo' :
                                        roleType === 'conferente' ? 'Conferente' :
                                        roleType === 'empilhador' ? 'Operador de Empilhadeira' : 'Ajudante';
                      setLoginForm(prev => ({
                        ...prev,
                        colabMatricula: mat,
                        usuario: mat,
                        senha: (c as any)?.senha || 'Ambev10',
                        tipoAcesso: tipoLabel
                      }));
                    }}
                    className="w-full bg-[#0b1222] border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer font-sans"
                  >
                    <option value="">-- Selecione o Colaborador --</option>
                    {allColaboradores.map(c => (
                      <option key={c.matricula} value={c.matricula}>
                        {c.matricula} — {c.nome} ({c.cargo})
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {/* Matrícula / Usuário */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  Matrícula / Usuário de Acesso
                </label>
                <input
                  type="text"
                  value={loginForm.usuario}
                  onChange={(e) => setLoginForm({ ...loginForm, usuario: e.target.value })}
                  placeholder="Ex: A1002, G1009, 104055..."
                  className="w-full bg-[#0b1222] border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-purple-500 uppercase font-mono font-bold"
                />
              </div>

              {/* Senha */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  Senha de Acesso
                </label>
                <input
                  type="text"
                  value={loginForm.senha}
                  onChange={(e) => setLoginForm({ ...loginForm, senha: e.target.value })}
                  placeholder="Senha padrão (Ex: Ambev10)"
                  className="w-full bg-[#0b1222] border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-purple-500 font-mono font-bold"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  A senha padrão de colaboradores novos é <strong>Ambev10</strong>.
                </span>
              </div>

              {/* Tipo de Acesso */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  Tipo de Acesso (Nível de Permissão)
                </label>
                <select
                  value={loginForm.tipoAcesso}
                  onChange={(e) => setLoginForm({ ...loginForm, tipoAcesso: e.target.value })}
                  className="w-full bg-[#0b1222] border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-purple-500 font-bold cursor-pointer"
                >
                  <option value="Ajudante">Ajudante (Acesso Básico Workstation)</option>
                  <option value="Operador de Empilhadeira">Operador de Empilhadeira (Painel de Movimentação)</option>
                  <option value="Conferente">Conferente (3 Painéis Operacionais)</option>
                  <option value="Administrativo">Administrativo (Acesso Total à Plataforma)</option>
                </select>
              </div>

              {/* Status Inicial */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  Status do Login
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="statusLogin"
                      checked={loginForm.ativo === true}
                      onChange={() => setLoginForm({ ...loginForm, ativo: true })}
                      className="text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-bold text-emerald-400">ATIVO (Liberado para login)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="statusLogin"
                      checked={loginForm.ativo === false}
                      onChange={() => setLoginForm({ ...loginForm, ativo: false })}
                      className="text-rose-500 focus:ring-rose-500"
                    />
                    <span className="text-xs font-bold text-rose-400">INATIVO (Acesso bloqueado)</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowLoginModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveLogin}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase rounded-xl cursor-pointer flex items-center gap-2 shadow-md"
              >
                <Key className="w-4 h-4" />
                Salvar Credenciais de Login
              </button>
            </div>
          </div>
        </div>
      )}
      {showProdutoModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-6 max-w-lg w-full space-y-5 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black uppercase flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-400" />
                {editingProduto ? 'Editar Produto Mestre' : 'Novo Produto Mestre'}
              </h3>
              <button onClick={() => setShowProdutoModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Código (SKU)</label>
                  <input
                    type="text"
                    value={prodForm.codigo}
                    onChange={(e) => setProdForm({ ...prodForm, codigo: e.target.value })}
                    placeholder="Ex: 982"
                    className="w-full bg-[#0b1222] border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Fator (Itens/SKU)</label>
                  <input
                    type="number"
                    value={prodForm.fator}
                    onChange={(e) => setProdForm({ ...prodForm, fator: Number(e.target.value) })}
                    placeholder="Ex: 12"
                    className="w-full bg-[#0b1222] border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Descrição Completa</label>
                <input
                  type="text"
                  value={prodForm.descricao}
                  onChange={(e) => setProdForm({ ...prodForm, descricao: e.target.value })}
                  placeholder="Ex: SKOL 600ML GARRAFA C/12"
                  className="w-full bg-[#0b1222] border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Valor Unitário (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={prodForm.valor}
                    onChange={(e) => setProdForm({ ...prodForm, valor: Number(e.target.value) })}
                    placeholder="Ex: 53.35"
                    className="w-full bg-[#0b1222] border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Fator Hecto (HL)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={prodForm.fatorHecto}
                    onChange={(e) => setProdForm({ ...prodForm, fatorHecto: Number(e.target.value) })}
                    placeholder="Ex: 0.072"
                    className="w-full bg-[#0b1222] border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Grupo do Produto</label>
                  <select
                    value={prodForm.grupo}
                    onChange={(e) => setProdForm({ ...prodForm, grupo: e.target.value })}
                    className="w-full bg-[#0b1222] border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500 font-bold"
                  >
                    <option value="Cervejas">Cervejas</option>
                    <option value="Refrigerantes">Refrigerantes</option>
                    <option value="Águas & NABS">Águas & NABS</option>
                    <option value="Puro Malte / Premium">Puro Malte / Premium</option>
                    <option value="Destilados & Beats">Destilados & Beats</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Curva de Giro</label>
                  <select
                    value={prodForm.curva}
                    onChange={(e) => setProdForm({ ...prodForm, curva: e.target.value })}
                    className="w-full bg-[#0b1222] border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500 font-bold"
                  >
                    <option value="A">Curva A (Alta Rotação)</option>
                    <option value="B">Curva B (Média Rotação)</option>
                    <option value="C">Curva C (Baixa Rotação)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Idade / Validade (Dias)</label>
                  <input
                    type="number"
                    value={prodForm.idade}
                    onChange={(e) => setProdForm({ ...prodForm, idade: Number(e.target.value) })}
                    placeholder="Ex: 180"
                    className="w-full bg-[#0b1222] border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Fator Pallet (cx/Pallet)</label>
                  <input
                    type="number"
                    value={prodForm.fatorPallet}
                    onChange={(e) => setProdForm({ ...prodForm, fatorPallet: Number(e.target.value) })}
                    placeholder="Ex: 60"
                    className="w-full bg-[#0b1222] border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Embalagem (Tipo/Tamanho)</label>
                <input
                  type="text"
                  value={prodForm.embalagem}
                  onChange={(e) => setProdForm({ ...prodForm, embalagem: e.target.value })}
                  placeholder="Ex: PET 1L, LATA 350ML, VIDRO 600ML"
                  className="w-full bg-[#0b1222] border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500 font-sans"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowProdutoModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white uppercase cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveProduto}
                disabled={savingProduto}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-2 cursor-pointer shadow-md"
              >
                {savingProduto ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Salvar Produto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL COLABORADOR ── */}
      {showColabModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-6 max-w-lg w-full space-y-5 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black uppercase flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                {editingColab ? 'Editar Colaborador' : 'Novo Colaborador'}
              </h3>
              <button onClick={() => setShowColabModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Matrícula</label>
                  <input
                    type="text"
                    value={colabForm.matricula}
                    onChange={(e) => setColabForm({ ...colabForm, matricula: e.target.value })}
                    placeholder="Ex: G1001"
                    className="w-full bg-[#0b1222] border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">CPF (11 Dígitos)</label>
                  <input
                    type="text"
                    value={colabForm.cpf}
                    onChange={(e) => setColabForm({ ...colabForm, cpf: e.target.value })}
                    placeholder="Ex: 000.000.000-00"
                    className="w-full bg-[#0b1222] border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Nome Completo</label>
                <input
                  type="text"
                  value={colabForm.nome}
                  onChange={(e) => setColabForm({ ...colabForm, nome: e.target.value })}
                  placeholder="Ex: Carlos Eduardo Silva"
                  className="w-full bg-[#0b1222] border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Cargo / Função</label>
                  <input
                    type="text"
                    value={colabForm.cargo}
                    onChange={(e) => setColabForm({ ...colabForm, cargo: e.target.value })}
                    placeholder="Ex: Operador de Empilhadeira"
                    className="w-full bg-[#0b1222] border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Turno</label>
                  <select
                    value={colabForm.turno}
                    onChange={(e) => setColabForm({ ...colabForm, turno: e.target.value })}
                    className="w-full bg-[#0b1222] border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500 font-bold"
                  >
                    <option value="Turno 1">Turno 1 (Manhã)</option>
                    <option value="Turno 2">Turno 2 (Tarde)</option>
                    <option value="Turno 3">Turno 3 (Noite)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowColabModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white uppercase cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveColab}
                disabled={savingColab}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-2 cursor-pointer shadow-md"
              >
                {savingColab ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Salvar Colaborador
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL PRÉ-VISUALIZAÇÃO SOBRESCREVER BASE DE PRODUTOS ── */}
      {showProdImportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111a30] border border-amber-500/40 rounded-2xl p-6 max-w-3xl w-full space-y-4 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-wide">
                    Confirmar Sobrescrita da Base de Produtos
                  </h3>
                  <p className="text-xs text-amber-400 font-medium">
                    ⚠️ Atenção: Esta ação irá APAGAR a base de produtos atual e cadastrar os {prodImportPreview.length} novos itens importados.
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setShowProdImportModal(false); setProdImportPreview([]); }}
                className="text-slate-400 hover:text-white text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <div className="bg-[#0b1222] border border-slate-800 rounded-xl p-3 flex justify-between items-center text-xs">
                <span className="text-slate-400">Total de produtos válidos encontrados:</span>
                <span className="font-mono font-bold text-emerald-400 text-sm bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
                  {prodImportPreview.length} SKUs
                </span>
              </div>

              <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                Pré-visualização (Primeiros 10 itens):
              </div>

              <div className="border border-slate-800 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#0b1222] text-[10px] text-slate-400 uppercase border-b border-slate-800">
                      <th className="p-2.5 text-center">Código</th>
                      <th className="p-2.5">Descrição</th>
                      <th className="p-2.5 text-center">Fator SKU</th>
                      <th className="p-2.5 text-center">Fator Pallet</th>
                      <th className="p-2.5 text-center">Valor Unit</th>
                      <th className="p-2.5 text-center">Fator Hecto</th>
                      <th className="p-2.5 text-center">Grupo</th>
                      <th className="p-2.5 text-center">Embalagem</th>
                      <th className="p-2.5 text-center">Curva</th>
                      <th className="p-2.5 text-center">Idade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-[#cbd5e1]">
                    {prodImportPreview.slice(0, 10).map((p, idx) => (
                      <tr key={idx} className="hover:bg-[#16223b]">
                        <td className="p-2 text-center font-mono font-bold text-amber-300">{p.codigo}</td>
                        <td className="p-2 font-semibold text-white">{p.descricao}</td>
                        <td className="p-2 text-center font-mono">{p.fator}</td>
                        <td className="p-2 text-center font-mono text-emerald-400">{p.fatorPallet || 60}</td>
                        <td className="p-2 text-center font-mono text-emerald-400">R$ {p.valor.toFixed(2)}</td>
                        <td className="p-2 text-center font-mono">{p.fatorHecto} HL</td>
                        <td className="p-2 text-center"><span className="bg-slate-800 px-2 py-0.5 rounded text-[10px]">{p.grupo}</span></td>
                        <td className="p-2 text-center text-slate-300">{p.embalagem || '-'}</td>
                        <td className="p-2 text-center font-bold text-purple-300">{p.curva}</td>
                        <td className="p-2 text-center font-mono">{p.idade}d</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => { setShowProdImportModal(false); setProdImportPreview([]); }}
                className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white uppercase cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={importingProdutos}
                onClick={handleConfirmOverwriteProducts}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-900/30"
              >
                {importingProdutos ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Sobrescrevendo...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Confirmar e Sobrescrever Base
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL PRÉ-AUTORIZAR PRIMEIRO ACESSO ── */}
      {showPaModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#111a30] border border-amber-500/30 rounded-2xl p-6 max-w-lg w-full space-y-5 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase tracking-tight">Pré-Autorizar Primeiro Acesso</h3>
                  <p className="text-[10px] text-slate-400">Liberar senha no primeiro login do colaborador</p>
                </div>
              </div>
              <button onClick={() => setShowPaModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterPrimeiroAcesso} className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Matrícula</label>
                  <input
                    type="text"
                    value={paMatricula}
                    onChange={(e) => setPaMatricula(e.target.value)}
                    placeholder="Ex: G1234"
                    className="w-full bg-[#0b1222] border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">E-mail (opcional)</label>
                  <input
                    type="email"
                    value={paEmail}
                    onChange={(e) => setPaEmail(e.target.value)}
                    placeholder="colaborador@empresa.com"
                    className="w-full bg-[#0b1222] border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={paNome}
                  onChange={(e) => setPaNome(e.target.value)}
                  placeholder="Nome do colaborador"
                  className="w-full bg-[#0b1222] border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">CPF (opcional)</label>
                  <input
                    type="text"
                    value={paCpf}
                    onChange={(e) => setPaCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full bg-[#0b1222] border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Função / Painel Principal</label>
                  <select
                    value={paFuncao}
                    onChange={(e) => setPaFuncao(e.target.value)}
                    className="w-full bg-[#0b1222] border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500 font-bold"
                  >
                    <option value="repack">Ajudante (Repack)</option>
                    <option value="despejo">Ajudante (Despejo)</option>
                    <option value="empilhador">Operador de Empilhadeira</option>
                    <option value="conferente">Conferente / Validades</option>
                    <option value="quebras">Conferente de Quebras</option>
                    <option value="controle">Assistente / Analista de Controle</option>
                  </select>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-[11px] text-amber-300">
                💡 O colaborador usará sua Matrícula para efetuar o 1º acesso e criará sua própria senha de acesso à plataforma.
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPaModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white uppercase cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPa}
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-2 cursor-pointer shadow-md"
                >
                  {savingPa ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  Pré-Autorizar Acesso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL CRIAR OU EDITAR META OPERACIONAL ── */}
      {showMetaModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#111a30] border border-emerald-500/30 rounded-2xl p-6 max-w-md w-full space-y-5 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase tracking-tight">
                    {isNewMeta ? 'Nova Meta Operacional' : 'Editar Meta Operacional'}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    {isNewMeta ? 'Cadastre um novo indicador de desempenho' : metaForm.nome}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowMetaModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Nome da Meta / Operação *</label>
                <input
                  type="text"
                  value={metaForm.nome}
                  onChange={(e) => setMetaForm({ ...metaForm, nome: e.target.value })}
                  placeholder="Ex: META REPACK - LATA 250ML"
                  className="w-full bg-[#0b1222] border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Tipo de Indicador</label>
                  <input
                    type="text"
                    value={metaForm.indicador}
                    onChange={(e) => setMetaForm({ ...metaForm, indicador: e.target.value })}
                    placeholder="Ex: Produtividade Média"
                    className="w-full bg-[#0b1222] border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Unidade de Medida</label>
                  <input
                    type="text"
                    value={metaForm.unidade}
                    onChange={(e) => setMetaForm({ ...metaForm, unidade: e.target.value })}
                    placeholder="Ex: cx/h, %, min"
                    className="w-full bg-[#0b1222] border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Valor Alvo / Alvo numérico *</label>
                <input
                  type="text"
                  value={metaForm.valor}
                  onChange={(e) => setMetaForm({ ...metaForm, valor: e.target.value })}
                  placeholder="Ex: 85, 99.5, 00:00:43"
                  className="w-full bg-[#0b1222] border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500 font-mono font-bold text-base text-emerald-400"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Descrição detalhada</label>
                <textarea
                  rows={2}
                  value={metaForm.descricao}
                  onChange={(e) => setMetaForm({ ...metaForm, descricao: e.target.value })}
                  placeholder="Descrição ou orientações de aplicação da meta..."
                  className="w-full bg-[#0b1222] border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500 resize-none text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowMetaModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white uppercase cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveMeta}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-2 cursor-pointer shadow-md"
              >
                <Check className="w-4 h-4" />
                Salvar Meta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL MATRIZ DE PERMISSÕES INDIVIDUAL ── */}
      {matrixColab && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#111a30] border border-indigo-500/30 rounded-2xl p-6 max-w-xl w-full space-y-5 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30 font-mono font-bold">
                  {matrixColab.matricula}
                </div>
                <div>
                  <h3 className="text-base font-black uppercase tracking-tight text-white">
                    Permissões de Módulos: {matrixColab.nome}
                  </h3>
                  <p className="text-xs text-indigo-300 font-semibold">
                    Cargo: {matrixColab.cargo} | Credencial: {(matrixColab as any).senha || 'Ambev10'}
                  </p>
                </div>
              </div>
              <button onClick={() => setMatrixColab(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              <p className="text-xs text-slate-400">
                Alterne o acesso individual deste colaborador aos módulos específicos da plataforma:
              </p>

              <div className="grid grid-cols-1 gap-2.5">
                {MODULES_LIST.map(mod => {
                  const activeModules = getColaboradorAccess(matrixColab.matricula);
                  const isAllowed = activeModules.includes(mod.id);

                  return (
                    <div
                      key={mod.id}
                      className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                        isAllowed
                          ? 'bg-emerald-500/10 border-emerald-500/30'
                          : 'bg-slate-900/60 border-slate-800'
                      }`}
                    >
                      <div>
                        <span className="font-bold text-xs text-white block">{mod.label}</span>
                        <span className="text-[10px] text-slate-400">Módulo operacional {mod.id}</span>
                      </div>
                      <button
                        onClick={() => handleToggleModuleAccess(matrixColab.matricula, matrixColab.nome, mod.id)}
                        disabled={savingAcesso === matrixColab.matricula}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all border cursor-pointer flex items-center gap-1.5 ${
                          isAllowed
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700'
                        }`}
                      >
                        {isAllowed ? <Check className="w-3.5 h-3.5" /> : null}
                        {isAllowed ? 'Permitido' : 'Bloqueado'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setMatrixColab(null)}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
