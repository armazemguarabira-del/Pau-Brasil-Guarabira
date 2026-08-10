import { db } from '../firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

export interface EfcEfdVehicle {
  id: string;
  placa: string;
  dataEntrega: string; // DD/MM/YYYY
  dataEntregaISO: string; // YYYY-MM-DD
  tipoVeiculo: string;
  motorista: string;
  caixas: number;
  totalCaixas?: number;
  peso: number;
  mapa: string;
  empresaId: string;
  
  // Carregamento (EFC) - Target 06:30
  statusCarregamento: 'Pendente' | 'Em Carregamento' | 'Finalizado';
  horaInicioCarregamento?: string; // e.g. "05:15"
  horaFimCarregamento?: string; // e.g. "06:10"
  efcCompliant?: boolean; // true if horaFim <= "06:30"
  
  // Descarregamento (EFD) - Target 22:00
  statusDescarregamento: 'Pendente' | 'Em Descarregamento' | 'Finalizado' | 'Pernoite';
  horaInicioDescarregamento?: string; // e.g. "18:20"
  horaFimDescarregamento?: string; // e.g. "21:40"
  efdCompliant?: boolean; // true if horaFim <= "22:00"
  
  // Pernoite & D1/D2/D3/D4 tracking
  pernoiteMarked?: boolean;
  pernoiteStatus?: 'D1' | 'D2' | 'D3' | 'D4';
  diasAtraso?: number;
  observacaoPernoite?: string;

  // Carga & Execução por Empilhador Logado
  tipoCarga?: 'Rota Comercial' | 'Recarga' | 'Terceiros' | string;
  isRecarga?: boolean;
  operadorDesignado?: string; // "TODOS" or specific names
  operadoresAtribuidos?: string[]; // Multiple operators assigned by conferente
  operadoresExecutoresCarregamento?: string[]; // All empilhadores who assumed loading
  operadoresExecutoresDescarregamento?: string[]; // All empilhadores who assumed unloading
  operadorExecutorCarregamento?: string;
  operadorExecutorDescarregamento?: string;
  duracaoCarregamentoMin?: number;
  duracaoDescarregamentoMin?: number;
  timestampInicioCarregamento?: string; // ISO string
  timestampFimCarregamento?: string; // ISO string
  timestampInicioDescarregamento?: string; // ISO string
  timestampFimDescarregamento?: string; // ISO string
}

const VEHICLES_STORAGE_PREFIX = 'efc_efd_vehicles_';

export function getStoredEfcVehicles(companyId: string = 'demo'): EfcEfdVehicle[] {
  try {
    const saved = localStorage.getItem(`${VEHICLES_STORAGE_PREFIX}${companyId}`);
    if (saved) {
      const parsed: EfcEfdVehicle[] = JSON.parse(saved);
      // Re-evaluate D1-D4 delays dynamically based on today's date and deduplicate by ID
      const todayISO = new Date().toISOString().split('T')[0];
      const seenIds = new Set<string>();
      const uniqueVehicles: EfcEfdVehicle[] = [];
      for (const v of parsed) {
        if (v && v.id && !seenIds.has(v.id)) {
          seenIds.add(v.id);
          uniqueVehicles.push(updateVehicleDelayStatus(v, todayISO));
        }
      }
      return uniqueVehicles;
    }
  } catch (e) {
    console.error('Error loading EFC/EFD vehicles:', e);
  }
  return [];
}

