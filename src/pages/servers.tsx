import { Activity, Cpu, MemoryStick, Server } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkline } from '@/components/charts/Sparkline';
import { PageTitle } from '@/components/layout/PageTitle';
import { Badge, StatusPill } from '@/components/ui/Badge';
import { Card, CardHeader, Kpi, PageHeader } from '@/components/ui/Card';
import { DeviceIcon } from '@/components/ui/DeviceIcon';
import { EmptyState, Skeleton, SkeletonCard } from '@/components/ui/Feedback';
import { Segmented, Select } from '@/components/ui/Form';
import { MetricBar } from '@/components/ui/MetricBar';
import { APPS, DEVICES, MINUTE, SITES, appLatency, deviceStatus, type DeviceStatus } from '@/mock';
import { appHealth } from '@/lib/apps';
import { cn } from '@/lib/cn';
import { useFormat, useSimulatedLoading } from '@/lib/hooks';
import { useLive } from '@/store/live';

const DependencyView = dynamic(() => import('@/components/topology/DependencyView').then((m) => m.DependencyView), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-none" />,
});

type Kind = 'all' | 'server' | 'vm' | 'database';
const RANK: Record<DeviceStatus, number> = { down: 0, warning: 1, up: 2 };
const COMPUTE = DEVICES.filter((d) => d.category === 'compute');

