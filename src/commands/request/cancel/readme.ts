import {
  buildExamples,
  buildExampleCommand,
} from '../../../lib/docgen/buildExamples';
import type { CancelCommandFlags } from './impl';

const examples = buildExamples<CancelCommandFlags>(
  ['request', 'cancel'],
  [
    {
      description: 'Bulk cancel all open SALE_OPT_OUT and ERASURE requests',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        actions: 'SALE_OPT_OUT,ERASURE',
      },
    },
    {
      description:
        'Specifying the backend URL, needed for US hosted backend infrastructure',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        actions: 'ERASURE',
        transcendUrl: 'https://api.us.transcend.io',
      },
    },
    {
      description:
        'Bulk cancel all Erasure (request.type=ERASURE) requests that are in an enriching state (request.status=ENRICHING)',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        actions: 'ERASURE',
        statuses: 'ENRICHING',
      },
    },
    {
      description:
        'Send a specific email template to the request that are being canceled',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        actions: 'ERASURE',
        cancellationTitle: 'Custom Email Template',
      },
    },
    {
      description:
        'Cancel all open SALE_OPT_OUT, but mark any request made before 05/03/2023 as silent mode to prevent emailing those requests',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        actions: 'SALE_OPT_OUT',
        silentModeBefore: '05/03/2023',
      },
    },
    {
      description: 'Cancel all open SALE_OPT_OUT, within a specific time frame',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        actions: 'SALE_OPT_OUT',
        createdAtBefore: '05/03/2023',
        createdAtAfter: '04/03/2023',
      },
    },
    {
      description: 'Increase the concurrency (defaults to 50)',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        actions: 'ERASURE',
        concurrency: '500',
      },
    },
  ],
);

export default `#### Usage

${examples}

**Bulk cancel requests by ID**

\`\`\`sh
${buildExampleCommand<CancelCommandFlags>(['request', 'cancel'], {
  auth: '$TRANSCEND_API_KEY',
  actions: 'ACCESS,ERASURE,SALE_OPT_OUT,CONTACT_OPT_OUT',
  statuses:
    'ENRICHING,COMPILING,APPROVING,WAITING,REQUEST_MADE,ON_HOLD,DELAYED,SECONDARY',
  requestIds:
    'c3ae78c9-2768-4666-991a-d2f729503337,342e4bd1-64ea-4af0-a4ad-704b5a07cfe4',
})}
\`\`\``;
