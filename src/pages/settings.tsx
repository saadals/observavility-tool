import { Mail, MessageSquare, Moon, RotateCcw, Send, ShieldCheck, Smartphone, Sun, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { PageTitle } from '@/components/layout/PageTitle';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, PageHeader } from '@/components/ui/Card';
import { Field, Input, Segmented, Toggle } from '@/components/ui/Form';
import { cn } from '@/lib/cn';
import { useFormat } from '@/lib/hooks';
import { useLive } from '@/store/live';
import { NOTIFY_CHANNELS, useSettings, type CalendarPref, type ClockPref, type Lang, type NotifyChannel, type Theme } from '@/store/settings';
import { toast } from '@/store/ui';

const CHANNEL_ICON: Record<NotifyChannel, LucideIcon> = { email: Mail, sms: Smartphone, whatsapp: MessageSquare, chatops: MessageSquare };

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-b border-line py-4 first:pt-0 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <div className="text-sm font-medium text-fg">{label}</div>
        {hint && <div className="mt-0.5 text-xs text-muted">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const f = useFormat();
  const s = useSettings();
  const now = useLive((st) => st.now);
  const reset = useLive((st) => st.reset);

  const sendTest = () => {
    const enabled = NOTIFY_CHANNELS.filter((c) => s.notifications[c]);
    if (!enabled.length) {
      toast({ kind: 'warning', title: t('settings.notifications.noneEnabled') });
      return;
    }
    const list = new Intl.ListFormat(i18n.language, { type: 'conjunction' }).format(enabled.map((c) => t(`channels.${c}`)));
    toast({ kind: 'success', title: t('settings.notifications.testSent'), body: t('settings.notifications.testSentBody', { channels: list }) });
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageTitle title={t('nav.settings')} />
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />
      <div className="space-y-4">
        <Card>
          <CardHeader title={t('settings.region.title')} />
          <CardBody>
            <Row label={t('settings.region.language')}>
              <Segmented<Lang>
                label={t('settings.region.language')}
                value={s.lang}
                onChange={s.setLang}
                options={[
                  { value: 'ar', label: <span lang="ar">العربية</span> },
                  { value: 'en', label: <span lang="en">English</span> },
                ]}
              />
            </Row>
            <Row label={t('settings.region.dateFormat')} hint={`${t('settings.region.dateFormatHint')} ${t('settings.region.example', { date: f.date(now, 'long') })}`}>
              <Segmented<CalendarPref>
                label={t('settings.region.dateFormat')}
                value={s.calendar}
                onChange={s.setCalendar}
                options={(['gregorian', 'hijri', 'both'] as const).map((c) => ({ value: c, label: t(`calendar.${c}`) }))}
              />
            </Row>
            <Row label={t('settings.region.clock')} hint={f.time(now)}>
              <Segmented<ClockPref>
                label={t('settings.region.clock')}
                value={s.clock}
                onChange={s.setClock}
                options={[
                  { value: '24h', label: t('settings.region.clock24') },
                  { value: '12h', label: t('settings.region.clock12') },
                ]}
              />
            </Row>
            <Row label={t('settings.region.timezone')}>
              <Badge tone="neutral">{t('settings.region.timezoneValue')}</Badge>
            </Row>
            <Row label={t('settings.region.workweek')}>
              <Badge tone="neutral">{t('settings.region.workweekValue')}</Badge>
            </Row>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t('settings.appearance.title')} />
          <CardBody>
            <Row label={t('settings.appearance.theme')}>
              <div className="flex gap-2">
                {(['dark', 'light'] as Theme[]).map((th) => (
                  <button
                    key={th}
                    type="button"
                    onClick={() => s.setTheme(th)}
                    aria-pressed={s.theme === th}
                    className={cn(
                      'flex items-center gap-2 rounded-xl border px-3 py-2 text-[13px] font-medium transition-colors',
                      s.theme === th ? 'border-brand bg-brand/10 text-fg' : 'border-line text-muted hover:text-fg',
                    )}
                  >
                    <span className={cn('grid size-7 place-items-center rounded-lg', th === 'dark' ? 'bg-[#061013] text-[#46d3c3]' : 'bg-[#f2f5f5] text-[#0d877d] ring-1 ring-[#dbe4e6]')}>
                      {th === 'dark' ? <Moon className="size-4" /> : <Sun className="size-4" />}
                    </span>
                    {t(`settings.appearance.${th}`)}
                  </button>
                ))}
              </div>
            </Row>
            <Row label={t('settings.appearance.compactSidebar')} hint={t('settings.appearance.compactSidebarHint')}>
              <Toggle checked={s.sidebarCollapsed} onChange={s.setSidebarCollapsed} />
            </Row>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title={t('settings.notifications.title')}
            subtitle={t('settings.notifications.subtitle')}
            actions={
              <Button size="sm" variant="outline" leading={<Send className="size-4 rtl:-scale-x-100" />} onClick={sendTest}>
                {t('settings.notifications.test')}
              </Button>
            }
          />
          <CardBody>
            <div className="grid gap-3 sm:grid-cols-2">
              {NOTIFY_CHANNELS.map((c) => {
                const Icon = CHANNEL_ICON[c];
                return (
                  <div key={c} className={cn('rounded-xl border p-4 transition-colors', s.notifications[c] ? 'border-brand/40 bg-brand/5' : 'border-line')}>
                    <div className="flex items-start gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-3 text-muted">
                        <Icon className="size-4.5" />
                      </span>
                      <Toggle className="flex-1" checked={s.notifications[c]} onChange={(v) => s.setNotification(c, v)} label={t(`settings.notifications.${c}`)} description={t(`settings.notifications.${c}Hint`)} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <Field label={t('settings.notifications.emailAddress')} htmlFor="set-email">
                <Input id="set-email" type="email" dir="ltr" className="text-start" value={s.contacts.email} onChange={(e) => s.setContact('email', e.target.value)} />
              </Field>
              <Field label={t('settings.notifications.phone')} htmlFor="set-phone">
                <Input id="set-phone" type="tel" dir="ltr" className="text-start" value={s.contacts.phone} onChange={(e) => s.setContact('phone', e.target.value)} />
              </Field>
              <Field label={t('settings.notifications.webhook')} htmlFor="set-webhook">
                <Input id="set-webhook" type="url" dir="ltr" className="text-start" placeholder={t('settings.notifications.webhookPlaceholder')} value={s.contacts.webhook} onChange={(e) => s.setContact('webhook', e.target.value)} />
              </Field>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t('settings.data.title')} />
          <CardBody>
            <Row label={t('settings.data.live')} hint={t('settings.data.liveHint')}>
              <Toggle checked={s.liveUpdates} onChange={s.setLiveUpdates} />
            </Row>
            <Row label={t('settings.data.residency')}>
              <Badge tone="brand" icon={<ShieldCheck className="size-3.5" />}>
                {t('settings.data.residencyValue')}
              </Badge>
            </Row>
            <Row label={t('settings.data.reset')} hint={t('settings.data.resetHint')}>
              <Button
                size="sm"
                variant="outline"
                leading={<RotateCcw className="size-4" />}
                onClick={() => {
                  reset();
                  toast({ kind: 'success', title: t('toasts.demoReset') });
                }}
              >
                {t('settings.data.reset')}
              </Button>
            </Row>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
