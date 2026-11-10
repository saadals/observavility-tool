import { createRng, hashString } from './rng';
import { SITES, SITE_HOMING, getSite } from './sites';
import type {
  CarrierId,
  Condition,
  Device,
  DeviceCategory,
  DeviceType,
  MetricKey,
  NetInterface,
  SiteId,
  WanLink,
} from './types';

/** Demo clock origin — all seeded timestamps are relative to page load. */
export const T0 = Date.now();
const MIN = 60_000;
const DAY = 86_400_000;

export const TYPE_CATEGORY: Record<DeviceType, DeviceCategory> = {
  coreRouter: 'network',
  edgeRouter: 'network',
  switch: 'network',
  firewall: 'network',
  wlc: 'network',
  loadBalancer: 'network',
  server: 'compute',
  vm: 'compute',
  database: 'compute',
  ups: 'facility',
  printer: 'facility',
};

const NETWORK_METRICS: MetricKey[] = ['cpu', 'mem', 'temp', 'bwIn', 'bwOut', 'latency', 'loss'];
const COMPUTE_METRICS: MetricKey[] = ['cpu', 'mem', 'disk', 'bwIn', 'bwOut', 'latency', 'loss'];
const METRICS_BY_TYPE: Record<DeviceType, MetricKey[]> = {
  coreRouter: NETWORK_METRICS,
  edgeRouter: NETWORK_METRICS,
  switch: NETWORK_METRICS,
  firewall: NETWORK_METRICS,
  wlc: NETWORK_METRICS,
  loadBalancer: NETWORK_METRICS,
  server: COMPUTE_METRICS,
  vm: COMPUTE_METRICS,
  database: COMPUTE_METRICS,
  ups: ['load', 'battery', 'temp', 'latency'],
  printer: ['latency', 'loss'],
};

/** Generic vendor labels — deliberately not real brands. */
const VENDOR: Record<DeviceType, string> = {
  coreRouter: 'Vendor A',
  edgeRouter: 'Vendor A',
  switch: 'Vendor A',
  firewall: 'Vendor B',
  wlc: 'Vendor C',
  loadBalancer: 'Vendor D',
  server: 'Vendor E',
  vm: 'Virtual',
  database: 'Virtual',
  ups: 'Vendor F',
  printer: 'Vendor G',
};

type Composition = readonly (readonly [DeviceType, readonly string[]])[];

/**
 * Fleet composition per site. Each string is the hostname suffix (role + index).
 * Totals ~124 devices.
 */
