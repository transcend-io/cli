import type { LocalContext } from '../../../context';

interface UploadPreferencesCommandFlags {
  auth: string;
  partition: string;
  sombraAuth?: string;
  consentUrl: string;
  file?: string;
  directory?: string;
  dryRun: boolean;
  skipExistingRecordCheck: boolean;
  receiptFileDir: string;
  skipWorkflowTriggers: boolean;
  forceTriggerWorkflows: boolean;
  skipConflictUpdates: boolean;
  isSilent: boolean;
  attributes: string;
  receiptFilepath: string;
}

export function uploadPreferences(
  this: LocalContext,
  flags: UploadPreferencesCommandFlags,
): void {
  console.log('Upload preferences command started...');
  console.log('Flags:', flags);
  throw new Error('Command not yet implemented');
}
