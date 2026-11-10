/**
 * ILLUSTRATIVE control-area mapping used by the data residency & compliance page and the
 * compliance summary report. Titles/descriptions are translated (`compliance.controls.<id>`).
 * These are placeholders for validation conversations — NOT a certification or audit result.
 */
export type Framework = 'nca' | 'pdpl' | 'sama';
export type ControlStatus = 'supported' | 'shared' | 'customer';

export interface ControlArea {
  id: string;
  framework: Framework;
  status: ControlStatus;
}

export const FRAMEWORKS: readonly Framework[] = ['nca', 'pdpl', 'sama'];

export const CONTROL_AREAS: readonly ControlArea[] = [
  { id: 'nca-assets', framework: 'nca', status: 'supported' },
  { id: 'nca-logging', framework: 'nca', status: 'supported' },
  { id: 'nca-incident', framework: 'nca', status: 'shared' },
  { id: 'nca-network', framework: 'nca', status: 'shared' },
  { id: 'nca-iam', framework: 'nca', status: 'supported' },
  { id: 'nca-backup', framework: 'nca', status: 'shared' },
  { id: 'nca-cloud', framework: 'nca', status: 'supported' },
  { id: 'nca-resilience', framework: 'nca', status: 'shared' },
  { id: 'nca-vuln', framework: 'nca', status: 'customer' },
  { id: 'pdpl-residency', framework: 'pdpl', status: 'supported' },
  { id: 'pdpl-transfer', framework: 'pdpl', status: 'supported' },
  { id: 'pdpl-minimization', framework: 'pdpl', status: 'shared' },
  { id: 'pdpl-retention', framework: 'pdpl', status: 'supported' },
  { id: 'pdpl-breach', framework: 'pdpl', status: 'shared' },
  { id: 'pdpl-rights', framework: 'pdpl', status: 'customer' },
  { id: 'sama-monitoring', framework: 'sama', status: 'supported' },
  { id: 'sama-availability', framework: 'sama', status: 'supported' },
  { id: 'sama-audit', framework: 'sama', status: 'supported' },
  { id: 'sama-outsourcing', framework: 'sama', status: 'shared' },
  { id: 'sama-bcm', framework: 'sama', status: 'shared' },
  { id: 'sama-change', framework: 'sama', status: 'shared' },
];
