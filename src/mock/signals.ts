/**
 * Deterministic metric generator.
 *
 * Every metric is a pure function of (device seed, metric, timestamp). That gives us
 * 90 days of history at any resolution for free, and the "live" values the store ticks
 * are just the same function evaluated at Date.now() — so history and live data always agree.
 *
 * Shape of the signal:
 *   - business-hours curve in Arabia Standard Time (UTC+3), peaks ~10:45 and ~14:45
 *   - Sunday–Thursday work week; Friday/Saturday traffic drops sharply
 *   - multi-octave smooth value noise, occasional historical incidents and short outages
 */
import { hash2, hashString, clamp } from './rng';
import { getSite } from './sites';
import type { AppService, Condition, Device, MetricKey, NetInterface, WanLink } from './types';

export const SECOND = 1_000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
/** Arabia Standard Time is UTC+3 all year (no DST). */
export const AST_OFFSET_MS = 3 * HOUR;

export function astParts(t: number) {
  const d = new Date(t + AST_OFFSET_MS);
  return {
    hour: d.getUTCHours() + d.getUTCMinutes() / 60,
    dow: d.getUTCDay(), // 0 = Sunday … 6 = Saturday
    dayIndex: Math.floor((t + AST_OFFSET_MS) / DAY),
  };
}

/** Start of the AST calendar day containing t, as epoch ms. */
export function astDayStart(t: number): number {
  return Math.floor((t + AST_OFFSET_MS) / DAY) * DAY - AST_OFFSET_MS;
}

/** Saudi weekend: Friday and Saturday. */
export function isWeekendAst(t: number): boolean {
  const { dow } = astParts(t);
  return dow === 5 || dow === 6;
}

const gauss = (x: number, mu: number, sigma: number) => Math.exp(-((x - mu) ** 2) / (2 * sigma * sigma));

/** Organisation-wide activity level 0..1 for a timestamp. */
export function businessActivity(t: number): number {
  const { hour, dow } = astParts(t);
  const daily = 0.1 + 0.82 * gauss(hour, 10.8, 2.0) + 0.62 * gauss(hour, 14.8, 1.7) + 0.16 * gauss(hour, 20.8, 1.5);
  const weekly = dow === 5 ? 0.3 : dow === 6 ? 0.46 : dow === 4 ? 0.88 : 1;
  return Math.min(1, daily) * weekly;
}

/** Smooth value noise in [-0.5, 0.5]. */
function vnoise(seed: number, x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const s = f * f * (3 - 2 * f);
  const a = hash2(seed, i);
  const b = hash2(seed, i + 1);
  return a + (b - a) * s - 0.5;
}

/** Sum of noise octaves: [periodMs, amplitude]. */
function fbm(seed: number, t: number, octaves: readonly (readonly [number, number])[]): number {
  let v = 0;
  octaves.forEach(([period, amp], i) => {
    v += vnoise(seed + i * 7919, t / period) * 2 * amp;
  });
  return v;
}

export interface ConditionEpisode {
  condition: Condition;
  since: number;
  until?: number;
  metric?: MetricKey;
}

function activeEpisode(episodes: readonly ConditionEpisode[] | undefined, t: number): ConditionEpisode | undefined {
  if (!episodes) return undefined;
  for (let i = episodes.length - 1; i >= 0; i--) {
    const e = episodes[i];
    if (e && t >= e.since && (e.until === undefined || t < e.until)) return e;
  }
  return undefined;
}

/** Historical short outage for a device on a given AST day (deterministic), or null. */
export function outageOnDay(device: Device, dayIndex: number, now: number): { start: number; end: number } | null {
  const h = hash2(device.seed + 99, dayIndex);
  if (h >= device.outageRate) return null;
  const dayStart = dayIndex * DAY - AST_OFFSET_MS;
  const start = dayStart + Math.floor(hash2(device.seed + 101, dayIndex) * 1380) * MINUTE;
  const end = start + (3 + Math.floor(hash2(device.seed + 103, dayIndex) * 55)) * MINUTE;
  // Never invent outages in the recent past — live status is authoritative there.
  if (end > now - 2 * HOUR) return null;
  return { start, end };
}

