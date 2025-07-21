import {
  buildExamples,
  buildExampleCommand,
} from '../../../lib/docgen/buildExamples';
import { ScopeName, TRANSCEND_SCOPES } from '@transcend-io/privacy-types';
import type { UpdateConsentManagerCommandFlags } from './impl';
import type { GenerateApiKeysCommandFlags } from '../../admin/generate-api-keys/impl';

const examples = buildExamples<UpdateConsentManagerCommandFlags>(
  ['consent', 'update-consent-manager'],
  [
    {
      description: 'Update Consent Manager to latest version',
      flags: {
        auth: '$TRANSCEND_API_KEY',
      },
    },
    {
      description:
        'Specifying the backend URL, needed for US hosted backend infrastructure',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        transcendUrl: 'https://api.us.transcend.io',
      },
    },
    {
      description: 'Update version and deploy bundles',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        deploy: 'true',
      },
    },
    {
      description: 'Update just the TEST bundle',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        bundleTypes: 'TEST',
      },
    },
    {
      description: 'Update just the PRODUCTION bundle',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        bundleTypes: 'PRODUCTION',
      },
    },
  ],
);

export default `#### Examples

${examples}

**Update multiple organizations at once**

\`\`\`sh
${buildExampleCommand<GenerateApiKeysCommandFlags>(
  ['admin', 'generate-api-keys'],
  {
    email: 'test@transcend.io',
    password: '$TRANSCEND_PASSWORD',
    scopes: `${TRANSCEND_SCOPES[ScopeName.ManageConsentManager].title}`,
    apiKeyTitle: 'CLI Usage Cross Instance Sync',
    file: './transcend-api-keys.json',
  },
)}
${buildExampleCommand<UpdateConsentManagerCommandFlags>(
  ['consent', 'update-consent-manager'],
  {
    auth: './transcend-api-keys.json',
    deploy: 'true',
  },
)}
\`\`\``;