const COMPOSITION: Record<SiteId, Composition> = {
  'ruh-dc1': [
    ['coreRouter', ['CR01', 'CR02']],
    ['firewall', ['FW01', 'FW02']],
    ['switch', ['SW01', 'SW02', 'SW03', 'SW04']],
    ['loadBalancer', ['LB01', 'LB02']],
    ['server', ['HV01', 'HV02', 'HV03', 'HV04', 'HV05', 'HV06', 'BKP01', 'NAS01']],
    ['vm', ['WEB01', 'WEB02', 'API01', 'API02', 'ERP01', 'HR01', 'IDM01', 'MQ01', 'ETL01']],
    ['database', ['DB-PAY01', 'DB-ERP01', 'DB-IDM01', 'DB-DWH01']],
    ['ups', ['UPS01', 'UPS02']],
  ],
  'jed-dc2': [
    ['coreRouter', ['CR01', 'CR02']],
    ['firewall', ['FW01', 'FW02']],
    ['switch', ['SW01', 'SW02', 'SW03']],
    ['loadBalancer', ['LB01']],
    ['server', ['HV01', 'HV02', 'HV03', 'HV04', 'BKP01']],
    ['vm', ['WEB01', 'API01', 'MAIL01', 'MAIL02', 'MOB01', 'MON01']],
    ['database', ['DB-PAY02', 'DB-HR01', 'DB-ERP02']],
    ['ups', ['UPS01', 'UPS02']],
  ],
  'ruh-hq': [
    ['edgeRouter', ['ER01', 'ER02']],
    ['firewall', ['FW01', 'FW02']],
    ['switch', ['SW01', 'SW02', 'SW03', 'SW04', 'SW05', 'SW06']],
    ['wlc', ['WLC01']],
    ['server', ['FS01', 'AD01']],
    ['ups', ['UPS01']],
    ['printer', ['PRN01', 'PRN02', 'PRN03']],
  ],
  'jed-br': [
    ['edgeRouter', ['ER01']],
    ['firewall', ['FW01']],
    ['switch', ['SW01', 'SW02', 'SW03']],
    ['wlc', ['WLC01']],
    ['server', ['FS01']],
    ['ups', ['UPS01']],
    ['printer', ['PRN01', 'PRN02']],
  ],
  'dmm-br': [
    ['edgeRouter', ['ER01']],
    ['firewall', ['FW01']],
    ['switch', ['SW01', 'SW02', 'SW03']],
    ['wlc', ['WLC01']],
    ['server', ['FS01']],
    ['ups', ['UPS01']],
    ['printer', ['PRN01']],
  ],
  'med-br': [
    ['edgeRouter', ['ER01']],
    ['firewall', ['FW01']],
    ['switch', ['SW01', 'SW02']],
    ['wlc', ['WLC01']],
    ['ups', ['UPS01']],
    ['printer', ['PRN01']],
  ],
  'mkh-br': [
    ['edgeRouter', ['ER01']],
    ['firewall', ['FW01']],
    ['switch', ['SW01', 'SW02']],
    ['wlc', ['WLC01']],
    ['ups', ['UPS01']],
    ['printer', ['PRN01']],
  ],
  'tuu-br': [
    ['edgeRouter', ['ER01']],
    ['firewall', ['FW01']],
    ['switch', ['SW01']],
    ['ups', ['UPS01']],
    ['printer', ['PRN01']],
  ],
  'neom-br': [
    ['edgeRouter', ['ER01']],
    ['firewall', ['FW01']],
    ['switch', ['SW01', 'SW02']],
    ['wlc', ['WLC01']],
    ['server', ['EDGE01']],
    ['ups', ['UPS01']],
  ],
  'ahb-br': [
    ['edgeRouter', ['ER01']],
    ['firewall', ['FW01']],
    ['switch', ['SW01']],
    ['ups', ['UPS01']],
    ['printer', ['PRN01']],
  ],
};

/**
 * Hand-picked initial problems so the demo tells a coherent story.
 * Keyed by hostname. `ago` is minutes before page load.
 */
const INITIAL_PROBLEMS: Record<string, { condition: Condition; metric?: MetricKey; ago: number }> = {
  'TUU-BR-SW01': { condition: 'down', ago: 23 },
  'MKH-BR-PRN01': { condition: 'down', ago: 190 },
  'RUH-HQ-SW05': { condition: 'down', ago: 7 },
  'NUM-BR-ER01': { condition: 'degraded', metric: 'latency', ago: 41 },
  'RUH-DC1-DB-ERP01': { condition: 'degraded', metric: 'disk', ago: 300 },
  'RUH-DC1-API02': { condition: 'degraded', metric: 'cpu', ago: 18 },
  'DMM-BR-FW01': { condition: 'degraded', metric: 'cpu', ago: 64 },
  'JED-DC2-HV02': { condition: 'degraded', metric: 'mem', ago: 95 },
  'RUH-HQ-WLC01': { condition: 'degraded', metric: 'temp', ago: 52 },
  'MED-BR-ER01': { condition: 'degraded', metric: 'loss', ago: 12 },
  'RUH-DC1-NAS01': { condition: 'degraded', metric: 'disk', ago: 720 },
  'JED-BR-UPS01': { condition: 'degraded', metric: 'battery', ago: 9 },
};

