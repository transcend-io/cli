import { buildExamples } from '../../../lib/docgen/buildExamples';
import type { PullDatapointsCommandFlags } from './impl';

const examples = buildExamples<PullDatapointsCommandFlags>(
  ['inventory', 'pull-datapoints'],
  [
    {
      description: 'All arguments',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        file: './datapoints.csv',
        includeGuessedCategories: 'true',
        parentCategories: 'CONTACT,ID,LOCATION',
        subCategories:
          '79d998b7-45dd-481c-ae3a-856fd93458b2,9ecc213a-cd46-46d6-afd9-46cea713f5d1',
        dataSiloIds: 'f956ccce-5534-4328-a78d-3a924b1fe429',
      },
    },
    {
      description: 'Pull datapoints for specific data silos',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        file: './datapoints.csv',
        dataSiloIds: 'f956ccce-5534-4328-a78d-3a924b1fe429',
      },
    },
    {
      description: 'Include attributes in the output',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        file: './datapoints.csv',
        includeAttributes: 'true',
      },
    },
    {
      description: 'Include guessed categories in the output',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        file: './datapoints.csv',
        includeGuessedCategories: 'true',
      },
    },
    {
      description: 'Filter by parent categories',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        file: './datapoints.csv',
        parentCategories: 'ID,LOCATION',
      },
    },
    {
      description: 'Filter by subcategories',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        file: './datapoints.csv',
        subCategories:
          '79d998b7-45dd-481c-ae3a-856fd93458b2,9ecc213a-cd46-46d6-afd9-46cea713f5d1',
      },
    },
    {
      description:
        'Specify the backend URL, needed for US hosted backend infrastructure',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        file: './datapoints.csv',
        transcendUrl: 'https://api.us.transcend.io',
      },
    },
  ],
);

export default `#### Usage

${examples}`;