/** Historical performance incident (e.g. CPU/latency spike) — deterministic per day. */
function incidentFactor(device: Device, t: number): number {
  const { dayIndex } = astParts(t);
  const h = hash2(device.seed + 7, dayIndex);
  if (h > 0.045) return 0;
  const dayStart = dayIndex * DAY - AST_OFFSET_MS;
  const start = dayStart + (7 + hash2(device.seed + 11, dayIndex) * 10) * HOUR;
  const dur = (0.5 + hash2(device.seed + 13, dayIndex) * 2.5) * HOUR;
  if (t < start || t > start + dur) return 0;
  const x = (t - start) / dur;
  return Math.sin(Math.PI * x); // smooth bump 0..1..0
}

const ifaceSeedCache = new Map<string, number>();
function ifaceSeed(device: Device, iface: NetInterface): number {
  const key = `${device.id}/${iface.id}`;
  let s = ifaceSeedCache.get(key);
  if (s === undefined) {
    s = hashString(key);
    ifaceSeedCache.set(key, s);
  }
  return s;
}

/** Utilisation 0..1 of a device interface at time t. */
export function interfaceUtil(device: Device, iface: NetInterface, t: number, episodes?: readonly ConditionEpisode[]): number {
  const ep = activeEpisode(episodes, t);
  if (ep?.condition === 'down') return 0;
  if (iface.baseStatus !== 'up') return 0;
  if (iface.kind === 'mgmt') return clamp(0.005 + fbm(ifaceSeed(device, iface), t, [[10 * MINUTE, 0.004]]), 0.001, 0.05);
  const a = 1 - device.workload + device.workload * businessActivity(t);
  const s = ifaceSeed(device, iface);
  const v = iface.utilBase * (0.12 + 0.95 * a) * (1 + fbm(s, t, [[4 * HOUR, 0.18], [15 * MINUTE, 0.12], [20 * SECOND, 0.05]]));
  return clamp(v, 0.001, 0.97);
}

function bwShareIn(device: Device): number {
  switch (device.type) {
    case 'server':
    case 'vm':
    case 'database':
      return 0.42;
    case 'edgeRouter':
    case 'firewall':
    case 'wlc':
      return 0.64;
    default:
      return 0.55;
  }
}

/**
 * Metric value at time t, or null when the device is unreachable.
 * Units: %, Mbps (bw), ms (latency), % (loss), °C (temp).
 */
