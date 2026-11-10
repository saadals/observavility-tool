import { AlertOctagon, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { useUi, type ToastKind } from '@/store/ui';
import { cn } from '@/lib/cn';

const icons: Record<ToastKind, typeof Info> = { success: CheckCircle2, info: Info, warning: TriangleAlert, error: AlertOctagon };
const tones: Record<ToastKind, string> = { success: 'text-ok', info: 'text-info', warning: 'text-warn', error: 'text-crit' };

/** Toasts appear at the bottom inline-end corner (bottom-right in LTR, bottom-left in RTL). */
export function Toaster() {
  const { t } = useTranslation();
  const toasts = useUi((s) => s.toasts);
  const dismiss = useUi((s) => s.dismissToast);
  return (
    <div className="pointer-events-none fixed bottom-4 end-4 z-[90] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
      {toasts.map((toast) => {
        const Icon = icons[toast.kind];
        const params = { ...toast.params, carrier: toast.params?.carrier ? t(`carriers.${toast.params.carrier}`) : '' };
        const title = toast.title ?? (toast.titleKey ? t(toast.titleKey, params) : '');
        const body = toast.body ?? (toast.bodyKey ? t(toast.bodyKey, params) : '');
        const content = (
          <div className="flex items-start gap-3">
            <Icon className={cn('mt-0.5 size-4.5 shrink-0', tones[toast.kind])} />
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-semibold text-fg">{title}</div>
              {body && <div className="mt-0.5 text-[12.5px] text-muted">{body}</div>}
            </div>
          </div>
        );
        return (
          <div key={toast.id} className="pointer-events-auto relative rounded-xl border border-line bg-surface p-3.5 pe-9 shadow-pop animate-slide-in">
            {toast.href ? (
              <Link href={toast.href} onClick={() => dismiss(toast.id)} className="block">
                {content}
              </Link>
            ) : (
              content
            )}
            <button type="button" onClick={() => dismiss(toast.id)} className="absolute end-2 top-2 grid size-6 place-items-center rounded text-subtle hover:text-fg" aria-label={t('actions.close')}>
              <X className="size-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
