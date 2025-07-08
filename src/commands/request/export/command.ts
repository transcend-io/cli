import { buildCommand, numberParser } from '@stricli/core';
import { ScopeName } from '@transcend-io/privacy-types';
import {
  createAuthParameter,
  createSombraAuthParameter,
  createTranscendUrlParameter,
} from '../../../cli/common-parameters';
import { dateParser } from '../../../cli/parsers';

export const exportCommand = buildCommand({
  loader: async () => {
    const { _export } = await import('./impl');
    return _export;
  },
  parameters: {
    flags: {
      auth: createAuthParameter({
        scopes: [ScopeName.ViewRequests, ScopeName.ViewRequestCompilation],
      }),
      sombraAuth: createSombraAuthParameter(),
      actions: {
        kind: 'parsed',
        parse: String,
        variadic: ',',
        brief: 'The request action to restart',
        optional: true,
      },
      statuses: {
        kind: 'parsed',
        parse: String,
        variadic: ',',
        brief: 'The request statuses to restart',
        optional: true,
      },
      transcendUrl: createTranscendUrlParameter(),
      file: {
        kind: 'parsed',
        parse: String,
        brief: 'Path to the CSV file where identifiers will be written to',
        default: './transcend-request-export.csv',
      },
      concurrency: {
        kind: 'parsed',
        parse: numberParser,
        brief: 'The concurrency to use when uploading requests in parallel',
        default: '100',
      },
      createdAtBefore: {
        kind: 'parsed',
        parse: dateParser,
        brief: 'Pull requests that were submitted before this time',
        optional: true,
      },
      createdAtAfter: {
        kind: 'parsed',
        parse: dateParser,
        brief: 'Pull requests that were submitted after this time',
        optional: true,
      },
      showTests: {
        kind: 'boolean',
        brief:
          'Filter for test requests or production requests - when not provided, pulls both',
        optional: true,
      },
    },
  },
  docs: {
    brief: 'Export privacy requests and request identifiers to a CSV file',
    fullDescription:
      'Export privacy requests and request identifiers to a CSV file.',
  },
});
