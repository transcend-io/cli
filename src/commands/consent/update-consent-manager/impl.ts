import type { LocalContext } from '../../../context';

interface UpdateConsentManagerCommandFlags {
  auth: string;
  bundleTypes: string[];
  deploy: boolean;
  transcendUrl: string;
}

export function updateConsentManager(
  this: LocalContext,
  flags: UpdateConsentManagerCommandFlags,
): void {
  console.log('Update consent manager command started...');
  console.log('Flags:', flags);
  throw new Error('Command not yet implemented');
}
