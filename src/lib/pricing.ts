/**
 * Illustrative SAR pricing used by the pricing page and calculator.
 * All figures are placeholders for market validation — not an offer.
 */
export type TierId = 'starter' | 'business' | 'enterprise';
export type Billing = 'monthly' | 'annual';

export interface Tier {
  id: TierId;
  /** SAR per network device per month (monthly billing). */
  perDevice: number;
  /** SAR per server / VM / database node per month (monthly billing). */
  perServer: number;
  /** Included log ingestion per month (GB). */
  logsGb: number;
  retentionDays: number;
  maxDevices: number | null;
  highlighted?: boolean;
  /** Feature keys under pricing.features */
  features: string[];
}

export const ANNUAL_DISCOUNT = 0.18;
export const VAT_RATE = 0.15;

export const TIERS: readonly Tier[] = [
  {
    id: 'starter',
    perDevice: 14,
    perServer: 28,
    logsGb: 20,
    retentionDays: 30,
    maxDevices: 150,
    features: ['networkServers', 'alertsEmailSms', 'dashboards', 'bilingual', 'retention30', 'supportBusiness'],
  },
  {
    id: 'business',
    perDevice: 22,
    perServer: 42,
    logsGb: 100,
    retentionDays: 180,
    maxDevices: 2000,
    highlighted: true,
    features: ['everythingStarter', 'apm', 'logExplorer', 'whatsappChatops', 'reports', 'retention180', 'supportPriority'],
  },
  {
    id: 'enterprise',
    perDevice: 32,
    perServer: 60,
    logsGb: 500,
    retentionDays: 365,
    maxDevices: null,
    features: ['everythingBusiness', 'complianceReports', 'sso', 'dedicatedTenant', 'onPremCollector', 'retention365', 'supportTam'],
  },
];

export function tierPrice(tier: Tier, devices: number, servers: number, billing: Billing) {
  const monthlyList = devices * tier.perDevice + servers * tier.perServer;
  const factor = billing === 'annual' ? 1 - ANNUAL_DISCOUNT : 1;
  const monthly = monthlyList * factor;
  return { monthly, yearly: monthly * 12, savings: billing === 'annual' ? monthlyList * 12 - monthly * 12 : 0 };
}

export function unitPrice(value: number, billing: Billing) {
  return billing === 'annual' ? value * (1 - ANNUAL_DISCOUNT) : value;
}

/** Recommend a tier for a fleet size. */
export function recommendTier(devices: number, servers: number): TierId {
  const total = devices + servers;
  if (total <= 150 && servers <= 40) return 'starter';
  if (total <= 2000) return 'business';
  return 'enterprise';
}

/**
 * ILLUSTRATIVE comparison inputs for a "typical international vendor".
 * These are placeholders chosen for validation conversations, not quotes of any real vendor.
 */
export const INTL_COMPARISON = {
  perDeviceUsd: 9,
  perServerUsd: 23,
  usdToSar: 3.75,
  /** Rough uplift for premium support, log add-ons and data egress, as a fraction. */
  addOnsUplift: 0.25,
};

export function intlMonthlySar(devices: number, servers: number) {
  const base = (devices * INTL_COMPARISON.perDeviceUsd + servers * INTL_COMPARISON.perServerUsd) * INTL_COMPARISON.usdToSar;
  return base * (1 + INTL_COMPARISON.addOnsUplift);
}
