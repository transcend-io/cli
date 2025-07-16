import { buildCommand } from '@stricli/core';
import { RequestAction, ScopeName } from '@transcend-io/privacy-types';
import {
  createAuthParameter,
  createTranscendUrlParameter,
} from '../../../lib/cli/common-parameters';

export const rejectUnverifiedIdentifiersCommand = buildCommand({
  loader: async () => {
    const { rejectUnverifiedIdentifiers } = await import('./impl');
    return rejectUnverifiedIdentifiers;
  },
  parameters: {
    flags: {
      auth: createAuthParameter({
        scopes: [ScopeName.ManageRequestCompilation],
      }),
      identifierNames: {
        kind: 'parsed',
        parse: String,
        variadic: ',',
        brief: 'The names of identifiers to clear out',
      },
      actions: {
        kind: 'enum',
        values: Object.values(RequestAction),
        variadic: ',',
        brief: 'The request action to restart',
        optional: true,
      },
      transcendUrl: createTranscendUrlParameter(),
    },
  },
  docs: {
    brief: 'Bulk clear out any request identifiers that are unverified',
    fullDescription:
      'Bulk clear out any request identifiers that are unverified.',
  },
});
