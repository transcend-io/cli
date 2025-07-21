import { buildExamples } from '../../../lib/docgen/buildExamples';
import type { UploadPreferencesCommandFlags } from './impl';

const examples = buildExamples<UploadPreferencesCommandFlags>(
  ['consent', 'upload-preferences'],
  [
    {
      description:
        'Upload consent preferences to partition key `4d1c5daa-90b7-4d18-aa40-f86a43d2c726`',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        partition: '4d1c5daa-90b7-4d18-aa40-f86a43d2c726',
      },
    },
    {
      description: 'Upload consent preferences with additional options',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        partition: '4d1c5daa-90b7-4d18-aa40-f86a43d2c726',
        file: './preferences.csv',
        dryRun: 'true',
        skipWorkflowTriggers: 'true',
        skipConflictUpdates: 'true',
        isSilent: 'false',
        attributes: 'Tags:transcend-cli,Source:transcend-cli',
        receiptFilepath: './preference-management-upload-receipts.json',
      },
    },
    {
      description:
        'Specifying the backend URL, needed for US hosted backend infrastructure',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        partition: '4d1c5daa-90b7-4d18-aa40-f86a43d2c726',
        consentUrl: 'https://consent.us.transcend.io',
      },
    },
  ],
);

export default `A sample CSV can be found [here](./examples/cli-upload-preferences-example.csv). In this example, \`Sales\` and \`Marketing\` are two custom Purposes, and \`SalesCommunications\` and \`MarketingCommunications\` are Preference Topics. During the interactive CLI prompt, you can map these columns to the slugs stored in Transcend!

#### Usage

${examples}`;
