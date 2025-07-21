import { buildExamples } from '../../../../lib/docgen/buildExamples';
import type { MarkIdentifiersCompletedCommandFlags } from './impl';

const examples = buildExamples<MarkIdentifiersCompletedCommandFlags>(
  ['request', 'cron', 'mark-identifiers-completed'],
  [
    {
      description: 'Mark identifiers as completed',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        dataSiloId: '70810f2e-cf90-43f6-9776-901a5950599f',
      },
    },
    {
      description: 'Pull to a specific file location',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        dataSiloId: '70810f2e-cf90-43f6-9776-901a5950599f',
        file: '/Users/transcend/Desktop/test.csv',
      },
    },
    {
      description: 'For self-hosted sombras that use an internal key',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        dataSiloId: '70810f2e-cf90-43f6-9776-901a5950599f',
        sombraAuth: '$SOMBRA_INTERNAL_KEY',
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
  ],
);

export default `#### Usage

${examples}`;
