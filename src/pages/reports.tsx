import { Activity, AlertTriangle, CalendarClock, Eye, FileDown, Gauge, HardDrive, Network, ShieldCheck, type LucideIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TimeSeriesChart } from '@/components/charts/TimeSeriesChart';
import { PageTitle } from '@/components/layout/PageTitle';
import { Badge, type Tone } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Card';
import { SkeletonCard } from '@/components/ui/Feedback';
import { MetricBar } from '@/components/ui/MetricBar';
import { Modal } from '@/components/ui/Modal';
import {
  CONTROL_AREAS,
  DAY,
  DEVICES,
  FRAMEWORKS,
  HOUR,
  SITES,
  WAN_LINKS,
  availability,
  businessHoursAvailability,
  getDevice,
  healthScore,
  metricValue,
  mttrMinutes,
  wanLinkUtil,
  type ControlStatus,
  type Device,
  type SeriesPoint,
} from '@/mock';
import { ltrIsolate } from '@/lib/format';
import { useDuration, useFormat, useSimulatedLoading } from '@/lib/hooks';
import { useLive } from '@/store/live';
import { toast } from '@/store/ui';

type ReportId = 'sla' | 'capacity' | 'compliance' | 'executive' | 'incidents' | 'carriers';
const REPORTS: { id: ReportId; icon: LucideIcon; tone: string }[] = [
  { id: 'sla', icon: Gauge, tone: 'bg-ok/12 text-ok' },
  { id: 'capacity', icon: HardDrive, tone: 'bg-info/12 text-info' },
  { id: 'compliance', icon: ShieldCheck, tone: 'bg-brand/12 text-brand' },
  { id: 'executive', icon: Activity, tone: 'bg-accent/14 text-accent' },
  { id: 'incidents', icon: AlertTriangle, tone: 'bg-warn/12 text-warn' },
  { id: 'carriers', icon: Network, tone: 'bg-info/12 text-info' },
];
const STATUS_TONE: Record<ControlStatus, Tone> = { supported: 'ok', shared: 'info', customer: 'neutral' };
const SLA_TARGET = 99.9;

/** Previous calendar month in AST: [start, end). */
function previousMonth(now: number) {
  const d = new Date(now + 3 * HOUR);
  const start = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1) - 3 * HOUR;
  const end = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) - 3 * HOUR;
  return { start, end, days: Math.round((end - start) / DAY) };
}

