import { appErrorRate, appLatency, appThroughput, deviceStatus, type AppService, type DeviceStatus, type EpisodeMap } from '@/mock';

export interface AppHealth {
  status: DeviceStatus;
  latency: number;
  errorRate: number;
  rpm: number;
  apdex: number;
}

/** Golden signals + a derived status for an application service at time `now`. */
export function appHealth(app: AppService, now: number, episodes: EpisodeMap): AppHealth {
  const hostsDown = app.hosts.filter((h) => deviceStatus(episodes[h]) === 'down').length;
  const hostsDegraded = app.hosts.filter((h) => deviceStatus(episodes[h]) === 'warning').length;
  const degraded = app.degraded || hostsDegraded > 0;
  const latency = appLatency(app, now, degraded);
  const errorRate = appErrorRate(app, now, degraded);
  const rpm = appThroughput(app, now);
  const apdex = Math.max(0, Math.min(1, 1 - Math.max(0, latency - app.sloLatencyMs * 0.5) / (app.sloLatencyMs * 4) - errorRate / 25));
  let status: DeviceStatus = 'up';
  if (hostsDown === app.hosts.length) status = 'down';
  else if (errorRate > 5 || latency > app.sloLatencyMs * 2) status = 'down';
  else if (errorRate > 1.5 || latency > app.sloLatencyMs || hostsDown > 0) status = 'warning';
  return { status, latency, errorRate, rpm, apdex };
}
