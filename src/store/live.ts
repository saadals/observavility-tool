import { create } from 'zustand';
import {
  DEVICES,
  INITIAL_ALERTS,
  INITIAL_LOGS,
  METRIC_ALERT,
  ALERT_TYPE_SEVERITY,
  createRng,
  currentEpisode,
  initialEpisodes,
  liveLogRng,
  makeLog,
  metricAlertParams,
  metricValue,
  nextAlertId,
  type Alert,
  type AlertType,
  type DeviceType,
  type EpisodeMap,
  type LogEntry,
  type MetricKey,
} from '@/mock';
import { toast } from './ui';

export type LiveMetrics = Partial<Record<MetricKey, number | null>>;

export const TICK_MS = 3000;
const MAX_LOGS = 6000;
const MAX_TRANSIENT = 3;

interface LiveState {
  now: number;
  tickCount: number;
  episodes: EpisodeMap;
  live: Record<string, LiveMetrics>;
  alerts: Alert[];
  logs: LogEntry[];
  /** deviceId → epoch ms when a transient (live-generated) problem clears. */
  recoverAt: Record<string, number>;
  /** alertId → epoch ms when a live event alert auto-resolves. */
  autoResolveAt: Record<string, number>;
  tick: () => void;
  acknowledge: (ids: string[], by: string) => void;
  resolve: (ids: string[], by: string) => void;
  reset: () => void;
}

function computeLive(now: number, episodes: EpisodeMap): Record<string, LiveMetrics> {
  const out: Record<string, LiveMetrics> = {};
  for (const d of DEVICES) {
    const m: LiveMetrics = {};
    for (const k of d.metrics) m[k] = metricValue(d, k, now, episodes[d.id], now);
    out[d.id] = m;
  }
  return out;
}

type LiveEvent =
  | { kind: 'metric'; metric: MetricKey; types: DeviceType[] }
  | { kind: 'event'; type: AlertType; types: DeviceType[]; params: (r: ReturnType<typeof createRng>) => Alert['params'] };

const EVENTS: [LiveEvent, number][] = [
  [{ kind: 'metric', metric: 'cpu', types: ['server', 'vm', 'database', 'firewall'] }, 4],
  [{ kind: 'metric', metric: 'latency', types: ['edgeRouter'] }, 3],
  [{ kind: 'metric', metric: 'loss', types: ['edgeRouter'] }, 2],
  [{ kind: 'metric', metric: 'mem', types: ['server', 'vm', 'database'] }, 2],
  [{ kind: 'event', type: 'interfaceFlapping', types: ['switch'], params: (r) => ({ iface: `Gi1/0/${r.int(1, 8)}`, count: r.int(4, 11) }) }, 2],
  [{ kind: 'event', type: 'configChanged', types: ['switch', 'firewall', 'edgeRouter', 'coreRouter'], params: (r) => ({ user: r.pick(['netops', 'a.alharbi', 'm.alqahtani']) }) }, 1.5],
  [{ kind: 'event', type: 'bgpPeerDown', types: ['coreRouter', 'edgeRouter'], params: (r) => ({ peer: `10.${r.int(1, 10)}.0.1` }) }, 0.6],
];

const eventRng = createRng('live-events-v1');

function freshState() {
  const now = Date.now();
  const episodes = initialEpisodes();
  return {
    now,
    tickCount: 0,
    episodes,
    live: computeLive(now, episodes),
    alerts: INITIAL_ALERTS.map((a) => ({ ...a, params: { ...a.params } })),
    logs: [...INITIAL_LOGS],
    recoverAt: {} as Record<string, number>,
    autoResolveAt: {} as Record<string, number>,
  };
}

function closeEpisode(episodes: EpisodeMap, deviceId: string, at: number): EpisodeMap {
  const list = episodes[deviceId] ?? [];
  const cur = currentEpisode(list);
  if (!cur) return episodes;
  return { ...episodes, [deviceId]: list.map((e) => (e === cur ? { ...e, until: at } : e)) };
}

