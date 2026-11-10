import { Download, Pause, Play, ScrollText } from 'lucide-react';
import Link from 'next/link';
import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PageTitle } from '@/components/layout/PageTitle';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Card';
import { EmptyState, SkeletonRows } from '@/components/ui/Feedback';
import { ChipToggle, SearchInput, Segmented, Select } from '@/components/ui/Form';
import { APPS, DEVICES, LOG_LEVELS, getDevice, type LogEntry, type LogFacility, type LogLevel } from '@/mock';
import { cn } from '@/lib/cn';
import { hasArabic } from '@/lib/format';
import { downloadText, toCsv } from '@/lib/csv';
import { useDebounced, useFormat, useIsRtl, useQueryState, useSimulatedLoading } from '@/lib/hooks';
import { TICK_MS, useLive } from '@/store/live';

type Range = '15m' | '1h' | '24h' | '7d';
const RANGE_MS: Record<Range, number> = { '15m': 15 * 60_000, '1h': 3_600_000, '24h': 86_400_000, '7d': 7 * 86_400_000 };
const FACILITIES: LogFacility[] = ['system', 'network', 'security', 'application', 'database', 'auth'];
const LEVEL_CLS: Record<LogLevel, string> = {
  critical: 'bg-crit text-white',
  error: 'bg-crit/15 text-crit',
  warning: 'bg-warn/15 text-warn',
  info: 'bg-info/12 text-info',
  debug: 'bg-surface-3 text-subtle',
};
const PAGE = 150;

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function Highlight({ text, term }: { text: string; term: string }) {
  if (!term) return <>{text}</>;
  const parts = text.split(new RegExp(`(${escapeRe(term)})`, 'gi'));
  return (
    <>
      {parts.map((p, i) => (i % 2 === 1 ? <mark key={i}>{p}</mark> : <Fragment key={i}>{p}</Fragment>))}
    </>
  );
}

