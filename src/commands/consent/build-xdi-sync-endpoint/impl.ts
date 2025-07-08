import type { LocalContext } from '../../../context';

interface BuildXdiSyncEndpointCommandFlags {
  auth: string;
  xdiLocation: string;
  file: string;
  removeIpAddresses: boolean;
  domainBlockList: string[];
  xdiAllowedCommands: string;
  transcendUrl: string;
}

export function buildXdiSyncEndpoint(
  this: LocalContext,
  flags: BuildXdiSyncEndpointCommandFlags,
): void {
  console.log('Build XDI sync endpoint command started...');
  console.log('Flags:', flags);
  throw new Error('Command not yet implemented');
}
