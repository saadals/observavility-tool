import clsx, { type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/** tailwind-merge aware of the project's custom design tokens (text sizes, colours). */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      color: ['bg', 'surface', 'surface-2', 'surface-3', 'line', 'line-strong', 'fg', 'muted', 'subtle', 'brand', 'brand-strong', 'brand-fg', 'accent', 'ok', 'warn', 'crit', 'info', 'unknown'],
    },
  },
});

/** Join class names; later classes win over conflicting earlier ones (e.g. `hidden` over a base `inline-flex`). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
