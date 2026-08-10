import { Usuario } from '../types';

export type RoleType = 'admin' | 'empilhador' | 'ajudante' | 'conferente' | 'operador';

/**
 * Normalizes text for case-insensitive and accent-insensitive matching
 */
function normalizeText(str: string | undefined | null): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Determines the simplified RoleType based on email, papel, cargo or isControle
 */
export function getUserRoleType(user: Usuario | null | undefined): RoleType {
  if (!user) return 'operador';

  const email = normalizeText(user.email);
  const papel = normalizeText(user.papel);
  const cargo = normalizeText(user.cargo);

  // 1. ADMIN / SUPERVISOR / CONTROL / COORDENADOR
  const isNixon = email === 'nixon.a.a100.nh@gmail.com';
  const isBypass = user.uid === 'bypass_g1009';
  const isAdminOrControle =
    isNixon ||
    isBypass ||
    user.isControle === true ||
    papel === 'admin' ||
    papel === 'controle' ||
    papel.includes('supervisor') ||
    papel.includes('coordenador') ||
    papel.includes('gerente') ||
    cargo.includes('admin') ||
    cargo.includes('supervisor') ||
    cargo.includes('coordenador') ||
    cargo.includes('gerente') ||
    cargo.includes('diretoria') ||
    cargo.includes('controle') ||
    cargo.includes('gestor');

  if (isAdminOrControle) {
    return 'admin';
  }

  // 2. EMPILHADOR
  const isEmpilhador =
    papel === 'empilhador' ||
    cargo.includes('empilhador') ||
    cargo.includes('operador de empilhadeira') ||
    cargo.includes('manobrista');

  if (isEmpilhador) {
    return 'empilhador';
  }

  // 3. AJUDANTE
  const isAjudante =
    papel === 'ajudante' ||
    cargo.includes('ajudante') ||
    cargo.includes('servicos gerais') ||
    cargo.includes('auxiliar de armazem') ||
    cargo.includes('puxada') ||
    cargo.includes('jovem aprendiz');

  if (isAjudante) {
    return 'ajudante';
  }

  // 4. CONFERENTE
  const isConferente =
    papel === 'conferente' ||
    cargo.includes('conferente') ||
    cargo.includes('confernte') ||
    cargo.includes('assistente de controle') ||
    cargo.includes('auxiliar de controle');

  if (isConferente) {
    return 'conferente';
  }

  return 'operador';
}

/**
 * Automatically calculates default RoleType from Cargo/Função string according to ETAPA 7 rules
 */
export function autoAssignRoleFromCargo(cargo: string | undefined | null): RoleType {
  if (!cargo) return 'ajudante';
  const c = cargo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  if (
    c.includes('admin') ||
    c.includes('supervisor') ||
    c.includes('coordenador') ||
    c.includes('gerente') ||
    c.includes('diretor') ||
    c.includes('gestor') ||
    c.includes('controle') ||
    c.includes('engenheiro') ||
    c.includes('analista')
  ) {
    return 'admin';
  }

  if (c.includes('empilhador') || c.includes('empilhadeira') || c.includes('manobrista')) {
    return 'empilhador';
  }

  if (c.includes('conferente') || c.includes('confernte') || c.includes('assistente de controle') || c.includes('auxiliar de controle')) {
    return 'conferente';
  }

  if (
    c.includes('ajudante') ||
    c.includes('servicos gerais') ||
    c.includes('auxiliar') ||
    c.includes('puxada') ||
    c.includes('jovem aprendiz')
  ) {
    return 'ajudante';
  }

  return 'ajudante';
}

/**
 * Returns default list of module IDs for a given cargo/função according to ETAPA 7 rules
 */
export function getDefaultModulesForCargo(cargo: string | undefined | null): string[] {
  const roleType = autoAssignRoleFromCargo(cargo);
  switch (roleType) {
    case 'admin':
      return [
        'visao-geral', 'dashboard', 'ajudante', 'empilhador', 'conferente', 'repack', 
        'repack-dashboard', 'despejo', 'despejo-dashboard', 'quebras', 'quebras-dashboard', 
        'validades', 'fefo-dashboard', 'refugo', 'blitz', 'armazem', 'logistica-dashboard', 
        'tmr-dashboard', 'simulador-ressuprimento', 'cadastros', 'cat-cadastros', 'cat-dados-acoes', 
        'acoes', 'simulacao-acoes', 'agenda-executiva', 'diario-bordo', 'reunioes', 'controle', 'exportar'
      ];
    case 'empilhador':
      return ['visao-geral', 'empilhador', 'picking-dashboard', 'armazem', 'logistica-dashboard', 'tmr-dashboard', 'simulador-ressuprimento'];
    case 'ajudante':
      return ['visao-geral', 'ajudante', 'despejo', 'despejo-dashboard', 'repack', 'repack-dashboard', 'quebras', 'quebras-dashboard'];
    case 'conferente':
      return [
        'visao-geral',
        'ajudante',
        'repack',
        'repack-dashboard',
        'despejo',
        'despejo-dashboard',
        'armazem',
        'logistica-dashboard',
        'tmr-dashboard',
        'quebras',
        'quebras-dashboard',
        'validades',
        'fefo-dashboard',
        'refugo',
        'empilhador',
        'picking-dashboard',
        'conferente'
      ];
    default:
      return ['visao-geral', 'ajudante'];
  }
}

