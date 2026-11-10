import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { BRAND } from '@/config/brand';
import { cn } from '@/lib/cn';

/** Baselines of the three stacked traces, back → front, and how brightly each one is drawn. */
const TRACES = [
  { y: 12.5, opacity: 0.35 },
  { y: 18.5, opacity: 0.65 },
  { y: 24.5, opacity: 1 },
] as const;
const PEAK = 7;

/** One trace: flat baseline with a single bell-shaped spectrum peak in the centre. */
const trace = (y: number) =>
  `M-2 ${y} H7 C11.5 ${y} 12.5 ${y - PEAK} 16 ${y - PEAK} S20.5 ${y} 25 ${y} H34`;

/**
 * Brand mark: three stacked signal traces that each rise into a spectrum peak, brightening toward
 * the front. Tayf (طيف) means "spectrum"; the layered traces read as metrics over time.
 * Deliberately abstract (no flags, no religious symbols). Colours come from the theme tokens, so the
 * mark flips with light/dark. Each trace is filled with the tile gradient so it hides the ones behind.
 */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const grad = `tayf-g-${uid}`;
  const clip = `tayf-c-${uid}`;
  return (
    <svg viewBox="0 0 32 32" className={cn('shrink-0', className)} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <defs>
        <linearGradient id={grad} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0" stopColor="var(--brand-strong)" />
          <stop offset="1" stopColor="var(--brand)" />
        </linearGradient>
        <clipPath id={clip}>
          <rect x="1.5" y="1.5" width="29" height="29" rx="9" />
        </clipPath>
      </defs>
      <rect x="1.5" y="1.5" width="29" height="29" rx="9" fill={`url(#${grad})`} />
      <g clipPath={`url(#${clip})`} fill="none" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        {TRACES.map(({ y, opacity }) => (
          <g key={y}>
            <path d={`${trace(y)} V40 H-2Z`} fill={`url(#${grad})`} stroke="none" />
            <path d={trace(y)} stroke="var(--brand-fg)" strokeOpacity={opacity} />
          </g>
        ))}
      </g>
    </svg>
  );
}

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  const { i18n } = useTranslation();
  const lang = i18n.language === 'ar' ? 'ar' : 'en';
  const other = lang === 'ar' ? 'en' : 'ar';
  return (
    <span className={cn('inline-flex items-center gap-3', className)}>
      <LogoMark className="size-9" />
      {!compact && (
        <span className="flex flex-col items-start leading-none">
          <span className="text-[19px] font-bold tracking-tight text-fg">{BRAND.name[lang]}</span>
          <span lang={other} className="mt-1 text-[12px] font-semibold text-brand-strong">
            {BRAND.name[other]}
          </span>
        </span>
      )}
    </span>
  );
}
