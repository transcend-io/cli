import { buildCommand } from '@stricli/core';
import { ScopeName } from '@transcend-io/privacy-types';
import {
  createAuthParameter,
  createTranscendUrlParameter,
} from '@/cli/common-parameters';

export const uploadCookiesFromCsvCommand = buildCommand({
  loader: async () => {
    const { uploadCookiesFromCsv } = await import('./impl');
    return uploadCookiesFromCsv;
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
          'Whether or not to upload the cookies into the "Approved" tab (LIVE) or the "Triage" tab (NEEDS_REVIEW)',
      },
      file: {
        kind: 'parsed',
        parse: String,
        brief: 'Path to the CSV file to upload',
        default: './cookies.csv',
      },
      transcendUrl: createTranscendUrlParameter(),
    },
  },
  docs: {
    brief: 'Upload cookies from CSV',
    fullDescription: 'This command allows for uploading cookies from CSV.',
  },
});
