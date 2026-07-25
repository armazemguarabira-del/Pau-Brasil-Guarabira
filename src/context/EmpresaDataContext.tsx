import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
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
 * Antes: cada tela (Dashboard, Exportar, painéis) abria seu próprio
 * onSnapshot nas mesmas coleções -> a mesma coleção era lida (e cobrada)
 * uma vez por tela aberta na sessão.
 *
 * Agora: 1 único onSnapshot por coleção, aberto aqui, no topo do app,
 * assim que a empresa é conhecida. Todo componente lê via useEmpresaData()
 * e recebe as mesmas atualizações em tempo real, sem abrir conexão própria.
 *
 * Real-time entre usuários e nos dashboards continua 100% funcionando —
 * é o mesmo onSnapshot de sempre, só que compartilhado em vez de duplicado.
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

// Mapa coleção Firestore -> chave do state / setter, pra não repetir o
// boilerplate do onSnapshot pra cada coleção.
const COLLECTIONS: Array<{ nome: string; chave: keyof Omit<EmpresaDataState, 'loaded'> }> = [
  { nome: 'repack', chave: 'repack' },
  { nome: 'despejo', chave: 'despejo' },
  { nome: 'quebras', chave: 'quebras' },
  { nome: 'validades', chave: 'validades' },
  { nome: 'armazem', chave: 'armazem' },
  { nome: 'blitz_refugo', chave: 'blitz' },
  { nome: 'tarefas', chave: 'tarefas' },
  { nome: 'usuarios', chave: 'usuarios' },
  { nome: 'acoes', chave: 'acoes' },
  { nome: 'colaboradores', chave: 'colaboradores' },
  { nome: 'dpo_audits', chave: 'dpoAudits' },
  { nome: 'repack_validades', chave: 'repackValidades' },
  { nome: 'acessos', chave: 'acessos' },
  { nome: 'repack_action_plans', chave: 'repackActionPlans' },
  { nome: 'repack_a3_boards', chave: 'repackA3Boards' },
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
    const unsubs = COLLECTIONS.map(({ nome, chave }) =>
      onSnapshot(
        query(collection(db, nome), where('empresaId', '==', empresaId)),
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
      )
    );

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
