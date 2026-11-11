import { Activity, ArrowRight, Headset, Languages, Lock, MapPin, Network, ScrollText, Server, ShieldCheck, Rocket, Scale } from 'lucide-react';
import { useRouter } from 'next/router';
import { useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { HealthGauge } from '@/components/charts/HealthGauge';
import { PageTitle } from '@/components/layout/PageTitle';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Form';
import { DEVICES, SITES, healthScore, statusCounts } from '@/mock';
import { useFormat } from '@/lib/hooks';
import { useAuth } from '@/store/auth';
import { useLive } from '@/store/live';
import { useUi } from '@/store/ui';
import type { DemoPage } from './_app';

const PILLARS = [
  { key: 'residency', icon: MapPin },
  { key: 'regulatory', icon: Scale },
  { key: 'arabic', icon: Languages },
  { key: 'support', icon: Headset },
] as const;

const COVERAGE = [
  { key: 'network', icon: Network },
  { key: 'servers', icon: Server },
  { key: 'apps', icon: Activity },
  { key: 'logs', icon: ScrollText },
] as const;

function LoginCard() {
  const { t } = useTranslation();
  const router = useRouter();
  const login = useAuth((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    login(email.trim() || 'demo@example.sa');
    void router.push('/overview');
  };

  return (
    <div id="login" className="card relative overflow-hidden p-6 shadow-pop sm:p-7">
      <div className="sadu-band absolute inset-x-0 top-0 h-1.5 opacity-60" aria-hidden />
      <h2 className="text-lg font-semibold text-fg">{t('landing.login.title')}</h2>
      <p className="mt-1 text-[13px] text-muted">{t('landing.login.subtitle')}</p>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <Field label={t('landing.login.email')} htmlFor="login-email">
          <Input id="login-email" type="email" dir="ltr" className="text-start" placeholder="you@company.sa" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
        </Field>
        <Field label={t('landing.login.password')} htmlFor="login-password">
          <Input id="login-password" type="password" dir="ltr" className="text-start" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </Field>
        <Button type="submit" variant="primary" size="lg" className="w-full" trailing={<ArrowRight className="size-4 rtl:-scale-x-100" />}>
          {t('landing.login.submit')}
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            login('demo@example.sa');
            void router.push('/overview');
          }}
        >
          {t('landing.login.demo')}
        </Button>
      </form>
      <div className="mt-5 space-y-1.5 border-t border-line pt-4 text-xs text-subtle">
        <p className="flex items-center gap-1.5">
          <Lock className="size-3.5" />
          {t('landing.login.sso')}
        </p>
        <p>{t('landing.login.remember')}</p>
      </div>
    </div>
  );
}

function Glimpse() {
  const { t } = useTranslation();
  const f = useFormat();
  const episodes = useLive((s) => s.episodes);
  const alerts = useLive((s) => s.alerts);
  const score = useMemo(() => healthScore(DEVICES, episodes, alerts), [episodes, alerts]);
  const counts = useMemo(() => statusCounts(DEVICES, episodes), [episodes]);
  const active = alerts.filter((a) => a.state !== 'resolved');
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="card flex items-center gap-4 p-5">
        <HealthGauge value={score} size={92} label={t('landing.glimpse.health')} />
        <div className="text-sm font-medium text-muted">{t('landing.glimpse.health')}</div>
      </div>
      <div className="card p-5">
        <div className="text-sm font-medium text-muted">{t('landing.glimpse.devices')}</div>
        <div className="mt-2 text-3xl font-semibold text-fg tabular">{f.number(counts.total)}</div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge tone="ok">{t('status.up')} {f.number(counts.up)}</Badge>
          <Badge tone="warn">{t('status.warning')} {f.number(counts.warning)}</Badge>
          <Badge tone="crit">{t('status.down')} {f.number(counts.down)}</Badge>
        </div>
      </div>
      <div className="card p-5">
        <div className="text-sm font-medium text-muted">{t('landing.glimpse.alerts')}</div>
        <div className="mt-2 text-3xl font-semibold text-fg tabular">{f.number(active.length)}</div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge tone="crit">{t('severity.critical')} {f.number(active.filter((a) => a.severity === 'critical').length)}</Badge>
          <Badge tone="warn">{t('severity.warning')} {f.number(active.filter((a) => a.severity === 'warning').length)}</Badge>
          <Badge tone="info">{t('severity.info')} {f.number(active.filter((a) => a.severity === 'info').length)}</Badge>
        </div>
      </div>
    </div>
  );
}

