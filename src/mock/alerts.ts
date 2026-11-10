import { DEVICES, T0, getDevice } from './devices';
import { createRng } from './rng';
import { MINUTE, HOUR, DAY } from './signals';
import type { Alert, AlertSeverity, AlertType, Device, MetricKey } from './types';

/** Default severity per alert type (rules can override). */
export const ALERT_TYPE_SEVERITY: Record<AlertType, AlertSeverity> = {
  deviceDown: 'critical',
  linkDown: 'critical',
  cpuHigh: 'warning',
  memHigh: 'warning',
  diskFull: 'warning',
  highLatency: 'warning',
  packetLoss: 'warning',
  tempHigh: 'warning',
  upsOnBattery: 'critical',
  certExpiring: 'info',
  configChanged: 'info',
  backupFailed: 'warning',
  interfaceFlapping: 'warning',
  bgpPeerDown: 'critical',
  appErrorRate: 'warning',
  appLatency: 'warning',
};

export const METRIC_ALERT: Partial<Record<MetricKey, AlertType>> = {
  cpu: 'cpuHigh',
  mem: 'memHigh',
  disk: 'diskFull',
  latency: 'highLatency',
  loss: 'packetLoss',
  temp: 'tempHigh',
  battery: 'upsOnBattery',
};

let alertSeq = 1000;
export const nextAlertId = () => `ALR-${++alertSeq}`;

function alertFor(device: Device, type: AlertType, createdAt: number, params: Alert['params'] = {}, severity?: AlertSeverity): Alert {
  return {
    id: nextAlertId(),
    type,
    severity: severity ?? ALERT_TYPE_SEVERITY[type],
    state: 'open',
    deviceId: device.id,
    siteId: device.siteId,
    createdAt,
    params,
  };
}

/** Param values for a metric-driven alert. */
export function metricAlertParams(metric: MetricKey): Alert['params'] {
  switch (metric) {
    case 'cpu':
      return { value: 91, threshold: 85 };
    case 'mem':
      return { value: 93, threshold: 90 };
    case 'disk':
      return { value: 92, threshold: 90, mount: '/data' };
    case 'latency':
      return { value: 58, threshold: 40 };
    case 'loss':
      return { value: 2.4, threshold: 1 };
    case 'temp':
      return { value: 70, threshold: 65 };
    case 'battery':
      return { runtime: 18 };
    default:
      return {};
  }
}