function SlaPreview() {
  const { t } = useTranslation();
  const f = useFormat();
  const dur = useDuration();
  const episodes = useLive((s) => s.episodes);
  const now = useLive((s) => s.now);
  const { end, days } = previousMonth(now);
  const rows = useMemo(
    () =>
      SITES.map((s) => {
        const devs = DEVICES.filter((d) => d.siteId === s.id && d.criticality !== 'tier3');
        const avail = availability(devs, episodes, days, end - 1);
        const biz = businessHoursAvailability(devs, episodes, days, end - 1);
        return { site: s, avail, biz, downtime: ((100 - avail) / 100) * days * DAY };
      }),
    [episodes, end, days],
  );
  return (
    <table className="w-full text-[12.5px]">
      <thead className="text-[11px] text-subtle">
        <tr className="border-b border-line">
          <th className="py-2 text-start font-medium">{t('reports.preview.site')}</th>
          <th className="py-2 text-end font-medium">{t('reports.preview.availability')}</th>
          <th className="hidden py-2 text-end font-medium sm:table-cell">{t('reports.preview.businessHours')}</th>
          <th className="hidden py-2 text-end font-medium sm:table-cell">{t('reports.preview.downtime')}</th>
          <th className="py-2 text-end font-medium">{t('reports.preview.target')}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.site.id} className="border-b border-line last:border-0">
            <td className="py-2 text-fg">{t(`sites.${r.site.id}`)}</td>
            <td className="py-2 text-end font-semibold text-fg tabular">{f.percent(r.avail, 3)}</td>
            <td className="hidden py-2 text-end text-muted tabular sm:table-cell">{f.percent(r.biz, 3)}</td>
            <td className="hidden py-2 text-end text-muted tabular sm:table-cell">{dur(r.downtime)}</td>
            <td className="py-2 text-end">
              <Badge tone={r.avail >= SLA_TARGET ? 'ok' : 'warn'}>{r.avail >= SLA_TARGET ? t('reports.preview.met') : t('reports.preview.missed')}</Badge>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function diskTrend(d: Device, now: number) {
  const cur = metricValue(d, 'disk', now) ?? 0;
  const past = metricValue(d, 'disk', now - 10 * DAY) ?? cur;
  const slope = (cur - past) / 10;
  const eta = cur >= 90 ? 0 : slope > 0.01 ? (90 - cur) / slope : Infinity;
  return { cur, slope, eta };
}

function CapacityPreview() {
  const { t } = useTranslation();
  const f = useFormat();
  const now = useLive((s) => s.now);
  const episodes = useLive((s) => s.episodes);
  const day = Math.floor(now / HOUR) * HOUR;
  const vols = useMemo(
    () =>
      DEVICES.filter((d) => d.metrics.includes('disk'))
        .map((d) => {
          const { cur, slope, eta } = diskTrend(d, day);
          // Live degraded value wins for the current reading (e.g. the ERP database story).
          const live = metricValue(d, 'disk', day, episodes[d.id]) ?? cur;
          return { d, cur: Math.max(cur, live), slope, eta: live >= 90 ? 0 : eta };
        })
        .sort((a, b) => a.eta - b.eta || b.cur - a.cur)
        .slice(0, 6),
    [day, episodes],
  );
  const top = vols.slice(0, 3);
  const colors = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)'];
  const series = useMemo(() => {
    const pts: SeriesPoint[] = [];
    for (let ts = day - 60 * DAY; ts <= day + 30 * DAY; ts += DAY / 2) {
      const p: SeriesPoint = { t: ts };
      top.forEach(({ d, slope }) => {
        if (ts <= day) p[d.id] = metricValue(d, 'disk', ts, episodes[d.id]);
        if (ts >= day) {
          const base = metricValue(d, 'disk', day, episodes[d.id]) ?? 0;
          p[`${d.id}_f`] = Math.min(100, base + Math.max(slope, 0.05) * ((ts - day) / DAY));
        }
      });
      pts.push(p);
    }
    return pts;
  }, [top, day, episodes]);
  const wan = useMemo(
    () =>
      WAN_LINKS.filter((l) => l.kind === 'primary').map((l) => {
        const samples: number[] = [];
        for (let ts = day - 30 * DAY; ts <= day; ts += HOUR) samples.push(wanLinkUtil(l, ts, 'up') * 100);
        samples.sort((a, b) => a - b);
        return { l, p95: samples[Math.floor(samples.length * 0.95)] ?? 0 };
      }),
    [day],
  );
  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 text-[13px] font-semibold text-fg">{t('reports.preview.history')}</div>
        <TimeSeriesChart
          data={series}
          height={210}
          yDomain={[0, 100]}
          valueFormatter={(v) => `${f.number(v, 1)}%`}
          axisFormatter={(v) => `${f.number(v)}%`}
          thresholds={[{ value: 90, tone: 'crit' }]}
          series={top.flatMap(({ d }, i) => [
            { key: d.id, label: d.hostname, color: colors[i] ?? 'var(--chart-4)', type: 'line' as const },
            { key: `${d.id}_f`, label: `${d.hostname} · ${t('reports.preview.forecast')}`, color: colors[i] ?? 'var(--chart-4)', type: 'line' as const, dashed: true },
          ])}
          showLegend={false}
        />
      </div>
      <div>
        <div className="mb-2 text-[13px] font-semibold text-fg">{t('reports.preview.storage')}</div>
        <table className="w-full text-[12.5px]">
          <thead className="text-[11px] text-subtle">
            <tr className="border-b border-line">
              <th className="py-2 text-start font-medium">{t('reports.preview.volume')}</th>
              <th className="w-40 py-2 text-start font-medium">{t('reports.preview.current')}</th>
              <th className="py-2 text-end font-medium">{t('reports.preview.growth')}</th>
              <th className="py-2 text-end font-medium">{t('reports.preview.eta')}</th>
            </tr>
          </thead>
          <tbody>
            {vols.map(({ d, cur, slope, eta }) => (
              <tr key={d.id} className="border-b border-line last:border-0">
                <td className="py-2">
                  <span className="ltr-text font-medium text-fg">{d.hostname}</span>
                </td>
                <td className="py-2 pe-4">
                  <MetricBar value={cur} warn={85} crit={90} />
                </td>
                <td className="py-2 text-end text-muted tabular">{slope > 0 ? ltrIsolate(`+${f.number(slope, 2)}%`) : '—'}</td>
                <td className="py-2 text-end">
                  {eta === 0 ? (
                    <Badge tone="crit">{t('reports.preview.exceeded')}</Badge>
                  ) : Number.isFinite(eta) ? (
                    <Badge tone={eta < 30 ? 'warn' : 'neutral'}>{t('reports.preview.inDays', { n: f.number(Math.round(eta)) })}</Badge>
                  ) : (
                    <Badge tone="ok">{t('reports.preview.stable')}</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <WanTable rows={wan} />
    </div>
  );
}

function WanTable({ rows }: { rows: { l: (typeof WAN_LINKS)[number]; p95: number }[] }) {
  const { t } = useTranslation();
  return (
    <div>
      <div className="mb-2 text-[13px] font-semibold text-fg">{t('reports.preview.wan')}</div>
      <table className="w-full text-[12.5px]">
        <thead className="text-[11px] text-subtle">
          <tr className="border-b border-line">
            <th className="py-2 text-start font-medium">{t('reports.preview.site')}</th>
            <th className="py-2 text-start font-medium">{t('reports.preview.link')}</th>
            <th className="w-44 py-2 text-start font-medium">{t('reports.preview.p95')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ l, p95 }) => {
            const site = getDevice(l.from)?.siteId;
            return (
              <tr key={l.id} className="border-b border-line last:border-0">
                <td className="py-2 text-fg">{site ? t(`sites.${site}`) : ''}</td>
                <td className="py-2 text-muted">
                  {t(`carriers.${l.carrier}`)}
                  {l.status === 'down' && (
                    <Badge tone="crit" className="ms-2">
                      {t('status.down')}
                    </Badge>
                  )}
                </td>
                <td className="py-2">
                  <MetricBar value={p95} warn={70} crit={85} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CompliancePreview() {
  const { t } = useTranslation();
  const f = useFormat();
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {FRAMEWORKS.map((fw) => {
          const items = CONTROL_AREAS.filter((c) => c.framework === fw);
          return (
            <div key={fw} className="rounded-xl border border-line p-3">
              <div className="text-[13px] font-semibold text-fg">{t(`compliance.frameworks.${fw}`)}</div>
              <div className="mt-2 space-y-1 text-[12px]">
                {(['supported', 'shared', 'customer'] as const).map((s) => (
                  <div key={s} className="flex items-center justify-between gap-2">
                    <span className="text-muted">{t(`compliance.status.${s}`)}</span>
                    <Badge tone={STATUS_TONE[s]}>{f.number(items.filter((i) => i.status === s).length)}</Badge>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <ul className="divide-y divide-line rounded-xl border border-line">
        {CONTROL_AREAS.slice(0, 7).map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2 text-[12.5px]">
            <span className="text-fg">{t(`compliance.controls.${c.id}.title`)}</span>
            <Badge tone={STATUS_TONE[c.status]}>{t(`compliance.status.${c.status}`)}</Badge>
          </li>
        ))}
      </ul>
      <p className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-[12px] text-accent">{t('reports.preview.complianceNote')}</p>
      <ButtonLink href="/compliance" size="sm" variant="outline">
        {t('reports.preview.openCompliance')}
      </ButtonLink>
    </div>
  );
}

function KpiPreview() {
  const { t } = useTranslation();
  const f = useFormat();
  const dur = useDuration();
  const episodes = useLive((s) => s.episodes);
  const alerts = useLive((s) => s.alerts);
  const now = useLive((s) => s.now);
  const week = alerts.filter((a) => a.createdAt > now - 7 * DAY);
  const acked = week.filter((a) => a.ackAt);
  const mtta = acked.length ? acked.reduce((s, a) => s + ((a.ackAt ?? 0) - a.createdAt), 0) / acked.length : 0;
  const items = [
    [t('reports.preview.healthScore'), f.number(healthScore(DEVICES, episodes, alerts))],
    [t('reports.preview.availability'), f.percent(availability(DEVICES, episodes, 7, now), 3)],
    [t('reports.preview.alertsRaised'), f.number(week.length)],
    [t('reports.preview.mtta'), dur(mtta)],
    [t('reports.preview.mttr'), dur(mttrMinutes(alerts, 7 * DAY, now) * 60_000)],
  ];
  return (
    <div>
      <div className="mb-2 text-[13px] font-semibold text-fg">{t('reports.preview.kpis')}</div>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map(([k, v]) => (
          <div key={k} className="rounded-xl border border-line p-3">
            <dt className="text-[11.5px] text-muted">{k}</dt>
            <dd className="mt-1 text-lg font-semibold text-fg tabular">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function CarriersPreview() {
  const now = useLive((s) => s.now);
  const day = Math.floor(now / HOUR) * HOUR;
  const rows = useMemo(
    () =>
      WAN_LINKS.filter((l) => l.kind !== 'dci').map((l) => {
        const samples: number[] = [];
        for (let ts = day - 30 * DAY; ts <= day; ts += 2 * HOUR) samples.push(wanLinkUtil(l, ts, l.status === 'down' ? 'up' : l.status) * 100);
        samples.sort((a, b) => a - b);
        return { l, p95: samples[Math.floor(samples.length * 0.95)] ?? 0 };
      }),
    [day],
  );
  return <WanTable rows={rows} />;
}

export default function ReportsPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const loading = useSimulatedLoading();
  const now = useLive((s) => s.now);
  const [preview, setPreview] = useState<ReportId | null>(null);
  const month = previousMonth(now);
  const periodFor = (id: ReportId) => {
    if (id === 'executive' || id === 'incidents') return `${f.date(now - 7 * DAY)} – ${f.date(now)}`;
    if (id === 'compliance') return `${f.date(now - 90 * DAY)} – ${f.date(now)}`;
    return `${f.date(month.start)} – ${f.date(month.end - 1)}`;
  };
  const download = (id: ReportId) => toast({ kind: 'info', title: t('toasts.pdfTitle'), body: t('toasts.pdfBody', { name: t(`reports.cards.${id}.title`) }) }, 6000);

  return (
    <>
      <PageTitle title={t('nav.reports')} />
      <PageHeader title={t('reports.title')} subtitle={t('reports.subtitle')} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading
          ? Array.from({ length: 6 }, (_, i) => <SkeletonCard key={i} className="h-60" />)
          : REPORTS.map(({ id, icon: Icon, tone }, i) => (
              <Card key={id} className="flex flex-col p-5" style={{ animationDelay: `${i * 40}ms` }}>
                <div className="flex items-start justify-between gap-3">
                  <span className={`grid size-10 place-items-center rounded-xl ${tone}`}>
                    <Icon className="size-5" />
                  </span>
                  <Badge tone="neutral">{t('reports.formats')}</Badge>
                </div>
                <h2 className="mt-4 text-[15px] font-semibold text-fg">{t(`reports.cards.${id}.title`)}</h2>
                <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-muted">{t(`reports.cards.${id}.desc`)}</p>
                <dl className="mt-4 space-y-1.5 border-t border-line pt-3 text-[12px]">
                  <div className="flex justify-between gap-3">
                    <dt className="text-subtle">{t('reports.period')}</dt>
                    <dd className="text-end text-fg tabular">{periodFor(id)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="flex items-center gap-1 text-subtle">
                      <CalendarClock className="size-3.5" />
                      {t('reports.schedule')}
                    </dt>
                    <dd className="text-end text-fg">{t(`reports.cards.${id}.schedule`)}</dd>
                  </div>
                </dl>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" leading={<Eye className="size-4" />} onClick={() => setPreview(id)}>
                    {t('actions.preview')}
                  </Button>
                  <Button size="sm" variant="primary" className="flex-1" leading={<FileDown className="size-4" />} onClick={() => download(id)}>
                    {t('actions.downloadPdf')}
                  </Button>
                </div>
              </Card>
            ))}
      </div>

      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        size="lg"
        title={preview ? t('reports.preview.title', { name: t(`reports.cards.${preview}.title`) }) : ''}
        subtitle={preview ? `${periodFor(preview)} · ${t('reports.preview.sample')}` : ''}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPreview(null)}>
              {t('actions.close')}
            </Button>
            <Button variant="primary" leading={<FileDown className="size-4" />} onClick={() => preview && download(preview)}>
              {t('actions.downloadPdf')}
            </Button>
          </>
        }
      >
        {preview === 'sla' && <SlaPreview />}
        {preview === 'capacity' && <CapacityPreview />}
        {preview === 'compliance' && <CompliancePreview />}
        {(preview === 'executive' || preview === 'incidents') && <KpiPreview />}
        {preview === 'carriers' && <CarriersPreview />}
      </Modal>
    </>
  );
}
