import { buildCommand, numberParser } from '@stricli/core';
import {
  RequestAction,
  RequestEnricherStatus,
  ScopeName,
} from '@transcend-io/privacy-types';
import {
  createAuthParameter,
  createTranscendUrlParameter,
} from '@/cli/common-parameters';
import { dateParser } from '@/cli/parsers';

export const enricherRestartCommand = buildCommand({
  loader: async () => {
    const { enricherRestart } = await import('./impl');
    return enricherRestart;
  },
  parameters: {
    flags: {
      auth: createAuthParameter({
        scopes: [ScopeName.ManageRequestCompilation],
      }),
      enricherId: {
        kind: 'parsed',
        parse: String,
        brief: 'The ID of the enricher to restart',
      },
      actions: {
        kind: 'enum',
        values: Object.values(RequestAction),
        variadic: ',',
        brief: 'The request action to restart',
        optional: true,
      },
      requestEnricherStatuses: {
        kind: 'enum',
        values: Object.values(RequestEnricherStatus),
        variadic: ',',
        brief: 'The request enricher statuses to restart',
        optional: true,
      },
      transcendUrl: createTranscendUrlParameter(),
      concurrency: {
        kind: 'parsed',
        parse: numberParser,
        brief: 'The concurrency to use when uploading requests in parallel',
        default: '15',
      },
      requestIds: {
        kind: 'parsed',
        parse: String,
        variadic: ',',
        brief: 'Specify the specific request IDs to restart',
        optional: true,
      },
      createdAtBefore: {
        kind: 'parsed',
        parse: dateParser,
        brief: 'Restart requests that were submitted before this time',
        optional: true,
      },
      createdAtAfter: {
        kind: 'parsed',
        parse: dateParser,
        brief: 'Restart requests that were submitted after this time',
        optional: true,
      },
    },
  },
  docs: {
    brief: 'Bulk restart a particular enricher across a series of DSRs',
    fullDescription: `Bulk restart a particular enricher across a series of DSRs.

The API key needs the following scopes:
- Manage Request Compilation`,
  },
});