function buildInitialAlerts(): Alert[] {
  const r = createRng('alerts-v1');
  const alerts: Alert[] = [];

  // 1) Alerts for the hand-picked current problems.
  for (const d of DEVICES) {
    const { condition, since, metric } = d.initial;
    if (condition === 'healthy') continue;
    if (condition === 'down') {
      alerts.push(alertFor(d, 'deviceDown', since + 45_000, {}, d.type === 'printer' ? 'warning' : 'critical'));
    } else if (metric) {
      if (d.hostname === 'NUM-BR-ER01') {
        alerts.push(alertFor(d, 'linkDown', since, { iface: 'Gi0/0/0', carrier: 'carrierA' }));
      }
      const type = METRIC_ALERT[metric];
      if (type) alerts.push(alertFor(d, type, since + 2 * MINUTE, metricAlertParams(metric)));
    }
  }

  const ack = (hostname: string, type: AlertType, by: string, after: number) => {
    const a = alerts.find((x) => x.type === type && getDevice(x.deviceId)?.hostname === hostname);
    if (a) {
      a.state = 'acknowledged';
      a.ackAt = a.createdAt + after;
      a.ackBy = by;
    }
  };
  ack('RUH-DC1-DB-ERP01', 'diskFull', 'op-noura', 25 * MINUTE);
  ack('RUH-DC1-NAS01', 'diskFull', 'op-omar', 2 * HOUR);
  ack('MKH-BR-PRN01', 'deviceDown', 'op-reem', 40 * MINUTE);
  ack('NUM-BR-ER01', 'linkDown', 'op-faisal', 6 * MINUTE);

  // 2) A few informational / housekeeping alerts.
  const byHost = (h: string) => DEVICES.find((d) => d.hostname === h);
  const lb = byHost('RUH-DC1-LB01');
  if (lb) alerts.push(alertFor(lb, 'certExpiring', T0 - 3 * HOUR, { cn: 'portal.example.sa', days: 14 }));
  const fw = byHost('DMM-BR-FW01');
  if (fw) alerts.push(alertFor(fw, 'configChanged', T0 - 95 * MINUTE, { user: 'netops' }));
  const sw = byHost('JED-BR-SW02');
  if (sw) alerts.push(alertFor(sw, 'interfaceFlapping', T0 - 34 * MINUTE, { iface: 'Gi1/0/5', count: 7 }));

  // 3) Resolved history over the last 14 days.
  const historyTypes: [AlertType, number][] = [
    ['cpuHigh', 7],
    ['highLatency', 6],
    ['interfaceFlapping', 4],
    ['packetLoss', 4],
    ['deviceDown', 3],
    ['diskFull', 3],
    ['memHigh', 3],
    ['backupFailed', 2],
    ['bgpPeerDown', 1],
    ['configChanged', 4],
    ['tempHigh', 2],
    ['linkDown', 2],
  ];
  const operators = ['op-faisal', 'op-noura', 'op-omar', 'op-reem'];
  for (let i = 0; i < 52; i++) {
    const type = r.weighted(historyTypes);
    const candidates = DEVICES.filter((d) => {
      switch (type) {
        case 'bgpPeerDown':
          return d.type === 'coreRouter' || d.type === 'edgeRouter';
        case 'linkDown':
          return d.type === 'edgeRouter';
        case 'backupFailed':
          return d.hostname.includes('BKP') || d.type === 'database';
        case 'diskFull':
          return d.metrics.includes('disk');
        case 'interfaceFlapping':
          return d.type === 'switch';
        case 'tempHigh':
          return d.metrics.includes('temp');
        default:
          return d.type !== 'printer' && d.type !== 'ups';
      }
    });
    const d = r.pick(candidates);
    const createdAt = T0 - r.int(2, 14 * 24) * HOUR - r.int(0, 59) * MINUTE;
    const params: Alert['params'] =
      type === 'linkDown'
        ? { iface: 'Gi0/0/0', carrier: r.pick(['carrierA', 'carrierC']) }
        : type === 'interfaceFlapping'
          ? { iface: `Gi1/0/${r.int(1, 8)}`, count: r.int(4, 12) }
          : type === 'bgpPeerDown'
            ? { peer: `10.${r.int(1, 10)}.0.1` }
            : type === 'backupFailed'
              ? { job: r.pick(['nightly-db', 'weekly-full', 'config-archive']) }
              : type === 'configChanged'
                ? { user: r.pick(['netops', 'a.alharbi', 'm.alqahtani']) }
                : metricAlertParams(
                    ({ cpuHigh: 'cpu', highLatency: 'latency', packetLoss: 'loss', diskFull: 'disk', memHigh: 'mem', tempHigh: 'temp' } as Record<string, MetricKey>)[type] ?? 'cpu',
                  );
    const a = alertFor(d, type, createdAt, params);
    if (type === 'cpuHigh' && r.chance(0.25)) a.severity = 'critical';
    const by = r.pick(operators);
    if (r.chance(0.7)) {
      a.ackAt = createdAt + r.int(2, 25) * MINUTE;
      a.ackBy = by;
    }
    a.state = 'resolved';
    a.resolvedAt = createdAt + r.int(6, 240) * MINUTE;
    a.resolvedBy = r.chance(0.4) ? 'op-system' : by;
    alerts.push(a);
  }

  return alerts.sort((x, y) => y.createdAt - x.createdAt);
}

export const INITIAL_ALERTS: readonly Alert[] = buildInitialAlerts();

/** Mean time to resolve (minutes) over resolved alerts in the window. */
export function mttrMinutes(alerts: readonly Alert[], windowMs = 14 * DAY, now = Date.now()): number {
  const resolved = alerts.filter((a) => a.resolvedAt && a.createdAt > now - windowMs);
  if (!resolved.length) return 0;
  return resolved.reduce((s, a) => s + ((a.resolvedAt ?? a.createdAt) - a.createdAt), 0) / resolved.length / MINUTE;
}
