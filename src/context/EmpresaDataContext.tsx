import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, limit } from 'firebase/firestore';
import { db } from '../firebase';
import {
  RepackRow,
  DespejoRow,
  QuebraRow,
  ValidadeRow,
  ArmazemRow,
  BlitzRefugoRow,
  Tarefa,
} from '../types';

/**
 * Fonte única de verdade em tempo real para os dados da empresa logada.
 *
 * Otimizado com limites e agrupamento para evitar leituras desnecessárias de
 * documentos históricos antigos, mantendo a sincronização 100% em tempo real
 * entre usuários e dashboards.
 */

interface EmpresaDataState {
  repack: RepackRow[];
  despejo: DespejoRow[];
  quebras: QuebraRow[];
  validades: ValidadeRow[];
  armazem: ArmazemRow[];
  blitz: BlitzRefugoRow[];
  tarefas: Tarefa[];
  usuarios: any[];
  acoes: any[];
  colaboradores: any[];
  dpoAudits: any[];
  repackValidades: any[];
  acessos: any[];
  repackActionPlans: any[];
  repackA3Boards: any[];
  /** true assim que a primeira leitura de cada coleção já chegou */
  loaded: boolean;
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
  dpoAudits: [],
  repackValidades: [],
  acessos: [],
  repackActionPlans: [],
  repackA3Boards: [],
  loaded: false,
};

const EmpresaDataContext = createContext<EmpresaDataState>(EMPTY_STATE);

// Mapa coleção Firestore -> chave do state / setter com limite seguro de registros
const COLLECTIONS: Array<{ nome: string; chave: keyof Omit<EmpresaDataState, 'loaded'>; limitDocs?: number }> = [
  { nome: 'repack', chave: 'repack', limitDocs: 1500 },
  { nome: 'despejo', chave: 'despejo', limitDocs: 1500 },
  { nome: 'quebras', chave: 'quebras', limitDocs: 2000 },
  { nome: 'validades', chave: 'validades', limitDocs: 1500 },
  { nome: 'armazem', chave: 'armazem', limitDocs: 1000 },
  { nome: 'blitz_refugo', chave: 'blitz', limitDocs: 1000 },
  { nome: 'tarefas', chave: 'tarefas', limitDocs: 500 },
  { nome: 'usuarios', chave: 'usuarios', limitDocs: 300 },
  { nome: 'acoes', chave: 'acoes', limitDocs: 500 },
  { nome: 'colaboradores', chave: 'colaboradores', limitDocs: 500 },
  { nome: 'dpo_audits', chave: 'dpoAudits', limitDocs: 500 },
  { nome: 'repack_validades', chave: 'repackValidades', limitDocs: 500 },
  { nome: 'acessos', chave: 'acessos', limitDocs: 50 },
  { nome: 'repack_action_plans', chave: 'repackActionPlans', limitDocs: 300 },
  { nome: 'repack_a3_boards', chave: 'repackA3Boards', limitDocs: 300 },
];

export function EmpresaDataProvider({
  empresaId,
  children,
}: {
  empresaId: string | null | undefined;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<EmpresaDataState>(EMPTY_STATE);

  useEffect(() => {
    if (!db || !empresaId) {
      setState(EMPTY_STATE);
      return;
    }

    const pendentes = new Set(COLLECTIONS.map(c => c.chave));
    const unsubs = COLLECTIONS.map(({ nome, chave, limitDocs }) => {
      const q = limitDocs 
        ? query(collection(db, nome), where('empresaId', '==', empresaId), limit(limitDocs))
        : query(collection(db, nome), where('empresaId', '==', empresaId));

      return onSnapshot(
        q,
        snap => {
          const rows = snap.docs.map(d => ({ _docId: d.id, id: d.id, ...d.data() } as any));
          pendentes.delete(chave);
          setState(prev => ({
            ...prev,
            [chave]: rows,
            loaded: prev.loaded || pendentes.size === 0,
          }));
        },
        err => console.warn(`EmpresaDataProvider: erro ao ouvir '${nome}':`, err)
      );
    });

    return () => unsubs.forEach(u => u());
  }, [empresaId]);

  return (
    <EmpresaDataContext.Provider value={state}>
      {children}
    </EmpresaDataContext.Provider>
  );
}

export function useEmpresaData() {
  return useContext(EmpresaDataContext);
}
