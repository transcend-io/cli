import { buildExamples } from '../../../lib/docgen/buildExamples';
import type { SkipPreflightJobsCommandFlags } from './impl';

const examples = buildExamples<SkipPreflightJobsCommandFlags>(
  ['request', 'skip-preflight-jobs'],
  [
    {
      description: 'Bulk skipping preflight checks',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        enricherIds: ['70810f2e-cf90-43f6-9776-901a5950599f'],
      },
    },
    {
      description:
        'Specifying the backend URL, needed for US hosted backend infrastructure',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        enricherIds: [
          '70810f2e-cf90-43f6-9776-901a5950599f',
          'db1e64ba-cea6-43ff-ad27-5dc8122e5224',
        ],
        transcendUrl: 'https://api.us.transcend.io',
      },
    },
  ],
);

export default `#### Examples

${examples}`;
