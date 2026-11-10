import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistStorage, storageKey } from './storage';

export type Lang = 'ar' | 'en';
export type Theme = 'dark' | 'light';
export type CalendarPref = 'gregorian' | 'hijri' | 'both';
export type ClockPref = '24h' | '12h';
export type NotifyChannel = 'email' | 'sms' | 'whatsapp' | 'chatops';
export const NOTIFY_CHANNELS: readonly NotifyChannel[] = ['email', 'sms', 'whatsapp', 'chatops'] as const;

export interface SettingsState {
  lang: Lang;
  theme: Theme;
  calendar: CalendarPref;
  clock: ClockPref;
  liveUpdates: boolean;
  notifications: Record<NotifyChannel, boolean>;
  contacts: { email: string; phone: string; webhook: string };
  sidebarCollapsed: boolean;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setCalendar: (c: CalendarPref) => void;
  setClock: (c: ClockPref) => void;
  setLiveUpdates: (v: boolean) => void;
  setNotification: (ch: NotifyChannel, v: boolean) => void;
  setContact: (k: keyof SettingsState['contacts'], v: string) => void;
  setSidebarCollapsed: (v: boolean) => void;
}

/** Arabic-first: the demo opens in Arabic with the dark NOC theme. */
export const DEFAULT_LANG: Lang = 'ar';
export const DEFAULT_THEME: Theme = 'dark';

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      lang: DEFAULT_LANG,
      theme: DEFAULT_THEME,
      calendar: 'gregorian',
      clock: '24h',
      liveUpdates: true,
      notifications: { email: true, sms: true, whatsapp: false, chatops: false },
      contacts: { email: 'noc@example.sa', phone: '+966 5X XXX XXXX', webhook: '' },
      sidebarCollapsed: false,
      setLang: (lang) => set({ lang }),
      toggleLang: () => set((s) => ({ lang: s.lang === 'ar' ? 'en' : 'ar' })),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      setCalendar: (calendar) => set({ calendar }),
      setClock: (clock) => set({ clock }),
      setLiveUpdates: (liveUpdates) => set({ liveUpdates }),
      setNotification: (ch, v) => set((s) => ({ notifications: { ...s.notifications, [ch]: v } })),
      setContact: (k, v) => set((s) => ({ contacts: { ...s.contacts, [k]: v } })),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
    }),
    { name: storageKey('settings'), storage: persistStorage, version: 1 },
  ),
);
