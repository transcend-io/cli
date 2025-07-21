import { buildExamples } from '../../../../lib/docgen/buildExamples';
import type { PullIdentifiersCommandFlags } from './impl';

const examples = buildExamples<PullIdentifiersCommandFlags>(
  ['request', 'preflight', 'pull-identifiers'],
  [
    {
      description:
        'Pull down the set of privacy requests that are currently pending manual enrichment',
      flags: {
        auth: '$TRANSCEND_API_KEY',
      },
    },
    {
      description: 'Pull to a specific file location',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        file: '/Users/transcend/Desktop/test.csv',
      },
    },
    {
      description: 'For specific types of requests',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        actions: 'ACCESS,ERASURE',
      },
    },
    {
      description: 'For US hosted infrastructure',
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
      description: 'With specific concurrency',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        concurrency: '200',
      },
    },
  ],
);

export default `#### Examples

${examples}`;
