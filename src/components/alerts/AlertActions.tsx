import { CheckCheck, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import type { Alert } from '@/mock';
import { useActorName } from '@/lib/domain';
import { useLive } from '@/store/live';
import { toast } from '@/store/ui';

/** Acknowledge / resolve buttons. Actions update the in-browser alert store. */
export function AlertActions({ alert, compact = false }: { alert: Alert; compact?: boolean }) {
  const { t } = useTranslation();
  const actor = useActorName();
  const acknowledge = useLive((s) => s.acknowledge);
  const resolve = useLive((s) => s.resolve);
  if (alert.state === 'resolved') return null;
  return (
    <div className="flex items-center gap-1.5">
      {alert.state === 'open' && (
        <Button
          size="xs"
          variant="outline"
          icon={compact}
          title={t('actions.acknowledge')}
          aria-label={t('actions.acknowledge')}
          onClick={(e) => {
            e.stopPropagation();
            acknowledge([alert.id], actor);
            toast({ kind: 'info', title: t('toasts.acknowledged', { count: 1 }) });
          }}
          leading={compact ? undefined : <Eye className="size-3.5" />}
        >
          {compact ? <Eye className="size-3.5" /> : t('actions.acknowledge')}
        </Button>
      )}
      <Button
        size="xs"
        variant="primary"
        icon={compact}
        title={t('actions.resolve')}
        aria-label={t('actions.resolve')}
        onClick={(e) => {
          e.stopPropagation();
          resolve([alert.id], actor);
          toast({ kind: 'success', title: t('toasts.resolved', { count: 1 }) });
        }}
        leading={compact ? undefined : <CheckCheck className="size-3.5" />}
      >
        {compact ? <CheckCheck className="size-3.5" /> : t('actions.resolve')}
      </Button>
    </div>
  );
}
