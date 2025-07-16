import { buildCommand } from '@stricli/core';
import {
  createAuthParameter,
  createTranscendUrlParameter,
} from '../../../lib/cli/common-parameters';

export const deriveDataSilosFromDataFlowsCrossInstanceCommand = buildCommand({
  loader: async () => {
    const { deriveDataSilosFromDataFlowsCrossInstance } = await import(
      './impl'
    );
    return deriveDataSilosFromDataFlowsCrossInstance;
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
      output: {
        kind: 'parsed',
        parse: String,
        brief:
          'The output transcend.yml file containing the data silo configurations',
        default: './transcend.yml',
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
    brief: 'Derive data silos from data flows cross instance',
    fullDescription:
      'Given a folder of data flow transcend.yml configurations, convert those configurations to a single transcend.yml configurations of all related data silos.',
  },
});
