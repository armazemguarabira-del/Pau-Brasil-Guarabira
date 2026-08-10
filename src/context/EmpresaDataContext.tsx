import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { syncIncremental } from '../utils/syncIncremental';
import {
  RepackRow,
  DespejoRow,
  QuebraRow,
  ValidadeRow,
  ArmazemRow,
  BlitzRefugoRow,
  Tarefa,
  ProdutoMaster,
  ColaboradorMaster,
  AcessoColaborador
} from '../types';

export interface EmpresaDataState {
  repack: RepackRow[];
  despejo: DespejoRow[];
  quebras: QuebraRow[];
  validades: ValidadeRow[];
  armazem: ArmazemRow[];
  blitz: BlitzRefugoRow[];
  tarefas: Tarefa[];
  usuarios: any[];
  acoes: any[];
  colaboradores: ColaboradorMaster[];
  produtos: ProdutoMaster[];
  dpoAudits: any[];
  repackValidades: any[];
  acessos: AcessoColaborador[];
  repackActionPlans: any[];
  repackA3Boards: any[];
  loaded: boolean;
  viewUnitMode: 'R$' | 'HL';
}

const EMPTY_STATE: EmpresaDataState = {
  repack: [],
  despejo: [],
  quebras: [],
  validades: [],
  armazem: [],
  blitz: [],
  tarefas: [],
  usuarios: [],
  acoes: [],
  colaboradores: [],
  produtos: [],
  dpoAudits: [],
  repackValidades: [],
  acessos: [],
  repackActionPlans: [],
  repackA3Boards: [],
  loaded: false,
  viewUnitMode: 'R$'
};

interface ContextValue extends EmpresaDataState {
  empresaId: string | null | undefined;
  setViewUnitMode: (mode: 'R$' | 'HL') => void;
  subscribeCollection: (nome: string, chave: keyof Omit<EmpresaDataState, 'loaded' | 'empresaId' | 'subscribeCollection' | 'viewUnitMode' | 'setViewUnitMode'>) => () => void;
}

const EmpresaDataContext = createContext<ContextValue>({
  ...EMPTY_STATE,
  empresaId: null,
  setViewUnitMode: () => {},
  subscribeCollection: () => () => {},
});

// Mapeamento Nome da Coleção Firestore -> Chave no State
const COLLECTION_MAPPING: Record<string, keyof Omit<EmpresaDataState, 'loaded' | 'empresaId' | 'subscribeCollection' | 'viewUnitMode' | 'setViewUnitMode'>> = {
  repack: 'repack',
  despejo: 'despejo',
  quebras: 'quebras',
  validades: 'validades',
  armazem: 'armazem',
  blitz_refugo: 'blitz',
  tarefas: 'tarefas',
  usuarios: 'usuarios',
  acoes: 'acoes',
  colaboradores: 'colaboradores',
  produtos: 'produtos',
  dpo_audits: 'dpoAudits',
  repack_validades: 'repackValidades',
  acessos: 'acessos',
  repack_action_plans: 'repackActionPlans',
  repack_a3_boards: 'repackA3Boards',
};

