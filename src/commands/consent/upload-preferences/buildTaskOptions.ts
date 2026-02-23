// helpers/buildCommon.ts
import type { UploadPreferencesCommandFlags } from './impl';

/** Common options shared by upload tasks */
export type TaskCommonOpts = Pick<
  UploadPreferencesCommandFlags,
  | 'auth'
  | 'partition'
  | 'sombraAuth'
  | 'directory'
  | 'transcendUrl'
  | 'skipConflictUpdates'
  | 'uploadConcurrency'
  | 'uploadLogInterval'
  | 'maxChunkSize'
  | 'downloadIdentifierConcurrency'
  | 'rateLimitRetryDelay'
  | 'maxRecordsToReceipt'
  | 'skipWorkflowTriggers'
  | 'skipExistingRecordCheck'
  | 'isSilent'
  | 'dryRun'
  | 'attributes'
  | 'forceTriggerWorkflows'
  | 'allowedIdentifierNames'
  | 'identifierColumns'
  | 'columnsToIgnore'
  | 'skipMetadata'
> & {
  schemaFile: string;
  receiptsFolder: string;
};

/**
 * Copy the options from the main command over to the spawned tasks
 *
 * @param flags - All flags
 * @param schemaFile - Schema file
 * @param receiptsFolder - Receipts folder
 * @returns Common task options
 */
export function buildCommonOpts(
  flags: UploadPreferencesCommandFlags,
  schemaFile: string,
  receiptsFolder: string,
): TaskCommonOpts {
  const {
    auth,
    directory,
    sombraAuth,
    partition,
    transcendUrl,
    downloadIdentifierConcurrency,
    skipConflictUpdates,
    skipWorkflowTriggers,
    skipExistingRecordCheck,
    isSilent,
    dryRun,
    attributes,
    forceTriggerWorkflows,
    allowedIdentifierNames,
    identifierColumns,
    uploadConcurrency,
    maxChunkSize,
    rateLimitRetryDelay,
    maxRecordsToReceipt,
    uploadLogInterval,
    columnsToIgnore = [],
    skipMetadata = false,
  } = flags;

  return {
    schemaFile,
    receiptsFolder,
    auth,
    directory,
    downloadIdentifierConcurrency,
    sombraAuth,
    partition,
    transcendUrl,
    skipConflictUpdates,
    skipWorkflowTriggers,
    skipExistingRecordCheck,
    isSilent,
    dryRun,
    attributes,
    forceTriggerWorkflows,
    allowedIdentifierNames,
    identifierColumns,
    uploadConcurrency,
    maxChunkSize,
    rateLimitRetryDelay,
    maxRecordsToReceipt,
    uploadLogInterval,
    columnsToIgnore,
    skipMetadata,
  };
}
