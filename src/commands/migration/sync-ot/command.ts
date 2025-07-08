import { buildCommand } from '@stricli/core';
import { ScopeName } from '@transcend-io/privacy-types';
import {
  createAuthParameter,
  createTranscendUrlParameter,
} from '../../../cli/common-parameters';

export const syncOtCommand = buildCommand({
  loader: async () => {
    const { syncOt } = await import('./impl');
    return syncOt;
  },
  parameters: {
    flags: {
      hostname: {
        kind: 'parsed',
        parse: String,
        brief:
          'The domain of the OneTrust environment from which to pull the resource',
        optional: true,
      },
      oneTrustAuth: {
        kind: 'parsed',
        parse: String,
        brief:
          'The OAuth access token with the scopes necessary to access the OneTrust Public APIs',
        optional: true,
      },
      source: {
        kind: 'parsed',
        parse: String,
        brief: 'Whether to read the assessments from OneTrust or from a file',
        default: 'oneTrust',
      },
      transcendAuth: {
        ...createAuthParameter({
          scopes: [ScopeName.ManageAssessments],
        }),
        optional: true,
      },
      transcendUrl: createTranscendUrlParameter(),
      file: {
        kind: 'parsed',
        parse: String,
        brief:
          'Path to the file to pull the resource into. Must be a json file!',
        optional: true,
      },
      resource: {
        kind: 'parsed',
        parse: String,
        brief:
          'The resource to pull from OneTrust. For now, only assessments is supported',
        default: 'assessments',
      },
      dryRun: {
        kind: 'boolean',
        brief:
          'Whether to export the resource to a file rather than sync to Transcend',
        default: false,
      },
      debug: {
        kind: 'boolean',
        brief: 'Whether to print detailed logs in case of error',
        default: false,
      },
    },
  },
  docs: {
    brief: 'Sync OneTrust data',
    fullDescription: `Pulls resources from a OneTrust and syncs them to a Transcend instance. For now, it only supports retrieving OneTrust Assessments.

This command can be helpful if you are looking to:
- Pull resources from your OneTrust account.
- Migrate your resources from your OneTrust account to Transcend.

OneTrust authentication requires an OAuth Token with scope for accessing the assessment endpoints.
If syncing the resources to Transcend, you will also need to generate an API key on the Transcend Admin Dashboard.`,
  },
});
