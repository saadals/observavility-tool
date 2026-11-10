import { ChevronDown, Search, X } from 'lucide-react';
import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';

const control =
  'w-full rounded-lg border border-line bg-surface-2 text-sm text-fg placeholder:text-subtle transition-colors hover:border-line-strong focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25 disabled:opacity-60';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(function Input(
  { className, invalid, ...rest },
  ref,
) {
  return <input ref={ref} className={cn(control, 'h-9.5 px-3', invalid && 'border-crit focus:border-crit focus:ring-crit/25', className)} aria-invalid={invalid || undefined} {...rest} />;
});

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(function TextArea(
  { className, invalid, ...rest },
  ref,
) {
  return <textarea ref={ref} className={cn(control, 'min-h-22 px-3 py-2', invalid && 'border-crit', className)} aria-invalid={invalid || undefined} {...rest} />;
});

export function Select({ className, children, size = 'md', ...rest }: Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> & { size?: 'sm' | 'md' }) {
  return (
    <div className={cn('relative', className)}>
      <select className={cn(control, 'appearance-none pe-8 ps-3', size === 'sm' ? 'h-8 text-[13px]' : 'h-9.5')} {...rest}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute end-2.5 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
  label,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  label: string;
  autoFocus?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        autoFocus={autoFocus}
        className={cn(control, 'h-9.5 ps-9 pe-8 [&::-webkit-search-cancel-button]:hidden')}
      />
      {value && (
        <button type="button" onClick={() => onChange('')} className="absolute end-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded text-subtle hover:text-fg" aria-label={t('actions.clear')}>
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
  required,
  className,
  htmlFor,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  required?: boolean;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-fg">
        {label}
        {required && <span className="ms-0.5 text-crit">*</span>}
      </label>
      {children}
      {error ? <p className="text-xs text-crit">{error}</p> : hint ? <p className="text-xs text-subtle">{hint}</p> : null}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
  className,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      {(label || description) && (
        <label htmlFor={id} className="min-w-0 cursor-pointer">
          {label && <div className="text-sm font-medium text-fg">{label}</div>}
          {description && <div className="mt-0.5 text-xs text-muted">{description}</div>}
        </label>
      )}
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn('relative inline-block h-5.5 w-10 shrink-0 rounded-full border transition-colors', checked ? 'border-brand bg-brand' : 'border-line-strong bg-surface-3')}
      >
        {/* Logical inset so the knob sits at the inline-start when off — mirrors correctly in RTL. */}
        <span
          className="absolute top-1/2 size-4 -translate-y-1/2 rounded-full bg-white shadow transition-[inset-inline-start] duration-200"
          style={{ insetInlineStart: checked ? 'calc(100% - 18px)' : '2px' }}
        />
      </button>
    </div>
  );
}

export function Checkbox({ checked, onChange, label, className, indeterminate }: { checked: boolean; onChange: (v: boolean) => void; label: string; className?: string; indeterminate?: boolean }) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      checked={checked}
      ref={(el) => {
        if (el) el.indeterminate = !!indeterminate;
      }}
      onChange={(e) => onChange(e.target.checked)}
      className={cn('size-4 cursor-pointer rounded border-line-strong accent-[var(--brand)]', className)}
    />
  );
}

/** Segmented control — used for time ranges and binary choices. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = 'sm',
  className,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  size?: 'xs' | 'sm';
  className?: string;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-flex rounded-lg border border-line bg-surface-2 p-0.5', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-md font-medium transition-colors',
            size === 'xs' ? 'h-6 px-2 text-[11.5px]' : 'h-7 px-2.5 text-xs',
            o.value === value ? 'bg-surface text-fg shadow-sm ring-1 ring-line' : 'text-muted hover:text-fg',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ChipToggle({ active, onClick, children, tone }: { active: boolean; onClick: () => void; children: ReactNode; tone?: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors',
        active ? cn('border-transparent', tone ?? 'bg-brand/15 text-brand') : 'border-line text-muted hover:text-fg hover:border-line-strong',
      )}
    >
      {children}
    </button>
  );
}
