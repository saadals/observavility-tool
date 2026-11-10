import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';

export type SortDir = 'asc' | 'desc';

/** Sortable column header. Arrows indicate value order, so they do not mirror in RTL. */
export function SortHeader<K extends string>({
  label,
  sortKey,
  sort,
  onSort,
  align = 'start',
  className,
}: {
  label: ReactNode;
  sortKey: K;
  sort: { key: K; dir: SortDir };
  onSort: (key: K) => void;
  align?: 'start' | 'end';
  className?: string;
}) {
  const { t } = useTranslation();
  const active = sort.key === sortKey;
  const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th scope="col" aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'} className={cn('px-3 py-2.5 font-medium', align === 'end' ? 'text-end' : 'text-start', className)}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn('inline-flex items-center gap-1 rounded hover:text-fg', active ? 'text-fg' : '', align === 'end' && 'flex-row-reverse')}
        title={t('table.sortBy', { col: typeof label === 'string' ? label : '' })}
      >
        {label}
        <Icon className={cn('size-3.5', active ? 'text-brand' : 'opacity-40')} />
      </button>
    </th>
  );
}
