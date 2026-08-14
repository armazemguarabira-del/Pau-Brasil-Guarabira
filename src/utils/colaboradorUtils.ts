import { LISTA_COLABORADORES_OFICIAIS } from '../components/RankingModule';
import { ColaboradorMaster } from '../types';

/**
 * Normalizes a raw collaborator name string by matching against the master registered list of collaborators.
 * Example: "mARIVALDO mARIVALDO" -> "MARIVALDO ARTUR ALVES"
 * Example: "Nixon Arruda" -> "NIXON HENRIQUE PEREIRA DE ARRUDA"
 * Example: "Paulo Pereira" -> "PAULO PEREIRA DA SILVA"
 * If no registered collaborator matches, retains the cleaned original name.
 */
export function normalizeCollaboratorName(rawName: string, customColabs?: ColaboradorMaster[]): string {
  if (!rawName || !rawName.trim()) return '';

  let cleaned = rawName.trim().replace(/\s+/g, ' ');

  // Remove duplicated consecutive words (e.g., "MARIVALDO MARIVALDO" -> "MARIVALDO")
  const tokens = cleaned.split(' ');
  const uniqueTokens: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const currentUpper = tokens[i].toUpperCase();
    const prevUpper = i > 0 ? tokens[i - 1].toUpperCase() : '';
    if (currentUpper !== prevUpper) {
      uniqueTokens.push(tokens[i]);
    }
  }
  cleaned = uniqueTokens.join(' ').toUpperCase();

  // Explicit Alias Mappings (e.g. Romildo / Ronildo -> JOSE RONILDO DA SILVA)
  if (cleaned === 'ROMILDO' || cleaned === 'RONILDO' || cleaned === 'JOSE RONILDO' || cleaned === 'JOSÉ RONILDO' || cleaned.includes('ROMILDO') || cleaned.includes('RONILDO')) {
    cleaned = 'JOSE RONILDO DA SILVA';
  }

  // Combine official list with custom registered list
  const masterNames: string[] = [];
  LISTA_COLABORADORES_OFICIAIS.forEach(c => {
    if (c.nome && !masterNames.includes(c.nome)) {
      masterNames.push(c.nome.toUpperCase().trim());
    }
  });

  if (customColabs && Array.isArray(customColabs)) {
    customColabs.forEach(c => {
      if (c.nome) {
        const u = c.nome.toUpperCase().trim();
        if (!masterNames.includes(u)) {
          masterNames.push(u);
        }
      }
    });
  }

  // Also check localStorage colaboradores if available
  try {
    const savedKeys = Object.keys(localStorage).filter(k => k.startsWith('colaboradores_'));
    for (const key of savedKeys) {
      const saved = localStorage.getItem(key);
      if (saved) {
        const list = JSON.parse(saved);
        if (Array.isArray(list)) {
          list.forEach((c: any) => {
            if (c.nome) {
              const u = String(c.nome).toUpperCase().trim();
              if (!masterNames.includes(u)) {
                masterNames.push(u);
              }
            }
          });
        }
      }
    }
  } catch (e) {}

  // 1. Direct exact match
  const exactMatch = masterNames.find(n => n === cleaned);
  if (exactMatch) return exactMatch;

  // 2. Token / Similarity match
  const cleanedTokens = cleaned.split(' ').filter(t => t.length > 2);
  let bestMatch: string | null = null;
  let highestScore = 0;

  for (const officialName of masterNames) {
    const officialTokens = officialName.split(' ');

    // Calculate token match ratio
    let matchedTokenCount = 0;
    cleanedTokens.forEach(ct => {
      if (officialTokens.some(ot => ot === ct || ot.startsWith(ct) || ct.startsWith(ot))) {
        matchedTokenCount++;
      }
    });

    if (cleanedTokens.length > 0) {
      const score = matchedTokenCount / Math.max(cleanedTokens.length, 1);
      // If all tokens in the input match the official name, or score >= 0.6
      if (score > highestScore && (score >= 0.6 || matchedTokenCount >= 2)) {
        highestScore = score;
        bestMatch = officialName;
      }
    }
  }

  // Fallback: If input starts with a first name (e.g. "MARIVALDO") and there's only one collaborator with that first name
  if (!bestMatch && cleanedTokens.length >= 1) {
    const firstName = cleanedTokens[0];
    const matchesWithFirstName = masterNames.filter(n => n.startsWith(firstName));
    if (matchesWithFirstName.length === 1) {
      return matchesWithFirstName[0];
    }
  }

  return bestMatch || cleaned;
}

