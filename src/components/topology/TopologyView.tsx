import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import { useRouter } from 'next/router';
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DeviceIcon } from '@/components/ui/DeviceIcon';
import {
  DEVICES,
  SITES,
  SITE_HOMING,
  WAN_LINKS,
  deviceStatus,
  getDevice,
  wanLinkUtil,
  type Device,
  type DeviceStatus,
  type EpisodeMap,
  type SiteId,
} from '@/mock';
import { cn } from '@/lib/cn';
import { useFormat } from '@/lib/hooks';
import { useLive, type LiveMetrics } from '@/store/live';

const NODE_W = 172;
const COL = 192;
const STATUS_COLOR: Record<DeviceStatus, string> = { up: 'var(--ok)', warning: 'var(--warn)', down: 'var(--crit)' };

type DeviceNodeData = {
  device: Device;
  status: DeviceStatus;
  metric: string;
  typeLabel: string;
  highlight: boolean;
  rtl: boolean;
};
type LabelNodeData = { label: string; tone: 'ok' | 'warn' | 'crit'; rtl: boolean; dc: boolean };

const HANDLES = (['top', 'bottom', 'left', 'right'] as const).map((side) => ({
  side,
  pos: { top: Position.Top, bottom: Position.Bottom, left: Position.Left, right: Position.Right }[side],
}));

function HiddenHandles() {
  return (
    <>
      {HANDLES.map(({ side, pos }) => (
        <span key={side}>
          <Handle type="source" id={`s-${side}`} position={pos} isConnectable={false} className="!pointer-events-none !opacity-0" />
          <Handle type="target" id={`t-${side}`} position={pos} isConnectable={false} className="!pointer-events-none !opacity-0" />
        </span>
      ))}
    </>
  );
}

const DeviceNode = memo(function DeviceNode({ data }: NodeProps<Node<DeviceNodeData>>) {
  const { device, status, metric, typeLabel, highlight, rtl } = data;
  return (
    <div
      dir={rtl ? 'rtl' : 'ltr'}
      style={{ width: NODE_W, borderColor: status === 'up' ? undefined : STATUS_COLOR[status] }}
      className={cn(
        'cursor-pointer rounded-xl border border-line bg-surface px-2.5 py-2 shadow-card transition-shadow hover:shadow-pop',
        highlight && 'ring-2 ring-brand ring-offset-2 ring-offset-bg',
        status === 'down' && 'bg-crit/8',
      )}
    >
      <HiddenHandles />
      <div className="flex items-center gap-2">
        <span className={cn('grid size-6 shrink-0 place-items-center rounded-md', status === 'up' ? 'bg-brand/12 text-brand' : status === 'warning' ? 'bg-warn/15 text-warn' : 'bg-crit/15 text-crit')}>
          <DeviceIcon type={device.type} className="size-3.5" />
        </span>
        <span className="ltr-text min-w-0 flex-1 truncate text-[11.5px] font-semibold text-fg">{device.hostname}</span>
        <span className="relative size-2 shrink-0 rounded-full" style={{ background: STATUS_COLOR[status] }}>
          {status === 'down' && <span className="absolute inset-0 animate-ping-soft rounded-full" style={{ background: STATUS_COLOR[status] }} />}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 text-[10.5px] text-subtle">
        <span className="truncate">{typeLabel}</span>
        <span className="shrink-0 tabular">{metric}</span>
      </div>
    </div>
  );
});

const LabelNode = memo(function LabelNode({ data }: NodeProps<Node<LabelNodeData>>) {
  const color = data.tone === 'crit' ? 'var(--crit)' : data.tone === 'warn' ? 'var(--warn)' : 'var(--ok)';
  return (
    <div dir={data.rtl ? 'rtl' : 'ltr'} className={cn('pointer-events-none flex items-center gap-1.5 whitespace-nowrap text-[12px] font-semibold', data.dc ? 'text-accent' : 'text-muted')}>
      <span className="size-2 rounded-full" style={{ background: color }} />
      {data.label}
    </div>
  );
});

const nodeTypes = { device: DeviceNode, label: LabelNode };

interface Placed {
  device: Device;
  cx: number;
  y: number;
}

/**
 * Backbone: data-center core routers in the middle row; the sites homed to each DC are
 * split into a tier above (switch → firewall → edge router) and a tier below
 * (edge router → firewall → switch), keeping every WAN link short and readable.
 */
