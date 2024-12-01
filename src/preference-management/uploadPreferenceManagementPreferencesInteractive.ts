import {
  buildTranscendGraphQLClient,
  createSombraGotInstance,
  fetchAllPurposes,
} from '../graphql';
import colors from 'colors';
import { map, mapSeries } from 'bluebird';
import chunk from 'lodash/chunk';
import { DEFAULT_TRANSCEND_CONSENT_API } from '../constants';
import { logger } from '../logger';
import cliProgress from 'cli-progress';
import { parseAttributesFromString } from '../requests';
import { PersistedState } from '@transcend-io/persisted-state';
import {
  NONE_PREFERENCE_MAP,
  getUpdatesFromPreferenceRow,
  parsePreferenceManagementCsvWithCache,
} from './parsePreferenceManagementCsvWithCache';
import { PreferenceState } from './codecs';
import { fetchAllPreferenceTopics } from '../graphql/fetchAllPreferenceTopics';
import { PreferenceUpdateItem } from '@transcend-io/privacy-types';
import { apply } from '@transcend-io/type-utils';

/**
 * Upload a set of consent preferences
 *
 * @param options - Options
 */
export async function uploadPreferenceManagementPreferencesInteractive({
  auth,
  sombraAuth,
  receiptFilepath,
  files,
  partition,
  isSilent = true,
  dryRun = false,
  skipWorkflowTriggers = false,
  attributes = [],
  transcendUrl = DEFAULT_TRANSCEND_CONSENT_API,
}: {
  /** The Transcend API key */
  auth: string;
  /** Sombra API key authentication */
  sombraAuth?: string;
  /** Partition key */
  partition: string;
  /** File where to store receipt and continue from where left off */
  receiptFilepath: string;
  /** The files to process */
  files: string[];
  /** API URL for Transcend backend */
  transcendUrl?: string;
  /** Whether to do a dry run */
  dryRun?: boolean;
  /** Whether to upload as isSilent */
  isSilent?: boolean;
  /** Attributes string pre-parse. In format Key:Value */
  attributes?: string[];
  /** Skip workflow triggers */
  skipWorkflowTriggers?: boolean;
}): Promise<void> {
  // Parse out the extra attributes to apply to all requests uploaded
  const parsedAttributes = parseAttributesFromString(attributes);

  // Create a new state file to store the requests from this run
  const preferenceState = new PersistedState(receiptFilepath, PreferenceState, {
    fileMetadata: {},
    failingUpdates: {},
    pendingUpdates: {},
  });
  const failingRequests = preferenceState.getValue('failingUpdates');
  const pendingRequests = preferenceState.getValue('pendingUpdates');
  const fileMetadata = preferenceState.getValue('fileMetadata');

  logger.info(
    colors.magenta(
      'Restored cache, there are: \n' +
        `${
          Object.values(failingRequests).length
        } failing requests to be retried\n` +
        `${
          Object.values(pendingRequests).length
        } pending requests to be processed\n` +
        `The following files are stored in cache and will be used:\n${Object.keys(
          fileMetadata,
        )
          .map((x) => x)
          .join('\n')}\n` +
        `The following files will be read in and refreshed in the cache:\n${files.join(
          '\n',
        )}\n`,
    ),
  );

  // Create GraphQL client to connect to Transcend backend
  const client = buildTranscendGraphQLClient(transcendUrl, auth);

  const [sombra, purposes, preferenceTopics] = await Promise.all([
    // Create sombra instance to communicate with
    createSombraGotInstance(transcendUrl, auth, sombraAuth),
    // get all purposes and topics
    fetchAllPurposes(client),
    fetchAllPreferenceTopics(client),
  ]);

  // Process each file
  await mapSeries(files, async (file) => {
    await parsePreferenceManagementCsvWithCache(
      {
        file,
        purposes,
        preferenceTopics,
        sombra,
        partitionKey: partition,
      },
      preferenceState,
    );
  });

  // Construct the pending updates
  const pendingUpdates: Record<string, PreferenceUpdateItem> = {};
  files.forEach((file) => {
    const fileMetadata = preferenceState.getValue('fileMetadata');
    const metadata = fileMetadata[file];

    logger.info(
      colors.magenta(
        `Found ${
          Object.entries(metadata.pendingSafeUpdates).length
        } safe updates in ${file}`,
      ),
    );
    logger.info(
      colors.magenta(
        `Found ${
          Object.entries(metadata.pendingConflictUpdates).length
        } conflict updates in ${file}`,
      ),
    );
    logger.info(
      colors.magenta(
        `Found ${
          Object.entries(metadata.skippedUpdates).length
        } skipped updates in ${file}`,
      ),
    );
    Object.entries({
      ...metadata.pendingSafeUpdates,
      ...apply(metadata.pendingConflictUpdates, ({ row }) => row),
    }).forEach(([userId, update]) => {
      const currentUpdate = pendingUpdates[userId];
      const timestamp =
        metadata.timestampColum === NONE_PREFERENCE_MAP
          ? new Date()
          : new Date(update[metadata.timestampColum!]);
      const updates = getUpdatesFromPreferenceRow({
        row: update,
        columnToPurposeName: metadata.columnToPurposeName,
      });

      if (currentUpdate) {
        const newPurposes = Object.entries(updates).map(([purpose, value]) => ({
          ...value,
          purpose,
          workflowSettings: {
            attributes: parsedAttributes,
            isSilent,
            skipWorkflowTrigger: skipWorkflowTriggers,
          },
        }));
        (currentUpdate.purposes || []).forEach((purpose) => {
          if (updates[purpose.purpose].enabled !== purpose.enabled) {
            logger.warn(
              colors.yellow(
                `Conflict detected for user: ${userId} and purpose: ${purpose.purpose}`,
              ),
            );
          }
        });
        pendingUpdates[userId] = {
          userId,
          partition,
          // take the most recent timestamp
          timestamp:
            timestamp > new Date(currentUpdate.timestamp)
              ? timestamp.toISOString()
              : currentUpdate.timestamp,
          purposes: [
            ...(currentUpdate.purposes || []),
            ...newPurposes.filter(
              (newPurpose) =>
                !(currentUpdate.purposes || []).find(
                  (currentPurpose) =>
                    currentPurpose.purpose === newPurpose.purpose,
                ),
            ),
          ],
        };
      } else {
        pendingUpdates[userId] = {
          userId,
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
      }
    });
  });
  preferenceState.setValue(pendingUpdates, 'pendingUpdates');
  preferenceState.setValue({}, 'failingUpdates');

  if (dryRun) {
    logger.info(
      colors.green(`Dry run complete, exiting. Check file: ${receiptFilepath}`),
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

  // create a new progress bar instance and use shades_classic theme
  const progressBar = new cliProgress.SingleBar(
    {},
    cliProgress.Presets.shades_classic,
  );

  // Build a GraphQL client
  let total = 0;
  const updatesToRun = Object.entries(pendingUpdates);
  const chunkedUpdates = chunk(updatesToRun, skipWorkflowTriggers ? 100 : 10);
  progressBar.start(updatesToRun.length, 0);
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
            },
          })
          .json();
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
        const failingUpdates = preferenceState.getValue('failingUpdates');
        currentChunk.forEach(([userId, update]) => {
          failingUpdates[userId] = {
            uploadedAt: new Date().toISOString(),
            update,
            error: err?.response?.body || err?.message || 'Unknown error',
          };
        });
        preferenceState.setValue(failingUpdates, 'failingUpdates');
      }

      total += currentChunk.length;
      progressBar.update(total);
    },
    {
      concurrency: 10,
    },
  );

  progressBar.stop();
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
