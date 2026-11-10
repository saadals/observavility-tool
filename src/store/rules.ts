import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AlertSeverity } from '@/mock';
import { persistStorage, storageKey } from './storage';
import type { NotifyChannel } from './settings';

export const RULE_METRICS = ['cpu', 'mem', 'disk', 'latency', 'loss', 'temp', 'bwUtil', 'battery', 'status'] as const;
export type RuleMetric = (typeof RULE_METRICS)[number];
export const RULE_OPERATORS = ['gt', 'gte', 'lt', 'lte'] as const;
export type RuleOperator = (typeof RULE_OPERATORS)[number];
export type RuleScope = 'all' | 'site' | 'type';

export interface AlertRule {
  id: string;
  /** Free-text name for user-created rules. */
  name: string;
  /** Translation key for the seeded default rules (takes precedence over `name`). */
  nameKey?: string;
  metric: RuleMetric;
  operator: RuleOperator;
  threshold: number;
  durationMin: number;
  severity: AlertSeverity;
  scope: RuleScope;
  scopeValue: string;
  channels: NotifyChannel[];
  businessHoursOnly: boolean;
  enabled: boolean;
  createdAt: number;
}

const now = Date.now();
const DEFAULT_RULES: AlertRule[] = [
  { id: 'r-1', name: '', nameKey: 'rules.defaults.r1', metric: 'status', operator: 'gt', threshold: 0, durationMin: 2, severity: 'critical', scope: 'all', scopeValue: '', channels: ['sms', 'whatsapp', 'email'], businessHoursOnly: false, enabled: true, createdAt: now - 80 * 86_400_000 },
  { id: 'r-2', name: '', nameKey: 'rules.defaults.r2', metric: 'cpu', operator: 'gt', threshold: 85, durationMin: 10, severity: 'warning', scope: 'type', scopeValue: 'server', channels: ['email', 'chatops'], businessHoursOnly: false, enabled: true, createdAt: now - 60 * 86_400_000 },
  { id: 'r-3', name: '', nameKey: 'rules.defaults.r3', metric: 'disk', operator: 'gte', threshold: 90, durationMin: 15, severity: 'warning', scope: 'all', scopeValue: '', channels: ['email'], businessHoursOnly: false, enabled: true, createdAt: now - 58 * 86_400_000 },
  { id: 'r-4', name: '', nameKey: 'rules.defaults.r4', metric: 'latency', operator: 'gt', threshold: 40, durationMin: 5, severity: 'warning', scope: 'type', scopeValue: 'edgeRouter', channels: ['chatops'], businessHoursOnly: true, enabled: true, createdAt: now - 41 * 86_400_000 },
  { id: 'r-5', name: '', nameKey: 'rules.defaults.r5', metric: 'loss', operator: 'gt', threshold: 1, durationMin: 5, severity: 'warning', scope: 'all', scopeValue: '', channels: ['email', 'chatops'], businessHoursOnly: false, enabled: true, createdAt: now - 30 * 86_400_000 },
  { id: 'r-6', name: '', nameKey: 'rules.defaults.r6', metric: 'battery', operator: 'lt', threshold: 95, durationMin: 1, severity: 'critical', scope: 'type', scopeValue: 'ups', channels: ['sms', 'whatsapp'], businessHoursOnly: false, enabled: true, createdAt: now - 22 * 86_400_000 },
  { id: 'r-7', name: '', nameKey: 'rules.defaults.r7', metric: 'temp', operator: 'gt', threshold: 65, durationMin: 10, severity: 'warning', scope: 'site', scopeValue: 'ruh-hq', channels: ['email'], businessHoursOnly: false, enabled: false, createdAt: now - 9 * 86_400_000 },
];

interface RulesState {
  rules: AlertRule[];
  upsert: (rule: AlertRule) => void;
  remove: (id: string) => void;
  toggle: (id: string) => void;
  resetDefaults: () => void;
}

export const useRules = create<RulesState>()(
  persist(
    (set) => ({
      rules: DEFAULT_RULES,
      upsert: (rule) =>
        set((s) => {
          const exists = s.rules.some((r) => r.id === rule.id);
          return { rules: exists ? s.rules.map((r) => (r.id === rule.id ? rule : r)) : [rule, ...s.rules] };
        }),
      remove: (id) => set((s) => ({ rules: s.rules.filter((r) => r.id !== id) })),
      toggle: (id) => set((s) => ({ rules: s.rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)) })),
      resetDefaults: () => set({ rules: DEFAULT_RULES }),
    }),
    { name: storageKey('rules'), storage: persistStorage, version: 1 },
  ),
);
