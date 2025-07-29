import { RequestAction } from '@transcend-io/privacy-types';
import { buildExamples } from '../../../../lib/docgen/buildExamples';
import type { PullIdentifiersCommandFlags } from './impl';

const examples = buildExamples<PullIdentifiersCommandFlags>(
  ['request', 'cron', 'pull-identifiers'],
  [
    {
      description: 'Pull outstanding identifiers for a data silo',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        dataSiloId: '70810f2e-cf90-43f6-9776-901a5950599f',
        actions: [RequestAction.Erasure],
      },
    },
    {
      description: 'Pull to a specific file location',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        dataSiloId: '70810f2e-cf90-43f6-9776-901a5950599f',
        actions: [RequestAction.Erasure],
        file: '/Users/transcend/Desktop/test.csv',
      },
    },
    {
      description: 'For self-hosted sombras that use an internal key',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        dataSiloId: '70810f2e-cf90-43f6-9776-901a5950599f',
        actions: [RequestAction.Erasure],
        sombraAuth: '$SOMBRA_INTERNAL_KEY',
      },
    },
    {
      description:
        'Specifying the backend URL, needed for US hosted backend infrastructure',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        dataSiloId: '70810f2e-cf90-43f6-9776-901a5950599f',
        actions: [RequestAction.Erasure],
        transcendUrl: 'https://api.us.transcend.io',
      },
    },
    {
      description: 'Specifying the page limit, defaults to 100',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        dataSiloId: '70810f2e-cf90-43f6-9776-901a5950599f',
        actions: [RequestAction.Erasure],
        pageLimit: 300,
        chunkSize: 6000,
      },
    },
    {
      description:
        'Specifying the chunk size for large datasets to avoid file size limits (defaults to 100,000 rows per file)',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        dataSiloId: '70810f2e-cf90-43f6-9776-901a5950599f',
        actions: [RequestAction.Erasure],
        chunkSize: 50000,
      },
    },
  ],
);

export default `#### Examples

${examples}`;
