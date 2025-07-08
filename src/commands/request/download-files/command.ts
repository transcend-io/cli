import { buildCommand, numberParser } from '@stricli/core';
import { ScopeName } from '@transcend-io/privacy-types';
import {
  createAuthParameter,
  createSombraAuthParameter,
  createTranscendUrlParameter,
} from '../../../cli/common-parameters';
import { arrayParser, dateParser } from '../../../cli/parsers';

export const downloadFilesCommand = buildCommand({
  loader: async () => {
    const { downloadFiles } = await import('./impl');
    return downloadFiles;
  },
  parameters: {
    flags: {
      auth: createAuthParameter({
        scopes: [
          ScopeName.ViewRequestCompilation,
          ScopeName.ViewRequests,
          ScopeName.RequestApproval,
        ],
      }),
      sombraAuth: createSombraAuthParameter(),
      concurrency: {
        kind: 'parsed',
        parse: numberParser,
        brief: 'The concurrency to use when downloading requests in parallel',
        default: '10',
      },
      requestIds: {
        kind: 'parsed',
        parse: String,
        variadic: ',',
        brief: 'Specify the specific request IDs to download',
        optional: true,
      },
      statuses: {
        kind: 'parsed',
        parse: arrayParser,
        brief: 'The request statuses to download. Comma-separated list.',
        default: 'APPROVING,DOWNLOADABLE',
      },
      folderPath: {
        kind: 'parsed',
        parse: String,
        brief: 'The folder to download files to',
        default: './dsr-files',
      },
      createdAtBefore: {
        kind: 'parsed',
        parse: dateParser,
        brief: 'Download requests that were submitted before this time',
        optional: true,
      },
      createdAtAfter: {
        kind: 'parsed',
        parse: dateParser,
        brief: 'Download requests that were submitted after this time',
        optional: true,
      },
      approveAfterDownload: {
        kind: 'boolean',
        brief:
          'If the request is in status=APPROVING, approve the request after its downloaded',
        default: false,
      },
      transcendUrl: createTranscendUrlParameter(),
    },
  },
  docs: {
    brief:
      'Download the files associated with a Data Subject Access Request (DSAR)',
    fullDescription:
      'Download the files associated with a Data Subject Access Request (DSAR) from DSR Automation -> Incoming Requests tab.',
  },
});
