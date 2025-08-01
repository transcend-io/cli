import { buildCommand, numberParser } from '@stricli/core';
import { RequestAction, ScopeName } from '@transcend-io/privacy-types';
import {
  createAuthParameter,
  createSombraAuthParameter,
  createTranscendUrlParameter,
} from '../../../../lib/cli/common-parameters';
import { buildExampleCommand } from '../../../../lib/docgen/buildExamples';
import type { PullIdentifiersCommandFlags } from './impl';
import type { PushIdentifiersCommandFlags } from '../push-identifiers/impl';

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
        kind: 'enum',
        values: Object.values(RequestAction),
        variadic: ',',
        brief: 'The request actions to pull for',
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

   ${buildExampleCommand<PullIdentifiersCommandFlags>(
     ['request', 'preflight', 'pull-identifiers'],
     {
       file: './enrichment-requests.csv',
     },
     { argsIndent: 5 },
   )}

2. Fill out the CSV with additional identifiers

3. Push updated back to Transcend:

   ${buildExampleCommand<PushIdentifiersCommandFlags>(
     ['request', 'preflight', 'push-identifiers'],
     {
       file: './enrichment-requests.csv',
     },
     { argsIndent: 5 },
   )}`,
  },
});
