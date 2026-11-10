import { Bell, LogOut, Menu, Moon, Rocket, Search, Settings, Sun } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dot, StatusDot, severityTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Popover } from '@/components/ui/Popover';
import { DEVICES, deviceStatus, getDevice } from '@/mock';
import { cn } from '@/lib/cn';
import { useAlertTitle } from '@/lib/domain';
import { useFormat } from '@/lib/hooks';
import { useAuth } from '@/store/auth';
import { useLive } from '@/store/live';
import { useSettings } from '@/store/settings';
import { useUi } from '@/store/ui';

function LiveClock() {
  const { t } = useTranslation();
  const now = useLive((s) => s.now);
  const live = useSettings((s) => s.liveUpdates);
  const f = useFormat();
  const dual = f.dualDate(now);
  return (
    <div className="hidden items-center gap-2.5 rounded-lg border border-line bg-surface-2 px-2.5 py-1 xl:flex" title={`${dual.gregorian} · ${dual.hijri}`}>
      <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-fg">
        <Dot tone={live ? 'ok' : 'neutral'} pulse={live} />
        {live ? t('header.live') : t('header.paused')}
      </span>
      <span className="h-6 w-px bg-line" aria-hidden />
      <span className="flex flex-col leading-tight">
        <span className="text-[12px] font-semibold text-fg tabular">{f.time(now)}</span>
        <span className="text-[10.5px] text-subtle">{t('header.tz')}</span>
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-[11px] text-muted">{f.date(now)}</span>
        <span className="text-[10.5px] text-subtle">{f.calendar === 'gregorian' ? f.hijriDate(now) : f.calendar === 'hijri' ? f.gregorianDate(now) : t('workweek.label')}</span>
      </span>
    </div>
  );
}

