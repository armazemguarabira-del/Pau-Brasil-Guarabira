// SOP / POP Process Standardization Service (Requirement 20)

import { DEFAULT_POPS, OperationalModuleKey } from '../components/PadraoOperacionalModal';
import { saveSopToIDB, deleteSopFromIDB, getCachedSopsFromMemory } from './sopStorage';
import { getUserRoleType } from './permissions';
import { Usuario } from '../types';

export function canUserManageSop(user?: Usuario | null): boolean {
  if (!user) return false;
  return getUserRoleType(user) === 'admin';
}

export type SopScope = 'exclusivo' | 'compartilhado' | 'global';

export type SopModule = 
  | 'quebras'
  | 'repack'
  | 'despejo'
  | 'picking'
  | 'gestao_capacidade'
  | 'ressuprimento'
  | 'recebimento'
  | 'armazenagem'
  | 'carregamento'
  | 'efc'
  | 'efd'
  | 'efc_efd'
  | 'ressuprimento_reabastecimento'
  | 'tmr'
  | 'empilhador'
  | 'conferente'
  | 'fefo'
  | 'estoque_x_estoque'
  | 'estoque_x_picking'
  | 'marketplace'
  | 'central'
  | 'contingencia';

export const SOP_MODULES_LIST: { id: SopModule; label: string }[] = [
  { id: 'quebras', label: 'Quebras' },
  { id: 'repack', label: 'Repack' },
  { id: 'despejo', label: 'Despejo' },
  { id: 'picking', label: 'Picking' },
  { id: 'gestao_capacidade', label: 'Gestão de Capacidade' },
  { id: 'ressuprimento', label: 'Ressuprimento' },
  { id: 'efc_efd', label: 'EFC / EFD (Pátio)' },
  { id: 'ressuprimento_reabastecimento', label: 'Ressuprimento & Reabastecimento' },
  { id: 'tmr', label: 'TMR (Revenda)' },
  { id: 'empilhador', label: 'Operação Empilhador' },
  { id: 'conferente', label: 'Conferente / ADM' },
  { id: 'recebimento', label: 'Recebimento' },
  { id: 'armazenagem', label: 'Armazenagem' },
  { id: 'carregamento', label: 'Montagem' },
  { id: 'efc', label: 'EFC' },
  { id: 'efd', label: 'EFD' },
  { id: 'fefo', label: 'FEFO' },
  { id: 'estoque_x_estoque', label: 'Estoque x Estoque' },
  { id: 'estoque_x_picking', label: 'Estoque x Picking' },
  { id: 'marketplace', label: 'Marketplace' },
  { id: 'central', label: 'Central' },
  { id: 'contingencia', label: 'Contingência' },
];

export interface SopAlteracaoHistorico {
  id: string;
  data: string;
  alteracao: string;
  usuario: string;
  revisaoAnterior?: string;
}

export interface SopDocument {
  id: string;
  codigo: string;              // e.g. "POP-RPK-01"
  nome: string;                // e.g. "Padrão de Repack e Triagem"
  objetivo: string;            // Objetivo do padrão
  descricao: string;           // Descrição detalhada
  passoAPasso: string[];       // Lista de passos sequenciais
  fotos: string[];             // URLs ou Base64 das fotos
  videos: string[];            // URLs dos vídeos
  anexos: { nome: string; url: string; tipo?: string }[];
  revisao: string;             // e.g. "Rev 02"
  dataRevisao: string;         // e.g. "2026-07-29"
  responsavel: string;         // Nome do responsável
  status: 'Ativo' | 'Inativo';
  escopo: SopScope;            // 'exclusivo' | 'compartilhado' | 'global'
  modulosVinculados: SopModule[]; // Módulos onde o padrão é exibido
  historicoAlteracoes: SopAlteracaoHistorico[];
  criadoEm: string;
  atualizadoEm: string;
}

const STORAGE_KEY_SOPS = 'af_sop_central_documents';
const STORAGE_KEY_DELETED_SOPS = 'af_deleted_sop_ids';

export function getDeletedSopIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DELETED_SOPS);
    if (!raw) return new Set<string>();
    return new Set<string>(JSON.parse(raw));
  } catch (e) {
    return new Set<string>();
  }
}

