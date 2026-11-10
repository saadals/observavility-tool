import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DEVICES, OPERATORS, SITES, deviceStatus, statusCounts, type Alert, type DeviceStatus, type SiteId } from '@/mock';
import { useLive } from '@/store/live';
import { useAuth } from '@/store/auth';
import { useFormat } from './hooks';

/** Translated alert title with formatted/translated parameters. */
export function useAlertTitle() {
  const { t } = useTranslation();
  const f = useFormat();
  return useCallback(
    (a: Pick<Alert, 'type' | 'params'>) => {
      const p: Record<string, string | number> = { ...a.params };
      if (typeof p.value === 'number') p.value = f.number(p.value, p.value % 1 ? 1 : 0);
      if (typeof p.carrier === 'string') p.carrier = t(`carriers.${p.carrier}`);
      return t(`alertTypes.${a.type}`, p);
    },
    [t, f],
  );
}

/** Resolve an operator id (seeded) or a free-text name (current user) for display. */
export function useOperatorName() {
  const { i18n, t } = useTranslation();
  const me = useAuth((s) => s.user?.name);
  return useCallback(
    (id?: string) => {
      if (!id) return '';
      const op = OPERATORS.find((o) => o.id === id);
      if (op) return op.name[i18n.language === 'ar' ? 'ar' : 'en'];
      if (me && id === me) return `${id} (${t('common.you')})`;
      return id;
    },
    [i18n.language, me, t],
  );
}

export function useDeviceStatus(deviceId: string): DeviceStatus {
  return useLive((s) => deviceStatus(s.episodes[deviceId]));
}

/** Name shown as the actor when the demo user acknowledges/resolves. */
export function useActorName() {
  return useAuth((s) => s.user?.name ?? 'Demo User');
}

export interface SiteHealth {
  siteId: SiteId;
  total: number;
  up: number;
  warning: number;
  down: number;
  activeAlerts: number;
  critical: number;
  tone: 'ok' | 'warn' | 'crit';
}

/** Per-site rollup of device status and active alerts. */
export function useSiteHealth(): Record<SiteId, SiteHealth> {
  const episodes = useLive((s) => s.episodes);
  const alerts = useLive((s) => s.alerts);
  return useMemo(() => {
    const out = {} as Record<SiteId, SiteHealth>;
    for (const site of SITES) {
      const devs = DEVICES.filter((d) => d.siteId === site.id);
      const c = statusCounts(devs, episodes);
      const act = alerts.filter((a) => a.siteId === site.id && a.state !== 'resolved');
      const critical = act.filter((a) => a.severity === 'critical').length;
      out[site.id] = {
        siteId: site.id,
        total: c.total,
        up: c.up,
        warning: c.warning,
        down: c.down,
        activeAlerts: act.length,
        critical,
        tone: c.down > 0 || critical > 0 ? 'crit' : c.warning > 0 || act.some((a) => a.severity === 'warning') ? 'warn' : 'ok',
      };
    }
    return out;
  }, [episodes, alerts]);
}
