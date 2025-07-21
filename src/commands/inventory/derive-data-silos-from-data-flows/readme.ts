import { buildExamples } from '../../../lib/docgen/buildExamples';
import type { DeriveDataSilosFromDataFlowsCommandFlags } from './impl';

const examples = buildExamples<DeriveDataSilosFromDataFlowsCommandFlags>(
  ['inventory', 'derive-data-silos-from-data-flows'],
  [
    {
      description:
        'Convert data flow configurations in folder to data silo configurations in folder',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        dataFlowsYmlFolder: './working/data-flows/',
        dataSilosYmlFolder: './working/data-silos/',
      },
    },
    {
      description: 'Use with US backend',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        dataFlowsYmlFolder: './working/data-flows/',
        dataSilosYmlFolder: './working/data-silos/',
        transcendUrl: 'https://api.us.transcend.io',
      },
    },
    {
      description: 'Skip a set of yml files',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        dataFlowsYmlFolder: './working/data-flows/',
        dataSilosYmlFolder: './working/data-silos/',
        ignoreYmls: 'Skip.yml,Other.yml',
      },
    },
  ],
);

export default `#### Usage

${examples}`;