function backboneLayout(): { placed: Placed[]; labels: { id: string; siteId: SiteId; cx: number; y: number; dc: boolean }[] } {
  const placed: Placed[] = [];
  const labels: { id: string; siteId: SiteId; cx: number; y: number; dc: boolean }[] = [];
  const dcs: SiteId[] = ['ruh-dc1', 'jed-dc2'];
  const ROW = 100;
  const CORE_Y = 340;
  let x = 0;
  dcs.forEach((dcId) => {
    const homed = SITES.filter((s) => s.kind !== 'datacenter' && SITE_HOMING[s.id] === dcId).map((s) => s.id);
    const tiers: SiteId[][] = [homed.slice(0, 2), homed.slice(2)];
    const widthOf = (siteId: SiteId) => COL * Math.max(1, DEVICES.filter((d) => d.siteId === siteId && d.type === 'edgeRouter').length);
    const groupWidth = Math.max(...tiers.map((tier) => tier.reduce((w, id) => w + widthOf(id), 0)));
    tiers.forEach((tier, ti) => {
      const tierWidth = tier.reduce((w, id) => w + widthOf(id), 0);
      let cursor = x + (groupWidth - tierWidth) / 2;
      for (const siteId of tier) {
        const devs = DEVICES.filter((d) => d.siteId === siteId);
        const routers = devs.filter((d) => d.type === 'edgeRouter');
        const fws = devs.filter((d) => d.type === 'firewall');
        const core = devs.filter((d) => d.type === 'switch').slice(0, routers.length > 1 ? 2 : 1);
        const w = widthOf(siteId);
        const cx = cursor + w / 2;
        const row = (list: Device[], y: number) => list.forEach((d, i) => placed.push({ device: d, cx: cx + (i - (list.length - 1) / 2) * COL, y }));
        if (ti === 0) {
          labels.push({ id: `lbl-${siteId}`, siteId, cx, y: -34, dc: false });
          row(core, 0);
          row(fws, ROW);
          row(routers, ROW * 2);
        } else {
          labels.push({ id: `lbl-${siteId}`, siteId, cx, y: CORE_Y + 112, dc: false });
          row(routers, CORE_Y + 140);
          row(fws, CORE_Y + 140 + ROW);
          row(core, CORE_Y + 140 + ROW * 2);
        }
        cursor += w;
      }
    });
    const center = x + groupWidth / 2;
    const cores = DEVICES.filter((d) => d.siteId === dcId && d.type === 'coreRouter');
    cores.forEach((d, i) => placed.push({ device: d, cx: center + (i - (cores.length - 1) / 2) * COL, y: CORE_Y }));
    labels.push({ id: `lbl-${dcId}`, siteId: dcId, cx: center, y: CORE_Y - 30, dc: true });
    x += groupWidth + 170;
  });
  return { placed, labels };
}

/** Site detail: a layered tree built from upstream (parent) relationships. */
function siteLayout(siteId: SiteId): Placed[] {
  const devs = DEVICES.filter((d) => d.siteId === siteId);
  const inSite = new Set(devs.map((d) => d.id));
  const depth = new Map<string, number>();
  const depthOf = (d: Device): number => {
    const cached = depth.get(d.id);
    if (cached !== undefined) return cached;
    const parent = d.parentId && inSite.has(d.parentId) ? getDevice(d.parentId) : undefined;
    const v = parent ? depthOf(parent) + 1 : 0;
    depth.set(d.id, v);
    return v;
  };
  const rows = new Map<number, Device[]>();
  for (const d of devs) {
    const dp = depthOf(d);
    rows.set(dp, [...(rows.get(dp) ?? []), d]);
  }
  const placed: Placed[] = [];
  const order = new Map<string, number>();
  [...rows.keys()]
    .sort((a, b) => a - b)
    .forEach((dp) => {
      const list = (rows.get(dp) ?? []).sort((a, b) => (order.get(a.parentId ?? '') ?? 0) - (order.get(b.parentId ?? '') ?? 0) || a.hostname.localeCompare(b.hostname));
      list.forEach((d, i) => {
        const cx = (i - (list.length - 1) / 2) * COL;
        order.set(d.id, cx);
        placed.push({ device: d, cx, y: dp * 125 });
      });
    });
  return placed;
}

function metricText(d: Device, m: LiveMetrics | undefined, status: DeviceStatus, f: ReturnType<typeof useFormat>): string {
  if (status === 'down' || !m) return '—';
  if (typeof m.cpu === 'number') return `CPU ${f.number(m.cpu)}%`;
  if (typeof m.load === 'number') return `${f.number(m.load)}%`;
  if (typeof m.latency === 'number') return f.ms(m.latency);
  return '';
}

function pickHandles(a: { x: number; y: number }, b: { x: number; y: number }) {
  if (b.y - a.y > 40) return { sourceHandle: 's-bottom', targetHandle: 't-top' };
  if (a.y - b.y > 40) return { sourceHandle: 's-top', targetHandle: 't-bottom' };
  return b.x > a.x ? { sourceHandle: 's-right', targetHandle: 't-left' } : { sourceHandle: 's-left', targetHandle: 't-right' };
}

