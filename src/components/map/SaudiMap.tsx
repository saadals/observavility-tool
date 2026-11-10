import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KSA_OUTLINE, SITES, WAN_LINKS, getDevice, type SiteId } from '@/mock';
import { cn } from '@/lib/cn';

/**
 * Stylised SVG map of Saudi Arabia with site markers.
 *
 * NOTE: geography never mirrors — the map is always drawn west→east regardless of
 * language. Only the surrounding UI chrome follows RTL.
 */

const LON0 = 34.2;
const LAT_MAX = 32.6;
const K = 30;
const COS = Math.cos((24 * Math.PI) / 180);
const project = (lon: number, lat: number): [number, number] => [(lon - LON0) * COS * K, (LAT_MAX - lat) * K];

const W = Math.round((56.2 - LON0) * COS * K);
const H = Math.round((LAT_MAX - 15.8) * K);

/**
 * Display positions are nudged apart where real cities are too close to read
 * (Riyadh HQ/DC1, Jeddah/DC2/Makkah). Label placement is hand-tuned.
 */
const DISPLAY: Partial<Record<SiteId, [number, number]>> = {
  'ruh-dc1': [47.25, 24.05],
  'jed-dc2': [39.75, 22.45],
  'mkh-br': [40.25, 21.15],
};
const LABEL: Record<SiteId, { dx: number; dy: number; anchor: 'start' | 'end' | 'middle' }> = {
  'ruh-hq': { dx: 0, dy: -17, anchor: 'middle' },
  'ruh-dc1': { dx: 16, dy: 5, anchor: 'start' },
  'jed-dc2': { dx: 16, dy: -2, anchor: 'start' },
  'jed-br': { dx: -14, dy: 5, anchor: 'end' },
  'dmm-br': { dx: -14, dy: 5, anchor: 'end' },
  'med-br': { dx: 14, dy: 5, anchor: 'start' },
  'mkh-br': { dx: 14, dy: 12, anchor: 'start' },
  'tuu-br': { dx: 14, dy: 5, anchor: 'start' },
  'neom-br': { dx: -2, dy: 26, anchor: 'middle' },
  'ahb-br': { dx: 14, dy: 5, anchor: 'start' },
};

export type SiteTone = 'ok' | 'warn' | 'crit' | 'brand';

export interface SiteMarkerInfo {
  tone: SiteTone;
  /** Short line shown in the hover card. */
  detail?: string;
  /** Extra lines in the hover card. */
  lines?: string[];
}

const toneVar: Record<SiteTone, string> = { ok: 'var(--ok)', warn: 'var(--warn)', crit: 'var(--crit)', brand: 'var(--brand)' };

