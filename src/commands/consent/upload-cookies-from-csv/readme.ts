import { ConsentTrackerStatus } from '@transcend-io/privacy-types';
import { buildExamples } from '../../../lib/docgen/buildExamples';
import type { UploadCookiesFromCsvCommandFlags } from './impl';

const examples = buildExamples<UploadCookiesFromCsvCommandFlags>(
  ['consent', 'upload-cookies-from-csv'],
  [
    {
      description:
        'Upload the file of cookies in ./cookies.csv into the "Approved" tab',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        trackerStatus: ConsentTrackerStatus.Live,
      },
    },
    {
      description:
        'Upload the file of cookies in ./cookies.csv into the "Triage" tab',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        trackerStatus: ConsentTrackerStatus.NeedsReview,
      },
    },
    {
      description: 'Specifying the CSV file to read from',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        trackerStatus: ConsentTrackerStatus.Live,
        file: './custom/my-cookies.csv',
      },
    },
    {
      description:
        'Specifying the backend URL, needed for US hosted backend infrastructure',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        trackerStatus: ConsentTrackerStatus.Live,
        transcendUrl: 'https://api.us.transcend.io',
      },
    },
  ],
);

export default `#### Examples

${examples}`;
