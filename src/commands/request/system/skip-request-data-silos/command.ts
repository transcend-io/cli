import { buildCommand } from '@stricli/core';
import {
  RequestDataSiloStatus,
  RequestStatus,
  ScopeName,
} from '@transcend-io/privacy-types';
import {
  createAuthParameter,
  createTranscendUrlParameter,
} from '../../../../lib/cli/common-parameters';
import { uuidParser } from '../../../../lib/cli/parsers';

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
        kind: 'enum',
        values: Object.values(RequestStatus),
        variadic: ',',
        brief: 'The request statuses to skip',
      },
      status: {
        kind: 'enum',
        values: [RequestDataSiloStatus.Skipped, RequestDataSiloStatus.Resolved],
        brief: 'The status to set the request data silo job to',
        default: RequestDataSiloStatus.Skipped,
      },
    },
  },
  docs: {
    brief: 'Skip request data silos',
    fullDescription:
      'This command allows for bulk skipping all open privacy request jobs for a particular data silo. This command is useful if you want to disable a data silo and then clear out any active privacy requests that are still queued up for that data silo.',
  },
});
