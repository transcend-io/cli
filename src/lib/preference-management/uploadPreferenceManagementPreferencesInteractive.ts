import {
  buildTranscendGraphQLClient,
  createSombraGotInstance,
  fetchAllPurposes,
  fetchAllPreferenceTopics,
  PreferenceTopic,
  Purpose,
  fetchAllIdentifiers,
} from '../graphql';
import colors from 'colors';
import { map } from 'bluebird';
import { chunk } from 'lodash-es';
import { logger } from '../../logger';
import { parseAttributesFromString } from '../requests';
import { PersistedState } from '@transcend-io/persisted-state';
import { parsePreferenceManagementCsvWithCache } from './parsePreferenceManagementCsv';
import { FileFormatState, RequestUploadReceipts } from './codecs';
import { PreferenceUpdateItem } from '@transcend-io/privacy-types';
import { apply } from '@transcend-io/type-utils';
import { NONE_PREFERENCE_MAP } from './parsePreferenceFileFormatFromCsv';
import { getPreferenceUpdatesFromRow } from './getPreferenceUpdatesFromRow';
import { getPreferenceIdentifiersFromRow } from './parsePreferenceIdentifiersFromCsv';

/**
 * Upload a set of consent preferences
 *
 * @param options - Options
 */
export async function uploadPreferenceManagementPreferencesInteractive({
  auth,
  sombraAuth,
  receiptFilepath,
  schemaFilePath,
  file,
  partition,
  isSilent = true,
  dryRun = false,
  skipWorkflowTriggers = false,
  skipConflictUpdates = false,
  skipExistingRecordCheck = false,
  attributes = [],
  transcendUrl,
  forceTriggerWorkflows = false,
  allowedIdentifierNames,
  identifierColumns,
  columnsToIgnore = [],
}: {
  /** The Transcend API key */
  auth: string;
  /** Sombra API key authentication */
  sombraAuth?: string;
  /** Partition key */
  partition: string;
  /** File where to store receipt and continue from where left off */
  receiptFilepath: string;
  /** Path to schema file */
  schemaFilePath: string;
  /** The file to process */
  file: string;
  /** API URL for Transcend backend */
  transcendUrl: string;
  /** Whether to do a dry run */
  dryRun?: boolean;
  /** Whether to upload as isSilent */
  isSilent?: boolean;
  /** Attributes string pre-parse. In format Key:Value */
  attributes?: string[];
  /** Skip workflow triggers */
  skipWorkflowTriggers?: boolean;
  /**
   * When true, only update preferences that do not conflict with existing
   * preferences. When false, update all preferences in CSV based on timestamp.
   */
  skipConflictUpdates?: boolean;
  /** Whether to skip the check for existing records. SHOULD ONLY BE USED FOR INITIAL UPLOAD */
  skipExistingRecordCheck?: boolean;
  /** Whether to force trigger workflows */
  forceTriggerWorkflows?: boolean;
  /** identifiers configured for the run */
  allowedIdentifierNames: string[];
  /** identifier columns on the CSV file */
  identifierColumns: string[];
  /** Columns to ignore in the CSV file */
  columnsToIgnore: string[];
}): Promise<void> {
  // Parse out the extra attributes to apply to all requests uploaded
  const parsedAttributes = parseAttributesFromString(attributes);

  // Create a new state file to store the requests from this run
  const uploadState = new PersistedState(
    receiptFilepath,
    RequestUploadReceipts,
    {
      failingUpdates: {},
      pendingConflictUpdates: {},
      skippedUpdates: {},
      pendingSafeUpdates: {},
      successfulUpdates: {},
      pendingUpdates: {},
      lastFetchedAt: new Date().toISOString(),
    },
  );
  const schemaState = new PersistedState(schemaFilePath, FileFormatState, {
    columnToPurposeName: {},
    lastFetchedAt: new Date().toISOString(),
    columnToIdentifier: {},
  });
  const failingRequests = uploadState.getValue('failingUpdates');
  const pendingRequests = uploadState.getValue('pendingUpdates');

  logger.info(
    colors.magenta(
      'Restored cache, there are: \n' +
        `${
          Object.values(failingRequests).length
        } failing requests to be retried\n` +
        `${
          Object.values(pendingRequests).length
        } pending requests to be processed\n` +
        `The following file will be processed: ${file}\n`,
    ),
  );

  // Create GraphQL client to connect to Transcend backend
  const client = buildTranscendGraphQLClient(transcendUrl, auth);

  const [sombra, purposes, preferenceTopics, identifiers] = await Promise.all([
    // Create sombra instance to communicate with
    createSombraGotInstance(transcendUrl, auth, sombraAuth),
    // get all purposes and topics
    forceTriggerWorkflows
      ? Promise.resolve([] as Purpose[])
      : fetchAllPurposes(client),
    forceTriggerWorkflows
      ? Promise.resolve([] as PreferenceTopic[])
      : fetchAllPreferenceTopics(client),
    fetchAllIdentifiers(client),
  ]);

  // Process the file
  await parsePreferenceManagementCsvWithCache(
    {
      file,
      purposeSlugs: purposes.map((x) => x.trackingType),
      preferenceTopics,
      sombra,
      partitionKey: partition,
      skipExistingRecordCheck,
      forceTriggerWorkflows,
      orgIdentifiers: identifiers,
      allowedIdentifierNames,
      identifierColumns,
      columnsToIgnore,
    },
    schemaState,
    uploadState,
  );

  // Construct the pending updates
  const pendingUpdates: Record<string, PreferenceUpdateItem> = {};
  const safeUpdatesInCache = uploadState.getValue('pendingSafeUpdates');
  const conflictUpdatesInCache = uploadState.getValue('pendingConflictUpdates');
  const skippedUpdatesInCache = uploadState.getValue('skippedUpdates');
  const timestampColumn = schemaState.getValue('timestampColumn');
  const columnToPurposeName = schemaState.getValue('columnToPurposeName');
  const columnToIdentifier = schemaState.getValue('columnToIdentifier');

  logger.info(
    colors.magenta(
      `Found ${
        Object.entries(safeUpdatesInCache).length
      } safe updates in ${file}`,
    ),
  );
  logger.info(
    colors.magenta(
      `Found ${
        Object.entries(conflictUpdatesInCache).length
      } conflict updates in ${file}`,
    ),
  );
  logger.info(
    colors.magenta(
      `Found ${
        Object.entries(skippedUpdatesInCache).length
      } skipped updates in ${file}`,
    ),
  );

  // Update either safe updates only or safe + conflict
  Object.entries({
    ...safeUpdatesInCache,
    ...(skipConflictUpdates
      ? {}
      : apply(conflictUpdatesInCache, ({ row }) => row)),
  }).forEach(([userId, update]) => {
    // Determine timestamp
    const timestamp =
      timestampColumn === NONE_PREFERENCE_MAP
        ? new Date()
        : new Date(update[timestampColumn!]);

    // Determine updates
    const updates = getPreferenceUpdatesFromRow({
      row: update,
      columnToPurposeName,
      preferenceTopics,
      purposeSlugs: purposes.map((x) => x.trackingType),
    });
    const identifiers = getPreferenceIdentifiersFromRow({
      row: update,
      columnToIdentifier,
    });
    pendingUpdates[userId] = {
      identifiers,
      partition,
      timestamp: timestamp.toISOString(),
      purposes: Object.entries(updates).map(([purpose, value]) => ({
        ...value,
        purpose,
        workflowSettings: {
          attributes: parsedAttributes,
          isSilent,
          skipWorkflowTrigger: skipWorkflowTriggers,
        },
      })),
    };
  });
  // FIXME restart better
  await uploadState.setValue(pendingUpdates, 'pendingUpdates');
  await uploadState.setValue({}, 'failingUpdates');
  await uploadState.setValue({}, 'successfulUpdates');

  // Exist early if dry run
  if (dryRun) {
    logger.info(
      colors.green(
        `Dry run complete, exiting. ${
          Object.values(pendingUpdates).length
        } pending updates. Check file: ${receiptFilepath}`,
      ),
    );
    return;
  }

  logger.info(
    colors.magenta(
      `Uploading ${
        Object.values(pendingUpdates).length
      } preferences to partition: ${partition}`,
    ),
  );

  // Time duration
  const t0 = new Date().getTime();

  // Build a GraphQL client
  let total = 0;
  const updatesToRun = Object.entries(pendingUpdates);
  const chunkedUpdates = chunk(updatesToRun, skipWorkflowTriggers ? 50 : 10);
  const successfulUpdates: Record<string, PreferenceUpdateItem> = {};
  // progressBar.start(updatesToRun.length, 0);
  await map(
    chunkedUpdates,
    async (currentChunk) => {
      // Make the request
      try {
        await sombra
          .put('v1/preferences', {
            json: {
              records: currentChunk.map(([, update]) => update),
              skipWorkflowTriggers,
              forceTriggerWorkflows,
            },
          })
          .json();
        currentChunk.forEach(([userId, update]) => {
          successfulUpdates[userId] = update;
        });
      } catch (err) {
        try {
          const parsed = JSON.parse(err?.response?.body || '{}');
          if (parsed.error) {
            logger.error(colors.red(`Error: ${parsed.error}`));
          }
        } catch (e) {
          // continue
        }
        logger.error(
          colors.red(
            `Failed to upload ${
              currentChunk.length
            } user preferences to partition ${partition}: ${
              err?.response?.body || err?.message
            }`,
          ),
        );
        const failingUpdates = uploadState.getValue('failingUpdates');
        currentChunk.forEach(([userId, update]) => {
          failingUpdates[userId] = {
            uploadedAt: new Date().toISOString(),
            update,
            error: err?.response?.body || err?.message || 'Unknown error',
          };
        });
        await uploadState.setValue(failingUpdates, 'failingUpdates');
      }

      total += currentChunk.length;
      // progressBar.update(total);
      // log every 1000
      if (total % 1000 === 0) {
        logger.info(
          colors.green(
            `Uploaded ${total}/${updatesToRun.length} user preferences to partition ${partition}`,
          ),
        );
      }
    },
    {
      concurrency: 80,
    },
  );

  // FIXME do this on ctrl+c
  await uploadState.setValue(successfulUpdates, 'successfulUpdates');
  await uploadState.setValue({}, 'pendingUpdates');
  await uploadState.setValue({}, 'pendingSafeUpdates');
  await uploadState.setValue({}, 'pendingConflictUpdates');

  // progressBar.stop();
  const t1 = new Date().getTime();
  const totalTime = t1 - t0;
  logger.info(
    colors.green(
      `Successfully uploaded ${
        updatesToRun.length
      } user preferences to partition ${partition} in "${
        totalTime / 1000
      }" seconds!`,
    ),
  );
}
