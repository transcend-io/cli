import { buildExamples } from '../../../lib/docgen/buildExamples';
import type { UploadConsentPreferencesCommandFlags } from './impl';

const examples = buildExamples<UploadConsentPreferencesCommandFlags>(
  ['consent', 'upload-consent-preferences'],
  [
    {
      description: 'Upload consent preferences to partition key',
      flags: {
        base64EncryptionKey: '$TRANSCEND_CONSENT_ENCRYPTION_KEY',
        base64SigningKey: '$TRANSCEND_CONSENT_SIGNING_KEY',
        partition: '4d1c5daa-90b7-4d18-aa40-f86a43d2c726',
      },
    },
    {
      description: 'Upload consent preferences to partition key from file',
      flags: {
        base64EncryptionKey: '$TRANSCEND_CONSENT_ENCRYPTION_KEY',
        base64SigningKey: '$TRANSCEND_CONSENT_SIGNING_KEY',
        partition: '4d1c5daa-90b7-4d18-aa40-f86a43d2c726',
        file: './consent.csv',
      },
    },
    {
      description:
        'Upload consent preferences to partition key and set concurrency',
      flags: {
        base64EncryptionKey: '$TRANSCEND_CONSENT_ENCRYPTION_KEY',
        base64SigningKey: '$TRANSCEND_CONSENT_SIGNING_KEY',
        partition: '4d1c5daa-90b7-4d18-aa40-f86a43d2c726',
        concurrency: 200,
      },
    },
  ],
);

export default `#### Examples

${examples}`;
