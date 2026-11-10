import { cn } from '@/lib/cn';
import { useFormat } from '@/lib/hooks';

/** Threshold-coloured utilisation bar. Fills from the inline-start edge (mirrors in RTL). */
export function MetricBar({
  value,
  warn = 80,
  crit = 90,
  showValue = true,
  className,
  thin = false,
}: {
  value: number | null | undefined;
  warn?: number;
  crit?: number;
  showValue?: boolean;
  className?: string;
  thin?: boolean;
}) {
  const f = useFormat();
  if (value === null || value === undefined) {
    return <span className="text-xs text-subtle">—</span>;
  }
  const tone = value >= crit ? 'bg-crit' : value >= warn ? 'bg-warn' : 'bg-brand';
  return (
    <div className={cn('flex min-w-0 items-center gap-2', className)}>
      <div className={cn('relative flex-1 overflow-hidden rounded-full bg-surface-3', thin ? 'h-1' : 'h-1.5')}>
        <div className={cn('h-full rounded-full transition-[width] duration-700 ease-out', tone)} style={{ width: `${Math.max(1.5, Math.min(100, value))}%` }} />
      </div>
      {showValue && <span className={cn('w-10 shrink-0 text-end text-xs tabular', value >= crit ? 'text-crit' : value >= warn ? 'text-warn' : 'text-muted')}>{f.number(value, 0)}%</span>}
    </div>
  );
}
