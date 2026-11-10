import {
  DAY,
  HOUR,
  MINUTE,
  SECOND,
  WAN_LINKS,
  metricValue,
  sampleSeries,
  wanLinkUtil,
  type ConditionEpisode,
  type Device,
  type MetricKey,
  type SeriesPoint,
} from '@/mock';

export type RangeKey = 'live' | '15m' | '1h' | '6h' | '24h' | '7d' | '30d' | '90d';

/** Span and bucket size for each range — keeps every chart at ~60–360 points. */
export const RANGES: Record<RangeKey, { span: number; step: number; samples: number }> = {
  live: { span: 5 * MINUTE, step: 5 * SECOND, samples: 1 },
  '15m': { span: 15 * MINUTE, step: 15 * SECOND, samples: 1 },
  '1h': { span: HOUR, step: MINUTE, samples: 1 },
  '6h': { span: 6 * HOUR, step: 5 * MINUTE, samples: 2 },
  '24h': { span: DAY, step: 5 * MINUTE, samples: 2 },
  '7d': { span: 7 * DAY, step: 30 * MINUTE, samples: 3 },
  '30d': { span: 30 * DAY, step: 2 * HOUR, samples: 4 },
  '90d': { span: 90 * DAY, step: 6 * HOUR, samples: 6 },
};

export function deviceSeries(device: Device, keys: MetricKey[], range: RangeKey, now: number, episodes?: readonly ConditionEpisode[]): SeriesPoint[] {
  const { span, step, samples } = RANGES[range];
  const fns: Record<string, (t: number) => number | null> = {};
  for (const k of keys) fns[k] = (t) => (t > now ? null : metricValue(device, k, t, episodes, now));
  return sampleSeries(now - span, now, step, fns, samples);
}

/** Aggregate WAN traffic (Mbps) across all carrier links. */
export function wanSeries(range: RangeKey, now: number): SeriesPoint[] {
  const { span, step, samples } = RANGES[range];
  const links = WAN_LINKS.filter((l) => l.kind !== 'dci');
  return sampleSeries(
    now - span,
    now,
    step,
    {
      in: (t) => links.reduce((s, l) => s + l.capacityMbps * wanLinkUtil(l, t) * 0.64, 0),
      out: (t) => links.reduce((s, l) => s + l.capacityMbps * wanLinkUtil(l, t, l.status, ':out') * 0.36, 0),
    },
    samples,
  );
}
