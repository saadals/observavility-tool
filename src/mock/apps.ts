import { hashString } from './rng';
import type { AppService } from './types';

/**
 * Mock business applications. Display names and descriptions are translated (`apps.<id>.*`).
 * `hosts` and data-tier `dependsOn` entries reference device ids from devices.ts.
 */
const RAW: Omit<AppService, 'seed'>[] = [
  {
    id: 'customer-portal',
    tier: 'web',
    hosts: ['ruh-dc1-web01', 'ruh-dc1-web02', 'jed-dc2-web01'],
    dependsOn: ['api-gateway', 'identity-sso'],
    baseLatencyMs: 165,
    baseErrorRate: 0.28,
    baseRpm: 4200,
    sloLatencyMs: 400,
  },
  {
    id: 'mobile-backend',
    tier: 'web',
    hosts: ['jed-dc2-mob01'],
    dependsOn: ['api-gateway', 'identity-sso', 'notification'],
    baseLatencyMs: 120,
    baseErrorRate: 0.35,
    baseRpm: 6100,
    sloLatencyMs: 300,
  },
  {
    id: 'hr-self-service',
    tier: 'web',
    hosts: ['ruh-dc1-hr01'],
    dependsOn: ['identity-sso', 'erp', 'jed-dc2-db-hr01'],
    baseLatencyMs: 210,
    baseErrorRate: 0.4,
    baseRpm: 850,
    sloLatencyMs: 500,
  },
  {
    id: 'api-gateway',
    tier: 'api',
    hosts: ['ruh-dc1-api01', 'ruh-dc1-api02', 'jed-dc2-api01'],
    dependsOn: ['payments', 'erp', 'notification'],
    baseLatencyMs: 42,
    baseErrorRate: 0.18,
    baseRpm: 9800,
    sloLatencyMs: 120,
    degraded: true,
  },
  {
    id: 'identity-sso',
    tier: 'service',
    hosts: ['ruh-dc1-idm01'],
    dependsOn: ['ruh-dc1-db-idm01'],
    baseLatencyMs: 58,
    baseErrorRate: 0.12,
    baseRpm: 3100,
    sloLatencyMs: 150,
  },
  {
    id: 'payments',
    tier: 'service',
    hosts: ['ruh-dc1-api01', 'jed-dc2-api01'],
    dependsOn: ['ruh-dc1-db-pay01', 'jed-dc2-db-pay02', 'ruh-dc1-mq01'],
    baseLatencyMs: 95,
    baseErrorRate: 0.22,
    baseRpm: 1900,
    sloLatencyMs: 250,
  },
  {
    id: 'erp',
    tier: 'service',
    hosts: ['ruh-dc1-erp01'],
    dependsOn: ['ruh-dc1-db-erp01'],
    baseLatencyMs: 240,
    baseErrorRate: 0.5,
    baseRpm: 1200,
    sloLatencyMs: 600,
  },
  {
    id: 'notification',
    tier: 'service',
    hosts: ['jed-dc2-mail01', 'jed-dc2-mail02'],
    dependsOn: ['ruh-dc1-mq01'],
    baseLatencyMs: 75,
    baseErrorRate: 0.3,
    baseRpm: 2600,
    sloLatencyMs: 250,
  },
  {
    id: 'dwh-etl',
    tier: 'data',
    hosts: ['ruh-dc1-etl01'],
    dependsOn: ['ruh-dc1-db-dwh01', 'erp'],
    baseLatencyMs: 900,
    baseErrorRate: 0.6,
    baseRpm: 120,
    sloLatencyMs: 2500,
  },
];

export const APPS: readonly AppService[] = RAW.map((a) => ({ ...a, seed: hashString(a.id) }));

export function getApp(id: string): AppService | undefined {
  return APPS.find((a) => a.id === id);
}
