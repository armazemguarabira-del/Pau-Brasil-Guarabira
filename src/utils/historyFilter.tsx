import React from 'react';
import { Usuario } from '../types';

/**
 * Retorna true se o usuário tem privilégio de Gestor, Supervisor, Admin ou Controle.
 */
export function isGestorOrSupervisor(user?: Usuario | { papel?: string; isControle?: boolean } | null): boolean {
  if (!user) return false;
  const papel = (user.papel || '').toLowerCase();
  return (
    papel === 'admin' ||
    papel === 'supervisor' ||
    papel === 'gestor' ||
    papel === 'gerente' ||
    user.isControle === true
  );
}

/**
 * Filtra uma lista de registros para visualização no Histórico.
 * Para Gestores e Supervisores: exibe o histórico completo.
 * Para demais papéis (operadores/conferentes/empilhadores): exibe APENAS os últimos 2 dias de registros.
 */
export function filterHistoryForUser<T = any>(
  items: T[],
  user?: Usuario | null,
  customGetDateKey?: (item: T) => string
): T[] {
  if (!items || items.length === 0) return [];
  if (isGestorOrSupervisor(user)) return items;

  const getItemDateKey = (item: any): string => {
    if (customGetDateKey) {
      const k = customGetDateKey(item);
      if (k) return k;
    }

    if (item.dataISO) return item.dataISO;

    if (item.data) {
      const raw = String(item.data).trim();
      if (raw.includes('/')) {
        const parts = raw.split('/');
        if (parts.length === 3) {
          const day = parts[0].padStart(2, '0');
          const month = parts[1].padStart(2, '0');
          const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
          return `${year}-${month}-${day}`;
        }
      } else if (raw.includes('-')) {
        return raw;
      }
    }

    if (item.dataAtendimento) return String(item.dataAtendimento);
    if (item.dataRecebimento) return String(item.dataRecebimento);
    if (item.dataRegistro) return String(item.dataRegistro);

    const ts = item._criadoEm || item.criadoEm || item.createdAt;
    if (ts) {
      try {
        return new Date(ts).toISOString().split('T')[0];
      } catch (e) {}
    }

    return 'sem-data';
  };

  // Obter lista ordenada de datas únicas do mais recente para o mais antigo
  const uniqueDates = Array.from(
    new Set(
      items
        .map(getItemDateKey)
        .filter(d => d && d !== 'sem-data')
    )
  ).sort().reverse();

  // Caso haja datas válidas, pegar os 2 dias mais recentes
  const allowedDates = new Set(uniqueDates.slice(0, 2));

  if (allowedDates.size === 0) return items;

  return items.filter(item => {
    const key = getItemDateKey(item);
    return allowedDates.has(key);
  });
}

/**
 * Componente de aviso discreto exibido no topo do Histórico para Não-Gestores
 */
export function HistoryRestrictionNotice({ user }: { user?: Usuario | null }) {
  if (isGestorOrSupervisor(user)) return null;

  return (
    <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-lg text-xs font-semibold mb-3 flex items-center justify-between gap-2 animate-fadeIn">
      <div className="flex items-center gap-2">
        <span>🔒</span>
        <span>
          Exibindo registros dos <strong>últimos 2 dias</strong> de operação. O histórico completo está reservado para Supervisores e Gestores.
        </span>
      </div>
      <span className="text-[10px] bg-amber-500/20 text-amber-200 border border-amber-500/40 px-2 py-0.5 rounded font-mono font-bold whitespace-nowrap">
        Acesso Operacional (2 dias)
      </span>
    </div>
  );
}
