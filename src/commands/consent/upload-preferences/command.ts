import { buildCommand, numberParser } from '@stricli/core';
import { ScopeName } from '@transcend-io/privacy-types';
import {
  createAuthParameter,
  createConsentUrlParameter,
  createSombraAuthParameter,
} from '../../../lib/cli/common-parameters';

export const uploadPreferencesCommand = buildCommand({
  loader: async () => {
    const { uploadPreferences } = await import('./impl');
    return uploadPreferences;
  },
  parameters: {
    flags: {
      auth: createAuthParameter({
        scopes: [
          ScopeName.ManageStoredPreferences,
          ScopeName.ViewManagedConsentDatabaseAdminApi,
          ScopeName.ViewPreferenceStoreSettings,
        ],
      }),
      partition: {
        kind: 'parsed',
        parse: String,
        brief: 'The partition key to download consent preferences to',
      },
      sombraAuth: createSombraAuthParameter(),
      consentUrl: createConsentUrlParameter(),
      file: {
        kind: 'parsed',
        parse: String,
        brief: 'Path to the CSV file to load preferences from',
        optional: true,
      },
      directory: {
        kind: 'parsed',
        parse: String,
        brief: 'Path to the directory of CSV files to load preferences from',
        optional: true,
      },
      dryRun: {
        kind: 'boolean',
        brief:
          'Whether to do a dry run only - will write results to receiptFilepath without updating Transcend',
        default: false,
      },
      skipExistingRecordCheck: {
        kind: 'boolean',
        brief:
          'Whether to skip the check for existing records. SHOULD ONLY BE USED FOR INITIAL UPLOAD',
        default: false,
      },
      receiptFileDir: {
        kind: 'parsed',
        parse: String,
        brief: 'Directory path where the response receipts should be saved',
        default: './receipts',
      },
      skipWorkflowTriggers: {
        kind: 'boolean',
        brief:
          'Whether to skip workflow triggers when uploading to preference store',
        default: false,
      },
      forceTriggerWorkflows: {
        kind: 'boolean',
        brief:
          'Whether to force trigger workflows for existing consent records',
        default: false,
      },
      skipConflictUpdates: {
        kind: 'boolean',
        brief:
          'Whether to skip uploading of any records where the preference store and file have a hard conflict',
        default: false,
      },
      isSilent: {
        kind: 'boolean',
        brief: 'Whether to skip sending emails in workflows',
        default: true,
      },
      attributes: {
        kind: 'parsed',
        parse: String,
        brief:
          'Attributes to add to any DSR request if created. Comma-separated list of key:value pairs.',
        default: 'Tags:transcend-cli,Source:transcend-cli',
      },
      receiptFilepath: {
        kind: 'parsed',
        parse: String,
        brief: 'Store resulting, continuing where left off',
        default: './preference-management-upload-receipts.json',
      },
      concurrency: {
        kind: 'parsed',
        parse: numberParser,
        brief: 'The concurrency to use when uploading in parallel',
        default: '10',
      },
    },
  },
  docs: {
    brief: 'Upload preference management data to your Preference Store',
    fullDescription: `Upload preference management data to your Preference Store.

This command prompts you to map the shape of the CSV to the shape of the Transcend API. There is no requirement for the shape of the incoming CSV, as the script will handle the mapping process.

The script will also produce a JSON cache file that allows for the mappings to be preserved between runs.`,
  },
});