function ServerGrid() {
  const { t } = useTranslation();
  const f = useFormat();
  const [kind, setKind] = useState<Kind>('all');
  const [site, setSite] = useState('');
  const episodes = useLive((s) => s.episodes);
  const live = useLive((s) => s.live);
  const list = useMemo(
    () =>
      COMPUTE.filter((d) => (kind === 'all' || d.type === kind) && (!site || d.siteId === site)).sort(
        (a, b) => RANK[deviceStatus(episodes[a.id])] - RANK[deviceStatus(episodes[b.id])] || (live[b.id]?.cpu ?? 0) - (live[a.id]?.cpu ?? 0),
      ),
    [kind, site, episodes, live],
  );
  const sitesWithCompute = SITES.filter((s) => COMPUTE.some((d) => d.siteId === s.id));
  return (
    <Card>
      <CardHeader
        title={t('servers.grid.title')}
        subtitle={t('servers.grid.subtitle')}
        icon={<Server className="size-4" />}
        actions={
          <>
            <Segmented
              label={t('servers.grid.title')}
              value={kind}
              onChange={setKind}
              options={[
                { value: 'all', label: t('servers.grid.all') },
                { value: 'server', label: t('servers.grid.physical') },
                { value: 'vm', label: t('servers.grid.virtual') },
                { value: 'database', label: t('servers.grid.databases') },
              ]}
            />
            <Select size="sm" value={site} onChange={(e) => setSite(e.target.value)} aria-label={t('common.site')} className="w-44">
              <option value="">{t('sites.all')}</option>
              {sitesWithCompute.map((s) => (
                <option key={s.id} value={s.id}>
                  {t(`sites.${s.id}`)}
                </option>
              ))}
            </Select>
          </>
        }
      />
      {list.length === 0 ? (
        <EmptyState title={t('servers.grid.empty')} />
      ) : (
        <div className="grid grid-cols-1 gap-2.5 px-4 pb-4 sm:grid-cols-2 sm:px-5 sm:pb-5 lg:grid-cols-3 2xl:grid-cols-4">
          {list.map((d) => {
            const st = deviceStatus(episodes[d.id]);
            const m = live[d.id] ?? {};
            return (
              <Link
                key={d.id}
                href={`/devices/${d.id}/`}
                className={cn(
                  'group rounded-xl border bg-surface-2 p-3 transition-colors hover:border-line-strong hover:bg-surface-3',
                  st === 'down' ? 'border-crit/50 bg-crit/6' : st === 'warning' ? 'border-warn/45' : 'border-line',
                )}
              >
                <div className="flex items-center gap-2">
                  <DeviceIcon type={d.type} className="size-4 shrink-0 text-subtle" />
                  <span className="ltr-text min-w-0 flex-1 truncate text-[12.5px] font-semibold text-fg">{d.hostname}</span>
                  <StatusPill status={st} />
                </div>
                <div className="mt-1 truncate text-[11px] text-subtle">
                  {t(`deviceTypes.${d.type}`)} · {t(`sites.${d.siteId}`)}
                </div>
                <div className="mt-2.5 space-y-1.5 text-[11px]">
                  {(['cpu', 'mem', 'disk'] as const).map((k) => (
                    <div key={k} className="flex items-center gap-2">
                      <span className="w-14 shrink-0 text-muted">{t(`metrics.${k}`)}</span>
                      <MetricBar value={st === 'down' ? null : m[k]} thin warn={k === 'cpu' ? 80 : 85} crit={k === 'cpu' ? 92 : 92} className="flex-1" />
                    </div>
                  ))}
                </div>
                {st === 'down' && <div className="mt-2 text-[11px] font-medium text-crit">{t('device.live.unreachable')}</div>}
                <span className="sr-only">{f.number(m.cpu ?? 0)}</span>
              </Link>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function AppsTable() {
  const { t } = useTranslation();
  const f = useFormat();
  const now = useLive((s) => s.now);
  const episodes = useLive((s) => s.episodes);
  const minute = Math.floor(now / 15_000);
  const trends = useMemo(() => {
    const out: Record<string, { t: number; v: number }[]> = {};
    const end = minute * 15_000;
    for (const app of APPS) {
      const pts: { t: number; v: number }[] = [];
      for (let ts = end - 60 * MINUTE; ts <= end; ts += MINUTE) pts.push({ t: ts, v: appLatency(app, ts) });
      out[app.id] = pts;
    }
    return out;
  }, [minute]);
  return (
    <Card>
      <CardHeader title={t('servers.apps.title')} subtitle={t('servers.apps.subtitle')} icon={<Activity className="size-4" />} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-[12.5px]">
          <thead className="border-y border-line bg-surface-2 text-[11px] text-muted">
            <tr>
              <th className="px-4 py-2 text-start font-medium sm:px-5">{t('servers.apps.service')}</th>
              <th className="px-3 py-2 text-start font-medium">{t('servers.apps.status')}</th>
              <th className="px-3 py-2 text-end font-medium">{t('servers.apps.p95')}</th>
              <th className="px-3 py-2 text-end font-medium">{t('servers.apps.errors')}</th>
              <th className="px-3 py-2 text-end font-medium">{t('servers.apps.rpm')}</th>
              <th className="px-3 py-2 text-end font-medium">{t('servers.apps.apdex')}</th>
              <th className="w-40 px-4 py-2 text-start font-medium sm:px-5">{t('servers.apps.trend')}</th>
            </tr>
          </thead>
          <tbody>
            {APPS.map((app) => {
              const h = appHealth(app, now, episodes);
              const slow = h.latency > app.sloLatencyMs;
              return (
                <tr key={app.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-2.5 sm:px-5">
                    <div className="font-semibold text-fg">{t(`apps.${app.id}.name`)}</div>
                    <div className="text-[11px] text-subtle">
                      {t(`appTiers.${app.tier}`)} · {t(`apps.${app.id}.desc`)}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusPill status={h.status} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-end tabular">
                    <div className={slow ? 'font-semibold text-warn' : 'text-fg'}>{f.ms(h.latency)}</div>
                    <div className="text-[10.5px] text-subtle">{t('servers.apps.slo', { value: f.ms(app.sloLatencyMs) })}</div>
                  </td>
                  <td className={cn('px-3 py-2.5 text-end tabular', h.errorRate > 1.5 ? 'font-semibold text-warn' : 'text-muted')}>{f.number(h.errorRate, 2)}%</td>
                  <td className="px-3 py-2.5 text-end text-muted tabular">{f.number(h.rpm)}</td>
                  <td className="px-3 py-2.5 text-end">
                    <Badge tone={h.apdex >= 0.94 ? 'ok' : h.apdex >= 0.85 ? 'warn' : 'crit'}>{f.number(h.apdex, 2)}</Badge>
                  </td>
                  <td className="px-4 py-2.5 sm:px-5">
                    <Sparkline data={trends[app.id] ?? []} color={slow ? 'var(--warn)' : 'var(--chart-4)'} height={28} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default function ServersPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const loading = useSimulatedLoading();
  const live = useLive((s) => s.live);
  const episodes = useLive((s) => s.episodes);
  const now = useLive((s) => s.now);
  const up = COMPUTE.filter((d) => deviceStatus(episodes[d.id]) !== 'down');
  const avg = (k: 'cpu' | 'mem') => up.reduce((s, d) => s + (live[d.id]?.[k] ?? 0), 0) / Math.max(1, up.length);
  const healthyApps = APPS.filter((a) => appHealth(a, now, episodes).status === 'up').length;

  return (
    <>
      <PageTitle title={t('nav.servers')} />
      <PageHeader title={t('servers.title')} subtitle={t('servers.subtitle')} />
      {loading ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi label={t('servers.kpi.servers')} value={f.number(COMPUTE.length)} icon={<Server className="size-4.5" />} tone="brand" />
            <Kpi label={t('servers.kpi.avgCpu')} value={f.percent(avg('cpu'), 1)} icon={<Cpu className="size-4.5" />} tone="info" />
            <Kpi label={t('servers.kpi.avgMem')} value={f.percent(avg('mem'), 1)} icon={<MemoryStick className="size-4.5" />} tone="info" />
            <Kpi
              label={t('servers.kpi.apps')}
              value={t('servers.kpi.appsOf', { ok: f.number(healthyApps), total: f.number(APPS.length) })}
              icon={<Activity className="size-4.5" />}
              tone={healthyApps === APPS.length ? 'ok' : 'warn'}
            />
          </div>
          <AppsTable />
          <Card className="overflow-hidden">
            <CardHeader title={t('servers.deps.title')} subtitle={t('servers.deps.subtitle')} />
            <div className="h-[460px] border-t border-line bg-bg/40">
              <DependencyView />
            </div>
            <div className="border-t border-line px-5 py-2.5 text-[11.5px] text-subtle">{t('servers.deps.hint')}</div>
          </Card>
          <ServerGrid />
        </div>
      )}
    </>
  );
}
