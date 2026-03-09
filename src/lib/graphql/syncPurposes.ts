import { ConsentPurpose } from '../../codecs';
import { GraphQLClient } from 'graphql-request';
import {
  CREATE_PURPOSE,
  UPDATE_PURPOSE,
  CREATE_OR_UPDATE_PREFERENCE_TOPIC,
} from './gqls';
import { logger } from '../../logger';
import { keyBy } from 'lodash-es';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import { fetchAllPurposes, type Purpose } from './fetchAllPurposes';
import colors from 'colors';
import { mapSeries } from '../bluebird';

/**
 * Sync consent purposes (and nested preference topics) to Transcend
 *
 * @param client - GraphQL client
 * @param inputs - Purpose inputs from YAML
 * @returns True if run without error, returns false if an error occurred
 */
export async function syncPurposes(
  client: GraphQLClient,
  inputs: ConsentPurpose[],
): Promise<boolean> {
  logger.info(colors.magenta(`Syncing "${inputs.length}" purposes...`));

  let encounteredError = false;

  const existingPurposes = await fetchAllPurposes(client);
  const purposeByTrackingType = keyBy(existingPurposes, 'trackingType');

  await mapSeries(inputs, async (purpose) => {
    try {
      const existing = purposeByTrackingType[purpose.trackingType];

      const purposeFields = {
        name: purpose.name,
        trackingType: purpose.trackingType,
        ...(purpose.description !== undefined
          ? { description: purpose.description }
          : {}),
        ...(purpose['default-consent'] !== undefined
          ? { defaultConsent: purpose['default-consent'] }
          : {}),
        ...(purpose.configurable !== undefined
          ? { configurable: purpose.configurable }
          : {}),
        ...(purpose['show-in-consent-manager'] !== undefined
          ? { showInConsentManager: purpose['show-in-consent-manager'] }
          : {}),
        ...(purpose['show-in-privacy-center'] !== undefined
          ? { showInPrivacyCenter: purpose['show-in-privacy-center'] }
          : {}),
        ...(purpose['is-active'] !== undefined
          ? { isActive: purpose['is-active'] }
          : {}),
        ...(purpose['display-order'] !== undefined
          ? { displayOrder: purpose['display-order'] }
          : {}),
        ...(purpose['opt-out-signals'] !== undefined
          ? { optOutSignals: purpose['opt-out-signals'] }
          : {}),
        ...(purpose['auth-level'] !== undefined
          ? { authLevel: purpose['auth-level'] }
          : {}),
      };

      let purposeId: string;

      if (existing) {
        const { updatePurpose } = await makeGraphQLRequest<{
          /** Update purpose mutation result */
          updatePurpose: {
            /** Updated purpose */
            trackingPurpose: Purpose;
          };
        }>(client, UPDATE_PURPOSE, {
          input: {
            id: existing.id,
            ...purposeFields,
          },
        });
        purposeId = updatePurpose.trackingPurpose.id;
        logger.info(
          colors.green(
            `Successfully updated purpose "${purpose.trackingType}"!`,
          ),
        );
      } else {
        const { createPurpose } = await makeGraphQLRequest<{
          /** Create purpose mutation result */
          createPurpose: {
            /** Created purpose */
            trackingPurpose: Purpose;
          };
        }>(client, CREATE_PURPOSE, {
          input: purposeFields,
        });
        purposeId = createPurpose.trackingPurpose.id;
        logger.info(
          colors.green(
            `Successfully created purpose "${purpose.trackingType}"!`,
          ),
        );
      }

      // Sync nested preference topics
      if (purpose['preference-topics']?.length) {
        for (const topic of purpose['preference-topics']) {
          try {
            await makeGraphQLRequest(
              client,
              CREATE_OR_UPDATE_PREFERENCE_TOPIC,
              {
                input: {
                  title: topic.title,
                  type: topic.type,
                  description: topic.description,
                  purposeId,
                  showInPrivacyCenter: topic['show-in-privacy-center'],
                  defaultConfiguration: topic['default-configuration'],
                  ...(topic.options?.length
                    ? {
                        options: topic.options.map((opt) => ({
                          title: opt.title,
                          slug: opt.slug,
                        })),
                      }
                    : {}),
                },
              },
            );
            logger.info(
              colors.green(
                `Successfully synced preference topic "${topic.title}" for purpose "${purpose.trackingType}"!`,
              ),
            );
          } catch (err) {
            encounteredError = true;
            logger.info(
              colors.red(
                `Failed to sync preference topic "${topic.title}" for purpose "${purpose.trackingType}"! - ${err.message}`,
              ),
            );
          }
        }
      }
    } catch (err) {
      encounteredError = true;
      logger.info(
        colors.red(
          `Failed to sync purpose "${purpose.trackingType}"! - ${err.message}`,
        ),
      );
    }
  });

  logger.info(colors.green(`Synced "${inputs.length}" purposes!`));

  return !encounteredError;
}
