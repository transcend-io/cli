import { buildExamples } from '../../../lib/docgen/buildExamples';
import type { NotifyAdditionalTimeCommandFlags } from './impl';

const examples = buildExamples<NotifyAdditionalTimeCommandFlags>(
  ['request', 'notify-additional-time'],
  [
    {
      description: 'Notify all request types that were made before 01/01/2024',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        createdAtBefore: '01/01/2024',
      },
    },
    {
      description:
        'Notify all request types that were made during a date range',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        createdAtBefore: '01/01/2024',
        createdAtAfter: '12/15/2023',
      },
    },
    {
      description: 'Notify certain request types',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        createdAtBefore: '01/01/2024',
        actions: 'SALE_OPT_OUT,ERASURE',
      },
    },
    {
      description:
        'Specifying the backend URL, needed for US hosted backend infrastructure',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        createdAtBefore: '01/01/2024',
        transcendUrl: 'https://api.us.transcend.io',
      },
    },
    {
      description: 'Bulk notify requests by ID',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        createdAtBefore: '01/01/2024',
        requestIds:
          'c3ae78c9-2768-4666-991a-d2f729503337,342e4bd1-64ea-4af0-a4ad-704b5a07cfe4',
      },
    },
    {
      description:
        'Only notify requests that are expiring in the next 3 days or less',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        createdAtBefore: '01/01/2024',
        daysLeft: '3',
      },
    },
    {
      description: 'Change number of days to extend request by',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        createdAtBefore: '01/01/2024',
        days: '30',
      },
    },
    {
      description:
        'Send a specific email template to the request that instead of the default',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        createdAtBefore: '01/01/2024',
        emailTemplate: 'Custom Email Template',
      },
    },
    {
      description: 'Increase the concurrency (defaults to 50)',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        createdAtBefore: '01/01/2024',
        concurrency: '500',
      },
    },
  ],
);

export default `#### Examples

${examples}`;
