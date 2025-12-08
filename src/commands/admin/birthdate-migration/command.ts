import { buildCommand, numberParser } from '@stricli/core';
import { ScopeName } from '@transcend-io/privacy-types';
import {
  createAuthParameter,
  createSombraAuthParameter,
  createTranscendUrlParameter,
} from '../../../lib/cli/common-parameters';

export const birthdateMigrationCommand = buildCommand({
  loader: async () => {
    const { birthdateMigration } = await import('./impl');
    return birthdateMigration;
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
        brief: 'The partition key to upload consent preferences to',
      },
      sombraAuth: createSombraAuthParameter(),
      transcendUrl: createTranscendUrlParameter(),
      chunksDir: {
        kind: 'parsed',
        parse: String,
        brief: 'Path to the directory containing chunked CSV files',
        default: './working/chunks',
      },
      outputDir: {
        kind: 'parsed',
        parse: String,
        brief: 'Path to the output directory for transformed CSV files',
        default: './working/transformed',
      },
      upload: {
        kind: 'boolean',
        brief: 'Whether to upload the transformed files after processing',
        default: false,
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
      concurrency: {
        kind: 'parsed',
        parse: numberParser,
        brief:
          'Number of concurrent batch uploads (higher = faster, but more API load)',
        default: '3',
      },
      maxRecords: {
        kind: 'parsed',
        parse: numberParser,
        brief: 'Maximum number of records to process (for testing)',
        optional: true,
      },
      checkpointFile: {
        kind: 'parsed',
        parse: String,
        brief: 'Path to checkpoint file for resume functionality',
        optional: true,
      },
      resume: {
        kind: 'boolean',
        brief: 'Resume from checkpoint if it exists',
        optional: true,
      },
      checkpointInterval: {
        kind: 'parsed',
        parse: numberParser,
        brief: 'Save checkpoint every N processed records',
        optional: true,
      },
      batchSize: {
        kind: 'parsed',
        parse: numberParser,
        brief: 'Number of records to upload in each batch',
        default: '500',
      },
      frequencyMapFile: {
        kind: 'parsed',
        parse: String,
        brief: 'Path to output file for birthdate frequency analysis',
        default: './working/transformed/birthdate-frequency-map.json',
      },
    },
  },
  docs: {
    brief:
      'BirthDate migration: filter, transform, and upload chunked CSV files',
    fullDescription: `Migrate birthDate data from top-level fields to metadata JSON objects.

This command:
1. Reads all CSV files from the chunks directory
2. Filters out records that already have birthDate in their metadata
3. Transforms remaining records by adding birthDate to the metadata JSON object
4. Writes transformed records to new CSV files in the output directory
5. Optionally uploads the transformed files to the Preference Store

Example usage:
  # Process and transform only (no upload)
  tr-cli admin birthdate-migration --partition <id> --chunks-dir ./working/chunks

  # Process, transform, and upload
  tr-cli admin birthdate-migration --partition <id> --chunks-dir ./working/chunks --upload

  # Dry run to test
  tr-cli admin birthdate-migration --partition <id> --chunks-dir ./working/chunks --upload --dry-run`,
  },
});