export function addDeletedSopId(sopId: string): void {
  try {
    const current = getDeletedSopIds();
    current.add(sopId);
    localStorage.setItem(STORAGE_KEY_DELETED_SOPS, JSON.stringify(Array.from(current)));
  } catch (e) {}
}

// Initial default SOPs for all platform modules
const DEFAULT_CENTRAL_SOPS: SopDocument[] = [
  {
    id: 'sop-global-01',
    codigo: 'POP-GLO-01',
    nome: 'Segurança Operacional e Uso Obrigatório de EPIs',
    objetivo: 'Garantir a integridade física de todos os colaboradores em todas as áreas operacionais do armazém.',
    descricao: 'Norma padronizada de utilização de Equipamentos de Proteção Individual e postura ergonômica.',
    passoAPasso: [
      '1. Inspecione seus EPIs antes do início de cada turno (Bota de aço, luva anticorte, óculos e protetor auricular).',
      '2. Realize a ginástica laboral de 5 minutos antes da primeira atividade física.',
      '3. Sinalize imediatamente à supervisão qualquer avaria ou vazamento de líquido.',
      '4. Nunca transite em corredores de empilhadeira fora da faixa de pedestres.'
    ],
    fotos: [],
    videos: [],
    anexos: [{ nome: 'Manual_EPIs_Ambev_2026.pdf', url: '#' }],
    revisao: 'Rev 03',
    dataRevisao: '2026-07-01',
    responsavel: 'Eng. de Segurança (Carlos Eduardo)',
    status: 'Ativo',
    escopo: 'global',
    modulosVinculados: SOP_MODULES_LIST.map(m => m.id),
    historicoAlteracoes: [
      { id: 'h1', data: '2026-07-01', alteracao: 'Inclusão da obrigatoriedade do óculos no picking', usuario: 'Carlos Eduardo', revisaoAnterior: 'Rev 02' }
    ],
    criadoEm: '2026-01-10T08:00:00.000Z',
    atualizadoEm: '2026-07-01T10:00:00.000Z'
  },
  {
    id: 'sop-rpk-01',
    codigo: 'POP-RPK-01',
    nome: 'Procedimento Operacional Padronizado de Repack',
    objetivo: 'Normatizar a triagem, reembalagem e montagem de caixas e fardos sem avaria.',
    descricao: 'Instruções técnicas para resgate de caixas avariadas no armazém.',
    passoAPasso: [
      '1. Paramentação com luva anticorte e avental.',
      '2. Triagem e separação de vasilhames trincados ou amassados.',
      '3. Sanitização e secagem de latas e garrafas íntegras.',
      '4. Montagem de novas caixas/fardos padronizados por marca.',
      '5. Lançamento do volume processado no painel do operador.'
    ],
    fotos: [],
    videos: [],
    anexos: [],
    revisao: 'Rev 02',
    dataRevisao: '2026-06-15',
    responsavel: 'Supervisor de Repack (Mariana)',
    status: 'Ativo',
    escopo: 'exclusivo',
    modulosVinculados: ['repack'],
    historicoAlteracoes: [
      { id: 'h1', data: '2026-06-15', alteracao: 'Ajuste no tempo padrão de sanitização', usuario: 'Mariana', revisaoAnterior: 'Rev 01' }
    ],
    criadoEm: '2026-02-01T08:00:00.000Z',
    atualizadoEm: '2026-06-15T14:30:00.000Z'
  },
  {
    id: 'sop-qbr-01',
    codigo: 'WH-LOG-03',
    nome: 'Procedimento Operacional Padrão - Gestão de Quebras e Avarias',
    objetivo: 'Definir normas e procedimentos para o processo de gestão nas ocorrências de perdas e quebras dentro da operação.',
    descricao: 'Padrão corporativo para controle estatístico de perdas, isolamento de áreas de risco, recolha segura de garrafas e apuração de causas.',
    passoAPasso: [
      '1. Avaliação de Risco & Check Visual de integridade de pallets PBR e fitas de amostragem.',
      '2. Atendimento de Emergência & Isolamento (30 min de espera obrigatória antes da limpeza).',
      '3. Limpeza Segura com luvas anticorte e destinação adequada do vidro.',
      '4. Contabilização e Registro na Plataforma (código SKU, área, turno, motivo e responsável).',
      '5. Análise de CFTV & Apuração de causa raiz.'
    ],
    fotos: [],
    videos: [],
    anexos: [],
    revisao: 'Rev 02',
    dataRevisao: '2025-12-05',
    responsavel: 'Armazém - Pau Brasil Guarabira',
    status: 'Ativo',
    escopo: 'exclusivo',
    modulosVinculados: ['quebras'],
    historicoAlteracoes: [],
    criadoEm: '2025-12-05T08:00:00.000Z',
    atualizadoEm: '2025-12-05T08:00:00.000Z'
  },
  {
    id: 'sop-dsp-01',
    codigo: 'WH-LOG-03-DSP',
    nome: 'Procedimento Operacional Padrão - Gestão do Despejo e Descarte',
    objetivo: 'Mapear o fluxo a ser seguido para o envio de produtos não conformes para despejo na bombona e destinação responsável de resíduos.',
    descricao: 'Processo corporativo de escoamento de líquidos na bombona, enfardamento de resíduos (Projeto Reciclar) e controle de descarte.',
    passoAPasso: [
      '1. Conferência e Organização de PNC (Produtos Não Conformes).',
      '2. Autorização prévia e Despejo do Líquido na Bombona com EPIs de proteção completa.',
      '3. Verificação do nível da Bombona e agendamento de recolha com a fábrica.',
      '4. Segregação de Resíduos & Encaminhamento ao Projeto Reciclar.',
      '5. Lançamento da produtividade no aplicativo.'
    ],
    fotos: [],
    videos: [],
    anexos: [],
    revisao: 'Rev 04',
    dataRevisao: '2026-08-01',
    responsavel: 'Armazém - Distribuidora Pau Brasil',
    status: 'Ativo',
    escopo: 'exclusivo',
    modulosVinculados: ['despejo'],
    historicoAlteracoes: [],
    criadoEm: '2026-08-01T08:00:00.000Z',
    atualizadoEm: '2026-08-01T08:00:00.000Z'
  },
  {
    id: 'sop-pck-01',
    codigo: 'POP-PCK-01',
    nome: 'Separação e Estilagem no Picking de Vendas',
    objetivo: 'Zero avarias durante a montagem de paletes para expedição.',
    descricao: 'Orientações para arrumação física de caixas no palete de expedição.',
    passoAPasso: [
      '1. Bipar o código de barras da posição de picking.',
      '2. Colocar produtos pesados (Garrafas 1L/600ml) na base do palete.',
      '3. Acomodar caixas leves e latas nas camadas superiores.',
      '4. Aplicar filme stretch com ao menos 4 voltas de travamento.'
    ],
    fotos: [],
    videos: [],
    anexos: [],
    revisao: 'Rev 01',
    dataRevisao: '2026-05-20',
    responsavel: 'Coordenador de Logística (Roberto)',
    status: 'Ativo',
    escopo: 'compartilhado',
    modulosVinculados: ['picking', 'ressuprimento', 'gestao_capacidade', 'estoque_x_picking'],
    historicoAlteracoes: [],
    criadoEm: '2026-05-20T08:00:00.000Z',
    atualizadoEm: '2026-05-20T08:00:00.000Z'
  }
];

