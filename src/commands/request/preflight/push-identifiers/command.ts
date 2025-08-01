import { buildCommand, numberParser } from '@stricli/core';
import { ScopeName } from '@transcend-io/privacy-types';
import {
  createAuthParameter,
  createSombraAuthParameter,
  createTranscendUrlParameter,
} from '../../../../lib/cli/common-parameters';
import { uuidParser } from '../../../../lib/cli/parsers';
import { buildExampleCommand } from '../../../../lib/docgen/buildExamples';
import type { PullIdentifiersCommandFlags } from '../pull-identifiers/impl';
import type { PushIdentifiersCommandFlags } from './impl';

export const pushIdentifiersCommand = buildCommand({
  loader: async () => {
    const { pushIdentifiers } = await import('./impl');
    return pushIdentifiers;
  },
  parameters: {
    flags: {
      auth: createAuthParameter({
        scopes: [
          ScopeName.ManageRequestIdentities,
          ScopeName.ManageRequestCompilation,
        ],
      }),
      enricherId: {
        kind: 'parsed',
        parse: uuidParser,
        brief: 'The ID of the Request Enricher to upload to',
      },
      sombraAuth: createSombraAuthParameter(),
      transcendUrl: createTranscendUrlParameter(),
      file: {
        kind: 'parsed',
        parse: String,
        brief: 'Path to the CSV file where requests will be written to',
        default: './manual-enrichment-identifiers.csv',
      },
      markSilent: {
        kind: 'boolean',
        brief: 'When true, set requests into silent mode before enriching',
        default: false,
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
    brief: 'Push identifiers for manual enrichment',
    fullDescription: `This command push up a set of identifiers for a set of requests pending manual enrichment.

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
