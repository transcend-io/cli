import { buildCommand } from '@stricli/core';
import { name } from '../../../../constants';
import {
  createAuthParameter,
  createSombraAuthParameter,
  createTranscendUrlParameter,
} from '@/cli/common-parameters';
import { uuidParser } from '@/cli/parsers';

export const markIdentifiersCompletedCommand = buildCommand({
  loader: async () => {
    const { markIdentifiersCompleted } = await import('./impl');
    return markIdentifiersCompleted;
  },
  parameters: {
    flags: {
      auth: createAuthParameter({
        scopes: [],
        requiresSiloScope: true,
      }),
      dataSiloId: {
        kind: 'parsed',
        parse: uuidParser,
        brief: 'The ID of the data silo to pull in',
      },
      file: {
        kind: 'parsed',
        parse: String,
        brief: 'Path to the CSV file where identifiers will be written to',
        default: './cron-identifiers.csv',
      },
      transcendUrl: createTranscendUrlParameter(),
      sombraAuth: createSombraAuthParameter(),
    },
  },
  docs: {
    brief: 'Mark identifiers as completed after processing.',
    fullDescription: `This command takes the output of tr-cron-pull-identifiers and notifies Transcend that all of the requests in the CSV have been processed.
This is used in the workflow like:

1. Pull identifiers to CSV:
   ${name} request cron pull-identifiers --auth=$TRANSCEND_API_KEY --dataSiloId=70810f2e-cf90-43f6-9776-901a5950599f --actions=ERASURE --file=./outstanding-requests.csv
2. Run your process to operate on that CSV of requests.
3. Notify Transcend of completion
   ${name} request cron mark-identifiers-completed --auth=$TRANSCEND_API_KEY --dataSiloId=70810f2e-cf90-43f6-9776-901a5950599f --file=./outstanding-requests.csv

Read more at https://docs.transcend.io/docs/integrations/cron-job-integration.`,
  },
});