function modelFor(type: DeviceType, siteKind: string, suffix: string, pick: <T>(a: readonly T[]) => T): string {
  switch (type) {
    case 'coreRouter':
      return 'CR-9400X';
    case 'edgeRouter':
      return siteKind === 'hq' ? 'ER-4400' : 'ER-2300';
    case 'switch':
      return suffix === 'SW01' || suffix === 'SW02' ? 'DS-9500-48Y' : 'AS-2960-48P';
    case 'firewall':
      return siteKind === 'branch' ? 'NGFW-1200' : 'NGFW-3400';
    case 'wlc':
      return 'WLC-5520';
    case 'loadBalancer':
      return 'ADC-4200';
    case 'server':
      return suffix.startsWith('HV') ? 'R760-2U' : pick(['R650-1U', 'R660-1U']);
    case 'vm':
      return pick(['8 vCPU · 32 GB', '4 vCPU · 16 GB', '16 vCPU · 64 GB']);
    case 'database':
      return '16 vCPU · 128 GB';
    case 'ups':
      return siteKind === 'datacenter' ? 'UPS-40K-3P' : 'UPS-6K-RT';
    case 'printer':
      return 'MFP-4500';
  }
}

function osFor(type: DeviceType, suffix: string): string {
  switch (type) {
    case 'coreRouter':
    case 'edgeRouter':
    case 'switch':
      return 'NetOS 17.9.4';
    case 'firewall':
      return 'SecureOS 7.4.3';
    case 'wlc':
      return 'AirOS 8.10.2';
    case 'loadBalancer':
      return 'ADC-OS 17.1';
    case 'server':
      return suffix.startsWith('HV') ? 'Hypervisor 8.0 U3' : 'Linux 6.8 LTS';
    case 'vm':
      return suffix.startsWith('IDM') ? 'Server OS 2022' : 'Linux 6.8 LTS';
    case 'database':
      return 'SQL Engine 16 · Linux';
    case 'ups':
      return 'NMC 3.2';
    case 'printer':
      return 'FW 24.3';
  }
}

const SUBNET: Record<DeviceCategory, number> = { network: 0, compute: 10, facility: 250 };

function baselineFor(type: DeviceType, r: ReturnType<typeof createRng>): Partial<Record<MetricKey, number>> {
  switch (type) {
    case 'coreRouter':
      return { cpu: r.float(22, 34), mem: r.float(40, 55), temp: r.float(41, 46) };
    case 'edgeRouter':
      return { cpu: r.float(14, 28), mem: r.float(33, 48), temp: r.float(38, 44) };
    case 'switch':
      return { cpu: r.float(7, 18), mem: r.float(24, 42), temp: r.float(35, 43) };
    case 'firewall':
      return { cpu: r.float(24, 42), mem: r.float(44, 58), temp: r.float(42, 49) };
    case 'wlc':
      return { cpu: r.float(14, 28), mem: r.float(40, 54), temp: r.float(39, 45) };
    case 'loadBalancer':
      return { cpu: r.float(18, 32), mem: r.float(35, 48), temp: r.float(40, 46) };
    case 'server':
      return { cpu: r.float(32, 52), mem: r.float(58, 76), disk: r.float(42, 68) };
    case 'vm':
      return { cpu: r.float(14, 44), mem: r.float(38, 68), disk: r.float(34, 72) };
    case 'database':
      return { cpu: r.float(28, 46), mem: r.float(70, 84), disk: r.float(55, 76) };
    case 'ups':
      return { load: r.float(28, 52), battery: 100, temp: r.float(23, 27) };
    case 'printer':
      return {};
  }
}

