import { ChevronRight, Download, SearchX } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageTitle } from '@/components/layout/PageTitle';
import { SortHeader, type SortDir } from '@/components/table/SortHeader';
import { Badge, StatusDot, StatusPill } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Card';
import { EmptyState, SkeletonRows } from '@/components/ui/Feedback';
import { ChipToggle, SearchInput, Select } from '@/components/ui/Form';
import { MetricBar } from '@/components/ui/MetricBar';
import { Pagination } from '@/components/ui/Pagination';
import { DEVICES, DEVICE_TYPES, SITES, deviceStatus, isActive, type Device, type DeviceStatus } from '@/mock';
import { toCsv, downloadText } from '@/lib/csv';
import { useDebounced, useDuration, useFormat, useQueryState, useSimulatedLoading } from '@/lib/hooks';
import { useLive } from '@/store/live';

type SortKey = 'status' | 'hostname' | 'type' | 'site' | 'cpu' | 'mem' | 'latency' | 'traffic' | 'uptime' | 'alerts';
const STATUS_RANK: Record<DeviceStatus, number> = { down: 0, warning: 1, up: 2 };

export default function NetworkPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const dur = useDuration();
  const router = useRouter();
  const loading = useSimulatedLoading();
  const [query, setQuery] = useQueryState(['site', 'type', 'status'] as const);
  const [search, setSearch] = useState('');
  const q = useDebounced(search, 150).trim().toLowerCase();
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'status', dir: 'asc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const episodes = useLive((s) => s.episodes);
  const live = useLive((s) => s.live);
  const alerts = useLive((s) => s.alerts);
  const now = useLive((s) => s.now);

  const alertCount = useMemo(() => {
    const m: Record<string, number> = {};
    for (const a of alerts) if (isActive(a)) m[a.deviceId] = (m[a.deviceId] ?? 0) + 1;
    return m;
  }, [alerts]);

  const statusOf = (d: Device) => deviceStatus(episodes[d.id]);
  const traffic = (d: Device) => (live[d.id]?.bwIn ?? 0) + (live[d.id]?.bwOut ?? 0);
  const uptime = (d: Device) => (statusOf(d) === 'down' ? -1 : now - d.bootTime);

  const filtered = useMemo(() => {
    return DEVICES.filter((d) => {
      if (query.site && d.siteId !== query.site) return false;
      if (query.type && d.type !== query.type) return false;
      if (query.status && deviceStatus(episodes[d.id]) !== query.status) return false;
      if (q && !(d.hostname.toLowerCase().includes(q) || d.ip.includes(q) || d.model.toLowerCase().includes(q) || d.vendor.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [query.site, query.type, query.status, q, episodes]);

  const sorted = useMemo(() => {
    const val = (d: Device): number | string => {
      switch (sort.key) {
        case 'status':
          return STATUS_RANK[deviceStatus(episodes[d.id])] * 1000 - (alertCount[d.id] ?? 0);
        case 'hostname':
          return d.hostname;
        case 'type':
          return t(`deviceTypes.${d.type}`);
        case 'site':
          return t(`sites.${d.siteId}`);
        case 'cpu':
          return live[d.id]?.cpu ?? live[d.id]?.load ?? -1;
        case 'mem':
          return live[d.id]?.mem ?? -1;
        case 'latency':
          return live[d.id]?.latency ?? 1e9;
        case 'traffic':
          return (live[d.id]?.bwIn ?? 0) + (live[d.id]?.bwOut ?? 0);
        case 'uptime':
          return deviceStatus(episodes[d.id]) === 'down' ? -1 : now - d.bootTime;
        case 'alerts':
          return alertCount[d.id] ?? 0;
      }
    };
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const va = val(a);
      const vb = val(b);
      const c = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
      return c * dir || a.hostname.localeCompare(b.hostname);
    });
  }, [filtered, sort, episodes, live, alertCount, now, t]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pages);
  const rows = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const onSort = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'hostname' || key === 'type' || key === 'site' || key === 'status' ? 'asc' : 'desc' }));
  const setFilter = (patch: Partial<Record<'site' | 'type' | 'status', string>>) => {
    setPage(1);
    setQuery(patch);
  };
  const statusCounts = useMemo(() => {
    const c = { up: 0, warning: 0, down: 0 };
    for (const d of DEVICES) {
      if (query.site && d.siteId !== query.site) continue;
      if (query.type && d.type !== query.type) continue;
      c[deviceStatus(episodes[d.id])]++;
    }
    return c;
  }, [episodes, query.site, query.type]);

  const exportCsv = () => {
    const headers = [t('network.col.device'), t('common.ip'), t('network.col.type'), t('network.col.site'), t('common.vendor'), t('common.model'), t('network.col.status'), 'CPU %', 'Memory %', 'Latency ms', t('network.col.alerts')];
    const data = sorted.map((d) => [
      d.hostname,
      d.ip,
      t(`deviceTypes.${d.type}`),
      t(`sites.${d.siteId}`),
      d.vendor,
      d.model,
      t(`status.${statusOf(d)}`),
      live[d.id]?.cpu?.toFixed(1) ?? '',
      live[d.id]?.mem?.toFixed(1) ?? '',
      live[d.id]?.latency?.toFixed(1) ?? '',
      alertCount[d.id] ?? 0,
    ]);
    downloadText(`${t('network.csvName')}.csv`, toCsv(headers, data));
  };

  const hasFilters = !!(query.site || query.type || query.status || search);

  return (
    <>
      <PageTitle title={t('nav.network')} />
      <PageHeader
        title={t('network.title')}
        subtitle={t('network.subtitle', { count: DEVICES.length })}
        actions={
          <Button variant="outline" size="sm" leading={<Download className="size-4" />} onClick={exportCsv}>
            {t('actions.exportCsv')}
          </Button>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder={t('network.search')} label={t('network.search')} className="w-full sm:w-72" />
            <Select value={query.site} onChange={(e) => setFilter({ site: e.target.value })} aria-label={t('common.site')} className="w-full sm:w-48">
              <option value="">{t('sites.all')}</option>
              {SITES.map((s) => (
                <option key={s.id} value={s.id}>
                  {t(`sites.${s.id}`)}
                </option>
              ))}
            </Select>
            <Select value={query.type} onChange={(e) => setFilter({ type: e.target.value })} aria-label={t('common.type')} className="w-full sm:w-44">
              <option value="">{t('deviceTypes.all')}</option>
              {DEVICE_TYPES.map((ty) => (
                <option key={ty} value={ty}>
                  {t(`deviceTypes.${ty}`)}
                </option>
              ))}
            </Select>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setFilter({ site: '', type: '', status: '' }); }}>
                {t('actions.clearFilters')}
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ChipToggle active={!query.status} onClick={() => setFilter({ status: '' })}>
              {t('status.all')}
            </ChipToggle>
            {(['down', 'warning', 'up'] as const).map((s) => (
              <ChipToggle key={s} active={query.status === s} onClick={() => setFilter({ status: query.status === s ? '' : s })} tone={s === 'down' ? 'bg-crit/15 text-crit' : s === 'warning' ? 'bg-warn/15 text-warn' : 'bg-ok/15 text-ok'}>
                <StatusDot status={s} />
                {t(`status.${s}`)}
                <span className="tabular opacity-70">{f.number(statusCounts[s])}</span>
              </ChipToggle>
            ))}
            <span className="ms-auto text-xs text-subtle">{t('network.matches', { count: sorted.length })}</span>
          </div>
        </div>

        {loading ? (
          <div className="p-5">
            <SkeletonRows rows={10} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<SearchX className="size-5" />}
            title={t('network.emptyTitle')}
            body={t('network.emptyBody')}
            action={
              <Button size="sm" variant="outline" onClick={() => { setSearch(''); setFilter({ site: '', type: '', status: '' }); }}>
                {t('actions.clearFilters')}
              </Button>
            }
          />
        ) : (
          <>
            {/* Desktop / tablet table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[960px] text-[13px]">
                <thead className="border-b border-line bg-surface-2 text-[11.5px] text-muted">
                  <tr>
                    <SortHeader label={t('network.col.status')} sortKey="status" sort={sort} onSort={onSort} />
                    <SortHeader label={t('network.col.device')} sortKey="hostname" sort={sort} onSort={onSort} />
                    <SortHeader label={t('network.col.type')} sortKey="type" sort={sort} onSort={onSort} />
                    <SortHeader label={t('network.col.site')} sortKey="site" sort={sort} onSort={onSort} className="hidden lg:table-cell" />
                    <SortHeader label={t('network.col.cpu')} sortKey="cpu" sort={sort} onSort={onSort} />
                    <SortHeader label={t('network.col.mem')} sortKey="mem" sort={sort} onSort={onSort} className="hidden xl:table-cell" />
                    <SortHeader label={t('network.col.latency')} sortKey="latency" sort={sort} onSort={onSort} align="end" />
                    <SortHeader label={t('network.col.traffic')} sortKey="traffic" sort={sort} onSort={onSort} align="end" className="hidden lg:table-cell" />
                    <SortHeader label={t('network.col.uptime')} sortKey="uptime" sort={sort} onSort={onSort} align="end" className="hidden xl:table-cell" />
                    <SortHeader label={t('network.col.alerts')} sortKey="alerts" sort={sort} onSort={onSort} align="end" />
                    <th className="w-8" aria-hidden />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((d) => {
                    const st = statusOf(d);
                    const m = live[d.id] ?? {};
                    const util = m.cpu ?? m.load;
                    const ac = alertCount[d.id] ?? 0;
                    return (
                      <tr
                        key={d.id}
                        onClick={() => void router.push(`/devices/${d.id}/`)}
                        className="group cursor-pointer border-b border-line transition-colors last:border-0 hover:bg-surface-2"
                      >
                        <td className="px-3 py-2.5">
                          <StatusPill status={st} />
                        </td>
                        <td className="px-3 py-2.5">
                          <Link href={`/devices/${d.id}/`} onClick={(e) => e.stopPropagation()} className="ltr-text whitespace-nowrap font-semibold text-fg hover:text-brand">
                            {d.hostname}
                          </Link>
                          <div className="ltr-text text-[11.5px] text-subtle tabular">{d.ip}</div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="whitespace-nowrap text-fg">{t(`deviceTypes.${d.type}`)}</div>
                          <div className="whitespace-nowrap text-[11.5px] text-subtle">
                            <span className="ltr-text">{d.model}</span>
                          </div>
                        </td>
                        <td className="hidden whitespace-nowrap px-3 py-2.5 text-muted lg:table-cell">{t(`sites.${d.siteId}`)}</td>
                        <td className="w-36 px-3 py-2.5">{util !== undefined ? <MetricBar value={st === 'down' ? null : util} /> : <span className="text-subtle">—</span>}</td>
                        <td className="hidden w-36 px-3 py-2.5 xl:table-cell">{m.mem !== undefined ? <MetricBar value={st === 'down' ? null : m.mem} warn={85} crit={92} /> : <span className="text-subtle">—</span>}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-end tabular">
                          <span className={m.latency && m.latency > 40 ? 'text-warn' : 'text-muted'}>{f.ms(m.latency)}</span>
                        </td>
                        <td className="hidden whitespace-nowrap px-3 py-2.5 text-end text-muted tabular lg:table-cell">{st === 'down' || !d.metrics.includes('bwIn') ? '—' : f.bandwidth(traffic(d))}</td>
                        <td className="hidden whitespace-nowrap px-3 py-2.5 text-end tabular xl:table-cell">
                          {st === 'down' ? (
                            <span className="text-crit">{t('network.downFor', { d: dur(now - (episodes[d.id]?.at(-1)?.since ?? now), 1) })}</span>
                          ) : (
                            <span className="text-muted">{dur(uptime(d), 1)}</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-end">
                          {ac > 0 ? <Badge tone={st === 'down' ? 'crit' : 'warn'}>{f.number(ac)}</Badge> : <span className="text-subtle">—</span>}
                        </td>
                        <td className="pe-3">
                          <ChevronRight className="size-4 text-subtle opacity-0 transition-opacity group-hover:opacity-100 rtl:-scale-x-100" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="divide-y divide-line md:hidden">
              {rows.map((d) => {
                const st = statusOf(d);
                const m = live[d.id] ?? {};
                return (
                  <li key={d.id}>
                    <Link href={`/devices/${d.id}/`} className="flex items-center gap-3 px-4 py-3 active:bg-surface-2">
                      <StatusDot status={st} />
                      <div className="min-w-0 flex-1">
                        <div className="ltr-text truncate text-[13.5px] font-semibold text-fg">{d.hostname}</div>
                        <div className="truncate text-xs text-muted">
                          {t(`deviceTypes.${d.type}`)} · {t(`sites.${d.siteId}`)}
                        </div>
                      </div>
                      <div className="text-end text-xs tabular">
                        <div className="text-fg">{typeof m.cpu === 'number' && st !== 'down' ? `${f.number(m.cpu)}%` : '—'}</div>
                        <div className="text-subtle">{f.ms(m.latency)}</div>
                      </div>
                      <ChevronRight className="size-4 text-subtle rtl:-scale-x-100" />
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="border-t border-line">
              <Pagination page={safePage} pageSize={pageSize} total={sorted.length} onPage={setPage} onPageSize={(s) => { setPageSize(s); setPage(1); }} />
            </div>
          </>
        )}
      </Card>
    </>
  );
}

