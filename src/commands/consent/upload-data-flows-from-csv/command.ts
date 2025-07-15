import { buildCommand } from '@stricli/core';
import { ConsentTrackerStatus, ScopeName } from '@transcend-io/privacy-types';
import {
  createAuthParameter,
  createTranscendUrlParameter,
} from '@/lib/cli/common-parameters';

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
        kind: 'enum',
        values: Object.values(ConsentTrackerStatus),
        brief: 'The status of the data flows you will upload.',
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
    fullDescription: `Upload data flows from CSV. This command allows for uploading of data flows from CSV.

Step 1) Download the CSV of data flows that you want to edit from the Admin Dashboard under [Consent Management -> Data Flows](https://app.transcend.io/consent-manager/data-flows). You can download data flows from both the "Triage" and "Approved" tabs.

Step 2) You can edit the contents of the CSV file as needed. You may adjust the "Purpose" column, adjust the "Notes" column, add "Owners" and "Teams" or even add custom columns with additional metadata.

Step 3) Upload the modified CSV file back into the dashboard with this command.`,
  },
});
