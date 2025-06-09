import { GraphQLClient } from 'graphql-request';
import { PREFERENCE_OPTION_VALUES } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';

export interface PreferenceOptionValue {
  /** ID of preference option value */
  id: string;
  /** Slug of preference option value */
  slug: string;
  /** Title of preference option value */
  title: {
    /** ID */
    id: string;
    /** Default message */
    defaultMessage: string;
  };
}

const PAGE_SIZE = 20;

/**
 * Fetch all preference option values in the organization
 *
 * @param client - GraphQL client
 * @returns All preference option values in the organization
 */
export async function fetchAllPreferenceOptionValues(
  client: GraphQLClient,
): Promise<PreferenceOptionValue[]> {
  const preferenceOptionValues: PreferenceOptionValue[] = [];
  let offset = 0;

  // Whether to continue looping
  let shouldContinue = false;
  do {
    const {
      preferenceOptionValues: { nodes },
      // eslint-disable-next-line no-await-in-loop
    } = await makeGraphQLRequest<{
      /** Preference option values */
      preferenceOptionValues: {
        /** List */
        nodes: PreferenceOptionValue[];
      };
    }>(client, PREFERENCE_OPTION_VALUES, {
      first: PAGE_SIZE,
      offset,
    });
    preferenceOptionValues.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return preferenceOptionValues.sort((a, b) => a.slug.localeCompare(b.slug));
}
