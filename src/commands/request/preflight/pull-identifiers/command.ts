import { buildCommand, numberParser } from '@stricli/core';
import { ScopeName } from '@transcend-io/privacy-types';
import { name } from '../../../../constants';
import {
  createAuthParameter,
  createSombraAuthParameter,
  createTranscendUrlParameter,
} from '../../../../cli/common-parameters';

export const pullIdentifiersCommand = buildCommand({
  loader: async () => {
    const { pullIdentifiers } = await import('./impl');
    return pullIdentifiers;
  },
  parameters: {
    flags: {
      auth: createAuthParameter({
        scopes: [ScopeName.ViewRequests, ScopeName.ViewRequestCompilation],
      }),
      sombraAuth: createSombraAuthParameter(),
      transcendUrl: createTranscendUrlParameter(),
      file: {
        kind: 'parsed',
        parse: String,
        brief: 'Path to the CSV file where requests will be written to',
        default: './manual-enrichment-identifiers.csv',
      },
      actions: {
        kind: 'parsed',
        parse: String,
        variadic: ',',
        brief: 'The request action to pull for',
        optional: true,
      },
      concurrency: {
        kind: 'parsed',
        parse: numberParser,
        brief: 'The concurrency to use when uploading requests in parallel',
        default: '100',
      },
    },
  },
  docs: {
    brief: 'Pull identifiers for manual enrichment',
    fullDescription: `This command pulls down the set of privacy requests that are currently pending manual enrichment.

This is useful for the following workflow:

1. Pull identifiers to CSV:
   ${name} request preflight pull-identifiers --file=./enrichment-requests.csv
2. Fill out the CSV with additional identifiers
3. Push updated back to Transcend
   ${name} request preflight push-identifiers --file=./enrichment-requests.csv`,
  },
});
