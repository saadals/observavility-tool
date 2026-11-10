import { BellOff, CheckCheck, ChevronDown, Eye, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import { Fragment, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertActions } from '@/components/alerts/AlertActions';
import { PageTitle } from '@/components/layout/PageTitle';
import { AlertStateBadge, SeverityBadge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card, Kpi, PageHeader } from '@/components/ui/Card';
import { EmptyState, SkeletonRows } from '@/components/ui/Feedback';
import { Checkbox, ChipToggle, SearchInput, Segmented, Select } from '@/components/ui/Form';
import { Pagination } from '@/components/ui/Pagination';
import { ALERT_SEVERITIES, SITES, getDevice, type Alert } from '@/mock';
import { cn } from '@/lib/cn';
import { useActorName, useAlertTitle, useOperatorName } from '@/lib/domain';
import { useDebounced, useDuration, useFormat, useQueryState, useSimulatedLoading } from '@/lib/hooks';
import { useLive } from '@/store/live';
import { toast } from '@/store/ui';

type StateFilter = 'active' | 'open' | 'acknowledged' | 'resolved' | 'all';
type RangeFilter = '24h' | '7d' | '14d' | 'all';
const RANGE_MS: Record<RangeFilter, number> = { '24h': 86_400_000, '7d': 7 * 86_400_000, '14d': 14 * 86_400_000, all: Infinity };

function AlertDetail({ alert }: { alert: Alert }) {
  const { t } = useTranslation();
  const f = useFormat();
  const opName = useOperatorName();
  const steps: { key: string; ts?: number; label: string; tone: string }[] = [
    { key: 'raised', ts: alert.createdAt, label: t('alerts.detail.raised'), tone: 'bg-crit' },
    ...(alert.ackAt ? [{ key: 'ack', ts: alert.ackAt, label: t('alerts.detail.acknowledged', { name: opName(alert.ackBy) }), tone: 'bg-info' }] : []),
    ...(alert.resolvedAt ? [{ key: 'res', ts: alert.resolvedAt, label: t('alerts.detail.resolved', { name: opName(alert.resolvedBy) }), tone: 'bg-ok' }] : []),
  ];
  return (
    <div className="grid gap-5 bg-surface-2 px-5 py-4 md:grid-cols-[1fr_1.3fr]">
      <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-subtle">{t('alerts.detail.timeline')}</div>
        <ol className="relative space-y-3 border-s border-line ps-4">
          {steps.map((s) => (
            <li key={s.key} className="relative">
              <span className={cn('absolute -start-[21px] top-1 size-2.5 rounded-full ring-4 ring-surface-2', s.tone)} />
              <div className="text-[12.5px] font-medium text-fg">{s.label}</div>
              <div className="text-[11.5px] text-subtle tabular">{s.ts ? f.dateTime(s.ts) : ''}</div>
            </li>
          ))}
        </ol>
      </div>
      <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-subtle">{t('alerts.detail.runbook')}</div>
        <p className="text-[13px] leading-relaxed text-fg">{t(`alerts.runbooks.${alert.type}`)}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <ButtonLink href={`/devices/${alert.deviceId}/`} size="sm" variant="outline">
            {t('alerts.detail.openDevice')}
          </ButtonLink>
          <AlertActions alert={alert} />
        </div>
      </div>
    </div>
  );
}

export default function AlertsPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const dur = useDuration();
  const title = useAlertTitle();
  const opName = useOperatorName();
  const actor = useActorName();
  const loading = useSimulatedLoading();
  const alerts = useLive((s) => s.alerts);
  const now = useLive((s) => s.now);
  const acknowledge = useLive((s) => s.acknowledge);
  const resolve = useLive((s) => s.resolve);

  const [q, setQ] = useQueryState(['severity', 'state', 'site'] as const);
  const severity = q.severity;
  const state = (q.state || 'active') as StateFilter;
  const [range, setRange] = useState<RangeFilter>('14d');
  const [search, setSearch] = useState('');
  const term = useDebounced(search, 150).trim().toLowerCase();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const filtered = useMemo(() => {
    return alerts.filter((a) => {
      if (severity && a.severity !== severity) return false;
      if (q.site && a.siteId !== q.site) return false;
      if (state === 'active' && a.state === 'resolved') return false;
      if (state !== 'active' && state !== 'all' && a.state !== state) return false;
      if (now - a.createdAt > RANGE_MS[range]) return false;
      if (term) {
        const d = getDevice(a.deviceId);
        const hay = `${title(a)} ${d?.hostname ?? ''} ${a.id}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [alerts, severity, q.site, state, range, term, now, title]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pages);
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const selectable = rows.filter((a) => a.state !== 'resolved');
  const allSelected = selectable.length > 0 && selectable.every((a) => selected.has(a.id));

  const summary = useMemo(() => {
    const open = alerts.filter((a) => a.state === 'open');
    const acked = alerts.filter((a) => a.ackAt && a.createdAt > now - 14 * 86_400_000);
    const mtta = acked.length ? acked.reduce((s, a) => s + ((a.ackAt ?? a.createdAt) - a.createdAt), 0) / acked.length : 0;
    return {
      crit: open.filter((a) => a.severity === 'critical').length,
      warn: open.filter((a) => a.severity === 'warning').length,
      ack: alerts.filter((a) => a.state === 'acknowledged').length,
      res24: alerts.filter((a) => a.resolvedAt && a.resolvedAt > now - 86_400_000).length,
      mtta,
    };
  }, [alerts, now]);

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const bulk = (kind: 'ack' | 'resolve') => {
    const ids = [...selected];
    if (!ids.length) return;
    if (kind === 'ack') {
      acknowledge(ids, actor);
      toast({ kind: 'info', title: t('toasts.acknowledged', { count: ids.length }) });
    } else {
      resolve(ids, actor);
      toast({ kind: 'success', title: t('toasts.resolved', { count: ids.length }) });
    }
    setSelected(new Set());
  };

  const setFilter = (patch: Partial<Record<'severity' | 'state' | 'site', string>>) => {
    setPage(1);
    setSelected(new Set());
    setQ(patch);
  };

  return (
    <>
      <PageTitle title={t('nav.alerts')} />
      <PageHeader
        title={t('alerts.title')}
        subtitle={t('alerts.subtitle')}
        actions={
          <ButtonLink href="/alerts/rules" variant="outline" size="sm" leading={<SlidersHorizontal className="size-4" />}>
            {t('alerts.rulesLink')}
          </ButtonLink>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label={t('alerts.summary.openCritical')} value={f.number(summary.crit)} tone="crit" className="p-3.5" />
        <Kpi label={t('alerts.summary.openWarning')} value={f.number(summary.warn)} tone="warn" className="p-3.5" />
        <Kpi label={t('alerts.summary.acknowledged')} value={f.number(summary.ack)} className="p-3.5" />
        <Kpi label={t('alerts.summary.resolved24')} value={f.number(summary.res24)} className="p-3.5" />
        <Kpi label={t('alerts.summary.mtta')} value={dur(summary.mtta)} className="col-span-2 p-3.5 lg:col-span-1" />
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder={t('alerts.filters.search')} label={t('alerts.filters.search')} className="w-full sm:w-72" />
            <Select value={q.site} onChange={(e) => setFilter({ site: e.target.value })} aria-label={t('common.site')} className="w-full sm:w-48">
              <option value="">{t('sites.all')}</option>
              {SITES.map((s) => (
                <option key={s.id} value={s.id}>
                  {t(`sites.${s.id}`)}
                </option>
              ))}
            </Select>
            <Select value={state} onChange={(e) => setFilter({ state: e.target.value === 'active' ? '' : e.target.value })} aria-label={t('common.state')} className="w-full sm:w-44">
              <option value="active">{t('alerts.filters.active')}</option>
              <option value="open">{t('alertState.open')}</option>
              <option value="acknowledged">{t('alertState.acknowledged')}</option>
              <option value="resolved">{t('alertState.resolved')}</option>
              <option value="all">{t('alertState.all')}</option>
            </Select>
            <Segmented
              label={t('alerts.filters.range')}
              value={range}
              onChange={(v) => { setRange(v); setPage(1); }}
              options={[
                { value: '24h', label: t('timeRanges.24h') },
                { value: '7d', label: t('timeRanges.7d') },
                { value: '14d', label: t('timeRanges.14d') },
                { value: 'all', label: t('alerts.filters.any') },
              ]}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ChipToggle active={!severity} onClick={() => setFilter({ severity: '' })}>
              {t('severity.all')}
            </ChipToggle>
            {ALERT_SEVERITIES.map((s) => (
              <ChipToggle key={s} active={severity === s} onClick={() => setFilter({ severity: severity === s ? '' : s })} tone={s === 'critical' ? 'bg-crit/15 text-crit' : s === 'warning' ? 'bg-warn/15 text-warn' : 'bg-info/15 text-info'}>
                {t(`severity.${s}`)}
              </ChipToggle>
            ))}
            {selected.size > 0 && (
              <div className="ms-auto flex flex-wrap items-center gap-2 animate-fade-in">
                <span className="text-xs text-muted">{t('common.selected', { count: selected.size })}</span>
                <Button size="sm" variant="outline" leading={<Eye className="size-4" />} onClick={() => bulk('ack')}>
                  {t('alerts.bulk.acknowledge')}
                </Button>
                <Button size="sm" variant="primary" leading={<CheckCheck className="size-4" />} onClick={() => bulk('resolve')}>
                  {t('alerts.bulk.resolve')}
                </Button>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="p-5">
            <SkeletonRows rows={8} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState icon={<BellOff className="size-5" />} title={t('alerts.emptyTitle')} body={t('alerts.emptyBody')} />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[900px] text-[13px]">
                <thead className="border-b border-line bg-surface-2 text-[11.5px] text-muted">
                  <tr>
                    <th className="w-10 ps-5 pe-1 text-start">
                      <Checkbox checked={allSelected} indeterminate={!allSelected && selectable.some((a) => selected.has(a.id))} onChange={(v) => setSelected(v ? new Set(selectable.map((a) => a.id)) : new Set())} label={t('common.selectAll')} />
                    </th>
                    <th className="px-3 py-2.5 text-start font-medium">{t('common.severity')}</th>
                    <th className="px-3 py-2.5 text-start font-medium">{t('alerts.col.alert')}</th>
                    <th className="px-3 py-2.5 text-start font-medium">{t('alerts.col.device')}</th>
                    <th className="px-3 py-2.5 text-start font-medium">{t('alerts.col.created')}</th>
                    <th className="px-3 py-2.5 text-start font-medium">{t('common.state')}</th>
                    <th className="hidden px-3 py-2.5 text-start font-medium xl:table-cell">{t('alerts.col.owner')}</th>
                    <th className="px-3 py-2.5 text-end font-medium">{t('common.actions')}</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a) => {
                    const d = getDevice(a.deviceId);
                    const open = expanded === a.id;
                    return (
                      <Fragment key={a.id}>
                        <tr className={cn('cursor-pointer border-b border-line transition-colors hover:bg-surface-2', open && 'bg-surface-2', a.state === 'resolved' && 'opacity-70')} onClick={() => setExpanded(open ? null : a.id)}>
                          <td className="ps-5 pe-1" onClick={(e) => e.stopPropagation()}>
                            {a.state !== 'resolved' && <Checkbox checked={selected.has(a.id)} onChange={() => toggle(a.id)} label={a.id} />}
                          </td>
                          <td className="px-3 py-2.5">
                            <SeverityBadge severity={a.severity} />
                          </td>
                          <td className="max-w-[340px] px-3 py-2.5">
                            <div className="truncate font-medium text-fg">{title(a)}</div>
                            <div className="text-[11px] text-subtle tabular">
                              <span className="ltr-text">{a.id}</span> · {t(`sites.${a.siteId}`)}
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <Link href={`/devices/${a.deviceId}/`} onClick={(e) => e.stopPropagation()} className="ltr-text whitespace-nowrap font-medium text-fg hover:text-brand">
                              {d?.hostname}
                            </Link>
                            <div className="text-[11px] text-subtle">{d ? t(`deviceTypes.${d.type}`) : ''}</div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5">
                            <div className="text-fg">{f.relative(a.createdAt, now)}</div>
                            <div className="text-[11px] text-subtle tabular">{f.dateTime(a.createdAt)}</div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5">
                            <AlertStateBadge state={a.state} />
                            <div className="mt-0.5 text-[11px] text-subtle">{dur((a.resolvedAt ?? now) - a.createdAt)}</div>
                          </td>
                          <td className="hidden whitespace-nowrap px-3 py-2.5 text-muted xl:table-cell">{a.ackBy ? opName(a.ackBy) : <span className="text-subtle">—</span>}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex justify-end">
                              <AlertActions alert={a} />
                            </div>
                          </td>
                          <td className="pe-3">
                            <ChevronDown className={cn('size-4 text-subtle transition-transform', open && 'rotate-180')} />
                          </td>
                        </tr>
                        {open && (
                          <tr className="border-b border-line">
                            <td colSpan={9} className="p-0">
                              <AlertDetail alert={a} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="divide-y divide-line md:hidden">
              {rows.map((a) => {
                const d = getDevice(a.deviceId);
                const open = expanded === a.id;
                return (
                  <li key={a.id}>
                    <button type="button" className="w-full px-4 py-3 text-start" onClick={() => setExpanded(open ? null : a.id)}>
                      <div className="flex items-center gap-2">
                        <SeverityBadge severity={a.severity} />
                        <AlertStateBadge state={a.state} />
                        <span className="ms-auto text-[11.5px] text-subtle">{f.relative(a.createdAt, now)}</span>
                      </div>
                      <div className="mt-1.5 text-[13.5px] font-medium text-fg">{title(a)}</div>
                      <div className="mt-0.5 text-xs text-muted">
                        <span className="ltr-text">{d?.hostname}</span> · {t(`sites.${a.siteId}`)}
                      </div>
                    </button>
                    {a.state !== 'resolved' && !open && (
                      <div className="flex justify-end px-4 pb-3">
                        <AlertActions alert={a} />
                      </div>
                    )}
                    {open && <AlertDetail alert={a} />}
                  </li>
                );
              })}
            </ul>
            <div className="border-t border-line">
              <Pagination page={safePage} pageSize={pageSize} total={filtered.length} onPage={setPage} />
            </div>
          </>
        )}
      </Card>
    </>
  );
}
