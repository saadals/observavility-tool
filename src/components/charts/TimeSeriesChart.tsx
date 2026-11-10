import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Area, CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DAY, astDayStart, isWeekendAst, type SeriesPoint } from '@/mock';
import { useFormat, useIsRtl } from '@/lib/hooks';
import { cn } from '@/lib/cn';

export interface SeriesDef {
  key: string;
  label: string;
  color: string;
  type?: 'area' | 'line';
  dashed?: boolean;
}

export interface Threshold {
  value: number;
  tone: 'warn' | 'crit';
  label?: string;
}

interface Props {
  data: SeriesPoint[];
  series: SeriesDef[];
  height?: number;
  /** Formats axis ticks and tooltip values. */
  valueFormatter?: (v: number) => string;
  axisFormatter?: (v: number) => string;
  yDomain?: [number | 'auto' | 'dataMin' | 'dataMax', number | 'auto' | 'dataMin' | 'dataMax'];
  thresholds?: Threshold[];
  /** Shade Fridays/Saturdays (Saudi weekend) on multi-day ranges. */
  weekendBands?: boolean;
  stacked?: boolean;
  showLegend?: boolean;
  className?: string;
  syncId?: string;
  animate?: boolean;
}

/**
 * Time-series chart wrapper.
 *
 * RTL handling: the SVG is rendered inside a `dir="ltr"` box (SVG text anchoring breaks
 * under inherited RTL), then mirrored explicitly — the time axis is reversed so time
 * flows right-to-left, and the value axis moves to the right edge.
 */
export function TimeSeriesChart({
  data,
  series,
  height = 220,
  valueFormatter,
  axisFormatter,
  yDomain,
  thresholds,
  weekendBands = false,
  stacked = false,
  showLegend = true,
  className,
  syncId,
  animate = false,
}: Props) {
  const rtl = useIsRtl();
  const f = useFormat();
  const { t } = useTranslation();
  const first = data[0]?.t ?? 0;
  const last = data[data.length - 1]?.t ?? 0;
  const span = last - first;
  const multiDay = span > 1.5 * DAY;
  const fmtValue = valueFormatter ?? ((v: number) => f.number(v, 1));
  const fmtAxis = axisFormatter ?? fmtValue;

  const bands = useMemo(() => {
    if (!weekendBands || span < 3 * DAY) return [];
    const out: { x1: number; x2: number }[] = [];
    for (let d = astDayStart(first); d <= last; d += DAY) {
      if (isWeekendAst(d + DAY / 2)) out.push({ x1: Math.max(first, d), x2: Math.min(last, d + DAY) });
    }
    return out;
  }, [weekendBands, span, first, last]);

  const tickFormatter = (v: number) => (multiDay ? f.dayMonth(v) : f.time(v, span <= 20 * 60_000));

  return (
    <div className={cn('w-full', className)}>
      {showLegend && (
        <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
          {series.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-3.5 rounded-full" style={{ background: s.color, opacity: s.dashed ? 0.7 : 1 }} />
              {s.label}
            </span>
          ))}
          {bands.length > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-surface-3 ring-1 ring-line" />
              {t('workweek.weekend')}
            </span>
          )}
        </div>
      )}
      <div dir="ltr" style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 320, height }}>
          <ComposedChart data={data} margin={{ top: 6, right: rtl ? 0 : 8, left: rtl ? 8 : 0, bottom: 0 }} syncId={syncId}>
            <defs>
              {series.map((s) => (
                <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
            {bands.map((b) => (
              <ReferenceArea key={b.x1} x1={b.x1} x2={b.x2} fill="var(--surface-3)" fillOpacity={0.55} strokeOpacity={0} ifOverflow="hidden" />
            ))}
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={['dataMin', 'dataMax']}
              reversed={rtl}
              tickFormatter={tickFormatter}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              minTickGap={28}
              tickMargin={6}
              fontSize={11}
            />
            <YAxis
              orientation={rtl ? 'right' : 'left'}
              tickFormatter={fmtAxis}
              tickLine={false}
              axisLine={false}
              width={52}
              domain={yDomain ?? [0, 'auto']}
              fontSize={11}
              allowDecimals={false}
            />
            {thresholds?.map((th) => (
              <ReferenceLine key={th.value} y={th.value} stroke={th.tone === 'crit' ? 'var(--crit)' : 'var(--warn)'} strokeDasharray="4 4" strokeOpacity={0.7} ifOverflow="extendDomain" />
            ))}
            <Tooltip
              cursor={{ stroke: 'var(--border-strong)' }}
              isAnimationActive={false}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div dir={rtl ? 'rtl' : 'ltr'} className="min-w-40 rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-pop">
                    <div className="mb-1.5 font-medium text-muted tabular">{typeof label === 'number' ? f.dateTime(label) : ''}</div>
                    {payload.map((p) => {
                      const def = series.find((s) => s.key === p.dataKey);
                      const v = p.value;
                      return (
                        <div key={String(p.dataKey)} className="flex items-center justify-between gap-4 py-0.5">
                          <span className="inline-flex items-center gap-1.5 text-muted">
                            <span className="size-2 rounded-full" style={{ background: def?.color }} />
                            {def?.label}
                          </span>
                          <span className="font-semibold text-fg tabular">{typeof v === 'number' ? fmtValue(v) : '—'}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              }}
            />
            {series.map((s) =>
              s.type === 'line' ? (
                <Line
                  key={s.key}
                  dataKey={s.key}
                  type="monotone"
                  stroke={s.color}
                  strokeWidth={1.8}
                  strokeDasharray={s.dashed ? '4 3' : undefined}
                  dot={false}
                  isAnimationActive={animate}
                  connectNulls={false}
                />
              ) : (
                <Area
                  key={s.key}
                  dataKey={s.key}
                  type="monotone"
                  stroke={s.color}
                  strokeWidth={1.8}
                  fill={`url(#grad-${s.key})`}
                  stackId={stacked ? 'a' : undefined}
                  dot={false}
                  isAnimationActive={animate}
                  connectNulls={false}
                />
              ),
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
