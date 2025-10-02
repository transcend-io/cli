import { buildCommand } from '@stricli/core';
import { ScopeName } from '@transcend-io/privacy-types';
import {
  createAuthParameter,
  createTranscendUrlParameter,
} from '../../../lib/cli/common-parameters';

export const generateAccessTokensCommand = buildCommand({
  loader: async () => {
    const { generateAccessTokens } = await import('./impl');
    return generateAccessTokens;
  },
  parameters: {
    flags: {
      auth: createAuthParameter({
        scopes: [ScopeName.ViewManagedConsentDatabaseAdminApi],
      }),
      file: {
        kind: 'parsed',
        parse: String,
        brief:
          'Path to the CSV file containing user identifiers to generate access tokens for',
        default: './users.csv',
      },
      transcendUrl: createTranscendUrlParameter(),
    },
  },
  docs: {
    brief: 'Pull consent preferences',
    fullDescription:
      'This command allows for pull of consent preferences from the Managed Consent Database.',
  },
});
