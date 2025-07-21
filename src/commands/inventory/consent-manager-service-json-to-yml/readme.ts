import { buildExamples } from '../../../lib/docgen/buildExamples';
import type { ConsentManagerServiceJsonToYmlCommandFlags } from './impl';

const examples = buildExamples<ConsentManagerServiceJsonToYmlCommandFlags>(
  ['inventory', 'consent-manager-service-json-to-yml'],
  [
    {
      description:
        'Convert data flow configurations in folder to yml in ./transcend.yml',
      flags: {},
    },
    {
      description: 'With file locations',
      flags: {
        file: './folder/services.json',
        output: './folder/transcend.yml',
      },
    },
  ],
);

export default `#### Usage

${examples}`;
