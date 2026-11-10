import { ArrowLeft, Eye, ScrollText, Workflow } from 'lucide-react';
import type { GetStaticPaths, GetStaticProps } from 'next';
import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertActions } from '@/components/alerts/AlertActions';
import { Sparkline } from '@/components/charts/Sparkline';
import { TimeSeriesChart, type SeriesDef, type Threshold } from '@/components/charts/TimeSeriesChart';
import { PageTitle } from '@/components/layout/PageTitle';
import { AlertStateBadge, Badge, SeverityBadge, StatusDot, StatusPill } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState, Skeleton, SkeletonCard } from '@/components/ui/Feedback';
import { Segmented } from '@/components/ui/Form';
import { MetricBar } from '@/components/ui/MetricBar';
import {
  DEVICES,
  currentEpisode,
  deviceStatus,
  getDevice,
  hashString,
  interfaceUtil,
  uptimeHistory,
  type Device,
  type MetricKey,
} from '@/mock';
import { cn } from '@/lib/cn';
import { hasArabic } from '@/lib/format';
import { useActorName, useAlertTitle, useOperatorName } from '@/lib/domain';
import { useDuration, useFormat, useSimulatedLoading } from '@/lib/hooks';
import { deviceSeries, type RangeKey } from '@/lib/series';
import { useLive } from '@/store/live';
import { toast } from '@/store/ui';

interface Props {
  id: string;
}

export const getStaticPaths: GetStaticPaths = () => ({
  paths: DEVICES.map((d) => ({ params: { id: d.id } })),
  fallback: false,
});

export const getStaticProps: GetStaticProps<Props> = ({ params }) => ({
  props: { id: String(params?.id ?? '') },
});

const LEVEL_TONE = { critical: 'text-crit', error: 'text-crit', warning: 'text-warn', info: 'text-info', debug: 'text-subtle' } as const;

function Fact({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-subtle">{label}</dt>
      <dd className="mt-0.5 truncate text-[13px] font-medium text-fg">{children}</dd>
    </div>
  );
}

function LiveTile({ device, metric }: { device: Device; metric: MetricKey }) {
  const { t } = useTranslation();
  const f = useFormat();
  const now = useLive((s) => s.now);
  const episodes = useLive((s) => s.episodes[device.id]);
  const value = useLive((s) => s.live[device.id]?.[metric]);
  const spark = useMemo(
    () => deviceSeries(device, [metric], 'live', now, episodes).map((p) => ({ t: p.t, v: p[metric] as number | null })),
    [device, metric, now, episodes],
  );
  const fmt = (v: number | null | undefined) => {
    if (v === null || v === undefined) return '—';
    if (metric === 'latency') return f.ms(v);
    if (metric === 'bwIn' || metric === 'bwOut') return f.bandwidth(v);
    if (metric === 'temp') return f.unit(v, '°C');
    if (metric === 'loss') return `${f.number(v, 2)}%`;
    return `${f.number(v, 1)}%`;
  };
  const warn = metric === 'bwIn' || metric === 'bwOut' ? false : metric === 'latency' ? (value ?? 0) > 40 : metric === 'loss' ? (value ?? 0) > 1 : metric === 'temp' ? (value ?? 0) > 60 : metric === 'battery' ? (value ?? 100) < 95 : (value ?? 0) > 85;
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>{t(`metrics.${metric}`)}</span>
        <span className="text-[10.5px] text-subtle">{t('device.live.current')}</span>
      </div>
      <div className={cn('mt-1 text-2xl font-semibold tabular', value === null ? 'text-subtle' : warn ? 'text-warn' : 'text-fg')}>{fmt(value)}</div>
      <div className="mt-2">
        <Sparkline data={spark} color={warn ? 'var(--warn)' : 'var(--chart-1)'} height={36} />
      </div>
    </Card>
  );
}

