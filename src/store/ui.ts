import { create } from 'zustand';

export type ToastKind = 'success' | 'info' | 'warning' | 'error';

export interface Toast {
  id: number;
  kind: ToastKind;
  /** Either a ready string or a translation key (+ params). */
  title?: string;
  titleKey?: string;
  body?: string;
  bodyKey?: string;
  params?: Record<string, string | number>;
  href?: string;
}

interface UiState {
  earlyAccessOpen: boolean;
  earlyAccessSource: string;
  mobileNavOpen: boolean;
  toasts: Toast[];
  openEarlyAccess: (source: string) => void;
  closeEarlyAccess: () => void;
  setMobileNav: (open: boolean) => void;
  pushToast: (t: Omit<Toast, 'id'>, ttlMs?: number) => void;
  dismissToast: (id: number) => void;
}

let toastSeq = 0;

export const useUi = create<UiState>()((set, get) => ({
  earlyAccessOpen: false,
  earlyAccessSource: '',
  mobileNavOpen: false,
  toasts: [],
  openEarlyAccess: (source) => set({ earlyAccessOpen: true, earlyAccessSource: source }),
  closeEarlyAccess: () => set({ earlyAccessOpen: false }),
  setMobileNav: (mobileNavOpen) => set({ mobileNavOpen }),
  pushToast: (t, ttlMs = 4500) => {
    const id = ++toastSeq;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { ...t, id }] }));
    if (typeof window !== 'undefined') window.setTimeout(() => get().dismissToast(id), ttlMs);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = (t: Omit<Toast, 'id'>, ttlMs?: number) => useUi.getState().pushToast(t, ttlMs);