export function saveEfcVehicles(companyId: string = 'demo', vehicles: EfcEfdVehicle[]) {
  try {
    // Deduplicate vehicles by ID
    const seenIds = new Set<string>();
    const uniqueVehicles: EfcEfdVehicle[] = [];
    for (const v of vehicles) {
      if (v && v.id && !seenIds.has(v.id)) {
        seenIds.add(v.id);
        uniqueVehicles.push(v);
      }
    }

    localStorage.setItem(`${VEHICLES_STORAGE_PREFIX}${companyId}`, JSON.stringify(uniqueVehicles));
    window.dispatchEvent(new Event('efc_vehicles_updated'));

    if (db) {
      const docRef = doc(db, 'efc_efd_vehicles', companyId);
      setDoc(docRef, {
        vehicles: uniqueVehicles,
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch(err => {
        console.warn('Error syncing efc_efd_vehicles to Firestore:', err);
      });
    }
  } catch (e) {
    console.error('Error saving EFC/EFD vehicles:', e);
  }
}

export function subscribeToEfcVehicles(companyId: string = 'demo', callback: (vehicles: EfcEfdVehicle[]) => void): () => void {
  // 1. Initial local callback
  callback(getStoredEfcVehicles(companyId));

  // 2. Local window events listener
  const handleLocal = () => {
    callback(getStoredEfcVehicles(companyId));
  };

  window.addEventListener('efc_vehicles_updated', handleLocal);
  window.addEventListener('storage', handleLocal);
  window.addEventListener('local_data_changed', handleLocal);

  // 3. Firestore onSnapshot real-time listener
  let unsubFirestore: (() => void) | null = null;
  if (db) {
    try {
      const docRef = doc(db, 'efc_efd_vehicles', companyId);
      unsubFirestore = onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (Array.isArray(data?.vehicles)) {
            const todayISO = new Date().toISOString().split('T')[0];
            const seenIds = new Set<string>();
            const updated: EfcEfdVehicle[] = [];
            for (const v of data.vehicles) {
              if (v && v.id && !seenIds.has(v.id)) {
                seenIds.add(v.id);
                updated.push(updateVehicleDelayStatus(v, todayISO));
              }
            }
            try {
              localStorage.setItem(`${VEHICLES_STORAGE_PREFIX}${companyId}`, JSON.stringify(updated));
            } catch (e) {}
            callback(updated);
          }
        }
      }, (err) => {
        console.warn('Firestore subscription warning for efc_efd_vehicles:', err);
      });
    } catch (e) {
      console.warn('Could not attach Firestore listener for efc_efd_vehicles:', e);
    }
  }

  return () => {
    window.removeEventListener('efc_vehicles_updated', handleLocal);
    window.removeEventListener('storage', handleLocal);
    window.removeEventListener('local_data_changed', handleLocal);
    if (unsubFirestore) {
      unsubFirestore();
    }
  };
}

export function mergeNewEfcVehicles(companyId: string = 'demo', newVehicles: EfcEfdVehicle[]): EfcEfdVehicle[] {
  const existing = getStoredEfcVehicles(companyId);
  const todayISO = new Date().toISOString().split('T')[0];

  const mapById = new Map<string, EfcEfdVehicle>();

  // Preserve non-finalized pernoite/pending vehicles from previous days
  for (const v of existing) {
    if (
      (v.statusDescarregamento === 'Pernoite' || v.pernoiteMarked === true || v.statusCarregamento !== 'Finalizado') &&
      v.dataEntregaISO !== todayISO
    ) {
      mapById.set(v.id, updateVehicleDelayStatus(v, todayISO));
    }
  }

  // Overwrite/add newly imported vehicles safely
  for (const nv of newVehicles) {
    if (nv && nv.id) {
      mapById.set(nv.id, nv);
    }
  }

  const combined = Array.from(mapById.values());
  saveEfcVehicles(companyId, combined);
  return combined;
}


export function updateVehicleDelayStatus(v: EfcEfdVehicle, todayISO: string): EfcEfdVehicle {
  if (!v.dataEntregaISO) return v;

  const deliveryDate = new Date(v.dataEntregaISO + 'T00:00:00');
  const currentDate = new Date(todayISO + 'T00:00:00');
  const diffTime = currentDate.getTime() - deliveryDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 3600 * 24));

  if (diffDays > 0 && v.statusDescarregamento !== 'Finalizado') {
    let pernoiteStatus: 'D1' | 'D2' | 'D3' | 'D4' = 'D1';
    if (diffDays === 1) pernoiteStatus = 'D1';
    else if (diffDays === 2) pernoiteStatus = 'D2';
    else if (diffDays === 3) pernoiteStatus = 'D3';
    else if (diffDays >= 4) pernoiteStatus = 'D4';

    return {
      ...v,
      diasAtraso: diffDays,
      pernoiteStatus,
      pernoiteMarked: v.pernoiteMarked ?? true
    };
  }

  return v;
}