export function TopologyView({ mode, siteId, focusId }: { mode: 'backbone' | 'site'; siteId: SiteId; focusId?: string }) {
  const { t, i18n } = useTranslation();
  const f = useFormat();
  const router = useRouter();
  const rtl = i18n.language === 'ar';
  const episodes: EpisodeMap = useLive((s) => s.episodes);
  const live = useLive((s) => s.live);
  const now = useLive((s) => s.now);

  const layout = useMemo(() => (mode === 'backbone' ? backboneLayout() : { placed: siteLayout(siteId), labels: [] }), [mode, siteId]);

  const { nodes, edges } = useMemo(() => {
    const pos = new Map<string, { x: number; y: number }>();
    const nodes: Node[] = [];
    for (const p of layout.placed) {
      const x = (rtl ? -p.cx : p.cx) - NODE_W / 2;
      pos.set(p.device.id, { x, y: p.y });
      const status = deviceStatus(episodes[p.device.id]);
      nodes.push({
        id: p.device.id,
        type: 'device',
        position: { x, y: p.y },
        data: {
          device: p.device,
          status,
          metric: metricText(p.device, live[p.device.id], status, f),
          typeLabel: t(`deviceTypes.${p.device.type}`),
          highlight: p.device.id === focusId,
          rtl,
        } satisfies DeviceNodeData,
        draggable: false,
      });
    }
    for (const l of layout.labels) {
      const devs = DEVICES.filter((d) => d.siteId === l.siteId);
      const sts = devs.map((d) => deviceStatus(episodes[d.id]));
      const tone = sts.includes('down') ? 'crit' : sts.includes('warning') ? 'warn' : 'ok';
      const label = l.dc ? t('topology.dcGroup', { site: t(`sites.${l.siteId}`) }) : t(`sites.${l.siteId}`);
      nodes.push({
        id: l.id,
        type: 'label',
        position: { x: (rtl ? -l.cx : l.cx) - 80, y: l.y },
        data: { label, tone, rtl, dc: l.dc } satisfies LabelNodeData,
        draggable: false,
        selectable: false,
        style: { width: 160, display: 'flex', justifyContent: 'center' },
      });
    }

    const edges: Edge[] = [];
    const labelStyle = { fill: 'var(--text-muted)', fontSize: 10.5, direction: rtl ? ('rtl' as const) : ('ltr' as const) };
    const labelBg = { fill: 'var(--surface)', fillOpacity: 0.92 };
    // Intra-site uplinks
    for (const p of layout.placed) {
      const parent = p.device.parentId;
      if (!parent || !pos.has(parent)) continue;
      const a = pos.get(parent);
      const b = pos.get(p.device.id);
      if (!a || !b) continue;
      const st = deviceStatus(episodes[p.device.id]);
      edges.push({
        id: `e-${parent}-${p.device.id}`,
        source: parent,
        target: p.device.id,
        ...pickHandles(a, b),
        type: 'smoothstep',
        style: { stroke: st === 'down' ? 'var(--crit)' : 'var(--border-strong)', strokeWidth: 1.4, strokeDasharray: st === 'down' ? '5 4' : undefined },
      });
    }
    // WAN + DCI links (core → site router so they flow downwards)
    for (const l of WAN_LINKS) {
      if (!pos.has(l.from) || !pos.has(l.to)) continue;
      const source = l.kind === 'dci' ? l.from : l.to;
      const target = l.kind === 'dci' ? l.to : l.from;
      const a = pos.get(source);
      const b = pos.get(target);
      if (!a || !b) continue;
      const util = Math.round(wanLinkUtil(l, now) * 100);
      const color = l.status === 'down' ? 'var(--crit)' : l.kind === 'dci' ? 'var(--accent)' : l.status === 'standby' ? 'var(--text-subtle)' : l.kind === 'backup' ? 'var(--warn)' : 'var(--brand)';
      edges.push({
        id: l.id,
        source,
        target,
        ...pickHandles(a, b),
        type: l.kind === 'dci' ? 'straight' : 'default',
        animated: l.status === 'up' && l.kind !== 'dci',
        label:
          l.status === 'down'
            ? `${t(`carriers.${l.carrier}`)} · ${t('status.down')}`
            : l.status === 'standby'
              ? undefined
              : t('topology.edgeLabel', { carrier: t(`carriers.${l.carrier}`), util }),
        labelStyle,
        labelBgStyle: labelBg,
        labelBgPadding: [5, 3] as [number, number],
        labelBgBorderRadius: 4,
        style: {
          stroke: color,
          strokeWidth: l.kind === 'dci' ? 3 : l.status === 'standby' ? 1.2 : 2,
          strokeDasharray: l.status === 'down' ? '6 5' : l.status === 'standby' ? '2 5' : undefined,
          opacity: l.status === 'standby' ? 0.6 : 1,
        },
        zIndex: l.status === 'down' ? 2 : 1,
      });
    }
    return { nodes, edges };
  }, [layout, episodes, live, now, rtl, t, f, focusId]);

  const corner = rtl ? 'bottom-right' : 'bottom-left';

  return (
    <div dir="ltr" className="h-full w-full">
      <ReactFlow
        key={`${mode}-${siteId}-${rtl}`}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.08 }}
        minZoom={0.2}
        maxZoom={2}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        onNodeClick={(_, node) => {
          if (node.type === 'device') void router.push(`/devices/${node.id}/`);
        }}
        proOptions={{ hideAttribution: false }}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} color="var(--border-strong)" />
        <Controls position={corner} showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

