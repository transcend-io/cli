import { buildCommand } from '@stricli/core';
import { ScopeName } from '@transcend-io/privacy-types';
import {
  createAuthParameter,
  createTranscendUrlParameter,
} from '../../../lib/cli/common-parameters';
import { parseDurationToMs } from '../../../lib/cli/parsers';

export const generateAccessTokensCommand = buildCommand({
  loader: async () => {
    const { generateAccessTokens } = await import('./impl');
    return generateAccessTokens;
  },
  parameters: {
    flags: {
      auth: createAuthParameter({
        scopes: [ScopeName.GeneratePreferenceAccessTokens],
      }),
      file: {
        kind: 'parsed',
        parse: String,
        brief:
          'Path to the CSV file containing user identifiers to generate access tokens for',
      },
      subjectType: {
        kind: 'parsed',
        parse: String,
        brief:
          'Slug for the data subject that the user will be logged in as on the Privacy Center. e.g. "customer" or "employee"',
      },
      emailColumnName: {
        kind: 'parsed',
        parse: String,
        brief:
          'Name of the column in the CSV that contains user email addresses',
        default: 'email',
      },
      coreIdentifierColumnName: {
        kind: 'parsed',
        parse: String,
        optional: true,
        brief:
          'Name of the column in the CSV that contains user core identifiers',
      },
      duration: {
        kind: 'parsed',
        parse: parseDurationToMs,
        brief:
          'How long the access tokens should be valid. Accepts human-friendly values ' +
          'like "2 days", "10h", "90 minutes". A bare number is interpreted as seconds ' +
          '(e.g., "300" = 5 minutes). Powered by the `ms` library: ' +
          'https://github.com/vercel/ms',
        // Default of "1y" → parsed to 31_557_600_000 ms
        default: '1y',
      },
      transcendUrl: createTranscendUrlParameter(),
    },
  },
  docs: {
    brief: 'Generate access tokens',
    fullDescription:
      'This command allows for the generation of access tokens for users specified in a CSV file.',
  },
});
