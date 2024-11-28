import { createTranscendConsentGotInstance } from '../graphql';
import groupBy from 'lodash/groupBy';
import inquirer from 'inquirer';
import colors from 'colors';
import uniq from 'lodash/uniq';
import { DEFAULT_TRANSCEND_CONSENT_API } from '../constants';
import { map, mapSeries } from 'bluebird';
import { logger } from '../logger';
import * as t from 'io-ts';
import cliProgress from 'cli-progress';
import { decodeCodec } from '@transcend-io/type-utils';
import { ConsentPreferencesBody } from '@transcend-io/airgap.js-types';
import { USP_STRING_REGEX } from '../consent-manager';
import { parseAttributesFromString, readCsv } from '../requests';
import { PersistedState } from '@transcend-io/persisted-state';
import {
  PreferenceQueryResponseItem,
  PreferenceStorePurposeUpdate,
} from '@transcend-io/privacy-types';

const FileMetadataState = t.intersection([
  t.type({
    /** Mapping of column name to it's relevant purpose in Transcend */
    columnToPurposeName: t.record(t.string, t.string),
    /** Last time the file was fetched */
    lastFetchedAt: t.string,
    /**
     * Mapping of userId to the rows in the file that need to be uploaded
     * These uploads are overwriting non-existent preferences and are safe
     */
    pendingSafeUpdates: t.record(t.string, t.record(t.string, t.string)),
    /**
     * Mapping of userId to the rows in the file that need to be uploaded
     * these records have conflicts with existing consent preferences
     */
    pendingConflictUpdates: t.record(t.string, t.record(t.string, t.string)),
    /**
     * Mapping of userId to the rows in the file that can be skipped because
     * their preferences are already in the store
     */
    skippedUpdates: t.record(t.string, t.record(t.string, t.string)),
    /**
     * Mapping of userId to the rows in the file that have been successfully uploaded
     */
    successfulUpdates: t.record(
      t.string,
      t.array(t.record(t.string, t.string)),
    ),
  }),
  t.partial({
    /** Determine which column name in file maps to consent record identifier to upload on  */
    identifierColumn: t.string,
  }),
]);

/** Override type */
export type FileMetadataState = t.TypeOf<typeof FileMetadataState>;

/** Persist this data between runs of the script */
const PreferenceState = t.type({
  /**
   * Mapping from core userId to preference store record
   */
  preferenceStoreRecords: t.record(t.string, PreferenceQueryResponseItem),
  /**
   * Store a cache of previous files read in
   */
  fileMetadata: t.record(t.string, FileMetadataState),
  /**
   * The set of successful uploads to Transcend
   * Mapping from userId to the upload metadata
   */
  successfulUpdates: t.record(
    t.string,
    t.array(
      t.type({
        /** Time upload ran at */
        uploadedAt: t.string,
        /** The update body */
        update: PreferenceStorePurposeUpdate,
      }),
    ),
  ),
  /**
   * The set of successful uploads to Transcend
   * Mapping from userId to the upload metadata
   */
  failingUpdates: t.record(
    t.string,
    t.array(
      t.type({
        /** Time upload ran at */
        uploadedAt: t.string,
        /** Attempts to upload that resulted in an error */
        error: t.string,
        /** The update body */
        update: PreferenceStorePurposeUpdate,
      }),
    ),
  ),
  /**
   * The set of pending uploads to Transcend
   * Mapping from userId to the upload metadata
   */
  pendingUpdates: t.record(t.string, PreferenceStorePurposeUpdate),
});

/**
 * Upload a set of consent preferences
 *
 * FIXME pick up from left off with dryRun?
 *
 * @param options - Options
 */
