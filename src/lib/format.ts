import type { CalendarPref, ClockPref, Lang } from '@/store/settings';

/** All times are displayed in Arabia Standard Time (UTC+3), regardless of the viewer's machine. */
export const TIME_ZONE = 'Asia/Riyadh';

type Cal = 'gregory' | 'islamic-umalqura';

const dtfCache = new Map<string, Intl.DateTimeFormat>();
function dtf(lang: Lang, cal: Cal, opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${lang}|${cal}|${JSON.stringify(opts)}`;
  let f = dtfCache.get(key);
  if (!f) {
    // Latin digits in Arabic keep dense NOC tables readable; month names stay Arabic.
    const locale = lang === 'ar' ? `ar-SA-u-ca-${cal}-nu-latn` : `en-GB-u-ca-${cal}`;
    f = new Intl.DateTimeFormat(locale, { timeZone: TIME_ZONE, ...opts });
    dtfCache.set(key, f);
  }
  return f;
}

const nfCache = new Map<string, Intl.NumberFormat>();
function nf(lang: Lang, opts: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${lang}|${JSON.stringify(opts)}`;
  let f = nfCache.get(key);
  if (!f) {
    f = new Intl.NumberFormat(lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US', opts);
    nfCache.set(key, f);
  }
  return f;
}

/**
 * Wrap a Latin value+unit string (e.g. "8.5 ms", "1.2 Gbps") in Unicode LTR isolate marks so
 * it never reorders to "ms 8.5" inside Arabic text. Invisible, and works inside SVG text too.
 */
export const ltrIsolate = (s: string) => `\u2066${s}\u2069`;

export interface FormatContext {
  lang: Lang;
  calendar: CalendarPref;
  clock: ClockPref;
}

export function createFormatter(ctx: FormatContext) {
  const { lang, calendar, clock } = ctx;
  const timeOpts = (seconds = false): Intl.DateTimeFormatOptions => ({
    hour: '2-digit',
    minute: '2-digit',
    ...(seconds ? { second: '2-digit' } : {}),
    hourCycle: clock === '24h' ? 'h23' : 'h12',
  });

  const dateIn = (ts: number, cal: Cal, opts: Intl.DateTimeFormatOptions) => dtf(lang, cal, opts).format(ts);

  const iso = (s: string) => (lang === 'ar' ? ltrIsolate(s) : s);

  const date = (ts: number, style: 'short' | 'long' = 'short') => {
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: style === 'long' ? 'long' : 'short', year: 'numeric' };
    if (calendar === 'hijri') return dateIn(ts, 'islamic-umalqura', opts);
    if (calendar === 'both') return `${dateIn(ts, 'gregory', opts)} · ${dateIn(ts, 'islamic-umalqura', opts)}`;
    return dateIn(ts, 'gregory', opts);
  };

  return {
    lang,
    calendar,
    /** Calendar date honouring the Hijri/Gregorian preference. */
    date,
    gregorianDate: (ts: number) => dateIn(ts, 'gregory', { day: 'numeric', month: 'short', year: 'numeric' }),
    hijriDate: (ts: number) => dateIn(ts, 'islamic-umalqura', { day: 'numeric', month: 'short', year: 'numeric' }),
    /** Both calendars, regardless of preference. */
    dualDate: (ts: number) => ({
      gregorian: dateIn(ts, 'gregory', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
      hijri: dateIn(ts, 'islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' }),
    }),
    time: (ts: number, seconds = false) => dtf(lang, 'gregory', timeOpts(seconds)).format(ts),
    dateTime: (ts: number) => `${date(ts)} ${dtf(lang, 'gregory', timeOpts()).format(ts)}`,
    /** Compact axis label: day + short month in the preferred calendar. */
    dayMonth: (ts: number) => dateIn(ts, calendar === 'hijri' ? 'islamic-umalqura' : 'gregory', { day: 'numeric', month: 'short' }),
    weekday: (ts: number, style: 'long' | 'short' = 'short') => dtf(lang, 'gregory', { weekday: style }).format(ts),
    relative: (ts: number, now = Date.now()) => {
      const diff = ts - now;
      const abs = Math.abs(diff);
      const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto', style: 'short' });
      if (abs < 45_000) return rtf.format(Math.round(diff / 1000), 'second');
      if (abs < 3_600_000) return rtf.format(Math.round(diff / 60_000), 'minute');
      if (abs < 86_400_000) return rtf.format(Math.round(diff / 3_600_000), 'hour');
      return rtf.format(Math.round(diff / 86_400_000), 'day');
    },
    number: (n: number, digits = 0) => nf(lang, { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n),
    compact: (n: number) => nf(lang, { notation: 'compact', maximumFractionDigits: 1 }).format(n),
    /** n is 0..100 */
    percent: (n: number, digits = 1) => nf(lang, { style: 'percent', maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n / 100),
    sar: (n: number, digits = 0) => {
      const v = nf(lang, { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n);
      return lang === 'ar' ? `${v} ر.س` : `SAR ${v}`;
    },
    /** Mbps → human readable bandwidth (units kept Latin, as is common in Saudi IT teams). */
    bandwidth: (mbps: number | null | undefined) => {
      if (mbps === null || mbps === undefined) return '—';
      if (mbps >= 1000) return iso(`${nf(lang, { maximumFractionDigits: 2 }).format(mbps / 1000)} Gbps`);
      if (mbps >= 1) return iso(`${nf(lang, { maximumFractionDigits: 1 }).format(mbps)} Mbps`);
      return iso(`${nf(lang, { maximumFractionDigits: 0 }).format(mbps * 1000)} Kbps`);
    },
    speed: (mbps: number) => iso(mbps >= 1000 ? `${nf(lang, { maximumFractionDigits: 0 }).format(mbps / 1000)}G` : `${nf(lang, {}).format(mbps)}M`),
    ms: (v: number | null | undefined) => (v === null || v === undefined ? '—' : iso(`${nf(lang, { maximumFractionDigits: v < 10 ? 1 : 0 }).format(v)} ms`)),
    /** Any Latin unit string, e.g. "46.3°C". */
    unit: (v: number, unit: string, digits = 1) => iso(`${nf(lang, { maximumFractionDigits: digits }).format(v)}${unit}`),
  };
}

export type Formatter = ReturnType<typeof createFormatter>;

/** Duration in ms → parts, so the caller can translate units. */
export function durationParts(ms: number) {
  const totalMin = Math.max(0, Math.floor(ms / 60_000));
  return { d: Math.floor(totalMin / 1440), h: Math.floor((totalMin % 1440) / 60), m: totalMin % 60 };
}

const ARABIC_RE = /[؀-ۿݐ-ݿ]/;
/** True when a string contains Arabic script (used to avoid monospace fonts that break Arabic shaping). */
export const hasArabic = (s: string) => ARABIC_RE.test(s);
