import { buildExamples } from '../../../../lib/docgen/buildExamples';
import type { MarkRequestDataSilosCompletedCommandFlags } from './impl';

const examples = buildExamples<MarkRequestDataSilosCompletedCommandFlags>(
  ['request', 'system', 'mark-request-data-silos-completed'],
  [
    {
      description: 'Mark all associated privacy request jobs as completed',
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

export default `#### Examples

${examples}`;
