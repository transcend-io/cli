import { buildCommand } from '@stricli/core';

export const consentManagersToBusinessEntitiesCommand = buildCommand({
  loader: async () => {
    const { consentManagersToBusinessEntities } = await import('./impl');
    return consentManagersToBusinessEntities;
  },
  parameters: {
    flags: {
      consentManagerYmlFolder: {
        kind: 'parsed',
        parse: String,
        brief:
          'Path to the folder of Consent Manager transcend.yml files to combine',
      },
      output: {
        kind: 'parsed',
        parse: String,
        brief:
          'Path to the output transcend.yml with business entity configuration',
        default: './combined-business-entities.yml',
      },
    },
  },
  docs: {
    brief: 'Convert consent managers to business entities',
    fullDescription: `This command allows for converting a folder or Consent Manager transcend.yml files into a single transcend.yml file where each consent manager configuration is a Business Entity in the data inventory.`,
  },
});
