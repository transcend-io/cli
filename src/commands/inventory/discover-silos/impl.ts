import type { LocalContext } from '../../../context';

interface DiscoverSilosCommandFlags {
  scanPath: string;
  dataSiloId: string;
  auth: string;
  fileGlobs?: string;
}

export function discoverSilos(
  this: LocalContext,
  flags: DiscoverSilosCommandFlags,
): void {
  console.log('Discover silos command started...');
  console.log('Flags:', flags);
  throw new Error('Command not yet implemented');
}
