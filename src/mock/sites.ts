import type { CarrierId, Operator, Site, SiteId } from './types';

/**
 * Saudi sites in the demo fleet. Names are translated (`sites.<id>.name`);
 * coordinates are approximate city locations (lon/lat) used by the SVG map.
 */
export const SITES: readonly Site[] = [
  { id: 'ruh-hq', code: 'RUH-HQ', kind: 'hq', lon: 46.68, lat: 24.77, baseLatencyMs: 1.8 },
  { id: 'ruh-dc1', code: 'RUH-DC1', kind: 'datacenter', lon: 46.84, lat: 24.6, baseLatencyMs: 0.4 },
  { id: 'jed-dc2', code: 'JED-DC2', kind: 'datacenter', lon: 39.27, lat: 21.68, baseLatencyMs: 0.5 },
  { id: 'jed-br', code: 'JED-BR', kind: 'branch', lon: 39.17, lat: 21.49, baseLatencyMs: 2.6 },
  { id: 'dmm-br', code: 'DMM-BR', kind: 'branch', lon: 50.15, lat: 26.36, baseLatencyMs: 7.5 },
  { id: 'med-br', code: 'MED-BR', kind: 'branch', lon: 39.61, lat: 24.47, baseLatencyMs: 9.2 },
  { id: 'mkh-br', code: 'MKH-BR', kind: 'branch', lon: 39.83, lat: 21.39, baseLatencyMs: 3.4 },
  { id: 'tuu-br', code: 'TUU-BR', kind: 'branch', lon: 36.57, lat: 28.38, baseLatencyMs: 16.5 },
  { id: 'neom-br', code: 'NUM-BR', kind: 'branch', lon: 35.3, lat: 27.95, baseLatencyMs: 19.8 },
  { id: 'ahb-br', code: 'AHB-BR', kind: 'branch', lon: 42.51, lat: 18.22, baseLatencyMs: 12.4 },
] as const;

export const SITE_IDS: readonly SiteId[] = SITES.map((s) => s.id);

const siteIndex = new Map<SiteId, Site>(SITES.map((s) => [s.id, s]));

export function getSite(id: SiteId): Site {
  const site = siteIndex.get(id);
  if (!site) throw new Error(`Unknown site ${id}`);
  return site;
}

/** Which data center each site homes to (primary WAN path). */
export const SITE_HOMING: Record<SiteId, SiteId> = {
  'ruh-hq': 'ruh-dc1',
  'ruh-dc1': 'jed-dc2',
  'jed-dc2': 'ruh-dc1',
  'jed-br': 'jed-dc2',
  'dmm-br': 'ruh-dc1',
  'med-br': 'jed-dc2',
  'mkh-br': 'jed-dc2',
  'tuu-br': 'ruh-dc1',
  'neom-br': 'ruh-dc1',
  'ahb-br': 'jed-dc2',
};

/** Generic, fictional carriers. Display names live in the translation files (`carriers.*`). */
export const CARRIERS: readonly CarrierId[] = ['carrierA', 'carrierB', 'carrierC', 'carrierD'];

/** NOC operators who appear as acknowledgers in seeded alerts. */
export const OPERATORS: readonly Operator[] = [
  { id: 'op-faisal', name: { en: 'Faisal A.', ar: 'فيصل ع.' } },
  { id: 'op-noura', name: { en: 'Noura S.', ar: 'نورة س.' } },
  { id: 'op-omar', name: { en: 'Omar K.', ar: 'عمر ك.' } },
  { id: 'op-reem', name: { en: 'Reem H.', ar: 'ريم ح.' } },
  { id: 'op-system', name: { en: 'Auto-resolve', ar: 'حل تلقائي' } },
];

/**
 * Simplified outline of Saudi Arabia as [lon, lat] pairs (clockwise from the Gulf of Aqaba).
 * It is intentionally stylised — good enough to place site markers, not a survey-grade border.
 */
export const KSA_OUTLINE: readonly (readonly [number, number])[] = [
  [34.95, 29.36],
  [36.07, 29.19],
  [36.5, 29.5],
  [36.76, 29.87],
  [37.5, 30.0],
  [37.67, 30.34],
  [37.99, 30.5],
  [37.0, 31.5],
  [38.0, 31.84],
  [39.2, 32.16],
  [40.4, 31.89],
  [41.89, 31.19],
  [44.71, 29.18],
  [46.55, 29.1],
  [47.46, 29.0],
  [47.71, 28.53],
  [48.42, 28.55],
  [48.81, 27.69],
  [49.3, 27.46],
  [49.58, 26.95],
  [50.12, 26.69],
  [50.21, 26.18],
  [50.11, 25.94],
  [50.24, 25.61],
  [50.53, 25.33],
  [50.81, 24.75],
  [51.11, 24.56],
  [51.39, 24.63],
  [51.58, 24.25],
  [51.62, 24.01],
  [52.0, 23.0],
  [55.0, 22.5],
  [55.67, 22.0],
  [55.0, 20.0],
  [52.0, 19.0],
  [49.12, 18.62],
  [48.18, 18.17],
  [47.47, 17.12],
  [47.0, 16.95],
  [46.75, 17.28],
  [46.37, 17.23],
  [45.4, 17.33],
  [45.22, 17.43],
  [44.06, 17.41],
  [43.79, 17.32],
  [43.38, 17.58],
  [43.12, 17.09],
  [43.22, 16.67],
  [42.78, 16.35],
  [42.65, 16.77],
  [42.35, 17.08],
  [42.27, 17.47],
  [41.75, 17.83],
  [41.22, 18.67],
  [40.94, 19.49],
  [40.25, 20.17],
  [39.8, 20.34],
  [39.14, 21.29],
  [39.02, 21.99],
  [39.07, 22.58],
  [38.49, 23.69],
  [38.02, 24.08],
  [37.48, 24.29],
  [37.15, 24.86],
  [37.21, 25.08],
  [36.93, 25.6],
  [36.64, 25.83],
  [36.25, 26.57],
  [35.64, 27.38],
  [35.13, 28.06],
  [34.63, 28.06],
  [34.79, 28.61],
  [34.83, 28.96],
];
