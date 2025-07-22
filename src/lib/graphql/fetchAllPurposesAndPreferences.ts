import { GraphQLClient } from 'graphql-request';
import {
  fetchAllPreferenceTopics,
  PreferenceTopic,
} from './fetchAllPreferenceTopics';
import { fetchAllPurposes, Purpose } from './fetchAllPurposes';

export interface PurposeWithPreferences extends Purpose {
  /** Topics */
  topics: PreferenceTopic[];
}

/**
 * Fetch all purposes and preferences for a request]
 *
 * @param client - GraphQL client
 * @returns List of request enrichers
 */
export async function fetchAllPurposesAndPreferences(
  client: GraphQLClient,
): Promise<PurposeWithPreferences[]> {
  const [purposes, topics] = await Promise.all([
    fetchAllPurposes(client),
    fetchAllPreferenceTopics(client),
  ]);

  return purposes.map((purpose) => {
    const purposeTopics = topics.filter(
      (topic) => topic.purpose.trackingType === purpose.trackingType,
    );
    return {
      ...purpose,
      topics: purposeTopics,
    };
  });
}
