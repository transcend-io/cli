import { buildExamples } from '../../../lib/docgen/buildExamples';
import type { PullConsentPreferencesCommandFlags } from './impl';

const examples = buildExamples<PullConsentPreferencesCommandFlags>(
  ['consent', 'pull-consent-preferences'],
  [
    {
      description: 'Fetch all consent preferences from partition key',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        partition: '4d1c5daa-90b7-4d18-aa40-f86a43d2c726',
      },
    },
    {
      description:
        'Fetch all consent preferences from partition key and save to ./consent.csv',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        partition: '4d1c5daa-90b7-4d18-aa40-f86a43d2c726',
        file: './consent.csv',
      },
    },
    {
      description: 'Filter on consent updates before a date',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        partition: '4d1c5daa-90b7-4d18-aa40-f86a43d2c726',
        timestampBefore: '04/03/2023',
      },
    },
    {
      description: 'Filter on consent updates after a date',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        partition: '4d1c5daa-90b7-4d18-aa40-f86a43d2c726',
        timestampAfter: '04/03/2023',
      },
    },
    {
      description: 'For self-hosted sombras that use an internal key',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        sombraAuth: '$SOMBRA_INTERNAL_KEY',
        partition: '4d1c5daa-90b7-4d18-aa40-f86a43d2c726',
      },
    },
    {
      description:
        'Specifying the backend URL, needed for US hosted backend infrastructure',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        partition: '4d1c5daa-90b7-4d18-aa40-f86a43d2c726',
        transcendUrl: 'https://api.us.transcend.io',
      },
    },
  ],
);

export default `#### Usage

${examples}`;
