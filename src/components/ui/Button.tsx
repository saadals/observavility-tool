import Link from 'next/link';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'accent';
type Size = 'xs' | 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-[background,color,border,box-shadow,transform] duration-150 active:translate-y-px disabled:opacity-50 disabled:active:translate-y-0 select-none';

const variants: Record<Variant, string> = {
  primary: 'bg-brand text-brand-fg hover:bg-brand-strong shadow-sm',
  accent: 'bg-accent text-[#1c1405] hover:brightness-110 shadow-sm',
  secondary: 'bg-surface-3 text-fg hover:bg-line border border-line',
  outline: 'border border-line-strong text-fg hover:bg-surface-3',
  ghost: 'text-muted hover:text-fg hover:bg-surface-3',
  danger: 'bg-crit/12 text-crit hover:bg-crit/20 border border-crit/30',
};

const sizes: Record<Size, string> = {
  xs: 'h-7 px-2 text-xs rounded-md',
  sm: 'h-8 px-3 text-[13px] rounded-lg',
  md: 'h-9.5 px-4 text-sm rounded-lg',
  lg: 'h-11 px-5 text-[15px] rounded-xl',
};

const iconSizes: Record<Size, string> = {
  xs: 'size-7 rounded-md',
  sm: 'size-8 rounded-lg',
  md: 'size-9.5 rounded-lg',
  lg: 'size-11 rounded-xl',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', icon = false, leading, trailing, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} className={cn(base, variants[variant], icon ? iconSizes[size] : sizes[size], className)} {...rest}>
      {leading}
      {children}
      {trailing}
    </button>
  );
});

export function ButtonLink({
  href,
  variant = 'secondary',
  size = 'md',
  className,
  children,
  leading,
  trailing,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <Link href={href} className={cn(base, variants[variant], sizes[size], className)}>
      {leading}
      {children}
      {trailing}
    </Link>
  );
}
