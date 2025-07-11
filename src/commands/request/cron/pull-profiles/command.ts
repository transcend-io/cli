import { buildCommand, numberParser } from '@stricli/core';
import {
  createAuthParameter,
  createSombraAuthParameter,
  createTranscendUrlParameter,
} from '@/cli/common-parameters';
import { uuidParser } from '@/cli/parsers';
import { RequestAction } from '@transcend-io/privacy-types';

export const pullProfilesCommand = buildCommand({
  loader: async () => {
    const { pullProfiles } = await import('./impl');
    return pullProfiles;
  },
  parameters: {
    flags: {
      auth: createAuthParameter({
        scopes: [],
        requiresSiloScope: true,
      }),
      cronDataSiloId: {
        kind: 'parsed',
        parse: uuidParser,
        brief: 'The ID of the cron data silo to pull in',
      },
      targetDataSiloId: {
        kind: 'parsed',
        parse: uuidParser,
        brief: 'The ID of the target data silo to pull in',
      },
      actions: {
        kind: 'enum',
        values: Object.values(RequestAction),
        variadic: ',',
        brief: 'The request actions to restart',
      },
      file: {
        kind: 'parsed',
        parse: String,
        brief: 'Path to the CSV file where identifiers will be written to',
        default: './cron-identifiers.csv',
      },
      fileTarget: {
        kind: 'parsed',
        parse: String,
        brief: 'Path to the CSV file where identifiers will be written to',
        default: './cron-identifiers-target.csv',
      },
      transcendUrl: createTranscendUrlParameter(),
      sombraAuth: createSombraAuthParameter(),
      pageLimit: {
        kind: 'parsed',
        parse: numberParser,
        brief: 'The page limit to use when pulling in pages of identifiers',
        default: '100',
      },
      skipRequestCount: {
        kind: 'boolean',
        brief:
          'Whether to skip the count of all outstanding requests. This is required to render the progress bar, but can take a long time to run if you have a large number of outstanding requests to process. In that case, we recommend setting skipRequestCount=true so that you can still proceed with fetching the identifiers',
        default: false,
      },
      chunkSize: {
        kind: 'parsed',
        parse: numberParser,
        brief:
          'Maximum number of rows per CSV file. For large datasets, the output will be automatically split into multiple files to avoid file system size limits. Each file will contain at most this many rows',
        default: '10000',
      },
    },
  },
  docs: {
    brief: 'Pull profiles of outstanding requests for a data silo to a CSV.',
    fullDescription: `If you are using the cron job integration, you can run this command to pull the outstanding profiles for the data silo to a CSV.

For large datasets, the output will be automatically split into multiple CSV files to avoid file system size limits. Use the --chunkSize parameter to control the maximum number of rows per file.

Read more at https://docs.transcend.io/docs/integrations/cron-job-integration.`,
  },
});
