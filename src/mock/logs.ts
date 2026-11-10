import { DEVICES, T0 } from './devices';
import { APPS } from './apps';
import { createRng, type Rng } from './rng';
import { MINUTE, HOUR, DAY, SECOND } from './signals';
import type { Device, LogEntry, LogFacility, LogLevel } from './types';

/**
 * Log line generator. Messages are realistic raw log text (they are data, so they are
 * not translated); application logs include Arabic-language entries, as Saudi business
 * applications commonly emit them.
 *
 * External IPs use RFC 5737 documentation ranges only.
 */

type Template = {
  level: LogLevel;
  facility: LogFacility;
  weight: number;
  render: (r: Rng, d: Device | null) => string;
};

const extIp = (r: Rng) => `${r.pick(['203.0.113', '198.51.100', '192.0.2'])}.${r.int(2, 254)}`;
const intIp = (r: Rng) => `10.${r.int(1, 10)}.${r.pick([0, 10, 20, 30])}.${r.int(2, 250)}`;
const ifaceOf = (r: Rng, d: Device | null) => (d ? r.pick(d.interfaces).name : 'Gi1/0/1');
const uid = (r: Rng) => `U${r.int(100000, 999999)}`;
const users = ['netops', 'svc_backup', 'a.alharbi', 'm.alqahtani', 's.alotaibi', 'monitor'];

const NETWORK: Template[] = [
  { level: 'info', facility: 'network', weight: 6, render: (r, d) => `%LINK-3-UPDOWN: Interface ${ifaceOf(r, d)}, changed state to up` },
  { level: 'warning', facility: 'network', weight: 2, render: (r, d) => `%LINEPROTO-5-UPDOWN: Line protocol on Interface ${ifaceOf(r, d)}, changed state to down` },
  { level: 'info', facility: 'network', weight: 3, render: (r) => `%SYS-5-CONFIG_I: Configured from console by ${r.pick(users)} on vty0 (${intIp(r)})` },
  { level: 'info', facility: 'network', weight: 3, render: (r) => `%BGP-5-ADJCHANGE: neighbor ${intIp(r)} Up` },
  { level: 'error', facility: 'network', weight: 1, render: (r) => `%BGP-5-ADJCHANGE: neighbor ${intIp(r)} Down - Hold timer expired` },
  { level: 'info', facility: 'network', weight: 3, render: (r, d) => `%OSPF-5-ADJCHG: Process 10, Nbr ${intIp(r)} on ${ifaceOf(r, d)} from LOADING to FULL, Loading Done` },
  { level: 'debug', facility: 'network', weight: 6, render: (r) => `SNMP poll completed in ${r.int(40, 900)} ms (${r.int(80, 640)} OIDs)` },
  { level: 'warning', facility: 'network', weight: 1, render: () => `%PLATFORM-4-ELEMENT_WARNING: Fan tray 2 speed above threshold` },
  { level: 'info', facility: 'network', weight: 3, render: (r, d) => `%SPANTREE-6-PORT_STATE: Port ${ifaceOf(r, d)} instance 10 moving from learning to forwarding` },
  { level: 'warning', facility: 'network', weight: 1, render: (r, d) => `%QOS-4-POLICER: Rate exceeded on ${ifaceOf(r, d)} class VOICE (${r.int(101, 140)}% of CIR)` },
];

const SECURITY: Template[] = [
  { level: 'info', facility: 'security', weight: 8, render: (r) => `ALLOW TCP ${intIp(r)}:${r.int(30000, 65000)} -> ${intIp(r)}:443 policy=web-dmz bytes=${r.int(800, 92000)}` },
  { level: 'warning', facility: 'security', weight: 4, render: (r) => `DENY TCP ${extIp(r)}:${r.int(30000, 65000)} -> 10.1.0.2:22 policy=deny-inbound-mgmt` },
  { level: 'warning', facility: 'security', weight: 2, render: (r) => `IPS signature ${r.int(20000, 39999)} matched: SQL injection attempt from ${extIp(r)} blocked` },
  { level: 'error', facility: 'security', weight: 1, render: (r) => `IPsec tunnel to ${r.pick(['JED-DC2', 'RUH-DC1'])} rekey failed (DPD timeout), retrying` },
  { level: 'info', facility: 'security', weight: 2, render: (r) => `Threat intelligence feed updated: ${r.int(40, 900)} new indicators` },
  { level: 'critical', facility: 'security', weight: 0.4, render: (r) => `Brute-force pattern detected: ${r.int(120, 600)} failed VPN logins from ${extIp(r)} in 5 min — source blocked` },
];