export async function uploadPreferenceManagementPreferencesInteractive({
  auth,
  sombraAuth,
  cacheFilepath,
  receiptFilepath,
  files,
  partition,
  concurrency = 100,
  dryRun = false,
  refreshPreferenceStoreCache = false,
  attributes = [],
  transcendUrl = DEFAULT_TRANSCEND_CONSENT_API,
}: {
  /** The Transcend API key */
  auth: string;
  /** Sombra API key authentication */
  sombraAuth?: string;
  /** Partition key */
  partition: string;
  /** File to cache metadata about mapping of CSV shape to script */
  cacheFilepath: string;
  /** File where to store receipt and continue from where left off */
  receiptFilepath: string;
  /** When true, re-pull preference store cache when comparing consent values. Defaults to looking in cache for current preference store value. */
  refreshPreferenceStoreCache?: boolean;
  /** The files to process */
  files: string[];
  /** API URL for Transcend backend */
  transcendUrl?: string;
  /** Concurrency limit for approving */
  concurrency?: number;
  /** Whether to do a dry run */
  dryRun?: boolean;
  /** Attributes string pre-parse. In format Key:Value */
  attributes?: string[];
}): Promise<void> {
  // Time duration
  // create a new progress bar instance and use shades_classic theme
  const t0 = new Date().getTime();
  const progressBar = new cliProgress.SingleBar(
    {},
    cliProgress.Presets.shades_classic,
  );

  // Parse out the extra attributes to apply to all requests uploaded
  const parsedAttributes = parseAttributesFromString(attributes);

  // Create a new state file to store the requests from this run
  const preferenceState = new PersistedState(receiptFilepath, PreferenceState, {
    successfulUpdates: {},
    failingUpdates: {},
    pendingUpdates: {},
    preferenceStoreRecords: {},
    fileMetadata: {},
  });
  const successfulRequests = preferenceState.getValue('successfulUpdates');
  const failingRequests = preferenceState.getValue('failingUpdates');
  const pendingRequests = preferenceState.getValue('pendingUpdates');
  const fileMetadata = preferenceState.getValue('fileMetadata');

  logger.info(
    colors.magenta(
      'Restored cache, there are: \n' +
        `${successfulRequests.length} successful requests that were previously processed\n` +
        `${failingRequests.length} failing requests to be retried\n` +
        `${pendingRequests.length} pending requests to be processed\n` +
        `The following files are stored in cache and will be used:\n${Object.keys(
          fileMetadata,
        )
          .map((x) => x)
          .join('\n')}\n` +
        `The following files will be read in and refreshed in the cache:\n${files.join(
          '\n',
        )}\n ` +
        `The following attributes will be applied to all requests:\n${JSON.stringify(
          parsedAttributes,
          null,
          2,
        )}`,
    ),
  );

  // Process each file
  await mapSeries(files, async (file) => {
    // Read in the file
    logger.info(colors.magenta(`Reading in file: "${file}"`));
    const preferences = readCsv(file, t.record(t.string, t.string));

    // start building the cache, can use previous cache as well
    const currentState: FileMetadataState = {
      columnToPurposeName: {},
      pendingSafeUpdates: {},
      pendingConflictUpdates: {},
      skippedUpdates: {},
      successfulUpdates: {},
      // Load in the last fetched time
      ...((fileMetadata[file] || {}) as Partial<FileMetadataState>),
      lastFetchedAt: new Date().toISOString(),
    };

    // Determine columns to map
    const columnNames = uniq(preferences.map((x) => Object.keys(x)).flat());

    // Determine the identifier column to work off of
    if (!currentState.identifierColumn) {
      const { identifierName } = await inquirer.prompt<{
        /** Identifier name */
        identifierName: string;
      }>([
        {
          name: 'identifierName',
          message:
            'Choose the column that will be used as the identifier to upload consent preferences by',
          type: 'list',
          default:
            columnNames.find((col) => col.toLowerCase().includes('email')) ||
            columnNames[0],
          choices: columnNames,
        },
      ]);
      currentState.identifierColumn = identifierName;
    }
    logger.info(
      colors.magenta(
        `Using identifier column "${currentState.identifierColumn}" in file: "${file}"`,
      ),
    );

    // Validate that the identifier column is present for all rows and unique
    const identifierColumnsMissing = preferences
      .map((pref, ind) => (pref[currentState.identifierColumn!] ? null : [ind]))
      .filter((x): x is number[] => !!x)
      .flat();
    if (identifierColumnsMissing.length > 0) {
      throw new Error(
        `The identifier column "${
          currentState.identifierColumn
        }" is missing a value for the following rows: ${identifierColumnsMissing.join(
          ', ',
        )} in file "${file}"`,
      );
    }
    logger.info(
      colors.magenta(
        `The identifier column "${currentState.identifierColumn}" is present for all rows in file: "${file}"`,
      ),
    );

    // Validate that all identifiers are unique
    const rowsByUserId = groupBy(preferences, !currentState.identifierColumn);
    const duplicateIdentifiers = Object.entries(rowsByUserId).filter(
      ([, rows]) => rows.length > 1,
    );
    if (duplicateIdentifiers.length > 0) {
      throw new Error(
        `The identifier column "${
          currentState.identifierColumn
        }" has duplicate values for the following rows: ${duplicateIdentifiers
          .map(([userId, rows]) => `${userId} (${rows.length})`)
          .join(', ')} in file "${file}"`,
      );
    }

    // Process each row
    preferences.forEach((pref) => {
      const stringifiedPref = JSON.stringify(pref);
      const previousSuccesses =
        currentState.successfulUpdates[pref[currentState.identifierColumn!]] ||
        [];
      const pendingConflictUpdate =
        currentState.pendingConflictUpdates[
          pref[currentState.identifierColumn!]
        ];
      const pendingSafeUpdate =
        currentState.pendingSafeUpdates[pref[currentState.identifierColumn!]];
      const skippedUpdate =
        currentState.skippedUpdates[pref[currentState.identifierColumn!]];

      // Check if change was already processed
      // no need to do anything here as there is already an audit record for this event
      if (
        previousSuccesses.find((x) => JSON.stringify(x) === stringifiedPref)
      ) {
        return null;
      }

      const x = 2;
    });

    // Read in the file
    logger.info(colors.green(`Successfully pre-processed file: "${file}"`));
  });

  // Create connection to API
  const transcendConsentApi = createTranscendConsentGotInstance(transcendUrl);

  // Ensure usp strings are valid
  const invalidUspStrings = preferences.filter(
    (pref) => pref.usp && !USP_STRING_REGEX.test(pref.usp),
  );
  if (invalidUspStrings.length > 0) {
    throw new Error(
      `Received invalid usp strings: ${JSON.stringify(
        invalidUspStrings,
        null,
        2,
      )}`,
    );
  }

  if (invalidPurposeMaps.length > 0) {
    throw new Error(
      `Received invalid purpose maps: ${JSON.stringify(
        invalidPurposeMaps,
        null,
        2,
      )}`,
    );
  }

  // Ensure usp or preferences are provided
  const invalidInputs = preferences.filter(
    (pref) => !pref.usp && !pref.purposes,
  );
  if (invalidInputs.length > 0) {
    throw new Error(
      `Received invalid inputs, expected either purposes or usp to be defined: ${JSON.stringify(
        invalidInputs,
        null,
        2,
      )}`,
    );
  }

  logger.info(
    colors.magenta(
      `Uploading ${preferences.length} user preferences to partition ${partition}`,
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
  progressBar.start(preferences.length, 0);
  await map(
    preferences,
    async ({
      userId,
      confirmed = 'true',
      updated,
      prompted,
      purposes,
      ...consent
    }) => {
      const token = createConsentToken(
        userId,
        base64EncryptionKey,
        base64SigningKey,
      );

      // parse usp string
      const [, saleStatus] = consent.usp
        ? USP_STRING_REGEX.exec(consent.usp) || []
        : [];

      const input = {
        token,
        partition,
        consent: {
          confirmed: confirmed === 'true',
          purposes: purposes
            ? decodeCodec(PurposeMap, purposes)
            : consent.usp
            ? { SaleOfInfo: saleStatus === 'Y' }
            : {},
          ...(updated ? { updated: updated === 'true' } : {}),
          ...(prompted ? { prompted: prompted === 'true' } : {}),
          ...consent,
        },
      } as ConsentPreferencesBody;

      // Make the request
      try {
        await transcendConsentApi
          .post('sync', {
            json: input,
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
        throw new Error(
          `Received an error from server: ${
            err?.response?.body || err?.message
          }`,
        );
      }

      total += 1;
      progressBar.update(total);
    },
    { concurrency },
  );

  progressBar.stop();
  const t1 = new Date().getTime();
  const totalTime = t1 - t0;

  logger.info(
    colors.green(
      `Successfully uploaded ${
        preferences.length
      } user preferences to partition ${partition} in "${
        totalTime / 1000
      }" seconds!`,
    ),
  );
}