export function parse03114902Report(fileText: string, companyId: string = 'demo'): EfcEfdVehicle[] {
  const lines = fileText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 2) return [];

  // Header parsing
  const headers = lines[0].split(';').map(h => h.trim().toLowerCase());
  
  const placaIdx = headers.findIndex(h => h.includes('placa'));
  const dataIdx = headers.findIndex(h => h.includes('data') && h.includes('entrega'));
  const veiculoIdx = headers.findIndex(h => h.includes('vecul') || h.includes('veicul'));
  const motoristaIdx = headers.findIndex(h => h.includes('motorista'));
  const caixasIdx = headers.findIndex(h => h.includes('caixa'));
  const pesoIdx = headers.findIndex(h => h.includes('peso'));
  const mapaIdx = headers.findIndex(h => h.includes('mapa'));

  const vehicles: EfcEfdVehicle[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(';');
    if (cols.length < 5) continue;

    const rawPlaca = placaIdx >= 0 ? cols[placaIdx] : (cols[12] || '');
    const cleanPlaca = rawPlaca.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!cleanPlaca || cleanPlaca.length < 5) continue;

    const rawData = dataIdx >= 0 ? cols[dataIdx] : (cols[4] || '');
    let dataEntrega = rawData.trim(); // DD/MM/YYYY
    let dataEntregaISO = '';

    if (dataEntrega.includes('/')) {
      const parts = dataEntrega.split('/');
      if (parts.length === 3) {
        dataEntregaISO = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    } else if (dataEntrega.includes('-')) {
      dataEntregaISO = dataEntrega;
      const parts = dataEntrega.split('-');
      if (parts.length === 3) {
        dataEntrega = `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }

    if (!dataEntregaISO) {
      const now = new Date();
      dataEntregaISO = now.toISOString().split('T')[0];
      dataEntrega = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
    }

    const tipoVeiculo = (veiculoIdx >= 0 ? cols[veiculoIdx] : cols[11] || 'Truck').trim();
    const motorista = (motoristaIdx >= 0 ? cols[motoristaIdx] : cols[14] || 'A Definir').trim();
    const caixas = caixasIdx >= 0 ? parseFloat(cols[caixasIdx].replace(',', '.')) || 0 : 0;
    const peso = pesoIdx >= 0 ? parseFloat(cols[pesoIdx].replace(',', '.')) || 0 : 0;
    const mapa = mapaIdx >= 0 ? cols[mapaIdx].trim() : cols[6] || `M-${i}`;

    vehicles.push({
      id: `veic_${cleanPlaca}_${dataEntregaISO}_${i}`,
      placa: cleanPlaca,
      dataEntrega,
      dataEntregaISO,
      tipoVeiculo,
      motorista,
      caixas,
      totalCaixas: caixas,
      peso,
      mapa,
      empresaId: companyId,
      statusCarregamento: 'Pendente',
      statusDescarregamento: 'Pendente'
    });
  }

  return vehicles;
}

export function calculateEfcMetrics(vehicles: EfcEfdVehicle[]) {
  // Exclude Recarga vehicles from EFC total calculation
  const efcVehiclesOnly = vehicles.filter(v => !(v.isRecarga || v.tipoCarga === 'Recarga'));

  if (efcVehiclesOnly.length === 0) {
    return {
      pctEfc: 100,
      efcReal: 100.0,
      total: 0,
      totalImportados: vehicles.length,
      recargasCount: vehicles.length - efcVehiclesOnly.length,
      compliants: 0,
      noPrazo: 0,
      pending: 0,
      late: 0,
      atrasados: 0
    };
  }

  const total = efcVehiclesOnly.length;
  const finalized = efcVehiclesOnly.filter(v => v.statusCarregamento === 'Finalizado');
  const compliants = finalized.filter(v => v.efcCompliant === true || (v.horaFimCarregamento && v.horaFimCarregamento <= '06:30')).length;
  const late = finalized.filter(v => v.efcCompliant === false || (v.horaFimCarregamento && v.horaFimCarregamento > '06:30')).length;
  const pending = total - finalized.length;

  const pctEfc = total > 0 ? (compliants / total) * 100 : 100;

  return {
    pctEfc,
    efcReal: pctEfc,
    total,
    totalImportados: vehicles.length,
    recargasCount: vehicles.length - total,
    compliants,
    noPrazo: compliants,
    pending,
    late,
    atrasados: late
  };
}

export function calculateEfdMetrics(vehicles: EfcEfdVehicle[]) {
  if (vehicles.length === 0) {
    return {
      pctEfd: 100,
      efdReal: 100.0,
      totalRoute: 0,
      totalParaEfd: 0,
      totalEvaluated: 1,
      compliants: 0,
      noPrazo: 0,
      pending: 0,
      pernoites: 0,
      late: 0
    };
  }

  // Route vehicles exclude pernoites marked from being failures on the same day
  const totalRoute = vehicles.length;
  const pernoites = vehicles.filter(v => v.statusDescarregamento === 'Pernoite' || v.pernoiteMarked === true).length;
  
  // Total considered for daily EFD calculation (excluding pernoite/D1 from failure penalty)
  const totalEvaluated = Math.max(1, totalRoute - pernoites);
  const finalized = vehicles.filter(v => v.statusDescarregamento === 'Finalizado');
  const compliants = finalized.filter(v => v.efdCompliant === true || (v.horaFimDescarregamento && v.horaFimDescarregamento <= '22:00')).length;
  
  const late = vehicles.filter(v => 
    v.statusDescarregamento === 'Finalizado' && v.horaFimDescarregamento && v.horaFimDescarregamento > '22:00'
  ).length;

  const pending = totalRoute - finalized.length - pernoites;

  const pctEfd = (compliants / totalEvaluated) * 100;

  return {
    pctEfd,
    efdReal: pctEfd,
    totalRoute,
    totalParaEfd: totalRoute,
    totalEvaluated,
    compliants,
    noPrazo: compliants,
    pending,
    pernoites,
    late
  };
}
