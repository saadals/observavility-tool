import { useRouter } from 'next/router';
import { useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/store/auth';
import { TICK_MS, useLive } from '@/store/live';
import { useSettings } from '@/store/settings';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

/** Drives the "live" feel: metrics, new alerts and log lines every few seconds. */
function LiveTicker() {
  const enabled = useSettings((s) => s.liveUpdates);
  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => {
      if (!document.hidden) useLive.getState().tick();
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [enabled]);
  return null;
}

export function AppFooter() {
  const { t } = useTranslation();
  return (
    <footer className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-4 text-[11.5px] text-subtle">
      <span>{t('footer.rights', { year: new Date().getFullYear() })}</span>
      <span>{t('workweek.label')} · {t('workweek.businessHours')}</span>
    </footer>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const user = useAuth((s) => s.user);
  const router = useRouter();

  useEffect(() => {
    if (!user) void router.replace('/');
  }, [user, router]);

  if (!user) return null;

  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-brand focus:px-3 focus:py-2 focus:text-brand-fg">
        {t('app.skipToContent')}
      </a>
      <div className="flex">
        <Sidebar />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <Topbar />
          <main id="main" className="mx-auto w-full max-w-[1680px] flex-1 px-3 py-5 sm:px-5 lg:px-7 lg:py-6">
            {children}
          </main>
          <AppFooter />
        </div>
      </div>
      <LiveTicker />
    </div>
  );
}