function UptimeStrip({ device }: { device: Device }) {
  const { t } = useTranslation();
  const f = useFormat();
  const episodes = useLive((s) => s.episodes[device.id]);
  const now = useLive((s) => s.now);
  const minute = Math.floor(now / 60_000);
  const days = useMemo(() => uptimeHistory(device, episodes, 90, minute * 60_000), [device, episodes, minute]);
  const avg = (n: number) => {
    const xs = days.slice(-n).map((d) => d.value).filter((v): v is number => v !== null);
    return xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : 100;
  };
  const tone = (v: number | null) => (v === null ? 'bg-surface-3' : v >= 99.999 ? 'bg-ok' : v >= 99.5 ? 'bg-ok/55' : v >= 98 ? 'bg-warn' : 'bg-crit');
  return (
    <Card>
      <CardHeader
        title={t('device.uptime.title')}
        subtitle={t('device.uptime.subtitle')}
        actions={
          <div className="flex gap-4 text-xs">
            {[7, 30, 90].map((n) => (
              <div key={n} className="text-end">
                <div className="text-subtle">{t(`device.uptime.d${n}`)}</div>
                <div className="font-semibold text-fg tabular">{f.percent(avg(n), 2)}</div>
              </div>
            ))}
          </div>
        }
      />
      <CardBody>
        <div className="flex h-9 items-end gap-[2px]">
          {days.map((d) => (
            <div
              key={d.dayIndex}
              className={cn('h-full min-w-[2px] flex-1 rounded-[2px] transition-opacity hover:opacity-70', tone(d.value))}
              title={t('device.uptime.dayTooltip', { date: f.date(d.t), value: d.value === null ? t('device.uptime.noData') : f.percent(d.value, 2) })}
            />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap justify-between gap-2 text-[11px] text-subtle">
          <span>{f.date(days[0]?.t ?? now)}</span>
          <div className="flex flex-wrap gap-3">
            {[
              ['bg-ok', 'legendFull'],
              ['bg-ok/55', 'legendMinor'],
              ['bg-warn', 'legendMajor'],
              ['bg-crit', 'legendOutage'],
            ].map(([c, k]) => (
              <span key={k} className="inline-flex items-center gap-1">
                <span className={cn('size-2.5 rounded-sm', c)} />
                <span dir="ltr">{t(`device.uptime.${k}`)}</span>
              </span>
            ))}
          </div>
          <span>{t('common.today')}</span>
        </div>
      </CardBody>
    </Card>
  );
}

function PerformanceCharts({ device }: { device: Device }) {
  const { t } = useTranslation();
  const f = useFormat();
  const [range, setRange] = useState<RangeKey>('live');
  const now = useLive((s) => s.now);
  const episodes = useLive((s) => s.episodes[device.id]);
  const tick = range === 'live' || range === '1h' ? now : Math.floor(now / 60_000) * 60_000;
  const data = useMemo(() => deviceSeries(device, device.metrics, range, tick, episodes), [device, range, tick, episodes]);
  const has = (m: MetricKey) => device.metrics.includes(m);
  const pct = (v: number) => `${f.number(v, 1)}%`;

  const charts: { key: string; title: string; series: SeriesDef[]; fmt: (v: number) => string; axis?: (v: number) => string; domain?: [number, number | 'auto']; thresholds?: Threshold[] }[] = [];
  if (has('cpu') || has('mem')) {
    const s: SeriesDef[] = [];
    if (has('cpu')) s.push({ key: 'cpu', label: t('metrics.cpu'), color: 'var(--chart-1)' });
    if (has('mem')) s.push({ key: 'mem', label: t('metrics.mem'), color: 'var(--chart-2)', type: 'line' });
    if (has('disk')) s.push({ key: 'disk', label: t('metrics.disk'), color: 'var(--chart-3)', type: 'line', dashed: true });
    charts.push({ key: 'util', title: t('device.charts.utilization'), series: s, fmt: pct, axis: (v) => `${f.number(v)}%`, domain: [0, 100], thresholds: [{ value: 85, tone: 'warn' }, { value: 95, tone: 'crit' }] });
  }
  if (has('load') || has('battery')) {
    charts.push({
      key: 'power',
      title: t('device.charts.power'),
      series: [
        { key: 'load', label: t('metrics.load'), color: 'var(--chart-1)' },
        { key: 'battery', label: t('metrics.battery'), color: 'var(--chart-3)', type: 'line' },
      ],
      fmt: pct,
      axis: (v) => `${f.number(v)}%`,
      domain: [0, 100],
    });
  }
  if (has('bwIn') && device.category !== 'facility') {
    charts.push({
      key: 'bw',
      title: t('device.charts.bandwidth'),
      series: [
        { key: 'bwIn', label: t('metrics.bwIn'), color: 'var(--chart-1)' },
        { key: 'bwOut', label: t('metrics.bwOut'), color: 'var(--chart-2)' },
      ],
      fmt: (v) => f.bandwidth(v),
      axis: (v) => (v >= 1000 ? `${f.number(v / 1000, 0)}G` : `${f.number(v)}M`),
    });
  }
  if (has('latency')) {
    charts.push({ key: 'lat', title: t('device.charts.latency'), series: [{ key: 'latency', label: t('metrics.latency'), color: 'var(--chart-4)', type: 'line' }], fmt: (v) => f.ms(v), axis: (v) => `${f.number(v)}`, thresholds: [{ value: 40, tone: 'warn' }] });
  }
  if (has('loss')) {
    charts.push({ key: 'loss', title: t('device.charts.loss'), series: [{ key: 'loss', label: t('metrics.loss'), color: 'var(--chart-3)' }], fmt: (v) => `${f.number(v, 2)}%`, axis: (v) => `${f.number(v, 1)}%`, thresholds: [{ value: 1, tone: 'warn' }] });
  }
  if (has('temp')) {
    charts.push({ key: 'temp', title: t('device.charts.temp'), series: [{ key: 'temp', label: t('metrics.temp'), color: 'var(--chart-3)', type: 'line' }], fmt: (v) => f.unit(v, '°C'), axis: (v) => `${f.number(v)}°`, thresholds: [{ value: 65, tone: 'warn' }] });
  }

  return (
    <Card>
      <CardHeader
        title={t('device.charts.title')}
        subtitle={range === 'live' ? `${t('device.charts.subtitle')} · ${t('device.live.polling')}` : t('device.charts.subtitle')}
        actions={
          <Segmented
            label={t('device.charts.title')}
            value={range}
            onChange={setRange}
            options={(['live', '1h', '24h', '7d', '30d', '90d'] as RangeKey[]).map((r) => ({ value: r, label: t(`timeRanges.${r}`) }))}
          />
        }
      />
      <CardBody className="grid gap-6 lg:grid-cols-2">
        {charts.map((c) => (
          <div key={c.key} className="min-w-0">
            <div className="mb-1 text-[13px] font-semibold text-fg">{c.title}</div>
            <TimeSeriesChart data={data} series={c.series} height={190} valueFormatter={c.fmt} axisFormatter={c.axis} yDomain={c.domain} thresholds={c.thresholds} weekendBands syncId={`dev-${device.id}`} />
          </div>
        ))}
      </CardBody>
    </Card>
  );
}

function Interfaces({ device }: { device: Device }) {
  const { t } = useTranslation();
  const f = useFormat();
  const now = useLive((s) => s.now);
  const episodes = useLive((s) => s.episodes[device.id]);
  const down = deviceStatus(episodes) === 'down';
  const up = device.interfaces.filter((i) => i.baseStatus === 'up' && !down).length;
  return (
    <Card>
      <CardHeader title={t('device.interfaces.title')} subtitle={t('device.interfaces.subtitle', { up: f.number(up), total: f.number(device.interfaces.length) })} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-[12.5px]">
          <thead className="border-y border-line bg-surface-2 text-[11px] text-muted">
            <tr>
              <th className="px-4 py-2 text-start font-medium">{t('device.interfaces.name')}</th>
              <th className="px-3 py-2 text-start font-medium">{t('device.interfaces.kind')}</th>
              <th className="px-3 py-2 text-start font-medium">{t('device.interfaces.status')}</th>
              <th className="px-3 py-2 text-end font-medium">{t('device.interfaces.speed')}</th>
              <th className="w-32 px-3 py-2 text-start font-medium">{t('device.interfaces.in')}</th>
              <th className="w-32 px-3 py-2 text-start font-medium">{t('device.interfaces.out')}</th>
              <th className="px-4 py-2 text-end font-medium">{t('device.interfaces.errors')}</th>
            </tr>
          </thead>
          <tbody>
            {device.interfaces.map((i) => {
              const status = down ? 'down' : i.baseStatus;
              const uIn = status === 'up' ? interfaceUtil(device, i, now, episodes) * 100 : null;
              const uOut = status === 'up' ? interfaceUtil(device, i, now - 7_000, episodes) * 100 * 0.62 : null;
              const errors = status === 'up' && hashString(device.id + i.name) % 9 === 0 ? (hashString(i.name + device.id) % 140) + 3 : 0;
              return (
                <tr key={i.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-2">
                    <div className="ltr-text font-semibold text-fg">{i.name}</div>
                    {i.carrier && <div className="text-[11px] text-subtle">{t(`carriers.${i.carrier}`)}</div>}
                  </td>
                  <td className="px-3 py-2 text-muted">
                    {t(`interfaces.kinds.${i.kind}`)}
                    {i.vlan ? <span className="ms-1 text-subtle">· VLAN {i.vlan}</span> : null}
                  </td>
                  <td className="px-3 py-2">
                    <Badge tone={status === 'up' ? 'ok' : status === 'down' ? 'crit' : 'neutral'}>{t(`interfaces.status.${status}`)}</Badge>
                  </td>
                  <td className="px-3 py-2 text-end text-muted tabular" dir="ltr">{f.speed(i.speedMbps)}</td>
                  <td className="px-3 py-2">{uIn === null ? <span className="text-subtle">—</span> : <MetricBar value={uIn} thin warn={70} crit={90} />}</td>
                  <td className="px-3 py-2">{uOut === null ? <span className="text-subtle">—</span> : <MetricBar value={uOut} thin warn={70} crit={90} />}</td>
                  <td className={cn('px-4 py-2 text-end tabular', errors ? 'text-warn' : 'text-subtle')}>{f.number(errors)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function DeviceAlerts({ device }: { device: Device }) {
  const { t } = useTranslation();
  const f = useFormat();
  const alerts = useLive((s) => s.alerts);
  const now = useLive((s) => s.now);
  const title = useAlertTitle();
  const opName = useOperatorName();
  const list = useMemo(() => alerts.filter((a) => a.deviceId === device.id).slice(0, 8), [alerts, device.id]);
  return (
    <Card className="flex flex-col">
      <CardHeader title={t('device.alerts.title')} />
      {list.length === 0 ? (
        <EmptyState title={t('device.alerts.empty')} className="py-8" />
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {list.map((a) => (
            <li key={a.id} className="px-4 py-3 sm:px-5">
              <div className="flex items-start gap-2.5">
                <SeverityBadge severity={a.severity} className="mt-px shrink-0" />
                <div className="min-w-0 flex-1 text-[13px] font-medium leading-snug text-fg">{title(a)}</div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <AlertStateBadge state={a.state} />
                <span className="text-[11.5px] text-subtle">
                  {f.relative(a.createdAt, now)}
                  {a.ackBy && ` · ${t('common.by', { name: opName(a.ackBy) })}`}
                </span>
                <span className="ms-auto">
                  <AlertActions alert={a} compact />
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function DeviceLogs({ device }: { device: Device }) {
  const { t } = useTranslation();
  const f = useFormat();
  const logs = useLive((s) => s.logs);
  const list = useMemo(() => logs.filter((l) => l.deviceId === device.id || l.source === device.hostname).slice(0, 10), [logs, device]);
  return (
    <Card className="flex flex-col">
      <CardHeader
        title={t('device.logs.title')}
        actions={
          <Link href={`/logs?source=${encodeURIComponent(device.hostname)}`} className="text-xs font-medium text-brand hover:underline">
            {t('device.logs.openExplorer')}
          </Link>
        }
      />
      {list.length === 0 ? (
        <EmptyState title={t('device.logs.empty')} className="py-8" />
      ) : (
        <ul className="divide-y divide-line border-t border-line font-mono text-[11.5px]">
          {list.map((l) => (
            <li key={l.id} className="flex gap-3 px-4 py-2 sm:px-5">
              <span className="shrink-0 text-subtle tabular">{f.time(l.ts, true)}</span>
              <span className={cn('w-14 shrink-0 font-semibold uppercase', LEVEL_TONE[l.level])}>{l.level}</span>
              <span className={cn('min-w-0 break-words text-fg', hasArabic(l.message) && 'font-arabic text-[12.5px]')} dir="auto">
                {l.message}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function RelatedRow({ d }: { d: Device }) {
  const { t } = useTranslation();
  const status = useLive((s) => deviceStatus(s.episodes[d.id]));
  return (
    <Link href={`/devices/${d.id}/`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-2">
      <StatusDot status={status} />
      <span className="ltr-text truncate text-[12.5px] font-medium text-fg">{d.hostname}</span>
      <span className="ms-auto shrink-0 text-[11px] text-subtle">{t(`deviceTypes.${d.type}`)}</span>
    </Link>
  );
}

function Related({ device }: { device: Device }) {
  const { t } = useTranslation();
  const parent = device.parentId ? getDevice(device.parentId) : undefined;
  const children = DEVICES.filter((d) => d.parentId === device.id);
  return (
    <Card>
      <CardHeader title={t('device.related.title')} />
      <CardBody className="space-y-4">
        <div>
          <div className="mb-1 text-[11px] font-medium text-subtle">{t('device.related.upstream')}</div>
          {parent ? <RelatedRow d={parent} /> : <div className="px-2 text-[12.5px] text-muted">{t('device.related.none')}</div>}
        </div>
        <div>
          <div className="mb-1 text-[11px] font-medium text-subtle">{t('device.related.downstream')}</div>
          {children.length ? (
            <div className="max-h-56 overflow-y-auto scroll-thin">
              {children.map((c) => (
                <RelatedRow key={c.id} d={c} />
              ))}
            </div>
          ) : (
            <div className="px-2 text-[12.5px] text-muted">{t('device.related.none')}</div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

export default function DevicePage({ id }: Props) {
  const { t } = useTranslation();
  const f = useFormat();
  const dur = useDuration();
  const loading = useSimulatedLoading(400);
  const device = getDevice(id);
  const episodes = useLive((s) => (device ? s.episodes[device.id] : undefined));
  const now = useLive((s) => s.now);
  const alerts = useLive((s) => s.alerts);
  const acknowledge = useLive((s) => s.acknowledge);
  const actor = useActorName();

  if (!device) {
    return <EmptyState title={t('device.notFound')} action={<ButtonLink href="/network">{t('device.back')}</ButtonLink>} />;
  }

  const status = deviceStatus(episodes);
  const ep = currentEpisode(episodes);
  const openAlerts = alerts.filter((a) => a.deviceId === device.id && a.state === 'open');
  const tiles: MetricKey[] = device.metrics.filter((m) => m !== 'bwOut' && m !== 'loss').slice(0, 4);
  if (tiles.length < 4 && device.metrics.includes('loss')) tiles.push('loss');

  return (
    <>
      <PageTitle title={device.hostname} />
      <Link href="/network" className="mb-3 inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-fg">
        <ArrowLeft className="size-4 rtl:-scale-x-100" />
        {t('device.back')}
      </Link>

      <Card className="mb-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="ltr-text text-xl font-semibold tracking-tight text-fg sm:text-2xl">{device.hostname}</h1>
              <StatusPill status={status} />
              <Badge tone="neutral">{t(`deviceTypes.${device.type}`)}</Badge>
            </div>
            <p className="mt-1 text-[13px] text-muted">
              {t(`sites.${device.siteId}`)} · <span className="ltr-text tabular">{device.ip}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {openAlerts.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                leading={<Eye className="size-4" />}
                onClick={() => {
                  acknowledge(openAlerts.map((a) => a.id), actor);
                  toast({ kind: 'info', title: t('toasts.acknowledged', { count: openAlerts.length }) });
                }}
              >
                {t('device.actions.ackAll')}
              </Button>
            )}
            <ButtonLink href={`/topology?focus=${device.id}`} size="sm" variant="outline" leading={<Workflow className="size-4" />}>
              {t('device.actions.viewTopology')}
            </ButtonLink>
            <ButtonLink href={`/logs?source=${encodeURIComponent(device.hostname)}`} size="sm" variant="outline" leading={<ScrollText className="size-4" />}>
              {t('device.actions.viewLogs')}
            </ButtonLink>
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-line pt-4 sm:grid-cols-3 lg:grid-cols-6">
          <Fact label={t('common.vendor')}>{device.vendor}</Fact>
          <Fact label={t('common.model')}>
            <span className="ltr-text">{device.model}</span>
          </Fact>
          <Fact label={t('common.os')}>
            <span className="ltr-text">{device.os}</span>
          </Fact>
          <Fact label={t('common.serial')}>
            <span className="ltr-text tabular">{device.serial}</span>
          </Fact>
          <Fact label={status === 'down' ? t('device.facts.downSince') : t('device.facts.uptime')}>
            {status === 'down' && ep ? <span className="text-crit">{f.time(ep.since)} · {dur(now - ep.since)}</span> : dur(now - device.bootTime)}
          </Fact>
          <Fact label={t('device.facts.criticality')}>{t(`device.facts.${device.criticality}`)}</Fact>
        </dl>
      </Card>

      {loading ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          <Skeleton className="h-[460px]" />
        </div>
      ) : (
        <div className="space-y-4">
          {status === 'down' && (
            <div className="flex items-center gap-2 rounded-xl border border-crit/30 bg-crit/10 px-4 py-3 text-[13px] font-medium text-crit">
              <StatusDot status="down" />
              {t('device.live.unreachable')}
            </div>
          )}
          <div className={cn('grid gap-4 sm:grid-cols-2', tiles.length >= 4 ? 'xl:grid-cols-4' : tiles.length === 3 ? 'xl:grid-cols-3' : '')}>
            {tiles.map((m) => (
              <LiveTile key={m} device={device} metric={m} />
            ))}
          </div>
          <PerformanceCharts device={device} />
          <UptimeStrip device={device} />
          <div className="grid gap-4 xl:grid-cols-3">
            <div className="space-y-4 xl:col-span-2">
              <Interfaces device={device} />
              <DeviceLogs device={device} />
            </div>
            <div className="space-y-4">
              <DeviceAlerts device={device} />
              <Related device={device} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

