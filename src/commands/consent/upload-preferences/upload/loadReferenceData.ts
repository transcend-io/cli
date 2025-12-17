import type { GraphQLClient } from 'graphql-request';
import {
  buildTranscendGraphQLClient,
  fetchAllPurposes,
  fetchAllPreferenceTopics,
  fetchAllIdentifiers,
  type PreferenceTopic,
  type Purpose,
  type Identifier,
} from '../../../../lib/graphql';

export type PreferenceUploadReferenceData = {
  /**
   * List of purposes in the organization
   */
  purposes: Purpose[];
  /**
   * List of preference topics in the organization
   */
  preferenceTopics: PreferenceTopic[];
  /**
   * List of identifiers in the organization
   */
  identifiers: Identifier[];
};

/**
 * Load all required reference data for an upload run.
 *
 * @param client - GraphQL client
 * @returns GraphQL client and reference data arrays
 */
export async function loadReferenceData(client: GraphQLClient): Promise<
  {
    /**
     * GraphQL client to use for making requests
     */
    client: ReturnType<typeof buildTranscendGraphQLClient>;
  } & PreferenceUploadReferenceData
> {
  const [purposes, preferenceTopics, identifiers] = await Promise.all([
    fetchAllPurposes(client),
    fetchAllPreferenceTopics(client),
    fetchAllIdentifiers(client),
  ]);
  return { client, purposes, preferenceTopics, identifiers };
}
