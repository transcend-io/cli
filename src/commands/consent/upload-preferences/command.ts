import { buildCommand } from '@stricli/core';
import { ScopeName } from '@transcend-io/privacy-types';
import {
  createAuthParameter,
  createSombraAuthParameter,
} from '@/cli/common-parameters';
import { urlParser } from '@/cli/parsers';

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
      consentUrl: {
        kind: 'parsed',
        parse: urlParser,
        brief:
          'URL of the Transcend backend. Use https://consent.us.transcend.io for US hosting',
        default: 'https://consent.transcend.io',
      },
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
        brief: 'Attributes to add to any DSR request if created',
        default: 'Tags:transcend-cli,Source:transcend-cli',
      },
      receiptFilepath: {
        kind: 'parsed',
        parse: String,
        brief: 'Store resulting, continuing where left off',
        default: './preference-management-upload-receipts.json',
      },
    },
  },
  docs: {
    brief: 'Upload preferences',
    fullDescription:
      'This command allows for updating of preference management data to your Transcend Preference Store.',
  },
});