export function getAllSops(): SopDocument[] {
  const deletedSet = getDeletedSopIds();
  const idbCached = getCachedSopsFromMemory();
  const mergedMap = new Map<string, SopDocument>();

  // 1. Initial defaults
  DEFAULT_CENTRAL_SOPS.forEach(s => {
    if (s && s.id && !deletedSet.has(s.id)) {
      mergedMap.set(s.id, s);
    }
  });

  // 2. Saved SOPs from localStorage
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SOPS);
    if (raw) {
      const parsed: SopDocument[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach(s => {
          if (s && s.id && !deletedSet.has(s.id)) {
            if (s.id === 'sop-rpk-01' && (s.modulosVinculados.includes('despejo') || s.modulosVinculados.includes('quebras'))) {
              s.modulosVinculados = ['repack'];
            }
            mergedMap.set(s.id, s);
          }
        });
      }
    }
  } catch (e) {}

  // 3. Saved SOPs from IndexedDB memory cache
  idbCached.forEach(s => {
    if (s && s.id && !deletedSet.has(s.id)) {
      mergedMap.set(s.id, s);
    }
  });

  return Array.from(mergedMap.values());
}

export function saveAllSops(sops: SopDocument[]): void {
  sops.forEach(sop => {
    saveSopToIDB(sop).catch(() => {});
  });

  try {
    const sanitizedForLs = sops.map(s => {
      if (s.anexos && s.anexos.length > 0) {
        const anexosClean = s.anexos.map(a => {
          if (a.url && a.url.length > 300000) {
            return { ...a, url: '#' };
          }
          return a;
        });
        return { ...s, anexos: anexosClean };
      }
      return s;
    });
    localStorage.setItem(STORAGE_KEY_SOPS, JSON.stringify(sanitizedForLs));
  } catch (e) {
    console.error('Erro ao salvar SOPs em localStorage:', e);
  }
}