function capacityFor(type: DeviceType, siteKind: string): number {
  switch (type) {
    case 'coreRouter':
      return 40_000;
    case 'edgeRouter':
      return siteKind === 'hq' ? 10_000 : 1_000;
    case 'switch':
      return siteKind === 'datacenter' ? 40_000 : 10_000;
    case 'firewall':
      return siteKind === 'branch' ? 1_000 : 20_000;
    case 'wlc':
      return 10_000;
    case 'loadBalancer':
      return 20_000;
    case 'server':
      return 20_000;
    case 'vm':
      return 10_000;
    case 'database':
      return 10_000;
    case 'ups':
    case 'printer':
      return 100;
  }
}

/** Primary/backup WAN profile per site. */
const WAN_PROFILE: Record<SiteId, { primary: [CarrierId, number]; backup?: [CarrierId, number] }> = {
  'ruh-hq': { primary: ['carrierA', 10_000], backup: ['carrierC', 1_000] },
  'ruh-dc1': { primary: ['carrierA', 100_000] },
  'jed-dc2': { primary: ['carrierA', 100_000] },
  'jed-br': { primary: ['carrierA', 1_000], backup: ['carrierB', 300] },
  'dmm-br': { primary: ['carrierC', 1_000], backup: ['carrierB', 300] },
  'med-br': { primary: ['carrierA', 500], backup: ['carrierD', 100] },
  'mkh-br': { primary: ['carrierA', 500], backup: ['carrierB', 300] },
  'tuu-br': { primary: ['carrierC', 500], backup: ['carrierD', 100] },
  'neom-br': { primary: ['carrierA', 1_000], backup: ['carrierB', 500] },
  'ahb-br': { primary: ['carrierC', 500], backup: ['carrierD', 100] },
};