export function metricValue(device: Device, key: MetricKey, t: number, episodes?: readonly ConditionEpisode[], now = Date.now()): number | null {
  const ep = activeEpisode(episodes, t);
  if (ep?.condition === 'down') return null;
  const { dayIndex } = astParts(t);
  const outage = outageOnDay(device, dayIndex, now);
  if (outage && t >= outage.start && t <= outage.end) return null;

  const s = device.seed;
  const base = device.baseline[key] ?? 0;
  const a = 1 - device.workload + device.workload * businessActivity(t);
  const inc = incidentFactor(device, t);
  const degraded = ep?.condition === 'degraded' && ep.metric === key;
  const sinceDeg = degraded && ep ? t - ep.since : 0;
  const ramp = degraded ? clamp(sinceDeg / (4 * MINUTE), 0, 1) : 0;

  let v: number;
  switch (key) {
    case 'cpu': {
      v = base * (0.5 + 0.75 * a) + fbm(s + 1, t, [[3 * HOUR, 9], [20 * MINUTE, 5], [2 * MINUTE, 2.5], [9 * SECOND, 1.8]]) + inc * 38;
      if (degraded) v = v * (1 - ramp) + ramp * (89 + fbm(s + 21, t, [[5 * MINUTE, 4], [8 * SECOND, 2]]));
      v = clamp(v, 1, 99.5);
      break;
    }
    case 'mem': {
      v = base + 6 * a + fbm(s + 2, t, [[8 * HOUR, 7], [30 * MINUTE, 2.5], [12 * SECOND, 0.7]]) + inc * 9;
      if (degraded) v = v * (1 - ramp) + ramp * (92.5 + fbm(s + 22, t, [[3 * MINUTE, 1.6], [10 * SECOND, 0.5]]));
      v = clamp(v, 5, 99);
      break;
    }
    case 'disk': {
      const period = 38 + (s % 55); // days between clean-ups / expansions
      const phase = (s % 997) / 997;
      const x = ((t / DAY) / period + phase) % 1;
      v = base - 9 + 18 * x + fbm(s + 3, t, [[DAY, 1.0], [HOUR, 0.25]]);
      if (degraded) v = v * (1 - ramp) + ramp * (92.4 + (sinceDeg / HOUR) * 0.05 + fbm(s + 23, t, [[HOUR, 0.3]]));
      v = clamp(v, 3, 99.2);
      break;
    }
    case 'bwIn':
    case 'bwOut': {
      const share = key === 'bwIn' ? bwShareIn(device) : 1 - bwShareIn(device);
      let total = 0;
      for (const iface of device.interfaces) {
        if (iface.kind === 'mgmt') continue;
        total += iface.speedMbps * interfaceUtil(device, iface, t, episodes);
      }
      const n = device.interfaces.filter((i) => i.kind !== 'mgmt').length || 1;
      v = (total / Math.max(1, n / 2)) * share * (1 + inc * 0.4);
      if (device.type === 'printer' || device.type === 'ups') v = clamp(0.2 + fbm(s + 4, t, [[MINUTE, 0.15]]), 0.02, 3);
      break;
    }
    case 'latency': {
      const site = getSite(device.siteId);
      const hop = device.category === 'compute' ? 0.35 : device.category === 'facility' ? 0.9 : 0.25;
      const lb = site.baseLatencyMs + hop;
      v = lb * (1 + 0.22 * a) + Math.abs(fbm(s + 5, t, [[30 * MINUTE, lb * 0.25], [90 * SECOND, lb * 0.18], [7 * SECOND, lb * 0.1]])) + inc * lb * 2.2;
      if (degraded) v = v * (1 - ramp) + ramp * (Math.max(lb * 1.6 + 22, 46) + Math.abs(fbm(s + 25, t, [[2 * MINUTE, 7], [6 * SECOND, 4]])));
      v = Math.max(0.2, v);
      break;
    }
    case 'loss': {
      v = Math.max(0, 0.01 + fbm(s + 6, t, [[HOUR, 0.03], [4 * MINUTE, 0.03]])) + inc * 0.4;
      if (degraded) v = v * (1 - ramp) + ramp * (2.4 + fbm(s + 26, t, [[90 * SECOND, 0.9], [6 * SECOND, 0.4]]));
      v = clamp(v, 0, 25);
      break;
    }
    case 'temp': {
      v = base + 3.2 * a + fbm(s + 8, t, [[6 * HOUR, 1.6], [10 * MINUTE, 0.6], [10 * SECOND, 0.2]]) + inc * 3;
      if (degraded) v = v * (1 - ramp) + ramp * (69.5 + fbm(s + 28, t, [[4 * MINUTE, 1.6]]));
      break;
    }
    case 'battery': {
      v = 100 - Math.abs(fbm(s + 9, t, [[DAY, 0.4]]));
      if (degraded) v = clamp(100 - (sinceDeg / MINUTE) * 1.7, 38, 100);
      break;
    }
    case 'load': {
      v = base * (0.82 + 0.3 * a) + fbm(s + 10, t, [[2 * HOUR, 3], [5 * MINUTE, 1.2], [10 * SECOND, 0.4]]);
      v = clamp(v, 2, 98);
      break;
    }
  }
  return v;
}

export interface SeriesPoint {
  t: number;
  [key: string]: number | null;
}