export const useLive = create<LiveState>()((set, get) => ({
  ...freshState(),

  tick: () => {
    const s = get();
    const now = Date.now();
    const r = eventRng;
    let episodes = s.episodes;
    let alerts = s.alerts;
    const recoverAt = { ...s.recoverAt };
    const autoResolveAt = { ...s.autoResolveAt };
    const newLogs: LogEntry[] = [];
    const devLog = (deviceId: string, level: LogEntry['level'], message: string) => {
      const d = DEVICES.find((x) => x.id === deviceId);
      if (d) newLogs.push({ id: `LL${now}-${newLogs.length}`, ts: now, level, facility: d.category === 'network' ? 'network' : 'system', source: d.hostname, deviceId, message });
    };

    // 1) Transient problems recover.
    for (const [deviceId, at] of Object.entries(recoverAt)) {
      if (now < at) continue;
      delete recoverAt[deviceId];
      const ep = currentEpisode(episodes[deviceId]);
      episodes = closeEpisode(episodes, deviceId, now);
      alerts = alerts.map((a) =>
        a.deviceId === deviceId && a.state !== 'resolved' && ep && a.createdAt >= ep.since - 1000
          ? { ...a, state: 'resolved', resolvedAt: now, resolvedBy: 'op-system' }
          : a,
      );
      devLog(deviceId, 'info', `Threshold cleared for ${ep?.metric ?? 'metric'} — back within normal range`);
    }
    for (const [alertId, at] of Object.entries(autoResolveAt)) {
      if (now < at) continue;
      delete autoResolveAt[alertId];
      alerts = alerts.map((a) => (a.id === alertId && a.state !== 'resolved' ? { ...a, state: 'resolved', resolvedAt: now, resolvedBy: 'op-system' } : a));
    }

    // 2) Occasionally a new problem appears (~every 45 s on average).
    if (s.tickCount > 2 && r.chance(1 / 15)) {
      const ev = r.weighted(EVENTS);
      const candidates = DEVICES.filter((d) => ev.types.includes(d.type) && !currentEpisode(episodes[d.id]) && !recoverAt[d.id]);
      if (candidates.length && (ev.kind === 'event' || Object.keys(recoverAt).length < MAX_TRANSIENT)) {
        const d = r.pick(candidates);
        let alert: Alert;
        if (ev.kind === 'metric') {
          episodes = { ...episodes, [d.id]: [...(episodes[d.id] ?? []), { condition: 'degraded', since: now, metric: ev.metric }] };
          recoverAt[d.id] = now + r.int(70, 210) * 1000;
          const type = METRIC_ALERT[ev.metric] ?? 'cpuHigh';
          const params = metricAlertParams(ev.metric);
          if (typeof params.value === 'number') params.value = Math.round(params.value * r.float(0.97, 1.05) * 10) / 10;
          alert = { id: nextAlertId(), type, severity: ALERT_TYPE_SEVERITY[type], state: 'open', deviceId: d.id, siteId: d.siteId, createdAt: now, params };
          devLog(d.id, 'warning', `${ev.metric.toUpperCase()} threshold exceeded (${params.value ?? ''}) — alert ${alert.id} raised`);
        } else {
          alert = { id: nextAlertId(), type: ev.type, severity: ALERT_TYPE_SEVERITY[ev.type], state: 'open', deviceId: d.id, siteId: d.siteId, createdAt: now, params: ev.params(r) };
          if (ev.type !== 'configChanged') autoResolveAt[alert.id] = now + r.int(60, 160) * 1000;
          devLog(d.id, ev.type === 'bgpPeerDown' ? 'error' : ev.type === 'configChanged' ? 'info' : 'warning', `${ev.type} event detected — alert ${alert.id} raised`);
        }
        alerts = [alert, ...alerts];
        if (alert.severity === 'critical') {
          toast({ kind: 'error', titleKey: 'toasts.newCritical', bodyKey: `alertTypes.${alert.type}`, params: { ...alert.params, host: d.hostname }, href: `/devices/${d.id}/` }, 6500);
        }
      }
    }

    // 3) Log stream.
    const n = liveLogRng.int(0, 4);
    for (let i = 0; i < n; i++) newLogs.push(makeLog(liveLogRng, now - liveLogRng.int(0, TICK_MS - 50)));
    newLogs.sort((a, b) => b.ts - a.ts);
    const logs = newLogs.length ? [...newLogs, ...s.logs].slice(0, MAX_LOGS) : s.logs;

    set({ now, tickCount: s.tickCount + 1, episodes, alerts, logs, recoverAt, autoResolveAt, live: computeLive(now, episodes) });
  },

  acknowledge: (ids, by) => {
    const now = Date.now();
    set((s) => ({ alerts: s.alerts.map((a) => (ids.includes(a.id) && a.state === 'open' ? { ...a, state: 'acknowledged', ackAt: now, ackBy: by } : a)) }));
  },

  resolve: (ids, by) => {
    const now = Date.now();
    const s = get();
    const alerts = s.alerts.map((a) => (ids.includes(a.id) && a.state !== 'resolved' ? { ...a, state: 'resolved' as const, resolvedAt: now, resolvedBy: by, ackAt: a.ackAt ?? now, ackBy: a.ackBy ?? by } : a));
    // When the last active alert on a device is resolved, treat the underlying issue as fixed
    // so the dashboards visibly recover (useful in a live demo).
    let episodes = s.episodes;
    const recoverAt = { ...s.recoverAt };
    const touched = new Set(s.alerts.filter((a) => ids.includes(a.id)).map((a) => a.deviceId));
    for (const deviceId of touched) {
      const stillActive = alerts.some((a) => a.deviceId === deviceId && a.state !== 'resolved');
      if (!stillActive && currentEpisode(episodes[deviceId])) {
        episodes = closeEpisode(episodes, deviceId, now);
        delete recoverAt[deviceId];
      }
    }
    set({ alerts, episodes, recoverAt, live: computeLive(now, episodes) });
  },

  reset: () => set(freshState()),
}));
