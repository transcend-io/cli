import { GraphQLClient } from 'graphql-request';
import { logger } from '../../logger';
import { CookieInput } from '../../codecs';
import colors from 'colors';
import { UPDATE_OR_CREATE_COOKIES } from './gqls';
import { chunk } from 'lodash-es';
import { fetchConsentManagerId } from './fetchConsentManagerId';
import { mapSeries } from '../bluebird-replace';
// import { keyBy } from 'lodash-es';
import { makeGraphQLRequest } from './makeGraphQLRequest';

const MAX_PAGE_SIZE = 100;

/**
 * Update or create cookies that already existed
 *
 * @param client - GraphQL client
 * @param cookieInputs - List of cookie input
 */
export async function updateOrCreateCookies(
  client: GraphQLClient,
  cookieInputs: CookieInput[],
): Promise<void> {
  const airgapBundleId = await fetchConsentManagerId(client);

  // TODO: https://transcend.height.app/T-19841 - add with custom purposes
  // const purposes = await fetchAllPurposes(client);
  // const purposeNameToId = keyBy(purposes, 'name');

  await mapSeries(chunk(cookieInputs, MAX_PAGE_SIZE), async (page) => {
    await makeGraphQLRequest(client, UPDATE_OR_CREATE_COOKIES, {
      airgapBundleId,
      cookies: page.map((cookie) => ({
        name: cookie.name,
        trackingPurposes:
          cookie.trackingPurposes && cookie.trackingPurposes.length > 0
            ? cookie.trackingPurposes
            : undefined,
        // TODO: https://transcend.height.app/T-19841 - add with custom purposes
        // purposeIds: cookie.trackingPurposes
        //   ? cookie.trackingPurposes
        //       .filter((purpose) => purpose !== 'Unknown')
        //       .map((purpose) => purposeNameToId[purpose].id)
        // : undefined,
        description: cookie.description,
        service: cookie.service,
        status: cookie.status,
        attributes: cookie.attributes,
        isRegex: cookie.isRegex,
        // TODO: https://transcend.height.app/T-23718
        // owners,
        // teams,
      })),
    });
  });
}

/**
 * Sync the set of cookies from the YML interface into the product
 *
 * @param client - GraphQL client
 * @param cookies - Cookies to sync
 * @returns True upon success, false upon failure
 */
export async function syncCookies(
  client: GraphQLClient,
  cookies: CookieInput[],
): Promise<boolean> {
  let encounteredError = false;
  logger.info(colors.magenta(`Syncing "${cookies.length}" cookies...`));

  // Ensure no duplicates are being uploaded
  const notUnique = cookies.filter(
    (cookie) =>
      cookies.filter(
        (cook) => cookie.name === cook.name && cookie.isRegex === cook.isRegex,
      ).length > 1,
  );
  if (notUnique.length > 0) {
    throw new Error(
      `Failed to upload cookies as there were non-unique entries found: ${notUnique
        .map(({ name }) => name)
        .join(',')}`,
    );
  }

  try {
    logger.info(colors.magenta(`Upserting "${cookies.length}" new cookies...`));
    await updateOrCreateCookies(client, cookies);
    logger.info(colors.green(`Successfully synced ${cookies.length} cookies!`));
  } catch (err) {
    encounteredError = true;
    logger.info(colors.red(`Failed to create cookies! - ${err.message}`));
  }

  return !encounteredError;
}
