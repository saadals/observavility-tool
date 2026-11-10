/**
 * Product identity — the ONLY place the product name is defined.
 * Rename the product by editing this file (see README → "Renaming the product").
 *
 * Translation files reference the name through the `{{brand}}` interpolation
 * variable, which i18n resolves to `name.en` or `name.ar` for the active language.
 */
export const BRAND = {
  name: {
    en: 'Tayf',
    ar: 'طيف',
  },
  /** Prefix for localStorage keys so a renamed build does not read old demo data. */
  storagePrefix: 'tayf',
  /** Fictional contact details shown in the UI. */
  contactEmail: 'hello@tayf.example',
  supportPhone: '+966 11 000 0000',
  domain: 'tayf.example',
} as const;

export type BrandLang = keyof typeof BRAND.name;

export const storageKey = (key: string) => `${BRAND.storagePrefix}.${key}`;
