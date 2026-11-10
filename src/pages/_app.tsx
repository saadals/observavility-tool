import '@/styles/globals.css';
import '@fontsource-variable/inter';
import '@fontsource/ibm-plex-sans-arabic/400.css';
import '@fontsource/ibm-plex-sans-arabic/500.css';
import '@fontsource/ibm-plex-sans-arabic/600.css';
import '@fontsource/ibm-plex-sans-arabic/700.css';
import '@xyflow/react/dist/style.css';
import '@/i18n';

import type { NextPage } from 'next';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { LogoMark } from '@/components/brand/Logo';
import { AppShell } from '@/components/layout/AppShell';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { EarlyAccessModal } from '@/components/leads/EarlyAccessModal';
import { Toaster } from '@/components/ui/Toaster';
import { applyLanguage } from '@/i18n';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';

/**
 * Page layout options:
 *  - 'app'    → authenticated console (sidebar + topbar). Redirects to the landing page when signed out.
 *  - 'public' → marketing layout.
 *  - 'auto'   → console when signed in, marketing layout otherwise (pricing, data residency).
 */
export type PageLayout = 'app' | 'public' | 'auto';
export type DemoPage<P = object> = NextPage<P> & { layout?: PageLayout };

/** Neutral splash: identical on the server and the first client render, so hydration never mismatches. */
function Splash() {
  return (
    <div className="grid min-h-screen place-items-center bg-bg">
      <div className="flex flex-col items-center gap-4">
        <LogoMark className="size-12 animate-pulse" />
        <div className="h-1 w-24 overflow-hidden rounded-full bg-surface-3">
          <div className="skeleton h-full w-full" />
        </div>
      </div>
    </div>
  );
}

function Shell({ layout, children }: { layout: PageLayout; children: ReactNode }) {
  const user = useAuth((s) => s.user);
  if (layout === 'public') return <PublicLayout>{children}</PublicLayout>;
  if (layout === 'auto' && !user) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">{children}</div>
      </PublicLayout>
    );
  }
  return <AppShell>{children}</AppShell>;
}

const noopSubscribe = () => () => {};

export default function App({ Component, pageProps }: AppProps & { Component: DemoPage }) {
  // false on the server and during hydration, true afterwards — no setState-in-effect needed.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const lang = useSettings((s) => s.lang);
  const theme = useSettings((s) => s.theme);

  useEffect(() => {
    applyLanguage(lang);
  }, [lang]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <title>Demo</title>
      </Head>
      {mounted ? (
        <>
          <Shell layout={Component.layout ?? 'app'}>
            <Component {...pageProps} />
          </Shell>
          <EarlyAccessModal />
          <Toaster />
        </>
      ) : (
        <Splash />
      )}
    </>
  );
}