export function getSopsForModule(moduleName: SopModule): SopDocument[] {
  const all = getAllSops();
  return all.filter(sop => 
    sop.status === 'Ativo' && (
      sop.escopo === 'global' || 
      sop.modulosVinculados.includes(moduleName)
    )
  );
}

export interface SopViewOption {
  id: string;
  code?: string;
  title: string;
  displayName: string;
  steps: string[];
  fileUrl?: string;
  fileName?: string;
  description?: string;
}

export function getAllSopsForOperationList(operation: string): SopViewOption[] {
  const normKey = (operation || 'repack').toLowerCase().trim() as OperationalModuleKey;
  const deletedSet = getDeletedSopIds();

  const aliasMap: Record<string, OperationalModuleKey> = {
    repack: 'repack',
    despejo: 'despejo',
    armazem: 'armazem',
    logistica: 'efc_efd',
    efc: 'efc_efd',
    efd: 'efc_efd',
    efc_efd: 'efc_efd',
    fefo: 'fefo',
    validades: 'fefo',
    picking: 'picking',
    empilhador: 'empilhador',
    quebras: 'quebras',
    ressuprimento: 'ressuprimento_reabastecimento',
    ressuprimento_reabastecimento: 'ressuprimento_reabastecimento',
    tmr: 'tmr'
  };
  const targetKey = aliasMap[normKey] || normKey;

  const result: SopViewOption[] = [];
  const addedIds = new Set<string>();

  // 1. Check direct POP doc saved in af_pop_doc_${normKey} / af_pop_doc_${targetKey}
  const moduleKeysToTry = Array.from(new Set([normKey, targetKey]));
  for (const k of moduleKeysToTry) {
    try {
      const itemId = `pop-doc-${k}`;
      if (deletedSet.has(itemId)) continue;
      
      const rawSaved = localStorage.getItem(`af_pop_doc_${k}`);
      if (rawSaved) {
        const parsed = JSON.parse(rawSaved);
        if (parsed.title || parsed.nome || parsed.fileUrl) {
          const itemTitle = parsed.title || parsed.nome || 'Padrão Operacional';
          const itemCode = parsed.code || `POP-${k.toUpperCase()}`;
          if (!addedIds.has(itemId)) {
            addedIds.add(itemId);
            result.push({
              id: itemId,
              code: itemCode,
              title: itemTitle,
              displayName: `${itemCode} - ${itemTitle}`,
              steps: Array.isArray(parsed.steps) 
                ? parsed.steps.map((s: any) => typeof s === 'string' ? s : `${s.step || ''}. ${s.title}: ${s.description}`) 
                : (parsed.passoAPasso || []),
              fileUrl: parsed.fileUrl || (parsed.anexos?.[0]?.url),
              fileName: parsed.fileName || (parsed.anexos?.[0]?.nome) || `${itemCode}.pdf`,
              description: parsed.content || parsed.description || parsed.objetivo || parsed.descricao
            });
          }
        }
      }
    } catch (e) {}
  }

  // 2. Default POP for this SPECIFIC module ONLY
  const matchingDefaultKey = DEFAULT_POPS[normKey] ? normKey : DEFAULT_POPS[targetKey] ? targetKey : null;
  if (matchingDefaultKey && DEFAULT_POPS[matchingDefaultKey]) {
    const pop = DEFAULT_POPS[matchingDefaultKey];
    const itemId = `default-pop-${matchingDefaultKey}`;
    if (!addedIds.has(itemId) && !deletedSet.has(itemId)) {
      addedIds.add(itemId);
      result.push({
        id: itemId,
        code: pop.code,
        title: pop.title,
        displayName: `${pop.code} - ${pop.title}`,
        steps: pop.steps ? pop.steps.map(s => `${s.step}. ${s.title}: ${s.description}`) : [],
        fileUrl: pop.fileUrl,
        fileName: pop.fileName || `${pop.code}.pdf`,
        description: pop.content || pop.objetivo
      });
    }
  }

  // 3. Central SOP documents strictly matching this module
  try {
    const allSops = getAllSops();
    for (const sop of allSops) {
      if (sop.status !== 'Ativo' || deletedSet.has(sop.id)) continue;
      const matches = sop.escopo === 'global' || (
        Array.isArray(sop.modulosVinculados) && (
          sop.modulosVinculados.includes(normKey as any) || 
          sop.modulosVinculados.includes(targetKey as any) ||
          sop.modulosVinculados.includes('central' as any) ||
          (normKey === 'armazem' && (sop.modulosVinculados.includes('efc' as any) || sop.modulosVinculados.includes('efd' as any) || sop.modulosVinculados.includes('efc_efd' as any))) ||
          (normKey === 'conferente' && (sop.modulosVinculados.includes('efc_efd' as any) || sop.modulosVinculados.includes('carregamento' as any) || sop.modulosVinculados.includes('despacho' as any)))
        )
      );

      if (matches && !addedIds.has(sop.id)) {
        addedIds.add(sop.id);
        const firstAnexo = sop.anexos?.[0];
        result.push({
          id: sop.id,
          code: sop.codigo,
          title: sop.nome,
          displayName: `${sop.codigo} - ${sop.nome}`,
          steps: sop.passoAPasso || [],
          fileUrl: firstAnexo?.url,
          fileName: firstAnexo?.nome || `${sop.codigo}.pdf`,
          description: sop.objetivo || sop.descricao
        });
      }
    }
  } catch (e) {}

  return result.filter(item => !deletedSet.has(item.id));
}

