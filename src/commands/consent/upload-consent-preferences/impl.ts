import type { LocalContext } from '../../../context';

interface UploadConsentPreferencesCommandFlags {
  base64EncryptionKey: string;
  base64SigningKey: string;
  partition: string;
  file: string;
  consentUrl: string;
  concurrency: number;
}

export function uploadConsentPreferences(
  this: LocalContext,
  flags: UploadConsentPreferencesCommandFlags,
): void {
  console.log('Upload consent preferences command started...');
  console.log('Flags:', flags);
  throw new Error('Command not yet implemented');
}
