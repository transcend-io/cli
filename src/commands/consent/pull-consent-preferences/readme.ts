import { buildExamples } from '../../../lib/docgen/buildExamples';
import { getExampleDate } from '../../../lib/docgen/getExampleDate';
import type { PullConsentPreferencesCommandFlags } from './impl';

const examples = buildExamples<PullConsentPreferencesCommandFlags>(
  ['consent', 'pull-consent-preferences'],
  [
    {
      description: 'Fetch all consent preferences from a partition',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        partition: '4d1c5daa-90b7-4d18-aa40-f86a43d2c726',
      },
    },
    {
      description: 'Fetch all consent preferences and save to ./consent.csv',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        partition: '4d1c5daa-90b7-4d18-aa40-f86a43d2c726',
        file: './consent.csv',
      },
    },
    {
      description: 'Filter by consent collection time (timestampBefore)',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        partition: '4d1c5daa-90b7-4d18-aa40-f86a43d2c726',
        timestampBefore: getExampleDate('04/03/2023'),
      },
    },
    {
      description: 'Filter by consent collection time (timestampAfter)',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        partition: '4d1c5daa-90b7-4d18-aa40-f86a43d2c726',
        timestampAfter: getExampleDate('04/03/2023'),
      },
    },
    {
      description: 'Filter by last update time (system.updatedAt window)',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        partition: '4d1c5daa-90b7-4d18-aa40-f86a43d2c726',
        updatedAfter: getExampleDate('08/26/2024'),
        updatedBefore: getExampleDate('08/27/2024'),
      },
    },
    {
      description:
        'Filter specific users by identifiers (name:value). Default name=email if omitted.',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        partition: '4d1c5daa-90b7-4d18-aa40-f86a43d2c726',
        // comma-separated in CLI input
        identifiers: [
          'email:no-track@example.com',
          'phone:+11234567890',
          // shorthand: treated as "email:<value>"
          'pls-no-track@example.com',
        ],
      },
    },
    {
      description: 'Self-hosted Sombra: include Sombra internal key header',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        sombraAuth: '$SOMBRA_INTERNAL_KEY',
        partition: '4d1c5daa-90b7-4d18-aa40-f86a43d2c726',
      },
    },
    {
      description: 'Use a specific backend base URL (e.g., US-hosted)',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        partition: '4d1c5daa-90b7-4d18-aa40-f86a43d2c726',
        transcendUrl: 'https://api.us.transcend.io',
      },
    },
    {
      description:
        'Pull data in a single thread, instead of using the default which pulls data in parallel ' +
        'chunks with non-overlapping time windows (for large datasets)',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        partition: '4d1c5daa-90b7-4d18-aa40-f86a43d2c726',
        shouldChunk: false,
      },
    },
    {
      description: 'Configure window concurrency for faster parallel downloads',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        partition: '4d1c5daa-90b7-4d18-aa40-f86a43d2c726',
        windowConcurrency: 200,
      },
    },
    {
      description: 'Limit maximum number of chunks to download',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        partition: '4d1c5daa-90b7-4d18-aa40-f86a43d2c726',
        maxChunks: 1000,
      },
    },
    {
      description: 'Set maximum lookback period to 30 days',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        partition: '4d1c5daa-90b7-4d18-aa40-f86a43d2c726',
        maxLookbackDays: 30,
      },
    },
  ],
);

export default `#### Examples

${examples}`;