const AUTH: Template[] = [
  { level: 'info', facility: 'auth', weight: 4, render: (r) => `Accepted publickey for ${r.pick(users)} from ${intIp(r)} port ${r.int(40000, 65000)} ssh2` },
  { level: 'warning', facility: 'auth', weight: 2, render: (r) => `Failed password for invalid user ${r.pick(['admin', 'test', 'oracle', 'root'])} from ${extIp(r)} port ${r.int(1024, 65000)} ssh2` },
  { level: 'info', facility: 'auth', weight: 3, render: (r, d) => `RADIUS: user ${r.pick(users)} authenticated (802.1X) on ${ifaceOf(r, d)}` },
];

const SYSTEM: Template[] = [
  { level: 'info', facility: 'system', weight: 4, render: () => `systemd[1]: Started Daily backup verification job.` },
  { level: 'debug', facility: 'system', weight: 6, render: (r) => `node_exporter: scrape completed (${r.int(900, 2400)} metrics, ${r.int(8, 60)} ms)` },
  { level: 'warning', facility: 'system', weight: 2, render: (r) => `/var usage at ${r.int(85, 89)}% (threshold 85%)` },
  { level: 'warning', facility: 'system', weight: 1, render: () => `kernel: TCP: request_sock_TCP: Possible SYN flooding on port 443. Sending cookies.` },
  { level: 'error', facility: 'system', weight: 1, render: (r) => `kernel: EXT4-fs warning (device dm-${r.int(0, 4)}): ext4_dx_add_entry: Directory index full!` },
  { level: 'critical', facility: 'system', weight: 0.3, render: (r) => `kernel: Out of memory: Killed process ${r.int(2000, 60000)} (java) total-vm:${r.int(8, 16)}482312kB` },
  { level: 'info', facility: 'system', weight: 3, render: (r) => `chronyd: Selected source 10.1.0.${r.int(1, 4)} (stratum 2), offset ${r.int(1, 40) / 10} ms` },
];

const DATABASE: Template[] = [
  { level: 'info', facility: 'database', weight: 4, render: (r) => `checkpoint complete: wrote ${r.int(300, 9000)} buffers (${r.int(1, 9)}.${r.int(0, 9)}%); write=${r.int(10, 270)}.${r.int(100, 999)} s` },
  { level: 'warning', facility: 'database', weight: 2, render: (r) => `slow query (${r.int(1200, 9000)} ms): SELECT * FROM invoices WHERE status = $1 AND created_at > $2` },
  { level: 'info', facility: 'database', weight: 3, render: (r) => `replication lag to replica: ${r.int(2, 180)} ms` },
  { level: 'error', facility: 'database', weight: 0.6, render: () => `deadlock detected: process waits for ShareLock on transaction; blocked by another process` },
];

const ARABIC_APP: Template[] = [
  { level: 'info', facility: 'application', weight: 4, render: (r) => `تم تسجيل دخول المستخدم ${uid(r)} بنجاح` },
  { level: 'info', facility: 'application', weight: 3, render: (r) => `تم إنشاء طلب جديد رقم ${r.int(200000, 999999)} من بوابة العملاء` },
  { level: 'warning', facility: 'application', weight: 2, render: (r) => `استجابة بطيئة من خدمة المدفوعات (${r.int(900, 4200)} مللي ثانية)` },
  { level: 'error', facility: 'application', weight: 1.2, render: (r) => `فشل التحقق من رمز التحقق لمرة واحدة (OTP) للمستخدم ${uid(r)}` },
  { level: 'info', facility: 'application', weight: 2, render: (r) => `تمت مزامنة ${r.int(20, 900)} سجل موظف مع نظام الموارد البشرية` },
  { level: 'error', facility: 'application', weight: 0.8, render: () => `تعذّر الاتصال بقاعدة البيانات، ستتم إعادة المحاولة خلال 5 ثوانٍ` },
  { level: 'warning', facility: 'application', weight: 1.2, render: (r) => `تجاوز الحساب ${uid(r)} الحد المسموح به لمحاولات الدخول` },
  { level: 'info', facility: 'application', weight: 2, render: (r) => `تم إرسال إشعار رسالة نصية إلى العميل ${uid(r)} بنجاح` },
  { level: 'info', facility: 'application', weight: 1.5, render: (r) => `تم إصدار فاتورة إلكترونية رقم INV-${r.int(10000, 99999)} وإرسالها للعميل` },
];

