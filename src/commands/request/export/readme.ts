import { buildExamples } from '../../../lib/docgen/buildExamples';
import type { ExportCommandFlags } from './impl';

const examples = buildExamples<ExportCommandFlags>(
  ['request', 'export'],
  [
    {
      description: 'Pull all requests',
      flags: {
        auth: '$TRANSCEND_API_KEY',
      },
    },
    {
      description: 'Filter for specific actions and statuses',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        statuses: 'COMPILING,ENRICHING',
        actions: 'ACCESS,ERASURE',
      },
    },
    {
      description:
        'Specifying the backend URL, needed for US hosted backend infrastructure',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        transcendUrl: 'https://api.us.transcend.io',
      },
    },
    {
      description: 'With Sombra authentication',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        sombraAuth: '$SOMBRA_INTERNAL_KEY',
      },
    },
    {
      description: 'Increase the concurrency (defaults to 100)',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        concurrency: '500',
      },
    },
    {
      description: 'Filter for production requests only',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        showTests: 'false',
      },
    },
    {
      description: 'Filter for requests within a date range',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        createdAtBefore: '04/05/2023',
        createdAtAfter: '02/21/2023',
      },
    },
    {
      description: 'Write to a specific file location',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        file: './path/to/file.csv',
      },
    },
  ],
);

export default `#### Examples

${examples}`;
