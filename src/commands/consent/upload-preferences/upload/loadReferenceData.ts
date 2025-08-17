/**
 * Module: clients/graphql
 *
 * Fetch and shape the reference data needed to transform CSV rows into
 * PreferenceUpdateItem payloads (purposes, topics, identifiers).
 */
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
 * @param forceTriggerWorkflows - If true, skip loading purposes/topics
 * @returns GraphQL client and reference data arrays
 */
export async function loadReferenceData(
  client: GraphQLClient,
  forceTriggerWorkflows: boolean,
): Promise<
  {
    /**
     * GraphQL client to use for making requests
     */
    client: ReturnType<typeof buildTranscendGraphQLClient>;
  } & PreferenceUploadReferenceData
> {
  const [purposes, preferenceTopics, identifiers] = await Promise.all([
    forceTriggerWorkflows
      ? Promise.resolve([] as Purpose[])
      : fetchAllPurposes(client),
    forceTriggerWorkflows
      ? Promise.resolve([] as PreferenceTopic[])
      : fetchAllPreferenceTopics(client),
    fetchAllIdentifiers(client),
  ]);
  return { client, purposes, preferenceTopics, identifiers };
}
