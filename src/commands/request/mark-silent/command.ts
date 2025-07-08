import { buildCommand, numberParser } from '@stricli/core';
import { ScopeName } from '@transcend-io/privacy-types';
import {
  createAuthParameter,
  createTranscendUrlParameter,
} from '../../../cli/common-parameters';
import { arrayParser, dateParser } from '../../../cli/parsers';

export const markSilentCommand = buildCommand({
  loader: async () => {
    const { markSilent } = await import('./impl');
    return markSilent;
  },
  parameters: {
    flags: {
      auth: createAuthParameter({
        scopes: [ScopeName.ManageRequestCompilation],
      }),
      actions: {
        kind: 'parsed',
        parse: String,
        variadic: ',',
        brief: 'The request actions to mark silent',
      },
      statuses: {
        kind: 'parsed',
        parse: arrayParser,
        brief: 'The request statuses to mark silent. Comma-separated list.',
        default:
          'REQUEST_MADE,WAITING,ENRICHING,COMPILING,DELAYED,APPROVING,SECONDARY,SECONDARY_APPROVING',
      },
      requestIds: {
        kind: 'parsed',
        parse: String,
        variadic: ',',
        brief: 'Specify the specific request IDs to mark silent',
        optional: true,
      },
      createdAtBefore: {
        kind: 'parsed',
        parse: dateParser,
        brief: 'Mark silent requests that were submitted before this time',
        optional: true,
      },
      createdAtAfter: {
        kind: 'parsed',
        parse: dateParser,
        brief: 'Mark silent requests that were submitted after this time',
        optional: true,
      },
      transcendUrl: createTranscendUrlParameter(),
      concurrency: {
        kind: 'parsed',
        parse: numberParser,
        brief: 'The concurrency to use when uploading requests in parallel',
        default: '50',
      },
    },
  },
  docs: {
    brief: 'Bulk update a set of privacy requests to be in silent mode',
    fullDescription: `Bulk update a set of privacy requests from the DSR Automation -> Incoming Requests tab to be in silent mode.`,
  },
});
