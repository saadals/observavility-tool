import { PanelLeftClose, PanelLeftOpen, ShieldCheck, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Logo, LogoMark } from '@/components/brand/Logo';
import { cn } from '@/lib/cn';
import { useLive } from '@/store/live';
import { useSettings } from '@/store/settings';
import { useUi } from '@/store/ui';
import { NAV, isActivePath } from './nav';

function NavLinks({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { t } = useTranslation();
  const router = useRouter();
  const openAlerts = useLive((s) => s.alerts.filter((a) => a.state === 'open' && a.severity !== 'info').length);
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4 scroll-thin" aria-label="Main">
      {NAV.map((group) => (
        <div key={group.labelKey}>
          {!collapsed && <div className="mb-1.5 px-2.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-subtle">{t(group.labelKey)}</div>}
          {collapsed && <div className="mx-auto mb-2 h-px w-6 bg-line" aria-hidden />}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActivePath(router.asPath.split('?')[0] ?? '', item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    title={collapsed ? t(item.labelKey) : undefined}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'group relative flex h-9 items-center gap-3 rounded-lg px-2.5 text-[13.5px] font-medium transition-colors',
                      active ? 'bg-brand/12 text-fg' : 'text-muted hover:bg-surface-3 hover:text-fg',
                      collapsed && 'justify-center px-0',
                    )}
                  >
                    {active && <span className="absolute inset-y-1.5 start-0 w-[3px] rounded-full bg-brand" aria-hidden />}
                    <Icon className={cn('size-[18px] shrink-0', active ? 'text-brand' : 'text-subtle group-hover:text-muted')} />
                    {!collapsed && <span className="truncate">{t(item.labelKey)}</span>}
                    {item.badge === 'alerts' && openAlerts > 0 && (
                      <span
                        className={cn(
                          'grid min-w-5 place-items-center rounded-full bg-crit px-1.5 text-[10.5px] font-semibold leading-5 text-white tabular',
                          collapsed ? 'absolute -top-1 end-0.5 min-w-4 px-1 text-[9px] leading-4' : 'ms-auto',
                        )}
                      >
                        {openAlerts}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function ResidencyCard({ collapsed }: { collapsed: boolean }) {
  const { t } = useTranslation();
  if (collapsed) {
    return (
      <Link href="/compliance" className="mx-auto mb-4 grid size-9 place-items-center rounded-lg bg-brand/12 text-brand" title={t('app.hostedInKsa')}>
        <ShieldCheck className="size-4.5" />
      </Link>
    );
  }
  return (
    <Link href="/compliance" className="mx-3 mb-3 block rounded-xl border border-line bg-surface-2 p-3 transition-colors hover:border-brand/40">
      <div className="flex items-center gap-2 text-[12.5px] font-semibold text-fg">
        <ShieldCheck className="size-4 text-brand" />
        {t('app.hostedInKsa')}
      </div>
      <div className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-muted">
        <span className="size-1.5 rounded-full bg-ok" />
        {t('sites.ruh-dc1')}
        <span className="text-subtle">·</span>
        <span className="size-1.5 rounded-full bg-ok" />
        {t('sites.jed-dc2')}
      </div>
      <div className="sadu-band mt-2.5 h-1.5 opacity-40" aria-hidden />
    </Link>
  );
}

export function Sidebar() {
  const { t } = useTranslation();
  const collapsed = useSettings((s) => s.sidebarCollapsed);
  const setCollapsed = useSettings((s) => s.setSidebarCollapsed);
  const mobileOpen = useUi((s) => s.mobileNavOpen);
  const setMobile = useUi((s) => s.setMobileNav);
  const router = useRouter();

  useEffect(() => {
    const close = () => setMobile(false);
    router.events.on('routeChangeStart', close);
    return () => router.events.off('routeChangeStart', close);
  }, [router.events, setMobile]);

  return (
    <>
      {/* Desktop */}
      <aside
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 flex-col border-e border-line bg-surface transition-[width] duration-200 lg:flex',
          collapsed ? 'w-[68px]' : 'w-[244px]',
        )}
      >
        <div className={cn('flex h-15 items-center border-b border-line', collapsed ? 'justify-center' : 'justify-between px-4')}>
          <Link href="/overview" aria-label="Home">
            {collapsed ? <LogoMark className="size-8" /> : <Logo />}
          </Link>
          {!collapsed && (
            <button type="button" onClick={() => setCollapsed(true)} className="grid size-7 place-items-center rounded-md text-subtle hover:bg-surface-3 hover:text-fg" aria-label={t('nav.collapse')} title={t('nav.collapse')}>
              <PanelLeftClose className="size-4 rtl:-scale-x-100" />
            </button>
          )}
        </div>
        <NavLinks collapsed={collapsed} />
        {collapsed && (
          <button type="button" onClick={() => setCollapsed(false)} className="mx-auto mb-3 grid size-8 place-items-center rounded-md text-subtle hover:bg-surface-3 hover:text-fg" aria-label={t('nav.expand')} title={t('nav.expand')}>
            <PanelLeftOpen className="size-4 rtl:-scale-x-100" />
          </button>
        )}
        <ResidencyCard collapsed={collapsed} />
      </aside>

      {/* Mobile / tablet drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[75] lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/55 animate-fade-in" onClick={() => setMobile(false)} aria-hidden />
          <aside className="absolute inset-y-0 start-0 flex w-[272px] max-w-[85vw] flex-col border-e border-line bg-surface shadow-pop animate-fade-in">
            <div className="flex h-15 items-center justify-between border-b border-line px-4">
              <Logo />
              <button type="button" onClick={() => setMobile(false)} className="grid size-8 place-items-center rounded-md text-muted hover:bg-surface-3" aria-label={t('nav.closeMenu')}>
                <X className="size-4" />
              </button>
            </div>
            <NavLinks collapsed={false} onNavigate={() => setMobile(false)} />
            <ResidencyCard collapsed={false} />
          </aside>
        </div>
      )}
    </>
  );
}
