import dynamic from 'next/dynamic';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { PageTitle } from '@/components/layout/PageTitle';
import { Card, PageHeader } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Feedback';
import { Segmented, Select } from '@/components/ui/Form';
import { DEVICES, SITES, WAN_LINKS, getDevice, type SiteId } from '@/mock';
import { useFormat, useQueryState } from '@/lib/hooks';

const TopologyView = dynamic(() => import('@/components/topology/TopologyView').then((m) => m.TopologyView), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-none" />,
});

/** Devices drawn in the backbone view: DC cores + each site's edge routers, firewalls and core switch(es). */
const BACKBONE_COUNT =
  DEVICES.filter((d) => d.type === 'coreRouter').length +
  SITES.filter((s) => s.kind !== 'datacenter').reduce((n, s) => {
    const devs = DEVICES.filter((d) => d.siteId === s.id);
    const routers = devs.filter((d) => d.type === 'edgeRouter').length;
    return n + routers + devs.filter((d) => d.type === 'firewall').length + Math.min(routers > 1 ? 2 : 1, devs.filter((d) => d.type === 'switch').length);
  }, 0);

function Legend() {
  const { t } = useTranslation();
  const items: { key: string; style: CSSProperties }[] = [
    { key: 'primary', style: { borderTop: '2px solid var(--brand)' } },
    { key: 'backupActive', style: { borderTop: '2px solid var(--warn)' } },
    { key: 'standby', style: { borderTop: '2px dotted var(--text-subtle)' } },
    { key: 'down', style: { borderTop: '2px dashed var(--crit)' } },
    { key: 'dci', style: { borderTop: '3px solid var(--accent)' } },
    { key: 'lan', style: { borderTop: '2px solid var(--border-strong)' } },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line px-4 py-3 text-[11.5px] text-muted sm:px-5">
      <span className="font-semibold text-fg">{t('topology.legend.title')}</span>
      {items.map((i) => (
        <span key={i.key} className="inline-flex items-center gap-1.5">
          <span className="inline-block w-5" style={i.style} />
          {t(`topology.legend.${i.key}`)}
        </span>
      ))}
      <span className="ms-auto hidden text-subtle lg:inline">{t('topology.hint')}</span>
    </div>
  );
}

export default function TopologyPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const [q, setQ] = useQueryState(['view', 'site', 'focus'] as const);
  const focusDevice = q.focus ? getDevice(q.focus) : undefined;
  const mode: 'backbone' | 'site' = q.view === 'site' || (focusDevice && q.view !== 'backbone') ? 'site' : 'backbone';
  const siteId = ((q.site || focusDevice?.siteId || 'ruh-hq') as SiteId);
  const deviceCount = mode === 'site' ? DEVICES.filter((d) => d.siteId === siteId).length : BACKBONE_COUNT;
  const links = mode === 'site' ? deviceCount - 1 : WAN_LINKS.length;

  return (
    <>
      <PageTitle title={t('nav.topology')} />
      <PageHeader
        title={t('topology.title')}
        subtitle={t('topology.subtitle')}
        actions={
          <>
            <Segmented
              label={t('topology.view.label')}
              value={mode}
              onChange={(v) => setQ({ view: v, focus: v === 'backbone' ? '' : q.focus })}
              options={[
                { value: 'backbone', label: t('topology.view.backbone') },
                { value: 'site', label: t('topology.view.site') },
              ]}
            />
            {mode === 'site' && (
              <Select size="sm" value={siteId} onChange={(e) => setQ({ view: 'site', site: e.target.value, focus: '' })} aria-label={t('topology.selectSite')} className="w-48">
                {SITES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {t(`sites.${s.id}`)}
                  </option>
                ))}
              </Select>
            )}
          </>
        }
      />
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5 text-xs text-muted sm:px-5">
          <span>{mode === 'site' ? t(`sites.${siteId}`) : t('topology.view.backbone')}</span>
          <span className="tabular">{t('topology.stats', { devices: f.number(deviceCount), links: f.number(links) })}</span>
        </div>
        <div className="h-[calc(100vh-250px)] min-h-[560px] bg-bg/40">
          <TopologyView mode={mode} siteId={siteId} focusId={q.focus || undefined} />
        </div>
        <Legend />
      </Card>
    </>
  );
}
