import { createJSONStorage, type StateStorage } from 'zustand/middleware';
import { storageKey } from '@/config/brand';

/** In-memory fallback for build-time rendering or browsers with storage disabled. */
const memory = new Map<string, string>();
const memoryStorage: StateStorage = {
  getItem: (k) => memory.get(k) ?? null,
  setItem: (k, v) => void memory.set(k, v),
  removeItem: (k) => void memory.delete(k),
};

function browserStorage(): StateStorage {
  if (typeof window === 'undefined') return memoryStorage;
  try {
    const probe = storageKey('__probe');
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return memoryStorage;
  }
}

export const persistStorage = createJSONStorage(browserStorage);
export { storageKey };
