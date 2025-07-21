import { buildExamples } from '../../../lib/docgen/buildExamples';
import type { PullConsentMetricsCommandFlags } from './impl';

const examples = buildExamples<PullConsentMetricsCommandFlags>(
  ['consent', 'pull-consent-metrics'],
  [
    {
      description: 'Pull consent manager metrics for a Transcend account',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        start: '01/01/2023',
      },
    },
    {
      description:
        'Specifying the backend URL, needed for US hosted backend infrastructure',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        start: '01/01/2023',
        transcendUrl: 'https://api.us.transcend.io',
      },
    },
    {
      description: 'Pull start and end date explicitly',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        start: '01/01/2023',
        end: '03/01/2023',
      },
    },
    {
      description: 'Save to an explicit folder',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        start: '01/01/2023',
        end: '03/01/2023',
        folder: './my-folder/',
      },
    },
    {
      description: 'Bin data hourly vs daily',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        start: '01/01/2023',
        bin: '1h',
      },
    },
  ],
);

export default `#### Examples

${examples}`;