function interfacesFor(type: DeviceType, siteId: SiteId, suffix: string, r: ReturnType<typeof createRng>): NetInterface[] {
  const u = (lo: number, hi: number) => r.float(lo, hi);
  const list: NetInterface[] = [];
  const add = (i: Omit<NetInterface, 'id'>) => list.push({ ...i, id: `${i.name}` });
  const profile = WAN_PROFILE[siteId];
  switch (type) {
    case 'coreRouter': {
      add({ name: 'Te0/0/0', kind: 'wan', speedMbps: 100_000, baseStatus: 'up', carrier: suffix === 'CR01' ? 'carrierA' : 'carrierC', utilBase: u(0.25, 0.4) });
      add({ name: 'Te0/0/1', kind: 'uplink', speedMbps: 40_000, baseStatus: 'up', utilBase: u(0.3, 0.5) });
      add({ name: 'Te0/0/2', kind: 'uplink', speedMbps: 40_000, baseStatus: 'up', utilBase: u(0.25, 0.45) });
      add({ name: 'Te0/1/0', kind: 'wan', speedMbps: 10_000, baseStatus: 'up', carrier: 'carrierA', utilBase: u(0.2, 0.35) });
      add({ name: 'Te0/1/1', kind: 'wan', speedMbps: 10_000, baseStatus: 'up', carrier: 'carrierC', utilBase: u(0.15, 0.3) });
      add({ name: 'Gi0/0/0', kind: 'mgmt', speedMbps: 1_000, baseStatus: 'up', utilBase: 0.01 });
      break;
    }
    case 'edgeRouter': {
      const backupOnly = suffix === 'ER02';
      if (!backupOnly) {
        add({ name: 'Gi0/0/0', kind: 'wan', speedMbps: profile.primary[1], baseStatus: 'up', carrier: profile.primary[0], utilBase: u(0.35, 0.6) });
      }
      if (profile.backup) {
        add({ name: 'Gi0/0/1', kind: 'wan', speedMbps: profile.backup[1], baseStatus: 'up', carrier: profile.backup[0], utilBase: backupOnly ? u(0.2, 0.35) : u(0.01, 0.04) });
      }
      add({ name: 'Gi0/0/2', kind: 'lan', speedMbps: 10_000, baseStatus: 'up', utilBase: u(0.2, 0.45) });
      add({ name: 'Mgmt0', kind: 'mgmt', speedMbps: 1_000, baseStatus: 'up', utilBase: 0.01 });
      break;
    }
    case 'firewall': {
      add({ name: 'eth1/1', kind: 'uplink', speedMbps: 10_000, baseStatus: 'up', utilBase: u(0.25, 0.5) });
      add({ name: 'eth1/2', kind: 'lan', speedMbps: 10_000, baseStatus: 'up', utilBase: u(0.25, 0.5) });
      add({ name: 'eth1/3', kind: 'lan', speedMbps: 10_000, baseStatus: r.chance(0.7) ? 'up' : 'adminDown', utilBase: u(0.05, 0.2), vlan: 30 });
      add({ name: 'mgmt', kind: 'mgmt', speedMbps: 1_000, baseStatus: 'up', utilBase: 0.01 });
      break;
    }
    case 'switch': {
      add({ name: 'Te1/1/1', kind: 'uplink', speedMbps: 10_000, baseStatus: 'up', utilBase: u(0.15, 0.4) });
      add({ name: 'Te1/1/2', kind: 'uplink', speedMbps: 10_000, baseStatus: 'up', utilBase: u(0.1, 0.3) });
      for (let p = 1; p <= 8; p++) {
        const status = r.chance(0.12) ? 'adminDown' : r.chance(0.08) ? 'down' : 'up';
        add({ name: `Gi1/0/${p}`, kind: 'lan', speedMbps: 1_000, baseStatus: status, utilBase: u(0.02, 0.35), vlan: r.pick([10, 20, 30, 40]) });
      }
      add({ name: 'Vlan99', kind: 'mgmt', speedMbps: 1_000, baseStatus: 'up', utilBase: 0.01, vlan: 99 });
      break;
    }
    case 'wlc':
    case 'loadBalancer': {
      add({ name: 'Te0/1', kind: 'uplink', speedMbps: 10_000, baseStatus: 'up', utilBase: u(0.2, 0.45) });
      add({ name: 'Te0/2', kind: 'uplink', speedMbps: 10_000, baseStatus: 'up', utilBase: u(0.15, 0.35) });
      add({ name: 'mgmt', kind: 'mgmt', speedMbps: 1_000, baseStatus: 'up', utilBase: 0.01 });
      break;
    }
    case 'server': {
      add({ name: 'eno1', kind: 'server', speedMbps: 10_000, baseStatus: 'up', utilBase: u(0.2, 0.45) });
      add({ name: 'eno2', kind: 'server', speedMbps: 10_000, baseStatus: 'up', utilBase: u(0.15, 0.4) });
      add({ name: 'bmc', kind: 'mgmt', speedMbps: 1_000, baseStatus: 'up', utilBase: 0.01 });
      break;
    }
    case 'vm':
      add({ name: 'ens192', kind: 'server', speedMbps: 10_000, baseStatus: 'up', utilBase: u(0.05, 0.3) });
      break;
    case 'database':
      add({ name: 'ens192', kind: 'server', speedMbps: 10_000, baseStatus: 'up', utilBase: u(0.15, 0.35) });
      add({ name: 'ens224', kind: 'server', speedMbps: 10_000, baseStatus: 'up', utilBase: u(0.05, 0.2) });
      break;
    case 'ups':
      add({ name: 'nmc0', kind: 'mgmt', speedMbps: 100, baseStatus: 'up', utilBase: 0.02 });
      break;
    case 'printer':
      add({ name: 'eth0', kind: 'lan', speedMbps: 1_000, baseStatus: 'up', utilBase: 0.02 });
      break;
  }
  return list;
}

