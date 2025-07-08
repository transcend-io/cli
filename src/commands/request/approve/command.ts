import { buildCommand, numberParser } from '@stricli/core';
import { ScopeName } from '@transcend-io/privacy-types';
import {
  createAuthParameter,
  createTranscendUrlParameter,
} from '../../../cli/common-parameters';
import { dateParser } from '../../../cli/parsers';

export const approveCommand = buildCommand({
  loader: async () => {
    const { approve } = await import('./impl');
    return approve;
  },
  parameters: {
    flags: {
      auth: createAuthParameter({
        scopes: [
          ScopeName.RequestApproval,
          ScopeName.ViewRequests,
          ScopeName.ManageRequestCompilation,
        ],
      }),
      actions: {
        kind: 'parsed',
        parse: String,
        variadic: ',',
        brief: 'The request actions to approve',
      },
      origins: {
        kind: 'parsed',
        parse: String,
        variadic: ',',
        brief: 'The request origins to approve',
        optional: true,
      },
      silentModeBefore: {
        kind: 'parsed',
        parse: dateParser,
        brief:
          'Any requests made before this date should be marked as silent mode',
        optional: true,
      },
      createdAtBefore: {
        kind: 'parsed',
        parse: dateParser,
        brief: 'Approve requests that were submitted before this time',
        optional: true,
      },
      createdAtAfter: {
        kind: 'parsed',
        parse: dateParser,
        brief: 'Approve requests that were submitted after this time',
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
    brief: 'Bulk approve a set of privacy requests',
    fullDescription:
      'Bulk approve a set of privacy requests from the DSR Automation -> Incoming Requests tab.',
  },
});