function GlobalSearch() {
  const { t } = useTranslation();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const episodes = useLive((s) => s.episodes);
  const inputRef = useRef<HTMLInputElement>(null);
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return DEVICES.filter((d) => d.hostname.toLowerCase().includes(s) || d.ip.includes(s) || d.model.toLowerCase().includes(s)).slice(0, 8);
  }, [q]);

  const go = (id: string) => {
    setQ('');
    setOpen(false);
    setMobileOpen(false);
    void router.push(`/devices/${id}/`);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        icon
        className="md:hidden"
        aria-label={t('header.search')}
        onClick={() => {
          setMobileOpen(true);
          window.setTimeout(() => inputRef.current?.focus(), 20);
        }}
      >
        <Search className="size-4.5" />
      </Button>
      <div className={cn(mobileOpen ? 'absolute inset-x-3 top-1/2 z-20 block -translate-y-1/2' : 'hidden', 'md:relative md:inset-auto md:top-auto md:block md:translate-y-0')}>
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
        <input
          ref={inputRef}
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() =>
            window.setTimeout(() => {
              setOpen(false);
              setMobileOpen(false);
            }, 150)
          }
          onKeyDown={(e) => {
            if (e.key === 'Enter' && results[0]) go(results[0].id);
            if (e.key === 'Escape') {
              setOpen(false);
              setMobileOpen(false);
            }
          }}
          placeholder={t('header.search')}
          aria-label={t('header.search')}
          className="h-9 w-full rounded-lg border border-line bg-surface-2 ps-9 pe-3 text-[13px] text-fg shadow-sm placeholder:text-subtle focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25 md:w-64 md:shadow-none lg:w-72"
        />
        {open && q && (
          <div className="absolute inset-x-0 top-full z-[70] mt-1.5 overflow-hidden rounded-xl border border-line bg-surface shadow-pop animate-slide-in">
            {results.length === 0 ? (
              <div className="px-3 py-3 text-[13px] text-muted">{t('header.searchNoResults')}</div>
            ) : (
              <ul>
                {results.map((d) => (
                  <li key={d.id}>
                    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => go(d.id)} className="flex w-full items-center gap-2.5 px-3 py-2 text-start hover:bg-surface-3">
                      <StatusDot status={deviceStatus(episodes[d.id])} />
                      <span className="ltr-text truncate text-[13px] font-medium text-fg">{d.hostname}</span>
                      <span className="ms-auto shrink-0 text-[11.5px] text-subtle">{t(`deviceTypes.${d.type}`)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function Notifications() {
  const { t } = useTranslation();
  const alerts = useLive((s) => s.alerts);
  const now = useLive((s) => s.now);
  const title = useAlertTitle();
  const f = useFormat();
  const active = useMemo(() => alerts.filter((a) => a.state === 'open'), [alerts]);
  const count = active.filter((a) => a.severity !== 'info').length;
  return (
    <Popover
      label={t('header.notifications')}
      className="w-[min(360px,calc(100vw-1.5rem))]"
      trigger={({ toggle, open }) => (
        <Button variant="ghost" size="sm" icon onClick={toggle} aria-expanded={open} aria-label={t('header.notifications')} className="relative">
          <Bell className="size-4.5" />
          {count > 0 && <span className="absolute -top-0.5 end-0 grid min-w-4 place-items-center rounded-full bg-crit px-1 text-[9.5px] font-bold leading-4 text-white tabular">{count}</span>}
        </Button>
      )}
    >
      {(close) => (
        <div>
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="text-sm font-semibold text-fg">{t('header.notifications')}</span>
            <span className="text-xs text-muted tabular">{f.number(active.length)}</span>
          </div>
          {active.length === 0 ? (
            <div className="px-4 py-8 text-center text-[13px] text-muted">{t('header.noNotifications')}</div>
          ) : (
            <ul className="max-h-80 overflow-y-auto scroll-thin">
              {active.slice(0, 7).map((a) => {
                const d = getDevice(a.deviceId);
                return (
                  <li key={a.id} className="border-b border-line last:border-0">
                    <Link href={`/devices/${a.deviceId}/`} onClick={close} className="flex gap-3 px-4 py-2.5 hover:bg-surface-3">
                      <Dot tone={severityTone[a.severity]} className="mt-1.5" pulse={a.severity === 'critical'} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-medium text-fg">{title(a)}</div>
                        <div className="mt-0.5 flex items-center gap-2 text-[11.5px] text-subtle">
                          <span className="ltr-text truncate">{d?.hostname}</span>
                          <span>·</span>
                          <span className="shrink-0">{f.relative(a.createdAt, now)}</span>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="border-t border-line p-2">
            <Link href="/alerts" onClick={close} className="block rounded-lg px-3 py-2 text-center text-[13px] font-medium text-brand hover:bg-surface-3">
              {t('header.viewAllAlerts')}
            </Link>
          </div>
        </div>
      )}
    </Popover>
  );
}

function UserMenu() {
  const { t } = useTranslation();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const router = useRouter();
  const initials = (user?.name ?? 'D U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <Popover
      label={t('header.account')}
      className="w-64"
      trigger={({ toggle, open }) => (
        <button type="button" onClick={toggle} aria-expanded={open} aria-label={t('header.account')} className="grid size-8 place-items-center rounded-full bg-brand/15 text-[11.5px] font-semibold text-brand ring-1 ring-brand/30 hover:bg-brand/25">
          {initials}
        </button>
      )}
    >
      {(close) => (
        <div className="p-1.5">
          <div className="px-3 py-2.5">
            <div className="text-[11px] text-subtle">{t('header.signedInAs')}</div>
            <div className="truncate text-sm font-semibold text-fg">{user?.name}</div>
            <div className="ltr-text truncate text-xs text-muted">{user?.email}</div>
          </div>
          <div className="my-1 h-px bg-line" />
          <Link href="/settings" onClick={close} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-fg hover:bg-surface-3">
            <Settings className="size-4 text-subtle" />
            {t('nav.settings')}
          </Link>
          <button
            type="button"
            onClick={() => {
              close();
              logout();
              void router.push('/');
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-fg hover:bg-surface-3"
          >
            <LogOut className="size-4 text-subtle rtl:-scale-x-100" />
            {t('header.logout')}
          </button>
        </div>
      )}
    </Popover>
  );
}

export function LangToggle({ className }: { className?: string }) {
  const { t } = useTranslation();
  const toggle = useSettings((s) => s.toggleLang);
  return (
    <Button variant="ghost" size="sm" onClick={toggle} aria-label={t('header.switchLanguageLabel')} className={cn('px-2.5 font-semibold', className)}>
      <span lang={t('header.switchLanguage') === 'English' ? 'en' : 'ar'}>{t('header.switchLanguage')}</span>
    </Button>
  );
}

export function ThemeToggle() {
  const { t } = useTranslation();
  const theme = useSettings((s) => s.theme);
  const toggle = useSettings((s) => s.toggleTheme);
  return (
    <Button variant="ghost" size="sm" icon onClick={toggle} aria-label={t('header.toggleTheme')} title={theme === 'dark' ? t('header.themeLight') : t('header.themeDark')}>
      {theme === 'dark' ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
    </Button>
  );
}

export function Topbar() {
  const { t } = useTranslation();
  const setMobile = useUi((s) => s.setMobileNav);
  const openEarly = useUi((s) => s.openEarlyAccess);
  const router = useRouter();
  return (
    <header className="sticky top-0 z-40 flex h-15 items-center gap-2 border-b border-line bg-surface/85 px-3 backdrop-blur-md sm:gap-3 sm:px-5">
      <Button variant="ghost" size="sm" icon onClick={() => setMobile(true)} aria-label={t('nav.openMenu')} className="lg:hidden">
        <Menu className="size-5" />
      </Button>
      <GlobalSearch />
      <div className="ms-auto flex items-center gap-1.5 sm:gap-2">
        <LiveClock />
        <Button variant="accent" size="sm" onClick={() => openEarly(router.pathname)} leading={<Rocket className="size-4" />} className="hidden sm:inline-flex">
          {t('header.earlyAccess')}
        </Button>
        <Button variant="accent" size="sm" icon onClick={() => openEarly(router.pathname)} aria-label={t('header.earlyAccess')} className="sm:hidden">
          <Rocket className="size-4" />
        </Button>
        <Notifications />
        <LangToggle />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
