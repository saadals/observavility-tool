import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('card animate-fade-up', className)} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  actions,
  icon,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-4 pt-4 pb-3 sm:px-5', className)}>
      <div className="flex min-w-0 items-start gap-2.5">
        {icon && <span className="mt-0.5 text-subtle">{icon}</span>}
        <div className="min-w-0">
          <h2 className="text-[14.5px] font-semibold text-fg">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('px-4 pb-4 sm:px-5 sm:pb-5', className)}>{children}</div>;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1.5 text-xs font-medium text-brand">{eyebrow}</div>}
        <h1 className="text-xl font-semibold tracking-tight text-fg sm:text-[22px]">{title}</h1>
        {subtitle && <p className="mt-1 max-w-3xl text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Kpi({
  label,
  value,
  sub,
  icon,
  tone = 'neutral',
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  tone?: 'neutral' | 'ok' | 'warn' | 'crit' | 'brand' | 'info';
  className?: string;
}) {
  const toneCls = {
    neutral: 'text-muted bg-surface-3',
    ok: 'text-ok bg-ok/12',
    warn: 'text-warn bg-warn/12',
    crit: 'text-crit bg-crit/12',
    brand: 'text-brand bg-brand/12',
    info: 'text-info bg-info/12',
  }[tone];
  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium text-muted">{label}</div>
          <div className="mt-1.5 text-2xl font-semibold tracking-tight text-fg tabular">{value}</div>
          {sub && <div className="mt-1 text-xs text-subtle">{sub}</div>}
        </div>
        {icon && <span className={cn('grid size-9 shrink-0 place-items-center rounded-lg', toneCls)}>{icon}</span>}
      </div>
    </Card>
  );
}
