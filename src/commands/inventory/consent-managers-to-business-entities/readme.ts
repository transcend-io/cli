import { buildExamples } from '../../../lib/docgen/buildExamples';
import type { ConsentManagersToBusinessEntitiesCommandFlags } from './impl';

const examples = buildExamples<ConsentManagersToBusinessEntitiesCommandFlags>(
  ['inventory', 'consent-managers-to-business-entities'],
  [
    {
      description:
        'Combine files in folder to file ./combined-business-entities.yml',
      flags: {
        consentManagerYmlFolder: './working/consent-managers/',
      },
    },
    {
      description: 'Specify custom output file',
      flags: {
        consentManagerYmlFolder: './working/consent-managers/',
        output: './custom.yml',
      },
    },
  ],
);

export default `#### Examples

${examples}`;
