import { buildCommand } from '@stricli/core';
import { buildExampleCommand } from '../../../lib/docgen/buildExamples';
import { ConsentManagerServiceJsonToYmlCommandFlags } from './impl';
import { PushCommandFlags } from '../push/impl';

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

1. Run \`await airgap.getMetadata()\` on a site with airgap
2. Right click on the printed object, and click \`Copy object\`
3. Place output of file in a file named \`services.json\`
4. Run:

   ${buildExampleCommand<ConsentManagerServiceJsonToYmlCommandFlags>(
     ['inventory', 'consent-manager-service-json-to-yml'],
     {
       file: './services.json',
       output: './transcend.yml',
     },
     { argsIndent: 5 },
   )}

5. Run:

   ${buildExampleCommand<PushCommandFlags>(
     ['inventory', 'push'],
     {
       auth: '$TRANSCEND_API_KEY',
       file: './transcend.yml',
       classifyService: true,
     },
     { argsIndent: 5 },
   )}`,
  },
});
