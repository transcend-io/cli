import { buildExamples } from '../../../lib/docgen/buildExamples';
import { getExampleDate } from '../../../lib/docgen/getExampleDate';
import type { DeletePreferenceRecordsCommandFlags } from './impl';

const examples = buildExamples<DeletePreferenceRecordsCommandFlags>(
  ['consent', 'delete-preference-records'],
  [
    {
      description:
        'Delete preference records from preference store using a CSV file',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        partition: '4d1c5daa-90b7-4d18-aa40-f86a43d2c726',
        file: './preferences-to-delete.csv',
        receiptDirectory: './receipts',
        timestamp: getExampleDate('08/26/2024'),
      },
    },
    {
      description:
        'Delete preference records from preference store using multiple CSV files in a directory',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        partition: '4d1c5daa-90b7-4d18-aa40-f86a43d2c726',
        directory: './preferences-to-delete',
        receiptDirectory: './receipts',
        timestamp: getExampleDate('08/26/2024'),
      },
    },
    {
      description: 'Self-hosted Sombra: include Sombra internal key header',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        sombraAuth: '$SOMBRA_INTERNAL_KEY',
        partition: '4d1c5daa-90b7-4d18-aa40-f86a43d2c726',
        file: './preferences-to-delete.csv',
        receiptDirectory: './receipts',
        timestamp: getExampleDate('08/26/2024'),
      },
    },
    {
      description: 'Use a specific backend base URL (e.g., US-hosted)',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        sombraAuth: '$SOMBRA_INTERNAL_KEY',
        partition: '4d1c5daa-90b7-4d18-aa40-f86a43d2c726',
        file: './preferences-to-delete.csv',
        receiptDirectory: './receipts',
        transcendUrl: 'https://api.us.transcend.io',
        timestamp: getExampleDate('08/26/2024'),
      },
    },
    {
      description:
        'Configure maximum number of concurrent API calls for a deletion file',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        partition: '4d1c5daa-90b7-4d18-aa40-f86a43d2c726',
        file: './preferences-to-delete.csv',
        maxConcurrency: 100,
        fileConcurrency: 10,
        maxItemsInChunk: 5,
        receiptDirectory: './receipts',
        timestamp: getExampleDate('08/26/2024'),
      },
    },
    {
      description: 'Configure maximum number of files to process concurrently',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        partition: '4d1c5daa-90b7-4d18-aa40-f86a43d2c726',
        file: './preferences-to-delete.csv',
        fileConcurrency: 10,
        receiptDirectory: './receipts',
        timestamp: getExampleDate('08/26/2024'),
      },
    },
    {
      description: 'Configure maximum items in chunk',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        partition: '4d1c5daa-90b7-4d18-aa40-f86a43d2c726',
        file: './preferences-to-delete.csv',
        maxItemsInChunk: 5,
        receiptDirectory: './receipts',
        timestamp: getExampleDate('08/26/2024'),
      },
    },
  ],
);

export default `A sample CSV can be found [here](./examples/cli-delete-preference-records-example.csv).

#### Examples

${examples}`;
