import { buildCommand, numberParser } from '@stricli/core';
import { ScopeName } from '@transcend-io/privacy-types';
import {
  createAuthParameter,
  createSombraAuthParameter,
  createTranscendUrlParameter,
} from '@/cli/common-parameters';
import { dateParser } from '@/cli/parsers';

export const restartCommand = buildCommand({
  loader: async () => {
    const { restart } = await import('./impl');
    return restart;
  },
  parameters: {
    flags: {
      auth: createAuthParameter({
        scopes: [
          ScopeName.MakeDataSubjectRequest,
          ScopeName.ViewRequestCompilation,
        ],
      }),
      actions: {
        kind: 'parsed',
        parse: String,
        variadic: ',',
        brief: 'The request action to restart',
      },
      statuses: {
        kind: 'parsed',
        parse: String,
        variadic: ',',
        brief: 'The request statuses to restart',
      },
      transcendUrl: createTranscendUrlParameter(),
      requestReceiptFolder: {
        kind: 'parsed',
        parse: String,
        brief:
          'The path to the folder where receipts of each upload are stored',
        default: './privacy-request-upload-receipts',
      },
      sombraAuth: createSombraAuthParameter(),
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
      emailIsVerified: {
        kind: 'boolean',
        brief:
          'Indicate whether the primary email address is verified. Set to false to send a verification email',
        default: true,
      },
      createdAt: {
        kind: 'parsed',
        parse: dateParser,
        brief: 'Restart requests that were submitted before a specific date',
        optional: true,
      },
      silentModeBefore: {
        kind: 'parsed',
        parse: dateParser,
        brief: 'Requests older than this date should be marked as silent mode',
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
      sendEmailReceipt: {
        kind: 'boolean',
        brief: 'Send email receipts to the restarted requests',
        default: false,
      },
      copyIdentifiers: {
        kind: 'boolean',
        brief: 'Copy over all enriched identifiers from the initial request',
        default: false,
      },
      skipWaitingPeriod: {
        kind: 'boolean',
        brief: 'Skip queued state of request and go straight to compiling',
        default: false,
      },
    },
  },
  docs: {
    brief:
      'Bulk update a set of privacy requests based on a set of request filters',
    fullDescription:
      'Bulk update a set of privacy requests based on a set of request filters.',
  },
});
