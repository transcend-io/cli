import { ConsentPreferencesBody } from '@transcend-io/airgap.js-types';
import { decodeCodec } from '@transcend-io/type-utils';
import cliProgress from 'cli-progress';
import colors from 'colors';
import * as t from 'io-ts';
import { DEFAULT_TRANSCEND_CONSENT_API } from '../../constants';
import { logger } from '../../logger';
import { map } from '../bluebird-replace';
import { createTranscendConsentGotInstance } from '../graphql';
import { createConsentToken } from './createConsentToken';
import type { ConsentPreferenceUpload } from './types';

export const USP_STRING_REGEX = /^[0-9][Y|N]([Y|N])[Y|N]$/;

export const PurposeMap = t.record(
  t.string,
  t.union([t.boolean, t.literal('Auto')]),
);

/**
 * Upload a set of consent preferences
 *
 * @param options - Options
 */
export async function uploadConsents({
  base64EncryptionKey,
  base64SigningKey,
  preferences,
  partition,
  concurrency = 100,
  transcendUrl = DEFAULT_TRANSCEND_CONSENT_API,
}: {
  /** base64 encryption key */
  base64EncryptionKey: string;
  /** base64 signing key */
  base64SigningKey: string;
  /** Partition key */
  partition: string;
  /** Sombra API key authentication */
  preferences: ConsentPreferenceUpload[];
  /** API URL for Transcend backend */
  transcendUrl?: string;
  /** Concurrency limit for approving */
  concurrency?: number;
}): Promise<void> {
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

  // Ensure purpose maps are valid
  const invalidPurposeMaps = preferences
    .map((pref, ind) => [pref, ind] as [ConsentPreferenceUpload, number])
    .filter(([pref]) => {
      if (!pref.purposes) {
        return false;
      }
      try {
        decodeCodec(PurposeMap, pref.purposes);
        return false;
      } catch {
        return true;
      }
    });
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
  const t0 = Date.now();
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
      } catch (error) {
        try {
          const parsed = JSON.parse(error?.response?.body || '{}');
          if (parsed.error) {
            logger.error(colors.red(`Error: ${parsed.error}`));
          }
        } catch {
          // continue
        }
        throw new Error(
          `Received an error from server: ${
            error?.response?.body || error?.message
          }`,
        );
      }

      total += 1;
      progressBar.update(total);
    },
    { concurrency },
  );

  progressBar.stop();
  const t1 = Date.now();
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