const Landing: DemoPage = () => {
  const { t } = useTranslation();
  const f = useFormat();
  const openEarly = useUi((s) => s.openEarlyAccess);
  const stats = [
    { value: DEVICES.length, label: t('landing.stats.devices') },
    { value: SITES.filter((s) => s.kind !== 'datacenter').length, label: t('landing.stats.sites') },
    { value: 2, label: t('landing.stats.dataCenters') },
    { value: 90, label: t('landing.stats.history') },
  ];

  return (
    <>
      <PageTitle title={t('landing.pageTitle')} />
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="lattice pointer-events-none absolute inset-0 opacity-[0.05]" aria-hidden />
        <div
          className="pointer-events-none absolute -top-40 start-1/3 size-[640px] rounded-full opacity-25 blur-3xl"
          style={{ background: 'radial-gradient(closest-side, var(--brand), transparent)' }}
          aria-hidden
        />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-20">
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-[12.5px] font-semibold text-brand">
              <ShieldCheck className="size-4" />
              {t('app.hostedInKsa')}
            </div>
            <p className="mt-5 text-sm font-medium text-accent">{t('landing.eyebrow')}</p>
            <h1 className="mt-2 text-[30px] font-semibold leading-[1.25] tracking-tight text-fg sm:text-[40px] lg:text-[46px]">{t('landing.headline')}</h1>
            <p className="mt-5 max-w-2xl text-[15.5px] leading-relaxed text-muted">{t('landing.sub')}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button variant="accent" size="lg" onClick={() => openEarly('/')} leading={<Rocket className="size-4.5" />}>
                {t('landing.ctaPrimary')}
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => document.getElementById('login-email')?.focus()}
                trailing={<ArrowRight className="size-4 rtl:-scale-x-100" />}
              >
                {t('landing.ctaSecondary')}
              </Button>
            </div>
            <dl className="mt-10 grid max-w-xl grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label}>
                  <dt className="sr-only">{s.label}</dt>
                  <dd className="text-2xl font-semibold text-fg tabular">{f.number(s.value)}</dd>
                  <dd className="mt-0.5 text-xs text-muted">{s.label}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="animate-fade-up [animation-delay:120ms]">
            <LoginCard />
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <h2 className="text-xl font-semibold text-fg sm:text-2xl">{t('landing.pillars.title')}</h2>
        <div className="sadu-band mt-3 h-2 w-28 opacity-50" aria-hidden />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map(({ key, icon: Icon }) => (
            <div key={key} className="card p-5 transition-colors hover:border-brand/40">
              <span className="grid size-10 place-items-center rounded-xl bg-brand/12 text-brand">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-4 text-[15px] font-semibold text-fg">{t(`landing.pillars.${key}.title`)}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{t(`landing.pillars.${key}.body`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Coverage + glimpse */}
      <section className="border-y border-line bg-surface-2/60">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <h2 className="text-xl font-semibold text-fg sm:text-2xl">{t('landing.coverage.title')}</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {COVERAGE.map(({ key, icon: Icon }) => (
              <div key={key} className="flex gap-3.5 rounded-xl border border-line bg-surface p-4">
                <Icon className="mt-0.5 size-5 shrink-0 text-accent" />
                <div>
                  <h3 className="text-sm font-semibold text-fg">{t(`landing.coverage.${key}`)}</h3>
                  <p className="mt-1 text-[13px] text-muted">{t(`landing.coverage.${key}Body`)}</p>
                </div>
              </div>
            ))}
          </div>
          <h3 className="mt-12 text-sm font-semibold uppercase tracking-wider text-subtle">{t('landing.glimpse.title')}</h3>
          <div className="mt-4">
            <Glimpse />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="relative overflow-hidden rounded-2xl border border-brand/30 bg-brand/8 p-8 sm:p-10">
          <div className="lattice pointer-events-none absolute inset-0 opacity-[0.06]" aria-hidden />
          <div className="relative flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-2xl">
              <h2 className="text-xl font-semibold text-fg sm:text-2xl">{t('landing.finalCta.title')}</h2>
              <p className="mt-2 text-sm text-muted">{t('landing.finalCta.body')}</p>
            </div>
            <Button variant="accent" size="lg" onClick={() => openEarly('/#cta')} leading={<Rocket className="size-4.5" />}>
              {t('landing.finalCta.button')}
            </Button>
          </div>
        </div>
      </section>
    </>
  );
};

Landing.layout = 'public';
export default Landing;
