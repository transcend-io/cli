import type { LocalContext } from '../../../context';

interface DeriveDataSilosFromDataFlowsCommandFlags {
  auth: string;
  dataFlowsYmlFolder: string;
  dataSilosYmlFolder: string;
  ignoreYmls?: string[];
  transcendUrl: string;
}

export function deriveDataSilosFromDataFlows(
  this: LocalContext,
  flags: DeriveDataSilosFromDataFlowsCommandFlags,
): void {
  console.log('Derive data silos from data flows command started...');
  console.log('Flags:', flags);
  throw new Error('Command not yet implemented');
}
