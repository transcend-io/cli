import { buildExamples } from '../../../../lib/docgen/buildExamples';
import type { PushIdentifiersCommandFlags } from './impl';

const examples = buildExamples<PushIdentifiersCommandFlags>(
  ['request', 'preflight', 'push-identifiers'],
  [
    {
      description:
        'Push up a set of identifiers for a set of requests pending manual enrichment',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        enricherId: '27d45a0d-7d03-47fa-9b30-6d697005cfcf',
      },
    },
    {
      description: 'Pull to a specific file location',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        enricherId: '27d45a0d-7d03-47fa-9b30-6d697005cfcf',
        file: '/Users/transcend/Desktop/test.csv',
      },
    },
    {
      description: 'For US hosted infrastructure',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        enricherId: '27d45a0d-7d03-47fa-9b30-6d697005cfcf',
        transcendUrl: 'https://api.us.transcend.io',
      },
    },
    {
      description: 'With Sombra authentication',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        enricherId: '27d45a0d-7d03-47fa-9b30-6d697005cfcf',
        sombraAuth: '$SOMBRA_INTERNAL_KEY',
      },
    },
    {
      description: 'With specific concurrency',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        enricherId: '27d45a0d-7d03-47fa-9b30-6d697005cfcf',
        concurrency: 200,
      },
    },
    {
      description:
        'When enriching requests, mark all requests as silent mode before processing',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        enricherId: '27d45a0d-7d03-47fa-9b30-6d697005cfcf',
        markSilent: true,
      },
    },
  ],
);

export default `#### Examples

${examples}`;
