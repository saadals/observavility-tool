import { useId } from 'react';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { useIsRtl } from '@/lib/hooks';

/** Tiny trend line. Mirrors in RTL like the full charts. */
export function Sparkline({
  data,
  color = 'var(--chart-1)',
  height = 32,
  domain,
}: {
  data: { t: number; v: number | null }[];
  color?: string;
  height?: number;
  domain?: [number, number];
}) {
  const rtl = useIsRtl();
  const id = useId().replace(/:/g, '');
  return (
    <div dir="ltr" style={{ height }} className="w-full" aria-hidden>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 120, height }}>
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
          <defs>
            <linearGradient id={`sp-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="t" type="number" domain={['dataMin', 'dataMax']} hide reversed={rtl} />
          <YAxis hide domain={domain ?? ['dataMin', 'dataMax']} />
          <Area dataKey="v" type="monotone" stroke={color} strokeWidth={1.5} fill={`url(#sp-${id})`} dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
