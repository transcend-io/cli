import { buildCommand, numberParser } from '@stricli/core';
import { urlParser } from '../../../cli/parsers';

export const uploadConsentPreferencesCommand = buildCommand({
  loader: async () => {
    const { uploadConsentPreferences } = await import('./impl');
    return uploadConsentPreferences;
  },
  parameters: {
    flags: {
      base64EncryptionKey: {
        kind: 'parsed',
        parse: String,
        brief: 'The encryption key used to encrypt the userId',
      },
      base64SigningKey: {
        kind: 'parsed',
        parse: String,
        brief:
          'The signing key used to prove authentication of consent request',
      },
      partition: {
        kind: 'parsed',
        parse: String,
        brief: 'The partition key to download consent preferences to',
      },
      file: {
        kind: 'parsed',
        parse: String,
        brief: 'The file to pull consent preferences from',
        default: './preferences.csv',
      },
      consentUrl: {
        kind: 'parsed',
        parse: urlParser,
        brief:
          'URL of the Transcend Consent backend. Use https://consent.us.transcend.io for US hosting',
        default: 'https://consent.transcend.io',
      },
      concurrency: {
        kind: 'parsed',
        parse: numberParser,
        brief: 'The concurrency to use when uploading requests in parallel',
        default: '100',
      },
    },
  },
  docs: {
    brief: 'Upload consent preferences',
    fullDescription: `This command allows for updating of consent preferences to the Managed Consent Database.`,
  },
});