function VolumeChart({ logs, from, to }: { logs: LogEntry[]; from: number; to: number }) {
  const { t } = useTranslation();
  const f = useFormat();
  const rtl = useIsRtl();
  const buckets = 48;
  const step = (to - from) / buckets;
  const data = useMemo(() => {
    const rows = Array.from({ length: buckets }, (_, i) => ({ t: from + i * step, err: 0, warn: 0, info: 0 }));
    for (const l of logs) {
      const i = Math.min(buckets - 1, Math.floor((l.ts - from) / step));
      const r = rows[i];
      if (!r) continue;
      if (l.level === 'error' || l.level === 'critical') r.err++;
      else if (l.level === 'warning') r.warn++;
      else r.info++;
    }
    return rows;
  }, [logs, from, step]);
  const multiDay = to - from > 36 * 3_600_000;
  return (
    <div dir="ltr" className="h-28 w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 600, height: 112 }}>
        <BarChart data={data} margin={{ top: 4, right: rtl ? 0 : 4, left: rtl ? 4 : 0, bottom: 0 }} barCategoryGap={1}>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis dataKey="t" reversed={rtl} tickFormatter={(v: number) => (multiDay ? f.dayMonth(v) : f.time(v))} tickLine={false} axisLine={false} minTickGap={40} fontSize={10.5} />
          <YAxis orientation={rtl ? 'right' : 'left'} width={34} tickLine={false} axisLine={false} fontSize={10.5} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: 'var(--surface-3)', opacity: 0.6 }}
            isAnimationActive={false}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <div dir={rtl ? 'rtl' : 'ltr'} className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-pop">
                  <div className="mb-1 text-muted tabular">{typeof label === 'number' ? f.dateTime(label) : ''}</div>
                  {payload.map((p) => (
                    <div key={String(p.dataKey)} className="flex justify-between gap-4">
                      <span className="text-muted">{p.dataKey === 'err' ? t('logLevels.error') : p.dataKey === 'warn' ? t('logLevels.warning') : t('logLevels.info')}</span>
                      <span className="font-semibold text-fg tabular">{f.number(Number(p.value))}</span>
                    </div>
                  ))}
                </div>
              ) : null
            }
          />
          <Bar dataKey="info" stackId="a" fill="var(--chart-4)" fillOpacity={0.55} isAnimationActive={false} />
          <Bar dataKey="warn" stackId="a" fill="var(--warn)" isAnimationActive={false} />
          <Bar dataKey="err" stackId="a" fill="var(--crit)" radius={[2, 2, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function Detail({ log, onSource }: { log: LogEntry; onSource: (s: string) => void }) {
  const { t } = useTranslation();
  const f = useFormat();
  const device = log.deviceId ? getDevice(log.deviceId) : undefined;
  const rows: [string, ReactNode][] = [
    [t('logs.detail.id'), <span key="id" className="ltr-text">{log.id}</span>],
    [t('logs.detail.timestamp'), <span key="ts" className="ltr-text">{new Date(log.ts).toISOString()} · {f.dateTime(log.ts)}</span>],
    [t('logs.facility'), t(`facilities.${log.facility}`)],
    [t('logs.detail.device'), device ? <span key="d" className="ltr-text">{device.hostname} ({device.ip})</span> : '—'],
  ];
  return (
    <div className="bg-surface-2 px-4 py-3 sm:px-5">
      <dl className="grid gap-x-6 gap-y-1.5 text-[12px] sm:grid-cols-[auto_1fr]">
        {rows.map(([k, v]) => (
          <Fragment key={k}>
            <dt className="text-subtle">{k}</dt>
            <dd className="text-fg">{v}</dd>
          </Fragment>
        ))}
      </dl>
      <div className="mt-3 flex flex-wrap gap-2">
        {device && (
          <Link href={`/devices/${device.id}/`} className="rounded-md border border-line px-2.5 py-1 text-xs font-medium text-fg hover:bg-surface-3">
            {t('logs.detail.openDevice')}
          </Link>
        )}
        <button type="button" onClick={() => onSource(log.source)} className="rounded-md border border-line px-2.5 py-1 text-xs font-medium text-fg hover:bg-surface-3">
          {t('logs.detail.filterSource')}
        </button>
      </div>
    </div>
  );
}

export default function LogsPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const loading = useSimulatedLoading();
  const allLogs = useLive((s) => s.logs);
  const now = useLive((s) => s.now);
  const [q, setQ] = useQueryState(['source'] as const);
  const [search, setSearch] = useState('');
  const term = useDebounced(search, 200).trim();
  const [range, setRange] = useState<Range>('1h');
  const [levels, setLevels] = useState<Set<LogLevel>>(new Set(LOG_LEVELS.filter((l) => l !== 'debug')));
  const [facility, setFacility] = useState('');
  const [live, setLive] = useState(true);
  const [snapshot, setSnapshot] = useState<{ at: number; logs: LogEntry[] } | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const [expanded, setExpanded] = useState<string | null>(null);

  const logs = live || !snapshot ? allLogs : snapshot.logs;
  const at = live || !snapshot ? now : snapshot.at;
  const from = at - RANGE_MS[range];

  const sources = useMemo(() => [...APPS.map((a) => a.id), ...DEVICES.map((d) => d.hostname)], []);

  const inRange = useMemo(() => {
    const termL = term.toLowerCase();
    return logs.filter((l) => {
      if (l.ts < from || l.ts > at) return false;
      if (q.source && l.source !== q.source) return false;
      if (facility && l.facility !== facility) return false;
      if (termL && !(l.message.toLowerCase().includes(termL) || l.source.toLowerCase().includes(termL))) return false;
      return true;
    });
  }, [logs, from, at, q.source, facility, term]);

  const levelCounts = useMemo(() => {
    const c: Record<LogLevel, number> = { critical: 0, error: 0, warning: 0, info: 0, debug: 0 };
    for (const l of inRange) c[l.level]++;
    return c;
  }, [inRange]);

  const visible = useMemo(() => inRange.filter((l) => levels.has(l.level)), [inRange, levels]);
  const shown = visible.slice(0, limit);

  const toggleLive = () => {
    if (live) setSnapshot({ at: now, logs: allLogs });
    else setSnapshot(null);
    setLive(!live);
  };

  const exportCsv = () => {
    const rows = visible.map((l) => [new Date(l.ts).toISOString(), l.level, l.source, l.facility, l.message]);
    downloadText(`${t('logs.csvName')}.csv`, toCsv(['timestamp', 'level', 'source', 'facility', 'message'], rows));
  };

  return (
    <>
      <PageTitle title={t('nav.logs')} />
      <PageHeader
        title={t('logs.title')}
        subtitle={t('logs.subtitle')}
        actions={
          <Button variant="outline" size="sm" leading={<Download className="size-4" />} onClick={exportCsv}>
            {t('actions.exportCsv')}
          </Button>
        }
      />
      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput value={search} onChange={(v) => { setSearch(v); setLimit(PAGE); }} placeholder={t('logs.search')} label={t('logs.search')} className="w-full lg:w-96" />
            <Select value={q.source} onChange={(e) => setQ({ source: e.target.value })} aria-label={t('logs.source')} className="w-full sm:w-52">
              <option value="">{t('logs.allSources')}</option>
              {sources.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            <Select value={facility} onChange={(e) => setFacility(e.target.value)} aria-label={t('logs.facility')} className="w-full sm:w-44">
              <option value="">{t('logs.allFacilities')}</option>
              {FACILITIES.map((fa) => (
                <option key={fa} value={fa}>
                  {t(`facilities.${fa}`)}
                </option>
              ))}
            </Select>
            <Segmented label={t('alerts.filters.range')} value={range} onChange={(v) => { setRange(v); setLimit(PAGE); }} options={(['15m', '1h', '24h', '7d'] as Range[]).map((r) => ({ value: r, label: t(`timeRanges.${r}`) }))} />
            <Button size="sm" variant={live ? 'primary' : 'outline'} onClick={toggleLive} leading={live ? <Pause className="size-4" /> : <Play className="size-4 rtl:-scale-x-100" />} aria-pressed={live} className="ms-auto">
              {t('logs.liveTail')}
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {LOG_LEVELS.map((lv) => (
              <ChipToggle
                key={lv}
                active={levels.has(lv)}
                onClick={() =>
                  setLevels((s) => {
                    const n = new Set(s);
                    if (n.has(lv)) n.delete(lv);
                    else n.add(lv);
                    return n;
                  })
                }
                tone={LEVEL_CLS[lv]}
              >
                {t(`logLevels.${lv}`)}
                <span className="tabular opacity-75">{f.number(levelCounts[lv])}</span>
              </ChipToggle>
            ))}
            <span className={cn('ms-auto inline-flex items-center gap-1.5 text-xs', live ? 'text-ok' : 'text-muted')}>
              <span className={cn('size-1.5 rounded-full', live ? 'animate-pulse bg-ok' : 'bg-unknown')} />
              {live ? t('logs.liveOn') : t('logs.liveOff')}
            </span>
          </div>
        </div>

        <div className="border-b border-line px-4 pt-3 pb-1 sm:px-5">
          <div className="mb-1 text-[11.5px] font-medium text-muted">{t('logs.volume')}</div>
          <VolumeChart logs={visible} from={from} to={at} />
        </div>

        {loading ? (
          <div className="p-5">
            <SkeletonRows rows={10} />
          </div>
        ) : visible.length === 0 ? (
          <EmptyState icon={<ScrollText className="size-5" />} title={t('logs.emptyTitle')} body={t('logs.emptyBody')} />
        ) : (
          <>
            <div className="hidden grid-cols-[150px_84px_170px_1fr] gap-3 border-b border-line bg-surface-2 px-5 py-2 text-[11px] font-medium text-muted md:grid">
              <span>{t('logs.col.time')}</span>
              <span>{t('logs.col.level')}</span>
              <span>{t('logs.col.source')}</span>
              <span>{t('logs.col.message')}</span>
            </div>
            <ul className="divide-y divide-line font-mono text-[12px]">
              {shown.map((l) => {
                const fresh = live && now - l.ts < TICK_MS + 500;
                const open = expanded === l.id;
                return (
                  <li key={l.id} className={cn(fresh && 'animate-fade-up bg-brand/5')}>
                    <button
                      type="button"
                      onClick={() => setExpanded(open ? null : l.id)}
                      className="grid w-full grid-cols-[auto_auto_1fr] items-start gap-x-3 gap-y-1 px-4 py-1.5 text-start hover:bg-surface-2 sm:px-5 md:grid-cols-[150px_84px_170px_1fr]"
                    >
                      <span className="whitespace-nowrap text-subtle tabular">{range === '24h' || range === '7d' ? `${f.dayMonth(l.ts)} ` : ''}{f.time(l.ts, true)}</span>
                      <span>
                        <Badge className={cn('border-0 font-sans uppercase', LEVEL_CLS[l.level])}>{t(`logLevels.${l.level}`)}</Badge>
                      </span>
                      <span className="ltr-text truncate text-muted">
                        <Highlight text={l.source} term={term} />
                      </span>
                      <span dir="auto" className={cn('col-span-3 min-w-0 break-words text-start text-fg md:col-span-1', hasArabic(l.message) && 'font-arabic text-[13px]')}>
                        <Highlight text={l.message} term={term} />
                      </span>
                    </button>
                    {open && <Detail log={l} onSource={(s) => setQ({ source: s })} />}
                  </li>
                );
              })}
            </ul>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-xs text-muted sm:px-5">
              <span className="tabular">{t('logs.results', { shown: f.number(shown.length), total: f.number(visible.length) })}</span>
              {shown.length < visible.length && (
                <Button size="sm" variant="outline" onClick={() => setLimit((n) => n + PAGE)}>
                  {t('actions.loadMore')}
                </Button>
              )}
              <span className="text-subtle">{t('logs.retention')}</span>
            </div>
          </>
        )}
      </Card>
    </>
  );
}