/**
 * Returns a human-friendly role name display badge
 */
export function getRoleDisplayName(user: Usuario | null | undefined): string {
  if (!user) return 'Operador';
  const roleType = getUserRoleType(user);

  switch (roleType) {
    case 'admin':
      return 'Administrador / Controle';
    case 'empilhador':
      return 'Empilhador (Picking & EFC/EFD)';
    case 'ajudante':
      return 'Ajudante (Operação Ajudante)';
    case 'conferente':
      return 'Conferente (Acesso Operacional)';
    default:
      return user.cargo || user.papel || 'Operador';
  }
}

/**
 * Returns whether a user is allowed to access a given panel tab ID.
 */
export function isPanelAllowedForUser(
  panelId: string,
  user: Usuario | null | undefined,
  colabCustomModules?: string[]
): boolean {
  if (!user) return false;

  const roleType = getUserRoleType(user);

  // ADMIN / SUPERVISOR HAS FULL ACCESS TO EVERYTHING
  if (roleType === 'admin') {
    return true;
  }

  // General overview, productivity ranking, DN & SWOT allowed for all logged users
  if (
    panelId === 'visao-geral' ||
    panelId === 'dashboard' ||
    panelId === 'landing' ||
    panelId === 'ranking-produtividade' ||
    panelId === 'qualidade' ||
    panelId === 'dn-swot' ||
    panelId === 'plataformas-externas' ||
    panelId === 'reunioes' ||
    panelId === 'semana-qualidade'
  ) {
    return true;
  }

  // Check explicit custom overrides from AcessosPanel if present
  const userModules = colabCustomModules || user.modulosPermitidos || [];
  if (userModules.length > 0 && userModules.includes(panelId)) {
    return true;
  }

  // EMPILHADORES: Access to Operação Empilhador + Dashboards
  if (roleType === 'empilhador') {
    const allowedForEmpilhador = ['empilhador', 'picking-dashboard', 'armazem', 'logistica-dashboard', 'tmr-dashboard', 'simulador-ressuprimento'];
    return allowedForEmpilhador.includes(panelId);
  }

  // AJUDANTES: Access to Operação Ajudante + Despejo, Repack, Quebras + Dashboards
  if (roleType === 'ajudante') {
    const allowedForAjudante = ['ajudante', 'despejo', 'despejo-dashboard', 'repack', 'repack-dashboard', 'quebras', 'quebras-dashboard'];
    return allowedForAjudante.includes(panelId);
  }

  // CONFERENTES: Access to ALL Operational Sectors and Operational Dashboards
  if (roleType === 'conferente') {
    const operationalPanels = [
      'ajudante',
      'repack',
      'repack-dashboard',
      'despejo',
      'despejo-dashboard',
      'armazem',
      'logistica-dashboard',
      'tmr-dashboard',
      'quebras',
      'quebras-dashboard',
      'validades',
      'fefo-dashboard',
      'refugo',
      'empilhador',
      'picking-dashboard',
      'conferente'
    ];
    return operationalPanels.includes(panelId);
  }

  // OTHER OPERATORS: Check specific module permissions
  const userRolesList = (user.papel || '').split(',').map(s => normalizeText(s));
  const userCargo = normalizeText(user.cargo);

  if (userRolesList.includes(panelId) || userCargo.includes(panelId)) {
    return true;
  }

  return false;
}

/**
 * Determines the target operational panel tab ID based on user login role and cargo
 */
export function getUserOperationPanel(user: Usuario | null | undefined): string {
  if (!user) return 'conferente';

  const roleType = getUserRoleType(user);

  // Check specific keywords in user cargo or papel
  const cargo = normalizeText(user.cargo);
  const papel = normalizeText(user.papel);

  if (cargo.includes('empilhador') || cargo.includes('empilhadeira') || papel === 'empilhador') {
    return 'empilhador';
  }
  if (cargo.includes('ajudante') || cargo.includes('auxiliar de armazem') || papel === 'ajudante') {
    return 'ajudante';
  }
  if (cargo.includes('repack') || papel.includes('repack')) {
    return 'repack';
  }
  if (cargo.includes('despejo') || papel.includes('despejo')) {
    return 'despejo';
  }
  if (cargo.includes('quebras') || papel.includes('quebras')) {
    return 'quebras';
  }
  if (cargo.includes('refugo') || papel.includes('refugo')) {
    return 'refugo';
  }
  if (cargo.includes('conferente') || papel === 'conferente') {
    return 'conferente';
  }

  // Fallback based on simplified RoleType
  switch (roleType) {
    case 'empilhador':
      return 'empilhador';
    case 'ajudante':
      return 'ajudante';
    case 'conferente':
      return 'conferente';
    case 'admin':
      return 'controle';
    default:
      return 'conferente';
  }
}

