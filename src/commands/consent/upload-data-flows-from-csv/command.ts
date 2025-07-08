import { buildCommand } from '@stricli/core';
import { ScopeName } from '@transcend-io/privacy-types';
import {
  createAuthParameter,
  createTranscendUrlParameter,
} from '@/cli/common-parameters';

export const uploadDataFlowsFromCsvCommand = buildCommand({
  loader: async () => {
    const { uploadDataFlowsFromCsv } = await import('./impl');
    return uploadDataFlowsFromCsv;
  },
  parameters: {
    flags: {
      auth: createAuthParameter({
        scopes: [ScopeName.ManageDataFlow],
      }),
      trackerStatus: {
        kind: 'parsed',
        parse: String,
        brief:
          'Whether or not to upload the data flows into the "Approved" tab (LIVE) or the "Triage" tab (NEEDS_REVIEW)',
      },
      file: {
        kind: 'parsed',
        parse: String,
        brief: 'Path to the CSV file to upload',
        default: './data-flows.csv',
      },
      classifyService: {
        kind: 'boolean',
        brief:
          'When true, automatically assign the service for a data flow based on the domain that is specified',
        default: false,
      },
      transcendUrl: createTranscendUrlParameter(),
    },
  },
  docs: {
    brief: 'Upload data flows from CSV',
    fullDescription:
      'This command allows for uploading of data flows from CSV.',
  },
});
