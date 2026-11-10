import { AlertOctagon, AlertTriangle, CheckCircle2, CircleDashed, Info, ArrowDownCircle, Eye } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { AlertSeverity, AlertState, DeviceStatus } from '@/mock';
import { cn } from '@/lib/cn';

export type Tone = 'neutral' | 'brand' | 'ok' | 'warn' | 'crit' | 'info' | 'accent';

const toneCls: Record<Tone, string> = {
  neutral: 'bg-surface-3 text-muted border-line',
  brand: 'bg-brand/12 text-brand border-brand/25',
  ok: 'bg-ok/12 text-ok border-ok/25',
  warn: 'bg-warn/12 text-warn border-warn/30',
  crit: 'bg-crit/12 text-crit border-crit/30',
  info: 'bg-info/12 text-info border-info/25',
  accent: 'bg-accent/14 text-accent border-accent/30',
};

export function Badge({ tone = 'neutral', children, className, icon }: { tone?: Tone; children: ReactNode; className?: string; icon?: ReactNode }) {
  return (
    <span className={cn('inline-flex h-5.5 items-center gap-1 whitespace-nowrap rounded-md border px-1.5 text-[11.5px] font-medium', toneCls[tone], className)}>
      {icon}
      {children}
    </span>
  );
}

export const statusTone: Record<DeviceStatus, Tone> = { up: 'ok', warning: 'warn', down: 'crit' };
export const severityTone: Record<AlertSeverity, Tone> = { critical: 'crit', warning: 'warn', info: 'info' };

const dotColor: Record<Tone, string> = {
  neutral: 'bg-unknown',
  brand: 'bg-brand',
  ok: 'bg-ok',
  warn: 'bg-warn',
  crit: 'bg-crit',
  info: 'bg-info',
  accent: 'bg-accent',
};

export function Dot({ tone, pulse = false, className }: { tone: Tone; pulse?: boolean; className?: string }) {
  return (
    <span className={cn('relative inline-flex size-2 shrink-0', className)} aria-hidden>
      {pulse && <span className={cn('absolute inset-0 rounded-full animate-ping-soft', dotColor[tone])} />}
      <span className={cn('relative inline-flex size-full rounded-full', dotColor[tone])} />
    </span>
  );
}

export function StatusDot({ status, className }: { status: DeviceStatus; className?: string }) {
  return <Dot tone={statusTone[status]} pulse={status === 'down'} className={className} />;
}

const statusIcon: Record<DeviceStatus, ReactNode> = {
  up: <CheckCircle2 className="size-3.5" />,
  warning: <AlertTriangle className="size-3.5" />,
  down: <ArrowDownCircle className="size-3.5" />,
};

/** Status shown with icon + text + colour, so it never relies on colour alone. */
export function StatusPill({ status, className }: { status: DeviceStatus; className?: string }) {
  const { t } = useTranslation();
  return (
    <Badge tone={statusTone[status]} icon={statusIcon[status]} className={className}>
      {t(`status.${status}`)}
    </Badge>
  );
}

const sevIcon: Record<AlertSeverity, ReactNode> = {
  critical: <AlertOctagon className="size-3.5" />,
  warning: <AlertTriangle className="size-3.5" />,
  info: <Info className="size-3.5" />,
};

export function SeverityBadge({ severity, className }: { severity: AlertSeverity; className?: string }) {
  const { t } = useTranslation();
  return (
    <Badge tone={severityTone[severity]} icon={sevIcon[severity]} className={className}>
      {t(`severity.${severity}`)}
    </Badge>
  );
}

const stateIcon: Record<AlertState, ReactNode> = {
  open: <CircleDashed className="size-3.5" />,
  acknowledged: <Eye className="size-3.5" />,
  resolved: <CheckCircle2 className="size-3.5" />,
};

export function AlertStateBadge({ state, className }: { state: AlertState; className?: string }) {
  const { t } = useTranslation();
  const tone: Tone = state === 'open' ? 'neutral' : state === 'acknowledged' ? 'info' : 'ok';
  return (
    <Badge tone={tone} icon={stateIcon[state]} className={className}>
      {t(`alertState.${state}`)}
    </Badge>
  );
}
