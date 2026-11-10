/** Shared domain types for the mock data layer. */

export type SiteId =
  | 'ruh-hq'
  | 'ruh-dc1'
  | 'jed-dc2'
  | 'jed-br'
  | 'dmm-br'
  | 'med-br'
  | 'mkh-br'
  | 'tuu-br'
  | 'neom-br'
  | 'ahb-br';

export type SiteKind = 'hq' | 'datacenter' | 'branch';

export interface Site {
  id: SiteId;
  /** Short code used in hostnames, e.g. RUH-DC1. */
  code: string;
  kind: SiteKind;
  lon: number;
  lat: number;
  /** One-way latency (ms) from the site to the nearest data center — drives latency metrics. */
  baseLatencyMs: number;
}

export type DeviceType =
  | 'coreRouter'
  | 'edgeRouter'
  | 'switch'
  | 'firewall'
  | 'wlc'
  | 'server'
  | 'vm'
  | 'database'
  | 'loadBalancer'
  | 'ups'
  | 'printer';

export const DEVICE_TYPES: readonly DeviceType[] = [
  'coreRouter',
  'edgeRouter',
  'switch',
  'firewall',
  'wlc',
  'loadBalancer',
  'server',
  'vm',
  'database',
  'ups',
  'printer',
] as const;

export type DeviceCategory = 'network' | 'compute' | 'facility';

export type DeviceStatus = 'up' | 'warning' | 'down';
export const DEVICE_STATUSES: readonly DeviceStatus[] = ['up', 'warning', 'down'] as const;

export type Condition = 'healthy' | 'degraded' | 'down';

export type MetricKey =
  | 'cpu'
  | 'mem'
  | 'disk'
  | 'bwIn'
  | 'bwOut'
  | 'latency'
  | 'loss'
  | 'temp'
  | 'battery'
  | 'load';

export type CarrierId = 'carrierA' | 'carrierB' | 'carrierC' | 'carrierD';

export type InterfaceStatus = 'up' | 'down' | 'adminDown';

export interface NetInterface {
  id: string;
  name: string;
  /** i18n key suffix under `interfaces.kinds` */
  kind: 'wan' | 'uplink' | 'lan' | 'mgmt' | 'server';
  speedMbps: number;
  baseStatus: InterfaceStatus;
  carrier?: CarrierId;
  /** Baseline utilisation (0..1) at peak business hours. */
  utilBase: number;
  vlan?: number;
}

export interface DeviceConditionState {
  condition: Condition;
  /** Epoch ms when the current condition started. */
  since: number;
  /** For degraded devices: which metric is out of range. */
  metric?: MetricKey;
}

export interface Device {
  id: string;
  hostname: string;
  type: DeviceType;
  category: DeviceCategory;
  siteId: SiteId;
  vendor: string;
  model: string;
  os: string;
  ip: string;
  serial: string;
  rack: string;
  seed: number;
  metrics: MetricKey[];
  baseline: Partial<Record<MetricKey, number>>;
  /** Aggregate interface capacity used for bandwidth metrics (Mbps). */
  capacityMbps: number;
  /** How strongly the device follows the Sun–Thu business-hours pattern (0..1). */
  workload: number;
  interfaces: NetInterface[];
  /** Initial health state at demo start. */
  initial: DeviceConditionState;
  /** Epoch ms of last reboot (drives the uptime counter). */
  bootTime: number;
  /** Upstream device in the topology, if any. */
  parentId?: string;
  /** Probability of a short outage on any given day (drives uptime history). */
  outageRate: number;
  criticality: 'tier1' | 'tier2' | 'tier3';
}

export interface WanLink {
  id: string;
  from: string;
  to: string;
  carrier: CarrierId;
  kind: 'primary' | 'backup' | 'dci';
  capacityMbps: number;
  /** Peak utilisation 0..1 */
  utilBase: number;
  status: 'up' | 'down' | 'standby';
}

export type AlertSeverity = 'critical' | 'warning' | 'info';
export const ALERT_SEVERITIES: readonly AlertSeverity[] = ['critical', 'warning', 'info'] as const;

export type AlertState = 'open' | 'acknowledged' | 'resolved';
export const ALERT_STATES: readonly AlertState[] = ['open', 'acknowledged', 'resolved'] as const;

export type AlertType =
  | 'deviceDown'
  | 'linkDown'
  | 'cpuHigh'
  | 'memHigh'
  | 'diskFull'
  | 'highLatency'
  | 'packetLoss'
  | 'tempHigh'
  | 'upsOnBattery'
  | 'certExpiring'
  | 'configChanged'
  | 'backupFailed'
  | 'interfaceFlapping'
  | 'bgpPeerDown'
  | 'appErrorRate'
  | 'appLatency';

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  state: AlertState;
  deviceId: string;
  siteId: SiteId;
  createdAt: number;
  ackAt?: number;
  ackBy?: string;
  resolvedAt?: number;
  resolvedBy?: string;
  /** Values interpolated into the translated alert title. */
  params: Record<string, string | number>;
}

export type LogLevel = 'debug' | 'info' | 'warning' | 'error' | 'critical';
export const LOG_LEVELS: readonly LogLevel[] = ['critical', 'error', 'warning', 'info', 'debug'] as const;

export type LogFacility = 'system' | 'network' | 'security' | 'application' | 'database' | 'auth';

export interface LogEntry {
  id: string;
  ts: number;
  level: LogLevel;
  source: string;
  deviceId?: string;
  facility: LogFacility;
  message: string;
}

export type AppTier = 'edge' | 'web' | 'api' | 'service' | 'data';

export interface AppService {
  id: string;
  tier: AppTier;
  /** Device ids hosting this service. */
  hosts: string[];
  /** App ids or device ids this service calls. */
  dependsOn: string[];
  baseLatencyMs: number;
  baseErrorRate: number;
  baseRpm: number;
  sloLatencyMs: number;
  seed: number;
  degraded?: boolean;
}

export interface Operator {
  id: string;
  name: { en: string; ar: string };
}
