import { useFormat } from '@/lib/hooks';

/** Ring gauge for the overall health score (0–100). Pure SVG, no chart library. */
export function HealthGauge({ value, size = 132, label }: { value: number; size?: number; label: string }) {
  const f = useFormat();
  const stroke = 11;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const arc = 0.75; // 270° gauge
  const pct = Math.max(0, Math.min(100, value)) / 100;
  const color = value >= 85 ? 'var(--ok)' : value >= 70 ? 'var(--warn)' : 'var(--crit)';
  return (
    <div className="relative" style={{ width: size, height: size }} role="img" aria-label={`${label}: ${value}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[135deg]">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} strokeDasharray={`${c * arc} ${c}`} strokeLinecap="round" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={`${c * arc * pct} ${c}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 900ms cubic-bezier(.2,.7,.2,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[34px] font-semibold leading-none tracking-tight text-fg tabular">{f.number(value)}</span>
        <span className="mt-1 text-[11px] text-subtle">/ {f.number(100)}</span>
      </div>
    </div>
  );
}
