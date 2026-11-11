import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { BRAND, type BrandLang } from '@/config/brand';
import { DEFAULT_LANG, useSettings, type Lang } from '@/store/settings';

import enCommon from './locales/en/common.json';
import arCommon from './locales/ar/common.json';
import enLanding from './locales/en/landing.json';
import arLanding from './locales/ar/landing.json';
import enOverview from './locales/en/overview.json';
import arOverview from './locales/ar/overview.json';
import enNetwork from './locales/en/network.json';
import arNetwork from './locales/ar/network.json';
import enDevice from './locales/en/device.json';
import arDevice from './locales/ar/device.json';
import enTopology from './locales/en/topology.json';
import arTopology from './locales/ar/topology.json';
import enServers from './locales/en/servers.json';
import arServers from './locales/ar/servers.json';
import enAlerts from './locales/en/alerts.json';
import arAlerts from './locales/ar/alerts.json';
import enRules from './locales/en/rules.json';
import arRules from './locales/ar/rules.json';
import enLogs from './locales/en/logs.json';
import arLogs from './locales/ar/logs.json';
import enReports from './locales/en/reports.json';
import arReports from './locales/ar/reports.json';
import enCompliance from './locales/en/compliance.json';
import arCompliance from './locales/ar/compliance.json';
import enLeads from './locales/en/leads.json';
import arLeads from './locales/ar/leads.json';
import enSettings from './locales/en/settings.json';
import arSettings from './locales/ar/settings.json';

/**
 * Translations are split per page/section. Each file is mounted under its section key,
 * except `common`, which is mounted at the root (e.g. `t('nav.overview')`).
 * Example: locales/en/alerts.json → t('alerts.title').
 */
const en = {
  ...enCommon,
  landing: enLanding,
  overview: enOverview,
  network: enNetwork,
  device: enDevice,
  topology: enTopology,
  servers: enServers,
  alerts: enAlerts,
  rules: enRules,
  logs: enLogs,
  reports: enReports,
  compliance: enCompliance,
  leads: enLeads,
  settings: enSettings,
};

const ar: typeof en = {
  ...arCommon,
  landing: arLanding,
  overview: arOverview,
  network: arNetwork,
  device: arDevice,
  topology: arTopology,
  servers: arServers,
  alerts: arAlerts,
  rules: arRules,
  logs: arLogs,
  reports: arReports,
  compliance: arCompliance,
  leads: arLeads,
  settings: arSettings,
};

/** `{{brand}}` resolves to the product name in the active language (see src/config/brand.ts). */
// The settings store hydrates synchronously from localStorage, so the first client render
// already uses the visitor's saved language (static HTML only contains a neutral splash).
const initialLang: Lang = typeof window !== 'undefined' ? useSettings.getState().lang : DEFAULT_LANG;
const defaultVariables: Record<string, string> = { brand: BRAND.name[initialLang as BrandLang] };

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: { en: { translation: en }, ar: { translation: ar } },
    lng: initialLang,
    fallbackLng: 'en',
    supportedLngs: ['ar', 'en'],
    interpolation: { escapeValue: false, defaultVariables },
    react: { useSuspense: false },
    returnNull: false,
  });
  i18n.on('languageChanged', (lng) => {
    // Mutate in place: i18next reads this object at interpolation time.
    defaultVariables.brand = BRAND.name[(lng === 'ar' ? 'ar' : 'en') as BrandLang];
  });
}

export function applyLanguage(lang: Lang) {
  defaultVariables.brand = BRAND.name[lang];
  if (i18n.language !== lang) void i18n.changeLanguage(lang);
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }
}

export default i18n;
