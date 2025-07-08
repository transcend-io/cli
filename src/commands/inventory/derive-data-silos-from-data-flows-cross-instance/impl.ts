import type { LocalContext } from '@/context';

interface DeriveDataSilosFromDataFlowsCrossInstanceCommandFlags {
  auth: string;
  dataFlowsYmlFolder: string;
  output: string;
  ignoreYmls?: string[];
  transcendUrl: string;
}

export function deriveDataSilosFromDataFlowsCrossInstance(
  this: LocalContext,
  flags: DeriveDataSilosFromDataFlowsCrossInstanceCommandFlags,
): void {
  console.log(
    'Derive data silos from data flows cross instance command started...',
  );
  console.log('Flags:', flags);
  throw new Error('Command not yet implemented');
}
