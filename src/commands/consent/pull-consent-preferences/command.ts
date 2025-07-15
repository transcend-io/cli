import { buildCommand, numberParser } from '@stricli/core';
import { ScopeName } from '@transcend-io/privacy-types';
import {
  createAuthParameter,
  createSombraAuthParameter,
  createTranscendUrlParameter,
} from '@/lib/cli/common-parameters';
import { dateParser } from '@/lib/cli/parsers';

export const pullConsentPreferencesCommand = buildCommand({
  loader: async () => {
    const { pullConsentPreferences } = await import('./impl');
    return pullConsentPreferences;
  },
  parameters: {
    flags: {
      auth: createAuthParameter({
        scopes: [ScopeName.ViewManagedConsentDatabaseAdminApi],
      }),
      partition: {
        kind: 'parsed',
        parse: String,
        brief: 'The partition key to download consent preferences to',
      },
      sombraAuth: createSombraAuthParameter(),
      file: {
        kind: 'parsed',
        parse: String,
        brief: 'Path to the CSV file to save preferences to',
        default: './preferences.csv',
      },
      transcendUrl: createTranscendUrlParameter(),
      timestampBefore: {
        kind: 'parsed',
        parse: dateParser,
        brief: 'Filter for consents updated this time',
        optional: true,
      },
      timestampAfter: {
        kind: 'parsed',
        parse: dateParser,
        brief: 'Filter for consents updated after this time',
        optional: true,
      },
      identifiers: {
        kind: 'parsed',
        parse: String,
        variadic: ',',
        brief: 'Filter for specific identifiers',
        optional: true,
      },
      concurrency: {
        kind: 'parsed',
        parse: numberParser,
        brief: 'The concurrency to use when downloading consents in parallel',
        default: '100',
      },
    },
  },
  docs: {
    brief: 'Pull consent preferences',
    fullDescription:
      'This command allows for pull of consent preferences from the Managed Consent Database.',
  },
});
