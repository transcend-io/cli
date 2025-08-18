import { buildCommand, numberParser } from '@stricli/core';
import { ScopeName } from '@transcend-io/privacy-types';
import {
  createAuthParameter,
  createSombraAuthParameter,
  createTranscendUrlParameter,
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
      transcendUrl: createTranscendUrlParameter(),
      directory: {
        kind: 'parsed',
        parse: String,
        brief: 'Path to the directory of CSV files to load preferences from',
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
        brief:
          'Directory path where the response receipts should be saved. Defaults to ./receipts if a "file" is provided, or <directory>/../receipts if a "directory" is provided.',
        optional: true,
      },
      schemaFilePath: {
        kind: 'parsed',
        parse: String,
        brief:
          'The path to where the schema for the file should be saved. If file is provided, it will default to ./<filePrefix>-preference-upload-schema.json ' +
          'If directory is provided, it will default to <directory>/../preference-upload-schema.json',
        optional: true,
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
        brief:
          'The number of concurrent processes to use to upload the files. When this is not set, it defaults ' +
          'to the number of CPU cores available on the machine. ' +
          'e.g. if there are 5 concurrent processes for 15 files, each parallel job would get 3 files to process. ',
        optional: true,
      },
      uploadConcurrency: {
        kind: 'parsed',
        parse: numberParser,
        brief:
          'When uploading preferences to v1/preferences - this is the number of concurrent requests made at any given time by a single process.' +
          "This is NOT the batch size—it's how many batch *tasks* run in parallel. " +
          'The number of total concurrent requests is maxed out at concurrency * uploadConcurrency.',
        default: '75', // FIXME 25
      },
      maxChunkSize: {
        kind: 'parsed',
        parse: numberParser,
        brief:
          'When uploading preferences to v1/preferences - this is the maximum number of records to put in a single request.' +
          'The number of total concurrent records being put in at any one time is is maxed out at maxChunkSize * concurrency * uploadConcurrency.',
        default: '25',
      },
      rateLimitRetryDelay: {
        kind: 'parsed',
        parse: numberParser,
        brief:
          'When uploading preferences to v1/preferences - this is the number of milliseconds to wait before retrying a request that was rate limited. ' +
          'This is only used if the request is rate limited by the Transcend API. ' +
          'If the request fails for any other reason, it will not be retried. ',
        default: '3000',
      },
      uploadLogInterval: {
        kind: 'parsed',
        parse: numberParser,
        brief:
          'When uploading preferences to v1/preferences - this is the number of records after which to log progress. ' +
          'Output will be logged to console and also to the receipt file. ' +
          'Setting this value lower will allow for you to more easily pick up where you left off. ' +
          'Setting this value higher can avoid excessive i/o operations slowing down the upload. ' +
          'Default is a good optimization for most cases.',
        default: '1000',
      },
      downloadIdentifierConcurrency: {
        kind: 'parsed',
        parse: numberParser,
        brief:
          'When downloading identifiers for the upload - this is the number of concurrent requests to make. ' +
          'This is only used if the records are not already cached in the preference store. ',
        default: '30',
      },
      maxRecordsToReceipt: {
        kind: 'parsed',
        parse: numberParser,
        brief:
          'When writing out successful and pending records to the receipt file - this is the maximum number of records to write out. ' +
          'This is to avoid the receipt file getting too large for JSON.parse/stringify.',
        default: '10',
      },
      allowedIdentifierNames: {
        kind: 'parsed',
        parse: (value: string) => value.split(',').map((s) => s.trim()),
        brief:
          'Identifiers configured for the run. Comma-separated list of identifier names.',
      },
      identifierColumns: {
        kind: 'parsed',
        parse: (value: string) => value.split(',').map((s) => s.trim()),
        brief:
          'Columns in the CSV that should be used as identifiers. Comma-separated list of column names.',
      },
      columnsToIgnore: {
        kind: 'parsed',
        parse: (value: string) => value.split(',').map((s) => s.trim()),
        brief:
          'Columns in the CSV that should be ignored. Comma-separated list of column names.',
        optional: true,
      },
    },
  },
  docs: {
    brief: 'Upload preference management data to your Preference Store',
    fullDescription: `Upload preference management data to your Preference Store.

This command prompts you to map the shape of the CSV to the shape of the Transcend API. There is no requirement for the shape of the incoming CSV, as the script will handle the mapping process.

The script will also produce a JSON cache file that allows for the mappings to be preserved between runs.

Parallel preference uploader (Node 22+ ESM/TS)
-----------------------------------------------------------------------------
- Spawns a pool of child *processes* (not threads) to run uploads in parallel.
- Shows a live dashboard in the parent terminal with progress per worker.
- Creates per-worker log files and (optionally) opens OS terminals to tail them.
- Uses the same module as both parent and child; the child mode is toggled
  by the presence of a CLI flag ('--child-upload-preferences').`,
  },
});
