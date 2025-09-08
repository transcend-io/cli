import { buildCommand, numberParser } from '@stricli/core';
import {
  RequestAction,
  RequestStatus,
  ScopeName,
} from '@transcend-io/privacy-types';
import {
  createAuthParameter,
  createSombraAuthParameter,
  createTranscendUrlParameter,
} from '../../../lib/cli/common-parameters';
import { dateParser } from '../../../lib/cli/parsers';

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
        kind: 'enum',
        values: Object.values(RequestAction),
        variadic: ',',
        brief: 'The request actions to export',
        optional: true,
      },
      statuses: {
        kind: 'enum',
        values: Object.values(RequestStatus),
        variadic: ',',
        brief: 'The request statuses to export',
        optional: true,
      },
      transcendUrl: createTranscendUrlParameter(),
      file: {
        kind: 'parsed',
        parse: String,
        brief: 'Path to the CSV file where identifiers will be written to',
        default: './transcend-request-export.csv',
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
      pageLimit: {
        kind: 'parsed',
        parse: numberParser,
        brief: 'The page limit to use when pulling in pages of requests',
        default: '100',
      },
    },
  },
  docs: {
    brief: 'Export privacy requests and request identifiers to a CSV file',
    fullDescription:
      'Export privacy requests and request identifiers to a CSV file.',
  },
});
