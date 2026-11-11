import {
  Bell,
  FileBarChart,
  LayoutDashboard,
  Network,
  ScrollText,
  Server,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  Workflow,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  /** Show the active-alert counter. */
  badge?: 'alerts';
}

export interface NavGroup {
  labelKey: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    labelKey: 'nav.sections.monitor',
    items: [
      { href: '/overview', labelKey: 'nav.overview', icon: LayoutDashboard },
      { href: '/network', labelKey: 'nav.network', icon: Network },
      { href: '/topology', labelKey: 'nav.topology', icon: Workflow },
      { href: '/servers', labelKey: 'nav.servers', icon: Server },
    ],
  },
  {
    labelKey: 'nav.sections.operate',
    items: [
      { href: '/alerts', labelKey: 'nav.alerts', icon: Bell, badge: 'alerts' },
      { href: '/alerts/rules', labelKey: 'nav.rules', icon: SlidersHorizontal },
      { href: '/logs', labelKey: 'nav.logs', icon: ScrollText },
      { href: '/reports', labelKey: 'nav.reports', icon: FileBarChart },
    ],
  },
  {
    labelKey: 'nav.sections.company',
    items: [
      { href: '/compliance', labelKey: 'nav.compliance', icon: ShieldCheck },
    ],
  },
  {
    labelKey: 'nav.sections.admin',
    items: [
      { href: '/settings', labelKey: 'nav.settings', icon: Settings },
      { href: '/admin/leads', labelKey: 'nav.leads', icon: Users },
    ],
  },
];

export function isActivePath(current: string, href: string) {
  const clean = current.replace(/\/$/, '') || '/';
  if (href === '/alerts') return clean === '/alerts';
  if (href === '/network') return clean === '/network' || clean.startsWith('/devices');
  return clean === href || clean.startsWith(`${href}/`);
}
