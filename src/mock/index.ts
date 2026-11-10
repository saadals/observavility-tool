/**
 * Public entry point of the mock data layer.
 * Pages and stores import from '@/mock' only.
 */
export * from './types';
export * from './rng';
export { SITES, SITE_IDS, getSite, SITE_HOMING, CARRIERS, OPERATORS, KSA_OUTLINE } from './sites';
export { DEVICES, WAN_LINKS, T0, getDevice, devicesAtSite, siteWanCapacity, TYPE_CATEGORY } from './devices';
export { INITIAL_ALERTS, ALERT_TYPE_SEVERITY, METRIC_ALERT, metricAlertParams, nextAlertId, mttrMinutes } from './alerts';
export { INITIAL_LOGS, makeLog, liveLogRng } from './logs';
export { APPS, getApp } from './apps';
export * from './signals';
export * from './compliance';

import { DEVICES } from './devices';
import { dailyAvailability, astParts, outageOnDay, DAY, type ConditionEpisode } from './signals';
import type { Alert, Device, DeviceStatus, SiteId } from './types';

export type EpisodeMap = Record<string, ConditionEpisode[]>;

export function initialEpisodes(): EpisodeMap {
  const map: EpisodeMap = {};
  for (const d of DEVICES) {
    map[d.id] = d.initial.condition === 'healthy' ? [] : [{ condition: d.initial.condition, since: d.initial.since, metric: d.initial.metric }];
  }
  return map;
}

export function currentEpisode(episodes: readonly ConditionEpisode[] | undefined): ConditionEpisode | undefined {
  const last = episodes?.[episodes.length - 1];
  return last && last.until === undefined ? last : undefined;
}

export function deviceStatus(episodes: readonly ConditionEpisode[] | undefined): DeviceStatus {
  const ep = currentEpisode(episodes);
  if (!ep) return 'up';
  return ep.condition === 'down' ? 'down' : 'warning';
}

export interface StatusCounts {
  up: number;
  warning: number;
  down: number;
  total: number;
}

export function statusCounts(devices: readonly Device[], episodes: EpisodeMap): StatusCounts {
  const c: StatusCounts = { up: 0, warning: 0, down: 0, total: devices.length };
  for (const d of devices) c[deviceStatus(episodes[d.id])]++;
  return c;
}

export function isActive(a: Alert) {
  return a.state !== 'resolved';
}

/**
 * Overall health score 0..100. Weighs device availability, degraded devices and
 * active alerts by severity. Purely illustrative.
 */
export function healthScore(devices: readonly Device[], episodes: EpisodeMap, alerts: readonly Alert[]): number {
  const c = statusCounts(devices, episodes);
  if (!c.total) return 100;
  const avail = (c.up + c.warning * 0.6) / c.total;
  const active = alerts.filter(isActive);
  const crit = active.filter((a) => a.severity === 'critical').length;
  const warn = active.filter((a) => a.severity === 'warning').length;
  const penalty = crit * 0.9 + warn * 0.25;
  return Math.max(0, Math.min(100, Math.round(avail * 100 - penalty)));
}

/** Average availability % over the last `days` AST days for a set of devices. */
export function availability(devices: readonly Device[], episodes: EpisodeMap, days: number, now: number): number {
  const today = astParts(now).dayIndex;
  let sum = 0;
  let n = 0;
  for (const d of devices) {
    for (let i = 0; i < days; i++) {
      const v = dailyAvailability(d, today - i, now, episodes[d.id]);
      if (v !== null) {
        sum += v;
        n++;
      }
    }
  }
  return n ? sum / n : 100;
}

/** Per-day availability for one device for the last `days` days (oldest first). */
export function uptimeHistory(device: Device, episodes: readonly ConditionEpisode[] | undefined, days: number, now: number) {
  const today = astParts(now).dayIndex;
  const out: { dayIndex: number; t: number; value: number | null }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const di = today - i;
    out.push({ dayIndex: di, t: di * DAY - 3 * 3_600_000 + DAY / 2, value: dailyAvailability(device, di, now, episodes) });
  }
  return out;
}

export function siteDevices(siteId: SiteId): Device[] {
  return DEVICES.filter((d) => d.siteId === siteId);
}

/** Problem score used for the "Top problem devices" widget. */
export function problemScore(device: Device, episodes: EpisodeMap, alerts: readonly Alert[]): number {
  const st = deviceStatus(episodes[device.id]);
  const active = alerts.filter((a) => a.deviceId === device.id && isActive(a));
  const crit = active.filter((a) => a.severity === 'critical').length;
  const warn = active.filter((a) => a.severity === 'warning').length;
  const tierBoost = device.criticality === 'tier1' ? 3 : device.criticality === 'tier2' ? 1.5 : 0;
  const downWeight = device.criticality === 'tier3' ? 18 : 40;
  return (st === 'down' ? downWeight : st === 'warning' ? 15 : 0) + crit * 12 + warn * 4 + (st !== 'up' ? tierBoost : 0);
}

/**
 * Availability during Saudi business hours only (Sun–Thu, 08:00–17:00 AST),
 * which is what most internal SLAs are measured against.
 */
export function businessHoursAvailability(devices: readonly Device[], episodes: EpisodeMap, days: number, now: number): number {
  const today = astParts(now).dayIndex;
  let total = 0;
  let down = 0;
  for (let i = 0; i < days; i++) {
    const di = today - i;
    const dayStart = di * DAY - 3 * 3_600_000;
    const { dow } = astParts(dayStart + DAY / 2);
    if (dow === 5 || dow === 6) continue;
    const from = dayStart + 8 * 3_600_000;
    const to = Math.min(dayStart + 17 * 3_600_000, now);
    if (to <= from) continue;
    for (const d of devices) {
      total += to - from;
      const o = outageOnDay(d, di, now);
      if (o) down += Math.max(0, Math.min(o.end, to) - Math.max(o.start, from));
      for (const e of episodes[d.id] ?? []) {
        if (e.condition !== 'down') continue;
        down += Math.max(0, Math.min(e.until ?? now, to) - Math.max(e.since, from));
      }
    }
  }
  return total ? 100 - (down / total) * 100 : 100;
}