/**
 * Normalizes all collaborator name fields inside a dataset of records.
 */
export function normalizeCollaboratorNamesInRecords<T extends Record<string, any>>(
  records: T[],
  nameFields: string[],
  customColabs?: ColaboradorMaster[]
): T[] {
  if (!Array.isArray(records) || records.length === 0) return records;

  return records.map(record => {
    const updated = { ...record };
    let hasChanges = false;

    nameFields.forEach(field => {
      if (typeof updated[field] === 'string' && updated[field].trim()) {
        const original = updated[field];
        const normalized = normalizeCollaboratorName(original, customColabs);
        if (normalized && normalized !== original) {
          (updated as any)[field] = normalized;
          hasChanges = true;
        }
      }
    });

    return updated;
  });
}

/**
 * Checks if a collaborator exists in the official list or stored custom list, returning official cargo and name
 */
export function getCollaboratorOfficialInfo(rawOrNormName: string, empresaId: string = 'demo'): { isRegistered: boolean; cargo: string; nomeOficial: string } {
  const norm = normalizeCollaboratorName(rawOrNormName);
  if (!norm) return { isRegistered: false, cargo: '', nomeOficial: rawOrNormName };

  // 1. Check custom colaboradores saved in localStorage (contains updated cargos from imports/edits)
  try {
    const saved = localStorage.getItem(`colaboradores_${empresaId}`);
    if (saved) {
      const list = JSON.parse(saved);
      if (Array.isArray(list)) {
        const match = list.find((c: any) => c.nome && String(c.nome).toUpperCase().trim() === norm.toUpperCase().trim());
        if (match && match.cargo) {
          let cUpper = String(match.cargo).toUpperCase();
          let cForm = match.cargo;
          if (cUpper.includes('EMPILHA')) cForm = 'Empilhador';
          else if (cUpper.includes('CONFEREN')) cForm = 'Conferente';
          else if (cUpper.includes('AJUDAN') || cUpper.includes('AUXILIAR')) cForm = 'Ajudante';
          return { isRegistered: true, cargo: cForm, nomeOficial: match.nome };
        }
      }
    }
  } catch (e) {}

  // 2. Check official static list
  const official = LISTA_COLABORADORES_OFICIAIS.find(c => c.nome.toUpperCase().trim() === norm.toUpperCase().trim());
  if (official) {
    return { isRegistered: true, cargo: official.cargo, nomeOficial: official.nome };
  }

  return { isRegistered: false, cargo: '', nomeOficial: norm };
}

/**
 * Performs a quick registration or cargo update for a collaborator
 */
export function registerQuickCollaborator(nome: string, cargo: string, empresaId: string = 'demo'): void {
  const cleanName = nome.toUpperCase().trim();
  let cleanCargo = (cargo || 'Ajudante').trim();
  const upperC = cleanCargo.toUpperCase();
  if (upperC.includes('EMPILHA')) cleanCargo = 'Empilhador';
  else if (upperC.includes('CONFEREN')) cleanCargo = 'Conferente';
  else if (upperC.includes('AJUDAN') || upperC.includes('AUXILIAR')) cleanCargo = 'Ajudante';

  if (!cleanName) return;

  const key = `colaboradores_${empresaId}`;
  let list: any[] = [];
  try {
    const saved = localStorage.getItem(key);
    if (saved) list = JSON.parse(saved);
  } catch (e) {}

  if (!Array.isArray(list)) list = [];

  const existingIdx = list.findIndex(c => String(c.nome).toUpperCase().trim() === cleanName);
  const funcaoGrp = cleanCargo === 'Empilhador' ? 'Empilhador' : (cleanCargo === 'Conferente' ? 'Operador' : 'Ajudante');

  if (existingIdx >= 0) {
    list[existingIdx] = { 
      ...list[existingIdx], 
      cargo: cleanCargo,
      funcaoGroup: funcaoGrp,
      atualizadoEm: new Date().toISOString()
    };
  } else {
    list.push({
      matricula: `G${1100 + list.length + Math.floor(Math.random() * 800)}`,
      nome: cleanName,
      cargo: cleanCargo,
      turno: 'MANHÃ',
      funcaoGroup: funcaoGrp,
      criadoEm: new Date().toISOString()
    });
  }

  localStorage.setItem(key, JSON.stringify(list));
  window.dispatchEvent(new Event('colaboradores_updated'));
  window.dispatchEvent(new Event('storage'));
}