/** Bucketed series: averages a few samples per bucket for smoother long ranges. */
export function sampleSeries(
  from: number,
  to: number,
  step: number,
  fns: Record<string, (t: number) => number | null>,
  samplesPerBucket = 1,
): SeriesPoint[] {
  const out: SeriesPoint[] = [];
  const start = Math.floor(from / step) * step;
  for (let t = start; t <= to; t += step) {
    const p: SeriesPoint = { t };
    for (const [k, fn] of Object.entries(fns)) {
      if (samplesPerBucket <= 1) {
        p[k] = fn(t);
      } else {
        let sum = 0;
        let n = 0;
        let nulls = 0;
        for (let i = 0; i < samplesPerBucket; i++) {
          const v = fn(t - step + (step * (i + 1)) / samplesPerBucket);
          if (v === null) nulls++;
          else {
            sum += v;
            n++;
          }
        }
        p[k] = n === 0 || nulls > samplesPerBucket / 2 ? null : sum / n;
      }
    }
    out.push(p);
  }
  return out;
}

/** WAN link utilisation (0..1) at time t. */
export function wanLinkUtil(link: WanLink, t: number, status: WanLink['status'] = link.status, salt = ''): number {
  if (status === 'down') return 0;
  const s = hashString(link.id + salt);
  if (status === 'standby') return clamp(0.004 + fbm(s, t, [[10 * MINUTE, 0.002]]), 0.001, 0.02);
  const a = 0.25 + 0.75 * businessActivity(t);
  return clamp(link.utilBase * (0.18 + 0.9 * a) * (1 + fbm(s, t, [[3 * HOUR, 0.16], [12 * MINUTE, 0.1], [15 * SECOND, 0.05]])), 0.002, 0.97);
}

/** Daily availability % for a device on an AST day (outages + down episodes). */
export function dailyAvailability(device: Device, dayIndex: number, now: number, episodes?: readonly ConditionEpisode[]): number | null {
  const dayStart = dayIndex * DAY - AST_OFFSET_MS;
  const dayEnd = dayStart + DAY;
  if (dayStart > now) return null;
  const effectiveEnd = Math.min(dayEnd, now);
  const span = effectiveEnd - dayStart;
  if (span <= 0) return null;
  let downMs = 0;
  const outage = outageOnDay(device, dayIndex, now);
  if (outage) downMs += Math.max(0, Math.min(outage.end, effectiveEnd) - Math.max(outage.start, dayStart));
  for (const e of episodes ?? []) {
    if (e.condition !== 'down') continue;
    const end = e.until ?? now;
    downMs += Math.max(0, Math.min(end, effectiveEnd) - Math.max(e.since, dayStart));
  }
  return clamp(100 - (downMs / span) * 100, 0, 100);
}

/* ----------------------------- Applications ----------------------------- */

export function appLatency(app: AppService, t: number, degraded = app.degraded): number {
  const a = businessActivity(t);
  let v = app.baseLatencyMs * (1 + 0.38 * a) + Math.abs(fbm(app.seed + 1, t, [[HOUR, app.baseLatencyMs * 0.18], [3 * MINUTE, app.baseLatencyMs * 0.12], [8 * SECOND, app.baseLatencyMs * 0.06]]));
  if (degraded) v = v * 2.3 + 40;
  return v;
}

export function appErrorRate(app: AppService, t: number, degraded = app.degraded): number {
  const v = app.baseErrorRate * (1 + fbm(app.seed + 2, t, [[2 * HOUR, 0.4], [5 * MINUTE, 0.35], [10 * SECOND, 0.15]]));
  return clamp(degraded ? v * 5.5 + 1.2 : v, 0, 30);
}

export function appThroughput(app: AppService, t: number): number {
  const a = businessActivity(t);
  return Math.max(1, app.baseRpm * (0.07 + 1.0 * a) * (1 + fbm(app.seed + 3, t, [[HOUR, 0.12], [2 * MINUTE, 0.08], [6 * SECOND, 0.04]])));
}
