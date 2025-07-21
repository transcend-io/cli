import {
  buildExamples,
  buildExampleCommand,
} from '../../../lib/docgen/buildExamples';
import type { BuildXdiSyncEndpointCommandFlags } from './impl';
import type { GenerateApiKeysCommandFlags } from '../../admin/generate-api-keys/impl';
import { ScopeName, TRANSCEND_SCOPES } from '@transcend-io/privacy-types';

const examples = buildExamples<BuildXdiSyncEndpointCommandFlags>(
  ['consent', 'build-xdi-sync-endpoint'],
  [
    {
      description: 'Build XDI sync endpoint',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        xdiLocation: 'https://cdn.your-site.com/xdi.js',
      },
    },
    {
      description:
        'Specifying the backend URL, needed for US hosted backend infrastructure',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        xdiLocation: 'https://cdn.your-site.com/xdi.js',
        transcendUrl: 'https://api.us.transcend.io',
      },
    },
    {
      description: 'Pull to specific file location',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        xdiLocation: 'https://cdn.your-site.com/xdi.js',
        file: './my-folder/sync-endpoint.html',
      },
    },
    {
      description: "Don't filter out regular expressions",
      flags: {
        auth: '$TRANSCEND_API_KEY',
        xdiLocation: 'https://cdn.your-site.com/xdi.js',
        removeIpAddresses: 'false',
      },
    },
    {
      description:
        'Filter out certain domains that should not be included in the sync endpoint definition',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        xdiLocation: 'https://cdn.your-site.com/xdi.js',
        domainBlockList: 'ignored.com,localhost',
      },
    },
    {
      description: 'Override XDI allowed commands',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        xdiLocation: 'https://cdn.your-site.com/xdi.js',
        xdiAllowedCommands: 'ExtractIdentifiers:Simple',
      },
    },
  ],
);

export default `#### Usage

${examples}

**Configuring across multiple Transcend Instances**

\`\`\`sh
# Pull down API keys across all Transcend instances
${buildExampleCommand<GenerateApiKeysCommandFlags>(
  ['admin', 'generate-api-keys'],
  {
    email: '$TRANSCEND_EMAIL',
    password: '$TRANSCEND_PASSWORD',
    transcendUrl: 'https://api.us.transcend.io',
    scopes: TRANSCEND_SCOPES[ScopeName.ViewConsentManager].title,
    apiKeyTitle: '[cli][$TRANSCEND_EMAIL] XDI Endpoint Construction',
    file: './api-keys.json',
    parentOrganizationId: '1821d872-6114-406e-90c3-73b4d5e246cf',
  },
)}

# Path list of API keys as authentication
${buildExampleCommand<BuildXdiSyncEndpointCommandFlags>(
  ['consent', 'build-xdi-sync-endpoint'],
  {
    auth: './api-keys.json',
    xdiLocation: 'https://cdn.your-site.com/xdi.js',
    transcendUrl: 'https://api.us.transcend.io',
  },
)}
\`\`\``;
