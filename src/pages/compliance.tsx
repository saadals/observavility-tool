import { ArrowRight, CheckCircle2, CircleDashed, Cloud, Database, KeyRound, Lock, MonitorSmartphone, Radio, Server, ShieldCheck, Users, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageTitle } from '@/components/layout/PageTitle';
import { SaudiMap } from '@/components/map/SaudiMap';
import { Badge, type Tone } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Form';
import { CONTROL_AREAS, FRAMEWORKS, type ControlStatus, type Framework, type SiteId } from '@/mock';
import { cn } from '@/lib/cn';
import type { DemoPage } from './_app';

const STATUS_TONE: Record<ControlStatus, Tone> = { supported: 'ok', shared: 'info', customer: 'neutral' };
const STATUS_ICON: Record<ControlStatus, LucideIcon> = { supported: CheckCircle2, shared: Users, customer: CircleDashed };
const FLOW: { key: string; icon: LucideIcon }[] = [
  { key: 's1', icon: Radio },
  { key: 's2', icon: Lock },
  { key: 's3', icon: Server },
  { key: 's4', icon: Database },
  { key: 's5', icon: MonitorSmartphone },
];
const PRINCIPLES: { key: string; icon: LucideIcon }[] = [
  { key: 'p1', icon: Cloud },
  { key: 'p2', icon: KeyRound },
  { key: 'p3', icon: Database },
  { key: 'p4', icon: Lock },
  { key: 'p5', icon: ShieldCheck },
  { key: 'p6', icon: Server },
];

