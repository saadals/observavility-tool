import { ArrowLeft, FlaskConical, Mail, MessageSquare, Pencil, Plus, RotateCcw, Smartphone, Trash2, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageTitle } from '@/components/layout/PageTitle';
import { Badge, SeverityBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Card';
import { EmptyState, SkeletonRows } from '@/components/ui/Feedback';
import { ChipToggle, Field, Input, Segmented, Select, Toggle } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import { ALERT_SEVERITIES, DAY, DEVICES, DEVICE_TYPES, HOUR, SITES, isWeekendAst, astParts, metricValue, type AlertSeverity, type Device, type MetricKey } from '@/mock';
import { useFormat, useSimulatedLoading } from '@/lib/hooks';
import { useLive } from '@/store/live';
import { RULE_METRICS, RULE_OPERATORS, useRules, type AlertRule, type RuleMetric, type RuleOperator, type RuleScope } from '@/store/rules';
import { NOTIFY_CHANNELS, type NotifyChannel } from '@/store/settings';
import { toast } from '@/store/ui';

const CHANNEL_ICON: Record<NotifyChannel, LucideIcon> = { email: Mail, sms: Smartphone, whatsapp: MessageSquare, chatops: MessageSquare };
const UNIT: Record<RuleMetric, string> = { cpu: '%', mem: '%', disk: '%', latency: ' ms', loss: '%', temp: '°C', bwUtil: '%', battery: '%', status: '' };
const DEFAULTS: Record<RuleMetric, number> = { cpu: 85, mem: 90, disk: 90, latency: 40, loss: 1, temp: 65, bwUtil: 80, battery: 95, status: 0 };

function inScope(rule: Pick<AlertRule, 'scope' | 'scopeValue'>, d: Device) {
  if (rule.scope === 'site') return d.siteId === rule.scopeValue;
  if (rule.scope === 'type') return d.type === rule.scopeValue;
  return true;
}

function supports(metric: RuleMetric, d: Device) {
  if (metric === 'status') return true;
  if (metric === 'bwUtil') return d.metrics.includes('bwIn');
  return d.metrics.includes(metric as MetricKey);
}

function compare(op: RuleOperator, v: number, th: number) {
  return op === 'gt' ? v > th : op === 'gte' ? v >= th : op === 'lt' ? v < th : v <= th;
}

/** Hourly backtest over the last 7 days: counts threshold crossings (rising edges). */
function backtest(rule: AlertRule, now: number): number {
  if (rule.metric === 'status') return 0;
  const devs = DEVICES.filter((d) => inScope(rule, d) && supports(rule.metric, d)).slice(0, 40);
  let fired = 0;
  for (const d of devs) {
    let prev = false;
    for (let t = now - 7 * DAY; t <= now; t += HOUR) {
      if (rule.businessHoursOnly) {
        const h = astParts(t).hour;
        if (isWeekendAst(t) || h < 8 || h >= 17) {
          prev = false;
          continue;
        }
      }
      const v = rule.metric === 'bwUtil' ? ((metricValue(d, 'bwIn', t) ?? 0) / d.capacityMbps) * 100 : metricValue(d, rule.metric as MetricKey, t);
      const hit = v !== null && compare(rule.operator, v, rule.threshold);
      if (hit && !prev) fired++;
      prev = hit;
    }
  }
  return fired;
}

function useRuleText() {
  const { t, i18n } = useTranslation();
  const f = useFormat();
  const list = (items: string[]) => (items.length ? new Intl.ListFormat(i18n.language, { type: 'conjunction' }).format(items) : t('rules.noChannels'));
  const scopeText = (r: Pick<AlertRule, 'scope' | 'scopeValue'>) => {
    if (r.scope === 'site') return t('rules.scopeSite', { value: t(`sites.${r.scopeValue}`) });
    if (r.scope === 'type') {
      const v = t(`deviceTypes.${r.scopeValue}`);
      return t('rules.scopeType', { value: i18n.language === 'en' ? v.toLowerCase() : v });
    }
    return t('rules.scopeAll');
  };
  const value = (r: Pick<AlertRule, 'metric' | 'threshold'>) => f.unit(r.threshold, UNIT[r.metric], 1);
  return {
    name: (r: AlertRule) => (r.nameKey ? t(r.nameKey) : r.name),
    condition: (r: AlertRule) =>
      r.metric === 'status'
        ? t('rules.conditionStatus', { duration: f.number(r.durationMin) })
        : t('rules.condition', { metric: t(`rules.metrics.${r.metric}`), op: t(`rules.operators.${r.operator}`), value: value(r), duration: f.number(r.durationMin) }),
    scope: (r: AlertRule) => (r.scope === 'all' ? t('rules.scope.all') : r.scope === 'site' ? t(`sites.${r.scopeValue}`) : t(`deviceTypes.${r.scopeValue}`)),
    sentence: (r: AlertRule) => {
      const base = {
        metric: t(`rules.metrics.${r.metric}`),
        op: t(`rules.operators.${r.operator}`),
        value: value(r),
        duration: f.number(r.durationMin),
        scope: scopeText(r),
        severity: t(`severity.${r.severity}`),
        channels: list(r.channels.map((c) => t(`channels.${c}`))),
      };
      const s = r.metric === 'status' ? t('rules.sentenceStatus', base) : t('rules.sentence', base);
      return r.businessHoursOnly ? `${s} ${t('rules.sentenceBh')}` : s;
    },
  };
}

function emptyRule(): AlertRule {
  return {
    id: `r-${Date.now().toString(36)}`,
    name: '',
    metric: 'cpu',
    operator: 'gt',
    threshold: 85,
    durationMin: 5,
    severity: 'warning',
    scope: 'all',
    scopeValue: '',
    channels: ['email'],
    businessHoursOnly: false,
    enabled: true,
    createdAt: Date.now(),
  };
}

function RuleBuilder({ initial, onClose }: { initial: AlertRule; onClose: () => void }) {
  const { t } = useTranslation();
  const text = useRuleText();
  const upsert = useRules((s) => s.upsert);
  const now = useLive((s) => s.now);
  const [rule, setRule] = useState<AlertRule>(initial);
  const [error, setError] = useState('');
  const set = <K extends keyof AlertRule>(k: K, v: AlertRule[K]) => setRule((r) => ({ ...r, [k]: v }));
  const hour = Math.floor(now / HOUR);
  const matches = DEVICES.filter((d) => inScope(rule, d) && supports(rule.metric, d)).length;
  const fired = useMemo(() => backtest(rule, hour * HOUR), [rule, hour]);

  const save = () => {
    const name = rule.nameKey ? rule.name : rule.name.trim();
    if (!rule.nameKey && !name) {
      setError(t('rules.builder.required'));
      return;
    }
    upsert({ ...rule, name });
    toast({ kind: 'success', title: t('rules.saved') });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={initial.name || initial.nameKey ? t('rules.editRule') : t('rules.newRule')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('actions.cancel')}
          </Button>
          <Button variant="primary" onClick={save}>
            {t('rules.builder.save')}
          </Button>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <div className="space-y-5">
          <Field label={t('rules.builder.name')} required error={error} htmlFor="rule-name">
            <Input
              id="rule-name"
              value={rule.nameKey ? t(rule.nameKey) : rule.name}
              onChange={(e) => {
                setError('');
                setRule((r) => ({ ...r, name: e.target.value, nameKey: undefined }));
              }}
              placeholder={t('rules.builder.namePlaceholder')}
              invalid={!!error}
            />
          </Field>

          <fieldset className="rounded-xl border border-line p-4">
            <legend className="px-1.5 text-xs font-semibold uppercase tracking-wide text-brand">{t('rules.builder.when')}</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t('rules.builder.metric')} htmlFor="rule-metric">
                <Select
                  id="rule-metric"
                  value={rule.metric}
                  onChange={(e) => {
                    const m = e.target.value as RuleMetric;
                    setRule((r) => ({ ...r, metric: m, threshold: DEFAULTS[m], operator: m === 'battery' ? 'lt' : r.operator === 'lt' || r.operator === 'lte' ? 'gt' : r.operator }));
                  }}
                >
                  {RULE_METRICS.map((m) => (
                    <option key={m} value={m}>
                      {t(`rules.metrics.${m}`)}
                    </option>
                  ))}
                </Select>
              </Field>
              {rule.metric !== 'status' && (
                <Field label={t('rules.builder.operator')} htmlFor="rule-op">
                  <Select id="rule-op" value={rule.operator} onChange={(e) => set('operator', e.target.value as RuleOperator)}>
                    {RULE_OPERATORS.map((o) => (
                      <option key={o} value={o}>
                        {t(`rules.operators.${o}`)}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
              {rule.metric !== 'status' && (
                <Field label={`${t('rules.builder.threshold')} (${UNIT[rule.metric].trim()})`} htmlFor="rule-th">
                  <Input id="rule-th" type="number" step="any" value={rule.threshold} onChange={(e) => set('threshold', Number(e.target.value))} />
                </Field>
              )}
              <Field label={t('rules.builder.duration')} htmlFor="rule-dur">
                <Input id="rule-dur" type="number" min={1} value={rule.durationMin} onChange={(e) => set('durationMin', Math.max(1, Number(e.target.value)))} />
              </Field>
              <Field label={t('rules.builder.scope')} htmlFor="rule-scope">
                <Select
                  id="rule-scope"
                  value={rule.scope}
                  onChange={(e) => {
                    const sc = e.target.value as RuleScope;
                    setRule((r) => ({ ...r, scope: sc, scopeValue: sc === 'site' ? (SITES[0]?.id ?? '') : sc === 'type' ? 'server' : '' }));
                  }}
                >
                  {(['all', 'site', 'type'] as const).map((s) => (
                    <option key={s} value={s}>
                      {t(`rules.scope.${s}`)}
                    </option>
                  ))}
                </Select>
              </Field>
              {rule.scope !== 'all' && (
                <Field label={t('rules.builder.scopeValue')} htmlFor="rule-scope-val">
                  <Select id="rule-scope-val" value={rule.scopeValue} onChange={(e) => set('scopeValue', e.target.value)}>
                    {rule.scope === 'site'
                      ? SITES.map((s) => (
                          <option key={s.id} value={s.id}>
                            {t(`sites.${s.id}`)}
                          </option>
                        ))
                      : DEVICE_TYPES.map((ty) => (
                          <option key={ty} value={ty}>
                            {t(`deviceTypes.${ty}`)}
                          </option>
                        ))}
                  </Select>
                </Field>
              )}
            </div>
          </fieldset>

          <fieldset className="rounded-xl border border-line p-4">
            <legend className="px-1.5 text-xs font-semibold uppercase tracking-wide text-brand">{t('rules.builder.then')}</legend>
            <div className="space-y-4">
              <div>
                <div className="mb-1.5 text-[13px] font-medium text-fg">{t('rules.builder.severity')}</div>
                <Segmented<AlertSeverity>
                  label={t('rules.builder.severity')}
                  value={rule.severity}
                  onChange={(v) => set('severity', v)}
                  options={ALERT_SEVERITIES.map((s) => ({ value: s, label: t(`severity.${s}`) }))}
                />
              </div>
              <div>
                <div className="mb-1.5 text-[13px] font-medium text-fg">{t('rules.builder.channels')}</div>
                <div className="flex flex-wrap gap-2">
                  {NOTIFY_CHANNELS.map((c) => {
                    const Icon = CHANNEL_ICON[c];
                    const on = rule.channels.includes(c);
                    return (
                      <ChipToggle key={c} active={on} onClick={() => set('channels', on ? rule.channels.filter((x) => x !== c) : [...rule.channels, c])}>
                        <Icon className="size-3.5" />
                        {t(`channels.${c}`)}
                      </ChipToggle>
                    );
                  })}
                </div>
              </div>
              <Toggle checked={rule.businessHoursOnly} onChange={(v) => set('businessHoursOnly', v)} label={t('rules.builder.businessHours')} />
            </div>
          </fieldset>
        </div>

        <div className="lg:sticky lg:top-0 lg:self-start">
          <div className="relative overflow-hidden rounded-xl border border-brand/30 bg-brand/6 p-4">
            <div className="lattice pointer-events-none absolute inset-0 opacity-[0.05]" aria-hidden />
            <div className="relative">
              <div className="text-xs font-semibold uppercase tracking-wide text-brand">{t('rules.builder.preview')}</div>
              <div className="mt-2 text-[15px] font-semibold text-fg">{rule.nameKey ? t(rule.nameKey) : rule.name || t('rules.builder.namePlaceholder')}</div>
              <p className="mt-2 text-[13.5px] leading-relaxed text-fg">{text.sentence(rule)}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <SeverityBadge severity={rule.severity} />
                <Badge tone="neutral">{t('rules.builder.matches', { count: matches })}</Badge>
              </div>
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-line bg-surface p-3 text-[12.5px] text-muted">
                <FlaskConical className="mt-0.5 size-4 shrink-0 text-accent" />
                <span>{fired > 0 ? t('rules.builder.backtest', { count: fired }) : t('rules.builder.backtestNone')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function RulesPage() {
  const { t } = useTranslation();
  const text = useRuleText();
  const loading = useSimulatedLoading(300);
  const rules = useRules((s) => s.rules);
  const toggle = useRules((s) => s.toggle);
  const remove = useRules((s) => s.remove);
  const resetDefaults = useRules((s) => s.resetDefaults);
  const [editing, setEditing] = useState<AlertRule | null>(null);
  const [deleting, setDeleting] = useState<AlertRule | null>(null);

  return (
    <>
      <PageTitle title={t('nav.rules')} />
      <Link href="/alerts" className="mb-3 inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-fg">
        <ArrowLeft className="size-4 rtl:-scale-x-100" />
        {t('nav.alerts')}
      </Link>
      <PageHeader
        title={t('rules.title')}
        subtitle={t('rules.subtitle')}
        actions={
          <>
            <Button variant="ghost" size="sm" leading={<RotateCcw className="size-4" />} onClick={resetDefaults}>
              {t('rules.resetDefaults')}
            </Button>
            <Button variant="primary" size="sm" leading={<Plus className="size-4" />} onClick={() => setEditing(emptyRule())}>
              {t('rules.newRule')}
            </Button>
          </>
        }
      />
      <Card>
        {loading ? (
          <div className="p-5">
            <SkeletonRows rows={6} />
          </div>
        ) : rules.length === 0 ? (
          <EmptyState
            title={t('rules.emptyTitle')}
            body={t('rules.emptyBody')}
            action={
              <Button variant="primary" size="sm" onClick={() => setEditing(emptyRule())}>
                {t('rules.newRule')}
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-[13px]">
              <thead className="border-b border-line bg-surface-2 text-[11.5px] text-muted">
                <tr>
                  <th className="w-20 px-5 py-2.5 text-start font-medium">{t('rules.col.enabled')}</th>
                  <th className="px-3 py-2.5 text-start font-medium">{t('rules.col.name')}</th>
                  <th className="px-3 py-2.5 text-start font-medium">{t('rules.col.scope')}</th>
                  <th className="px-3 py-2.5 text-start font-medium">{t('rules.col.severity')}</th>
                  <th className="px-3 py-2.5 text-start font-medium">{t('rules.col.channels')}</th>
                  <th className="px-5 py-2.5 text-end font-medium">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => (
                  <tr key={r.id} className={r.enabled ? 'border-b border-line last:border-0' : 'border-b border-line opacity-55 last:border-0'}>
                    <td className="px-5 py-3">
                      <Toggle checked={r.enabled} onChange={() => toggle(r.id)} />
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-semibold text-fg">{text.name(r)}</div>
                      <div className="mt-0.5 text-xs text-muted">
                        {text.condition(r)}
                        {r.businessHoursOnly && (
                          <Badge tone="accent" className="ms-2">
                            {t('rules.businessHoursBadge')}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-muted">{text.scope(r)}</td>
                    <td className="px-3 py-3">
                      <SeverityBadge severity={r.severity} />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {r.channels.map((c) => (
                          <Badge key={c} tone="neutral">
                            {t(`channels.${c}`)}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" icon onClick={() => setEditing(r)} aria-label={t('actions.edit')} title={t('actions.edit')}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button size="sm" variant="ghost" icon onClick={() => setDeleting(r)} aria-label={t('actions.delete')} title={t('actions.delete')} className="hover:text-crit">
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {editing && <RuleBuilder initial={editing} onClose={() => setEditing(null)} />}
      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        size="sm"
        title={t('rules.deleteTitle')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              {t('actions.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (deleting) remove(deleting.id);
                toast({ kind: 'info', title: t('rules.deleted') });
                setDeleting(null);
              }}
            >
              {t('actions.delete')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">{deleting ? t('rules.deleteBody', { name: text.name(deleting) }) : ''}</p>
      </Modal>
    </>
  );
}