export function getSopForOperation(operation: string): { title: string; steps: string[]; fileUrl?: string; fileName?: string; description?: string } {
  const normKey = (operation || 'repack').toLowerCase().trim() as OperationalModuleKey;

  const aliasMap: Record<string, OperationalModuleKey> = {
    repack: 'repack',
    despejo: 'despejo',
    armazem: 'armazem',
    logistica: 'armazem',
    fefo: 'validades',
    validades: 'validades',
    picking: 'picking',
    empilhador: 'empilhador',
    quebras: 'quebras',
    ressuprimento: 'ressuprimento',
    capacidade: 'capacidade',
    tmr: 'tmr',
    efc_efd: 'efc_efd',
    ressuprimento_reabastecimento: 'ressuprimento_reabastecimento'
  };
  const targetKey = aliasMap[normKey] || normKey;

  // 1. Direct POP document in localStorage for this specific sector key
  try {
    const rawSaved = localStorage.getItem(`af_pop_doc_${normKey}`) || localStorage.getItem(`af_pop_doc_${targetKey}`);
    if (rawSaved) {
      const parsed = JSON.parse(rawSaved);
      if (parsed.title || parsed.nome || parsed.fileUrl) {
        return {
          title: parsed.code ? `${parsed.code} - ${parsed.title || parsed.nome}` : (parsed.title || parsed.nome || 'Padrão Operacional'),
          steps: Array.isArray(parsed.steps) 
            ? parsed.steps.map((s: any) => typeof s === 'string' ? s : `${s.step || ''}. ${s.title}: ${s.description}`) 
            : (parsed.passoAPasso || []),
          fileUrl: parsed.fileUrl || (parsed.anexos?.[0]?.url),
          fileName: parsed.fileName || (parsed.anexos?.[0]?.nome),
          description: parsed.content || parsed.description || parsed.objetivo || parsed.descricao
        };
      }
    }
  } catch (e) {}

  // 2. Direct match from DEFAULT_POPS for this specific module key
  if (DEFAULT_POPS[normKey] || DEFAULT_POPS[targetKey]) {
    const pop = DEFAULT_POPS[normKey] || DEFAULT_POPS[targetKey];
    return {
      title: `${pop.code} - ${pop.title}`,
      steps: pop.steps ? pop.steps.map(s => `${s.step}. ${s.title}: ${s.description}`) : [],
      fileUrl: pop.fileUrl,
      fileName: pop.fileName,
      description: pop.content || pop.objetivo
    };
  }

  // 3. Central SOP documents matching module specifically
  try {
    const allSops = getAllSops();
    const specificSop = allSops.find(sop => 
      sop.status === 'Ativo' && 
      Array.isArray(sop.modulosVinculados) && (
        sop.modulosVinculados.includes(normKey as any) || 
        sop.modulosVinculados.includes(targetKey as any)
      )
    );

    if (specificSop) {
      const firstAnexo = specificSop.anexos?.[0];
      return {
        title: `${specificSop.codigo} - ${specificSop.nome}`,
        steps: specificSop.passoAPasso || [],
        fileUrl: firstAnexo?.url,
        fileName: firstAnexo?.nome,
        description: specificSop.objetivo || specificSop.descricao
      };
    }
  } catch (e) {}

  return {
    title: `POP Padronizado - Operação de ${operation.toUpperCase()}`,
    steps: [
      '1. Verificação prévia dos equipamentos e EPIs.',
      '2. Execução das rotinas seguindo o padrão operacional.',
      '3. Lançamento e conferência no sistema ao final do processo.'
    ]
  };
}

