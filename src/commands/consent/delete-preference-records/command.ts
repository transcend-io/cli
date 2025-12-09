import { buildCommand, numberParser } from '@stricli/core';
import { ScopeName } from '@transcend-io/privacy-types';
import {
  createAuthParameter,
  createSombraAuthParameter,
  createTranscendUrlParameter,
} from '../../../lib/cli/common-parameters';
import { dateParser } from '../../../lib/cli/parsers';

export const deletePreferenceRecordsCommand = buildCommand({
  loader: async () => {
    const { deletePreferenceRecords } = await import('./impl');
    return deletePreferenceRecords;
  },
  parameters: {
    flags: {
      auth: createAuthParameter({
        scopes: [ScopeName.ManageStoredPreferences],
      }),
      sombraAuth: createSombraAuthParameter(),
      partition: {
        kind: 'parsed',
        parse: String,
        brief: 'Partition ID to used to delete preference records from',
      },
      timestamp: {
        kind: 'parsed',
        parse: dateParser,
        brief:
          'The timestamp when the deletion operation is made. Used for logging purposes.',
      },
      file: {
        kind: 'parsed',
        parse: String,
        optional: true,
        brief:
          'Path to the CSV file used to identify preference records to delete',
      },
      directory: {
        kind: 'parsed',
        parse: String,
        brief: 'Path to the directory of CSV files to load preferences from',
        optional: true,
      },
      transcendUrl: createTranscendUrlParameter(),
      maxItemsInChunk: {
        kind: 'parsed',
        parse: numberParser,
        brief:
          'When chunking, how many items to delete in a single chunk (higher = faster, but more load).',
        default: '10',
      },
      maxConcurrency: {
        kind: 'parsed',
        parse: numberParser,
        brief:
          'Number of concurrent requests to make when deleting preference records. (Higher = faster, but more load and rate limiting errors).',
        default: '10',
      },
      fileConcurrency: {
        kind: 'parsed',
        parse: numberParser,
        brief:
          'Number of files to process concurrently when deleting preference records from multiple files.',
        default: '5',
      },
      receiptDirectory: {
        kind: 'parsed',
        parse: String,
        brief: 'Directory to write receipts of failed deletions to.',
        default: './receipts',
      },
    },
  },
  docs: {
    brief: 'Delete consent preference records in bulk from Preference Store',
    fullDescription:
      'Uses POST /v1/preferences/{partition}/delete route on sombra to delete consent preference records in bulk ' +
      'from Preference Store based on a CSV file input.',
  },
});
