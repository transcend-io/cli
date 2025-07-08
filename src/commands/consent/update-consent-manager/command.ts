import { buildCommand } from '@stricli/core';
import { ScopeName } from '@transcend-io/privacy-types';
import {
  createAuthParameter,
  createTranscendUrlParameter,
} from '@/cli/common-parameters';
import { arrayParser } from '@/cli/parsers';

export const updateConsentManagerCommand = buildCommand({
  loader: async () => {
    const { updateConsentManager } = await import('./impl');
    return updateConsentManager;
  },
  parameters: {
    flags: {
      auth: createAuthParameter({
        scopes: [ScopeName.ManageConsentManagerDeveloperSettings],
      }),
      bundleTypes: {
        kind: 'parsed',
        parse: arrayParser,
        brief: 'The bundle types to deploy. Comma-separated list.',
        default: 'PRODUCTION,TEST',
      },
      deploy: {
        kind: 'boolean',
        brief:
          'When true, deploy the Consent Manager after updating the version',
        default: false,
      },
      transcendUrl: createTranscendUrlParameter(),
    },
  },
  docs: {
    brief: 'Update consent manager',
    fullDescription:
      'This command allows for updating Consent Manager to latest version. The consent manager bundle can also be deployed using this command.',
  },
});
