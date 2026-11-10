import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistStorage, storageKey } from './storage';

export const INDUSTRIES = ['government', 'banking', 'healthcare', 'energy', 'telecom', 'retail', 'education', 'manufacturing', 'msp', 'other'] as const;
export type Industry = (typeof INDUSTRIES)[number];

export const CURRENT_TOOLS = ['international', 'openSource', 'inHouse', 'msp', 'none', 'other'] as const;
export type CurrentTool = (typeof CURRENT_TOOLS)[number];

export const ROLES = ['cio', 'itManager', 'networkEngineer', 'sysAdmin', 'security', 'mspOwner', 'procurement', 'other'] as const;
export type Role = (typeof ROLES)[number];

export interface Lead {
  id: string;
  createdAt: number;
  name: string;
  company: string;
  role: Role;
  industry: Industry;
  devices: number;
  currentTool: CurrentTool;
  currentToolName: string;
  painPoint: string;
  email: string;
  phone: string;
  /** UI language when the lead was captured. */
  lang: string;
  /** Page the form was opened from. */
  source: string;
}

interface LeadsState {
  leads: Lead[];
  add: (lead: Omit<Lead, 'id' | 'createdAt'>) => Lead;
  remove: (id: string) => void;
  clear: () => void;
}

/** Early-access submissions live only in this browser's localStorage. */
export const useLeads = create<LeadsState>()(
  persist(
    (set) => ({
      leads: [],
      add: (input) => {
        const lead: Lead = { ...input, id: `lead-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, createdAt: Date.now() };
        set((s) => ({ leads: [lead, ...s.leads] }));
        return lead;
      },
      remove: (id) => set((s) => ({ leads: s.leads.filter((l) => l.id !== id) })),
      clear: () => set({ leads: [] }),
    }),
    { name: storageKey('leads'), storage: persistStorage, version: 1 },
  ),
);
