import { useState, useEffect } from 'react';

export interface SystemTargets {
  efc: number; // 96%
  efd: number; // 90%
  refugo: number; // 1.0%
  fefo: number; // 98%
  wqi: number; // 95%
  repack_produtividade: number; // 85 cx/h
  picking_produtividade: number; // 180 cx/h
  despejo_produtividade: number; // 150 cx/h
  quebras_limite: number; // 0.15%
  acuracidade_inventario: number; // 99.5%
  capacidade_ocupacao: number; // 85%
  montagem_produtividade: number; // 95%
  tmr_carreta: number; // 150 min (2h30)
  tmr_recarga: number; // 50 min
  tmr_terceiros: number; // 150 min (2h30)
  [key: string]: number;
}

export const DEFAULT_TARGETS: SystemTargets = {
  efc: 96,
  efd: 90,
  refugo: 1.0,
  fefo: 98,
  wqi: 95,
  repack_produtividade: 85,
  picking_produtividade: 180,
  despejo_produtividade: 150,
  quebras_limite: 0.15,
  acuracidade_inventario: 99.5,
  capacidade_ocupacao: 85,
  montagem_produtividade: 95,
  tmr_carreta: 150,
  tmr_recarga: 50,
  tmr_terceiros: 150
};

const TARGETS_STORAGE_KEY = 'dpo_system_targets_v1';

export function getSystemTargets(): SystemTargets {
  try {
    const saved = localStorage.getItem(TARGETS_STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_TARGETS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Error loading targets:', e);
  }
  return { ...DEFAULT_TARGETS };
}

export function setSystemTarget(key: string, value: number) {
  try {
    const current = getSystemTargets();
    current[key] = value;
    localStorage.setItem(TARGETS_STORAGE_KEY, JSON.stringify(current));
    window.dispatchEvent(new Event('dpo_targets_updated'));
  } catch (e) {
    console.error('Error saving target:', e);
  }
}

export function resetToAchievableTargets(): SystemTargets {
  try {
    localStorage.setItem(TARGETS_STORAGE_KEY, JSON.stringify(DEFAULT_TARGETS));
    window.dispatchEvent(new Event('dpo_targets_updated'));
  } catch (e) {
    console.error('Error resetting targets:', e);
  }
  return { ...DEFAULT_TARGETS };
}

export function useSystemTargets() {
  const [targets, setTargets] = useState<SystemTargets>(getSystemTargets);

  useEffect(() => {
    const handleUpdate = () => {
      setTargets(getSystemTargets());
    };
    window.addEventListener('dpo_targets_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('dpo_targets_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const updateTarget = (key: string, val: number) => {
    setSystemTarget(key, val);
  };

  const resetTargets = () => {
    setTargets(resetToAchievableTargets());
  };

  return { targets, updateTarget, resetTargets };
}
