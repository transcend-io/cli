import { buildExamples } from '../../../../lib/docgen/buildExamples';
import type { SkipRequestDataSilosCommandFlags } from './impl';

const examples = buildExamples<SkipRequestDataSilosCommandFlags>(
  ['request', 'system', 'skip-request-data-silos'],
  [
    {
      description:
        'Bulk skipping all open privacy request jobs for a particular data silo',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        dataSiloId: '70810f2e-cf90-43f6-9776-901a5950599f',
      },
    },
    {
      description:
        'Specifying the backend URL, needed for US hosted backend infrastructure',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        dataSiloId: '70810f2e-cf90-43f6-9776-901a5950599f',
        transcendUrl: 'https://api.us.transcend.io',
      },
    },
    {
      description: 'Only mark as completed requests in "removing data" phase',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        dataSiloId: '70810f2e-cf90-43f6-9776-901a5950599f',
        statuses: 'SECONDARY',
      },
    },
    {
      description: 'Set to status "RESOLVED" instead of status "SKIPPED"',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        dataSiloId: '70810f2e-cf90-43f6-9776-901a5950599f',
        status: 'RESOLVED',
      },
    },
  ],
);

export default `#### Examples

${examples}`;
