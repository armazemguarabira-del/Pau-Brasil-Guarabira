// Utilitário para controle e disparo global dos modais de Ações de Desvio e Ações de Melhoria TOR
import { Usuario } from '../types';

export interface OpenAcaoDesvioParams {
  processo?: string;
  indicador?: string;
  meta?: string;
  resultadoObtido?: string;
  desvioEncontrado?: string;
  tipoGatilho?: string;
  severidade?: 'Crítica (P1)' | 'Alta (P2)' | 'Média (P3)';
  colaborador?: string;
  setor?: string;
  produto?: string;
  codigoProduto?: string;
  lote?: string;
}

export interface OpenAcaoMelhoriaParams {
  processo?: string;
  reuniaoTOR?: string;
  pilarDPO?: string;
  oportunidade?: string;
  metaMelhoria?: string;
  responsavel?: string;
  indicadorBeneficiado?: string;
}

export function openModalAcaoDesvio(params?: OpenAcaoDesvioParams) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('abrir-modal-acao-desvio', { detail: params || {} }));
  }
}

export function openModalAcaoMelhoria(params?: OpenAcaoMelhoriaParams) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('abrir-modal-acao-melhoria', { detail: params || {} }));
  }
}
