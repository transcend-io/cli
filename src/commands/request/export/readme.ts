import { RequestAction, RequestStatus } from '@transcend-io/privacy-types';
import { buildExamples } from '../../../lib/docgen/buildExamples';
import type { ExportCommandFlags } from './impl';
import { getExampleDate } from '../../../lib/docgen/getExampleDate';

const examples = buildExamples<ExportCommandFlags>(
  ['request', 'export'],
  [
    {
      description: 'Pull all requests',
      flags: {
        auth: '$TRANSCEND_API_KEY',
      },
    },
    {
      description: 'Filter for specific actions and statuses',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        statuses: [RequestStatus.Compiling, RequestStatus.Enriching],
        actions: [RequestAction.Access, RequestAction.Erasure],
      },
    },
    {
      description:
        'Specifying the backend URL, needed for US hosted backend infrastructure',
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
      description:
        'Speed up large exports with parallel date-range chunks (requires --createdAtAfter and --createdAtBefore)',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        createdAtAfter: getExampleDate('01/01/2023'),
        createdAtBefore: getExampleDate('01/01/2024'),
        concurrency: 10,
        file: './exports/requests.csv',
        skipRequestIdentifiers: true,
      },
    },
    {
      description: 'Filter for production requests only',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        showTests: false,
      },
    },
    {
      description: 'Filter for requests within a date range',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        createdAtBefore: getExampleDate('04/05/2023'),
        createdAtAfter: getExampleDate('02/21/2023'),
      },
    },
    {
      description: 'Write to a specific file location',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        file: './path/to/file.csv',
      },
    },
    {
      description: 'Skip fetching request identifiers',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        skipRequestIdentifiers: true,
      },
    },
  ],
);

export default `#### Examples

${examples}

#### Parallel Date-Range Chunking

When exporting a large number of requests, you can use \`--concurrency\` to split the date range
into parallel chunks that are fetched simultaneously. This requires both \`--createdAtAfter\` and
\`--createdAtBefore\` to be set. Each chunk writes to its own numbered CSV file (e.g.
\`export-0.csv\`, \`export-1.csv\`, ...). If any chunk fails, the remaining chunks continue and the
CLI reports the exact date ranges that need to be retried.

When \`--concurrency=1\` (the default), the entire export is written to a single file.`;
