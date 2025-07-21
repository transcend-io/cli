import { buildExamples } from '../../../lib/docgen/buildExamples';
import type { PullUnstructuredDiscoveryFilesCommandFlags } from './impl';

const examples = buildExamples<PullUnstructuredDiscoveryFilesCommandFlags>(
  ['inventory', 'pull-unstructured-discovery-files'],
  [
    {
      description: 'All arguments',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        file: './unstructured-discovery-files.csv',
        transcendUrl: 'https://api.us.transcend.io',
        dataSiloIds: 'f956ccce-5534-4328-a78d-3a924b1fe429',
        subCategories:
          '79d998b7-45dd-481c-ae3a-856fd93458b2,9ecc213a-cd46-46d6-afd9-46cea713f5d1',
        status: 'VALIDATED,MANUALLY_ADDED,CORRECTED',
        includeEncryptedSnippets: 'true',
      },
    },
    {
      description:
        'Specify the backend URL, needed for US hosted backend infrastructure',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        transcendUrl: 'https://api.us.transcend.io',
      },
    },
    {
      description: 'Pull entries for specific data silos',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        dataSiloIds: 'f956ccce-5534-4328-a78d-3a924b1fe429',
      },
    },
    {
      description: 'Filter by data categories',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        subCategories:
          '79d998b7-45dd-481c-ae3a-856fd93458b2,9ecc213a-cd46-46d6-afd9-46cea713f5d1',
      },
    },
    {
      description:
        'Filter by classification status (exclude unconfirmed recommendations)',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        status: 'VALIDATED,MANUALLY_ADDED,CORRECTED',
      },
    },
    {
      description:
        'Filter by classification status (include rejected recommendations)',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        status: 'REJECTED',
      },
    },
  ],
);

export default `#### Examples

${examples}`;