const ENGLISH_APP: Template[] = [
  { level: 'info', facility: 'application', weight: 6, render: (r) => `GET /api/v1/payments/status 200 ${r.int(18, 180)}ms` },
  { level: 'info', facility: 'application', weight: 5, render: (r) => `POST /api/v1/auth/login 200 ${r.int(30, 220)}ms` },
  { level: 'warning', facility: 'application', weight: 2, render: (r) => `POST /api/v1/payments 504 Gateway Timeout upstream=payments ${r.int(3000, 9000)}ms` },
  { level: 'error', facility: 'application', weight: 1, render: (r) => `Unhandled exception in InvoiceService: NullReferenceException at InvoiceMapper.cs:${r.int(80, 400)}` },
  { level: 'debug', facility: 'application', weight: 4, render: (r) => `cache hit ratio ${r.int(82, 99)}% (keys=${r.int(2000, 90000)})` },
  { level: 'info', facility: 'application', weight: 2, render: (r) => `Health check OK (${r.int(2, 25)} ms)` },
];

const UPS: Template[] = [
  { level: 'info', facility: 'system', weight: 3, render: (r) => `Self-test passed. Battery health ${r.int(92, 100)}%.` },
  { level: 'debug', facility: 'system', weight: 3, render: (r) => `Input ${r.int(226, 234)} V / ${r.int(59, 60)}.${r.int(0, 9)} Hz, output load ${r.int(25, 55)}%` },
];

const PRINTER: Template[] = [
  { level: 'info', facility: 'system', weight: 4, render: (r) => `Job ${r.int(1000, 9999)} completed (${r.int(1, 24)} pages)` },
  { level: 'warning', facility: 'system', weight: 1, render: (r) => `Toner low (cartridge K, ${r.int(4, 12)}% remaining)` },
];

function templatesFor(d: Device): Template[] {
  switch (d.type) {
    case 'firewall':
      return [...SECURITY, ...AUTH];
    case 'coreRouter':
    case 'edgeRouter':
    case 'switch':
    case 'wlc':
    case 'loadBalancer':
      return [...NETWORK, ...AUTH];
    case 'database':
      return [...DATABASE, ...SYSTEM];
    case 'server':
    case 'vm':
      return [...SYSTEM, ...AUTH];
    case 'ups':
      return UPS;
    case 'printer':
      return PRINTER;
  }
}

let logSeq = 0;

/** Create one random log entry at time `ts`. */
export function makeLog(r: Rng, ts: number): LogEntry {
  // ~30% of lines come from applications (half of those in Arabic).
  if (r.chance(0.3)) {
    const app = r.pick(APPS);
    const pool = r.chance(0.5) ? ARABIC_APP : ENGLISH_APP;
    const tpl = r.weighted(pool.map((p) => [p, p.weight] as const));
    return { id: `L${++logSeq}`, ts, level: tpl.level, facility: tpl.facility, source: app.id, deviceId: app.hosts[0], message: tpl.render(r, null) };
  }
  const d = r.pick(DEVICES);
  const pool = templatesFor(d);
  const tpl = r.weighted(pool.map((p) => [p, p.weight] as const));
  return { id: `L${++logSeq}`, ts, level: tpl.level, facility: tpl.facility, source: d.hostname, deviceId: d.id, message: tpl.render(r, d) };
}

