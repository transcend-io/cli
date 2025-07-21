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

export default `#### Usage

${examples}`;
