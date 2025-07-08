import { buildCommand } from '@stricli/core';
import { ScopeName } from '@transcend-io/privacy-types';
import {
  createAuthParameter,
  createTranscendUrlParameter,
} from '../../../../cli/common-parameters';
import { arrayParser, uuidParser } from '../../../../cli/parsers';

export const skipRequestDataSilosCommand = buildCommand({
  loader: async () => {
    const { skipRequestDataSilos } = await import('./impl');
    return skipRequestDataSilos;
  },
  parameters: {
    flags: {
      auth: createAuthParameter({
        scopes: [ScopeName.ManageRequestCompilation],
      }),
      dataSiloId: {
        kind: 'parsed',
        parse: uuidParser,
        brief: 'The ID of the data silo to skip privacy request jobs for',
      },
      transcendUrl: createTranscendUrlParameter(),
      statuses: {
        kind: 'parsed',
        parse: arrayParser,
        brief:
          'The request statuses to mark as completed for. Comma-separated list.',
        default: 'COMPILING,SECONDARY',
      },
      status: {
        kind: 'parsed',
        parse: String,
        brief: 'The status to set the request data silo job to',
        default: 'SKIPPED',
      },
    },
  },
  docs: {
    brief: 'Skip request data silos',
    fullDescription:
      'This command allows for bulk skipping all open privacy request jobs for a particular data silo. This command is useful if you want to disable a data silo and then clear out any active privacy requests that are still queued up for that data silo.',
  },
});
