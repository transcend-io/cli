import { buildCommand } from '@stricli/core';
import { ScopeName } from '@transcend-io/privacy-types';
import {
  createAuthParameter,
  createTranscendUrlParameter,
} from '../../../lib/cli/common-parameters';

export const skipPreflightJobsCommand = buildCommand({
  loader: async () => {
    const { skipPreflightJobs } = await import('./impl');
    return skipPreflightJobs;
  },
  parameters: {
    flags: {
      auth: createAuthParameter({
        scopes: [ScopeName.ManageRequestCompilation],
      }),
      enricherIds: {
        kind: 'parsed',
        parse: String,
        variadic: ',',
        brief: 'The ID of the enrichers to skip privacy request jobs for',
      },
      transcendUrl: createTranscendUrlParameter(),
    },
  },
  docs: {
    brief: 'Skip preflight jobs',
    fullDescription: 'This command allows for bulk skipping preflight checks.',
  },
});
