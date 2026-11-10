import { Activity, ArrowRight, Bell, Gauge, HardDrive, Timer } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HealthGauge } from '@/components/charts/HealthGauge';
import { Sparkline } from '@/components/charts/Sparkline';
import { TimeSeriesChart } from '@/components/charts/TimeSeriesChart';
import { PageTitle } from '@/components/layout/PageTitle';
import { SaudiMap } from '@/components/map/SaudiMap';
import { Badge, Dot, SeverityBadge, StatusDot, severityTone } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader, PageHeader } from '@/components/ui/Card';
import { EmptyState, Skeleton, SkeletonCard } from '@/components/ui/Feedback';
import { Segmented } from '@/components/ui/Form';
import {
  DEVICES,
  SITES,
  availability,
  businessHoursAvailability,
  deviceStatus,
  getDevice,
  healthScore,
  isActive,
  mttrMinutes,
  problemScore,
  statusCounts,
  uptimeHistory,
  type SiteId,
} from '@/mock';
import { cn } from '@/lib/cn';
import { useAlertTitle, useSiteHealth } from '@/lib/domain';
import { useDuration, useFormat, useSimulatedLoading } from '@/lib/hooks';
import { wanSeries, type RangeKey } from '@/lib/series';
import { useLive } from '@/store/live';

const SLA_TARGET = 99.9;

