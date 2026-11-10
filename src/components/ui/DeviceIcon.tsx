import { BatteryCharging, Box, BrickWall, Database, Network, Printer, Router, Server, Split, Waypoints, Wifi, type LucideIcon } from 'lucide-react';
import type { DeviceType } from '@/mock';

export const DEVICE_ICON: Record<DeviceType, LucideIcon> = {
  coreRouter: Waypoints,
  edgeRouter: Router,
  switch: Network,
  firewall: BrickWall,
  wlc: Wifi,
  loadBalancer: Split,
  server: Server,
  vm: Box,
  database: Database,
  ups: BatteryCharging,
  printer: Printer,
};

export function DeviceIcon({ type, className }: { type: DeviceType; className?: string }) {
  const Icon = DEVICE_ICON[type];
  return <Icon className={className} aria-hidden />;
}