function buildDevices(): Device[] {
  const devices: Device[] = [];
  SITES.forEach((site, siteIdx) => {
    const comp = COMPOSITION[site.id];
    for (const [type, suffixes] of comp) {
      suffixes.forEach((suffix, i) => {
        const category = TYPE_CATEGORY[type];
        const hostname = `${site.code}-${suffix}`;
        const id = hostname.toLowerCase();
        const seed = hashString(hostname);
        const r = createRng(seed);
        const problem = INITIAL_PROBLEMS[hostname];
        const subnet = SUBNET[category] + (type === 'vm' ? 10 : type === 'database' ? 20 : 0);
        const criticality: Device['criticality'] =
          type === 'printer' ? 'tier3' : site.kind === 'datacenter' || type === 'coreRouter' || type === 'firewall' ? 'tier1' : 'tier2';
        const interfaces = interfacesFor(type, site.id, suffix, r);
        // NEOM story: primary fibre cut, running on the 5G backup.
        if (hostname === 'NUM-BR-ER01') {
          const primary = interfaces.find((x) => x.name === 'Gi0/0/0');
          const backup = interfaces.find((x) => x.name === 'Gi0/0/1');
          if (primary) primary.baseStatus = 'down';
          if (backup) backup.utilBase = 0.72;
        }
        devices.push({
          id,
          hostname,
          type,
          category,
          siteId: site.id,
          vendor: VENDOR[type],
          model: modelFor(type, site.kind, suffix, r.pick),
          os: osFor(type, suffix),
          ip: `10.${siteIdx + 1}.${subnet}.${10 + i + (type === 'switch' ? 20 : type === 'firewall' ? 2 : type === 'loadBalancer' ? 30 : type === 'wlc' ? 40 : type === 'ups' ? 200 : type === 'printer' ? 220 : 0)}`,
          serial: `${VENDOR[type].slice(-1)}${(seed % 0xffffffff).toString(16).toUpperCase().padStart(8, '0')}`,
          rack: site.kind === 'datacenter' ? `${r.pick(['A', 'B'])}-${String(r.int(1, 14)).padStart(2, '0')}` : 'MDF-01',
          seed,
          metrics: METRICS_BY_TYPE[type],
          baseline: baselineFor(type, r),
          capacityMbps: capacityFor(type, site.kind),
          workload: site.kind === 'datacenter' ? r.float(0.35, 0.6) : r.float(0.65, 0.9),
          interfaces,
          initial: problem
            ? { condition: problem.condition, since: T0 - problem.ago * MIN, metric: problem.metric }
            : { condition: 'healthy', since: T0 - r.int(3, 80) * DAY },
          bootTime: T0 - (problem?.condition === 'down' ? 0 : r.int(2, 260) * DAY + r.int(0, 1440) * MIN),
          outageRate: type === 'printer' ? 0.035 : criticality === 'tier1' ? 0.004 : 0.012,
          criticality,
        });
      });
    }
  });

  // Topology parents (upstream device).
  const byHost = new Map(devices.map((d) => [d.hostname, d]));
  for (const d of devices) {
    const site = getSite(d.siteId);
    const h = (s: string) => byHost.get(`${site.code}-${s}`)?.id;
    const suffix = d.hostname.slice(site.code.length + 1);
    const pairIdx = suffix.endsWith('2') || suffix.endsWith('4') || suffix.endsWith('6') ? 2 : 1;
    switch (d.type) {
      case 'coreRouter':
      case 'edgeRouter':
        break;
      case 'firewall':
        d.parentId = site.kind === 'datacenter' ? h(`CR0${pairIdx}`) : h(pairIdx === 2 && h('ER02') ? 'ER02' : 'ER01');
        break;
      case 'switch':
        d.parentId = suffix === 'SW01' || suffix === 'SW02' ? h(`FW0${pairIdx}`) ?? h('FW01') : h('SW01');
        break;
      case 'wlc':
      case 'loadBalancer':
        d.parentId = h(site.kind === 'datacenter' ? (pairIdx === 2 ? 'SW02' : 'SW01') : 'SW01');
        break;
      case 'server':
        d.parentId = h(site.kind === 'datacenter' ? (h('SW04') && pairIdx === 2 ? 'SW04' : 'SW03') : 'SW01');
        break;
      case 'vm':
      case 'database': {
        const hosts = devices.filter((x) => x.siteId === d.siteId && x.hostname.includes('-HV'));
        d.parentId = hosts[d.seed % Math.max(1, hosts.length)]?.id;
        break;
      }
      case 'ups':
        d.parentId = h('SW01');
        break;
      case 'printer':
        d.parentId = h(site.kind === 'hq' ? 'SW03' : 'SW01') ?? h('SW01');
        break;
    }
  }
  return devices;
}

