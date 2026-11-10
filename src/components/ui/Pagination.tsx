import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFormat } from '@/lib/hooks';
import { Button } from './Button';
import { Select } from './Form';

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
  onPageSize,
  sizes = [10, 25, 50],
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
  onPageSize?: (s: number) => void;
  sizes?: number[];
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs text-muted sm:px-5">
      <div className="tabular">{t('table.showing', { from: f.number(from), to: f.number(to), total: f.number(total) })}</div>
      <div className="flex items-center gap-3">
        {onPageSize && (
          <label className="hidden items-center gap-2 sm:flex">
            <span>{t('table.rowsPerPage')}</span>
            <Select size="sm" value={pageSize} onChange={(e) => onPageSize(Number(e.target.value))} className="w-20">
              {sizes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </label>
        )}
        <span className="tabular">{t('table.page', { page: f.number(page), pages: f.number(pages) })}</span>
        <div className="flex gap-1">
          <Button size="sm" icon variant="outline" onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label={t('table.previous')}>
            <ChevronLeft className="size-4 rtl:-scale-x-100" />
          </Button>
          <Button size="sm" icon variant="outline" onClick={() => onPage(page + 1)} disabled={page >= pages} aria-label={t('table.next')}>
            <ChevronRight className="size-4 rtl:-scale-x-100" />
          </Button>
        </div>
      </div>
    </div>
  );
}
