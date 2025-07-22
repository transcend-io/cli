import { buildExamples } from '../../../lib/docgen/buildExamples';
import type { DeriveDataSilosFromDataFlowsCrossInstanceCommandFlags } from './impl';

const examples =
  buildExamples<DeriveDataSilosFromDataFlowsCrossInstanceCommandFlags>(
    ['inventory', 'derive-data-silos-from-data-flows-cross-instance'],
    [
      {
        description:
          'Convert data flow configurations in folder to data silo configurations in file',
        flags: {
          auth: '$TRANSCEND_API_KEY',
          dataFlowsYmlFolder: './working/data-flows/',
        },
      },
      {
        description: 'Use with US backend',
        flags: {
          auth: '$TRANSCEND_API_KEY',
          dataFlowsYmlFolder: './working/data-flows/',
          transcendUrl: 'https://api.us.transcend.io',
        },
      },
      {
        description: 'Skip a set of yml files',
        flags: {
          auth: '$TRANSCEND_API_KEY',
          dataFlowsYmlFolder: './working/data-flows/',
          ignoreYmls: ['Skip.yml', 'Other.yml'],
        },
      },
      {
        description:
          'Convert data flow configurations in folder to data silo configurations in file',
        flags: {
          auth: '$TRANSCEND_API_KEY',
          dataFlowsYmlFolder: './working/data-flows/',
          output: './output.yml',
        },
      },
    ],
  );

export default `#### Examples

${examples}`;
