import { buildCommand } from '@stricli/core';
import {
  createAuthParameter,
  createTranscendUrlParameter,
} from '@/lib/cli/common-parameters';

export const deriveDataSilosFromDataFlowsCommand = buildCommand({
  loader: async () => {
    const { deriveDataSilosFromDataFlows } = await import('./impl');
    return deriveDataSilosFromDataFlows;
  },
  parameters: {
    flags: {
      auth: createAuthParameter({
        scopes: [],
      }),
      dataFlowsYmlFolder: {
        kind: 'parsed',
        parse: String,
        brief: 'The folder that contains data flow yml files',
      },
      dataSilosYmlFolder: {
        kind: 'parsed',
        parse: String,
        brief: 'The folder that contains data silo yml files',
      },
      ignoreYmls: {
        kind: 'parsed',
        parse: String,
        variadic: ',',
        brief: 'The set of yml files that should be skipped when uploading',
        optional: true,
      },
      transcendUrl: createTranscendUrlParameter(),
    },
  },
  docs: {
    brief: 'Derive data silos from data flows',
    fullDescription:
      'Given a folder of data flow transcend.yml configurations, convert those configurations to set of data silo transcend.yml configurations.',
  },
});
