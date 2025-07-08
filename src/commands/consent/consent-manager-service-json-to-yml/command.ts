import { buildCommand } from '@stricli/core';

export const consentManagerServiceJsonToYmlCommand = buildCommand({
  loader: async () => {
    const { consentManagerServiceJsonToYml } = await import('./impl');
    return consentManagerServiceJsonToYml;
  },
  parameters: {
    flags: {
      file: {
        kind: 'parsed',
        parse: String,
        brief:
          'Path to the services.json file, output of await airgap.getMetadata()',
        default: './services.json',
      },
      output: {
        kind: 'parsed',
        parse: String,
        brief: 'Path to the output transcend.yml to write to',
        default: './transcend.yml',
      },
    },
  },
  docs: {
    brief: 'Convert consent manager service JSON to YML',
    fullDescription: `Import the services from an airgap.js file into a Transcend instance.`,
  },
});
