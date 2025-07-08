import type { LocalContext } from '../../../context';

interface ScanPackagesCommandFlags {
  auth: string;
  scanPath: string;
  ignoreDirs?: string[];
  packageName?: string;
  transcendUrl: string;
}

export function scanPackages(
  this: LocalContext,
  flags: ScanPackagesCommandFlags,
): void {
  console.log('Scan packages command started...');
  console.log('Flags:', flags);
  throw new Error('Command not yet implemented');
}
