import { buildExamples } from '../../../lib/docgen/buildExamples';
import type { RestartCommandFlags } from './impl';

const examples = buildExamples<RestartCommandFlags>(
  ['request', 'restart'],
  [
    {
      description: 'Restart requests with specific statuses and actions',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        statuses: 'COMPILING,ENRICHING',
        actions: 'ACCESS,ERASURE',
      },
    },
    {
      description: 'For self-hosted sombras that use an internal key',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        sombraAuth: '$SOMBRA_INTERNAL_KEY',
        statuses: 'COMPILING,ENRICHING',
        actions: 'ACCESS,ERASURE',
      },
    },
    {
      description:
        'Specifying the backend URL, needed for US hosted backend infrastructure',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        sombraAuth: '$SOMBRA_INTERNAL_KEY',
        statuses: 'COMPILING,ENRICHING',
        actions: 'ACCESS,ERASURE',
        transcendUrl: 'https://api.us.transcend.io',
      },
    },
    {
      description: 'Increase the concurrency (defaults to 15)',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        statuses: 'COMPILING,ENRICHING',
        actions: 'ACCESS,ERASURE',
        concurrency: '100',
      },
    },
    {
      description: 'Re-verify emails',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        statuses: 'COMPILING,ENRICHING',
        actions: 'ACCESS,ERASURE',
        emailIsVerified: 'false',
      },
    },
    {
      description: 'Restart specific requests by ID',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        statuses: 'COMPILING,ENRICHING',
        actions: 'ACCESS,ERASURE',
        requestIds:
          'c3ae78c9-2768-4666-991a-d2f729503337,342e4bd1-64ea-4af0-a4ad-704b5a07cfe4',
      },
    },
    {
      description:
        'Restart requests that were submitted before a specific date',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        statuses: 'COMPILING,ENRICHING',
        actions: 'ACCESS,ERASURE',
        createdAt: '2022-05-11T00:46',
      },
    },
    {
      description:
        'Restart requests and place everything in silent mode submitted before a certain date',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        statuses: 'COMPILING,ENRICHING',
        actions: 'ACCESS,ERASURE',
        silentModeBefore: '2022-12-05T00:46',
      },
    },
    {
      description: 'Restart requests within a specific timeframe',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        statuses: 'COMPILING,ENRICHING',
        actions: 'ACCESS,ERASURE',
        createdAtBefore: '04/05/2023',
        createdAtAfter: '02/21/2023',
      },
    },
    {
      description: 'Send email receipts to the restarted requests',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        statuses: 'COMPILING,ENRICHING',
        actions: 'ACCESS,ERASURE',
        sendEmailReceipt: 'true',
      },
    },
    {
      description:
        'Copy over all enriched identifiers from the initial request',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        statuses: 'COMPILING,ENRICHING',
        actions: 'ACCESS,ERASURE',
        copyIdentifiers: 'true',
      },
    },
    {
      description: 'Skip queued state of request and go straight to compiling',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        statuses: 'COMPILING,ENRICHING',
        actions: 'ACCESS,ERASURE',
        skipWaitingPeriod: 'true',
      },
    },
  ],
);

export default `#### Usage

${examples}`;