const CompliancePage: DemoPage = () => {
  const { t } = useTranslation();
  const [fw, setFw] = useState<Framework | 'all'>('all');
  const mapInfo = (id: SiteId) =>
    id === 'ruh-dc1' || id === 'jed-dc2'
      ? { tone: 'ok' as const, detail: id === 'ruh-dc1' ? t('compliance.dc.primary') : t('compliance.dc.dr') }
      : { tone: 'brand' as const };

  return (
    <div className="mx-auto max-w-6xl px-0 sm:px-0">
      <PageTitle title={t('nav.compliance')} />
      <div className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight text-fg sm:text-[22px]">{t('compliance.title')}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">{t('compliance.subtitle')}</p>
      </div>

      {/* Hero */}
      <section className="relative mb-4 overflow-hidden rounded-2xl border border-brand/30 bg-brand/8 p-6 sm:p-8">
        <div className="lattice pointer-events-none absolute inset-0 opacity-[0.06]" aria-hidden />
        <div className="relative grid items-center gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="brand" icon={<ShieldCheck className="size-3.5" />}>
                {t('compliance.hero.badge')}
              </Badge>
              <Badge tone="accent">{t('compliance.hero.illustrative')}</Badge>
            </div>
            <h2 className="mt-4 text-2xl font-semibold leading-snug text-fg sm:text-[28px]">{t('compliance.hero.title')}</h2>
            <p className="mt-3 max-w-xl text-[14.5px] leading-relaxed text-muted">{t('compliance.hero.body')}</p>
            <div className="sadu-band mt-6 h-2 w-36 opacity-50" aria-hidden />
          </div>
          <div className="rounded-xl border border-line bg-surface/70 p-3">
            <SaudiMap info={mapInfo} showLinks highlightDcs />
          </div>
        </div>
      </section>

      {/* Data centers */}
      <div className="mb-4 grid gap-4 md:grid-cols-2">
        {(['ruh-dc1', 'jed-dc2'] as const).map((id) => (
          <Card key={id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-ok" />
                  <h3 className="text-[15px] font-semibold text-fg">{t(`sites.${id}`)}</h3>
                </div>
                <p className="mt-1 text-[13px] text-muted">{id === 'ruh-dc1' ? t('compliance.dc.dc1Desc') : t('compliance.dc.dc2Desc')}</p>
              </div>
              <Badge tone={id === 'ruh-dc1' ? 'brand' : 'info'}>{id === 'ruh-dc1' ? t('compliance.dc.primary') : t('compliance.dc.dr')}</Badge>
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-3 text-[12px]">
              {(['rpo', 'rto', 'encryption'] as const).map((k) => (
                <div key={k}>
                  <dt className="text-subtle">{t(`compliance.dc.facts.${k}`)}</dt>
                  <dd className="mt-0.5 font-semibold text-fg">{t(`compliance.dc.facts.${k}Value`)}</dd>
                </div>
              ))}
            </dl>
          </Card>
        ))}
      </div>
      <p className="-mt-2 mb-4 text-[11.5px] text-subtle">{t('compliance.dc.mapNote')}</p>

      {/* Data flow */}
      <Card className="mb-4">
        <CardHeader title={t('compliance.flow.title')} subtitle={t('compliance.flow.subtitle')} actions={<Badge tone="ok" icon={<ShieldCheck className="size-3.5" />}>{t('compliance.flow.noCrossBorder')}</Badge>} />
        <CardBody>
          <ol className="grid gap-3 lg:grid-cols-5">
            {FLOW.map(({ key, icon: Icon }, i) => (
              <li key={key} className="relative flex gap-3 rounded-xl border border-line bg-surface-2 p-3.5 lg:flex-col">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand/12 text-brand">
                  <Icon className="size-4.5" />
                </span>
                <div>
                  <div className="text-[11px] font-semibold text-subtle tabular">0{i + 1}</div>
                  <div className="text-[13.5px] font-semibold text-fg">{t(`compliance.flow.${key}`)}</div>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{t(`compliance.flow.${key}d`)}</p>
                </div>
                {i < FLOW.length - 1 && (
                  <ArrowRight className="absolute -end-3 top-1/2 z-10 hidden size-5 -translate-y-1/2 rounded-full bg-bg p-0.5 text-brand lg:block rtl:-scale-x-100" aria-hidden />
                )}
              </li>
            ))}
          </ol>
        </CardBody>
      </Card>

      {/* Principles */}
      <Card className="mb-4">
        <CardHeader title={t('compliance.principles.title')} />
        <CardBody>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PRINCIPLES.map(({ key, icon: Icon }) => (
              <li key={key} className="flex gap-3 text-[13px] leading-relaxed text-fg">
                <Icon className="mt-0.5 size-4 shrink-0 text-accent" />
                {t(`compliance.principles.${key}`)}
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      {/* Frameworks */}
      <Card className="mb-4">
        <CardHeader
          title={t('compliance.frameworks.title')}
          subtitle={t('compliance.frameworks.subtitle')}
          actions={
            <Segmented
              label={t('compliance.frameworks.title')}
              value={fw}
              onChange={setFw}
              options={[{ value: 'all' as const, label: t('compliance.frameworks.all') }, ...FRAMEWORKS.map((x) => ({ value: x, label: t(`compliance.frameworks.${x}`) }))]}
            />
          }
        />
        <CardBody className="space-y-6">
          <div className="flex flex-wrap gap-3 text-[12px]">
            {(['supported', 'shared', 'customer'] as const).map((s) => {
              const Icon = STATUS_ICON[s];
              return (
                <Badge key={s} tone={STATUS_TONE[s]} icon={<Icon className="size-3.5" />}>
                  {t(`compliance.status.${s}`)}
                </Badge>
              );
            })}
          </div>
          {FRAMEWORKS.filter((x) => fw === 'all' || x === fw).map((x) => (
            <section key={x}>
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-2">
                <div>
                  <h3 className="text-[15px] font-semibold text-fg">{t(`compliance.frameworks.${x}Full`)}</h3>
                  <p className="mt-0.5 text-xs font-medium text-brand">{t('compliance.frameworks.designed', { name: t(`compliance.frameworks.${x}`) })}</p>
                </div>
                <Badge tone="accent">{t('common.illustrative')}</Badge>
              </div>
              <ul className="grid gap-2.5 md:grid-cols-2">
                {CONTROL_AREAS.filter((c) => c.framework === x).map((c) => {
                  const Icon = STATUS_ICON[c.status];
                  return (
                    <li key={c.id} className="flex gap-3 rounded-xl border border-line bg-surface-2 p-3.5">
                      <Icon className={cn('mt-0.5 size-4.5 shrink-0', c.status === 'supported' ? 'text-ok' : c.status === 'shared' ? 'text-info' : 'text-subtle')} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <span className="text-[13.5px] font-semibold text-fg">{t(`compliance.controls.${c.id}.title`)}</span>
                          <Badge tone={STATUS_TONE[c.status]}>{t(`compliance.status.${c.status}`)}</Badge>
                        </div>
                        <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{t(`compliance.controls.${c.id}.desc`)}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </CardBody>
      </Card>

      <div role="note" className="rounded-xl border border-accent/35 bg-accent/10 p-4 text-[13px] leading-relaxed text-fg">
        <div className="mb-1 font-semibold text-accent">{t('compliance.disclaimer.title')}</div>
        {t('compliance.disclaimer.body')}
      </div>
    </div>
  );
};

CompliancePage.layout = 'auto';
export default CompliancePage;
