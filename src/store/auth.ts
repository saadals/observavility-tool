import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistStorage, storageKey } from './storage';

export interface DemoUser {
  name: string;
  email: string;
  org: string;
}

interface AuthState {
  user: DemoUser | null;
  login: (email: string) => void;
  logout: () => void;
}

/** Fake auth: any credentials work. The display name is derived from the e-mail. */
export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      login: (email) => {
        const local = (email.split('@')[0] || 'demo').replace(/[._-]+/g, ' ').trim();
        const name = local
          .split(' ')
          .filter(Boolean)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
        set({ user: { name: name || 'Demo User', email: email || 'demo@example.sa', org: 'Demo Organization' } });
      },
      logout: () => set({ user: null }),
    }),
    { name: storageKey('auth'), storage: persistStorage, version: 1 },
  ),
);
