import React, { useState, useEffect, useMemo } from 'react';
import { 
  Lock, 
  ShieldAlert, 
  Truck, 
  Trash2, 
  Copy, 
  Check, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Calendar, 
  FileText, 
  ExternalLink, 
  Folder, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Layers, 
  Eye, 
  FileSpreadsheet, 
  Edit3, 
  Package, 
  ShieldCheck, 
  Award,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { Usuario, Empresa } from '../types';
import { db } from '../firebase';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { safeGetLocalStorage, safeSetLocalStorage } from '../utils/safeLocalStorage';

interface BloqueioProdutoDashboardProps {
  user: Usuario;
  empresa: Empresa | null;
  theme?: 'light' | 'dark';
}

// ── MODELOS DE DADOS ──
export interface PncBloqueioItem {
  id: string;
  dataBloqueioISO: string;
  horaBloqueio?: string;
  sku: string;
  descricao: string;
  embalagem: string;
  lote: string;
  dataValidadeISO: string;
  quantidade: number; // em caixas ou HL
  unidade: 'CX' | 'HL' | 'PALETES' | 'UN';
  motivoBloqueio: string; // 'Desvio de Qualidade' | 'Recall de Fábrica' | 'Validade Crítica' | 'Avaria de Transporte' | 'Sabor/Odor' | 'Lacre Rompido'
  localBloqueio: string; // 'Gaiola PNC' | 'Doca 04 Segregação' | 'Central Dedo 12' | 'Pátio Quarentena'
  seloLacre: string;
  responsavelBloqueio: string;
  status: 'Bloqueado' | 'Em Análise Qualidade' | 'Liberado' | 'Descartado / Destruído';
  parecerTecnico?: string;
  caminhoAnexos?: string;
  criadoEm: string;
}

export interface BlitzPuxadaItem {
  id: string;
  dataBlitzISO: string;
  hora: string;
  placaVeiculo: string;
  tipoVeiculo: 'Toco' | 'Truck' | 'Carreta' | 'VUC' | 'Van';
  rotaId: string;
  motorista: string;
  conferenteAuditor: string;
  totalPaletesInspecionados: number;
  totalCaixasInspecionadas: number;
  statusConformidade: 'Conforme (Aprovado)' | 'Não Conforme (Corrigido)' | 'Reprovado / Reabastecer';
  itensAuditados: {
    paletizacaoPadrao: boolean;
    amarracaoSegura: boolean;
    filmeStretchIntacto: boolean;
    fefoCorreto: boolean;
    ausenciaAvariasOcultas: boolean;
    higieneBau: boolean;
  };
  desviosEncontrados?: string;
  acaoImediata?: string;
  criadoEm: string;
}

export interface BlitzRefugoItem {
  id: string;
  dataBlitzISO: string;
  hora: string;
  setorOrigem: 'Picking' | 'Doca EFC' | 'Descarga EFD' | 'Quebras Armazém' | 'Devolução Rota' | 'Repack';
  produto: string;
  lote?: string;
  tipoMaterial: 'Garrafa Vidro (Cacos)' | 'Lata Alumínio' | 'PET Descartável' | 'Papelão / Filme' | 'Palete Avariado';
  quantidade: number;
  unidade: 'KG' | 'CX' | 'UN' | 'PALETES';
  motivoRefugo: string;
  responsavelTriagem: string;
  destinacaoFinal: 'Despejo / Esgotamento' | 'Prensa Reciclável' | 'Caçamba de Vidro' | 'Devolução Fornecedor';
  status: 'Triado' | 'Prensado' | 'Descartado Conforme POP' | 'Pendente';
  observacoes?: string;
  criadoEm: string;
}

const DEFAULT_NETWORK_PATH = '\\\\SRV-ARZ-GUA01\\Qualidade\\02_Bloqueio_Produtos_PNC_Blitz';

const INITIAL_PNC_DATA: PncBloqueioItem[] = [
  {
    id: 'pnc-001',
    dataBloqueioISO: '2026-08-12',
    horaBloqueio: '09:30',
    sku: '03.111.49.02',
    descricao: 'BRAHMA CHOPP 350ML LATA',
    embalagem: 'LATA 350',
    lote: 'L260810-A',
    dataValidadeISO: '2026-12-15',
    quantidade: 120,
    unidade: 'CX',
    motivoBloqueio: 'Desvio de Qualidade',
    localBloqueio: 'Gaiola PNC Central',
    seloLacre: 'LC-99482',
    responsavelBloqueio: 'Gladson Lisboa dos Santos',
    status: 'Bloqueado',
    parecerTecnico: 'Amostragem retida para teste de pressão e microfuros.',
    criadoEm: '2026-08-12T09:30:00Z'
  },
  {
    id: 'pnc-002',
    dataBloqueioISO: '2026-08-10',
    horaBloqueio: '14:15',
    sku: '02.445.18.01',
    descricao: 'STELLA ARTOIS 330ML LONG NECK',
    embalagem: 'LONG NECK',
    lote: 'L260728-C',
    dataValidadeISO: '2026-11-20',
    quantidade: 45,
    unidade: 'CX',
    motivoBloqueio: 'Lacre Rompido',
    localBloqueio: 'Doca 04 Segregação',
    seloLacre: 'LC-99310',
    responsavelBloqueio: 'Carlos Silva (Qualidade)',
    status: 'Em Análise Qualidade',
    parecerTecnico: 'Conferência visual de integridade de cápsulas.',
    criadoEm: '2026-08-10T14:15:00Z'
  },
  {
    id: 'pnc-003',
    dataBloqueioISO: '2026-08-05',
    horaBloqueio: '11:00',
    sku: '01.320.10.05',
    descricao: 'SKOL PILSNER 600ML RETORNÁVEL',
    embalagem: 'GARRAFA 600ml',
    lote: 'L260615-B',
    dataValidadeISO: '2026-10-30',
    quantidade: 2,
    unidade: 'PALETES',
    motivoBloqueio: 'Avaria de Transporte',
    localBloqueio: 'Pátio Quarentena',
    seloLacre: 'LC-99105',
    responsavelBloqueio: 'Dejean Silva de Oliveira',
    status: 'Descartado / Destruído',
    parecerTecnico: 'Descarte e despejo autorizado pela supervisão técnica.',
    criadoEm: '2026-08-05T11:00:00Z'
  }
];

const INITIAL_BLITZ_PUXADA: BlitzPuxadaItem[] = [
  {
    id: 'blitz-pux-001',
    dataBlitzISO: '2026-08-16',
    hora: '05:45',
    placaVeiculo: 'NPZ-4412',
    tipoVeiculo: 'Truck',
    rotaId: 'Rota 104 - Guarabira Centro',
    motorista: 'Severino Ramos',
    conferenteAuditor: 'Gladson Lisboa dos Santos',
    totalPaletesInspecionados: 12,
    totalCaixasInspecionadas: 540,
    statusConformidade: 'Conforme (Aprovado)',
    itensAuditados: {
      paletizacaoPadrao: true,
      amarracaoSegura: true,
      filmeStretchIntacto: true,
      fefoCorreto: true,
      ausenciaAvariasOcultas: true,
      higieneBau: true
    },
    desviosEncontrados: 'Nenhum desvio detectado. Veículo liberado para rota no horário DPO.',
    acaoImediata: 'Liberação de saída com carimbo de qualidade.',
    criadoEm: '2026-08-16T05:45:00Z'
  },
  {
    id: 'blitz-pux-002',
    dataBlitzISO: '2026-08-15',
    hora: '06:10',
    placaVeiculo: 'OFB-8891',
    tipoVeiculo: 'Toco',
    rotaId: 'Rota 108 - Solânea / Bananeiras',
    motorista: 'José Roberto Lima',
    conferenteAuditor: 'Carlos Silva (Qualidade)',
    totalPaletesInspecionados: 8,
    totalCaixasInspecionadas: 320,
    statusConformidade: 'Não Conforme (Corrigido)',
    itensAuditados: {
      paletizacaoPadrao: true,
      amarracaoSegura: false,
      filmeStretchIntacto: true,
      fefoCorreto: true,
      ausenciaAvariasOcultas: true,
      higieneBau: true
    },
    desviosEncontrados: 'Cinta de amarração frouxa no último palete da caçamba.',
    acaoImediata: 'Reamarração imediata antes da liberação do gate.',
    criadoEm: '2026-08-15T06:10:00Z'
  }
];

const INITIAL_BLITZ_REFUGO: BlitzRefugoItem[] = [
  {
    id: 'blitz-ref-001',
    dataBlitzISO: '2026-08-16',
    hora: '10:30',
    setorOrigem: 'Picking',
    produto: 'Garrafas Avariadas 600ml / Long Neck',
    lote: 'Triagem Diária',
    tipoMaterial: 'Garrafa Vidro (Cacos)',
    quantidade: 85,
    unidade: 'KG',
    motivoRefugo: 'Quebra de manuseio / Garrafas trincadas na separação',
    responsavelTriagem: 'Ozenildo Sousa Silva',
    destinacaoFinal: 'Caçamba de Vidro',
    status: 'Descartado Conforme POP',
    observacoes: 'Material pesado e descartado na caçamba de reciclagem de vidro.',
    criadoEm: '2026-08-16T10:30:00Z'
  },
  {
    id: 'blitz-ref-002',
    dataBlitzISO: '2026-08-14',
    hora: '15:20',
    setorOrigem: 'Repack',
    produto: 'Latas Furadas / Amassadas 350ml / 269ml',
    lote: 'L260810',
    tipoMaterial: 'Lata Alumínio',
    quantidade: 34,
    unidade: 'CX',
    motivoRefugo: 'Latas furadas triadas durante o processo de Repack',
    responsavelTriagem: 'Gladson Lisboa dos Santos',
    destinacaoFinal: 'Despejo / Esgotamento',
    status: 'Descartado Conforme POP',
    observacoes: 'Líquido esgotado para o dreno de descarte e latas direcionadas à prensa.',
    criadoEm: '2026-08-14T15:20:00Z'
  }
];

export default function BloqueioProdutoDashboard({ user, empresa, theme = 'dark' }: BloqueioProdutoDashboardProps) {
  const empresaId = empresa?.id || 'demo';
  const isLight = theme === 'light';

  const [activeTab, setActiveTab] = useState<'pnc' | 'blitz_puxada' | 'blitz_refugo'>('pnc');
  const [networkPath, setNetworkPath] = useState<string>(() => {
    return localStorage.getItem(`network_file_manager_path_${empresaId}`) || DEFAULT_NETWORK_PATH;
  });
  const [isEditingPath, setIsEditingPath] = useState<boolean>(false);
  const [copiedPathToast, setCopiedPathToast] = useState<boolean>(false);

  // PNC state
  const [pncList, setPncList] = useState<PncBloqueioItem[]>(() => {
    const saved = safeGetLocalStorage(`pnc_bloqueios_${empresaId}`, INITIAL_PNC_DATA);
    return Array.isArray(saved) && saved.length > 0 ? saved : INITIAL_PNC_DATA;
  });
  const [showPncModal, setShowPncModal] = useState<boolean>(false);
  const [pncFilterStatus, setPncFilterStatus] = useState<string>('todos');
  const [pncSearch, setPncSearch] = useState<string>('');

  // Blitz Puxada state
  const [blitzPuxadaList, setBlitzPuxadaList] = useState<BlitzPuxadaItem[]>(() => {
    const saved = safeGetLocalStorage(`blitz_puxada_${empresaId}`, INITIAL_BLITZ_PUXADA);
    return Array.isArray(saved) && saved.length > 0 ? saved : INITIAL_BLITZ_PUXADA;
  });
  const [showPuxadaModal, setShowPuxadaModal] = useState<boolean>(false);
  const [puxadaSearch, setPuxadaSearch] = useState<string>('');

  // Blitz Refugo state
  const [blitzRefugoList, setBlitzRefugoList] = useState<BlitzRefugoItem[]>(() => {
    const saved = safeGetLocalStorage(`blitz_refugo_${empresaId}`, INITIAL_BLITZ_REFUGO);
    return Array.isArray(saved) && saved.length > 0 ? saved : INITIAL_BLITZ_REFUGO;
  });
  const [showRefugoModal, setShowRefugoModal] = useState<boolean>(false);
  const [refugoSearch, setRefugoSearch] = useState<string>('');

  // Form states for PNC
  const [formPnc, setFormPnc] = useState<Partial<PncBloqueioItem>>({
    dataBloqueioISO: new Date().toISOString().split('T')[0],
    horaBloqueio: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    sku: '',
    descricao: '',
    embalagem: 'LATA 350',
    lote: '',
    dataValidadeISO: '',
    quantidade: 10,
    unidade: 'CX',
    motivoBloqueio: 'Desvio de Qualidade',
    localBloqueio: 'Gaiola PNC Central',
    seloLacre: '',
    status: 'Bloqueado',
    parecerTecnico: ''
  });

  // Form states for Blitz Puxada
  const [formPuxada, setFormPuxada] = useState<Partial<BlitzPuxadaItem>>({
    dataBlitzISO: new Date().toISOString().split('T')[0],
    hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    placaVeiculo: '',
    tipoVeiculo: 'Truck',
    rotaId: '',
    motorista: '',
    conferenteAuditor: user.nome || '',
    totalPaletesInspecionados: 10,
    totalCaixasInspecionadas: 400,
    statusConformidade: 'Conforme (Aprovado)',
    itensAuditados: {
      paletizacaoPadrao: true,
      amarracaoSegura: true,
      filmeStretchIntacto: true,
      fefoCorreto: true,
      ausenciaAvariasOcultas: true,
      higieneBau: true
    },
    desviosEncontrados: '',
    acaoImediata: ''
  });

  // Form states for Blitz Refugo
  const [formRefugo, setFormRefugo] = useState<Partial<BlitzRefugoItem>>({
    dataBlitzISO: new Date().toISOString().split('T')[0],
    hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    setorOrigem: 'Picking',
    produto: '',
    lote: '',
    tipoMaterial: 'Garrafa Vidro (Cacos)',
    quantidade: 10,
    unidade: 'KG',
    motivoRefugo: '',
    responsavelTriagem: user.nome || '',
    destinacaoFinal: 'Caçamba de Vidro',
    status: 'Descartado Conforme POP',
    observacoes: ''
  });

  // Persist Network Path
  const handleSaveNetworkPath = () => {
    safeSetLocalStorage(`network_file_manager_path_${empresaId}`, networkPath);
    setIsEditingPath(false);
  };

  const handleCopyNetworkPath = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(networkPath);
      setCopiedPathToast(true);
      setTimeout(() => setCopiedPathToast(false), 3000);
    } else {
      // fallback
      const textArea = document.createElement('textarea');
      textArea.value = networkPath;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedPathToast(true);
      setTimeout(() => setCopiedPathToast(false), 3000);
    }
  };

  // Add PNC
  const handleAddPnc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPnc.descricao || !formPnc.sku) {
      alert('Por favor informe o SKU e a Descrição do Produto.');
      return;
    }
    const newItem: PncBloqueioItem = {
      id: `pnc-${Date.now()}`,
      dataBloqueioISO: formPnc.dataBloqueioISO || new Date().toISOString().split('T')[0],
      horaBloqueio: formPnc.horaBloqueio || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      sku: formPnc.sku || '',
      descricao: formPnc.descricao || '',
      embalagem: formPnc.embalagem || 'LATA 350',
      lote: formPnc.lote || 'N/A',
      dataValidadeISO: formPnc.dataValidadeISO || new Date().toISOString().split('T')[0],
      quantidade: Number(formPnc.quantidade) || 1,
      unidade: formPnc.unidade || 'CX',
      motivoBloqueio: formPnc.motivoBloqueio || 'Desvio de Qualidade',
      localBloqueio: formPnc.localBloqueio || 'Gaiola PNC Central',
      seloLacre: formPnc.seloLacre || `LC-${Math.floor(10000 + Math.random() * 90000)}`,
      responsavelBloqueio: user.nome || 'Responsável Qualidade',
      status: formPnc.status || 'Bloqueado',
      parecerTecnico: formPnc.parecerTecnico || 'Registro efetuado no sistema de bloqueio DPO.',
      criadoEm: new Date().toISOString()
    };

    const updated = [newItem, ...pncList];
    setPncList(updated);
    safeSetLocalStorage(`pnc_bloqueios_${empresaId}`, updated);
    setShowPncModal(false);
  };

  const handleUpdatePncStatus = (id: string, newStatus: PncBloqueioItem['status']) => {
    const updated = pncList.map(item => item.id === id ? { ...item, status: newStatus } : item);
    setPncList(updated);
    safeSetLocalStorage(`pnc_bloqueios_${empresaId}`, updated);
  };

  const handleDeletePnc = (id: string) => {
    if (confirm('Deseja realmente remover este registro de bloqueio PNC?')) {
      const updated = pncList.filter(item => item.id !== id);
      setPncList(updated);
      safeSetLocalStorage(`pnc_bloqueios_${empresaId}`, updated);
    }
  };

  // Add Blitz Puxada
  const handleAddBlitzPuxada = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPuxada.placaVeiculo || !formPuxada.rotaId) {
      alert('Por favor informe a Placa e a Rota do Veículo.');
      return;
    }
    const newItem: BlitzPuxadaItem = {
      id: `blitz-pux-${Date.now()}`,
      dataBlitzISO: formPuxada.dataBlitzISO || new Date().toISOString().split('T')[0],
      hora: formPuxada.hora || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      placaVeiculo: formPuxada.placaVeiculo.toUpperCase(),
      tipoVeiculo: formPuxada.tipoVeiculo || 'Truck',
      rotaId: formPuxada.rotaId,
      motorista: formPuxada.motorista || 'Motorista Não Informado',
      conferenteAuditor: user.nome || formPuxada.conferenteAuditor || 'Auditor Qualidade',
      totalPaletesInspecionados: Number(formPuxada.totalPaletesInspecionados) || 1,
      totalCaixasInspecionadas: Number(formPuxada.totalCaixasInspecionadas) || 10,
      statusConformidade: formPuxada.statusConformidade || 'Conforme (Aprovado)',
      itensAuditados: formPuxada.itensAuditados || {
        paletizacaoPadrao: true,
        amarracaoSegura: true,
        filmeStretchIntacto: true,
        fefoCorreto: true,
        ausenciaAvariasOcultas: true,
        higieneBau: true
      },
      desviosEncontrados: formPuxada.desviosEncontrados || 'Inspeção 100% conforme padrões DPO.',
      acaoImediata: formPuxada.acaoImediata || 'Veículo liberado para rota.',
      criadoEm: new Date().toISOString()
    };

    const updated = [newItem, ...blitzPuxadaList];
    setBlitzPuxadaList(updated);
    safeSetLocalStorage(`blitz_puxada_${empresaId}`, updated);
    setShowPuxadaModal(false);
  };

  const handleDeleteBlitzPuxada = (id: string) => {
    if (confirm('Deseja excluir esta auditoria de Blitz de Puxada?')) {
      const updated = blitzPuxadaList.filter(item => item.id !== id);
      setBlitzPuxadaList(updated);
      safeSetLocalStorage(`blitz_puxada_${empresaId}`, updated);
    }
  };

  // Add Blitz Refugo
  const handleAddBlitzRefugo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRefugo.produto) {
      alert('Por favor informe a Descrição do Material / Refugo.');
      return;
    }
    const newItem: BlitzRefugoItem = {
      id: `blitz-ref-${Date.now()}`,
      dataBlitzISO: formRefugo.dataBlitzISO || new Date().toISOString().split('T')[0],
      hora: formRefugo.hora || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      setorOrigem: formRefugo.setorOrigem || 'Picking',
      produto: formRefugo.produto,
      lote: formRefugo.lote || 'Triagem Local',
      tipoMaterial: formRefugo.tipoMaterial || 'Garrafa Vidro (Cacos)',
      quantidade: Number(formRefugo.quantidade) || 1,
      unidade: formRefugo.unidade || 'KG',
      motivoRefugo: formRefugo.motivoRefugo || 'Avaria identificada durante operação',
      responsavelTriagem: user.nome || formRefugo.responsavelTriagem || 'Operador Responsável',
      destinacaoFinal: formRefugo.destinacaoFinal || 'Caçamba de Vidro',
      status: formRefugo.status || 'Descartado Conforme POP',
      observacoes: formRefugo.observacoes || 'Processo registrado conforme padrão 5S e meio ambiente.',
      criadoEm: new Date().toISOString()
    };

    const updated = [newItem, ...blitzRefugoList];
    setBlitzRefugoList(updated);
    safeSetLocalStorage(`blitz_refugo_${empresaId}`, updated);
    setShowRefugoModal(false);
  };

  const handleDeleteBlitzRefugo = (id: string) => {
    if (confirm('Deseja excluir este registro de Blitz de Refugo?')) {
      const updated = blitzRefugoList.filter(item => item.id !== id);
      setBlitzRefugoList(updated);
      safeSetLocalStorage(`blitz_refugo_${empresaId}`, updated);
    }
  };

  // KPI Calculations
  const totalPncBloqueados = pncList.filter(p => p.status === 'Bloqueado').length;
  const totalPncEmAnalise = pncList.filter(p => p.status === 'Em Análise Qualidade').length;
  const totalPncLiberados = pncList.filter(p => p.status === 'Liberado').length;
  const totalPncDescartados = pncList.filter(p => p.status === 'Descartado / Destruído').length;

  const totalBlitzPuxadaRealizadas = blitzPuxadaList.length;
  const conformesPuxadaCount = blitzPuxadaList.filter(b => b.statusConformidade === 'Conforme (Aprovado)').length;
  const indiceAprovacaoPuxada = totalBlitzPuxadaRealizadas > 0 
    ? Math.round((conformesPuxadaCount / totalBlitzPuxadaRealizadas) * 100) 
    : 100;

  const totalKgRefugoTriado = blitzRefugoList
    .filter(r => r.unidade === 'KG')
    .reduce((sum, r) => sum + r.quantidade, 0);

  // Filtered lists
  const filteredPncList = useMemo(() => {
    return pncList.filter(item => {
      const matchStatus = pncFilterStatus === 'todos' || item.status === pncFilterStatus;
      const matchSearch = !pncSearch || 
        item.descricao.toLowerCase().includes(pncSearch.toLowerCase()) ||
        item.sku.toLowerCase().includes(pncSearch.toLowerCase()) ||
        item.lote.toLowerCase().includes(pncSearch.toLowerCase()) ||
        item.seloLacre.toLowerCase().includes(pncSearch.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [pncList, pncFilterStatus, pncSearch]);

  const filteredBlitzPuxadaList = useMemo(() => {
    return blitzPuxadaList.filter(item => {
      return !puxadaSearch || 
        item.placaVeiculo.toLowerCase().includes(puxadaSearch.toLowerCase()) ||
        item.rotaId.toLowerCase().includes(puxadaSearch.toLowerCase()) ||
        item.motorista.toLowerCase().includes(puxadaSearch.toLowerCase()) ||
        item.conferenteAuditor.toLowerCase().includes(puxadaSearch.toLowerCase());
    });
  }, [blitzPuxadaList, puxadaSearch]);

  const filteredBlitzRefugoList = useMemo(() => {
    return blitzRefugoList.filter(item => {
      return !refugoSearch || 
        item.produto.toLowerCase().includes(refugoSearch.toLowerCase()) ||
        item.setorOrigem.toLowerCase().includes(refugoSearch.toLowerCase()) ||
        item.tipoMaterial.toLowerCase().includes(refugoSearch.toLowerCase());
    });
  }, [blitzRefugoList, refugoSearch]);

  return (
    <div className={`p-4 sm:p-6 space-y-6 max-w-7xl mx-auto min-w-0 ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
      
      {/* ── HEADER BANNER ── */}
      <div className={`p-5 rounded-2xl border shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 ${
        isLight ? 'bg-white border-slate-200' : 'bg-gradient-to-r from-[#111827] via-[#1a2234] to-[#0f172a] border-slate-700/80'
      }`}>
        <div className="flex items-center gap-3.5">
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 shrink-0 shadow-inner">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider">
                DPO Bloco 2 — Qualidade & Governança
              </span>
              <span className="bg-slate-800 text-slate-300 text-[10px] font-mono px-2 py-0.5 rounded-full">
                SLA Falha de Bloqueio: 0%
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight mt-1 text-white flex items-center gap-2">
              Dashboard de Bloqueio de Produto
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Gestão integrada de PNC (Produtos Não Conformes), Blitz de Puxada para Rotas e Blitz de Refugo.
            </p>
          </div>
        </div>

        {/* TOP SUMMARY MINI CARDS */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full lg:w-auto">
          <div className="bg-[#0b1222]/90 border border-rose-500/30 p-2.5 px-3.5 rounded-xl text-center">
            <span className="text-[9px] font-black text-rose-400 uppercase block">PNC Ativos</span>
            <span className="text-lg font-black font-mono text-rose-300">{totalPncBloqueados + totalPncEmAnalise}</span>
          </div>
          <div className="bg-[#0b1222]/90 border border-sky-500/30 p-2.5 px-3.5 rounded-xl text-center">
            <span className="text-[9px] font-black text-sky-400 uppercase block">Blitz Puxada</span>
            <span className="text-lg font-black font-mono text-sky-300">{indiceAprovacaoPuxada}% <span className="text-[9px] font-normal text-slate-400">ok</span></span>
          </div>
          <div className="bg-[#0b1222]/90 border border-amber-500/30 p-2.5 px-3.5 rounded-xl text-center">
            <span className="text-[9px] font-black text-amber-400 uppercase block">Refugo Triado</span>
            <span className="text-lg font-black font-mono text-amber-300">{totalKgRefugoTriado} <span className="text-[9px] font-normal text-slate-400">kg</span></span>
          </div>
        </div>
      </div>

      {/* ── SEÇÃO: GERENCIADOR DE ARQUIVOS (CAMINHO DA REDE OFICIAL) ── */}
      <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
        isLight ? 'bg-slate-50 border-blue-200' : 'bg-gradient-to-r from-[#0d1628] to-[#121e36] border-blue-500/30'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400 shrink-0">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  Gerenciador de Arquivos & Evidências
                </h3>
                <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                  Pasta Compartilhada da Unidade
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Caminho da rede oficial para arquivamento de laudos, fotos de lacres, registros de destruição e relatórios de Blitz.
              </p>
            </div>
          </div>

          {/* EDIT BUTTON */}
          <div className="flex items-center gap-2 shrink-0">
            {isEditingPath ? (
              <button
                onClick={handleSaveNetworkPath}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Check className="w-4 h-4" /> Salvar Caminho
              </button>
            ) : (
              <button
                onClick={() => setIsEditingPath(true)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer border border-slate-700"
              >
                <Edit3 className="w-3.5 h-3.5" /> Editar Pasta
              </button>
            )}
          </div>
        </div>

        {/* COPY PATH BOX */}
        <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex-1 relative">
            {isEditingPath ? (
              <input
                type="text"
                value={networkPath}
                onChange={e => setNetworkPath(e.target.value)}
                className="w-full bg-[#080d1a] border border-blue-400 text-blue-200 font-mono text-xs p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: \\SRV-ARZ-GUA01\Qualidade\02_Bloqueio_Produtos_PNC_Blitz"
              />
            ) : (
              <div 
                onClick={handleCopyNetworkPath}
                className="w-full bg-[#080d1a] border border-slate-800 hover:border-blue-500/60 text-blue-300 font-mono text-xs p-2.5 rounded-xl cursor-pointer flex items-center justify-between gap-3 group transition-all"
                title="Clique para copiar o caminho da pasta de rede"
              >
                <span className="truncate select-all">{networkPath}</span>
                <span className="text-[10px] text-slate-400 group-hover:text-blue-400 flex items-center gap-1 shrink-0 uppercase font-sans font-bold">
                  <Copy className="w-3.5 h-3.5" /> Copiar
                </span>
              </div>
            )}
          </div>

          <button
            onClick={handleCopyNetworkPath}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer shrink-0"
          >
            {copiedPathToast ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Caminho Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copiar Caminho</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── NAVIGATION TABS (PNC, BLITZ PUXADA, BLITZ REFUGO) ── */}
      <div className="flex items-center gap-2 bg-[#111827] border border-slate-800 p-1.5 rounded-2xl overflow-x-auto shadow-sm">
        <button
          onClick={() => setActiveTab('pnc')}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'pnc'
              ? 'bg-rose-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>1. Guia de PNC (Produtos Não Conformes)</span>
          <span className="ml-1 px-2 py-0.5 text-[10px] rounded-full bg-rose-950/80 border border-rose-500/40 text-rose-300">
            {pncList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('blitz_puxada')}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'blitz_puxada'
              ? 'bg-sky-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Truck className="w-4 h-4 shrink-0" />
          <span>2. Guia de Blitz de Puxada (Rotas)</span>
          <span className="ml-1 px-2 py-0.5 text-[10px] rounded-full bg-sky-950/80 border border-sky-500/40 text-sky-300">
            {blitzPuxadaList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('blitz_refugo')}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'blitz_refugo'
              ? 'bg-amber-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Trash2 className="w-4 h-4 shrink-0" />
          <span>3. Guia de Blitz de Refugo & Triagem</span>
          <span className="ml-1 px-2 py-0.5 text-[10px] rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-300">
            {blitzRefugoList.length}
          </span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          TAB 1: GUIA DE PNC (PRODUTOS NÃO CONFORMES)
      ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'pnc' && (
        <div className="space-y-4">
          
          {/* ACTION & FILTER BAR */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#111827] border border-slate-800 p-3.5 rounded-2xl">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filtrar por SKU, Descrição, Lote, Selo..."
                  value={pncSearch}
                  onChange={e => setPncSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#0a0f1d] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-rose-500 outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={pncFilterStatus}
                  onChange={e => setPncFilterStatus(e.target.value)}
                  className="bg-[#0a0f1d] border border-slate-800 text-xs font-bold text-slate-200 px-3 py-2 rounded-xl outline-none"
                >
                  <option value="todos">Todos os Status</option>
                  <option value="Bloqueado">Bloqueado</option>
                  <option value="Em Análise Qualidade">Em Análise Qualidade</option>
                  <option value="Liberado">Liberado</option>
                  <option value="Descartado / Destruído">Descartado / Destruído</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => setShowPncModal(true)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Bloqueio PNC</span>
            </button>
          </div>

          {/* TABELA DE REGISTROS PNC */}
          <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#090d16] text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Data / Hora</th>
                    <th className="p-3.5">SKU & Produto</th>
                    <th className="p-3.5">Embalagem / Lote</th>
                    <th className="p-3.5">Quantidade</th>
                    <th className="p-3.5">Motivo do Bloqueio</th>
                    <th className="p-3.5">Localização / Lacre</th>
                    <th className="p-3.5">Responsável</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {filteredPncList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-500 font-medium">
                        Nenhum produto não conforme (PNC) encontrado com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredPncList.map(item => (
                      <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5 whitespace-nowrap">
                          <span className="font-bold text-slate-200 block">{item.dataBloqueioISO}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{item.horaBloqueio || '—'}</span>
                        </td>
                        <td className="p-3.5">
                          <span className="font-black text-white block">{item.descricao}</span>
                          <span className="text-[10px] text-indigo-400 font-mono">SKU: {item.sku}</span>
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] font-bold text-slate-300 block w-fit">
                            {item.embalagem}
                          </span>
                          <span className="text-[10px] text-amber-400 font-mono mt-0.5 block">Lote: {item.lote}</span>
                        </td>
                        <td className="p-3.5 whitespace-nowrap font-mono font-black text-rose-300">
                          {item.quantidade} <span className="text-[10px] font-normal text-slate-400">{item.unidade}</span>
                        </td>
                        <td className="p-3.5">
                          <span className="font-bold text-slate-300 block">{item.motivoBloqueio}</span>
                          {item.parecerTecnico && (
                            <span className="text-[10px] text-slate-400 block mt-0.5 italic max-w-xs truncate" title={item.parecerTecnico}>
                              {item.parecerTecnico}
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <span className="text-slate-300 font-semibold block">{item.localBloqueio}</span>
                          <span className="text-[10px] text-slate-400 font-mono">Lacre: {item.seloLacre}</span>
                        </td>
                        <td className="p-3.5 whitespace-nowrap text-slate-300 font-medium">
                          {item.responsavelBloqueio}
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <select
                            value={item.status}
                            onChange={e => handleUpdatePncStatus(item.id, e.target.value as any)}
                            className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border cursor-pointer outline-none ${
                              item.status === 'Bloqueado'
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                : item.status === 'Em Análise Qualidade'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : item.status === 'Liberado'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            <option value="Bloqueado">Bloqueado</option>
                            <option value="Em Análise Qualidade">Em Análise Qualidade</option>
                            <option value="Liberado">Liberado</option>
                            <option value="Descartado / Destruído">Descartado / Destruído</option>
                          </select>
                        </td>
                        <td className="p-3.5 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleDeletePnc(item.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                            title="Excluir Registro PNC"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          TAB 2: GUIA DE BLITZ DE PUXADA (ROTAS)
      ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'blitz_puxada' && (
        <div className="space-y-4">
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#111827] border border-slate-800 p-3.5 rounded-2xl">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrar por Placa, Rota, Motorista ou Auditor..."
                value={puxadaSearch}
                onChange={e => setPuxadaSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#0a0f1d] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-sky-500 outline-none"
              />
            </div>

            <button
              onClick={() => setShowPuxadaModal(true)}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Blitz de Puxada</span>
            </button>
          </div>

          {/* TABELA BLITZ DE PUXADA */}
          <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#090d16] text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Data / Hora</th>
                    <th className="p-3.5">Veículo / Rota</th>
                    <th className="p-3.5">Motorista & Auditor</th>
                    <th className="p-3.5">Volume Auditado</th>
                    <th className="p-3.5">Checklist de Puxada</th>
                    <th className="p-3.5">Status & Desvios</th>
                    <th className="p-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {filteredBlitzPuxadaList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500 font-medium">
                        Nenhuma Blitz de Puxada registrada.
                      </td>
                    </tr>
                  ) : (
                    filteredBlitzPuxadaList.map(item => (
                      <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5 whitespace-nowrap">
                          <span className="font-bold text-slate-200 block">{item.dataBlitzISO}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{item.hora}</span>
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <span className="font-black text-white text-sm block font-mono">{item.placaVeiculo}</span>
                          <span className="text-[10px] text-sky-400 font-semibold">{item.tipoVeiculo} • {item.rotaId}</span>
                        </td>
                        <td className="p-3.5">
                          <span className="font-bold text-slate-300 block">Condutor: {item.motorista}</span>
                          <span className="text-[10px] text-slate-400 block">Auditor: {item.conferenteAuditor}</span>
                        </td>
                        <td className="p-3.5 whitespace-nowrap font-mono">
                          <span className="font-bold text-white block">{item.totalPaletesInspecionados} PL</span>
                          <span className="text-[10px] text-slate-400">{item.totalCaixasInspecionadas} CX</span>
                        </td>
                        <td className="p-3.5">
                          <div className="grid grid-cols-3 gap-1 text-[9px] font-bold">
                            <span className={item.itensAuditados.paletizacaoPadrao ? 'text-emerald-400' : 'text-rose-400'}>
                              {item.itensAuditados.paletizacaoPadrao ? '✓ Paletização' : '✗ Paletização'}
                            </span>
                            <span className={item.itensAuditados.amarracaoSegura ? 'text-emerald-400' : 'text-rose-400'}>
                              {item.itensAuditados.amarracaoSegura ? '✓ Amarração' : '✗ Amarração'}
                            </span>
                            <span className={item.itensAuditados.filmeStretchIntacto ? 'text-emerald-400' : 'text-rose-400'}>
                              {item.itensAuditados.filmeStretchIntacto ? '✓ Stretch' : '✗ Stretch'}
                            </span>
                            <span className={item.itensAuditados.fefoCorreto ? 'text-emerald-400' : 'text-rose-400'}>
                              {item.itensAuditados.fefoCorreto ? '✓ FEFO' : '✗ FEFO'}
                            </span>
                            <span className={item.itensAuditados.ausenciaAvariasOcultas ? 'text-emerald-400' : 'text-rose-400'}>
                              {item.itensAuditados.ausenciaAvariasOcultas ? '✓ Sem Avarias' : '✗ Avarias'}
                            </span>
                            <span className={item.itensAuditados.higieneBau ? 'text-emerald-400' : 'text-rose-400'}>
                              {item.itensAuditados.higieneBau ? '✓ Higiene Baú' : '✗ Higiene'}
                            </span>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                            item.statusConformidade === 'Conforme (Aprovado)'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : item.statusConformidade === 'Não Conforme (Corrigido)'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          }`}>
                            {item.statusConformidade}
                          </span>
                          {item.desviosEncontrados && (
                            <span className="text-[10px] text-slate-400 block mt-1 leading-tight">
                              {item.desviosEncontrados}
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleDeleteBlitzPuxada(item.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                            title="Excluir Auditoria de Puxada"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          TAB 3: GUIA DE BLITZ DE REFUGO & TRIAGEM
      ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'blitz_refugo' && (
        <div className="space-y-4">
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#111827] border border-slate-800 p-3.5 rounded-2xl">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrar por Produto, Setor de Origem ou Tipo de Material..."
                value={refugoSearch}
                onChange={e => setRefugoSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#0a0f1d] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-amber-500 outline-none"
              />
            </div>

            <button
              onClick={() => setShowRefugoModal(true)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Registro de Refugo</span>
            </button>
          </div>

          {/* TABELA BLITZ DE REFUGO */}
          <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#090d16] text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Data / Hora</th>
                    <th className="p-3.5">Setor de Origem</th>
                    <th className="p-3.5">Material & Produto</th>
                    <th className="p-3.5">Quantidade</th>
                    <th className="p-3.5">Motivo do Refugo</th>
                    <th className="p-3.5">Destinação Final</th>
                    <th className="p-3.5">Responsável Triagem</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {filteredBlitzRefugoList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-500 font-medium">
                        Nenhum registro de refugo encontrado.
                      </td>
                    </tr>
                  ) : (
                    filteredBlitzRefugoList.map(item => (
                      <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5 whitespace-nowrap">
                          <span className="font-bold text-slate-200 block">{item.dataBlitzISO}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{item.hora}</span>
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <span className="bg-slate-800 px-2.5 py-1 rounded-lg text-xs font-bold text-amber-400">
                            {item.setorOrigem}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className="font-black text-white block">{item.produto}</span>
                          <span className="text-[10px] text-slate-400 font-semibold">{item.tipoMaterial}</span>
                        </td>
                        <td className="p-3.5 whitespace-nowrap font-mono font-black text-amber-300">
                          {item.quantidade} <span className="text-[10px] font-normal text-slate-400">{item.unidade}</span>
                        </td>
                        <td className="p-3.5">
                          <span className="text-slate-300 font-medium block">{item.motivoRefugo}</span>
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <span className="bg-slate-800/80 px-2 py-0.5 rounded text-[10px] font-bold text-sky-300">
                            {item.destinacaoFinal}
                          </span>
                        </td>
                        <td className="p-3.5 whitespace-nowrap text-slate-300 font-medium">
                          {item.responsavelTriagem}
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {item.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleDeleteBlitzRefugo(item.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                            title="Excluir Registro de Refugo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL: NOVO BLOQUEIO PNC
      ───────────────────────────────────────────────────────────────────────────── */}
      {showPncModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl p-5 text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-black uppercase text-rose-400 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5" /> Cadastrar Bloqueio PNC (Não Conforme)
              </h2>
              <button onClick={() => setShowPncModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddPnc} className="space-y-3 text-xs font-sans">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">SKU do Produto *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 03.111.49.02"
                    value={formPnc.sku}
                    onChange={e => setFormPnc({ ...formPnc, sku: e.target.value })}
                    className="w-full bg-[#090d16] border border-slate-700 p-2 rounded-xl text-white outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Descrição do Produto *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: BRAHMA CHOPP 350ML LATA"
                    value={formPnc.descricao}
                    onChange={e => setFormPnc({ ...formPnc, descricao: e.target.value })}
                    className="w-full bg-[#090d16] border border-slate-700 p-2 rounded-xl text-white outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Embalagem</label>
                  <select
                    value={formPnc.embalagem}
                    onChange={e => setFormPnc({ ...formPnc, embalagem: e.target.value })}
                    className="w-full bg-[#090d16] border border-slate-700 p-2 rounded-xl text-white outline-none"
                  >
                    <option value="LATA 350">LATA 350</option>
                    <option value="LATA 269">LATA 269</option>
                    <option value="LATA 473">LATA 473</option>
                    <option value="LONG NECK">LONG NECK</option>
                    <option value="GARRAFA 600ml">GARRAFA 600ml</option>
                    <option value="GARRAFA 1L">GARRAFA 1L</option>
                    <option value="PET 2L">PET 2L</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Lote</label>
                  <input
                    type="text"
                    placeholder="Ex: L260810-A"
                    value={formPnc.lote}
                    onChange={e => setFormPnc({ ...formPnc, lote: e.target.value })}
                    className="w-full bg-[#090d16] border border-slate-700 p-2 rounded-xl text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Data Validade</label>
                  <input
                    type="date"
                    value={formPnc.dataValidadeISO}
                    onChange={e => setFormPnc({ ...formPnc, dataValidadeISO: e.target.value })}
                    className="w-full bg-[#090d16] border border-slate-700 p-2 rounded-xl text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Quantidade</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={1}
                      value={formPnc.quantidade}
                      onChange={e => setFormPnc({ ...formPnc, quantidade: Number(e.target.value) })}
                      className="w-2/3 bg-[#090d16] border border-slate-700 p-2 rounded-xl text-white outline-none"
                    />
                    <select
                      value={formPnc.unidade}
                      onChange={e => setFormPnc({ ...formPnc, unidade: e.target.value as any })}
                      className="w-1/3 bg-[#090d16] border border-slate-700 p-2 rounded-xl text-white outline-none"
                    >
                      <option value="CX">CX</option>
                      <option value="HL">HL</option>
                      <option value="PALETES">PALETES</option>
                      <option value="UN">UN</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Motivo do Bloqueio</label>
                  <select
                    value={formPnc.motivoBloqueio}
                    onChange={e => setFormPnc({ ...formPnc, motivoBloqueio: e.target.value })}
                    className="w-full bg-[#090d16] border border-slate-700 p-2 rounded-xl text-white outline-none"
                  >
                    <option value="Desvio de Qualidade">Desvio de Qualidade</option>
                    <option value="Recall de Fábrica">Recall de Fábrica</option>
                    <option value="Validade Crítica">Validade Crítica</option>
                    <option value="Avaria de Transporte">Avaria de Transporte</option>
                    <option value="Lacre Rompido">Lacre Rompido</option>
                    <option value="Aguardando Análise Laboratorial">Aguardando Análise Laboratorial</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Localização de Bloqueio</label>
                  <input
                    type="text"
                    placeholder="Ex: Gaiola PNC Central"
                    value={formPnc.localBloqueio}
                    onChange={e => setFormPnc({ ...formPnc, localBloqueio: e.target.value })}
                    className="w-full bg-[#090d16] border border-slate-700 p-2 rounded-xl text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Nº Selo / Lacre Físico</label>
                  <input
                    type="text"
                    placeholder="Ex: LC-99482"
                    value={formPnc.seloLacre}
                    onChange={e => setFormPnc({ ...formPnc, seloLacre: e.target.value })}
                    className="w-full bg-[#090d16] border border-slate-700 p-2 rounded-xl text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Parecer Técnico / Observações</label>
                <textarea
                  rows={2}
                  placeholder="Descreva detalhes da não conformidade..."
                  value={formPnc.parecerTecnico}
                  onChange={e => setFormPnc({ ...formPnc, parecerTecnico: e.target.value })}
                  className="w-full bg-[#090d16] border border-slate-700 p-2 rounded-xl text-white outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPncModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black uppercase tracking-wider rounded-xl shadow-lg cursor-pointer"
                >
                  Registrar Bloqueio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL: NOVA BLITZ DE PUXADA
      ───────────────────────────────────────────────────────────────────────────── */}
      {showPuxadaModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl p-5 text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-black uppercase text-sky-400 flex items-center gap-2">
                <Truck className="w-5 h-5" /> Cadastrar Blitz de Puxada (Rotas)
              </h2>
              <button onClick={() => setShowPuxadaModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddBlitzPuxada} className="space-y-3 text-xs font-sans">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Placa do Veículo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: NPZ-4412"
                    value={formPuxada.placaVeiculo}
                    onChange={e => setFormPuxada({ ...formPuxada, placaVeiculo: e.target.value.toUpperCase() })}
                    className="w-full bg-[#090d16] border border-slate-700 p-2 rounded-xl text-white outline-none focus:border-sky-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Tipo de Veículo</label>
                  <select
                    value={formPuxada.tipoVeiculo}
                    onChange={e => setFormPuxada({ ...formPuxada, tipoVeiculo: e.target.value as any })}
                    className="w-full bg-[#090d16] border border-slate-700 p-2 rounded-xl text-white outline-none"
                  >
                    <option value="Truck">Truck</option>
                    <option value="Toco">Toco</option>
                    <option value="Carreta">Carreta</option>
                    <option value="VUC">VUC</option>
                    <option value="Van">Van</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Identificação da Rota *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Rota 104 - Guarabira Centro"
                    value={formPuxada.rotaId}
                    onChange={e => setFormPuxada({ ...formPuxada, rotaId: e.target.value })}
                    className="w-full bg-[#090d16] border border-slate-700 p-2 rounded-xl text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Nome do Motorista</label>
                  <input
                    type="text"
                    placeholder="Ex: Severino Ramos"
                    value={formPuxada.motorista}
                    onChange={e => setFormPuxada({ ...formPuxada, motorista: e.target.value })}
                    className="w-full bg-[#090d16] border border-slate-700 p-2 rounded-xl text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Total Paletes Inspecionados</label>
                  <input
                    type="number"
                    min={1}
                    value={formPuxada.totalPaletesInspecionados}
                    onChange={e => setFormPuxada({ ...formPuxada, totalPaletesInspecionados: Number(e.target.value) })}
                    className="w-full bg-[#090d16] border border-slate-700 p-2 rounded-xl text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Total Caixas</label>
                  <input
                    type="number"
                    min={1}
                    value={formPuxada.totalCaixasInspecionadas}
                    onChange={e => setFormPuxada({ ...formPuxada, totalCaixasInspecionadas: Number(e.target.value) })}
                    className="w-full bg-[#090d16] border border-slate-700 p-2 rounded-xl text-white outline-none"
                  />
                </div>
              </div>

              {/* CHECKLIST BOX */}
              <div className="p-3 bg-[#090d16] border border-slate-800 rounded-xl space-y-2">
                <label className="block text-[10px] font-black uppercase text-sky-400 mb-1">Itens do Checklist de Puxada</label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPuxada.itensAuditados?.paletizacaoPadrao}
                      onChange={e => setFormPuxada({
                        ...formPuxada,
                        itensAuditados: { ...formPuxada.itensAuditados!, paletizacaoPadrao: e.target.checked }
                      })}
                      className="rounded accent-sky-500"
                    />
                    <span>Paletização Padrão Ambev</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPuxada.itensAuditados?.amarracaoSegura}
                      onChange={e => setFormPuxada({
                        ...formPuxada,
                        itensAuditados: { ...formPuxada.itensAuditados!, amarracaoSegura: e.target.checked }
                      })}
                      className="rounded accent-sky-500"
                    />
                    <span>Cintas / Amarração Segura</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPuxada.itensAuditados?.filmeStretchIntacto}
                      onChange={e => setFormPuxada({
                        ...formPuxada,
                        itensAuditados: { ...formPuxada.itensAuditados!, filmeStretchIntacto: e.target.checked }
                      })}
                      className="rounded accent-sky-500"
                    />
                    <span>Filme Stretch Intacto</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPuxada.itensAuditados?.fefoCorreto}
                      onChange={e => setFormPuxada({
                        ...formPuxada,
                        itensAuditados: { ...formPuxada.itensAuditados!, fefoCorreto: e.target.checked }
                      })}
                      className="rounded accent-sky-500"
                    />
                    <span>Validade / FEFO Correto</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPuxada.itensAuditados?.ausenciaAvariasOcultas}
                      onChange={e => setFormPuxada({
                        ...formPuxada,
                        itensAuditados: { ...formPuxada.itensAuditados!, ausenciaAvariasOcultas: e.target.checked }
                      })}
                      className="rounded accent-sky-500"
                    />
                    <span>Ausência de Avarias Ocultas</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPuxada.itensAuditados?.higieneBau}
                      onChange={e => setFormPuxada({
                        ...formPuxada,
                        itensAuditados: { ...formPuxada.itensAuditados!, higieneBau: e.target.checked }
                      })}
                      className="rounded accent-sky-500"
                    />
                    <span>Higiene e Piso do Baú</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Status de Conformidade</label>
                <select
                  value={formPuxada.statusConformidade}
                  onChange={e => setFormPuxada({ ...formPuxada, statusConformidade: e.target.value as any })}
                  className="w-full bg-[#090d16] border border-slate-700 p-2 rounded-xl text-white outline-none"
                >
                  <option value="Conforme (Aprovado)">Conforme (Aprovado)</option>
                  <option value="Não Conforme (Corrigido)">Não Conforme (Corrigido)</option>
                  <option value="Reprovado / Reabastecer">Reprovado / Reabastecer</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Desvios Encontrados / Ação Imediata</label>
                <textarea
                  rows={2}
                  placeholder="Descreva se houve ajuste de amarração, troca de pacote avariado..."
                  value={formPuxada.desviosEncontrados}
                  onChange={e => setFormPuxada({ ...formPuxada, desviosEncontrados: e.target.value })}
                  className="w-full bg-[#090d16] border border-slate-700 p-2 rounded-xl text-white outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPuxadaModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-black uppercase tracking-wider rounded-xl shadow-lg cursor-pointer"
                >
                  Salvar Blitz Puxada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL: NOVO REGISTRO DE REFUGO
      ───────────────────────────────────────────────────────────────────────────── */}
      {showRefugoModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl p-5 text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-black uppercase text-amber-400 flex items-center gap-2">
                <Trash2 className="w-5 h-5" /> Cadastrar Blitz de Refugo & Triagem
              </h2>
              <button onClick={() => setShowRefugoModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddBlitzRefugo} className="space-y-3 text-xs font-sans">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Setor de Origem</label>
                  <select
                    value={formRefugo.setorOrigem}
                    onChange={e => setFormRefugo({ ...formRefugo, setorOrigem: e.target.value as any })}
                    className="w-full bg-[#090d16] border border-slate-700 p-2 rounded-xl text-white outline-none"
                  >
                    <option value="Picking">Picking</option>
                    <option value="Doca EFC">Doca EFC</option>
                    <option value="Descarga EFD">Descarga EFD</option>
                    <option value="Quebras Armazém">Quebras Armazém</option>
                    <option value="Devolução Rota">Devolução Rota</option>
                    <option value="Repack">Repack</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Tipo de Material</label>
                  <select
                    value={formRefugo.tipoMaterial}
                    onChange={e => setFormRefugo({ ...formRefugo, tipoMaterial: e.target.value as any })}
                    className="w-full bg-[#090d16] border border-slate-700 p-2 rounded-xl text-white outline-none"
                  >
                    <option value="Garrafa Vidro (Cacos)">Garrafa Vidro (Cacos)</option>
                    <option value="Lata Alumínio">Lata Alumínio</option>
                    <option value="PET Descartável">PET Descartável</option>
                    <option value="Papelão / Filme">Papelão / Filme</option>
                    <option value="Palete Avariado">Palete Avariado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Descrição do Material / Produto *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Garrafas Avariadas 600ml / Long Neck"
                  value={formRefugo.produto}
                  onChange={e => setFormRefugo({ ...formRefugo, produto: e.target.value })}
                  className="w-full bg-[#090d16] border border-slate-700 p-2 rounded-xl text-white outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Quantidade</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={1}
                      value={formRefugo.quantidade}
                      onChange={e => setFormRefugo({ ...formRefugo, quantidade: Number(e.target.value) })}
                      className="w-2/3 bg-[#090d16] border border-slate-700 p-2 rounded-xl text-white outline-none"
                    />
                    <select
                      value={formRefugo.unidade}
                      onChange={e => setFormRefugo({ ...formRefugo, unidade: e.target.value as any })}
                      className="w-1/3 bg-[#090d16] border border-slate-700 p-2 rounded-xl text-white outline-none"
                    >
                      <option value="KG">KG</option>
                      <option value="CX">CX</option>
                      <option value="UN">UN</option>
                      <option value="PALETES">PALETES</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Destinação Final</label>
                  <select
                    value={formRefugo.destinacaoFinal}
                    onChange={e => setFormRefugo({ ...formRefugo, destinacaoFinal: e.target.value as any })}
                    className="w-full bg-[#090d16] border border-slate-700 p-2 rounded-xl text-white outline-none"
                  >
                    <option value="Caçamba de Vidro">Caçamba de Vidro</option>
                    <option value="Despejo / Esgotamento">Despejo / Esgotamento</option>
                    <option value="Prensa Reciclável">Prensa Reciclável</option>
                    <option value="Devolução Fornecedor">Devolução Fornecedor</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Motivo do Refugo</label>
                <input
                  type="text"
                  placeholder="Ex: Quebra de manuseio na separação"
                  value={formRefugo.motivoRefugo}
                  onChange={e => setFormRefugo({ ...formRefugo, motivoRefugo: e.target.value })}
                  className="w-full bg-[#090d16] border border-slate-700 p-2 rounded-xl text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Observações de Destinação</label>
                <textarea
                  rows={2}
                  placeholder="Descreva detalhes do acondicionamento..."
                  value={formRefugo.observacoes}
                  onChange={e => setFormRefugo({ ...formRefugo, observacoes: e.target.value })}
                  className="w-full bg-[#090d16] border border-slate-700 p-2 rounded-xl text-white outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRefugoModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-black uppercase tracking-wider rounded-xl shadow-lg cursor-pointer"
                >
                  Salvar Refugo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