function HealthCard() {
  const { t } = useTranslation();
  const f = useFormat();
  const dur = useDuration();
  const episodes = useLive((s) => s.episodes);
  const alerts = useLive((s) => s.alerts);
  const now = useLive((s) => s.now);
  const score = useMemo(() => healthScore(DEVICES, episodes, alerts), [episodes, alerts]);
  const avail = useMemo(() => availability(DEVICES, episodes, 30, now), [episodes, now]);
  const mttr = useMemo(() => mttrMinutes(alerts, 14 * 86_400_000, now), [alerts, now]);
  const label = score >= 85 ? t('overview.health.good') : score >= 70 ? t('overview.health.attention') : t('overview.health.poor');
  return (
    <Card className="flex flex-col p-4">
      <div className="text-xs font-medium text-muted">{t('overview.health.title')}</div>
      <div className="mt-2 flex items-center gap-4">
        <HealthGauge value={score} size={112} label={t('overview.health.title')} />
        <div className="min-w-0 space-y-2.5">
          <Badge tone={score >= 85 ? 'ok' : score >= 70 ? 'warn' : 'crit'}>{label}</Badge>
          <div>
            <div className="text-[11px] text-subtle">{t('overview.health.availability30')}</div>
            <div className="text-sm font-semibold text-fg tabular">{f.percent(avail, 2)}</div>
          </div>
          <div>
            <div className="text-[11px] text-subtle">{t('overview.health.mttr')}</div>
            <div className="text-sm font-semibold text-fg tabular">{dur(mttr * 60_000)}</div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function DevicesCard() {
  const { t } = useTranslation();
  const f = useFormat();
  const episodes = useLive((s) => s.episodes);
  const c = useMemo(() => statusCounts(DEVICES, episodes), [episodes]);
  const rows: { key: 'up' | 'warning' | 'down'; tone: 'ok' | 'warn' | 'crit' }[] = [
    { key: 'up', tone: 'ok' },
    { key: 'warning', tone: 'warn' },
    { key: 'down', tone: 'crit' },
  ];
  return (
    <Card className="flex flex-col p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium text-muted">{t('overview.devices.title')}</div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-semibold text-fg tabular">{f.number(c.total)}</span>
            <span className="text-xs text-subtle">{t('overview.devices.monitored')}</span>
          </div>
        </div>
        <span className="grid size-9 place-items-center rounded-lg bg-brand/12 text-brand">
          <HardDrive className="size-4.5" />
        </span>
      </div>
      <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-surface-3" aria-hidden>
        <div className="bg-ok transition-[width] duration-700" style={{ width: `${(c.up / c.total) * 100}%` }} />
        <div className="bg-warn transition-[width] duration-700" style={{ width: `${(c.warning / c.total) * 100}%` }} />
        <div className="bg-crit transition-[width] duration-700" style={{ width: `${(c.down / c.total) * 100}%` }} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {rows.map((r) => (
          <Link key={r.key} href={`/network?status=${r.key}`} className="rounded-lg border border-line px-2.5 py-1.5 transition-colors hover:border-line-strong hover:bg-surface-2">
            <div className="flex items-center gap-1.5 text-[11px] text-muted">
              <Dot tone={r.tone} pulse={r.key === 'down' && c.down > 0} />
              {t(`status.${r.key}`)}
            </div>
            <div className="mt-0.5 text-lg font-semibold text-fg tabular">{f.number(c[r.key])}</div>
          </Link>
        ))}
      </div>
    </Card>
  );
}

function AlertsCard() {
  const { t } = useTranslation();
  const f = useFormat();
  const alerts = useLive((s) => s.alerts);
  const active = useMemo(() => alerts.filter(isActive), [alerts]);
  const unacked = active.filter((a) => a.state === 'open').length;
  const sev = (['critical', 'warning', 'info'] as const).map((s) => ({ s, n: active.filter((a) => a.severity === s).length }));
  const max = Math.max(1, ...sev.map((x) => x.n));
  return (
    <Card className="flex flex-col p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium text-muted">{t('overview.alerts.title')}</div>
          <div className="mt-1.5 text-2xl font-semibold text-fg tabular">{f.number(active.length)}</div>
        </div>
        <span className="grid size-9 place-items-center rounded-lg bg-crit/12 text-crit">
          <Bell className="size-4.5" />
        </span>
      </div>
      <div className="mt-3 space-y-1.5">
        {sev.map(({ s, n }) => (
          <Link key={s} href={`/alerts?severity=${s}`} className="group flex items-center gap-2 text-xs">
            <span className="w-14 shrink-0 text-muted group-hover:text-fg">{t(`severity.${s}`)}</span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
              <span className={cn('block h-full rounded-full transition-[width] duration-700', s === 'critical' ? 'bg-crit' : s === 'warning' ? 'bg-warn' : 'bg-info')} style={{ width: `${(n / max) * 100}%` }} />
            </span>
            <span className="w-5 text-end font-semibold text-fg tabular">{f.number(n)}</span>
          </Link>
        ))}
      </div>
      <div className="mt-auto pt-2 text-[11.5px] text-subtle">{t('overview.alerts.unacked', { count: unacked })}</div>
    </Card>
  );
}

function SlaCard() {
  const { t } = useTranslation();
  const f = useFormat();
  const episodes = useLive((s) => s.episodes);
  const now = useLive((s) => s.now);
  const avail = useMemo(() => availability(DEVICES, episodes, 30, now), [episodes, now]);
  const biz = useMemo(() => businessHoursAvailability(DEVICES, episodes, 30, now), [episodes, now]);
  const daily = useMemo(() => {
    const core = DEVICES.filter((d) => d.criticality !== 'tier3');
    const hist = core.map((d) => uptimeHistory(d, episodes[d.id], 30, now));
    return hist[0]?.map((p, i) => ({ t: p.t, v: hist.reduce((s, h) => s + (h[i]?.value ?? 100), 0) / hist.length })) ?? [];
  }, [episodes, now]);
  const above = avail >= SLA_TARGET;
  return (
    <Card className="flex flex-col p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium text-muted">{t('overview.sla.title')}</div>
          <div className="mt-1.5 text-2xl font-semibold text-fg tabular">{f.percent(avail, 2)}</div>
        </div>
        <span className="grid size-9 place-items-center rounded-lg bg-ok/12 text-ok">
          <Gauge className="size-4.5" />
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Badge tone={above ? 'ok' : 'warn'}>{above ? t('overview.sla.aboveTarget') : t('overview.sla.belowTarget')}</Badge>
        <span className="text-[11.5px] text-subtle">{t('overview.sla.target', { value: f.percent(SLA_TARGET, 1) })}</span>
      </div>
      <div className="mt-2">
        <Sparkline data={daily} color="var(--ok)" height={34} domain={[99.3, 100]} />
      </div>
      <div className="mt-auto text-[11.5px] text-subtle">{t('overview.sla.businessHours', { value: f.percent(biz, 3) })}</div>
    </Card>
  );
}

function MapCard() {
  const { t } = useTranslation();
  const f = useFormat();
  const router = useRouter();
  const health = useSiteHealth();
  const info = (id: SiteId) => {
    const h = health[id];
    return {
      tone: h.tone,
      detail: t('overview.map.summary', { up: f.number(h.up), warning: f.number(h.warning), down: f.number(h.down) }),
      lines: [t('overview.map.alerts', { count: h.activeAlerts })],
    };
  };
  return (
    <Card className="lg:col-span-8">
      <CardHeader title={t('overview.map.title')} subtitle={t('overview.map.subtitle')} />
      <CardBody className="grid items-center gap-5 md:grid-cols-[1.6fr_1fr]">
        <div className="relative">
          <SaudiMap info={info} onSiteClick={(id) => void router.push(`/network?site=${id}`)} />
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
            <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 bg-brand" />{t('overview.map.legendLink')}</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 border-t-2 border-dashed border-crit" />{t('overview.map.legendDown')}</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 bg-accent" />{t('overview.map.legendDci')}</span>
            <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] bg-ok" />{t('overview.map.dc')}</span>
          </div>
        </div>
        <div className="min-w-0">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-[11px] text-subtle">
                <th className="pb-2 text-start font-medium">{t('overview.sites.col.site')}</th>
                <th className="pb-2 text-end font-medium">{t('overview.sites.col.devices')}</th>
                <th className="pb-2 text-end font-medium">{t('overview.sites.col.alerts')}</th>
              </tr>
            </thead>
            <tbody>
              {SITES.map((s) => {
                const h = health[s.id];
                return (
                  <tr key={s.id} className="border-t border-line">
                    <td className="py-1.5">
                      <Link href={`/network?site=${s.id}`} className="flex items-center gap-2 text-fg hover:text-brand">
                        <Dot tone={h.tone} pulse={h.tone === 'crit'} />
                        <span className="truncate">{t(`sites.${s.id}`)}</span>
                      </Link>
                    </td>
                    <td className="py-1.5 text-end text-muted tabular">
                      {h.down + h.warning > 0 ? (
                        <span>
                          <span className={h.down ? 'text-crit' : 'text-warn'}>{f.number(h.down + h.warning)}</span>/{f.number(h.total)}
                        </span>
                      ) : (
                        f.number(h.total)
                      )}
                    </td>
                    <td className="py-1.5 text-end tabular">
                      {h.activeAlerts > 0 ? <span className={h.critical ? 'font-semibold text-crit' : 'text-warn'}>{f.number(h.activeAlerts)}</span> : <span className="text-subtle">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}

function ProblemDevices() {
  const { t } = useTranslation();
  const episodes = useLive((s) => s.episodes);
  const alerts = useLive((s) => s.alerts);
  const title = useAlertTitle();
  const top = useMemo(
    () =>
      DEVICES.map((d) => ({ d, score: problemScore(d, episodes, alerts) }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5),
    [episodes, alerts],
  );
  return (
    <Card className="lg:col-span-4">
      <CardHeader title={t('overview.problems.title')} subtitle={t('overview.problems.subtitle')} icon={<Activity className="size-4" />} />
      {top.length === 0 ? (
        <EmptyState title={t('overview.problems.none')} />
      ) : (
        <ol className="px-2 pb-3">
          {top.map(({ d }, i) => {
            const st = deviceStatus(episodes[d.id]);
            const worst = alerts
              .filter((a) => a.deviceId === d.id && isActive(a))
              .sort((a, b) => (a.severity === 'critical' ? -1 : 0) - (b.severity === 'critical' ? -1 : 0))[0];
            return (
              <li key={d.id}>
                <Link href={`/devices/${d.id}/`} className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-2">
                  <span className="grid size-6 shrink-0 place-items-center rounded-md bg-surface-3 text-[11px] font-semibold text-muted tabular">{i + 1}</span>
                  <StatusDot status={st} />
                  <div className="min-w-0 flex-1">
                    <div className="ltr-text truncate text-[13px] font-semibold text-fg">{d.hostname}</div>
                    <div className="truncate text-[11.5px] text-muted">
                      {worst ? title(worst) : t(`status.${st}`)} · {t(`sites.${d.siteId}`)}
                    </div>
                  </div>
                  {worst && <SeverityBadge severity={worst.severity} className="hidden sm:inline-flex" />}
                  <ArrowRight className="size-4 shrink-0 text-subtle opacity-0 transition-opacity group-hover:opacity-100 rtl:-scale-x-100" />
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}

function BandwidthCard() {
  const { t } = useTranslation();
  const f = useFormat();
  const [range, setRange] = useState<RangeKey>('24h');
  const now = useLive((s) => s.now);
  // Long ranges only need to refresh once a minute.
  const bucketNow = range === '24h' ? now : Math.floor(now / 60_000) * 60_000;
  const data = useMemo(() => wanSeries(range, bucketNow), [range, bucketNow]);
  const peak = useMemo(() => Math.max(...data.map((p) => (p.in as number) ?? 0)), [data]);
  const cur = data[data.length - 1];
  return (
    <Card className="lg:col-span-8">
      <CardHeader
        title={t('overview.bandwidth.title')}
        subtitle={t('overview.bandwidth.subtitle')}
        actions={
          <Segmented
            label={t('overview.bandwidth.title')}
            value={range}
            onChange={setRange}
            options={(['24h', '7d', '30d', '90d'] as RangeKey[]).map((r) => ({ value: r, label: t(`timeRanges.${r}`) }))}
          />
        }
      />
      <CardBody>
        <div className="mb-3 flex flex-wrap gap-6">
          <div>
            <div className="text-[11px] text-subtle">{t('overview.bandwidth.current')} · {t('overview.bandwidth.inbound')}</div>
            <div className="text-lg font-semibold text-fg tabular">{f.bandwidth(cur?.in as number)}</div>
          </div>
          <div>
            <div className="text-[11px] text-subtle">{t('overview.bandwidth.current')} · {t('overview.bandwidth.outbound')}</div>
            <div className="text-lg font-semibold text-fg tabular">{f.bandwidth(cur?.out as number)}</div>
          </div>
          <div>
            <div className="text-[11px] text-subtle">{t('overview.bandwidth.peak')}</div>
            <div className="text-lg font-semibold text-fg tabular">{f.bandwidth(peak)}</div>
          </div>
        </div>
        <TimeSeriesChart
          data={data}
          height={270}
          weekendBands
          series={[
            { key: 'in', label: t('overview.bandwidth.inbound'), color: 'var(--chart-1)' },
            { key: 'out', label: t('overview.bandwidth.outbound'), color: 'var(--chart-2)' },
          ]}
          valueFormatter={(v) => f.bandwidth(v)}
          axisFormatter={(v) => (v >= 1000 ? `${f.number(v / 1000, 0)}G` : `${f.number(v)}M`)}
        />
      </CardBody>
    </Card>
  );
}

function RecentAlerts() {
  const { t } = useTranslation();
  const f = useFormat();
  const alerts = useLive((s) => s.alerts);
  const now = useLive((s) => s.now);
  const title = useAlertTitle();
  const recent = alerts.slice(0, 7);
  return (
    <Card className="flex flex-col lg:col-span-4">
      <CardHeader
        title={t('overview.recent.title')}
        subtitle={t('overview.recent.subtitle')}
        icon={<Timer className="size-4" />}
        actions={
          <Link href="/alerts" className="text-xs font-medium text-brand hover:underline">
            {t('actions.viewAll')}
          </Link>
        }
      />
      <ul className="flex-1 px-2 pb-3">
        {recent.map((a) => {
          const d = getDevice(a.deviceId);
          return (
            <li key={a.id} className="animate-fade-up">
              <Link href={`/devices/${a.deviceId}/`} className="flex gap-3 rounded-lg px-3 py-2 hover:bg-surface-2">
                <Dot tone={a.state === 'resolved' ? 'neutral' : severityTone[a.severity]} className="mt-1.5" pulse={a.state === 'open' && a.severity === 'critical'} />
                <div className="min-w-0 flex-1">
                  <div className={cn('truncate text-[13px] font-medium', a.state === 'resolved' ? 'text-muted line-through decoration-subtle/60' : 'text-fg')}>{title(a)}</div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-subtle">
                    <span className="ltr-text truncate">{d?.hostname}</span>
                    <span>·</span>
                    <span className="shrink-0">{f.relative(a.createdAt, now)}</span>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export default function OverviewPage() {
  const { t } = useTranslation();
  const loading = useSimulatedLoading();
  const branchCount = SITES.filter((s) => s.kind !== 'datacenter').length;
  return (
    <>
      <PageTitle title={t('nav.overview')} />
      <PageHeader title={t('overview.title')} subtitle={t('overview.subtitle', { sites: branchCount })} />
      {loading ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <SkeletonCard key={i} className="h-44" />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-12">
            <Skeleton className="h-96 lg:col-span-8" />
            <Skeleton className="h-96 lg:col-span-4" />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <HealthCard />
            <DevicesCard />
            <AlertsCard />
            <SlaCard />
          </div>
          <div className="grid gap-4 lg:grid-cols-12">
            <MapCard />
            <ProblemDevices />
          </div>
          <div className="grid gap-4 lg:grid-cols-12">
            <BandwidthCard />
            <RecentAlerts />
          </div>
        </div>
      )}
    </>
  );
}
