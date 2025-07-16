import { buildCommand, numberParser } from '@stricli/core';
import {
  RequestAction,
  RequestStatus,
  ScopeName,
} from '@transcend-io/privacy-types';
import {
  createAuthParameter,
  createTranscendUrlParameter,
} from '../../../lib/cli/common-parameters';
import { dateParser } from '../../../lib/cli/parsers';

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
        kind: 'enum',
        values: Object.values(RequestAction),
        variadic: ',',
        brief: 'The request actions to mark silent',
      },
      statuses: {
        kind: 'enum',
        values: Object.values(RequestStatus),
        variadic: ',',
        brief:
          'The request statuses to mark silent. Comma-separated list. Defaults to REQUEST_MADE,WAITING,ENRICHING,COMPILING,DELAYED,APPROVING,SECONDARY,SECONDARY_APPROVING.',
        optional: true,
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
    fullDescription:
      'Bulk update a set of privacy requests from the DSR Automation -> Incoming Requests tab to be in silent mode.',
  },
});
