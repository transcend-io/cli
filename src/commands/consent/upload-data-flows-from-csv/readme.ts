import { buildExamples } from '../../../lib/docgen/buildExamples';
import type { UploadDataFlowsFromCsvCommandFlags } from './impl';

const examples = buildExamples<UploadDataFlowsFromCsvCommandFlags>(
  ['consent', 'upload-data-flows-from-csv'],
  [
    {
      description:
        'Upload the file of data flows in ./data-flows.csv into the "Approved" tab',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        trackerStatus: 'LIVE',
      },
    },
    {
      description:
        'Upload the file of data flows in ./data-flows.csv into the "Triage" tab',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        trackerStatus: 'NEEDS_REVIEW',
      },
    },
    {
      description: 'Specifying the CSV file to read from',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        trackerStatus: 'LIVE',
        file: './custom/my-data-flows.csv',
      },
    },
    {
      description:
        "Have Transcend automatically fill in the service names by looking up the data flow host in Transcend's database",
      flags: {
        auth: '$TRANSCEND_API_KEY',
        trackerStatus: 'LIVE',
        classifyService: 'true',
      },
    },
    {
      description:
        'Specifying the backend URL, needed for US hosted backend infrastructure',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        trackerStatus: 'LIVE',
        transcendUrl: 'https://api.us.transcend.io',
      },
    },
  ],
);

export default `To get a CSV of data flows, you can download the data flows from the Admin Dashboard under [Consent Management -> Data Flows](https://app.transcend.io/consent-manager/data-flows). You can download data flows from both the "Triage" and "Approved" tabs.

<img width="4320" height="3071" alt="export-data-flows" src="https://github.com/user-attachments/assets/cfd9ea75-dd4a-42a6-98b7-2a54f565d783" />

#### Examples

${examples}`;
