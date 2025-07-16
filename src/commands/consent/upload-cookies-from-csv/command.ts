import { buildCommand } from '@stricli/core';
import { ConsentTrackerStatus, ScopeName } from '@transcend-io/privacy-types';
import {
  createAuthParameter,
  createTranscendUrlParameter,
} from '../../../lib/cli/common-parameters';

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
        kind: 'enum',
        values: Object.values(ConsentTrackerStatus),
        brief: 'The status of the cookies you will upload.',
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
    fullDescription: `Upload cookies from CSV. This command allows for uploading of cookies from CSV.

Step 1) Download the CSV of cookies that you want to edit from the Admin Dashboard under [Consent Management -> Cookies](https://app.transcend.io/consent-manager/cookies). You can download cookies from both the "Triage" and "Approved" tabs.

Step 2) You can edit the contents of the CSV file as needed. You may adjust the "Purpose" column, adjust the "Notes" column, add "Owners" and "Teams" or even add custom columns with additional metadata.

Step 3) Upload the modified CSV file back into the dashboard with this command.`,
  },
});
