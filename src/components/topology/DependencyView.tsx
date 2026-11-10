import { Background, BackgroundVariant, Handle, Position, ReactFlow, type Edge, type Node, type NodeProps } from '@xyflow/react';
import { Globe, Users } from 'lucide-react';
import { useRouter } from 'next/router';
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DeviceIcon } from '@/components/ui/DeviceIcon';
import { APPS, deviceStatus, getDevice, type DeviceStatus, type DeviceType } from '@/mock';
import { appHealth } from '@/lib/apps';
import { cn } from '@/lib/cn';
import { useFormat } from '@/lib/hooks';
import { useLive } from '@/store/live';

const W = 178;
const COLW = 240;
const ROWH = 82;
const COLOR: Record<DeviceStatus, string> = { up: 'var(--ok)', warning: 'var(--warn)', down: 'var(--crit)' };

type DepData = { title: string; sub: string; status: DeviceStatus | 'none'; kind: 'users' | 'app' | 'device'; deviceType?: DeviceType; rtl: boolean };

const DepNode = memo(function DepNode({ data }: NodeProps<Node<DepData>>) {
  const color = data.status === 'none' ? 'var(--brand)' : COLOR[data.status];
  return (
    <div
      dir={data.rtl ? 'rtl' : 'ltr'}
      style={{ width: W, borderColor: data.status === 'warning' || data.status === 'down' ? color : undefined }}
      className={cn('rounded-xl border border-line bg-surface px-2.5 py-2 shadow-card', data.kind !== 'users' && 'cursor-pointer hover:shadow-pop')}
    >
      <Handle type="target" position={data.rtl ? Position.Right : Position.Left} isConnectable={false} className="!opacity-0" />
      <Handle type="source" position={data.rtl ? Position.Left : Position.Right} isConnectable={false} className="!opacity-0" />
      <div className="flex items-center gap-2">
        <span className="grid size-6 shrink-0 place-items-center rounded-md bg-surface-3 text-muted">
          {data.kind === 'users' ? <Users className="size-3.5" /> : data.deviceType ? <DeviceIcon type={data.deviceType} className="size-3.5" /> : <Globe className="size-3.5" />}
        </span>
        <span className={cn('min-w-0 flex-1 truncate text-[11.5px] font-semibold text-fg', data.kind === 'device' && 'ltr-text')}>{data.title}</span>
        {data.status !== 'none' && <span className="size-2 shrink-0 rounded-full" style={{ background: color }} />}
      </div>
      <div className="mt-1 truncate text-[10.5px] text-subtle tabular">{data.sub}</div>
    </div>
  );
});

const nodeTypes = { dep: DepNode };

const COLUMNS: string[][] = [
  ['users'],
  ['ruh-dc1-lb01', 'ruh-dc1-lb02', 'jed-dc2-lb01'],
  ['customer-portal', 'mobile-backend', 'hr-self-service'],
  ['api-gateway', 'identity-sso'],
  ['payments', 'erp', 'notification', 'dwh-etl'],
  ['ruh-dc1-db-pay01', 'jed-dc2-db-pay02', 'ruh-dc1-mq01', 'ruh-dc1-db-erp01', 'ruh-dc1-db-idm01', 'jed-dc2-db-hr01', 'ruh-dc1-db-dwh01'],
];

const EXTRA_EDGES: [string, string][] = [
  ['users', 'ruh-dc1-lb01'],
  ['users', 'ruh-dc1-lb02'],
  ['users', 'jed-dc2-lb01'],
  ['ruh-dc1-lb01', 'customer-portal'],
  ['ruh-dc1-lb02', 'customer-portal'],
  ['ruh-dc1-lb01', 'hr-self-service'],
  ['jed-dc2-lb01', 'mobile-backend'],
  ['jed-dc2-lb01', 'customer-portal'],
];

export function DependencyView() {
  const { t, i18n } = useTranslation();
  const f = useFormat();
  const router = useRouter();
  const rtl = i18n.language === 'ar';
  const now = useLive((s) => s.now);
  const episodes = useLive((s) => s.episodes);

  const { nodes, edges } = useMemo(() => {
    const status = new Map<string, DeviceStatus | 'none'>();
    const nodes: Node[] = [];
    const maxRows = Math.max(...COLUMNS.map((c) => c.length));
    COLUMNS.forEach((col, ci) => {
      col.forEach((id, ri) => {
        const y = (ri - (col.length - 1) / 2) * ROWH + (maxRows * ROWH) / 2;
        const cx = ci * COLW;
        const x = rtl ? -cx - W : cx;
        let data: DepData;
        if (id === 'users') {
          data = { title: t('servers.deps.users'), sub: t('servers.deps.internet'), status: 'none', kind: 'users', rtl };
        } else {
          const app = APPS.find((a) => a.id === id);
          if (app) {
            const h = appHealth(app, now, episodes);
            data = { title: t(`apps.${app.id}.name`), sub: `${f.ms(h.latency)} · ${f.number(h.errorRate, 2)}%`, status: h.status, kind: 'app', rtl };
          } else {
            const d = getDevice(id);
            const st = d ? deviceStatus(episodes[d.id]) : 'up';
            data = { title: d?.hostname ?? id, sub: d ? t(`deviceTypes.${d.type}`) : '', status: st, kind: 'device', deviceType: d?.type, rtl };
          }
        }
        status.set(id, data.status);
        nodes.push({ id, type: 'dep', position: { x, y }, data, draggable: false });
      });
    });
    const pairs: [string, string][] = [...EXTRA_EDGES];
    for (const app of APPS) for (const dep of app.dependsOn) pairs.push([app.id, dep]);
    const edges: Edge[] = pairs.map(([a, b]) => {
      const st = status.get(b);
      const bad = st === 'down' || st === 'warning';
      return {
        id: `${a}->${b}`,
        source: a,
        target: b,
        animated: !bad,
        style: { stroke: st === 'down' ? 'var(--crit)' : st === 'warning' ? 'var(--warn)' : 'var(--border-strong)', strokeWidth: bad ? 2 : 1.4 },
      };
    });
    return { nodes, edges };
  }, [now, episodes, rtl, t, f]);

  return (
    <div dir="ltr" className="h-full w-full">
      <ReactFlow
        key={String(rtl)}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.06 }}
        minZoom={0.3}
        maxZoom={1.6}
        nodesDraggable={false}
        nodesConnectable={false}
        zoomOnScroll={false}
        preventScrolling={false}
        onNodeClick={(_, n) => {
          if ((n.data as DepData).kind === 'device') void router.push(`/devices/${n.id}/`);
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.1} color="var(--border-strong)" />
      </ReactFlow>
    </div>
  );
}
