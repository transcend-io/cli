import { RequestAction, RequestOrigin } from '@transcend-io/privacy-types';
import { buildExamples } from '../../../lib/docgen/buildExamples';
import type { ApproveCommandFlags } from './impl';

const examples = buildExamples<ApproveCommandFlags>(
  ['request', 'approve'],
  [
    {
      description: 'Bulk approve all SALE_OPT_OUT and ERASURE requests',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        actions: [RequestAction.SaleOptOut, RequestAction.Erasure],
      },
    },
    {
      description:
        'Specifying the backend URL, needed for US hosted backend infrastructure',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        actions: [RequestAction.Erasure],
        transcendUrl: 'https://api.us.transcend.io',
      },
    },
    {
      description: 'Approve all Erasure requests that came through the API',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        actions: [RequestAction.Erasure],
        origins: [RequestOrigin.Api],
      },
    },
    {
      description:
        'Approve all requests, but mark any request made before 05/03/2023 as silent mode to prevent emailing those requests',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        actions: [RequestAction.SaleOptOut],
        silentModeBefore: new Date('05/03/2023'),
      },
    },
    {
      description: 'Increase the concurrency (defaults to 50)',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        actions: [RequestAction.Erasure],
        concurrency: 100,
      },
    },
    {
      description:
        'Approve ERASURE requests created within a specific time frame',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        actions: [RequestAction.SaleOptOut],
        createdAtBefore: new Date('05/03/2023'),
        createdAtAfter: new Date('04/03/2023'),
      },
    },
  ],
);

export default `#### Examples

${examples}`;
