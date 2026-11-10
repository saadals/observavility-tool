import { Check, Rocket, Sparkles, TrendingDown } from 'lucide-react';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageTitle } from '@/components/layout/PageTitle';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Field, Input, Segmented } from '@/components/ui/Form';
import { cn } from '@/lib/cn';
import { useFormat } from '@/lib/hooks';
import { ANNUAL_DISCOUNT, INTL_COMPARISON, TIERS, intlMonthlySar, recommendTier, tierPrice, unitPrice, type Billing, type TierId } from '@/lib/pricing';
import { useUi } from '@/store/ui';
import type { DemoPage } from './_app';

function NumberSlider({ id, label, hint, value, onChange, max }: { id: string; label: string; hint?: string; value: number; onChange: (v: number) => void; max: number }) {
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={max}
          step={5}
          value={Math.min(value, max)}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-1.5 flex-1 cursor-pointer accent-[var(--brand)]"
          aria-label={label}
        />
        <Input id={id} type="number" min={0} value={value} onChange={(e) => onChange(Math.max(0, Math.floor(Number(e.target.value) || 0)))} className="w-24 text-center tabular" />
      </div>
    </Field>
  );
}

const PricingPage: DemoPage = () => {
  const { t } = useTranslation();
  const f = useFormat();
  const router = useRouter();
  const openEarly = useUi((s) => s.openEarlyAccess);
  const [billing, setBilling] = useState<Billing>('annual');
  const [devices, setDevices] = useState(120);
  const [servers, setServers] = useState(45);
  const recommended = recommendTier(devices, servers);
  const [plan, setPlan] = useState<TierId | null>(null);
  const activePlan = plan ?? recommended;
  const tier = TIERS.find((x) => x.id === activePlan) ?? TIERS[1]!;
  const price = tierPrice(tier, devices, servers, billing);
  const annualPrice = tierPrice(tier, devices, servers, 'annual');
  const monthlyListYear = tierPrice(tier, devices, servers, 'monthly').yearly;
  const intlYear = intlMonthlySar(devices, servers) * 12;
  const ourYear = price.yearly;
  const savingPct = intlYear > 0 ? Math.max(0, Math.round((1 - ourYear / intlYear) * 100)) : 0;
  const discountPct = Math.round(ANNUAL_DISCOUNT * 100);
  const starterLimit = TIERS[0]?.maxDevices ?? 150;
  const maxBar = Math.max(intlYear, ourYear, 1);

  return (
    <div className="mx-auto max-w-6xl">
      <PageTitle title={t('nav.pricing')} />
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">{t('pricing.title')}</h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-muted">{t('pricing.subtitle')}</p>
        <div className="mt-5 flex items-center justify-center gap-3">
          <Segmented
            label={t('pricing.annual')}
            value={billing}
            onChange={setBilling}
            options={[
              { value: 'monthly', label: t('pricing.monthly') },
              { value: 'annual', label: t('pricing.annual') },
            ]}
          />
          <Badge tone="ok">{t('pricing.save', { pct: discountPct })}</Badge>
        </div>
      </div>

      {/* Tiers */}
      <div className="grid gap-4 lg:grid-cols-3">
        {TIERS.map((x) => (
          <Card key={x.id} className={cn('relative flex flex-col p-6', x.highlighted && 'border-brand/60 shadow-pop ring-1 ring-brand/40')}>
            {x.highlighted && (
              <span className="absolute -top-3 start-6 inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-0.5 text-[11.5px] font-semibold text-brand-fg">
                <Sparkles className="size-3.5" />
                {t('pricing.popular')}
              </span>
            )}
            <h2 className="text-lg font-semibold text-fg">{t(`pricing.tiers.${x.id}.name`)}</h2>
            <p className="mt-1 min-h-10 text-[13px] text-muted">{t(`pricing.tiers.${x.id}.tagline`)}</p>
            <div className="mt-5 space-y-3">
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-semibold tracking-tight text-fg tabular">{f.sar(unitPrice(x.perDevice, billing), billing === 'annual' ? 1 : 0)}</span>
                </div>
                <div className="text-xs text-subtle">{t('pricing.perDevice')}</div>
              </div>
              <div>
                <div className="text-xl font-semibold text-fg tabular">{f.sar(unitPrice(x.perServer, billing), billing === 'annual' ? 1 : 0)}</div>
                <div className="text-xs text-subtle">
                  {t('pricing.perServer')}
                  {billing === 'annual' && ` · ${t('pricing.billedAnnually')}`}
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <Badge tone="neutral">{x.maxDevices ? t('pricing.upTo', { count: x.maxDevices }) : t('pricing.unlimited')}</Badge>
              <Badge tone="neutral">{t('pricing.logs', { gb: x.logsGb })}</Badge>
            </div>
            <ul className="mt-5 flex-1 space-y-2.5 border-t border-line pt-5">
              {x.features.map((k) => (
                <li key={k} className={cn('flex gap-2.5 text-[13px]', k.startsWith('everything') ? 'font-semibold text-fg' : 'text-muted')}>
                  {!k.startsWith('everything') && <Check className="mt-0.5 size-4 shrink-0 text-brand" />}
                  {t(`pricing.features.${k}`)}
                </li>
              ))}
            </ul>
            <Button variant={x.highlighted ? 'primary' : 'outline'} className="mt-6 w-full" onClick={() => openEarly(`${router.pathname}#${x.id}`)}>
              {x.id === 'enterprise' ? t('pricing.ctaEnterprise') : t('pricing.cta')}
            </Button>
          </Card>
        ))}
      </div>
      <p className="mt-3 text-center text-xs text-subtle">{t('pricing.vatNote')}</p>

      {/* Calculator */}
      <Card className="mt-10">
        <CardHeader title={t('pricing.calc.title')} subtitle={t('pricing.calc.subtitle')} />
        <CardBody className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-6">
            <NumberSlider id="calc-devices" label={t('pricing.calc.devices')} hint={t('pricing.calc.devicesHint')} value={devices} onChange={setDevices} max={2500} />
            <NumberSlider id="calc-servers" label={t('pricing.calc.servers')} value={servers} onChange={setServers} max={1500} />
            <div>
              <div className="mb-1.5 text-[13px] font-medium text-fg">{t('pricing.calc.plan')}</div>
              <div className="flex flex-wrap gap-2">
                {TIERS.map((x) => (
                  <button
                    key={x.id}
                    type="button"
                    onClick={() => setPlan(x.id)}
                    aria-pressed={activePlan === x.id}
                    className={cn(
                      'inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-[13px] font-medium transition-colors',
                      activePlan === x.id ? 'border-brand bg-brand/12 text-fg' : 'border-line text-muted hover:text-fg',
                    )}
                  >
                    {t(`pricing.tiers.${x.id}.name`)}
                    {x.id === recommended && <Badge tone="brand">{t('pricing.calc.recommended')}</Badge>}
                  </button>
                ))}
              </div>
              {activePlan === 'starter' && devices + servers > starterLimit && <p className="mt-2 text-xs text-warn">{t('pricing.calc.overLimit', { count: starterLimit })}</p>}
            </div>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-brand/30 bg-brand/8 p-6">
            <div className="lattice pointer-events-none absolute inset-0 opacity-[0.05]" aria-hidden />
            <div className="relative">
              <div className="text-sm text-muted">{t('pricing.calc.monthlyTotal')}</div>
              <div className="mt-1 text-4xl font-semibold tracking-tight text-fg tabular">{f.sar(price.monthly)}</div>
              <div className="mt-1 text-xs text-subtle tabular">
                {t('pricing.calc.breakdown', {
                  devices: f.number(devices),
                  dp: f.sar(unitPrice(tier.perDevice, billing), 1),
                  servers: f.number(servers),
                  sp: f.sar(unitPrice(tier.perServer, billing), 1),
                })}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-4">
                <div>
                  <div className="text-xs text-subtle">{t('pricing.calc.annualTotal')}</div>
                  <div className="text-lg font-semibold text-fg tabular">{f.sar(price.yearly)}</div>
                </div>
                <div>
                  <div className="text-xs text-subtle">{t('pricing.calc.plan')}</div>
                  <div className="text-lg font-semibold text-fg">{t(`pricing.tiers.${tier.id}.name`)}</div>
                </div>
              </div>
              <p className="mt-4 rounded-lg bg-ok/12 px-3 py-2 text-[12.5px] font-medium text-ok">
                {t('pricing.calc.savings', { amount: f.sar(monthlyListYear - annualPrice.yearly) })}
              </p>
              <p className="mt-3 text-[11.5px] text-subtle">{t('pricing.vatNote')}</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Comparison */}
      <Card className="mt-6">
        <CardHeader
          title={t('pricing.compare.title')}
          subtitle={t('pricing.compare.subtitle')}
          actions={<Badge tone="accent">{t('common.illustrative')}*</Badge>}
        />
        <CardBody className="space-y-6">
          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <div className="space-y-3">
              {[
                { label: t('pricing.compare.intl'), value: intlYear, cls: 'bg-unknown/60' },
                { label: t('pricing.compare.us', { plan: t(`pricing.tiers.${tier.id}.name`) }), value: ourYear, cls: 'bg-brand' },
              ].map((row) => (
                <div key={row.label}>
                  <div className="mb-1 flex justify-between gap-3 text-[13px]">
                    <span className="text-muted">{row.label}</span>
                    <span className="font-semibold text-fg tabular">{f.sar(row.value)}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-surface-3">
                    <div className={cn('h-full rounded-full transition-[width] duration-700', row.cls)} style={{ width: `${(row.value / maxBar) * 100}%` }} />
                  </div>
                </div>
              ))}
              <div className="text-[11.5px] text-subtle">{t('pricing.compare.annualCost')}</div>
            </div>
            <div className="flex flex-col items-center justify-center rounded-2xl border border-ok/30 bg-ok/10 px-6 py-4 text-center">
              <TrendingDown className="size-5 text-ok" />
              <div className="mt-1 text-xs text-muted">{t('pricing.compare.saving')}</div>
              <div className="text-2xl font-semibold text-ok tabular">{f.sar(Math.max(0, intlYear - ourYear))}</div>
              <div className="text-xs font-medium text-ok">{t('pricing.compare.savingPct', { pct: savingPct })}</div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-[13px]">
              <thead>
                <tr className="border-b border-line text-[12px] text-muted">
                  <th className="py-2 text-start font-medium" />
                  <th className="py-2 text-start font-medium">{t('pricing.compare.intl')}</th>
                  <th className="py-2 text-start font-semibold text-brand">{t('pricing.compare.us', { plan: t(`pricing.tiers.${tier.id}.name`) })}</th>
                </tr>
              </thead>
              <tbody>
                {(['currency', 'residency', 'arabic', 'support', 'logs', 'invoice'] as const).map((k) => (
                  <tr key={k} className="border-b border-line last:border-0">
                    <td className="py-2.5 pe-4 font-medium text-fg">{t(`pricing.compare.rows.${k}`)}</td>
                    <td className="py-2.5 pe-4 text-muted">{t(`pricing.compare.intlValues.${k}`)}</td>
                    <td className="py-2.5 text-fg">
                      <span className="inline-flex items-start gap-1.5">
                        <Check className="mt-0.5 size-4 shrink-0 text-brand" />
                        {t(`pricing.compare.usValues.${k}`)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11.5px] leading-relaxed text-subtle">
            {t('pricing.compare.footnote', {
              device: INTL_COMPARISON.perDeviceUsd,
              server: INTL_COMPARISON.perServerUsd,
              uplift: Math.round(INTL_COMPARISON.addOnsUplift * 100),
              fx: INTL_COMPARISON.usdToSar,
            })}
          </p>
        </CardBody>
      </Card>

      <div className="mt-8 flex flex-col items-center gap-3 text-center">
        <Button variant="accent" size="lg" leading={<Rocket className="size-4.5" />} onClick={() => openEarly(router.pathname)}>
          {t('pricing.cta')}
        </Button>
      </div>
    </div>
  );
};

PricingPage.layout = 'auto';
export default PricingPage;
