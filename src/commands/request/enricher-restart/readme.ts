import { buildExamples } from '../../../lib/docgen/buildExamples';
import type { EnricherRestartCommandFlags } from './impl';

const examples = buildExamples<EnricherRestartCommandFlags>(
  ['request', 'enricher-restart'],
  [
    {
      description: 'Restart a particular enricher across a series of DSRs',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        enricherId: '3be5e898-fea9-4614-84de-88cd5265c557',
      },
    },
    {
      description: 'Restart specific request types',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        enricherId: '3be5e898-fea9-4614-84de-88cd5265c557',
        actions: 'ACCESS,ERASURE',
      },
    },
    {
      description:
        'Specifying the backend URL, needed for US hosted backend infrastructure',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        enricherId: '3be5e898-fea9-4614-84de-88cd5265c557',
        transcendUrl: 'https://api.us.transcend.io',
      },
    },
    {
      description: 'Increase the concurrency (defaults to 15)',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        enricherId: '3be5e898-fea9-4614-84de-88cd5265c557',
        concurrency: '100',
      },
    },
    {
      description: 'Restart requests within a specific timeframe',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        enricherId: '3be5e898-fea9-4614-84de-88cd5265c557',
        createdAtBefore: '04/05/2023',
        createdAtAfter: '02/21/2023',
      },
    },
    {
      description: 'Restart requests that are in an error state',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        enricherId: '3be5e898-fea9-4614-84de-88cd5265c557',
        requestEnricherStatuses: 'ERROR',
      },
    },
  ],
);

export default `#### Examples

${examples}`;
