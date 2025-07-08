import { GraphQLClient } from 'graphql-request';
import { logger } from '../../logger';
import { PolicyInput } from '../../codecs';
import colors from 'colors';
import { UPDATE_POLICIES } from './gqls';
import chunk from 'lodash/chunk';
import { mapSeries } from 'bluebird';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import { fetchPrivacyCenterId } from './fetchPrivacyCenterId';
import { fetchAllPolicies } from './fetchAllPolicies';
import { keyBy } from 'lodash';

const MAX_PAGE_SIZE = 100;

/**
 * Update or create policies
 *
 * @param client - GraphQL client
 * @param policyInputs - List of policy input
 */
export async function updatePolicies(
  client: GraphQLClient,
  policyInputs: [PolicyInput, string | undefined][],
): Promise<void> {
  const privacyCenterId = await fetchPrivacyCenterId(client);

  // Batch update policies
  await mapSeries(chunk(policyInputs, MAX_PAGE_SIZE), async (page) => {
    await makeGraphQLRequest(client, UPDATE_POLICIES, {
      privacyCenterId,
      policies: page.map(([policy, policyId]) => ({
        id: policyId,
        title: policy.title,
        disableEffectiveOn: policy.disableEffectiveOn,
        disabledLocales: policy.disabledLocales,
        ...(policy.effectiveOn || policy.content
          ? {
              version: {
                ...(policy.effectiveOn
                  ? { effectiveOn: policy.effectiveOn }
                  : {}),
                ...(policy.content
                  ? {
                      content: {
                        defaultMessage: policy.content,
                      },
                    }
                  : {}),
              },
            }
          : {}),
      })),
    });
  });
}

/**
 * Sync the set of policies from the YML interface into the product
 *
 * @param client - GraphQL client
 * @param policies - policies to sync
 * @returns True upon success, false upon failure
 */
export async function syncPolicies(
  client: GraphQLClient,
  policies: PolicyInput[],
): Promise<boolean> {
  let encounteredError = false;
  logger.info(colors.magenta(`Syncing "${policies.length}" policies...`));

  // Ensure no duplicates are being uploaded
  const notUnique = policies.filter(
    (policy) => policies.filter((pol) => policy.title === pol.title).length > 1,
  );
  if (notUnique.length > 0) {
    throw new Error(
      `Failed to upload policies as there were non-unique entries found: ${notUnique
        .map(({ title }) => title)
        .join(',')}`,
    );
  }

  // Grab existing policies
  const existingPolicies = await fetchAllPolicies(client);
  const policiesById = keyBy(
    existingPolicies,
    ({ title }) => title.defaultMessage,
  );

  try {
    logger.info(
      colors.magenta(`Upserting "${policies.length}" new policies...`),
    );
    await updatePolicies(
      client,
      policies.map((policy) => [policy, policiesById[policy.title]?.id]),
    );
    logger.info(
      colors.green(`Successfully synced ${policies.length} policies!`),
    );
  } catch (err) {
    encounteredError = true;
    logger.info(colors.red(`Failed to create policies! - ${err.message}`));
  }

  return !encounteredError;
}
