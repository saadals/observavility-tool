import { ArrowRight, Rocket } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Logo } from '@/components/brand/Logo';
import { Button, ButtonLink } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { useAuth } from '@/store/auth';
import { useUi } from '@/store/ui';
import { LangToggle, ThemeToggle } from './Topbar';

const LINKS = [
  { href: '/pricing', key: 'nav.pricing' },
  { href: '/compliance', key: 'nav.compliance' },
];

export function PublicLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const openEarly = useUi((s) => s.openEarlyAccess);
  const path = router.pathname;
  return (
    <div className="flex min-h-screen flex-col">
      <div className="sticky top-0 z-[60]">
        <header className="border-b border-line bg-bg/85 backdrop-blur-md">
          <div className="mx-auto flex h-15 max-w-7xl items-center gap-3 px-4 sm:px-6">
            <Link href="/" aria-label="Home">
              <Logo />
            </Link>
            <nav className="ms-4 hidden items-center gap-1 md:flex" aria-label="Public">
              {LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn('rounded-lg px-3 py-1.5 text-[13.5px] font-medium transition-colors', path === l.href ? 'bg-surface-3 text-fg' : 'text-muted hover:text-fg')}
                >
                  {t(l.key)}
                </Link>
              ))}
            </nav>
            <div className="ms-auto flex items-center gap-1.5">
              <LangToggle />
              <ThemeToggle />
              {user ? (
                <ButtonLink href="/overview" variant="outline" size="sm" trailing={<ArrowRight className="size-4 rtl:-scale-x-100" />} className="hidden sm:inline-flex">
                  {t('nav.overview')}
                </ButtonLink>
              ) : (
                path !== '/' && (
                  <ButtonLink href="/" variant="outline" size="sm" className="hidden sm:inline-flex">
                    {t('nav.signIn')}
                  </ButtonLink>
                )
              )}
              <Button variant="accent" size="sm" onClick={() => openEarly(path)} leading={<Rocket className="size-4" />}>
                <span className="hidden sm:inline">{t('header.earlyAccess')}</span>
                <span className="sm:hidden">{t('header.earlyAccessShort')}</span>
              </Button>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-4 pb-2 md:hidden" aria-label="Public">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className={cn('shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-medium', path === l.href ? 'bg-surface-3 text-fg' : 'text-muted')}>
                {t(l.key)}
              </Link>
            ))}
          </nav>
        </header>
      </div>
      <main id="main" className="flex-1">
        {children}
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-subtle sm:px-6">
          <span>{t('footer.rights', { year: new Date().getFullYear() })}</span>
          <span>{t('footer.privacy')}</span>
        </div>
      </footer>
    </div>
  );
}
