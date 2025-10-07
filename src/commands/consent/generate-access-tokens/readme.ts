import { buildExamples } from '../../../lib/docgen/buildExamples';
import type { GenerateAccessTokenCommandFlags } from './impl';

const examples = buildExamples<GenerateAccessTokenCommandFlags>(
  ['consent', 'generate-access-tokens'],
  [
    {
      description: 'Generate access tokens for a list of users',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        file: './users.csv',
      },
    },
    {
      description:
        'Specifying the backend URL, needed for US hosted backend infrastructure',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        file: './users.csv',
        transcendUrl: 'https://api.us.transcend.io',
      },
    },
  ],
);

export default `#### Examples

${examples}`;
