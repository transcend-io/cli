import { buildCommand } from '@stricli/core';
import { name } from '../../../constants';

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
    brief: 'Convert consent manager services to transcend.yml',
    fullDescription: `Import the services from an airgap.js file into a Transcend instance.

Step 1) Run \`await airgap.getMetadata()\` on a site with airgap
Step 2) Right click on the printed object, and click \`Copy object\`
Step 3) Place output of file in a file named \`services.json\`
Step 4) Run \`${name} consent consent-manager-service-json-to-yml --file=./services.json --output=./transcend.yml\`
Step 5) Run \`${name} inventory push --auth=$TRANSCEND_API_KEY --file=./transcend.yml --classifyService=true\``,
  },
});
