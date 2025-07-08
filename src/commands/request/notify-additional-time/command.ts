import { buildCommand, numberParser } from '@stricli/core';
import { ScopeName } from '@transcend-io/privacy-types';
import {
  createAuthParameter,
  createTranscendUrlParameter,
} from '@/cli/common-parameters';
import { dateParser } from '@/cli/parsers';

export const notifyAdditionalTimeCommand = buildCommand({
  loader: async () => {
    const { notifyAdditionalTime } = await import('./impl');
    return notifyAdditionalTime;
  },
  parameters: {
    flags: {
      auth: createAuthParameter({
        scopes: [ScopeName.ViewRequests, ScopeName.RequestApproval],
      }),
      createdAtBefore: {
        kind: 'parsed',
        parse: dateParser,
        brief: 'Notify requests that are open but submitted before this time',
      },
      createdAtAfter: {
        kind: 'parsed',
        parse: dateParser,
        brief: 'Notify requests that are open but submitted after this time',
        optional: true,
      },
      actions: {
        kind: 'parsed',
        parse: String,
        variadic: ',',
        brief: 'The request actions to notify',
        optional: true,
      },
      daysLeft: {
        kind: 'parsed',
        parse: numberParser,
        brief:
          'Only notify requests that have less than this number of days until they are considered expired',
        default: '10',
      },
      days: {
        kind: 'parsed',
        parse: numberParser,
        brief: 'The number of days to adjust the expiration of the request to',
        default: '45',
      },
      requestIds: {
        kind: 'parsed',
        parse: String,
        variadic: ',',
        brief: 'Specify the specific request IDs to notify',
        optional: true,
      },
      emailTemplate: {
        kind: 'parsed',
        parse: String,
        brief:
          'The title of the email template that should be sent to the requests',
        default: 'Additional Time Needed',
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
    brief: 'Bulk notify a set of privacy requests that more time is needed',
    fullDescription:
      'Bulk notify a set of privacy requests from the DSR Automation -> Incoming Requests tab that more time is needed to complete the request. Note any request in silent mode will not be emailed.',
  },
});
