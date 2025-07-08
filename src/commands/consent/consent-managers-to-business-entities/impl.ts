import type { LocalContext } from '@/context';

interface ConsentManagersToBusinessEntitiesCommandFlags {
  consentManagerYmlFolder: string;
  output: string;
}

export function consentManagersToBusinessEntities(
  this: LocalContext,
  flags: ConsentManagersToBusinessEntitiesCommandFlags,
): void {
  console.log('Consent managers to business entities command started...');
  console.log('Flags:', flags);
  throw new Error('Command not yet implemented');
}
