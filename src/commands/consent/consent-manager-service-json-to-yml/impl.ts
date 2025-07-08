import type { LocalContext } from '@/context';

interface ConsentManagerServiceJsonToYmlCommandFlags {
  file: string;
  output: string;
}

export function consentManagerServiceJsonToYml(
  this: LocalContext,
  flags: ConsentManagerServiceJsonToYmlCommandFlags,
): void {
  console.log('Consent manager service JSON to YML command started...');
  console.log('Flags:', flags);
  throw new Error('Command not yet implemented');
}
