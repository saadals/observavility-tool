import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '@/store/settings';
import { createFormatter, durationParts } from './format';

/** Formatter bound to the current language, calendar and clock preferences. */
export function useFormat() {
  const lang = useSettings((s) => s.lang);
  const calendar = useSettings((s) => s.calendar);
  const clock = useSettings((s) => s.clock);
  return useMemo(() => createFormatter({ lang, calendar, clock }), [lang, calendar, clock]);
}

export function useIsRtl() {
  return useSettings((s) => s.lang) === 'ar';
}

/** "3d 4h" / "3 ي 4 س" style durations. */
export function useDuration() {
  const { t } = useTranslation();
  return (ms: number, maxParts = 2) => {
    const { d, h, m } = durationParts(ms);
    const parts: string[] = [];
    if (d) parts.push(t('duration.d', { count: d }));
    if (h) parts.push(t('duration.h', { count: h }));
    if (m || !parts.length) parts.push(t('duration.m', { count: m }));
    return parts.slice(0, maxParts).join(' ');
  };
}

/**
 * Short simulated loading phase on first mount so skeleton loaders are visible
 * (real data would arrive from an API). Kept brief to avoid slowing the demo.
 */
export function useSimulatedLoading(ms = 450) {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const id = window.setTimeout(() => setLoading(false), ms);
    return () => window.clearTimeout(id);
  }, [ms]);
  return loading;
}

export function useDebounced<T>(value: T, ms = 200): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return v;
}

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [query]);
  return matches;
}

/**
 * URL query-string state (shallow routing), so filtered views are linkable —
 * e.g. clicking a site on the map opens /network?site=jed-br.
 */
export function useQueryState<K extends string>(keys: readonly K[]) {
  const router = useRouter();
  const values = {} as Record<K, string>;
  for (const k of keys) {
    const v = router.query[k];
    values[k] = typeof v === 'string' ? v : '';
  }
  const set = useCallback(
    (patch: Partial<Record<K, string>>) => {
      const q: Record<string, string> = {};
      for (const [k, v] of Object.entries(router.query)) if (typeof v === 'string') q[k] = v;
      for (const [k, v] of Object.entries(patch) as [string, string | undefined][]) {
        if (v) q[k] = v;
        else delete q[k];
      }
      void router.replace({ pathname: router.pathname, query: q }, undefined, { shallow: true, scroll: false });
    },
    [router],
  );
  return [values, set] as const;
}