/** Story log lines that explain the seeded incidents. */
function storyLogs(): LogEntry[] {
  const at = (ago: number) => T0 - ago;
  const L = (ago: number, level: LogLevel, facility: LogFacility, source: string, message: string): LogEntry => ({
    id: `L${++logSeq}`,
    ts: at(ago),
    level,
    facility,
    source,
    deviceId: source.toLowerCase(),
    message,
  });
  return [
    L(41 * MINUTE, 'critical', 'network', 'NUM-BR-ER01', '%LINK-3-UPDOWN: Interface Gi0/0/0 (WAN1 Carrier A fiber), changed state to down'),
    L(41 * MINUTE - 4 * SECOND, 'warning', 'network', 'NUM-BR-ER01', '%TRACK-6-STATE: 10 ip sla 1 reachability Up -> Down — failing over to WAN2 (Carrier B 5G)'),
    L(41 * MINUTE - 9 * SECOND, 'info', 'network', 'NUM-BR-ER01', '%BGP-5-ADJCHANGE: neighbor 10.2.0.1 Up via Gi0/0/1 (backup path active)'),
    L(23 * MINUTE, 'critical', 'network', 'TUU-BR-ER01', '%LINK-3-UPDOWN: Interface Gi0/0/2, changed state to down (downstream TUU-BR-SW01 unreachable)'),
    L(23 * MINUTE - 30 * SECOND, 'error', 'system', 'TUU-BR-SW01', 'ICMP echo timeout from 10.8.0.30 (3/3 probes lost)'),
    L(7 * MINUTE, 'error', 'network', 'RUH-HQ-SW01', '%LINK-3-UPDOWN: Interface Te1/0/5 (to RUH-HQ-SW05), changed state to down'),
    L(300 * MINUTE, 'warning', 'database', 'RUH-DC1-DB-ERP01', 'tablespace usage on /data reached 90% (threshold 90%)'),
    L(42 * MINUTE, 'error', 'database', 'RUH-DC1-DB-ERP01', 'could not extend file "base/16384/2619": No space left on device — retrying after autovacuum'),
    L(18 * MINUTE, 'warning', 'system', 'RUH-DC1-API02', 'load average: 14.22, 11.80, 8.04 (8 vCPU) — worker pool saturated'),
    L(17 * MINUTE, 'warning', 'application', 'api-gateway', 'upstream ruh-dc1-api02 p95 latency 1840 ms exceeds 800 ms — shedding 5% of traffic to jed-dc2-api01'),
    L(9 * MINUTE, 'critical', 'system', 'JED-BR-UPS01', 'UPS on battery power — input voltage 0 V, estimated runtime 18 min'),
    L(12 * MINUTE, 'warning', 'network', 'MED-BR-ER01', 'IP SLA probe to 10.2.0.1: packet loss 2.4% (threshold 1%) on Gi0/0/0 (Carrier A fiber)'),
    L(52 * MINUTE, 'warning', 'system', 'RUH-HQ-WLC01', 'Chassis temperature 70°C exceeds 65°C threshold — check comms room cooling'),
    L(64 * MINUTE, 'warning', 'security', 'DMM-BR-FW01', 'Session table at 87% capacity (870,112 / 1,000,000)'),
    L(95 * MINUTE, 'info', 'network', 'DMM-BR-FW01', 'Policy package "branch-v42" installed by netops (12 rules changed)'),
    L(34 * MINUTE, 'warning', 'network', 'JED-BR-SW02', '%PM-4-ERR_DISABLE: link-flap error detected on Gi1/0/5, putting Gi1/0/5 in err-disable state'),
    L(95 * MINUTE, 'warning', 'system', 'JED-DC2-HV02', 'Host memory usage 93% — 4 VMs ballooning, consider rebalancing the cluster'),
    L(190 * MINUTE, 'error', 'system', 'MKH-BR-PRN01', 'SNMP agent not responding (timeout 5 s)'),
  ];
}

function buildInitialLogs(): LogEntry[] {
  const r = createRng('logs-v1');
  const logs: LogEntry[] = storyLogs();
  // Denser in the recent past so every time range looks populated.
  const bands: [number, number, number][] = [
    [0, 15 * MINUTE, 420],
    [15 * MINUTE, HOUR, 520],
    [HOUR, 24 * HOUR, 1300],
    [24 * HOUR, 7 * DAY, 1100],
  ];
  for (const [from, to, n] of bands) {
    for (let i = 0; i < n; i++) {
      logs.push(makeLog(r, T0 - r.float(from, to)));
    }
  }
  return logs.sort((a, b) => b.ts - a.ts);
}

export const INITIAL_LOGS: readonly LogEntry[] = buildInitialLogs();

/** RNG for live log lines (seeded so a demo replays similarly). */
export const liveLogRng = createRng('logs-live-v1');
