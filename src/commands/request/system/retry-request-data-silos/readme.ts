import { RequestAction } from '@transcend-io/privacy-types';
import { buildExamples } from '../../../../lib/docgen/buildExamples';
import type { RetryRequestDataSilosCommandFlags } from './impl';

const examples = buildExamples<RetryRequestDataSilosCommandFlags>(
  ['request', 'system', 'retry-request-data-silos'],
  [
    {
      description:
        'Bulk restarting a set of data silos jobs for open privacy requests',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        dataSiloId: '70810f2e-cf90-43f6-9776-901a5950599f',
        actions: [RequestAction.Access],
      },
    },
    {
      description:
        'Specifying the backend URL, needed for US hosted backend infrastructure',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        dataSiloId: '70810f2e-cf90-43f6-9776-901a5950599f',
        actions: [RequestAction.Access],
        transcendUrl: 'https://api.us.transcend.io',
      },
    },
  ],
);

export default `#### Examples

${examples}`;
