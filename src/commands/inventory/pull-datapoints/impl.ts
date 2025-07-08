import type { LocalContext } from '../../../context';

interface PullDatapointsCommandFlags {
  auth: string;
  file: string;
  transcendUrl: string;
  dataSiloIds?: string;
  includeAttributes: boolean;
  includeGuessedCategories: boolean;
  parentCategories?: string;
  subCategories?: string;
}

export function pullDatapoints(
  this: LocalContext,
  flags: PullDatapointsCommandFlags,
): void {
  console.log('Pull datapoints command started...');
  console.log('Flags:', flags);
  throw new Error('Command not yet implemented');
}
