import { createSombraGotInstance } from '../graphql';
import colors from 'colors';
import { DEFAULT_TRANSCEND_CONSENT_API } from '../constants';
import { mapSeries } from 'bluebird';
import { logger } from '../logger';
// import cliProgress from 'cli-progress';
// import { decodeCodec } from '@transcend-io/type-utils';
// import { ConsentPreferencesBody } from '@transcend-io/airgap.js-types';
// import { USP_STRING_REGEX } from '../consent-manager';
import { parseAttributesFromString } from '../requests';
import { PersistedState } from '@transcend-io/persisted-state';
import { parsePreferenceManagementCsvWithCache } from './parsePreferenceManagementCsvWithCache';
import { PreferenceState } from './codecs';

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
  receiptFilepath,
  files,
  partition,
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
  /** File where to store receipt and continue from where left off */
  receiptFilepath: string;
  /** When true, re-pull preference store cache when comparing consent values. Defaults to looking in cache for current preference store value. */
  refreshPreferenceStoreCache?: boolean;
  /** The files to process */
  files: string[];
  /** API URL for Transcend backend */
  transcendUrl?: string;
  /** Whether to do a dry run */
  dryRun?: boolean;
  /** Attributes string pre-parse. In format Key:Value */
  attributes?: string[];
}): Promise<void> {
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
        `${
          Object.values(successfulRequests).length
        } successful requests that were previously processed\n` +
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
        )}\n ` +
        `The following attributes will be applied to all requests:\n${JSON.stringify(
          parsedAttributes,
          null,
          2,
        )}`,
    ),
  );

  // Create sombra instance to communicate with
  const sombra = await createSombraGotInstance(transcendUrl, auth, sombraAuth);

  // Process each file
  await mapSeries(files, async (file) => {
    await parsePreferenceManagementCsvWithCache(
      {
        file,
        ignoreCache: refreshPreferenceStoreCache,
        sombra,
        partitionKey: partition,
      },
      preferenceState,
    );
  });

  // // Ensure usp strings are valid
  // const invalidUspStrings = preferences.filter(
  //   (pref) => pref.usp && !USP_STRING_REGEX.test(pref.usp),
  // );
  // if (invalidUspStrings.length > 0) {
  //   throw new Error(
  //     `Received invalid usp strings: ${JSON.stringify(
  //       invalidUspStrings,
  //       null,
  //       2,
  //     )}`,
  //   );
  // }

  // if (invalidPurposeMaps.length > 0) {
  //   throw new Error(
  //     `Received invalid purpose maps: ${JSON.stringify(
  //       invalidPurposeMaps,
  //       null,
  //       2,
  //     )}`,
  //   );
  // }

  // // Ensure usp or preferences are provided
  // const invalidInputs = preferences.filter(
  //   (pref) => !pref.usp && !pref.purposes,
  // );
  // if (invalidInputs.length > 0) {
  //   throw new Error(
  //     `Received invalid inputs, expected either purposes or usp to be defined: ${JSON.stringify(
  //       invalidInputs,
  //       null,
  //       2,
  //     )}`,
  //   );
  // }

  // logger.info(
  //   colors.magenta(
  //     `Uploading ${preferences.length} user preferences to partition ${partition}`,
  //   ),
  // );

  // // Time duration
  // const t0 = new Date().getTime();
  // // create a new progress bar instance and use shades_classic theme
  // const progressBar = new cliProgress.SingleBar(
  //   {},
  //   cliProgress.Presets.shades_classic,
  // );

  // // Build a GraphQL client
  // let total = 0;
  // progressBar.start(preferences.length, 0);
  // await map(
  //   preferences,
  //   async ({
  //     userId,
  //     confirmed = 'true',
  //     updated,
  //     prompted,
  //     purposes,
  //     ...consent
  //   }) => {
  //     const token = createConsentToken(
  //       userId,
  //       base64EncryptionKey,
  //       base64SigningKey,
  //     );

  //     // parse usp string
  //     const [, saleStatus] = consent.usp
  //       ? USP_STRING_REGEX.exec(consent.usp) || []
  //       : [];

  //     const input = {
  //       token,
  //       partition,
  //       consent: {
  //         confirmed: confirmed === 'true',
  //         purposes: purposes
  //           ? decodeCodec(PurposeMap, purposes)
  //           : consent.usp
  //           ? { SaleOfInfo: saleStatus === 'Y' }
  //           : {},
  //         ...(updated ? { updated: updated === 'true' } : {}),
  //         ...(prompted ? { prompted: prompted === 'true' } : {}),
  //         ...consent,
  //       },
  //     } as ConsentPreferencesBody;

  //     // Make the request
  //     try {
  //       await transcendConsentApi
  //         .post('sync', {
  //           json: input,
  //         })
  //         .json();
  //     } catch (err) {
  //       try {
  //         const parsed = JSON.parse(err?.response?.body || '{}');
  //         if (parsed.error) {
  //           logger.error(colors.red(`Error: ${parsed.error}`));
  //         }
  //       } catch (e) {
  //         // continue
  //       }
  //       throw new Error(
  //         `Received an error from server: ${
  //           err?.response?.body || err?.message
  //         }`,
  //       );
  //     }

  //     total += 1;
  //     progressBar.update(total);
  //   },
  //   { concurrency },
  // );

  // progressBar.stop();
  // const t1 = new Date().getTime();
  // const totalTime = t1 - t0;

  // logger.info(
  //   colors.green(
  //     `Successfully uploaded ${
  //       preferences.length
  //     } user preferences to partition ${partition} in "${
  //       totalTime / 1000
  //     }" seconds!`,
  //   ),
  // );
}
