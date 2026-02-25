import colors from 'colors';
import * as t from 'io-ts';
import type { Got } from 'got';
import { logger } from '../../../../logger';
import { parseAttributesFromString, readCsv } from '../../../../lib/requests';
import {
  loadReferenceData,
  type PreferenceUploadReferenceData,
} from './loadReferenceData';
import { type PreferenceReceiptsInterface } from '../artifacts/receipts/receiptsState';
import { type PreferenceSchemaInterface } from '../schemaState';
import { parsePreferenceManagementCsvWithCache } from '../../../../lib/preference-management';
import type {
  FileFormatState,
  PendingSafePreferenceUpdates,
  PendingWithConflictPreferenceUpdates,
  SkippedPreferenceUpdates,
} from '../../../../lib/preference-management/codecs';
import type { FormattedAttribute } from '../../../../lib/graphql/formatAttributeValues';
import type { GraphQLClient } from 'graphql-request';
import { limitRecords } from '../../../../lib/helpers';
import { transformCsv } from './transform';
import type { PreferenceUploadProgress } from './types';

export interface InteractiveUploadPreferencePlan {
  /** CSV file path to load preference records from */
  file: string;
  /** Partition key used throughout the upload */
  partition: string;

  /** Parsed "workflow attributes" (Key:Value pairs) */
  parsedAttributes: FormattedAttribute[];
  /** Reference data for transforming rows → PreferenceUpdateItem payloads */
  references: PreferenceUploadReferenceData;
  /** Result sets derived entirely from validation/pre-processing */
  result: {
    pendingSafeUpdates: PendingSafePreferenceUpdates;
    pendingConflictUpdates: PendingWithConflictPreferenceUpdates;
    skippedUpdates: SkippedPreferenceUpdates;
  };

  /** Snapshot of schema mappings to use during payload building */
  schema: Omit<FileFormatState, 'lastFetchedAt'>;
}

/**
 * Build an InteractiveUploadPreferencePlan by performing *validation-only* work.
 *
 *  This performs *all pre-processing and validation* up front:
 *  - Reads the CSV
 *  - Validates timestamp column and identifier mappings (schema cache)
 *  - Maps columns to purposes/preferences
 *  - Loads current consent records (unless skipExistingRecordCheck=true)
 *  - Computes: pendingSafeUpdates / pendingConflictUpdates / skippedUpdates
 *  - Seeds the receipts file with snapshots of the pending sets
 *
 * The returned plan can be passed to `interactivePreferenceUploaderFromPlan`
 * to perform the actual upload, keeping responsibilities cleanly separated.
 *
 * @param opts - Input options required to parse & validate the CSV
 * @returns A fully-resolved plan ready to pass to the uploader
 */
export async function buildInteractiveUploadPreferencePlan({
  sombra,
  client,
  file,
  partition,
  receipts,
  schema,
  skipExistingRecordCheck = false,
  forceTriggerWorkflows = false,
  allowedIdentifierNames,
  downloadIdentifierConcurrency = 30,
  identifierDownloadLogInterval = 10000,
  maxRecordsToReceipt = 50,
  identifierColumns,
  columnsToIgnore = [],
  attributes = [],
  nonInteractive = false,
  onProgress,
}: {
  /** Transcend GraphQL client */
  client: GraphQLClient;
  /** Sombra instance to make requests to */
  sombra: Got;
  /** CSV file to process */
  file: string;
  /** Partition used to scope reads/writes */
  partition: string;
  /** Receipts snapshots */
  receipts: PreferenceReceiptsInterface;
  /** Schema information */
  schema: PreferenceSchemaInterface;
  /** Skip the preflight existing-record check for speed (initial loads only) */
  skipExistingRecordCheck?: boolean;
  /** Force workflow triggers; requires existing consent records for all rows */
  forceTriggerWorkflows?: boolean;
  /** Concurrency for downloading identifiers  */
  downloadIdentifierConcurrency?: number;
  /** Allowed identifier names configured for the org/run */
  allowedIdentifierNames: string[];
  /** CSV columns that correspond to identifiers */
  identifierColumns: string[];
  /** CSV columns to ignore entirely */
  columnsToIgnore?: string[];
  /** Extra workflow attributes (pre-parsed Key:Value strings) */
  attributes?: string[];
  /** Interval to log when downloading identifiers */
  identifierDownloadLogInterval?: number;
  /** Maximum records to write out to the receipt file */
  maxRecordsToReceipt?: number;
  /** When true, throw instead of prompting (for worker processes) */
  nonInteractive?: boolean;
  /** on progress callback */
  onProgress?: (info: PreferenceUploadProgress) => void;
}): Promise<InteractiveUploadPreferencePlan> {
  const parsedAttributes = parseAttributesFromString(attributes);

  // Informative status about prior runs (resume/diagnostics)
  const failing = receipts.getFailing();
  const pending = receipts.getPending();
  logger.info(
    colors.magenta(
      'Restored cache:\n' +
        `${Object.values(failing).length} failing requests queued for retry\n` +
        `${Object.values(pending).length} pending requests to process\n` +
        `Processing file: ${file}\n`,
    ),
  );

  // Build clients + reference data (purposes/topics/identifiers)
  const references = await loadReferenceData(client);

  // Read in the file
  logger.info(colors.magenta(`Reading in file: "${file}"`));
  const preferences = transformCsv(readCsv(file, t.record(t.string, t.string)));
  logger.info(colors.magenta(`Read in ${preferences.length} rows`));

  // Parse & validate CSV → derive safe/conflict/skipped sets (no uploading)
  const parsed = await parsePreferenceManagementCsvWithCache(
    preferences,
    {
      file,
      purposeSlugs: references.purposes.map((x) => x.trackingType),
      preferenceTopics: references.preferenceTopics,
      sombra,
      partitionKey: partition,
      skipExistingRecordCheck,
      forceTriggerWorkflows,
      orgIdentifiers: references.identifiers,
      allowedIdentifierNames,
      downloadIdentifierConcurrency,
      identifierColumns,
      identifierDownloadLogInterval,
      columnsToIgnore,
      onProgress,
      nonInteractive,
    },
    schema.state,
  );

  // Persist small snapshots of the pending sets into receipts for resumability.
  await receipts.setPendingSafe(
    limitRecords(parsed.pendingSafeUpdates, maxRecordsToReceipt),
  );
  await receipts.setSkipped(parsed.skippedUpdates);
  await receipts.setPendingConflict(parsed.pendingConflictUpdates);

  // Return a compact, self-contained plan for the upload stage.
  return {
    file,
    partition,
    parsedAttributes,
    references,
    result: {
      pendingSafeUpdates: parsed.pendingSafeUpdates,
      pendingConflictUpdates: parsed.pendingConflictUpdates,
      skippedUpdates: parsed.skippedUpdates,
    },
    schema: {
      timestampColumn: schema.getTimestampColumn(),
      columnToPurposeName: schema.getColumnToPurposeName(),
      columnToIdentifier: schema.getColumnToIdentifier(),
      columnToMetadata: schema.getColumnToMetadata(),
    },
  };
}