export function saveSopForOperation(operation: string, sopData: { title: string; steps: string[]; fileUrl?: string; fileName?: string }): void {
  const modMap: Record<string, SopModule> = {
    repack: 'repack',
    despejo: 'despejo',
    armazem: 'efc',
    logistica: 'carregamento',
    fefo: 'fefo',
    picking: 'picking'
  };
  const targetMod = modMap[operation] || 'repack';
  const newSop: SopDocument = {
    id: `sop-${operation}-${Date.now()}`,
    codigo: `POP-${operation.slice(0, 3).toUpperCase()}-01`,
    nome: sopData.title,
    objetivo: `Objetivo operacional do módulo ${operation}`,
    descricao: `Descrição detalhada do padrão ${sopData.title}`,
    passoAPasso: sopData.steps,
    fotos: [],
    videos: [],
    anexos: sopData.fileUrl ? [{ nome: sopData.fileName || 'Anexo', url: sopData.fileUrl }] : [],
    revisao: 'Rev 01',
    dataRevisao: new Date().toISOString().split('T')[0],
    responsavel: 'Coordenador Operacional',
    status: 'Ativo',
    escopo: 'exclusivo',
    modulosVinculados: [targetMod],
    historicoAlteracoes: [],
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString()
  };

  saveOrUpdateSop(newSop, 'Sistema');
}

export function saveOrUpdateSop(sop: SopDocument, usuario: string): SopDocument {
  saveSopToIDB(sop).catch(() => {});

  const all = getAllSops();
  const existingIdx = all.findIndex(s => s.id === sop.id);
  const nowISO = new Date().toISOString();

  let finalSop: SopDocument;

  if (existingIdx >= 0) {
    const prev = all[existingIdx];
    const hasRevChange = prev.revisao !== sop.revisao || prev.nome !== sop.nome || prev.descricao !== sop.descricao;
    
    const newHistory: SopAlteracaoHistorico[] = [...(prev.historicoAlteracoes || [])];
    if (hasRevChange) {
      newHistory.unshift({
        id: `h-${Date.now()}`,
        data: new Date().toLocaleDateString('pt-BR'),
        alteracao: `Atualizado para ${sop.revisao}. Alteração realizada no sistema.`,
        usuario: usuario || 'Gestor',
        revisaoAnterior: prev.revisao
      });
    }

    finalSop = {
      ...sop,
      historicoAlteracoes: newHistory,
      atualizadoEm: nowISO
    };
    all[existingIdx] = finalSop;
  } else {
    finalSop = {
      ...sop,
      id: sop.id || `sop-${Date.now()}`,
      criadoEm: nowISO,
      atualizadoEm: nowISO,
      historicoAlteracoes: [
        {
          id: `h-${Date.now()}`,
          data: new Date().toLocaleDateString('pt-BR'),
          alteracao: `Criação inicial do padrão (${sop.revisao})`,
          usuario: usuario || 'Gestor'
        }
      ]
    };
    all.unshift(finalSop);
  }

  saveSopToIDB(finalSop).catch(() => {});
  saveAllSops(all);

  // Sync to individual af_pop_doc_ keys so SopBannerViewer & PadraoOperacionalModal receive instant updates
  try {
    const modulesToSync = finalSop.escopo === 'global' 
      ? SOP_MODULES_LIST.map(m => m.id)
      : (finalSop.modulosVinculados || []);

    const firstAnexo = finalSop.anexos?.[0];

    modulesToSync.forEach(modKey => {
      const popDocToSync = {
        title: finalSop.nome,
        code: finalSop.codigo,
        version: finalSop.revisao,
        lastUpdated: finalSop.dataRevisao,
        updatedBy: finalSop.responsavel,
        content: finalSop.descricao || finalSop.objetivo,
        safetyEPIs: ['Luvas Anticorte', 'Bota com Biqueira de Aço', 'Óculos de Proteção'],
        steps: (finalSop.passoAPasso || []).map((stepStr, i) => ({
          step: i + 1,
          title: `Passo ${i + 1}`,
          description: stepStr
        })),
        fileUrl: firstAnexo?.url,
        fileName: firstAnexo?.nome
      };
      try {
        localStorage.setItem(`af_pop_doc_${modKey}`, JSON.stringify(popDocToSync));
      } catch (e) {}
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('af_pop_updated', { detail: { sop: finalSop } }));
    }
  } catch (e) {
    console.error('Erro ao sincronizar af_pop_doc:', e);
  }

  return finalSop;
}

