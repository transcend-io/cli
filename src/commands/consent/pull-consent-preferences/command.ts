import { buildCommand, numberParser } from '@stricli/core';
import { ScopeName } from '@transcend-io/privacy-types';
import {
  createAuthParameter,
  createSombraAuthParameter,
  createTranscendUrlParameter,
} from '../../../lib/cli/common-parameters';
import { dateParser } from '../../../lib/cli/parsers';

export const pullConsentPreferencesCommand = buildCommand({
  loader: async () => {
    const { pullConsentPreferences } = await import('./impl');
    return pullConsentPreferences;
  },
  parameters: {
    flags: {
      auth: createAuthParameter({
        scopes: [
          ScopeName.ViewManagedConsentDatabaseAdminApi,
          ScopeName.ViewRequestIdentitySettings,
          ScopeName.ViewPreferenceStoreSettings,
        ],
      }),
      partition: {
        kind: 'parsed',
        parse: String,
        brief: 'Partition ID to query in the Preference Store',
      },
      sombraAuth: createSombraAuthParameter(),
      file: {
        kind: 'parsed',
        parse: String,
        brief: 'Path to CSV output file',
        default: './preferences.csv',
      },
      transcendUrl: createTranscendUrlParameter(),
      // "timestamp*" filters map to consent collection time
      timestampBefore: {
        kind: 'parsed',
        parse: dateParser,
        brief:
          'Filter: preferences collected before this time (timestampBefore)',
        optional: true,
      },
      timestampAfter: {
        kind: 'parsed',
        parse: dateParser,
        brief: 'Filter: preferences collected after this time (timestampAfter)',
        optional: true,
      },
      // "updated*" filters map to system.updatedAt window
      updatedBefore: {
        kind: 'parsed',
        parse: dateParser,
        brief:
          'Filter: preferences updated before this time (system.updatedAt)',
        optional: true,
      },
      updatedAfter: {
        kind: 'parsed',
        parse: dateParser,
        brief: 'Filter: preferences updated after this time (system.updatedAt)',
        optional: true,
      },
      identifiers: {
        kind: 'parsed',
        parse: String,
        variadic: ',',
        brief:
          'Filter specific users by identifier(s) as "name:value". ' +
          'If name is omitted, defaults to "email". Multiple values separated by commas.',
        optional: true,
      },
      concurrency: {
        kind: 'parsed',
        parse: numberParser,
        brief:
          'Page size / concurrency used when downloading (1–50 per API). Higher = fewer pages.',
        default: '50',
      },
      shouldChunk: {
        kind: 'boolean',
        brief: 'Whether to download requests in timestamp window chunks.',
        default: true,
      },
      windowConcurrency: {
        kind: 'parsed',
        parse: numberParser,
        brief:
          'When chunking, how many windows to download in parallel (higher = faster, but more load).',
        default: '100',
      },
      maxChunks: {
        kind: 'parsed',
        parse: numberParser,
        brief:
          'Maximum number of chunks to download (higher = more data, but more load).',
        default: '5000',
      },
      maxLookbackDays: {
        kind: 'parsed',
        parse: numberParser,
        brief:
          'Maximum lookback period in days for fetching consent preferences.',
        default: '3650',
      },
    },
  },
  docs: {
    brief: 'Pull consent preferences from the Managed Consent Database',
    fullDescription:
      'Uses POST /v1/preferences/{partition}/query with cursor-based pagination. ' +
      'Supports filtering by identifiers, collection timestamps, and system.updatedAt.',
  },
});
