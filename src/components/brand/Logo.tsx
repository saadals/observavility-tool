import { useTranslation } from 'react-i18next';
import { BRAND } from '@/config/brand';
import { cn } from '@/lib/cn';

/**
 * Original brand mark: a watchful "lens" — a rounded square holding an observer dot
 * with two signal arcs. Deliberately abstract (no flags, no religious symbols).
 */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('shrink-0', className)} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <defs>
        <linearGradient id="rq-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--brand-strong)" />
          <stop offset="1" stopColor="var(--brand)" />
        </linearGradient>
      </defs>
      <rect x="1.5" y="1.5" width="29" height="29" rx="9" fill="url(#rq-g)" />
      <path d="M9 21.5a9.5 9.5 0 0 1 14 0" fill="none" stroke="var(--brand-fg)" strokeWidth="2.2" strokeLinecap="round" opacity="0.55" />
      <path d="M12 18.4a5.2 5.2 0 0 1 8 0" fill="none" stroke="var(--brand-fg)" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="16" cy="11.2" r="2.6" fill="var(--brand-fg)" />
      <path d="M6 25.5h20" stroke="var(--brand-fg)" strokeWidth="1.4" strokeLinecap="round" opacity="0.35" />
    </svg>
  );
}

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  const { i18n } = useTranslation();
  const lang = i18n.language === 'ar' ? 'ar' : 'en';
  const other = lang === 'ar' ? 'en' : 'ar';
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark className="size-8" />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="text-[17px] font-semibold tracking-tight text-fg">{BRAND.name[lang]}</span>
          <span className="mt-0.5 text-[10.5px] font-medium tracking-wide text-subtle">{BRAND.name[other]}</span>
        </span>
      )}
    </span>
  );
}
