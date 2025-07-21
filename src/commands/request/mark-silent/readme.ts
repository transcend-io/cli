import { buildExamples } from '../../../lib/docgen/buildExamples';
import type { MarkSilentCommandFlags } from './impl';

const examples = buildExamples<MarkSilentCommandFlags>(
  ['request', 'mark-silent'],
  [
    {
      description:
        'Bulk mark silent all open SALE_OPT_OUT and ERASURE requests',
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
        'Bulk mark as silent all Erasure (request.type=ERASURE) requests that are in an enriching state (request.status=ENRICHING)',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        actions: 'ERASURE',
        statuses: 'ENRICHING',
      },
    },
    {
      description: 'Bulk mark as silent requests by ID',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        actions: 'ACCESS,ERASURE,SALE_OPT_OUT,CONTACT_OPT_OUT',
        statuses:
          'ENRICHING,COMPILING,APPROVING,WAITING,REQUEST_MADE,ON_HOLD,DELAYED,SECONDARY',
        requestIds:
          'c3ae78c9-2768-4666-991a-d2f729503337,342e4bd1-64ea-4af0-a4ad-704b5a07cfe4',
      },
    },
    {
      description:
        'Mark sale opt out requests as silent within a certain date range',
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

${examples}`;