export function deleteSop(sopId: string): void {
  addDeletedSopId(sopId);
  deleteSopFromIDB(sopId).catch(() => {});

  const raw = localStorage.getItem(STORAGE_KEY_SOPS);
  if (raw) {
    try {
      const all: SopDocument[] = JSON.parse(raw);
      const sopToDelete = all.find(s => s.id === sopId);
      const filtered = all.filter(s => s.id !== sopId);
      saveAllSops(filtered);

      if (sopToDelete) {
        const modulesToClean = sopToDelete.escopo === 'global' 
          ? SOP_MODULES_LIST.map(m => m.id)
          : (sopToDelete.modulosVinculados || []);
        modulesToClean.forEach(modKey => {
          try {
            localStorage.removeItem(`af_pop_doc_${modKey}`);
          } catch (e) {}
        });
      }
    } catch (e) {}
  }

  if (sopId.startsWith('pop-doc-')) {
    const modKey = sopId.replace('pop-doc-', '');
    try {
      localStorage.removeItem(`af_pop_doc_${modKey}`);
    } catch (e) {}
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('af_pop_updated', { detail: { deletedId: sopId } }));
  }
}

/**
 * Converts a base64 data URL (e.g. data:application/pdf;base64,...) to a Blob URL (blob:https://...)
 * Chrome blocks data:application/pdf URLs inside iframes/embeds/top-frame navigations for security reasons.
 * Blob URLs work seamlessly in modern browsers.
 */
export function createSafePdfBlobUrl(fileUrl: string): string {
  if (!fileUrl) return '';
  if (fileUrl.startsWith('blob:')) return fileUrl;
  if (fileUrl.startsWith('data:')) {
    try {
      const parts = fileUrl.split(',');
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
      const b64Data = parts[1];
      if (!b64Data) return fileUrl;
      
      const byteCharacters = atob(b64Data);
      const byteArrays = [];
      
      for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
      }
      
      const blob = new Blob(byteArrays, { type: mime });
      return URL.createObjectURL(blob);
    } catch (err) {
      console.error('Failed to convert dataUrl to Blob:', err);
      return fileUrl;
    }
  }
  return fileUrl;
}

export function openPdfInNewTab(fileUrl: string, fileName: string = 'Padrao_Operacional.pdf'): void {
  if (!fileUrl) return;
  const safeUrl = createSafePdfBlobUrl(fileUrl);
  const newWin = window.open(safeUrl, '_blank');
  if (!newWin || newWin.closed || typeof newWin.closed === 'undefined') {
    const a = document.createElement('a');
    a.href = safeUrl;
    a.target = '_blank';
    a.rel = 'noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

export function downloadPdfFile(fileUrl: string, fileName: string = 'Padrao_Operacional.pdf'): void {
  if (!fileUrl) return;
  const safeUrl = createSafePdfBlobUrl(fileUrl);
  const a = document.createElement('a');
  a.href = safeUrl;
  a.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