export function EmpresaDataProvider({
  empresaId,
  children,
}: {
  empresaId: string | null | undefined;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<EmpresaDataState>(EMPTY_STATE);
  const [viewUnitMode, setViewUnitModeState] = useState<'R$' | 'HL'>(() => {
    try {
      const saved = localStorage.getItem('af_global_view_unit');
      if (saved === 'HL' || saved === 'R$') return saved;
    } catch (e) {
      // ignore
    }
    return 'R$';
  });

  const setViewUnitMode = useCallback((mode: 'R$' | 'HL') => {
    setViewUnitModeState(mode);
    try {
      localStorage.setItem('af_global_view_unit', mode);
    } catch (e) {
      // ignore
    }
  }, []);

  const refCounts = useRef<Record<string, number>>({});
  const unsubs = useRef<Record<string, () => void>>({});

  useEffect(() => {
    // Reset state when empresaId changes or logs out
    setState(EMPTY_STATE);
    refCounts.current = {};
    Object.values(unsubs.current).forEach(unsub => {
      if (typeof unsub === 'function') unsub();
    });
    unsubs.current = {};
  }, [empresaId]);

  const subscribeCollection = useCallback(
    (nome: string, chave: keyof Omit<EmpresaDataState, 'loaded' | 'empresaId' | 'subscribeCollection'>) => {
      if (!empresaId) return () => {};

      refCounts.current[nome] = (refCounts.current[nome] || 0) + 1;

      // Inicia a sincronização incremental se for a primeira subscrição ativa dessa coleção
      if (refCounts.current[nome] === 1 && !unsubs.current[nome]) {
        const cleanup = syncIncremental({
          collectionName: nome,
          empresaId,
          onData: (data) => {
            setState((prev) => ({
              ...prev,
              [chave]: data,
              loaded: true,
            }));
          },
        });
        unsubs.current[nome] = cleanup;
      }

      return () => {
        refCounts.current[nome] = Math.max(0, (refCounts.current[nome] || 1) - 1);
        if (refCounts.current[nome] === 0 && unsubs.current[nome]) {
          unsubs.current[nome]();
          delete unsubs.current[nome];
        }
      };
    },
    [empresaId]
  );

  return (
    <EmpresaDataContext.Provider
      value={{
        ...state,
        empresaId,
        viewUnitMode,
        setViewUnitMode,
        subscribeCollection: subscribeCollection as any,
      }}
    >
      {children}
    </EmpresaDataContext.Provider>
  );
}

/**
 * Hook retrocompatível com a fonte de dados global da empresa logada.
 * Subscreve sob demanda às coleções ativas via sincronização incremental (Cache + Delta).
 */
export function useEmpresaData() {
  const ctx = useContext(EmpresaDataContext);
  const { subscribeCollection, empresaId } = ctx;

  useEffect(() => {
    if (!empresaId) return;

    // Subscreve incrementalmente a todas as coleções do state para os componentes retrocompatíveis
    const cleanups = Object.entries(COLLECTION_MAPPING).map(([nome, chave]) =>
      subscribeCollection(nome, chave)
    );

    return () => {
      cleanups.forEach((c) => c());
    };
  }, [subscribeCollection, empresaId]);

  return ctx;
}

/** Hooks Modulares por Domínio (Fase 3): Carregados somente quando o painel correspondente é montado */

export function useRepackData() {
  const ctx = useContext(EmpresaDataContext);
  useEffect(() => {
    if (!ctx.empresaId) return;
    return ctx.subscribeCollection('repack', 'repack');
  }, [ctx.empresaId, ctx.subscribeCollection]);
  return ctx.repack;
}

export function useDespejoData() {
  const ctx = useContext(EmpresaDataContext);
  useEffect(() => {
    if (!ctx.empresaId) return;
    return ctx.subscribeCollection('despejo', 'despejo');
  }, [ctx.empresaId, ctx.subscribeCollection]);
  return ctx.despejo;
}

export function useQuebrasData() {
  const ctx = useContext(EmpresaDataContext);
  useEffect(() => {
    if (!ctx.empresaId) return;
    return ctx.subscribeCollection('quebras', 'quebras');
  }, [ctx.empresaId, ctx.subscribeCollection]);
  return ctx.quebras;
}

export function useValidadesData() {
  const ctx = useContext(EmpresaDataContext);
  useEffect(() => {
    if (!ctx.empresaId) return;
    return ctx.subscribeCollection('validades', 'validades');
  }, [ctx.empresaId, ctx.subscribeCollection]);
  return ctx.validades;
}

export function useArmazemData() {
  const ctx = useContext(EmpresaDataContext);
  useEffect(() => {
    if (!ctx.empresaId) return;
    return ctx.subscribeCollection('armazem', 'armazem');
  }, [ctx.empresaId, ctx.subscribeCollection]);
  return ctx.armazem;
}

export function useBlitzData() {
  const ctx = useContext(EmpresaDataContext);
  useEffect(() => {
    if (!ctx.empresaId) return;
    return ctx.subscribeCollection('blitz_refugo', 'blitz');
  }, [ctx.empresaId, ctx.subscribeCollection]);
  return ctx.blitz;
}

export function useTarefasData() {
  const ctx = useContext(EmpresaDataContext);
  useEffect(() => {
    if (!ctx.empresaId) return;
    return ctx.subscribeCollection('tarefas', 'tarefas');
  }, [ctx.empresaId, ctx.subscribeCollection]);
  return ctx.tarefas;
}

export function useAcoesData() {
  const ctx = useContext(EmpresaDataContext);
  useEffect(() => {
    if (!ctx.empresaId) return;
    return ctx.subscribeCollection('acoes', 'acoes');
  }, [ctx.empresaId, ctx.subscribeCollection]);
  return ctx.acoes;
}

export function useColaboradoresData() {
  const ctx = useContext(EmpresaDataContext);
  useEffect(() => {
    if (!ctx.empresaId) return;
    return ctx.subscribeCollection('colaboradores', 'colaboradores');
  }, [ctx.empresaId, ctx.subscribeCollection]);
  return ctx.colaboradores;
}

export function useDpoAuditsData() {
  const ctx = useContext(EmpresaDataContext);
  useEffect(() => {
    if (!ctx.empresaId) return;
    return ctx.subscribeCollection('dpo_audits', 'dpoAudits');
  }, [ctx.empresaId, ctx.subscribeCollection]);
  return ctx.dpoAudits;
}

export function useProdutosData() {
  const ctx = useContext(EmpresaDataContext);
  useEffect(() => {
    if (!ctx.empresaId) return;
    return ctx.subscribeCollection('produtos', 'produtos');
  }, [ctx.empresaId, ctx.subscribeCollection]);
  return ctx.produtos;
}

export function useAcessosData() {
  const ctx = useContext(EmpresaDataContext);
  useEffect(() => {
    if (!ctx.empresaId) return;
    return ctx.subscribeCollection('acessos', 'acessos');
  }, [ctx.empresaId, ctx.subscribeCollection]);
  return ctx.acessos;
}
