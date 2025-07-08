import type { LocalContext } from '@/context';

interface PullConsentMetricsCommandFlags {
  auth: string;
  start: Date;
  end?: Date;
  folder: string;
  bin: string;
  transcendUrl: string;
}

export function pullConsentMetrics(
  this: LocalContext,
  flags: PullConsentMetricsCommandFlags,
): void {
  console.log('Pull consent metrics command started...');
  console.log('Flags:', flags);
  throw new Error('Command not yet implemented');
}