export const DEVICES: readonly Device[] = buildDevices();

const deviceIndex = new Map(DEVICES.map((d) => [d.id, d]));

export function getDevice(id: string): Device | undefined {
  return deviceIndex.get(id);
}

export function devicesAtSite(siteId: SiteId): Device[] {
  return DEVICES.filter((d) => d.siteId === siteId);
}

/** WAN / DCI links between sites, used by the topology map and bandwidth charts. */
function buildWanLinks(): WanLink[] {
  const links: WanLink[] = [];
  const find = (siteId: SiteId, suffix: string) => DEVICES.find((d) => d.siteId === siteId && d.hostname.endsWith(`-${suffix}`));
  // Data-centre interconnects
  const dc1a = find('ruh-dc1', 'CR01');
  const dc1b = find('ruh-dc1', 'CR02');
  const dc2a = find('jed-dc2', 'CR01');
  const dc2b = find('jed-dc2', 'CR02');
  if (dc1a && dc2a) links.push({ id: 'dci-1', from: dc1a.id, to: dc2a.id, carrier: 'carrierA', kind: 'dci', capacityMbps: 100_000, utilBase: 0.34, status: 'up' });
  if (dc1b && dc2b) links.push({ id: 'dci-2', from: dc1b.id, to: dc2b.id, carrier: 'carrierC', kind: 'dci', capacityMbps: 100_000, utilBase: 0.22, status: 'up' });

  for (const site of SITES) {
    if (site.kind === 'datacenter') continue;
    const profile = WAN_PROFILE[site.id];
    const homing = SITE_HOMING[site.id];
    const other: SiteId = homing === 'ruh-dc1' ? 'jed-dc2' : 'ruh-dc1';
    const er1 = find(site.id, 'ER01');
    const er2 = find(site.id, 'ER02') ?? er1;
    const core1 = find(homing, 'CR01');
    const core2 = find(site.kind === 'hq' ? homing : other, site.kind === 'hq' ? 'CR02' : 'CR02');
    if (er1 && core1) {
      const primaryDown = site.id === 'neom-br';
      links.push({
        id: `wan-${site.id}-p`,
        from: er1.id,
        to: core1.id,
        carrier: profile.primary[0],
        kind: 'primary',
        capacityMbps: profile.primary[1],
        utilBase: createRng(`${site.id}-p`).float(0.35, 0.62),
        status: primaryDown ? 'down' : 'up',
      });
    }
    if (profile.backup && er2 && core2) {
      links.push({
        id: `wan-${site.id}-b`,
        from: er2.id,
        to: core2.id,
        carrier: profile.backup[0],
        kind: 'backup',
        capacityMbps: profile.backup[1],
        utilBase: site.id === 'neom-br' ? 0.72 : site.kind === 'hq' ? 0.28 : 0.03,
        status: site.id === 'neom-br' || site.kind === 'hq' ? 'up' : 'standby',
      });
    }
  }
  return links;
}

export const WAN_LINKS: readonly WanLink[] = buildWanLinks();

export function siteWanCapacity(siteId: SiteId): number {
  return WAN_LINKS.filter((l) => getDevice(l.from)?.siteId === siteId && l.kind !== 'backup').reduce((s, l) => s + l.capacityMbps, 0);
}
