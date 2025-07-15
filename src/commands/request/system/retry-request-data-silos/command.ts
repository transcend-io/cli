import { buildCommand } from '@stricli/core';
import { RequestAction, ScopeName } from '@transcend-io/privacy-types';
import {
  createAuthParameter,
  createTranscendUrlParameter,
} from '@/lib/cli/common-parameters';
import { uuidParser } from '@/lib/cli/parsers';

export const retryRequestDataSilosCommand = buildCommand({
  loader: async () => {
    const { retryRequestDataSilos } = await import('./impl');
    return retryRequestDataSilos;
  },
  parameters: {
    flags: {
      auth: createAuthParameter({
        scopes: [ScopeName.ManageRequestCompilation],
      }),
      dataSiloId: {
        kind: 'parsed',
        parse: uuidParser,
        brief: 'The ID of the data silo to pull in',
      },
      actions: {
        kind: 'enum',
        values: Object.values(RequestAction),
        variadic: ',',
        brief: 'The request actions to restart',
      },
      transcendUrl: createTranscendUrlParameter(),
    },
  },
  docs: {
    brief: 'Retry request data silos',
    fullDescription:
      'This command allows for bulk restarting a set of data silos jobs for open privacy requests. This is equivalent to clicking the "Wipe and Retry" button for a particular data silo across a set of privacy requests.',
  },
});
