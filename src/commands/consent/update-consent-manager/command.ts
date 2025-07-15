import { buildCommand } from '@stricli/core';
import { ConsentBundleType, ScopeName } from '@transcend-io/privacy-types';
import {
  createAuthParameter,
  createTranscendUrlParameter,
} from '@/lib/cli/common-parameters';

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
        kind: 'enum',
        values: Object.values(ConsentBundleType),
        brief: 'The bundle types to deploy. Defaults to PRODUCTION,TEST.',
        variadic: ',',
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
      'This command allows for updating Consent Manager to latest version. The Consent Manager bundle can also be deployed using this command.',
  },
});
