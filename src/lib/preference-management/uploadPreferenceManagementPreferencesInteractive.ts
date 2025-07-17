import { PersistedState } from "@transcend-io/persisted-state";
import { PreferenceUpdateItem } from "@transcend-io/privacy-types";
import { apply } from "@transcend-io/type-utils";
import cliProgress from "cli-progress";
import colors from "colors";
import { chunk } from "lodash-es";
import { DEFAULT_TRANSCEND_CONSENT_API } from "../../constants";
import { logger } from "../../logger";
import { map } from "../bluebird-replace";
import {
  buildTranscendGraphQLClient,
  createSombraGotInstance,
  fetchAllPreferenceTopics,
  fetchAllPurposes,
  PreferenceTopic,
  Purpose,
} from "../graphql";
import { parseAttributesFromString } from "../requests";
import { PreferenceState } from "./codecs";
import { getPreferenceUpdatesFromRow } from "./getPreferenceUpdatesFromRow";
import { parsePreferenceManagementCsvWithCache } from "./parsePreferenceManagementCsv";
import { NONE_PREFERENCE_MAP } from "./parsePreferenceTimestampsFromCsv";

/**
 * Upload a set of consent preferences
 *
 * @param options - Options
 */
export async function uploadPreferenceManagementPreferencesInteractive({
  auth,
  sombraAuth,
  receiptFilepath,
  file,
  partition,
  isSilent = true,
  dryRun = false,
  skipWorkflowTriggers = false,
  skipConflictUpdates = false,
  skipExistingRecordCheck = false,
  attributes = [],
  transcendUrl = DEFAULT_TRANSCEND_CONSENT_API,
  forceTriggerWorkflows = false,
}: {
  /** The Transcend API key */
  auth: string;
  /** Sombra API key authentication */
  sombraAuth?: string;
  /** Partition key */
  partition: string;
  /** File where to store receipt and continue from where left off */
  receiptFilepath: string;
  /** The file to process */
  file: string;
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
  /**
   * When true, only update preferences that do not conflict with existing
   * preferences. When false, update all preferences in CSV based on timestamp.
   */
  skipConflictUpdates?: boolean;
  /** Whether to skip the check for existing records. SHOULD ONLY BE USED FOR INITIAL UPLOAD */
  skipExistingRecordCheck?: boolean;
  /** Whether to force trigger workflows */
  forceTriggerWorkflows?: boolean;
}): Promise<void> {
  // Parse out the extra attributes to apply to all requests uploaded
  const parsedAttributes = parseAttributesFromString(attributes);

  // Create a new state file to store the requests from this run
  const preferenceState = new PersistedState(receiptFilepath, PreferenceState, {
    fileMetadata: {},
    failingUpdates: {},
    pendingUpdates: {},
  });
  const failingRequests = preferenceState.getValue("failingUpdates");
  const pendingRequests = preferenceState.getValue("pendingUpdates");
  let fileMetadata = preferenceState.getValue("fileMetadata");

  logger.info(
    colors.magenta(
      "Restored cache, there are: \n" +
        `${
          Object.values(failingRequests).length
        } failing requests to be retried\n` +
        `${
          Object.values(pendingRequests).length
        } pending requests to be processed\n` +
        `The following files are stored in cache and will be used:\n${Object.keys(
          fileMetadata
        )
          .map((x) => x)
          .join("\n")}\n` +
        `The following file will be processed: ${file}\n`
    )
  );

  // Create GraphQL client to connect to Transcend backend
  const client = buildTranscendGraphQLClient(transcendUrl, auth);

  const [sombra, purposes, preferenceTopics] = await Promise.all([
    // Create sombra instance to communicate with
    createSombraGotInstance(transcendUrl, auth, sombraAuth),
    // get all purposes and topics
    forceTriggerWorkflows
      ? Promise.resolve([] as Purpose[])
      : fetchAllPurposes(client),
    forceTriggerWorkflows
      ? Promise.resolve([] as PreferenceTopic[])
      : fetchAllPreferenceTopics(client),
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
    },
    preferenceState
  );

  // Construct the pending updates
  const pendingUpdates: Record<string, PreferenceUpdateItem> = {};
  fileMetadata = preferenceState.getValue("fileMetadata");
  const metadata = fileMetadata[file];

  logger.info(
    colors.magenta(
      `Found ${
        Object.entries(metadata.pendingSafeUpdates).length
      } safe updates in ${file}`
    )
  );
  logger.info(
    colors.magenta(
      `Found ${
        Object.entries(metadata.pendingConflictUpdates).length
      } conflict updates in ${file}`
    )
  );
  logger.info(
    colors.magenta(
      `Found ${
        Object.entries(metadata.skippedUpdates).length
      } skipped updates in ${file}`
    )
  );

  // Update either safe updates only or safe + conflict
  for (const [userId, update] of Object.entries({
    ...metadata.pendingSafeUpdates,
    ...(skipConflictUpdates
      ? {}
      : apply(metadata.pendingConflictUpdates, ({ row }) => row)),
  })) {
    // Determine timestamp
    const timestamp =
      metadata.timestampColum === NONE_PREFERENCE_MAP
        ? new Date()
        : new Date(update[metadata.timestampColum!]);

    // Determine updates
    const updates = getPreferenceUpdatesFromRow({
      row: update,
      columnToPurposeName: metadata.columnToPurposeName,
      preferenceTopics,
      purposeSlugs: purposes.map((x) => x.trackingType),
    });
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
  await preferenceState.setValue(pendingUpdates, "pendingUpdates");
  await preferenceState.setValue({}, "failingUpdates");

  // Exist early if dry run
  if (dryRun) {
    logger.info(
      colors.green(
        `Dry run complete, exiting. ${
          Object.values(pendingUpdates).length
        } pending updates. Check file: ${receiptFilepath}`
      )
    );
    return;
  }

  logger.info(
    colors.magenta(
      `Uploading ${
        Object.values(pendingUpdates).length
      } preferences to partition: ${partition}`
    )
  );

  // Time duration
  const t0 = Date.now();

  // create a new progress bar instance and use shades_classic theme
  const progressBar = new cliProgress.SingleBar(
    {},
    cliProgress.Presets.shades_classic
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
          .put("v1/preferences", {
            json: {
              records: currentChunk.map(([, update]) => update),
              skipWorkflowTriggers,
              forceTriggerWorkflows,
            },
          })
          .json();
      } catch (error) {
        try {
          const parsed = JSON.parse(error?.response?.body || "{}");
          if (parsed.error) {
            logger.error(colors.red(`Error: ${parsed.error}`));
          }
        } catch {
          // continue
        }
        logger.error(
          colors.red(
            `Failed to upload ${
              currentChunk.length
            } user preferences to partition ${partition}: ${
              error?.response?.body || error?.message
            }`
          )
        );
        const failingUpdates = preferenceState.getValue("failingUpdates");
        for (const [userId, update] of currentChunk) {
          failingUpdates[userId] = {
            uploadedAt: new Date().toISOString(),
            update,
            error: error?.response?.body || error?.message || "Unknown error",
          };
        }
        await preferenceState.setValue(failingUpdates, "failingUpdates");
      }

      total += currentChunk.length;
      progressBar.update(total);
    },
    {
      concurrency: 40,
    }
  );

  progressBar.stop();
  const t1 = Date.now();
  const totalTime = t1 - t0;
  logger.info(
    colors.green(
      `Successfully uploaded ${
        updatesToRun.length
      } user preferences to partition ${partition} in "${
        totalTime / 1000
      }" seconds!`
    )
  );
}
