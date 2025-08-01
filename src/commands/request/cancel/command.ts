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

export const cancelCommand = buildCommand({
  loader: async () => {
    const { cancel } = await import('./impl');
    return cancel;
  },
  parameters: {
    flags: {
      auth: createAuthParameter({
        scopes: [ScopeName.ViewRequests, ScopeName.RequestApproval],
      }),
      actions: {
        kind: 'enum',
        values: Object.values(RequestAction),
        variadic: ',',
        brief: 'The request actions to cancel',
      },
      statuses: {
        kind: 'enum',
        values: Object.values(RequestStatus),
        variadic: ',',
        brief: 'The request statuses to cancel. Comma-separated list.',
        optional: true,
      },
      requestIds: {
        kind: 'parsed',
        parse: String,
        variadic: ',',
        brief: 'Specify the specific request IDs to cancel',
        optional: true,
      },
      silentModeBefore: {
        kind: 'parsed',
        parse: dateParser,
        brief:
          'Any requests made before this date should be marked as silent mode for canceling to skip email sending',
        optional: true,
      },
      createdAtBefore: {
        kind: 'parsed',
        parse: dateParser,
        brief: 'Cancel requests that were submitted before this time',
        optional: true,
      },
      createdAtAfter: {
        kind: 'parsed',
        parse: dateParser,
        brief: 'Cancel requests that were submitted after this time',
        optional: true,
      },
      cancellationTitle: {
        kind: 'parsed',
        parse: String,
        brief:
          'The title of the email template that should be sent to the requests upon cancelation',
        default: 'Request Canceled',
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
    brief: 'Bulk cancel a set of privacy requests',
    fullDescription:
      'Bulk cancel a set of privacy requests from the DSR Automation -> Incoming Requests tab.',
  },
});