export function SaudiMap({
  info,
  onSiteClick,
  showLinks = true,
  highlightDcs = false,
  className,
  height,
}: {
  info: (siteId: SiteId) => SiteMarkerInfo;
  onSiteClick?: (siteId: SiteId) => void;
  showLinks?: boolean;
  highlightDcs?: boolean;
  className?: string;
  height?: number;
}) {
  const { t, i18n } = useTranslation();
  const [hover, setHover] = useState<SiteId | null>(null);
  const outline = useMemo(() => KSA_OUTLINE.map(([lon, lat]) => project(lon, lat).map((v) => v.toFixed(1)).join(',')).join(' '), []);

  const pos = (id: SiteId): [number, number] => {
    const s = SITES.find((x) => x.id === id);
    const d = DISPLAY[id];
    return d ? project(d[0], d[1]) : project(s?.lon ?? 0, s?.lat ?? 0);
  };

  const links = useMemo(() => {
    if (!showLinks) return [];
    return WAN_LINKS.map((l) => {
      const a = getDevice(l.from)?.siteId;
      const b = getDevice(l.to)?.siteId;
      if (!a || !b || a === b) return null;
      return { id: l.id, a, b, kind: l.kind, status: l.status };
    }).filter((x): x is NonNullable<typeof x> => x !== null);
  }, [showLinks]);

  const hovered = hover ? info(hover) : null;
  const hp = hover ? pos(hover) : null;

  return (
    <div dir="ltr" className={cn('relative w-full', className)} style={height ? { height } : undefined}>
      <svg viewBox={`-10 -10 ${W + 20} ${H + 20}`} className="h-full w-full" role="img" aria-label={t('overview.map.aria')}>
        <defs>
          <pattern id="ksa-dots" width="9" height="9" patternUnits="userSpaceOnUse">
            <circle cx="1.2" cy="1.2" r="0.9" fill="var(--border-strong)" />
          </pattern>
          <filter id="ksa-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>
        <polygon points={outline} fill="var(--surface-2)" stroke="var(--border-strong)" strokeWidth="1.4" strokeLinejoin="round" />
        <polygon points={outline} fill="url(#ksa-dots)" opacity="0.7" />

        {links.map((l) => {
          const [x1, y1] = pos(l.a);
          const [x2, y2] = pos(l.b);
          const mx = (x1 + x2) / 2;
          const my = (y1 + y2) / 2 - Math.hypot(x2 - x1, y2 - y1) * (l.kind === 'backup' ? 0.22 : 0.12);
          const color = l.status === 'down' ? 'var(--crit)' : l.kind === 'dci' ? 'var(--accent)' : 'var(--brand)';
          return (
            <path
              key={l.id}
              d={`M${x1},${y1} Q${mx},${my} ${x2},${y2}`}
              fill="none"
              stroke={color}
              strokeWidth={l.kind === 'dci' ? 2.6 : 1.6}
              strokeOpacity={l.status === 'standby' ? 0.25 : l.status === 'down' ? 0.9 : 0.55}
              strokeDasharray={l.status === 'down' ? '4 4' : l.kind === 'backup' ? '2 4' : undefined}
            />
          );
        })}

        {SITES.map((s) => {
          const [x, y] = pos(s.id);
          const inf = info(s.id);
          const color = toneVar[inf.tone];
          const isDc = s.kind === 'datacenter';
          const r = isDc ? 10 : s.kind === 'hq' ? 9 : 7.5;
          const lab = LABEL[s.id];
          const label = t(`sites.${s.id}`);
          return (
            <g
              key={s.id}
              role={onSiteClick ? 'button' : undefined}
              tabIndex={onSiteClick ? 0 : undefined}
              aria-label={label}
              className={cn(onSiteClick && 'cursor-pointer', 'outline-none')}
              onMouseEnter={() => setHover(s.id)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(s.id)}
              onBlur={() => setHover(null)}
              onClick={() => onSiteClick?.(s.id)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSiteClick?.(s.id)}
            >
              {inf.tone === 'crit' && <circle cx={x} cy={y} r={r + 4} fill={color} opacity="0.5" filter="url(#ksa-glow)" className="animate-pulse" />}
              {(highlightDcs && isDc) && <circle cx={x} cy={y} r={r + 9} fill="none" stroke="var(--brand)" strokeOpacity="0.45" strokeDasharray="3 3" />}
              {isDc ? (
                <rect x={x - r} y={y - r} width={r * 2} height={r * 2} rx="3" fill={color} stroke="var(--surface)" strokeWidth="2" />
              ) : (
                <circle cx={x} cy={y} r={r} fill={color} stroke="var(--surface)" strokeWidth="2" />
              )}
              {isDc && <path d={`M${x - 4.5},${y - 3}h9M${x - 4.5},${y}h9M${x - 4.5},${y + 3}h9`} stroke="var(--surface)" strokeWidth="1.4" />}
              <text
                x={x + lab.dx}
                y={y + lab.dy}
                textAnchor={lab.anchor}
                fontSize={i18n.language === 'ar' ? 16 : 14.5}
                fontWeight={hover === s.id ? 700 : 600}
                fill="var(--text)"
                stroke="var(--bg)"
                strokeWidth="3.5"
                paintOrder="stroke"
                style={{ fontFamily: 'inherit' }}
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>

      {hover && hovered && hp && (
        <div
          dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}
          className="pointer-events-none absolute z-10 min-w-44 -translate-x-1/2 rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-pop"
          style={{ left: `${((hp[0] + 10) / (W + 20)) * 100}%`, top: `calc(${((hp[1] + 10) / (H + 20)) * 100}% + 14px)` }}
        >
          <div className="flex items-center gap-1.5 font-semibold text-fg">
            <span className="size-2 rounded-full" style={{ background: toneVar[hovered.tone] }} />
            {t(`sites.${hover}`)}
          </div>
          {hovered.detail && <div className="mt-0.5 text-muted">{hovered.detail}</div>}
          {hovered.lines?.map((l) => (
            <div key={l} className="mt-0.5 text-subtle">
              {l}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
